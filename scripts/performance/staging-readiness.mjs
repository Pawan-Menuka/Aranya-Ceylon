// Bounded read-only hosted checks. Explicit targets only; never loads .env,
// creates carts/accounts/orders, sends forms, migrates data or calls gateways.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export function stagingOrigin(value, allowLocal = false) {
  const url = new URL(value || '');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
      (url.protocol !== 'https:' && !(allowLocal && local && url.protocol === 'http:'))) throw new Error('An explicit HTTPS origin without path or credentials is required.');
  return url.origin;
}
export function retainedHeaders(headers) {
  // Presence and known values only: never emit Set-Cookie, ETags, trace IDs,
  // arbitrary Location values or headers supplied by a customer/provider.
  const cache = headers.get('cache-control') || '';
  return {
    gzip: headers.get('content-encoding') === 'gzip',
    etagPresent: headers.has('etag'),
    cachePrivate: /(?:^|,)\s*private(?:,|$)/i.test(cache),
    cacheNoStore: /(?:^|,)\s*no-store(?:,|$)/i.test(cache),
    cacheRevalidate: /(?:^|,)\s*no-cache(?:,|$)/i.test(cache),
    immutable: /(?:^|,)\s*immutable(?:,|$)/i.test(cache),
    corsOriginPresent: headers.has('access-control-allow-origin'),
    corsCredentials: headers.get('access-control-allow-credentials') === 'true',
    variesCookie: (headers.get('vary') || '').toLowerCase().split(',').map(x => x.trim()).includes('cookie'),
    variesAuthorization: (headers.get('vary') || '').toLowerCase().split(',').map(x => x.trim()).includes('authorization'),
    cspPresent: headers.has('content-security-policy'),
  };
}
async function consume(response, maximum = 262144) {
  if (!response.body) return 0;
  const reader = response.body.getReader(); let bytes = 0;
  try {
    while (true) { const { value, done } = await reader.read(); if (done) return bytes;
      bytes += value.byteLength; if (bytes > maximum) throw new Error('body-limit'); }
  } finally { await reader.cancel().catch(() => {}); }
}
export async function checkStaging({ site, api, rounds = 5, apiExposure = 'webhooks-only', transport = fetch }) {
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 10) throw new Error('Rounds must be between 1 and 10.');
  if (!['webhooks-only', 'full-api'].includes(apiExposure)) throw new Error('Unknown API exposure.');
  const records = [], checks = [];
  async function request(label, origin, resource, options = {}) {
    const start = performance.now();
    try {
      const response = await transport(new URL(resource, origin), { redirect: 'manual', credentials: 'omit', referrerPolicy: 'no-referrer', ...options, signal: AbortSignal.timeout(10000) });
      const bytes = await consume(response);
      const record = { label, status: response.status, milliseconds: Math.round((performance.now() - start) * 10) / 10, decodedBytes: bytes, headers: retainedHeaders(response.headers) };
      records.push(record); return response;
    } catch { records.push({ label, status: 0, error: 'request-failed-or-exceeded-bound' }); return null; }
  }
  const expect = (name, condition) => checks.push({ name, passed: !!condition });
  for (let round = 0; round < rounds; round++) {
    for (const route of ['/', '/products', '/search', '/journal', '/recipes', '/account', '/admin', '/checkout']) {
      const response = await request(`site:${route}`, site, route); expect(`site:${route}:round${round + 1}`, response?.status === 200);
    }
    const apiRead = await request('api:cards:no-origin', api, '/products?view=cards&limit=8');
    expect(`api-read-exposure:round${round + 1}`, apiExposure === 'webhooks-only'
      ? [403, 404].includes(apiRead?.status)
      : apiRead?.status === 200 && !apiRead.headers.has('access-control-allow-origin'));
    const bff = await request('bff:cards', site, '/api/products?view=cards&limit=8', { headers: { 'accept-encoding': 'gzip' } });
    expect(`bff-public-cache-policy:round${round + 1}`, bff?.status === 200 && retainedHeaders(bff.headers).cachePrivate && retainedHeaders(bff.headers).cacheRevalidate && retainedHeaders(bff.headers).variesCookie && retainedHeaders(bff.headers).variesAuthorization);
  }
  const healthy = await request('api:health', api, '/health'); expect('database-health', healthy?.status === 200);
  const privateRead = await request('bff:auth-me:anonymous', site, '/api/auth/me');
  expect('anonymous-private-read-denied', privateRead?.status === 401);
  const directPrivate = await request('api:auth-me:direct', api, '/auth/me');
  expect('direct-private-exposure', apiExposure === 'webhooks-only' ? [403, 404].includes(directPrivate?.status) : [401, 403].includes(directPrivate?.status));
  const options = { method: 'OPTIONS', headers: { origin: site, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' } };
  const allowed = await request('cors:allowed-preflight', api, '/products', options);
  expect('allowed-preflight-exposure', apiExposure === 'webhooks-only' ? [403, 404].includes(allowed?.status)
    : allowed?.status === 204 && allowed.headers.get('access-control-allow-origin') === site);
  for (const origin of ['null', 'https://untrusted.example']) {
    const response = await request(`cors:${origin === 'null' ? 'null' : 'untrusted'}`, api, '/products', { ...options, headers: { ...options.headers, origin } });
    expect(`reject-${origin === 'null' ? 'null' : 'untrusted'}-origin`, [403, ...(apiExposure === 'webhooks-only' ? [404] : [])].includes(response?.status));
  }
  const absent = await request('cors:absent-preflight', api, '/products', { method: 'OPTIONS' }); expect('absent-origin-preflight-rejected', [403, ...(apiExposure === 'webhooks-only' ? [404] : [])].includes(absent?.status));
  const sorted = values => values.sort((a, b) => a - b);
  const labels = [...new Set(records.map(record => record.label))];
  const timing = labels.map(label => {
    const values = sorted(records.filter(record => record.label === label && record.status === 200).map(record => record.milliseconds));
    return { label, successfulSamples: values.length, medianMs: values.length ? values[Math.floor(values.length / 2)] : null, p95Ms: values.length ? values[Math.ceil(values.length * 0.95) - 1] : null };
  });
  return { createdAt: new Date().toISOString(), siteOrigin: site, apiOrigin: api, apiExposure, rounds, checks, records, timing,
    limits: ['Sequential bounded HTTP reads/preflight only; not load, browser navigation, field Web Vitals or gateway acceptance', 'Small-sample p95 is descriptive, not representative release p95', 'No response bodies, cookies, ETags, tokens, identifiers or sensitive queries retained'],
    outstanding: ['Verified ingress overwrite/private-port restrictions and independent visitor limits', 'Private API CORS matrix when public API is webhooks-only', 'Signed market isolation', 'Authenticated roles/cart/session/coupons', 'Stripe/PayHere sandbox/webhooks/stock', 'Static media/image transforms/cache invalidation', 'Region/capacity/concurrency/restarts/single scheduler', 'Full browser measurements from Sri Lanka', 'Rollback rehearsal and candidate CI'] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const allowLocal = process.argv.includes('--allow-local');
    const site = stagingOrigin(process.env.STAGING_SITE_ORIGIN, allowLocal);
    const api = stagingOrigin(process.env.STAGING_API_ORIGIN, allowLocal);
    const result = await checkStaging({ site, api, apiExposure: process.env.STAGING_API_EXPOSURE || 'webhooks-only' });
    const directory = path.resolve('artifacts/performance/staging-readiness', new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID());
    fs.mkdirSync(directory, { recursive: true }); fs.writeFileSync(path.join(directory, 'checks.json'), JSON.stringify(result, null, 2));
    console.log(`Hosted read checks: ${result.checks.filter(check => check.passed).length}/${result.checks.length}. Report: ${path.relative(process.cwd(), directory)}`);
    if (result.checks.some(check => !check.passed)) process.exitCode = 1;
  } catch { console.error('Explicit staging origins are missing/invalid or a bounded check failed. Set STAGING_SITE_ORIGIN and STAGING_API_ORIGIN; no defaults or .env loading are used.'); process.exitCode = 1; }
}

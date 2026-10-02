// Actual CORS/metrics middleware around the isolated public fixture; never starts
// the real backend, jobs, database, mail or gateways. Ports are owned sequentially.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { frontendSource } from './source.mjs';
import { startFixtureApi, fixtureSecret, signedMarket } from './fixture-api.mjs';
import { loadPlaywright } from './browser.mjs';

const base = 'http://127.0.0.1:3101', apiOrigin = 'http://127.0.0.1:4101';
const output = 'artifacts/performance/phase-eight-checks';
const fingerprint = frontendSource(path.resolve('aranya-next')).sourceFingerprint;
const guard = JSON.parse(fs.readFileSync('aranya-next/.performance-build/baseline-source.json'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert.equal(guard.sourceFingerprint, fingerprint, 'Current isolated build required.');
assert.equal(guard.fixtureSha256, hash('scripts/performance/fixtures/catalog.json'));
assert.equal(guard.port, 3101); assert.equal(guard.apiPort, 4101);
for (const port of [3101, 4101]) await new Promise((resolve, reject) => {
  const probe = net.createServer(); probe.once('error', reject); probe.listen(port, '127.0.0.1', () => probe.close(resolve));
});
fs.mkdirSync(output, { recursive: true });
const req = createRequire(path.resolve('backend/package.json'));
const { register } = await import(pathToFileURL(req.resolve('tsx/cjs/api')).href);
// One module namespace is essential: the verifier and limiter must share the
// same private WeakMap, just as they do in the real backend module graph.
const tsLoader = register({ namespace: 'phase-eight-checks' });
const backendImport = file => tsLoader.require(path.resolve(file), import.meta.url);
const { browserCors } = await backendImport('backend/src/middleware/browserCors.ts');
const { createRequestMetrics } = await backendImport('backend/src/middleware/requestMetrics.ts');
const { createBffClientIdentity } = await backendImport('backend/src/middleware/bffClientIdentity.ts');
const { loginLimiter } = await backendImport('backend/src/middleware/rateLimit.ts');
const { getClientIp } = await backendImport('backend/src/lib/clientIp.ts');
const identitySecret = 'phase-eight-synthetic-identity-secret-only';
const verifyIdentity = createBffClientIdentity({ secret: identitySecret, required: true });
let strictIdentity = false;
const identities = new Set();
const api = await startFixtureApi();
const handlers = api.server.listeners('request');
assert.equal(handlers.length, 1);
const production = req('express')();
const apiMetrics = [];
production.use(createRequestMetrics({ sampleRate: 1, emit: metric => apiMetrics.push(metric) }));
production.use(browserCors({ nodeEnv: 'production', frontendUrl: base }));
production.use((request, response, next) => strictIdentity ? verifyIdentity(request, response, next) : next());
production.post('/auth/login', (request, response, next) => strictIdentity ? loginLimiter(request, response, next) : next(), (request, response, next) => {
  if (!strictIdentity) return next();
  identities.add(getClientIp(request));
  response.setHeader('set-cookie', ['refreshToken=synthetic-only; Path=/auth; HttpOnly; SameSite=Lax', 'guestCartToken=synthetic-only; Path=/; HttpOnly; SameSite=Lax']);
  response.status(200).json({ fixture: true });
});
production.get('/auth/verify', (request, response, next) => {
  if (!strictIdentity) return next();
  assert.equal(request.query.token, 'synthetic+token/8');
  response.redirect(base + '/account?verified=1');
});
production.use((request, response) => { void handlers[0](request, response); });
production.use((error, _request, response, _next) => response.status(error.status || 500).json({ error: error.expose ? error.message : 'Request rejected' }));
api.server.removeAllListeners('request'); api.server.on('request', production);

const logs = [], errors = [], checks = [];
let server, browser, currentCase, activePage;
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const save = () => fs.writeFileSync(output + '/checks.json', JSON.stringify(checks, null, 2));
async function stop() {
  if (!server) return;
  const owned = server; server = undefined;
  if (owned.exitCode !== null) return;
  const exited = new Promise(resolve => owned.once('exit', resolve));
  owned.kill(); await Promise.race([exited, sleep(5000)]);
  assert(owned.exitCode !== null || owned.signalCode !== null, 'Owned Next process did not stop.');
}
async function start(enabled, signedIdentity = false) {
  await stop();
  server = spawn(process.execPath, ['aranya-next/node_modules/next/dist/bin/next', 'start', 'aranya-next/.performance-build', '--hostname', '127.0.0.1', '--port', '3101'], {
    env: { ...process.env, NODE_ENV: 'production', NEXT_PUBLIC_API_URL: apiOrigin, NEXT_PUBLIC_SITE_URL: base,
      NEXT_PUBLIC_ENABLE_DEMO: 'false', MARKET_COOKIE_SECRET: fixtureSecret, REVALIDATION_SECRET: 'performance-fixture-only',
      PERFORMANCE_TELEMETRY_ENABLED: String(enabled), PERFORMANCE_TELEMETRY_ORIGIN: base,
      PERFORMANCE_TELEMETRY_SAMPLE_RATE: '1', PERFORMANCE_TELEMETRY_REQUESTS_PER_MINUTE: '120',
      PUBLIC_READ_METRICS_ENABLED: String(enabled), PUBLIC_READ_METRICS_SAMPLE_RATE: '1',
      BFF_CLIENT_IP_SECRET: signedIdentity ? identitySecret : '' },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  server.stdout.on('data', bytes => logs.push(bytes.toString())); server.stderr.on('data', bytes => logs.push(bytes.toString()));
  for (let attempt = 0; attempt < 60; attempt++) {
    assert(server.exitCode === null, 'Owned Next exited before readiness.');
    try { if ((await fetch(base + '/about', { signal: AbortSignal.timeout(1000) })).ok) return; } catch { /* Wait for own process. */ }
    await sleep(250);
  }
  throw new Error('Owned Next did not become ready.');
}
async function invalidate() {
  const response = await fetch(base + '/api/revalidate', { method: 'POST', headers: { 'content-type': 'application/json', 'x-revalidate-secret': 'performance-fixture-only' }, body: JSON.stringify({ paths: ['/', '/products', '/journal', '/recipes', '/search'] }) });
  assert(response.ok); await response.arrayBuffer();
}
async function context(market = 'international') {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: 'x-market', value: signedMarket(market), url: base, httpOnly: true }, { name: 'phase8-private-fixture', value: 'must-not-be-sent', url: base }]);
  await context.addInitScript(() => localStorage.setItem('aranya-market-ack', '1'));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === base || url.origin === apiOrigin ? route.continue() : route.abort();
  });
  const page = await context.newPage(); activePage = page;
  page.on('pageerror', error => errors.push({ case: currentCase, message: error.message }));
  return { context, page };
}
async function check(name, run) {
  currentCase = name; const detail = await run(); checks.push({ name, passed: true, ...detail }); save(); console.log('Passed: ' + name);
}
const vitalLogs = () => logs.join('').split(/\r?\n/).flatMap(line => { try { const record = JSON.parse(line); return record.event === 'web_vital' ? [record] : []; } catch { return []; } });
try {
  const { chromium } = await loadPlaywright();
  browser = await chromium.launch({ headless: true, ...(process.env.PERF_BROWSER_CHANNEL ? { channel: process.env.PERF_BROWSER_CHANNEL } : {}) });
  await start(false); await invalidate();
  fs.writeFileSync(output + '/environment.json', JSON.stringify({ sourceFingerprint: fingerprint, fixtureServerSha256: hash('scripts/performance/fixture-api.mjs'), corsSourceSha256: hash('backend/src/middleware/browserCors.ts'), apiMetricsSourceSha256: hash('backend/src/middleware/requestMetrics.ts'), identitySourceSha256: hash('backend/src/middleware/bffClientIdentity.ts'), clientIpSourceSha256: hash('backend/src/lib/clientIp.ts'), limiterSourceSha256: hash('backend/src/middleware/rateLimit.ts'), node: process.version, browser: browser.version(), limits: ['Actual production CORS/metrics/identity middleware around in-memory fixture; no real backend/database/jobs/providers', 'Controlled functionality and synthetic ingress claims; not hosted timing or verified proxy boundaries', 'Opt-in sample1 used only in synthetic check; principal benchmark uses defaults off'] }, null, 2));

  await check('Production SSR and BFF reads work without Origin and writes remain gated', async () => {
    const response = await fetch(base + '/products/ceylon-cinnamon-quills', { signal: AbortSignal.timeout(10000) });
    assert(response.ok); assert((await response.text()).includes('Ceylon Cinnamon Quills'));
    const read = await fetch(base + '/api/products?view=cards&limit=8'); assert(read.ok);
    for (const origin of ['null', 'https://untrusted.example']) {
      const rejected = await fetch(base + '/api/products?view=cards&limit=8', { headers: { origin } }); assert.equal(rejected.status, 403);
    }
    const rejectedWrite = await fetch(base + '/api/market/override', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"market":"local"}' }); assert.equal(rejectedWrite.status, 403);
    const allowedWrite = await fetch(base + '/api/market/override', { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: '{"market":"local"}' });
    assert(allowedWrite.ok); assert(allowedWrite.headers.get('set-cookie')?.includes('x-market='));
    return { ssr: 200, bffRead: 200, untrustedOrigins: 403, absentOriginWrite: 403, allowedOriginWriteCookiePreserved: true };
  });
  await check('Telemetry defaults off and private fixture cookies do not create reports', async () => {
    const { context: c, page: p } = await context(); const requests = [];
    p.on('request', request => { if (new URL(request.url()).pathname === '/api/performance') requests.push(request.method()); });
    try {
      await p.goto(base + '/products/ceylon-cinnamon-quills', { waitUntil: 'load' }); await p.waitForTimeout(500);
      assert.equal(requests.length, 0); assert.equal(vitalLogs().length, 0);
      await p.screenshot({ path: output + '/product-default.png' });
      const disabled = await fetch(base + '/api/performance', { method: 'POST', headers: { origin: base, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' }, body: '{"version":1,"event":"web_vital","name":"LCP","value":100,"route":"/"}' }); assert.equal(disabled.status, 404);
      return { automaticReports: 0, disabledCollector: 404 };
    } finally { await c.close(); }
  });
  await start(true); await invalidate();
  await check('Enabled public documents report bounded metrics without credentials or referrer', async () => {
    const { context: c, page: p } = await context(); const reports = [];
    p.on('request', request => {
      if (new URL(request.url()).pathname !== '/api/performance') return;
      reports.push(request);
    });
    try {
      await p.goto(base + '/products/ceylon-cinnamon-quills', { waitUntil: 'load' });
      await p.waitForTimeout(700); await p.getByRole('button', { name: '100g', exact: true }).first().click();
      await p.waitForTimeout(250);
      // Headless tab teardown can discard request events while keepalive sends
      // still reach the collector. Trigger the library's hidden lifecycle in
      // this synthetic context before teardown, keeping the public document.
      await p.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      for (let attempt = 0; attempt < 100 && reports.length < 5; attempt++) await p.waitForTimeout(30);
      assert(reports.length > 0 && reports.length <= 5, 'Expected one bounded set of Web Vitals reports.');
      const sent = [];
      for (const request of reports) {
        const headers = await request.allHeaders();
        assert(!headers.cookie && !headers.authorization && !headers.referer, 'Telemetry carried private headers.');
        const body = request.postData(); assert(Buffer.byteLength(body) <= 1024);
        const event = JSON.parse(body); assert.deepEqual(Object.keys(event).sort(), ['event', 'name', 'route', 'value', 'version']);
        assert.equal(event.route, '/products/[slug]'); assert(['LCP', 'CLS', 'INP', 'FCP', 'TTFB'].includes(event.name)); sent.push(event);
      }
      for (const name of ['LCP', 'CLS', 'INP', 'FCP', 'TTFB']) assert(sent.some(event => event.name === name), `Missing ${name} after interaction and document exit.`);
      assert(vitalLogs().length > 0, 'Valid reports did not reach first-party structured logs.');
      return { reports: sent, omittedHeaders: ['cookie', 'authorization', 'referer'], maximumReportsPerDocument: 5, hiddenLifecycle: 'controlled document visibility simulation' };
    } finally { await c.close(); }
  });
  await check('Enabled collector rejects cross-origin, private paths and unknown fields', async () => {
    const event = { version: 1, event: 'web_vital', name: 'LCP', value: 100, route: '/products/[slug]' };
    const send = (body, origin = base) => fetch(base + '/api/performance', { method: 'POST', headers: { origin, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await send(event, 'https://untrusted.example')).status, 403);
    assert.equal((await send({ ...event, route: '/account/customer-secret' })).status, 400);
    assert.equal((await send({ ...event, cookie: 'PRIVATE' })).status, 400);
    assert.equal((await send(event)).status, 204);
    assert.equal((await fetch(base + '/api/performance')).status, 405);
    return { foreignOrigin: 403, privatePath: 400, extraField: 400, valid: 204, get: 405 };
  });
  await check('Private admin and account arrivals emit no Web Vitals writes', async () => {
    const { context: c, page: p } = await context(); let reports = 0;
    p.on('request', request => { if (new URL(request.url()).pathname === '/api/performance') reports++; });
    try {
      await p.goto(base + '/account', { waitUntil: 'load' }); await p.waitForTimeout(400);
      await p.goto(base + '/admin', { waitUntil: 'load' }); await p.waitForTimeout(400);
      assert.equal(reports, 0); return { privateReports: 0 };
    } finally { await c.close(); }
  });
  await check('Server read and API metrics contain only fixed categories and timing/status', async () => {
    const readMetrics = logs.join('').split(/\r?\n/).flatMap(line => { try { const record = JSON.parse(line); return record.event === 'server_public_read' ? [record] : []; } catch { return []; } });
    assert(readMetrics.length > 0 && apiMetrics.length > 0);
    assert(apiMetrics.some(metric => metric.status === 403) && apiMetrics.some(metric => metric.route === 'products' && metric.status === 200));
    const encoded = JSON.stringify({ readMetrics, apiMetrics });
    assert(!/ceylon-cinnamon|must-not-be-sent|guestCartToken|authorization|cookie|Bearer|https?:|\?/.test(encoded), 'Metric labels include private/request details.');
    fs.writeFileSync(output + '/sanitized-server-metrics.json', JSON.stringify({ readMetrics, apiMetrics }, null, 2));
    return { logicalReadSamples: readMetrics.length, apiSamples: apiMetrics.length, exactCacheHitInference: false };
  });
  strictIdentity = true;
  await start(false, true); await invalidate();
  await check('Signed BFF identity isolates actual login limits and preserves private cookie paths', async () => {
    // Synthetic ingress claims model the reviewed proxy contract; this does not
    // establish that a future host overwrites headers or closes private ports.
    const login = ip => fetch(base + '/api/auth/login?phase=8', {
      method: 'POST', headers: { origin: base, 'content-type': 'application/json',
        'x-aranya-verified-client-ip': ip,
        'x-aranya-bff-client-ip': '192.0.2.99', 'x-aranya-bff-client-time': '1',
        'x-aranya-bff-client-signature': 'forged', 'x-forwarded-for': '192.0.2.99' }, body: '{}',
    });
    let accepted;
    for (let attempt = 0; attempt < 10; attempt++) { accepted = await login('192.0.2.10'); assert.equal(accepted.status, 200); await accepted.arrayBuffer(); }
    assert.equal((await login('192.0.2.10')).status, 429);
    const second = await login('192.0.2.11'); assert.equal(second.status, 200);
    const cookies = second.headers.getSetCookie();
    assert(cookies.some(cookie => /refreshToken=.*Path=\/api\/auth/.test(cookie)));
    assert(cookies.some(cookie => /guestCartToken=.*Path=\//.test(cookie)));
    assert.deepEqual([...identities].sort(), ['192.0.2.10', '192.0.2.11']);
    const missing = await fetch(base + '/api/auth/login', { method: 'POST', headers: { origin: base }, body: '{}' });
    assert.equal(missing.status, 502);
    for (const headers of [{}, { 'x-aranya-bff-client-ip': '192.0.2.99' }]) {
      const rejected = await fetch(apiOrigin + '/auth/login', { method: 'POST', headers: { origin: base, ...headers }, body: '{}' });
      assert.equal(rejected.status, 403);
    }
    const ssr = await fetch(base + '/products/ceylon-cinnamon-quills');
    assert.equal(ssr.status, 200); assert((await ssr.text()).includes('Ceylon Cinnamon Quills'));
    const verification = await fetch(base + '/api/auth/verify?token=synthetic%2Btoken%2F8', {
      redirect: 'manual', headers: { 'x-aranya-verified-client-ip': '192.0.2.11' },
    });
    assert.equal(verification.status, 302); assert.equal(verification.headers.get('location'), base + '/account?verified=1');
    return { visitorOneAccepted: 10, visitorOneExceeded: 429, visitorTwo: 200,
      forgedBrowserMetadataOverwritten: true, missingIngress: 502, directUnsignedOrPartialAssertion: 403,
      refreshAndGuestCookiePathsPreserved: true, unsignedSharedPublicSsr: 200, verificationTokenQueryAndRedirectPreserved: true,
      hostedIngressAndPortBoundaryVerified: false };
  });
  assert.equal(errors.length, 0, 'Unexpected browser page errors.');
} catch (error) {
  checks.push({ name: currentCase || 'setup', passed: false, error: error.message }); save();
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: output + '/failure.png' }).catch(() => {});
  console.error(error); process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) await invalidate().catch(() => {});
  await stop().catch(error => { console.error(error.message); process.exitCode = 1; });
  api.server.closeAllConnections(); await api.close();
  fs.writeFileSync(output + '/server.log', logs.join(''));
  fs.writeFileSync(output + '/page-errors.json', JSON.stringify(errors, null, 2));
}

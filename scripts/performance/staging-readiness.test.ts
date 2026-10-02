import { expect, it } from 'vitest';
// @ts-expect-error Native diagnostic module has no declaration file.
import { stagingOrigin, retainedHeaders, checkStaging } from './staging-readiness.mjs';

it('requires explicit safe origins and opt-in loopback HTTP', () => {
  expect(stagingOrigin('https://staging.example')).toBe('https://staging.example');
  for (const value of ['', 'http://external.example', 'https://user:secret@staging.example', 'https://staging.example/private', 'https://staging.example?token=secret']) expect(() => stagingOrigin(value)).toThrow();
  expect(() => stagingOrigin('http://127.0.0.1:3101')).toThrow();
  expect(stagingOrigin('http://127.0.0.1:3101', true)).toBe('http://127.0.0.1:3101');
});
it('retains header properties without retaining sensitive values', () => {
  const headers = new Headers({ etag: 'SECRET', 'set-cookie': 'refresh=SECRET', location: 'https://private.example/?token=SECRET', 'cache-control': 'private, no-cache', vary: 'Cookie, Authorization', 'content-encoding': 'gzip' });
  const projected = retainedHeaders(headers);
  expect(projected.cachePrivate && projected.cacheRevalidate && projected.etagPresent && projected.gzip).toBe(true);
  expect(JSON.stringify(projected)).not.toMatch(/SECRET|token|private.example/);
});
it('uses only bounded reads/preflight and strips bodies from artifacts', async () => {
  const calls: { url: URL; options: RequestInit }[] = [];
  const result = await checkStaging({ site: 'https://site.example', api: 'https://api.example', apiExposure: 'full-api', rounds: 1, transport: async (url: URL, options: RequestInit) => {
    calls.push({ url, options });
    const origin = new Headers(options.headers).get('origin');
    const preflight = options.method === 'OPTIONS';
    const status = preflight ? origin === 'https://site.example' ? 204 : 403 : ['/auth/me', '/api/auth/me'].includes(url.pathname) ? 401 : 200;
    const headers = new Headers({ 'cache-control': 'private, no-cache', vary: 'Cookie, Authorization', etag: 'SECRET' });
    if (preflight && status === 204) headers.set('access-control-allow-origin', origin!);
    return new Response(status === 204 ? null : '{"private":"SECRET"}', { status, headers });
  } });
  expect(calls.every(call => call.options.method === undefined || call.options.method === 'OPTIONS')).toBe(true);
  expect(calls.every(call => call.options.credentials === 'omit' && call.options.redirect === 'manual' && call.options.signal)).toBe(true);
  expect(result.checks.every((check: { passed: boolean }) => check.passed)).toBe(true);
  expect(JSON.stringify(result)).not.toMatch(/SECRET/);
  expect(result.outstanding.length).toBeGreaterThan(0);
});
it('defaults to private application API behind a public webhook-only proxy', async () => {
  const result = await checkStaging({ site: 'https://site.example', api: 'https://api.example', rounds: 1, transport: async (url: URL) => {
    const status = url.hostname === 'api.example' && url.pathname !== '/health' ? 404 : url.pathname === '/api/auth/me' ? 401 : 200;
    return new Response('{}', { status, headers: { 'cache-control': 'private, no-cache', vary: 'Cookie, Authorization' } });
  } });
  expect(result.apiExposure).toBe('webhooks-only');
  expect(result.checks.every((check: { passed: boolean }) => check.passed)).toBe(true);
  expect(result.outstanding).toContain('Private API CORS matrix when public API is webhooks-only');
  await expect(checkStaging({ site: 'https://site.example', api: 'https://api.example', apiExposure: 'unknown' })).rejects.toThrow();
});

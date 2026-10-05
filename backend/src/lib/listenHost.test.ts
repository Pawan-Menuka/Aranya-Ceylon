import { expect, it } from 'vitest';
import { apiListenHostFromEnv } from './listenHost.js';

it('preserves the existing default listener when API_HOST is absent or empty', () => {
    expect(apiListenHostFromEnv({})).toBeUndefined();
    expect(apiListenHostFromEnv({ API_HOST: '' })).toBeUndefined();
});

it.each(['127.0.0.1', '::1', '192.0.2.1', '0.0.0.0', '::'])('accepts literal API bind host %s', host => {
    expect(apiListenHostFromEnv({ API_HOST: host })).toBe(host);
});

it.each(['localhost', '127.0.0.1:4000', 'http://127.0.0.1', ' 127.0.0.1 ', ' ', '127.0.0.1,::1', 'fe80::1%eth0'])('fails startup for invalid API bind host %j', host => {
    expect(() => apiListenHostFromEnv({ API_HOST: host })).toThrow();
});

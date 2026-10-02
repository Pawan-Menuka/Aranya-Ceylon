import { isIP } from 'node:net';

/** Optional private bind address; absent/empty keeps Node's existing default. */
export function apiListenHostFromEnv(environment: NodeJS.ProcessEnv): string | undefined {
    const host = environment.API_HOST;
    if (host === undefined || host === '') return undefined;
    if (!isIP(host) || host.includes('%')) throw new Error('API_HOST must be a literal IP address without a port or zone.');
    return host;
}

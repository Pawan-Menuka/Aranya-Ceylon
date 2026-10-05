import { performance } from 'node:perf_hooks';
import type { RequestHandler } from 'express';

type RouteGroup = 'health' | 'products' | 'categories' | 'journal' | 'recipes' | 'gifts' | 'market' | 'auth' | 'cart' | 'checkout' | 'orders' | 'wishlist' | 'admin' | 'contact' | 'wholesale' | 'webhooks' | 'other';
export type ApiPerformanceMetric = {
    type: 'api_performance';
    route: RouteGroup;
    method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'OTHER';
    status: number;
    duration_ms: number;
    outcome: 'complete' | 'closed';
    cache_policy: 'private-revalidate' | 'private-no-store' | 'other';
};

// Fixed categories only. Never emit a pathname, slug, identifier or query.
export function apiRouteGroup(pathname: string): RouteGroup {
    const first = pathname.split('/', 3)[1];
    switch (first) {
        case 'blog': return 'journal';
        case 'health': case 'products': case 'categories': case 'recipes':
        case 'gifts': case 'market': case 'auth': case 'cart': case 'checkout':
        case 'orders': case 'wishlist': case 'admin': case 'contact':
        case 'wholesale': case 'webhooks': return first;
        default: return 'other';
    }
}

export function createRequestMetrics(options: {
    sampleRate: number;
    emit: (metric: ApiPerformanceMetric) => void;
    now?: () => number;
    random?: () => number;
}): RequestHandler {
    if (!Number.isFinite(options.sampleRate) || options.sampleRate < 0 || options.sampleRate > 1) throw new Error('API performance sample rate must be between 0 and 1.');
    const now = options.now ?? (() => performance.now());
    const random = options.random ?? Math.random;
    return (req, res, next) => {
        if (options.sampleRate === 0 || random() >= options.sampleRate) return next();
        const started = now();
        const route = apiRouteGroup(req.path);
        const method = /^(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$/.test(req.method)
            ? req.method as ApiPerformanceMetric['method'] : 'OTHER';
        let emitted = false;
        const finish = (outcome: ApiPerformanceMetric['outcome']) => {
            if (emitted) return;
            emitted = true;
            res.removeListener('finish', onFinish);
            res.removeListener('close', onClose);
            const elapsed = now() - started;
            if (!Number.isFinite(elapsed) || elapsed < 0) return;
            const policy = res.getHeader('cache-control');
            const cachePolicy = policy === 'private, no-cache' ? 'private-revalidate'
                : policy === 'private, no-store' ? 'private-no-store' : 'other';
            // Metrics must never alter an already-completed response or throw
            // through an Express event callback when a log sink is unavailable.
            try {
                options.emit({ type: 'api_performance', route, method, status: res.statusCode,
                    duration_ms: Math.round(Math.min(elapsed, 3_600_000) * 10) / 10,
                    outcome, cache_policy: cachePolicy });
            } catch { /* Observability is best effort. */ }
        };
        const onFinish = () => finish('complete');
        const onClose = () => finish('closed');
        res.once('finish', onFinish);
        res.once('close', onClose);
        next();
    };
}

// Default off: no request listener/timer is installed. Enable on staging after
// selecting a log sink and retention; sample independently per API process.
export function requestMetricsFromEnv(environment: NodeJS.ProcessEnv): RequestHandler | undefined {
    const enabled = (environment.API_PERFORMANCE_METRICS_ENABLED ?? 'false').toLowerCase();
    if (enabled !== 'true' && enabled !== 'false') throw new Error('API_PERFORMANCE_METRICS_ENABLED must be true or false.');
    const rate = Number(environment.API_PERFORMANCE_SAMPLE_RATE ?? '0.1');
    if (!Number.isFinite(rate) || rate < 0 || rate > 1 || environment.API_PERFORMANCE_SAMPLE_RATE === '') throw new Error('API_PERFORMANCE_SAMPLE_RATE must be between 0 and 1.');
    if (enabled === 'false' || rate === 0) return undefined;
    return createRequestMetrics({ sampleRate: rate, emit: metric => console.info(JSON.stringify(metric)) });
}

import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { apiRouteGroup, createRequestMetrics, requestMetricsFromEnv } from './requestMetrics.js';

function request(path = '/orders/customer-secret?email=person@example.invalid') {
    return { path, method: 'POST', headers: { authorization: 'Bearer SECRET', cookie: 'session=SECRET' }, body: { card: 'PRIVATE' } } as unknown as Request;
}
function response(policy = 'private, no-store') {
    return Object.assign(new EventEmitter(), { statusCode: 201, getHeader: () => policy }) as unknown as Response;
}

describe('opt-in API performance metrics', () => {
    it('does not install any middleware by default or at zero sampling', () => {
        expect(requestMetricsFromEnv({})).toBeUndefined();
        expect(requestMetricsFromEnv({ API_PERFORMANCE_METRICS_ENABLED: 'true', API_PERFORMANCE_SAMPLE_RATE: '0' })).toBeUndefined();
    });
    it('fails startup for malformed flags/rates', () => {
        expect(() => requestMetricsFromEnv({ API_PERFORMANCE_METRICS_ENABLED: 'maybe' })).toThrow();
        for (const rate of ['', '-1', '1.1', 'NaN', 'Infinity']) expect(() => requestMetricsFromEnv({ API_PERFORMANCE_SAMPLE_RATE: rate })).toThrow();
        expect(requestMetricsFromEnv({ API_PERFORMANCE_METRICS_ENABLED: 'TRUE' })).toBeTypeOf('function');
    });
    it('samples before installing timers/listeners', () => {
        const emit = vi.fn(), now = vi.fn(), next = vi.fn(), res = response();
        createRequestMetrics({ sampleRate: 0.1, random: () => 0.5, emit, now })(request(), res, next);
        expect(next).toHaveBeenCalledOnce(); expect(now).not.toHaveBeenCalled();
        expect(res.listenerCount('finish')).toBe(0); expect(emit).not.toHaveBeenCalled();
    });
    it('emits once after completion with only fixed labels and numbers', () => {
        const emit = vi.fn(), next = vi.fn(), res = response(); let clock = 10;
        createRequestMetrics({ sampleRate: 1, emit, now: () => clock })(request(), res, next);
        clock = 122.34; res.emit('finish'); res.emit('close');
        expect(emit).toHaveBeenCalledExactlyOnceWith({ type: 'api_performance', route: 'orders', method: 'POST', status: 201, duration_ms: 112.3, outcome: 'complete', cache_policy: 'private-no-store' });
        expect(JSON.stringify(emit.mock.calls)).not.toMatch(/SECRET|customer-secret|person@|PRIVATE|email/);
        expect(res.listenerCount('close')).toBe(0); expect(next).toHaveBeenCalledOnce();
    });
    it('counts conditional cache responses and premature closure without duplication', () => {
        const emit = vi.fn(), res = response('private, no-cache'); res.statusCode = 304;
        createRequestMetrics({ sampleRate: 1, emit, now: () => 0 })(request('/products/secret-slug'), res, vi.fn());
        res.emit('close'); res.emit('finish');
        expect(emit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ route: 'products', status: 304, cache_policy: 'private-revalidate', outcome: 'closed' }));
    });
    it('drops malformed timing and tolerates a failing metric sink', () => {
        const emit = vi.fn(() => { throw new Error('sink unavailable'); }), res = response(); let clock = 0;
        createRequestMetrics({ sampleRate: 1, emit, now: () => clock })(request(), res, vi.fn());
        clock = -1; expect(() => res.emit('finish')).not.toThrow(); expect(emit).not.toHaveBeenCalled();
        const second = response(); createRequestMetrics({ sampleRate: 1, emit, now: () => 10 })(request(), second, vi.fn());
        expect(() => second.emit('finish')).not.toThrow(); expect(emit).toHaveBeenCalledOnce();
    });
    it('maps arbitrary paths to a finite route vocabulary', () => {
        expect(apiRouteGroup('/blog/private-slug')).toBe('journal');
        expect(apiRouteGroup('/webhooks/stripe?signature=secret')).toBe('webhooks');
        expect(apiRouteGroup('/someone@example.invalid')).toBe('other');
    });
});

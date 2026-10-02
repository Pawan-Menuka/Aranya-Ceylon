import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
const service = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock('../services/search.service.js', () => ({ searchPublic: service.search }));
import { search } from './search.controller.js';
beforeEach(() => vi.resetAllMocks());
describe('public compact search API contract', () => {
    it('validates the query, forwards the canonical market, and preserves independently paged resources', async () => {
        const payload = { q: 'warm cinn', sort: 'relevance', market: 'LOCAL',
            products: { items: [{ id: 'p' }], total: 625, nextCursor: 'product', hasNextPage: true },
            journal: { items: [{ id: 'b', seoDesc: 'Warm' }], total: 610, nextCursor: 'journal', hasNextPage: true } };
        service.search.mockResolvedValueOnce(payload);
        const json = vi.fn();
        await search({ query: { q: ' warm cinn ', limit: '20' }, market: 'LOCAL' } as unknown as Request, { json } as unknown as Response);
        expect(service.search).toHaveBeenCalledWith({ q: 'warm cinn', sort: 'relevance', resource: 'all', limit: 20 }, 'LOCAL');
        expect(json).toHaveBeenCalledWith(payload);
    });
    it('rejects invalid limits or query arrays before invoking the service', async () => {
        for (const query of [{ limit: '101' }, { q: ['one', 'two'] }, { sort: 'unknown' }, { productCursor: '' }]) {
            await expect(search({ query, market: 'LOCAL' } as unknown as Request, {} as Response)).rejects.toThrow();
        }
        expect(service.search).not.toHaveBeenCalled();
    });
});

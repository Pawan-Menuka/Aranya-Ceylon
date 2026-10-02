import { beforeEach, describe, expect, it, vi } from 'vitest';
import { publicSearchSchema } from '@aranya/shared';
import { decodePageCursor } from './page-query.js';
import { searchIdentity } from './search-query.js';
const db = vi.hoisted(() => ({ raw: vi.fn(), cards: vi.fn(), blogs: vi.fn() }));
vi.mock('../lib/prisma.js', () => ({ prisma: { $queryRaw: db.raw, blog: { findMany: db.blogs } } }));
vi.mock('./catalog.service.js', () => ({ getProductCards: db.cards }));
import { searchPublic } from './search.service.js';
beforeEach(() => { vi.resetAllMocks(); db.cards.mockResolvedValue([]); db.blogs.mockResolvedValue([]); });
describe('compact complete search page hydration', () => {
    it('reports global >500 totals while hydrating only visible IDs, excluding sentinel and journal bodies', async () => {
        const f = publicSearchSchema.parse({ q: 'warm cinn', limit: 2 });
        db.raw.mockResolvedValueOnce([{ total: 625 }]).mockResolvedValueOnce([{ total: 610 }])
            .mockResolvedValueOnce([{ id: 'p2', keys: ['1', '0.1', '4', '0'] }, { id: 'p1', keys: ['1', '0.1', '4', '0'] }, { id: 'sentinel', keys: ['1', '0.1', '4', '0'] }])
            .mockResolvedValueOnce([{ id: 'b2', keys: ['3', '10'] }, { id: 'b1', keys: ['3', '10'] }, { id: 'hidden', keys: ['3', '10'] }]);
        db.cards.mockResolvedValueOnce([{ id: 'p2' }, { id: 'p1' }]);
        db.blogs.mockResolvedValueOnce([{ id: 'b1', title: 'First' }, { id: 'b2', title: 'Second' }]);
        const result = await searchPublic(f, 'LOCAL');
        expect(result.products).toMatchObject({ total: 625, hasNextPage: true });
        expect(result.journal).toMatchObject({ total: 610, hasNextPage: true });
        expect(result.journal.items.map(row => row.id)).toEqual(['b2', 'b1']);
        expect(db.cards).toHaveBeenCalledWith(['p2', 'p1'], 'LOCAL');
        expect(db.blogs.mock.calls[0]![0]).toMatchObject({ where: { status: 'PUBLISHED', id: { in: ['b2', 'b1'] } } });
        expect(db.blogs.mock.calls[0]![0].select.content).toBeUndefined();
        expect(decodePageCursor(result.products.nextCursor!, searchIdentity(f, 'LOCAL', 'products'), 4)?.id).toBe('p1');
    });
    it('continuing one resource preserves both global totals and avoids hydration of the other resource', async () => {
        db.raw.mockResolvedValueOnce([{ total: 625 }]).mockResolvedValueOnce([{ total: 610 }]).mockResolvedValueOnce([]);
        const result = await searchPublic(publicSearchSchema.parse({ q: 'warm', resource: 'journal' }), 'INTERNATIONAL');
        expect(db.raw).toHaveBeenCalledTimes(3);
        expect(db.blogs).not.toHaveBeenCalled();
        expect(result.products.total).toBe(625);
        expect(result.journal).toMatchObject({ total: 610, nextCursor: null, hasNextPage: false });
    });
});

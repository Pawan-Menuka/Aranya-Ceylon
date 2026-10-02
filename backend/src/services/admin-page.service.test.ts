import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminContentPageSchema, adminProductPageSchema, adminAuditPageSchema } from '@aranya/shared';
const db = vi.hoisted(() => ({ raw: vi.fn(), products: vi.fn(), blogs: vi.fn(), recipes: vi.fn(), gifts: vi.fn(), audit: vi.fn() }));
vi.mock('../lib/prisma.js', () => ({ prisma: { $queryRaw: db.raw, blog: { findMany: db.blogs }, recipe: { findMany: db.recipes }, giftSet: { findMany: db.gifts }, auditLog: { findMany: db.audit } } }));
vi.mock('./product.service.js', () => ({ getAdminProductsByIds: db.products }));
import { listAdminPage } from './admin-page.service.js';
beforeEach(() => vi.resetAllMocks());
describe('admin pages preserve legacy row data and global metadata', () => {
    it('hydrates just a bounded page and reports category/low counts beyond the former500 cap', async () => {
        db.raw.mockResolvedValueOnce([{ id: 'p625', keys: ['1'] }, { id: 'p624', keys: ['1'] }, { id: 'sentinel', keys: ['1'] }])
            .mockResolvedValueOnce([{ total: 625 }]).mockResolvedValueOnce([{ key: 'all', count: 625 }, { key: 'Whole Spices', count: 620 }, { key: 'Rare', count: 5 }, { key: 'low', count: 25 }]);
        db.products.mockResolvedValueOnce([{ id: 'p624', description: 'editor', variants: [] }, { id: 'p625', description: 'editor', variants: [] }]);
        const result = await listAdminPage('products', adminProductPageSchema.parse({ view: 'page', limit: 2 }));
        expect(result).toMatchObject({ total: 625, hasNextPage: true, counts: { all: 625, Rare: 5, low: 25 } });
        expect((result.products as { id: string }[]).map(row => row.id)).toEqual(['p625', 'p624']);
        expect(db.products).toHaveBeenCalledWith(['p625', 'p624']);
    });
    it('status totals are global and compact lists omit content bodies', async () => {
        db.raw.mockResolvedValueOnce([{ id: 'b', keys: ['1'] }]).mockResolvedValueOnce([{ total: 600 }])
            .mockResolvedValueOnce([{ key: 'DRAFT', count: 600 }, { key: 'PUBLISHED', count: 25 }]);
        db.blogs.mockResolvedValueOnce([{ id: 'b' }]);
        const result = await listAdminPage('blogs', adminContentPageSchema.parse({ view: 'page', status: 'DRAFT' }));
        expect(result).toMatchObject({ total: 600, counts: { all: 625, DRAFT: 600, PUBLISHED: 25, SCHEDULED: 0 }, nextCursor: null });
        expect(db.blogs.mock.calls[0]![0].select.content).toBeUndefined();
    });
    it('audit global warning/job counts and actor projection remain compatible', async () => {
        db.raw.mockResolvedValueOnce([{ id: 'a', keys: ['1'] }]).mockResolvedValueOnce([{ total: 10 }])
            .mockResolvedValueOnce([{ all: 625, admin: 600, job: 25, warn: 10 }]);
        db.audit.mockResolvedValueOnce([{ id: 'a', actor: { name: 'Admin', role: 'ADMIN' } }]);
        const result = await listAdminPage('audit', adminAuditPageSchema.parse({ view: 'page', filter: 'warn' }));
        expect(result).toMatchObject({ total: 10, counts: { all: 625, admin: 600, job: 25, warn: 10 } });
        expect(db.audit.mock.calls[0]![0].include.actor.select).toEqual({ name: true, email: true, role: true });
    });
});

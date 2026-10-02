import { describe, expect, it } from 'vitest';
import { adminAuditPageSchema, adminContentPageSchema, adminProductPageSchema, publicSearchSchema } from '@aranya/shared';
import { buildAdminQueries } from './admin-page-query.js';
import { buildSearchQueries, searchIdentity } from './search-query.js';
import { decodePageCursor, encodePageCursor, literalTokens, pageIdentity } from './page-query.js';

describe('bounded admin and public search contracts', () => {
    it('defaults to 20 and validates limits, literal booleans, enums and query size', () => {
        expect(adminProductPageSchema.parse({ view: 'page', lowStock: 'false' })).toMatchObject({ limit: 20, q: '', lowStock: false });
        expect(adminAuditPageSchema.parse({ view: 'page' }).filter).toBe('all');
        expect(publicSearchSchema.parse({ q: '  pepper  ' })).toMatchObject({ q: 'pepper', limit: 20, sort: 'relevance', resource: 'all' });
        for (const limit of ['0', '101', '1.5', 'NaN']) expect(() => publicSearchSchema.parse({ limit })).toThrow();
        expect(() => adminProductPageSchema.parse({ view: 'page', lowStock: 'anything' })).toThrow();
        expect(() => adminContentPageSchema.parse({ view: 'page', status: 'ACTIVE' })).toThrow();
        expect(() => publicSearchSchema.parse({ q: 'a'.repeat(201) })).toThrow();
    });
    it('parameterizes malicious literal tokens without LIKE wildcard interpretation', () => {
        const q = "pep% _ '); DROP TABLE Product;--";
        const query = buildSearchQueries(publicSearchSchema.parse({ q }), 'LOCAL', 'products').page;
        expect(query.text).not.toContain('DROP TABLE');
        expect(query.text).toContain('strpos(lower(');
        expect(query.values).toContain('pep%');
        expect(query.values).toContain('pep%');
        expect(query.text).toContain('to_tsquery');
        expect(query.text).toContain('OR COALESCE');
        expect(query.values.at(-1)).toBe(21);
    });
    it('binds every admin filter and scope, before bounded hydration', () => {
        const f = adminProductPageSchema.parse({ view: 'page', category: 'Rare', q: 'SKU-625', lowStock: 'true', status: 'ARCHIVED' });
        const queries = buildAdminQueries('products', f, 10);
        expect(queries.page.values).toEqual(expect.arrayContaining(['Rare', 'SKU-625', true, 'ARCHIVED', 10, 21]));
        expect(queries.total.values).toContain('Rare');
        expect(queries.counts.values).not.toContain('Rare');
        expect(queries.counts.values).toContain('SKU-625');
        const cursor = encodePageCursor({ id: 'p625', keys: ['1234'] }, queries.scope);
        expect(() => buildAdminQueries('products', { ...f, cursor, category: 'Other' }, 10)).toThrow(/cursor/);
        expect(() => buildAdminQueries('products', { ...f, cursor }, 11)).toThrow(/cursor/);
        expect(() => buildAdminQueries('products', { ...f, cursor, limit: 100 }, 10)).not.toThrow();
    });
    it('keeps status tab counts global and gift featured/date tie order', () => {
        const f = adminContentPageSchema.parse({ view: 'page', status: 'DRAFT', q: 'rare' });
        const queries = buildAdminQueries('gifts', f);
        expect(queries.counts.values).toEqual(['rare']);
        expect(queries.total.values).toContain('DRAFT');
        expect(queries.page.text).toMatch(/ORDER BY k0 DESC,\s*k1 ASC,\s*id ASC/);
    });
    it('preserves audit warning, actor/job and displayed action/target search', () => {
        const queries = buildAdminQueries('audit', adminAuditPageSchema.parse({ view: 'page', filter: 'warn', actorId: 'admin', event: 'ORDER_REFUND', targetType: 'Order', q: 'AC-ABC123' }));
        expect(queries.total.values).toEqual(expect.arrayContaining(['ORDER_REFUND', 'PRODUCT_ARCHIVE', 'BLOG_DELETE', 'GIFT_DELETE', 'RECIPE_DELETE', 'admin', 'Order', 'AC-ABC123']));
        expect(queries.counts.text).toContain('a.id IS NULL');
        expect(queries.counts.text).toContain("'order.status'");
        expect(queries.counts.text).toContain("'Order AC-'");
        expect(queries.counts.text).toContain('p.diff::text');
    });
    it('seeks numeric keys with stable id ties for every product search sort', () => {
        for (const sort of ['relevance', 'price-asc', 'price-desc', 'rating'] as const) {
            const f = publicSearchSchema.parse({ q: 'warm cinn', sort });
            const keys = sort === 'relevance' ? ['1', '0.1', '4', '12'] : ['10.25', '1', '0.1', '4', '12'];
            const cursor = encodePageCursor({ id: 'tie', keys }, searchIdentity(f, 'INTERNATIONAL', 'products'));
            const queries = buildSearchQueries({ ...f, productCursor: cursor }, 'INTERNATIONAL', 'products');
            expect(queries.page.text).toContain('id >');
            expect(queries.page.text).toContain('::numeric');
            if (sort.startsWith('price')) expect(queries.page.values).toContain('USD');
            expect(() => buildSearchQueries({ ...f, productCursor: cursor }, 'LOCAL', 'products')).toThrow(/cursor/);
            expect(() => buildSearchQueries({ ...f, productCursor: cursor, q: 'other' }, 'INTERNATIONAL', 'products')).toThrow(/cursor/);
            expect(() => buildSearchQueries({ ...f, journalCursor: cursor }, 'INTERNATIONAL', 'journal')).toThrow(/cursor/);
            expect(() => buildSearchQueries({ ...f, productCursor: cursor, resource: 'products', limit: 100 }, 'INTERNATIONAL', 'products')).not.toThrow();
        }
    });
    it('rejects malformed cursor structures and empty numeric keys as safe 400 errors', () => {
        const scope = pageIdentity({ q: 'x' });
        for (const value of ['garbage', '!', encodePageCursor({ id: 'x', keys: ['NaN'] }, scope), encodePageCursor({ id: '', keys: ['1'] }, scope), encodePageCursor({ id: 'x', keys: ['1', '2'] }, scope)]) {
            expect(() => decodePageCursor(value, scope, 1)).toThrow(/cursor/);
            try { decodePageCursor(value, scope, 1); } catch (error) { expect(error).toMatchObject({ status: 400, expose: true }); }
        }
        expect(literalTokens(' Warm   warm CINN ')).toEqual(['warm', 'cinn']);
    });
    it('empty queries cannot expose the whole product or journal catalogue', () => {
        const f = publicSearchSchema.parse({});
        expect(buildSearchQueries(f, 'LOCAL', 'products').total.text).toContain('AND false');
        expect(buildSearchQueries(f, 'LOCAL', 'journal').total.text).toContain('AND false');
    });
});

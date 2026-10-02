import { Prisma, type Market } from '@prisma/client';
import type { PublicSearchInput } from '@aranya/shared';
import { catalogFormSql, catalogOriginSql, catalogSortKey } from './catalog-query.js';
import { buildSeekPage, decodePageCursor, literalMatch, literalTokens, pageIdentity, type OrderKey } from './page-query.js';

export type SearchResource = 'products' | 'journal';
export function searchIdentity(filters: PublicSearchInput, market: Market, resource: SearchResource): string {
    return pageIdentity({ resource, q: filters.q, sort: filters.sort, market });
}
export function buildSearchQueries(filters: PublicSearchInput, market: Market, resource: SearchResource) {
    const tokens = literalTokens(filters.q);
    // Build tsquery syntax from word lexemes only, then bind the complete string.
    // Prefixes retain English stemming while matching unfinished description terms.
    const words = [...new Set(filters.q.toLocaleLowerCase('en').match(/[\p{L}\p{N}]+/gu) ?? [])];
    const prefixQuery = words.map(word => `'${word}':*`).join(' & ');
    const textQuery = prefixQuery ? Prisma.sql`to_tsquery('english', ${prefixQuery})` : Prisma.sql`plainto_tsquery('english', ${filters.q})`;
    let from: Prisma.Sql;
    let where: Prisma.Sql;
    let order: OrderKey[];
    if (resource === 'products') {
        from = Prisma.sql`"Product" p JOIN "Category" c ON c.id = p."categoryId"`;
        const metadata = Prisma.sql`concat_ws(' ', p.name, p.latin, ${catalogOriginSql}, c.name, ${catalogFormSql}, array_to_string(p.flavour, ' '))`;
        const fts = Prisma.sql`COALESCE(p."searchVector" @@ ${textQuery}, false)`;
        where = Prisma.sql`p.status = 'ACTIVE' AND p.market IN (${market}::"Market", 'BOTH'::"Market")
            AND ${tokens.length ? Prisma.sql`(${literalMatch(metadata, filters.q)} OR ${fts})` : Prisma.sql`false`}`;
        const metadataScore = tokens.length ? Prisma.sql`(${Prisma.join(tokens.map(token => Prisma.sql`CASE WHEN strpos(lower(p.name), ${token}) > 0 THEN 3
            WHEN strpos(lower(${metadata}), ${token}) > 0 THEN 1 ELSE 0 END`), ' + ')})` : Prisma.sql`0`;
        order = [{ expression: Prisma.sql`${fts}::int` },
            { expression: Prisma.sql`COALESCE(ts_rank(p."searchVector", ${textQuery}), 0)` },
            { expression: metadataScore },
            { expression: Prisma.sql`(SELECT COUNT(*) FROM "OrderItem" oi WHERE oi."productId" = p.id)` }];
        if (filters.sort !== 'relevance') order = [{ expression: catalogSortKey({
            view: 'cards', limit: 20, sort: filters.sort, categoryName: [], form: [], origin: [], flavour: [],
        }, market), ascending: filters.sort === 'price-asc' }, ...order];
    } else {
        from = Prisma.sql`"Blog" p`;
        // The public adapter displays this fixed author; no private user data is searched or returned.
        const metadata = Prisma.sql`concat_ws(' ', p.title, p."seoDesc", array_to_string(p.tags, ' '), 'Aranya Ceylon')`;
        where = Prisma.sql`p.status = 'PUBLISHED' AND ${literalMatch(metadata, filters.q)}`;
        const score = tokens.length ? Prisma.sql`(${Prisma.join(tokens.map(token => Prisma.sql`CASE WHEN strpos(lower(p.title), ${token}) > 0 THEN 3 ELSE 1 END`), ' + ')})` : Prisma.sql`0`;
        order = [{ expression: score }, { expression: Prisma.sql`COALESCE(EXTRACT(EPOCH FROM p."publishedAt"), 0)` }];
    }
    const scope = searchIdentity(filters, market, resource);
    const cursor = decodePageCursor(resource === 'products' ? filters.productCursor : filters.journalCursor, scope, order.length);
    return { scope, page: buildSeekPage(from, where, order, filters.limit, cursor),
        total: Prisma.sql`SELECT COUNT(*)::int AS total FROM ${from} WHERE ${where}` };
}

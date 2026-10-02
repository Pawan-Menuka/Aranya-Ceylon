import type { Market } from '@prisma/client';
import type { PublicSearchInput } from '@aranya/shared';
import { prisma } from '../lib/prisma.js';
import { getProductCards } from './catalog.service.js';
import { buildSearchQueries } from './search-query.js';
import { encodePageCursor, type PageRow } from './page-query.js';

export async function searchPublic(filters: PublicSearchInput, market: Market) {
    // Validate both cursor scopes even when only one resource is requested.
    const productQueries = buildSearchQueries(filters, market, 'products');
    const journalQueries = buildSearchQueries(filters, market, 'journal');
    const [productTotals, journalTotals, productRows, journalRows] = await Promise.all([
        prisma.$queryRaw<{ total: number }[]>(productQueries.total),
        prisma.$queryRaw<{ total: number }[]>(journalQueries.total),
        filters.resource === 'journal' ? Promise.resolve([] as PageRow[]) : prisma.$queryRaw<PageRow[]>(productQueries.page),
        filters.resource === 'products' ? Promise.resolve([] as PageRow[]) : prisma.$queryRaw<PageRow[]>(journalQueries.page),
    ]);
    const productVisible = productRows.slice(0, filters.limit);
    const journalVisible = journalRows.slice(0, filters.limit);
    const [products, journal] = await Promise.all([
        getProductCards(productVisible.map(row => row.id), market),
        journalVisible.length ? prisma.blog.findMany({
            where: { id: { in: journalVisible.map(row => row.id) }, status: 'PUBLISHED' },
            select: { id: true, title: true, slug: true, tags: true, publishedAt: true, seoDesc: true, viewCount: true },
        }) : Promise.resolve([]),
    ]);
    const journalById = new Map(journal.map(post => [post.id, post]));
    const productLast = productVisible.at(-1);
    const journalLast = journalVisible.at(-1);
    const productHasNext = productRows.length > filters.limit;
    const journalHasNext = journalRows.length > filters.limit;
    return { q: filters.q, sort: filters.sort, market,
        products: { items: products, total: productTotals[0]?.total ?? 0,
            nextCursor: productHasNext && productLast ? encodePageCursor(productLast, productQueries.scope) : null,
            hasNextPage: productHasNext },
        journal: { items: journalVisible.flatMap(row => { const post = journalById.get(row.id); return post ? [post] : []; }),
            total: journalTotals[0]?.total ?? 0,
            nextCursor: journalHasNext && journalLast ? encodePageCursor(journalLast, journalQueries.scope) : null,
            hasNextPage: journalHasNext } };
}

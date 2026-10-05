import { Prisma } from '@prisma/client';
import type { Market } from '@prisma/client';
import { catalogFilterSchema } from '@aranya/shared';
import type { CatalogFilterInput } from '@aranya/shared';
import { prisma } from '../lib/prisma.js';
import { buildCatalogPageQuery, buildCatalogCountQuery, buildCatalogFacetsQuery, encodeCatalogCursor, buildCardImagesQuery, buildCategorySummaryQueries, buildProductNameLookupQuery } from './catalog-query.js';

export interface CatalogFacets { category: string[]; form: string[]; origin: string[]; flavour: string[] }
interface RankedId { id: string; key: string; priority: number; secondary: number }

// These are card requirements, not a truncated detail response. No description,
// moderation bodies, publicIds, packaging prose or gallery is sent to lists.
export function productCardSelect(market: Market) {
    return { id: true, name: true, slug: true, certifications: true, featured: true,
        latin: true, originLabel: true, flavour: true, color: true, createdAt: true,
        category: { select: { id: true, name: true, slug: true } },
        variants: { where: { market: { in: [market, 'BOTH'] } },
            orderBy: [{ weight: 'asc' }, { id: 'asc' }],
            select: { id: true, weight: true, price: true, sku: true, stock: true, market: true, currency: true } },
        _count: { select: { reviews: true, orderItems: true } } } satisfies Prisma.ProductSelect;
}

export async function getProductCards(ids: string[], market: Market) {
    if (!ids.length) return [];
    const uniqueIds = [...new Set(ids)];
    const [products, ratings, images] = await Promise.all([
        prisma.product.findMany({ where: { id: { in: uniqueIds }, status: 'ACTIVE', market: { in: [market, 'BOTH'] } }, select: productCardSelect(market) }),
        prisma.review.groupBy({ by: ['productId'], where: { productId: { in: uniqueIds }, moderationStatus: 'APPROVED' }, _avg: { rating: true } }),
        prisma.$queryRaw<Array<{ productId: string; id: string; url: string; altText: string | null; position: number }>>(buildCardImagesQuery(uniqueIds)),
    ]);
    const byId = new Map(products.map(product => [product.id, product]));
    const ratingById = new Map(ratings.map(row => [row.productId, Math.round(Number(row._avg.rating ?? 0) * 10) / 10]));
    const imageById = new Map(images.map(({ productId, ...image }) => [productId, image]));
    return ids.flatMap(id => {
        const product = byId.get(id);
        if (!product) return [];
        const image = imageById.get(id);
        return [{ ...product, ratingAvg: ratingById.get(id) ?? 0, images: image ? [image] : [] }];
    });
}

export async function listProductCards(filters: CatalogFilterInput, market: Market) {
    // Spotlight and global facet availability do not change when the page's
    // filters do. Every selected-filter count is computed over the database.
    const spotlight = catalogFilterSchema.parse({ view: 'cards', sort: 'featured' });
    const [rows, counts, facetRows, featuredRows] = await Promise.all([
        prisma.$queryRaw<RankedId[]>(buildCatalogPageQuery(filters, market)),
        prisma.$queryRaw<Array<{ total: number }>>(buildCatalogCountQuery(filters, market)),
        prisma.$queryRaw<CatalogFacets[]>(buildCatalogFacetsQuery(market)),
        prisma.$queryRaw<RankedId[]>(buildCatalogPageQuery(spotlight, market, true)),
    ]);
    const hasNextPage = rows.length > filters.limit;
    const page = rows.slice(0, filters.limit);
    const cards = await getProductCards([...new Set([...page.map(row => row.id), ...featuredRows.map(row => row.id)])], market);
    const byId = new Map(cards.map(card => [card.id, card]));
    const last = page.at(-1);
    return { items: page.flatMap(row => byId.has(row.id) ? [byId.get(row.id)!] : []),
        nextCursor: hasNextPage && last ? encodeCatalogCursor(last.id, last.key, filters, market, last.priority, last.secondary) : null,
        hasNextPage, total: counts[0]?.total ?? 0,
        facets: facetRows[0] ?? { category: [], form: [], origin: [], flavour: [] },
        featured: featuredRows.flatMap(row => byId.has(row.id) ? [byId.get(row.id)!] : []), market };
}

export async function getPopularProductCards(market: Market, featuredOnly: boolean, limit: number) {
    const ids = await prisma.product.findMany({
        where: { status: 'ACTIVE', market: { in: [market, 'BOTH'] }, ...(featuredOnly ? { featured: true } : {}) },
        select: { id: true }, orderBy: [{ orderItems: { _count: 'desc' } }, { id: 'asc' }], take: limit,
    });
    return getProductCards(ids.map(row => row.id), market);
}

export async function lookupProductCards(names: string[], market: Market) {
    const unique = [...new Set(names)];
    const rows = await prisma.$queryRaw<Array<{ id: string; name: string }>>(buildProductNameLookupQuery(unique, market));
    const byName = new Map(rows.map(row => [row.name, row.id]));
    const ids = unique.flatMap(name => byName.has(name) ? [byName.get(name)!] : []);
    return getProductCards(ids, market);
}

export async function getCategorySummary(market: Market) {
    const queries = buildCategorySummaryQueries(market);
    const [groups, flavours] = await Promise.all([
        prisma.$queryRaw<Array<{ name: string; count: number; ids: string[] }>>(queries.groups),
        prisma.$queryRaw<Array<{ name: string; count: number; id: string }>>(queries.flavours),
    ]);
    const cards = await getProductCards([...new Set([...groups.flatMap(group => group.ids), ...flavours.map(flavour => flavour.id)])], market);
    const byId = new Map(cards.map(card => [card.id, card]));
    return { groups: groups.map(group => ({ name: group.name, count: group.count,
        spices: group.ids.flatMap(id => byId.has(id) ? [byId.get(id)!] : []) })),
        facets: { flavour: flavours.map(flavour => ({ name: flavour.name, count: flavour.count, sample: byId.get(flavour.id) ?? null })) } };
}

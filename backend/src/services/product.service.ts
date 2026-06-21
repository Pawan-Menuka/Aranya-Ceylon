import { prisma } from '../index.js';
import { Prisma } from '@prisma/client';
import type { Market } from '@prisma/client';
import type { CreateProductInput, UpdateProductInput, ProductFilterInput } from '@aranya/shared';

// ----------------------------------------------------------------
// MARKET FILTER HELPER
// Every public-facing query passes market through here.
// Admin queries skip this — they use their own service functions.
// ----------------------------------------------------------------
function marketFilter(market: Market): Prisma.ProductWhereInput {
    return {
        market: { in: [market, 'BOTH'] },
    };
}

function variantMarketFilter(market: Market): Prisma.VariantWhereInput {
    return {
        market: { in: [market, 'BOTH'] },
    };
}

const KNOWN_SPICE_COLORS: Record<string, string> = {
    'cinnamon': '#C58B58', // Warm Cinnamon
    'pepper': '#2E2E2E',   // Charcoal Black
    'tea': '#7C3030',      // Deep Amber/Terracotta
    'turmeric': '#FFB000', // Golden Yellow
    'cardamom': '#5F8575', // Sage Green
    'clove': '#4A2F13',    // Clove Brown
    'nutmeg': '#8A6240',   // Nutmeg Brown
    'ginger': '#D2B48C',   // Ginger Sand
};

const BRAND_PALETTE = [
    '#C58B58', // Warm Cinnamon
    '#2E2E2E', // Charcoal Black
    '#7C3030', // Deep Terracotta
    '#5F8575', // Sage Green
    '#FFB000', // Golden Yellow
    '#4A2F13', // Clove Brown
    '#8A6240', // Nutmeg Brown
    '#D2B48C', // Ginger Sand
    '#9B6A6C', // Muted Rose
    '#4A6B82', // Slate Blue
];

function computeProductColor(name: string, slug: string): string {
    const lowerName = name.toLowerCase();
    const lowerSlug = slug.toLowerCase();

    for (const [key, color] of Object.entries(KNOWN_SPICE_COLORS)) {
        if (lowerName.includes(key) || lowerSlug.includes(key)) {
            return color;
        }
    }

    let hash = 0;
    for (let i = 0; i < lowerSlug.length; i++) {
        hash = lowerSlug.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % BRAND_PALETTE.length;
    return BRAND_PALETTE[index]!;
}

async function enrichProductsWithRatingAvg<T extends { id: string }>(products: T[]): Promise<(T & { ratingAvg: number })[]> {
    if (products.length === 0) return [];
    const ids = products.map(p => p.id);
    const stats = await prisma.review.groupBy({
        by: ['productId'],
        where: {
            productId: { in: ids },
            moderationStatus: 'APPROVED',
        },
        _avg: {
            rating: true,
        },
    });

    const avgMap = new Map<string, number>();
    for (const stat of stats) {
        if (stat._avg.rating !== null) {
            avgMap.set(stat.productId, Math.round(Number(stat._avg.rating) * 10) / 10);
        }
    }

    return products.map(p => ({
        ...p,
        ratingAvg: avgMap.get(p.id) ?? 0.0,
    }));
}

async function enrichProductWithRatingAvg<T extends { id: string }>(product: T | null): Promise<(T & { ratingAvg: number }) | null> {
    if (!product) return null;
    const [enriched] = await enrichProductsWithRatingAvg([product]);
    return enriched || null;
}

// ----------------------------------------------------------------
// PRODUCT INCLUDES
// Two versions: market-aware (public) and full (admin).
// Market-aware filters variants so a LOCAL visitor never receives
// INTERNATIONAL variant rows in any API response, and vice versa.
// ----------------------------------------------------------------
function buildProductIncludes(market?: Market): Prisma.ProductInclude {
    return {
        category: true,
        variants: {
            ...(market ? { where: variantMarketFilter(market) } : {}),
            orderBy: { weight: 'asc' },
        },
        images: { orderBy: { position: 'asc' } },
        _count: { select: { reviews: true, orderItems: true } },
    };
}

// Admin sees all variants — no market filter
const adminProductIncludes = buildProductIncludes();

// ----------------------------------------------------------------
// PUBLIC FUNCTIONS — all require market parameter
// ----------------------------------------------------------------

// --- List products with cursor pagination + filters ---
export async function listProducts(
    filters: ProductFilterInput,
    market: Market,
) {
    const { cursor, limit, category, featured, minPrice, maxPrice, sort, search } = filters;

    // Build dynamic where clause — market filter applied at DB level
    const where: Prisma.ProductWhereInput = {
        status: 'ACTIVE',
        ...marketFilter(market),
        ...(category && { category: { slug: category } }),
        ...(featured !== undefined && { featured }),
        // Price filters scoped to market-relevant variants only.
        // Both bounds must be in a single `variants` key — two separate spreads would
        // overwrite each other, dropping minPrice when both are present (object key collision).
        ...((minPrice !== undefined || maxPrice !== undefined) && {
            variants: {
                some: {
                    price: {
                        ...(minPrice !== undefined && { gte: minPrice }),
                        ...(maxPrice !== undefined && { lte: maxPrice }),
                    },
                    ...variantMarketFilter(market),
                },
            },
        }),
    };

    // Full-text search via PostgreSQL tsvector — market filtered in SQL
    if (search) {
        const products = await prisma.$queryRaw<{ id: string }[]>`
            SELECT id FROM "Product"
            WHERE status = 'ACTIVE'
              AND market IN (${market}::"Market", 'BOTH'::"Market")
              AND "searchVector" @@ plainto_tsquery('english', ${search})
            ORDER BY ts_rank("searchVector", plainto_tsquery('english', ${search})) DESC
            LIMIT ${limit}
        `;
        const ids = products.map((p) => p.id);

        const items = await prisma.product.findMany({
            where: { id: { in: ids } },
            include: buildProductIncludes(market),
        });
        return enrichProductsWithRatingAvg(items);
    }

    // Sort mapping
    const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
        switch (sort) {
            case 'price_asc': return { variants: { _count: 'asc' } };
            case 'price_desc': return { variants: { _count: 'desc' } };
            case 'bestselling': return { orderItems: { _count: 'desc' } };
            default: return { createdAt: 'desc' };
        }
    })();

    const items = await prisma.product.findMany({
        where,
        orderBy,
        take: limit + 1, // One extra to determine hasNextPage
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        include: buildProductIncludes(market),
    });
    return enrichProductsWithRatingAvg(items);
}

// --- Get single product by slug ---
export async function getProductBySlug(slug: string, market: Market) {
    const product = await prisma.product.findFirst({
        where: {
            slug,
            status: 'ACTIVE',
            ...marketFilter(market),
        },
        include: {
            ...buildProductIncludes(market),
            reviews: {
                where: { moderationStatus: 'APPROVED' },
                include: { user: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 10,
            },
        },
    });
    return enrichProductWithRatingAvg(product);
}

// --- Featured products ---
export async function getFeaturedProducts(market: Market, limit = 4) {
    const products = await prisma.product.findMany({
        where: {
            featured: true,
            status: 'ACTIVE',
            ...marketFilter(market),
        },
        include: buildProductIncludes(market),
        orderBy: { orderItems: { _count: 'desc' } },
        take: limit,
    });
    return enrichProductsWithRatingAvg(products);
}

// --- Bestsellers ---
export async function getBestsellers(market: Market, limit = 8) {
    const products = await prisma.product.findMany({
        where: {
            status: 'ACTIVE',
            ...marketFilter(market),
        },
        include: buildProductIncludes(market),
        orderBy: { orderItems: { _count: 'desc' } },
        take: limit,
    });
    return enrichProductsWithRatingAvg(products);
}

// --- Related products (same category, exclude current) ---
export async function getRelatedProducts(
    productId: string,
    categoryId: string,
    market: Market,
    limit = 6,
) {
    const products = await prisma.product.findMany({
        where: {
            categoryId,
            id: { not: productId },
            status: 'ACTIVE',
            ...marketFilter(market),
        },
        include: buildProductIncludes(market),
        take: limit,
    });
    return enrichProductsWithRatingAvg(products);
}

// --- Autocomplete search (pg_trgm fuzzy matching) ---
export async function searchAutocomplete(
    query: string,
    market: Market,
    limit = 5,
) {
    return prisma.$queryRaw<{ id: string; name: string; slug: string }[]>`
        SELECT id, name, slug
        FROM "Product"
        WHERE status = 'ACTIVE'
          AND market IN (${market}::"Market", 'BOTH'::"Market")
          AND (
            name % ${query}
            OR "searchVector" @@ plainto_tsquery('english', ${query})
          )
        ORDER BY similarity(name, ${query}) DESC
        LIMIT ${limit}
    `;
}

// ----------------------------------------------------------------
// ADMIN FUNCTIONS — no market filter, sees everything
// ----------------------------------------------------------------

// --- Create product (admin only) ---
export async function createProduct(data: CreateProductInput) {
    const { variants, ...productData } = data;
    const color = productData.color || computeProductColor(productData.name, productData.slug);

    const product = await prisma.product.create({
        data: {
            ...productData,
            color,
            variants: { create: variants },
        },
        include: adminProductIncludes,
    });
    return enrichProductWithRatingAvg(product);
}

// --- Update product (admin only) ---
// Updates product fields and, when `variants` is supplied, reconciles them by
// id within a transaction: rows with an `id` are updated, rows without are
// created, and existing variants missing from the payload are deleted ONLY if
// no order/cart item references them (kept otherwise to preserve order history).
export async function updateProduct(id: string, data: UpdateProductInput) {
    const { variants, ...fields } = data;

    return prisma.$transaction(async (tx) => {
        await tx.product.update({
            where: { id },
            data: {
                ...(fields.name && { name: fields.name }),
                ...(fields.description && { description: fields.description }),
                ...(fields.categoryId && { categoryId: fields.categoryId }),
                ...(fields.featured !== undefined && { featured: fields.featured }),
                ...(fields.certifications && { certifications: fields.certifications }),
                ...(fields.latin !== undefined && { latin: fields.latin }),
                ...(fields.originLabel !== undefined && { originLabel: fields.originLabel }),
                ...(fields.color !== undefined && { color: fields.color }),
            },
        });

        if (variants) {
            const existing = await tx.variant.findMany({ where: { productId: id }, select: { id: true } });
            const existingIds = new Set(existing.map((v) => v.id));
            const incomingIds = new Set(variants.filter((v) => v.id).map((v) => v.id as string));

            // Remove variants the admin dropped — but only when unreferenced.
            for (const exId of existingIds) {
                if (incomingIds.has(exId)) continue;
                const [orderRefs, cartRefs] = await Promise.all([
                    tx.orderItem.count({ where: { variantId: exId } }),
                    tx.cartItem.count({ where: { variantId: exId } }),
                ]);
                if (orderRefs === 0 && cartRefs === 0) {
                    await tx.variant.delete({ where: { id: exId } });
                }
                // else: referenced by an order/cart — keep it (re-appears in the response).
            }

            // Update existing, create new.
            for (const v of variants) {
                const fieldsForVariant = {
                    weight: v.weight,
                    price: v.price,
                    sku: v.sku,
                    stock: v.stock,
                    market: v.market,
                    currency: v.currency,
                };
                if (v.id && existingIds.has(v.id)) {
                    await tx.variant.update({ where: { id: v.id }, data: fieldsForVariant });
                } else {
                    await tx.variant.create({ data: { productId: id, ...fieldsForVariant } });
                }
            }
        }

        const product = await tx.product.findUniqueOrThrow({ where: { id }, include: adminProductIncludes });
        return enrichProductWithRatingAvg(product);
    });
}

// --- Soft delete (archive) product (admin only) ---
export async function archiveProduct(id: string) {
    return prisma.product.update({
        where: { id },
        data: { status: 'ARCHIVED' },
    });
}

// --- Admin: list ALL products across both markets ---
export async function adminListProducts() {
    const products = await prisma.product.findMany({
        include: adminProductIncludes,
        orderBy: { createdAt: 'desc' },
    });
    return enrichProductsWithRatingAvg(products);
}
import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import type { Market } from '@prisma/client';
import type { CreateProductInput, UpdateProductInput, ProductFilterInput } from '@aranya/shared';
import { buildLegacyProductPageQuery } from './catalog-query.js';

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
            orderBy: [{ weight: 'asc' }, { id: 'asc' }],
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
export async function listProducts(filters: ProductFilterInput, market: Market) {
    const ranked = await prisma.$queryRaw<Array<{ id: string }>>(buildLegacyProductPageQuery(filters, market));
    if (!ranked.length) return [];
    const products = await prisma.product.findMany({
        where: { id: { in: ranked.map(row => row.id) }, status: 'ACTIVE', ...marketFilter(market) },
        include: buildProductIncludes(market),
    });
    const byId = new Map(products.map(product => [product.id, product]));
    const ordered = ranked.flatMap(row => byId.has(row.id) ? [byId.get(row.id)!] : []);
    return enrichProductsWithRatingAvg(ordered);
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
export async function createProduct(data: CreateProductInput, tx: Prisma.TransactionClient = prisma) {
    const { variants, ...productData } = data;
    const color = productData.color || computeProductColor(productData.name, productData.slug);

    const product = await tx.product.create({
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
export async function updateProduct(id: string, data: UpdateProductInput, tx?: Prisma.TransactionClient) {
    const { variants, ...fields } = data;

    const work = async (tx: Prisma.TransactionClient) => {
        await tx.product.update({
            where: { id },
            data: {
                // Use !== undefined (not truthiness) so a provided value is always
                // applied, consistent with latin/originLabel below (BUG-23). The
                // shared schema still enforces min lengths, so these can't be blanked.
                ...(fields.name !== undefined && { name: fields.name }),
                ...(fields.slug !== undefined && { slug: fields.slug }),
                ...(fields.description !== undefined && { description: fields.description }),
                ...(fields.categoryId !== undefined && { categoryId: fields.categoryId }),
                ...(fields.featured !== undefined && { featured: fields.featured }),
                ...(fields.status && { status: fields.status }),
                ...(fields.certifications && { certifications: fields.certifications }),
                ...(fields.latin !== undefined && { latin: fields.latin }),
                ...(fields.originLabel !== undefined && { originLabel: fields.originLabel }),
                ...(fields.color !== undefined && { color: fields.color }),
                ...(fields.flavour !== undefined && { flavour: fields.flavour }),
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
    };
    return tx ? work(tx) : prisma.$transaction(work);
}

// --- Soft delete (archive) product (admin only) ---
// Archiving is reversible (status → ARCHIVED), so it must NOT destroy the
// product's Cloudinary images — doing so left broken image URLs behind if the
// product was later un-archived (BUG-24). Images are only removed on a true
// hard delete or explicit image removal, never here.
export async function archiveProduct(id: string, tx: Prisma.TransactionClient = prisma) {
    return tx.product.update({
        where: { id },
        data: { status: 'ARCHIVED' },
    });
}

// --- Admin: list ALL products across both markets ---
export async function adminListProducts() {
    const products = await prisma.product.findMany({
        include: adminProductIncludes,
        orderBy: { createdAt: 'desc' },
        take: 500, // bound an otherwise unlimited load with variants+images (PERF-07)
    });
    return enrichProductsWithRatingAvg(products);
}

// Bounded admin page hydration preserves the existing inline editor contract.
export async function getAdminProductsByIds(ids: string[]) {
    if (!ids.length) return [];
    return enrichProductsWithRatingAvg(await prisma.product.findMany({
        where: { id: { in: ids } }, include: adminProductIncludes,
    }));
}
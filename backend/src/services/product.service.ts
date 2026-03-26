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
        // Price filters scoped to market-relevant variants only
        ...(minPrice !== undefined && {
            variants: { some: { price: { gte: minPrice }, ...variantMarketFilter(market) } },
        }),
        ...(maxPrice !== undefined && {
            variants: { some: { price: { lte: maxPrice }, ...variantMarketFilter(market) } },
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

        return prisma.product.findMany({
            where: { id: { in: ids } },
            include: buildProductIncludes(market),
        });
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

    return prisma.product.findMany({
        where,
        orderBy,
        take: limit + 1, // One extra to determine hasNextPage
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        include: buildProductIncludes(market),
    });
}

// --- Get single product by slug ---
export async function getProductBySlug(slug: string, market: Market) {
    return prisma.product.findFirst({
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
}

// --- Featured products ---
export async function getFeaturedProducts(market: Market, limit = 4) {
    return prisma.product.findMany({
        where: {
            featured: true,
            status: 'ACTIVE',
            ...marketFilter(market),
        },
        include: buildProductIncludes(market),
        orderBy: { orderItems: { _count: 'desc' } },
        take: limit,
    });
}

// --- Bestsellers ---
export async function getBestsellers(market: Market, limit = 8) {
    return prisma.product.findMany({
        where: {
            status: 'ACTIVE',
            ...marketFilter(market),
        },
        include: buildProductIncludes(market),
        orderBy: { orderItems: { _count: 'desc' } },
        take: limit,
    });
}

// --- Related products (same category, exclude current) ---
export async function getRelatedProducts(
    productId: string,
    categoryId: string,
    market: Market,
    limit = 6,
) {
    return prisma.product.findMany({
        where: {
            categoryId,
            id: { not: productId },
            status: 'ACTIVE',
            ...marketFilter(market),
        },
        include: buildProductIncludes(market),
        take: limit,
    });
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

    return prisma.product.create({
        data: {
            ...productData,
            variants: { create: variants },
        },
        include: adminProductIncludes,
    });
}

// --- Update product (admin only) ---
export async function updateProduct(id: string, data: UpdateProductInput) {
    return prisma.product.update({
        where: { id },
        data: {
            ...(data.name && { name: data.name }),
            ...(data.description && { description: data.description }),
            ...(data.categoryId && { categoryId: data.categoryId }),
            ...(data.featured !== undefined && { featured: data.featured }),
            ...(data.certifications && { certifications: data.certifications }),
        },
        include: adminProductIncludes,
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
    return prisma.product.findMany({
        include: adminProductIncludes,
        orderBy: { createdAt: 'desc' },
    });
}
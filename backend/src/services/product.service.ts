import { prisma } from '../index.js';
import { Prisma } from '@prisma/client';
import type { CreateProductInput, UpdateProductInput, ProductFilterInput } from '@aranya/shared';

// --- List products with cursor pagination + filters ---
export async function listProducts(filters: ProductFilterInput) {
    const { cursor, limit, category, featured, minPrice, maxPrice, sort, search } = filters;

    // Build dynamic where clause from URL params
    const where: Prisma.ProductWhereInput = {
        status: 'ACTIVE',
        ...(category && { category: { slug: category } }),
        ...(featured !== undefined && { featured }),
        // Filter by minimum variant price
        ...(minPrice !== undefined && {
            variants: { some: { price: { gte: minPrice } } },
        }),
        ...(maxPrice !== undefined && {
            variants: { some: { price: { lte: maxPrice } } },
        }),
    };

    // Full-text search via PostgreSQL tsvector
    if (search) {
        const products = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Product"
      WHERE status = 'ACTIVE'
        AND "searchVector" @@ plainto_tsquery('english', ${search})
      ORDER BY ts_rank("searchVector", plainto_tsquery('english', ${search})) DESC
      LIMIT ${limit}
    `;
        const ids = products.map((p) => p.id);

        return prisma.product.findMany({
            where: { id: { in: ids } },
            include: productIncludes,
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
        take: limit + 1, // Fetch one extra to determine if there's a next page
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        include: productIncludes,
    });
}

// --- Get single product by slug ---
export async function getProductBySlug(slug: string) {
    return prisma.product.findUnique({
        where: { slug },
        include: {
            ...productIncludes,
            reviews: {
                where: { moderationStatus: 'APPROVED' },
                include: { user: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 10,
            },
        },
    });
}

// --- Create product (admin only) ---
export async function createProduct(data: CreateProductInput) {
    const { variants, ...productData } = data;

    return prisma.product.create({
        data: {
            ...productData,
            variants: { create: variants },
        },
        include: productIncludes,
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
        include: productIncludes,
    });
}

// --- Soft delete (archive) product ---
export async function archiveProduct(id: string) {
    return prisma.product.update({
        where: { id },
        data: { status: 'ARCHIVED' },
    });
}

// --- Autocomplete search (pg_trgm fuzzy matching) ---
export async function searchAutocomplete(query: string, limit = 5) {
    return prisma.$queryRaw<{ id: string; name: string; slug: string }[]>`
    SELECT id, name, slug
    FROM "Product"
    WHERE status = 'ACTIVE'
      AND (
        name % ${query}
        OR "searchVector" @@ plainto_tsquery('english', ${query})
      )
    ORDER BY similarity(name, ${query}) DESC
    LIMIT ${limit}
  `;
}

// --- Featured products ---
export async function getFeaturedProducts(limit = 4) {
    return prisma.product.findMany({
        where: { featured: true, status: 'ACTIVE' },
        include: productIncludes,
        orderBy: { orderItems: { _count: 'desc' } },
        take: limit,
    });
}

// --- Bestsellers ---
export async function getBestsellers(limit = 8) {
    return prisma.product.findMany({
        where: { status: 'ACTIVE' },
        include: productIncludes,
        orderBy: { orderItems: { _count: 'desc' } },
        take: limit,
    });
}

// --- Related products (same category, exclude current) ---
export async function getRelatedProducts(productId: string, categoryId: string, limit = 6) {
    return prisma.product.findMany({
        where: {
            categoryId,
            id: { not: productId },
            status: 'ACTIVE',
        },
        include: productIncludes,
        take: limit,
    });
}

// Reusable include shape — keeps queries consistent across all product endpoints
const productIncludes = {
    category: true,
    variants: { orderBy: { weight: 'asc' as const } },
    images: { orderBy: { position: 'asc' as const } },
    _count: { select: { reviews: true, orderItems: true } },
} satisfies Prisma.ProductInclude;
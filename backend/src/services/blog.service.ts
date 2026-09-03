import { Prisma } from '@prisma/client';
import { prisma } from '../index.js';

export async function listPublishedBlogs(limit = 10, cursor?: string) {
    try {
        return await prisma.blog.findMany({
            where: { status: 'PUBLISHED' },
            orderBy: { publishedAt: 'desc' },
            take: limit + 1,
            ...(cursor && { cursor: { id: cursor }, skip: 1 }),
            select: {
                id: true, title: true, slug: true,
                tags: true, publishedAt: true,
                seoDesc: true, viewCount: true,
            },
        });
    } catch (err) {
        // A stale (since-deleted-post) or forged cursor makes Prisma throw
        // P2025 while trying to locate the anchor row for `cursor: { id }`.
        // Treat it as "no more results" instead of 500ing this public,
        // unauthenticated endpoint (remaining-surfaces audit #6).
        if (cursor && err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
            return [];
        }
        throw err;
    }
}

export async function getBlogBySlug(slug: string) {
    const blog = await prisma.blog.findUnique({
        where: { slug, status: 'PUBLISHED' },
    });

    if (blog) {
        // Increment view count — fire and forget (don't await)
        prisma.blog.update({
            where: { id: blog.id },
            data: { viewCount: { increment: 1 } },
        }).catch(() => { }); // Silently ignore errors on view count
    }

    return blog;
}

export async function getRecentBlogs(limit = 3) {
    return prisma.blog.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        select: {
            id: true, title: true, slug: true,
            tags: true, publishedAt: true, seoDesc: true,
        },
    });
}
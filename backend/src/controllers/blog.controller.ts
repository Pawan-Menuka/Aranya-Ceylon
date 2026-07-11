import type { Request, Response } from 'express';
import * as blogService from '../services/blog.service.js';

export async function listBlogs(req: Request, res: Response) {
    const cursor = req.query.cursor as string | undefined;
    // A non-numeric ?limit= made Number() NaN, which flowed into Prisma's `take`
    // and threw a 500 (BUG-22). Fall back to the default and clamp to 1..50.
    const parsed = Number(req.query.limit ?? 10);
    const limit = Number.isFinite(parsed) ? Math.min(Math.max(1, Math.trunc(parsed)), 50) : 10;
    const blogs = await blogService.listPublishedBlogs(limit, cursor);

    const hasNextPage = blogs.length > limit;
    const items = hasNextPage ? blogs.slice(0, -1) : blogs;

    return res.json({ items, nextCursor: hasNextPage ? items[items.length - 1]?.id : null });
}

export async function getBlog(req: Request, res: Response) {
    const blog = await blogService.getBlogBySlug(req.params.slug!);
    if (!blog) return res.status(404).json({ error: 'Blog post not found' });
    return res.json({ blog });
}

export async function getRecentBlogs(_req: Request, res: Response) {
    const blogs = await blogService.getRecentBlogs();
    return res.json({ blogs });
}
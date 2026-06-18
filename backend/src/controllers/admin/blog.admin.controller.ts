import type { Request, Response } from 'express';
import { prisma } from '../../index.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { z } from 'zod';

const createBlogSchema = z.object({
    title: z.string().min(2),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    content: z.string().min(10),
    tags: z.array(z.string()).default([]),
    status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED']).default('DRAFT'),
    scheduledAt: z.string().datetime().optional(),
    seoTitle: z.string().optional(),
    seoDesc: z.string().optional(),
});

export async function listBlogs(_req: Request, res: Response) {
    const blogs = await prisma.blog.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true, title: true, slug: true, status: true,
            publishedAt: true, scheduledAt: true, viewCount: true, tags: true, authorId: true,
        },
    });
    return res.json({ blogs });
}

// Full post by id (any status) — for the admin editor, which must load drafts
// and scheduled posts the public /blog/:slug endpoint won't return.
export async function getBlog(req: Request, res: Response) {
    const blog = await prisma.blog.findUnique({ where: { id: req.params.id! } });
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    return res.json({ blog });
}

export async function createBlog(req: Request, res: Response) {
    const data = createBlogSchema.parse(req.body);

    const blog = await prisma.blog.create({
        data: {
            ...data,
            authorId: req.user!.userId,
            publishedAt: data.status === 'PUBLISHED' ? new Date() : undefined,
            scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        },
    });

    await writeAuditLog({
        req, event: 'BLOG_PUBLISH',
        targetType: 'Blog', targetId: blog.id,
    });

    return res.status(201).json({ blog });
}

export async function updateBlog(req: Request, res: Response) {
    const id = req.params.id!;
    const data = createBlogSchema.partial().parse(req.body);

    const before = await prisma.blog.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: 'Blog not found' });

    const blog = await prisma.blog.update({
        where: { id },
        data: {
            ...data,
            ...(data.status === 'PUBLISHED' && !before.publishedAt
                ? { publishedAt: new Date() }
                : {}),
        },
    });

    // Trigger ISR revalidation on Next.js frontend
    await revalidateFrontend(`/blog/${blog.slug}`);
    await revalidateFrontend('/blog');

    return res.json({ blog });
}

export async function deleteBlog(req: Request, res: Response) {
    const id = req.params.id!;

    const blog = await prisma.blog.findUnique({ where: { id } });
    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    await prisma.blog.delete({ where: { id } });

    await writeAuditLog({
        req, event: 'BLOG_DELETE',
        targetType: 'Blog', targetId: id,
    });

    return res.json({ message: 'Blog deleted' });
}

// Trigger Next.js ISR revalidation
async function revalidateFrontend(path: string) {
    const secret = process.env.REVALIDATION_SECRET;
    const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

    if (!secret) return;

    try {
        await fetch(`${baseUrl}/api/revalidate?secret=${secret}&path=${path}`);
    } catch {
        // Non-fatal — page will revalidate on next ISR cycle regardless
    }
}
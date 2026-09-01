import type { Request, Response } from 'express';
import { prisma } from '../../index.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { revalidateFrontend } from '../../lib/revalidate.js';
import { z } from 'zod';

const blogFields = z.object({
    title: z.string().min(2),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    content: z.string().min(10),
    tags: z.array(z.string()).default([]),
    status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED']).default('DRAFT'),
    scheduledAt: z.string().datetime().optional(),
    seoTitle: z.string().optional(),
    seoDesc: z.string().optional(),
});

// A SCHEDULED post with no scheduledAt can never be picked by the cron job
// (predicate: scheduledAt <= now) — reject it instead of storing a post that
// sits SCHEDULED forever (FLOW-03). Applied to both create and (partial) update;
// on update it only fires when status is explicitly set to SCHEDULED.
const requireScheduledAt = (
    data: { status?: string; scheduledAt?: string },
    ctx: z.RefinementCtx,
) => {
    if (data.status === 'SCHEDULED' && !data.scheduledAt) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scheduledAt'],
            message: 'scheduledAt is required when status is SCHEDULED.',
        });
    }
};

const createBlogSchema = blogFields.superRefine(requireScheduledAt);
const updateBlogSchema = blogFields.partial().superRefine(requireScheduledAt);

export async function listBlogs(_req: Request, res: Response) {
    const blogs = await prisma.blog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500, // bound an otherwise unlimited load (PERF-07) until this list is paginated
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

    let blog;
    try {
        blog = await prisma.blog.create({
            data: {
                ...data,
                authorId: req.user!.userId,
                publishedAt: data.status === 'PUBLISHED' ? new Date() : undefined,
                scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
            },
        });
    } catch (err) {
        if ((err as { code?: string }).code === 'P2002') {
            return res.status(409).json({ error: 'A blog post with that slug already exists' });
        }
        throw err;
    }

    // P3-6: use BLOG_PUBLISH only when actually publishing; drafts/scheduled get BLOG_CREATE
    await writeAuditLog({
        req,
        event: data.status === 'PUBLISHED' ? 'BLOG_PUBLISH' : 'BLOG_CREATE',
        targetType: 'Blog', targetId: blog.id,
    });

    // P3-4: revalidate listing + detail when a post goes live immediately
    if (data.status === 'PUBLISHED') {
        await revalidateFrontend(`/journal/${blog.slug}`);
        await revalidateFrontend('/journal');
    }

    return res.status(201).json({ blog });
}

export async function updateBlog(req: Request, res: Response) {
    const id = req.params.id!;
    const data = updateBlogSchema.parse(req.body);

    const before = await prisma.blog.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: 'Blog not found' });

    let blog;
    try {
        blog = await prisma.blog.update({
            where: { id },
            data: {
                ...data,
                ...(data.scheduledAt ? { scheduledAt: new Date(data.scheduledAt) } : {}),
                ...(data.status === 'PUBLISHED' && !before.publishedAt
                    ? { publishedAt: new Date() }
                    : {}),
            },
        });
    } catch (err) {
        if ((err as { code?: string }).code === 'P2002') {
            return res.status(409).json({ error: 'A blog post with that slug already exists' });
        }
        throw err;
    }

    // P3-3: audit log for updates (was missing entirely)
    const beforeRecord = before as unknown as Record<string, unknown>;
    const afterRecord = blog as unknown as Record<string, unknown>;
    const auditValue = (value: unknown) => value instanceof Date ? value.toISOString() : value;
    const changedFields = Object.keys(data).filter((field) =>
        field !== 'content'
        && JSON.stringify(auditValue(beforeRecord[field])) !== JSON.stringify(auditValue(afterRecord[field])),
    );
    const changes = Object.fromEntries(changedFields.map((field) => [
        field,
        { before: auditValue(beforeRecord[field]), after: auditValue(afterRecord[field]) },
    ]));
    await writeAuditLog({
        req,
        event: data.status === 'PUBLISHED' && !before.publishedAt ? 'BLOG_PUBLISH' : 'BLOG_UPDATE',
        targetType: 'Blog', targetId: id,
        diff: {
            changes,
            ...(data.content !== undefined && data.content !== before.content
                ? { contentChanged: true }
                : {}),
        },
    });

    await revalidateFrontend(`/journal/${blog.slug}`);
    await revalidateFrontend('/journal');

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

    // P3-4: revalidate on delete so the listing and detail no longer serve the post
    await revalidateFrontend(`/journal/${blog.slug}`);
    await revalidateFrontend('/journal');

    return res.json({ message: 'Blog deleted' });
}

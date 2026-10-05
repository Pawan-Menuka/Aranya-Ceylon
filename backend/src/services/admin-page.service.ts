import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getAdminProductsByIds } from './product.service.js';
import { buildAdminQueries, type AdminResource, type AdminPageInput } from './admin-page-query.js';
import { encodePageCursor, type PageRow } from './page-query.js';

const blogSelect = { id: true, title: true, slug: true, status: true, publishedAt: true, scheduledAt: true, viewCount: true, tags: true, authorId: true } satisfies Prisma.BlogSelect;
const recipeSelect = { id: true, slug: true, title: true, course: true, difficulty: true, featured: true, status: true, prepMins: true, cookMins: true, serves: true, createdAt: true } satisfies Prisma.RecipeSelect;
const giftSelect = { id: true, slug: true, name: true, featured: true, badge: true, usd: true, lkr: true, status: true, contents: true, jar: true, createdAt: true } satisfies Prisma.GiftSetSelect;
async function hydrate(resource: AdminResource, ids: string[]) {
    if (!ids.length) return [];
    const where = { id: { in: ids } };
    const items = resource === 'products' ? await getAdminProductsByIds(ids)
        : resource === 'blogs' ? await prisma.blog.findMany({ where, select: blogSelect })
        : resource === 'recipes' ? await prisma.recipe.findMany({ where, select: recipeSelect })
        : resource === 'gifts' ? await prisma.giftSet.findMany({ where, select: giftSelect })
        : await prisma.auditLog.findMany({ where, include: { actor: { select: { name: true, email: true, role: true } } } });
    const byId = new Map(items.map(item => [item.id, item]));
    return ids.flatMap(id => { const item = byId.get(id); return item ? [item] : []; });
}
export async function listAdminPage(resource: AdminResource, filters: AdminPageInput) {
    const queries = buildAdminQueries(resource, filters);
    const [rows, totals, rawCounts] = await Promise.all([
        prisma.$queryRaw<PageRow[]>(queries.page),
        prisma.$queryRaw<{ total: number }[]>(queries.total),
        prisma.$queryRaw<({ key: string; count: number } | Record<string, number>)[]>(queries.counts),
    ]);
    const visible = rows.slice(0, filters.limit);
    const hasNextPage = rows.length > filters.limit;
    const counts: Record<string, number> = resource === 'audit'
        ? { all: 0, admin: 0, job: 0, warn: 0, ...rawCounts[0] as Record<string, number> }
        : resource === 'products' ? { all: 0, low: 0 }
        : { all: 0, DRAFT: 0, SCHEDULED: 0, PUBLISHED: 0 };
    if (resource !== 'audit') for (const value of rawCounts) {
        const row = value as { key: string; count: number };
        counts[row.key] = row.count;
        if (resource !== 'products') counts.all = (counts.all ?? 0) + row.count;
    }
    const last = visible.at(-1);
    const items = await hydrate(resource, visible.map(row => row.id));
    return { [resource === 'audit' ? 'items' : resource]: items,
        total: totals[0]?.total ?? 0, counts,
        nextCursor: hasNextPage && last ? encodePageCursor(last, queries.scope) : null, hasNextPage };
}

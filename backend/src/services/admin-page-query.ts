import { Prisma } from '@prisma/client';
import type { AdminProductPageInput, AdminContentPageInput, AdminAuditPageInput } from '@aranya/shared';
import { buildSeekPage, decodePageCursor, pageIdentity, type OrderKey } from './page-query.js';

export type AdminResource = 'products' | 'blogs' | 'recipes' | 'gifts' | 'audit';
export type AdminPageInput = AdminProductPageInput | AdminContentPageInput | AdminAuditPageInput;
export const warningEvents = ['ORDER_REFUND', 'PRODUCT_ARCHIVE', 'BLOG_DELETE', 'GIFT_DELETE', 'RECIPE_DELETE'];
export function lowStockThreshold(): number {
    const value = Number(process.env.LOW_STOCK_THRESHOLD ?? 10);
    return Number.isFinite(value) && value >= 0 ? value : 10;
}
function contains(haystack: Prisma.Sql, q: string): Prisma.Sql {
    return q ? Prisma.sql`strpos(lower(${haystack}), lower(${q})) > 0` : Prisma.sql`true`;
}
const lowStock = (threshold: number) => Prisma.sql`(NOT EXISTS (SELECT 1 FROM "Variant" v WHERE v."productId" = p.id)
    OR EXISTS (SELECT 1 FROM "Variant" v WHERE v."productId" = p.id AND v.stock <= ${threshold}))`;
const warn = Prisma.sql`p.event IN (${Prisma.join(warningEvents)})`;
const job = Prisma.sql`a.id IS NULL`;
const action = Prisma.sql`CASE p.event WHEN 'ORDER_STATUS_UPDATE' THEN 'order.status'
    WHEN 'ADMIN_LOGIN' THEN 'auth.login' ELSE lower(replace(p.event, '_', '.')) END`;
const target = Prisma.sql`CASE WHEN p."targetType" = '' THEN '—' WHEN p."targetId" = '' THEN p."targetType"
    WHEN p."targetType" = 'Order' THEN 'Order AC-' || upper(right(p."targetId", 6))
    ELSE p."targetType" || ' #' || right(p."targetId", 6) END`;
export function buildAdminQueries(resource: AdminResource, filters: AdminPageInput, threshold = lowStockThreshold()) {
    let from: Prisma.Sql;
    let base: Prisma.Sql[];
    const active: Prisma.Sql[] = [];
    const order: OrderKey[] = [{ expression: Prisma.sql`EXTRACT(EPOCH FROM p."createdAt")` }];
    if (resource === 'products') {
        const product = filters as AdminProductPageInput;
        from = Prisma.sql`"Product" p JOIN "Category" c ON c.id = p."categoryId"`;
        base = [contains(Prisma.sql`p.name || ' ' || COALESCE((SELECT v.sku FROM "Variant" v WHERE v."productId" = p.id ORDER BY v.weight ASC, v.id ASC LIMIT 1), '')`, filters.q)];
        if (product.status) base.push(Prisma.sql`p.status::text = ${product.status}`);
        if (product.category) active.push(Prisma.sql`c.name = ${product.category}`);
        if (product.lowStock !== undefined) active.push(Prisma.sql`${lowStock(threshold)} = ${product.lowStock}`);
    } else if (resource === 'audit') {
        const audit = filters as AdminAuditPageInput;
        from = Prisma.sql`"AuditLog" p LEFT JOIN "User" a ON a.id = p."actorId"`;
        base = [contains(Prisma.sql`COALESCE(a.name, p."actorId", 'System') || ' ' || ${action} || ' ' || ${target} || ' ' || COALESCE(p.diff::text, '')`, filters.q)];
        if (audit.event) base.push(Prisma.sql`p.event = ${audit.event}`);
        if (audit.targetType) base.push(Prisma.sql`p."targetType" = ${audit.targetType}`);
        if (audit.actorId) base.push(Prisma.sql`p."actorId" = ${audit.actorId}`);
        if (audit.filter === 'warn') active.push(warn);
        if (audit.filter === 'job') active.push(job);
        if (audit.filter === 'admin') active.push(Prisma.sql`NOT (${job})`);
    } else {
        from = resource === 'blogs' ? Prisma.sql`"Blog" p` : resource === 'recipes' ? Prisma.sql`"Recipe" p` : Prisma.sql`"GiftSet" p`;
        base = [contains(resource === 'gifts' ? Prisma.sql`p.name` : Prisma.sql`p.title`, filters.q)];
        const content = filters as AdminContentPageInput;
        if (content.status) active.push(Prisma.sql`p.status::text = ${content.status}`);
        if (resource === 'gifts') order.splice(0, 1,
            { expression: Prisma.sql`p.featured::int` },
            { expression: Prisma.sql`EXTRACT(EPOCH FROM p."createdAt")`, ascending: true });
    }
    const scope = pageIdentity({ resource, q: filters.q,
        status: 'status' in filters ? filters.status ?? null : null,
        category: 'category' in filters ? filters.category ?? null : null,
        lowStock: 'lowStock' in filters ? filters.lowStock ?? null : null,
        threshold: resource === 'products' ? threshold : null,
        filter: 'filter' in filters ? filters.filter : null,
        event: 'event' in filters ? filters.event ?? null : null,
        targetType: 'targetType' in filters ? filters.targetType ?? null : null,
        actorId: 'actorId' in filters ? filters.actorId ?? null : null });
    const cursor = decodePageCursor(filters.cursor, scope, order.length);
    const where = Prisma.join([...base, ...active], ' AND ');
    let counts: Prisma.Sql;
    if (resource === 'products') counts = Prisma.sql`WITH matching AS (
        SELECT c.name AS category, ${lowStock(threshold)} AS low FROM ${from} WHERE ${Prisma.join(base, ' AND ')}
    ) SELECT 'all' AS key, COUNT(*)::int AS count FROM matching UNION ALL
        SELECT 'low', COUNT(*)::int FROM matching WHERE low UNION ALL
        SELECT category, COUNT(*)::int FROM matching GROUP BY category`;
    else if (resource === 'audit') counts = Prisma.sql`SELECT COUNT(*)::int AS "all",
        COUNT(*) FILTER (WHERE NOT (${job}))::int AS admin,
        COUNT(*) FILTER (WHERE ${job})::int AS job,
        COUNT(*) FILTER (WHERE ${warn})::int AS warn FROM ${from} WHERE ${Prisma.join(base, ' AND ')}`;
    else counts = Prisma.sql`SELECT p.status::text AS key, COUNT(*)::int AS count FROM ${from}
        WHERE ${Prisma.join(base, ' AND ')} GROUP BY p.status`;
    return { scope, page: buildSeekPage(from, where, order, filters.limit, cursor),
        total: Prisma.sql`SELECT COUNT(*)::int AS total FROM ${from} WHERE ${where}`, counts };
}

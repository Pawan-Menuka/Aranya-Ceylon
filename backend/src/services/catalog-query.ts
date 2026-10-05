import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { Market } from '@prisma/client';
import type { CatalogFilterInput, ProductFilterInput } from '@aranya/shared';

export interface CatalogCursor { v: 1; query: string; id: string; key: string; priority: number; secondary: number }
export function catalogQueryIdentity(filters: CatalogFilterInput, market: Market) {
    return createHash('sha256').update(JSON.stringify({ market, sort: filters.sort,
        categoryName: filters.categoryName, form: filters.form, origin: filters.origin,
        flavour: filters.flavour, search: filters.search ?? '' })).digest('hex');
}
export function encodeCatalogCursor(id: string, key: string, filters: CatalogFilterInput, market: Market, priority = 0, secondary = 0) {
    return Buffer.from(JSON.stringify({ v: 1, query: catalogQueryIdentity(filters, market), id, key, priority, secondary })).toString('base64url');
}
export function decodeCatalogCursor(filters: CatalogFilterInput, market: Market): CatalogCursor | undefined {
    if (!filters.cursor) return;
    try {
        const value = JSON.parse(Buffer.from(filters.cursor, 'base64url').toString('utf8')) as CatalogCursor;
        if (value.v !== 1 || value.query !== catalogQueryIdentity(filters, market)
            || typeof value.id !== 'string' || !value.id || value.id.length > 200
            || typeof value.key !== 'string' || value.key.length > 100 || !/^-?\d+(\.\d+)?$/.test(value.key)
            || ![0, 1].includes(value.priority) || !Number.isSafeInteger(value.secondary) || value.secondary < 0) throw new Error();
        return value;
    } catch {
        throw Object.assign(new Error('Invalid catalogue cursor for these filters and market'), { status: 400, expose: true });
    }
}

export const catalogFormSql = Prisma.sql`CASE WHEN (p.name || ' ' || c.name) ~* 'ground|powder|masala|blend' THEN 'Ground' ELSE 'Whole' END`;
export const catalogOriginSql = Prisma.sql`COALESCE(NULLIF(p."originLabel", ''), c.name, 'Sri Lanka')`;
export function catalogWhere(filters: CatalogFilterInput, market: Market) {
    const parts: Prisma.Sql[] = [Prisma.sql`p.status = 'ACTIVE' AND p.market IN (${market}::"Market", 'BOTH'::"Market")`];
    if (filters.categoryName.length) parts.push(Prisma.sql`c.name IN (${Prisma.join(filters.categoryName)})`);
    if (filters.form.length) parts.push(Prisma.sql`${catalogFormSql} IN (${Prisma.join(filters.form)})`);
    if (filters.origin.length) parts.push(Prisma.sql`${catalogOriginSql} IN (${Prisma.join(filters.origin)})`);
    if (filters.flavour.length) parts.push(Prisma.sql`p.flavour && ARRAY[${Prisma.join(filters.flavour)}]::text[]`);
    if (filters.search) parts.push(Prisma.sql`p."searchVector" @@ plainto_tsquery('english', ${filters.search})`);
    return Prisma.join(parts, ' AND ');
}
export function catalogSortKey(filters: CatalogFilterInput, market: Market): Prisma.Sql {
    if (filters.sort === 'price-asc' || filters.sort === 'price-desc') {
        const currency = market === 'LOCAL' ? 'LKR' : 'USD';
        // Exactly the adapter's displayed price: first 100g, otherwise cheapest
        // matching currency, never a foreign-currency amount. Missing price is 0.
        // LKR display rounds to rupees, so ordering must follow that too.
        const price = Prisma.sql`COALESCE((SELECT v.price FROM "Variant" v
            WHERE v."productId" = p.id AND v.market IN (${market}::"Market", 'BOTH'::"Market")
              AND v.currency = ${currency}::"Currency"
            ORDER BY (v.weight = 100) DESC, CASE WHEN v.weight = 100 THEN 0 ELSE v.price END ASC, v.id ASC LIMIT 1), 0)`;
        return market === 'LOCAL' ? Prisma.sql`ROUND(${price})` : price;
    }
    if (filters.sort === 'rating') return Prisma.sql`COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 1)
        FROM "Review" r WHERE r."productId" = p.id AND r."moderationStatus" = 'APPROVED'), 0)`;
    if (filters.sort === 'best' || filters.sort === 'featured') return Prisma.sql`(SELECT COUNT(*) FROM "OrderItem" oi WHERE oi."productId" = p.id)`;
    return Prisma.sql`EXTRACT(EPOCH FROM p."createdAt")`;
}
export function buildCatalogPageQuery(filters: CatalogFilterInput, market: Market, featuredOnly = false) {
    const cursor = featuredOnly ? undefined : decodeCatalogCursor(filters, market);
    const direction = filters.sort === 'price-asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const comparison = filters.sort === 'price-asc' ? Prisma.sql`>` : Prisma.sql`<`;
    const priority = filters.sort === 'featured' ? Prisma.sql`p.featured::int` : Prisma.sql`0`;
    const secondary = filters.sort === 'rating' ? Prisma.sql`(SELECT COUNT(*)::int FROM "Review" r WHERE r."productId" = p.id)` : Prisma.sql`0`;
    const afterKey = cursor ? Prisma.sql`(ordered.key ${comparison} ${cursor.key}::numeric OR (ordered.key = ${cursor.key}::numeric AND (ordered.secondary < ${cursor.secondary} OR (ordered.secondary = ${cursor.secondary} AND ordered.id > ${cursor.id}))))` : Prisma.empty;
    // The separate spotlight chooses only featured rows from the full market.
    return Prisma.sql`WITH ordered AS (
        SELECT p.id, ${catalogSortKey(filters, market)} AS key, ${priority} AS priority, ${secondary} AS secondary
        FROM "Product" p JOIN "Category" c ON c.id = p."categoryId"
        WHERE ${catalogWhere(filters, market)} ${featuredOnly ? Prisma.sql`AND p.featured = true` : Prisma.empty}
    ) SELECT id, key::text AS key, priority, secondary FROM ordered
      ${cursor ? Prisma.sql`WHERE priority < ${cursor.priority} OR (priority = ${cursor.priority} AND ${afterKey})` : Prisma.empty}
      ORDER BY ordered.priority DESC, ordered.key ${direction}, ordered.secondary DESC, ordered.id ASC LIMIT ${featuredOnly ? 3 : filters.limit + 1}`;
}
export function buildCatalogCountQuery(filters: CatalogFilterInput, market: Market) {
    return Prisma.sql`SELECT COUNT(*)::int AS total FROM "Product" p JOIN "Category" c ON c.id = p."categoryId" WHERE ${catalogWhere(filters, market)}`;
}
export function buildCatalogFacetsQuery(market: Market) {
    return Prisma.sql`WITH visible AS (
        SELECT c.name AS category, ${catalogFormSql} AS form, ${catalogOriginSql} AS origin, p.flavour
        FROM "Product" p JOIN "Category" c ON c.id = p."categoryId"
        WHERE p.status = 'ACTIVE' AND p.market IN (${market}::"Market", 'BOTH'::"Market")
    ) SELECT
      COALESCE((SELECT array_agg(DISTINCT category ORDER BY category) FROM visible), ARRAY[]::text[]) AS category,
      COALESCE((SELECT array_agg(DISTINCT form ORDER BY form) FROM visible), ARRAY[]::text[]) AS form,
      COALESCE((SELECT array_agg(DISTINCT origin ORDER BY origin) FROM visible), ARRAY[]::text[]) AS origin,
      COALESCE((SELECT array_agg(DISTINCT value ORDER BY value) FROM visible, unnest(flavour) value), ARRAY[]::text[]) AS flavour`;
}

// Legacy lists keep their full payload and id cursor, but all filters now apply
// before ranking. Seek against an anchor row avoids hydrating a capped 500-row
// catalogue merely to return one page. A deleted/stale id restarts as before.
export function buildLegacyProductPageQuery(filters: ProductFilterInput, market: Market) {
    const parts: Prisma.Sql[] = [Prisma.sql`p.status = 'ACTIVE' AND p.market IN (${market}::"Market", 'BOTH'::"Market")`];
    if (filters.category) parts.push(Prisma.sql`c.slug = ${filters.category}`);
    if (filters.featured !== undefined) parts.push(Prisma.sql`p.featured = ${filters.featured}`);
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        parts.push(Prisma.sql`EXISTS (SELECT 1 FROM "Variant" v WHERE v."productId" = p.id
            AND v.market IN (${market}::"Market", 'BOTH'::"Market")
            AND v.currency = ${market === 'LOCAL' ? 'LKR' : 'USD'}::"Currency"
            ${filters.minPrice !== undefined ? Prisma.sql`AND v.price >= ${filters.minPrice}` : Prisma.empty}
            ${filters.maxPrice !== undefined ? Prisma.sql`AND v.price <= ${filters.maxPrice}` : Prisma.empty})`);
    }
    let key: Prisma.Sql;
    if (filters.search) {
        parts.push(Prisma.sql`p."searchVector" @@ plainto_tsquery('english', ${filters.search})`);
        key = Prisma.sql`ts_rank(p."searchVector", plainto_tsquery('english', ${filters.search}))`;
    } else if (filters.sort === 'price_asc' || filters.sort === 'price_desc') {
        key = Prisma.sql`COALESCE((SELECT MIN(v.price) FROM "Variant" v WHERE v."productId" = p.id
          AND v.market IN (${market}::"Market", 'BOTH'::"Market")
          AND v.currency = ${market === 'LOCAL' ? 'LKR' : 'USD'}::"Currency"), 999999999999)`;
    } else if (filters.sort === 'bestselling') {
        key = Prisma.sql`(SELECT COUNT(*) FROM "OrderItem" oi WHERE oi."productId" = p.id)`;
    } else key = Prisma.sql`EXTRACT(EPOCH FROM p."createdAt")`;
    const ascending = !filters.search && filters.sort === 'price_asc';
    const direction = ascending ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const comparison = ascending ? Prisma.sql`>` : Prisma.sql`<`;
    return Prisma.sql`WITH ordered AS (
        SELECT p.id, ${key} AS key FROM "Product" p JOIN "Category" c ON c.id = p."categoryId"
        WHERE ${Prisma.join(parts, ' AND ')}
    ) SELECT page.id FROM ordered page
      ${filters.cursor ? Prisma.sql`WHERE NOT EXISTS (SELECT 1 FROM ordered WHERE id = ${filters.cursor})
        OR page.key ${comparison} (SELECT key FROM ordered WHERE id = ${filters.cursor})
        OR (page.key = (SELECT key FROM ordered WHERE id = ${filters.cursor}) AND page.id > ${filters.cursor})` : Prisma.empty}
      ORDER BY page.key ${direction}, page.id ASC LIMIT ${filters.limit + 1}`;
}

export function buildCardImagesQuery(ids: string[]) {
    return Prisma.sql`SELECT p.id AS "productId", image.id, image.url, image."altText", image.position
        FROM "Product" p JOIN LATERAL (
            SELECT i.id, i.url, i."altText", i.position FROM "ProductImage" i
            WHERE i."productId" = p.id
              AND i.url <> ('https://res.cloudinary.com/aranya/image/upload/products/' || p.slug || '.jpg')
              AND i.url NOT IN ('https://res.cloudinary.com/demo/image/upload/cinnamon.jpg',
                'https://res.cloudinary.com/demo/image/upload/pepper.jpg', 'https://res.cloudinary.com/demo/image/upload/tea.jpg')
            ORDER BY i.position ASC, i.id ASC LIMIT 1
        ) image ON true WHERE p.id IN (${Prisma.join(ids)})`;
}


export function buildProductNameLookupQuery(names: string[], market: Market) {
    return Prisma.sql`SELECT DISTINCT ON (p.name) p.id, p.name FROM "Product" p
      WHERE p.status = 'ACTIVE' AND p.market IN (${market}::"Market", 'BOTH'::"Market")
        AND p.name IN (${Prisma.join(names)}) ORDER BY p.name ASC, p.id ASC`;
}

export function buildCategorySummaryQueries(market: Market) {
    return { groups: Prisma.sql`
            SELECT c.name, COUNT(p.id)::int AS count,
              ARRAY(SELECT sample.id FROM "Product" sample JOIN "Category" sample_category ON sample_category.id = sample."categoryId"
                WHERE sample_category.name = c.name AND sample.status = 'ACTIVE'
                  AND sample.market IN (${market}::"Market", 'BOTH'::"Market")
                ORDER BY sample.featured DESC, sample."createdAt" DESC, sample.id ASC LIMIT 3) AS ids
            FROM "Category" c LEFT JOIN "Product" p ON p."categoryId" = c.id AND p.status = 'ACTIVE'
              AND p.market IN (${market}::"Market", 'BOTH'::"Market")
            GROUP BY c.name ORDER BY c.name ASC`, flavours: Prisma.sql`
            WITH tags AS (SELECT p.id, value AS name, p.featured, p."createdAt"
              FROM "Product" p CROSS JOIN LATERAL (SELECT DISTINCT unnest(p.flavour) AS value) tag
              WHERE p.status = 'ACTIVE' AND p.market IN (${market}::"Market", 'BOTH'::"Market"))
            SELECT name, COUNT(*)::int AS count,
              (array_agg(id ORDER BY featured DESC, "createdAt" DESC, id ASC))[1] AS id
            FROM tags GROUP BY name ORDER BY name ASC` };
}

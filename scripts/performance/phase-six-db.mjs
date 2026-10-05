// Bounded public-catalog diagnostics only; never imports index.ts, writes data,
// starts jobs, changes hosting, or replaces the frozen catalog fixture.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const req = createRequire(path.join(root, 'backend/package.json'));
req('dotenv').config({ path: path.join(root, 'backend/.env'), quiet: true });
const { neon } = req('@neondatabase/serverless');
const { tsImport } = await import(pathToFileURL(req.resolve('tsx/esm/api')).href);
const builders = await tsImport(pathToFileURL(path.join(root, 'backend/src/services/catalog-query.ts')).href, import.meta.url);
const output = path.join(root, 'artifacts/performance/phase-six-database');
fs.mkdirSync(output, { recursive: true });
const expectedIndexes = ['Product_searchVector_idx', 'Product_name_trgm_idx', 'OrderItem_orderId_idx',
  'OrderItem_productId_idx', 'OrderItem_variantId_idx', 'OrderEvent_orderId_idx', 'ProductImage_productId_idx', 'Order_couponId_idx'];
const report = { capturedAt: new Date().toISOString(), status: 'running', databaseAccess: 'READ ONLY',
  statementTimeoutMs: 5000, requestTimeoutMs: 20000,
  limits: 'Tiny current public catalog from a local workstation; HTTP driver timings are not API Prisma/WebSocket timings, representative staging load, or verified provider cold starts.' };
let stage = 'configuration';
try {
  const endpoint = new URL(process.env.DATABASE_URL);
  report.endpoint = { provider: endpoint.hostname.endsWith('.neon.tech') ? 'Neon' : 'other',
    regionFromHostname: endpoint.hostname.match(/\.([a-z]{2}-[a-z]+-\d)\./)?.[1] ?? 'unknown',
    pooledHostname: endpoint.hostname.includes('-pooler.') };
  const sql = neon(process.env.DATABASE_URL);
  const run = async (text, values = []) => {
    const start = performance.now();
    const result = await sql.transaction([
      sql`SELECT set_config('statement_timeout', '5000', true)`, sql.query(text, values),
    ], { readOnly: true, isolationLevel: 'RepeatableRead', fetchOptions: { signal: AbortSignal.timeout(20000) } });
    return { rows: result[1], roundTripMs: Math.round((performance.now() - start) * 10) / 10 };
  };
  const query = q => run(q.text, q.values);
  stage = 'metadata';
  report.select1Ms = [];
  for (let i = 0; i < 6; i++) report.select1Ms.push((await run('SELECT 1')).roundTripMs);
  report.timingLabel = 'First request in this fresh local script, followed by five sequential warm requests. Database suspension/activation was not controlled.';
  report.databaseSettings = (await run(`SELECT current_setting('transaction_read_only') AS read_only,
    current_setting('statement_timeout') AS statement_timeout, current_setting('max_connections') AS max_connections,
    current_setting('server_version') AS postgres_version, pg_is_in_recovery() AS is_read_replica`)).rows[0];
  report.migrations = (await run('SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name')).rows;
  const localMigrations = fs.readdirSync(path.join(root, 'backend/prisma/migrations')).filter(n => fs.statSync(path.join(root, 'backend/prisma/migrations', n)).isDirectory());
  report.unappliedLocalMigrations = localMigrations.filter(n => !report.migrations.some(m => m.migration_name === n && m.finished_at && !m.rolled_back_at));
  report.unfinishedMigrations = report.migrations.filter(m => !m.finished_at && !m.rolled_back_at).map(m => m.migration_name);
  report.indexes = (await run(`SELECT t.relname AS table_name, i.relname AS index_name,
    x.indisvalid AS valid, x.indisready AS ready, pg_get_indexdef(i.oid) AS definition
    FROM pg_index x JOIN pg_class t ON t.oid=x.indrelid JOIN pg_class i ON i.oid=x.indexrelid
    JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public'
    AND t.relname IN ('Product','Variant','Review','OrderItem','OrderEvent','ProductImage','Order','Category') ORDER BY i.relname`)).rows;
  report.missingOrInvalidExpectedIndexes = expectedIndexes.filter(name => !report.indexes.some(i => i.index_name === name && i.valid && i.ready));
  report.extensions = (await run("SELECT extname FROM pg_extension WHERE extname='pg_trgm'")).rows;
  report.searchTrigger = (await run(`SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid='"Product"'::regclass AND tgname='product_search_vector_update'`)).rows;
  report.publicCounts = (await run(`SELECT COUNT(*)::int AS active_products,
    COUNT(*) FILTER (WHERE "searchVector" IS NULL)::int AS active_products_missing_search_vector
    FROM "Product" WHERE status='ACTIVE'`)).rows[0];
  assert.ok(report.publicCounts.active_products <= 1000, 'Current catalog exceeds diagnostic traversal safety cap; use representative staging investigation separately');
  const revisionQuery = `SELECT md5(COALESCE(string_agg(id || ':' || "updatedAt"::text, ',' ORDER BY id), '')) AS revision FROM "Product" WHERE status='ACTIVE'`;
  const beforeRevision = (await run(revisionQuery)).rows[0].revision;
  const defaults = { limit: 2, categoryName: [], form: [], origin: [], flavour: [], sort: 'featured' };
  report.plans = [];
  report.paginationChecks = [];
  const explain = async (label, q) => {
    const result = await run('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + q.text, q.values);
    report.plans.push({ label, roundTripMs: result.roundTripMs, plan: result.rows[0]['QUERY PLAN'] });
  };
  stage = 'catalog SQL';
  report.legacyPaginationChecks = [];
  for (const market of ['LOCAL', 'INTERNATIONAL']) {
    const categoryQueries=builders.buildCategorySummaryQueries(market);
    await explain(market+'-actual-category-samples',categoryQueries.groups);
    await explain(market+'-actual-flavour-samples',categoryQueries.flavours);
    const facets = (await query(builders.buildCatalogFacetsQuery(market))).rows[0];
    report[market + 'Facets'] = facets;
    await explain(market + '-facets', builders.buildCatalogFacetsQuery(market));
    for (const sort of ['featured', 'best', 'price-asc', 'price-desc', 'rating', 'new']) {
      stage = 'catalog SQL ' + market + ' ' + sort;
      const filters = { ...defaults, sort };
      const reference = (await query(builders.buildCatalogPageQuery({ ...filters, limit: 1000 }, market))).rows;
      const total = (await query(builders.buildCatalogCountQuery(filters, market))).rows[0].total;
      assert.equal(reference.length, total);
      if(sort==='featured'&&reference.length)await explain(market+'-card-primary-images',builders.buildCardImagesQuery(reference.slice(0,2).map(r=>r.id)));
      const gathered = [];
      let cursor;
      for (let page = 0; page <= 500; page++) {
        const rows = (await query(builders.buildCatalogPageQuery({ ...filters, cursor }, market))).rows;
        const visible = rows.slice(0, filters.limit);
        gathered.push(...visible);
        if (rows.length <= filters.limit) break;
        assert.ok(page < 500, 'Pagination exceeded diagnostic safety cap');
        const last = visible.at(-1);
        cursor = builders.encodeCatalogCursor(last.id, last.key, filters, market, last.priority, last.secondary);
      }
      report.currentCheck = { market, sort, gatheredKeys: gathered.map(r => r.key), referenceKeys: reference.map(r => r.key), gatheredCount: gathered.length, total };
      assert.deepEqual(gathered.map(r => r.id), reference.map(r => r.id));
      assert.equal(new Set(gathered.map(r => r.id)).size, total);
      report.paginationChecks.push({ market, sort, pageSize: 2, total, pages: Math.max(1, Math.ceil(total / 2)), passed: true });
      await explain(market + '-' + sort, builders.buildCatalogPageQuery(filters, market));
    }
    for (const field of ['category', 'form', 'origin', 'flavour']) {
      const value = facets[field]?.[0];
      if (!value) continue;
      const filters = { ...defaults, [field === 'category' ? 'categoryName' : field]: [value] };
      const rows = (await query(builders.buildCatalogPageQuery({ ...filters, limit: 1000 }, market))).rows;
      const total = (await query(builders.buildCatalogCountQuery(filters, market))).rows[0].total;
      assert.equal(rows.length, total);
      report.paginationChecks.push({ market, filter: field, total, passed: true });
      await explain(market + '-' + field + '-filter', builders.buildCatalogPageQuery(filters, market));
    }
    const search = { ...defaults, search: 'cinnamon' };
    await query(builders.buildCatalogPageQuery(search, market));
    await explain(market + '-search', builders.buildCatalogPageQuery(search, market));
    await explain(market + '-count', builders.buildCatalogCountQuery(defaults, market));
    for (const sort of ['newest','bestselling','price_asc','price_desc']) {
      const filters = {limit:2,sort};
      const reference = (await query(builders.buildLegacyProductPageQuery({...filters,limit:1000},market))).rows;
      const gathered=[];let cursor;
      for(let n=0;n<500;n++) {
        const rows=(await query(builders.buildLegacyProductPageQuery({...filters,cursor},market))).rows;
        gathered.push(...rows.slice(0,2));if(rows.length<=2)break;cursor=rows[1].id;
      }
      assert.deepEqual(gathered.map(r=>r.id),reference.map(r=>r.id));
      assert.equal(new Set(gathered.map(r=>r.id)).size,reference.length);
      report.legacyPaginationChecks.push({market,sort,total:reference.length,passed:true});
    }
    for(const filters of [{limit:2,sort:'price_asc',minPrice:0,maxPrice:10000},{limit:2,sort:'newest',category:'whole-spices',featured:true},{limit:2,sort:'newest',search:'cinnamon',minPrice:0,maxPrice:10000}]) {
      await query(builders.buildLegacyProductPageQuery(filters,market));
      await explain(market+'-legacy-filter-'+report.plans.length,builders.buildLegacyProductPageQuery(filters,market));
    }
  }
  await explain('autocomplete', { text: `SELECT id, name, slug FROM "Product" WHERE status='ACTIVE'
    AND market IN ($1::"Market", 'BOTH'::"Market") AND (name % $2 OR "searchVector" @@ plainto_tsquery('english',$2))
    ORDER BY similarity(name,$2) DESC LIMIT 5`, values: ['INTERNATIONAL', 'cinnamon'] });
  await explain('category-summary', { text: `SELECT c.id,c.name,c.slug,COUNT(p.id)::int AS count FROM "Category" c
    LEFT JOIN "Product" p ON p."categoryId"=c.id AND p.status='ACTIVE' AND p.market IN ($1::"Market",'BOTH'::"Market")
    GROUP BY c.id,c.name,c.slug ORDER BY c.name ASC`, values: ['INTERNATIONAL'] });
  assert.equal((await run(revisionQuery)).rows[0].revision, beforeRevision, 'Public catalog changed during diagnostic traversal');
  report.status = 'verified-current-small-catalog';
  delete report.currentCheck;
  report.catalogStableDuringRun = true;
  report.completedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, endpoint: report.endpoint, publicCounts: report.publicCounts,
    migrations: report.migrations.length, missingIndexes: report.missingOrInvalidExpectedIndexes,
    select1Ms: report.select1Ms, paginationChecks: report.paginationChecks.length, queryPlans: report.plans.length }));
} catch (error) {
  // Deliberately omit driver messages, query strings/values, URLs and stack traces.
  Object.assign(report, { status: 'unverified', failedStage: stage, errorType: error.name,
    reason: 'Read-only check did not complete; inspect the bounded diagnostic and source locally. No migration, write, or hosting change was attempted.' });
  fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(report, null, 2));
  console.error('Phase 6 read-only database diagnostic failed (' + error.name + ', ' + stage + ').');
  process.exitCode = 1;
}

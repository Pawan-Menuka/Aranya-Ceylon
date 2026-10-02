// Reads public data/metadata only. Does not import backend/index or start jobs.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const req = createRequire(path.join(root, 'backend/package.json'));
req('dotenv').config({ path: path.join(root, 'backend/.env'), quiet: true });
const { neon } = req('@neondatabase/serverless');
const output = path.join(root, 'artifacts/performance/database');
fs.mkdirSync(output, { recursive: true });
const expectedIndexes = [
  'Product_searchVector_idx', 'Product_name_trgm_idx', 'OrderItem_orderId_idx',
  'OrderItem_productId_idx', 'OrderItem_variantId_idx', 'OrderEvent_orderId_idx',
  'ProductImage_productId_idx', 'Order_couponId_idx',
];
try {
  const sql = neon(process.env.DATABASE_URL, { readOnly: true, fetchOptions: { signal: AbortSignal.timeout(20000) } });
  const start = performance.now();
  const [migrations, indexes, extensions, products, blogs, recipes, gifts, counts] = await sql.transaction([
    sql`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name`,
    sql`SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('Product','Variant','Review','OrderItem','OrderEvent','ProductImage','Order') ORDER BY indexname`,
    sql`SELECT extname FROM pg_extension WHERE extname IN ('pg_trgm')`,
    sql`SELECT to_jsonb(p) || jsonb_build_object(
      'category', (SELECT to_jsonb(c) FROM "Category" c WHERE c.id=p."categoryId"),
      'variants', COALESCE((SELECT jsonb_agg(to_jsonb(v) || jsonb_build_object('price',v.price::text) ORDER BY v.weight) FROM "Variant" v WHERE v."productId"=p.id),'[]'::jsonb),
      'images', COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.position) FROM "ProductImage" i WHERE i."productId"=p.id),'[]'::jsonb),
      'ratingAvg', COALESCE((SELECT round(avg(r.rating)::numeric,1) FROM "Review" r WHERE r."productId"=p.id AND r."moderationStatus"='APPROVED'),0),
      '_count', jsonb_build_object('reviews',(SELECT count(*) FROM "Review" r WHERE r."productId"=p.id),'orderItems',(SELECT count(*) FROM "OrderItem" o WHERE o."productId"=p.id))) AS value
      FROM "Product" p WHERE status='ACTIVE' ORDER BY p.slug LIMIT 100`,
    sql`SELECT jsonb_build_object('id',id,'title',title,'slug',slug,'content',content,'tags',tags,'status',status,'publishedAt',"publishedAt",'seoTitle',"seoTitle",'seoDesc',"seoDesc",'viewCount',"viewCount") AS value FROM "Blog" WHERE status='PUBLISHED' ORDER BY slug LIMIT 50`,
    sql`SELECT to_jsonb(r) AS value FROM "Recipe" r WHERE status='PUBLISHED' ORDER BY slug LIMIT 100`,
    sql`SELECT to_jsonb(g) AS value FROM "GiftSet" g WHERE status='PUBLISHED' ORDER BY slug LIMIT 100`,
    sql`SELECT 'activeProducts' AS kind,count(*)::int AS count FROM "Product" WHERE status='ACTIVE' UNION ALL SELECT 'publishedBlogs',count(*)::int FROM "Blog" WHERE status='PUBLISHED' UNION ALL SELECT 'publishedRecipes',count(*)::int FROM "Recipe" WHERE status='PUBLISHED'`,
  ], { readOnly: true, isolationLevel: 'RepeatableRead' });
  const times = [];
  for (let i=0;i<5;i++) { const t=performance.now(); await sql.transaction([sql`SELECT 1`], {readOnly:true}); times.push(Math.round(performance.now()-t)); }
  const report = {
    capturedAt: new Date().toISOString(), databaseAccess:'READ ONLY', snapshotMs: Math.round(performance.now()-start),
    readOnlySelect1Ms: times, migrations, indexes, extensions, publicCounts: counts,
    expectedIndexes, missingIndexes: expectedIndexes.filter(n=>!indexes.some(i=>i.indexname===n)),
    unfinishedMigrations:migrations.filter(m=>!m.finished_at&&!m.rolled_back_at).map(m=>m.migration_name),
    localMigrationNames: fs.readdirSync(path.join(root,'backend/prisma/migrations')).filter(n=>fs.statSync(path.join(root,'backend/prisma/migrations',n)).isDirectory()),
    limits:'Catalog snapshot and SELECT 1 timings; not production API latency or an EXPLAIN/query-load test.'
  };
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(report,null,2));
  const fixture = {capturedAt:report.capturedAt,source:'read-only public database snapshot',products:products.map(r=>r.value),blogs:blogs.map(r=>r.value),recipes:recipes.map(r=>r.value),gifts:gifts.map(r=>r.value)};
  fs.mkdirSync(path.join(root,'scripts/performance/fixtures'),{recursive:true});
  fs.writeFileSync(path.join(root,'scripts/performance/fixtures/catalog.json'),JSON.stringify(fixture,null,2));
  console.log(JSON.stringify({publicCounts:counts,missingIndexes:report.missingIndexes,unfinishedMigrations:report.unfinishedMigrations,readOnlySelect1Ms:times}));
} catch (error) {
  // Never print raw connection errors, URLs, database credentials or provider request headers.
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({capturedAt:new Date().toISOString(),status:'unverified',errorType:error.name,reason:'Read-only database check could not complete. No migrations or writes were attempted.'},null,2));
  console.error('Read-only database check did not complete ('+error.name+'). See artifacts/performance/database/checks.json.');
  process.exitCode=1;
}

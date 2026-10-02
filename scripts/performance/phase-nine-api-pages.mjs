// Disposable local PostgreSQL only. Never reads .env or accepts a database URL.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { randomUUID, randomInt, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const base = path.join(root, 'artifacts/performance/phase-nine-api-pages');
const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID();
const runDir = path.join(base, runId), data = path.join(runDir, 'data');
fs.mkdirSync(runDir, { recursive: true });
const migrationPath = path.join(root, 'backend/prisma/migrations/20261002000000_restore_product_search_vector/migration.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');
const req = createRequire(path.join(root, 'backend/package.json'));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^PG/i.test(key) && !/^(DATABASE_URL|DIRECT_URL|DIRECT_DATABASE_URL|PRISMA_DATABASE_URL)$/i.test(key)));
// Preserve the verified tool directory before stripping ambient PG connection variables.
const pgBin = process.env.PG_BIN;
const binary = name => pgBin ? path.join(pgBin, name + (process.platform === 'win32' ? '.exe' : '')) : name;
const report = { capturedAt: new Date().toISOString(), runId, databaseAccess: 'WRITE: owned disposable loopback cluster only',
  fixture: 'Full chronological SQL migrations plus 625 synthetic rows per resource; actual PrismaPg binding/hydration; no real database, .env, seed or API server',
  migrationSha256: createHash('sha256').update(migration).digest('hex'),
  harnessSha256: createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex'),
  queryBuilderSha256: createHash('sha256').update(fs.readFileSync(path.join(root, 'backend/src/services/catalog-query.ts'))).digest('hex'),
  checks: [], status: 'running' };
let prismaClient;
let port, started = false, startAttempted = false, stage = 'binaries', operation = 0;
const persist = () => {
  fs.writeFileSync(path.join(runDir, 'checks.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(base, 'latest.json'), JSON.stringify({ runId, checks: path.relative(root, path.join(runDir, 'checks.json')).replaceAll('\\', '/') }, null, 2));
};
function command(name, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary(name), args, { cwd: root, env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    const timeout = setTimeout(() => child.kill(), 60000);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    // On Windows pg_ctl's server can inherit pipe handles after pg_ctl exits.
    // Waiting for pipe closure would hang until that server stops.
    child.once(name === 'pg_ctl' ? 'exit' : 'close', code => {
      clearTimeout(timeout);
      if (name === 'pg_ctl') { child.stdout.destroy(); child.stderr.destroy(); }
      if (code === 0) resolve(stdout.trim());
      else {
        // Inputs and logs contain only this synthetic fixture; no ambient connection settings.
        fs.writeFileSync(path.join(runDir, 'failed-command.log'), stdout + '\n' + stderr);
        reject(new Error(`${name} failed (${code}); see disposable run failed-command.log`));
      }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}
function literal(value) {
  if (value === null) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') { assert(Number.isFinite(value)); return String(value); }
  assert.equal(typeof value, 'string', 'Only fixture scalar query values are supported');
  return "'" + value.replaceAll("'", "''") + "'";
}
function executable(query) {
  // Executes actual generated query text with escaped synthetic literals. This is
  // SQL-semantic coverage, not Prisma/Neon parameter-binding or hydration coverage.
  return query.text.replace(/\$(\d+)/g, (_, n) => {
    assert(Number(n) <= query.values.length); return literal(query.values[Number(n) - 1]);
  });
}
const normalize = value => path.resolve(value).replaceAll('\\', '/').toLowerCase();
function ownershipGuard() {
  return `DO $$ BEGIN IF lower(replace(current_setting('data_directory'), chr(92), '/')) <> ${literal(normalize(data))}
    OR inet_server_addr() <> '127.0.0.1'::inet OR inet_server_port() <> ${port}
    THEN RAISE EXCEPTION 'Refusing SQL: cluster ownership mismatch'; END IF; END $$;`;
}
async function sql(text, label = 'sql', database = 'postgres') {
  assert(started && port >= 49152 && port <= 65535);
  assert(['postgres', 'phase_eight_full_chain', 'phase_nine_integration'].includes(database), 'Only databases owned by this new cluster are allowed');
  const body = `SET statement_timeout = '10s'; SET lock_timeout = '3s'; SET standard_conforming_strings = on;\n${ownershipGuard()}\nDO $$ BEGIN IF current_database() <> ${literal(database)} THEN RAISE EXCEPTION 'Database ownership mismatch'; END IF; END $$;\n${text}`;
  const file = path.join(runDir, `${String(++operation).padStart(3, '0')}-${label.replace(/[^a-z0-9-]/gi, '-')}.sql`);
  fs.writeFileSync(file, body);
  return command('psql', ['-X', '--no-password', '-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1', '-qAt', '-f', file]);
}
async function rows(text, label, database = 'postgres') {
  return JSON.parse(await sql(`SELECT COALESCE(json_agg(result), '[]'::json) FROM (${text}) result;`, label, database));
}
const check = (name, evidence = {}) => report.checks.push({ name, passed: true, ...evidence });
const vector = `setweight(to_tsvector('english', COALESCE(name, '')), 'A') || setweight(to_tsvector('english', COALESCE(description, '')), 'B')`;
async function reservePort() {
  for (let attempt = 0; attempt < 30; attempt++) {
    const candidate = randomInt(49152, 65536), probe = net.createServer();
    const available = await new Promise(resolve => { probe.once('error', () => resolve(false)); probe.listen(candidate, '127.0.0.1', () => probe.close(() => resolve(true))); });
    if (available) return candidate;
  }
  throw new Error('No free loopback high port');
}
try {
  assert.equal(process.argv.length, 2, 'This harness accepts no database URL or command-line arguments');
  report.binaryVersions = {};
  for (const name of ['initdb', 'pg_ctl', 'psql']) report.binaryVersions[name] = await command(name, ['--version']);
  stage = 'initialize owned cluster';
  await command('initdb', ['-D', data, '-U', 'postgres', '--auth-local=trust', '--auth-host=trust', '--encoding=UTF8', '--locale=C']);
  port = await reservePort();
  fs.appendFileSync(path.join(data, 'postgresql.conf'), `\nlisten_addresses = '127.0.0.1'\nport = ${port}\nmax_connections = 10\nshared_buffers = '16MB'\n` + (process.platform === 'win32' ? '' : `unix_socket_directories = ''\n`));
  startAttempted = true;
  await command('pg_ctl', ['-D', data, '-l', path.join(runDir, 'postgres.log'), '-w', '-t', '20', 'start']);
  started = true;
  report.ownership = (await rows(`SELECT current_setting('server_version') AS server_version, inet_server_addr()::text AS address,
    inet_server_port() AS port, current_setting('data_directory') AS data_directory`, 'ownership'))[0];
  check('Loopback instance ownership verified', { address: report.ownership.address, port });
  await sql('CREATE DATABASE phase_nine_integration;', 'create-integration-database');
  stage = 'full chronological migrations';
  report.migrations = [];
  const migrationsRoot = path.join(root, 'backend/prisma/migrations');
  for (const name of fs.readdirSync(migrationsRoot, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()) {
    const source = fs.readFileSync(path.join(migrationsRoot, name, 'migration.sql'));
    const entry = { name, sha256: createHash('sha256').update(source).digest('hex'), status: 'running' };
    report.migrations.push(entry); persist();
    await sql(`BEGIN;\n${source.toString('utf8')}\nCOMMIT;`, 'migration-' + name, 'phase_nine_integration');
    entry.status = 'passed';
  }
  check('Full migration SQL replay in the owned cluster', { files: report.migrations.length });
  stage = '625-row full-schema fixtures';
  await sql(`
INSERT INTO "User" (id,name,email,"passwordHash",role,"updatedAt") VALUES ('fixture-admin','Admin Fixture','admin@example.invalid','synthetic-not-a-login','ADMIN','2026-10-02');
INSERT INTO "Category" (id,name,slug) VALUES ('whole','Whole Spices','whole'),('rare','Rare','rare');
INSERT INTO "Product" (id,name,slug,description,"categoryId",certifications,status,market,latin,"originLabel",flavour,"createdAt","updatedAt")
SELECT 'p'||lpad(i::text,4,'0'), 'Cinnamon ground '||i, 'fixture-product-'||i, 'Velvet warming spice',
CASE WHEN i>620 THEN 'rare' ELSE 'whole' END, ARRAY[]::text[],
CASE WHEN i<=600 THEN 'ACTIVE' ELSE 'DRAFT' END::"ProductStatus",
CASE WHEN i BETWEEN 581 AND 590 THEN 'LOCAL' WHEN i BETWEEN 591 AND 600 THEN 'INTERNATIONAL' ELSE 'BOTH' END::"Market",
'Cinnamomum verum','Sri Lanka',ARRAY['Warm'],'2026-10-02','2026-10-02' FROM generate_series(1,625) i;
INSERT INTO "Variant" (id,"productId",weight,price,sku,stock,market,currency)
SELECT 'vl'||lpad(i::text,4,'0'),'p'||lpad(i::text,4,'0'),100,(i%7)+2.25,'SKU-'||lpad(i::text,4,'0'),
CASE WHEN i%25=0 THEN 0 ELSE 50 END,'LOCAL','LKR' FROM generate_series(1,624) i;
INSERT INTO "Variant" (id,"productId",weight,price,sku,stock,market,currency)
SELECT 'vu'||lpad(i::text,4,'0'),'p'||lpad(i::text,4,'0'),100,(i%7)+0.25,'USD-'||lpad(i::text,4,'0'),50,'INTERNATIONAL','USD' FROM generate_series(1,624) i;
INSERT INTO "Variant" (id,"productId",weight,price,sku,stock,market,currency)
SELECT 've'||lpad(i::text,4,'0'),'p'||lpad(i::text,4,'0'),50,0.01,'EUR-'||lpad(i::text,4,'0'),50,'INTERNATIONAL','EUR' FROM generate_series(1,624) i;
INSERT INTO "ProductImage" (id,"productId",url,position) SELECT 'image'||i,'p'||lpad(i::text,4,'0'),'https://fixture.invalid/'||i||'.jpg',0 FROM generate_series(1,625) i;
INSERT INTO "Review" (id,"productId","userId","orderId",rating,title,body,"moderationStatus")
SELECT 'review'||i,'p'||lpad(i::text,4,'0'),'fixture-admin','synthetic-order-'||i,(i%5)+1,'Fixture','Synthetic fixture','APPROVED' FROM generate_series(1,625) i;
INSERT INTO "Review" (id,"productId","userId","orderId",rating,title,body,"moderationStatus")
SELECT 'pending'||i,'p'||lpad(i::text,4,'0'),'fixture-admin','synthetic-pending-'||i,5,'Fixture','Pending hidden fixture','PENDING' FROM generate_series(1,625) i;
INSERT INTO "Blog" (id,title,slug,content,"authorId",tags,status,"publishedAt","seoDesc","createdAt","updatedAt")
SELECT 'b'||lpad(i::text,4,'0'),'Cinnamon Journal '||i,'fixture-journal-'||i,repeat('SYNTHETIC BODY ',100),'fixture-admin',ARRAY['Warm'],
CASE WHEN i<=600 THEN 'PUBLISHED' ELSE 'DRAFT' END::"BlogStatus",'2026-10-02','Warm spice journal','2026-10-02','2026-10-02' FROM generate_series(1,625) i;
INSERT INTO "Recipe" (id,title,slug,dek,course,intro,spices,ingredients,method,tips,status,"createdAt","updatedAt")
SELECT 'r'||lpad(i::text,4,'0'),'Cinnamon Recipe '||i,'fixture-recipe-'||i,'Synthetic dek','Curries & Mains','Synthetic intro',ARRAY['Cinnamon'],'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,
CASE WHEN i<=600 THEN 'PUBLISHED' ELSE 'DRAFT' END::"BlogStatus",'2026-10-02','2026-10-02' FROM generate_series(1,625) i;
INSERT INTO "GiftSet" (id,slug,name,featured,tagline,blurb,usd,lkr,contents,status,"createdAt","updatedAt")
SELECT 'g'||lpad(i::text,4,'0'),'fixture-gift-'||i,'Cinnamon Gift '||i,i%2=0,'Synthetic tagline','Synthetic blurb',10.25,2500,ARRAY['Cinnamon'],
CASE WHEN i<=600 THEN 'PUBLISHED' ELSE 'DRAFT' END::"BlogStatus",'2026-10-02','2026-10-02' FROM generate_series(1,625) i;
INSERT INTO "AuditLog" (id,"actorId",event,"targetType","targetId",diff,ip,"userAgent","createdAt")
SELECT 'a'||lpad(i::text,4,'0'),CASE WHEN i%25=0 THEN NULL ELSE 'fixture-admin' END,
CASE WHEN i%50=0 THEN 'ORDER_REFUND' ELSE 'ORDER_STATUS_UPDATE' END,'Order','fixture-order-'||lpad(i::text,6,'0'),'{"fixture":"synthetic note"}'::jsonb,'127.0.0.1','owned synthetic fixture','2026-10-02' FROM generate_series(1,625) i;
`, 'fixtures', 'phase_nine_integration');
  check('625 rows per list with tied timestamps, market/currency isolation, approved/pending ratings, large hidden journal bodies and rare late filters');
  stage = 'actual PrismaPg service imports';
  // dotenv/config has an explicit absent path; inherited URLs are removed before service imports.
  const dotenvPath = path.join(runDir, 'never-read.env');
  assert(!fs.existsSync(dotenvPath));
  for (const key of Object.keys(process.env)) if (/^PG/i.test(key) || /^(DATABASE_URL|DIRECT_URL|DIRECT_DATABASE_URL|PRISMA_DATABASE_URL)$/i.test(key)) delete process.env[key];
  Object.assign(process.env, { NODE_ENV: 'test', DATABASE_ADAPTER: 'pg', DATABASE_URL: `postgresql://postgres@127.0.0.1:${port}/phase_nine_integration`,
    DIRECT_URL: `postgresql://postgres@127.0.0.1:${port}/phase_nine_integration`, DOTENV_CONFIG_PATH: dotenvPath, PAYMENTS_MODE: 'stub', LOW_STOCK_THRESHOLD: '10' });
  const { tsImport } = await import(pathToFileURL(req.resolve('tsx/esm/api')).href);
  const shared = await import(pathToFileURL(path.join(root, 'shared/dist/index.js')).href);
  const admin = await tsImport(pathToFileURL(path.join(root, 'backend/src/services/admin-page.service.ts')).href, import.meta.url);
  const search = await tsImport(pathToFileURL(path.join(root, 'backend/src/services/search.service.ts')).href, import.meta.url);
  const cursorHelpers = await tsImport(pathToFileURL(path.join(root, 'backend/src/services/page-query.ts')).href, import.meta.url);
  const adminBuilders = await tsImport(pathToFileURL(path.join(root, 'backend/src/services/admin-page-query.ts')).href, import.meta.url);
  const searchBuilders = await tsImport(pathToFileURL(path.join(root, 'backend/src/services/search-query.ts')).href, import.meta.url);
  prismaClient = (await tsImport(pathToFileURL(path.join(root, 'backend/src/lib/prisma.ts')).href, import.meta.url)).prisma;
  const ownership = await prismaClient.$queryRaw`SELECT current_database() AS database, current_setting('data_directory') AS data, host(inet_server_addr()) AS host, inet_server_port() AS port`;
  assert.equal(ownership[0].database, 'phase_nine_integration'); assert.equal(normalize(ownership[0].data), normalize(data)); assert.equal(ownership[0].host, '127.0.0.1'); assert.equal(ownership[0].port, port);
  async function gatherAdmin(resource, extra = {}) {
    const schema = resource === 'products' ? shared.adminProductPageSchema : resource === 'audit' ? shared.adminAuditPageSchema : shared.adminContentPageSchema;
    const gathered = []; let cursor; let last;
    do {
      const filters = schema.parse({ view: 'page', limit: 100, ...extra, cursor });
      last = await admin.listAdminPage(resource, filters);
      const items = last[resource === 'audit' ? 'items' : resource];
      assert(items.length <= 100); gathered.push(...items);
      cursor = last.nextCursor;
      assert(gathered.length <= 1000, 'Finite cursor progress');
    } while (cursor);
    assert.equal(new Set(gathered.map(item => item.id)).size, gathered.length);
    assert.equal(gathered.length, last.total);
    return { items: gathered, total: last.total, counts: last.counts };
  }
  stage = 'admin full-list paging and global filters';
  for (const resource of ['products', 'blogs', 'recipes', 'gifts', 'audit']) {
    const result = await gatherAdmin(resource);
    assert.equal(result.total, 625);
    if (resource === 'products') { assert.equal(result.counts.Rare, 5); assert.equal(result.counts.low, 25); assert(result.items[0].description && result.items[0].variants); }
    else if (resource === 'audit') assert.deepEqual(result.counts, { all: 625, admin: 600, job: 25, warn: 12 });
    else { assert.equal(result.counts.PUBLISHED, 600); assert.equal(result.counts.DRAFT, 25); assert.equal(result.counts.all, 625); assert(!('content' in result.items[0])); }
    const raw = await prismaClient.$queryRaw(adminBuilders.buildAdminQueries(resource,
      (resource === 'products' ? shared.adminProductPageSchema : resource === 'audit' ? shared.adminAuditPageSchema : shared.adminContentPageSchema).parse({ view: 'page', limit: 100 })).page);
    assert.deepEqual(result.items.slice(0,100).map(item => item.id), raw.slice(0,100).map(item => item.id));
    check('Actual bound PrismaPg admin page/hydration covers all625 with no omissions or duplicates', { resource, total: result.total });
  }
  const rare = await gatherAdmin('products', { category: 'Rare', status: 'DRAFT' });
  assert.deepEqual(rare.items.map(item => item.id), ['p0621','p0622','p0623','p0624','p0625']); assert.equal(rare.counts.all, 25);
  const low = await gatherAdmin('products', { lowStock: 'true' }); assert.equal(low.total, 25); assert(low.items.some(item => item.id === 'p0625'));
  // The first displayed SKU is the 50g EUR variant on this fixture; search it globally.
  const sku = await gatherAdmin('products', { q: 'EUR-0624' }); assert.equal(sku.total, 1); assert.equal(sku.items[0].id, 'p0624');
  for (const resource of ['blogs','recipes','gifts']) {
    const result = await gatherAdmin(resource, { status: 'DRAFT', q: '625' });
    assert.equal(result.total, 1); assert.equal(result.items[0].id, ({ blogs:'b0625',recipes:'r0625',gifts:'g0625' })[resource]);
  }
  assert.equal((await gatherAdmin('audit', { filter: 'warn' })).total,12);
  assert.equal((await gatherAdmin('audit', { filter: 'job' })).total,25);
  assert.equal((await gatherAdmin('audit', { filter: 'admin' })).total,600);
  assert.equal((await gatherAdmin('audit', { q: 'Order AC-000625', filter: 'job' })).total,1);
  assert.equal((await gatherAdmin('audit', { q: 'order.refund', filter: 'warn' })).total,12);
  assert.equal((await gatherAdmin('audit', { q: 'synthetic note', actorId: 'fixture-admin' })).total,600);
  assert.equal((await gatherAdmin('audit', { event: 'ORDER_REFUND', targetType: 'Order', actorId: 'fixture-admin' })).total,0);
  check('Global category/status/lowStock/displayed SKU and audit actor/job/warn/action/target/metadata filters match late rows');
  stage = 'complete public search with independent resource cursors';
  async function gatherSearch(q, sort, market, resource = 'products') {
    const items = []; let cursor; let last;
    do {
      last = await search.searchPublic(shared.publicSearchSchema.parse({ q, sort, market, resource, limit: 100,
        ...(resource === 'products' ? { productCursor: cursor } : { journalCursor: cursor }) }), market);
      const result = last[resource]; items.push(...result.items); cursor = result.nextCursor;
      assert(items.length<=1000, 'Finite search cursor progress');
    } while(cursor);
    assert.equal(items.length, last[resource].total); assert.equal(new Set(items.map(item=>item.id)).size,items.length);
    return { ...last[resource], items };
  }
  for (const market of ['LOCAL','INTERNATIONAL']) for (const sort of ['relevance','price-asc','price-desc','rating']) {
    const result = await gatherSearch('warm cinn',sort,market);
    assert.equal(result.total,590);
    const expected = await prismaClient.$queryRaw(searchBuilders.buildSearchQueries(shared.publicSearchSchema.parse({q:'warm cinn',sort,limit:100}),market,'products').page);
    assert.deepEqual(result.items.slice(0,100).map(item=>item.id),expected.slice(0,100).map(item=>item.id));
    // Card hydration excludes full prose and private image/provider metadata.
    assert(!('description' in result.items[0])); assert(result.items[0].images.length===1);
    assert(result.items.every(item=>item.variants.every(v=>v.market===market||v.market==='BOTH')));
    if(sort==='price-asc'||sort==='price-desc') {
      const prices=result.items.map(item=>Number(item.variants.find(v=>v.weight===100&&v.currency===(market==='LOCAL'?'LKR':'USD'))?.price??0));
      const display=market==='LOCAL'?prices.map(Math.round):prices;
      assert.deepEqual(display,[...display].sort((a,b)=>sort==='price-asc'?a-b:b-a));
      assert(display.every(price=>price>=0.25));
    }
    if(sort==='rating') assert.deepEqual(result.items.map(item=>item.ratingAvg),result.items.map(item=>item.ratingAvg).sort((a,b)=>b-a));
    check('All matching public cards reachable with stable numeric price/rating/relevance ties and currency isolation', {market,sort,total:result.total});
  }
  const description = await gatherSearch('velv warm','relevance','LOCAL'); assert.equal(description.total,590);
  const metadata = await gatherSearch('verum sri','relevance','LOCAL'); assert.equal(metadata.total,590);
  const journal = await gatherSearch('warm cinn','relevance','LOCAL','journal'); assert.equal(journal.total,600); assert(!('content' in journal.items[0]));
  const fixedAuthor = await gatherSearch('aranya cey','relevance','LOCAL','journal'); assert.equal(fixedAuthor.total,600);
  const empty = await search.searchPublic(shared.publicSearchSchema.parse({}), 'LOCAL'); assert.equal(empty.products.total,0); assert.equal(empty.journal.total,0);
  const initial = await search.searchPublic(shared.publicSearchSchema.parse({q:'warm cinn'}),'LOCAL');
  assert.equal(initial.products.items.length,20); assert.equal(initial.products.total,590); assert.equal(initial.journal.items.length,20); assert.equal(initial.journal.total,600);
  const productScope = searchBuilders.searchIdentity(shared.publicSearchSchema.parse({q:'warm cinn'}),'LOCAL','products');
  const badCursor = initial.products.nextCursor;
  for(const input of [{q:'other',productCursor:badCursor},{q:'warm cinn',sort:'rating',productCursor:badCursor},{q:'warm cinn',journalCursor:badCursor}]) {
    await assert.rejects(()=>search.searchPublic(shared.publicSearchSchema.parse(input),'LOCAL'),error=>error.status===400);
  }
  await assert.rejects(()=>search.searchPublic(shared.publicSearchSchema.parse({q:'warm cinn',productCursor:badCursor}),'INTERNATIONAL'),error=>error.status===400);
  assert.equal(cursorHelpers.decodePageCursor(badCursor,productScope,4).id,initial.products.items.at(-1).id);
  const continued=await search.searchPublic(shared.publicSearchSchema.parse({q:'warm cinn',resource:'products',productCursor:badCursor}),'LOCAL');
  assert(!continued.products.items.some(item=>initial.products.items.some(first=>first.id===item.id))); assert.equal(continued.journal.total,600); assert.equal(continued.journal.items.length,0);
  const injection=await search.searchPublic(shared.publicSearchSchema.parse({q:"'); DROP TABLE Product;--"}),'LOCAL'); assert.equal(injection.products.total,0);
  check('Partial description and literal metadata multi-token matches, fixed public journal author, empty-query guard, accurate20-result first pages, scoped cursor rejection and injection binding');
  report.sources = Object.fromEntries(['shared/src/schemas/page.schema.ts','backend/src/services/page-query.ts','backend/src/services/admin-page-query.ts','backend/src/services/admin-page.service.ts','backend/src/services/search-query.ts','backend/src/services/search.service.ts'].map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.failedStage = stage; report.errorType = error.name;
  report.reason = String(error.message).replaceAll(root, '<workspace>');
  console.error(`Phase 9 disposable PostgreSQL failed at ${stage}: ${report.reason}`);
  process.exitCode = 1;
} finally {
  if (prismaClient) { try { await prismaClient.$disconnect(); } catch { process.exitCode = 1; } }
  // A timed-out startup can have launched the owned server before reporting failure.
  if (process.env.PHASE9_KEEP_CLUSTER === 'true' && report.status === 'passed') {
    report.clusterRetained = true;
  } else if (started || (startAttempted && fs.existsSync(path.join(data, 'postmaster.pid')))) {
    try {
      assert(normalize(data).startsWith(normalize(runDir) + '/') && path.dirname(runDir) === base);
      await command('pg_ctl', ['-D', data, '-w', '-t', '20', '-m', 'fast', 'stop']);
      report.clusterStopped = true;
    } catch (error) { report.clusterStopped = false; report.cleanupErrorType = error.name; process.exitCode = 1; }
  }
  report.localTestDatabase = { host: '127.0.0.1', port, database: 'phase_nine_integration', user: 'postgres', dataDirectory: data, runDirectory: runDir };
  report.completedAt = new Date().toISOString(); persist();
  console.log(`Phase 9: ${report.status}; ${report.checks.length} checks; owned cluster stopped=${report.clusterStopped ?? 'not-started'}. Report: ${path.relative(root, path.join(runDir, 'checks.json'))}`);
}

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
const base = path.join(root, 'artifacts/performance/phase-eight-search-repair');
const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID();
const runDir = path.join(base, runId), data = path.join(runDir, 'data');
fs.mkdirSync(runDir, { recursive: true });
const migrationPath = path.join(root, 'backend/prisma/migrations/20261002000000_restore_product_search_vector/migration.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');
const req = createRequire(path.join(root, 'backend/package.json'));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^PG/i.test(key) && !/^(DATABASE_URL|DIRECT_URL|DIRECT_DATABASE_URL|PRISMA_DATABASE_URL)$/i.test(key)));
const binary = name => process.env.PG_BIN ? path.join(process.env.PG_BIN, name + (process.platform === 'win32' ? '.exe' : '')) : name;
const report = { capturedAt: new Date().toISOString(), runId, databaseAccess: 'WRITE: owned disposable loopback cluster only',
  fixture: 'Full chronological migration SQL replay in a separate owned database, then minimal drift fixture; no real database, .env, seed or API server',
  migrationSha256: createHash('sha256').update(migration).digest('hex'),
  harnessSha256: createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex'),
  queryBuilderSha256: createHash('sha256').update(fs.readFileSync(path.join(root, 'backend/src/services/catalog-query.ts'))).digest('hex'),
  checks: [], status: 'running' };
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
  assert(['postgres', 'phase_eight_full_chain'].includes(database), 'Only databases owned by this new cluster are allowed');
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
  stage = 'full chronological migration SQL chain';
  const fullDatabase = 'phase_eight_full_chain';
  await sql(`CREATE DATABASE ${fullDatabase};`, 'create-full-chain-database');
  const migrationsRoot = path.join(root, 'backend/prisma/migrations');
  const chronological = fs.readdirSync(migrationsRoot, { withFileTypes: true }).filter(item => item.isDirectory()).map(item => item.name).sort();
  assert(chronological.includes('20261002000000_restore_product_search_vector'));
  report.fullMigrationChain = { database: fullDatabase, status: 'running', transaction: 'One explicit BEGIN/COMMIT per unmodified migration SQL file; psql ON_ERROR_STOP',
    runnerLimit: 'Raw SQL replay, not Prisma migrate deploy or its _prisma_migrations bookkeeping/advisory locks', migrations: [] };
  for (const name of chronological) {
    const sourcePath = path.join(migrationsRoot, name, 'migration.sql');
    const sourceBytes = fs.readFileSync(sourcePath);
    const outcome = { name, sha256: createHash('sha256').update(sourceBytes).digest('hex'), status: 'running' };
    report.fullMigrationChain.migrations.push(outcome); persist();
    try {
      // Source SQL is copied byte-for-text without altering any statements; only
      // the ownership/time-limit/transaction wrapper is added around the file.
      await sql(`BEGIN;\n${sourceBytes.toString('utf8')}\nCOMMIT;`, 'full-chain-' + name, fullDatabase);
      outcome.status = 'passed'; check('Full chronological migration SQL file', { migration: name, sha256: outcome.sha256 });
    } catch (error) {
      outcome.status = 'failed'; report.fullMigrationChain.status = 'failed';
      report.fullMigrationChain.failedMigration = name;
      report.fullMigrationChain.failureLog = 'failed-command.log';
      throw error;
    }
  }
  report.fullMigrationChain.status = 'passed';
  report.fullMigrationChain.appliedFiles = chronological.length;
  stage = 'full-schema fixture and search verification';
  const productFields = await rows(`SELECT column_name, is_nullable, udt_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Product' AND column_name IN ('name','description','categoryId','updatedAt','searchVector') ORDER BY column_name`, 'full-schema-fields', fullDatabase);
  for (const name of ['name', 'description', 'categoryId', 'updatedAt']) assert.equal(productFields.find(row => row.column_name === name)?.is_nullable, 'NO');
  assert.equal(productFields.find(row => row.column_name === 'searchVector')?.udt_name, 'tsvector');
  await sql(`INSERT INTO "Category" (id,name,slug) VALUES ('full-spices','Full chain spices','full-spices');
    INSERT INTO "Product" (id,name,slug,description,"categoryId",certifications,status,market,"originLabel",flavour,"updatedAt")
    VALUES ('full-product','Cinnamon ground','full-product','Velvet warming spice','full-spices',ARRAY[]::text[],'ACTIVE','BOTH','Sri Lanka',ARRAY['Warm'],TIMESTAMP '2026-10-02 00:00:00');
    INSERT INTO "Variant" (id,"productId",weight,price,sku,stock,market,currency)
    VALUES ('full-variant','full-product',100,10.25,'full-fixture-sku',5,'BOTH','USD');`, 'full-schema-fixture', fullDatabase);
  assert.deepEqual((await rows(`SELECT "searchVector" = (${vector}) AS correct,
    "searchVector" @@ plainto_tsquery('english','cinnamon') AS name_match,
    "searchVector" @@ plainto_tsquery('english','velvet') AS description_match FROM "Product" WHERE id='full-product'`, 'full-schema-insert-check', fullDatabase))[0],
  { correct: true, name_match: true, description_match: true });
  await sql(`UPDATE "Product" SET name='Cardamom ground', description='Floral fragrance' WHERE id='full-product';`, 'full-schema-edit', fullDatabase);
  assert.deepEqual((await rows(`SELECT "searchVector" = (${vector}) AS correct,
    "searchVector" @@ plainto_tsquery('english','cardamom floral') AS new_match,
    "searchVector" @@ plainto_tsquery('english','cinnamon') AS old_name_match,
    "searchVector" @@ plainto_tsquery('english','velvet') AS old_description_match FROM "Product" WHERE id='full-product'`, 'full-schema-edit-check', fullDatabase))[0],
  { correct: true, new_match: true, old_name_match: false, old_description_match: false });
  const fullTrigger = await rows(`SELECT tgname,tgenabled,pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgrelid='"Product"'::regclass AND NOT tgisinternal`, 'full-schema-trigger', fullDatabase);
  assert.equal(fullTrigger.length, 1); assert.equal(fullTrigger[0].tgenabled, 'O'); assert.match(fullTrigger[0].definition, /UPDATE OF name, description/);
  const fullIndexes = await rows(`SELECT i.relname,x.indisvalid,x.indisready,pg_get_indexdef(i.oid) AS definition FROM pg_index x
    JOIN pg_class i ON i.oid=x.indexrelid WHERE i.relname IN ('Product_searchVector_idx','Product_name_trgm_idx') ORDER BY i.relname`, 'full-schema-indexes', fullDatabase);
  assert.equal(fullIndexes.length, 2); for (const index of fullIndexes) { assert(index.indisvalid && index.indisready); assert.match(index.definition, /USING gin/); }
  report.fullMigrationChain.fixtureVerification = { productFields, trigger: fullTrigger, indexes: fullIndexes, insertAndTextEdit: 'passed' };
  check('Full migration schema accepts required product/variant fixture and maintains weighted search vector', { database: fullDatabase });
  check('Full migration schema retains enabled narrow trigger and valid FTS/trigram GIN indexes', { database: fullDatabase });
  persist();
  stage = 'synthetic fixture';
  await sql(`CREATE TYPE "Market" AS ENUM ('LOCAL','INTERNATIONAL','BOTH');
CREATE TYPE "Currency" AS ENUM ('LKR','USD','EUR','GBP');
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT','ACTIVE','ARCHIVED');
CREATE EXTENSION pg_trgm;
CREATE TABLE "Category" (id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL);
CREATE TABLE "Product" (id text PRIMARY KEY, name text, description text, slug text NOT NULL,
 "categoryId" text REFERENCES "Category"(id), status "ProductStatus" NOT NULL DEFAULT 'ACTIVE', market "Market" NOT NULL DEFAULT 'BOTH',
 featured boolean NOT NULL DEFAULT false, "originLabel" text DEFAULT 'Sri Lanka', flavour text[] DEFAULT ARRAY['Warm'],
 "createdAt" timestamp NOT NULL DEFAULT '2026-10-01', "updatedAt" timestamp NOT NULL DEFAULT '2026-10-01', "searchVector" tsvector);
CREATE INDEX "Product_searchVector_idx" ON "Product" USING GIN ("searchVector");
CREATE TABLE "Variant" (id text PRIMARY KEY, "productId" text REFERENCES "Product"(id), weight integer NOT NULL, price numeric(10,2) NOT NULL, market "Market" NOT NULL, currency "Currency" NOT NULL);
CREATE TABLE "Review" (id text PRIMARY KEY, "productId" text, rating integer, "moderationStatus" text);
CREATE TABLE "OrderItem" (id text PRIMARY KEY, "productId" text);
INSERT INTO "Category" VALUES ('spices','Spices','spices'), ('tea','Tea','tea');
INSERT INTO "Product" (id,name,description,slug,"categoryId",status,market,flavour,"originLabel") VALUES
 ('p01','Cinnamon ground','Velvet warming spice','p01','spices','ACTIVE','BOTH',ARRAY['Warm'],'Sri Lanka'),
 ('p02','Cinnamon ground','Velvet warming spice','p02','spices','ACTIVE','BOTH',ARRAY['Warm'],'Sri Lanka'),
 ('p03','Cinnamon ground','Velvet warming spice','p03','spices','ACTIVE','BOTH',ARRAY['Warm'],'Sri Lanka'),
 ('p04','Cinnamon ground','Velvet warming spice','p04','spices','ACTIVE','LOCAL',ARRAY['Warm'],'Sri Lanka'),
 ('p05','Cinnamon ground','Velvet warming spice','p05','spices','ACTIVE','INTERNATIONAL',ARRAY['Warm'],'Sri Lanka'),
 ('p06','Cinnamon ground','Velvet warming spice','p06','spices','ARCHIVED','BOTH',ARRAY['Warm'],'Sri Lanka'),
 ('p07','Cinnamon ground','Velvet warming spice','p07','spices','DRAFT','BOTH',ARRAY['Warm'],'Sri Lanka'),
 ('p08','Pepper ground','Brisk spice','p08','spices','ACTIVE','BOTH',ARRAY['Warm'],'Sri Lanka'),
 ('p09','Cinnamon ground','Velvet warming spice','p09','tea','ACTIVE','BOTH',ARRAY['Warm'],'Sri Lanka'),
 ('p10','Cinnamon ground','Velvet warming spice','p10','spices','ACTIVE','BOTH',ARRAY['Citrus'],'Sri Lanka'),
 ('p11','Cinnamon sticks','Velvet warming spice','p11','spices','ACTIVE','BOTH',ARRAY['Warm'],'Sri Lanka'),
 ('p12','Cinnamon ground','Velvet warming spice','p12','spices','ACTIVE','BOTH',ARRAY['Warm'],'India'),
 ('null-name',NULL,'Velvet','null-name','tea','DRAFT','BOTH',ARRAY[]::text[],'Sri Lanka'),
 ('null-desc','Cinnamon',NULL,'null-desc','tea','DRAFT','BOTH',ARRAY[]::text[],'Sri Lanka'),
 ('empty','',NULL,'empty','tea','DRAFT','BOTH',ARRAY[]::text[],'Sri Lanka');
UPDATE "Product" SET "searchVector" = ${vector} WHERE id = 'p01';
UPDATE "Product" SET "searchVector" = to_tsvector('english','obsolete') WHERE id = 'p02';
INSERT INTO "Variant" VALUES
 ('v01l','p01',100,10.49,'BOTH','LKR'),('v01u','p01',100,10.25,'BOTH','USD'),('v01small','p01',50,0.01,'BOTH','LKR'),
 ('v02l','p02',100,2.49,'BOTH','LKR'),('v02u','p02',100,2.50,'BOTH','USD'),
 ('v03l','p03',50,10.40,'BOTH','LKR'),('v03lx','p03',250,11,'BOTH','LKR'),('v03u','p03',100,10.25,'BOTH','USD'),
 ('v04l','p04',100,3.50,'LOCAL','LKR'),('v04wrong','p04',100,0.01,'LOCAL','USD'),
 ('v05u','p05',100,3.25,'INTERNATIONAL','USD'),('v05wrong','p05',100,0.01,'INTERNATIONAL','LKR');`, 'fixture');
  const before = await rows(`SELECT id, name, description, "updatedAt", xmin::text AS xmin, ctid::text AS ctid FROM "Product" ORDER BY id`, 'before');
  const { tsImport } = await import(pathToFileURL(req.resolve('tsx/esm/api')).href);
  const builders = await tsImport(pathToFileURL(path.join(root, 'backend/src/services/catalog-query.ts')).href, import.meta.url);
  const defaults = { limit: 2, categoryName: ['Spices'], form: ['Ground'], origin: ['Sri Lanka'], flavour: ['Warm'], sort: 'price-asc', search: 'velvet' };
  const beforeSearch = await rows(executable(builders.buildCatalogCountQuery(defaults, 'LOCAL')), 'before-search');
  assert.equal(beforeSearch[0].total, 1); check('Drift fixture reproduces missing search matches', { matchingRowsBeforeRepair: 1 });
  stage = 'migration backfill';
  await sql(`BEGIN;\n${migration}\nCOMMIT;`, 'migration');
  assert.equal((await rows(`SELECT COUNT(*)::int AS total FROM "Product" WHERE "searchVector" IS DISTINCT FROM (${vector})`, 'vectors'))[0].total, 0);
  const after = await rows(`SELECT id, name, description, "updatedAt", xmin::text AS xmin, ctid::text AS ctid FROM "Product" ORDER BY id`, 'after');
  assert.deepEqual(after.map(({ xmin, ctid, ...other }) => other), before.map(({ xmin, ctid, ...other }) => other));
  assert.equal(after.find(r => r.id === 'p01').ctid, before.find(r => r.id === 'p01').ctid);
  assert.notEqual(after.find(r => r.id === 'p02').ctid, before.find(r => r.id === 'p02').ctid);
  check('Backfill repairs NULL/stale vectors including inactive and defensive NULL/empty fields, leaving correct row and source timestamps intact', { products: after.length });
  const trigger = await rows(`SELECT tgname, tgenabled, pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgrelid='"Product"'::regclass AND NOT tgisinternal`, 'trigger');
  assert.equal(trigger.length, 1); assert.equal(trigger[0].tgenabled, 'O'); assert.match(trigger[0].definition, /UPDATE OF name, description/);
  check('Single enabled INSERT/name/description trigger installed', { trigger });
  await sql(`BEGIN;\n${migration}\nCOMMIT;`, 'reapply');
  assert.deepEqual(await rows(`SELECT id, xmin::text AS xmin, ctid::text AS ctid FROM "Product" ORDER BY id`, 'reapply-tuples'), after.map(({ id, xmin, ctid }) => ({ id, xmin, ctid })));
  check('Reapplication is safe and backfill skips every already-correct tuple');
  stage = 'actual query builder semantics';
  for (const market of ['LOCAL', 'INTERNATIONAL']) {
    const expectedIds = market === 'LOCAL' ? ['p02', 'p04', 'p01', 'p03'] : ['p02', 'p05', 'p01', 'p03'];
    for (const search of ['velvet', 'cinnamon']) {
      for (const sort of ['price-asc', 'price-desc', 'featured', 'best', 'rating', 'new']) {
        const filters = { ...defaults, sort, search };
        const reference = await rows(executable(builders.buildCatalogPageQuery({ ...filters, limit: 100 }, market)), 'catalog-reference');
        assert.deepEqual(reference.map(r => r.id).sort(), [...expectedIds].sort());
        assert.equal((await rows(executable(builders.buildCatalogCountQuery(filters, market)), 'catalog-count'))[0].total, 4);
        const gathered = []; let cursor;
        for (let page = 0; page < 10; page++) {
          const result = await rows(executable(builders.buildCatalogPageQuery({ ...filters, cursor }, market)), 'catalog-page');
          gathered.push(...result.slice(0, 2));
          if (result.length <= 2) break;
          cursor = builders.encodeCatalogCursor(result[1].id, result[1].key, filters, market, result[1].priority, result[1].secondary);
        }
        assert.deepEqual(gathered, reference); assert.equal(new Set(gathered.map(r => r.id)).size, 4);
        if (sort === 'price-asc') {
          assert.deepEqual(reference.map(r => r.id), expectedIds);
          assert.deepEqual(reference.map(r => Number(r.key)), market === 'LOCAL' ? [2, 4, 10, 10] : [2.5, 3.25, 10.25, 10.25]);
        }
        check('Actual catalog FTS + all filters/count/stable pagination', { market, search, sort, products: 4, pageSize: 2 });
      }
    }
    const legacy = { limit: 1, sort: 'price_asc', search: 'velvet', category: 'spices', minPrice: 2, maxPrice: 4 };
    const reference = await rows(executable(builders.buildLegacyProductPageQuery({ ...legacy, limit: 100 }, market)), 'legacy-reference');
    const expected = market === 'LOCAL' ? ['p02', 'p04'] : ['p02', 'p05'];
    assert.deepEqual(reference.map(r => r.id).sort(), expected);
    const gathered = []; let cursor;
    for (let page = 0; page < 10; page++) {
      const result = await rows(executable(builders.buildLegacyProductPageQuery({ ...legacy, cursor }, market)), 'legacy-page');
      gathered.push(...result.slice(0, 1)); if (result.length <= 1) break; cursor = result[0].id;
    }
    assert.deepEqual(gathered, reference);
    check('Actual legacy FTS + category/currency/price filters and stable rank ties', { market, ids: expected });
    // This intentionally mirrors the inline autocomplete SQL. Importing the service
    // would start index.ts/jobs; this is not claimed as a pure-builder test.
    const autocomplete = await rows(`SELECT id FROM "Product" WHERE status='ACTIVE' AND market IN (${literal(market)}::"Market", 'BOTH'::"Market")
      AND (name % 'velvet' OR "searchVector" @@ plainto_tsquery('english','velvet')) ORDER BY similarity(name,'velvet') DESC, id ASC LIMIT 100`, 'autocomplete');
    assert(!autocomplete.some(r => ['p06','p07', market === 'LOCAL' ? 'p05' : 'p04'].includes(r.id)));
    assert(autocomplete.some(r => r.id === 'p02'));
    check('Autocomplete-equivalent SQL restores description-only match and keeps status/market restrictions', { market });
  }
  stage = 'trigger maintenance';
  await sql(`INSERT INTO "Product" (id,name,description,slug,"categoryId",status) VALUES ('inserted','Saffron','Golden aroma','inserted','spices','DRAFT');`, 'insert');
  assert.deepEqual((await rows(`SELECT "searchVector" = (${vector}) AS correct, "searchVector" @@ plainto_tsquery('english','saffron') AS name_match,
    "searchVector" @@ plainto_tsquery('english','golden') AS description_match FROM "Product" WHERE id='inserted'`, 'insert-check'))[0], { correct: true, name_match: true, description_match: true });
  check('INSERT computes weighted vector without supplying searchVector');
  await sql(`UPDATE "Product" SET name='Cardamom' WHERE id='inserted';`, 'rename');
  const renamed = (await rows(`SELECT "searchVector" = (${vector}) AS correct, "searchVector" @@ plainto_tsquery('english','cardamom') AS new_match,
    "searchVector" @@ plainto_tsquery('english','saffron') AS old_match FROM "Product" WHERE id='inserted'`, 'rename-check'))[0];
  assert.deepEqual(renamed, { correct: true, new_match: true, old_match: false }); check('Name edit adds new and removes old lexemes');
  await sql(`UPDATE "Product" SET description='Floral fragrance' WHERE id='inserted';`, 'description');
  const changed = (await rows(`SELECT "searchVector" = (${vector}) AS correct, "searchVector" @@ plainto_tsquery('english','floral') AS new_match,
    "searchVector" @@ plainto_tsquery('english','golden') AS old_match FROM "Product" WHERE id='inserted'`, 'description-check'))[0];
  assert.deepEqual(changed, { correct: true, new_match: true, old_match: false }); check('Description edit adds new and removes old lexemes');
  const savedVector = (await rows(`SELECT "searchVector"::text AS vector FROM "Product" WHERE id='inserted'`, 'saved-vector'))[0].vector;
  await sql(`UPDATE "Product" SET featured=true, market='LOCAL', status='ARCHIVED', "originLabel"='Test', flavour=ARRAY['Test'] WHERE id='inserted';`, 'other-fields');
  assert.equal((await rows(`SELECT "searchVector"::text AS vector FROM "Product" WHERE id='inserted'`, 'unchanged-vector'))[0].vector, savedVector);
  check('Unrelated field edits preserve searchVector');
  const index = await rows(`SELECT i.relname, x.indisvalid, x.indisready FROM pg_index x JOIN pg_class i ON i.oid=x.indexrelid WHERE i.relname='Product_searchVector_idx'`, 'index');
  assert.deepEqual(index, [{ relname: 'Product_searchVector_idx', indisvalid: true, indisready: true }]);
  check('Existing GIN index remains valid/ready');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.failedStage = stage; report.errorType = error.name;
  report.reason = String(error.message).replaceAll(root, '<workspace>');
  console.error(`Phase 8 disposable PostgreSQL failed at ${stage}: ${report.reason}`);
  process.exitCode = 1;
} finally {
  // A timed-out startup can have launched the owned server before reporting failure.
  if (started || (startAttempted && fs.existsSync(path.join(data, 'postmaster.pid')))) {
    try {
      assert(normalize(data).startsWith(normalize(runDir) + '/') && path.dirname(runDir) === base);
      await command('pg_ctl', ['-D', data, '-w', '-t', '20', '-m', 'fast', 'stop']);
      report.clusterStopped = true;
    } catch (error) { report.clusterStopped = false; report.cleanupErrorType = error.name; process.exitCode = 1; }
  }
  report.completedAt = new Date().toISOString(); persist();
  console.log(`Phase 8: ${report.status}; ${report.checks.length} checks; owned cluster stopped=${report.clusterStopped ?? 'not-started'}. Report: ${path.relative(root, path.join(runDir, 'checks.json'))}`);
}

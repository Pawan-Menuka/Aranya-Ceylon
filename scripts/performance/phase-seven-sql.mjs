// Real PostgreSQL execution against synthetic VALUES CTEs only. No table reads,
// backend startup, jobs, migrations or customer data are involved.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const req=createRequire(path.resolve('backend/package.json'));
req('dotenv').config({path:'backend/.env',quiet:true});
const {tsImport}=await import(pathToFileURL(req.resolve('tsx/esm/api')).href);
const analytics=await tsImport(pathToFileURL(path.resolve('backend/src/services/analytics-query.ts')).href,import.meta.url);
const catalog=await tsImport(pathToFileURL(path.resolve('backend/src/services/catalog-query.ts')).href,import.meta.url);
const {neon}=req('@neondatabase/serverless'),sql=neon(process.env.DATABASE_URL);
const orderFixture=`WITH "Order"(id,market,currency,status,total,"createdAt") AS (VALUES
 ('o1','LOCAL'::"Market",'LKR'::"Currency",'PAID'::"OrderStatus",3000::numeric,TIMESTAMP '2026-10-02 12:00:00'),
 ('o2','INTERNATIONAL'::"Market",'USD'::"Currency",'SHIPPED'::"OrderStatus",20::numeric,TIMESTAMP '2026-10-02 13:00:00'),
 ('o3','LOCAL'::"Market",'LKR'::"Currency",'REFUNDED'::"OrderStatus",500::numeric,TIMESTAMP '2026-10-02 14:00:00'),
 ('o4','LOCAL'::"Market",'LKR'::"Currency",'PROCESSING'::"OrderStatus",600::numeric,TIMESTAMP '2026-09-01 12:00:00'),
 ('o5','INTERNATIONAL'::"Market",'USD'::"Currency",'PENDING'::"OrderStatus",40::numeric,TIMESTAMP '2026-09-20 12:00:00'),
 ('o6','INTERNATIONAL'::"Market",'USD'::"Currency",'PAID'::"OrderStatus",900::numeric,TIMESTAMP '2026-05-01 12:00:00')),
 "OrderItem"("orderId","productId",quantity,"unitPrice") AS (VALUES
 ('o1','p1',2,300::numeric),('o1','p2',1,600::numeric),('o2','p1',1,10::numeric),('o3','p3',100,500::numeric)) `;
const productFixture=`WITH "Product"(id,name,status,market) AS (VALUES
 ('a','Cinnamon, ground','ACTIVE'::"ProductStatus",'BOTH'::"Market"),
 ('b','Cinnamon, ground','ACTIVE'::"ProductStatus",'LOCAL'::"Market"),
 ('c','Pepper','ARCHIVED'::"ProductStatus",'BOTH'::"Market"),
 ('d','Tea','ACTIVE'::"ProductStatus",'LOCAL'::"Market")) `;
const output='artifacts/performance/phase-seven-sql';fs.mkdirSync(output,{recursive:true});
const checks=[];
async function run(name,prefix,query,validate){
 const start=performance.now();
 const result=await sql.transaction([sql`SELECT set_config('statement_timeout','5000',true)`,sql.query(prefix+query.text,query.values)],{readOnly:true,isolationLevel:'RepeatableRead',fetchOptions:{signal:AbortSignal.timeout(20000)}});
 validate(result[1]);checks.push({name,passed:true,syntheticRows:result[1],roundTripMs:Math.round(performance.now()-start)});
}
try{
 await run('90-day aggregate respects UTC date window and counts all statuses',orderFixture,analytics.buildDailyOrderAggregateQuery(new Date('2026-07-05T00:00:00Z'),new Date('2026-10-03T00:00:00Z')),rows=>{assert.equal(rows.reduce((n,r)=>n+r.orders,0),5);assert(rows.some(r=>r.date==='2026-09-01'&&r.status==='PROCESSING'));assert(!rows.some(r=>r.date==='2026-05-01'));});
 await run('Top products preserve quantity, currency and revenue status',orderFixture,analytics.buildTopProductsAggregateQuery(new Date('2026-09-03T00:00:00Z'),new Date('2026-10-03T00:00:00Z'),300),rows=>{assert.deepEqual(rows.map(r=>[r.productId,Number(r.units),Number(r.revenueUsd)]),[['p1',3,12],['p2',1,2]]);});
 for(const market of ['LOCAL','INTERNATIONAL'])await run('Ingredient lookup '+market,productFixture,catalog.buildProductNameLookupQuery(['Cinnamon, ground','Pepper','Tea'],market),rows=>{assert.deepEqual(rows.map(r=>r.id),market==='LOCAL'?['a','d']:['a']);});
 fs.writeFileSync(output+'/checks.json',JSON.stringify({databaseAccess:'READ ONLY',tableAccess:'Synthetic VALUES CTEs shadow all referenced tables; no real table data read',limits:'SQL correctness only, not representative private-data plans/load or provider cold-start timing',checks},null,2));
 console.log('Synthetic PostgreSQL checks '+checks.length+'/'+checks.length+' pass; no table reads or writes.');
}catch(error){fs.writeFileSync(output+'/checks.json',JSON.stringify({databaseAccess:'READ ONLY',checks,status:'failed',error:'Synthetic SQL diagnostic failed; see sanitized console error class'},null,2));console.error(error.name+': synthetic SQL diagnostic failed');process.exitCode=1;}

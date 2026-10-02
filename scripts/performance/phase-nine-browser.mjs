// Controlled Phase9 browser acceptance. Fixture auth/data only, no external providers.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { frontendSource } from './source.mjs';
import { startFixtureApi, fixtureSecret, signedMarket } from './fixture-api.mjs';
import { loadPlaywright } from './browser.mjs';
const base='http://127.0.0.1:3101', output='artifacts/performance/phase-nine-browser';
const build=JSON.parse(fs.readFileSync('aranya-next/.performance-build/baseline-source.json'));
if(build.sourceFingerprint!==frontendSource(path.resolve('aranya-next')).sourceFingerprint)throw new Error('Rebuild current isolated source before Phase9 checks');
for(const port of [3101,4101])await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});
fs.mkdirSync(output,{recursive:true});
const api=await startFixtureApi({phase9Rows:625,admin:true});
const server=spawn(process.execPath,['aranya-next/node_modules/next/dist/bin/next','start','aranya-next/.performance-build','--hostname','127.0.0.1','--port','3101'],{env:{...process.env,NODE_ENV:'production',NEXT_PUBLIC_API_URL:'http://127.0.0.1:4101',NEXT_PUBLIC_SITE_URL:base,NEXT_PUBLIC_ENABLE_DEMO:'false',MARKET_COOKIE_SECRET:fixtureSecret,REVALIDATION_SECRET:'performance-fixture-only'},stdio:['ignore','pipe','pipe']});
const logs=[],checks=[],errors=[];server.stdout.on('data',b=>logs.push(b.toString()));server.stderr.on('data',b=>logs.push(b.toString()));
let browser,currentCase;
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const save=()=>fs.writeFileSync(output+'/checks.json',JSON.stringify(checks,null,2));
async function check(name,run){currentCase=name;try{const detail=await run();checks.push({name,passed:true,...detail});save();console.log('Passed: '+name);}catch(e){checks.push({name,passed:false,error:e.message});save();throw e;}}
async function context(admin=false){const c=await browser.newContext({viewport:{width:1440,height:900}});await c.addCookies([{name:'x-market',value:signedMarket('international'),url:base},...(admin?[{name:'phase9-admin',value:fixtureSecret,url:base}]:[])]);await c.addInitScript(()=>localStorage.setItem('aranya-market-ack','1'));await c.route('**/*',route=>{const u=new URL(route.request().url());if(![base,'http://127.0.0.1:4101'].includes(u.origin))return route.abort();if(u.pathname==='/_next/image'&&/^https?:/i.test(u.searchParams.get('url')||''))return route.abort();return route.continue();});const p=await c.newPage();p.on('pageerror',e=>errors.push({case:currentCase,name:e.name,message:e.message}));return{c,p};}
async function search(p,q='warm cinn'){await p.goto(base+'/search?q='+encodeURIComponent(q));await p.locator('[data-screen-label="Search"]').waitFor();await p.locator('a[href^="/products/phase-nine-cinnamon-"]').first().waitFor();}
try{
 let ready=false;for(let i=0;i<120;i++){try{if((await fetch(base+'/about',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready,'Next server readiness');
 const reset=await fetch(base+'/api/revalidate',{method:'POST',headers:{'content-type':'application/json','x-revalidate-secret':'performance-fixture-only'},body:JSON.stringify({paths:['/','/products','/categories','/journal','/search','/recipes','/gifts']})});assert(reset.ok,'Fixture cache reset');await reset.arrayBuffer();
 const {chromium}=await loadPlaywright();browser=await chromium.launch({headless:true,...(process.env.PERF_BROWSER_CHANNEL?{channel:process.env.PERF_BROWSER_CHANNEL}:{})});
 await check('Five admin lists load bounded pages, next/previous and late server-filtered rows',async()=>{
  const{c,p}=await context(true);try{for(const [section,placeholder,label]of [['products','Search products…','products'],['blog','Search posts…','posts'],['recipes','Search recipes…','recipes'],['gifts','Search gift sets…','gift sets'],['audit','Search actor, action, target…','entries']]){
   await p.goto(base+'/admin#'+section);await p.getByText(new RegExp('Showing 1.20 of 625')).waitFor({timeout:20000});
   if(section!=='audit')assert(await p.locator('.ad-table tbody tr').count()===20,'Admin first page bound '+section);
   await p.getByRole('button',{name:'Next',exact:true}).click();await p.getByText(new RegExp('Showing 21.40 of 625')).waitFor();
   await p.getByRole('button',{name:'Prev',exact:true}).click();await p.getByText(new RegExp('Showing 1.20 of 625')).waitFor();
   await p.getByPlaceholder(placeholder).fill('0625');await p.getByText(new RegExp('Showing 1.1 of 1')).waitFor();
   assert((await p.locator('.ad-main').textContent()).includes('0625'),'Late filtered row '+label);
  }return{resources:5,rowsPerResource:625,firstPage:20,lateRowFound:true};}finally{await c.close();}
 });
 await check('Search first paint is compact and all product/journal matches remain reachable',async()=>{
  const{c,p}=await context();try{api.calls.length=0;await search(p);
   const products=()=>p.locator('[data-screen-label="Search"] .sr-grid h3');
   const stories=()=>p.locator('[data-screen-label="Search"] a[href^="/journal/phase-nine-"]');
   assert(await products().count()===20&&await stories().count()===20,'Compact20-result first collections');
   assert(!(api.calls.some(call=>call.path==='/products'&&new URLSearchParams(call.query).get('limit')==='100')),'Whole catalog downloaded');
   let n=0;while(await p.getByRole('button',{name:'Load more spices',exact:true}).count()){const before=await products().count();await p.getByRole('button',{name:'Load more spices',exact:true}).click();await p.waitForFunction(count=>document.querySelectorAll('[data-screen-label="Search"] .sr-grid h3').length>count,before);assert(++n<=30,'Finite product cursors');}
   assert(await products().count()===590,'Complete product matches');assert(await stories().count()===20,'Product continuation fetched extra stories');
   n=0;while(await p.getByRole('button',{name:'Load more stories',exact:true}).count()){const before=await stories().count();await p.getByRole('button',{name:'Load more stories',exact:true}).click();await p.waitForFunction(count=>document.querySelectorAll('[data-screen-label="Search"] a[href^="/journal/phase-nine-"]').length>count,before);assert(++n<=30,'Finite journal cursors');}
   assert(await stories().count()===600,'Complete journal matches');return{initialPerCollection:20,products:590,journal:600,independentContinuations:true};}finally{await c.close();}
 });
 await check('Failed search continuation retains cards and retries the cursor',async()=>{
  const{c,p}=await context();let fail=true;try{await search(p);await p.route('**/api/search?**',route=>{if(new URL(route.request().url()).searchParams.has('productCursor')&&fail)return route.fulfill({status:503,contentType:'application/json',body:'{"error":"Controlled unavailable"}'});return route.continue();});await p.getByRole('button',{name:'Load more spices',exact:true}).click();await p.getByRole('button',{name:'Try again',exact:true}).waitFor();assert(await p.locator('[data-screen-label="Search"] .sr-grid h3').count()===20,'Failure erased initial cards');fail=false;await p.getByRole('button',{name:'Try again',exact:true}).click();await p.waitForFunction(()=>document.querySelectorAll('[data-screen-label="Search"] .sr-grid h3').length===40);return{retained:20,retried:40};}finally{await c.close();}
 });
 await check('Pinned fonts are served locally with immutable caching and preserved families',async()=>{
  const{c,p}=await context();try{await search(p);await p.evaluate(()=>document.fonts.ready);const typography=await p.evaluate(()=>Object.fromEntries(['--font-display','--font-ui','--font-read'].map(key=>[key,getComputedStyle(document.documentElement).getPropertyValue(key)])));assert(new Set(Object.values(typography)).size===3,'Font roles collapsed');const files=fs.readdirSync('aranya-next/public/fonts/pinned').filter(f=>f.endsWith('.woff2'));assert(files.length===44,'Incomplete pinned font inventory');for(const name of files){const response=await fetch(base+'/fonts/pinned/'+name);assert(response.ok,'Font missing '+name);assert(response.headers.get('cache-control')?.includes('immutable'),'Font cache header '+name);const served=Buffer.from(await response.arrayBuffer());assert(served.equals(fs.readFileSync('aranya-next/public/fonts/pinned/'+name)),'Font bytes changed '+name);}return{files:44,typography,externalFontRequests:0};}finally{await c.close();}
 });
 assert(errors.length===0,'Browser page errors');save();
}catch(error){console.error(error.message);process.exitCode=1;}finally{fs.writeFileSync(output+'/server.log',logs.join(''));fs.writeFileSync(output+'/page-errors.json',JSON.stringify(errors,null,2));fs.writeFileSync(output+'/environment.json',JSON.stringify({sourceFingerprint:build.sourceFingerprint,node:process.version,fixtureMode:'Opt-in synthetic625 rows/resource and fixture-only admin session',externalBrowserRequestsBlocked:true,productionProviders:false},null,2));if(browser)await browser.close();server.kill();await Promise.race([new Promise(r=>server.once('exit',r)),new Promise(r=>setTimeout(r,5000))]);api.server.closeAllConnections();await api.close();}

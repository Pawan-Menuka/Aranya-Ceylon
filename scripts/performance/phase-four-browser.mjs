// Production checks: actual Next Data Cache, market isolation and streamed HTML.
import fs from 'node:fs';
import net from 'node:net';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { frontendSource } from './source.mjs';
import { startFixtureApi, signedMarket, fixtureSecret } from './fixture-api.mjs';
import { loadPlaywright } from './browser.mjs';
const base='http://127.0.0.1:3101',output='artifacts/performance/phase-four-checks',secret='performance-fixture-only';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const {sourceFingerprint}=frontendSource(path.resolve('aranya-next'));
const fixtureSha256=hash(fs.readFileSync('scripts/performance/fixtures/catalog.json'));
const build=JSON.parse(fs.readFileSync('aranya-next/.performance-build/baseline-source.json'));
if(build.sourceFingerprint!==sourceFingerprint||build.fixtureSha256!==fixtureSha256||build.port!==3101||build.apiPort!==4101)throw new Error('Rebuild the isolated frontend before Phase 4 checks.');
for(const port of [3101,4101])await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});
fs.mkdirSync(output,{recursive:true});
const faults=new Map(),api=await startFixtureApi({faults}),logs=[],checks=[],errors=[];
const server=spawn(process.execPath,['aranya-next/node_modules/next/dist/bin/next','start','aranya-next/.performance-build','--hostname','127.0.0.1','--port','3101'],{env:{...process.env,NODE_ENV:'production',NEXT_PUBLIC_API_URL:'http://127.0.0.1:4101',NEXT_PUBLIC_SITE_URL:base,NEXT_PUBLIC_ENABLE_DEMO:'false',MARKET_COOKIE_SECRET:fixtureSecret,REVALIDATION_SECRET:secret},stdio:['ignore','pipe','pipe']});
server.stdout.on('data',b=>logs.push(b.toString()));server.stderr.on('data',b=>logs.push(b.toString()));
let browser,page,current;
const cookie=(market,guest='a',extra={})=>`x-market=${signedMarket(market,extra)}; guestCartToken=fixture-${guest}; refresh=fixture-${guest}`;
const save=()=>fs.writeFileSync(output+'/checks.json',JSON.stringify(checks,null,2));
async function check(name,run){current=name;const start=Date.now(),detail=await run();checks.push({name,passed:true,elapsedMs:Date.now()-start,...detail});save();console.log('Passed: '+name);}
async function invalidate(paths){const r=await fetch(base+'/api/revalidate',{method:'POST',headers:{'content-type':'application/json','x-revalidate-secret':secret},body:JSON.stringify({paths})});if(!r.ok)throw new Error('Fixture invalidation failed: '+r.status);await r.arrayBuffer();}
async function html(route,visitor=cookie('international')){const r=await fetch(base+route,{headers:{cookie:visitor},signal:AbortSignal.timeout(15000)});return {status:r.status,body:await r.text(),csp:r.headers.get('content-security-policy'),cache:r.headers.get('cache-control')};}
async function stream(route,marker){const start=performance.now(),response=await fetch(base+route,{headers:{cookie:cookie('international')},signal:AbortSignal.timeout(15000)});const reader=response.body.getReader(),decoder=new TextDecoder();let body='',primaryMs=null,titleMs=null;while(true){const {done,value}=await reader.read();if(done)break;body+=decoder.decode(value,{stream:true});if(primaryMs===null&&body.includes(marker))primaryMs=performance.now()-start;if(titleMs===null&&body.includes('<title>'))titleMs=performance.now()-start;}return {status:response.status,primaryMs,titleMs,totalMs:performance.now()-start,body};}
async function wire(route){return new Promise((resolve,reject)=>{http.get(base+route,{headers:{'accept-encoding':'gzip',cookie:cookie('international')}},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>{const bytes=Buffer.concat(chunks);resolve({status:res.statusCode,encoding:res.headers['content-encoding'],cache:res.headers['cache-control'],wireBytes:bytes.length,decoded:res.headers['content-encoding']==='gzip'?zlib.gunzipSync(bytes).toString():bytes.toString()});});}).on('error',reject);});}
try {
  let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/about',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}if(!ready)throw new Error('Next readiness failed');
  const {chromium}=await loadPlaywright();browser=await chromium.launch({headless:true,...(process.env.PERF_BROWSER_CHANNEL?{channel:process.env.PERF_BROWSER_CHANNEL}:{})});
  fs.writeFileSync(output+'/environment.json',JSON.stringify({sourceFingerprint,fixtureSha256,node:process.version,browser:browser.version(),limits:['Public fixture only; content mutations below change in-memory fixture data, not a database','Direct Next server cache/stream checks; hosted CDN and real accounts remain staging','Fixture MARKET_COOKIE_SECRET is synthetic; no real secret is recorded']},null,2));
  const slug='ceylon-cinnamon-quills',route='/products/'+slug;
  await check('Two guests share public reads; verified markets have separate actual Next cache entries',async()=>{
    await invalidate(['/products']);api.calls.length=0;
    const localA=await html(route,cookie('local','a',{exp:4102444790}));
    const countA=api.calls.filter(c=>c.path===route).length;
    const localB=await html(route,cookie('local','b',{exp:4102444700}));
    const countB=api.calls.filter(c=>c.path===route).length;
    const intl=await html(route,cookie('international','c'));
    const reads=api.calls.filter(c=>c.path===route);
    if(countA!==1||countB!==1||reads.length!==2||reads.map(c=>c.market).join(',')!=='LOCAL,INTERNATIONAL')throw new Error('Public reuse/isolation failed: '+JSON.stringify({countA,countB,reads}));
    if(!localA.body.includes('"priceCurrency":"LKR"')||!localB.body.includes('"priceCurrency":"LKR"')||!intl.body.includes('"priceCurrency":"USD"'))throw new Error('Wrong first-paint structured currency');
    if(reads.some(c=>c.hasAuthorization||c.cookieNames.join(',')!=='x-market'))throw new Error('Visitor identity leaked into public reads');
    return {firstGuestPrimaryReads:countA,secondGuestAdditionalReads:countB-countA,markets:reads.map(c=>c.market),upstreamCookieNames:reads[0].cookieNames};
  });
  await check('Tampered market defaults safely; each dynamic page carries a fresh matching CSP nonce',async()=>{
    const valid=await html(route),token=signedMarket('local').slice(0,-8)+'tampered';
    const invalid=await html(route,`x-market=${token}; guestCartToken=fixture-tampered`);
    const nonce=r=>r.csp?.match(/'nonce-([^']+)'/)?.[1];
    const a=nonce(valid),b=nonce(invalid);
    if(!a||!b||a===b||!valid.body.includes(`nonce="${a}"`)||!invalid.body.includes(`nonce="${b}"`)||!invalid.body.includes('"priceCurrency":"USD"'))throw new Error('Nonce/market mismatch');
    return {uniqueNonce:true,bootstrapNonceMatches:true,tamperedCurrency:'USD',htmlCacheControl:valid.cache};
  });
  await check('Private BFF cart responses remain per visitor and always reach the API',async()=>{
    api.calls.length=0;const ids=[];
    for(const visitor of ['a','b','a']){const r=await fetch(base+'/api/cart',{headers:{cookie:cookie('international',visitor)}});const j=await r.json();if(!r.headers.get('cache-control')?.includes('no-store'))throw new Error('Private cache policy missing');ids.push(j.cart.id);if(!r.headers.get('set-cookie'))throw new Error('Fixture cart cookie was not relayed');}
    if(api.calls.filter(c=>c.path==='/cart').length!==3||new Set(ids).size!==3)throw new Error('Private cart was shared/cached');
    return {upstreamReads:3,distinctFreshFixtureCarts:3,cookieRelay:true};
  });
  await check('Product rename/edit and archive invalidate both markets and remove the old live page',async()=>{
    const product=api.data.products.find(p=>p.slug===slug),original={name:product.name,slug:product.slug,status:product.status};
    const changedSlug=slug+'-phase-four-fixture',changedName='Phase Four Fixture Cinnamon';
    try {
      await html(route,cookie('local'));await html(route,cookie('international'));
      await html('/products',cookie('local'));await html('/products',cookie('international'));await html('/');
      product.name=changedName;
      if((await html(route)).body.includes(changedName))throw new Error('Fixture edit bypassed cache before invalidation');
      await invalidate(['/products',route]);
      for(const market of ['local','international'])if(!(await html(route,cookie(market))).body.includes(changedName))throw new Error('Edit stale after invalidation');
      for(const market of ['local','international'])if(!(await html('/products',cookie(market))).body.includes(changedName))throw new Error('Listing stale after invalidation');
      product.slug=changedSlug;await invalidate(['/products',route,'/products/'+changedSlug]);
      const old=await html(route),fresh=await html('/products/'+changedSlug);
      if(old.body.includes('data-screen-label="Product detail"')||!fresh.body.includes(changedName))throw new Error('Old/new identity invalidation failed');
      product.status='ARCHIVED';await invalidate(['/products','/products/'+changedSlug]);
      const archived=await html('/products/'+changedSlug);
      if(archived.body.includes('data-screen-label="Product detail"'))throw new Error('Archived product resurrected');
      if((await html('/products')).body.includes(changedName))throw new Error('Archived product remains in catalog');
      return {bothMarketsFresh:true,listingsFresh:true,oldIdentityGone:true,archivedDetailGone:true,archivedListingGone:true};
    } finally {Object.assign(product,original);await invalidate(['/products',route,'/products/'+changedSlug]);}
  });
  for(const spec of [{name:'product',route,related:'/products',marker:'data-screen-label="Product detail"',tag:'/products'},{name:'article',route:'/journal/'+api.data.blogs[0].slug,related:'/blog',marker:'data-screen-label="Article"',tag:'/journal'}]) {
    await check(spec.name+' primary HTML and metadata stream before delayed related content',async()=>{
      await invalidate([spec.tag]);faults.set(spec.related,{delayMs:3000});api.calls.length=0;
      try {
        const r=await stream(spec.route,spec.marker);
        if(r.primaryMs===null||r.titleMs===null||r.primaryMs>2000||r.titleMs>2000||r.totalMs-r.primaryMs<1500)throw new Error('Primary/metadata waited for related: '+JSON.stringify({primaryMs:r.primaryMs,titleMs:r.titleMs,totalMs:r.totalMs}));
        const primaryPath=spec.name==='article'?'/blog/'+api.data.blogs[0].slug:route;
        if(api.calls.filter(c=>c.path===primaryPath).length!==1)throw new Error('Primary fetched more than once for metadata/page');
        await invalidate([spec.tag]);
        const c=await browser.newContext({viewport:{width:1440,height:900}});await c.addInitScript(()=>localStorage.setItem('aranya-market-ack','1'));page=await c.newPage();page.on('pageerror',e=>errors.push(e.message));
        const start=performance.now();await page.goto(base+spec.route,{waitUntil:'commit'});await page.locator('['+spec.marker+']').first().waitFor({state:'visible',timeout:2500});const browserPrimaryMs=performance.now()-start;
        const beforeComplete=await page.evaluate(()=>document.readyState!=='complete');
        await page.screenshot({path:output+'/'+spec.name+'-streaming-primary.png'});await page.waitForLoadState('load');await c.close();
        if(browserPrimaryMs>2500||!beforeComplete)throw new Error('Browser primary content did not precede related completion');
        const detail={primaryMs:Math.round(r.primaryMs),metadataMs:Math.round(r.titleMs),completeMs:Math.round(r.totalMs),browserPrimaryMs:Math.round(browserPrimaryMs),browserPrimaryBeforeComplete:beforeComplete,primaryReads:1};
        fs.writeFileSync(output+'/'+spec.name+'-stream.json',JSON.stringify(detail,null,2));
        return detail;
      } finally {faults.delete(spec.related);await invalidate([spec.tag]);}
    });
  }
  await check('Public JSON is gzip-compressed by the Next delivery layer without corrupt framing',async()=>{
    const r=await wire('/api/products?limit=60');JSON.parse(r.decoded);
    if(r.status!==200||r.encoding!=='gzip'||r.wireBytes>=Buffer.byteLength(r.decoded))throw new Error('BFF JSON compression unavailable');
    return {encoding:r.encoding,wireBytes:r.wireBytes,decodedBytes:Buffer.byteLength(r.decoded),fixtureCacheControl:r.cache};
  });
  await check('Streamed product/article hydrate and related sections retain their visible layout',async()=>{
    const context=await browser.newContext({viewport:{width:1440,height:900}});await context.addInitScript(()=>localStorage.setItem('aranya-market-ack','1'));page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    // The frozen principal dataset contains one article. Verify empty related
    // content stays empty, then add a second article only to this in-memory
    // fixture to exercise the successful related-section presentation.
    await invalidate(['/journal']);
    if((await html('/journal/'+api.data.blogs[0].slug)).body.includes('More from the Journal'))throw new Error('Empty related list resurrected demo articles');
    const relatedFixture={...api.data.blogs[0],id:'phase-four-related-fixture',slug:'phase-four-related-fixture',title:'Related fixture article'};
    api.data.blogs.push(relatedFixture);await invalidate(['/journal']);
    try {
    for(const [name,url,related] of [['product',route,'Pairs well with'],['article','/journal/'+api.data.blogs[0].slug,'More from the Journal']]) {
      await page.goto(base+url,{waitUntil:'domcontentloaded'});await page.waitForTimeout(1000);await page.screenshot({path:output+'/'+name+'-primary.png'});
      const section=page.getByText(related,{exact:true});await section.scrollIntoViewIfNeeded();await page.waitForTimeout(800);await page.screenshot({path:output+'/'+name+'-related.png'});
    }
    } finally {api.data.blogs.splice(api.data.blogs.indexOf(relatedFixture),1);await invalidate(['/journal']);await context.close();}
    if(errors.length)throw new Error('Hydration errors: '+errors.join('; '));return {pageErrors:0,relatedSectionsVisible:true,emptyRelatedListPreserved:true,temporaryRelatedFixture:true};
  });
} catch(error) {checks.push({name:current,passed:false,error:error.message.replace(/https?:\/\/[^\s]+/g,'[url]')});save();if(page)await page.screenshot({path:output+'/failure.png'}).catch(()=>{});console.error(error.message);process.exitCode=1;}
finally {if(browser)await browser.close();server.kill();await Promise.race([new Promise(r=>server.once('exit',r)),new Promise(r=>setTimeout(r,5000))]);api.server.closeAllConnections();await api.close();fs.writeFileSync(output+'/server.log',logs.join(''));}

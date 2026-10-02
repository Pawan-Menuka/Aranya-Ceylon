import fs from 'node:fs';
import net from 'node:net';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { startFixtureApi, fixtureSecret } from './fixture-api.mjs';
import { loadPlaywright } from './browser.mjs';
import { frontendSource } from './source.mjs';

const output='artifacts/performance/phase-three-checks',base='http://127.0.0.1:3101';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const {sourceFingerprint}=frontendSource(path.resolve('aranya-next'));
const fixtureSha256=hash(fs.readFileSync('scripts/performance/fixtures/catalog.json'));
const mediaFixtureSha256=hash(fs.readFileSync('scripts/performance/media-fixture.tsx'));
const build=JSON.parse(fs.readFileSync('aranya-next/.performance-build/baseline-source.json'));
if(build.sourceFingerprint!==sourceFingerprint||build.fixtureSha256!==fixtureSha256||build.mediaFixtureSha256!==mediaFixtureSha256||build.port!==3101||build.apiPort!==4101)throw new Error('Build differs from source/fixtures/ports; run a fresh performance build.');
for(const port of [3101,4101])await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});
fs.mkdirSync(output,{recursive:true});
const api=await startFixtureApi();
const server=spawn(process.execPath,['aranya-next/node_modules/next/dist/bin/next','start','aranya-next/.performance-build','--hostname','127.0.0.1','--port','3101'],{env:{...process.env,NODE_ENV:'production',NEXT_PUBLIC_API_URL:'http://127.0.0.1:4101',NEXT_PUBLIC_SITE_URL:base,NEXT_PUBLIC_ENABLE_DEMO:'false',MARKET_COOKIE_SECRET:fixtureSecret},stdio:['ignore','pipe','pipe']});
const log=[],checks=[],errors=[];let browser,page,current;
server.stdout.on('data',b=>log.push(b.toString()));server.stderr.on('data',b=>log.push(b.toString()));
const save=()=>fs.writeFileSync(output+'/checks.json',JSON.stringify(checks,null,2));
async function check(name,run){current=name;const start=Date.now(),detail=await run();checks.push({name,passed:true,elapsedMs:Date.now()-start,...detail});save();console.log('Passed: '+name);}
const loaded=async(p,selector)=>{
  // Host polling also works when page scripts/timers are disabled.
  const deadline=Date.now()+20000;let state;
  do{state=await p.evaluate(s=>{const img=document.querySelector(s);return img?{complete:img.complete,naturalWidth:img.naturalWidth,src:img.getAttribute('src'),currentSrc:img.currentSrc}:null;},selector);
    if(state?.complete&&state.naturalWidth>0){await p.evaluate(async s=>{await document.querySelector(s).decode();},selector);await new Promise(r=>setTimeout(r,200));return;}await new Promise(r=>setTimeout(r,100));
  }while(Date.now()<deadline);
  throw new Error('Image did not load: '+selector+' '+JSON.stringify(state));
};
async function context(options={}){const c=await browser.newContext({viewport:{width:1440,height:900},...options});await c.addInitScript(()=>localStorage.setItem('aranya-market-ack','1'));page=await c.newPage();page.on('pageerror',e=>errors.push(e.message));return {c,p:page};}
try{
  let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/about',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}if(!ready)throw new Error('Next readiness timed out.');
  const {chromium}=await loadPlaywright();browser=await chromium.launch({headless:true,...(process.env.PERF_BROWSER_CHANNEL?{channel:process.env.PERF_BROWSER_CHANNEL}:{})});
  fs.writeFileSync(output+'/environment.json',JSON.stringify({sourceFingerprint,fixtureSha256,mediaFixtureSha256,node:process.version,browser:browser.version(),limits:['Public fixture API; no real authentication/payment','Extra component fixture route exists only in the isolated build','Local cache/image-transform checks do not verify hosted CDN behavior']},null,2));
  await check('Versioned media is immutable; original mutable paths retain revalidation',async()=>{
    const manifest=JSON.parse(fs.readFileSync('aranya-next/src/lib/media-manifest.json'));
    const routes=[manifest.images['/images/about/about-hero.webp'],manifest.heroPrefix+'/desktop/frame_0001.webp',manifest.heroPrefix+'/poster.webp'];
    const results=[];
    for(const route of routes){const response=await fetch(base+route),bytes=Buffer.from(await response.arrayBuffer());const control=response.headers.get('cache-control');
      if(!response.ok||!control?.includes('max-age=31536000')||!control.includes('immutable'))throw new Error('Versioned cache policy missing');
      const original=route.replace(/^\/media\/[a-f0-9]{16}/,'');if(hash(bytes)!==hash(fs.readFileSync('aranya-next/public'+original)))throw new Error('Versioned bytes differ from source');
      const etag=response.headers.get('etag');
      const conditionalStatus=await new Promise((resolve,reject)=>{http.get(base+route,{headers:{'if-none-match':etag}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject);});
      if(conditionalStatus!==304)throw new Error('Conditional static reuse failed: '+conditionalStatus);
      results.push({path:route,cacheControl:control,conditionalStatus});
    }
    const raw=await fetch(base+'/hero/poster.webp',{method:'HEAD'});if(raw.headers.get('cache-control')?.includes('immutable'))throw new Error('Mutable original received immutable caching');
    const optimized='/_next/image?url='+encodeURIComponent(manifest.images['/images/about/about-hero.webp'])+'&w=80&q=75';
    const first=await fetch(base+optimized),optimizedBytes=(await first.arrayBuffer()).byteLength;
    let second,optimizedControl;
    for(let i=0;i<10;i++){second=await fetch(base+optimized);optimizedControl=second.headers.get('cache-control');await second.arrayBuffer();if(second.headers.get('x-nextjs-cache')==='HIT')break;await new Promise(r=>setTimeout(r,200));}
    if(!first.ok||!second.ok||!optimizedControl?.includes('max-age=31536000')||second.headers.get('x-nextjs-cache')!=='HIT')throw new Error('Versioned image transform cache/reuse failed: '+JSON.stringify({firstStatus:first.status,secondStatus:second.status,control:optimizedControl,firstCache:first.headers.get('x-nextjs-cache'),secondCache:second.headers.get('x-nextjs-cache')}));
    return {versioned:results,originalCacheControl:raw.headers.get('cache-control'),optimized:{cacheControl:optimizedControl,firstCache:first.headers.get('x-nextjs-cache'),repeatCache:second.headers.get('x-nextjs-cache'),width:80,bytes:optimizedBytes}};
  });
  for(const profile of ['desktop','mobile']){
    const options=profile==='mobile'?{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}:{};
    const {c,p}=await context({...options,javaScriptEnabled:false});
    await check(profile+' photography is visible with JavaScript disabled',async()=>{
      await p.goto(base+'/about',{waitUntil:'domcontentloaded'});await loaded(p,'#about-hero img');
      const origin=p.locator('#about-origin');await origin.scrollIntoViewIfNeeded();await loaded(p,'#about-origin img');
      const detail=await origin.evaluate(el=>{const img=el.querySelector('img');return {naturalWidth:img.naturalWidth,visible:!!el.getBoundingClientRect().height&&getComputedStyle(el.closest('[data-scroll-reveal]')).opacity==='1',fit:getComputedStyle(img).objectFit};});
      if(!detail.visible||detail.fit!=='cover')throw new Error('No-JS image/reveal visibility failed');
      if(await p.locator('script[src="/image-slot.js"],image-slot').count())throw new Error('Visitor editor runtime still mounted');
      await p.screenshot({path:output+'/'+profile+'-about-no-js.png'});
      await p.goto(base,{waitUntil:'domcontentloaded'});await loaded(p,'[data-hero] img');await p.screenshot({path:output+'/'+profile+'-home-no-js.png'});
      return detail;
    });await c.close();
    const live=await context(options),requests=[];live.p.on('request',r=>requests.push(r.url()));
    await check(profile+' poster is preloaded once and visitor pages omit editing downloads',async()=>{
      const cdp=await live.c.newCDPSession(live.p),traceEvents=[],waterfall=new Map();
      await cdp.send('Network.enable');
      cdp.on('Network.requestWillBeSent',e=>{const u=new URL(e.request.url);if(!['http:','https:'].includes(u.protocol))return;const asset=u.searchParams.get('url');waterfall.set(e.requestId,{path:u.pathname,assetPath:asset?new URL(asset,base).pathname:null,type:e.type,priority:e.request.initialPriority,startSeconds:e.timestamp});});
      cdp.on('Network.responseReceived',e=>{const row=waterfall.get(e.requestId);if(row)Object.assign(row,{responseSeconds:e.timestamp,status:e.response.status,fromDiskCache:!!e.response.fromDiskCache});});
      cdp.on('Network.loadingFinished',e=>{const row=waterfall.get(e.requestId);if(row)Object.assign(row,{endSeconds:e.timestamp,encodedBytes:e.encodedDataLength});});
      cdp.on('Tracing.dataCollected',e=>traceEvents.push(...e.value));
      await cdp.send('Tracing.start',{categories:'devtools.timeline,v8.execute,blink.user_timing,loading',transferMode:'ReportEvents'});
      await live.p.goto(base,{waitUntil:'domcontentloaded'});await loaded(live.p,'[data-hero] img');await live.p.waitForTimeout(3000);
      const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');await complete;
      fs.writeFileSync(output+'/'+profile+'-initial-load-trace.json',JSON.stringify({traceEvents},(key,value)=>{if(/cookie|authorization|headers|token/i.test(key))return '[omitted]';if(typeof value==='string'&&/^https?:\/\//.test(value)){try{const u=new URL(value);return u.origin+u.pathname;}catch{}}return value;}));
      const earliest=Math.min(...[...waterfall.values()].map(r=>r.startSeconds));
      fs.writeFileSync(output+'/'+profile+'-initial-waterfall.json',JSON.stringify([...waterfall.values()].map(({startSeconds,responseSeconds,endSeconds,...r})=>({...r,startMs:Math.round((startSeconds-earliest)*1000),responseMs:responseSeconds===undefined?null:Math.round((responseSeconds-earliest)*1000),endMs:endSeconds===undefined?null:Math.round((endSeconds-earliest)*1000)})),null,2));await cdp.detach();
      const posters=requests.filter(url=>{const u=new URL(url);return (u.pathname.includes('/poster.webp')||u.searchParams.get('url')?.endsWith('/poster.webp'));});
      const editing=requests.filter(url=>/image-slot\.js|\.image-slots\.state\.json/.test(url));
      const preload=await live.p.locator('link[rel="preload"][as="image"]').count();
      if(posters.length!==1||!preload||editing.length)throw new Error('Poster duplicated or editor fetched');
      await live.p.screenshot({path:output+'/'+profile+'-home.png'});return {posterRequests:posters.length,preloadLinks:preload,editorRequests:editing.length};
    });
    await check(profile+' gallery and cart thumbnails choose small responsive variants',async()=>{
      const fresh=await context(options);await fresh.p.goto(base+'/performance-fixtures/media',{waitUntil:'domcontentloaded'});
      await fresh.p.locator('img[sizes="62px"]').scrollIntoViewIfNeeded();await loaded(fresh.p,'img[sizes="62px"]');
      const freshThumbnail=await fresh.p.locator('img[sizes="62px"]').evaluate(img=>({requestedWidth:Number(new URL(img.currentSrc).searchParams.get('w')),sizes:img.sizes}));
      if(freshThumbnail.requestedWidth>128)throw new Error('Fresh small thumbnail is oversized');await fresh.c.close();page=live.p;
      await live.p.goto(base+'/products/ceylon-cinnamon-quills',{waitUntil:'domcontentloaded'});
      const thumb=live.p.getByRole('button',{name:'Detail',exact:true}).locator('img');await thumb.waitFor();await thumb.scrollIntoViewIfNeeded();
      await live.p.waitForFunction(()=>document.querySelector('button[aria-label="Detail"] img')?.naturalWidth>0);
      const thumbnail=await thumb.evaluate(img=>({sizes:img.sizes,requestedWidth:Number(new URL(img.currentSrc).searchParams.get('w')),naturalWidth:img.naturalWidth,renderedWidth:img.getBoundingClientRect().width}));
      if(thumbnail.requestedWidth>160||thumbnail.sizes!=='74px')throw new Error('Gallery thumbnail is oversized');
      await live.p.getByRole('button',{name:'Detail',exact:true}).click();await loaded(live.p,'button[aria-label="Detail"] img');
      await live.p.screenshot({path:output+'/'+profile+'-gallery-detail.png'});
      const cachedImages=new Set(requests),add=live.p.getByRole('button',{name:/Add to (Cart|Basket)/i}).first();const addStart=await live.p.evaluate(()=>performance.now());await add.click();
      const cartImage=live.p.locator('img[sizes="62px"]').first();await cartImage.waitFor();await cartImage.scrollIntoViewIfNeeded();await live.p.waitForFunction(()=>document.querySelector('img[sizes="62px"]')?.naturalWidth>0);
      const cart=await cartImage.evaluate((img,start)=>({sizes:img.sizes,currentSrc:img.currentSrc,requestedWidth:Number(new URL(img.currentSrc).searchParams.get('w')),renderedWidth:img.getBoundingClientRect().width,newTransferBytes:performance.getEntriesByType('resource').filter(r=>r.name===img.currentSrc&&r.startTime>=start).reduce((sum,r)=>sum+r.transferSize,0)}),addStart);
      const reusedLargerCachedVariant=cart.requestedWidth>128&&cachedImages.has(cart.currentSrc)&&cart.newTransferBytes===0;
      if(cart.requestedWidth>128&&!reusedLargerCachedVariant)throw new Error('Cart thumbnail downloaded an oversized variant: '+JSON.stringify(cart));
      delete cart.currentSrc;await live.p.screenshot({path:output+'/'+profile+'-cart.png'});return {freshSmallThumbnail:freshThumbnail,galleryThumbnail:thumbnail,cartThumbnail:{...cart,reusedLargerCachedVariant}};
    });await live.c.close();
  }
  const {c,p}=await context();
  await check('Local, Cloudinary, shape/fit/position and empty-slot contracts remain available',async()=>{
    await p.goto(base+'/performance-fixtures/media',{waitUntil:'domcontentloaded'});await loaded(p,'#fixture-local img');await loaded(p,'#fixture-remote img');
    const properties=await p.evaluate(()=>{const local=document.querySelector('#fixture-local img'),remote=document.querySelector('#fixture-remote img'),missing=document.querySelector('#fixture-missing');return {radius:getComputedStyle(local.parentElement).borderRadius,position:getComputedStyle(local).objectPosition,remoteFit:getComputedStyle(remote).objectFit,remoteSource:new URL(remote.currentSrc).searchParams.get('url'),missingImages:missing.querySelectorAll('img').length,caption:missing.textContent};});
    if(properties.radius!=='50%'||properties.position!=='40% 60%'||properties.remoteFit!=='contain'||!properties.remoteSource?.startsWith('https://res.cloudinary.com/')||properties.missingImages||properties.caption!=='Missing photography')throw new Error('Slot display contract changed');
    await p.screenshot({path:output+'/slot-contracts.png'});return properties;
  });await c.close();
  const author=await context();
  await author.c.addInitScript(()=>{window.__editorWrites=[];window.omelette={writeFile:(file,body)=>window.__editorWrites.push({file,value:JSON.parse(body)})};});
  const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l5cAAAAASUVORK5CYII=';
  await author.c.route('**/.image-slots.state.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({'fixture-editor-modern':{u:pixel,s:2,x:8,y:-6},'fixture-editor-legacy':pixel})}));
  await check('Opt-in editor retains both saved sidecar formats and commits crop changes',async()=>{
    const seen=[];author.p.on('request',r=>seen.push(new URL(r.url()).pathname));
    await author.p.goto(base+'/performance-fixtures/media',{waitUntil:'domcontentloaded'});await author.p.waitForTimeout(500);
    if(seen.some(url=>/image-slot\.js|\.image-slots\.state/.test(url)))throw new Error('Editor loaded before opt-in');
    await author.p.getByRole('button',{name:'Enable fixture editor'}).click();
    await author.p.waitForFunction(()=>document.querySelector('image-slot#fixture-editor-modern')?._view?.s===2);
    const legacy=await author.p.locator('image-slot#fixture-editor-legacy').evaluate(el=>el._view.s);if(legacy!==1)throw new Error('Legacy sidecar format lost');
    const modern=author.p.locator('image-slot#fixture-editor-modern');await modern.dblclick();await modern.hover();await author.p.mouse.wheel(0,-150);await author.p.waitForTimeout(200);await modern.dblclick();
    await author.p.waitForFunction(()=>window.__editorWrites.length>0);
    const result=await author.p.evaluate(()=>{const write=window.__editorWrites.at(-1),v=write.value['fixture-editor-modern'];return {file:write.file,scale:v.s,hasOriginalImage:!!v.u,hasPan:Number.isFinite(v.x)&&Number.isFinite(v.y),legacyPreserved:typeof write.value['fixture-editor-legacy']==='string'};});
    if(result.file!=='.image-slots.state.json'||result.scale<=2||!result.hasOriginalImage||!result.hasPan||!result.legacyPreserved)throw new Error('Editor persistence/crop contract failed');
    await author.p.screenshot({path:output+'/opt-in-editor.png'});return result;
  });await author.c.close();
  if(errors.length)throw new Error('Browser page errors: '+errors.join('; '));
}catch(error){checks.push({name:current,passed:false,error:error.message.replace(/https?:\/\/[^\s]+/g,'[url]')});save();if(page)await page.screenshot({path:output+'/failure.png'}).catch(()=>{});console.error(error.message);process.exitCode=1;}
finally{if(browser)await browser.close();server.kill();await Promise.race([new Promise(r=>server.once('exit',r)),new Promise(r=>setTimeout(r,5000))]);api.server.closeAllConnections();await api.close();fs.writeFileSync(output+'/server.log',log.join(''));}

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { signedMarket } from './fixture-api.mjs';

export async function loadPlaywright() {
  try { return await import('playwright'); }
  catch {
    if (!process.env.PERF_NODE_MODULES) throw new Error('Install playwright@1.62.1 or set PERF_NODE_MODULES to a directory containing it.');
    return createRequire(path.join(path.resolve(process.env.PERF_NODE_MODULES),'package.json'))('playwright');
  }
}

// Browser-local observations only; records no HTML, headers, cookie or auth values.
export function installObservers() {
  performance.setResourceTimingBufferSize(2500);
  const metrics={lcpMs:null,cls:0,longTasks:[],events:[],clicks:[],supported:PerformanceObserver.supportedEntryTypes};
  window.__perf=metrics;
  let sessionValue=0,sessionFirst=0,sessionLast=0;
  function observe(type,fn,extra={}) {
    if(!metrics.supported.includes(type))return;
    new PerformanceObserver(list=>list.getEntries().forEach(fn)).observe({type,buffered:true,...extra});
  }
  observe('largest-contentful-paint',e=>{metrics.lcpMs=e.startTime});
  observe('layout-shift',e=>{
    if(e.hadRecentInput)return;
    if(e.startTime-sessionLast>1000||e.startTime-sessionFirst>5000){sessionFirst=e.startTime;sessionValue=0;}
    sessionLast=e.startTime;sessionValue+=e.value;metrics.cls=Math.max(metrics.cls,sessionValue);
  });
  observe('longtask',e=>metrics.longTasks.push({startMs:e.startTime,durationMs:e.duration}));
  observe('event',e=>{if(e.interactionId)metrics.events.push({durationMs:e.duration,interactionId:e.interactionId,name:e.name})},{durationThreshold:16});
  document.addEventListener('click',()=>{
    const click={atMs:performance.now(),inputNextFrameMs:null,loadingFeedbackMs:null};metrics.clicks.push(click);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{click.inputNextFrameMs=performance.now()-click.atMs}));
  },true);
  new MutationObserver(()=>{
    const click=metrics.clicks.at(-1),node=document.querySelector('[data-route-loading]');
    if(!click||click.loadingFeedbackMs!==null||!node)return;
    const b=node.getBoundingClientRect();
    if(b.width&&b.height)click.loadingFeedbackMs=performance.now()-click.atMs;
  }).observe(document,{childList:true,subtree:true});
}

const visibleCheck = selector => {
  const node=document.querySelector(selector);
  if(!node)return false;
  const b=node.getBoundingClientRect();const style=getComputedStyle(node);
  return b.width>0&&b.height>0&&style.visibility!=='hidden'&&style.display!=='none';
};

function networkRecorder(cdp) {
  const entries=new Map();
  cdp.on('Network.requestWillBeSent',e=>{
    const u=new URL(e.request.url);
    if(!['http:','https:'].includes(u.protocol))return;
    let assetPath=u.pathname;
    if(u.pathname==='/_next/image'&&u.searchParams.has('url')){try{assetPath=new URL(u.searchParams.get('url'),u.origin).pathname;}catch{}}
    entries.set(e.requestId,{path:u.pathname,assetPath,type:e.type,rsc:u.searchParams.has('_rsc'),started:Date.now(),bytes:0,done:false,status:null,failed:false});
  });
  cdp.on('Network.responseReceived',e=>{const row=entries.get(e.requestId);if(row){row.status=e.response.status;row.cached=!!(e.response.fromDiskCache||e.response.fromServiceWorker);row.mime=e.response.mimeType;row.ttfbMs=e.response.timing?e.response.timing.receiveHeadersEnd-e.response.timing.sendStart:null;}});
  cdp.on('Network.loadingFinished',e=>{const row=entries.get(e.requestId);if(row){row.bytes=e.encodedDataLength;row.done=true;}});
  cdp.on('Network.loadingFailed',e=>{const row=entries.get(e.requestId);if(row){row.failed=true;row.cancelled=!!e.canceled;}});
  return entries;
}

async function collect(page,network,stageSince) {
  const browserMetrics=await page.evaluate(()=>{
    const p=window.__perf;
    const nav=performance.getEntriesByType('navigation')[0];
    return {lcpMs:p.lcpMs,cls:p.cls,longTasks:p.longTasks,events:p.events,clicks:p.clicks,
      navigation:nav?{ttfbMs:nav.responseStart,domContentLoadedMs:nav.domContentLoadedEventEnd,loadMs:nav.loadEventEnd,transferBytes:nav.transferSize}:null,
      resourceCount:performance.getEntriesByType('resource').length};
  });
  const rows=[...network.values()].filter(r=>r.started>=stageSince);
  return {...browserMetrics,network:{requests:rows.length,completed:rows.filter(r=>r.done).length,inFlight:rows.filter(r=>!r.done&&!r.failed).length,
    completedTransferBytes:rows.reduce((n,r)=>n+r.bytes,0),heroRequests:rows.filter(r=>/\/hero\/.*frame_/.test(r.path)).length,
    desktopHeroRequests:rows.filter(r=>r.path.includes('/hero/desktop/')).length,mobileHeroRequests:rows.filter(r=>r.path.includes('/hero/mobile/')).length,
    completedHeroBytes:rows.filter(r=>r.assetPath.includes('/hero/')).reduce((n,r)=>n+r.bytes,0),
    jsTransferBytes:rows.filter(r=>r.type==='Script').reduce((n,r)=>n+r.bytes,0),
    apiAndRsc:rows.filter(r=>r.rsc||r.path.startsWith('/api/')).map(r=>({path:r.path,rsc:r.rsc,status:r.status,ttfbMs:r.ttfbMs,bytes:r.bytes})),
    statusFailures:rows.filter(r=>r.status>=400&&!r.path.startsWith('/api/auth/')).map(r=>({path:r.path,status:r.status})),
    cancelledRequests:rows.filter(r=>r.cancelled).length}};
}

async function navigateByClick(page,locator,target,readySelector,timeout=15000) {
  await locator.waitFor({state:'visible',timeout:15000});
  const before=await page.evaluate(()=>window.__perf.clicks.length);
  const clickWall=Date.now();
  await locator.click({timeout:15000});
  await page.waitForFunction(({target,selector})=>location.pathname===target&&!!document.querySelector(selector),{target,selector:readySelector},{timeout});
  const timing=await page.evaluate(({before})=>{
    const click=window.__perf.clicks[before];
    return {clickToContentMs:click?performance.now()-click.atMs:null,inputNextFrameMs:click?.inputNextFrameMs??null,loadingFeedbackMs:click?.loadingFeedbackMs??null};
  },{before});
  return {...timing,automationElapsedMs:Date.now()-clickWall};
}

export async function benchmarkBrowser({baseUrl,output,config,runs=config.runs,profiles=Object.keys(config.profiles),data,smoke=false,diagnosticLoadingHeight}) {
  const {chromium}=await loadPlaywright();
  const browser=await chromium.launch({headless:true,...(process.env.PERF_BROWSER_CHANNEL?{channel:process.env.PERF_BROWSER_CHANNEL}:{})});
  const records=[];
  const product=data.products.find(p=>p.slug==='ceylon-cinnamon-quills')||data.products[0];
  if(!product)throw new Error('Fixture catalog must contain an active product.');
  const article=data.blogs[0]?.slug;
  const save=()=>fs.writeFileSync(path.join(output,'browser.json'),JSON.stringify({browser:browser.version(),profiles:config.profiles,runs,observationMs:config.observationMs,
    dataset:data.source,method:'Real Chromium; API backed by isolated deterministic public fixture data. Cold/warm refers to browser cache; server/Data Cache is warm after build/priming.',records},null,2));
  try {
    for(const profileName of profiles)for(let run=1;run<=runs;run++) {
      const profile=config.profiles[profileName];
      const context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:profile.deviceScaleFactor,isMobile:profile.isMobile,hasTouch:profile.hasTouch,locale:'en-US',timezoneId:'Asia/Colombo'});
      await context.addInitScript(installObservers);
      await context.addInitScript(()=>{localStorage.setItem('aranya-market-ack','1')});
      // Separate intervention experiments only; principal runs omit this option.
      if(diagnosticLoadingHeight)await context.addInitScript(height=>{
        new MutationObserver(()=>{
          const node=document.querySelector('[data-route-loading]');
          if(node)node.style.minHeight=height;
        }).observe(document,{childList:true,subtree:true});
      },diagnosticLoadingHeight);
      // Alternate signed fixture markets between runs. Real server secret is never loaded here.
      const market=run%2?'international':'local';
      await context.addCookies([{name:'x-market',value:signedMarket(market),url:baseUrl,httpOnly:true,sameSite:'Lax'}]);
      const page=await context.newPage();
      page.setDefaultTimeout(30000);
      const cdp=await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Emulation.setCPUThrottlingRate',{rate:profile.cpuRate});
      await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:profile.latencyMs,downloadThroughput:profile.downloadBytesPerSecond,uploadThroughput:profile.uploadBytesPerSecond});
      const network=networkRecorder(cdp);
      const errors=[];page.on('pageerror',e=>errors.push(e.name+': '+e.message.replace(/https?:\/\/[^\s]+/g,'[url]')));
      try {
        for(const cache of ['cold','warm']) {
          if(cache==='cold')await cdp.send('Network.clearBrowserCache');
          await cdp.send('Network.setCacheDisabled',{cacheDisabled:false});
          let since=Date.now();
          const home=await page.goto(baseUrl,{waitUntil:'domcontentloaded',timeout:45000});
          await page.waitForFunction(()=>!!document.querySelector('[data-hero]'),null,{timeout:30000});
          await page.waitForTimeout(config.observationMs);
          const homeMetrics=await collect(page,network,since);
          records.push({profile:profileName,run,market,cache,step:'home',status:home.status(),...homeMetrics});save();
          if(run===1&&cache==='cold')await page.screenshot({path:path.join(output,`${profileName}-home.png`)});
          const flows=[
            ['catalog','/products',page.getByRole('link',{name:'Shop',exact:true}).first(),'h1'],
            ['product',`/products/${product.slug}`,page.locator(`a[href="/products/${product.slug}"]`).first(),'[data-screen-label="Product detail"]'],
          ];
          for(const[step,target,link,selector]of flows){
            since=Date.now();let timing;
            try {timing=await navigateByClick(page,link,target,selector,config.navigationObservationMs);}
            catch(error){
              records.push({profile:profileName,run,market,cache,step:'navigation-timeout',target,lastPath:new URL(page.url()).pathname,deadlineMs:config.navigationObservationMs,error:error.message.replace(/https?:\/\/[^\s]+/g,'[url]'),...await collect(page,network,since)});save();
              // Keep the failed click sample. A separate hard arrival lets the remaining screens be inspected.
              since=Date.now();await page.goto(baseUrl+target,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForFunction(visibleCheck,selector);
              timing={arrivalMode:'hard-navigation-after-failed-click',clickToContentMs:null};
            }
            await page.waitForTimeout(600);
            records.push({profile:profileName,run,market,cache,step,...timing,...await collect(page,network,since)});save();
            if(run===1&&cache==='cold')await page.screenshot({path:path.join(output,`${profileName}-${step}.png`)});
          }
          since=Date.now();
          const clickCount=await page.evaluate(()=>window.__perf.clicks.length);
          await page.getByRole('button',{name:/^Add to Cart —/}).first().click();
          await page.locator('aside a[href="/checkout"]').waitFor({state:'visible'});
          const cartTiming=await page.evaluate(before=>({clickToContentMs:performance.now()-window.__perf.clicks[before].atMs}),clickCount);
          // Wait for this fixture's add to settle before leaving the drawer; not a real DB mutation.
          await page.waitForTimeout(700);
          records.push({profile:profileName,run,market,cache,step:'cart-drawer',...cartTiming,...await collect(page,network,since)});save();
          if(run===1&&cache==='cold')await page.screenshot({path:path.join(output,`${profileName}-cart.png`)});
          since=Date.now();const checkoutTiming=await navigateByClick(page,page.locator('aside a[href="/checkout"]'),'/checkout','[data-screen-label="Checkout"]');
          await page.waitForTimeout(600);records.push({profile:profileName,run,market,cache,step:'checkout',...checkoutTiming,...await collect(page,network,since)});save();
          if(run===1&&cache==='cold')await page.screenshot({path:path.join(output,`${profileName}-checkout.png`)});
          // Supplemental arrivals; do not submit authentication/payment forms.
          for(const[step,target,selector]of [['account','/account','[data-screen-label="Account — sign in"]'],['admin','/admin','h1'],...(article?[['article',`/journal/${article}`,'[data-screen-label="Article"]']]:[])]){
            since=Date.now();await page.goto(baseUrl+target,{waitUntil:'domcontentloaded'});await page.waitForFunction(visibleCheck,selector);await page.waitForTimeout(600);
            records.push({profile:profileName,run,market,cache,step,...await collect(page,network,since)});save();
            if(run===1&&cache==='cold')await page.screenshot({path:path.join(output,`${profileName}-${step}.png`)});
          }
          console.log(`Browser ${profileName} run ${run}/${runs} ${cache}: principal flow and arrivals recorded.`);
        }
      } catch(error) {
        records.push({profile:profileName,run,market,step:'flow-error',lastPath:new URL(page.url()).pathname,error:error.message.replace(/https?:\/\/[^\s]+/g,'[url]')});
        await page.screenshot({path:path.join(output,`${profileName}-run-${run}-error.png`)}).catch(()=>{});save();
        console.error(`Browser ${profileName} run ${run}: flow check failed; continuing remaining runs.`);
      } finally {if(errors.length)records.push({profile:profileName,run,step:'page-errors',errors});save();await context.close();}
    }
  } finally {await browser.close();}
  // The runner writes summaries before setting its failing smoke/baseline exit code.
  return records;
}

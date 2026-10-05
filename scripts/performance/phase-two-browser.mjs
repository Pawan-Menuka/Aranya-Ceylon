// Real-frame scheduling/visual checks against the isolated production fixture build.
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { startFixtureApi, fixtureSecret } from './fixture-api.mjs';
import { loadPlaywright } from './browser.mjs';
import { frontendSource } from './source.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const frontend=path.resolve('aranya-next');
const {sourceFingerprint}=frontendSource(frontend),fixtureSha256=hash(fs.readFileSync('scripts/performance/fixtures/catalog.json'));
const build=JSON.parse(fs.readFileSync('aranya-next/.performance-build/baseline-source.json'));
if(build.sourceFingerprint!==sourceFingerprint||build.fixtureSha256!==fixtureSha256||build.port!==3101||build.apiPort!==4101)throw new Error('Build differs from source/fixture/ports; run the performance build first.');
const output='artifacts/performance/phase-two-checks';fs.mkdirSync(output,{recursive:true});
async function available(port){await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});}
await available(3101);await available(4101);
const fixture=await startFixtureApi(),base='http://127.0.0.1:3101';
const server=spawn(process.execPath,['aranya-next/node_modules/next/dist/bin/next','start','aranya-next/.performance-build','--hostname','127.0.0.1','--port','3101'],{
  env:{...process.env,NODE_ENV:'production',NEXT_PUBLIC_API_URL:'http://127.0.0.1:4101',NEXT_PUBLIC_SITE_URL:base,NEXT_PUBLIC_ENABLE_DEMO:'false',MARKET_COOKIE_SECRET:fixtureSecret},stdio:['ignore','pipe','pipe']});
const log=[];server.stdout.on('data',b=>log.push(b.toString()));server.stderr.on('data',b=>log.push(b.toString()));
const checks=[],errors=[];let browser,current,page;
const save=()=>fs.writeFileSync(output+'/checks.json',JSON.stringify(checks,null,2));
async function check(name,operation){current=name;const start=Date.now();const detail=await operation();checks.push({name,passed:true,elapsedMs:Date.now()-start,...detail});save();console.log('Passed: '+name);}
async function context(options={}){
  const c=await browser.newContext({viewport:{width:1440,height:900},...options});await c.addInitScript(()=>localStorage.setItem('aranya-market-ack','1'));
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));return {c,p};
}
const stats=p=>p.evaluate(()=>{const canvas=document.querySelector('[data-hero-frames]'),dust=document.querySelector('[data-hero-dust]');return {
  cached:Number(canvas?.dataset.frameCached),active:Number(canvas?.dataset.frameActive),wanted:Number(canvas?.dataset.frameWindow),loop:canvas?.dataset.frameLoop,dustLoop:dust?.dataset.dustLoop,
  index:Number(canvas?.dataset.frameIndex),opacity:canvas?getComputedStyle(canvas).opacity:null,staticMode:document.querySelector('[data-hero]')?.dataset.heroStatic};});
async function seek(p,progress){await p.evaluate(progress=>{const wrap=document.querySelector('[data-hero]');window.scrollTo(0,wrap.offsetTop+(wrap.offsetHeight-innerHeight)*progress);},progress);}
try{
  let ready=false;for(let i=0;i<60;i++){if(server.exitCode!==null)throw new Error('Next exited.');try{if((await fetch(base+'/about',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}if(!ready)throw new Error('Readiness timed out.');
  const {chromium}=await loadPlaywright();browser=await chromium.launch({headless:true,...(process.env.PERF_BROWSER_CHANNEL?{channel:process.env.PERF_BROWSER_CHANNEL}:{})});
  fs.writeFileSync(output+'/environment.json',JSON.stringify({sourceFingerprint,fixtureSha256,node:process.version,browser:browser.version(),limits:['Public fixture API; no real authentication/payment','Visibility falls back to injected document.hidden in headless Chrome','saveData is injected; reduced motion uses browser emulation','Scroll trace is separate from the principal timing benchmark']},null,2));
  let c;({c,p:page}=await context());const requests=[],failedFrames=[];page.on('request',r=>{const u=new URL(r.url());if(u.pathname.includes('/hero/')&&u.pathname.includes('frame_'))requests.push({path:u.pathname,at:Date.now()});});
  page.on('requestfailed',r=>{if(new URL(r.url()).pathname.includes('/frame_'))failedFrames.push({at:Date.now(),error:r.failure()?.errorText});});
  await check('Desktop idle uses four frames and interpolation stops',async()=>{
    await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('[data-hero-frames]')?.dataset.frameCached==='4',{},{timeout:10000});
    await page.waitForTimeout(6500);const s=await stats(page);
      if(requests.length!==4||s.wanted!==4||s.loop!=='false'||s.active!==0||s.opacity!=='0')throw new Error('Idle hero scheduling/presentation changed');
    await page.screenshot({path:output+'/desktop-idle.png'});return {requests:requests.length,...s};
  });
  await check('Fast forward/reverse scroll keeps a painted frame within resource bounds',async()=>{
    const cdp=await c.newCDPSession(page),traceEvents=[];cdp.on('Tracing.dataCollected',e=>traceEvents.push(...e.value));
    await cdp.send('Tracing.start',{categories:'devtools.timeline,v8.execute,blink.user_timing',transferMode:'ReportEvents'});
    await page.evaluate(()=>{window.__heroMax={cached:0,active:0};const canvas=document.querySelector('[data-hero-frames]');new MutationObserver(()=>{
      window.__heroMax.cached=Math.max(window.__heroMax.cached,Number(canvas.dataset.frameCached));window.__heroMax.active=Math.max(window.__heroMax.active,Number(canvas.dataset.frameActive));window.__heroMax.wanted=Math.max(window.__heroMax.wanted||0,Number(canvas.dataset.frameWindow));
    }).observe(canvas,{attributes:true});});
    for(const p of [0.2,0.55,0.92,0.15]){await seek(page,p);await page.waitForTimeout(600);}
    await page.waitForTimeout(2200);const s=await stats(page),maximum=await page.evaluate(()=>window.__heroMax);
    const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');await complete;
    fs.writeFileSync(output+'/scroll-trace.json',JSON.stringify({traceEvents},(key,value)=>{
      if(/cookie|authorization|headers|token/i.test(key))return '[omitted]';
      if(typeof value==='string'&&/^https?:\/\//.test(value)){try{const u=new URL(value);return u.origin+u.pathname;}catch{}}return value;
    }));await cdp.detach();
    const painted=await page.evaluate(()=>document.querySelector('[data-hero-frames]').getContext('2d').getImageData(50,50,1,1).data[3]>0);
    if(!painted||s.opacity!=='1'||maximum.cached>16||maximum.active>2||maximum.wanted>12||s.loop!=='false')throw new Error('Scroll fallback/bounds/interpolation failed');
    await page.screenshot({path:output+'/desktop-reverse.png'});return {painted,maximum,...s};
  });
  await check('Settled full reveal preserves brand and suspends faded dust',async()=>{
    await seek(page,0.74);await page.waitForTimeout(2300);const s=await stats(page);
    const appearance=await page.evaluate(()=>{const cta=document.querySelector('.hto-cta');return {brandOpacity:cta.parentElement.style.opacity,cta:cta.style.pointerEvents};});
    if(appearance.brandOpacity!=='1'||appearance.cta!=='auto'||s.dustLoop!=='false'||s.loop!=='false')throw new Error('Reveal or faded dust did not settle');
    await page.screenshot({path:output+'/desktop-brand.png'});return {...appearance,...s};
  });
  await check('Navbar retains hero direction and solid appearance thresholds',async()=>{
    const appearance=()=>page.evaluate(()=>{const nav=document.querySelector('nav').parentElement.parentElement.parentElement;return {transform:nav.style.transform,background:nav.children[2].style.background};});
    await seek(page,0);await page.waitForTimeout(600);const start=await appearance();
    await seek(page,0.2);await page.waitForTimeout(600);const down=await appearance();
    await page.evaluate(()=>window.scrollBy(0,-12));await page.waitForTimeout(600);const up=await appearance();
    await seek(page,1.01);await page.waitForTimeout(600);const past=await appearance();
    if(!start.transform.includes('(0')||!down.transform.includes('-112%')||!up.transform.includes('(0')||!past.transform.includes('(0')||past.background!== 'rgb(15, 110, 86)')throw new Error('Navbar direction/appearance changed: '+JSON.stringify({start,down,up,past}));
    return {start,down,up,past};
  });
  await check('Offscreen hero stops new work and both animation loops',async()=>{
    await page.evaluate(()=>window.scrollTo(0,document.querySelector('[data-hero]').offsetHeight+200));await page.waitForTimeout(800);
    const count=requests.length;await page.waitForTimeout(1500);const s=await stats(page);
    if(requests.length!==count||s.active!==0||s.loop!=='false'||s.dustLoop!=='false')throw new Error('Offscreen work continued');return {...s,newRequests:requests.length-count};
  });
  await check('Responsive viewport switches frame folders without a stale generation',async()=>{
    const start=requests.length;await page.setViewportSize({width:390,height:844});await seek(page,0.32);await page.waitForTimeout(2500);
    const fresh=requests.slice(start);const s=await stats(page);
    if(!fresh.length||fresh.some(r=>!r.path.includes('/hero/mobile/'))||s.opacity!=='1'||s.active>2)throw new Error('Responsive frame selection failed');
    await page.screenshot({path:output+'/mobile-scroll.png'});return {requests:fresh.length,...s};
  });
  await check('Visibility pause/resume aborts work and restarts only when visible',async()=>{
    const cdp=await c.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:1000,downloadThroughput:125000,uploadThroughput:62500});
    await seek(page,0.46);await page.waitForTimeout(150);const activeBeforePause=(await stats(page)).active;
    if(!activeBeforePause)throw new Error('No pending frame work for visibility cancellation');
    const other=await c.newPage();await other.goto('about:blank');await other.bringToFront();await page.waitForTimeout(400);
    const native=await page.evaluate(()=>document.hidden);
    if(!native)await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
    await page.waitForTimeout(500);const count=requests.length,s=await stats(page);await page.waitForTimeout(500);
    if(s.loop!=='false'||s.dustLoop!=='false'||s.active!==0||requests.length!==count)throw new Error('Hidden page did not pause');
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    if(!native)await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await other.close();await page.bringToFront();await page.waitForTimeout(700);await cdp.detach();return {activeBeforePause,visibilityMode:native?'native':'injected document.hidden',paused:s,resumed:await stats(page)};
  });
  await check('Leaving home during a delayed frame load stops new requests',async()=>{
    const before=failedFrames.length;
    const cdp=await c.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:400,downloadThroughput:125000,uploadThroughput:62500});
    await seek(page,0.65);await page.waitForTimeout(200);
    await page.evaluate(()=>window.scrollBy(0,-12));await page.waitForTimeout(600);
    const active=(await stats(page)).active;if(!active)throw new Error('No pending frame work to cancel');
    await page.getByRole('link',{name:'Shop',exact:true}).first().click();await page.waitForURL('**/products');
    await page.getByRole('heading',{name:/Every spice/}).waitFor({timeout:15000});
    const count=requests.length;await page.waitForTimeout(1800);
    if(requests.length!==count||await page.locator('[data-hero-frames]').count())throw new Error('Unmount started more frame requests');
    const canceled=failedFrames.slice(before).filter(r=>r.error?.includes('ERR_ABORTED')).length;
    if(!canceled)throw new Error('Pending frame requests were not canceled');
    return {activeBeforeLeave:active,canceledRequests:canceled,newRequestsAfterArrival:requests.length-count};
  });await c.close();
  for(const mode of ['mobile','reduced-motion','save-data']){
    ({c,p:page}=await context(mode==='mobile'?{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}:mode==='reduced-motion'?{reducedMotion:'reduce'}:{}));
    if(mode==='save-data')await c.addInitScript(()=>{const connection=new EventTarget();connection.saveData=true;Object.defineProperty(navigator,'connection',{value:connection});});
    const seen=[];page.on('request',r=>{const u=new URL(r.url());if(u.pathname.includes('/frame_'))seen.push(u.pathname);});
    await check(mode==='mobile'?'Fresh mobile starts only mobile frames':'Static poster respects '+mode,async()=>{
      await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForTimeout(3000);
      if(mode==='mobile'){if(seen.length!==4||seen.some(p=>!p.includes('/hero/mobile/')))throw new Error('Fresh mobile initiated incorrect frames');}
      else {await seek(page,0.5);await page.waitForTimeout(1000);const s=await stats(page);
        if(seen.length||s.staticMode!=='true'||s.opacity!=='0'||s.loop!=='false'||s.dustLoop!=='false')throw new Error('Static mode performed animation work');}
      await page.screenshot({path:output+'/'+mode+'.png'});return {frameRequests:seen.length,...await stats(page)};
    });await c.close();
  }
  ({c,p:page}=await context());await c.route('**/hero/**/frame_*',route=>route.request().url().includes('frame_0001.webp')?route.fulfill({status:404,body:''}):route.continue());
  await check('Missing first frame uses a decoded neighbour or the poster',async()=>{
    await page.goto(base,{waitUntil:'domcontentloaded'});await seek(page,0.015);await page.waitForTimeout(2500);const s=await stats(page);
    const fallback=s.opacity==='0'||await page.evaluate(()=>document.querySelector('[data-hero-frames]').getContext('2d').getImageData(50,50,1,1).data[3]>0);
    if(!fallback||s.active>2||s.cached>16)throw new Error('Missing-frame fallback blank');await page.screenshot({path:output+'/missing-frame.png'});return {fallback,...s};
  });await c.close();
  if(errors.length)throw new Error('Browser page errors: '+errors.join('; '));
}catch(error){checks.push({name:current,passed:false,error:error.message.replace(/https?:\/\/[^\s]+/g,'[url]')});save();if(page)await page.screenshot({path:output+'/failure.png'}).catch(()=>{});console.error(error.message);process.exitCode=1;}
finally{if(browser)await browser.close();server.kill();await Promise.race([new Promise(r=>server.once('exit',r)),new Promise(r=>setTimeout(r,5000))]);fixture.server.closeAllConnections();await fixture.close();fs.writeFileSync(output+'/server.log',log.join(''));}

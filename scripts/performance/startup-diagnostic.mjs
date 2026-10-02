// Same-build intervention: native CDP blocking of speculative RSC during startup.
// Use before rebuilding; live source edits may proceed while the isolated build is frozen.
import fs from 'node:fs';
import net from 'node:net';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { startFixtureApi,fixtureSecret } from './fixture-api.mjs';
import { loadPlaywright,installObservers } from './browser.mjs';
const output='artifacts/performance/startup-diagnostic-'+new Date().toISOString().replaceAll(':','-').replaceAll('.','-');
const base='http://127.0.0.1:3101',hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const build=JSON.parse(fs.readFileSync('aranya-next/.performance-build/baseline-source.json'));
const reference=JSON.parse(fs.readFileSync('artifacts/performance/phase-4-2026-10-01/environment.json'));
if(build.sourceFingerprint!==reference.sourceFingerprint)throw new Error('Diagnostic requires frozen Phase 4 build.');
for(const file of reference.sourceManifest)if(hash(fs.readFileSync('aranya-next/.performance-build/'+file.path))!==file.sha256)throw new Error('Isolated build source changed: '+file.path);
for(const port of [3101,4101])await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});
fs.mkdirSync(output,{recursive:true});
const fixture=await startFixtureApi(),logs=[],records=[];
const server=spawn(process.execPath,['aranya-next/node_modules/next/dist/bin/next','start','aranya-next/.performance-build','--hostname','127.0.0.1','--port','3101'],{env:{...process.env,NODE_ENV:'production',NEXT_PUBLIC_API_URL:'http://127.0.0.1:4101',NEXT_PUBLIC_SITE_URL:base,NEXT_PUBLIC_ENABLE_DEMO:'false',MARKET_COOKIE_SECRET:fixtureSecret},stdio:['ignore','pipe','pipe']});
server.stdout.on('data',b=>logs.push(b.toString()));server.stderr.on('data',b=>logs.push(b.toString()));
let browser;
try {
  let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/about',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}if(!ready)throw new Error('Readiness failed');
  const {chromium}=await loadPlaywright();browser=await chromium.launch({headless:true,...(process.env.PERF_BROWSER_CHANNEL?{channel:process.env.PERF_BROWSER_CHANNEL}:{})});
  fs.writeFileSync(output+'/environment.json',JSON.stringify({sourceFingerprint:build.sourceFingerprint,fixtureSha256:reference.fixtureSha256,fixtureServerSha256:hash(fs.readFileSync('scripts/performance/fixture-api.mjs')),node:process.version,browser:browser.version(),profile:reference.config.profiles.mobile,limits:['Three cold-browser trials per arm; startup intervention only','CDP native blocking preserves HTTP cache behavior','First sample per arm includes Chrome tracing overhead','All real hero assets retained; no live account/database/payment']},null,2));
  for(let run=1;run<=3;run++)for(const arm of run%2?['normal','rsc-blocked']:['rsc-blocked','normal']) {
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await context.addInitScript(installObservers);await context.addInitScript(()=>localStorage.setItem('aranya-market-ack','1'));
    const page=await context.newPage(),errors=[],scripts=[],cdp=await context.newCDPSession(page),trace=[];
    page.on('pageerror',e=>errors.push(e.message));
    await cdp.send('Network.enable');await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:500000,uploadThroughput:250000});
    cdp.on('Network.responseReceived',e=>{if(e.type==='Script')scripts.push(new URL(e.response.url).pathname);});
    if(arm==='rsc-blocked')await cdp.send('Network.setBlockedURLs',{urls:['*?_rsc=*']});
    if(run===1){cdp.on('Tracing.dataCollected',e=>trace.push(...e.value));await cdp.send('Tracing.start',{categories:'devtools.timeline,v8.execute,blink.user_timing',transferMode:'ReportEvents'});}
    await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForTimeout(6000);
    const home=await page.evaluate(()=>({lcpMs:window.__perf.lcpMs,longTasks:window.__perf.longTasks,resources:performance.getEntriesByType('resource').filter(r=>r.initiatorType==='script').map(r=>({path:new URL(r.name).pathname,bytes:r.transferSize})),navigation:performance.getEntriesByType('navigation')[0]?.toJSON()}));
    await cdp.send('Network.setBlockedURLs',{urls:[]});
    const start=performance.now();await page.locator('nav a[href="/products"]').first().click();await page.waitForURL(base+'/products',{timeout:15000});await page.locator('h1').waitFor({state:'visible',timeout:15000});
    const contentMs=performance.now()-start;
    if(run===1){const done=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');await done;fs.writeFileSync(output+'/'+arm+'-trace.json',JSON.stringify({traceEvents:trace},(key,value)=>{/cookie|authorization|headers|token/i.test(key)&&(value='[omitted]');if(typeof value==='string'&&/^https?:\/\//.test(value)){try{const u=new URL(value);return u.origin+u.pathname;}catch{}}return value;}));}
    records.push({run,arm,lcpMs:home.lcpMs,longTaskMs:home.longTasks.reduce((n,t)=>n+t.durationMs,0),longTasks:home.longTasks.length,homeScripts:scripts,homeScriptTransferBytes:home.resources.reduce((n,r)=>n+r.bytes,0),domContentLoadedMs:home.navigation?.domContentLoadedEventEnd,clickToContentMs:Math.round(contentMs),pageErrors:errors});
    fs.writeFileSync(output+'/records.json',JSON.stringify(records,null,2));console.log('Recorded '+arm+' '+run+'/3');await context.close();
  }
} finally {if(browser)await browser.close();server.kill();await Promise.race([new Promise(r=>server.once('exit',r)),new Promise(r=>setTimeout(r,5000))]);fixture.server.closeAllConnections();await fixture.close();fs.writeFileSync(output+'/server.log',logs.join(''));}
console.log('Startup diagnostic saved to '+output);

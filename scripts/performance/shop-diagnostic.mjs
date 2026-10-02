// Same-build cold-browser Shop comparison; no application changes or real API writes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startFixtureApi, signedMarket, fixtureSecret } from './fixture-api.mjs';
import { loadPlaywright, installObservers } from './browser.mjs';
import { frontendSource } from './source.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const frontend=path.join(root,'aranya-next'),build=path.join(frontend,'.performance-build');
const config=JSON.parse(fs.readFileSync(path.join(root,'scripts/performance/config.json')));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const {sourceFingerprint}=frontendSource(frontend);
const fixtureSha256=hash(fs.readFileSync(path.join(root,'scripts/performance/fixtures/catalog.json')));
const previous=JSON.parse(fs.readFileSync(path.join(build,'baseline-source.json')));
if(previous.sourceFingerprint!==sourceFingerprint||previous.fixtureSha256!==fixtureSha256||previous.port!==3101||previous.apiPort!==4101)throw new Error('Build differs from source/fixture/ports; rebuild using the performance runner first.');
const output=path.join(root,'artifacts/performance','shop-diagnostic-'+new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(output,{recursive:true});
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(output,'runner.mjs'));
const baseUrl='http://127.0.0.1:3101';
async function available(port){await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',()=>reject(new Error(`Port ${port} is occupied.`)));s.listen(port,'127.0.0.1',()=>s.close(resolve));});}
await available(3101);await available(4101);
const samples=[],serverLog=[],apiRequests=[];let fixture,server,browser;
const median=a=>{const s=a.filter(Number.isFinite).sort((a,b)=>a-b);return s.length?s[Math.floor(s.length/2)]:null;};
function save(){
  fs.writeFileSync(path.join(output,'samples.json'),JSON.stringify(samples,null,2));
  const groups=[];for(const profile of Object.keys(config.profiles))for(const arm of ['enabled','blocked']){
    const rows=samples.filter(r=>r.profile===profile&&r.arm===arm);
    groups.push({profile,arm,n:rows.length,passed:rows.filter(r=>r.passed).length,timeouts:rows.filter(r=>r.timedOut).length,
      clickToContentMedianMs:median(rows.map(r=>r.clickToContentMs)),loadingFeedbackMedianMs:median(rows.map(r=>r.loadingFeedbackMs)),
      clickToContentRangeMs:rows.some(r=>Number.isFinite(r.clickToContentMs))?[Math.min(...rows.map(r=>r.clickToContentMs).filter(Number.isFinite)),Math.max(...rows.map(r=>r.clickToContentMs).filter(Number.isFinite))]:null,
      completedFramesAtClickMedian:median(rows.map(r=>r.homeNetwork?.completedFrames)),inFlightFramesAtClickMedian:median(rows.map(r=>r.homeNetwork?.inFlightFrames))});
  }
  fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify({groups},null,2));
}
// Request bodies, headers, query strings, cookies and tokens are excluded.
function watchNetwork(cdp){
  const requests=new Map();let epoch;
  cdp.on('Network.requestWillBeSent',e=>{let u;try{u=new URL(e.request.url);}catch{return;}if(!['http:','https:'].includes(u.protocol))return;
    epoch??=e.timestamp;requests.set(e.requestId,{path:u.pathname,rsc:u.searchParams.has('_rsc'),type:e.type,priority:e.request.initialPriority,
      startedMs:(e.timestamp-epoch)*1000,startedWallMs:Date.now(),done:false,failed:false,encodedBytes:0,receivedBytes:0});});
  cdp.on('Network.responseReceived',e=>{const r=requests.get(e.requestId);if(r)Object.assign(r,{status:e.response.status,responseMs:(e.timestamp-epoch)*1000,
    cached:!!(e.response.fromDiskCache||e.response.fromServiceWorker),timing:e.response.timing??null});});
  cdp.on('Network.dataReceived',e=>{const r=requests.get(e.requestId);if(r){r.receivedBytes+=e.dataLength;r.lastDataMs=(e.timestamp-epoch)*1000;}});
  cdp.on('Network.loadingFinished',e=>{const r=requests.get(e.requestId);if(r)Object.assign(r,{done:true,finishedMs:(e.timestamp-epoch)*1000,encodedBytes:e.encodedDataLength});});
  cdp.on('Network.loadingFailed',e=>{const r=requests.get(e.requestId);if(r)Object.assign(r,{failed:true,cancelled:!!e.canceled,failure:e.errorText,finishedMs:(e.timestamp-epoch)*1000});});
  return requests;
}
const frame=r=>/\/hero\/(desktop|mobile)\/frame_/.test(r.path);
const networkState=requests=>({requests:requests.size,initiatedFrames:[...requests.values()].filter(frame).length,
  completedFrames:[...requests.values()].filter(r=>frame(r)&&r.done).length,inFlightFrames:[...requests.values()].filter(r=>frame(r)&&!r.done&&!r.failed).length});
async function pageState(page){return page.evaluate(()=>({pathname:location.pathname,title:document.querySelector('h1')?.textContent?.trim()??null,
  loading:!!document.querySelector('[data-route-loading]'),error:!!document.querySelector('[data-route-error]'),
  productLink:!!document.querySelector('a[href="/products/ceylon-cinnamon-quills"]'),hero:!!document.querySelector('[data-hero]'),
  clicks:window.__perf.clicks,longTasks:window.__perf.longTasks}));}
async function trial(profileName,run,arm){
  const p=config.profiles[profileName],label=`${profileName}-${run}-${arm}`;
  const context=await browser.newContext({viewport:p.viewport,deviceScaleFactor:p.deviceScaleFactor,isMobile:p.isMobile,hasTouch:p.hasTouch,locale:'en-US',timezoneId:'Asia/Colombo'});
  await context.addInitScript(installObservers);await context.addInitScript(()=>localStorage.setItem('aranya-market-ack','1'));
  await context.addCookies([{name:'x-market',value:signedMarket(run%2?'international':'local'),url:baseUrl,httpOnly:true,sameSite:'Lax'}]);
  const page=await context.newPage(),cdp=await context.newCDPSession(page);const errors=[];
  page.on('pageerror',e=>errors.push(e.message.replace(/https?:\/\/[^\s]+/g,'[url]')));
  const row={profile:profileName,run,arm,market:run%2?'USD':'LKR',passed:false,timedOut:false,clickToContentMs:null,loadingFeedbackMs:null};
  const requests=watchNetwork(cdp),traceEvents=[];let tracing=false;
  try{
    await cdp.send('Network.enable');await cdp.send('Network.clearBrowserCache');await cdp.send('Network.setCacheDisabled',{cacheDisabled:false});
    // Native blocking changes only hero frame delivery; Playwright routing would disable HTTP cache.
    await cdp.send('Network.setBlockedURLs',{urls:arm==='blocked'?['*://*/hero/*/frame_*']:[]});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:p.cpuRate});
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:p.latencyMs,downloadThroughput:p.downloadBytesPerSecond,uploadThroughput:p.uploadBytesPerSecond});
    await page.goto(baseUrl,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>!!document.querySelector('[data-hero]'),null,{timeout:30000});await page.waitForTimeout(config.observationMs);
    // Match the baseline's first-run pre-click screenshot in both arms.
    if(run===1)await page.screenshot({path:path.join(output,label+'-home.png')});
    row.homeNetwork=networkState(requests);
    if(run===1){cdp.on('Tracing.dataCollected',e=>traceEvents.push(...e.value));await cdp.send('Tracing.start',{categories:'devtools.timeline,v8.execute,blink.user_timing',transferMode:'ReportEvents'});tracing=true;}
    const before=await page.evaluate(()=>window.__perf.clicks.length);row.clickWallMs=Date.now();
    await page.getByRole('link',{name:'Shop',exact:true}).first().click({timeout:15000});
    try{
      await page.waitForFunction(()=>location.pathname==='/products'&&!!document.querySelector('h1')&&!!document.querySelector('a[href="/products/ceylon-cinnamon-quills"]')&&!document.querySelector('[data-route-loading]')&&!document.querySelector('[data-route-error]'),null,{timeout:config.navigationObservationMs});
      row.passed=true;row.clickToContentMs=await page.evaluate(before=>performance.now()-window.__perf.clicks[before].atMs,before);
    }catch(error){row.timedOut=true;row.error=error.message.replace(/https?:\/\/[^\s]+/g,'[url]');}
    row.state=await pageState(page);row.loadingFeedbackMs=row.state.clicks[before]?.loadingFeedbackMs??null;row.networkAtEnd=networkState(requests);
    if(run===1||!row.passed)await page.screenshot({path:path.join(output,label+'-shop.png')});
    if(tracing){const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');await complete;tracing=false;
      fs.writeFileSync(path.join(output,label+'-trace.json'),JSON.stringify({traceEvents},(key,value)=>{
        if(/cookie|authorization|headers|token/i.test(key))return '[omitted]';
        if(typeof value==='string'&&/^https?:\/\//.test(value)){try{const u=new URL(value);return u.origin+u.pathname;}catch{}}return value;
      }));}
  }catch(error){row.error=error.message.replace(/https?:\/\/[^\s]+/g,'[url]');}
  finally{
    row.pageErrors=errors;
    fs.writeFileSync(path.join(output,label+'-network.json'),JSON.stringify([...requests.values()].map(r=>({...r,relativeToClickMs:r.startedWallMs-(row.clickWallMs||0)})),null,2));
    if(tracing)await cdp.send('Tracing.end').catch(()=>{});
    await context.close();samples.push(row);save();console.log(`${label}: ${row.passed?Math.round(row.clickToContentMs)+' ms':row.timedOut?'exceeded 15 s':'diagnostic failed'}`);
  }
}
try{
  fixture=await startFixtureApi();
  fixture.server.on('request',(req,res)=>{const start=performance.now(),record={path:new URL(req.url,'http://localhost').pathname,method:req.method};
    res.once('close',()=>apiRequests.push({...record,elapsedMs:performance.now()-start,status:res.statusCode,completed:res.writableFinished}));});
  server=spawn(process.execPath,[path.join(frontend,'node_modules/next/dist/bin/next'),'start',build,'--hostname','127.0.0.1','--port','3101'],{
    cwd:build,env:{...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_API_URL:'http://127.0.0.1:4101',NEXT_PUBLIC_SITE_URL:baseUrl,NEXT_PUBLIC_ENABLE_DEMO:'false',MARKET_COOKIE_SECRET:fixtureSecret},stdio:['ignore','pipe','pipe']});
  server.stdout.on('data',b=>serverLog.push(b.toString()));server.stderr.on('data',b=>serverLog.push(b.toString()));
  let ready=false;for(let i=0;i<60;i++){if(server.exitCode!==null)throw new Error('Isolated server exited.');try{if((await fetch(baseUrl+'/about',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}if(!ready)throw new Error('Readiness timed out.');
  // Same HTTP/server-cache priming as the principal benchmark.
  for(let round=0;round<5;round++)for(const url of ['/','/products','/products/ceylon-cinnamon-quills','/about'])await (await fetch(baseUrl+url,{signal:AbortSignal.timeout(15000)})).arrayBuffer();
  const {chromium}=await loadPlaywright();browser=await chromium.launch({headless:true,...(process.env.PERF_BROWSER_CHANNEL?{channel:process.env.PERF_BROWSER_CHANNEL}:{})});
  fs.writeFileSync(path.join(output,'environment.json'),JSON.stringify({sourceFingerprint,fixtureSha256,node:process.version,browser:browser.version(),config,
    comparison:'Fresh cold browser context per trial; same warm server, API fixture and source; five repetitions per profile/arm; arm order alternates by repetition; native CDP frame blocking; first repetition includes timeline trace in each arm.',
    limits:['Fixture API latency, not real deployed DB/API','Blocked arm prevents frame callbacks/decoding as well as downloads; inference concerns the whole frame subsystem','Tracing and screenshots add overhead to first repetition; medians include it','Host background load not isolated; no authentication/payment submission'],applicationChanges:false},null,2));
  for(const profile of Object.keys(config.profiles))for(let run=1;run<=config.runs;run++)for(const arm of run%2?['enabled','blocked']:['blocked','enabled'])await trial(profile,run,arm);
  console.log('Diagnostic saved to '+path.relative(root,output));
}catch(error){console.error(error.message);process.exitCode=1;}
finally{
  if(browser)await browser.close();if(server){server.kill();await Promise.race([new Promise(r=>server.once('exit',r)),new Promise(r=>setTimeout(r,5000))]);}
  if(fixture){fixture.server.closeAllConnections();await fixture.close();}
  fs.writeFileSync(path.join(output,'server.log'),serverLog.join(''));fs.writeFileSync(path.join(output,'api-requests.json'),JSON.stringify(apiRequests,null,2));
}

// Separate geometry observations; never merge these samples into principal timing.
import fs from 'node:fs';import net from 'node:net';import {spawn} from 'node:child_process';
import {startFixtureApi,fixtureSecret,signedMarket} from './fixture-api.mjs';
import {loadPlaywright} from './browser.mjs';
const base='http://127.0.0.1:3101',output='artifacts/performance/phase-six-layout-diagnostic';
for(const port of [3101,4101])await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});
fs.mkdirSync(output,{recursive:true});const api=await startFixtureApi(),logs=[],rows=[];
const server=spawn(process.execPath,['aranya-next/node_modules/next/dist/bin/next','start','aranya-next/.performance-build','--hostname','127.0.0.1','--port','3101'],{env:{...process.env,NODE_ENV:'production',NEXT_PUBLIC_API_URL:'http://127.0.0.1:4101',NEXT_PUBLIC_ENABLE_DEMO:'false',MARKET_COOKIE_SECRET:fixtureSecret,REVALIDATION_SECRET:'performance-fixture-only'},stdio:['ignore','pipe','pipe']});
server.stdout.on('data',b=>logs.push(b.toString()));server.stderr.on('data',b=>logs.push(b.toString()));const sleep=ms=>new Promise(r=>setTimeout(r,ms));let browser;
try{
  let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/about',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await sleep(500);}if(!ready)throw Error('Readiness failed');
  const {chromium}=await loadPlaywright();browser=await chromium.launch({headless:true,...(process.env.PERF_BROWSER_CHANNEL?{channel:process.env.PERF_BROWSER_CHANNEL}:{})});
  for(let run=1;run<=3;run++){
    const c=await browser.newContext({viewport:{width:1440,height:900}});await c.addCookies([{name:'x-market',value:signedMarket(run%2?'international':'local'),url:base}]);
    await c.addInitScript(()=>{
      localStorage.setItem('aranya-market-ack','1');window.__layout=[];
      new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__layout.push({at:e.startTime,value:e.value,scroll:scrollY,fonts:document.fonts.status,sources:e.sources.map(s=>({tag:s.node?.tagName,id:s.node?.id,class:s.node?.className,hero:!!s.node?.closest?.('[data-hero]'),font:s.node?getComputedStyle(s.node).fontFamily:null,before:s.previousRect.toJSON(),after:s.currentRect.toJSON()}))});}).observe({type:'layout-shift',buffered:true});
    });
    const p=await c.newPage(),cdp=await c.newCDPSession(p);await cdp.send('Network.enable');await cdp.send('Network.clearBrowserCache');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:20,downloadThroughput:1250000,uploadThroughput:625000});
    await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForTimeout(6000);rows.push({run,shifts:await p.evaluate(()=>window.__layout)});await c.close();console.log('Layout diagnostic '+run+'/3');
  }
  fs.writeFileSync(output+'/checks.json',JSON.stringify({node:process.version,browser:browser.version(),limits:'Three separate desktop cold observations, extra instrumentation, no principal acceptance from these samples',rows},null,2));
}finally{if(browser)await browser.close();server.kill();await Promise.race([new Promise(r=>server.once('exit',r)),sleep(5000)]);api.server.closeAllConnections();await api.close();fs.writeFileSync(output+'/server.log',logs.join(''));}

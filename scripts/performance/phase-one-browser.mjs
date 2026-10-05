// Controlled failure/interruptibility checks, using the same isolated build/API ports.
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { startFixtureApi, fixtureSecret } from './fixture-api.mjs';
import { loadPlaywright } from './browser.mjs';
const output='artifacts/performance/phase-one-checks';fs.mkdirSync(output,{recursive:true});
async function available(port){await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',()=>reject(new Error(`Port ${port} is occupied; finish the other isolated run first.`)));probe.listen(port,'127.0.0.1',()=>probe.close(resolve));});}
await available(3101);await available(4101);
const faults=new Map();const fixture=await startFixtureApi({faults});
const baseUrl='http://127.0.0.1:3101';
const server=spawn(process.execPath,['aranya-next/node_modules/next/dist/bin/next','start','aranya-next/.performance-build','--hostname','127.0.0.1','--port','3101'],{
  env:{...process.env,NODE_ENV:'production',NEXT_PUBLIC_API_URL:'http://127.0.0.1:4101',NEXT_PUBLIC_SITE_URL:baseUrl,NEXT_PUBLIC_ENABLE_DEMO:'false',MARKET_COOKIE_SECRET:fixtureSecret,REVALIDATION_SECRET:'performance-fixture-only'},stdio:['ignore','pipe','pipe'],
});
const records=[];let browser,page,currentCheck;
const serverLog=[];server.stdout.on('data',b=>serverLog.push(b.toString()));server.stderr.on('data',b=>serverLog.push(b.toString()));
async function check(name,operation){currentCheck=name;const start=Date.now();const detail=await operation();records.push({name,passed:true,elapsedMs:Date.now()-start,...detail});fs.writeFileSync(output+'/checks.json',JSON.stringify(records,null,2));console.log('Passed: '+name);}
async function invalidateProducts(){const r=await fetch(baseUrl+'/api/revalidate',{method:'POST',headers:{'content-type':'application/json','x-revalidate-secret':'performance-fixture-only'},body:JSON.stringify({paths:['/products']})});if(!r.ok)throw new Error('Fixture invalidation failed');}
try {
  let ready=false;for(let i=0;i<60;i++){if(server.exitCode!==null)throw new Error('Isolated Next server exited before readiness.');try{if((await fetch(baseUrl+'/about',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
  if(!ready)throw new Error('Isolated Next server did not become ready.');
  const {chromium}=await loadPlaywright();browser=await chromium.launch({headless:true,...(process.env.PERF_BROWSER_CHANNEL?{channel:process.env.PERF_BROWSER_CHANNEL}:{})});
  const context=await browser.newContext({viewport:{width:1440,height:900}});page=await context.newPage();
  await context.addInitScript(()=>localStorage.setItem('aranya-market-ack','1'));
  // Avoid the unrelated frame flood in these controlled fault checks only.
  // The principal before/after benchmark still loads every real hero resource.
  await context.route('**/hero/*/frame_*',route=>route.abort());
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await check('Home hydrates without React recovery',async()=>{
    await page.goto(baseUrl,{waitUntil:'domcontentloaded'});await page.waitForTimeout(1500);
    if(errors.length)throw new Error('Unexpected home page errors');
    await page.screenshot({path:output+'/home.png'});return {pageErrors:errors.length};
  });
  await check('Delayed catalog exposes loading UI and navigation remains interruptible',async()=>{
    // Guests now share public data; explicitly invalidate before injecting a fault.
    await invalidateProducts();
    await context.addCookies([{name:'guestCartToken',value:'fixture-fault-check',url:baseUrl,httpOnly:true}]);
    faults.set('/products',{delayMs:12000});
    const started=Date.now();await page.getByRole('link',{name:'Shop',exact:true}).first().click();
    await page.locator('[data-route-loading]').waitFor({state:'visible',timeout:6000});
    const loadingMs=Date.now()-started;await page.screenshot({path:output+'/catalog-loading.png'});
    await page.getByRole('link',{name:'About',exact:true}).first().click();
    await page.waitForURL('**/about',{timeout:6000});
    await page.locator('[data-route-loading]').waitFor({state:'hidden',timeout:6000});
    return {loadingMs,destination:'/about'};
  });
  await check('Stalled catalog produces retry state and recovers on explicit retry',async()=>{
    await invalidateProducts();
    await context.addCookies([{name:'guestCartToken',value:'fixture-timeout-check',url:baseUrl,httpOnly:true}]);
    const started=Date.now();await page.goto(baseUrl+'/products',{waitUntil:'domcontentloaded'});
    await page.locator('[data-route-error]').waitFor({state:'visible',timeout:16000});
    const errorMs=Date.now()-started;
    await page.screenshot({path:output+'/catalog-error.png'});
    faults.delete('/products');await page.getByRole('button',{name:'Try again',exact:true}).click();
    await page.locator('[data-route-error]').waitFor({state:'hidden',timeout:12000});
    await page.locator('a[href="/products/ceylon-cinnamon-quills"]').first().waitFor({state:'visible'});
    return {recovered:true,errorMs};
  });
  await check('Unavailable session shows retry without granting account/admin access',async()=>{
    faults.set('/auth/refresh',{delayMs:6500});
    // The storefront only restores a session when the API's readable session
    // marker is present; without it a visitor is anonymous and never calls
    // /auth/refresh. This check is about a RETURNING visitor whose restore stalls.
    await context.addCookies([{name:'aranya_session',value:'1',url:baseUrl}]);
    await page.goto(baseUrl+'/account',{waitUntil:'domcontentloaded'});
    await page.locator('[data-session-error]').waitFor({state:'visible',timeout:7000});
    await page.screenshot({path:output+'/account-session-error.png'});
    faults.delete('/auth/refresh');await page.getByRole('button',{name:'Try again',exact:true}).click();
    await page.locator('[data-screen-label="Account — sign in"]').waitFor({state:'visible',timeout:7000});
    await page.goto(baseUrl+'/admin',{waitUntil:'domcontentloaded'});
    await page.getByRole('heading').first().waitFor({state:'visible',timeout:7000});
    if(await page.locator('.ad-shell').count())throw new Error('Anonymous user unexpectedly entered admin console');
    return {anonymousGates:true};
  });
  await check('Primary product API failure offers retry and recovers without demo substitution',async()=>{
    await invalidateProducts();
    await context.addCookies([{name:'guestCartToken',value:'fixture-product-failure-check',url:baseUrl,httpOnly:true}]);
    faults.set('/products/ceylon-cinnamon-quills',{status:503});
    await page.goto(baseUrl+'/products/ceylon-cinnamon-quills',{waitUntil:'domcontentloaded'});
    await page.locator('[data-route-error]').waitFor({state:'visible',timeout:12000});
    await page.screenshot({path:output+'/product-error.png'});
    faults.delete('/products/ceylon-cinnamon-quills');
    await page.getByRole('button',{name:'Try again',exact:true}).click();
    await page.locator('[data-screen-label="Product detail"]').waitFor({state:'visible',timeout:12000});
    return {recovered:true,upstreamStatus:503};
  });
  await check('BFF returns bounded no-store 504 for delayed auth',async()=>{
    faults.set('/auth/refresh',{delayMs:6500});const start=Date.now();
    const response=await fetch(baseUrl+'/api/auth/refresh',{method:'POST'});const data=await response.json();
    if(response.status!==504||data.error!=='request_timeout'||response.headers.get('cache-control')!=='no-store')throw new Error('Incorrect proxy timeout');
    faults.delete('/auth/refresh');return {status:response.status,responseMs:Date.now()-start};
  });
  await context.close();
} catch(error){if(page)await page.screenshot({path:output+'/failure.png'}).catch(()=>{});records.push({name:currentCheck,passed:false,error:error.message.replace(/https?:\/\/[^\s]+/g,'[url]')});fs.writeFileSync(output+'/checks.json',JSON.stringify(records,null,2));console.error(error.message);process.exitCode=1;}
finally{if(browser)await browser.close();server.kill();await Promise.race([new Promise(r=>server.once('exit',r)),new Promise(r=>setTimeout(r,5000))]);fs.writeFileSync(output+'/server.log',serverLog.join(''));fixture.server.closeAllConnections();await fixture.close();}

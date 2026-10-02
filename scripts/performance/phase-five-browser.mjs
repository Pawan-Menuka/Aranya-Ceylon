// Phase 5 controlled local checks. Synthetic auth/payment responses never reach
// a real account, gateway or database and are separate from principal benchmarks.
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { frontendSource } from './source.mjs';
import { startFixtureApi, fixtureSecret, signedMarket } from './fixture-api.mjs';
import { loadPlaywright } from './browser.mjs';

const base='http://127.0.0.1:3101',output='artifacts/performance/phase-five-checks';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const {sourceFingerprint}=frontendSource(path.resolve('aranya-next'));
const fixtureSha256=hash(fs.readFileSync('scripts/performance/fixtures/catalog.json'));
const mediaFixtureSha256=hash(fs.readFileSync('scripts/performance/media-fixture.tsx'));
const apiFixtureSha256=hash(fs.readFileSync('scripts/performance/fixture-api.mjs'));
const build=JSON.parse(fs.readFileSync('aranya-next/.performance-build/baseline-source.json'));
if(build.sourceFingerprint!==sourceFingerprint||build.fixtureSha256!==fixtureSha256||build.mediaFixtureSha256!==mediaFixtureSha256||build.port!==3101||build.apiPort!==4101)throw new Error('Build differs from source/API/media fixtures or ports; rebuild the isolated frontend before Phase 5 checks.');
const manifest=JSON.parse(fs.readFileSync('aranya-next/.performance-build/.next/react-loadable-manifest.json'));
// Dynamic entries also list shared dependency chunks used by ordinary pages.
// Assert the component's deferred runtime, rather than flagging those required
// common libraries as an eagerly loaded dialog/admin screen.
const appManifest=JSON.parse(fs.readFileSync('aranya-next/.performance-build/.next/app-build-manifest.json'));
const staticFiles=new Set(Object.values(appManifest.pages).flat());
const components=['CartDrawer','SignInModal','StripePaymentForm','AdminDashboard','AdminOrders','AdminProducts','AdminBlog','AdminRecipes','AdminGifts','AdminAudit'];
const chunks=Object.fromEntries(components.map(name=>{
  const files=[...new Set(Object.entries(manifest).filter(([key])=>key.replaceAll('\\','/').split(' -> ').at(-1).split('/').at(-1)===name).flatMap(([,entry])=>entry.files))].filter(file=>!staticFiles.has(file));
  if(!files.length)throw new Error('Missing dynamic chunk manifest entry for '+name);
  return [name,files.map(file=>'/_next/'+file)];
}));
for(const port of [3101,4101])await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});
fs.mkdirSync(output,{recursive:true});
const api=await startFixtureApi(),logs=[],checks=[],pageErrors=[];
const server=spawn(process.execPath,['aranya-next/node_modules/next/dist/bin/next','start','aranya-next/.performance-build','--hostname','127.0.0.1','--port','3101'],{
  env:{...process.env,NODE_ENV:'production',NEXT_PUBLIC_API_URL:'http://127.0.0.1:4101',NEXT_PUBLIC_SITE_URL:base,NEXT_PUBLIC_ENABLE_DEMO:'false',MARKET_COOKIE_SECRET:fixtureSecret,REVALIDATION_SECRET:'performance-fixture-only'},stdio:['ignore','pipe','pipe'],
});
server.stdout.on('data',b=>logs.push(b.toString()));server.stderr.on('data',b=>logs.push(b.toString()));
let browser,page,current;
const save=()=>fs.writeFileSync(output+'/checks.json',JSON.stringify(checks,null,2));
async function check(name,run){current=name;const start=Date.now(),detail=await run();checks.push({name,passed:true,elapsedMs:Date.now()-start,...detail});save();console.log('Passed: '+name);}
function assert(value,message){if(!value)throw new Error(message);}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(test,message,timeout=15000){const stop=Date.now()+timeout;do{if(await test())return;await sleep(50);}while(Date.now()<stop);throw new Error(message);}
const count=(rows,pathname,method)=>rows.filter(row=>row.path===pathname&&(!method||row.method===method)).length;
const requested=(seen,name)=>chunks[name].filter(file=>seen.includes(file));
function absent(seen,names){for(const name of names)assert(!requested(seen,name).length,'Optional '+name+' chunk requested before use: '+requested(seen,name).join(','));}
async function loaded(seen,name){await until(()=>requested(seen,name).length>0,'Dynamic '+name+' chunk was not requested');}
async function context(options={}){
  const c=await browser.newContext({viewport:{width:1440,height:900},...options}),seen=[],apiRequests=[],blockedExternal=[];
  await c.addInitScript(()=>localStorage.setItem('aranya-market-ack','1'));
  // Everything outside the fixture origin is blocked; PayHere capture gets a
  // more-specific override in its check and also never contacts the network.
  await c.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(['http:','https:'].includes(url.protocol)&&url.origin!==base){blockedExternal.push(url.hostname);return route.abort();}
    return route.continue();
  });
  page=await c.newPage();
  page.on('request',request=>{const url=new URL(request.url());seen.push(url.pathname);if(url.pathname.startsWith('/api/'))apiRequests.push({path:url.pathname.slice(4),method:request.method()});});
  page.on('pageerror',error=>pageErrors.push({check:current,message:error.message}));
  return {c,p:page,seen,apiRequests,blockedExternal};
}
async function screenshot(p,name){await p.screenshot({path:output+'/'+name+'.png'});}
async function chrome(p,hero,remember=false){
  await p.waitForFunction(()=>document.querySelectorAll('nav').length===1&&document.querySelectorAll('footer').length===1);
  await p.evaluate(()=>window.scrollTo(0,0));
  await p.waitForFunction(hero=>{
    const nav=document.querySelector('nav'),bar=nav?.parentElement.parentElement,wrap=bar?.parentElement;
    return wrap?.style.transform==='translateY(0%)'&&(hero?bar.style.background.includes('0.3'):!bar.style.background.includes('0.3'));
  },hero);
  return p.evaluate(remember=>{
    const nav=document.querySelector('nav');
    if(remember)window.__phaseFiveNav=nav;
    return {navs:document.querySelectorAll('nav').length,footers:document.querySelectorAll('footer').length,sameNode:window.__phaseFiveNav===nav,background:nav.parentElement.parentElement.style.background};
  },remember);
}
async function dialogKeyboard(p,label,trigger){
  await trigger.focus();await p.keyboard.press('Enter');
  const dialog=p.getByRole('dialog',{name:label,exact:true});await dialog.waitFor({state:'visible'});
  if(label==='Your Basket')await p.waitForFunction(()=>{
    const node=document.querySelector('[role="dialog"][aria-label="Your Basket"]');
    return node&&Math.abs(node.getBoundingClientRect().right-innerWidth)<1;
  });
  await p.waitForFunction(label=>document.querySelector('[role="dialog"][aria-label="'+label+'"]')?.contains(document.activeElement),label);
  for(let i=0;i<9;i++){
    await p.keyboard.press(i===0?'Shift+Tab':'Tab');
    assert(await dialog.evaluate(node=>node.contains(document.activeElement)),label+' allowed keyboard focus outside the dialog');
  }
  await screenshot(p,label==='Sign in'?'deferred-signin-keyboard':'deferred-cart-keyboard');
  await p.keyboard.press('Escape');
  await p.waitForFunction(label=>{
    const node=document.querySelector('[role="dialog"][aria-label="'+label+'"]');
    return !node||node.getAttribute('aria-hidden')==='true';
  },label);
  assert(await trigger.evaluate(node=>node===document.activeElement),label+' did not restore trigger focus');
}
function syntheticCart(market='INTERNATIONAL',quantity=1,id='controlled-cart'){
  const product=api.data.products.find(product=>product.slug==='ceylon-cinnamon-quills')||api.data.products[0];
  const currency=market==='LOCAL'?'LKR':'USD',variant=product.variants.find(variant=>variant.currency===currency)||product.variants[0];
  return {id,items:[{id:id+'-item',productId:product.id,quantity,product,variant}]};
}
const user=role=>({id:'controlled-'+role.toLowerCase(),name:'Controlled '+role,email:'fixture@example.invalid',role,verified:true});
function dashboard(){
  const values={all:0,local:0,international:0};
  return {fxRate:300,revenue:{local:{total:0,currency:'LKR',orders:0},international:{total:0,currency:'USD',orders:0}},orders:{localCount:0,intlCount:0,pendingFulfilment:0},series:Array.from({length:31},(_,i)=>({date:'2026-09-'+String(i+1).padStart(2,'0'),label:String(i+1),...values,orders:values})),metrics:{today:{revenueUsd:values,orders:values},current30:{revenueUsd:values,orders:values,aovUsd:values},changes:{revenuePct:values,ordersPct:values,aovPct:values},newCustomers7d:0,conversionRate:null,conversionChangePct:null},topProducts:[],lowStockVariants:[],recentAuditLogs:[]};
}
async function synthetic(state,options={}){
  const session=await context(options),calls=[];
  await session.c.route('**/api/**',async route=>{
    const request=route.request(),url=new URL(request.url()),pathname=url.pathname.slice(4),method=request.method();
    calls.push({path:pathname,method});
    const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'cache-control':'no-store'},body:JSON.stringify(body)});
    if(state.respond){const handled=await state.respond({route,request,path:pathname,method,send,calls});if(handled)return;}
    if(pathname==='/auth/refresh')return state.role?send({accessToken:'controlled-fixture-token'}):send({error:'Anonymous controlled fixture'},401);
    if(pathname==='/auth/me')return state.role?send({user:user(state.role)}):send({error:'Anonymous controlled fixture'},401);
    if(pathname==='/auth/logout'){state.role=null;return send({ok:true});}
    if(pathname==='/auth/login'){state.role=state.loginRole||'CUSTOMER';return send({accessToken:'controlled-fixture-token',user:user(state.role)});}
    if(pathname==='/cart/merge')return send({ok:true});
    if(pathname==='/cart/bootstrap')return send({cart:state.cart??null,market:state.market||'INTERNATIONAL'});
    if(pathname==='/cart'&&method==='DELETE'){state.clears=(state.clears||0)+1;state.cart=null;return send({ok:true});}
    if(pathname==='/cart/totals'){
      const currency=state.market==='LOCAL'?'LKR':'USD',subtotal=(state.cart?.items||[]).reduce((n,item)=>n+Number(item.variant.price)*item.quantity,0);
      return send({totals:{subtotal,shippingCost:0,gift:0,discount:0,total:subtotal,subtotalCents:Math.round(subtotal*100),shippingCents:0,giftCents:0,discountCents:0,totalCents:Math.round(subtotal*100),shippingLabel:'Controlled fixture',currency,couponId:null}});
    }
    if(pathname==='/admin/dashboard')return send(dashboard());
    if(pathname==='/admin/orders')return send({items:[],nextCursor:null,total:0,counts:{all:0,paid:0,processing:0,shipped:0,delivered:0,refunded:0}});
    if(pathname.startsWith('/orders/'))return send({order:{status:state.paid?'PAID':'PENDING'}});
    // Public browser reads may use the frozen fixture. Every unknown private
    // route fails here, so a test cannot accidentally mutate another service.
    if(method==='GET'&&/^\/(products|categories|blog|recipes|gifts)(\/|$)/.test(pathname))return route.continue();
    return send({error:'Unsupported isolated controlled route'},404);
  });
  return {...session,calls,state};
}

try{
  const health=await fetch('http://127.0.0.1:4101/health').then(response=>response.json());
  assert(health.status==='fixture'&&health.database==='none','API is not the isolated in-memory fixture');
  let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/about',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await sleep(500);}assert(ready,'Next readiness failed');
  const {chromium}=await loadPlaywright();browser=await chromium.launch({headless:true,...(process.env.PERF_BROWSER_CHANNEL?{channel:process.env.PERF_BROWSER_CHANNEL}:{})});
  fs.writeFileSync(output+'/environment.json',JSON.stringify({sourceFingerprint,fixtureSha256,mediaFixtureSha256,apiFixtureSha256,node:process.version,browser:browser.version(),chunks,limits:['Local production build and frozen in-memory catalog/cart fixture; no database writes','Auth, roles, merges, gateway intent and order status checks use isolated browser response interception','External HTTP requests are blocked; no real gateway, payment, account, mail or staging authentication is exercised','This harness is controlled functional verification, separate from principal timing benchmarks']},null,2));

  await check('Fresh home restores one session then performs one read-only bootstrap; optional chunks stay absent',async()=>{
    const {c,p,seen,apiRequests}=await context();api.calls.length=0;
    try{
      await p.goto(base,{waitUntil:'domcontentloaded'});
      await until(()=>count(apiRequests,'/cart/bootstrap')===1,'Fresh cart bootstrap did not complete');await sleep(1200);
      absent(seen,components);
      assert(!seen.includes('/products')&&!seen.includes('/categories'),'Idle home speculatively requested a catalog/category route');
      assert(count(apiRequests,'/auth/refresh')===1,'Fresh visit restored its session more than once');
      assert(count(apiRequests,'/cart/bootstrap')===1&&!count(apiRequests,'/cart','GET'),'Fresh visit used legacy creating cart GET');
      assert(apiRequests.findIndex(row=>row.path==='/auth/refresh')<apiRequests.findIndex(row=>row.path==='/cart/bootstrap'),'Bootstrap preceded session restoration');
      assert(!(await c.cookies()).some(cookie=>cookie.name==='guestCartToken'),'Fresh non-shopping home created a guest cart cookie');
      assert(!api.calls.some(row=>row.path.startsWith('/cart')&&row.method!=='GET'),'Fresh non-shopping home sent a cart mutation');
      assert(api.cartStats.created===0,'Fresh non-shopping home created an in-memory cart');
      await chrome(p,true,true);await screenshot(p,'fresh-home');
      await p.locator('nav a[href="/products"]').first().focus();
      await until(()=>seen.includes('/products'),'Chosen public focus did not prefetch Shop');
      assert(!seen.includes('/categories'),'Chosen Shop focus prefetched another catalog destination');
      return {refreshes:1,bootstrapReads:1,legacyCartGets:0,guestCartCookie:false,cartsCreated:0,optionalChunksRequested:0,idleCatalogPrefetch:false,chosenPublicFocusPrefetch:true};
    }finally{await c.close();}
  });

  await check('Deferred cart and sign-in dialogs load on keyboard intent, contain Tab and restore Escape focus',async()=>{
    const {c,p,seen}=await context();
    try{
      await p.goto(base+'/products',{waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'Cart',exact:true}).waitFor();await sleep(600);
      absent(seen,['CartDrawer','SignInModal','StripePaymentForm']);
      await dialogKeyboard(p,'Your Basket',p.getByRole('button',{name:'Cart',exact:true}));await loaded(seen,'CartDrawer');absent(seen,['SignInModal','StripePaymentForm']);
      await dialogKeyboard(p,'Sign in',p.getByRole('button',{name:'Account',exact:true}));await loaded(seen,'SignInModal');absent(seen,['StripePaymentForm']);
      return {cartChunkOnOpen:true,signInChunkOnOpen:true,tabContained:true,escapeRestoresFocus:true};
    }finally{await c.close();}
  });

  await check('Shared navbar persists through home, catalog, product and home return with one footer and correct appearance',async()=>{
    const {c,p}=await context(),details=[];
    try{
      await p.goto(base,{waitUntil:'domcontentloaded'});details.push(await chrome(p,true,true));
      await p.getByRole('link',{name:'Shop',exact:true}).first().click();await p.waitForURL(base+'/products');details.push(await chrome(p,false));
      const product=api.data.products.find(product=>product.slug==='ceylon-cinnamon-quills');
      await p.locator('a[href="/products/'+product.slug+'"]').first().click();await p.waitForURL(base+'/products/'+product.slug);await p.locator('[data-screen-label="Product detail"]').waitFor();details.push(await chrome(p,false));
      await p.locator('nav').locator('..').locator('a[href="/"]').first().click();await p.waitForURL(base+'/');details.push(await chrome(p,true));
      assert(details.every(detail=>detail.sameNode&&detail.navs===1&&detail.footers===1),'Shared chrome was replaced or duplicated');await screenshot(p,'persistent-home-return');
      return {routes:4,sameNavbarNode:true,oneNavbarAndFooter:true,appearances:details.map(detail=>detail.background)};
    }finally{await c.close();}
  });

  await check('Controlled signed-in expired access refresh restores a private cart without a legacy creating read',async()=>{
    let expired=true;
    const state={role:'CUSTOMER',cart:syntheticCart('INTERNATIONAL',2),respond:async({path,send})=>{
      if(path==='/cart/bootstrap'&&expired){expired=false;await send({error:'Controlled expired access'},401);return true;}return false;
    }};
    const {c,p,calls}=await synthetic(state);
    try{
      await p.goto(base+'/products',{waitUntil:'domcontentloaded'});await until(()=>count(calls,'/cart/bootstrap')===2,'Expired cart read did not replay after shared refresh');
      await until(()=>p.getByRole('button',{name:'Cart',exact:true}).textContent().then(text=>text==='2'),'Signed-in quantity did not restore');
      assert(count(calls,'/auth/refresh')===2&&count(calls,'/auth/me')===1,'Expired fixture session refresh count is wrong');assert(!count(calls,'/cart','GET'),'Signed-in fixture used legacy cart creation');
      return {controlled:true,startupAndExpiredRefreshes:2,authMeReads:1,bootstrapAttempts:2,restoredQuantity:2};
    }finally{await c.close();}
  });

  await check('Controlled login merges once and replaces guest fallback with authoritative signed-in quantity',async()=>{
    const state={cart:syntheticCart(),respond:async({path,send})=>{if(path==='/cart/merge'){state.cart=syntheticCart('INTERNATIONAL',3,'controlled-user-cart');await send({ok:true});return true;}return false;}};
    const {c,p,calls}=await synthetic(state);
    try{
      await p.goto(base+'/products',{waitUntil:'domcontentloaded'});await until(()=>count(calls,'/cart/bootstrap')===1,'Guest cart did not restore');
      await p.getByRole('button',{name:'Account',exact:true}).click();const modal=p.getByRole('dialog',{name:'Sign in',exact:true});await modal.getByLabel('Email',{exact:true}).fill('fixture@example.invalid');await modal.getByLabel('Password',{exact:true}).fill('controlled-password');await modal.getByRole('button',{name:'Sign in',exact:true}).click();
      await until(()=>p.getByRole('button',{name:'Cart',exact:true}).textContent().then(text=>text==='3'),'Merged signed-in quantity did not restore');
      assert(count(calls,'/auth/login','POST')===1&&count(calls,'/cart/merge','POST')===1,'Controlled login/merge was replayed');await screenshot(p,'controlled-login-merged');
      return {controlled:true,loginWrites:1,mergeWrites:1,authoritativeQuantity:3};
    }finally{await c.close();}
  });

  await check('Controlled returning-user add survives delayed initial session restoration and reaches that user exactly once',async()=>{
    let release;const pending=new Promise(resolve=>{release=resolve;});
    const state={role:'CUSTOMER',cart:null,respond:async({path,method,request,send})=>{
      if(path==='/auth/me'){await pending;await send({user:user('CUSTOMER')});return true;}
      if(path==='/cart/items'&&method==='POST'){
        const input=request.postDataJSON(),product=api.data.products.find(product=>product.id===input.productId);
        const variant=product?.variants.find(variant=>variant.id===input.variantId);
        assert(product&&variant&&input.quantity===1,'Initial queued add lost its real product/variant/quantity');
        state.cart={id:'initial-returning-cart',items:[{id:'initial-returning-item',productId:product.id,product,variant,quantity:input.quantity}]};
        await send({item:{id:'initial-returning-item'}});return true;
      }return false;
    }};
    const {c,p,calls}=await synthetic(state);
    try{
      await p.goto(base+'/products/ceylon-cinnamon-quills',{waitUntil:'domcontentloaded'});
      await until(()=>count(calls,'/auth/me')===1,'Delayed initial signed-in restore did not start');
      await p.getByRole('button',{name:/^Add to Cart —/}).first().click();await sleep(100);
      assert(!count(calls,'/cart/items')&&!count(calls,'/cart/bootstrap'),'Shopping write/bootstrap bypassed unresolved initial auth');
      release();await until(()=>count(calls,'/cart/items','POST')===1&&count(calls,'/cart/bootstrap')===1,'Initial add was discarded when the returning user resolved');
      await until(()=>p.getByRole('button',{name:'Cart',exact:true}).textContent().then(text=>text==='1'),'Returning user lost the optimistic basket item');
      assert(calls.findIndex(call=>call.path==='/cart/items')<calls.findIndex(call=>call.path==='/cart/bootstrap'),'Returning-user bootstrap preceded queued shopping intent');
      assert(!count(calls,'/cart','GET')&&!count(calls,'/cart/merge'),'Initial restore used a creating read or unexpected login merge');
      await screenshot(p,'controlled-returning-user-initial-add');
      return {controlled:true,delayedInitialAuth:true,shoppingWrites:1,bootstrapAfterAdd:true,restoredQuantity:1};
    }finally{release();await c.close();}
  });

  await check('Controlled admin uses one root restore, requests only selected management chunks and signs out to its gate',async()=>{
    const {c,p,calls,seen}=await synthetic({role:'ADMIN'});
    try{
      await p.goto(base+'/admin',{waitUntil:'domcontentloaded'});await p.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();await loaded(seen,'AdminDashboard');
      assert(count(calls,'/auth/refresh')===1&&count(calls,'/auth/me')===1,'Admin restored a second nested session');absent(seen,components.filter(name=>name.startsWith('Admin')&&name!=='AdminDashboard'));
      await p.locator('.ad-rail').getByRole('button',{name:'Orders',exact:true}).click();await p.getByRole('heading',{name:'Orders',exact:true}).waitFor();await loaded(seen,'AdminOrders');absent(seen,['AdminProducts','AdminBlog','AdminRecipes','AdminGifts','AdminAudit']);await screenshot(p,'controlled-admin-orders');
      await p.getByRole('button',{name:'Sign out',exact:true}).click();await p.getByRole('heading',{name:'Sign in to the console',exact:true}).waitFor();assert(count(calls,'/auth/logout','POST')===1,'Admin sign-out was replayed');
      return {controlled:true,refreshes:1,authMeReads:1,selectedScreenChunks:['AdminDashboard','AdminOrders'],unopenedScreensAbsent:true,signOutGate:true};
    }finally{await c.close();}
  });

  await check('Controlled CUSTOMER cannot enter admin even after submitting the admin gate',async()=>{
    const {c,p,calls,seen}=await synthetic({role:'CUSTOMER',loginRole:'CUSTOMER'});
    try{
      await p.goto(base+'/admin',{waitUntil:'domcontentloaded'});await p.getByRole('heading',{name:'Sign in to the console',exact:true}).waitFor();absent(seen,components.filter(name=>name.startsWith('Admin')));
      await p.locator('input[type="email"]').fill('fixture@example.invalid');await p.locator('input[type="password"]').fill('controlled-password');await p.getByRole('button',{name:'Enter console',exact:true}).click();await p.getByText("Your account doesn't have console access. Contact a SUPERADMIN.",{exact:true}).waitFor();
      assert(count(calls,'/auth/logout','POST')===1&&!calls.some(row=>row.path.startsWith('/admin/')),'Customer reached an admin API or was not signed out');
      return {controlled:true,customerDenied:true,noManagementChunks:true,noAdminApiReads:true};
    }finally{await c.close();}
  });

  for(const provider of ['payhere','stripe'])await check('Controlled '+provider+' intent requests only its required payment UI without contacting a gateway',async()=>{
    let gatewayCaptures=0,intentWrites=0;
    const state={market:provider==='payhere'?'LOCAL':'INTERNATIONAL',cart:syntheticCart(provider==='payhere'?'LOCAL':'INTERNATIONAL'),respond:async({path,request,send})=>{
      if(path==='/checkout/create-intent'){
        intentWrites++;const payload=request.postDataJSON();assert(payload.shippingAddress.country===(provider==='payhere'?'LK':'US'),'Controlled checkout country is wrong');
        await send(provider==='payhere'?{provider,orderId:'controlled-payhere',action:'https://sandbox.payhere.lk/pay/checkout',params:{order_id:'controlled-payhere',amount:'1.00'}}:{provider,orderId:'controlled-stripe',clientSecret:'pi_controlled_secret_controlled',publishableKey:''});return true;
      }return false;
    }};
    const {c,p,seen,blockedExternal}=await synthetic(state);
    try{
      if(provider==='payhere')await c.addCookies([{name:'x-market',value:signedMarket('local'),url:base,httpOnly:true}]);
      // Use the existing CSP-allowed sandbox origin, fulfilled locally before
      // networking. The global route blocks every other external HTTP request.
      await c.route('https://sandbox.payhere.lk/**',async route=>{gatewayCaptures++;assert(route.request().method()==='POST','PayHere form did not submit POST');await route.fulfill({status:200,contentType:'text/html',body:'<html><title>Controlled gateway capture</title><body>Controlled PayHere form captured locally.</body></html>'});});
      await p.goto(base+'/checkout',{waitUntil:'domcontentloaded'});await p.locator('[data-screen-label="Checkout"]').waitFor();absent(seen,['StripePaymentForm']);
      await p.getByLabel(/^Email/).fill('fixture@example.invalid');await p.getByLabel(/^First name/).fill('Controlled');await p.getByLabel(/^Last name/).fill('Fixture');await p.getByLabel(/^Address/).fill('Fixture street');await p.getByLabel(/^City/).fill('Colombo');await p.getByRole('button',{name:/^Place order —/}).click();
      if(provider==='payhere'){await until(()=>gatewayCaptures===1,'Local PayHere redirect form was not captured');absent(seen,['StripePaymentForm']);await screenshot(p,'controlled-payhere-capture');}
      else {await p.getByRole('heading',{name:'Payment',exact:true}).waitFor();await loaded(seen,'StripePaymentForm');assert(!blockedExternal.some(host=>host.includes('stripe')),'Empty-key controlled Stripe UI tried to initialize the real SDK');await screenshot(p,'controlled-stripe-ui-boundary');}
      assert(intentWrites===1,'Checkout intent mutation was replayed');return {controlled:true,intentWrites,gatewayCaptures,stripeUiRequested:provider==='stripe',realGatewayRequests:0,emptyStripeKeyFixture:provider==='stripe'};
    }finally{await c.close();}
  });

  await check('Controlled success polling aborts on order replacement and navigation, ignoring a late paid response and preserving the cart',async()=>{
    let releaseOld,oldReads=0,newReads=0;
    const pending=new Promise(resolve=>{releaseOld=resolve;});
    const state={cart:syntheticCart(),respond:async({path,send})=>{
      if(path==='/orders/controlled-old'){oldReads++;await pending;await send({order:{status:'PAID'}}).catch(()=>{});return true;}
      if(path==='/orders/controlled-new'){newReads++;await send({order:{status:'PENDING'}});return true;}return false;
    }};
    const {c,p}=await synthetic(state);
    try{
      await p.goto(base+'/checkout/success?orderId=controlled-old',{waitUntil:'domcontentloaded'});await until(()=>oldReads===1,'Old order polling did not start');
      await p.evaluate(()=>history.pushState(null,'','/checkout/success?orderId=controlled-new'));await until(()=>newReads===1,'Replacement order polling did not start');releaseOld();await sleep(200);
      assert(!state.clears,'Stale authoritative response cleared the replacement cart');
      // Replace the document to exercise teardown while the current success
      // spinner has no navigation control. Synthetic bootstrap restores the cart.
      await p.goto(base+'/products',{waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'Cart',exact:true}).waitFor();const afterNavigation=newReads;await sleep(1800);
      assert(newReads===afterNavigation&&oldReads===1,'Unmounted success consumer kept polling');assert(!state.clears,'Cancelled/pending order cleared the cart');
      await until(()=>p.getByRole('button',{name:'Cart',exact:true}).textContent().then(text=>text==='1'),'Pending order lost its cart');await screenshot(p,'controlled-poll-cancelled-cart-retained');
      return {controlled:true,oldReads,newReads,readsAfterNavigation:0,latePaidIgnored:true,cartClears:0,cartRetained:true};
    }finally{releaseOld();await c.close();}
  });

  await check('Controlled success clears the cart only after an authoritative paid order read',async()=>{
    const state={cart:syntheticCart(),paid:false};const {c,p,calls}=await synthetic(state);
    try{
      await p.goto(base+'/checkout/success?orderId=controlled-paid',{waitUntil:'domcontentloaded'});await until(()=>count(calls,'/orders/controlled-paid')===1,'Success polling did not start');assert(!state.clears,'Pending order cleared its cart');state.paid=true;
      await p.getByRole('heading',{name:'Thank you — your spices are on their way',exact:true}).waitFor();await until(()=>state.clears===1,'Paid order did not clear its cart');assert(count(calls,'/orders/controlled-paid')===2,'Paid order reads continued after confirmation');
      assert(await p.evaluate(()=>JSON.parse(localStorage.getItem('aranya_cart_v1')||'[]').length===0),'Paid local cart was not cleared');await screenshot(p,'controlled-authoritative-paid');
      return {controlled:true,pendingCartClears:0,authoritativePaidReads:1,cartClears:1,confirmationVisible:true};
    }finally{await c.close();}
  });
  assert(!pageErrors.length,'Browser page errors: '+JSON.stringify(pageErrors));
}catch(error){checks.push({name:current,passed:false,error:error.message.replace(/https?:\/\/[^\s]+/g,'[url]')});save();if(page)await page.screenshot({path:output+'/failure.png'}).catch(()=>{});console.error(error.message);process.exitCode=1;}
finally{if(browser)await browser.close();server.kill();await Promise.race([new Promise(resolve=>server.once('exit',resolve)),sleep(5000)]);api.server.closeAllConnections();await api.close();fs.writeFileSync(output+'/server.log',logs.join(''));fs.writeFileSync(output+'/page-errors.json',JSON.stringify(pageErrors,null,2));}

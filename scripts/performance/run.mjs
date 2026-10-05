import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { startFixtureApi, fixtureSecret } from './fixture-api.mjs';
import { benchmarkBrowser } from './browser.mjs';
import { frontendSource } from './source.mjs';
import { prepareMedia } from '../../aranya-next/scripts/prepare-media.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const frontend=path.join(root,'aranya-next');
const buildDir=path.join(frontend,'.performance-build');
const config=JSON.parse(fs.readFileSync(path.join(root,'scripts/performance/config.json')));
const flags=new Set(process.argv.slice(2));
const smoke=flags.has('--smoke');
const output=path.join(root,'artifacts/performance',smoke?'smoke':'baseline');
fs.mkdirSync(output,{recursive:true});
const port=Number(process.env.PERF_PORT||3101),apiPort=Number(process.env.PERF_API_PORT||4101);
const baseUrl=`http://127.0.0.1:${port}`;
const req=createRequire(path.join(frontend,'package.json'));
const nextCli=req.resolve('next/dist/bin/next');
function git(args){return execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}
function hash(buffer){return crypto.createHash('sha256').update(buffer).digest('hex');}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
prepareMedia(frontend);
const {sourceManifest,sourceFingerprint}=frontendSource(frontend);
const mediaFixtureSha256=hash(fs.readFileSync(path.join(root,'scripts/performance/media-fixture.tsx')));
const metadata={createdAt:new Date().toISOString(),commit:git(['rev-parse','HEAD']),branch:git(['branch','--show-current']),workingTree:git(['status','--short']),trackedDiffSha256:hash(git(['diff','HEAD','--','aranya-next','backend','shared'])),
  sourceFingerprint,sourceManifest,mediaFixtureSha256,node:process.version,next:req('next/package.json').version,react:req('react/package.json').version,
  pnpmDeclared:JSON.parse(fs.readFileSync(path.join(root,'package.json'))).packageManager,
  fixtureSha256:hash(fs.readFileSync(path.join(root,'scripts/performance/fixtures/catalog.json'))),
  fixtureServerSha256:hash(fs.readFileSync(path.join(root,'scripts/performance/fixture-api.mjs'))),
  catalogOracleSha256:hash(fs.readFileSync(path.join(root,'scripts/performance/catalog-fixture.mjs'))),
  environment:{NODE_ENV:'production',NEXT_PUBLIC_API_URL:`http://127.0.0.1:${apiPort}`,NEXT_PUBLIC_SITE_URL:baseUrl,NEXT_PUBLIC_ENABLE_DEMO:'false',envLocalCopied:false,apiMode:'in-memory public-data fixture; no database, jobs, email, payment or real authentication'},
  config,buildCommand:`node next/dist/bin/next build ${path.relative(root,buildDir)}`,limits:['Local production frontend with fixture API; not deployed API/DB latency','Browser throttling is an emulated lab profile, not a real mobile device','No authenticated customer/admin session or real payment flow is exercised']};
fs.writeFileSync(path.join(output,'environment.json'),JSON.stringify(metadata,null,2));
function child(args,env){return spawn(process.execPath,args,{cwd:buildDir,env,stdio:['ignore','pipe','pipe']});}
async function available(p){await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',()=>reject(new Error(`Port ${p} is occupied; choose another PERF_PORT/PERF_API_PORT.`)));server.listen(p,'127.0.0.1',()=>server.close(resolve));});}
async function ready(url,processRef){for(let i=0;i<120;i++){if(processRef.exitCode!==null)throw new Error('Isolated Next server exited before readiness.');try{const r=await fetch(url,{signal:AbortSignal.timeout(1000)});if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,500));}throw new Error('Isolated Next server did not become ready.');}
const median=a=>{const s=a.filter(Number.isFinite).sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:null;};
const rounded=n=>n===null?null:Math.round(n*100)/100;
function summary(records){
  const groups=new Map();
  for(const r of records.filter(r=>!['flow-error','page-errors','navigation-timeout'].includes(r.step))){const k=`${r.profile}/${r.cache}/${r.step}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
  return [...groups].map(([group,rows])=>({group,n:rows.length,clickToContentMedianMs:rounded(median(rows.map(r=>r.clickToContentMs))),
    clickToContentMinMs:rounded(Math.min(...rows.map(r=>r.clickToContentMs).filter(Number.isFinite))),clickToContentMaxMs:rounded(Math.max(...rows.map(r=>r.clickToContentMs).filter(Number.isFinite))),
    loadingFeedbackMedianMs:rounded(median(rows.map(r=>r.loadingFeedbackMs))),loadingFeedbackSamples:rows.filter(r=>Number.isFinite(r.loadingFeedbackMs)).length,
    // LCP is only applicable to a hard navigation. SPA steps retain home LCP and are excluded.
    lcpMedianMs:['home','article','account','admin'].includes(rows[0].step)?rounded(median(rows.map(r=>r.lcpMs))):null,
    clsMedian:Number(median(rows.map(r=>r.cls))?.toFixed(6)),heroRequestsMedian:median(rows.map(r=>r.network.heroRequests)),
    completedTransferMedianBytes:median(rows.map(r=>r.network.completedTransferBytes)),completedHeroMedianBytes:median(rows.map(r=>r.network.completedHeroBytes)),
    homeInFlightMedian:rows[0].step==='home'?median(rows.map(r=>r.network.inFlight)):null,
    longTasksMedian:median(rows.map(r=>r.longTasks.length)),longTaskTotalMedianMs:rounded(median(rows.map(r=>r.longTasks.reduce((n,t)=>n+t.durationMs,0))))}));
}
let fixture,server; const runtimeLog=[];
try {
  await available(port);await available(apiPort);
  fixture=await startFixtureApi({port:apiPort});
  const env={...process.env,NEXT_TELEMETRY_DISABLED:'1',NODE_ENV:'production',NEXT_PUBLIC_API_URL:metadata.environment.NEXT_PUBLIC_API_URL,NEXT_PUBLIC_SITE_URL:baseUrl,NEXT_PUBLIC_ENABLE_DEMO:'false',REVALIDATION_SECRET:'performance-fixture-only',MARKET_COOKIE_SECRET:fixtureSecret};
  if(!flags.has('--reuse-build')) {
    fs.mkdirSync(buildDir,{recursive:true});
    for(const f of ['package.json','tsconfig.json','next.config.mjs','next-env.d.ts','.eslintrc.json'])if(fs.existsSync(path.join(frontend,f)))fs.copyFileSync(path.join(frontend,f),path.join(buildDir,f));
    // The isolated source folder is owned by this runner, never the user's checkout.
    const ownedSource=path.join(buildDir,'src');
    if(!ownedSource.startsWith(frontend+path.sep)||!buildDir.endsWith('.performance-build'))throw new Error('Invalid isolated path.');
    fs.rmSync(ownedSource,{recursive:true,force:true});fs.cpSync(path.join(frontend,'src'),ownedSource,{recursive:true});
    const mediaFixture=path.join(ownedSource,'app/performance-fixtures/media');
    fs.mkdirSync(mediaFixture,{recursive:true});fs.copyFileSync(path.join(root,'scripts/performance/media-fixture.tsx'),path.join(mediaFixture,'page.tsx'));
    for(const name of ['node_modules','public','scripts'])if(!fs.existsSync(path.join(buildDir,name)))fs.symlinkSync(path.join(frontend,name),path.join(buildDir,name),process.platform==='win32'?'junction':'dir');
    console.log('Building isolated production frontend with fixture API.');
    const build=child([nextCli,'build',buildDir],env);const chunks=[];
    const capture=b=>{chunks.push(b.toString());process.stdout.write(b)};build.stdout.on('data',capture);build.stderr.on('data',capture);
    const code=await new Promise((resolve,reject)=>{build.once('error',reject);build.once('exit',resolve)});
    fs.writeFileSync(path.join(output,'build.log'),chunks.join(''));
    if(code!==0)throw new Error('Production build failed; inspect build.log.');
    fs.writeFileSync(path.join(buildDir,'baseline-source.json'),JSON.stringify({sourceFingerprint,mediaFixtureSha256,fixtureSha256:metadata.fixtureSha256,apiPort,port}));
  } else {
    const previous=JSON.parse(fs.readFileSync(path.join(buildDir,'baseline-source.json')));
    if(previous.sourceFingerprint!==sourceFingerprint||previous.mediaFixtureSha256!==mediaFixtureSha256||previous.fixtureSha256!==metadata.fixtureSha256||previous.apiPort!==apiPort||previous.port!==port)throw new Error('Isolated build differs from current source/fixture/ports. Re-run without --reuse-build.');
  }
  const manifest=JSON.parse(fs.readFileSync(path.join(buildDir,'.next/app-build-manifest.json')));
  const bundles=Object.entries(manifest.pages).filter(([route])=>route.endsWith('/page')).map(([route,files])=>{
    const segments=route.split('/').filter(Boolean).slice(0,-1);
    const layouts=['/layout',...segments.map((_,i)=>'/'+segments.slice(0,i+1).join('/')+'/layout')];
    const paths=[...new Set([...layouts.flatMap(key=>manifest.pages[key]||[]),...files])].filter(f=>f.endsWith('.js'));
    const bytes=paths.map(f=>fs.readFileSync(path.join(buildDir,'.next',f)));
    return {route:route.replace(/\/page$/,'')||'/',files:paths,rawJsBytes:bytes.reduce((n,b)=>n+b.length,0),gzipJsBytes:bytes.reduce((n,b)=>n+zlib.gzipSync(b).length,0)};
  });
  fs.writeFileSync(path.join(output,'bundles.json'),JSON.stringify({method:'Unique ancestor layouts+page manifest JS references; sum of per-file gzip sizes, excludes later dynamic resources.',routes:bundles},null,2));
  server=child([nextCli,'start',buildDir,'--hostname','127.0.0.1','--port',String(port)],env);
  server.stdout.on('data',b=>runtimeLog.push(b.toString()));server.stderr.on('data',b=>runtimeLog.push(b.toString()));
  await ready(baseUrl+'/about',server);
  // Next's Data Cache persists across server processes. Controlled checks may
  // use a larger fixture; reset its tags before HTTP warmup/browser profiles.
  const reset=await fetch(baseUrl+'/api/revalidate',{method:'POST',headers:{'content-type':'application/json','x-revalidate-secret':'performance-fixture-only'},body:JSON.stringify({paths:['/','/products','/categories','/journal','/recipes','/gifts']})});
  if(!reset.ok)throw new Error('Fixture cache reset failed: '+reset.status);
  await reset.arrayBuffer();
  if(!flags.has('--skip-http')){
    const http=[];
    for(let round=1;round<=5;round++)for(const route of ['/','/products','/products/ceylon-cinnamon-quills','/about']){
      const t=performance.now();const response=await fetch(baseUrl+route,{signal:AbortSignal.timeout(15000)});const headersAt=performance.now();const body=await response.arrayBuffer();
      http.push({round,route,status:response.status,ttfbMs:Math.round(headersAt-t),totalMs:Math.round(performance.now()-t),bodyBytes:body.byteLength,cacheControl:response.headers.get('cache-control')});
    }
    fs.writeFileSync(path.join(output,'http.json'),JSON.stringify({apiMode:metadata.environment.apiMode,samples:http},null,2));
  }
  const records=await benchmarkBrowser({baseUrl,output,config,runs:smoke?1:config.runs,profiles:smoke?['desktop']:Object.keys(config.profiles),data:fixture.data,smoke});
  const groups=summary(records);fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify({groups,failures:records.filter(r=>['flow-error','page-errors','navigation-timeout'].includes(r.step))},null,2));
  const budgetObservations=groups.filter(g=>g.group.endsWith('/home')).map(g=>({group:g.group,lcpPass:g.lcpMedianMs!==null&&g.lcpMedianMs<=config.budgets.labLcpMs,heroRequestPass:g.heroRequestsMedian<=config.budgets.heroRequestsAtIdle}));
  fs.writeFileSync(path.join(output,'budgets.json'),JSON.stringify({enforcement:'report-only until Phase 8 review; functional smoke errors fail',provisional:config.budgets,observations:budgetObservations},null,2));
  console.log(`Performance baseline saved to ${path.relative(root,output)}. Timing budgets are report-only.`);
  if(records.some(r=>['flow-error','page-errors','navigation-timeout'].includes(r.step)))process.exitCode=1;
} catch(error) {console.error(error.message);process.exitCode=1;}
finally {
  fs.writeFileSync(path.join(output,'server.log'),runtimeLog.join(''));
  if(fixture)fs.writeFileSync(path.join(output,'fixture-calls.json'),JSON.stringify(fixture.calls,null,2));
  if(server){server.kill();await Promise.race([new Promise(r=>server.once('exit',r)),new Promise(r=>setTimeout(r,5000))]);}
  if(fixture){fixture.server.closeAllConnections();await fixture.close();}
}

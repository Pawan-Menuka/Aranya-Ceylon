// Interleaved geometry intervention; never substitutes for principal acceptance.
import fs from 'node:fs';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {startFixtureApi,fixtureSecret} from './fixture-api.mjs';
import {benchmarkBrowser} from './browser.mjs';
import {frontendSource} from './source.mjs';
const output='artifacts/performance/phase-six-loading-height-diagnostic',baseUrl='http://127.0.0.1:3101';
const config=JSON.parse(fs.readFileSync('scripts/performance/config.json'));
const source=frontendSource('aranya-next');
if(JSON.parse(fs.readFileSync('aranya-next/.performance-build/baseline-source.json')).sourceFingerprint!==source.sourceFingerprint)throw Error('Build differs from source');
for(const port of [3101,4101])await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});
fs.mkdirSync(output,{recursive:true});
const api=await startFixtureApi(),logs=[],samples=[];
const server=spawn(process.execPath,['aranya-next/node_modules/next/dist/bin/next','start','aranya-next/.performance-build','--hostname','127.0.0.1','--port','3101'],{env:{...process.env,NODE_ENV:'production',NEXT_PUBLIC_API_URL:'http://127.0.0.1:4101',NEXT_PUBLIC_ENABLE_DEMO:'false',MARKET_COOKIE_SECRET:fixtureSecret,REVALIDATION_SECRET:'performance-fixture-only'},stdio:['ignore','pipe','pipe']});
server.stdout.on('data',b=>logs.push(b.toString()));server.stderr.on('data',b=>logs.push(b.toString()));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
  let ready=false;for(let i=0;i<60;i++){try{if((await fetch(baseUrl+'/about',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await sleep(500);}if(!ready)throw Error('Readiness failed');
  const reset=await fetch(baseUrl+'/api/revalidate',{method:'POST',headers:{'content-type':'application/json','x-revalidate-secret':'performance-fixture-only'},body:JSON.stringify({paths:['/','/products','/categories','/journal','/recipes','/gifts']})});if(!reset.ok)throw Error('Cache reset failed');await reset.arrayBuffer();
  for(let round=0;round<5;round++)for(const path of ['/','/products','/products/ceylon-cinnamon-quills','/about'])await(await fetch(baseUrl+path)).arrayBuffer();
  // Reverse arm order on the second pair, with fresh browser contexts per arm.
  for(const [index,height]of ['70vh','100vh','100vh','70vh'].entries()){
    const armOutput=output+'/'+index+'-'+height;fs.mkdirSync(armOutput,{recursive:true});
    const records=await benchmarkBrowser({baseUrl,output:armOutput,config,runs:1,profiles:['desktop'],data:api.data,diagnosticLoadingHeight:height});
    samples.push({index,height,records});console.log('Completed geometry arm '+index+' '+height);
  }
  fs.writeFileSync(output+'/checks.json',JSON.stringify({sourceFingerprint:source.sourceFingerprint,limits:'Two interleaved desktop contexts per arm, international fixture only; extra observer, no principal acceptance or general timing claim',samples},null,2));
  if(samples.some(s=>s.records.some(r=>['flow-error','page-errors','navigation-timeout'].includes(r.step))))process.exitCode=1;
}finally{server.kill();await Promise.race([new Promise(r=>server.once('exit',r)),sleep(5000)]);api.server.closeAllConnections();await api.close();fs.writeFileSync(output+'/server.log',logs.join(''));}

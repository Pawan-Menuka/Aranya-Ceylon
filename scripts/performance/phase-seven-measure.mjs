// Small synthetic microbenchmark, separate from browser timing. Run sequentially.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const req=createRequire(path.resolve('aranya-next/package.json'));
const backendReq=createRequire(path.resolve('backend/package.json'));
const {tsImport}=await import(pathToFileURL(backendReq.resolve('tsx/esm/api')).href);
const {sanitizeHtml}=await tsImport(pathToFileURL(path.resolve('aranya-next/src/lib/sanitize.ts')).href,import.meta.url);
const purify=req('isomorphic-dompurify');
// Same unchanged allowlist as sanitize.ts, for the previous uncached operation.
const policy={ALLOWED_TAGS:['p','br','b','strong','i','em','u','a','ul','ol','li','blockquote','span'],ALLOWED_ATTR:['href','title','target','rel'],ALLOWED_URI_REGEXP:/^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i};
const sample='A <strong>forest story</strong> with <em>Ceylon cinnamon</em> and <a href="https://example.invalid">a link</a><img src=x onerror=alert(1)>';
if(purify.sanitize(sample,policy)!==sanitizeHtml(sample))throw Error('Sanitizer outputs differ');
const rounds=[];
for(let round=0;round<5;round++){
 let start=performance.now();for(let i=0;i<1000;i++)purify.sanitize(sample,policy);const previousMs=performance.now()-start;
 start=performance.now();for(let i=0;i<1000;i++)sanitizeHtml(sample);const cachedMs=performance.now()-start;
 rounds.push({previousMs:Math.round(previousMs*10)/10,cachedMs:Math.round(cachedMs*10)/10});
}
const median=key=>rounds.map(r=>r[key]).sort((a,b)=>a-b)[2];
const report={node:process.version,iterationsPerRound:1000,rounds,previousMedianMs:median('previousMs'),cachedMedianMs:median('cachedMs'),limits:'Repeated identical small authored paragraph, warm module/cache; measures reuse only, not first-load, deployed SSR latency or browser navigation. No network or DB.'};
fs.writeFileSync('artifacts/performance/phase-seven-content-cost.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));

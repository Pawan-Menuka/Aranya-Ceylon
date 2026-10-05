import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function frontendSource(frontend) {
  const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
  const generated=path.join(frontend,'public/media');
  const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const file=path.join(dir,e.name);
    return file===generated?[]:e.isDirectory()?walk(file):[file];
  });
  const files=[...['src','public','scripts'].flatMap(d=>walk(path.join(frontend,d))),...['package.json','tsconfig.json','next.config.mjs','.eslintrc.json'].map(f=>path.join(frontend,f))];
  const sourceManifest=files.map(f=>({path:path.relative(frontend,f).replaceAll('\\','/'),sha256:hash(fs.readFileSync(f))})).sort((a,b)=>a.path.localeCompare(b.path));
  return {sourceManifest,sourceFingerprint:hash(JSON.stringify(sourceManifest))};
}

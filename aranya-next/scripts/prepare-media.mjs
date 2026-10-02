import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]).sort();

// Immutable URLs point to independent copies, never aliases of mutable sources.
// Existing versions stay intact when an author replaces the source photograph.
export function prepareMedia(root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')) {
  const publicDir=path.join(root,'public'),images={};
  const publish=(file,version)=>{
    const relative=path.relative(publicDir,file).replaceAll('\\','/');
    const url=`/media/${version}/${relative}`,target=path.join(publicDir,url);
    if(!fs.existsSync(target)){fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);}
    return url;
  };
  for(const file of walk(path.join(publicDir,'images'))){
    if(!/\.(webp|png|jpe?g|avif)$/i.test(file))continue;
    const relative='/'+path.relative(publicDir,file).replaceAll('\\','/');
    images[relative]=publish(file,hash(fs.readFileSync(file)).slice(0,16));
  }
  const heroFiles=walk(path.join(publicDir,'hero'));
  const heroVersion=hash(JSON.stringify(heroFiles.map(file=>({path:path.relative(publicDir,file).replaceAll('\\','/'),hash:hash(fs.readFileSync(file))})))).slice(0,16);
  for(const file of heroFiles)publish(file,heroVersion);
  const manifest={images,heroPrefix:`/media/${heroVersion}/hero`};
  const output=path.join(root,'src/lib/media-manifest.json'),text=JSON.stringify(manifest,null,2)+'\n';
  if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==text)fs.writeFileSync(output,text);
  return manifest;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const manifest=prepareMedia();console.log(`Prepared ${Object.keys(manifest.images).length} photographs and one versioned hero sequence.`);
}

// Every runner owns the same isolated ports; always execute sequentially.
import {spawn} from 'node:child_process';
const runners=['phase-one-browser.mjs','phase-two-browser.mjs','phase-three-browser.mjs','phase-four-browser.mjs','phase-five-browser.mjs','phase-six-browser.mjs','phase-seven-browser.mjs','phase-eight-browser.mjs'];
for(const file of runners){
  const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['scripts/performance/'+file],{stdio:'inherit'});child.once('error',reject);child.once('exit',resolve);});
  if(code!==0){console.error('Verification failed: '+file);process.exitCode=1;break;}
}

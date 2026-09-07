import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {runtimeFingerprint} from './lib/runtime-fingerprint.mjs';
import {skillRoot,skillVersion} from './lib/config.mjs';
const mode=process.argv[2];
if(mode==='--stamp') {fs.writeFileSync(path.join(skillRoot,'RELEASE-FINGERPRINT'),runtimeFingerprint(skillRoot).sha256+'\n');console.log('Release fingerprint stamped; rerun tests before publishing.');}
else if(mode==='--fingerprint') console.log(JSON.stringify(runtimeFingerprint(skillRoot)));
else {
  const runtime=runtimeFingerprint(skillRoot);if(runtime.status!=='verified-release') throw new Error('RUNTIME_NOT_VERIFIED');
  const require=createRequire(path.join(process.env.RUNTIME_NODE_MODULES,'package.json')),JSZip=require('jszip'),zip=new JSZip();
  const add=rel=>{const file=path.join(skillRoot,rel);if(fs.statSync(file).isDirectory()) for(const name of fs.readdirSync(file).sort()) add(path.join(rel,name));else zip.file('mint-report-creative-ppt/'+rel.split(path.sep).join('/'),fs.readFileSync(file));};
  for(const rel of ['SKILL.md','VERSION','RELEASE-FINGERPRINT','package.json','agents','assets','references','schemas','scripts','README.md','REUSE.md','VALIDATION.md']) add(rel);
  const out=path.resolve(mode||path.join(skillRoot,'dist',`mint-report-creative-ppt-${skillVersion}.zip`));
  if(fs.existsSync(out)) throw new Error('PACKAGE_OUTPUT_EXISTS');fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));console.log(out);
}

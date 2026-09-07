import path from 'node:path';
import {checkRun,writeJson} from './lib/creative-contract.mjs';
const run=process.argv[2];if(!run) throw new Error('Usage: preflight.mjs RUN_DIRECTORY');
const result=await checkRun(run);
const receipt={status:'pass',at:new Date().toISOString(),hashes:result.hashes,runtimeSha256:result.runtime.sha256,template:{id:result.templateManifest.templateVersion,sha256:result.templateManifest.templateSha256,referenceSha256:result.templateManifest.referenceSha256}};
writeJson(path.join(result.run,'preflight.json'),receipt);
console.log(JSON.stringify(receipt));

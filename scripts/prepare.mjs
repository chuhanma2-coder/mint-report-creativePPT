import fs from 'node:fs';
import path from 'node:path';
import {inventoryCanonicalInput,createCanonicalLedger} from './lib/canonical-source-ledger.mjs';
import {readJson,writeJson,hashFile,assertNew} from './lib/creative-contract.mjs';
import {skillVersion} from './lib/config.mjs';

const [inputFile,promptFile,out]=process.argv.slice(2);
if(!out) throw new Error('Usage: prepare.mjs inputs.json prompt.txt NEW_RUN_DIRECTORY');
const run=path.resolve(out);assertNew(run);
const inventories=[];
for(const descriptor of readJson(inputFile)) inventories.push(await inventoryCanonicalInput(descriptor));
const canonical=createCanonicalLedger(inventories);
const prompt=fs.readFileSync(promptFile);
fs.mkdirSync(run,{recursive:true});
fs.writeFileSync(path.join(run,'prompt.txt'),prompt);
writeJson(path.join(run,'canonical-source.json'),canonical);
writeJson(path.join(run,'source-model.json'),{sourceUnits:canonical.units.map(u=>({...u,canonicalRefs:[u.id],visibility:'required-visible'}))});
writeJson(path.join(run,'run.json'),{version:skillVersion,startedAt:new Date().toISOString(),generatorId:process.env.CODEX_THREAD_ID||null,promptSha256:hashFile(promptFile),canonicalSha256:canonical.sha256});
console.log(JSON.stringify({run,rawStructuralUnits:canonical.units.length,next:'Review source-model.json and author brief.json; set brief.template to mint-template-16x9/1. A task card is optional for personal work and recommended for teams.'}));

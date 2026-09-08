import fs from 'node:fs';
import path from 'node:path';
import {digest} from './review-evidence.mjs';
import {verifyCanonicalLedger} from './canonical-source-ledger.mjs';
import {runtimeFingerprint} from './runtime-fingerprint.mjs';
import {skillRoot,mintTemplatePath,mintReferencePath,templateManifest,theme} from './config.mjs';
import {copyTextIssues} from './presentation-copy.mjs';
import {templatePackage,styleAuthority} from './template-contract.mjs';

export const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
export const hashFile=file=>digest(fs.readFileSync(file));
export const writeJson=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
export const nonempty=value=>typeof value==='string'&&Boolean(value.trim());
export function assertNew(file) {if(fs.existsSync(file)) throw new Error(`OUTPUT_EXISTS: ${file}`);}
export function insideRun(run,file) {
  let ancestor=path.resolve(file);const suffix=[];
  while(!fs.existsSync(ancestor)){suffix.unshift(path.basename(ancestor));ancestor=path.dirname(ancestor);}
  const relative=path.relative(fs.realpathSync(run),path.join(fs.realpathSync(ancestor),...suffix));
  if(relative.startsWith('..')||path.isAbsolute(relative)) throw new Error('OUTPUT_OUTSIDE_RUN');
}
const strings=v=>typeof v==='string'?[v]:Array.isArray(v)?v.flatMap(strings):v&&typeof v==='object'?Object.values(v).flatMap(strings):[];
export function briefIssues(brief,canonical,source) {
  const issues=[],known=new Set(canonical.units.map(u=>u.id)),covered=new Set();
  if(!nonempty(brief.audience)||!nonempty(brief.goal)||!brief.fonts?.length||brief.fonts.some(f=>!nonempty(f))) issues.push('BRIEF_CONTEXT_REQUIRED');
  if(!brief.authoring?.file&&brief.fonts?.some(f=>!theme.fonts.allowed.includes(f))) issues.push('BRAND_FONT_NOT_ALLOWED');
  if(!brief.authoring?.file&&(brief.template?.id!=='mint-template-16x9/1'||brief.template?.mode!=='native-brand-shell')) issues.push('MINT_TEMPLATE_BRIEF_REQUIRED');
  if(!brief.stories?.length) issues.push('BRIEF_STORIES_REQUIRED');
  const ids=new Set();
  for(const s of brief.stories||[]) {
    if(!nonempty(s.id)||ids.has(s.id)) issues.push('STORY_ID_INVALID');ids.add(s.id);
    for(const key of ['message','firstFocus','composition','emphasis']) if(!nonempty(s[key])) issues.push(`STORY_${key.toUpperCase()}_REQUIRED: ${s.id}`);
    if(!s.sourceRefs?.length) issues.push(`STORY_SOURCE_REQUIRED: ${s.id}`);
    for(const ref of s.sourceRefs||[]) {if(!known.has(ref)) issues.push(`STORY_UNKNOWN_SOURCE: ${ref}`);covered.add(ref);}
    if(!s.displayCopy||!strings(s.displayCopy).some(nonempty)) issues.push(`DISPLAY_COPY_REQUIRED: ${s.id}`);
    for(const text of strings(s.displayCopy)) issues.push(...copyTextIssues(text,brief));
  }
  for(const id of known) if(!covered.has(id)) issues.push(`STORY_UNASSIGNED_SOURCE: ${id}`);
  if(source.approvedOmissions?.length) issues.push('OMISSION_NOT_SUPPORTED: retain supplied business facts in body');
  if(source.sourceUnits?.length!==canonical.units.length) issues.push('SOURCE_UNIT_COUNT_CHANGED');
  for(const raw of canonical.units) {
    const units=(source.sourceUnits||[]).filter(u=>u.id===raw.id);
    if(units.length!==1||units[0].text!==raw.text||JSON.stringify(units[0].sourceAnchors)!==JSON.stringify(raw.sourceAnchors)) issues.push(`RAW_ANCHOR_CHANGED: ${raw.id}`);
    if(units[0]?.visibility==='traceability') issues.push(`BUSINESS_FACT_NOT_BODY: ${raw.id}`);
    if(raw.kind==='image'&&units[0]?.imageReview?.status!=='reviewed') issues.push(`SOURCE_IMAGE_REVIEW_REQUIRED: ${raw.id}`);
  }
  const requirements=new Set();
  for(const r of brief.requirements||[]) {
    if(!nonempty(r.id)||requirements.has(r.id)||!['hard','soft'].includes(r.strength)||!nonempty(r.text)||!nonempty(r.originText)) issues.push('REQUIREMENT_INVALID');requirements.add(r.id);
  }
  if(brief.explicitSlideCount!==undefined&&(!Number.isSafeInteger(brief.explicitSlideCount)||brief.explicitSlideCount<1)) issues.push('EXPLICIT_SLIDE_COUNT_INVALID');
  return [...new Set(issues)];
}
export async function checkRun(run,{requirePreflight=false}={}) {
  run=path.resolve(run);
  const canonical=readJson(path.join(run,'canonical-source.json')),source=readJson(path.join(run,'source-model.json')),brief=readJson(path.join(run,'brief.json')),manifest=readJson(path.join(run,'run.json'));
  await verifyCanonicalLedger(canonical);
  const runtime=runtimeFingerprint(skillRoot),issues=briefIssues(brief,canonical,source);
  if(runtime.status!=='verified-release') issues.push('RUNTIME_NOT_VERIFIED');
  if(hashFile(mintTemplatePath)!==templateManifest.templateSha256||hashFile(mintReferencePath)!==templateManifest.referenceSha256) issues.push('MINT_TEMPLATE_IDENTITY_CHANGED');
  const template=await templatePackage(mintTemplatePath);
  if(template.slideSizeEmu!==templateManifest.slideSizeEmu||template.slides.length!==1||template.slides[0].automaticFields!==1||template.slides[0].manualPageNumberNames) issues.push('MINT_TEMPLATE_CONTRACT_INVALID');
  const authority=styleAuthority(brief.authoring,mintTemplatePath);
  authority.file=path.resolve(run,authority.file);
  authority.sha256=hashFile(authority.file);
  if(authority.originText&&!fs.readFileSync(path.join(run,'prompt.txt'),'utf8').includes(authority.originText)) issues.push('STYLE_INSTRUCTION_NOT_IN_PROMPT');
  const files=['canonical-source.json','source-model.json','brief.json','prompt.txt'];
  const hashes=Object.fromEntries(files.map(f=>[f,hashFile(path.join(run,f))]));
  if(hashes['prompt.txt']!==manifest.promptSha256) issues.push('ORIGINAL_PROMPT_CHANGED');
  if(canonical.sha256!==manifest.canonicalSha256) issues.push('CANONICAL_IDENTITY_CHANGED');
  if(requirePreflight) {
    const receipt=readJson(path.join(run,'preflight.json'));
    if(JSON.stringify(receipt.hashes)!==JSON.stringify(hashes)||receipt.runtimeSha256!==runtime.sha256||receipt.status!=='pass'||JSON.stringify(receipt.styleAuthority)!==JSON.stringify(authority)) issues.push('PREFLIGHT_STALE_OR_FAILED');
  }
  if(issues.length) throw new Error(issues.join('\n'));
  const selectedManifest=authority.builtin?templateManifest:{templateVersion:'user-reference',templateSha256:authority.sha256,referenceSha256:authority.sha256};
  return {run,canonical,source,brief,manifest,runtime,hashes,styleAuthority:authority,templatePath:authority.file,referencePath:authority.builtin?mintReferencePath:authority.file,templateManifest:selectedManifest};
}

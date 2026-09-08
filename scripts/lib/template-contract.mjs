import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {theme} from './config.mjs';

// Resolve once per run. Existing deck style is authoritative only for edits or
// an explicit style override, never merely because an old deck is in history.
export function styleAuthority(request={},builtin) {
  const mode=request.mode||'create';
  if(!['create','rebuild','edit'].includes(mode)) throw new Error('STYLE_MODE_INVALID');
  if(mode==='edit'&&!request.file) throw new Error('STYLE_REFERENCE_REQUIRED');
  if(request.file&&!request.originText?.trim()) throw new Error('STYLE_OVERRIDE_INSTRUCTION_REQUIRED');
  return {mode,file:request.file||builtin,originText:request.originText||null,builtin:!request.file};
}

export function brandLayoutIssues(layout,{shell=theme.bodyShell}={}) {
  const issues=[],elements=layout.elements||[],titles=elements.filter(e=>e.name==='Mint content title');
  if(titles.length!==1) issues.push(titles.length?'BODY_TITLE_DUPLICATED':'BODY_TITLE_REQUIRED');
  for(const t of titles) {
    if(!t.text?.trim()) issues.push('BODY_TITLE_REQUIRED');
    if(/[\r\n]/.test(t.text||'')||t.textLayout?.lineCount>1) issues.push('BODY_TITLE_SINGLE_LINE');
    if(!Number.isFinite(t.textLayout?.lineCount)) issues.push('BODY_TITLE_MEASUREMENT_REQUIRED');
    const runSizes=(t.paragraphs||[]).flatMap(p=>(p.runs||[]).map(r=>r.fontSize)).filter(Number.isFinite);
    // Imported run styles override the shape's default (often 14pt).
    const sizes=runSizes.length?runSizes:[t.resolvedFontSize].filter(Number.isFinite);
    if(!sizes.length||sizes.some(s=>Math.abs(s*72/96-shell.title.fontSizePt)>.1)) issues.push('BODY_TITLE_SIZE');
    const styles=[t.resolvedTextStyle,...(t.paragraphs||[]).flatMap(p=>(p.runs||[]))].filter(Boolean);
    if(!styles.length||styles.some(s=>s.typeface&&s.typeface!==shell.title.fontFamily||s.color&&s.color.toUpperCase()!==shell.title.color||s.bold===false||s.alignment&&s.alignment!=='left')) issues.push('BODY_TITLE_STYLE');
    if(!t.bbox||t.bbox.some((n,i)=>Math.abs(n-shell.title.bbox[i])>1)) issues.push('BODY_TITLE_POSITION');
  }
  for(const e of elements) {
    if(!e.bbox||e.name==='Mint content title'||shell.inheritedNames.includes(e.name)) continue;
    const [,y,,h]=e.bbox;
    if(y<shell.bodyTop-1||y+h>shell.bodyBottom+1) issues.push('BRAND_REGION_INTRUSION: '+(e.name||e.id));
  }
  return [...new Set(issues)];
}

const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const xmlText=xml=>[...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(m=>m[1]).join(' ');
export function placeholderIssues(xml) {
  const shapes=xml.match(/<p:(?:sp|pic)\b[\s\S]*?<\/p:(?:sp|pic)>/g)||[];
  return shapes.filter(s=>/<p:ph\b/.test(s)&&!/<a:fld\b[^>]*type="slidenum"/.test(s)&&!xmlText(s).trim()).length;
}
const attr=(xml,key)=>xml.match(new RegExp('\\b'+key+'="([^"]*)"'))?.[1]||'';
const objects=xml=>xml.match(/<p:(?:sp|pic|graphicFrame|cxnSp)\b[^>]*>[\s\S]*?<\/p:(?:sp|pic|graphicFrame|cxnSp)>/g)||[];
const box=xml=>{
  const off=xml.match(/<a:off\b[^>]*>/)?.[0]||'',ext=xml.match(/<a:ext\b[^>]*\bcx="[^"]*"[^>]*>/)?.[0]||'';
  return [attr(off,'x'),attr(off,'y'),attr(ext,'cx'),attr(ext,'cy')].map(v=>v===''?NaN:Number(v)/9525);
};
async function related(zip,part,type) {
  const relPart=path.posix.join(path.posix.dirname(part),'_rels',path.posix.basename(part)+'.rels');
  const rels=await zip.file(relPart)?.async('string')||'';
  const rel=(rels.match(/<Relationship\b[^>]*>/g)||[]).find(r=>attr(r,'Type').endsWith('/'+type));
  if(!rel) return null;
  const target=attr(rel,'Target');
  return path.posix.normalize(target.startsWith('/')?target.slice(1):path.posix.join(path.posix.dirname(part),target));
}
async function shellOf(zip,part) {
  const layers=[];let current=part;
  for(const type of ['slideLayout','slideMaster',null]) {
    if(!current) break;
    const xml=await zip.file(current)?.async('string')||'';
    layers.push({part:current,xml});
    current=type?await related(zip,current,type):null;
  }
  const background=layers.map(l=>l.xml.match(/<p:bg\b[^>]*>[\s\S]*?<\/p:bg>/)?.[0]).find(Boolean)||'';
  const chrome=[];
  for(const layer of layers) for(const xml of objects(layer.xml)) {
    if(/<p:ph\b/.test(xml)) continue;
    const name=attr(xml.match(/<p:cNvPr\b[^>]*>/)?.[0]||'','name');
    const b=box(xml);
    if(!b.every(Number.isFinite)) continue;
    if(name.startsWith('Mint ')&&name!=='Mint content title'||layer.part!==part&&b[1]>648) {
      const colors=[...xml.matchAll(/<a:(?:srgbClr|schemeClr)\b[^>]*val="([^"]*)"/g)].map(m=>m[1]);
      chrome.push({name,box:b,colors});
    }
  }
  const placeholders=layers.reduce((sum,l)=>sum+objects(l.xml).filter(o=>/<p:ph\b/.test(o)&&!/<a:fld\b[^>]*type="slidenum"/.test(o)).length,0);
  return {background:attr(background.match(/<a:(?:srgbClr|schemeClr)\b[^>]*>/)?.[0]||'','val'),chrome,placeholders};
}
function chromeIssues(actual,reference) {
  const issues=[];
  for(const expected of reference) {
    const matches=actual.filter(o=>o.name===expected.name);
    if(matches.length!==1) {issues.push('BRAND_OBJECT_MISSING_OR_DUPLICATED: '+expected.name);continue;}
    const found=matches[0];
    if(found.box.some((v,i)=>Math.abs(v-expected.box[i])>1)||JSON.stringify(found.colors)!==JSON.stringify(expected.colors)) issues.push('BRAND_OBJECT_CHANGED: '+expected.name);
  }
  return issues;
}
async function zipOf(file) {
  const require=createRequire(path.join(process.env.RUNTIME_NODE_MODULES,'package.json')),{default:JSZip}=await import(require.resolve('jszip'));
  return JSZip.loadAsync(fs.readFileSync(file));
}
export async function templatePackage(file) {
  const zip=await zipOf(file),presentation=await zip.file('ppt/presentation.xml')?.async('string')||'',rels=await zip.file('ppt/_rels/presentation.xml.rels')?.async('string')||'';
  const size=presentation.match(/<p:sldSz\b[^>]*cx="(\d+)"[^>]*cy="(\d+)"/)?.slice(1).map(Number);
  const slideParts=[...presentation.matchAll(/<p:sldId\b[^>]*r:id="([^"]+)"[^>]*>/g)].map(m=>{
    const rel=(rels.match(/<Relationship\b[^>]*>/g)||[]).find(r=>attr(r,'Id')===m[1]);
    const target=attr(rel||'','Target');
    if(!target) throw new Error('STYLE_SLIDE_RELATIONSHIP_MISSING');
    return path.posix.normalize(target.startsWith('/')?target.slice(1):path.posix.join('ppt',target));
  });
  const slides=await Promise.all(slideParts.map(async part=>{const xml=await zip.file(part).async('string');return {part,unusedPlaceholders:placeholderIssues(xml),shell:await shellOf(zip,part),automaticFields:(xml.match(/<a:fld\b[^>]*type="slidenum"/g)||[]).length,manualPageNumberNames:(xml.match(/name="Mint page number/g)||[]).length,text:xmlText(xml)};}));
  const masters=Object.keys(zip.files).filter(n=>/^ppt\/slideMasters\/slideMaster\d+\.xml$/.test(n));
  const layouts=Object.keys(zip.files).filter(n=>/^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(n));
  const theme=await zip.file('ppt/theme/theme1.xml')?.async('nodebuffer');
  return {sha256:sha(fs.readFileSync(file)),size,slideSizeEmu:size?.join(',')||null,slides,masterCount:masters.length,layoutCount:layouts.length,themeSha256:theme?sha(theme):null,presentationRelationshipText:rels};
}
export async function templateOutputIssues(file,{templateFile,requireAutomaticPageNumbers=true,mode='create',pageKinds=[]}={}) {
  const actual=await templatePackage(file),reference=templateFile?await templatePackage(templateFile):null,issues=[];
  if(!actual.size||Math.abs(actual.size[0]/actual.size[1]-16/9)>.002) issues.push('TEMPLATE_SLIDE_SIZE_CHANGED');
  if(!actual.masterCount||actual.layoutCount<1) issues.push('TEMPLATE_MASTER_OR_LAYOUT_MISSING');
  if(reference&&actual.themeSha256!==reference.themeSha256) issues.push('TEMPLATE_THEME_CHANGED');
  if(reference&&actual.masterCount<reference.masterCount) issues.push('TEMPLATE_MASTER_LOST');
  if(reference) for(const [i,slide] of actual.slides.entries()) {
    const expected=reference.slides[mode==='edit'?i:0];
    if(!expected) {issues.push('STYLE_REFERENCE_PAGE_MISSING: '+slide.part);continue;}
    if((mode==='edit'||!pageKinds[i]||pageKinds[i]==='body')&&slide.shell.background!==expected.shell.background) issues.push('BODY_BACKGROUND_CHANGED: '+slide.part);
    if(!expected.shell.placeholders&&slide.shell.placeholders) issues.push('INHERITED_PLACEHOLDER_REINTRODUCED: '+slide.part);
    issues.push(...chromeIssues(slide.shell.chrome,expected.shell.chrome).map(x=>slide.part+': '+x));
  }
  for(const slide of actual.slides) {
    if(slide.unusedPlaceholders) issues.push(`UNUSED_PLACEHOLDER: ${slide.part}`);
    if(/单击此处添加|单击此处编辑|Click to (?:add|edit)/i.test(slide.text)) issues.push(`TEMPLATE_PROMPT_LEAK: ${slide.part}`);
  }
  if(requireAutomaticPageNumbers) for(const slide of actual.slides) {
    if(slide.automaticFields!==1) issues.push(`AUTOMATIC_PAGE_NUMBER_REQUIRED: ${slide.part}`);
    if(slide.manualPageNumberNames) issues.push(`MANUAL_PAGE_NUMBER_FORBIDDEN: ${slide.part}`);
  }
  return {passed:!issues.length,issues,actual,templateSha256:reference?.sha256||null};
}

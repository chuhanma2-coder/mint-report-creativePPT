import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';

const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const xmlText=xml=>[...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(m=>m[1]).join(' ');
async function zipOf(file) {
  const require=createRequire(path.join(process.env.RUNTIME_NODE_MODULES,'package.json')),{default:JSZip}=await import(require.resolve('jszip'));
  return JSZip.loadAsync(fs.readFileSync(file));
}
export async function templatePackage(file) {
  const zip=await zipOf(file),presentation=await zip.file('ppt/presentation.xml')?.async('string')||'',rels=await zip.file('ppt/_rels/presentation.xml.rels')?.async('string')||'';
  const size=presentation.match(/<p:sldSz\b[^>]*cx="(\d+)"[^>]*cy="(\d+)"/)?.slice(1).map(Number);
  const slideParts=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort();
  const slides=await Promise.all(slideParts.map(async part=>{const xml=await zip.file(part).async('string');return {part,automaticFields:(xml.match(/<a:fld\b[^>]*type="slidenum"/g)||[]).length,manualPageNumberNames:(xml.match(/name="Mint page number/g)||[]).length,text:xmlText(xml)};}));
  const masters=Object.keys(zip.files).filter(n=>/^ppt\/slideMasters\/slideMaster\d+\.xml$/.test(n));
  const layouts=Object.keys(zip.files).filter(n=>/^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(n));
  const theme=await zip.file('ppt/theme/theme1.xml')?.async('nodebuffer');
  return {sha256:sha(fs.readFileSync(file)),size,slideSizeEmu:size?.join(',')||null,slides,masterCount:masters.length,layoutCount:layouts.length,themeSha256:theme?sha(theme):null,presentationRelationshipText:rels};
}
export async function templateOutputIssues(file,{templateFile,requireAutomaticPageNumbers=true}={}) {
  const actual=await templatePackage(file),reference=templateFile?await templatePackage(templateFile):null,issues=[];
  if(!actual.size||Math.abs(actual.size[0]/actual.size[1]-16/9)>.002) issues.push('TEMPLATE_SLIDE_SIZE_CHANGED');
  if(!actual.masterCount||actual.layoutCount<1) issues.push('TEMPLATE_MASTER_OR_LAYOUT_MISSING');
  if(reference&&actual.themeSha256!==reference.themeSha256) issues.push('TEMPLATE_THEME_CHANGED');
  if(reference&&actual.masterCount<reference.masterCount) issues.push('TEMPLATE_MASTER_LOST');
  if(requireAutomaticPageNumbers) for(const slide of actual.slides) {
    if(slide.automaticFields!==1) issues.push(`AUTOMATIC_PAGE_NUMBER_REQUIRED: ${slide.part}`);
    if(slide.manualPageNumberNames) issues.push(`MANUAL_PAGE_NUMBER_FORBIDDEN: ${slide.part}`);
  }
  return {passed:!issues.length,issues,actual,templateSha256:reference?.sha256||null};
}

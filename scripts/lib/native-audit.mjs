import fs from 'node:fs';
import path from 'node:path';
import {inspectPptxPackage} from './pptx-metadata.mjs';
import {auditFinalTable,auditNativeChart} from './native-values.mjs';
import {auditVisibleFactContent,auditSourceCoverage} from './source-coverage.mjs';
import {canonicalCoverage} from './canonical-source-ledger.mjs';
import {copyTextIssues} from './presentation-copy.mjs';
import {imageReadabilityIssues} from './image-readability.mjs';
import {textFloorPt} from './typography-contract.mjs';
import {brandLayoutIssues} from './template-contract.mjs';
import {theme} from './config.mjs';
import {digest} from './review-evidence.mjs';
import {hashFile,readJson,nonempty} from './creative-contract.mjs';

const decode=v=>String(v||'').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&amp;','&');
const attr=(xml,key)=>decode(xml.match(new RegExp(`\\b${key}="([^"]*)"`))?.[1]);
const text=xml=>[...xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map(m=>decode(m[1])).join(' ');
const resolvePart=(owner,target)=>path.posix.normalize(target.startsWith('/')?target.slice(1):path.posix.join(path.posix.dirname(owner),target));
export function nativeObjects(xml) {
  return [...xml.matchAll(/<p:(sp|graphicFrame|pic|cxnSp)\b[^>]*>[\s\S]*?<\/p:\1>/g)].map(m=>({name:attr(m[0].match(/<p:cNvPr\b[^>]*>/)?.[0]||'','name'),xml:m[0],text:text(m[0]),kind:m[1]}));
}
export function capacityIssues(map,brief) {
  const issues=[];
  for(const story of brief.stories) {
    const pages=map.slides.filter(s=>(s.storyIds||[s.storyId]).includes(story.id));
    if(!pages.length) issues.push(`STORY_NOT_PRESENT: ${story.id}`);
    if(pages.length<=1) continue;
    const proof=(map.capacityAttempts||[]).find(a=>a.storyId===story.id);
    if(!proof||!nonempty(proof.naturalBreak)||!nonempty(proof.mergeRecheck)||proof.attempts?.length<2) {issues.push(`CAPACITY_PROOF_REQUIRED: ${story.id}`);continue;}
    const compositions=new Set();
    for(const a of proof.attempts) {
      compositions.add(a.composition);
      if(!nonempty(a.composition)||!nonempty(a.failureReason)||!nonempty(a.localRepair)||!nonempty(a.remainingSpace)||!a.files?.length) issues.push('CAPACITY_ATTEMPT_INCOMPLETE');
      if(!a.files?.some(f=>f.path?.endsWith('.pptx'))||!a.files?.some(f=>/\.png$/i.test(f.path||''))) issues.push('CAPACITY_NATIVE_EVIDENCE_REQUIRED');
      for(const f of a.files||[]) if(!fs.existsSync(f.path)||hashFile(f.path)!==f.sha256) issues.push('CAPACITY_EVIDENCE_CHANGED');
    }
    if(compositions.size<2) issues.push('CAPACITY_ALTERNATIVES_IDENTICAL');
  }
  return issues;
}
export async function auditNativeContent(file,inspection,map,{canonical,source,brief}) {
  const pkg=await inspectPptxPackage(file),issues=[...inspection.issues],groups={slides:[]},renderedModules=[],bindings=[];
  if(inspection.pptxSha256!==hashFile(file)) issues.push('INSPECTION_PPT_CHANGED');
  if(map.slides?.length!==pkg.slides.length) issues.push('EVIDENCE_PAGE_COUNT');
  if(brief.explicitSlideCount&&brief.explicitSlideCount!==pkg.slides.length) issues.push('HARD_SLIDE_COUNT');
  const knownStories=new Set(brief.stories.map(s=>s.id));
  for(const [i,xml] of pkg.slideXml.entries()) {
    const slide=map.slides?.[i],actual=inspection.slides[i];
    if(slide?.id!==`slide-${i+1}`) {issues.push('EVIDENCE_PAGE_ORDER');continue;}
    if(!(slide.storyIds||[slide.storyId]).every(id=>knownStories.has(id))) issues.push('UNKNOWN_STORY');
    if(hashFile(actual.renderedImage)!==actual.imageSha256||hashFile(actual.layoutFile)!==actual.layoutSha256) issues.push('INSPECTION_FILES_CHANGED');
    const layout=readJson(actual.layoutFile),objects=nativeObjects(xml),names=new Set();
    if(slide.pageKind&&!['body','cover','section','full-image'].includes(slide.pageKind)) issues.push('PAGE_KIND_INVALID: '+slide.id);
    if((!slide.pageKind||slide.pageKind==='body')&&!brief.authoring?.file&&brief.authoring?.mode!=='edit') issues.push(...brandLayoutIssues(layout).map(x=>slide.id+': '+x));
    for(const o of objects) {
      if(o.name==='Mint content title'&&!brief.authoring?.file) {
        if(!/<a:(?:rPr|defRPr)\b[^>]*\bb="1"/.test(o.xml)||!o.xml.includes(theme.bodyShell.title.color.slice(1))||!o.xml.includes(theme.bodyShell.title.fontFamily)) issues.push('BODY_TITLE_STYLE: '+slide.id);
      }
      if(!o.name||names.has(o.name)) issues.push(`OBJECT_NAME_NOT_UNIQUE: ${slide.id}/${o.name}`);names.add(o.name);
      issues.push(...copyTextIssues(o.text,brief).map(k=>`${slide.id}/${o.name}: ${k}`));
      if(o.text.trim()&&/<a:normAutofit\b/.test(o.xml)) issues.push(`AUTO_SHRINK_ENABLED: ${o.name}`);
      const floor=textFloorPt({name:o.name,tableCell:/<a:tbl\b/.test(o.xml)});
      const sizes=[...o.xml.matchAll(/<a:(?:rPr|defRPr|endParaRPr)\b[^>]*\bsz="(\d+)"/g)].map(m=>+m[1]/100);
      if(o.name!=='Mint automatic page number'&&o.text.trim()&&(!sizes.length||sizes.some(n=>n<floor-.05))) issues.push(`NATIVE_FONT_FLOOR: ${o.name}`);
    }
    const relFile=path.posix.join(path.posix.dirname(pkg.slides[i]),'_rels',path.posix.basename(pkg.slides[i])+'.rels');
    const relXml=await pkg.zip.file(relFile)?.async('string')||'';
    const rels=new Map([...relXml.matchAll(/<Relationship\b[^>]*\/?\s*>/g)].map(m=>[attr(m[0],'Id'),resolvePart(pkg.slides[i],attr(m[0],'Target'))]));
    const bound=new Set(),modules=[];
    for(const c of slide.carriers||[]) {
      const selected=(c.objectNames||[]).map(name=>objects.find(o=>o.name===name));
      if(!nonempty(c.id)||!selected.length||selected.some(o=>!o)||!c.sourceUnitIds?.length) {issues.push(`CARRIER_BINDING_INVALID: ${c.id}`);continue;}
      if(!['text','metric','callout','diagram','table','chart','image'].includes(c.type)) issues.push(`CARRIER_TYPE_INVALID: ${c.id}`);
      selected.forEach(o=>bound.add(o.name));let payload=selected.map(o=>o.text).join(' ');const verifiedSourceImages=[];
      if(c.type==='table') {
        const tables=selected.filter(o=>/<a:tbl\b/.test(o.xml));
        if(tables.length!==1||!c.data) issues.push(`NATIVE_TABLE_REQUIRED: ${c.id}`);
        else {
          const cells=[...tables[0].xml.matchAll(/<a:tr\b[^>]*>([\s\S]*?)<\/a:tr>/g)].flatMap((r,ri)=>[...r[1].matchAll(/<a:tc\b[^>]*>([\s\S]*?)<\/a:tc>/g)].map((cell,ci)=>({row:ri+1,column:ci+1,text:text(cell[1])})));
          issues.push(...auditFinalTable(c.data,{cells}));
        }
      }
      if(c.type==='chart') {
        const charts=selected.filter(o=>/<c:chart\b/.test(o.xml));
        if(charts.length!==1||!c.data?.series?.length||!c.data.categories) issues.push(`NATIVE_CHART_REQUIRED: ${c.id}`);
        else {
          const target=rels.get(attr(charts[0].xml.match(/<c:chart\b[^>]*>/)?.[0]||'','r:id'));
          const chartXml=await pkg.zip.file(target)?.async('string')||'';
          const result=auditNativeChart(chartXml,c.data,c.variant);issues.push(...result.issues);
          const sizes=[...chartXml.matchAll(/<a:(?:rPr|defRPr)\b[^>]*sz="(\d+)"/g)].map(m=>+m[1]/100);
          if(!sizes.length||sizes.some(n=>n<15)) issues.push(`CHART_FONT_FLOOR: ${c.id}`);
          // Expected values can join visible coverage only after comparison with
          // actual native caches AND enabled exact labels. Review checks location.
          if(result.passed) payload+=' '+result.visibleLabels.join(' ');
        }
      }
      if(c.type==='image') {
        const pics=selected.filter(o=>o.kind==='pic');
        if(pics.length!==1||!c.imagePath||!fs.existsSync(c.imagePath)) issues.push(`SOURCE_IMAGE_BINDING_REQUIRED: ${c.id}`);
        else {
          const native=await pkg.zip.file(rels.get(attr(pics[0].xml.match(/<a:blip\b[^>]*>/)?.[0]||'','r:embed')))?.async('nodebuffer');
          const unchanged=native&&digest(native)===hashFile(c.imagePath);
          if(!unchanged) issues.push(`SOURCE_IMAGE_BYTES_CHANGED: ${c.id}`);
          const e=layout.elements?.find(e=>e.name===pics[0].name);
          const imageIssues=imageReadabilityIssues(c.imageTextReview,{width:(e?.bbox?.[2]||0)*1920/inspection.width,height:(e?.bbox?.[3]||0)*1920/inspection.width},c.sourceSize);
          issues.push(...imageIssues);
          const cropped=/<a:srcRect\b[^>]*\b[ltbr]="[1-9]\d*"/.test(pics[0].xml);
          if(cropped) issues.push(`IMAGE_CROP_REVIEW_NOT_VERIFIED: ${c.id}; partition/transcribe evidence explicitly`);
          if(!imageIssues.length&&unchanged&&!cropped) {
            payload+=' '+c.imageTextReview.regions.map(r=>r.text||'').join(' ');
            for(const id of c.sourceUnitIds) {
              const raw=canonical.units.find(u=>u.id===id);
              if(raw?.kind==='image'&&raw.sourceAnchors.some(a=>a.sha256===digest(native))) verifiedSourceImages.push(id);
            }
          }
        }
      }
      modules.push({...c,evidenceRefs:c.sourceUnitIds,visibleFacts:c.visibleFacts||c.sourceUnitIds.map(sourceUnitId=>({sourceUnitId,text:payload}))});
      renderedModules.push({slideId:slide.id,moduleId:c.id,text:payload,verifiedSourceImages});
      bindings.push({slideId:slide.id,carrierId:c.id,objectNames:c.objectNames,actualText:payload,sourceUnitIds:c.sourceUnitIds});
    }
    for(const o of objects) if((/<a:tbl\b|<c:chart\b/.test(o.xml)||o.kind==='pic')&&!bound.has(o.name)) issues.push(`NATIVE_EVIDENCE_UNBOUND: ${o.name}`);
    groups.slides.push({id:slide.id,role:'body',modules});
  }
  issues.push(...capacityIssues(map,brief));
  const visible=auditVisibleFactContent(source,groups,{renderedModules}),structural=auditSourceCoverage(source,groups),coverage=canonicalCoverage(canonical,source,visible);
  issues.push(...visible.issues,...structural.issues,...coverage.issues);
  return {passed:!issues.length,issues:[...new Set(issues)],coverage,visible,bindings,pageCount:pkg.slides.length,nativeTables:pkg.nativeTables,nativeCharts:pkg.charts.length,nativeShapes:pkg.nativeShapes};
}

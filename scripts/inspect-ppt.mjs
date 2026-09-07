import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {inspectPptxPackage} from './lib/pptx-metadata.mjs';
import {artifactLayoutIssues} from './lib/artifact-layout.mjs';
import {assertNew,hashFile,writeJson} from './lib/creative-contract.mjs';

// Import/export mechanics reused from the original audit.mjs visualChecks.
// Actual slide dimensions replace that renderer's hard-coded 1920px frame.
export async function inspectNative(file,out) {
  file=path.resolve(file);out=path.resolve(out);assertNew(out);
  const pkg=await inspectPptxPackage(file);
  const require=createRequire(path.join(process.env.RUNTIME_NODE_MODULES,'package.json'));
  const {FileBlob,PresentationFile}=await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
  const presentation=await PresentationFile.importPptx(await FileBlob.load(file));
  fs.mkdirSync(out,{recursive:true});
  const width=pkg.slideSize.cx/9525,height=pkg.slideSize.cy/9525;
  const report={pptx:file,pptxSha256:hashFile(file),width,height,slides:[],issues:[]};
  if(!pkg.slides.length||Math.abs(width/height-16/9)>.002) report.issues.push('SLIDE_SIZE_OR_COUNT_INVALID');
  if(pkg.hasExternalMedia) report.issues.push('EXTERNAL_MEDIA');
  if(pkg.fullSlideImages.length) report.issues.push('WHOLE_SLIDE_BITMAP');
  for(const [i,slide] of presentation.slides.items.entries()) {
    const stem=path.join(out,`slide-${i+1}`),renderedImage=stem+'.png',layoutFile=stem+'.layout.json';
    const png=await presentation.export({slide,format:'png',scale:1920/width});
    fs.writeFileSync(renderedImage,new Uint8Array(await png.arrayBuffer()));
    const layout=JSON.parse(await (await slide.export({format:'layout'})).text());
    writeJson(layoutFile,layout);
    const issues=artifactLayoutIssues(layout);
    for(const e of layout.elements||[]) {
      const b=e.bbox;
      if(!b||b.length!==4||!b.every(Number.isFinite)||b[2]<0||b[3]<0||b[0]<-.5||b[1]<-.5||b[0]+b[2]>width+.5||b[1]+b[3]>height+.5) issues.push(`OBJECT_OUT_OF_BOUNDS: ${e.name||e.id}`);
      if(e.text?.trim()&&Number(e.resolvedTextStyle?.autoFitScale||1)<.999) issues.push(`AUTO_SHRINK: ${e.name||e.id}`);
    }
    report.slides.push({id:`slide-${i+1}`,renderedImage,layoutFile,imageSha256:hashFile(renderedImage),layoutSha256:hashFile(layoutFile),objects:(layout.elements||[]).map(e=>({id:e.id,name:e.name,kind:e.kind,text:e.text,bbox:e.bbox})),issues});
    report.issues.push(...issues.map(issue=>`slide-${i+1}: ${issue}`));
  }
  report.passed=!report.issues.length;writeJson(path.join(out,'inspection.json'),report);return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const [file,out]=process.argv.slice(2);if(!out) throw new Error('Usage: inspect-ppt.mjs FILE.pptx NEW_INSPECTION_DIRECTORY');
  console.log(JSON.stringify(await inspectNative(file,out)));
}

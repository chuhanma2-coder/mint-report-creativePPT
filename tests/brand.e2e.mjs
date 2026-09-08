// Mechanical brand regression, not a fresh business/visual acceptance benchmark.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {nativePages,bodyHeader,connectForward} from '../scripts/lib/native-basics.mjs';
import {brandLayoutIssues,templateOutputIssues} from '../scripts/lib/template-contract.mjs';
import {mintTemplatePath} from '../scripts/lib/config.mjs';
const out=fs.mkdtempSync(path.join(os.tmpdir(),'mint-brand-regression-'));
const started=performance.now(),{presentation,pages,PresentationFile}=await nativePages(3);
const labels=['格式测试：并行关系','格式测试：自然短表','格式测试：单行标题'];
for(const [i,page] of pages.entries()) {
 bodyHeader(page,labels[i]);
 assert.throws(()=>bodyHeader(page,'重复标题'),/DUPLICATED/);
}
const node=(page,text,left,top)=>{
 const s=page.shapes.add({name:text,geometry:'textbox',position:{left,top,width:240,height:60},fill:'none',line:{fill:'none',width:0}});
 s.text=text;s.text.style={fontSize:24,typeface:'思源黑体 CN Regular',color:'#12695D',autoFit:'none'};
 return s;
};
const a=node(pages[0],'测试路径一',100,210),b=node(pages[0],'测试路径二',100,350),c=node(pages[0],'共享结果',750,280);
connectForward(pages[0],a,c,{line:{fill:'#12695D',width:2}});
connectForward(pages[0],b,c,{line:{fill:'#12695D',width:2}});
const table=pages[1].tables.add({rows:2,columns:2,left:100,top:210,width:540,height:100,values:[['测试列一','测试列二'],['示例甲','示例乙']]});
table.name='自然短表';
for(let r=0;r<2;r++) for(let c=0;c<2;c++) table.getCell(r,c).text.style={fontSize:16*96/72,typeface:'思源黑体 CN Regular',color:'#12695D',autoFit:'none'};
node(pages[1],'说明与表格就近',730,220);
node(pages[2],'正文区域可自由构图',100,180);
const file=path.join(out,'brand-fixture.pptx');
await (await PresentationFile.exportPptx(presentation)).save(file);
const auditStart=performance.now(),audit=await templateOutputIssues(file,{templateFile:mintTemplatePath});
assert.equal(audit.passed,true,JSON.stringify(audit.issues));
const auditMs=performance.now()-auditStart;
for(const [i,page] of pages.entries()) {
 const layout=JSON.parse(await (await page.export({format:'layout'})).text());
 fs.writeFileSync(path.join(out,'slide-'+(i+1)+'.layout.json'),JSON.stringify(layout,null,2));
 assert.deepEqual(brandLayoutIssues(layout),[]);
 const png=await presentation.export({slide:page,format:'png',scale:1});
 fs.writeFileSync(path.join(out,'slide-'+(i+1)+'.png'),new Uint8Array(await png.arrayBuffer()));
}
const require=createRequire(path.join(process.env.RUNTIME_NODE_MODULES,'package.json')),JSZip=require('jszip');
const {FileBlob}=await import(require.resolve('@oai/artifact-tool'));
const reopened=await PresentationFile.importPptx(await FileBlob.load(file));
for(const page of reopened.slides.items) assert.deepEqual(brandLayoutIssues(JSON.parse(await (await page.export({format:'layout'})).text())),[]);
const zip=await JSZip.loadAsync(fs.readFileSync(file)),part='ppt/slides/slide1.xml',xml=await zip.file(part).async('string');
zip.file(part,xml.replace('FBFCF8','FFFFFF'));
const drift=path.join(out,'background-drift.pptx');fs.writeFileSync(drift,await zip.generateAsync({type:'nodebuffer'}));
assert.ok((await templateOutputIssues(drift,{templateFile:mintTemplatePath})).issues.some(s=>s.startsWith('BODY_BACKGROUND_CHANGED')));
assert.equal((await templateOutputIssues(drift,{templateFile:drift,mode:'edit'})).passed,true);
assert.equal((await templateOutputIssues(file,{templateFile:drift,mode:'edit'})).passed,false);
zip.file(part,xml);
const layoutPart='ppt/slideLayouts/slideLayout2.xml',layoutXml=await zip.file(layoutPart).async('string');
zip.file(layoutPart,layoutXml.replace('</p:spTree>','<p:sp><p:nvSpPr><p:cNvPr id="999" name="unused"/><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr></p:sp></p:spTree>'));
const placeholder=path.join(out,'placeholder-returned.pptx');fs.writeFileSync(placeholder,await zip.generateAsync({type:'nodebuffer'}));
assert.ok((await templateOutputIssues(placeholder,{templateFile:mintTemplatePath})).issues.some(s=>s.startsWith('INHERITED_PLACEHOLDER_REINTRODUCED')));
const title=pages[2].shapes.items.find(s=>s.name==='Mint content title');
title.text='这是用于验证超长标题必须先改写而不能缩小字号的测试标题'.repeat(4);
const longLayout=JSON.parse(await (await pages[2].export({format:'layout'})).text());
assert.ok(brandLayoutIssues(longLayout).includes('BODY_TITLE_SINGLE_LINE'));
console.log(JSON.stringify({status:'pass',out,auditMs,elapsedSeconds:(performance.now()-started)/1000,scope:'native brand fixture only; Windows and fresh authoring not tested'}));

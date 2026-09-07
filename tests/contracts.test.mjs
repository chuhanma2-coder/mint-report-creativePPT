import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createCanonicalLedger,inventoryCanonicalInput,verifyCanonicalLedger} from '../scripts/lib/canonical-source-ledger.mjs';
import {auditVisibleFactContent} from '../scripts/lib/source-coverage.mjs';
import {copyTextIssues} from '../scripts/lib/presentation-copy.mjs';
import {imageReadabilityIssues} from '../scripts/lib/image-readability.mjs';
import {artifactLayoutIssues} from '../scripts/lib/artifact-layout.mjs';
import {briefIssues,insideRun} from '../scripts/lib/creative-contract.mjs';
import {nativeObjects,capacityIssues} from '../scripts/lib/native-audit.mjs';
import {auditNativeChart,auditFinalTable} from '../scripts/lib/native-values.mjs';
import {reviewIssues} from '../scripts/audit-creative-delivery.mjs';
import {createTaskCard,taskCardIssues} from '../scripts/lib/team-task.mjs';
import {docxInventory} from '../scripts/lib/source-inventory.mjs';
import {createRequire} from 'node:module';

test('canonical input detects raw changes without a task card',async t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'creative-test-'));t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const file=path.join(tmp,'source.txt');fs.writeFileSync(file,'团队预计全年投入120万元，仅用于A项目。');
 const canonical=createCanonicalLedger([await inventoryCanonicalInput({path:file,sourceOrigin:'raw-source'})]);
 await verifyCanonicalLedger(canonical);fs.appendFileSync(file,'变更');await assert.rejects(()=>verifyCanonicalLedger(canonical),/CHANGED/);
});
test('run containment resolves aliases and rejects escaping symlinks',t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'creative-path-'));t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const run=path.join(tmp,'run');fs.mkdirSync(run);fs.symlinkSync(run,path.join(tmp,'alias'));
 assert.doesNotThrow(()=>insideRun(run,path.join(tmp,'alias','new','output.pptx')));
 fs.symlinkSync(os.tmpdir(),path.join(run,'escape'));assert.throws(()=>insideRun(run,path.join(run,'escape','output.pptx')),/OUTSIDE/);
});
test('direct native payload cannot claim facts from sidecars or notes',()=>{
 const source={sourceUnits:[{id:'s',text:'银行A和银行B预计全年收入777万美元',requiredComponents:['银行A','银行B','预计','全年','777','万美元'],componentReview:{status:'reviewed',sourceText:'银行A和银行B预计全年收入777万美元'}}]};
 const groups={slides:[{id:'1',modules:[{id:'m',visibleFacts:[{sourceUnitId:'s',text:'银行777'}]}]}]};
 const bad=auditVisibleFactContent(source,groups,{renderedModules:[{slideId:'1',moduleId:'m',text:'银行777'}]});assert.equal(bad.passed,false);
 groups.slides[0].modules[0].visibleFacts[0].text=source.sourceUnits[0].text;
 assert.equal(auditVisibleFactContent(source,groups,{renderedModules:[{slideId:'1',moduleId:'m',text:source.sourceUnits[0].text}]}).passed,true);
 assert.equal(auditVisibleFactContent(source,groups,{renderedModules:[]}).passed,false);
});
test('human copy rejects pipe and instruction leaks',()=>{
 assert.ok(copyTextIssues('银行 | 数字 | 视觉关键词').length);assert.deepEqual(copyTextIssues('银行A预计全年收入777万美元。'),[]);
});
test('image byte identity alone never proves fine text readable',()=>{
 assert.ok(imageReadabilityIssues(null,{width:100,height:100},{width:100,height:100}).length);
 assert.ok(imageReadabilityIssues({regions:[{id:'r',text:'明细',minimumGlyphHeightPx:8}]},{width:100,height:100},{width:100,height:100}).length);
});
test('actual native text collisions and floors reject',()=>{
 const e=(id,x,size)=>({id,text:'readable',bbox:[x,0,100,30],paragraphs:[{runs:[{fontSize:size}]}]});
 const issues=artifactLayoutIssues({elements:[e('a',0,24),e('b',10,10)]});assert.ok(issues.some(i=>i.startsWith('TEXT_COLLISION')));assert.ok(issues.some(i=>i.startsWith('ARTIFACT_FONT_FLOOR')));
});
test('brief assigns raw units and requires human display copy but not geometry grammar',()=>{
 const raw={id:'c',text:'材料',sourceAnchors:[]},canonical={units:[raw]},source={sourceUnits:[raw]};
 const brief={audience:'领导',goal:'判断',fonts:['Aptos'],template:{id:'mint-template-16x9/1',mode:'native-brand-shell'},stories:[{id:'s',sourceRefs:['c'],message:'判断',firstFocus:'条件',composition:'按关系自由设计',emphasis:'主次有别',displayCopy:{title:'材料'}}]};
 assert.deepEqual(briefIssues(brief,canonical,source),[]);brief.stories[0].displayCopy={};assert.ok(briefIssues(brief,canonical,source).length);
});
test('team task card is simple scope coordination, not a pagination template',()=>{
 const card=createTaskCard({reportTitle:'月报',audience:'管理层',purpose:'经营决策',chapters:[{order:1,title:'进展',owner:'甲',objective:'说明进展',sourcePaths:['/materials/a.docx']}]});
 assert.deepEqual(taskCardIssues(card),[]);assert.equal(card.chapters[0].sectionId,undefined);assert.equal(card.chapters[0].pageCount,undefined);
 const bad=structuredClone(card);bad.chapters[0].layout='three-cards';assert.ok(taskCardIssues(bad).includes('TASK_CARD_MUST_NOT_CONTROL_PAGINATION_OR_LAYOUT'));
});
test('outline and owner mapping are sufficient task-card input',()=>{
 const card=createTaskCard({chapters:[
  {order:1,title:'肯尼亚牌照进展',owner:'甲'},
  {order:2,title:'风险',owner:'乙'}
 ]});
 assert.deepEqual(taskCardIssues(card),[]);
 assert.equal(card.reportTitle,'管理层汇报');
 assert.equal(card.audience,undefined);assert.equal(card.purpose,undefined);
 assert.equal(card.chapters[0].objective,undefined);
 assert.equal(card.chapters[0].sourceType,'inline-outline');
 assert.equal(card.chapters[0].sourcePaths,undefined);
});
test('docx embedded charts and objects require explicit reviewed export',async t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'creative-docx-'));t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const require=createRequire(path.join(process.env.RUNTIME_NODE_MODULES,'package.json')),JSZip=require('jszip'),zip=new JSZip();
 zip.file('word/document.xml','<w:document><w:body><w:p><w:r><w:t>正文</w:t></w:r></w:p><c:chart r:id="rId1"/></w:body></w:document>');
 zip.file('word/charts/chart1.xml','<c:chartSpace/>');
 const file=path.join(tmp,'chart.docx');fs.writeFileSync(file,await zip.generateAsync({type:'nodebuffer'}));
 await assert.rejects(()=>docxInventory(file),/SOURCE_PART_REVIEW_REQUIRED/);
});
test('split needs failed native attempts, not estimated occupancy',()=>{
 const brief={stories:[{id:'s'}]},map={slides:[{storyId:'s'},{storyId:'s'}],capacityAttempts:[]};assert.ok(capacityIssues(map,brief).length);
 assert.deepEqual(capacityIssues({slides:[{storyId:'s'}]},brief),[]);
});
test('native object parsing excludes speaker notes and finds named graphics',()=>{
 const xml='<p:sp><p:cNvPr id="1" name="actual"/><a:t>正文</a:t></p:sp><p:graphicFrame><p:cNvPr id="2" name="table"/><a:tbl/></p:graphicFrame>';
 assert.deepEqual(nativeObjects(xml).map(o=>[o.name,o.text]),[['actual','正文'],['table','']]);
});
test('table validation checks every cell and chart rejects unsupported variant',()=>{
 assert.deepEqual(auditFinalTable({headers:['A'],rows:[[2]]},{cells:[{row:1,column:1,text:'A'},{row:2,column:1,text:'2'}]}),[]);
 assert.ok(auditFinalTable({headers:['A'],rows:[[2]]},{cells:[{row:1,column:1,text:'A'},{row:2,column:1,text:'3'}]}).length);
 assert.equal(auditNativeChart('',{series:[]},'invented').passed,false);
});
test('technical pass cannot bypass pending independent visual review',()=>{
 const issues=reviewIssues({verdict:'pending',slides:[],issues:[]},{slides:[{id:'slide-1'}],requirements:[],pptxSha256:'h'},{passed:true,status:'technical-candidate-awaiting-independent-review'});
 assert.ok(issues.includes('INDEPENDENT_VISUAL_REVIEW_REQUIRED'));
});

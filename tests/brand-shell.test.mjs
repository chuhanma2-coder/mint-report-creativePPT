import test from 'node:test';
import assert from 'node:assert/strict';
import {brandLayoutIssues,styleAuthority} from '../scripts/lib/template-contract.mjs';

test('rebuild resolves current template; edit requires explicit current PPT',()=>{
 assert.equal(styleAuthority({mode:'rebuild'},'current.pptx').file,'current.pptx');
 assert.throws(()=>styleAuthority({mode:'edit'},'current.pptx'),/STYLE_REFERENCE_REQUIRED/);
 assert.equal(styleAuthority({mode:'edit',file:'old.pptx',originText:'只改数字'},'current.pptx').file,'old.pptx');
 assert.throws(()=>styleAuthority({mode:'rebuild',file:'old.pptx'},'current.pptx'),/STYLE_OVERRIDE_INSTRUCTION_REQUIRED/);
});
const title={name:'Mint content title',text:'预计获批',bbox:[48,48,1184,56],textLayout:{lineCount:1},resolvedTextStyle:{typeface:'思源黑体 CN Regular',color:'#12695D',bold:true,alignment:'left'},paragraphs:[{runs:[{fontSize:32*96/72}]}]};
test('single line title is required without shrinking or blocking free body layouts',()=>{
 assert.deepEqual(brandLayoutIssues({elements:[title]}),[]);
 assert.ok(brandLayoutIssues({elements:[]}).includes('BODY_TITLE_REQUIRED'));
 assert.ok(brandLayoutIssues({elements:[title,{...title}]}).includes('BODY_TITLE_DUPLICATED'));
 assert.ok(brandLayoutIssues({elements:[{...title,textLayout:{lineCount:2}}]}).includes('BODY_TITLE_SINGLE_LINE'));
 assert.ok(brandLayoutIssues({elements:[{...title,paragraphs:[{runs:[{fontSize:24}]}]}]}).includes('BODY_TITLE_SIZE'));
 for(const kind of ['chart','table','shape','image']) assert.deepEqual(brandLayoutIssues({elements:[title,{name:'evidence',kind,bbox:[80,150,700,220]}]}),[]);
 assert.ok(brandLayoutIssues({elements:[title,{name:'cover',kind:'shape',bbox:[0,0,1280,720]}]}).some(x=>x.startsWith('BRAND_REGION_INTRUSION')));
 assert.ok(brandLayoutIssues({elements:[{...title,resolvedTextStyle:{...title.resolvedTextStyle,color:'#000000'}}]}).includes('BODY_TITLE_STYLE'));
 assert.deepEqual(brandLayoutIssues({elements:[{...title,resolvedFontSize:18.67}]}),[]);
});

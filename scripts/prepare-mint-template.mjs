import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';

const [sourceArg,outputArg,manifestArg]=process.argv.slice(2);
if(!outputArg) throw new Error('Usage: prepare-mint-template.mjs SOURCE.pptx NEW_TEMPLATE.pptx [manifest.json]');
const source=path.resolve(sourceArg),output=path.resolve(outputArg),manifestFile=path.resolve(manifestArg||output+'.manifest.json');
if(fs.existsSync(output)||fs.existsSync(manifestFile)) throw new Error('OUTPUT_EXISTS');
const require=createRequire(path.join(process.env.RUNTIME_NODE_MODULES,'package.json')),{default:JSZip}=await import(require.resolve('jszip'));
const bytes=fs.readFileSync(source),zip=await JSZip.loadAsync(bytes),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const presentation=await zip.file('ppt/presentation.xml').async('string'),rels=await zip.file('ppt/_rels/presentation.xml.rels').async('string');
const targetSlide='ppt/slides/slide4.xml';
const slideRel=[...rels.matchAll(/<Relationship\b[^>]*\/?\s*>/g)].find(m=>/\/slide"/.test(m[0])&&/Target="\/?ppt\/slides\/slide4\.xml"/.test(m[0]));
if(!slideRel) throw new Error('TEMPLATE_BASE_SLIDE_RELATIONSHIP_MISSING');
const id=slideRel[0].match(/\bId="([^"]+)"/)?.[1];
const list=presentation.match(/<p:sldIdLst\b[^>]*>([\s\S]*?)<\/p:sldIdLst>/)?.[0];
const selected=[...list.matchAll(/<p:sldId\b[^>]*\/?\s*>/g)].find(m=>m[0].includes(`r:id="${id}"`))?.[0];
if(!selected) throw new Error('TEMPLATE_BASE_SLIDE_ID_MISSING');
zip.file('ppt/presentation.xml',presentation.replace(list,`<p:sldIdLst>${selected}</p:sldIdLst>`));
zip.file('ppt/_rels/presentation.xml.rels',rels.replace(/<Relationship\b[^>]*\/?\s*>/g,match=>/\/slide"/.test(match)&&!match.includes(`Id="${id}"`)?'':match));
for(const name of Object.keys(zip.files)) {
  if(/^ppt\/slides\/slide\d+\.xml$/.test(name)&&name!==targetSlide) zip.remove(name);
  if(/^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(name)&&name!=='ppt/slides/_rels/slide4.xml.rels') zip.remove(name);
  if(/^ppt\/notesSlides\//.test(name)||/^ppt\/slides\/charts\//.test(name)||/^ppt\/embeddings\//.test(name)) zip.remove(name);
}
const slideRels=await zip.file('ppt/slides/_rels/slide4.xml.rels').async('string');
zip.file('ppt/slides/_rels/slide4.xml.rels',slideRels.replace(/<Relationship\b[^>]*Type="[^"]*\/notesSlide"[^>]*\/?\s*>/g,''));
let slide=await zip.file(targetSlide).async('string');
slide=slide.replace(/<p:sp>([\s\S]*?)<\/p:sp>/g,(whole,body)=>{
  if(/<p:ph\b/.test(body)) return '';
  if(/name="Mint page marker line 4"/.test(body)) return whole.replace('Mint page marker line 4','Mint page marker line');
  if(/name="Mint page number 4"/.test(body)) {
    const fieldId='{6F312AFB-B202-4ED7-8496-47B56973E7D4}';
    return whole.replace('Mint page number 4','Mint automatic page number')
      .replace(/<a:r>(<a:rPr\b[\s\S]*?<\/a:rPr>)<a:t>[\s\S]*?<\/a:t><\/a:r>/,`<a:fld id="${fieldId}" type="slidenum">$1<a:t>1</a:t></a:fld>`);
  }
  return '';
});
if(!/type="slidenum"/.test(slide)||/<a:t>04<\/a:t>/.test(slide)) throw new Error('AUTOMATIC_PAGE_FIELD_BUILD_FAILED');
zip.file(targetSlide,slide);
let types=await zip.file('[Content_Types].xml').async('string');
types=types.replace(/<Override\b[^>]*PartName="\/(?:ppt\/slides\/slide(?!4\.xml)\d+\.xml|ppt\/notesSlides\/[^"/]+|ppt\/slides\/charts\/[^"/]+|ppt\/embeddings\/[^"/]+)"[^>]*\/?\s*>/g,'');
zip.file('[Content_Types].xml',types);
const app=await zip.file('docProps/app.xml')?.async('string');
if(app) zip.file('docProps/app.xml',app.replace(/<Slides>\d+<\/Slides>/,'<Slides>1</Slides>').replace(/<Notes>\d+<\/Notes>/,'<Notes>0</Notes>'));
// Clean generating layouts as well: edit/reopen must not resurrect prompts.
// The untouched reference PPT retains all original examples and typography.
for(const name of Object.keys(zip.files)) if(/^ppt\/(?:slideLayouts|slideMasters)\/[^/]+\.xml$/.test(name)) {
  const xml=await zip.file(name).async('string');
  zip.file(name,xml.replace(/<p:sp\b[^>]*>[\s\S]*?<\/p:sp>/g,shape=>
    /<p:ph\b/.test(shape)&&!/<a:fld\b[^>]*type="slidenum"/.test(shape)?'':shape));
}
const result=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,result);
const manifest={schemaVersion:1,templateVersion:'mint-template-16x9/1',referenceFile:path.basename(source),referenceSha256:hash(bytes),templateFile:path.basename(output),templateSha256:hash(result),slideSizeEmu:'12192000,6858000',baseSlide:'slide4',automaticPageField:true,manualPageNumbers:false,layouts:['Mint｜封面与封底','Mint｜标题与正文','Mint｜两行标题与正文','Mint｜双栏内容','Mint｜章节页','Mint｜全幅图片','Mint｜空白页'],notes:'One clean native base slide. Duplicate it for output pages; preserve the automatic page field.'};
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest));

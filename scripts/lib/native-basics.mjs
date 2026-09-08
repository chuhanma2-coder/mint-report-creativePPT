import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {mintTemplatePath,theme} from './config.mjs';

// Mechanical API helpers only; no content slots or business layout decisions.
export async function nativePages(count,{templatePath=mintTemplatePath}={}) {
  if(!Number.isSafeInteger(count)||count<1) throw new Error('PAGE_COUNT_REQUIRED');
  const require=createRequire(path.join(process.env.RUNTIME_NODE_MODULES,'package.json'));
  const {FileBlob,PresentationFile}=await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
  const presentation=await PresentationFile.importPptx(await FileBlob.load(templatePath));
  const base=presentation.slides.items[0];
  for(let i=1;i<count;i++) base.duplicate().moveTo(i);
  return {presentation,pages:[...presentation.slides.items],PresentationFile};
}
export function connectForward(slide,from,to,options={}) {
  return slide.shapes.connect(from,to,{...options,head:{type:'none'},tail:{type:'triangle',width:'med',length:'med'}});
}

// Only the ordinary-page title; no body slots or extra divider/logo objects.
export function bodyHeader(slide,text) {
  if(!text?.trim()||/[\r\n]/.test(text)) throw new Error('BODY_TITLE_SINGLE_LINE');
  if(slide.shapes.items.some(s=>s.name==='Mint content title')) throw new Error('BODY_TITLE_DUPLICATED');
  const {title,background,bodyTop,bodyBottom}=theme.bodyShell;
  const [left,top,width,height]=title.bbox;
  slide.background.fill=background;
  const shape=slide.shapes.add({name:'Mint content title',geometry:'textbox',position:{left,top,width,height},fill:'none',line:{fill:'none',width:0}});
  shape.text=text;
  shape.text.style={typeface:title.fontFamily,fontSize:title.fontSizePt*96/72,bold:title.bold,color:title.color,alignment:'left',verticalAlignment:'top',autoFit:'none',wrap:'square',insets:{left:0,right:0,top:0,bottom:0}};
  return {title:shape,bodyTop,bodyBottom};
}

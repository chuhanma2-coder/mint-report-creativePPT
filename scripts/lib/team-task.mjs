import fs from 'node:fs';
import path from 'node:path';

const text=value=>typeof value==='string'&&Boolean(value.trim());
export const defaultTemplate={id:'mint-template-16x9/1',file:'mint-ppt-16x9-template.pptx'};
export const defaultCommonRequirements={businessFactsInBody:true,appendixAllowed:false,automaticPageNumbers:true,bottomNotes:'only-if-business-critical-or-explicit'};

export function taskCardIssues(card) {
  const issues=[];
  if(card?.schemaVersion!=='creative-task-1.0') issues.push('TASK_SCHEMA_VERSION');
  if(!text(card?.reportTitle)) issues.push('TASK_REPORTTITLE_REQUIRED');
  for(const key of ['audience','purpose']) if(key in (card||{})&&!text(card[key])) issues.push(`TASK_${key.toUpperCase()}_INVALID`);
  if(JSON.stringify(card?.template)!==JSON.stringify(defaultTemplate)) issues.push('TASK_TEMPLATE_REQUIRED');
  if(JSON.stringify(card?.commonRequirements)!==JSON.stringify(defaultCommonRequirements)) issues.push('TASK_COMMON_REQUIREMENTS');
  if(!Array.isArray(card?.chapters)||!card.chapters.length) issues.push('TASK_CHAPTERS_REQUIRED');
  const orders=new Set();
  for(const chapter of card?.chapters||[]) {
    if(!Number.isSafeInteger(chapter.order)||chapter.order<1||orders.has(chapter.order)) issues.push('TASK_CHAPTER_ORDER');
    orders.add(chapter.order);
    for(const key of ['title','owner']) if(!text(chapter[key])) issues.push(`TASK_CHAPTER_${key.toUpperCase()}`);
    if('objective' in chapter&&!text(chapter.objective)) issues.push('TASK_CHAPTER_OBJECTIVE_INVALID');
    const hasPaths=Array.isArray(chapter.sourcePaths)&&chapter.sourcePaths.length>0&&chapter.sourcePaths.every(text);
    if('sourcePaths' in chapter&&!hasPaths) issues.push('TASK_CHAPTER_SOURCE_PATHS_INVALID');
    if('sourceType' in chapter&&chapter.sourceType!=='inline-outline') issues.push('TASK_CHAPTER_SOURCE_TYPE_INVALID');
    if(!hasPaths&&chapter.sourceType!=='inline-outline') issues.push('TASK_CHAPTER_SOURCE_REQUIRED');
    if('pageCount' in chapter||'layout' in chapter||'sectionId' in chapter) issues.push('TASK_CARD_MUST_NOT_CONTROL_PAGINATION_OR_LAYOUT');
  }
  return [...new Set(issues)];
}

export function createTaskCard(input) {
  const chapters=(input.chapters||[]).map(raw=>{
    const chapter={...raw};
    if(!Array.isArray(chapter.sourcePaths)||!chapter.sourcePaths.length) chapter.sourceType='inline-outline';
    return chapter;
  });
  const card={schemaVersion:'creative-task-1.0',reportTitle:text(input.reportTitle)?input.reportTitle.trim():'管理层汇报',template:defaultTemplate,chapters,commonRequirements:defaultCommonRequirements};
  if(text(input.audience)) card.audience=input.audience.trim();
  if(text(input.purpose)) card.purpose=input.purpose.trim();
  const issues=taskCardIssues(card);if(issues.length) throw new Error(issues.join('\n'));return card;
}

export function readTaskCard(file) {
  const card=JSON.parse(fs.readFileSync(path.resolve(file),'utf8')),issues=taskCardIssues(card);
  if(issues.length) throw new Error(issues.join('\n'));return card;
}

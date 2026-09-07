import fs from 'node:fs';
import path from 'node:path';

const text=value=>typeof value==='string'&&Boolean(value.trim());
export const defaultTemplate={id:'mint-template-16x9/1',file:'Mint_PPT_16比9-template.pptx'};
export const defaultCommonRequirements={businessFactsInBody:true,appendixAllowed:false,automaticPageNumbers:true,bottomNotes:'only-if-business-critical-or-explicit'};

export function taskCardIssues(card) {
  const issues=[];
  if(card?.schemaVersion!=='creative-task-1.0') issues.push('TASK_SCHEMA_VERSION');
  for(const key of ['reportTitle','audience','purpose']) if(!text(card?.[key])) issues.push(`TASK_${key.toUpperCase()}_REQUIRED`);
  if(JSON.stringify(card?.template)!==JSON.stringify(defaultTemplate)) issues.push('TASK_TEMPLATE_REQUIRED');
  if(JSON.stringify(card?.commonRequirements)!==JSON.stringify(defaultCommonRequirements)) issues.push('TASK_COMMON_REQUIREMENTS');
  if(!Array.isArray(card?.chapters)||!card.chapters.length) issues.push('TASK_CHAPTERS_REQUIRED');
  const orders=new Set();
  for(const chapter of card?.chapters||[]) {
    if(!Number.isSafeInteger(chapter.order)||chapter.order<1||orders.has(chapter.order)) issues.push('TASK_CHAPTER_ORDER');
    orders.add(chapter.order);
    for(const key of ['title','owner','objective']) if(!text(chapter[key])) issues.push(`TASK_CHAPTER_${key.toUpperCase()}`);
    if(!Array.isArray(chapter.sourcePaths)||!chapter.sourcePaths.length||chapter.sourcePaths.some(p=>!text(p))) issues.push('TASK_CHAPTER_SOURCE_PATHS');
    if('pageCount' in chapter||'layout' in chapter||'sectionId' in chapter) issues.push('TASK_CARD_MUST_NOT_CONTROL_PAGINATION_OR_LAYOUT');
  }
  return [...new Set(issues)];
}

export function createTaskCard(input) {
  const card={schemaVersion:'creative-task-1.0',reportTitle:input.reportTitle,audience:input.audience,purpose:input.purpose,template:defaultTemplate,chapters:input.chapters,commonRequirements:defaultCommonRequirements};
  const issues=taskCardIssues(card);if(issues.length) throw new Error(issues.join('\n'));return card;
}

export function readTaskCard(file) {
  const card=JSON.parse(fs.readFileSync(path.resolve(file),'utf8')),issues=taskCardIssues(card);
  if(issues.length) throw new Error(issues.join('\n'));return card;
}

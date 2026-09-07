import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readJson,writeJson,hashFile,nonempty} from './lib/creative-contract.mjs';
import {reviewReceiptIssues} from './lib/review-evidence.mjs';
import {humanCopyReviewIssues} from './lib/presentation-copy.mjs';
import {skillRoot} from './lib/config.mjs';

export const scoreMax={fiveSecondMessage:15,titleBodyProof:15,relationshipFidelity:15,hierarchy:15,spaceBalance:15,carrierSuitability:10,colorContrast:5,copyReadability:5,pageRhythm:5};
export function reviewIssues(review,input,audit) {
  const issues=[];
  if(!audit.passed||audit.status!=='technical-candidate-awaiting-independent-review') issues.push('TECHNICAL_AUDIT_NOT_PASSED');
  if(review.verdict!=='pass'||review.generatorExplanationUsed!==false||review.pptxSha256!==input.pptxSha256) issues.push('INDEPENDENT_VISUAL_REVIEW_REQUIRED');
  if(review.sourceCompleteness?.status!=='pass'||!nonempty(review.sourceCompleteness.evidence)) issues.push('SEMANTIC_CONTENT_REVIEW_REQUIRED');
  if(review.slides?.length!==input.slides.length||new Set((review.slides||[]).map(s=>s.slideId)).size!==input.slides.length) issues.push('REVIEW_PAGE_COVERAGE');
  const scores=[];
  for(const s of input.slides) {
    const r=review.slides?.find(p=>p.slideId===s.id);
    if(!r){issues.push(`REVIEW_PAGE_MISSING: ${s.id}`);continue;}
    for(const key of ['firstFocus','bodyProof','evidence']) if(!nonempty(r[key])) issues.push(`REVIEW_OBSERVATION_REQUIRED: ${s.id}/${key}`);
    if(!r.evidenceImages?.includes(s.renderedImage)) issues.push(`REVIEW_IMAGE_MISSING: ${s.id}`);
    for(const key of ['relationships','readability','hierarchy','space','nativeEvidence','copy','brand']) if(r.checks?.[key]!=='pass') issues.push(`VISUAL_CHECK_FAILED: ${s.id}/${key}`);
    issues.push(...humanCopyReviewIssues(r));
    let total=0;
    for(const [key,max] of Object.entries(scoreMax)) {
      const n=r.goldenScores?.[key];if(!Number.isFinite(n)||n<0||n>max) issues.push(`REVIEW_SCORE_INVALID: ${key}`);else total+=n;
    }
    scores.push(total);if(total<85) issues.push(`VISUAL_SCORE_BELOW_FLOOR: ${s.id}`);
  }
  if(!scores.length||scores.reduce((a,b)=>a+b,0)/scores.length<90) issues.push('CHAPTER_VISUAL_SCORE_BELOW_FLOOR');
  for(const r of input.requirements.filter(r=>r.strength==='hard')) {
    const checks=review.requirements?.filter(c=>c.id===r.id)||[];
    if(checks.length!==1||checks[0].status!=='pass'||!nonempty(checks[0].evidence)) issues.push(`HARD_DESIGN_REQUIREMENT_FAILED: ${r.id}`);
  }
  for(const key of ['titleChain','storyConcentration','pagination']) if(review.chapter?.[key]!=='pass') issues.push(`CHAPTER_REVIEW_FAILED: ${key}`);
  if(!nonempty(review.chapter?.evidence)) issues.push('CHAPTER_EVIDENCE_REQUIRED');
  if(!Array.isArray(review.issues)||review.issues.length) issues.push('UNRESOLVED_REVIEW_ISSUES');
  if(!(review.timing?.elapsedSeconds>0)||!nonempty(review.timing?.scope)) issues.push('REVIEW_TIMING_REQUIRED');
  return [...new Set(issues)];
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const [pptxArg,reviewFile]=process.argv.slice(2);if(!reviewFile) throw new Error('Usage: audit-creative-delivery.mjs FILE.pptx review.json');
  const pptx=path.resolve(pptxArg),review=readJson(reviewFile),input=readJson(pptx+'.executive-review-input.json'),audit=readJson(pptx+'.creative-audit.json');
  const issues=reviewIssues(review,input,audit);
  if(hashFile(pptx)!==input.pptxSha256) issues.push('PPT_CHANGED_AFTER_REVIEW');
  issues.push(...reviewReceiptIssues({pptx,reviewFile,receiptFile:reviewFile+'.host-receipt.json',root:skillRoot}));
  const result={status:issues.length?'blocked':'locally-accepted-platform-pending',passed:!issues.length,issues,platform:audit.platform,pptxSha256:hashFile(pptx),reviewSha256:hashFile(reviewFile),at:new Date().toISOString()};
  writeJson(pptx+'.delivery-audit.json',result);console.log(JSON.stringify(result));if(issues.length) process.exitCode=1;
}

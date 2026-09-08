import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {checkRun,readJson,writeJson,hashFile,assertNew,insideRun} from './lib/creative-contract.mjs';
import {inspectNative} from './inspect-ppt.mjs';
import {auditNativeContent} from './lib/native-audit.mjs';
import {sealReviewEvidence} from './lib/review-evidence.mjs';
import {templateOutputIssues} from './lib/template-contract.mjs';
import {theme} from './lib/config.mjs';

const [runArg,candidateArg,finalArg,cachedInspection]=process.argv.slice(2);
if(!finalArg) throw new Error('Usage: finalize-creative-ppt.mjs RUN candidate.pptx NEW_FINAL.pptx [inspection.json]');
const context=await checkRun(runArg,{requirePreflight:true}),{run,brief,runtime,manifest,templatePath,referencePath,templateManifest}=context;
const candidatePath=path.resolve(candidateArg),finalPath=path.resolve(finalArg);
insideRun(run,candidatePath);insideRun(run,finalPath);assertNew(finalPath);
const buildFile=path.join(run,'build.mjs'),mapFile=path.join(run,'evidence-map.json'),map=readJson(mapFile);
if(!fs.existsSync(buildFile)) throw new Error('TASK_BUILD_SCRIPT_REQUIRED');
const preTemplate=await templateOutputIssues(candidatePath,{templateFile:templatePath,mode:context.styleAuthority.mode,pageKinds:map.slides.map(s=>s.pageKind||'body')});
if(!preTemplate.passed) throw new Error(preTemplate.issues.join('\n'));
const skill=process.env.PRESENTATIONS_SKILL_DIR,python=process.env.RUNTIME_PYTHON;
if(!skill||!python) throw new Error('Load workspace dependencies and set PRESENTATIONS_SKILL_DIR / RUNTIME_PYTHON');
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const receiptDir=path.join(run,'.codex-finalizer');fs.mkdirSync(receiptDir,{recursive:true});fs.mkdirSync(path.dirname(finalPath),{recursive:true});
const receiptPath=path.join(receiptDir,path.basename(finalPath)+'.validation.json');assertNew(receiptPath);
const tableOwners=map.slides.flatMap((s,i)=>s.carriers.some(c=>c.type==='table')?[i+1]:[]);
const chartOwners=map.slides.flatMap((s,i)=>s.carriers.some(c=>c.type==='chart')?[i+1]:[]);
const started=Date.now();
await finalizePresentation({workspaceDir:run,candidatePath,finalPath,pythonExecutable:python,
  integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit',...tableOwners.flatMap(n=>['--require-native-table-slide',String(n)])],
  requiredNativeTableOwnerSlides:tableOwners,requiredNativeChartOwnerSlides:chartOwners,
  materializeLiteralChartWorkbooks:map.workbookSnapshot==='new-literal-data',
  ...(brief.explicitSlideCount?{explicitTotalSlideCount:brief.explicitSlideCount}:{}),
  fontPolicy:{basis:'design',families:[...new Set([...brief.fonts,...theme.fonts.templateInternal])]},verifyArtifactToolImport:true,receiptPath});
let inspection=cachedInspection?readJson(cachedInspection):null;
if(inspection?.pptxSha256!==hashFile(finalPath)) inspection=await inspectNative(finalPath,finalPath+'.native-inspection');
const audit=await auditNativeContent(finalPath,inspection,map,context);
const templateAudit=await templateOutputIssues(finalPath,{templateFile:templatePath,requireAutomaticPageNumbers:true,mode:context.styleAuthority.mode,pageKinds:map.slides.map(s=>s.pageKind||'body')});
audit.issues=[...new Set([...audit.issues,...templateAudit.issues])];
audit.passed=!audit.issues.length;
audit.pptxSha256=hashFile(finalPath);audit.runtime=runtime;audit.finalizerReceipt=receiptPath;
audit.template={id:templateManifest.templateVersion,sha256:templateManifest.templateSha256,passed:templateAudit.passed,output:templateAudit.actual};
audit.status=audit.passed?'technical-candidate-awaiting-independent-review':'blocked';
audit.platform={windowsPowerPoint:'not-tested',editSaveReopen:'not-tested'};
audit.timing={startedAt:manifest.startedAt,auditedAt:new Date().toISOString(),finalizationSeconds:(Date.now()-started)/1000,elapsedSinceSourceFreezeSeconds:(Date.now()-Date.parse(manifest.startedAt))/1000,plannerReviewRepairBreakdown:'must be recorded from actual task intervals'};
writeJson(finalPath+'.creative-audit.json',audit);
const reviewInput={pptx:finalPath,pptxSha256:audit.pptxSha256,briefFile:path.join(run,'brief.json'),sourceFile:path.join(run,'source-model.json'),canonicalFile:path.join(run,'canonical-source.json'),mapFile,template:{id:templateManifest.templateVersion,referenceFile:referencePath,referenceSha256:templateManifest.referenceSha256},slides:inspection.slides.map(s=>({id:s.id,renderedImage:s.renderedImage,layoutFile:s.layoutFile})),requirements:brief.requirements||[],generatorExplanationIncluded:false};
writeJson(finalPath+'.executive-review-input.json',reviewInput);
const files=['run.json','prompt.txt','canonical-source.json','source-model.json','brief.json','preflight.json','build.mjs','evidence-map.json'].map(f=>path.join(run,f));
files.push(receiptPath,templatePath,referencePath,...inspection.slides.map(s=>s.layoutFile),...context.canonical.inputs.map(i=>i.path));
for(const proof of map.capacityAttempts||[]) for(const a of proof.attempts||[]) files.push(...(a.files||[]).map(f=>f.path));
sealReviewEvidence({pptx:finalPath,inputFiles:files,images:inspection.slides.map(s=>s.renderedImage),runtime,generatorId:manifest.generatorId});
console.log(JSON.stringify({file:finalPath,status:audit.status,issues:audit.issues,reviewInput:finalPath+'.executive-review-input.json'}));
if(!audit.passed) process.exitCode=1;

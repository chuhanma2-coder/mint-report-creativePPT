# Native authoring and commands

Load the available Presentations Skill and `load_workspace_dependencies`. Set `RUNTIME_NODE`, `RUNTIME_NODE_MODULES`, `RUNTIME_BIN_DIR`, `RUNTIME_PYTHON`, and `PRESENTATIONS_SKILL_DIR` to discovered paths. No substitute dependencies. Node 20+; JSZip and `@oai/artifact-tool` come from the bundle. Read Presentations implementation, native-evidence and finalization guidance when applicable.

## 1. Freeze sources

Create a private `inputs.json` array containing `{ "path": "/absolute/material.docx", "sourceOrigin": "raw-source" }`. For task-card JSON, specify an exact raw-text/table JSON pointer as `selector`; do not parse design metadata as facts. For business facts in a user prompt, save the exact business excerpt separately and record its origin; do not mix layout instructions into that excerpt. Keep the complete original prompt in `prompt.txt` as well.

Run `node scripts/prepare.mjs inputs.json prompt.txt NEW_RUN_DIRECTORY` from this Skill. The new directory must not already exist. Supported canonical adapters are copied from Mint: DOCX (including media and notes), unformatted/cached XLSX, TXT/MD, explicit JSON text/table pointers, and source images. Styled XLSX cells/dates/percentages require a reviewed display-value export; unsupported PDF must first be read/exported with the appropriate existing Skill and checked against the original. Never silently drop a file, sheet, image or unsupported part.

## 2. Author source review and brief

`source-model.json` is `{ "sourceUnits": [...] }`. Each unit keeps the canonical `id`, `text`, `sourceAnchors` and `canonicalRefs: [id]`. For reworded text, include `requiredComponents` (strings or `{id, role, alternatives:[...]}`) and `componentReview:{status:"reviewed", sourceText: EXACT_ORIGINAL}`. Preserve all original numbers/qualifiers; attach terminology equivalences only for justified translations/proper-name normalization. Images require `imageReview` and a complete region inventory.

`brief.json` example structure (fill from the material, do not copy these placeholder strings):

```json
{
  "audience": "管理层", "goal": "本次材料支持的判断",
  "fonts": ["Microsoft YaHei", "Aptos"],
  "template": {"id":"mint-template-16x9/1","mode":"native-brand-shell"},
  "stories": [{
    "id": "story-1", "sourceRefs": ["CS-actual-id"],
    "message": "具体业务判断", "firstFocus": "实际指标或关系及原因",
    "relationships": [], "composition": "具体页面指导，不限定Grammar",
    "displayCopy": {"title":"实际标题", "body":"经过事实复核的展示文案"},
    "emphasis": "哪些突出，哪些辅助", "avoid": ["本页具体失败表现"]
  }],
  "requirements": [], "instructionOnlyPhrases": []
}
```

Optional `explicitSlideCount` must reflect an explicit user requirement. Each requirement has `id`, `strength: hard|soft`, `text`, `originText`. Run `node scripts/preflight.mjs RUN_DIRECTORY` **before** constructing slides. It records frozen source/brief/prompt/runtime hashes; it does not design slides. Writing a long prompt is not a substitute for this stage.

## 3. Create freely inside the shared native brand shell

Write `RUN_DIRECTORY/build.mjs`, using Presentations `@oai/artifact-tool` and its finalizer. Import `assets/mint-ppt-16x9-template.pptx` with `PresentationFile.importPptx`, keep its clean base slide, and duplicate that slide for additional pages. Do not use `Presentation.create()` for normal Skill output. This preserves the native Mint theme/master and the real `slidenum` field named `Mint automatic page number`.

Minimal opening pattern:

```js
const presentation = await PresentationFile.importPptx(
  await FileBlob.load('/ABSOLUTE/SKILL/PATH/assets/mint-ppt-16x9-template.pptx')
);
const firstSlide = presentation.slides.items[0];
const nextSlide = firstSlide.duplicate();
```

Use the actual resolved Skill path; do not copy that placeholder literally.

Coordinates, shapes, table column widths and internal group designs are allowed in this **task script**. No Scene Plan or geometry registry. Use the template's 1280×720 native CSS-pixel canvas (standard 13⅓×7½ inch widescreen); review renders are 1920×1080. Prefer explicit `fontSizePt`; CSS fontSize px = pt × 96/72. Default text must not auto-shrink. Bind fonts separately to chart axes, labels, legends and table cells.

The seven source layouts and eighteen reference slides are examples, not the universe of supported pages. If no example fits:

1. identify the required business expression and reading order;
2. reuse the template's typography, semantic palette, stroke weight, corner language, spacing rhythm and hierarchy;
3. compose new native editable shapes, charts, tables, connectors or groups on the clean base slide;
4. verify the result against nearby reference slides at thumbnail scale;
5. keep the new construction local to the task build script—do not add a business-specific template to the Skill.

Never change the expression merely because the template lacks an example. Never rasterize a designed slide to imitate the reference. Do not add a generic footer or source strip: place material conditions next to the evidence they qualify; the automatic page-number field is the only default bottom element.

Give text/shape/table/chart/image objects unique meaningful `name` values within each slide. These are private object metadata, never visible text. An optional `|text-role:caption` / `supportBody` / `diagramEdge` / `chartLabel` suffix lets copied font checks distinguish necessary roles. Do not relabel business body text as a caption to pass a floor. Do not add decorative raster dependencies. Source photos/screenshots may be embedded; data charts, tables and explicitly required diagrams remain native.

Export `candidate.pptx`. Call `node scripts/inspect-ppt.mjs candidate.pptx NEW_INSPECTION_DIRECTORY` to read actual imported object names/IDs, render native pages and extract layouts. Use those verified names in the evidence map; never infer IDs. The inspection is reusable at finalization when the input hash matches. Every output page must retain exactly one automatic page-number field and no manual page-number textbox.

If real layout improves on the recommended composition, record `compositionAdjustments` in the evidence map with `storyId`, `recommendation`, `adopted`, `reason`, `preservedIntent`. This is an allowed design decision, not a request to rebuild the brief. Hard requirements stay binding.

## 4. Bind facts, not layouts

`evidence-map.json` records actual objects AFTER authoring. It is not an input layout IR and is never consumed to draw pages:

```json
{
  "slides": [{"id":"slide-1", "storyId":"story-1", "carriers":[
    {"id":"result", "type":"text", "objectNames":["headline-value", "nearby-condition"], "sourceUnitIds":["CS-actual-id"]}
  ]}],
  "capacityAttempts": []
}
```

Carrier types describe actual native evidence: text/metric/callout/diagram/table/chart/image. No fixed carrier count, position, dimensions, scene relation or style fields. For `table`, supply source-reviewed `data:{headers,rows}`; for `chart`, supply `variant` and full `data:{categories,series:[{name,values,displayUnit}]}`. Native chart compatibility and exact data labels are checked. A source unit can span carriers; distinct facts in one paragraph are not duplicates by definition. The independent reviewer checks each factual component in its correct local subject context and any redundant presentation.

Current copied chart cache validator supports `bar`, `column`, `line`, `doughnut`, `scatter`, `percent-stacked`. Other native families are not yet mechanically verified: disclose and block accepted delivery, or intentionally build the correct editable shape diagram and inspect its full data and relations, never silently change expression. Give native charts a real source-supported title (the bundled finalizer rejects empty title objects), and configure readable labels explicitly. For scatter, series[0] is X and series[1] is Y. For merged related stories use `storyIds` instead of `storyId`, preserving each story's source assignment.

If one story spans pages, `capacityAttempts` contains `{storyId,naturalBreak,mergeRecheck,attempts:[{composition,failureReason,localRepair,remainingSpace,files:[{path,sha256}]}]}`. Retain at least two genuinely different complete failed native candidates and their PNGs. File hashes prove what was inspected, not the truth of a capacity explanation; independent review must judge the actual alternatives. A single readable page requires no such attempts.

For images, bind an actual image object and `imagePath`; include source `imageTextReview:{regions:[{id,text,minimumGlyphHeightPx,containsText}]}` and `sourceSize:{width,height}`. Source images without text must explicitly classify all regions `containsText:false`. PNG/JPEG source hashes and displayed glyph size are checked; crops/transcriptions require their reviewed relation to the original, not a claim based solely on matching bytes. SVG/raster fallback mismatches must be disclosed and inspected, not bypassed by changing hashes.

## 5. Finalize and independently review

Run `node scripts/finalize-creative-ppt.mjs RUN_DIRECTORY candidate.pptx NEW_CANDIDATE.pptx`. It reuses the Presentations finalizer and original Mint QA functions; no old task card or layout sidecars are required. Output is initially **technical-candidate-awaiting-independent-review**. Reuse the generated native renders for review; do not make unnecessary screenshot rounds.

An optional fourth argument, the existing `inspection.json`, reuses unchanged actual-native renders by hash. Keep candidate, output and private receipts inside the run directory. If creating a new literal-data chart needs an embedded workbook, use the documented Presentations authoring/finalization API to materialize its real values before exporting the audited candidate; do not invent lineage or disable validators.

Independent review follows [quality-gates.md](quality-gates.md). After that context writes `review.json`, it runs `record-executive-review.mjs PPT review.json ITS_HOST_SESSION_JSONL`; then run `audit-creative-delivery.mjs PPT review.json`. Missing independent evidence blocks accepted delivery. No raw transcripts are published. If the host cannot support independent review, state this and hand over only an explicitly requested unaccepted preview.

Repair only the owning source/copy or task build script. Changed source/brief needs a new preflight; new PPT needs new native checks and hash-bound review. Never change installed code to force a test through. Record all attempts, including failed ones, and elapsed planning/build/review/repair/platform time; do not call retries fresh generation.

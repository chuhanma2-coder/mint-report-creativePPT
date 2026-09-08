# Quality, without a fixed layout engine

The legacy source/copy/native checks are copied and reused. They are necessary, not a proof of complete semantics or good design. The creative path has no DOM-layout parity gate: record it as **not applicable**, never fabricate old Scene/IR/Canvas receipts. Inspect the actual exported PPT instead.

## Common hard requirements

- Check the frozen style authority: rebuilding defaults to the current template; editing preserves the current deck. Ordinary builtin body pages require the common background and single-line 32pt title, no duplicate brand/title objects or inherited prompt placeholders. Use existing layout/native checks plus the same final visual review, no extra screenshot/model round. Verify logo appearance and divider details visually; geometric checks alone cannot prove their fidelity. Report real PowerPoint edit/slideshow/merge/reopen as pending without platform evidence.

- Raw inventory is recomputed; canonical IDs/anchors and every source unit survive. All business facts, units, qualifiers, scope, conditions and relationships are visible in body content. No unapproved omissions or notes-only coverage.
- Actual native objects back every evidence reference; hidden metadata/alt text, blank shapes, tiny text or a whole-page bitmap do not count. Native table cells and native chart caches/labels are checked against source-reviewed expected data.
- Correct dimensions and embedded assets; no external media, auto-shrink or accidental page chrome. Body/table/chart/edge floor sizes apply to actual exported text, not just authored values. Fine source images need region-level review.
- The output retains the `mint-template-16x9/1` native theme/master and exactly one real PowerPoint `slidenum` field on every page. A manual number textbox, a flattened background that only resembles the template, or a newly created blank presentation fails.
- Layout inspection includes actual text carriers, table cells and connector intersections. Tool geometry heuristics have limitations (rotations, complex groups, font substitutions); review native rendered pages before acceptance. Empty panels do not count as useful density.
- Presentation copy is human-readable; no pipes/schema/design words, redundant metadata, unneeded bilingual labels, awkward range/word splits or colloquial source phrases used unedited as management copy.
- Missing template examples are handled by new native compositions in the same brand grammar. Review visual compatibility of typography, palette, line weight, radii, spacing and hierarchy; do not require a matching source slide or a fixed content slot.
- Generic bottom source/scope/explanation strips are absent unless explicitly requested or necessary to qualify the evidence. Critical conditions stay beside the affected metric, chart or relation. Automatic page numbers are allowed.

## Independent review input

Use a separate review context, with only the sealed raw sources/canonical ledger, source component review, director brief, native renders and evidence map. Do not provide the generator's justification or old acceptance report. View every page at original detail and scan the chapter sequence. A host receipt verifies a distinct session and actual image-result bytes; it is not a cryptographic security attestation. No new optimizer/planner agent chain.

Review JSON:

Read any `compositionAdjustments` against the frozen brief. A justified layout improvement is allowed; judge preservation of goal, hierarchy and visual tasks, not literal compliance with recommended positions. It cannot waive a hard user requirement.

```json
{
  "reviewerId":"ACTUAL_REVIEW_CONTEXT_ID",
  "pptxSha256":"CURRENT_HASH", "reviewEvidenceSha256":"SEALED_MANIFEST_HASH",
  "generatorExplanationUsed":false, "verdict":"pass",
  "sourceCompleteness":{"status":"pass","evidence":"逐事实比较，指出实际页面和对象"},
  "requirements":[{"id":"REQ-actual","status":"pass","evidence":"真实对象或关系"}],
  "slides":[{
    "slideId":"slide-1", "evidenceImages":["ACTUAL_SEALED_PNG_PATH"],
    "firstFocus":"实际第一焦点，不复述计划", "bodyProof":"主体怎样证明标题",
    "checks":{"relationships":"pass","readability":"pass","hierarchy":"pass","space":"pass","nativeEvidence":"pass","copy":"pass","brand":"pass"},
    "goldenScores":{"fiveSecondMessage":15,"titleBodyProof":15,"relationshipFidelity":15,"hierarchy":15,"spaceBalance":15,"carrierSuitability":10,"colorContrast":5,"copyReadability":5,"pageRhythm":5},
    "humanPresentationCopy":{"markdownSchema":"pass","pipeDensity":"pass","fieldLeakage":"pass","instructionLeakage":"pass","languageMix":"pass","labelStacking":"pass","sourceColloquialism":"pass","sentenceLength":"pass","duplicateMetrics":"pass","hierarchy":"pass","evidence":"实际看到的文案证据"},
    "evidence":"具体观察；不得仅填好看、留白合理或已检查"
  }],
  "chapter":{"titleChain":"pass","storyConcentration":"pass","pagination":"pass","evidence":"相邻页关系及是否可合页"},
  "issues":[],
  "timing":{"elapsedSeconds":0,"scope":"actual observed review interval"}
}
```

These full scores are field examples, not expected answers. Assign real scores; every page >=85 and chapter average >=90, with all hard checks passing, are acceptance floors. Fail obvious problems regardless of total. An independent review's content assessment must compare every original paragraph/table cell/image region, not only the source-model summary. Do not equate raw-unit count with atomic-fact count.

When splitting a story, inspect the recorded actual full-layout attempts, failed alternatives, local repairs and remaining space. Confirm natural business boundaries, unique page titles and local first focus; reconsider adjacent-page merge. Whitespace can support a sparse page only if the actual composition has a deliberate useful focal structure, not a small table stranded at the top.

Change requests return to source/copy, director or task-native-layout according to the defect; reviewers must not invent values or rewrite chart meaning. Missing runtime support, facts or semantic ambiguity stays blocked. A failed review is not a reason to relax the floor.

## Acceptance labels

Keep source/mechanical content, independent semantic content, native technical, visual, and target-platform status separate. Windows PowerPoint open/edit/save/reopen and animation are never inferred from Mac/browser/bundle checks. User-edited final PPT is the authority; no old ledger restores numbers or deleted slides after handoff.

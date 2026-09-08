# Director stage

The authoring Agent performs this stage, then uses its result to create the PPT. The Skill does not add a hidden optimizer Agent. In the recommended multi-owner workflow, the writer first asks AI outside this Skill to draft a detailed page-guidance Prompt and confirms it; that confirmed Prompt is a high-authority input to this stage. Personal short-Prompt work remains supported. User requests for a preview are honored.

## Design intent, not a locked composition

Director Prompt = strong design intent + recommended composition. The native design Agent may choose a clearly better composition discovered through real layout. Preserve the page goal, information hierarchy, visual tasks, source relationships and explicit hard user requirements. A change of columns, placement or proportions is not a failure merely because it differs from the recommendation.

Record an actual change in `evidence-map.json` under `compositionAdjustments`: story ID, original recommendation, adopted composition, observed layout reason and how the goal/hierarchy/visual tasks remain satisfied. Keep the original brief frozen so the review can compare intent with execution; no new Planner call or approval round is needed. Changing a goal, fact or explicit hard requirement is outside this freedom. Independent QA evaluates fidelity to intent and actual readability, not pixel fidelity to the recommended layout.

## Inputs and outputs

`prepare.mjs` freezes the exact user prompt and produces `canonical-source.json` from allowlisted raw inputs. Write `source-model.json` and `brief.json` in that run directory. See [creative-authoring.md](creative-authoring.md) for minimal contracts. Source-model units preserve canonical IDs, raw text and anchors; review factual components against the original rather than treating a short matching string as full coverage.

The brief contains report audience/goal and a list of complete **stories**, not a page template. Each story records:

- `id`, `sourceRefs`: all relevant canonical units in source order.
- `message`: the specific understanding/decision the audience should gain.
- `firstFocus`: the actual object, value or relationship to emphasize and why.
- `relationships`: sourced conditions, direction, time ranges, parallel options and units. An empty list is valid for a genuine simple factual page.
- `composition`: human-readable whole-page art direction: what belongs near what, approximate proportions when useful, how the body proves the title. No mandatory enums.
- `displayCopy`: actual audience-facing copy and labels, not instructions. Preserve every unique fact, reviewed terminology and uncertainty. The builder consumes this copy, not raw schema serialization.
- `emphasis`: what is primary, supporting and contextual. Numeric magnitude need not determine importance. Different entities can have different internals without an empty metric column.
- `avoid`: concrete failure appearances for this story, not a universal growing blacklist.

`requirements` records explicit hard/soft user requirements with IDs. Preserve the exact originating wording in `originText`; do not invent a mandatory timeline/card count. Every hard requirement receives final native/visual evidence. `explicitSlideCount` is set only when the user explicitly requires a total.

Use the existing brand contract, but do not force a takeaway strip, equal cards, fixed band shares or a risk footer. Dark/light contrast is welcome; do not use color as the only distinction. Source conflicts stay adjacent to the affected values, not in a compulsory large disclaimer panel.

Use the shared native Mint template as a style prior. Its layouts and sample graphics are examples, not fixed slots. If the required story has no matching example, derive a new native composition from the same typography, semantic colors, strokes, radii, spacing and hierarchy. Do not enumerate every future page type and do not weaken the selected expression to fit an existing template slide.

## Copy and meaning

Ordinary body-page displayCopy.title is a concise single-line subject or supported conclusion. Preserve forecast, scope and conditions; relocate unique details into visible nearby body copy instead of reducing title font size. No automatic subtitle strip. Literal user-locked wording that cannot fit requires clarification, not truncation.

Every component of source text must be present in the reviewed paraphrase or another visible carrier. `source-model` `requiredComponents` separates subject/value/unit/time/status/condition/scope/detail. A reviewer checks the completeness of that inventory; deterministic matching does not prove semantic equivalence. A source paragraph may cover several objects and facts. Avoid repeated raw paragraphs plus charts plus tables containing the same data.

For entity comparison, names, distinguishing identity, real key metrics, concise explanation and optional status are useful guidance, not required fields or slots. Never invent a metric for the sake of symmetrical profiles. Long English words, number-unit pairs, ranges and forecast qualifiers must remain readable together.

## Capacity

Start with the complete story. Reflow before splitting: uneven widths, integrated annotations, natural table sizes, removal of duplicated presentation, relocation of secondary content. If it still fails, test another genuinely different full composition. Only then break at a coherent evidence/business boundary. Save failed actual renders/layouts, local repairs, remaining-space diagnosis and proposed boundary in `capacityAttempts`; review adjacency after splitting. Do not fill this record after the fact without actual files. An explicit no-split requirement blocks, rather than overriding it.

Do not render unnecessary alternate layouts for pages already readable; alternatives are evidence for a split, not a mandatory creative exercise on every simple page.

# Reused code provenance

The native reference deck `assets/Mint_PPT_16比9-reference.pptx` was copied byte-for-byte from the user-supplied `Mint_PPT_16比9.pptx`. `assets/Mint_PPT_16比9-template.pptx` is a mechanically cleaned one-slide derivative that preserves the original theme, master and layouts while replacing the sample manual number with a PowerPoint automatic slide-number field. It is a brand shell, not copied business content or a fixed page-template library.

Copied with the repository owner's authorization from `chuhanma2-coder/mint-report-ppt`, commit `727fd36ad22da184b51a5c811561f785e64576ca` (runtime `0.4.0-rc.6-design-dev.9`). The old repository is read-only for this work. No business materials, historical PPTs, private session logs or old task build scripts are distributed.

- Direct copies: source-inventory, canonical-source-ledger, pptx-metadata, presentation-copy, image-readability, artifact-layout, typography-contract, record-executive-review.
- Copies with local integration changes: source-coverage (pure entity-field import only), config (new brand path), runtime-fingerprint (new references), review-evidence (creative audit sidecars), publish-report-html (non-overwrite protection and filename escaping).
- Extracted without a layout engine: metricText/entityProfileFields from visual-primitives; auditFinalTable/auditNativeChart and XML value helpers from final-facts. Chart type validation is adapted for explicitly supported native variants.
- `inspect-ppt.mjs` reuses audit.mjs import/export inspection mechanics with actual 96-DPI native dimensions and 1920px review renders, rather than its old fixed-coordinate layout checks.
- Brand fonts, palette and readable point-size floors reuse the original design tokens. The native API canvas is standard widescreen 1280×720; native review images use 1920×1080. No legacy occupancy thresholds, Scene Grammar, table-height defaults or Primitive registry is included.

New work is limited to the optional simple-team-card/native-object adapter, native-template contract, brief/preflight, finalization and packaging/usage. `@oai/artifact-tool`, the Presentations finalizer and renderer are external installed runtime dependencies, not copied or replaced. This file records provenance, not a new license grant for third-party dependencies.

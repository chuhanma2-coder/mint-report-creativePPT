# User workflow and final publication

Personal users may provide raw materials and a short purpose/scope request. For multi-owner formal reports, follow [team-workflow.md](team-workflow.md): create the simple task card, have each writer obtain and confirm a detailed Director Prompt outside this Skill, then author every chapter with the same native template. Use `$mint-report-creative-ppt` explicitly when comparing with the old Skill; never silently route to `mint-report-ppt`.

## Independent owners

Each person can create and edit their own PPT. Use the same Skill version, `mint-template-16x9/1` native master and report purpose. A task card is recommended to select sources and ordering, but is not a pagination template. No invented section ID is needed. Do not mix other owners' facts without a request.

People may merge in Mac/Windows PowerPoint preserving source formatting. Scan actual page order, repeated material, title transitions, fonts, charts and connectors afterward. Automated merge is not mandatory and this project does not implement a new merger.

## Optional style harmonization

This is a request-driven review/edit workflow, not a global automatic restyler. Read the actual user-edited merged PPT through Presentations. First list brand deviations. Only change roles that can be identified reliably; leave ambiguous objects for confirmation. Save a new candidate, keep page count/story/data/relationships and original file unchanged, and re-render edited pages plus chapter sequence. Font/size/position changes may change wrapping; colors may encode risk or data series, so do not use blind global replacement. Do not touch source-image text or logos, invent page numbers, or force all pages into the same composition. The installed Skill code and old IR are not edit authority.

## Read-only offline HTML

Only on request, set `MINT_RENDER_SLIDES_SCRIPT` to the bundled Presentations `render_slides.py` and `RUNTIME_PYTHON` to bundled Python. Run `node scripts/publish-report-html.mjs ACTUAL_FINAL.pptx NEW_OUTPUT.html`. This copied publisher reads actual native slide order, embeds rendered page images and does not load source/brief/old IR. It refuses an existing output path. Final HTML is a publication, not an editing source or a proof of content validity. Inspect its page count/order after manual insertion/deletion/reordering. No Skill-owned PDF generation.

## Testing and scope

First release is experimental. User tests B/C/Kenya using the same raw materials, model/version and original rendering size. Preserve prompt, canonical ledger, brief, build script/hash, evidence map, all capacity attempts, actual PPT/renders, reviews and timing. Separate controlled recompile from fresh authoring. Do not claim mentor-level output, prompt invariance or stable multi-page quality before these real tests. Technical fixtures and package checks prove implementation behavior, not executive visual acceptance.

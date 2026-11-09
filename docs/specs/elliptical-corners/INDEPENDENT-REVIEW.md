# Elliptical Corner Radius Explorer — independent document review

Review date: 2026-10-31 UTC. Verdict: **document completeness and sanitized-candidate equivalence confirmed**. This report was written by the original independent reviewer, who did not author or modify the specification, brief or author checks. It is a publication candidate, not evidence of an upload, formal claim, ready registration, implemented product or product acceptance.

## Exact reviewed candidate

|File|UTF-8 bytes|SHA-256|
|---|---:|---|
|SPEC.md|22222|1d3b0ee352ace4356ec1942762aa1fab376ae4934a9b94c63ac02af2354dda5e|
|BRIEF.md|1418|0e0a702f06a157e873876b3224be5f83a18f0e1cc1734690e2fc62b4a02a9b46|
|AUTHOR-CHECK.md|1293|9108265c41c0348eced2ca3da97521c6e56f0efad80a9f4145fc4530f30d78c6|

No public candidate commit exists at review time. Any later source publication must be read back and associated with its actual immutable commit. Changed document bytes require affected review; this report is not a general approval of future versions.

## Eight completeness areas

|Area|Documentary result and evidence|
|---|---|
|Goal|Complete: explains requested versus adjusted elliptical radii and deterministic CSS for frontend authors.|
|Scope|Complete: eight bounded px radii, dimensions, bilingual explanation and manual selection; excluded features are explicit.|
|User flow|Complete: Generate, invalid/dirty clearing, selection, examples, Reset, language and navigation behavior are defined.|
|Inputs and outputs|Complete: strict decimals, range and length handling, exact side sums and rational scaling, canonical original-value CSS, fixed display rounding and square-corner notes.|
|Implementation|Complete: bounded pure parser/rational core/serializer, immutable result model, named style setters and text-only rendering; no new dependency or privilege is implied.|
|Acceptance|Complete as a proposed owner-to-be-fixed contract: all nine aspects listed, finite contrast criteria and explicit null scores; document approval cannot substitute for product evidence.|
|Tests|Complete as future cases: C01–C22, named desktop baseline, narrow/wide viewports, zoom, lifecycle limits, finite repeated-action timing and independent expected fixtures. All product cases remain NOT_RUN.|
|Handoff|Complete: exact candidate identity, nonauthor review, source/readback, collision checks and separate formal admission/readiness; no ownership transfer or automatic publication.|

## Earlier findings and verified corrections

**F1 — factor display rounding: CLOSED.** The corrected specification requires factor display with four fractional digits and adjusted radii with two, both half-away-from-zero with trailing zeros retained. Exact rational values feed the calculations, not the rounded displays. C21 fixes the reachable tie example W=H40 with all eight requested radii640: factor1/32 displays0.0313, adjusted radii20.00, all four limiting sides. Factor1 displays1.0000. These are documentary expectations, not executed product tests.

**F2 — contrast criterion: CLOSED.** The existing desktop accessibility requirement now defines a finite opaque sRGB theme, applicable text and control/focus/icon color pairs, thresholds, backgrounds and applicable states. It requires recorded computed colors and unrounded ratios rather than antialiased screenshot pixels or rounded-up passes. App-chosen all-text4.5:1 and control/focus3:1 targets are distinguished from broader standards claims. Disabled controls, browser-owned selection styling and decorative geometry have explicit limits. No phone, additional OS or mandatory screen-reader gate was added, and no full WCAG certification is claimed.

Reference explanations used to check the criterion wording: [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). These support the threshold and adjacent-color concepts; the specification explicitly identifies its own simpler app targets.

## Sanitization equivalence review

The reviewer directly compared the sanitized SPEC bytes with the previously reviewed v0.2 source. Sections2–7 are **byte-identical**, including both corrections, all formulas, finite desktop cases and proposed rubric. Only the introduction, section1 inventory wording and section8 operational handoff changed.

- Introduction removes private authorship/routing details and truthfully labels the file as an unpublished publication candidate.
- Section1 replaces private coordination counts with a qualified known-source comparison; it retains the unknown-unpublished-work limitation, collision recheck and ownership protection.
- Section8 replaces private routing instructions with the proposed four-document set and explicit exact-hash/public-commit binding. Separate authorization, admission and readiness boundaries remain intact.
- BRIEF faithfully extracts the unchanged goal and scope without claiming implementation.
- AUTHOR-CHECK faithfully renders the seven arithmetic records and v0.2 tie expectation; it states that these are author document checks, not independent acceptance or browser evidence.

The reviewed three files contain no observed internal filesystem paths, private message identifiers or service credentials. This is a content review of these exact files, not permission to publish other files or a guarantee about future additions. Private provenance, manifests, approval scope, historical originals and internal review routing are excluded from the proposed public set.

## Limits and next gate

No product implementation, browser execution, native rendering observation, actual contrast measurement, performance measurement or product technical validation was performed. All nine product quality scores remain null. No test count or document verdict is converted into a score of90.

The mathematical contract retains original requested CSS, exact proportional reduction, zero-side handling and physical corner order. Its examples are consistent with the documented [W3C rounded-corner and overlap model](https://www.w3.org/TR/css-backgrounds-3/#corner-overlap); actual browser behavior still needs the specified future observations.

This review does not establish current global inventory, resolve unknown unpublished work, create a task/claim, modify an existing owner or increment ready inventory. Before external submission, obtain exact-scope authorization and recheck the destination and current coordination state. Formal readiness and product work remain separate processes. Publication of this report, if authorized later, is source preservation only.

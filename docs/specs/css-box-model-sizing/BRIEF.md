# CSS Box Model Sizing Explorer — preparatory BRIEF v0.2

Status: DRAFT, not registered/claimed/ready; documentation-only first batch toward the user-requested 40 usable specifications. This is not a completed product or a work-slot assignment.

## Intended outcome and scope
 Goal and successful user outcome
Help a CSS learner or site maintainer understand why an explicitly sized empty rectangular box occupies more room than its declared width/height. The user compares content-box and border-box using the SAME dimensions, four padding values and four border widths, and obtains exact content/padding/border dimensions plus deterministic CSS. Success: without developer tools, explain the effect of switching sizing and the zero-content floor when border plus padding exceeds a declared dimension. This is a usefulness hypothesis, not user research.

## 2. Scope and non-overlap
One empty, non-replaced block; physical horizontal/vertical axes, px units, independently entered four sides. Both sizing modes displayed side-by-side. Each panel contains a normal native CSS box plus numerical dimension table, with a separate labeled scaled diagram when needed. Borders are solid, fixed color; no margin. Width/height are explicit, not auto. No arbitrary HTML/CSS parsing, custom content, fonts, images, percentage units, flex/grid, min/max constraints, aspect-ratio, transforms, overflow content, collapsed margins, border radius, shadow, layout diagnosis of another site or download.

Not Box Shadow Builder: that tool edits blur/spread/offset/color/inset/layers and its box size is merely a preview aid. Here border/padding/content dimension accounting is the sole product outcome; no shadow is generated. Not Box Fit (packing three-dimensional physical items), image resizer/print-size (raster images or DPI), object-fit (replaced image fit/crop), elliptical corners (radius overlap scaling), or CSS Grid/Flex Shrink (multi-item layout). We do not reuse their task/owner/spec IDs. De-duplication was checked against the fixed catalog and registry references in AUTHOR-CHECK.md; newly discovered ownership overlap must be resolved before admission.


## Required delivery
A complete SPEC with executable bounded contract, eight document sections, independent expected examples, exact input/output rules and nine fixed product acceptance aspects. This BRIEF and accompanying SPEC must be reviewed together at the same immutable candidate. No implementation, new npm package, remote service, real input, publishing or deployment in this task.

## Eight-section documentary rubric
- goal: specific audience/problem and observable success; assumptions distinguished from evidence.
- scope: exact inclusion/exclusion and functional non-overlap with existing owner products.
- userFlow: initial, dirty, invalid, successful, repeated, reset and bilingual lifecycle; focus behavior.
- inputsOutputs: closed syntax/ranges/units, deterministic serialization, precise examples and rejected neighbors.
- implementation: pure core/state/DOM separation, static zero-dependency baseline, safe sinks and reproducible commands.
- acceptance: functionality, boundaries, privacy, security, usability, accessibility, localization-seo, toolchain-provenance, compatibility; each has independent method/expectation/evidence and scoring anchors.
- tests: independently derived values; boundary/state/native/keyboard/network/storage matrices; all future runtime checks NOT_RUN.
- handoff: fixed source/spec/candidate, nonauthor review, no self-ready, later separate legal production claim, preserved owner and no implicit deployment.

Each item is a nonauthor verified true/false with findings, not an invented numerical score. Missing or contradictory mandatory text blocks document readiness. The product's nine scores remain null until actual independent same-candidate evidence; every required aspect must reach90 and mandatory checks complete for product acceptance. Full contract is SPEC.md, not an invitation to omit hard cases.

## Source and dispatch gate
Shared source README baseline26525d5f6380915ea95dde879dec769442db0d95, latest read batch protocolc13b91598c15b14948d38e60cec9a5fa0616bbd2, registry434 at preparation. Re-read latest registry before saving/registering; no owner is inferred from silence. Batch review/save is arranged by the coordinator; the author does not claim, ACK for others, or mark ready. Product tasks require explicit executor permission and their own claim/readback. See AUTHOR-CHECK.md for the fixed public source references and documentary checks.

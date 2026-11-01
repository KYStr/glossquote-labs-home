# SVG Dash Cycle Explorer — preparatory BRIEF v0.2

Status: DRAFT, not registered/claimed/ready; documentation-only first batch toward the user-requested 40 usable specifications. This is not a completed product or a work-slot assignment.

## Intended outcome and scope
 Goal and successful user outcome
Help a site maintainer understand dash/gap repetition, odd-list duplication and positive/negative phase for a simple SVG line. The user edits a bounded sequence and offset, sees native SVG plus a tabular inventory of visible painted intervals, and manually selects a deterministic SVG snippet. Success: predict where the first visible dash begins, understand a gap-first start, and identify why an odd three-number pattern is six alternating segments. This is a use-case hypothesis, not evidence of user demand.

## 2. Scope, deliberate limits and non-overlap
Exactly one horizontal line from (0,10) to (L,10), stroke width4, butt caps, no fill, fixed solid color. Integer user units only. Dash list1..8 entries, each integer1..100, signed integer offset -1000..1000 and integer line length1..400. A solid-mode checkbox emits stroke-dasharray=none and disables dash/offset controls; raw values are preserved but ignored until reenabled and then revalidated. Native SVG and independent table share one validated snapshot.

No uploaded SVG, paths/curves/circles/closed subpaths, percent units, pathLength, transforms, zero dash/gap, variable stroke width, round/square caps, joins, gradients, animation, clip/mask, code parser, SVG sanitizer, icon editor, drawing app, file/download or clipboard API. Excluding zero entries avoids zero-length cap/segment ambiguities while still teaching ordinary patterns; limitations must be visible, not hidden in source.

Catalog's image-resizer/contact-sheet/overlay work on supplied raster images, not constructed stroke intervals. Clip-path Polygon solves fill geometry, topology and CSS polygon clipping, not stroke segmentation. Linear Gradient Builder handles color stops, not periodic painted/gap intervals. Steps/Cubic easing handle time progression, not spatial dash cycles. Box Shadow and Elliptical Corners do not compute stroke phase. None of the 56 current catalog entries describes an SVG stroke editor; no existing 82 spec/88 task title/scope or inspected cloud-draft collection supplies this same input-output flow. This comparison is bounded to accessible evidence; any new overlapping owner discovered at admission blocks this draft's registration until resolved. Do not treat a different name as adequate de-duplication.


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

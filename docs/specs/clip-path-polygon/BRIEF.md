# CSS Clip-path Polygon Explorer — admission brief

Version: admission.1 (not a complete specification or product).

## Purpose and bounded scope
Help a front-end learner edit a small polygon, understand percentage coordinates in a rectangular reference box, and obtain deterministic `clip-path` CSS. This is distinct from transform/perspective, border-radius, image object-fit and layout tools.

The proposed scope is 3–12 ordered vertices, each coordinate 0–100 percent with at most two decimal places. Allow convex and simple concave polygons; reject duplicate vertices, zero-length edges, non-adjacent edge intersections/touches, adjacent edge overlap, and zero enclosed area. These are deliberate tool restrictions, not claims that CSS forbids every excluded polygon. Adjacent collinear edges may remain if they do not overlap or collapse the polygon. Preserve vertex order; do not silently sort, simplify or repair geometry. Fixed nonzero fill rule; no holes. A fixed selectable synthetic pattern is clipped in a labeled border-box with zero border/padding; a separate schematic labels every vertex and edge. Preview dimensions are bounded positive integers and do not change percentage CSS.

Inputs use keyboard-accessible text fields rather than HTML number fields, retaining raw invalid text. Editing is table-based; no drag-only interaction. Add a vertex by an explicit bounded action, remove a selected vertex only above three, and reset to a known valid preset. Generate atomically from one valid snapshot. Invalid/dirty state must not present old CSS as the current result; language changes preserve raw input and validation state. CSS is a read-only selectable string, manually copied by the user; no Clipboard API.

Excluded: arbitrary CSS/HTML/SVG parsing, SVG/path imports, URL or file inputs, arbitrary images, 3D, transforms, animation, masks, editing multiple rings, persistence, analytics, accounts and permission prompts. No product implementation is authorized by this brief.

## Required acceptance coverage for the later complete specification
All requirements below need concrete numbered tests and independently checked expected examples before document readiness. A ready document is not product acceptance; untested product dimensions remain null, with no default score.

1. **Functional correctness.** Fixed coordinate/reference-box/fill-rule contract; exact percentage-to-pixel mapping; shoelace area, winding convention and robust segment classification; consistent CSS, preview and table from the same snapshot. Cases include triangle, rectangle, concave shape, reversed order, horizontal/vertical and adjacent-collinear edges. Native browser clipping must later be observed separately from arithmetic.
2. **Boundaries and state.** Exact ASCII grammar, trim rule, raw length limit, decimal precision, 0/100 endpoints, signed/negative-zero policy and canonical serializer; 3/12 vertex limits; duplicate/overlap/touch/intersection/zero-area rejection without correction. Empty, partial, exponent, Unicode and malicious inputs are errors. Define generate/edit/error/reset/language/focus lifecycle, with stale-output prevention.
3. **Privacy.** Synthetic numeric data only; no upload, URL state, storage, telemetry, file access or clipboard read/write. Specify actual network/storage/permission observations for future acceptance rather than claiming privacy from source alone.
4. **Security.** Closed numeric parser, bounded operations, safe text/SVG/style sinks, fixed CSS property/value serializer, no user markup or executable input; documented static CSP and no dynamic third-party resources.
5. **Normal-use usability.** A nonauthor must discover coordinate direction, edit a concave polygon, repair an intersection, vary the preview box and manually obtain CSS using page help, without implementation access. Clipped preview is not confused with the labeled schematic or with CSS layout bounds.
6. **Accessibility.** Complete keyboard editing/add/remove/generate/reset/manual-selection flow; explicit labels, descriptions and live errors; vertex correspondence not color-only. Define finite contrast pairs/states, focus checks, 200% zoom and 320px reflow baseline. No drag or pointer precision requirement.
7. **Localization and metadata.** Traditional Chinese and English static/dynamic/help/error text; raw numeric state, geometry and CSS unchanged on language switch; accurate lang/title/description/h1 and same-language navigation.
8. **Toolchain and provenance.** Reuse the repository's fixed static toolchain without new dependencies; separate pure geometry from presentation; exact source/brief/version, independently derived fixtures, documented commands/artifacts and reproducible handoff. Explicitly label future tests NOT_RUN until performed.
9. **Compatibility and performance.** A named available desktop browser and bounded viewport/zoom/lifecycle matrix; finite timing/action budget tied to the 12-vertex limit, native clipping versus schematic comparison with stated raster tolerance, and truthful unsupported/untested limits. Do not infer native rendering or quality from unit-test counts.

## Gates
Before complete SPEC authorship: fixed brief commit, current actor ACK, task registration and exclusive claim with exact CAS readback under the shared collaboration core. Before production: resolve any unknown unregistered local duplicate and preserve existing owners; ready specification, separately permitted executor/task, and all production/publication gates. No merge, deployment, workflow, native execution or product code follows merely from this document.

Primary standards to bind in the complete specification: CSS Shapes basic-shape/polygon coordinate semantics (https://www.w3.org/TR/css-shapes-1/) and CSS Masking clip-path reference-box/fill behavior (https://www.w3.org/TR/css-masking-1/). Numerical restrictions above are the proposed tool scope, not an exhaustive CSS grammar.

## Proposed admission identity and source
Repository: KYStr/glossquote-labs-home. Branch: codex/clip-path-polygon-spec-20261101. Public document directory: docs/specs/clip-path-polygon/.
Proposed task: labs-clip-path-polygon-spec-20261101, workType spec, allowedExecutors [cloud-dot] for specification writing only. Proposed spec ID: spec-clip-path-polygon-20261101. Source: README.md at commit26525d5f6380915ea95dde879dec769442db0d95. This brief does not create an owner or claim.

The nine acceptance directions above have stable IDs, in order: functionality, boundaries, privacy, security, usability, accessibility, localization-seo, toolchain-provenance, compatibility. Their full text must be retained when registering the task. Necessary product aspects each require independent evidence and at least90; currently all product scores null and checks NOT_RUN.

Public collision check2026-11-01: registry405, current catalog and all15 repository PR results contain no matching clip-path polygon task/spec/PR. Transform-Origin is2D transformation; Perspective is3D projection; Elliptical Corners isborder-radius normalization. None provides polygon topology editing or clip-path output. Unregistered local drafts remain UNKNOWN and require verification before production; no existing owner is released by this check.

Primary sources checked for admission: [CSS Shapes Level1 dated12June2025](https://www.w3.org/TR/2025/CRD-css-shapes-1-20250612/) and [CSS Masking Level1 dated5August2021](https://www.w3.org/TR/2021/CRD-css-masking-1-20210805/). These are Candidate Recommendation Drafts. The complete specification must fix the exact supported polygon grammar, reference box and numerical restrictions and separately verify native rendering; normative text is not product-test evidence.

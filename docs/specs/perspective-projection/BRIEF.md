# CSS Perspective Projection Explorer
Admission brief v0.1. This is not the complete specification, an implementation, a claim, or a ready stock item.

## Goal and distinct user task
Help a frontend learner explain how a tilted rectangular CSS element projects onto its parent's plane, distinguish the element's rotation origin from the parent's perspective origin, and obtain a bounded reproducible CSS example. The user changes two angles and the perspective origin, then compares a numeric corner table, a schematic, and a real CSS preview. No WebGL or external resource is needed.

The existing [Transform-Origin specification](https://github.com/KYStr/glossquote-labs-home/blob/9dad1e10e9158df9d405460b0370cbc45e6679d6/docs/specs/transform-origin/SPEC.md) explicitly excludes 3D: it explores six permutations of 2D translate/rotate/scale. This proposal does not reproduce those controls or modify that project. It addresses homogeneous perspective division and parent perspective-origin, not transform-order permutation, easing, gradients, grid, object fitting, or corner radii.

## Bounded proposed model
A single borderless 200 by 120 CSS px rectangle at the top-left of a same-size, borderless perspective parent. Coordinates are CSS px; x right, y down, z toward the viewer. The parent has a fixed perspective distance of 500px, not a user field. The rectangle has fixed transform-origin 50% 50% 0px, backface-visibility visible, and one fixed function order: rotateX(a) rotateY(b). Each angle is restricted to -60 through 60 degrees, at most one fractional digit. Parent perspective-origin X/Y are independently 0 through 100 percent, at most one fractional digit. Defaults: a=20, b=-30, origins=50/50. These bounds and defaults are application choices.

Only these four numeric fields are editable. No arbitrary CSS, HTML, selector, matrix, file, image, URL, text content, camera distance, Z translation, nested scene, animation, drag gesture, lighting, backface toggle, or transform-order selector. No imported data or persistent state. CSS output has fixed selectors, units and property names; it is manually selectable, without clipboard permissions.

The complete specification must derive the four unrounded transformed vertices and their homogeneous w, then projected coordinates relative to the parent. It must distinguish the CSS preview from the explanatory SVG schematic and from any screen-pixel measurement. Parent perspective-origin uses the parent's reference box, not the rotated bounding rectangle. The fixed rotation origin is a separate concept and must remain visible in the explanation.

The rectangle's distance from its center is at most sqrt(100^2+60^2), below 117px. Pure rotations preserve that bound, so z is below 117 and w=1-z/500 stays above 0.766 for this entire proposed domain. This is an admission-level feasibility argument, not a product test. Eye-plane crossing cannot be requested through this tool. The full specification must verify the bound and reject any out-of-contract input rather than clamp it or approximate infinity.

## Projection and clipping boundaries
The ordinary positive-w projection is the supported numeric task. The schematic may show the entire projected quadrilateral and its unclipped AABB; an explicitly labeled finite display window may clip only the drawing. Its dimensions, mapping and outside-window indicators must be fixed in the complete specification. Never clamp corner coordinates to that window or report the clipped shape's bounds as the original projection.

Near-eye-plane w=0, mixed-sign w, behind-eye polygons, arbitrary CSS clipping and full browser painting are expressly outside this product's numeric renderer. Explain these limits in help. Do not simulate them by dividing negative/zero w or quietly setting an epsilon. Native CSS preview remains within the proven safe domain; clipping of an outer display frame must not change the parent's modeled dimensions or create an undocumented 3D hierarchy. No claim to implement a general CSS renderer.

## Normal desktop flow and input safety
Use labeled single-line text inputs with inputmode=decimal and a bounded retained raw-string state. The complete specification will freeze exact ASCII grammar, raw length, trim behavior, canonical formatting and error precedence before implementation. Invalid or unfinished input remains editable and removes stale results. Generate performs validation; success does not steal focus from the triggering control. Provide Reset, a small fixed example set, a full corner table and selectable CSS. Traditional Chinese and English help must explain the two origins and fixed distance.

Native desktop CSS preview is required, not optional proof replaced by a formula screenshot. Record the available browser/version, layout dimensions and independent corner-marker geometry; an AABB-only measurement cannot validate all four projected corners. Avoid reliance on animation clocks, new device resources or unsupported browser-only APIs. Required native checks not actually run stay NOT_RUN.

## Official basis and scope caution
Read 2026-11-01: [W3C CSS Transforms Level 2, dated 9 November 2021](https://www.w3.org/TR/2021/WD-css-transforms-2-20211109/), especially sections 4.1.1, 4.2, 6, 8 and 9. This is a Working Draft, not browser certification. It specifies parent perspective composition, homogeneous projection and the special clipping behavior at nonpositive w. This proposal deliberately supports a finite positive-w subset. The complete specification must fix multiplication conventions and compare the same CSS hierarchy against a real browser rather than assume a custom model is the browser. All numerical ranges, UI and display-window choices here are proposal decisions.

## Fixed source and admission identity
Repository: KYStr/glossquote-labs-home.
Source baseline: commit 26525d5f6380915ea95dde879dec769442db0d95, README.md.
Proposed task ID: labs-perspective-projection-spec-20261101.
Proposed spec ID: spec-perspective-projection-20261101.
Proposed branch: codex/perspective-projection-spec-20261101.
Document scope: docs/specs/perspective-projection/BRIEF.md, SPEC.md, AUTHOR-CHECK.md and a separately authored INDEPENDENT-REVIEW.md.
Proposed task workType: spec; allowedExecutors: [cloud-dot], for specification writing only. This does not authorize product implementation or assign product ownership.

Registry revision 402, current catalog and all 15 repository PR search results were checked for existing public scope on 2026-11-01. No matching perspective task/spec/PR was found; known existing owners remain unchanged. This is not proof that unpublished local drafts do not exist. Unregistered local overlap remains UNKNOWN and must be checked before product admission; this brief does not count it as zero.

## Required future acceptance directions
The complete specification must retain all nine required aspects below, provide finite falsifiable evidence requirements, and keep untested product scores null. Product acceptance requires each necessary aspect at least 90 with actual independent evidence, not an average or document score.

| ID | Required direction |
| --- | --- |
| functionality | Fixed-order 3D rotations, separate parent perspective origin, positive-w projection, exact CSS and coherent table/schematic/native preview. |
| boundaries | Bounded raw grammar and precision, angle/origin limits, safe-w proof, rounding and signed zero, dirty/error/reset behavior and honest display clipping. |
| privacy | Synthetic numeric input only; no network input transmission, storage, URL state, uploads, telemetry, file or clipboard access. |
| security | Closed numeric schema, finite work, safe text/SVG/style sinks, fixed assets and explicit CSP; no arbitrary CSS or HTML execution. |
| usability | Nonauthor completes a normal desktop comparison and understands fixed distance, two origins and unclipped versus displayed geometry without source inspection. |
| accessibility | Keyboard and focus continuity, labels/errors, meaningful corner table and non-color-only markers, finite contrast/zoom/reflow requirements. |
| localization-seo | Complete Traditional Chinese/English help and dynamic errors, invariant math/CSS, correct language and page metadata. |
| toolchain-provenance | Existing zero-dependency Node24+ baseline, reproducible future build/test/check interfaces, independent expected examples, fixed sources and handoff. |
| compatibility | Named available desktop browser, independent corner observations, layout/navigation/reset checks and bounded timing; unsupported extensions stated explicitly. |

## Complete specification work still required
Only after the public brief and source are fixed, the unique task is registered, and the actual writer's current ACK and atomic claim have been read back, write the eight full sections: goal, scope, user flow, input/output contracts, implementation, acceptance, tests, handoff. Include independently derived default/identity/signed-angle/origin-edge examples, native corner evidence requirements, display-window rules and a finite desktop matrix. A different reviewer must inspect that fixed candidate and any corrections before spec-ready registration. No complete specification or product tests are claimed by this brief. All product checks NOT_RUN; all product scores null; no merge, deployment or production claim.

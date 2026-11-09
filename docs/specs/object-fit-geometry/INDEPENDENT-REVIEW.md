# Object-fit Geometry Explorer v0.2 — Independent Document Review

Reviewed 2026-10-31 by a non-author. This is a document-completeness and sanitized-candidate review, not product execution or acceptance.

## Fixed reviewed candidate

| File | Bytes | SHA-256 |
|---|---:|---|
| BRIEF.md | 2052 | ad2180d16099554a0dd6099c103c73f6bafee8bff88c7b30d03eb98e751a0018 |
| SPEC.md | 30768 | a9b1b5b22421f8201314b4114e32e95781432194722d9070fc12f095213846ee |
| AUTHOR-CHECK.md | 3651 | 1e2c26aab7d5390000b540a70234dd503662254b84b4484d2898af038e57d14b |

## Finding F1 and affected verification

The earlier document required successful generation to keep focus on Generate while also allowing numeric-field Enter submission and forbidding result updates from moving focus except for errors. Those requirements conflicted when Enter was pressed in a numeric input.

The author corrected v0.2: successful generation does not programmatically move focus. Numeric Enter retains its field; keyboard button activation retains Generate; pointer activation preserves the browser's resulting focus. First-invalid-control error focus remains an explicit exception. T13 and T19 now require the same behavior. The affected diff and unchanged accessibility contract were independently rechecked. F1 is resolved in the specification, not asserted to be fixed in an implemented product.

## Geometry, units and precision

The existing independent rational-arithmetic precheck covered T01–T09, with T05 in both modes. It found no contradiction in stated scales, rendered sizes, offsets, source edges, crops, margins, area or rounding. This was document arithmetic, not ten product tests. Those unchanged cases were not rerun for v0.2 or sanitization.

Percentage alignment follows X + p*Rw = p*Cw, hence X = p*(Cw-Rw), with the equivalent vertical relation. Negative cover leftover space correctly produces negative offsets. Source coordinates are continuous geometric edges rather than integer crop-pixel indices; exported CSS dimensions are content-box dimensions, not intrinsic source dimensions. Exact rationals remain separate from SVG display conversion and rounded text. Half-away-from-zero rules, negative-zero suppression, exact classification and expanded fraction details are specified consistently.

The bounded model agrees with the contain/cover and object-position definitions in [CSS Images Level 3, 18 December 2023, sections 4.3.2, 4.5 and 4.6](https://www.w3.org/TR/2023/CRD-css-images-3-20231218/). Numeric limits, serialization, UI and testing requirements are this proposal's choices.

The SVG is expressly a schematic, not proof of native raster painting. The planned independent 128×64 raster fixture in a 64×64 box, including off-center cover observations, is separate from the shipped tool. Its raster-edge tolerance does not replace exact arithmetic requirements. No such native observation has been executed for this review.

## Eight document-completeness areas

| Area | Complete | Evidence |
|---|---|---|
| Goal | true | Specific audience and contain/cover prediction problem without requesting photos. |
| Scope | true | Bounded dimensions/percentages, two modes, explicit file/metadata/export exclusions. |
| User flow | true | Generate, all-error order, edit/IME invalidation, selection, clear/defaults and lifecycle; F1 closed. |
| Inputs/outputs | true | Closed grammar, ranges, rational geometry, complete units/fractions and deterministic CSS. |
| Implementation | true | Separated pure model/serializer/DOM, safe sinks, proportional SVG, CSP and finite performance plan. |
| Acceptance | true | Nine separate future product dimensions with necessary evidence and explicit null scores. |
| Tests | true | Twenty-two planned cases, native raster corroboration, desktop keyboard/reflow/contrast/privacy/lifecycle checks. |
| Handoff | true | Exact candidate review, ownership/collision checks and formal admission/production boundaries remain separate. |

No remaining blocking document contradiction was identified. This Boolean completeness result is not a numerical product quality score.

## Sanitization comparison

The reviewer compared the actual candidate against the previously reviewed v0.2, not only the author's summary. SPEC sections 2–6 are byte-identical. The complete section 7 case matrix and following native/performance paragraphs are byte-identical. Other changes remove internal identity and handoff material, use the public four-document package, and correct section 7's attribution to the already performed non-author arithmetic precheck instead of implying a new author run. BRIEF and AUTHOR-CHECK preserve the technical scope, limits, findings and untested states. No algorithm, example, acceptance dimension or F1 focus requirement changed. No private filesystem paths or internal conversation identifiers were found in the three reviewed candidate files.

## Limits and remaining gates

No product code, GUI, accessibility behavior, browser compatibility, network/storage, performance or deployment was executed or validated. All nine product scores remain null and product checks NOT_RUN. Document completeness does not grant registry-ready status, a production claim, PR approval, merge or deployment. Unknown unpublished local work remains unknown: current collision/owner checks and formal admission are still required. This review does not certify global nonduplication or transfer any existing owner.

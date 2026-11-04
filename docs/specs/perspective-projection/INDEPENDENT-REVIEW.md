# CSS Perspective Projection Explorer — independent document review

Reviewed candidate: `03319890d30bb431937ca415c1c54875ef316793`, `docs/specs/perspective-projection/`, specification v0.1. Review date: 2026-11-01. Reviewer did not author or modify the candidate.

## Result and exact binding
No blocking document defect found. All eight required documentary areas are complete for this bounded proposed tool. This is a specification-completeness review, not product acceptance, a product quality score, native validation, or permission to implement/deploy.

The three fixed remote files were read and hashed:
- BRIEF.md: 9401 bytes; SHA256 `d9e59a1a35f43d019df81fbed70266c6b4a0e135fd9adfefd55a89c429b90e28`.
- SPEC.md: 29421 bytes; SHA256 `85846d8758bb8725ee0ab2a1694b2a4c4c707eaedc6c6141c79c7743049febfe`.
- AUTHOR-CHECK.md: 3654 bytes; SHA256 `b61b4d12eececde293d72ed70efbcb18e7d8f5a91893a9a235ae8da391e0ee23`.

## Eight-area assessment
| Area | Documentary finding |
| --- | --- |
| Goal | Concrete learner task: compare perspective projection and distinguish the two origins; existing 2D Transform-Origin scope remains separate. |
| Scope | One 200 by 120 CSS-pixel plane, fixed 500px perspective, four bounded inputs, fixed Rx/Ry order. No arbitrary scene or eye-plane crossing. Exclusions prevent hidden scope expansion. |
| User flow | Default generation, retained raw edits, dirty/error clearing, first-error focus, successful-submit focus, examples/reset, language selector versus route navigation, manual CSS selection and BFCache behavior are specified. |
| Inputs/outputs | Exact raw grammar/length/precision/error precedence and canonical CSS are distinct from floating projection/display rounding. Fixed vertex identities, unclipped AABB, finite display classification and full output lifecycle are coherent. |
| Implementation | Rotation and homogeneous projection conventions, whole-face safe-domain proof, numeric/text/style sinks, explicit static CSP and prospective command/artifact/server interfaces are actionable without implying an existing implementation. |
| Acceptance | All nine original aspect IDs retained; requirements include actual desktop usability, privacy/security observations, finite contrast/focus/reflow, localization and measured compatibility. No test count is substituted for a score. |
| Tests | Independently checked numeric expectations, syntax/schema boundaries, exact CSS, state transitions, independent native corner geometry, CSP/network traces, build reproducibility, lifecycle and finite timing plans are sufficiently falsifiable. |
| Handoff | Fixed source and candidate, separate author/reviewer roles, revision review, unknown local overlap, separate production claim and truthful NOT_RUN limits are explicit. No invented PR or release. |

## Independent arithmetic and boundary challenge
A separately written 4 by 4 homogeneous-matrix calculation applied the standard rotation matrices and origin translations to all four vertices for P01–P10. It did not execute or import an author calculation script or a future product implementation. All 120 printed projected x/y/w components agree: maximum absolute differences are respectively 4.5475e-13, 4.9738e-13 and 4.8939e-13, well inside the document tolerances. The derived default AABB agrees; all ten outside-frame corner sets agree, including P04 {P1}, P05 {P1,P2}, P06 {P1,P3} and P07/P08 {P0,P2}.

P02's upper/lower Z signs and P03's left/right Z signs were also checked directly at 30 degrees. Reversing the multiplication order would not satisfy the mixed-angle examples. Parent-origin translation affects projected x/y but not Z or w; P10's identity behavior is correct.

The centered face lies inside radius sqrt(13600). Rotation preserves this bound and projection has w at least `1-sqrt(13600)/500`, approximately 0.766761924206188. The bound covers the convex face, not only the sampled corners, so the documented domain excludes an eye-plane singularity without an epsilon clamp. It is conservative rather than a claim that the angle extrema attain that radius in Z.

The declared finite frame clips presentation, not the numeric polygon. Raw comparisons, equality-at-boundary, corner labels versus polygon visibility, and unclipped AABB are consistently separated. Six-decimal formatting is explicitly a JavaScript stored-number convention, not exact-real trigonometric rounding; signed-zero and CSS serialization are separately defined.

## Native and implementation feasibility boundaries
The [dated CSS Transforms Level 2 draft](https://www.w3.org/TR/2021/WD-css-transforms-2-20211109/) was consulted for parent perspective composition and origin semantics. The chosen positive-w subset is consistent with that model; the draft is not evidence that a particular browser has passed.

The native test plan measures zero-sized local-plane anchors rather than decorative marker ink or substituting the face AABB. Parent-relative subtraction, CSS-pixel units, fixed unscaled hierarchy, recorded dimensions/styles/scroll and a separate raster observation make the test meaningfully independent of the model. The specified 0.5px comparison is a future test criterion, not a measured result. Unsupported/nonfinite anchor geometry must remain NOT_RUN. No native experiment was performed during this review.

Individual dynamic style assignments must actually be tested under the emitted CSP, as the document requires. Future implementation must not silently relax the header or replace missing BFCache/native observations with assumptions. The five runtime artifacts and future Node24 built-in interfaces are explicitly requirements, not claims about already existing product scripts. Raw text fields avoid the number-input sanitization conflict found in other specifications.

## Limits and downstream gates
All product implementation checks T01–T12 remain NOT_RUN and all nine product scores remain null. This review performed document reading and arithmetic only: no product build, browser rendering, accessibility session, CSP/network experiment, BFCache observation or latency measurement. Document readiness does not consume the specification or authorize production, PR submission, merge or deployment. Unregistered local draft overlap remains unknown until separately resolved for production. Any substantive revision requires affected independent review against its new fixed commit.

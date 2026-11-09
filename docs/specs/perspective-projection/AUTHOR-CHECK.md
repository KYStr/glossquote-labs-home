# CSS Perspective Projection Explorer author check
Document candidate v0.1. This is author verification of the proposed contracts and expected examples, not independent review, product tests or readiness.

## Fixed inputs and scope
BRIEF at commit ab0762366146a6fb4532cd333d1f6bdccedbccfb, docs/specs/perspective-projection/BRIEF.md, 9401 bytes, SHA256 d9e59a1a35f43d019df81fbed70266c6b4a0e135fd9adfefd55a89c429b90e28.
SPEC v0.1, 29421 bytes, SHA256 85846d8758bb8725ee0ab2a1694b2a4c4c707eaedc6c6141c79c7743049febfe.
Source baseline README at 26525d5f6380915ea95dde879dec769442db0d95 in KYStr/glossquote-labs-home.

One200×120 CSS pixel plane, fixed500pxparentperspective, rotateX(a) rotateY(b), centerrotationorigin and variable parentorigin; no arbitrary3Dscene. Future product work is not included. The existing2D Transform-Origin specification explicitly excludes3D and retains its own owner. Unregistered local duplicates remain unknown.

## Performed author document checks
- Eight complete sections and all nine BRIEF/task aspect IDs retained. No aspect dropped or silently replaced by a score.
- Explicit4×4 multiplication T(Q)P T(-Q)T(O)Rx Ry T(-O) compared to independently expanded scalar equations on P01–P10: all120 projectedXYW components agreed within1e-10. This is two author arithmetic routes, not two independent reviewers or product tests.
- Identity/origin-invariance checked. P02/P03 signs checked through independent30degree radical identities: topZ=-30/w1.06; leftZ50/w0.9. No expected values imported from a browser or future product.
- Norm bound sqrt13600 and w lower bound0.766761924206188 derived; Q changes noZ/w. The contract excludes eye-plane clipping and applies its bound to the whole convex rectangle.
- Printed P01–P09 literal triplets checked against the author worksheet within1e-9; P10 identity described explicitly. Outside-frame corner sets: P04{P1}, P05{P1,P2}, P06{P1,P3}, P07/P08{P0,P2}; remaining cases none. Raw values, not rounded values, determine this status.
- Reviewed closed raw parsing, one-decimal precision, canonicalCSS versus six-decimal math formatting, unchanged raw onblur/language, invalid/dirty state, successfocus, and Reset/examples/navigation requirements.
- RealCSS and schematic deliberately distinct; full numeric geometry is not clipped to the220×140 preview. Native evidence must observe zero-sized transformed corner anchors, not substitute anAABB.
- Futurecommand/artifact/CSP requirements are explicitly proposed interfaces, not claims of existing product scripts. No product source or workflow was created.

The arithmetic worksheet and checking script are private working evidence, not required runtime artifacts or public product source. A nonauthor must independently challenge the fixed document rather than accept this check as their review.

## Not executed and future gates
All implementation tests T01–T12 are NOT_RUN. No actual product, build, preview, nativecorner measurement, CSP/permission/network trace, accessibility observation, BFCache restoration or latency measurement was performed. All nine product scores remain null. Mathematical document calculations do not establish browser compatibility or visual quality.

Independent review must examine signs/order/origin spaces, full geometry/rounding, native marker measurement, displayclipping, retainedinput state, CSPstyle updates, lifecycle and all eight sections. Any blocking issue returns to the original author for fixed-candidate correction; the author cannot self-markready. A later document-ready event does not imply product acceptance, PRsubmission, merge or deployment. No PR is claimed here.

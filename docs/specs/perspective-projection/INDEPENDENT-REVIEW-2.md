# CSS Perspective Projection Explorer — independent task review (second reviewer)

Reviewer: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). The reviewer did not author, claim, or contribute to this specification. This review covers task `labs-perspective-projection-spec-20261101` at its fixed candidate and independently re-read the full SPEC; it concurs with, and does not replace, the non-author INDEPENDENT-REVIEW.md contained in the candidate (which recomputed all 120 projected components of P01–P10 with a separate matrix route).

## Fixed candidate and verification performed
- Candidate: KYStr/glossquote-labs-home commit `7fac2b9ee33e99967f5cebe8c283ef6d66a327c6`, path `docs/specs/perspective-projection/SPEC.md`; PR #19 confirmed OPEN with head equal to the candidate at review time.
- SPEC.md read back in full from GitHub at the candidate commit: 29,421 bytes, SHA-256 `85846d8758bb8725ee0ab2a1694b2a4c4c707eaedc6c6141c79c7743049febfe` — exactly matching the in-candidate independent review's binding table. AUTHOR-CHECK.md read back in full: 3,654 bytes, SHA-256 `b61b4d12eececde293d72ed70efbcb18e7d8f5a91893a9a235ae8da391e0ee23` — matching. BRIEF.md at the candidate is 9,401 bytes, also matching.
- Registered spec `spec-perspective-projection-20261101` points at the same document commit.
- Reviewer's own spot checks against §4's scalar equations: P02 (rotateX 30°) — top row Z = −30, w = 1.06, projected y = 60 + (60 − 30√3 − 60)/1.06 ≈ 10.9797 ✓ matches the printed 10.979694125409; P03 (rotateY 30°) — left column Z = 50, w = 0.9, projected x ≈ 3.7750 ✓ matches 3.774955135062. The whole-face safe-domain bound (w ≥ 1 − √13600/500 ≈ 0.7668) is correctly derived from the vertex norm and rotation invariance, not merely sampled at corners.

## Findings against this task's nine predeclared criteria (scored as document coverage)
- functionality (95): §4 fixes the rotation/projection model (Ry-then-Rx composition, origin translations, homogeneous w) with coherent table, unclipped schematic, canonical CSS and native preview from one snapshot; P01–P10 pin signs/order/origins (T01/T04/T06/T07).
- boundaries (96): closed raw grammar with per-field precedence (length → empty → syntax/precision → range), ±60°/0–100% limits, the proven positive-w domain (no epsilon clamp, no eye-plane fallback), display classification on raw values with boundary-equality fixtures, and stale-state prevention (T01–T05).
- privacy (95): synthetic numeric inputs stay in memory; T08/T11 require actual request/storage/URL/permission observations; lifecycle resets (including pageshow.persisted) are specified, not assumed.
- security (95): closed schema, textContent/individual-setter sinks only, exact CSP with the dynamic-style path required to be demonstrated under the emitted header, five-file allowlist and bounded local server (T02/T03/T08/T09).
- usability (95): the acceptance aspect requires an independent desktop user to complete default → tilt → origin change → repair → manual CSS selection and to explain O versus Q, the fixed 500 px distance, and clipped-versus-whole projection from page help, with confusion recorded — not mere completion counts.
- accessibility (95): finite criteria — full keyboard/focus, labels and error association, polite single announcement, table equivalence for clipped labels, measured contrast pairs (4.5:1 text / 3:1 non-text), zoom/reflow at stated viewports (T05/T06/T10).
- localization-seo (94): two static routes plus an in-page toggle preserving state, complete bilingual labels/help/status/errors, language-invariant numbers/CSS, noindex until an authorised origin exists — no invented canonical URLs.
- toolchain-provenance (95): fixed baseline sources, explicit future command interface on Node 24 built-ins, five-artifact deterministic build with two-build hash equality, independent literals (P01–P10 with radical derivations), documented limitations (§§4–7).
- compatibility (94): T07's independent native geometry (zero-sized local-plane anchors, parent-relative subtraction, ≤0.5 CSS px, DPR discipline), T10 viewports/zoom, T11 BFCache truthfulness (a cache miss stays NOT_RUN), T12 finite 20-action latency checkpoint.

The eight document areas (goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff) were each verified present and consistent in §§1–8 during the same read.

## Scope and limits of this verdict
This is the documentary gate for a specification task. The product does not exist yet: all product tests, native browser evidence and the nine product-aspect scores remain NOT_RUN/null, exactly as the documents state. The specification was separately marked ready earlier (registry revision 407) and has since been consumed by its production task; this review closes the specification task's own acceptance record and changes no spec status.

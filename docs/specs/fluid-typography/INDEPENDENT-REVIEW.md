# Fluid Typography Calculator — independent specification review

**Publication candidate draft — not yet published or authorized for publication.**

Review date: 2026-10-31. Scope: eight-section specification completeness review, followed by an affected review of four author corrections. This summary consolidates those completed reviews; it is not an additional product evaluation.

## Candidate identity and independence

| Document candidate | Bytes | SHA-256 | Document-review result |
|---|---:|---|---|
| Specification v0.1 |17762|`f96ed7d171d15389cefc8bce7faf3e8acc514106d14a15ecd6bd0759aa5e15cf`|Changes requested: F1–F4 below|
| Specification v0.2 |22661|`8b925fb4553e9ccf7ad030bb8c6f7945ae4354b86933d782606fef95ef0313a8`|F1–F4 closed at the document-definition level|
| Sanitized specification v0.2 publication candidate |22173|`bc0c7eaf4bfdee16ca2d4920ddde2d98d2e2c06452312bfb7cbe449c4523a5f6`|Independent sanitization comparison complete; documentary conclusions bound to these exact bytes|

The reviewer was not the specification author and did not modify either candidate. The review consisted of reading the specification and author evidence, checking internal consistency, and inspecting the revised requirements. No product was implemented, executed or technically tested by this review. Hashes identify exact reviewed source bytes, not a GitHub commit. The sanitized candidate listed above has now been compared independently; any further modification requires a new hash and an affected review.

## Sanitized candidate binding

The reviewer directly compared the v0.2 source and sanitized candidate, rather than relying only on the author’s change summary. Sections 2–7 are byte-identical. Changes are limited to the introductory status, section 1 inventory wording and section 8 handoff/publication wording: private coordination details were removed while the bounded-collision-check limitation, ownership preservation, separate authorization, formal admission and no-product-acceptance boundaries remain. No mathematical, UX, state, test or scoring requirement was changed. F1–F4 closure therefore remains applicable to the exact sanitized hash above.

The companion BRIEF.md (1304 bytes, SHA-256 `73f5e196719dcb5f79e320e799f3c943fb9aa269da4ad112a432f1d91b5c6f1f`) preserves the goal and exclusions. AUTHOR-CHECK.md (1341 bytes, SHA-256 `0775e650cbfe710e136695e18ce0ee04178b7446dc2845cf86c3058b4f52cd04`) retains the five ideal examples, two exported-coefficient counterexamples and error bound, and clearly distinguishes author arithmetic from product tests. Both were read as part of this binding check; neither is independently verified product evidence.

## Eight-section coverage

The initial review covered goal and audience, scope and exclusions, user journey, input/output and mathematical contracts, construction/state plan, acceptance cases and nine quality aspects, author checks and risks, and handoff/publication boundaries. All eight specification sections were present. The initial blocking ambiguities were concentrated in F1–F4. The affected review checked their corrections and connected requirements across the eight sections; it did not generate product scores.

## Findings and closure evidence

### F1 — Rounded lower endpoints and limiting-state labels

**Original finding:** the preview was required to evaluate exported eight-decimal coefficients, but the stated lower-endpoint values and minimum labels treated the ideal design breakpoints as exact exported clamp transitions.

Document substitution gives:
- R=16, W=320: `0.66666667 × 16 + 1.66666667 × 3.2 = 16.000000064`.
- R=20, W=400: `0.66666667 × 20 + 1.66666667 × 4 = 20.00000008`.

**Closed in v0.2:** section 3 defines P from the exported coefficients, uses exact parsed decimal comparisons, prioritizes constant endpoints, and otherwise labels minimum for P≤lower, maximum for P≥upper, and fluid between. Classification must not use design viewport equality, displayed rounding, an epsilon, or endpoint snapping. Both examples are now labelled fluid; A02/A03, section 7 and the author checks agree. The endpoint table explicitly describes design breakpoints rather than exact exported transitions. This is document arithmetic, not browser behavior evidence.

### F2 — Over-limit sample-text state

**Original finding:** text-only changes retained CSS validity, while invalid-input rules could also clear the result; the 241-code-point case did not uniquely define output, selection, preview or recovery behavior.

**Closed in v0.2:** sections 2 and 4 separate numeric validity from sample-text validity. Over-limit text retains raw editable text and displays an associated error, clears only the text preview, and preserves generated CSS, selection, numerical table and summary. Returning to at most 240 code points restores the preview from current generated numbers without regeneration; dirty numeric state keeps it empty. Generate, language change and Reset follow the same rule. A11 covers the correction sequence without silent truncation.

### F3 — Canonical bound serialization

**Original finding:** coefficient normalization was defined, but the exact output for equivalent bound strings was not explicit.

**Closed in v0.2:** section 3 strips fractional trailing zeros and an empty decimal point, retains the integer digit 0 where needed, and compares endpoint values numerically. A04 covers `1.2500` versus `1.25` as a constant and identical CSS bytes for `1.0000`/`2.0` versus `1`/`2`. Raw input need not be rewritten.

### F4 — Finite desktop acceptance baseline

**Original finding:** supported-browser and performance requirements lacked a bounded execution baseline and concrete measurement contract.

**Closed in v0.2 at the definition level:** section 5 specifies Linux desktop Chromium, 1280×800 and 320×800 CSS-pixel viewports, and a recorded 200% browser-zoom observation. Browser/OS version, actual viewport, root size and scale must be recorded. Phone hardware and other operating systems are not added as mandatory support.

BFCache checks distinguish actual `pageshow.persisted` restoration from fresh navigation; unavailable capabilities must be reported rather than passed. The performance requirement specifies 20 sequential Generate actions, handler-entry-to-requestAnimationFrame timing, each ≤100 ms, and no generation-attributable Long Task ≥50 ms where that API is available. These are unexecuted targets, not measured results. Section 6 retains each required aspect's ≥90/100 threshold with complete independent evidence.

## Product evidence remains unexecuted

| Required product aspect | Score | Evidence |
|---|---|---|
|Functional correctness|null|NOT_RUN|
|Normal-use usability|null|NOT_RUN|
|Visual quality|null|NOT_RUN|
|Accessibility|null|NOT_RUN|
|Input safety and robustness|null|NOT_RUN|
|Privacy and permission behavior|null|NOT_RUN|
|Performance and responsiveness|null|NOT_RUN|
|Compatibility and lifecycle|null|NOT_RUN|
|Completeness and maintainability|null|NOT_RUN|

No implementation, native GUI, browser, network/storage, accessibility or performance test was performed as part of this review. Document completeness does not establish any product score, acceptance, deployment, or ready-inventory addition.

## Required before publication or formal admission

1. Recheck current registered work, catalog, open proposals and relevant existing work for collisions; this review is not a fresh complete inventory audit.
2. Prepare and approve the exact sanitized specification, brief, author-check and review file set. Do not publish internal provenance or unrelated records with the documents.
3. Fix the repository, branch, paths and candidate commit through the authorized publication process. Confirm exact remote bytes; no public source commit or PR for this document is asserted here.
4. Record the actual participants and required ownership/claim operations under the current coordination contract. This draft does not create a claim or change an owner.
5. Preserve the exact sanitized candidate bound above; independently review any later changes, and bind its confirmed GitHub commit after an authorized upload. Complete the formal document-readiness process before counting ready stock.
6. Before future product execution, verify that the desktop GUI and required accessibility capabilities are available. A browser-binary version is not GUI evidence. Missing required checks stay NOT_RUN/null; resource limitations need an explicit scope decision, not invented passing results or indefinite demands for nonexistent devices.

**Final document conclusion:** F1–F4 are closed for the exact v0.2 source and sanitized publication candidate above; the independent sanitization comparison is complete. Authorized upload and remote-commit binding, formal readiness and all product evaluation remain pending. No publication or deployment is implied.

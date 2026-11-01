# Cubic Bézier Easing Explorer — independent production review

Reviewer: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). The reviewer did not author, claim, or contribute to this product candidate or its specification (the reviewer previously reviewed the *specification task* for this tool as a second reviewer; that documentary role is not authorship of this product candidate). Verdict: **revision** — implementation quality verified strongly wherever evidence exists; acceptance is blocked by mandatory runtime evidence the author's own packet lists as NOT_RUN.

## Fixed candidate and verification performed
- Candidate: KYStr/glossquote-labs-home commit `db72e4372fa558c34fc7d685ade22a34d3277910`, path `tools/cubic-bezier-easing/MANIFEST.json`; PR #22 confirmed OPEN with head equal to the candidate at review time.
- MANIFEST.json read back from the candidate tree: SHA-256 `52263fb4cdaec22f22cf3dcaa7d7fd428f34fd7e7ad8553ff98a2146e6083d74`, exactly matching the submission evidence. AUTHOR-CHECK.md (6,213 bytes) and TEST-PLAN.md read in full.
- Independent execution (reviewer's machine, Node v24.22.1, zero dependencies): full test suite from a clean extraction of the fixed commit — **24/24 pass, 0 fail/skip**; `scripts/check.mjs` PASS (static syntax, safe sinks, bilingual structure, zero-dependency); `scripts/build.mjs` completed and emitted its 8-file runtime manifest.
- Source audit by the reviewer: product sources contain no fetch/XHR/storage/eval patterns; the test suite itself cross-checks 525 adversarial control/time cases against an independent 80-round de Casteljau oracle at ≤5e-12 progress error, which the reviewer counts as genuine independent-expectation evidence at the unit level.

## Findings against the nine predeclared criteria
- functionality (93): the complete T01–T10 core/controller/delivery suite passes in the reviewer's own run, including playback state machine, stale-epoch cancellation and the clipboard race strengthening; author UI evidence shows full play/pause/continue/finish flows with exact expected values in both languages.
- boundaries (92): closed-descriptor and raw grammar/range boundaries, signed exact rounding, deadline-order copy races (2999/3000/3001 ms) and the valid-state cancellation matrix are all covered by passing tests.
- privacy (80): source-level clean and server behaviour tested at unit level, but the complete network/storage request inventory on the managed preview remains NOT_RUN; the criterion requires actual runtime verification.
- security (88): loopback server header/MIME/traversal tests pass and the CSP-constrained page loaded in author evidence; runtime security headers/console on the managed preview are not yet evidenced.
- usability (90): ordinary non-author flows observed end to end in both languages — error correction with first-error focus, reduced-motion behaviour, clear/reset, reload — with no blocking defect.
- accessibility (85): real radio/keyboard/focus and 200% zoom observations exist; the complete bilingual keyboard/focus matrix, the final three-column 200% recheck and any screen-reader evidence remain outstanding.
- localization-seo (92): bilingual structure enforced by the check script (verified in the reviewer's run); both language pages fully exercised with matching numbers and CSS.
- toolchain-provenance (93): zero-dependency Node 24 toolchain; build determinism (two clean outputs byte-identical) is asserted by delivery tests that pass in the reviewer's run; provenance and limits documented honestly, including the inconclusive background-tab observation.
- compatibility (72): the native CSS paused-animation reference comparison at 250/1000/1750 ms within 0.02 px tolerance, the exact 1366×768 / 1600×900 / 320 px matrix, real hidden/BFCache lifecycle, native clipboard byte comparison, real IME and other engines all remain NOT_RUN.

## Required to close (on this candidate, or a successor if code changes)
1. Native CSS reference comparison and the exact viewport matrix, with environments recorded.
2. Managed-preview runtime evidence: network/storage inventory, security headers/console.
3. Native clipboard success/denial with byte/LF paste comparison; real IME composition; system reduced-motion changes.
4. Real hidden/BFCache lifecycle and the 100-generation ≤500 ms UI timing measurement.
Until these exist, requiredChecksComplete cannot be asserted and the nine-aspect gate cannot pass, per the fixed specification.

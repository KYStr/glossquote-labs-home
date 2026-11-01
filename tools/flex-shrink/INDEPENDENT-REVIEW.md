# Flex Shrink Distribution Explorer — independent production review

Reviewer: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). The reviewer did not author, claim, or contribute to this product candidate or its specification. Verdict: **revision** — the implementation itself verified strongly wherever evidence exists; acceptance is blocked by mandatory runtime evidence that the author's own packet honestly lists as NOT_RUN, and the fixed test plan states "missing evidence remains NOT_RUN, no lower bar". This review converts that open state into an exact evidence checklist.

## Fixed candidate and verification performed
- Candidate: KYStr/glossquote-labs-home commit `db72e4372fa558c34fc7d685ade22a34d3277910`, path `tools/flex-shrink/CANDIDATE-MANIFEST.json`; PR #22 confirmed OPEN with head equal to the candidate at review time.
- CANDIDATE-MANIFEST.json read back from GitHub: SHA-256 `5378301d07d4d8e083848197cbd578d29bcc5e65492c0c3b10390f357e99aa95`, exactly matching the submission evidence. AUTHOR-CHECK.md (5,071 bytes) and TEST-PLAN.md read in full.
- Independent execution (reviewer's machine, Node v24.22.1, zero dependencies): the candidate's full test suite was run from a clean extraction of the fixed commit — **26/26 tests pass, 0 fail, 0 skipped** (the author's packet ran 25 before the array-hardening change plus the 1 affected test; the reviewer ran the complete current suite). `node scripts/check.mjs` PASS (syntax, fixed sinks/import graph, bilingual keys, nine-asset metadata/CSP, zero dependencies, deterministic expected bytes). Preview build regenerated and `check-generated` PASS — byte-identical output reproduced independently. Production build refuses without an approved origin, as designed.
- Source audit by the reviewer: `src/core.mjs` implements the restricted model in exact BigInt rational arithmetic end to end (initial freeze reasons, F0, per-round R/A/D, the sum-of-factors < 1 partial R* rule, violation loop, round cap, target invariants) with closed-schema, dense-array, data-descriptor input validation; product sources contain no fetch/XHR/storage/clipboard/innerHTML/eval patterns (the only grep hits are the check script's own forbidden-pattern list), and app rendering uses textContent.

## Findings against the nine predeclared criteria
- functionality (92): all literal fixtures F01–F17/F26 plus controller fixtures pass in the reviewer's own run; per-round table values in the author's same-byte UI evidence (95, 72.50, 72.50; R/R* −60 then −55) match the model. Verified at unit and ordinary-UI level.
- boundaries (92): grammar/length/range fixtures and the schema-hardening test pass; stale-output revocation on every edit/count change is implemented in the controller and covered by F18.
- privacy (80): source-level evidence is clean (nine static allowlisted files, no network/storage/clipboard code), but the criterion requires actual runtime verification and F22 (response headers, network/storage observation on the product server) remains NOT_RUN — the author's UI preview ran on a substitute static server on a different port, so no product-server observation exists.
- security (88): closed parsing, fixed sinks and the static CSP contract verified by audit and the check script; the runtime half of F22 (actual CSP header delivery, property-setter and negative probes) is outstanding.
- usability (90): the author's same-byte UI evidence covers the ordinary non-author task in both languages — freeze example, two-round generation, partial shrink with remaining-overflow explanation, error correction, reset — with no blocking defect observed.
- accessibility (85): focus retention, 13-step Tab order, error linking and selection behaviour observed; the full contrast matrix and exact 1280/320/200% baselines remain NOT_RUN.
- localization-seo (92): bilingual key parity enforced by the check script (verified in the reviewer's run); language toggle preserving raw values, results and errors observed in author evidence.
- toolchain-provenance (93): zero-dependency Node 24 toolchain; deterministic preview build reproduced byte-identically by the reviewer; deliberate production-origin refusal verified; provenance and limits documented without invented claims.
- compatibility (70): the criterion's core — F21, actual native flex item widths compared against the model within the 0.1 px-per-item / 0.1·N total tolerance — remains NOT_RUN, as do BFCache/JS-disabled behaviour, native IME and the F25 timing measurement. Ordinary Chromium UI on identical bytes is supporting evidence, not a substitute.

## Required to close (on this candidate, or a successor if code changes)
1. F21 native comparison on the real product in a real browser, per-item and total tolerances as specified, with the environment recorded.
2. F22 runtime evidence from the product's own server: delivered CSP headers, property-setter behaviour, negative probes, and network/storage observation.
3. Full contrast/state matrix and the exact 1280/320/200% baselines.
4. BFCache and JS-disabled behaviour, native IME entry, and the F25 timing measurement.
None of these require code changes on current evidence; they are evidence completions. Until they exist, requiredChecksComplete cannot be asserted and the nine-aspect gate cannot pass, per the task's own test plan.

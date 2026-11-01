# Linear Gradient Builder — independent production review

Reviewer: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). The reviewer did not author, claim, or contribute to this product candidate or its specification (the reviewer previously reviewed the *specification task* for this tool; that documentary role is not authorship of this product candidate). Verdict: **revision** — the controlled-test evidence is strong and the build is reproducible, but the final candidate has never been observed in a real browser: every browser observation in the packet belongs to an earlier checkpoint with a different runtime manifest, a gap the producer's own VERIFICATION.md states plainly.

## Fixed candidate and verification performed
- Candidate: KYStr/glossquote-labs-home commit `8b9eebb92a321e2130527848601a6b14d0b4a982`, path `tools/linear-gradient-builder/README.md`; PR #7 confirmed OPEN with head equal to the candidate at review time.
- Independent execution (reviewer's machine, Node v24.22.1, zero dependencies): the combined suite from a clean extraction of the fixed commit — **21/21 test groups pass, 0 failures** (core, controller, isolated build, real-app controlled-DOM); `scripts/check.mjs` reports CHECK_PASS_LIMITED (the check's own stated scope).
- Build reproduction: the reviewer ran `scripts/build.mjs` and the resulting `dist/manifest.json` hashes to `4ab2f901734a5f2a9f10ceee9baea1c264e575aabdc6a2fa3d671b0d86df6592` — exactly the frozen runtime manifest recorded in VERIFICATION.md. The nine-file runtime is byte-reproducible.
- Source audit by the reviewer: product sources contain no fetch/XHR/storage/eval patterns; clipboard handling is fail-closed with stale-Promise guards, covered by controller tests.

## Findings against the nine predeclared criteria
- functionality (90): literal CSS serialisation (including final LF), stop ordering/equality rules and count bounds pass; controller tests cover copy races, timeouts and lifecycle guards; the earlier checkpoint's real download was byte-verified against the displayed CSS.
- boundaries (90): 2–8 stop counts, closed descriptors/getters, angle/position endpoints and fail-closed behaviour on unsupported CSS are all exercised in passing tests.
- privacy (78): source-level clean, but no network/storage observation exists for any candidate, and none at all for the final one; the criterion requires actual runtime verification.
- security (85): fail-closed design and build-time symlink/unknown-file rejection verified; exact served security headers and injection/path/Host/MIME negative checks remain NOT_RUN.
- usability (82): the ordinary flow was genuinely exercised in a real browser — on the earlier checkpoint (manifest 37513f…). Later corrections (IME generate-disable, visible stop count, fail-closed error handling, clear-button logic) changed behaviour the browser evidence no longer covers.
- accessibility (78): both-language keyboard journeys, dialog focus/Escape behaviour and contrast measurements are unobserved on any candidate; controlled-DOM tests are explicitly not keyboard evidence.
- localization-seo (88): bilingual structure and localized static metadata are in the final source and covered by tests, but the final bilingual pages have not been browser-verified.
- toolchain-provenance (93): deterministic nine-file build reproduced byte-identically by the reviewer; the packet's separation of controlled tests, historical browser evidence and missing evidence is exemplary and made this review straightforward.
- compatibility (65): the final candidate has zero native browser evidence; hidden/reload/BFCache, real IME, 320 px reflow, true 200% zoom and other engines are all unobserved. This is the widest gap of the current production batch.

## Required to close (on this candidate, or a successor if code changes)
1. A real-browser pass over the final candidate in both languages: full keyboard journeys, stop add/remove/reorder, error recovery, dialog focus/Escape.
2. Clipboard content verification (or a real rejection fallback) and the downloaded CSS used on an isolated page.
3. Hidden/reload/BFCache and real IME observation; 320 px reflow and true 200% zoom; contrast measurements.
4. Full network/storage observation and the served-header/negative-check suite.
Until these exist, requiredChecksComplete cannot be asserted and the nine-aspect gate cannot pass, per the fixed specification.

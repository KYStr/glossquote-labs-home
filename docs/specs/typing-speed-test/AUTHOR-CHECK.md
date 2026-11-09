# typing-speed-test — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/typing-speed-test/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no typing test exists; nearest neighbours (focus timer, text workbench) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- The three scoring decisions most tools leave vague are pinned: strict positional comparison with backspace correction scored from the final string; net WPM defined directly from correct characters (never gross × accuracy, so the two can never disagree after rounding); and the completion ending, which scores against actual elapsed time instead of the chosen duration.
- Fixtures were recomputed by hand: 45 chars exact in 30 s → 18 WPM; 50 typed / 45 correct in 60 s → gross 10, net 9, 90.0%; completion at 20.0 s → 27 WPM; the Chinese CPM fixture (8 correct in 30 s → net 16) checks the non-WPM labelling rule.
- CJK honesty: IME composition text is excluded until commit, the clock starts at the first committed character, and Chinese results are labelled CPM — the SPEC forbids presenting a converted "WPM" for Chinese.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Passages are restricted to public-domain or written-for-the-tool texts with a PASSAGES.md provenance file; no copyrighted excerpts.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.

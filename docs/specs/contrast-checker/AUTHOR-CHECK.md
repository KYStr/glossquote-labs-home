# contrast-checker — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/contrast-checker/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission. (Corrected in the revision below: the neighbour Color Palette tool *does* evaluate opaque pairs — see the addendum. This tool's boundary is the alpha-compositing plus remediation slice defined in SPEC section 2.)

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Every numeric fixture was re-derived by script during drafting: black/white 21.00, white/white 1.00, #767676 ≈ 4.5422 (passes AA), #777777 ≈ 4.4781 (fails AA), #FF0000 ≈ 3.9985, #0000FF ≈ 8.5925, the alpha composite (127.5 channels → ≈ 3.9767), and both suggestion walks (#777777 → t 0.01 → #767676 for AA; t 0.25 → #595959, ≈ 7.0047 for AAA). The claim that some backgrounds admit no AAA foreground fix is proved in the SPEC from the max-ratio bound (minimum ≈ 4.58 at L ≈ 0.1791), not asserted.
- Two honesty rules are treated as product features, not disclaimers: verdicts compare the unrounded ratio (with the display-4.50-but-fails case as a required test), and the tool checks pairs, not pages.
- The formula is pinned to WCAG 2.1 (0.03928 breakpoint); later WCAG drafts' 0.04045 variant is a different contract and is not silently adopted.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Revision addendum (2026-11-02, responding to independent review)
Independent document review by local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf (oversight package 2026-11-02), candidate `2d8658e197ead0bd4884a3002fa3ea3f5ac1dca1`, verdict **revision** (scope 70, inputsOutputs 65). The author applied every blocking fix to the same task/spec IDs; this addendum is not a self-review and assigns no scores.
1. **Existing-tool comparison corrected.** The claim (BRIEF §2, SPEC §2, and this file) that Color Palette never evaluates WCAG pairs was false: its spec-10-color-palette FR-06 with test cases CP-07–CP-11 evaluates a chosen opaque pair with unrounded verdicts. BRIEF §2 and SPEC §2 now state this and pin the explicit distinct boundary — this tool covers only what the palette spec excludes: alpha compositing (pinned order, effective colours) and the remediation suggestion search. The author personally fetched and read the palette SPEC at commit `be197ea30d909b1353e7f77bdf16b1811ac41f71` before rewriting the comparison.
2. **Symmetry narrowed.** SPEC §2(c) and §4 now claim symmetry only for the *effective* (composited) colours; raw-input swapping with alpha is order-dependent. The reviewer's counterexamples are normative fixture 9, script-verified by the author to 10 decimal places: black α0.5 over opaque red = 2.7495900453; raw inputs swapped = 1.0054879683.
3. **Suggestion outcomes split.** SPEC §4 now defines three outcome states; a single failed direction can no longer be reported as no foreground-only solution. Fixture 10 is the reviewer's case, script-verified: whiteward search from `#777777` on white never reaches 4.5, blackward first step `#767676` = 4.5422249596. Fixture 11 (background `#767676`, target 7.0; best reachable 4.6233 black / 4.5422 white) pins the only state where the no-fix message is legitimate.
4. **Rubric and tests aligned.** SPEC §6 (functionality, boundaries) and §7 (tests c, d) now require the transparent-swap counterexample, both-direction outcome tests, and the absence of any "only contrast evaluator" product claim.
All other fixtures (1–8) were re-verified by the same script and are unchanged. Product checks remain NOT_RUN; the author does not mark this specification ready.

## Public subset and production handoff
- Fixtures are standard reference colour pairs; no user data is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.

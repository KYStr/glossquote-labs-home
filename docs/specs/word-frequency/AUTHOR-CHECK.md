# word-frequency — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/word-frequency/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no frequency counter exists; neighbours (text workbench, text diff) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Both language fixtures were hand-counted twice during drafting; the exercise caught two author errors before delivery (the majority casing of the merged `the` token is `The`, and the punctuation in the Chinese fixture breaks the bigram run, so there are 8 bigrams, not 9, and no cross-boundary pair). The corrected counts are what the SPEC states normatively.
- The Chinese design is deliberately segmentation-free (characters + bigrams) with the reason stated in the product itself; a future dictionary segmenter would be a different scope decision, not a silent upgrade.
- Percentages are defined against the filtered table total, and tie-breaking is total (count, then first occurrence), so the displayed order — and ranks — are exactly reproducible.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Revision addendum (2026-11-02, responding to independent review)
Independent document review by local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf (oversight package 2026-11-02), candidate `9f982e692aeadbd9f0487fb81f11a6357f76a80e`, verdict **revision** (inputsOutputs 75). The author applied every blocking fix to the same task/spec IDs; this addendum is not a self-review and assigns no scores.
1. **Category renamed accurately (scope unchanged).** Section 2 called the first table "Latin-script tokens" while section 4 accepts every Unicode Letter/Number outside the named CJK classes. The fix is a rename, not a narrowing: SPEC §1/§2/§4 (and BRIEF) now name the table "Words — tokens of Unicode letters/numbers outside the CJK classes" and state explicitly that Greek, Cyrillic and other scripts are in scope. New fixtures 6 (`Ω ω Ω` → ω ×3) and 7 (`Ж ж Ж` → ж ×3) give the expected outputs, verified by script.
2. **Fold pinned to Unicode simple case folding.** The SPEC previously equated case folding with `toLowerCase()` — they differ on Greek final sigma. SPEC §4 now pins the CaseFolding.txt simple fold mappings (status C+F, shipped as auditable data with a stated Unicode version) as the only normative fold and forbids substituting `toLowerCase()`. Under the pinned fold Σ, ς and σ all map to σ and merge — new fixture 4 (`Σ ς σ ΣΣ` → σ 3, σσ 1), and fixture 5 (Greek word `ΑΒΓ αβγ Αβγ` → αβγ ×3, display `ΑΒΓ` by the first-occurrence tie-break). The author verified the divergence directly: script case folding merges the sigma trio, while JavaScript `"Σςσ".toLowerCase()` yields `"σςσ"` (ς unmerged) — fixture 4 is the test that separates the two.
3. **Rubric and tests aligned.** SPEC §6 (functionality, toolchain-provenance) and §7 (tests a, b, f) now carry the non-Latin scope, the fold-table provenance, and the discriminating sigma test, so two conforming-looking implementations can no longer diverge on these inputs.
Product checks remain NOT_RUN; the author does not mark this specification ready.

## Public subset and production handoff
- Fixtures are constructed sentences; no user text is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.

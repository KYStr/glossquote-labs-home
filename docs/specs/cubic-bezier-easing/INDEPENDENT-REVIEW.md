# Cubic Bézier Easing Explorer — Independent Specification Review

Date: 2026-10-31. Scope: non-author review of document completeness, not implementation or product-quality scoring.

## Candidate identification and status

The original published document candidate is commit `3016c147699eca4045c8745b88bb2e3fe508cd5a`, draft PR #12 in `KYStr/glossquote-labs-home`. The reviewed R1 revision is bound to these exact UTF-8 file contents:

| File | Bytes | SHA-256 |
|---|---:|---|
| SPEC.md | 32749 | f9310462f9ba12b6ef96e0d231f0bb8c857314823b58713f13a58184a7b2c6f5 |
| AUTHOR-CHECK.md | 4899 | 0708e648f15808a163b825bfb3e64a011103f7229b574976c4e10c0b0e9ac1df |

BRIEF.md is unchanged from the original fixed brief commit `2537bd5349c2773253aa4c47f2ab7332ac676538`.

**Document-content result: R1 corrected; no remaining completeness defect identified.** The revised files were independently read back at commit `28b3e9f86010c7aa263252e027f7baf59549f6eb`, with exact content equality to the reviewed revision and the hashes above. PR #12 was open and draft with that head. This report does not itself record registry readiness, PR approval, product acceptance, merge or deployment.

## Eight-section completeness review

| Section | Independent finding |
|---|---|
| goal | Identifies the intended user, time-versus-progress problem, observable non-author journey and explicit non-goals. Product assumptions are not presented as user-research evidence. |
| scope | Fixed brief and baseline, bounded features and exclusions distinguish this direction from existing tools. It does not take ownership of those products or grant publication rights. |
| userFlow | Initial generation, validation, immediate result invalidation, IME, play/pause/resume/stop, static sampling, reduced motion and clipboard fallback have explicit transitions. Lifecycle cancellation and unavoidable late OS clipboard writes are distinguished. |
| inputsOutputs | Exact raw schema, field-order errors, thousandth normalization, rational inversion, error bounds, plot/table mapping and deterministic CSS are specified. Legal negative and overshooting progress is not clipped. |
| implementation | Pure mathematics, controller and DOM responsibilities are separated. Bounded resources, epoch cancellation, safe DOM/SVG construction, bilingual accessibility, local preview isolation and reproducible zero-dependency delivery are described. |
| acceptance | Nine future product dimensions retain independent methods, expected outcomes and falsifying evidence. Untested necessary checks remain null/NOT_RUN; document completeness does not supply product scores. |
| tests | Offline and native-browser matrices are bounded and executable, with analytic or independent expected values. R1 resolves the exact-equality conflict in T04 without weakening the original mathematical error bound. |
| handoff | Fixed sources, non-author review, stable-ID revisions and separate later production claim are required. Readiness, product acceptance and publication remain distinct. |

## R1 finding and verification

The original T04 phrase requiring the reversed linear example to equal Q near the centre conflated mathematical equality with a finite inverse approximation and omitted Q's millionth normalization. For controls `(1,1,0,0)`, the two axes share the polynomial `3t-6t²+4t³`; finite dyadic t produces a dyadic value that cannot exactly equal `499999/1000000` or `500001/1000000`.

The corrected T04 compares the rational output to `Q/1000000` with absolute error at most `9*2^-41`, separately allows at most `1e-9` after rendering conversion, and requires Q499999 below 0.5 and Q500001 above 0.5. The centre Q500000 is exactly 0.5. Exact equality is required only for endpoints or successful exact-comparison stopping.

An independently written rational-arithmetic reproduction of the prescribed 40-step inversion gives:

| Q | Error against Q/1000000 | Result |
|---:|---:|---|
| 499999 | approximately -1.3175742641189345e-16 | Within bound; strictly below 0.5 |
| 500000 | 0 | Exactly 0.5 |
| 500001 | approximately +1.3175742641189345e-16 | Within bound; strictly above 0.5 |

The full SPEC comparison shows only version metadata and the T04 expectation changed. Section4.2's algorithm and the remaining substantive sections are unchanged. AUTHOR-CHECK updates the file binding and explains the affected correction. Existing unaffected arithmetic and CSS-byte checks were not rerun merely to increase test counts.

## Limits and next verification

This is document reasoning and arithmetic, not product execution. Product implementation, test/check/build, native UI, clipboard, browser lifecycle, accessibility, performance and compatibility remain NOT_RUN; all nine product-quality scores remain null.

Before recording readiness, read the corrected files back from their exact GitHub commit, confirm these hashes and the PR head, verify current author/reviewer bindings, and record the independent eight-section result through the existing coordination protocol. A changed substantive candidate requires a corresponding review. Nothing in this report authorizes merging, deployment, workflows or changes of owner.

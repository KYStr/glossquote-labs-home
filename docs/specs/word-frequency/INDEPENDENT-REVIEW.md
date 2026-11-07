# Independent document review — word-frequency

Reviewer: local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf (actual primary local conversation; not the author or a maker).
Date: 2026-11-02. Verdict: **REVISION — specification documents only**.
Task: `labs-word-frequency-spec-20261102`. Spec: `spec-word-frequency-v1`.
Candidate: `9f982e692aeadbd9f0487fb81f11a6357f76a80e`; [PR](https://github.com/KYStr/glossquote-labs-home/pull/38). Original author/owner is preserved.

## Fixed files personally read

- [SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/9f982e692aeadbd9f0487fb81f11a6357f76a80e/docs/specs/word-frequency/SPEC.md): 13624 bytes; SHA-256 `33cc8c42ffa1db5414fa0a51fde841539d9b88606ca50704f1aa7bd6ecca09ae`.
- [AUTHOR-CHECK.md](https://github.com/KYStr/glossquote-labs-home/blob/9f982e692aeadbd9f0487fb81f11a6357f76a80e/docs/specs/word-frequency/AUTHOR-CHECK.md): 2112 bytes; SHA-256 `ba499d03456b328bb81ae1d1ada8cffbea67f5a79ab99de345cb17bbe1fd0077`.
- [BRIEF.md](https://github.com/KYStr/glossquote-labs-home/blob/455964eb5312765184558fa7b146e4ada31de09b/docs/specs/word-frequency/BRIEF.md): 3984 bytes; SHA-256 `0f2e7b8d649a0d08d6387a99f3b12db543e2dbba62fefb7f0dd8678599304848`.

## Eight predeclared document aspects

Scores below judge the actual written contract and independent documentary checks, **not a product implementation**. All future product checks are NOT_RUN and product scores are null.

| Aspect | Score | Evidence |
|---|---:|---|
| goal | 95 | §1 identifies writers/teachers and deterministic ranked frequency outcomes. |
| scope | 93 | §2 differs materially from Text Workbench transformations and Text Diff alignment; no main functional duplication was found. |
| userFlow | 90 | §3 input, filters, totals, display cap, full-table export and session-only stopword editing are described. |
| inputsOutputs | 75 | §2 says Latin-script tokens but §4 accepts every Unicode Letter/Number outside the named CJK blocks (e.g.Ω andЖ). It also equates simple case folding with toLowerCase; Σ/ς lower toσ/ς and do not merge. |
| implementation | 85 | Pure classifier/count/filter/CSV layers are feasible once the script category and exact case-normalization contract are fixed. |
| acceptance | 85 | Future identical-count requirements need the exact normalization contract; ambiguity can produce two conforming-looking incompatible products. |
| tests | 85 | Primary Node counterexample verifies the lowercase distinction; add Greek/Cyrillic and case-equivalence expected cases after choosing and naming the intended policy. |
| handoff | 94 | Fixed candidate, author check and BRIEF are present; original author retains the task and revises the same spec ID. |

## Decision and author follow-up

Blocking fixes: rename the non-CJK Letter/Number category accurately or intentionally limit it to Latin; choose exact locale-independent lowercasing versus Unicode simple case folding and state testable expected outputs. This does not require adding a segmentation library or expanding product scope.

Do not mark this specification ready. Return only the confirmed blocking findings to the original owner; revise the same IDs and submit a new fixed candidate for review. Other sound specifications may proceed.

## Verification scope

The primary personally read the fixed documents and reviewed the evidence, with bounded Luna/max advisory review for Aspect Ratio and Roman Numerals. The primary independently ran the document arithmetic/counterexample scripts in `coordination/oversight/2026-11-02/evidence/` on this review branch. No product/browser/build/clipboard/network/storage test, deployment, merge or production ownership change was performed. A file's advisory score is not silently promoted to a product score. Registry status is separately read back after publication of this report.

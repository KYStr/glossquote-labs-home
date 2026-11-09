# Independent document review — morse-code-translator

Reviewer: local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf (actual primary local conversation; not the author or a maker).
Date: 2026-11-02. Verdict: **REVISION — specification documents only**.
Task: `labs-morse-code-translator-spec-20261102`. Spec: `spec-morse-code-translator-v1`.
Candidate: `a2e9a467213ff47a78b976a672e693efae1cce8a`; [PR](https://github.com/KYStr/glossquote-labs-home/pull/45). Original author/owner is preserved.

## Fixed files personally read

- [SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/a2e9a467213ff47a78b976a672e693efae1cce8a/docs/specs/morse-code-translator/SPEC.md): 15870 bytes; SHA-256 `435fe32575141a6db6dfa73a2c394972e15352f54a507f494fda0a0a8e5bb37b`.
- [AUTHOR-CHECK.md](https://github.com/KYStr/glossquote-labs-home/blob/a2e9a467213ff47a78b976a672e693efae1cce8a/docs/specs/morse-code-translator/AUTHOR-CHECK.md): 2491 bytes; SHA-256 `e2aae900b505e324f09df3cd5e6e45a9d02548697349a62d6d81ed4b82c007a4`.
- [BRIEF.md](https://github.com/KYStr/glossquote-labs-home/blob/d5abdb05c991b7de8326054f1b949ee0059e8d7e/docs/specs/morse-code-translator/BRIEF.md): 4250 bytes; SHA-256 `06f6f49254cfd97876c1c7d8d34a0f66a92b163aedde10badd6108b570abf191`.

## Eight predeclared document aspects

Scores below judge the actual written contract and independent documentary checks, **not a product implementation**. All future product checks are NOT_RUN and product scores are null.

| Aspect | Score | Evidence |
|---|---:|---|
| goal | 95 | §1 defines a useful text/code/timing job, actual learners and a finite local-playback outcome. |
| scope | 93 | §2 distinguishes machine Base64, speech and recurring metronome clicks; translation and finite signal timing are separate. |
| userFlow | 82 | §3 covers edit direction, errors, audio fallback and stop, but playback/copy behavior for unknown or stale Morse should follow a fixed validity state. |
| inputsOutputs | 65 | §4 has unavoidable collisions: AR=. - . - . without spaces equals+, AS=.-... equals&, KN=-.--. equals(. Both punctuation bijection and all-prosign round-trip cannot hold for an untagged single code token. |
| implementation | 83 | Audio-clock scheduling and shared interval data are sound directions, but decode representation/precedence must first make the source semantics deterministic. |
| acceptance | 78 | §6 all five prosigns round-trip conflicts with §7 every punctuation code round-trip; both cannot be accepted under the current plain-token decoder. |
| tests | 75 | Primary independent counterexample reproduces the three exact collisions. Unicode uppercase expandsß→SS although the text promises unsupported input is refused; choose raw validation order explicitly. |
| handoff | 94 | BRIEF/SPEC/AUTHOR and PR candidate are fixed; same original author must repair and resubmit, without a product claim. |

## Decision and author follow-up

Blocking fixes: define an unambiguous tagged/prosign mode or explicitly revise the promised inverse semantics while preserving honest user output; update fixtures accordingly. Pin unsupported-input validation before/after case normalization (ß counterexample). Do not hide collisions by selecting a lookup order while continuing to promise both round-trips.

Do not mark this specification ready. Return only the confirmed blocking findings to the original owner; revise the same IDs and submit a new fixed candidate for review. Other sound specifications may proceed.

## Verification scope

The primary personally read the fixed documents and reviewed the evidence, with bounded Luna/max advisory review for Aspect Ratio and Roman Numerals. The primary independently ran the document arithmetic/counterexample scripts in `coordination/oversight/2026-11-02/evidence/` on this review branch. No product/browser/build/clipboard/network/storage test, deployment, merge or production ownership change was performed. A file's advisory score is not silently promoted to a product score. Registry status is separately read back after publication of this report.

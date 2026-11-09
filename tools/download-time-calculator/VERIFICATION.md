# Verification — Download Time Calculator (build-first candidate)

Environment: Node v24.22.1, Linux, no dependencies installed
(zero-dependency tool). All commands run in
`tools/download-time-calculator/`. Sources: fixed spec candidate
`9d865432902652718d572d3f162518e640ae6268` (spec task
`labs-download-time-calculator-spec-20261109`, draft spec PR #167);
implementation base `codex/initial-publication` @
`c08e3243f0257f80fa512d15b1c37fcbeb6ef962`. The spec fixtures are
vendored verbatim at `test/fixtures.json` (SHA-256
`84d0aa7ca55b0c26cf33b20097bb1823a6495ff1ced46e9f7076ebcc3e7dd374`)
because the spec PR is not merged into the base branch.

## Pre-implementation check

All 9 successful core fixtures were recomputed with an independent
Python `Fraction` implementation of the SPEC's stated rules before
any product code existed — 9/9 matched exactly.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 46/46 (12 fixture core cases + 14 core boundary suites, 13 controller suites incl. the 3 controller fixtures, 5 report suites, 2 page suites) |
| `npm run check` | PASS |
| `npm run build:preview` (run twice) | PASS — 9 files; SHA-256 manifest identical across both runs (byte-identical) |
| `npm run check:generated:preview` | PASS — 9 files, hashes exact, worker source matches fixed bytes |
| Loopback probe of `dist-preview/` | PASS — `GET /` 200 「下載時間計算機｜Gloss Tools」, `GET /en/` 200 “Download Time Calculator \| Gloss Tools” |
| Embedded worker source executed in Node with a fake `self` | PASS — basic-gb snapshot returns the fixture result exactly |

## Spec errata candidates

One prose conflict (details in HANDOFF.md): the SPEC §tests prose
calls speedValue "0.009" outside the grammar, but the normative
grammar (same ≤3-decimal regex as sizeValue) accepts it, so the
pinned validation order yields RANGE. The implementation and tests
follow the RULE. All literal fixtures agree with the rules.

## NOT_RUN (explicit)

- Real-browser (Chrome/Edge) rendering and interaction in both
  languages, including the live module Worker created from a Blob URL,
  keyboard-only flow, focus movement on error, 320 px reflow, real
  200% zoom, reduced motion, and touch targets — no isolated browser
  mechanism was used.
- Native download dialog (OS-level) for the report file; the report
  bytes themselves are verified in Node tests.
- Measured contrast ratios and assistive-technology checks.
- Network/Storage observation in a real browser profile (zero-request,
  storage, cookie, service-worker checks).
- Real-device checks.
- Production build (`--mode production` is refused: no approved
  origin), deployment, catalog integration, and the independent
  nine-aspect review (pending by design in build-first mode; all nine
  aspects remain null / NOT_RUN).

## Next owner

Independent reviewer, after the parent verifies the PR head.

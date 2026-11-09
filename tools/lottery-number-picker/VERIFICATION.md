# Verification — Lottery Number Picker (build-first candidate)

Environment: Node v24.22.1, Linux, zero dependencies. All commands run in
`tools/lottery-number-picker/`. Sources: fixed spec candidate
`038d3f8b114b20fbcf31949c912d18713fc470ec` (spec task
`labs-lottery-number-picker-spec-20261109`, draft spec PR #158);
implementation base `codex/initial-publication` @
`6a56a115e6bbc1208712c74c855906ce3729e2e3`. The spec fixtures are
vendored verbatim at `test/fixtures.json` (SHA-256
`b8922e9312d7ac1f392a4cc449f04c9b5ff3123568d39a69717a46b7125fa918`)
because the spec PR is not merged into the base branch.

## Independent pre-check

Before any product code was written, the SPEC's mulberry32 + partial
Fisher–Yates algorithm was re-implemented from the SPEC text in a
scratch Python program (32-bit masking, independent of the JS
implementation); all 8 success core fixtures reproduced exactly. The
JS core was then written and the full fixture suite run against it.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 37 tests, 0 fail |
| `npm run check` | PASS — files, package contract, game table/messages/help texts, fixtures identity, pages, CSP, download shape, syntax, capability scan, core purity, core determinism/no-self-seeding |
| `npm run build:preview` (run twice) | PASS — byte-identical (BUILD-MANIFEST.json SHA-256 `9818b7cd…9865` both runs, 7 files) |
| `npm run check:generated:preview` | PASS — manifest hashes exact, bilingual metadata present, robots deny-all |
| Loopback HTTP probe | PASS — see below |

### npm test breakdown (37)

- `test/core.test.mjs` (28): all 12 literal core fixtures deep-compared
  verbatim; determinism (same input twice → identical output); stream
  continuity across sets; PRNG outputs are k/2^32 in [0, 1); per-zone
  invariants over all three games (ascending, duplicate-free, in
  range, Zone 2 shape); exclusions never appear in Zone 1 while Zone 2
  stays full-range; grammar rejects (leading zeros, signs, decimals,
  exponents, surrounding spaces); INPUT_LIMIT precedes grammar/EMPTY;
  per-field EMPTY vs RANGE; cross-field validation order; token rules
  (only U+0020 trimmed, tabs/inner spaces/empty tokens fail with the
  right row); per-game RANGE rows; duplicates checked only after all
  tokens pass; pool boundary (exactly enough legal, one fewer →
  POOL_TOO_SMALL); SCHEMA classes (null, non-object, array, missing,
  extra, wrong type, accessor); input not mutated; copy-text format
  byte rules (LF join, no trailing LF, UTF-8 no BOM).
- `test/controller.test.mjs` (7): the 3 literal controller fixtures
  verbatim via a controllable fake scheduler (dirty-error revocation,
  cancel-late generation dropping, replace-late keeping the newer
  error), plus initial-state, cancel-outside-busy, success exposing
  copy/download, empty-vs-dirty edit semantics, and draft copy
  isolation.
- `test/pages.test.mjs` (2): both pages' pinned metadata, candidate
  rules, help texts, honest note, FAQ answers, and element ids.

### Loopback probe

Served `dist-preview/` on 127.0.0.1:49351 (ephemeral, loopback only):

- `GET /` → 200, `<title>樂透選號器｜Gloss Tools</title>`
- `GET /en/` → 200, `<title>Lottery Number Picker | Gloss Tools</title>`
- `GET /js/app.js`, `GET /styles/app.css` → 200
- `GET /nope.html` → 404; path-as-is traversal `/../../package.json` → 404
- `POST /` → 405
- HTML responses carry the SPEC-pinned CSP, `X-Content-Type-Options:
  nosniff`, and `X-Robots-Tag: noindex, nofollow`.

## Spec errata candidates

None. Every literal fixture (12 core + 3 controller) reproduces from
the SPEC's stated rules; no fixture-vs-rule conflict was found.

## NOT_RUN (explicit)

- Real-browser (Chrome/Edge) rendering and interaction in both
  languages, including the live scheduled-run/cancel flow, clipboard
  copy against a real clipboard, the native download dialog, keyboard-
  only flow, 320 px reflow, real 200% zoom, reduced motion, and touch
  targets — no isolated browser mechanism was used by this builder.
- Measured contrast ratios and assistive-technology checks.
- Network/Storage observation in a real browser profile.
- Real-device checks.
- Production build (`--mode production` is refused: the SPEC's planned
  origin is not configured), deployment, catalog integration, and the
  independent nine-aspect review (pending by design in build-first
  mode; all nine aspects remain null / NOT_RUN).

## Next owner

Independent reviewer, after the parent verifies the PR head.

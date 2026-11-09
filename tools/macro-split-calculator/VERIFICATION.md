# Verification — Macro Split Calculator (build-first candidate)

Environment: Node v24.22.1, Linux, no dependencies installed
(zero-dependency tool). All commands run in
`tools/macro-split-calculator/`. Sources: fixed spec candidate
`2a24708ad8b9e10c5631f58e896dd005b069eb8b` (spec task
`labs-macro-split-calculator-spec-20261109`, draft spec PR #151);
implementation base `codex/initial-publication` @
`b7ffa5a133ac7a2b3221d0807e61c2c3faa48442`. The spec fixtures are
vendored verbatim at `test/fixtures.json` because the spec PR is not
merged into the base branch.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 43 tests, 0 fail |
| `npm run check` | PASS — files, package contract, core ranges/presets/factors/defaults/example vs vendored fixtures, bilingual metadata incl. verbatim nutrition note, syntax incl. worker concatenation, forbidden-capability scan, core purity |
| `npm run build:preview` (run twice) | PASS — byte-identical: `BUILD-MANIFEST.json` unchanged between runs (diff clean) |
| `npm run check:generated:preview` | PASS — manifest hashes exact, bilingual metadata present, worker source matches fixed bytes |
| Loopback probe (`node scripts/serve.mjs --host 127.0.0.1 --port 49381 --dir dist-preview`) | PASS — see below |
| Embedded worker source executed in Node with a fake `self` | PASS — see below |

### npm test breakdown (43)

- `test/core.test.mjs`: the 8 literal core fixtures from fixtures.json,
  deep-equal against the product's `run` (preset drift absorption both
  directions, adjustment-of-zero kept, custom 100/0/0 boundary, three-meal
  split, RATIO_SUM, RANGE and INTEGER_FORMAT first errors); structural
  invariants over every success fixture (per-macro kcal = factor × grams,
  deltaKcal identity, per-meal gram sums equal daily grams, per-meal kcal
  sums equal impliedKcal); hand-derived cases computed independently
  before implementation (800 and 10,000 kcal endpoints, high-protein at
  2,000, the SPEC's 40/40/20 largest-macro tie resolving to protein,
  meals 1 and meals 6); SCHEMA classes (null, array, missing, extra,
  wrong type, accessor); named presets ignoring garbage pct fields
  completely; field order (calories → preset → pct RANGE before
  RATIO_SUM → RATIO_SUM before meals) and per-field order (INPUT_LIMIT →
  EMPTY → grammar → RANGE); grammar rejects (decimals, signs, spaces,
  leading zeros, exponents, full-width digits); ratio sums 99 and 101;
  preset capacity reading (long non-enum → ENUM); meals edges (0, 7,
  long digit string → RANGE); lone surrogates; a 500-case deterministic
  invariant sweep.
- `test/controller.test.mjs`: the 3 literal controller fixtures verbatim
  (state-dirty-error, state-cancel-late, state-replace-late) via a fake
  worker with controllable completion, checking `reportAvailable` at
  every checkpoint, plus edit-during-busy, run-while-busy replacement,
  cancel no-op, worker error → WORKER_ERROR, createWorker throw →
  WORKER_ERROR, loadExample (fills fixture case 1, waits for manual run),
  reset from success, edit from empty/error, and preset switch as a
  result-revoking draft edit.
- `test/report.test.mjs`: the fixed download's canonical bytes for
  balanced-2000 and meals-three-split compared against hand-written
  literals (keys sorted by UTF-16 code units, compact, one trailing LF),
  SHA-256 of the literal, key-insertion-order independence, `toJSON`
  never invoked, and the 2,097,152-byte OUTPUT_LIMIT raising RangeError.
- `test/site.test.mjs`: both pages' lang/title/description/h1, preview
  noindex, no canonical/hreflang, relative language link, same-language
  home link, draft-loss note, verbatim nutrition note, pinned FAQ
  answers, section headings, all control/error ids, all five preset
  radios, and the download affordance.

### Loopback probe

Served `dist-preview/` on 127.0.0.1:49381 (ephemeral, loopback only):

- `GET /` → 200, `<title>三大營養素分配計算機｜Gloss Tools</title>`
- `GET /en/` → 200, `<title>Macro Split Calculator | Gloss Tools</title>`
- `GET /js/app.js`, `GET /js/worker-source.js`, `GET /styles/app.css` → 200
- `GET /robots.txt` → 200 (deny-all body)
- `GET /../../package.json` (path-as-is traversal) → 404
- `GET /nope.html` → 404

### Embedded worker source (Node harness)

Imported `WORKER_SOURCE` from the built `dist-preview/js/worker-source.js`,
wrote it to a temp module, installed a fake `self`, and invoked the
handler: the balanced-2000 snapshot returned generation 7 with
adjustedMacro "carbs" and impliedKcal 1999; a custom snapshot with a bad
ratio sum returned the pinned RATIO_SUM error. This exercises the exact
bytes the page turns into a module Worker; it does not replace a real
browser Worker check (still NOT_RUN below).

## Build manifest (preview)

`BUILD-MANIFEST.json` — 9 files. SHA-256 highlights:

- `index.html` — `25adccb3329a43075dfd2c16c93473593333bb20b31efdc76d551aff421b1ebb`
- `en/index.html` — `173d1b5036d56384fb72dea7a4c0159074daded2f98a9f795c3470860f6eed0a`
- `js/core/macro.mjs` — `5e3c000b0641abf08367e2b23ffb9249218251c5b75d08c10ad8a9b9eba3dd5f`
- `js/worker-source.js` — `d6b8dd0dfc4eff71f23a43246df6077b160c89d82a8a37bed03878e348b337a2`
- `styles/app.css` — `adc0cfe46e764374757abfd61baa50a1169474d348a8f6040f8ba9e10f529a8f`

## Spec errata candidates

No fixture conflicts. One minor ambiguity, recorded for the spec
reviewer:

- **Generic per-field order vs the `preset` capacity.** The SPEC's
  validation paragraph lists the per-field order generically as
  "容量 INPUT_LIMIT、缺內容 EMPTY、文法 …（preset 不符枚舉為 ENUM）、
  範圍 RANGE", which could be read as giving every field an INPUT_LIMIT
  capacity; but the only capacities the SPEC ever quantifies are the
  numeric string fields' 8 units, and the pinned enum value
  `high-protein` is 12 units — under the imported-cap reading that
  preset could never be selected, contradicting the SPEC's own preset
  table and its tests section (which treats all named presets as usable
  inputs). The implementation therefore applies no capacity to `preset`
  (EMPTY → ENUM only) and likewise none to `meals` (whose capacity the
  SPEC also never restates, unlike the pct fields where it does). If the
  reviewer rules a capacity was intended for either field, only the
  validator's flags change; no fixture outcome is affected.

## NOT_RUN (explicit)

- Real-browser (Chrome/Edge) rendering and interaction in both
  languages, including the live module Worker created from a Blob URL,
  the native download dialog, keyboard-only flow, focus movement on
  error, 320 px reflow, real 200% zoom, reduced motion, and touch
  targets — no isolated browser mechanism was used.
- Measured contrast ratios and assistive-technology checks.
- Network/Storage observation in a real browser profile (zero-request,
  storage, cookie, service-worker checks).
- Real-device checks.
- Production build (`--mode production` is refused: no approved origin),
  deployment, catalog integration, and the independent nine-aspect
  review (pending by design in build-first mode; all nine aspects remain
  null / NOT_RUN).

## Next owner

Independent reviewer, after the parent verifies the PR head.

# Verification — Body Fat Calculator

Environment: Node v24.22.1, Linux, no GPU. All commands run in
`tools/body-fat-calculator/` unless stated otherwise. All test data is
synthetic (from fixtures.json or hand-derived); no real user data was
used. The spec's fixtures were first recomputed independently from the
SPEC's pinned formulas with a scratch script (before any product code
existed): all 5 successful cases and the implausible case matched the
printed expectations exactly.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` | exit 0 — **74 pass / 0 fail** |
| `npm run check` | exit 0 — files, package contract, core fields/ranges/defaults/example vs fixtures.json, bilingual metadata (incl. pinned hints, disclaimer, FAQs), syntax (incl. the worker concatenation), forbidden-capability scan, core purity |
| `npm run build:preview` (twice) | exit 0 both times — **byte-identical**: BUILD-MANIFEST.json identical after the second run (diff clean); 9 files in dist-preview/ |
| `npm run check:generated:preview` | exit 0 — 9 files, manifest hashes exact, bilingual metadata present, `js/worker-source.js` equals the fixed core + handler bytes, robots.txt denies all |
| Loopback HTTP probe (`node scripts/serve.mjs --host 127.0.0.1 --port 49317 --dir dist-preview`) | `/` 200 text/html (title「體脂率計算機｜Gloss Tools」), `/en/` 200 (title "Body Fat Calculator \| Gloss Tools"), `/js/app.js` + `/js/worker-source.js` 200, `/styles/app.css` 200, `/robots.txt` 200; missing page → 404; traversal `..%2f..%2fpackage.json` → 403; HTML carries the SPEC CSP, nosniff, and `X-Robots-Tag: noindex, nofollow` |

## Test coverage

- **Core fixtures (12):** all 12 literal core cases from fixtures.json
  (`man-normal`, `woman-normal`, `woman-athletes`,
  `man-category-boundary`, `woman-category-boundary`, `man-log-domain`,
  `woman-log-domain-zero`, `hip-not-applicable`, `hip-empty`,
  `decimal-format`, `range-height`, `implausible-result`) compared with
  `assert.deepEqual` against the verbatim expected values.
- **Hand-derived core cases:** legal endpoints (height 100/250, neck 80,
  waist 300, weight 25/500) with expected values computed from the SPEC
  formula by hand; waist exactly equal to neck → LOG_DOMAIN; a negative
  computed percentage → IMPLAUSIBLE_RESULT; field-order pins (sex ENUM
  beats height RANGE; height RANGE beats waist DECIMAL_FORMAT; hip
  NOT_APPLICABLE beats weight RANGE; all field checks precede the
  cross-field LOG_DOMAIN).
- **Validation (29 cases):** EMPTY, INPUT_LIMIT (including the sex and
  male-hip capacity readings), UNICODE (lone high/low surrogates, also in
  sex), DECIMAL_FORMAT shapes (leading zero, trailing/leading dot, two
  decimals, sign, space, exponent, four integer digits), RANGE just
  outside every bound on both sides, ENUM (empty and wrong-case sex), and
  NOT_APPLICABLE for junk male hip text (no grammar check, per the SPEC).
- **SCHEMA (5 tests):** null/array/scalar inputs, missing and extra
  fields, wrongly typed values, an accessor-backed field, and an extra
  accessor key.
- **Invariants sweep:** for a grid of valid male/female inputs, every
  success satisfies 0 < bodyFatPct < 75, fatMassKg + leanMassKg equals
  the weight exactly at one decimal, and the category equals the SPEC
  table applied to the rounded percentage (table restated in the test).
- **Controller:** the 3 controller fixtures verbatim (`state-dirty-error`,
  `state-cancel-late`, `state-replace-late`) driven by a fake worker with
  controllable completion (the dirty-error flow delivers the real core's
  verdict on the posted snapshot, as the real worker does), plus initial
  defaults, loadExample, edit-during-busy termination, the sex-switch hip
  clearing patch, worker onerror → WORKER_ERROR, createWorker throw →
  WORKER_ERROR, cancel no-op, reset from success, and a foreign-generation
  reply dropped while busy.
- **Report (5 tests):** canonical compact JSON for the man-normal and
  woman-normal results (exact strings written by hand, byte count and
  SHA-256 checked), a live run's report matching the hand-written bytes,
  insertion-order independence, and OUTPUT_LIMIT for an oversized
  synthetic result.

## Recorded interpretations

- Candidate pages carry no canonical/hreflang, per the SPEC's candidate
  rules (the generic brief template asks for them; the SPEC wins).
- File layout follows the handbook contract (`public/js/core/`,
  `public/js/app.js`) rather than the SPEC sketch's `src/` names.
- The sex field takes the capacity/surrogate checks before ENUM, per the
  SPEC's per-field order for every field; see HANDOFF.md.
- Build output is `dist-preview/` per the SPEC's test gate.

## Spec errata

None. All 12 literal core fixtures and all 3 controller fixtures
reproduce exactly from the SPEC's own rules; no printed fixture
contradicts its rule.

## NOT_RUN

- Real-browser rendering/interaction, including the actual module-Worker
  + Blob download flow, keyboard walk-through, 320 px / 200% zoom /
  reduced motion, and the SPEC's isolated Chrome + Edge gate.
- Real devices/touch, assistive tech, measured contrast of the tool's
  own UI.
- Network/Storage zero-request audit in a clean isolated profile.
- Deployment, and the independent nine-aspect review (pending by design
  in build-first mode).

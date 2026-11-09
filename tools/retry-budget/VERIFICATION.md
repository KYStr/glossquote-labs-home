# Verification — Retry Time Budget Planner

Environment: Node v24.22.1, Linux, no GPU. All commands run in
`tools/retry-budget/` unless stated otherwise. All test data is synthetic
(from fixtures.json or hand-derived); no real user data was used.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` | exit 0 — **53 pass / 0 fail** |
| `npm run check` | exit 0 — files, package contract, core ranges/defaults/example vs fixtures.json, bilingual metadata, syntax (incl. the worker concatenation), forbidden-capability scan, core purity |
| `npm run build:preview` (twice) | exit 0 both times — **byte-identical**: BUILD-MANIFEST.json identical after the second run (diff clean); 9 files in dist-preview/ |
| `npm run check:generated:preview` | exit 0 — 9 files, manifest hashes exact, bilingual metadata present, `js/worker-source.js` equals the fixed core + handler bytes, robots.txt denies all |
| Loopback HTTP probe (`node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview`) | `/` 200 text/html, `/en/` 200 en, `/js/app.js` 200, `/js/worker-source.js` 200, `/styles/app.css` 200, `/robots.txt` 200; traversal `..%2f..%2fpackage.json` → 403; missing page → 404; HTML carries `X-Robots-Tag: noindex, nofollow`; zh/en titles verified as the SPEC-pinned titles |

## Test coverage (53 tests)

- **Core fixtures (7):** all 7 literal core cases from fixtures.json
  (`bounded-exponential`, `exact-budget`, `no-first`, `zero-cap`,
  `fixed-delay`, `too-many`, `decimal-factor`) compared with
  `assert.deepEqual` against the verbatim expected values.
- **Hand-derived core cases:** cap smaller than initial delay; end ==
  budget + 1 rejection; attemptLimit 16 full fill; BigInt exponential
  growth (initialDelay 599999, factor 8, cap 600000 — attempts 1/2/3/16 and
  unspent 77,399,985 checked by hand); defaults timeline; budget at its
  legal maximum (86,400,000).
- **Validation (23 cases):** every range boundary per field, leading-zero /
  sign / space / decimal / exponent / empty / 9-unit inputs, lone high and
  low surrogates, a valid surrogate pair, capacity-before-surrogate order,
  cross-field validation order, and SCHEMA cases (missing, extra,
  mistyped, undefined, null, array, throwing getter).
- **Invariants:** every accepted end ≤ budget; removing the cap never
  shortens a delay.
- **Controller (13 tests):** the 3 controller fixtures verbatim
  (`state-dirty-error`, `state-cancel-late`, `state-replace-late`) driven by
  a fake worker with controllable completion, plus edit-during-busy,
  run-while-busy replacement, cancel no-op, worker onerror →
  WORKER_ERROR, createWorker throw → WORKER_ERROR, loadExample,
  reset-from-success, edit-from-empty/error transitions.
- **Report (4 tests):** canonical compact JSON for bounded-exponential and
  exact-budget (exact strings written by hand), insertion-order
  independence, and OUTPUT_LIMIT for a 40,000-attempt synthetic result.

## Recorded interpretations

- Validation order is field-major (per field: EMPTY / INPUT_LIMIT, then
  UNICODE, then INTEGER_FORMAT, then RANGE) in the SPEC's field order; see
  HANDOFF.md.
- Candidate pages carry no canonical/hreflang, per the SPEC's candidate
  rules (the generic brief template asks for them; the SPEC wins).
- Build output is `dist-preview/` per the SPEC's test gate.

## Spec errata

None. All 7 literal core fixtures and all 3 controller fixtures reproduce
exactly from the SPEC's own rules; no printed fixture contradicts its rule.

## NOT_RUN

- Real-browser rendering/interaction, including the actual module-Worker +
  Blob download flow, keyboard walk-through, 320 px / 200% zoom / reduced
  motion, and the SPEC's isolated Chrome + Edge gate.
- Real devices/touch, assistive tech, measured contrast of the tool's own UI.
- Network/Storage zero-request audit in a clean isolated profile.
- Deployment, and the independent nine-aspect review (pending by design in
  build-first mode).

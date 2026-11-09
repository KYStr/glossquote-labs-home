# Verification — Ring Size Converter (build-first candidate)

Environment: Node v24.22.1, Linux, no dependencies installed
(zero-dependency tool). All commands run in `tools/ring-size-converter/`.
Sources: fixed spec candidate `6947befa921090dbd0ac3304666df5da896b2f81`
(spec task `labs-ring-size-converter-spec-20261109`, draft spec PR #163);
implementation base `codex/initial-publication` @
`c08e3243f0257f80fa512d15b1c37fcbeb6ef962`. The spec fixtures are
vendored verbatim at `test/fixtures.json` (SHA-256
`40bdf6bcf933235dd7fdc7781bc381a99fe231b952701023344ea902b4ce419f`,
byte-identical to the spec candidate's file) because the spec PR is not
merged into the base branch.

## Pre-implementation check

Before any product code existed, all 14 literal core fixtures were
recomputed with an independent Python implementation of the SPEC's stated
rules (integer hundredths, the JIS diameter definition, the fixed table,
midpoint-takes-larger, the 0.30 mm tolerance) — all 14 matched exactly,
including the midpoint tie and the Δ = 0.30 boundary. The same scratch
implementation produced the expected values for the extra endpoint cases
used in `test/core.test.mjs` (diameter 12.8 / 22.2, JP 1 / 28, and the
52.20 / 52.21 pair that separates fit "exact" from "between" while the
displayed delta stays "0.3").

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 43 tests, 0 fail |
| `npm run check` | PASS — files, package contract, core fields/sources/limits/defaults/table/example, pinned strings, pages, syntax, worker concatenation, capability scan, core purity |
| `npm run build:preview` (run twice) | PASS — byte-identical: `BUILD-MANIFEST.json` unchanged between runs (diff clean) |
| `npm run check:generated:preview` | PASS — 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes |
| Loopback probe (`node scripts/serve.mjs --host 127.0.0.1 --port 49399 --dir dist-preview`) | PASS — see below |
| Embedded worker source executed in Node with a fake `self` | PASS — see below |

### npm test breakdown (43)

- `test/core.test.mjs` (25): the 14 literal core fixtures from
  fixtures.json, deep-equal against the product's `run` (exact row,
  diameter input, between sizes, EU/US/JP/UK inputs, midpoint tie,
  min/max boundaries, RANGE/STEP/EMPTY/ENUM errors); legal endpoints for
  all six sources; independently computed endpoint results for diameter
  12.8 / 22.2 and JP 1 / 28; table-row sources US 3 and UK M½ reproduce
  their rows exactly; the fit boundary pair 52.20 (Δ = 0.30, exact) vs
  52.21 (Δ = 0.31, between, displayed delta still "0.3"); the same circH
  reached from EU and circumference sources gives identical results;
  just-outside RANGE cases for every window (39.9 / 70.1, 12.7 / 22.3,
  US 2.5 / 13.5, EU 39 / 71, JP 0 / 29); RANGE beating STEP for US;
  grammar classes per source family (including full-width digits, "07",
  whole-letter UK "F"); capacity/surrogate/empty ordering (9-unit value
  is INPUT_LIMIT, 8-unit value reaches the grammar check, lone surrogates
  are UNICODE, empty is EMPTY even for the UK enum); source UNICODE then
  ENUM, checked before the value; SCHEMA classes (null, array, string,
  missing/extra field, wrong types, and an accessor that is never read).
- `test/controller.test.mjs` (12): the 3 literal controller fixtures
  verbatim (state-dirty-error, state-cancel-late, state-replace-late) via
  a fake worker with controllable completion, checking states, drafts,
  errors, and `reportAvailable`; plus edit-during-busy termination and
  late-reply drop, run-while-busy replacement (the default empty draft
  then surfaces its EMPTY error), cancel no-op outside busy, worker
  error and createWorker throw → WORKER_ERROR, loadExample equals
  fixtures.json case 1 and runs to success, reset from success, and
  edit-from-empty / edit-from-error transitions.
- `test/report.test.mjs` (6): the circ-exact-row report as a hand-written
  canonical literal, byte-identical whether serialized from the run
  result or from the fixture's literal result object; null JP and nested
  adjacent-row serialization; insertion-order independence; an oversized
  result is OUTPUT_LIMIT with no text.

### Loopback probe

Served `dist-preview/` on 127.0.0.1:49399 (ephemeral, loopback only):

- `GET /` → 200, `<title>戒圍換算｜Gloss Tools</title>`, pinned CSP,
  nosniff, and `X-Robots-Tag: noindex, nofollow` headers present
- `GET /en/` → 200, `<title>Ring Size Converter | Gloss Tools</title>`
- `GET /js/app.js`, `GET /js/worker-source.js`, `GET /styles/app.css` → 200
- `GET /nope.html` → 404; `GET /../../package.json` (path-as-is
  traversal) → 404; `HEAD /` → 200

### Embedded worker source (Node harness)

Imported `WORKER_SOURCE` from the built `dist-preview/js/worker-source.js`,
wrote it to a temp module, installed a fake `self`, and invoked the
handler: the `circ-exact-row` snapshot returned generation 7 with the
fixture's exact result, and the `err-step` snapshot returned the pinned
STEP error. This exercises the exact bytes the page turns into a module
Worker; it does not replace a real browser Worker check (still NOT_RUN
below).

## Build manifest (preview)

`BUILD-MANIFEST.json` — 9 files. SHA-256 highlights:

- `index.html` — `9d7ef1f30de8f3b103fb099333a3e8d4c7f7c7cf1aae2cf52f45d20f5d0cdbb2`
- `en/index.html` — `1f2992a77d67f8540b0d75ccbadcf5ae1924fa80bb135245d8a927249d583aad`
- `js/core/ring.mjs` — `521bf41246e1311fe49812db13f5921bc9124019cfd7db937d10955b36d8dc37`
- `js/worker-source.js` — `4f7d81790eac5a2d35826db7109960b1b5f3e77e3d929e1e9b0c880cbc94972f`
- `styles/app.css` — `36f7246308658d893c123be2fe427d709a4b16702d77e5253150591cca2a3422`

## Spec-errata candidates

1. **Source-field capacity (minor, interpretation)**: the SPEC's shared
   sentence "raw 每欄最多 8 單元（UTF-16 code units）" is stated for every
   field, but the `source` field's valid value `circumference` is 13
   units, and the SPEC's pinned default `{"source":"circumference",…}`
   plus its first fixture require that value to pass. An 8-unit
   INPUT_LIMIT on `source` would make the primary flow impossible, so the
   capacity is applied to `value` only and `source` is checked
   UNICODE → ENUM (the order the SPEC lists for it, minus the impossible
   capacity). No literal fixture is affected. Same reading as the run's
   earlier protein-intake / macro-split capacity notes.

No fixture-vs-rule conflicts were found: every literal fixture reproduces
from the SPEC's stated rules.

## NOT_RUN (explicit)

- Real-browser (Chrome/Edge) rendering and interaction in both languages,
  including the live module Worker created from a Blob URL, keyboard-only
  flow, focus movement on error, 320 px reflow, real 200% zoom, reduced
  motion, and touch targets — no isolated browser mechanism was used.
- Measured contrast ratios and assistive-technology checks.
- Network/Storage observation in a real browser profile (zero-request,
  storage, cookie, service-worker checks).
- Real-device checks.
- Production build (`--mode production` is refused: no approved origin),
  deployment, catalog integration, and the independent nine-aspect review
  (pending by design in build-first mode; all nine aspects remain
  null / NOT_RUN).

## Next owner

Independent reviewer, after the parent verifies the PR head.

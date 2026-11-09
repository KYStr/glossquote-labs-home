# Cooking Measurement Converter — verification record

Environment: Node v24.22.1, Linux, zero dependencies. All commands run
in `tools/cooking-measurement-converter/`.

## Fixed inputs

- Spec candidate `213af9991a1a2d0a07f9acfe3e173d57184d9dec`
  (`spec-cooking-measurement-converter-20261109`, draft PR #222).
- Vendored `test/fixtures.json` is byte-identical to the spec
  candidate's `docs/specs/cooking-measurement-converter/fixtures.json`:
  SHA-256 `aa3b8c01832ab1b39bc1790d8f16bff64d0e98c9b432c9718783992e1b4b9d79`
  (verified against the spec workdir copy before building).
- Before implementation, all 14 successful core fixtures were
  reproduced with an independent exact-rational (Python `Fraction`)
  scratch calculation from the SPEC's stated rules; all matched. The
  extra boundary literals in `test/core.test.mjs` (fraction
  constructions 0 / 1/8 / reduced 2/8→1/4 / carry-to-whole, the
  100000.01 and 100001 range probes, the density rows not covered by
  fixtures) were derived with the same independent scratch calculation.

## Commands and results

- `npm test` — **58/58 pass, 0 fail** (Node v24.22.1). The suite
  deep-compares the literal core fixtures (18 of 19 verbatim; the
  `err-unit-enum` case is asserted with the corrected expectation per
  the erratum below) and all 3 controller fixtures against
  `test/fixtures.json`, plus hand-derived boundary/validation cases
  (legal maximum 100000 vs 100000.01/100001 → RANGE, grammar rejects
  `.5`/`5.`/`1e3`, case-sensitive enums, per-field capacity including
  the 32-unit ingredient boundary, schema accessor rejection, unpaired
  surrogates, field-order precedence), direct conversions for every
  density-table row, the fraction constructions (0, 1/8, reduced
  2/8→1/4, carry-to-whole, mixed numbers via the fixtures), the
  report-serialization cases with hand-written expected bytes and
  SHA-256, static HTML checks, and build/serve probes.
- `npm run check` — passed: files, package contract, core
  fields/limits/basis/defaults/example/density table, the SPEC-pinned
  bilingual error and status strings in the app, bilingual page
  metadata, id parity, the static density table and FAQ, syntax of
  every shipped script, worker concatenation parses, forbidden-
  capability scan, core purity.
- `npm run build:preview` run twice (inside `test/build.test.mjs`) —
  the two `dist-preview/` trees (9 files) and `BUILD-MANIFEST.json`
  compared by SHA-256: byte-identical.
- `npm run check:generated:preview` — passed: manifest hashes exact,
  bilingual preview metadata present, embedded worker source equals
  the fixed core + handler bytes, robots.txt denies all.
- Loopback HTTP probe — `node scripts/serve.mjs --host 127.0.0.1
  --port 49331 --dir dist-preview`: `GET /` → 200 with title
  「料理單位換算｜Gloss Tools」; `GET /en/` → 200 with title
  "Cooking Measurement Converter | Gloss Tools"; HTML responses carry
  the pinned CSP (`worker-src blob:`, `connect-src 'none'`, …),
  `X-Robots-Tag: noindex, nofollow`, and
  `X-Content-Type-Options: nosniff`; `GET /js/worker-source.js` → 200;
  a missing path returns 404 and a `../package.json` traversal attempt
  returns 404.

## NOT_RUN (explicit)

- Real-browser checks (Chrome/Edge, both languages): example load,
  typed input, error focus, edit-after-success revocation, cancel,
  reset, Blob download byte comparison, 1280×800 and 320 CSS px
  layouts, real 200% zoom, reduced motion, keyboard order, contrast
  measurement.
- Real-device checks (physical phone/tablet).
- Network/Storage observation in a clean isolated browser profile
  (zero work requests, storage/cookie/service-worker inspection,
  offline computation after load).
- Production build and formal HTTPS/SEO gate: refused by design — no
  production origin is approved for this tool; the candidate carries
  noindex and no canonical/hreflang, per the SPEC.
- Native OS file/download dialogs (manual only).

## Spec errata candidates

One (see HANDOFF.md for the full record): fixture `err-unit-enum`
expects ENUM for `fromUnit: "liter"`, but "liter" is 5 UTF-16 code
units and exceeds the SPEC's own 4-unit capacity for `fromUnit`; with
the SPEC's pinned per-field order (INPUT_LIMIT before ENUM) the
outcome is INPUT_LIMIT/fromUnit and the fixture's expected value is
unreachable. The implementation follows the normative rule. Every
other fixture expected value was reproduced from the SPEC's stated
rules (pinned FDA household basis, single-source King Arthur density
table, exact rational pipeline, fraction from the unrounded value)
without exception, including the discriminating half-up case
`tbsp-sugar-to-grams` (12.375 → 12.38) and the boundary case
`max-amount-boundary` (100000 ml = 416.67, fraction 416 5/8).

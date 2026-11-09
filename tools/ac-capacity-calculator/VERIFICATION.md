# AC Capacity Calculator — verification record

Environment: Node v24.22.1, Linux, zero dependencies. All commands run in
`tools/ac-capacity-calculator/`.

## Fixed inputs

- Spec candidate `a83a0b9ca975c43a3d7426e138720c2485901b8c`
  (`spec-ac-capacity-calculator-20261109`, draft PR #154).
- Vendored `test/fixtures.json` is byte-identical to the spec candidate's
  `docs/specs/ac-capacity-calculator/fixtures.json`:
  SHA-256 `9a670886fc37fbad5fe17e3737d2123361e6858572d648e9824cd1ab595a9c86`
  (verified against the spec workdir copy before building).
- Before implementation, all six successful core fixtures were reproduced
  with an independent exact-rational (Python `Fraction`) scratch
  calculation from the SPEC's stated rules; all matched. The extra
  boundary literals in `test/core.test.mjs` (legal maxima/minima, exact
  10.0 kW, just over 10.0 kW, +129% additive cap case) were derived with
  the same independent scratch calculation.

## Commands and results

- `npm test` — **37/37 pass, 0 fail** (Node v24.22.1). The suite deep-compares all 9 literal core fixtures and all 3
  controller fixtures against `test/fixtures.json`, plus hand-derived
  boundary/validation/property cases (legal endpoints 300 ping /
  1000 m² / 30 occupants, just-over-limit values, INPUT_LIMIT before
  grammar, field-order precedence, schema accessor rejection, additive
  (never compounded) adjustments, occupants ≤2 never subtracting, exact
  kW exactly 10.0 vs just above, monotonicity under adjustment removal)
  and the report-serialization cases.
- `npm run check` — passed: files, package contract, core
  fields/limits/defaults/model-size table/example, the SPEC-pinned
  bilingual strings in the app and pages (including the tonnage note and
  the over-range note verbatim), syntax of every shipped script, worker
  concatenation parses, forbidden-capability scan, core purity.
- `npm run build:preview` run twice — the two `dist-preview/` trees
  (9 files) and `BUILD-MANIFEST.json` compared by SHA-256:
  byte-identical.
- `npm run check:generated:preview` — passed: manifest hashes exact,
  bilingual preview metadata present, embedded worker source equals the
  fixed core + handler bytes, robots.txt denies all.
- Loopback HTTP probe — `node scripts/serve.mjs --host 127.0.0.1
  --port 49321 --dir dist-preview`: `GET /` → 200 with title
  「冷氣噸數計算機｜Gloss Tools」; `GET /en/` → 200 with title
  "AC Capacity Calculator | Gloss Tools"; HTML responses carry the pinned
  CSP (`worker-src 'blob:'`, `connect-src 'none'`, …), `X-Robots-Tag:
  noindex, nofollow`, and `X-Content-Type-Options: nosniff`; a missing
  path returns 404 and a `../package.json` traversal attempt returns 404;
  `GET /js/worker-source.js` → 200.

## NOT_RUN (explicit)

- Real-browser checks (Chrome/Edge, both languages): example load, typed
  input, switch toggling, error focus, edit-after-success revocation,
  cancel, reset, Blob download byte comparison, 1280×800 and 320 CSS px
  layouts, real 200% zoom, reduced motion, keyboard order, contrast
  measurement.
- Real-device checks (physical phone/tablet).
- Network/Storage observation in a clean isolated browser profile
  (zero work requests, storage/cookie/service-worker inspection, offline
  computation after load).
- Production build and formal HTTPS/SEO gate: refused by design — no
  production origin is approved for this tool; the candidate carries
  noindex and no canonical/hreflang, per the SPEC.
- Native OS file/download dialogs (manual only).

## Spec errata candidates

None. Every fixture expected value was reproduced from the SPEC's stated
rules (exact rational pipeline, additive adjustments, exact-kW model
comparison, pinned 860 kcal/h per kW divisor and 2,500 kcal/h retail
tonnage rule) without exception, including the `exact-vs-rounded-model`
case where the displayed kW (2.80) and the recommended size (3.6)
deliberately diverge.

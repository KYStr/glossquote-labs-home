# Race Time Predictor — verification record

Environment: Node v24.22.1, Linux, zero dependencies. All commands run
in `tools/race-time-predictor/`.

## Fixed inputs

- Spec candidate `304df4065f31ee63cefb2f22b388b8865a5ec947`
  (`spec-race-time-predictor-20261109`, draft PR #231).
- Vendored `test/fixtures.json` is byte-identical to the spec candidate's
  `docs/specs/race-time-predictor/fixtures.json`:
  SHA-256 `ea577f62bcc21bb2453b73566bfd469fa85a4ab8f28ce27d95fdacf996414eed`
  (verified against the spec workdir copy before building).
- Before any product code existed, the SPEC's pinned computation order
  (ratio → `Math.pow(ratio, 1.06)` → × T1 → the two pinned roundings)
  was reproduced with a scratch script against all 7 successful core
  fixtures — every value matched exactly.

## Commands and results

- `npm test` — **44/44 pass, 0 fail** (Node v24.22.1): the 15 literal
  core fixtures and 3 controller fixtures deep-compared against
  `test/fixtures.json`, plus hand-derived boundary/validation/property
  cases (legal endpoints
  42,195 m and 359,999 s, just-over RANGE cases, component-60 RANGE in
  both time shapes, INPUT_LIMIT before ENUM, an inactive custom field
  ignored even when it holds a lone surrogate, schema accessor
  rejection, field-order precedence, monotonicity of predictions, the
  known row equalling the input) and the report-serialization cases.
- `npm run check` — passed: files, package contract, core
  fields/limits/defaults/presets/exponent/example, the pinned bilingual
  strings in the app and pages (including the SPEC's estimate disclaimer
  and FAQ), syntax of every shipped script, worker concatenation parses,
  forbidden-capability scan, core purity.
- `npm run build:preview` run twice — the two `dist-preview/` trees
  (9 files) and `BUILD-MANIFEST.json` compared by SHA-256:
  byte-identical.
- `npm run check:generated:preview` — passed: manifest hashes exact,
  bilingual preview metadata present, embedded worker source equals the
  fixed core + handler bytes, robots.txt denies all.
- Loopback HTTP probe — `node scripts/serve.mjs --host 127.0.0.1
  --port 49331 --dir dist-preview`: `GET /` → 200 with title
  「完賽時間預測｜Gloss Tools」; `GET /en/` → 200 with title
  "Race Time Predictor | Gloss Tools"; HTML responses carry the pinned
  CSP (`worker-src 'blob:'`, `connect-src 'none'`, …), `X-Robots-Tag:
  noindex, nofollow`, and `X-Content-Type-Options: nosniff`; a missing
  path returns 404 and a `../package.json` traversal attempt returns
  404; `GET /js/worker-source.js` → 200.

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

None. Every fixture expected value was reproduced from the SPEC's
stated rules (the pinned FLOAT64 operation order and the field
validation order) without exception.

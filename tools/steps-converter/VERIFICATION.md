# Steps Converter — verification record

Environment: Node v24.22.1, Linux, zero dependencies. All commands run
in `tools/steps-converter/`.

## Fixed inputs

- Spec candidate `70dce9d009d060b386f27db533a9097f9bd9c299`
  (`spec-steps-converter-20261109`, draft PR #234).
- Vendored `test/fixtures.json` is byte-identical to the spec candidate's
  `docs/specs/steps-converter/fixtures.json`:
  SHA-256 `acb9493ca78ea7d528f9079c233aed61b670ec6a31ca246d8cc63bd89ee9d84b`
  (verified against the spec workdir copy before building).
- Before any product code was relied on, the SPEC's pinned computation
  (exact rational arithmetic: stride 207/500, distance steps × stride /
  100,000, calories 3/4 × weight × unrounded distance, half-up rounding
  once per output) was reproduced with an independent BigInt
  implementation in `test/core.test.mjs` against all 10 successful core
  fixtures — every value matched exactly.

## Commands and results

- `npm test` — **48/48 pass, 0 fail** (Node v24.22.1): the 19 literal
  core fixtures and 3 controller fixtures deep-compared against
  `test/fixtures.json`, plus hand-derived boundary/validation/property
  cases (legal endpoints steps 0/99,999,999, stride 20/150, height
  80/250, weight 20/500; just-over RANGE cases; a 9-digit step count
  as INPUT_LIMIT; integer/decimal grammar; EMPTY before ENUM; inactive
  fields ignored except INPUT_LIMIT/UNICODE, including a lone
  surrogate in an inactive field; schema accessor rejection;
  field-order precedence; distance/calorie monotonicity; the
  stepsPerKm × exact-stride invariant; the pinned report bytes and
  SHA-256 for the height-basic result).
- `npm run check` — passed: files, package contract, core
  fields/limits/defaults/factors/example, the pinned bilingual
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
  --port 49332 --dir dist-preview`: `GET /` → 200 with title
  「步數換算｜Gloss Tools」; `GET /en/` → 200 with title
  "Steps Converter | Gloss Tools"; HTML responses carry the pinned
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
stated rules (the pinned exact-rational computation and the field
validation order) without exception.

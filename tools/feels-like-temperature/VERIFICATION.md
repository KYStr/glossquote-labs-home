# Feels-Like Temperature Calculator — verification record

Environment: Node v24.22.1, Linux, zero dependencies. All commands run in
`tools/feels-like-temperature/`.

## Fixed inputs

- Spec candidate `0b6ec5c684ba0370dec57f7a17712f3b57a09a56`
  (`spec-feels-like-temperature-20261109`, draft PR #229).
- Vendored `test/fixtures.json` is byte-identical to the spec candidate's
  `docs/specs/feels-like-temperature/fixtures.json`:
  SHA-256 `743c8e0d6e349ea192c6165aa0bcc96a55e0cb527778aca3c89815f9db8580ad`
  (verified against the spec workdir copy before building).
- Before any product code was written, all 13 successful core fixtures
  were reproduced with an independent Python implementation of the SPEC's
  pinned formulas and rounding (13/13 exact matches on model, feelsLikeC
  and deltaC), and the extra hand-derived expectations used in
  `test/core.test.mjs` (wind 4.9 km/h boundary, −60 °C / 300 km/h
  extremes, RH 85 vs 86 adjustment continuity, RH 100 at 30 °C) were taken
  from that same independent implementation.

## Commands and results

- `npm test` — **45/45 pass, 0 fail** (Node v24.22.1): all 16 literal core
  fixtures and 3 controller fixtures deep-compared against
  `test/fixtures.json`, plus hand-derived boundary/validation cases
  (schema accessor rejection, INPUT_LIMIT before grammar, domain
  boundaries 4.8/4.9 and 10.0/10.1, RH 85/86 adjustment continuity, legal
  extremes −60 °C / 300 km/h / RH 0 and 100), the two SPEC invariants
  (wind-chill results always below the air temperature; actual results
  always deltaC 0), display formatting, and the report-serialization
  cases.
- `npm run check` — **passed**: files, package contract, core
  fields/limits/defaults/example, the pinned bilingual strings in the app
  and pages, syntax of every shipped script, worker concatenation parses,
  forbidden-capability scan, core purity.
- `npm run build:preview` run twice — the two `dist-preview/` trees
  (9 files) and `BUILD-MANIFEST.json` compared by SHA-256:
  **byte-identical**.
- `npm run check:generated:preview` — **passed**: manifest hashes exact,
  bilingual preview metadata present, embedded worker source equals the
  fixed core + handler bytes, robots.txt denies all.
- Loopback HTTP probe — `node scripts/serve.mjs --host 127.0.0.1
  --port 49317 --dir dist-preview`: `GET /` → 200 with title
  「體感溫度計算｜Gloss Tools」; `GET /en/` → 200 with title
  "Feels-Like Temperature Calculator | Gloss Tools"; HTML responses carry
  the pinned CSP (`worker-src 'blob:'`, `connect-src 'none'`, …),
  `X-Robots-Tag: noindex, nofollow`, and `X-Content-Type-Options:
  nosniff`; a missing path returns 404 and a `../package.json` traversal
  attempt returns 404; `GET /js/worker-source.js` → 200.

## NOT_RUN (explicit)

- Real-browser checks (Chrome/Edge, both languages): example load, typed
  input, error focus, edit-after-success revocation, cancel, reset, Blob
  download byte comparison, 1280×800 and 320 CSS px layouts, real 200%
  zoom, reduced motion, keyboard order, contrast measurement.
- Real-device checks (physical phone/tablet).
- Network/Storage observation in a clean isolated browser profile
  (zero work requests, storage/cookie/service-worker inspection, offline
  computation after load).
- Production build and formal HTTPS/SEO gate: refused by design — no
  production origin is approved for this tool; the candidate carries
  noindex and no canonical/hreflang, per the SPEC.
- Native OS file/download dialogs (manual only).

## Spec errata candidates

None. Every fixture expected value follows from the SPEC's stated rules
(domains and boundary semantics, pinned formula order and rounding) as
implemented; the independent pre-implementation recomputation agreed on
all 13 successful cases.

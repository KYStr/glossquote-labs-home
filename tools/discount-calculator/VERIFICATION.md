# Discount Calculator — verification record

Environment: Node v24.22.1, Linux, zero dependencies. All commands run in
`tools/discount-calculator/`.

## Fixed inputs

- Spec candidate `0f2c7e279dce435552069dc8d92376ac36bb023d`
  (`spec-discount-calculator-20261109`, draft PR #135).
- Vendored `test/fixtures.json` is byte-identical to the spec candidate's
  `docs/specs/discount-calculator/fixtures.json`:
  SHA-256 `96311db39ba2ec05a2d0a373cd519c87f87e347a87feb6aa45efc4d98fe67431`
  (verified against the spec workdir copy before building).

## Commands and results

- `npm test` — **38/38 pass, 0 fail** (Node v24.22.1): the 7 literal core
  fixtures and 3 controller fixtures deep-compared against
  `test/fixtures.json`, plus hand-derived boundary/validation/property
  cases (schema accessor rejection, INPUT_LIMIT before grammar, half-up
  at exact .5 boundaries, coupon equal to the discounted price, maximum
  price × quantity 999 exactness) and the report-serialization cases.
- `npm run check` — **passed**: files, package contract, core
  fields/limits/defaults/example, the SPEC-pinned bilingual strings in
  the app and pages, syntax of every shipped script, worker
  concatenation parses, forbidden-capability scan, core purity.
- `npm run build:preview` run twice — the two `dist-preview/` trees
  (9 files) and `BUILD-MANIFEST.json` compared by SHA-256: **byte-identical**.
- `npm run check:generated:preview` — **passed**: manifest hashes exact,
  bilingual preview metadata present, embedded worker source equals the
  fixed core + handler bytes, robots.txt denies all.
- Loopback HTTP probe — `node scripts/serve.mjs --host 127.0.0.1
  --port 49217 --dir dist-preview`: `GET /` → 200 with title
  「折扣計算機｜Gloss Tools」; `GET /en/` → 200 with title
  "Discount Calculator | Gloss Tools"; HTML responses carry the pinned
  CSP (`worker-src 'blob:'`, `connect-src 'none'`, …), `X-Robots-Tag:
  noindex, nofollow`, and `X-Content-Type-Options: nosniff`; a missing
  path returns 404 and a `../package.json` traversal attempt returns 404;
  `GET /js/worker-source.js` → 200.

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

None. Every fixture expected value was reproduced from the SPEC's stated
rules (integer cents/basis points, per-step half-up) without exception.

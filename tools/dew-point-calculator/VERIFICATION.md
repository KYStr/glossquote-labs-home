# Dew Point Calculator — verification record

Environment: Node v24.22.1, Linux, zero dependencies. All commands run in
`tools/dew-point-calculator/`.

## Fixed inputs

- Spec candidate `8b89efbe8fdd9f62f7fbeb0d9a5290c0a8a3c462`
  (`spec-dew-point-calculator-20261109`, draft PR #230).
- Vendored `test/fixtures.json` is byte-identical to the spec candidate's
  `docs/specs/dew-point-calculator/fixtures.json`:
  SHA-256 `67da51701fa862a6729a3bdc186103668c5477a9b45d1669212fdd14d231e9c7`
  (verified against the spec workdir copy before building).
- Pre-build constant check: the SPEC-pinned Magnus constants
  (a = 17.27, b = 237.7) reproduce all 13 success fixtures; the alternate
  set a = 17.625 / b = 243.04 mentioned in the build brief fails two
  (`dry-winter`, `endpoint-hot-saturated`). See HANDOFF.md.

## Commands and results

- `npm test` — **46/46 pass, 0 fail** (Node v24.22.1): the 19 literal
  core fixtures and 3 controller fixtures deep-compared against
  `test/fixtures.json`, plus independently derived success cases
  (50-digit Decimal arithmetic on the pinned formula: leading zeros,
  RH = 100 at both temperature endpoints, near-saturation rounding to the
  temperature, sub-zero inputs), grammar/capacity/UNICODE/EMPTY/range
  boundaries, schema accessor rejection, validation-order precedence,
  the SPEC properties (dew point ≤ temperature with equality iff
  RH = 100; strict monotonicity in RH at fixed temperature), all twelve
  comfort-band boundary values from the SPEC's tests section, and the
  report-serialization cases (including 20.0 serializing as 20 and the
  OUTPUT_LIMIT case).
- `npm run check` — **passed**: files, package contract, core
  fields/limits/defaults/pinned constants/comfort bands/example, fixture
  counts (19 core + 3 controller), the bilingual error and flow-state
  strings in the app, the SPEC-pinned page titles/descriptions/FAQ/
  disclosure, syntax of every shipped script, worker concatenation
  parses, forbidden-capability scan, core purity.
- `npm run build:preview` run twice — the two `dist-preview/` trees
  (9 files) and `BUILD-MANIFEST.json` compared by SHA-256:
  **byte-identical**.
- `npm run check:generated:preview` — **passed**: manifest hashes exact,
  bilingual preview metadata present, embedded worker source equals the
  fixed core + handler bytes, robots.txt denies all.
- Loopback HTTP probe — `node scripts/serve.mjs --host 127.0.0.1
  --port 49231 --dir dist-preview`: `GET /` → 200 with title
  「露點計算機｜Gloss Tools」; `GET /en/` → 200 with title
  "Dew Point Calculator | Gloss Tools"; HTML responses carry the pinned
  CSP (`worker-src blob:`, `connect-src 'none'`, …), `X-Robots-Tag:
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

None in the SPEC itself. One brief-level discrepancy was resolved in
favour of the SPEC (Magnus constants, see HANDOFF.md); the SPEC's own
rules and fixtures are mutually consistent as implemented.

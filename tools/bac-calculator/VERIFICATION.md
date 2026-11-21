# BAC Calculator — verification record

Environment: Node v24.22.1, Linux, zero dependencies. All commands run in
`tools/bac-calculator/`.

## Fixed inputs

- Spec candidate `8029a6d35ca8e3bd61beac4fd31e66be2e94b72d`
  (`spec-bac-calculator-20261109`, draft PR #235).
- Vendored `test/fixtures.json` is byte-identical to the spec candidate's
  `docs/specs/bac-calculator/fixtures.json`:
  SHA-256 `8f2308ef66a041d3c4017742bfb548e41eaf139a4be7ff7582c3edca945d1227`
  (verified against the spec workdir copy before building).

- Production base: `codex/initial-publication` at
  `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a` (FETCH_HEAD when the
  production branch was created, 2026-11-09).

## Commands and results

- `npm test` — **47/47 pass, 0 fail** (Node v24.22.1): the 13 literal
  core fixtures and 3 controller fixtures deep-compared against
  `test/fixtures.json`, plus hand-derived boundary/validation/property
  cases (schema accessor rejection and bad row shapes, INPUT_LIMIT
  before grammar, decimal/integer grammar, lone surrogates, fixed
  validation order, legal maximums 500 kg / 5000 ml at 100% / 1440 min /
  12 rows and minimums 20 kg / 1 ml at 0.1% / 0 min, ABV > 0, exact
  band boundaries B = 0.300 administrative and B = 0.500 criminal, an
  exact half-up tie at 39.45 g, per-fixture invariants bacGL ≤
  peakBacGL, bacGL non-increasing with elapsed time, minutes whole and
  ordered) and the report-serialization cases. Every hand-derived
  expected value was also recomputed independently with Python
  `fractions.Fraction` before the tests were run; all agreed.
- `npm run check` — **passed**: files, package contract, core
  fields/limits/defaults/example, the pinned bilingual strings in the
  app and pages, the pinned disclaimer, band wording and FAQ in both
  languages, absence of the non-existent 0.4 mg/L threshold, syntax of
  every shipped script, worker concatenation parses,
  forbidden-capability scan, core purity.
- `npm run build:preview` run twice — the two `dist-preview/` trees
  (9 files) and `BUILD-MANIFEST.json` compared by SHA-256:
  **byte-identical**.
- `npm run check:generated:preview` — **passed**: manifest hashes exact,
  bilingual preview metadata present, embedded worker source equals the
  fixed core + handler bytes, robots.txt denies all.
- Loopback HTTP probe — `node scripts/serve.mjs --host 127.0.0.1
  --port 49317 --dir dist-preview`: `GET /` → 200 with title
  「酒精濃度估算｜Gloss Tools」; `GET /en/` → 200 with title
  "BAC Calculator | Gloss Tools"; HTML responses carry the pinned
  CSP (`worker-src 'blob:'`, `connect-src 'none'`, …), `X-Robots-Tag:
  noindex, nofollow`, and `X-Content-Type-Options: nosniff`; a missing
  path returns 404 and a `../package.json` traversal attempt returns
  404; `GET /js/worker-source.js` → 200.

## NOT_RUN (explicit)

- Real-browser checks (Chrome/Edge, both languages): example load, typed
  input, drink-row add/remove, error focus, edit-after-success revocation,
  cancel, reset, Blob download byte comparison, 1280×800 and 320 CSS px
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

None found. Every fixture expected value was reproduced from the SPEC's
stated rules (exact rational Widmark arithmetic, per-step single half-up
rounding, band and minutes from the unrounded value) without exception,
and the AUTHOR-CHECK correction (only two Taiwan thresholds; the
concept note's 0.4 mg/L does not exist in current law) is honoured
throughout the product.

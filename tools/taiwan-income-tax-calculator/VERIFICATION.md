# VERIFICATION — Taiwan Income Tax Calculator

Environment: Node v24.22.1, Linux VM, 2026-11-09. All commands run in
`tools/taiwan-income-tax-calculator/`.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test test/*.test.mjs`) | PASS — 36 tests, 36 pass, 0 fail |
| `npm run check` (`node scripts/check.mjs`) | PASS — all static checks passed |
| `npm run build:preview` (run twice) | PASS — 8 files; SHA-256 lists of both runs identical (byte-identical) |
| `npm run check:generated:preview` | PASS — dist-preview matches a fresh build (8 files) |
| Loopback HTTP probe (`scripts/serve.mjs --port 0`) | PASS — `GET /` 200 `text/html` with title「綜合所得稅試算｜Gloss Tools」and `lang="zh-Hant"`; `GET /en/` 200 with title "Taiwan Income Tax Calculator \| Gloss Tools" and `lang="en"`; `GET /js/app.js` 200 |

The test suite additionally covers, inside `test/serve.test.mjs`, HEAD,
404, path traversal refusal (`/..%2f..%2fpackage.json` → 404) and POST → 405
against the real built preview.

## Test inventory (36)

- Core: all 12 literal SPEC fixtures (deep equality on the whole return
  value), plus upper limits (salary 99,999,999; 20 + 20 dependents),
  INPUT_LIMIT on a 9-digit salary, EMPTY, INTEGER_FORMAT variants (leading
  zeros, sign, spaces, full-width digits, exponent, negative), SCHEMA for
  unknown/missing/wrongly-typed fields and accessor properties, non-object
  inputs, ENUM_VALUE, married spouse-flag rules, a lone-surrogate string,
  bracket continuity at 590,000 / 590,001, and pinned first-error ordering.
- Controller: the 3 literal SPEC state fixtures (state-dirty-error,
  state-cancel-late, state-replace-late) against a fake worker with
  test-controlled delivery, plus worker-factory failure (WORKER_ERROR) and
  foreign-generation message rejection.
- Report: literal expected bytes for the first fixture's result (written
  from the SPEC serialization rules, with matching SHA-256), recursive key
  sorting, OUTPUT_LIMIT above 2 MiB, and no `toJSON` invocation.
- Build: two builds byte-identical, exact 8-file allowlist, preview noindex
  present, no canonical, worker bundle embedded in `js/app.js`, production
  mode refused.

## Spec errata candidates

None. Every fixture expectation agrees with the SPEC's stated rules; the
113 income-year table (including the corrected progressive differences
0 / 41,300 / 147,700 / 413,700 / 911,700) reproduces all fixtures exactly.

## NOT_RUN (explicit)

- Real-browser evidence: isolated Chrome and Edge, both language pages —
  example load, typed input, error, edit-after-success, cancel, reset,
  Blob download byte comparison. NOT_RUN (no isolated browser mechanism in
  this build environment; Node/DOM tests are not a substitute claim).
- Real-device / mobile checks, real 200% zoom, reduced-motion rendering,
  screen-reader pass, contrast measurement on rendered pages. NOT_RUN.
- Network/Storage isolation audit in a clean browser profile (requests,
  local/sessionStorage, IndexedDB, Cache Storage, cookies, service
  worker). NOT_RUN in a real browser; by construction the product code
  contains no fetch/XHR/WebSocket/beacon/storage calls, which
  `scripts/check.mjs` enforces statically.
- Production HTTPS deployment, canonical/hreflang/sitemap, origin
  configuration. NOT_RUN — out of scope for the preview candidate; the
  build refuses production mode until an origin is approved.
- Independent nine-aspect acceptance review. NOT_RUN — that is the
  reviewer's step, not the builder's.

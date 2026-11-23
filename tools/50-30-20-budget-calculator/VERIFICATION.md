# Verification — 50-30-20 Budget Calculator (build-first candidate)

Environment: Node v24.22.1, Linux, no dependencies installed
(zero-dependency tool). All commands run in
`tools/50-30-20-budget-calculator/`. Sources: fixed spec candidate
`e0e721a03f2bb9b7fedb19002eb39a990fc5a3e7` (spec task
`labs-50-30-20-budget-calculator-spec-20261121`, draft spec PR #399,
registry rev 1837); implementation base `codex/initial-publication` @
`8c2652671012498891e7f7afe02fdca3f154aa64`. The spec fixtures are
vendored verbatim at `test/fixtures.json` because the spec PR is not
merged into the base branch (SHA-256
`043c90d1d1d3a07008c522c1cd1a4b9545cfd88b4f6abd840bdd720dfb3aae80`).

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 49 tests, 0 fail |
| `npm run check` | PASS — files, package contract, core ranges/defaults/example vs vendored fixtures, bilingual metadata incl. verbatim disclaimer and FAQ, syntax incl. worker concatenation, forbidden-capability scan, core purity |
| `npm run build:preview` (run twice) | PASS — byte-identical: `BUILD-MANIFEST.json` unchanged between runs (diff clean); SHA-256 `7c305247a27099adc324c0e54809f8e2964f405e37fa03d9fc6816dcfbdaf99f` |
| `npm run check:generated:preview` | PASS — manifest hashes exact, bilingual metadata present, worker source matches fixed bytes |
| Loopback probe (`node scripts/serve.mjs --host 127.0.0.1 --port 49382 --dir dist-preview`) | PASS — see below |
| Embedded worker source executed in Node with a fake `self` | PASS — see below |

### npm test breakdown (49)

- `test/core.test.mjs` (30): the 15 literal core fixtures from
  fixtures.json, deep-equal against the product's `run` (default split,
  odd-income −1 residual to needs, custom 33/33/34 +1 residual to
  savings, custom 60/25/15, custom 40/40/20 tie-break to needs,
  actuals on-track / over-needs / overspend, small income, partial
  actuals, max income, decimal income rejected, percent sum 105,
  zero income, pct 101); structural invariants over every success
  fixture (monthly amounts sum to income, yearly = monthly × 12,
  difference = actual − target, status by sign, totals identities);
  hand-derived cases computed independently before implementation
  (income 1; income 3 with −1 residual; 0/0/100 boundary; single
  actual with 100/0/0 split; actualPercent one-decimal rounding and
  half-up ties 0.125% → 0.1, 0.375% → 0.4); SCHEMA classes (null,
  array, missing, extra, wrong type, accessor); field order
  (income → pcts → actuals → PERCENT_SUM last, pinned by a test);
  per-field order (INPUT_LIMIT → EMPTY → INTEGER_FORMAT → RANGE);
  grammar rejects (decimals, signs, spaces, leading zeros, exponents,
  full-width digits); percent sums 99/101/0; boundary values (income
  1 and 100,000,000, pct 0/100, actual 0/100,000,000); lone
  surrogates; a 500-case deterministic invariant sweep.
- `test/controller.test.mjs` (12): the 3 literal controller fixtures
  verbatim (state-dirty-error, state-cancel-late, state-replace-late)
  via a fake worker with controllable completion, checking
  `reportAvailable` at every checkpoint, plus edit-during-busy,
  run-while-busy replacement, cancel no-op, worker error →
  WORKER_ERROR, createWorker throw → WORKER_ERROR, loadExample (fills
  fixture case 1, waits for manual run), reset from success, edit from
  empty/error, and a percentage edit revoking a result.
- `test/report.test.mjs` (5): the fixed download
  `50-30-20-budget-report.json` bytes match hand-written canonical
  literals for default-split and actuals-on-track (SHA-256 of the
  literal verified in-test), key-order independence, no `toJSON`
  invocation, and the 2,097,152-byte OUTPUT_LIMIT RangeError.
- `test/site.test.mjs` (2): both static pages carry the SPEC-pinned
  metadata and structure (language, title, description, h1, preview
  noindex, no canonical/hreflang, relative language links,
  same-language home links, the five pinned FAQ pairs, the verbatim
  disclaimer, the draft-loss note, section headings, all form control
  and error-slot ids, the download affordance).

### Loopback probe (port 49382)

- `GET /` 200 `text/html; charset=utf-8`; `GET /en/index.html` 200;
  `GET /js/app.js` 200 `text/javascript; charset=utf-8`;
  `GET /js/worker-source.js` 200.
- Headers on HTML: `Content-Security-Policy: default-src 'none';
  script-src 'self'; style-src 'self'; worker-src blob:; img-src
  'self'; connect-src 'none'; object-src 'none'; base-uri 'none';
  form-action 'none'; frame-ancestors 'none'`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=()`,
  `X-Robots-Tag: noindex, nofollow`.
- `GET /nope.html` 404; traversal `GET /../../package.json` 404;
  `HEAD /` 200.

### Embedded worker source

The exact `dist-preview/js/worker-source.js` bytes were executed in
Node with a fake `self`: all 15 core fixtures pass through it with
generation 7 echoed back, payloads deep-equal to the fixtures.

## NOT_RUN (for the independent reviewer on the same PR head)

- Real isolated Chrome and Edge: both languages, example entry, typed
  input, errors, success-then-edit, cancel, reset, Blob download byte
  check, 1280×800 and 320 CSS px reflow, real 200% zoom, reduced
  motion, keyboard flow, focus, contrast, touch targets.
- Network/Storage with a clean isolated profile: zero work requests
  from load through reset, storage/URL/console checks, offline
  calculation after assets load.
- Accessibility beyond static structure (WCAG 2.2 AA), and production
  HTTPS/SEO (no production origin is approved for this tool).
- No real-browser or OS-dialog evidence is claimed from the Node/DOM
  checks above.

## Known limitations

- Errata candidates: none (see HANDOFF.md). The `PERCENT_SUM`-last
  reading is pinned by a test rather than assumed.
- The preview build is `dist-preview/` + `BUILD-MANIFEST.json` only;
  no production build exists and none was attempted.

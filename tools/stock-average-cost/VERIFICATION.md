# Verification — Stock Average Cost Calculator

Environment: Linux, Node v24 (package engines `>=24`), no network access
used by any check. All commands run from `tools/stock-average-cost/`.

## Fixture provenance

`test/fixtures.json` is a verbatim copy of the fixtures in the fixed spec
candidate `879cad568897c5413f8e556311d5314c7b7e8a1b` (spec task
`labs-stock-average-cost-spec-20261109`, draft PR #140). The spec PR is not
merged into the production base, so the tests read the vendored copy.
Before the test files were written, the core was exercised once against
all 10 SPEC core fixtures with a throwaway deep-equal script: 10/10 matched.

## Commands and results

- `npm test` — **47/47 passed, 0 failed** (by file: core 19, controller 12,
  report 6, html 7, build 3).
  - `test/core.test.mjs`: all 10 vendored SPEC core fixtures deep-equal
    `run()` output; validation order and every error code exercised
    (SCHEMA envelope vs trade-shape row attribution, INPUT_LIMIT, UNICODE,
    EMPTY, INTEGER_FORMAT, DECIMAL_FORMAT, RANGE, ENUM, ROW_LIMIT,
    OVERSOLD); partial-relief exactness (repeated reliefs sum to the lot
    cost, final whole-lot relief settles exactly); maximum-size trade
    (999,999,999 shares @ 1,000,000.0000, 1000 bps) stays exact in BigInt
    beyond float53; input is not mutated.
  - `test/controller.test.mjs`: the 3 vendored SPEC controller fixtures
    (state-dirty-error, state-cancel-late, state-replace-late) plus
    edit-while-busy, worker error/factory failure → WORKER_ERROR,
    malformed message → INTERNAL, run supersession, download gating.
  - `test/report.test.mjs`: fixed filename, byte-equal match against an
    independent sorted-key serializer, UTF-16 key order, one trailing LF,
    no BOM, byte cap at exactly 2,097,152 (pass) / +1 (OUTPUT_LIMIT).
  - `test/html.test.mjs`: exact SPEC title/H1/description/FAQ strings in
    both languages, preview metadata + CSP, id parity, defaults.
  - `test/build.test.mjs`: build twice byte-identical, generated checks,
    static checks (all in subprocesses).
- `npm run check` — all static checks passed (package contract, required
  files, core purity, no forbidden sinks, HTML metadata/id parity, SPEC
  strings, i18n key parity).
- `npm run build:preview` run twice — **byte-identical output**;
  whole-tree SHA-256 of the sorted per-file hash list:
  `665c2ca952a4f443123df46b3cd023c0a54888d31b1ff527dfcbf680b488e23c`
  (8 files in `dist-preview/`).
- `npm run check:generated:preview` — passed (file set equals `public/`
  plus generated `js/worker-source.mjs`; embedded worker source equals
  core + handler bytes, SHA-256 `00d90df8f2b8aed5…`; preview metadata kept).
- Loopback HTTP probe (`scripts/serve.mjs` on 127.0.0.1, ephemeral port):
  `GET /` → 200, title 「股票平均成本計算機｜Gloss Tools」;
  `GET /en/` → 200, title “Stock Average Cost Calculator | Gloss Tools”;
  `GET /js/app.js` → 200; `GET /js/worker-source.mjs` → 200.

During test authoring, three test-side mistakes were caught and fixed
against the SPEC text (implementation unchanged): trade-shape SCHEMA
errors carry the trade's row (not null); the maximum-trade fee literal
was recomputed (99,999,999,900,000.0000); the FAQ assertions were aligned
to the SPEC's verbatim FAQ answers, which the pages already carried.

## NOT_RUN (not verified by the builder)

- Real-browser rendering and interaction (Chrome / Edge / Firefox /
  Safari), including Worker-from-Blob-URL execution in a real browser,
  keyboard-only operation of the row editor, and screen-reader behaviour.
- Real-device checks (touch targets, mobile layout) and 200% zoom /
  forced-colors / reduced-motion visual checks (the CSS honours
  `prefers-reduced-motion`, but this was not visually verified).
- Windows re-run of the test suite (the suite was run on Linux only).
- Independent review / acceptance: this build-first candidate still needs
  an independent reviewer against the fixed spec candidate; nothing here
  is accepted, merged, or published.

## Spec-errata candidates

None. All 10 core fixtures and all 3 controller fixtures agree with the
SPEC's stated rules (FIFO relief, round-half-up fee/relief/average,
validation order and error codes). Hand-derived boundary checks in
`test/core.test.mjs` (fee 1000 vs 1001 bps, price 0.0001 vs 0, 5th decimal
place, whole-lot relief exactness, maximum-size BigInt trade) also agree
with the rules as written.

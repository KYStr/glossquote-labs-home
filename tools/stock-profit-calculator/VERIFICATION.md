# Stock Profit Calculator — Verification

Candidate branch: `muse/stock-profit-calculator-production-20261109`
Base commit: `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
(`codex/initial-publication` at build time)
Spec source: PR #244, candidate commit
`5849c1ff1a6403e9261de07e0c4e7d506935629e`
Spec fixtures SHA-256:
`3eab7f7389355403a26547a2cfae6cd588924a11f664c6439e3f07642a5cfb95`
Environment: Node v24.22.1, no runtime dependencies, no browser.

## Commands run (all in `tools/stock-profit-calculator/`)

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 34 tests, 34 pass, 0 fail (13 fixture core cases verbatim, 13 controller tests incl. all 3 fixture cases, 5 report tests, plus hand-derived boundary/validation/rounding/breakeven plug-back tests) |
| `npm run check` | 0 | Pass |
| `npm run build:preview` (run 1) | 0 | 9 files written to `dist-preview/` with `BUILD-MANIFEST.json` |
| `npm run build:preview` (run 2) | 0 | 9 files; the two `BUILD-MANIFEST.json` files byte-identical (SHA-256 `8875924f8261e155de05be413b5226b062afbbca9840cc484f3d1acabeb34a1e`), which pins the per-file SHA-256 of both trees, so the two `dist-preview/` trees are byte-identical |
| `npm run check:generated:preview` | 0 | Generated preview verified: 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes; not production |

## Loopback HTTP probe

`node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview`
(loopback only), then `curl`:

| Path | Status |
| --- | --- |
| `/` | 200 (11,541 B) |
| `/en/` | 200 (12,152 B) |
| `/en/index.html` | 200 (12,152 B) |
| `/styles/stock-profit.css` | 200 (6,469 B) |
| `/js/app.js` | 200 (10,483 B) |
| `/js/controller.mjs` | 200 (7,130 B) |
| `/js/core/stock-profit.mjs` | 200 (18,683 B) |
| `/js/worker-handler.mjs` | 200 (937 B) |
| `/js/worker-source.js` | 200 (20,597 B) |
| `HEAD /` | 200 |
| `/nope.html` | 404 |
| traversal `/%2e%2e` escape attempt | 403 |

## Fixture verification

- All 13 core fixture cases pass verbatim (`assert.deepEqual` on the
  literal expected values in `test/fixtures.json`).
- All 3 controller fixture cases pass verbatim (states, drafts,
  errors, report availability).
- The `round-lot-profit` report bytes are asserted exactly:
  `{"breakevenPrice":100.59,"buyFee":143,"buyGross":100000.00,"buyShares":1000,"buyTotal":100143.00,"costBasisSold":100143.00,"effectiveTaxRatePct":0.3,"netProfitLoss":9370,"remainingShares":0,"returnPct":9.36,"sellFee":157,"sellGross":110000.00,"sellNet":109513.00,"sellShares":1000,"sellTax":330}` + LF.
- Independent recalculation: a separate Python implementation
  (exact `fractions.Fraction` arithmetic, breakeven scanned cent by
  cent from 1 upward without assuming monotonicity) reproduces all 9
  success fixtures before the JavaScript was written; the JS
  breakeven plug-back test additionally verifies, for every success
  fixture, that the breakeven price reaches the sold cost basis and
  one cent less does not.

## Errata found during implementation

Errata 0. No SPEC normative text conflicts with any fixture.

## NOT_RUN

- Real-browser run of both pages (current Chrome/Edge), including
  the Worker success path, keyboard operation, 320 px reflow, and
  200% zoom: no isolated-browser mechanism is available to this
  builder.
- Real-device checks: not run.
- Independent document review and the nine SPEC acceptance aspect
  scores: not run (owned by the independent reviewer, not the
  builder).
- Registry / coordination commands: not run (build-first mode; the
  coordinator owns registration).
- Merge / publish / deploy: not run, not attempted.

## Known limitations

- See HANDOFF.md ("Known limitations"): the draft lives only in the
  current page (no persistent storage, per SPEC), and the candidate
  preview carries no production canonical, hreflang or sitemap
  because the planned origin is not configured yet.

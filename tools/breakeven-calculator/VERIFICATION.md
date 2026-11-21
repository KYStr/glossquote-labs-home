# Breakeven Calculator — Verification

Candidate branch: `muse/breakeven-calculator-production-20261109`
Base commit: `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
(`codex/initial-publication` at build time)
Spec source: PR #240, candidate commit
`77b72cb74db4cae3bba2c4c1bff7cae5dbc63639`
Spec fixtures SHA-256:
`a75dabca3b765e4f1ceac13de15cde96d0b08d44ae64c2b9c727cc10da94154f`
Environment: Node v24.22.1, no runtime dependencies, no browser.

## Commands run (all in `tools/breakeven-calculator/`)

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 49 tests, 49 pass, 0 fail (18 fixture core cases, 14 hand-derived core tests, 13 controller tests incl. all 3 fixture cases, 4 report tests) |
| `npm run check` | 0 | Pass |
| `npm run build:preview` (run 1) | 0 | 9 files written to `dist-preview/` with `BUILD-MANIFEST.json` |
| `npm run build:preview` (run 2) | 0 | 9 files; recursive diff of the two `dist-preview/` trees clean; the two `BUILD-MANIFEST.json` files byte-identical (SHA-256 `bd59dfa9ba61cee1cc063cbcc0c08e55ec54eb6798217d44b29a97d116a77650`) |
| `npm run check:generated:preview` | 0 | Generated preview verified: 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes; not production |

## Loopback HTTP probe

`node scripts/serve.mjs --port 4173` (loopback only), then `curl`:

| Path | Status |
| --- | --- |
| `/` | 200 (8,272 B) |
| `/en/` | 200 (8,803 B) |
| `/en/index.html` | 200 (8,803 B) |
| `/styles/breakeven.css` | 200 (6,590 B) |
| `/js/app.js` | 200 (10,470 B) |
| `/js/controller.mjs` | 200 (6,973 B) |
| `/js/core/breakeven.mjs` | 200 (12,134 B) |
| `/js/worker-handler.mjs` | 200 (930 B) |
| `/js/worker-source.js` | 200 (13,783 B) |
| `HEAD /` | 200 |
| `/nope.html` | 404 |

## Fixture verification

- All 18 core fixture cases pass verbatim (`assert.deepEqual` on the
  literal expected values in `test/fixtures.json`).
- All 3 controller fixture cases pass verbatim (states, drafts,
  report availability, errors).
- The `ceil-rounds-up` report bytes are asserted exactly:
  `{"breakevenRevenue":"197600.00","breakevenRevenueExact":"197529.60","breakevenUnits":494,"breakevenUnitsExact":"493.8240","contributionMarginPerUnit":"250.00","contributionMarginRatioPercent":"62.50","marginOfSafety":null}\n`.

## Errata found during implementation

None. All 18 core fixtures pass verbatim against the normative
text; no fixture conflicts with the normative text. See HANDOFF.md.

## NOT_RUN

- Real-browser run of both pages (current Chrome/Edge), including
  the Worker success path, keyboard operation, 320 px reflow, and
  200% zoom: no isolated-browser mechanism is available to this
  builder. In particular the interaction between the pinned page
  CSP meta and the blob-URL module Worker is unproven in a real
  browser; the controller degrades to the `error` state with
  WORKER_ERROR if the worker is refused.
- Real-device checks: not run.
- Independent document review and the nine SPEC acceptance aspect
  scores: not run (owned by the independent reviewer, not the
  builder).
- Registry / coordination commands: not run (build-first mode; the
  coordinator owns registration).
- Merge / publish / deploy: not run, not attempted.

## Known limitations

- See HANDOFF.md ("Known limitations"): CSP/blob-worker interaction
  is the one open real-browser question; everything else verified
  above is deterministic and passing.

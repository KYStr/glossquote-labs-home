# Inflation Calculator — Verification

Candidate branch: `muse/inflation-calculator-production-20261109`
Base commit: `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
(`codex/initial-publication` at build time)
Spec source: PR #247, candidate commit
`ecbe6325b65bdf3cffb56222e1016388b4984d7b`
Spec fixtures SHA-256:
`888ae6a956bc5bda31a7c2af53633b5b64fabea2d25ae3d6d917b8023983a03f`
Environment: Node v24.22.1, no runtime dependencies, no browser.

## Commands run (all in `tools/inflation-calculator/`)

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 59 tests, 59 pass, 0 fail (24 fixture core cases, 15 hand-derived core boundary/validation/property tests, 14 controller tests incl. all 3 fixture cases, 6 report tests) |
| `npm run check` | 0 | Pass |
| `npm run build:preview` (run 1) | 0 | 9 files written to `dist-preview/` with `BUILD-MANIFEST.json` |
| `npm run build:preview` (run 2) | 0 | 9 files; recursive diff of the two `dist-preview/` trees clean; the two `BUILD-MANIFEST.json` files byte-identical (SHA-256 `772ce096de14cb8333432abaaf37a510ae43c9d47e89c08d7118fdeaa9597298`) |
| `npm run check:generated:preview` | 0 | Generated preview verified: 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes; not production |

## Loopback HTTP probe

`node scripts/serve.mjs --port 4173` (loopback only), then `curl`:

| Path | Status |
| --- | --- |
| `/` | 200 (10,745 B) |
| `/en/` | 200 (11,304 B) |
| `/en/index.html` | 200 (11,304 B) |
| `/styles/inflation.css` | 200 (7,617 B) |
| `/js/app.js` | 200 (11,113 B) |
| `/js/controller.mjs` | 200 (7,648 B) |
| `/js/core/inflation.mjs` | 200 (16,925 B) |
| `/js/worker-handler.mjs` | 200 (930 B) |
| `/js/worker-source.js` | 200 (18,883 B) |
| `HEAD /` | 200 |
| `/../package.json` (traversal) | 404 |

Response headers on `/`: `Content-Security-Policy: default-src
'none'; script-src 'self'; style-src 'self'; worker-src blob:;
img-src 'self'; connect-src 'none'; object-src 'none'; base-uri
'none'; form-action 'none'; frame-ancestors 'none'`,
`X-Robots-Tag: noindex, nofollow`, `X-Content-Type-Options:
nosniff`, `Content-Type: text/html; charset=utf-8`.

## Fixture verification

- All 24 core fixture cases pass verbatim (`assert.deepEqual` on the
  literal expected values in `test/fixtures.json`).
- All 3 controller fixture cases pass verbatim (states, drafts,
  report availability, errors).
- The `rate-basic` and `cpi-basic` report bytes are asserted exactly:
  `{"cumulativePercent":21.9,"futureValue":121899.44,"purchasingPower":82034.83,"yearTable":[{"nominalValue":100000,"purchasingPower":100000,"year":0},...]}\n`
  and
  `{"adjustedAmount":32760,"cumulativePercent":9.2,"equivalentAnnualRatePercent":null,"fromLabel":"2015","toLabel":"2025"}\n`.

## Errata found during implementation

None. See HANDOFF.md ("Spec-errata candidates"): errata 0.

## NOT_RUN

- Real-browser run of both pages (current Chrome/Edge class
  engines), including the Worker success path, keyboard operation,
  320 px reflow, and 200% zoom: no isolated-browser mechanism is
  available to this builder.
- Real-device checks: not run.
- Independent document review and the nine SPEC acceptance aspect
  scores: not run (owned by the independent reviewer, not the
  builder).
- Registry / coordination commands: not run (build-first mode; the
  coordinator owns registration).
- Merge / publish / deploy: not run, not attempted.

## Known limitations

- See HANDOFF.md ("Known limitations"): page-only draft (no
  persistent storage), 25-row table pagination in the UI (full table
  in the report), real-browser success path unproven.

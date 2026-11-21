# Baby Feeding Calculator — Verification

Candidate branch: `muse/baby-feeding-calculator-production-20261109`
Base commit: `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
(`codex/initial-publication` at build time)
Spec source: PR #262, candidate commit
`558e5afa80f14c686e40a306435b81672219fa68`
Spec fixtures SHA-256:
`55ab4683f0b4322ba1d5022928f8e77aad59cf52f4f8fcf2db0c7d02bc108acf`
Environment: Node v24.22.1, no runtime dependencies, no browser.

## Commands run (all in `tools/baby-feeding-calculator/`)

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 53 tests, 53 pass, 0 fail (16 fixture core cases, 14 controller tests incl. all 3 fixture cases, 4 report tests, plus hand-derived boundary/validation/property tests) |
| `npm run check` | 0 | Pass |
| `npm run build:preview` (run 1) | 0 | 9 files written to `dist-preview/` with `BUILD-MANIFEST.json` |
| `npm run build:preview` (run 2) | 0 | 9 files; recursive diff of the two `dist-preview/` trees clean; the two `BUILD-MANIFEST.json` files byte-identical |
| `npm run check:generated:preview` | 0 | Generated preview verified: 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes; not production |

## Loopback HTTP probe

`node scripts/serve.mjs --port 4173` (loopback only), then `curl`:

| Path | Status |
| --- | --- |
| `/` | 200 (7,617 B) |
| `/en/` | 200 (8,072 B) |
| `/en/index.html` | 200 (8,072 B) |
| `/styles/baby-feeding.css` | 200 (6,311 B) |
| `/js/app.js` | 200 (11,860 B) |
| `/js/controller.mjs` | 200 (7,576 B) |
| `/js/core/baby-feeding.mjs` | 200 (11,499 B) |
| `/js/worker-handler.mjs` | 200 (939 B) |
| `/js/worker-source.js` | 200 (13,152 B) |
| `HEAD /` | 200 |
| Traversal (`/..%2f..%2fetc%2fpasswd`) | 403 |
| Missing page | 404 |
| POST `/` | 405 |

## Fixture verification

- All 16 core fixture cases pass verbatim (`assert.deepEqual` on the
  literal expected values in `test/fixtures.json`).
- All 3 controller fixture cases pass verbatim (states, drafts,
  report availability, errors).
- The `typical-4kg-8feeds` report bytes are asserted exactly:
  `{"ageMonths":null,"dailyTotalMl":600,"factorMlPerKgDay":150,"feedsPerDay":8,"notices":[],"perFeedAverageMl":75,"perFeedMl":[75,75,75,75,75,75,75,75],"weightKg":4}\n`.
- Property checks: over 245 weight × factor × feeds combinations the
  per-feed amounts always sum to the daily total, every feed is ≥ 1 ml,
  and the split is monotone with neighbours differing by at most 1 ml;
  age 0–24 never changes the total or the split.

## Errata found during implementation

Errata 0. No fixture conflicts with the normative text and no
self-contradictory normative statement was found. See HANDOFF.md.

## NOT_RUN

- Real-browser run of both pages (current Chrome/Firefox/Safari class
  engines), including the Worker success path, keyboard operation,
  320 px reflow, and 200% zoom: no isolated-browser mechanism is
  available to this builder. In particular the interaction between the
  pinned page CSP meta (`worker-src blob:`) and the blob-URL module
  Worker is unproven in a real browser; the controller degrades to
  the `error` state with WORKER_ERROR if the worker is refused.
- Real-device checks: not run.
- Independent document review and the nine SPEC §6 aspect scores:
  not run (owned by the independent reviewer, not the builder).
- Registry / coordination commands: not run (build-first mode; the
  coordinator owns registration).
- Merge / publish / deploy: not run, not attempted.

## Known limitations

- See HANDOFF.md ("Known limitations"): CSP/blob-worker interaction
  is the one open real-browser question; everything else verified
  above is deterministic and passing.

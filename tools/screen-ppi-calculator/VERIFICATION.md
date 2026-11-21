# Screen PPI Calculator — Verification

Candidate branch: `muse/screen-ppi-calculator-production-20261109`
Base commit: `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
(`codex/initial-publication` at build time)
Spec source: PR #252, candidate commit
`c8c11e12d1ee9cc684956fc0103a088cc2a0984a`
Spec fixtures SHA-256:
`bccbc7d42443fffbd9589c1182c1148205ba7c542eee6e94f0f89967cd52bef6`
Environment: Node v24.22.1, no runtime dependencies, no browser.

## Commands run (all in `tools/screen-ppi-calculator/`)

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 33 tests, 33 pass, 0 fail (18 fixture core cases, 13 controller tests incl. all 3 fixture cases, 4 report tests, plus hand-derived boundary/grammar/schema/invariant tests) |
| `npm run check` | 0 | Pass |
| `npm run build:preview` (run 1) | 0 | 9 files written to `dist-preview/` with `BUILD-MANIFEST.json` |
| `npm run build:preview` (run 2) | 0 | 9 files; recursive diff of the two `dist-preview/` trees clean; the two `BUILD-MANIFEST.json` files byte-identical (SHA-256 `4454f9da98c2d90a26310458248ab3245a08aefde34706d5868cfd58bb533815`) |
| `npm run check:generated:preview` | 0 | Generated preview verified: 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes; not production |

## Loopback HTTP probe

`node scripts/serve.mjs --port 4173` (loopback only), then `curl`:

| Path | Status |
| --- | --- |
| `/` | 200 (5,960 B) |
| `/en/` | 200 (6,384 B) |
| `/en/index.html` | 200 (6,384 B) |
| `/styles/screen-ppi.css` | 200 (5,875 B) |
| `/js/app.js` | 200 (8,745 B) |
| `/js/controller.mjs` | 200 (7,161 B) |
| `/js/core/screen-ppi.mjs` | 200 (8,813 B) |
| `/js/worker-handler.mjs` | 200 (931 B) |
| `/js/worker-source.js` | 200 (10,356 B) |
| `HEAD /` | 200 |
| `/nope` | 404 |
| `/..%2f..%2fpackage.json` (traversal) | 403 |
| `POST /` | 405 |

## Fixture verification

- All 18 core fixture cases pass verbatim (`assert.deepEqual` on the
  literal expected values in `test/fixtures.json`).
- All 3 controller fixture cases pass verbatim (states, drafts,
  report availability).
- The `fhd-24` report bytes are asserted exactly:
  `{"aspectRatio":"16:9","diagonalIn":24,"dotPitchMm":0.277,"heightCm":29.9,"heightPx":1080,"megapixels":2.07,"ppi":91.8,"widthCm":53.1,"widthPx":1920}\n`.
- All 12 success fixtures were independently recomputed with
  50-digit Decimal arithmetic before implementation; all matched.

## Errata found during implementation

1. SPEC §3 says `"6.10"` is not grammar-conforming, but the normative
   grammar in the same section allows 1–2 decimal digits, so
   `"6.10"` is valid and parses to 6.1. Implemented per the grammar;
   pinned by a dedicated test. See HANDOFF.md errata 1.
2. SPEC §7's reconciliation invariant as written equates
   `sqrt(widthCm² + heightCm²) / 2.54` with `ppiRaw`; it
   mathematically equals the diagonal `d`. The corrected invariant
   (recombining to `d` within 1e-9) is verified for every passing
   core fixture. See HANDOFF.md errata 2.

## NOT_RUN

- Real-browser run of both pages (current Chrome/Firefox/Safari class
  engines), including the Worker success path, keyboard operation,
  320 px reflow, and 200% zoom: no isolated-browser mechanism is
  available to this builder.
- Real-device checks: not run.
- Independent document review and the nine SPEC §6 aspect scores:
  not run (owned by the independent reviewer, not the builder).
- Registry / coordination commands: not run (build-first mode; the
  coordinator owns registration).
- Merge / publish / deploy: not run, not attempted.

## Known limitations

- See HANDOFF.md ("Known limitations"): the blob-URL module Worker
  is allowed by the pinned CSP (`worker-src blob:`) but its real
  browser behaviour is unproven until a real-browser check runs;
  everything else verified above is deterministic and passing.

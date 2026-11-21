# Pool Volume Calculator — Verification

Candidate branch: `muse/pool-volume-calculator-production-20261109`
Base commit: `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
(`codex/initial-publication` at build time)
Spec source: PR #261, candidate commit
`7e446e401c1e3e8c6a7b83808e0eeecbff6c807a`
Spec fixtures SHA-256:
`07f50160da9f2bde49ebb49b7a30785ed1ceff34d3e1eb0affeef154eb84aa3a`
Environment: Node v24.22.1, no runtime dependencies, no browser.

## Commands run (all in `tools/pool-volume-calculator/`)

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 53 tests, 53 pass, 0 fail (18 fixture core cases, 18 hand-derived core tests, 3 fixture controller cases, 10 controller tests, 4 report tests) |
| `npm run check` | 0 | Pass (one earlier failure: the pinned error strings lived only in the core, not in app.js — fixed by carrying them verbatim in app.js too; re-ran clean) |
| `npm run build:preview` (run 1) | 0 | 9 files written to `dist-preview/` with `BUILD-MANIFEST.json` |
| `npm run build:preview` (run 2) | 0 | 9 files; recursive diff of the two `dist-preview/` trees clean; the two `BUILD-MANIFEST.json` files byte-identical (SHA-256 `4f459c024557bd4ef0a562a4e6799b64a86f36791224f60baf55725fadd72d2f`) |
| `npm run check:generated:preview` | 0 | Generated preview verified: 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes; not production |

## Loopback HTTP probe

`node scripts/serve.mjs --port 4173` (loopback only), then `curl`:

| Path | Status |
| --- | --- |
| `/` | 200 (9,895 B) |
| `/en/` | 200 (10,332 B) |
| `/en/index.html` | 200 (10,332 B) |
| `/styles/pool-volume.css` | 200 (5,852 B) |
| `/js/app.js` | 200 (11,139 B) |
| `/js/controller.mjs` | 200 (6,945 B) |
| `/js/core/pool-volume.mjs` | 200 (15,916 B) |
| `/js/worker-handler.mjs` | 200 (936 B) |
| `/js/worker-source.js` | 200 (17,797 B) |
| `HEAD /` | 200 |
| `/nope` | 404 |

## Fixture verification

- All 18 core fixture cases pass verbatim (`assert.deepEqual` on the
  literal expected values in `test/fixtures.json`).
- All 3 controller fixture cases pass verbatim (states, drafts,
  report availability).
- The `rect-single-depth` report bytes are asserted exactly:
  `{"avgDepthM":1.5,"depthMode":"single","fillHours":20,"fillMinutes":0,"fillTotalMinutes":1200,"flowRateLMin":40,"shape":"rectangular","volumeGallonsUs":12680,"volumeLitres":48000,"volumeM3":48}\n`.

## Errata found during implementation

1. UNICODE vs the enabled-field skip: the numbered validation order
   lists UNICODE before the enabled check, but the same step's
   parenthetical and the tests section say an inactive field is
   capacity-checked only and a lone surrogate there should pass. The
   implementation follows the parenthetical/tests section. See
   HANDOFF.md errata 1.

## NOT_RUN

- Real-browser run of both pages (current Chrome/Firefox/Safari class
  engines), including the Worker success path, keyboard operation,
  320 px reflow, and 200% zoom: no isolated-browser mechanism is
  available to this builder. In particular the interaction between the
  pinned page CSP meta and the blob-URL module Worker is unproven in
  a real browser; the controller degrades to the `error` state with
  WORKER_ERROR if the worker is refused.
- Real-device checks: not run.
- Independent document review and the nine SPEC acceptance aspect
  scores: not run (owned by the independent reviewer, not the
  builder).
- Registry / coordination commands: not run (build-first mode; the
  coordinator owns registration).
- Merge / publish / deploy: not run, not attempted.

## Known limitations

- See HANDOFF.md ("Known limitations"): the CSP/blob-worker
  interaction is the one open real-browser question; everything else
  verified above is deterministic and passing.

# Pet Feeding Calculator — Verification

Candidate branch: `muse/pet-feeding-calculator-production-20261109`
Base commit: `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
(`codex/initial-publication` at build time)
Spec source: PR #263, candidate commit
`282fb18912c0435257c13b96b5562e410e3a2521`
Spec fixtures SHA-256:
`9925a6830399019d9005205fe08933d9d863c8f05fe870d37a19c9aceef17ed8`
Environment: Node v24.22.1, no runtime dependencies, no browser.

## Commands run (all in `tools/pet-feeding-calculator/`)

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 52 tests, 52 pass, 0 fail (21 fixture core cases, 13 controller tests incl. all 3 fixture cases, 4 report tests, plus hand-derived boundary/validation/property tests) |
| `npm run check` | 0 | Pass |
| `npm run build:preview` (run 1) | 0 | 9 files written to `dist-preview/` with `BUILD-MANIFEST.json` |
| `npm run build:preview` (run 2) | 0 | 9 files; recursive diff of the two `dist-preview/` trees clean; the two `BUILD-MANIFEST.json` files byte-identical (SHA-256 `506ced6492a9182900c0da75d5ac18719d2149b4d83b792602c8eb67058a4e63`) |
| `npm run check:generated:preview` | 0 | Generated preview verified: 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes; not production |

## Loopback HTTP probe

`node scripts/serve.mjs --port 4173` (loopback only), then `curl`:

| Path | Status |
| --- | --- |
| `/` | 200 (9,217 B) |
| `/en/` | 200 (9,786 B) |
| `/en/index.html` | 200 (9,786 B) |
| `/styles/pet-feeding.css` | 200 (6,999 B) |
| `/js/app.js` | 200 (14,204 B) |
| `/js/controller.mjs` | 200 (7,786 B) |
| `/js/core/pet-feeding.mjs` | 200 (14,363 B) |
| `/js/worker-handler.mjs` | 200 (935 B) |
| `/js/worker-source.js` | 200 (16,218 B) |
| `HEAD /` | 200 |
| `/nope` | 404 |

## Fixture verification

- All 21 core fixture cases pass verbatim (`assert.deepEqual` on the
  literal expected values in `test/fixtures.json`).
- All 3 controller fixture cases pass verbatim (states, drafts,
  report availability).
- The `dog-neutered-default` report bytes are asserted exactly:
  `{"cupsPerDay":null,"derKcal":630,"gramsPerDay":175,"lifeStage":"adult-neutered","mealsPerDay":2,"multiplier":1.6,"perMealCups":null,"perMealGrams":[88,87],"perMealKcal":[315,315],"rerKcal":394,"species":"dog"}\n`.
- Independent recomputation: a separate Python double-precision
  script following the SPEC's pinned operation order reproduced all
  13 success fixtures exactly (0 mismatches), plus the dog-100 kg
  and cat-0.5 kg boundary expectations used by the extra tests.

## Errata found during implementation

None. See HANDOFF.md ("Spec-errata candidates").

## NOT_RUN

- Real-browser run of both pages (current Chrome/Firefox/Safari class
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

- See HANDOFF.md ("Known limitations"): real-browser evidence is the
  open item; everything else verified above is deterministic and
  passing.

# Lighting Lumen Calculator — Verification

Candidate branch: `muse/lighting-lumen-calculator-production-20261109`
Base commit: `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
(`codex/initial-publication` at build time)
Spec source: PR #251, candidate commit
`3119dccbc0c684ef07ef46aadb30e1b600f9544f`
Spec fixtures SHA-256:
`a1d297f5f221dc9b2730fa8e01b63f55901ddb0cfced5509350a0f553d7629d0`
Environment: Node v24.22.1, no runtime dependencies, no browser.

## Commands run (all in `tools/lighting-lumen-calculator/`)

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 50 tests, 50 pass, 0 fail (14 fixture core cases, 14 hand-derived core tests, 15 controller tests incl. all 3 fixture cases, 4 report tests) |
| `npm run check` | 0 | Pass |
| `npm run build:preview` (run 1) | 0 | 9 files written to `dist-preview/` with `BUILD-MANIFEST.json` |
| `npm run build:preview` (run 2) | 0 | 9 files; recursive diff of the two `dist-preview/` trees clean; the two `BUILD-MANIFEST.json` files byte-identical (SHA-256 `a48c60349797ec75414f63b617b9b983466ba4bb141a025b03611489518a2a7f`) |
| `npm run check:generated:preview` | 0 | Generated preview verified: 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes; not production |

## Loopback HTTP probe

`node scripts/serve.mjs --port 4173` (loopback only), then `curl`:

| Path | Status |
| --- | --- |
| `/` | 200 (8,927 B) |
| `/en/` | 200 (9,313 B) |
| `/en/index.html` | 200 (9,313 B) |
| `/styles/lighting-lumen.css` | 200 (6,225 B) |
| `/js/app.js` | 200 (11,380 B) |
| `/js/controller.mjs` | 200 (7,145 B) |
| `/js/core/lighting-lumen.mjs` | 200 (16,324 B) |
| `/js/worker-handler.mjs` | 200 (935 B) |
| `/js/worker-source.js` | 200 (18,256 B) |
| `HEAD /` | 200 |
| traversal (`/..%2f..%2fpackage.json`) | 403 |
| missing page (`/nope.html`) | 404 |

## Fixture verification

- All 14 core fixture cases pass verbatim (`assert.deepEqual` on the
  literal expected values in `test/fixtures.json`).
- All 3 controller fixture cases pass verbatim (states, drafts,
  report availability, error codes).
- The `living-dimensions-basic` report bytes are asserted exactly:
  `{"achievedLux":114.3,"areaM2":14,"bulbCount":2,"installedLumens":1600,"targetLux":100,"totalLumens":1400}\n`.
- Hand-derived boundary probes verified by independent recomputation:
  length/width 0.5 and 100.0 succeed, 0.4 and 100.1 are RANGE; area
  0.25 and 10000 m² succeed, 0.24 and 10000.01 are RANGE; ping 3000
  study gives 9917.36 m² / 2,975,207 lm / 30 bulbs / 302.5 lx, 0.07
  and 3000.01 are RANGE; bulb 1 and 100000 succeed, 100001 is RANGE;
  total 2001 lm over 1000 lm bulbs adds a third bulb; achievedLux
  76.25 rounds half-up to 76.3 (not banker's 76.2).

## Errata found during implementation

None. All 14 core fixtures pass verbatim against the normative
text; no fixture conflicts with the SPEC's rules. See HANDOFF.md
("Spec-errata candidates").

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

- See HANDOFF.md ("Known limitations"): the draft is never
  persisted (switching language or leaving the page discards it, per
  SPEC); everything else verified above is deterministic and passing.

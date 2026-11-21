# VO2max Calculator — Verification

Candidate branch: `muse/vo2max-calculator-production-20261109`
Base commit: `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
(`codex/initial-publication` at build time)
Spec source: PR #236, candidate commit
`30d67be295be66714f292722cea0660631d97176`
Spec fixtures SHA-256:
`b86e26cbad1a6c58f6f8096f7cfc5792c4cbff80fdbb05e3c45e8c29618187ae`
Environment: Node v24.22.1, no runtime dependencies, no browser.

## Commands run (all in `tools/vo2max-calculator/`)

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 58 tests, 58 pass, 0 fail (24 fixture core cases, 13 controller tests incl. all 3 fixture cases, 4 report tests, plus hand-derived boundary/validation/property tests) |
| `npm run check` | 0 | Pass (after VERIFICATION.md was written; the only earlier failure was the missing VERIFICATION.md itself, plus a comment that tripped the localStorage count — both fixed) |
| `npm run build:preview` (run 1) | 0 | 9 files written to `dist-preview/` with `BUILD-MANIFEST.json` |
| `npm run build:preview` (run 2) | 0 | 9 files; recursive diff of the two `dist-preview/` trees clean; the two `BUILD-MANIFEST.json` files byte-identical (SHA-256 `1f2d6d51f87948070e69166de5d507f11849bd500e03f8c6ba01b2b423757f81`) |
| `npm run check:generated:preview` | 0 | Generated preview verified: 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes; not production |

## Loopback HTTP probe

`node scripts/serve.mjs --port 4173` (loopback only), then `curl`:

| Path | Status |
| --- | --- |
| `/` | 200 (7,676 B) |
| `/en/` | 200 (7,858 B) |
| `/en/index.html` | 200 (7,858 B) |
| `/styles/vo2max.css` | 200 (5,871 B) |
| `/js/app.js` | 200 |
| `/js/controller.mjs` | 200 (7,429 B) |
| `/js/core/vo2max.mjs` | 200 (14,633 B) |
| `/js/worker-handler.mjs` | 200 (927 B) |
| `/js/worker-source.js` | 200 (16,486 B) |
| `HEAD /` | 200 |

## Fixture verification

- All 24 core fixture cases pass verbatim (`assert.deepEqual` on the
  literal expected values in `test/fixtures.json`).
- All 3 controller fixture cases pass verbatim (states, drafts,
  sequences, status strings, report availability).
- The `cooper-basic` report bytes are asserted exactly:
  `{"classification":null,"distanceMeters":2400,"test":"cooper12","vo2max":42.4}\n`.

## Errata found during implementation

1. SPEC §4 step 4 (and §6 aspect 2) claim "506 m gives 0.1".
   (506 − 504.9) / 44.73 = 0.0246… rounds to 0.0, so 506 m is
   BELOW_RANGE; the first success is 507.2 m → 0.1. Verified with an
   independent node calculation and pinned by a dedicated test. See
   HANDOFF.md errata 1.

## NOT_RUN

- Real-browser run of both pages (current Chrome/Firefox/Safari class
  engines), including the Worker success path, keyboard operation,
  320 px reflow, and 200% zoom: no isolated-browser mechanism is
  available to this builder. In particular the interaction between the
  pinned page CSP meta (`script-src 'self'`, no `worker-src`) and the
  blob-URL module Worker is unproven in a real browser; the controller
  degrades to the `unavailable` state if the worker is refused.
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

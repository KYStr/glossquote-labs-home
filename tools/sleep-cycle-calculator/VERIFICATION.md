# Sleep Cycle Calculator — verification record

Environment: Node v24.22.1, Linux VM, working from `tools/sleep-cycle-calculator/` on branch `muse/sleep-cycle-calculator-production-20261109` (base `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c`).

## Commands run

| Command | Result |
| --- | --- |
| `npm test` | PASS — exit 0; 13 tests, 13 pass, 0 fail (~0.2 s) |
| `npm run check` | PASS — exit 0 ("Project check passed.") |
| `npm run build:preview` (run 1) | PASS — exit 0; 6 static files into dist/ |
| `npm run build:preview` (run 2) + tree hash comparison | PASS — exit 0; dist tree SHA-256 `8700a58d7cf889b423c8d121e2d507b6d9bf6bab43fa581eb1c7a97f6d9a38ea` on both runs — byte-identical |
| `npm run check:generated:preview` | PASS — exit 0; dist/ mirrors public/ exactly, both language pages present |
| Loopback HTTP probe (`node scripts/serve.mjs`, curl both language pages) | PASS — `GET /index.html` 200 (3290 bytes, zh-Hant, correct title), `GET /en/index.html` 200 (3336 bytes, en, correct title), `GET /js/app.js` 200; server stopped after the probe |

## Test expectations provenance

All expected values in `test/core.test.mjs` are hand-derived from SPEC section 4 fixtures S1/S2/S3 and section 7's required cases (mathematical modulo −135 → 1305 asserted directly; raw exactly 0 and exactly 1440 boundary labels; latency 0/60 extremes incl. bedtime 23:59 + latency 60 → raw 2039; refusal classes 24:00, 7:00, empty, 61, −1, 15.5; marks for n = 3/4/5/6 in both directions). No expected value was generated from the implementation's output.

## Spec errata candidates

None found: fixtures S1, S2 and S3 were re-derived by hand from the section 4 formulas and match the printed values exactly (times, labels, both duration columns, row orders).

## NOT_RUN (explicit)

- Real-browser rendering and interaction (both languages, both directions, "going to sleep now" against a live device clock, stale-state behaviour in a real UI) — no browser run was performed for this candidate.
- Real devices / touch input / mobile viewports and 200% zoom.
- Assistive technology (screen reader announcement behaviour).
- Measured colour contrast.
- Cross-browser compatibility (Chrome/Edge/Firefox/Safari).
- Deployment, catalog publication, production canonical/sitemap — out of scope and not authorised.

These items remain for the independent review phase; per SPEC section 6 they block acceptance until run against the fixed candidate commit.

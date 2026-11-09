# Decision Wheel Picker — verification record

Environment: Node v24.22.1, Linux VM, 2026-11-09. All commands run in
`tools/decision-wheel-picker/`.

## Commands run

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 21 tests, 21 pass, 0 fail (7 suites, ~0.6 s) |
| `npm run check` | 0 | Project check passed (structure, package contract, forbidden-capability scan incl. the SPEC's no-`Math.random` audit, page head/CSP/home-link/explainer checks, id parity, i18n key parity, and core fixture probes W1–W3 re-derived inside the checker) |
| `npm run build:preview` (run 1) | 0 | Built 6 static files into `dist-preview/` |
| `npm run build:preview` (run 2) | 0 | Built 6 static files into `dist-preview/` |
| `npm run check:generated:preview` | 0 | Generated preview check passed (output mirrors `public/` exactly) |

## Build reproducibility

SHA-256 hashes of all 6 `dist-preview/` files were captured after each
of the two builds and compared with `diff`: **byte-identical** (no
differences).

## HTTP probe (loopback only)

`node scripts/serve.mjs --port 4199`, then `curl`:

- `GET /index.html` → 200 (4206 B, `lang="zh-Hant"`)
- `GET /en/index.html` → 200 (4377 B, `lang="en"`)
- `GET /js/app.js` → 200
- `GET /js/core/wheel.mjs` → 200
- `GET /../package.json` (path traversal attempt) → 404

Server stopped after the probe.

## Test coverage against SPEC section 7

- (a) Fixtures W1–W4 reproduced exactly through the injected scripted source (core.test.mjs, session.test.mjs).
- (b) `drawLimit` equals ⌊2³²/n⌋×n for every n in 2..50 (expected values recomputed with BigInt in the test); scripted uniform cycle for n = 3 gives exactly 1000 per residue; rejected values never yield an index (W2/W3).
- (c) Parsing: Unicode trim incl. full-width spaces, blank-line dropping, duplicate retention, 60 accepted / 61 refused with the correct 1-based line number, 2/50 accepted and 1/51 refused with counts.
- (d) Elimination: one occurrence removed from [X, X, Y] leaving [X, Y]; final-remaining triggers at exactly 1 and a further spin refuses; reset restores the parsed list, clears history and unlocks.
- (e) Distribution smoke check: 60,000 real-crypto draws at n = 6, every index count inside the pre-declared 9500–10500 band — passed; it is a smoke check only, not a fairness proof.

## Spec errata

None found. Fixtures W1–W4 were re-derived by hand from the section 4
rules and agree with the printed values (W2 limit 4,294,967,295 and
index 2; W3 limit 4,294,967,292 and index 5; W4 picks C, A, D with final
remaining B). The only deviation from the document is presentational and
is recorded in HANDOFF.md: SPEC section 8's own-repository handoff
wording is superseded by the 2026-11-09 consolidation rules.

## NOT_RUN (explicit)

- Real-browser rendering and interaction: full spin animation observed end-to-end (pointer landing inside the announced slice), reduced-motion emulation in a browser, elimination played to completion in a browser, editor lock in a browser, error states in a browser.
- Real devices / touch input, mobile-width layout in a real browser, 200% zoom.
- Assistive technology (screen reader announcement of the live region).
- Measured colour contrast of slice labels.
- Browser network/storage observation (no-network/no-storage beyond source audit).
- Deployment, merge, catalog publication (separate later approvals).

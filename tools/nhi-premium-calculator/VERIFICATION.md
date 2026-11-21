# NHI Premium Calculator — Verification

Candidate branch: `muse/nhi-premium-calculator-production-20261109`
Base commit: `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
(`codex/initial-publication` at build time)
Spec source: PR #249, candidate commit
`840eaead392342a4fe18dfd105659b3b099c3043`
Spec fixtures SHA-256:
`567c04562f0a8ddd9ad0ed273c802f2e293ef93c8c37b6c12c370a70a266eabc`
Environment: Node v24.22.1, no runtime dependencies, no browser.

## Commands run (all in `tools/nhi-premium-calculator/`)

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 48 tests, 48 pass, 0 fail (15 fixture core cases, 3 fixture controller cases, plus hand-derived boundary/validation/property/report tests) |
| `npm run check` | 0 | Pass |
| `npm run build:preview` (run 1) | 0 | 9 files written to `dist-preview/` with `BUILD-MANIFEST.json` |
| `npm run build:preview` (run 2) | 0 | 9 files; recursive diff of the two `dist-preview/` trees clean; the two `BUILD-MANIFEST.json` files byte-identical (SHA-256 `8a089128b9cd298f4b99ab4d6339a9f3af43516aee2b8f146fd04f08b5178963`) |
| `npm run check:generated:preview` | 0 | Generated preview verified: 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes; not production |

## Loopback HTTP probe

`node scripts/serve.mjs --port 4173` (loopback only), then `curl`:

| Path | Status |
| --- | --- |
| `/` | 200 (7,367 B) |
| `/en/` | 200 (7,902 B) |
| `/en/index.html` | 200 (7,902 B) |
| `/styles/nhi-premium.css` | 200 (6,417 B) |
| `/js/app.js` | 200 (9,806 B) |
| `/js/controller.mjs` | 200 (6,958 B) |
| `/js/core/nhi-premium.mjs` | 200 (12,381 B) |
| `/js/worker-handler.mjs` | 200 (932 B) |
| `/js/worker-source.js` | 200 (13,982 B) |
| `HEAD /` | 200 |
| `/nonexistent` | 404 |
| `/../etc/passwd` (traversal) | 404 |

Response headers on `/` include the SPEC CSP (`default-src 'none';
script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self';
connect-src 'none'; object-src 'none'; base-uri 'none'; form-action
'none'; frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`,
and `X-Robots-Tag: noindex, nofollow`.

## Fixture verification

- All 15 core fixture cases pass verbatim (`assert.deepEqual` on the
  literal expected values in `test/fixtures.json`).
- All 3 controller fixture cases pass verbatim (states, drafts,
  report availability, errors).
- The floor-grade report bytes are asserted exactly:
  `{"dependentPremiumEach":458,"dependentsCapped":false,"dependentsCharged":0,"employeeTotalPremium":458,"employerPremium":1428,"governmentPremium":238,"grade":1,"insuredAmount":29500,"selfPremium":458}\n`.
- The appendix 58-row table was independently recomputed with exact
  rational arithmetic (Python `fractions.Fraction`, round-half-up) and
  matches the SPEC appendix 58/58, and the core reproduces it 58/58.

## Errata found during implementation

None. All 15 core fixtures pass verbatim and the appendix recomputes
exactly, so no SPEC-vs-fixture conflict was found. One correction to
an inherited claim discovered while writing the float-trap test: the
SPEC's note that the grade-1 premium "is easily computed as
457.54499… and mis-rounded to 457" does not reproduce with plain
`Math.round` (which still gives 458); the genuine float discriminator
is grade 38, where `150000 * (5.17/100) * (30/100)` is below 2326.5
and `Math.round` gives 2326 instead of the exact 2327. Pinned by a
dedicated test (`float trap`). The grade-1 government share of 238
remains the formula-derived cell flagged in AUTHOR-CHECK.md §3 for
the reviewer to re-check against the 115 (III) table.

## NOT_RUN

- Real-browser run of both pages (current Chrome/Edge), including the
  Worker success path, keyboard operation, 320 px reflow, and 200%
  zoom: no isolated-browser mechanism is available to this builder.
- Real-device checks: same reason.
- Network/Storage observation in a real browser profile: same reason.
  The shipped sources contain no fetch/XHR/WebSocket/beacon, no
  persistent storage, and no remote assets (asserted statically by
  `scripts/check.mjs`), but only a real browser can observe the
  runtime network/storage behaviour.
- Production origin, canonical/SEO, and deployment: the planned
  origin `https://nhi-premium.glossquote.com` is not configured;
  production build is refused and the preview is noindex.

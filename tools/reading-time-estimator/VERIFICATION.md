# Reading Time Estimator — Verification

Candidate branch: `muse/reading-time-estimator-production-20261109`
Base commit: `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
(`codex/initial-publication` at build time)
Spec source: PR #254, candidate commit
`131cea60be513f3790bf3327930c6251fd622569`
Spec fixtures SHA-256:
`dad1d90236dd961d76d8d33e1e5123ac895a799edb15d4d371b612df66d00bf4`
Environment: Node v24.22.1, no runtime dependencies, no browser.

## Commands run (all in `tools/reading-time-estimator/`)

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 51 tests, 51 pass, 0 fail (17 fixture core cases, 13 controller tests incl. all 3 fixture cases, 4 report tests, plus hand-derived boundary/validation/property tests) |
| `npm run check` | 0 | Pass |
| `npm run build:preview` (run 1) | 0 | 9 files written to `dist-preview/` with `BUILD-MANIFEST.json` |
| `npm run build:preview` (run 2) | 0 | 9 files; recursive diff of the two `dist-preview/` trees clean; the two `BUILD-MANIFEST.json` files byte-identical (SHA-256 `9edc7580bec67274d0236295989202abcd9175eff3717fddf7f6b25990212fe9`) |
| `npm run check:generated:preview` | 0 | Generated preview verified: 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes; not production |

## Loopback HTTP probe

`node scripts/serve.mjs --port 4173` (loopback only), then `curl`:

| Path | Status |
| --- | --- |
| `/` | 200 (7,874 B) |
| `/en/` | 200 (8,519 B) |
| `/en/index.html` | 200 (8,519 B) |
| `/styles/reading-time.css` | 200 (5,821 B) |
| `/js/app.js` | 200 (8,982 B) |
| `/js/controller.mjs` | 200 (6,830 B) |
| `/js/core/reading-time.mjs` | 200 (11,575 B) |
| `/js/worker-handler.mjs` | 200 (939 B) |
| `/js/worker-source.js` | 200 (13,205 B) |
| `/robots.txt` | 200 (26 B, deny all) |
| `/nonexistent` | 404 |
| `HEAD /` | 200 |
| `/../package.json` (traversal) | 404 |

Response headers on `/` confirmed: CSP exactly as pinned in the SPEC
(`default-src 'none'; script-src 'self'; style-src 'self'; worker-src
blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri
'none'; form-action 'none'; frame-ancestors 'none'`), `X-Robots-Tag:
noindex, nofollow`, `X-Content-Type-Options: nosniff`,
`Content-Type: text/html; charset=utf-8`.

## Fixture verification

- All 17 core fixture cases pass verbatim (`assert.deepEqual` on the
  literal expected values in `test/fixtures.json`), independently
  recomputed before implementation with an exact-rational Python
  script: 17/17 match.
- All 3 controller fixture cases pass verbatim (states, drafts,
  report availability, errors).
- The `zh-basic` report bytes are asserted exactly:
  `{"cjkChars":6,"latinWords":0,"silentDisplay":"0:01","silentSeconds":1,"speakDisplay":"0:02","speakSeconds":2}\n`.

## Errata found during implementation

None. All 17 core fixture expectations agree with the SPEC normative
text under independent recomputation.

## NOT_RUN

- Real-browser checks (Chrome / Edge, both languages, keyboard,
  320 px, 200% zoom, reduced motion, touch targets, contrast):
  NOT_RUN — no isolated-browser mechanism is available to this
  builder. Do not claim browser PASS.
- Network / Storage observation with a clean isolated profile (zero
  work requests, no storage, URL and console): NOT_RUN. The source
  contains no fetch/XHR/WebSocket/beacon/analytics/remote-font code
  and no storage access (asserted by `scripts/check.mjs`), but that
  static evidence is not a substitute for the live observation.
- Formal HTTPS / SEO (canonical, hreflang, sitemap, headers, 404,
  redirects on the planned origin
  https://reading-time-estimator.glossquote.com): NOT_RUN — the origin
  is not configured and the preview carries noindex and no production
  canonical by design.
- Real-device checks: NOT_RUN.

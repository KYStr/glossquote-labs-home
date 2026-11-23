# Carbon Footprint Calculator （碳足跡計算）— VERIFICATION

- Spec: `spec-carbon-footprint-calculator-20261121`, draft spec PR #402,
  head `5ce91f2f044624b42522398aa51b90d90fcecf10` (OPEN, draft, base
  `codex/initial-publication`). Registry rev 1857 (per parent task).
- Production branch: `muse/carbon-footprint-calculator-production-20261121`,
  base `codex/initial-publication` commit `8c265267`.
- Environment: Node v24.22.1, `node --test`, no dependencies installed
  (zero runtime dependencies). All commands run in
  `tools/carbon-footprint-calculator/` of the branch checkout, 2026-11-23.

## Commands and results

| Command | Exit | Result |
| --- | --- | --- |
| `node --test` | 0 | 47 tests, 47 pass, 0 fail (12 literal core fixtures + hand-derived core cases + 3 literal controller fixtures + controller unit tests + 5 report tests + 7 site tests) |
| `node scripts/check.mjs` | 0 | Pass: files, package contract, fixtures hash, core fields/defaults/ranges/factors/example, pages, syntax, worker concatenation, capability scan, core purity |
| `node scripts/build.mjs --mode preview` (run 1) | 0 | 9 files to `dist-preview/`, BUILD-MANIFEST.json SHA-256 `08f7aa4bc59da1c0b69c367661ff3fcd0e3bb37e13059f41be469a29e43b4278` |
| `node scripts/build.mjs --mode preview` (run 2) | 0 | Same 9 files, BUILD-MANIFEST.json SHA-256 `08f7aa4bc59da1c0b69c367661ff3fcd0e3bb37e13059f41be469a29e43b4278` — byte-identical to run 1 |
| `node scripts/check-generated.mjs --mode preview` | 0 | Generated preview verified: 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes; not production |
| `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` (smoke) | 0 | Loopback server up; GET `/` 200 text/html with CSP + X-Robots-Tag noindex, GET `/en/index.html` 200, GET `/missing` 404, traversal `/%2e%2e/` refused (403/404, no escape); killed after the check |

## Build manifest (preview, both runs identical)

- `en/index.html` — 14910 bytes, SHA-256 `292f0a3e5721c00506a6bd046f9ea12430d78cbf7da8c7d5527dfaef4bcd40dd`
- `index.html` — 14641 bytes, SHA-256 `c41f3e159486b4c5c94c4f81ebd3d9a8dfa516ba54a576c1e742208942247252`
- `js/app.js` — 15002 bytes, SHA-256 `650fd8b31bcf0940f2e37a6320508aea32c96858710acf58e207a8a3863b6dea`
- `js/controller.mjs` — 5039 bytes, SHA-256 `d9ab0c2f16d98ffe8405ed95b61eee02f67e4a8febc0582b4fd411309b66db21`
- `js/core/carbon-footprint.mjs` — 12871 bytes, SHA-256 `f4fe2febe4cc60227d84d28b84bcaeca98841fa0b529aa3a1327df4366c2c7c5`
- `js/worker-handler.mjs` — 798 bytes, SHA-256 `255b4f805abb28f8ba4c4b6972e13448bd1eb8b6bbda6f7fe0640cb8bb25f1d1`
- `js/worker-source.js` — 14466 bytes, SHA-256 `e54395b7250a8cc80cb6fb0e5ec3f672bda69f9cac7aca36208c56ae558c0ee9`
- `robots.txt` — 26 bytes, SHA-256 `331ea9090db0c9f6f597bd9840fd5b171830f6e0b3ba1cb24dfa91f0c95aedc1`
- `styles/app.css` — 7091 bytes, SHA-256 `16bfb9092e1945e4f1fa24b5e33cf19097f1e9c9d21088c6bb60960842011ed3`

## Fixture provenance

- `test/fixtures.json` SHA-256
  `dd84d4401036eac5313242675b3cc2eedfd545f3f0a5e539159cfab27452b0d5`,
  verified byte-identical to the spec PR #402 head's
  `docs/specs/carbon-footprint-calculator/fixtures.json` via the
  GitHub API before building.

## NOT_RUN (next owner: independent reviewer, same PR head)

- Real-browser gates: no isolated browser was available to this
  builder, so Chrome / Edge two-language flows, keyboard / focus /
  320 px / 200% zoom / reduced-motion, Worker + Blob download bytes,
  and reflow evidence are NOT_RUN — not passed by Node/DOM checks.
- Network / Storage gate: zero-work-request, storage, URL, and
  console checks in a clean isolated profile are NOT_RUN.
- Compatibility gate (real Chrome + Edge), accessibility gate
  (WCAG 2.2 AA on real browsers), and the nine-aspect independent
  review are NOT_RUN. The Node-level checks above are not a
  substitute for them.
- Production origin / formal HTTPS / SEO gate: NOT_RUN — no
  production origin has been approved for this tool; the preview
  build refuses production mode.

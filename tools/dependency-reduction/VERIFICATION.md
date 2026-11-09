# Verification — Module Dependency Reduction (dependency-reduction)

Environment: Node v24.22.1, `~/workspace/glossquote-factory/build3/dependency-reduction`.
Candidate branch: `muse/dependency-reduction-production-20261109`,
base `fb6cb6e111bfd5f03a88afdcb730746d81538017` (`codex/initial-publication`).

## Commands run

| Command | Result |
| --- | --- |
| `npm test` | exit 0 — **33 pass / 0 fail** |
| `npm run check` | exit 0 — all static checks passed |
| `npm run build:preview` (twice) | exit 0 — byte-identical (aggregate SHA-256 `6014780e67b158ae1e07be1ea952dfd6df3931826839c8788037669b18cc6c35`) |
| `npm run check:generated:preview` | exit 0 — 7 files identical |
| Loopback HTTP probe (`node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview`) | `/` 200, `/en/` 200, `/js/core/graph.mjs` 200, unknown path 404, traversal 404; headers include `X-Robots-Tag: noindex, nofollow` and the SPEC CSP (`worker-src blob:`) |

## Test coverage

- `test/core.test.mjs` — all 7 literal core fixtures from `fixtures.json`
  (alternate-witness, chain-plus-isolate, cycle-witness, self-loop,
  no-edges, unknown-id, duplicate-edge) by deep equality; SCHEMA cases
  (non-object, array, missing/extra field, wrong type, accessor);
  capacity boundaries (modules 3301 chars, edges 26401 chars; 100/101
  modules, 400/401 edges); EMPTY; UNICODE with line attribution;
  name-grammar ID cases; DUP_ID; EDGE shape cases; UNKNOWN_ID/DUP_EDGE
  rows; trailing-LF stripping; cycle detection (sorted starts, isolate
  outside, longer cycle); Kahn round discipline; redundant-edge sorting and
  BFS tie-break; witness integrity (every via step is a real edge, direct
  edge unused, every original edge crosses to a later stage);
  `serializeReport` key order / trailing LF / byte count / OUTPUT_LIMIT.
- `test/controller.test.mjs` — all 3 controller fixtures
  (state-dirty-error, state-cancel-late, state-replace-late) with a
  controllable fake runner, plus edit-during-busy abandonment, cancel-when-
  idle, reset, and onChange notification order.
- `test/build.test.mjs` — build twice byte-identical, check and
  check:generated pass, serve probe (both pages, JS asset, 404, traversal,
  preview headers).

## Spec errata

None. Every printed fixture in `fixtures.json` reproduces exactly from the
SPEC's own rules; no fixture contradicts the SPEC.

## Interpretations (SPEC silent; recorded for the reviewer to overrule)

1. Invalid module name → code `ID` (SPEC: 「名稱 ID」).
2. Edge lines validated row by row: shape → unknown endpoint → duplicate;
   first failure wins.
3. `ROW_LIMIT` reports row 101 (modules) / 401 (edges); `EMPTY` and
   `INPUT_LIMIT` report row `null`.
4. Candidate pages carry no production canonical/hreflang/sitemap, per the
   SPEC tests section; language links are plain paths.
5. `OUTPUT_LIMIT` disables only the download; the result stays displayed.
6. The SPEC's `src/` layout is superseded by the house contract
   (`public/js/core/*.mjs`, `public/js/app.js`).

## NOT_RUN

- Real-browser rendering/interaction (including the actual Worker run,
  cancel button, pagination, and Blob download bytes).
- Real devices/touch, assistive technology, measured contrast, 200% zoom.
- Cross-browser comparison (Chrome/Edge).
- Network/Storage isolation audit with a clean profile.
- Deployment; independent nine-aspect review (pending by design in
  build-first mode).

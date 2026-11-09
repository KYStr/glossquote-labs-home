# Route Overlap Audit — verification

Environment: Node v24.22.1, no network, zero runtime dependencies.
Base: `codex/initial-publication` @ `5e8fab03c00fba01bca68b1dd80280eb380b9bd6`.

## Commands (all exit 0)

| Command | Result |
| --- | --- |
| `node --test` | 36 pass / 0 fail |
| `npm run check` (`node scripts/check.mjs`) | all static checks passed |
| `npm run build:preview` (twice) | byte-identical (per-file SHA-256 diff clean) |
| `npm run check:generated:preview` | all generated-output checks passed |
| Loopback HTTP probe (`node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview`) | `/` 200 zh-Hant, `/en/index.html` 200 en, `/js/app.js` 200 `text/javascript`, `/js/core/core.mjs` 200, HEAD `/` 200, traversal `/..%2f..%2fpackage.json` 404, missing page 404 |

## Test coverage (36 tests)

- `test/core.test.mjs` — all 8 literal core fixtures deep-compared against
  fixtures.json, with every fixture witness independently re-checked against
  both patterns by a test-side matcher; SCHEMA ladder (non-object, wrong
  type, missing/extra field, accessor, null-prototype object); capacity
  (16,384/16,385 UTF-16 units), unpaired surrogates, empty, 100/101 rows,
  one trailing LF stripped; per-row error order ROW_FORMAT → METHOD →
  PATTERN_LIMIT → PATTERN → DUP_PARAMETER with exact rows; grammar
  boundaries (literal 24/25, param name 16/17, 8/9 segments, tail final
  only); overlap semantics (duplicates, GET vs HEAD, tail extension,
  tail-needs-segment, root); an exhaustive property check over the
  {a, b, x} vocabulary comparing run() against brute-force path matching
  for every pattern pair (200+ pairs); serializeReport canonical bytes
  (exact expected string) and OUTPUT_LIMIT on a synthetic oversized result.
- `test/controller.test.mjs` — the 3 controller fixtures (state-dirty-error,
  state-cancel-late, state-replace-late) with a controllable fake Worker;
  wrong-generation replies ignored; edit-while-busy terminates the Worker;
  run-while-busy ignored; worker creation failure / worker error →
  WORKER_ERROR; reset from success clears the report.
- `test/download.test.mjs` — report bytes equal an independent
  test-side canonical serializer for every successful core fixture; one
  trailing LF, no BOM; key-order stability.
- `test/html.test.mjs` — both pages: lang/title/description/h1, robots
  noindex, no production canonical/hreflang, CSP `worker-src blob:`,
  path-only language/home links, all 17 control ids, visible label,
  no inline handlers/scripts, polite live region; zh/en message parity.
- `test/build.test.mjs` — build twice byte-identical; generated worker
  source embeds the exact core + handler bytes; serve smoke test
  (pages, MIME, HEAD, 404, traversal rejection).

## Spec errata

None. All printed fixtures reproduce exactly from the SPEC's own rules.

## Recorded interpretations (SPEC silent; documented for the reviewer)

- OUTPUT_LIMIT is surfaced as `{code: 'OUTPUT_LIMIT', field: null, row: null}`
  in the error state with all artifacts disabled (the SPEC pins the cap
  and the code but not the field/row).
- Any draft change moves the state to dirty, including the first keystroke
  from the pristine empty state (literal reading of the state table).
- The SPEC's `src/` file layout is superseded by the house format
  (`public/js/...`); see HANDOFF.md.

## NOT_RUN

- Real-browser rendering/interaction (including the Worker run, cancel,
  pagination, and Blob download in Chrome/Edge).
- Real devices/touch, assistive tech, measured contrast, 200% zoom,
  320 px reflow.
- Network/Storage audit with a clean isolated profile.
- Deployment.
- Independent nine-aspect review (pending by design in build-first mode).

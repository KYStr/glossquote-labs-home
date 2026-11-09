# Log Gap Audit — verification

Environment: Node v24.22.1, macOS/Linux VM, no network use by any command
below except the loopback HTTP probe. Candidate built from base
`fb6cb6e111bfd5f03a88afdcb730746d81538017` (`codex/initial-publication`).

## Commands and results (all exit 0)

| Command | Result |
| --- | --- |
| `npm test` | **43 pass / 0 fail** (core 23, report 5, controller 11, pages 4 — see below) |
| `npm run check` | pass (package contract, forbidden sinks, core/controller purity, CSP meta, bilingual metadata, required ids, serve headers) |
| `npm run build:preview` (×2) | byte-identical; worker bundle SHA-256 `67a9bb7844db482671b1b6e20be1ad0887d4d3e891cb2efa145c43f60f1f4bd9` on both runs |
| `npm run check:generated:preview` | pass (bundle + worker-source regenerate byte-identically; dist-preview = public/ + 2 generated files; 8 public files copied byte-identically) |
| Loopback HTTP probe (`node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview`) | `/` 200 text/html, `/en/` 200 text/html, `/js/app.js` 200, `/js/core/audit.mjs` 200, `/js/worker-source.mjs` 200, `/styles/app.css` 200; `/nope` 404, `/../package.json` 404, `/%2e%2e/package.json` 404; both titles correct; CSP + nosniff + X-Robots-Tag headers present. Server stopped after the probe. |

## Test detail

- `test/core.test.mjs` (23): all 7 literal fixtures from
  `docs/specs/log-gap-audit/fixtures.json` deep-compared, plus threshold
  grammar and threshold-first ordering, capacity 65,536/65,537 units,
  1,000/1,001 rows, unpaired surrogates vs a valid pair, row-format errors
  with source rows, sequence/time grammar, CRLF rejection, SCHEMA cases
  (non-object, missing/unknown field, wrong type, accessor getter),
  trailing-LF handling, SEQ_GAP from/to/count, threshold+1 vs equality,
  18-digit BigInt deltas, all-clean input.
- `test/report.test.mjs` (5): exact canonical bytes for the both-gaps
  report (hand-derived string), recursive UTF-16 key ordering, empty result
  (29 bytes), OUTPUT_LIMIT above 2,097,152 bytes, a just-under-limit report
  still succeeds.
- `test/controller.test.mjs` (11): the 3 controller fixtures
  (state-dirty-error, state-cancel-late, state-replace-late) with a fake
  worker whose delivery the test controls; edit/reset while busy; example
  load; file load + late-buffer discard; file read failure (INTERNAL);
  worker creation failure and worker onerror (WORKER_ERROR); stale
  generation ignored while busy.
- `test/pages.test.mjs` (4): exact SPEC metadata (lang/H1/title/description)
  on both pages, noindex, CSP meta, home/language links, FAQ, all required
  element ids, no remote assets, app.js bilingual strings + worker wiring,
  package.json contract.

One test expectation was fixed during the run (my own arithmetic, not the
product): the empty-report byte count is 29, not 30. One core-test row
number was fixed the same way (a single-row TIME case reports row 1).

## Interpretations (SPEC silent or ambiguous; reviewer may overrule)

1. Validation order: THRESHOLD → INPUT_LIMIT → EMPTY → ROW_LIMIT →
   UNICODE → ROW_FORMAT → SEQUENCE → TIME. This reconciles the step-1 field
   order (threshold, then records capacity, empty, row count) with the
   general “capacity, then surrogate, then grammar” rule, treating the two
   row-count/capacity checks as capacity and the per-row checks as grammar.
2. OUTPUT_LIMIT is surfaced as an error state with no download and no
   findings shown (all products disabled), matching “超過 OUTPUT_LIMIT 並停
   用所有產物”. Unreachable through the UI (1,000 rows bound the report to
   ~250 KB); enforced in `serializeReport` and tested synthetically.
3. A file that fails to decode as UTF-8 is decoded non-fatally; the resulting
   replacement characters then fail the core's grammar checks with the usual
   row errors. A file read failure itself is INTERNAL and keeps the draft.
4. The SPEC's `src/` layout is realized as `public/js/` per the consolidated
   house format (see HANDOFF.md); the worker architecture itself is
   implemented as specified.
5. Formal production canonical/hreflang/sitemap and the
   `https://glossquote.com` home links are pending the production gate; the
   preview uses relative `../../` home links and path-only language links,
   as in the other consolidated builds.

## Spec errata candidates

None.

## NOT_RUN

- Real-browser rendering/interaction (including the Worker Blob-URL path,
  cancel, file load, pagination, and Blob download in a browser)
- Real devices/touch, assistive tech, measured contrast, 200% zoom
- Chrome/Edge comparison, Network/Storage inspection
- Deployment
- Independent nine-aspect review (pending by design in build-first mode)

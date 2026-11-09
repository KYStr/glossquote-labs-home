# Verification — Pairwise Test Matrix

Environment: Node v24.22.1, `~/workspace/glossquote-factory/build3/pairwise-test-matrix/tools/pairwise-test-matrix`.
Base commit: `8941a010da5722f0b4690487938c4e32d2a2587f` (`codex/initial-publication`).

## Commands (all exit 0)

| Command | Result |
| --- | --- |
| `npm test` | 33 pass / 0 fail |
| `npm run check` | pass (package contract, forbidden sinks, core purity, worker-source in sync, pinned HTML metadata) |
| `npm run build:preview` (twice) | byte-identical, 9 files, SHA-256 `2c6ad350771956160eb73654a604dc94d403f01207ee763bcdab0eabbc2669f7` |
| `npm run check:generated:preview` | pass (dist-preview matches a fresh build) |
| Loopback HTTP probe (`node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview`) | `/` 200 text/html, `/en/index.html` 200 text/html, `/js/app.js` 200 text/javascript, `/js/core/pairwise.mjs` 200 text/javascript, `/styles/app.css` 200 text/css; `/../package.json` 404; `/nope.html` 404; `X-Robots-Tag: noindex, nofollow` on `/`; both titles correct |

## Test coverage (33 tests, `test/`)

- `core.test.mjs` — all 7 literal core fixtures from `fixtures.json`
  (deep-equal); trailing-LF rules; 3×3×3 greedy sequence; independent
  coverage recomputation (own pair-set implementation) over fixed inputs
  plus 12 deterministic LCG-generated inputs; validation edges
  (INPUT_LIMIT incl. the exact 1,024-unit boundary, EMPTY, ROW_LIMIT,
  DIMENSION_COUNT, DIMENSION/VALUE_COUNT/DUP_KEY/DUP_VALUE with rows,
  PRODUCT_LIMIT at 1,024 ok / 2,160 / 2,500 refused, lone vs paired
  surrogates, SCHEMA incl. accessor and inherited fields, inert
  malicious strings); capacity (5×5×5×4×4 = 2,000 runs in ~230 ms,
  6×6×6×5×2 = 2,160 refused).
- `controller.test.mjs` — all 3 literal controller fixtures
  (state-dirty-error, state-cancel-late, state-replace-late) with a fake
  executor; run-while-busy replaces the job; edit-during-busy terminates
  work; executor failure → WORKER_ERROR with draft kept; report only in
  success (exact canonical bytes); loadExample waits for a manual run.
- `download.test.mjs` — canonical key order (hand-written expected
  strings), one trailing LF, UTF-8 byte count, OUTPUT_LIMIT refusal
  (100,000-case synthetic report).
- `worker.test.mjs` — the exact embedded worker script (core + entry)
  imported with a fake `self`: posts the binary-triple outcome for the
  current generation, posts the PRODUCT_LIMIT error outcome, ignores
  messages without a generation.
- `html.test.mjs` — pinned H1/title/description/FAQ on both pages, robots
  + CSP meta, no inline scripts, no external URLs, no production
  canonical/hreflang, language/home links, design-baseline tokens.

## Corrections made during development (test-side, not product)

- The 3×3×3 hand-derived expectation was wrong in the first draft
  (a misread A–C pair for tuple (1,2,1)); the implementation was
  confirmed correct by an independent Python brute-force of the SPEC's
  greedy rule, and the test expectation was corrected to that verified
  sequence (7 rounds gain 3, then 3 rounds gain 2).
- The 1,024-unit boundary test first used a single-line input, which
  correctly reports DIMENSION_COUNT before grammar; the test now uses a
  two-line 1,024-unit input (→ DIMENSION row 1) and a 1,025-unit input
  (→ INPUT_LIMIT).
- `controller.loadExample` first returned a snapshot taken before the
  example flag was set; fixed to return the post-flag snapshot.

## Spec errata

None. Every printed fixture in `fixtures.json` reproduces exactly as
printed, including all three controller fixtures.

## Interpretations recorded (see HANDOFF.md)

Per-row validation order (row-by-row, not grouped by check kind);
`row: null` for UNICODE / ROW_LIMIT / PRODUCT_LIMIT / OUTPUT_LIMIT;
no production canonical/hreflang in the candidate per the SPEC's own
candidate rule; exactly-2,048 product unattainable under the caps;
edit-from-empty stays empty.

## NOT_RUN

- Real-browser rendering/interaction: actual module-Worker execution in
  Chrome/Edge, Blob download bytes, keyboard/focus walkthrough, 320 px
  and 200% zoom, reduced motion, 40% translation growth.
- Real devices/touch, assistive tech, measured contrast of the tool's own UI.
- Network/Storage zero-request observation (clean isolated profile),
  console/log checks, offline computation after load.
- Cross-browser comparison (Chrome + Edge), deployment, production
  HTTPS/SEO (canonical, hreflang, sitemap, robots.txt), independent
  nine-aspect review.

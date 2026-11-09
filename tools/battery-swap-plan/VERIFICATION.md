# Event Battery Swap Plan — Verification

Environment: Node v24.22.1, run in `tools/battery-swap-plan/` on 2026-11-09.
All commands exit 0 unless noted.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` | **49 pass / 0 fail** (fixtures 8, validation 17, algorithm 10, flow 9, scaffold 5 — the 5th scaffold test is the core-purity check) |
| `npm run check` | exit 0 — package contract, bilingual page structure, core purity + forbidden-capability scan, CSS remote-reference scan, all 8 literal fixture cases present, required files present |
| `npm run build:preview` (run 1) | exit 0 — 6 static files into `dist/` |
| `npm run build:preview` (run 2) | exit 0 — **byte-identical** (aggregate SHA-256 of the sorted per-file hashes `e55007be35449fc908c5c34e2b10af5a82f1d7cb304fe87061811b1a50ddde78` on both runs) |
| `npm run check:generated:preview` | exit 0 — "check:generated:preview OK (6 files identical)." |
| Loopback HTTP probe (`node scripts/serve.mjs 8321`) | `/` 200 (zh-Hant), `/en/` 200 (en), `/js/app.js` 200, `/js/core/solve.mjs` 200, path-traversal attempt 404. Response headers observed: the SPEC's CSP (`default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; worker-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'`) and `X-Content-Type-Options: nosniff`. Server killed after the probe. |

## What the tests cover

- **Literal fixtures (8/8, deepStrictEqual on the whole reply/result):** all 6
  `solve` cases from `fixtures.json` (`gaps-and-shortage`, `simultaneous`,
  `exact-end`, `swap-after-gap`, `zero-stock`, `overlap`) and both `flow` cases
  (`dirty-after-edit`, `cancel-then-late`) driven through the real state machine.
- **Validation:** SIZE boundary (65536 vs 65537 UTF-8 bytes), root TYPE,
  SHAPE unknown/missing keys (root, device, run), TYPE (string numbers,
  floats, `-0`, non-arrays, non-object rows), RANGE inclusive bounds
  (charged 0/100, runtime 10/1440, start 0/1439, end 1/1440, 1–8 devices,
  1–16 runs), name rules (empty/whitespace-only/25-code-point → RANGE;
  bad first/rest characters → TYPE; leading/trailing U+0020 trimmed; NFC
  duplicate `'\u00e9'` vs `'e\u0301'` → DUPLICATE at the second field;
  case-sensitive names stay distinct), ORDER (zero-length and reversed runs
  → `/devices/i/runs/j/end`), OVERLAP (touching segments pass; nested and
  unsorted inputs point at the later run's original-index start), and check
  ordering (SIZE → SHAPE → fields → DUPLICATE → ORDER → OVERLAP).
- **Algorithm (hand-derived):** several swaps inside one segment (0/10/20/30),
  pack exhausted exactly at a segment boundary (swap at the next segment
  start), touching segments with exhaustion at the last minute (no swap),
  full-day runtime (one load), closed gaps keeping remaining minutes, swap at
  the last working minute (1439), same-minute ordering by device input order
  (not name order), unused-stock counting, a 200-case deterministic
  conservation sweep (required == events.length, extra/unused arithmetic,
  firstMissing consistency, pack assignment i+1 ≤ charged, time/input-order
  sorting), and the worst case (8 devices × 144 events = 1,152 events, 8
  loads + 1,144 swaps).
- **Flow transitions:** empty → dirty → busy → ready, re-submit while busy
  ignored, wrong-runId settle ignored, cancel from busy → dirty with draft
  kept, cancel when not busy is a no-op, invalid draft → error keeping the
  draft (and edit back to dirty), run with no draft → error, `fail()` for
  form-level errors (ignored while busy), reset clearing a busy run, edit
  invalidating a pending run.
- **Scaffold:** required files, package contract, page metadata
  (lang/title/description/noindex/canonical/hreflang/home + language links),
  forbidden sinks/capabilities in `public/js`, core purity.

## Spec errata

**None.** Every printed fixture re-derives exactly from the SPEC's own rules
(checked against the AUTHOR-CHECK derivations: A keeps 10 minutes across the
gap and swaps at 50, B swaps at 30 and finishes exactly at 50; the overlap
fixture points at the later run's original-index start).

## Interpretations (SPEC silent; recorded for the reviewer)

- Cross-field order: name DUPLICATE is checked before ORDER, and ORDER is
  checked across all devices before OVERLAP. The SPEC pins ORDER before
  OVERLAP in the implementation section but does not place DUPLICATE among
  them.
- A name failing the character rules is TYPE; a name empty or over 24 code
  points after trim + NFC is RANGE.
- Form-level blank/malformed input is reported with the fixed codes
  REQUIRED / SYNTAX / RANGE / DUPLICATE on the offending field; the core
  only ever receives validated data, so its own error paths are exercised
  through the flow machine's `run()` validation step.
- The async run/cancel contract uses a runId-guarded `setTimeout(0)` settle
  around the synchronous bounded core instead of a separate `src/worker.mjs`
  (see HANDOFF.md); the worst case is 1,152 events in one short pass.
- The SPEC's "initialization failure shows Reload" affordance is not
  implemented: the page has no dynamic init step, and an inline fallback
  script would violate the pinned CSP (`script-src 'self'`).

## NOT_RUN

- Real-browser rendering/interaction (Chrome/Edge, keyboard, touch, 320 px,
  200% zoom, reduced motion, Network/Storage observation).
- Real devices/touch, assistive tech, measured contrast.
- Deployment, production HTTPS checks, independent nine-aspect review.

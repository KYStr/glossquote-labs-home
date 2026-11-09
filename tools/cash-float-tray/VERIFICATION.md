# Cash Float Tray — Verification

Environment: Node v24.22.1, run in `tools/cash-float-tray/` on 2026-11-09.
All commands exit 0 unless noted.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` | **38 pass / 0 fail** (fixtures 8, validation 8, algorithm 8, flow 9, scaffold 5) |
| `npm run check` | exit 0 — package contract, bilingual page structure, core purity + forbidden-capability scan, CSS remote-reference scan, all 8 literal fixture cases present, required files present |
| `npm run build:preview` (run 1) | exit 0 — 6 static files into `dist/` |
| `npm run build:preview` (run 2) | exit 0 — **byte-identical** (per-file SHA-256 diff clean; build manifests identical) |
| `npm run check:generated:preview` | exit 0 — "check:generated:preview OK (6 files identical)." |
| Loopback HTTP probe (`node scripts/serve.mjs 8321`) | `/` 200 (zh-Hant), `/en/` 200 (en), `/js/app.js` 200, `/js/core/solve.mjs` 200, path-traversal attempt 404. Response headers observed: the SPEC's CSP (`default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; worker-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'`) and `X-Content-Type-Options: nosniff`. Server killed after the probe. |

## What the tests cover

- **Literal fixtures (8/8, deepStrictEqual on the whole reply/result):** all 6
  `solve` cases from `fixtures.json` (`exact`, `non-greedy`, `tie`,
  `zero-target`, `inexact`, `duplicate`) and both `flow` cases
  (`dirty-after-edit`, `cancel-then-late`) driven through the real state machine.
- **Validation:** SIZE boundary (over/under 65536 UTF-8 bytes), root TYPE,
  SHAPE unknown/missing keys (root and per-row), TYPE (string numbers,
  floats, `-0`, NaN, booleans, null, non-array, non-object rows), RANGE
  inclusive bounds (target 0/10000, value 1/10000, count 0/99, 1–8 rows),
  DUPLICATE second-occurrence path, and check ordering (size → shape →
  fields → cross-field).
- **Algorithm (hand-derived):** single large note as best reachable sum,
  higher-denomination tie-break (6+4 beats 5+5 at target 10), fewest pieces
  wins, count caps respected (3×99 keeps 9 of target 10), max target 10000
  reaches 9999 with 100×99 + 1×99, input-order independence with descending
  rows, a 300-case deterministic conservation/reachability sweep
  (total = kept + removed, shortfall = target − kept, per-row conservation),
  and the worst-case size (8 denominations, target 10000) solving exactly.
- **Flow transitions:** empty → dirty → busy → ready, re-submit while busy
  ignored, wrong-runId settle ignored, cancel from busy → dirty with draft
  kept, cancel when not busy is a no-op, invalid draft → error keeping the
  draft, run with no draft → REQUIRED error, `fail()` for form-level errors,
  reset clearing a busy run, older replies never overwriting newer state.
- **Scaffold:** required files, package contract, page metadata
  (lang/title/description/noindex/canonical/hreflang/home + language links),
  forbidden sinks/capabilities in `public/js`, core purity.

## Spec errata

**None.** Every printed fixture re-derives exactly from the SPEC's own rules
(the DP was checked against the AUTHOR-CHECK derivations and the capacity
counter-example: target 10000 with 100×99 + 1×99 gives 10,000 reachable
states in the second generation, within the SPEC's 10,001-per-generation /
20,002-two-generation bounds).

## Interpretations (SPEC silent; recorded for the reviewer)

- Form-level blank/malformed input is reported with the fixed codes
  REQUIRED / SYNTAX / RANGE / DUPLICATE on the offending field; the core
  only ever receives validated data, so its own error paths are exercised
  through the flow machine's `run()` validation step.
- The async run/cancel contract uses a runId-guarded `setTimeout(0)` settle
  around the synchronous bounded DP instead of a separate `src/worker.mjs`
  (see HANDOFF.md); cancel-first and late-settle behaviour are covered by
  the flow tests.
- `pageshow` with `persisted=true` (bfcache restore) resets the form, per
  the SPEC's "離頁重設" rule.

## NOT_RUN

Real-browser rendering/interaction (including the SPEC's 8/5/4-keep-9 check,
cancel-during-compute, offline completion and Network/Storage observation),
real devices/touch, assistive tech, measured contrast of the tool's own UI,
cross-browser Chrome/Edge checks, 320 CSS px / 200% zoom checks, deployment,
production HTTPS verification, and the independent nine-aspect review
(pending by design in build-first mode).

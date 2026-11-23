# Barbell Plate Calculator （槓鈴配重）— Production HANDOFF

- Spec: `spec-barbell-plate-calculator-20261121`, draft spec PR #373
  (base `codex/initial-publication`, head
  `f7c0d421cc5047de101383f241f6e0faa4fbe638`, OPEN at build time).
  Registry rev 1712 (per parent task).
- Spec source (fixed): `docs/specs/barbell-plate-calculator/` at the spec
  PR head above — `SPEC.md` (8 sections), `BRIEF.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`. `test/fixtures.json` in this tool is a
  byte-identical vendored copy (SHA-256
  `8c2ac601ad73b38f573fabdf99c3d18095b70674cda28e04bd6c74ed01d323fd`,
  verified against the spec PR head via the GitHub API: the blob at
  that head decodes to the same SHA-256 as the run-6 spec workspace
  copy).
- Production target: `tools/barbell-plate-calculator/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/barbell-plate-calculator-production-20261121`, base
  `codex/initial-publication`. Build-first (no registry production
  registration in this run, per the run-6 production mode: build +
  draft PR + parent verification + ledger).
- Builder: run-6 production builder subagent (parent orchestrator
  session c194ec5a-949c-5f98-8c2e-a43de40dc53d). User confirmed
  continuation four times on 2026-11-23 (14:31, 14:33:56, 14:58:49,
  15:04:46); the same execution-risk prompt class that stopped the
  first production wave at clone/fetch re-appeared during this build
  (on the `find` read of the run-5 exemplar directory and on the
  clone/checkout poll) and was continued past under that
  authorization — glossquote-repo content only, no other content,
  credentials, outbound sends, or deletion involved.

## What was built

- Pure core `public/js/core/barbell-plate-calculator.mjs`: `run(input)`
  validates in the SPEC order (capacity INPUT_LIMIT → surrogate
  UNICODE → EMPTY → NUMBER_FORMAT/INTEGER_FORMAT → RANGE →
  NOT_MULTIPLE, targetKg, barKg, then pairs largest to smallest,
  then the cross-field TARGET_BELOW_BAR), computes entirely in
  integer 0.125 kg units (no floating point anywhere in the
  derivation), loads the pinned IWF plate set (25 / 20 / 15 / 10 /
  5 / 2.5 / 1.25 kg) greedily largest-first capped by the available
  pairs, and returns the fixture-shaped result `{targetKg, barKg,
  perSideKg, platesPerSide, platesPerSideCount, loadedPerSideKg,
  achievedKg, remainderPerSideKg, reachable, nextUpKg}`. nextUpKg
  follows the SPEC's pinned definition (one more plate of the
  smallest denomination that still has a spare pair — explicitly
  not a proven global minimum). `formatKg` renders kg numbers with
  at most 3 decimals and stripped trailing zeros, derived from the
  exact unit count. Fixed report
  `barbell-plate-calculator-report.json` (canonical JSON, UTF-16 key
  order, one trailing LF, 2 MiB limit).
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions, h1,
  FAQ answers, disclaimer in both languages, preview noindex, no
  canonical/hreflang, same-language home links (`../../` /
  `../../en/`), draft-loss note, bar quick-select buttons (20 / 15 /
  10 kg). Unreachable results show a text + symbol (⚠) remainder
  note, not colour alone.
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **EMPTY position is not pinned.** SPEC pins the validation order
   as capacity → surrogate → grammar and defines EMPTY for missing
   content, but never says where EMPTY sits relative to grammar.
   The implementation follows the house pattern (capacity →
   surrogate → EMPTY → grammar → range → multiple). If the reviewer
   intends an empty field to be NUMBER_FORMAT/INTEGER_FORMAT
   instead, the SPEC must say so. No core fixture has an empty
   input, so all 14 literal core cases pass either way.
2. **SPEC implementation section uses a `src/` layout that
   contradicts the repo's established tool layout.** SPEC says
   `src/core.mjs`, `src/controller.mjs`, `src/app.mjs`; every
   run-5/run-6 production (and the parent task brief) uses
   `tools/<slug>/public/js/core/*.mjs`, `public/js/app.js`, and
   `scripts/`. The implementation follows the house layout. No
   functional difference, but the SPEC text should be aligned.
3. **SPEC tests sentence "移除任一面額上限後貪心結果不會變重" is
   ambiguous.** Read as "achievedKg still never exceeds targetKg
   after removing a cap", it holds (tested over a grid in
   test/core.test.mjs). Read as "achievedKg never exceeds its
   pre-removal value", it is FALSE for the pinned greedy algorithm:
   target 140, bar 15, pairs 25:1/15:2/5:1/1.25:1 loads 137.5 kg,
   but with pairs25 lifted to 10 the greedy takes two 25 kg plates
   and strands the remainder, loading only 127.5 kg — and the
   reverse direction also occurs (target 101, bar 20, all pairs 0
   → achieved 20 kg; lifting pairs25 to 10 → achieved 70 kg). The
   SPEC should pin which reading is intended; the implementation
   follows greedy regardless.
4. **Task-brief path note:** the parent task cited the spec at
   `home clone docs/specs/barbell-plate-calculator/`; the actual
   fixed spec used here lives in the run-6 spec workspace
   `build6/specs/barbell-plate-calculator/docs/specs/barbell-plate-calculator/`
   (same content, verified byte-identical fixtures against spec PR
   #373 head `f7c0d421…`). No content difference; only the path in
   the brief was stale.

## Verification

See `VERIFICATION.md` for commands, exits, test counts, and the two
build hashes. Browser / Network / Storage / compatibility evidence is
NOT_RUN (no isolated browser available to this builder; see
VERIFICATION.md) — the independent reviewer must run the nine-aspect
gates on the same PR head.

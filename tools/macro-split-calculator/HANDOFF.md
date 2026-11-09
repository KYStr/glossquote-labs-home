# Handoff — Macro Split Calculator (build-first production candidate)

## Fixed source

- Repository: `KYStr/glossquote-labs-home`
- Spec task: `labs-macro-split-calculator-spec-20261109`
- Spec: `docs/specs/macro-split-calculator/SPEC.md` (spec-macro-split-calculator-20261109, v1),
  `docs/specs/macro-split-calculator/BRIEF.md`, `docs/specs/macro-split-calculator/fixtures.json`,
  `docs/specs/macro-split-calculator/AUTHOR-CHECK.md`
- Spec candidate commit: `2a24708ad8b9e10c5631f58e896dd005b069eb8b`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/151
- Implementation base: `codex/initial-publication` at
  `b7ffa5a133ac7a2b3221d0807e61c2c3faa48442` (branch tip when the build
  branch was created); implementation branch
  `muse/macro-split-calculator-production-20261109`.
- Implementation scope: `tools/macro-split-calculator/` only. Nothing
  outside this directory was touched; no registry/coordination commands
  were run. The parent verifies the PR head and handles any registry
  submission.

Because the spec PR is not merged into the base branch,
`docs/specs/macro-split-calculator/` does not exist in this checkout. The
spec's fixtures.json is therefore vendored verbatim at
`test/fixtures.json` (byte-identical copy of the file at the spec
candidate commit), and the tests and static check read that copy. The
vendored file keeps the spec's own `specId`
(`spec-macro-split-calculator-20261109`), which the check asserts.

## What was built

A bilingual (zh-Hant / en) static tool that converts a user-given daily
calorie target and a diet ratio into grams of protein, carbs and fat:

- Pure core (`public/js/core/macro.mjs`): strict schema (exactly the six
  string fields, own data properties only, accessors rejected), field
  validation in the SPEC's order (`calories` → `preset` → custom pct
  fields + ratio sum → `meals`; per field INPUT_LIMIT → EMPTY →
  INTEGER_FORMAT / ENUM → RANGE, with RATIO_SUM after the three pct
  fields pass), and exact integer arithmetic throughout: grams
  `floor((2*T*pct + 100*f) / (200*f))`, residual absorbed by the largest
  macro (max `T*pct`, ties in protein/carbs/fat order) with
  `deltaG = floor((2R + f_L) / (2*f_L))` under mathematical floor,
  display-only `targetKcal`, and per-meal splits with remainders to the
  earliest meals. Canonical report serialization (keys sorted by UTF-16
  code units recursively, compact, one trailing LF, non-data values never
  carried over so an input's `toJSON` is never invoked) with the
  2,097,152-byte OUTPUT_LIMIT.
- Controller (`public/js/controller.mjs`): empty / dirty / busy /
  success / error / cancelled state machine with generation IDs; only a
  reply carrying the current generation while busy is accepted, so late
  replies can never resurrect a cancelled or replaced result. The public
  state exposes `reportAvailable` (the SPEC's controller fixtures check
  exactly this name).
- App (`public/js/app.js`): DOM wiring with textContent/value only; the
  five preset radios are the single source of truth for `preset`; the
  adjusted macro is marked with ＊ in the table plus a text note;
  computation runs in a module Worker created from a Blob URL of the
  fixed worker source embedded by the build
  (`dist-preview/js/worker-source.js`, generated from the fixed bytes of
  the core + `public/js/worker-handler.mjs`). The fixed download
  `macro-split-report.json` is created only on an explicit click, its
  Blob URL revoked on invalidation or after 30 s. Reset restores the
  SPEC defaults and focuses the first preset radio.
- Pages: `public/index.html` (zh-Hant) and `public/en/index.html` (en),
  with the SPEC-pinned titles, descriptions, H1s, section headings, both
  FAQ answers, the verbatim general-nutrition note, preview `robots`
  noindex/nofollow, same-language home links (`../../` / `../../en/`),
  relative language links, and the draft-loss note.

## Recorded interpretations (SPEC silent or ambiguous)

1. **Candidate metadata:** the generic template asks for canonical +
   hreflang cross-links, but the SPEC's static-content gate pins the
   candidate to robots noindex/nofollow with no production canonical,
   hreflang, or sitemap, and language links carrying paths only. The
   SPEC (the fixed contract) wins. The planned production origin named
   in the SPEC is not configured, so the build refuses
   `--mode production`.
2. **`preset` carries no INPUT_LIMIT capacity:** the SPEC states the
   8-unit raw cap only for `calories` and for each pct field ("raw
   每欄最多 8 字元"), and states none for `preset`. Its longest pinned
   enum value, `high-protein`, is 12 units — applying the numeric
   fields' cap to `preset` would make a pinned preset unreachable and
   contradict the SPEC's own preset table. So `preset` is checked EMPTY
   then ENUM only, preserving the SPEC's stated check order. Recorded
   also as a minor spec-errata candidate in VERIFICATION.md for the
   reviewer to confirm.
3. **`meals` carries no INPUT_LIMIT capacity:** the SPEC restates the
   8-unit cap explicitly for the pct fields but not for `meals` ("否則
   同整數字串文法，範圍 1–6"). A long digit string therefore parses and
   fails RANGE rather than INPUT_LIMIT. All other `meals` checks follow
   the shared integer grammar.
4. **No UNICODE error in this SPEC:** unlike sibling specs, this SPEC
   defines no UNICODE code; a lone surrogate simply fails the ASCII
   integer grammar (INTEGER_FORMAT) or the enum (ENUM). Tests pin this.
5. **Layout of the core:** the SPEC's implementation section names
   `public/js/worker.mjs` for the fixed message handler, while the house
   pattern in this repo (IMPLEMENTATION-CHECKLIST + sibling tools) uses
   `public/js/core/*.mjs`, `public/js/app.js`, and a
   `public/js/worker-handler.mjs` fragment that the build concatenates
   after the core into the fixed worker source. The house layout governs
   file paths; the SPEC governs behavior — the handler fragment is the
   fixed message handler, byte-concatenated exactly as the SPEC's
   "embed the fixed core and fixed handler" rule requires.
6. **Status copy:** the SPEC pins the dirty, busy, and cancelled status
   strings verbatim; the empty-state line follows the sibling tools'
   wording in both languages. Error strings are localized per the SPEC's
   error table; the RATIO_SUM message names the fixed rule.

## Verification (see VERIFICATION.md for commands and hashes)

- `npm test`: 43 pass / 0 fail (8 literal core fixtures and 3 controller
  fixtures verbatim from the vendored fixtures.json, hand-derived
  endpoint/tie/meals cases, validation classes and order, invariants
  sweep, report byte literals, page structure).
- `npm run check`: pass (files, package contract, ranges/presets/
  factors/defaults/example vs the vendored fixtures, bilingual metadata
  incl. the verbatim nutrition note, syntax incl. the worker
  concatenation, forbidden-capability scan, core purity).
- `npm run build:preview` run twice: byte-identical (per-file SHA-256).
- `npm run check:generated:preview`: pass (manifest hashes, metadata,
  worker source equals the fixed bytes, robots.txt denies all).
- Loopback HTTP probe: both language pages 200 with correct titles,
  assets 200, traversal rejected.

## Spec errata

No fixture-vs-rule conflicts: all 8 literal core fixtures reproduce
exactly from the SPEC's stated integer formulas (independently
recomputed with an exact-rational scratch implementation before the
product code existed), and the 3 controller fixtures pass verbatim. One
minor ambiguity (the `preset` capacity question, interpretation 2 above)
is recorded in VERIFICATION.md as a candidate for the spec reviewer.

## NOT_RUN

Real-browser rendering/interaction (including the actual Worker + Blob
flow and the native download dialog), real devices/touch, assistive
tech, measured contrast, cross-browser comparison, deployment, and the
independent nine-aspect review (pending by design in build-first mode).

## Next owner

Independent reviewer (parent verifies the PR head first). Do not merge,
publish, or deploy from this branch without the reviewer's acceptance and
the coordinator's approval.

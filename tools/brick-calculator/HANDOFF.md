# Brick Calculator （磚塊用量計算）— Production HANDOFF

- Spec: `spec-brick-calculator-20261121`, draft spec PR #384
  (base `codex/initial-publication`, head
  `f3a6e9d8b1047c2ad8aca895911bdc5eaa70bdbc`, OPEN at build time).
  Registry rev 1767 (per parent task).
- Spec source (fixed): `docs/specs/brick-calculator/` at the spec
  PR head above — `SPEC.md` (8 sections), `BRIEF.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`. `test/fixtures.json` in this tool is a
  byte-identical vendored copy (SHA-256
  `bdc037d46a01788bf347235722248f1fe8fc974dc03849caeda9b66102307596`,
  verified against the spec PR head via the GitHub API).
- Production target: `tools/brick-calculator/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/brick-calculator-production-20261121`, base
  `codex/initial-publication`. Build-first (no registry production
  registration in this run, per the run-6 production mode: build +
  draft PR + parent verification + ledger).
- Builder: run-6 production builder subagent (fourth wave; parent
  orchestrator session 5f578d5f-a6c4-f32d-f85b-e1030165fc05). User
  confirmed continuation four times on 2026-11-23 (14:31, 14:33:56,
  14:58:49, 15:04:46); the same execution-risk prompt class that
  stopped the first production wave at clone/fetch re-appeared
  during this build (on the `git clone` step) and was continued past
  under that authorization — glossquote-repo content only, no other
  content, credentials, outbound sends, or deletion involved.

## What was built

- Pure core `public/js/core/brick-calculator.mjs`: `run(input)`
  validates in the SPEC order (capacity INPUT_LIMIT → surrogate
  UNICODE → EMPTY → grammar → RANGE, fields in the SPEC order
  wallLengthM, wallHeightM, openings per row, brickPreset, brick
  dimensions, jointMm, wastePct; then the cross-field opening-area
  RANGE). All derivation is exact BigInt rational arithmetic in
  0.1 mm units — no floating point ever participates; rounding is
  half-up, applied only at final output. Net bricks =
  ceil(exact count); bricks to buy = ceil(exact count × (1 +
  waste)), waste applied once to the unrounded exact count, never to
  the already-rounded integer; mortar = wall volume − brick volume,
  exactly 0 with a 0 mm joint. Presets: taiwan-red 230×60×110,
  uk-standard 215×65×102.5, us-modular 194×57×92 mm (nominal sizes).
  Fixed report `brick-calculator-report.json` (canonical JSON,
  UTF-16 key order, one trailing LF, 2 MiB limit).
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected. The draft holds the SPEC's
  reset-default shape; the three custom brick dimensions live in the
  draft only while brickPreset is "custom" (added blank on choosing
  custom, removed on choosing a preset), so the posted snapshot never
  carries them for a non-custom preset.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions, h1,
  FAQ answers, structural disclaimer in both languages, preview
  noindex, no canonical/hreflang, same-language home links (`../../` /
  `../../en/`), draft-loss note. Openings are dynamic rows (up to 10,
  each with width/height inputs and a remove button); custom brick
  dimensions appear only for the custom preset.
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Interpretation notes (SPEC text followed literally; no spec file changed)

1. **Missing custom dimensions are SCHEMA with field null.** The
   SPEC's blanket rule says 缺欄/錯型別/accessor/未知皆 SCHEMA with
   field,row=null; only the non-custom-carrying-dimensions rule names
   the column explicitly. So a custom preset missing a dimension
   returns SCHEMA field null, while a non-custom preset carrying one
   returns SCHEMA naming that column. If the reviewer wants the
   column named for the missing case too, the SPEC should say so.
2. **Brick-dimension integer grammar rejects leading zeros**
   ("0200" → INTEGER_FORMAT), matching the run-5 house integer
   pattern; decimal fields accept leading zeros. No fixture covers
   either; the SPEC does not pin leading-zero handling.
3. **Preset capacity:** brickPreset has no stated raw-unit limit; a
   present-but-empty preset is SCHEMA (off-enum), and an over-long
   preset string is INPUT_LIMIT (12 units, same cap as the numeric
   fields). No fixture covers this.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **Task-brief path note:** the parent task cited the spec at
   `home clone docs/specs/brick-calculator/`; the actual fixed spec
   used here lives in the run-6 spec workspace
   `build6/specs/brick-calculator/docs/specs/brick-calculator/`
   (same content, fixtures verified byte-identical against spec PR
   #384 head `f3a6e9d8…`). No content difference; only the path in
   the brief was stale.
2. **No fixture-level conflict found.** All 11 core fixtures and all
   3 controller fixtures match the implementation exactly under the
   SPEC's formulas (independently re-derived with exact fractions in
   Python before building: all 8 success cases MATCH). The two
   hand-corrections recorded in AUTHOR-CHECK.md (max-waste mortar
   litres 70.5, custom-brick height 60 mm) are already reflected in
   the fixtures and were not re-introduced.

## Verification

See `VERIFICATION.md` for commands, exits, test counts, and the two
build hashes. Browser / Network / Storage / compatibility evidence is
NOT_RUN (no isolated browser available to this builder; see
VERIFICATION.md) — the independent reviewer must run the nine-aspect
gates on the same PR head.

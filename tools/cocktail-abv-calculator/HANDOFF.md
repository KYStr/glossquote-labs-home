# Cocktail ABV Calculator （調酒酒精度）— Production HANDOFF

- Spec: `spec-cocktail-abv-calculator-20261121`, draft spec PR #386
  (base `codex/initial-publication`, head
  `895f495d114ad4b39e954591ca42bfe900e01fa6`, OPEN at build time).
  Registry rev 1777 (per parent task).
- Spec source (fixed): `docs/specs/cocktail-abv-calculator/` at the spec
  PR head — `SPEC.md` (8 sections), `BRIEF.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`. `test/fixtures.json` in this tool is a
  byte-identical vendored copy (SHA-256
  `8d12f9c130377314ec3153f42f35da30d8b0c4a402f4386246d1219adb1fe0b8`,
  verified against the spec PR head via the GitHub API
  (`contents/docs/specs/cocktail-abv-calculator/fixtures.json` at
  `895f495d114ad4b39e954591ca42bfe900e01fa6`).
- Production target: `tools/cocktail-abv-calculator/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/cocktail-abv-calculator-production-20261121`, base
  `codex/initial-publication`. Build-first (no registry production
  registration in this run, per the run-6 production mode: build +
  draft PR + parent verification + ledger).
- Builder: run-6 production builder subagent, fourth wave (parent
  orchestrator session 5f578d5f-a6c4-f32d-f85b-e1030165fc05). User
  confirmed continuation four times on 2026-11-23 (14:31, 14:33:56,
  14:58:49, 15:04:46); the same execution-risk prompt class that
  stopped the first production wave at clone/fetch re-appeared during
  this build (on the initial clone) and was continued past under that
  authorization — glossquote-repo content only, no other content,
  credentials, outbound sends, or deletion involved.

## What was built

- Pure core `public/js/core/cocktail-abv.mjs`: `run(input)` validates
  in the SPEC order (shape → row count → per-row name, volumeMl,
  abvPct; capacity INPUT_LIMIT → EMPTY → NUMBER_FORMAT → RANGE,
  name INPUT_LIMIT → UNICODE), computes with exact BigInt decimal
  arithmetic (no binary floating point in any calculation), rounds
  half-up to 1 decimal once at output, totals from unrounded sums,
  and returns the fixture-shaped result `{rows, totalVolumeMl,
  totalAlcoholMl, totalAlcoholG, totalAbvPct, standardDrinks}` with
  per-row `{row, name, volumeMl, abvPct, alcoholMl, alcoholG}`.
  Pinned constants: ethanol density 0.789 g/ml (20 °C, OIML R 22),
  Taiwan 1 standard drink = 10 g pure alcohol (MOHW 2023-07-14).
  Omitted or empty names display as 「材料 n」. Fixed report
  `cocktail-abv-report.json` (canonical JSON, UTF-16 key order, one
  trailing LF, 2 MiB limit).
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected. Draft is `{ingredients: [...]}`;
  the app edits one field at a time, adds rows (up to 6) and removes
  rows (down to 2); `editDraft` replaces the whole draft at once.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions, h1,
  FAQ answers, disclaimer / MOHW guidance / volume-contraction
  disclosure in both languages, preview noindex, no
  canonical/hreflang, same-language home links (`../../` /
  `../../en/`), draft-loss note. Ingredient rows are built by app.js
  (2–6 rows, add/remove controls).
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **Default display name language:** SPEC §4 says an omitted or
   empty name displays as 「材料 n / Ingredient n」, which reads as
   two language variants, but the result object carries a single
   `name` string and the only literal evidence — the
   `state-cancel-late` fixture's `lateResult` rows — uses 「材料 1」
   / 「材料 2」. The implementation uses 「材料 n」 for every
   default name. If the reviewer wants a language-dependent default,
   the fixtures and §4 must be revised together.
2. **Report number formatting:** the SPEC fixes the report as the
   result's compact JSON but does not pin a float formatter. The
   implementation uses JavaScript `JSON.stringify`, so integral
   values render without a decimal point (`18`, not `18.0`); a
   Python canonicalizer renders the same JSON numbers as `18.0`.
   Both denote identical JSON numbers. The byte-exact report tests
   pin the JavaScript form (margarita 359 bytes, negroni 368 bytes).
   If the reviewer wants `18.0` in the bytes, §4 must pin a
   formatter explicitly.
3. **Task-brief path note:** the parent task cited the spec at
   `home clone docs/specs/cocktail-abv-calculator/`; the actual fixed
   spec used here lives in the run-6 spec workspace
   `build6/specs/cocktail-abv-calculator/docs/specs/cocktail-abv-calculator/`
   (same content, verified byte-identical fixtures against spec PR
   #386 head). No content difference; only the path in the brief was
   stale.

## Verification

See `VERIFICATION.md` for commands, exits, test counts, and the two
build hashes. Browser / Network / Storage / compatibility evidence is
NOT_RUN (no isolated browser available to this builder; see
VERIFICATION.md) — the independent reviewer must run the nine-aspect
gates on the same PR head.

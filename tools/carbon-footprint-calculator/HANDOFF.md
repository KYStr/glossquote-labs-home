# Carbon Footprint Calculator （碳足跡計算）— Production HANDOFF

- Spec: `spec-carbon-footprint-calculator-20261121`, draft spec PR #402
  (base `codex/initial-publication`, head
  `5ce91f2f044624b42522398aa51b90d90fcecf10`, OPEN at build time).
  Registry rev 1857 (per parent task).
- Spec source (fixed): `docs/specs/carbon-footprint-calculator/` at the spec
  PR head above — `SPEC.md` (8 sections), `BRIEF.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`. `test/fixtures.json` in this tool is a
  byte-identical vendored copy (SHA-256
  `dd84d4401036eac5313242675b3cc2eedfd545f3f0a5e539159cfab27452b0d5`,
  verified against the spec PR head via the GitHub API). The parent
  task cited the spec at `home clone
  docs/specs/carbon-footprint-calculator/`; the actual fixed spec used
  here lives in the run-6 spec workspace
  `build6/specs/carbon-footprint-calculator/docs/specs/carbon-footprint-calculator/`
  (same content, verified byte-identical fixtures against spec PR
  #402 head `5ce91f2f…`). No content difference; only the path in the
  brief was stale.
- Production target: `tools/carbon-footprint-calculator/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/carbon-footprint-calculator-production-20261121`, base
  `codex/initial-publication`. Build-first (no registry production
  registration in this run, per the run-6 production mode: build +
  draft PR + parent verification + ledger).
- Builder: run-6 production builder subagent (parent orchestrator
  session 15c35ddd-7029-464f-8205-7ba4b616fc71). User confirmed
  continuation four times on 2026-11-23 (14:31, 14:33:56, 14:58:49,
  15:04:46); the same execution-risk prompt class that stopped the
  first production wave at clone/fetch re-appeared during this build
  (on the `git clone` step) and was continued past under that
  authorization — glossquote-repo content only, no other content,
  credentials, outbound sends, or deletion involved.

## What was built

- Pure core `public/js/core/carbon-footprint.mjs`: `run(input)`
  validates in the SPEC order (object shape SCHEMA, then per field
  capacity INPUT_LIMIT → surrogate UNICODE → EMPTY → grammar
  DECIMAL_FORMAT / enum SCHEMA → RANGE, in the SPEC's 14-field
  order), then computes the six categories with exact integer
  arithmetic (BigInt: decimal inputs parsed to integer hundredths,
  every category an exact rational over a common denominator) and
  rounds half away from zero to 1 decimal once on the unrounded
  value. The total is the unrounded sum rounded — never the sum of
  the rounded categories (pinned by a hand-derived test: bus 25 km +
  rail 25 km gives categories 2.6 + 0.9 but total 3.4, not 3.5).
  All-zero input yields total 0.0 with all six shares 0.0 (no NaN).
  The pinned factor table (electricity 0.471, gasoline 2.31, diesel
  2.68, bus 0.102, rail 0.035, short-haul flight 0.153, long-haul
  flight 0.148, beef 99.5, pork 12.3, poultry 9.9, farmed fish 13.6,
  eggs 4.7, rice 4.5) and the pinned bilingual estimate disclaimer
  are exported from the core. Fixed report
  `carbon-footprint-report.json` (canonical JSON, UTF-16 key order,
  one trailing LF, 2 MiB limit).
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions, h1,
  FAQ answers, disclaimer in both languages, factor table, Taiwan
  2024 per-capita context line (11.7 tonnes CO2e, reference only),
  preview noindex, no canonical/hreflang, same-language home links
  (`../../` / `../../en/`), draft-loss note. Fuel type is a
  two-option select (gasoline / diesel); the other thirteen fields
  are text inputs.
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **Validation order wording is ambiguous.** SPEC inputsOutputs
   rule 1 says 「先容量、再物件形狀、再逐欄驗證」 (capacity, then
   object shape, then per-field validation). Capacity is a property
   of a field value, so it cannot be assessed for a non-object,
   wrong-key, or accessor input before the shape check; the
   implementation therefore checks object shape (SCHEMA) first and
   then per-field capacity → surrogate → empty → grammar → range,
   which is also the run-5 house order and matches every literal
   fixture (no fixture conflicts: `decimal-format-error` "12.345" is
   6 units, `bad-fuel-type` "electric" is 8 units, both inside the
   12-unit cap, so their expected codes are unaffected by the
   reading). If the reviewer wants capacity to precede shape, the
   SPEC must define what capacity means for a non-object input.
2. **Report number format is under-specified.** SPEC inputsOutputs
   pins the report as "result 的 compact JSON" with sorted keys and
   one trailing LF, but does not pin how non-integer numbers
   serialize (e.g. `102` vs `102.0` for a 102.0 kg value). The
   implementation uses JSON's shortest round-trip form (`102`,
   `9076.4`, `0`), and the report test's expected literal (301
   bytes for typical-household) is derived under that rule. If the
   reviewer expects another float format, the SPEC must pin it.
3. **Layout wording vs checklist.** The SPEC implementation section
   names `src/core.mjs`, `src/controller.mjs`, `src/app.mjs`, while
   IMPLEMENTATION-CHECKLIST.md and the parent task pin
   `public/js/core/*.mjs`, `public/js/controller.mjs`,
   `public/js/app.js`. The implementation follows the checklist/task
   layout (the same layout as the other run-6 productions). No
   behavioural difference; only the SPEC's shorthand path names are
   stale.

## Verification

See `VERIFICATION.md` for commands, exits, test counts, and the two
build hashes. Browser / Network / Storage / compatibility evidence is
NOT_RUN (no isolated browser available to this builder; see
VERIFICATION.md) — the independent reviewer must run the nine-aspect
gates on the same PR head.

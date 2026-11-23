# Freelance Rate Calculator （接案費率試算）— Production HANDOFF

- Spec: `spec-freelance-rate-calculator-20261121`, draft spec PR #374
  (base `codex/initial-publication`, head
  `468c6cd604644154701002a52c3d6949c3f726a0`, OPEN at build time).
  Registry rev 1717 (per parent task).
- Spec source (fixed): `docs/specs/freelance-rate-calculator/` at the spec
  PR head above — `SPEC.md` (8 sections), `BRIEF.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`. `test/fixtures.json` in this tool is a
  byte-identical vendored copy (SHA-256
  `74d66bc65236d693cb1f0827d728417c5b86ccddfc97926ded242634ddd1a1c9`,
  verified against the spec PR head via the GitHub API: blob SHA
  `630139c17fe0f13e9f6d3bfd2f731b1dc2a9fe7c` matches `git hash-object`
  of the vendored copy).
- Production target: `tools/freelance-rate-calculator/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/freelance-rate-calculator-production-20261121`, base
  `codex/initial-publication`. Build-first (no registry production
  registration in this run, per the run-6 production mode: build +
  draft PR + parent verification + ledger).
- Builder: run-6 production builder subagent (second production wave,
  parent orchestrator session 2a2cb180-1507-46b7-a2b9-5a882115355f).
  User confirmed continuation four times on 2026-11-23 (14:31,
  14:33:56, 14:58:49, 15:04:46); the same execution-risk prompt class
  that stopped the first production wave at clone/fetch re-appeared
  during this build (on the clone `exec` result) and was continued
  past under that authorization — glossquote-repo content only, no
  other content, credentials, outbound sends, or deletion involved.

## What was built

- Pure core `public/js/core/freelance-rate.mjs`: `run(input)` validates
  in the SPEC order (capacity INPUT_LIMIT → surrogate UNICODE → EMPTY
  → INTEGER_FORMAT / DECIMAL_FORMAT → RANGE, in the field order
  targetAnnualIncome, workingDaysPerYear, hoursPerDay,
  billableUtilizationPercent, overheadPercent), then derives the six
  outputs with exact rational arithmetic (BigInt numerator /
  denominator; no binary float in derivation or rounding). Rounding
  is half-up, applied exactly once at output: amounts to whole NT$,
  billable days/hours to one decimal; the rates are computed from the
  unrounded exact values, never from rounded intermediates. Result
  shape follows the fixtures exactly: `{grossTarget, billableDays,
  billableHours, dayRate, hourlyRate, monthlyTarget}`. Fixed report
  `freelance-rate-calculator-report.json` (canonical JSON, UTF-16 key
  order, one trailing LF, 2 MiB limit).
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions, h1,
  FAQ answers, quote note in both languages, preview noindex, no
  canonical/hreflang, same-language home links (`../../` /
  `../../en/`), draft-loss note, pre-filled SPEC reset defaults.
  Displayed amounts use thousands separators; machine values never
  change with locale.
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Verification notes

- All 8 success fixtures were independently re-derived twice before
  building: once with Python `fractions.Fraction` + `decimal`
  ROUND_HALF_UP (all 8 match), and again inside the test suite with a
  separate scaled-integer derivation. A dedicated test proves the
  rates use unrounded exact values (201 days × 62.5% → dayRate 7960,
  not 7962 from the rounded 125.6 days).
- Decimal grammar judgement (see errata 3): the SPEC is silent on
  leading zeros for decimal fields; the implementation applies the
  same canonical "0 or non-zero leading" rule the house pattern uses
  for decimals, so "08" is DECIMAL_FORMAT.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **Layout paths: SPEC §implementation cites `src/core.mjs`,
   `src/controller.mjs`, `src/app.mjs`, but the house file contract
   (IMPLEMENTATION-CHECKLIST and the build brief) places the core at
   `public/js/core/*.mjs`, the controller at
   `public/js/controller.mjs`, and the app at `public/js/app.js`.**
   The implementation follows the house layout. Suggested fix: revise
   the SPEC §implementation paths to the `public/js/` layout.
2. **Example equals defaults: fixtures.json case 1 (the "load
   example" input) is byte-identical to the SPEC reset defaults**
   (1200000 / 220 / 8 / 70 / 20), so loading the example from a fresh
   page changes no field value — only the example note appears. Not
   a defect in the calculation, but the example cannot demonstrate a
   change from the initial state. Suggested fix: pick a distinct
   example input (or note in the SPEC that the example coincides with
   the defaults).
3. **Decimal leading-zero rule unstated: SPEC §4 pins "0 或非零開頭"
   for the integer fields, but the decimal-field sentence only says
   "最多 1 位小數，無空白／符號／指數" — silent on leading zeros**
   ("08", "070"). The implementation applies the same canonical rule
   as the house decimal pattern, so "08" is DECIMAL_FORMAT. If the
   reviewer intends leading zeros to be legal for decimals, §4 must
   say so explicitly.

All 14 core fixtures and all 3 controller fixtures match the
implementation exactly; no fixture was excluded or altered.

## Verification

See `VERIFICATION.md` for commands, exits, test counts, and the two
build hashes. Browser / Network / Storage / compatibility evidence is
NOT_RUN (no isolated browser available to this builder; see
VERIFICATION.md) — the independent reviewer must run the nine-aspect
gates on the same PR head.

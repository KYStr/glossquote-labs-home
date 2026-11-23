# Home Affordability Calculator （購屋負擔能力）— Production HANDOFF

- Spec: `spec-home-affordability-calculator-20261121`, draft spec PR #381
  (base `codex/initial-publication`, head
  `d0a79715f63df1ad1c9050a8642d8dad382fa7b8`, OPEN at build time).
  Registry rev 1752 (per parent task).
- Spec source (fixed): `build6/specs/home-affordability-calculator/docs/specs/home-affordability-calculator/`
  at the spec PR head above — `SPEC.md` (8 sections), `BRIEF.md`,
  `fixtures.json`, `AUTHOR-CHECK.md`. `test/fixtures.json` in this
  tool is a byte-identical vendored copy (SHA-256
  `f1ac0788edabcdc3146863509b193d41e9d3de8803f236d67d6b634362ac058e`,
  verified against the spec PR head via the GitHub API: the blob SHA
  `98e8ad0112843e0321b200e6f8605324e1a296ba` returned for the file at
  that head hashes to the same bytes).
- Production target: `tools/home-affordability-calculator/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/home-affordability-calculator-production-20261121`, base
  `codex/initial-publication`. Production PR #420 (draft, OPEN).
  Build-first (no registry production
  registration in this run, per the run-6 production mode: build +
  draft PR + parent verification + ledger).
- Builder: run-6 production builder subagent (third wave; parent
  orchestrator session c1a7338a-6226-494f-b159-d6c4b765c517). User
  confirmed continuation four times on 2026-11-23 (14:31, 14:33:56,
  14:58:49, 15:04:46); the same execution-risk prompt class that
  stopped the first production wave at clone/fetch re-appeared during
  this build (on the clone exec result and on a process poll of the
  same clone) and was continued past under that authorization — the
  updated alignment rule confirms the same class no longer stops work
  within this round; only a different kind of risk would. Glossquote
  repo content only, no other content, credentials, outbound sends,
  or deletion involved.

## What was built

- Pure core `public/js/core/home-affordability.mjs`: `run(input)`
  validates in the SPEC order (capacity INPUT_LIMIT → EMPTY →
  INTEGER_FORMAT/DECIMAL_FORMAT → RANGE, in the field order
  annualIncome, downPayment, mortgageRate, years, otherDebts,
  frontEndCapPct, backEndCapPct, then cross-field CAP_ORDER), derives
  monthly income / front-end / back-end limits with exact BigInt
  rationals (one half-up rounding each — never monthly income first),
  takes the smaller limit as the maximum monthly payment with
  bindingCap front/back/equal, derives the maximum loan by the exact
  rational annuity floor (no floating point anywhere), and returns
  the fixture-shaped result `{monthlyGrossIncome, frontEndLimit,
  backEndLimit, maxMonthlyPayment, bindingCap, maxLoanAmount,
  maxHomePrice, frontEndPctAtMax, backEndPctAtMax, affordable}`.
  The pinned disclaimer is exported from the core and shown fixed
  above the results area of both pages. Fixed report
  `home-affordability-report.json` (canonical JSON, UTF-16 key order,
  one trailing LF, 2 MiB limit).
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions, h1,
  FAQ answers, disclaimer in both languages, preview noindex, no
  canonical/hreflang, same-language home links (`../../` /
  `../../en/`), draft-loss note, SPEC preset defaults as the initial
  values. Error messages follow the SPEC's pinned bilingual templates
  (label / raw input / range / caps). The binding cap is shown as
  text plus a ● symbol, never colour alone; a no-loan-room result
  shows a ⚠ text note.
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Verification against the SPEC (before the test suite)

- All 15 literal core fixtures pass verbatim (deep equal, full
  result / full error triple); the 3 controller fixtures drive the
  controller tests.
- Independent re-derivation: a separate exact-rational (Python
  Fraction) model reproduced all 10 valid fixture results digit for
  digit before the core was written, and the test suite re-checks the
  annuity floor invariant in the opposite direction (recomputing each
  fixture loan's monthly payment: all 10 recompute to exactly the
  maximum monthly payment, never above).
- No fixture-vs-SPEC conflict was found: no fixture had to be skipped
  or overridden, unlike the blood-pressure build's decimal-systolic
  case.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **Undefined ratios when the rounded monthly income is 0
   (annualIncome 1–5).** SPEC §6 defines frontEndPctAtMax and
   backEndPctAtMax as divisions by the rounded monthlyGrossIncome,
   but annualIncome 1–5 rounds to a monthly income of 0, so both
   ratios divide by zero (the back-end ratio's numerator can also be
   non-zero when other debts are present). The implementation reports
   0.0 for both ratios in that case and still succeeds with no loan
   room and price equal to the down payment; the behaviour is pinned
   by a test. The SPEC needs a ruling for this edge (e.g. define the
   ratios as 0.0, or raise the annualIncome floor to 6).
2. **Implementation layout names differ from the house layout.**
   SPEC implementation says `src/core.mjs`, `src/controller.mjs`,
   `src/app.mjs`; the task instruction and the house template pin
   `public/js/core/*.mjs`, `public/js/controller.mjs`,
   `public/js/app.js` (plus `public/js/worker-handler.mjs`). The
   build follows the task/house layout. If the SPEC's paths are meant
   literally, the SPEC should be revised to the house layout.
3. **Example coincides with the preset defaults.** Fixtures.json case
   1 (typical-taipei) is byte-identical to the SPEC preset defaults,
   so "Load example" fills the same values the page already loads
   with; only the example note distinguishes it. Not a defect, but
   the reviewer should confirm the example is meant to equal the
   defaults rather than a distinct scenario.
4. **Task-brief path note:** the parent task cited the spec at
   `home clone docs/specs/home-affordability-calculator/`; the actual
   fixed spec used here lives in the run-6 spec workspace
   `build6/specs/home-affordability-calculator/docs/specs/home-affordability-calculator/`
   (verified byte-identical fixtures against spec PR #381 head
   `d0a79715…`). No content difference; only the path in the brief
   was stale.

## Verification

See `VERIFICATION.md` for commands, exits, test counts, and the two
build hashes. Browser / Network / Storage / compatibility evidence is
NOT_RUN (no isolated browser available to this builder; see
VERIFICATION.md) — the independent reviewer must run the nine-aspect
gates on the same PR head.

# Life Insurance Calculator （壽險保額試算）— Production HANDOFF

- Spec: `spec-life-insurance-calculator-20261121`, draft spec PR #401
  (base `codex/initial-publication`, head
  `5b7ffce437d5f3dc16f2d75b3a0d03e2c5d0a8d9`, OPEN at build time).
  Registry rev 1852 (per parent task).
- Spec source (fixed): run-6 spec workspace
  `build6/specs/life-insurance-calculator/docs/specs/life-insurance-calculator/`
  — `SPEC.md` (8 sections), `BRIEF.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`. `test/fixtures.json` in this tool is a
  byte-identical vendored copy (SHA-256
  `59a18a7ba9ec28d89c8c96cde1bfaf9256199605d2a9aaff1f093d8b9a7ba811`,
  verified against the spec PR #401 head via the GitHub API). The
  spec directory does not exist on the base branch (spec PR #401 is
  unmerged), so the vendored copy is the fixed reference.
- Production target: `tools/life-insurance-calculator/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/life-insurance-calculator-production-20261121`, base
  `codex/initial-publication`. Build-first (no registry production
  registration in this run, per the run-6 production mode: build +
  draft PR + parent verification + ledger). The repo `AGENTS.md`
  claim/registry flow was not run: the parent task explicitly
  orders build-first under the user's four informed confirmations
  on 2026-11-23 (14:31, 14:33:56, 14:58:49, 15:04:46) and the
  standing rule in `~/MEMORY.md`.
- Builder: run-6 production builder subagent (seventh wave, parent
  orchestrator session 8ef51d6c-335b-4c0c-9471-7955c4572ab8). The
  same execution-risk prompt class that stopped the first
  production wave at clone/fetch re-appeared during this build (on
  the initial `git clone` result) and was continued past under the
  user's authorization — glossquote-repo content only, no other
  content, credentials, outbound sends, or deletion involved.

## What was built

- Pure core `public/js/core/life-insurance.mjs`: `run(input)`
  validates in the SPEC order (capacity INPUT_LIMIT → surrogate
  UNICODE → EMPTY → INTEGER_FORMAT → RANGE, in the SPEC field
  order annualIncome, supportYears, dependents, educationPerChild,
  mortgageBalance, otherDebts, finalExpenses, existingCoverage,
  liquidAssets), computes the pinned needs approach with exact
  BigInt arithmetic (incomeReplacement = annualIncome ×
  supportYears; educationTotal = educationPerChild × dependents;
  needsTotal = the five need items; totalOffsets = existingCoverage
  + liquidAssets; recommendedCoverage = max(0, needsTotal −
  totalOffsets)), the 10× benchmark as a reference only
  (multipleBenchmark = annualIncome × 10; differenceVsBenchmark =
  recommendedCoverage − multipleBenchmark, may be negative), and
  status `covered` when the recommendation is 0, otherwise
  `shortfall`. Display money is comma-grouped by a hand-rolled
  formatter (no locale participation). Fixed report
  `life-insurance-calculator-report.json` (canonical JSON, UTF-16
  key order, one trailing LF, 2 MiB limit).
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions, h1,
  FAQ answers, the verbatim bilingual disclaimer above the results
  area and inside it, preview noindex, no canonical/hreflang,
  same-language home links (`../../` / `../../en/`), draft-loss
  note. The nine fields are grouped in the SPEC's three fieldsets.
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **Report vs disclaimer: SPEC userFlow/inputsOutputs say the
   pinned disclaimer must appear in "結果區與報告" (results area
   and report), but inputsOutputs §4 fixes the report content as
   "result 的 compact JSON" and the fixtures' result shape has no
   disclaimer field.** The implementation keeps the report as the
   canonical JSON of the result only (byte-exact against the
   independently derived fixture serialization) and shows the
   disclaimer in the results area of both pages (and directly above
   it). If the disclaimer belongs in the report bytes, §4 and the
   fixtures must be revised together.
2. **Path names in SPEC implementation §: it refers to
   `src/core.mjs`, `src/controller.mjs`, `src/app.mjs`, but the
   delivered layout (per the parent task, IMPLEMENTATION-CHECKLIST,
   and the run-6 house pattern) is `public/js/core/*.mjs`,
   `public/js/controller.mjs`, `public/js/app.js`.** No functional
   impact; the SPEC's paths should be updated to the house layout.
3. **Branch naming in SPEC handoff §: it says to use a
   `codex/<task>-<actor>` branch, but the parent task pins
   `muse/life-insurance-calculator-production-20261121`.** The
   parent task governs; the SPEC's branch convention should be
   updated to match the run-6 production mode.

Notes (not errata — the SPEC already pins these, the tests pin
them too): all 15 core fixtures match the implementation exactly
(no fixture-vs-SPEC-order conflict in this spec: `decimal-income`
"120000.5" is 8 units so it reaches INTEGER_FORMAT, and
`income-too-long` "100000000" is 9 units so INPUT_LIMIT precedes
RANGE). For the five fields whose max is 99,999,999, max+1 is a
9-unit raw string, so INPUT_LIMIT — not RANGE — is the correct
first failure under the SPEC's pinned order.

## Verification

See `VERIFICATION.md` for commands, exits, test counts, and the two
build hashes. Browser / Network / Storage / compatibility evidence is
NOT_RUN (no isolated browser available to this builder; see
VERIFICATION.md) — the independent reviewer must run the nine-aspect
gates on the same PR head.

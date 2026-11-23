# Debt Payoff Planner （債務清償規劃）— Production HANDOFF

- Spec: `spec-debt-payoff-planner-20261121`, draft spec PR #376
  (base `codex/initial-publication`, head
  `c35ca05f598cb091d3aaa1bccdd534d70c649274`, OPEN at build time).
  Spec source: `docs/specs/debt-payoff-planner/` (BRIEF.md, SPEC.md
  8 sections, fixtures.json 17 cases, AUTHOR-CHECK.md), registry rev
  1727. Fixtures vendored byte-identical into `test/fixtures.json`
  (SHA-256
  `5f35c9076a97e9d8e4292085c0d4ddcf3806902b9f492d39ed1e02516123d2dc`).
- Production: branch `muse/debt-payoff-planner-production-20261121`,
  base `codex/initial-publication`, in `tools/debt-payoff-planner/`.
  Build-first, following the run-5/run-6 house pattern (AGENT-HANDBOOK.md,
  SOURCE-LAYOUT.md, IMPLEMENTATION-CHECKLIST.md). No registry
  production registration (production does not go through the registry
  system, run-5 mode). Never merge, never publish.
- Core: `public/js/core/debt-payoff-planner.mjs` — pure validation +
  simulation. Money is integer cents; APRs are integer hundredths of
  a percent; monthly interest is the SPEC's pinned exact formula in
  BigInt (`floor((2 * balance * aprHundredths + 120000) / 240000)`).
  Strategy order is fixed once at plan start with the SPEC's
  tie-breaks; a paid-off debt's minimum joins the extra pool from the
  next month; a minimum that exceeds its balance rolls the unused
  part into the same month's extra pool; the 600-month cap reports
  `not-debt-free` honestly with the remaining balance.
- Controller: `public/js/controller.mjs` — generation-guarded Worker
  state machine (empty/dirty/busy/success/error/cancelled). The draft
  is `{debts: [{name, balance, apr, minimum} × 1–12], extraMonthly}`.
- UI: `public/index.html` (zh-Hant) + `public/en/index.html` (en),
  dynamic debt table (add up to 12, remove down to 1), extra monthly
  payment, compare/load-example/reset/cancel, comparison summary,
  per-strategy order + payoff months + monthly table with 25-row
  pagination (keyboard-operable buttons, full export untruncated),
  fixed report download `debt-payoff-plan.json` only on success.
- Scripts: `node --test` (core/controller/report/site),
  `node scripts/check.mjs`, `node scripts/build.mjs --mode preview`
  (run twice, byte-identical),
  `node scripts/check-generated.mjs --mode preview`,
  `node scripts/serve.mjs` (loopback only). Node >= 24, ESM, zero
  runtime dependencies.

## How it was verified

- `node --test`: 53/53 pass (14 core fixtures incl. the
  `treads-water` partial-literal + property checks, the independent
  re-derivation simulator, boundary/grammar/capacity/duplicate/
  schema/tie-break/600-month-cap tests; 3 controller fixture flows
  plus generation-guard units; report byte-literal; bilingual site
  contract).
- `node scripts/check.mjs`: pass (files, package contract, fixtures
  hash, core constants/defaults/example, pages, syntax, worker
  concatenation, capability scan, core purity).
- `node scripts/build.mjs --mode preview` run twice; both runs
  byte-identical (see VERIFICATION.md for the two hashes).
- `node scripts/check-generated.mjs --mode preview`: pass.

## Spec-errata candidates (spec problems found while building; the spec was NOT silently changed)

1. **§7 tests: "移除任一筆債務後重算，剩餘筆的結果不變" is false
   as literally stated.** Counterexample (hand-computed, zero APR):
   A 600.00/100.00, B 400.00/50.00, C 200.00/50.00, extra 0.00.
   With all three debts B pays off in month 6 (the fixture itself
   says `payoffMonth.B = 6`). Remove C and re-run: B pays off in
   month 7, because C's minimum (50.00/month) no longer rolls into
   the pool after C clears in month 4, and A's minimum only frees up
   in month 7. The implementation follows the SPEC's simulation
   rules (which the fixtures pin); the test file asserts only the
   true, weaker property — removing a debt preserves the *relative
   strategy order* of the remaining debts — and this sentence needs
   a spec fix (either delete it, or narrow it to the order).
2. **Leading zeros in money/APR strings are unspecified.** The SPEC
   pins the grammar as "整數或小數點後 1–2 位" with examples
   (`100.`, `.5`, `100.005` invalid) but never says whether `0100`
   or `00.50` is valid. The implementation follows the run-5/6 house
   pattern and rejects leading zeros (except `0` itself) as
   MONEY_FORMAT / APR_FORMAT; the tests pin that choice. If the
   reviewer wants `0100.00` accepted, the SPEC needs one sentence.
3. **Control characters in money/APR fields have no pinned code.**
   The SPEC pins UNICODE only for names ("名稱含控制字元…或不成對
   surrogate → UNICODE"); a control character in a money/APR field
   falls through to the grammar check and is reported as
   MONEY_FORMAT / APR_FORMAT. Documented interpretation, not a
   behaviour change; one clarifying sentence in the SPEC would close
   it.

## NOT_RUN (not verified by this build; left for the independent reviewer)

- Real-browser checks (Chrome/Edge, both languages, keyboard, 320px,
  real 200% zoom, reduced motion, touch targets, contrast, Blob
  download bytes, Worker behaviour) — this subagent has no live
  browser; Node/DOM-level checks above are not a substitute.
- Network/Storage isolation proof (zero work requests, storage, URL,
  console) in a clean isolated profile.
- Formal HTTPS/SEO gate (production origin
  `debt-payoff-planner.glossquote.com` is not configured; candidate
  carries preview noindex only, no canonical/hreflang/sitemap).
- The nine product aspects (functionality, boundaries, privacy,
  security, usability, accessibility, localization-seo,
  toolchain-provenance, compatibility) are all NOT_RUN / null for
  this candidate until the independent reviewer verifies the fixed
  PR head.

## Next owner

- Independent (non-author) reviewer: verify this PR head against the
  SPEC's nine aspects with evidence; do not take the builder's word
  for any of it. The errata candidates above (especially #1) need a
  spec-author decision before acceptance.
- Do not merge or publish this PR; do not register production in the
  registry system.

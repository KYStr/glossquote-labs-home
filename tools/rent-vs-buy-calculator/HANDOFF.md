# Rent vs Buy Calculator （租屋 vs 買房試算）— Production HANDOFF

- Spec: `spec-rent-vs-buy-calculator-20261121`, draft spec PR #378
  (base `codex/initial-publication`, head
  `46b55199bc39d221bb6ff529cdcb04778fe1e7b4`, OPEN at build time).
  Registry rev 1737 (per parent task).
- Spec source (fixed): `docs/specs/rent-vs-buy-calculator/` at the spec
  PR head above — `SPEC.md` (8 sections), `BRIEF.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`. `test/fixtures.json` in this tool is a
  byte-identical vendored copy (SHA-256
  `cf0ef0ab1d4733258065059da6a2e42c4b8b48a605787726917f3649adef515f`,
  verified against the spec PR head via `gh pr view`).
- Production target: `tools/rent-vs-buy-calculator/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/rent-vs-buy-calculator-production-20261121`, base
  `codex/initial-publication`. Build-first (no registry production
  registration in this run, per the run-6 production mode: build +
  draft PR + parent verification + ledger).
- Builder: run-6 production builder subagent (third wave, parent
  orchestrator session ccb9ee27-adc8-876d-2287-aaf2c4fe6bd4). User
  confirmed continuation four times on 2026-11-23 (14:31, 14:33:56,
  14:58:49, 15:04:46); the same execution-risk prompt class that
  stopped the first production wave at clone/fetch re-appeared during
  this build (on the clone/listing step) and was continued past under
  that authorization — glossquote-repo content only, no other content,
  credentials, outbound sends, or deletion involved. The alignment
  synthesis updated during this build confirms the same rule: one
  informed confirmation covers the same prompt class for this run.

## What was built

- Pure core `public/js/core/rent-vs-buy.mjs`: `run(input)` validates
  in the SPEC order (capacity INPUT_LIMIT → EMPTY → INTEGER_FORMAT /
  DECIMAL_FORMAT → RANGE, in the pinned field order monthlyRent,
  homePrice, downPayment, mortgageRate, years, rentGrowthPct,
  homeAppreciationPct, opportunityCostPct, then the cross-field
  DOWN_PAYMENT_EXCEEDS_PRICE), then computes with exact rational
  arithmetic on BigInt — never a binary float approximation of the
  monthly rate. Monthly payment M is the exact annuity
  L·p·(p+q)^n / (q·((p+q)^n − q^n)) with i = p/q, half-up rounded,
  floored at 1 when L > 0, 0 when L = 0; monthly interest is
  round-half-up(B·i) on the exact ratio; the last month pays the
  balance off exactly; once the balance reaches zero later payments
  are 0. Rent/home value/opportunity cost use the exact yearly
  growth fractions (1+g) = (100·den + num)/(100·den). Result shape
  is exactly the fixture shape `{monthlyPayment, breakevenYear,
  verdict, totalRentCost, totalBuyNetCost, savingsAtHorizon,
  yearly[]}` with yearly rows `{year, rentYear, rentCumulative,
  mortgageYear, homeValue, balance, equity, opportunityCost,
  buyCumulative, difference}`. Fixed report
  `rent-vs-buy-report.json` (canonical JSON, UTF-16 key order, one
  trailing LF, 2 MiB limit). The SPEC-pinned error messages
  (INPUT_LIMIT / EMPTY / INTEGER_FORMAT / DECIMAL_FORMAT / RANGE /
  DOWN_PAYMENT_EXCEEDS_PRICE with {label} / {raw} / {min} / {max})
  are implemented as `formatError(error, lang, raw)` in the core,
  and the pinned disclaimer is exported from the core and shown
  above the results on both pages.
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions, h1,
  FAQ answers, disclaimer in both languages, preview noindex, no
  canonical/hreflang, same-language home links (`../../` /
  `../../en/`), draft-loss note. The yearly table is paginated at
  25 rows with keyboard-operable previous/next controls (full export
  is never truncated); the breakeven row is marked with text and a
  symbol (★), not colour alone.
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Implementation notes (not spec changes)

- The SPEC's implementation section names `src/core.mjs`,
  `src/controller.mjs`, `src/app.mjs`; the house file contract
  (IMPLEMENTATION-CHECKLIST.md and the task brief) puts them at
  `public/js/core/`, `public/js/controller.mjs`, `public/js/app.js`.
  The implementation follows the house layout, as do the sibling
  run-6 tools. See errata candidate 2.
- Unpinned edge, handled defensively: the SPEC pins the last-month
  payoff and "once the balance reaches zero, later payments are 0",
  but not what happens if a monthly principal portion exceeds the
  remaining balance before the final month (only reachable through
  rounding when the balance is smaller than one principal portion).
  The implementation pays the balance off in that month, keeping the
  balance non-negative and the final balance exactly zero. It never
  triggers on the SPEC fixtures (verified: every yearly balance
  matches the fixtures exactly, and every accepted case ends at
  balance 0).
- SCHEMA reading: the SPEC's "未知、缺欄、錯型別、accessor 皆
  SCHEMA，field,row=null" is read as field null and row null for
  every SCHEMA failure, matching the house pattern.
- One bug was found and fixed during this build (in the
  implementation, not the spec): the first version of the yearly
  growth conversion multiplied the percent value by 100 a second
  time ("2%" became 200 instead of 2). The fix represents
  (1+g) as the exact fraction (100·den + num)/(100·den). All 13
  literal core fixtures now match exactly.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **RANGE message rendering is not pinned.** The SPEC fixes the
   RANGE template with {min} / {max} placeholders but never pins
   how the endpoints render (plain numbers vs. numbers with units,
   e.g. "1" vs. "1 元", "30" vs. "30%"). The implementation renders
   plain numbers ("1", "1000000", "0", "30", "-10"). A reviewer
   cannot verify exact RANGE text from the SPEC alone; pin the
   rendering or accept plain numbers.
2. **SPEC implementation section cites `src/` paths.** It says
   "src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、
   工作世代及資源。src/app.mjs 用安全 DOM API 綁表單", but the
   house file contract (and the task brief) places these at
   `public/js/core/*.mjs`, `public/js/controller.mjs`,
   `public/js/app.js`. The implementation follows the house layout.
   Suggested fix: update the SPEC's paths to the house layout.
3. **Task-brief path note:** the parent task cited the spec at
   `home clone docs/specs/rent-vs-buy-calculator/`; the actual fixed
   spec used here lives in the run-6 spec workspace
   `build6/specs/rent-vs-buy-calculator/docs/specs/rent-vs-buy-calculator/`
   (same content, verified byte-identical fixtures against spec PR
   #378 head `46b55199…`). No content difference; only the path in
   the brief was stale.

## Verification

See `VERIFICATION.md` for commands, exits, test counts, and the two
build hashes. Browser / Network / Storage / compatibility evidence is
NOT_RUN (no isolated browser available to this builder; see
VERIFICATION.md) — the independent reviewer must run the nine-aspect
gates on the same PR head.

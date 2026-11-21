# Stock Profit Calculator — Handoff

Tool: `tools/stock-profit-calculator/` — works out a single Taiwan-stock
buy/sell line by line: buy and sell brokerage fees (rate × discount,
per-order minimum applied after discount and rounding), securities
transaction tax on the sell side only, an optional cash day-trade rate
of 0.15%, pro-rata cost basis for a partial sell, net profit/loss,
return %, and the breakeven sell price.

## Fixed source

- Spec ID: `spec-stock-profit-calculator-20261109`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/244
  (candidate commit `5849c1ff1a6403e9261de07e0c4e7d506935629e`,
  branch `muse/spec-stock-profit-calculator-20261109`)
- Spec fixtures SHA-256:
  `3eab7f7389355403a26547a2cfae6cd588924a11f664c6439e3f07642a5cfb95`
  (vendored verbatim as `test/fixtures.json`; `scripts/check.mjs`
  fails if the hash changes)
- Base commit (branch point): `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- Branch: `muse/stock-profit-calculator-production-20261109`

## Files changed (only `tools/stock-profit-calculator/`)

```text
package.json
public/index.html
public/en/index.html
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/js/core/stock-profit.mjs
public/styles/stock-profit.css
scripts/build.mjs
scripts/check.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/fixtures.json
test/stock-profit-core.test.mjs
test/stock-profit-controller.test.mjs
test/stock-profit-report.test.mjs
dist-preview/ (generated preview, 9 files)
BUILD-MANIFEST.json
HANDOFF.md
VERIFICATION.md
```

## How each SPEC anchor was verified

- §inputsOutputs worked anchors: all 13 core fixture cases pass
  verbatim (`assert.deepEqual` on the literal expected values in
  `test/fixtures.json`), including the half-up discriminators
  (142.5 → 143, 16.5 → 17, 28.5 → 29, 370.5 → 371), the minimum fee
  applying after discount and rounding, the day-trade 0.15% override,
  lot-unit conversion, and the pro-rata basis 10019/3 → 3339.67 with
  the profit computed from the exact fraction.
- Breakeven: every success fixture is plugged back into the fee
  model — the breakeven price reaches the sold cost basis and one
  cent less does not (`test/stock-profit-core.test.mjs`, breakeven
  plug-back test). The search starts at the proven lower bound
  ceil(cost basis / sell shares) and jumps by ceil(deficit /
  sell shares), which is safe because fees and tax are
  non-decreasing in price; it never assumes monotonicity of the net.
- §inputsOutputs serialization: the round-lot, pro-rata and odd-lot
  report bytes are asserted exactly
  (`test/stock-profit-report.test.mjs`), including two-decimal
  fields written with exactly two decimals (100000.00, 585.80),
  integer fields as integers, key order, and the OUTPUT_LIMIT
  backstop.
- Controller cases: `state-dirty-error` (local SELL_EXCEEDS_BUY on
  rerun, no second worker created), `state-cancel-late` (cancel keeps
  the draft, the late reply cannot resurrect a result, reset returns
  to `empty` with the defaults), `state-replace-late` (the late
  success reply cannot replace the local error) — all driven through
  the controllable fake Worker.
- Money arithmetic: exact BigInt rational arithmetic throughout
  (integer cents + exact decimal fractions); no IEEE-754 double ever
  accumulates money. Rounding is half-up, floor(x + 1/2), including
  for negative values.
- Build determinism: two consecutive `build:preview` runs produce
  byte-identical `dist-preview/` trees and `BUILD-MANIFEST.json`
  (recursive diff clean); `check:generated:preview` passes.
- Loopback HTTP probe: 200 for `/`, `/en/`, the stylesheet, all four
  shipped scripts and the generated worker source (see
  VERIFICATION.md).

## Deviations from the SPEC

1. **Worker failure state.** SPEC userFlow lists only
   empty/dirty/busy/success/error/cancelled, while implementation
   says resource/Worker failures use the fixed INTERNAL/WORKER_ERROR.
   A Worker construction, load or messaging failure therefore goes
   to `error` with WORKER_ERROR (the draft is kept for a retry),
   rather than inventing a separate state. No result is fabricated.
2. **Sequence accounting for a locally-failed run.** A run that fails
   local validation never posts to a Worker, so it leaves the
   sequence unchanged; every edit, reset, load-example, cancel and
   worker-submitting run increments it. This is the only reading
   consistent with the pinned controller fixtures (the late reply
   after a local error is rejected by both the sequence and the
   state guard). Implemented and documented in `controller.mjs`.
3. No other deviations. The 0.1425% fee benchmark, the NT$20 minimum
   as a broker convention (not statutory), the 0.3% / 0.15% tax rates,
   the validation order, the fee/tax rounding rules and the
   breakeven definition are all implemented literally.

## Spec-errata candidates

Errata 0. All 13 core fixtures pass verbatim against the normative
text, and the independent Python recalculation (exact fractions,
breakeven scanned cent by cent from 1) agrees with every success
fixture. No SPEC normative text conflicts with any fixture.

## Known limitations

- The draft lives only in the current page: there is no persistent
  storage (SPEC forbids it for this tool), so switching language or
  leaving the page discards the draft. Both pages say so next to the
  language link.
- The candidate preview carries no production canonical, hreflang or
  sitemap, per SPEC: the planned origin
  https://stock-profit-calculator.glossquote.com is not configured
  yet. The formal origin, self-canonicals, robots.txt/sitemap and
  home-link URLs are a later production step owned by the
  coordinator.
- Real-browser verification is NOT_RUN (see VERIFICATION.md).

## Next owner

Independent reviewer: score the fixed candidate commit on the nine
SPEC acceptance aspects. Do not merge, publish, or register — the
coordinator owns acceptance, merge, and publication.

# Savings Goal Calculator — Handoff

Tool: `tools/savings-goal-calculator/` — a closed-form solver for the
two inverse savings questions: monthly deposit for a fixed term
(mode `payment`), or months to reach the goal for a fixed monthly
deposit (mode `months`). Exact rational arithmetic (BigInt integer
cents, integer basis points, exact powers of the monthly growth
factor); deposits are always end-of-month (ordinary annuity).

## Fixed source

- Spec ID: `spec-savings-goal-calculator-20261109`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/245
  (candidate commit `9828c5d10ff75720333491cfc21f190b7cd7ed16`)
- Spec fixtures SHA-256:
  `b4115210a148532133b2ec728ed87772b59ca3af98a76adc28cccaa014405979`
  (vendored verbatim as `test/fixtures.json`; `scripts/check.mjs`
  fails if the hash changes)
- Base commit (branch point): `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- Branch: `muse/savings-goal-calculator-production-20261109`

## Files changed (only `tools/savings-goal-calculator/`)

```text
package.json
public/index.html
public/en/index.html
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/js/core/savings-goal.mjs
public/styles/savings-goal.css
scripts/build.mjs
scripts/check.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/fixtures.json
test/savings-goal-core.test.mjs
test/savings-goal-controller.test.mjs
test/savings-goal-report.test.mjs
dist-preview/ (generated preview, 9 files)
BUILD-MANIFEST.json
HANDOFF.md
VERIFICATION.md
```

## How each SPEC anchor was verified

- §3 worked anchors: all 18 literal core fixtures pass verbatim
  from `test/fixtures.json` (62 tests total, all passing), including
  the one-month timing case (single end-of-month deposit earns no
  interest: PMT = FV = 1000.00), the exact-integer month boundary
  (n\* = 20, no jump to 21), the 1200-month horizon boundary
  (k = 1200 ok, k = 1201 beyond-horizon), and the growth-only
  crossing (final-month deposit clamped to 0.00).
- Independent re-derivation: all 14 success fixtures were recomputed
  with a separate Python `Fraction` implementation written directly
  from the SPEC rules; 14/14 match the fixtures exactly. The 10
  extra boundary cases in `test/savings-goal-core.test.mjs` (rate
  0/100, months 1/600, maximum amounts, k = 1200/1201, fractional
  3.5% rate) carry expected values from that same independent
  computation, never from this implementation's output.
- Properties (fixed inputs, no randomness): mode A displayed payment
  is ceiling-minimal (B(n) with the displayed payment ≥ FV, with one
  cent less < FV); mode B month count is the first crossing month
  (B(k−1) < FV ≤ B(k)) and the final-month deposit is the ceiling of
  the exact tail; every success result satisfies the display identity
  finalBalance = initialAmount + totalDeposits + totalInterest with
  non-negative interest; zero-rate cases match plain integer
  arithmetic. The balance used by the property checks is recomputed
  month-by-month recurrence, a different code path from the core's
  closed form.
- §3 serialization: the `payment-basic-zero-rate` report bytes are
  asserted exactly in `test/savings-goal-report.test.mjs`, including
  key-order independence, null handling, and the OUTPUT_LIMIT
  backstop at 2,097,152 bytes.
- Controller cases: `state-dirty-error` (local RANGE on rerun, no
  second worker created), `state-cancel-late` (cancel keeps the
  draft, the late reply is ignored, reset restores defaults and the
  empty state), `state-replace-late` (the late success reply cannot
  replace the local error) — all driven through the controllable fake
  Worker with the pinned states and report availability.
- Reset: synchronous, restores the default draft byte-for-byte
  (`JSON.stringify` equality asserted) and the empty state.
- Build determinism: two consecutive `build:preview` runs produce
  byte-identical `dist-preview/` trees and `BUILD-MANIFEST.json`
  (recursive diff clean); `check:generated:preview` passes.
- Loopback HTTP probe: 200 for `/`, `/en/`, the stylesheet, all four
  shipped scripts, the generated worker source and `/en/index.html`
  (see VERIFICATION.md).

## Deviations from the SPEC

1. **SPEC §implementation names `src/core.mjs`, `src/controller.mjs`,
   `src/app.mjs`.** The implementation uses the `public/js/…`
   layout every other run-5 production uses (race-time, salary,
   bill-split, dew-point, feels-like, vo2max): the pure core at
   `public/js/core/savings-goal.mjs`, the controller at
   `public/js/controller.mjs`, the worker handler at
   `public/js/worker-handler.mjs`, and the DOM wiring at
   `public/js/app.js` (an ES module, as in the siblings). The
   controller module is the testable unit the SPEC §7 controller
   cases drive. The page still runs from the static preview build
   exactly like the sibling tools.
2. **Sequence accounting for a locally-failed run.** SPEC §2's
   controller description says every run increments the sequence,
   but the pinned `state-replace-late` fixture requires the newer
   (locally invalid) run to leave the sequence unchanged — it posts
   no worker, so there is nothing to sequence — while every edit,
   reset, load-example, cancel and worker-submitting run increments
   it. Implemented and documented in `controller.mjs`.
3. **No draft persistence at all.** The SPEC forbids persistent
   storage and says the draft lives only in the current page, so
   unlike the sibling tools this controller has no storage adapter
   and the app never touches localStorage; switching language or
   leaving the page discards the draft, as the pages disclose.
4. No other deviations. The closed-form (non-simulation) model, the
   end-of-month timing, the ceiling-to-the-cent payment rule, the
   half-up balance rule, the 1200-month horizon, the three semantic
   states, the pinned status sentences and disclosure, and the
   no-production-canonical preview rule are all implemented literally.

## Spec-errata candidates

None. All 18 core fixtures pass verbatim against the normative
text, and the independent Python Fraction re-derivation agrees with
all 14 success fixtures, so no fixture conflicts with the normative
text.

## Known limitations

- Real-browser verification is NOT_RUN (see VERIFICATION.md): no
  isolated-browser mechanism is available to this builder. The
  reviewer should exercise both languages in a real browser — the
  success path, error, dirty, cancel, reset and Blob download — and
  confirm the blob-URL module Worker runs under the pinned CSP
  (which carries `worker-src blob:` per the SPEC). If the browser
  refuses the blob worker, the controller degrades to the `error`
  state with WORKER_ERROR (local validation still runs; no result is
  fabricated).
- The preview pages carry no production canonical, hreflang or
  sitemap, per the SPEC: the planned origin
  `https://savings-goal.glossquote.com` is not yet configured.
  Formal HTTPS/SEO verification is a later step owned by the
  coordinator.
- The mode-B float logarithm only seeds the month estimate; exact
  rational comparison corrects it. The correction loop is capped at
  1300 iterations (SPEC) and returns INTERNAL if ever exceeded; it
  never fired in any test.

## Next owner

Independent reviewer: score the fixed candidate commit on the nine
SPEC §6 aspects. Do not merge, publish, or register — the coordinator
owns acceptance, merge, and publication.

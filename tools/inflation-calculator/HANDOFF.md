# Inflation Calculator — Handoff

Tool: `tools/inflation-calculator/` — converts an amount between price
levels with a constant annual inflation rate (future nominal amount,
real purchasing power, cumulative inflation, year-by-year table) or
with two user-entered CPI index values (converted amount, cumulative
change, equivalent annual rate).

## Fixed source

- Spec ID: `spec-inflation-calculator-20261109`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/247
  (candidate commit `ecbe6325b65bdf3cffb56222e1016388b4984d7b`)
- Spec fixtures SHA-256:
  `888ae6a956bc5bda31a7c2af53633b5b64fabea2d25ae3d6d917b8023983a03f`
  (vendored verbatim as `test/fixtures.json`; `scripts/check.mjs`
  fails if the hash changes)
- Base commit (branch point): `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- Branch: `muse/inflation-calculator-production-20261109`

## Files changed (only `tools/inflation-calculator/`)

```text
package.json
public/index.html
public/en/index.html
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/js/core/inflation.mjs
public/styles/inflation.css
scripts/build.mjs
scripts/check.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/fixtures.json
test/inflation-core.test.mjs
test/inflation-controller.test.mjs
test/inflation-report.test.mjs
dist-preview/ (generated preview, 9 files)
BUILD-MANIFEST.json
HANDOFF.md
VERIFICATION.md
```

## How each SPEC anchor was verified

- §inputsOutputs worked anchors: `rate-basic` (2%, 10 years →
  future 121,899.44, purchasing power 82,034.83, cumulative 21.9%),
  3% for one year (10,000 → 10,300 / 9,708.74 / 3%), and CPI 100 →
  110 over 5 years (20,000 → 22,000, cumulative 10%, equivalent
  annual rate 1.9245%) — the last two independently recalculated with
  Python fractions/Decimal before being written into
  `test/inflation-core.test.mjs` (59 tests total, all passing).
- §tests case inventory: all 24 core cases and all 3 controller cases
  pass verbatim from `test/fixtures.json`.
- §inputsOutputs serialization: the `rate-basic` and `cpi-basic`
  report bytes are asserted exactly (canonical compact JSON, one
  trailing LF) in `test/inflation-report.test.mjs`, including
  key-order independence and the OUTPUT_LIMIT backstop.
- Controller cases: `state-dirty-error` (local RANGE on rerun, no
  second worker created), `state-cancel-late` (cancel keeps the draft,
  late reply cannot resurrect a result, reset returns the rate
  defaults), `state-replace-late` (late success reply cannot replace
  the current error) — all driven through the controllable fake
  Worker.
- Specified boundary checks: amount `999999999.99` legal /
  `1000000000` RANGE / `99999999.999` DECIMAL_FORMAT; rate `1000`
  legal / `1000.001` RANGE / `-100.001` RANGE; CPI `99999.999` legal /
  `100000` RANGE; years `200` legal / ` 10` INTEGER_FORMAT.
- Underflow check: amount 1000, rate −99.999, years 200 → factor +0,
  futureValue 0, purchasingPower null, cumulativePercent −100; rows
  0–60 keep finite purchasing powers, rows 61–200 are null.
- Build determinism: two consecutive `build:preview` runs produce
  byte-identical `dist-preview/` trees and `BUILD-MANIFEST.json`
  (recursive diff clean); `check:generated:preview` passes.
- Loopback HTTP probe: 200 for `/`, `/en/`, the stylesheet, all four
  shipped scripts and the generated worker source; traversal 404;
  CSP + `X-Robots-Tag: noindex, nofollow` on HTML (see
  VERIFICATION.md).

## Deviations from the SPEC

1. **File layout follows the builder brief / handbook, not the SPEC's
   `src/` sketch.** SPEC §implementation names `src/core.mjs`,
   `src/controller.mjs`, `src/app.mjs`; the production builder brief
   pins `public/js/core/*.mjs`, `public/js/app.js`,
   `scripts/{build,check,serve}.mjs` (plus `controller.mjs` and
   `worker-handler.mjs` per the run-5 sibling tools). The product is
   built to the brief's layout.
2. **Worker failure is the `error` state with WORKER_ERROR, not a
   separate `unavailable` state.** SPEC userFlow lists exactly six
   states (empty / dirty / busy / success / error / cancelled) and
   says worker failures use fixed INTERNAL / WORKER_ERROR; there is no
   `unavailable` state in this SPEC, so a worker failure is an `error`
   with code WORKER_ERROR, keeping the draft for retry.
3. **Blank `yearsBetween` is treated as null.** The SPEC pins the
   optional field as "null or INTEGER" but does not pin the empty
   string. The app sends a blank optional input as null, and the core
   treats `""` the same way (capacity/surrogate checks still apply).
   Pinned by a dedicated test. This is an interpretation, not a
   conflict with any fixture.
4. **A purchasing power whose rounded value overflows is null.**
   SPEC's non-finite rule checks whether `a / fk` is finite; at
   rate −99.999, years 200, row 61's quotient is finite (~1e307) but
   `round2` multiplies by 100 and overflows to Infinity. The SPEC
   forbids Infinity as a purchasing power and the pinned underflow
   check asserts only the title values, not per-row values, so the
   implementation also returns null when the rounded value is not
   finite. Rows 61–200 are null; rows 0–60 stay finite. Pinned by a
   dedicated test.
5. **Preview pages carry no canonical / hreflang / sitemap, and no
   https URL at all.** SPEC §tests says the candidate has "無
   production canonical、hreflang 或 sitemap" and that the formal
   production build generates self-canonicals after the HTTPS origin
   is actually verified; the planned origin
   `https://inflation-calculator.glossquote.com` is not configured.
   `scripts/check.mjs` and `scripts/check-generated.mjs` assert the
   absence. The formal production build is the reviewer's / owner's
   follow-up, not this candidate.

No other deviations.

## Spec-errata candidates

**Errata 0.** No normative-text vs fixture conflict was found. All 24
core fixtures pass verbatim against the implementation of the
normative text, and the two interpretation points above (blank
`yearsBetween`, rounded-overflow purchasing power) are not pinned by
any fixture value.

## Known limitations

- The draft lives only in the page: no persistent storage of any
  kind (SPEC forbids it). Switching language or leaving the page
  discards the draft; both pages say so next to the language link.
- The year-by-year table paginates at 25 rows per page in the UI;
  the downloaded report always contains the full table.
- Real-browser and real-device checks are NOT_RUN (see
  VERIFICATION.md). The page CSP meta includes `worker-src blob:` as
  the SPEC pins, so the blob-URL module Worker is allowed by the
  pinned policy; the success path in a real browser is still
  unproven until the reviewer runs it.

## Next owner

Independent reviewer: score the fixed candidate commit on the nine
SPEC acceptance aspects. Do not merge, publish, or register — the
coordinator owns acceptance, merge, and publication.

# Verification — Mortgage Amortization production candidate v0.1

Mode: **BUILD-FIRST** (see `PRODUCTION-STATUS.md`). The wave's single
registry gate experiment (QR Code Maker) was refused with
`SPEC_UNAVAILABLE` — "Production needs a ready spec or the same
previously consumed spec." — so no production task was registered for
this tool; registration/submission is held for the bulk-review phase.

SPEC: `spec-mortgage-amortization-v1`, KYStr/glossquote-labs-home
commit `1f0bbc64235d115bd6b2d116730ac79560eedab5`,
`docs/specs/mortgage-amortization/SPEC.md`
(SHA-256 25ef3c657ef3253aba6be1720cde2f3473c4c9a87b17fa9529761d3f2693067b).

## SPEC defect found (worked fixture vs formula)

SPEC section 4 prints, for principal 120,000.00 at 12% over 3 months
(annuity): payment A = 40,803.45, month interests 1,200.00 / 803.97 /
403.97, final payment 40,801.04, total interest 2,407.94. Exact
rational evaluation of the section's own formula
A = P·i / (1 − (1+i)^(−n)) gives **A = 40,802.65** (the exact value is
40,802.6534…), producing month interests 1,200.00 / 803.97 / **403.99**,
a final payment of **40,802.66**, and total interest **2,407.96**. The
printed fixture is internally consistent with its own (mis-derived) A,
and its first two monthly interests match the formula; the A value
itself appears to be a hand-derivation slip of 80 cents (it corresponds
to a denominator of ≈0.0294094 instead of the exact 0.029409852…).
SPEC section 1 requires the ledger to be re-derivable by hand from the
formulas and rounding rules, so this implementation follows the
formula exactly and the tests assert the formula-exact values; the
printed fixture should be corrected at the spec's bulk review. The
section's zero-rate fixture (10,000.00 at 0% over 4 months → 2,500.00
× 4, interest 0) is exact and matches.

## Independent derivation of test expectations

Beyond the SPEC fixtures, the frozen expectations in
`test/core.test.mjs` (12-month annuity table; grace-period schedule;
tranche-switch schedule; reduce-payment recomputation) were derived at
authoring time with exact rational arithmetic (Python `fractions`)
directly from SPEC section 4, independent of this implementation —
all match cent for cent.

## Checks run

- `npm run check` — PASS (structure, house CSP/robots/hreflang heads,
  element-id parity, forbidden-token source audit, i18n parity, and
  SPEC formula anchors: worked-example payments/total interest, grace
  cap, half-up rounding).
- `npm test` — **34/34 pass** (Node v24.22.1): formula-exact worked
  example; zero-rate fixture; frozen 12-month table; equal-principal
  remainder-cent distribution; grace rows + cap errors at the cap and
  one beyond; tranche switch for both methods; reduce-term shortening;
  reduce-payment recomputation with baseline interest saved 401.33 on
  the frozen scenario; same-month event ordering; prepayment equal to
  the balance (schedule ends) and one cent above (error naming the
  maximum); event after payoff (error); prepayment during grace;
  12-event limit; half-up rounding at exact .5 cents; strict decimal
  parsers; CSV byte equality for the worked example and baseline
  comment headers with prepayments; 480-row/40-year schedule closes at
  zero well inside the 50 ms bound; controller behaviour through a DOM
  shim (placeholder, table rendering, field errors replacing the
  schedule, grace-cap error, prepayment add/delete, over-balance error,
  method switch, CSV export with date-only filename, reset).
- Build reproducibility: `npm run build` run twice — dist trees
  byte-identical (combined SHA-256 of the sorted file-hash listing
  `995f3ba62ce5f8f708955d8df26ae1f471a33468c108aecde9415d5a0afe88ed`).
- Local HTTP probes against the house preview server (serves
  `public/`, byte-identical to dist): pages and assets return 200 with
  exact source hashes; `/` 404 by server design; missing file 404;
  traversal 403; POST 405; HEAD 200; house CSP/security headers.

## NOT_RUN (honest gaps)

- Real-browser evidence does not exist in this environment (no browser
  binary): no rendered screenshots in either language, no spreadsheet
  re-import of the exported CSV, no keyboard-only walkthrough. The
  controller tests run against a DOM shim and are labelled as such.
- SPEC section 7 GUI/evidence items remain for the bulk-review phase;
  the underlying behaviours are covered at core/shim level.

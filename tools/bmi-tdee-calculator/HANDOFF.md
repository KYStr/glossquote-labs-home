# Handoff — BMI / TDEE Calculator (production candidate, build-first)

## Fixed spec source

- Repository: `KYStr/glossquote-labs-home`
- Spec path: `docs/specs/bmi-tdee-calculator/SPEC.md` (+ `BRIEF.md`, `AUTHOR-CHECK.md`)
- Spec fixed on branch: `codex/consolidate-20261109`
- Production base commit: `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c`
- No `fixtures.json` exists for this spec; the normative fixtures are the
  worked examples in SPEC §4 (M1, F1, the six 200 cm boundary weights, the
  imperial case, the 160 cm healthy range), and the tests derive every
  expected value from them by hand.

## Allowed scope

- Implementation lives **only** in `tools/bmi-tdee-calculator/`.
- Nothing else in the repo was modified: no registry writes, no catalog
  changes, no other tool's files.

## Mode and status

- **Build-first mode**: this candidate was produced ahead of the formal
  registry claim/submit flow because the user's Codex is consolidating all
  tools into this repo (PR #71 line) and the user directed cloud production
  to follow the consolidated format. Independent bulk review is pending.
- This candidate is **not accepted, not published, not deployed**. The SPEC
  §6 nine-aspect rubric has not been scored; browser/device evidence is
  NOT_RUN (see VERIFICATION.md).

## Implementation notes

- Pure core `public/js/core/bmi.mjs`: all SPEC §4 constants appear once
  (conversion factors, WHO band edges, Mifflin coefficients, the five
  multipliers); category judged on the unrounded BMI; display rounding is
  half away from zero with a 1e-6 tie nudge for IEEE 754 representation
  error (documented in the core).
- `public/js/app.js`: DOM wiring only; renders via textContent/value;
  invalid fields freeze outputs at the last valid state, marked out of
  date, per SPEC §3; unit toggle converts from the unrounded metric store.
- Zero runtime dependencies; Node ≥ 24; no network, storage, analytics,
  CDN or remote fonts at runtime.

## Next owner

- **Independent reviewer** (not the author): score the nine SPEC §6 aspects
  against the fixed candidate commit, run the SPEC §7 GUI/evidence tests in
  a real browser, and verify the page-honesty gate by reading the rendered
  pages.

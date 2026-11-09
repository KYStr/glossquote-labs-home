# GPA Calculator — production handoff (build-first candidate)

## Fixed specification source
- Repository: `KYStr/glossquote-labs-home`
- Spec: `docs/specs/gpa-calculator/SPEC.md` (+ `BRIEF.md`, `AUTHOR-CHECK.md`) on branch
  `codex/consolidate-20261109`, base commit `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c`.
- No `fixtures.json` ships with this spec; the literal fixtures are SPEC section 4 (P1–P7)
  and are reproduced verbatim in `test/fixtures.test.mjs`.

## Allowed scope
- Implementation lives ONLY in `tools/gpa-calculator/`. No other path was touched.
- No coordination-registry write was made by this build.

## Mode
- Build-first mode: this candidate was produced ahead of the registry claim flow and is
  submitted for independent bulk review. It is NOT accepted and NOT published/deployed.
- Next owner: an independent reviewer (not the author), scoring the SPEC section 6
  nine aspects against the fixed candidate commit.

## Implementation notes
- Pure integer core (`public/js/core/`): points as tenths, credits as halves, GPAs as
  hundredths; one final half-up rounding (SPEC section 4). Scale tables ship once as
  auditable data in `core/scales.mjs` and are audited against SPEC section 4 by
  `scripts/check.mjs`.
- Solver classification uses the exact rational R (never the rounded display value):
  R ≤ 0 guaranteed, R > scale maximum unreachable, otherwise feasible.
- Bilingual pages: `public/index.html` (zh-Hant) and `public/en/index.html` (en),
  preview `noindex`, canonical/hreflang cross-links, same-language home links.
- Zero runtime dependencies, no network/storage/analytics; labels render as text only.

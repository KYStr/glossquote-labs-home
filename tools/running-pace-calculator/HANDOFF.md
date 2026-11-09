# Running Pace Calculator — production handoff

## Fixed specification source

- Repository: `KYStr/glossquote-labs-home`
- Commit: `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c` (branch `codex/consolidate-20261109`)
- Paths: `docs/specs/running-pace-calculator/SPEC.md` (normative contract),
  `docs/specs/running-pace-calculator/BRIEF.md`,
  `docs/specs/running-pace-calculator/AUTHOR-CHECK.md`
- No `fixtures.json` exists for this spec; the normative fixtures are the
  worked examples in SPEC section 4 (fixtures A, B, C, the 10.5 km split
  table, and the four Riegel predictions from 10 km in 45:00). The test
  suites derive their expected values from those printed fixtures and from
  hand-computed cases, never from the implementation's own output.

## Allowed scope

All work is inside `tools/running-pace-calculator/` only. Nothing outside
that directory was modified: no registry writes, no catalog changes, no
changes to `sources/`, `docs/`, the homepage, or other tools.

## Mode and status

Build-first production candidate, following the consolidated single-repo
format of `docs/IMPLEMENTATION-CHECKLIST.md` and `docs/SOURCE-LAYOUT.md`.
This candidate is **not accepted, not published, and not deployed**. It has
not been independently reviewed; the nine product aspects of SPEC section 6
are unscored. Acceptance requires a non-author reviewer to score every
aspect ≥ 90 against this fixed candidate commit with all mandatory checks
complete; unrun checks stay NOT_RUN (see VERIFICATION.md).

## Implementation notes

- Pure core in `public/js/core/` (constants, time grammar/format, unit
  conversion, field validation, solver, split builder, Riegel predictor,
  and a DOM-free calculator state machine); `public/js/app.js` is a thin
  DOM layer rendering with `textContent`/`value` only.
- SPEC constants (mile factor 1.609344, Riegel exponent 1.06, the four
  target distances, input bounds) appear once, in `core/constants.mjs`.
- One spec-errata candidate is recorded in VERIFICATION.md (SPEC section 7
  vs section 4 on the 120 km split table); the implementation follows the
  normative rules of section 4.

## Next owner

The independent reviewer (a non-author actor), for the bulk independent
review of build-first candidates. Review findings belong in
`docs/reviews/` or the tool's `INDEPENDENT-REVIEW.md` per house practice,
on a separate branch; this directory's product files should not be edited
by the reviewer.

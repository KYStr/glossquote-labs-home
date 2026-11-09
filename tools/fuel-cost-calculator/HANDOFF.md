# Handoff — Fuel Cost Calculator production candidate (build-first)

## Fixed specification source

- Repository: `KYStr/glossquote-labs-home`
- Commit: `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c` (branch `codex/consolidate-20261109`)
- Paths: `docs/specs/fuel-cost-calculator/SPEC.md` and `docs/specs/fuel-cost-calculator/BRIEF.md`
  (the spec directory contains no `fixtures.json`; the normative fixtures are
  F1–F5 inline in SPEC section 4, and the tests derive from those plus
  hand-computed cases)

The SPEC is the fixed contract: exact rational constants
(1 mile = 1.609344 km; 1 US gallon = 3.785411784 L; 1 Imperial gallon =
4.54609 L; MPG factors 112903/480 and 56826125/201168), one normalisation
path, per-unit bounds, a single display rounding point (round-half-up), the
per-person share computed from the exact total, and the bilingual honesty
rules. The core carries BigInt fractions end to end; floating point in the
core is a defect per SPEC section 5.

## Placement note

SPEC section 8 was written when productions lived in per-tool repositories.
The 2026-11-09 consolidation instruction (repo `AGENTS.md`, "單一來源與接續
手冊") supersedes that placement: new tools are implemented in the shared
repo under `tools/<slug>/` and submitted by branch/PR there. Scope and
acceptance rules are unchanged.

## Allowed scope

- Only `tools/fuel-cost-calculator/` may be created or modified by this task.
- No changes to the coordination registry, catalog, homepage, other tools,
  or any path outside the allowed scope.

## Mode and status

- Build-first mode: the candidate was built directly against the fixed SPEC
  and is submitted for later independent bulk review.
- It is **not accepted** and **not published**: no independent review has
  scored the nine SPEC section 6 aspects against this candidate, nothing is
  merged, deployed, or added to the catalog.

## Next owner

- Independent reviewer (not the author): verify fixtures F1–F5, the constant
  identities and bounds in a real browser for both languages, score the nine
  aspects against the fixed candidate commit, and record findings. Checks
  that cannot run stay NOT_RUN (see VERIFICATION.md) and block acceptance.

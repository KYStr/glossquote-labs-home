# Handoff — Baker's Percentage Calculator (production candidate, build-first)

## Fixed spec source

- Repository: `KYStr/glossquote-labs-home`
- Spec source commit (consolidation branch base): `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c`
  (branch `codex/consolidate-20261109`)
- Paths: `docs/specs/bakers-percentage-calculator/SPEC.md`, `BRIEF.md`,
  `AUTHOR-CHECK.md` (no fixtures.json exists in the spec package; the
  fixtures K1–K6 are printed in SPEC §4 and are reproduced in
  `test/fixtures.test.mjs`).

## Scope

- Allowed scope: `tools/bakers-percentage-calculator/` only. Nothing
  outside that directory was changed; the coordination registry was not
  written; `sources/` and `archives/` were not touched.
- SPEC §8's own-repo handoff wording (candidate in
  `KYStr/glossquote-labs-bakers-percentage`) is superseded by the
  2026-11-09 consolidation rules recorded in `docs/SOURCE-LAYOUT.md`
  and `AGENTS.md`: new implementations live in `tools/<slug>/` of this
  repo and are delivered by branch + PR here.

## Mode and status

- Build-first mode: this candidate was built directly against the
  fixed SPEC without a prior registry claim, for later independent
  bulk review. It is **not accepted and not published**: no independent
  review has scored the nine aspects of SPEC §6 against this commit,
  and nothing here is deployed or in the catalog.
- Next owner: an independent reviewer (not the author), who verifies
  the nine aspects against the fixed candidate commit and records
  findings; unrun checks stay NOT_RUN (see VERIFICATION.md).

## Implementation notes

- Exact rational (BigInt) arithmetic in `public/js/core/bakers.mjs`;
  percentages are integer tenths internally; the flour basis invariant
  is an exact comparison (no tolerance, no renormalisation).
- Display rounding is a single round half-up to 0.1 per figure, in the
  core's `roundHalfUpTenths`.
- On any input error the UI freezes outputs at the last valid state
  and marks them out of date (SPEC §3); the basis indicator always
  shows the current flour sum.
- Initial screen is the K1 worked example (see VERIFICATION.md for the
  §3 row-count errata candidate).

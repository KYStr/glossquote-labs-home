# Water Intake Calculator — production candidate handoff

## Fixed specification source

- Repository: `KYStr/glossquote-labs-home`
- Base commit: `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c` (branch `codex/consolidate-20261109`)
- Contract: `docs/specs/water-intake-calculator/SPEC.md` (normative) and
  `docs/specs/water-intake-calculator/BRIEF.md`, with the author's documentary
  check in the same directory. No `fixtures.json` exists for this spec; the
  fixtures are SPEC section 4's W1–W4, reproduced verbatim in the tests.
- Candidate branch: `muse/water-intake-calculator-production-20261109`

## Allowed scope

Implementation lives only in `tools/water-intake-calculator/`. Nothing else
in the repo was touched: no registry writes, no catalog changes, no edits to
`sources/`, `archives/`, `docs/` or other tools.

## Mode: build-first

This candidate was produced in build-first mode. It has NOT been through the
independent nine-aspect review of SPEC section 6, is NOT accepted, NOT
merged, NOT published and NOT deployed. The draft PR exists so an independent
reviewer can assess this fixed candidate commit.

Note on SPEC section 8: its handoff wording names a separate tool repository
(`KYStr/glossquote-labs-water-intake`). That wording is superseded by the
2026-11-09 consolidation rules (see `docs/SOURCE-LAYOUT.md` and
`AGENTS.md`): new tools are implemented at `tools/<slug>/` in this repo and
handed over by branch + PR here. The registry claim/readback flow was not
run for this build-first candidate; that remains part of the formal
admission the coordinator arranges.

## What was built

- Pure core (`public/js/core/model.mjs`): the SPEC section 4 model in exact
  integer arithmetic (1/40 ml units), strict weight parsing
  (empty/format/decimals/range refusals), the section 3 freeze lifecycle.
- Bilingual string tables (`public/js/core/strings.mjs`): the on-page model
  statement is generated from the same MODEL data block the core computes
  with; the SPEC 5.2 forbidden-language audit list ships with the tables.
- Static bilingual pages (`public/index.html`, `public/en/index.html`) with
  the full SPEC 5.1 disclaimer directly under the result, prefilled with the
  W1 worked example.
- Deterministic preview build (`scripts/build.mjs`), static check
  (`scripts/check.mjs`), generated-output check
  (`scripts/check-generated.mjs`) and a loopback-only server
  (`scripts/serve.mjs`). Zero runtime dependencies, Node >= 24.

## Next owner

Independent reviewer (not the author): run the nine-aspect review of SPEC
section 6 against the fixed candidate commit in the draft PR, including the
real-browser evidence items listed as NOT_RUN in VERIFICATION.md.

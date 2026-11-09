# Handoff — Placeholder Text Generator (production candidate, build-first)

## Fixed spec source

- Repository: `KYStr/glossquote-labs-home`
- Spec source commit (branch `codex/consolidate-20261109` head at build time):
  `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c`
- Paths: `docs/specs/placeholder-text-generator/SPEC.md` and
  `docs/specs/placeholder-text-generator/BRIEF.md` (no fixtures.json exists;
  the worked fixtures are inline in SPEC section 4 and are pinned in the
  tests).

## Allowed scope

- Implementation lives **only** in `tools/placeholder-text-generator/` of
  `KYStr/glossquote-labs-home`, on branch
  `muse/placeholder-text-generator-production-20261109`.
- No other path was touched. No coordination-registry writes were made.

## Mode

Build-first: this candidate was built directly from the fixed SPEC without
a registry claim, for later independent bulk review. It is **not accepted
and not published**; no merge, deployment or catalog change is implied.
Independent review against the same fixed candidate commit is still
required (SPEC section 6: nine aspects, each >= 90, all mandatory checks
complete; unrun checks stay NOT_RUN and block acceptance).

## Superseded handoff wording

SPEC section 8 describes production landing in the tool's own repository
(`KYStr/glossquote-labs-placeholder-text-generator`). That wording is
superseded by the 2026-11-09 consolidation rules (AGENTS.md /
docs/SOURCE-LAYOUT.md): new implementations live in this shared repo under
`tools/<slug>/`. This candidate follows the consolidation rules.

## Design decisions recorded

- The Latin pool is transcribed from the traditional Lorem ipsum passage
  (the standard passage as printed by lipsum.com, Cicero-derived, public
  domain): 63 distinct words, order of first appearance; count and SHA-256
  checksum recorded in `test/pools.test.mjs` and `public/js/core/pools.mjs`.
- Sentence mode renders as a single block of exactly the requested number
  of sentences; words mode likewise is a single block. The SPEC pins the
  sentence/word models and totals but not a paragraph grouping for these
  two units.
- Character counts are Unicode code points throughout; the characters unit
  truncates the plain-text form (blank-line joins included), per SPEC
  section 4 and fixture 4.

## Next owner

Independent reviewer (not the author): run the SPEC section 7 test list and
the section 6 nine-aspect review against the fixed candidate commit,
including the real-browser evidence items listed as NOT_RUN in
VERIFICATION.md.

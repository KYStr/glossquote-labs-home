# Handoff — Shoe Size Converter (production candidate, build-first)

## Fixed specification source

- Repository: `KYStr/glossquote-labs-home`
- Specification: `docs/specs/shoe-size-converter/SPEC.md` (+ `BRIEF.md`, `AUTHOR-CHECK.md`)
- Fixed at consolidation base commit: `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c`
  (branch `codex/consolidate-20261109`)
- Data provenance: `DATA-SOURCE.md` in this directory (source, access dates,
  row counts, SHA-256 of `public/js/core/tables.mjs`), per SPEC section 4.

## Allowed scope

- This candidate touches ONLY `tools/shoe-size-converter/`.
- No other path in the repository was modified; the coordination registry was
  not written to; nothing was merged, deployed, or published.

## Mode and status

- Build-first mode: this is an implementation candidate produced ahead of the
  independent bulk review. It is NOT accepted, NOT published, and carries no
  aspect scores. Acceptance requires a non-author reviewer scoring all nine
  SPEC section 6 aspects ≥ 90 against the fixed candidate commit, including
  the section 4 spot-check of at least five table rows (D1/D4 rows included)
  against the cited source.
- SPEC section 8's handoff wording names the tool's own repository
  (`KYStr/glossquote-labs-shoe-size-converter`) as the candidate location.
  That wording is superseded by the 2026-11-09 consolidation rules recorded in
  `docs/SOURCE-LAYOUT.md` and the AGENTS.md update of the same date: new tools
  are implemented in this repository under `tools/<slug>/`. This candidate
  follows the consolidation rules; the SPEC text itself was not edited.

## Candidate contents

- `public/` — bilingual pages (zh-Hant default, English under `en/`), pure
  core in `public/js/core/` (tables as auditable data + conversion logic),
  DOM wiring in `public/js/app.js`, styles in `public/styles/`.
- `scripts/` — reproducible preview build, static check, generated-output
  check, shared data gate, loopback-only serve.
- `test/` — node:test suites whose expectations are derived from the SPEC
  fixtures and the transcribed source, not from the implementation.
- `VERIFICATION.md` — commands actually run, results, spec-errata candidates,
  and the explicit NOT_RUN list.

## Next owner

Independent reviewer (non-author): verify the candidate commit, run the
suites, spot-check the tables against the source, and score the nine aspects.
Known item needing a reviewer/coordinator decision: the kids-table
transcription limits recorded in `DATA-SOURCE.md` and `VERIFICATION.md`
(the source children's table leaves some cells unassigned; they are shipped
as explicit nulls, never interpolated).

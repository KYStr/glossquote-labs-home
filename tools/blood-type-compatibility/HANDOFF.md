# HANDOFF — Blood Type Compatibility （血型相容查詢）

## Fixed spec source

- Spec task id: `labs-blood-type-compatibility-spec-20261109`
- Spec id: `spec-blood-type-compatibility-20261109`
- Spec candidate commit: `27343e5d448ef476ba11f09697a8c5f9b30a77e0`
- Spec PR (draft): https://github.com/KYStr/glossquote-labs-home/pull/172
- Spec files were read from the spec workdir
  (`build4/specs/blood-type-compatibility/docs/specs/blood-type-compatibility/`);
  `fixtures.json` is vendored verbatim into `test/fixtures.json`
  (SHA-256 `7b20caec179acc045ecffc0ce45a701fb316aa4f4c8da8e25db401ef8d309a72`)
  because the spec PR is not merged into this candidate's base.

## Base

- Branch: `muse/blood-type-compatibility-production-20261109`
- Base commit (fresh `FETCH_HEAD` of `codex/initial-publication` at build time):
  `c08e3243f0257f80fa512d15b1c37fcbeb6ef962`

## What was built

`tools/blood-type-compatibility/` — a bilingual (zh-Hant default + English),
fully local lookup over the standard blood-type compatibility chart:

- **Single mode** (`{mode, bloodType}`): for one of the eight ABO/Rh codes,
  four lists in canonical order — red cells you can give to / receive from,
  plasma you can give to / receive from — plus universal badges in the fixed
  order `rbc-universal-donor`, `rbc-universal-recipient`,
  `plasma-universal-donor`, `plasma-universal-recipient`, the pinned plasma
  Rh note, and the pinned medical disclaimer on every successful result.
- **Pair mode** (`{mode, donor, recipient}`): text verdicts
  （相容 / 不相容， never colour-only) for red cells and plasma separately.
- Both matrices are vendored verbatim as literal data in
  `public/js/core/blood.mjs` (RBC 8×8, 27 compatible cells; plasma ABO 4×4,
  9 of 16). Receive-from lists are derived by transposing the donate matrix;
  plasma lists are expanded to the eight types (both Rh variants per ABO
  group, canonical order). There is no second stored table.
- Codes are case-sensitive with no normalization (lowercase `o-` → ENUM) and
  the per-mode key set is exact (missing/extra keys → SCHEMA).
- Pure core + generation-guarded Worker controller + Blob-URL module Worker,
  per the handbook file contract (`package.json` Node ≥24 ESM, zero runtime
  dependencies; `public/`, `scripts/{build,check,serve}.mjs`,
  `test/*.test.mjs`). Preview pages are `noindex`, with no canonical and no
  hreflang; home links stay same-language via `../../`.
- Success offers the fixed report download
  `blood-type-compatibility-report.json` (canonical JSON: keys sorted in
  UTF-16 code-unit order, compact, one trailing LF, 2 MiB cap).

## Deviations and reconstructions

1. **SPEC.md is truncated at the fixed candidate (see VERIFICATION.md
   errata 1).** The committed SPEC ends mid-table in the user-flow section;
   the inputs/outputs, implementation, acceptance, tests and handoff
   sections are absent. The lost contract surface was reconstructed from
   BRIEF.md, fixtures.json, AUTHOR-CHECK.md (which carries the full matrix
   audit) and the run's house template. Every fixture reproduces exactly,
   and all seven success fixtures were independently re-derived from the
   antigen rules in AUTHOR-CHECK before implementation.
2. **File layout follows the handbook** (`public/js/core/blood.mjs`,
   `controller.mjs`, `worker-handler.mjs`, Blob-URL worker) rather than the
   BRIEF's `src/` sketch — the handbook and sibling tools govern layout;
   behaviour is unchanged.
3. **Report filename** follows the house `<tool>-report.json` convention
   (`blood-type-compatibility-report.json`); the SPEC's pinned filename sat
   in the truncated portion.
4. **Mode-shaped drafts:** switching mode rebuilds the draft in the new
   mode's exact key set. This is required by the SPEC's own controller
   fixtures (the after-cancel draft is pair-shaped; the after-reset draft is
   the single-shaped default).
5. **Validation order** (reconstructed where the SPEC text is lost):
   whole-shape SCHEMA first; then mode (INPUT_LIMIT → UNICODE → EMPTY →
   ENUM); then the per-mode exact key set (SCHEMA); then the type fields in
   fixed order (single: `bloodType`; pair: `donor` before `recipient`), each
   INPUT_LIMIT → UNICODE → EMPTY → ENUM. All fixture-pinned error cases
   reproduce exactly.
6. **Raw capacity 8 UTF-16 units** is applied to every string field;
   AUTHOR-CHECK pins 8 for blood-type codes, and the house pattern applies
   one capacity to all fields.

## Status

Build-first candidate. Not accepted, not merged, not published. Next owner:
independent reviewer.

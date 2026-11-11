# Wallpaper Calculator — production handoff

## Fixed source

- Spec: `spec-wallpaper-calculator-20261109`, fixed at candidate commit
  `f8939291d2e283f1e6496d3a9cc802a054732200` in `KYStr/glossquote-labs-home`,
  path `docs/specs/wallpaper-calculator/` (BRIEF.md, SPEC.md, fixtures.json,
  AUTHOR-CHECK.md). Draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/226
- The spec was authored build-first in this run; this production was built
  directly against that fixed candidate (read from the author's fixed copy
  in the build5 spec workdir). No registry/coordination commands were run
  by the builder; registration and independent review are the parent
  coordinator's steps.
- Production base: `codex/initial-publication` at
  `328dee40ef0de631d7d50a443e5d5eb2e7668164` (fetched 2026-11-09).
- Scope of this candidate: only `tools/wallpaper-calculator/`.

## What was built

The drops-per-roll wallpaper estimate exactly as the SPEC pins it: integer
centimetre arithmetic end to end (metre strings parsed digit by digit,
never through floating point), strips counted by width per wall, each
strip's length = wall height + fixed TRIM 10 cm rounded up to whole
pattern repeats, full drops per roll by floor division, waste inflating
each wall's strip count before its rolls are counted, and leftovers never
shared between walls. Openings follow the pinned semantics: a dimension
list deducts widths (strips) and net area; a total area deducts net area
only; strip length never shortens.

- `public/js/core/wallpaper.mjs` — pure validation and computation:
  schema (plain objects, own data properties only, mode-dependent exact
  key sets, row element shapes), ENUM, MODE_COMBINATION (per-wall mode
  cannot take an openings list), per-field checks in the SPEC's fixed
  order (INPUT_LIMIT → UNICODE → EMPTY → DECIMAL_FORMAT/INTEGER_FORMAT →
  RANGE, with row numbers for wall/opening rows), the cross-field
  OPENINGS_EXCEED_WALL (width sum before area) and STRIP_TOO_LONG checks,
  the per-wall computation, exact cm² area formatting (round half up to
  0.01 m² strings), and the canonical report serializer.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) over an injected worker
  factory. The draft is a whole core input object; edit() replaces it and
  detects change by deep comparison, so row edits, mode switches and
  unchanged re-renders behave exactly like scalar edits. Late replies are
  dropped by generation and state.
- `public/js/worker-handler.mjs` — fixed worker fragment; the preview
  build concatenates core + handler into the embedded worker source, and
  the page runs it as a module Worker from a Blob URL.
- `public/js/app.js` + two static pages (`public/index.html`,
  `public/en/index.html`) — bilingual UI with perimeter/per-wall modes,
  dynamic wall rows (1–12) and opening rows (1–20), the three openings
  modes, the SPEC-pinned section labels, openings-semantics note,
  conservative-estimate disclosure, FAQ, titles and descriptions;
  textContent/value only.
- `scripts/` — reproducible preview build (byte-identical across runs),
  static check, generated-output check, loopback-only serve.
- `test/` — core/controller/report tests. `test/fixtures.json` is a
  byte-identical vendored copy of the spec candidate's fixtures.json
  (SHA-256 in VERIFICATION.md) because the spec PR is not yet merged into
  the default branch, so the tests stay self-contained.

## Deviations from the SPEC

- The SPEC's implementation section names `src/core.mjs` /
  `src/controller.mjs` / `src/app.mjs` paths (the older template layout).
  This candidate follows the current handbook file contract
  (`public/js/core/`, `public/js/controller.mjs`, `public/js/app.js`),
  which the run's brief mandates; the module split, responsibilities and
  worker architecture are otherwise exactly as the SPEC describes.
- No other deviations.

## Spec errata candidates

- **SCHEMA row-element error shape (interpretation recorded, not a
  contradiction):** the SPEC pins that a malformed row element reports
  SCHEMA with `row` = the element index, and that "other SCHEMA" errors
  have field/row null; it does not explicitly state the `field` for a row
  element shape error. This implementation reports `field: null` with the
  row set. If the independent reviewer reads the SPEC as requiring
  `field: "walls"` / `"openings"` there, only `readSchema` in the core
  changes; no fixture covers the case.
- **Mode-dependent key-set check ordering (interpretation recorded):**
  the SPEC lists key sets under validation step 1 (SCHEMA) and enum
  values under step 2, but the expected key set is only defined once the
  mode values are known. This implementation checks everything
  mode-independent at the schema step (unknown keys, always-keys, types,
  element shapes), then ENUM, then the mode-dependent key set as SCHEMA.
  Observable behaviour differs from a strict reading only for inputs that
  are simultaneously enum-invalid and key-set-invalid, which no fixture
  covers.
- No contradictions were found in the SPEC's rules or fixture values:
  every fixture expected value agrees with the SPEC's stated rules as
  implemented.

## Next owner

Independent reviewer (not the author) against the fixed candidate commit
of the production PR: the nine predeclared aspects from the SPEC's
acceptance section, with real-browser evidence still NOT_RUN (see
VERIFICATION.md).

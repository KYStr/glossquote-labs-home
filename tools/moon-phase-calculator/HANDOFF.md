# Handoff: Moon Phase Calculator （月相計算機）

## Fixed spec source

- Spec task: `labs-moon-phase-calculator-spec-20261109`
- Spec id: `spec-moon-phase-calculator-20261109`
- Spec candidate commit: `a07fd30d844486b74683d38217d62781526033e9`
- Draft spec PR: https://github.com/KYStr/glossquote-labs-home/pull/166
- Implementation branch: `muse/moon-phase-calculator-production-20261109`
- Implementation base commit: `c08e3243f0257f80fa512d15b1c37fcbeb6ef962`
  (`codex/initial-publication` tip at build time)

The spec PR is not merged into this branch's base, so the spec's
`fixtures.json` is vendored verbatim at `test/fixtures.json`
(SHA-256 `cbf513e73772ecb2b7d5115b9d66072e5b67a62ed45fa8b812dab544ead4499e`,
byte-identical to the spec candidate's file) and the core, site, and
report tests encode its expected values literally.

## What was built

`tools/moon-phase-calculator/` per the handbook file contract, zero
runtime dependencies, Node ≥ 24, ESM:

- `public/js/core/moon.mjs` — the pure core. Inputs are exactly
  `{date, utcOffset}` strings. Whole-shape SCHEMA validation first
  (plain object, exactly the two own data properties, accessors
  rejected without invocation), then per field in `date` →
  `utcOffset` order: INPUT_LIMIT (raw > 10 / > 6 UTF-16 code units)
  → UNICODE (unpaired surrogate) → EMPTY → DATE_FORMAT /
  OFFSET_FORMAT → INVALID_DATE (real Gregorian date incl. the
  century leap rule) → RANGE (date 1900-01-01..2100-12-31; offset
  minutes ∈ {00,15,30,45}, total −720..+840 minutes).
- Calendar math uses integer algorithms only — Fliegel & Van
  Flandern JDN conversion and the Richards inverse — and the core
  never constructs or calls `Date`, so results cannot depend on the
  host timezone (verified by running the suite under four `TZ`
  values). Evaluation is at 12:00 UTC, so the JD is the integer JDN.
  Model constants exactly as pinned: `S = 29.530588853`,
  `JD_REF = 2451550.1` (the constant governs, not its clock label).
  `age = (JD − JD_REF) mod S` in [0, S);
  `phaseIndex = floor(((age + S/16) mod S) / (S/8)) mod 8`;
  illumination `(1 − cos(2π·age/S))/2 × 100`. Event dates come from
  the UNROUNDED event JD via `floor(JD + 0.5)` and the integer
  inverse; local dates add the offset minutes before conversion.
  Display values are rounded half-up to 1 decimal once, from the
  unrounded values. Result fields in the SPEC's order.
- The fixed report download (`moon-phase-report.json`): a
  hand-written canonical serializer (object keys sorted recursively
  by UTF-16 code units, arrays in order, no whitespace, exactly one
  trailing LF, UTF-8 no BOM) that never calls an input's `toJSON`;
  2,097,152-byte limit → OUTPUT_LIMIT. Numbers serialize through the
  platform JSON number serializer.
- `public/js/controller.mjs` — the fixed state machine
  (empty/dirty/busy/success/error/cancelled) with a generation guard;
  the public success checkpoint is `reportAvailable`. Defaults
  `{date: "", utcOffset: "+08:00"}`; the example is fixtures case 1
  (`reference-epoch`).
- `public/js/app.js` — DOM wiring: two text fields, per-field error
  slots, a polite live status, the summary (phase, age, illumination,
  Julian day, next new/full with days + UTC/local dates), the SPEC's
  fixed model note in the results area, and the download button,
  whose Blob URL is revoked after 30 s or on invalidation.
- Bilingual pages: zh-Hant default at `public/index.html`, English at
  `public/en/index.html`, with the SPEC-pinned titles, descriptions,
  FAQ answers, and model note. Candidate pages carry
  `noindex, nofollow` and no canonical/hreflang; language and home
  links are relative paths (`./en/index.html`, `../../`).
- `scripts/{build,check,serve,check-generated}.mjs` — reproducible
  preview build (production build deliberately refused: the planned
  origin is not configured), static checks, loopback serve, and
  generated-output verification.

## Recorded interpretations and deviations

- **Candidate metadata**: the SPEC pins the preview convention
  (noindex, no canonical/hreflang) over the handbook's generic
  candidate template; the SPEC wins.
- **Source layout**: file placement follows the handbook
  (`public/js/core/*.mjs`, `public/js/controller.mjs`, root
  `scripts/`) rather than the SPEC's `src/` sketch; behaviour is
  unchanged.
- **Report number serialization**: integers print as integers and
  the 1-decimal displays print minimally (e.g. `0`, `100`, `0.1`),
  via the platform JSON number serializer on values already rounded
  once — matching the SPEC's "numbers and strings via the platform
  JSON serializer" rule and its pinned deliberate edge (illumination
  exactly 0 at the reference epoch prints `0`).
- **SPEC consistency pre-check**: before implementing, all 12
  literal core success fixtures were recomputed from the SPEC's
  stated rules with an independent scratch program; every fixture
  matched the rules exactly, so no fixture was overridden and no
  errata candidate arose (see VERIFICATION.md).

## State

Build-first production candidate. Not registry-submitted, not
independently reviewed, not accepted, not published. See
VERIFICATION.md for the commands actually run and the explicit
NOT_RUN list.

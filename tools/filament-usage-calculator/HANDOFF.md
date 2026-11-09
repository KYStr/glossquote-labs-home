# Handoff — Filament Usage Calculator （3D 列印線材用量換算）

Build-first production candidate. Not accepted, not merged, not published.

## Fixed spec source

- Spec task id: `labs-filament-usage-calculator-spec-20261109`
- Spec id: `spec-filament-usage-calculator-20261109`
- Spec candidate commit: `599649b23a0e4103eb019e90190d7def7c70e4ea`
- Draft spec PR: https://github.com/KYStr/glossquote-labs-home/pull/174
- The spec is not yet merged into the base branch, so the spec fixtures
  are vendored verbatim at `test/fixtures.json` (SHA-256
  `77fc1d1e63b41655880acc376beaddc59352678b8af8ff87ac9a6d1b5ee6216f`,
  byte-identical to the spec candidate's file, verified with `cmp`).

## Base

- Branch: `muse/filament-usage-calculator-production-20261109`
- Base: `codex/initial-publication` at
  `c08e3243f0257f80fa512d15b1c37fcbeb6ef962`

## What was built (only under `tools/filament-usage-calculator/`)

- `public/js/core/filament.mjs` — pure core. IEEE-754 double arithmetic
  with no intermediate rounding, exactly as the SPEC pins: area
  A = π(d/2)², grams-per-metre = A × ρ over the fixed six-material
  density table (PLA 1.24 / PETG 1.27 / ABS 1.05 / TPU 1.21 / ASA 1.07
  / PC 1.20); four modes (length, weight, spool, cost); each output
  rounded half-up exactly once and formatted to its pinned decimals.
  Full SPEC validation pipeline: twelve-string-field schema (accessors
  never invoked), then per-field raw capacity → unpaired surrogate
  across ALL fields in fixed field order, then value checks on active
  fields only (mode first, since it decides the active set), then the
  spool cross-field rule (gross < empty → NEGATIVE_REMAINING on
  grossWeightG; gross == empty is a legal zero). Includes the fixed
  report builder: `filament-usage-report.json`, hand-written
  sorted-key serializer (never calls `toJSON`), one trailing LF,
  2,097,152-byte OUTPUT_LIMIT.
- `public/js/controller.mjs` — generation-guarded controller with the
  six pinned states (empty/dirty/busy/success/error/cancelled); fresh
  worker per run; edit/cancel/reset terminate work; late replies are
  dropped; mode switches never clear typed values.
- `public/js/worker-handler.mjs` + `public/js/app.js` — module Worker
  from a Blob URL over the build-embedded fixed core+handler source;
  DOM wiring uses textContent/value only; all error/status strings are
  the SPEC's pinned bilingual texts verbatim; report object URL
  revoked after 30 s or on invalidation.
- `public/index.html` (zh-Hant) + `public/en/index.html` — pinned
  titles, descriptions, disclosure sentence next to every result, the
  pinned FAQ pair, formula notes; preview noindex, no
  canonical/hreflang/sitemap (per the SPEC's preview convention).
- `public/styles/app.css` — house design tokens (the verified house
  pattern from the sibling run-4 tools).
- `scripts/{build,check,check-generated,serve}.mjs` — reproducible
  preview build (sorted manifest, fixed timestamps), static checks,
  generated-output verification, loopback-only serve with the pinned
  CSP/nosniff/no-referrer/Permissions-Policy/X-Robots-Tag headers.
- `test/core.test.mjs`, `test/controller.test.mjs` — 29 tests. All 11
  core fixture cases and all 3 controller fixture cases are encoded as
  literals from the vendored fixtures; additional expectations (full
  12-cell grams-per-metre table, 100000 m / 1000000 g legal maxima,
  just-over RANGE, custom-empty-0 spool, USD cost, phase-order pins)
  were derived by hand from the SPEC's rules with independent
  double-precision arithmetic (Python `math.pi`) before the
  implementation existed.

## Deviations and interpretations

1. Layout: handbook `public/js/…` layout instead of the SPEC's
   `src/*.mjs` sketch — the recurring house-pattern deviation;
   behaviour unchanged.
2. The root status line uses a fullwidth colon in zh-Hant
   （欄位名：訊息）, matching the sibling tools.
3. `package.json` test script is `node --test test/*.test.mjs`
   (glob form): on this machine's Node v24.22.1, `node --test test/`
   resolves the directory as an entry module and fails before running
   any test.

## Spec-errata candidates

None. Every fixture expectation agrees with the SPEC's stated rules;
all 11 core fixture values were independently recomputed from the
SPEC's formulas before the implementation existed and matched.

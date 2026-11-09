# Handoff — Video File Size Calculator （影片檔案大小計算機）

Build-first production candidate. Not accepted, not merged, not published.

## Fixed spec source

- Spec task id: `labs-video-file-size-calculator-spec-20261109`
- Spec id: `spec-video-file-size-calculator-20261109`
- Spec candidate commit: `4bf07b24a0342fa9a77ff899488aa862ddbf9a5d`
- Draft spec PR: https://github.com/KYStr/glossquote-labs-home/pull/168
- The spec is not yet merged into the base branch, so the spec fixtures
  are vendored verbatim at `test/fixtures.json` (SHA-256
  `9940dd2d10fd7e863bc107ae59247068bfe915bf18ebedd2ed27afd066c0a553`,
  byte-identical to the spec candidate's file).

## Base

- Branch: `muse/video-file-size-calculator-production-20261109`
- Base: `codex/initial-publication` at
  `c08e3243f0257f80fa512d15b1c37fcbeb6ef962`

## What was built (only under `tools/video-file-size-calculator/`)

- `public/js/core/video-size.mjs` — pure core. Exact BigInt rational
  arithmetic end to end: video bitrate = rate (hundredths of Mbps) ×
  10,000 × codec factor (h264 1/1, h265 11/20, av1 9/20, prores422
  15/1), audio added unfactored; size mode rounds bytes half-up and
  derives all four display strings (MB/GB/MiB/GiB) from the unrounded
  exact value; duration mode floors the seconds against the exact
  target bytes. Full SPEC validation pipeline: nine-string-field
  schema (accessors never invoked), per-field raw capacity → unpaired
  surrogate → (active fields only) empty → grammar → enum → range,
  first error wins, inactive fields checked for capacity/unicode only.
  Includes the fixed report builder: `video-file-size-report.json`,
  hand-written sorted-key serializer (never calls `toJSON`), one
  trailing LF, 2,097,152-byte OUTPUT_LIMIT.
- `public/js/controller.mjs` — generation-guarded controller with the
  six pinned states (empty/dirty/busy/success/error/cancelled); fresh
  worker per run; edit/cancel/reset terminate work; late replies are
  dropped; mode/source switches never clear typed values.
- `public/js/worker-handler.mjs` + `public/js/app.js` — module Worker
  from a Blob URL over the build-embedded fixed core+handler source;
  DOM wiring uses textContent/value only; report object URL revoked
  after 30 s or on invalidation.
- `public/index.html` (zh-Hant) + `public/en/index.html` — pinned
  titles, descriptions, disclosure, formula, both FAQ entries, the
  ProRes caveat next to the result; preview noindex, no
  canonical/hreflang/sitemap (per the SPEC's preview convention).
- `public/styles/app.css` — house design tokens (copied from the
  sibling protein-intake-calculator tool, the verified house pattern).
- `scripts/{build,check,check-generated,serve}.mjs` — reproducible
  preview build (sorted manifest, fixed timestamps), static checks,
  generated-output verification, loopback-only serve with the pinned
  CSP/nosniff/no-referrer/Permissions-Policy/X-Robots-Tag headers.
- `test/core.test.mjs`, `test/controller.test.mjs` — 29 tests. All 10
  core fixture cases and all 3 controller fixture cases are encoded as
  literals from the vendored fixtures; additional endpoint/property
  expectations (999:59:59 maximum, 0.1/1000 Mbps custom endpoints,
  near-2^53 target boundary, fractional GiB target, floor invariant)
  were derived by hand from the SPEC's rules with independent exact
  arithmetic before the implementation existed.

## Deviations and interpretations

1. Layout: handbook `public/js/…` layout instead of the SPEC's
   `src/*.mjs` sketch — the recurring house-pattern deviation;
   behaviour unchanged.
2. `targetSize` RANGE is evaluated after `targetUnit` has been
   validated, because the range is defined on the converted byte value
   and the conversion requires a valid unit. All single-field error
   cases behave exactly as pinned; the only observable difference is
   an input that is simultaneously out-of-range on targetSize AND
   invalid on targetUnit, which reports the targetUnit error.
3. The root status line uses a fullwidth colon in zh-Hant
   （欄位名：訊息）, matching the sibling tools.
4. `package.json` test script is `node --test test/*.test.mjs`
   (glob form): on this machine's Node v24.22.1, `node --test test/`
   resolves the directory as an entry module and fails before running
   any test.

## Spec-errata candidates

None. Every fixture expectation agrees with the SPEC's stated rules,
including the ProRes half-up boundary case (705.525 → "705.53") and the
zero-second duration result.

# Handoff — Child Height Predictor （兒童身高預測）

Build-first production candidate. Not accepted, not merged, not published;
an independent reviewer must still score the nine predeclared aspects
against this fixed candidate.

## Fixed spec source

- Spec id: `spec-child-height-predictor-20261109`
- Spec candidate commit: `9da27fecab8e7716e27e7dec853e3231a99721ba`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/238
- Spec files: `docs/specs/child-height-predictor/{BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md}` at that commit
- Vendored fixtures hash (SHA-256 of `test/fixtures.json`, byte-identical to the SPEC file): `daace60a0d1ec2cf943801b17473ac2d799be1e8b0832b65496aa93dad867f02`

## Base and scope

- Production base: `codex/initial-publication` @ `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a` (verified fresh `FETCH_HEAD` at build time; branch head equals it, no reset needed)
- Branch: `muse/child-height-predictor-production-20261109`
- Changed paths: only `tools/child-height-predictor/` (new directory).
  `dist-preview/` is a reproducible build artifact and is git-ignored;
  `BUILD-MANIFEST.json` is committed and describes `dist-preview/` exactly.
- No registry/coordination commands were run by the builder.

## What was built

- `public/js/core/core.mjs` — pure core. Exact integer arithmetic in
  twentieths of a centimetre: boy (F + M + 13) / 2, girl (F + M − 13) / 2,
  target range ±8.5 cm from the unrounded estimate, each of the three
  outputs independently rounded half-up to one decimal via
  `floor((x20 + 1) / 2)`; no floating point decides a rounding. SPEC
  validation order (SCHEMA → fatherHeightCm → motherHeightCm → childSex;
  per field INPUT_LIMIT → UNICODE → EMPTY → DECIMAL_FORMAT/RANGE, ENUM
  for childSex) with the fixed error codes/fields; report serialization
  (compact JSON, keys sorted by UTF-16 code units recursively, one
  trailing LF, 2,097,152-byte cap → OUTPUT_LIMIT).
- `public/js/core/controller.mjs` — draft + generation state machine with
  the six flow states (empty / dirty / busy / success / error / cancelled);
  edits, sex changes, example loads, cancel and reset invalidate the old
  result and download immediately; late results from older generations are
  dropped; transport is injected.
- `public/js/app.js` + `public/js/worker-handler.mjs` — the build embeds
  the fixed core + handler source bytes into the built app; the page
  creates a module Worker from a Blob URL of that string, terminates it on
  cancel / edit / reset / replace / success / pagehide, and only creates
  the download Blob URL on an explicit click (revoked after 30 s or on
  invalidation). All rendering uses textContent/value. The fixed SPEC
  disclaimer is shown in full beside the result on success, in both
  languages, never folded.
- `public/index.html` (zh-Hant) and `public/en/index.html` — full static
  bilingual pages with the SPEC's fixed titles, descriptions, H1, labels,
  FAQ (all four SPEC items) and rules disclosure; candidate convention:
  robots noindex, no production canonical/hreflang.
- `public/styles/app.css` — shared paper/ink tokens, shared breakpoints
  (48rem / 75rem), two-layer focus treatment, 44 px targets, reduced-motion
  support.
- `scripts/build.mjs` (reproducible preview build with Worker-source
  embedding + deterministic `BUILD-MANIFEST.json`),
  `scripts/check.mjs` (syntax, zero-dependency manifest, forbidden sinks,
  page metadata, fixed-disclaimer presence, fixture coverage and the
  vendored-fixture SHA-256), `scripts/check-generated.mjs` (rebuild and
  byte-compare, plus manifest-vs-dist-preview check),
  `scripts/serve.mjs` (loopback-only static server with the SPEC CSP and
  security headers, traversal/symlink rejection, no logging).
- `test/` — 47 tests: all 14 core fixtures and 3 controller fixtures from
  the SPEC verbatim, plus hand-derived boundary/grammar/half-up-tie/
  invariant/schema/order cases, report byte and SHA-256 checks, page
  checks, build reproducibility, an end-to-end run of the embedded Worker
  source, a fake-DOM app suite (success, validation focus, Worker failure
  modes, late-result rejection), and an HTTP serve probe.

## Deviations

- File layout follows the handbook file contract
  (`public/js/core/*.mjs`, `public/js/app.js`) rather than the `src/*.mjs`
  names used descriptively in SPEC §implementation; every behaviour the
  SPEC pins (pure core, controller generations, fixed-source Worker,
  test-imported same core) is preserved.
- No spec errata candidates: every fixture expectation was reproduced from
  the SPEC's stated rules exactly (see VERIFICATION.md). All six success
  fixtures were re-derived independently with exact Fraction arithmetic
  before the core was written, and agree 6/6.

## Next owner

Independent reviewer (not the author): score the nine aspects on the PR
head, with the NOT_RUN items in VERIFICATION.md still open.

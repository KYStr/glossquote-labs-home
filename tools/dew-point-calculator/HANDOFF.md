# Dew Point Calculator — production handoff

## Fixed source

- Spec: `spec-dew-point-calculator-20261109`, fixed at candidate commit
  `8b89efbe8fdd9f62f7fbeb0d9a5290c0a8a3c462` in `KYStr/glossquote-labs-home`,
  path `docs/specs/dew-point-calculator/` (BRIEF.md, SPEC.md, fixtures.json,
  AUTHOR-CHECK.md). Draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/230
- The spec was authored build-first in this run; this production was built
  directly against that fixed candidate. No registry/coordination commands
  were run by the builder; registration and independent review are the
  parent coordinator's steps.
- Production base: `codex/initial-publication` at
  `db4b1f43f318635fcab0132832940adf97f5140a` (fetched 2026-11-09).
- Scope of this candidate: only `tools/dew-point-calculator/`.

## What was built

Dew point, absolute humidity and a seven-band comfort classification from
air temperature and relative humidity, exactly as the SPEC pins it: the
Magnus form over water with a = 17.27, b = 237.7 °C, es(0 °C) = 6.112 hPa
and the absolute-humidity constant 216.7, an IEEE-754 double pipeline
with no intermediate rounding, one final rounding
r(x) = floor(x × 10 + 0.5) / 10 per output, and the comfort band looked
up from the ROUNDED dew point.

- `public/js/core/dew-point.mjs` — pure validation (schema with accessor
  rejection, per-field INPUT_LIMIT → UNICODE → EMPTY → DECIMAL_FORMAT →
  RANGE in the fixed field order temperature, relativeHumidity; RH ≤ 0
  rejected at RANGE so ln is never evaluated on a non-positive number),
  the Magnus vapor-pressure chain, display formatting, and the canonical
  report serializer for the fixed download `dew-point-report.json`.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) over an injected worker
  factory; late replies are dropped by generation and state.
- `public/js/worker-handler.mjs` — fixed worker fragment; the preview
  build concatenates core + handler into the embedded worker source, and
  the page runs it as a module Worker from a Blob URL.
- `public/js/app.js` + two static pages (`public/index.html`,
  `public/en/index.html`) — bilingual UI with the SPEC-pinned labels,
  titles, descriptions, FAQ, comfort-band table and disclosure;
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
- The build brief that commissioned this production mentioned Magnus
  coefficients a = 17.625 / b = 243.04 in passing. The SPEC itself pins
  a = 17.27 / b = 237.7 (scope and inputsOutputs sections), AUTHOR-CHECK
  documents why that set was chosen over the Alduchov & Eskridge set, and
  every fixture was derived with it. Verified before building: the
  SPEC-pinned constants reproduce all 13 success fixtures exactly, while
  17.625 / 243.04 fail two of them (`dry-winter`, `endpoint-hot-saturated`).
  The SPEC was implemented as written; no fixture or rule was changed.
- No other deviations. No spec-errata candidates were found: every
  fixture expected value agrees with the SPEC's stated rules as
  implemented (independently re-derived by the builder with 50-digit
  Decimal arithmetic for the additional test cases).

## Next owner

Independent reviewer (not the author) against the fixed candidate commit
of the production PR: the nine predeclared aspects from the SPEC's
acceptance section, with real-browser evidence still NOT_RUN (see
VERIFICATION.md).

# Feels-Like Temperature Calculator — production handoff

## Fixed source

- Spec: `spec-feels-like-temperature-20261109`, fixed at candidate commit
  `0b6ec5c684ba0370dec57f7a17712f3b57a09a56` in `KYStr/glossquote-labs-home`,
  path `docs/specs/feels-like-temperature/` (BRIEF.md, SPEC.md,
  fixtures.json, AUTHOR-CHECK.md). Draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/229
- The spec was authored build-first in this run; this production was built
  directly against that fixed candidate. No registry/coordination commands
  were run by the builder; registration and independent review are the
  parent coordinator's steps.
- Production base: `codex/initial-publication` at
  `db4b1f43f318635fcab0132832940adf97f5140a` (fetched 2026-11-09).
- Scope of this candidate: only `tools/feels-like-temperature/`.

## What was built

One input group (air temperature °C, wind speed km/h, relative humidity %)
mapped to exactly one model by its official domain, exactly as the SPEC
pins it: wind chill (Environment Canada / NWS 2001; T ≤ 10 °C and
v > 4.8 km/h, the wind boundary strict), heat index (Rothfusz regression
with the two NWS adjustments; this tool's domain T ≥ 27 °C and RH ≥ 40 %),
or the actual temperature flagged as outside both domains. IEEE-754 double
arithmetic in the SPEC's pinned operation order (squares as
multiplications), the pinned rounding r(x) = floor(x·10 + 0.5)/10 applied
once at output, and no clamping anywhere.

- `public/js/core/feels-like.mjs` — pure validation (schema with accessor
  rejection, per-field INPUT_LIMIT → UNICODE → EMPTY → DECIMAL_FORMAT →
  RANGE in the fixed field order temperature, windSpeed, humidity), model
  selection, both formulas, display formatting, and the canonical report
  serializer.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) over an injected worker
  factory; late replies are dropped by generation and state.
- `public/js/worker-handler.mjs` — fixed worker fragment; the preview
  build concatenates core + handler into the embedded worker source, and
  the page runs it as a module Worker from a Blob URL.
- `public/js/app.js` + two static pages (`public/index.html`,
  `public/en/index.html`) — bilingual UI with the SPEC-pinned labels,
  model names, FAQ, titles and descriptions; textContent/value only.
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
- No other deviations. No spec-errata candidates were found: all 13
  successful core fixtures were reproduced by an independent Python
  implementation of the SPEC's formulas before this code was written, and
  every fixture expected value agrees with the SPEC's stated rules as
  implemented.

## Next owner

Independent reviewer (not the author) against the fixed candidate commit
of the production PR: the nine predeclared aspects from the SPEC's
acceptance section, with real-browser evidence still NOT_RUN (see
VERIFICATION.md).

# Steps Converter — production handoff

## Fixed source

- Spec: `spec-steps-converter-20261109`, fixed at candidate commit
  `70dce9d009d060b386f27db533a9097f9bd9c299` in
  `KYStr/glossquote-labs-home`, path `docs/specs/steps-converter/`
  (BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md). Draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/234
- The spec was authored build-first in this run; this production was
  built directly against that fixed candidate. No registry/coordination
  commands were run by the builder; registration and independent review
  are the parent coordinator's steps.
- Production base: `codex/initial-publication` at
  `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a` (fetched 2026-11-21).
- Scope of this candidate: only `tools/steps-converter/`.

## What was built

One step count converts to a distance using either a measured stride
or a height-based stride estimate (height × 0.414), plus an optional
gross calorie estimate (0.75 kcal/kg/km), exactly as the SPEC pins
it: all computation in exact rational arithmetic with BigInt — never
a floating-point intermediate — and each output rounded half-up
exactly once from the unrounded exact value (stride to 1 decimal,
distance to 2 decimals, steps per km and calories to whole numbers).
Display-rounded values never feed back into any computation.

- `public/js/core/steps.mjs` — pure validation (schema with accessor
  rejection; per-field INPUT_LIMIT → UNICODE → EMPTY → grammar →
  RANGE in the fixed field order steps, strideSource, strideCm,
  heightCm, calories, weightKg; an inactive field is checked for
  INPUT_LIMIT and UNICODE only and its content otherwise ignored),
  the exact-rational computation (stride 207/500, calories 3/4), and
  the canonical report serializer.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) over an injected worker
  factory; late replies are dropped by generation and state.
- `public/js/worker-handler.mjs` — fixed worker fragment; the preview
  build concatenates core + handler into the embedded worker source,
  and the page runs it as a module Worker from a Blob URL.
- `public/js/app.js` + two static pages (`public/index.html`,
  `public/en/index.html`) — bilingual UI with the SPEC-pinned labels,
  estimate disclaimer, FAQ, titles and descriptions; the stride field
  is enabled only in measured mode, the height field only in height
  mode, the weight field only while calories are on; the estimate
  disclaimer sits outside the results panel so it stays visible in
  every state; textContent/value only.
- `scripts/` — reproducible preview build (byte-identical across runs),
  static check, generated-output check, loopback-only serve.
- `test/` — core/controller/report tests. `test/fixtures.json` is a
  byte-identical vendored copy of the spec candidate's fixtures.json
  (SHA-256 in VERIFICATION.md) because the spec PR is not yet merged
  into the base branch, so the tests stay self-contained.

## Deviations from the SPEC

- The SPEC's implementation section names `src/core.mjs` /
  `src/controller.mjs` / `src/app.mjs` paths (the older template
  layout). This candidate follows the current handbook file contract
  (`public/js/core/`, `public/js/controller.mjs`, `public/js/app.js`),
  which the run's brief mandates; the module split, responsibilities
  and worker architecture are otherwise exactly as the SPEC describes.
- No other deviations. No spec-errata candidates were found: every
  fixture expected value follows from the SPEC's stated rules as
  implemented (the pinned exact-rational computation was additionally
  reproduced against all successful core fixtures with an independent
  BigInt implementation in the test file before the product code was
  relied on).

## Next owner

Independent reviewer (not the author) against the fixed candidate
commit of the production PR: the nine predeclared aspects from the
SPEC's acceptance section, with real-browser evidence still NOT_RUN
(see VERIFICATION.md).

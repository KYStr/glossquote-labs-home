# Race Time Predictor — production handoff

## Fixed source

- Spec: `spec-race-time-predictor-20261109`, fixed at candidate commit
  `304df4065f31ee63cefb2f22b388b8865a5ec947` in
  `KYStr/glossquote-labs-home`, path `docs/specs/race-time-predictor/`
  (BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md). Draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/231
- The spec was authored build-first in this run; this production was
  built directly against that fixed candidate. No registry/coordination
  commands were run by the builder; registration and independent review
  are the parent coordinator's steps.
- Production base: `codex/initial-publication` at
  `db4b1f43f318635fcab0132832940adf97f5140a` (fetched 2026-11-09).
- Scope of this candidate: only `tools/race-time-predictor/`.

## What was built

One known race result predicts finish times for 5K, 10K, the half
marathon and the marathon, plus one optional custom target distance,
exactly as the SPEC pins it: the Riegel formula with exponent 1.06 in
IEEE-754 doubles (ratio → `Math.pow(ratio, 1.06)` → × T1, intermediates
never rounded), predicted seconds rounded half-up once, and each pace
derived from the unrounded raw seconds — never back-computed from the
rounded prediction.

- `public/js/core/race.mjs` — pure validation (schema with accessor
  rejection; per-field INPUT_LIMIT → UNICODE → EMPTY → grammar → RANGE
  in the fixed field order knownPreset, knownCustomM, knownTime,
  targetCustomM; an inactive knownCustomM is capacity-checked only and
  its content otherwise ignored), the prediction computation, display
  formatting, and the canonical report serializer.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) over an injected worker
  factory; late replies are dropped by generation and state.
- `public/js/worker-handler.mjs` — fixed worker fragment; the preview
  build concatenates core + handler into the embedded worker source, and
  the page runs it as a module Worker from a Blob URL.
- `public/js/app.js` + two static pages (`public/index.html`,
  `public/en/index.html`) — bilingual UI with the SPEC-pinned labels,
  estimate disclaimer, FAQ, titles and descriptions; the custom-distance
  field is enabled only while the Custom preset is selected;
  textContent/value only.
- `scripts/` — reproducible preview build (byte-identical across runs),
  static check, generated-output check, loopback-only serve.
- `test/` — core/controller/report tests. `test/fixtures.json` is a
  byte-identical vendored copy of the spec candidate's fixtures.json
  (SHA-256 in VERIFICATION.md) because the spec PR is not yet merged into
  the base branch, so the tests stay self-contained.

## Deviations from the SPEC

- The SPEC's implementation section names `src/core.mjs` /
  `src/controller.mjs` / `src/app.mjs` paths (the older template
  layout). This candidate follows the current handbook file contract
  (`public/js/core/`, `public/js/controller.mjs`, `public/js/app.js`),
  which the run's brief mandates; the module split, responsibilities and
  worker architecture are otherwise exactly as the SPEC describes.
- No other deviations. No spec-errata candidates were found: every
  fixture expected value follows from the SPEC's stated rules as
  implemented (the pinned computation was additionally reproduced
  against all success fixtures with a scratch implementation before
  product code was written).

## Known overlap (for the independent reviewer)

The [fixed Running Pace specification](https://github.com/KYStr/glossquote-labs-home/blob/40a7dc689e8e2fc2c527c323ca68398d95e9db19/docs/specs/running-pace-calculator/SPEC.md#L6-L23) accepts a known distance in kilometres or miles and already shows Riegel 1.06 predictions with pace for the four standard distances. This candidate offers a direct prediction workflow and an optional custom target. The specification comparison was corrected on 2026-11-10. Independent scope review is pending.

## Next owner

Independent reviewer (not the author) against the fixed candidate
commit of the production PR: the nine predeclared aspects from the
SPEC's acceptance section, with real-browser evidence still NOT_RUN
(see VERIFICATION.md).

# Car Depreciation Calculator — production handoff

## Fixed source

- Spec task: `labs-car-depreciation-calculator-spec-20261109`
- Spec: `spec-car-depreciation-calculator-20261109`, fixed at candidate commit
  `efad9c067e608d72b02078755e24357d5635b3b7` in `KYStr/glossquote-labs-home`,
  path `docs/specs/car-depreciation-calculator/` (BRIEF.md, SPEC.md,
  fixtures.json, AUTHOR-CHECK.md). Draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/250
- The spec was authored build-first in this run; this production was built
  directly against that fixed candidate. No registry/coordination commands
  were run by the builder; registration and independent review are the
  parent coordinator's steps.
- Production base: `codex/initial-publication` at
  `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a` (fetched 2026-11-21).
- Scope of this candidate: only `tools/car-depreciation-calculator/`.

## What was built

Three depreciation models exactly as the SPEC pins them: integer NT$ and
hundredths of a percent end to end, BigInt arithmetic, per-year half-up
rounding on the pinned rounding chain (each year's end value is computed
from the previous year's already-rounded end value, never from a closed
form); the salvage floor applies to all three models and clamps the value
from the year the unclamped raw value first falls below it; the
year-by-year schedule length always equals the years field, with the last
table row repeating when the table runs out and extra rows ignored but
still validated.

- `public/js/core/car-depreciation.mjs` — pure validation (schema with
  accessor rejection and the union-key gate, per-field INPUT_LIMIT →
  UNICODE → EMPTY → FORMAT → RANGE in the fixed field order, tableRates
  with ROW_LIMIT then per-row DECIMAL_FORMAT/RANGE carrying 1-based row
  numbers, method-specific presence checked as SCHEMA only after the
  method validates), the three-model chain, display formatting, the
  five-field core-input builder, and the canonical report serializer.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) over an injected worker
  factory; the seven-field draft is kept whole, but only the exact
  five-field core input for the current method is posted to the worker;
  late replies are dropped by generation and state.
- `public/js/worker-handler.mjs` — fixed worker fragment; the preview
  build concatenates core + handler into the embedded worker source, and
  the page runs it as a module Worker from a Blob URL.
- `public/js/app.js` + two static pages (`public/index.html`,
  `public/en/index.html`) — bilingual UI with the SPEC-pinned labels,
  error messages, disclosures, FAQ, titles and descriptions; the method
  switch shows only that method's fields while the other methods' draft
  values are kept; textContent/value only.
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
- No other deviations. No spec-errata candidates were found: every fixture
  expected value agrees with the SPEC's stated rules as implemented (all
  14 core cases pass verbatim, and the AUTHOR-CHECK's independent
  re-derivation agrees).

## Notes for the reviewer (not deviations)

- The SPEC's `floorReachedYear` note mentions the case
  `floorValue = price`; with the pinned salvage range (0–50%) the floor
  can never equal the price, so that clause is unreachable but harmless.
  The implementation follows the general rule (first year whose end value
  equals the floor).
- The SPEC's field-order sentence and its "method validates first, then
  the method-specific field's presence" sentence were read together: the
  method-specific presence check (SCHEMA) runs as part of the
  method-specific field's step, after price/years/salvagePercent, which
  is the order the SPEC lists. No fixture covers the combined case.

## Next owner

Independent reviewer (not the author) against the fixed candidate commit
of the production PR: the nine predeclared aspects from the SPEC's
acceptance section, with real-browser evidence still NOT_RUN (see
VERIFICATION.md).

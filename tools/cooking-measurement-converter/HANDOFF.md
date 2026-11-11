# Cooking Measurement Converter — production handoff

## Fixed source

- Spec: `spec-cooking-measurement-converter-20261109`, fixed at candidate
  commit `213af9991a1a2d0a07f9acfe3e173d57184d9dec` in
  `KYStr/glossquote-labs-home`, path
  `docs/specs/cooking-measurement-converter/` (BRIEF.md, SPEC.md,
  fixtures.json, AUTHOR-CHECK.md). Draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/222
- The spec was authored build-first in this run; this production was
  built directly against that fixed candidate. No registry/coordination
  commands were run by the builder; registration and independent review
  are the parent coordinator's steps.
- Production base: fresh `FETCH_HEAD` of `codex/initial-publication`
  when the branch `muse/cooking-measurement-converter-production-20261109`
  was created (2026-11-09).
- Scope of this candidate: only `tools/cooking-measurement-converter/`.

## What was built

A bilingual cooking measurement converter exactly as the SPEC pins it:
five units (ml, tsp, tbsp, cup, g) on the pinned FDA household volume
basis (1 cup = 240 ml, 1 tbsp = 15 ml, 1 tsp = 5 ml — exact integers,
the exact US customary values disclosed but not used), weight↔volume
only through the one pinned 12-row density table (grams per cup, King
Arthur Baking Ingredient Weight Chart, single source; honey 336 from
the chart's 21 g/tbsp × 16, water and milk at the chart's 227), a
nearest-eighth fraction rendering for cup results computed from the
UNROUNDED exact value, and the fixed report download
`cooking-measurement-report.json`. The whole pipeline is exact BigInt
rational arithmetic; the displayed value is rounded half-up exactly
once, to 2 decimals.

- `public/js/core/convert.mjs` — pure validation (schema with accessor
  rejection; per-field INPUT_LIMIT → UNICODE → EMPTY → grammar/ENUM →
  RANGE in the fixed field order amount, fromUnit, toUnit, ingredient;
  the cross-field INGREDIENT_REQUIRED check only after all fields
  pass), the exact conversion pipeline, the fraction derivation, and
  the canonical report serializer.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) over an injected worker
  factory; late replies are dropped by generation and state.
- `public/js/worker-handler.mjs` — fixed worker fragment; the preview
  build concatenates core + handler into the embedded worker source,
  and the page runs it as a module Worker from a Blob URL.
- `public/js/app.js` + two static pages (`public/index.html`,
  `public/en/index.html`) — bilingual UI with the SPEC-pinned labels,
  error messages, density table, and FAQ; textContent/value only.
- `scripts/` — reproducible preview build (byte-identical across
  runs), static check, generated-output check, loopback-only serve.
- `test/` — core/controller/report/html/build tests.
  `test/fixtures.json` is a byte-identical vendored copy of the spec
  candidate's fixtures.json (SHA-256 in VERIFICATION.md) because the
  spec PR is not yet merged into the default branch, so the tests stay
  self-contained.

## Spec errata candidates

One substantive candidate, in the SPEC's fixtures (the implementation
follows the SPEC's normative rule):

- Fixture `err-unit-enum` expects `{code:"ENUM", field:"fromUnit"}` for
  `fromUnit: "liter"`. But "liter" is 5 UTF-16 code units, and the SPEC
  caps `fromUnit` raw length at 4 units with the pinned per-field check
  order INPUT_LIMIT → UNICODE → EMPTY → grammar/ENUM → RANGE (the same
  precedence the `err-input-limit` fixture relies on). Under the SPEC's
  own rules the outcome is therefore
  `{code:"INPUT_LIMIT", field:"fromUnit", row:null}`, and the fixture's
  expected ENUM is unreachable for this input. The core implements the
  normative rule; `test/core.test.mjs` asserts this one case with the
  corrected expectation and a comment pointing here, and asserts every
  other fixture case verbatim. A spec-side fix would be to change the
  fixture's input to a ≤4-unit non-member (e.g. "oz") or to amend the
  expected code.

## Deviations from the SPEC

- The SPEC's implementation section names `src/core.mjs` /
  `src/controller.mjs` / `src/app.mjs` paths (the older template
  layout). This candidate follows the current handbook file contract
  (`public/js/core/`, `public/js/controller.mjs`, `public/js/app.js`),
  which the run's brief mandates; the module split, responsibilities,
  and worker architecture are otherwise exactly as the SPEC describes.
- Apart from the erratum above, no deviations: every other fixture
  expected value agrees with the SPEC's stated rules as implemented
  (see VERIFICATION.md).

## Next owner

Independent reviewer (not the author) against the fixed candidate
commit of the production PR: the nine predeclared aspects from the
SPEC's acceptance section, with real-browser evidence still NOT_RUN
(see VERIFICATION.md).

## 2026-11-10 maintenance

The maintained literal fixtures distinguish oz (ENUM) from liter (INPUT_LIMIT). Tests now compare every core fixture directly. See [repair verification](REPAIR-VERIFICATION.md).

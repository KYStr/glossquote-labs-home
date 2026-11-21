# Pet Feeding Calculator — Handoff

Tool: `tools/pet-feeding-calculator/` — estimates daily calories (RER/DER),
grams, cups and per-meal amounts for a dog or cat from its weight, life
stage and food energy density, using the veterinary RER/DER method.

## Fixed source

- Spec ID: `spec-pet-feeding-calculator-20261109`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/263
  (OPEN; head `muse/spec-pet-feeding-calculator-20261109`,
  candidate commit `282fb18912c0435257c13b96b5562e410e3a2521`)
- Spec fixtures SHA-256:
  `9925a6830399019d9005205fe08933d9d863c8f05fe870d37a19c9aceef17ed8`
  (vendored verbatim as `test/fixtures.json`; `scripts/check.mjs`
  fails if the hash changes)
- Base commit (branch point): `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- Branch: `muse/pet-feeding-calculator-production-20261109`

## Files changed (only `tools/pet-feeding-calculator/`)

```text
package.json
public/index.html
public/en/index.html
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/js/core/pet-feeding.mjs
public/styles/pet-feeding.css
scripts/build.mjs
scripts/check.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/fixtures.json
test/pet-feeding-core.test.mjs
test/pet-feeding-controller.test.mjs
test/pet-feeding-report.test.mjs
dist-preview/ (generated preview)
BUILD-MANIFEST.json
HANDOFF.md
VERIFICATION.md
```

## How each SPEC anchor was verified

- Multiplier table: all 11 rows are literal in `MULTIPLIERS`
  (`scripts/check.mjs` asserts the full table, including the cat
  weight-loss value 0.8, against the SPEC). The dog weight-loss 1.0 /
  cat weight-loss 0.8 split is also asserted by a dedicated test.
- §inputsOutputs worked anchors: all 21 core fixtures pass verbatim
  (`assert.deepEqual` on the literal expected values in
  `test/fixtures.json`), and the 13 success fixtures were
  independently recomputed with a separate Python double-precision
  script following the SPEC's pinned operation order — 0 mismatches.
  The per-meal invariants (perMealKcal sums to derKcal, perMealGrams
  sums to gramsPerDay, cupsPerDay null exactly when no cup density is
  given) are asserted for every success fixture.
- Boundaries: dog 100 kg and cat 0.5 kg kitten successes are asserted
  with independently recalculated values; just-outside values (dog
  0.49 / 100.01, cat 20.01, density 19.99 / 900.01, cup 49.99 /
  1500.01, meals 0 / 7) all return the pinned RANGE errors; the edges
  themselves are legal.
- Validation: field order, per-field order (INPUT_LIMIT, UNICODE,
  EMPTY, grammar, RANGE), the optional-cup rule, the species-gated
  lifeStage ENUM, schema rejection (missing/extra field, wrong type,
  accessor, array, null, symbol key) and the decimal/integer grammars
  are all asserted.
- Serialization: the `dog-neutered-default` and `dog-intact-cups`
  report bytes are asserted exactly in
  `test/pet-feeding-report.test.mjs`, including key-order independence
  and the OUTPUT_LIMIT backstop.
- Controller cases: `state-dirty-error` (local RANGE on rerun, no
  second worker created), `state-cancel-late` (cancel terminates the
  worker, the late reply cannot resurrect, reset restores the default
  draft and the empty state), `state-replace-late` (late success reply
  cannot replace the local error) — all driven through the
  controllable fake Worker.
- Species switch: an incompatible stage resets to `adult-neutered`;
  a shared stage name is kept (asserted in the controller tests).
- Reset: synchronous, restores the default draft byte-for-byte
  (`JSON.stringify` equality asserted) and the empty state.
- Build determinism: two consecutive `build:preview` runs produce
  byte-identical `dist-preview/` trees and `BUILD-MANIFEST.json`
  (recursive diff clean); `check:generated:preview` passes.
- Loopback HTTP probe: 200 for `/`, `/en/`, the stylesheet, all four
  shipped scripts, the generated worker source and `/en/index.html`
  (see VERIFICATION.md).

## Deviations from the SPEC

1. **Layout follows the builder brief / handbook contract
   (`public/js/core/`, `public/js/app.js`, `public/js/controller.mjs`,
   `scripts/`), not the SPEC implementation section's `src/` sketch.**
   The task's builder brief pins exactly this layout, and it is the
   layout every other run-5 production uses.
2. **Sequence accounting for a locally-failed run.** A run that fails
   local validation never posts to a Worker, so it leaves the sequence
   unchanged; every edit, reset, load-example, cancel and
   worker-submitting run increments it. Same reading as the sibling
   run-5 productions; the pet-feeding fixtures do not pin sequences.
3. **No persistent storage.** The SPEC forbids persistent storage and
   says the draft lives only in the current page, so the controller
   takes no storage adapter and the app touches no storage API at all
   (`scripts/check.mjs` forbids `localStorage`/`sessionStorage` in
   every shipped file). Switching language or leaving the page
   discards the draft; both pages say so next to the language links.
4. No other deviations. The multiplier table, validation order,
   pinned computation order (grams from the rounded DER), the
   independent per-meal cups rounding, the pinned disclaimer and
   weight-loss note, the four FAQs and the no-canonical preview
   metadata are all implemented literally.

## Spec-errata candidates

None. All 21 core fixtures pass verbatim against the normative text,
and an independent Python recomputation of all 13 success fixtures
agrees on every rounded output. No fixture conflicts with the
normative text, and no normative statement was found to be wrong.

## Known limitations

- Real-browser verification is NOT_RUN (see VERIFICATION.md); the
  reviewer should exercise the success path in a real browser,
  including the blob-URL module Worker under the pinned CSP (which
  explicitly allows `worker-src blob:`), keyboard operation, 320 px
  reflow and 200% zoom.
- Switching language discards the draft (by SPEC design: no
  persistent storage). The draft-loss note sits next to the language
  links on both pages.

## Next owner

Independent reviewer: score the fixed candidate commit on the nine
SPEC acceptance aspects. Do not merge, publish, or register — the
coordinator owns acceptance, merge, and publication.

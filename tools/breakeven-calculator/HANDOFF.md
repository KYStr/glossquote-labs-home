# Breakeven Calculator — Handoff

Tool: `tools/breakeven-calculator/` — single-product breakeven analysis:
fixed costs, price per unit and variable cost per unit give the
contribution margin, breakeven volume (exact + whole units) and
breakeven revenue (exact + whole units), with an optional margin of
safety and expected profit.

## Fixed source

- Spec ID: `spec-breakeven-calculator-20261109`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/240
  (OPEN; candidate commit `77b72cb74db4cae3bba2c4c1bff7cae5dbc63639`)
- Spec fixtures SHA-256:
  `a75dabca3b765e4f1ceac13de15cde96d0b08d44ae64c2b9c727cc10da94154f`
  (vendored verbatim as `test/fixtures.json`; `scripts/check.mjs`
  fails if the hash changes)
- Base commit (branch point): `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- Branch: `muse/breakeven-calculator-production-20261109`

## Files changed (only `tools/breakeven-calculator/`)

```text
package.json
public/index.html
public/en/index.html
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/js/core/breakeven.mjs
public/styles/breakeven.css
scripts/build.mjs
scripts/check.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/fixtures.json
test/breakeven-core.test.mjs
test/breakeven-controller.test.mjs
test/breakeven-report.test.mjs
dist-preview/ (generated preview, 9 files)
BUILD-MANIFEST.json
HANDOFF.md
VERIFICATION.md
```

## How each SPEC anchor was verified

- Worked anchors: `ceil-rounds-up` (493.8240 → 494 units,
  197529.60 vs 197600.00), `exact-integer-units`,
  `fractional-cents` (1999.9995 rounds across the dollar to 2000.00,
  ratio 50.025… → 50.03) and `ratio-half-up-tie` (2.675% → 2.68,
  not 2.67) are literal fixture cases in
  `test/breakeven-core.test.mjs`, plus hand-derived boundary tests
  in the same file.
- Case inventory: all 18 core cases and all 3 controller cases pass
  verbatim from `test/fixtures.json`.
- Serialization: the `ceil-rounds-up` and `with-margin-of-safety`
  report bytes are asserted exactly in
  `test/breakeven-report.test.mjs`, including key-order independence
  and the OUTPUT_LIMIT backstop.
- Controller cases: `state-dirty-error` (local RANGE on rerun, no
  second worker created), `state-cancel-late` (cancel keeps the
  draft, the late reply cannot resurrect a result, reset restores
  the defaults and the empty state), `state-replace-late` (a late
  success reply cannot replace the newer NO_MARGIN result) — all
  driven through the controllable fake Worker.
- Reset: synchronous, restores the default draft byte-for-byte
  (`JSON.stringify` equality asserted) and the empty state.
- Build determinism: two consecutive `build:preview` runs produce
  byte-identical `dist-preview/` trees and `BUILD-MANIFEST.json`
  (recursive diff clean); `check:generated:preview` passes.
- Loopback HTTP probe: 200 for `/`, `/en/`, the stylesheet, all
  shipped scripts, the generated worker source and `/en/index.html`
  (see VERIFICATION.md).

## Deviations from the SPEC

1. **Sequence accounting for a locally-failed run.** SPEC userFlow
   says a run increments the generation, but the pinned
   `state-replace-late` flow (edit terminates the old worker, the
   newer run fails locally with NO_MARGIN, the old reply must not
   replace it) only works if a run that fails local validation
   never posts to a Worker and leaves the sequence unchanged. The
   same reading is used by the sibling run-5 productions. Every
   edit, reset, load-example, cancel and worker-submitting run
   increments the sequence. Implemented and documented in
   `controller.mjs`.
2. **No draft persistence.** The SPEC forbids persistent storage,
   so unlike the sibling tools this controller takes no storage
   adapter and the app never touches localStorage; the draft lives
   only in the current page, and both pages say so next to the
   language link and in the privacy note.
3. **Preview pages carry no canonical / hreflang / sitemap.**
   The SPEC reserves those for a formal origin that is not
   configured (`https://breakeven-calculator.glossquote.com` is
   only a planned origin); the preview pages carry noindex and
   relative language/home links only, as the SPEC's tests section
   requires.
4. No other deviations. The BigInt cents arithmetic, the R(q, d)
   half-up rule applied exactly once, the ceil rule, the NO_MARGIN
   semantic (field=null, no field marked, focus to the notice),
   the validation order and the report format are all implemented
   literally.

## Spec-errata candidates

None. All 18 core fixtures pass verbatim against the normative
text, and the AUTHOR-CHECK.md independent recalculation (18/18)
agrees. No fixture conflicts with the normative text.

## Known limitations

- The blob-URL module Worker under the pinned CSP (which includes
  `worker-src blob:` per the SPEC) can only be settled in a real
  browser: if the browser refuses the blob worker, the controller
  degrades to the `error` state with WORKER_ERROR (local validation
  still runs; no result is fabricated). Real-browser verification
  is NOT_RUN (see VERIFICATION.md).
- The busy state is transient for this synchronous core: the Cancel
  button is shown while a worker reply is pending, which in a real
  browser is normally a brief window; the cancel path itself is
  fully covered by the controller tests with a controllable worker.

## Next owner

Independent reviewer: score the fixed candidate commit on the nine
SPEC acceptance aspects. Do not merge, publish, or register — the
coordinator owns acceptance, merge, and publication.

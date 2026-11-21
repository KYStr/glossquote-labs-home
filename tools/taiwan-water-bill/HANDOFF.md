# Taiwan Water Bill Calculator — Handoff

Tool: `tools/taiwan-water-bill/` — estimates a Taiwan Water Corporation
bill from meter-reading cycle, meter diameter and one period's usage:
basic charge, four-tier usage charge and the water conservation and
feedback levy, with optional self-entered sewer and waste rates.

## Fixed source

- Spec ID: `spec-taiwan-water-bill-20261109`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/248
  (OPEN; head `muse/spec-taiwan-water-bill-20261109`,
  candidate commit `b23afd542d5252c179207f78cb95518925e42923`)
- Spec fixtures SHA-256:
  `121380896d9eb1fc76d1165c2f772b68388f7d0fffaca676074afa46506c94b7`
  (vendored verbatim as `test/fixtures.json`; `scripts/check.mjs`
  fails if the hash changes)
- Base commit (branch point): `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- Branch: `muse/taiwan-water-bill-production-20261109`

## Files changed (only `tools/taiwan-water-bill/`)

```text
package.json
public/index.html
public/en/index.html
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/js/core/taiwan-water-bill.mjs
public/styles/taiwan-water-bill.css
scripts/build.mjs
scripts/check.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/fixtures.json
test/taiwan-water-bill-core.test.mjs
test/taiwan-water-bill-controller.test.mjs
test/taiwan-water-bill-report.test.mjs
dist-preview/ (generated preview, 9 files)
BUILD-MANIFEST.json
HANDOFF.md
VERIFICATION.md
```

## How each SPEC anchor was verified

- §inputsOutputs worked anchors: `bimonthly-typical` (30 degrees →
  usage 241.5, basic 71.4, levy 12, total 325) and
  `bimonthly-official-example` (110 degrees → usage 1,107.75, the
  official example value) are literal fixture cases in
  `test/taiwan-water-bill-core.test.mjs` (56 tests total, all passing),
  plus hand-derived boundary tests cross-checked with an independent
  Python `fractions.Fraction` recomputation of the pinned rules.
- §tests case inventory: all 19 core cases and all 3 controller cases
  pass verbatim from `test/fixtures.json`.
- §inputsOutputs serialization: the `bimonthly-typical` report bytes
  are asserted exactly in `test/taiwan-water-bill-report.test.mjs`,
  including key-order independence and the OUTPUT_LIMIT backstop.
- Controller cases: `state-dirty-error` (local RANGE on rerun, no
  second worker created), `state-cancel-late` (cancel keeps the draft,
  the late reply is dropped, reset restores defaults and the empty
  state), `state-replace-late` (late success reply cannot replace the
  local error) — all driven through the controllable fake Worker.
- Reset: synchronous, restores the default draft byte-for-byte
  (`JSON.stringify` equality asserted) and the empty state.
- Build determinism: two consecutive `build:preview` runs produce
  byte-identical `dist-preview/` trees and `BUILD-MANIFEST.json`
  (recursive diff clean); `check:generated:preview` passes.
- Loopback HTTP probe: 200 for `/`, `/en/`, the stylesheet, all four
  shipped scripts, the generated worker source and `/en/index.html`;
  traversal 403, missing page 404, CSP and X-Robots-Tag headers
  present (see VERIFICATION.md).

## Deviations from the SPEC

1. **SPEC implementation says `src/core.mjs`, `src/controller.mjs`,
   `src/app.mjs`.** The implementation uses the layout the builder
   brief and every other run-5 production use:
   `public/js/core/taiwan-water-bill.mjs`, `public/js/controller.mjs`,
   `public/js/app.js` (ES module, importing the controller, the core
   and the generated `worker-source.js`). A classic script cannot
   import the ESM controller/core, and the testable controller is what
   SPEC §tests' controller cases drive. The page still runs from the
   static preview build exactly like the sibling tools.
2. **Worker failure state.** SPEC §inputsOutputs names the fixed
   `WORKER_ERROR` code for resource/Worker failures, and §userFlow's
   state table has no separate `unavailable` state (only
   empty/dirty/busy/success/error/cancelled). A Worker construction,
   messaging or reply failure therefore goes to `error` with
   `WORKER_ERROR` and keeps the draft; no result is fabricated.
3. **Sequence accounting for a locally-failed run.** A run that fails
   local validation never posts to a Worker, so it leaves the sequence
   unchanged; every edit, reset, load-example, cancel and
   worker-submitting run increments it. This is the only reading
   consistent with the pinned controller fixtures (the same reading
   the sibling vo2max production documents).
4. No other deviations. The basic-fee tables (both columns, literal
   lookup, never derived by doubling), the four tier prices and
   boundaries, the progressive differences, the levy divisor 21, the
   business-tax divisor 2100 and the validation order are all
   implemented literally.

## Spec-errata candidates

1. **SPEC inputsOutputs says "raw 每欄最多 8 單元" (max 8 units per
   field), but the pinned enum value `"bimonthly"` is 9 UTF-16 units
   long.** A literal 8-unit cap on `cycle` would reject every
   bimonthly input — including the SPEC's own headline example
   (`bimonthly-typical`) and the default draft — with INPUT_LIMIT.
   The implementation therefore caps `cycle` at 9 units (the minimum
   that admits the pinned value) and keeps 8 for the other four
   fields; the 9-unit cycle value `"bimonthlyx"` is still
   INPUT_LIMIT, pinned by a dedicated test. The SPEC's capacity rule
   needs the cycle limit corrected to 9 (or the rule restated
   per-field).

No other errata candidates were found. All 19 core fixtures pass
verbatim, so no fixture conflicts with the normative text.

## Known limitations

- No persistent storage is used at all (the SPEC forbids it for this
  tool): the draft lives only in the page and is discarded on leave.
  Switching language therefore starts from the default draft, and the
  pages say so.
- The pinned page CSP meta includes `worker-src blob:` (per SPEC
  implementation) so the Blob module Worker is allowed by the page's
  own CSP; the loopback server sends the same CSP as a header.
  Real-browser verification is NOT_RUN (see VERIFICATION.md); the
  reviewer should exercise the success path in a real browser.
- Display amounts show at most two decimals (角分) per the SPEC; a
  tier subtotal such as 12.075 renders as 12.08 on screen while the
  report keeps the exact milli-NT value. The page's rounding note
  states this.

## Next owner

Independent reviewer: score the fixed candidate commit on the nine
SPEC acceptance aspects. Do not merge, publish, or register — the
coordinator owns acceptance, merge, and publication.

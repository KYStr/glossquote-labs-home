# Baking Pan Converter — Handoff

Tool: `tools/baking-pan-converter/` — scales one total batter quantity
between two pans by capacity ratio (target volume ÷ source volume),
with a pinned 11-row pan capacity table, custom-size input, depth
relation, and a fixed report download.

## Fixed source

- Spec ID: `spec-baking-pan-converter-20261109`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/264
  (OPEN, DRAFT; branch `muse/spec-baking-pan-converter-20261109`,
  candidate commit `88a5d223d06de8e6a732327a92fed78f94296e74`)
- Spec fixtures SHA-256:
  `9e4fb7ea7d084df5c9e3817a690f2881104179512559972c3ef9bb0984c22272`
  (vendored verbatim as `test/fixtures.json`; `scripts/check.mjs`
  fails if the hash changes; verified against the PR #264 head blob:
  local SPEC.md blob `8d47eb70dcc2c7a8209fce987114ffe8f6cb7f82`
  matches the head blob, and the head fixtures.json hashes to the
  same SHA-256)
- Base commit (branch point): `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- Branch: `muse/baking-pan-converter-production-20261109`

## Files changed (only `tools/baking-pan-converter/`)

```text
package.json
public/index.html
public/en/index.html
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/js/core/baking-pan-converter.mjs
public/styles/baking-pan-converter.css
scripts/build.mjs
scripts/check.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/fixtures.json
test/baking-pan-converter-core.test.mjs
test/baking-pan-converter-controller.test.mjs
test/baking-pan-converter-report.test.mjs
dist-preview/ (generated preview, 9 files)
BUILD-MANIFEST.json
HANDOFF.md
VERIFICATION.md
```

## How each SPEC anchor was verified

- §inputsOutputs worked anchors: all 15 core fixture cases pass
  verbatim from `test/fixtures.json` (44 tests total, all passing),
  including the π path (`custom-round-pi`, 20→24 cm), both nominal
  rows (`bundt-nominal-to-round`, `tube-nominal-to-square`), the
  60 cm boundary (`custom-max-diameter`), and all 5 error cases
  with exact code/field.
- Independent recomputation: every table-vs-table fixture factor,
  percent, and scaled quantity was re-derived in the tests with exact
  BigInt rational arithmetic; the custom-round boundary volumes
  (diameter 5 / depth 1 → 20 ml; diameter 60 / depth 15 → 42412 ml)
  were recomputed with Python Decimal at 60 digits of pi. Neither
  derivation uses the implementation's output.
- §tests case inventory: all 15 core cases and all 3 controller cases
  pass verbatim from `test/fixtures.json`.
- §inputsOutputs serialization: the `table-upscale-round`,
  `no-quantity-round-span`, and `bundt-nominal-to-round` report bytes
  are asserted exactly in `test/baking-pan-converter-report.test.mjs`,
  including key-order independence and the OUTPUT_LIMIT backstop.
- Controller cases: `state-dirty-error` (local ENUM on rerun, no
  second worker created), `state-cancel-late` (late reply ignored,
  second submit wins, reset restores defaults), `state-replace-late`
  (late success reply cannot replace the local error) — all driven
  through the controllable fake Worker with the pinned sequences and
  status strings.
- Reset: synchronous, restores the default draft byte-for-byte
  (`JSON.stringify` equality asserted) and the empty state.
- Build determinism: two consecutive `build:preview` runs produce
  byte-identical `dist-preview/` trees and `BUILD-MANIFEST.json`
  (recursive diff clean); `check:generated:preview` passes.
- Loopback HTTP probe: 200 for `/`, `/en/`, the stylesheet, all four
  shipped scripts, the generated worker source and `/robots.txt`;
  404 for a missing path and for a traversal attempt; 405 for POST;
  CSP, nosniff, and X-Robots-Tag headers present (see VERIFICATION.md).

## Deviations from the SPEC

1. **Module layout.** SPEC implementation names `src/core.mjs`,
   `src/controller.mjs`, `src/app.mjs`. The implementation uses the
   ES-module layout every other run-5 production uses
   (`public/js/core/baking-pan-converter.mjs`,
   `public/js/controller.mjs`, `public/js/app.js` importing the
   controller, the core, and the generated `worker-source.js`). The
   core is still the pure module the tests import directly, and the
   controller module is the testable unit the SPEC controller cases
   drive.
2. **Sequence accounting for a locally-failed run.** A run that fails
   local validation never posts to a Worker, so it leaves the sequence
   unchanged; every edit, reset, load-example, cancel, and
   worker-submitting run increments it. This is the only reading
   consistent with the pinned `state-replace-late` and
   `state-cancel-late` fixture sequences, and matches the sibling
   run-5 productions.
3. **Worker failure state.** SPEC's six states have no "unavailable"
   state, so a Worker construction/script/messaging failure goes to
   `error` with the pinned `WORKER_ERROR` code (never a fabricated
   result); local validation still runs first and can produce the
   pinned error state.
4. **Draft storage: none.** SPEC says the draft lives only in the
   current page and is discarded on leaving. The draft is kept in
   memory only — no persistent storage of any kind is used or
   referenced anywhere in the shipped code (the static check scans
   for storage tokens and fails if one appears).
5. No other deviations. The pinned pan table, validation order,
   inactive-field rule, rounding rule (each displayed value rounded
   half-up exactly once from the unrounded volumes/factor), depth
   relation, status strings, depth hints, capacity disclosure, FAQ,
   and preview noindex rules are all implemented literally.

## Spec-errata candidates

None. All 15 core fixtures pass verbatim against the normative text,
so no fixture conflicts with it.

One adjacent item for the reviewer / coordinator, not an errata
candidate against the pinned spec: open spec-repair PR
https://github.com/KYStr/glossquote-labs-home/pull/303
("修正烤盤換算規格的盤壁高度與正小量", head
`8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927`) proposes changing the
factor/percent display for tiny values (e.g. factor `"0.00"` →
`"0.00046296"`) and adding eight core cases. It is a separate,
unmerged spec change against the same spec ID; this production
follows the task-pinned spec (PR #264 head above). If PR #303 is
accepted, this production needs a revision against the new spec.

## Known limitations

- The pinned page CSP meta includes `worker-src blob:`, and the page
  creates a module Worker from a Blob URL of the fixed worker source.
  Whether a real browser accepts that combination can only be
  settled in a real browser: if the browser refuses the blob worker,
  the controller degrades to the `error` state with WORKER_ERROR
  (local validation still runs; no result is fabricated). Real-browser
  verification is NOT_RUN (see VERIFICATION.md); the reviewer should
  exercise the success path in a real browser.
- The inch equivalents beside custom dimensions are display-only
  (cm ÷ 2.54, 2 places) and never enter the core result or report,
  per SPEC.
- This is the last of the 40 run-5 productions; no further tool in
  this batch depends on it.

## Next owner

Independent reviewer: score the fixed candidate commit on the nine
SPEC acceptance aspects. Do not merge, publish, or register — the
coordinator owns acceptance, merge, and publication.

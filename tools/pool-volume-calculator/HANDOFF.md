# Pool Volume Calculator — Handoff

Tool: `tools/pool-volume-calculator/` — calculates an ideal
rectangular / circular / oval pool's water volume (m³, litres, US
gallons) from its dimensions and depth (single or sloped average),
plus fill time at a given flow rate.

## Fixed source

- Spec ID: `spec-pool-volume-calculator-20261109`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/261
  (OPEN; head `muse/spec-pool-volume-calculator-20261109`,
  candidate commit `7e446e401c1e3e8c6a7b83808e0eeecbff6c807a`)
- Spec fixtures SHA-256:
  `07f50160da9f2bde49ebb49b7a30785ed1ceff34d3e1eb0affeef154eb84aa3a`
  (vendored verbatim as `test/fixtures.json`; `scripts/check.mjs`
  fails if the hash changes)
- Base commit (branch point): `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- Branch: `muse/pool-volume-calculator-production-20261109`

## Files changed (only `tools/pool-volume-calculator/`)

```text
package.json
public/index.html
public/en/index.html
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/js/core/pool-volume.mjs
public/styles/pool-volume.css
scripts/build.mjs
scripts/check.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/fixtures.json
test/pool-volume-core.test.mjs
test/pool-volume-controller.test.mjs
test/pool-volume-report.test.mjs
dist-preview/ (generated preview, 9 files)
BUILD-MANIFEST.json
HANDOFF.md
VERIFICATION.md
```

## How each SPEC anchor was verified

- §inputsOutputs worked anchors: `rect-single-depth` (8×4×1.5 →
  48 m³, 48,000 L, 12,680 gal, 1,200 min), `circular-basic`
  (V = 7.5π → 23.56 m³, 23,562 L, 6,224 gal, 942 min),
  `oval-basic` (V = 9.8π → 30.79 m³, 30,788 L, 8,133 gal,
  1,539 min), `circular-sloped` (avg 1.3, V = 6.58125π → 20.68 m³),
  `fill-minutes-tie` (312.5 → 313, half-up, not banker's) and
  `min-dimensions` (0 m³ alongside 1 L, litres authoritative) are all
  literal fixture cases in `test/pool-volume-core.test.mjs`, plus
  hand-derived anchors (2×3×1 m → 6 m³, 6,000 L, 1,585 gal,
  150 min; circular diameter 10, depth 2, flow 100 → 157.08 m³,
  157,080 L, 41,496 gal, 1,571 min) cross-checked against an
  independent 50-digit Decimal recalculation.
- §tests case inventory: all 18 core cases and all 3 controller cases
  pass verbatim from `test/fixtures.json`.
- §inputsOutputs serialization: the `rect-single-depth` report bytes
  are asserted exactly
  (`{"avgDepthM":1.5,"depthMode":"single","fillHours":20,"fillMinutes":0,"fillTotalMinutes":1200,"flowRateLMin":40,"shape":"rectangular","volumeGallonsUs":12680,"volumeLitres":48000,"volumeM3":48}\n`)
  in `test/pool-volume-report.test.mjs`, including key-order
  independence and the OUTPUT_LIMIT backstop.
- Controller cases: `state-dirty-error` (local RANGE on rerun, no
  second worker created), `state-cancel-late` (cancel terminates the
  worker, late reply ignored, reset returns to `empty` with the
  default draft), `state-replace-late` (late success reply cannot
  replace the local error) — all driven through the controllable fake
  Worker with the pinned sequences and states.
- Reset: synchronous, restores the default draft byte-for-byte
  (`JSON.stringify` equality asserted) and the `empty` state.
- Build determinism: two consecutive `build:preview` runs produce
  byte-identical `dist-preview/` trees and `BUILD-MANIFEST.json`
  (recursive diff clean); `check:generated:preview` passes.
- Loopback HTTP probe: 200 for `/`, `/en/`, the stylesheet, all four
  shipped scripts, the generated worker source and `/en/index.html`
  (see VERIFICATION.md).

## Deviations from the SPEC

1. **SPEC implementation names `src/core.mjs`, `src/controller.mjs`,
   `src/app.mjs`.** The implementation uses the `public/js/` layout
   every other run-5 production uses (race-time, salary, bill-split,
   dew-point, feels-like, vo2max): `public/js/core/pool-volume.mjs`,
   `public/js/controller.mjs`, `public/js/app.js` (an ES-module app,
   not a classic script — a classic script cannot import the ESM
   controller/core, and the testable controller is what SPEC §tests'
   controller cases drive). The controller module is the testable
   unit; the page still runs from the static preview build exactly
   like the sibling tools.
2. **Sequence accounting for a locally-failed run.** SPEC
   implementation says every run increments the sequence, but the
   pinned `state-replace-late` fixture requires the newer (locally
   invalid) run to leave the sequence unchanged (no second worker is
   created) while `state-cancel-late` requires the cancel to move the
   sequence forward so the late reply is stale. The only reading
   consistent with both fixtures: a run that fails local validation
   never posts to a Worker, so it leaves the sequence unchanged; every
   edit, cancel, reset, load-example and worker-submitting run
   increments it. Implemented and documented in `controller.mjs`.
3. **Worker failure has no `unavailable` state in this SPEC.** SPEC
   userFlow lists exactly six states (empty, dirty, busy, success,
   error, cancelled) and no `unavailable` state, so a Worker
   construction / messaging failure goes to `error` with
   `WORKER_ERROR` (field null; the app renders the message in the
   status region) and keeps the draft for retry. No result is
   fabricated.
4. **No persistent storage.** SPEC implementation bans persistent
   storage, so — unlike sibling tools that pin a localStorage draft
   key — this tool keeps the draft in the page only. Switching
   language or leaving the page discards the draft, as the pages'
   topbar note says. `scripts/check.mjs` fails if any shipped source
   touches localStorage or sessionStorage.
5. No other deviations. The pinned π operation order, the half-up
   single-rounding rule, the litres-from-unrounded-volume rule, the
   single-total-minutes fill split, the validation order, the
   DEPTH_ORDER rule and the report format are all implemented
   literally.

## Spec-errata candidates

1. **UNICODE vs the enabled-field skip (inputsOutputs step 1 vs
   tests section).** The numbered validation order lists
   capacity → UNICODE → enabled-skip, which would make a lone
   surrogate in an *inactive* field a UNICODE error. But the same
   step's parenthetical says an inactive field "is skipped after the
   capacity check" (i.e. capacity only), and the tests section pins
   the expected behaviour explicitly: a lone surrogate in an inactive
   field is "only capacity-checked, and should pass". The
   implementation follows the parenthetical and the tests section
   (inactive fields get the capacity check only), pinned by a
   dedicated test (`an inactive field is capacity-checked only and
   otherwise ignored`). The numbered order's placement of UNICODE
   before the enabled check needs the same correction.

No other errata candidates were found. All 18 core fixtures pass
verbatim, so no fixture conflicts with the normative text.

## Known limitations

- The blob-URL module Worker under the pinned page CSP meta
  (`script-src 'self'`, `worker-src blob:`) can only be settled by a
  real browser: if the browser refuses the blob worker, the
  controller degrades to the `error` state with WORKER_ERROR (local
  validation still runs; no result is fabricated). Real-browser
  verification is NOT_RUN (see VERIFICATION.md); the reviewer should
  exercise the success path in a real browser.
- The candidate pages carry no production canonical, hreflang or
  sitemap, per SPEC (the planned origin
  https://pool-volume.glossquote.com is not yet configured).

## Next owner

Independent reviewer: score the fixed candidate commit on the nine
SPEC acceptance aspects. Do not merge, publish, or register — the
coordinator owns acceptance, merge, and publication.

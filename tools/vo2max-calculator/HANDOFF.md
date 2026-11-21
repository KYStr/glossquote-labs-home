# VO2max Calculator — Handoff

Tool: `tools/vo2max-calculator/` — estimates VO₂max from a Cooper
12-minute run or a 1.5-mile run, with an optional Cooper Institute
age/sex fitness rating.

## Fixed source

- Spec ID: `spec-vo2max-calculator-20261109`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/236
  (OPEN; head `muse/spec-vo2max-calculator-20261109`,
  candidate commit `30d67be295be66714f292722cea0660631d97176`)
- Spec fixtures SHA-256:
  `b86e26cbad1a6c58f6f8096f7cfc5792c4cbff80fdbb05e3c45e8c29618187ae`
  (vendored verbatim as `test/fixtures.json`; `scripts/check.mjs`
  fails if the hash changes)
- Base commit (branch point): `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- Branch: `muse/vo2max-calculator-production-20261109`

## Files changed (only `tools/vo2max-calculator/`)

```text
package.json
public/index.html
public/en/index.html
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/js/core/vo2max.mjs
public/styles/vo2max.css
scripts/build.mjs
scripts/check.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/fixtures.json
test/vo2max-core.test.mjs
test/vo2max-controller.test.mjs
test/vo2max-report.test.mjs
dist-preview/ (generated preview, 9 files)
BUILD-MANIFEST.json
HANDOFF.md
VERIFICATION.md
```

## How each SPEC anchor was verified

- §4 worked anchors: `cooper-basic` (2400 m → 42.4), 2800 m → 51.3,
  2000 m → 33.4, 2404.4 m → 42.5 with classification on the rounded
  value, 1.5-mile 12:00 → 43.75 exact tie → 43.8, 15:00 → 35.7, and
  505 m → BELOW_RANGE are all literal fixture cases in
  `test/vo2max-core.test.mjs` (58 tests total, all passing) plus the
  hand-derived boundary tests in the same file.
- §7 case inventory: all 24 core cases and all 3 controller cases pass
  verbatim from `test/fixtures.json`.
- §3 serialization: the `cooper-basic` report bytes are asserted
  exactly (`{"classification":null,"distanceMeters":2400,"test":"cooper12","vo2max":42.4}\n`)
  in `test/vo2max-report.test.mjs`, including key-order independence
  and the OUTPUT_LIMIT backstop.
- Controller cases: `state-dirty-error` (local RANGE on rerun, no
  second worker created), `state-cancel-late` (late reply ignored,
  second submit wins), `state-replace-late` (late success reply cannot
  replace the local error) — all driven through the controllable fake
  Worker with the pinned sequences and status strings.
- Reset: synchronous, restores the default draft byte-for-byte
  (`JSON.stringify` equality asserted) and the idle state.
- Build determinism: two consecutive `build:preview` runs produce
  byte-identical `dist-preview/` trees and `BUILD-MANIFEST.json`
  (recursive diff clean); `check:generated:preview` passes.
- Loopback HTTP probe: 200 for `/`, `/en/`, the stylesheet, all four
  shipped scripts, the generated worker source and `/en/index.html`
  (see VERIFICATION.md).

## Deviations from the SPEC

1. **SPEC §5 says `public/js/app.js` is a classic script (no module
   syntax).** The implementation uses the ES-module app pattern every
   other run-5 production uses (race-time, salary, bill-split,
   dew-point, feels-like): `app.js` imports `controller.mjs`, the
   core, and the generated `worker-source.js`. A classic script cannot
   import the ESM controller/core, and the testable controller is what
   SPEC §7's controller cases drive. The controller module
   (`public/js/controller.mjs`) is the testable unit; the page still
   runs from the static preview build exactly like the sibling tools.
2. **Sequence accounting for a locally-failed run.** SPEC §2 says
   every run increments the sequence, but the pinned
   `state-replace-late` fixture requires `currentSequence` 3 after the
   newer (locally invalid) run, while `state-cancel-late` requires the
   edit to increment 2 → 3 and the submitting run to increment 3 → 4.
   The only reading consistent with both fixtures: a run that fails
   local validation never posts to a Worker, so it leaves the sequence
   unchanged; every edit, reset, load-example and worker-submitting run
   increments it. Implemented and documented in `controller.mjs`.
3. No other deviations. The Rockport walk test is excluded per SPEC §1;
   the 483 constant, the 504.9/44.73 Cooper form, the thresholds table,
   the validation order, the pair rule and the BELOW_RANGE rule are all
   implemented literally.

## Spec-errata candidates

1. **SPEC §4 step 4 (and §6 aspect 2) claim "506 m gives 0.1".**
   The pinned formula gives (506 − 504.9) / 44.73 = 0.0246…, which
   rounds half-up to 0.0, so the pinned non-positive rule fires and
   506 m is BELOW_RANGE, not a 0.1 success. The first distance that
   rounds to 0.1 is 507.2 m ((507.2 − 504.9) / 44.73 = 0.0514…).
   The implementation follows the normative formula and rounding rule;
   the boundary probe in §6 aspect 2 ("505 m → BELOW_RANGE vs 506 m →
   0.1 success") needs the same correction. Pinned by a dedicated test
   (`boundary: 507.2 m is the first success at 0.1`).

No other errata candidates were found. All 24 core fixtures pass
verbatim, so no fixture conflicts with the normative text.

## Known limitations

- The pinned page CSP meta (`script-src 'self'`, no `worker-src`)
  and the blob-URL module Worker interact in a way only a real
  browser can settle: if the browser refuses the blob worker under
  that CSP, the controller degrades to the `unavailable` state
  (local validation still runs; no result is fabricated). Real-browser
  verification is NOT_RUN (see VERIFICATION.md); the reviewer should
  exercise the success path in a real browser and, if the blob worker
  is blocked, decide whether the pinned CSP or the worker delivery
  changes.
- Draft persistence is localStorage only, on the pinned key; switching
  language keeps the draft (the pages deliberately do not carry the
  sibling tools' "switching language discards the draft" note).

## Next owner

Independent reviewer: score the fixed candidate commit on the nine
SPEC §6 aspects. Do not merge, publish, or register — the coordinator
owns acceptance, merge, and publication.

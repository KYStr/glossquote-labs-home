# Photo Print Size Calculator — Handoff

Tool: `tools/photo-print-size-calculator/` — finds a photo's largest
printable size at a target DPI, the effective DPI and quality band at
each of nine standard sizes, or the pixels a chosen size requires.

## Fixed source

- Spec ID: `spec-photo-print-size-calculator-20261109`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/255
  (OPEN; head `muse/spec-photo-print-size-calculator-20261109`,
  candidate commit `58edaa0d845256b1eb4cb772d8f7d7d80811e4d8`)
- Spec fixtures SHA-256:
  `7893229924415e87fed19f31819a9e8dfc1571621c16cc2f08640755bdc85106`
  (vendored verbatim as `test/fixtures.json`; `scripts/check.mjs`
  fails if the hash changes)
- Base commit (branch point): `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- Branch: `muse/photo-print-size-calculator-production-20261109`

## Files changed (only `tools/photo-print-size-calculator/`)

```text
package.json
public/index.html
public/en/index.html
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/js/core/photo-print-size.mjs
public/styles/photo-print-size.css
scripts/build.mjs
scripts/check.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/fixtures.json
test/photo-print-size-core.test.mjs
test/photo-print-size-controller.test.mjs
test/photo-print-size-report.test.mjs
dist-preview/ (generated preview)
BUILD-MANIFEST.json
HANDOFF.md
VERIFICATION.md
```

## How each SPEC anchor was verified

- All 25 core fixtures pass verbatim from `test/fixtures.json`
  (see VERIFICATION.md for the test count), including the
  `max-24mp-300` nine-row table with best fit A3, the portrait case,
  the no-fit case, the exact-fit case, the 200,000 px / 1200 DPI cap
  case, the ceiling cases (`need-a5-300-ceil`: 1748.03… → 1749), the
  decimal-DPI case, the inactive-garbage and inactive-overlimit
  cases, and the quality-band cases (200.0 → good, 199.9 →
  acceptable, unrounded 299.9946… → rounded 300.0 → excellent).
- All 3 controller fixtures pass through the controllable fake
  Worker: `state-dirty-error` (local RANGE on rerun, no second
  worker created), `state-cancel-late` (late reply after cancel
  cannot resurrect a result, reset returns the empty state),
  `state-replace-late` (late success reply cannot replace the local
  error).
- Exact rational arithmetic: the core uses BigInt numerator /
  denominator throughout, so ceiling and half-up rounding at exact
  halves match the rational result exactly. Pinned by a dedicated
  test: the A5 short side 6.35 exactly rounds up to 6.4.
- Cross-mode invariant test: for all nine sizes at 150/240/300 DPI,
  the `need` pixels always fit in `max`, and one long-side pixel
  less never fits.
- §inputsOutputs serialization: the `max-24mp-300`, `need-a4-300`
  and `check-4k-a4` report bytes are asserted exactly in
  `test/photo-print-size-report.test.mjs`, including key-order
  independence and the OUTPUT_LIMIT backstop.
- Build determinism: two consecutive `build:preview` runs produce
  byte-identical `dist-preview/` trees and `BUILD-MANIFEST.json`
  (recursive diff clean); `check:generated:preview` passes.
- Loopback HTTP probe: 200 for `/`, `/en/`, the stylesheet, all
  shipped scripts, the generated worker source and `/en/index.html`
  (see VERIFICATION.md).

## Deviations from the SPEC

1. **SPEC implementation says `src/app.mjs` is a classic script
   (no module syntax) and the core lives in `src/core.mjs`.** The
   implementation uses the ES-module app pattern every other run-5
   production uses: `public/js/app.js` imports `controller.mjs`,
   the core, and the generated `worker-source.js`, with the pure core
   at `public/js/core/photo-print-size.mjs`. A classic script cannot
   import the ESM controller/core, and the testable controller is
   what SPEC §tests' controller cases drive. The controller module
   (`public/js/controller.mjs`) is the testable unit; the page still
   runs from the static preview build exactly like the sibling tools.
2. **Sequence accounting for a locally-failed run.** A run that fails
   local validation never posts to a Worker, so it leaves the
   sequence unchanged; every edit, reset, load-example, cancel and
   worker-submitting run increments it. This is the only reading
   consistent with the pinned controller fixtures (the same reading
   the sibling vo2max production documents).
3. **Edit from the empty state stays empty.** The SPEC's dirty state
   is defined by invalidating an old result; with no result yet
   there is nothing to invalidate, so an edit before the first run
   keeps the initial empty prompt visible. After a result, error or
   cancel, an edit goes dirty as specified.
4. **No production canonical / hreflang / sitemap in the preview
   pages.** The SPEC forbids them in the candidate ("無 production
   canonical、hreflang 或 sitemap"); the planned origin
   `https://photo-print-size.glossquote.com` is not configured, so
   the preview pages carry no canonical or Open Graph URL at all.
   The formal HTTPS/SEO gate generates them after the origin is
   verified.
5. No other deviations. The nine-size table, the validation order,
   the inactive-field capacity rule, the ceiling rule, the
   rounded-effective-DPI quality rule and the report format are all
   implemented literally.

## Spec-errata candidates

0. No conflicts between the SPEC normative text and the fixtures
were found. All 25 core fixtures pass verbatim against the
normative implementation, including the pinned distinguishing
cases (`need-a5-300-ceil`, `check-band-rounded-300`).

## Known limitations

- The pinned page CSP meta includes `worker-src blob:` and the
  blob-URL module Worker interact in a way only a real browser can
  settle. If a browser refuses the blob worker, the controller
  degrades to the `error` state with WORKER_ERROR (local validation
  still runs; no result is fabricated). Real-browser verification
  is NOT_RUN (see VERIFICATION.md); the reviewer should exercise
  the success path in a real browser.
- No draft persistence: the SPEC forbids persistent storage, so the
  draft lives only in the current page. Switching language or
  leaving the page discards it; both pages say so next to the
  language link.

## Next owner

Independent reviewer: score the fixed candidate commit on the nine
SPEC acceptance aspects. Do not merge, publish, or register — the
coordinator owns acceptance, merge, and publication.

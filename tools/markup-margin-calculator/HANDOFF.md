# Markup & Margin Calculator — Handoff

Tool: `tools/markup-margin-calculator/` — computes markup and margin
together from cost and price, or solves the required price from a
target markup or target margin, with exact integer-cents and
milli-percent arithmetic.

## Fixed source

- Spec ID: `spec-markup-margin-calculator-20261109`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/243
  (candidate commit `1d5de750bf4371a81c1c8d8b57bf38fceea19d66`)
- Spec fixtures SHA-256:
  `ee49cb9fcc1bfe988b9e11ef097e62ddf27e5001c025e45e1b87769e0274c15a`
  (vendored verbatim as `test/fixtures.json`; `scripts/check.mjs`
  fails if the hash changes)
- Base commit (branch point): `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- Branch: `muse/markup-margin-calculator-production-20261109`
- Candidate commit: the head commit of the production PR below (its
  full SHA is reported in the submission report; the commit cannot
  name its own SHA)
- Production PR: draft PR against `codex/initial-publication` (link
  and number in the submission report)

## Files changed (only `tools/markup-margin-calculator/`)

```text
package.json
public/index.html
public/en/index.html
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/js/core/markup-margin.mjs
public/styles/markup-margin.css
scripts/build.mjs
scripts/check.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/fixtures.json
test/markup-margin-core.test.mjs
test/markup-margin-controller.test.mjs
test/markup-margin-report.test.mjs
dist-preview/ (generated preview)
BUILD-MANIFEST.json
HANDOFF.md
VERIFICATION.md
```

## How each SPEC anchor was verified

- §3 worked anchors: `report-basic` (80.00 / 100.00 → markup 25.00%,
  margin 20.00%), the repeating-markup / repeating-margin roundings,
  the below-cost negative rounding, the free-price null margin, the
  half-tie away-from-zero rounding, the extreme-ratio large integer,
  and all three solve directions are literal fixture cases in
  `test/markup-margin-core.test.mjs`, plus hand-derived boundary tests
  in the same file.
- §7 case inventory: all 32 core cases and all 3 controller cases pass
  verbatim from `test/fixtures.json`.
- §3 serialization: the `report-basic`, `solve-margin-high` and
  `solve-markup-tie` report bytes are asserted exactly in
  `test/markup-margin-report.test.mjs`, including key-order
  independence and the OUTPUT_LIMIT backstop.
- Controller cases: `state-dirty-error` (local RANGE on rerun, no
  second worker created), `state-cancel-late` (cancel keeps the draft,
  late reply cannot resurrect a result, reset restores the defaults),
  `state-replace-late` (late success reply cannot replace the local
  error) — all driven through the controllable fake Worker.
- NO_SOLUTION vs RANGE: `solve-margin-hundred` and
  `solve-margin-over-hundred` return NO_SOLUTION on marginPercent,
  while a legal 99.999% margin whose solved price exceeds the cap
  returns RANGE on marginPercent (dedicated test).
- Reference table: all 13 rows are asserted in the pages by
  `scripts/check.mjs` and independently recomputed in the core tests
  from markup = margin / (100 − margin).
- Identities: solved prices plugged back into `report` reproduce the
  derived other rate (core tests).
- Reset: synchronous, restores the default draft byte-for-byte
  (`JSON.stringify` equality asserted) and the empty state.
- Build determinism: two consecutive `build:preview` runs produce
  byte-identical `dist-preview/` trees and `BUILD-MANIFEST.json`
  (recursive diff clean); `check:generated:preview` passes.
- Loopback HTTP probe: 200 for `/`, `/en/`, the stylesheet, all four
  shipped scripts, the generated worker source and `/en/index.html`
  (see VERIFICATION.md).

## Deviations from the SPEC

1. **Worker failure state.** SPEC §2 lists six states (empty, dirty,
   busy, success, error, cancelled) and §3 assigns resource/Worker
   failures the fixed INTERNAL/WORKER_ERROR error. The controller
   therefore reports a Worker failure as the `error` state with
   WORKER_ERROR, rather than inventing a seventh `unavailable` state.
   No result is fabricated; local validation still runs first.
2. **Sequence accounting for a locally-failed run.** A run that fails
   local validation never posts to a Worker, so it leaves the sequence
   unchanged; every edit, reset, load-example, cancel and
   worker-submitting run increments it. This matches the sibling
   run-5 productions' reading and is consistent with all three
   controller fixtures (which pin states, drafts and errors, not
   sequences).
3. **Preview pages carry no canonical / hreflang / sitemap.** Per
   SPEC §7 the preview candidate has robots noindex only; the formal
   self-canonical, reciprocal hreflang and sitemap are a production
   gate, and the planned origin
   `https://markup-margin.glossquote.com` is not yet configured.
   `scripts/check.mjs` and `scripts/check-generated.mjs` assert the
   absence. Same-language home links use `../../` (zh) and
   `../../en/` (en), per the builder brief.
4. No other deviations. The BigInt money/percent parsing, the pinned
   rounding functions, the validation order, the NO_SOLUTION semantic
   check and the report serialization are all implemented literally.

## Spec-errata candidates

Errata 0. All 32 core fixtures pass verbatim against the normative
text, and the hand-derived boundary/identity tests agree with the
SPEC's rules. No fixture conflicts with the normative text.

## Known limitations

- No draft is persisted anywhere: the SPEC forbids persistent storage
  for this tool, so switching language or leaving the page discards
  the draft (the pages say so next to the language link).
- The page CSP meta carries the SPEC's full directive set, including
  `worker-src blob:`; the blob-URL module Worker can only be settled
  by a real browser. Real-browser verification is NOT_RUN (see
  VERIFICATION.md); the reviewer should exercise the success path in
  a real browser.

## Next owner

Independent reviewer: score the fixed candidate commit on the nine
SPEC §6 aspects. Do not merge, publish, or register — the coordinator
owns acceptance, merge, and publication.

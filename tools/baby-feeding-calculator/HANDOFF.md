# Baby Feeding Calculator — Handoff

Tool: `tools/baby-feeding-calculator/` — estimates a baby's daily and
per-feed milk volume from body weight, using the NHS 111 Wales
guideline of 150–200 ml per kg per day (default 150), with per-feed
amounts that sum exactly to the daily total. Age in months is
label-only and never changes the amounts.

## Fixed source

- Spec ID: `spec-baby-feeding-calculator-20261109`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/262
  (candidate commit `558e5afa80f14c686e40a306435b81672219fa68`)
- Spec fixtures SHA-256:
  `55ab4683f0b4322ba1d5022928f8e77aad59cf52f4f8fcf2db0c7d02bc108acf`
  (vendored verbatim as `test/fixtures.json`; `scripts/check.mjs`
  fails if the hash changes)
- Base commit (branch point): `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- Branch: `muse/baby-feeding-calculator-production-20261109`

## Files changed (only `tools/baby-feeding-calculator/`)

```text
package.json
public/index.html
public/en/index.html
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/js/core/baby-feeding.mjs
public/styles/baby-feeding.css
scripts/build.mjs
scripts/check.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/fixtures.json
test/baby-feeding-core.test.mjs
test/baby-feeding-controller.test.mjs
test/baby-feeding-report.test.mjs
dist-preview/ (generated preview, 9 files)
BUILD-MANIFEST.json
HANDOFF.md
VERIFICATION.md
```

## How each SPEC anchor was verified

- §3 worked anchors: `typical-4kg-8feeds` (4 kg × 150 ÷ 8 = 75 ml
  each), `remainder-split-half-up-tie` (4.55 kg × 150 = 682.5 →
  683 ml, first 4 feeds 98 ml), `half-up-tie-6kg35` (6.35 kg × 150 =
  952.5 → 953 ml, first 5 feeds 159 ml), `factor-max-200`,
  `min-boundary` (1 kg × 150 ÷ 24, first 6 feeds 7 ml, none 0 ml),
  `max-boundary` (15 kg × 200 × 1 feed = 3000 ml),
  `age-newborn-notice` (age 0 → early-newborn notice, amounts
  unchanged), `age-beyond-notice` (age 9 → 6-month notice),
  `mid-factor-175` (5.05 × 175 = 883.75 → 884 ml) are all literal
  fixture cases in `test/baby-feeding-core.test.mjs` (53 tests total,
  all passing) plus the hand-derived boundary tests in the same file.
- §7 case inventory: all 16 core cases and all 3 controller cases pass
  verbatim from `test/fixtures.json`.
- §3 serialization: the `typical-4kg-8feeds` report bytes are asserted
  exactly (`{"ageMonths":null,"dailyTotalMl":600,"factorMlPerKgDay":150,"feedsPerDay":8,"notices":[],"perFeedAverageMl":75,"perFeedMl":[75,75,75,75,75,75,75,75],"weightKg":4}\n`)
  in `test/baby-feeding-report.test.mjs`, including key-order
  independence and the OUTPUT_LIMIT backstop.
- Controller cases: `state-dirty-error` (local RANGE on rerun, no
  second worker created), `state-cancel-late` (cancel keeps the draft,
  the late reply is dropped, reset restores defaults and the empty
  state), `state-replace-late` (late success reply cannot replace the
  local error) — all driven through the controllable fake Worker with
  the pinned states, drafts and errors.
- Reset: synchronous, restores the default draft byte-for-byte
  (`JSON.stringify` equality asserted) and the empty state.
- Build determinism: two consecutive `build:preview` runs produce
  byte-identical `dist-preview/` trees and `BUILD-MANIFEST.json`
  (recursive diff clean); `check:generated:preview` passes.
- Loopback HTTP probe: 200 for `/`, `/en/`, the stylesheet, all four
  shipped scripts, the generated worker source and `/en/index.html`
  (see VERIFICATION.md).

## Deviations from the SPEC

1. **No persistent storage.** The SPEC forbids persistent storage
   for this tool ("資料只保留在目前頁面草稿", "禁…持久 storage",
   "離頁丟棄引用") and the inputs are health-related data about an
   infant. The controller therefore takes no storage adapter and the
   draft lives only in memory; leaving the page discards it. No
   shipped file references localStorage or sessionStorage, and
   `scripts/check.mjs` fails the build if any does. This differs from
   sibling tools that persist drafts, deliberately.
2. **No production canonical / hreflang / sitemap in the preview
   candidate.** SPEC section 7 states the candidate carries robots
   noindex and "無 production canonical、hreflang 或 sitemap", and
   the planned origin `https://baby-feeding-calculator.glossquote.com`
   is not configured. The pages therefore carry no canonical, hreflang,
   Open Graph or https URLs at all; the NHS source is cited as text.
   Formal self-canonical, hreflang, robots.txt/sitemap and header
   checks belong to the production gate once the origin is approved.
3. **States are the SPEC section 2 table, not the sibling idle
   naming.** The controller states are `empty`, `dirty`, `busy`,
   `success`, `error`, `cancelled` — the exact names in the SPEC's
   state table. There is no `unavailable` state in that table, so a
   Worker construction/messaging failure is reported as `error` with
   `WORKER_ERROR` and the draft is kept for retry; local validation
   still runs and can produce the pinned error state.
4. **Sequence accounting for a locally-failed run.** A run that fails
   local validation never posts to a Worker, so it leaves the
   sequence unchanged; every edit that changes a field, reset,
   load-example, cancel of a busy run, and worker-submitting run
   increments it. Implemented and documented in `controller.mjs`.
   (The baby-feeding fixtures pin states/drafts/errors only, not
   sequences, so this reading is not fixture-forced here; it follows
   the sibling tools' convention.)
5. **The page CSP meta omits `frame-ancestors`.** The meta element
   cannot enforce `frame-ancestors`; the full SPEC CSP including
   `frame-ancestors 'none'` is served as a header by
   `scripts/serve.mjs`. The meta carries the rest of the pinned CSP,
   including `worker-src blob:`.
6. No other deviations. The 150–200 range with default 150, the
   integer formulas (including both half-up ties), the remainder split
   to the earliest feeds, the age-only notices, the validation order
   and the pinned bilingual disclaimer/source/FAQ strings are all
   implemented literally.

## Spec-errata candidates

Errata 0. All 16 core fixtures pass verbatim against the normative
text, and the AUTHOR-CHECK.md hand derivations (including the
correction that the NHS source gives a 150–200 range, not a flat 150)
are already pinned in the SPEC; no fixture conflicts with the
normative text, and no normative statement was found to be
self-contradictory during implementation.

## Known limitations

- The pinned page CSP meta (`worker-src blob:`) and the blob-URL
  module Worker interact in a way only a real browser can settle: if
  the browser refuses the blob worker under that CSP, the controller
  degrades to the `error` state with WORKER_ERROR (local validation
  still runs; no result is fabricated). Real-browser verification is
  NOT_RUN (see VERIFICATION.md); the reviewer should exercise the
  success path in a real browser and, if the blob worker is blocked,
  decide whether the pinned CSP or the worker delivery changes.
- The disclaimer and guideline source appear twice on each page: once
  in the always-visible guidance section, and once inside the results
  panel on success. This is deliberate: the SPEC requires the texts to
  be resident on the static page and shown again below a successful
  result.

## Next owner

Independent reviewer: score the fixed candidate commit on the nine
SPEC §6 aspects. Do not merge, publish, or register — the coordinator
owns acceptance, merge, and publication.

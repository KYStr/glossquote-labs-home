# Currency Converter — Handoff

Tool: `tools/currency-converter/` — converts an amount between two
currencies in both directions using a rate the user enters, with the
inverse rate at 6 significant digits and a fixed 1 / 10 / 100 / 1000
quick table. The tool never fetches, provides, or implies a live rate.

## Fixed source

- Spec ID: `spec-currency-converter-20261109`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/258
  (OPEN; head `muse/spec-currency-converter-20261109`,
  candidate commit `dcb21d0903006a708584edba8713e6117f8138a6`)
- Spec fixtures SHA-256:
  `fe03d36865e7295f94a037dc306e756fa647972d57e6d5ff7030483410343463`
  (vendored verbatim as `test/fixtures.json`; `scripts/check.mjs`
  fails if the hash changes)
- Base commit (branch point): `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- Branch: `muse/currency-converter-production-20261109`
- Candidate commit: (filled in after push — see VERIFICATION.md)
- Product PR: (filled in after push — see VERIFICATION.md)

## Files changed (only `tools/currency-converter/`)

```text
package.json
public/index.html
public/en/index.html
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/js/core/currency-converter.mjs
public/styles/currency-converter.css
scripts/build.mjs
scripts/check.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/fixtures.json
test/currency-converter-core.test.mjs
test/currency-converter-controller.test.mjs
test/currency-converter-report.test.mjs
dist-preview/ (generated preview, 9 files)
BUILD-MANIFEST.json
HANDOFF.md
VERIFICATION.md
```

## How each SPEC anchor was verified

- §3 worked anchors: `default-forward` (100 USD × 31.5 → 3150.00 TWD,
  inverse 0.031746), `reverse-exact`, `reverse-repeating` (100 ÷ 31.5
  → 317 cents, exact division only), `small-rate-inverse` (0.0066 →
  inverse 151.515, quick table rows rounded independently),
  `half-up-tie` (0.01 × 2.5 = 2.5 cents → 3), `yen-rate`,
  `min-rate-tie`, `rate-cap-boundary`, `same-codes` — all literal
  fixture cases in `test/currency-converter-core.test.mjs`, plus the
  hand-derived boundary tests in the same file.
- §7 case inventory: all 21 core cases and all 3 controller cases pass
  verbatim from `test/fixtures.json`.
- §3 serialization: the `default-forward` report bytes are asserted
  exactly in `test/currency-converter-report.test.mjs`, including
  key-order independence and the OUTPUT_LIMIT backstop.
- Controller cases: `state-dirty-error` (edit invalidates the result,
  rerun fails local validation with RANGE/rate and creates no second
  worker), `state-cancel-late` (cancel keeps the draft, the late
  success reply cannot resurrect the result, reset returns to empty
  with the default draft), `state-replace-late` (a late success reply
  from the older run cannot replace the newer run's error) — all driven
  through the controllable fake Worker.
- Reset: synchronous, restores the default draft byte-for-byte
  (`JSON.stringify` equality asserted) and the empty state.
- Cancel: only meaningful while busy; terminates the worker, keeps the
  draft, goes to `cancelled`; a no-op otherwise.
- Build determinism: two consecutive `build:preview` runs produce
  byte-identical `dist-preview/` trees and `BUILD-MANIFEST.json`
  (recursive diff clean); `check:generated:preview` passes.
- Loopback HTTP probe: 200 for `/`, `/en/`, the stylesheet, all four
  shipped scripts, the generated worker source and `/en/index.html`
  (see VERIFICATION.md).

## Deviations from the SPEC

None. The following readings were chosen where the SPEC leaves the
mechanics to the implementation, and are documented here so the
reviewer can confirm them:

1. **Worker failure has no separate state.** SPEC §2 lists only the
   six states empty / dirty / busy / success / error / cancelled, and
   §3 says resource or Worker failures use the fixed
   INTERNAL/WORKER_ERROR. A Worker construction, messaging, or error
   event therefore goes to `error` with error code WORKER_ERROR (the
   draft is kept, no result is fabricated). There is no `unavailable`
   state in this tool.
2. **Sequence accounting for a locally-failed run.** A run that fails
   local validation never posts to a Worker, so it leaves the sequence
   unchanged; every edit, reset, load-example, cancel and
   worker-submitting run increments it. This matches the sibling
   run-5 productions and is the only reading consistent with the
   pinned controller fixtures.
3. **No persistent storage.** SPEC §3 bans persistent storage and §2
   says the draft lives only in the current page, so the controller
   has no storage adapter and the app has no localStorage use at all.
   Switching language or leaving the page discards the draft; this is
   disclosed next to the language link and in the privacy note.
4. **No production canonical / hreflang / sitemap on the candidate.**
   SPEC §7 says the candidate pages carry robots noindex and no
   production canonical, and the planned origin
   `https://currency-converter.glossquote.com` is not configured yet,
   so both pages carry no canonical, hreflang, or absolute URLs at
   all. `scripts/check.mjs` and `scripts/check-generated.mjs` assert
   their absence.

## Spec-errata candidates

None found. All 21 core fixtures pass verbatim against the normative
text, and the hand-derived boundary probes (maximum amount, minimum
and maximum rates, the 6-significant-digit inverse at both ends, the
carry-overflow case 999999.5 → 1000000, and reverse division that
provably differs from re-multiplying the displayed inverse rate) all
agree with the SPEC's pinned algorithms. Errata: 0.

## Known limitations

- The pinned page CSP meta includes `worker-src blob:`, matching the
  blob-URL module Worker delivery; the interaction is only provable
  in a real browser. If a browser refused the blob worker, the
  controller degrades to the `error` state with WORKER_ERROR (local
  validation still runs; no result is fabricated). Real-browser
  verification is NOT_RUN (see VERIFICATION.md).
- The quick table is always from → to, even when the selected
  direction is to → from, per SPEC §2.

## Next owner

Independent reviewer: score the fixed candidate commit on the nine
SPEC §6 aspects. Do not merge, publish, or register — the coordinator
owns acceptance, merge, and publication.

# Screen PPI Calculator — Handoff

Tool: `tools/screen-ppi-calculator/` — from a diagonal (inches) and a
native resolution, computes pixel density (PPI), physical width/height
(cm), dot pitch (mm), total megapixels, and a reduced aspect-ratio
label.

## Fixed source

- Spec ID: `spec-screen-ppi-calculator-20261109`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/252
  (candidate commit `c8c11e12d1ee9cc684956fc0103a088cc2a0984a`)
- Spec fixtures SHA-256:
  `bccbc7d42443fffbd9589c1182c1148205ba7c542eee6e94f0f89967cd52bef6`
  (vendored verbatim as `test/fixtures.json`; `scripts/check.mjs`
  fails if the hash changes)
- Base commit (branch point): `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- Branch: `muse/screen-ppi-calculator-production-20261109`

## Files changed (only `tools/screen-ppi-calculator/`)

```text
package.json
public/index.html
public/en/index.html
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/js/core/screen-ppi.mjs
public/styles/screen-ppi.css
scripts/build.mjs
scripts/check.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/fixtures.json
test/screen-ppi-core.test.mjs
test/screen-ppi-controller.test.mjs
test/screen-ppi-report.test.mjs
dist-preview/ (generated preview, 9 files)
BUILD-MANIFEST.json
HANDOFF.md
VERIFICATION.md
```

## How each SPEC anchor was verified

- §3 worked anchors: all 18 core fixture cases pass verbatim
  (`assert.deepEqual` on the literal expected values in
  `test/fixtures.json`), including the exact-integer anchors
  `sxga-19` (diagonal pixels exactly 2000) and `min-diag-0-1` (PPI
  exactly 4000), the `43:18` ultrawide and `683:384` laptop ratios,
  and the `0.490` zero-padded dot pitch of `tv-85`.
- §3 serialization: the `fhd-24` and `tv-85` report bytes are
  asserted exactly in `test/screen-ppi-report.test.mjs`, including
  key-order independence and the OUTPUT_LIMIT backstop.
- Controller cases: `state-dirty-error` (edit revokes the result,
  the rerun fails local validation with RANGE on widthPx and no
  second worker is created), `state-cancel-late` (cancel keeps the
  draft, the late reply cannot resurrect, reset restores the defaults
  and the empty state), `state-replace-late` (the older run's late
  success cannot replace the newer run's local error) — all driven
  through the controllable fake Worker.
- Unrounded-PPI derivation: `100×100` at `15.6"` gives widthCm
  `28.0`; deriving from the displayed PPI `9.1` would give `27.9`
  (independently recomputed with 50-digit Decimal arithmetic), and
  the test asserts the core uses the unrounded value.
- Reconciliation invariant: for every passing core fixture, the
  unrounded width/height recombine to the diagonal within 1e-9 —
  see errata 2 for why the SPEC's wording of this invariant is
  corrected here.
- Reset: synchronous, restores the default draft byte-for-byte
  (`JSON.stringify` equality asserted) and the empty state.
- Build determinism: two consecutive `build:preview` runs produce
  byte-identical `dist-preview/` trees and `BUILD-MANIFEST.json`
  (recursive diff clean); `check:generated:preview` passes.
- Loopback HTTP probe: 200 for `/`, `/en/`, the stylesheet, all four
  shipped scripts, the generated worker source and `/en/index.html`
  (see VERIFICATION.md).

## Deviations from the SPEC

1. **No persistent storage.** SPEC §2 says data stays only in the
   current page draft and §4 bans persistent storage, so the
   controller has no storage adapter at all (unlike sibling tools
   whose SPEC pins a localStorage key). Switching language or leaving
   the page discards the draft; both pages say so next to the
   language link.
2. **No production canonical / hreflang / sitemap in the candidate.**
   SPEC §7 states the candidate carries none of these (the planned
   origin `https://screen-ppi-calculator.glossquote.com` is not
   configured), so the pages carry no canonical, og:url, hreflang or
   external URLs at all; `scripts/check.mjs` and
   `scripts/check-generated.mjs` assert their absence.
3. **Worker failure is an `error` state, not a separate
   `unavailable` state.** SPEC §2 lists only empty/dirty/busy/
   success/error/cancelled; a Worker failure therefore goes to
   `error` with the fixed `WORKER_ERROR` code (never a fabricated
   result). Local validation still runs first.
4. **Capacity violations use the `INPUT_LIMIT` code.** SPEC §3 pins
   the per-field check order (capacity → UNICODE → EMPTY → grammar
   → RANGE) and the 8-unit raw cap but names no code for the
   capacity stage; `INPUT_LIMIT` follows the sibling run-5 tools'
   convention and is pinned by tests.
5. **Sequence accounting for a locally-failed run.** A run that
   fails local validation never posts to a Worker, so it leaves the
   sequence unchanged; every edit, reset, load-example, cancel and
   worker-submitting run increments it. This is the reading the
   pinned `state-replace-late` fixture requires, and is documented
   in `controller.mjs`.

## Spec-errata candidates

1. **SPEC §3, result paragraph: "`6.10` 不合文法不會出現".** The
   normative grammar in the same section allows a decimal part of
   1–2 digits, so `"6.10"` conforms and parses to `6.1`. The
   implementation follows the explicit grammar; a dedicated test
   pins `"6.10"` → `diagonalIn: 6.1`. The parenthetical should be
   corrected (or the grammar tightened if trailing zeros were meant
   to be rejected).
2. **SPEC §7, reconciliation invariant as written.** It states
   `sqrt(widthCm² + heightCm²) / 2.54` "應與 ppiRaw …相等". That
   quantity mathematically equals the diagonal `d`, not `ppiRaw`:
   widthCm = w/ppiRaw × 2.54, so sqrt(widthCm² + heightCm²) =
   diagPx/ppiRaw × 2.54 = d × 2.54. (For `fhd-24`:
   sqrt(53.1312² + 29.8861²)/2.54 = 24, the diagonal, while ppiRaw
   is 91.79….) The implementation's unrounded derivation satisfies
   the corrected invariant — recombining to `d` within 1e-9 for
   every passing core fixture — and a dedicated test pins the
   corrected form. The SPEC sentence should say "應與對角線相等".

No other errata candidates were found. All 18 core fixtures pass
verbatim, so no fixture conflicts with the normative text.

## Known limitations

- The pinned page CSP meta includes `worker-src blob:` exactly as
  SPEC §4 pins it, so the blob-URL module Worker is allowed by the
  page's own CSP; whether a real browser accepts the module Worker
  from a Blob URL is still only settleable in a real browser, which
  is NOT_RUN (see VERIFICATION.md). If the worker is refused, the
  controller degrades to the `error` state with WORKER_ERROR (local
  validation still runs; no result is fabricated).
- No persistent storage by design (see deviation 1): a page reload
  loses the draft.

## Next owner

Independent reviewer: score the fixed candidate commit on the nine
SPEC §6 aspects. Do not merge, publish, or register — the coordinator
owns acceptance, merge, and publication.

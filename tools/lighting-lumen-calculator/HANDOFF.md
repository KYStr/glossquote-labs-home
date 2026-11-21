# Lighting Lumen Calculator — Handoff

Tool: `tools/lighting-lumen-calculator/` — estimates the total lumens
a room needs from its dimensions or area and its pinned target
illuminance by room type, plus the bulb count and the achieved
illuminance once whole bulbs are installed.

## Fixed source

- Spec ID: `spec-lighting-lumen-calculator-20261109`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/251
  (OPEN; head `muse/spec-lighting-lumen-calculator-20261109`,
  candidate commit `3119dccbc0c684ef07ef46aadb30e1b600f9544f`)
- Spec fixtures SHA-256:
  `a1d297f5f221dc9b2730fa8e01b63f55901ddb0cfced5509350a0f553d7629d0`
  (vendored verbatim as `test/fixtures.json`; `scripts/check.mjs`
  fails if the hash changes)
- Base commit (branch point): `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- Branch: `muse/lighting-lumen-calculator-production-20261109`

## Files changed (only `tools/lighting-lumen-calculator/`)

```text
package.json
public/index.html
public/en/index.html
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/js/core/lighting-lumen.mjs
public/styles/lighting-lumen.css
scripts/build.mjs
scripts/check.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/fixtures.json
test/lighting-lumen-core.test.mjs
test/lighting-lumen-controller.test.mjs
test/lighting-lumen-report.test.mjs
dist-preview/ (generated preview, 9 files)
BUILD-MANIFEST.json
HANDOFF.md
VERIFICATION.md
```

## How each SPEC anchor was verified

- Worked anchors: `living-dimensions-basic` (4.0 × 3.5 m → 1400 lm,
  2 bulbs, 114.3 lx), `bedroom-area-m2` (937.5 half-up → 938),
  `study-ping-area` (6 ping → 19.83 m², 5950 lm, 322.7 lx),
  `kitchen-exact-bulb-multiple` (exact multiple stays 2 bulbs),
  `bedroom-half-up-tie` (112.5 → 113, not banker's 112),
  `bathroom-min-dimensions`, `study-max-area`, `corridor-ping-min`
  (32/121 m² → 0.26, 26 lm from the unrounded area) are all literal
  fixture cases in `test/lighting-lumen-core.test.mjs` (50 tests total,
  all passing) plus the hand-derived boundary tests in the same file.
- §tests case inventory: all 14 core cases and all 3 controller cases
  pass verbatim from `test/fixtures.json`.
- Serialization: the `living-dimensions-basic` report bytes are
  asserted exactly
  (`{"achievedLux":114.3,"areaM2":14,"bulbCount":2,"installedLumens":1600,"targetLux":100,"totalLumens":1400}\n`)
  in `test/lighting-lumen-report.test.mjs`, including key-order
  independence and the OUTPUT_LIMIT backstop.
- Controller cases: `state-dirty-error` (local RANGE on rerun, no
  second worker created), `state-cancel-late` (cancel goes
  `cancelled`, the late reply cannot revive it, reset returns to
  `empty` with the default draft), `state-replace-late` (the late
  success reply cannot replace the local error) — all driven through
  the controllable fake Worker.
- Reset: synchronous, restores the default draft byte-for-byte
  (`JSON.stringify` equality asserted) and the `empty` state.
- Build determinism: two consecutive `build:preview` runs produce
  byte-identical `dist-preview/` trees and `BUILD-MANIFEST.json`
  (recursive diff clean); `check:generated:preview` passes.
- Loopback HTTP probe: 200 for `/`, `/en/`, the stylesheet, all four
  shipped scripts, the generated worker source and `/en/index.html`
  (see VERIFICATION.md).

## Deviations from the SPEC

1. **Preview pages carry no canonical, hreflang, or sitemap.**
   SPEC tests says the candidate pages carry robots noindex and
   "無 production canonical、hreflang 或 sitemap", and that the
   planned origin `https://lighting-lumen-calculator.glossquote.com`
   is not configured yet; the formal self-canonical / hreflang /
   sitemap are generated only once a real HTTPS origin is verified.
   The pages therefore have no canonical, hreflang, Open Graph URL,
   or sitemap references at all (and no `https://` URL anywhere in
   either page), and `scripts/check.mjs` / `check-generated.mjs`
   assert that absence. This follows the SPEC; it differs from the
   sibling run-5 tools, which ship a planned-origin canonical.
2. **An `unavailable` controller state exists for Worker failure.**
   SPEC userFlow lists empty, dirty, busy, success, error, cancelled;
   a Worker construction / messaging failure has no named state there
   ("Worker 失敗保留草稿供重試"). The controller uses `unavailable`
   for that case (same pattern as the sibling tools): the draft is
   kept, no result is fabricated, and a retry can succeed.
3. **Edit from `empty` goes to `dirty`.** SPEC userFlow defines
   `dirty` as any input, option, source, or example change, so an
   edit from the initial/reset state is a change that requires a
   fresh run; the sibling tools keep an idle state instead. Pinned by
   a dedicated controller test.
4. No other deviations. The target illuminance table (GB 50034-2013
   Table 5.1.1 general-activity values; corridors from EN 12464-1:
   2021), the exact 400/121 ping fraction, the BigInt rational
   arithmetic, the half-up rounding applied once per output, the
   bulb count from the already-rounded total, the validation order,
   the inactive-field capacity rule, and the enum-field capacity
   exemption are all implemented literally.

## Spec-errata candidates

None. All 14 core fixtures pass verbatim against the normative
text, and the hand-derived boundary probes (length/width 0.5–100.0,
area 0.25–10000 m² / 0.08–3000 ping, bulb 1–100000, the +1 lm
extra-bulb case, and the achievedLux 76.25 → 76.3 half-up tie) all
agree with the SPEC's rules. The AUTHOR-CHECK flags (the enum-field
capacity exemption, the corridor source mix, the GB 50034-2013
pinning choice) are already disclosed in the SPEC itself and are
implemented as written.

## Known limitations

- The draft is never persisted: switching language or leaving the
  page discards it, as the SPEC requires. There is no storage to
  inspect and no `localStorage` use anywhere in the tool.
- Real-browser verification is NOT_RUN (see VERIFICATION.md); the
  reviewer should exercise the success path in a real browser. The
  page CSP meta does include the SPEC-pinned `worker-src blob:`, so
  the blob-URL module Worker is allowed by the declared policy.

## Next owner

Independent reviewer: score the fixed candidate commit on the nine
SPEC acceptance aspects. Do not merge, publish, or register — the
coordinator owns acceptance, merge, and publication.

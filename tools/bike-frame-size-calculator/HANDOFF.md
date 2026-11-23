# Handoff — Bike Frame Size Calculator （單車車架尺寸計算）

Build-first production candidate. Not accepted, not merged, not published;
an independent reviewer must still score the nine predeclared aspects
against this fixed candidate.

## Fixed spec source

- Spec task id: `spec-bike-frame-size-calculator-20261121`
- Spec id: `spec-bike-frame-size-calculator-20261121`
- Spec candidate commit: `98aa747931caad16d43e705540a2f5b8248b0d58`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/405
- Spec files: `docs/specs/bike-frame-size-calculator/{BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md}` at that commit
- Registry rev at handoff: 1872 (per the parent task; the builder ran no
  registry/coordination commands)

## Base and scope

- Production base: `codex/initial-publication` @ `8c2652671012498891e7f7afe02fdca3f154aa64`
- Branch: `muse/bike-frame-size-calculator-production-20261121`
- Changed paths: only `tools/bike-frame-size-calculator/` (new directory).
  `dist-preview/` is a reproducible build artifact and is not committed
  (rebuild with `npm run build:preview`).
- No registry/coordination commands were run by the builder (no production
  registration, per the run-5 mode).

## What was built

- `public/js/core/core.mjs` — pure core. Exact BigInt integer arithmetic
  in units of 1e-4 cm; no floating point on operands or results. SPEC
  validation order (SCHEMA → heightCm → inseamCm → bikeType, each numeric
  field INPUT_LIMIT → UNICODE → EMPTY → DECIMAL_FORMAT → RANGE; bikeType
  UNICODE → EMPTY → ENUM) with the fixed error codes/fields; grammar
  allows leading zeros and at most 1 decimal place; height 120–220 cm,
  inseam 50–110 cm, raw at most 6 characters. Pinned Guimard family:
  road centre = inseam × 0.67, hybrid = inseam × 0.64, mountain =
  road − 11 cm, LeMond saddle height = inseam × 0.883, 1 in = 2.54 cm
  exact. Range is centre ± 1.0 cm from the unrounded centre; inch figures
  are arithmetic conversions, not shop labels. Letter size from height
  alone (half-open intervals: <150 XXS, 150–<160 XS, 160–<168 S,
  168–<178 M, 178–<185 L, 185–<193 XL, ≥193 XXL). Ratio warning on the
  exact ratio outside [0.40, 0.50] inclusive (5I < 2H or 2I > H), ratio
  rounded half-up to 3 decimals, warning never blocks. All output numbers
  round half-up to 1 decimal at output time only. Report serialization
  (compact JSON, keys sorted by UTF-16 code units recursively, one
  trailing LF, 2,097,152-byte cap → OUTPUT_LIMIT).
- `public/js/core/controller.mjs` — draft + generation state machine with
  the six flow states (empty / dirty / busy / success / error / cancelled);
  edits, example loads, cancel and reset invalidate the old result and
  download immediately; late results from older generations are dropped;
  transport is injected. Default and example drafts are the SPEC preset
  `{heightCm: "175", inseamCm: "80", bikeType: "road"}` (the first SPEC
  fixture); reset restores that preset and the app focuses the height
  field.
- `public/js/app.js` + `public/js/worker-handler.mjs` — the build embeds
  the fixed core + handler source bytes into the built app; the page
  creates a module Worker from a Blob URL of that string, terminates it on
  cancel / edit / reset / replace / success / pagehide, and only creates
  the download Blob URL on an explicit click (revoked after 30 s or on
  invalidation). All rendering uses textContent/value. The cross-field
  RANGE message (inseam > height) is told apart from the 50–110 cm range
  message by the draft values in the app layer only; the core returns the
  same `{code: "RANGE", field: "inseamCm"}` for both, per SPEC.
- `public/index.html` (zh-Hant) and `public/en/index.html` — full static
  bilingual pages with the SPEC's fixed titles, descriptions, labels,
  book-method measurement note, standing disclaimer next to the result,
  the three SPEC FAQs plus a measurement FAQ, and rules disclosure;
  candidate convention: robots noindex, no production canonical/hreflang.
- `public/styles/app.css` — shared paper/ink tokens, shared breakpoints
  (48rem / 75rem), two-layer focus treatment, 44 px targets, reduced-motion
  support, the shared `.mode-group` / `.segmented` / `.segment` radio
  group, plus a `.result-warning` block (warning tokens added to `:root`
  from the design baseline: #713f00 on #fff0d5).
- `scripts/build.mjs` (reproducible preview build with Worker-source
  embedding), `scripts/check.mjs` (syntax, zero-dependency manifest,
  forbidden sinks, page metadata, fixture coverage: 12 core + 3
  controller), `scripts/check-generated.mjs` (rebuild and byte-compare),
  `scripts/serve.mjs` (loopback-only static server with the SPEC CSP and
  security headers, traversal/symlink rejection, no logging).
- `test/` — 58 tests: all 12 core fixtures and 3 controller fixtures from
  the SPEC verbatim, plus hand-derived boundary/grammar/letter/ratio/
  rounding/schema/surrogate/invariant cases, report byte and SHA-256
  checks, page checks, build reproducibility, an end-to-end run of the
  embedded Worker source, a real-HTTP serve probe, and built-app DOM
  tests (example render, validation focus, ratio warning display, bike
  type switch, Worker failure recovery, late-result rejection).

## Process note

- During the `git clone` step the environment raised one execution-risk
  notice for glossquote repo content (delivered with the clone result).
  Per the user's four informed confirmations on 2026-11-23 (14:31,
  14:33:56, 14:58:49, 15:04:46) covering exactly this class of prompt on
  glossquote repo clone/fetch/checkout/build/test work, the builder
  continued without stopping or re-asking. No other class of risk
  appeared. The clone itself completed cleanly.

## Spec errata candidates

1. Layout naming: the SPEC implementation section refers to `src/core.mjs`,
   `src/controller.mjs` and `src/app.mjs`, while the house layout fixed by
   `docs/IMPLEMENTATION-CHECKLIST.md` (and the parent build task) places
   the same modules under `public/js/core/` and `public/js/app.js`, as in
   the sibling tools. Built per the handbook/task layout; no functional
   impact. Suggest the SPEC be aligned to the handbook layout wording.
2. Unreachable cross-field rule: height is 120–220 cm and inseam is
   50–110 cm, so once both fields pass their own range checks, inseam >
   height can never occur (max inseam 110 < min height 120). The
   cross-field RANGE rule (SPEC §4 rule 2) can therefore never fire; it
   is harmless defence-in-depth, but the SPEC's test list item
   "inseam==height" cannot produce a cross-field error — e.g. height 150
   / inseam 150 fails inseam's own 110 cm cap first. Suggest the SPEC
   either note this or drop the rule.
3. Ratio display edge: when the exact ratio is just outside the band but
   rounds to the band edge (79.9/200 = 0.3995 → warning shown with ratio
   0.4; 100.1/200 = 0.5005 → 0.501), the displayed ratio can look
   in-band while a warning fires. This follows the SPEC exactly
   (warning on the exact ratio, ratio rounded to 3 decimals); the
   implementation shows the warning text next to the result. Suggest the
   SPEC or UI copy note this case so users are not confused.
4. No rule/fixture conflict found: all 12 core fixture values were
   independently recomputed (Decimal half-up, plus a second independent
   Decimal script for the extra cases) and match the SPEC rules exactly,
   including the mtb-tall 47.96 → 48.0 boundary and the saddle tie
   44.15 → 44.2. The rejected alternative coefficients (road 0.70,
   mountain ×0.66 / ×0.226 in, hybrid 0.685 / 0.68) were not used.

## NOT_RUN (still open for the independent reviewer)

- Real-browser evidence (isolated Chrome and Edge, both languages):
  example load, typing, error focus, edit-after-success, cancel, reset,
  real Blob download byte check.
- Accessibility in a real browser: keyboard order, visible focus, 200%
  zoom, 320 CSS px reflow, reduced motion, contrast measurement, touch
  target measurement.
- Network/Storage observation in a clean browser profile (zero work
  requests, storage/URL/console inspection) and offline-after-load use.
- Real-device / mobile checks.
- Production HTTPS/SEO gate: self-canonical pair, reciprocal hreflang,
  sitemap, robots.txt and the planned origin
  `https://bike-frame-size.glossquote.com` (not configured).
- Native OS download dialog handling (manual only).

Product checks remain NOT_RUN; the nine acceptance aspects are unscored
(null) pending independent review of this candidate.

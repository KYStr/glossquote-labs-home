# Handoff — Waist-to-Height Ratio Calculator （腰高比計算機）

Build-first production candidate. Not accepted, not merged, not published;
an independent reviewer must still score the nine predeclared aspects
against this fixed candidate.

## Fixed spec source

- Spec task id: `spec-waist-height-ratio-calculator-20261121`
- Spec id: `spec-waist-height-ratio-calculator-20261121`
- Spec candidate commit: `b48e464b313e905f57c4bfa79513981e35ca5a69`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/370
- Spec files: `docs/specs/waist-height-ratio-calculator/{BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md}` at that commit
- Registry rev at handoff: 1692 (per the parent task; the builder ran no
  registry/coordination commands)

## Base and scope

- Production base: `codex/initial-publication` @ `8c265267`
- Branch: `muse/waist-height-ratio-calculator-production-20261121`
- Changed paths: only `tools/waist-height-ratio-calculator/` (new directory).
  `dist-preview/` is a reproducible build artifact and is git-ignored.
- No registry/coordination commands were run by the builder.

## What was built

- `public/js/core/core.mjs` — pure core. Exact BigInt integer arithmetic on
  hundredths of a centimetre; no floating point on operands or results.
  SPEC validation order (SCHEMA → waistCm → heightCm, each field
  INPUT_LIMIT → UNICODE → EMPTY → DECIMAL_FORMAT → RANGE) with the fixed
  error codes/fields; grammar allows leading zeros and at most 2 decimal
  places; waist 20–300 cm, height 50–300 cm. Displayed ratio is WHtR × 100
  rounded half-up to 2 decimals (`"0.50"` keeps the trailing zero). The
  category is judged on the exact unrounded ratio by integer comparison
  (below-healthy 5W < 2H; healthy 2W < H; increased 5W < 3H; else high), so
  a displayed 0.50 can be healthy (84.9/170) or increased (85/170).
  Healthy waist range 0.40×/0.50× height, half-up to 1 decimal; distance
  to target only when the exact ratio is ≥ 0.50 (waist − 0.50 × height,
  half-up to 1 decimal, `"0.0"` when exactly at half). Report
  serialization (compact JSON, keys sorted by UTF-16 code units
  recursively, one trailing LF, 2,097,152-byte cap → OUTPUT_LIMIT).
- `public/js/core/controller.mjs` — draft + generation state machine with
  the six flow states (empty / dirty / busy / success / error / cancelled);
  edits, example loads, cancel and reset invalidate the old result and
  download immediately; late results from older generations are dropped;
  transport is injected. Default draft is two empty fields; the example is
  the first SPEC fixture (waist 76, height 170).
- `public/js/app.js` + `public/js/worker-handler.mjs` — the build embeds
  the fixed core + handler source bytes into the built app; the page
  creates a module Worker from a Blob URL of that string, terminates it on
  cancel / edit / reset / replace / success / pagehide, and only creates
  the download Blob URL on an explicit click (revoked after 30 s or on
  invalidation). All rendering uses textContent/value. Reset restores the
  empty draft and focuses the waist field.
- `public/index.html` (zh-Hant) and `public/en/index.html` — full static
  bilingual pages with the SPEC's fixed titles, descriptions, labels,
  measurement note, standing disclaimer, FAQ (including the 0.50-but-
  healthy case) and rules disclosure; candidate convention: robots
  noindex, no production canonical/hreflang.
- `public/styles/app.css` — shared paper/ink tokens, shared breakpoints
  (48rem / 75rem), two-layer focus treatment, 44 px targets, reduced-motion
  support, plus a `.disclaimer` block.
- `scripts/build.mjs` (reproducible preview build with Worker-source
  embedding), `scripts/check.mjs` (syntax, zero-dependency manifest,
  forbidden sinks, page metadata, fixture coverage),
  `scripts/check-generated.mjs` (rebuild and byte-compare),
  `scripts/serve.mjs` (loopback-only static server with the SPEC CSP and
  security headers, traversal/symlink rejection, no logging).
- `test/` — 54 tests: all 13 core fixtures and 3 controller fixtures from
  the SPEC verbatim, plus hand-derived boundary/grammar/rounding/schema/
  surrogate/invariant cases, report byte and SHA-256 checks, page checks,
  build reproducibility, an end-to-end run of the embedded Worker source,
  a real-HTTP serve probe, and built-app DOM tests (example render,
  validation focus, Worker failure recovery, late-result rejection).

## Process note

- During `git fetch` / `git show` of the spec branch, the environment
  raised one execution-risk notice for glossquote repo content. Per the
  user's four informed confirmations on 2026-11-23 (14:31, 14:33:56,
  14:58:49, 15:04:46) covering exactly this class of prompt on glossquote
  repo clone/fetch/checkout/build/test work, the builder continued without
  stopping or re-asking. No other class of risk appeared.

## Spec errata candidates

1. Layout naming: the SPEC implementation section refers to `src/core.mjs`,
   `src/controller.mjs` and `src/app.mjs`, while the house layout fixed by
   `docs/IMPLEMENTATION-CHECKLIST.md` (and the parent build task) places
   the same modules under `public/js/core/` and `public/js/app.js`, as in
   the sibling tools. Built per the handbook/task layout; no functional
   impact. Suggest the SPEC be aligned to the handbook layout wording.
2. None found in the rules or fixtures: all 13 core fixture values were
   independently recomputed (Decimal, 50-digit precision, plus a second
   pure-integer recomputation) and match the SPEC rules exactly, including
   the `just-below-half` / `exactly-half` trap pair and the 0.40 boundary.

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
  `https://waist-height-ratio-calculator.glossquote.com` (not configured).
- Native OS download dialog handling (manual only).

Product checks remain NOT_RUN; the nine acceptance aspects are unscored
(null) pending independent review of this candidate.

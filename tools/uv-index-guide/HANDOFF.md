# Handoff — UV Index Guide （紫外線指數指南）

Build-first production candidate. Not accepted, not merged, not published;
an independent reviewer must still score the nine predeclared aspects
against this fixed candidate.

## Fixed spec source

- Spec task id: `spec-uv-index-guide-20261121`
- Spec id: `spec-uv-index-guide-20261121`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/390
- Spec files: `docs/specs/uv-index-guide/{BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md}`
- Registry rev at handoff: 1797 (per the parent task; the builder ran no
  registry/coordination commands)

## Base and scope

- Production base: `codex/initial-publication` @ `8c265267`
- Branch: `muse/uv-index-guide-production-20261121`
- Changed paths: only `tools/uv-index-guide/` (new directory).
  `dist-preview/` is a reproducible build artifact and is git-ignored.
- No registry/coordination commands were run by the builder.

## What was built

- `public/js/core/core.mjs` — pure core. Exact BigInt integer arithmetic on
  tenths of a UV index unit; no floating point on operands or results.
  SPEC validation order (uvIndex capacity → surrogate → grammar → range →
  skinType); error codes INPUT_LIMIT / UNICODE / EMPTY / FORMAT / RANGE /
  SCHEMA with the fixed fields. Grammar: integer part `0` or non-zero-
  leading, at most one decimal digit (`"08"`, `"8.55"`, `"1e1"` rejected);
  raw at most 8 units; range 0–20 inclusive. Missing uvIndex is EMPTY;
  omitted skinType defaults to `"III"`; empty or out-of-set skinType is
  SCHEMA. uvIndexRounded = floor(uvIndex + 0.5) (half-up, exact integer
  division). Category table verbatim from SPEC §2 (WHO thresholds and
  colours, CWA Chinese names, PMS codes). Advice / SPF / reapply / CWA
  burn-time table verbatim from SPEC §3 (SPF 15 low, 30 moderate/high,
  50 very-high/extreme; reapply 120 min from moderate up; avoidMidday at
  rounded ≥ 8). Burn estimate uses the UNROUNDED uvIndex:
  minutesToRedness = round-half-up(MED / (1.5 × uvIndex)) in exact
  integers; uvIndex 0 gives null; values above 180 cap to 180 with
  capped = true. MED pinned per SPEC §5 (I 200, II 250, III 300, IV 450,
  V 600, VI 1000 J/m²). The result always carries the verbatim disclaimer
  in both languages; the estimate is never called a safe time. Report
  serialization (compact JSON, keys sorted by UTF-16 code units
  recursively, one trailing LF, 2,097,152-byte cap → OUTPUT_LIMIT).
- `public/js/core/controller.mjs` — draft + generation state machine with
  the six flow states (empty / dirty / busy / success / error / cancelled);
  edits, example loads, cancel and reset invalidate the old result and
  download immediately; late results from older generations are dropped;
  transport is injected. Default draft is the SPEC default
  `{"uvIndex":"5","skinType":"III"}`; reset restores it (state empty);
  the example is the first SPEC fixture (uvIndex 2, skinType III).
- `public/js/app.js` + `public/js/worker-handler.mjs` — the build embeds
  the fixed core + handler source bytes into the built app; the page
  creates a module Worker from a Blob URL of that string, terminates it on
  cancel / edit / reset / replace / success / pagehide, and only creates
  the download Blob URL on an explicit click (revoked after 30 s or on
  invalidation). All rendering uses textContent/value. The category is
  shown as a colour swatch plus the category name text (never colour
  alone). Reset restores the default draft and focuses the UV field.
- `public/index.html` (zh-Hant) and `public/en/index.html` — full static
  bilingual pages with the SPEC's fixed titles, descriptions, H1s,
  labels, verbatim disclaimer, the two SPEC FAQs, the category table and
  calculation rules in a disclosure; candidate convention: robots
  noindex, no production canonical/hreflang; same-language home links use
  `../../`.
- `public/styles/app.css` — shared paper/ink tokens, shared breakpoints
  (48rem / 75rem), two-layer focus treatment, 44 px targets, reduced-motion
  support, plus `.swatch-*` category colours (green/yellow/orange/red/
  purple) and a `.disclaimer` block.
- `scripts/build.mjs` (reproducible preview build with Worker-source
  embedding), `scripts/check.mjs` (syntax, zero-dependency manifest,
  forbidden sinks, page metadata, fixture coverage),
  `scripts/check-generated.mjs` (rebuild and byte-compare),
  `scripts/serve.mjs` (loopback-only static server with the SPEC CSP and
  security headers, traversal/symlink rejection, no logging).
- `test/` — 61 tests: all 16 core fixtures and 3 controller fixtures from
  the SPEC verbatim, plus hand-derived boundary/grammar/rounding/cap/
  schema/surrogate/invariant cases, report byte and SHA-256 checks, page
  checks, build reproducibility, an end-to-end run of the embedded Worker
  source, a real-HTTP serve probe, and built-app DOM tests (example render
  with all result facts, skin-type change, validation focus, range
  failure, Worker failure recovery, late-result rejection).

## Process note

- During repo listing / clone / build work, the environment raised
  execution-risk notices for glossquote repo content (the same class that
  fired in run 5, run 6 specs and run 6 production wave 1). Per the user's
  four informed confirmations on 2026-11-23 (14:31, 14:33:56, 14:58:49,
  15:04:46) covering exactly this class of prompt on glossquote repo
  clone/fetch/checkout/build/test work, the builder continued without
  stopping or re-asking. No other class of risk appeared.

## Spec errata candidates

1. Layout naming: the SPEC implementation section refers to `src/core.mjs`,
   `src/controller.mjs` and `src/app.mjs`, while the house layout fixed by
   `docs/IMPLEMENTATION-CHECKLIST.md` (and the parent build task) places
   the same modules under `public/js/core/` and `public/js/app.js`, as in
   the sibling tools. Built per the handbook/task layout; no functional
   impact. Suggest the SPEC be aligned to the handbook layout wording.
2. Validation-detail judgement, not a rule conflict: for a present-but-
   wrong-typed field the builder returns SCHEMA with that field's name
   (SPEC §1: "型別…SCHEMA，field 即上述欄名"); for an accessor property
   or an unknown extra field it returns SCHEMA with field null (SPEC
   preamble: "accessor 皆 SCHEMA，field,row=null"). No fixture covers
   these two sub-cases, so the reviewer may want to pin the choice in the
   SPEC.
3. No rule/fixture conflict found: all 16 core fixture values match an
   independent hand recomputation exactly, including the unrounded-index
   burn trap (6.5 → 21 min, not 19; 10.5 → 19 min, not 18), the half-up
   rounding boundaries (2.5 → 3, 7.5 → 8, 10.5 → 11) and the 180 cap
   (1 → 667 → 180, capped).

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
  `https://uv-index-guide.glossquote.com` (not configured).
- Native OS download dialog handling (manual only).

Product checks remain NOT_RUN; the nine acceptance aspects are unscored
(null) pending independent review of this candidate.

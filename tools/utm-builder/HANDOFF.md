# Handoff — UTM Builder （UTM 連結產生器）

Build-first production candidate. Not accepted, not merged, not published;
an independent reviewer must still score the nine predeclared aspects
against this fixed candidate.

## Fixed spec source

- Spec task id: `spec-utm-builder-20261121`
- Spec id: `spec-utm-builder-20261121`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/406
  (OPEN; registry rev 1877 per the parent task)
- Spec files: `docs/specs/utm-builder/{BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md}`
  (read from the spec clone at `build6/specs/utm-builder/docs/specs/utm-builder/`;
  the base branch does not carry `docs/specs/utm-builder/` yet, as PR #406
  is still a draft)
- Registry rev at handoff: 1877 (per the parent task; the builder ran no
  registry/coordination commands)

## Base and scope

- Production base: `codex/initial-publication` @ `8c2652671012498891e7f7afe02fdca3f154aa64`
- Branch: `muse/utm-builder-production-20261121`
- Changed paths: only `tools/utm-builder/` (new directory).
  `dist-preview/` is a reproducible build artifact and is git-ignored
  (`tools/utm-builder/.gitignore`).
- No registry/coordination commands were run by the builder.

## What was built

- `public/js/core/core.mjs` — pure core. `run(input)` takes exactly the
  six string fields baseUrl/source/medium/campaign/term/content (SCHEMA
  otherwise) and validates in the SPEC order: capacity (baseUrl raw 2048,
  each UTM value raw 200) → unpaired surrogate → URL parse (WHATWG, http/
  https only, host non-empty, no username/password; output takes the
  trimmed raw string, no case normalization, no added slash) → duplicate
  check (existing query split on `&`, raw key before the first `=`,
  case-sensitive, no decoding, against all five utm_* names) → per-field
  checks in source/medium/campaign/term/content order (required EMPTY,
  control chars U+0000–U+001F/U+007F INVALID_CHAR, trimmed length > 100
  VALUE_TOO_LONG; optional blanks omitted). Encoding is
  encodeURIComponent semantics (space %20 never +, unencoded set exactly
  A–Z a–z 0–9 - _ . ! ~ * ' ( ), % → %25 with no pre-decoding).
  Merging: existing query kept verbatim first (an empty existing query
  counts as no query, so no empty segment is left), UTM parameters
  appended in the fixed source→medium→campaign→term→content order,
  existing fragment kept verbatim last. Result `{taggedUrl, params}`
  with params carrying the trimmed unencoded raw values. Report
  serialization (compact JSON, keys sorted by UTF-16 code units
  recursively, one trailing LF, 2,097,152-byte cap → OUTPUT_LIMIT).
- `public/js/core/controller.mjs` — draft + generation state machine with
  the six flow states (empty / dirty / busy / success / error /
  cancelled); edits, preset applications, example loads, cancel and reset
  invalidate the old result and download immediately; late results from
  older generations are dropped; transport is injected. Reset default is
  the SPEC default (all six fields empty strings); the example is the
  first SPEC core fixture (basic-social) verbatim. Presets fill only
  source and medium and clear term and content; campaign and baseUrl keep
  their values: social facebook/social, newsletter newsletter/email,
  ads google/cpc.
- `public/js/app.js` + `public/js/worker-handler.mjs` — the build embeds
  the fixed core + handler source bytes into the built app; the page
  creates a module Worker from a Blob URL of that string, terminates it
  on cancel / edit / reset / replace / success / pagehide, and only
  creates the download Blob URL on an explicit click (revoked after
  30 s or on invalidation). All rendering uses textContent/value.
  "Copy link" is the delivery action: `navigator.clipboard.writeText`
  is called only on an explicit click with only the current taggedUrl;
  a copy failure shows a localized COPY_FAILED message and keeps the
  result and the report download (the clipboard call is the one
  capability the SPEC explicitly pins for this tool, so it is not in
  the forbidden-sink list in `scripts/check.mjs`).
- `public/index.html` (zh-Hant) and `public/en/index.html` — full static
  bilingual pages with the SPEC's fixed titles, descriptions, labels,
  preset group, rules disclosure and the four SPEC FAQs (spaces as +,
  existing query parameters, shortening/tracking, preset overwriting
  the campaign); candidate convention: robots noindex, no production
  canonical/hreflang, same-language home links use `../../`.
- `public/styles/app.css` — shared paper/ink tokens, shared breakpoints
  (48rem / 75rem), two-layer focus treatment, 44 px targets,
  reduced-motion support, plus the preset group and the parameter
  detail table.
- `scripts/build.mjs` (reproducible preview build with Worker-source
  embedding), `scripts/check.mjs` (syntax, zero-dependency manifest,
  forbidden sinks, page metadata, fixture coverage),
  `scripts/check-generated.mjs` (rebuild and byte-compare),
  `scripts/serve.mjs` (loopback-only static server with the SPEC CSP and
  security headers, traversal/symlink rejection, no logging).
- `test/` — 67 tests: all 15 core fixtures and 3 controller fixtures
  from the SPEC verbatim, plus hand-derived boundary/capacity/order/
  schema/surrogate/control-char/encoding/URL/merge/duplicate/value
  cases, preset behaviour, report byte and SHA-256 checks, page checks,
  build reproducibility, an end-to-end run of the embedded Worker
  source, a real-HTTP serve probe, and built-app DOM tests (example
  render, EMPTY/DUPLICATE_UTM/INVALID_URL field focus, preset fill,
  copy success and COPY_FAILED recovery with the result kept, fixed-
  filename download, Worker failure recovery, late-result rejection).

## Process note

- During listing/clone work on glossquote repo content, the environment
  raised execution-risk notices of the class the user has already
  covered: four informed confirmations on 2026-11-23 (14:31, 14:33:56,
  14:58:49, 15:04:46) for this exact class of prompt on glossquote repo
  clone/fetch/checkout/listing/build/test work. The builder continued
  without stopping or re-asking, per that standing authorization. No
  other class of risk appeared.

## Spec errata candidates

1. Layout naming: the SPEC implementation section refers to
   `src/core.mjs`, `src/controller.mjs` and `src/app.mjs`, while the
   house layout fixed by the parent build task (and the sibling tools)
   places the same modules under `public/js/core/` and
   `public/js/app.js`. Built per the handbook/task layout; no functional
   impact. Suggest the SPEC be aligned to the handbook layout wording.
2. UNICODE placement is unpinned: the SPEC's general code table maps an
   unpaired surrogate to UNICODE, but the validation order never says
   where the surrogate check runs. The builder placed it as its own
   step immediately after capacity, covering all six fields in fixed
   field order (it must precede any encoding, because
   encodeURIComponent throws on a lone surrogate). No fixture covers
   the placement; a value containing both a control character and a
   lone surrogate reports UNICODE under this placement, not
   INVALID_CHAR. Suggest the SPEC pin the step.
3. Trim set for UTM values is unpinned: the SPEC pins the ASCII
   whitespace set (U+0020, Tab, CR, LF) for trimming baseUrl, and says
   only 去空白 for the values. The builder applied the same pinned set
   to the values for consistency (so e.g. a NBSP around a value is kept
   and encoded, not trimmed). Suggest the SPEC pin the value trim set.
4. No rule/fixture conflict found: all 15 core fixtures match an
   independent hand recomputation exactly, including the 101-character
   VALUE_TOO_LONG case, the UTF-8 encoding of 夏季特價, and the
   %25 handling of `50% off`. One test expectation of the builder's own
   (not a fixture) was corrected during the build: `https:///path` is
   a valid URL under the SPEC's own rule, because WHATWG parsing reads
   its host as `path` (non-empty); the core was right and the test was
   fixed. No SPEC change needed there.

## NOT_RUN (still open for the independent reviewer)

- Real-browser evidence (isolated Chrome and Edge, both languages):
  example load, typing, error focus, edit-after-success, cancel, reset,
  preset buttons, real clipboard copy, real Blob download byte check.
- Accessibility in a real browser: keyboard order, visible focus, 200%
  zoom, 320 CSS px reflow, reduced motion, contrast measurement, touch
  target measurement.
- Network/Storage observation in a clean browser profile (zero work
  requests, storage/URL/console inspection) and offline-after-load use.
- Real-device / mobile checks.
- Production HTTPS/SEO gate: self-canonical pair, reciprocal hreflang,
  sitemap, robots.txt and the planned origin
  `https://utm-builder.glossquote.com` (not configured).
- Native OS download dialog handling (manual only).

Product checks remain NOT_RUN; the nine acceptance aspects are unscored
(null) pending independent review of this candidate.

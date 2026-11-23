# Handoff — URL Slug Generator （網址 slug 產生器）

Build-first production candidate. Not accepted, not merged, not published;
an independent reviewer must still score the nine predeclared aspects
against this fixed candidate.

## Fixed spec source

- Spec task id: `spec-url-slug-generator-20261121`
- Spec id: `spec-url-slug-generator-20261121`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/397
  (OPEN; head `c75f9cd33c4e6b6c4e0aedebabafd1b0b71ffd0d`, read back with
  `gh pr view 397` by the builder)
- Spec files: `docs/specs/url-slug-generator/{BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md}`
- Registry rev at handoff: 1832 (per the parent task; the builder ran no
  registry/coordination commands)

## Base and scope

- Production base: `codex/initial-publication` @ `8c265267`
- Branch: `muse/url-slug-generator-production-20261121`
- Changed paths: only `tools/url-slug-generator/` (new directory).
  `dist-preview/` is a reproducible build artifact and is git-ignored.
- No registry/coordination commands were run by the builder.

## What was built

- `public/js/core/core.mjs` — pure core. The pinned 8-step conversion
  (NFKD → strip combining marks U+0300–U+036F → closed 14-item special
  Latin map → lowercase → runs of non-[a-z0-9] fold to one "-" → trim
  leading/trailing "-" → empty means EMPTY_SLUG → truncate to maxLength
  and strip any trailing "-" left by the cut). Validation order
  (SCHEMA → capacity title/maxLength → surrogate on title → grammar
  title/maxLength → empty slug) with the fixed error codes/fields;
  title raw cap 1000 UTF-16 units, maxLength raw cap 8, maxLength
  grammar `^(0|[1-9][0-9]*)$` (so "00"/"050" are INTEGER_FORMAT),
  range 1–100, empty maxLength applies the default 50, a slug exactly
  at the cap is not truncated. CJK characters are separators and are
  dropped, never transliterated; a CJK-only title returns EMPTY_SLUG
  with no "untitled" fallback. Report serialization (compact JSON, keys
  sorted by UTF-16 code units recursively, one trailing LF, 2,097,152-
  byte cap → OUTPUT_LIMIT).
- `public/js/core/controller.mjs` — draft + generation state machine with
  the six flow states (empty / dirty / busy / success / error /
  cancelled); edits, example loads, cancel and reset invalidate the old
  result and download immediately; late results from older generations
  are dropped; transport is injected. Reset default is the SPEC default
  `{"title":"","maxLength":"50"}`; the example is the first SPEC core
  fixture (basic-title) verbatim.
- `public/js/app.js` + `public/js/worker-handler.mjs` — the build embeds
  the fixed core + handler source bytes into the built app; the page
  creates a module Worker from a Blob URL of that string, terminates it
  on cancel / edit / reset / replace / success / pagehide, and only
  creates the download Blob URL on an explicit click (revoked after
  30 s or on invalidation). All rendering uses textContent/value.
  "Copy slug" is the delivery action: `navigator.clipboard.writeText`
  is called only on an explicit click with only the current slug; a
  copy failure shows a localized COPY_FAILED message and keeps the
  result and the report download (the clipboard call is the one
  capability the SPEC explicitly pins for this tool, so it is not in
  the forbidden-sink list in `scripts/check.mjs`).
- `public/index.html` (zh-Hant) and `public/en/index.html` — full static
  bilingual pages with the SPEC's fixed titles, descriptions, labels,
  rules disclosure and the four SPEC FAQs (pinyin, underscores, the
  length cap, already-in-use check); candidate convention: robots
  noindex, no production canonical/hreflang.
- `public/styles/app.css` — shared paper/ink tokens, shared breakpoints
  (48rem / 75rem), two-layer focus treatment, 44 px targets,
  reduced-motion support, plus textarea and `.result-slug` styling.
- `scripts/build.mjs` (reproducible preview build with Worker-source
  embedding), `scripts/check.mjs` (syntax, zero-dependency manifest,
  forbidden sinks, page metadata, fixture coverage),
  `scripts/check-generated.mjs` (rebuild and byte-compare),
  `scripts/serve.mjs` (loopback-only static server with the SPEC CSP and
  security headers, traversal/symlink rejection, no logging).
- `test/` — 64 tests: all 16 core fixtures and 3 controller fixtures
  from the SPEC verbatim, plus hand-derived boundary/grammar/schema/
  surrogate/special-map/NFKD/truncation/invariant cases, report byte
  and SHA-256 checks, page checks, build reproducibility, an end-to-end
  run of the embedded Worker source, a real-HTTP serve probe, and
  built-app DOM tests (example render, EMPTY_SLUG/RANGE field focus,
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
2. None found in the rules or fixtures: all 16 core fixture values were
   independently re-derived by hand from the SPEC rules (including the
   truncate-clean cut landing exactly on a hyphen, the special-Latin
   all-caps pair, and the 1000/1001 capacity edge), and the platform
   NFKD/lowercase behaviour the hand derivations rely on (½ → "1⁄2",
   ① → "1", ẞ → "ß" on lowercase, İ → I + U+0307) was verified
   directly against the platform, not against the product code.

## NOT_RUN (still open for the independent reviewer)

- Real-browser evidence (isolated Chrome and Edge, both languages):
  example load, typing, error focus, edit-after-success, cancel, reset,
  real clipboard copy, real Blob download byte check.
- Accessibility in a real browser: keyboard order, visible focus, 200%
  zoom, 320 CSS px reflow, reduced motion, contrast measurement, touch
  target measurement.
- Network/Storage observation in a clean browser profile (zero work
  requests, storage/URL/console inspection) and offline-after-load use.
- Real-device / mobile checks.
- Production HTTPS/SEO gate: self-canonical pair, reciprocal hreflang,
  sitemap, robots.txt and the planned origin
  `https://url-slug-generator.glossquote.com` (not configured).
- Native OS download dialog handling (manual only).

Product checks remain NOT_RUN; the nine acceptance aspects are unscored
(null) pending independent review of this candidate.

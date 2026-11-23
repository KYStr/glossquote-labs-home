# HTTP Status Lookup — Production Handoff

## Fixed source

- Spec: `spec-http-status-lookup-20261121`, draft spec PR
  [#400](https://github.com/KYStr/glossquote-labs-home/pull/400)
  (`muse/spec-http-status-lookup-20261121`, head
  `32869608c658f3785a1fea6134fe5d03a688b37a`, OPEN, base
  `codex/initial-publication`), registry rev 1847.
- Vendored fixtures: `test/fixtures.json`, byte-identical to the spec
  candidate's fixtures (SHA-256
  `efe43e2f90d2d039995247b0544d63c08991ea5cd29d35042a3c4ab475a1c55f`),
  17 core + 3 controller cases.
- Base branch: `codex/initial-publication` (this clone's HEAD at build
  time: see VERIFICATION.md).
- Production branch: `muse/http-status-lookup-production-20261121`.
- Product scope: `tools/http-status-lookup/` only. No registry
  production registration was done (production does not go through
  the registry; run-5 pattern).

## What was built

- `public/js/core/http-status.mjs`: pure `run(input)` — one `code`
  field, SPEC §4 validation order (capacity > 8 → INPUT_LIMIT, lone
  surrogate → UNICODE, empty → EMPTY, `^[0-9]{3}$` → INTEGER_FORMAT,
  value outside 100–599 → RANGE), class from the first digit, the
  64-row SPEC §5 table (IANA registry as read 2026-11-21), fixed
  unassigned strings, `temporary` only for 104, `obsolete` only for
  510, and `buildReport` (canonical compact JSON, sorted keys, one
  trailing LF, `http-status-lookup-report.json`, 2 MiB limit).
- `public/js/controller.mjs`: draft/generation state machine
  (empty/dirty/busy/success/error/cancelled), fake-worker-testable.
- `public/js/worker-handler.mjs` + `scripts/build.mjs`: the page runs
  the same core in a module Worker built from the fixed embedded
  worker source.
- `public/js/app.js`: textContent/value only; renders the result
  (class badge, official name, meaning, causes, advice, reference,
  104/510/unassigned notes), wires the 64-row table filter and
  row-click fill-in (marks dirty, waits for a manual run), and the
  success-only report download (Blob URL revoked within 30 s).
- `public/index.html` + `public/en/index.html`: bilingual pages,
  SPEC-pinned titles/descriptions/H1, preview noindex, no canonical /
  hreflang, same-language home links, draft-loss note, the three
  SPEC-pinned FAQs, and the full static 64-row table with class
  filter. Default input `404`; example `200` (the SPEC-pinned value;
  see errata candidate 4 — fixtures.json actually lists 100 first).
- `scripts/{build,check,check-generated,serve}.mjs`, `test/*.test.mjs`,
  `package.json` (Node ≥24, ESM, zero dependencies).

## Verification (see VERIFICATION.md for commands and hashes)

- `node --test`: all tests pass (count in VERIFICATION.md).
- `node scripts/check.mjs`: passes.
- `node scripts/build.mjs --mode preview` run twice: byte-identical
  (both BUILD-MANIFEST hashes in VERIFICATION.md).
- `node scripts/check-generated.mjs --mode preview`: passes.

## Spec-errata candidates (spec text issues; the build follows the SPEC's formula/text rules, not the errata)

1. SPEC §implementation names the sources `src/core.mjs`,
   `src/controller.mjs`, `src/app.mjs`, but the house layout
   (AGENT-HANDBOOK.md / IMPLEMENTATION-CHECKLIST.md, and every
   run-6 sibling tool) ships them as `public/js/core/*.mjs`,
   `public/js/controller.mjs`, `public/js/app.js`. Built per the
   house layout; the SPEC's `src/` paths do not match the shipped
   layout.
2. SPEC §inputsOutputs carries the template sentence "textarea 以 DOM
   的 LF 值為準", but this tool has no textarea — its only input is
   a single-line text field. The sentence does not apply here.
3. SPEC §userFlow says the table ends with "一行註明各分類的未指派
   區間", but SPEC §5 itself gives one combined unassigned-interval
   list, not per-class lists. The build notes the combined list
   (105–199、209–225、227–299、309–399、419–420、427、430、432–450、
   452–499、509、512–599), exactly as §5 states it.
4. SPEC §userFlow says 「載入範例」 fills "fixtures.json 第一個核心
   案例（`200`)", but the vendored fixtures.json actually lists
   `code-100-continue` (input `100`) first; `code-200-ok` is second.
   The SPEC's explicit value (`200`) was followed for the example;
   the "第一個" wording contradicts the actual fixture order.

No SPEC-vs-example conflict was found: all 12 literal success
fixtures match the SPEC §5 table row-for-row (verified by an
independent parse of SPEC.md and by a second hand transcription of
all 64 [code, reason, reference] pairs in `test/core.test.mjs`).

## NOT_RUN (not verified by this build)

- Real-browser checks (Chrome/Edge, both languages, keyboard,
  320 px, 200% zoom, reduced motion, touch targets, contrast):
  NOT_RUN — no isolated-browser mechanism was available to this
  builder. Node/DOM-level checks are not claimed as browser passes.
- Network/Storage zero-request observation in a clean isolated
  profile: NOT_RUN (code has no fetch/XHR/WebSocket/beacon/storage
  calls; the static scan in `check.mjs` enforces this, but that is
  not a live-profile observation).
- Native file-picker / OS download dialog: NOT_RUN (human-only).
- Production HTTPS/SEO (canonical, hreflang, sitemap, robots.txt):
  NOT_RUN by design — preview build only, no production origin
  approved (planned origin `https://http-status-lookup.glossquote.com`
  is not configured).

## Next owner

Independent reviewer (not the builder): verify this candidate
commit/PR head against the SPEC's nine acceptance facets, using
VERIFICATION.md as the evidence list. Do not merge or publish from
this PR; publication is a separate step owned by the primary.

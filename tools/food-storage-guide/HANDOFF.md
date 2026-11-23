# HANDOFF — Food Storage Guide （食物保存期限）

## Fixed source

- Spec id: `spec-food-storage-guide-20261121`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/404
- Spec registry rev: 1867
- Spec files used (from the spec author's checkout, spec PR #404 not yet
  merged into the production base, so the fixtures are vendored verbatim in
  `test/fixtures.json`): `docs/specs/food-storage-guide/` — BRIEF.md,
  SPEC.md (8 sections), fixtures.json (15 cases), AUTHOR-CHECK.md.
- Production base: `codex/initial-publication` @
  `8c2652671012498891e7f7afe02fdca3f154aa64`
- Production branch: `muse/food-storage-guide-production-20261121`
- Scope: only `tools/food-storage-guide/` was added. No registry or
  coordination commands were run by the builder, and no production
  registration was done (production does not use the registry, run-5 mode).

## What was built

A bilingual (zh-Hant default, en) static tool that looks up how long one of
30 pinned foods keeps in the pantry, fridge or freezer, from a start date,
and returns a safe-until date (conservative range minimum), a quality limit
(range maximum), days remaining, and a three-way status (fresh / use-soon /
expired). Data is the USDA FoodKeeper literal table from the SPEC (week =
7 days, month = 30 days, year = 365 days; ranges recorded as written).

- `public/js/core/core.mjs` — pure `run(input)`: strict own-data schema
  validation in the SPEC's pinned order (item → location → opened →
  startDate → todayDate → PKG packageDate → NR → empty; within a string
  field: INPUT_LIMIT → UNICODE → grammar), the 30-item table with
  opened-split cells, integer UTC calendar-day math, and
  `serializeReport()`: deterministic compact JSON (keys sorted by UTF-16
  code units, one trailing LF, UTF-8 no BOM, 2 MiB OUTPUT_LIMIT). Also
  exports `cellFor()` (used by the UI to show the package-date field only
  on the PKG path) and `localTodayDate()` (device-local date for an omitted
  todayDate, per SPEC).
- `public/js/core/controller.mjs` — DOM-free controller implementing the
  empty/dirty/busy/success/error/cancelled states, generation guard, and
  worker lifecycle; late results from superseded generations are dropped.
  `run(explicitInput)` accepts the app-derived worker input (see below).
- `public/js/worker-handler.mjs` + build embedding — at build time the core
  source and this fixed handler form one bundle string; `app.js` creates a
  module Worker from that string via a Blob URL. The worker is terminated
  after every settle, cancel, reset, edit, and pagehide; bfcache restore
  resets the tool.
- `public/js/app.js` — safe DOM wiring (textContent/value only), per-field
  errors with aria-describedby/aria-errormessage, focus to the first error
  field after a failed run, example loading (first fixture:
  ground-beef fridge, start 2026-11-20), the fixed download
  `food-storage-guide-report.json` (Blob URL revoked after 30 s or as soon
  as the result is invalidated), and the fixed bilingual safety reminder
  under the result. The package-date field appears only when the selected
  item + location resolves to PKG (milk in the fridge).
- `public/index.html`, `public/en/index.html` — full static pages with the
  SPEC-pinned titles, descriptions, safety reminder, and the three FAQs.
  Preview builds carry the robots noindex meta and no canonical/hreflang;
  home links are same-language relative links (`../../index.html` /
  `../../en/index.html`).
- `scripts/build.mjs` (deterministic preview build, 8 allowlisted files),
  `scripts/check.mjs`, `scripts/check-generated.mjs`, `scripts/serve.mjs`
  (loopback-only, traversal/symlink-safe, security headers).
- `test/` — 39 tests: the 15 literal SPEC fixtures (vendored verbatim),
  status-boundary (remaining 2 vs 3), PKG-path (missing / bad / past
  package date), packageDate ignored off the PKG path, opened splits and
  no-op toggles, unopened-only gaps (bread / white-rice / ketchup fridge,
  canned-soup freezer), DATE_RANGE years 1999/2101, INPUT_LIMIT,
  UNICODE lone surrogates, SCHEMA for unknown/missing/wrongly-typed
  fields and accessors, omitted-opened default, omitted-todayDate local
  date, pinned first-error ordering, controller state fixtures against a
  fake worker, report byte/SHA-256 tests, build reproducibility tests, and
  a loopback HTTP probe test.

## Interpretation decisions (SPEC ambiguities, recorded not hidden)

1. **todayDate empty vs omitted.** The SPEC's reset draft sets
   `todayDate: ""` while the field is described as defaulting to the
   device local date. Adopted: in the UI an empty today field means
   "use the device local date" — `app.js` omits an empty todayDate from
   the worker input, and the core then uses the device local date; the
   controller draft keeps `""` exactly as the SPEC fixture pins it.
   At the core API level an explicitly-passed empty-string todayDate is
   DATE_FORMAT (it is a provided value that fails the shape rule).
2. **packageDate empty on the PKG path.** An empty package-date value
   counts as missing → PACKAGE_DATE_REQUIRED (the UI shows this field
   only on the PKG path, so empty means not provided). The app omits an
   empty packageDate from the worker input, so the core sees it as
   absent.
3. **packageDate off the PKG path is ignored entirely** — including its
   length, surrogates, type and grammar — per "其餘情況忽略（不報錯）".
4. **Layout naming.** The SPEC's implementation sketch mentions
   `src/core.mjs`, `src/controller.mjs`, `src/app.mjs`; the delivered
   layout follows the house file contract in
   `docs/IMPLEMENTATION-CHECKLIST.md` (`public/js/core/*.mjs`,
   `public/js/app.js`, `scripts/`, `test/`), as directed for this
   production run. Every behavioural requirement from the SPEC (pure
   core, embedded fixed-source worker bundle, generation semantics,
   download rules, CSP) is implemented as specified; only directory
   names differ.
5. **Production build is intentionally refused** by `scripts/build.mjs`:
   the SPEC states the production origin is not configured, so no
   canonical, hreflang, or sitemap is emitted. Preview is the only
   candidate.

## Spec errata candidates

1. **todayDate "" ambiguity (see decision 1 above).** The SPEC pins the
   reset draft with `todayDate: ""` and separately says the field
   defaults to the device local date, without stating what an empty
   todayDate means at run time. The adopted reading (empty = omitted =
   local date in the UI; DATE_FORMAT for an explicitly-passed empty
   string at the core API) should be confirmed or corrected by the
   reviewer; no fixture covers the empty-todayDate case.
2. **No other errata found.** All 12 core fixture expectations reproduce
   exactly from the SPEC's stated rules and the pinned table (verified
   by the test suite, 39/39). The source conflict already recorded by
   the author (Cold Food Storage Chart cooked-meat freezer 2–6 months
   vs FoodKeeper #173 leftovers 2–3 months, resolved to FoodKeeper
   60–90 days) is not re-raised; no fixture touches it.

## Next owner

Independent (non-author) reviewer: verify the nine predeclared acceptance
aspects against this fixed candidate head. Real-browser checks (Chrome/Edge
two-language flows, keyboard, 200% zoom, Network/Storage isolation) remain
NOT_RUN — see VERIFICATION.md.

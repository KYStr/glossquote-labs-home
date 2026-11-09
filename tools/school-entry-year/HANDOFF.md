# Handoff: School Entry Year Calculator

Status: production candidate only. Not accepted, not published, and
not a deployment approval.

## Fixed specification source

- Spec task: `labs-school-entry-year-spec-20261109`
- Spec ID: `spec-school-entry-year-20261109`
- Spec source commit: `5719e8694bcb005721557ec5fb62ce5b0ef1acef`
  (draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/165)
- Tool slug: `school-entry-year`

The spec PR is not merged into this branch's base, so the spec's
`fixtures.json` is vendored verbatim at `test/fixtures.json`
(byte-identical to the spec candidate's file, SHA-256
`400549acc72cc9617f89e43d610cb65eb6e83f2d9523a4c42c56dce9f31f5241`)
and `scripts/check.mjs` reads the vendored copy.

## Base and branch

- Base: `codex/initial-publication` @
  `c08e3243f0257f80fa512d15b1c37fcbeb6ef962` (fetched fresh for this
  build)
- Branch: `muse/school-entry-year-production-20261109`
- Mode: build-first production candidate built ahead of registry
  submission by the coordinating agent; this handoff records the
  fixed spec source above. Independent nine-aspect review of the
  fixed candidate is still required before any acceptance.

## What was built (all under `tools/school-entry-year/`)

- Pure core `public/js/core/school-entry.mjs` implementing the SPEC
  exactly: integer (year, month, day) arithmetic only (no clock
  participation of any kind), the (9,1) cohort cutoff, observed
  Feb-29 sixth birthday on Mar 1 in non-leap years, full-months age
  at entry (always 6 years plus 0–11 months), ROC = CE − 1911,
  kindergarten entry years E−4…E−1 with the pinned bands, the pinned
  stage table for the as-of school year (including `notEnrolled` and
  `graduated`), the fixed twelve-row projection with Sep 1 – Aug 31
  spans, the pinned validation order
  (SCHEMA → per-field INPUT_LIMIT → UNICODE → EMPTY → DATE_FORMAT →
  DATE_INVALID → RANGE → DATE_ORDER) with `{code, field, row: null}`
  errors, and the fixed report (`school-entry-year-report.json`,
  hand-written recursive UTF-16 code-unit key sort, one trailing LF,
  2 MiB OUTPUT_LIMIT).
- Controller `public/js/controller.mjs`: the pinned state machine
  (empty/dirty/busy/success/error/cancelled) with monotonically
  increasing generations, a dirty-epoch guard so an edit during busy
  makes the in-flight result stale, synchronous cancel with
  terminated worker, late-result rejection by generation, and the
  pinned public surface `state`, `reportAvailable`, `draft`, `error`.
- Worker transport: `public/js/worker-handler.mjs`; the preview
  build embeds core + handler verbatim as `js/worker-source.js`
  (WORKER_SOURCE) and the page creates a module Blob Worker.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` with the SPEC-pinned titles, descriptions,
  H1s, FAQ answers, draft-loss note, the fixed results note printed
  in both languages under the results, and the results layout in the
  pinned order (entry summary → current status → kindergarten table
  → twelve-year projection in a labelled scroll region → download).
  「使用今天 / Use today」 fills the as-of field with the Asia/Taipei
  calendar date as a plain draft edit; 「載入範例 / Load example」
  loads fixtures case 1 and waits for a manual run.
- Design: the house Gloss Tools tokens from `docs/DESIGN-BASELINE.md`
  (paper/ink, Instrument Sans + IBM Plex Mono), shared with sibling
  tools.
- `scripts/build.mjs` (deterministic preview build + manifest),
  `scripts/check.mjs`, `scripts/check-generated.mjs`,
  `scripts/serve.mjs` (loopback-only preview with the SPEC-pinned CSP
  and security headers).
- Tests: `test/core.test.mjs` (all 13 literal core fixtures by full
  deep equal, plus hand-derived SPEC-rule cases: range endpoints,
  leap-rule edges, validation order pins, school-year boundary,
  Feb-29 observed birthday, age-months boundaries, and a property
  sweep), `test/controller.test.mjs` (the 3 literal controller
  fixtures plus generation/cancel/error unit tests),
  `test/report.test.mjs` (byte-exact report against an independently
  derived literal), `test/site.test.mjs`.

## Interpretations and deviations

- The SPEC candidate contract wins over the generic template: the
  pages carry `noindex, nofollow` and no canonical/hreflang links
  and no sitemap entry, exactly as the SPEC's PublicSurface and
  candidate rules pin. Production metadata must only be added after
  the SPEC's production-parity gates pass; the build refuses
  production mode (no approved origin).
- The SPEC's Inputs section sketches a `src/` module layout; the
  implementation follows the repo handbook layout instead
  (`public/js/core/*.mjs`), which the SPEC's own "Relationship to
  the repository" section defers to.
- The two date inputs are text inputs (the house pattern for
  SPEC-pinned string grammars): the SPEC validates the raw string
  grammar itself, and a native date control would hide the raw
  string the SPEC's INPUT_LIMIT/UNICODE/DATE_FORMAT checks operate
  on.
- The SPEC pins the core contract as a synchronous `run`; the Worker
  exists only as the page transport (the candidate architecture the
  handbook pins) and adds no semantics — the controller fixtures'
  `deliver` steps exercise exactly that boundary.
- The SPEC's AUTHOR-CHECK records that the Sep 1 – Aug 31 school
  year follows the fixed task brief rather than the Ministry's
  Aug 1 convention; the implementation follows the SPEC as written
  and surfaces the pinned results note on both pages.
- No fixture-vs-rule conflicts were found: an independent
  reimplementation of the SPEC's rules reproduced all eight success
  fixtures exactly before this implementation was written, and the
  literal fixtures pass unchanged here. No spec-errata candidates.

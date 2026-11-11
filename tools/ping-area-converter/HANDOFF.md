# Handoff: Ping Area Converter

Status: production candidate only. Not accepted, not published, and
not a deployment approval.

## Fixed specification source

- Spec ID: `spec-ping-area-converter-20261109`
- Spec source commit: `6d7cc4cd18a273b0d386b19b85b883573d097cba`
  (draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/227)
- Tool slug: `ping-area-converter`

The spec PR is not merged into this branch's base, so the spec's
`fixtures.json` is vendored verbatim at `test/fixtures.json`
(byte-identical to the spec candidate's file, SHA-256
`9181883367eee444ef119af360a13a0c13c746966a668e6c15bc59e74508b550`)
and `scripts/check.mjs` verifies that hash and reads the vendored
copy.

## Base and branch

- Base: `codex/initial-publication` @
  `db4b1f43f318635fcab0132832940adf97f5140a` (fetched fresh for this
  build)
- Branch: `muse/ping-area-converter-production-20261109`
- Mode: build-first production candidate built ahead of independent
  review by the coordinating agent; this handoff records the fixed
  spec source above. Independent nine-aspect review of the fixed
  candidate is still required before any acceptance.

## What was built (all under `tools/ping-area-converter/`)

- Pure core `public/js/core/ping-area.mjs` implementing the SPEC
  exactly: exact rational arithmetic on BigInt numerator/denominator
  pairs with the pinned constants (1 ping = 400/121 m², 1 ft² =
  145161/1562500 m², 1 tatami = 81/50 m² as the labelled advertising
  convention), the amount string split into an integer over 10^k
  without binary-float parsing, each output derived from the exact
  square-metre value and rounded exactly once, round-half-up, in
  integer arithmetic (`floor((2·n·10^dp + d) / (2d))`; ping/m²/ft²
  at 2 places, tatami at 1), the pinned validation order (SCHEMA →
  per-field INPUT_LIMIT → UNICODE → EMPTY → DECIMAL_FORMAT/RANGE
  for amount, ENUM for unit; amount fully before unit) with
  `{code, field, row: null}` errors, `buildQuickTable()` for the
  fixed 1–100 ping table, `formatValue()` for the zero-padded
  fixed-decimal display, and the fixed report
  (`ping-area-report.json`, content `{input, result}`, hand-written
  recursive UTF-16 code-unit key sort, numbers in shortest
  round-trip form, one trailing LF, 2 MiB OUTPUT_LIMIT).
- Controller `public/js/controller.mjs`: the pinned state machine
  (empty/dirty/busy/success/error/cancelled) with monotonically
  increasing generations, worker termination on edit/cancel/reset,
  late-result rejection by generation, and the pinned public
  surface `state`, `reportAvailable`, `draft`, `error`.
- Worker transport: `public/js/worker-handler.mjs`; the preview
  build embeds core + handler verbatim as `js/worker-source.js`
  (WORKER_SOURCE) and the page creates a module Blob Worker.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` with the SPEC-pinned titles, descriptions,
  H1s and both FAQ question/answer pairs verbatim, the draft-loss
  note, the amount/unit form (unit as a select whose option values
  are the SPEC codes in the pinned order, the tatami option
  carrying the full approximate-convention label), the four-row
  result region (the tatami row carrying the same label), the fixed
  quick table in a labelled scrollable region, and a one-layer
  disclosure with the exact constants and regional tatami sizes.
- Design: the house Gloss Tools tokens shared with sibling tools
  (paper/ink palette, spacing, focus ring, 44px controls).
- `scripts/build.mjs` (deterministic preview build + manifest),
  `scripts/check.mjs`, `scripts/check-generated.mjs`,
  `scripts/serve.mjs` (loopback-only preview with the SPEC-pinned
  CSP and security headers).
- Tests: `test/core.test.mjs` (all 23 literal core fixtures by full
  deep equal, the 100-row table fixture literally, an independent
  recomputation of every success value and table row through a
  truncated decimal expansion rounded from the digit string — a
  different mechanism from the implementation's scaled-integer
  formula — grammar/capacity/order pins, SCHEMA variants including
  an accessor that must never be invoked, and display formatting),
  `test/controller.test.mjs` (the 3 literal controller fixtures
  plus generation/cancel/error unit tests), `test/report.test.mjs`
  (byte-exact report against the SPEC-pinned 99-byte literal and
  its SHA-256), `test/site.test.mjs`.

## Interpretations and deviations

- The SPEC candidate contract wins over the generic template: the
  pages carry `noindex, nofollow` and no canonical/hreflang links
  and no sitemap entry, exactly as the SPEC's candidate rules pin.
  Production metadata must only be added after the SPEC's
  production-parity gates pass; the build refuses production mode
  (no approved origin).
- The SPEC's implementation section sketches a `src/` module
  layout; the implementation follows the repo handbook layout
  instead (`public/js/core/*.mjs`, `public/js/app.js`,
  `public/js/controller.mjs`), as the assigned implementation
  contract directs.
- The unit field is a native select (the SPEC's userFlow describes
  it as an option list); its values are exactly the SPEC codes.
  The core still enforces the full raw-string pipeline
  (INPUT_LIMIT/UNICODE/EMPTY/ENUM) for any value it is handed, and
  the hostile unit values are exercised directly through `run()` in
  the tests, since a select cannot produce them.
- The SPEC's report content is `{input, result}`, so
  `buildReport(input, result)` takes the success snapshot's raw
  input strings alongside the result; the app passes the
  controller's current draft, which equals the run snapshot
  whenever the state is success (any edit invalidates success).
- The SPEC's implementation section mentions discarding late
  `File.arrayBuffer` arrivals; this tool has no file input, so that
  clause has no surface here. The generation guard covers the late
  Worker replies, which are this tool's only async arrivals.
- No fixture-vs-rule conflicts were found: the SPEC's rules were
  re-derived independently before and during implementation (a
  Python `fractions` recomputation of all 10 success fixtures and
  all 100 table rows, plus the in-test decimal-expansion
  cross-check) and every literal fixture agrees with the normative
  rules as written.

## Spec-errata candidates

None. All 23 literal core cases, the 100-row quick table, both
half-up tie cases (0.605 → 0.61, 1.05 → 1.1), and the SPEC-pinned
report bytes (99 bytes, SHA-256
`2363e57e7570dae35a9830eaa3d86b003ca73be825cabeebd297d24f3f14dc20`)
reproduce exactly from the SPEC's normative rules as written.

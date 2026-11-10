# Verification: Ping Area Converter

Candidate state: production candidate only. Nothing in this file is
an acceptance, a merge, or a deployment approval; the independent
nine-aspect review has not run (NOT_RUN, see below).

## Fixture provenance

- `test/fixtures.json` is a byte-identical copy of the fixed spec
  fixtures (spec `spec-ping-area-converter-20261109`, spec
  candidate commit `6d7cc4cd18a273b0d386b19b85b883573d097cba`,
  draft spec PR
  https://github.com/KYStr/glossquote-labs-home/pull/227): SHA-256
  `9181883367eee444ef119af360a13a0c13c746966a668e6c15bc59e74508b550`,
  verified against the spec worktree copy before implementation
  and re-verified by `scripts/check.mjs` on every check run.
- The expected values in the tests were not taken from the
  implementation: before implementation, all 10 success core
  fixtures and all 100 quick-table rows were recomputed with an
  independent Python `fractions.Fraction` implementation of the
  SPEC's constants and half-up rule and matched the fixtures
  exactly; the in-test cross-check recomputes them again through a
  truncated decimal expansion by long division, rounded from the
  digit string — a different mechanism from the implementation's
  scaled-integer rounding formula; and the report literal in
  `test/report.test.mjs` is the SPEC's own pinned bytes (99 bytes,
  SHA-256
  `2363e57e7570dae35a9830eaa3d86b003ca73be825cabeebd297d24f3f14dc20`),
  re-verified by hashing the literal in the test.
- That independent re-derivation found no spec-internal conflicts:
  every literal fixture, including both exact half-up ties
  (0.605 → 0.61 and 1.05 → 1.1), follows from the normative rules
  as written. See HANDOFF.md, "Spec-errata candidates": none.

## Commands run

All commands run in `tools/ping-area-converter/` on Node v24.22.1:

- `npm test` — **59/59 tests pass, 0 fail**. Coverage: all 23
  literal core fixtures by full deep equal; the 100-row quick
  table asserted literally; independent decimal-expansion
  recomputation of every success fixture and every table row;
  grammar edges (trailing dot, leading dot, signs, exponent,
  spaces, grouping, fullwidth digits), capacity-before-Unicode-
  before-grammar order pins, unit capacity/Unicode/ENUM pins
  (case-sensitive), field-order pins, inclusive range bound judged
  on the exact value, SCHEMA variants including an accessor that
  must never be invoked; all 3 literal controller fixtures driven
  in the SPEC's prescribed order plus generation/worker-
  replacement/error unit tests; the report byte-exact against the
  SPEC-pinned 99-byte literal with its SHA-256, a second literal
  report for a decimal input, and non-plain report inputs refused
  without invoking accessors or toJSON; both pages' pinned
  metadata, FAQ answers, tatami labels, quick-table heading, and
  control ids; unit option order.
- `npm run check` — passed (required files, package contract,
  vendored-fixtures hash, core fields/defaults/units/capacities/
  example-vs-fixtures, bilingual page contract, syntax of every
  shipped script, worker concatenation, forbidden-capability scan,
  core purity: no DOM and no clock references in the pure modules).
- `npm run build:preview` run **twice** — the two `dist-preview/`
  trees (9 files) and the two `BUILD-MANIFEST.json` files are
  **byte-identical** (recursive diff of every file).
- `npm run check:generated:preview` — passed (manifest hashes
  exact, bilingual metadata present, embedded worker source
  byte-equal to the fixed core + handler sources, deny-all
  robots.txt).
- Loopback HTTP probe of the built preview (`scripts/serve.mjs` on
  port 4199): `GET /` → 200 with title 「坪數換算｜Gloss Tools」,
  `GET /en/` → 200 with title "Ping Area Converter | Gloss Tools",
  a missing path → 404, a `../` traversal attempt → 404, and the
  responses carry the SPEC-pinned CSP,
  `X-Content-Type-Options: nosniff`, and `X-Robots-Tag: noindex,
  nofollow` on HTML.

## NOT_RUN

- Real-browser evidence (rendering, Worker execution in a browser,
  Blob download behaviour, focus movement) — not executed in this
  environment.
- Real-device checks (mobile layout, touch targets) — not executed.
- Browser Network/Storage audit — not executed.
- Production build and production origin — not applicable: the
  SPEC pins the planned origin as not configured, the build
  refuses production mode, and the candidate carries noindex and
  no canonical/hreflang by design.
- Independent nine-aspect review — not run; required before any
  acceptance.

## Spec-errata candidates

None. See HANDOFF.md, "Spec-errata candidates".

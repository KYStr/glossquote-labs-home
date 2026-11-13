# Verification: Age Calculator

> Historical author record for the original build. Results below apply to that fixed build. See [repair verification](REPAIR-VERIFICATION.md) for this tool’s maintenance checks.

Candidate state: production candidate only. Nothing in this file is
an acceptance, a merge, or a deployment approval; the independent
nine-aspect review has not run (NOT_RUN, see below).

## Fixture provenance

- `test/fixtures.json` is a byte-identical copy of the fixed spec
  fixtures (spec `spec-age-calculator-20261109`, spec candidate
  commit `249be6c1a19368b7de4bee8f75016307ef825552`, draft spec PR
  https://github.com/KYStr/glossquote-labs-home/pull/221): SHA-256
  `19451dc10db3bafbd4bfd9c3f6f562057a30b84970a14150dc091315107e8e06`,
  verified against the spec worktree copy before implementation and
  re-verified by `scripts/check.mjs` on every check run.
- The expected values in the tests were not taken from the
  implementation: total days are cross-checked against an
  independent days-from-civil ordinal (a different formula from the
  SPEC's JDN), the endpoint and weekday cases are hand-derived from
  known calendar facts (1900-01-01 Monday, 2000-01-01 Saturday,
  2024-02-29 Thursday, 2100-01-01 Friday), and the report literal in
  `test/report.test.mjs` was produced by a separate canonicalizer
  (Python json, sorted keys) applying the SPEC's rule to the literal
  fixture result.
- That independent re-derivation surfaced one spec-internal conflict
  outside the fixtures (single-borrow procedure vs the SPEC's own
  non-negativity invariants for a 31st-day birth borrowing from a
  short February); it is recorded as a spec-errata candidate in
  HANDOFF.md together with the resolution implemented here.

## Commands run

All commands run in `tools/age-calculator/` on Node v24.22.1:

- `npm test` — **50/50 tests pass, 0 fail**. Coverage: all 14
  literal core fixtures by full deep equal; all 3 literal controller
  fixtures driven in the SPEC's prescribed order plus
  generation/worker-replacement/error unit tests; hand-derived
  SPEC-rule cases (both range endpoints accepted, the next birthday
  landing in 2101, one day outside the range in each field, the
  1900/2000 century leap-rule edges, DATE_FORMAT / INPUT_LIMIT /
  UNICODE / EMPTY order pins including limit-before-format and
  field-order-before-cross-field, SCHEMA variants including an
  accessor that must never be invoked, weekday spot checks, the
  short-February second-borrow edge, a borrow/birthday invariant
  sweep over 60 birth/reference pairs, and a timezone sweep
  rerunning every core fixture in fresh processes under UTC,
  Asia/Taipei, America/New_York, and Pacific/Kiritimati with
  byte-identical output); the report byte-exact against the
  independently derived 235-byte literal; both pages' pinned
  metadata, FAQ answers, disclaimer, and control ids.
- `npm run check` — passed (required files, package contract,
  vendored-fixtures hash, core fields/defaults/range/example-vs-
  fixtures, bilingual page contract, syntax of every shipped script,
  worker concatenation, forbidden-capability scan, core purity: no
  DOM and no clock references in the pure modules).
- `npm run build:preview` run **twice** — the two `dist-preview/`
  trees (9 files) and the two `BUILD-MANIFEST.json` files are
  **byte-identical** (recursive diff of every file).
- `npm run check:generated:preview` — passed (manifest hashes exact,
  bilingual metadata present, embedded worker source byte-equal to
  the fixed core + handler sources, deny-all robots.txt).
- Loopback HTTP probe of the built preview (`scripts/serve.mjs` on
  port 4199): `GET /` → 200 with title 「年齡計算機｜Gloss Tools」,
  `GET /en/` → 200 with title "Age Calculator | Gloss Tools", a
  missing path → 404, a `../` traversal attempt → 404, and the
  responses carry the SPEC-pinned CSP,
  `X-Content-Type-Options: nosniff`, and `X-Robots-Tag: noindex,
  nofollow` on HTML.

## NOT_RUN

- Real-browser evidence (rendering, Worker execution in a browser,
  Blob download behaviour, focus movement) — not executed in this
  environment.
- Real-device checks (mobile layout, touch targets) — not executed.
- Browser Network/Storage audit — not executed.
- Production build and production origin — not applicable: the SPEC
  pins the planned origin as not configured, the build refuses
  production mode, and the candidate carries noindex and no
  canonical/hreflang by design.
- Independent nine-aspect review — not run; required before any
  acceptance.

## Spec-errata candidates

One: the SPEC derivation's single day borrow contradicts its own
result invariants for a 31st-day birth whose first borrowed month is
a short February (reference day 1–2). Implemented resolution:
repeat the borrow, stepping one month further back, until the day
count is non-negative; all literal fixtures are unaffected. Full
record in HANDOFF.md, "Spec-errata candidates".

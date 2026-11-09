# Verification: School Entry Year Calculator

Candidate state: production candidate only. Nothing in this file is
an acceptance, a merge, or a deployment approval; the independent
nine-aspect review has not run (NOT_RUN, see below).

## Fixture provenance

- `test/fixtures.json` is a byte-identical copy of the fixed spec
  fixtures (spec `spec-school-entry-year-20261109`, spec candidate
  commit `5719e8694bcb005721557ec5fb62ce5b0ef1acef`, draft spec PR
  https://github.com/KYStr/glossquote-labs-home/pull/165): SHA-256
  `400549acc72cc9617f89e43d610cb65eb6e83f2d9523a4c42c56dce9f31f5241`,
  verified against the spec worktree copy before implementation.
- Before implementation, the SPEC's rules were reimplemented
  independently (a throwaway script, not this codebase) and all
  eight success core fixtures were reproduced exactly (0 mismatches
  across entry, kindergarten, current, and the full twelve-row
  projection). No fixture-vs-rule conflicts exist.
- The report literal in `test/report.test.mjs` was produced by that
  same independent path (a separate canonical JSON serializer
  applying the SPEC's key-order rule to the literal fixture result),
  not by the implementation under test.

## Commands run

All commands run in `tools/school-entry-year/` on Node ≥ 24:

- `npm test` — **48/48 tests pass, 0 fail**. Coverage: all 13
  literal core fixtures by full deep equal; hand-derived SPEC-rule
  cases (range endpoints 1912-01-01 / 2199-12-31 accepted, one day
  outside is RANGE in the offending field, the 2000/2100 leap-rule
  edges, DATE_FORMAT/INPUT_LIMIT/UNICODE/EMPTY order pins, SCHEMA
  variants including an accessor that must never be invoked, the
  Aug 31 / Sep 1 school-year boundary, the Feb-29 observed sixth
  birthday, age-months boundaries, and a twelve-birth-date property
  sweep); all 3 literal controller fixtures driven in the SPEC's
  prescribed order plus generation/worker-replacement/error unit
  tests; the report byte-exact against the independently derived
  3,423-byte literal; both pages' pinned metadata, note, FAQs, and
  control ids.
- `npm run check` — passed (required files, package contract, core
  fields/defaults/date range/example-vs-fixtures, bilingual page
  contract, syntax of every shipped script, worker concatenation,
  forbidden-capability scan, core purity: no DOM and no clock
  references in the pure modules).
- `npm run build:preview` run **twice** — the two `dist-preview/`
  trees (9 files) and the two `BUILD-MANIFEST.json` files are
  **byte-identical** (SHA-256 comparison of every file).
- `npm run check:generated:preview` — passed (manifest hashes exact,
  bilingual metadata present, embedded worker source byte-equal to
  the fixed core + handler sources, deny-all robots.txt).
- Loopback HTTP probe of the built preview (`scripts/serve.mjs` on
  an ephemeral port): `GET /` → 200 with title
  「入學年度與年級推算｜Gloss Tools」, `GET /en/` → 200 with title
  "School Entry Year Calculator | Gloss Tools", a missing path →
  404, a `../` traversal attempt → 404, and the responses carry the
  SPEC-pinned CSP and `X-Content-Type-Options: nosniff`.

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

None. All thirteen core fixtures and all three controller fixtures
agree with the SPEC's stated rules as written.

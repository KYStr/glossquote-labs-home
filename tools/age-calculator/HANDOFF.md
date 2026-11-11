# Handoff: Age Calculator

Status: production candidate only. Not accepted, not published, and
not a deployment approval.

## Fixed specification source

- Spec ID: `spec-age-calculator-20261109`
- Spec source commit: `249be6c1a19368b7de4bee8f75016307ef825552`
  (draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/221)
- Tool slug: `age-calculator`

The spec PR is not merged into this branch's base, so the spec's
`fixtures.json` is vendored verbatim at `test/fixtures.json`
(byte-identical to the spec candidate's file, SHA-256
`19451dc10db3bafbd4bfd9c3f6f562057a30b84970a14150dc091315107e8e06`)
and `scripts/check.mjs` verifies that hash and reads the vendored
copy.

## Base and branch

- Base: `codex/initial-publication` @
  `328dee40ef0de631d7d50a443e5d5eb2e7668164` (fetched fresh for this
  build)
- Branch: `muse/age-calculator-production-20261109`
- Mode: build-first production candidate built ahead of independent
  review by the coordinating agent; this handoff records the fixed
  spec source above. Independent nine-aspect review of the fixed
  candidate is still required before any acceptance.

## What was built (all under `tools/age-calculator/`)

- Pure core `public/js/core/age.mjs` implementing the SPEC exactly:
  integer-only arithmetic on the Fliegel & Van Flandern Julian day
  number formula (no host clock, timezone, or calendar-object access
  of any kind), the pinned borrow convention for years/months/days
  (days borrow the full length of the month before the reference
  month; months borrow twelve from the years), the weekday index
  `(JDN + 1) mod 7` with the pinned zh/en name tables, the observed
  birthday rule (February 29 births observe March 1 in non-leap
  years), the next birthday as the first observed birthday on or
  after the reference day (its year may be 2101, outside the input
  range), the pinned validation order (SCHEMA → per-field
  INPUT_LIMIT → UNICODE → EMPTY → DATE_FORMAT → INVALID_DATE →
  RANGE → cross-field DATE_ORDER on `referenceDate`) with
  `{code, field, row: null}` errors, and the fixed report
  (`age-report.json`, hand-written recursive UTF-16 code-unit key
  sort, one trailing LF, 2 MiB OUTPUT_LIMIT).
- Controller `public/js/controller.mjs`: the pinned state machine
  (empty/dirty/busy/success/error/cancelled) with monotonically
  increasing generations, worker termination on edit/cancel/reset,
  late-result rejection by generation, and the pinned public surface
  `state`, `reportAvailable`, `draft`, `error`.
- Worker transport: `public/js/worker-handler.mjs`; the preview
  build embeds core + handler verbatim as `js/worker-source.js`
  (WORKER_SOURCE) and the page creates a module Blob Worker.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` with the SPEC-pinned titles, descriptions,
  H1s and all three FAQ question/answer pairs verbatim, the
  draft-loss note, a bilingual disclaimer (calendar-rule calculation
  only, no legal eligibility determination — the SPEC's declared
  non-goal), and the results layout in the pinned order (age summary
  with total days → weekday of birth → next birthday with countdown
  and turning age, with the 🎂「今天生日 / Birthday today」marker on
  an observed birthday → download). The app layer prefills the
  reference field with the device's local today on load and after
  reset, and 「使用今天 / Use today」 refills it — both are plain
  draft edits that invalidate any old result and never run the
  calculation; the core only ever receives explicit strings.
- Design: the house Gloss Tools tokens shared with sibling tools
  (paper/ink palette, spacing, focus ring, 44px controls).
- `scripts/build.mjs` (deterministic preview build + manifest),
  `scripts/check.mjs`, `scripts/check-generated.mjs`,
  `scripts/serve.mjs` (loopback-only preview with the SPEC-pinned CSP
  and security headers).
- Tests: `test/core.test.mjs` (all 14 literal core fixtures by full
  deep equal, plus hand-derived SPEC-rule cases: both range
  endpoints, the next birthday landing in 2101, one day outside the
  range in each field, the 1900/2000 century leap-rule edges,
  validation-order pins, weekday spot checks against known calendar
  facts, a borrow/birthday invariant sweep cross-checked against an
  independent days-from-civil ordinal, and a timezone sweep rerunning
  every core fixture in fresh processes under four TZ values),
  `test/controller.test.mjs` (the 3 literal controller fixtures plus
  generation/cancel/error unit tests), `test/report.test.mjs`
  (byte-exact report against an independently derived literal),
  `test/site.test.mjs`.

## Interpretations and deviations

- The SPEC candidate contract wins over the generic template: the
  pages carry `noindex, nofollow` and no canonical/hreflang links
  and no sitemap entry, exactly as the SPEC's candidate rules pin.
  Production metadata must only be added after the SPEC's
  production-parity gates pass; the build refuses production mode
  (no approved origin).
- The SPEC's implementation section sketches a `src/` module layout;
  the implementation follows the repo handbook layout instead
  (`public/js/core/*.mjs`, `public/js/app.js`,
  `public/js/controller.mjs`), as the assigned implementation
  contract directs.
- The two inputs are text inputs (the house pattern for SPEC-pinned
  string grammars): the SPEC validates the raw string grammar
  itself, and a native date control would hide the raw string the
  SPEC's INPUT_LIMIT/UNICODE/DATE_FORMAT checks operate on.
- The SPEC pins the core contract as a synchronous `run`; the Worker
  exists only as the page transport (the candidate architecture the
  handbook pins) and adds no semantics — the controller fixtures
  exercise exactly that boundary.
- The SPEC says the app layer prefills the reference field with the
  device's local today; the sibling school-entry tool fills its
  as-of field with the Asia/Taipei day instead. This tool follows
  its own SPEC: the device's local calendar day, computed in the app
  layer only, after load and after reset (the controller itself
  still resets to the pinned `{"birthDate":"","referenceDate":""}`
  defaults, as the literal controller fixture requires).
- No fixture-vs-rule conflicts were found: the SPEC's rules were
  re-derived independently while writing the tests (an independent
  days-from-civil ordinal, hand-computed endpoint and weekday cases)
  and all 14 literal core fixtures agree with the normative rules as
  written. One spec-internal conflict outside the fixtures was found
  (below).

## Spec-errata candidates

1. **Single-borrow procedure vs the SPEC's own result invariants**
   (SPEC inputsOutputs, derivation step 2 and its stated invariants).
   The derivation describes exactly one day borrow, then states the
   invariants `ageYears ≥ 0`, `0 ≤ ageMonths ≤ 11`, `0 ≤ ageDays`,
   `ageDays` below the borrowed month's length, and the result
   contract requires every count to be a non-negative integer. For a
   birth on the 31st whose first borrowed month is a short February
   with reference day 1 or 2 — e.g. born 2000-01-31, reference
   2023-03-01 — one borrow of February's 28 days leaves
   `ageDays = 1 − 31 + 28 = −2`, violating the invariants and the
   non-negativity contract. No literal fixture covers this family.
   Resolution taken here: the borrow repeats, stepping one month
   further back per borrow, until the day count is non-negative (at
   most two borrows are ever needed; the case above yields
   23y 0m 29d, consistent with the total-days ordinal). This is the
   minimal extension that satisfies every other pinned statement —
   all 14 literal fixtures still resolve in exactly one borrow and
   pass unchanged, and the invariant `ageDays` below the (final)
   borrowed month's length holds. The alternative month-stepping
   clamp convention would give a different split (1 month 1 day for
   the January-31 family, as the SPEC's AUTHOR-CHECK notes for other
   cases) and was not adopted: the SPEC pins the borrow family. The
   spec author should either pin the repeated borrow or explicitly
   pin a different resolution for this family in a revision.

## 2026-11-10 maintenance

The maintained specification and both language pages describe repeated backward borrowing. Four new literal fixtures cover short-February cases. The age calculation is unchanged. See [repair verification](REPAIR-VERIFICATION.md).

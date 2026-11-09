# Handoff — Overtime Pay Calculator （加班費計算機）

## Fixed spec source

- Spec task: `labs-overtime-pay-calculator-spec-20261109`
- Spec id: `spec-overtime-pay-calculator-20261109`
- Spec candidate commit: `eb7950f87f826a1758d430e7ba7c822d44dc64f8`
  (BRIEF.md / SPEC.md / fixtures.json / AUTHOR-CHECK.md under
  `docs/specs/overtime-pay-calculator/`)
- Draft spec PR: https://github.com/KYStr/glossquote-labs-home/pull/138
- The spec PR is not merged into this production branch's base, so the
  literal fixtures are vendored verbatim at `test/fixtures.json`
  (byte-identical to the spec candidate's fixtures.json, SHA-256
  `67064390d8849d7d8a4a4a214e6d0db9f7082055b6d257a524646f6c2bc19b75`).
  Tests import the vendored copy; `scripts/check.mjs` pins its specId and
  case 1 so drift is caught.

## Production candidate

- Base: `codex/initial-publication` @ `9e6abd357f29f5f914cc5252023f3d7b2fbee4ef`
- Branch: `muse/overtime-pay-calculator-production-20261109`
- Scope: only `tools/overtime-pay-calculator/` was added. No registry or
  coordination commands were run by the builder.
- Build-first mode: this candidate is not accepted, published, or
  deployed. Independent review of the same fixed head is the next step.

## What was built

- `public/js/core/overtime.mjs` — pure core: strict string-field
  validation in the SPEC's fixed order (SCHEMA → per-field INPUT_LIMIT →
  EMPTY → INTEGER_FORMAT / DECIMAL_FORMAT → HOURS_STEP → RANGE), exact
  BigInt rational pay math (band numerator over 1440; per-category
  round-half-up to whole NT$; total = sum of the three rounded
  subtotals), display-only 2-decimal hourly/daily rates, canonical report
  serializer with the 2,097,152-byte OUTPUT_LIMIT.
- Legal rules as pinned by the SPEC (current law): weekday overtime
  4/3 then 5/3; rest-day work by actual hours (4/3, 5/3, then 8/3 from
  hour 9 — the pre-2018 deemed-hours table is NOT used); holiday work
  earns one extra day's wage for any attendance up to 8 hours, hours
  beyond 8 at the weekday tiers; countedOtHours = weekday + rest-day +
  holiday hours beyond 8; capNote when counted > 46.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) with a controllable Worker
  boundary; late replies from stale generations are dropped.
- `public/js/worker-handler.mjs` + build-embedded `worker-source.js` —
  the page runs the same `run` the tests import, inside a module Worker
  created from a Blob URL of the fixed source bytes.
- `public/js/app.js` — safe DOM wiring (textContent/value only), field
  errors with aria-errormessage, focus to the first error field after a
  failed submit, fixed-name report download created only on explicit
  click and revoked within 30 s or on invalidation.
- Bilingual static pages (`public/index.html` zh-Hant,
  `public/en/index.html` en) with the SPEC-pinned titles, descriptions,
  FAQ answers, and disclaimer; preview noindex; no canonical/hreflang;
  same-language home links; paper/ink design-baseline tokens; wide
  two-column layout, single column under 48rem.
- `scripts/` — reproducible preview build (byte-identical across runs,
  BUILD-MANIFEST.json with per-file SHA-256), static check,
  generated-output check, loopback-only serve with the SPEC's CSP and
  security headers.

## Deviations from the SPEC

- None in product behavior. The fixtures file is vendored into `test/`
  (see above) because the spec PR is unmerged; content is byte-identical.

## Spec-errata candidates (for the spec author / reviewer)

1. **capNote 46-hour boundary is unreachable under the pinned field
   caps.** The SPEC pins weekdayOtHours ≤ 4, restDayHours ≤ 12,
   holidayHours ≤ 12, so countedOtHours = weekday + rest-day + holiday
   hours beyond 8 can be at most 4 + 12 + 4 = 20 — never 46 or 46.5.
   Yet SPEC §tests asks to verify countedOtHours exactly 46 (capNote
   false) versus 46.5 (capNote true), and §userFlow presents the cap
   note as reachable. The implementation follows the pinned ranges,
   formula, and threshold exactly (the note simply cannot trigger
   through valid input, and the reachable maximum is covered by a
   test). The spec author should either raise the field caps (the
   fields are monthly aggregates) or correct §tests/§userFlow.
2. **§implementation names `src/core.mjs`-style paths** while the
   handbook file contract (docs/IMPLEMENTATION-CHECKLIST.md) places the
   pure core at `public/js/core/*.mjs`. The handbook layout was
   followed, as in the rest of this batch; no behavior differs.

## Next owner

- Independent reviewer: verify this fixed candidate head against the
  SPEC's nine acceptance aspects (all currently NOT_RUN — see
  VERIFICATION.md), recomputing the money fixtures from the pinned
  fractions rather than trusting displayed digits.

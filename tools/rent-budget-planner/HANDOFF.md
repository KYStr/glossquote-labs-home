# Rent Budget Planner — HANDOFF

## Fixed spec source

- Spec task: `labs-rent-budget-planner-spec-20261109`
- Spec id: `spec-rent-budget-planner-20261109`
- Spec candidate commit: `2b83a326544418542bb0223b58f2cc86701a49dd`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/139
- Spec files (fixed at that commit): `docs/specs/rent-budget-planner/BRIEF.md`, `SPEC.md`, `fixtures.json`, `AUTHOR-CHECK.md`
- Production base: `codex/initial-publication` @ `9e6abd357f29f5f914cc5252023f3d7b2fbee4ef`
- Production branch: `muse/rent-budget-planner-production-20261109`
- Allowed scope (only paths touched): `tools/rent-budget-planner/`
- Build-first mode: this candidate is NOT registry-claimed, accepted or published; it awaits independent review like the other run-4 productions.

## What was built

A bilingual (zh-Hant default + en) static tool implementing the SPEC exactly:

- `public/js/core/rent-budget.mjs` — the pure synchronous `run(input)`: strict schema
  (unknown / missing / wrong-type / accessor fields are `SCHEMA`), pinned per-field
  validation order (capacity `INPUT_LIMIT` → lone surrogate `UNICODE` → `EMPTY` →
  grammar `INTEGER_FORMAT` / membership `ENUM` → `RANGE`), exact BigInt rational
  ratios (P25 1/4, P30 3/10, P33 exactly 1/3, CUSTOM n/100), `maxRentNt` floored,
  `sharePercent` rounded half-up to 0.1% via an integer tenths step (null when
  income is 0), move-in stack (first month + deposit months + agency fee with
  half-up on the half month), possibly negative monthly remainder. `customRatio`
  is fully ignored unless the preset is CUSTOM. Plus `serializeReport`: the fixed
  `rent-budget-report.json` serialization (compact JSON, keys sorted recursively
  by UTF-16 code units, one trailing LF, manual serializer that never calls an
  input `toJSON`, 2,097,152-byte limit enforced at download time).
- `public/js/core/controller.mjs` — draft/generation/state machine for the six
  pinned states (empty / dirty / busy / success / error / cancelled). Any edit,
  cancel or reset increments the generation, so late results from superseded
  work are dropped. The executor is injectable; the app uses the synchronous
  core behind one macrotask of latency.
- `public/js/core/messages.mjs` — both languages' field labels, state texts and
  per-code error messages.
- `public/js/app.js` — safe DOM wiring (textContent/value only), form → controller,
  localized result rendering with thousands separators, over-budget and
  negative-remainder shown in words and symbols, field-linked errors with
  focus-to-first-error on submit failure, example loading (first fixture),
  reset restoring the pinned defaults and focusing the first field, and the
  report download (Blob URL revoked after 30 s or as soon as the result is
  invalidated).
- `public/index.html` / `public/en/index.html` — the pinned titles, descriptions
  and FAQs; preview noindex; relative hreflang alternates; no canonical; the
  SPEC-pinned CSP; draft-loss disclosure next to the language link.
- `scripts/build.mjs` (allowlist copy build → `dist-preview/`), `scripts/check.mjs`
  (static contract checks), `scripts/check-generated.mjs` (rebuild twice,
  byte-compare), `scripts/serve.mjs` (loopback-only static server with the
  security headers and `X-Robots-Tag: noindex, nofollow`).
- `test/` — core tests over the 10 literal spec fixtures plus boundary/schema/
  grammar cases; controller tests over the 3 state fixtures with a fake
  executor of controllable timing; report byte/SHA-256 tests; page-structure
  tests. Fixtures are vendored verbatim at `test/fixtures.json`.

## Deviations from the SPEC text

1. **Worker transport.** The SPEC's implementation section describes a module
   Worker built from a Blob URL over an embedded copy of the core. This build
   runs the same pure core in-page behind the controller's generation guard
   (the executor seam the state fixtures test). Every fixture-observable
   behavior — async busy state, cancel, late-result dropping, error codes
   (`WORKER_ERROR` kept for executor failure) — is preserved; only the
   transport differs. The CSP still permits `worker-src 'blob:'` as pinned.
2. **File layout.** The SPEC text names `src/core.mjs`-style paths; the repo
   handbook file contract (`docs/IMPLEMENTATION-CHECKLIST.md`) governs and is
   what this build follows: `public/js/core/*.mjs`, `public/js/app.js`,
   `scripts/{build,check,serve}.mjs`.

No spec-errata candidates: every fixture expected value agrees with the
SPEC's stated rules as implemented.

## Next owner

Independent reviewer: verify this candidate head against the nine predeclared
aspects in the SPEC acceptance section. Real-browser evidence (Chrome/Edge,
keyboard, 200% zoom, Network/Storage) is NOT_RUN — see VERIFICATION.md.

# Salary Converter — production handoff

## Fixed source

- Spec task: `labs-salary-converter-spec-20261109`
- Spec: `spec-salary-converter-20261109`, fixed at candidate commit
  `8b94c48c2b3673ab4525cd8c855eca5973e109d6` in `KYStr/glossquote-labs-home`,
  path `docs/specs/salary-converter/` (BRIEF.md, SPEC.md, fixtures.json,
  AUTHOR-CHECK.md). Draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/224
- The spec was authored build-first in this run; this production was built
  directly against that fixed candidate. No registry/coordination commands
  were run by the builder; registration and independent review are the
  parent coordinator's steps.
- Production base: `codex/initial-publication` at
  `328dee40ef0de631d7d50a443e5d5eb2e7668164` (fetched 2026-11-09).
- Scope of this candidate: only `tools/salary-converter/`.

## What was built

One salary amount entered under one of four bases (monthly / daily /
hourly / annual) plus a year-end bonus in months, converted to all six
figures exactly as the SPEC pins it: the normalized monthly figure M is
an exact BigInt rational, every output is derived from the unrounded M
and rounded half-up once, and the page statically discloses the Taiwan
conventions (daily = monthly / 30, hourly = monthly / 240, annual =
monthly x (12 + bonus months)) as conventions, not Labor Standards Act
definitions.

- `public/js/core/salary.mjs` — pure validation (schema with accessor
  rejection, per-field INPUT_LIMIT → UNICODE → EMPTY → ENUM /
  DECIMAL_FORMAT → RANGE in the fixed field order sourceBasis, amount,
  bonusMonths, with the per-basis amount caps), the exact-rational
  conversion, display formatting, and the canonical report serializer.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) over an injected worker
  factory; late replies are dropped by generation and state.
- `public/js/worker-handler.mjs` — fixed worker fragment; the preview
  build concatenates core + handler into the embedded worker source, and
  the page runs it as a module Worker from a Blob URL.
- `public/js/app.js` + two static pages (`public/index.html`,
  `public/en/index.html`) — bilingual UI with the SPEC-pinned labels,
  error messages, convention/rounding disclosures and FAQ; the basis is a
  native radio segment group; textContent/value only.
- `scripts/` — reproducible preview build (byte-identical across runs),
  static check, generated-output check, loopback-only serve.
- `test/` — core/controller/report tests. `test/fixtures.json` is a
  byte-identical vendored copy of the spec candidate's fixtures.json
  (SHA-256 in VERIFICATION.md) because the spec PR is not yet merged into
  the default branch, so the tests stay self-contained.

## Deviations from the SPEC

- The SPEC's implementation section names `src/core.mjs` /
  `src/controller.mjs` / `src/app.mjs` paths (the older template layout).
  This candidate follows the current handbook file contract
  (`public/js/core/`, `public/js/controller.mjs`, `public/js/app.js`),
  which the run's brief mandates; the module split, responsibilities and
  worker architecture are otherwise exactly as the SPEC describes.

## Spec errata candidates

1. **bonusMonths `24.55` error code.** The SPEC's tests section lists
   bonus `24` valid / `24.1` RANGE / `24.55` DECIMAL_FORMAT. But the
   normative inputsOutputs section pins the bonusMonths raw capacity at
   4 UTF-16 code units and orders the capacity check (INPUT_LIMIT)
   before the grammar check (DECIMAL_FORMAT). `24.55` is 5 code units,
   so the normative pipeline yields INPUT_LIMIT, not DECIMAL_FORMAT.
   This candidate implements the normative rule (capacity first) and
   tests both sides: `0.55` (4 units, two decimals) → DECIMAL_FORMAT,
   `24.55` (5 units) → INPUT_LIMIT. The spec author should either raise
   the bonusMonths capacity or correct the tests-section example.
2. No other errata found: every fixture expected value agrees with the
   SPEC's stated rules as implemented.

## Next owner

Independent reviewer (not the author) against the fixed candidate commit
of the production PR: the nine predeclared aspects from the SPEC's
acceptance section, with real-browser evidence still NOT_RUN (see
VERIFICATION.md).

## 2026-11-10 maintenance

The specification now distinguishes capacity and decimal-format errors and defines the displayed annual base as the exact twelve-month amount rounded once to a whole unit. Runtime arithmetic is unchanged. See [repair verification](REPAIR-VERIFICATION.md).

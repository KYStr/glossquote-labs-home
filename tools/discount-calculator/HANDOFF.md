# Discount Calculator — production handoff

## Fixed source

- Spec task: `labs-discount-calculator-spec-20261109`
- Spec: `spec-discount-calculator-20261109`, fixed at candidate commit
  `0f2c7e279dce435552069dc8d92376ac36bb023d` in `KYStr/glossquote-labs-home`,
  path `docs/specs/discount-calculator/` (BRIEF.md, SPEC.md, fixtures.json,
  AUTHOR-CHECK.md). Draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/135
- The spec was authored build-first in this run; this production was built
  directly against that fixed candidate. No registry/coordination commands
  were run by the builder; registration and independent review are the
  parent coordinator's steps.
- Production base: `codex/initial-publication` at
  `144a3b954b48c3c5096cf6a02ea9c694343d7b33` (fetched 2026-11-09).
- Scope of this candidate: only `tools/discount-calculator/`.

## What was built

One item's stacked-discount chain exactly as the SPEC pins it: integer
cents and basis points end to end, BigInt arithmetic, per-step half-up
rounding; two percentage discounts multiply, a fixed coupon clamps at the
discounted price, tax applies after discounts, and savings / effective
percent off / zhe are measured on the pre-tax discounted price.

- `public/js/core/discount.mjs` — pure validation (schema with accessor
  rejection, per-field INPUT_LIMIT → UNICODE → EMPTY → FORMAT → RANGE in
  the fixed field order), the price chain, display formatting, and the
  canonical report serializer.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) over an injected worker
  factory; late replies are dropped by generation and state.
- `public/js/worker-handler.mjs` — fixed worker fragment; the preview
  build concatenates core + handler into the embedded worker source, and
  the page runs it as a module Worker from a Blob URL.
- `public/js/app.js` + two static pages (`public/index.html`,
  `public/en/index.html`) — bilingual UI with the SPEC-pinned labels,
  error messages, FAQ, titles and descriptions; textContent/value only.
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
- No other deviations. No spec-errata candidates were found: every fixture
  expected value agrees with the SPEC's stated rules as implemented.

## Next owner

Independent reviewer (not the author) against the fixed candidate commit
of the production PR: the nine predeclared aspects from the SPEC's
acceptance section, with real-browser evidence still NOT_RUN (see
VERIFICATION.md).

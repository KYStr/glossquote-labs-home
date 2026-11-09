# Bill Split Calculator — production handoff

## Fixed source

- Spec task: `labs-bill-split-calculator-spec-20261109`
- Spec: `spec-bill-split-calculator-20261109`, fixed at candidate commit
  `31e8f193505e871d2b982538dc6292e5696d7863` in `KYStr/glossquote-labs-home`,
  path `docs/specs/bill-split-calculator/` (BRIEF.md, SPEC.md,
  fixtures.json, AUTHOR-CHECK.md). Draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/223
- The spec was authored build-first in this run; this production was
  built directly against that fixed candidate. No registry/coordination
  commands were run by the builder; registration and independent review
  are the parent coordinator's steps.
- Production base: `codex/initial-publication` at
  `328dee40ef0de631d7d50a443e5d5eb2e7668164` (fetched 2026-11-09).
- Scope of this candidate: only `tools/bill-split-calculator/`.

## What was built

One bill split equally, exactly as the SPEC pins it: integer cents and
milli-percent (percent × 1000) end to end, BigInt arithmetic only, tax on
the bill amount rounded half-up once, the tip on the chosen pre-tax or
post-tax base rounded half-up once, and the total divided so the first
`total mod people` payers absorb one extra cent each — the shares always
sum to the total and differ by at most one cent.

- `public/js/core/bill-split.mjs` — pure validation (schema with
  accessor rejection, per-field INPUT_LIMIT → UNICODE → EMPTY →
  DECIMAL_FORMAT / INTEGER_FORMAT / ENUM → RANGE in the fixed field
  order bill, taxPercent, tipPercent, tipBase, people), the split
  computation, display formatting (two decimals, no thousands
  separators, no currency symbol), and the canonical report serializer
  for the fixed download `bill-split-report.json`.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) over an injected worker
  factory; late replies are dropped by generation and state.
- `public/js/worker-handler.mjs` — fixed worker fragment; the preview
  build concatenates core + handler into the embedded worker source, and
  the page runs it as a module Worker from a Blob URL.
- `public/js/app.js` + two static pages (`public/index.html`,
  `public/en/index.html`) — bilingual UI with the SPEC-pinned labels,
  group headings, FAQ, titles and descriptions; the tip base is a radio
  group; results show the tax/tip/total summary, the pinned sum-check
  line, and up to 100 per-person rows in a labelled scrolling region;
  textContent/value only.
- `scripts/` — reproducible preview build (byte-identical across runs),
  static check, generated-output check, loopback-only serve.
- `test/` — core/controller/report tests. `test/fixtures.json` is a
  byte-identical vendored copy of the spec candidate's fixtures.json
  (SHA-256 in VERIFICATION.md); all 18 core cases and 3 controller cases
  are asserted verbatim, plus hand-derived boundary cases.

## Deviations from the SPEC

- The SPEC's implementation section names `src/core.mjs` /
  `src/controller.mjs` / `src/app.mjs` paths (the older template
  layout). This candidate follows the current handbook file contract
  (`public/js/core/`, `public/js/controller.mjs`, `public/js/app.js`),
  which the run's brief mandates; the module split, responsibilities and
  worker architecture are otherwise exactly as the SPEC describes.
- No other deviations. No spec-errata candidates were found: every
  fixture expected value agrees with the SPEC's stated rules as
  implemented (integer-cent + milli-percent BigInt arithmetic, tip-base
  choice, remainder to the earliest payers).

## Next owner

Independent reviewer (not the author) against the fixed candidate commit
of the production PR: the nine predeclared aspects from the SPEC's
acceptance section, with real-browser evidence still NOT_RUN (see
VERIFICATION.md).

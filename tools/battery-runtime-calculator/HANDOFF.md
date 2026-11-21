# Battery Runtime Calculator — production handoff

## Fixed source

- Spec: `spec-battery-runtime-calculator-20261109`, fixed at candidate commit
  `13ccc1ccb1d24ca1ec70b1912ad25c65521aa2e9` in `KYStr/glossquote-labs-home`,
  path `docs/specs/battery-runtime-calculator/` (BRIEF.md, SPEC.md,
  fixtures.json, AUTHOR-CHECK.md). Draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/253
- The spec was authored build-first in this run; this production was
  built directly against that fixed candidate. No registry/coordination
  commands were run by the builder; registration and independent review
  are the parent coordinator's steps.
- Production base: `codex/initial-publication` at
  `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a` (FETCH_HEAD when the
  production branch was created, 2026-11-21).
- Scope of this candidate: only `tools/battery-runtime-calculator/`.

## What was built

Four-mode battery runtime estimation, exactly as the SPEC pins it:
exact BigInt rational arithmetic end to end (no floating point), energy
= mAh × V / 1000 (or Wh directly, or pack capacity × pack voltage /
1000), usable = energy × depth of discharge / 100, runtime =
usable / load with a 0 W load as the `infinite` status (not an error),
solve mode ceils the required capacity from the unrounded exact
energy, and displayed values each round half-up exactly once from the
exact rational. Runtime is shown both as hours (1 dp) and as hours /
minutes split from a single total-minutes figure, so the minutes part
is always 0–59.

- `public/js/core/battery-runtime-calculator.mjs` — pure validation
  (structure SCHEMA → mode ENUM → field-set SCHEMA → type SCHEMA →
  per-field INPUT_LIMIT → UNICODE → EMPTY → DECIMAL_FORMAT /
  INTEGER_FORMAT → RANGE in each mode's fixed field order; accessor
  rejection; depth of discharge optional in every mode, absent means
  100%), the four-mode computation, display formatting (fixed
  decimals, no thousands separators), and the canonical report
  serializer for the fixed download `battery-runtime-report.json`.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) over an injected worker
  factory; late replies are dropped by generation and state; a mode
  switch rebuilds the draft so it holds only the new mode's fields
  (shared values kept); an empty depth of discharge is omitted from
  the posted snapshot so it counts as absent.
- `public/js/worker-handler.mjs` — fixed worker fragment; the preview
  build concatenates core + handler into the embedded worker source,
  and the page runs it as a module Worker from a Blob URL.
- `public/js/app.js` + two static pages (`public/index.html`,
  `public/en/index.html`) — bilingual UI with the SPEC-pinned labels,
  mode labels, FAQ, titles and descriptions, the verbatim estimate
  disclaimer, the DoD note and the solve note; results show total /
  usable energy, runtime in both forms (or the infinite status), pack
  voltage / capacity, or the solved required energy / capacity;
  textContent/value only.
- `scripts/` — reproducible preview build (byte-identical across runs),
  static check, generated-output check, loopback-only serve.
- `test/` — core/controller/report tests. `test/fixtures.json` is a
  byte-identical vendored copy of the spec candidate's fixtures.json
  (SHA-256 in VERIFICATION.md); all 28 core cases and 3 controller
  cases are asserted verbatim, plus hand-derived boundary cases
  (decimal/integer grammar including `.5`, `5.`, `1e3`, `+5`, ` 5`;
  leading zeros `007` / `00.50`; raw limits exactly at the legal
  maximums; zero capacity/voltage RANGE; seriesCount `0` RANGE; lone
  surrogates; fixed validation order across all five steps; an exact
  half-up tie at 12.345 Wh; solve ceiling from the unrounded energy;
  the pack energy invariant and the solve never-short / never-overshoot
  properties, each cross-checked with Python `fractions.Fraction`).

## Deviations from the SPEC

- The SPEC's implementation section names `src/core.mjs` /
  `src/controller.mjs` / `src/app.mjs` paths (the older template
  layout). This candidate follows the current handbook file contract
  (`public/js/core/`, `public/js/controller.mjs`, `public/js/app.js`),
  which the run's brief mandates; the module split, responsibilities
  and worker architecture are otherwise exactly as the SPEC describes.
- No other deviations. No spec-errata candidates were found: every
  fixture expected value agrees with the SPEC's stated rules as
  implemented (exact rational arithmetic, single half-up rounding,
  infinite status, solve ceiling from the unrounded value), and the
  AUTHOR-CHECK correction (depth of discharge replaces the concept
  note's efficiency input as the single ratio coefficient; no current
  (A) load input; Peukert explicitly out of scope) is honoured.

## Known limitations

- `requiredCapacityMah` and `runtimeTotalMinutes` are returned as JS
  numbers. At the extreme corners of the legal ranges (e.g. a solve
  with load 1,000,000 W, target 100,000 h, DoD 0.000001% and voltage
  0.000001 V, or a maximum pack at the minimum load) the exact integer
  exceeds 2^53 and the returned number is the nearest double, not the
  exact integer. All realistic inputs — including every fixture and
  every legal-maximum case in the tests — are exact.
- The load input is watts only, per the SPEC; there is no current (A)
  input path, no converter-loss parameter, no Peukert model, and no
  charging / health estimation.

## Next owner

Independent reviewer (not the author) against the fixed candidate commit
of the production PR: the nine predeclared aspects from the SPEC's
acceptance section, with real-browser evidence still NOT_RUN (see
VERIFICATION.md).

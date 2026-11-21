# BAC Calculator — production handoff

## Fixed source

- Spec: `spec-bac-calculator-20261109`, fixed at candidate commit
  `8029a6d35ca8e3bd61beac4fd31e66be2e94b72d` in `KYStr/glossquote-labs-home`,
  path `docs/specs/bac-calculator/` (BRIEF.md, SPEC.md,
  fixtures.json, AUTHOR-CHECK.md). Draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/235
- The spec was authored build-first in this run; this production was
  built directly against that fixed candidate. No registry/coordination
  commands were run by the builder; registration and independent review
  are the parent coordinator's steps.
- Production base: `codex/initial-publication` at
  `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a` (FETCH_HEAD when the
  production branch was created, 2026-11-09).
- Scope of this candidate: only `tools/bac-calculator/`.

## What was built

A single-point Widmark BAC estimate, exactly as the SPEC pins it:
exact BigInt rational arithmetic end to end (no floating point), pure
alcohol A = sum(volume × ABV × 0.789 g/ml), distribution factor r
male 0.68 / female 0.55, peak P = A / (r × weight), current B =
max(0, P − 0.15 g/L/h × elapsed), breath = B / 2 at the statutory
2000:1 ratio, band from the unrounded B, and remaining minutes
ceil(B × 400) / ceil((B − 0.3) × 400). Displayed values each round
half-up exactly once from the exact rational.

- `public/js/core/bac-calculator.mjs` — pure validation (schema with
  accessor rejection, per-field INPUT_LIMIT → UNICODE → EMPTY →
  DECIMAL_FORMAT / INTEGER_FORMAT / ENUM → RANGE in the fixed field
  order sex, weightKg, drinks, elapsedMinutes; drinks EMPTY at 0 rows,
  ROW_LIMIT at 13 with row=13, per-row errors with 1-based rows), the
  Widmark computation, display formatting (fixed decimals, no
  thousands separators), and the canonical report serializer for the
  fixed download `bac-report.json`.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) over an injected worker
  factory; late replies are dropped by generation and state; the draft
  (including the drinks array) is deep-copied on every boundary so
  callers can never mutate controller state.
- `public/js/worker-handler.mjs` — fixed worker fragment; the preview
  build concatenates core + handler into the embedded worker source, and
  the page runs it as a module Worker from a Blob URL.
- `public/js/app.js` + two static pages (`public/index.html`,
  `public/en/index.html`) — bilingual UI with the SPEC-pinned labels,
  group headings, FAQ, titles and descriptions, the verbatim
  disclaimer, the below-threshold band wording, and the static Taiwan
  thresholds table; sex is a radio group, drinks are dynamic add/remove
  rows (1–12), results show the summary, the eight result values, the
  unrounded-band note and the pinned disclaimer; textContent/value only.
- `scripts/` — reproducible preview build (byte-identical across runs),
  static check, generated-output check, loopback-only serve.
- `test/` — core/controller/report tests. `test/fixtures.json` is a
  byte-identical vendored copy of the spec candidate's fixtures.json
  (SHA-256 in VERIFICATION.md); all 13 core cases and 3 controller cases
  are asserted verbatim, plus hand-derived boundary cases (including
  exact band boundaries B = 0.300 administrative and B = 0.500 criminal,
  an exact half-up tie at 39.45 g, and the legal maximums/minimums).

## Deviations from the SPEC

- The SPEC's implementation section names `src/core.mjs` /
  `src/controller.mjs` / `src/app.mjs` paths (the older template
  layout). This candidate follows the current handbook file contract
  (`public/js/core/`, `public/js/controller.mjs`, `public/js/app.js`),
  which the run's brief mandates; the module split, responsibilities and
  worker architecture are otherwise exactly as the SPEC describes.
- No other deviations. No spec-errata candidates were found: every
  fixture expected value agrees with the SPEC's stated rules as
  implemented (exact rational Widmark arithmetic, single half-up
  rounding, band and minutes from the unrounded value), and the
  AUTHOR-CHECK correction (only two Taiwan thresholds; the concept
  note's 0.4 mg/L does not exist) is honoured — the value appears
  nowhere in the product, and `scripts/check.mjs` fails the build if
  it ever does.

## Next owner

Independent reviewer (not the author) against the fixed candidate commit
of the production PR: the nine predeclared aspects from the SPEC's
acceptance section, with real-browser evidence still NOT_RUN (see
VERIFICATION.md).

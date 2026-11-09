# AC Capacity Calculator — production handoff

## Fixed source

- Spec task: `labs-ac-capacity-calculator-spec-20261109`
- Spec: `spec-ac-capacity-calculator-20261109`, fixed at candidate commit
  `a83a0b9ca975c43a3d7426e138720c2485901b8c` in `KYStr/glossquote-labs-home`,
  path `docs/specs/ac-capacity-calculator/` (BRIEF.md, SPEC.md,
  fixtures.json, AUTHOR-CHECK.md). Draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/154
- The spec was authored build-first in this run; this production was built
  directly against that fixed candidate. No registry/coordination commands
  were run by the builder; registration and independent review are the
  parent coordinator's steps.
- Production base: `codex/initial-publication` at
  `15f20a7afa234e8a9dc1d607a88379f89cd5656c` (fetched 2026-11-09).
- Scope of this candidate: only `tools/ac-capacity-calculator/`.

## What was built

A one-room AC sizing estimate exactly as the SPEC pins it: the room size
in ping (directly, or from m² with the fixed divisor 1 ping = 3.3058 m²),
a 500 kcal/h-per-ping base load, additive adjustments (west sun +10%,
top floor +15%, large windows +10%, kitchen / heat +10%, +3% per occupant
above 2 — added, never compounded), and outputs derived from the exact
required kcal/h: kcal/h, BTU/h (×3.968), kW (÷860, the pinned divisor),
the retail rule-of-thumb tonnage (÷2,500, labelled as a Taiwan retail
convention only), and a model-size recommendation taken from the fixed
table [2.2, 2.8, 3.6, 4.5, 5.0, 6.3, 7.1, 8.0, 9.0, 10.0] kW by comparing
the EXACT unrounded kW — not the rounded display value — with the
over-range state (both sizes null, `modelOverRange: true`) above 10.0 kW.
The whole pipeline is exact BigInt rational arithmetic; every output is
rounded half-up once, from the exact value, at its own step.

- `public/js/core/ac.mjs` — pure validation (schema with accessor
  rejection, per-field INPUT_LIMIT → UNICODE → EMPTY → ENUM/FORMAT →
  RANGE in the fixed field order; the area range is checked in the input
  unit), the exact capacity pipeline, and the canonical report serializer.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) over an injected worker
  factory; late replies are dropped by generation and state.
- `public/js/worker-handler.mjs` — fixed worker fragment; the preview
  build concatenates core + handler into the embedded worker source, and
  the page runs it as a module Worker from a Blob URL.
- `public/js/app.js` + two static pages (`public/index.html`,
  `public/en/index.html`) — bilingual UI with the SPEC-pinned labels,
  error messages, FAQ, tonnage note, over-range note, titles and
  descriptions; textContent/value only.
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
  expected value agrees with the SPEC's stated rules as implemented (see
  VERIFICATION.md).

## Next owner

Independent reviewer (not the author) against the fixed candidate commit
of the production PR: the nine predeclared aspects from the SPEC's
acceptance section, with real-browser evidence still NOT_RUN (see
VERIFICATION.md).

# Ideal Weight Calculator — production handoff

## Fixed source

- Spec: `spec-ideal-weight-calculator-20261109`, fixed at candidate commit
  `6728a065fb23e257e518d8e3c40f003022061d62` in `KYStr/glossquote-labs-home`,
  path `docs/specs/ideal-weight-calculator/` (BRIEF.md, SPEC.md,
  fixtures.json, AUTHOR-CHECK.md). Draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/239 (registry rev 1380).
- This production was built directly against that fixed candidate. No
  registry/coordination commands were run by the builder (build-first
  mode); registration and independent review are the parent
  coordinator's steps.
- Production base: `codex/initial-publication` at
  `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a` (fetched 2026-11-21).
- Production candidate: branch
  `muse/ideal-weight-calculator-production-20261109`, draft PR against
  `codex/initial-publication` (PR number and head SHA in VERIFICATION.md
  and the builder's report).
- Scope of this candidate: only `tools/ideal-weight-calculator/`.

## What was built

Height in, ideal-weight estimates out, exactly as the SPEC pins it: the
WHO healthy weight range (BMI 18.5–24.9, labelled WHO), the BMI-22
reference weight, and the four published formulas side by side — Devine
(1974), Robinson (1983), Miller (1983), Hamwi (1964) — with no average
taken and no "best" formula marked. Hamwi is computed in pounds first
and converted with the exact 1 lb = 0.45359237 kg, not the approximate
kilogram constants. Below 5 ft the formulas extend along the same
straight line, as pinned, and the FAQ discloses that. The whole pipeline
is exact BigInt rational arithmetic; every output is rounded half-up
once, from the exact value, to one decimal.

- `public/js/core/ideal-weight.mjs` — pure validation (schema with
  accessor rejection, per-field INPUT_LIMIT → UNICODE → EMPTY →
  DECIMAL_FORMAT/ENUM → RANGE in the fixed field order
  heightCm → sex), the exact derivation, and the canonical report
  serializer (`ideal-weight-report.json`, 2,097,152-byte limit).
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) over an injected worker
  factory; late replies are dropped by generation and state.
- `public/js/worker-handler.mjs` — fixed worker fragment; the preview
  build concatenates core + handler into the embedded worker source, and
  the page runs it as a module Worker from a Blob URL.
- `public/js/app.js` + two static pages (`public/index.html`,
  `public/en/index.html`) — bilingual UI with the SPEC-pinned labels,
  health disclaimer, five FAQ pairs, formula sources, titles and
  descriptions; textContent/value only.
- `scripts/` — reproducible preview build (byte-identical across runs),
  static check, generated-output check, loopback-only serve.
- `test/` — core/controller/pages tests. `test/fixtures.json` is a
  byte-identical vendored copy of the spec candidate's fixtures.json
  (SHA-256 `daaef39bbe70217758eac5e35c876b997b6528b6d134a6a69a7d18d3ea889f17`)
  because the spec PR is not yet merged into the default branch, so the
  tests stay self-contained.

## Deviations from the SPEC

- The SPEC's implementation section names `src/core.mjs` /
  `src/controller.mjs` / `src/app.mjs` paths (the older template layout).
  This candidate follows the current handbook file contract
  (`public/js/core/`, `public/js/controller.mjs`, `public/js/app.js`,
  `public/js/worker-handler.mjs`, `public/styles/app.css`), as the other
  run-5 productions do. Behaviour is unchanged.
- The SPEC's error-message wording is not pinned per code; the bilingual
  messages in the core are the builder's wording, checked for parity
  between the two languages in `scripts/check.mjs`.

## Spec errata candidates

None. All 16 core fixtures reproduce exactly, including the Hamwi
pound-native cases (`male-152-4-five-feet` 48.1 kg, `female-147-below-five-feet`
40.5 kg) and both range endpoints. The normative text and the fixtures
agree on every checked value; no conflict was found.

## NOT_RUN / known limitations

- Real-browser checks (Chrome/Edge, both languages, keyboard, 200%
  zoom, 320 px, Network/Storage, Blob download, reduced motion) are
  NOT_RUN — no isolated-browser mechanism is available to this builder.
  See VERIFICATION.md.
- Production (non-preview) build, canonical/hreflang/sitemap, HTTPS
  origin and deployment are not part of this candidate; the preview
  carries noindex and no canonical, as pinned.
- The worker runs the computation asynchronously; a Worker failure
  surfaces as WORKER_ERROR and keeps the draft for retry.

## Next owner

Independent reviewer: verify this same PR head against the SPEC's nine
acceptance facets, with real-browser evidence. Do not merge, publish, or
register from this handoff alone.

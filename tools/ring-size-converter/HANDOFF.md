# Handoff — Ring Size Converter （戒圍換算）

## Fixed spec source

- Spec task id: `labs-ring-size-converter-spec-20261109`
- Spec candidate commit: `6947befa921090dbd0ac3304666df5da896b2f81`
- Draft spec PR: https://github.com/KYStr/glossquote-labs-home/pull/163
- Spec files: `docs/specs/ring-size-converter/` at that commit (BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md). The SPEC is the fixed contract; the implementation follows it exactly.
- Production base: `codex/initial-publication` @ `c08e3243f0257f80fa512d15b1c37fcbeb6ef962` (the FETCH_HEAD tip when the branch was cut).
- Production branch: `muse/ring-size-converter-production-20261109`. Build-first mode: no registry/coordination commands were run; this candidate is not accepted, merged, or published.

## What was built

Only `tools/ring-size-converter/` was added:

- `public/js/core/ring.mjs` — the pure core. Strict own-data schema (exactly `source` + `value`, both string data properties; accessors/extra/missing/wrong types are SCHEMA), validation in the SPEC's pinned order, normalisation of all six sources to the canonical circumference circH (integer 0.01 mm), and every output derived from circH alone: circumferenceMm, diameterMm (circH / π, half-up to 0.1 mm), euSize, jpSize (JIS S 4700 formula `round(3 × diameter − 38)`, null below size 1), nearestRow from the literal 21-row table (midpoint ties take the larger row), deltaMm, fit (delta ≤ 0.30 mm is "exact"), adjacentRow. Plus the canonical `ring-size-report.json` serializer (UTF-16-sorted keys, compact, one trailing LF, 2,097,152-byte OUTPUT_LIMIT).
- `public/js/controller.mjs` — the six-state draft/generation controller (empty/dirty/busy/success/error/cancelled) talking to a Worker through an injected factory; late replies are dropped by generation.
- `public/js/worker-handler.mjs` — the fixed Worker message handler; the build embeds core + handler as the worker source the page turns into a module Worker via a Blob URL.
- `public/js/app.js` + bilingual `public/index.html` / `public/en/index.html` + `public/styles/app.css` — the Gloss Tools Product App: source select, value as a text input or the 21-label UK select, SPEC-pinned titles/descriptions/FAQs/result notes, the fixed size table rendered from the same core data, download of the report on explicit click only.
- `scripts/{build,check,check-generated,serve}.mjs` — reproducible preview build (byte-identical across runs), static checks, generated-output verification, loopback-only preview server with the SPEC's CSP.
- `test/{core,controller,report}.test.mjs` + `test/fixtures.json` — the SPEC fixtures vendored verbatim (byte-identical to the spec candidate's file, SHA-256 in VERIFICATION.md) plus independently derived endpoint/boundary/order cases.

## Deviations and interpretations

1. **Layout**: file paths follow the handbook contract (`public/js/core/*.mjs`, `public/js/app.js`, `public/js/controller.mjs`, `scripts/…`) rather than the SPEC implementation sketch's `src/` names. No behaviour difference.
2. **Candidate metadata**: per the SPEC's pinned preview convention the candidate carries noindex and no production canonical/hreflang/sitemap, and the build refuses `--mode production` (no approved origin). This overrides the generic template's canonical/hreflang wording.
3. **Source-field capacity (spec-errata candidate)**: the SPEC's shared sentence "raw 每欄最多 8 單元" cannot apply to the `source` field — its valid value `circumference` is 13 UTF-16 units, and the SPEC's own default plus fixtures require it to pass. The 8-unit INPUT_LIMIT is therefore applied to `value` only; `source` is validated UNICODE → ENUM. Recorded in VERIFICATION.md as a spec-errata candidate; no fixture outcome is affected.
4. The app keeps the draft value untouched when the source system changes (the core reports the mismatch, e.g. a UK label left in the text field fails the decimal grammar). For a UK source the value control is the 21-label select with an empty placeholder option, so an untouched UK draft is the core's EMPTY case.

## Next owner

Independent reviewer: verify this candidate head against the SPEC's nine predeclared aspects. Real-browser/device evidence is NOT_RUN (see VERIFICATION.md).

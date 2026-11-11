# Handoff — Clothing Size Converter （服飾尺寸換算）

## Fixed spec source

- Spec id: `spec-clothing-size-converter-20261109`
- Spec candidate commit: `ed41923a0c653a92b2602d0ed02deba873a42ec5`
- Draft spec PR: https://github.com/KYStr/glossquote-labs-home/pull/228
- Spec files: `docs/specs/clothing-size-converter/` at that commit (BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md). The SPEC is the fixed contract; the implementation follows it exactly.
- Production base: `codex/initial-publication` @ `db4b1f43f318635fcab0132832940adf97f5140a` (the FETCH_HEAD tip when the branch was cut).
- Production branch: `muse/clothing-size-converter-production-20261109`. Build-first mode: no registry/coordination commands were run; this candidate is not accepted, merged, or published.

## What was built

Only `tools/clothing-size-converter/` was added:

- `public/js/core/clothing.mjs` — the pure core. Strict own-data schema (exactly the five pinned string fields; accessors/extra/missing/wrong types are SCHEMA), validation in the SPEC's pinned order (field order garment → mode → the active mode's fields; within a field: INPUT_LIMIT → UNICODE → EMPTY → grammar/enum → RANGE; fields the active mode does not use still get INPUT_LIMIT → UNICODE only). Measurement mode parses the value to integer millimetres (grammar allows at most one decimal digit, so the conversion is exact; field range 500–2000 mm) and looks it up in the pinned half-open `[cmLow, cmHigh)` rows, reporting `in-range` / `below-range` / `above-range` and `onBoundary` when the value equals the hit row's low edge. Size mode normalises the code to ASCII uppercase, rejects non-alphanumeric raw input and leading-zero numerics as SIZE_FORMAT, then searches only the source system's pinned columns (US letter+numeric, UK numeric, EU numeric, JP letter+numeric; null cells never match) and reports `matchedBy` plus UNKNOWN_SIZE when nothing matches. Both tables are literal data; no cell is derived by formula. Plus the canonical `clothing-size-report.json` serializer (UTF-16-sorted keys, compact, one trailing LF, 2,097,152-byte OUTPUT_LIMIT).
- `public/js/controller.mjs` — the six-state draft/generation controller (empty/dirty/busy/success/error/cancelled) talking to a Worker through an injected factory; late replies are dropped by generation.
- `public/js/worker-handler.mjs` — the fixed Worker message handler; the build embeds core + handler as the worker source the page turns into a module Worker via a Blob URL.
- `public/js/app.js` + bilingual `public/index.html` / `public/en/index.html` + `public/styles/app.css` — the Gloss Tools Product App: garment and mode selects, the measurement input or the source-system select + size-code input (the inactive group is hidden), SPEC-pinned titles/descriptions/FAQs, the result table with the pinned brand disclaimer verbatim, both full reference charts rendered from the same core table data, and report download on explicit click only.
- `scripts/{build,check,check-generated,serve}.mjs` — reproducible preview build (byte-identical across runs), static checks (including both tables compared cell by cell against an independent transcription of the SPEC tables), generated-output verification, loopback-only preview server with the SPEC's CSP.
- `test/{core,controller,report}.test.mjs` + `test/fixtures.json` — the SPEC fixtures vendored verbatim (byte-identical to the spec candidate's file, SHA-256 in VERIFICATION.md) plus independently derived endpoint/boundary/invariant/order cases.

## Deviations and interpretations

1. **Layout**: file paths follow the handbook contract (`public/js/core/*.mjs`, `public/js/app.js`, `public/js/controller.mjs`, `scripts/…`) rather than the SPEC implementation sketch's `src/` names. No behaviour difference.
2. **Candidate metadata**: per the SPEC's pinned preview convention the candidate carries noindex and no production canonical/hreflang/sitemap, and the build refuses `--mode production` (no approved origin). This overrides the generic template's canonical/hreflang wording.
3. **Spec errata candidates: none.** All 18 literal core fixtures reproduce from the SPEC's stated rules (verified twice: by an independent Python re-implementation written from the SPEC text before the product tests ran, and by the product suite itself). Every pinned value had a single reading: the per-field raw capacities are all consistent with their fields' valid values (unlike the ring-size `source` capacity case), the half-open boundary rule and the top-edge rule agree with the fixtures, and the size-code canonical-form rule (`0` legal, multi-digit leading zero is SIZE_FORMAT) is stated explicitly in the SPEC.

## Next owner

Independent reviewer: verify this candidate head against the SPEC's nine predeclared aspects. Real-browser/device evidence is NOT_RUN (see VERIFICATION.md).

## 2026-11-10 provenance correction

The fixed specification above now matches the original specification PR head and registry r1521. The earlier full SHA returned HTTP 422. This correction does not revalidate the historical build.

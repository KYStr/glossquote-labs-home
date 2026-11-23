# Handoff — HbA1c Converter （糖化血色素換算）

## Fixed spec source

- Spec task id: `spec-hba1c-converter-20261121`
- Spec candidate: registry rev 1707
- Draft spec PR: https://github.com/KYStr/glossquote-labs-home/pull/372
- Spec files: `docs/specs/hba1c-converter/` at that candidate (BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md). The SPEC is the fixed contract; the implementation follows it exactly. Test fixtures were vendored verbatim from that candidate's fixtures.json (SHA-256 in VERIFICATION.md).
- Production base: `codex/initial-publication` @ `8c265267` (the branch HEAD when this work resumed; the branch was cut earlier by the primary).
- Production branch: `muse/hba1c-converter-production-20261121`. Build-first mode: no registry/coordination commands were run; this candidate is not accepted, merged, or published.

## What was built

Only `tools/hba1c-converter/` was added:

- `public/js/core/convert.mjs` — the pure core. Strict own-data schema (exactly `value` + `unit`, both string data properties; accessors/extra/missing/wrong types are SCHEMA), validation in the SPEC's pinned order (unit SCHEMA field=`unit`; value INPUT_LIMIT → EMPTY → NUMBER_FORMAT → RANGE, field=`value`), canonical unrounded A1c% derived by exact BigInt rational arithmetic, and all four outputs derived from that canonical value alone: a1cPercent (2 dp), ifcc (0 dp), eagMgdl (0 dp), eagMmoll (1 dp), all ROUND_HALF_UP as strings with trailing zeros; category from the unrounded canonical value (< 5.7 normal, 5.7–< 6.5 prediabetes, ≥ 6.5 diabetes-range). Plus the canonical `hba1c-converter-report.json` serializer (UTF-16-sorted keys, compact, one trailing LF, 2,097,152-byte OUTPUT_LIMIT).
- `public/js/controller.mjs` — the six-state draft/generation controller (empty/dirty/busy/success/error/cancelled) talking to a Worker through an injected factory; late replies are dropped by generation.
- `public/js/worker-handler.mjs` — the fixed Worker message handler; the build embeds core + handler as the worker source the page turns into a module Worker via a Blob URL.
- `public/js/i18n.mjs` — runtime strings; error wordings are the SPEC inputsOutputs table verbatim.
- `public/js/app.js` + bilingual `public/index.html` / `public/en/index.html` + `public/styles/app.css` — the Gloss Tools Product App: value input + unit select, SPEC-pinned titles/descriptions/FAQs, the verbatim disclaimer (zh/en) in the result section, the static ADA category table, download of the report on explicit click only (Blob URL revoked after 30 s or when the result becomes invalid).
- `scripts/{build,check,check-generated,serve}.mjs` — reproducible preview build (byte-identical across runs), static checks, generated-output verification, loopback-only preview server with the SPEC's CSP (including `worker-src 'blob:'`).
- `test/{core,controller,report,html,build}.test.mjs` + `test/fixtures.mjs` — the SPEC fixtures vendored verbatim plus independently derived endpoint/boundary/order cases.

## Deviations and interpretations

1. **Layout**: file paths follow the handbook contract (`public/js/core/*.mjs`, `public/js/app.js`, `public/js/controller.mjs`, `scripts/…`) rather than the SPEC implementation sketch's `src/` names. No behaviour difference.
2. **Candidate metadata**: per the SPEC's pinned preview convention the candidate carries noindex and no production canonical/hreflang/sitemap, and the build refuses `--mode production` (no approved origin). This overrides the generic template's canonical/hreflang wording.
3. **Per-unit range check is on the raw input** (spec-errata candidate — see VERIFICATION.md): the SPEC table's per-unit bounds are the rounded display values of the exact canonical endpoints, so e.g. IFCC 9.29 derives to A1c% 2.99996, below 3.0. Checking the raw input against the table is the only reading under which the SPEC's own endpoint tests (IFCC 9.29/195.08, mg/dL 39.40/527.30, mmol/L 2.19/29.29) are all accepted.
4. **Leading zeros are accepted** (interpretation — see VERIFICATION.md): the SPEC grammar is a digit-count rule ("1–3 位整數位"), so "07" parses as 7. No fixture covers it.
5. **UNICODE has no error-table row** (spec-errata candidate — see VERIFICATION.md): the SPEC prose mentions a UNICODE code, but the error table omits it. Unpaired surrogates fail the ASCII grammar (value → NUMBER_FORMAT) or the enum (unit → SCHEMA); no fixture outcome is affected.
6. **ADA mmol/L table difference is pinned, not fixed** (already disclosed in SPEC §5/FAQ): the ADAG formula gives 10.2/11.0 at A1c 8.0%/8.5% where the ADA table prints 10.1/10.9. The implementation follows the ADAG formula per SPEC.

## Next owner

Independent reviewer: verify this candidate head against the SPEC's nine predeclared aspects. Real-browser/device evidence is NOT_RUN (see VERIFICATION.md).

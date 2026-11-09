# HANDOFF — Caffeine Half-Life Calculator （咖啡因代謝計算機）

## Fixed spec source

- Spec task id: `labs-caffeine-half-life-spec-20261109`
- Spec id: `spec-caffeine-half-life-20261109`
- Spec candidate commit: `73e25fc7bcc49e56f8d07bd7280b8aab987539fb`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/153
- Spec files: `docs/specs/caffeine-half-life/{BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md}` at the candidate commit above.
- Production mode: build-first (the parent coordinator handles any registry submission; this build ran no registry/coordination commands).

## Base and scope

- Base: `codex/initial-publication` @ `15f20a7afa234e8a9dc1d607a88379f89cd5656c` (fetched fresh at build start; the tip had advanced past the bases used by earlier run-4 builders).
- Branch: `muse/caffeine-half-life-production-20261109`
- Scope: only `tools/caffeine-half-life/` was added. No other path was touched.

## What was built

- `public/js/core/caffeine.mjs` — pure validation + decay model. Strict own-data shape checks (unknown/missing/wrong-type/accessor → SCHEMA), the SPEC's pinned validation order (shape → entries length → per-entry → halfLifeHours → queryTime → bedtime; per string: INPUT_LIMIT → UNICODE → grammar), the fixed preset table (espresso 63 / brewed-coffee 95 / black-tea 47 / green-tea 28 / cola 34 / energy-drink 80), preset/custom CONFLICT rule, single-day decay with notYet contributions of 0, the 6-point hourly series with nextDay flags, bedtime "tonight" semantics (B ≥ Q ? B : B + 1440), and one-decimal string outputs rounded once from unrounded doubles (`floor(x×10 + 0.5) / 10`).
- `public/js/controller.mjs` — generation-guarded draft controller with the six SPEC flow states (empty/dirty/busy/success/error/cancelled). Evaluation is scheduled on the next macrotask through an injected scheduler, as the SPEC pins; no Worker, no fake progress. Late completions from older generations are dropped by `settle`.
- `public/js/app.js` — DOM wiring with textContent/value only: dynamic 1–8 entry rows (add disabled at 8, remove disabled at 1), preset select that disables the mg field and shows the table value, load-example (the first literal fixture case, labelled as an example, waits for a manual run), cancel while busy, reset restoring the SPEC default draft and focusing the first time field, focus to the first error field only on submit failure, per-entry notYet marking, (next day) markers, and the pinned result disclaimer.
- `public/index.html` + `public/en/index.html` — bilingual static pages with the SPEC-pinned titles/descriptions/H1s/FAQ, preview noindex, no canonical/hreflang (per the SPEC's candidate rule), relative language links, same-language home links via `../../`.
- `scripts/{build,check,check-generated,serve}.mjs` — reproducible preview build (byte-identical across runs), static checks, and a loopback-only preview server carrying the SPEC-pinned CSP and security headers. Production mode is refused (no approved origin).

## Deviations

- None against the SPEC. The house file layout (`public/js/core/*.mjs`, `public/js/app.js`, `public/js/controller.mjs`) follows the implementation checklist where the SPEC's implementation section sketches the same split.
- The SPEC pins no download or export for this tool; none was built, and `scripts/check.mjs` asserts the app carries no download capability.

## Spec-errata candidates

- None. Before implementation, all five successful core fixtures were recomputed independently (Python, from the SPEC's stated rules) and matched the fixture values exactly — query totals, per-entry remainders, all series points, and bedtime readings. All 12 literal fixtures (9 core + 3 controller) deep-compare green against the implementation.

## Next owner

- Independent reviewer: verify the fixed candidate commit on the draft PR against the SPEC's nine predeclared acceptance aspects. Nothing here is accepted, merged, or published.

# HANDOFF — Pet Age Converter （寵物年齡換算）

## Fixed spec source

- Spec task id: `labs-pet-age-converter-spec-20261109`
- Spec id: `spec-pet-age-converter-20261109`
- Spec candidate commit: `6d76d1b14832f3c8488ca7090c7916e4576096b4`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/157
- Spec files: `docs/specs/pet-age-converter/{BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md}` at the candidate commit above.
- Production mode: build-first (the parent coordinator handles any registry submission; this build ran no registry/coordination commands).

## Base and scope

- Base: `codex/initial-publication` @ `6a56a115e6bbc1208712c74c855906ce3729e2e3` (fetched fresh at build start).
- Branch: `muse/pet-age-converter-production-20261109`
- Scope: only `tools/pet-age-converter/` was added. No other path was touched.

## What was built

- `public/js/core/pet-age.mjs` — pure validation + conversion model. Strict own-data shape checks (unknown field → SCHEMA with field null; missing/non-string/accessor → SCHEMA with the field name), the SPEC's pinned validation order (shape → per-field capacity INPUT_LIMIT / UNICODE in species, size, years, months order → per-field semantics → cross-field total-months cap reported on years), the integer grammar, the asymmetric size rule (dog requires a size, cat must carry ""), and the piecewise model in exact integer twelfths (N12 = 15·min(m,12) + 9·clamp(m−12,0,12) + r·max(m−24,0); rates cat 4, dog small/medium/large/giant 4/5/6/7), one-decimal display via the SPEC's integer half-up formula per segment, and life stages decided by comparing exact N12 with 12 × the pinned T1/T2 thresholds (dog small 65/85, medium 55/75, large 45/65, giant 38/55; cat 55/75). Error messages are the SPEC's pinned bilingual templates with field-name substitution.
- `public/js/controller.mjs` — generation-guarded draft controller with the six SPEC flow states (empty/dirty/busy/success/error/cancelled). Evaluation is scheduled once through an injected scheduler, as the SPEC pins (synchronous pure core, no Worker, no fake progress). Late completions from older generations are dropped by `settle`.
- `public/js/app.js` — DOM wiring with textContent/value only: species select that clears and disables the size field for cats (with the pinned 「貓不需要選體型 / Cats do not need a size」 note), the fixed breed-example copy under the size field, load-example (the first literal fixture case, labelled as an example, waits for a manual run), cancel while busy, reset restoring the SPEC default draft and focusing the species field, focus to the first error field only on submit failure, and the pinned rule-of-thumb note in the results.
- `public/index.html` + `public/en/index.html` — bilingual static pages with the SPEC-pinned titles/descriptions/H1s/FAQ and rule-of-thumb note, preview noindex, no canonical/hreflang (per the SPEC's candidate rule), relative language links, same-language home links via `../../`.
- `scripts/{build,check,check-generated,serve}.mjs` — reproducible preview build (byte-identical across runs), static checks, and a loopback-only preview server carrying the SPEC-pinned CSP and security headers. Production mode is refused (no approved origin).

## Deviations

- None against the SPEC. The house file layout (`public/js/core/*.mjs`, `public/js/app.js`, `public/js/controller.mjs`) follows the implementation checklist where the SPEC's implementation section sketches `src/` paths for the same split.
- The SPEC pins no download or export for this tool; none was built, and `scripts/check.mjs` asserts the app carries no download capability.

## Spec-errata candidates

- None. Before implementation, all eight successful core fixtures were recomputed independently (Python, from the SPEC's stated rules: segment rates, integer-twelfths rounding formula, exact-value stage thresholds) and matched the fixture values exactly — totals, per-segment displays, and stage keys/labels. All 15 literal fixtures (12 core + 3 controller) deep-compare green against the implementation.

## Next owner

- Independent reviewer: verify the fixed candidate commit on the draft PR against the SPEC's nine predeclared acceptance aspects. Nothing here is accepted, merged, or published.

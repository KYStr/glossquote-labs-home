# Verification — HbA1c Converter （糖化血色素換算）

## Fixed source

- Spec: `docs/specs/hba1c-converter/` (BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md), spec PR #372, registry rev 1707.
- Vendored fixtures: `test/fixtures.mjs` is byte-identical JSON to the spec candidate's fixtures.json (16 cases: 10 core, 3 error, 3 controller). Source fixtures.json SHA-256: `8e0a8d13536198c84e866ecf32f250b35ef38d31a551aec13a958ced11f5469e`.
- Production branch: `muse/hba1c-converter-production-20261121`, base `codex/initial-publication` @ `8c265267`.
- Environment: Node v24.22.1, no dependencies installed or needed (zero runtime/dev dependencies).

## Commands and results (all exit 0 unless noted)

- `node --test test/*.test.mjs` — **41/41 pass** (core 19 incl. all 13 literal SPEC core fixtures in the loop; controller 7 incl. all 3 controller fixtures; report 5; html 8; build 2).
- `node scripts/check.mjs` — all static checks pass (package contract, required files, core purity, no forbidden sinks, pinned 7% fixture + canonical report bytes, HTML metadata/id parity, disclaimer, category table, SPEC title/description/FAQ strings, i18n key parity).
- `node scripts/build.mjs --mode preview` run twice — byte-identical. BUILD-MANIFEST.json SHA-256 (both runs): `22742db9b44939867d6e805bb2099ababf0b669225630dc9c37d360c1dcb27e3`. Sorted per-file SHA-256 list of dist-preview/ hashed: `bf9bd3c374cc6016af71b055cee4469bde6f8d5f0905f27b04f171deb92ae616` (both runs).
- `node scripts/check-generated.mjs --mode preview` — pass (dist-preview matches BUILD-MANIFEST.json, 10 files; preview metadata; embedded worker source equals fixed core + handler bytes; robots.txt denies all).
- `node --check` on every shipped .js/.mjs file — pass. The embedded worker source (9,874 bytes, extracted from dist-preview/js/worker-source.js) parses as ESM.
- Loopback serve probe (in test/build.test.mjs): both language pages return 200 with correct titles and `X-Robots-Tag: noindex,nofollow`; traversal (`/../package.json`) and missing files return 404.

## What was verified by hand (not from the implementation)

- All 10 core fixture expected values were re-derived from the SPEC §5 formulas before the core was written (AUTHOR-CHECK.md's two-method derivation agrees); the test loop compares `run()` output against the SPEC literals only.
- Category cut points: 5.69 normal, 5.70 prediabetes, 6.49 prediabetes, 6.50 diabetes-range.
- Per-unit endpoints accepted (3.0/20.0 %, 9.29/195.08 mmol/mol, 39.40/527.30 mg/dL, 2.19/29.29 mmol/L) and just-outside values rejected with RANGE.
- Report bytes for A1c 7%: `{"a1cPercent":"7.00","category":"diabetes-range","eagMgdl":"154","eagMmoll":"8.6","ifcc":"53"}` + LF, hand-written in the test.
- Controller fixtures replayed with a fake worker; late results from cancelled/replaced generations are dropped and the visible state is preserved.

## Interpretations (not spec changes)

1. **Per-unit range check is on the raw input.** The SPEC table's bounds are the rounded display values of the exact canonical endpoints (IFCC 9.29 derives to A1c% 2.99996). Checking the raw input is the only reading under which the SPEC's own endpoint tests are all accepted. If the reviewer intended canonical-range checking, IFCC 9.29/195.08 would fail — flagged as a spec-errata candidate.
2. **Leading zeros accepted.** The SPEC grammar ("1–3 位整數位") is a digit-count rule, so "07" parses as 7. No fixture covers it; if the reviewer intended a no-leading-zero rule, that is a spec clarification.
3. **Edit from empty goes dirty.** The SPEC state table says any input change revokes the old result and shows "Input changed. Run again."; the controller therefore moves to dirty on any changed edit, including from empty.
4. **Late-generation guard compares the live counter.** During testing, a destroy-then-deliver case showed the ring-size-style closure comparison (`data.generation !== postedGeneration`) still accepts a superseded generation's reply while a newer job is busy. The controller compares against the live generation counter instead (and the error handler checks worker identity). Behaviour difference vs the template: none in production (a terminated worker cannot post), strictly stronger in tests.

## Spec-errata candidates (spec problems, not silently fixed)

1. **UNICODE code has no error-table row.** The SPEC inputsOutputs prose mentions an UNICODE code for unpaired surrogates ("先容量、再 surrogate、再該欄文法"), but the error-message table lists no UNICODE row and no zh/en wording. Implementation: unpaired surrogates fail the ASCII grammar (value → NUMBER_FORMAT) or the enum (unit → SCHEMA). No fixture outcome is affected.
2. **Range endpoints vs canonical range (see interpretation 1).** The SPEC never states whether the per-unit ranges are checked on the raw input or on the derived canonical A1c%. The two readings disagree at the IFCC endpoints (9.29 → 2.99996%, 195.08 → 19.99955%). Implementation checks the raw input so the SPEC-named endpoints pass.
3. **ADA mmol/L table discrepancy — already disclosed in the SPEC, recorded here only.** The ADAG formula gives 10.2/11.0 mmol/L at A1c 8.0%/8.5% where the ADA table prints 10.1/10.9. Implementation follows the ADAG formula per SPEC §5 and the FAQ states the difference. Not a new finding.

## NOT_RUN (explicitly not claimed)

- Real-browser evidence (Chrome/Edge, both languages, keyboard, 320 px, 200% zoom, reduced motion, touch targets, contrast): no isolated browser was available to this agent; the SPEC's nine-aspect browser gates remain NOT_RUN for the independent reviewer.
- Network/Storage observation in a clean isolated profile, offline-after-load check, and native file-picker/download dialog: NOT_RUN (Node/serve probes above are not browser evidence).
- Worker execution in a real browser: the worker source parses as ESM and the controller logic is tested with a fake worker, but a live module-Worker-from-Blob run was not observed.
- Formal HTTPS/SEO, deployment, and catalog integration: not part of this build-first candidate.

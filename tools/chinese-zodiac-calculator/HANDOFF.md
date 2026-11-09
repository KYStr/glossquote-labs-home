# Handoff — Chinese Zodiac Calculator （生肖計算機） production candidate

## Fixed spec source

- Spec task: `labs-chinese-zodiac-calculator-spec-20261109`
- Spec candidate commit: `b68311b57e79ddbbae922a0672b4bd8fe299ba3a`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/173
- Spec documents read in full before building: `BRIEF.md`, `SPEC.md` (8 sections), `fixtures.json` (15 cases), `AUTHOR-CHECK.md`, from the spec author's workdir `build4/specs/chinese-zodiac-calculator/docs/specs/chinese-zodiac-calculator/`. The spec PR is not merged into this candidate's base, so `test/fixtures.json` is a verbatim copy of the spec's fixtures (specId `spec-chinese-zodiac-calculator-20261109`) and the CNY table in the core is generated verbatim from the SPEC.md table.
- Mode: build-first production candidate for independent review. Not accepted, not merged, not published. No registry/coordination commands were run by this builder, per the assignment.

## Base

- Branch: `muse/chinese-zodiac-calculator-production-20261109`
- Base commit (tip of `codex/initial-publication` at fetch time): `c08e3243f0257f80fa512d15b1c37fcbeb6ef962`
- Scope: only `tools/chinese-zodiac-calculator/` was created; no other path was touched.

## What was built

A bilingual (zh-Hant default, English) static tool that looks up the Chinese zodiac sign for a Gregorian birth date using the pinned Chinese New Year table (78 rows, zodiac years 1959–2036; 1959 and 2036 are boundary rows):

- `public/js/core/zodiac.mjs` — pure core, no DOM/network/storage, no `Date`: schema validation (plain object, exactly `birthDate` + `asOfDate`, data properties, strings), per-field validation in the SPEC's order (INPUT_LIMIT 32 code units → UNICODE → EMPTY → DATE_FORMAT → DATE_INVALID → OUT_OF_RANGE; birth 1960-01-01…2035-12-31, as-of 1960-01-01…2036-12-31, no cross-field order check), zodiac-year determination by the CNY day boundary (the CNY day itself belongs to the new year), animal/stem indices `(Z−4) mod 12` / `(Z−4) mod 10`, zodiac-year span (CNY(Z) … CNY(Z+1)−1 day), Ben Ming Nian reading and the next Ben Ming Nian year with its CNY start when that year is still inside the table (≤ 2036), otherwise a null start. All date math is integer day-number arithmetic (Hinnant civil conversions), so results are timezone-independent. Includes the canonical report serializer (compact JSON, keys sorted by UTF-16 code units, one trailing LF, 2 MiB OUTPUT_LIMIT, hostile `toJSON` never invoked).
- `public/js/controller.mjs` — flow states empty/dirty/busy/success/error/cancelled with generation-guarded worker runs; editing during a run retires it; late results never overwrite newer state; the report is available only in the success state.
- `public/js/worker-handler.mjs` — worker fragment; the preview build concatenates core + handler into the embedded worker source the page runs from a Blob URL.
- `public/js/app.js` — DOM wiring with textContent/value only; renders the headline in the SPEC's fixed format （生肖：龍（Dragon）· 甲辰年 / "Sign: Dragon · Jia-Chen year", pinyin as a display-only layer), the summary rows including the pinned before-CNY note and Ben Ming Nian rows, the fixed CNY-vs-Li-Chun disclosure, and the pinned CNY table from the core's literal data.
- `public/index.html` + `public/en/index.html` — the SPEC-pinned titles, descriptions, H1s, field labels, primary button （查詢生肖 / Find my sign), FAQ answers, help texts and draft-loss note; preview noindex; no canonical/hreflang; same-language home links via `../../`.
- `scripts/{build,check,check-generated,serve}.mjs` — reproducible preview build (byte-identical across runs), static checks, generated-output verification, loopback-only preview server.
- `test/{core,controller,report,site}.test.mjs` — the spec's 12 core + 3 controller fixtures replayed verbatim, CNY-table self-consistency (78 rows, Jan 21–Feb 20, legal year gaps), ganzhi formula anchors, derived endpoint/Ben Ming Nian/validation-order cases, canonical report byte literals, and page-structure checks.

## Deviations

- The SPEC's §implementation path sketch names `src/*.mjs` modules; the implementation follows the repo handbook layout instead (`public/js/core/zodiac.mjs`, `public/js/controller.mjs`, `public/js/worker-handler.mjs`, `public/js/app.js`). Behaviour, field names, error codes and pinned strings are unchanged; only file locations follow the house contract, as with the sibling tools.
- No other deviations. No spec-errata candidates were found: before building, an independent scratch recomputation from the SPEC's stated rules (parsing the CNY table out of SPEC.md) reproduced all 12 core fixtures exactly, and the built core reproduces them as well.

## Next owner

Independent reviewer: verify this candidate commit against the fixed spec (nine product aspects), including the NOT_RUN items listed in VERIFICATION.md.

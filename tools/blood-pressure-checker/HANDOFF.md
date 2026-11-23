# Blood Pressure Checker （血壓分級）— Production HANDOFF

- Spec: `spec-blood-pressure-checker-20261121`, draft spec PR #368
  (base `codex/initial-publication`, head
  `f8a034e4c1bd81c3c21cb7fb221c0bb6fec8f683`, OPEN at build time).
  Registry rev 1687 (per parent task).
- Spec source (fixed): `docs/specs/blood-pressure-checker/` at the spec
  PR head above — `SPEC.md` (8 sections), `BRIEF.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`. `test/fixtures.json` in this tool is a
  byte-identical vendored copy (SHA-256
  `67dc8ed880c781d72cb2ff375ec9483aefb2a4f8ada80f491c676c8fd4f4e7a5`,
  verified against the spec PR head via the GitHub API).
- Production target: `tools/blood-pressure-checker/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/blood-pressure-checker-production-20261121`, base
  `codex/initial-publication`. Build-first (no registry production
  registration in this run, per the run-6 production mode: build +
  draft PR + parent verification + ledger).
- Builder: run-6 production builder subagent (parent orchestrator
  session 10a52e6e-ad9e-4c7e-97d3-7dceb5ab61ff). User confirmed
  continuation four times on 2026-11-23 (14:31, 14:33:56, 14:58:49,
  15:04:46); the same execution-risk prompt class that stopped the
  first production wave at clone/fetch re-appeared during this build
  (on the `find` read of the run-5 exemplar directory) and was
  continued past under that authorization — glossquote-repo content
  only, no other content, credentials, outbound sends, or deletion
  involved.

## What was built

- Pure core `public/js/core/blood-pressure.mjs`: `run(input)` validates
  in the SPEC order (capacity INPUT_LIMIT → surrogate UNICODE → EMPTY
  → INTEGER_FORMAT → RANGE, systolic before diastolic, then the
  cross-field diastolic ≤ systolic RANGE), classifies by the pinned
  AHA/ACC 2017 table in first-match order (crisis → stage2 → stage1
  → elevated → normal), and returns the fixture-shaped result
  `{systolic, diastolic, category, categoryZh, categoryEn}`. The
  pinned category table (names + one general reminder per category,
  both languages) and the pinned disclaimer are exported from the core
  and rendered by the UI. Fixed report `blood-pressure-report.json`
  (canonical JSON, UTF-16 key order, one trailing LF, 2 MiB limit).
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions, h1,
  FAQ answers, disclaimer in both languages, preview noindex, no
  canonical/hreflang, same-language home links (`../../` /
  `../../en/`), draft-loss note. Crisis results show a text + symbol
  (⚠) prompt to seek care promptly, not colour alone.
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **Result shape: SPEC §4 lists `adviceZh`/`adviceEn` in the result,
   but all 17 literal core fixtures omit them.** The implementation
   follows the fixtures (the deep-equal acceptance contract: "對每個
   expected 深度比對") and renders the pinned advice in the UI from
   the `CATEGORIES` table instead. If the reviewer wants advice in the
   result, the fixtures (and §4) must be revised together.
2. **Report content: SPEC §5 says the pinned disclaimer is shown in
   "結果區與報告" (results area and report), but §4 fixes the report
   content as "result 的 compact JSON" and the fixtures' result has
   no disclaimer field.** The implementation keeps the report as the
   canonical JSON of the result only (byte-exact against the fixture
   derivation) and shows the disclaimer in the results area of both
   pages. If the disclaimer belongs in the report bytes, §4 and the
   fixtures must be revised together.
3. **Fixture vs SPEC order: `decimal-systolic` ("120.5") expects
   `INTEGER_FORMAT`, but the SPEC's pinned validation order is
   capacity → surrogate → grammar, and "120.5" is five raw units
   against a four-unit limit.** The implementation follows the SPEC
   text (`INPUT_LIMIT`); the fixture's decimal-rejection purpose is
   covered by the four-unit value "12.5" in the tests. Suggested fix:
   change the fixture input to "12.5" (or revise the SPEC order).
   The other 16 core fixtures match the implementation exactly.
4. **Task-brief path note:** the parent task cited the spec at
   `home clone docs/specs/blood-pressure-checker/`; the actual fixed
   spec used here lives in the run-6 spec workspace
   `build6/specs/blood-pressure-checker/docs/specs/blood-pressure-checker/`
   (same content, verified byte-identical fixtures against spec PR
   #368 head `f8a034e4…`). No content difference; only the path in the
   brief was stale.

## Verification

See `VERIFICATION.md` for commands, exits, test counts, and the two
build hashes. Browser / Network / Storage / compatibility evidence is
NOT_RUN (no isolated browser available to this builder; see
VERIFICATION.md) — the independent reviewer must run the nine-aspect
gates on the same PR head.

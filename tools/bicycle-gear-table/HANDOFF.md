# Bicycle Gear Rollout Table — production candidate handoff

- **Tool:** Bicycle Gear Rollout Table / 單車齒比與展開表
- **Repo:** `KYStr/glossquote-labs-home`
- **Branch:** `muse/bicycle-gear-table-production-20261109`
- **Base:** `codex/initial-publication` — base commit `c0a7fa3` (fetch tip at build time)
- **Candidate commit:** head of PR #118 at submission (this branch head; see below)
- **PR:** https://github.com/KYStr/glossquote-labs-home/pull/118 (draft, base `codex/initial-publication`)

## Fixed source

- **Spec:** `docs/specs/bicycle-gear-table/SPEC.md` — spec ID `spec-bicycle-gear-table-20261109`, v1, 2026-11-09, B 組預案
- **Brief:** `docs/specs/bicycle-gear-table/BRIEF.md`
- **Fixtures:** `docs/specs/bicycle-gear-table/fixtures.json` (8 cases: 6 solve + 2 flow)
- **Author check:** `docs/specs/bicycle-gear-table/AUTHOR-CHECK.md`
- **House format:** `docs/IMPLEMENTATION-CHECKLIST.md`, `docs/SOURCE-LAYOUT.md`, `docs/TOOL-DESIGN-BASELINE.md` (same consolidated-format contract as the 2026-11-09 run-2/run-3 builds: implementation lives only in `tools/<slug>/`)

## Registry

- **Task:** `labs-prod-bicycle-gear-table-20261109`
- **Claim:** `muse-main-claim-bicycle-gear-table-20261109T081158Z-w4` (claimed by the parent actor; workMayStart verified by the parent)
- This build ran no coordination/registry commands. The parent submits this candidate to the registry after verifying the PR head.

## Allowed scope

Only `tools/bicycle-gear-table/` was created or changed. No other path was touched; the registry was not written.

## What was built

Pure core `public/js/core/bicycle-gear-table.mjs` (`solve`, `createFlow`,
`parseIntegerField`, `formatTenths`, `EXAMPLE`) implementing the SPEC
exactly: strict size → shape → field validation in the SPEC's order
(TYPE/RANGE/SHAPE/DUPLICATE with fixed JSON Pointer paths), exact reduced
ratios by gcd with equal-ratio grouping, groups sorted ascending by exact
ratio via cross-multiplication, rollout and speed rounded half-up to 0.1 mm /
0.1 km/h exactly once with BigInt exact arithmetic (largest speed numerator
10,800,000,000, as the SPEC pins), and the runId-gated flow executor (edit
invalidates, stale settles are dropped).

Bilingual pages (`public/index.html` zh-Hant, `public/en/index.html` en) with
the wheel/cadence form, dynamic front (1–3) and rear (1–16) teeth rows with
add/remove, load example (the `bicycle-gear-table.group-ratios` fixture),
clear draft, busy + cancel, field-linked errors with focus to the first
error, a grouped results table (ratio, combos, rollout, theoretical speed)
plus a theory note, preview noindex, canonical + hreflang + x-default
(Chinese), and same-language home links. Fully local: no fetch, no storage,
no analytics, no remote fonts; CSP header served by `scripts/serve.mjs`
matches the SPEC.

## Build-first mode

Independent bulk review is pending; this candidate is NOT accepted, NOT
merged and NOT published. Real-browser interaction, real devices/touch,
assistive tech, measured contrast and deployment are NOT_RUN (see
VERIFICATION.md).

## Notes for the reviewer

- SPEC §8's own-repo handoff wording (a `src/` layout and one-tool-one-repo
  file list) is superseded by the 2026-11-09 consolidation rules: this tool
  lives in `tools/bicycle-gear-table/` in the shared repo, per the task
  contract and the run-2/run-3 format.
- The SPEC's preview SEO table pins the glossquote.com home links and
  canonicals; the preview pages keep `noindex,nofollow` and no sitemap.
  The production build (`--origin <confirmed HTTPS origin>`) removes the
  noindex and writes robots.txt + sitemap.xml listing exactly the two
  canonicals.
- No spec errata: every printed fixture reproduces exactly from the SPEC's
  own rules. Two SPEC-silent interpretations are recorded in VERIFICATION.md
  (array-length errors use RANGE at the array path; the form shows all
  invalid fields at submit while `solve` returns the first error).

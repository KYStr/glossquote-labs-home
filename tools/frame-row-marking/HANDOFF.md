# Frame Row Marking — production candidate handoff

- **Tool:** Frame Row Marking / 相框掛點定位
- **Repo:** `KYStr/glossquote-labs-home`
- **Branch:** `muse/frame-row-marking-production-20261109`
- **Base:** `codex/initial-publication` — base commit `5e8fab03c00fba01bca68b1dd80280eb380b9bd6`
- **Candidate commit:** head of PR #115 at submission (this branch head; see below)
- **PR:** https://github.com/KYStr/glossquote-labs-home/pull/115 (draft, base `codex/initial-publication`)

## Fixed source

- **Spec:** `docs/specs/frame-row-marking/SPEC.md` — spec ID `spec-frame-row-marking-20261109`, v1, 2026-11-09, B 組預案
- **Brief:** `docs/specs/frame-row-marking/BRIEF.md`
- **Fixtures:** `docs/specs/frame-row-marking/fixtures.json` (8 cases: 6 solve + 2 flow)
- **Author check:** `docs/specs/frame-row-marking/AUTHOR-CHECK.md`
- **House format:** `docs/IMPLEMENTATION-CHECKLIST.md`, `docs/SOURCE-LAYOUT.md`, `docs/TOOL-DESIGN-BASELINE.md` (same consolidated-format contract as the 2026-11-09 run-2 builds: implementation lives only in `tools/<slug>/`)

## Registry

- **Task:** `labs-prod-frame-row-marking-20261109`
- **Claim:** `muse-main-claim-frame-row-marking-20261109T080200Z-w3` (claimed by the parent actor; workMayStart verified by the parent)
- This build ran no coordination/registry commands. The parent submits this candidate to the registry after verifying the PR head.

## Allowed scope

Only `tools/frame-row-marking/` was created or changed. No other path was touched; the registry was not written.

## What was built

Pure core `public/js/core/frame-row-marking.mjs` (`solve`, `createFlow`,
`parseIntegerField`, `validateNameField`, `formatMm`) implementing the SPEC
exactly: strict field/shape/type/range/enum/duplicate/offset/size validation
in the SPEC's order, exact-fraction gap and coordinates, each absolute
coordinate and the gap rounded half-up to 0.1 mm exactly once (BigInt exact
arithmetic, never from a displayed value), infeasible results with the
deficit in mm, and the runId-gated flow executor (edit invalidates, stale
settles are dropped).

Bilingual pages (`public/index.html` zh-Hant, `public/en/index.html` en) with
the wall/frame form, move-up/down/reorder, add/remove (2–12 frames), load
example (the `frame-row-marking.center` fixture), clear draft, busy + cancel,
field-linked errors with focus to the first error, a proportional wall diagram
plus the marks table as its text equivalent, preview noindex, canonical +
hreflang + x-default, and same-language home links. Fully local: no fetch,
no storage, no analytics, no remote fonts; CSP header served by `scripts/serve.mjs`
matches the SPEC.

## Build-first mode

Independent bulk review is pending; this candidate is NOT accepted, NOT
merged and NOT published. Real-browser interaction, real devices/touch,
assistive tech, measured contrast and deployment are NOT_RUN (see
VERIFICATION.md).

## Notes for the reviewer

- SPEC §8's own-repo handoff wording (a `src/` layout and one-tool-one-repo
  file list) is superseded by the 2026-11-09 consolidation rules: this tool
  lives in `tools/frame-row-marking/` in the shared repo, per the task
  contract and the run-2 format.
- The production build (`npm run build:production -- --origin <confirmed HTTPS origin>`)
  exists per the SPEC handoff; the preview canonicals already point at
  `https://glossquote.com/tools/frame-row-marking/…` because the SPEC itself
  names `https://glossquote.com/` as the home page. No other domain was
  invented.
- No spec errata were found: all 8 printed fixtures reproduce exactly.

## Next owner

Independent reviewer (parent submits the candidate to the registry).

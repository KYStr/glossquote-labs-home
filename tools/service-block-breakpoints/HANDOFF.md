# Handoff — Studio Visit Fee Breakpoints

Fixed product candidate for independent review. The parent submits this
candidate to the registry after verifying the PR head.

- Tool: `service-block-breakpoints` — 工作室次數費用交會表 / Studio Visit Fee Breakpoints
- Spec: `spec-service-block-breakpoints-20261109` v1
  - Source repository: `KYStr/glossquote-labs-home`
  - Source commit (spec): `c8edde6a8d2a83d69a5ef863057184d0ee5022d0`
  - Spec path: `docs/specs/service-block-breakpoints/SPEC.md`
  - Brief: `docs/specs/service-block-breakpoints/BRIEF.md`
  - Fixtures: `docs/specs/service-block-breakpoints/fixtures.json`
  - Author check: `docs/specs/service-block-breakpoints/AUTHOR-CHECK.md`
- Registry task: `labs-prod-service-block-breakpoints-20261109`
- Claim: `muse-main-claim-service-block-breakpoints-20261109T084450Z-w7s`
  (claimed by the parent actor via single apply; the apply-batch route
  refused a one-item batch with BATCH_INCOMPLETE because only one ready
  task remained in the registry.)
- Allowed scope: `tools/service-block-breakpoints/` only. Nothing outside
  this directory was touched; no registry commands were run by the
  builder.
- Base branch: `codex/initial-publication` (see VERIFICATION.md for the
  exact base SHA; the candidate branch is
  `muse/service-block-breakpoints-production-20261109`).
- Next owner: independent reviewer (nine-aspect review of the fixed
  candidate commit; the parent submits the candidate to the registry).

## Implementation notes for the reviewer

- Pure core `public/js/core/solve.mjs` implements the SPEC exactly:
  validation order SIZE → root SHAPE → fields in table/array input
  order → cross-field DUPLICATE (plan names) → BAND_ORDER per plan.
  Pricing is integer-only in minor units: progressive bands are marginal
  on extra visits `x = max(0, v − included)`; blocks use
  `ceil(x / blockSize) × blockMinor + baseMinor` with zero blocks at
  `x = 0`; the base fee is charged even at 0 visits. Relations are
  compared per visit count and merged into maximal spans, preserving
  multiple crossings.
- The app solves a valid draft on the next event-loop work item
  (`setTimeout(0)`) under a runId guard, per the SPEC's async contract;
  there is no separate worker file and no fabricated progress.
- No one-decimal values exist in this tool: every amount is an integer
  in minor units, so the SPEC's half-up tenths rule has nothing to
  format. Display uses `Intl.NumberFormat` on the already-computed
  integer values only.
- No ratios are compared in this tool; relation is a direct integer
  comparison of the two plans' minor-unit totals.
- SPEC-silent interpretations (recorded for the reviewer):
  - A plan with a length other than exactly 2 rows reports RANGE at
    `/plans`; a bands array outside 1–5 rows reports RANGE at
    `/plans/<i>/bands` (array-length errors use RANGE at the array path).
  - A non-string or out-of-enum `type` reports ENUM at
    `/plans/<i>/type`.
  - A blank numeric form field reports form-level SYNTAX; a blank plan
    name is passed to the core and reports RANGE.
  - A blank band row (both fields empty) is skipped as absent; a blank
    `upTo` on a kept row means null (open), so a non-last blank bound
    reports BAND_ORDER from the core.
  - The SPEC handoff lists a `src/` file layout and production build
    scripts; this candidate follows the consolidated house format
    (`public/js/...`, preview-only build, production refused without an
    approved origin), matching the sibling tools in this run.
  - Preview pages use relative canonical links; the SPEC-pinned
    `glossquote.com` home links are kept as the same-language home
    links, and the production canonical/sitemap are reserved for the
    production build.

## Spec errata

None — every printed fixture reproduces exactly from the SPEC's own
rules. No fixture-vs-rule conflict was found.

## Known limits

- Real-browser rendering/interaction, real devices/touch, assistive
  tech, measured contrast, Network/Storage audit, deployment and the
  independent nine-aspect review are NOT_RUN (see VERIFICATION.md).

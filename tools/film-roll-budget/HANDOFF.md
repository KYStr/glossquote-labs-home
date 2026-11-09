# Handoff — Film Roll Frame Budget

Production candidate for `KYStr/glossquote-labs-home`, built in the
consolidated format (handbook `docs/AGENT-HANDBOOK.md`).

## Fixed source

- Spec: `spec-film-roll-budget-20261109` v1,
  `docs/specs/film-roll-budget/SPEC.md` (+ `BRIEF.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`), read in full from base commit
  `23c1d5f70db16e8bd0086259156243c5a57f8785` on branch
  `codex/initial-publication`.
- Registry task: `labs-prod-film-roll-budget-20261109`
- Registry claim: `muse-main-claim-film-roll-budget-20261109T082402Z-w5`
  (claimed by the parent actor; workMayStart verified by the parent).
  This builder ran no registry commands; the parent submits the
  candidate after verifying the PR head.

## Allowed scope

Only `tools/film-roll-budget/` was touched. Nothing outside that
directory was modified; `docs/specs/` and the registry were not written.

## What was built

Pure core `solve(data)` per the SPEC: strict validation (root type →
SIZE 65536 bytes → root/row SHAPE → per-field in table and array input
order → cross-field ORDER: reserve ≤ remaining, then wanted ≥ min per
row), then allocation — minimums first, then priority 3 → 1 round-robin
in input order, one frame per scene per round, skipping scenes at
wanted; `spare` is unallocated and unreserved, `unmet = wanted −
planned`, deficit returns `spare: null, rows: []`.

Pure flow controller (`empty → dirty → busy → ready | error`) with
runId gating; the app solves in the next event-loop work item
(`setTimeout(0)`, per the SPEC) and revokes the scheduled item on
cancel/edit. Bilingual pages (zh-Hant + en) with the SPEC's exact
titles/descriptions/H1, preview `noindex,nofollow`, relative canonical
+ hreflang (zh-Hant/en/x-default), same-language home links via
`../../` / `../../en/`. Sample is the literal fixture
`film-roll-budget.priority-rounds`.

## Interpretations recorded for the reviewer (SPEC-silent)

- Preview canonical/home links are relative, following the consolidated
  house format. The SPEC-pinned production home links
  (`https://glossquote.com/index.html` and `/en/index.html`) belong to
  the production build, which needs a coordinator-confirmed HTTPS
  origin; `build:production` is refused until one is approved.
- The SPEC handoff lists a `src/` file layout and production build
  scripts; this candidate follows the consolidated handbook layout
  (`public/js/...`, preview-only build), matching the sibling tools in
  this run.
- Form-level blank/malformed numbers report `SYNTAX` at the field path
  (the SPEC's raw-text rule); blank scene names report `RANGE` via the
  shared name rule. Fully blank scene rows are not silently skipped:
  every row is validated, so a submit with an empty row reports the
  first empty field.
- No Worker: the SPEC pins the pure core to run in the next event-loop
  work item, which the app does with a runId-guarded `setTimeout(0)`
  settle; the worst case (16 scenes × 200 frames) is a short
  synchronous pass, so no progress UI is fabricated.

## Spec errata

None. All 8 printed fixtures reproduce exactly from the SPEC's own
rules.

## Verification

See `VERIFICATION.md`. `npm test` 27/27, `npm run check` pass,
`build:preview` ×2 byte-identical, `check:generated:preview` pass,
loopback HTTP probe 200s. Real-browser rendering/interaction, real
devices/touch, assistive tech, measured contrast, Network/Storage
audit, deployment and independent nine-aspect review are NOT_RUN.

## Next owner

Independent reviewer (parent submits this candidate to the registry).
Do not merge, publish or deploy from this candidate without review.

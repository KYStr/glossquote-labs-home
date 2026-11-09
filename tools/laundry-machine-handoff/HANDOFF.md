# Handoff — Laundry Machine Handoff

## Fixed source

- Spec: `spec-laundry-machine-handoff-20261109` v1, `docs/specs/laundry-machine-handoff/` in `KYStr/glossquote-labs-home` (SPEC.md, BRIEF.md, fixtures.json, AUTHOR-CHECK.md), read at base commit `fb55ef262642744147d01db9b2fcbc82cc8b76e1` (`codex/initial-publication`).
- Registry task: `labs-prod-laundry-machine-handoff-20261109`
- Claim: `muse-main-claim-laundry-machine-handoff-20261109T083325Z-w6` (parent actor; workMayStart verified by the parent).
- Candidate: this branch's head commit (tool commit
  `9e964be1925382254c492cf0c4356384de8feed0`, PR
  https://github.com/KYStr/glossquote-labs-home/pull/132; see
  VERIFICATION.md).

## Allowed scope

Only `tools/laundry-machine-handoff/` was added or changed. No registry
commands were run by this builder; no other repo path was touched.

## What was built

A bilingual (zh-Hant / en) static tool that plans washer-to-dryer slots
for one day: working window, up to 16 busy intervals per machine, 1–8
loads in fixed order, each with wash/dry minutes and a max wait limit.
`public/js/core/solve.mjs` implements the SPEC's validation order
(SIZE → SHAPE → fields in table/array order → DUPLICATE → ORDER) and the
greedy earliest-feasible scheduling rule (half-open occupancy tables,
reverse scan for the earliest dryer start, forward scan for the earliest
wash minute). The app runs the pure core on the next event-loop work
item (`setTimeout(0)`) under a runId guard, with cancel, clear-draft,
sample load (the `delayed-wash` fixture), field-linked errors with focus,
a two-track timeline plus a results table, and a blocked-load notice
with next steps. No network, storage, analytics, CDN or remote fonts;
all user text is rendered with `textContent`/`value` only.

## Spec-errata candidates

None — all printed fixtures reproduce exactly from the SPEC's own rules.

## SPEC-silent interpretations (for the reviewer)

1. **DUPLICATE vs ORDER order**: the SPEC pins the ORDER checks
   (window, then washerBusy, then dryerBusy) but does not place
   DUPLICATE relative to them. This build checks DUPLICATE after all
   per-field validation and before the ORDER checks.
2. **Name failure codes**: a non-string name is TYPE; an empty or
   over-24-code-point name is RANGE; a bad first/later character is
   TYPE (same convention as the sibling run-3 tools).
3. **Layout**: the SPEC's handoff section lists a `src/` file layout
   and production build scripts; this build follows the consolidated
   handbook format (`public/js/...`, preview-only build), matching the
   other run-3 tools. Production build is refused without an approved
   origin; no production origin is approved and nothing was deployed.
4. **Form-level syntax**: blank or malformed time/number fields are
   reported as SYNTAX at the field path by the app before the core
   runs; the core itself only ever sees parsed integers.
5. **Blank rows**: a fully blank busy/load row is skipped when the app
   builds the draft. Error paths use compact (core) row indices, and
   the app keeps a compact→state row map so error focus lands on the
   right row.

## Verification

See `VERIFICATION.md` (test counts, build byte-identity, HTTP probe,
explicit NOT_RUN list). Node v24.22.1, offline.

## Next owner

Independent reviewer (the parent submits this candidate to the registry).
The reviewer must re-derive the fixtures, run the real-browser /
device / assistive-tech / Network-and-Storage checks, and score the
nine fixed aspects on this exact candidate commit.

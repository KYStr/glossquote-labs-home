# Gift Exchange Match — Production Handoff

## Fixed source

- Spec: `docs/specs/gift-exchange-match/SPEC.md` (`spec-gift-exchange-match-20261109`, v1), with `BRIEF.md`, `fixtures.json` (8 cases) and `AUTHOR-CHECK.md`, in repo `KYStr/glossquote-labs-home`.
- Spec base commit for this build: `23c1d5f70db16e8bd0086259156243c5a57f8785` (`codex/initial-publication`).
- Branch: `muse/gift-exchange-match-production-20261109`.
- Registry production task: `labs-prod-gift-exchange-match-20261109`.
- Registry claim: `muse-main-claim-gift-exchange-match-20261109T082402Z-w5` (claimed by the parent actor; workMayStart verified by the parent).
- Candidate commit and PR: the PR head (verified by the parent, then
  submitted to the registry). Implementation commit:
  `d241a8b8d8dc6baab83fa1f510ec493e32672d6f`; draft PR:
  https://github.com/KYStr/glossquote-labs-home/pull/127.

## Allowed scope

Only `tools/gift-exchange-match/` was created or changed. No registry
commands were run by this builder; no other path was touched. The parent
submits the candidate to the registry.

## What was built

A deterministic gift-exchange matcher: 3–16 participants, directed
blocked edges (0–240), one gift out and one in per person, self-giving
implicitly excluded, mutual exchange allowed. The solver tries
recipients in input order per giver and locks the first tentative pick
whose remaining givers still admit a complete matching (augmenting-path
check), per SPEC implementation rule 2. The result lists givers with
recipients hidden; one card is revealed at a time and switching givers
needs one more click to reveal the new giver, per the SPEC tests
section. The search runs in the module worker in batches of at most one
feasibility check (<= 256 edge attempts, below the 4,096-step batch
cap), with runId guards and cancel support; a synchronous fallback
produces the same result if the worker cannot start.

## Format notes for the reviewer

- The SPEC handoff section lists a `src/` layout (`src/core.mjs`,
  `src/app.mjs`, …). This build follows the consolidated house format
  (`public/js/core/…`, `public/js/app.js`, `public/js/worker.mjs`,
  preview-only `build:preview`) used by the other tools in this run,
  per `docs/IMPLEMENTATION-CHECKLIST.md`.
- Preview pages use relative canonicals and `../../` same-language home
  links; the SPEC's `glossquote.com` home/canonical values are
  production-build values that need an approved HTTPS origin, so the
  production build is refused (as in the sibling tools).
- Cross-field order: refs are checked for all rows first (from then to,
  row order), then `SELF_RULE`, then duplicate directions — the order
  listed in SPEC implementation rule 1.
- A half-filled blocked row in the form is a `SYNTAX` error at the
  missing side (the SPEC pins no code for that form-level case); the
  core itself only sees complete rows.
- The sample is the fixed `gift-exchange-match.three` fixture
  (A, B, C, no blocks); loading it leaves the flow `dirty`.

## Verification

See `VERIFICATION.md` for commands, test counts, build identity, the
HTTP probe, the explicit NOT_RUN list and the spec-errata verdict.

## Next owner

Independent reviewer (nine-aspect review of the fixed candidate
commit). Do not merge, publish or deploy from this handoff alone.

# Cash Float Tray — Production Handoff

## Fixed source

- Repo: `KYStr/glossquote-labs-home`
- Base commit: `5e8fab03c00fba01bca68b1dd80280eb380b9bd6` (tip of `codex/initial-publication` at build time)
- Spec: `docs/specs/cash-float-tray/SPEC.md` (spec `spec-cash-float-tray-20261109`, v1, 2026-11-09, B 組預案), plus `BRIEF.md`, `fixtures.json` (schemaVersion 1, 8 cases), `AUTHOR-CHECK.md` — all read in full at the base commit.
- Branch: `muse/cash-float-tray-production-20261109`
- Candidate commit: the head of the draft PR opened from this branch against base `codex/initial-publication` (see the builder's completion report for the SHA and PR URL).

## Registry

- Task: `labs-prod-cash-float-tray-20261109`
- Claim: `muse-main-claim-cash-float-tray-20261109T080200Z-w3` (claimed by the parent actor; workMayStart verified by the parent)
- No coordination/registry commands were run by the builder. The parent submits this candidate to the registry after verifying the PR head.

## Allowed scope

Only `tools/cash-float-tray/` was created or changed. Nothing outside it was
touched; `docs/specs/` is untouched; no registry writes; nothing merged,
deployed or published.

## What was built

- Pure core `public/js/core/solve.mjs`: exact integer validation (SIZE/SHAPE/
  TYPE/RANGE/DUPLICATE with fixed JSON Pointer paths, in the SPEC's check
  order) and the bounded exact DP over sums 0..targetMinor — closest sum not
  above target, fewest pieces, then higher-denomination kept-vector tie-break.
  All money is integer minor units; no floats for money.
- Pure run-state machine `public/js/core/flow.mjs`: empty/dirty/busy/ready/
  error with runId-guarded settle; re-submit while busy ignored; cancel
  returns to dirty and invalidates the runId; late settles ignored.
- Bilingual pages (`public/index.html` zh-Hant, `public/en/index.html` en):
  target + 1–8 denomination rows, add/remove rows, example load
  (`cash-float-tray.exact`), clear draft, busy + Cancel, per-field errors
  with focus links, results table (kept/removed per row) + totals + shortfall
  note. Preview `noindex, nofollow`; canonical + hreflang + x-default;
  same-language home links (`../../` / `../../../en/`); no analytics, CDN,
  remote fonts, network or storage; all user text via `textContent`/`value`.
- `scripts/build.mjs` (reproducible preview build), `scripts/check.mjs`
  (static checks), `scripts/check-generated.mjs` (dist == public byte check),
  `scripts/serve.mjs` (loopback-only, emits the SPEC's CSP headers +
  `X-Content-Type-Options: nosniff`).
- Tests: all 8 literal fixture cases (6 solve + 2 flow) plus validation,
  algorithm-property and flow-transition suites — see VERIFICATION.md.

## Notes / deviations from the SPEC's suggested layout

- The SPEC's handoff section lists a `src/*.mjs` + `src/worker.mjs` layout
  with `npm.cmd` scripts. This candidate follows the consolidated
  `tools/<slug>/` layout from the task brief and `docs/IMPLEMENTATION-
  CHECKLIST.md` instead: `public/js/core/`, `public/js/app.js`,
  `scripts/*.mjs`, `test/*.test.mjs`, `HANDOFF.md`, `VERIFICATION.md`.
  SPEC §8's own-repo handoff wording is superseded by the 2026-11-09
  consolidation rules (implementations live in `tools/<slug>/` in this repo).
- No separate `src/worker.mjs`: the async run/cancel contract is implemented
  with a runId-guarded `setTimeout(0)` settle around the synchronous bounded
  DP (at most 8×10,001×100 candidate updates, 10,001 states per generation).
  The runId guard gives the same stale-reply protection as the SPEC's worker
  design (cancel-first and late-settle are both covered by tests); the DP is
  fast enough that a worker would add complexity without user-visible benefit.
  If a reviewer wants the worker, that is a follow-up, not a silent change.
- The formal production build (`build:production -- --origin <confirmed
  HTTPS origin>`, production canonical/sitemap/robots) is out of scope for
  this preview candidate: no production origin has been confirmed.

## Spec errata

None found — every printed fixture re-derives exactly from the SPEC's own
rules. (See VERIFICATION.md for the check that was run.)

## NOT_RUN

Real-browser rendering/interaction, real devices/touch, assistive tech,
measured contrast of the tool's own UI, cross-browser (Chrome/Edge) checks,
network/storage observation in a browser, deployment, production HTTPS
verification, and the independent nine-aspect review (pending by design in
build-first mode).

## Next owner

Independent reviewer (parent submits the candidate to the registry).

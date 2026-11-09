# Handoff — Card Sleeve Stock Fit (production candidate)

## Fixed source

- Repo: `KYStr/glossquote-labs-home`
- Base branch: `codex/initial-publication` @ `c0a7fa3601da3de3d726f1c74d139395e40223f3`
  (tip at build time; branch `muse/card-sleeve-fit-production-20261109`)
- Spec: `docs/specs/card-sleeve-fit/` — `SPEC.md`, `BRIEF.md`,
  `fixtures.json`, `AUTHOR-CHECK.md`; spec ID `spec-card-sleeve-fit-20261109` v1
- Registry task: `labs-prod-card-sleeve-fit-20261109`
- Registry claim: `muse-main-claim-card-sleeve-fit-20261109T081158Z-w4`
  (claimed by the parent actor; this builder ran no registry commands)

## Allowed scope

`tools/card-sleeve-fit/` only. Nothing outside this directory was touched.

## What was built

Max-flow (Edmonds-Karp) allocation of card groups to sleeve stock, per the
SPEC: compatibility when both axes' gaps fall in the closed interval
`[minGap, maxGap]`; source→card (cap qty), card→sleeve (cap card qty, card
order then sleeve order), sleeve→sink (cap stock); BFS in adjacency-append
order, augment by the path minimum residual, repeat to the cut.

- `public/js/core/solve.mjs` — `validate`, `solve`, `solveDetailed`,
  `solveSteps` (batched generator: yields every 4096 candidate edge
  examinations), `parseTenths` / `parseIntField` / `formatTenths`,
  `normalizeName`. No DOM/network/storage.
- `public/js/core/flow.mjs` — `createFlow` run-state machine
  (empty → dirty → busy → ready | error; cancel invalidates the runId;
  stale settles, including stale error replies, are ignored).
- `public/js/worker.mjs` — module worker, one per page, loaded at
  initialization. Runs `solveSteps` in ≤4096-step batches, scheduling the
  next batch through a `MessageChannel` so a posted cancel is read before
  the next batch; a superseded or cancelled run never posts a result.
  The app falls back to a runId-guarded synchronous settle if the worker
  cannot start.
- `public/js/app.js` — bilingual DOM controller (textContent/value only),
  dynamic 1–8 card/sleeve rows, per-field errors with focus to the first
  error, load-example (`card-sleeve-fit.reassign`), clear draft, bfcache
  reset via `pageshow`.
- `public/index.html` / `public/en/index.html` — zh-Hant/en, SPEC-pinned
  titles/descriptions, preview `noindex, nofollow`, relative canonical +
  hreflang (incl. `x-default` → zh-Hant), same-language home links per the
  SPEC's SEO table (`https://glossquote.com/index.html` /
  `https://glossquote.com/en/index.html`).
- `public/robots.txt` — preview: `Disallow: /` for all agents.
- `scripts/` — reproducible preview build (`dist/`), static checks,
  generated-output check, loopback-only serve (SPEC CSP + nosniff).

## Layout adaptation (SPEC vs house format)

The SPEC's handoff file list uses a `src/` layout (`src/core.mjs`,
`src/app.mjs`, `src/worker.mjs`, `dist/` / `dist-production/`). This
candidate follows the consolidated house format instead
(`public/js/core/…`, `public/js/app.js`, `public/js/worker.mjs`,
preview build to `dist/`), the same adaptation the other wave-3 tools
use. Behaviour and file roles are unchanged; only paths differ.

## Production build

Only the preview build is in this candidate. A formal production build
(removing preview noindex, HTTPS canonicals, sitemap + robots
announcement) needs a confirmed HTTPS origin from the coordinator and is
not part of this candidate.

## Spec errata

None — all 8 printed fixtures reproduce exactly from the SPEC's own rules.

## SPEC-silent interpretations (for the reviewer)

1. `-0` is rejected by the core as `TYPE` (it is a non-canonical integer
   literal; the form also rejects it).
2. Name failures other than a non-string (`TYPE`): empty after trim,
   over 24 code points, bad first character, or a disallowed character
   are all `RANGE` at the name path.
3. Unknown key → `SHAPE` at the containing object's path; missing key →
   `SHAPE` at the missing key's path.
4. Duplicate-name check runs after all field validations of both arrays
   (cards, then sleeves) and before the `ORDER` cross-field rule.
5. Form level: an empty or malformed numeric field is `TYPE` at that
   field's path; an empty name is `RANGE` (same as the core).
6. No valid input produces more than 4096 candidate steps (largest
   measured case, 8×500 cards against 8×1000 sleeves, takes 576 steps),
   so real runs finish inside the first worker batch. The inter-batch
   cancel path is therefore implemented per SPEC but not triggerable by
   any valid input; cancel correctness is covered by the flow machine
   (`cancel-then-late` fixture) and the runId guard in the app.

## Known limitations

- Real-browser rendering/interaction, real devices/touch, assistive tech,
  measured contrast, Network/Storage audit, deployment, and the
  independent nine-aspect review are all NOT_RUN (see VERIFICATION.md).
- The worker's in-browser execution (actual Worker run, cancel,
  Blob-less module worker) is NOT_RUN; the worker protocol is tested in
  Node with stubbed `globalThis` messaging.

## Next owner

Independent reviewer. The parent submits this candidate (PR head commit)
to the registry under the task/claim above; review the fixed commit
against the SPEC's nine aspects. Do not merge or deploy from this
candidate without that review.

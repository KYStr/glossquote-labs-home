# Verification — Laundry Machine Handoff

Environment: Node v24.22.1, offline, Linux. Workdir
`~/workspace/glossquote-factory/build3/laundry-machine-handoff`.
Base: `codex/initial-publication` at `fb55ef262642744147d01db9b2fcbc82cc8b76e1`.

## Candidate

- Branch: `muse/laundry-machine-handoff-production-20261109`
- Tool commit: `9e964be1925382254c492cf0c4356384de8feed0` (implements the tool)
- Candidate commit: the head of this branch / PR (this follow-up commit,
  which only records the tool SHA and the PR URL in HANDOFF.md /
  VERIFICATION.md)
- Draft PR: https://github.com/KYStr/glossquote-labs-home/pull/132
- Scope: only `tools/laundry-machine-handoff/` added (see file list below).

## Commands run

- `npm test` — **46 pass / 0 fail** (Node v24.22.1)
- `npm run check` — pass
- `npm run build:preview` ×2 — byte-identical (aggregate SHA-256 of dist/ file hashes: `df909ee9362634aabe1e2427aec1f26bef1db718009cb1c46c963ca85820ac4f`)
- `npm run check:generated:preview` — pass
- Loopback HTTP probe via `scripts/serve.mjs` — `/` and `/en/` 200 with
  correct titles, JS/CSS 200, traversal 404, unknown path 404, SPEC CSP
  + `X-Content-Type-Options: nosniff` headers present; server killed after.

## What the tests cover

- All 8 literal SPEC fixtures verbatim (`deepStrictEqual`): 6 solve +
  2 flow.
- SIZE boundary: exactly 65,536 UTF-8 bytes passes the size gate (then
  fails name length); 65,537 bytes is rejected with SIZE before name
  validation; multi-byte characters count as UTF-8 bytes.
- SHAPE: unknown/missing keys at root, busy rows and load rows, with
  fixed paths; non-object roots.
- TYPE / RANGE: numeric strings, fractions, `-0`, window/minute/array
  bounds, non-array lists, null rows.
- Names: trim + NFC normalisation, first/rest character rules, empty
  and 25-code-point names, injection text (`<script>…`, `"; DROP…`)
  rejected by the character rule, NFC duplicate (`é` U+00E9 vs
  `e` + U+0301), case-sensitive non-duplicate.
- ORDER: window, then washerBusy, then dryerBusy, with precedence.
- Scheduling (hand-derived): first load blocked, overlapping busy
  intervals merging, busy intervals before the window, dryer busy
  pushing the dry start with wait exactly at the limit, later wash
  chosen when the wait limit forbids the earliest, second load gated
  by the first load's dryEnd, max-wait-0 chaining, maximum data
  (eight 240-minute loads: A–E placed, blocked at F), input not mutated.
- Independent brute-force cross-check: a second scheduler written
  directly from the SPEC text (busy-list scans, no prefix tables)
  agrees with `solve` on 6 varied inputs.
- Flow extras: reset, core error settle + edit back to dirty, stale
  error reply ignored, run-while-busy ignored, settle-after-ready
  ignored, cancel-while-idle no-op.
- Scan bounds: per load at most 1,441 reverse-scan steps (t = 1440..0)
  and at most 1,441 forward-scan wash candidates, as the SPEC pins.

## Spec errata

None. Every printed fixture reproduces exactly from the SPEC's own
rules. The algorithm was also independently re-derived in Python
before implementation; all 5 solvable fixtures matched (the 6th is
the ORDER error fixture, covered by validation).

## Files in the candidate (tools/laundry-machine-handoff/)

- `package.json`, `HANDOFF.md`, `VERIFICATION.md`, `BUILD-MANIFEST.json`
- `public/index.html`, `public/en/index.html`
- `public/js/app.js`
- `public/js/core/solve.mjs`, `public/js/core/flow.mjs`, `public/js/core/i18n.mjs`
- `public/styles/app.css`
- `scripts/build.mjs`, `scripts/check.mjs`, `scripts/check-generated.mjs`, `scripts/serve.mjs`
- `test/core.test.mjs`
- `dist/` (generated preview output, byte-identical across builds)

## NOT_RUN

- Real-browser rendering/interaction (Chrome/Edge, keyboard, touch,
  320 px width, 200% zoom, reduced motion, focus order).
- Real devices/touch.
- Assistive tech.
- Measured contrast (values use the shared design tokens; not measured
  in a browser).
- In-browser Network/Storage observation (no fetch/storage code exists;
  not observed live).
- Deployment; production HTTPS checks (no production origin approved).
- Independent nine-aspect review.

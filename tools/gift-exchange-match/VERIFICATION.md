# Gift Exchange Match — Verification

## Environment

- Node.js v24.22.1, offline, no network.
- Repo `KYStr/glossquote-labs-home`, branch
  `muse/gift-exchange-match-production-20261109`, base
  `23c1d5f70db16e8bd0086259156243c5a57f8785`
  (`codex/initial-publication`).
- Candidate commit: (filled in after the parent verifies the PR head;
  see the PR below).

## Commands and results

- `npm test`: **28 pass / 0 fail** — all 8 literal fixtures (6 solve +
  2 flow) via `deepStrictEqual`, name rules (NFC, U+0020-only trim,
  1–24 code points, charset), validation (root/row SHAPE, TYPE, RANGE,
  SIZE at exactly 65,536 / 65,537 UTF-8 bytes), cross-field order
  (REF before SELF_RULE before DUPLICATE, duplicate direction at the
  later row, space-containing names do not collide in direction keys),
  brute-force agreement on 5 hand-picked inputs, determinism and a
  full 16-person derangement, flow transitions (reset, blank submit,
  error recovery, run-while-busy, stale error reply ignored, core
  error settles as error), and the worker protocol in Node with stubbed
  messaging (run posts the solve reply; cancel before the batches drain
  posts nothing).
- `npm run check`: pass.
- `npm run build:preview` x2: **byte-identical** (aggregate SHA-256
  `587c5ed9938beb9b29aac35c0a24d4618312b55956490f8d8f5819a94a8d03a4`,
  9 files: 8 public files + `robots.txt`; manifest
  `BUILD-MANIFEST.json`).
- `npm run check:generated:preview`: pass.
- Loopback HTTP probe (serve on 127.0.0.1:8341, server killed after):
  `/` and `/en/` 200 with the SPEC titles, `app.js`, `worker.mjs`,
  `solve.mjs`, `flow.mjs`, `i18n.mjs`, `app.css`, `robots.txt` all
  200; path traversal 404; unknown path 404; the SPEC-pinned CSP and
  `X-Content-Type-Options: nosniff` headers observed. First attempt on
  port 8331 hit a sibling builder's server (game-night-scorecard
  titles) because that port was already occupied; re-probed on 8341 —
  recorded here so the 8331 output is not mistaken for this tool.

## Bounds measured (SPEC: max 256 feasibility checks, max 4,096 edge
## attempts per check)

Driven through `solveSteps` on 16 participants: no-blocks
(16 checks, max 119 edge attempts per check, 676 total steps),
cycle-blocked (17 checks, max 116, 640 steps), impossible case
(1 check, 0 steps — the first giver's only option fails the
feasibility check at once). All well within the caps; the caps also
hold by construction (each giver tries each allowed recipient at most
once, so at most 240 checks; each check visits at most 16 x 15 edges).

## Spec errata

None. All printed fixtures reproduce exactly from the SPEC's own rules.

## SPEC-silent interpretations (for the reviewer)

- Cross-field order: refs for all rows first (from then to, row order),
  then `SELF_RULE`, then duplicate directions (SPEC implementation
  rule 1 order).
- A half-filled blocked row in the form is a `SYNTAX` error at the
  missing side; the core only sees complete rows.
- Preview canonicals and home links are relative; the SPEC's
  `glossquote.com` values are production-build values (production build
  refused without an approved origin).
- The SPEC handoff `src/` layout is superseded by the consolidated
  house format (`public/js/…`), as in the sibling tools of this run.
- Worker batches: the generator yields after every feasibility check
  (at most 256 edge attempts per check), so each MessageChannel batch
  stays below the 4,096-step cap.

## NOT_RUN

- Real-browser rendering/interaction (Chrome/Edge, keyboard, touch,
  320 px, 200% zoom, reduced motion, Network/Storage audit).
- Real devices/touch.
- Assistive technology / screen-reader check of hidden recipients.
- Measured contrast.
- Deployment / production HTTPS checks.
- Independent nine-aspect review.

# Dice Roller — Verification

## Candidate

- Branch: `muse/dice-roller-production-20261109`
- Base commit: `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- PR: https://github.com/KYStr/glossquote-labs-home/pull/363 (draft, #363)
- Candidate: the PR head at submission (the single commit on this
  branch, plus this verification record)
- Spec source: `5dccd3dcfbe72aa52c9a892391a44719e9de3f9a` (spec PR #260)
- Fixtures SHA-256: `189ee1c7a7ed35082a3816695183422f1c03ddc5d7f0fd011dee26141d27b792`
  (matches the spec commit's `fixtures.json` exactly)
- Environment: Node v24.22.1, `npm test` / `npm run check` /
  `npm run build:preview` / `npm run check:generated:preview`, all run
  in `tools/dice-roller/`.

## Commands run (all exit 0 unless noted)

| Command | Result |
| --- | --- |
| `npm test` | 52/52 pass |
| `npm run check` | pass |
| `npm run build:preview` (first run) | pass, `dist-preview/` + `BUILD-MANIFEST.json` written |
| `npm run build:preview` (second run) | pass; recursive diff of the two `dist-preview/` trees and the two `BUILD-MANIFEST.json` files: byte-identical |
| `npm run check:generated:preview` | pass |

Build reproducibility: the two `build:preview` runs were compared with
a recursive diff of the whole `dist-preview/` tree and of
`BUILD-MANIFEST.json`; no differences were found.

## Test breakdown (52 tests)

- 21 literal core fixture cases from `fixtures.json` (7 success, 14 error).
- 3 literal controller fixture cases (`state-dirty-error`,
  `state-cancel-late`, `state-replace-late`).
- 14 hand-derived core cases: mulberry32 numerator pin (seed 42),
  worked anchors (`007d6`, `1d2` seed 0, `1d1000` max seed, `5d20`
  seed 12345), `d20`/`1d20` equivalence and `+0`/`-0` normalization,
  cap boundaries, determinism and roll invariants, grammar cases
  (missing `d`, missing sides, trailing sign/junk, no trimming,
  full-width digits), 11-digit component RANGE, capacity, seed grammar,
  unpaired surrogates, validation order, schema gate.
- 10 extra controller cases: double-run guard, mismatched draft echo,
  edit-during-busy, cancel (including no-op and re-run), worker error
  and createWorker throw (`WORKER_ERROR`), load example, reset,
  edit-from-empty/error, destroy.
- 5 report cases: fixed filename, canonical bytes + SHA-256 for the
  example, modifier report, round-trip of the caps-max report,
  oversized report → `OUTPUT_LIMIT`.

Expected values in the hand-derived cases were computed with an
independent integer-arithmetic re-implementation of the pinned
mulberry32, cross-checked against AUTHOR-CHECK.md (seed-42 numerators
and all 7 success fixtures match); none were taken from the
implementation's own output.

## NOT_RUN

- Real browser (Chrome/Edge) in both languages: input, error, reset,
  cancel, Worker, Blob download, reflow, keyboard, 200% zoom,
  reduced motion, touch targets — NOT_RUN (no isolated-browser
  mechanism available to this builder).
- Network/Storage observation in a clean isolated profile —
  NOT_RUN (same reason). Static code checks (forbidden-capability
  scan, CSP, no storage/fetch) pass; they are not a substitute for
  the live observation.
- Formal HTTPS/SEO gate (real origin, canonical, hreflang, sitemap,
  security headers, 404, root redirects) — NOT_RUN; the origin
  `https://dice-roller.glossquote.com` is not configured yet.
- Native file-picker / OS download dialogs — NOT_RUN (manual only).

## Known limitations

- Preview only: `scripts/build.mjs --mode production` is refused; no
  production origin has been approved.
- Seed auto-fill depends on `crypto.getRandomValues` (secure contexts
  only); the core itself uses no randomness.

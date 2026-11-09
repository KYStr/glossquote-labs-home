# Verification — Drop-In Court Queue （單場散打輪轉板）

Candidate commit: `8d82f60b3c73da1eeb092c0b9c5580ca60213bd8` (tool commit; the
follow-up commit fills this SHA and the PR URL into HANDOFF.md /
VERIFICATION.md — the final head is the candidate; verify with
`gh pr view 121 --json headRefOid`)
Draft PR: https://github.com/KYStr/glossquote-labs-home/pull/121 (base `codex/initial-publication`)
Branch: `muse/court-queue-rotation-production-20261109`
Base: `c0a7fa3601da3de3d726f1c74d139395e40223f3` (`codex/initial-publication`)
Spec: `spec-court-queue-rotation-20261109` v1, `docs/specs/court-queue-rotation/`
Environment: Node v24.22.1, offline, Linux.

## Commands run (from tools/court-queue-rotation/)

- `npm test` — exit 0, **27 pass / 0 fail** (8 literal SPEC fixtures: 6 solve
  + 2 flow, read from `docs/specs/court-queue-rotation/fixtures.json`; 19
  hand-derived core/flow/boundary tests: SIZE ±1 byte, root shape/type,
  team/queue/event bounds, name/NFC rules, integer rules, exact union
  shapes, event refs, STATE/NEED_TEAMS/WINNER, draw, holder streak to cap,
  next preview, 120-event replay, ASCII integer syntax, flow reset/blank
  submit/stale-error/run-while-busy/load-sample). Duration ~0.4 s.
- `npm run check` — exit 0, "check passed".
- `npm run build:preview` ×2 — exit 0 both times, **byte-identical**:
  aggregate SHA-256 over `dist/` file hashes
  `1a8e88ea8b4bf4ce217759195b3dd2cd85b6f74d3457db4e77f34a66261ba7a6`
  on both runs (8 files: 2 pages, 4 JS, 1 CSS, robots.txt).
- `npm run check:generated:preview` — exit 0,
  "check:generated:preview passed" (manifest bytes + sha256 re-verified for
  all 8 files; dist/robots.txt denies all crawling).
- Loopback HTTP probe (`node scripts/serve.mjs --port 4183`, killed after):
  `/` 200 (zh-Hant title 單場散打輪轉板｜Gloss Tools), `/en/` 200 (en title
  Drop-In Court Queue | Gloss Tools), `/js/app.js` 200,
  `/js/core/solve.mjs` 200, `/js/core/flow.mjs` 200,
  `/js/core/i18n.mjs` 200, `/styles/app.css` 200, SPEC CSP header and
  `X-Content-Type-Options: nosniff` present on responses, path-traversal
  attempt 404, missing page 404. Note: the first probe showed `/en/` 404
  because serve.mjs only mapped `/` to `index.html`; fixed by mapping any
  trailing-slash directory path to its `index.html` and re-probed green.

## Spec errata

None — all 8 printed fixtures reproduce exactly from the SPEC's own rules.
Three hand-derived test expectations were corrected during the build (the
loser returns to the queue tail after a finish — affects the holder-streak
and next-preview cases); the product matched the SPEC throughout, only the
test expectations were wrong.

## NOT_RUN

- Real-browser rendering/interaction (Chrome/Edge, keyboard, touch, 320 px,
  200% zoom, reduced motion, Network/Storage observation)
- Real devices/touch
- Assistive tech
- Measured contrast
- Deployment / production HTTPS checks
- Independent nine-aspect review

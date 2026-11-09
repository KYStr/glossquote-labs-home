# Verification — Party Table Seating (table-seating)

Candidate commit: (to be filled after the final push)
Draft PR: (to be filled after the final push)
Base: `codex/initial-publication` at `5e8fab03c00fba01bca68b1dd80280eb380b9bd6`
Environment: Node v24.22.1, no network use during build/test.

## Commands run (Node v24.22.1)
- `npm test` — exit 0, **30 pass / 0 fail** (8 literal SPEC fixtures: 6 solve
  + 2 flow, read from `docs/specs/table-seating/fixtures.json`; 22
  hand-derived core/flow/boundary tests). Duration ~0.4 s.
- `npm run check` — exit 0, "check passed".
- `npm run build:preview` ×2 — exit 0 both times, **byte-identical**:
  aggregate SHA-256 over `dist/` file hashes
  `c7434c2297ec9784b4fbb4cade1e9ca7891759335e24a49317555b902e529ec9`
  on both runs (9 files: 2 pages, 5 JS, 1 CSS, robots.txt).
- `npm run check:generated:preview` — exit 0, "check:generated:preview
  passed" (manifest bytes + sha256 re-verified for all 9 files).
- Loopback HTTP probe (`node scripts/serve.mjs --port 8123`, killed
  after): `/index.html` 200 (zh-Hant title), `/en/index.html` 200 (en
  title), `/js/app.js` 200, `/js/worker.mjs` 200, `/js/core/solve.mjs`
  200, `/styles/app.css` 200, `/robots.txt` 200, path-traversal attempt
  404.

## Spec errata
None. All 8 literal fixtures (6 solve + 2 flow) pass as printed; the
worst-case search measures 21,845 nodes / 87,380 placements, within the
SPEC bounds of 87,381 nodes / 87,380 placements.

## NOT_RUN
- Real-browser rendering/interaction (Chrome/Edge, keyboard, touch,
  320 CSS px, 200% zoom, reduced motion, focus order).
- Real devices; assistive technology; measured contrast of the shipped UI.
- Worker execution in a real browser (generator + flow controller are
  covered by node --test; the worker file is statically checked only).
- Network/Storage observation in a browser.
- Deployment / production HTTPS checks and the nine-aspect review.

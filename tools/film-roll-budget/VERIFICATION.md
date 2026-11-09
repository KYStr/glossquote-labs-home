# Verification — Film Roll Frame Budget

Environment: Node v24.22.1, offline, Linux. All commands run from
`tools/film-roll-budget/` unless noted. Candidate branch:
`muse/film-roll-budget-production-20261109`, base
`codex/initial-publication` @
`23c1d5f70db16e8bd0086259156243c5a57f8785`.

## Commands and results

- `npm test` — **27 pass / 0 fail** (exit 0). All 8 literal SPEC
  fixtures verbatim via `assert.deepStrictEqual` (6 solve + 2 flow,
  imported from `docs/specs/film-roll-budget/fixtures.json`), plus
  hand-derived cases: SIZE boundary (70,000-char name → SIZE; 1,000-char
  name → RANGE, proving SIZE precedes name validation), SHAPE paths
  (unknown/missing root and scene keys), TYPE (string numbers, fractions,
  `-0`, non-array scenes), RANGE (frame/priority/scene-count bounds, name
  length/characters, markup-in-name rejection), DUPLICATE (second
  occurrence, genuine NFC pair U+00E9 vs U+0065+U+0301, case-sensitive
  non-duplicate), ORDER (reserve over remaining, wanted below min,
  reserve reported first), allocation (last frame of a priority to the
  first scene in input order, priority ordering, even round-robin split,
  conservation planned + reserve + spare = remaining on three cases,
  16-scene / 200-frame max case), flow extras (reset, blank-submit error
  recovery, stale error reply discarded, run-while-busy ignored,
  cancel-while-idle no-op).
- `npm run check` — pass (exit 0). Required files, package contract
  (Node ≥24, ESM, zero dependencies), core purity, app safety
  (textContent only), SPEC-pinned limits (65536 bytes, 16 scenes,
  200 frames, priority 1–3), bilingual metadata (titles, descriptions,
  noindex, canonical, hreflang zh-Hant/en/x-default, home links
  `../../` and `../../en/`), sample cites
  `film-roll-budget.priority-rounds`, no remote URLs in `public/`.
- `npm run build:preview` ×2 — **byte-identical** (8 files in `dist/`,
  aggregate SHA-256
  `e8bf14ebe063519989abba2b786c2ea3beee0bee913bdd561b667c5135d535eb`;
  manifest `BUILD-MANIFEST.json`).
- `npm run check:generated:preview` — pass (exit 0). Manifest bytes and
  sha256 match on disk, no extra files, `robots.txt` denies all, both
  pages carry noindex + canonical.
- Loopback HTTP probe (`node scripts/serve.mjs --port 8326`, killed
  after): `/` and `/en/` 200 with the correct SPEC titles, app.js and
  all three core modules 200, CSS 200, `robots.txt` 200, path traversal
  404, unknown path 404. Response headers observed: the exact
  SPEC-pinned CSP (`default-src 'none'; script-src 'self'; style-src
  'self'; img-src 'self'; worker-src 'self'; connect-src 'none';
  base-uri 'none'; form-action 'none'; frame-ancestors 'none';
  object-src 'none'`) and `X-Content-Type-Options: nosniff`.

## Spec errata

None. All printed fixtures reproduce exactly from the SPEC's own
rules. SPEC-silent interpretations (preview relative canonical/home
links, consolidated `public/js/...` layout instead of the SPEC's `src/`
list, form-level SYNTAX for blank/malformed numbers, `setTimeout(0)`
settle instead of a Worker) are recorded in `HANDOFF.md` for the
reviewer.

## NOT_RUN

- Real-browser rendering/interaction (Chrome/Edge, keyboard, touch,
  320 CSS px, 200% zoom, reduced motion, focus order).
- Real devices/touch.
- Assistive tech.
- Measured contrast (design tokens are the shared Gloss Tools baseline;
  no measured values were taken).
- Network/Storage audit in a real browser (no fetch/storage code exists;
  not observed live).
- Deployment / production HTTPS checks (no production origin approved;
  `build:production` is refused).
- Independent nine-aspect review.

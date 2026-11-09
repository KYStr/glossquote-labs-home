# Verification — Placeholder Text Generator candidate

Environment: Node v24.22.1, zero npm dependencies, all commands run inside
`tools/placeholder-text-generator/` unless noted.

## Commands and results

- `npm test` — exit 0. **26 tests, 26 passed, 0 failed** (~0.6 s).
  Coverage: SPEC fixture 1 (seed-42 draws, first three at full precision,
  all eight within rounding distance of the printed values) cross-checked
  against an independent re-implementation of the section 4 formula;
  fixture 2 micro-pool sentence exactly (`Beta delta gamma alpha gamma …`,
  L = 11); fixture 4 (`Lorem ipsu`); pool audits (Latin 63 words, no
  duplicates, SHA-256 match; zh 30 sentences, all ending 。, no Latin
  letters/digits); sentence word counts 6–14; paragraph sentence counts
  Latin 3–6 / zh 2–4; words unit exactly 10 / 100 / 5000 (opening on and
  off); characters unit exactly 10 / 500 / 20000 code points including a
  cut spanning the paragraph join; determinism across runs and re-seeding;
  seed-increment changes output; validation refusals at every unit's
  min−1 / max+1, non-integer counts, seed −1 / 4294967296 / fractional,
  zh words unit refused; HTML escaping including a hostile micro pool.
- `npm run check` — exit 0, all static checks passed (required files,
  ESM + zero dependencies + required scripts, core free of
  DOM/network/storage references, PRNG constant appears once, app.js free
  of innerHTML/eval/Function, both pages noindex with no external
  resources).
- `npm run build:preview` run twice — **byte-identical**: identical
  BUILD-MANIFEST.json and identical aggregate SHA-256 over all built
  files across both runs.
- `npm run check:generated:preview` — exit 0 (file list, per-file SHA-256
  and byte-equality with `public/` sources all verified).
- Loopback HTTP probe (`PORT=4319 node scripts/serve.mjs`, then curl,
  server killed): `/` → 200 text/html (zh-Hant title), `/en/` → 200
  text/html (English title), `/en/index.html` → 200,
  `/js/core/generate.mjs` → 200 text/javascript, `/missing` → 404.

## Spec errata candidates

1. SPEC section 4, fixture 1 wording: the eight seed-42 draws are described
   as "truncated for display" at 6 decimals, but the printed values match
   the true draws **rounded** to 6 decimals in all eight cases (e.g. the
   true first draw is 0.60110375192016363, which truncates to 0.601103 but
   prints as 0.601104). The numbers themselves are correct under rounding;
   only the word "truncated" appears wrong. The implementation follows the
   section 4 formula exactly, and the test pins the first three draws at
   full precision plus all eight printed values within rounding distance.

No other fixture or rule contradiction was found: micro-fixture 2 and
fixture 4 reproduce exactly as printed under the formula.

## NOT_RUN (explicit)

- Real-browser rendering and interaction (Chrome/Edge/Firefox/Safari),
  including the SPEC section 7 GUI/evidence tests: initial-state check
  through the real UI, settings changes in both UI languages, copy/paste
  diffing into a scratch document.
- Real devices / touch, native viewports, 200% zoom.
- Assistive technology checks; measured contrast ratios.
- Cross-browser byte-identity of the fixture corpus in real browsers
  (asserted in Node only).
- Deployment, merge, catalog publication (separate later steps by design).

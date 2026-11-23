# Cocktail ABV Calculator （調酒酒精度）— VERIFICATION

- Spec: `spec-cocktail-abv-calculator-20261121`, draft spec PR #386
  (head `895f495d114ad4b39e954591ca42bfe900e01fa6`, OPEN at build time),
  registry rev 1777 (per parent task).
- Production branch: `muse/cocktail-abv-calculator-production-20261121`
  (base `codex/initial-publication`).
- Node: v24.22.1. Zero runtime dependencies, ESM.
- Spec fixtures: `test/fixtures.json` is byte-identical to the spec PR
  head's `docs/specs/cocktail-abv-calculator/fixtures.json`
  (SHA-256 `8d12f9c130377314ec3153f42f35da30d8b0c4a402f4386246d1219adb1fe0b8`,
  verified via the GitHub API).
- Independent check: all 8 valid core fixtures were recomputed with
  an independent Python `decimal.Decimal` (ROUND_HALF_UP) script
  before implementation; all 8 matched the fixtures exactly, and the
  `half-up-boundary` 12.25% → 12.3% lock was confirmed by that script.

## Commands run (tool directory `tools/cocktail-abv-calculator/`)

- `npm test` (node --test): exit 0 — 49 tests, 49 pass, 0 fail.
  13 literal core fixtures (verbatim deep equal) + hand-derived
  boundary / grammar / schema / half-up / totals-from-unrounded-sums
  / timezone tests, 3 literal controller fixture flows + controller
  unit tests, 3 report byte-exact tests, 6 bilingual page tests.
- `npm run check` (node scripts/check.mjs): exit 0 — files, package
  contract, fixtures hash, core limits/defaults/ranges/example,
  pages, syntax, worker concatenation, capability scan, core purity.
- `npm run build:preview` (twice): exit 0 both times — 9 files in
  `dist-preview/` + `BUILD-MANIFEST.json`; the manifest SHA-256 was
  identical on both runs:
  `1dabf739cc82fbb9348349ba6daa0e49aeaf725d1ab29c1b7eda100152d2f64f`
  (byte-identical rebuilds).
- `npm run check:generated:preview`: exit 0 — 9 files, hashes exact,
  bilingual metadata present, worker source matches fixed bytes.
- `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview`
  (loopback smoke test, server stopped afterwards): `/` 200,
  `/en/` 200, missing page 404, traversal `..%2F..%2Fpackage.json`
  403; HTML responses carry the SPEC CSP and `X-Robots-Tag:
  noindex, nofollow`.
- One real defect was found and fixed during testing: the first
  `roundTenths` implementation rounded to whole units instead of
  tenths (margarita total ABV came out 2.7% instead of 26.7%);
  fixed to `floor((20n + d) / (2d))` and all 49 tests now pass.

## NOT_RUN

- Real-browser checks (Chrome / Edge, both languages, keyboard,
  320 px, 200% zoom, reduced motion, touch targets, contrast):
  NOT_RUN — no isolated browser available to this builder.
- Network / Storage zero-request checks: NOT_RUN (same reason).
- Compatibility (isolated Chrome + Edge, Worker, Blob download,
  reflow): NOT_RUN (same reason).
- Production / HTTPS / SEO gates: NOT_RUN — preview only, no
  production origin approved.

Next owner: independent reviewer, on the same PR head.

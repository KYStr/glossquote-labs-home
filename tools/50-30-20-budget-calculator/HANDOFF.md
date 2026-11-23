# Handoff — 50-30-20 Budget Calculator (build-first production candidate)

## Fixed source

- Repository: `KYStr/glossquote-labs-home`
- Spec task: `labs-50-30-20-budget-calculator-spec-20261121`
- Spec: `docs/specs/50-30-20-budget-calculator/SPEC.md` (spec-50-30-20-budget-calculator-20261121, v1),
  `docs/specs/50-30-20-budget-calculator/BRIEF.md`, `docs/specs/50-30-20-budget-calculator/fixtures.json`,
  `docs/specs/50-30-20-budget-calculator/AUTHOR-CHECK.md`
- Spec candidate commit: `e0e721a03f2bb9b7fedb19002eb39a990fc5a3e7`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/399
- Registry revision at claim time: 1837
- Implementation base: `codex/initial-publication` at
  `8c2652671012498891e7f7afe02fdca3f154aa64` (branch tip when the build
  branch was created); implementation branch
  `muse/50-30-20-budget-calculator-production-20261121`.
- Implementation scope: `tools/50-30-20-budget-calculator/` only. Nothing
  outside this directory was touched; no registry/coordination commands
  were run. The parent verifies the PR head and handles any registry
  submission.

Because the spec PR is not merged into the base branch,
`docs/specs/50-30-20-budget-calculator/` does not exist in this checkout. The
spec's fixtures.json is therefore vendored verbatim at
`test/fixtures.json` (byte-identical copy of the file at the spec
candidate commit; SHA-256
`043c90d1d1d3a07008c522c1cd1a4b9545cfd88b4f6abd840bdd720dfb3aae80`), and the
tests and static check read that copy. The vendored file keeps the spec's
own `specId` (`spec-50-30-20-budget-calculator-20261121`), which the check
asserts.

## What was built

A bilingual (zh-Hant / en) static tool that splits monthly after-tax
income into needs / wants / savings (default 50/30/20, customizable, sum
must be 100) and compares optional actual spending with the targets:

- Pure core (`public/js/core/budget.mjs`): strict schema (exactly the seven
  string fields, own data properties only, accessors rejected), field
  validation in the SPEC's order (`income` → `needsPct` → `wantsPct` →
  `savingsPct` → `actualNeeds` → `actualWants` → `actualSavings`, then the
  cross-field `PERCENT_SUM` last; per field INPUT_LIMIT → EMPTY →
  INTEGER_FORMAT → RANGE; the three actuals are optional — an empty string
  means unfilled), and exact integer arithmetic throughout: monthly
  amounts `floor((2*income*pct + 100) / 200)` (round-half-up of the exact
  fraction), the −1/0/+1 residual absorbed by the largest exact category
  (max pct, ties in needs/wants/savings order) so monthly amounts always
  sum to income, yearly amounts = monthly × 12, `actualPercent` as
  `floor((2*actual*1000 + income) / (2*income)) / 10` (one decimal,
  half-up), variance `difference = actual − target` with
  on-target/over/under status, totals only when all three actuals are
  filled (`unallocated = income − actual`, balanced/under/over). Canonical
  report serialization (keys sorted by UTF-16 code units recursively,
  compact, one trailing LF, non-data values never carried over so an
  input's `toJSON` is never invoked) with the 2,097,152-byte OUTPUT_LIMIT.
- Controller (`public/js/controller.mjs`): empty / dirty / busy /
  success / error / cancelled state machine with generation IDs; only a
  reply carrying the current generation while busy is accepted, so late
  replies can never resurrect a cancelled or replaced result. The public
  state exposes `reportAvailable` (the SPEC's controller fixtures check
  exactly this name).
- App (`public/js/app.js`): DOM wiring with textContent/value only; the
  allocation table (monthly + yearly per category), the variance table
  (actual, target, signed difference, one-decimal actual share, status),
  the totals line, and the four SPEC-pinned advice templates (needs over,
  wants over, savings under, totals over) plus the verbatim disclaimer;
  computation runs in a module Worker created from a Blob URL of the
  fixed worker source embedded by the build
  (`dist-preview/js/worker-source.js`, generated from the fixed bytes of
  the core + `public/js/worker-handler.mjs`). The fixed download
  (`50-30-20-budget-report.json`) is offered only in the success state;
  its Blob URL is revoked when the result is invalidated and at most 30
  seconds after a download starts.
- Pages (`public/index.html`, `public/en/index.html`): independent
  bilingual pages with the SPEC-pinned titles, descriptions, h1s, the five
  FAQ pairs, the verbatim disclaimer, the draft-loss note, preview
  noindex, no canonical/hreflang, relative language links, and
  same-language home links (`../../` / `../../en/`).
- Scripts: reproducible preview build (`scripts/build.mjs --mode preview`,
  refuses production), static checks (`scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`), loopback-only serve
  (`scripts/serve.mjs`, 127.0.0.1, SPEC CSP headers, noindex
  X-Robots-Tag on HTML).

## Errata candidates (spec issues found while building; the spec was NOT changed)

- None. All 15 core fixtures and all 3 controller fixtures pass verbatim
  against the implementation, and the AUTHOR-CHECK's independent
  Fraction-based recalculation agrees. One reading was pinned explicitly
  in the core and tests rather than assumed: the SPEC's "先容量、再該欄
  文法，跨欄合計最後" means the `PERCENT_SUM` check runs after every
  field — including the three actuals — passes validation (so an invalid
  actual with a bad percent sum reports the actual's error first); the
  implementation follows that order and a test pins it.

## Verification summary

See VERIFICATION.md for the full command log. `npm test`, `npm run
check`, two `npm run build:preview` runs (byte-identical), and `npm run
check:generated:preview` all pass; a loopback serve probe and a Node
execution of the embedded worker source pass. Real-browser (Chrome/Edge),
Network/Storage, accessibility, and production HTTPS/SEO checks are
NOT_RUN (no isolated browser available to this builder) and are the
reviewer's job on the same PR head.

## Next owner

The independent reviewer (not the author) verifies this PR head against
the SPEC's nine acceptance facets, each with evidence, before any
accept/merge/deploy decision. Do not merge or publish from this branch.

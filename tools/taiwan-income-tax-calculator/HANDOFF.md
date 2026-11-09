# HANDOFF — Taiwan Income Tax Calculator （綜合所得稅試算）

## Fixed source

- Spec task: `labs-taiwan-income-tax-calculator-spec-20261109`
- Spec id: `spec-taiwan-income-tax-calculator-20261109`
- Spec candidate commit: `d92e4046b619363629cd402046431b9b6997edd0`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/142
- Production base: `codex/initial-publication` @ `9e6abd357f29f5f914cc5252023f3d7b2fbee4ef`
- Production branch: `muse/taiwan-income-tax-calculator-production-20261109`
- Scope: only `tools/taiwan-income-tax-calculator/` was added. No registry or
  coordination commands were run by the builder.

## What was built

A bilingual (zh-Hant default, en) static tool that estimates Taiwan
individual income tax on salary income only for income year ROC 113 (2024),
using the MOF amounts pinned by the SPEC: exemption NT$97,000 (NT$145,500 at
age 70+), standard deduction NT$131,000 single / NT$262,000 married, salary
special deduction capped at NT$218,000, and the five brackets with
progressive differences 0 / 41,300 / 147,700 / 413,700 / 911,700.

- `public/js/core/core.mjs` — pure `run(input)`: strict own-data schema
  validation in the pinned field order (SCHEMA → INPUT_LIMIT → EMPTY →
  INTEGER_FORMAT → RANGE; ENUM_VALUE for filing status), then the 8-step
  integer derivation with the single round-half-up at step 8. Also
  `serializeReport()`: deterministic compact JSON (keys sorted by UTF-16
  code units, one trailing LF, UTF-8 no BOM, 2 MiB OUTPUT_LIMIT).
- `public/js/core/controller.mjs` — DOM-free controller implementing the
  empty/dirty/busy/success/error/cancelled states, generation guard, and
  worker lifecycle; late results from superseded generations are dropped.
- `public/js/worker-handler.mjs` + build embedding — at build time the core
  source and this fixed handler form one bundle string; `app.js` creates a
  module Worker from that string via a Blob URL. The worker is terminated
  after every settle, cancel, reset, edit, and pagehide; bfcache restore
  resets the tool.
- `public/js/app.js` — safe DOM wiring (textContent/value only), per-field
  errors with aria-describedby/aria-errormessage, focus to the first error
  field after a failed run, example loading (first fixture), and the fixed
  download `taiwan-income-tax-report.json` (Blob URL revoked after 30 s or
  as soon as the result is invalidated).
- `public/index.html`, `public/en/index.html` — full static pages with the
  SPEC-pinned titles, descriptions, bracket table, disclaimer, and FAQ.
  Preview builds carry the robots noindex meta and no canonical/hreflang.
- `scripts/build.mjs` (deterministic preview build, 8 allowlisted files),
  `scripts/check.mjs`, `scripts/check-generated.mjs`, `scripts/serve.mjs`
  (loopback-only, traversal/symlink-safe, security headers).
- `test/` — 36 tests: the 15 literal SPEC fixtures (vendored verbatim in
  `test/fixtures.json` from the spec candidate, since the spec PR is not yet
  merged into the production base), boundary/hostile-input core tests,
  controller state fixtures against a fake worker, report byte/SHA-256
  tests, build reproducibility tests, and a loopback HTTP probe test.

## Deviations

- Layout naming: the SPEC's implementation sketch mentions `src/*.mjs`,
  while the delivered layout follows the house file contract in
  `docs/IMPLEMENTATION-CHECKLIST.md` (`public/js/core/*.mjs`,
  `public/js/app.js`, `scripts/`, `test/`), as directed for this production
  run. Every behavioural requirement from the SPEC (pure core, embedded
  fixed-source worker bundle, generation semantics, download rules, CSP) is
  implemented as specified; only directory names differ.
- Production build is intentionally refused by `scripts/build.mjs`: the
  SPEC states the production origin is not configured, so no canonical,
  hreflang, or sitemap is emitted. Preview is the only candidate.

## Next owner

Independent (non-author) reviewer: verify the nine predeclared acceptance
aspects against this fixed candidate head. Real-browser checks (Chrome/Edge
two-language flows, keyboard, 200% zoom, Network/Storage isolation) remain
NOT_RUN — see VERIFICATION.md.

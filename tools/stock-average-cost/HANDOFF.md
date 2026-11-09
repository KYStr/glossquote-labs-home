# Handoff — Stock Average Cost Calculator （股票平均成本計算機）

## Fixed spec source

- Spec task id: `labs-stock-average-cost-spec-20261109`
- Spec candidate commit: `879cad568897c5413f8e556311d5314c7b7e8a1b`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/140
- Spec files: `docs/specs/stock-average-cost/{BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md}` at that commit.
- Mode: build-first. The spec has not yet had an independent review, so this
  candidate is NOT accepted, merged, or published. No registry/coordination
  commands were run by the builder.

## Production base

- Repository: `KYStr/glossquote-labs-home`
- Branch: `muse/stock-average-cost-production-20261109`
- Base commit (tip of `codex/initial-publication` at fetch time):
  `9e6abd357f29f5f914cc5252023f3d7b2fbee4ef`
- Scope: only `tools/stock-average-cost/` was created or modified.

## What was built

A bilingual (zh-Hant default, English under `public/en/`) static tool that
computes FIFO stock cost basis from an ordered list of 1–20 buy/sell trades
with one shared fee rate in basis points:

- `public/js/core/calculate.mjs` — pure core. All money is integer micro
  units (1 µ = 0.0001) in BigInt; the only rounding is round-half-up at the
  three points the SPEC pins (per-trade fee, partial lot relief, average
  cost); whole-lot relief settles at exactly the remaining lot cost.
  Validation follows the SPEC's step order (envelope shape → fee → row
  count → per-row side/shares/price → OVERSOLD simulation) with the SPEC's
  error codes and field/row attribution. Also exports `serializeReport()`
  for the fixed download `stock-average-cost-report.json` (compact JSON,
  keys sorted recursively by UTF-16 code units, one trailing LF, UTF-8 no
  BOM, 2,097,152-byte cap → `OUTPUT_LIMIT`).
- `public/js/controller.mjs` — generation/state controller (empty / dirty /
  busy / success / error / cancelled); edits invalidate the result and the
  report immediately; stale worker generations are discarded.
- `public/js/app.js` — DOM wiring only (`textContent`/`value`): dynamic
  trade-row editor (add up to 20 rows, reorder with up/down buttons, never
  auto-sorted), run / load example / reset / cancel / download, error focus
  only after a submission settles, download Blob URL revoked within 30 s.
- Worker architecture per SPEC: `scripts/build.mjs --mode preview` embeds
  the pure core plus the fixed handler in `scripts/worker-handler.mjs` into
  `dist-preview/js/worker-source.mjs`; the page creates a module Worker
  from a Blob URL and also stops the Worker after a successful run.
- Pages carry the SPEC-pinned title / H1 / description / FAQ strings in
  both languages, preview `noindex` metadata (no production
  canonical/hreflang/sitemap, per the SPEC's preview convention), the
  SPEC CSP, and same-language home links via `../../`.

## Deviations and notes

- The spec PR is not merged into the production base, so
  `docs/specs/stock-average-cost/` does not exist in this checkout. The
  spec's `fixtures.json` is therefore vendored verbatim into
  `test/fixtures.json` (it self-identifies with
  `specId: spec-stock-average-cost-20261109` and the slug), and the tests
  read the vendored copy. No fixture value was altered.
- No other deviation from the SPEC. No spec-errata candidates were found:
  every fixture agrees with the SPEC's stated rules (see VERIFICATION.md).

## Next owner

Independent reviewer: verify this candidate against the fixed spec
candidate above (same commit), run the checks in VERIFICATION.md, and
complete the real-browser / real-device items listed there as NOT_RUN.

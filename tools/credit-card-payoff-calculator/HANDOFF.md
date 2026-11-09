# HANDOFF — Credit Card Payoff Calculator（信用卡還款試算）

## Fixed spec source

- Spec task id: `labs-credit-card-payoff-calculator-spec-20261109`
- Spec candidate commit: `da80a6d6387cde5ec4b0f6c2e57483b07ccc2104`
- Draft spec PR: https://github.com/KYStr/glossquote-labs-home/pull/137
- Production mode: build-first (the spec is not yet independently reviewed / ready; no registry production task was claimed, and no registry/coordination commands were run by this build).

## Base

- Branch: `muse/credit-card-payoff-calculator-production-20261109`
- Base: `codex/initial-publication` at `9e6abd357f29f5f914cc5252023f3d7b2fbee4ef`
- Scope: only `tools/credit-card-payoff-calculator/` was added; no other path was touched.

## What was built

A bilingual (zh-Hant default + en) static tool implementing the SPEC exactly:

- `public/js/core/payoff.mjs` — pure synchronous core. Strict plain-object schema (exactly the five fields, data properties only), pinned validation order (structure → balance, aprPercent, mode → conditional consistency → active field), money/percent/integer grammars with per-field raw-length caps, exact BigInt monthly interest `I = (B × aprBp + 60000) div 120000`, fixed-payment simulation with `NEVER_PAYOFF` detection, target-months annuity solved in exact BigInt arithmetic with the `I₁ + 1` floor and re-verified by the same simulation, 600-month cap with `PAYOFF_TOO_LONG`, and the pinned report serialisation (compact JSON, keys sorted recursively by UTF-16 code units, one trailing LF, 2,097,152-byte limit) for the fixed download `credit-card-payoff-report.json`.
- `public/js/controller.mjs` — the six pinned flow states (empty/dirty/busy/success/error/cancelled) with generation-guarded Worker lifecycle: any edit invalidates result and download immediately; cancel and re-run make late Worker messages harmless; `WORKER_ERROR` on construction failure or `onerror`.
- `public/js/app.js` — DOM wiring with `textContent`/`value` only; the real Worker is built from a Blob URL over the preview-generated embedded core source; schedule display paginates at 25 rows while the export always carries the full schedule; download URL revoked after 30 s.
- `public/index.html` + `public/en/index.html` — pinned SPEC titles, descriptions, model disclosure and FAQ copy in both languages, preview `noindex` convention (no canonical, relative hreflang alternates, same-language home links via `../../`), and the pinned CSP including `worker-src blob:`.
- `scripts/build.mjs` — reproducible preview build into `dist-preview/`; embeds the fixed core source plus a fixed message handler as `js/worker-source.mjs`.
- `scripts/check.mjs` — required-path, package, forbidden-token, exact-page-copy, i18n-parity, app-wiring, and core spot checks, plus `--generated-preview` byte comparison against a fresh build.
- `scripts/serve.mjs` — loopback-only static server for the preview with pinned security headers; no auto-open.
- `test/` — `test/fixtures.json` vendored verbatim from the spec candidate (13 cases: 10 core + 3 controller); core, controller, page and embedded-worker suites encode the fixture expectations directly, never values derived from the implementation.

## Deviations from the SPEC

None. All 13 fixture expectations agree with the SPEC's stated rules, so no spec-errata candidates were recorded.

Implementation notes (no contract change):

- The core's plain-object check is realm-tolerant (a prototype whose own prototype is `null` counts as a realm's `Object.prototype`), because inputs cross the Worker boundary via structured clone and are rebuilt in the worker's realm; class instances and accessor tricks are still rejected as `SCHEMA`.
- `scripts/check.mjs` imports `buildPreview` statically instead of dynamically inside `checkGeneratedPreview`: a dynamic import there deadlocks against the check/build module cycle when check runs as the main module (unsettled top-level await). Behaviour is unchanged.

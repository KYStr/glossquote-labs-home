# VERIFICATION — Credit Card Payoff Calculator（信用卡還款試算）

Environment: Node v24.22.1, Linux VM. All commands run in `tools/credit-card-payoff-calculator/` on branch `muse/credit-card-payoff-calculator-production-20261109` (base `9e6abd357f29f5f914cc5252023f3d7b2fbee4ef`).

## Commands run and results

- `npm test` — **31/31 passed, 0 failed.**
  - `test/core.test.mjs` — 19 tests: all 10 vendored core fixtures deep-compared (fixed-payment, annuity, zero-APR both modes, never-payoff, one-month, half-up interest, payoff-too-long, both format/range fixture errors), plus schema/capacity/unicode/format boundary cases, the 600-month cap and 1-month floor, result identities (principal sum = balance, totalPaid = balance + totalInterest, final row balance 0) across five plans, `formatMoney` cases, and a hand-derived exact-bytes report serialisation assertion.
  - `test/controller.test.mjs` — 5 tests: the 3 vendored controller fixtures (dirty-after-success then NEVER_PAYOFF re-run; cancel then late success ignored then reset; older generation's late success ignored after the newer run errors), Worker construction failure and `onerror` → `WORKER_ERROR`, and cancel/reset semantics.
  - `test/pages.test.mjs` — 4 tests: exact pinned zh/en titles, descriptions, disclosure and FAQ strings; preview convention (single noindex meta, no canonical, relative alternates, same-language `../../` home links); pinned CSP directives; identical element-id sets across languages.
  - `test/worker.test.mjs` — 3 tests: the build-generated embedded Worker source executed in a `node:vm` context with a fake `self` answers three fixture inputs with outcomes identical to the core, reports `SCHEMA` for a null input instead of throwing, and generation is deterministic.
- `npm run check` — **passed** ("Project check passed.").
- `npm run build:preview` run twice — **byte-identical output, 9 files.** SHA-256 of the second build:

  ```
  01f13223f60662bb9fd1b22f3846b5e5c011880c6553d47ea724b0f37d1ad968  dist-preview/en/index.html
  11ca32d1f4eb678c47836cda1e0781222914ead7234f67490b664f9bb58c51f6  dist-preview/index.html
  2d51915f8d9a6f817fb5067884ca5fcffe1c566a2636230afeff2df198b94d07  dist-preview/js/app.js
  6c2715f88c182f34c5f3050be40f7af12d2e31761a3517ceb8318e780ab90377  dist-preview/js/controller.mjs
  72c7949917381c78e5c2b834e84b9be16a15f52ccfaa00a6981d1c579e0c54c3  dist-preview/js/core/payoff.mjs
  3cc37f4ed05c7d32cf7a3577c8ac32906714084d33446b54bf9bc2c4945ebeb7  dist-preview/js/i18n.mjs
  394c0993be3f02fc0f6b6e3e782a28f0e1ca6c217dfdfdf990902c897ce6e7af  dist-preview/js/worker-source.mjs
  3f068aaf5f626037644aa28da12cf50e3077643d3c944ebbf4c3df43d309429f  dist-preview/styles/app.css
  dec0dc54c4f871a72c3382a345bb094012923b2870c60a9c27f399d072469556  dist-preview/styles/tokens.css
  ```

- `npm run check:generated:preview` — **passed** ("Generated preview check passed.").
- Loopback HTTP probe of the built preview (`node scripts/serve.mjs --port 0`, ephemeral port 45495):
  - `GET /index.html` → 200, title `信用卡還款試算｜Gloss Tools`
  - `GET /en/index.html` → 200, title `Credit Card Payoff Calculator | Gloss Tools`
  - `GET /js/worker-source.mjs` → 200
  - `GET /nope.html` → 404 (and `/` → 404: the server serves explicit file paths only, by design)

## Fixes made during verification

- One test expectation was corrected: `targetMonths: "12.0"` is 4 UTF-16 units, so the SPEC's capacity rule yields `INPUT_LIMIT` before `INTEGER_FORMAT`; the test now asserts both that and `"1.5"` → `INTEGER_FORMAT`. The implementation already followed the SPEC.
- The core's plain-object check was made realm-tolerant after the embedded-worker vm test exposed that cross-realm objects (exactly what structured clone delivers to a Worker) were rejected as `SCHEMA`. See HANDOFF.md.
- `check:generated:preview` initially deadlocked (unsettled top-level await) due to a dynamic import across the check/build module cycle; fixed by a static import, behaviour unchanged. See HANDOFF.md.

## Spec-errata candidates

None. Every fixture expectation was re-derived from the SPEC's rules (integer half-up interest, exact annuity, simulation identities) and matched.

## NOT_RUN

- Real-browser rendering and interaction (page + Blob Worker end-to-end in Chromium/Firefox/Safari).
- Real-device checks (mobile layout, touch, download behaviour).
- Screen-reader / assistive-technology audit.
- Windows re-run of the test suite.
- Deployment, publication, registry submission, and independent review — build-first candidate only; nothing here is accepted, merged, or published.

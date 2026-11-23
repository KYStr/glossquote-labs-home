# VERIFICATION — Food Storage Guide

Environment: Node v24.22.1, Linux VM, 2026-11-23. All commands run in
`tools/food-storage-guide/`.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test test/*.test.mjs`) | PASS — 39 tests, 39 pass, 0 fail |
| `npm run check` (`node scripts/check.mjs`) | PASS — all static checks passed |
| `npm run build:preview` (run twice) | PASS — 8 files; both runs byte-identical, aggregate SHA-256 of the sorted per-file hash list `77414083a76493c5cdbbe647354b2ef1b88279828fd454c62426c9119a76c268` |
| `npm run check:generated:preview` | PASS — dist-preview matches a fresh build (8 files) |
| Loopback HTTP probe (`scripts/serve.mjs --port 0`) | PASS — `GET /` 200 `text/html` with title「食物保存期限｜Gloss Tools」and `lang="zh-Hant"`; `GET /en/` 200 with title "Food Storage Guide \| Gloss Tools" and `lang="en"`; `GET /js/app.js` 200 |

Per-file SHA-256 of the preview build (second run):

| File | SHA-256 |
| --- | --- |
| `_headers` | `5afa8a9a8c82187c632653148e4900a7be1b21532f3793e7069689d8a4460e21` |
| `en/index.html` | `4cef64f3d35068f46612eead16f05043b375583374304c8347bf90eb7da04499` |
| `index.html` | `7fec71522162fc5fe7b8c8d68f9e3ed031d67aa9cdada75505ab019d69416435` |
| `js/app.js` | `e4e7a1e683ea3f2ee70061dd1df986c3873e11516642232e6fb329f4171b1253` |
| `js/core/controller.mjs` | `5a21b4f32a9d67ab27aa5543e07b70da0a2b963ebc05b7792db1ef3538fa45be` |
| `js/core/core.mjs` | `ade8f07341b266f713fab919870c96f503e6b99b0174d0b2c78dc5e25a07411c` |
| `robots.txt` | `331ea9090db0c9f6f597bd9840fd5b171830f6e0b3ba1cb24dfa91f0c95aedc1` |
| `styles/styles.css` | `e7ac1493a0a9c2ee29d6ac33ff5e4747ed06af82ee51aa96ab8a7dd742c97b74` |

The test suite additionally covers, inside `test/serve.test.mjs`, HEAD,
404, path traversal refusal (`/..%2f..%2fpackage.json` → 404) and POST → 405
against the real built preview.

## Test inventory (39)

- Core: all 12 literal SPEC fixtures (deep equality on the whole return
  value), plus status boundary remaining 2 vs 3, PKG path (missing /
  bad-format / unreal / past package date), packageDate ignored off the
  PKG path, opened no-op toggles, opened splits (hot dogs 14 vs 7 days;
  bread fridge unopened NOT_APPLICABLE), unopened-only gaps (white rice
  and ketchup fridge, canned-soup freezer), startDate years 1999/2101
  DATE_RANGE, DATE_FORMAT shapes, unknown item/location SCHEMA,
  INPUT_LIMIT on 65-char strings, UNICODE lone surrogates, SCHEMA for
  unknown/missing/wrongly-typed fields and accessors, non-object inputs,
  omitted-opened default, omitted-todayDate device local date (derived
  independently in the test), pinned first-error ordering, and `cellFor`
  table exposure for the UI.
- Controller: the 3 literal SPEC state fixtures (state-dirty-error,
  state-cancel-late, state-replace-late) against a fake worker with
  test-controlled delivery, plus worker-factory failure (WORKER_ERROR),
  foreign-generation message rejection, and `run(explicitInput)`
  sending the app-derived input while leaving the draft unchanged.
- Report: literal expected bytes for the first fixture's result (written
  from the SPEC serialization rules, with matching SHA-256), recursive key
  sorting, OUTPUT_LIMIT above 2 MiB, and no `toJSON` invocation.
- Build: two builds byte-identical, exact 8-file allowlist, preview noindex
  present, no canonical, worker bundle embedded in `js/app.js`, production
  mode refused.

## Spec errata candidates

See HANDOFF.md: one ambiguity — what an empty todayDate means at run time
(reset draft pins `""` while the field is described as defaulting to the
device local date). Adopted reading is recorded there. No other errata:
all 12 core fixtures reproduce exactly from the SPEC rules and table.

## NOT_RUN (explicit)

- Real-browser evidence: isolated Chrome and Edge, both language pages —
  example load, typed input, error, edit-after-success, cancel, reset,
  Blob download byte comparison. NOT_RUN (no isolated browser mechanism in
  this build environment; Node/DOM tests are not a substitute claim).
- Real-device / mobile checks, real 200% zoom, reduced-motion rendering,
  screen-reader pass, contrast measurement on rendered pages. NOT_RUN.
- Network/Storage isolation audit in a clean browser profile (requests,
  local/sessionStorage, IndexedDB, Cache Storage, cookies, service
  worker). NOT_RUN in a real browser; by construction the product code
  contains no fetch/XHR/WebSocket/beacon/storage calls, which
  `scripts/check.mjs` enforces statically.
- Production HTTPS deployment, canonical/hreflang/sitemap, origin
  configuration. NOT_RUN — out of scope for the preview candidate; the
  build refuses production mode until an origin is approved.
- Independent nine-aspect acceptance review. NOT_RUN — that is the
  reviewer's step, not the builder's.

# Verification — Range Coverage Audit

Environment: Node v24.22.1, `~/workspace/glossquote-factory/build3/range-coverage-audit/tools/range-coverage-audit`.
Base: `codex/initial-publication` @ `8941a010da5722f0b4690487938c4e32d2a2587f`.
Registry task `labs-prod-range-coverage-audit-20261109`, claim
`muse-main-claim-range-coverage-audit-20261109T075001Z-w2` (parent-claimed; no
registry writes in this build).

## Commands and results (all exit 0 unless noted)

| Command | Result |
| --- | --- |
| `npm test` | **42 pass / 0 fail** (core 21, controller 11, worker 4, html 5, build 1) |
| `npm run check` | pass (after HANDOFF.md/VERIFICATION.md were added; earlier run failed only on those two missing files) |
| `npm run build:preview` (twice) | byte-identical output (diff of both run logs clean) |
| `npm run check:generated:preview` | pass: manifest hashes match, preview matches sources, worker embedded |
| Loopback HTTP probe (`node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview`) | `/` 200, `/en/` 200, `/en/index.html` 200, `/js/app.js` 200, `/js/core/range.mjs` 200, traversal `..%2f..%2fpackage.json` 404, missing page 404, HEAD `/` 200; response headers include CSP (`worker-src blob:`, rest `self`/`none`, `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-Robots-Tag: noindex,nofollow` |

## Test coverage

- **Core** (`test/core.test.mjs`, 21 tests): all 7 literal fixtures from
  `fixtures.json` deep-compared verbatim (`gap-and-overlap`,
  `negative-touch`, `duplicate-interval`, `triple-depth`, `no-intervals`,
  `outside`, `zero-length`); decimal grammar accept/reject (incl. `+1`,
  `1e3`, `01`, `1.0001`, `1000000000.001`); `-0` normalisation and
  zero-stripping; SCHEMA (null/array/missing/extra/wrong-type/accessor);
  EMPTY / ENDPOINT / DOMAIN_ORDER ordering; capacity → surrogate →
  row-count ordering (16,384 chars, lone surrogates, 200/201 rows);
  per-row errors with physical 1-based rows (ROW_FORMAT, ENDPOINT,
  INTERVAL_ORDER, OUTSIDE, INTERVAL_ORDER-before-OUTSIDE); trailing-LF
  handling; span merging; conservation (`covered + uncovered = end − start`,
  `overlapped ≤ covered`); sub-thousandth precision; exact report bytes
  (canonical key order, one LF); `OUTPUT_LIMIT` via a synthetic 50,000-span
  result (through `runAudit` alone the cap is unreachable — 200 rows bound
  the report to ~24 KB).
- **Controller** (`test/controller.test.mjs`, 11 tests): initial empty state
  and default draft; run success; run-while-busy ignored; all 3 controller
  fixtures (`state-dirty-error`, `state-cancel-late`,
  `state-replace-late` — the newer work starts after an edit terminates the
  older one, per the recorded interpretation in HANDOFF.md); edit-while-busy
  terminates work and drops the late result; cancel no-op off busy;
  rejecting runner → `WORKER_ERROR` with the draft kept; `loadExample`;
  `DEFAULT_DRAFT` values.
- **Worker** (`test/worker.test.mjs`, 4 tests): valid/invalid snapshots
  through `handleWorkerMessage`, malformed messages → `WORKER_ERROR`, no
  stack leakage.
- **HTML** (`test/html.test.mjs`, 5 tests): exact SPEC title/description/H1/
  FAQ strings on both pages, all required control ids, `noindex`, CSP meta,
  relative canonical/hreflang with no fabricated production domain,
  `app.js` placeholder + sink scan, `package.json` contract.
- **Build** (`test/build.test.mjs`, 1 test): two builds into separate temp
  dirs are byte-identical (per-file SHA-256) and `check-generated` passes on
  the temp output.

## Fixes made during verification (all re-tested)

1. `node --test test/` is treated as a module path; the `test` script is now
   bare `node --test`.
2. Inline-handler regex false-positived on `content=`; replaced with an
   explicit event-attribute list in `scripts/check.mjs` and `test/html.test.mjs`.
3. `check-generated.mjs` built the expected file list unsorted
   (`build-info.json` appended last); now sorted before comparison.
4. `scripts/serve.mjs` returned 404 for directory paths (`/en/`); it now
   serves `<dir>/index.html` with the same traversal checks.
5. `app.js` download handler revoked the report text before reading it;
   fixed to capture the text first.

## Spec errata

**None.** Every printed fixture in `fixtures.json` (7 core + 3 controller)
reproduces exactly from the SPEC's own rules. No printed value had to be
overruled. Interpretations of SPEC-silent points are recorded in HANDOFF.md
(EMPTY trigger, preview relative canonical/hreflang, run-while-busy, the
OUTPUT_LIMIT enforcement point).

## NOT_RUN

- Real-browser rendering/interaction, including the actual module-Worker run,
  Blob download byte verification, keyboard/focus walkthrough, 320 px and
  real 200% zoom, reduced motion, and touch targets.
- Real devices, assistive technology, measured contrast of the tool's own UI.
- Chrome/Edge cross-browser evidence; Network/Storage zero-request audit
  with an isolated profile.
- Deployment; independent nine-aspect review.

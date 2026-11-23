# Verification — Golden Hour Calculator （黃金時刻計算）

## Fixed source

- Spec id: `spec-golden-hour-calculator-20261121` (draft PR #396, registry rev 1827)
- Spec fixtures vendored verbatim at `test/fixtures.json`, SHA-256 `4984ccc36ee7bb4dbcaaefddcd11c8f4020390658d8ccc78ab187053941f4710`
- Implementation base: `codex/initial-publication` @ `8c2652671012498891e7f7afe02fdca3f154aa64`
- Branch: `muse/golden-hour-calculator-production-20261121`
- Environment: Node v24.22.1, no dependencies, loopback-only tooling.

## Commands run (all from `tools/golden-hour-calculator/`)

| Command | Result |
| --- | --- |
| `node --test` | 44 pass, 0 fail (16 core fixtures + 11 core extra tests + 11 controller tests + 2 site tests) |
| `node scripts/check.mjs` | Pass (files, package contract, core fields/limits/defaults/example, pages, city presets, syntax, worker concatenation, capability scan, core purity) |
| `node scripts/build.mjs --mode preview` (run 1) | 9 files; BUILD-MANIFEST.json SHA-256 `12fd922ecf77315367f7ef1cf280f48cd9007aefc534e3fd982a3f74b74de32f` |
| `node scripts/build.mjs --mode preview` (run 2) | Same SHA-256 `12fd922ecf77315367f7ef1cf280f48cd9007aefc534e3fd982a3f74b74de32f`; manifests byte-identical |
| `node scripts/check-generated.mjs --mode preview` | Pass (9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes; not production) |

## What the tests cover

- All 16 literal core fixtures deep-compared (12 successful incl. polar day/night, Reykjavík no-window cases, and both +14:00 wrap cases; 4 error cases), plus legal endpoints (latitude ±89.9, longitude ±180, offset −12:00/+14:00, dates 1900-01-01/2100-12-31, leap day 2028-02-29 and the 1900/2000 century-leap distinction), just-outside values, grammar failures, emptiness/capacity/surrogate, first-error-wins ordering, schema violations with an accessor-invocation guard, hostile strings, and properties: day-length display, equal morning/evening durations, golden windows containing sunrise/sunset, blue meeting golden at the shared bound, polar null-times with noon elevation still returned, and the corrected polar-symmetry property (each swap alone flips the status; both together preserve it — see HANDOFF.md errata candidate 1).
- All 3 controller fixtures (state-dirty-error, state-cancel-late, state-replace-late) with a controllable fake worker, plus generation isolation, replacement, worker-failure, load-example, and reset cases.
- Both static pages: language, title, description, h1, preview noindex, no canonical/hreflang, relative language links, same-language home links, precision statement in input and results areas, all five FAQ answers, results heading, and all control/error-slot ids.
- Report serialization: the worked example's canonical bytes and SHA-256 `2be281d1f9c64ded806eb5c45ab17f93a572740410e181a3bb61be8e34ae8daf` are pinned in the core test; serialization never invokes an input `toJSON`.

## NOT_RUN

- Real-browser evidence (Chrome/Edge, both languages, keyboard, 320 px, 200% zoom, reduced motion, touch targets, Network/Storage zero-request check, Blob download bytes, offline calculation): no isolated browser mechanism was available to this builder; NOT_RUN, not claimed as passed.
- The nine-aspect independent review (functionality, boundaries, privacy, security, usability, accessibility, localization-seo, toolchain-provenance, compatibility): all NOT_RUN, awaiting the independent reviewer on the fixed PR head.
- Production build / deployment / catalog: refused and not attempted; preview only, noindex.

## Known limitations

- One spec-errata candidate is recorded in HANDOFF.md (the tests-section symmetry sentence is false as literally written; the implementation follows the normative formula and all fixtures).
- Serve smoke test (`node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview`, loopback curl): `/` 200 text/html, `/en/index.html` 200 text/html, `/robots.txt` deny-all, missing path 404, `../package.json` traversal 404, `X-Robots-Tag: noindex, nofollow` on HTML, full SPEC CSP header present. Server stopped after the check.

## Next owner

Independent reviewer (parent verifies the PR head first).

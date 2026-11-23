# Verification — Highway Toll Calculator （國道通行費試算）

## Fixed source

- Spec id: `spec-highway-toll-calculator-20261121` (draft PR #388, registry rev 1787)
- Implementation base: `codex/initial-publication` @ `8c2652671012498891e7f7afe02fdca3f154aa64`
- Branch: `muse/highway-toll-calculator-production-20261121`
- Candidate commit / PR: (filled after push — see the parent report for the PR number and head SHA)
- Environment: Node v24.22.1, `node --test`, no network, no browser.

## Results

- `node --test`: 46 tests, 46 passed, 0 failed. Covers all 14 literal core fixtures and all 3 literal error fixtures (deep-compared against the vendored `test/fixtures.json`), both controller fixtures (state-dirty-error, state-cancel-late) with a controllable fake Worker, plus hand-derived boundary/grammar/schema/order/half-up/daily-settlement/pair-reverse/etag checks and the pinned canonical report bytes (SHA-256 `aafd63954bc51cb7f2c4ccc55bd83fb9c56e8f475d6ed5711bd7d973db75ae42`).
- `node scripts/check.mjs`: passed (files, package contract, core fields/limits/defaults/example/interchange table/rates, bilingual pages, vehicle + interchange options, syntax, worker concatenation, forbidden-capability scan, core purity).
- `node scripts/build.mjs --mode preview` run twice: byte-identical (BUILD-MANIFEST.json SHA-256 `61bb2dc0c3d8f40fca8a07fe926bf43cdcbe1d5540862bbe707424d7bdc562b1` on both runs; 9 files).
- `node scripts/check-generated.mjs --mode preview`: passed (dist-preview file set, byte counts, SHA-256, bilingual metadata, worker source equals fixed bytes, robots.txt denies all).
- Independent pre-implementation check: a Python `decimal.Decimal` scratch implementation of the SPEC's formula reproduced all 14 core fixtures value-for-value before any product code existed (0 mismatches).

## NOT_RUN

- Real-browser / device evidence (Chrome and Edge, both languages, 1280×800 and 320 CSS px, 200% zoom, keyboard, reduced motion, touch targets, contrast): NOT_RUN — no isolated browser mechanism was available to this builder; Node/DOM-substitute checks must not be presented as browser passes.
- Network / Storage zero-request audit (clean isolated profile, local/sessionStorage, IndexedDB, CacheStorage, cookies, service worker, URL, console): NOT_RUN — same reason; the code paths forbid fetch/XHR/storage by construction and the static check scans for the tokens, but no live profile audit was run.
- The nine-aspect independent review (functionality, boundaries, privacy, security, usability, accessibility, localization-seo, toolchain-provenance, compatibility): NOT_RUN — for the independent reviewer against the fixed PR head.
- Serve smoke test (`node scripts/serve.mjs` + GET/HEAD/MIME/404/traversal): NOT_RUN — the server code is the sibling tool's unchanged loopback-only implementation; no live HTTP request was made in this session.
- Production build / formal HTTPS / SEO: NOT_RUN — no production origin is approved; preview only.

## Known limits

- The tool estimates from interchange distances; actual bills sum per-gantry prices and can differ by a few dollars. This is disclosed in the page's fixed text (with the official Keelung–Tainan example), per the SPEC.
- Long-holiday flat-rate plans are out of scope; the tool covers normal-day / regular-holiday rates only.
- Only Freeway 1 interchanges are offered (14 stations); Freeways 3, 3A, and 5 are out of the MVP scope per the SPEC.

## Next owner

Independent reviewer (parent verifies the PR head first), then the nine-aspect review and real-browser evidence.

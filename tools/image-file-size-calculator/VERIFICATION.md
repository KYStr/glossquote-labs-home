# Image File Size Calculator （圖片檔案大小估算）— VERIFICATION

- Spec: `spec-image-file-size-calculator-20261121`, draft spec PR
  #407, head `8c510a9a8a8fcf1658b94e8743d84d4e09885c54` (OPEN at build
  time), base `codex/initial-publication`. Registry rev 1882 (per
  parent task).
- Spec source (fixed): `docs/specs/image-file-size-calculator/` at
  the spec PR head — `SPEC.md`, `BRIEF.md`, `fixtures.json`
  (SHA-256
  `68f16b6decd4518d843d484a667f17ada8862eba9f5c7eed578e047b621c2a1e`,
  verified byte-identical against the spec PR head via the GitHub
  API), `AUTHOR-CHECK.md`.
- Production branch: `muse/image-file-size-calculator-production-20261121`,
  base `codex/initial-publication`.
- Production PR: #443 (draft, OPEN),
  https://github.com/KYStr/glossquote-labs-home/pull/443, head
  `68cd4a7dc9ba18a87c1a1e1c27015392002869c0` (read back with
  `gh pr view`).
- Environment: Node v24.22.1, no network use by the tool itself
  (zero runtime dependencies), local VM only.

## Commands and results (all run in `tools/image-file-size-calculator/`)

| Command | Result |
| --- | --- |
| `node --test` | 60/60 pass, 0 fail (Node v24.22.1) |
| `node scripts/check.mjs` | pass |
| `node scripts/build.mjs --mode preview` (1st) | pass; BUILD-MANIFEST.json SHA-256 `6e1bd7439058f1adb81b6775800444bb42c35ac46693ec1c525f366bcacb5fcd` |
| `node scripts/check-generated.mjs --mode preview` (after 1st build) | pass |
| `node scripts/build.mjs --mode preview` (2nd) | pass; BUILD-MANIFEST.json SHA-256 `6e1bd7439058f1adb81b6775800444bb42c35ac46693ec1c525f366bcacb5fcd` (identical to 1st) |
| `node scripts/check-generated.mjs --mode preview` (after 2nd build) | pass |
| `node scripts/serve.mjs` (smoke: start, GET /, stop) | pass: zh 200, en 200, css 200, missing 404, traversal 403, CSP + X-Robots-Tag noindex + nosniff headers present, h1 correct; server stopped, port free afterwards |

## Test breakdown (60 tests)

- Core fixtures: 17/17 literal cases from `test/fixtures.json`
  (11 success, 6 error), full deep-equal of the complete result or
  error triple.
- Independent re-derivation: a separately written BigInt calculator
  (remainder-comparison half-up, not the implementation's
  (2n + d) / 2d form) reproduces all 11 success fixtures; a
  Python/Fraction script reproduced them before implementation too.
- Boundaries (hand-derived, never from implementation output):
  dimension endpoints 1 / 100000 / 100001, total pixels exactly
  1,000,000,000 (legal) vs 1,000,000,001 (RANGE on heightPx),
  every bit-depth and format enum value, GIF 8-bit cap at 48-bit,
  1-bit odd-bit ceil (3×1 → 1 byte), half-up KB tie (128 bytes →
  "0.13"), display-size unit boundaries (1023 B / 1.00 KB /
  1024.00 KB / 1.00 MB), validation order, capacity-before-grammar,
  leading-zero/sign/space/exponent grammar, EMPTY per field, SCHEMA
  (unknown/missing/mistyped/accessor/non-object), lone-surrogate
  UNICODE, hostile markup strings inert.
- Controller fixtures: 3/3 literal flows (state-dirty-error,
  state-cancel-late, state-replace-late) driven by a controllable
  fake worker, plus 9 generation-guard unit tests (edit during
  busy, run-while-busy replacement, cancel no-op, loadExample,
  worker error, createWorker failure, reset from success, edit from
  error, select-change revocation).
- Report: jpeg-photo-12mp report matches the independently derived
  canonical literal byte for byte; live run of the example produces
  the identical report; tiny-icon report canonical key order;
  2 MiB limit constant; non-plain inputs refused, accessors and
  toJSON never invoked.
- Site: bilingual metadata, preview noindex, no canonical/hreflang,
  relative language links, same-language home links, estimate note
  in both languages on both pages, pinned FAQ answers, draft-loss
  note, all four controls/error slots/result regions, all seven
  formats and bit depths as options with the SPEC defaults
  preselected, all seven pinned factor values on both pages.

## Build reproducibility

- `BUILD-MANIFEST.json` SHA-256 after the 1st preview build: `6e1bd7439058f1adb81b6775800444bb42c35ac46693ec1c525f366bcacb5fcd`.
- `BUILD-MANIFEST.json` SHA-256 after the 2nd preview build: `6e1bd7439058f1adb81b6775800444bb42c35ac46693ec1c525f366bcacb5fcd`.
- The two hashes are identical; the manifest lists per-file
  bytes and SHA-256 for every file in `dist-preview/`.
- `dist-preview/` is generated output (copies of `public/` plus the
  embedded `js/worker-source.js` and a deny-all `robots.txt`); it is
  committed with the tool as the preview candidate, per the run-6
  house pattern.

## NOT_RUN (not claimed, not passed)

- Real isolated Chrome and Edge runs (both languages: example,
  typed input, error, success-then-edit, cancel, reset, Blob
  download byte check, 1280×800 and 320 CSS px reflow, real 200%
  zoom, reduced motion, Tab/Shift+Tab, focus, contrast, touch
  targets): NOT_RUN — no isolated browser mechanism was available
  to this builder; Node/DOM-level checks are not a substitute.
- Network/Storage audit with a clean isolated profile (zero work
  requests, local/sessionStorage, IndexedDB, CacheStorage, cookies,
  service worker, URL, console): NOT_RUN — same reason. The code
  contains no fetch/XHR/WebSocket/beacon/analytics/remote-font/
  storage access, and `scripts/check.mjs` scans for those tokens,
  but a live audit still needs the browser.
- Native file-picker / OS download dialogs: NOT_RUN (human-only).
- Formal HTTPS/SEO gate (production canonical, hreflang, sitemap,
  robots.txt, headers, 404, root redirects): NOT_RUN — no
  production origin is approved; the candidate is preview-only
  (noindex, no canonical/hreflang).
- Independent nine-facet review of this PR head: NOT_RUN — belongs
  to the non-author reviewer.

## Known limitations / errata

- See HANDOFF.md §Spec-errata candidates: (1) format has no pinned
  raw capacity — the implementation applies no INPUT_LIMIT to
  format; (2) no literal fixture exercises the odd-bit ceil branch
  (product test covers it by hand); (3) UNICODE position for format
  is unspecified (documentation gap only).
- `public/js/app.js` imports `./worker-source.js`, which exists only
  in `dist-preview/` (embedded by the preview build from the fixed
  core + handler bytes). The raw `public/` tree is therefore not
  directly servable; serve from `dist-preview/` (the house pattern
  shared with the run-6 sibling tools).

## Next owner

Independent reviewer (non-author): verify this same PR head against
the nine acceptance facets, gather the real-browser evidence listed
under NOT_RUN, and decide on the three errata candidates with the
spec author before any acceptance claim.

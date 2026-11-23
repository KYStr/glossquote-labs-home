# Verification — UTM Builder

Environment: Node v24.22.1 (Linux), zero dependencies, tool directory
`tools/utm-builder/`. All commands run 2026-11-23 by the builder.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 67/67 tests |
| `npm run check` (`node scripts/check.mjs`) | PASS — all static checks |
| `npm run build:preview` (run twice) | PASS — preview written to `dist-preview/` both times, byte-identical (see hashes) |
| `npm run check:generated:preview` | PASS — dist-preview matches a fresh build byte for byte (7 files) |
| Loopback HTTP probe of `dist-preview` via `scripts/serve.mjs` (ephemeral port 41085) + curl | PASS — `GET /` 200 `text/html` with `<title>UTM 連結產生器｜Gloss Tools</title>`; `GET /en/` 200 with `<title>UTM Builder \| Gloss Tools</title>`; `GET /styles/app.css` 200 `text/css`; missing file 404; CSP includes `worker-src blob:`, `X-Robots-Tag` noindex |

## Build hashes (both builds identical)

```
f0fd5c81facf7c50818c424c0415f124b6e13e60da9ea0727c372adbac697739  en/index.html
dfc259de479f1c30cba2702880a778bdd0afded3a571258f9bcdf64c0066e71f  index.html
6a4b345d9635a39c553315fde49a9bce93410b2782238cbf22beddd8c46c2025  js/app.js
5b9327b140c81e71763b5d33028d0eacc80ccd42686332011b73ed518e7a7c29  js/core/controller.mjs
f36777c948181b5b307c5117ec8f33af5d45a871586b3b0a7033ce1b34904944  js/core/core.mjs
7f08cb311b62adb677b4cd9725666fee0e7430fa05da097c3670e69014b93773  js/worker-handler.mjs
ce1a32d3fef20a307e61d627870e79f03f13a608b75143e2e194473e39d26f37  styles/app.css
```

## Test breakdown (67)

- Core fixtures: all 15 SPEC core cases deep-equal (basic-social,
  with-term-content, existing-query, existing-fragment,
  encoding-spaces-specials, encoding-unicode, percent-in-value,
  empty-optional-omitted, trimmed-values, control-char,
  duplicate-utm-error, invalid-url-noscheme, invalid-url-ftp,
  missing-campaign, value-too-long).
- Core rules derived by hand from the SPEC and checked against the
  platform's own encodeURIComponent/WHATWG URL behaviour: output shape
  (taggedUrl, params key/value in fixed order); value trimmed 100
  legal / 101 VALUE_TOO_LONG (with surrounding whitespace trimmed
  first); value raw 200 passes capacity then VALUE_TOO_LONG, 201
  INPUT_LIMIT; baseUrl raw 2048 legal capacity-wise, 2049 INPUT_LIMIT;
  first-error-wins in SPEC order (capacity baseUrl before source,
  source before medium, duplicate before EMPTY, invalid URL before
  EMPTY, per-field source before medium before campaign, EMPTY before
  INVALID_CHAR, INVALID_CHAR before VALUE_TOO_LONG); SCHEMA for wrong
  types / missing or extra fields / accessor property, null-prototype
  object accepted; lone high/low surrogates UNICODE on campaign,
  source and baseUrl (INPUT_LIMIT first when over capacity), paired
  surrogate emoji UTF-8-encodes (`sale 😀` → `sale%20%F0%9F%98%80`);
  control characters TAB/NUL/DEL INVALID_CHAR, trailing TAB trimmed
  away; reserved characters encoded (`?` → `%3F`, `&` → `%26`,
  `=` → `%3D`, `#` → `%23`, `+` → `%2B`, `/` → `%2F`), the pinned
  unencoded set left alone, `%` → `%25`, `é` → `%C3%A9` (uppercase
  hex); URL validation (empty/whitespace-only, username, password,
  `https://`, `http://?x=1`, mailto all INVALID_URL; uppercase scheme
  and host kept verbatim, no slash added after a bare host, port kept,
  CRLF trimming); merge (empty query leaves no empty segment, empty
  fragment `#` kept, `?#` kept, `?` inside a fragment is fragment
  text, query + fragment with fragment last); duplicate check for all
  five utm_* keys, a duplicate mid-query, a bare key segment, a utm_*
  name as a value (not a duplicate), `UTM_SOURCE` case difference
  (not a duplicate), `%75tm_source` raw-key comparison (not a
  duplicate), a duplicate inside the fragment (not a duplicate);
  values keep case, surrounding whitespace is trimmed, whitespace-only
  optional fields are omitted; invariants across 6 inputs (every
  accepted output re-parses with WHATWG URL, holds exactly the expected
  query parameters, and keeps the trimmed raw base prefix).
- Controller fixtures: all 3 SPEC state cases (dirty→error
  invalidation, cancel + late-result rejection + reset to all-empty
  draft, replace + older-late rejection), plus edit-during-busy
  termination, reset-to-default, loadExample filling the first SPEC
  fixture input and producing its exact result, presets (each of
  social/newsletter/ads fills source/medium, clears term/content,
  keeps campaign and baseUrl; a preset after success invalidates the
  old result; a preset during busy terminates work and drops the
  pending result; an unknown preset name is a no-op).
- Report: byte-exact serialization for the basic-social result (sorted
  keys, trailing LF, no BOM) and for the five-parameter
  with-term-content result, SHA-256 of the bytes matches the hash of
  the literal expected text, recursive key sorting with array order
  preserved, over-cap report returns OUTPUT_LIMIT.
- Pages: both languages' lang/title/H1/description, noindex, no
  canonical or hreflang in the candidate, no external assets,
  same-language `../../` home links, full control set (six inputs,
  run/example/three presets/copy/cancel/reset/download, status,
  result URL and the five param rows/values) and status semantics,
  real `<label>` elements, fixed disclaimer and all four SPEC FAQs on
  both pages, pinned encoding/merging rules text on both pages.
- Build: two builds byte-identical (sorted SHA-256 lists equal);
  Worker token replaced; the embedded Worker source driven end to end
  through a `self` shim returns the fixture-exact outcome for the
  basic-social input.
- Serve: real HTTP on an ephemeral loopback port — both pages 200 with
  titles, CSS MIME, CSP includes `worker-src blob:`, `X-Robots-Tag`
  noindex, HEAD 200 with an empty body, missing file 404, traversal
  rejected with 404.
- App (built app.js under a DOM/Worker/clipboard stub): example render
  with the exact tagged URL and param values (term/content rows
  hidden), validation failure with field association and focus,
  DUPLICATE_UTM and INVALID_URL on the baseUrl field, preset fill
  (ads: google/cpc, term/content cleared, campaign kept) followed by a
  successful build, copy success writing exactly the current tagged
  URL and copy failure showing COPY_FAILED while the result and
  download stay available (retry clears it), download click creating
  an anchor with the fixed filename `utm-builder-report.json` and a
  blob: URL, Worker onerror/construct/post failures settling to
  WORKER_ERROR and running again, late results/errors ignored after
  Reset/Cancel/edit, old Worker kept from killing the new Worker,
  queued failure ignored after Reset + new job, Traditional Chinese
  rendering of the same result.

## Spec errata candidates

1. Layout naming: SPEC implementation section says `src/core.mjs` etc.,
   while the handbook checklist and the build task fix the layout to
   `public/js/core/` + `public/js/app.js`. Built per handbook/task; no
   functional impact.
2. UNICODE placement is unpinned: the SPEC's general code table maps an
   unpaired surrogate to UNICODE, but the validation order never says
   where the surrogate check runs. Built as its own step immediately
   after capacity, covering all six fields in fixed field order.
3. Trim set for UTM values is unpinned: the SPEC pins the ASCII
   whitespace set (U+0020, Tab, CR, LF) for trimming baseUrl, and says
   only 去空白 for the values. Built with the same pinned set applied
   to the values.
4. No rule/fixture conflict found: all 15 core fixtures match an
   independent hand recomputation exactly. One builder-owned test
   expectation was corrected during the build (`https:///path` is valid
   under the SPEC's own host rule: WHATWG parsing reads its host as
   `path`); the core was right and the test was fixed.

## NOT_RUN (still open for the independent reviewer)

- Real-browser evidence (isolated Chrome and Edge, both languages):
  example load, typing, error focus, edit-after-success, cancel, reset,
  preset buttons, real clipboard copy, real Blob download byte check.
- Accessibility in a real browser: keyboard order, visible focus, 200%
  zoom, 320 CSS px reflow, reduced motion, contrast measurement, touch
  target measurement.
- Network/Storage observation in a clean browser profile (zero work
  requests, storage/URL/console inspection) and offline-after-load use.
- Real-device / mobile checks.
- Production HTTPS/SEO gate: self-canonical pair, reciprocal hreflang,
  sitemap, robots.txt and the planned origin
  `https://utm-builder.glossquote.com` (not configured).
- Native OS download dialog handling (manual only).

Product checks remain NOT_RUN; the nine acceptance aspects are unscored
(null) pending independent review of this candidate.

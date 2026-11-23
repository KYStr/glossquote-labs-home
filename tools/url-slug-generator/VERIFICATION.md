# Verification — URL Slug Generator

Environment: Node v24.22.1 (Linux), zero dependencies, tool directory
`tools/url-slug-generator/`. All commands run 2026-11-23 by the builder.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 64/64 tests |
| `npm run check` (`node scripts/check.mjs`) | PASS — all static checks |
| `npm run build:preview` (run twice) | PASS — preview written to `dist-preview/` both times, byte-identical (see hashes) |
| `npm run check:generated:preview` | PASS — dist-preview matches a fresh build byte for byte (7 files) |
| Loopback HTTP probe of `dist-preview` via `scripts/serve.mjs` (ephemeral port 33519) + curl | PASS — `GET /` 200 `text/html` with `<title>網址 slug 產生器｜Gloss Tools</title>`; `GET /en/` 200 with `<title>URL Slug Generator \| Gloss Tools</title>`; `GET /styles/app.css` 200 `text/css`; missing file 404; CSP includes `worker-src blob:`, `X-Robots-Tag` noindex |

## Build hashes (both builds identical)

```
d47b14a725776ffeb324e47388d0fad944d13ce37396fda675a482b28c0bc2fc  en/index.html
f16e166d8b14f34e30efdd5b9e22560dac8c14c486efec70f65e4edde16c2fcb  index.html
1e3c285a78e54b962ca5f3f389b118d271325d0fc95efcdcd2637db5c7101a73  js/app.js
d7632f9cf807ebedad95f891aeb25d064fa782b777c9df03ac86b4d9810d3c7a  js/core/controller.mjs
adde245c4ad38ca5f1816ba3db47f260f79cf51169ecb8501f72e2344e12aa73  js/core/core.mjs
7f08cb311b62adb677b4cd9725666fee0e7430fa05da097c3670e69014b93773  js/worker-handler.mjs
7507cdbffb8a940ef56ce996b755eda0a357e0f10776cec249a6373010ae89ae  styles/app.css
```

## Test breakdown (64)

- Core fixtures: all 16 SPEC core cases deep-equal (basic title,
  accent folding, special Latin map, Chinese dropped, CJK-only
  EMPTY_SLUG, hyphen collapse/trim, truncate-clean, truncate-exact,
  truncate-tiny, numbers kept, fullwidth + ligature, empty title,
  maxLength 0 RANGE, non-integer INTEGER_FORMAT, title 1001
  INPUT_LIMIT, whitespace-only EMPTY_SLUG).
- Core rules derived by hand from the SPEC and checked against the
  platform's own NFKD/lowercase behaviour: output field order
  slug/length/maxLength/truncated; maxLength 100 legal, 101 RANGE;
  title 1000 legal capacity-wise (truncates to 50 a's), 1001
  INPUT_LIMIT; "00"/"050"/" 50"/"50 "/" +50"/"1e2"/"50.0"/fullwidth
  digits INTEGER_FORMAT; 9-unit maxLength INPUT_LIMIT before grammar;
  empty maxLength applies the default 50; first-error-wins in SPEC
  order (capacity title before maxLength, EMPTY before RANGE/
  INTEGER_FORMAT, UNICODE before grammar); SCHEMA for wrong types /
  missing or extra fields / accessor property, null-prototype object
  accepted; lone high/low surrogates UNICODE (INPUT_LIMIT first when
  over capacity), surrogate in maxLength is INTEGER_FORMAT, paired
  surrogate emoji is a separator; all 14 special-map items in both
  cases; capital ẞ not in the table (separator: "ẞ" → EMPTY_SLUG,
  "GROẞE" → "gro-e"); NFKD cases (ﬁ → fish, Ångström → angstrom,
  ① → 1-top, ½ → 1-2, İ → i, ﬀ → ff); separator folding
  (underscore, punctuation, emoji, em dash, spaces, apostrophes);
  truncation cutting on a hyphen (cut at 3 → "aa", at 5 → "aa-bb",
  at 6 → "aa-bb"); slug-grammar + cap invariant across 12 inputs.
- Controller fixtures: all 3 SPEC state cases (dirty→error
  invalidation, cancel + late-result rejection + reset to
  `{"title":"","maxLength":"50"}`, replace + older-late rejection),
  plus edit-during-busy termination, reset-to-default, and loadExample
  filling the first SPEC fixture input and producing its exact result.
- Report: byte-exact serialization for the basic-title result (sorted
  keys, trailing LF, no BOM), SHA-256 of the bytes matches the hash of
  the literal expected text, recursive key sorting with array order
  preserved, truncated result carrying `truncated: true`.
- Pages: both languages' lang/title/H1/description, noindex, no canonical
  or hreflang in the candidate, no external assets, same-language
  `../../` home links, full control set (including btn-copy and
  result-slug/length/maxlength/truncated) and status semantics, fixed
  disclaimer and all four SPEC FAQs on both pages, pinned conversion
  rules text on both pages.
- Build: two builds byte-identical (sorted SHA-256 lists equal, plus
  `diff -r` clean via `diff` of the two hash lists); Worker token
  replaced; the embedded Worker source driven end to end through a
  `self` shim returns the fixture-exact outcome for title "Hello
  World" (slug `hello-world`, length 11, maxLength 50).
- Serve: real HTTP on an ephemeral loopback port — both pages 200 with
  titles, CSS MIME, CSP includes `worker-src blob:`, `X-Robots-Tag`
  noindex, missing file 404.
- App (built app.js under a DOM/Worker/clipboard stub): example render
  with all four result facts (slug, 30, 50, No), validation failure
  with field association and focus, EMPTY_SLUG and RANGE on the right
  fields, copy success writing exactly the current slug and copy
  failure showing COPY_FAILED while the result and download stay
  available (retry clears it), download click creating an anchor with
  the fixed filename `url-slug-generator-report.json` and a blob: URL,
  Worker onerror/construct/post failures settling to WORKER_ERROR and
  running again, late results/errors ignored after Reset/Cancel/edit,
  old Worker kept from killing the new Worker, queued failure ignored
  after Reset + new job, Traditional Chinese rendering of the same
  result (truncated "否").

## Spec errata candidates

1. Layout naming: SPEC implementation section says `src/core.mjs` etc.,
   while the handbook checklist and the build task fix the layout to
   `public/js/core/` + `public/js/app.js`. Built per handbook/task; no
   functional impact.
2. No rule/fixture conflict found: all 16 core fixtures match an
   independent hand recomputation exactly.

## NOT_RUN (still open for the independent reviewer)

- Real-browser evidence (isolated Chrome and Edge, both languages):
  example load, typing, error focus, edit-after-success, cancel, reset,
  real clipboard copy, real Blob download byte check.
- Accessibility in a real browser: keyboard order, visible focus, 200%
  zoom, 320 CSS px reflow, reduced motion, contrast measurement, touch
  target measurement.
- Network/Storage observation in a clean browser profile (zero work
  requests, storage/URL/console inspection) and offline-after-load use.
- Real-device / mobile checks.
- Production HTTPS/SEO gate: self-canonical pair, reciprocal hreflang,
  sitemap, robots.txt and the planned origin
  `https://url-slug-generator.glossquote.com` (not configured).
- Native OS download dialog handling (manual only).

Product checks remain NOT_RUN; the nine acceptance aspects are unscored
(null) pending independent review of this candidate.

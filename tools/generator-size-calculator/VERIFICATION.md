# Verification — Generator Size Calculator

Environment: Node v24.22.1 (Linux), zero dependencies, tool directory
`tools/generator-size-calculator/`. All commands run 2026-11-23 by the builder.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 62/62 tests |
| `npm run check` (`node scripts/check.mjs`) | PASS — all static checks |
| `npm run build:preview` (run twice) | PASS — preview written to `dist-preview/` both times, byte-identical (see hashes) |
| `npm run check:generated:preview` | PASS — dist-preview matches a fresh build byte for byte (7 files) |
| Loopback HTTP probe of `dist-preview` via `scripts/serve.mjs` (ephemeral port 35703) + curl | PASS — `GET /` 200 `text/html` with `<title>發電機容量試算｜Gloss Tools</title>`; `GET /en/` 200 with `<title>Generator Size Calculator \| Gloss Tools</title>`; `GET /styles/app.css` 200 `text/css`; missing file 404; CSP includes `worker-src blob:`, `X-Robots-Tag` noindex |

## Build hashes (both builds identical)

```
5d9aa2795517788557445a422a19e5523840366dc7b06c243689c964282ef771  en/index.html
30b82d50be6a747a6cbe5d8d6bcbee9ba33296da321f51e0b07fafb7cb835ede  index.html
6a4df380902b06b298e915b2da956d79dba226a9ad2efa7ff46a151706ebe2ff  js/app.js
a85c58fdafe6600e69eab38372932cb5a6f70a725a6cd35d7b861c32e2eb4a0d  js/core/controller.mjs
f57e11ada71cf92a2bf2ae3cc44c650b26b2dde8a5b7492a5bb9404ae7e5b34f  js/core/core.mjs
7f08cb311b62adb677b4cd9725666fee0e7430fa05da097c3670e69014b93773  js/worker-handler.mjs
018e79062be276bdf4760123922277ddb1641c039515efd68c1bdb248f28405d  styles/app.css
```

## Test breakdown (62)

- Core fixtures: all 14 SPEC core cases deep-equal (sums, surges,
  margins, kVA ceil values, retail sizes, oversize flag, error
  codes/fields/rows).
- Core rules derived by hand from the SPEC and checked against an
  independent exact-rational (Python Fraction) recomputation: range
  endpoints 1/20000 and 1/30000 legal, just-outside values RANGE on the
  right field, recommended kVA exactly 20.0 stays on the table (12800 W
  → 20.0/20.0), 20.1 kVA is oversize and rounds to a 0.5 step (12801 W
  → 20.1/20.5; 12992 W → 20.3/20.5), exact tenth not pushed up (640 W →
  required 1.0), 12 rows legal and adding up (1200 W → 1.9/2.0), grammar
  accept/reject set (`007`, `00`, spaces, `100.5`, `+100`, `1e3`,
  `1,000`, full-width digits invalid), INPUT_LIMIT/EMPTY order (9-char
  watts, 41-char name, 40-char name legal, 8-char watts range-checked),
  UNICODE for control chars and lone surrogates (name and watts),
  first-error-wins by row then field, duplicate names (later row, exact
  case-sensitive comparison, duplicate check before cross-field),
  cross-field starting < running on row 2, SCHEMA for wrong types /
  missing or extra fields / accessor properties / non-object rows, all
  12 Honda preset values verbatim, and ceil/format/size invariants
  (one-decimal kVA strings, (t−1)·80 < W ≤ t·80, size ≥ recommendation,
  oversize sizes are 0.5 multiples, rows echo input order).
- Controller fixtures: all 3 SPEC state cases (dirty→error invalidation,
  cancel + late-result rejection + reset to the SPEC default draft,
  replace + older-late rejection), plus edit-during-busy termination,
  reset-to-default, addRow up to 12 / removeRow keeping at least one
  row, and loadExample producing the fridge-lights-tv result.
- Report: byte-exact serialization for fridge-lights-tv and for the
  oversize whole-house case (sorted keys, trailing LF, no BOM), SHA-256
  of the bytes matches the hash of the literal expected text, recursive
  key sorting with array order preserved, over-cap input → OUTPUT_LIMIT.
- Pages: both languages' lang/title/H1/description, noindex, no canonical
  or hreflang in the candidate, no external assets, same-language
  `../../` home links, full control set and status semantics, fixed
  disclaimer and the three SPEC FAQs on both pages.
- Build: two builds byte-identical (sorted SHA-256 lists equal);
  Worker token replaced; the embedded Worker source driven end to end
  through a `self` shim returns the fixture-exact outcome for the
  fridge-lights-tv input.
- Serve: real HTTP on an ephemeral loopback port — both pages 200 with
  titles, CSS MIME, CSP includes `worker-src blob:`, `X-Robots-Tag`
  noindex, missing file 404 (manual curl probe); the serve test
  additionally covers HEAD empty body and `..%2f` traversal rejection.
- App (built app.js under a DOM/Worker stub): example render with all
  result facts and the 3-row breakdown, validation failure with field
  association and focus on the right row, starting-below-running error
  on row 2, Worker onerror/construct/post failures settling to
  WORKER_ERROR and running again, late results/errors ignored after
  Reset/Cancel/edit, old Worker kept from killing the new Worker,
  queued failure ignored after Reset + new job, row add/remove and
  Honda preset fill (window-ac → 1500/2200), Traditional Chinese
  rendering of the same result.

## Spec errata candidates

1. Layout naming: SPEC implementation section says `src/core.mjs` etc.,
   while the handbook checklist and the build task fix the layout to
   `public/js/core/` + `public/js/app.js`. Built per handbook/task; no
   functional impact.
2. Surrogate-check scope (SPEC ambiguity): the preamble's generic
   "capacity, then surrogate, then grammar" order vs step 3's
   name-phrased UNICODE clause. The build reports UNICODE for a lone
   surrogate in a watts field; the alternative reading would report
   INTEGER_FORMAT. No fixture covers it.
3. No rule/fixture conflict found: all 9 numeric core fixtures match an
   independent exact-rational recomputation exactly.

## NOT_RUN (still open for the independent reviewer)

- Real-browser evidence (isolated Chrome and Edge, both languages):
  example load, typing, preset fill, row add/remove, error focus,
  edit-after-success, cancel, reset, real Blob download byte check.
- Accessibility in a real browser: keyboard order, visible focus, 200%
  zoom, 320 CSS px reflow, reduced motion, contrast measurement, touch
  target measurement.
- Network/Storage observation in a clean browser profile (zero work
  requests, storage/URL/console inspection) and offline-after-load use.
- Real-device / mobile checks.
- Production HTTPS/SEO gate: self-canonical pair, reciprocal hreflang,
  sitemap, robots.txt and the planned origin
  `https://generator-size-calculator.glossquote.com` (not configured).
- Native OS download dialog handling (manual only).

Product checks remain NOT_RUN; the nine acceptance aspects are unscored
(null) pending independent review of this candidate.

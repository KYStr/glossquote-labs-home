# Verification — Waist-to-Height Ratio Calculator

Environment: Node v24.22.1 (Linux), zero dependencies, tool directory
`tools/waist-height-ratio-calculator/`. All commands run 2026-11-23 by the builder.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 54/54 tests |
| `npm run check` (`node scripts/check.mjs`) | PASS — all static checks |
| `npm run build:preview` (run twice) | PASS — preview written to `dist-preview/` both times, byte-identical (see hashes) |
| `npm run check:generated:preview` | PASS — dist-preview matches a fresh build byte for byte (7 files) |
| Loopback HTTP probe of `dist-preview` via `scripts/serve.mjs` (ephemeral port 34963) + curl | PASS — `GET /` 200 `text/html` with `<title>腰高比計算機｜Gloss Tools</title>`; `GET /en/` 200 with `<title>Waist-to-Height Ratio Calculator \| Gloss Tools</title>`; `GET /styles/app.css` 200 `text/css`; missing file 404; CSP includes `worker-src blob:`, `X-Robots-Tag` noindex |

## Build hashes (both builds identical)

```
207f9c66aad3bfdf247c3cd23b06ae68bb6043827dffc8dcb20f76790df68bf1  en/index.html
e1ca7966a5957b1456d905c353e3183dc249fe55ee6d742d384d1b552e70ab34  index.html
077879d7790cd10bb241afdaaf31439a3d4291db1fbfc22d46b1632cc0705ca8  js/app.js
3db680827a2d281981a68ecf33e8b279f7f021d7a8a8912814f4a745013c38f7  js/core/controller.mjs
0566f0b9fa88ecfad517be889f10cc9f2bd7864e3a8d59a74ac5714441913625  js/core/core.mjs
7f08cb311b62adb677b4cd9725666fee0e7430fa05da097c3670e69014b93773  js/worker-handler.mjs
1c25b8e8305ba1b70cbf358472d4c9ca5c9e4293187cb8a28921834213ae3b1e  styles/app.css
```

## Test breakdown (54)

- Core fixtures: all 13 SPEC core cases deep-equal (ratios, categories,
  healthy ranges, distances, error codes/fields).
- Core rules derived by hand from the SPEC and checked against an
  independent Decimal recomputation: range endpoints 20/300 and 50/300
  legal, just-outside values RANGE on the right field, grammar
  accept/reject set (`.5`, `5.`, `+5`, `1e3`, ` 5`, `50%`, `1,000`,
  `12.345` invalid; leading zeros allowed, so `007` is a value 7 →
  RANGE), the 0.50 display trap in both directions (84.99/170 healthy,
  85.01/170 increased with distance `0.0`), the 0.40 flip (67.99/170
  below-healthy, 68.01/170 healthy), half-up ties (20.04/160 → `0.13`;
  0.5 × 160.1 = 80.05 → range max `80.1`), waist above height (300/50 →
  `6.00`, high, distance `275.0`), INPUT_LIMIT/EMPTY order, first-error-
  wins waist-before-height, SCHEMA for wrong types / missing or extra
  fields / accessor property, lone-surrogate UNICODE, range/order
  invariants, normalizeEcho rules.
- Controller fixtures: all 3 SPEC state cases (dirty→error invalidation,
  cancel + late-result rejection + reset, replace + older-late rejection),
  plus edit-during-busy termination and reset-to-empty-default.
- Report: byte-exact serialization for the healthy-mid result (sorted
  keys, trailing LF, no BOM), SHA-256 of the bytes matches the hash of
  the literal expected text, recursive key sorting with array order
  preserved, increased result carrying distance `0.0`.
- Pages: both languages' lang/title/H1/description, noindex, no canonical
  or hreflang in the candidate, no external assets, same-language
  `../../` home links, full control set and status semantics, fixed
  disclaimer and SPEC FAQ text on both pages.
- Build: two builds byte-identical (sorted SHA-256 lists equal, plus
  `diff -r` clean); Worker token replaced; the embedded Worker source
  driven end to end through a `self` shim returns the fixture-exact
  outcome for waist 76 / height 170.
- Serve: real HTTP on an ephemeral loopback port — both pages 200 with
  titles, JS MIME, CSP includes `worker-src blob:`, `X-Robots-Tag`
  noindex, HEAD empty body, 404, `..%2f` traversal rejected with 404.
- App (built app.js under a DOM/Worker stub): example render with all
  four result facts, validation failure with field association and focus,
  Worker onerror/construct/post failures settling to WORKER_ERROR and
  running again, late results/errors ignored after Reset/Cancel/edit,
  old Worker kept from killing the new Worker, queued failure ignored
  after Reset + new job, Traditional Chinese rendering of the same result.

## Spec errata candidates

1. Layout naming: SPEC implementation section says `src/core.mjs` etc.,
   while the handbook checklist and the build task fix the layout to
   `public/js/core/` + `public/js/app.js`. Built per handbook/task; no
   functional impact.
2. No rule/fixture conflict found: all 13 core fixtures match an
   independent recomputation exactly.

## NOT_RUN (still open for the independent reviewer)

- Real-browser evidence (isolated Chrome and Edge, both languages):
  example load, typing, error focus, edit-after-success, cancel, reset,
  real Blob download byte check.
- Accessibility in a real browser: keyboard order, visible focus, 200%
  zoom, 320 CSS px reflow, reduced motion, contrast measurement, touch
  target measurement.
- Network/Storage observation in a clean browser profile (zero work
  requests, storage/URL/console inspection) and offline-after-load use.
- Real-device / mobile checks.
- Production HTTPS/SEO gate: self-canonical pair, reciprocal hreflang,
  sitemap, robots.txt and the planned origin
  `https://waist-height-ratio-calculator.glossquote.com` (not configured).
- Native OS download dialog handling (manual only).

Product checks remain NOT_RUN; the nine acceptance aspects are unscored
(null) pending independent review of this candidate.

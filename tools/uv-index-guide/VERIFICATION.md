# Verification — UV Index Guide

Environment: Node v24.22.1 (Linux), zero dependencies, tool directory
`tools/uv-index-guide/`. All commands run 2026-11-23 by the builder.
Base `codex/initial-publication` @ `8c265267`; branch
`muse/uv-index-guide-production-20261121`.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 61/61 tests |
| `npm run check` (`node scripts/check.mjs`) | PASS — all static checks |
| `npm run build:preview` (run twice) | PASS — preview written to `dist-preview/` both times, byte-identical (see hashes) |
| `npm run check:generated:preview` | PASS — dist-preview matches a fresh build byte for byte (7 files) |
| Loopback HTTP probe of `dist-preview` via `scripts/serve.mjs` (ephemeral port 39871) + curl | PASS — `GET /` 200 `text/html` with `<title>紫外線指數指南｜Gloss Tools</title>`; `GET /en/` 200 with `<title>UV Index Guide \| Gloss Tools</title>`; `GET /styles/app.css` 200 `text/css`; missing file 404; `..%2f` traversal 404; CSP includes `worker-src blob:`, `X-Robots-Tag` noindex |

## Build hashes (both builds identical)

```
01cd6d76bb981318c19905f38dc1a4c8bf3f8fcdd70fe65dc3d7530bb6ca5369  en/index.html
f8ee6b1dfd90480ef50105ca964e7c5bc7a6e82351304075e0cd7dddc5d9ed94  index.html
79c835fd6d5a022cfe7880e70ebe32e6f8f08dae731ea4bd2476db5b16c428d6  js/app.js
e971d8de980c4332b587a1d65b66b6b4a33cb5cccb43a0f96bbd0081faf9b9c1  js/core/controller.mjs
8c471896fcd606e93ae5ae5288154a78692cb88e74bfe1f1ba21b8a2690f918a  js/core/core.mjs
7f08cb311b62adb677b4cd9725666fee0e7430fa05da097c3670e69014b93773  js/worker-handler.mjs
779ce74cd1de7ee9db3092752c8cc8cdac2ff8fcf0518db66029a653816eba20  styles/app.css
```

## Test breakdown (61)

- Core fixtures: all 16 SPEC core cases deep-equal (categories, colours,
  PMS codes, SPF, reapply, CWA burn times, advice, skin notes, burn
  estimates, disclaimers, error codes/fields).
- Core rules derived by hand from the SPEC: range endpoints 0 (burn null)
  and 20 (VI burn 33) legal with full expected objects; just-outside values
  RANGE on uvIndex; 19.9 legal, rounds to 20, burn uses raw 19.9 (10 min);
  grammar accept/reject set (`.5`, `5.`, `+5`, `-1`, `1e3`, ` 5`, `50%`,
  `1,000`, `08`, `8.55`, `12.34` invalid; `0.5`, `8.5` valid); half-up
  rounding flips (2.4→2 low, 2.5→3 moderate, 7.5→8 very-high, 10.4→10
  very-high); burn uses the unrounded index (6.5/I → 21 not 19; 10.5/III
  → 19 not 18); half-up tie (6.4/V → 62.5 → 63); cap boundaries (0.7/I →
  190 → 180 capped, 0.8/I → 167 not capped, 1.1/III → 182 capped,
  1.2/III → 167 not capped); full category table (SPF/CWA/avoidMidday per
  band); INPUT_LIMIT/EMPTY order (9 chars INPUT_LIMIT, 8 chars RANGE,
  missing uvIndex EMPTY); first-error-wins uvIndex-before-skinType; SCHEMA
  for wrong types / missing or extra fields / accessor property / bad skin
  types (`""`, `VII`, `iii`, `0`, `1`, padded); lone-surrogate UNICODE on
  both fields, after INPUT_LIMIT; invariants (minutes integer or null,
  capped implies 180, 1–180 range); normalizeEcho rules.
- Controller fixtures: all 3 SPEC state cases (dirty→error invalidation,
  cancel + late-result rejection + reset to the SPEC default draft,
  replace + older-late rejection), plus edit-during-busy termination,
  reset-to-default, and loadExample filling the first fixture case.
- Report: byte-exact serialization for the low-typical result (sorted
  keys, trailing LF, no BOM), SHA-256
  `208baa3d74b8fef8e3c2fc7ce7d13c6044d8e66c4f85ae5ba6668eb0af5f7153`
  matches the hash of the literal expected text; recursive key sorting
  with array order preserved; very-high result carrying CWA 20 and SPF 50.
- Pages: both languages' lang/title/H1/description, noindex, no canonical
  or hreflang in the candidate, no external assets, same-language
  `../../` home links, full control set and status semantics, all six skin
  options with III selected, SPEC default value 5, verbatim disclaimer and
  SPEC FAQs on both pages, and the estimate always negated as a safe time.
- Build: two builds byte-identical (sorted SHA-256 lists equal);
  Worker token replaced; the embedded Worker source driven end to end
  through a `self` shim returns the fixture-exact outcome for uvIndex 2 /
  skin type III.
- Serve: real HTTP on an ephemeral loopback port — both pages 200 with
  titles, CSS MIME, CSP includes `worker-src blob:`, `X-Robots-Tag`
  noindex, 404, `..%2f` traversal rejected with 404.
- App (built app.js under a DOM/Worker stub): example render with all
  result facts (category, swatch class, SPF, burn, CWA, advice, skin note,
  verbatim disclaimer); skin-type change re-rendered with a new burn
  estimate (II at UV 2 → 83 min); validation failure with field
  association and focus; range failure on the uv field; Worker
  onerror/construct/post failures settling to WORKER_ERROR and running
  again; late results/errors ignored after Reset/Cancel/edit; old Worker
  kept from killing the new Worker; queued failure ignored after Reset +
  new job; Traditional Chinese rendering of the same result.

## Spec errata candidates

1. Layout naming: SPEC implementation section says `src/core.mjs` etc.,
   while the handbook checklist and the build task fix the layout to
   `public/js/core/` + `public/js/app.js`. Built per handbook/task; no
   functional impact.
2. Validation-detail judgement: present-but-wrong-typed field → SCHEMA
   with that field's name; accessor or unknown extra field → SCHEMA with
   field null. No fixture covers these sub-cases; reviewer may want to pin
   the choice in the SPEC.
3. No rule/fixture conflict found: all 16 core fixtures match an
   independent hand recomputation exactly.

## NOT_RUN (still open for the independent reviewer)

- Real-browser evidence (isolated Chrome and Edge, both languages):
  example load, typing, error focus, edit-after-success, cancel, reset,
  real Blob download byte check. Node/DOM-stub checks above are not a
  substitute.
- Accessibility in a real browser: keyboard order, visible focus, 200%
  zoom, 320 CSS px reflow, reduced motion, contrast measurement (including
  the category swatches), touch target measurement.
- Network/Storage observation in a clean browser profile (zero work
  requests, storage/URL/console inspection) and offline-after-load use.
- Real-device / mobile checks.
- Production HTTPS/SEO gate: self-canonical pair, reciprocal hreflang,
  sitemap, robots.txt and the planned origin
  `https://uv-index-guide.glossquote.com` (not configured).
- Native OS download dialog handling (manual only).

Product checks remain NOT_RUN; the nine acceptance aspects are unscored
(null) pending independent review of this candidate.

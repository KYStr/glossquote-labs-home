# Verification — Bike Frame Size Calculator

Environment: Node v24.22.1 (Linux), zero dependencies, tool directory
`tools/bike-frame-size-calculator/`. All commands run 2026-11-23 by the builder.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 58/58 tests |
| `npm run check` (`node scripts/check.mjs`) | PASS — all static checks |
| `npm run build:preview` (run twice) | PASS — preview written both times, byte-identical (see hashes) |
| `npm run check:generated:preview` | PASS — dist-preview matches a fresh build byte for byte (7 files) |
| Loopback HTTP probe of `dist-preview` via `scripts/serve.mjs` (ephemeral port, in serve.test.mjs) | PASS — `GET /` 200 `text/html` with `<h1>單車車架尺寸計算</h1>`; `GET /en/` 200 with `<h1>Bike Frame Size Calculator</h1>`; `GET /js/app.js` 200 `text/javascript`; HEAD empty body; missing file 404; `..%2f` traversal 404; CSP includes `worker-src blob:`, `X-Robots-Tag` noindex |

## Build hashes (both builds identical)

Combined sorted per-file SHA-256 list hash (both runs):
`dcec430c188fed5d53b7af07d2a88dc42e2da730554021e9c947141e41c66c16`

```
ae9e637d732da5b55595638698cfe4d1e934ddc46ca7b7d2d2759f0012cb4180  en/index.html
ef580d2be36290c04d5bfbf39fe029fd699e89f8bd928581eb65f82c4d66f462  index.html
ec15d10ee0570f78469b5b2b21b10fb3a294ddd34c710713f90b168497c2e98c  js/app.js
edb358cf81aefdef5d99c5331bddc5537a372b150959f2936d10c821f3feeeca  js/core/controller.mjs
c5d775f299e40aaac4ad871e06396719bef5086e64975b2bff3167604e3b517f  js/core/core.mjs
7f08cb311b62adb677b4cd9725666fee0e7430fa05da097c3670e69014b93773  js/worker-handler.mjs
1b291e29e13a439f30ee50a104afdbda8619cafb56f602ec3afb12040f34d331  styles/app.css
```

## Test breakdown (58)

- Core fixtures: all 12 SPEC core cases deep-equal (9 success + 3 error:
  road-typical, mtb-typical, hybrid-typical, road-small, road-tall,
  mtb-tall, hybrid-short, road-min-inseam, road-max, inseam-below-min,
  height-two-decimals, bike-type-gravel).
- Core rules derived by hand from the SPEC and checked against an
  independent Decimal recomputation: range endpoints 120/220 and 50/110
  legal, just-outside values RANGE on the right field, grammar
  accept/reject set (`.5`, `5.`, `+5`, `1e3`, ` 5`, `50%`, `1,000`,
  `175.55`, `80.55` invalid; leading zeros allowed, so `007` is a value
  7 → RANGE), bike type accept/reject (road/mountain/hybrid only;
  `Road`, `gravel`, `mtb` → ENUM; empty → EMPTY), same-inseam relations
  (road 60.3 > hybrid 57.6 > mountain 49.3, road − mountain == 11.0,
  same saddle 79.5), range endpoints centre ± 1.0 on the unrounded
  centre, letter boundaries at every half-open edge (149.9 XXS / 150 XS /
  159.9 XS / 160 S / 167.9 S / 168 M / 177.9 M / 178 L / 184.9 L / 185 XL /
  192.9 XL / 193 XXL), ratio endpoints 0.40/0.50 quiet with just-outside
  warning (79.9/200 = 0.3995 warns with displayed ratio 0.4; 100.1/200
  = 0.5005 warns with 0.501), half-up ties (saddle 44.15 → 44.2; centre
  47.96 → 48.0), INPUT_LIMIT/EMPTY order (7 chars → INPUT_LIMIT, exactly
  6 chars capacity-legal), first-error-wins height-before-inseam-before-
  type, SCHEMA for wrong types / missing or extra fields / accessor
  property, lone-surrogate UNICODE (including on bikeType), range/order
  invariants, normalizeEcho rules.
- Controller fixtures: all 3 SPEC state cases (dirty→error invalidation,
  cancel + late-result rejection + reset to the SPEC default draft,
  replace + older-late rejection), plus edit-during-busy termination and
  reset-to-default.
- Report: byte-exact serialization for the road-typical result (sorted
  keys, trailing LF, no BOM), SHA-256 of the bytes matches the hash of
  the literal expected text, recursive key sorting with array order
  preserved, warned result carrying the ratio warning object.
- Pages: both languages' lang/title/H1/description, noindex, no canonical
  or hreflang in the candidate, no external assets, same-language
  `../../` home links, full control set and status semantics, fixed
  disclaimer and SPEC FAQ text on both pages.
- Build: two builds byte-identical (sorted SHA-256 lists equal, plus
  `diff -r` clean); Worker token replaced; the embedded Worker source
  driven end to end through a `self` shim returns the fixture-exact
  outcome for height 175 / inseam 80 / road.
- Serve: real HTTP on an ephemeral loopback port — both pages 200 with
  titles, JS MIME, CSP includes `worker-src blob:`, `X-Robots-Tag`
  noindex, HEAD empty body, 404, `..%2f` traversal rejected with 404.
- App (built app.js under a DOM/Worker stub): example render with all
  six result facts, validation failure with field association and focus,
  ratio warning shown without blocking the result, bike type switch
  recomputing from the same measurements (road 53.6 → mountain 42.6),
  Worker onerror/construct/post failures settling to WORKER_ERROR and
  running again, late results/errors ignored after Reset/Cancel/edit,
  old Worker kept from killing the new Worker, queued failure ignored
  after Reset + new job, Traditional Chinese rendering of the same result.

## Spec errata candidates

1. Layout naming: SPEC implementation section says `src/core.mjs` etc.,
   while the handbook checklist and the build task fix the layout to
   `public/js/core/` + `public/js/app.js`. Built per handbook/task; no
   functional impact.
2. Unreachable cross-field rule: height 120–220 cm and inseam 50–110 cm
   mean inseam > height can never occur after both range checks (max
   inseam 110 < min height 120). The cross-field RANGE rule can never
   fire; harmless defence-in-depth, but "inseam==height" cannot produce
   a cross-field error.
3. Ratio display edge: an exact ratio just outside the band can round to
   the band edge (0.3995 → displayed 0.4 with a warning). Follows the
   SPEC exactly; suggest the SPEC or UI copy note this case.
4. No rule/fixture conflict found: all 12 core fixtures match an
   independent Decimal recomputation exactly.

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
  `https://bike-frame-size.glossquote.com` (not configured).
- Native OS download dialog handling (manual only).

Product checks remain NOT_RUN; the nine acceptance aspects are unscored
(null) pending independent review of this candidate.

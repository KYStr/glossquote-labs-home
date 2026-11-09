# Bicycle Gear Rollout Table — verification

- **Spec:** `spec-bicycle-gear-table-20261109` v1 (`docs/specs/bicycle-gear-table/`)
- **Candidate:** branch `muse/bicycle-gear-table-production-20261109`, base
  `codex/initial-publication` @ `c0a7fa3`
- **PR:** https://github.com/KYStr/glossquote-labs-home/pull/118 (draft)
- **Environment:** Node v24.22.1, offline; loopback HTTP probe on 127.0.0.1:8322

## Commands and results (all exit 0)

- `npm test` — **30 pass / 0 fail** (23 core + 7 flow). All 6 solve fixtures
  and both flow fixtures reproduced verbatim from `fixtures.json` via
  `assert.deepStrictEqual`; hand-derived cases cover group/combo index order,
  exact-ratio sorting, half-up rounding (1/7), the 48-pair maximum grid, the
  maximum speed numerator 10,800,000,000, SIZE at exactly ±1 byte of the
  65536-byte cap, SHAPE/TYPE/RANGE/DUPLICATE fixed paths, field validation
  order, and `parseIntegerField`/`formatTenths` rules.
- `npm run check` — pass (static checks: package contract, both pages'
  head/SEO, core purity, no fetch/storage/innerHTML/remote assets).
- `npm run build:preview` ×2 — **byte-identical** (full sha256 tree diff of
  `dist/`; 5 source files).
- `npm run check:generated:preview` — pass (generated files identical to
  source, preview noindex kept).
- `npm run build:production -- --origin https://glossquote.com` ×1 and
  `npm run check:generated:production` — pass (noindex removed, HTTPS
  canonicals, robots.txt announces the sitemap, sitemap lists exactly the
  two canonicals).
- Loopback HTTP probe (`node scripts/serve.mjs 8322`, killed after) — `/`
  and `/en/` 200 with the correct titles, `js/app.js`, core module and CSS
  200, path traversal 404, unknown path 404, SPEC CSP header
  (`default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self';
  worker-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none';
  frame-ancestors 'none'; object-src 'none'`) and
  `X-Content-Type-Options: nosniff` present.

## Spec errata

**None.** Every printed fixture reproduces exactly from the SPEC's own
rules. Two SPEC-silent interpretations, for the reviewer:

1. Array length outside 1–3 (front) or 1–16 (rear) is reported as `RANGE`
   at the array path (`/front`, `/rear`); the SPEC pins the length bounds
   but not the code/path for them.
2. At submit the form lists every invalid field (each with its fixed code
   and path) while `solve` returns the first error only; both use the same
   fixed codes, paths and messages.

## NOT_RUN

- Real-browser rendering/interaction (Chrome/Edge, keyboard, touch,
  320 CSS px, 200% zoom, reduced motion, Network/Storage observation).
- Real devices/touch, assistive tech, measured contrast.
- Deployment, production HTTPS checks, independent nine-aspect review.

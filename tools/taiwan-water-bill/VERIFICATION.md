# Taiwan Water Bill Calculator — Verification

Candidate: `tools/taiwan-water-bill/` on branch
`muse/taiwan-water-bill-production-20261109` (candidate SHA and PR to
be filled in at push time; see the report back to the parent agent).
Node v24.22.1. All commands run inside `tools/taiwan-water-bill/`
unless noted.

## Commands run (exit 0 unless noted)

- `npm test` — 56/56 pass (19 literal core fixtures, 3 literal
  controller fixtures, hand-derived boundary/validation/property
  cases, report serialization).
- `npm run check` — pass (files, package contract, core tariff
  tables/tier data/divisors/status/example, fixtures SHA-256 and
  counts, pinned bilingual strings, bilingual pages, syntax, worker
  concatenation, capability scan, core purity, no persistent storage).
- `npm run build:preview` run twice — the two `dist-preview/` trees
  and the two `BUILD-MANIFEST.json` files are byte-identical
  (recursive `diff` clean). 9 files in the preview.
- `npm run check:generated:preview` — pass (manifest hashes exact,
  bilingual metadata present, worker source matches fixed bytes).
- Loopback probe (`node scripts/serve.mjs --host 127.0.0.1 --port 4173
  --dir dist-preview`, then `curl`): 200 for `/`, `/en/`,
  `/styles/taiwan-water-bill.css`, `/js/app.js`,
  `/js/controller.mjs`, `/js/worker-handler.mjs`,
  `/js/core/taiwan-water-bill.mjs`, `/js/worker-source.js`,
  `/en/index.html`; traversal request 403; missing page 404; HTML
  responses carry the SPEC CSP header and `X-Robots-Tag: noindex,
  nofollow`. Server stopped afterwards; port 4173 closed.
- Independent recomputation: the hand-derived boundary values in the
  core tests were cross-checked with a separate Python
  `fractions.Fraction` implementation of the SPEC's pinned rules
  (same two-method approach as AUTHOR-CHECK.md); the Python run
  agreed on every value, including the 999,999-degree maximum
  (business tax 574,990,600 milli-NT).

## Fixed source

- Spec: `spec-taiwan-water-bill-20261109`, PR
  https://github.com/KYStr/glossquote-labs-home/pull/248 (OPEN),
  candidate commit `b23afd542d5252c179207f78cb95518925e42923`.
- Fixtures SHA-256:
  `121380896d9eb1fc76d1165c2f772b68388f7d0fffaca676074afa46506c94b7`
  (vendored verbatim as `test/fixtures.json`).
- Base commit: `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`.

## NOT_RUN

- Real browser (Chrome / Edge, desktop and mobile, 200% zoom,
  keyboard, touch, reduced motion): no isolated-browser mechanism is
  available to this builder; the success path, cancel, reset, Blob
  download, reflow and Network/Storage checks in a real browser are
  NOT_RUN.
- Real-device check: NOT_RUN.
- Formal HTTPS / SEO (production canonical, hreflang, sitemap,
  robots.txt, headers on the planned origin
  `https://taiwan-water-bill.glossquote.com`): NOT_RUN — the origin is
  not configured and no production build was made.
- Independent nine-aspect review of this candidate: NOT_RUN (next
  owner).

## Known limitations

- No persistent storage: the draft is page-only and discarded on
  leave; switching language restarts from the default draft.
- Display amounts are shown to at most two decimals; the report keeps
  exact milli-NT values (a tier subtotal of 12.075 renders as 12.08).
- One spec-errata candidate: the SPEC's "8 units per field" raw cap
  conflicts with the pinned 9-unit `"bimonthly"` value; the cycle cap
  is 9 (see HANDOFF.md).

## Next owner

Independent reviewer: score the fixed candidate commit on the nine
SPEC acceptance aspects. Do not merge, publish, or register.

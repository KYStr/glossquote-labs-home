# VERIFICATION — EV Charging Calculator

Environment: Node v24.22.1, Linux VM, 2026-11-09. All commands run in
`tools/ev-charging-calculator/`.

## Commands and results

- `npm run check` — PASS. "Project check passed (10 JS files)": file
  contract, `node --check` syntax on all JS, forbidden-pattern scan of
  `public/` (no fetch/XHR/WebSocket/beacon, no persistent storage, no
  service worker, no HTML sinks, no dynamic execution, no absolute URLs),
  pinned bilingual metadata, vendored-fixture identity.
- `npm test` (`node --test`) — PASS, 25/25 tests, 0 failures:
  - core: all 8 vendored SPEC core fixtures deep-equal (including
    `zero-charge` success, `dc-fast-charge` cost 477, `small-topup`
    exact-decimal half-up 0.825 → "0.83"), plus schema/accessor, field
    order, per-field INPUT_LIMIT/UNICODE/EMPTY/format/range, legal
    endpoints (capacity 500, power 1000, efficiency 50 and 100, SOC 0
    and 100, price 0), wall ≥ battery invariant, hostile-string inertia,
    and the pinned duration formats.
  - report: `ev-charging-report.json` bytes equal the literal expected
    compact JSON (recursively sorted keys, one trailing LF, no BOM) for
    the home-ac and zero-charge results; byte length and SHA-256 checked
    against the literal expectation.
  - controller: all 3 vendored SPEC controller fixtures
    (`state-dirty-error`, `state-cancel-late`, `state-replace-late`)
    driven with a manually flushed scheduler; every checkpoint matched.
  - build/serve: pinned page metadata/structure; preview build hashes
    identical across runs; generated output verifies; loopback probe
    (see below).
- `npm run build:preview` run twice — both runs produced the identical
  sorted SHA-256 tree hash
  `8f9c5d752c45622f76ae5dbea531e50c3d7b3d190990f0fd1bbc36d99712329b`
  over 6 files (index.html, en/index.html, js/app.js,
  js/core/controller.mjs, js/core/ev-charging.mjs, styles/app.css).
  Byte-identical: YES.
- `npm run check:generated:preview` — PASS ("Generated preview verified
  (6 files)").
- Loopback HTTP probe (independent of the test suite):
  `node scripts/serve.mjs --port 0 --dir dist-preview` on 127.0.0.1
  (ephemeral port 38113): `GET /index.html` → 200 with title
  「電動車充電試算｜Gloss Tools」; `GET /en/index.html` → 200 with title
  "EV Charging Calculator | Gloss Tools"; response headers included the
  pinned CSP (`default-src 'none'; script-src 'self'; …`),
  `X-Content-Type-Options: nosniff` and `X-Robots-Tag: noindex, nofollow`.

## Spec-errata candidates

None. Every fixture expected value agrees with the SPEC's stated rules;
no fixture-versus-rule conflict was found.

## NOT_RUN

- Real-browser evidence (Chrome/Edge, either language): keyboard flow,
  focus visibility, 320 px reflow, real 200% zoom, reduced motion,
  contrast measurement, touch targets — NOT_RUN (no isolated browser in
  this environment; Node/DOM checks are not claimed as browser passes).
- Real-device checks (phone/tablet) — NOT_RUN.
- Network/Storage observation in a clean browser profile, offline
  behaviour after asset load, and native download-dialog behaviour —
  NOT_RUN.
- Production HTTPS/SEO gate (canonical, hreflang, sitemap, production
  origin `ev-charging-calculator.glossquote.com`) — NOT_RUN; the origin
  is not configured and the candidate intentionally ships without them.
- Independent product review of the nine acceptance aspects — NOT_RUN;
  this build-first candidate awaits a non-author reviewer on the fixed
  PR head.

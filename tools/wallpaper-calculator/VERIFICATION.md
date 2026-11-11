# Wallpaper Calculator — verification record

Current maintenance: [wallpaper and ping product follow-up](../../docs/reviews/five-hour-2026-11-11/product-wallpaper-ping/HANDOFF.md). The sections below record the original build and its historical evidence.

Environment: Node v24.22.1, Linux, zero dependencies. All commands run in
`tools/wallpaper-calculator/`.

## Fixed inputs

- Spec candidate `f8939291d2e283f1e6496d3a9cc802a054732200`
  (`spec-wallpaper-calculator-20261109`, draft PR #226).
- Vendored `test/fixtures.json` is byte-identical to the spec candidate's
  `docs/specs/wallpaper-calculator/fixtures.json`:
  SHA-256 `794c3fed08ddfc05c61e240c370a9c849909f4135f07ec5b5a9af52588c8f5cc`
  (verified against the spec workdir copy before building).

## Commands and results

- `npm test` — **49/49 pass, 0 fail** (Node v24.22.1): the 14 literal core
  fixtures and 3 controller fixtures deep-compared against
  `test/fixtures.json`, plus hand-derived cases (schema accessor
  rejection, cross-mode key sets, row-element SCHEMA row numbers, ENUM
  and MODE_COMBINATION precedence, per-field check order, wall/opening
  row limits and row-numbered errors, OPENINGS_EXCEED_WALL width-before-
  area, STRIP_TOO_LONG row in per-wall mode, valid upper endpoints —
  perimeter 200 m, repeat 200, waste 50, openings area equal to gross —
  per-wall waste inflation, repeat + waste combination, the AUTHOR-CHECK
  area-rounding boundary values 101/150/50/49 cm², the SPEC's strip /
  strip-length / drops invariants over every successful fixture, input
  immutability, controller generation isolation, unchanged-snapshot
  stability, and nested-draft copy isolation) and the report
  serialization cases (canonical bytes for the first fixture, insertion-
  order independence, OUTPUT_LIMIT).
- `npm run check` — **passed**: files, package contract, core
  defaults/constants/example (DEFAULTS equal the SPEC-pinned reset
  object), the pinned bilingual strings in the app and pages (including
  the SPEC-verbatim FAQ and openings-semantics note), syntax of every
  shipped script, worker concatenation parses, forbidden-capability
  scan, core purity.
- `npm run build:preview` run twice — the two `dist-preview/` trees
  (9 files) and `BUILD-MANIFEST.json` compared by SHA-256:
  **byte-identical**.
- `npm run check:generated:preview` — **passed**: manifest hashes exact,
  bilingual preview metadata present, embedded worker source equals the
  fixed core + handler bytes, robots.txt denies all.
- Loopback HTTP probe — `node scripts/serve.mjs --host 127.0.0.1
  --port 49231 --dir dist-preview`: `GET /` → 200 with title
  「壁紙用量計算｜Gloss Tools」; `GET /en/` → 200 with title "Wallpaper
  Calculator | Gloss Tools"; HTML responses carry the pinned CSP
  (`worker-src 'blob:'`, `connect-src 'none'`, …), `X-Robots-Tag:
  noindex, nofollow`, and `X-Content-Type-Options: nosniff`; a missing
  path returns 404 and a `../package.json` traversal attempt returns 404;
  `GET /js/worker-source.js` → 200.

## NOT_RUN (explicit)

- Real-browser checks (Chrome/Edge, both languages): example load, typed
  input, both wall modes with row add/remove, the three openings modes,
  error focus, edit-after-success revocation, cancel, reset, Blob
  download byte comparison, 1280×800 and 320 CSS px layouts, real 200%
  zoom, reduced motion, keyboard order, contrast measurement.
- Real-device checks (physical phone/tablet).
- Network/Storage observation in a clean isolated browser profile
  (zero work requests, storage/cookie/service-worker inspection, offline
  computation after load).
- Production build and formal HTTPS/SEO gate: refused by design — no
  production origin is approved for this tool (the SPEC names a planned
  origin that is not configured); the candidate carries noindex and no
  canonical/hreflang, per the SPEC.
- Native OS file/download dialogs (manual only).

## Spec errata candidates

Two interpretation points are recorded in HANDOFF.md (SCHEMA row-element
`field` value; mode-dependent key-set check ordering). No contradictions
in the SPEC's rules or fixture values were found: the drops-per-roll
method, repeat round-up after the trim allowance, openings semantics,
and every literal fixture were reproduced from the SPEC's stated rules
without exception.

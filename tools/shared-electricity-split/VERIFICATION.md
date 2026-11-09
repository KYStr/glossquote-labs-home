# Verification — Shared Electricity Split

Environment: Node v24.x on Linux (this cloud workspace), zero
dependencies. All commands run inside `tools/shared-electricity-split/`.

## Commands and results

- `npm test` (Node v24.22.1) — **38 tests, 38 pass, 0 fail**. Includes
  the 9 vendored core fixtures deep-compared, the 3 vendored controller
  fixtures, boundary cases (bill 99,999,999 ok / 100,000,000 RANGE;
  reading 999,999.9 ok / 1,000,000.0 RANGE; 10 rooms ok / 11
  ROOM_COUNT), duplicate/regression/surrogate/schema error cases, the
  exact-sum invariant, and report serialization with hand-written
  expected bytes.
- `npm run check` — **passed** (files, package contract, core
  limits/defaults/example, pages, syntax, worker concatenation,
  capability scan, core purity).
- `npm run build:preview` run twice — the two `dist-preview/` trees and
  `BUILD-MANIFEST.json` compared recursively: **byte-identical**
  (9 generated files).
- `npm run check:generated:preview` — **passed** (manifest hashes exact,
  bilingual metadata present, embedded worker source equals the fixed
  core + handler bytes, robots deny-all).
- Loopback HTTP probe of the built preview
  (`node scripts/serve.mjs --host 127.0.0.1 --port 42337 --dir dist-preview`,
  server stopped afterwards): GET `/` → 200 with title
  「分租電費分攤｜Gloss Tools」; GET `/en/` → 200 with title
  "Shared Electricity Split | Gloss Tools"; both carried the SPEC CSP
  (including `worker-src 'blob:'`) and `X-Robots-Tag: noindex, nofollow`;
  GET `/nope` → 404; a `..%2F` traversal attempt → 403.

## NOT_RUN (explicit)

- Real-browser evidence (Chrome/Edge): page interaction, Worker
  execution in a browser, Blob download, keyboard/focus walk, 320px and
  200% zoom layout, reduced motion — NOT_RUN (no isolated browser in
  this environment; Node tests do not substitute).
- Real-device (phone) checks — NOT_RUN.
- Network/Storage observation in a browser profile — NOT_RUN.
- Production HTTPS/SEO gate (canonical, hreflang, sitemap, production
  origin) — NOT_RUN; no production origin is approved for this tool.
- Independent review of this candidate — not performed by the author.

## Spec-errata candidates

None. Every vendored fixture's expected value agrees with the SPEC's
stated rules as implemented; the 9 core fixtures deep-compare green.

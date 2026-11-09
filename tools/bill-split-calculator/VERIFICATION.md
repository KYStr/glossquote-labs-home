# Bill Split Calculator — verification record

Environment: Node v24.22.1, Linux, zero dependencies. All commands run in
`tools/bill-split-calculator/`.

## Fixed inputs

- Spec candidate `31e8f193505e871d2b982538dc6292e5696d7863`
  (`spec-bill-split-calculator-20261109`, draft PR #223).
- Vendored `test/fixtures.json` is byte-identical to the spec candidate's
  `docs/specs/bill-split-calculator/fixtures.json`:
  SHA-256 `7eda83796698264fa0f309886d3b6e748d761a730bd0606b8f7959614972cbfb`
  (verified against the spec workdir copy before building).

- Production base: `codex/initial-publication` at
  `328dee40ef0de631d7d50a443e5d5eb2e7668164` (FETCH_HEAD when the
  production branch was created, 2026-11-09).

## Commands and results

- `npm test` — **49/49 pass, 0 fail** (Node v24.22.1): the 18 literal
  core fixtures and 3 controller fixtures deep-compared against
  `test/fixtures.json`, plus hand-derived boundary/validation/property
  cases (schema accessor rejection, INPUT_LIMIT before grammar and
  before ENUM, capacity-before-enum for tipBase, exact-half vs
  just-below-half rounding for both tax and tip, tipBase switching
  leaving the tax unchanged, the legal maximums bill 999999.99 / 100% /
  100 people exact, per-fixture share invariants sum = total,
  max − min ≤ 1, non-increasing) and the report-serialization cases.
- `npm run check` — **passed**: files, package contract, core
  fields/limits/defaults/example, the pinned bilingual strings in the
  app and pages, syntax of every shipped script, worker concatenation
  parses, forbidden-capability scan, core purity.
- `npm run build:preview` run twice — the two `dist-preview/` trees
  (9 files) and `BUILD-MANIFEST.json` compared by SHA-256:
  **byte-identical**.
- `npm run check:generated:preview` — **passed**: manifest hashes exact,
  bilingual preview metadata present, embedded worker source equals the
  fixed core + handler bytes, robots.txt denies all.
- Loopback HTTP probe — `node scripts/serve.mjs --host 127.0.0.1
  --port 49317 --dir dist-preview`: `GET /` → 200 with title
  「分帳計算機｜Gloss Tools」; `GET /en/` → 200 with title
  "Bill Split Calculator | Gloss Tools"; HTML responses carry the pinned
  CSP (`worker-src 'blob:'`, `connect-src 'none'`, …), `X-Robots-Tag:
  noindex, nofollow`, and `X-Content-Type-Options: nosniff`; a missing
  path returns 404 and a `../package.json` traversal attempt returns
  404; `GET /js/worker-source.js` → 200.

## NOT_RUN (explicit)

- Real-browser checks (Chrome/Edge, both languages): example load, typed
  input, error focus, edit-after-success revocation, tip-base switching,
  cancel, reset, Blob download byte comparison, 1280×800 and 320 CSS px
  layouts, real 200% zoom, reduced motion, keyboard order, contrast
  measurement.
- Real-device checks (physical phone/tablet).
- Network/Storage observation in a clean isolated browser profile
  (zero work requests, storage/cookie/service-worker inspection,
  offline computation after load).
- Production build and formal HTTPS/SEO gate: refused by design — no
  production origin is approved for this tool; the candidate carries
  noindex and no canonical/hreflang, per the SPEC.
- Native OS file/download dialogs (manual only).

## Spec errata candidates

None found. Every fixture expected value was reproduced from the SPEC's
stated rules (integer cents/milli-percent, per-step single half-up
rounding, remainder cents to the earliest payers) without exception.

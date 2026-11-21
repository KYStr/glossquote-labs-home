# Calories Burned Calculator — verification record

Environment: Node v24.22.1, Linux, zero dependencies. All commands run
in `tools/calories-burned-calculator/`.

## Fixed inputs

- Spec candidate `417937247273364d82476ff3eb7b8268c4cf7b4c`
  (`spec-calories-burned-calculator-20261109`, draft PR #237).
- Vendored `test/fixtures.json` is byte-identical to the spec candidate's
  `docs/specs/calories-burned-calculator/fixtures.json`:
  SHA-256 `f6fa703680ec9111157d696c1218e1be65120759af90a86f82f0ad0945df27ea`
  (verified against the spec workdir copy before building).
- Before any product code existed, all eight successful fixtures were
  reproduced with a scratch script using two independent exact routes
  (the §2.5 integer rule and an exact-rational evaluation of
  `MET × kg × minutes / 60` with half-up rounding) — every value
  matched exactly, including the 162.5 tie and the 274.895833… case.

## Commands and results

- `npm test` — **52/52 pass, 0 fail** (Node v24.22.1): the 8 literal
  success fixtures and 12 literal error fixtures deep-compared against
  `test/fixtures.json`, the 3 controller fixtures (dirty-error,
  cancel-late, replace-late) driven through the controllable scheduler,
  plus hand-derived table-integrity, arithmetic cross-check (588
  weight/duration/activity combinations vs the independent
  exact-rational evaluation), exact-tie, input-order, validation-order,
  grammar, schema and report-serialization cases.
- `npm run check` — passed: files, package contract, core
  fields/limits/defaults/cap/report constants, the §2.6 worked
  examples, the MET table vs SPEC §2.4 (14 rows, 2011 values absent),
  the pinned bilingual strings in the app and pages (including the
  SPEC's estimate disclaimer and all five FAQ pairs), syntax of every
  shipped script, forbidden-capability scan, core purity.
- `npm run build:preview` run twice — the two `dist-preview/` trees
  (9 files) and `BUILD-MANIFEST.json` compared by SHA-256:
  byte-identical.
- `npm run check:generated:preview` — passed: manifest hashes exact,
  bilingual preview metadata present, robots.txt denies all.
- Loopback HTTP probe — `node scripts/serve.mjs --host 127.0.0.1
  --port 49332 --dir dist-preview`: `GET /` → 200 with title
  「運動熱量消耗計算｜Gloss Tools」; `GET /en/` → 200 with title
  "Calories Burned Calculator | Gloss Tools"; HTML responses carry the
  pinned CSP (`connect-src 'none'`, …), `X-Robots-Tag: noindex,
  nofollow`, and `X-Content-Type-Options: nosniff`; a missing path
  returns 404 and a `../package.json` traversal attempt returns 404.

## NOT_RUN (explicit)

- Real-browser checks (Chrome/Edge, both languages): checkbox
  selection in selection order, typed input, error focus, edit-after-
  success staleness, reset, Blob download byte comparison, 1280×800
  and 320 CSS px layouts, real 200% zoom, reduced motion, keyboard
  order, contrast measurement.
- Real-device checks (physical phone/tablet).
- Network/Storage observation in a clean isolated browser profile
  (zero work requests, storage/cookie/service-worker inspection,
  offline computation after load).
- Production build and formal HTTPS/SEO gate: refused by design — no
  production origin is approved for this tool; the candidate carries
  noindex and no canonical/hreflang, per the SPEC.
- Native OS file/download dialogs (manual only).
- Independent re-check of the 8 indirectly confirmed MET rows against
  the official pacompendium.com category pages (flagged in
  AUTHOR-CHECK.md; the table implements the SPEC exactly as written).

## Spec errata candidates

None. Every fixture expected value was reproduced from the SPEC's
stated rules (the §2.5 integer rule and the §2.7 validation order)
without exception. One gap is documented in HANDOFF.md, not counted
as errata: the §2.8 error table omits an INPUT_LIMIT message for
durationMinutes, filled with pattern-consistent wording.

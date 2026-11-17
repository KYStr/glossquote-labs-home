# Period Cycle Calculator — verification record

Environment: Node v24.22.1, Linux, zero dependencies. All commands run in
`tools/period-cycle-calculator/`.

## Fixed inputs

- Spec candidate `3fc93c6c3501795ceafdb56f544f5be2d4d24718`
  (`spec-period-cycle-calculator-20261109`, draft spec PR #233).
- Vendored `test/fixtures.json` is byte-identical to the spec candidate's
  `docs/specs/period-cycle-calculator/fixtures.json`:
  SHA-256 `2cb62ee0bf2ae3941b971caf5fdb9905a644f98cf57894c85a5acbec0144132d`
  (verified against the spec workdir copy before building).

## Pre-implementation check

Before any product code existed, all 7 successful fixtures were recomputed
with an independent Python `datetime` implementation of the SPEC's stated
rules (start + i × cycleLength, ovulation = start + cycleLength − 14,
fertile = ovulation −5 / +1, periodEnd = start + periodLength − 1) — 7/7
matched exactly. The same scratch calculation produced the expected values
for the extra endpoint cases in `test/core.test.mjs` (1900-01-01 and
2100-12-31 inputs, the 35/10 maximum pair).

## Commands and results

- `npm test` — **48/48 pass, 0 fail** (Node v24.22.1): all 18 literal core
  fixtures and 3 controller fixtures deep-compared against
  `test/fixtures.json`, plus hand-derived cases: legal endpoints
  (1900-01-01, 2100-12-31 with predictions extending into 2101), one day
  past the input range, the 35/10 maximum pair, Gregorian leap rules
  (2000-02-29 valid, 1900-02-29 invalid), grammar classes, capacity
  before grammar (an 11-unit space-padded date is INPUT_LIMIT), lone
  surrogates, field-order precedence, schema/accessor rejection, the
  SPEC's structural invariants (starts spaced exactly cycleLength,
  periodEnd − start = periodLength − 1, ovulation − start =
  cycleLength − 14, fertileEnd − fertileStart = 6), a stepped JDN
  round-trip sweep over the whole 1900–2101 range, timezone-mutation
  stability, and the report-serialization cases.
- `npm run check` — **passed**: files, package contract, core
  fields/limits/defaults/example, the SPEC-pinned bilingual strings in the
  app and pages (including the verbatim disclaimer and FAQ), syntax of
  every shipped script, worker concatenation parses, forbidden-capability
  scan, core purity (no DOM, no host clock references).
- `npm run build:preview` run twice — the two `dist-preview/` trees
  (9 files) compared by SHA-256: **byte-identical**.
- `npm run check:generated:preview` — **passed**: manifest hashes exact,
  bilingual preview metadata present, embedded worker source equals the
  fixed core + handler bytes, robots.txt denies all.
- Loopback HTTP probe — `node scripts/serve.mjs --host 127.0.0.1
  --port 49317 --dir dist-preview`: `GET /` → 200 with title
  「生理週期計算｜Gloss Tools」; `GET /en/` → 200 with title
  "Period Cycle Calculator | Gloss Tools"; HTML responses carry the pinned
  CSP (`worker-src 'blob:'`, `connect-src 'none'`, …), `X-Robots-Tag:
  noindex, nofollow`, and `X-Content-Type-Options: nosniff`; a missing
  path returns 404 and a `../package.json` traversal attempt returns 404;
  `GET /js/worker-source.js` → 200.
- Embedded worker source executed in Node with a fake `self`: the
  `regular-28` snapshot returned generation 7 with the fixture's exact
  result, and a 36-day cycle snapshot returned the pinned RANGE error.
  This exercises the exact bytes the page turns into a module Worker; it
  does not replace a real browser Worker check (still NOT_RUN below).

## NOT_RUN (explicit)

- Real-browser checks (Chrome/Edge, both languages): example load, typed
  input, error focus, edit-after-success revocation, cancel, reset, Blob
  download byte comparison, 1280×800 and 320 CSS px layouts, real 200%
  zoom, reduced motion, keyboard order, contrast measurement.
- Real-device checks (physical phone/tablet).
- Network/Storage observation in a clean isolated browser profile
  (zero work requests, storage/cookie/service-worker inspection, offline
  computation after load).
- Production build and formal HTTPS/SEO gate: refused by design — no
  production origin is approved for this tool; the candidate carries
  noindex and no canonical/hreflang, per the SPEC.
- Native OS file/download dialogs (manual only).

## Spec errata candidates

None. Every fixture expected value was reproduced from the SPEC's stated
rules (integer JDN arithmetic, the pinned validation order, the fixed
14-day luteal phase) without exception.

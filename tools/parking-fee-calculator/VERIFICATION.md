# Verification — Parking Fee Calculator

Environment: Node v24.22.1, Linux, TZ default (UTC) unless noted.
All commands run inside `tools/parking-fee-calculator/`.

## Commands and results

- `npm test` — 41 tests, 41 pass, 0 fail (12 core fixtures + 16
  hand-computed core boundaries, 4 controller tests, 4 report tests,
  3 HTML tests, 1 build test, 1 serve test).
- Core tests additionally under `TZ=UTC`, `TZ=Asia/Taipei`,
  `TZ=America/New_York` — 28/28 pass in each; the core reads no
  `Date`/timezone, so results are identical in all three environments.
- `npm run check` — PASS (zero dependencies, file allowlist,
  forbidden-sink scan, pinned page requirements).
- `npm run build:preview` run twice; per-file SHA-256 trees of
  `dist-preview/` identical between the two builds (byte-identical).
- `npm run check:generated:preview` — PASS, dist-preview matches a
  fresh build byte for byte.
- Loopback HTTP probe of the built preview (ephemeral port 42639):
  `GET /` → 200 with title 「停車費計算機｜Gloss Tools」, `GET /en/` → 200
  with title "Parking Fee Calculator | Gloss Tools", `GET /missing` →
  404; response headers carry the pinned CSP, `nosniff`, and
  `X-Robots-Tag: noindex, nofollow`.

## Fixture coverage

- All 12 literal core fixtures from the fixed spec candidate
  (vendored verbatim in `test/fixtures.json`) deep-compared against
  `run()` output, plus hand-computed boundary cases: leap day valid /
  invalid, exactly 43,200 minutes allowed / 43,201 rejected, rawFee
  equal to cap not capped, `dailyCap` 0 uncapped, `graceMinutes` 0,
  zero prices, schema abuse (extra/missing/accessor/typed), lone
  surrogates, validation-order precedence.
- All 3 controller fixtures driven through a controllable fake Worker
  port: dirty→error invalidation, cancel with a late reply, and a stale
  success arriving after a newer error.
- Report bytes checked against literally written canonical strings and
  their SHA-256.
- The embedded Worker bundle is executed in a `vm` sandbox in the build
  test and reproduces the `same-day-basic` fixture outcome.

## NOT_RUN

- Real-browser checks (isolated Chrome/Edge, both languages, keyboard
  flow, real 200% zoom, reduced motion, touch targets, Blob download in
  a real browser): NOT_RUN — no isolated browser mechanism in this
  environment; static and Node-level checks do not substitute for them.
- Real-device (phone at a payment machine) check: NOT_RUN.
- Production HTTPS/SEO gate (self-canonical, sitemap, live headers):
  NOT_RUN — the planned origin is not configured; the candidate is a
  noindex preview by design.
- Independent review / acceptance scoring: NOT_RUN — author-side
  verification only; a non-author reviewer must score the pinned
  candidate.

## Spec-errata candidates

- None found. Every fixture expected value agrees with the SPEC's
  stated rules (grace all-or-nothing on total minutes; per-calendar-day
  segmentation with first-period restart; cap applied per day, equal
  not capped).

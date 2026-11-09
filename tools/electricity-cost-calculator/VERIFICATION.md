# Verification — Electricity Cost Calculator (build-first candidate)

Environment: Node v24.22.1, Linux VM, 2026-11-09. All commands run from
`tools/electricity-cost-calculator/`.

## Commands and results

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` (`node --test`) | 0 | 32 tests, 32 pass, 0 fail (~0.9 s) |
| `npm run check` | 0 | all static checks passed (13 required files, 6 public files) |
| `npm run build:preview` (run 1) | 0 | 6 files written to `dist/preview/` |
| `npm run build:preview` (run 2) | 0 | tree hash identical to run 1 (see below) |
| `npm run check:generated:preview` | 0 | `dist/preview/` matches `public/` byte for byte (6 files) |

Build byte-identity: SHA-256 over the sorted per-file SHA-256 list of
`dist/preview/` was `f32f272146668e0aa327347365a962af98c8c4b172f6b185db7cae317ac5063f`
after both runs — byte-identical output. The build test in the suite
(`test/build.test.mjs`) re-verifies this on every `npm test`.

## Test coverage (expected values hand-derived from the SPEC, not generated)

- Fixtures F1–F6 exactly (SPEC section 4), including F4's three breakdown
  rows (120 / 180 / 50 kWh; NT$360.00 / NT$720.00 / NT$250.00; total
  NT$1,330.00; average NT$53.20/day) and F6's unrounded-computation rule
  (0.999 kWh × 3.333 → NT$3.33; per-day NT$1.11).
- Tier edges: energy exactly at the first threshold; exactly at the second
  threshold; one kWh into band 2; a two-band tariff; zero-energy bands
  omitted from the breakdown; tiered period total as the rounded exact sum
  even when displayed subtotals sum differently (0.00 + 0.00 → NT$0.01).
- Rounding: exact x.xx5 cost rounds half away from zero (NT$2.005 → NT$2.01);
  kWh display half away from zero at 3 decimals (0.0005 → 0.001); JPY zero
  decimals with comma grouping (¥2,790; ¥43,919,956,080 at maximum inputs).
- Validation: every refusal in SPEC sections 2/4 — watts/hours/rate
  positivity, caps and decimal-place limits (with the allowed precision
  reported), whole-number days/quantity/thresholds, threshold range,
  strictly-ascending thresholds with the offending band named, band count
  2–3, open-ended final band, and the accepted boundary on each side.
- Scaffolding: both pages' lang/title/description/noindex/canonical/
  hreflang/home-link markers; no external resources; core imports in plain
  Node with no DOM.

## HTTP probe (loopback, `scripts/serve.mjs`, port 4173)

- `GET /` → 200, 8,538 bytes, `lang="zh-Hant"`
- `GET /en/` → 200, 8,711 bytes, `lang="en"`
- `GET /js/app.js` → 200; `GET /js/core/calculator.mjs` → 200
- `GET /nope.html` → 404
- Server stopped after the probe.

## Spec errata candidates

None. Every printed fixture (F1–F6) was re-derived from the SPEC's own
formulas during implementation and agrees with them; the one apparent
tension in section 4 — displayed band subtotals may sum one minor unit
away from the displayed total — is a rule the SPEC states explicitly,
not a contradiction.

## NOT_RUN (blocking for acceptance; must be completed by the reviewer)

- Real-browser rendering and interaction (fixtures entered through the
  real UI in both languages; band add/remove through the real controls;
  stale-state behaviour on an invalid field; limitation note visibility).
- Real devices / touch, native viewports, 200% zoom.
- Assistive technology and keyboard-only end-to-end flow.
- Measured contrast (normal text 4.5:1, large text and controls 3:1).
- Browser network/storage observation in a live page (source contains no
  network or storage calls, but that is not live evidence).
- Deployment and any public URL.

## Status

Build-first candidate. Not accepted, not published, not deployed.
Next owner: independent reviewer.

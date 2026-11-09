# Verification — Pregnancy Due Date Calculator (candidate)

Environment: Node v24.22.1, Linux, working from
`tools/pregnancy-due-date-calculator/` in `KYStr/glossquote-labs-home`
at base commit `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c`.
All commands below were run by the author of this candidate; the
independent review is still pending (build-first mode).

## Spec conformance

- All normative fixtures D1–D6 of SPEC section 4 reproduce exactly,
  including D1's six trimester boundary dates, the D1/D3 cross-mode
  identity, D5's gestational age (1w6d at the fixed reference date
  2026-11-02), and the D6 leap-year crossing (2028-02-29).
- No spec errata were found: no printed fixture contradicts the
  SPEC's own formulas. The ultrasound boundary EDDs used in tests
  (4w0d → 2026-11-12, 42w6d → 2026-02-13 for a 2026-03-05 scan) and
  the cycle-boundary EDDs (21 → 2026-10-01, 45 → 2026-10-25) were
  hand-derived by day-of-year counting, not copied from program
  output.

## Commands run

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 31 tests, 31 pass, 0 fail |
| `TZ=Pacific/Kiritimati npm test` | 0 | 31 pass, 0 fail (identical) |
| `TZ=America/New_York npm test` | 0 | 31 pass, 0 fail (identical) |
| `npm run check` | 0 | Static checks passed |
| `npm run build:preview` (run 1) | 0 | 6 files written to dist/ |
| `npm run build:preview` (run 2) | 0 | 6 files; sha256 set identical to run 1 |
| `npm run check:generated:preview` | 0 | dist/ current, 6 files byte-identical to a fresh rebuild |
| Loopback HTTP probe (`PORT=4319 node scripts/serve.mjs`, then curl) | 0 | see below |

Test breakdown: civil.test.mjs (calendar integrity: epoch anchors,
exclusive-of-start counting, leap/century rules, February and year
boundaries, impossible dates, 400-year-cycle round trip);
due-date.test.mjs (fixtures D1–D6, trimester GA boundaries 97/98 and
195/196, beyond-42-weeks at GA 294 vs 295 unclamped, cycle bounds
21/45 accepted and 20/46/28.5 refused, ultrasound bounds 4w0d/42w6d
accepted and 3w6d/43w0d/7-days refused, future-date refusal in all
three modes, the SPEC section 7c consistency properties over 200
deterministic pseudo-random LMP/cycle pairs);
pages.test.mjs (bilingual notice and labelling, forbidden-surface
scan, core purity, real table markup).

## Build byte-identity

Two consecutive `build:preview` runs produced identical sha256 sets.
dist/ hashes from the verified run:

- `dist/index.html` c367a4d505334279d2d12c9d9bc7b4d591e4051a6f9a39cac287dc401cc56c60
- `dist/en/index.html` d9db30e4303f1aa5d6155c1e8d562e87c7bcece7ab5870fde6e87e14df181aee
- `dist/js/app.js` 5010b3d4559a6a3a6093c6e06b2af7105d67bd4012c22022e1f831204ea308b7
- `dist/js/core/civil.mjs` 4b3f9ee83109f927ce4daaa94434ad6d7188d7af66011dc678de05a0b5b1309b
- `dist/js/core/due-date.mjs` 47d93f8ea3b1e1693a56d102cdbb5ec106bbc1719a286af43a55bc691f098a12
- `dist/styles/app.css` 2deddf57973138376756a5d20b1ac580c5957d4e9ec7f4ec5fe7874a3eefa779

## HTTP probe (loopback only, server stopped afterwards)

- `GET /index.html` → 200, `text/html; charset=utf-8`, title 預產期計算工具
- `GET /en/index.html` → 200, `text/html; charset=utf-8`, title Pregnancy Due Date Calculator
- `GET /styles/app.css`, `/js/app.js`, `/js/core/due-date.mjs` → 200 with correct content types
- `GET /nope.html` → 404; path traversal (`/../package.json`, encoded `%2e%2e`) → 404 / 403

## NOT_RUN (not performed; required before acceptance)

- Real-browser rendering and interaction (fixtures entered through
  the real UI in both languages and all modes; notice position and
  non-dismissibility observed in a browser; mode switching and
  stale-state behaviour in a browser)
- Real devices / touch input / mobile virtual keyboard behaviour
- Assistive technology (screen reader announcement of results)
- Measured contrast in a rendered page (values were chosen as dark
  text on light backgrounds but not measured in-browser)
- Native viewport / 200% zoom layout checks
- Deployment of any kind (none authorised; preview is noindex)

## Notes

- Storage/network absence is enforced by construction and by the
  static scan in `scripts/check.mjs` plus `test/pages.test.mjs`;
  in-browser Network/Storage observation remains part of the
  independent review (see NOT_RUN).

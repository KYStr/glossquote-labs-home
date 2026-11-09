# Verification — Fuel Cost Calculator production candidate

Environment: Node v24.22.1, Linux VM, 2026-11-09. Candidate built against
SPEC/BRIEF at `KYStr/glossquote-labs-home` commit
`7a0e9bf896e3b3a318244eb6f5006ebd40787b2c` (`docs/specs/fuel-cost-calculator/`).

## Commands run

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` (node --test) | 0 | 21 tests, 21 pass, 0 fail (~0.16 s) |
| `npm run check` | 0 | `check OK` — package shape (Node >=24, ESM, zero dependencies, all four scripts), core purity (no DOM/network/storage/eval/float tokens), pinned constants verbatim, app.js uses textContent only, both pages carry lang/title/description/noindex/canonical/hreflang/CSP and no external URLs |
| `npm run build:preview` (run twice) | 0 | 6 files written to `preview/` each run |
| SHA-256 comparison of the two builds | 0 | Byte-identical: all 6 files match between run 1 and run 2 |
| `npm run check:generated:preview` | 0 | `preview/` matches `public/` exactly (6 files identical) |
| Loopback HTTP probe (`PORT=4199 node scripts/serve.mjs`, curl, then killed) | 0 | `/` 200 (zh-Hant page, title 油耗成本計算器）, `/en/` 200 (English page), `/js/core/fuel-cost.mjs` 200, unknown path 404 |

## What the tests cover

- SPEC fixtures F1–F5 exactly: display strings plus exact-fraction equality,
  including F2's "exactly 2.5 US gallons" identity (fuel = 9.46352946 L as a
  fraction), F4's "exactly 4 Imperial gallons", and F5's share divergence
  (share 10/3; 3 × $3.33 = $9.99 ≠ $10.00).
- Constant identities to 10 decimal places: 40 MPG (US) → 5.8803645833
  L/100km; 15 km/L → 6.6666666666 L/100km; the pinned MPG fractions are
  asserted fraction-equal to 100 × gallon ÷ mile derived from the base
  constants; US-vs-UK discrimination at the same MPG number.
- Share-from-exact-total: a case (total exactly 10.005, split 2) where a
  share computed from the displayed total would give $5.01 but the exact
  share correctly displays $5.00.
- Bounds per SPEC section 4: distance 0 / 100000 / 100000.01; consumption at
  and just outside each unit's min and max; price 0 / 10000 / 10000.01;
  people 0, 13, 2.5 refused and 1, 12 accepted; people ignored while the
  split is off; empty / non-numeric / scientific-notation / more-than-two-
  decimal inputs refused with the right per-field error; fields validate
  independently; markup in a field is refused as data, never rendered.
- Unit-switch reinterpretation at core level (same typed number, km vs mi).

## Spec errata candidates

None. All five fixtures and both derived-fraction identities were
re-derived independently (exact rational arithmetic) and agree with the
SPEC's printed values; the printed constants 112903/480 and 56826125/201168
are exactly 100 × gallon ÷ mile for the US and Imperial gallons.

## Explicitly NOT_RUN

- Real-browser rendering and interaction (entering fixtures through the
  real UI in both languages, unit-switch behaviour observed in a browser,
  split toggle and stale-state behaviour in a browser)
- Real devices / touch input / mobile viewports and 200% zoom
- Assistive technology (screen reader announcement of recomputed outputs)
- Measured contrast of the shipped CSS
- Cross-browser compatibility (Chrome/Edge/Firefox/Safari)
- Deployment (no hosting, no catalog entry, no merge — build-first
  candidate awaiting independent bulk review)

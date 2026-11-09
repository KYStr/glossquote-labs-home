# Verification — Compound Interest & Savings Goal Calculator (production candidate)

Environment: Node v24.22.1, Linux VM, 2026-11-09. Candidate built in build-first
mode against `KYStr/glossquote-labs-home` @ `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c`,
spec at `docs/specs/compound-interest-calculator/SPEC.md`.

## Commands run (all from `tools/compound-interest-calculator/`)

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` (`node --test "test/*.test.mjs"`) | 0 | **26 tests, 26 pass, 0 fail** (~0.7 s) |
| `npm run check` | 0 | PASS — file contract, core purity (no DOM/network/storage/eval references), bilingual page contract (lang/title/description/h1/canonical/hreflang/noindex/home links), zero runtime dependencies |
| `npm run build:preview` (run twice) | 0 | 7 source files + `manifest.json`; **byte-identical across both runs** (sha256 compared over all 8 output files) |
| `npm run check:generated:preview` | 0 | PASS — committed preview output equals a fresh regeneration byte-for-byte |
| Loopback HTTP probe (`node scripts/serve.mjs 8371`, then curl, then killed) | 0 | `GET /` 200 (zh-Hant page, correct title), `GET /en/` 200 (English page, correct title), `GET /js/app.js` 200, `GET /js/core/simulate.mjs` 200, unknown path 404 |
| DOM id cross-check (script) | 0 | All 30 element ids referenced by `public/js/app.js` exist in both HTML pages |
| `node --check public/js/app.js` | 0 | Module syntax valid |

## What the tests pin (independently derived expectations)

- All five SPEC section 4 fixtures exactly: growth 12,536.49 / interest 1,336.49 / EAR 12.68%; zero-rate 3,000.00; Goal A month 10 at 1,046.22; Goal B 1,000.00 at 0% (999.99 → 11,999.88); Goal B 946.19 at 12% (final 12,000.05; at 946.18 → 11,999.92).
- Rounding: constructed exact half-cent cases round away from zero (0.5→1, 1.5→2, 2.5→3), just-below-half stays down.
- Identity sweep (60 seeded cases): final = initial + term × contribution + Σ interest; monthly rows chain; yearly table's last row equals the growth outputs.
- Goal B minimality sweep (40 seeded cases): simulate(c) ≥ target and simulate(c − 1) < target.
- Goal A first-crossing property; `already-reached` (month 0), `no-growth` and `not-reached` (600 months) are distinct outcomes.
- Parser boundaries: amount cap accepted / one cent over refused; >2 amount decimals refused; rate 3 decimals accepted / 4 refused / 100 accepted / 100.001 refused; term 1 and 600 accepted / 0 and 601 refused.
- Exactness at the cap: interest on 999,999,999.99 at 100% is 8,333,333,333 (balance ÷ 12 = …333.25, hand-derived), computed in BigInt.
- CSV serialisation equals the monthly table exactly (plain decimals, no grouping/currency).

## Spec errata

None found. Every printed fixture in SPEC section 4 was reproduced exactly by an
independent hand-derivation before being encoded in tests (including the deliberate
12,536.49 simulation vs 12,536.50 closed-form one-cent difference, which the SPEC
itself documents). One test-authoring arithmetic slip (a cap-case comment) was caught
and corrected against the hand derivation during development; the SPEC was not at fault.

## NOT_RUN (not verified by this candidate)

- Real-browser rendering and interaction (fixtures through the real UI in both languages and all three modes; CSV download diffed against the on-screen table; Goal B minimality pair visibility) — no browser run was performed.
- Real devices / touch input; native viewports; 200% zoom behaviour.
- Assistive technology (screen reader pass) and measured colour contrast.
- Live network/storage observation in a browser (source audit only: no fetch/storage/analytics code exists in the tool).
- Deployment, catalog publication, production canonical/domain build.

These remain mandatory checks for the independent reviewer under SPEC section 6;
unrun checks block acceptance.

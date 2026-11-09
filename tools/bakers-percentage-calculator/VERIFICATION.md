# Verification — Baker's Percentage Calculator

Environment: Node v24 (this VM), zero npm dependencies. All commands
run inside `tools/bakers-percentage-calculator/`.

## Commands and results

- `npm test` — exit 0; **23 tests, 23 passed, 0 failed** (fixtures
  K1–K6 in test/fixtures.test.mjs; parsing/bounds/invariant/flags/
  rounding/round-trip in test/core.test.mjs).
- `npm run check` — exit 0 ("Project check passed"): required files,
  package contract, both pages' head contract (lang, noindex,
  canonical, hreflang, same-language home link, title, description,
  h1), id parity between pages, string key parity, core purity,
  forbidden-capability scan, K1 smoke through the shipped core.
- `npm run build:preview` run twice — exit 0 both times; SHA-256 of
  all 6 dist files identical across runs (**byte-identical**).
- `npm run check:generated:preview` — exit 0 (dist matches a fresh
  build byte for byte).
- Loopback HTTP probe (`node scripts/serve.mjs`, port 4175):
  `GET /index.html` → 200, `<html lang="zh-Hant">`, zh-TW title
  present; `GET /en/index.html` → 200, `<html lang="en">`, English
  title present. Server killed after the probe.

One defect was found and fixed during verification: an early
computeModeB denominator error (×10) was caught by fixture K2 and
corrected before the runs above.

## Spec errata candidates

1. **SPEC §3 initial-state row count vs K1.** §3 says the initial
   state has "three rows prefilled — Bread flour 100 (flour), Water 65
   (water), Salt 2 — target total 840 g, outputs showing fixture K1's
   weights". K1 (SPEC §4) has four rows (flour 100, water 65, salt 2,
   yeast 1; S = 168) and its weights at T = 840 are 500.0/325.0/10.0/
   5.0 g. With only the three listed rows (S = 167) the weights would
   be 503.0/326.9/10.1 g — not K1's. The two statements cannot both
   hold. This implementation follows the fixture (the normative,
   exactly-reproducible part of the contract): the initial state
   prefills K1's four rows so the first screen literally shows K1's
   weights, and §3's "three rows" wording is recorded here as an
   errata candidate for the spec author.
2. **SPEC §2 flag parenthetical.** §2 says "(a row may be both only if
   it is flour — a water-flagged flour row is refused as a flag
   error)". The two clauses contradict each other; §3 ("A row flagged
   both flour and water … [is a] field error") and §7(d) ("flour+water
   row refused") agree with each other, so this implementation refuses
   flour+water rows and records the §2 first clause as an errata
   candidate.

No fixture in SPEC §4 contradicts its own formula; K1–K6 all reproduce
exactly from the stated rules (see test/fixtures.test.mjs).

## NOT_RUN (explicit)

- Real-browser rendering and interaction (no browser run was made:
  the K4 two-flour hand-entry flow, the visible invariant state, and
  the A→C→A switch flow of SPEC §7 are NOT_RUN).
- Real devices / touch / mobile viewports.
- Assistive technology (screen reader) checks; measured contrast.
- Deployment, catalog publication, merge — separate later steps.

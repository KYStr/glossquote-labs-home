# Author Check — Calories Burned Calculator

This file records how the author verified the specification package. It is
not an independent review and does not mark the spec ready.

## MET table provenance (primary source)

Edition pinned: **2024 Adult Compendium of Physical Activities** — Herrmann
SD, Willis EA, Ainsworth BE, Barreira TV, Hastert M, Kracht CL, Schuna Jr.
JM, Cai Z, Quan M, Tudor-Locke C, Whitt-Glover MC, Jacobs DR. "2024 Adult
Compendium of Physical Activities: A third update of the energy costs of
human activities." Journal of Sport and Health Science, 2024;13(1):6–12.
Category lists read at the Compendium's official site, pacompendium.com,
retrieved 2026-11-09. The Compendium's own definition, quoted on its home
page, is the formula source: "One MET is defined as 1 kcal/kg/hour".

Per-row verification:

| id | code | MET | Verified against |
| -- | ---- | --- | ---------------- |
| walking-moderate | 17190 | 3.8 | Official home page's worked example confirms code 17190 and its description ("Walking, 2.8 to 3.4 mph, level, moderate pace, firm surface"); MET 3.8 from the Compendium walking list as reproduced by two independent 2024-based sources. |
| walking-brisk | 17200 | 4.8 | 2024-based sources quoting the walking list verbatim ("code 17200, 4.8 METs, a measured value"). |
| hiking-cross-country | 17080 | 6.0 | Compendium walking list as reproduced in a 2024-based calculator's cited table. |
| jogging-general | 12020 | 7.5 | Published 2011→2024 change table for the running list (12020: 7.0 → 7.5, description "Jogging, general, self-selected pace"). |
| running-6mph | 12050 | 9.3 | 2024-based source citing "2024 Adult Compendium, code 12050, 9.3 MET" for running 6.0–6.3 mph. |
| bicycling-leisure | 01010 | 4.0 | Full-text 2024 Adult Compendium document ("Bicycling 01010 4.0 Bicycling, <10 mph, leisure, to work or for pleasure"). |
| bicycling-moderate | 01030 | 8.0 | Compendium bicycling list as reproduced by a 2024-based source (01030, 12–13.9 mph, 8.0). |
| swimming-laps-slow | 18240 | 5.8 | **Official water-activities page, read directly** ("18240, 5.8, Swimming laps, freestyle, slow, recreational"). |
| swimming-laps-fast | 18230 | 9.8 | **Official water-activities page, read directly** ("18230, 9.8, Swimming laps, freestyle, fast, vigorous effort"). |
| aerobic-general | 02000 | 7.3 | **Official conditioning-exercise page, read directly** ("02000, 7.3, Aerobic, general"). |
| elliptical-moderate | 02048 | 5.0 | **Official conditioning-exercise page, read directly** ("02048, 5.0, Elliptical trainer, moderate effort"). |
| resistance-training | 02054 | 3.5 | **Official conditioning-exercise page, read directly** ("02054, 3.5, Resistance (weight) training, multiple exercises, 8-15 reps at varied resistance"). |
| yoga-hatha | 02150 | 2.3 | **Official conditioning-exercise page, read directly** ("02150, 2.3, Yoga, Hatha"); also in the 2011→2024 change table (2.5 → 2.3). |
| tai-chi | 15670 | 3.3 | Published 2011→2024 change table (15670 "Tai chi, qi gong, general": 3.0 → 3.3). |

Six of the fourteen rows were read on the Compendium's own category pages;
the remaining eight are each confirmed by at least one source that quotes
the 2024 list with codes, and no row relies on a 2011 value. The independent
reviewer should re-check the eight indirectly confirmed rows against the
official walking, running, bicycling and sports category pages before
acceptance; that recheck is the one provenance step this author could not
complete for every row in one pass.

## Corrections to the concept note (recorded per the brief)

1. **Edition.** The concept note said "Compendium of Physical Activities,
   cite edition" without choosing one. The current edition is the 2024
   Adult Compendium (a third update), and it revises many values that older
   calculators still print from 2011 — brisk walking 17200: 4.3 → 4.8;
   jogging 12020: 7.0 → 7.5; running 6 mph: 9.8 (2011 code 12050) → 9.3
   (2024, pace band restated as 6.0–6.3 mph); Hatha yoga 02150: 2.5 → 2.3;
   swimming values were also restated (2024 swaps the code order: slow laps
   are 18240 and fast laps 18230). The spec pins the 2024 edition
   throughout; mixing editions inside one table would be internally
   inconsistent.
2. **Aerobics code.** In the 2024 edition "Aerobic, general" sits in
   Conditioning Exercise as code 02000 at 7.3 MET; the 2011 dancing-category
   code 03015 no longer carries it. The table uses 02000.
3. **Gross pinned, net explained.** External calculators differ on gross
   vs net; the spec pins gross (the Compendium formula's own output) and
   puts the net derivation in the FAQ instead of adding a toggle, keeping
   one canonical result per input.

## Fixture derivations (two independent routes)

Route A — hand derivation with the decimal formula `kcal = MET × kg ×
minutes / 60`, rounded half-up once:

- single-walking-moderate: 3.8 × 60 × 0.5 h = 114.0 → **114**
- compare-three: brisk 4.8 × 70 × 1 = 336; jogging 7.5 × 70 × 1 = 525;
  bicycling 8.0 × 70 × 1 = 560; total 336 + 525 + 560 = **1421**
- half-up-tie: 5.0 × 65 × 0.5 = 162.5 → **163** (tie rounds up; banker's
  rounding would give 162, so this case separates the modes)
- fractional-inputs: 5.8 × 62.5 × (45.5/60) = 362.5 × 0.758333… =
  274.895833… → **275**
- max-bounds: 9.3 × 500 × 24 = **111,600**
- min-bounds-round-up: 2.3 × 20 × (1/60) = 0.7666… → **1**
- round-down: 3.5 × 80 × (47/60) = 219.333… → **219**
- compare-two-input-order: yoga 2.3 × 50 × (40/60) = 76.666… → 77; aerobic
  7.3 × 50 × (40/60) = 243.333… → 243; total **320**, rows in input order
  (yoga first, although its MET is lower)

Route B — independent recalculation with exact rational arithmetic (a
scratch script evaluating the §2.5 integer rule
`MET_tenths × weight_hundredths × minutes_tenths / 600000` and, separately,
the decimal formula over exact fractions). All eleven computed row values
and both totals agreed with Route A exactly, including the 162.5 tie and
the 274.895833… case. Error fixtures were checked by walking §2.7's order
by hand; the `ROW_LIMIT`-before-`ENUM` and capacity-before-range choices
are exercised by `error-activities-row-limit` (all four ids valid) and
`error-weight-input-limit` (`123456789` would also fail range).

## Self-check against the specification format

- [x] BRIEF.md states goal, scope, non-goals, users and locked decisions.
- [x] SPEC.md has all eight sections; §6 predeclares the nine product
      acceptance aspects.
- [x] The MET table is literal data with Compendium codes and one named
      edition; no value is averaged or combined.
- [x] Formula, integer arithmetic, rounding mode, total definition and the
      gross convention are pinned; worked examples are normative.
- [x] Input grammars, ranges, capacities, validation order and every error
      code/field/row rule are pinned, with bilingual messages.
- [x] Compare mode is pinned (shared weight and duration, input-order rows,
      sum-of-rounded-rows total); the report download is pinned with a
      canonical-byte example and a size cap.
- [x] fixtures.json: 23 cases (8 success, 12 error, 3 controller), unique
      ids, all expected values literal and derived by two routes.
- [x] No fixture value was produced by running an implementation (none
      exists yet).
- [x] Scope fences against `bmi-tdee-calculator` (daily totals) and
      `running-pace-calculator` (pace/splits) are stated in §1.4.

## Known limits of this check

- Eight of the fourteen MET rows were confirmed through sources quoting
  the 2024 lists rather than on pacompendium.com directly (see the table
  above); flagged for the independent reviewer.
- The Chinese activity names are the author's translations of the
  Compendium descriptions; a native-speaker editorial pass is part of
  normal review, not claimed here.
- This author check is not an independent review and does not mark the
  spec ready; readiness requires a different actor's review per the
  repository handbook.


## 2026-11-10 維護覆核補記

[本輪來源覆核](PROVENANCE-RECHECK.md) 補充原先未直接取得的來源；其範圍不等於完整規格或產品驗收，原作者歷史證據保留。

# Calories Burned Calculator Brief

## Identification

- Tool slug: `calories-burned-calculator`
- Display title: 運動熱量消耗計算 / Calories Burned Calculator
- Planned public origin: `https://calories-burned-calculator.glossquote.com`
- Language coverage: Traditional Chinese and English
- Business model: free, advertising-supported static tool after public launch, if
  approved

## Goal

Let a visitor estimate the calories burned in one exercise session from body
weight, duration and an activity chosen from a pinned 14-row MET table taken
from the 2024 Adult Compendium of Physical Activities, using the Compendium's
own definition `kcal = MET × weight (kg) × duration (hours)`, with an optional
side-by-side comparison of up to three activities at the same weight and
duration. The formulas are simple; the accuracy risk lives in the table values
(the 2024 edition revised many familiar 2011 values), in rounding and in the
gross-versus-net distinction, so the table, the arithmetic and the disclaimer
are pinned literally.

## Scope

- Inputs: body weight in kg (required, at most two decimal places, 20–500 kg),
  duration in minutes (required, at most one decimal place, 1–1440 minutes)
  and one to three activity codes from the pinned table. One activity is the
  single mode; two or three activities are the compare mode, sharing the same
  weight and duration.
- Exact integer arithmetic: `kcal_row = MET × kg × minutes / 60` evaluated as
  `MET_tenths × weight_hundredths × minutes_tenths / 600000` and rounded once
  per row to a whole kcal, half away from zero. The result and JSON report
  retain the sum of the rounded rows. Compare mode shows each alternative's
  estimate separately.
- Results are gross totals: they include the resting (about 1 MET) share, as
  the Compendium formula defines them. A pinned bilingual disclaimer and FAQ
  say so and explain how to derive a net figure by hand; there is no net
  toggle.
- One-click canonical JSON report download named
  `calories-burned-report.json`, with an output-size limit.

## Explicit non-goals

- No daily energy totals (TDEE), basal metabolic rate or activity-level
  multipliers; that is `bmi-tdee-calculator`.
- No pace, split, cadence or race planning; that is
  `running-pace-calculator`.
- No food or meal calorie lookup, no diet plan and no weight-loss advice.
- No imperial units, no net/gross toggle, no per-activity durations, no more
  than three compared activities and no custom MET entry.
- No account, saved history, server computation, analytics, personalization or
  cross-device sync.

## Users and context

- General adults estimating exercise energy expenditure for their own
  reference, on mobile or desktop.
- The MET values are population averages for adults aged 19 to 59; the
  disclaimer and FAQ state that individual expenditure varies and that the
  result is not medical or weight-loss advice.

## Success criteria

The implementation is successful when every behaviour in `SPEC.md` holds, all
fixture cases pass from literal expected values, the displayed MET table
matches the pinned table exactly, the report bytes are canonical and
reproducible, and the reviewer can reproduce every result by following the
written integer-arithmetic rule alone.

## Locked decisions

- MET source: 2024 Adult Compendium of Physical Activities (Herrmann SD,
  Willis EA, Ainsworth BE, et al., Journal of Sport and Health Science,
  2024;13(1):6–12), category lists at pacompendium.com, retrieved 2026-11-09.
  The 14 pinned rows carry their Compendium codes in `SPEC.md`; values are
  used unchanged and no rows are combined or averaged, per the Compendium's
  terms of use.
- Formula: the Compendium defines 1 MET as 1 kcal/kg/hour, so
  `kcal = MET × kg × hours` is the source's own definition, not an
  approximation layered on top of it. The oxygen-based form
  (`MET × 3.5 × kg × minutes / 200`) is not used; it differs by about 5% and
  mixing the two is a documented source of inconsistent calculator results.
- Rounding: per-row, once, half away from zero; ties are decided exactly by
  the integer rule. The total is the sum of rounded rows.
- Gross totals only in the result; the net explanation lives in the FAQ.

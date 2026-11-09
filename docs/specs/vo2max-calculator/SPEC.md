# VO2max Calculator Specification

Status: DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW\
Spec ID: `spec-vo2max-calculator-20261109`\
Tool ID: `vo2max-calculator`\
Target path: `tools/vo2max-calculator/`

This specification defines a deterministic calculator that estimates maximal
oxygen uptake (VO₂max, ml/kg/min) from one of two published field tests — the
Cooper 12-minute run or the 1.5-mile run — and optionally classifies the result
against published age/sex fitness norms. It defines one public content
contract, one pure core, one asynchronous controller and two static localized
pages. Formula constants, the classification table, validation order, rounding,
result limits and async replacement behavior are part of the behavior, not
implementation taste.

This is an author draft for independent document review. It is not a product
acceptance result and must not be described as one.

## 1. Goal, scope and success criteria

### Goal

Given a field-test performance (distance covered in 12 minutes, or the time
needed to run 1.5 miles), calculate an estimated VO₂max to one decimal place
using the published equation for that test, and — only when the user supplies
both age and sex — classify the rounded estimate against the Cooper Institute
age/sex normative table pinned in §4.

### In scope

- Two test modes selected by the `test` field:
  - `cooper12`: Cooper 12-minute run. Input is the distance covered, in
    metres. VO₂max = (distanceM − 504.9) / 44.73 (Cooper 1968).
  - `mile15`: 1.5-mile run. Input is the elapsed time as one text field.
    VO₂max = 483 / timeMinutes + 3.5 (ACSM published form; see §4).
- Optional classification: age (13–99) and sex (`male` | `female`) as a pair.
  Both present → classification object. Both absent → `null`. Exactly one
  present → `PAIR_REQUIRED` error naming the absent field.
- A pinned non-positive rule: when the rounded Cooper result is `0.0` or less,
  the core returns a `BELOW_RANGE` error on `distanceMeters` instead of a
  meaningless zero or negative fitness value.
- Exact five-field draft input, byte counting, validation order and error
  results.
- Deterministic rounding (round half up to one decimal, applied once), with the
  classification lookup performed on the rounded value.
- A pure synchronous calculation core.
- Worker-backed asynchronous page state with sequence invalidation, stale
  replacement protection, draft restoration and deterministic plain-language
  status announcements.
- Draft persistence, run, reset, load-example and fixed JSON download.
- Traditional Chinese and English static pages with the same field IDs and
  the same public behavior.
- Explicit estimate disclaimers in both languages: field-test equations are
  estimates (published accuracy is roughly ±10% against laboratory
  measurement), and the normative bands are approximate.

### Explicit exclusions

- No Rockport walk test, step test, resting-heart-rate estimate, cycling or
  swimming equations, and no multi-test comparison in one run. The concept
  note suggested "Rockport or Cooper" as alternatives; this spec implements
  Cooper 12-minute and the 1.5-mile run only, because both are run tests with
  single-input published equations that can be pinned and hand-verified, while
  Rockport additionally requires body weight and post-test heart rate, which
  would duplicate the input surface of other tools. Adding modes later
  requires a reviewed spec revision, not an implementation choice.
- No heart-rate-zone output; `heart-rate-zones` owns training zones derived
  from heart rate. No race-time prediction; `race-time-predictor` and
  `running-pace` own pace and finish-time prediction, including a Riegel
  predictor — this tool never predicts a finish time, it only converts a
  finished performance into a VO₂max estimate. No calorie, BMI or metabolic
  output; `bmi-tdee-calculator` owns those.
- No laboratory gas-analysis claims. The result is always labelled an
  estimate.
- No accounts, storage of results on a server, sharing, analytics, ads,
  tracking, external requests, personalization or remote configuration.
- No recommendation engine: the tool reports the estimate and its normative
  band only. It does not prescribe training, and it does not diagnose fitness
  or health.
- No arbitrary precision mode, historical norm editions, percentile ranks
  beyond the six pinned categories, or classification for ages outside
  13–99.

### Success criteria

The implementation is behaviorally complete only when:

1. Every valid case in `fixtures.json` returns the exact JSON result.
2. Every invalid case returns the exact error code, field and row (`null`).
3. The three controller cases pass with the controllable fake Worker defined
   in §7.
4. Reset is synchronous and restores the pinned initial draft byte-for-byte.
5. Stale Worker messages cannot replace the visible draft, result, error or
   status.
6. The report is the canonical JSON serialization of the current successful
   result, under the pinned byte cap and filename.
7. Both pages expose the same controls, IDs, result fields, localized category
   labels and accessibility behavior.
8. Build output is deterministic across two consecutive preview builds.
9. A fresh URL returns HTTP 200 for both pages and their local assets in a
   real loopback HTTP probe.

Product acceptance is separate: §6 lists all nine required aspects as
`NOT_RUN` with null scores for this draft.

## 2. User flow, pages and state

### Routes

| Route                  | Language             | Purpose                                     |
| ---------------------- | -------------------- | ------------------------------------------- |
| `/`                    | Traditional Chinese  | Primary calculator page.                    |
| `/en/`                 | English              | Same tool and public behavior in English.   |

The future production origin, when independently approved and configured, is
`https://vo2max-calculator.glossquote.com`. That origin is a planned
identifier only; it is not configured by this specification.

The preview pages are static HTML documents. Each page declares
`<meta name="robots" content="noindex">`, a canonical link to its planned
production URL, Open Graph title, description and type, `og:url`, and
`twitter:card` set to `summary`.

### User flow

1. The page opens with the pinned default draft: Cooper 12-minute mode with
   distance `2400`, time `12:00`, and empty age and sex.
2. The user selects a test mode, edits the active measurement field, and may
   fill in both age and sex (or neither).
3. Selecting a different test mode keeps every draft value; the newly inactive
   measurement field is ignored by the core except for its capacity and
   character checks (§3).
4. Clicking run validates the draft locally in the page.
5. A valid run is submitted to the calculation Worker.
6. The successful result panel shows the VO₂max estimate with its unit, the
   test echo (distance or time in seconds), and — when classification exists —
   the age band and category in the page language. When classification is
   `null`, the panel shows the pinned "add age and sex" hint instead.
7. Editing any field after a success makes the state dirty; the old result
   remains visible only while the draft is unchanged.
8. Reset restores the default draft synchronously, clears result, error,
   report and pending state, and does not ask for confirmation.
9. Load example replaces the draft with the pinned example draft (§2 table).
10. Download report is available only in the current success state and emits
    the deterministic JSON report from §4.

### Fields and defaults

| Field           | Control | Default  | Behavior                                                                      |
| --------------- | ------- | -------- | ----------------------------------------------------------------------------- |
| `test`          | select  | cooper12 | `cooper12` or `mile15`; switching modes never clears any field value.        |
| `distanceMeters`| text    | 2400     | Active only in `cooper12` mode; metres covered in 12 minutes, ≤ 1 decimal.    |
| `time`          | text    | 12:00    | Active only in `mile15` mode; elapsed time for 1.5 miles, `M:SS`/`H:MM:SS`.  |
| `age`           | text    | (empty)  | Optional; integer years. Empty means absent. Pair rule with `sex` (§3).       |
| `sex`           | select  | (empty)  | Optional; empty option, `male` or `female`. Pair rule with `age` (§3).        |

### Example

| Action        | Draft after action                                                                 |
| ------------- | ---------------------------------------------------------------------------------- |
| Load example  | `test=cooper12`, `distanceMeters=2400`, `time=12:00`, `age=` (empty), `sex=` (empty) |

The example input is exactly the `cooper-basic` fixture input, so a reviewer
can reproduce the first observable result (VO₂max 42.4, classification `null`)
with one click. The default draft and the example draft are identical by
design: the default state is already a complete, runnable example.

### State model

| State         | Meaning                                                                                     | Run | Download report |
| ------------- | ------------------------------------------------------------------------------------------- | --- | --------------- |
| `idle`        | Current draft has not been run.                                                             | yes | no              |
| `dirty`       | Draft differs from the last submitted draft.                                                | yes | no              |
| `submitting`  | A current sequence is waiting for the Worker.                                               | no  | no              |
| `success`     | Latest current Worker result matches the current draft.                                     | yes | yes             |
| `error`       | Current local or Worker validation failed for the current draft.                            | yes | no              |
| `unavailable` | Worker construction, script loading or messaging failed; local validation remains usable.   | yes | no              |

The controller owns a monotonically increasing sequence number. Every edit,
run, reset and load-example increments the sequence and invalidates older
messages. A Worker message is accepted only when its `sequence` equals the
current sequence **and** its echoed draft deep-equals the current draft.

After a successful run:

- Editing any field moves to `dirty` and clears the report payload.
- Re-running the unchanged draft returns to the same success result.
- Running an edited invalid draft moves to `error` and identifies the first
  failing field in pinned field order.
- Pressing run rapidly submits only once for the same unchanged draft; a
  second press while `submitting` is ignored.
- A late result for an older draft is ignored entirely.
- Worker unavailability never fabricates a result. Local schema and field
  validation still run and can produce the pinned error state.

### Status announcements

The status region uses `aria-live="polite"`. Messages are fixed page strings,
never raw exception text:

| Situation          | zh-Hant               | English                          |
| ------------------ | --------------------- | -------------------------------- |
| Ready              | 準備就緒               | Ready                            |
| Dirty after edit   | 內容已修改，尚未計算   | Changed — not calculated yet     |
| Submitting         | 計算中…                | Calculating…                     |
| Success            | 計算完成               | Calculation complete             |
| Error              | 無法計算，請檢查輸入   | Cannot calculate — check input   |
| Worker unavailable | 背景計算不可用         | Background calculation unavailable |
| Reset              | 已重設                 | Reset                            |
| Example loaded     | 已載入範例             | Example loaded                   |

## 3. Inputs, outputs and error contract

### Input object

The pure core accepts exactly one plain object:

```json
{
  "test": "cooper12",
  "distanceMeters": "2400",
  "time": "12:00",
  "age": "",
  "sex": ""
}
```

Rules:

- The top-level value must be a non-null, non-array plain object.
- It must have exactly the five own enumerable string keys `test`,
  `distanceMeters`, `time`, `age` and `sex`.
- Unknown, missing or duplicate-equivalent keys are `SCHEMA` failures.
- Every value must be a primitive string. Numbers, booleans, objects, arrays,
  `null`, `undefined`, symbols, bigints and String objects are `SCHEMA`
  failures.
- Symbol-keyed properties and accessor properties are `SCHEMA` failures.
- The core must not mutate its input.

### Raw text capacity

Before any per-mode or per-field distinction, each of the five raw strings
must contain at most **8 UTF-16 code units**. A longer value fails with
`INPUT_LIMIT` for that field. This is the binding raw capacity for every field
(`10000.0` is 7 units; `1:00:00` is 7 units; `female` is 6 units; `cooper12`
is 8 units exactly). The limit applies to inactive measurement fields too.

### Field validation order

After the schema check, fields are validated in this exact order:

1. `test`
2. `distanceMeters`
3. `time`
4. `age`
5. `sex`

Within each active field, checks run in this order:

1. Raw capacity: `INPUT_LIMIT`.
2. Unpaired UTF-16 surrogate in the raw value: `UNICODE`.
3. Empty required string: `EMPTY` (required fields only; see below).
4. Field grammar or enumeration: `ENUM`, `DECIMAL_FORMAT`, `TIME_FORMAT` or
   `INTEGER_FORMAT`.
5. Numeric or semantic range: `RANGE`.

The first failure in field order wins. An ordinary validation failure has
this exact shape:

```json
{ "ok": false, "error": { "code": "RANGE", "field": "distanceMeters", "row": null } }
```

`row` is always `null`; this tool has no row-based input. `SCHEMA` uses
`"field": null`.

#### `test`

- Capacity and surrogate checks apply.
- Empty string: `EMPTY`.
- Must be exactly `cooper12` or `mile15`; anything else: `ENUM`.

#### `distanceMeters` (active only when `test` is `cooper12`)

When `test` is `mile15`, this field receives only the capacity and surrogate
checks; its content is otherwise ignored, exactly like an unused
known-distance field in the race-time contract. When active:

- Empty string: `EMPTY`.
- Grammar `DECIMAL_FORMAT`: ASCII digits with an optional single decimal
  point followed by exactly one digit — `^[0-9]+(\.[0-9])?$`. Leading zeros
  are allowed. Grouping commas, signs, exponent notation, a trailing or
  leading point, more than one decimal digit, and non-ASCII digits are
  format failures.
- Range `RANGE`: the parsed value must satisfy 0 ≤ v ≤ 10000 (metres).

#### `time` (active only when `test` is `mile15`)

When `test` is `cooper12`, this field receives only the capacity and
surrogate checks; its content is otherwise ignored. When active:

- Empty string: `EMPTY`.
- Grammar `TIME_FORMAT`: either `M:SS` — `^[0-9]{1,3}:[0-5][0-9]$` — or
  `H:MM:SS` — `^[0-9]{1,2}:[0-5][0-9]:[0-5][0-9]$`. No sign, no fractional
  seconds, no whitespace, no single-digit seconds segment.
- Range `RANGE`: total seconds must satisfy 240 ≤ s ≤ 3600 (4:00 to 60:00).
  A 1.5-mile time under four minutes is beyond the published equation's
  credible use, and over sixty minutes the performance is a walk, not the
  run test the equation models.

#### `age` (optional)

- Capacity and surrogate checks apply.
- Empty string means **absent**; there is no `EMPTY` error for this field.
- Grammar `INTEGER_FORMAT`: ASCII digits only — `^[0-9]+$`. Leading zeros are
  allowed and parse normally (`030` is 30).
- Range `RANGE`: when present, 13 ≤ v ≤ 99. The classification table covers
  ages 13 and up; values outside the table are rejected rather than silently
  clamped into the nearest band.

#### `sex` (optional)

- Capacity and surrogate checks apply.
- Empty string means **absent**; there is no `EMPTY` error for this field.
- Must be exactly `male` or `female` when non-empty; anything else: `ENUM`.

#### Cross-field pair check

After all five per-field checks pass, one cross-field check runs before any
computation:

- `age` present XOR `sex` present → error
  `{ "code": "PAIR_REQUIRED", "field": <the absent field's name>, "row": null }`.
  Classification needs both halves of the pair; guessing the missing half is
  forbidden.

### Success output

Cooper mode:

```json
{
  "ok": true,
  "result": {
    "test": "cooper12",
    "distanceMeters": 2400,
    "vo2max": 42.4,
    "classification": null
  }
}
```

1.5-mile mode:

```json
{
  "ok": true,
  "result": {
    "test": "mile15",
    "timeSeconds": 720,
    "vo2max": 43.8,
    "classification": null
  }
}
```

With classification:

```json
"classification": { "sex": "male", "ageBand": "30-39", "category": "superior" }
```

Result field rules:

- `test`: the mode echo, `cooper12` or `mile15`.
- `distanceMeters` (Cooper only): the parsed distance as a JSON number
  (`2404.4` stays `2404.4`).
- `timeSeconds` (1.5-mile only): the parsed total seconds as a JSON integer.
- `vo2max`: the rounded estimate as a JSON number with one decimal of
  precision (see §4). JSON serialization may render an integral value such as
  `45.0` as `45`; numeric equality is the contract.
- `classification`: `null`, or an object with `sex` (echo), `ageBand` (one of
  `13-19`, `20-29`, `30-39`, `40-49`, `50-59`, `60+`, chosen from the parsed
  age) and `category` (one of `very-poor`, `poor`, `fair`, `good`,
  `excellent`, `superior`, chosen by comparing the **rounded** `vo2max`
  against the pinned thresholds in §4).

### Fixed report download

- Filename: `vo2max-report.json`.
- Content: the successful `result` object only (not the `{ ok, result }`
  wrapper).
- Serialization: compact JSON, object keys sorted recursively by UTF-16 code
  unit, exactly one trailing LF, UTF-8 without BOM.
- Byte cap: 2,097,152 bytes. A result that would exceed the cap returns
  `OUTPUT_LIMIT` with `field: null` and `row: null` instead of a success.
  (With the pinned field ranges a real result is a few hundred bytes; the cap
  is a contract backstop.)
- No report exists outside the current `success` state.

## 4. Deterministic algorithm

All arithmetic uses IEEE-754 double precision. The core is synchronous and
pure: the same input always produces a byte-identical canonical result.

### Constants and sources

- **Cooper 12-minute run** (Cooper, K.H., "A Means of Assessing Maximal
  Oxygen Intake", *JAMA* 203(3):201–204, 1968):
  `VO2max = (distanceM − 504.9) / 44.73`, distance in metres, result in
  ml/kg/min. This exact published form is pinned; the algebraically
  equivalent kilometre form `22.351 × km − 11.288` must not be substituted,
  because the two forms can differ in the last rounded digit.
- **1.5-mile run**: `VO2max = 483 / timeMinutes + 3.5`, the field-test form
  published in ACSM exercise-testing guidance (ACSM's *Guidelines for
  Exercise Testing and Prescription*; reproduced in ACSM-EP study materials
  and standard field-test references). The constant is pinned as **483** —
  the published rounded constant — not 482.8. The value derives from the ACSM
  running metabolic equation (0.2 ml/kg/min per m/min plus the 3.5 resting
  component) applied to 1.5 miles = 2414.016 m, where 0.2 × 2414.016 =
  482.8032; the published field form rounds this to 483, and this spec follows
  the published form. The difference never changes a one-decimal result by
  more than 0.1 and is disclosed here and in `AUTHOR-CHECK.md`.
- **Classification norms**: the Cooper Institute age/sex normative table as
  tabulated in Heywood, V., *Advance Fitness Assessment and Exercise
  Prescription*, 3rd ed. (1998), and reproduced in ACSM-aligned references.
  The table is transcribed verbatim into thresholds below and is labelled
  **approximate**: reproductions vary slightly between publications, and the
  bands are population norms, not medical cut-offs.

### Steps

1. Validate the input object, fields and pair rule per §3. On failure, return
   the error immediately.
2. Compute the raw estimate in double precision, in this exact order:
   - `cooper12`: `raw = (distance − 504.9) / 44.73`, where `distance` is the
     parsed decimal value.
   - `mile15`: `raw = 3.5 + 483.0 / (timeSeconds / 60.0)`, where
     `timeSeconds` is the parsed integer total.
3. Round once: `vo2max = floor(raw × 10 + 0.5) / 10` (round half up to one
   decimal). No other rounding is applied anywhere.
4. Non-positive rule (`cooper12` only): if `vo2max ≤ 0`, return
   `{ "code": "BELOW_RANGE", "field": "distanceMeters", "row": null }`.
   This fires exactly when distance ≤ 505 metres at the pinned grammar
   (505 m gives raw 0.0022…, which rounds to 0.0; 506 m gives 0.1). In
   `mile15` mode the rule cannot fire within the pinned time range (the
   slowest allowed time, 3600 s, gives 11.55).
5. Classification (only when age and sex are both present): pick the age band
   from the parsed age (13–19, 20–29, 30–39, 40–49, 50–59, 60–99 → `60+`),
   then compare the **rounded** `vo2max` against that row's five thresholds:
   below `poorMin` → `very-poor`; below `fairMin` → `poor`; below `goodMin`
   → `fair`; below `excellentMin` → `good`; below `superiorMin` →
   `excellent`; otherwise → `superior`.
6. Assemble the result object per §3 and apply the report cap check.

### Classification thresholds (pinned verbatim)

Lower bounds in ml/kg/min for the **rounded** value, transcribed from the
published band table (each published band `a–b` becomes the next band's lower
bound at one-decimal resolution; e.g. men 20–29 published Excellent 46.5–52.4
and Superior >52.4 give `excellentMin 46.5`, `superiorMin 52.5`).

| Sex    | Age band | poorMin | fairMin | goodMin | excellentMin | superiorMin |
| ------ | -------- | ------- | ------- | ------- | ------------ | ----------- |
| male   | 13-19    | 35.0    | 38.4    | 45.2    | 51.0         | 56.0        |
| male   | 20-29    | 33.0    | 36.5    | 42.5    | 46.5         | 52.5        |
| male   | 30-39    | 31.5    | 35.5    | 41.0    | 45.0         | 49.5        |
| male   | 40-49    | 30.2    | 33.6    | 39.0    | 43.8         | 48.1        |
| male   | 50-59    | 26.1    | 31.0    | 35.8    | 41.0         | 45.4        |
| male   | 60+      | 20.5    | 26.1    | 32.3    | 36.5         | 44.3        |
| female | 13-19    | 25.0    | 31.0    | 35.0    | 39.0         | 42.0        |
| female | 20-29    | 23.6    | 29.0    | 33.0    | 37.0         | 41.1        |
| female | 30-39    | 22.8    | 27.0    | 31.5    | 35.7         | 40.1        |
| female | 40-49    | 21.0    | 24.5    | 29.0    | 32.9         | 37.0        |
| female | 50-59    | 20.2    | 22.8    | 27.0    | 31.5         | 35.8        |
| female | 60+      | 17.5    | 20.2    | 24.5    | 30.3         | 31.5        |

Published band table for cross-checking (Very Poor / Poor / Fair / Good /
Excellent / Superior), men: 13–19: <35.0 / 35.0–38.3 / 38.4–45.1 / 45.2–50.9 /
51.0–55.9 / >55.9; 20–29: <33.0 / 33.0–36.4 / 36.5–42.4 / 42.5–46.4 /
46.5–52.4 / >52.4; 30–39: <31.5 / 31.5–35.4 / 35.5–40.9 / 41.0–44.9 /
45.0–49.4 / >49.4; 40–49: <30.2 / 30.2–33.5 / 33.6–38.9 / 39.0–43.7 /
43.8–48.0 / >48.0; 50–59: <26.1 / 26.1–30.9 / 31.0–35.7 / 35.8–40.9 /
41.0–45.3 / >45.3; 60+: <20.5 / 20.5–26.0 / 26.1–32.2 / 32.3–36.4 /
36.5–44.2 / >44.2. Women: 13–19: <25.0 / 25.0–30.9 / 31.0–34.9 / 35.0–38.9 /
39.0–41.9 / >41.9; 20–29: <23.6 / 23.6–28.9 / 29.0–32.9 / 33.0–36.9 /
37.0–41.0 / >41.0; 30–39: <22.8 / 22.8–26.9 / 27.0–31.4 / 31.5–35.6 /
35.7–40.0 / >40.0; 40–49: <21.0 / 21.0–24.4 / 24.5–28.9 / 29.0–32.8 /
32.9–36.9 / >36.9; 50–59: <20.2 / 20.2–22.7 / 22.8–26.9 / 27.0–31.4 /
31.5–35.7 / >35.7; 60+: <17.5 / 17.5–20.1 / 20.2–24.4 / 24.5–30.2 /
30.3–31.4 / >31.4.

### Worked anchors (for hand verification)

- Cooper, 2400 m: (2400 − 504.9) / 44.73 = 1895.1 / 44.73 = 42.3675… → **42.4**.
- Cooper, 2800 m: 2295.1 / 44.73 = 51.3100… → **51.3** (men 30–39: ≥ 49.5 →
  superior).
- Cooper, 2000 m: 1495.1 / 44.73 = 33.4249… → **33.4** (women 20–29: 33.0 ≤
  33.4 < 37.0 → good).
- Cooper, 2404.4 m: 1899.5 / 44.73 = 42.4659… → **42.5**; the rounded value
  reaches men 20–29 `goodMin` 42.5 exactly, so the category is `good` even
  though the raw value is below 42.5 — this case pins the
  classification-on-rounded rule.
- 1.5 mile, 12:00 (720 s): 3.5 + 483 / 12 = 3.5 + 40.25 = 43.75 exactly →
  half up → **43.8**. This is a deliberate exact-tie anchor: 43.75 is exactly
  representable in binary, so the tie behavior is deterministic.
- 1.5 mile, 15:00 (900 s): 3.5 + 483 / 15 = 3.5 + 32.2 = 35.7 (women 40–49:
  32.9 ≤ 35.7 < 37.0 → excellent).
- Cooper, 505 m: 0.1 / 44.73 = 0.0022… → rounds to 0.0 → `BELOW_RANGE`.

## 5. Implementation contract

### Target file layout

```text
tools/vo2max-calculator/
  package.json
  public/
    index.html
    en/index.html
    js/core/vo2max.mjs
    js/app.js
    styles/vo2max.css
  scripts/build.mjs
  scripts/check.mjs
  scripts/serve.mjs
  test/vo2max-core.test.mjs
  test/vo2max-controller.test.mjs
  HANDOFF.md
  VERIFICATION.md
```

### Core module

`public/js/core/vo2max.mjs` exports:

- `run(input)`: the synchronous pure transform from §3–§4.
- String constants for both locales, the pinned thresholds table, field
  order, defaults and the example draft.

The core must not access DOM, storage, network, timers, randomness, dates,
environment variables, `Intl`, locale formatting or floating-point formatting
APIs whose output can vary by environment. Number parsing uses the pinned
grammars only; JSON numbers in results come from the pinned arithmetic, never
from locale-sensitive formatting.

### Page and controller

- `public/js/app.js` is a classic script (no module syntax) so it can run in
  a Worker-adjacent test harness and directly from `file:`-safe static
  hosting patterns used by the other tools.
- The controller (`Vo2maxController`) is created with injected dependencies:
  a view adapter, a storage adapter, and a Worker factory. Tests drive it
  with the fake Worker from §7.
- Draft persistence uses `localStorage` key
  `gloss-tools:vo2max-calculator:draft:v1`, storing the exact five-field
  draft JSON. A stored draft that fails schema on load is discarded and the
  default draft is used; loading never throws.
- The Worker runs the same core module. Worker messages carry
  `{ sequence, draft }` and replies echo `{ sequence, draft, outcome }`,
  where `outcome` is the exact core return value.
- DOM updates use `textContent` and `value` only. No `innerHTML` with user
  data anywhere.
- The result panel renders: VO₂max value + `ml/kg/min`, the mode echo
  (distance in metres or time in seconds), and either the classification
  (band + localized category label) or the pinned no-classification hint.

### Localized strings (pinned labels)

| Key        | zh-Hant        | English        |
| ---------- | -------------- | -------------- |
| very-poor  | 非常弱         | Very poor      |
| poor       | 弱             | Poor           |
| fair       | 普通           | Fair           |
| good       | 良好           | Good           |
| excellent  | 優秀           | Excellent      |
| superior   | 卓越           | Superior       |

Page copy (title, meta description, headings, hints, FAQs) is pinned in the
two HTML files at implementation time from §2 and the BRIEF; the estimate
disclaimer and the "norms are approximate" note must appear on both pages
near the result panel.

### Pages

- `<html lang="zh-Hant">` for `/` and `<html lang="en">` for `/en/`.
- One `<h1>`: `最大攝氧量估算` / `VO2 Max Calculator`.
- `<title>`: `最大攝氧量估算｜Gloss Tools` / `VO2 Max Calculator | Gloss Tools`.
- Meta description (zh): `以 Cooper 12 分鐘跑或 1.5 英里跑的成績估算最大攝氧量（VO₂max），並可依年齡與性別對照 Cooper Institute 體適能分級（近似常模）。`
- Meta description (en): `Estimate VO2 max from a Cooper 12-minute run or a 1.5-mile run, with an optional age- and sex-based fitness rating from the Cooper Institute norms.`
- Content Security Policy meta: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'`.
- All form controls have associated `<label>` elements; the mode select
  labels which measurement field is active; error text is associated with
  the failing field via `aria-describedby`; the result region is labelled.
- FAQ content (both languages, same facts):
  1. 這是實驗室測量嗎？不是。這是實地測驗公式的估算值，與實驗室氣體分析
     相比誤差約 ±10%，適合追蹤個人變化而非醫學判斷。/ Is this a lab
     measurement? No. It is a field-test estimate, roughly ±10% against
     laboratory gas analysis — good for tracking change, not a medical
     measurement.
  2. 為什麼距離太短會無法估算？Cooper 公式在 504.9 公尺以下會給出 0 或
     負值，沒有體適能意義，所以工具會直接指出距離超出可估算範圍。/ Why
     does a short distance fail? Below 504.9 m the Cooper equation returns
     zero or negative values, which are meaningless as fitness estimates,
     so the tool reports the distance as below the estimable range.
  3. 分級表有多精確？分級來自 Cooper Institute 常模，是群體近似值，
     不同出版品略有差異；請把等級當參考，不要當成醫療門檻。/ How exact
     are the ratings? The bands are Cooper Institute population norms and
     are approximate — reproductions vary slightly. Treat the rating as a
     reference, not a medical cut-off.

### Scripts

`package.json` (Node ≥ 24, ESM, zero runtime dependencies) must provide:

- `npm test`: core + controller suites (Node test runner).
- `npm run check`: static contract checks (file layout, pinned strings,
  no forbidden APIs, CSP and meta presence, fixture integrity).
- `npm run build:preview`: deterministic preview build into `dist/`.
- `npm run check:generated:preview`: rebuild-and-compare gate; fails if the
  committed preview differs from a fresh build.
- `node scripts/serve.mjs`: loopback static server for the HTTP probe.

Two consecutive `build:preview` runs must produce byte-identical output, and
`check:generated:preview` must pass on the committed tree.

## 6. Acceptance and product checks

Independent review must score the **same fixed candidate commit** on all nine
aspects below. Every aspect needs a score of at least 90 and every listed
evidence item. `NOT_RUN` items block acceptance. This author draft records
all nine as `NOT_RUN` with null scores; document completeness is not product
acceptance.

| # | Aspect                | Score | Status  | Evidence required for acceptance                                                                 |
| - | --------------------- | ----- | ------- | ------------------------------------------------------------------------------------------------ |
| 1 | functionality         | null  | NOT_RUN | All `fixtures.json` core cases pass verbatim; both formulas reproduce the §4 worked anchors; classification matches the pinned thresholds on boundary values (rounded value exactly on a threshold, and the 2404.4 m rounded-up-into-band case). |
| 2 | boundaries            | null  | NOT_RUN | Boundary probes: distance 505 m → BELOW_RANGE vs 506 m → 0.1 success; time 239 s / 240 s / 3600 s / 3601 s; age 12 / 13 / 99 / 100; each raw field at 8 vs 9 UTF-16 units, including inactive fields. |
| 3 | privacy               | null  | NOT_RUN | No network requests beyond same-origin static assets (observed); draft storage limited to the pinned localStorage key; no result leaves the device; download is a local Blob. |
| 4 | security              | null  | NOT_RUN | CSP meta present and effective; no `innerHTML` with draft data; schema rejects accessor/symbol-keyed inputs; unpaired surrogates rejected before any string use; no prototype-pollution path through the draft object. |
| 5 | usability             | null  | NOT_RUN | Mode switch keeps values and makes the active field obvious; pair rule explained in plain language when it fires; estimate and approximate-norms disclaimers visible near the result; reset/example/run reachable and labelled. |
| 6 | accessibility         | null  | NOT_RUN | Labels for all five controls; error association via `aria-describedby`; `aria-live` status messages exactly the pinned strings; full keyboard operation; focus visible; category conveyed by text, not color alone. |
| 7 | localization-seo      | null  | NOT_RUN | Both pages render the pinned titles, descriptions, category labels and FAQs; `lang` attributes correct; noindex on preview; canonical/OG point at the planned production URLs; both languages behave identically on the fixtures. |
| 8 | toolchain-provenance  | null  | NOT_RUN | Node ≥ 24, zero runtime dependencies; `npm test`, `check`, `build:preview` ×2 byte-identical and `check:generated:preview` all pass on the candidate; sources for formulas and norms cited in the tool docs match §4. |
| 9 | compatibility         | null  | NOT_RUN | Real-browser run of both pages on the candidate (current Chrome/Firefox/Safari class engines); Worker unavailable path exercised; `file:`-safe classic script confirmed; loopback HTTP probe returns 200 for both pages and assets. |

## 7. Tests and fixtures

`fixtures.json` contains three groups:

- `coreCases`: literal input → exact expected core return value (success
  object or error object). Expectations are derived by hand from §3–§4 and
  independently recalculated (see `AUTHOR-CHECK.md`); they are never copied
  from an implementation's output.
- `controllerCases`: the three standard async cases below, driven through
  the fake Worker.
- `serialization`: the canonical report bytes for the `cooper-basic` result
  are pinned implicitly by the §3 serialization rules; the core test asserts
  the exact expected string.

### Controller cases

The fake Worker is controllable: tests enqueue replies explicitly and can
deliver them out of order. The controller must satisfy:

1. `state-dirty-error`: run the default draft → success + report available;
   edit `distanceMeters` to `10001` → state `dirty`, report cleared; run →
   `error` with `RANGE` on `distanceMeters`, report still unavailable.
2. `state-cancel-late`: submit draft A; edit to draft B before the reply;
   deliver A's late reply → ignored (no result, no status change); run B →
   B's result shown.
3. `state-replace-late`: submit draft A, then edit and submit draft B;
   deliver B's reply → success with B's result; deliver A's late reply →
   ignored, B's result and success state unchanged.

### Case inventory (core)

Success: Cooper basic (2400 m → 42.4, no classification); Cooper classified
superior (2800 m, male 35 → 51.3); Cooper classified good (2000 m, female 28
→ 33.4); Cooper band-on-rounded (2404.4 m, male 25 → 42.5, good); Cooper
classified fair with decimal distance (1900.5 m, male 52 → 31.2); 1.5-mile
exact tie (12:00 → 43.8, no classification); 1.5-mile classified excellent
(15:00, female 45 → 35.7); 1.5-mile classified very-poor (30:00, male 62 →
19.6); 1.5-mile classified poor (21:00, male 58 → 26.5); 1.5-mile with
ignored inactive distance (`abc` in the distance field, 12:00 → 43.8).

Errors: `BELOW_RANGE` at 505 m and at 0 m; `DECIMAL_FORMAT` for `2,400`;
`RANGE` for distance `10001`; `TIME_FORMAT` for `12:60`; `RANGE` for time
`3:59` (239 s) and `60:01` (3601 s); `PAIR_REQUIRED` naming `sex` when only
age is given; `RANGE` for age `12`; `ENUM` for test `rockport`; `EMPTY` for
an empty active distance; `SCHEMA` for an extra key.

### Test gates

- `npm test` passes with zero failures on the candidate.
- No test derives its expectation from the implementation under test; core
  expectations are the literal fixtures.
- The check script fails if: any pinned string is missing from a page, the
  thresholds table in code differs from §4, a forbidden API appears in
  `app.js`, or either page loses its CSP/noindex/canonical tags.

## 8. Handoff and evidence

The implementing actor must deliver, in `tools/vo2max-calculator/`:

- `HANDOFF.md`: candidate commit, base commit, files changed, how each §4
  anchor and §7 case was verified, and every deviation from this spec (or an
  explicit "no deviations").
- `VERIFICATION.md`: commands actually run with their outcomes, the two
  consecutive build hashes, the loopback HTTP probe result, and an explicit
  `NOT_RUN` list for anything not executed (for example real-browser checks
  when no browser is available). Unrun checks must stay `NOT_RUN`; they must
  not be rewritten as passes.

Acceptance, merge and publication are separate steps owned by the
coordinator and an independent reviewer; the implementing actor does not
self-approve, and this spec's author does not review their own spec.

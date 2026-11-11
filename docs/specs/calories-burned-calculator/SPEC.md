# Calories Burned Calculator Specification

Status: specification candidate for independent document review. Sections 2–4
specify behaviour. Section 1 explains intent, §5 defines tests, §6 predeclares
acceptance, §7 records risks and §8 defines handoff evidence.

## 1. Purpose, users and scope

### 1.1 Purpose

The tool estimates the energy expended in one exercise session from body
weight, duration and an activity from a pinned MET table, and optionally
compares up to three activities side by side at the same weight and duration.
It uses the definition published by the Compendium of Physical Activities
itself — 1 MET is 1 kcal/kg/hour — so the whole computation is one exact
formula: `kcal = MET × weight (kg) × duration (hours)`. There is no hidden
constant, no per-activity adjustment and no estimated "fitness factor".

### 1.2 Users

General adults who want a defensible estimate of exercise calories for their
own reference. The pinned MET values are population averages for adults aged
19 to 59 (the coverage of the 2024 Adult Compendium). The tool is an
estimator, not a medical device; §2.8 pins the disclaimer that says so in both
languages.

### 1.3 In scope

- One weight input, one duration input and one to three activity selections
  from the 14-row table pinned in §2.4. One activity is single mode; two or
  three are compare mode; both modes are the same computation.
- Exact integer arithmetic with one pinned rounding per activity (§2.5).
  The result object and JSON report retain the arithmetic sum of rounded rows.
- Gross totals, labelled as gross, with the net relationship explained in the
  FAQ (§2.8) but not computed by a toggle.
- A deterministic report download (§3.3), bilingual interface and content
  (§2.8), full keyboard operation and visible validation errors (§2.7).

### 1.4 Out of scope

- Daily totals: TDEE, BMR and activity-level multipliers belong to
  `bmi-tdee-calculator`, which estimates a whole day; this tool prices one
  session from a per-activity table and never asks for a daily activity level.
- Pace and planning: `running-pace-calculator` derives pace, splits and
  finish times from distance and time and computes no energy at all; this
  tool takes no distance input.
- Food calories, meal planning, weight-loss targets and any medical advice.
- Imperial units (the Compendium descriptions quote mph only as activity
  labels; weight is kg and duration is minutes, with no unit switch).
- A net/gross toggle, custom MET values, activities outside the pinned table,
  per-activity durations, and comparisons of more than three activities.
- Accounts, saved sessions, history, sharing links, server computation,
  analytics and any persistence of the entered weight.

### 1.5 Success condition

A reviewer can take any accepted inputs, apply §2.5's integer rule by hand,
and reproduce the displayed rows and the report's arithmetic sum exactly.
The selector matches §2.4. Every fixture in `fixtures.json` passes from its
literal expected values, and identical accepted snapshots yield identical
report bytes.

## 2. Normative rules

### 2.1 Input model

The public calculation function accepts one value with this logical shape:

```json
{
  "weight": "62.5",
  "durationMinutes": "45.5",
  "activities": ["swimming-laps-slow"]
}
```

- `weight`: the raw weight string exactly as entered, in kilograms.
- `durationMinutes`: the raw duration string exactly as entered, in minutes.
- `activities`: an array of `id` strings from §2.4, in the order the
  visitor selected them. One element is single mode; two or three elements
  are compare mode. Row order in the result is this array's order, never
  table order or MET order.

Unknown keys, missing keys, a non-object top-level value, or values of the
wrong JSON type (including a non-string element inside `activities`) are
`SCHEMA` errors (§2.7). The app layer always passes strings, so `SCHEMA` is
reachable only through direct core use, imports or future callers.

### 2.2 Weight grammar and range

After the §2.7 capacity, Unicode and emptiness checks, `weight` must match
this ASCII decimal grammar exactly:

```text
weight := INT ("." FRAC)?
INT    := "0" | [1-9][0-9]*
FRAC   := [0-9]{1,2}
```

- No sign, exponent, grouping separator, currency symbol, unit suffix or
  internal whitespace. Leading zeroes are permitted only for the literal
  integer `0`. At most two digits may follow the decimal point.
- The parsed value is stored exactly as an integer count of hundredths of a
  kilogram (`weightHundredths`), so `62.5` is `6250` and `500` is `50000`.
- Range: `20 <= weight <= 500` kg inclusive, i.e.
  `2000 <= weightHundredths <= 50000`. A grammatical value outside the range
  is a `RANGE` error, never silently clamped.
- Raw-string capacity: at most 8 UTF-16 code units before grammar analysis,
  so even the longest legal value (`500.00`, 6 units) and near-misses are
  classified by grammar or range rather than by capacity.

### 2.3 Duration grammar and range

`durationMinutes` uses the same grammar shape with at most **one** fractional
digit:

```text
duration := INT ("." FRAC1)?
FRAC1    := [0-9]
```

- The parsed value is stored exactly as an integer count of tenths of a
  minute (`minutesTenths`), so `45.5` is `455` and `1440` is `14400`.
- Range: `1 <= duration <= 1440` minutes inclusive (one minute to 24 hours),
  i.e. `10 <= minutesTenths <= 14400`. `0`, `0.5` and `1440.5` are `RANGE`
  errors; `1.25` is a `DECIMAL_FORMAT` error because it carries two
  fractional digits.
- Raw-string capacity: at most 8 UTF-16 code units before grammar analysis.

### 2.4 The pinned activity table

The table below is the tool's only activity data. `metTenths` is the MET
value multiplied by 10; the displayed MET is `metTenths` rendered with
exactly one decimal. `code` is the activity's code in the 2024 Adult
Compendium of Physical Activities, kept as a string so leading zeroes
survive. The Chinese names are this tool's translations of the Compendium
descriptions; the English descriptions are the Compendium's own wording,
lightly shortened only where marked by the parenthetical pace. Values are
used exactly as published: no row is averaged, combined or adjusted, per the
Compendium's terms of use.

| # | id | code | MET | 名稱（zh-Hant） | Name (en) |
| - | -- | ---- | --- | --------------- | --------- |
| 1 | `walking-moderate` | `17190` | 3.8 | 步行（中等速度） | Walking, 2.8 to 3.4 mph, moderate pace |
| 2 | `walking-brisk` | `17200` | 4.8 | 步行（快走） | Walking, 3.5 to 3.9 mph, brisk pace |
| 3 | `hiking-cross-country` | `17080` | 6.0 | 健行（越野） | Hiking, cross country |
| 4 | `jogging-general` | `12020` | 7.5 | 慢跑（一般） | Jogging, general |
| 5 | `running-6mph` | `12050` | 9.3 | 跑步（6.0–6.3 mph） | Running, 6.0 to 6.3 mph (10 min/mile) |
| 6 | `bicycling-leisure` | `01010` | 4.0 | 自行車（休閒，<10 mph） | Bicycling, <10 mph, leisure |
| 7 | `bicycling-moderate` | `01030` | 8.0 | 自行車（中速，12–13.9 mph） | Bicycling, 12 to 13.9 mph, moderate effort |
| 8 | `swimming-laps-slow` | `18240` | 5.8 | 游泳（自由式，慢速） | Swimming laps, freestyle, slow, recreational |
| 9 | `swimming-laps-fast` | `18230` | 9.8 | 游泳（自由式，快速） | Swimming laps, freestyle, fast, vigorous effort |
| 10 | `aerobic-general` | `02000` | 7.3 | 有氧運動（一般） | Aerobic, general |
| 11 | `elliptical-moderate` | `02048` | 5.0 | 橢圓機（中等強度） | Elliptical trainer, moderate effort |
| 12 | `resistance-training` | `02054` | 3.5 | 重量訓練（多動作，8–15 下） | Resistance (weight) training, multiple exercises, 8–15 reps |
| 13 | `yoga-hatha` | `02150` | 2.3 | 瑜伽（哈達） | Yoga, Hatha |
| 14 | `tai-chi` | `15670` | 3.3 | 太極／氣功 | Tai chi, qi gong, general |

Source: Herrmann SD, Willis EA, Ainsworth BE, et al. 2024 Adult Compendium of
Physical Activities: A third update of the energy costs of human activities.
Journal of Sport and Health Science, 2024;13(1):6–12; category lists at
pacompendium.com, retrieved 2026-11-09. These are the **2024** values: the
2024 edition revised many familiar figures (for example brisk walking 17200
is 4.8, not the 2011 value 4.3; jogging 12020 is 7.5, not 7.0; Hatha yoga
02150 is 2.3, not 2.5), and an implementation that copies a 2011 table fails
§6.

The selector lists the activities in the table's order in both languages.
The selected IDs are matched case-sensitively. `Walking-Moderate` is an
`ENUM` error, not a match.

### 2.5 Computation (exact)

For each selected activity, with `metTenths` from §2.4:

```text
numerator   = metTenths × weightHundredths × minutesTenths
kcalExact   = numerator / 600000
kcal        = floor(kcalExact), plus 1 when 2 × (numerator mod 600000) >= 600000
```

The divisor is exact: `MET/10 × kg-hundredths/100 × minutes-tenths/10`
divided by 60 minutes per hour gives the denominator
`10 × 100 × 10 × 60 = 600000`. The comparison `2 × remainder >= 600000` is
the exact integer form of "fractional part at least one half", so a true tie
(for example 5.0 MET × 65 kg × 30 min = 162.5) always rounds up: rounding is
half away from zero (all quantities are non-negative), decided exactly, with
no binary floating-point step anywhere in the core. The largest legal
numerator is `98 × 50000 × 14400 = 70,560,000,000`, far below
`Number.MAX_SAFE_INTEGER`, so plain integer arithmetic in JavaScript is
exact.

Result object:

```json
{
  "rows": [
    { "activityId": "walking-moderate", "code": "17190", "met": "3.8", "kcal": 114 }
  ],
  "totalKcal": 114
}
```

- `rows` has one entry per selected activity, in input order. `met` is a
  string with exactly one decimal (`"6.0"`, never `6` or `"6.00"`); `code` is
  the §2.4 string; `kcal` is the rounded integer.
- `totalKcal` is the **sum of the rounded row values** in the result object
  and JSON report. In compare mode the rows are alternative activities for the
  same duration. The field is an arithmetic sum across those alternatives.
  Display the individual estimates and the compare note in §2.8. Omit an
  on-screen combined calorie value for compare mode.
- The result is **gross**: it includes the resting share (about 1 MET × kg ×
  hours) that the same body would have spent anyway, exactly as the
  Compendium formula defines it. §2.8's FAQ explains how to derive a net
  figure by hand; the result object carries no net field.
### 2.6 Worked examples (normative)

- `walking-moderate`, 60 kg, 30 min: `38 × 6000 × 300 = 68,400,000`;
  `68,400,000 / 600000 = 114` exactly → `114`.
- Compare at 70 kg, 60 min: brisk `48 × 7000 × 600 = 201,600,000 → 336`;
  jogging `75 × 7000 × 600 = 315,000,000 → 525`; bicycling moderate
  `80 × 7000 × 600 = 336,000,000 → 560`. The report field is
  `totalKcal = 336 + 525 + 560 = 1421`.
- Tie: elliptical 5.0 MET, 65 kg, 30 min: `50 × 6500 × 300 = 97,500,000`;
  quotient 162, remainder 300,000; `2 × 300,000 >= 600,000` → `163`.
- Fractional: swimming slow 5.8 MET, 62.5 kg, 45.5 min:
  `58 × 6250 × 455 = 164,937,500`; quotient 274, remainder 537,500;
  `2 × 537,500 >= 600,000` → `275`.
- Bounds: running 9.3 MET, 500 kg, 1440 min:
  `93 × 50000 × 14400 = 66,960,000,000 → 111,600`. Yoga 2.3 MET, 20 kg,
  1 min: `23 × 2000 × 10 = 460,000`; quotient 0, remainder 460,000;
  `2 × 460,000 >= 600,000` → `1`.

### 2.7 Validation order and errors

Errors are structured values `{ code, field, row }`. `field` is `weight`,
`durationMinutes`, `activities` or `null`; `row` is the 1-based index into
`activities` or `null`. Validation MUST evaluate in this order and return the
first failure only:

0. `SCHEMA` — input is not a plain object, has unknown or missing keys, a
   field has the wrong JSON type, or an `activities` element is not a string.
   `field` and `row` are `null`.
1. `weight`, in this order:
   - `INPUT_LIMIT` — raw string longer than 8 UTF-16 code units.
   - `UNICODE` — contains a lone surrogate.
   - `EMPTY` — the empty string.
   - `DECIMAL_FORMAT` — does not match the §2.2 grammar.
   - `RANGE` — parses but is outside 20–500 kg.
2. `durationMinutes`, in this order: `INPUT_LIMIT` (over 8 units),
   `UNICODE`, `EMPTY`, `DECIMAL_FORMAT` (§2.3 grammar), `RANGE` (outside
   1–1440 minutes).
3. `activities`, in this order:
   - `EMPTY` — the array has no elements; `row` is `null`.
   - `ROW_LIMIT` — the array has more than 3 elements; `row` is `4`. This
     array-level check runs before any element is examined.
   - Per element, in array order, with `row` set to its 1-based index:
     `INPUT_LIMIT` (over 32 UTF-16 code units), `UNICODE` (lone surrogate),
     `EMPTY` (empty string), `ENUM` (not one of the §2.4 ids,
     case-sensitive).
   - `DUPLICATE` — after every element passes, the first code that repeats
     an earlier one; `row` is the index of the repeat.

Notes:

- Because field order is pinned, an input with a bad weight and a bad
  activity reports the weight error; an input with four activities whose
  second element is unknown reports `ROW_LIMIT`, not `ENUM`.
- Errors are announced through a polite live region, associated with the
  offending control and cleared as specified in §4.3. On a current failure,
  move focus to the first invalid control. For an activity-array error, focus
  the indicated selected checkbox in selection order, or the first checkbox
  if there is no indicated control. For a fieldless error, focus the form
  error summary. A discarded delivery never moves focus or announces an error.
- The weight `123456789` fails `INPUT_LIMIT` (9 units) even though it would
  also fail range; the activity `"yoga\ud800"` fails `UNICODE` at row 1.

### 2.8 Visible content and microcopy

All visible strings exist in Traditional Chinese and English. The application
renders text with `textContent` or `value`; no user-derived string is ever
inserted as HTML.

Titles and descriptions:

- zh-Hant title: `運動熱量消耗計算`
- English title: `Calories Burned Calculator`
- zh-Hant description: `以 2024 年成人身體活動彙編的 MET 值，依體重與運動時間估算單次運動的總熱量消耗，最多同時比較三種活動。`
- English description: `Estimate gross calories burned in one exercise session from body weight, duration and MET values from the 2024 Adult Compendium of Physical Activities, comparing up to three activities.`

Form and result labels:

| Key | zh-Hant | en |
| --- | ------- | -- |
| Weight label | 體重（公斤） | Weight (kg) |
| Duration label | 運動時間（分鐘） | Duration (minutes) |
| Activities label | 活動（最多選 3 項比較） | Activities (choose up to 3 to compare) |
| Calculate action | 計算 | Calculate |
| Reset action | 重設 | Reset |
| Report action | 下載報告（JSON） | Download report (JSON) |
| Result heading | 估算消耗熱量 | Estimated calories burned |
| Gross note | 各列皆含休息代謝消耗 | Each estimate includes resting metabolism |
| Compare note | 每列是以相同體重與時間估算的一種運動選擇。請逐項比較熱量。 | Each row is an exercise option estimated at the same weight and duration. Compare the individual calorie estimates. |
| Empty status | 選好活動後即可計算。 | Choose an activity to calculate. |
| Dirty status | 輸入已變更，請重新計算。 | Inputs changed. Calculate again. |
| Busy status (when work remains pending) | 正在計算熱量。 | Calculating calories. |
| Cancel action (while work remains pending) | 取消計算 | Cancel calculation |
| Cancelled status | 已取消計算。可重新計算。 | Calculation cancelled. You can calculate again. |
| kcal unit | kcal | kcal |

Error strings (selected by `code` and `field`; the row-bearing messages add
the row number in the interface, not in the string):

| Code / field | zh-Hant | en |
| ------------ | ------- | -- |
| SCHEMA | 這份輸入的結構不正確，請重新輸入。 | This input is not shaped correctly. Please re-enter it. |
| INPUT_LIMIT / weight | 體重最多 8 個字元。 | Weight is limited to 8 characters. |
| INPUT_LIMIT / durationMinutes | 運動時間最多 8 個字元。 | Duration is limited to 8 characters. |
| INPUT_LIMIT / activities | 每個活動代碼最多 32 個字元。 | Each activity code is limited to 32 characters. |
| UNICODE | 輸入含有不完整的 Unicode 字元。 | The input contains an incomplete Unicode character. |
| EMPTY / weight | 請輸入體重。 | Enter your weight. |
| EMPTY / durationMinutes | 請輸入運動時間。 | Enter the duration. |
| EMPTY / activities | 請至少選擇一個活動。 | Choose at least one activity. |
| EMPTY / activities element | 活動代碼不可空白。 | An activity code must not be blank. |
| DECIMAL_FORMAT / weight | 體重需為數字，最多兩位小數（例如 62.5）。 | Weight must be a number with at most two decimal places (for example 62.5). |
| DECIMAL_FORMAT / durationMinutes | 時間需為數字，最多一位小數（例如 30 或 45.5）。 | Duration must be a number with at most one decimal place (for example 30 or 45.5). |
| RANGE / weight | 體重需介於 20–500 kg。 | Weight must be between 20 and 500 kg. |
| RANGE / durationMinutes | 時間需介於 1–1440 分鐘。 | Duration must be between 1 and 1440 minutes. |
| ROW_LIMIT / activities | 最多比較 3 個活動。 | At most 3 activities can be compared. |
| ENUM / activities | 未知的活動代碼。 | Unknown activity code. |
| DUPLICATE / activities | 同一活動不可重複選取。 | The same activity cannot be selected twice. |
| OUTPUT_LIMIT (report) | 報告超過 2 MiB 上限，無法下載。 | The report exceeds the 2 MiB limit and cannot be downloaded. |

Disclaimer (shown verbatim under the result and in the report page area; it
is a product string, not part of the result object):

- zh-Hant: `本工具的熱量為估算值：依 2024 年成人身體活動彙編（2024 Adult Compendium of Physical Activities）的 MET 值，以「MET × 體重（kg）× 時間（小時）」計算，為包含休息代謝的總消耗。實際消耗因個人代謝、動作效率與強度而異，本結果不作為醫療、減重或飲食處方。`
- en: `Calorie figures are estimates: they use MET values from the 2024 Adult Compendium of Physical Activities in the formula MET × weight (kg) × duration (hours) and are gross totals that include resting metabolism. Actual expenditure varies with individual metabolism, movement efficiency and intensity. This result is not medical, weight-loss or dietary advice.`

FAQ:

1. Q: 這個數字是怎麼算出來的？ / How is the number calculated?
   A: `熱量（kcal）＝ MET × 體重（kg）× 時間（小時）。MET 是活動強度相對於休息的倍數；本工具的 MET 值來自 2024 年成人身體活動彙編，公式中的 1 MET 依該彙編定義為每公斤每小時 1 kcal。` / `Calories (kcal) = MET × weight (kg) × duration (hours). A MET is the activity's intensity relative to rest; the MET values here come from the 2024 Adult Compendium of Physical Activities, which defines 1 MET as 1 kcal per kilogram per hour.`
2. Q: 這是總消耗還是淨消耗？ / Is this gross or net?
   A: `是總消耗，已包含同一段時間休息也會消耗的約 1 MET。若只想看活動本身的淨消耗，可用（MET − 1）× 體重 × 時間自行估算；本工具不提供切換。` / `It is gross: it includes the roughly 1 MET you would have spent resting in the same time. For an activity-only net figure, estimate (MET − 1) × weight × hours yourself; the tool has no toggle.`
3. Q: 為什麼和我的手錶或跑步機數字不一樣？ / Why does my watch or treadmill show a different number?
   A: `MET 值是 19–59 歲成人的群體平均，不同裝置用各自的感測與模型估算，個人代謝與動作效率也會造成差異；各方數字不同是預期內的。` / `MET values are population averages for adults aged 19 to 59. Devices estimate with their own sensors and models, and individual metabolism and movement efficiency differ, so disagreement between figures is expected.`
4. Q: MET 值是哪個版本？為什麼和別的網站不同？ / Which edition are the MET values from, and why do other sites differ?
   A: `本工具採用 2024 年版。2024 年版修訂了許多 2011 年版的數值（例如快走 4.3 → 4.8、哈達瑜伽 2.5 → 2.3），仍引用舊版的網站會算出不同的結果。` / `This tool uses the 2024 edition. The 2024 edition revised many 2011 values (for example brisk walking 4.3 → 4.8 and Hatha yoga 2.5 → 2.3), so sites still citing the older edition produce different results.`
5. Q: 比較報告的 `totalKcal` 代表什麼？ / What does `totalKcal` mean in a comparison report?
   A: `每列是一種運動選擇，以同一體重和完整時間估算。報告的 totalKcal 是這些替代選項的整數列值相加。請以個別列值判讀一次運動的估算消耗。` / `Each row estimates one exercise option at the same weight and full duration. The report's totalKcal is the arithmetic sum of those rounded alternatives. Use an individual row for the estimated expenditure of one session.`

## 3. Determinism and acceptance fixtures

### 3.1 Determinism contract

- The calculation is a pure function of the input object. It reads no clock,
  no random source, no locale, no timezone, no storage and no network.
- All arithmetic after parsing is integer arithmetic (§2.5); parsing itself
  converts decimal digit strings to integers without binary floating point.
- The same input always produces a structurally identical result object.
  The same accepted input and result produce the same report bytes (§3.3).
  Equivalent numeric strings such as `60` and `60.0` retain their own raw
  forms in the report.

### 3.2 Fixture format

`fixtures.json` is an array of test cases. Success cases carry `input` and
`expected` (the exact result object of §2.5). Failure cases carry `input` and
`expectedError` (`{ code, field, row }`). Controller cases carry
`kind: "controller"`, `initialInput`, `expectedInitial` (§4.3 snapshot), and
ordered `steps`. Each step contains an event and an exact
`expected` snapshot after that event. A `deliver` step provides a literal
`result` or `error` and an `epoch`. Every `download` step has a literal `expectedDownload` with the filename
and UTF-8 text, or `null` when no file is produced.
A scripted adapter holds deliveries until their listed step and assigns
predictable fake URL tokens `blob:fixture/1`, `blob:fixture/2`, etc.

The shipped fixtures cover: a single-activity baseline; a three-activity
comparison; an exact half-up tie; fractional weight and duration; both range
bounds at their extremes; a rounding-down case; input-order preservation in
compare mode; every pinned core error code (`INPUT_LIMIT`,
`EMPTY`, `DECIMAL_FORMAT`, `RANGE`, `ROW_LIMIT`, `ENUM`, `DUPLICATE`,
`UNICODE`, `SCHEMA`); and the three standard controller cases. Expected
core values are the original literals derived from §2 by hand. The §4.3
controller expectations are literal test inputs for an independent reviewer.
Tests MUST compare against those values directly.

### 3.3 Report download (deterministic bytes)

The report action downloads `calories-burned-report.json`, a canonical JSON
encoding of `{ tool, version: 1, weight, durationMinutes, activities, rows,
totalKcal }` where `weight` and `durationMinutes` are the accepted raw input
strings and `activities` is the accepted ordered activity ID array. The accepted input and result
come from the same current successful epoch (§4.3). `totalKcal` has the
arithmetic meaning described in §§2.5 and 2.8. Canonical form uses object
keys sorted by UTF-16 code unit at every level, arrays kept in order, no
insignificant whitespace, exactly the strings and integers of the result (no
floats), UTF-8 without BOM, one trailing LF. If the encoded bytes exceed
2 MiB (`OUTPUT_LIMIT`, §2.8) the download is refused with the pinned message
and no partial file is produced. Example for fixture 1 (final LF not shown):

```json
{"activities":["walking-moderate"],"durationMinutes":"30","rows":[{"activityId":"walking-moderate","code":"17190","kcal":114,"met":"3.8"}],"tool":"calories-burned-calculator","totalKcal":114,"version":1,"weight":"60"}
```

Fixture 2 comparison report (final LF omitted from the display):

```json
{"activities":["walking-brisk","jogging-general","bicycling-moderate"],"durationMinutes":"60","rows":[{"activityId":"walking-brisk","code":"17200","kcal":336,"met":"4.8"},{"activityId":"jogging-general","code":"12020","kcal":525,"met":"7.5"},{"activityId":"bicycling-moderate","code":"01030","kcal":560,"met":"8.0"}],"tool":"calories-burned-calculator","totalKcal":1421,"version":1,"weight":"70"}
```

## 4. Implementation plan

### 4.1 Files and module split

- `tools/calories-burned-calculator/package.json` — standard tool scripts.
- `public/index.html`, `public/en/index.html` — bilingual pages with the full
  form, table note, disclaimer and FAQ rendered statically.
- `public/js/core/table.mjs` — the §2.4 table as literal data (id, code,
  metTenths, both names), single-sourced: the selector and the core read the
  same module the tests compare against §2.4.
- `public/js/core/calculate.mjs` — pure validation (§2.7) and computation
  (§2.5); no DOM, no imports beyond the table module.
- `public/js/core/report.mjs` — canonical JSON encoding and the size cap.
- `public/js/app.js` — DOM wiring, activity multi-select (checkbox list, so
  keyboard and screen-reader operation are native), state handling per §4.3,
  error announcement and focus management, report download.
- `public/styles/calories-burned-calculator.css` — layout, focus visibility,
  error styling, reduced-motion and forced-colour support.
- `scripts/build.mjs`, `scripts/check.mjs`, `scripts/serve.mjs` — standard
  tool scripts.
- `test/*.test.mjs` — §5 suites.

### 4.2 Rendering and state

Use the [Tool Design Baseline](../../TOOL-DESIGN-BASELINE.md) Product App mode.
Put the form and Calculate first, with the result table and report action
adjacent. On compact screens stack the form and result, allowing an essential
table to scroll inside its own labelled region. Keep weight and duration
labels visible while typing. The 14 native activity checkboxes are listed in
§2.4 order. Track selection order separately and append a reselected activity
at the end. A fourth checked activity stays selected and returns `ROW_LIMIT`
on Calculate. The maximum is stated before interaction.

Show result rows with activity, MET and estimated kcal. Use the gross note and
verbatim disclaimer below the rows. In compare mode add the compare note next
to the table. A single-mode row already displays its estimate. Neither mode
needs a sum row. The report action is disabled outside current success, and
the event handler also enforces that condition.

### 4.3 Controller transitions and report lifetime

Each controller keeps the editable draft, a monotonically increasing epoch
(initially 0), at most one pending `{epoch, input}`, and at most one accepted
`{epoch, input, result}`. The latter two records capture independent
snapshots of the raw fields and ordered activity array. Initial state is
`empty` with the factory default, no result, no error and no active job.
Fields remain editable during busy. The actual calculation is synchronous.
The controller still uses start/deliver boundaries so tests can defer
completion. Expose Cancel and the busy status only while work remains pending
across an interaction boundary.

| Event | Preconditions and transition |
| --- | --- |
| `edit` | While active, replace the named draft field with the supplied raw value (the entire ordered array for activities). Advance the epoch, discard pending and accepted records, clear current errors, revoke any outstanding URL and enter `dirty`. Editing back to the old input still requires Calculate. |
| `start` | While active, advance the epoch, revoke any outstanding URL, clear results and errors, capture the current draft as the sole pending job and enter `busy`. A new start supersedes any pending job. |
| `deliver` | Accept either one result or one structured error only when the page is active, state is `busy`, and delivery epoch equals both pending epoch and current epoch. Clear the pending record. On result, accept the captured input/result and enter `success`. On error, keep the draft, clear any accepted result and enter `error`, announcing and focusing per §2.7. Any other delivery is ignored, including duplicates after completion and late successes or errors. |
| `cancel` | While busy, advance the epoch, discard pending and accepted records, clear errors, revoke any outstanding URL and enter `cancelled`. Preserve the draft. Cancel in any other state is a no-op. |
| `reset` | While active, advance the epoch and perform the reset in §4.4. |
| `pagehide` | If active, advance the epoch, mark the page inactive and perform the clearing and factory-default restoration in §4.4 without moving focus. Do this even if the browser caches the document. |
| `pageshow` | An inactive BFCache document becomes active in `empty`. Reapply defaults to the form, including restored DOM form values, and render the cleared state. Keep the post-hide epoch and do not start work or move focus. A normal new document initializes a new controller. A pageshow on an already active controller is a no-op. |
| `download` | Require current `success`, active page and an accepted epoch equal to the current epoch. Encode from the accepted snapshot per §3.3. Otherwise ignore the request with no file, URL or state change. |
| `cleanup` | Revoke only the outstanding URL that matches the scheduled callback's URL token. If the token has already been revoked or replaced, this callback has no effect. |

Only `success` has a visible result or enables the report. Every other state
removes the old numbers from the DOM and accessibility tree immediately.
Only `error` shows the current calculation error. Clear that error and its
field association on edit, start, reset or pagehide. The draft is preserved
for recovery from error and cancellation. While inactive, calculation, edit,
download, reset, cancel and delivery events are ignored. A delayed cleanup
may run but has no outstanding URL to revoke.

Download runs only on an explicit user action. After encoding, revoke any
previous outstanding URL, create a Blob with media type `application/json`,
create its object URL, activate a temporary download link and remove the
link. Keep the URL through that dispatch, then schedule revocation in the
next task. Invalidation transitions revoke and clear the URL immediately
if they run before its scheduled cleanup. Repeated downloads use distinct
URLs. An encoder size refusal displays the §2.8 report error without
creating a new URL or a partial file. The current calculation stays in
`success` and the report action can be retried. Clear report feedback on
the next attempt or when invalidating the accepted snapshot.

A fixture snapshot has the exact properties `state`, `active`, `epoch`,
`pendingEpoch`, `draft`, `result`, `error`, `reportAvailable`,
`liveUrl` and `revokedUrls`. Here `result` and `error` mean current
visible values, and `revokedUrls` is the test adapter's cumulative ordered
list of actual revocations. Missing pending job, result, error or URL is
`null`. The tester records the scheduled callback's token as
`cleanup.url`. Test URL identifiers and the revocation log belong to the
adapter only.

### 4.4 Reset and privacy

Reset restores the factory default
`{ "weight": "60", "durationMinutes": "30", "activities": ["walking-moderate"] }`,
revokes any outstanding URL, clears the pending job, accepted snapshot and
errors, and enters `empty`. User Reset returns focus to the weight field.
The lifecycle reset in §4.3 applies the same data clearing without changing
focus. Drafts, results, errors and URLs exist only in page memory. Use
`autocomplete="off"` for the form, write neither draft nor result to browser
storage, history state, URL parameters, network payloads, logs or clipboard,
and explicitly re-render the default fields on BFCache restore.

## 5. Toolchain and test plan

### 5.1 Commands and artifacts

Run from `tools/calories-burned-calculator/` using Node.js 24.x and its npm.
Use ESM (`"type": "module"`, `engines.node: "24.x"`) and Node built-ins.
The app has zero runtime dependencies. Builds and tests require no install,
package download, network request or real visitor data. Read the fixed
[implementation checklist](../../IMPLEMENTATION-CHECKLIST.md) and
[agent handbook](../../AGENT-HANDBOOK.md) for the shared workflow.

| Command | Required contract |
| --- | --- |
| `node --version` | Record the exact 24.x version in VERIFICATION.md. |
| `npm run test` | Run `node --test`. Include all 20 core and three controller fixtures plus the suites below. |
| `npm run check` | Run `node scripts/check.mjs` for source syntax, bilingual copy parity and local-only DOM, asset and data handling rules. |
| `npm run build:preview` | Run `node scripts/build.mjs --preview`. Write `dist/` with `index.html`, `en/index.html`, local JS/CSS assets and a disallow-all `robots.txt`. Both pages carry `noindex` and preview metadata. |
| `npm run check:generated:preview` | Run `node scripts/check.mjs --generated --preview`. Validate the generated routes, asset references, metadata and robots policy. Build twice into isolated scratch output directories and compare the sorted relative file list, byte counts and SHA-256 hashes of every file. Compare with `dist/`; fail on any difference. |
| `npm run serve -- --port 4173` | Run `node scripts/serve.mjs --port 4173`. Serve only `dist/` at `127.0.0.1:4173`. Fail if the port is unavailable, and use another free task-owned port if necessary. No browser opens automatically. |

The build defaults to preview origin `http://127.0.0.1:4173`. If a different
port is needed for verification, `build:preview` and
`check:generated:preview` both accept `--origin http://127.0.0.1:<port>` as
appended npm script arguments. Both locale pages use that origin for their
self-canonical and reciprocal alternate URLs (`/`, `/en/`, `x-default`
pointing to `/`). A reviewer can fetch `/`, `/en/`, `/robots.txt`,
one script, one stylesheet and a nonexistent path against the loopback
server. Expect 200 and correct MIME for existing files, and 404 for the
nonexistent path. Stop only the server instance started for this check.

### 5.2 Offline suites

1. **Fixtures.** Deep-equal the 20 core outcomes and the three controller
   scenarios from `fixtures.json` using literal expectations. Execute and
   assert all controller steps, including expected file output/refusal and
   revocation sequences. Validate simulated delivery payloads against their
   captured input so stale tests cannot pass with implausible payloads.
2. **Table integrity.** Compare all 14 table records to §2.4, including both
   names, order, IDs, string codes with leading zeroes, and MET tenths.
3. **Arithmetic cross-check.** Compare the integer rule with independent
   exact-rational evaluation of `MET × kg × minutes / 60` on weights
   (20, 20.01, 55.55, 62.5, 99.99, 250, 500), durations (1, 1.5, 30, 45.5,
   719.9, 1440) and all 14 activities. Include exact ties at several
   scales and assert half-up rounding.
4. **Validation order.** Use multi-defect inputs to assert schema before
   fields, weight before duration before activities, capacity before grammar
   before range, `ROW_LIMIT` before per-element checks, per-element checks
   before `DUPLICATE`, and first failure only.
5. **Report.** Assert literal canonical bytes for fixtures 1 and 2 and
   stability across repeated encodes. Verify UTF-8 without BOM and a single
   LF terminator. Exercise `OUTPUT_LIMIT` with a synthetic oversized value
   or a smaller injected encoder limit. Assert no Blob URL or file is created
   on refusal and current calculation success remains usable.
6. **State and focus.** In addition to the three scripted scenarios, probe
   a second start on the same draft while busy and a pagehide while busy.
   Check that the pending epoch is superseded and only the latest valid
   delivery can be accepted. Check the error association, focus rules, and
   default restoration. Assertions about a DOM adapter are unit evidence.
7. **Source and build.** Save the command outputs and two-build SHA-256
   manifests from §5.1, including bilingual copy parity, exact disclaimer,
   previews, metadata, and all emitted assets. Root homepage tests are
   outside this tool's verification.

### 5.3 Product browser verification

Use a clean test profile in a verified isolated browser. Record candidate
commit, browser version, OS, viewport or device, locale, time and action/result
for each run. Exercise Windows Chrome and Edge on desktop and a touch
viewport. Record physical-device and assistive-technology checks separately
with the actual hardware and software used. Use the same fixtures in both
locales. Where required isolation or equipment is unavailable, record
`NOT_RUN` with the actual limitation. For user desktop focus restrictions,
record `NOT_RUN_USER_FOCUS_INCIDENT`. Do not invoke native save, file-picker
or print dialogs.

- **Flow and download.** Calculate the 114 kcal baseline and the three-row
  comparison in fixture 2. Observe individual estimates, disclaimer and no
  compare total in the main result. Capture a report via the isolated
  browser's download API or its managed download directory. Verify the
  suggested filename, MIME at Blob construction and exact file bytes against
  the literal fixture report. After editing, pressing Calculate with invalid
  input, and resetting, observe the old numbers removed, disabled Download
  and no download event. Run again and repeat. Capture download and URL
  creation/revocation with browser-side instrumentation in the test context,
  including one successful download, immediate invalidation and normal
  scheduled cleanup. No instrumentation ships in the app.
- **Lifecycle.** In the isolated browser, enter a distinctive fake draft
  and generate a report, navigate to a task-owned page on the preview
  origin, and use Back. Capture `pagehide` and `pageshow.persisted` and
  observe defaults, empty result, no error, disabled Download and no live
  report URL. Report BFCache verification only if persisted is true. Record
  a reload result separately.
- **Network and storage.** In both locales record Network requests with
  preservation enabled and inspect storage before entering fake inputs and
  again after edit, calculate, error, download, reset, pagehide and Back.
  Initial same-origin static assets are expected. Check URLs, methods,
  bodies and headers for unexpected traffic, including same-origin RUM,
  analytics, beacons, fonts and third-party calls. Verify actions transmit
  no input or result data and trigger no HTTP requests beyond navigation
  and its static resources. Check cookies, local/session storage, IndexedDB,
  Cache Storage and service workers for app writes. Keep the public-release
  repeat check separate from the loopback capture.
- **Keyboard, focus and status.** Complete single and compare flows by
  Tab, Shift+Tab, Space and Enter. Observe labels, checkbox and result
  table semantics, non-colour status, and visible unobscured focus. Trigger
  a weight error and a fourth activity error, check error announcement and
  focus, edit to clear the error, recalculate and reset. In a real
  screen-reader pass record the browser, reader and announcement actually
  heard. Exercise forced colours and reduced motion in a test context.
- **Viewport, zoom, contrast and touch.** At a measured 320 CSS px layout
  width in each locale, complete the form and review errors/results. Record
  `document.documentElement.clientWidth` and `scrollWidth` with no
  page-level horizontal overflow. Any essential table overflow stays inside
  its labelled region. Separately set the actual browser page zoom to
  **200%** using an authorized isolated browser control, capture the reported
  zoom and viewport, then complete the same flow without clipping or loss
  of controls. CSS transforms and viewport resizing do not measure browser
  zoom. Measure contrast on rendered foreground/background pairs
  (4.5:1 normal text, 3:1 large text and required control boundaries).
  Record CSS target sizes (44×44 for primary and touch controls, 24×24
  WCAG minimum unless a documented exception applies), tap the labelled
  checkboxes and actions, and check the mobile keyboard leaves the focused
  input and Calculate reachable.

## 6. Acceptance aspects

The nine product aspects are predeclared for independent review of one fixed
product candidate. Use [Review and Release](../../REVIEW-AND-RELEASE.md) for
the shared process and record the observed result and evidence for each
aspect. Each required aspect must score at least 90 and all necessary checks
must be executed. For this specification-only candidate, **all product
execution and product review are NOT_RUN**.

| Aspect | What must be shown |
| ------ | ------------------ |
| functionality | All §5.2 fixture and state suites and the §5.3 flow pass. Reports preserve the accepted raw input, rows and arithmetic sum. No stale or superseded output can be downloaded. |
| boundaries | §5.2 demonstrates exact range limits, UTF-16 limits, 3-vs-4, duplicate and unknown codes, all precedence cases, tie rounding and report refusal. |
| privacy | §5.3 Network/Storage capture in both locales shows static loads only, local report generation, no persistence of visitor data and lifecycle clearing on reload or verified BFCache return. |
| security | §5.1 source and §5.2 tests verify exact schema, table allowlisting, safe textContent/value sinks, canonical JSON key allowlist and local bounded Blob generation. Check that invalid/late events cannot create links or restore stale data. |
| usability | §5.3 shows up-front selection limit, error recovery, comparison as individual alternatives, report action adjacent to current result, no combined compare number, and the disclaimer near the results. |
| accessibility | §5.3 records keyboard, visible focus, errors and announcements, table structure, both 320 CSS px layouts, real 200% zoom, contrast, touch sizes, reduced motion and forced colours. Record the real screen-reader check separately. |
| localization-seo | §5.1 and §5.3 show bilingual copy and metadata, locale links and same-language homepage links, preview noindex and robots, self-canonicals, reciprocal alternates and x-default. Production SEO is a separate release check. |
| toolchain-provenance | §5.1 shows Node 24, zero runtime dependencies and two byte-identical builds. §5.2 checks the table against §2.4 and the fixed [source evidence](AUTHOR-CHECK.md) and [provenance recheck](PROVENANCE-RECHECK.md). |
| compatibility | §5.1 loopback HTTP and §5.3 record Chrome and Edge versions, both locales and mobile/touch behaviour. Run the core suite with two process-local `TZ` values and compare exact results. The preview works as static files with no backend. |

## 7. Risks, estimates and disclaimer

- **Edition drift is the top risk.** Most calorie calculators on the web
  still publish 2011 Compendium values (brisk walking 4.3, jogging 7.0,
  running 6 mph 9.8, Hatha yoga 2.5). This spec deliberately pins the 2024
  edition; a reviewer comparing against a 2011-based site will see
  differences that are correct behaviour, and FAQ 4 pre-empts the question
  for visitors.
- **Formula variants.** Some sources compute `MET × 3.5 × kg × minutes /
  200` (the oxygen form), which yields values about 5% higher than the
  Compendium's own kcal definition (`MET × kg × hours`). The spec pins the
  definition form; the BRIEF records the decision so a future editor does
  not "fix" it.
- **Gross vs net misreading.** Visitors comparing against net figures from
  other tools will see higher numbers here. The gross note sits next to the
  row estimates, the disclaimer states it, and FAQ 2 gives the net derivation.
- **Compare-total misreading.** The comparison shows alternatives at equal
  duration. The table shows only the individual estimates, with the meaning
  of the report's arithmetic sum explained in FAQ 5.
- **Population limits.** The values are averages for adults 19–59; children,
  older adults (covered by the separate Older Adult Compendium) and
  individuals with atypical metabolism fall outside them. The disclaimer
  covers this; the tool offers no age input and no adjusted mode.
- **Estimate disclaimer.** The pinned bilingual disclaimer in §2.8 appears
  verbatim wherever a result is shown. It is product copy required by this
  section, and removing or softening it is a specification change, not an
  editorial choice.

## 8. Milestones, stop conditions and handoff

1. **Document.** Review this fixed SPEC, literal fixtures and provenance
   as a package. Preserve the original author and ownership. Independent
   document review precedes ready inventory.
2. **Implement.** With the production claim and fixed spec, finish the core,
   bilingual form, state controller, report and §5.1–5.2 checks in the
   tool's own directory and branch.
3. **Verify and submit.** Run §5.3 in authorized isolation. Fix failures
   under the owning task and rerun affected checks. If a necessary test
   cannot run, save its reason, current evidence and the resume condition.
   Submit a fixed candidate commit and open PR for independent review.
4. **Release.** The primary coordinator owns accepted-candidate integration,
   deployment authority, production origin, HTTPS/SEO/privacy verification,
   bilingual homepage and external handoff under the shared release rules.
   Keep preview source, product acceptance, deployment and external review
   as distinct recorded milestones.

The implementation handoff MUST include:

- task and spec IDs, claim and owner, fixed source and candidate commits,
  exact PR head and allowed/actual paths;
- `VERIFICATION.md` listing each §5 command with environment, exit status,
  suite counts, actual outputs, and both build SHA-256 manifests;
- controller results for every literal step, all 20 core cases, and the
  comparison report and revocation evidence;
- §5.3 evidence for both locales and all applicable browser environments.
  Every required check includes its result, or NOT_RUN with the reason and
  what would unblock it;
- traceability of each of the 14 implementation rows to §2.4 and the fixed
  primary-source evidence, and explicit status for each §6 aspect;
- the checkpoint, pending decisions and next responsible actor if work stops.

The specification package retains the original authorship evidence in
[AUTHOR-CHECK.md](AUTHOR-CHECK.md). The maintenance repair resolves
[FH-QC-A-03](https://github.com/KYStr/glossquote-labs-home/blob/4a838d688e60356de444e44212950f5306980b3d/docs/reviews/five-hour-2026-11-11/astra/FINDINGS-INITIAL.md#L23-L30)
against fixed PR 283 commit `448bd9fc9865fe65f6014b66f4a2e2d54b76f539`.
The repair handoff records document-only checks and the exact diff separately.

## 2026-11-10 維護覆核補記

[本輪來源覆核](PROVENANCE-RECHECK.md) 補充原先未直接取得的來源；其範圍不等於完整規格或產品驗收，原作者歷史證據保留。

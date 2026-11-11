# Calories Burned Calculator Specification

Status: implementation-ready specification. The normative behaviour is defined
by §§2–4; §1 explains intent, §5 defines tests, §6 predeclares acceptance, §7
records risks and §8 defines handoff evidence.

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
- Exact integer arithmetic with one pinned rounding per row (§2.5) and a total
  defined as the sum of the rounded rows.
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
and reproduce the displayed rows and total exactly; the displayed table is
byte-identical in content to §2.4; every fixture in `fixtures.json` passes
from its literal expected values; and the report download is byte-stable for
identical results.

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
- `activities`: an array of activity-code strings from §2.4, in the order the
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
The selected codes are matched case-sensitively; `Walking-Moderate` is an
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
- `totalKcal` is the **sum of the rounded row values**, so the displayed rows
  always add up to the displayed total. In compare mode the total means "the
  sum if you did each activity for the full duration"; the FAQ states this,
  so the total is never misread as a split session.
- The result is **gross**: it includes the resting share (about 1 MET × kg ×
  hours) that the same body would have spent anyway, exactly as the
  Compendium formula defines it. §2.8's FAQ explains how to derive a net
  figure by hand; the result object carries no net field.
### 2.6 Worked examples (normative)

- `walking-moderate`, 60 kg, 30 min: `38 × 6000 × 300 = 68,400,000`;
  `68,400,000 / 600000 = 114` exactly → `114`.
- Compare at 70 kg, 60 min: brisk `48 × 7000 × 600 = 201,600,000 → 336`;
  jogging `75 × 7000 × 600 = 315,000,000 → 525`; bicycling moderate
  `80 × 7000 × 600 = 336,000,000 → 560`; total `336 + 525 + 560 = 1421`.
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
- Errors are announced politely (`role="alert"` or an equivalent live
  region), associated with the offending control, and focus moves to the
  first invalid control. Correcting a field and re-running replaces the error
  completely; no stale error text survives.
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
| Total label | 合計 | Total |
| Gross note | 以上為總消耗（含休息代謝） | Gross totals (including resting metabolism) |
| kcal unit | kcal | kcal |

Error strings (selected by `code` and `field`; the row-bearing messages add
the row number in the interface, not in the string):

| Code / field | zh-Hant | en |
| ------------ | ------- | -- |
| SCHEMA | 這份輸入的結構不正確，請重新輸入。 | This input is not shaped correctly. Please re-enter it. |
| INPUT_LIMIT / weight | 體重最多 8 個字元。 | Weight is limited to 8 characters. |
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
5. Q: 比較模式的合計是什麼意思？ / What does the total mean in compare mode?
   A: `每一列都以同一個體重與完整時間計算；合計是各列的相加，表示「每項都做滿該時間」的總和，不是把時間分配給各活動。` / `Each row uses the same weight and the full duration; the total is the sum of the rows, meaning "each activity done for the full time", not a session split between them.`

## 3. Determinism and acceptance fixtures

### 3.1 Determinism contract

- The calculation is a pure function of the input object. It reads no clock,
  no random source, no locale, no timezone, no storage and no network.
- All arithmetic after parsing is integer arithmetic (§2.5); parsing itself
  converts decimal digit strings to integers without binary floating point.
- The same input always produces a structurally identical result object, and
  the same result always produces the same report bytes (§3.3).

### 3.2 Fixture format

`fixtures.json` is an array of test cases. Success cases carry `input` and
`expected` (the exact result object of §2.5). Failure cases carry `input` and
`expectedError` (`{ code, field, row }`). Controller cases carry
`kind: "controller"`, `initialInput`, an optional `lateResult`, and `steps`;
they test the UI state rules of §4.3, not the core.

The shipped fixtures cover: a single-activity baseline; a three-activity
comparison; an exact half-up tie; fractional weight and duration; both range
bounds at their extremes; a rounding-down case; input-order preservation in
compare mode; every pinned error code reachable from the form (`INPUT_LIMIT`,
`EMPTY`, `DECIMAL_FORMAT`, `RANGE`, `ROW_LIMIT`, `ENUM`, `DUPLICATE`,
`UNICODE`, `SCHEMA`); and the three standard controller cases. Expected
values are literals derived from §2 by hand and independently recalculated;
they are never generated from implementation output.

### 3.3 Report download (deterministic bytes)

The report action downloads `calories-burned-report.json`, a canonical JSON
encoding of `{ tool, version: 1, weight, durationMinutes, activities, rows,
totalKcal }` where `weight` and `durationMinutes` are the accepted raw input
strings and `activities` is the accepted code array. Canonical form: object
keys sorted by UTF-16 code unit at every level, arrays kept in order, no
insignificant whitespace, exactly the strings and integers of the result (no
floats), UTF-8 without BOM, one trailing LF. If the encoded bytes exceed
2 MiB (`OUTPUT_LIMIT`, §2.8) the download is refused with the pinned message
and no partial file is produced. Example for fixture 1 (final LF not shown):

```json
{"activities":["walking-moderate"],"durationMinutes":"30","rows":[{"activityId":"walking-moderate","code":"17190","kcal":114,"met":"3.8"}],"tool":"calories-burned-calculator","totalKcal":114,"version":1,"weight":"60"}
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

- The app keeps the current input strings and selection, the last accepted
  result and the last error as separate state; editing any control after a
  result marks the result stale visually but never mutates it, and editing
  after an error keeps the error until the next run (mirroring the fixture
  controller cases).
- Activity selection is a group of 14 checkboxes in §2.4 order. Checking a
  fourth box does not silently uncheck another: the run reports `ROW_LIMIT`,
  and the label text states the maximum before any interaction.
- Rows render as a table with activity name, MET and kcal columns; the total
  renders in the table footer with the Total label and the gross note.

### 4.3 Late and stale work

Calculation is synchronous and effectively instant, but the controller
contract is still pinned: a computation cycle captures the input at start;
if the visitor edits, resets or starts a new cycle before a pending cycle's
result is delivered, the late result MUST NOT replace the visible state
(fixtures `state-cancel-late`, `state-replace-late`), and re-running with a
now-invalid edit shows the new error while the previous result remains the
last accepted one (`state-dirty-error`).

### 4.4 Reset

Reset restores the factory default input
`{ "weight": "60", "durationMinutes": "30", "activities": ["walking-moderate"] }`,
clears the result and any error, and returns focus to the weight field.

## 5. Test plan

All suites run with the repository's Node test setup; every test names the
rule or fixture it proves.

1. **Fixture suite** — every case in `fixtures.json` executed literally:
   deep-equal on the result object for successes, exact `{ code, field,
   row }` equality for failures, and the §4.3 step semantics for the three
   controller cases.
2. **Table integrity suite** — the implementation's table module equals
   §2.4 exactly: 14 rows, same order, same ids, codes (as strings, leading
   zeroes intact) and MET tenths; a 2011 value anywhere in the table fails
   this suite.
3. **Arithmetic cross-check** — for a deterministic grid of weights
   (20, 20.01, 55.55, 62.5, 99.99, 250, 500), durations (1, 1.5, 30, 45.5,
   719.9, 1440) and all 14 activities, the integer rule of §2.5 is compared
   against an independent exact-rational evaluation of
   `MET × kg × minutes / 60` with half-up rounding; any mismatch fails.
   Boundary probes include exact ties (fractional part exactly 0.5) at
   several scales.
4. **Validation-order suite** — multi-defect inputs prove the §2.7 order:
   schema before fields, weight before duration before activities, capacity
   before grammar before range, `ROW_LIMIT` before element checks, element
   checks before `DUPLICATE`, and first-failure-only reporting.
5. **Report suite** — canonical bytes for fixtures 1 and 2 (key order, no
   floats, one trailing LF), stability across repeated generation, and the
   `OUTPUT_LIMIT` refusal path (exercised through the encoder's limit
   parameter with a synthetic oversized result, since legal inputs cannot
   reach 2 MiB).
6. **State suite** — reset restores the §4.4 default exactly; editing after
   success or error behaves per §4.2; late results never overwrite newer
   state.
7. **Static suites** — `check.mjs`: bilingual key parity for every §2.8
   string, disclaimer present verbatim on both pages, no
   `localStorage`/network calls in the core, build reproducibility (two
   builds byte-identical), and preview metadata (noindex, canonical,
   hreflang) per the handbook.

## 6. Acceptance aspects

The reviewer scores the same fixed candidate against these predeclared
product aspects; every aspect must reach the repository's acceptance
threshold with evidence, and untested checks remain NOT_RUN rather than
passing by default.

| Aspect | What must be shown |
| ------ | ------------------ |
| functionality | Every fixture passes literally; single and compare modes, the tie rule, the sum-of-rounded-rows total and the report download all behave as §§2–3 pin them. |
| boundaries | Range extremes (20/500 kg, 1/1440 min), capacity limits (8/32 units), 3-vs-4 activities, duplicate and unknown codes, and multi-defect inputs all resolve exactly per §2.7. |
| privacy | No weight, selection or result leaves the device: no network calls, no storage, no analytics; the report is generated locally. |
| security | User-derived strings reach the DOM only via `textContent`/`value`; activity codes are matched against the pinned table, never evaluated; the report encoder cannot emit non-canonical or injected keys. |
| usability | The 3-activity maximum is stated before interaction; gross-vs-net and the compare-total meaning are explained where the numbers appear; errors name the field and the fix. |
| accessibility | Native checkboxes and inputs, visible focus, errors announced via a live region and moved to focus, results readable as a table, reduced-motion and forced-colour support. |
| localization-seo | Both locales carry every §2.8 string verbatim including the disclaimer and FAQ; activity names exist in both languages; preview metadata follows the handbook (noindex, canonical, hreflang). |
| toolchain-provenance | Every MET value traces to the 2024 Adult Compendium row named in §2.4 (edition, code, retrieval recorded in AUTHOR-CHECK.md); the build uses only the repository's standard scripts and produces byte-identical output. |
| compatibility | Core behaviour is identical across supported browsers and host timezones (no clock, locale or timezone input); the tool works from the static preview without any backend. |

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
  total, the disclaimer states it, and FAQ 2 gives the net derivation.
- **Compare-total misreading.** The total assumes each compared activity is
  performed for the full duration; FAQ 5 states this at the point of use.
- **Population limits.** The values are averages for adults 19–59; children,
  older adults (covered by the separate Older Adult Compendium) and
  individuals with atypical metabolism fall outside them. The disclaimer
  covers this; the tool offers no age input and no adjusted mode.
- **Estimate disclaimer.** The pinned bilingual disclaimer in §2.8 appears
  verbatim wherever a result is shown. It is product copy required by this
  section, and removing or softening it is a specification change, not an
  editorial choice.

## 8. Handoff and evidence

The implementation handoff MUST include:

- the fixed candidate commit and the pull request for `tools/calories-burned-calculator/`;
- `VERIFICATION.md` reporting each §5 suite by name with pass/fail counts,
  the Node version used, and the two-build byte-identity check;
- the fixture run output showing all cases in `fixtures.json` passing from
  their literal expected values, including the three controller cases;
- a screenshot or text capture of both locales showing a compare-mode result,
  the gross note and the disclaimer;
- an explicit NOT_RUN list for anything not executed (for example a real
  screen-reader pass), with the reason;
- a statement that the shipped activity table was diffed against §2.4 of
  this specification and against the 2024 Adult Compendium category lists,
  naming any discrepancy found (none is acceptable in the table itself).

Authorship evidence for this specification package (sources, both fixture
derivations and corrections to the original concept note) lives in
`AUTHOR-CHECK.md` alongside this file.

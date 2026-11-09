# Cron 表達式解說 · Cron Expression Explainer

解說標準五欄位 Vixie/POSIX cron 的工具：逐欄白話說明、整體排程一句話、
下 10 次執行時間（本地時區，標明時區），外加與文字雙向同步的欄位建構器。
日期／星期的 OR 規則會在解說中特別點明；Quartz 的 ?、L、W、# 與秒／年
欄位是具名錯誤，不會被默默當成 cron 讀。零 runtime 依賴、不連網、不儲存。

An explainer for standard five-field Vixie/POSIX cron: per-field prose, a
one-sentence summary of the whole schedule, the next ten firing times in
your local timezone (named on the page), and a field builder synced with
the text in both directions. The day-of-month/day-of-week OR rule is called
out in the explanation; Quartz tokens (?, L, W, #) and seconds/year fields
are named errors, never silently read as cron. Zero runtime dependencies,
no network, no storage.

## 功能 · Features

- 語法（規格 §4）：清單、範圍、步進與名稱（JAN–DEC、SUN–SAT，不分大小寫）；
  星期 0 與 7 都是星期日（7 正規化為 0）；`a/n` 依 Vixie 語意展開為
  `a-max/n`，並在說明中點明；7 個 @ macros 輸入後立即展開顯示
  Grammar (SPEC section 4): lists, ranges, steps and names (JAN–DEC,
  SUN–SAT, case-insensitive); weekday 0 and 7 are both Sunday (7
  normalises to 0); `a/n` expands Vixie-style to `a-max/n` and the help
  says so; the seven @ macros expand visibly as soon as they are entered
- 日期比對規則（最常被弄錯的一條）：欄位是否「starred」看文字是否以
  `*` 開頭（`*/2` 也算）；日期與星期都受限時是 OR（任一符合即執行），
  其他情況是 AND（各自依其值集合比對）——測試含完整 16 行真值表
  Day matching (the rule most tools get wrong): a field is "starred"
  when its text begins with `*` (`*/2` counts); when both day fields are
  restricted the rule is OR, in every other case AND, each field matching
  by its value set — the tests carry the full 16-row truth table
- 列舉：從起始時間之後的第一個分鐘邊界開始逐分鐘前進（本地時間語意，
  不存在的 DST 時間自然不觸發），視窗四年又一天涵蓋閏日週期；找不到
  就明說並解釋（2 月 31 日永遠不會觸發、缺日跳過）
  Enumeration: minute-by-minute from the first minute boundary strictly
  after the start, in local time (nonexistent DST times simply never
  match), over a window of four years plus a day covering the leap
  cycle; when the window ends, the page says so and explains why
  (February 31st never fires; missing days are skipped)
- 解說是結構化模型：核心只產生逐欄的結構描述，文字由雙語模板資料渲染，
  所以兩種語言的語意保證一致；兩欄位都受限時 OR 句必定出現，列舉不到
  時「可能永遠不會觸發」的警告是解說的一部分
  Explanations are a structured model: the core emits per-field
  descriptions and both languages render from template data, keeping the
  prose semantically identical; the OR sentence is mandatory when both
  day fields are restricted, and a "may never fire" warning is part of
  the explanation when enumeration finds nothing
- 建構器雙向同步：每個欄位可切換 每個值／指定值／範圍／步進 模式，
  改控制項即以正規形式改寫該欄文字（滿格寫 `*`、連續 3 個以上寫
  `a-b`、2 個保持 `a,b`、步進保留 `base/n`）；手打文字若符合建構形狀
  會被反映，無法表示的標示「自訂」且永不擅自改寫
  Two-way builder sync: each field switches between every / values /
  range / step, and control edits rewrite that field's text canonically
  (full set as `*`, runs of 3+ as `a-b`, runs of 2 kept as `a,b`, steps
  keeping their `base/n` form); hand-typed text is reflected when it
  matches a builder shape, and labelled "custom" — never rewritten —
  when it does not

## 已知規格瑕疵 · Known spec defect

規格 §4 的招牌算例 `*/15 9-17 * * 1-5`（2026-10-30 週五 16:59 起）印的
前幾次執行是「週五 17:00、週一 09:00、09:15、09:30」，但照規格自己的
語意（小時集合 9–17 含 17、分鐘集合 {0,15,30,45}），週五 17:15、17:30、
17:45 也會執行。本實作照語意走（17:00 與週一的三次與算例一致），差異
記錄於 VERIFICATION.md，待整批審查時為規格出勘誤。

The SPEC section 4 headline fixture for `*/15 9-17 * * 1-5` (from Friday
2026-10-30 16:59) prints the next runs as "Fri 17:00, then Mon 09:00,
09:15, 09:30", but under the SPEC's own semantics (hour set 9–17 includes
17; minute set {0,15,30,45}) Fri 17:15, 17:30 and 17:45 also fire. This
implementation follows the semantics — 17:00 and the Monday runs agree
with the fixture — and the discrepancy is recorded in VERIFICATION.md
for a spec erratum in the bulk review.

## 本機開發 · Local development

```sh
npm run dev    # serve the preview at http://127.0.0.1:4173
npm test       # node:test suites (core fixtures, truth table, builder sync)
npm run check  # project check (structure, CSP, forbidden APIs, normative fixtures)
npm run build  # copy public/ to dist/ byte-identically (preview only; production is refused)
```

## 隱私與安全 · Privacy and security

表達式是固定文法解析的資料，永不被當成程式執行（產品中不存在 eval 與
Function）；只以文字呈現，不寫入 URL、標題或任何儲存，工具不發出網路
請求。

The expression is data parsed by a fixed grammar and is never executed
as code (no eval or Function anywhere in the product); it renders as text
only and is never written to the URL, the title, or any storage. The tool
makes no network requests.

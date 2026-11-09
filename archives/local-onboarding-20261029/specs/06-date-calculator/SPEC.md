# 日期差與加減天數 — 既有規格保存

Task ID: `labs-06-date-calculator` · Spec ID: `spec-06-date-calculator`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格：日期差與加減天數

## U06 完整日期與星期（2026-10-13 核定）

FR-09：有效日期差同時呈現開始／結束的完整年月日、星期及原方向；加減保留 ASCII ISO 主答案，旁列結果星期，摘要核對基準／結果及正向「加／after」、負向「減／before」、0「相同／same」。四位年份包含 0001，英文使用固定月份／星期字典。兩語共用公曆 ordinal，Monday=0、ordinal%7。

FR-10：任一空白／非法／越界、clear、模式切換、pagehide/pageshow 及語言導航均不得留下舊摘要／星期。摘要每次有效 input 同步更新，以靜態文字呈現；保留原單一 polite status 的通知內容與 change/Enter 節奏，不新增 live region、儲存或外送。既有 ISO／calculator Result shape 與全部輸入限制不变。

本次不加入工作日、假日、今天、其他曆法、月份／年偏移、複製／匯出或通知。詳細案例見 OUTCOME-UPGRADE-2026-10-13.md，實際驗收見 HANDOFF 與 docs/VERIFICATION；本節不是通過紀錄。

這是核定產品規格；實際版本／驗收狀態見 HANDOFF.md 與 docs/VERIFICATION.md。

## 固定產品選擇

人們最常混淆「隔了幾天」與「算上第一天和最後一天有幾天」。本工具在日期差結果中同時列出兩者及方向，讓規則可見。計算對象是日期，不是兩個時間點，不存取裝置時區來決定結果。

| ID | 可觀察需求 |
|---|---|
| FR-01 | 兩個原生 radio 模式：「日期差」「加減天數」。初始日期差、兩個日期空白；加減模式初始日期空白，天數文字為 `0`。切換模式清空所有日期／結果／錯誤，天數重置 `0`，不保留隱藏工作資料。 |
| FR-02 | 日期核心只接受 `YYYY-MM-DD`；年份四位，0001..9999，月日兩位且真實存在。首尾 ASCII 空白可去除；原字串上限 32 UTF-16 code units。延伸公曆：年份可被 4 整除為閏年，但被 100 整除且不能被 400 整除者不是。拒絕 0000 年、超過 9999 年、無效日期與其他曆法。 |
| FR-03 | 日期差有開始 A、結束 B；主結果 `B.ordinal - A.ordinal`，帶負號代表結束較早。同時呈現「含起訖日的日期數」=`abs(差)+1`（始終正數）。同日主結果 0、含起訖日 1；不得把主結果一律取絕對值。 |
| FR-04 | 加減模式輸入基準日期與帶正負整數天數。天數首尾 ASCII 空白可去除，原長度 ≤ 16；格式為可選正負號加 1–7 個 ASCII 數字，數值範圍 -3652058..3652058。正数往後、負数往前、0 原日。不能接受小數、科學記號或單位尾字。結果不得超出日期支援範圍。 |
| FR-05 | 欄位變動即時同步計算。任一必需值空白時顯示待填，不以當日或 0 代替。任一無效值立刻移除舊結果；只有完整有效輸入才顯示結果。日期結果統一 `YYYY-MM-DD`，主計數為 ASCII 整數，不加正號或千分位。 |
| FR-06 | 日期差模式有「交換日期」按鈕，只交換 A/B 與其原始文字；有效結果立即翻转方向，含起訖日數不變。加減模式沒有交換按鈕。清除清空當前模式日期、結果與錯誤，天數回 `0`，焦點回第一個日期。 |
| FR-07 | 只在記憶體處理，不寫瀏覽器儲存、日誌、URL 或檔案；重新整理回初始日期差空表。載入同源靜態資產後，操作不發網路。不讀裝置日曆、聯絡人、位置或任何權限。 |
| FR-08 | 鍵盤、320px、200% 頁面縮放均可操作。原生 date 控制若不支援，以帶格式提示的文字欄位仍能手動輸入；核心驗證不依賴瀏覽器自動修正。JS/ESM 不可用時說明可讀並告知無法計算。 |

## 錯誤與生命週期

錯誤碼固定：`DATE_TOO_LONG`、`DATE_FORMAT`、`DATE_RANGE`、`INVALID_DATE`、`DAYS_FORMAT`、`DAYS_RANGE`、`RESULT_RANGE`、`INVALID_REQUEST`。空白為 `EMPTY`；不當成錯誤，也不得產生結果。多欄位無效時按視覺順序列欄位錯誤，不自動跳焦點。

使用者輸入保留在欄位供修正；模式切換／清除／重整使工作資料消失。沒有 async 工作、進度條、取消任務、匯入匯出或背景恢復。

## 非目標與完成

不加「今天」預填或按鈕，避免時區選擇含糊。不要把月份換成 30 天，也不要實作加月／年、排除週末、各國假日、倒數通知、法律或醫療用途判斷。未來功能需另立任務。完整通過 ACCEPTANCE 才算本機 MVP 完成；發布另行授權。


---

## 原文件 TECHNICAL.md

# 技術規格：日期差與加減天數

## U06 模組與狀態補充（2026-10-13）

dates.mjs 新增 `weekdayFromOrdinal(n)`：只接受 safe integer 0..3652058，成功 Result.value 為 n%7（Monday=0..Sunday=6），否則 DATE_RANGE。parseDate／toOrdinal／fromOrdinal／formatDate 及 calculator 回傳 payload 不改；沒有 Date、Intl 時間點、時鐘、毫秒或時區運算。

i18n.mjs 新增 `formatDateSummary(raw,lang)`，復用 parseDate/weekday helper，固定且 deep-frozen 的兩語字典產生 `{iso,weekdayIndex,weekday,label}` Result；保留四位年，未知 lang 沿原繁中 fallback。app 在計算完整成功後才提交數值與摘要；`diff-date-summary`、`offset-date-summary`、`date-weekday` 納入 collectDom 的存在／tag gate、clearResults 及全生命週期清理，以 textContent 呈現。保留既有單一 live status，不額外播報每次摘要 input。

app 的 `initializeDateCalculator(document,window)` 將 DOM／生命週期狀態封在每次初始化的 closure；瀏覽器仍自動啟動一次，測試用固定本地 import 建立各語系 fixture，不使用動態 module URL／query 或放寬 checker。

正式 releasePolicy 在兩語 canonical／zh-Hant／en 之外，新增唯一 x-default 指向該正式 base 的 index.html（正式部署為 https://date.glossquote.com/index.html）；精確 checker 隨 policy 驗证缺失／重複／錯誤目標，不放寬資產或 CSP。preview 原始 HTML 不加入正式 metadata。

這是實作規格；實際進度見 HANDOFF.md。遵守 [工程](docs/ENGINEERING.md)、[安全](docs/PRIVACY-SECURITY.md)。正式運算在瀏覽器；Node.js 24+ 僅離線開發／測試，無 runtime 套件。

2026-09-29 決定：本工具預覽埠採4174（取代本文及共用文件的4173預設），保留127.0.0.1；兩語獨立靜態頁 `/index.html` 與 `/en/index.html`，相同core與DOM id、固定本地i18n。模式不寫入網址；語言導覽清空全部輸入。

公開核心 API 補充：`toOrdinal(parts)`、`fromOrdinal(n)`、`formatDate(parts)` 都採Result回傳。前者成功value為整數，fromOrdinal成功value為僅含year/month/day的物件，formatDate成功value為ISO字串。parts嚴格接受三個自有資料欄位year/month/day，不執行getter；形狀或非整數為INVALID_REQUEST、年出界DATE_RANGE、無效月日INVALID_DATE；ordinal非安全整數或超界為DATE_RANGE。parseDate成功value仍含year/month/day/ordinal/iso。isLeapYear、daysInMonth可作私有helper，不增加未定義對外介面。dateDifference/addDays嚴格檢查完整自有欄位（含symbol、不可列舉欄位），拒絕accessor，不作型別轉換；錯誤優先按欄位視覺顺序。正規表達式須整串相符，不能讓末尾非ASCII換行被 `$` 放行。

## 檔案與命令

```text
package.json
scripts/{serve,check,build}.mjs
public/index.html
public/styles/{tokens,app}.css
public/js/app.mjs
public/js/core/dates.mjs
public/js/core/calculator.mjs
test/{scaffold,dates,calculator,boundaries}.test.mjs
docs/RESEARCH.md
docs/VERIFICATION.md
dist/                     # build 產生
```

大括號只代表各個獨立檔案，不是字面檔名。T00 建立 dev=`node scripts/serve.mjs`、test=`node --test`、check=`node scripts/check.mjs`、build=`node scripts/build.mjs`。serve 綁 127.0.0.1:4173，僅 public，不接受路徑穿越／未知檔案／目錄列舉；check 真查 ESM 語法、必要檔案、外部資源、危險 DOM API／網路／持久化；build 僅 public→本專案 dist，不打包測試或輸入。不安裝套件。

## T08 發布工具鏈補充

`scripts/release.mjs`集中雙語URL與SEO生成契約；`build --production --site-url HTTPS目錄`產生正式HTML及精確SEO檔並調用`checkReleaseOutput`驗證。無旗標仍為public→dist預覽。`check`同旗標只驗dist，不修改public。兩語canonical固定index.html；根目錄robots與子目錄不產生robots的差異、輸入限制及主機必要headers見docs/SEO-RELEASE.md。release.test覆蓋兩種部署路徑與拒絕案例，不改日期核心。

## 純整數日期演算法

**不要用 `new Date(string)`、`Date.parse`、本機午夜或毫秒相減來計算日期差。** 避免無效日期自動進位、0..99 年特殊映射及時區／夏令時間影響。以 0001-01-01 為 ordinal 0，9999-12-31 為 3652058，全部可用安全整數。

1. `isLeapYear(y)`：`y%4===0 && (y%100!==0 || y%400===0)`。
2. `daysInMonth(y,m)`：31/28或29/31/30/31/30/31/31/30/31/30/31。
3. `daysBeforeYear(y)`：令 n=y-1，回 `365*n + floor(n/4) - floor(n/100) + floor(n/400)`。
4. `toOrdinal({year,month,day})`：先檢查三者整数與有效日期；`daysBeforeYear(year) + 當年month以前各月天數總和 + day - 1`。
5. `fromOrdinal(n)`：要求安全整數 0..3652058。對年份 1..9999 做二分搜尋，找最大的 y 使 daysBeforeYear(y)≤n；餘數依月份表最多減 11 次，得到 month、day=餘數+1。不要每次逐日走數百萬步。
6. 日期格式化年份補四位、月日補兩位，用固定 ASCII `YYYY-MM-DD`，沒有 UTC／時區尾綴。

## 模組 API

檔案分工：dates.mjs export parseDate、parseDays、toOrdinal、fromOrdinal、formatDate；calculator.mjs export dateDifference、addDays。兩檔均無DOM或時鐘，無其他模組相依。

所有公開解析／計算函式回 `{ok:true,value:...}` 或 `{ok:false,code:固定碼}`。`EMPTY` 可由 UI 映射待填。所有純函式均不操作 DOM／時鐘，參數錯誤不丟出含原值的 exception。

- `parseDate(raw)`：先確認 string（否則 DATE_FORMAT）；原長度超過 32 字元回 DATE_TOO_LONG；只 trim `[\t\n\r ]` 首尾；空白 EMPTY；`^\d{4}-\d{2}-\d{2}$`；年份範圍；month 1..12；day 1..daysInMonth；回 `{year,month,day,ordinal,iso}`。形狀錯誤 DATE_FORMAT、年份出界 DATE_RANGE、不存在日期 INVALID_DATE。
- `parseDays(raw)`：string/16 字元閘門；同樣 trim；空白 EMPTY；`^[+-]?\d{1,7}$`；Number 與安全整数／範圍；`-0` 轉 0。字串太長或超值為 DAYS_RANGE，格式不符 DAYS_FORMAT。
- `dateDifference({start,end})`：兩個欄位必须剛好存在且皆為日期字串；拒絕未知欄位 INVALID_REQUEST。parseDate；回 `{deltaDays, inclusiveDays:abs(deltaDays)+1,direction:"forward"|"backward"|"same"}`。
- `addDays({date,days})`：剛好這兩欄位且皆字串；parseDate/parseDays；n=ordinal+days；界外 RESULT_RANGE，否則回 `{iso,offsetDays}`。
- `formatDate(parts)`：只格式化已驗證 parts；不得經 locale date 顯示再反向解析。

驗證多欄位時由 UI 分別呼叫 parse 函式以對應欄位錯誤；只有全有效才呼叫計算函式。純函式再次驗證，避免繞過前端檢查。

## 狀態、安全與清理

`mode=diff|offset`，狀態 `empty|valid|invalid|unsupported`；input/change 同步更新，不做 debounce、Worker 或 timer。切換模式重建乾淨 draft，清除與交換都只改當前記憶體。textContent/原生 value 顯示輸入，不使用 HTML 字串模板注入使用者內容。表單提交 preventDefault，不能產生 GET URL 或網路導頁。無檔案／Blob，因此取消及 Object URL 清理不適用。

原生 date 欄位 `min=0001-01-01,max=9999-12-31`；附明確格式提示。功能檢測不等於相容性通過；需要手動驗證目標瀏覽器的鍵盤輸入與 fallback。不要依瀏覽器 locale 限制年份或年月日順序。

## 官方參考與研究閘門

2026-09-23 查閱：[WHATWG 日期微語法](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#dates) 定義不帶時區的延伸公曆日期；[WHATWG date 輸入](https://html.spec.whatwg.org/multipage/input.html#date-state-(type=date)) 說明值格式與控制行為；[ECMAScript 日期](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-objects) 作為避免混用時間點的參考。上述來源不授權引入新功能。

T01 必須核對閏年／邊界與原生 date 的實際瀏覽器行為，記錄 docs/RESEARCH.md。支援矩陣以本機實測為準；不要求下載瀏覽器或用線上日曆驗算私人日期。


---

## 原文件 UX-SEO.md

# 介面與 SEO：日期差與加減天數

## U06 現行結果與 SEO 校正（2026-10-13）

保留 Product App 的現有工作布局：原天數／ISO 結果維持主層級，完整日期摘要放在同一結果區，offset 星期緊邻 ISO，長文自然換行。差值摘要例：`開始：2024 年 2 月 28 日（星期三）；結束：2024 年 3 月 1 日（星期五）。` 英文 `Start: Wednesday, 28 February 2024; end: Friday, 1 March 2024.` 原方向／規則提示保留。

摘要與星期空時 hidden 且文字清空，有效 input 即更新，不增多个 aria-live；沿用既有 polite status 的 change／Enter／狀態變更節奏。320px 檢查長月份／星期／四位年，保留現有焦點、fallback 及單欄重排；真 200%／AT／設備只能實測后記 PASS。

依本批明確校正，正式 canonical 為各語自身 index.html，雙向 zh-Hant/en 互返，兩語各新增唯一 `hreflang="x-default"` 指向 `https://date.glossquote.com/index.html`，另驗 robots/sitemap/404/MIME/security headers。x-default 在舊版未要求不是本批回歸；本段取代本工具舊「非阻塞一致化待辦」的要求。preview 保留 noindex 與相對兩語 alternate，不填正式 origin，不改 CSP／無追蹤界線。

這是規格，尚未實作。使用 Product App 模式和 [設計系統](docs/DESIGN-SYSTEM.md)，以日期與答案為主，不做行事曆儀表板。

桌面：

```text
GlossQuote-Labs / 日期差與加減天數
日期差與加減天數
(•) 日期差    ( ) 加減天數
開始日期 [年-月-日] [交換日期] 結束日期 [年-月-日]
日期差（結束－開始）     — 天
含起訖日的日期數        — 天
方向／規則說明                       [清除]
使用方式／支援範圍／FAQ
```

手機：

```text
日期差與加減天數
(•) 日期差 ( ) 加減天數
開始日期 [         ]
[交換日期]
結束日期 [         ]
日期差        — 天
含起訖日      — 天
規則说明 [清除]
```

加減模式同一工作區顯示「基準日期」「加減天數」與「結果日期」，提示「正數往後、負數往前」。沒有日期月曆矩陣的自行實作；使用原生控制或可輸入 ISO 日期的文字 fallback。全部核心欄位一直可見，長說明可折疊。

## 狀態與無障礙

- 初始：「輸入兩個日期，查看日期差。」加減初始：「輸入基準日期與加減天數。」
- 成功同日：「兩個日期相同。」負差：「結束日期早於開始日期。」正差：「結束日期晚於開始日期。」搭配數字，不只用顏色。
- 無效日期：「此日期不存在，請檢查年份、月份與日期。」範圍錯誤：「支援 0001-01-01 至 9999-12-31。」
- 無效天數：「請輸入整數天數，例如 7 或 -7。」結果出界：「結果超出支援日期範圍，請調整天數。」
- 清除後回待填，原生 output 顯示 `—`。修改失效時不保留舊答案。
- 不支援：「此瀏覽器無法啟動計算。你仍可閱讀下方的計日規則。」noscript 亦提供此意義的文案。
- 同步運算沒有處理進度、背景取消、帳號、通知或權限狀態；不要加入假 loading。

用 fieldset/legend 分組模式，原生 radio 支援方向鍵。所有欄位 visible label、格式說明與欄位錯誤透過 aria-describedby 連結。結果可選取，polite 狀態只在 change 或狀態改變時通知；不在每按一個數字時讀長段結果。按鈕 44px 目標、雙層焦點、合規對比；320px 使用單欄，200% 頁面縮放與40%長標籤不裁切；reduced-motion 不影響功能。

## SEO 草案

- slug：`/tools/date-calculator/`。
- title：`日期差與加減天數｜算出相隔幾天與指定日期 — GlossQuote-Labs`
- description：`計算兩個公曆日期的天數差，或從指定日期加減整數天數。同時顯示含起訖日的日期數，在瀏覽器內完成，不上傳日期。`
- H1：`日期差與加減天數`
- 首段：`需要知道兩個日期相隔幾天，或七天後是哪一天？選擇計算方式，輸入日期，即可查看結果與計日規則。`
- FAQ「同一天為什麼有 0 天和 1 天？」答「日期差代表跨越了幾個日期邊界，同日為 0；包含起訖日的日期數把該日計入，因此為 1。」
- FAQ「會扣掉週末與國定假日嗎？」答「不會。這裡計算連續公曆日期，沒有工作天或各地假日資料。」
- FAQ「夏令時間會讓結果不同嗎？」答「這裡只計算日期，不使用時間或時區，不以一天的實際小時數換算。」
- FAQ「可以算法律期限或農曆日期嗎？」答「目前不提供這些规则，請使用適用於該用途的資料與工具。」
- FAQ「日期會被保存嗎？」答「本工具不主動儲存或上傳工作日期；清除或重新整理後需重新輸入。」

所有說明直接在 HTML 中可讀，不能只由 JS 產生 SEO 內容。本地頁保留 noindex,nofollow；正式網址和發布授權前不產 canonical/sitemap。不能虛構正式網域、使用者數、排名或全瀏覽器支援。


---

## 原文件 ACCEPTANCE.md

# 驗收：日期差與加減天數

## U06 新增 gate（2026-10-13）

原 D01–D24 全部保留。U06-01..12 的精確輸入與預期由 OUTCOME-UPGRADE-2026-10-13.md 核定：固定 Monday-first 七錨點與非法 ordinal；兩語日期差／swap／同日；after/before/zero；0001／9999／越界；非法日期；季節轉換；clear/mode/page lifecycle/語言；badInput 與 EMPTY；Enter/IME/repeat；真瀏覽器窄版／鍵盤及人工隱私限制。新 core/i18n/app interaction/UI contract tests 必須與原測試一併通過，Fake DOM 不代替原生 date、真設備、AT 或 Network/Storage。

正式兩語各有唯一 x-default 指向 base index.html；錯誤目標、缺失與重複拒絕；preview 仍 noindex、無正式 origin／x-default。跑原 package test/check/build 與 production Cloudflare build/check，手動結果及 NOT_RUN 記入 docs/VERIFICATION。新版固定來源交主代理驗收／部署／外驗，不繼承舊版本通過。

這是核定驗收規格，不表示全部人工案例已完成；實際版本結果與 NOT_RUN 見 docs/VERIFICATION.md。日期與計數採精確相等，不使用誤差容忍。全部為合成日期，不讀私人行事曆。

| ID／FR | 種類 | 輸入／操作 | 精確預期 |
|---|---|---|---|
| D01／02 | 自動 | 0001-01-01；9999-12-31 | ordinal 0；3652058；可各自來回轉換 |
| D02／02 | 自動 | 1900-02-29；2000-02-29；2100-02-29 | INVALID_DATE；有效；INVALID_DATE |
| D03／02 | 自動 | 2024-02-30；2024-04-31；2024-13-01 | 均 INVALID_DATE，不自動進位 |
| D04／02 | 自動 | 0000-01-01；10000-01-01；2024-2-09 | DATE_RANGE；DATE_FORMAT；DATE_FORMAT |
| D05／02 | 自動 | ` 2024-02-29 `；空字串；33 個 `0` | iso 2024-02-29；EMPTY；DATE_TOO_LONG |
| D06／03 | 自動 | A=2024-02-28 B=2024-03-01 | deltaDays=2,inclusiveDays=3,direction=forward |
| D07／03 | 自動 | A=2023-02-28 B=2023-03-01 | 1,2,forward |
| D08／03 | 自動 | A=2024-03-01 B=2024-02-28 | -2,3,backward |
| D09／03 | 自動 | A=B=2026-09-23 | 0,1,same |
| D10／03 | 自動 | A=0001-01-01 B=9999-12-31 | 3652058,3652059,forward |
| D11／04 | 自動 | 2024-02-28 +1；2024-03-01 -1 | 2024-02-29；2024-02-29 |
| D12／04 | 自動 | 2023-12-31 +1；2024-01-01 -1；2024-02-29 +0 | 2024-01-01；2023-12-31；2024-02-29 |
| D13／04 | 自動 | 0001-01-01 -1；9999-12-31 +1 | 均 RESULT_RANGE，無日期 |
| D14／04 | 自動 | 天數 `+007`、`-0`、`1.5`、`1e2`、`7天`、`3652059` | 7、0、DAYS_FORMAT、DAYS_FORMAT、DAYS_FORMAT、DAYS_RANGE |
| D15／04 | 自動 | 天數 null/NaN/Infinity/true；dateDifference 多一個 key | 前四 DAYS_FORMAT；INVALID_REQUEST |
| D16／02,03 | 自動 | 2024-03-10→2024-03-11；2024-11-03→2024-11-04 | 兩者均差1、含起訖2；與機器時區無關 |
| D17／02 | 自動 | 對 1..9999 年驗證1月1日、各月最後一日 round-trip | 每一有效日期 toOrdinal/fromOrdinal 相等；ordinal 單調 |
| D18／01,06 | 手動 | 有結果後交換日期；再切加減模式 | 差值正負反轉、inclusive不變；切換後日期空、天數0、無舊結果 |
| D19／05,06 | 手動 | 有結果後刪空一日期，再清除 | 結果變破折號、待填而非0；清除焦點回第一日期 |
| D20／07 | 手動 | Network清空後完成兩模式、交換、清除；重整 | 操作無請求；無工作資料 storage/URL/log；重整初始空表 |
| D21／02,08 | 自動＋手動 | parseDate及fallback欄位輸入 `<svg onload=alert(1)>` | DATE_FORMAT 或原生控制拒填，無執行／SVG／請求；無raw error |
| D22／08 | 手動 | 鍵盤切模式、填日、交換、清除；檢查錯誤朗讀 | 功能完整、焦點可見、不陷阱；不需滑鼠選日 |
| D23／08 | 手動 | 320px寬、200% 頁面縮放、40%長標籤 | 單欄重排、無整頁水平捲動、結果與按鈕可讀 |
| D24／08 | 手動 | JS停用；以文字fallback測有效和無效ISO日期 | 無JS顯示限制；fallback和原生核心結果相同 |

命令由 T00 建立後執行：`npm test`、`npm run check`、`npm run build`。Node 的純函式測試不能聲稱驗證原生日期控制、瀏覽器儲存或實際無障礙。

取消不適用：所有工作同步有界；D19 驗證清除。權限、登入、網路恢復不適用，無相關功能。把瀏覽器版本、日期、案例ID、結果與失敗證據記入 docs/VERIFICATION.md；不得用外部官方範例執行成功代替產品驗收。


---

## 原文件 TASKS.md

# 實作任務：日期差與加減天數

流程以 AGENTS.md 的「閱讀與執行」「交付與收斂」為準：沿用本 session 已讀文件，只補讀變動／相關段落；同一授權工作依序推進，不因任務切換重問。各任務 allowed paths、前置條件與必要驗收保持有效，缺陷回到其擁有任務修正；來源發布依適用的既有明確授權，不包含網站部署。

## U06-WEEKDAY-SUMMARY-20261013

狀態：OWNER_LOCAL_GATES_AND_PUBLIC_SOURCE_PASS；已釋放寫入 owner，待主代理獨立驗收／部署／外驗。focused 22/22、full 58/58、check23、preview8、production build/check12；33 筆真瀏覽器／文字 fixture 記錄 PASS，人工限制另列。PUBLIC commit `98cee2eedce5a0035ae29d448528e6011cb87fd4`、27 檔固定 ZIP／Git blobs 及 25 份實作來源相同。規格見 OUTCOME-UPGRADE-2026-10-13.md，最上方 x-default 校正優先；不自動下一 milestone，不繼承舊外驗。

- 範圍：spec 列出的 dates/i18n/app、雙語 HTML、app.css、對應 focused tests、PRODUCT/TECHNICAL/ACCEPTANCE/UX-SEO/HANDOFF/TASKS/docs/VERIFICATION；明確包含 release.mjs 及必要 release/check tests 的最小 x-default 修改。dist 只由 build 產生；證據限 `.runs/06-date-calculator-outcome-2026-10-13/**`，來源發布限既有 reviewed 日期工具副本。
- 驗收：U06-01..12、focused tests、npm test/check/preview build、production Cloudflare build/check；真雙語主要結果與失效、可行窄版檢查。PUBLIC 更新、固定 commit ZIP／Git bytes／manifest、完整前後環境不變；人工 NOT_RUN 保留。
- 邊界：ordinal 0=Monday、n%7，舊 calculator shape／ISO／清理／單一 live status 節奏保留。無 Date/時區/毫秒／新依賴／工作日／假日／今天，不改其他工具／首頁／共同狀態，不讀憑證或部署。完成後釋放 owner，新版待主驗／部署／外驗。

## AUDIT-DATE-01 外部稽核限定補驗（2026-10-11）

狀態：PASS（限定維護範圍完成；Cloudflare 隱私 P1 留原主對話）。英文真 UI 精確填值／結果 2/3 PASS；3 個既有測試案例 PASS，世紀閏年／上限屬 Node 核心證據；21 份來源／dist 無 Insights 標記、25 份 M11 審查來源相同；當日匿名 HTTP 無 script，但英文 IAB DOM 有，完整 Network 仍 NOT_RUN。TASK-ENTRY 的 x-default 通用矛盾已修正，無產品變更／發布／部署。詳見 [AUDIT-2026-10-11](docs/AUDIT-2026-10-11.md)。使用者透過原主對話授權依補上的外部證據執行本次維護 milestone，取代 TASK-ENTRY 首次接手只准 THREAD-STATUS 的寫入限制；其餘安全與共享發布邊界不變。

- allowed paths：TASK-ENTRY.md、TASKS.md、docs/AUDIT-2026-10-11.md、docs/THREAD-STATUS.md、HANDOFF.md；專用證據 `.runs/date-calculator/audit-2026-10-11/**`。先記錄與本次稽核直接相關的具體產品失敗、預期及路徑，才可修改對應 public/scripts/test 並补回歸；高風險跨模組缺陷交原主對話。
- 交付：英文正式頁用本對話專用 browser tab 精確填入閏年日期並讀回值／結果；1900/2000/2100 與 9999 上限先核對既有核心測試，與真 UI 證據分開。繁中 2/3、swap -2/3、0001 下限沿用補驗紀錄，不重測作新結果。
- 降級狀態：hidden 文案不能當故障；如看到 fallback，核對實際可見性、fieldset、樣式及一次 reload。同一操作兩次無進展保留 NOT_RUN。
- SEO：只修 TASK-ENTRY 通用 x-default 要求為依核定發布規格驗證；既有 zh-Hant/en、canonical、robots/sitemap 與其他 gate 保留，不改 releasePolicy／HTML／dist。
- Insights：只唯讀自己的來源／已審查 dist、日期站 HTTP 與本對話 browser DOM。無 source beacon 不代表 live 無注入；不把 script 存在當實際遙測或內容外洩。跨站主機設定與完整 Network/Storage 交原主對話；不得讀憑證、修改 Cloudflare/DNS、部署或加 CSP 例外。
- 完成條件：英文可用結果或具體阻塞、世紀閏年／上限證據種類清楚、來源 script 排查與 SEO 文件修正完成、範圍與环境指紋驗證、PASS/FAIL/NOT_RUN 如實記錄。沒有程式變動則不重跑全套 build／發布；本限定 milestone 完成即停。

## T09 Cloudflare 免費託管與正式域名（2026-10-06）

進度：T09必要正式上線驗收PASS。date.glossquote.com已部署，zone/DNSSEC Active；24真HTTP案例、10份公開檔案位元組比對與雙語IAB操作PASS，Cloudflare純Static Assets／無preview/logs設定已核對。GitHub最新9b7dc6d同步正式連結，產品程式同4494f0f。原50測試與本機建置證據沿用未變輸入；真機/AT等人工保留項不冒稱完成。詳見HANDOFF。

使用者已購買 Spaceship 的 glossquote.com，並明確同意採用 Cloudflare 免費託管與網域設定方案。本次一個 milestone：日期工具部署準備、GitHub 同步，網域可用後驗證正式主機。不包含其他工具、品牌首頁、付費服務或計算功能變更。建立 zone 的已連接 API 缺少 zone.create 權限，需使用者在後台加入 Free zone；不繞過權限。

- allowed paths：本文件、HANDOFF.md、README.md、docs/SEO-RELEASE.md、docs/VERIFICATION.md、docs/GITHUB-PUBLICATION.md、docs/CLOUDFLARE-DEPLOYMENT.md；scripts/build.mjs、scripts/check.mjs、scripts/release.mjs、scripts/cloudflare.mjs、test/cloudflare.test.mjs、wrangler.jsonc；既有 build 產生 dist/**、Wrangler 本機模擬產生 .wrangler/**（不發布）；工作區 .runs/date-calculator/t09/** 與既有日期工具 GitHub 發布副本（含 .gitignore 排除 Wrangler 暫存）。不能修改 public、核心、其他工具及根專案。
- 正式 origin：https://date.glossquote.com/，沿用 index.html 與 en/index.html 為唯一語言 URL。純 Static Assets，无 Worker 程式／ASSETS binding／外部資產／套件／自訂日誌。workers.dev 與 version preview URL 關閉。
- 新增明確 --cloudflare production 建置模式，限上述 origin 根部署；產生精確白名單 _headers 與 _redirects。一般 preview/production 及其既有嚴格檢查不變。html_handling=none、not_found_handling=none；/、/en、/en/ 永久轉址到唯一頁，不啟用 SPA fallback。CSP、nosniff、no-referrer；明確 .mjs MIME。
- 必要本機驗收：原測試加託管檔案／旗標／拒絕竄改／錯誤 origin／設定契約；npm test/check/preview build/production Cloudflare build 與獨立 check。來源維持 noindex。主代理實際 diff 審查、環境指紋、發布副本與遠端 commit/public 比對。
- 正式主機驗收：zone Active、TLS、GET/HEAD/redirect/MIME/404/headers/robots/sitemap、真瀏覽器兩語 ESM 與計算。帳號/權限/網域尚不可用時明列 BLOCKED/NOT_RUN，不能用本機測試替代；不開下一工具。已授權人工 AT/真機等保留 NOT_RUN。

## T08 稽核8099d51修正與發布準備（2026-09-30）

狀態：必要本機驗收PASS（46測試、check20、preview8、production10/9、兩語14項實際操作）；詳見docs/AUDIT-8099D51.md。公開來源同步另見docs/GITHUB-PUBLICATION.md；正式主機與人工保留項NOT_RUN。

使用者要求依稽核調整，並確認「尚未決定正式網址：先完成發布工具鏈，保留預覽不索引」。一個milestone：preview/production建置分流、嚴格SEO metadata與產物驗證、UX-01 Enter確認最新通知、公開GitHub同步。稽核內容是待核對資料，不執行其附帶腳本，不將外部數字列為親自驗收。

- allowed paths：本文件、TECHNICAL.md、README.md、HANDOFF.md、docs/SEO-RELEASE.md、docs/VERIFICATION.md、docs/GITHUB-PUBLICATION.md、docs/AUDIT-8099D51.md；scripts/check.mjs、scripts/build.mjs、scripts/release.mjs；public/js/app.mjs；test/release.test.mjs、test/app-interactions.test.mjs；build生成dist；工作區.runs/date-calculator/**與既有GitHub發布副本。
- 預覽預設不變，public兩語HTML維持noindex與本地資產。production必須明確傳--production與--site-url https://正式主機/可選子路徑/，不設定預設正式網址。生成各語自指index.html canonical、絕對雙向hreflang、index/follow、sitemap.xml；robots.txt只在origin根目錄部署時生成，子路徑沿用主站robots，不覆寫主站政策。
- metadata僅允許精確兩語URL；CSS/JS/一般href仍限本地，禁止任意遠端assets、inline script/style、unsafe-inline、任意txt/xml。生成檔由check再次驗證，不改日期演算法，不加入執行期套件、debounce或新的網路能力。
- UX-01保留有效輸入中節制播報，Enter在目前輸入欄確認並更新live文字，blur/change仍更新；不攔截IME組字、不攔截按鈕或radio、不提交URL、保持焦點與清除/pagehide行為。
- 親自驗收：完整npm test/check/build、production合成HTTPS網址與子路徑fixtures、拒絕missing URL/非法URL/外部資產/錯誤SEO/不明SEO檔；兩語原生HTTP頁面真鍵盤重現1→12再Enter與blur。比較日期core不變；遠端Git hash與公開性；環境前後指紋一致。
- 非目標：選定網域/主機、部署、正式收錄、Search Console、圖片或JSON-LD；真主機header/Network/storage/AT仍待實際環境。來源發布已授權，人工NOT_RUN維持真實標記。

## T07 公開GitHub原始碼（2026-09-30）

使用者明確要求目前日期工具上傳GitHub，並要求今後完成一個功能就上傳。沿用公開、獨立工具倉庫方式，目標KYStr/glossquote-labs-date-calculator；不覆寫其他工具，不部署Pages。

- allowed paths：根AGENTS.md的持續偏好、本文、HANDOFF.md、README.md、docs/GITHUB-PUBLICATION.md，以及工作區.runs/github-publish/glossquote-labs-date-calculator/**和.runs/date-calculator/**證據。
- 工作：審查並複製public/scripts/test/package.json到獨立發布副本，加入公開用README/.gitignore；不帶工作區私有文件、歷史、.codex、暫存、dist或憑證。以既有gh登入操作，不讀出token。
- 驗收：發布副本npm test/check/build；來源與副本hash相等、Git staged清單僅允許檔案；public遠端commit/tree驗證、本機環境前後一致。
- 完成：HANDOFF記錄真實repo/commit/公開狀態及人工待驗；公開原始碼不等於網站正式部署。

## 2026-09-29 使用者授權更新與本輪 milestone

使用者要求製作下一個功能專案，依 ROADMAP 選定本日期工具；沿用已確認的繁體中文＋英文、每次一個功能網站與人工待驗可保留 NOT_RUN 的要求。本輪 milestone 為「可操作的雙語日期工具與本機驗收」，按下列 T00→T06 逐項通過必要驗收再開始下一項；不同時做其他工具。

- 額外文件 allowed paths：本文件、TECHNICAL.md、README.md、START-HERE.md、UX-SEO.md、docs/MILESTONE-01.md、docs/SEO-RELEASE.md、docs/VERIFICATION.md、HANDOFF.md、project.json；本機證據限工作區 `.runs/date-calculator/**`。不改其他產品或全域設定。
- T00 本工具預覽改用 127.0.0.1:4174，避免覆蓋已開啟的單位工具4173；這項明確產品覆寫優先於共用工程文件的預設埠。其他loopback與路徑限制不變。
- T03／T04／T05 額外允許 public/en/index.html、public/js/i18n.mjs、test/i18n.test.mjs、test/seo.test.mjs、test/ui-contract.test.mjs；由主代理在派工前固定DOM／字典契約，英文完整翻譯，不用遠端翻譯服務。T04 若驗收找到真實UI缺陷，可修兩語HTML/CSS及i18n，但不更改已驗證數值契約。
- T03 允許主代理更新 test/scaffold.test.mjs 中僅供 T00 的 placeholder DOM 斷言為實際介面斷言，並增加英文頁／共用模組的HTTP狀態與MIME驗證；保留全部伺服器、路徑、套件與建置安全測試。
- 人工工具不能執行的真200%縮放、真機、螢幕閱讀器、完整Network/storage等明列NOT_RUN；已知程式錯誤或可執行的必要驗收不可跳過。
- 本輪非目標：工作日／節假日、時區／時間點、月份／年加減、通知、儲存、外部套件、正式主機／網域設定及部署。尚無正式URL，兩語保留noindex，正式canonical/hreflang/sitemap及安全標頭依SEO-RELEASE另驗。不將單位工具的GitHub倉庫改成日期工具。
- 委派工具可指定model與reasoning_effort；本輪每位實作子代理明確指定gpt-6-luna/max、fork_turns=none，同時最多2位，不再委派；主代理保留架構／驗收及狀態紀錄。

本文件定義任務；實際進度以 HANDOFF.md 與最新驗收紀錄為準。一次一項，依序進行。依 AGENTS.md 的 session 閱讀規則讀取當前任務所需內容。allowed paths 均相對此專案根目錄。

## T00 建立開發底座

- 前置：文件閱讀完成。
- allowed paths：`package.json`、`scripts/serve.mjs`、`scripts/check.mjs`、`scripts/build.mjs`、`public/index.html`、`public/styles/tokens.css`、`public/styles/app.css`、`public/js/app.mjs`、`test/scaffold.test.mjs`、`HANDOFF.md`。
- 工作：private/type=module、Node>=24、TECHNICAL四條npm命令、無dependencies；loopback public伺服器、真實檢查腳本、安全限定dist的建置腳本；空HTML含標題/noindex。scaffold測不可读取public外路徑。
- 驗收：`node --version`，建立腳本後 `npm test`、`npm run check`；`npm run dev` 人工確認127.0.0.1頁與非法路徑拒絕後停server。
- 完成：工具鏈可用；HANDOFF寫已建檔案／實際結果，不提前寫日期功能完成。不需npm install。

## T01 核對日期規則

- 前置：T00通過。
- allowed paths：`docs/RESEARCH.md`、`HANDOFF.md`。
- 工作：核對 WHATWG 公曆微語法、閏年規則、最大ordinal、date控制及文字fallback；記錄官方URL、日期、已測瀏覽器和未測平台。
- 驗收：人工驗算1年/1900/2000/9999邊界；`npm run check`。
- 完成：沒有未決演算法選擇；HANDOFF記研究依據。有矛盾先停，不自行新增套件或曆法。

## T02 日期與計算核心

- 前置：T01通過。
- allowed paths：`public/js/core/dates.mjs`、`public/js/core/calculator.mjs`、`test/dates.test.mjs`、`test/calculator.test.mjs`、`HANDOFF.md`。
- 工作：純整數ordinal、二分反算、嚴格解析、diff/add函式；覆蓋D01–D17，無Date.parse或本機午夜邏輯。
- 驗收：`node --test test/dates.test.mjs test/calculator.test.mjs`、`npm run check`。
- 完成：錯誤碼、界限、負向差、inclusive與round-trip均通過；HANDOFF列覆蓋ID。

## T03 建立兩模式介面

- 前置：T02通過。
- allowed paths：`public/index.html`、`public/styles/tokens.css`、`public/styles/app.css`、`public/js/app.mjs`、`docs/VERIFICATION.md`、`HANDOFF.md`。
- 工作：原生radio/date、輸入提示、同步結果、交換與清除、安全文字DOM；依UX桌面/手機線框完成D18、D19、D22、D23。
- 驗收：`npm test`、`npm run check`、`npm run dev`；人工核對鍵盤/320px/200% 頁面縮放，停止server。
- 完成：結果與規則同時可見，HANDOFF記畫面與瀏覽器驗證。

## T04 邊界、fallback與資料處理

- 前置：T03通過。
- allowed paths：`public/js/core/dates.mjs`、`public/js/core/calculator.mjs`、`public/js/app.mjs`、`public/index.html`、`public/styles/app.css`、`test/boundaries.test.mjs`、`docs/VERIFICATION.md`、`HANDOFF.md`。
- 工作：有界假字串與未知欄位測試；完成D20、D21、D24；清除無殘留、錯誤不保留舊结果，無網路／儲存／個資日誌；修實際缺陷。
- 驗收：`npm test`、`npm run check`；人工Network、storage、fallback、禁用JS检查。
- 完成：驗收紀錄與HANDOFF如實區分自動和手動，必要平台未測就留待驗。

## T05 說明、SEO與建置

- 前置：T04通過。
- allowed paths：`public/index.html`、`public/styles/app.css`、`docs/VERIFICATION.md`、`HANDOFF.md`、`dist/**`（僅build產生）。
- 工作：靜態title/description/H1/計日規則/FAQ；noindex保留、沒有虛構canonical/sitemap；工具區仍優先。
- 驗收：`npm run check`、`npm test`、`npm run build`，確認dist只有public產品內容；JS停用仍可讀說明。
- 完成：HANDOFF記建置结果，未發布。

## T06 完整驗收與交接

- 前置：T05通過。
- allowed paths：`docs/VERIFICATION.md`、`HANDOFF.md`、`dist/**`（只允許既有build輸出）。
- 工作：跑ACCEPTANCE全部案例、檢查變更範圍、記支援限制與已知問題。
- 驗收：`npm test`、`npm run check`、`npm run build`及瀏覽器完整回歸。
- 完成：全部必要案例通過才寫「本機 MVP 驗收完成，尚未發布」；缺陷回對應任務，不在T06擴權修改程式。


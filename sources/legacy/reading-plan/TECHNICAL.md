# 閱讀進度規劃：技術規格

狀態：SPEC_ONLY；下列模組、演算法、命令與結果型別都待實作。

## 技術邊界

- 正式產品是靜態雙語網站；核心演算法在瀏覽器本機運算。
- 原生 HTML、CSS、瀏覽器 ESM；Node.js 24+ 只用於開發、檢查、建置及 node:test。
- 執行階段零套件。不得新增 framework、polyfill、圖示套件、外部字型、CDN、API、雲端計算或遙測。
- 排程核心不依賴 DOM、系統時鐘、時區、Intl 日期格式、Date.parse 或 new Date(dateString)。
- 輸入只視為不可信資料。schema 必須 fail closed；所有使用者文字只作文字節點顯示，不組成 HTML。
- HTTP 預覽伺服器只能綁定 127.0.0.1，預設 port 4206；不可公開監聽。

## 預定檔案樹

    package.json
    wrangler.jsonc
    scripts/
      serve.mjs
      check.mjs
      build.mjs
    public/
      index.html
      en/
        index.html
      styles/
        app.css
      js/
        app.mjs
        i18n.mjs
        core/
          civil-date.mjs
          reading-plan.mjs
          report.mjs
    test/
      civil-date.test.mjs
      reading-plan.test.mjs
      report.test.mjs
      ui-contract.test.mjs
      site-build.test.mjs
    public/robots.txt             M1 預覽限索引拒絕內容
    dist/                         由 build 建立，不納入來源 ZIP

不得把 docs、test、原始書名或測試輸入複製進 dist。wrangler 設定採 Cloudflare 靜態資產，不配置可處理讀書資料的 Worker 程式入口；正式部署閘門在 M2。

## 套件命令契約

    npm run dev    -> node scripts/serve.mjs
    npm test       -> node --test
    npm run check  -> node scripts/check.mjs
    npm run build  -> node scripts/build.mjs

package.json 設 type=module、private=true，dependencies 與 devDependencies 都為空。serve.mjs 預設只監聽 127.0.0.1:4206，只提供 public/。scripts 必須真的檢查或建置，不可用永遠成功的空腳本代替。每項任務只可呼叫先前任務已建立的命令與檔案。

## 嚴格輸入 schema

核心入口接受 unknown。預期唯一可接受的頂層資料是：

    {
      titleRaw: string,
      totalPagesRaw: string,
      completedPagesRaw: string,
      startDateRaw: string,
      endDateRaw: string,
      weekdays: dense number[],
      dailyCapRaw: string
    }

檢查順序及規則：

1. 根值只能是普通物件且不能是陣列；prototype 只接受 Object.prototype 或 null。以 Reflect.ownKeys 取得所有 own keys，拒絕 Symbol、缺欄位、任何額外 own key，包括 non-enumerable 額外 key。
2. 七個欄位各自必須是 own、enumerable、data property。檢查 property descriptor，不讀取 getter；不接受 accessor。Proxy trap 造成檢查失敗時捕捉並回傳 SCHEMA_UNINSPECTABLE，不拋出原始例外。
3. weekdays 必須是同 realm 的一般 Array，prototype 為 Array.prototype，length 為 0 至 7；恰有 length 個索引 own data property，無洞、額外字串 key、Symbol 或 accessor。Proxy/subclass 不作為輸入格式。空陣列在結構上可安全檢視，之後以 WEEKDAYS_EMPTY 作為語意錯誤回傳。
4. weekdays 每個值是 1 至 7 的整數 Number 且唯一。排序只在建立正規化輸出時進行；原輸入不修改。
5. 其餘六欄依固定欄位順序檢查值型別及原始字串上限，接著做跨欄位與日期區間驗證。

所有錯誤結果均不含 schedule。未知欄位或無法安全檢視的 schema 直接拒絕，不嘗試猜測、展開 getter、JSON stringify 或呼叫使用者物件方法。

## 正規化與欄位錯誤

欄位以固定優先順序檢查：titleRaw、totalPagesRaw、completedPagesRaw、startDateRaw、endDateRaw、weekdays、dailyCapRaw。每個有錯的欄位最多記錄一個最早錯誤。所有欄位錯誤依此順序排序；跨欄位錯誤接在其後。primaryCode 是排序後第一個錯誤碼。Root schema 錯誤只有一個錯誤並立即返回。

穩定欄位錯誤碼：

| 欄位 | 錯誤碼 |
|---|---|
| 書名 | TITLE_TYPE、TITLE_TOO_LONG、TITLE_CONTROL、TITLE_SURROGATE、TITLE_TRIMMED_TOO_LONG |
| 總頁數 | TOTAL_TYPE、TOTAL_TOO_LONG、TOTAL_REQUIRED、TOTAL_FORMAT、TOTAL_RANGE |
| 已讀頁數 | COMPLETED_TYPE、COMPLETED_TOO_LONG、COMPLETED_REQUIRED、COMPLETED_FORMAT、COMPLETED_RANGE |
| 開始日 | START_DATE_TYPE、START_DATE_TOO_LONG、START_DATE_REQUIRED、START_DATE_FORMAT、START_DATE_INVALID、START_DATE_RANGE |
| 截止日 | END_DATE_TYPE、END_DATE_TOO_LONG、END_DATE_REQUIRED、END_DATE_FORMAT、END_DATE_INVALID、END_DATE_RANGE |
| weekdays | WEEKDAYS_TYPE、WEEKDAYS_EMPTY、WEEKDAYS_SPARSE、WEEKDAYS_EXTRA、WEEKDAYS_INVALID、WEEKDAYS_DUPLICATE |
| 每日上限 | DAILY_CAP_TYPE、DAILY_CAP_TOO_LONG、DAILY_CAP_FORMAT、DAILY_CAP_RANGE |
| 跨欄位／推導 | COMPLETED_GT_TOTAL、DATE_ORDER、DATE_WINDOW_TOO_LONG、NO_READING_DAYS |
| 頂層 schema | SCHEMA_SHAPE、SCHEMA_KEYS、SCHEMA_ACCESSOR、SCHEMA_UNINSPECTABLE |

根 schema 檢查錯誤優先於任何欄位錯誤。欄位值型別先檢查；非字串的 total/completed/start/end/dailyCap 各自回傳對應 `*_TYPE`，不讀取字串方法。字串欄位接著檢查 raw 長度，`.length` 必須不超過 256 個 UTF-16 code units；超過時依欄位回傳 `*_TOO_LONG`（書名為 `TITLE_TOO_LONG`），不再檢查 required、格式、日期或範圍。其後才做欄位語意驗證：total、completed、daily cap 以 ASCII 數字規則解析，不用 Number coercion 接受空字串、空白、指數或其他字元；前導零允許。書名先拒絕 C0/C1 控制字元，再手動掃描 surrogate pair，之後用 String.trim() 判斷最多 80 個 code units；空白書名有效。dailyCapRaw 空字串是唯一有效的「不設上限」表示。

跨欄位錯誤的追加順序是 COMPLETED_GT_TOTAL、DATE_ORDER、DATE_WINDOW_TOO_LONG、NO_READING_DAYS。只有依賴的欄位已單獨通過驗證時才計算對應錯誤。單欄位錯誤可以同時列出；因依賴欄位無效而無法推導的跨欄位錯誤不補猜。R=0 時不回傳 NO_READING_DAYS。

繁中與英文欄位訊息由固定 code-to-message 表提供，不把 exception、raw schema、書名或其他使用者輸入放進錯誤碼、console、URL 或日誌。

## 純函式介面

    parseISODate(raw: unknown) -> {ok:true, date:{year, month, day, ordinal, isoWeekday}} | {ok:false, code:string}
    weekdayForCivilDate(year: integer, month: integer, day: integer) -> 1..7
    enumerateAllowedDates(startDate, endDate, sortedWeekdays) -> CivilDate[]
    validateReadingPlanInput(input: unknown) -> {ok: true, normalized: NormalizedInput} | {ok: false, errors: Error[]}
    createReadingPlan(input: unknown) -> InvalidResult | InfeasibleResult | PlanResult
    serializePlanReport(plan: PlanResult, locale: "zh-Hant" | "en") -> string

函式以具名 ESM exports 提供。`NormalizedInput.title` 為 trim 後字串（允許空字串），其餘欄位都是已驗證的數字、ISO civil date tuple、排序後 weekday 數列或 cap/null；createReadingPlan 由它複製 `title` 至每種成功 plan result。讀取未信任物件的所有可能拋錯操作都在 validateReadingPlanInput 內受控；createReadingPlan 不因格式錯誤輸入拋出原始錯誤。正常結果是可 JSON 序列化的純值，不含 Date、DOM、Error 物件、原始輸入物件或函式。

## 日期演算法

日期字串只接受精確格式 YYYY-MM-DD，年、月、日均為 ASCII 固定位數。先檢查字串樣式、1900 至 2100 年範圍、月份範圍、每月天數與 Gregorian 閏年，再計算 ordinal。

閏年規則：能被 400 整除，或能被 4 整除且不能被 100 整除。2 月依此規則有 28 或 29 日。ordinal 設為從 0001-01-01 起算的零起點日數；daysBeforeYear(y) = 365 × (y-1) + floor((y-1)/4) - floor((y-1)/100) + floor((y-1)/400)，再加上該年此前月份天數與 day-1。0001-01-01 是 ISO 星期一，因此 weekday = (ordinal mod 7) + 1。

開始與截止日期先各自驗證，再比較 ordinal。閉區間長度為 end.ordinal - start.ordinal + 1，最多 366。日期枚舉以年月日 tuple 從起始日逐一前進，月末用已驗證的該月天數進位；ISO weekday 可由起始 ordinal 加位移求得。最多走訪 366 次。不得依本機時區、夏令時間、語言設定或 Date 字串解析。

輸出日期一律用手動補零格式化的 YYYY-MM-DD。weekday label 由 ISO weekday 固定查 zh-Hant/en 詞表，不呼叫 Intl 日期演算法。

## 排程與結果型別

結果是 tagged union，呼叫者必須分支 kind：

    invalid:
      {kind:"invalid", primaryCode:string, errors:[{code:string, field:string}]}

    infeasible:
      {kind:"infeasible", summary:{
        totalPages:number, completedPages:number, remainingPages:number,
        selectedStartDate:string, selectedEndDate:string,
        eligibleDayCount:number, dailyCap:number, capacityPages:number,
        shortfallPages:number, minimumReadingDays:number
      }}

    plan:
      {kind:"plan", title:string, status:"scheduled"|"no-remaining-pages",
       summary:{
         totalPages:number, completedPages:number, remainingPages:number,
         selectedStartDate:string, selectedEndDate:string,
         eligibleDayCount:number, minimumPagesPerReadingDay:number|null,
         readingDays:number, flexibleDays:number, lastReadingDate:string|null
       },
       schedule:[{
         date:string, isoWeekday:1..7, pagesPerDay:number,
         pageStart:number|null, pageEnd:number|null, kind:"reading"|"flex"
       }]}

invalid 不含 title、summary 或 schedule。infeasible 不含 title 或 schedule，也不會產生報告字串。兩種拒絕結果均不攜帶書名。所有成功的 plan 都有 `title:string`，值為通過驗證並 trim 後的 normalized title，空白書名為空字串；scheduled 和 no-remaining-pages 都遵守此欄位。`serializePlanReport` 只從 plan.title 取得書名，不回頭讀取輸入或 UI。plan/scheduled 的 schedule 含所有 D 個允許日，依日期升冪排序。R>0 時 minimumPagesPerReadingDay = ceil(R/D)、readingDays = min(R,D)、flexibleDays = D - readingDays，lastReadingDate 是最後一筆 pagesPerDay > 0 的日期。plan/no-remaining-pages 的 schedule 為空、minimumPagesPerReadingDay 為 null、readingDays 與 flexibleDays 皆為 0、lastReadingDate 為 null；eligibleDayCount 仍是真正計算出的 D。

對 R>0，先計算 q、r，依排序後的可讀日期分配。每個正數區間從 completedPages+1 開始接續前一日 endPage+1，最後必等於 totalPages。零頁日期 pagesPerDay=0 且兩個頁碼欄位都是 null。R=0 不枚舉為歷史閱讀記錄。

有 cap 時，容量乘法最多 10000 × 366，仍為安全整數。若 R>0、D>0 且 ceil(R/D)>cap，回傳 infeasible，capacityPages=cap×D、shortfallPages=R-capacityPages、minimumReadingDays=ceil(R/cap)。不得先建立排程再截斷。如果 R=0，零剩餘成功優先於容量檢查；基本 schema 與日期輸入仍要合法。

## 報告格式

報告以目前語言固定標籤、ISO 日期與 ASCII 十進位頁數組成，分隔字元固定為 LF。使用 join("\n") 產生，不加 BOM、不加最後 LF。沒有排程列時也不添加空白行。書名插入前已 trim 並排除控制字元；所有字串只透過 textContent 或 textarea.value 顯示。

繁中 scheduled 報告依序包含：

    Gloss Tools｜閱讀進度規劃
    書名：<裁切後書名或未填>
    狀態：這只是一份計畫，不代表實際追蹤完成閱讀。
    總頁數：<total>
    已讀頁數：<completed>
    剩餘頁數：<remaining>
    日期範圍：<selectedStartDate> 至 <selectedEndDate>
    可讀日：<eligibleDayCount>；每日最低需求：<minimumPagesPerReadingDay> 頁
    最後閱讀日：<lastReadingDate>；閱讀日：<readingDays>；彈性／休息日：<flexibleDays>
    <每個閱讀日：date｜weekday｜頁碼 pageStart–pageEnd（pagesPerDay 頁）>
    <每個彈性日：date｜weekday｜彈性／休息>

英文報告使用相同欄位順序與數值，標題為 Gloss Tools | Reading plan；書名空白時顯示 Not provided；狀態固定為 This is a plan. It does not track pages actually read. 日期仍為 ISO 格式。閱讀日列顯示 date | weekday | Pages pageStart–pageEnd (pagesPerDay pages)；彈性日顯示 date | weekday | Flexible / rest，不得印頁碼範圍。

P5 的繁中報告精確內容如下，字面上不包含第一行前空白或最後一行後 LF：

    Gloss Tools｜閱讀進度規劃
    書名：未填
    狀態：這只是一份計畫，不代表實際追蹤完成閱讀。
    總頁數：100
    已讀頁數：40
    剩餘頁數：60
    日期範圍：2026-10-19 至 2026-10-23
    可讀日：5；每日最低需求：12 頁
    最後閱讀日：2026-10-23；閱讀日：5；彈性／休息日：0
    2026-10-19｜星期一｜頁碼 41–52（12 頁）
    2026-10-20｜星期二｜頁碼 53–64（12 頁）
    2026-10-21｜星期三｜頁碼 65–76（12 頁）
    2026-10-22｜星期四｜頁碼 77–88（12 頁）
    2026-10-23｜星期五｜頁碼 89–100（12 頁）

P5 的英文報告相同數值與行序，內容為：

    Gloss Tools | Reading plan
    Book title: Not provided
    Status: This is a plan. It does not track pages actually read.
    Total pages: 100
    Pages completed: 40
    Pages remaining: 60
    Date range: 2026-10-19 to 2026-10-23
    Available reading days: 5; minimum pages per reading day: 12
    Last reading day: 2026-10-23; reading days: 5; flexible/rest days: 0
    2026-10-19 | Monday | Pages 41–52 (12 pages)
    2026-10-20 | Tuesday | Pages 53–64 (12 pages)
    2026-10-21 | Wednesday | Pages 65–76 (12 pages)
    2026-10-22 | Thursday | Pages 77–88 (12 pages)
    2026-10-23 | Friday | Pages 89–100 (12 pages)

no-remaining-pages 使用獨立狀態句「已無剩餘頁。這不代表曾記錄全書實際完成閱讀。」／“No pages remain. This does not record that the book was actually completed.”；列出書名、總頁數、已讀頁數、剩餘頁數為 0 與輸入日期範圍，再寫「本計畫沒有每日排程。」／“There is no daily schedule for this plan.” 不列 schedule rows，仍無最後 LF。

## 介面狀態與副作用

- app.mjs 以事件委派讀取表單原始字串並建立核心輸入；不得把 type=number 的浮點轉換結果當作原始值。
- 任何值改變先同步遞增 revision token、隱藏/清除舊結果、清除報告與 copy/download 按鈕。輸入尚未產生時不自動計算。
- 使用者按產生後呼叫 createReadingPlan；invalid 顯示有序欄位錯誤，infeasible 顯示純數摘要，plan 才渲染日程與報告。
- 書名用 textContent，表格/列表以 createElement 建立。禁止把使用者資料放進 innerHTML、DOM parser、selector、URL 或錯誤訊息。
- Clipboard API 只呼叫 navigator.clipboard.writeText(report)，且只從使用者明確點擊複製按鈕時啟動；絕不讀取 clipboard。拒絕時選取唯讀報告、顯示手動複製說明，不顯示成功。
- 剪貼簿single-flight限定同一當前結果：複製pending時停用重複點擊。每個請求保存revision、單調requestId、pageGeneration三元token；修改/清除/離頁即遞增適用token、清結果並把當前busy重設false。使用者修改後重新產生結果，可以啟動新請求B；瀏覽器舊請求A可能仍pending，不能聲稱已取消原生寫入。每個resolve/reject/finally先核對完整token，不符就完全no-op（包括不可清busy/改focus）；只有當前請求的finally可以解除當前busy。pagehide與pageshow.persisted都遞增pageGeneration。此模型不會讓舊A回呼清掉B的pending狀態，也不會因遺留busy永久鎖住新結果。
- 下載建立 UTF-8 text/plain Blob，anchor 的 download 固定 glossquote-reading-plan.txt；產生的文字沒有 BOM/尾端 LF。點擊後先讓瀏覽器開始下載，Object URL 延後、有界地 revoke（不得在同一同步呼叫堆疊立即 revoke；設定 1–30 秒 fallback cleanup timer），並記錄待清理 URL；pagehide 時立即 revoke 所有仍存在的 URL。
- pagehide 使 revision 失效、遞增 pageGeneration，並清記憶體狀態與所有表單值；pageshow.persisted 時再次遞增 pageGeneration 並重置。不得使用 unload 事件做唯一清除機制。
- 日期切換控制有明確標籤。原生 date 到文字模式時複製其 ISO value。由文字切回原生模式前，必須確認目前 raw 為空或精確、有效的 YYYY-MM-DD；若不是，維持文字模式並說明先修正或保留該輸入，不可因 date 控制的值清理行為而丟掉使用者字串。
- 繁中輸入法 composition 期間每次 input 都清除舊結果；在 isComposing=true 時不顯示尚未完成的即時欄位訊息，compositionend 後恢復正常狀態。

## 本機預覽與發布

M1 建立兩語靜態頁、Noindex 預覽輸出與 localhost 伺服器。使用瀏覽器 HTTP 預覽而非 file://；剪貼簿需在 HTTPS 或瀏覽器視為 secure context 的 loopback 預覽測試。API 被瀏覽器拒絕時必須仍可手動選取報告。

正式輸出路徑是 index.html 與 en/index.html，對應同語言 GlossQuote 首頁的 index.html 與 en/index.html。M1 預設 build 不宣告正式網址、不輸出 production canonical/hreflang 或正式 sitemap。主代理明確驗收並放行後，M2 原功能對話建立正式工具鏈與獨立 `dist-production/` 候選，加入 canonical、zh-Hant/en/x-default、production robots.txt、sitemap、404 頁及靜態 CSP/security headers；執行 production check/preview 並核對固定產物。原功能對話在 M2 以 reviewed publishing copy 發布來源至 KYStr/glossquote-labs-reading-plan，核實 public visibility/remote commit，從該固定 commit 產生固定檔名 `glossquote-labs-reading-plan-source.zip` 及 `.sha256` sidecar，核對 ZIP bytes、SHA-256 與檔案內容。M2 不呼叫 Cloudflare、不部署、不宣稱 live。

M3 由主代理在獨立驗收 M2 後，部署工具至 https://reading.glossquote.com（Worker 名稱 glossquote-reading-plan）並部署雙語首頁更新，驗證工具與首頁 live 頁面。來源 repo 為 KYStr/glossquote-labs-reading-plan。任何 Git/Cloudflare 權限只能使用既有核准途徑；不可修改持久 Windows 設定、全域/系統 Git、gh 或認證設定，也不可讀取或輸出憑證。

## 官方技術參考

- WHATWG HTML Standard，date state：日期控制項的 value 格式與有效日期字串規則。https://html.spec.whatwg.org/multipage/input.html#date-state-(type=date)
- WHATWG HTML Standard，頁面歷史與 pagehide/pageshow：bfcache 生命週期事件語義。https://html.spec.whatwg.org/multipage/nav-history-apis.html#the-pageshow-event
- W3C Clipboard API and events：Clipboard.writeText 與權限模型；程式只在使用者點擊後寫入，並處理拒絕。https://www.w3.org/TR/clipboard-apis/
- Node.js v24 官方 test runner：內建 node:test 與 node --test。https://nodejs.org/download/release/latest-v24.x/docs/api/test.html

# 閱讀進度規劃 — 既有規格保存

Task ID: `labs-26-reading-plan` · Spec ID: `spec-26-reading-plan`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 閱讀進度規劃：產品需求

狀態：SPEC_ONLY；本文件定義待實作行為，沒有產品或測試通過證據。

## 問題與成功狀態

目標使用者有一本書、明確的總頁數與截止日期，也知道哪些星期幾通常可讀。他們想把目前尚未讀的頁數平均分配到可讀日期，並在落後時更新已讀頁數與新開始日後重算。

成功狀態是使用者能檢查從已讀頁數之後開始、到全書最後一頁為止的逐日計畫，或看見足以自行調整日期的容量不足摘要。頁碼不能重複、跳過或倒轉。計畫不證明使用者真的讀完任何頁。

## 需求

### FR-01：單書閱讀計畫

一次只建立一本書的計畫。使用者可選填書名；空白書名仍可計算。頁碼採整數頁，範圍以 1 為第一頁。

### FR-02：明確的原始輸入與預設值

核心接受一個且僅一個物件，其欄位與型別如下：

    {
      titleRaw: string,
      totalPagesRaw: string,
      completedPagesRaw: string,
      startDateRaw: string,
      endDateRaw: string,
      weekdays: number[],
      dailyCapRaw: string
    }

欄位順序固定為 titleRaw、totalPagesRaw、completedPagesRaw、startDateRaw、endDateRaw、weekdays、dailyCapRaw。titleRaw 可為空；dailyCapRaw 可為空。其餘欄位必填且字串必須符合自己的格式。物件不得缺少欄位、帶有額外欄位或 Symbol 欄位；不得透過 getter 取得資料。細節與拒絕策略見 TECHNICAL.md。

初始畫面明確使用下列值：書名空白、總頁數空白、已讀頁數 0、開始日期空白、截止日期空白、星期一至星期五已選、每日上限空白。空白日期表示等待使用者選擇，絕不能偷偷使用今天或任何環境日期。

### FR-03：書名與整數驗證

- 書名原始字串最多 256 個 UTF-16 code units；前後以 ECMAScript trim 規則裁切後最多 80 個 UTF-16 code units。空白書名有效。
- 書名拒絕 C0/C1 控制字元與任何不成對的 UTF-16 surrogate。顯示與報告只使用裁切後字串，並以文字節點呈現。
- 整數欄位只接受 1 至 5 個 ASCII 數字字元。不得使用逗號、正負號、小數點、指數、空白或 Unicode 數字。前導零不會改變其數值。
- totalPagesRaw 的數值是 1 至 10000。
- completedPagesRaw 的數值是 0 至 totalPagesRaw，含邊界。
- dailyCapRaw 可為空；非空數值是 1 至 10000。
- 輸入值不會因失焦或日期輸入模式切換而被格式化、裁切或靜默改寫。僅排程標題使用裁切後書名；跨頁語言切換則依FR-09/10清除資料。

### FR-04：日期與可讀星期

- 開始與截止日期都必填，使用嚴格 YYYY-MM-DD，年、月、日欄位皆為固定位數 ASCII 數字。
- 支援範圍為 1900-01-01 至 2100-12-31，含邊界；只接受 Gregorian civil calendar 中真實存在的日期。
- 開始與截止日都包含在範圍中，截止日不得早於開始日。整個閉區間最多 366 個曆日。
- 星期使用 ISO 1 至 7：星期一為 1，星期日為 7。至少選一個；可不連續。輸入必須是無洞、無重複且無額外屬性的稠密陣列。核心會按升冪排序，因此相同星期集合不因輸入順序不同而改變輸出。
- 只將被選取的星期視為可讀日。沒有假日查詢、不預設法定假日，也不自動略過放假或其他事件。
- 原生日期控制項依瀏覽器介面顯示；備用文字輸入只接受明示的 YYYY-MM-DD。介面提供明確切換方式，不依照地區猜測或偷偷改寫日期。

### FR-05：每日頁數算法

令 R = totalPages - completedPages。令 D 為閉區間內 ISO 星期落在使用者所選 weekdays 的日期數。

當 R > 0 且 D > 0，令 q = floor(R / D)、r = R mod D。依日期升冪排序後，最早的 r 個可讀日各分配 q+1 頁，其餘可讀日各分配 q 頁。頁碼從 completedPages+1 起連續編排，最後一頁必為 totalPages。

當某日分配頁數大於零，回傳精確 pageStart、pageEnd 與 pagesPerDay。當某日分配零頁，該日期保留為彈性／休息日，pagesPerDay 為 0 且 pageStart、pageEnd 都是 null；畫面不能顯示倒轉頁碼區間。被選為非閱讀日的日期不出現在排程，也不計為彈性日。

R=0 是成功的「已無剩餘頁」狀態，schedule 為空陣列；不將全書標成歷史完成，也不憑空建立完成紀錄。即使 D=0，R=0 仍可成功；合法基本 schema、日期、weekday 輸入仍需通過驗證。

R>0 且 D=0 時回傳錯誤碼 NO_READING_DAYS。

### FR-06：每日上限與不可行結果

每日上限省略時不做容量檢查。指定上限 cap 時，若 ceil(R / D) > cap，整體結果是合法但不可行，不回傳部分 schedule、不顯示成功日曆、不允許複製或下載計畫。畫面只顯示 R、D、每日上限、總容量 cap × D、缺口 R - cap × D，以及至少需要的可讀日數 ceil(R / cap)。此摘要不保證選定區間已含足夠日期，也不代表已排妥。

若 ceil(R / D) <= cap，才回傳完整成功計畫。容量檢查不能截斷每日頁數或把超額工作移到區間以外。

### FR-07：三種互斥的核心結果

核心結果必須明確區分：

- invalid：schema、單欄位、欄位關係或沒有可讀日等輸入錯誤；有有序 errors 與 primaryCode，不含 schedule。
- infeasible：輸入合法，但 dailyCap 不足；回傳純數字容量摘要，不含 schedule。
- plan：合法且可行，status 為 scheduled 或 no-remaining-pages，附 summary 與 schedule。

使用者介面和任何 serializer 必須依 kind 分支；不可只檢查 schedule 是否為空來推斷成功、零剩餘或不可行。

### FR-08：明確產生與輸入變更失效

使用者按「產生閱讀計畫」或「重新計算計畫」才會呼叫核心。修改任一原始欄位、星期選取或日期輸入模式中的日期值時，必須同步清除既有結果、報告文字、複製與下載操作權限，並告知資料已變更、需重新產生計畫。不得在編輯期間顯示舊頁碼。

未曾產生計畫的初始畫面只顯示下一步提示，不在頁面載入時把空值當錯誤或製造範例結果。按產生後才顯示所有可恢復的欄位錯誤。輸入錯誤時保留原始值，不自動校正。

### FR-09：清除與資料生命週期

若任何使用者資料與預設值不同，清除動作先開啟繁中或英文確認對話框。按取消或 Escape 必須保留輸入、結果與焦點關係；按確認才清空書名、總頁數、日期、每日上限與結果，將已讀頁數設回 0、星期設回星期一至五。語言選擇不屬於書籍資料，清除時保留當前語言。

資料只存在目前文件記憶體與輸入控制項，不使用瀏覽器儲存。pagehide 時清空所有書籍輸入、結果、複製狀態、待處理 callback 與暫存下載 URL；bfcache 返回時若 pageshow.persisted 為 true，再次重置為該語言路徑的空白初始畫面。重新整理、離開頁面或關閉分頁後不恢復內容。

### FR-10：雙語介面與資料揭露

繁體中文靜態頁為預設入口，英文使用獨立的 /en/index.html URL。語言切換是明確的頁面連結，不用 JavaScript 保留草稿、不用 query/hash/localStorage 傳遞資料。每個語言連結旁都顯示「切換語言會清除目前輸入與計畫。」／“Changing language clears your inputs and plan.” 點擊後離開目前頁面，pagehide 先清除資料；新語言頁載入為自己的空白初始狀態，返回上一語言也不得復活舊資料。每種語言頁面都提供回到 Gloss Tools 相同語言首頁的連結。

兩種語言都明確說明這只是一份計畫，不會追蹤實際讀完頁數。開始日期與截止日期由使用者自行選擇。結果與報告在目前瀏覽器分頁產生，不儲存、不同步；重新載入或離開後即清除。

### FR-11：報告、複製與 TXT

只有 plan/scheduled 與 plan/no-remaining-pages 可產生唯讀文字報告、呼叫原生 Clipboard API 寫入與下載文字檔。infeasible 與 invalid 一律沒有可複製或可下載的計畫。

按複製時，只在明確使用者點擊後呼叫寫入；不讀取系統剪貼簿。API 不可用或拒絕時不顯示成功，選取唯讀文字並以同語言說明可手動複製。非同步成功／失敗回呼必須檢查版本 token；如果輸入已改變或 pagehide 已發生，舊回呼不得恢復舊結果或舊提示。

下載名稱固定 glossquote-reading-plan.txt，內容 UTF-8、無 BOM、最後一個字元後無額外 LF。內容只包含目前成功計畫，不含 HTML、不夾帶原始未裁切書名、不包含瀏覽器狀態或其他資料。

### FR-12：搜尋內容與正式網址

繁中正式頁為 https://reading.glossquote.com/index.html；英文正式頁為 https://reading.glossquote.com/en/index.html。每頁都有不同語言的 title、description、H1、說明和至少三則 FAQ，並連到相同語言的 GlossQuote 首頁。正式 canonical、zh-Hant/en/x-default hreflang、production robots、sitemap、404 與 CSP 只在 M2 主代理確認正式版本及網址後產生。

本機與一般預覽頁使用 noindex,nofollow，不輸出 production canonical 或正式索引 sitemap。不得聲稱流量、排名、安全認證、永久免費或所有瀏覽器均支援。

### FR-13：發布責任

M1 交付本機完整候選、程式與必要測試。M2 需主代理驗收和明確放行；放行後原功能對話建立正式 production 工具鏈與候選產物、發布來源至 KYStr/glossquote-labs-reading-plan，並生成固定來源 ZIP 與 SHA-256。M2 不部署、不宣稱正式網站已上線。任何 Git/gh 認證只能使用既有權限，不修改全域或系統 Git/auth 設定。M3 由主代理檢查 M2 證據後部署工具至 Cloudflare 免費網站、部署雙語首頁更新並驗證兩者；Worker 名稱是 glossquote-reading-plan。

交付狀態需保留 PASS、FAIL、NOT_RUN 的真實差別；M2/M3 完成後亦先標為已上線、待外部複驗，只有外部確認或必要修正獲確認後才標記該版本完成。


---

## 原文件 TECHNICAL.md

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


---

## 原文件 UX-SEO.md

# 閱讀進度規劃：介面與 SEO

狀態：SPEC_ONLY；本文件是介面與內容規格，沒有畫面或搜尋結果實測。

## 使用情境與設計方向

- 使用者：需要在期限內完成一本書的學生、讀書會成員或自學者。
- 時機：選定可開始日、截止日與每週可讀日；落後後手動更新已讀頁數與新開始日。
- 成功：一眼看見剩餘頁數如何沿日期分配、第一頁與最後一頁如何銜接，以及每天上限是否可行。
- 核心物件：按日期排序的頁碼分配清單。
- 主要風險：把計畫誤認為實際閱讀紀錄；隱藏零剩餘頁、無可讀日或每日上限不可行；錯把日期範圍或頁碼算錯。
- 平台：桌面與手機瀏覽器。鍵盤、繁體中文輸入法、日期控制、虛擬鍵盤與低階裝置都在驗收範圍。

模式：Product App。畫布以表單與真實排程為主，不設 SaaS hero、假統計、使用者見證或促銷區。

## 視覺系統

沿用 Gloss Tools 語意 token：暖紙色作背景、白色作工作區、墨色文字、acid green 標示被選取的可讀星期與成功的可行計畫；attention 使用既有 warning 色和文字圖示。所有文字、分隔線、控制邊界與 focus ring 遵照 docs/DESIGN-SYSTEM.md 的共用對比及尺寸要求。不要把 coral 當小字色，不使用遠端字型、圖示套件、彩色漸層或一排相同圓角卡片。

產品自己的識別手勢是「連續頁碼沿日期列往前接續」：排程每行用日期標籤加頁碼連續性提示；閱讀日有精確起訖頁，彈性日只顯示「彈性／休息」。不以空圖表或假進度條代替實際分配。

UI 字型使用 family UI token 和系統 fallback；數字頁碼可用 family data token。正文 15–17px、標題通常不超過 32–36px。對齊以左對齊為主，數字欄位可在足夠寬度下右對齊，但小螢幕仍須清楚標示單位。

## 版面草圖

桌面：表單與結果同一主畫布，表單佔較窄的一側，逐日計畫佔較寬的一側。結果不存在時，表單下方顯示空狀態，不留假資料。

    ┌──────────────── 閱讀進度規劃 ────────────────┐
    │ Gloss Tools                       繁體中文 | EN │
    │ [書名（選填）]                                  │
    │ [總頁數] [已讀頁數]                             │
    │ [開始日期] [截止日期]                           │
    │ [可讀星期：一 二 三 四 五 六 日]                 │
    │ [每日上限（選填）]       [產生閱讀計畫]          │
    │ 計畫只代表安排，不會記錄實際閱讀。              │
    ├───────────────────────────────────────────────┤
    │ 初始：選擇日期與總頁數後產生計畫。              │
    │ 結果：剩餘頁數／最後閱讀日／閱讀日／彈性日      │
    │       日期 → 頁碼連續分配清單                   │
    │       [唯讀報告] [複製] [下載 TXT] [清除]       │
    └───────────────────────────────────────────────┘

手機 320 CSS px：單欄，沒有固定側欄，主要動作緊接表單；輸入欄在虛擬鍵盤上方可捲到，結果逐行堆疊。

    ┌──────── 閱讀進度規劃 ────────┐
    │ 繁體中文 | English            │
    │ 書名（選填）                 │
    │ 總頁數                       │
    │ 已讀頁數                     │
    │ 開始日期                     │
    │ 截止日期                     │
    │ 可讀星期                     │
    │ 每日上限（選填）             │
    │ [產生閱讀計畫]               │
    │ 限制說明                     │
    │ 摘要                         │
    │ 日期 / 頁碼或彈性日          │
    │ 唯讀報告、複製、下載、清除   │
    └─────────────────────────────┘

## 控制項與行為

- 書名：可留空，單行文字欄位。Visible label「書名（選填）」／“Book title (optional)”。
- 總頁數、已讀頁數、每日上限：文字欄位加數字鍵盤提示，不用 type=number。Visible labels 保持顯示；欄位旁說明接受 ASCII 整數，總頁數 1–10000、已讀頁數 0–總頁數、每日上限 1–10000。
- 日期：開始與截止都有獨立標籤。支援的瀏覽器預設原生 date input；提供明確的文字輸入模式切換。文字模式提示精確格式 YYYY-MM-DD。無效或無法表達的文字不會自動轉成另一個日期。
- 星期：fieldset/legend 加七個獨立、帶文字的 checkbox；預設勾選一至五。選取狀態以 checkbox、文字與顏色共同呈現。
- 主要按鈕：首次顯示「產生閱讀計畫」／“Create reading plan”；已有結果後，輸入改動立即清除結果，按鈕改為「重新計算計畫」／“Recalculate plan”。不可自動替使用者選今天。
- 清除：清除目前書籍輸入、結果與報告。任何使用者輸入與預設不同時，先顯示確認對話框；取消保留原值與結果。
- 語言：繁中 / 英文是各自獨立的靜態 URL。以標示目標語言的原生連結前往另一頁；旁邊清楚提示「切換語言會清除目前輸入與計畫。」／“Changing language clears your inputs and plan.” 導覽會離開目前頁面，pagehide 先清除本分頁資料；新頁顯示其空白初始狀態。按瀏覽器返回或再次切回也不得還原前頁資料。不得把草稿放在 URL、history state、Web Storage 或 Cookie。繁中入口為 /index.html，英文為 /en/index.html。

## 可見狀態與必要文案

所有文字均有對應英文版本。控制項名稱、錯誤碼、結果狀態及報告標籤依 docs/PRIVACY-SECURITY.md 與 docs/DESIGN-SYSTEM.md。

| 狀態 | 繁體中文 | English |
|---|---|---|
| 初始空白 | 選擇開始與截止日期、輸入頁數，再產生計畫。 | Choose a start and end date, enter the page counts, then create a plan. |
| 常駐限制 | 這只是一份計畫，不會追蹤你實際讀完的頁數。輸入只留在此分頁；離開或重新載入即清除。 | This is a plan only; it does not track pages you actually read. Inputs stay in this tab and are cleared when you leave or reload. |
| 語言切換提示 | 切換語言會清除目前輸入與計畫。 | Changing language clears your inputs and plan. |
| 輸入已變更 | 資料已變更，舊計畫已清除。請重新計算。 | Your inputs changed. The old plan was cleared. Recalculate to see an updated plan. |
| 無剩餘頁 | 已無剩餘頁。這不代表曾記錄全書實際完成閱讀。 | No pages remain. This does not record that the book was actually completed. |
| 有可讀日的成功摘要 | 剩餘 {R} 頁；{D} 個可讀日；每日最低需求 {minRequired} 頁；最後閱讀日 {lastReadingDate}；閱讀日 {readingDays}；彈性／休息日 {flexDays}。 | {R} pages remain; {D} available reading days; at least {minRequired} pages per day; last reading day {lastReadingDate}; {readingDays} reading days; {flexDays} flexible/rest days. |
| 無可讀日 | 這段日期內沒有符合已選星期的可讀日。請更改日期或選取的星期。 | No selected reading weekday falls within this date range. Change the dates or selected weekdays. |
| 每日上限不可行 | 目前需要 {R} 頁，{D} 個可讀日最多可排 {capacity} 頁，缺少 {shortage} 頁。每日上限為 {cap} 頁；至少需要 {minDays} 個可讀日。這裡沒有排程，請調整條件。 | {R} pages remain. {D} available days can hold at most {capacity} pages, leaving a {shortage}-page gap. The cap is {cap} pages per day; at least {minDays} reading days are needed. No schedule was created; adjust the inputs. |
| 剪貼簿拒絕 | 無法使用剪貼簿。報告仍可在文字框中選取，請手動複製。 | Clipboard access was denied. Select the report in the text box and copy it manually. |
| 複製成功 | 已複製閱讀計畫。 | Reading plan copied. |
| 清除確認 | 要清除書名、頁數、日期、星期、計畫與報告嗎？ | Clear the title, page counts, dates, weekdays, plan, and report? |
| 清除確認按鈕 | 清除資料；保留目前內容 | Clear data; Keep current data |
| 報告沒有頁面列 | 本計畫沒有每日排程。 | There is no daily schedule for this plan. |

驗證訊息明說欄位、錯誤與修正方式，並以 aria-describedby 與錯誤欄位關聯。錯誤不只用顏色表示。invalid 時不留下任何舊摘要、頁碼列、複製或下載按鈕。

### 欄位錯誤文案

| 狀況 | 繁體中文 | English |
|---|---|---|
| 書名超出原始上限 | 書名太長，請縮短後再試。 | The title is too long. Shorten it and try again. |
| 裁切後書名超過 80 個 UTF-16 units | 書名裁切前後空白後最多可有 80 個字元。 | The trimmed title can be up to 80 UTF-16 code units. |
| 書名含控制字元或孤立 surrogate | 請移除控制字元或不完整的 Unicode 字元。 | Remove control characters or an incomplete Unicode character. |
| 未輸入總頁數 | 請輸入總頁數。 | Enter the total number of pages. |
| 總頁數不是 ASCII 整數 | 請輸入 1 至 5 位 ASCII 數字，不要加入空格或符號。 | Enter 1 to 5 ASCII digits without spaces or symbols. |
| 總頁數超出範圍 | 總頁數必須介於 1 至 10000。 | Total pages must be from 1 to 10000. |
| 未輸入已讀頁數 | 請輸入已讀頁數；若尚未開始，輸入 0。 | Enter pages completed; enter 0 if you have not started. |
| 已讀頁數不是 ASCII 整數 | 請輸入 1 至 5 位 ASCII 數字，不要加入空格或符號。 | Enter 1 to 5 ASCII digits without spaces or symbols. |
| 已讀頁數超出範圍 | 已讀頁數必須介於 0 與總頁數之間。 | Pages completed must be from 0 through the total page count. |
| 已讀頁數大於總頁數 | 已讀頁數不能大於總頁數。 | Pages completed cannot exceed total pages. |
| 日期空白 | 請選擇開始日期與截止日期。 | Choose both a start date and an end date. |
| 日期格式錯誤 | 請使用 YYYY-MM-DD，例如 2026-10-19。 | Use YYYY-MM-DD, for example 2026-10-19. |
| 日期不存在 | 這不是有效日期，請檢查年、月與日。 | This date does not exist. Check the year, month, and day. |
| 日期超出允許年份 | 日期必須介於 1900-01-01 與 2100-12-31。 | Dates must be from 1900-01-01 through 2100-12-31. |
| 截止日在開始日前 | 截止日期必須是開始日期當天或之後。 | The end date must be on or after the start date. |
| 區間超過 366 日 | 日期區間含首尾最多 366 天，請縮短日期範圍。 | The inclusive date range can be at most 366 days. Shorten it. |
| 沒有選取星期 | 至少選擇一個可讀星期。 | Select at least one reading weekday. |
| 星期資料不合法 | 請重新選擇星期一至星期日中的一個或多個日期。 | Select one or more weekdays from Monday through Sunday. |
| 沒有可讀日 | 這段日期內沒有符合已選星期的可讀日。請更改日期或選取的星期。 | No selected reading weekday falls within this date range. Change the dates or selected weekdays. |
| cap 格式錯誤 | 請輸入 1 至 5 位 ASCII 數字，或留空不設上限。 | Enter 1 to 5 ASCII digits, or leave the cap blank. |
| cap 超出範圍 | 每日上限必須介於 1 至 10000，或留空。 | The daily cap must be from 1 to 10000, or blank. |
| 非預期欄位型別 | 這個欄位格式不正確，請重新輸入。 | This field has an invalid value type. Enter it again. |
| 無法安全讀取計畫資料 | 無法安全檢查計畫資料。請重新整理並重新輸入。 | The plan data could not be validated safely. Reload and enter it again. |

## SEO 草案

Slug：reading-plan。正式入口預定為 https://reading.glossquote.com/index.html 與 https://reading.glossquote.com/en/index.html。正式部署與檢索設定等 M2 核准後才產生。

### 繁體中文

- title：閱讀進度規劃：依可讀日分配頁數｜GlossQuote Tools
- description：輸入總頁數、已讀頁數、日期範圍與可讀星期，將剩餘頁數分配到各閱讀日。可檢查每日頁數上限；工具不追蹤實際閱讀。
- H1：閱讀進度規劃
- 說明：選擇你真正能閱讀的日期與星期，平均分配尚未讀完的頁數。若進度落後，更新已讀頁數與開始日期後重新計算。計畫只用來安排，不會記錄你實際讀了幾頁。
- FAQ 1：「它如何分配剩餘頁數？」答：計算選定日期範圍內符合星期的可讀日，平均分配剩餘頁數；餘數由較早的可讀日先多分一頁。
- FAQ 2：「落後後怎麼更新計畫？」答：修改已讀頁數與新的開始日期，再按重新計算。工具不會自動追蹤閱讀或自動調整今天。
- FAQ 3：「會略過國定假日嗎？」答：不會。工具只依你選取的星期安排日期，不查詢所在地假日或學校行事曆；請自行調整可讀星期與日期。
- FAQ 4：「我的書名與計畫會保存或上傳嗎？」答：不需要帳號或雲端保存。資料只留在目前分頁；離開或重新載入後清除。複製與下載只會在你明確按下對應按鈕後執行。

### English

- title: Reading Plan: Set Pages by Reading Day | GlossQuote Tools
- description: Enter total and completed pages, a date range, and the weekdays you can read. Distribute remaining pages across those dates and check a daily page cap. The tool does not track reading.
- H1: Plan your reading progress
- Intro: Choose the dates and weekdays you can read, then split the remaining pages across them. If you fall behind, update the pages completed and the start date to calculate again. This is a plan, not a record of pages actually read.
- FAQ 1: “How are the remaining pages split?” Answer: The tool counts selected weekdays inside your date range and divides the remaining pages evenly. Earlier reading days receive the extra pages first.
- FAQ 2: “How do I update a plan after falling behind?” Answer: Change the completed page count and your new start date, then recalculate. The tool does not track reading or automatically move the start date to today.
- FAQ 3: “Does it skip public holidays?” Answer: No. It uses only the weekdays you select and does not check local holidays or school calendars. Adjust your dates and selected weekdays yourself.
- FAQ 4: “Are my book details saved or uploaded?” Answer: No account or cloud storage is used. Data stays in this tab and is cleared when you leave or reload. Copy and download happen only after you choose those actions.

### 索引規則

本機與候選預覽兩語頁都標示 noindex,nofollow，沒有 production canonical 或 production sitemap。M2 正式版才加入互相對應的 canonical、hreflang zh-Hant/en、x-default 指向繁中首頁、robots.txt、sitemap.xml、404 頁與靜態 CSP/security headers。production robots 只允許實際正式頁；404 不宣稱成功。正式連結包含兩語 GlossQuote 首頁：https://glossquote.com/index.html 與 https://glossquote.com/en/index.html。

不得以本地測試資料建立 schema 標記或虛構搜尋排名、評論、使用者數、節省時間、安全認證、永久免費或全面支援聲明。FAQ 必須在頁面可見且與結構化內容一致；M2 是否加入結構化資料由主代理按共用發布規格審核。


---

## 原文件 ACCEPTANCE.md

# 閱讀進度規劃：驗收案例

狀態：SPEC_ONLY；以下案例是未來驗收條件，未有任何一項產品 PASS 證據。

## 執行環境

- 純函式測試：Node.js 24+，使用內建 node:test、假的日期與數字；不連網、不讀取個人書目、不依賴作業系統時區。
- 本機瀏覽器：用 npm run dev 啟動 127.0.0.1:4206，再以瀏覽器開啟 HTTP 預覽；不可用 file:// 模式代替。剪貼簿測試要在 HTTPS 或瀏覽器承認的 loopback secure context。
- 必要桌面瀏覽器：至少一個可用的 Chromium 瀏覽器及版本，以 HTTP loopback 預覽執行本文件的 M1 必要 browser subset。以受控 writeText success/reject stub 驗證 copy UI 與 fallback；若現有工具無法提供原生剪貼簿成功證據，可將該原生子項記 NOT_RUN。其他瀏覽器只能記錄實測版本，不宣稱全面支援。
- 語言與文字輸入：必要地實測繁中及英文頁面。若桌面環境可使用繁體中文 IME，執行 B11；若沒有可用 IME，B11 可記 NOT_RUN 並說明環境，不以它阻斷 M1。
- 視窗：必要地以桌面 Chromium 的 responsive emulation 設成 320 CSS px 執行 B19 的窄視窗部分。200% 瀏覽器縮放可記 NOT_RUN 並註明原因，不阻斷 M1。必要案例發現水平頁面捲動、主要控制不可達或文字截斷即為 FAIL。
- 可選外部環境：真實 iOS/Android 裝置與虛擬鍵盤（B20）、低階裝置/CPU 降速效能實測（B21）、完整 DevTools Network/Storage 檢查（B22）都可記 NOT_RUN 並附明確原因；不是 M1 無條件 FAIL。靜態原始碼/建置檢查仍須確認未引入外部請求、追蹤或 storage API，但不得把這些檢查冒稱為完整 Network/Storage 實測。

## 測試夾具

共用 P5：

    {
      titleRaw: "",
      totalPagesRaw: "100",
      completedPagesRaw: "40",
      startDateRaw: "2026-10-19",
      endDateRaw: "2026-10-23",
      weekdays: [1, 2, 3, 4, 5],
      dailyCapRaw: ""
    }

共用 P3：同 P5，但 totalPagesRaw 為 "43"。
共用 P11：titleRaw 空白，totalPagesRaw "51"，completedPagesRaw "40"，日期 2026-10-19 至 2026-10-21，weekdays [1,2,3]，dailyCapRaw 空白。
日期測試可使用 totalPagesRaw "1"、completedPagesRaw "0"、指定日期與星期；除非案例另有說明，其餘欄位採合法值。

每個失敗案例須比對 kind、primaryCode 與 errors 順序；每個成功案例須比對指定 summary 與全部 schedule row 欄位。invalid/infeasible 的 schedule 屬性必須不存在。

## 核心純函式案例

| ID | 需求 | 輸入或變化 | 精確預期 |
|---|---|---|---|
| C01 | FR-05 | P5 | plan/scheduled；60 頁、D=5、最低 12、閱讀日 5、彈性日 0。日期 19 至 23 依序分配 12 頁：41–52、53–64、65–76、77–88、89–100。 |
| C02 | FR-05 | P3 | plan/scheduled；R=3、D=5，前三天 pagesPerDay=1、頁碼 41、42、43；後兩天 pagesPerDay=0、pageStart/pageEnd=null、kind=flex。不得出現 44–43 等倒轉區間。 |
| C03 | FR-05 | P11 | plan/scheduled；R=11、D=3，逐日 4、4、3 頁，頁碼 41–44、45–48、49–51。 |
| C04 | FR-06 | P5 且 dailyCapRaw="10" | kind=infeasible；R=60、D=5、cap=10、capacityPages=50、shortfallPages=10、minimumReadingDays=6；完全沒有 schedule。 |
| C05 | FR-06 | total=90、completed=40、P5 日期與 weekdays、cap=10 | R=50 正好等於 capacity；plan/scheduled，每天 10 頁，頁碼 41–50 至 81–90；不可誤判 infeasible。 |
| C06 | FR-06 | total=100、completed=0、P5 且 cap 空白 | plan/scheduled；每日上限未設定，不以任何預設 cap 拒絕；D=5，分配 20 頁/日，最後一頁 100。 |
| C07 | FR-05 | R=1、P5 範圍與 weekdays | 第一個可讀日分配 1 頁，其餘四天為 flex 且頁碼 null；readingDays=1、flexibleDays=4。 |
| C08 | FR-04/05 | 開始與截止同為 2026-10-19，選 [1]，R=1 | 閉區間只有一日；D=1；唯一列為 2026-10-19，1 頁。 |
| C09 | FR-04 | 2026-10-24 至 2026-10-25，選 [6,7]，R=1 | 週六、週日都計入；D=2，先週六 1 頁、週日 flex。 |
| C10 | FR-04 | weekday [1,2,3,4,5] 與 [5,4,3,2,1] 各跑 P5 | 兩個 plan 深度相等，所有 summary 與 schedule 欄位順序、值完全一致。 |
| C11 | FR-04/05 | P5，把日期範圍縮至 2026-10-20 至 2026-10-22，weekdays [1,2,3,4,5] | 只列 20、21、22 日；開始/截止均包含，不列區間外 19、23 日。 |
| C12 | FR-05 | total=40、completed=40、合法日期範圍內 D=5 | plan/no-remaining-pages，remaining=0、eligibleDayCount=5、schedule=[]、minimumPagesPerReadingDay=null、lastReadingDate=null；不建立歷史閱讀日。 |
| C13 | FR-05 | total=1、completed=1、2026-10-24 單日、weekdays [1] | D=0 仍是 plan/no-remaining-pages，schedule=[]，不回傳 NO_READING_DAYS。 |
| C14 | FR-05 | total=1、completed=0、2026-10-24 單日、weekdays [1] | kind=invalid，primaryCode=NO_READING_DAYS，無 schedule。 |
| C15 | FR-04 | 2024-02-28 至 2024-03-01、weekdays [1,2,3,4,5,6,7]、R=1 | D=3，列 02-28、02-29、03-01；閏日為 ISO weekday 4。 |
| C16 | FR-04 | 1900-02-28 至 1900-03-01、所有星期 | 1900 不是閏年，D=2；日期不得自動插入 1900-02-29。 |
| C17 | FR-04 | 2000-02-28 至 2000-03-01、所有星期 | 2000 是閏年，D=3；含 2000-02-29。 |
| C18 | FR-04 | 2026-01-01 至 2027-01-01、所有星期、R=1 | 閉區間恰為 366 日；日期窗有效。 |
| C19 | FR-04 | 2026-01-01 至 2027-01-02 | 閉區間 367 日，kind=invalid，primaryCode=DATE_WINDOW_TOO_LONG。 |
| C20 | FR-04 | start=2026-10-20、end=2026-10-19 | kind=invalid，primaryCode=DATE_ORDER；不枚舉日期。 |
| C21 | FR-04 | startDateRaw="2026-2-03" | kind=invalid，primaryCode=START_DATE_FORMAT；不可補零修復。 |
| C22 | FR-04 | startDateRaw="2026-02-30" | kind=invalid，primaryCode=START_DATE_INVALID；不得由 Date 自動進位到 3 月。 |
| C23 | FR-04 | startDateRaw="1899-12-31" | kind=invalid，primaryCode=START_DATE_RANGE。 |
| C24 | FR-04 | endDateRaw="2101-01-01" | kind=invalid，primaryCode=END_DATE_RANGE。 |
| C25 | FR-03 | total="10000"、completed="0"，其餘合法 | 邊界有效；輸出數值 10000/0，無精度損失。 |
| C26 | FR-03 | total="0" 或 total="10001" | 分別 invalid/TOTAL_RANGE；不得排程。 |
| C27 | FR-03 | total="1,000" | invalid/TOTAL_FORMAT；不移除逗號。 |
| C28 | FR-03 | total="١٠٠" 或 "１００" | invalid/TOTAL_FORMAT；Arabic-Indic 與全形數字不接受。 |
| C29 | FR-03 | 整數欄位分別給 "+3"、"-1"、"1e2"、" 3 "、"3.0" | 每個都 invalid 且使用對應欄位的 FORMAT 錯誤，不做 coercion 或 trim。 |
| C30 | FR-03 | total="10"、completed="11" | invalid/COMPLETED_GT_TOTAL；不可輸出負剩餘頁數。 |
| C31 | FR-03/06 | cap="1" 與 cap="10000" | 兩者單欄位均有效；排程是否可行再依 R/D 決定。 |
| C32 | FR-03 | cap="0" 或 cap="10001" | invalid/DAILY_CAP_RANGE；空字串才代表不設上限。 |
| C33 | FR-03 | titleRaw="  我的書  " | 正規化書名為「我的書」；原始輸入不被改寫，報告只使用裁切後版本。 |
| C34 | FR-03 | 書名恰 80 個 UTF-16 code units，包含 40 個合法 surrogate pair | 有效；不得把 40 個 emoji 當 80 個 code points 後錯誤拒絕。 |
| C35 | FR-03 | trim 後 81 個 UTF-16 code units | invalid/TITLE_TRIMMED_TOO_LONG。 |
| C36 | FR-03 | titleRaw 長度 257 個 UTF-16 code units | invalid/TITLE_TOO_LONG。 |
| C37 | FR-03 | 書名內含 C0/C1 控制字元 | invalid/TITLE_CONTROL；錯誤或 console 不回顯書名。 |
| C38 | FR-03 | 書名含孤立 high surrogate 或孤立 low surrogate | invalid/TITLE_SURROGATE；有效 surrogate pair 則可接受。 |
| C39 | FR-02 | 根物件缺少 dailyCapRaw、加入 extra 欄、加入 Symbol 欄或非列舉 own 欄 | invalid/SCHEMA_KEYS；無 schedule。 |
| C40 | FR-02 | titleRaw 用 getter；getter 計數器起始為 0 | invalid/SCHEMA_ACCESSOR；呼叫後 getter 計數器仍為 0。 |
| C41 | FR-02 | 以會讓 ownKeys trap 拋錯的 Proxy 傳入 | invalid/SCHEMA_UNINSPECTABLE；不讓原始 Proxy 例外逸出。 |
| C42 | FR-02 | weekdays 為空陣列、稀疏陣列、[1,1]、[0]、[8]、非陣列或帶自訂屬性 | 依序回傳 WEEKDAYS_EMPTY、WEEKDAYS_SPARSE、WEEKDAYS_DUPLICATE、WEEKDAYS_INVALID、WEEKDAYS_INVALID、WEEKDAYS_TYPE、WEEKDAYS_EXTRA。 |
| C43 | FR-03/04 | total="0" 且 startDateRaw 格式錯誤 | errors 依定義欄位順序列 TOTAL_RANGE 在 START_DATE_FORMAT 之前；primaryCode=TOTAL_RANGE。 |
| C44 | FR-03/04 | start 與 end 都合法但 end<start，且超長與否無從計算 | 只追加 DATE_ORDER，不追加 DATE_WINDOW_TOO_LONG。 |
| C45 | FR-05/FR-11 | P5 報告 | 繁中與英文報告逐字等於 TECHNICAL.md 中 P5 的相應報告；固定 LF、UTF-8、無 BOM、末尾無 LF。 |
| C46 | FR-05/FR-11 | P3（總頁 43、已讀 40、P5 日期與 weekdays）報告 | 繁中最後兩行精確為「2026-10-22｜星期四｜彈性／休息」與「2026-10-23｜星期五｜彈性／休息」；英文最後兩行為「2026-10-22 | Thursday | Flexible / rest」與「2026-10-23 | Friday | Flexible / rest」。不含頁碼區間、null 或倒轉頁碼。 |
| C47 | FR-03 | totalPagesRaw、completedPagesRaw、startDateRaw、endDateRaw、dailyCapRaw 各以 number/null/object 替代字串，其他欄位合法 | 每次均回傳對應 `TOTAL_TYPE`、`COMPLETED_TYPE`、`START_DATE_TYPE`、`END_DATE_TYPE` 或 `DAILY_CAP_TYPE`；不嘗試 coercion，沒有 schedule。 |
| C48 | FR-03 | 將 total、completed、start、end、cap 各自設為 257 個 ASCII code units；每次只更動一欄 | 依序回傳 `TOTAL_TOO_LONG`、`COMPLETED_TOO_LONG`、`START_DATE_TOO_LONG`、`END_DATE_TOO_LONG`、`DAILY_CAP_TOO_LONG`，且該欄不再報 required/format/range 錯誤。 |
| C49 | FR-03/FR-11 | 用 titleRaw="  A Book  " 建立成功 plan，再把 plan 傳給 serializePlanReport | scheduled 與 no-remaining-pages 成功結果都帶 `title:"A Book"`；報告只顯示 `A Book`。invalid 不附 title/summary/schedule；infeasible 保留容量summary，但不附title/schedule。 |

## 瀏覽器人工案例

| ID | 需求 | 操作 | 通過條件 |
|---|---|---|---|
| B01 | FR-02/08 | 首次開繁中頁 | 書名、總頁數、兩日期與 cap 空白；已讀是 0；星期一至五勾選；無今天預填、排程、範例資料或頁碼報告。 |
| B02 | FR-08 | 產生 P5，再逐一改動書名、總頁數、已讀、開始日、截止日、每一星期選項、cap | 每一個真實值改動都立即清除摘要、所有列、報告、複製與下載；畫面提示需重算，不會留下舊頁碼。 |
| B03 | FR-05 | 輸入 P5 並按產生 | 顯示 5 個可讀日及精確連續頁碼、摘要和「這只是一份計畫」提醒；鍵盤焦點留在可預期位置。 |
| B04 | FR-05 | total=completed，日期合法 | 顯示「已無剩餘頁」；不顯示歷史完成徽章、完成日期或每日完成列；仍可複製/下載零剩餘文字報告。 |
| B05 | FR-06 | 設定 cap=10 並輸入 C04 | 只顯示 R、D、容量、缺口與最低日數；無 schedule，複製/下載按鈕不可用。 |
| B06 | FR-09 | 有輸入與結果時按清除，再取消/Escape | 關閉對話框；所有原始值、weekday 選擇、報告與結果仍完全一致，焦點回到清除按鈕。 |
| B07 | FR-09 | 有輸入與結果時確認清除 | 書名/總頁數/日期/cap 空白、已讀歸零、星期恢復一至五，結果與報告消失；當前 UI 語言保留。 |
| B08 | FR-10/FR-09 | 輸入資料並產生計畫後，點另一語言的獨立頁面連結；再回上一頁並再次切換 | 連結旁可見清除提示；pagehide 清除來源頁資料，新語言頁為該路徑的空白初始值；返回或再次切換都不會復活舊輸入/結果。沒有資料被放入 URL、history state 或儲存。 |
| B09 | FR-04 | 在 native date 與明確文字模式間切換，嘗試一個無效 fallback 字串 | 有效 ISO 值原樣保留；無效字串時禁止切回 date 並明示原因，不清空、不補零、不猜測日期。 |
| B10 | FR-02/04 | 全程鍵盤操作星期 checkbox 和表單 | Tab/Shift+Tab 順序合理；星期名稱可讀；每個 checkbox 可操作；焦點雙層可見，錯誤與欄位關聯。 |
| B11 | FR-03/08 | 用繁中 IME 組合書名，再完成輸入 | 組合中舊結果立即消失；未完成組字時不閃現格式錯誤；compositionend 後保留使用者字串，不錯誤 trim 或改寫。 |
| B12 | FR-11 | 以受控 writeText success/reject stub 驗證成功與拒絕流程；可用時再執行原生 Clipboard API | 必驗：只在點擊後呼叫、fulfilled 才顯示成功、rejected 時選取報告並提示手動複製且不顯示成功、程式絕不讀 clipboard。原生 Clipboard API 證據若現有工具無法提供，可單獨標 NOT_RUN 並說明原因。 |
| B13 | FR-11 | 點擊成功計畫的下載並驗證建立的 Blob/report bytes；可用時檢查瀏覽器實際下載檔案 | 必驗：下載只對成功 plan 可用，檔名為 glossquote-reading-plan.txt，Blob 內容 UTF-8、無 BOM/尾端 LF 且與唯讀報告相同。若現有工具無法取得原生下載檔案 bytes，僅原生檔案檢查可標 NOT_RUN，Blob/按鈕流程仍須通過。 |
| B14 | FR-08/11 | 同一結果第一次複製pending時再點一次；接著修改並重算、啟動新請求B，再讓舊請求A resolve/reject/finally；另測pagehide | 同一結果pending只呼叫一次writeText。編輯/清除/離頁會遞增token並重設當前busy，重算後可啟動B。舊A的三元token不符即完全no-op，不能解除B busy或更動任何UI；只有當前三元token相符的finally能解除當前busy。瀏覽器已開始的舊寫入無法撤回，此測試不宣稱取消原生副作用。 |
| B15 | FR-09 | 必驗：在可控測試環境呼叫 pagehide handler，再呼叫 pageshow handler 並令 persisted=true；可用時另由瀏覽器返回實際 BFCache 頁 | 必驗事件邏輯：pagehide 清空表單/記憶體、使 callback token 失效；pageshow.persisted 再重置為空白初始狀態。實際 BFCache 子項只有在能證明瀏覽器確實恢復 persisted page 時才算實測；無法取得該證據時單獨標 NOT_RUN，不可把合成事件稱為真 BFCache。 |
| B16 | FR-10/FR-12 | 在繁中及英文預覽頁檢查 title、description、H1、至少三個 FAQ、首頁與語言連結 | 每頁內容使用自身語言並符合上文；preview 是 noindex,nofollow，沒有 production canonical/hreflang/sitemap 宣稱。 |
| B17 | FR-04 | 從原生日期控制切到文字模式並手動輸入閏日與格式錯誤日期 | 2024-02-29 可正確接受；2024-2-29 被拒絕且原文保留；無本機日期格式或時區漂移。 |
| B18 | FR-08/可及性 | 單靠鍵盤完成輸入、產生、選取唯讀報告、清除確認與取消 | 不依賴 pointer、hover 或顏色；所有錯誤可定位、對話框關閉還原焦點。 |
| B19 | FR-08/可及性 | 必要子測試：responsive emulation 設為 320 CSS px；另可選擇測 200% 瀏覽器縮放 | 必要 320 px 子測試：內容單欄重排，沒有整頁水平捲動；主要動作、錯誤、報告與清除均可到達；文字不截斷。200% 縮放結果另記；未測可 NOT_RUN，不阻斷 M1。 |
| B20 | FR-08/環境 | 在手機打開日期選擇器與虛擬鍵盤，滾動表單 | 聚焦控制與主要按鈕不被固定元素或安全區遮住；頁面可以垂直捲動。 |
| B21 | FR-05/環境 | 在低階裝置或 CPU 降速環境算 366 日最長區間 | 可讀日不超過 366；不凍結，產生與繪製不超過 500 ms；超過即記失敗並修正，不將估計當實測。 |
| B22 | FR-09/FR-10 | 使用 DevTools 網路與儲存檢查後重新載入 | 沒有第三方請求、遙測、Cookie、本機/工作階段/IndexedDB 資料；重新載入後沒有書名或計畫。 |
| B23 | FR-11 | invalid 與 infeasible 各自嘗試尋找複製、下載操作 | 兩種狀態都沒有可用 copy/download，也沒有舊 report 可選。 |
| B24 | FR-03/FR-04 | 對日期與數字欄輸入空白、非 ASCII 數字、符號與不可行日期 | 錯誤訊息精確說明欄位及修正方式，原始值仍可編輯，不偷偷轉換，也不洩漏到 URL/console。 |
| B25 | FR-11 | 以可控 URL/timer harness 驗證生命週期；可用時另觀察原生下載 | 必驗：URL 不在 anchor.click 的同步呼叫堆疊立即撤銷，設定 1–30 秒 fallback cleanup timer，pagehide 即時撤銷尚存 URL。若現有工具無法提供原生下載事件證據，原生子項可標 NOT_RUN；不能略過 URL/timer 邏輯驗證。 |

## M1 命令與判定

在最後一輪程式變更穩定後，M1 功能對話對最終版本各執行一次：

    node --version
    npm test
    npm run check
    npm run build

M1 必要 browser subset：在一個記錄版本的桌面 Chromium 實際操作 B01–B10、B12–B18、B23–B25，以及 B19 的 320 CSS px 子測試。B12 的 success/reject UI 與 fallback、B13 的按鈕/Blob 報告契約、B15 的 pagehide/pageshow handler 邏輯、B25 的 URL/timer 邏輯必驗；若現有工具無法提供原生剪貼簿證據、瀏覽器下載檔案 bytes 或真 BFCache 恢復證據，分別將這些原生子項標 NOT_RUN 並說明原因，不能把 stub/synthetic 事件寫成原生實測。B11 只有在環境提供繁中 IME 時必跑；沒有時記 NOT_RUN 與原因。B19 的 200% 縮放、B20 真機、B21 低階/降速環境、B22 完整 Network/Storage DevTools 檢查可以 NOT_RUN，不能將它們當成 M1 無條件 FAIL。不得把桌面 emulation 當真機、靜態檢查當完整 DevTools 實測，或把本文件預期說成已通過。各項逐一標 PASS、FAIL、NOT_RUN，附版本/裝置與可重現證據。

Node 主版本小於 24 時記錄環境限制，不安裝全域套件或改持久 PATH。上述命令只驗證本機程式；瀏覽器 API、排版、鍵盤、剪貼簿與 bfcache 的必要案例仍須實際人工操作。只有指定的外部環境案例可按上段記錄 NOT_RUN。

M2 需主代理驗收並放行後，原功能對話才建立 production 工具鏈、發布公開來源並產生固定來源 ZIP；M2 不部署。M3 由主代理獨立驗收 M2 證據後部署工具及雙語首頁並正式驗證。SPEC_ONLY 規格作者不執行任何產品命令或發布/部署操作。


---

## 原文件 TASKS.md

# 閱讀進度規劃：任務拆解

狀態：SPEC_ONLY；每項任務都是未來功能對話工作，不代表已開始或完成。

## 責任與先讀文件

主代理完成本規格、選擇原功能對話並傳遞完整上下文。功能對話請求設定為 gpt-6.1-sol、max；設定請求與可驗證的實際模型身分分開記錄，不宣稱文字提示切換了執行模型。原功能對話負責 M1 本機完整候選；M1 經主代理獨立驗收及明確放行後，同一原功能對話負責 M2 production 工具鏈/候選、公開來源與固定 ZIP。主代理負責 M3 工具及共用首頁部署與驗證。

每項開始前，功能對話先讀 START-HERE.md、AGENTS.md、TASK-ENTRY.md、project.json、HANDOFF.md、六份產品規格，以及 docs/BRAND.md、docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md、docs/DESIGN-SYSTEM.md、docs/RELEASE.md。需要更改的每一項只可修改自己列出的專案內 allowed paths；不能修改根、共用首頁、兄弟產品或全域設定。

部署與發布依賴主代理放行。既有 Git/gh 權限若不可用就是停點；不得執行 gh auth login/refresh/setup-git、全域/系統 git config、環境變數或持久 Windows 設定變更。不得讀取或列印 credential。此規格不准新增依賴、權限或成本。

## T00：建立本機骨架與研究閘門

- 前置：M0 六份規格與主代理提供的共同交接文件都存在。
- Allowed paths：package.json、wrangler.jsonc、scripts/serve.mjs、scripts/check.mjs、scripts/build.mjs、public/index.html、public/en/index.html、public/styles/app.css、public/js/app.mjs、public/js/i18n.mjs、public/js/core/civil-date.mjs、public/js/core/reading-plan.mjs、public/js/core/report.mjs、public/robots.txt。
- 步驟：確認 Node 24+ 可用且無需安裝套件；確認本機伺服器只綁定 127.0.0.1:4206；建立 bilingual static shell、預覽 noindex、標籤與空初始狀態。記錄 HTML date、clipboard 與 pagehide 官方規格參考。沒有資料流出或第三方網路呼叫。
- 驗收：node --version；npm run check；npm run build。每個命令必須已由本任務建立為真實腳本。
- 完成條件：本機路徑能以 HTTP 預覽；初始日期空白、星期一至五、書名與總頁數空白、已讀 0、cap 空白；雙語靜態入口存在；依賴清單為空。
- 回寫 HANDOFF.md：建立的路徑、Node 版本、命令真實結果及未驗項。不得聲稱日期或瀏覽器行為已通過。

## T01：純 Gregorian 日期核心

- 前置：T00。
- Allowed paths：public/js/core/civil-date.mjs、test/civil-date.test.mjs。
- 步驟：實作嚴格日期 parser、Gregorian 月日/閏年、ordinal、ISO weekday、手動格式化、閉區間最多 366 日的純函式。只做 bounded civil arithmetic；不使用本機時區、Intl 或 Date parser。
- 驗收：node --test test/civil-date.test.mjs；npm run check。
- 完成條件：ACCEPTANCE.md C15–C24 及對應邊界測例全有自動測試，無不穩定系統日期輸入。
- 回寫 HANDOFF.md：實際測試結果與程式路徑。

## T02：嚴格 schema、分配與可行性核心

- 前置：T01。
- Allowed paths：public/js/core/reading-plan.mjs、test/reading-plan.test.mjs。
- 步驟：實作 exact own-key/data-property schema、getter/proxy fail-closed、field error code 與優先序、整數 ASCII 驗證、weekdays 正規排序、R/D 及逐日分配、R=0 和 cap infeasible tagged union。不得產生部分 infeasible 排程。
- 驗收：node --test test/reading-plan.test.mjs test/civil-date.test.mjs；npm run check。
- 完成條件：ACCEPTANCE.md C01–C44、C47–C48 對應測例通過；完成、彈性日和不可行結果三種狀態不混淆。
- 回寫 HANDOFF.md：測試總數、命令退出碼、未測環境。

## T03：雙語純文字報告

- 前置：T02。
- Allowed paths：public/js/core/report.mjs、test/report.test.mjs。
- 步驟：只接受 plan result；以固定詞表和序列生成 zh-Hant/en 報告。處理無書名、scheduled、零頁彈性日及 no-remaining-pages；不序列化 invalid/infeasible。
- 驗收：node --test test/report.test.mjs test/reading-plan.test.mjs；npm run check。
- 完成條件：C45–C46、C49 與 C01–C03/C12 的報告輸出逐字、bytes、LF、BOM、末尾字元都符合 TECHNICAL.md；報告書名只由成功 plan.title 提供。
- 回寫 HANDOFF.md：報告測例與實際 bytes 檢查證據。

## T04：兩語表單與排程介面

- 前置：T00–T03。
- Allowed paths：public/index.html、public/en/index.html、public/styles/app.css、public/js/app.mjs、public/js/i18n.mjs。
- 步驟：完成可切換語言的表單、日期模式切換、weekday checkbox、明確產生/重算、欄位錯誤、summary、schedule、invalid/infeasible/no-remaining/empty states。透過文字節點呈現書名；不依賴 framework 或 remote asset。
- 驗收：npm run check；人工執行 B01、B03–B10、B16–B18、B23–B24 與 B19 的 320 CSS px 子測試。B11 在環境有繁中 IME 時執行，沒有時記 NOT_RUN 與原因；B19 的 200% 部分及 B20–B22 可 NOT_RUN。
- 完成條件：修改任何值立即清舊結果與操作權限；錯誤、不可行和可行狀態各自明確；320 CSS px 響應式版面與鍵盤皆可達，真機另依 B20 記錄或 NOT_RUN。
- 回寫 HANDOFF.md：各瀏覽器、視窗寬度、語言與人工案例實際 PASS/FAIL/NOT_RUN。

## T05：複製、TXT、清除與頁面生命週期

- 前置：T04。
- Allowed paths：public/js/app.mjs、public/js/core/report.mjs、test/report.test.mjs、test/ui-contract.test.mjs、public/styles/app.css、public/index.html、public/en/index.html。
- 步驟：成功 plan 才能複製/下載；Clipboard writeText 只在按鈕點擊後呼叫；single-flight 鎖阻止重複未完成寫入，callback 以 revision、requestId、pageGeneration 三元 token 保護當前狀態；拒絕時選取文字並提示手動複製。建立精確檔名/編碼下載；Object URL 延後且有界清理；建立可取消的清除確認；pagehide 清除內容與 Blob URL，bfcache 返回重置。
- 驗收：npm test；npm run check；執行 B06–B07、B12–B15、B23、B25 的必要 UI/fallback/handler 邏輯。原生 Clipboard 證據、原生下載檔案 bytes、真正 BFCache 恢復證據若現有工具無法提供，可各自標 NOT_RUN；writeText stub 行為、Blob/report 契約、pagehide/pageshow handler 與 URL/timer 邏輯仍必驗。B22 完整 DevTools Network/Storage 檢查也可 NOT_RUN，但 source/build 檢查仍須確認沒有 storage API、遙測或第三方請求。
- 完成條件：無讀取剪貼簿、無持久保存、失效 callback 不復活結果；不會讓 infeasible result 可複製。
- 回寫 HANDOFF.md：copy 權限兩種結果、實際下載 bytes、清除及生命週期證據。

## T06：內容、可及性與本機建置檢查

- 前置：T04–T05。
- Allowed paths：public/index.html、public/en/index.html、public/styles/app.css、public/js/app.mjs、public/js/i18n.mjs、scripts/check.mjs、scripts/build.mjs、test/site-build.test.mjs、public/robots.txt。
- 步驟：完成兩語 SEO 文案與可見 FAQ；確保 preview noindex；完成必要鍵盤、focus、對比與 320px reflow；build 只複製審核的 public。200% zoom、真機、低階裝置與完整 Network/Storage 可記 NOT_RUN。production canonical/hreflang/sitemap/404/CSP 等候 M2 主代理放行。
- 驗收：npm test；npm run check；npm run build；人工執行 B08–B10、B16–B19 的 320 CSS px 子測試、B23–B24。B11 若無 IME、B19 的 200% 部分、B20–B22 可記 NOT_RUN 並說明原因。
- 完成條件：ACCEPTANCE.md 所列 M1 必要 browser subset 有真實結果，外部環境案例可記 NOT_RUN 並說明原因；不得用靜態檢查替代必要瀏覽器案例。檢查與建置腳本不是永遠成功的空命令。
- 回寫 HANDOFF.md：完整結果及明確 NOT_RUN 清單。

## T07：M1 本機完整候選與交接

- 前置：T00–T06。
- Allowed paths：本專案中本任務之前各項列出的程式、測試、public、scripts、package.json、wrangler.jsonc，以及功能對話負責的 HANDOFF.md、project.json、START-HERE.md、TASK-ENTRY.md、docs/RELEASE-CANDIDATE.md；限更新本工具的狀態、版本、驗收與候選證據，不得改寫共用政策、其他工具或首頁內容。
- 步驟：凍結候選內容，確認差異僅在本專案允許路徑；對最終輸入各執行一次 M1 必要命令；逐案記錄 ACCEPTANCE.md PASS/FAIL/NOT_RUN；記錄正式網址、repo/Worker 預定名但狀態仍未發布。
- 驗收：node --version、npm test、npm run check、npm run build；執行 ACCEPTANCE.md 所列 M1 必要 browser subset（桌面 Chromium：B01–B10、B12–B18、B23–B25 與 B19 的 320 CSS px 子測試）。B12 native clipboard、B13 native downloaded file bytes、B15 真 BFCache 可在工具無法提供原生證據時分別 NOT_RUN；對應的 stub UI/fallback、Blob、pagehide/pageshow handler 必須驗證。B11 僅在可用 IME 環境必要；B19 的 200%、B20–B22 可 NOT_RUN 並註明原因。若最後程式變更影響某 gate，重跑受影響 gate。
- 完成條件：本機候選可以重現；所有已知缺陷有修正或標明阻塞；交付主代理獨立驗收，不發布、不部署、不改首頁。
- 回寫 HANDOFF.md：固定候選 commit/工作狀態、每項命令與真實結果、裝置/版本、已知限制、NOT_RUN 與主代理下一步。M1 不得標成網站已上線或產品完成。

## T08：M2 production 候選、公開來源與固定 ZIP（原功能對話）

- 前置：T07 已交付，主代理已獨立驗收且明確放行。
- Allowed paths：只限本專案的 `package.json`、`wrangler.jsonc`、M2 production scripts (`scripts/build-production.mjs`、`scripts/check-production.mjs`、`scripts/preview-production.mjs`)、production metadata/header/page templates (`production/**`)、生成的 `dist-production/**`、功能對話擁有的 `HANDOFF.md`、`project.json`、`START-HERE.md`、`TASK-ENTRY.md`、`docs/RELEASE-CANDIDATE.md`，以及 repository-root `.runs/reading-plan-m2/` 任務證據目錄中的固定來源 ZIP 與 `.sha256` sidecar。M1 paths 只在 production command wiring 必需且不改變 M1 行為時可編輯。禁止改根、共用首頁或其他工具。
- 步驟：主代理放行後，原功能對話依既有授權用 reviewed publishing copy 建 production 工具鏈與獨立候選 `dist-production/`，實作 canonical、zh-Hant/en/x-default、production robots.txt、sitemap、404、靜態 CSP/security headers；執行 production check 與本機 preview，核對確切 URL/headers/bytes/404 與候選內容。其後照 docs/RELEASE.md 在發布前後驗證 Git settings guard 快照，發布至 public repo KYStr/glossquote-labs-reading-plan，核實 visibility 與 remote commit。從該固定 commit 產生固定檔名 `glossquote-labs-reading-plan-source.zip` 與 SHA-256 sidecar，驗 ZIP bytes、SHA-256 和每個檔案與 Git blob 一致。不得更動 global/system Git、gh auth 或 persistent environment。M2 不呼叫 Cloudflare、不部署、不宣稱網站 live。
- 停止條件：認證能力缺失、Git 設定快照異常、需要新權限/付費、正式網址或部署組態衝突。不得為了完成而變更 global/system Git/auth 或 persistent Windows 設定。
- 完成條件：原功能對話記錄 production candidate/version、必要命令真實結果、來源公開 repo/visibility/remote commit、固定 ZIP/bytes/SHA 與任何 NOT_RUN；完整證據交主代理獨立驗收。M2 不代表已部署或 live。
- 回寫 HANDOFF.md 與 docs/RELEASE-CANDIDATE.md：原功能對話填寫 M2 production manifest、source commit、visibility、ZIP hash、候選檢查證據與 NOT_RUN；主代理記錄 M2 獨立驗收結果。

## T09：M3 工具及共用首頁部署（主代理）

- 前置：T08 production candidate、來源 commit、固定 ZIP 已由主代理獨立驗收。
- Allowed paths：僅主代理部署閱讀工具及操作 tool-projects/00-home/catalog.json、共用首頁來源與其 HANDOFF；原功能對話只提供已驗證 M2 證據與雙語文案。
- 步驟：主代理依已核准的免費 Cloudflare 流程部署工具至 https://reading.glossquote.com/index.html 與 /en/index.html（Worker glossquote-reading-plan），驗 HTTPS/內容/headers/SEO/404 與必要核心流程；再先以 draft 更新目錄，live 工具核實後才切成 published。更新繁中/英文說明、範例和精確 URL，連結回相同語言首頁；重建、驗收、發布首頁 source，部署後逐一驗證兩語首頁的分類與連結。
- 完成條件：兩語目錄、首頁 source commit、正式首頁 deployment 與工具正式站都可核實。交付標示「已上線，待使用者外部複驗」；未收到外部確認不能標「完成」。
- 回寫 HANDOFF.md：主代理填寫實際首頁 commit/version、兩語 live URL 與外部複驗狀態。

## 停止與回報條件

發現需要新套件、權限、成本、憑證、公共 API、雲端資料或改動核心規則才可繼續時停止相關任務並向主代理報告具體差異。核心規則有不可調和矛盾時，先指出原文與受影響案例；不可私自刪掉錯誤碼、簡化安全 schema、放寬上限或降低驗收。其他獨立任務仍依賴與 allowed paths 繼續。

兩次相同失敗且沒有新證據後，停止盲目重試，改查根因或記錄阻塞與下一個必要行動。保留使用者資料、其他對話、服務、進程和未提交修改；不得用 destructive Git 命令。


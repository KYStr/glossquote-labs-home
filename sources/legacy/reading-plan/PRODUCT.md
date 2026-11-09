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

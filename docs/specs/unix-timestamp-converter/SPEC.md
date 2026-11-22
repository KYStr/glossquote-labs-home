# Unix 時間戳轉換 / Unix Timestamp Converter — SPEC

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-unix-timestamp-converter-20261121` · 2026-11-21 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/6263e103/coordination/work-registry.json) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

開發者、工程師或任何人在日誌、API 回應、資料庫欄位裡拿到一個 Unix 時間戳（例如 `1700000000` 或 `1700000000000`），想知道它是哪一天幾點；反過來，手上有一個日期時間（例如 2026-11-21 00:00 台北時間），想得到對應的時間戳拿去查 API 或寫進程式。

- 桌面。桌面貼上時間戳或填入日期時間，立即看到 UTC 與 Asia/Taipei 的對照，以及選定時區的讀法，並能以 ISO 8601、RFC 2822 或自訂格式複製／下載結果。
- 行動。手機在除錯現場把 API 回傳的時間戳翻成人類可讀時間，不用心算。

使用情境為設計假設。資料只保留在目前頁面草稿；不連網、不查即時時區資料。

## scope

雙向轉換：Unix 時間戳（秒／毫秒）↔ 人類可讀日期時間。固定顯示 UTC 與 Asia/Taipei，另加一個自選時區。輸出格式為 ISO 8601、RFC 2822、自訂格式三種。秒與毫秒的單位判別、負時間戳（1970 年之前）、閏秒、日光節約時間的缺失／重疊時刻，規則由本文釘版。

MVP 必做：兩個方向的轉換、單位選擇（秒／毫秒／自動判別）、9 個固定時區、3 種輸出格式、自訂格式 token、負時間戳、毫秒小數、閏秒拒絕、DST 缺失／重疊處理、相對時間以外的純轉換、雙語靜態頁、報告下載。

非目標：兩個日期相減（日期差計算）、倒數日數、時區之間的民用時間互轉（不以時間戳為中介的換算）、cron／週期排程、相對時間（「3 小時前」）、曆法換算（農曆、儒略日）、閏秒表查詢與維護、即時時區資料庫更新、把結果當作法律或天文認證。

已與本 checkout 的 `docs/specs/` 及 coordination registry 比對，最相近者的實質差異如下。

- 從一個時區的民用時間換到另一個時區的民用時間，核心是缺失／重疊時刻的解析規則與時區資料庫版本 provenance。此處以 Unix 時間戳（絕對時刻）為中介：時間戳 → 各時區讀法，或民用時間 → 時間戳；時區只決定顯示與解讀，不做時區對時區的換算；DST 缺失／重疊只在「民用時間 → 時間戳」方向出現。 [time-zone-converter](https://github.com/KYStr/glossquote-labs-home/blob/6263e103/docs/specs/time-zone-converter/SPEC.md)
- 從 cron 表達式找週期性時刻。此處是單一絕對時刻與單一民用讀法的雙向換算，不處理重複規則。 [cron-explainer](https://github.com/KYStr/glossquote-labs-home/blob/6263e103/docs/specs/cron-explainer/SPEC.md)
- `date-difference`、`days-until`：本 checkout 的 `docs/specs/` 與 coordination registry 均查無此二工具（2026-11-21 檢索，無命中）。若日後出現，差異為：彼等計算兩個日期之間的間隔（天數／倒數），此處轉換一個絕對時刻與一個民用讀法，絕不把兩個日期相減，也不輸出間隔或倒數。

判定規則由本文定義，無線上資料或外部服務依賴。時區偏移來自瀏覽器內建的 IANA 時區資料庫（經 `Intl.DateTimeFormat` 帶明確 `timeZone` 取用），不隨使用者裝置的 host 時區改變。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 方向切換「時間戳 → 日期時間 / Timestamp to date-time」與「日期時間 → 時間戳 / Date-time to timestamp」。
- 時間戳方向欄位：「時間戳 / Timestamp」、「單位：自動／秒／毫秒 / Unit: Auto / Seconds / Milliseconds」。
- 日期時間方向欄位：「日期 / Date」、「時間 / Time」、「毫秒 / Milliseconds」、「時區 / Time zone」。
- 共用欄位：「顯示時區／輸出時區 / Time zone」、「輸出格式：ISO 8601／RFC 2822／自訂 / Output format: ISO 8601 / RFC 2822 / Custom」、「自訂格式 / Custom format」。
- 「轉換 / Convert」是主要操作。「現在 / Now」填入目前時刻快照（標明為快照，非確定性輸入）。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 結果區先摘要（時間戳秒數、毫秒數、偵測到的單位），再列三組顯示：UTC、Asia/Taipei、選定時區（與前兩者重複時不重複列出）。每組顯示 ISO 8601 與 RFC 2822；格式選自訂時另顯示自訂格式結果。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。若民用時間落在 DST 重疊時段，以文字及符號提示「此本地時間出現兩次，採用較早者 / This local time occurs twice; the earlier occurrence is used.」。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"direction":"timestamp-to-datetime","timestamp":"","unit":"auto","date":"","time":"","milliseconds":"000","timezone":"Asia/Taipei","format":"iso8601","customPattern":"YYYY-MM-DD HH:mm:ss"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- `direction`：`"timestamp-to-datetime"` 或 `"datetime-to-timestamp"`。
- `timestamp`：ASCII 十進字串，可選前導 `-`，可選一個小數點後 1–3 位數字；無空白／符號／指數／千分位逗號。raw 最多 16 單元（含 `-` 與 `.`）。
- `unit`：`"auto"`、`"seconds"`、`"milliseconds"`。
- `date`：嚴格 `YYYY-MM-DD`，年 0001–9999 四位零補齊。
- `time`：嚴格 `HH:MM:SS`，00:00:00–23:59:59；`60` 秒不接受（見閏秒規則）。
- `milliseconds`：1–3 位數字，字面毫秒數 0–999（`"5"` 即 5 ms，不是 500 ms）。
- `timezone`：9 個固定值之一：`UTC`、`Asia/Taipei`、`Asia/Tokyo`、`Asia/Shanghai`、`Europe/London`、`Europe/Paris`、`America/New_York`、`America/Los_Angeles`、`Australia/Sydney`。其他值 UNSUPPORTED_ZONE。
- `format`：`"iso8601"`、`"rfc2822"`、`"custom"`。
- `customPattern`：最多 64 單元；token 僅 `YYYY`、`MM`、`DD`、`HH`、`mm`、`ss`、`SSS`，其餘字元為字面量；連續字母非 token 即 CUSTOM_FORMAT。
- 預設見 userFlow 的重設值。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null（本工具恆為 null）。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

驗證順序（固定，先錯先報）：

1. `direction` 文法（非兩個值之一為 SCHEMA，field=`direction`）。
2. 依方向驗證來源欄：時間戳方向驗 `timestamp`（raw 超限 INPUT_LIMIT、文法 INTEGER_FORMAT——小數點格式錯誤亦屬此碼、範圍 RANGE）；日期時間方向依 `date`、`time`、`milliseconds` 順序驗證（文法錯誤 DATETIME_FORMAT，`date` 不存在之日如 2026-02-29 為 INVALID_DATE，`time` 的秒為 60 為 LEAP_SECOND_UNSUPPORTED）。
3. `timezone`（UNSUPPORTED_ZONE）、`unit`（SCHEMA）、`format`（SCHEMA）、`customPattern`（僅 `format` 為 `custom` 時驗證：超長 INPUT_LIMIT、未知字母 token CUSTOM_FORMAT）。
4. 跨欄：日期時間方向，民用時間落在選定時區的 DST 缺失時段（不存在的本地時間）為 NONEXISTENT_LOCAL_TIME，field=`time`；落在重疊時段不報錯，採較早者並置 `ambiguousLocalTime:true`。

轉換規則（全部釘版）：

1. 紀元：Unix 時間戳 0 = 1970-01-01T00:00:00Z。曆法為前推格里曆（proleptic Gregorian）；閏年規則：能被 4 整除且（不能被 100 整除或能被 400 整除）。每日固定 86,400 秒（POSIX 定義，忽略閏秒）。
2. 範圍：日期 0001-01-01 至 9999-12-31。秒數範圍 −62,135,596,800 至 253,402,300,799；毫秒數範圍 −62,135,596,800,000 至 253,402,300,799,999。超出為 RANGE。
3. 單位判別（`unit` 為 `auto` 時）：取整數部分絕對值 N。N ≥ 10^12 判為毫秒；N < 10^11 判為秒；10^11 ≤ N < 10^12 為 AMBIGUOUS_UNIT，field=`timestamp`，須改選明確單位。`unit` 為 `seconds` 時接受整數秒或小數秒（小數 1–3 位，換算毫秒：0.5 s = 500 ms）；為 `milliseconds` 時只接受整數毫秒，小數點即 INTEGER_FORMAT。
4. 民用 ↔ 絕對時刻的換算使用整數日數算法（Howard Hinnant 的 `days_from_civil`／`civil_from_days`，或等價整數算法），以 BigInt 或等價整數運算進行，禁止用浮點秒數換算、禁止依賴 host 時區。毫秒部分獨立以整數攜帶：負時間戳的小數部分向負無限方向取整（例如 −1.5 s = −1,500 ms；−0.001 s = −1 ms）。
5. 時區偏移一律以 `Intl.DateTimeFormat` 帶明確 `timeZone` 取用瀏覽器內建 IANA 時區資料庫；Asia/Taipei 固定 +08:00、無日光節約。日期時間 → 時間戳時，先以該時區偏移猜測 UTC 時刻，格式化回本地時間比對，迭代修正至收斂；收斂後仍不符即為缺失時段；兩個偏移都收斂即為重疊時段，採較早者（UTC 時刻較小者）。
6. 閏秒：POSIX 時間不計閏秒。`23:59:60` 沒有獨立的時間戳——2016-12-31T23:59:60Z 與 2017-01-01T00:00:00Z 共用 1483228800（IERS 公告：1972–2016 年共插入 27 次正閏秒，最近一次為 2016-12-31，之後未再插入）。本工具不接受 `60` 秒輸入，亦不輸出 `60` 秒；時間戳跨越閏秒日的差值以名目秒計，不補閏秒。
7. 輸出格式（固定）：
   - ISO 8601：`YYYY-MM-DDTHH:MM:SS.sss` 加時區後綴；UTC 為 `Z`，其他時區為 `±HH:MM`（例如 `+08:00`、`-05:00`）。毫秒恆為 3 位。
   - RFC 2822：`Www, DD Mon YYYY HH:MM:SS ±HHMM`（例如 `Thu, 01 Jan 1970 00:00:00 +0000`）。星期與月份縮寫固定為英文三字母表：星期 Mon、Tue、Wed、Thu、Fri、Sat、Sun；月份 Jan、Feb、Mar、Apr、May、Jun、Jul、Aug、Sep、Oct、Nov、Dec。日為兩位零補齊。
   - 自訂格式：token `YYYY`（4 位年）、`MM`、`DD`、`HH`、`mm`、`ss`（皆兩位零補齊）、`SSS`（3 位毫秒）；其餘字元原樣輸出。
8. 結果形狀（固定）：
   `{direction, timestampSeconds, timestampMs, unitDetected, ambiguousLocalTime, displays}`。`timestampSeconds` 與 `timestampMs` 為安全整數（number）；`unitDetected` 為 `"seconds"` 或 `"milliseconds"`（時間戳方向為判別／指定結果；日期時間方向恆為 `"milliseconds"`，因結果以毫秒精度推導）；`ambiguousLocalTime` 為布林，僅 DST 重疊採較早者時為 true；`displays` 為陣列，順序固定為 UTC、Asia/Taipei、選定時區，選定時區與前兩者重複時不重複列出；每組為 `{zone, iso8601, rfc2822, custom}`，`custom` 僅 `format` 為 `custom` 時為字串，否則為 null。機器值不隨 locale 改。

固定下載 `unix-timestamp-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/unix-timestamp-converter/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「轉換」，雙向畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。14 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `epoch-zero` | 時間戳 0 → 1970-01-01 UTC 與台北 08:00 |
| `ms-auto-detect` | 13 位數自動判為毫秒，UTC 與紐約顯示 |
| `negative-one` | −1 秒 → 1969-12-31 23:59:59Z |
| `negative-day` | −86400 秒 → 1969-12-31 00:00:00Z |
| `fractional-seconds` | 0.5 秒 → 500 毫秒 |
| `taipei-midnight-to-timestamp` | 台北午夜 → 時間戳 |
| `leap-day` | 閏日 2024-02-29 12:00 UTC |
| `dst-overlap-earlier` | DST 重疊採較早者並標示 |
| `dst-gap` | DST 缺失時刻報錯 |
| `ambiguous-unit` | 10^11–10^12 區間須明確選單位 |
| `leap-second-rejected` | 23:59:60 拒絕 |
| `invalid-date` | 2026-02-29 不存在 |
| `out-of-range` | 超出 9999-12-31 報錯 |
| `custom-format` | 自訂格式 token 輸出 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證秒數上下界、毫秒上下界、自動判別的三段邊界（10^11−1、10^11、10^12−1、10^12）、負時間戳小數、0001-01-01、9999-12-31、2 月 29 日閏年規則（2000 年是閏年、1900 年不是）、DST 缺失與重疊、閏秒拒絕、自訂格式未知 token。所有已接受的結果在三組顯示間指向同一絕對時刻。

候選 gate（均 NOT_RUN）

- 於 `tools/unix-timestamp-converter/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「Unix 時間戳轉換」，title「Unix 時間戳轉換｜Gloss Tools」，description「把 Unix 時間戳換成人類可讀的日期時間，或把日期時間換回時間戳；UTC 與台北時間對照，支援秒／毫秒與多種輸出格式。」。英文 lang=en，H1 “Unix Timestamp Converter”，title “Unix Timestamp Converter | Gloss Tools”，description “Convert a Unix timestamp to a human-readable date-time, or a date-time back to a timestamp; shown in UTC and Taipei time, with seconds/milliseconds and several output formats.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。毫秒和秒怎麼分？13 位數通常是毫秒，10 位數通常是秒；中間地帶請明確選擇單位。 / How are milliseconds and seconds told apart? 13-digit values are usually milliseconds and 10-digit values seconds; values in between need an explicit unit choice.
- FAQ。閏秒怎麼處理？Unix 時間不計閏秒，23:59:60 沒有獨立的時間戳。 / How are leap seconds handled? Unix time does not count leap seconds, so 23:59:60 has no timestamp of its own.
- FAQ。1970 年以前可以嗎？可以，負時間戳代表紀元之前。 / Can I convert dates before 1970? Yes, negative timestamps are before the epoch.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://unix-timestamp-converter.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/6263e103/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/unix-timestamp-converter/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

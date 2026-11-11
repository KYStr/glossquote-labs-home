# 工作日計算機 / Workdays Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-workdays-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

排交期的人要在確切日期之間換算「工作日」，而不是自己翻月曆逐日數、還要心算假日落在週末算不算扣。

- 桌面。行政或專案人員對著合約上的「簽約後 10 個工作天內交付」，從簽約日往後加 10 個工作日得到目標日期；公司自訂休假日（例如年度歲修、公司紀念日）逐行貼上，逐一扣除。
- 行動。手機上確認報價期限或請假天數：「下週一到週五到底是幾個工作日？」把手上的假日清單貼進來核對。

成功結果是一個語義固定的工作日數（附週末天數、假日扣幾天、假日落在週末幾天、超出區間幾天、重複幾行）或一個確切目標日期；兩種模式互為反運算，可互相驗證。使用情境為日常排程假設，資料只保留在目前頁面草稿。

## scope

MVP 必做：模式 A 計數兩日期間的工作日；模式 B 從起日加減 N 個工作日。週末固定為週六、週日。工作日定義為週一至週五且不在使用者假日清單中的日期。假日清單由使用者逐行輸入，本工具不含任何內建假日資料。

非目標：內建任何國家或地區的官方假日表（台灣人事行政總處行事曆逐年公告且含彈性放假與補班日，逐年變動，不做）、自訂週末（例如週五／週六制）、半天或工時粒度、排班與輪班、重複性排程、引力／農曆換算。

已比對既有來源與預案，最相近者的實質差異如下。

- legacy `date-calculator`（`sources/legacy/date-calculator/`）做日期差（結束日減開始日，可為負數）與加減「日曆天」，其來源說明明示無時區／時鐘、工作日／假日功能。此處的核心是工作日的計數與步進，加上使用者自訂假日清單；單純日曆天差不在此重做。
- `spec-59-project-backplan` 是多任務依賴關係的工作日倒排排程。此處只有單一區間計數與單一起日步進，沒有任務、依賴或資源概念。

輸入日期限 1900-01-01 至 2100-12-31。模式 B 的 N 絕對值上限為 3660。假日最多 400 筆，原始文字最多 8192 個 UTF-16 單元。判定規則由本文定義，核心不依賴外部服務、系統時鐘或主機時區。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 模式切換「計算工作日數／加減工作日 / Count business days / Add or subtract business days」。
- 欄位「開始日期 / Start date」兩模式共用。
- 模式 A 欄位「結束日期 / End date」；模式 B 欄位「工作日數（可為負數） / Business days (may be negative)」。
- 欄位「自訂假日（每行一個日期，可留空） / Custom holidays (one date per line, may be empty)」為 textarea，以 DOM 的 LF 值為準。
- 主要操作隨模式為「計算工作日 / Count business days」或「計算目標日期 / Find target date」。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例（模式 A 的一週計數），明示範例並等待手動執行。
- 模式 A 結果區「區間內的工作日 / Business days in range」先摘要（工作日數）再列明細（日曆天數、週末天數、假日扣除、假日落在週末、假日超出區間、重複假日行）。模式 B 結果區「目標日期 / Target date」顯示日期與星期。成功才顯示「下載報告 / Download report」。文字可手動選取。切換模式不清除共用欄位，但結果立即失效回 dirty。

草稿固定含五欄 `{mode, startDate, endDate, days, holidays}`；執行時依目前模式投影為核心的四欄輸入（見 inputsOutputs），非目前模式的欄位不送入核心。模式值為 `count` 或 `shift`。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、模式、選項或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"mode":"count","startDate":"","endDate":"","days":"5","holidays":""}` 並聚焦模式切換。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。輸入依模式為下列確切欄位的普通物件，只讀 own data；欄位值全為字串。

- 模式 A：`{mode:"count", startDate, endDate, holidays}`。
- 模式 B：`{mode:"shift", startDate, days, holidays}`。

先檢查輸入是普通物件且 `mode` 存在並為字串，否則 SCHEMA（field,row=null）。`mode` 不是 `count`／`shift` 時回 ENUM（field=mode），此檢查在欄位集合檢查之前；之後該模式的欄位集合必須恰好相符，未知、缺欄、錯型別、accessor 皆 SCHEMA。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。

欄位規則（raw 長度以 UTF-16 code units 計）：

- `startDate`／`endDate`：raw 恰最多 10 單元；文法 `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`；須為真實公曆日期；範圍 1900-01-01 至 2100-12-31（含端點）。
- `days` 為最多 5 單元的原始字串，文法為 `^(0|-?[1-9][0-9]*)$`（拒絕 `-0` 與前導零），範圍為 -3660 至 3660（含端點）。
- `holidays` 的原始字串最多 8192 個 UTF-16 單元，CRLF 在容量檢查時占兩單元。以 LF 或 CRLF 切分，恰為空字串的行跳過但仍占行號。非空行須符合日期欄的文法、真實日期與範圍規則，且最多 400 筆。重複日期占一筆，去重後再計算。

每欄驗證順序固定：容量 INPUT_LIMIT、未成對 surrogate UNICODE、缺內容 EMPTY（`holidays` 例外：空字串代表無假日，合法，不回 EMPTY）、文法 DATE_FORMAT／INTEGER_FORMAT、文法合但非真實日期 INVALID_DATE（僅日期值）、範圍 RANGE。欄位順序固定：mode → startDate → endDate（模式 A）／days（模式 B）→ holidays。`holidays` 內部順序：先整串容量、整串 UNICODE，再逐行單次掃描；遇到第 401 筆非空行時先回 ROW_LIMIT（field=holidays，row=該行行號），先於該行內容檢查；每行依 DATE_FORMAT → INVALID_DATE → RANGE 檢查，row 為含空行在內數起的 1-based 行號。第一個錯誤即整份失敗，回 `{ok:false,error:{code,field,row}}`。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

星期編號固定 0=週日、1=週一、2=週二、3=週三、4=週四、5=週五、6=週六。週末為 {0,6}。顯示名稱：0 週日 Sunday、1 週一 Monday、2 週二 Tuesday、3 週三 Wednesday、4 週四 Thursday、5 週五 Friday、6 週六 Saturday。

語義（全部整數運算，無浮點、無捨入）：

1. 假日集合 H 為解析後去重的日期集合。某日為工作日 ⟺ 星期編號 ∈ {1,2,3,4,5} 且該日 ∉ H。
2. 模式 A 採有向半開區間。startDate ≤ endDate 時，計數集合為 {d : startDate < d ≤ endDate}（起日不計、訖日計入），businessDays 為其中工作日數。startDate > endDate 時 businessDays 為上式在交換後的負值。calendarDays = endDate − startDate（可為負）。weekendDays、holidaysSubtracted、holidaysOnWeekends 一律以無向正向區間 (min, max] 計算且非負：weekendDays 為區間內星期編號 ∈ {0,6} 的天數；holidaysSubtracted 為 H ∩ 區間中星期編號 ∈ {1..5} 的個數（實際被扣掉的假日）；holidaysOnWeekends 為 H ∩ 區間中星期編號 ∈ {0,6} 的個數（不重複扣，只揭露）。holidaysOutOfRange 為 H 中不在 (min, max] 內的個數（同日同值時區間為空，全部假日皆屬超出區間）。duplicateHolidayLines = 非空行數 − |H|。startWeekday／endWeekday 為使用者輸入的 startDate／endDate 各自的星期編號（不依大小交換）。
3. 模式 B：days=0 時 resultDate = startDate 原樣不動。days>0 時自 startDate 起逐日往後，每落到一個工作日遞減剩餘量，剩餘量為 0 時停在該日；days<0 對稱往前。days≠0 的結果必為工作日。resultIsBusinessDay 為 resultDate 是否為工作日（僅 days=0 且 startDate 非工作日時可為 false）。calendarDaysMoved = resultDate − startDate 的日曆天數（有號）。
4. 結果形狀固定。模式 A：`{mode, startDate, endDate, startWeekday, endWeekday, calendarDays, businessDays, weekendDays, holidaysSubtracted, holidaysOnWeekends, holidaysOutOfRange, duplicateHolidayLines}`。模式 B：`{mode, startDate, days（解析後的整數）, resultDate, resultWeekday, resultIsBusinessDay, calendarDaysMoved}`。
5. 組成不變量。以模式 A 的工作日數作為模式 B 的步進量，並使用同一份假日清單。當工作日數在 ±3660 內，正向或同日區間的訖日為工作日即可回到訖日。反向區間須起日和訖日皆為工作日才保證成立。例如沒有假日時，2026-01-11（週日）到 2026-01-08（週四）計為 −1，從 1 月 11 日反向步進一個工作日會到 1 月 9 日（週五）。count 對區間可加總，對調起訖恰反號。

固定下載 `workdays-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/workdays-calculator/`。`public/js/core/core.mjs` 放純驗證、推導與格式化。`public/js/controller.mjs` 管草稿、工作世代及資源。`public/js/app.js` 用安全 DOM API 綁表單。`public/index.html` 和 `public/en/index.html` 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 日期核心用整數 Julian Day Number（Fliegel–Van Flandern 公式）做日序換算，星期編號 = (JDN + 1) mod 7（0=週日）；不使用 `Date` 物件、不讀主機時區與系統時鐘，結果在任何主機上相同。閏年規則為公曆規則（年被 4 整除且不被 100 整除，或被 400 整除）。
- 模式 A 可用整週分解（任意連續 7 天恰含 5 個週一至週五日）加速或逐日迭代，結果須與 inputsOutputs 的集合語義完全一致；模式 B 逐日步進，步數上界由 |days| ≤ 3660 與假日筆數界定（最壞約數千步），不構成資源風險。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時將純核心與固定訊息處理器 `public/js/worker-handler.mjs` 嵌入 `dist-preview/js/worker-source.js`。開始工作時，頁面從該固定字串建立 Blob URL 和專用 module Worker。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行兩種模式，畫面和完整報告符合核心 fixtures，並核對符合方向、端點與步進量條件的組成不變量及反向反例。 |
| boundaries | 合法端點（1900-01-01／2100-12-31、days ±3660、假日 400 筆／8192 單元）、剛好越界（±3661、401 筆、8193 單元）、LF 與 CRLF 的假日列號、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改、模式切換和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。23 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `basic-week` | 一整週的基本計數（範例）；組成不變量的左半 |
| `full-year-2026` | 364 天整週分解：260 工作日、104 週末日 |
| `same-day` | 起訖同日全為 0 |
| `weekend-only-span` | 區間只有週六、週日，工作日 0 |
| `holiday-weekday` | 平日假日扣 1 |
| `holiday-mixed` | 假日落在週末／重複行／空行／超出區間四種揭露並存 |
| `reversed-range` | 起訖對調恰反號，揭露欄位仍以正向區間計 |
| `leap-day-span` | 跨 2028 閏日 |
| `leap-century-invalid` | 1900-02-29 非真實日期（百年規則） |
| `shift-forward-weekend` | 週五 +1 工作日 = 下週一 |
| `shift-backward-weekend` | 週一 −1 工作日 = 上週五 |
| `shift-skips-holiday` | 步進跳過假日週一 |
| `shift-zero-weekend` | days=0 原樣回傳週六，resultIsBusinessDay=false |
| `shift-ten-days` | +10 工作日跨兩個週末 |
| `shift-max-forward` | +3660 工作日 = 732 整週，合法上限 |
| `empty-start-date` | 開始日期缺內容 EMPTY |
| `bad-date-format` | 斜線日期 DATE_FORMAT |
| `invalid-end-date` | 2026-02-29 INVALID_DATE（欄位 endDate） |
| `date-out-of-range` | 1899-12-31 RANGE |
| `bad-mode` | 未知模式 ENUM，先於欄位集合檢查 |
| `days-format` | 小數工作日數 INTEGER_FORMAT |
| `days-out-of-range` | 3661 RANGE |
| `holiday-row-invalid` | 假日第 2 行 2026-02-29，INVALID_DATE 帶 row=2 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。注意 controller 草稿固定五欄，核心輸入為目前模式的四欄投影。

另測性質與邊界，預期由規則推導。

- 檢查符合第 5 項條件的正向及反向組成不變量，並驗證第 5 項的反向反例。驗證 `count(A,B)+count(B,C)=count(A,C)`、`count(B,A)=−count(A,B)`，以及工作日起日 S 與抽樣 n ∈ [-3660,3660] 時 `shift(shift(S,n),−n)=S`。
- 1900-01-01 與 2100-12-31 可作起訖日，1899-12-31 與 2101-01-01 回 RANGE。2000-02-29（被 400 整除）與 2028-02-29 為真實日期。days 的 `3660`／`-3660` 合法，`-0`／`007` 回 INTEGER_FORMAT。
- LF 與 CRLF 清單均接受 400 筆有效假日。容量內第 401 筆回 ROW_LIMIT，row 為含空行在內的行號。有效假日清單的原始文字恰 8192 單元時合法，8193 回 INPUT_LIMIT。LF 以外的獨立 CR 會留在行內，回 DATE_FORMAT 並帶正確 row。
- 多餘欄、缺欄、accessor 欄位、非字串值及 mode 缺失回 SCHEMA。

候選 gate（均 NOT_RUN）

- 於 `tools/workdays-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、模式切換、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「工作日計算機」，title「工作日計算機｜Gloss Tools」，description「計算兩個日期之間的工作日（扣除週末與自訂假日），或從某日起加減 N 個工作日得到目標日期；起日不計、訖日計入。」。英文 lang=en，H1 “Workdays Calculator”，title “Workdays Calculator | Gloss Tools”，description “Count business days between two dates (excluding weekends and your own holidays), or add and subtract business days from a date. The start date is excluded and the end date is included.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。起訖日怎麼算？起日不計入、訖日計入；例如週一到週五是 4 個工作日（週二到週五），用加減模式從週一加 4 個工作日也會回到週五。 / How are the endpoints counted? The start date is excluded and the end date is included: Monday to Friday counts 4 business days (Tue–Fri), and adding 4 business days to that Monday lands back on the Friday.
- FAQ。假日落在週末會重複扣嗎？不會；週末日本來就不是工作日，落在週末的假日會另外列出，不會重複扣。 / Is a holiday on a weekend subtracted twice? No. Weekend days are never business days; such holidays are reported separately and never double-counted.
- FAQ。有內建國定假日嗎？沒有；假日由你自行逐行輸入（例如公司休假日），本工具不含任何官方行事曆。 / Are national holidays built in? No. Holidays are the dates you enter yourself, one per line; no official calendar is included.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://workdays.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/workdays-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

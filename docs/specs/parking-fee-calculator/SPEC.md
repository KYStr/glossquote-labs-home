# 停車費計算機 / Parking Fee Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-parking-fee-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

開車的人在繳費機前，先依停車場告示的費率核對應付金額，特別是跨夜與多日停車時「每日上限」怎麼套、午夜後是否重新起算。

- 桌面。出門前在電腦上把入場、出場時間和費率填好，逐日核對明細，確認總額再決定出場時間。
- 行動。手機在繳費機前輸入票卡上的入場時間與告示費率，當場比對繳費機顯示的金額；票卡遺失時切換定額費用。

使用情境為費率試算。資料只保留在目前頁面草稿，試算結果不是收費依據。

## scope

單一費率表的停車費試算：免費寬限、首段、後續段、按日曆日的每日上限、遺失票卡定額。非目標為即時查詢特定停車場費率、月租與定期票、各式優惠折抵（身障、里民、消費折扣、免費時數券）、車牌辨識或支付整合、處理遺失票卡的櫃台流程、把結果當成收費或爭議處理依據。

已與 registry 既有預案與工具比對，本主題最接近者仍屬不同問題，差異如下。

- 會議的人力時間成本試算。此處是單一車輛停留時間對一張費率表的計費，與人數、時薪、會議成本無關。`meeting-cost-calculator`（tools/ 既有工具）。
- 由用電度數與級距算電費。此處不查級距表，費率全部由使用者照告示輸入，計費單位是停留分鐘與日曆日。`electricity-cost-calculator`（tools/ 既有工具）。

判定規則由本文定義，無線上資料或外部服務依賴。所有時間一律 Asia/Taipei（UTC+8，台灣現行無夏令時間），不取使用者裝置時區。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「入場時間、出場時間 / Entry time and exit time」，分鐘精度，用 datetime-local 樣式的文字輸入與原生日期時間選擇，不得要求使用者換算 UTC。
- 欄位或說明「免費寬限（分鐘）、首段長度（分鐘）與首段價格 / Free grace (minutes), first period (minutes) and first-period price」
- 欄位或說明「後續每段長度（分鐘）與價格、每日上限 / Subsequent period (minutes) and price, daily cap」。每日上限填 0 表示無上限，欄位旁固定說明。
- 開關「遺失票卡 / Lost ticket」與欄位「遺失票卡費用 / Lost-ticket fee」。開關開啟時結果區只顯示定額費用與總停車分鐘，不顯示逐日列。
- 「計算停車費 / Calculate parking fee」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「逐日明細與總額 / Daily breakdown and total」先摘要（總停車分鐘、總額、是否套用寬限或每日上限）再列逐日表，長表在有 label 的區域捲動。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、開關、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。寬限免費或遺失票卡時以文字說明總額的由來，不只顯示數字。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"entry":"","exit":"","graceMinutes":"15","firstPeriodMinutes":"60","firstPrice":"40","nextPeriodMinutes":"30","nextPrice":"20","dailyCap":"200","lostTicketFee":"1000","lostTicket":false}` 並聚焦入場時間欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。本工具沒有列輸入，row 恆為 null。JSON fixture 即介面。

欄位與文法（驗證順序即此列序：entry、exit、graceMinutes、firstPeriodMinutes、firstPrice、nextPeriodMinutes、nextPrice、dailyCap、lostTicketFee、lostTicket）：

- `entry`、`exit`：字串，格式固定 `YYYY-MM-DDTHH:MM`（16 字元，分鐘精度，無秒、無時區後綴），一律解讀為 Asia/Taipei 牆鐘時間。年 2000–2100，月日須為真實日曆日（閏年規則：年可被 4 整除且不被 100 整除，或可被 400 整除，該年 2 月 29 日存在），時 00–23，分 00–59。
- 數值欄皆為 ASCII 十進整數字串，0 或非零開頭，無空白／符號／小數／指數，raw 每欄最多 8 字元。`graceMinutes` 0–1440、`firstPeriodMinutes` 1–1440、`firstPrice` 0–999999、`nextPeriodMinutes` 1–1440、`nextPrice` 0–999999、`dailyCap` 0–999999（0 表示無上限）、`lostTicketFee` 0–999999。金額單位固定新台幣整數元，不接受小數。
- `lostTicket`：布林值，true／false。型別不符（含字串 "true"）屬 SCHEMA。
- 預設 graceMinutes 15、firstPeriodMinutes 60、firstPrice 40、nextPeriodMinutes 30、nextPrice 20、dailyCap 200、lostTicketFee 1000、lostTicket false；entry、exit 無預設（空字串）。

每欄驗證順序固定：先容量（raw 長度超過上限 INPUT_LIMIT）、再 surrogate（不成對 surrogate UNICODE）、再缺內容（空字串 EMPTY）、再文法（日期時間 DATETIME_FORMAT／整數 INTEGER_FORMAT，含不存在的日曆日與超出 2000–2100 年範圍）、最後範圍（RANGE）。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

跨欄驗證在全部欄位通過後依序執行：

1. exit 必須嚴格晚於 entry（以 Asia/Taipei 民用分鐘序號比較，見 implementation）。exit ≤ entry 回 ORDER，field 為 `exit`。
2. 總停車分鐘（exit − entry）不得超過 43,200（30 日）。超過回 RANGE，field 為 `exit`。

計費規則（全部整數運算，無浮點、無捨入模式；金額為新台幣整數元）：

1. 寬限判定（全域、一次性）：總停車分鐘 ≤ graceMinutes 時 `graceApplied=true`，總額為 0。超過寬限時自入場起全額計費，寬限分鐘不扣除、不逐日套用。恰等於寬限仍免費。
2. 遺失票卡優先：`lostTicket=true` 時不計逐日費用，`lostTicketApplied=true`、`graceApplied=false`、`days=[]`、`totalFee=lostTicketFee`；仍回報 totalMinutes。驗證（含 ORDER 與 30 日上限）與一般計算完全相同，不因開關放寬。
3. 逐日切分：停留區間按 Asia/Taipei 日曆日切分，日界為當地 00:00。當日分鐘 = 停留區間與該日曆日的交集分鐘數；出場恰在 00:00 時出場日交集為 0，該日不列。只列分鐘 > 0 的日子，日期升序。
4. 每日獨立計費：每個列出的日子獨立起算。當日分鐘 m ≥ 1 時首段恆計 1 段（`firstPeriods=1`）：m ≤ firstPeriodMinutes 時 `nextPeriods=0`；否則 `nextPeriods=ceil((m − firstPeriodMinutes) / nextPeriodMinutes)`，已開始的段一律算完整一段。`rawFee = firstPrice + nextPeriods × nextPrice`。跨午夜後的新日曆日重新起算首段與後續段，不延續前一日的段數。
5. 每日上限：dailyCap > 0 時當日封頂價 = min(rawFee, dailyCap)，`capped =（封頂價 < rawFee）`；rawFee 恰等於 dailyCap 時 capped 為 false。dailyCap = 0 表示無上限，capped 恆 false。
6. 當日費用 fee：graceApplied 時為 0（rawFee 與 capped 仍照第 4、5 步回報供核對）；否則為封頂價。`totalFee` 為各日 fee 總和（遺失票卡時依第 2 步）。

結果 `{lostTicketApplied,graceApplied,totalMinutes,days,totalFee}`；days 每列 `{date,minutes,firstPeriods,nextPeriods,rawFee,capped,fee}`，date 為 `YYYY-MM-DD`（Asia/Taipei）。所有輸出整數皆為驗過的安全整數：以範圍上限估算，單日 rawFee 最大約 1.5×10⁹、總額最大約 4.5×10¹⁰，遠低於 2⁵³，核心不得引入浮點除法，ceil 以整數 `(a + b − 1) / b` 形式在安全整數內完成。機器值不隨 locale 改。

固定錯誤訊息（code 與欄位由核心決定，訊息由介面依 code 對應，兩語對等）：

| code | 繁中 | English |
| --- | --- | --- |
| SCHEMA | 輸入格式不正確，請重新輸入。 | The input is malformed. Please re-enter it. |
| EMPTY | 此欄不可空白。 | This field must not be empty. |
| INPUT_LIMIT | 輸入太長。 | The input is too long. |
| UNICODE | 輸入含有不完整的字元。 | The input contains an incomplete character. |
| INTEGER_FORMAT | 請輸入整數，不要小數或符號。 | Enter a whole number, with no decimals or signs. |
| DATETIME_FORMAT | 日期時間格式不正確或日期不存在。 | The date/time format is invalid or the date does not exist. |
| RANGE | 數值超出允許範圍。 | The value is outside the allowed range. |
| ORDER | 出場時間必須晚於入場時間。 | Exit time must be later than entry time. |
| OUTPUT_LIMIT | 報告太大，無法下載。 | The report is too large to download. |
| INTERNAL／WORKER_ERROR | 處理失敗，草稿還在，請重試。 | Processing failed. Your draft is kept; please retry. |

RANGE 用於 exit 欄時介面須補充指出是總停車時間超過 30 日；其他欄位維持通用訊息。

固定下載 `parking-fee-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/parking-fee-calculator/`，依共用實作清單的檔案契約：`package.json`（Node ≥24、ESM、scripts 含 test／check／build:preview／check:generated:preview）、`public/index.html` 與 `public/en/index.html` 兩個靜態入口、`public/js/core/*.mjs` 放純驗證與計費（不接觸 DOM／網路／storage，測試可直接 import）、`public/js/app.js` 用安全 DOM API 綁表單、`scripts/` 放可重現 preview build、靜態 check 與 loopback serve、`test/*.test.mjs` 依 fixtures 字面 expected 撰寫、`HANDOFF.md` 與 `VERIFICATION.md` 記錄固定來源與 NOT_RUN。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

時間演算固定如下，核心不得依賴執行環境時區：

- 民用分鐘序號：以 days-from-civil 整數演算法（Howard Hinnant）把 (年, 月, 日) 換成自 1970-01-01 起的日序號，序號 × 1440 + 時 × 60 + 分即該 Asia/Taipei 牆鐘時間的絕對分鐘序號。Asia/Taipei 固定 UTC+8 且無夏令時間，故日界即序號為 1440 倍數處，逐日切分與日期標籤（civil-from-days 逆演算）全部以整數完成。
- 核心禁止以 `new Date(字串)` 解析使用者輸入、禁止讀取本地時區 getter、禁止以毫秒浮點運算計費。測試須在 TZ=UTC、TZ=Asia/Taipei、TZ=America/New_York 三種環境各跑一次且結果一致。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算停車費」，畫面和完整報告符合核心 fixtures，含跨午夜、每日上限、寬限免費與遺失票卡四種結果型態，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、寬限恰等於／多一分鐘、出場恰在 00:00、停車恰 30 日與三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow；核心結果在三種 TZ 環境一致。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。12 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `same-day-basic` | 同日首段加後續段，未觸上限 |
| `grace-free` | 總分鐘恰等於寬限，全額免費 |
| `grace-just-exceeded` | 超過寬限一分鐘，自入場起全額計費 |
| `grace-cross-midnight` | 寬限以總時長判定，跨夜短停仍免費 |
| `cross-midnight` | 跨午夜兩日各獨立起算首段與後續段 |
| `daily-cap` | 同日原價超過每日上限，當日封頂 |
| `multi-day-cap` | 三日逐日切分，整日與末日各自封頂 |
| `exit-at-midnight` | 出場恰在 00:00，零分鐘日不列，首段恰滿不加段 |
| `lost-ticket` | 遺失票卡定額取代逐日計算，days 為空 |
| `exit-before-entry` | 跨欄 ORDER 指向 exit |
| `impossible-date` | 2 月 30 日為 DATETIME_FORMAT 指向 entry |
| `decimal-price` | 價格小數為 INTEGER_FORMAT 指向 nextPrice |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測：2028-02-29 合法（閏年）、2026-02-29 為 DATETIME_FORMAT；停車恰 43,200 分鐘合法、43,201 分鐘為 RANGE（exit）；rawFee 恰等於 dailyCap 時 capped=false；dailyCap=0 時多日長停不封頂；graceMinutes=0 時 1 分鐘停車即計費；firstPrice 或 nextPrice 為 0 的免費段；錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。所有已列出的日子 minutes 總和恆等於 totalMinutes，各日 fee 總和恆等於 totalFee（遺失票卡除外）。

候選 gate（均 NOT_RUN）

- 於 `tools/parking-fee-calculator/` 記 Node 24.x，執行 `npm test`（core/controller/HTML/下載/建置）、`npm run check`（語法、外部依賴、危險 sink、allowlist）、`npm run build:preview`（重建兩次並逐檔比對排序後的 SHA-256）、`npm run check:generated:preview`。核心測試另在 TZ=UTC、TZ=Asia/Taipei、TZ=America/New_York 各執行一次。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs`（loopback）供隔離預覽，端口以工具自身文件為準；已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「停車費計算機」，title「停車費計算機｜Gloss Tools」，description「輸入入場與出場時間和停車場費率，按日曆日逐日試算停車費：免費寬限、首段與後續段計費、每日上限與遺失票卡定額。」。英文 lang=en，H1 “Parking Fee Calculator”，title “Parking Fee Calculator | Gloss Tools”，description “Enter entry and exit times plus the lot's tariff to get a per-calendar-day parking fee breakdown with grace minutes, first and subsequent periods, a daily cap and a lost-ticket flat fee.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。每日上限是按日曆日還是 24 小時？按 Asia/Taipei 日曆日，每個日曆日獨立起算並封頂。 / Is the daily cap per calendar day or per 24 hours? Per Asia/Taipei calendar day; each day is billed and capped independently.
- FAQ。免費寬限超過了怎麼算？總停車時間在寬限內免費，超過就自入場起全額計費，不扣寬限。 / What happens past the free grace? Stays within the grace are free; longer stays are billed from entry with no grace deduction.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow，canonical 與 hreflang 用相對路徑（本頁、對語頁、zh-Hant x-default），首頁回鏈連回同語首頁。無 production canonical 或 sitemap。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://parking-fee-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。規格任務 `labs-parking-fee-calculator-spec-20261109` 由主代理登記，作者不自行 register。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/parking-fee-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

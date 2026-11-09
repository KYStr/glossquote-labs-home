# 特休假計算機 / Annual Leave Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-annual-leave-calculator-20261109` · 2026-11-09 · v1

[預案品質與補庫說明](../../SPECIFICATION-STOCK.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

員工或人資在結算、排假前，先依到職日與基準日確認目前特休有幾天、本週期到哪天、已休之後還剩幾天。

- 桌面。人資助理在辦公室逐人核對年資與週期，手上有到職日、本週期已休天數，要對到確切的週期起訖日。
- 行動。員工用手機查自己的特休，輸入到職日、以今天為基準，馬上看到剩餘天數與下次給假日。

使用情境為法定天數試算。資料只保留在目前頁面草稿。

## scope

單一員工、週年制、以 Asia/Taipei 曆日計算的勞動基準法第 38 條法定特休試算。法規版本固定為勞動基準法第 38 條（2016-12-21 修正公布、2017-01-01 施行）現行條文，天數表全文固定於 inputsOutputs，不依賴線上查詢。

非目標為曆年制／學年制等公司自訂給假週期、特休遞延與屆期結清工資、半日或小時單位、到職前年資併計、離職結算、多人批次匯入、請假申請與排班、公司加給或優於法令的天數、2017 年修法前的舊制、民國曆輸入。

已與 base commit 的 docs/specs、tools、sources/candidates、sources/legacy 比對，最相近者的實質差異如下。

- 一般日期差與日期加減（legacy 快照）。此處是勞基法年資周年、天數表與給假週期推導。 `sources/legacy/date-calculator`
- 由預產期與孕期日期推算。該案是醫療情境的日期加減，此處是勞動法令的權利天數與週期。 [spec-pregnancy-due-date-calculator](../pregnancy-due-date-calculator/SPEC.md)

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，法定天數表與法規出處以靜態內容呈現於頁面。

- 欄位或說明「到職日、基準日 / Start date and reference date」
- 欄位或說明「本週期已休天數（選填） / Days already used in this period (optional)」
- 「計算特休 / Calculate leave」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。「填入今天 / Use today」把基準日設為目前的 Asia/Taipei 曆日，只改該欄並使舊結果失效。
- 「剩餘天數與本週期 / Remaining days and current period」先摘要再列細節：年資（年／月／日數）、本週期天數、已休、本週期起訖、下次給假日與天數。到職日為 2 月 29 日時，結果旁固定顯示周年日調整說明。本工具沒有下載或匯出產物。
- 文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。未滿 6 個月有 0 天說明與下次給假日。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原空白預設 `{"startDate":"","referenceDate":"","usedDays":""}` 並聚焦到職日欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field 為出問題的欄位名（整體結構問題為 null），row 一律 null。JSON fixture 即介面。日期欄一律以 Asia/Taipei 曆日解讀，不含時間、不用主機時區推日界。

- `startDate`、`referenceDate`：必填，raw 字串。文法恰為 `YYYY-MM-DD`：4 位 ASCII 數字、`-`、2 位數字、`-`、2 位數字。須為實際存在的西曆日期，年份 1900–2100。
- `usedDays`：選填，可缺欄或 null，皆視為 0；空字串亦視為 0。否則須為 ASCII 十進整數字串，0 或非零開頭，無空白／符號／小數／指數，值 0–30。語義為「本週期已休天數」，只計目前週期，不含先前週期。
- raw 容量：日期欄每欄最多 64 個 UTF-16 code units，usedDays 最多 8 個。預設三欄皆空。

先容量、再 surrogate、再該欄文法，跨欄順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`。成功僅為 `{ok:true,result}`。資源失敗用固定 INTERNAL，不回傳堆疊。

1. 依 startDate、referenceDate、usedDays 逐欄驗證。raw 超限 INPUT_LIMIT、不成對 surrogate UNICODE。日期空字串 EMPTY、文法不合 DATE_FORMAT、格式合但日期不存在（月 00／13、日 00、2 月 30 日、非閏年 2 月 29 日）INVALID_DATE、年份超出 1900–2100 RANGE。usedDays 文法不合 INTEGER_FORMAT、值超出 0–30 RANGE。
2. 跨欄一：referenceDate 早於 startDate（曆日比較）→ DATE_ORDER，field 為 referenceDate。
3. 跨欄二：usedDays 大於下文算出的 entitlementDays → RANGE，field 為 usedDays。

日期運算全為曆日整數運算，定義如下（start 為到職日、ref 為基準日）。

- `addMonths(date, k)`：年月推進 k 個月，日取 min（原日，該月天數）。例：2026-08-31 加 6 個月為 2027-02-28。
- `anniv(date, k)`（k ≥ 1，周年日）：同月同日推進 k 年；到職日為 2 月 29 日且目標年非閏年時，周年日為該年 2 月 28 日（依據民法第 121 條期間末日規則：末月無相當日者，以月之末日為期間之末日）。anniv(date, 0) 為 date 本身。
- `tenureDays` = ref 與 start 的曆日差（以 days-from-civil 整數算法計算，不得以本地時間 Date 建構推日）。`completedYears` n 為最大的 n ≥ 0 使 anniv(start, n) ≤ ref。`completedMonths` m 為最大的 m ≥ 0 使 addMonths(start, m) ≤ ref。

法定天數表（勞動基準法第 38 條，版本如 scope）。以 n 與滿 6 個月與判定：

| 年資 | 本週期特休天數 |
| --- | --- |
| 未滿 6 個月（ref < addMonths(start, 6)） | 0 |
| 滿 6 個月未滿 1 年（n = 0 且已滿 6 個月） | 3 |
| n = 1 | 7 |
| n = 2 | 10 |
| n = 3–4 | 14 |
| n = 5–9 | 15 |
| n ≥ 10 | min(15 + (n − 9), 30) |

結果推導：

4. stage：未滿 6 個月為 `under-6-months`；n = 0 且已滿 6 個月為 `first-3-days`；n ≥ 1 為 `standard`。
5. entitlementDays 為本週期天數（即上表對應值）；remainingDays = entitlementDays − usedDays，不為負（跨欄二已擋）。
6. 本週期窗口 periodStart／periodEnd（皆含）：under-6-months 時兩者為 null、periodEntitlementDays 為 0。first-3-days 時 periodStart = addMonths(start, 6)、periodEnd = anniv(start, 1) 的前一日。standard 時 periodStart = anniv(start, n)、periodEnd = anniv(start, n + 1) 的前一日。periodEntitlementDays = entitlementDays（under-6-months 除外）。
7. nextGrantDate／nextGrantDays：under-6-months 時為 addMonths(start, 6) 與 3。first-3-days 時為 anniv(start, 1) 與 7。standard 時為 anniv(start, n + 1) 與天數表對 n + 1 的值。
8. 結果 `{startDate, referenceDate, tenureDays, completedYears, completedMonths, stage, entitlementDays, usedDays, remainingDays, periodStart, periodEnd, periodEntitlementDays, nextGrantDate, nextGrantDays, feb29Adjusted}`。日期回顯為驗過的 `YYYY-MM-DD` 字串；feb29Adjusted 為 startDate 是否為 2 月 29 日。全部數值為整數，無浮點、無捨入。機器值不隨 locale 改。

固定本地化字串（除上表狀態字串外）：

| 鍵 | 繁中 | English |
| --- | --- | --- |
| err SCHEMA | 輸入格式不正確。 | The input is malformed. |
| err INPUT_LIMIT | 輸入過長。 | The input is too long. |
| err UNICODE | 輸入含不完整的字元。 | The input contains an incomplete character. |
| err EMPTY | 這個欄位必填。 | This field is required. |
| err DATE_FORMAT | 日期請用 YYYY-MM-DD 格式。 | Use the YYYY-MM-DD date format. |
| err INVALID_DATE | 這個日期不存在。 | This date does not exist. |
| err RANGE（年份） | 年份需在 1900 到 2100 之間。 | The year must be between 1900 and 2100. |
| err INTEGER_FORMAT | 已休天數請輸入整數。 | Enter used days as a whole number. |
| err RANGE（已休上限） | 已休天數需在 0 到 30 之間。 | Used days must be between 0 and 30. |
| err DATE_ORDER | 基準日不能早於到職日。 | The reference date cannot be before the start date. |
| err RANGE（已休超過） | 已休天數不能超過本週期特休天數。 | Used days cannot exceed this period's leave days. |
| stage under-6-months | 尚未取得特休：到職未滿六個月。 | No leave yet: under six months of service. |
| stage first-3-days | 已滿六個月未滿一年：本週期 3 天。 | Six months to one year: 3 days this period. |
| feb29 note | 到職日為 2 月 29 日：非閏年的周年日以 2 月 28 日計算。 | Start date is Feb 29: in non-leap years the anniversary is Feb 28. |

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/annual-leave-calculator/`。src/core.mjs 放純驗證、曆日推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 核心為同步純函數，controller 於明確執行時遞增世代號、在下一個 macrotask 執行核心並結算；不建立 Worker、不假造進度或進度條。只收目前世代且 busy 的結算，取消、換來源、重設或 pagehide 時丟棄待結算工作。編輯使舊結果立即失效並回 dirty。bfcache 回來重設。
- 曆日推導以 （年， 月， 日） 整數與 days-from-civil 算法實作，不以本地時間 Date 建構或解析推日界；「填入今天」才讀裝置日期，且固定以 Asia/Taipei 曆日為準。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算特休」，畫面符合核心 fixtures（含 2 月 29 日到職與恰滿周年案例），使用者取得對應結果。 |
| boundaries | 恰滿 6 個月、恰滿周年、同日、30 天上限、第一個錯誤與驗證順序（容量→文法→跨欄）的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、資源上限和待結算工作 dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和填入今天可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、取消和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。13 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `regular-mid-tenure` | 滿 5 年 15 天、已休扣除、本週期窗口 |
| `exact-anniversary` | 基準日恰為周年日，新週期當天開始 |
| `exact-six-months` | 基準日恰為滿 6 個月當天，3 天週期當天開始 |
| `first-three-days` | 3 天階段、週期訖日跨非閏年 2 月 |
| `under-six-months` | 0 天、無本週期、下次給假為滿 6 個月日 |
| `same-day` | 到職當天，年資全 0 |
| `feb29-start` | 2 月 29 日到職，非閏年周年日為 2 月 28 日 |
| `ten-years-step` | 滿 11 年逐年加給 17 天 |
| `cap-thirty` | 滿 28 年以 30 天為上限 |
| `error-invalid-date` | 格式合但日期不存在 |
| `error-date-format` | 斜線分隔不符合文法 |
| `error-date-order` | 基準日早於到職日 |
| `error-used-over` | 已休超過本週期天數 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回空白預設。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假排程器。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在結算前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與結果可用性（resultAvailable；本工具無下載產物）。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證年份 1899/2101、usedDays 前導零（`03` 為 INTEGER_FORMAT）、usedDays 30/31 邊界、驗證順序（同份輸入同時有 DATE_ORDER 與已休超過時先回 DATE_ORDER）、addMonths 月末 clamping（8 月 31 日加 6 個月）、anniv 在閏年回到 2 月 29 日。所有 periodStart ≤ 基準日 ≤ periodEnd（under-6-months 除外），remainingDays 不為負。

候選 gate（均 NOT_RUN）

- 於 `tools/annual-leave-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設、填入今天。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「特休假計算機」，title「特休假計算機｜Gloss Tools」，description「輸入到職日與基準日，依勞動基準法第 38 條算出本週期特休天數、本週期起訖與剩餘天數。」。英文 lang=en，H1 “Annual Leave Calculator”，title “Annual Leave Calculator | Gloss Tools”，description “Enter a start date and a reference date to get statutory annual leave days, the current leave period and remaining days under Article 38 of Taiwan's Labor Standards Act.”。兩頁靜態呈現操作、限制、法定天數表、法規出處（勞動基準法第 38 條，2017 年 1 月 1 日施行版本）與 FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。2 月 29 日到職，周年怎麼算？非閏年以 2 月 28 日為周年日。 / Started on Feb 29? In non-leap years the anniversary falls on Feb 28.
- FAQ。特休天數的依據是什麼？勞動基準法第 38 條（2017 年 1 月 1 日施行版本）的年資天數表。 / Which law sets the days? The tenure table in Article 38 of the Labor Standards Act (version effective Jan 1, 2017).
- FAQ。這是公司正式的請假系統嗎？不是，只依年資與日期試算，不含遞延、結清或公司加給。 / Is this an official leave system? No — it estimates statutory days from dates only; deferrals, payouts and company extras are not included.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://annual-leave-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

規格任務 `labs-annual-leave-calculator-spec-20261109`（由主代理登記）。非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/annual-leave-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

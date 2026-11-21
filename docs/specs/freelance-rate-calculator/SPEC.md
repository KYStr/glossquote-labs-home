# 接案費率試算 / Freelance Rate Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-freelance-rate-calculator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

自由工作者從目標年收入出發，計入可計費使用率與間接成本，算出應報的時薪與日薪，不再憑感覺開價。

- 桌面。桌面填上目標年收入、年工作天數、每日工時、可計費使用率與間接成本，確認報價能否撐起目標收入。
- 行動。手機在與客戶談價前，快速核對一個費率數字。

使用情境為設計假設。資料只保留在目前頁面草稿。

## scope

目標年收入、年工作天數、每日工時、可計費使用率、間接成本五個輸入 → 時薪、日薪、月均目標、計費天數／時數的確定性試算。非目標為報稅、勞健保、發票開立、合約議價、客戶管理、匯率換算、把結果當報價承諾。幣別固定新臺幣（NT$），金額以整元計。

已與本 checkout 的 103 份預案（`docs/specs/`）及 `tools/` 比對，最相近者的實質差異如下。

- salary-converter（薪資換算）：本 checkout 的 `docs/specs/` 與 `tools/` 均未見其規格或產品目錄，僅依概念筆記區分——該工具是在已知費率下做單位間換算（時薪 ↔ 月薪 ↔ 年薪）；此處是從目標年收入出發「定出」費率，輸入含可計費使用率與間接成本，產出為應報的時薪／日薪。兩者方向相反，不重疊。
- compound-interest-calculator（複利）：該工具算資金隨時間成長；此處是靜態費率試算，不含時間成長或利率複利。
- rent-budget（租金預算）：該工具算收入可負擔的租金上限；此處是收入目標倒推費率，不做負擔能力判斷。

判定規則由本文定義，無線上資料或外部服務依賴。公式為定義性算式，無需引用的法令或官方表格；間接成本與可計費使用率皆為使用者自填假設，本文不宣稱任何產業標準比例。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「目標年收入（NT$）／ Target annual income (NT$)」
- 欄位或說明「年工作天數、每日工時 / Working days per year, hours per day」
- 欄位或說明「可計費使用率 %、間接成本 % / Billable utilization %, overhead %」
- 「計算費率 / Calculate rates」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「時薪、日薪與計費時數 / Hourly rate, day rate and billable hours」先摘要再列細節。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"targetAnnualIncome":"1200000","workingDaysPerYear":"220","hoursPerDay":"8","billableUtilizationPercent":"70","overheadPercent":"20"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- targetAnnualIncome、workingDaysPerYear 為 ASCII 十進整數字串，0 或非零開頭，無空白／符號／小數／指數；hoursPerDay、billableUtilizationPercent、overheadPercent 為十進小數字串，最多 1 位小數，無空白／符號／指數。raw 每欄最多 12 單元。targetAnnualIncome 1–100,000,000（NT$），workingDaysPerYear 1–365，hoursPerDay 0.5–24，billableUtilizationPercent 1–100，overheadPercent 0–100。
- 預設 targetAnnualIncome 1200000、workingDaysPerYear 220、hoursPerDay 8、billableUtilizationPercent 70、overheadPercent 20。

先容量、再 surrogate、再該欄文法，跨欄順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 targetAnnualIncome、workingDaysPerYear、hoursPerDay、billableUtilizationPercent、overheadPercent 順序驗證。raw 超限 INPUT_LIMIT、缺內容 EMPTY、整數欄文法 INTEGER_FORMAT、小數欄文法 DECIMAL_FORMAT、範圍 RANGE，field 即上述欄名。
2. 固定公式（exact 有理數運算，見 implementation）：
   - `grossTarget = targetAnnualIncome × (1 + overheadPercent / 100)`
   - `billableDaysExact = workingDaysPerYear × billableUtilizationPercent / 100`
   - `billableHoursExact = billableDaysExact × hoursPerDay`
   - `dayRateExact = grossTarget / billableDaysExact`
   - `hourlyRateExact = grossTarget / billableHoursExact`
   - `monthlyTargetExact = targetAnnualIncome / 12`
3. 捨入（half-up，見 implementation）：grossTarget、dayRate、hourlyRate、monthlyTarget 四捨五入至整元 NT$；billableDays、billableHours 四捨五入至 1 位小數。捨入只在最後輸出時做一次，費率由未捨入的精確值算出，不用已捨入的中間值。
4. 結果 `{grossTarget,billableDays,billableHours,dayRate,hourlyRate,monthlyTarget}`，全為 JSON 數字：金額為整元 NT$，天數／時數為 1 位小數。機器值不隨 locale 改。畫面另以千分位顯示金額，不改變機器值。

固定下載 `freelance-rate-calculator-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/freelance-rate-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 核心算術用精確有理數（BigInt 分子／分母或十進 Decimal），禁止二進浮點參與推導與捨入。捨入為 half-up（正數向上進位，0.5 進位）：金額至整元，天數／時數至 1 位小數。`billableDays` 與 `billableHours` 的顯示捨入不回寫進費率分母。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算費率」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
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
| `standard-rate` | 標準試算：目標 120 萬、220 天、70% 使用率、20% 間接成本 |
| `no-overhead-full-utilization` | 無間接成本、100% 使用率的整數費率 |
| `low-utilization` | 50% 使用率拉高費率 |
| `fractional-billable-days` | 計費天數 149.5 天的非整數中間值 |
| `half-up-rounding` | 時薪恰為 1000.5，half-up 進為 1001 |
| `max-days-boundary` | 365 天、24 小時的合法上限端點 |
| `min-values` | 全部最小值的端點 |
| `decimal-percent` | 62.5% / 12.5% 小數百分比與 7.5 小時 |
| `utilization-zero` | 使用率 0 為 RANGE |
| `overhead-over-100` | 間接成本 101 為 RANGE |
| `decimal-target` | 目標收入小數為 INTEGER_FORMAT |
| `days-over-365` | 工作天數 366 為 RANGE |
| `hours-two-decimals` | 每日工時 2 位小數為 DECIMAL_FORMAT |
| `empty-target` | 目標收入空白為 EMPTY |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 utilization=1/100、overhead=0/100、hoursPerDay=0.5/24、workingDaysPerYear=1/365、targetAnnualIncome=1/100000000、half-up 邊界 0.5 進位與 0.49 捨去。所有已接受的費率皆由未捨入的精確值算出。

候選 gate（均 NOT_RUN）

- 於 `tools/freelance-rate-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「接案費率試算」，title「接案費率試算｜Gloss Tools」，description「自由工作者從目標年收入出發，計入可計費使用率與間接成本，算出應報的時薪與日薪。」。英文 lang=en，H1 “Freelance Rate Calculator”，title “Freelance Rate Calculator | Gloss Tools”，description “Set your freelance hourly and day rate from a target annual income, billable utilization and overhead.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。時薪是怎麼算出來的？先把目標年收入加上間接成本，再除以計費時數（年工作天數 × 可計費使用率 × 每日工時）。 / How is the hourly rate calculated? Add overhead to the target annual income, then divide by billable hours (working days × utilization × hours per day).
- FAQ。這個費率可以直接拿去報價嗎？這只是試算參考，實際報價還要考慮稅費、勞健保、議價空間與市場行情。 / Can I quote this rate directly? This is an estimate only; actual quotes should also account for tax, insurance, negotiation room and market rates.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://freelance-rate-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/freelance-rate-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

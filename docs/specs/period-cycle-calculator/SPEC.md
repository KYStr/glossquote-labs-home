# 生理週期計算 / Period Cycle Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-period-cycle-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者在手機上安排接下來幾個月的旅行、賽事或回診，手邊只有上次月經開始日與自己平常的平均週期長度，要立刻知道下一次（以及再接下來兩次）月經大概何時開始、本週期排卵日與易孕期大概落在哪幾天，以便避開或預作準備。

- 行動。手機輸入三個值，看到本次週期與接下來三次月經的估計日期表。
- 桌面。寬版核對四個週期的完整日期並下載報告留存。

使用情境為依平均值推算。資料只保留在目前頁面草稿，不回報、不儲存。**所有輸出日期都是估計**：實際週期會受壓力、作息、疾病、藥物等因素影響而變動。本工具不能作為避孕依據，也不是醫療建議（聲明全文見 userFlow，兩語頁面皆常駐顯示於結果旁）。

與既有功能的差異：`pregnancy-due-date-calculator` 是在懷孕後以最後月經日推算預產期，本工具是未懷孕情境下的週期與易孕期估算，輸入輸出與目的皆不同；legacy `date-calculator` 只做一般日期加減，沒有週期模型；`sleep-cycle-calculator` 的 cycle 是 90 分鐘睡眠週期，與生理週期無關。

## scope

MVP 必做：單一組輸入（上次月經開始日、平均週期長度、經期長度）→ 四個週期（本次與接下來三次）的開始日、經期結束日、排卵日、易孕期起訖；固定格式 JSON 報告下載；雙語頁面與完整狀態機。

模型釘版：排卵日 = 週期開始日 +（週期長度 − 14），即假設黃體期固定 14 天；易孕期 = 排卵日 −5 天至排卵日 +1 天（含頭尾，共 7 天）。這是消費型週期工具的常見估算慣例，必須連同聲明一起揭露，不得在文案中暗示精確。

非目標：症狀、經血量、疼痛或基礎體溫紀錄；多筆歷史週期與加權平均；依使用者回報實際來潮日調整後續預測；不規則週期建模；避孕方法指導或有效性評估；懷孕機率、疾病或就醫風險評估；排卵試紙／裝置資料匯入；通知、行事曆同步、帳號或任何持久儲存。

資料與界線：日期為 Gregorian 日曆日，核心以整數 Julian Day Number 運算，不讀主機時鐘與時區；無浮點、無捨入。單次計算最多輸出 4 個週期列，輸入皆為短字串，性能界線由欄位容量決定。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「上次月經開始日 / Last period start date」
- 欄位或說明「平均週期長度（天） / Average cycle length (days)」，欄下提示「21–35 天 / 21–35 days」
- 欄位或說明「經期長度（天） / Period length (days)」，欄下提示「1–10 天 / 1–10 days」
- 「計算週期預測 / Calculate cycle predictions」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「估計日期 / Estimated dates」先摘要下一次月經開始日，再列表四列：週期開始日、經期結束日、排卵日、易孕期（起訖）。第一列即輸入日開始的本次週期，列序固定。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 結果旁常駐聲明，不得摺疊或隱藏。繁中：「本工具依你輸入的平均週期長度推算，所有日期都是估計，實際週期會受壓力、作息、疾病、藥物等因素影響而變動。本工具不能作為避孕依據，也不是醫療建議；若週期長期不規則、經血量異常或有任何疑慮，請諮詢婦產科醫師。」英文：“This tool estimates dates from the average cycle length you enter. All dates are estimates; actual cycles vary with stress, routine, illness, medication and other factors. This tool must not be relied on for contraception and is not medical advice. If your cycles are persistently irregular, your bleeding is abnormal, or you have any concern, please consult an obstetrician-gynaecologist.”

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。四列皆有值，無空結果情形。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"lastPeriodStart":"","cycleLength":"28","periodLength":"5"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

欄位順序固定為 lastPeriodStart、cycleLength、periodLength，驗證與報錯都依此序，每欄依序檢查：容量 → 未成對 surrogate → 空值 → 文法 → 語意 → 範圍。容量超限 `INPUT_LIMIT`、surrogate `UNICODE`、缺內容 `EMPTY`、日期文法 `DATE_FORMAT`、整數文法 `INTEGER_FORMAT`、不存在的日曆日 `INVALID_DATE`、超出範圍 `RANGE`。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆為 null（本工具無列輸入）。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

- lastPeriodStart：字串，文法 `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`（ASCII 數字與連字號），raw 最多 10 個 UTF-16 單元。文法通過後須為真實日曆日（月 1–12、日不超過該月天數，閏年依 Gregorian 規則），否則 INVALID_DATE。範圍 1900-01-01 至 2100-12-31（含頭尾，以 JDN 比較），否則 RANGE。預設 `""`（由使用者填入或載入範例；核心不讀今天日期）。
- cycleLength：整數字串，文法為 `0` 或非零開頭的 ASCII 數字串（無空白／符號／小數／指數／前導零），raw 最多 8 單元。範圍 21–35（含頭尾），否則 RANGE。預設 `"28"`。
- periodLength：整數字串，文法同 cycleLength，raw 最多 8 單元。範圍 1–10（含頭尾），否則 RANGE。預設 `"5"`。

計算（全程整數，無浮點與捨入）：

1. J0 = JDN(lastPeriodStart)，JDN 演算法釘版於 implementation。
2. 對 i = 0,1,2,3：start = J0 + i × cycleLength；periodEnd = start + periodLength − 1；ovulation = start + cycleLength − 14；fertileStart = ovulation − 5；fertileEnd = ovulation + 1。五個 JDN 各自轉回 ISO 日期字串。
3. 結果 `{cycles:[{index,start,periodEnd,ovulation,fertileStart,fertileEnd} × 4]}`，index 為 0–3，日期皆 `YYYY-MM-DD`。輸出日期可落在輸入範圍之外（最晚約 2101 年），不因此報錯。

固定下載 `period-cycle-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/period-cycle-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

日期運算釘版（核心不得使用 `Date` 或主機時區）：正向 JDN 用 Fliegel & Van Flandern 整數公式——a = ⌊(14 − month)/12⌋，y = year + 4800 − a，m = month + 12a − 3，JDN = day + ⌊(153m + 2)/5⌋ + 365y + ⌊y/4⌋ − ⌊y/100⌋ + ⌊y/400⌋ − 32045。反向轉換用 Richards 整數公式。所有加減在 JDN 整數上完成。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算週期預測」，畫面和完整報告符合核心 fixtures，使用者取得對應產物；聲明常駐於結果旁。 |
| boundaries | 合法端點（21／35 天週期、1／10 天經期、閏年 2 月）、剛好越界、第一個錯誤、欄位順序和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log；健康相關輸入不外流尤須實證。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯（含聲明與 FAQ 全文）、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。18 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `regular-28` | 典型 28 天週期，四個週期的開始、經期結束、排卵與易孕期 |
| `short-21` | 週期下限 21 天，排卵日為開始日 +7 |
| `long-35` | 週期上限 35 天，排卵日為開始日 +21 |
| `leap-february` | 跨 2028 閏年 2 月 29 日的日期加法 |
| `year-crossing` | 排卵日與易孕期跨年邊界 |
| `period-one-day` | 經期長度下限 1 天，結束日等於開始日 |
| `period-ten-days` | 經期長度上限 10 天 |
| `cycle-too-short` | 週期 20 天 → RANGE（cycleLength） |
| `cycle-too-long` | 週期 36 天 → RANGE（cycleLength） |
| `period-zero` | 經期 0 天 → RANGE（periodLength） |
| `period-too-long` | 經期 11 天 → RANGE（periodLength） |
| `date-format-slashes` | 斜線日期 → DATE_FORMAT |
| `invalid-date-feb30` | 2 月 30 日 → INVALID_DATE |
| `date-below-range` | 1899-12-31 → RANGE（lastPeriodStart） |
| `cycle-decimal` | 28.5 → INTEGER_FORMAT |
| `date-empty` | 日期空白 → EMPTY |
| `cycle-leading-zero` | 028 → INTEGER_FORMAT |
| `extra-field` | 未知欄位 → SCHEMA |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限（2100-12-31 輸入、預測延伸至 2101）、剛好超限（2101-01-01 輸入 → RANGE）、錯型別、缺欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證不變量：每列 start 嚴格遞增且間隔恰為 cycleLength；periodEnd − start = periodLength − 1；ovulation − start = cycleLength − 14；fertileEnd − fertileStart = 6；所有日期在四種 TZ 環境（UTC、Asia/Taipei、America/New_York、Pacific/Kiritimati）下結果不變。

候選 gate（均 NOT_RUN）

- 於 `tools/period-cycle-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「生理週期計算」，title「生理週期計算｜Gloss Tools」，description「輸入上次月經開始日與平均週期，推算接下來三次月經、排卵日與易孕期的估計日期。」。英文 lang=en，H1 “Period Cycle Calculator”，title “Period Cycle Calculator | Gloss Tools”，description “Estimate your next three period start dates, ovulation day and fertile window from your last period start and average cycle length.”。兩頁靜態呈現操作、限制、聲明與 FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。排卵日怎麼算？本工具假設黃體期固定 14 天，排卵日 = 週期開始日 +（週期長度 − 14）。這是常見的估算慣例，實際排卵日會變動。 / How is the ovulation day estimated? The tool assumes a fixed 14-day luteal phase: ovulation = cycle start + (cycle length − 14). This is a common estimation convention; the actual ovulation day varies.
- FAQ。可以用來避孕嗎？不可以。易孕期只是依平均值推算的估計，不能作為避孕依據；需要避孕請諮詢醫師並使用可靠的避孕方法。 / Can I use this for contraception? No. The fertile window is only an estimate from averages and must not be relied on for contraception; for contraception, consult a clinician and use a reliable method.
- FAQ。我的週期不在 21–35 天怎麼辦？本工具只接受 21–35 天。FIGO 將 24–38 天列為正常頻率範圍；週期長期落在接受範圍外或不規則時，請諮詢婦產科醫師，本工具的估計不適用。 / What if my cycle is outside 21–35 days? This tool accepts 21–35 days only. FIGO lists 24–38 days as the normal frequency range; if your cycles are persistently outside the accepted range or irregular, consult an obstetrician-gynaecologist — this tool's estimates do not apply.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://period-cycle-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/period-cycle-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

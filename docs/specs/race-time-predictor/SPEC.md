# 完賽時間預測 / Race Time Predictor

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-race-time-predictor-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

跑者比完一場比賽後，想用那一筆成績估算自己在其他標準距離的完賽時間，作為報名與訓練目標的參考。

- 桌面。跑者在電腦上輸入最近一場 10K 的完賽時間，立刻看到 5K、半馬與全馬的預測時間和每公里等值配速，決定下一場報名目標。
- 行動。跑者在手機上用一場全馬成績回推 5K／10K 實力，或輸入自訂距離（例如 15K 路跑、30K 目標）查單一預測。

使用情境為估算。資料只保留在目前頁面草稿。公式具名（Riegel）且假設與限制印在結果旁，不把預測包裝成保證成績。

## scope

MVP 必做：單筆已知成績（距離＋時間）輸入；Riegel 公式預測 5K、10K、半馬、全馬四個標準距離，加一個選填的自訂目標距離；每一列同時給預測秒數與每公里等值配速；固定報告下載。

非目標：配速／時間／距離三欄任意求解、分段配速表（split table）、英里或公里單位切換（本工具距離一律公尺、配速一律每公里）、GPS／地圖輸入、海拔、天氣或路線修正、負分段或其他配速策略、訓練計畫、心率區間、成績保存、歷史紀錄或分享。

已比對 checkout 內 `docs/specs/` 全部既有預案，最相近者的實質差異如下。

- 既有 Running Pace Calculator 支援配速、時間、距離任填二求一與等速分段表。已知距離可在允許範圍內輸入公里或英里小數，並以 Riegel 1.06 顯示 5K、10K、半馬、全馬的預測時間及各列配速。本工具也用相同公式和四個標準目標，差異在於直接輸入已知成績後執行預測、可另輸入一個自訂目標距離，以及用公尺輸入並固定顯示每公里配速。 [既有固定 Running Pace SPEC](https://github.com/KYStr/glossquote-labs-home/blob/40a7dc689e8e2fc2c527c323ca68398d95e9db19/docs/specs/running-pace-calculator/SPEC.md#L6-L23)
- 由跑步配速推單一距離的分段與完賽時間是該工具的求解範圍；本工具不接受配速作為輸入。

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「已知成績距離 / Known result distance」（預設選項：5K、10K、半馬、全馬、自訂）
- 欄位或說明「自訂距離（公尺） / Custom distance (metres)」（僅選「自訂」時啟用）
- 欄位或說明「完賽時間 / Finish time」
- 欄位或說明「自訂目標距離（公尺，選填） / Custom target distance (metres, optional)」
- 「預測完賽時間 / Predict finish times」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「各距離預測時間與配速 / Predicted times and pace by distance」先摘要（已知成績的每公里配速）再列表，固定順序 5K、10K、半馬、全馬、自訂。成功才顯示「下載報告 / Download report」。結果旁常駐估算聲明（見 inputsOutputs 釘版文字）。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。預測表含已知距離本身一列，其值與輸入完全相同。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"knownPreset":"10k","knownCustomM":"","knownTime":"","targetCustomM":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

欄位順序固定為 knownPreset、knownCustomM、knownTime、targetCustomM，驗證與第一個錯誤都依此順序。

- `knownPreset`：列舉字串，只接受 `5k`、`10k`、`half`、`marathon`、`custom`，其他值 ENUM。標準距離的公尺數釘版為字面常數：5k = 5000、10k = 10000、half = 21097.5、marathon = 42195（公尺）。raw 最多 8 單元。
- `knownCustomM`：自訂已知距離（公尺）。僅 `knownPreset="custom"` 時啟用。啟用時必填，文法為 ASCII 十進數 `^[0-9]+(\.[0-9]{1,2})?$`（無空白／符號／指數），不合文法 DECIMAL_FORMAT；值域 400–42,195（含端點），出界 RANGE。未啟用時只做容量檢查，其餘檢查跳過且值被忽略（結果與該欄內容無關）。raw 最多 12 單元。
- `knownTime`：完賽時間字串，文法 `^[0-9]{1,3}(:[0-9]{2}){1,2}$`。兩段解讀為 M:SS、三段解讀為 H:MM:SS。不合文法 TIME_FORMAT。尾段（SS，以及三段時的 MM）必須 ≤ 59，超過為 RANGE。總秒數值域 10–359,999，超出 RANGE。raw 最多 10 單元。
- `targetCustomM`：自訂目標距離（公尺），選填。空字串表示不產生自訂列，不視為錯誤。非空時文法與值域同 `knownCustomM`（DECIMAL_FORMAT／RANGE，400–42,195）。raw 最多 12 單元。

每欄先容量（INPUT_LIMIT）、再不成對 surrogate（UNICODE）、再必填（EMPTY）、再文法、再範圍；跨欄依欄位順序回第一個錯誤。整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆為 null（本工具無列輸入）。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算（精度策略釘版，builder 必須照此順序以得到與 fixtures 逐位一致的結果）：

1. D1 = 已知距離公尺數（預設查表或自訂解析值），T1 = 已知時間總秒數（整數）。
2. 對每個目標距離 Dt（依序 5000、10000、21097.5、42195，若有自訂目標再加其值）：以 IEEE-754 雙精度浮點計算 `ratio = Dt / D1`、`factor = Math.pow(ratio, 1.06)`、`rawSeconds = T1 * factor`，中間值不捨入。
3. `predictedSeconds = floor(rawSeconds + 0.5)`（四捨五入至整秒，只捨入一次）。`paceSecPerKm = floor(rawSeconds / (Dt / 1000) * 10 + 0.5) / 10`，即由未捨入的 rawSeconds 除以公里數、四捨五入至 0.1 秒，只捨入一次；不得由 predictedSeconds 反推配速。
4. 已知距離本身必為預測列之一：Dt = D1 時 factor 恰為 1，predictedSeconds 恰等於 T1。
5. 結果 `{knownDistanceM, knownTimeSeconds, knownPaceSecPerKm, predictions}`。`knownPaceSecPerKm = floor(T1 / (D1 / 1000) * 10 + 0.5) / 10`。`predictions` 每列 `{key, distanceM, predictedSeconds, paceSecPerKm}`，key 依序為 `5k`、`10k`、`half`、`marathon`，自訂列 key 為 `custom` 且恆列最後。distanceM 為數字（half 為 21097.5，其餘標準距離與整數自訂值為整數）。

顯示格式（app 層釘版，不影響核心數值）：predictedSeconds ≥ 3600 顯示 `H:MM:SS`（H 無前導零，MM／SS 兩位），否則 `M:SS`。配速顯示把 paceSecPerKm 再四捨五入至整秒後以 `M:SS` 呈現，繁中加後綴「／公里」，英文加後綴「/km」。機器值不隨 locale 改。

估算聲明（結果旁常駐，釘版原文）：繁中「預測以 Riegel 公式估算，假設各距離的訓練與體能狀態相當；實際成績會受路線、天氣、補給與臨場狀況影響，本工具僅供參考。」英文 “Predictions use the Riegel formula and assume equivalent training and fitness across distances; actual results vary with course, weather, fueling and race-day conditions. For reference only.”

固定下載 `race-time-predictor-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/race-time-predictor/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 核心只用 `Math.pow` 與基本運算，不讀 Date、主機時區或任何隨機來源；同一輸入在任何環境得到同一輸出。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「預測完賽時間」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、欄位順序和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。15 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected；fixtures 的數值由作者以高精度運算手算推導、再以 IEEE-754 雙精度腳本獨立重算，雙推導紀錄見 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)。

| 案例 ID | 驗證行為 |
| --- | --- |
| `classic-10k` | 10K 40:00 推四個標準距離（範例案例） |
| `five-k-source` | 5K 20:00 向上預測，已知列恰等於輸入 |
| `marathon-source` | 全馬 3:30:00 向下預測短距離 |
| `half-with-custom-target` | 半馬成績加自訂目標 30000 m，自訂列恆最後 |
| `custom-source` | 自訂已知距離 15000 m 成績 |
| `min-custom-boundary` | 自訂距離下限 400 m 端點合法 |
| `inactive-custom-ignored` | 非自訂預設時 knownCustomM 內容被忽略 |
| `err-time-format` | 時間 SS 非兩位數 → TIME_FORMAT |
| `err-time-component-range` | 時間 SS = 60 → RANGE |
| `err-preset-enum` | 未知預設值 → ENUM |
| `err-custom-empty` | 自訂預設但距離空白 → EMPTY |
| `err-custom-format` | 距離含千分位逗號 → DECIMAL_FORMAT |
| `err-custom-range` | 距離 399.99 低於下限 → RANGE |
| `err-target-format` | 自訂目標非數字 → DECIMAL_FORMAT（欄位 targetCustomM） |
| `err-schema-extra-field` | 多出未知欄位 → SCHEMA |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限（自訂距離 42195、時間 359999 秒）、剛好超限（42195.01、總秒 360000、SS／MM = 60 的三段式）、錯型別、缺欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證：已知列 predictedSeconds 恆等於輸入秒數；Dt 遞增時 predictedSeconds 不遞減；自訂列只在 targetCustomM 非空時出現且恆為最後一列。

候選 gate（均 NOT_RUN）

- 於 `tools/race-time-predictor/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「完賽時間預測」，title「完賽時間預測｜Gloss Tools」，description「輸入一場比賽的距離與完賽時間，用 Riegel 公式預測 5K、10K、半馬與全馬的完賽時間與每公里配速。」。英文 lang=en，H1 “Race Time Predictor”，title “Race Time Predictor | Gloss Tools”，description “Enter a known race result and use the Riegel formula to predict finish times and per-kilometre pace for 5K, 10K, the half marathon and the marathon.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。Riegel 公式是什麼？預測時間 T2 = T1 × (D2/D1)^1.06，指數 1.06 為本工具釘版常數。 / What is the Riegel formula? The predicted time is T2 = T1 × (D2/D1)^1.06; the exponent 1.06 is a fixed constant in this tool.
- FAQ。預測準確嗎？僅為估算，假設各距離的訓練與體能狀態相當；距離比越大越不穩定。 / How accurate is the prediction? It is an estimate that assumes equivalent training and fitness across distances; it gets less reliable as the distance ratio grows.
- FAQ。可以預測超過全馬的距離嗎？本工具的自訂距離上限為 42,195 公尺，不提供超馬預測。 / Can I predict distances beyond the marathon? Custom distances are capped at 42,195 metres in this tool; ultramarathon predictions are not offered.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://race-time-predictor.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/race-time-predictor/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

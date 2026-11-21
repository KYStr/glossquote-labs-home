# 地圖比例尺換算 / Map Scale Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-map-scale-calculator-20261121` · 2026-11-21 · v1

[本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/90a4e0cb/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

登山客拿著 1:25000 的等高線地圖，量到兩個山頭在圖上相距 4 公分，想知道實際要走多遠；反過來，知道營地離登山口實際 3.5 公里，也想知道在圖上是幾公分，好先用尺在圖上標出來。

- 桌面。桌面填比例尺與圖上距離，對照常用比例尺表，確認實際距離（公尺與公里並列）。
- 行動。手機在山上或出發前反向換算實際距離回圖上距離，不留紀錄。

使用情境為設計假設。資料只保留在目前頁面草稿。

## scope

比例尺分母 N（1:N）＋圖上距離（公分）→ 實際距離（公尺／公里）；反向：實際距離（公尺／公里）＋比例尺 → 圖上距離（公分）。常用比例尺對照表與單位換算規則見 inputsOutputs。非目標為路線規劃、海拔／坡度換算、經緯度或座標換算、實地測量、列印比例校正、地圖圖資下載或線上圖磚。

與既有工具的實質差異如下。

- 單位換算工具（unit-converter，catalog 內已發布舊工具）。該工具在同一物理量的單位之間換算（例如公尺 ↔ 公里）；此處先套用 1:N 地圖比例，再換算長度單位，是比例的應用，不是單純單位換算。本 checkout 內無 unit-converter 規格，差異以概念界定。
- 跑步配速工具（running-pace-calculator）。該工具由距離與時間算配速與完賽時間；此處不碰時間與速度，只算圖上距離與實際距離的比例對應。 [running-pace-calculator](https://github.com/KYStr/glossquote-labs-home/blob/90a4e0cb/docs/specs/running-pace-calculator/SPEC.md)
- 油錢試算工具（fuel-cost-calculator）。該工具由距離與油耗算行車油錢；此處不算費用，只算距離本身。 [fuel-cost-calculator](https://github.com/KYStr/glossquote-labs-home/blob/90a4e0cb/docs/specs/fuel-cost-calculator/SPEC.md)

判定規則由本文定義，無線上資料或外部服務依賴。比例尺對照表由「圖上 1 單位＝實際 N 單位」的定義直接推導，不引用外部表。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 模式切換「換算方向 / Direction」：正向「圖上距離 → 實際距離 / Map distance → real distance」與反向「實際距離 → 圖上距離 / Real distance → map distance」。
- 欄位或說明「比例尺 1:N / Map scale 1:N」，附常用比例尺對照表（見 inputsOutputs），點任一列即把分母填入比例尺欄。
- 正向欄位或說明「圖上距離（公分） / Map distance (cm)」；反向欄位或說明「實際距離 / Real distance」＋單位選擇「公尺 / m」「公里 / km」。
- 「換算 / Convert」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「換算結果 / Result」先摘要（主要單位數值）再列細節：正向同時顯示公尺與公里，反向同時顯示圖上公分與實際距離的公尺／公里對照。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"mode":"map-to-real","scale":"25000","mapCm":"4","realValue":"1","realUnit":"km"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- `mode`：`"map-to-real"` 或 `"real-to-map"`，其餘值 SCHEMA，field=`"mode"`。
- `scale`：ASCII 十進整數字串，1 或非零開頭，無空白／符號／小數／指數，raw 每欄最多 12 單元，範圍 1–10,000,000。
- `mapCm`（正向）：十進小數字串，ASCII 數字、可選一個小數點、小數點前後至少一位數字、小數點後最多 3 位，無正負號／空白／指數，raw 最多 12 單元，範圍 0.01–10,000（公分）。
- `realValue`（反向）：與 `mapCm` 同一文法，raw 最多 12 單元；範圍依 `realUnit`：`"m"` 時 0.01–1,000,000（公尺），`"km"` 時 0.01–1,000（公里）。
- `realUnit`（反向）：`"m"` 或 `"km"`，其餘值 SCHEMA，field=`"realUnit"`。正向忽略此欄（仍須為 own data 欄位時才接受；未知欄一律 SCHEMA）。
- 預設 `{"mode":"map-to-real","scale":"25000","mapCm":"4","realValue":"1","realUnit":"km"}`。正向不讀 `realValue`／`realUnit`，反向不讀 `mapCm`；未被讀取的欄位不驗證。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 `mode`、`scale`、`realUnit`（反向）、`mapCm`（正向）／`realValue`（反向）順序驗證。raw 超限 INPUT_LIMIT、缺內容 EMPTY、文法 scale 為 INTEGER_FORMAT、距離欄為 DECIMAL_FORMAT、範圍 RANGE，field 即上述欄名。`scale` 為 `"0"` 屬 RANGE；`mapCm`／`realValue` 為 `"0"` 或 `"0.000"` 屬 RANGE；負號屬 DECIMAL_FORMAT（文法不接受正負號）。
2. 正向：實際距離（公分）＝ `mapCm × N`；實際公尺 ＝ 實際公分 ÷ 100；實際公里 ＝ 實際公尺 ÷ 1000。反向：實際距離先化為公分（`"m"` × 100，`"km"` × 100,000），圖上公分 ＝ 實際公分 ÷ N。輸入最多 3 位小數，全程以毫單位整數（BigInt）做精確有理數運算，不用二進位浮點。
3. 捨入只在最後輸出：`realMeters` 取 2 位小數、`realKilometers` 取 3 位小數、反向算出的 `mapCentimeters` 取 2 位小數，一律 half-up（0.5 往遠離零的方向進位；本工具數值皆為正數）。正向的 `mapCentimeters` 為輸入回顯，不另捨入（見第 4 點）。分級（主要單位）用捨入前的精確值判定：正向精確實際公尺 < 1000 時 `primaryUnit="m"`，≥ 1000 時 `"km"`；反向 `primaryUnit="cm"`。顯示字串去尾零（例如 `"1000"`、`"1.25"`、`"0.309"`、`"308.5"`）。
4. 結果 `{mode,scale,mapCentimeters,realMeters,realKilometers,primaryUnit}`：`scale` 為整數；其餘三個距離值為去尾零後的十進字串；`mode` 回傳輸入的模式；`primaryUnit` 為 `"m"`、`"km"` 或 `"cm"`。正向 `mapCentimeters` 為輸入圖上距離的正規化回顯（去尾零）；反向 `realMeters`／`realKilometers` 為輸入實際距離換算後的正規化值。

常用比例尺對照表（釘版，由 1:N 定義推導；圖上 1 公分＝實際 N 公分＝N÷100 公尺；實際 1 公里＝100,000 公分，圖上公分＝100,000÷N）：

| 比例尺 | 圖上 1 公分＝實際 | 實際 1 公里＝圖上 |
| --- | --- | --- |
| 1:1000 | 10 公尺 | 100 公分 |
| 1:5000 | 50 公尺 | 20 公分 |
| 1:10000 | 100 公尺 | 10 公分 |
| 1:25000 | 250 公尺 | 4 公分 |
| 1:50000 | 500 公尺 | 2 公分 |
| 1:100000 | 1 公里 | 1 公分 |
| 1:200000 | 2 公里 | 0.5 公分 |

固定下載 `map-scale-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/map-scale-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行正向與反向「換算」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。16 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `forward-25000-basic` | 正向 1:25000、圖上 4 公分 → 恰為 1000 公尺＝1 公里，主要單位公里 |
| `forward-50000-decimal` | 正向小數圖上距離 2.5 公分 → 1250 公尺＝1.25 公里 |
| `forward-10000-small` | 正向 0.8 公分 → 80 公尺＝0.08 公里，主要單位公尺 |
| `forward-5000-metres` | 正向 12.4 公分 → 620 公尺＝0.62 公里 |
| `forward-100000-km` | 正向 7.35 公分 → 7350 公尺＝7.35 公里 |
| `forward-rounding-half-up` | 正向 1.234 公分 → 308.5 公尺、公里 0.3085 half-up 為 0.309 |
| `inverse-25000-km` | 反向 3.5 公里 → 圖上 14 公分 |
| `inverse-50000-m` | 反向 750 公尺 → 圖上 1.5 公分 |
| `inverse-10000-m` | 反向 125 公尺 → 圖上 1.25 公分 |
| `inverse-200000-km` | 反向 12 公里 → 圖上 6 公分 |
| `inverse-rounding` | 反向 333 公尺 → 圖上 1.332 公分 half-up 為 1.33 公分 |
| `scale-zero` | 比例尺分母 0，RANGE |
| `scale-decimal` | 比例尺分母帶小數，INTEGER_FORMAT |
| `map-negative` | 圖上距離負號，DECIMAL_FORMAT |
| `real-empty` | 實際距離空白，EMPTY |
| `map-too-large` | 圖上距離 20000 公分超上限，RANGE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 scale=1、scale=10,000,000、scale=10,000,001、mapCm=0.01、mapCm=10,000、mapCm=10,000.001、realValue 小數點後 4 位、主要單位在精確值 999.996 公尺時仍為公尺（捨入後顯示 1000 公尺不改變主要單位）。所有已接受的結果皆由精確有理數運算得出，捨入只在最後輸出。

候選 gate（均 NOT_RUN）

- 於 `tools/map-scale-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「地圖比例尺換算」，title「地圖比例尺換算｜Gloss Tools」，description「輸入地圖比例尺與圖上距離，換算實際距離；反向也可由實際距離算回圖上距離，並附常用比例尺對照表。」。英文 lang=en，H1 “Map Scale Calculator”，title “Map Scale Calculator | Gloss Tools”，description “Convert map distance to real distance from a map scale, or real distance back to map distance, with a common-scales reference table.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。比例尺 1:25000 是什麼意思？圖上 1 公分等於實際 250 公尺（25,000 公分）。 / What does a 1:25000 scale mean? 1 cm on the map equals 250 m (25,000 cm) in reality.
- FAQ。為什麼實際距離同時顯示公尺和公里？短距離讀公尺較直覺，長距離讀公里較方便；主要單位以精確值 1000 公尺為界切換。 / Why show both metres and kilometres? Metres read better for short distances and kilometres for long ones; the primary unit switches at exactly 1000 m on the unrounded value.
- FAQ。可以輸入不是整數的圖上距離嗎？可以，小數點後最多 3 位，例如 2.5 公分。 / Can I enter a non-integer map distance? Yes, up to 3 decimal places, for example 2.5 cm.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://map-scale-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/90a4e0cb/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/map-scale-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

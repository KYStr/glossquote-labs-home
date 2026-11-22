# 調酒酒精度 / Cocktail ABV Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-cocktail-abv-calculator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

在家調酒或在吧檯點單前，把配方裡 2–6 種材料的體積與酒精度加總，知道這一杯到底有多烈、相當於幾標準杯，而不是憑感覺猜。

- 桌面。桌面填上每種材料的體積與酒精度，逐步確認總酒精度與標準杯數，決定要不要減烈或改配方。
- 行動。手機在吧檯或超市核對一杯調酒的酒精度與標準杯數，不啟動任何外部查詢。

使用情境為設計假設。資料只保留在目前頁面草稿。

## scope

2–6 種材料（每種體積 ml＋酒精度 ABV%）→ 總體積、總酒精度、純酒精公克數、台灣標準杯數。非目標為估算血液酒精濃度、依體重／性別／時間推算酒意或代謝、酒駕判定、推薦配方、查酒品資料庫、把結果當醫療或法律建議。

本工具與既有工具的實質差異如下。

- bac-calculator 把每杯飲料當作已知輸入（ml＋ABV）去估血液酒精濃度；本工具算出一杯調酒本身的酒精度與標準杯數——不同交付物。本工具不輸出任何血液濃度、酒意或代謝時間。
- 本工具不做單一飲品的單位換算：輸入永遠是一份 2–6 種材料的混合配方，至少兩種材料才成一杯調酒。

判定規則由本文定義，無線上資料或外部服務依賴。材料酒精度以使用者輸入的標示值為準，不查表、不驗證市售酒品的真實酒精度。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「材料 1–6、體積、酒精度 / Ingredients 1–6, volume and ABV」
- 欄位或說明「總體積、總酒精度、純酒精、標準杯數 / Total volume, total ABV, pure alcohol and standard drinks」
- 「計算調酒酒精度 / Calculate cocktail ABV」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例（經典瑪格麗特），明示範例並等待手動執行。「新增材料 / Add ingredient」與「移除 / Remove」調整列數（2–6 列）。
- 「總酒精度與標準杯數 / Total ABV and standard drinks」先摘要再列細節，逐列酒精量列在有 label 的區域。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 結果區固定顯示資訊行（非判定）：「衛福部建議：男性每日不超過 2 單位、女性不超過 1 單位（1 單位＝10 g 純酒精）；不喝最健康。 / MOHW guidance: no more than 2 units per day for men and 1 for women (1 unit = 10 g pure alcohol); not drinking is healthiest.」

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"ingredients":[{"volumeMl":"45","abvPct":"40"},{"volumeMl":"30","abvPct":"0"}]}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- `input` 為 `{ingredients:[{name?,volumeMl,abvPct}, …]}`。`name` 可省，省去或空字串時顯示「材料 n / Ingredient n」；有值時為 1–40 個 Unicode 純量值，不可含 lone surrogate。`volumeMl`、`abvPct` 為 ASCII 十進字串，raw 每欄最多 8 單元。
- `volumeMl`：小數點後至多 1 位，0.1–2000 ml。`abvPct`：小數點後至多 1 位，0–100（含 0 與 100）。字串文法：ASCII 數字、可選一個小數點、無符號／空白／指數；前導零可接受（`045` 視為 45）。
- 列數 2–6 列。少於 2 列為 ROW_COUNT，多於 6 列為 ROW_LIMIT，field 與 row 皆 null。全部材料 ABV 皆為 0 亦合法（無酒精調酒），結果總酒精度 0.0%、標準杯數 0.0。
- 預設 2 列：`{"volumeMl":"45","abvPct":"40"}` 與 `{"volumeMl":"30","abvPct":"0"}`。

先形狀、再列數、再逐列順序驗證。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、列數不足 ROW_COUNT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 材料列或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 形狀：input 非物件、缺 `ingredients`、ingredients 非陣列、列非物件、列含未知欄、或欄位非字串，皆 SCHEMA（field 為涉事欄位名或 null，row 為涉事列號或 null）。
2. 列數：少於 2 列 ROW_COUNT，多於 6 列 ROW_LIMIT。
3. 逐列依列序、每列依 `name`、`volumeMl`、`abvPct` 驗證。name 超長 INPUT_LIMIT、lone surrogate UNICODE；volumeMl／abvPct 超長 INPUT_LIMIT、文法 NUMBER_FORMAT、範圍 RANGE。第一個錯誤即停止並回傳。
4. 計算（十進精確算術，內部不捨入）。每列純酒精體積 `alcoholMl_i = volumeMl_i × abvPct_i / 100`。總體積 `totalVolumeMl = Σ volumeMl_i`。總純酒精體積 `totalAlcoholMl = Σ alcoholMl_i`。總純酒精質量 `totalAlcoholG = totalAlcoholMl × 0.789`（乙醇密度 0.789 g/ml，20 °C，見 implementation）。總酒精度 `totalAbvPct = 100 × totalAlcoholMl / totalVolumeMl`。標準杯數 `standardDrinks = totalAlcoholG / 10`（台灣 1 標準杯＝10 g 純酒精，見 implementation）。
5. 輸出捨入：所有輸出數值以 half-up（0.5 向大取值）捨入至小數點後 1 位，僅在輸出時捨入。總量由未捨入的合計值計算並捨入，不由已捨入的逐列值加總。`totalVolumeMl` 為輸入合計（輸入至多 1 位小數，故合計精確至 1 位小數）。
6. 結果 `{rows,totalVolumeMl,totalAlcoholMl,totalAlcoholG,totalAbvPct,standardDrinks}`。`rows` 依輸入列序，每列 `{row,name,volumeMl,abvPct,alcoholMl,alcoholG}`，其中 name 為顯示用名稱（省去或空字串時為「材料 n / Ingredient n」），volumeMl 與 abvPct 為輸入數值，alcoholMl 與 alcoholG 為該列純酒精體積與質量（half-up 至 1 位小數）。
7. 體積以加法合計，不扣除乙醇與水混合時的體積收縮；此為本工具的模型簡化，結果區以固定文字揭露（見 implementation）。輸出數值不隨 locale 改。

固定下載 `cocktail-abv-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

固定免責文字（結果區逐字顯示，中英對照）：「本結果為估算值，僅供參考，不構成醫療或法律建議；不估算血液酒精濃度。 / This result is an estimate for reference only and is not medical or legal advice; it does not estimate blood alcohol concentration.」

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/cocktail-abv-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 釘版常數。乙醇密度 **0.789 g/ml**（20 °C；OIML R 22 國際酒精計量表所用乙醇密度）。台灣 1 標準杯＝**10 g 純酒精**（衛生福利部 2023-07-14「每日飲酒酒精標準量」：1 酒精單位＝10 公克純酒精；男性每日不超過 2 單位、女性不超過 1 單位）。公式：純酒精公克數＝體積 ml × ABV% ÷ 100 × 0.789；標準杯數＝純酒精公克數 ÷ 10。衛福部自舉例可交叉核對：508 ml、5% 啤酒＝508×0.05×0.789＝20.0 g＝2 單位，與官方「男性 508 ml 該止步」一致。
- 捨入。half-up（0.5 向大取值）至小數點後 1 位，僅輸出時捨入；內部以十進精確算術（整數十分位）計算，不用二進浮點累加。`half-up-boundary` 案例（總酒精度原始值恰為 12.25%）用以鎖定 half-up 而非 half-even：half-up 得 12.3%，half-even 會得 12.2%。
- 體積收縮。真實乙醇–水混合體積略小於各體積之和；本工具採加法合計並在結果區固定揭露：「體積以加法合計，未扣除混合體積收縮。 / Volumes are summed additively; mixing contraction is not deducted.」不做收縮修正、不查表。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算調酒酒精度」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。13 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `classic-margarita` | 經典瑪格麗特，三種材料，總酒精度 26.7%、1.9 標準杯 |
| `negroni` | 內格羅尼，三種材料等體積不同酒精度 |
| `long-island-six` | 六種材料上限，含 0% 材料 |
| `aperol-spritz` | 低酒精度氣泡調酒，總酒精度 9.2% |
| `mocktail-zero` | 全部材料 0%，結果全為 0.0 |
| `whisky-water` | 兩種材料下限，一種含酒精一種不含 |
| `daiquiri-decimal` | 小數體積輸入（0.5 ml 刻度） |
| `half-up-boundary` | 總酒精度原始值恰 12.25%，鎖定 half-up 得 12.3% |
| `too-few-rows` | 只有 1 列，ROW_COUNT |
| `too-many-rows` | 7 列，ROW_LIMIT |
| `abv-over-100` | 酒精度 101，RANGE，field abvPct、row 2 |
| `volume-zero` | 體積 0，RANGE，field volumeMl、row 1 |
| `volume-two-decimals` | 體積小數點後 2 位，NUMBER_FORMAT |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 volumeMl=0.1 與 2000、abvPct=0 與 100、6 列與 7 列、第一個錯誤的欄位與列號、half-up 與 half-even 的分歧點（12.25% → 12.3%）。所有已接受的總酒精度介於 0 與 100 之間，標準杯數不為負。

候選 gate（均 NOT_RUN）

- 於 `tools/cocktail-abv-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「調酒酒精度」，title「調酒酒精度｜Gloss Tools」，description「把配方裡 2–6 種材料的體積與酒精度加總，知道這一杯有多烈、相當於幾標準杯。」。英文 lang=en，H1 “Cocktail ABV Calculator”，title “Cocktail ABV Calculator | Gloss Tools”，description “Add up 2–6 ingredients by volume and ABV to see how strong a mixed drink is and how many standard drinks it holds.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。總酒精度怎麼算？各材料純酒精體積加總除以總體積。 / How is total ABV calculated? Total pure-alcohol volume divided by total volume.
- FAQ。標準杯是多少？台灣 1 標準杯＝10 g 純酒精。 / What is one standard drink? In Taiwan, one standard drink is 10 g of pure alcohol.
- FAQ。會估算血液酒精濃度嗎？不會，本工具只算調酒本身的酒精度。 / Does it estimate blood alcohol concentration? No. It only calculates the mixed drink's own ABV.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://cocktail-abv-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/cocktail-abv-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

# 烤盤尺寸換算 / Baking Pan Converter

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-baking-pan-converter-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

烘焙者手邊的烤盤和食譜指定的不同：食譜寫 8 吋圓模、家裡只有 9 吋方模，或想把長方形烤盤的配方改進 Bundt 模。憑直徑或邊長猜倍率會錯——容量隨尺寸平方／立方變，9 吋圓模比 8 吋圓模多約 27% 容量。使用者要的是：選來源盤與目標盤，立刻得到可信的倍率與換算後麵糊份量，並且知道換盤後麵糊深度變淺或變深。

- 桌面。烘焙者在電腦上逐項核對容量表，把食譜份量換算到手邊的盤，存下報告對照採買與秤量。
- 行動。賣場或廚房裡在手機上臨時比對兩個盤，決定買哪個尺寸或份量要乘多少。

使用情境為家庭烘焙估算。資料只保留在目前頁面草稿；容量為標稱尺寸的直壁幾何近似（見 inputsOutputs 的揭露），不是實測容量保證。

## scope

MVP 必做：來源盤與目標盤各可選「表格」（11 列釘版烤盤）或「自訂尺寸」（圓形或方形／長方形，公分輸入）；倍率 = 目標容量 ÷ 來源容量（2 位小數）與百分比（1 位小數）；單一麵糊份量（公克或毫升，可省略）按未捨入倍率換算一次；深度關係判定與釘版提醒文字；11 列容量對照表固定呈現；固定報告下載。

非目標如下，刻意排除：

- **食材配比數學。** 不輸入多種食材、不算麵粉基準百分比、不做總麵團重量反推。那是 bakers-percentage-calculator（烘焙百分比計算）的範圍：它處理「配比」表示法與重量之間的換算；本工具只處理「同一份麵糊在兩個盤之間的份量倍率」，唯一的份量輸入是一個總量（一份麵糊量），不存在食材概念。兩者輸入與輸出不重疊。
- 烘烤時間／溫度調整的計算或建議數值（只顯示釘版提醒文字，見 tests）。
- 以杯（cup）為輸入或輸出單位；容量一律毫升。Bundt／中空模的標稱容量來源以杯標示，進表時已按該來源自身的 1 cup = 237 ml 慣例換算為毫升並釘版（見 inputsOutputs）。
- 量測模式（裝水量自家烤盤）、多盤加總、分割麵糊到多個盤、食譜儲存或分享。

已比對本 repo 既有預案，最相近者的實質差異如下。

- bakers-percentage-calculator（烘焙百分比計算）：以麵粉總重為 100 基準，把配比百分比與各食材公克重互相換算。本工具不碰配比與食材，只以盤容量比縮放單一總量。邊界以本節與該規格 scope 為準，任一邊擴張都須先改規格。
- cooking-measurement-converter（料理單位換算）：換算的是量匙／量杯與食材密度（體積↔重量），對象是食材；本工具換算的是容器容量比，對象是烤盤，不查任何食材密度表。

常數與烤盤表由本文釘版並於 AUTHOR-CHECK 記錄來源；無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「來源烤盤 / Source pan」：方式選項「表格選盤 / From the table」或「自訂尺寸 / Custom size」。選表格時顯示烤盤下拉（11 列，名稱雙語併陳、附英吋與公分尺寸）；選自訂時顯示形狀選項「圓形 / Round」「方形或長方形 / Square or rectangular」、直徑或長、寬（僅方形／長方形）、深度，單位一律公分，欄旁以只讀小字顯示英吋等值（公分 ÷ 2.54，四捨五入 2 位；僅顯示，不進核心結果與報告）。
- 欄位或說明「目標烤盤 / Target pan」：同上結構。
- 欄位或說明「麵糊份量（可省略）/ Batter quantity (optional)」：一個數量欄與單位選項「公克 / Grams (g)」「毫升 / Millilitres (ml)」。留空表示只算倍率。
- 「換算 / Convert」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「換算結果 / Conversion result」先摘要再列細節：來源盤與目標盤各一列（名稱或形狀、容量毫升、容量依據「幾何計算 / Geometric」或「標稱容量 / Nominal」、深度公分或「—」），再列倍率（2 位小數）、百分比（1 位小數）、換算後份量（有輸入時）、深度關係（「較淺 / Shallower」「較深 / Deeper」「相同 / Same depth」「未知 / Unknown」）。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 深度關係為較淺或較深時，結果下方顯示對應釘版提醒（見 tests）；為未知時顯示「有一側是標稱容量烤盤，沒有可比的深度。/ One side is a nominal-capacity pan, so depths cannot be compared.」。結果區下方另常駐容量近似揭露（見 tests）。
- 結果下方常駐「烤盤容量對照表 / Pan capacity table」：11 列固定內容與輸入無關，兩語頁數字相同（僅名稱與表頭語言不同），置於有 label 的可捲動區域。對照表不進報告。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。對照表照常顯示。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果與對照表可見。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"sourceKind":"table","sourcePan":"round-8","sourceShape":"round","sourceD1":"","sourceD2":"","sourceDepth":"","targetKind":"table","targetPan":"round-9","targetShape":"round","targetD1":"","targetD2":"","targetDepth":"","quantity":"","quantityUnit":"g"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes（本工具無檔案欄）。

欄位順序固定為 sourceKind、sourcePan、sourceShape、sourceD1、sourceD2、sourceDepth、targetKind、targetPan、targetShape、targetD1、targetD2、targetDepth、quantity、quantityUnit；驗證依此順序逐欄進行，停在第一個錯誤。全欄位皆為字串。

1. `sourceKind`／`targetKind`：恰為 `table` 或 `custom`。raw 最多 8 個 UTF-16 code units。決定該側其餘欄位的啟用狀態。
2. `sourcePan`／`targetPan`：kind 為 `table` 時啟用，恰為下表 11 個 id 之一。raw 最多 12 units。kind 為 `custom` 時未啟用。
3. `sourceShape`／`targetShape`：kind 為 `custom` 時啟用，恰為 `round` 或 `rect`。raw 最多 8 units。
4. `sourceD1`／`targetD1`：kind 為 `custom` 時啟用。圓形為直徑、方形／長方形為長，單位公分。raw 最多 8 units。
5. `sourceD2`／`targetD2`：kind 為 `custom` 且 shape 為 `rect` 時啟用（寬，公分）。raw 最多 8 units。其餘情形未啟用。
6. `sourceDepth`／`targetDepth`：kind 為 `custom` 時啟用（深度，公分）。raw 最多 8 units。
7. `quantity`：可省略欄位，空字串為合法（表示不換算份量）。非空時為麵糊總量。raw 最多 10 units。
8. `quantityUnit`：quantity 非空時啟用，恰為 `g` 或 `ml`。raw 最多 4 units。quantity 為空時未啟用。

未啟用欄位只查容量（INPUT_LIMIT），其餘檢查一律略過——即使內容是垃圾字串也不報錯（與 race-time-predictor 的未啟用欄位先例一致）。啟用欄位逐欄檢查順序固定：容量 INPUT_LIMIT → 未成對 surrogate UNICODE → 空 EMPTY → 文法或列舉（DECIMAL_FORMAT／ENUM）→ 範圍 RANGE。啟用且必填的欄位為：kind 為 table 時的 pan、kind 為 custom 時的 shape／D1／depth、shape 為 rect 時的 D2、quantity 非空時的 quantityUnit；這些欄位空字串為 EMPTY。kind 本身空字串為 EMPTY、非列舉值為 ENUM。尺寸與份量的文法皆為：ASCII 十進字串，整數部為 `0` 或非零開頭的數字串，可帶小數部 `.` 加 1–2 位數字；無正負號、空白、千分位、指數。尺寸範圍：D1／D2 於 5–60 公分（含端點），depth 於 1–15 公分（含端點）。quantity 範圍：> 0 且 ≤ 100,000。整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆為 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

預設即 userFlow 的重設值。範例為 fixtures 第一個案例的 input。

烤盤表（釘版字面資料；產品程式須逐字內含此表，不得改值）。尺寸以英吋為標稱原值，公分 = 英吋 × 2.54（精確定義）逐項列出。體積推導規則：幾何列的體積毫升 = 以公分尺寸按下方公式算出的幾何體積，四捨五入（round-half-up）至整數毫升後釘版——表中 volumeMl 是字面常數，產品直接查表，不在執行時重算幾何列。標稱列（basis = nominal）的體積不是幾何值：Bundt 10 吋 = 12 杯、中空模 10×4 吋 = 16 杯，出自標準烤盤換算表（見 AUTHOR-CHECK 的來源紀錄），按該表自身慣例 1 cup = 237 ml 換算為 2844／3792 ml 釘版，其 depthCm 為 null。

| id | 名稱（zh-Hant） | Name (en) | 標稱尺寸（英吋） | 尺寸（公分） | depthCm | volumeMl | basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| round-6 | 圓形 6 吋 | 6-inch round | ⌀6 × 2 | ⌀15.24 × 5.08 | 5.08 | 927 | geometric |
| round-7 | 圓形 7 吋 | 7-inch round | ⌀7 × 2 | ⌀17.78 × 5.08 | 5.08 | 1261 | geometric |
| round-8 | 圓形 8 吋 | 8-inch round | ⌀8 × 2 | ⌀20.32 × 5.08 | 5.08 | 1647 | geometric |
| round-9 | 圓形 9 吋 | 9-inch round | ⌀9 × 2 | ⌀22.86 × 5.08 | 5.08 | 2085 | geometric |
| round-10 | 圓形 10 吋 | 10-inch round | ⌀10 × 2 | ⌀25.40 × 5.08 | 5.08 | 2574 | geometric |
| square-8 | 方形 8×8 吋 | 8×8-inch square | 8×8 × 2 | 20.32×20.32 × 5.08 | 5.08 | 2098 | geometric |
| square-9 | 方形 9×9 吋 | 9×9-inch square | 9×9 × 2 | 22.86×22.86 × 5.08 | 5.08 | 2655 | geometric |
| rect-9x13 | 長方形 9×13 吋 | 9×13-inch rectangular | 9×13 × 2 | 22.86×33.02 × 5.08 | 5.08 | 3835 | geometric |
| loaf-9x5 | 吐司／磅蛋糕模 9×5 吋 | 9×5-inch loaf | 9×5 × 2.5 | 22.86×12.70 × 6.35 | 6.35 | 1844 | geometric |
| bundt-10 | Bundt 模 10 吋（標稱 12 杯） | 10-inch Bundt (nominal 12 cups) | 10 × 3.5 | — | null | 2844 | nominal |
| tube-10 | 中空蛋糕模 10 吋（標稱 16 杯） | 10-inch tube (nominal 16 cups) | 10 × 4 | — | null | 3792 | nominal |

幾何公式（自訂模式與上表推導共用）：圓形 V = ((π × r) × r) × depth，r = 直徑 ÷ 2；方形／長方形 V = (長 × 寬) × depth。括號即運算順序，不得改序（見 implementation）。

計算與結果（驗證全過後）：

1. 每側容量 exact 值：表格列為表中 volumeMl 整數；自訂為依公式以 IEEE-754 雙精度算出的未捨入值。每側 depthCm：表格列為表中值（標稱列 null）；自訂為輸入深度。
2. `factor` 未捨入值 = targetExact ÷ sourceExact。顯示 `factor` 為 round-half-up 至 2 位小數的字串（如 `"1.27"`、`"0.55"`、`"1.00"`）；`percent` = 未捨入 factor × 100，round-half-up 至 1 位小數的字串（如 `"126.6"`）。兩者都由未捨入 factor 推導，不得由已捨入的 factor 再算 percent。
3. `scaledQuantity`：quantity 為空時為 null；否則 value = quantity 數值 × 未捨入 factor，round-half-up 至 1 位小數、固定 1 位小數字串（如 `"633.0"`），unit 為 quantityUnit 原值。不得由已捨入 factor 計算。
4. 結果每側物件 `{kind, pan, shape, volumeMl, basis, depthCm}`：kind 為 table 時 pan 為 id、shape 為 null；kind 為 custom 時 pan 為 null、shape 為 `round`/`rect`。volumeMl 為整數：表格列即表中整數，自訂為 round-half-up（未捨入容量）至整數。basis 為 `geometric` 或 `nominal`。depthCm 為固定 2 位小數字串（如 `"5.08"`、`"5.50"`、`"14.00"`）或 null（標稱列）。注意 volumeMl 只是顯示值；factor 與 scaledQuantity 一律用未捨入容量，不得用 volumeMl 回算。
5. `depthRelation`：任一側 depthCm 為 null 時為 `"unknown"`；否則比較兩側標準化後的 2 位小數深度值（自訂深度依文法至多 2 位小數，標準化即補零至 2 位；表格深度本為 2 位）：target < source 為 `"shallower"`、> 為 `"deeper"`、相等為 `"same"`。
6. 結果物件鍵序固定為 source、target、factor、percent、scaledQuantity、depthRelation（fixture 以深度比對為準，鍵序僅為閱讀一致性；下載報告的鍵序另依其 canonical 規則）。

固定下載 `baking-pan-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/baking-pan-converter/`。src/core.mjs 放純驗證、推導、格式化（含釘版烤盤表常數）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 精度釘版：自訂圓形體積以 IEEE-754 雙精度、π = Math.PI、運算順序 ((π × r) × r) × depth 計算（r 先由直徑 ÷ 2 得）；方形／長方形為 (長 × 寬) × depth。輸入小數先以 Number 解析（文法保證至多 2 位小數）。捨入函數 r(x, p) = floor(x × 10^p + 0.5) ÷ 10^p，只在每個顯示值產生時套用一次；factor、percent、scaledQuantity、volumeMl 各自從未捨入值直接捨入，禁止串聯捨入。表格列容量為整數常數，不經浮點。分數／整數除法（表格對表格）同樣以雙精度執行；fixtures 的 AUTHOR-CHECK 已量測每個顯示值與捨入 tie 點的距離（最小 0.0618 個顯示刻度），遠大於雙精度除法誤差（約 1e-13 相對），故雙精度與精確有理數推導在所有 fixture 上一致——實作不得引入會縮小此餘裕的額外運算（如先把容量換成公升再換回）。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「換算」，畫面和完整報告符合核心 fixtures（含 π 自訂圓形與標稱列案例），使用者取得對應產物。 |
| boundaries | 合法端點（直徑 60、深度 15／1、份量 100,000）、剛好越界、第一個錯誤、未啟用欄位垃圾內容不報錯和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。15 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `table-upscale-round` | 表格對表格放大：8 吋圓 → 9 吋圓，500 g |
| `table-downscale-rect-square` | 表格對表格縮小：9×13 長方 → 8 吋方，1200 ml |
| `same-pan` | 同盤倍率恰為 1.00／100.0 |
| `custom-round-pi` | 自訂圓形對自訂圓形（π 路徑），直徑 20→24 公分 |
| `custom-rect-to-table` | 自訂長方 → 表格方模，深度關係 shallower |
| `table-loaf-to-custom-rect` | 表格吐司模 → 自訂長方，深度關係 deeper |
| `bundt-nominal-to-round` | 標稱列（Bundt）→ 幾何列，basis 與 depthRelation unknown |
| `no-quantity-round-span` | 省略份量，scaledQuantity 為 null |
| `tube-nominal-to-square` | 標稱列（中空模）→ 表格方模 |
| `custom-max-diameter` | 自訂圓形直徑上限 60 公分邊界 |
| `error-custom-d1-empty` | 自訂直徑留空 → EMPTY |
| `error-d1-decimal-format` | 小數 3 位 → DECIMAL_FORMAT |
| `error-custom-depth-range` | 自訂深度 16 超上限 → RANGE |
| `error-target-pan-enum` | 未知烤盤 id → ENUM |
| `error-quantity-range` | 份量 0 → RANGE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證直徑 5／60 與 4.99／60.01、深度 1／15 與 0.99／15.01、份量 100,000 與 100,000.01、未啟用欄位（如 kind=table 時 D1 填 `abc`）不報錯、quantity 為空時 quantityUnit 填垃圾不報錯。所有表格對表格的 factor 須與精確有理數（整數毫升相除）逐值核對；自訂圓形的 volumeMl 須與高精度 π 推導核對（餘裕見 AUTHOR-CHECK）。

候選 gate（均 NOT_RUN）

- 於 `tools/baking-pan-converter/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「烤盤尺寸換算」，title「烤盤尺寸換算｜Gloss Tools」，description「選來源與目標烤盤，以容量比算出麵糊換算倍率與份量；11 種常見烤盤容量由標稱尺寸幾何推導，Bundt 與中空模用標稱容量並明示。」。英文 lang=en，H1 “Baking Pan Converter”，title “Baking Pan Converter | Gloss Tools”，description “Scale batter between two pans by capacity ratio: 11 common pans with volumes derived geometrically from their nominal dimensions, Bundt and tube pans by labelled nominal capacity.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- 深度提醒（釘版，depthRelation 為 shallower 時顯示；不計算時間／溫度調整）。較淺：相同的麵糊量在較淺的烤盤中攤得較薄，通常熟得比較快——請提早檢查熟度。本工具只換算份量，不調整烘烤時間或溫度。 / Shallower: the same amount of batter spreads thinner in a shallower pan and usually bakes faster — start checking for doneness early. This tool scales quantities only; it does not adjust baking time or temperature.
- 深度提醒（釘版，depthRelation 為 deeper 時顯示）。較深：相同的麵糊量在較深的烤盤中會更厚，通常需要更久才熟——請以牙籤或探針確認中心熟度。本工具只換算份量，不調整烘烤時間或溫度。 / Deeper: the same amount of batter sits thicker in a deeper pan and usually needs longer to bake through — check the centre with a skewer or probe. This tool scales quantities only; it does not adjust baking time or temperature.
- 容量近似揭露（釘版，常駐結果區）。表格體積以標稱尺寸的直壁幾何計算；實際烤盤多有斜壁與圓角，容量會略有差異。標稱列（Bundt／中空模）採標準換算表的標示容量，不是幾何值。 / Table volumes use straight-sided geometry at the nominal dimensions; real pans taper and have rounded corners, so actual capacity differs slightly. Nominal rows (Bundt / tube) use the labelled capacity from a standard conversion chart, not a geometric value.
- FAQ。倍率怎麼看？倍率 = 目標盤容量 ÷ 來源盤容量。大於 1 表示要做更多麵糊，小於 1 表示減量。 / How do I read the factor? Factor = target pan volume ÷ source pan volume. Above 1 means make more batter; below 1 means make less.
- FAQ。為什麼 Bundt 模和中空模用標稱容量？它們的形狀（溝紋、中央管）不是單純的圓柱或方體，幾何公式算不出實容量，所以採用標準換算表的標示容量並標明 nominal。 / Why do Bundt and tube pans use nominal capacity? Their shapes (flutes, a centre tube) are not a plain cylinder or box, so no geometric formula gives the real capacity; the labelled capacity from a standard conversion chart is used and marked nominal.
- FAQ。可以換算每種食材的重量嗎？不行。本工具只換算一份麵糊的總量；食材配比換算請用烘焙百分比計算。 / Can it scale each ingredient's weight? No. This tool scales one total batter quantity only; for ingredient-ratio conversions use the Baker's Percentage Calculator.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://baking-pan-converter.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/baking-pan-converter/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

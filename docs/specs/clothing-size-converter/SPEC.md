# 服飾尺寸換算 / Clothing Size Converter

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-clothing-size-converter-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者在跨境網購或旅行購物時看男裝、女裝上衣，手上有自己的胸圍量測（公分）或某一制（US／UK／EU／JP）的尺寸標示，需要立刻知道其他三制的對應尺寸，才能下單或拿取正確尺碼。

- 桌面。桌機在購物網站旁開著換算頁，輸入量測或手邊標籤上的尺寸，逐制核對。
- 行動。手機在店內或結帳前查一件上衣的跨制對照，不註冊、不上傳任何資料。

使用情境為固定對照表查表。資料只保留在目前頁面草稿。成功結果是：使用者取得與輸入同一列的完整尺寸對照（四制字母與數字尺寸及該列的公分區間），並看到品牌差異免責聲明。

與既有功能的差異：shoe-size-converter 處理鞋碼（腳長與鞋碼制），ring-size-converter 處理戒圍；本工具只處理服飾上衣的胸圍對照，資料表、欄位與錯誤碼完全獨立。

## scope

MVP 必做：

- 兩張釘死對照表：女裝 8 列（以胸圍 bust 公分區間為鍵）、男裝 7 列（以胸圍 chest 公分區間為鍵）。每列含列號、公分區間下界（含）與上界（不含）、US 字母、US 數字、UK 數字、EU 數字、JP 字母、JP 數字；無對應標示的格子為 null，不補值。
- 兩種輸入模式：量測模式（measurement）輸入公分量測查列；尺寸模式（size）選一制並輸入該制尺寸代碼，查同一列的全部尺寸。
- 結果固定顯示品牌差異免責聲明（見 inputsOutputs 的釘死字串），並提供固定報告下載。

非目標：

- 鞋碼（shoe-size-converter 已涵蓋，明確不在本工具範圍）、戒圍、褲裝／裙裝／下身尺寸、腰圍與臀圍對照、兒童與嬰幼兒尺寸、孕婦裝。
- 品牌專屬尺寸表、依品牌調整、抓取或同步任何外部尺寸資料；對照表是本文釘死的單一固定來源。
- 試穿建議、身材或體重建議、購物連結、帳號、紀錄或跨裝置同步。

資料與性能界線：全部計算在本機以整數毫米完成，無浮點比較；無網路、無外部服務依賴；輸入上限見 inputsOutputs，輸出只有單列結果與固定報告。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「類別、輸入方式 / Garment and input mode」
- 欄位或說明「胸圍量測（公分） / Chest or bust measurement (cm)」
- 欄位或說明「來源尺寸制與尺寸 / Source size system and size」
- 「換算尺寸 / Convert size」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「對照結果 / Size match」先摘要再列細節：同一列的四制字母與數字尺寸、該列公分區間、是否正好落在邊界，以及釘死的免責聲明原文。成功才顯示「下載報告 / Download report」。文字可手動選取。完整的兩張對照表以一層 disclosure 呈現，內容與本文釘死表格逐格一致。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。量測落在表外時以 below-range／above-range 狀態文字說明，沒有對應列。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"garment":"women","mode":"measurement","measurementCm":"","fromSystem":"us","sizeValue":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

欄位順序固定為 garment、mode、measurementCm、fromSystem、sizeValue，五欄皆為字串、永遠全部出現。預設 garment=`women`、mode=`measurement`、measurementCm=``、fromSystem=`us`、sizeValue=``。各欄 raw 容量上限（UTF-16 code units）：garment 5、mode 11、measurementCm 5、fromSystem 2、sizeValue 4。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆為 null（本工具無列式輸入）。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

驗證順序（跨欄依欄位順序逐欄進行；每欄先容量、再 surrogate、再該欄文法）：

1. SCHEMA：非普通物件、鍵集合不等於上述五欄、任一欄非 own data 字串，皆 SCHEMA。
2. garment：INPUT_LIMIT → UNICODE → EMPTY → ENUM，只接受 `women`、`men`。
3. mode：INPUT_LIMIT → UNICODE → EMPTY → ENUM，只接受 `measurement`、`size`。
4. measurement 模式：measurementCm 走完整檢查（見第 6 點）；fromSystem 與 sizeValue 只做 INPUT_LIMIT → UNICODE（不檢查內容，因本模式不使用）。
5. size 模式：measurementCm 只做 INPUT_LIMIT → UNICODE；fromSystem 走完整檢查（INPUT_LIMIT → UNICODE → EMPTY → ENUM，只接受 `us`、`uk`、`eu`、`jp`）；sizeValue 走完整檢查（見第 7 點）。
6. measurementCm 文法 DECIMAL_FORMAT：ASCII 字串，整數部為 `0` 或非零開頭的 1–3 位數字，可帶一位小數（`.d`），無空白／符號／指數／多餘小數位。通過文法後轉成整數毫米（cm × 10，四捨五入不發生：文法只允許一位小數，轉換精確）。範圍 RANGE：500–2000 mm（50.0–200.0 cm），男女共用同一欄位範圍。
7. sizeValue 文法 SIZE_FORMAT：正規化前先檢查原字串只含 ASCII 字母與數字、長度 1–4（容量已先檢查）；正規化為 ASCII 大寫。正規化後若為純數字，須為無前導零的正規形（`0` 本身合法，但對照表無此代碼，落到 UNKNOWN_SIZE）。不在來源制可查欄位中找到完全相同的代碼時回 UNKNOWN_SIZE，field=`sizeValue`。

查表規則（釘死，不得以公式或插值替代）：

- 女裝表以胸圍（bust）、男裝表以胸圍（chest）為鍵，區間皆為半開 `[cmLow, cmHigh)`：量測值等於某列下界時屬於該列；等於上界時屬於下一列；等於全表最高上界時為表外（above-range）。量測以整數毫米比較，表界以整數公分 ×10 表示。
- 量測模式結果：`{garment, mode:"measurement", measurementCm, status, onBoundary, row}`。measurementCm 為數字（公分，一位小數；整數值以整數呈現，如 88 而非 88.0）。status 為 `in-range`／`below-range`／`above-range`；in-range 時 row 為命中列（物件，形狀見下），其餘 row=null。onBoundary 只在 in-range 且量測毫米值恰等於命中列下界（×10）時為 true；表外時恆為 false。
- 尺寸模式：來源制決定查哪幾欄。`us` 查 US 字母欄與 US 數字欄；`uk` 只查 UK 數字欄；`eu` 只查 EU 數字欄；`jp` 查 JP 字母欄與 JP 數字欄（null 格不參與）。命中列唯一（表內同一欄的代碼不重複，作者檢查已核對）。結果：`{garment, mode:"size", fromSystem, sizeToken, matchedBy, row}`；sizeToken 為正規化後代碼，matchedBy 為 `letter` 或 `numeric`（命中欄是字母欄或數字欄）。
- 列物件形狀固定：`{row, cmLow, cmHigh, usLetter, usNumeric, ukNumeric, euNumeric, jpLetter, jpNumeric}`。row 為 1 起的列號；cmLow／cmHigh 為整數公分；尺寸代碼皆為字串，無對應標示為 null。男裝 ukNumeric 與 usNumeric 同值（US／UK 男裝數字同為胸圍英吋標示，見釘死表格），jpNumeric 恆為 null。

女裝上衣對照表（釘死；鍵為胸圍 bust 公分，半開區間）：

| row | cmLow | cmHigh | usLetter | usNumeric | ukNumeric | euNumeric | jpLetter | jpNumeric |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 74 | 79 | XXS | 0 | 4 | 30 | null | 3 |
| 2 | 79 | 84 | XS | 2 | 6 | 32 | null | 5 |
| 3 | 84 | 89 | S | 4 | 8 | 34 | S | 7 |
| 4 | 89 | 94 | M | 6 | 10 | 36 | M | 9 |
| 5 | 94 | 99 | L | 8 | 12 | 38 | L | 11 |
| 6 | 99 | 104 | XL | 10 | 14 | 40 | LL | 13 |
| 7 | 104 | 110 | XXL | 12 | 16 | 42 | null | 15 |
| 8 | 110 | 116 | XXXL | 14 | 18 | 44 | null | 17 |

男裝上衣對照表（釘死；鍵為胸圍 chest 公分，半開區間）：

| row | cmLow | cmHigh | usLetter | usNumeric | ukNumeric | euNumeric | jpLetter | jpNumeric |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 86 | 91 | XS | 34 | 34 | 44 | S | null |
| 2 | 91 | 96 | S | 36 | 36 | 46 | M | null |
| 3 | 96 | 101 | M | 38 | 38 | 48 | L | null |
| 4 | 101 | 106 | L | 40 | 40 | 50 | XL | null |
| 5 | 106 | 111 | XL | 42 | 42 | 52 | 2L | null |
| 6 | 111 | 116 | XXL | 44 | 44 | 54 | 3L | null |
| 7 | 116 | 121 | XXXL | 46 | 46 | 56 | 4L | null |

免責聲明（釘死原文，結果區固定顯示，不可改寫）：

- 繁中：「尺寸表因品牌而異：本工具使用單一固定對照表，不同品牌的版型與標示可能不同，請以該品牌官方尺寸表與實際試穿為準。」
- 英文："Size charts vary by brand: this tool uses one fixed reference chart. Fit and labelling differ between brands, so check the brand's official size chart and try the garment on whenever possible."

固定下載 `clothing-size-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/clothing-size-converter/`。src/core.mjs 放純驗證、查表、格式化；兩張對照表以字面資料嵌入 core，與本文表格逐格一致，check 須逐格比對（表格是資料契約，不用公式推導任何一格：不假設 UK=US+4、EU=US+10 等關係式，逐格照表查）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 量測比較全程用整數毫米（輸入字串解析為整數，不經浮點）；表格界線為整數公分常數。核心不讀主機時區、不讀系統時間，結果只由輸入決定。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「換算尺寸」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、邊界量測（等於下界／等於全表上界）和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。18 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `women-measure-mid` | 女裝量測 88 cm 落入第 3 列 |
| `women-measure-boundary-low` | 量測 89 cm 恰等於第 4 列下界，歸第 4 列且 onBoundary |
| `women-measure-decimal` | 一位小數 88.5 cm 落入第 3 列 |
| `women-measure-below` | 量測 70 cm 低於全表，below-range |
| `women-measure-above` | 量測 116 cm 恰等於全表上界，above-range |
| `women-measure-chart-min` | 量測 74 cm 恰等於全表下界，歸第 1 列且 onBoundary |
| `men-measure-mid` | 男裝量測 100 cm 落入第 3 列 |
| `men-size-us-letter` | 男裝 US 字母小寫 m 正規化為 M，命中第 3 列 |
| `men-size-eu-numeric` | 男裝 EU 50 命中第 4 列 |
| `men-size-jp-letter` | 男裝 JP 2L 命中第 5 列 |
| `women-size-uk-numeric` | 女裝 UK 12 命中第 5 列 |
| `women-size-jp-numeric` | 女裝 JP 9 命中第 4 列（數字欄） |
| `women-size-jp-letter` | 女裝 JP LL 命中第 6 列（字母欄） |
| `women-size-unknown` | 女裝 US 4XL 非表內代碼，UNKNOWN_SIZE |
| `measure-format-error` | 量測 88.55 兩位小數，DECIMAL_FORMAT |
| `measure-range-error` | 量測 210 超出欄位範圍，RANGE |
| `garment-enum-error` | garment=kids，ENUM |
| `size-format-error` | 尺寸代碼含非 ASCII（9号），SIZE_FORMAT |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限（200.0 cm、剛好 50.0 cm）、剛好超限（200.1、49.9 的 RANGE 與文法區別）、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證半開區間不變量：每列下界命中該列、上界命中下一列；女裝 116.0 與男裝 121.0 皆 above-range；同一欄代碼在表內不重複；JP 數字欄與字母欄分別命中且 matchedBy 正確；男裝以 uk 查 38 與以 us 查 38 命中同一列。

候選 gate（均 NOT_RUN）

- 於 `tools/clothing-size-converter/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist、兩張對照表逐格比對）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「服飾尺寸換算」，title「服飾尺寸換算｜Gloss Tools」，description「男裝與女裝上衣尺寸對照：輸入胸圍量測（公分）或任一制尺寸，立即查出 US、UK、EU、JP 的字母與數字尺寸。」。英文 lang=en，H1 “Clothing Size Converter”，title “Clothing Size Converter | Gloss Tools”，description “Convert men's and women's top sizes between US, UK, EU and JP charts — from a chest or bust measurement in centimetres, or from a size in any one system.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。為什麼同一個尺寸，不同品牌穿起來不一樣？尺寸表因品牌而異，本工具使用單一固定對照表，請以該品牌官方尺寸表與實際試穿為準。 / Why does the same size fit differently across brands? Size charts vary by brand. This tool uses one fixed reference chart, so check the brand's official size chart and try the garment on whenever possible.
- FAQ。量測剛好等於尺寸表的邊界值時算哪一邊？區間為半開：量測等於某列下界時屬於該列；等於全表最高上界時視為超出對照表範圍。 / What happens when my measurement is exactly on a boundary? Ranges are half-open: a measurement equal to a row's lower edge belongs to that row; a measurement equal to the chart's top edge is outside the chart.
- FAQ。可以查鞋碼或褲子尺寸嗎？不行。本工具只對照上衣；鞋碼請用專門的鞋碼換算工具，下身尺寸不在範圍內。 / Can I look up shoe or bottom sizes here? No. This tool covers tops only; shoe sizes have their own converter, and bottoms are out of scope.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://clothing-size-converter.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/clothing-size-converter/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

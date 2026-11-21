# 磚塊用量計算 / Brick Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-brick-calculator-20261121` · 2026-11-21 · v1

[共用規範](https://github.com/KYStr/glossquote-labs-home/blob/58544b0db98576ea449b2ae182a2243193e33586/docs/SPECIFICATION-STOCK.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

要砌一面牆的工頭或 DIY 屋主，在買磚前先確認：這面牆（扣掉門窗開口）要幾塊磚、要多少砂漿、加計損耗後該買幾塊。

- 桌面。桌面填上牆長、牆高、門窗開口、磚種、灰縫與損耗率，一次看到淨面積、每平方公尺磚數、淨磚數、應購磚數與砂漿體積。
- 行動。手機在建材行門口核對一面牆的應購磚數，不啟動任何工作。

使用情境為設計假設。資料只保留在目前頁面草稿。

## scope

單層（half-brick / 1/2B）矩形磚牆、矩形開口、單一磚種、灰縫厚度與損耗率。磚塊數以含灰縫的有效磚面推導；砂漿體積以「牆體體積減磚體體積」推導。非目標為雙層牆、轉角、磚柱、切磚排版、價格、重量、結構設計、多面牆專案、即時庫存或供應商查詢。

已與本 checkout（HEAD `58544b0d`）的 `docs/specs/` 103 份預案比對，最相近者的實質差異如下。

- 從形狀尺寸算混凝土體積再換算預拌包數（concrete-bag-calculator，僅見已製作的 `tools/concrete-bag-calculator/`，本 checkout 的 `docs/specs/` 內無其規格檔）。此處從牆面面積算磚塊「顆數」，砂漿體積是牆體減磚體的差值而非主體積，且損耗預設 5%（該工具為 10%）。
- 磁磚估算（tile-estimator， brief 所指的材料估算家族成員；本 checkout 的 `docs/specs/` 與 `tools/` 內皆未見此工具）。此處是磚牆砌築：磚有厚度方向、灰縫計入磚面、另計砂漿體積；磁磚估算只算鋪面片數與縫隙，不計砂漿體積、不處理牆厚。
- 從面積算油漆用量（paint-coverage-calculator）。此處輸出是離散的磚塊顆數（無條件進位）加砂漿體積，不是連續的公升數；且磚數先經灰縫放大磚面再取整。

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「牆長 / Wall length (m)」「牆高 / Wall height (m)」
- 開口列（最多 10 列）：每列「開口寬 / Opening width (m)」「開口高 / Opening height (m)」與「移除開口 / Remove opening」；另有「新增開口 / Add opening」。
- 欄位或說明「磚塊種類 / Brick type」「灰縫厚度 / Mortar joint (mm)」「損耗率 / Waste allowance (%)」
- 自訂磚種時才顯示「磚長 / Brick length (mm)」「磚高 / Brick height (mm)」「磚厚 / Brick width (mm)」。
- 「計算磚塊用量 / Calculate bricks」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「磚塊數與砂漿 / Bricks and mortar」先摘要（應購磚數、砂漿體積）再列細節（毛面積、開口面積、淨面積、每平方公尺磚數、淨磚數）。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"wallLengthM":"4","wallHeightM":"2.5","openings":[],"brickPreset":"taiwan-red","jointMm":"10","wastePct":"5"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 欄位順序：wallLengthM、wallHeightM、openings、brickPreset、brickLengthMm、brickHeightMm、brickWidthMm、jointMm、wastePct。
- wallLengthM、wallHeightM：ASCII 十進小數字串，最多 3 位小數，無空白／符號／指數，raw 每欄最多 12 單元，範圍 0.01–100 m。必填。
- openings：陣列，最多 10 列；每列為普通物件，僅含 widthM、heightM（ASCII 十進小數字串，最多 3 位小數，範圍 0.01–100 m）。可省略，預設 `[]`。
- brickPreset：`taiwan-red`、`uk-standard`、`us-modular`、`custom` 四者之一，預設 `taiwan-red`。非 `custom` 時 brickLengthMm、brickHeightMm、brickWidthMm 三欄若出現即 SCHEMA（field 為該欄名）。
- brickLengthMm、brickHeightMm、brickWidthMm：僅 `custom` 時必填，ASCII 十進整數字串，無空白／符號／小數／指數；brickLengthMm 20–500 mm，brickHeightMm 20–300 mm，brickWidthMm 20–300 mm。
- jointMm：ASCII 十進小數字串，最多 1 位小數，範圍 0–20 mm，預設 `"10"`。
- wastePct：ASCII 十進小數字串，最多 2 位小數，範圍 0–50%，預設 `"5"`。
- 預設 jointMm 10、wastePct 5。損耗率預設 5%（概念筆記第 18 條釘版值）。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 wallLengthM、wallHeightM、openings（逐列 widthM、heightM）、brickPreset、brickLengthMm、brickHeightMm、brickWidthMm、jointMm、wastePct 驗證。raw 超限 INPUT_LIMIT、文法 DECIMAL_FORMAT（小數欄）或 INTEGER_FORMAT（磚尺寸欄）、範圍 RANGE，field 即上述欄名；開口列錯誤 row 為該列 1-based 列號。brickPreset 不在四值內為 SCHEMA，field brickPreset。
2. 全部欄位通過後才做跨欄檢查：開口總面積 ≥ 毛面積時回 RANGE，field openings，row null。
3. 預設磚種尺寸表（名目尺寸，見 implementation；單位 mm，長 × 高 × 厚）：

| brickPreset | 中文名 | 長 | 高 | 厚 |
| --- | --- | --- | --- | --- |
| taiwan-red | 紅磚 | 230 | 60 | 110 |
| uk-standard | 英規標準磚 | 215 | 65 | 102.5 |
| us-modular | 美規模組磚 | 194 | 57 | 92 |

4. 推導（全部以精確有理數計，見 implementation；顯示值才依第 5 點捨入）：
   - grossAreaM2 = wallLengthM × wallHeightM。
   - openingAreaM2 = Σ (widthM × heightM)。
   - netAreaM2 = grossAreaM2 − openingAreaM2（驗證後必 > 0）。
   - 有效磚面 effFaceM2 = (brickLengthMm + jointMm) × (brickHeightMm + jointMm) / 1,000,000。
   - bricksPerM2Exact = 1 / effFaceM2。
   - bricksExact = netAreaM2 × bricksPerM2Exact。
   - bricksNet = ceil(bricksExact)；bricksToBuy = ceil(bricksExact × (1 + wastePct / 100))。損耗只加一次在未捨入的淨磚數上，再取整；顯示用的 bricksPerM2、面積絕不參與磚數推導。
   - mortarVolumeM3Exact = netAreaM2 × (brickWidthMm / 1000) − bricksExact × (brickLengthMm × brickWidthMm × brickHeightMm / 1,000,000,000)。灰縫為 0 時此式恰為 0。
   - mortarVolumeLExact = mortarVolumeM3Exact × 1000。
5. 捨入：半進位（half-up，逢 .5 遠離零），在最終輸出時才套用：grossAreaM2、openingAreaM2、netAreaM2、bricksPerM2 取 2 位小數；mortarVolumeM3 取 3 位小數；mortarVolumeL 取 1 位小數；bricksNet、bricksToBuy 為整數。wastePct 回傳數字。
6. 結果 `{grossAreaM2,openingAreaM2,netAreaM2,bricksPerM2,bricksNet,bricksToBuy,mortarVolumeM3,mortarVolumeL,wastePct}`，按面積、磚數、砂漿順序呈現。用一張明細表，不用顏色暗示結果好壞。

固定下載 `brick-calculator-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

雙語字串（每則 UI 標籤、錯誤、FAQ 皆對譯）：

| 用途 | zh-Hant | en |
| --- | --- | --- |
| 標籤 | 牆長（公尺）／牆高（公尺）／開口寬（公尺）／開口高（公尺）／磚塊種類／磚長（公釐）／磚高（公釐）／磚厚（公釐）／灰縫厚度（公釐）／損耗率（%） | Wall length (m) / Wall height (m) / Opening width (m) / Opening height (m) / Brick type / Brick length (mm) / Brick height (mm) / Brick width (mm) / Mortar joint (mm) / Waste allowance (%) |
| 錯誤 EMPTY | 此欄位必填。 | This field is required. |
| 錯誤 DECIMAL_FORMAT | 請輸入數字（最多 N 位小數）。 | Enter a number with up to N decimal places. |
| 錯誤 INTEGER_FORMAT | 請輸入整數。 | Enter a whole number. |
| 錯誤 RANGE | 超出允許範圍。 | Out of range. |
| 錯誤 INPUT_LIMIT | 輸入過長。 | Input too long. |
| 錯誤 ROW_LIMIT | 開口最多 10 個。 | At most 10 openings. |
| 錯誤 SCHEMA | 輸入格式不正確。 | Invalid input format. |
| 錯誤 UNICODE | 請使用半形數字。 | Use ASCII digits only. |
| 錯誤 RANGE（開口） | 開口總面積不可大於或等於牆面面積。 | Total opening area must be less than the wall area. |

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/brick-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 全部長度先轉為整數「0.1 公釐」單位再運算（公尺欄 3 位小數即整數公釐；磚尺寸為整數公釐；灰縫 1 位小數即整數 0.1 公釐；損耗率以百分點的百分之一為整數）。面積、磚數、砂漿皆以 BigInt 有理數推導，無浮點；最終顯示才依 inputsOutputs 第 5 點捨入。π 不涉入。
- 預設磚種尺寸為製造商常用名目尺寸（台灣紅磚 230×110×60 mm 為本地常見規格；英規 215×102.5×65 mm、美規模組 194×92×57 mm 為兩地常見名目尺寸），非認證標準值；實際供貨尺寸以供應商為準，不符者用 custom 輸入。作者未引用無法核實的標準編號。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算磚塊用量」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。11 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `standard-wall` | 標準紅磚、無開口牆面、損耗 5% |
| `with-openings` | 門窗開口扣減、英規磚 |
| `us-modular-small` | 美規模組磚、損耗 0% |
| `custom-brick` | 自訂磚尺寸、灰縫 12 mm、損耗 10% |
| `zero-joint` | 灰縫 0，砂漿體積恰為 0 |
| `exact-count` | 淨磚數恰為整數 100 |
| `max-waste` | 損耗率上限 50% |
| `many-openings` | 三個開口、開口列加總 |
| `openings-exceed` | 開口總面積 ≥ 牆面面積，RANGE |
| `decimal-length` | 牆長小數格式錯誤，DECIMAL_FORMAT |
| `waste-over` | 損耗率 51%，RANGE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證開口總面積等於毛面積、等於毛面積減 0.001、joint=0、joint=20、waste=0、waste=50、開口 10 列／11 列、custom 缺尺寸、非 custom 帶自訂尺寸。所有已接受的 bricksToBuy ≥ bricksNet，移除損耗後應購數不變或不增；灰縫變大時每平方公尺磚數不增。

候選 gate（均 NOT_RUN）

- 於 `tools/brick-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「磚塊用量計算」，title「磚塊用量計算｜Gloss Tools」，description「輸入牆長、牆高、門窗開口、磚種、灰縫與損耗率，算出淨磚數、應購磚數與砂漿體積。」。英文 lang=en，H1 “Brick Calculator”，title “Brick Calculator | Gloss Tools”，description “Enter wall size, openings, brick type, joint and waste to get net bricks, bricks to buy and mortar volume.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。損耗加在哪裡？損耗加在未捨入的淨磚數上再無條件進位，不是加在已進位的整數上。 / Where is waste applied? Waste is added to the unrounded net brick count, then rounded up — never to the already-rounded integer.
- FAQ。灰縫 0 時砂漿為什麼是 0？本工具的砂漿是牆體減磚體的差值，灰縫為 0 代表磚與磚之間沒有砂漿空間。 / Why is mortar zero with a 0 mm joint? Mortar here is wall volume minus brick volume, so a zero joint leaves no mortar space.
- FAQ。這是結構設計嗎？不是。這是採購估算，不做結構設計；承重、配比與施工請依專業設計。 / Is this a structural design? No. This is a purchasing estimate, not a structural design; follow professional design for load-bearing, mix and workmanship.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://brick-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/58544b0db98576ea449b2ae182a2243193e33586/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/brick-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

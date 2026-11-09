# 照片沖印尺寸計算 / Photo Print Size Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-photo-print-size-calculator-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

要把數位照片印出來的人，手上有檔案的像素寬高，想在送印前先確定三件事：這張照片在目標畫質下最大能印多大、想印的尺寸需要多少像素、手邊的像素印那個尺寸實際還剩多少 DPI。

- 桌面。桌前整理旅遊照片，把幾張候選照片的像素逐一換算成可印尺寸與逐尺寸品質表，決定哪些印 4×6、哪些可以放大到 A4 掛牆。
- 行動。站在沖印店櫃檯前，用手機輸入店員問的像素數，當場確認要印的尺寸夠不夠銳利，不必回家重傳檔案。

成功結果為：使用者輸入像素、目標 DPI 與（部分模式）一個標準尺寸，得到一組以同一份尺寸表、同一套捨入規則算出的答案——最大可印尺寸與建議尺寸、逐尺寸的實際 DPI／品質帶／符合判定、或指定尺寸的需求像素——可下載成報告帶走。使用情境為送印前的自助查核；本工具不經手照片檔本身，資料只保留在目前頁面草稿。

## scope

MVP 為三種模式共用一份釘版標準尺寸表與同一核心：模式 `max`（像素＋目標 DPI → 最大可印尺寸＋逐尺寸判定表）、模式 `need`（標準尺寸＋目標 DPI → 需求像素）、模式 `check`（像素＋標準尺寸 → 兩邊與有效 DPI＋品質帶）。全部比對方向無關：影像長邊對紙張長邊、短邊對短邊，橫直式不影響任何判定。

已比對本 repo `docs/specs/` 既有規格，最相近者的實質差異如下。

- **screen-ppi-calculator 是最相近者，界線在此釘死。** 該工具算的是顯示面板自身的像素密度：輸入面板對角線與解析度，輸出面板 PPI、實體寬高與點距。本工具算的是紙張上的列印密度：輸入影像像素與紙面尺寸，輸出每邊 DPI、是否達到目標 DPI 與可印尺寸；沒有對角線、沒有面板實體尺寸、沒有點距。使用者要查螢幕規格時，FAQ 明示改用該工具。
- aspect-ratio-calculator 處理比例約分與缺邊求解；本工具不輸入比例、不求解缺邊，比例不同造成的裁切／補白邊只在揭露文字中說明，不計算裁切量。
- 影像上傳、EXIF 讀取不在本 repo 任何工具的範圍內，本工具同樣不做：像素一律由使用者以數字輸入。

非目標：上傳或讀取照片檔／EXIF、裁切量或補白邊寬度計算、出血（bleed）與無邊滿版公差、印表機驅動插值或銳化、紙張以外的輸出媒材（帆布、相片書跨頁）、保存或分享結果、連網查詢機型像素資料庫。判定規則由本文定義，無線上資料或外部服務依賴。

性能與資料界線：五個文字欄位、一次同步純計算；尺寸表固定 9 列；像素上限 200,000 使中間量恆為小整數與有理數，無長表、分頁或非同步需求。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「模式 / Mode」：三段切換「最大可印尺寸 / Largest print size」、「需求像素 / Required pixels」、「實際 DPI / Effective DPI」。
- 欄位或說明「像素寬、高 / Pixel width and height」：兩個整數欄。僅 `max`、`check` 模式啟用；`need` 模式在畫面上可灰階顯示但值保留在草稿，且核心只查容量（見 inputsOutputs）。
- 欄位或說明「目標 DPI / Target DPI」：數字欄加三顆預設鈕「150」、「240」、「300」，點按即把對應字串寫入 DPI 欄（核心沒有預設概念，只是欄位值）。僅 `max`、`need` 模式啟用。
- 欄位或說明「標準尺寸 / Standard size」：九個標準尺寸的選單，標籤如「4×6 相片（6 × 4 英寸）/ 4×6 photo (6 × 4 in)」「A4（29.7 × 21.0 公分）/ A4 (29.7 × 21.0 cm)」。僅 `need`、`check` 模式啟用。
- 「計算沖印尺寸 / Calculate print sizes」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 結果先摘要再列細節，文字可手動選取，成功才顯示「下載報告 / Download report」。
  - `max` 摘要：「最大可印尺寸 / Largest printable size」同時列英寸與公分（依影像原始寬高方向），及「建議最大標準尺寸 / Largest fitting standard size」；無符合者顯示「無標準尺寸符合此 DPI / No standard size fits at this DPI」。細節為 9 列判定表：尺寸名、長邊 DPI、短邊 DPI、有效 DPI、品質標籤、「符合 / Fits」或「不符合 / Does not fit」。
  - `need` 摘要：需求像素「長邊 × 短邊 / long × short」與總百萬像素；細節列所選尺寸的英寸與公分。
  - `check` 摘要：有效 DPI（大數字）與品質標籤；細節列長邊、短邊 DPI。
- 品質標籤旁常駐揭露句（兩語釘版）：「品質分級是依一般觀看距離的常見經驗值，不是業界標準。/ Quality bands are common rules of thumb for typical viewing distances, not an industry standard.」

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、模式、預設鈕或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果含上列品質分級揭露句。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"dpi":"300","mode":"max","pixelsH":"4000","pixelsW":"6000","sizeId":"4x6"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

欄位固定五個：`mode`、`pixelsW`、`pixelsH`、`dpi`、`sizeId`，值全為字串。啟用關係依模式：`max` 啟用 pixelsW、pixelsH、dpi；`need` 啟用 dpi、sizeId；`check` 啟用 pixelsW、pixelsH、sizeId。**未啟用欄只查容量，其餘檢查全跳過，值不參與計算**（可為空字串或任意合容量字串，見 `need-inactive-garbage-ok`）；但未啟用欄超過容量仍報 INPUT_LIMIT（見 `need-inactive-overlimit`）。

驗證順序（第一個失敗即整份失敗）：

1. SCHEMA：物件形狀、恰好五個欄位、全為字串 own data。
2. `mode`：容量 → UNICODE → EMPTY → ENUM，值須恰為 `max`、`need`、`check` 之一（大小寫敏感），否則 ENUM，field=`mode`。
3. 其餘欄位依固定順序 pixelsW → pixelsH → dpi → sizeId 逐欄：先容量（全部欄位皆查，raw 超過 8 個 UTF-16 code units 為 INPUT_LIMIT）；未啟用欄到此為止；啟用欄續查 UNICODE（未成對 surrogate）→ EMPTY → 文法 → RANGE／ENUM。

欄位文法與範圍：

- `pixelsW`、`pixelsH`：ASCII 十進整數字串，`0` 或非零開頭，無空白／正負號／小數／指數。文法不合 INTEGER_FORMAT。範圍 1–200,000（含端點），超出 RANGE。範圍依據：200,000 涵蓋十億畫素級掃描與拼接影像，且使全部中間量保持精確有理數。
- `dpi`：ASCII 十進小數字串。整數部為 `0` 或非零開頭，小數部可省略或 1–2 位；無空白／正負號／指數／前導 `+`／結尾小數點。文法不合 DECIMAL_FORMAT。範圍 1–1200（含端點），超出 RANGE。範圍依據：1200 涵蓋高階美術微噴輸出，1 以下無列印意義。
- `sizeId`：恰為標準尺寸表的九個代碼之一（`3x5`、`4x6`、`5x7`、`6x8`、`8x10`、`10x12`、`A5`、`A4`、`A3`，大小寫敏感），否則 ENUM。

整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆 null（本工具無列）。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

標準尺寸表（釘版字面資料，列序固定即輸出序；尺寸名第一個數字為短邊是相片尺寸的慣例命名，計算只用長／短邊）：

| sizeId | 名稱（zh / en） | 長邊 | 短邊 |
| --- | --- | --- | --- |
| `3x5` | 3×5 相片 / 3×5 photo | 5 in | 3 in |
| `4x6` | 4×6 相片 / 4×6 photo | 6 in | 4 in |
| `5x7` | 5×7 相片 / 5×7 photo | 7 in | 5 in |
| `6x8` | 6×8 相片 / 6×8 photo | 8 in | 6 in |
| `8x10` | 8×10 相片 / 8×10 photo | 10 in | 8 in |
| `10x12` | 10×12 相片 / 10×12 photo | 12 in | 10 in |
| `A5` | A5 | 210 mm | 148 mm |
| `A4` | A4 | 297 mm | 210 mm |
| `A3` | A3 | 420 mm | 297 mm |

常數：1 in = 25.4 mm（精確定義，即 127/5 mm），1 in = 2.54 cm（精確，即 127/50）。A 系列毫米值為 ISO 216 標稱尺寸。相片尺寸的英寸值為其標稱值，實體紙張的廠商公差不在本工具範圍。

計算（全部採精確有理數運算；實作可用 BigInt 分子／分母或等價精確表示，**雙精度浮點捷徑不合規**——進位與進位邊界、四捨五入的恰半值都必須與有理數結果完全一致）：

設 `dpi` 為剖析後的小數（精確有理數，如 `"299.5"` = 599/2）。影像長邊 `imgLong = max(pixelsW, pixelsH)`、短邊 `imgShort = min(pixelsW, pixelsH)`。對尺寸 s：`longIn(s)`、`shortIn(s)` 為其英寸值（英寸尺寸即整數；A 系列為 mm × 5/127），`longMm(s)`、`shortMm(s)` 為其毫米值（英寸尺寸為 in × 127/5）。

每個尺寸共用下列衍生量：

- `requiredLongPx = ceil(longIn × dpi)`、`requiredShortPx = ceil(shortIn × dpi)`（無條件進位至整數像素）。
- `dpiLong = imgLong / longIn`、`dpiShort = imgShort / shortIn`；`effectiveDpi = R(min(dpiLong, dpiShort), 1)`，有效 DPI 取兩邊小者（先取小、後捨入，順序釘版）。
- `quality` 由 **捨入後** 的 effectiveDpi 決定：≥300 為 `excellent`（極佳 / Excellent），≥200 為 `good`（良好 / Good），≥150 為 `acceptable`（可接受 / Acceptable），其餘為 `poor`（不足 / Poor）。下限皆含端點。
- `fits` ⟺ `requiredLongPx ≤ imgLong` 且 `requiredShortPx ≤ imgShort`（等號算符合）。此整數形式為準據形式；其與 `min(dpiLong, dpiShort) ≥ dpi` 恆等價，不得改以浮點比較實作。

`R(x, k) = floor(x × 10^k + 1/2) / 10^k`，在精確有理數 x 上執行（四捨五入，恰半進位；本工具全部量非負）。捨入只在輸出做一次；每個輸出恆由精確值推導，禁止由另一個已捨入輸出反推。

模式輸出（結果物件欄位集精確如下）：

- `max`：`{mode, pixelsW, pixelsH, dpi, maxWidthIn, maxHeightIn, maxWidthCm, maxHeightCm, bestFitSizeId, sizes}`。`maxWidthIn = R(pixelsW / dpi, 2)`、`maxHeightIn = R(pixelsH / dpi, 2)`——依影像**原始 W/H 方向**，不是長短邊；`maxWidthCm = R(pixelsW × 127 / (50 × dpi), 1)`、`maxHeightCm` 同理，恆由像素精確推導，不由英寸捨入值換算。`sizes` 為依表列序的 9 列 `{sizeId, dpiLong, dpiShort, effectiveDpi, fits, quality}`，其中 dpiLong/dpiShort 各為 `R(·, 1)`。`bestFitSizeId` 為 fits 列中精確面積 `longMm × shortMm` 最大者；同面積取表列序在前者；無任何 fits 列時為 `null`。
- `need`：`{mode, sizeId, dpi, sizeLongIn, sizeShortIn, sizeLongCm, sizeShortCm, requiredLongPx, requiredShortPx, megapixels}`。`sizeLongIn = R(longIn, 2)`、`sizeShortIn = R(shortIn, 2)`、`sizeLongCm = R(longMm / 10, 1)`、`sizeShortCm = R(shortMm / 10, 1)`、`megapixels = R(requiredLongPx × requiredShortPx / 1,000,000, 2)`。
- `check`：`{mode, pixelsW, pixelsH, sizeId, dpiLong, dpiShort, effectiveDpi, quality}`，皆為所選尺寸的共用衍生量。

回顯：pixelsW/pixelsH 為剖析後整數；dpi 為剖析後數值（`"300"` → 300、`"299.5"` → 299.5、`"240.50"` → 240.5）。機器值不隨 locale 改，小數顯示以 `.` 為分隔符。畫面顯示固定小數位（英寸 2 位、公分 1 位、DPI 1 位、百萬像素 2 位，不足補零，如 20.00 in、50.8 cm、300.0 DPI）；報告 JSON 帶捨入後的數值本身（整數值不帶小數尾零）。

固定下載 `photo-print-size-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/photo-print-size-calculator/`。src/core.mjs 放純驗證、推導、格式化（含有理數運算）；src/controller.mjs 管草稿、工作世代及資源；src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行三種模式，畫面和完整報告符合核心 fixtures（含 9 列判定表逐列比對），使用者取得對應產物。 |
| boundaries | 合法端點（像素 1／200,000、DPI 1／1200）、剛好越界、等號符合、進位邊界、品質帶端點 200.0／199.9／150 與未捨入 299.9946… 捨入至 300.0 的帶判定、未啟用欄的容量與忽略規則、第一個錯誤與三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log；特別核對無任何照片檔上傳路徑。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的三模式主流程、預設鈕、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯（含 9 個尺寸名與 4 個品質標籤）、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。25 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `max-24mp-300` | 2400 萬像素、300 DPI：9 列全符合、有效 DPI 逐列、最佳為 A3 |
| `max-portrait-240` | 直式影像：最大尺寸依原 W/H 方向、判定表長邊取自高度 |
| `max-tiny-nofit` | 無任何尺寸符合：bestFitSizeId=null、全列 fits=false |
| `max-exact-4x6` | 需求像素恰等於現有像素（等號符合）；8×10 有效 DPI 恰 150 → acceptable |
| `max-cap-200k` | 像素 200,000 與 DPI 1200 合法上限端點 |
| `need-a4-300` | A4 在 300 DPI：兩邊需求皆非整數、皆進位 |
| `need-4x6-240` | 整數英寸恰除盡、無進位 |
| `need-a5-300-ceil` | 短邊 1748.03… 進位 1749（非四捨五入的 1748） |
| `need-6x8-decimal-dpi` | 小數 DPI 299.5 合文法、回顯與整數進位 |
| `need-inactive-garbage-ok` | 未啟用欄垃圾值與空字串只查容量、結果不受影響 |
| `check-4k-a4` | 兩邊 DPI 不同、有效 DPI 取小邊 |
| `check-low-poor` | 有效 DPI 112.5 → poor |
| `check-band-200-exact` | 有效 DPI 恰 200.0 → good（含下限端點） |
| `check-band-199-9` | 有效 DPI 199.9 → acceptable；品質帶以捨入後值判定 |
| `check-band-rounded-300` | 未捨入 299.9946… 捨入為 300.0 → excellent（以未捨入值判定會是 good，釘死捨入後判定） |
| `need-inactive-overlimit` | 未啟用欄 9 單元 → INPUT_LIMIT |
| `err-pixels-zero` | 像素 0 → RANGE |
| `err-pixels-decimal` | 像素小數 → INTEGER_FORMAT |
| `err-pixels-empty` | 啟用欄缺內容 → EMPTY |
| `err-dpi-format` | DPI 含字母 → DECIMAL_FORMAT |
| `err-dpi-range` | DPI 1201 → RANGE |
| `err-mode-enum` | 未知模式 → ENUM／mode |
| `err-sizeid-enum` | 未知尺寸代碼 A6 → ENUM／sizeId |
| `err-unicode` | 未成對 surrogate → UNICODE |
| `err-extra-field` | 未知欄位 → SCHEMA |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法下限（像素 1、DPI 1）、剛好超限（像素 200,001、DPI 0.99 與 1200.01）、錯型別、缺欄、單獨 surrogate 在各欄、惡意字串、快速改值及晚到訊息。驗證不變量：任一列 fits 為 true 時其 effectiveDpi（未捨入）≥ dpi；requiredLongPx − 1 < longIn × dpi ≤ requiredLongPx；bestFitSizeId 的面積不小於任一其他 fits 列。

候選 gate（均 NOT_RUN）

- 於 `tools/photo-print-size-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「照片沖印尺寸計算」，title「照片沖印尺寸計算｜Gloss Tools」，description「輸入照片像素與目標 DPI，算出最大可沖印尺寸、各標準尺寸的實際 DPI 與品質分級，或反推指定尺寸需要的像素。」。英文 lang=en，H1 “Photo Print Size Calculator”，title “Photo Print Size Calculator | Gloss Tools”，description “Enter a photo's pixel dimensions and a target DPI to find its largest printable size, the effective DPI and quality band at each standard size, or the pixels a chosen size requires.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。為什麼橫式和直式照片的判定一樣？尺寸表方向無關，長邊對長邊、短邊對短邊，橫直式不影響可印性。 / Why do landscape and portrait photos get the same verdicts? The size table is orientation-free — long side to long side, short side to short side — so orientation never changes printability.
- FAQ。品質分級是業界標準嗎？不是，是依一般觀看距離（約手臂長度）的常見經驗值；大尺寸照片通常站得更遠看，低於 150 DPI 也可能可接受。 / Are the quality bands an industry standard? No. They are common rules of thumb for a typical viewing distance (about arm's length); large prints are usually viewed from farther away, so below 150 DPI can still look fine.
- FAQ。照片比例和紙張比例不同會怎樣？本工具假設全幅列印、不裁切，逐邊 DPI 以完整畫面計算；實際送印時店家可能裁切或加白邊，請以店家說明為準。 / What if the photo's aspect ratio differs from the paper's? This tool assumes full-frame printing without cropping and computes per-side DPI for the whole frame. A print shop may crop or add borders instead; check with the shop.
- FAQ。需要上傳照片嗎？不用，也沒有上傳功能；只要在檔案資訊裡查到的像素寬高數字，全部計算都在本頁離線完成。 / Do I need to upload my photo? No, and there is no upload feature. You only type the pixel width and height from the file's properties; everything is computed offline on this page.
- FAQ。螢幕上看照片要算哪個？螢幕的細緻度看「螢幕 PPI 計算」，本工具只處理印到紙上的 DPI。 / What about viewing on a screen? Screen sharpness is the Screen PPI Calculator's job; this tool only covers printing on paper.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://photo-print-size.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/photo-print-size-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

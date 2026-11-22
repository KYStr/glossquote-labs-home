# 壁紙用量計算 / Wallpaper Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-wallpaper-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

自己貼壁紙的人在購買前要先回答三個問題：這個房間要貼幾幅、每幅要裁多長、總共要買幾捲。用錯估算方式（例如只用面積除以一捲面積）會忽略圖案重複必須對花的浪費與每捲能裁出的完整幅數，結果買不夠。

- 桌面。裝修前在電腦上逐面牆輸入寬高、或只量周長與天花板高，選好一款捲的規格後核對捲數，並核對門窗扣除後的淨牆面積和損耗百分比對採購量的影響。
- 行動。在賣場用手機輸入捲上標示的寬、長與圖案重複，立即確認要拿幾捲。

使用情境為購買估算。資料只保留在目前頁面草稿；結果是保守估算，不是施工或退換貨保證，頁面固定揭露此語意。

## scope

MVP 必做：周長模式（單一周長 × 天花板高）與逐牆模式（1–12 面牆，各自寬 × 高）；捲寬、捲長、圖案重複（0 表示不用對花）；淨牆面積的開口輸入三種模式（不扣、只給總面積、給尺寸清單）；損耗百分比 0–50；逐牆明細加總計的結果；固定報告下載。

非目標：實際排版／對花位置模擬、斜頂、挑高、轉角柱、壁龕與非矩形牆、橫貼（railroading）、拼貼或特殊材質、價格與預算、品牌或店家捲型資料庫、施工教學、把估算當購買保證。

資料與界線：全部輸入為公制字串；內部一律換算為整數公分運算，無浮點。牆面最多 12 面、開口最多 20 個。無帳號、無線上資料、無外部服務依賴，判定規則全由本文定義。

與既有預案的差異（已比對本 repo 預案庫）：

- 油漆用量（paint-coverage-calculator）以牆面面積換算液體油漆的公升數與罐數，沒有「幅」的概念，也不處理圖案重複或每捲可裁幅數。此處是壁紙捲材：先由寬度決定幅數、由高度與對花決定每幅長度、再由捲長決定每捲可裁幾幅。
- 地毯／地板類以面積覆蓋的材料估算同樣不處理對花取整；本案的核心正是重複取整造成的長度浪費。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「牆面量法與尺寸 / Wall measurement mode and dimensions」：先選周長模式或逐牆模式；周長模式填周長與天花板高，逐牆模式逐列填每面牆的寬與高，可增刪列（1–12 列）。
- 欄位或說明「壁紙捲規格與圖案重複 / Roll size and pattern repeat」：捲寬、捲長（公尺），圖案重複（公分，0 表示不用對花）。
- 欄位或說明「門窗開口 / Doors and windows」：不扣、只給總面積、或給尺寸清單（逐列寬 × 高，最多 20 列；尺寸清單僅周長模式可用）。介面及結果旁說明：「門窗面積用於計算淨牆面積。幅數、每幅裁切長度與採購捲數按完整牆面尺寸估算。 / Door and window areas are used to calculate net wall area. Strip count, cut length and rolls to buy are estimated from the full wall dimensions.」
- 欄位或說明「損耗百分比 / Waste percent」。
- 「計算壁紙用量 / Calculate wallpaper needed」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「需要幾捲 / Rolls to buy」先摘要（總幅數、每幅長度、總捲數）再列逐牆明細，長表在有 label 的區域捲動。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。逐牆明細與總計同列。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"wallMode":"perimeter","perimeterM":"12","heightM":"2.5","rollWidthM":"0.53","rollLengthM":"10.05","patternRepeatCm":"0","openingsMode":"none","wastePercent":"0"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數為普通物件，只讀 own data；未知、缺欄、錯型別、accessor 皆 SCHEMA。JSON fixture 即介面。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為 1-based 列號（牆或開口）或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

物件的確切鍵集合由 `wallMode` 與 `openingsMode` 決定：

- 恆有鍵：`wallMode`、`rollWidthM`、`rollLengthM`、`patternRepeatCm`、`openingsMode`、`wastePercent`。
- `wallMode="perimeter"` 加 `perimeterM`、`heightM`；`wallMode="walls"` 加 `walls`（陣列，元素為恰含字串鍵 `widthM`、`heightM` 的普通物件）。
- `openingsMode="area"` 加 `openingsAreaM2`；`openingsMode="list"` 加 `openings`（陣列，元素形狀同牆列）。`openingsMode="none"` 不加鍵。
- 鍵集合不符（多、缺、或元素鍵不符）一律 SCHEMA；元素形狀錯誤時 row 為該元素序號，其餘 SCHEMA 的 field,row=null。

驗證順序（固定）：

1. SCHEMA：頂層與元素形狀、鍵集合、值型別（字串欄位必須是 string、陣列欄位必須是 array）。
2. ENUM：`wallMode` 先、`openingsMode` 後；是 string 但不在枚舉集合 → `{code:"ENUM",field}`。
3. MODE_COMBINATION：`wallMode="walls"` 且 `openingsMode="list"` → `{code:"MODE_COMBINATION",field:"openingsMode",row:null}`。逐牆模式下開口歸屬哪面牆無法由清單表達，本版尺寸清單僅支援周長模式，逐牆模式可輸入開口總面積。
4. 逐欄檢查，欄位順序固定：周長模式為 `perimeterM`、`heightM`；逐牆模式為 `walls`（先陣列長度：0 列 → EMPTY、超過 12 列 → ROW_LIMIT，field=`walls`；再逐列 row 升序，列內 `widthM` 後 `heightM`）；接著 `rollWidthM`、`rollLengthM`、`patternRepeatCm`；接著 `openingsAreaM2` 或 `openings`（先陣列長度：0 列 → EMPTY、超過 20 列 → ROW_LIMIT，field=`openings`；再按列序檢查，列內 `widthM` 先於 `heightM`）；最後 `wastePercent`。每個字串欄位依序：raw 長度（UTF-16 code units）超過 8 → INPUT_LIMIT；不成對 surrogate → UNICODE；空字串 → EMPTY；文法不符 → DECIMAL_FORMAT 或 INTEGER_FORMAT；超出範圍 → RANGE。錯誤的 field 為欄位名，陣列元素錯誤另帶 row。
5. 全部逐欄檢查通過後執行跨欄檢查，順序固定。(a) OPENING_HEIGHT_EXCEEDS_WALL — 尺寸清單模式按列順序找第一個開口高度大於周長模式牆高的開口；等高合法。回傳 `{ok:false,error:{code:"OPENING_HEIGHT_EXCEEDS_WALL",field:"heightM",row}}`，`row` 是該開口 1-based 列號。錯誤連到該列的開口高度輸入。`field="heightM",row=null` 才指周長模式的牆高輸入，`wallMode="walls"` 時非 null 的 `row` 指牆列。(b) OPENINGS_EXCEED_WALL — 清單模式先比寬度：開口寬度總和（cm）≥ 周長（cm）→ field=`openings`；再比面積：開口面積總和 > 牆面總面積 → field=`openings`；面積模式：`openingsAreaM2` > 牆面總面積 → field=`openingsAreaM2`。row 皆 null。(c) STRIP_TOO_LONG — 任一牆的每捲可裁幅數為 0（幅長 > 捲長）→ field=`rollLengthM`，周長模式 row=null、逐牆模式 row 為第一面出問題的牆序號。

文法與範圍（raw 字串先通過文法才換算）：

- 公尺欄位（`perimeterM`、`heightM`、`widthM`、`rollWidthM`、`rollLengthM`、開口 `widthM`/`heightM`、`openingsAreaM2`）：DECIMAL 文法 `^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$`，最多兩位小數，換算為整數公分（×100）或平方公分（×10000）皆精確。
- 整數欄位（`patternRepeatCm`、`wastePercent`）：INTEGER 文法 `^(0|[1-9][0-9]*)$`。
- 範圍（換算後，含端點）：周長 1–20000 cm；牆寬 1–10000 cm；牆高與天花板高 1–2000 cm；捲寬 10–200 cm；捲長 100–10000 cm；圖案重複 0–200 cm；開口寬 1–10000 cm、開口高 1–2000 cm；開口面積 0–10000 m²；損耗 0–50。

計算（全部整數公分運算；`ceil`/`floor` 為整數除法的向上／向下取整）：

- 固定常數 TRIM = 10 cm（每幅上下各 5 cm 修剪裕度，介面固定揭露）。
- 每一「牆列」獨立計算（周長模式只有一列，寬 = 周長、高 = 天花板高；不同牆的剩料不互相流用，逐牆明細即此保守假設的揭露）：
  - `strips = ceil(widthCm / rollWidthCm)`，以完整牆寬計算。
  - 逐牆明細的 `effectiveWidthCm = widthCm`。`openingsWidthCm` 為周長模式使用尺寸清單時的開口寬度總和，其餘情形為 0，僅供尺寸摘要。
  - `stripLengthCm`：重複 = 0 時為 `heightCm + TRIM`；重複 > 0 時為 `ceil((heightCm + TRIM) / repeat) × repeat`（先加裕度再向上取整到完整重複，固定順序）。
  - `dropsPerRoll = floor(rollLengthCm / stripLengthCm)`。
  - `stripsWithWaste = ceil(strips × (100 + wastePercent) / 100)`（損耗先膨脹幅數、再換算捲數；損耗 0 時等於 strips）。
  - `rolls = ceil(stripsWithWaste / dropsPerRoll)`。
- 總計為各牆列的 `strips`、`stripsWithWaste`、`rolls` 分別加總。
- 面積：`grossAreaCm2 = Σ widthCm × heightCm`；`openingsAreaCm2` 為面積模式的輸入換算值、清單模式的 Σ 開口寬 × 高、或 0；`netAreaCm2 = grossAreaCm2 − openingsAreaCm2`。三個面積輸出為字串，恰兩位小數，以 exact cm² 值四捨五入（round half up）到 0.01 m²：百分位 = `floor((cm2 + 50) / 100)` 後格式化。開口面積用於計算淨牆面積。採購量與每幅裁切長度皆依完整牆面尺寸估算。

開口語意（固定，介面與結果旁揭露）：一幅壁紙是整幅由天花板貼到地板的長條。尺寸清單與總面積兩種輸入都只從毛面積扣除開口面積。缺少開口位置、裁切配置及餘料可重用資訊時，以全牆寬及牆高估算整幅與採購捲數。結果明細使用「開口寬度合計 / Total opening width」及「採購估算寬度 / Width used for roll estimate」標示保留的兩個寬度欄位。

結果物件：`{walls:[{index,widthCm,openingsWidthCm,effectiveWidthCm,strips,stripLengthCm,dropsPerRoll,stripsWithWaste,rolls}],strips,stripsWithWaste,rolls,grossWallAreaM2,openingsAreaM2,netWallAreaM2}`，`walls` 依輸入順序、index 為 1-based；面積為上述兩位小數字串，其餘皆整數。機器值不隨 locale 改。

固定下載 `wallpaper-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。

開口高度超過牆高的欄位錯誤使用「開口高度不可超過牆高。 / Enter an opening height at or below the wall height.」，並標示開口列號。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/wallpaper-calculator/`。src/core.mjs 放純驗證、推導、格式化（全部整數運算；公尺字串以字串解析換算整數公分，禁止先轉浮點再乘 100）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單（含逐牆／開口的增刪列操作；列的增刪與模式切換都使舊結果失效）。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算壁紙用量」，畫面和完整報告符合核心 fixtures（含逐牆明細與總計），使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、牆／開口列號和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、兩種牆面模式、增刪列、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。19 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `basic-perimeter` | 周長模式基本計算：23 幅、幅長 260、每捲 3 幅、8 捲 |
| `pattern-repeat-roundup` | 幅長 250+10 向上取整到 32 的倍數 = 288 |
| `walls-mode-two-walls` | 逐牆分別算捲數（3+2）再加總，不共用剩料 |
| `openings-list-deduction` | 開口寬度摘要 240 cm，完整 1200 cm 估算 23 幅、8 捲，淨面積 26.31 m² |
| `openings-area-only` | 同一開口面積得同一淨面積、幅數及捲數 |
| `partial-height-opening-full-strips` | WALL-01：3.18 × 2.50 m 的牆與 1.59 × 1.20 m 的窗，6 幅、2 捲、淨面積 6.04 m² |
| `opening-height-exceeds-wall` | WALL-02：3.00 m 開口超過 2.50 m 牆高，指出第 1 列開口高度 |
| `opening-height-equals-wall` | 2.50 m 開口等於牆高，6 幅、2 捲、淨面積 5.70 m² |
| `first-opening-height-before-aggregate-and-roll` | 第 2、3 列開口超高，且開口寬超限、捲長不足。回第 2 列開口高度 |
| `opening-width-format-before-height-cross-check` | 第 1 列開口超高、第 2 列寬格式錯，先回第 2 列寬格式錯 |
| `waste-ten-percent` | 損耗先膨脹幅數 23→26，再換算 9 捲 |
| `repeat-exact-multiple` | 裕度後幅長恰為重複整數倍，不多取一格 |
| `walls-mixed-heights` | 兩牆高度不同，幅長 256 與 288 各自計算 |
| `single-strip` | 最小房間 1 幅 1 捲 |
| `strip-too-long` | 幅長 310 > 捲長 300 → STRIP_TOO_LONG |
| `openings-exceed-wall` | 開口寬度總和 1300 ≥ 周長 1200 → OPENINGS_EXCEED_WALL |
| `walls-list-combination` | 逐牆＋清單 → MODE_COMBINATION |
| `decimal-format-height` | 三位小數 → DECIMAL_FORMAT |
| `perimeter-zero` | 周長 0 → RANGE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

下載字面基準如下。

- `openings-list-deduction` 的報告為下列 compact JSON 加一個 LF，共 282 bytes，SHA-256 `3facdec2e1314b5bd4272078dec67888a1e859dfa20e599bf15213b58d020131`。
  `{"grossWallAreaM2":"30.00","netWallAreaM2":"26.31","openingsAreaM2":"3.69","rolls":8,"strips":23,"stripsWithWaste":23,"walls":[{"dropsPerRoll":3,"effectiveWidthCm":1200,"index":1,"openingsWidthCm":240,"rolls":8,"stripLengthCm":260,"strips":23,"stripsWithWaste":23,"widthCm":1200}]}`
- `partial-height-opening-full-strips` 的報告為下列 compact JSON 加一個 LF，共 274 bytes，SHA-256 `0d1185f13fcc13cf89e3f96e35fd6485ad062d88f112a1a0a04ffee6a8a73d8f`。
  `{"grossWallAreaM2":"7.95","netWallAreaM2":"6.04","openingsAreaM2":"1.91","rolls":2,"strips":6,"stripsWithWaste":6,"walls":[{"dropsPerRoll":3,"effectiveWidthCm":318,"index":1,"openingsWidthCm":159,"rolls":2,"stripLengthCm":260,"strips":6,"stripsWithWaste":6,"widthCm":318}]}`

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限（周長 200 m、牆 12 列、開口 20 列、重複 200、損耗 50）、剛好超限、錯型別、額外欄、缺欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證不變量：每面牆 `strips × rollWidthCm ≥ widthCm` 且 `(strips−1) × rollWidthCm < widthCm`；`stripLengthCm` 為重複的倍數（重複 > 0 時）且 `stripLengthCm − repeat < heightCm + TRIM ≤ stripLengthCm`；`dropsPerRoll × stripLengthCm ≤ rollLengthCm < (dropsPerRoll+1) × stripLengthCm`；總計等於逐牆加總；淨面積 = 總面積 − 開口面積（以 cm² 精確值比對後再格式化）。

候選 gate（均 NOT_RUN）

- 於 `tools/wallpaper-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、兩種牆面模式與增刪列、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「壁紙用量計算」，title「壁紙用量計算｜Gloss Tools」，description「依房間周長或逐面牆尺寸、壁紙捲的寬與長、圖案重複長度，計算需要幾幅壁紙、每幅裁多長、共要買幾捲。」。英文 lang=en，H1 “Wallpaper Calculator”，title “Wallpaper Calculator | Gloss Tools”，description “Work out how many wallpaper strips you need, how long to cut each strip, and how many rolls to buy, from your room size, roll size and pattern repeat.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。為什麼填了門窗尺寸，捲數還是一樣？門窗面積會從毛牆面積扣除，得到淨牆面積。工具按完整牆寬估算幅數，因為門窗的位置、裁切方式和可用餘料會影響實際節省。 / Why does the roll count stay the same after I enter door or window dimensions? The calculator deducts the opening area to show the net wall area. It estimates strips from the full wall width because any savings depend on where the openings sit, how you cut the strips and which offcuts you can reuse.
- FAQ。每幅為什麼多留 10 公分？上下各 5 公分修剪裕度是固定常數，另再向上取整到完整圖案重複。 / Why does each strip get 10 cm extra? A fixed 5 cm trim allowance at the top and bottom, then the length is rounded up to whole pattern repeats.
- FAQ。損耗百分比加在哪裡？先把每面牆的幅數按損耗向上取整，再換算捲數；不同牆的剩料不互相流用。 / Where does the waste percentage apply? It inflates each wall's strip count (rounded up) before rolls are counted; leftovers are not shared between walls.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://wallpaper-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/wallpaper-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

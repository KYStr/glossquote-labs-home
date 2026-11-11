# 泳池水量計算 / Pool Volume Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-pool-volume-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

家裡或社區有泳池的人，在注水前需要先知道池子有多少水：水量決定注水要等多久、循環泵與過濾器的大致規格量級、以及水費的估算起點。他手上只有捲尺量到的長、寬（或直徑）和深度，卡在三件事：斜底池不知道該用哪個深度、圓池的 π 運算與單位換算容易手滑、注水流速換成小時更是常算錯。

- 桌面。社區管委會或泳池維護人員在辦公室對著量測紀錄，輸入尺寸與水龍頭／泵浦流速，確認總水量與注滿時間，安排注水時段。
- 行動。住家使用者站在池邊用手機，先量淺端與深端，選斜底模式確認水量，不啟動任何連線或定位。

使用情境為設計假設。資料只保留在目前頁面草稿。本工具只算理想形狀的水體體積；藥劑投放不在範圍內（見 scope）。

## scope

MVP 必做：長方形、圓形、橢圓形三種理想形狀；深度以單一深度或斜底平均深度（淺端＋深端取平均）表示；輸出水量 m³、公升、美制加侖與（有流速時的）注水時間。池壁假設垂直、池底假設平面（斜底為均勻斜面，平均深度對長方形均勻斜底為精確值）。

非目標（明文排除）：

- 藥劑投放計算（氯、pH 等劑量）——本工具到水量為止，不給任何投藥建議。
- 腎形、心形、L 形、複合形與任何不規則池形；台階、入水坡道、按摩池連通體。
- 池壁厚度、溢水溝、池緣高度與實際水位（水面低於池緣）的修正。
- 英制（呎／吋）輸入；水費金額（台灣水費另有 `taiwan-water-bill` 規格，費率與級距不在此重複）；循環泵／過濾器選型建議；水量以外的工程或衛生判斷。

已比對全庫存，最相近者的實質差異如下。

- legacy `tile-estimator`（鋪材用量試算，`sources/legacy/tile-estimator/`）：輸入地面矩形與磁磚尺寸，產出鋪設面積、片數與箱數，是「材料數量」問題；此處輸入池體尺寸，產出三維水體體積與注水時間，與鋪材無關。
- `docs/specs/paint-coverage-calculator/`（若以面積相近論）：算牆面塗裝面積與塗料量，不是封閉體積、不含深度與注水時間。

判定規則由本文定義。π 取 IEEE-754 雙精度的 `Math.PI`，不用有理數近似；美制加侖換算 1 gal = 3.785411784 L 為定義上的精確常數（1959 年國際碼磅協議下美制液量加侖的定義值）。無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「形狀 / Shape」：長方形 / Rectangular、圓形 / Circular、橢圓形 / Oval（單選）。
- 欄位或說明「深度方式 / Depth entry」：單一深度 / Single depth、斜底（淺端＋深端）/ Sloped floor (shallow + deep ends)（單選）。
- 欄位或說明「長度（公尺）／ Length (m)」「寬度（公尺）／ Width (m)」（長方形與橢圓形啟用）、「直徑（公尺）／ Diameter (m)」（圓形啟用）、「深度（公尺）／ Depth (m)」（單一深度啟用）、「淺端深度（公尺）／ Shallow-end depth (m)」「深端深度（公尺）／ Deep-end depth (m)」（斜底啟用）。未啟用欄位在介面上停用或隱藏，但送入核心時仍隨附（核心只查其容量，見 inputsOutputs）。
- 欄位或說明「注水流速（公升／分鐘，選填）／ Fill rate (L/min, optional)」：留空表示不算注水時間。
- 「計算水量 / Calculate volume」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「平均深度與水量 / Average depth and volume」先摘要再列細節：平均深度、m³、公升、美制加侖，及（有流速時）注水總分鐘與小時／分鐘拆分。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 結果旁常駐估算說明，原文釘版：「以理想形狀與垂直池壁估算；未計池壁厚度、台階與實際水位（水面通常低於池緣），請把結果當估算值。/ Estimated for an ideal shape with vertical walls. Wall thickness, steps, and the actual water level (usually below the rim) are not included; treat the result as an estimate.」
- 公升與 m³ 並列時，常駐一行精確度說明，原文釘版：「公升與立方公尺都由未捨入的水量各自捨入一次；公升是較精確的數字。/ Litres and cubic metres are each rounded once from the same unrounded volume; the litre figure is the more precise one.」

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果含 null 的注水欄位時，注水區塊顯示「未提供流速，不計算注水時間 / No fill rate provided; fill time not calculated.」。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"shape":"rectangular","depthMode":"single","lengthM":"8","widthM":"4","diameterM":"5","depthM":"1.5","shallowDepthM":"1","deepDepthM":"2","flowRateLMin":"40"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切 9 個欄位的普通物件，只讀 own data。未知、缺欄、錯型別（值非字串）、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

| 欄位 | 型別／文法 | 範圍 | 預設 | 啟用條件 |
| --- | --- | --- | --- | --- |
| `shape` | 列舉字串 `rectangular`／`circular`／`oval` | — | `rectangular` | 恆啟用 |
| `depthMode` | 列舉字串 `single`／`sloped` | — | `single` | 恆啟用 |
| `lengthM` | 十進位字串（下述文法），單位 m | 0.1–100 | `8` | shape 為 rectangular／oval |
| `widthM` | 同上 | 0.1–100 | `4` | shape 為 rectangular／oval |
| `diameterM` | 同上 | 0.1–100 | `5` | shape 為 circular |
| `depthM` | 同上 | 0.1–10 | `1.5` | depthMode 為 single |
| `shallowDepthM` | 同上 | 0.1–10 | `1` | depthMode 為 sloped |
| `deepDepthM` | 同上 | 0.1–10 | `2` | depthMode 為 sloped |
| `flowRateLMin` | 十進位字串，單位 L/min；空字串＝不提供 | 0.1–10000（非空時） | `40` | 恆啟用（選填） |

十進位文法（釘版）：`^[0-9]+(\.[0-9]{1,2})?$`——至少一位整數位，可選一位小數點加一至兩位小數。`0.5`、`8`、`8.50`、`100.00` 合法；`.5`（缺整數位）、`8.`（小數點後無位數）、`8.125`（三位小數）、`+8`、`-8`、`1e3`、含空白或全形字元皆 DECIMAL_FORMAT。raw 容量上限逐欄釘版（UTF-16 code units）：shape 最多 12（最長合法值 `rectangular` 為 11，留 1 餘裕）、depthMode 最多 8（最長合法值 `sloped` 為 6）、其餘數字欄最多 8（`10000.00` 恰 8，合法）。

範圍理由（釘版）：長／寬／直徑 0.1–100 m——下限排除零與負值（體積無意義且避免零體積），上限涵蓋 50 m 奧運池與大型公共池並留餘裕；深度 0.1–10 m——涵蓋跳水池約 5–6 m 並留餘裕；流速 0.1–10000 L/min——涵蓋家用水龍頭約 10–40 L/min 至商用泵浦千級流量。

驗證順序（釘版）。整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆 null（本工具無列輸入）。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

0. SCHEMA：物件形狀、欄位集合與值型別不符，先於一切欄位檢查。
1. 欄位依 shape、depthMode、lengthM、widthM、diameterM、depthM、shallowDepthM、deepDepthM、flowRateLMin 的順序逐欄檢查；每欄依序：容量（raw 超過該欄上限 → INPUT_LIMIT）→ 未成對 surrogate（→ UNICODE）→ 是否啟用（未啟用欄位於容量檢查後即跳過其餘檢查，內容即使非數字也不報錯，`circular-diameter-empty` 釘版）→ 空值（啟用欄位為空字串 → EMPTY；flowRateLMin 例外：空字串＝不提供，合法且跳過其餘檢查）→ 文法（shape／depthMode 非列舉值 → ENUM；數字欄位不符文法 → DECIMAL_FORMAT）→ 範圍（→ RANGE）。
2. 跨欄檢查（全部欄位檢查通過後）：depthMode 為 sloped 且 shallowDepthM 數值 > deepDepthM 數值 → `{code:"DEPTH_ORDER",field:"deepDepthM",row:null}`。淺端等於深端合法（等同單一深度）。
3. 計算（IEEE-754 雙精度，運算順序釘版，中間值不捨入）：
   - 解析：每個啟用數字欄位以 `Number(raw)` 解析（文法保證有限小數，解析結果即該字串的最近雙精度值）。
   - 平均深度：single → `avg = depth`；sloped → `avg = (shallow + deep) / 2`（先加後除，不捨入）。結果欄 `avgDepthM` 即此雙精度值。
   - 體積 raw 值 `V`（m³）：rectangular → `V = (length * width) * avg`；circular → `r = diameter / 2`，`V = ((Math.PI * r) * r) * avg`；oval → `a = length / 2`、`b = width / 2`，`V = ((Math.PI * a) * b) * avg`。乘法一律左結合，順序如式，不得改寫為 `Math.PI * (r * r)` 等等價式（雙精度結果可不同）。
   - 捨入函數 `rhu(x, d) = floor(x * 10^d + 0.5) / 10^d`（half-up；本工具所有量皆 > 0）。每個輸出只捨入一次，一律由未捨入值計算，不由顯示值反推：
     - `volumeM3 = rhu(V, 2)`；
     - `litresRaw = V * 1000`（不捨入）；`volumeLitres = rhu(litresRaw, 0)`（整數）；
     - `volumeGallonsUs = rhu(litresRaw / 3.785411784, 0)`（整數；除數為定義精確常數，解析為最近雙精度值）。
   - 注水時間（flowRateLMin 非空時）：`fillTotalMinutes = rhu(litresRaw / flowRate, 0)`（整數，由未捨入公升與解析後流速計算）；`fillHours = floor(fillTotalMinutes / 60)`；`fillMinutes = fillTotalMinutes - 60 * fillHours`（恆在 0–59）。時／分只由單一已捨入總分鐘拆分，兩部分不可能互相矛盾（不會出現 60 分；同 battery-runtime-calculator 的釘版模式）。flowRateLMin 為空時 `flowRateLMin`、`fillTotalMinutes`、`fillHours`、`fillMinutes` 四欄皆 null。
4. 結果物件恰含 10 欄：`{shape, depthMode, avgDepthM, volumeM3, volumeLitres, volumeGallonsUs, flowRateLMin, fillTotalMinutes, fillHours, fillMinutes}`。`shape`／`depthMode` 回顯輸入列舉值；`flowRateLMin` 非空時為解析後數值（例 `"40"` → `40`、`"12.50"` → `12.5`）。機器值不隨 locale 改。最小尺寸下 `volumeM3` 可為 `0` 而 `volumeLitres` 為 `1`——兩者同源未捨入值，公升為準（見 userFlow 精確度說明，`min-dimensions` 釘版）。

錯誤訊息（釘版雙語，UI 以 code 選訊）：

| code | 繁中 | English |
| --- | --- | --- |
| SCHEMA | 輸入格式不正確。 | The input is malformed. |
| INPUT_LIMIT | 輸入太長。 | The input is too long. |
| UNICODE | 輸入含有不完整的字元。 | The input contains an incomplete character. |
| EMPTY | 此欄必填。 | This field is required. |
| ENUM | 請選擇有效的選項。 | Choose a valid option. |
| DECIMAL_FORMAT | 請輸入最多兩位小數的數字。 | Enter a number with at most two decimal places. |
| RANGE | 數值超出允許範圍。 | The value is outside the allowed range. |
| DEPTH_ORDER | 淺端深度不可大於深端深度。 | Shallow-end depth must not exceed deep-end depth. |
| OUTPUT_LIMIT | 報告超過大小上限。 | The report exceeds the size limit. |
| INTERNAL／WORKER_ERROR | 處理失敗，請重試。 | Something went wrong. Try again. |

固定下載 `pool-volume-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/pool-volume-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- 核心只用 `Math.PI` 與基本運算，不讀 Date、主機時區或任何隨機來源；同一輸入在任何環境得到同一輸出。雙精度運算順序依 inputsOutputs 釘版，不得以「等價」重排（重排可改變末位）。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算水量」，畫面和完整報告符合核心 fixtures（含三形狀、斜底平均、注水拆分），使用者取得對應產物。 |
| boundaries | 合法端點（0.1 與 100／10／10000）、剛好越界、第一個錯誤、未啟用欄位忽略規則和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；形狀／深度方式切換正確啟停欄位。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。18 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `rect-single-depth` | 長方形單一深度，範例／預設，含注水 |
| `rect-sloped-average` | 斜底平均 (1.2+1.8)/2 = 1.5，無流速四欄 null |
| `circular-basic` | 圓形 π 雙精度路徑（(π·r)·r·depth 左結合） |
| `oval-basic` | 橢圓形半軸 π 路徑 |
| `rect-decimal-dimensions` | 兩位小數尺寸連乘 |
| `circular-sloped` | 圓形＋斜底組合 |
| `fill-time-hours-minutes` | 注水由單一總分鐘拆分（545 分 → 9 時 5 分） |
| `fill-minutes-tie` | 注水分鐘恰 312.5，half-up 313（非銀行家捨入） |
| `min-dimensions` | 最小尺寸：m³ 顯示 0、公升 1，同源不矛盾 |
| `max-dimensions` | 尺寸與流速上限端點 |
| `depth-out-of-range` | 深度 10.5，RANGE |
| `length-format` | 三位小數，DECIMAL_FORMAT |
| `sloped-depth-order` | 淺端大於深端，DEPTH_ORDER（跨欄，於逐欄後） |
| `circular-diameter-empty` | 直徑 EMPTY；未啟用欄位垃圾值不報錯 |
| `shape-invalid` | 未列舉形狀，ENUM |
| `flow-out-of-range` | 流速 0，RANGE |
| `length-input-limit` | 9 字元，INPUT_LIMIT 先於文法 |
| `width-unicode` | 未成對 surrogate，UNICODE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限（101、10.01、10000.01、0.09）、錯型別、額外欄、缺欄、單獨 surrogate 在未啟用欄（只查容量、應通過）、惡意字串、快速改值及晚到訊息。驗證斜底淺＝深等同單一深度、形狀切換後舊形狀欄位不影響結果、注水分鐘永不出現 60 分、所有輸出皆由未捨入值單次捨入（不得以顯示 m³ × 1000 推公升）。

候選 gate（均 NOT_RUN）

- 於 `tools/pool-volume-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「泳池水量計算」，title「泳池水量計算｜Gloss Tools」，description「輸入泳池長寬或直徑與深度（斜底可分淺端與深端），算出水量（立方公尺、公升、美制加侖）與注水所需時間。」。英文 lang=en，H1 “Pool Volume Calculator”，title “Pool Volume Calculator | Gloss Tools”，description “Enter a pool's length and width or diameter and depth (shallow and deep ends for sloped floors) to get its water volume in cubic metres, litres, and US gallons, plus fill time.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。斜底池怎麼算？取淺端與深端深度的平均；長方形均勻斜底時這是精確值，起伏不均勻的池底只是估算。 / How is a sloped floor handled? The shallow- and deep-end depths are averaged; for a uniformly sloped rectangular floor this is exact, and only an estimate for uneven floors.
- FAQ。為什麼公升不等於立方公尺顯示值 × 1000？兩者都由同一個未捨入水量各自捨入一次；小池可能出現立方公尺顯示 0、公升 1，公升是較精確的數字。 / Why don't litres equal the displayed cubic metres × 1000? Both are rounded once from the same unrounded volume; for a tiny pool the display can read 0 m³ and 1 litre, and the litre figure is the more precise one.
- FAQ。可以算加氯等藥劑用量嗎？不行。本工具只算水量，藥劑投放不在範圍內。 / Can it work out chemical dosing, such as chlorine? No. This tool calculates water volume only; chemical dosing is out of scope.
- FAQ。腎形或不規則池可以算嗎？不支援。只支援長方形、圓形與橢圓形的理想形狀。 / Can it handle kidney-shaped or irregular pools? No. Only ideal rectangular, circular, and oval shapes are supported.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://pool-volume.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/pool-volume-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

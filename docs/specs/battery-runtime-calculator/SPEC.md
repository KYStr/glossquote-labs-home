# 電池續航計算 / Battery Runtime Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-battery-runtime-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者手上只有電池的額定規格（容量 mAh 或 Wh、電壓）和裝置的瓦數，想在購買或出門前先算清楚能撐多久，或反過來算出需要買多大的電池。

- 桌面。行動電源或 UPS 的商品頁只標 20000 mAh / 3.7 V，接上 45 W 筆電到底能用幾小時，需要先把 mAh 換成 Wh 再除以負載。
- 行動。露營或 DIY 使用者組 18650 電池組（例如 4 串 2 並），想先確認組合後的總電壓、總容量與總電量，再估續航。
- 反推。路由器要在停電時撐滿 8 小時、負載 25 W，先算出所需 Wh 與 mAh 再去挑電池。

使用情境為估算。資料只保留在目前頁面草稿。成功結果是可由第三者以紙筆核對的確定值：總電量、可用電量、續航（小時與時／分兩種顯示），或反推的所需電量與所需容量。

## scope

MVP 為四種模式：以 mAh＋電壓計算續航、以 Wh 直接計算續航、由目標續航＋負載反推所需容量、串／並聯電池組組合後計算續航。放電深度為單一百分比係數（預設 100%）。全部運算為精確有理數，只在輸出時依釘版規則捨入一次。

非目標如下。

- Peukert 效應：放電速率改變有效容量，本工具不模擬。
- 以電流（A）輸入負載：負載只接受瓦數（W）。知道電流與電壓者可自行相乘後輸入，本工具不提供此輸入路徑。
- 轉換器（逆變器／升降壓）損耗的獨立參數：只能以放電深度粗略涵蓋，不另設效率欄位。
- 充電時間、充電效率、電池健康度、循環壽命、依化學種類（鋰離子／鉛酸／磷酸鐵鋰）自動帶入參數。放電深度預設 100% 不依種類調整；鉛酸約 50% 僅在說明文字中標示為簡化指引。
- 即時監測、裝置控制、電池選購推薦或安全認證。

已比對既有規格，最相近者的實質差異如下。

- 活動備用電池替換表（`docs/specs/battery-swap-plan/`）：輸入的是各設備「實測可用分鐘」與使用時段，產出換電池的時間表，屬排程問題，且明文排除電子額定估算。此處正相反：輸入額定規格（mAh／Wh／V／W），產出續航與容量估算，不做排程。

判定規則由本文定義，無線上資料或外部服務依賴。核心邏輯決定性且不讀主機時區。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

模式切換即換欄位組；不適用於新模式的欄位草稿值在切換時移除，送出快照只含目前模式的欄位。欄位標籤（不可只用 placeholder）如下。

| 欄位 | 繁中標籤 | English label |
| --- | --- | --- |
| mode | 計算模式 | Mode |
| capacityMah | 電池容量（mAh） | Capacity (mAh) |
| capacityWh | 電池容量（Wh） | Capacity (Wh) |
| voltage | 電壓（V） | Voltage (V) |
| loadWatts | 負載功率（W） | Load (W) |
| targetRuntimeHours | 目標續航（小時） | Target runtime (hours) |
| depthOfDischargePercent | 放電深度（%） | Depth of discharge (%) |
| cellCapacityMah | 單顆電芯容量（mAh） | Cell capacity (mAh) |
| cellVoltage | 單顆電芯電壓（V） | Cell voltage (V) |
| seriesCount | 串聯數 | Cells in series |
| parallelCount | 並聯數 | Cells in parallel |

模式選項標籤：`runtime-mah`「用 mAh 計算 / From mAh」、`runtime-wh`「用 Wh 計算 / From Wh」、`solve`「反推所需容量 / Solve required capacity」、`pack`「電池組組合 / Battery pack」。

- 「計算 / Calculate」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例（`phone-basic`），明示範例並等待手動執行。
- 結果先摘要再列細節：續航同時以「3.7 小時」與「3 小時 42 分」兩種形式顯示；反推模式顯示「所需電量 / Required energy」與「所需容量 / Required capacity」。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 狀態 `infinite`（負載 0 W）顯示「無負載，續航無限 / No load — runtime is unlimited」，電量數值照常列出，續航欄位顯示此狀態文字而非數字。
- 結果下方常駐估算聲明，原文釘版：「本工具為估算：實際續航會因溫度、電池老化、放電速率與裝置效率而不同。 / This tool gives estimates only: actual runtime varies with temperature, battery age, discharge rate and device efficiency.」
- 放電深度欄位旁的輔助文字，原文釘版：「放電深度預設 100%。鉛酸電池常以約 50% 為可用上限，此為簡化假設，不依電池種類自動調整。 / Depth of discharge defaults to 100%. Lead-acid batteries are commonly limited to about 50% usable capacity; this is a simplifying assumption and is not adjusted automatically by battery type.」
- 反推模式結果旁註記，原文釘版：「所需容量以無條件進位至整數 mAh，確保不低於目標續航所需。 / Required capacity is rounded up to the next whole mAh so it never falls short of the target runtime.」

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、模式或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。`infinite` 狀態有專屬說明文字。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"mode":"runtime-mah","capacityMah":"10000","voltage":"3.7","loadWatts":"10"}`（放電深度未填，視為 100）並聚焦首欄。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數為普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA。JSON fixture 即介面。

**欄位與文法。** 除 `mode` 外所有欄位值皆為字串。

- `mode` 為字串列舉：`runtime-mah`、`runtime-wh`、`solve`、`pack`。
- 十進位文法（capacityMah、capacityWh、voltage、loadWatts、targetRuntimeHours、depthOfDischargePercent、cellCapacityMah、cellVoltage）：`^[0-9]+(\.[0-9]{1,6})?$`。至少一位整數位，小數最多 6 位；無正負號、空白、指數、千分位或百分號。前導零允許（`"007"` = 7、`"00.50"` = 0.5）。
- 整數文法（seriesCount、parallelCount）：`^[0-9]+$`，前導零允許。
- raw 長度上限（UTF-16 code units，INPUT_LIMIT）：capacityMah 12、capacityWh 10、voltage 8、loadWatts 11、targetRuntimeHours 10、depthOfDischargePercent 7、cellCapacityMah 12、cellVoltage 8、seriesCount 3、parallelCount 3。各上限均不截斷合法最大值（例如電壓最大值 `"1000.000"` 恰 8 單位）。
- 範圍：capacityMah、cellCapacityMah 為 0 < x ≤ 10,000,000；capacityWh 為 0 < x ≤ 100,000；voltage、cellVoltage 為 0 < x ≤ 1,000；loadWatts 為 0 ≤ x ≤ 1,000,000（0 合法，語義見下）；targetRuntimeHours 為 0 < x ≤ 100,000；depthOfDischargePercent 為 0 < x ≤ 100；seriesCount、parallelCount 為整數 1–100。
- depthOfDischargePercent 為所有模式的選填欄：缺席視為 `"100"`；出現則必須通過同一套驗證（空字串為 EMPTY，不視為缺席）。
- 各模式的必要欄位：runtime-mah = capacityMah、voltage、loadWatts；runtime-wh = capacityWh、loadWatts；solve = targetRuntimeHours、loadWatts、voltage；pack = cellCapacityMah、cellVoltage、seriesCount、parallelCount、loadWatts。

**驗證順序（釘版，第一个失敗即回 `{ok:false,error:{code,field,row}}`，row 恆 null）。**

1. 結構 SCHEMA：input 非普通物件、含 accessor、或 `mode` 缺席／非字串 → SCHEMA，field=null。
2. 列舉 ENUM：`mode` 為字串但不在四值內 → ENUM，field=`"mode"`。
3. 欄位集合 SCHEMA：出現未知欄位、不適用於目前模式的欄位，或缺少必要欄位 → SCHEMA，field=null。
4. 型別 SCHEMA：任一出現的欄位值非字串 → SCHEMA，field=null。
5. 逐欄驗證，依模式的欄位順序：runtime-mah 為 capacityMah、voltage、loadWatts、depthOfDischargePercent；runtime-wh 為 capacityWh、loadWatts、depthOfDischargePercent；solve 為 targetRuntimeHours、loadWatts、voltage、depthOfDischargePercent；pack 為 cellCapacityMah、cellVoltage、seriesCount、parallelCount、loadWatts、depthOfDischargePercent。每欄依序：容量 INPUT_LIMIT → 不成對 surrogate UNICODE → 缺內容 EMPTY → 文法 DECIMAL_FORMAT（計數欄為 INTEGER_FORMAT）→ 範圍 RANGE。field 即該欄位名。

成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

**計算（釘版，精確有理數；每個十進位字串解析為整數分子／10^k 的分數，全程不捨入）。**

- 捨入函數 rhu(x, d) = floor(x × 10^d + 1/2) / 10^d（half-up；本工具所有量皆 ≥ 0）。
- runtime-mah：energy = capacityMah × voltage / 1000（Wh）。
- runtime-wh：energy = capacityWh。
- pack：packVoltage = cellVoltage × seriesCount；packCapacity = cellCapacityMah × parallelCount；energy = packCapacity × packVoltage / 1000。不變量（性質測試釘版）：energy 恰等於 (cellCapacityMah × cellVoltage / 1000) × seriesCount × parallelCount，即串聯加電壓、並聯加容量，總電量兩種算法一致。
- usable = energy × depthOfDischargePercent / 100，depthOfDischargePercent 缺席以 100 計。
- 續航（runtime-mah、runtime-wh、pack）：loadWatts = 0 時 status=`"infinite"`，四個續航欄位皆 null，energy 與 usable 照常輸出。loadWatts > 0 時 status=`"ok"`，exactHours = usable / loadWatts（有理數，不捨入）；runtimeHours = rhu(exactHours, 1)；runtimeTotalMinutes = rhu(exactHours × 60, 0)（整數）；runtimeHoursPart = floor(runtimeTotalMinutes / 60)；runtimeMinutesPart = runtimeTotalMinutes − 60 × runtimeHoursPart（恆在 0–59）。時／分顯示只由單一 runtimeTotalMinutes 拆分，兩部分不可能互相矛盾（不會出現 60 分）；runtimeHours 為同一精確值的獨立 1 位小數捨入。續航極小時可捨入為 0.0 小時／0 分，狀態仍為 `"ok"`（`tiny-runtime` 釘版）。
- solve：requiredEnergyExact = loadWatts × targetRuntimeHours × 100 / depthOfDischargePercent；requiredEnergyWh = rhu(requiredEnergyExact, 2)；requiredCapacityMah = ceil(requiredEnergyExact / voltage × 1000)（最小的大於等於精確值的整數；精確值恰為整數時即該整數，不多加 1）。requiredCapacityMah 由未捨入的 requiredEnergyExact 計算，不由顯示值反推。loadWatts = 0 時 requiredEnergyWh 與 requiredCapacityMah 皆為 0，status=`"ok"`。
- 顯示用 energy／usable 以 rhu(·, 2) 輸出；所有下游計算一律使用未捨入的精確值，絕不使用顯示值（`exact-not-display` 釘版：顯示 12.96 Wh、但以 12.9645 Wh 計算得恰 30 小時）。

**結果形狀（釘版，欄位集合不多不少）。**

- runtime-mah、runtime-wh：`{mode, status, energyWh, usableWh, runtimeHours, runtimeTotalMinutes, runtimeHoursPart, runtimeMinutesPart}`。
- pack：`{mode, status, packVoltageV, packCapacityMah, energyWh, usableWh, runtimeHours, runtimeTotalMinutes, runtimeHoursPart, runtimeMinutesPart}`。packVoltageV 與 packCapacityMah 為精確值（不捨入；由文法保證小數位有限）。
- solve：`{mode, status, requiredEnergyWh, requiredCapacityMah}`，status 恆 `"ok"`。
- 數值輸出為釘版小數的最接近 IEEE-754 double（即 JSON 字面值；37.0 序列化為 37）。runtimeTotalMinutes、runtimeHoursPart、runtimeMinutesPart、requiredCapacityMah 為 JSON 整數。機器值不隨 locale 改。

固定下載 `battery-runtime-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/battery-runtime-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 精度（釘版）：核心必須以 BigInt 定標整數（或等價的有理數表示）實作十進位運算，禁止以二進位浮點執行核心計算。理由：fixtures 釘版了精確的逢五進位邊界（2.25 小時 → 2.3、61.5 分 → 62 分），double 表示誤差會使這類邊界翻盤。只在最終把釘版小數轉為 JSON number 輸出時才可經過 double。
- 核心不讀 Date、不讀主機時區、不讀 locale，同輸入在任何環境同輸出。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換模式、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算」，四種模式的畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、逢五進位邊界與三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。28 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `phone-basic` | 範例：mAh×V/1000 = 37 Wh、3.7 小時 = 3 小時 42 分 |
| `powerbank-laptop` | 循環小數續航的小時與分鐘各自正確捨入 |
| `dod-lead-acid` | 放電深度 50% 使可用電量減半 |
| `half-up-tie` | 恰 2.25 小時：half-up 為 2.3；時分顯示 2 小時 15 分 |
| `minutes-tie` | 恰 61.5 分：half-up 為 62 分；小時 1 位為 1.0 |
| `zero-load-infinite` | 負載 0 為 infinite 狀態、續航欄 null、電量照常 |
| `tiny-runtime` | 極小續航捨入為 0 小時 0 分且狀態 ok |
| `ups-wh` | Wh 模式整除 4 小時 |
| `wh-with-dod` | Wh 模式套用放電深度 80% |
| `exact-not-display` | 續航以未捨入電量計算，與顯示值路徑結果不同 |
| `solve-phone` | 反推所需 Wh 與 mAh 無條件進位 |
| `solve-with-dod` | 反推含放電深度 50% |
| `solve-zero-load` | 反推負載 0 得 0／0 |
| `solve-exact-integer` | 反推恰為整數 mAh 時不超估 |
| `pack-4s2p` | 4 串 2 並的電壓、容量、電量與續航 |
| `pack-single-cell` | 1 串 1 並與單顆相同 |
| `pack-zero-load` | 電池組負載 0 為 infinite |
| `boundary-max` | capacityWh 與 loadWatts 合法上限 |
| `err-decimal-format` | 千分位逗號回 DECIMAL_FORMAT |
| `err-range-voltage` | 電壓剛好越界回 RANGE |
| `err-empty-load` | 空字串回 EMPTY |
| `err-input-limit` | raw 超長回 INPUT_LIMIT |
| `err-enum-mode` | 未知模式回 ENUM |
| `err-schema-extra-field` | 不適用欄位出現回 SCHEMA |
| `err-unicode-surrogate` | 不成對 surrogate 回 UNICODE |
| `err-range-count` | 串聯數 101 回 RANGE |
| `err-integer-format` | 並聯數含小數點回 INTEGER_FORMAT |
| `err-range-dod-zero` | 放電深度 0 回 RANGE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測文法邊界：`.5`、`5.`、`1e3`、`+5`、` 5`（前置空白）皆 DECIMAL_FORMAT；`"007"` 合法且等於 7；depthOfDischargePercent `"100.000"` 恰在 raw 上限內且合法；voltage `"1000"` 合法、capacityMah `"10000000"` 合法；seriesCount `"0"` 回 RANGE。性質測試：任一合法 pack 輸入，packCapacityMah × packVoltageV / 1000 恰等於單顆 Wh × 串聯 × 並聯；任一 ok 結果，runtimeMinutesPart 介於 0–59 且 runtimeHoursPart × 60 + runtimeMinutesPart = runtimeTotalMinutes；solve 結果的 requiredCapacityMah 換回 Wh（× voltage / 1000）恆 ≥ requiredEnergyExact 的顯示值所需且差距小於 1 mAh 換算量。

候選 gate（均 NOT_RUN）

- 於 `tools/battery-runtime-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「電池續航計算」，title「電池續航計算｜Gloss Tools」，description「輸入電池容量（mAh 或 Wh）、電壓與負載瓦數，估算可用電量與續航時間，也能反推達到目標續航所需的容量，或計算串並聯電池組的總電量。」。英文 lang=en，H1 “Battery Runtime Calculator”，title “Battery Runtime Calculator | Gloss Tools”，description “Estimate usable energy and runtime from battery capacity in mAh or Wh, voltage and load in watts — or solve for the capacity a target runtime requires, or combine cells in series and parallel.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。Wh 怎麼換算？Wh = mAh × V ÷ 1000。 / How is Wh calculated? Wh = mAh × V ÷ 1000.
- FAQ。為什麼實際續航比較短？溫度、老化、放電速率與轉換損耗都會降低可用電量；本工具為估算，可用放電深度粗略反映。 / Why is real-world runtime shorter? Temperature, ageing, discharge rate and conversion losses all reduce usable energy; this tool gives an estimate and the depth-of-discharge input can approximate them.
- FAQ。負載填 0 W 為什麼顯示無限？模型中沒有負載就不消耗電量，續航不設上限；這是狀態，不是錯誤。 / Why does a 0 W load show unlimited runtime? With no load the model draws no energy, so runtime has no finite limit; this is a status, not an error.
- FAQ。有考慮 Peukert 效應嗎？沒有。大電流放電時鉛酸電池的有效容量會下降，本工具不模擬此效應。 / Is the Peukert effect included? No. Effective capacity drops at high discharge rates, especially for lead-acid batteries; this tool does not model that effect.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://battery-runtime.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/battery-runtime-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

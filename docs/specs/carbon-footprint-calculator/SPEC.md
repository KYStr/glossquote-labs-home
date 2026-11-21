# 碳足跡計算 / Carbon Footprint Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-carbon-footprint-calculator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

家戶使用者想知道自己一年的生活大約排了多少溫室氣體，卻只有電費單上的度數、車子的里程與油耗、搭車與搭飛機的里程、以及每週大概吃多少肉蛋米飯這些手邊數字。本工具把這些活動量乘上釘版的官方排放係數，算出年度碳足跡（公斤 CO2e）與六大類別的拆解，讓使用者一眼看到哪一類占比最大。

- 桌面。桌面填上每月用電、車輛里程與油耗、大眾運輸與飛行里程、每週飲食量，看到年度總量、公噸數與各類別占比，並下載報告。
- 行動。手機在電費單旁邊核對一年用電的排放量，不啟動任何工作。

使用情境為個人估算。資料只保留在目前頁面草稿。結果一律標示為估算值。

## scope

年度估算模型：用電、開車／騎車、公車、捷運／鐵路、飛行、飲食共六類。非目標為正式碳盤查、碳足跡查證或任何申報依據、即時電價或票價查詢、減碳建議的個人化追蹤、帳號或資料儲存、即時排放監測、企業或產品生命週期評估。

已與 registry 的既有預案比對，最相近者的實質差異如下。

- 從用電度數與使用者自填費率算電費。此處用官方電力排碳係數把度數換算成公斤 CO2e，不算錢、不分電價級距、不含太陽能自發自用或售電。 [spec-electricity-cost-calculator](https://github.com/KYStr/glossquote-labs-home/blob/aaa4930a6ac042ad9d98b1b21b74ef5caad8b63c/docs/specs/electricity-cost-calculator/SPEC.md)
- 從里程與油耗算油錢。此處用 IPCC 燃料燃燒係數把油耗換算成公斤 CO2e，不算錢。 [spec-fuel-cost-calculator](https://github.com/KYStr/glossquote-labs-home/blob/aaa4930a6ac042ad9d98b1b21b74ef5caad8b63c/docs/specs/fuel-cost-calculator/SPEC.md)

判定規則由本文定義，無線上資料或外部服務依賴。排放係數表見 inputsOutputs 第 2 條，係數版本以本文釘版為準，不隨官方年度更新自動變動。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「每月用電、開車里程與油耗 / Monthly electricity, driving distance and fuel use」
- 欄位或說明「大眾運輸與飛行里程 / Public transport and flight distance」
- 欄位或說明「每週飲食量 / Weekly food amounts」
- 「計算年度碳足跡 / Calculate annual footprint」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「年度總量與類別占比 / Annual total and category shares」先摘要再列細節。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 結果旁固定顯示估算聲明（雙語，見 inputsOutputs 第 7 條）與係數來源表，另附一行情境文字：台灣 2024 年人均溫室氣體排放約 11.7 公噸 CO2e（全國總量約 273 百萬公噸／人口約 2,340 萬人，2026 年版國家溫室氣體排放清冊），僅供對照，不作達標判定。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果（全零輸入）有說明，總量 0.0 公斤 CO2e，各類別占比皆 0.0%。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"electricityKwhPerMonth":"300","carKmPerYear":"0","carFuelLPer100Km":"8","carFuelType":"gasoline","busKmPerYear":"0","railKmPerYear":"0","flightShortKmPerYear":"0","flightLongKmPerYear":"0","dietBeefKgPerWeek":"0","dietPorkKgPerWeek":"0","dietPoultryKgPerWeek":"0","dietFishKgPerWeek":"0","dietEggsKgPerWeek":"0","dietRiceKgPerWeek":"0"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 除 `carFuelType` 外全為十進小數字串，最多 2 位小數，0 或非零開頭，無空白／符號／指數／千分位逗號，raw 每欄最多 12 單元。`carFuelType` 僅接受 `gasoline` 或 `diesel`。
- 範圍：electricityKwhPerMonth 0–100000（度／月），carKmPerYear 0–500000（公里／年），carFuelLPer100Km 0–100（公升／100 公里），busKmPerYear、railKmPerYear、flightShortKmPerYear、flightLongKmPerYear 0–1000000（公里／年），dietBeefKgPerWeek、dietPorkKgPerWeek、dietPoultryKgPerWeek、dietFishKgPerWeek、dietEggsKgPerWeek、dietRiceKgPerWeek 0–100（公斤／週）。
- 預設見 userFlow 重設物件。機車使用者以同一組車輛欄位輸入機車里程與油耗；燃料種類同為汽油／柴油二選一。

1. 欄位順序即驗證順序：electricityKwhPerMonth、carKmPerYear、carFuelLPer100Km、carFuelType、busKmPerYear、railKmPerYear、flightShortKmPerYear、flightLongKmPerYear、dietBeefKgPerWeek、dietPorkKgPerWeek、dietPoultryKgPerWeek、dietFishKgPerWeek、dietEggsKgPerWeek、dietRiceKgPerWeek。先容量、再物件形狀、再逐欄驗證。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、文法 DECIMAL_FORMAT、範圍 RANGE、形狀或列舉 SCHEMA。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。
2. 排放係數表（本文釘版，單位公斤 CO2e；係數不隨官方年度更新自動變動）：

| 活動 | 係數 | 來源（釘版） |
| --- | --- | --- |
| 用電 | 0.471 /度（kWh） | 經濟部能源署公布 114 年度（2025 年）民生住宅電力排碳係數，2026-06-02 公告；家戶工具故取住宅值，不取公用售電業整體 0.467 或產業 0.466 |
| 汽油燃燒 | 2.31 /公升 | IPCC《2006 年國家溫室氣體排放清冊指南》第 2 卷第 3 章預設燃燒係數（僅 CO2，不含 CH4／N2O） |
| 柴油燃燒 | 2.68 /公升 | 同上 |
| 公車 | 0.102 /延人公里 | 英國政府溫室氣體換算係數 DEFRA 2024，local bus |
| 捷運／鐵路 | 0.035 /延人公里 | DEFRA 2024，national rail 公布值 0.03546，本文取至 3 位小數 |
| 短程飛行 | 0.153 /延人公里 | DEFRA 2024，economy，含輻射強迫（radiative forcing，RF 1.9）；短程指單程未滿 3,700 公里 |
| 長程飛行 | 0.148 /延人公里 | DEFRA 2024，economy，含輻射強迫（RF 1.9）；長程指單程 3,700 公里以上 |
| 牛肉 | 99.5 /公斤 | Poore & Nemecek (2018), Science，全球平均（含土地利用變化），經 Our World in Data 彙整 |
| 豬肉 | 12.3 /公斤 | 同上 |
| 雞肉 | 9.9 /公斤 | 同上 |
| 養殖魚 | 13.6 /公斤 | 同上 |
| 雞蛋 | 4.7 /公斤 | 同上 |
| 米 | 4.5 /公斤 | 同上 |

3. 計算（全部以未捨入值進行，捨入只在輸出時做一次）：
   - 用電：`electricity = electricityKwhPerMonth × 12 × 0.471`
   - 車輛：`litres = carKmPerYear × carFuelLPer100Km ÷ 100`；`car = litres × 2.31`（汽油）或 `× 2.68`（柴油）
   - 公車：`bus = busKmPerYear × 0.102`；捷運／鐵路：`rail = railKmPerYear × 0.035`
   - 飛行：`flights = flightShortKmPerYear × 0.153 + flightLongKmPerYear × 0.148`
   - 飲食：每項 `weeklyKg × 52 × 係數`，六項相加為 `diet`
   - 總量：`totalKgCo2e = electricity + car + bus + rail + flights + diet`（未捨入值相加）
4. 捨入：半向上捨入（half away from zero）至 1 位小數，適用於六個類別值、總量公斤數、公噸數與占比。總量取未捨入總和捨入後的結果，不是六個已捨入類別值的和。公噸數 `totalTonnesCo2e = totalKgCo2e（未捨入）÷ 1000` 再捨入至 1 位小數。占比 `sharePct = 100 × 類別未捨入值 ÷ 總量未捨入值` 再捨入至 1 位小數；總量為 0 時六個占比皆為 0.0，不產生 NaN。六個已捨入占比之和可能為 99.9–100.1，不做湊整調整。
5. 結果 `{categories:{electricity:{kgCo2e,sharePct},car:{kgCo2e,sharePct},bus:{kgCo2e,sharePct},rail:{kgCo2e,sharePct},flights:{kgCo2e,sharePct},diet:{kgCo2e,sharePct}},totalKgCo2e,totalTonnesCo2e}`。`kgCo2e` 與 `totalKgCo2e`、`totalTonnesCo2e`、`sharePct` 皆為數字（1 位小數）。類別鍵順序固定為 electricity、car、bus、rail、flights、diet。機器值不隨 locale 改；千分位逗號與小數點僅為顯示格式。
6. 飲食係數為全球平均，生產方式差異極大（牛肉平均 99.5，但中位數遠低於平均，牧場與飼養方式可差數倍）；燃料係數為燃燒端 CO2，不含開採煉製上游排放；飛行係數含輻射強迫。以上限制與係數來源表一併顯示於結果旁。
7. 估算聲明（固定文字，雙語，結果旁顯示）：「本工具結果為估算值，僅供個人參考，不構成正式碳盤查、碳足跡查證或任何申報依據。」 / "Results are estimates for personal reference only and are not a formal carbon inventory, verified footprint, or reporting basis."

固定下載 `carbon-footprint-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/carbon-footprint-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- 捨入以十進制半向上實作（例如 Decimal 或整數十分位運算），不得以二進制浮點的 `toFixed` 直接捨入未捨入值；fixtures 的 `rounding-half-up` 案例（7.65 → 7.7）為判定測試。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。
- 本工具無日期輸入，年度換算固定為每月 ×12、每週 ×52，與主機時區無關；核心邏輯確定性，不依賴當下時間。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算年度碳足跡」，畫面和完整報告符合核心 fixtures，使用者取得對應產物；六類別、總量、公噸數、占比皆與 fixtures 一致。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據；7.65 → 7.7 半向上捨入證據；全零輸入總量 0.0 且占比皆 0.0 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；使用者能說出結果是估算值、不是正式盤查依據。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。12 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `typical-household` | 典型家戶六類合計 9076.4 公斤 CO2e（9.1 公噸），飲食占比最大 51.6% |
| `electricity-only` | 僅用電 250 度／月 → 1413.0 公斤，占比 100.0% |
| `all-zero` | 全零輸入 → 總量 0.0，六占比皆 0.0（不產生 NaN） |
| `diesel-car` | 柴油車 20000 公里、6.5 公升／100 公里 → 3484.0 公斤 |
| `flights` | 短程 1500 公里＋長程 10000 公里 → 1709.5 公斤 |
| `diet-low-meat` | 低肉飲食（米＋蛋）→ 946.4 公斤 |
| `rounding-half-up` | 公車 75 公里 × 0.102 = 7.65 → 7.7（半向上，非銀行家捨入的 7.6） |
| `max-electricity` | 用電上限 100000 度／月 → 565200.0 公斤 |
| `range-error` | 開車里程 500001 超出 0–500000 → RANGE，field carKmPerYear |
| `decimal-format-error` | 用電 12.345 為 3 位小數 → DECIMAL_FORMAT，field electricityKwhPerMonth |
| `empty-error` | 用電空白 → EMPTY，field electricityKwhPerMonth |
| `bad-fuel-type` | 燃料種類 electric 不在列舉內 → SCHEMA，field carFuelType |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證用電 100000 接受、100001 拒絕、油耗 0 接受（里程為零時排放為零）、飲食 100 接受、101 拒絕、小數第 3 位拒絕、負號拒絕。所有已接受的類別值與總量皆為未捨入值捨入一次所得，總量不是已捨入類別值的和。

候選 gate（均 NOT_RUN）

- 於 `tools/carbon-footprint-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「碳足跡計算」，title「碳足跡計算｜Gloss Tools」，description「輸入用電、交通與飲食，以官方排放係數估算一年碳足跡（公斤 CO2e），並看到六大類別的拆解。」。英文 lang=en，H1 “Carbon Footprint Calculator”，title “Carbon Footprint Calculator | Gloss Tools”，description “Estimate your annual carbon footprint in kg CO2e from electricity, transport and diet using official emission factors, with a breakdown by category.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。結果是正式碳盤查嗎？不是，這是估算值，僅供個人參考。 / Is this a formal carbon inventory? No, it is an estimate for personal reference only.
- FAQ。為什麼牛肉的係數這麼高？飲食係數取 Poore & Nemecek (2018) 全球平均（含土地利用變化），生產方式差異極大，數值僅供比較參考。 / Why is the beef factor so high? Diet factors are Poore & Nemecek (2018) global averages including land-use change; production methods vary widely, so treat the figures as comparative estimates.
- FAQ。機車怎麼算？機車用同一組車輛欄位，填機車里程與油耗即可。 / How do I count a scooter? Use the same vehicle fields with your scooter's distance and fuel use.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://carbon-footprint-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/aaa4930a6ac042ad9d98b1b21b74ef5caad8b63c/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/carbon-footprint-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

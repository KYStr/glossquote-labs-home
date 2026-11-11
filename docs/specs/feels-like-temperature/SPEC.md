# 體感溫度計算 / Feels-Like Temperature Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-feels-like-temperature-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者出門或安排戶外活動前，手邊只有氣象預報的氣溫、風速與相對濕度，想知道身體實際感受到的溫度，以便決定衣著與停留時間。

- 桌面。冬天出門前輸入 −15 °C 與風速 20 km/h，立即看到風寒體感 −24.2 °C，比單看氣溫更能判斷保暖需求。
- 行動。夏天在戶外工作或運動前輸入 30 °C、濕度 70%，看到熱指數體感 35.0 °C，知道悶熱程度被低估。

使用情境為天氣判讀輔助。體感溫度是模型估算，不是醫療或安全建議；資料只保留在目前頁面草稿。

## scope

MVP 必做：單一輸入組（氣溫 °C、風速 km/h、相對濕度 %）→ 依定義域選出唯一模型 → 回報體感溫度（°C，1 位小數）、與實際氣溫的差值，以及所用模型的標示。

- 風寒模型（wind chill）：Environment Canada 與美國 NWS 2001 年共同採用的公式，定義域 T ≤ 10 °C 且風速 v > 4.8 km/h。
- 熱指數模型（heat index）：Rothfusz 迴歸（NWS Technical Attachment SR 90-23, 1990）加兩項標準調整，本工具定義域 T ≥ 27 °C 且 RH ≥ 40%。
- 兩模型皆不適用時：回報實際氣溫本身，model 標示 `actual`，介面明示「超出兩模型定義域」。

非目標：澳洲 apparent temperature（Bureau of Meteorology／Steadman 另一模型）不納入，避免同一輸入出現兩個互相競爭的「體感」數字；WBGT、紫外線、即時天氣 API、歷史天氣、逐時預報、凍傷時間或中暑風險分級、醫療建議皆不做。風速不做單位切換（僅 km/h），氣溫僅 °C；不提供 °F 輸入（熱指數內部換算 °F 是公式的一部分，不是介面單位）。

已比對既有庫存。最相近者的實質差異如下。

- run 5 同批的露點計算（dew-point）同樣吃氣溫＋濕度，但輸出露點與絕對濕度，不做模型定義域切換，也不使用風速。
- 既有 sunrise-sunset、moon-phase 等天文工具處理日期與天象，不處理人體體感模型。

判定規則由本文定義，公式常數出自下列一手來源（2026-11-09 查證）：Environment Canada／NWS 風寒公式與定義域（氣溫 ≤ 10 °C、風速 > 4.8 km/h）；NOAA Weather Prediction Center「The Heat Index Equation」刊載的 Rothfusz 迴歸全文與兩項調整（低濕：RH < 13% 且 80–112 °F 時減去 ((13−RH)/4)·√((17−|T−95|)/17)；高濕：RH > 85% 且 80–87 °F 時加上 ((RH−85)/10)·((87−T)/5)）。無線上資料或外部服務依賴（公式常數寫死於規格與程式）。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「氣溫（°C）/ Air temperature (°C)」
- 欄位或說明「風速（km/h，10 公尺高度）/ Wind speed (km/h, at 10 m)」
- 欄位或說明「相對濕度（%）/ Relative humidity (%)」
- 「計算體感溫度 / Calculate feels-like temperature」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「體感溫度與所用模型 / Feels-like temperature and model used」先摘要再列細節：體感溫度（°C）、模型標籤（「風寒效應 / Wind chill」、「熱指數 / Heat index」或「實際氣溫（超出兩模型定義域）/ Actual temperature (outside both model domains)」）、與實際氣溫的差值。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果含模型標示；model 為 actual 時同時顯示超出定義域說明。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"temperature":"22","windSpeed":"10","humidity":"60"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

- 欄位順序固定：`temperature`、`windSpeed`、`humidity`，皆為十進數文字列。
- `temperature`：raw 最多 6 個 UTF-16 單元；文法 `^-?[0-9]+(\.[0-9])?$`（可負號、至多 1 位小數；不接受 `+` 號、`.5`、`5.`、空白、指數）；範圍 −60 至 60（°C）。
- `windSpeed`：raw 最多 5 單元；文法 `^[0-9]+(\.[0-9])?$`（不接受負號）；範圍 0 至 300（km/h）。
- `humidity`：raw 最多 5 單元；文法 `^[0-9]+(\.[0-9])?$`；範圍 0 至 100（%）。
- 預設 temperature 22、windSpeed 10、humidity 60（三者皆使結果落在 actual，適合作為中性起點）。

逐欄驗證順序固定：先容量 INPUT_LIMIT、再不成對 surrogate UNICODE、再缺內容 EMPTY、再文法 DECIMAL_FORMAT、最後範圍 RANGE；欄位依 temperature、windSpeed、humidity 順序，第一個失敗即整份失敗。整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆為 null（本工具無列輸入）。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

模型選擇（驗證全過後，依此順序判定，恰一成立）：

1. **wind-chill**：T ≤ 10.0 且 v > 4.8。
2. **heat-index**：T ≥ 27.0 且 RH ≥ 40。
3. **actual**：其餘情形。

兩模型定義域互斥（T ≤ 10 與 T ≥ 27 不可能同時成立），順序僅為釘版確定性，不存在優先權衝突。邊界語義釘版：風寒的氣溫界是「≤」、風速界是嚴格「>」（v 恰 4.8 不入風寒）；熱指數兩界皆「≥」（T 恰 27.0、RH 恰 40 入熱指數）。

公式（IEEE 754 雙精度浮點，`^` 為冪次）：

- 風寒（T 為 °C、v 為 km/h）：`WC = 13.12 + 0.6215·T − 11.37·v^0.16 + 0.3965·T·v^0.16`，結果即 °C。
- 熱指數：先換算 `TF = T·9/5 + 32`（精確有理運算順序：T 先乘 9、除以 5、加 32）。Rothfusz 迴歸（TF 單位 °F、R 為 RH 數值）：
  `HI = −42.379 + 2.04901523·TF + 10.14333127·R − 0.22475541·TF·R − 0.00683783·TF² − 0.05481717·R² + 0.00122874·TF²·R + 0.00085282·TF·R² − 0.00000199·TF²·R²`
  接著依序檢查調整（至多一項成立）：
  - 低濕調整：若 R < 13 且 80 ≤ TF ≤ 112，`HI −= ((13−R)/4)·√((17−|TF−95|)/17)`。
  - 高濕調整：若 R > 85 且 80 ≤ TF ≤ 87，`HI += ((R−85)/10)·((87−TF)/5)`。
  最後換算回 °C：`HI_C = (HI−32)·5/9`。
  釘版說明：本工具定義域要求 RH ≥ 40，低濕調整（R < 13）在定義域內永不觸發，仍寫入公式定義以保持與 NWS 原文一致；高濕調整在 RH > 85 且 80 ≤ TF ≤ 87（即約 27–30.5 °C）時可觸發。NWS 程序在迴歸前另有 Steadman 簡式預檢（簡式與氣溫的平均 < 80 °F 時改用簡式）；該平均在定義域內對 TF 與 R 皆單調遞增，最小值出現在定義域角落 TF=80.6、R=40，平均為 80.42 ≥ 80，因此在定義域內預檢恆選擇迴歸分支，本工具不實作簡式，此省略不改變任何定義域內的結果（推導見 AUTHOR-CHECK.md）。
- actual：體感即 T 本身，不做任何調整。

捨入釘版：`r(x) = floor(x·10 + 0.5) / 10`（四捨五入至 1 位小數，恰 0.05 的 tie 往正無限大方向），只在輸出時套用一次。`feelsLikeC = r(未捨入體感)`；`deltaC = r(未捨入體感 − T)`，actual 時未捨入體感即 T，故 deltaC 恆 0（JSON 表示為 0）。不做任何夾擠（clamp）：熱指數在定義域角落（27 °C、RH 40%）的迴歸值可略低於氣溫（feelsLikeC 26.9、deltaC −0.1），照公式回報並於 FAQ 說明；風寒在定義域內恆低於氣溫、熱指數在其餘定義域內高於氣溫，皆為公式性質，不另驗證或修正。

結果 `{model, feelsLikeC, deltaC}`：model 為 `wind-chill`、`heat-index`、`actual` 三者之一；feelsLikeC 與 deltaC 為 JSON 數字（1 位小數）。機器值不隨 locale 改。

固定下載 `feels-like-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/feels-like-temperature/`。src/core.mjs 放純驗證、模型選擇、公式與格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 核心只用 `Math.pow`／`Math.sqrt` 與雙精度浮點，不讀系統時間、時區、locale 或亂數；同一輸入在任何主機恆得同一輸出。冪次 `v^0.16` 以 `Math.pow(v, 0.16)` 計算（v > 4.8 > 0，無定義域問題）；熱指數的平方項以乘法展開或 `Math.pow(x, 2)` 皆可，結果差異在雙精度捨入內，由輸出端 1 位小數捨入吸收——但實作須擇一固定並以 fixtures 逐字驗證。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算體感溫度」，畫面和完整報告符合核心 fixtures（含三種 model 各至少一例），使用者取得對應產物。 |
| boundaries | 定義域邊界證據：T=10.0 入風寒、v=4.8 不入風寒、T=27.0＋RH=40 入熱指數、RH=39 與 T=26.9 不入熱指數、高濕調整觸發例，以及合法端點與第一個錯誤。 |
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
| `wc-classic` | 風寒經典例：−15 °C、20 km/h → −24.2 °C |
| `wc-boundary-temp` | 氣溫恰 10.0 °C 入風寒（≤ 語義） |
| `wc-wind-threshold` | 風速恰 4.8 km/h 不入風寒（嚴格 > 語義）→ actual |
| `wc-extreme` | −30 °C、50 km/h 的強風寒 |
| `wc-zero` | 0 °C、20 km/h 的風寒 |
| `hi-classic` | 熱指數經典例：30 °C、RH 70% → 35.0 °C |
| `hi-high-rh-adjustment` | RH 90%、82.4 °F 觸發高濕調整（+0.46 °F） |
| `hi-corner` | 定義域角落 27 °C、RH 40%：迴歸值略低於氣溫，不夾擠 |
| `hi-hot` | 40 °C、RH 60% 的高熱指數 |
| `hi-below-rh` | RH 39% 差 1% 不入熱指數 → actual |
| `hi-below-temp` | 26.9 °C 差 0.1 度不入熱指數 → actual |
| `mild-actual` | 20 °C 溫和天氣 → actual |
| `cold-calm-actual` | −5 °C 但風速 3 km/h 未達門檻 → actual |
| `err-temperature-range` | 氣溫 61 超出範圍 → RANGE |
| `err-humidity-format` | 濕度非數字 → DECIMAL_FORMAT |
| `err-wind-empty` | 風速空白 → EMPTY |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限（−60、60、風速 0 與 300、濕度 0 與 100）、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 v=4.8 與 4.9 的模型差異、T=10.0 與 10.1 的模型差異、RH=85（不調整）與 86（調整）的熱指數連續性，以及所有 wind-chill 結果 < 氣溫、actual 結果 deltaC 恆 0 兩條不變量。

候選 gate（均 NOT_RUN）

- 於 `tools/feels-like-temperature/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「體感溫度計算」，title「體感溫度計算｜Gloss Tools」，description「輸入氣溫、風速與相對濕度，依官方定義域自動選用風寒或熱指數模型，算出體感溫度；兩者皆不適用時回報實際氣溫。」。英文 lang=en，H1 “Feels-Like Temperature Calculator”，title “Feels-Like Temperature Calculator | Gloss Tools”，description “Enter air temperature, wind speed and relative humidity; the tool applies the wind-chill or heat-index model by its official validity domain, or reports the actual temperature when neither applies.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。兩個模型都不適用時會怎樣？回報實際氣溫並標示超出兩模型定義域，不做任何調整。 / What happens when neither model applies? The tool reports the actual temperature, flagged as outside both model domains, with no adjustment.
- FAQ。風寒的風速門檻為何是 4.8 km/h？那是 NWS 與加拿大環境部公式的官方定義域下限（3 mph）；公式假設風速在 10 公尺高度測量。 / Why is the wind-chill threshold 4.8 km/h? It is the official lower bound of the NWS / Environment Canada formula domain (3 mph); the formula assumes wind measured at 10 m height.
- FAQ。熱指數在定義域邊緣為何可能略低於氣溫？Rothfusz 迴歸在 27 °C、濕度 40% 附近的擬合值可略低於氣溫（約 −0.1 °C），本工具照公式回報、不做夾擠。 / Why can the heat index read slightly below the air temperature near its domain edge? The Rothfusz regression fit near 27 °C and 40% humidity can land about 0.1 °C below the air temperature; the tool reports the formula value and never clamps it.
- FAQ。為什麼不用澳洲的 apparent temperature？本工具只採用風寒與熱指數兩個北美官方模型，避免同一輸入出現兩個不同的體感數字。 / Why is the Australian apparent temperature not offered? This tool uses only the two North American official models, so one input never yields two competing feels-like numbers.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://feels-like-temperature.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/feels-like-temperature/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

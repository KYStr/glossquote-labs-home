# 坪數換算 / Ping Area Converter

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-ping-area-converter-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者在看房、裝潢估價或比對日本房源時，手上的面積數字混用坪、平方公尺、平方英尺與畳，想一次得到四個單位的精確換算，而不是用 3.3、0.3 之類的湊算係數——湊算在 30 坪級距就會差出近 0.2 m²，足以誤判家具與報價。

- 桌面。租屋或買房者在電腦上把權狀的平方公尺換成坪、或把仲介說的坪數換成平方公尺與平方英尺，逐項核對。
- 行動。看房現場在手機上把口頭坪數換成平方公尺，或把日本房源的畳數換成坪，心裡有底再談。

使用情境為日常估算。資料只保留在目前頁面草稿；換算結果不是登記或簽約依據（見 tests 的 FAQ 釘版）。

## scope

MVP 必做：單一數量＋單位輸入，以精確有理數換算坪／m²／ft²／畳四個輸出（畳為標示概略的次要單位）；1–100 坪固定速查表；固定報告下載。

非目標：房價或租金計算、公設比與權狀拆分、長×寬量測輸入、多房間或多筆加總、單位以外的面積制（甲、公頃、英畝）、把結果當登記／簽約／廣告標示依據、線上匯率或行情資料。

已比對本 repo 既有預案，最相近者的實質差異如下。

- 冷氣噸數計算（ac-capacity-calculator，[規格 PR #154](https://github.com/KYStr/glossquote-labs-home/pull/154)）把坪當作估冷房能力的面積輸入之一，輸出是冷房能力；此處只做面積單位換算本身，四個單位互為輸入與輸出。
- 油漆用量、壁紙用量類預案把面積當中間量估材料；此處不估任何材料或費用，輸出止於面積。

常數由本文定義並於下節給出來源；無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「數量 / Amount」
- 欄位或說明「單位 / Unit」選項依序為「坪 / Ping」、「平方公尺 / Square metres (m²)」、「平方英尺 / Square feet (ft²)」、「畳 / Tatami」
- 「換算 / Convert」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「換算結果 / Converted area」先摘要再列細節：四列依序坪、m²、ft²、畳，每列固定小數位並補零顯示（如 `30.00`、`61.2`），不加千分位分隔符。畳列與單位選項的畳一律附標示「畳（概略，1 畳 = 1.62 m² 廣告慣例）/ Tatami (approximate; 1 tatami = 1.62 m² advertising convention)」。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 結果下方常駐「常見坪數速查表 / Quick table (ping → m² / ft²)」：1–100 坪共 100 列，內容與輸入無關、兩語頁數字相同（僅表頭語言不同），置於有 label 的可捲動區域。速查表不進報告。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。速查表照常顯示。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。四個輸出與速查表可見。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"amount":"","unit":"ping"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。另有純函式 `buildQuickTable()` 回傳速查表（見第 5 點），同樣不碰 DOM／網路／storage。

欄位順序固定為 amount、unit；先完整驗完 amount 才驗 unit。

1. `amount`：ASCII 十進字串。文法：整數部為 `0` 或非零開頭的數字串，可帶小數部 `.` 加 1–3 位數字；無正負號、空白、千分位、指數。raw 最多 12 個 UTF-16 code units。數值範圍：> 0 且 ≤ 1,000,000（以輸入單位計）。
2. `unit`：字串代碼，恰為 `ping`、`m2`、`ft2`、`tatami` 之一。raw 最多 6 個 UTF-16 code units。
3. 預設 `{"amount":"","unit":"ping"}`。範例為 fixtures 第一個案例的 input。

逐欄檢查順序固定：容量 INPUT_LIMIT → 未成對 surrogate UNICODE → 空 EMPTY → 文法或列舉 → 範圍。amount 的文法錯誤為 DECIMAL_FORMAT、範圍為 RANGE；unit 的列舉錯誤為 ENUM。整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆為 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

換算常數（精確值，全部以分數運算，不先取近似小數）：

| 換算 | 精確值 | 依據 |
| --- | --- | --- |
| 1 坪 → m² | 400/121（≈ 3.3057851240） | 1 尺 = 10/33 m（度量衡法傳統定義），1 坪為邊長 6 尺的正方形：(6×10/33)² = 400/121 |
| 1 m² → 坪 | 121/400 = 0.3025（整數） | 上行之倒數；政府換算（如財政部稅務入口網）亦用 0.3025 |
| 1 ft² → m² | 145161/1562500（= 0.09290304，整數） | 1 ft = 0.3048 m（國際英尺，精確定義）平方 |
| 1 畳 → m² | 81/50（= 1.62，慣例值） | 日本「不動産の表示に関する公正競争規約施行規則」以 1 畳 = 1.62 m² 為房源廣告的畳數表示慣例（該值在規約中是每畳下限）；實物畳因地區而異：京間 191×95.5 cm ≈ 1.824 m²、中京間 182×91 cm ≈ 1.656 m²、江戸間 176×88 cm ≈ 1.549 m²、団地間 170×85 cm ≈ 1.445 m²。故畳恆標示為概略 |

計算與輸出語義：

4. 把 amount 解析為精確分數 A（十進字串 → 整數／10^k）。以輸入單位的「→ m²」係數得精確 m² 值 F：ping 乘 400/121、m2 乘 1、ft2 乘 145161/1562500、tatami 乘 81/50。
5. 四個輸出各自由 F 以精確分數算出，只在最後一步各自四捨五入一次（round-half-up：`floor(x × 10^dp + 1/2)`，x ≥ 0）：ping = F × 121/400（2 位）、m2 = F（2 位）、ft2 = F × 1562500/145161（2 位）、tatami = F × 50/81（1 位）。輸入單位自己的輸出也照樣四捨五入（如輸入 1.701 m²，m2 輸出為 1.7）。result 為 `{ping, m2, ft2, tatami}`，值為等於該精確十進位值的 JSON 數字。面積小到四捨五入後為 0 是合法結果（如 0.001 坪的 ping 與 m2 皆為 0），不另報錯。畫面顯示補零至固定位數且不加千分位；機器值不隨 locale 改。
6. 速查表：`buildQuickTable()` 回 `{rows}`，rows 為坪 1–100 的 `{ping, m2, ft2}`，m2／ft2 依同一常數與同一 half-up 2 位規則由精確分數算出。全 100 列字面值釘在 fixtures 的 `quick-table-1-100`。

固定下載 `ping-area-report.json`。內容為 `{input, result}`（input 為本次快照的 amount／unit 原字串，result 為 run 的 result）的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON；數字以最短來回（shortest round-trip）十進表示序列化。速查表不進報告。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。

本地化錯誤訊息（field 另行標示）：

| code | 繁中 | English |
| --- | --- | --- |
| SCHEMA | 輸入格式不正確 | The input shape is not valid. |
| INPUT_LIMIT | 輸入太長 | The input is too long. |
| UNICODE | 輸入含有無效字元 | The input contains an invalid character. |
| EMPTY | 此欄必填 | This field is required. |
| DECIMAL_FORMAT | 請輸入最多三位小數的數字 | Enter a number with at most three decimal places. |
| RANGE | 數值須大於 0 且不超過 1,000,000 | The value must be greater than 0 and at most 1,000,000. |
| ENUM | 請選擇單位 | Choose a unit. |
| OUTPUT_LIMIT | 報告超過大小上限 | The report exceeds the size limit. |
| INTERNAL／WORKER_ERROR | 處理失敗，請重試 | Something went wrong. Try again. |

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/ping-area-converter/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 精確運算：核心以 BigInt 分子／分母表示分數；amount 字串直接拆成整數與 10^k，不經 Number 解析小數。四捨五入以整數算術完成 `floor((2·n·10^dp + d) / (2d))`（n/d ≥ 0），結果數字再以十進字串組出，避免二進浮點誤差改動進位（0.605 類 tie 必須進位，見 fixtures）。換算使用表列精確分數。0.3025 是 121/400 的精確有限小數。坪轉平方公尺採 400/121，避免以 3.3058 近似。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「換算」，畫面和完整報告符合核心 fixtures（含兩個 half-up tie 案例），速查表 100 列符合 table fixture，使用者取得對應產物。 |
| boundaries | 合法端點（0.001、1,000,000）、剛好越界（0、1000000.001）、第一個錯誤、欄位順序與三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；畳概略標示在兩語皆可見。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。24 個字面核心案例、1 個 table 案例（速查表全 100 列）與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `example-thirty-ping` | 範例：30 坪 → 99.17 m²／1067.5 ft²／61.2 畳 |
| `hundred-ping-precision` | PING-01：100 坪 → 330.58 m²／3558.32 ft²／204.1 畳，ft² 與 3.3058 近似值的 3558.33 不同 |
| `one-ping` | 1 坪基準 400/121 m² |
| `hundred-m2` | 100 m² → 坪恰 30.25 |
| `thousand-ft2` | 1000 ft² → 92.9 m²／28.1 坪 |
| `ten-tatami` | 10 畳以 1.62 慣例值換算 |
| `half-ping` | 0.5 坪小數輸入 |
| `max-ft2` | 上限 1,000,000 ft² 大數輸出 |
| `tie-tatami-half-up` | 畳數恰 1.05 → half-up 1.1（排除銀行家捨入） |
| `tie-ping-half-up` | 坪數恰 0.605 → half-up 0.61 |
| `min-amount-rounds-to-zero` | 最小輸入 0.001 坪，部分輸出捨入為 0 |
| `error-empty-amount` | amount 空 → EMPTY |
| `error-decimal-places` | 小數第 4 位 → DECIMAL_FORMAT |
| `error-leading-zero` | 前導零 → DECIMAL_FORMAT |
| `error-grouped` | 千分位逗號 → DECIMAL_FORMAT |
| `error-zero` | 0 → RANGE |
| `error-over-max` | 1000000.001 → RANGE |
| `error-input-limit` | raw 13 單位 → INPUT_LIMIT（先於文法） |
| `error-unicode` | 未成對 surrogate → UNICODE |
| `error-field-order` | 兩欄同錯先報 amount |
| `error-unit-enum` | 未知單位 → ENUM |
| `error-unit-empty` | unit 空 → EMPTY |
| `error-schema-missing` | 缺欄 → SCHEMA |
| `error-schema-type` | 錯型別 → SCHEMA |
| `quick-table-1-100` | 速查表 1–100 坪全列字面比對 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 tie 值 0.605／1.05 的進位方向、用 `hundred-ping-precision` 驗證 100 坪以 400/121 換算為 3558.32 ft²，將該係數替換為 3.3058 再按同一規則四捨五入得 3558.33 ft²。另驗畳概略標示、速查表第 30 列與 `example-thirty-ping` 及第 100 列與 `hundred-ping-precision` 的 m2／ft2 一致。

報告字面釘版：example-thirty-ping 的報告 bytes 為 `{"input":{"amount":"30","unit":"ping"},"result":{"ft2":1067.5,"m2":99.17,"ping":30,"tatami":61.2}}` 加一個 LF，共 99 bytes，SHA-256 `2363e57e7570dae35a9830eaa3d86b003ca73be825cabeebd297d24f3f14dc20`。

候選 gate（均 NOT_RUN）

- 於 `tools/ping-area-converter/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「坪數換算」，title「坪數換算｜Gloss Tools」，description「在坪、平方公尺、平方英尺與畳之間換算：精確有理數運算、只在最後一步四捨五入，附 1–100 坪固定速查表；畳採 1.62 m² 廣告慣例值，為概略換算。」。英文 lang=en，H1 “Ping Area Converter”，title “Ping Area Converter | Gloss Tools”，description “Convert between ping, square metres, square feet and tatami with exact rational arithmetic and a single final rounding, plus a fixed 1–100 ping quick table; tatami uses the approximate 1.62 m² advertising convention.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。為什麼 1 坪大約是 2 畳，畳卻寫 1.62 m²？畳的實際尺寸因地區而異（京間約 1.824 m²、江戸間約 1.549 m²）；本工具的畳採日本不動產廣告慣例 1 畳 = 1.62 m²，是概略換算，1 坪 = 400/121 m² ÷ 1.62 ≈ 2.04 畳。 / Why is 1 ping about 2 tatami when 1 tatami is 1.62 m²? Physical tatami sizes vary by region (Kyoma ≈ 1.824 m², Edoma ≈ 1.549 m²); this tool uses the Japanese real-estate advertising convention 1 tatami = 1.62 m² as an approximate conversion, and 1 ping = 400/121 m² ÷ 1.62 ≈ 2.04 tatami.
- FAQ。結果可以拿去簽約或登記嗎？不可以。建物登記以平方公尺為準，坪是民間慣用單位；本工具只供日常估算，正式文件請以權狀或謄本的平方公尺為準。 / Can I use the result in a contract or registration? No. Registered areas are recorded in square metres and ping is a customary unit; this tool is for everyday estimates only — use the square metres on the official title for formal documents.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://ping-area-converter.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/ping-area-converter/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

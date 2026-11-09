# 露點計算機 / Dew Point Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-dew-point-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

手上有氣溫和相對濕度的人想知道空氣實際有多潮濕、冷表面會不會結露。露點是空氣含水量的直接量度：表面溫度降到露點以下就結露。相對濕度單獨看會誤導——同樣 70%，在 15 °C 和 30 °C 的含水量差很多；露點和絕對濕度把含水量本身算出來，再對照舒適度分級判斷體感。

- 桌面。室內看著溫濕度計或除濕機面板，輸入氣溫與相對濕度，確認露點離目前室溫多遠、冷氣出風口或窗面會不會結露。
- 行動。出門或運動前看天氣 App 的氣溫與相對濕度，查露點判斷今天是乾爽還是悶熱，不啟動任何感測或連線。

使用情境為一般生活判斷。資料只保留在目前頁面草稿。

## scope

MVP 必做：單次計算，輸入氣溫（°C）與相對濕度（%），輸出露點溫度（°C，1 位小數）、絕對濕度（g/m³，1 位小數）與舒適度分級（7 級，依釘版門檻表）。公式為 Magnus 水面公式，常數釘版 a = 17.27、b = 237.7 °C、es(0 °C) = 6.112 hPa（Magnus–Tetens 形式，見 Lawrence 2005 與 WMO 慣用形式；公開來源標示此常數組在 −45…60 °C 約 ±0.4 °C）。氣溫接受 −50…60 °C；−45 °C 以下屬公式外推，精度聲明不涵蓋。

非目標：霜點（0 °C 以下仍全程用水面公式，得到的是過冷水露點，不是霜點，頁面與 FAQ 明示）；氣壓／海拔修正；濕球溫度、焓、熱指數、風寒；即時天氣或感測器資料；°F 或其他單位輸入；把舒適度分級當醫療建議或把結露判斷當建築防潮認證。

已比對本 repo `docs/specs/` 全部既有規格與 registry 規格 ID，無露點／濕度工具，無重複。與相近概念的差異：體感溫度類工具用風寒／熱指數模型，需要風速且公式與定義域完全不同；本工具只用氣溫與相對濕度算露點與絕對濕度，輸入與輸出不重疊。

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，舒適度分級表與公式說明用一層 disclosure 或靜態內容呈現。

- 欄位或說明「氣溫（°C）/ Air temperature (°C)」
- 欄位或說明「相對濕度（%）/ Relative humidity (%)」
- 「計算露點 / Calculate dew point」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「露點、絕對濕度與舒適度 / Dew point, absolute humidity and comfort」先摘要再列細節：露點大字、絕對濕度、分級以文字標籤呈現（不只靠顏色）。成功才顯示「下載報告 / Download report」。文字可手動選取。靜態揭露句：「舒適度分級為氣象慣用經驗分級，非醫療或建築規範。/ The comfort bands are a meteorological rule of thumb, not a medical or building standard.」

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果含露點、絕對濕度與分級標籤。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"temperature":"25","relativeHumidity":"60"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

- 欄位順序固定：`temperature`、`relativeHumidity`，皆為十進位字串。文法：可選前綴 `-`、至少一位數字、可選 `.` 加至少一位小數；無 `+`、空白、指數、千分位符號。前導零允許（`"007"` = 7）。raw 每欄最多 8 個 UTF-16 code units。
- 範圍：temperature −50…60（含端點，°C）；relativeHumidity 0 < RH ≤ 100（%）。預設 temperature `25`、relativeHumidity `60`。
- 逐欄驗證順序固定：容量 INPUT_LIMIT → 不成對 surrogate UNICODE → 缺內容 EMPTY → 文法 DECIMAL_FORMAT → 範圍 RANGE；先 temperature 後 relativeHumidity，第一個失敗即回 `{ok:false,error:{code,field,row}}`，row 恆 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。
- ln 定義域守衛：RH ≤ 0 在 RANGE 步驟即被拒；兩個欄位都通過驗證後才開始計算，`ln` 永遠不會對非正數求值。分母守衛：γ ≤ aT/(b+T) < a 恆成立（RH ≤ 100），故 a − γ > 0，不會除以零。
- 計算（釘版，IEEE-754 double、`Math.log`／`Math.exp`，中間不捨入）：
  - 常數 a = 17.27、b = 237.7、es0 = 6.112 hPa、絕對濕度常數 216.7（由水氣氣體常數 Rv = 461.5 J/(kg·K) 導出：10⁵/461.5 ≈ 216.7 g·K/(m³·hPa)）。
  - γ = ln(RH/100) + aT/(b+T)
  - 露點 Td = bγ/(a − γ)（°C）
  - 飽和水氣壓 es = 6.112 × exp(aT/(b+T))（hPa）；實際水氣壓 e = es × RH/100（hPa）
  - 絕對濕度 AH = 216.7 × e/(273.15 + T)（g/m³），與露點共用同一組釘版 es，不混用其他常數組的公式。
- 捨入（釘版）：每個輸出只在最後捨入一次，r(x) = floor(x × 10 + 0.5)/10（1 位小數，含負數同規則）。套用到 dewPointC 與 absoluteHumidityGm3。
- RH = 100 恆等：ln(1) = 0 使 Td 在精確算術下恰等於 T（fixtures `saturated-exact`、`endpoint-hot-saturated` 釘版此行為，捨入後露點即氣溫）。
- 舒適度分級（釘版）：依**捨入後**的 dewPointC 查表，下限含、上限不含；分級表彙整自公開氣象舒適分級（門檻 10/13/16/18/21/24 在多個公開來源一致），逐字釘版如下，不隨版本漂移。

| 分級 ID | 露點（°C） | 繁中標籤 | English label |
| --- | --- | --- | --- |
| `dry` | < 10 | 乾燥 | Dry |
| `comfortable` | 10 ≤ Td < 13 | 舒適 | Comfortable |
| `mostly-comfortable` | 13 ≤ Td < 16 | 大致舒適 | Mostly comfortable |
| `slightly-humid` | 16 ≤ Td < 18 | 略感潮濕 | Slightly humid |
| `humid` | 18 ≤ Td < 21 | 潮濕悶熱 | Humid |
| `oppressive` | 21 ≤ Td < 24 | 非常悶熱 | Oppressive |
| `extremely-oppressive` | ≥ 24 | 極度悶熱 | Extremely oppressive |

- 結果 `{dewPointC, absoluteHumidityGm3, comfortBand}`。數值為 1 位小數的 JSON number（20.0 序列化為 20）；comfortBand 為上表 ID 字串。機器值不隨 locale 改。
- 固定下載 `dew-point-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/dew-point-calculator/`。src/core.mjs 放純驗證、推導、格式化；常數（a、b、es0、216.7）與分級表為核心內的字面資料並註明來源。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。核心不讀 Date、不讀主機時區、不讀 locale，同輸入在任何環境同輸出。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算露點」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、分級邊界（捨入後值查表）和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。19 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `typical-room` | 一般室內，範例與預設輸入 |
| `saturated-exact` | RH 100%，露點恰等於氣溫 |
| `comfortable-room` | 舒適級（10–13） |
| `mostly-comfortable` | 大致舒適級（13–16） |
| `humid-evening` | 潮濕悶熱級（18–21） |
| `summer-oppressive` | 非常悶熱級（21–24） |
| `hot-extremely-oppressive` | 極度悶熱級（≥24） |
| `dry-winter` | 低溫低濕，露點為負 |
| `freezing-fog` | 0 °C 以下，水面公式照算 |
| `desert-dry` | 高溫極低濕 |
| `band-edge-rounded` | 未捨入露點 12.95… 捨入為 13.0，分級依捨入後值跨級 |
| `endpoint-hot-saturated` | 氣溫上限 60 °C 且飽和，露點恰等於氣溫 |
| `endpoint-cold` | 氣溫下限 −50 °C，絕對濕度捨入為 0.0 |
| `rh-zero` | RH = 0，RANGE（ln 定義域守衛，不進計算） |
| `rh-over-100` | RH = 100.1，RANGE |
| `temp-over-range` | 氣溫 61 °C，RANGE |
| `temp-format` | 氣溫 `25..5`，DECIMAL_FORMAT |
| `rh-empty` | RH 空字串，EMPTY |
| `temp-input-limit` | 氣溫 9 字元，INPUT_LIMIT（先於文法） |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。性質檢查：任何合法輸入 Td ≤ T，等號 iff RH = 100；固定 T 時 Td 與 AH 隨 RH 嚴格遞增；分級函數在捨入後值 9.9/10.0、12.9/13.0、15.9/16.0、17.9/18.0、20.9/21.0、23.9/24.0 的跨級正確；驗證順序（INPUT_LIMIT 先於 DECIMAL_FORMAT、欄位順序 temperature 先於 relativeHumidity）。

候選 gate（均 NOT_RUN）

- 於 `tools/dew-point-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「露點計算機」，title「露點計算機｜Gloss Tools」，description「輸入氣溫與相對濕度，用 Magnus 公式算出露點溫度、絕對濕度（g/m³）與舒適度分級。」。英文 lang=en，H1 “Dew Point Calculator”，title “Dew Point Calculator | Gloss Tools”，description “Calculate the dew point, absolute humidity and comfort band from air temperature and relative humidity with the Magnus formula.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。相對濕度 100% 時露點等於氣溫嗎？是，本工具釘版公式在 RH = 100% 時露點恰等於氣溫。 / Does the dew point equal the air temperature at 100% RH? Yes — with the pinned formula the two are exactly equal at 100% RH.
- FAQ。0 °C 以下算的是霜點嗎？不是，本工具全程用水面 Magnus 公式，0 °C 以下得到的是過冷水露點，不是霜點。 / Is the below-zero result a frost point? No — the over-water Magnus form is used throughout, so below 0 °C the result is the dew point over supercooled water, not the frost point.
- FAQ。露點和相對濕度差在哪？露點直接表示空氣含水量；相對濕度還取決於氣溫，同樣 70% 在不同氣溫下含水量差很多。 / How does dew point differ from relative humidity? The dew point measures the actual water content of the air; relative humidity also depends on temperature, so the same 70% can mean very different amounts of water.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://dew-point-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/dew-point-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

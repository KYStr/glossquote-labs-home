# 蛋白質攝取量計算機 / Protein Intake Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-protein-intake-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

依體重與活動目標，用一張固定 g/kg 係數表算出每日蛋白質目標、合理區間與每餐分配，讓使用者不必在互相矛盾的網路說法之間猜。

- 桌面。備餐前在電腦上輸入體重、選目標，核對每日克數與每餐分配，再下載報告存檔。
- 行動。健身房或超市裡用手機快速重算，改成四餐看每餐要吃多少。

使用情境為一般營養資訊估算，不是醫療建議。資料只保留在目前頁面草稿。

## scope

固定係數表、單一體重輸入、整數克數輸出的估算模型。非目標為醫療建議／診斷、依疾病（腎臟病等）、懷孕、年齡或性別調整、食物資料庫、菜單或食譜建議、熱量／TDEE／其他營養素計算、體重與攝取紀錄、提醒或帳號功能。

已比對既有規格與工具，最相近者的實質差異如下。

- 飲水量同樣以體重每公斤換算，但輸出的是每日飲水毫升區間，模型含活動與氣候加算，且只給區間不給單一目標。此處是蛋白質克數：固定目標係數表、目標值 ±0.2 g/kg 區間、再按 3／4 餐分配且合計須等於目標。[spec-water-intake-calculator](https://github.com/KYStr/glossquote-labs-home/blob/d1cbb3d5aa335df1155e1b0b4544c5778bba2e3c/docs/specs/water-intake-calculator/SPEC.md)
- BMI／TDEE 工具由身高、體重、年齡、性別算能量消耗與身體質量指數；此處不算熱量，只把使用者選定的蛋白質係數乘上體重。

判定規則由本文定義，無線上資料或外部服務依賴。係數表為一般營養資訊的常用區間（久坐約 0.8 g/kg 為成人建議攝取量基準，運動與減脂情境逐級提高），由本文固定，不即時查證外部來源。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「體重（公斤）/ Body weight (kg)」
- 欄位或說明「目標／活動程度 / Goal / activity level」，六個固定選項加「自訂係數 / Custom factor」；選自訂時才啟用「自訂係數（g/kg）/ Custom factor (g/kg)」欄位。
- 欄位或說明「每日餐數 / Meals per day」：3 餐或 4 餐。
- 「計算每日蛋白質 / Calculate daily protein」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「每日目標與每餐分配 / Daily target and per-meal split」先摘要（每日目標克數與區間）再列每餐克數。每餐克數以有 label 的清單或表格呈現，順序即餐次順序。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 結果區固定緊鄰顯示一般營養資訊聲明（原文見 tests 節），不可摺疊隱藏。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果含每日目標、區間、每餐分配與營養資訊聲明。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"weight":"70","goal":"general","customFactor":"","meals":"3"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field=null，row 一律 null（本工具無列）。JSON fixture 即介面。欄位值以 DOM 的字串值為準。

固定欄位與文法。

- `weight`：ASCII 十進數字串，整數部為 `0` 或非零開頭，可帶一位小數（正則 `^(0|[1-9][0-9]*)(\.[0-9])?$`），無空白／符號／指數。raw 最多 8 個 UTF-16 code units。數值範圍 20.0–300.0 公斤（含端點）。
- `goal`：下列固定代碼之一。`custom` 以外代碼對應固定係數（g/kg，恰一位小數）。

| 代碼 | 繁中標籤 | English label | 係數 |
| --- | --- | --- | --- |
| `sedentary` | 久坐 | Sedentary | 0.8 |
| `general` | 一般活動 | General activity | 1.0 |
| `regular-exercise` | 規律運動 | Regular exercise | 1.2 |
| `strength-training` | 肌力訓練 | Strength training | 1.6 |
| `high-intensity` | 高強度／備賽 | High intensity / competition prep | 2.0 |
| `fat-loss` | 減脂保肌 | Fat loss, keep muscle | 2.2 |
| `custom` | 自訂係數 | Custom factor | 見 customFactor |

- `customFactor`：文法同 weight（一位小數），範圍 0.1–4.0 g/kg（含端點）。僅在 `goal` 為 `custom` 時驗證其值；其餘情況只做 SCHEMA 型別檢查，值不驗證、不參與計算（介面應停用該欄並在切換時保留已輸入值）。
- `meals`：字串 `"3"` 或 `"4"`。

驗證順序固定。先整體 SCHEMA，再依 weight、goal、customFactor（僅 custom 時）、meals 逐欄驗證；欄內順序為容量 INPUT_LIMIT、未成對 surrogate UNICODE、缺內容 EMPTY（raw 為空字串）、文法 DECIMAL_FORMAT（weight／customFactor）或代碼 ENUM（goal／meals）、範圍 RANGE。整份失敗回 `{ok:false,error:{code,field,row:null}}`，field 為欄位名或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算（整數算術，無浮點）。以 0.1 為單位取整數：W10 = 體重 × 10，F10 = 係數 × 10（皆由文法保證為整數）。定義 `grams(x10) = floor((W10 × x10 + 50) / 100)`，即對未捨入乘積做四捨五入（round half-up）到整數克，全程只此一步捨入。

1. 每日目標 `dailyGrams = grams(F10)`。
2. 區間由未捨入乘積各自獨立計算，不由 dailyGrams 加減推導：下限係數 `max(F10 − 2, 0)`，上限係數 `F10 + 2`（即 ±0.2 g/kg）；`lowGrams = grams(max(F10 − 2, 0))`，`highGrams = grams(F10 + 2)`。自訂係數 0.1 時下限係數夾至 0、lowGrams 為 0。因捨入單調，恆有 lowGrams ≤ dailyGrams ≤ highGrams。
3. 每餐分配只作用於 dailyGrams：`base = floor(dailyGrams / meals)`，`r = dailyGrams − base × meals`（0 ≤ r < meals）；前 r 餐各 `base + 1` 克，其餘各 `base` 克。`perMealGrams` 長度等於 meals，各餐合計恆等於 dailyGrams。
4. 結果 `{factor, dailyGrams, lowGrams, highGrams, meals, perMealGrams}`。`factor` 為正規化字串，恰一位小數（如 `"1.0"`、`"2.2"`；自訂輸入 `"2"` 輸出 `"2.0"`）。`meals` 為數字 3 或 4。其餘皆為整數克。機器值不隨 locale 改，不加千分位。

固定下載 `protein-intake-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/protein-intake-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算每日蛋白質」，畫面和完整報告符合核心 fixtures，使用者取得對應產物，營養資訊聲明緊鄰結果。 |
| boundaries | 合法端點（體重 20.0／300.0、自訂係數 0.1／4.0）、剛好越界、第一個錯誤、驗證順序和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作，自訂係數欄啟用／停用正確。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。9 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `strength-example` | 肌力訓練係數 1.6、四餐均分（範例／首案） |
| `sedentary-remainder` | 久坐 0.8、三餐分配餘 1，前一餐 +1 |
| `custom-factor-remainder` | 自訂係數 1.9、未捨入乘積四捨五入、四餐餘 1 |
| `fat-loss-half-up` | 減脂保肌 2.2，乘積恰 .5 時 half-up 進位 |
| `min-weight-boundary` | 體重下限 20 公斤、三餐餘 2 |
| `weight-over-range` | 體重 300.1 超上限回 RANGE |
| `weight-two-decimals` | 體重兩位小數回 DECIMAL_FORMAT |
| `custom-factor-missing` | 選自訂但係數空白回 EMPTY |
| `meals-invalid` | 餐數 5 回 ENUM |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限（體重 300.0、自訂係數 4.0 與 0.1，含下限係數夾至 0）、剛好超限（300.1、4.1、0.0 係數）、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 lowGrams ≤ dailyGrams ≤ highGrams、每餐合計等於 dailyGrams、自訂係數正規化（`"2"` → `"2.0"`）、非 custom 時 customFactor 任意字串不影響結果。

候選 gate（均 NOT_RUN）

- 於 `tools/protein-intake-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「蛋白質攝取量計算機」，title「蛋白質攝取量計算機｜Gloss Tools」，description「依體重與活動目標，用固定的 g/kg 係數表算出每日蛋白質目標、±0.2 區間與每餐分配。」。英文 lang=en，H1 “Protein Intake Calculator”，title “Protein Intake Calculator | Gloss Tools”，description “Estimate daily protein grams from body weight and an activity goal using pinned g/kg factors, with a ±0.2 range and per-meal splits.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- 一般營養資訊聲明（固定原文，兩頁與結果區皆須出現）。繁中：「本工具提供一般營養資訊，非醫療建議；如有腎臟疾病、懷孕或其他健康狀況，請先諮詢醫師或營養師。」英文：“This tool provides general nutrition information, not medical advice. If you have kidney disease, are pregnant, or have other health conditions, consult a physician or dietitian first.”
- FAQ。區間怎麼來的？每日目標是體重乘上所選係數，區間是係數上下各 0.2 g/kg 分別計算的結果。 / Where does the range come from? The daily target is body weight times the chosen factor; the range recomputes at the factor minus and plus 0.2 g/kg.
- FAQ。每餐克數怎麼分？每日目標平均分到各餐，除不盡的餘數依序加到前面的餐次，所以每餐合計剛好等於每日目標。 / How are meals split? The daily target is divided evenly; any remainder is added one gram at a time to the earliest meals, so the meals always sum to the daily target.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://protein-intake-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

規格任務 `labs-protein-intake-calculator-spec-20261109`（由主代理登記，本文作者不執行 registry 操作）。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/protein-intake-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

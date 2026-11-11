# 酒精濃度估算 / BAC Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-bac-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

聚餐或應酬後，使用者手上有酒單或記憶中的杯數，想先自行推估：以 Widmark 公式，自己目前的血液酒精濃度大約是多少、落在台灣酒駕法定門檻的哪一個區間、估計還要多久才代謝到行政門檻以下與歸零。

- 桌面。桌面輸入性別、體重、多杯飲料與經過時間，立即看到推估濃度與法定區間對照。
- 行動。手機在餐桌旁快速核對一到兩杯的量，不連線、不登入、不留下紀錄。

使用情境為設計假設。資料只保留在目前頁面草稿。本工具不是檢測儀器：推估值不得作為能否駕駛的判斷依據，介面在結果旁常駐釘版聲明（見 inputsOutputs）。

## scope

MVP 必做：單一時間點 Widmark 推估。輸入性別（決定分布係數 r）、體重（kg）、1–12 列飲料（每列容量 ml 與酒精濃度 ABV %）、距開始飲用的經過分鐘數。全部飲料視為在 t=0 一次攝入並即時完全吸收，之後以 β = 0.15 g/L/h 線性代謝，下限為零。輸出純酒精總克數、未代謝前濃度、目前推估濃度（g/L 與 %）、吐氣酒精濃度換算（mg/L）、法定區間、代謝至行政門檻以下與歸零的推估剩餘分鐘數。

非目標：逐杯不同飲用時間的時間軸、分段或非線性吸收模型、依體脂/年齡調整 r、呼氣或血液實測、醫療建議、執法或訴訟用途、即時濃度曲線圖。性別只提供 male / female 兩種 r 值，不提供自訂 r。

已與 checkout 內 101 份預案比對，無酒精或 BAC 類預案。最相近者的實質差異如下。

- 咖啡因代謝（caffeine-half-life，run-4 預案）：同為「物質濃度隨時間變化」，但物質、模型（指數半衰期 vs Widmark 分布＋零級代謝）與內容（該案無任何法定門檻對照）皆不同，且該案處理的是咖啡因而非酒精。
- 本案的法定區間只對照中華民國（台灣）現行法規數值，不提供其他司法管轄區門檻。

判定規則由本文定義，無線上資料或外部服務依賴。法定數值與公式常數的來源及查證日期見 inputsOutputs 與 AUTHOR-CHECK.md。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。法定門檻對照表與聲明文字為靜態內容，兩語頁面皆完整呈現，不依賴計算結果才出現。

- 欄位或說明「性別與體重 / Sex and body weight」
- 欄位或說明「飲料清單（容量與酒精濃度） / Drinks (volume and ABV)」
- 欄位或說明「距開始飲用的經過時間（分鐘） / Minutes since drinking started」
- 「估算酒精濃度 / Estimate BAC」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「推估濃度與法定區間 / Estimated BAC and legal band」先摘要再列細節：目前濃度（g/L、%、吐氣換算）、法定區間標示、未代謝前濃度、純酒精克數、代謝至門檻以下與歸零的推估分鐘數。法定區間以文字標示，不只用顏色區分。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 結果區下方常駐釘版聲明（雙語，原文見 inputsOutputs），計算前在輸入區下方亦以較短的一行提示呈現：「僅供推估，喝酒不開車 / Estimate only. Never drink and drive.」

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果旁常駐完整聲明。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"sex":"male","weightKg":"70","drinks":[{"volumeMl":"350","abvPercent":"5"}],"elapsedMinutes":"0"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。明示檔案欄才處理原始 bytes；本工具無檔案欄。

輸入欄位（順序即驗證順序）：

1. `sex`：字串，枚舉 `male` 或 `female`。預設 `male`。
2. `weightKg`：ASCII 十進字串，整數或恰一位小數（文法 `^[0-9]+(\.[0-9])?$`），範圍 20–500 kg。預設 `70`。
3. `drinks`：陣列，1–12 列。每列為含確切兩欄的普通物件：`volumeMl`（ASCII 十進整數字串，1–5000 ml）、`abvPercent`（ASCII 十進字串，整數或恰一位小數，文法同 weightKg，範圍 >0 且 ≤100）。預設一列 `{"volumeMl":"350","abvPercent":"5"}`。
4. `elapsedMinutes`：ASCII 十進整數字串，0–1440 分鐘。預設 `0`。

所有純量欄位 raw 上限 8 個 UTF-16 code units（與本批其他預案一致）。整數文法不接受前導空白、符號、小數或指數；十進文法除上述一位小數外同樣不接受。文法先於範圍。

驗證與錯誤（整份失敗回 `{ok:false,error:{code,field,row}}`；成功僅為 `{ok:true,result}`；資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊）：

1. 先驗物件形狀：非普通物件、缺欄、多欄、欄位型別錯誤（sex/weightKg/elapsedMinutes 非字串、drinks 非陣列、列非普通物件、列缺欄或多欄、列欄位非字串）皆 SCHEMA，field,row=null。但 drinks 陣列本身型別正確而列內容有誤時，依下列逐列規則回報，不以 SCHEMA 代替。
2. 逐欄依 sex → weightKg → drinks → elapsedMinutes。每個純量欄位依序：容量 INPUT_LIMIT（raw >8 units）→ 未成對 surrogate UNICODE → 空字串 EMPTY → 文法（sex 為 ENUM；weightKg 為 DECIMAL_FORMAT；elapsedMinutes 為 INTEGER_FORMAT）→ 範圍 RANGE。
3. drinks：陣列長度 0 為 EMPTY（field=`drinks`,row=null）；長度 >12 為 ROW_LIMIT（field=`drinks`,row=13，即第一個超限列）。長度合法時逐列（row 為 1-based 列號）驗 volumeMl → abvPercent，每欄同上順序（文法 volumeMl 為 INTEGER_FORMAT、abvPercent 為 DECIMAL_FORMAT；範圍錯誤 field 為該欄名、row 為列號）。
4. elapsedMinutes 同純量規則，文法 INTEGER_FORMAT，範圍 0–1440，超限 RANGE。

計算（全部以精確有理數運算，建議 BigInt 分子分母；不得先以浮點計算再修正）：

- 純酒精克數 A = Σ 列 (volumeMl × abvPercent × 0.789 / 100)。其中 0.789 g/ml 為乙醇密度（20 °C，Widmark 文獻慣用值）。
- 分布係數 r：male = 0.68，female = 0.55（Widmark 分布比，文獻慣用平均值）。
- 未代謝前濃度 P = A / (r × weightKg)，單位 g/L。
- 目前濃度 B = max(0, P − 0.15 × elapsedMinutes / 60)，β = 0.15 g/L/h 為零級代謝速率（文獻慣用平均值）。下限只套在最終 B，不回溯改 P。
- 百分比 bacPercent = B / 10（即 g/100ml 的 % 表示）。
- 吐氣換算 breathMgL = B × 1000 / 2000 = B / 2。換算比 2000:1 不是任意常數：台灣法規本身以成對數值定義門檻——吐氣 0.15 mg/L 對應血液 0.03%，吐氣 0.25 mg/L 對應血液 0.05%——兩組成對值都精確給出血液:吐氣 = 2000:1，本工具以此法定對應換算，並在介面註明這是依法規成對門檻換算的參考值，不是儀器量測值。
- 法定區間 band（以未捨入的精確 B 判定，門檻用「達」即 ≥）：
  - `below-threshold`：B < 0.3 g/L（吐氣 < 0.15 mg/L）。
  - `administrative`：0.3 ≤ B < 0.5 g/L（吐氣 0.15 ≤ x < 0.25 mg/L）。台灣道路交通管理處罰條例第 35 條的行政責任區間（不得駕車標準見道路交通安全規則：吐氣達每公升 0.15 毫克或血液達 0.03% 以上）。
  - `criminal`：B ≥ 0.5 g/L（吐氣 ≥ 0.25 mg/L）。刑法第 185 條之 3 不能安全駕駛罪的濃度標準（吐氣達每公升 0.25 毫克或血液達 0.05% 以上）。
  - band 的顯示文字不得把 below-threshold 描述為「可以開車」或「安全」；固定文案為「未達行政罰門檻（喝酒仍不可駕車）/ Below the administrative threshold (still not OK to drive)」。
- 剩餘分鐘（以未捨入的精確 B 計算，向上取整 ceil；B 的單位 g/L，β 換算後每 g/L 需 400 分鐘）：
  - minutesToZero：B = 0 時為 0，否則 ceil(B × 400)。
  - minutesToBelowAdmin：B < 0.3 時為 0，否則 ceil((B − 0.3) × 400)。

輸出 result 欄位（數值皆為由精確有理數一次 round-half-up 的結果；half-up 定義為 floor(x × 10^k + 0.5) / 10^k，所有輸出非負）：

| 欄位 | 精度 | 語義 |
| --- | --- | --- |
| totalAlcoholGrams | 1 位小數 | A 的顯示值 |
| peakBacGL | 3 位小數 | P（未代謝前濃度，g/L） |
| bacGL | 3 位小數 | B（目前推估濃度，g/L） |
| bacPercent | 3 位小數 | B / 10（%） |
| breathMgL | 3 位小數 | B / 2（mg/L，法定對應換算） |
| band | 字串枚舉 | `below-threshold` / `administrative` / `criminal` |
| minutesToZero | 整數 | 見上 |
| minutesToBelowAdmin | 整數 | 見上 |

band 與分鐘數一律由未捨入的精確值判定與計算；顯示值經捨入後可能恰好落在門檻數字上（例：B = 0.2996 顯示 bacGL 0.300、band 仍為 below-threshold），介面文案須註明「區間以未捨入的推估值判定 / Band is decided on the unrounded estimate.」。

釘版聲明（中英原文，逐字使用，顯示於結果區；版本變更須改本節並重審）：

- zh：「本工具僅依 Widmark 公式推估，不是醫療或執法測量。實際酒精濃度因個人體質、飲食、服藥與飲用速度差異很大。只要喝酒，就不要開車或騎車；本工具的任何結果都不能當作可以安全駕駛的依據。」
- en: "This tool only estimates with the Widmark formula; it is not a medical or law-enforcement measurement. Actual alcohol concentration varies widely with body composition, food, medication and drinking speed. If you drink, do not drive or ride; no result from this tool is evidence that driving is safe."

固定下載 `bac-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/bac-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。核心不得讀時鐘、地主時區或任何外部狀態；同一輸入在任何時區結果相同。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。飲酒資料屬敏感個人資料，上述零外流要求為本案必要條件，不因其他工具慣例放寬。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「估算酒精濃度」，畫面和完整報告符合核心 fixtures，使用者取得對應產物；聲明逐字呈現、band 文案不暗示可駕駛。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據；含 band 門檻兩側（0.290 與 0.311 g/L）案例。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；飲料列增刪可用。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。13 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `beer-male-peak` | 範例：一瓶啤酒、男性、經過 0 分，峰值即目前值，below-threshold |
| `beer-male-eliminated` | 同上但經過 120 分，代謝扣減超過峰值，下限歸零，峰值仍保留 |
| `wine-female-administrative` | 紅酒一杯、女性、30 分，落在行政區間，剩餘分鐘兩值皆非零 |
| `spirits-male-criminal` | 烈酒 100 ml、男性、0 分，落在刑事區間 |
| `multi-drink-mixed` | 三列不同飲料加總，女性，60 分，刑事區間 |
| `just-above-admin` | 375 ml 啤酒使 B = 0.311，恰在行政門檻上方，與 beer-male-peak 的 0.290 成對 |
| `row-two-range` | 第二列 abvPercent 超限，錯誤帶 row=2 |
| `too-many-rows` | 13 列觸發 ROW_LIMIT，row=13 |
| `empty-drinks` | 空陣列 EMPTY，field=drinks |
| `weight-format` | 體重兩位小數 DECIMAL_FORMAT |
| `sex-enum` | 性別非枚舉值 ENUM |
| `zero-volume` | 第一列容量 0，RANGE 帶 row=1 |
| `elapsed-range` | 經過 1441 分 RANGE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限（weightKg 500、volumeMl 5000、abvPercent 100、elapsedMinutes 1440、恰 12 列）、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證不變量：任一合法輸入 bacGL ≤ peakBacGL；elapsedMinutes 增大時 bacGL 不增；band 與未捨入 B 的門檻關係（0.3/0.5）恆成立；minutesToZero 與 minutesToBelowAdmin 皆為使 B 降至目標所需的最小整數分鐘（以精確值回代驗證）。

候選 gate（均 NOT_RUN）

- 於 `tools/bac-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「酒精濃度估算」，title「酒精濃度估算｜Gloss Tools」，description「輸入性別、體重、飲酒量與經過時間，用 Widmark 公式推估血液酒精濃度，並對照台灣酒駕行政與刑事門檻。僅供推估，喝酒不開車。」。英文 lang=en，H1 “BAC Calculator”，title “BAC Calculator | Gloss Tools”，description “Estimate blood alcohol concentration with the Widmark formula from sex, weight, drinks and elapsed time, with Taiwan's administrative and criminal DUI thresholds for reference. Estimate only — never drink and drive.”。兩頁靜態呈現操作、限制、FAQ 與完整聲明。全部狀態及錯誤使用對等本地化訊息。
- FAQ。低於 0.15 mg/L 就可以開車嗎？不行。門檻只是處罰的起點，酒精從第一口就影響反應與判斷，而且本工具只是推估，誤差可能讓你實際上已超過門檻。 / Is below 0.15 mg/L OK to drive? No. The threshold is only where penalties start; alcohol impairs reaction and judgment from the first drink, and this tool is only an estimate — error could put you over the threshold in reality.
- FAQ。喝水、咖啡或運動可以加速代謝嗎？不行。酒精以約每小時 0.15 g/L 的固定速率代謝，喝水、咖啡、沖冷水或運動都不會讓它變快，只有時間有效。 / Can water, coffee or exercise speed up elimination? No. Alcohol is eliminated at a roughly fixed 0.15 g/L per hour; water, coffee, cold showers and exercise do not speed it up. Only time works.
- FAQ。吐氣濃度是怎麼換算的？台灣法規以成對數值定義門檻：吐氣 0.15 mg/L 對應血液 0.03%，0.25 mg/L 對應 0.05%，兩者都是血液：吐氣 = 2000:1。本工具以同樣比例換算，結果是參考值，不是儀器量測。 / How is the breath figure converted? Taiwan's statutes define thresholds in pairs — breath 0.15 mg/L with blood 0.03%, and breath 0.25 mg/L with blood 0.05% — both give a blood-to-breath ratio of 2000:1. This tool converts with the same ratio; the result is a reference value, not an instrument reading.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://bac-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。法定數值（0.15/0.25 mg/L 與 0.03%/0.05%）如遇修法，規格須修訂並重審，不得由 builder 自行更新常數。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/bac-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

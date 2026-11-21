# 糖化血色素換算 / HbA1c Converter

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-hba1c-converter-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者拿到一份 HbA1c 檢驗報告或一個平均血糖數字，想知道它在另外三種單位下是多少、落在 ADA 的哪個分級帶。

- 桌面。桌面前填一個數值、選它的單位，按換算一次看到四種表示法（HbA1c %、mmol/mol、eAG mg/dL、eAG mmol/L）與分級帶，複製或下載報告帶去回診討論。
- 行動。手機在診間或藥局門口對照報告上的數字，不用心算公式。

使用情境為設計假設。資料只保留在目前頁面草稿；本工具只做單位換算與分級標示，不診斷、不給治療建議。

## scope

單一數值、四種單位雙向換算。輸入單位四選一，輸出其餘三種加輸入單位本身的標準化顯示。分級帶依 ADA 診斷切點標示，僅供參考。非目標為診斷、治療建議、追蹤記錄、血糖機數據匯入、把 eAG 當成實測平均血糖、即時檢驗數據查詢。

已與本倉 `docs/specs/` 103 份預案比對，無 HbA1c 換算預案。最相近者的實質差異如下。

- 血壓分級、膽固醇分級（本輪概念 2、4，倉內尚無規格）：以量測值查分級表為主，不做單位換算。此處是四單位雙向換算，分級只是附加標示。
- bmi-tdee-calculator：以身高體重算健康指標，不同量、不同公式。此處的輸入是檢驗數值，公式為 ADAG 迴歸與 IFCC 主方程式。

判定規則由本文定義，無線上資料或外部服務依賴。公式與分級表來源見 §5。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「數值 / Value」
- 欄位或說明「輸入單位 / Input unit」：HbA1c %、HbA1c mmol/mol（IFCC）、eAG mg/dL、eAG mmol/L 四選一
- 「換算 / Convert」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個核心案例（A1c 7%），明示範例並等待手動執行。
- 「換算結果 / Conversion result」先顯示四種單位的對照表，再顯示分級帶與免責聲明。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"value":"7","unit":"a1c-percent"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

免責聲明逐字顯示於結果區（zh/en 對照，見 §4）：「本工具僅提供估算與單位換算，不構成醫療建議或診斷。請與醫師討論你的檢查結果。 / This tool provides estimates and unit conversions only. It is not medical advice or a diagnosis. Discuss your results with your clinician.」

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- `input` 為 `{value, unit}`。`value` 為 ASCII 十進小數字串：1–3 位整數位、可選小數點加 1–2 位小數，不含空白／符號／千分位逗號／指數，raw 最多 8 單元。`unit` 為四枚舉之一：`a1c-percent`、`ifcc`、`eag-mgdl`、`eag-mmoll`。
- 預設 `{"value":"7","unit":"a1c-percent"}`。
- 各單位輸入範圍（皆由 canonical A1c% 3.0–20.0 依 §5 公式推導，見下表）：

| unit | 範圍（含） | 對應 A1c% |
| --- | --- | --- |
| `a1c-percent` | 3.0–20.0 % | 3.0–20.0 |
| `ifcc` | 9.29–195.08 mmol/mol | 3.0–20.0 |
| `eag-mgdl` | 39.40–527.30 mg/dL | 3.0–20.0 |
| `eag-mmoll` | 2.19–29.29 mmol/L | 3.0–20.0 |

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 驗證 `unit`：缺欄、非字串、非四枚舉之一皆 SCHEMA，field=`unit`。
2. 驗證 `value`：raw 超 8 單元 INPUT_LIMIT；空字串 EMPTY；不符十進小數文法 NUMBER_FORMAT；超出該單位範圍 RANGE；field 皆為 `value`。
3. 由輸入依 §5 反推 canonical A1c%（未捨入全精度）。由 canonical A1c% 依 §5 正推四種輸出。
4. 結果 `{a1cPercent, ifcc, eagMgdl, eagMmoll, category}`，皆為字串（固定小數位，見 §5），`category` 為 `normal`、`prediabetes`、`diabetes-range` 之一。分級以未捨入 canonical A1c% 判定：<5.7 `normal`；5.7–<6.5 `prediabetes`；≥6.5 `diabetes-range`。分級帶標示僅供參考，不是診斷。

固定下載 `hba1c-converter-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

錯誤訊息（zh/en 對照）：

| code | zh | en |
| --- | --- | --- |
| SCHEMA | 輸入結構不正確，請重新輸入。 | The input structure is invalid. Please re-enter. |
| INPUT_LIMIT | 輸入過長。 | Input is too long. |
| EMPTY | 請輸入數值。 | Please enter a value. |
| NUMBER_FORMAT | 請輸入數字，最多兩位小數，不含逗號或符號。 | Enter a number with up to 2 decimal places, no commas or symbols. |
| RANGE | 數值超出可換算範圍。 | The value is outside the convertible range. |
| INTERNAL | 內部錯誤，請重試。 | Internal error. Please try again. |
| WORKER_ERROR | 計算失敗，請重試。 | Calculation failed. Please try again. |

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/hba1c-converter/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

### 釘版公式與來源

canonical 量為未捨入的 A1c%（NGSP/DCCT）。所有輸出皆由 canonical A1c% 正推；所有輸入先反推為 canonical A1c%。

| 方向 | 公式 | 來源 |
| --- | --- | --- |
| A1c% → eAG mg/dL | eAG = 28.7 × A1c − 46.7 | Nathan et al., ADAG Study, Diabetes Care 2008;31:1473–1478（R²=0.84，n=507）；ADA 採用，見 ADA eAG/A1C Conversion Calculator |
| A1c% → eAG mmol/L | eAG = 1.5944 × A1c − 2.594 | 同上論文 Table 1 註腳的 mmol/L 迴歸式（即 mg/dL 式 ÷18） |
| A1c% ↔ IFCC mmol/mol | IFCC = (A1c% − 2.15) × 10.929；A1c% = IFCC ÷ 10.929 + 2.15 | NGSP/IFCC 主方程式（master equation） |
| eAG mg/dL → A1c% | A1c = (eAG + 46.7) ÷ 28.7 | 上列第一式的代數反函數 |
| eAG mmol/L → A1c% | A1c = (eAG + 2.594) ÷ 1.5944 | 上列第二式的代數反函數 |

分級帶（ADA Standards of Care 診斷切點）：A1c <5.7% 正常（normal）；5.7–6.4% 糖尿病前期（prediabetes）；≥6.5% 糖尿病範圍（diabetes-range）。ADA 另建議多數非懷孕成人以 A1c <7.0% 為一般目標，個人目標由醫師決定；該目標只出現在 FAQ，不進入結果物件。

捨入：只在顯示時捨入，採十進位 ROUND_HALF_UP（四捨五入，半值往遠離零的方向）。A1c% 2 位小數、IFCC 0 位小數、eAG mg/dL 0 位小數、eAG mmol/L 1 位小數；結果皆為字串以保留尾零。運算必須用十進位精確算術（字串／定點整數），不得以二進位浮點數跑換算路徑；分級、範圍判定一律用未捨入值。

已知來源差異（已核實，見 AUTHOR-CHECK.md）：以本規格的 mmol/L 迴歸式計算，ADA 公布的 eAG 對照表 9 列中有 7 列在小數 1 位完全一致；A1c 8.0%（本工具 10.2，對照表 10.1）與 8.5%（本工具 11.0，對照表 10.9）兩列差 0.1 mmol/L。該對照表無法由任一已發表的公式在小數 1 位完整重現（1.59 簡式僅合 3 列、÷18.0182 僅合 5 列），故本規格以 ADAG 論文原式為準，並在此揭露差異，不改公式去湊表格。另：個別次要來源把 IFCC 式寫成減 2.14，本規格依 NGSP/IFCC 主方程式釘為 2.15。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「換算」，四種單位、雙向換算與分級皆符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點（A1c 3.0／20.0）、剛好越界（2.9）、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。10 個字面核心案例、3 個錯誤案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `a1c-7-percent` | A1c 7% 正向換算與分級（ADA 錨點） |
| `a1c-6-5` | 6.5% 糖尿病範圍下限 |
| `a1c-5-7-boundary` | 5.7% 糖尿病前期下限 |
| `ifcc-53-reverse` | IFCC 53 反向換算回 7.00% |
| `eag-mgdl-126-reverse` | eAG 126 mg/dL 反向換算 |
| `eag-mmol-8-5-reverse` | eAG 8.5 mmol/L 反向換算（往返一致） |
| `a1c-4-low` | 低值正常帶 |
| `a1c-12-high` | 高值糖尿病範圍 |
| `a1c-3-min` | 下限端點 3.0% |
| `a1c-20-max` | 上限端點 20.0% |
| `a1c-below-range` | 2.9% 超出範圍 RANGE |
| `value-comma` | 逗號小數 NUMBER_FORMAT |
| `unit-invalid` | 非法單位 SCHEMA |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證分級切點 5.7／6.5（5.69 正常、5.7 前期、6.49 前期、6.5 糖尿病範圍）、A1c 3.0／20.0 端點、IFCC 9.29／195.08 端點、mg/dL 39.40／527.30 端點、mmol/L 2.19／29.29 端點。所有輸出皆由未捨入 canonical A1c% 推導；同一 canonical 值的四種輸出互相一致（以 mmol/L 輸入再輸出 mmol/L 往返不變）。

候選 gate（均 NOT_RUN）

- 於 `tools/hba1c-converter/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「糖化血色素換算」，title「糖化血色素換算｜Gloss Tools」，description「輸入 HbA1c 或平均血糖的一個數值，一次對照 %、mmol/mol、mg/dL、mmol/L 四種表示法與 ADA 分級帶。」。英文 lang=en，H1 “HbA1c Converter”，title “HbA1c Converter | Gloss Tools”，description “Enter one HbA1c or average glucose value and see it in %, mmol/mol, mg/dL and mmol/L with the ADA category.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。eAG 是實測平均血糖嗎？不是，eAG 是由 A1c 迴歸估算的過去約 2–3 個月平均血糖，不是實測值。 / Is eAG a measured average glucose? No. eAG is estimated from A1c by regression over roughly the past 2–3 months; it is not a measured value.
- FAQ。為什麼 mmol/L 有時和 ADA 表格差 0.1？本工具以 ADAG 論文的 mmol/L 迴歸式（1.5944 × A1c − 2.594）計算；ADA 對照表在 A1c 8.0% 與 8.5% 兩列無法由任一已發表的公式在小數 1 位重現（本工具為 10.2／11.0，對照表為 10.1／10.9），其餘 7 列一致。 / Why does mmol/L sometimes differ from the ADA table by 0.1? This tool uses the ADAG paper's mmol/L regression (1.5944 × A1c − 2.594). The ADA table's rows at A1c 8.0% and 8.5% cannot be reproduced to 1 decimal by any published formula (this tool gives 10.2 / 11.0; the table gives 10.1 / 10.9); the other 7 rows agree.
- FAQ。目標 A1c 是多少？ADA 建議多數非懷孕成人以 <7.0% 為一般目標，個人目標請與醫師討論。 / What A1c should I aim for? ADA suggests <7.0% as a general goal for most nonpregnant adults; set your personal goal with your clinician.
- FAQ。可以用這個結果診斷糖尿病嗎？不行。診斷需由醫師依實驗室檢查與重複確認。 / Can this diagnose diabetes? No. Diagnosis requires laboratory testing and confirmation by a clinician.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://hba1c-converter.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/c8ca5fd/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/hba1c-converter/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

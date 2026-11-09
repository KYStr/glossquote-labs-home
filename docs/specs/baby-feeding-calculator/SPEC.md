# 嬰兒奶量計算 / Baby Feeding Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-baby-feeding-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

父母或照顧者手上有寶寶的體重，想在泡奶前快速估算一天大約需要多少奶、分成預定的餐數一餐約多少，而且數字要能追溯到公開醫療指引、不是部落格傳聞。

- 行動。手機在夜間餵食前輸入體重與每日餐數，立即看到每日總量、每一餐的 ml 數與每餐平均，連同來源說明與免責聲明。
- 桌面。在做每日餵食計畫時核對不同係數（150–200 ml/kg）下的總量範圍，調整餐數看每餐如何增減。

使用情境為一般資訊估算，不是診斷或處方。資料只保留在目前頁面草稿，不離開裝置。

## scope

MVP 必做：體重（kg）× 每公斤每日奶量係數 → 每日總量（整數 ml）；依每日餵食次數把總量分成逐餐 ml 列表，餘數由最早的餐次依序各吸收 1 ml，總和恰好等於每日總量；每餐平均（1 位小數）；選填月齡只做標示與適用範圍提醒；指引來源與免責聲明全文釘版、常駐顯示。

係數的依據只有一個引用來源：NHS 111 Wales《Infant formula: common questions》（頁面最後更新 2021-04-19，本規格於 2026-11-09 查閱），原文 “By the end of their first week, most will need around 150 to 200ml per kilo of their weight a day until they're 6 months old.” 來源給的是範圍不是單一數字：預設係數釘版為 150（該範圍下限，也是實務最常用的單一估算值），使用者可在 150–200 內以 1 為單位調整，範圍在介面與 FAQ 全文揭露。

非目標（明確不做）：

- 不依月齡調整係數。本批簡報只允許「與係數同一來源」公布的月齡對照表；引用來源未公布月齡對照表，故月齡不參與計算。其他來源（如澳洲 Pregnancy, Birth and Baby 的月齡分段速率）不混入本工具。
- 不設每日總量上限。引用來源未設上限；其他來源（如 AAP 約 32 oz / 960 ml）的上限屬不同指引體系，不混入。
- 不做每餐胃容量警示帶。引用來源未公布每餐容量數字；坊間每餐量多為月齡分段，與本工具「月齡僅標示」的釘版衝突，故整體不做。
- 不做盎司（oz）換算、直接哺乳量推估（無法量測）、擠出母乳與配方奶的差異調整、成長百分位、副食品建議或任何醫療診斷。

適用範圍揭露：引用指引適用對象為足月健康嬰兒、出生第一週結束後至約 6 個月、瓶餵的配方奶量。體重輸入範圍 1–15 kg 是工具輸入界線，不是對指引適用年齡的擴張；早產、低出生體重或有健康狀況的寶寶不在本工具適用範圍，免責聲明已釘版此點。

已檢查同 repo `docs/specs/` 全部 101 份規格，無嬰兒／奶量／餵食主題規格。最相近者為同批概念 #39 寵物餵食量（獸醫 RER／DER 公式、對象為犬貓），領域與公式完全不同；成人與活動熱量類工具亦不涉嬰兒餵食。判定規則由本文定義，計算不依賴線上資料或外部服務（來源僅為文件引用，頁面離線可算）。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。免責聲明與指引來源全文在結果區下方常駐，不需展開、在兩語頁面各以該語顯示，列印／截圖結果時不可被裁掉。

- 欄位或說明「寶寶體重（公斤） / Baby's weight (kg)」
- 欄位或說明「每公斤每日奶量（ml） / Milk per kg per day (ml)」，欄旁固定顯示來源短註「指引範圍 150–200，預設 150 / Guideline range 150–200, default 150」
- 欄位或說明「每日餵食次數 / Feeds per day」
- 欄位或說明「月齡（選填，僅供標示） / Age in months (optional, label only)」，欄旁固定顯示「月齡不影響計算結果 / Age does not change the result」
- 「計算每日奶量 / Calculate daily amount」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「每日總量與每餐奶量 / Daily total and amount per feed」先摘要（每日總量、每餐平均、如有月齡則回顯標示與適用範圍提醒），再列每一餐的編號與 ml 數。每餐列表最多 24 列，在有 label 的區域完整列出、不截斷、不分頁。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果下方必有免責聲明與指引來源全文。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"weight":"","factor":"150","feedsPerDay":"8","ageMonths":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。本工具無檔案欄。

欄位順序固定為 weight、factor、feedsPerDay、ageMonths，驗證與第一個錯誤都依此順序。每欄 raw 為 DOM 字串，每欄最多 8 個 UTF-16 code units。每欄檢查順序固定：INPUT_LIMIT（raw 超過 8 單元）→ UNICODE（不成對 surrogate）→ EMPTY（raw 為空字串；ageMonths 例外，見下）→ 文法（weight 為 DECIMAL_FORMAT，其餘為 INTEGER_FORMAT）→ RANGE。整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆為 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

- `weight`：必填。文法為 ASCII 數字串：整數部分 1 位以上數字，可帶小數點與 1–2 位小數（正規式 `^[0-9]+(\.[0-9]{1,2})?$`）；無正負號、空白、指數、前導小數點或尾隨小數點；前導零允許（`04.50` = 4.5）。數值以 0.01 kg 為單位的整數 h 表示，範圍 100 ≤ h ≤ 1500（即 1–15 kg，含端點）。預設 `""`。
- `factor`：必填。每公斤每日奶量（ml/kg/day），文法 `^[0-9]+$`，整數，範圍 150–200（含端點）。預設 `"150"`。
- `feedsPerDay`：必填。每日餵食次數，文法 `^[0-9]+$`，整數，範圍 1–24（含端點）。預設 `"8"`。
- `ageMonths`：選填，僅標示用，絕不參與係數或總量計算。raw `""` 表示未提供（合法，跳過文法與範圍檢查，值為 null）。非空時文法 `^[0-9]+$`，整數，範圍 0–24（含端點）。預設 `""`。

驗證全過後，純整數運算，無浮點、無捨入模式歧義：

1. 每日總量 `dailyTotalMl = ⌊(h × factor + 50) / 100⌋`，即未捨入值 h × factor / 100 以四捨五入（恰 .5 進位）取整數 ml。
2. 每餐分配：`base = ⌊dailyTotalMl / feedsPerDay⌋`，`r = dailyTotalMl − base × feedsPerDay`；第 i 餐（1-based）`perFeedMl[i] = base + 1`（i ≤ r），其餘為 base。總和不變量：perFeedMl 加總恆等於 dailyTotalMl。因 dailyTotalMl ≥ 1 kg × 150 = 150 且 feedsPerDay ≤ 24，base ≥ 6，每餐恆 ≥ 6 ml，不會出現 0 ml 餐。
3. 每餐平均 `perFeedAverageMl`：`tenths = ⌊(20 × dailyTotalMl + feedsPerDay) / (2 × feedsPerDay)⌋`，值為 tenths / 10，即未捨入平均四捨五入（恰 .05 進位）到 1 位小數；JSON 以至多 1 位小數的數字表示（75 寫 75，不寫 75.0）。
4. 提醒 `notices`：ageMonths 為 null 時為 `[]`；為 0 時為 `["early-newborn-amounts-differ"]`；為 7–24 時為 `["guideline-covers-to-about-6-months"]`；為 1–6 時為 `[]`。順序固定，至多一項。提醒文字釘版如下，結果區以目前頁面語言顯示：
   - `early-newborn-amounts-differ`：「新生兒在出生後最初幾天需要的奶量小得多，指引的 150–200 ml 範圍是第一週結束後的用量。」 / “Newborns need much smaller amounts in the first few days; the 150–200 ml range applies from the end of the first week.”
   - `guideline-covers-to-about-6-months`：「引用指引的適用期間到約 6 個月；開始副食品後奶量需求會改變，請諮詢兒科醫師。」 / “The cited guideline covers babies up to about 6 months old; once solids start, milk needs change — ask your paediatrician.”

結果物件鍵固定為 `{weightKg, factorMlPerKgDay, feedsPerDay, ageMonths, dailyTotalMl, perFeedMl, perFeedAverageMl, notices}`：weightKg = h / 100 的 JSON 數字（4.55 寫 4.55，4 寫 4）；factorMlPerKgDay、feedsPerDay 為整數；ageMonths 為整數或 null；dailyTotalMl 為整數；perFeedMl 為整數陣列、長度 = feedsPerDay、依餐次順序。機器值不隨 locale 改。

免責聲明（釘版原文，靜態頁面常駐、成功結果下方再顯示一次，兩語各以頁面語言全文顯示，不得摘要或改寫）：

- 繁中：「本工具僅依公開的一般餵食指引估算奶量，不是醫療建議，也不能取代醫師的診斷。每個寶寶需要的奶量都不同，請依寶寶的饑餓與飽足訊號餵食，並遵循您的兒科醫師、助產師或健康訪視員的個別建議。早產、低出生體重、正在生病或有健康狀況的寶寶，請完全依照醫療人員的指示餵食。」
- English: “This tool only estimates milk volume from a published general feeding guideline. It is not medical advice and does not replace a clinician's judgement. Every baby needs a different amount: feed in response to your baby's hunger and fullness cues, and follow the individual advice of your paediatrician, midwife or health visitor. For babies who are preterm, low birth weight, unwell or have a medical condition, follow your clinician's instructions exactly.”

指引來源（釘版原文，與免責聲明同區顯示）：

- 繁中：「指引來源：NHS 111 Wales《Infant formula: common questions》（頁面最後更新 2021-04-19，2026-11-09 查閱）：大多數寶寶在出生第一週結束後、到約 6 個月大之前，每天約需要每公斤體重 150 至 200 ml 的奶。本工具的預設值 150 是該範圍的下限，可在 150–200 間調整。」
- English: “Guideline source: NHS 111 Wales, 'Infant formula: common questions' (page last updated 19 Apr 2021; retrieved 9 Nov 2026): by the end of their first week, most babies need around 150 to 200 ml per kilo of their weight a day until they're 6 months old. This tool's default of 150 is the lower bound of that range; it can be adjusted between 150 and 200.”

固定下載 `baby-feeding-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/baby-feeding-calculator/`。src/core.mjs 放純驗證、推導、格式化（全部整數運算，不用浮點除法決定任何輸出數字）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。指引來源是文件引用而非執行期資料：程式不 fetch 任何醫療內容，係數範圍與預設值是原始碼常數，對應本文釘版。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據——本工具輸入涉及嬰兒體重，屬健康相關資料，一律視為敏感，不記錄、不外送。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。本工具輸出為健康相關估算：免責聲明缺失、被摘要改寫或不在結果旁，視為該面向缺陷擋下交驗，不因計算正確而放行。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算每日奶量」，畫面和完整報告符合核心 fixtures，使用者取得對應產物；每餐加總等於每日總量的不變量成立。 |
| boundaries | 合法端點（1／15 kg、150／200、1／24 餐、月齡 0／24）、剛好越界、第一個錯誤、.5 進位點與餘數分配案例的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log；體重與月齡不進任何請求或紀錄。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；免責聲明與來源在結果旁可見不需展開。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯（含免責聲明、來源、提醒全文逐字對等）、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。16 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `typical-4kg-8feeds` | 基準案例：4 kg × 150 ÷ 8 餐整除 |
| `remainder-split-half-up-tie` | 未捨入總量恰 .5 進位，且餘數分配給最早 4 餐 |
| `half-up-tie-6kg35` | 第二個 .5 進位點，餘 5 餐各 +1 |
| `factor-max-200` | 係數上限 200 的整數運算與餘數分配 |
| `min-boundary` | 體重下限 1 kg × 每日上限 24 餐，每餐不為 0 |
| `max-boundary` | 體重上限 15 kg × 係數 200 × 單餐 |
| `age-newborn-notice` | 月齡 0 觸發第一週提醒，計算不受月齡影響 |
| `age-beyond-notice` | 月齡 9 觸發 6 個月適用範圍提醒 |
| `mid-factor-175` | 係數範圍中段 175、2 位小數體重的精確運算 |
| `weight-empty` | 體重缺內容 EMPTY |
| `weight-three-decimals` | 體重 3 位小數 DECIMAL_FORMAT |
| `weight-below-range` | 體重 0.99 kg RANGE（先過文法才判範圍） |
| `weight-input-limit` | 體重 raw 9 單元 INPUT_LIMIT（先於文法與範圍） |
| `factor-below-range` | 係數 149 RANGE |
| `feeds-above-range` | 餐數 25 RANGE |
| `feeds-decimal` | 餐數 8.5 INTEGER_FORMAT |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證體重 15.00／15.01、係數 149／150／200／201、餐數 0／1／24／25、月齡 0／24／25 與月齡帶前導零，weight 文法拒絕 `.5`、`4.`、`4.555`、`-4`、`4e2` 與全形數字；驗證任意合法輸入下 perFeedMl 加總恆等於 dailyTotalMl 且每餐 ≥ 1 ml；驗證月齡在 0–24 任意值都不改變 dailyTotalMl 與 perFeedMl（只改 ageMonths 與 notices）。

候選 gate（均 NOT_RUN）

- 於 `tools/baby-feeding-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「嬰兒奶量計算」，title「嬰兒奶量計算｜Gloss Tools」，description「依寶寶體重估算每日與每餐奶量：以 NHS 111 Wales 公布的每公斤每日 150–200 ml 指引為據（預設 150），每餐分配加總恰好等於每日總量。僅供一般參考，不是醫療建議。」。英文 lang=en，H1 “Baby Feeding Calculator”，title “Baby Feeding Calculator | Gloss Tools”，description “Estimate a baby's daily and per-feed milk volume from body weight, using the NHS 111 Wales guideline of 150–200 ml per kg per day (default 150), with per-feed amounts that sum exactly to the daily total. General information only — not medical advice.”。兩頁靜態呈現操作、限制、FAQ、免責聲明與指引來源全文。全部狀態及錯誤使用對等本地化訊息。
- FAQ。150 ml 這個數字是從哪裡來的？NHS 111 Wales 公布的範圍是每公斤每日 150–200 ml；本工具預設取範圍下限 150，可在範圍內調整。 / Where does the 150 ml figure come from? NHS 111 Wales publishes a range of 150–200 ml per kg per day; this tool defaults to the lower bound, 150, adjustable within the range.
- FAQ。為什麼奶量不會依月齡改變？引用指引只給單一範圍（第一週結束後到約 6 個月）、未公布月齡對照表，所以月齡不調整係數，只用來顯示適用範圍提醒。 / Why doesn't the amount change with age? The cited guideline gives a single range (end of the first week to about 6 months) with no age table, so age never adjusts the factor; it only controls reminder notices.
- FAQ。每餐奶量加起來會等於每日總量嗎？會；除不盡的餘數以 1 ml 為單位依序分給最前面的幾餐，總和恰好相等。 / Do the per-feed amounts add up to the daily total? Yes; any remainder is distributed 1 ml at a time to the earliest feeds, so they sum exactly.
- FAQ。這算是醫療建議嗎？不是；這只是依公開指引的一般估算，請依寶寶的訊號與兒科醫師的個別建議餵食。 / Is this medical advice? No; it is a general estimate from a published guideline — follow your baby's cues and your paediatrician's individual advice.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://baby-feeding-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence，並逐字核對引用來源（NHS 111 Wales 頁面現行文字與更新日期）、免責聲明與提醒的雙語釘版字串是否與本文一致。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/baby-feeding-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。本工具不得在任何階段加入追蹤、廣告或把輸入寫入分析／日誌；發現此類需求一律停在該項回報。

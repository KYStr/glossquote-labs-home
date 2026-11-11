# 兒童身高預測 / Child Height Predictor

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-child-height-predictor-20261109` · 2026-11-09 · v1

[預案品質與補庫說明](../../SPECIFICATION-STOCK.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

家長想快速知道孩子成年後大概會長多高，手邊只有爸爸和媽媽的身高，需要一個不用註冊、不用輸入孩子任何量測、結果帶著合理區間與聲明一起呈現的估算，而不是一個被當成保證的單一數字。

- 桌面。家長在親子健康檢查前後，填上父母雙方身高與孩子性別，確認預估成年身高與目標區間。
- 行動。家庭群組討論孩子成長時，在手機上核對同一組輸入的結果與區間。

使用情境為一般家庭查詢。資料只保留在目前頁面草稿。

## scope

MVP 必做：父親身高、母親身高（公分，一位小數）與孩子性別三個輸入，以 Tanner 父母身高中值法（mid-parental height）計算預估成年身高，男孩 (父 + 母 + 13) / 2、女孩 (父 + 母 − 13) / 2，並給出預估值 ±8.5 公分的目標區間；雙語靜態頁；固定格式報告下載。

非目標：依孩子目前年齡、身高、體重或骨齡的任何方法（生長百分位追蹤、Khamis-Roche 法、骨齡評估）——本案未釘版任何生長表資料，明確不做；英呎／英吋輸入與顯示；回歸至平均數（regression to the mean）校正版本；收養、單親或同性父母的調整模型；醫療診斷、成長異常警示或就醫建議；帳號、儲存、追蹤或通知。

資料與界線：輸入只有三個欄位，身高以公分字串輸入，接受範圍 100.0–230.0 cm 為合理性守衛（plausibility guard），不是醫學界限；全部運算為整數精確算術（單位見 inputsOutputs），不經浮點。判定規則由本文定義，無線上資料或外部服務依賴。

已與 checkout 內 `docs/specs/` 全部目錄比對，無 child-height／growth 類既有預案。最相近者的實質差異如下。

- 使用者本人目前的 BMI、TDEE 與體重範圍。此處不輸入使用者或孩子本人的任何量測，問題是下一代的成年身高估計。`docs/specs/bmi-tdee-calculator/`

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「父親身高（公分）、母親身高（公分）/ Father's height (cm), mother's height (cm)」
- 欄位或說明「孩子性別 / Child's sex」
- 「計算預估身高 / Calculate predicted height」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「預估成年身高與目標區間 / Predicted adult height and target range」先顯示預估值與區間，固定聲明全文（見 inputsOutputs）常駐於結果旁、不得摺疊或只以連結呈現。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果含預估值、區間與固定聲明。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"fatherHeightCm":"178","motherHeightCm":"165","childSex":"boy"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

- `fatherHeightCm`、`motherHeightCm`：ASCII 十進字串。文法：整數部為 `0` 或非零開頭的一至三位數字，可接 `.` 與恰一位小數 digit；無空白、正負號、指數、千分位。raw 每欄最多 8 個 UTF-16 code units。數值範圍 100.0–230.0 cm（含端點）。
- `childSex`：字串，恰為 `boy` 或 `girl`（ASCII 小寫），其餘值 ENUM。
- 預設 fatherHeightCm `178`、motherHeightCm `165`、childSex `boy`。row 恆為 null，本工具無列式輸入。

先 SCHEMA（整體形狀、恰三個 own data 字串欄位），再依 fatherHeightCm、motherHeightCm、childSex 欄位順序逐欄驗證；每欄順序固定為：容量 INPUT_LIMIT（raw 超過 8 units）、不成對 surrogate UNICODE、缺內容 EMPTY（長度 0）、文法（身高欄 DECIMAL_FORMAT，childSex 為 ENUM）、身高欄範圍 RANGE。首個失敗即整份失敗，回 `{ok:false,error:{code,field,row}}`。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算全程為整數精確算術，單位為 1/20 公分（twentieths）：

1. 身高字串解析為十分之一公分整數 fT、mT（`"172.5"` → 1725；`"178"` → 1780）。
2. 總和 S = fT + mT + 130（boy）或 fT + mT − 130（girl），單位為十分之一公分；13 cm 性別調整即 130。因 (F + M ± 13) / 2 cm = (fT + mT ± 130) / 20 cm，S 的數值即未捨入預估值的二十分之一公分表示。
3. 未捨入區間：low20 = S − 170、high20 = S + 170（8.5 cm = 170 個二十分之一）。
4. 捨入：三個輸出各自獨立以 round-half-up 捨入至一位小數，tenths(x20) = floor((x20 + 1) / 2)；區間由未捨入預估值計算後各自捨入，不由已捨入預估值加減 8.5。所有可接受輸入使 S 介於 1870 與 4730 之間，恆為正，無負數捨入分支。沒有浮點參與捨入決定。
5. 結果 `{childSex, targetCm, rangeLowCm, rangeHighCm}`，三個身高為數值（tenths / 10），一位小數語義；整數值如 178.0 即數值 178。

固定聲明（結果旁常駐全文，不得改寫）：

- 繁中：「此為依父母身高推估的統計估計，不是醫療建議，也不是對任何一位兒童的成長診斷或保證。遺傳只是影響成人身高的因素之一；實際身高還受營養、整體健康、睡眠與青春期時間等因素影響，個別兒童完全可能落在預估區間之外。」
- English: "This is a statistical estimate based on the parents' heights. It is not medical advice and is not a diagnosis or guarantee for any individual child. Genetics is only one of many factors that influence adult height; nutrition, overall health, sleep and the timing of puberty also matter, and an individual child may well finish outside the estimated range."

固定下載 `child-height-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/child-height-predictor/`。src/core.mjs 放純驗證、推導、格式化（解析與運算全用整數十分之一／二十分之一公分，捨入以整數 floor 公式完成）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算預估身高」，畫面和完整報告符合核心 fixtures，結果旁固定聲明全文可見，使用者取得對應產物。 |
| boundaries | 合法端點（100.0／230.0）、剛好越界（99.9／230.1）、第一個錯誤、欄位指向和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、固定聲明兩語全文、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。14 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `boy-typical` | 典型男孩，與公開範例交叉核對 |
| `girl-same-parents` | 同父母女孩，性別調整方向與 13 cm 差距 |
| `decimal-half-up` | 一位小數輸入，.25/.75 未捨入值 round-half-up |
| `exact-tenth` | 結果恰為一位小數，捨入不改變數值 |
| `min-endpoints` | 兩欄皆為可接受下限端點 100.0 |
| `max-endpoints` | 兩欄皆為可接受上限端點 230.0 |
| `below-range` | 父親身高 99.9 低於下限，RANGE |
| `above-range` | 母親身高 230.1 高於上限，RANGE |
| `decimal-format` | 兩位小數不合文法，DECIMAL_FORMAT |
| `leading-zero` | 整數部前導零不合文法，DECIMAL_FORMAT |
| `empty-field` | 空字串，EMPTY |
| `enum-sex` | 性別列舉外的值，ENUM |
| `input-limit` | raw 超過 8 units，INPUT_LIMIT 先於文法 |
| `schema-missing` | 缺欄，SCHEMA 且 field 為 null |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 100.0/99.9、230.0/230.1 端點對、同父母男女預估差恰 13.0、已捨入區間寬恆為 17.0（區間端點相差恰 340 個二十分之一，獨立 half-up 捨入後寬度不變）、以及聲明全文在兩語結果中逐字出現。

候選 gate（均 NOT_RUN）

- 於 `tools/child-height-predictor/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「兒童身高預測」，title「兒童身高預測｜Gloss Tools」，description「輸入父親與母親的身高與孩子性別，以父母身高中值法估算孩子成年身高與 ±8.5 公分目標區間；僅為統計估計，不是醫療建議。」。英文 lang=en，H1 “Child Height Predictor”，title “Child Height Predictor | Gloss Tools”，description “Estimate a child's adult height from the father's and mother's heights with the mid-parental (Tanner) method, shown with the ±8.5 cm target range. A statistical estimate, not medical advice.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。這個區間是什麼意思？±8.5 公分是 Tanner 目標區間，約涵蓋第 3 到第 97 百分位；多數孩子會落在區間內，但仍有人會在區間外。 / What does the range mean? The ±8.5 cm target range spans roughly the 3rd to 97th percentile; most children finish inside it, but some finish outside it.
- FAQ。為什麼男孩加 13 公分、女孩減 13 公分？13 公分是成年男女平均身高差的慣用值，先把父母身高放到同一尺度再平均。 / Why add 13 cm for a boy and subtract it for a girl? 13 cm is the conventional average adult height difference between men and women; it puts both parents' heights on the child's scale before averaging.
- FAQ。需要輸入孩子現在的身高或年齡嗎？不需要；本方法只用父母身高。依目前身高追蹤生長百分位不在本工具範圍。 / Do I need my child's current height or age? No. This method uses only the two parents' heights. Tracking growth percentiles from a child's current height is out of scope.
- FAQ。父母身高要填誰的？親生父母的成年身高；以脫鞋量測的值最準。 / Whose heights should I enter? The biological parents' adult heights; barefoot measured values are best.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://child-height-predictor.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/child-height-predictor/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

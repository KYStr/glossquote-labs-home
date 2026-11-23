# 血壓分級 / Blood Pressure Checker

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-blood-pressure-checker-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者在家或診所量完血壓後，拿著手邊的兩個數字（收縮壓／舒張壓，mmHg），想立即知道這次量測依公認分級落在那一級、以及該怎麼看待這個結果。

- 桌面。桌面輸入兩個數字，立即看到分級、所屬區間說明與一般性提醒，可下載一份報告留存。
- 行動。手機在量完血壓當下輸入兩個數字，核對分級，不啟動任何工作、不留帳號。

使用情境為單次量測對照。資料只保留在目前頁面草稿，不做長期追蹤、不存歷史記錄。

## scope

兩個整數輸入、五級分級、每級一般性提醒、釘版免責聲明、報告下載。分級表採 AHA/ACC 2017（見 §5 字面表與出處）。非目標為醫療診斷、治療或用藥建議、長期血壓追蹤、平均值計算、與血壓計或穿戴裝置連線、以及把結果當作就醫與否的唯一依據。

已與 run 6 概念清單的 40 項比對，最相近者的實質差異如下。

- 膽固醇分級（`cholesterol-checker`，概念第 4 條）。同為檢驗數值分級，但輸入是總膽固醇／LDL／HDL／三酸甘油酯四項血脂數值、對照 NCEP ATP III 表；此處是收縮壓＋舒張壓兩項血壓數值、對照 AHA/ACC 2017 表。
- 糖化血色素換算（`hba1c-converter`，概念第 3 條）。同為健康數值工具，但做單位換算（% ↔ eAG ↔ mmol/mol）；此處做分級判定，不做換算。
- BMI／體脂等既有身體數值工具以體重為主；此處以血壓為主，無重疊。registry 全量比對由家長在登記時執行（作者不跑 registry 指令）。

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「收縮壓（mmHg）／ Systolic (mmHg)」
- 欄位或說明「舒張壓（mmHg）／ Diastolic (mmHg)」
- 「查詢分級 / Check category」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例（118/76），明示範例並等待手動執行。
- 結果區先顯示分級（中英對照）、再列輸入數值與所屬區間、再列該級一般性提醒，最後顯示釘版免責聲明。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若為危象，以文字及符號提示儘快就醫（不用顏色作為唯一提示）。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設（兩欄皆為空字串）並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 全為 ASCII 十進整數字串，0 或非零開頭，無空白／符號／小數／指數，raw 每欄最多 4 單元。收縮壓 40–300 mmHg，舒張壓 20–200 mmHg。舒張壓不得高於收縮壓。
- 預設兩欄皆為空字串，無預填數值。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 systolic、diastolic 順序驗證。raw 超限 INPUT_LIMIT、文法 INTEGER_FORMAT、範圍 RANGE，field 即上述欄名。
2. 跨欄：diastolic > systolic 時回 RANGE，field 為 `diastolic`。
3. 分級（§5 字面表，依序判定，先中即停）：
   - 收縮壓 > 180 或舒張壓 > 120 → `crisis`；
   - 否則收縮壓 ≥ 140 或舒張壓 ≥ 90 → `stage2`；
   - 否則收縮壓 ≥ 130 或舒張壓 ≥ 80 → `stage1`；
   - 否則收縮壓 ≥ 120 → `elevated`（到此舒張壓必 < 80，否則已落入 stage1）；
   - 否則 → `normal`。
   收縮壓與舒張壓落在不同級時取較高者（此判定順序即實現該規則）。
4. 結果 `{systolic, diastolic, category, categoryZh, categoryEn, adviceZh, adviceEn}`；`category` 為 `normal`／`elevated`／`stage1`／`stage2`／`crisis` 之一；中英名稱與提醒文字一字不差取自 §5 釘版表。輸出數值均為驗過的小安全整數。機器值不隨 locale 改。

固定下載 `blood-pressure-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/blood-pressure-checker/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

### 釘版分級表（AHA/ACC 2017）

來源：Whelton PK et al., 2017 ACC/AHA/AAPA/ABC/ACPM/AGS/APhA/ASH/ASPC/NMA/PCNA Guideline for the Prevention, Detection, Evaluation, and Management of High Blood Pressure in Adults, *Hypertension* 2018;71(6):e13–e115（Table 4 "Categories of BP in Adults"）；AHA 公開說明頁 <https://www.heart.org/en/health-topics/high-blood-pressure/blood-pressure-explained/>（2026-11-21 核對，兩處一致）。作者以來源核實概念筆記：五級閾值全部正確，無需修正。危象採嚴格大於（>180 及/或 >120），180/120 整數值本身不屬危象。

| 分級 ID | 中文 | English | 收縮壓 SBP (mmHg) |  | 舒張壓 DBP (mmHg) |
| --- | --- | --- | --- | --- | --- |
| `normal` | 正常 | Normal | < 120 | and | < 80 |
| `elevated` | 偏高 | Elevated | 120–129 | and | < 80 |
| `stage1` | 第一期高血壓 | Stage 1 Hypertension | 130–139 | or | 80–89 |
| `stage2` | 第二期高血壓 | Stage 2 Hypertension | ≥ 140 | or | ≥ 90 |
| `crisis` | 高血壓危象 | Hypertensive Crisis | > 180 | and/or | > 120 |

### 釘版一般性提醒（每級一則，非醫療建議）

| 分級 ID | 提醒 zh | Advice en |
| --- | --- | --- |
| `normal` | 維持健康生活型態，定期量測血壓。 | Maintain a healthy lifestyle and check your blood pressure regularly. |
| `elevated` | 建議調整生活型態，3–6 個月後再量測。 | Consider lifestyle changes and recheck in 3–6 months. |
| `stage1` | 建議調整生活型態，評估心血管風險，必要時諮詢醫師。 | Consider lifestyle changes, assess cardiovascular risk, and consult a physician if needed. |
| `stage2` | 建議諮詢醫師，討論生活型態調整與藥物治療。 | Consult a physician to discuss lifestyle changes and medication. |
| `crisis` | 血壓極高，請盡快就醫；若出現胸痛、呼吸困難、視力變化等症狀，請立即就醫或撥打 119。 | Blood pressure is very high — seek medical care promptly. If you have chest pain, shortness of breath, or vision changes, seek emergency care or call 119. |

提醒文字為作者依指引的追蹤建議改寫的一般性敘述，不構成個人醫療建議；每級提醒皆與釘版免責聲明一同顯示。

### 釘版免責聲明（原文，結果區與報告皆顯示）

- zh：「本工具僅供參考，不能取代專業醫療建議、診斷或治療。如有疑慮，請諮詢醫師或醫療專業人員。」
- en："This tool is for reference only and is not a substitute for professional medical advice, diagnosis, or treatment. If you have concerns, consult a physician or healthcare professional."

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「查詢分級」，畫面和完整報告符合核心 fixtures，使用者取得對應產物；五級分級皆有真實輸入證據。 |
| boundaries | 合法端點（119/79、120/79、129/79、130/80、140/90、180/120）、剛好越界（120/80 由偏高跨入第一期、181/120 與 180/121 跨入危象）、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；危象結果有文字及符號提示，不只靠顏色。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。17 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `normal-typical` | 典型正常血壓 |
| `normal-boundary` | 正常上限邊界：119/79 仍為正常 |
| `elevated-typical` | 典型偏高：收縮壓 120–129 且舒張壓 <80 |
| `elevated-boundary-low` | 偏高下限邊界：120/79 |
| `elevated-boundary-high` | 偏高上限邊界：129/79 |
| `stage1-systolic` | 第一期：收縮壓 130–139 決定分級 |
| `stage1-diastolic` | 第一期：舒張壓 80–89 決定分級，取較高者 |
| `stage1-boundary` | 第一期下限邊界：130/80 |
| `stage2-systolic` | 第二期：收縮壓 ≥140 決定分級 |
| `stage2-diastolic` | 第二期：舒張壓 ≥90 決定分級，取較高者 |
| `stage2-boundary` | 第二期下限邊界：140/90 |
| `crisis-systolic` | 危象：收縮壓 >180 |
| `crisis-diastolic` | 危象：舒張壓 >120 |
| `crisis-boundary-not` | 危象邊界：180/120 不屬危象（嚴格大於），為第二期 |
| `decimal-systolic` | 不接受小數收縮壓 |
| `diastolic-above-systolic` | 舒張壓高於收縮壓不合理，跨欄錯誤 |
| `systolic-out-of-range` | 收縮壓超出 40–300 範圍 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 SBP=40、300、301、DBP=20、200、201、DBP=SBP（合法）、DBP=SBP+1（跨欄錯誤）、空字串 EMPTY、非數字 INTEGER_FORMAT。所有已接受的結果皆與釘版表一致；危象邊界 180/120 與 181/120、180/121 皆有區分。

候選 gate（均 NOT_RUN）

- 於 `tools/blood-pressure-checker/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「血壓分級」，title「血壓分級｜Gloss Tools」，description「輸入收縮壓與舒張壓，對照 AHA/ACC 2017 分級表，立即知道這次量測落在哪一級。僅供參考，非醫療建議。」。英文 lang=en，H1 “Blood Pressure Checker”，title “Blood Pressure Checker | Gloss Tools”，description “Enter systolic and diastolic pressure to see the AHA/ACC 2017 category for a single reading. For reference only, not medical advice.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。單次量測就能診斷高血壓嗎？不能；分級以單次量測對照，高血壓診斷需多次量測與醫師評估。 / Can one reading diagnose hypertension? No; this classifies a single reading. Diagnosis needs repeated measurements and a physician's evaluation.
- FAQ。收縮壓與舒張壓落在不同級時取哪一級？取較高者。 / If systolic and diastolic fall in different categories, which one applies? The higher category.
- FAQ。180/120 算高血壓危象嗎？不算；危象是收縮壓高於 180 或舒張壓高於 120（嚴格大於），180/120 本身為第二期。 / Is 180/120 a hypertensive crisis? No; a crisis is systolic above 180 or diastolic above 120 (strictly greater), so 180/120 itself is Stage 2.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://blood-pressure-checker.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/blood-pressure-checker/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

# 三大營養素分配計算機 / Macro Split Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-macro-split-calculator-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者已經有每日熱量目標（教練、營養師給的，或自己訂的），要把目標依飲食比例換算成蛋白質、碳水化合物、脂肪各要吃幾克，並且知道取整數克之後回算熱量和目標差多少、可平均分到幾餐。

- 桌面。桌邊對著食譜或採買清單，把 2,000 kcal 與想用的比例換成克數，再分到三餐。
- 行動。手機在超市或餐廳前快速核對另一組熱量與比例，不記錄任何飲食內容。

使用情境為飲食規劃的算術換算。資料只保留在目前頁面草稿。

## scope

給定熱量目標與百分比，固定換算為克數、回算熱量與每餐分配。非目標為計算熱量目標本身、依體重以 g/kg 推蛋白質、食物資料庫、餐點或食譜建議、醫療或營養處方、飲食記錄與追蹤、把結果當醫療建議。

已與基線 `ad0dd21` 的 `docs/specs/` 101 份預案、`sources/candidates/` 與 `tools/` 比對，最相近者的實質差異如下。

- 由身高、體重與活動量估算熱量需求與目標。此處不估算需求，熱量目標由使用者直接給定，只做比例到克數的換算與捨入漂移處理。 [spec-bmi-tdee-calculator](https://github.com/KYStr/glossquote-labs-home/blob/0eb1f4f0c5934e46cb0c9c59c1508c527992f691/docs/specs/bmi-tdee-calculator/SPEC.md)

判定規則由本文定義。能量係數採一般營養通則（Atwater 通用係數：蛋白質 4、碳水化合物 4、脂肪 9 kcal/g），在本文固定，不查線上資料或外部服務。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「每日熱量目標與飲食比例 / Daily calorie target and diet preset」
- 欄位或說明「自訂百分比與每餐分配 / Custom percentages and per-meal split」
- 「計算三大營養素克數 / Calculate macro grams」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「每種營養素克數與回算熱量 / Grams per macro and implied calories」先摘要（回算總熱量與目標差）再列細節，需要時再列每餐分配。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。含調整時以文字及符號標示被調整的營養素與回算差。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"calories":"2000","preset":"balanced","proteinPct":"","carbsPct":"","fatPct":"","meals":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

- `calories`：ASCII 十進整數字串，0 或非零開頭，無空白／符號／小數／指數，raw 最多 8 字元。範圍 800–10,000 kcal。
- `preset`：字串枚舉 `balanced`、`high-protein`、`low-carb`、`keto`、`custom`。預設比例（蛋白質／碳水／脂肪 %）固定如下：`balanced` 30/40/30、`high-protein` 40/30/30、`low-carb` 35/25/40、`keto` 20/5/75。非 `custom` 時 `proteinPct`、`carbsPct`、`fatPct` 三欄完全忽略，不驗證、不讀值。
- `proteinPct`、`carbsPct`、`fatPct`：僅 `preset="custom"` 時必填且驗證。同整數字串文法，raw 每欄最多 8 字元，範圍 0–100。三欄皆過後檢查總和恰為 100，否則 RATIO_SUM，field=null。
- `meals`：空字串表示不分餐；否則同整數字串文法，範圍 1–6（餐數）。
- 預設 `calories` 2000、`preset` balanced、三個 pct 欄空字串、`meals` 空字串。

先整體形狀（SCHEMA），再依 `calories`、`preset`、（custom 時 `proteinPct`、`carbsPct`、`fatPct`、總和）、`meals` 順序驗證。每欄順序：容量 INPUT_LIMIT、缺內容 EMPTY、文法 INTEGER_FORMAT（`preset` 不符枚舉為 ENUM）、範圍 RANGE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算全程以精確有理數或整數運算，禁用浮點決定結果。設 T=`calories`，生效百分比 pct（蛋白質 P、碳水 C、脂肪 F），能量係數 f：P=4、C=4、F=9 kcal/g。roundHalfUp(x)=⌊x+1/2⌋，⌊⌋為數學 floor。

1. 每種營養素精確熱量 K=T·pct/100，精確克數 G=K/f。克數 g=roundHalfUp(G)，等價整數式 g=⌊(2·T·pct + 100·f) / (200·f)⌋。
2. 回算熱量 I0=Σ f·g，殘差 R=T−I0（整數，|R|≤8）。
3. 最大營養素 L：T·pct 最大者；同值依蛋白質、碳水、脂肪固定順序取先者。調整量 Δg=⌊R/f_L + 1/2⌋，等價整數式 ⌊(2R + f_L) / (2·f_L)⌋（負數同規則；同距時取較接近 0 的調整）。Δg≠0 時 g_L 加 Δg 且 `adjustedMacro` 為 L 的 id；Δg=0 時不調整且 `adjustedMacro=null`。在固定邊界內 L 的調整前克數恆 ≥30、|Δg|≤2，調整後不為負；此為不變量，實作以案例覆蓋。
4. 最終回算 I=Σ f·g，`deltaKcal`=I−T。各營養素 `kcal`=f·g（最終克數回算，整數精確）。
5. `targetKcal`=roundHalfUp(K)，等價整數式 ⌊(2·T·pct + 100) / 200⌋。僅供顯示與報告，不參與克數計算；三者顯示和不保證等於 T，不得以顯示值反推。
6. 分餐（meals=N≥1）以調整後克數逐營養素獨立分配：base=⌊g/N⌋，餘數 r=g−base·N，前 r 餐各 +1 克（餐序 1..N）。每餐 `kcal`=4·該餐蛋白質 + 4·該餐碳水 + 9·該餐脂肪。各餐克數總和恆等於全日克數，各餐 kcal 總和恆等於 I。

結果固定形狀：`{calories, ratios:{protein,carbs,fat}, macros:[{id,pct,targetKcal,grams,kcal}]（依 protein、carbs、fat 順序）, adjustedMacro, impliedKcal, deltaKcal, meals}`，`meals` 為 null 或 `{count, items:[{index,protein,carbs,fat,kcal}]}`。用表格或標示克數與回算熱量的列表呈現，不用綠色暗示醫療或飲食成效。

固定下載 `macro-split-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/macro-split-calculator/`。`public/js/core/` 放純驗證、推導、格式化（solve 與 flow），`public/js/app.js` 用安全 DOM API 綁表單，`public/js/worker.mjs` 為固定訊息處理器。`public/index.html` 和 `public/en/index.html` 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算三大營養素克數」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、總和錯誤與三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。8 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `balanced-2000` | 均衡預設與漂移吸收（碳水 −1 克） |
| `lowcarb-1650-drift` | 低碳預設與漂移吸收（脂肪 +1 克） |
| `keto-1800-drift-kept` | 殘差存在但調整量為 0，差明示保留 |
| `custom-single-macro` | 自訂 100/0/0 邊界 |
| `meals-three-split` | 三餐分配與餘數配前餐 |
| `custom-ratio-sum` | 自訂總和不為 100 |
| `calories-below-min` | 熱量剛好低於下限 |
| `calories-decimal` | 不接受小數熱量 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法端點熱量 800 與 10,000、剛好越界 799 與 10,001、自訂總和 99 與 101、單欄 pct 101 先回 RANGE 而非 RATIO_SUM、具名預設時 pct 欄位帶任意值仍被忽略、自訂最大營養素同值（40/40/20）取蛋白質、meals 1 與 6、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。不變量：各餐克數總和等於全日克數、各餐 kcal 總和等於 impliedKcal、調整後克數不為負、deltaKcal 恆等於 impliedKcal−calories。

候選 gate（均 NOT_RUN）

- 於 `tools/macro-split-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「三大營養素分配計算機」，title「三大營養素分配計算機｜Gloss Tools」，description「輸入每日熱量目標與飲食比例（均衡、高蛋白、低碳、生酮或自訂），換算蛋白質、碳水化合物與脂肪的每日克數、回算熱量與每餐分配。」。英文 lang=en，H1 “Macro Split Calculator”，title “Macro Split Calculator | Gloss Tools”，description “Turn a daily calorie target and a diet ratio (balanced, high-protein, low-carb, keto or custom) into grams of protein, carbs and fat, with implied calories and an optional per-meal split.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- 一般營養資訊說明（兩頁固定文案，逐字使用）。繁中：「本工具依一般營養通則換算：蛋白質與碳水化合物每克 4 大卡、脂肪每克 9 大卡。結果僅供一般飲食規劃參考，不構成醫療或營養處方；有疾病、懷孕或特殊飲食需求時，請諮詢醫師或營養師。」英文：“This tool uses the general nutrition conversion of 4 kcal per gram of protein and carbohydrate and 9 kcal per gram of fat. Results are general dietary-planning information only, not medical or nutrition advice; consult a physician or dietitian if you have a medical condition, are pregnant, or have special dietary needs.”
- FAQ。克數回算的熱量為什麼和目標不完全相等？克數取整數克，最大營養素已按固定規則吸收捨入差，剩餘差額以回算差明示。 / Why doesn't the implied total match the target exactly? Grams are whole numbers; the largest macro absorbs the rounding drift by a fixed rule and any remaining difference is shown.
- FAQ。熱量目標從哪裡來？由你輸入，本工具不計算熱量需求。 / Where does the calorie target come from? You enter it; this tool does not estimate calorie needs.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://macro-split-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。規格任務 `labs-macro-split-calculator-spec-20261109` 由主代理登記；本文作者未執行 registry 操作。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/macro-split-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

# 食物保存期限 / Food Storage Guide

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-food-storage-guide-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者打開冰箱或櫥櫃，看到一份買了幾天的食物，不確定還能不能安全吃、該今天吃掉還是丟掉。查一樣食物、一個存放位置、一個開始日期，得到安全期限（保守下限）、品質上限、還剩幾天與三段狀態（仍在期限內／儘快使用／已過期），並附安全提醒。

- 桌面。桌面在家備餐前一次查幾樣食物，對照買入或開封日期，決定今天煮什麼、什麼該丟。
- 行動。手機站在冰箱前查一樣食物，立刻看到還剩幾天。

使用情境為設計假設。資料只保留在目前頁面草稿。保存天數是 USDA FoodKeeper 的字面數據，不是包裝上的日期，也不是醫療或營養建議；有疑慮時丟掉，不要憑外觀或氣味判斷。

## scope

30 項釘版食物 × 常溫／冷藏／冷凍三種存放位置的保存天數表（字面數據，出處見 implementation），輸入開始日期後算出安全期限與剩餘天數。MVP 必做：品項選擇、位置選擇、開封切換、開始日期、今天日期（可改）、安全期限／品質上限／剩餘天數／三段狀態、包裝期限品項的特殊路徑、無數據與不建議冷凍的明確錯誤、雙語靜態頁、報告下載。

非目標：採買清單、食譜份量換算、庫存盤點、營養或熱量、即時查詢線上資料庫、掃描條碼、推播提醒、帳號或雲端同步、判斷食物實際是否變質（本工具只算日期，不看、不聞、不嘗）。

已與 registry 及既有工具比對，最相近者的實質差異如下。

- pantry-plan（食材差額採買單，`sources/legacy/pantry-plan/`）：把數道料理的材料需求合併，扣掉現有庫存，產出「還要買多少」的採買缺額清單；其 README 明言「此工具不判斷飲食、營養或保存安全」。此處不做任何採買或缺額計算，只做「一樣食物在一個位置能放幾天、到哪天過期」的安全期限表與日期推導。兩者輸入、輸出與判定規則完全不同。
- grocery-budget-calculator（採買預算）：按家戶組成算每週／每月食物預算（USDA 食物計畫表），是金額估算，不查任何品項的保存天數。
- 既有冷藏／冷凍天數皆為其他工具的附帶說明，沒有任何工具以保存期限表本身為主體。

判定規則由本文定義，無線上資料或外部服務依賴。30 項以外的食物不在表內，不猜測、不以近似品項代替。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「食物品項 / Food item」：30 項下拉選單，依分類分組（乳品與蛋、肉與禽、海鮮、水果、蔬菜、麵包／乾貨／調味／罐頭／剩菜）。
- 欄位或說明「存放位置 / Storage location」：常溫／冷藏／冷凍三選一。
- 欄位或說明「已開封 / Opened」：切換；只在該品項該位置有開封專屬數據時影響結果，否則忽略（不報錯）。
- 欄位或說明「開始日期 / Start date」：買入日（未開封）、開封日（已開封）、烹調日（熟食／剩菜），`YYYY-MM-DD`。
- 欄位或說明「今天日期 / Today」：預設為裝置當地日曆日期，可改；字面案例一律明示此欄，結果才可重現。
- 欄位或說明「包裝使用期限 / Package use-by date」：只在所選品項與位置無天數、改以包裝期限為準時（牛奶冷藏）出現並必填。
- 「查詢保存期限 / Check storage life」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「安全期限與剩餘天數 / Safe-until date and days remaining」先摘要（狀態＋剩幾天＋安全期限）再列細節（品質上限、適用天數範圍、開始日期）。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 結果下方固定顯示安全提醒（雙語）：「冰箱 ≤ 4°C（40°F），冷凍庫 ≤ −18°C（0°F）。熟食與易腐食物應在 2 小時內冷藏。有疑慮就丟掉，不要憑外觀或氣味判斷。/ Keep the fridge at or below 4°C (40°F) and the freezer at or below −18°C (0°F). Refrigerate cooked and perishable food within 2 hours. When in doubt, throw it out — do not judge by look or smell.」

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"item":"eggs-in-shell","location":"fridge","opened":false,"startDate":"","todayDate":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- `item`：30 項釘版 id 之一（見 implementation 的表），字串，必填。
- `location`：`pantry`（常溫）／`fridge`（冷藏）／`freezer`（冷凍），必填。
- `opened`：布林，預設 `false`。
- `startDate`：`YYYY-MM-DD`，西曆真實日期，年份 2000–2100，必填。
- `todayDate`：`YYYY-MM-DD`，同上；省略時取裝置當地日曆日期；字面案例一律明示。
- `packageDate`：`YYYY-MM-DD`，同上；只在查表結果為包裝期限（`PKG`）時必填，其餘情況忽略（不報錯）。
- 每個原始字串欄最多 64 個字元，超限 INPUT_LIMIT。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

驗證順序（欄位順序即報錯優先順序）：

1. `item`：不在 30 項 id 內 → SCHEMA，field `item`。`location` 不在三者內 → SCHEMA，field `location`。`opened` 非布林 → SCHEMA，field `opened`。
2. `startDate`：非 `YYYY-MM-DD` 形狀 → DATE_FORMAT；形狀對但不是真實西曆日期（如 2026-02-30），或年份超出 2000–2100 → DATE_RANGE，field `startDate`。`todayDate`（若提供）同規則，field `todayDate`。
3. 查表（見 implementation）：該品項該位置該開封狀態的儲存格為 `PKG` 時，`packageDate` 缺失 → PACKAGE_DATE_REQUIRED，field `packageDate`；提供時同第 2 步驗日期，錯則 DATE_FORMAT／DATE_RANGE，field `packageDate`。
4. 儲存格為 `NR`（明確不建議）→ NOT_RECOMMENDED，field `location`。儲存格為空（FoodKeeper 無該組合數據）→ NOT_APPLICABLE，field `location`。

計算（全部為純日曆日整數運算，無浮點、無時區換算；日期加法以 UTC 日曆日為準，與主機時區無關）：

1. 一般路徑：`safeUntil = startDate + minDays`，`bestUntil = startDate + maxDays`，`rangeDays = {min, max}`，`note = null`。安全期限一律取範圍下限（保守值）；上限是品質上限，不是安全期限。
2. 包裝期限路徑（`PKG`）：`safeUntil = bestUntil = packageDate`，`rangeDays = null`，`note = "依包裝上的使用期限 / Follow the use-by date on the package."`。
3. `remainingDays = safeUntil − todayDate`（整數天，可為負）。
4. `status`：`remainingDays < 0` → `expired`（已過期）；`0 ≤ remainingDays ≤ 2` → `use-soon`（儘快使用）；`remainingDays ≥ 3` → `fresh`（仍在期限內）。`remainingDays = 0` 表示今天就是安全期限最後一天，屬 `use-soon`。
5. 結果 `{item, location, opened, startDate, safeUntil, bestUntil, rangeDays, remainingDays, status, note}`，鍵名固定此順序（下載序列化時另按 UTF-16 code units 排序，見下）。

固定下載 `food-storage-guide-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/food-storage-guide/`。src/core.mjs 放純驗證、查表、日期推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

### 釘版數據表（字面數據，出處與換算釘版）

來源：美國農業部食品安全檢驗局（USDA FSIS）FoodKeeper，經 Cornell University 與 Food Marketing Institute 共同開發，涵蓋 650 餘種食物；本表 30 項逐項對照 FoodKeeper 品項編號（見下表 `fk` 欄），數值為 FoodKeeper 原文照錄。肉類／蛋／剩菜的冷藏值另與 FoodSafety.gov（HHS／USDA／FDA／CDC 聯合網站）的 Cold Food Storage Chart 交叉核對一致（絞肉 1–2 天、牛排 3–5 天、帶殼蛋 3–5 週、剩菜 3–4 天）。查表日期 2026-11-21。

單位換算（釘版，FoodKeeper 原文以週／月／年表示者一律先換算為天再入表）：1 週 = 7 天，1 個月 = 30 天，1 年 = 365 天。範圍一律照錄原文區間，不取中點、不四捨五入。

儲存格記號：`{min–max}` 為天數區間；`—` 為 FoodKeeper 無該組合數據（查表結果 NOT_APPLICABLE）；`PKG` 為以包裝使用期限為準（查表結果走包裝期限路徑）；`NR` 為 FoodKeeper 明確不建議（查表結果 NOT_RECOMMENDED）。開封欄只列出 FoodKeeper 有區分的品項；其餘品項開封與未開封共用同一值，`opened` 切換不影響結果。

| id | 品項 zh / en | fk | 常溫 pantry | 冷藏 fridge | 冷凍 freezer |
| --- | --- | --- | --- | --- | --- |
| milk | 牛奶 / Milk | 27 | — | PKG | 90–90 |
| butter | 奶油 / Butter | 1 | — | 30–60 | 180–270 |
| hard-cheese | 硬質起司 / Hard cheese | 3 | — | 未開封 180–180；已開封 21–28 | 180–180 |
| soft-cheese | 軟質起司 / Soft cheese | 7 | — | 7–14 | 180–180 |
| yogurt | 優格 / Yogurt | 33 | — | 7–14 | 30–60 |
| eggs-in-shell | 帶殼生雞蛋 / Eggs in shell | 21 | — | 21–35 | NR |
| hard-boiled-eggs | 水煮蛋 / Hard-boiled eggs | 23 | — | 7–7 | NR |
| beef-steaks | 牛排 / Beef steaks | 40 | — | 3–5 | 120–365 |
| ground-beef | 絞肉（牛） / Ground beef | 43 | — | 1–2 | 90–120 |
| pork-chops | 豬排 / Pork chops | 63 | — | 3–5 | 120–365 |
| whole-chicken | 全雞 / Whole chicken | 113 | — | 1–2 | 365–365 |
| chicken-breast | 雞胸肉 / Chicken breast | 117 | — | 1–2 | 270–270 |
| bacon | 培根 / Bacon | 79 | — | 7–7 | 30–30 |
| hot-dogs | 熱狗 / Hot dogs | 98 | — | 未開封 14–14；已開封 7–7 | 30–60 |
| rotisserie-chicken | 烤雞（熟） / Rotisserie chicken | 141 | — | 3–4 | 120–120 |
| lean-fish | 白肉魚 / Lean fish | 144 | — | 1–2 | 180–240 |
| fatty-fish | 油脂魚 / Fatty fish | 146 | — | 1–2 | 60–90 |
| shrimp | 蝦 / Shrimp | 151 | — | 1–3 | 180–540 |
| apples | 蘋果 / Apples | 248 | 21–21 | 28–42 | 240–240 |
| bananas | 香蕉 / Bananas | 251 | —（待熟，無天數） | 3–3 | 60–90 |
| blueberries | 藍莓 / Blueberries | 254 | — | 7–14 | 240–365 |
| broccoli | 花椰菜 / Broccoli | 276 | — | 3–5 | 300–365 |
| carrots | 胡蘿蔔 / Carrots | 279 | — | 14–21 | 300–365 |
| onions | 洋蔥 / Onions | 294 | 30–30 | 60–60 | 300–365 |
| potatoes | 馬鈴薯 / Potatoes | 297 | 30–60 | 7–14 | 300–365 |
| bread | 麵包 / Bread | 195 | 14–18 | 未開封 —；已開封 14–21 | 90–150 |
| white-rice | 白米 / White rice | 338 | 未開封 730–730；已開封 365–365 | 未開封 —；已開封 180–180 | — |
| canned-soup | 罐頭湯 / Canned soup | 372 | 730–1825 | 未開封 —；已開封 3–4 | — |
| leftovers-with-meat | 剩菜（含肉） / Leftovers with meat | 173 | — | 3–4 | 60–90 |
| ketchup | 番茄醬 / Ketchup | 348 | 365–365 | 未開封 —；已開封 180–180 | — |

溫度前提（釘版，顯示於結果頁，不參與計算）：冷藏 ≤ 4°C（40°F），冷凍 ≤ −18°C（0°F），常溫為陰涼乾燥處。冷凍時間是品質期限：全程保持 −18°C 以下的食物，過了冷凍期限仍屬安全，但風味與質地下降；冷藏期限是安全期限，過了就丟。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「查詢保存期限」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。12 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `ground-beef-fridge-use-soon` | 絞肉冷藏：剩 1 天，儘快使用 |
| `eggs-fridge-fresh` | 帶殼雞蛋冷藏：剩 12 天，仍在期限內 |
| `leftovers-expired` | 剩菜冷藏：已過安全期限 2 天 |
| `whole-chicken-freezer-year` | 全雞冷凍：單一值 365 天，剩 345 天 |
| `milk-fridge-package-date` | 牛奶冷藏：無天數，以包裝使用期限為準 |
| `milk-freezer-90` | 牛奶冷凍：3 個月換算 90 天，跨年計算 |
| `bread-pantry-boundary-zero` | 麵包常溫：今天正好是安全期限最後一天，剩 0 天 |
| `hot-dogs-opened-differs` | 熱狗冷藏已開封：開封值 7 天，與未開封 14 天不同 |
| `canned-soup-pantry-long` | 罐頭湯常溫：2–5 年換算 730–1825 天，跨閏年計算 |
| `ground-beef-pantry-not-applicable` | 生絞肉放常溫：該位置無 FoodKeeper 數據 |
| `eggs-freezer-not-recommended` | 帶殼雞蛋冷凍：FoodKeeper 明確不建議冷凍 |
| `invalid-start-date` | 不存在的日期 2026-02-30 不接受 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 remainingDays = 2 與 3 的狀態分界（use-soon／fresh）、remainingDays = 0、packageDate 缺失與錯誤格式、opened 切換在無開封區分品項上不影響結果、未開封麵包冷藏（無未開封數據）報 NOT_APPLICABLE、startDate 年份 1999 與 2101 報 DATE_RANGE、item 不在 30 項內報 SCHEMA。所有已接受的 safeUntil 皆為 startDate 加下限天數，bestUntil 皆為 startDate 加上限天數。

候選 gate（均 NOT_RUN）

- 於 `tools/food-storage-guide/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「食物保存期限」，title「食物保存期限｜Gloss Tools」，description「查一樣食物在常溫、冷藏或冷凍能放幾天：對照 USDA FoodKeeper 的保存天數，算出安全期限與剩餘天數。」。英文 lang=en，H1 “Food Storage Guide”，title “Food Storage Guide | Gloss Tools”，description “Look up how long a food keeps in the pantry, fridge or freezer: USDA FoodKeeper storage times, a safe-until date and days remaining.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。安全期限怎麼算？開始日期加上該食物該位置保存天數範圍的下限；上限是品質期限。 / How is the safe-until date calculated? The start date plus the lower end of the storage-time range for that food and location; the upper end is the quality limit.
- FAQ。冷凍過期了還能吃嗎？全程保持 −18°C 以下的食物，過了冷凍期限仍屬安全，但風味與質地會下降；冷藏期限過了就丟。 / Is food safe after its freezer time? If kept at or below −18°C the whole time it stays safe past the freezer time, but quality drops; past a fridge time, throw it out.
- FAQ。為什麼牛奶冷藏沒有天數？FoodKeeper 對牛奶冷藏以包裝上的使用期限為準，請輸入包裝日期。 / Why does milk have no fridge days? FoodKeeper defers to the use-by date on the package for refrigerated milk; enter that date.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://food-storage-guide.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線以開 PR 時的 `codex/initial-publication` 最新 FETCH_HEAD 為準，開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/food-storage-guide/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

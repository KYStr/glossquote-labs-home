# 寵物餵食量計算 / Pet Feeding Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-pet-feeding-calculator-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

飼主換新飼料或接回幼犬幼貓時，手上有寵物體重和包裝上的熱量標示（每 100 公克或每杯的大卡），現在只能憑感覺抓餵食量。需要用公開獸醫營養指引的 RER／DER 算法，得到每日總熱量、每日飼料克數（與杯數），以及分餐後每餐的量，並清楚知道這是估算起點、實際餵食以體態與獸醫建議為準。

- 桌面。在家比對新舊飼料包裝標示，算出新飼料一天餵多少克、分兩餐各多少，再決定要不要調整。
- 行動。在寵物用品店用手機輸入包裝上的熱量數字，當場試算每日用量，估算一包飼料可以吃幾天。

使用情境為日常餵養估算。資料只保留在目前頁面草稿。

## scope

MVP：狗、貓兩物種；RER = 70 × 體重(kg)^0.75；DER = RER × 生命階段倍率（釘版表見 inputsOutputs，出處與查證紀錄見 AUTHOR-CHECK.md）；飼料熱量密度每 100 公克必填、每杯選填；輸出每日 kcal（RER 與 DER）、克數、杯數與每日 1–6 餐的逐餐分配，逐餐整數合計恆等於全日量。

非目標：懷孕、哺乳、工作犬、重症照護的餵食列（公開來源對這些列僅給依週數、窩數或工作量變動的範圍，沒有單一可釘版值，見 AUTHOR-CHECK.md 的省略紀錄）；增重處方列（來源僅給範圍）；老齡列（來源僅給範圍或未列）；體態評分（BCS）判讀或評分；體重追蹤與歷史紀錄；乾濕混合餵食的比例分配；零食熱量扣除；處方飼料與疾病營養；獸醫診斷或醫療建議；飼料資料庫、品牌搜尋或條碼掃描；公斤以外單位（僅 kg 輸入）。

已與本 checkout 的 101 份預案比對，最相近者的實質差異如下。

- 人類的 BMI 與 TDEE 試算。此處是犬貓的 RER 冪次公式與物種別 DER 倍率表，輸出為飼料克數／杯數與逐餐分配。 [bmi-tdee-calculator](https://github.com/KYStr/glossquote-labs-home/blob/d45a73be0b9d65748532250d8a07cff8fe7c296b/docs/specs/bmi-tdee-calculator/SPEC.md)
- 同批（run 5）的人類嬰兒奶量試算依體重線性 ml/kg 分餐。此處為冪次 RER、物種別倍率表與熱量密度換算，物種、公式與族群皆不同（該案未併入本分支，僅此註記）。

判定規則由本文定義；倍率表為釘版字面資料，來源僅供出處註記，產品無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「物種、生命階段 / Species and life stage」
- 欄位或說明「體重（公斤） / Weight (kg)」
- 欄位或說明「飼料熱量：每 100 公克（必填）、每杯（選填） / Food energy: kcal per 100 g (required), kcal per cup (optional)」
- 欄位或說明「每日餐數 / Meals per day」
- 「計算每日餵食量 / Calculate daily feeding amount」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「每日熱量與餵食量 / Daily calories and food amount」先摘要（DER 大卡、每日克數、每日杯數）再列 RER 與逐餐分配。估算聲明（原文見 tests 節）常駐結果區頂部，捲動時不消失；選用減重列時另顯示減重附註（原文見 tests 節）。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 生命階段選單依物種連動，只列該物種的列。切換物種時若目前階段不屬新物種，階段自動回該物種的 `adult-neutered` 並回到 dirty；若仍屬新物種（兩物種共有的列名）則保留。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果含聲明與（適用時）減重附註。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"species":"dog","lifeStage":"adult-neutered","weightKg":"10","foodKcalPer100g":"360","foodKcalPerCup":"","mealsPerDay":"2"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切六個欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

| 欄位 | 文法 | raw 容量（UTF-16 單位） | 範圍／成員 | 預設 |
| --- | --- | --- | --- | --- |
| species | 列舉 `dog`／`cat` | 8 | — | `dog` |
| lifeStage | 列舉，成員依 species（見倍率表） | 32 | — | `adult-neutered` |
| weightKg | 十進位文法（下述） | 8 | dog 0.5–100、cat 0.5–20（依 species） | `10` |
| foodKcalPer100g | 十進位文法 | 8 | 20–900 kcal/100 g，必填 | `360` |
| foodKcalPerCup | 十進位文法 | 8 | 50–1500 kcal/cup，選填 | （空字串） |
| mealsPerDay | 整數文法 | 8 | 1–6 | `2` |

- 十進位文法：`^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$`，ASCII 數字、至多兩位小數、無空白／正負號／指數／前置零（`0` 本身除外）。整數文法：`^(0|[1-9][0-9]*)$`。
- lifeStage 容量釘為 32：最長合法值 `puppy-4-months-to-adult` 為 23 單位，超過數值欄的 8 單位慣例，故本欄容量明示放寬；其餘欄維持 8。
- foodKcalPerCup 為選填：空字串視為未提供，略過其 EMPTY／文法／範圍檢查（容量與 UNICODE 仍檢查），結果的 cupsPerDay 與 perMealCups 為 null。其餘欄空字串為 EMPTY。
- 體重範圍理由：dog 0.5–100 kg 涵蓋離乳玩具犬幼犬至巨型犬；cat 0.5–20 kg 涵蓋離乳幼貓至最重的家貓，且減重列的對象（肥胖貓）可超過 15 kg，故上限釘 20 而非 15。密度範圍為防呆護欄：每 100 公克 20–900 涵蓋濕食（約 50–130）與乾食（約 300–550）並留餘裕；每杯 50–1500 涵蓋低熱量至高能量飼料。範圍外回 RANGE 並顯示欄位訊息，不做營養主張。

驗證順序固定。先逐欄，欄序為 species、lifeStage、weightKg、foodKcalPer100g、foodKcalPerCup、mealsPerDay；每欄內依序容量 INPUT_LIMIT、未成對 surrogate UNICODE、EMPTY、文法（列舉 ENUM／十進位 DECIMAL_FORMAT／整數 INTEGER_FORMAT）、RANGE。lifeStage 的 ENUM 成員以已驗證的 species 集合判定，只屬另一物種的值亦為 ENUM（field=lifeStage）。整份失敗回 `{ok:false,error:{code,field,row}}`，本工具 row 恆為 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

生命階段倍率表（釘版字面資料；主來源 MSD Veterinary Manual 表「Daily Maintenance Energy Requirements for Dogs and Cats」，2026-11-09 查證，交叉核對與差異紀錄見 AUTHOR-CHECK.md）。

| species | lifeStage | 倍率 | 標籤（zh-Hant / en） |
| --- | --- | --- | --- |
| dog | puppy-under-4-months | 3.0 | 幼犬（4 個月以下） / Puppy (under 4 months) |
| dog | puppy-4-months-to-adult | 2.0 | 幼犬（4 個月至成犬） / Puppy (4 months to adult) |
| dog | adult-intact | 1.8 | 成犬・未絕育 / Adult dog, intact |
| dog | adult-neutered | 1.6 | 成犬・已絕育 / Adult dog, neutered |
| dog | adult-inactive | 1.4 | 成犬・活動量低或易胖 / Adult dog, inactive or obesity-prone |
| dog | weight-loss | 1.0 | 減重（以理想體重計） / Weight loss (at ideal weight) |
| cat | kitten | 2.5 | 幼貓 / Kitten |
| cat | adult-intact | 1.4 | 成貓・未絕育 / Adult cat, intact |
| cat | adult-neutered | 1.2 | 成貓・已絕育 / Adult cat, neutered |
| cat | adult-inactive | 1.0 | 成貓・活動量低或易胖 / Adult cat, inactive or obesity-prone |
| cat | weight-loss | 0.8 | 減重（以理想體重計） / Weight loss (at ideal weight) |

計算（IEEE-754 雙精度，步驟與捨入位置釘版，不得改序、不得中途捨入）。

1. w = Number(weightKg)（文法保證為純十進位字串）。rerRaw = 70 × Math.pow(w, 0.75)，先 pow 後乘 70。
2. derRaw = rerRaw × 倍率（表中字面值以雙精度字面量代入）。
3. rerKcal = floor(rerRaw + 0.5)；derKcal = floor(derRaw + 0.5)。所有量非負，此即四捨五入至整數大卡。
4. gramsRaw = (derKcal × 100) / Number(foodKcalPer100g)：以**已捨入的 derKcal** 為熱量圖額，先乘 100 再除密度；gramsPerDay = floor(gramsRaw + 0.5)（整數克）。
5. 有提供 foodKcalPerCup 時：cupsRaw = derKcal / Number(foodKcalPerCup)；cupsPerDay = floor(cupsRaw × 100 + 0.5) / 100；每餐杯數一律為 floor((cupsRaw / mealsPerDay) × 100 + 0.5) / 100（逐餐獨立捨入，各餐相同；顯示的逐餐杯數合計可與 cupsPerDay 差至每餐 0.01，屬釘版行為並於頁面註記）。未提供時 cupsPerDay 與 perMealCups 為 null。
6. 整數分餐（熱量與克數共用）：總量 T、餐數 n，base = floor(T / n)，r = T − base × n；前 r 餐各 base + 1，其餘各 base。逐餐合計恆等於 T，餘數由較早的餐依序吸收。

結果 `{species, lifeStage, multiplier, rerKcal, derKcal, gramsPerDay, cupsPerDay, mealsPerDay, perMealKcal, perMealGrams, perMealCups}`。multiplier 為所選列的倍率數字；三個 perMeal 陣列長度皆為 mealsPerDay，順序為餵食順序（第 1 餐在前）；perMealCups 在無每杯熱量時為 null，否則每元素皆為步驟 5 的每餐杯數。

固定下載 `pet-feeding-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/pet-feeding-calculator/`。src/core.mjs 放純驗證、推導、格式化，倍率表為該檔內的字面資料並附出處註解（MSD Veterinary Manual 表名與查證日期 2026-11-09）；src/controller.mjs 管草稿、工作世代、物種連動的階段重置及資源；src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 核心只用 Math.pow 一處超越函數，步驟與捨入位置依 inputsOutputs 釘版順序；整數輸出皆為小安全整數，不需 BigInt。測試 import 同一份核心。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算每日餵食量」，畫面和完整報告符合核心 fixtures（含倍率表 11 列各至少一例），使用者取得對應產物。 |
| boundaries | 兩物種體重端點（0.5／100、0.5／20）與剛好越界、密度與餐數端點、第一個錯誤與欄序、三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、物種連動階段選單、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯（含倍率表標籤與聲明）、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。21 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `dog-neutered-default` | 預設草稿；已絕育成犬，只給每 100 公克熱量 |
| `dog-intact-cups` | 未絕育成犬；同時輸出杯數與每餐杯數 |
| `cat-neutered` | 已絕育成貓；DER 近捨入邊界仍穩定 |
| `cat-kitten` | 幼貓 2.5 倍；三餐恰均分 |
| `dog-puppy-under-4-months` | 幼犬 3.0 倍；分餐餘數由前幾餐吸收 |
| `dog-puppy-4-months` | 幼犬 4 個月至成犬 2.0 倍 |
| `dog-weight-loss` | 犬減重 1.0 倍（目標體重）；單餐 |
| `cat-weight-loss` | 貓減重 0.8 倍，物種別倍率 |
| `cat-intact-cups` | 未絕育成貓；克數整除、杯數兩位小數整值 |
| `dog-inactive` | 犬活動量低列 1.4 倍；單餐 |
| `cat-max-weight` | 貓體重上限 20 kg 邊界合法 |
| `dog-min-weight-puppy` | 犬體重下限 0.5 kg 邊界合法；四餐分配 |
| `cat-decimal-density` | 兩種密度皆帶一位小數的合法輸入 |
| `err-stage-species-mismatch` | 貓選犬專屬階段回 ENUM |
| `err-stage-unknown` | 不存在的階段值回 ENUM |
| `err-weight-range-cat` | 貓體重越上限回 RANGE |
| `err-weight-format` | 體重三位小數回 DECIMAL_FORMAT |
| `err-density-empty` | 必填密度留空回 EMPTY |
| `err-cup-format` | 選填每杯熱量格式錯誤回 DECIMAL_FORMAT |
| `err-meals-range` | 餐數 7 回 RANGE |
| `err-schema-extra-field` | 未知欄位回 SCHEMA |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限（體重 dog 0.49／100.01、cat 20.01；密度 19.99／900.01；每杯 49.99／1500.01；餐數 0／7）、錯型別、缺欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。不變量：每個成功案例 perMealKcal 合計 = derKcal、perMealGrams 合計 = gramsPerDay；cupsPerDay 為 null 當且僅當 foodKcalPerCup 為空字串；multiplier 恆為釘版表中（species, lifeStage）對應值；改變 species 不得讓結果沿用另一物種的列。

候選 gate（均 NOT_RUN）

- 於 `tools/pet-feeding-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、物種切換連動、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「寵物餵食量計算」，title「寵物餵食量計算｜Gloss Tools」，description「依獸醫營養指引的 RER／DER 公式，輸入寵物體重、生命階段與飼料熱量，算出每日熱量、克數、杯數與每餐餵食量。」。英文 lang=en，H1 “Pet Feeding Calculator”，title “Pet Feeding Calculator | Gloss Tools”，description “Estimate daily calories, grams, cups and per-meal amounts for your dog or cat from its weight, life stage and food energy density, using the veterinary RER/DER method.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- 估算聲明（結果區常駐，逐字釘版）。本工具依公開獸醫營養指引估算每日熱量與餵食量，僅供參考。個別寵物的實際需求與估算值差距可達 50%；請以體態評分（BCS）與獸醫師的建議為準，並依寵物的體重與體態變化調整餵食量。 / This tool estimates daily calories and food amounts from published veterinary nutrition guidelines, as a starting point only. An individual pet's actual needs can differ from the estimate by up to 50%. Let body condition score (BCS) and your veterinarian's advice govern actual feeding, and adjust portions as your pet's weight and condition change.
- 減重附註（選用減重列時顯示，逐字釘版）。減重列以理想（目標）體重計算；使用減重列時請輸入目標體重。 / The weight-loss row is calculated at the ideal (target) weight; enter the target weight when using it.
- FAQ。RER 是什麼？靜止能量需求 RER = 70 × 體重（公斤）的 0.75 次方，是寵物休息時維持基本生理機能的每日熱量；每日總需求 DER 再乘上生命階段倍率。 / What is RER? Resting energy requirement: RER = 70 × (weight in kg)^0.75, the daily calories a resting pet needs for basic body functions; the daily requirement (DER) multiplies RER by a life-stage factor.
- FAQ。為什麼和飼料包裝上的建議量不同？包裝建議依該產品的平均假設，本工具依你的寵物體重與生命階段估算；兩者都是起點，個別差異可達 50%，請依體態調整。 / Why does this differ from the feeding guide on the bag? Bag guides assume an average pet eating that product; this tool estimates from your pet's weight and life stage. Both are starting points — individual needs vary by up to 50%, so adjust by body condition.
- FAQ。杯數和克數哪個準？克數較準。杯量會隨飼料顆粒與裝填方式變動；每杯熱量請以該飼料包裝標示為準。 / Cups or grams — which is more accurate? Grams are more accurate. Cup amounts vary with kibble size and how the cup is filled; use the kcal-per-cup figure printed on your food's label.
- FAQ。可以用在懷孕或哺乳中的寵物嗎？不行。懷孕與哺乳的需求依週數與幼崽數量大幅變動，公開指引只給範圍，請諮詢獸醫師。 / Can I use this for a pregnant or nursing pet? No. Needs during gestation and lactation vary widely by stage and litter size, and published guidelines give ranges only — ask your veterinarian.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://pet-feeding.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence（倍率表出處須能對回 AUTHOR-CHECK.md 所列來源原文）。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/pet-feeding-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

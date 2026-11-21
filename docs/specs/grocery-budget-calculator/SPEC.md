# 採買預算試算 / Grocery Budget Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-grocery-budget-calculator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

一家人在每月採買前，先按家裡實際人口組成（成人／各年齡層孩童），對照美國農業部（USDA）公布的食物計畫表，算出這一戶每週與每月在家做飯的食物預算。

- 桌面。家長在桌面填入家中每位成員的年齡層與性別、選 Thrifty 或 Low-cost 計畫，逐步確認每週與每月預算、各年齡層分攤與戶人數調整。
- 行動。手機在超市外或家庭討論中核對一份短的預算表，不啟動任何購買或記帳。

使用情境為家庭預算規劃。資料只保留在目前頁面草稿。金額為美元（USDA 美國平均值），不做匯率換算。

## scope

固定一期 USDA 食物計畫表（2026 年 10 月版，見下文逐字表）、15 組年齡／性別、戶人數調整因子的靜態查表加總模型。非目標為即時物價查詢、外食／外送費用、個人飲食偏好或營養建議、阿拉斯加／夏威夷價格、Moderate-cost／Liberal 計畫、記帳、把結果當 SNAP 補助核定金額。

已與本輪登記比對，最相近者的實質差異如下。

- rent-budget（租金負擔能力）：以收入推算可負擔租金上限，是收入比例規則；此處不看收入，只按人口組成加總 USDA 食物計畫表的每人每週費用，再套 USDA 戶人數調整因子。食物預算與租金負擔能力是兩種不同的預算問題。
- 50-30-20-budget-calculator：以月收入按固定百分比切分需求／想要／儲蓄；此處不切分收入，只算食物這一項的絕對金額。
- food-storage-guide（食物保存期限）：查食物保存天數的對照表；此處查的是每人每週食物費用，輸出是金額不是天數。
- pantry-plan（備料清單）：依食譜與庫存算採買缺口；此處不看食譜與庫存，只按人口組成算預算總額。

判定規則由本文定義，無線上資料或外部服務依賴。表定數據以本文逐字表為準，不隨 USDA 每月更新而變動。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「食物計畫 / Food plan」：Thrifty／Low-cost 二選一。
- 欄位或說明「家中成員／ Household members」：15 組年齡／性別的人數步進器（每組 0–10 人），並即時顯示全戶人數。
- 「計算採買預算 / Calculate grocery budget」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例（USDA 參照四口之家，Thrifty），明示範例並等待手動執行。
- 「每週與每月預算 / Weekly and monthly budget」先摘要（每週總額、每月總額、每人每週、每日平均）再列分攤明細（每組人數、每人每週、該組每週小計、該組每月小計）與戶人數調整行（調整因子與調整金額）。長表在有 label 的區域捲動。超過 25 列採 25 列分頁、上下頁可鍵盤操作，完整匯出不截斷。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"plan":"thrifty","c1":"0","c2_3":"0","c4_5":"0","c6_8":"0","c9_11":"0","f12_13":"0","f14_19":"0","f20_50":"1","f51_70":"0","f71":"0","m12_13":"0","m14_19":"0","m20_50":"1","m51_70":"0","m71":"0"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- `plan`：精確字串 `"thrifty"` 或 `"low-cost"`，預設 `"thrifty"`。
- 15 個人數欄，皆為 ASCII 十進整數字串，0 或非零開頭，無空白／符號／小數／指數，raw 每欄最多 8 單元；每欄 0–10 人。欄位名與年齡／性別組（USDA 原表分組）：
  - `c1` 孩童 1 歲 / Child, 1 year；`c2_3` 孩童 2–3 歲；`c4_5` 孩童 4–5 歲；`c6_8` 孩童 6–8 歲；`c9_11` 孩童 9–11 歲；
  - `f12_13` 女性 12–13 歲；`f14_19` 女性 14–19 歲；`f20_50` 女性 20–50 歲；`f51_70` 女性 51–70 歲；`f71` 女性 71 歲以上；
  - `m12_13` 男性 12–13 歲；`m14_19` 男性 14–19 歲；`m20_50` 男性 20–50 歲；`m51_70` 男性 51–70 歲；`m71` 男性 71 歲以上。
- 全戶人數（15 欄之和）須為 1–20 人。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 `plan`、`c1`、`c2_3`、`c4_5`、`c6_8`、`c9_11`、`f12_13`、`f14_19`、`f20_50`、`f51_70`、`f71`、`m12_13`、`m14_19`、`m20_50`、`m51_70`、`m71` 順序驗證。raw 超限 INPUT_LIMIT、文法 INTEGER_FORMAT、範圍 RANGE，field 即上述欄名。`plan` 不在 `{"thrifty","low-cost"}` 之中亦為 RANGE，field 為 `plan`（RANGE 涵蓋超出固定枚舉的取值）。
2. 跨欄驗證全戶人數：總和為 0 時 `{code:"EMPTY",field:"household",row:null}`；總和大於 20 時 `{code:"RANGE",field:"household",row:null}`。
3. 查表：每人每週費用取下表對應計畫與年齡／性別組的美元值（2026 年 10 月 USDA 報告逐字值，美國平均，四口之家基準）。

### 逐字表 A — Thrifty Food Plan，每人每週美元（2026 年 10 月）

| 年齡／性別組 | 每週美元 |
| --- | --- |
| 孩童 1 歲 | 26.40 |
| 孩童 2–3 歲 | 39.80 |
| 孩童 4–5 歲 | 43.50 |
| 孩童 6–8 歲 | 48.30 |
| 孩童 9–11 歲 | 55.80 |
| 女性 12–13 歲 | 51.70 |
| 女性 14–19 歲 | 60.10 |
| 女性 20–50 歲 | 58.70 |
| 女性 51–70 歲 | 54.60 |
| 女性 71 歲以上 | 60.30 |
| 男性 12–13 歲 | 59.70 |
| 男性 14–19 歲 | 75.30 |
| 男性 20–50 歲 | 73.70 |
| 男性 51–70 歲 | 65.00 |
| 男性 71 歲以上 | 62.00 |

### 逐字表 B — Low-Cost Plan，每人每週美元（2026 年 10 月）

| 年齡／性別組 | 每週美元 |
| --- | --- |
| 孩童 1 歲 | 38.30 |
| 孩童 2–3 歲 | 40.10 |
| 孩童 4–5 歲 | 41.40 |
| 孩童 6–8 歲 | 60.50 |
| 孩童 9–11 歲 | 62.60 |
| 女性 12–13 歲 | 62.30 |
| 女性 14–19 歲 | 62.60 |
| 女性 20–50 歲 | 63.90 |
| 女性 51–70 歲 | 62.20 |
| 女性 71 歲以上 | 62.10 |
| 男性 12–13 歲 | 73.20 |
| 男性 14–19 歲 | 74.50 |
| 男性 20–50 歲 | 73.50 |
| 男性 51–70 歲 | 69.20 |
| 男性 71 歲以上 | 68.40 |

出處：USDA Food and Nutrition Service, Center for Nutrition Policy and Promotion, "USDA Food Plans: Monthly Cost of Food Reports"（Thrifty Food Plan 報告與 Cost of Food at Home at Three Levels 報告，2026 年 10 月，頁面更新 2026-11-13）。方法依據：Thrifty Food Plan, 2021；Low-Cost、Moderate-Cost 與 Liberal Food Plans, 2007。表值假設全部餐點與點心皆在家製備，美國本土平均；阿拉斯加與夏威夷另有價格，不在本工具範圍。

4. 未調整每週合計 `unadjustedWeekly` = Σ（人數 × 每人每週費用）。戶人數調整因子（USDA 報告註腳 2 原文規則）：1 人 ×1.20；2 人 ×1.10；3 人 ×1.05；4 人 ×1.00；5–6 人 ×0.95；7 人以上 ×0.90。
5. 每週總額 `weeklyTotal` = 未調整合計 × 調整因子，半捨入（half-up）到最接近的 0.10 美元；恰落中間（如 143.55 美元）取較大者。調整金額 `sizeAdjustmentWeekly` = 每週總額 − 未調整合計（可為負，以 0.10 美元為單位）。
6. 每月總額 `monthlyTotal` = 每週總額 × 4.333（USDA 報告註腳 3 的換算因子），半捨入到最接近的 0.10 美元。每月總額由本工具的每週總額算出，不由各組每月小計加總。
7. 每人每週 `perPersonWeekly` = 每週總額 ÷ 全戶人數，半捨入到分（0.01 美元）；每人每月 `perPersonMonthly` = 每月總額 ÷ 全戶人數，半捨入到分；每日平均 `dailyAverage` = 每週總額 ÷ 7，半捨入到分。
8. 明細 `breakdown`：僅列人數大於 0 的組，依輸入欄位順序排列；每列 `{group,count,weeklyPerPerson,weeklySubtotal,monthlySubtotal}`，其中 `weeklySubtotal` = 人數 × 每人每週費用（調整前），`monthlySubtotal` = 該組每週小計 × 4.333，半捨入到最接近的 0.10 美元。明細小計為調整前金額；明細每月小計之和可能與每月總額相差 0.10–0.40 美元，此為捨入所致，不是錯誤。

結果 `{plan,householdSize,sizeFactor,unadjustedWeekly,sizeAdjustmentWeekly,weeklyTotal,monthlyTotal,perPersonWeekly,perPersonMonthly,dailyAverage,breakdown}`。全部金額為美元 JSON 數字；每週／每月總額與小計精確到 0.10 美元，每人與每日平均精確到 0.01 美元。機器值不隨 locale 改。

已知差異（已揭露，非缺陷）：USDA 公布的每月金額以未捨入的每週費用計算；本工具的每月總額以公布的已捨入每週總額計算，兩者可相差約 0.20 美元。例如參照四口之家 Thrifty：USDA 公布每週 236.50 美元、每月 1,024.60 美元；本工具每週同為 236.50 美元，每月為 1,024.80 美元，相差 0.20 美元。頁面須以 FAQ 說明此差異與原因。

固定下載 `grocery-budget-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/grocery-budget-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 表定數據以整數分為單位寫死在核心（例如 26.40 美元記為 2640 分），不以二進位浮點存取金額。調整因子以精確有理數運算（1.20=6/5、1.10=11/10、1.05=21/20、0.95=19/20、0.90=9/10）；每月換算以 4333/1000 精確運算；捨入只在本文指定的步驟以 half-up 執行一次。不得以 `toFixed` 或浮點累加代替。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算採買預算」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。14 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `reference-family-thrifty` | USDA 參照四口之家，Thrifty；每週 236.50 美元與 USDA 公布值逐字相符 |
| `reference-family-low-cost` | 同一四口之家，Low-cost |
| `single-adult-male-thrifty` | 一人戶加 20% |
| `couple-thrifty` | 二人戶加 10% |
| `three-person-low-cost` | 三人戶加 5%（含 2–3 歲幼兒） |
| `five-person-thrifty` | 五人戶減 5% |
| `seven-person-low-cost` | 七人戶減 10%（七組年齡層） |
| `adult-plus-infant-thrifty` | 成人加一歲幼兒，二人戶 |
| `senior-couple-low-cost` | 年長夫妻；週合計 143.55 美元的 half-up 捨入分界 |
| `zero-household` | 全戶人數為零，EMPTY |
| `count-over-ten` | 單欄 11 人，超過單欄上限 |
| `household-over-twenty` | 每欄合法但全戶 21 人，超過全戶上限 |
| `decimal-count` | 人數不接受小數 |
| `unknown-plan` | 計畫不在 thrifty / low-cost 之中 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證全戶 20/21 人、單欄 10/11 人、143.55 美元捨入分界、每月總額與明細小計之和的捨入差、以及每週總額與 USDA 公布參照值的一致。

候選 gate（均 NOT_RUN）

- 於 `tools/grocery-budget-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「採買預算試算」，title「採買預算試算｜Gloss Tools」，description「輸入家中成員的年齡層，對照 USDA 食物計畫表，算出每週與每月的在家做飯預算。」。英文 lang=en，H1 “Grocery Budget Calculator”，title “Grocery Budget Calculator | Gloss Tools”，description “Enter your household by age group and price a weekly and monthly at-home food budget from the USDA food plans.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。為什麼每月金額和 USDA 公布的不完全一樣？本工具的每月金額以公布的每週總額乘 4.333 算出；USDA 自己的每月金額以未捨入的每週費用算出，兩者可相差約 0.20 美元。 / Why does the monthly total differ slightly from USDA's published figure? This tool multiplies the published rounded weekly total by 4.333; USDA's own monthly figures use unrounded weekly costs, so the two can differ by about $0.20.
- FAQ。包含外食嗎？不包含。食物計畫表假設全部餐點與點心都在家製備。 / Does it include eating out? No. The food plans assume all meals and snacks are prepared at home.
- FAQ。為什麼一人戶每人反而比較貴？USDA 規定一人戶加 20%、二人戶加 10%，因為小家庭採買較無規模效益；七人以上減 10%。 / Why does a one-person household cost more per person? USDA adds 20% for one person and 10% for two, because small households get less bulk-buying benefit; households of seven or more get 10% off.
- FAQ。有 Moderate-cost 或 Liberal 計畫嗎？本工具只提供 Thrifty 與 Low-cost 兩種計畫。 / Are Moderate-Cost or Liberal plans included? This tool offers only the Thrifty and Low-Cost plans.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://grocery-budget-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/db626e48/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/grocery-budget-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

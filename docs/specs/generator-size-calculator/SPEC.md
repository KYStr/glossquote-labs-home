# 發電機容量試算 / Generator Size Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-generator-size-calculator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

停電備援、露營或工地用電前，先確認要買多大的發電機：列出同時要用的家電（運轉瓦數＋啟動瓦數），算出總運轉瓦數與啟動突波，對照 25% 安全裕度與功率因數 0.8，建議發電機 kVA 與最接近的市售規格。

- 桌面。桌面填入家電清單，確認總運轉瓦數、啟動突波與建議的發電機 kVA。
- 行動。手機在賣場或網購時核對一組家電需要的發電機容量，不查詢任何商品資料。

使用情境為設計假設。資料只保留在目前頁面草稿。本工具是選型估算，不是專業電氣設計；結果僅供購買參考，實際接線、啟動順序與容量請依家電與發電機銘牌及專業人員確認。

## scope

家電清單 1–12 列、12 項 Honda 官方瓦數預設表（字面資料，見 implementation）、總運轉瓦數、最大單一啟動增量、啟動突波、25% 安全裕度、功率因數 0.8 換算 kVA、kVA 無條件進位到 0.1、市售規格推薦表（至 20 kVA）與超規提示。非目標為電池續航、電費試算、油耗／續航時間、品牌或型號推薦、並聯／三相選型、安裝與安全認證。

已與本 checkout 的 `docs/specs/` 比對，無同名或同功能預案；最相近者的實質差異如下。

- 電池續航（battery-runtime，概念第 19 條指明的對照工具）：`battery-runtime` 規格目錄不存在於本 checkout，故依概念陳述差異、不連結不存在的規格。battery-runtime 算「電池能撐幾小時」（能量 Wh ÷ 負載 W，時間維度）；此處算「發電機要買多大 kVA」（功率 W → kVA 選型，容量維度），不算時間、不碰電池容量、不算充電。兩者的輸入與輸出單位皆不同，不可互換。
- 從用電度數算電費（electricity-cost-calculator）。此處不輸入電價、不算電費，只算發電機容量。
- 從油耗與里程算油錢（fuel-cost-calculator）。此處不算油耗、油錢或續航時間，只算發電機容量。

判定規則由本文定義，無線上資料或外部服務依賴。預設瓦數表以 Honda 官方瓦數估算指南為來源（見 implementation），並在 AUTHOR-CHECK.md 記錄為近似經驗值而非銘牌值；使用者家電的銘牌值永遠優先。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「家電清單 / Appliance list」（每列：名稱、運轉瓦數 W、啟動瓦數 W；可新增／刪除列；每列有「填入預設值 / Fill preset」選單，選取即帶入該家電的 Honda 預設瓦數）
- 「計算發電機容量 / Calculate generator size」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「總運轉瓦數與建議容量 / Total running watts and recommended size」先摘要再列細節：逐列運轉／啟動／啟動增量、總運轉瓦數、最大啟動增量與所屬家電、啟動突波、含裕度運轉瓦數、所需 kVA、突波 kVA、建議 kVA、建議市售規格；超規時加註專業諮詢提示。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"appliances":[{"name":"Refrigerator","runningWatts":"192","startingWatts":"1200"},{"name":"Lights","runningWatts":"100","startingWatts":"100"}]}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 輸入形狀：`{appliances: [{name, runningWatts, startingWatts} × 1–12]}`。全部瓦數欄皆為 ASCII 十進整數字串，0 或非零開頭（`007` 不可），無空白／符號／小數／指數；raw 每欄最多 8 單元，名稱最多 40 單元。
- 欄位範圍：runningWatts（運轉瓦數）1–20000 W；startingWatts（啟動瓦數）1–30000 W。名稱 1–40 字元，不可為空或全空白；名稱以輸入原樣比較是否重複（區分大小寫，不修剪）。
- 預設如 userFlow 所述。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE、非法枚舉 ENUM。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 家電列或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 輸入非普通物件、缺 `appliances` 或 `appliances` 非陣列，皆 SCHEMA，field,row=null。
2. `appliances` 列數為 0 → EMPTY（field `appliances`）；> 12 → ROW_LIMIT（field `appliances`）。
3. 逐列（第 1 列起）依 `name`、`runningWatts`、`startingWatts` 順序驗證。raw 超限 INPUT_LIMIT；空值 EMPTY；名稱含控制字元（U+0000–U+001F、U+007F）或不成對 surrogate → UNICODE；瓦數文法 INTEGER_FORMAT；範圍 RANGE；field 即該欄名，row 即該列號。
4. 全部列的欄位皆通過後，掃描名稱重複：後出現的重複名 → DUPLICATE_NAME，field `name`，row 為後出現列的列號。
5. 跨欄檢查（依列序）：startingWatts < runningWatts → RANGE，field `startingWatts`，row 即該列號（啟動瓦數不可小於運轉瓦數）。
6. 總運轉瓦數 totalRunningW = 全部 runningWatts 之和（整數瓦）。
7. 每列啟動增量 surgeExtraW = startingWatts − runningWatts（驗證後恆 ≥ 0）；最大啟動增量 maxSurgeExtraW = 各列增量之最大值；largestSurgeRow = 第一個達到該最大值的列名，若最大值為 0 則為 null。
8. 啟動突波 peakW = totalRunningW + maxSurgeExtraW（只加最大單一增量：馬達依序啟動，見 implementation）。
9. 含裕度運轉瓦數 requiredRunningW = totalRunningW × 5/4，無條件進位到整數瓦（25% 安全裕度）。
10. 所需 kVA requiredKva = requiredRunningW ÷ 0.8 ÷ 1000，無條件進位到 0.1 kVA；突波 kVA peakKva = peakW ÷ 0.8 ÷ 1000，無條件進位到 0.1 kVA。kVA 一律為恰 1 位小數的字串。
11. 建議 kVA recommendedKva = max(requiredKva, peakKva)（恰 1 位小數字串）。
12. 市售規格表（kVA）：[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0, 7.5, 10.0, 12.5, 15.0, 20.0]。recommendedKva ≤ 20.0 時 recommendedSizeKva 為表中最小且 ≥ recommendedKva 者，oversize=false；recommendedKva > 20.0 時 recommendedSizeKva = recommendedKva 無條件進位到 0.5 kVA，oversize=true，畫面加註「超出常見家用機型範圍，請諮詢專業人員或評估並聯／備用機型 / Above common portable sizes; consult a professional or consider a standby unit.」。
13. 結果 `{rows, totalRunningW, maxSurgeExtraW, peakW, largestSurgeRow, requiredRunningW, requiredKva, peakKva, recommendedKva, recommendedSizeKva, oversize}`；rows 為輸入順序的 `[{name, runningWatts, startingWatts, surgeExtraW}]`，瓦數為整數。機器值不隨 locale 改。

固定下載 `generator-size-calculator-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/generator-size-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 預設瓦數表來源：Honda Power Equipment 瓦數估算指南「What Wattage Generator Do I Need?」（https://powerequipment.honda.com/generators/generator-wattage-estimation-guide），Home Applications 表。該表欄位為啟動瓦數在前、運轉瓦數在後；下表已轉為運轉／啟動順序。Honda 給區間處取區間上界（選型取保守值）；「as indicated on bulb」等非數值列不收錄。

| 預設家電 | 運轉瓦數 W | 啟動瓦數 W |
| --- | --- | --- |
| 冰箱／冷凍櫃（節能型）Refrigerator/Freezer (Energy Star) | 192 | 1200 |
| 微波爐 1000 W Microwave Oven (1000 W) | 1500 | 1500 |
| 暖爐風扇 1/3 HP Furnace Fan (1/3 HP) | 700 | 1400 |
| 沉水泵 1/3 HP Sump Pump (1/3 HP) | 800 | 1300 |
| 沉水泵 1/2 HP Sump Pump (1/2 HP) | 1050 | 2150 |
| 窗型冷氣 10000 BTU Window Air Conditioner (10,000 BTU) | 1500 | 2200 |
| 電熱乾衣機 Clothes Dryer (Electric) | 5400 | 6750 |
| 電熱水器 Hot Water Heater | 4500 | 4500 |
| 洗衣機 Automatic Washer | 1200 | 1200 |
| 平面電視 46 吋 Flat-Screen TV (46") | 190 | 190 |
| 筆記型電腦 Laptop | 250 | 250 |
| 咖啡機 4 杯 Coffee Maker (4 cup) | 600 | 600 |

- 釘版常數：安全裕度 SAFETY_MARGIN = 1.25（25%）。取 25% 的理由：連續負載 ≤ 額定容量的 80%（1 ÷ 1.25 = 0.8）是常見的發電機運轉守則，本工具將其釘為固定值；此為作者釘版選擇，不是法定標準。功率因數 POWER_FACTOR = 0.8（發電機銘牌 kVA 的標準功率因數；kVA = kW ÷ 0.8）。市售規格表見 inputsOutputs 第 12 步。
- 突波只加最大單一增量：Honda 指南的用電管理建議是馬達依序啟動、不要同時啟動；同時啟動多台馬達不在本工具範圍內，畫面以 FAQ 明示「請依序啟動馬達」。突波本身已是最壞情況（全部負載運轉中＋最大一台啟動），故突波 kVA 不再疊加 25% 裕度；裕度只保護連續運轉。
- 數值運算：瓦數全為整數；requiredRunningW 以整數運算 ceil(totalRunningW × 5 ÷ 4)；kVA 以整數運算 ceil(W × 10 ÷ 800) ÷ 10 再格式化為恰 1 位小數字串。禁止二進位浮點決定任何一位小數。除上述兩處無條件進位外無其他捨入。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算發電機容量」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。14 個字面核心案例（含 5 個錯誤案例）與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `fridge-lights-tv` | 冰箱＋燈具＋電視，突波由冰箱決定，建議 1.9 kVA／2.0 規格 |
| `no-motor-loads` | 全電阻負載無突波，裕度決定建議 9.4 kVA／10.0 規格 |
| `single-window-ac` | 單台窗型冷氣，突波 kVA 大於所需 kVA |
| `exact-table-size` | 建議 kVA 恰等於市售規格 5.0，不再進位 |
| `two-motors-largest-only` | 兩台馬達只加最大增量（沉水泵），非兩者相加 |
| `oversize-whole-house` | 建議 27.1 kVA 超出 20 kVA 表，進位到 27.5 並標超規 |
| `minimum-load` | 最小負載 60 W，建議 0.1 kVA／最小規格 1.0 |
| `exact-tenth-boundary` | 突波 kVA 恰為 2.9，不被進位規則推高 |
| `tie-largest-surge` | 兩列增量相同，取第一列為最大突波來源 |
| `error-empty-list` | 空清單，EMPTY |
| `error-starting-below-running` | 啟動瓦數小於運轉瓦數，RANGE |
| `error-running-zero` | 運轉瓦數 0，RANGE |
| `error-decimal-watts` | 瓦數小數，INTEGER_FORMAT |
| `error-too-many-rows` | 13 列，ROW_LIMIT |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 totalRunningW 與 peakW 的加總、requiredRunningW 的 5/4 進位、kVA 恰為 0.1 倍數與恰等於表值時不進位、recommendedKva == 20.0 與 20.1 的表內外分界、最大增量並列取第一列、重複名稱、leading zero。所有已接受的 requiredKva、peakKva、recommendedKva 皆為恰 1 位小數且 ≥ 未進位值；recommendedSizeKva ≥ recommendedKva；oversize 時 recommendedSizeKva 為 0.5 的倍數。

候選 gate（均 NOT_RUN）

- 於 `tools/generator-size-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「發電機容量試算」，title「發電機容量試算｜Gloss Tools」，description「停電備援或露營用電前，先確認要買多大的發電機：列出家電的運轉與啟動瓦數，算出總運轉瓦數、啟動突波與建議 kVA。」。英文 lang=en，H1 “Generator Size Calculator”，title “Generator Size Calculator | Gloss Tools”，description “Before buying a generator for backup, camping or a job site, check the size you need from your appliances' running and starting watts.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。為什麼只加最大一台的啟動瓦數？馬達依序啟動時，同一時間只有一台在啟動；同時啟動多台馬達不在本工具範圍內，請分開順序啟動。 / Why add only the largest starting watts? When motors start one at a time, only one is starting at any moment; starting several motors at once is out of scope — stagger the starts.
- FAQ。25% 安全裕度與功率因數 0.8 是什麼？裕度讓連續負載不超過額定容量的 80%；功率因數 0.8 是發電機銘牌 kVA 的標準換算值，kVA = kW ÷ 0.8。兩者皆為本工具釘版的固定值。 / What are the 25% safety margin and 0.8 power factor? The margin keeps continuous load at or below 80% of the rated capacity; 0.8 is the standard nameplate power factor for generators, kVA = kW ÷ 0.8. Both are fixed values pinned by this tool.
- FAQ。這能取代專業電氣評估嗎？不能，這是依銘牌近似值的選型估算；實際接線、啟動順序與容量請依家電與發電機銘牌及專業人員確認。 / Does this replace a professional electrical assessment? No, it is a sizing estimate from nameplate approximations; confirm wiring, start order and capacity against the appliance and generator nameplates and a professional.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://generator-size-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線以開工時讀回的遠端 `codex/initial-publication` head 為準。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/generator-size-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

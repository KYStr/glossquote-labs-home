# 倉儲空間估算 / Storage Unit Estimator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-storage-unit-estimator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

搬家或裝修前要租倉儲單位，先確認東西總共多大：逐列加入家具、家電與箱子（每件體積依釘版體積表），算出總體積與含走道預留的需要體積，再推薦最小的合適倉儲單位尺寸。

- 桌面。桌面逐列加入物品與數量，確認總體積、需要體積與推薦單位（尺寸、面積、坪數、佔用率）。
- 行動。手機在搬家現場或倉儲業者門市核對物品清單與建議尺寸，不查詢任何即時價格或空位。

使用情境為設計假設。資料只保留在目前頁面草稿。本工具是體積估算，不是實際裝載規劃；結果僅供選租參考，實際能否裝入還受物品形狀、門寬與堆疊方式影響。

## scope

物品清單（最多 30 列，每列品項＋數量 1–99）、21 件釘版體積表（家具 12／家電 6／箱子 3，體積由典型外形尺寸推導，見 implementation）、自訂物品（長寬高 cm 輸入）、總體積合計、25% 走道與堆疊空隙預留、6 檔釘版倉儲單位尺寸表（5×5 至 10×30 ft，8 ft 高）與最小合適單位推薦、佔用率、超量時的多間建議。非目標為箱數與包材估算、實際裝載圖、價格或租金試算、即時空位查詢、品牌或業者推薦、車輛運輸規劃。

已與本 checkout 的 `docs/specs/` 比對，無同名或同功能預案；最相近者的實質差異如下。

- 從住宅類型與習慣算「要買幾個箱子」及包材（moving-box-estimator；其規格目錄不在本 checkout 此 head，本段依 `tools/moving-box-estimator/HANDOFF.md`：輸出為箱數與包材）。此處不算箱數：輸入是已知的家具／家電／箱子清單，輸出是總體積 m³ 與推薦的倉儲單位尺寸。
- 旅行出發前的物品清點清單（packing-list，`spec-22-packing-list`，見 `docs/specs/battery-swap-plan/SPEC.md` 對其「列出出發時需要帶的物品」之描述）。此處不是勾選清單：每列物品有釘版體積，輸出是數值合計與尺寸推薦，不做勾選、打包順序或行李重量。

判定規則由本文定義，無線上資料或外部服務依賴。體積表與單位尺寸表皆為本文釘版的字面資料（見 implementation）。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「物品清單 / Item list」（每列：品項選擇器依家具／家電／箱子／自訂分組、數量；自訂列另有長／寬／高 cm 三欄）
- 「新增一列 / Add row」與每列「移除 / Remove」；30 列時新增停用並說明上限。
- 「估算倉儲空間 / Estimate storage size」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「總體積與推薦單位 / Total volume and recommended unit」先摘要再列細節：逐列體積表、總體積、預留體積、需要體積、推薦單位（尺寸、地板面積 m² 與坪、容量 m³、佔用率、間數）。超量時以文字及符號提示「單一最大單位裝不下，建議 N 間最大單位 / Exceeds the largest unit; N largest units suggested.」。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"items":[{"itemId":"single-bed","quantity":"1"},{"itemId":"wardrobe","quantity":"1"},{"itemId":"box-medium","quantity":"2"}]}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- input 只有 `items` 一欄：列陣列，1–30 列（含）。0 列 EMPTY、31 列以上 ROW_LIMIT，field `items`、row null。
- 每列為普通物件，只含 `itemId`、`quantity`，自訂列另含 `lengthCm`、`widthCm`、`heightCm`。同品項重複列允許，各自計入，不合併。
- itemId：21 件釘版品項或 `custom`（見 implementation 體積表）。raw 最多 32 單元。
- quantity：ASCII 十進整數字串，無空白／符號／小數／指數，raw 最多 8 單元，1–99（含）。
- lengthCm／widthCm／heightCm：僅自訂列必填；ASCII 十進整數字串，raw 最多 8 單元，1–300 cm（含）。非自訂列的尺寸欄必須缺席或為空字串，否則 SCHEMA。
- 預設 3 列：single-bed ×1、wardrobe ×1、box-medium ×2。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE、非法枚舉 ENUM。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 驗證列數，再依列順逐列驗證，列內依 itemId、quantity、lengthCm、widthCm、heightCm 順序。raw 超限 INPUT_LIMIT、文法 INTEGER_FORMAT、範圍 RANGE、枚舉 ENUM，field 即上述欄名，row 為該列 1-based 列號。
2. 逐列體積 unitVolumeM3：釘版品項取體積表字面值（2 位小數 m³）；自訂列 unitVolumeM3 = lengthCm × widthCm × heightCm / 1,000,000 m³，再 half-up 到 2 位小數。列體積 rowVolumeM3 = unitVolumeM3 × quantity。
3. 總體積 totalM3 = 各列 rowVolumeM3 之和（以 0.01 m³ 為單位的整數精確加總，無浮點）。
4. 預留 allowanceM3 = totalM3 × 25%，需要體積 requiredM3 = totalM3 × 1.25（精確有理數；顯示時才 half-up 到 2 位小數）。
5. 推薦單位：取單位尺寸表（見 implementation）中容量 capacityM3 最小且 ≥ 未捨入 requiredM3 者；比較用未捨入的 requiredM3 對 2 位小數的釘版容量字面值。無一檔符合時推薦最大檔 10×30，fits=false。
6. 間數 unitsNeeded：fits 時為 1；超量時為 ceil(requiredM3 / 最大檔容量)，以精確有理數計。
7. 佔用率 fillPct = requiredM3 / (unitsNeeded × capacityM3) × 100，half-up 到 1 位小數（以未捨入 requiredM3 與釘版容量字面值計）。
8. 結果 `{rows,totalM3,allowanceM3,requiredM3,unitId,unitLabelFt,floorAreaM2,floorAreaPing,capacityM3,unitsNeeded,fillPct,fits}`。rows 每列 `{itemId,nameZh,nameEn,quantity,unitVolumeM3,rowVolumeM3}`，quantity 為整數，體積為 2 位小數字串；totalM3、allowanceM3、requiredM3 為 2 位小數字串（half-up）；floorAreaM2、floorAreaPing、capacityM3 為釘版 2 位小數字串；fillPct 為 1 位小數字串（half-up）；unitsNeeded 為整數；fits 為布林。fits=false 時畫面加註「單一最大單位裝不下，建議 N 間最大單位；另請確認業者是否提供更大單位或分租方案 / Exceeds the largest unit; N largest units suggested — check whether the facility offers larger units or split rentals.」。

固定下載 `storage-unit-estimator-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/storage-unit-estimator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 體積表（釘版典型外形尺寸，體積＝長×寬×高／1,000,000 m³，half-up 到 2 位小數；數值為本規格釘版的典型值，不是實測值，形狀不規則或可拆解的物品以此外形尺寸為準）：

| itemId | 中文 | English | 典型尺寸 cm（長×寬×高） | unitVolumeM3 |
| --- | --- | --- | --- | --- |
| sofa-3-seat | 三人沙發 | Three-seat sofa | 210×90×90 | 1.70 |
| sofa-2-seat | 雙人沙發 | Two-seat sofa | 160×90×90 | 1.30 |
| armchair | 單人扶手椅 | Armchair | 90×90×90 | 0.73 |
| double-bed | 雙人床架+床墊 | Double bed frame + mattress | 190×160×60 | 1.82 |
| single-bed | 單人床架+床墊 | Single bed frame + mattress | 190×100×60 | 1.14 |
| dining-table | 餐桌（四人） | Dining table (4-person) | 140×80×75 | 0.84 |
| dining-chair | 餐椅 | Dining chair | 45×50×90 | 0.20 |
| wardrobe | 衣櫃（雙門） | Wardrobe (double-door) | 120×60×200 | 1.44 |
| chest-drawers | 五斗櫃 | Chest of drawers | 100×50×110 | 0.55 |
| bookshelf | 書櫃 | Bookshelf | 100×35×180 | 0.63 |
| desk | 書桌 | Desk | 120×60×75 | 0.54 |
| coffee-table | 茶几 | Coffee table | 110×55×45 | 0.27 |
| refrigerator-large | 大冰箱（雙門） | Large refrigerator (double-door) | 90×75×180 | 1.22 |
| refrigerator-small | 小冰箱 | Small refrigerator | 60×60×140 | 0.50 |
| washing-machine | 洗衣機 | Washing machine | 60×60×85 | 0.31 |
| dryer | 烘衣機 | Dryer | 60×60×85 | 0.31 |
| tv-55 | 55吋電視 | 55" TV | 125×10×78 | 0.10 |
| microwave | 微波爐 | Microwave oven | 50×40×30 | 0.06 |
| box-small | 小紙箱 | Small box | 40×40×40 | 0.06 |
| box-medium | 中紙箱 | Medium box | 50×50×50 | 0.13 |
| box-large | 大紙箱 | Large box | 60×60×60 | 0.22 |

  尺寸為常見家具／家電／紙箱的典型外形尺寸（例如雙人床 190×160 cm、雙門冰箱 90×75×180 cm、紙箱 40／50／60 cm 立方），體積由上式推導，0.125→0.13、1.215→1.22 等皆為 half-up 到 2 位小數。

- 單位尺寸表（釘版標準尺寸；來源：This Old House〈Guide to Storage Unit Sizes〉https://www.thisoldhouse.com/moving/storage-unit-sizes 與 Bolt Storage〈Storage Unit Sizes Guide〉https://www.boltstorage.com/post/storage-unit-sizes-guide：常見尺寸 5×5、5×10、10×10、10×15、10×20、10×30 ft，標準天花板高 8 ft；另以立方英尺交叉核對：5×5＝200 cu ft、5×10＝400、10×10＝800、10×15＝1200、10×20＝1600、10×30＝2400 cu ft，兩種算法的 2 位小數容量一致）：

| unitId | 尺寸 ft | 地板面積 m² | 地板面積 坪 | 容量 m³ |
| --- | --- | --- | --- | --- |
| 5x5 | 5 × 5 ft | 2.32 | 0.70 | 5.66 |
| 5x10 | 5 × 10 ft | 4.65 | 1.41 | 11.33 |
| 10x10 | 10 × 10 ft | 9.29 | 2.81 | 22.65 |
| 10x15 | 10 × 15 ft | 13.94 | 4.22 | 33.98 |
| 10x20 | 10 × 20 ft | 18.58 | 5.62 | 45.31 |
| 10x30 | 10 × 30 ft | 27.87 | 8.43 | 67.96 |

  換算以 1 ft＝0.3048 m（精確）、高 8 ft＝2.4384 m 計：地板面積＝長×寬，容量＝地板面積×高；坪＝m² × 121/400（1 坪＝400/121 m²）；全部 half-up 到 2 位小數。不含 5×15 等中間尺寸：六檔已覆蓋常見需求，維持單一確定推薦。

- 25% 預留：走道與堆疊空隙的固定經驗係數（requiredM3＝totalM3 × 1.25），不是實測裝載效率；SPEC 明示為固定規則，實際可堆疊程度依物品形狀而異。
- 數值運算：最終體積計算不得用二進位浮點直接乘除；以 0.01 m³ 為單位的整數（BigInt）或等價有理數運算。顯示捨入一律 half-up（0.5 向上），僅在顯示時捨入；單位推薦比較以未捨入的 requiredM3 為準。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「估算倉儲空間」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。13 個字面核心案例（含 5 個錯誤案例）與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `studio-basics` | 單人床＋衣櫃＋中箱＋洗衣機，3.15 m³ 需 3.94 m³，推薦 5×5 |
| `one-bedroom` | 一房清單 8.57 m³ 需 10.71 m³，推薦 5×10，佔用率 94.5% |
| `just-under-5x5` | 需要體積 5.65 m³ 恰在 5×5 容量 5.66 之下，佔用率 99.8% |
| `just-over-5x5` | 多一隻小箱，需要體積 5.73 m³ 超出 5×5，升檔 5×10 |
| `custom-item` | 自訂 120×60×80 cm＝0.58 m³ 計入總體積 |
| `two-bedroom` | 兩房清單 14.13 m³ 需 17.66 m³，推薦 10×10 |
| `overflow-largest` | 需要體積 77.25 m³ 超出最大檔，建議 2 間 10×30，fits=false |
| `single-box` | 最小輸入 1 隻小箱，0.06 m³ 需 0.08 m³ |
| `error-unknown-item` | 不在體積表的品項，ENUM |
| `error-qty-zero` | 數量 0 越下界，RANGE |
| `error-qty-decimal` | 數量小數，INTEGER_FORMAT |
| `error-too-many-rows` | 31 列，ROW_LIMIT |
| `error-custom-missing-dims` | 自訂列缺長度，EMPTY |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證列數 30／31、數量 1／99／100、自訂尺寸 1／300／301 cm、需要體積恰等於容量與恰高 0.01 m³、重複品項列各自計入。所有已接受的 requiredM3 皆為 totalM3 × 1.25；推薦單位皆為容量 ≥ requiredM3 的最小檔（超量時除外）；unitsNeeded × capacityM3 ≥ requiredM3。

候選 gate（均 NOT_RUN）

- 於 `tools/storage-unit-estimator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「倉儲空間估算」，title「倉儲空間估算｜Gloss Tools」，description「搬家或裝修前，先算東西總共多大：加入家具、家電與箱子，算出總體積與推薦的倉儲單位尺寸。」。英文 lang=en，H1 “Storage Unit Estimator”，title “Storage Unit Estimator | Gloss Tools”，description “Before moving or renovating, work out how much space your things need: add furniture, appliances and boxes to get the total volume and a recommended storage unit size.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。體積怎麼算？每件物品以釘版典型外形尺寸的長×寬×高換算成立方公尺，再乘以數量加總；自訂物品以輸入的長寬高計算。 / How is volume calculated? Each item uses its pinned typical outer dimensions (length × width × height) converted to cubic metres, multiplied by quantity and summed; custom items use the dimensions you enter.
- FAQ。為什麼需要體積比總體積大 25%？物品不是完美立方體，堆疊會有空隙，單位內還要留走道；本工具以固定 25% 預留估算，不是實測裝載效率。 / Why is the required volume 25% more than the total? Items are not perfect cubes, stacking leaves gaps, and you need an aisle inside the unit; the tool applies a fixed 25% allowance, not a measured packing efficiency.
- FAQ。推薦的單位一定裝得下嗎？不一定。推薦以體積比較，實際還受物品形狀、門寬與堆疊方式影響；超大或不規則物品請先量門寬並向業者確認。 / Will the recommended unit definitely fit everything? Not necessarily. The recommendation compares volumes only; shape, door width and stacking also matter. Measure the door and check with the facility for oversized or irregular items.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://storage-unit-estimator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線以開工時讀回的遠端 `codex/initial-publication` head 為準。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/storage-unit-estimator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

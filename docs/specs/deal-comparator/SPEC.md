# 優惠比價 / Deal Comparator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-deal-comparator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md) · 概念來源：run 6 SPEC-AUTHOR-BRIEF.md（概念第 8 條）

## goal

消費者在賣場或網購頁面看到同一商品有兩到四種不同寫法的優惠（買 N 送 M、打折、折抵金額、組合價），無法直接比較哪一種最划算。本工具把每一種優惠結構換算成同一個統一單位價（每 100 g／每 100 mL／每件），再排名，告訴使用者哪一個方案真正最便宜、便宜多少。

- 桌面。桌面一次輸入商品與 2–4 個方案，逐案核對換算後的單位價與排名。
- 行動。手機在賣場貨架前輸入架上看到的幾個優惠，當場決定拿哪一種。

使用情境為設計假設。資料只保留在目前頁面草稿。

## scope

同一商品、2–4 個優惠方案的正規化比較。方案型別固定四種：買 N 送 M、百分比折扣、定額折價、組合價。統一單位價按 `g → 每 100 g`、`ml → 每 100 mL`、`piece → 每件` 換算（釘版），排名取最低單位價。非目標：單一商品折扣鏈（例如連續兩次折扣的先後順序）、不同商品之間的比較、標價單位價的直接比較、即時價格查詢、庫存或有效期限判斷、把結果當商家報價保證。

本 checkout（`docs/specs/` 共 103 份規格，2026-11-21 核對）內沒有與本工具同範圍的規格；最相近者的實質差異如下。

- 單一商品折扣計算（`tools/discount-calculator`，僅產品目錄、無對應規格）。此處是同一商品多個優惠方案換算成統一單位價再排名，不是單一折扣鏈的試算。[../../tools/discount-calculator](../../tools/discount-calculator)
- 概念筆記所稱 legacy unit-price（標價單位價比較）：本 checkout 內未找到其規格或產品目錄，無法引用；其範圍是比較已標示的單位價，不做優惠結構正規化。本工具的範圍是把優惠結構正規化成統一單位價，兩者不重疊。registry 全量比對由家長／reviewer 補核，作者未執行 registry 指令（見 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)）。

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「商品名稱、單位基準、每包規格、每包單價 / Product name, unit basis, pack size and pack price」
- 欄位或說明「優惠方案 2–4 個：買 N 送 M／百分比折扣／定額折價／組合價 / 2–4 offers: buy N get M, percent off, fixed amount off, bundle price」
- 「比較優惠 / Compare deals」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「排名結果 / Ranked results」先摘要最佳方案再列逐案細節：每案顯示標籤、型別、實付總價、總數量、統一單位價、省下金額與百分比、名次。最佳方案以文字「最佳 / Best」及符號標示，不只用顏色。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"productName":"咖啡豆","unitBasis":"g","packSize":"500","packPrice":"150.00","offers":[{"type":"buyNGetM","buyN":"2","getM":"1"},{"type":"percentOff","percent":"20","quantity":"1"}]}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 商品欄位皆為字串。`productName` 去空白後 1–80 字元；`unitBasis` 為 `g`、`ml`、`piece` 之一；`packSize` 為整數字串，`g`/`ml` 為 1–100000，`piece` 為 1–1000；`packPrice` 為金額字串（見下）。
- 金額字串格式：`^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$`，即整數部分為 `0` 或非零開頭，小數部分至多兩位；範圍 0.01–999999.99（新臺幣元）。內部一律轉為整數分（cents）精確計算，不用浮點數。
- 整數字串格式：`^(0|[1-9][0-9]*)$`，即 `0` 或非零開頭，無空白／符號／小數／指數。
- 容量：整份輸入 JSON 文字超過 65,536 字元為 INPUT_LIMIT（field=null）；單一 raw 欄位超過上限為 INPUT_LIMIT（field 即欄位名）：`productName` 80 字元、`label` 40 字元、整數字串 6 字元、金額字串 12 字元。
- `offers` 為 2–4 個方案的陣列。方案共通欄位為 `label`（可選）、`type`；各型別另有固定欄位，見下表。`quantity` 只用於 `percentOff`／`fixedOff`／`bundle`，可省略，預設為 1。`label` 可省略，預設依輸入順序為「方案 A」、「方案 B」、「方案 C」、「方案 D」。

| 型別 `type` | 固定欄位（依驗證順序） | 範圍 |
| --- | --- | --- |
| `buyNGetM` 買 N 送 M | `buyN`、`getM` | 各 1–99 整數 |
| `percentOff` 百分比折扣 | `quantity`（可省，預設 1）、`percent` | `quantity` 1–99 整數；`percent` 1–99 整數 |
| `fixedOff` 定額折價 | `quantity`（可省，預設 1）、`amountOff` | `quantity` 1–99 整數；`amountOff` 金額字串 0.01–999999.99 |
| `bundle` 組合價 | `quantity`（可省，預設 1）、`bundlePrice` | `quantity` 1–99 整數；`bundlePrice` 金額字串 0.01–999999.99 |

驗證順序（只回第一個錯誤；整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或點路徑、row 恆為 null；成功僅為 `{ok:true,result}`；資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊）：

1. 容量：整份輸入超限 INPUT_LIMIT（field=null）；單一 raw 欄位超限 INPUT_LIMIT（field 即欄位名）。
2. `productName`：缺欄／非字串／accessor 為 SCHEMA；去空白後為空為 EMPTY。
3. `unitBasis`：缺欄／非字串為 SCHEMA；不在 `g`、`ml`、`piece` 之內為 ENUM。
4. `packSize`：缺欄／非字串為 SCHEMA；不符整數字串為 INTEGER_FORMAT；超出該基準範圍為 RANGE。
5. `packPrice`：缺欄／非字串為 SCHEMA；不符金額格式為 MONEY_FORMAT；超出 0.01–999999.99 為 RANGE。
6. `offers`：缺欄／非陣列為 SCHEMA；長度不是 2–4 為 OFFER_COUNT（field=`offers`）。
7. 依輸入順序逐案驗證第 i 案（field 以 `offers[i].<欄位>` 表示）：
   a. 非普通物件為 SCHEMA（field=`offers[i]`）。
   b. `label` 若存在：非字串為 SCHEMA；去空白後為空為 EMPTY。
   c. `type`：缺欄／非字串為 SCHEMA；不在四種型別之內為 ENUM。
   d. 該型別不允許的多餘欄位為 SCHEMA（field=`offers[i].<欄位>`）。
   e. 型別欄位依上表順序驗證：缺欄／錯型別為 SCHEMA；不符整數或金額格式為 INTEGER_FORMAT／MONEY_FORMAT；超出範圍為 RANGE。
   f. 跨欄：`fixedOff` 的 `amountOff` 大於等於 `quantity × packPrice`（總原價）為 DISCOUNT_EXCEEDS_PRICE（field=`offers[i].amountOff`）。

錯誤訊息（依 code，欄位名由介面代入）：

| code | zh-Hant | en |
| --- | --- | --- |
| SCHEMA | 欄位缺失、未知、多餘或型別錯誤。 | Missing, unknown, extra, or mistyped field. |
| INPUT_LIMIT | 輸入超過容量上限。 | Input exceeds the size limit. |
| EMPTY | 內容為空。 | Empty value. |
| INTEGER_FORMAT | 不是規定的整數字串。 | Not an integer string in the required form. |
| MONEY_FORMAT | 不是規定的金額字串。 | Not a money string in the required form. |
| ENUM | 不是允許的選項。 | Not an allowed option. |
| RANGE | 超出允許範圍。 | Out of range. |
| OFFER_COUNT | 方案數量必須是 2–4 個。 | Offer count must be 2–4. |
| DISCOUNT_EXCEEDS_PRICE | 定額折價大於等於總原價。 | Fixed discount is greater than or equal to the total list price. |

核心計算（P = 每包單價，分；S = 每包規格，基準單位數；Q = 件數，`buyNGetM` 不用 Q；N、M、d、A、B 依下表；`list` 為該案總原價，分）：

| 型別 | 實付 `paid`（分，精確有理數） | 總數量 `qty`（基準單位） | 總原價 `list`（分） |
| --- | --- | --- | --- |
| `buyNGetM` | N × P | (N + M) × S | (N + M) × P |
| `percentOff` | Q × P × (100 − d) / 100 | Q × S | Q × P |
| `fixedOff` | Q × P − A | Q × S | Q × P |
| `bundle` | B | Q × S | Q × P |

- 統一單位價（分）：`g`／`ml` 為 `roundHalfUp(paid × 100 / qty)`（每 100 g／每 100 mL）；`piece` 為 `roundHalfUp(paid / qty)`（每件）。`roundHalfUp` 為四捨五入取整（半數進位；負值取絕對值後同規則再加負號）。
- 實付總價（分）為 `roundHalfUp(paid)`；省下金額（分）為 `roundHalfUp(list − paid)`，可為負值（組合價高於原價時）；省下百分比（十分之一百分點整數）為 `roundHalfUp((list − paid) × 1000 / list)`。
- 捨入只在最後一次進行：單位價由未捨入的精確 `paid` 計算，不由已捨入的實付總價反推；全程不用浮點數。
- 機器值格式：金額字串固定兩位小數、無貨幣符號、無千分位分隔（例如 `"120.00"`、`"-50.00"`）；省下百分比字串固定一位小數、可帶負號（例如 `"33.3"`、`"-25.0"`、`"0.0"`）；總數量為整數。
- 排名：依（統一單位價分，實付總價分，輸入順序 index）升序排序；名次為 1–n 連續整數，不併列；第 1 名 `best` 為 true，其餘為 false。排名使用捨入後的統一單位價分；平手時先比實付總價，再比輸入順序。

結果 `{ok:true,result}` 的 `result` 形狀：

```json
{
  "productName": "咖啡豆",
  "unitBasis": "g",
  "unitLabel": "每 100 g",
  "packSize": 500,
  "packPrice": "150.00",
  "offers": [
    {
      "index": 0, "label": "方案 A", "type": "buyNGetM",
      "totalPaid": "300.00", "totalQuantity": 1500,
      "unitPrice": "20.00", "savings": "150.00", "savingsPercent": "33.3",
      "rank": 1, "best": true
    }
  ]
}
```

`unitLabel` 按基準固定：`g` 為「每 100 g」、`ml` 為「每 100 mL」、`piece` 為「每件」。`offers` 陣列依名次升序排列，`index` 保留原始輸入順序。畫面顯示金額時才加「NT$」前綴，機器值不帶。

固定下載 `deal-comparator-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/deal-comparator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「比較優惠」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。13 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `buy-n-get-m-wins` | 買二送一勝出；其餘三案單位價同為 24.00，以總價再以順序決勝負 |
| `percent-off-wins-ml` | 七折勝出；買三送一單位價 6.675 進位為 6.68 |
| `piece-basis` | 以件計價；買二送一每件 4.33 勝出 |
| `fixed-off-wins` | 定額折價勝出；百分比折扣省略 quantity 預設為 1；七五折與買三送一同價以總價決勝負 |
| `bundle-wins` | 組合價勝出；百分比折扣一次買兩件 |
| `exact-tie-all` | 三案單位價全同 12.50，以總價再以輸入順序排名；自訂標籤原樣回傳 |
| `rounding-half-up` | 恰好半分進位：437.5 分進為 4.38；組合價等於原價，省 0 元仍合法 |
| `error-fixed-off-too-large` | 定額折價大於等於總原價，整份失敗 |
| `error-offer-count` | 只有一個方案，不足兩個 |
| `error-bad-percent` | 折扣百分比為 0，超出 1–99 範圍 |
| `error-money-format` | 單價小數超過兩位，不接受 |
| `savings-negative-bundle` | 組合價高於原價仍合法，省下金額與百分比為負值，排名最後 |
| `decimal-pack-price` | 單價含角分；百分比折扣以精確有理數計價，單位價 13.8133… 進為 13.81 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證方案數 2／4／5、percent 1／99／100、buyN/getM 1／99／100、amountOff 等於總原價減一分與等於總原價、packSize 端點、packPrice 0.01 與 999999.99、bundle 高於原價、unitPrice 恰好半分。所有排名皆為連續整數且第 1 名唯一；同一單位價時總價低者排名在前。

候選 gate（均 NOT_RUN）

- 於 `tools/deal-comparator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「優惠比價」，title「優惠比價｜Gloss Tools」，description「同一商品 2–4 個優惠方案，換算成統一單位價再排名，找出真正最划算的買法。」。英文 lang=en，H1 “Deal Comparator”，title “Deal Comparator | Gloss Tools”，description “Compare 2–4 offers for the same product as one common unit price and rank the best deal.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。單位價怎麼算？把每個方案的實付金額除以總數量，再換算成每 100 g／每 100 mL／每件；買 N 送 M 的贈品數量也算進總數量。 / How is the unit price calculated? Divide each offer's total paid by its total quantity, then scale to per 100 g / per 100 mL / per piece; free items from buy N get M count toward the total quantity.
- FAQ。兩個方案單位價相同時為什麼排名不同？先比實付總價，總價低者在前；總價也相同時，輸入順序在前者在前。 / Why do two offers with the same unit price rank differently? The lower total paid ranks first; if the totals are also equal, the earlier-entered offer ranks first.
- FAQ。可以比較不同商品嗎？不行。本工具只比較同一商品的優惠方案；不同商品的比較不在範圍內。 / Can I compare different products? No. This tool only compares offers for the same product; comparing different products is out of scope.
- FAQ。組合價比原價貴會怎樣？仍可比較，省下金額與百分比會是負值，該方案排名最後。 / What if a bundle costs more than the list price? It still compares; its savings amount and percent are negative and it ranks last.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://deal-comparator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/deal-comparator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

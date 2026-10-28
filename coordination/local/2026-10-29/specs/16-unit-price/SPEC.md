# 購物單價比較 — 既有規格保存

Task ID: `labs-16-unit-price` · Spec ID: `spec-16-unit-price`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求：購物單價比較

狀態：**SPEC_ONLY**；以下規格尚未實作。需求來源是主代理選定的使用情境，仍屬待驗證假設，沒有搜尋量或使用者訪談證據。

## 使用者與工作

使用者在同一購物情境中拿到 2–12 個候選商品的標籤資料，想回答：「把每組實付價格除以整組實際容量後，哪個單價最低？」商品可以有不同每包容量、包數或單位表示法。成功狀態是同類商品依真實未四捨五入單價排序，每列清楚顯示整組價格、總量與共同基準單價，最低者可辨認。

## 功能需求

### FR-01：啟動與語言

- 提供繁體中文頁 `/index.html`、英文頁 `/en/index.html`，兩頁使用同一套計算核心，各自提供完整翻譯與正確語言標記。
- 首次載入顯示 2 個空商品列、分類「重量」、每列單位 `g`、包數 `1`。價格、容量與名稱空白。
- 網站不要求帳號、網路服務或安裝。若 JavaScript 未啟用，顯示說明「此工具需要啟用 JavaScript；沒有資料送出。」與語言連結，不呈現可誤以為已計算的結果。

### FR-02：比較列

- 每列有可見標籤的名稱（選填）、整組實付價格（必填）、每包容量（必填）、包數（必填；新增列預設 `1`）和單位選擇。
- 初始 2 列。可以增加至 12 列；達 12 列時停用新增按鈕並說明上限。不得刪到少於 2 列；最少列數時停用刪除控制並說明原因。
- 移除列後，現存列順序不變。排序同價時依比較當刻的來源列順序。
- 名稱空白經 trim 後，以當刻來源列號作 `商品 1`、`商品 2`（英文 `Product 1`、`Product 2`）等替代名稱。名稱不參與計算。

### FR-03：物理量類別與單位

- 全表只選一類：重量、容量、件數；預設重量。
- 重量的列單位可選 `g` 或 `kg`；容量可選 `mL` 或 `L`；件數單位為固定 `件`（英文 `piece`），不提供其他單位。
- 換類別時立即清除所有列的容量欄和比較結果；每列單位重設為新類別基準單位（`g`、`mL`、`piece`），名稱、價格與包數保留。顯示提示，要求重新輸入目前類別的每包容量。
- 不跨類別換算，不假定液體密度，不比較重量與容量。

### FR-04：價格欄驗證

- 標籤表達「整組實付價格（同一幣別）」；同次比較須使用相同幣別。金額不需選幣別、不顯示貨幣符號、不換匯。空值是錯誤；`0` 是合法免費價格。
- 僅接受 ASCII 數字與可選小數點後 1–2 位：`^[0-9]+(?:\.[0-9]{1,2})?$`。前後只移除 ASCII whitespace（U+0009–U+000D、U+0020）；不接受正負號、千分位、指數、全形數字、`.5`、`5.`、內部空白或超過 2 位小數。
- 最多 32 個原始 UTF-16 code units；trim 後不得空。範圍 0 至 9,999,999.99，包含端點。前導零合法且不會被修改。
- 每一列各自顯示欄位錯誤，錯誤只說明允許格式／範圍，不回顯危險 HTML 或原始例外。

### FR-05：容量欄驗證

- 每包容量必填，只接受 ASCII 固定小數格式 `^[0-9]+(?:\.[0-9]{1,3})?$`，同樣先 trim 指定 ASCII whitespace，原始輸入上限 32 UTF-16 code units。
- 範圍大於 0 且不超過 1,000,000；最多 3 位小數。件數只接受整數字串（`^[0-9]+$`），範圍 1 至 1,000,000。
- 零、負數、超出範圍、超過小數位、科學記號、逗號、小數點首尾、全形數字、空字串均拒絕。輸入值不自動截斷或改寫。

### FR-06：包數與名稱驗證

- 包數必填整數，接受 `1`–`1000` 含端點；最多 32 個原始 UTF-16 code units。拒絕空值、小數、負數、正號、逗號、指數與全形數字。欄位以文字輸入及數字鍵盤提示，不使用會默默正規化的 number input。
- 名稱可空；最多 80 個原始 UTF-16 code units。以 ECMAScript `String.prototype.trim()` 去除外側空白；trim 後空白使用列號替代名。名稱中間若含 C0/C1 控制字元（U+0000–001F、U+007F–009F）則拒絕，不刪除或改寫。合法的 `<img ...>` 之類文字只當名稱文字顯示。

### FR-07：載入範例

- 「載入範例」是使用者主動觸發，將表格改成兩列並標示「範例」：
  - 商品 A：整組價格 `120`、每包 `500 g`、`2` 包。
  - 商品 B：整組價格 `150`、每包 `1.5 kg`、`1` 包。
- 載入範例本身只填入表格，不自動顯示計算結果；使用者再按「比較單價」後，B 排第 1，A 的單價為 `12.0000 / 100 g`，B 為 `10.0000 / 100 g`。案例不是產品測試證據。
- 範例內容以提示標示為示範值，避免誤認為實際商品資料。

### FR-08：比較與結果

- 按「比較單價」時驗證分類、列數及**每一列**必填欄位。任一列錯誤就不計算，逐欄顯示所有可辨識錯誤、保留欄位值、聚焦第一個錯誤；絕不略過空白／錯誤列。
- 對每列計算整組總量：標準單位為重量 g、容量 mL、件。排名基準為 `每 100 g`、`每 100 mL` 或 `每 1 件`。
- 每個成功結果按未四捨五入的精確有理數由低至高排序；真實有理數相等才並列。名次採 dense ranking，例如 `1、1、2`。同名次保持原列順序。最低單價的所有並列列都標「最低單價」。
- 結果每列顯示排名、名稱、整組實付價格、包數、標準單位總量、基準單價；明確提示價格沿用輸入的同一幣別。
- 單價固定顯示小數 4 位並以 half-up 四捨五入。非零精確價格若顯示四捨五入成 0，顯示 `<0.0001`；免費商品仍顯示 `0.0000`。若不同精確單價顯示成相同文字，結果附註「顯示值已四捨五入；排序依未四捨五入單價」，不得將它們列為並列。
- 計算沒有外部服務或長工作；不顯示假的載入動畫。

### FR-09：編輯與狀態

- 任何輸入、分類、列新增、列刪除、範例載入或清除都立即使舊結果失效並清空；複製按鈕同時停用。不得讓舊結果看似對應新資料。
- 無結果的初始狀態提供一句下一步提示。欄位錯誤狀態保留輸入。成功後顯示排序表與最低單價；再編輯顯示「資料已變更，請重新比較」。
- 「清除」重設成 FR-01 的 2 列、重量類別、空價格／容量／名稱、包數 1、g 單位；清除錯誤、結果與剪貼簿狀態。
- 離開頁面時清空所有欄位與衍生結果；BFCache 恢復頁面時也回到空白初始狀態。沒有 localStorage、sessionStorage、IndexedDB、cookie、網址資料或後端保存。

### FR-10：複製結果

- 只有成功結果可複製。一次按鈕手勢後以 `navigator.clipboard.writeText` 寫入完整純文字表（含分類、同幣別說明、排序、所有列及四位單價）；不寫 HTML、不下載 TXT。
- Clipboard API 不可用或拒絕時，顯示相同內容的可選取唯讀文字框與人工複製指示，不使用 `document.execCommand`。錯誤文案不含輸入值。
- 複製是唯一非同步產品操作。按下時同步設為 busy 並停用再次複製，配置唯一 request ID，捕捉不可變結果快照及 revision，再呼叫 `writeText`。每次輸入狀態變更遞增 revision 並使該 request 失效。成功或拒絕只可更新同時符合最新 request ID 與 revision 的畫面狀態；失效操作的晚到完成不得讓新表格顯示「已複製」或舊備援文字框。promise settle 後只在 request 仍有效時解除 busy。系統剪貼簿寫入本身不可由頁面取消，剪貼簿內容仍對應使用者按下複製時的快照。
- 不讀取剪貼簿，不要求剪貼簿權限設定，不在未按按鈕時存取剪貼簿。

### FR-11：資料與隱私

- 名稱、價格、容量、包數和結果只存在目前頁面的記憶體／DOM；沒有遙測、分析、錯誤回報、第三方 API、遠端字型、CDN、外連腳本或輸入資料網路請求。
- 頁面只載入自身的 HTML、CSS、ES modules。使用者明確按複製後，只有結果純文字交給瀏覽器系統剪貼簿；這不是上傳服務。
- 所有輸入作為不可信資料；畫面以 text node 渲染，不組合插入 HTML。伺服器僅供本機靜態開發預覽，預設綁定 `127.0.0.1:4196`；port 占用時用 OS 分配的 loopback port 並記錄，且只讀取專案 `public/`。
- 不允許檔案存取、讀剪貼簿或額外瀏覽器權限。

### FR-12：鍵盤與適應式介面

- 所有流程可用鍵盤操作；標籤、錯誤、表格標頭、status、焦點順序與按鈕狀態有語意。焦點清楚可見，不依賴顏色表達最低價或錯誤。
- 320 CSS px 無頁面水平溢出；資料表可在自身具標籤的區域橫向捲動。200% 縮放時操作、錯誤與主按鈕仍可達。
- 正文字級 15–17px、輔助字級至少 12px；一般文字對比至少 4.5:1，控制邊界與大字至少 3:1；遵守減少動態效果偏好。

## 明確不做

MVP 不提供匯率、稅／折扣自動套用、商品規格資料庫、促銷條件、商品品質建議、含稅價格推測、不同類別換算、持久化、分享連結、使用者帳號、批次匯入、文字下載、分析或雲端同步。未來提案須另立任務與驗收，不能在 M1 靜默加入。



---

## 原文件 TECHNICAL.md

# 技術規格：購物單價比較

狀態：**SPEC_ONLY**，尚無實作或測試結果。依據 [PRODUCT.md](PRODUCT.md) 的 FR 編號；驗收案例在 [ACCEPTANCE.md](ACCEPTANCE.md)。

## 架構與路徑

正式工具是原生 HTML、CSS、瀏覽器 ESM 的靜態網站；Node.js 24+ 僅供開發、離線測試和建置。沒有 runtime 套件、bundler、框架、伺服器 API、Web Worker 或遠端資產。

M1/T00 最小路徑：

```text
package.json
public/
  index.html                  # 繁體中文預設頁
  en/index.html
  robots.txt                  # M1 preview only: Disallow: /
  styles/app.css
  js/app.mjs
  js/core/unit-price.mjs
scripts/
  serve.mjs
  check.mjs
  build.mjs
test/
  unit-price.test.mjs
HANDOFF.md                    # 主編另建，記錄真實進度
dist/                         # build 產物；由腳本生成，不手動編輯、不發佈來源
```

M1 不建立 Cloudflare 設定或正式 canonical/sitemap。兩個 HTML 頁面帶 `noindex, nofollow`，`public/robots.txt` 使用 `Disallow: /`。M2 需經主代理驗收 M1 後才可新增發布設定；新增 `npm run build:production` 與 `npm run check:production`，產生正式 SEO 版本並驗證固定 origin allowlist；M3 正式部署、首頁整合、公開 SEO 回應驗證由主代理負責。

## 純函式介面

模組 `public/js/core/unit-price.mjs` 對瀏覽器和 Node ESM 匯出純函式，不讀 DOM、時間、網路或全域狀態：

```js
parseDecimalToScaledInteger(raw, options)
validateComparisonInput(input)
calculateComparison(input)
compareUnitPrices(a, b)
formatUnitPrice(numerator, denominator)
formatTotalQuantity(totalMilli)
createCopyText(result, locale)
```

- `parseDecimalToScaledInteger` 回傳 discriminated result：`{ ok: true, value: BigInt }` 或 `{ ok: false, code }`；不得以 `parseFloat`、`Number` 或鬆散解析猜測使用者意圖。
- `validateComparisonInput({ category, rows })` 對 schema、列數和每一欄回傳可定位錯誤 `{ rowIndex, field, code }`；全域錯誤使用 `rowIndex: null, field: null`。錯誤不包含自由原文，並依全域錯誤、來源列順序、欄位順序穩定排列。
- `calculateComparison(input)` 先全量驗證；無效回傳 `{ ok: false, errors }`，有效回傳 `{ ok: true, category, basis, rows, cheapestRowIds, hasRoundedCollision }`。輸入每列含 `id, name, price, capacity, packCount, unit`。`id` 是非空且最多 64 UTF-16 code units 的內部字串；重複 ID 一律拒絕。UI 以頁面生命週期內遞增的 row counter 產生 ID，移除後不重用。回傳列含 `sourceIndex, displayName, priceCents, totalQuantityMilli, rank, lowest, unitPriceNumerator, unitPriceDenominator, displayUnitPrice`。不得突變輸入。
- `compareUnitPrices(a,b)` 比有理數，以 BigInt 交叉相乘，回傳 `-1 | 0 | 1`。不得用顯示字串或四捨五入值排序。
- `formatUnitPrice(n,d)` 僅接受 `n >= 0, d > 0`；固定四位小數 half-up。輸出字串；若原值大於零且四捨五入為 0，輸出 `<0.0001`；原值為 0 輸出 `0.0000`。
- `formatTotalQuantity(totalMilli)` 將標準單位的 milli 整數輸出為最多三位小數、去尾零的十進位字串；不把 BigInt 轉浮點。地區化標點只在展示層加上，不參與數學。
- `createCopyText(result, locale)` 只使用已驗證的結果物件，產生完整純文字輸出。名稱字串保持文字，不回到 HTML。

函式名稱、形狀可依現有工程樣式調整，但不得改變上述可觀察契約。

### 固定錯誤碼與 schema

核心必須只回傳下列穩定錯誤碼；UI 依 `field` 與 `code` 產生雙語文案，不顯示例外或 raw 值：

- `invalid-input-schema`：頂層缺少／多出欄位、`rows` 不是陣列，或輸入結構不符 `{ category, rows }`。
- `row-count-out-of-range`：列數少於 2 或多於 12。
- `invalid-category`：分類不是 `weight`、`volume`、`count` 之一。
- `invalid-row-schema`：列缺少／多出欄位，欄位型別錯誤，或 ID 為空／超過 64 code units。
- `duplicate-row-id`：兩列有相同 ID。
- `invalid-unit`：單位不屬於當前分類的 allowlist。
- `required`：價格、容量或包數 trim 後為空。
- `input-too-long`：價格、容量或包數原始字串超過 32 UTF-16 code units；在 trim 前檢查。
- `invalid-format`：固定十進位／整數語法不符，包含件數使用小數。
- `price-out-of-range`：已符合無符號十進位語法的價格大於 9,999,999.99；正負號不合語法，回傳 `invalid-format`。
- `capacity-out-of-range`：容量小於或等於 0，或大於 1,000,000。
- `pack-count-out-of-range`：包數小於 1 或大於 1000。
- `name-too-long`：名稱超過 80 UTF-16 code units。
- `name-control-character`：名稱包含 C0/C1 控制字元。

頂層 schema 恰為 `category, rows`；每列恰為 `id, name, price, capacity, packCount, unit`。欄位錯誤的 `field` 只能使用對應欄名；schema／分類／列數等全域錯誤使用 `field: null`。同一列可有多個欄位錯誤，依 `name, price, capacity, packCount, unit` 次序回報。`parseDecimalToScaledInteger` 只負責字串、長度與語法，回傳 `required`、`input-too-long` 或 `invalid-format`；價格、容量和包數的範圍碼由 validator 在 BigInt 轉換後回報。

## 精確數字與排序

### 解析

- 價格字串最多 32 UTF-16 code units；只 trim U+0009–U+000D 與 U+0020。使用固定語法 `digits+(?:\.digits{1,2})?`。補齊小數位至 2 位後，以 BigInt cents 表示；再按數值檢查 0–999,999,999 cents。
- 容量最多 32 UTF-16 code units，語法 `digits+(?:\.digits{1,3})?`。補齊至 milli 後用 BigInt 表示。對 `kg`、`L` 再乘 1000 轉成標準 g、mL 的 milli 值；`g`、`mL`、`piece` 不乘比例。
- 件數欄只接受整數文字，轉為 BigInt milli-piece（整數乘 1000）；不得接受分件。
- 包數驗證成 1–1000 的整數，轉 BigInt 後相乘。名稱長度以 JavaScript `String.length` 的 UTF-16 code units 計。
- 選擇器類別與單位以固定 allowlist 驗證，任何未知列或未知類別都拒絕，不替換成預設值。

### 整組總量與單價

令 `C` 為價格 cents，`Q` 為標準單位 milli 的每包容量，`P` 為包數。總量 `T = Q × P`（BigInt）。以貨幣單位計算每基準單位的有理數：

- 重量／容量，每 100 個標準單位：`N = C × 1000, D = T`，值為 `N/D`。
- 件數，每 1 件：`N = C × 10, D = T`。
- 比較兩列 `a,b`：比較 `a.N × b.D` 與 `b.N × a.D`。負結果代表 a 較便宜。完全相等才並列。
- 對精確有理數排序；相等時按來源列 index 升冪。第一組名次為 1；每遇到不同有理數名次遞增 1，因此 `1,1,2` 是 dense ranking。
- 最低價由最小精確有理數決定；所有完全相等列皆標低價。

### 顯示

將 `N/D` 四捨五入為四位小數的整數刻度：
`rounded = floor((2 × N × 10000 + D) / (2 × D))`。
以 BigInt 完成商與餘數；不得先轉 Number。格式化 `rounded / 10000`，固定四個小數位。非零原值 rounded=0 用 `<0.0001`；免費價格用 `0.0000`。以原始分數比對四捨五入文字群，若同一顯示值有不相等的精確分數，加上 FR-08 的說明，但名次不變。

總量以 `T / 1000` 及餘數組合字串；最多三位小數並移除尾端零。單價基準與總量單位一起呈現，避免把 `1,500 g` 誤讀成 `1.5 kg`。價格欄不帶幣別符號，表頭提醒所有價格採同一幣別；小數點固定為句點，總量可依 `zh-TW`／`en` 加群組分隔，但分隔不得送入解析器。

## 介面狀態與非同步剪貼簿

- 初始、成功、欄位錯誤、資料更改後待重算、剪貼簿寫入中、已複製、剪貼簿拒絕而可手動複製、清除後狀態均由單一頁面 state 推導。核心計算同步完成，不表示有 loading。
- 任一來源改動都遞增 `revision`、清空 result/copy fallback/status 並停用 Copy。驗證錯誤仍留在相應欄位旁；更正欄位清除該欄錯誤。
- Copy handler 在直接使用者 click 的事件處理中同步設 `copyBusy`、停用 Copy，並配置遞增 `copyRequestId`；取得不可變的 result snapshot 和 revision，再呼叫 `navigator.clipboard.writeText(copyText)`。若已有 request pending，忽略重複操作。成功或拒絕僅在 request ID 仍為最新且 revision 相同時更新畫面；任何來源修改均遞增 revision 並使 request 失效。有效的拒絕顯示可聚焦唯讀純文字 fallback 和選取按鈕／鍵盤指示；過時的成功或拒絕都不得污染新狀態。settle 僅在 request 仍有效時解除 busy。
- 不呼叫 `navigator.clipboard.readText`、不預先 request permission、不用已淘汰的 `document.execCommand`。Clipboard API 可能因安全上下文、瀏覽器策略或權限拒絕；UI 必須提供人工路徑。
- `pagehide` 清空表單、範例標記、錯誤、結果、fallback 及計算快照；`pageshow` 以空白預設值重新初始化，以涵蓋 BFCache。不得用 `beforeunload` 留存資料或彈窗。

## 本機開發伺服器與建置

- `scripts/serve.mjs` 使用 Node 24 built-in `node:http`，只綁 `127.0.0.1`、預設 port 4196、只 GET/HEAD、只解析 allowlisted 靜態路徑。若預設 port 已占用，採用 OS 分配的 loopback port 並記錄實際 URL；不得停止占用程序或嘗試以其他固定 port 取代。路徑正規化後確認仍在 `public/` 下；拒絕 traversal、encoded traversal、未知檔與非 GET/HEAD。回傳不含使用者內容的固定狀態訊息。
- `npm run dev` = `node scripts/serve.mjs`。
- `npm test` = `node --test`；測試只用內嵌假資料、離線執行。
- `npm run check` = `node scripts/check.mjs`；檢查必要檔案、ESM syntax、頁面連結／本機資源路徑，以及禁用外部資源、storage、追蹤或危險 HTML sink 的專案規則。文字掃描是保護網，不是安全證明。
- `npm run build` = `node scripts/build.mjs`；將審核過的 `public/` 複製到 `dist/`，只包含本機預覽靜態檔。不複製 test/docs/source inputs，不產生可索引 canonical；頁面保留 `noindex`，robots 保留 `Disallow: /`。
- `package.json` 使用 `type: module`、`private: true`、`engines.node: >=24`，無 dependencies/devDependencies。正式產品不載入 Node 程式。
- 每個 script 必須真正檢查／建置／服務並在失敗時非零退出，不可空殼通過。

## 安全與資料生命週期

輸入、欄位錯誤、樣本和結果全是本機暫存；無 server-side code、network API、外部請求、分析、遙測、字體或登入。只有使用者按 Copy 時以 Clipboard API 寫純文字。顯示名稱用 `textContent` 或 DOM text nodes；禁止 `innerHTML`、HTML template 字串插值、eval、動態 script。表格輸出純文字只能是 text，不得生成含使用者內容的 markup。伺服器公開路徑 traversal 是 M1 必測安全界線。

只允許給數值上限的欄位參與運算；全部十進位轉 BigInt。不要以有限位數 Number 先算再轉 BigInt。最大中間乘積可高於安全整數範圍，因此任何轉 Number 都只限列 index、已驗證上限內的控制狀態或最後視覺格式化，不能拿來判斷或捨入單價。

## 官方參考

- [ECMAScript 2023：BigInt 型別與整數運算](https://tc39.es/ecma262/2023/multipage/ecmascript-data-types-and-values.html)
- [W3C Clipboard API and events：非同步剪貼簿寫入與安全／隱私](https://www.w3.org/TR/clipboard-apis/)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Node.js 24：測試執行器](https://nodejs.org/docs/latest-v24.x/api/test.html)
- [Node.js 24：HTTP](https://nodejs.org/docs/latest-v24.x/api/http.html)

上述來源用來界定 API，不取代本文件驗收條件。不得使用這些連結作為新增套件或遠端執行碼的理由。



---

## 原文件 UX-SEO.md

# 介面與 SEO 規格：購物單價比較

狀態：**SPEC_ONLY**；這是未實作介面和內容規格，不代表正式 SEO 或搜尋結果驗收。設計模式採 Product App（Impeccable Operate）：單一「精準比較工作表」方向，沿用 Gloss Tools shared tokens。比較表與表單是主畫布，不做行銷 hero、卡片拼貼或裝飾動畫。

完整計算與邊界見 [PRODUCT.md](PRODUCT.md)；可重現案例見 [ACCEPTANCE.md](ACCEPTANCE.md)。

## 工作階段與視覺層級

- 使用者：購物者；場景：同一次購物比較不同包裝標示與實付價格。
- 首要工作：輸入商品資料並找出每 100 g、每 100 mL 或每件最低價。
- 成功：看得到按精確單價排序的清單、整組總量及所有並列最低值。
- 頻率：不確定的假設；常見但未經研究驗證。
- 風險：金額／容量輸入錯誤會誤導個人購買選擇；不涉及付款或外部交易。
- 平台：桌面與手機瀏覽器；核心物件是使用者正在編輯的商品比較表。

常駐：分類、同幣別提示、所有商品列、比較／清除、結果狀態。相鄰：新增／移除列、每列錯誤、複製。漸進式：無進階面板或隱藏功能。範例按鈕是次要操作，標明只會載入假資料。

## 線框

桌面（≥ 75rem；內容寬度可伸展，頁面只用一個工作主欄）：

```text
┌──────────────────────────────────────────────────────────────┐
│ GlossQuote · 購物單價比較     [繁體中文 | English]             │
├──────────────────────────────────────────────────────────────┤
│ 比較商品的實際單位價格                                         │
│ 同次請輸入相同幣別。輸入整組實付價格與每包容量。                 │
│                                                              │
│ 比較類別 [重量 ▾]       [載入範例]                             │
│                                                              │
│ 商品 1                                                        │
│ 名稱 [選填]  整組實付價 [____]  每包容量 [____] [g ▾]  包數 [1]│
│ 商品 2                                                        │
│ 名稱 [選填]  整組實付價 [____]  每包容量 [____] [g ▾]  包數 [1]│
│ [+ 新增商品]                                                  │
│                         [清除] [比較單價]                     │
│                                                              │
│ 比較結果（按實際單價排序）                                     │
│ 排名 │ 商品 │ 實付價格 │ 整組總量 │ 每 100 g                 │
│  1   │ ...  │ ...      │ ...      │ ... 最低單價             │
└──────────────────────────────────────────────────────────────┘
```

手機（320 CSS px 起；外層垂直排列，資料表可在有標籤的區域水平捲動）：

```text
┌──────────────────────────┐
│ 購物單價比較 [語言]       │
│ 比較同幣別下的包裝單價。 │
│ 類別 [重量 ▾]            │
│ [載入範例]               │
│ 商品 1                   │
│ 名稱 [____________]      │
│ 整組實付價格 [_________] │
│ 每包容量 [____] [g ▾]    │
│ 包數 [___]               │
│ 商品 2 …                 │
│ [+ 新增商品]             │
│ [清除]                   │
│ [比較單價]               │
│ 比較結果                  │
│ [可水平捲動的結果表格]   │
└──────────────────────────┘
```

窄版表格的捲動容器須有可讀名稱，鍵盤可聚焦且可水平移動；周圍說明、表單、主要動作不可被包在捲動區。結果每列在窄螢幕可換行，但不能隱藏單價或總量。

## 文案與狀態

繁中與英文各自完整提供以下文案，按語言頁的 `lang`、標籤、錯誤、輔助文字、按鈕、狀態與 FAQs 均須翻譯。不能把英文版只做導航或標題翻譯。

| 狀態 | 繁體中文 | English |
|---|---|---|
| 初始空白 | 加入至少兩個商品，填入整組實付價格、每包容量和包數，再比較單價。資料只留在此頁面。 | Add at least two items, enter the price paid for each pack, pack size, and pack count, then compare. Your entries stay on this page. |
| 載入範例 | 已載入標示為範例的兩筆資料；按「比較單價」查看結果。 | Example values are loaded. Select “Compare unit prices” to see the result. |
| 成功 | 已按未四捨五入的單價排序。最低單價以文字和符號標示。 | Sorted by unrounded unit price. The lowest price is marked with text and a symbol. |
| 來源已更改 | 資料已變更，舊結果已清除；請重新比較。 | Inputs changed. The previous result was cleared; compare again. |
| 欄位錯誤 | 請修正標示欄位後再比較。所有商品都必須完整有效。 | Correct the marked fields before comparing. Every item must be complete and valid. |
| 低於顯示精度 | <0.0001；非零單價已低於顯示精度。 | <0.0001; the nonzero unit price is below the display precision. |
| 顯示相同但精確值不同 | 顯示值已四捨五入；排序依未四捨五入單價。 | Values are rounded for display; ordering uses the unrounded unit price. |
| 同價 | 同價並列。 | Exact tie. |
| 剪貼簿成功 | 結果已複製。 | Results copied. |
| 剪貼簿拒絕 | 瀏覽器未允許自動複製；請選取下方文字並手動複製。 | The browser blocked copying. Select the text below and copy it manually. |
| 清除後 | 已清除。請重新輸入商品資料。 | Cleared. Enter item details to start again. |
| 類別已改 | 類別已更改。容量已清空，請重新輸入此類別的每包容量。 | Category changed. Pack sizes were cleared; enter sizes for this category. |
| 同幣別提示 | 同一次比較請使用相同幣別；此工具不換匯。 | Use one currency for this comparison. This tool does not convert currencies. |
| JavaScript 不可用 | 此工具需要啟用 JavaScript；沒有資料送出。 | This tool requires JavaScript. No data was submitted. |

欄位錯誤需對應名稱、價格、容量、包數與類別；用明確格式和範圍說明，例如「請輸入 0–9,999,999.99 的金額，最多兩位小數。」不要只說「無效」或回顯 raw exception。按比較後聚焦第一個錯誤，並用一個摘要說明錯誤數量；不要讓多個 live region 同時朗讀整張表。

## 互動、可及性與行動裝置

- 每個 input/select 有始終可見的 label；placeholder 不是 label。名稱、價格與容量欄以 `type=text` 搭配適合的 `inputmode`，防止 number input 默默接受指數或負數。
- 每列以 fieldset/legend 組織，欄位錯誤用 `aria-describedby` 關聯並設 `aria-invalid`。新增／刪除提供文字按鈕名稱和剩餘／上限提示。
- 結果用語意 table、`caption`、`th scope=col`；每個 rank 和「最低單價」同時有可見文字和符號，不能只用綠色。
- 成功／清除／複製的輕量訊息用單一 `role=status aria-live=polite`。驗證錯誤可有摘要，聚焦第一個無效欄位。避免計算時不必要地重播結果。
- 頁面遵循 family 的 shared ink/paper/accent/control/focus tokens，不下載字體。酸綠用墨色字；普通文字對比至少 4.5:1，必要控制邊界至少 3:1。焦點須在白／紙／綠底清楚可見。
- 觸控目標以 44×44 CSS px 為目標；任何小於 24×24 的目標需符合可及性允許的間距例外。
- 320 CSS px 及 200% 縮放都保留所有欄位與按鈕；只允許結果表自身水平捲動。欄位錯誤不能被固定導覽或虛擬鍵盤遮住。
- `prefers-reduced-motion` 下不播放裝飾動畫；本工具不需要動畫。結果是同步運算，因此不出現虛假 spinner。
- 不在表單/結果間巢狀卡片。共享品牌使用於文字細節和分隔線；唯一視覺重點是精確列出比較資料的工作表。

## 雙語 SEO 內容

頁面名稱保持一致：繁中「購物單價比較」、英文 “Unit Price Comparison”。SEO 文案必須與可見工具功能一致，不宣稱省下多少錢、最佳商品、搜尋排名或全瀏覽器支援。

### 繁體中文

- 建議 slug：`unit-price`；正式 host 已排定為 `price.glossquote.com`，但 M1 本機預覽不能用正式 URL 作 canonical。
- Title：`購物單價比較器｜比較不同容量與包數的實付單價｜GlossQuote`
- Description：`輸入商品整組實付價格、每包容量與包數，換算並排序同一幣別下每 100 公克、每 100 毫升或每件的單價。資料在目前瀏覽器頁面計算，不換匯。`
- H1：`比較商品的實際單位價格`
- 導言：`輸入每組實際付款金額和包裝規格，就能比較不同大小與包數。所有價格請用同一幣別；這個工具不會查商品、換匯或計算未輸入的折扣。`
- 可見解說：`重量以每 100 公克、容量以每 100 毫升、件數以每件比較。若輸入的不是相同幣別，結果沒有意義。`

FAQs（畫面可見；不是只放結構化資料）：
1. **如何比較不同包數的商品？** 輸入每包容量和包數；工具先算出整組總量，再以整組實付價除以總量比較。
2. **促銷後價格要怎麼填？** 輸入你實際為整組支付的金額。工具不推測折扣、稅金或運費。
3. **可以比較不同幣別嗎？** 不可以；同一批比較須使用同一幣別，工具不做匯率換算。
4. **重量和容量可以一起比嗎？** 不可以；先選一種類別。工具不假設液體密度。
5. **我的商品名稱和價格會上傳嗎？** 不會；計算在目前頁面記憶體內。只有按複製時，結果純文字會交給瀏覽器剪貼簿。

### English

- Suggested slug: `unit-price`; planned host: `price.glossquote.com`. Local preview must not use that production URL as its canonical.
- Title: `Unit Price Comparison | Compare Pack Sizes and Prices | GlossQuote`
- Description: `Enter each pack’s price, size, and pack count to compare the same-currency price per 100 g, 100 mL, or item. Calculations stay in the current browser page; no currency conversion.`
- H1: `Compare the actual unit price of each item`
- Introduction: `Enter what you paid for each pack and its package size to compare different formats. Use one currency throughout. The tool does not look up products, convert currencies, or infer discounts you did not enter.`
- Visible explanation: `Compare weight per 100 g, volume per 100 mL, or item count per piece. Results are meaningful only when all prices use the same currency.`

FAQs (visible on the page):
1. **How do I compare products with different pack counts?** Enter the size of one pack and the number of packs. The tool calculates the total quantity before comparing the total price.
2. **Should I enter the sale price?** Enter the amount you actually paid for the full pack set. The tool does not infer discounts, tax, or shipping.
3. **Can I compare different currencies?** No. Use one currency for a comparison; this tool does not convert exchange rates.
4. **Can I compare weight and volume together?** No. Choose one category. The tool does not assume a product’s density.
5. **Are my item names and prices uploaded?** No. Calculations stay in the current page’s memory. The result is passed to the browser clipboard only when you select Copy.

## 正式 SEO 發布階段

本節定義之後 M2/M3 的建置要求；它們不能在 M1 預覽中標記完成。

- M1 所有本機／預覽頁面帶 `<meta name="robots" content="noindex, nofollow">`，不要輸出正式 canonical、sitemap 或可索引 JSON-LD。頁面仍有唯一 title、meta description、language switch 和正文。
- M2 主代理確認 M1 驗收後，實作可重現的 release build。正式繁中 URL 為 `https://price.glossquote.com/index.html`，英文為 `https://price.glossquote.com/en/index.html`；若實際主機路徑改變，先由主代理修規格並驗證，不要憑空發布。
- 正式頁 self-canonical。兩頁各自列 `zh-Hant`、`en` 和 `x-default`；`x-default` 指向可到達的繁中預設版。兩語互相提供可見 language switch。正式 sitemap 僅列真實正式 URL，包含雙語 alternate links；不列 localhost、預覽、draft 或失效頁。
- 正式 robots 規則需允許公開工具頁與 sitemap，不能同時 noindex／Disallow。實際 HTTP 回應須由主代理檢查 canonical、robots、hreflang、sitemap、cache/security headers 和 status code。
- 每個語言工具頁含可見內容相符的 JSON-LD `WebApplication`（Schema.org；也屬 `SoftwareApplication` 子類型），只使用已證實的名稱、URL、描述、語言和工具類別。不得虛構評分、評論、下載量、相容性或市場資料；不能承諾會取得 rich result 或排名。FAQ 文字可以是可見 HTML，不能為了片段展示資格而捏造 schema。
- 正式首頁的雙語入口與工具回首頁連結由主代理的 M3 整合負責；網址確定後才加入 catalog，並驗證首頁與工具互返連結。
- 在更改為 `index, follow` 前先驗證 HTTPS 正式頁可達、內容與 structured data 正確；索引結果與排名沒有保證。

## 待主代理確認的發佈資料

正式 hostname 已由主架構決定為 `price.glossquote.com`，免費 Cloudflare 工具發佈在家族既有授權範圍。此 SPEC_ONLY 文件不表示 DNS、Worker/Pages、repo、正式首頁或 Search Console 已完成設定。



---

## 原文件 ACCEPTANCE.md

# 驗收案例：購物單價比較

狀態：**SPEC_ONLY**。這些是未來產品測試的獨立預期，不是已執行結果。需求對照 [PRODUCT.md](PRODUCT.md)，演算法見 [TECHNICAL.md](TECHNICAL.md)。

M1/T00 必須把自動案例做成離線 `node:test`；人工案例須由瀏覽器實際操作並按證據分別記 PASS／FAIL／NOT_RUN。規格中的範例不是測試通過證明。

M1 必須由真實瀏覽器執行 B01–B04，兩種語言都要完成範例比較、格式／必填錯誤與來源修改後失效。B05–B20 逐項保留實際狀態；若設備或瀏覽器能力不可用，可標 `NOT_RUN` 並說明原因，不得用靜態審查或模擬結果冒充。完整 Network／Storage 面板檢查、其他瀏覽器、手機／縮放、原生剪貼簿與人工可及性量測都可列 `NOT_RUN`；自動化 A34 server 邊界測試仍是必要 gate。

## 自動離線測試

所有金額預期使用同一幣別的無符號貨幣數值；單價字串固定 4 位小數。容量使用標準單位 g、mL、piece。

| ID | 需求 | 輸入／步驟 | 精確預期 |
|---|---|---|---|
| A01 | FR-01/02/08 | 兩列空白 | `ok:false`；每列價格和容量各有必填錯誤；沒有部分結果。 |
| A02 | FR-07/08 | 載入範例後比較：A 120 / 500 g ×2；B 150 / 1.5 kg ×1 | 成功；排序 B、A；B `10.0000 / 100 g` rank 1；A `12.0000 / 100 g` rank 2；總量分別 1500 g、1000 g。 |
| A03 | FR-03/08 | 重量：A 12 / 1 kg；B 12 / 1000 g | 完全相等；rank 1、1，來源順序不變；各 `1.2000 / 100 g`。 |
| A04 | FR-03/08 | 容量：A 3 / 1.5 L；B 3 / 1500 mL | 完全相等；總量均 1500 mL，單價均 `0.2000 / 100 mL`，rank 1、1。 |
| A05 | FR-02/08 | A 60 / 500 g ×2；B 90 / 1 kg ×1 | A 總量 1000 g、`6.0000 / 100 g`；B 總量 1000 g、`9.0000 / 100 g`；A rank 1。 |
| A06 | FR-08 | 重量：A 120 / 1000 g；B 60 / 500 g；C 150 / 1000 g | A 與 B 精確並列 rank 1 且照原列先後；C rank 2；C 單價 `15.0000 / 100 g`。 |
| A07 | FR-08 | 20 kg，整組價格 246.89 | 每 100 g 精確 `1.23445`，half-up 顯示 `1.2345`。 |
| A08 | FR-08 | 20 kg，整組價格 246.91 | 每 100 g 精確 `1.23455`，half-up 顯示 `1.2346`。 |
| A09 | FR-08 | A 1 / 99.996 g；B 1 / 100 g | 兩列都顯示 `1.0000 / 100 g`；精確值 A 大於 B，所以 B 在前；提示顯示值四捨五入但排序依精確值；不並列。 |
| A10 | FR-04/08 | 價格 `0`、重量 500 g ×1 | 合法最低單價 `0.0000 / 100 g`，不顯示 `<0.0001`。 |
| A11 | FR-08 | 價格 0.01、容量 1,000,000 g ×1000 | 精確非零單價顯示 `<0.0001 / 100 g`。 |
| A12 | FR-04 | 價格 `9999999.99`，容量 100 g | 接受；顯示 `9999999.9900 / 100 g`。 |
| A13 | FR-04 | 價格 `10000000` | 超過最大值，錯誤 `price-out-of-range`；不得以浮點近似接受。 |
| A14 | FR-04 | 價格 `0001.2` | 接受並解析為 120 cents；原輸入不被自動改寫。 |
| A15 | FR-04 | 價格依序為空、`1.001`、`1e2`、`+1`、`-1`、`,1`、`.5`、`5.`、全形 `１２`、含內部空白 | 空字串回傳 `required`；其餘各自回傳 `invalid-format`；不可默默變成 1 或 100。 |
| A16 | FR-04 | 金額 `0.0`、`0.01`、前後 ASCII 空白 + `1`、前後全形空白 + `1` | 前三種接受（分別 0、1、100 cents）；全形空白不由 ASCII trim 移除，因此拒絕。 |
| A17 | FR-05 | 容量 `0` 或空白 | `0` 回傳 `capacity-out-of-range`；空白回傳 `required`。 |
| A18 | FR-05 | 重量 `0.001 g` | 接受，標準總量 1 milli-g。 |
| A19 | FR-05 | 重量 `1000000.000 g` | 接受最大容量；總量 1,000,000,000 milli-g（單包）。 |
| A20 | FR-05 | 容量 `1000000.001`、`0.0001`、`1.0000`、`1e2` | 依序回傳 `capacity-out-of-range`、`invalid-format`、`invalid-format`、`invalid-format`。 |
| A21 | FR-05 | 件數容量 `1` 與 `1.5` | `1` 接受；`1.5` 回傳 `invalid-format`。有效件數單位價基準是每件。 |
| A22 | FR-06 | 包數 `1` 和 `1000`；另測 `0`、`1001`、`1.0`、`1e2` | 端點接受；`0`、`1001` 回傳 `pack-count-out-of-range`；`1.0`、`1e2` 回傳 `invalid-format`。 |
| A23 | FR-02/06 | 2 列與 12 列；另對 core 傳 1 列與 13 列 | 2、12 列可驗證；1、13 列回傳 `row-count-out-of-range`；不得部分計算。 |
| A24 | FR-04/05/06 | 數值原始字串長 33 code units，但只由前導零和末尾 1 組成 | 因 raw 上限先拒絕 `input-too-long`，不得因數值等於 1 而放行。 |
| A25 | FR-06 | 名稱全空白、含外側空格的 `牛奶` | 第一列空白使用該列號 fallback；第二列顯示 trim 後 `牛奶`。 |
| A26 | FR-06 | ASCII 名稱 80 與 81 UTF-16 code units；40 個 emoji 與 41 個 emoji | 80 和 40 emoji 接受；81 和 41 emoji 回傳 `name-too-long`（emoji 各佔 2 code units）。 |
| A27 | FR-06/FR-11 | 名稱含內部 LF／NUL；另用 `<img src=x onerror=alert(1)>` | 前兩者回傳 `name-control-character`；HTML 樣字串作普通文字保留，不執行、不改寫標籤。 |
| A28 | FR-03 | 改重量至容量 | 每列容量清空、單位改 `mL`；名稱、價格、包數保留；舊結果清除。 |
| A29 | FR-08 | 頂層多出欄位、分類改未知值、單位改未知值、數值 raw 欄位改傳非字串，或 row 多出欄位 | 依序回傳 `invalid-input-schema`、`invalid-category`、`invalid-unit`、`invalid-row-schema`、`invalid-row-schema`；不得以預設值替換。 |
| A30 | FR-08 | 對最大價格、最大容量及 1000 包計算排名 | 精確結果全程 BigInt；使用超過 Number.MAX_SAFE_INTEGER 的中間乘積仍得到正確排序、rank 與顯示，不溢位。 |
| A31 | FR-10 | 建立 2 列成功 result 後呼叫 `createCopyText` | 純文字完整含類別、同幣別註記、排名、商品、實付價、包數、總量和每列基準單價；沒有 HTML markup。 |
| A32 | FR-08 | 三列精確值排序為 0、0、1 | 免費商品並列 rank 1、1；第三列 rank 2；每個最低列都有最低標示。 |
| A33 | FR-08 | 兩個有效列使用相同 `id`；再用缺少 `id` 的列 | 重複 ID 回傳 `duplicate-row-id`；缺少 ID 回傳 `invalid-row-schema`；不得合併或覆蓋列。 |
| A34 | FR-11 | 以 OS 分配的 loopback port 啟動 server；使用不會先正規化 `../` 的 raw HTTP target，另測 encoded traversal、隱藏檔和 POST | 只有允許的靜態 GET/HEAD 可讀取 public 內容；其他請求均非成功內容回應，不洩漏 public 以外 sentinel；測試不得停止既有程序或固定 port 服務。 |

## 瀏覽器手動案例

人工項需要真實瀏覽器操作，不可用 Node DOM mock 或靜態 HTML 取代。每項記瀏覽器、版本、頁面語言、操作步驟與觀察；若沒有可操作設備就記 NOT_RUN。B01–B04 是 M1 必跑主流程；其他項目不阻止 M1，但不得將它們暗示為已通過。

| ID | 需求 | 操作 | 預期／證據 |
|---|---|---|---|
| B01 | FR-01/12 | 開啟本機 zh-Hant 與 en 頁面，操作語言切換 | 各自完整翻譯、語言標籤正確、路徑互相導覽；沒有一語半成品。 |
| B02 | FR-07/08 | 在繁中與英文頁各按「載入範例」；確認未自動計算；再按「比較單價」 | 兩語皆顯示 A/B 標示樣本；比較後 B 10.0000、A 12.0000；B rank 1，文案、單位及結果欄完整翻譯。 |
| B03 | FR-09 | 在繁中與英文頁各得到成功結果後改一個數字 | 兩語結果立即消失，Copy 停用，status 說明須重新比較；不殘留舊最低標籤。 |
| B04 | FR-08/12 | 在繁中與英文頁各清空一個必填欄，另以非法格式比較多列 | 兩語皆顯示所有無效欄位關聯錯誤、保留值、第一個錯誤收到焦點；沒有跳過不完整列。 |
| B05 | FR-02/12 | 增加至 12 列，再試新增；刪到 2 列，再試刪除 | 按鈕在邊界停用並有文字說明；列數永不超界；新增空列不被忽略。 |
| B06 | FR-09 | 換類別重量→容量→件數 | 容量／單位依規格重設；價格、名稱、包數保留；結果消失並提示重新填容量。 |
| B07 | FR-10 | 成功結果按複製；貼入本機文字編輯器 | 完整純文字表格正確，無 HTML 或漏列；這是使用者明確剪貼簿動作。 |
| B08 | FR-10 | 在不提供 Clipboard API／拒絕權限的瀏覽器按複製 | 可聚焦唯讀 fallback 出現，人工選取可複製；畫面沒有 raw exception 或要求讀剪貼簿權限。 |
| B09 | FR-10 | 控制剪貼簿 promise 延遲；pending 時再次按 Copy，然後修改欄位，再分別讓 promise resolve/reject | pending 時 Copy 同步 disabled 且第二次操作不會呼叫 writeText；來源改動使 request/revision 失效，晚到成功或拒絕都不會污染新畫面。記錄可重現操作。若瀏覽器無法控制延遲，列 NOT_RUN，不能假稱通過。 |
| B10 | FR-11 | 若可用，開啟 DevTools Network，載入頁面、填唯一假名稱 `LOCAL-ONLY-TEST`、比較，不按 Copy | 執行時除同源 HTML/CSS/ES modules 外，沒有網路請求；唯一字串不出現在 URL/request/console。按 Copy 後也不應產生網路呼叫；無法觀察時標 `NOT_RUN`。 |
| B11 | FR-09/11 | 輸入假資料後重新整理；再按瀏覽器返回使頁面經 BFCache 恢復 | 兩次均為空白 2 列、重量、包數 1；結果與錯誤不存在。記錄 browser/操作；只做靜態程式審查不足以 PASS。 |
| B12 | FR-12 | 全程只用 Tab、Shift+Tab、Enter、Space、方向鍵 | 類別、列欄位、新增／刪除、比較、結果複製和語言連結可達；焦點指示清楚；錯誤關聯可感知。 |
| B13 | FR-12 | 視窗 320 CSS px 寬並操作最大 12 列結果 | 外頁無水平溢出；允許結果 table 自己水平捲動；主要按鈕及欄位不被遮擋。 |
| B14 | FR-12 | 桌面和手機實際瀏覽器 zoom 200% | 所有欄位、錯誤、主要操作仍可讀、可用；無內容遺失。 |
| B15 | FR-12 | 檢查黑白文字、欄位、焦點、成功/錯誤狀態及最便宜列 | 普通字對比≥4.5:1、必要邊界/大字≥3:1；狀態同時用文字／符號，不靠顏色。需量測或輔助技術證據。 |
| B16 | FR-03/08 | 在不同類別各跑一次已知結果 | 標準基準標籤和容量正確：每100 g、每100 mL、每件；沒有混用 g 與 kg 或推測密度。 |
| B17 | FR-11 | 若可用，檢查 public 靜態資源、DevTools network 與 local/session storage、cookies、IndexedDB | 無追蹤、外部字型、第三方呼叫、持久化或 cookie；只載入所需同源資源；無法觀察時標 `NOT_RUN`，以靜態掃描不得冒充瀏覽器 PASS。 |
| B18 | FR-11 | 若可用，在瀏覽器確認本機伺服器狀態，嘗試 path traversal、encoded traversal、POST | 僅綁定 loopback；預設 127.0.0.1:4196，若占用則使用並記錄 OS 分配 port；拒絕 traversal/POST；不讀取 public 以外檔案。缺少瀏覽器操作時標 `NOT_RUN`，A34 仍必須通過。 |
| B19 | FR-01 | 停用 JavaScript 載入頁面 | 顯示不會送出資料的明確提示，沒有假結果或可誤按的比較流程。 |
| B20 | FR-12 | 作業系統啟用 reduce motion 再操作 | 核心狀態照常可見，沒有必要動畫依賴。 |

## 站點與發布驗收（僅後續階段）

M1 的 `noindex` 預覽不是正式 SEO PASS；同時需確認預覽 `robots.txt` 有 `Disallow: /`。M2/M3 需要：
- 實際確認繁中／英文頁各自 canonical、互返 hreflang 和 x-default 目標可達。
- 真實 sitemap 只列正式 URL；robots 允許索引且沒有 noindex/Disallow 衝突。
- HTTP status、HTTPS、正確語言 head、可見文案及 WebApplication JSON-LD 與頁面一致；不含評分、虛構評論、搜尋排名承諾。
- 主代理真實部署驗證雙語首頁入口和工具回首頁的相對語言連結；記錄實際正式來源 commit。
- 正式網址與 GitHub URL／固定 commit 必須實測才記錄；預覽網址、測試快照或 repo 存在不等於發布完成。



---

## 原文件 TASKS.md

# 實作任務與里程碑：購物單價比較

狀態：**SPEC_ONLY**；所有任務尚未開始。任務對照 [PRODUCT.md](PRODUCT.md)、技術契約 [TECHNICAL.md](TECHNICAL.md) 與 [ACCEPTANCE.md](ACCEPTANCE.md)。一個任務未通過其 gate，不勾選後續任務。

## M1 / T00：本機可用雙語 MVP

**目標：**一個任務完成精確比較核心與測試、完整繁中／英文靜態 UI、輸入驗證、清除與複製流程、離線 dev/check/build。M1 完成時先停下等待主代理讀實際 diff、重跑必要驗收並核准；不能自己進 M2。

**允許修改路徑（僅此專案內，另含明列的 append-only evidence）：**

- `package.json`（M1 僅 ESM scripts/Node engine 設定，不得加入 runtime dependency）與 `.gitignore`（只排除 `node_modules/`、`dist/`、必要 temp）。
- `public/**`：本工具必要的雙語 HTML、CSS、瀏覽器 ESM 與其他自製靜態資產；預覽 `robots.txt` 僅供 `Disallow: /`。M1 不加入 production SEO 或正式部署資產。
- `scripts/serve.mjs`、`scripts/check.mjs`、`scripts/build.mjs`，以及為完整驗證／建置必要、範圍限本工具的 `scripts/**` 本機 helper。
- `test/**`：核心、UI state helper、static server、build/check 與工程邊界的離線測試；只用合成資料。
- `HANDOFF.md`；`project.json`、`START-HERE.md`、`docs/RELEASE-CANDIDATE.md` 只可更新真實 milestone 狀態與命令證據，不改其他規格或政策文件。
- 孵化器根 `.runs/unit-price/**` 僅可新增 append-only 測試證據；不得覆蓋或刪除既存證據。
- `dist/**` 只能由 build 生成，維持忽略且不列入來源提交。

M1 不得新增正式 release／Wrangler 部署設定、不建立正式 SEO 產物、不推送 GitHub、不部署或修改共用首頁，也不得加入 runtime dependency。六份產品規格、其他共同 docs、其他工具、根目錄與持久 Windows 系統設定均不可改。未列且非上述明確範圍的路徑不可建立。

**不可破壞行為：**

- 依 FR/TECHNICAL 全列驗證、BigInt 精確排序、真並列 dense rank、類別切換清空容量、所有來源變更清結果。
- 2–12 列，預設 2 列重量/g/包數1；輸入固定 grammar 和所有硬上限；範例只填表不自動算。
- 無儲存、上傳、外部請求、分析、遠端字型或檔案；剪貼簿僅在直接使用者操作寫入純文字；明確失敗可人工複製。
- 繁中與英文功能對等；可用鍵盤、320px、200% zoom。
- 預覽保留 noindex；`robots.txt` 使用 `Disallow: /`；本機 server 僅綁 loopback、預設 `127.0.0.1:4196`，若占用使用並記錄 OS 分配 port，且只提供 public assets。

**步驟：**

1. 先確認來源工作樹確為 SPEC_ONLY，Node 為 24+；不讀取 credential，不安裝套件、不碰根目錄 persistent environment。若規格和程式狀態不符，先停下回報。
2. 建立 ESM package scripts，無 runtime dependency；實作真正受限的本機靜態 server 與 public-only build/check。
3. 先實作並測試固定小數 parse、驗證、BigInt 正規量換算、精確排序、dense rank、half-up 格式化、並列與 rounding collision。
4. 建立雙語語意 HTML、單一精準工作表 UI、validation/results/copy revision states、同一 CSS design direction。
5. 完成 A01–A34 中對應的離線核心與 server-boundary 回歸；用真實瀏覽器執行 B01–B04，繁中與英文都操作主要成功流程、欄位錯誤、來源修改後使舊結果失效。不得用 mock 宣稱瀏覽器 PASS。
6. 執行全套 `npm test`、`npm run check`、`npm run build`；逐項記錄實際命令、exit status、B01–B04 的瀏覽器／版本／語言／操作觀察，以及 B05–B20 的 PASS/FAIL/NOT_RUN、已知風險與待決事項。更新 `HANDOFF.md`、`START-HERE.md`、`project.json`、`docs/RELEASE-CANDIDATE.md` 只反映實際狀態，append-only 證據寫到指定 `.runs/unit-price/`。

**驗收命令（在 package scripts 完成後，Node 24+）：**

```powershell
node --version
npm test
npm run check
npm run build
npm run dev
```

在實際瀏覽器以兩種語言完成 B01–B04；這四項涵蓋兩語主流程、錯誤與來源資料修改失效。B05–B20 逐項記錄，因設備／瀏覽器能力而未能操作時可標 NOT_RUN；完整 Network／Storage、其他瀏覽器、手機／縮放、原生剪貼簿與人工可及性檢查不可由靜態掃描冒充 PASS。靜態來源與安全規則由 `npm run check`、離線自動化 A34 與 primary review 分別驗證。M1 通過仍需主代理獨立驗收，作者自稱完成不是批准。

**停止並回報條件：**

- 有既有檔案或未提交使用者修改會被覆蓋；實際路徑超出 allowlist。
- Node 不是 24+、必要命令反覆失敗兩次且沒有新證據、或發現部署/外部 service/付費需求。
- 任何產品計算只能透過浮點近似、或規格與可用瀏覽器 API 衝突。
- 瀏覽器需要額外權限、網路、儲存或需讀取憑證才能完成。
- 顯示單價同值但無法確保精確排序，或剪貼簿 fallback / revision gate 無法實現。

**完成後：**停止在 M1，送主代理實際檔案/diff、測試命令與輸出、手動項狀態、風險、變更 commit、下一步阻塞。不得自行建立 release 設定或發布。

## M2：主驗放行後的 production build 與公開來源

**前置：**只在收到主代理明確的 M1 驗收通過訊息後開始；既有使用者授權已涵蓋本工具的公開來源與免費 Cloudflare 發布流程，不需重問。若 M1 未通過，保持 `BLOCKED_PENDING_PRIMARY_M1_ACCEPTANCE`。

**目標：**在原 feature chat 完成 production build/check、release regression tests 與 reviewed publishing copy，推送更新到公開來源 repo `https://github.com/KYStr/glossquote-labs-unit-price` 並核實 visibility/commit。使用固定 origin `https://price.glossquote.com`，不以訪客 Host/query 決定 SEO；M2 只建立已驗證 release candidate，不部署正式網站、不改共用首頁、DNS 或 Cloudflare 帳戶。

**M2 允許路徑：**

- 本工具 `package.json`、`.gitignore`、`public/**`、`scripts/**`、`test/**`；release／validation helper 必須留在本工具且有離線測試。`wrangler.jsonc` 或 `wrangler.toml` 擇一及必要靜態 response-header 配置可新增；若需工具套件，只可加有理由且版本固定的 devDependency，不得有 runtime dependency。
- `HANDOFF.md`、`START-HERE.md`、`project.json`、`docs/RELEASE-CANDIDATE.md` 僅作真實狀態紀錄；不改 PRODUCT、TECHNICAL、UX-SEO、ACCEPTANCE、TASKS 或共用政策 docs。
- `.runs/unit-price/**` 只新增 append-only evidence；`.runs/github-publish/glossquote-labs-unit-price/**` 是唯一 reviewed publishing copy，先檢查既有內容，不刪除重建或覆蓋使用者檔案。`dist/**` 僅由 production build 生成。

**必要 release checks：**提供 `npm run build:production`、`npm run check:production`、`npm run test:production`。驗證固定正式 origin 的雙語 self-canonical、互返 hreflang／x-default、robots/sitemap、JSON-LD 與可見內容一致、noindex 預覽不洩入正式輸出；檢查 response-header 設定、正確 MIME、未知路徑回傳真正 404 且無 SPA fallback，並對 production 產物做離線 release regression tests。把上述規則與產物 manifest、測試結果寫入 release candidate。

**來源發布：**在完成檢查後由原 feature chat 以獨立 reviewed copy 執行既有授權的公開 GitHub 更新，不操作孵化器根 Git、不 force push、不讀取或顯示 credentials。驗證 remote 是公開、記錄實際 commit SHA/HEAD 與逐檔 source manifest，產生固定 commit archive 並從解壓副本重跑 build/check/test；需要登入或權限缺失時停止回報，不搜尋憑證或擴大權限。主代理收到後獨立審查實際 diff、commit、產物與證據，再決定是否放行 M3。

## M3：正式主機、首頁和外部複驗

主代理完成並驗收 Cloudflare 部署到已授權免費子網域 `price.glossquote.com`、正式 HTTPS/SEO/headers/404、雙語首頁 catalog/backlinks，並產生外部驗收包。feature chat 不得執行 live deploy 或修改共用首頁。上線後標記「已上線，待外部複驗」；外部確認前不標功能完成。

## 變更管理

產品決策若要變更，先把決策與原因回寫相關文件，再更新實作；不要只改介面。任何超出 M1 允許路徑、驗收門檻或隱私邊界的需求先交主代理裁定。每任務未完成都寫入 HANDOFF：狀態、modified files、命令/結果、人工 PASS/FAIL/NOT_RUN、known risks、primary decisions。



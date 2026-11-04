# 訂單揀貨與裝箱單 — 既有規格保存

Task ID: `labs-44-order-picklist` · Spec ID: `spec-44-order-picklist`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求：訂單揀貨與裝箱單

狀態：規格，尚未實作。目標使用者是小店包貨人員，先把同 SKU 的訂單行加總成倉庫走貨清單，再逐訂單檢查箱內品項。

## MVP 決策

- 輸入單一 UTF-8 CSV，必須有唯一非空標題列；第一個 BOM 可去除。檔案 ≤1 MiB、資料列 ≤5,000、欄 ≤30；使用者映射 order ID、SKU、product name、quantity 四欄。
- CSV 依 RFC 4180 常見 quoting，接受 CRLF/LF/CR 之一作一致 record separator。Malformed quoting、不同列欄數、無效 UTF-8、空／重複欄名拒絕。值保留字串，ID/SKU 不 trim、不轉數字。
- order ID、SKU、品名必須非空（精確空字串視空）；空白字元不是空值，保留為內容。ID/SKU 僅以精確字串比對，`001 !== 1`。
- 數量只接受 ASCII 十進位整數字串；允許前導零，但解析為正整數 1–100,000。禁止正負號、小數、千分位、指數、內外空格及 Unicode digits。以 `BigInt` parse；任一 SKU 全表累計與任一 order/SKU 合計均不得超過 1,000,000,000。
- 相同 SKU 若出現不同品名字串（exact）屬歧義，整批拒絕，不按第一筆選名。相同 order ID + SKU 重複行可加總，並保留首見順序。
- 成功後提供 total pick sheet 和逐訂單 packing lists；頁面勾選僅當前分頁狀態，可下載固定名稱 `order-picklist.txt` 和 `order-picklist.json`。無地址/付款欄匯出。

## 功能需求

### FR-01：檔案與 CSV

byte cap 1,048,576；標題後 ≤5,000 rows；≤30 columns。採嚴格 parser：quoted comma、`""`、quoted CRLF/LF/CR；外部 record separator 同檔一致；末尾 newline 不算空列。非 UTF-8、malformed quote、mixed record separator、row width error、duplicate/empty header 都有固定錯碼與 record index。任何超限整檔拒絕。

### FR-02：欄位映射和資料列驗證

使用者為 orderId、sku、name、quantity 各選一個不同 header；不得重複選相同欄。映射前顯示 headers 和兩筆樣本。每列前三欄 `value !== ''`；數量需符合 `^[0-9]+$`，再 `BigInt` 範圍檢查。`0001` 允許，數值計算 1；order ID/SKU 保留 `0001` 原樣。行錯誤最多先顯示 20 筆細節及總數；有任一錯誤即不產出 partial list。

### FR-03：SKU 品名一致性

依第一筆出現順序建立 `Map<sku,{name,total,...}>`；同 SKU 後續品名必須與首筆 exact `===`。不套 NFC、不 trim、不 case-fold；品名衝突列出 SKU、row index 和兩種品名，阻止全批。相同品名的 SKU 彼此絕不合併。

### FR-04：彙總和每單裝箱

每輸入 row 依序加到 SKU totals 和該 order 的 items；SKU totals 順序 = SKU 首次出現順序；orders 順序 = order ID 首次出現順序；單內 items 順序 = SKU 首次在該 order 出現順序。重複 order+SKU 行累加。逐次累加以 BigInt，若任一SKU total或order/SKU總量 >1,000,000,000，拒絕 `TOTAL_TOO_LARGE`。

例：`O1,A,筆,2; O2,A,筆,3; O1,B,紙,1` => pick A 5、B 1；O1 A 2/B 1；O2 A 3。

### FR-05：完成核對

總揀貨表每一 SKU 有可勾 checkbox、SKU、品名、總件數和包含該 SKU 的訂單數。各訂單區塊顯示訂單 ID、item 列和數量，可逐項勾核。勾選存 page memory；結果或來源變更即清空。完成率是 checkboxes checked/total，不宣稱貨品已實際入箱。

### FR-06：輸出 schema

JSON schemaVersion=1：

```json
{
  "schemaVersion": 1,
  "tool": "order-picklist",
  "totals": [{"sku":"A","name":"筆","quantity":5,"orderCount":2,"checked":false}],
  "orders": [{"orderId":"O1","items":[{"sku":"A","name":"筆","quantity":2,"checked":true}]}],
  "counts": {"sourceRows":3,"skuCount":2,"orderCount":2}
}
```

JSON 和 TXT 合計輸出上限 8 MiB；UTF-8 byte cap 在 Blob 建立前檢查。TXT 使用固定 heading 和所有原始識別字串；filename 固定，不將欄值轉成路徑。下載不含客戶地址、付款、email、電話。

### FR-07：狀態、取消、stale 與清理

`idle → parsing → mapping → validating → ready → aggregating → result`。錯誤為 `blocked`，取消回 `mapping`。換檔、映射變更、reset 使 generation++，清結果／checks／Blob URLs；舊 run 不可覆蓋新狀態。聚合可同步；每 100 rows yield 並檢查 AbortSignal，cancel 不輸出 partial result。Reset/pagehide 清 File、rows、map、結果，revoke URL。沒有 browser storage。

## 錯誤碼與非目標

`FILE_TOO_LARGE`, `INVALID_UTF8`, `CSV_SYNTAX`, `ROW_WIDTH`, `HEADER_INVALID`, `ROW_LIMIT`, `COLUMN_LIMIT`, `MAPPING_INVALID`, `REQUIRED_VALUE_EMPTY`, `QUANTITY_SYNTAX`, `QUANTITY_RANGE`, `SKU_NAME_CONFLICT`, `TOTAL_TOO_LARGE`, `OUTPUT_TOO_LARGE`, `CANCELLED`。不支援庫存扣減、訂單付款狀態、客戶地址、配送/分批/套組/BOM、barcode、外部連結或安全庫存建議。


---

## 原文件 TECHNICAL.md

# 技術契約：訂單揀貨與裝箱單

狀態：規格，尚未實作。使用原生 HTML/CSS/瀏覽器 ESM、Node.js 24+ 內建模組、node:test；runtime 無 dependencies。Node 僅開發／測試／build。正式候選為靜態瀏覽器工具，不連外、不上傳、不用框架、CDN、外部字型或第三方 API。

## 建議檔案樹

```text
package.json
public/index.html
public/styles/app.css
public/js/app.js
public/js/core/csv.mjs
public/js/core/orders.mjs
public/js/core/export.mjs
scripts/serve.mjs
scripts/check.mjs
scripts/build.mjs
test/csv.test.mjs
test/orders.test.mjs
test/export.test.mjs
```

產品獨立，不 import sibling source。共用安全、品牌、工程規則由 `docs/PRIVACY-SECURITY.md`、`docs/BRAND.md`、`docs/ENGINEERING.md`、`docs/DESIGN-SYSTEM.md` 提供。

## 純函式介面

```js
parseCsv(bytes, limits = { maxBytes: 1_048_576, maxRows: 5000, maxColumns: 30 })
// -> { headers: string[], rows: string[][] } | CsvError

validateLine(row, mapping, rowIndex)
// -> { orderId, sku, name, quantity: bigint } | RowIssue[]

buildPickLists(parsed, mapping, { signal, onProgress })
// -> { totals: PickTotal[], orders: OrderList[], counts } | OrderError

serializePickLists(result)
// -> { txt: Uint8Array, json: Uint8Array } | OutputLimitError
```

Parser採 byte cap first、fatal UTF-8、single leading BOM removal、strict quote state machine、exact header / row width；only uniform CRLF/LF/CR exterior record separator is accepted, quoted values preserve embedded separators. `001` remains ID/SKU string. Quantity accepts only ASCII `[0-9]+`, parse via `BigInt`, bounds `1n..100000n`; do not call `Number` before validation.

Aggregate in one pass. `Map` preserves insertion order; `skuMap` maps exact SKU to first-seen exact name and BigInt total; `ordersMap` maps exact order ID to per-order SKU map. On each row compare exact name and add quantity; run limits immediately. Keep original input order references only as long as needed. Before DOM, convert validated quantities to base-10 strings for display and JSON to avoid unsafe integer loss. HTML data is inserted by `textContent`.

## 處理狀態、取消、清理

UI runner has generation integer and AbortController. States: `idle`, `parsing`, `mapping`, `validating`, `ready`, `aggregating`, `result`, `stale`, `blocked`, `cancelled`. Change source/mapping first invalidates `result` synchronously and disables download. Aggregate runner yields every 100 input rows; after each yield rechecks abort and generation. On cancel discard totals/orders arrays. Reset clears File references, parser data, maps, checkbox state and output bytes. Blob URL is revoked on re-export, reset and `pagehide`; no persistent storage.

Progress copy reports processed row counts; never user data. User file names are text only. Checkbox state is local page state and excluded from no-upload interactions except explicitly exported JSON; JSON only records the checkbox values at time of export. Exports use fixed safe names and TXT/JSON MIME types. Total artifact bytes cap 8,388,608 across both outputs.

## 命令與 build

ESM private package, no dependencies. `npm test` = `node --test`; `npm run check` = `node scripts/check.mjs`; `npm run build` = `node scripts/build.mjs`; future local preview on `127.0.0.1:4224`, static root `public/`. `build` copies only reviewed `public/` files into `dist/`. This spec phase does not install packages or start any server/browser.

## Official sources

- [RFC 4180](https://www.rfc-editor.org/rfc/rfc4180.html) describes common CSV quoting and acknowledges implementation variations; this product deliberately accepts a specified strict subset.
- [ECMAScript Map](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map-objects) defines insertion-ordered key collections; required first-seen output order is an explicit product rule.
- [ECMAScript BigInt](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-bigint-objects) supports exact integer accumulation beyond safe Number arithmetic; serialized quantities are decimal strings where needed.


---

## 原文件 UX-SEO.md

# 介面與搜尋資料：訂單揀貨與裝箱單

狀態：規格，尚未實作。Surface mode：Product App。M1 noindex/nofollow，候選網址 `picklist.glossquote.com` 未驗證前不設 production canonical 或 sitemap。

## 搜尋文案

**繁中 title：** 訂單揀貨與裝箱單｜依 SKU 彙總訂單明細  
**繁中 description：** 在本機將訂單 CSV 轉為 SKU 總揀貨表及逐單裝箱清單，保留商品編號並找出品名衝突。  
**繁中 H1：** 先集中揀貨，再逐單核對

**English title:** Order Pick List and Packing Lists | Group by SKU  
**English description:** Turn a local order-lines CSV into a consolidated SKU pick sheet and per-order packing lists, with exact IDs and conflict checks.  
**English H1:** Pick products together, then pack each order

## 工作區線框

桌面 Wide：

```text
┌────────── 訂單揀貨與裝箱單 ── zh-TW ─────── 待載入 ────────────┐
│步驟 / 列表導覽  │                    工作區                   │ 來源摘要│
│ 1 匯入 CSV      │ [選擇訂單明細 CSV]                           │ 3 列   │
│ 2 欄位對應      │ 訂單ID → [?]  SKU → [?] 品名 → [?] 數量 → [?]│ 4欄上限│
│ 3 總揀貨        │ [預覽揀貨表]                                 │ 本機處理│
│ 4 逐單裝箱      │ SKU | 品名 | 總數 | 訂單數 | 已核 ✓           │        │
│                 │ A   | 筆   | 5    | 2      | □                 │        │
├─────────────────┴──────────────────────────────────────────────┤
│ 訂單 O1：A 筆 ×2 □  B 紙 ×1 □   訂單 O2：A 筆 ×3 □               │
│ 完成 1 / 3   [下載揀貨與裝箱資料]                                │
└─────────────────────────────────────────────────────────────────┘
```

手機 Compact：

```text
┌ 揀貨與裝箱 ─ 狀態 ┐
│ 匯入 → 欄位 → 核對 │
│ [選 CSV]          │
│ 訂單ID / SKU      │
│ 品名 / 數量       │
│ [產生清單]        │
├───────────────────┤
│ 總揀貨             │
│ A · 筆 · 5 · □    │
│ B · 紙 · 1 · □    │
│ [各訂單清單]      │
│ O1 — A×2 □ B×1 □  │
│ O2 — A×3 □        │
│ [下載 TXT] [JSON] │
└───────────────────┘
```

主要畫布是清單本身；mapping 放其前面的單一明確步驟，不要求拖曳。SKU 使用等寬字體便於辨識；checkbox 就在受影響的商品旁。

## 狀態文字

Idle：「選取訂單明細 CSV。」；parsing：「正在讀取 84 列…」；mapping：「請確認訂單編號、SKU、品名和數量欄。」；validating：「正在檢查數量與 SKU 品名…」；result：「已整理 25 個 SKU、18 張訂單。」；empty：「檔案只有欄名，沒有明細可揀。」；blocked duplicate name：「SKU A 在第 2、9 列有不同品名。清單未建立，請修正資料來源。」；quantity fail：「第 4 列數量必須是 1–100,000 的整數。」；running：「正在整理第 500 / 1,200 列…［取消］」；stale：「來源或欄位對應已變，舊清單已作廢。」；success check：「已核對 12 / 25 個 SKU。」這代表頁面標記，不代表已實物揀完。

## 無障礙

資料表使用 `<table>` 標籤及 scope heading；小螢幕表格可在 labeled region 橫捲，周圍按鈕不隨之離開畫面。checkbox 具有完整文字名稱如「已核對 SKU A，筆，5 件」；Space 操作、Tab 順序穩定。主要 touch target 至少 44×44px；不靠顏色表示衝突／已核對。320px、200% zoom、4.5:1 文字對比、明顯 focus 和 reduced-motion 都是 browser gate。

## FAQ

### 繁體中文

**相同品名的不同 SKU 會合併嗎？** 不會；只按 SKU 精確合併。  
**重複的訂單／SKU 列會怎樣？** 數量會加總，並保留第一次出現的順序。  
**會讀取地址或扣庫存嗎？** 不會；工具只接受四個訂單明細欄位，不連到庫存或物流系統。

### English

**Will different SKUs with the same name be merged?** No. Only exact SKU strings are grouped.  
**What happens to repeated order/SKU rows?** Their quantities are added while preserving first-seen order.  
**Does this read addresses or change inventory?** No. It uses four order-line fields and has no inventory or shipping connection.

## Browser gate

Node tests can verify parser, validation, exact totals and JSON schema. Actual file selection, checkbox keyboard operation, screen reflow, download and no-network behavior remain **NOT_RUN_USER_FOCUS_INCIDENT** until primary confirms a truly isolated browser execution surface. No OS print or save dialog may be triggered during tests.


---

## 原文件 ACCEPTANCE.md

# 驗收 oracle：訂單揀貨與裝箱單

狀態：規格，尚未實作。資料為合成 fixture oracle，並非已執行的測試。

## 自動 oracle

1. **A01 FR-01 CSV basics** — `order,sku,name,qty\r\nO1,A,筆,2`；一筆 4 欄，`qty==='2'` 字串。
2. **A02 FR-01 quoted field** — `o,s,n,q\nO1,A,"筆,自動鉛筆",2`；name 精確為 `筆,自動鉛筆`。
3. **A03 FR-01 quoted line break** — `o,s,n,q\nO1,A,"筆\n藍色",2`；name 保留 LF；row index 不跟實體行數混淆。
4. **A04 FR-01 malformed CSV** — `o,s,n,q\nO1,A,"bad`；`CSV_SYNTAX`，不回任何可匯總 rows。
5. **A05 FR-01 width** — 4 headers 卻只有 3 cells；`ROW_WIDTH` 並標 record index 1。
6. **A06 FR-01 caps** — bytes 1,048,576 / 5,000 rows / 30 columns 邊界接受；各自多一單位拒絕相應 cap error。
7. **A07 FR-02 mapping** — 同一 header 被映射給 orderId 和 SKU；`MAPPING_INVALID`。四個不同 headers 可映射成功。
8. **A08 FR-02 string identity** — SKU `001` 一列 qty2、SKU `1` 一列 qty3；兩個 SKU totals，標籤保持 `001` 和 `1`。
9. **A09 FR-04 aggregate** — `O1,A,筆,2;O2,A,筆,3;O1,B,紙,1`；totals A=5/B=1，O1 A=2/B=1，O2 A=3。
10. **A10 FR-04 repeated line** — `O1,A,筆,2;O1,A,筆,3`；一 SKU total5，一 order item quantity5。
11. **A11 FR-03 name conflict** — `O1,A,筆,1;O2,A,自動筆,1`；`SKU_NAME_CONFLICT`，含 row indexes 1、2，不產生總表。
12. **A12 FR-03 same name, different SKU** — rows SKU A/筆、SKU B/筆；仍兩個 pick rows。
13. **A13 FR-02 required empty** — 空 orderId、空 SKU 或空 name 任一欄；`REQUIRED_VALUE_EMPTY`，整批阻止。
14. **A14 FR-02 empty versus spaces** — orderId `""` rejects; orderId `" "` is retained as nonempty exact string and is not silently trimmed.
15. **A15 FR-02 quantity grammar** — `0`, `100001` -> `QUANTITY_RANGE`; `1.5`, `+1`, `1e2`, ` 1`, `１` -> `QUANTITY_SYNTAX`; `0001` accepted as 1.
16. **A16 FR-04 total bound** — synthetic same-SKU/order values sum exactly 1,000,000,000 accepted; next increment -> `TOTAL_TOO_LARGE` with no partial list.
17. **A17 FR-05 hostile strings** — SKU `<img src=x onerror=alert(1)>`; it displays as text, no element, script or request is created.
18. **A18 FR-05 check state** — check one of 3 pick rows; page says `1 / 3`, exported JSON marks only that row `checked:true`; reset removes all checks.
19. **A19 FR-06 schema / safe filename** — order ID `../../secret` remains JSON text; downloaded name exactly `order-picklist.json` or `.txt`.
20. **A20 FR-06 output cap** — combined TXT+JSON exactly 8,388,608 bytes accepted; one byte more blocks both outputs without partial download.

## Browser／人工門檻

需確認 CSV file chooser 不以名稱誤判格式、欄位映射可鍵盤操作、總表及各訂單清單在 320px／200% zoom 仍可讀、checkbox accessible name、進度／取消、TXT/JSON 下載、network offline 無外連。這些真瀏覽器檢查標 **NOT_RUN_USER_FOCUS_INCIDENT**，不准用純函式結果冒充 PASS；不開 OS print/file-picker dialog。


---

## 原文件 TASKS.md

# 實作任務：訂單揀貨與裝箱單

狀態：規格，尚未實作。Node 24+ ESM，零 runtime dependencies；不 `npm install`。本規格階段不啟動 server/browser。真 browser gate 依 focus incident 暫記 `NOT_RUN_USER_FOCUS_INCIDENT`，待主驗提供確實隔離的方式。

1. **T00 — Scaffold / contract check。** 前置：規格及主編共用文件。Allowed paths：本專案 `package.json`, `.gitignore`, `scripts/**`, `public/**`, `test/**`, `dist/**`, `HANDOFF.md`, `TASK-ENTRY.md`, `evidence/m1/**`。設 ESM private package、Node test/check/build/dev；dev loopback-only `127.0.0.1:4224`。驗收 `node scripts/check.mjs`，確認 build source allowlist。完成：零依賴和真實腳本；寫 HANDOFF。
2. **T10 — CSV parser and line validation。** 前置 T00 PASS。新增 parser core + unit tests。實作 strict UTF-8/CSV、caps、四欄不同 mapping、required values、quantity regex/BigInt bounds。驗收 `node --test test/csv.test.mjs test/orders.test.mjs`，核對 A01–A08、A13–A15。完成：非法來源一律整批拒絕；寫 HANDOFF。
3. **T20 — aggregation and exports。** 前置 T10 PASS。新增 stable insertion-order maps、品名 conflict、sum caps、schema/TXT、8 MiB combined output check。驗收 `npm test`，核對 A09–A12、A16–A20。完成：總表與各單 totals 不丟列、不混 SKU；寫 HANDOFF。
4. **T30 — Bilingual Product App。** 前置 T20 PASS。建立 source selection, column mapping, pick sheet, packing lists, checkboxes, download. DOM insertion text-only。驗收 `npm run check` + `npm run build`；browser gate 只有隔離可用才跑。完成：工作結果是畫布主體、各狀態清楚；寫 HANDOFF。
5. **T40 — lifecycle and safety。** 前置 T30 PASS。加入 progress, AbortController, generation invalidation, stale/cancel, reset/pagehide clearing and blob cleanup; no storage/remote resource. 驗收 `npm test`, `npm run check`, `npm run build`。完成：source/mapping change kills old export and checks；寫 HANDOFF。
6. **T50 — UX/accessibility/final M1。** 前置 T40 PASS。完成兩語 meta/H1/FAQ、noindex、keyboard, aria, 320px, 200% zoom, reduced-motion. 驗收 final `npm test`, `npm run check`, `npm run build` each once；真 browser not run 如實登記。Allowed paths 同 T00。完成：HANDOFF 載明每個 gate 的 PASS/FAIL/NOT_RUN，無超範圍 changes；不得未經主驗另指令發布。

每項完成需回寫 HANDOFF。失敗時停在當前項，不提前勾後項；修復後只重跑受影響的檢查。


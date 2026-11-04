# 兩份表格對帳 — 既有規格保存

Task ID: `labs-42-table-reconcile` · Spec ID: `spec-42-table-reconcile`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求：兩份表格對帳

狀態：規格，尚未實作。目標使用者是需要把兩個系統匯出清單對起來的會計助理或營運人員。核心成功條件是使用者能指出每個差異來自哪個來源列，且不會把不同 key 靜默合併。

## MVP 與明確決策

- 只接受兩個 UTF-8 CSV 檔，每個必須有唯一、非空標題列；第一個 UTF-8 BOM 可移除。
- 每邊原始檔最多 1 MiB、資料列最多 5,000、欄最多 30。欄位值保留成 JavaScript 字串；不做數字、日期、大小寫或 Unicode 正規化。
- 介面先自動建議兩邊名稱完全相同的欄位配對，使用者確認。左右欄名可不同；每個欄只能配一次。至少選一組比較欄，key 欄可不納入比較欄。
- 唯一鍵為 1–3 組左右欄位對照。預設 `exact`。可明確選「只對 key 值 trim 前後空白」；資料原值仍保留，且 trim 後重新驗證空鍵／重複鍵。比較欄一律原字串比較。
- 一個來源中出現空 key 或重複 key，整次對帳停止；不配對、不產生部分下載。
- 確認結果後可下載固定名稱 `table-reconcile.json` 及 `table-reconcile.txt`。兩種產物 UTF-8 bytes 合計上限 16 MiB；若任一產物或合計超限，整批匯出失敗、兩個下載均不可用，且清除舊輸出 Blob，不提供截斷或僅下載其中一種。頁面對帳結果仍可讀；可減少來源列後重新跑。
- 所有處理在當前頁面記憶體；不寫 localStorage、IndexedDB、Cookie、服務端或遙測。重設／頁面離開清除引用與 Blob URL。

## 功能需求

### FR-01：載入與界線

使用者選擇左、右 CSV 後，顯示檔名（純文字）、大小及解析狀態。每個檔上限 1,048,576 bytes；超過立即拒絕，不先完整解碼。總列數為標題後最多 5,000 筆，欄最多 30。超過上限不進入映射步驟。空檔、只有空白內容、非有效 UTF-8、二進位或解析不完整都要指出來源及行／記錄位置。

CSV dialect：以 RFC 4180 的逗號、雙引號包欄、`""` escape 和引用欄內換行為基礎；接受外部記錄分隔符 CRLF、LF 或 CR，但不接受同一檔內不同分隔符混用。引用欄可包含逗號及換行。未閉合 quote、未引用欄位中 quote、結束 quote 後非逗號／記錄分隔符、欄數不一均拒絕。忽略檔案開頭單一 BOM；不 trim 欄名或值。只允許最後一個 record terminator，不把它解讀成額外空白列；中間空行是單欄空記錄，因欄數不合而拒絕。

### FR-02：標題和映射

欄名以 CSV 解碼後字串逐字處理；空字串、重複欄名拒絕。映射清單為 `{leftColumn,rightColumn}`；每一側不得重複使用同一欄。UI 列出全部欄名及左右樣本值，以文字節點呈現。選定 1–3 組 key 和至少一組 compare pair 後才可開始。若同一欄被同時選為 key 與 compare，不視為錯誤：key 仍以 key 規則比對，compare 仍顯示原值差異。

### FR-03：建立唯一鍵與拒絕歧義

每列 key tuple 由各 key 欄解碼值依欄位順序組成。`exact` 用原字串。`trim` 僅對 key tuple 每格套用 `String.prototype.trim()`；不改資料 row。任一 tuple 成員為空字串（trim 時以 trim 後結果判定）或同側 tuple 重複，顯示來源、資料列 index、衝突 key 文字摘要並停止。不得用 delimiter 串接 tuple；必須以欄位長度或 JSON tuple 編碼，避免 `['a|b','c']` 與 `['a','b|c']` 碰撞。

### FR-04：精確對齊與分類

先以左側資料列順序掃描：沒有右列則 `leftOnly`；找到右列則逐一比較 compare pairs，無差異為 `same`，有差異為 `changed` 並列出所有不同 pair。最後依右側原順序補上尚未出現的 `rightOnly`。左右 row index 從資料列第一筆起算為 1，不是實體行號，因欄位可以換行。計數必須滿足四類筆數總和等於 `max(leftRows,rightRows)` 以外並不成立；正確不變條件是分類中的 matched pairs 不重複、left-side coverage = left row count、right-side coverage = right row count。

### FR-05：檢視與無損差異資料

結果檢視提供總覽與四個可切換區段：一致、僅左、僅右、欄位不同。每列顯示 key、左右資料列、差異欄和左右值；內容以純文字呈現。長值可展開但不可預設截斷下載資料。當任一分類為 0 時顯示 `0 筆`，不隱藏分類。

### FR-06：輸出

JSON schemaVersion 固定為 1，欄位如下。此例對應左 `001,A;002,B`、右 `001,A;003,C`，所以四類互斥且計數相符：

```json
{
  "schemaVersion": 1,
  "tool": "table-reconcile",
  "options": {
    "keyMode": "exact",
    "keys": [{"left": "id", "right": "id"}],
    "fields": [{"left": "amount", "right": "amount"}]
  },
  "counts": {"leftRows": 2, "rightRows": 2, "same": 1, "leftOnly": 1, "rightOnly": 1, "changed": 0},
  "same": [{"key": ["001"], "leftRow": 1, "rightRow": 1}],
  "leftOnly": [{"key": ["002"], "leftRow": 2, "left": ["002", "A"]}],
  "rightOnly": [{"key": ["003"], "rightRow": 2, "right": ["003", "C"]}],
  "changed": []
}
```

`same` 不重複放原資料以減小結果；changed/only 陣列含完整該側 row 字串陣列。另一個獨立 changed 例子：若左右同 key `001` 的 v 分別是 `A`、`X`，該 key 只在 `changed` 出現，欄位差異為 `[{"left":"v","right":"v","leftValue":"A","rightValue":"X"}]`。TXT 包含固定標題、設定摘要、筆數和四分類資料；以 JSON-stringified 風格引號顯示字串，避免換行／控制字元混淆。JSON 和 TXT UTF-8 bytes 合計在建立任一 Blob 前驗證 ≤16 MiB；超限則兩者都不輸出，也不留下先前 generation 的 Blob。兩種檔案名固定，不使用來源檔名。

### FR-07：處理中、取消和過期結果

狀態為 `idle → loading → mapping → ready → comparing → result`，任何檔案、映射、keyMode 或比較欄變更都使結果轉為 `stale` 並立即禁用下載。執行比較時顯示掃描列數並有「取消」；取消後不保留部分分類，不可下載，回到 mapping。每次輸入變更遞增 generation；舊工作即使晚回也不得覆蓋新狀態。重設清空檔案物件、解析表、輸出與 Blob URL。

## 錯誤與隱私

錯誤分為 `FILE_TOO_LARGE`、`INVALID_UTF8`、`CSV_SYNTAX`、`ROW_WIDTH`、`HEADER_EMPTY_OR_DUPLICATE`、`TOO_MANY_ROWS`、`TOO_MANY_COLUMNS`、`MAPPING_INVALID`、`KEY_EMPTY`、`KEY_DUPLICATE`、`OUTPUT_TOO_LARGE`、`CANCELLED`。訊息包括檔案側、可定位 row/欄名和修復行動，但不暴露堆疊或原始內容。檔案不離開本機頁面；使用者自行下載是唯一持久化路徑。

## 非目標與未來

MVP 不支援 XLSX、多工作表、模糊配對、公式／格式、日期容差、金額加總、資料庫連線或同步。未來若提議新增正規化，需讓使用者逐條選規則並在對帳前預覽；不可改變此版 exact 預設。


---

## 原文件 TECHNICAL.md

# 技術契約：兩份表格對帳

狀態：規格，尚未實作。本專案使用原生 HTML/CSS/瀏覽器 ESM、Node.js 24+ 內建模組與 `node:test`；runtime 零套件，Node 僅供本機開發、測試與建置。正式候選是靜態瀏覽器工具。禁止 CDN、外部字型、框架、遙測、服務端上傳和兄弟專案 API。

## 建議檔案樹

```text
package.json
public/index.html
public/styles/app.css
public/js/app.js
public/js/core/csv.mjs
public/js/core/reconcile.mjs
public/js/core/export.mjs
scripts/serve.mjs
scripts/check.mjs
scripts/build.mjs
test/csv.test.mjs
test/reconcile.test.mjs
test/export.test.mjs
```

遵守 `docs/ENGINEERING.md`、`docs/PRIVACY-SECURITY.md`、`docs/DESIGN-SYSTEM.md`。T00 才建立 package scripts；本規格不含實作。

## 純函式介面

```js
parseCsv(bytes, { maxBytes, maxRows, maxColumns })
// -> { headers: string[], rows: string[][] } | throws CsvError(code, record, column)

validateMappings(left, right, { keys, fields, keyMode })
// -> { ok: true } | { ok: false, issues: Issue[] }

reconcileSteps(left, right, { keys, fields, keyMode }, { signal, batchSize:100 })
// -> AsyncGenerator<Progress, ReconcileResult, void>

serializeResult(result, options, { maxOutputBytes })
// -> { json: Uint8Array, text: Uint8Array } | throws OutputLimitError
```

CSV parser採 byte limit first，使用 `TextDecoder('utf-8',{fatal:true})`；只剝除最前面的 U+FEFF。Parser 是狀態機（fieldStart / unquoted / quoted / afterQuote），以 code unit 掃描並累積欄位；CRLF/LF/CR 只可選一種 record separator，quoted state 內允許各換行原樣進入欄值。結尾分隔符不新增 record。檢查每欄 count、每筆寬度和最大資料列，遇錯立即回傳確定錯碼與 record index，不保留被拒的 parser 中間資料。

Tuple map key 使用 `JSON.stringify(keyValues)`，每個元素必為 string；空字串先拒絕。兩側各建 `Map<tuple,rowRef>`；重複即中止並回報兩個 data index。trim mode 只將 tuple input 做 `.trim()`；保留原始 row。未嘗試 locale compare、數值解析、大小寫轉換或 NFC。

Comparison計算：建立右 key map；依左 rows 順序判斷 absent/changed/same，對每組 fields 作嚴格 `===`；最後掃右 rows 補 unmatched key。結果 arrays 不因排序或本機語言改序。資料輸出採穩定 JSON property insertion order 和 UTF-8；HTML 使用 `textContent`，絕不把來源字串插進 `innerHTML`。

## 非同步包裝與記憶體

`reconcileSteps` 是唯一供 UI 使用的核心。它分兩階段掃描 left index 與 right comparison，每處理最多 100 rows 先 `await new Promise(resolve => setTimeout(resolve,0))`，再 yield `{stage,processed,total}`；最後以 generator return value 回傳完整結果。UI 用手動 `iterator.next()` 迴圈取進度；每個 chunk 間瀏覽器 event loop 能處理使用者取消。AbortSignal 在每次 yield 前後檢查，取消時 throw 固定 `CANCELLED` 並丟棄全部 partial arrays。不可先同步跑完全表，再用 UI 假造進度；也不另做 UI 會呼叫的同步全量版本。每個 await 後同時檢查 signal 和 monotonically increasing generation token。檔案選取、映射、trim 選項變更皆先清 result/state，之後才排新工作。避免把 raw inputs 再複製多份；只保留 2 個解析 row arrays 和必要分類輸出。

下載前先以 `TextEncoder` 產生 JSON 與 TXT bytes，兩者 byte length 合計 ≤16 MiB 才允許同時建立兩個 Blob；任一超限即兩者都不建，清除舊輸出 Blob。建立 Blob URL 後，替換輸出／重設／`pagehide` 時 `URL.revokeObjectURL` 並移除 anchor。輸入 file refs、parsed tables、output bytes 在 reset 後設為 null；不存 IndexedDB、localStorage、sessionStorage。離頁時取消當前 work。

## 狀態與錯誤

`idle → loading → mapping → ready → comparing → result`; 中途錯誤為 `blocked` 或可復原 `error`。資料更動先將 `result` 改成 `stale`，並同步停用下載。`AbortController.abort()` 不構成失敗，狀態回 `mapping`。錯誤只有固定 code、來源側、row/column 數字，不記錄原始單元格。

## 本機命令契約

`package.json`：`"type":"module"`、`"private":true`；不加 dependency。命令為 `npm test` (`node --test`)、`npm run check` (`node scripts/check.mjs`)、`npm run build` (`node scripts/build.mjs`)。`npm run dev` 綁 `127.0.0.1:4222` 且只提供 `public/`。Build 只複製核准過的 `public/` 到 `dist/`，絕不複製 docs、test、fixture 或使用者輸入。使用 Node 24+，不得 npm install。

## 官方參考

- [RFC 4180: Common Format and MIME Type for CSV Files](https://www.rfc-editor.org/rfc/rfc4180.html)。其說明 CSV 社群常見形式，也承認不同實作有差異；本工具採本文件明定的嚴格方言，不宣稱涵蓋所有 CSV。
- [WHATWG Encoding Standard](https://encoding.spec.whatwg.org/)：`TextDecoder` 的 UTF-8 解碼基礎。
- [WHATWG HTML: Blob URL](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#blob-urls)：輸出下載生命週期參考。


---

## 原文件 UX-SEO.md

# 介面與搜尋資料：兩份表格對帳

狀態：規格，尚未實作。Surface mode：Product App。M1 為本機候選版，`robots` 使用 `noindex,nofollow`，不輸出正式 canonical 或 sitemap；`reconcile.glossquote.com` 僅是 selection 候選網址，未獲主驗與發布閘門前不得宣稱上線。

## 搜尋文案

**繁中 title：** 兩份 CSV 表格對帳｜找出缺列與欄位差異  
**繁中 description：** 在本機用唯一鍵核對兩份 CSV，找出一致、僅左、僅右及不同欄位，下載差異報告與 JSON。  
**繁中 H1：** 把兩份清單逐列對起來

**English title:** Compare Two CSV Tables | Find Missing and Changed Rows  
**English description:** Match two local CSV files by a unique key. Review same, left-only, right-only, and changed rows, then download a report and JSON.  
**English H1:** See exactly what changed between two lists

頁面語言按明確的 `zh-TW` / `en` 切換，不機翻欄位資料。應用只提供一個主要工作區；左、右檔案與映射是連續步驟，不做 generic dashboard。

## 版面線框

桌面 Wide（≥75rem）：

```text
┌────────────── 兩份表格對帳 ─────── zh-TW | 準備中 ────────────────┐
│步驟 1 檔案   │                  對帳工作區                 │ 檢視設定│
│左側 CSV     │ 左檔 [選擇檔案] 右檔 [選擇檔案]               │ key模式│
│右側 CSV     │ 左右欄位樣本與逐欄 mapping                    │ exact  │
│欄位配對     │ key tuple [左欄 ↔ 右欄] [+ 欄位]               │ 比較欄 │
│差異結果     │ compare pairs；顯示 record/column 上限          │        │
│             │ [開始對帳]                                     │        │
├─────────────┴──────────────────────────────────────────────────┴──────┤
│ 結果：一致 | 僅左 | 僅右 | 不同欄位；下載 JSON / 文字報告              │
└───────────────────────────────────────────────────────────────────────┘
```

Compact（<48rem）：

```text
┌─ 兩份表格對帳 ─ 狀態 ─┐
│ 步驟：選檔 → 配對 → 結果│
│ [左側 CSV 選檔]       │
│ [右側 CSV 選檔]       │
│ 左右欄位配對          │
│ key 組 / 比較欄       │
│ [開始對帳]            │
│ 結果分類（單欄工作區）│
│ [下載 JSON] [下載 TXT]│
└───────────────────────┘
```

Compact 優先顯示工作區；檔案步驟、設定和結果以可見文字導覽切換。結果表可在帶標籤的內部區域水平捲動；整頁不可水平捲動。排序和欄位配對不得僅靠拖放。

## 位置層級與操作

- 常見操作：檔案狀態、選 key、選 compare fields、開始對帳、下載結果。
- 相鄰資訊：來源樣本、欄位數、列數、錯誤記錄位置、每列左右值。
- 進階選項：key trim 在「對帳設定」中，預設關閉並解釋它只改 key 判斷；每次切換立即標 stale。
- 狀態語句：idle「選兩份 CSV 開始。」；loading「正在解析左側檔案…」；mapping「請確認哪些欄位代表同一資料。」；running「正在比對第 200 / 1,000 列…［取消］」；success「對帳完成：1 一致、1 僅左、1 僅右、0 欄位不同。」；empty「沒有資料列；請確認匯出檔是否只有標題。」；blocked duplicate key「左側第 2、5 筆的 key 重複，未產生結果。請修正來源或選真正唯一的欄位。」；stale「設定或來源已變更，請重新對帳。」；unsupported「此檔案不是本工具接受的 UTF-8 CSV。」

## 無障礙要求

標題與標籤常駐；表格用 `<table>` 語意標記欄標題，來源內容一律文字呈現。錯誤 `aria-describedby` 到相關欄位，狀態透過單一 `aria-live="polite"` 宣告，不逐筆朗讀。Tab 順序為左檔、右檔、key mapping、compare mapping、開始、結果分類、下載。支援 320 CSS px、200% zoom、44×44px 主要觸控區、明顯雙層 focus、對比至少 4.5:1 和 `prefers-reduced-motion`。不要求拖曳。

## FAQ 文案

### 繁體中文

**會把 `001` 和 `1` 當相同嗎？**  不會。預設把所有值當字串逐字比較。  
**需要上傳帳號嗎？**  不需要；檔案在目前頁面記憶體中處理。  
**有重複編號怎麼辦？**  工具會停止對帳並指出衝突資料列，不會任意配對。

### English

**Will it treat `001` and `1` as the same key?** No. Values are compared as exact strings by default.  
**Do I need to upload my files to an account?** No. The page processes selected files in memory.  
**What happens when a key is duplicated?** Reconciliation stops and identifies the conflicting rows; it never guesses a pairing.

## 真實驗收界線

Node tests can verify parser, classification, serialization and state invalidation contracts. Browser checks for keyboard navigation, 320px reflow, 200% zoom, download behavior, screen-reader announcements, and actual selected-file retention are **NOT_RUN_USER_FOCUS_INCIDENT** until an isolated browser execution surface is approved by the primary. Never describe them as passed from Node results.


---

## 原文件 ACCEPTANCE.md

# 驗收 oracle：兩份表格對帳

狀態：規格，尚未實作。以下是將來的驗收資料，不是本產品測試結果。純函式案例用合成 UTF-8 bytes，禁止讀取真實使用者資料。

## 自動 oracle

1. **A01 FR-01 parse-basic** — 左 `id,v\r\n001,A\r\n002,B`，右 `id,v\n001,A\n003,C`；解析列數各 2、值維持字串、不同檔允許各自選 CRLF/LF。
2. **A02 FR-01 quoted** — bytes `id,note\r\n1,"a,b"\r\n2,"x""y"`；rows 值精確為 `[['1','a,b'],['2','x"y']]`。
3. **A03 FR-01 multiline** — `id,note\r\n1,"a\r\nb"`；第二欄為 `a\r\nb`，row index 是 1 而非實體行號。
4. **A04 FR-01 malformed quote** — `id,v\n1,"open`；得到 `CSV_SYNTAX`，無 rows 可供後續對帳。
5. **A05 FR-01 width** — `id,v\n1,A,B`；得到 `ROW_WIDTH`，record 1，不補欄也不截欄。
6. **A06 FR-01 byte cap** — bytes 恰為 1,048,576 且合法可解析；接受。1,048,577 bytes；`FILE_TOO_LARGE`，解析器未 decode。
7. **A07 FR-02 headers** — 標題 `id,id` 或 `,value`；拒絕 `HEADER_EMPTY_OR_DUPLICATE`；` id` 和 `id` 是不同欄名。
8. **A08 FR-03 left-only/right-only/same** — 左 `id,v:001,A;002,B`、右 `001,A;003,C`，key/field 各映射 `id↔id`,`v↔v`；same `[001]` has leftRow=1/rightRow=1; leftOnly `[002]` has leftRow=2; rightOnly `[003]` has rightRow=2; changed empty.
9. **A09 FR-04 changed** — 左 `001,A`、右 `001,X`；changed 一筆，fields 精確是 `[{left:'v',right:'v',leftValue:'A',rightValue:'X'}]`。
10. **A10 FR-03 string exact** — 左 key `001`、右 key `1`；結果 leftOnly `001` + rightOnly `1`，不得數值合併。
11. **A11 FR-03 tuple collision defense** — 左 tuple `['a|b','c']`、右 `['a','b|c']`；必須分成兩個 key，不得因 delimiter 碰撞。
12. **A12 FR-03 duplicate** — 左 key `x` 出現在 data index 1、2；拒絕 `KEY_DUPLICATE` 並回報這兩個 index，沒有任何分類結果。
13. **A13 FR-03 trim revalidation** — 左 key `x`、` x ` 並選 trim；兩列 trim 後衝突，拒絕。exact mode 則兩列可唯一，輸出不改原字串。
14. **A14 FR-03 empty key** — key 欄為 `""`；exact 拒絕；key 值為三個空白且選 trim 也拒絕。
15. **A15 FR-04 compare exact** — compare value 左 `1`、右 `1.0`；分類 changed，沒有數字格式正規化。
16. **A16 FR-05 hostile text** — cell value `<img src=x onerror=alert(1)>`；原字串保留在結果／JSON，UI 顯示文字；沒有事件、網路請求或 HTML 節點執行。
17. **A17 FR-06 JSON schema** — leftOnly row 原值 `['A','line\n"quoted"']`；JSON parse round-trip 後值相同，`schemaVersion===1`、`tool==='table-reconcile'`，檔名固定。
18. **A18 FR-06 output limit** — JSON+TXT combined UTF-8 bytes exactly 16 MiB accepts and both files are available; combined bytes 16 MiB+1 returns `OUTPUT_TOO_LARGE`, creates neither Blob and clears both old-generation outputs.
19. **A19 FR-01 row cap** — 5,000 data rows 可解析；5,001 筆拒絕 `TOO_MANY_ROWS`，標題不計入上限。
20. **A20 FR-02 column cap** — 30 欄接受，31 欄拒絕 `TOO_MANY_COLUMNS`。
21. **A21 FR-07 real cancellation between batches** — reconcile 201 left rows against 201 right rows with batchSize=100; first `iterator.next()` yields `{stage:'left-index',processed:100,total:201}` after a task yield. Abort before requesting next step; next call throws `CANCELLED`, returns no result and exposes no partial classification arrays.

## 必須人工／瀏覽器驗收

- 對檔案選擇、錯誤定位、tab 順序、320px、200% zoom、鍵盤完成全流程、下載、2000+列長內容與 stale 後下載 disabled 做真瀏覽器檢查。
- 本階段真瀏覽器驗收：**NOT_RUN_USER_FOCUS_INCIDENT**。依全域 focus incident 不操作使用者桌面、瀏覽器或原有分頁；Node tests 不能替代這些檢查。
- 離線性檢查可在網路封鎖的本機測試環境進行；檢查 Network 面板無外連屬於瀏覽器 gate，本文件目前標 **NOT_RUN**。
- 取消、`pagehide` 後 Blob URL 清理以可注入 URL/Abort fake 做單元測試；真實頁面生命週期仍需 browser gate。


---

## 原文件 TASKS.md

# 實作任務：兩份表格對帳

狀態：規格，尚未實作。嚴格依序進行；失敗或缺依賴時停止，不向後勾選。Node 24+、ESM、零 runtime dependency。不得 `npm install`、連外、啟動 server 或操作 browser，除非後續任務的隔離使用者焦點驗收獲主驗另行授權。真 browser 檢查如未能隔離要標 `NOT_RUN_USER_FOCUS_INCIDENT`。

1. **T00 — Scaffold 與規格閘門。** 前置：本規格組完整、共同文件由主編提供。Allowed paths：本專案 `package.json`, `.gitignore`, `scripts/**`, `public/**`, `test/**`, `dist/**`, `HANDOFF.md`, `TASK-ENTRY.md`, `evidence/m1/**`。建立 ESM private package、四個 scripts、必要目錄；確認 `4222` 綁 loopback。驗收：`node --version` 顯示 24+、`node scripts/check.mjs` 真正檢查必要源檔。完成：腳本已存在且沒有外部依賴；更新 HANDOFF。
2. **T10 — CSV parser/core + tests。** 前置 T00 PASS。Allowed paths 同 T00，核心放 `public/js/core/csv.mjs` 與 `reconcile.mjs`，測試放 `test/*.test.mjs`。實作嚴格 dialect、limits、tuple key、映射和分類。驗收：`npm test`，覆蓋 A01–A16 相關純函式案例。完成：所有錯誤能定位且不產出部分結果；更新 HANDOFF。
3. **T20 — Schema 與報告輸出。** 前置 T10 PASS。建立 `export.mjs`，固定 JSON/TXT schema、編碼、限制、固定檔名。驗收：`npm test` 覆蓋 A17–A18、escape/round-trip。完成：輸出上限在 Blob 前執行；更新 HANDOFF。
4. **T30 — 可操作雙語 Product App。** 前置 T20 PASS。建立 HTML/CSS/app ESM；使用直覺左右檔案映射、key/compare fields、四分類結果、狀態與錯誤。資料只由 DOM text APIs 呈現。驗收：`npm run check`、`npm run build`；由 primary 按 browser policy 決定是否能執行 UI gate。完成：空／loading／mapping／running／cancelled／result／stale／error 全有真文案；更新 HANDOFF。
5. **T40 — 邊界、取消與資料清除。** 前置 T30 PASS。加 generation token、AbortSignal、輸入更改失效、Blob URL cleanup、reset/pagehide；檢查 row/column/file limits。驗收：`npm test` + `npm run check` + `npm run build`。完成：舊結果無法下載、取消不輸出 partial；更新 HANDOFF。
6. **T50 — 文案、SEO、無障礙與驗收收尾。** 前置 T40 PASS。補雙語 title/description/H1/FAQ、M1 noindex、鍵盤/ARIA/320px/zoom/reduced-motion；補完所有 A01–A20 自動 cases。驗收：`npm test`, `npm run check`, `npm run build`，每項只對 final implementation 執行一次；browser gates 如未隔離明記 NOT_RUN。完成：差異只在 allowed paths、HANDOFF 記版本與結果狀態。

每一項的失敗不得在 HANDOFF 標成 PASS；修復後重跑受影響命令。任何外部、API、帳戶、上傳、runtime 套件或正式發布都超出本 M1 規格。


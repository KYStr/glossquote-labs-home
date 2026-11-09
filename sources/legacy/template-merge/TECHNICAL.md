# 技術契約：批次文字套版

狀態：規格，尚未實作。用原生 HTML/CSS/瀏覽器 ESM 和 Node.js 24+ `node:test`；runtime 零依賴，Node 僅供本機開發／測試／build。靜態頁面，不使用 server API、框架、外部字型、CDN、遙測或兄弟工具。

## 建議檔案樹

```text
package.json
public/index.html
public/styles/app.css
public/js/app.js
public/js/core/csv.mjs
public/js/core/template.mjs
public/js/core/render.mjs
public/js/core/export.mjs
scripts/serve.mjs
scripts/check.mjs
scripts/build.mjs
test/csv.test.mjs
test/template.test.mjs
test/export.test.mjs
```

共享 CSV code 不可 runtime import 兄弟專案；此專案自行維護契約。讀 `docs/ENGINEERING.md`、`docs/PRIVACY-SECURITY.md`、`docs/DESIGN-SYSTEM.md`。

## 核心介面與算法

```js
parseCsv(bytes, limits = { maxBytes: 1_048_576, maxRows: 1000, maxColumns: 30 })
// -> { headers, rows } | CsvError

compileTemplate(source, headers, { maxCodeUnits: 32768 })
// -> { segments, fields } | TemplateError

inspectMissing(rows, fields)
// -> { byField: [{ field, count, rowIndexes }], totalCells }

renderBatch(rows, compiled, { allowBlank = false, signal, onProgress })
// -> { records: [{ row, text, blankFields }], recordTextBytes } | BatchError

serializeBatch(result, options, { maxCombinedBytes: 8_388_608 })
// -> { txt: Uint8Array, json: Uint8Array, combinedBytes } | OutputLimitError
```

CSV parser先驗 byte cap，`TextDecoder('utf-8',{fatal:true})` 解碼並僅移除第一個 BOM。使用狀態機 parse quoting；quoted 欄內保留換行，行分隔外部檢查是單一一致的 CRLF/LF/CR。末尾 newline 不產生額外 row。遇 syntax/欄數/row/column 上限立即回固定 error object；沒有 fallback 自動 repair。

Template parser 從左到右建 immutable segments。凡看到左括號 `{{` 就找第一個 `}}`；內部為空、再含 braces、未閉合、未知 header 為錯誤。任何沒有前導左括號的 `}}` 是孤立結尾錯誤。佔位符內容以完整、case-sensitive header string 比對，不 trim；內含普通空格有效，因此 `{{ Name }}` 只匹配標題字串 ` Name `，不匹配 `Name`。Render 時對 segment array 單次 reduce；欄位字串直接 append，不重新送 parser。避免用 `String.replace` replacement-string 語法，以免 `$&`, `$1` 改變替代結果。UI 只用 `textContent`。

空值分析只計算已在 template 使用到的 columns，判定 `value === ''`；space、tab 和全形空格屬一般字串。預設遇一個空 cell 就拒絕；allowBlank=true 時該 cell 產出 `''` 且記錄其欄名。Render 階段逐筆累加 record text 的 UTF-8 bytes；若該 lower bound 已 >8,388,608，可提早拒絕。最終 authoritative cap 是 serializer 以 `TextEncoder` 量出 TXT bytes + JSON bytes 的實際合計，包含兩者 envelopes/metadata；合計恰好 8,388,608 接受，超過 1 byte 立即阻止兩個檔案、建立 Blob 前清除舊輸出。原始 CSV 的 1 MiB cap 是另一個輸入限制，兩者不得混稱。

## 狀態、取消和清理

長批次每 100 rows yield `setTimeout(resolve,0)`；同一段檢查 `signal.aborted` 和 generation token。Source/template/options 更改先標 `stale`、清空成果和 revoke URLs，才建立新的工作 generation。Abort 時丟棄全部 partial local array。成功下載用固定 filename；每次重新生成、reset、`pagehide` 都 revoke Blob URL。File、rows、segments、records 只存在記憶體；不寫 storage，clipboard 只在使用者明確點「複製這筆」時調用；clipboard error不保存原文到錯誤記錄。

## Node 命令

`package.json` 設 `type=module`, `private=true`，不含 dependencies。`npm test` 執行 `node --test`；`npm run check` 執行真實 source/schema/外部資源掃描；`npm run build` 只將審核的 `public/` 複製到本地 `dist/`。本專案預覽端口是 4223，server 如由後續實作任務授權啟動，只能綁 `127.0.0.1` 並只提供 public。現在規格工作不啟動 server/browser，且不執行 `npm install`。

## 官方參考

- [RFC 4180](https://www.rfc-editor.org/rfc/rfc4180.html)：CSV 的常見 quoting、逗號和換行描述；規格也指出實作差異，因此本工具使用明確的嚴格子集。
- [WHATWG Encoding Standard](https://encoding.spec.whatwg.org/)：UTF-8 decoding contract。
- [WHATWG HTML, clipboard API security considerations](https://html.spec.whatwg.org/multipage/interaction.html#clipboard-apis)：clipboard 只由明確使用者操作觸發；API 可用性仍須瀏覽器驗收。

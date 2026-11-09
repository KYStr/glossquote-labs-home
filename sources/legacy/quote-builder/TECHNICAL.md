# 技術規格：報價單快速製作

狀態：規格，尚未實作。閱讀共通 [ENGINEERING](docs/ENGINEERING.md)、[PRIVACY-SECURITY](docs/PRIVACY-SECURITY.md) 與 [DESIGN-SYSTEM](docs/DESIGN-SYSTEM.md)。M1 使用 Node.js 24+ ESM 內建模組；正式功能為原生瀏覽器 HTML/CSS/ESM，零 runtime/dev 依賴，不安裝套件，不開瀏覽器。

## 檔案樹

```text
package.json
.gitignore
public/
  index.html
  en/index.html
  styles/app.css
  js/app.js
  js/core/decimal.mjs
  js/core/quote.mjs
  js/core/safe-output.mjs
  js/core/import.mjs
scripts/check.mjs
scripts/build.mjs
scripts/serve.mjs
test/decimal.test.mjs
test/quote.test.mjs
test/safe-output.test.mjs
test/import.test.mjs
dist/                          # build 生成；preview 永遠 noindex
```

## 純核心介面

```js
parseScaledDecimal(text, { scale, min, max, maxFractionDigits, field })
  -> { ok: true, scaled: bigint } | { ok: false, code, field }
calculateQuote(validatedInput)
  -> { items: [{ lineMinor: bigint }], subtotalMinor, discountMinor,
       afterDiscountMinor, taxMinor, totalMinor }
serializeQuoteJson(validatedInput)
renderQuoteHtml(validatedInput, totals)
makeExportPair(validatedInput, totals, { maxBytes: 524288 })
  -> { ok: true, html: Uint8Array, json: Uint8Array }
   | { ok: false, code: 'EXPORT_LIMIT', actualBytes, maxBytes }
parseQuoteImport(utf8Bytes)
  -> { ok: true, validatedInput } | { ok: false, code, field? }
```

核心無 DOM、網路、storage、時間、隨機數或副作用。所有 user-visible error 使用固定代碼映射，不回顯 exception。計算結果內部 `BigInt`，JSON 僅輸出十進位字串，避免 JSON number 精度損失。

## 十進位解析與金額

1. 只接受 ASCII 正十進位語法，不 trim；小數位數須符合各欄位規格。拒絕空值、負號、正號、逗號、指數、`NaN`、`Infinity`、前後空白和多餘小數位。
2. 逐字將整數部分與右補零的小數部分轉成指定 scale 的 BigInt；先檢查範圍和位數，不經 `Number`。
3. 數量 scale=1000，單價/折扣 scale=100，稅率 `0.01%` 為一單位。每列 `lineMinor=(quantityMilli*unitPriceMinor+500n)/1000n`，因輸入皆非負，此式為 half-up。
4. 小計是列分數總和；折扣不得大於小計；折後額乘稅率 basis points 後以分母 10000 half-up；總額相加。所有轉換與比較使用 BigInt。
5. 顯示金額由 BigInt quotient/remainder 格式化成固定兩位小數；顯示數量最多三位，去除無意義尾零。格式不由瀏覽器本地化 API重新解析。

## 安全輸出與匯入

- HTML 只能由固定模板函式輸出。每個資料欄經 `escapeHtmlText` 編碼 `& < > " '`；不生成資料驅動 tag、attribute、URL 或 CSS。靜態 CSS 以 `white-space: pre-wrap` 顯示換行。文件內無 script、事件 handler、frame、form、外部資源、meta refresh 或可執行連結。
- 預覽用 `document.createElement`、`textContent`、明確屬性白名單。禁止 `innerHTML`、`outerHTML`、`insertAdjacentHTML`、`eval`、Function constructor 和輸入 URL。
- JSON import 在讀檔前檢查 `File.size <= 524288`；讀取用 `FileReader` 以支援 `abort()`，以 fatal UTF-8 decoder 解碼。解析後要求 exact schema/version/keys/types/field limits；為拒絕重複 JSON object keys，使用 bounded recursive JSON tokenizer/parser，深度上限 6、總節點上限 2000，不可先 `JSON.parse` 後才假稱能發現重複鍵。
- 匯入物件不接受計算結果欄位；預覽只顯示「將取代目前草稿」與筆數。使用者取消或檔案在讀取中改來源，舊 generation 被忽略且原草稿不變。確認後整份取代並再次計算，不合併、不覆寫部分欄位。
- HTML+JSON 由同一 `makeExportPair` 一次建立，使用 `TextEncoder` 實算兩份總 bytes。超過 512 KiB 兩個 Blob 都不建立。成功後只保留目前版本的 Blob URL；來源改動、清除、下一次成功產生、`pagehide` 撤銷舊 URL。

## UI 狀態與競態

- `state = { generation, draft, validation, preview, importReader, blobUrls }`；generation 每次輸入編輯、清除、匯入取代或 `pagehide` 遞增。
- 同步 `calculateQuote` 在最多 50 列上執行；執行完成後僅在 `generation` 未變且輸入版本相同時更新預覽。沒有假 progress，也不宣稱可中途取消短同步步驟。
- JSON FileReader 開始即將狀態設為 `importing`；點取消呼叫 `abort()`、generation 遞增、清除暫存 buffer，回到原編輯狀態。任何晚到的 load/error/abort 事件檢查 generation 才能改狀態。
- 畫面任何欄位變動同步設 `preview=null`、撤銷下載 URL、隱藏下載按鈕，再更新錯誤與計算按鈕。成功計算才重新建立輸出。錯誤不能復活舊 Blob。
- 清除和 `pagehide` 中止 FileReader、清除字串/物件引用、清空 preview、撤銷每個 Blob URL；不承諾覆寫 JavaScript 記憶體或刪除已下載檔案。

## 工具鏈與界線

- `package.json`: `private: true`, `type: module`, `engines.node >=24`; `npm test`=`node --test test/*.test.mjs`; `npm run check`=`node scripts/check.mjs`; `npm run build`=`node scripts/build.mjs`; `npm run dev`=`node scripts/serve.mjs`。
- 預設 dev 位址 `127.0.0.1:4237`。只提供 `public/`，固定 path allowlist，GET/HEAD，其他 method 405、未知路徑404、拒絕 Host 不符和 path traversal，不作 SPA fallback、不 serve workspace。port 衝突回報，不能殺既有程序。
- `check` 實查必要檔案、所有 ESM 語法、零外部資源與禁止危險 DOM API；字串掃描不是安全證明。`build` 僅複製審核過的 public allowlist，拒絕 symlink/junction、未知輸入與 traversal；不清除未知 dist 項目來湊成功。M1 dist 保持 noindex。
- 純核心測試只用假資料和手寫 expected。Node 測試、HTTP 回應或靜態掃描不能冒充瀏覽器 Blob/下載/API、真實頁面、Network/Storage 或手機匯入驗證。

家族規則及禁止網路/storage 等行為以本目錄 `docs/` 共通文件為準。

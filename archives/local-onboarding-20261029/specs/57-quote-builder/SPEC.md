# 報價單快速製作 — 既有規格保存

Task ID: `labs-57-quote-builder` · Spec ID: `spec-57-quote-builder`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格：報價單快速製作

狀態：規格，尚未實作。候選產品網址待發布流程指定；M1 所有頁面與建置輸出均為 `noindex`，不產生 production canonical。

## 使用者與工作

接案者、工作室或小型服務商收到詢價後，通常要把品項和金額重排到文件中。此工具只處理一份報價所需的明示輸入與算術，讓人看見結果、修改後再下載。它不代替會計或稅務判斷，也不向客戶寄送文件。

## MVP 範圍

### FR-01：建立報價草稿

- 起始狀態為一份空白草稿，幣別標籤預設 `TWD`。雙方名稱、品項說明、數量、單價、固定折扣、自訂稅率及備註均由使用者輸入；不產生自動編號、日期或收件資料。
- 報價至少有一項、最多 50 項。新增品項時放在尾端；刪除後保留其餘品項原順序。
- 幣別標籤是單份文件的顯示文字，1–8 個 ASCII 大寫英數字，預設 `TWD`。它不會被轉換或驗證為可交易貨幣；同一報價不得混用多幣別。
- 送出前一次列出可修正欄位錯誤；只要有一個錯誤，就不產生新預覽或下載物件，也不沿用上一次成功結果。

### FR-02：欄位格式、預設與上限

| 欄位 | 規則 |
|---|---|
| 出價方、客戶 | 各 1–120 個 Unicode scalar；可保留前後空白，C0/C1 控制字元拒絕。空值可留白並在文件顯示「未填」。 |
| 品項說明 | 1–200 個 Unicode scalar；可保留換行；拒絕 C0/C1 控制字元（LF、CR、TAB 除外）。不得空白。 |
| 數量 | 十進位純文字，`0.001` 至 `1000000`，最多 3 位小數；不接受正負號、千位逗號、指數或前後空白。 |
| 單價 | 十進位純文字，`0` 至 `1000000000`，最多 2 位小數；不接受負數、千位逗號、指數或前後空白。 |
| 折扣 | 固定金額，精確到分，預設 `0`；範圍 0 至逐行四捨五入後的小計。百分比折扣不在 M1。 |
| 自訂稅率 | 百分比純文字，0 至 100，最多 2 位小數，預設 `0`。只用輸入的明示比率計算，不替使用者選稅率或確認適用性。 |
| 備註 | 0–2000 個 Unicode scalar；拒絕 C0/C1 控制字元（LF、CR、TAB 除外）。 |
| JSON 匯入 | 單一 UTF-8 JSON 檔案，最多 512 KiB；超限在讀取前拒絕。只接受 schema 1 的精確欄位，不接受未知欄位。 |
| 產物 | HTML 與 JSON 兩份 UTF-8 內容合計最多 512 KiB；以實際序列化後 byte 數計算。超限時整批失敗，兩份皆不提供，不截斷。 |

任何文字含未配對 surrogate 時拒絕。計數採 Unicode scalar（`[...value].length` 的碼點概念），不把 UTF-16 code unit 當字數。

### FR-03：金額計算

- 數量解析為 `quantityMilli` 整數（數量乘 1000）；單價解析為 `unitPriceMinor` 整數（元乘 100）。計算只用 `BigInt`。
- 每列金額（分）=`roundHalfUp(quantityMilli × unitPriceMinor / 1000)`。所有值非負；半分一律進位。小計是逐列分數加總。
- 折扣是使用者輸入的固定分數，不超過小計。折後額=`subtotalMinor − discountMinor`。
- 稅率以百分比的百分之一為單位（`taxRateBasisPoints`；`5.00%` 即 `500`）。稅額只對折後額計算一次：`roundHalfUp(afterDiscountMinor × taxRateBasisPoints / 10000)`。
- 總額=`afterDiscountMinor + taxMinor`。四捨五入以正整數 `floor((numerator + denominator/2) / denominator)` 定義；不得改用浮點數中間值。
- 例：`2.500 × 19.99` 的列金額為 `49.98`。`49.98 + 10.00 = 59.98`，折扣 `9.98` 後為 `50.00`；輸入自訂 `5.00%` 得稅額 `2.50`、總額 `52.50`。

### FR-04：即時結果與錯誤復原

- 按「產生預覽」後以同一套純函式計算；預覽包含雙方、按原順序排列的品項、數量、單價、逐列金額、小計、折扣、自訂稅率、稅額、總額及備註。
- 任一來源欄位改動時立即標記預覽為「已過期」，撤下兩個下載按鈕並撤銷舊 Blob URL。再次按主按鈕才建立新一版完整預覽。
- 驗證或序列化失敗時狀態為「無法產生」，錯誤指出欄位與修正方式；不得顯示舊下載結果。
- 預覽以文字節點建立，不能把輸入字串當 HTML。HTML 下載另由固定模板產生，資料值只可出現在已跳脫的文字節點。

### FR-05：下載與匯入

- 只在使用者明確按「下載 HTML」或「下載 JSON」時啟動瀏覽器下載。固定檔名 `quote.html`、`quote.json`；不把姓名或備註放入檔名。
- HTML 是純靜態文件，不含 script、事件屬性、iframe、表單、外部 URL、遠端字型或追蹤碼。資料中的 `& < > " '` 以 HTML entity 編碼；換行由固定 CSS `white-space: pre-wrap` 呈現。
- JSON schema 1 只包含可編輯輸入欄位，不包含可信任的計算總額；匯入一律重新驗證和重算。匯入前預覽欄位數與名稱；確認後才取代草稿，取消保留原草稿。
- 匯入物件形狀：`{"schema":"gq.quote","version":1,"currency":"TWD","parties":{"from":"…","to":"…"},"items":[{"description":"…","quantity":"2.5","unitPrice":"19.99"}],"discount":"9.98","taxRate":"5.00","note":"…"}`。所有十進位欄位均為字串；拒絕未知鍵、缺鍵、錯誤型別、重複 JSON property（以安全 parser/重複鍵檢查處理）及超限項目。

### FR-06：計算與下載狀態

| 狀態 | 可觀察行為 |
|---|---|
| 空白 | 顯示一列空項目與操作說明；主按鈕「產生預覽」。 |
| 編輯中 | 預覽不存在或已過期；修改不觸發隱藏計算或下載。 |
| 驗證錯誤 | 欄位錯誤與摘要可讀；沒有部分預覽、Blob 或下載按鈕。 |
| 預覽就緒 | 顯示完整總額與最新來源版本；可下載 HTML/JSON 或繼續編輯。 |
| 匯入讀取中 | 只用於選擇 JSON；有「取消匯入」。取消後保留原草稿。 |
| 匯入待確認 | 顯示將取代草稿及項目數；取消不改原值，確認才整份替換。 |
| 產物超限 | 顯示實際 byte 數與 512 KiB 上限；整批不提供下載。 |
| 清除 | 使用者確認後清空欄位、預覽、匯入緩衝、Blob URL 和暫存引用。 |

短同步計算最多 50 列，M1 不顯示假的進度或取消計算按鈕。非同步匯入使用可中止的讀取器；取消、清除、換來源與 `pagehide` 都使尚未完成的匯入 generation 失效。

### FR-07：資料生命週期與限制

- 草稿、預覽、匯入與產物只存在當前頁記憶體。沒有 local/session storage、IndexedDB、service worker、URL/query、網路、帳號、API、telemetry 或 console 輸入紀錄。
- 清除、來源改動、匯入取代與 `pagehide` 時撤銷 Blob URL、釋放檔案/產物引用。無法保證清除瀏覽器或作業系統已下載檔案。
- 主介面不收集地址、稅籍、付款資料、客戶帳號或秘密。不要把本機處理描述成「絕對安全」。

### FR-08：明確非目標

M1 不提供稅務適用性判斷、稅率建議/驗證、發票、正式會計紀錄、電子簽章、付款、寄送、追蹤、匯率、混合幣別換算、雲端儲存、模板程式碼、公式欄位、任意 HTML 或自動產生法律條款。產物是使用者自行填值的報價草稿，是否可用由使用者自行確認。


---

## 原文件 TECHNICAL.md

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


---

## 原文件 UX-SEO.md

# 介面與搜尋規格：報價單快速製作

狀態：規格，尚未實作。產品介面採 Product App 模式，畫面以報價草稿和實際預覽為主。正式 URL 尚未核定；本地候選及 dist 必須 `noindex`，不得假設 canonical、sitemap 或 production 網域。

## 雙語頁面文字

### 繁體中文

- `title`: `報價單快速製作｜Gloss Tools`
- `description`: `輸入雙方名稱、品項、數量、單價和自訂折扣，預覽並下載靜態 HTML 報價單與 JSON。計算在此頁完成；不提供稅務判斷或發票。`
- `H1`: `把品項整理成一份清楚的報價`
- 副標：`填入明確金額與自訂稅率，先檢查預覽，再下載給客戶。`
- 主按鈕：`產生預覽`；成功後：`下載 HTML`、`下載 JSON`；修改後：`預覽已過期，請重新產生`。
- 資料提示：`報價只在這個頁面處理。下載由你明確啟動；關閉頁面會清除目前草稿。`

FAQ：

1. **這會替我確認稅率嗎？** 不會。稅率由你輸入；工具只按你輸入的數字計算，不判斷是否適用。
2. **下載的是發票嗎？** 不是。HTML 和 JSON 是你自行填寫的報價資料，不包含發票、簽章或法律效力判斷。
3. **修改品項後，舊報價還能下載嗎？** 不行。來源一改，預覽和舊下載連結立即失效；重新產生後才能下載新版。

### English

- `title`: `Simple Quote Builder | Gloss Tools`
- `description`: `Enter parties, line items, quantities, prices, a fixed discount, and an explicit rate. Preview and download a static HTML quote and editable JSON. No tax advice or invoice claims.`
- `H1`: `Turn line items into a clear quote`
- Supporting text: `Enter the amounts and rate you choose, review the quote, then download it for your client.`
- Primary action: `Create preview`; ready actions: `Download HTML`, `Download JSON`; changed draft: `Preview is out of date. Create it again.`
- Data notice: `Your draft stays in this page. Downloads start only when you choose them; closing the page clears the draft.`

FAQ:

1. **Does this verify my tax rate?** No. You enter the rate; the tool only calculates from that value and does not determine whether it applies.
2. **Is the download an invoice?** No. The HTML and JSON are quote data you entered. They do not provide an invoice, signature, or legal validity check.
3. **Can I download the old quote after editing?** No. Editing invalidates the preview and its download links. Create a new preview before downloading again.

## 工作區線框

Desktop（Product App；預覽是主要產物，表單就近編輯）：

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 報價單快速製作 / Simple quote builder       草稿：編輯中   語言切換 │
├──────────────────────────────────────┬───────────────────────────────┤
│ 輸入工作區（約 40%）                  │ 報價預覽（約 60%，主畫布）   │
│ 出價方 ______   客戶 ______           │ 出價方 → 客戶                │
│ 幣別 [TWD]                            │ 品項    數量 單價 金額       │
│ 品項  說明     數量   單價  刪除      │ …                            │
│ 01    ______  _____  _____  [移除]    │ 小計                 0.00   │
│      [+ 加一列]                       │ 折扣                 0.00   │
│ 折扣 ______  自訂稅率 ______          │ 自訂稅率 / 稅額       0.00   │
│ 備註 _________________________        │ 合計                 0.00   │
│ [產生預覽] [匯入 JSON]                │ 備註 …                      │
│                                      │ [下載 HTML] [下載 JSON]     │
└──────────────────────────────────────┴───────────────────────────────┘
```

Mobile（`<48rem`；工作區單欄，功能由明確頁籤切換，不隱藏）：

```text
┌──────────────────────────────┐
│ 報價單快速製作     語言切換  │
│ [編輯報價] [預覽報價]        │
├──────────────────────────────┤
│ 出價方 ______                │
│ 客戶   ______                │
│ 品項 1                       │
│ 說明 __________________      │
│ 數量 ______  單價 ______     │
│ [+ 加一列]                   │
│ 折扣 ______  稅率 ______     │
│ 備註 __________________      │
│ [產生預覽]                   │
│                              │
│ 預覽頁：完整直向報價內容     │
│ [下載 HTML] [下載 JSON]      │
└──────────────────────────────┘
```

在手機上主操作不可被虛擬鍵盤或固定列遮住；不以橫向雙欄表格要求兩維捲動。項目欄位標籤在輸入後仍可見；表格若較窄則每列改成垂直欄位組，不裁掉刪除操作。

## 狀態、鍵盤與版面

- 初始空白：提供一個空白項目和「加入品項」；不顯示假報價範例冒充真資料。
- 編輯：所有變更均在記憶體；預覽失效狀態文字與下載按鈕同步更新。
- 驗證錯誤：摘要連結至錯誤欄位；提交後可聚焦第一個錯誤，但不搶走正在輸入的焦點。
- 匯入中/待確認：顯示檔案讀取狀態、「取消匯入」，以及將取代草稿的明確確認；取消保留原值。
- 預覽就緒：合計置於預覽區明顯位置；下載按鈕緊鄰預覽。下載失敗說明可重試，不展示舊 Blob。
- 無法產生：欄位錯誤或產物 bytes 超限，明確說明整批無下載。
- 鍵盤順序為出價方→客戶→幣別→品項列（說明/數量/單價/刪除）→總額欄位→備註→產生→預覽/下載。新增列後焦點移至新列說明。
- 所有操作有可見雙層 focus，標籤不以 placeholder 取代；錯誤同時有文字與圖示，不只靠顏色。觸控控制至少 44×44 CSS px；320px 寬及 200% zoom 保留所有欄位與操作；尊重 `prefers-reduced-motion`。
- 使用共通 `docs/DESIGN-SYSTEM.md` tokens，不引入外部字型、圖示、遠端圖片、追蹤或抽象 hero。任務畫布承載真正預覽，品牌欄收斂。

## 搜尋與發布界線

- 路徑候選：`/quote/`，英文 `/quote/en/`（最終路徑由主代理確認）；M1 雙語 HTML 互鏈但兩頁皆 `noindex,nofollow`。
- M1 不設定 production canonical、hreflang、sitemap，也不宣稱正式網站。待主代理確定正式 URL 及發布授權後，才按共通發布規格新增 metadata。
- title/description/H1 兩語各自對應實際功能；不宣稱稅務合規、法律效力、保證節省時間或任何未驗證排名/支援度。
- 真正瀏覽器下載、HTML 開啟外觀、手機尺寸及 200% zoom 由有隔離的 browser gate 驗證。依目前工作區指示，此項先記 `NOT_RUN_USER_FOCUS_INCIDENT`；Node DOM、靜態檔或 HTTP 測試不能替代。


---

## 原文件 ACCEPTANCE.md

# 驗收規格：報價單快速製作

狀態：規格，尚未實作。下列為固定 oracle，expected 不能由被測函式動態推導。核心測試使用假資料與 Node `node:test`；瀏覽器、真實下載、視覺、Network/Storage 需獨立記錄，不能把 Node/HTTP 證據寫成 browser PASS。

## 純核心測試

| ID | 輸入 / 步驟 | 明確預期 | 關聯 |
|---|---|---|---|
| A01 | 一列 quantity=`2.5`, unitPrice=`19.99` | `quantityMilli=2500`, `unitPriceMinor=1999`, `lineMinor=4998`，顯示 `49.98`。 | FR-03 |
| A02 | quantity=`0.001`, unitPrice=`5.00` | `1×500/1000=0.5` 分，half-up 得 `lineMinor=1`，顯示 `0.01`。 | FR-03 |
| A03 | quantity=`1000000`, unitPrice=`1000000000.00` | 解析成功、以 BigInt 計算；列分數為 `100000000000000000`，不得轉 Number 或溢位。 | FR-02/03 |
| A04 | quantity=`0.001`, unitPrice=`0` | 合法，列金額 `0`；數量為正與金額為零可同時成立。 | FR-02/03 |
| A05 | 兩列 `2.5×19.99` 與 `1×10.00`，discount=`9.98`，taxRate=`5.00` | 小計 `5998` 分、折後 `5000` 分、稅 `250` 分、總額 `5250` 分。 | FR-03 |
| A06 | 一列 `0.01` 元，taxRate=`50.00` | 折後一分的半分稅額 half-up 為一分；總額兩分。 | FR-03 |
| A07 | quantity=`0.000` 或 `1000000.001` | 分別拒絕低於最小值與高於最大值；不產生輸出。 | FR-02 |
| A08 | quantity=`1.0000`, `1e3`, ` 1`, `+1`, `-1` | 全部拒絕；不得 trim、按科學記號解析或寬鬆轉數字。 | FR-02 |
| A09 | unitPrice=`1000000000.00` 與 `1000000000.01` | 上界接受；超出 0.01 拒絕。單價 `1.001` 也拒絕。 | FR-02 |
| A10 | 折扣恰等於小計，再試折扣多 0.01 | 等於小計接受、折後 0；多 0.01 拒絕，稅基不能變負。 | FR-02/03 |
| A11 | taxRate=`0`, `100.00`, `100.01`, `1.001` | 前兩個接受；後兩個分別因超上界及小數位超限拒絕。 | FR-02/03 |
| A12 | 50 筆合法項目，逐筆一分 | 接受、保留輸入順序、總小計 `50` 分；再加第 51 筆整份拒絕。 | FR-01/02 |
| A13 | 文字 `</td><script>alert(1)</script>&"'` 作為項目說明及備註 | 預覽資料節點只呈現文字；HTML 含 `&lt;/td&gt;&lt;script&gt;` 等編碼，沒有 script element/attribute、遠端 URL 或事件 handler。 | FR-04/05 |
| A14 | 備註含 CRLF 與字面 `END:VCARD` / `<img onerror=x>` | CR/LF 按允許的文字換行留在同一備註；HTML 仍只產生固定文字節點，沒有新標籤或額外結構。 | FR-02/05 |
| A15 | 合法 schema 1 JSON；再各加未知 key、錯誤 version、JSON 字串 `\ud800`、重複 `"note"` key | 合法輸入可匯入並重算；其他四種拒絕，原草稿不變。重複 key 必須在 tokenizer 層拒絕。 | FR-05 |
| A16 | 合成經驗證的極端輸出，使 HTML+JSON UTF-8 總和剛好 524288 bytes、再增加 1 byte | 等於上限可建立兩份；多 1 byte 回 `EXPORT_LIMIT`，兩份都不建立/不返回，不截斷且不保留舊產物。 | FR-02/05 |
| A17 | 成功預覽後改一個單價，再輸入無效值 | 第一次輸入同步撤下舊預覽/兩個下載鍵並撤銷 URL；無效值不會使舊結果復活。 | FR-04/06 |
| A18 | 匯入讀取中取消；再於讀取完成後取消待確認 | 兩次取消均維持原草稿、無新 Blob；過期 generation 的 load 事件不能改畫面。 | FR-05/06/07 |
| A19 | 點「清除」及模擬 `pagehide` | 撤銷每個已建立 Blob URL、中止 FileReader、清空預覽/草稿引用；不得聲稱刪除已下載檔案。 | FR-07 |
| A20 | 試 51 項、超限 JSON、錯誤匯入、輸出超限各自重試成功 | 每個失敗都沒有部分或先前成功下載物；有效重試才建立同一版本的 HTML/JSON。 | FR-01/05/06 |

## M1 工具鏈與離線驗收

在 Node 24+ 執行 `npm test`、`npm run check`、`npm run build`。`npm test` 必須執行所有固定 oracle；`check` 驗必要檔案、ESM 語法、local-only 資源與危險 DOM API；`build` 只複製 allowlist 且 preview 必為 noindex。以檢查結果記錄實際 Node 版本及每條命令退出碼。測試僅假資料，不讀取使用者檔案或憑證。

`npm run dev` 僅允許綁定 `127.0.0.1:4237`，只 serve `public/`。可用離線 HTTP client 檢查 GET/HEAD、未知路徑 404、非 GET/HEAD 405、Host/path traversal 拒絕和安全 headers；不得為測試打開 browser 或 native app。

## 瀏覽器手動 gate（目前未執行）

| ID | 檢查步驟 | 預期 | 記錄 |
|---|---|---|---|
| B01 | 320 CSS px 寬度，完成一列報價、切換預覽、逐一觸發兩種下載控制 | 欄位與按鈕皆可達，沒有頁面水平溢出；預覽與內容完整。 | `NOT_RUN_USER_FOCUS_INCIDENT`，等待主代理已核可隔離 gate |
| B02 | 200% 縮放、鍵盤 Tab/Shift+Tab/Enter | 欄位標籤與 focus 可見、序順合理、第一個錯誤可到達。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B03 | 瀏覽器 Network/Storage 面板觀察建立、編輯、下載、清除 | 無外部 request；無 local/session storage、IndexedDB、service worker、輸入 URL/query 或持久草稿。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B04 | 以瀏覽器打開下載 HTML，輸入包含 `<script>` 的假資料 | 只顯示編碼後文字，沒有執行或網路載入；檔名固定 `quote.html`。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B05 | 原生下載/另存對話框和其他裝置 | 此工作不觸發 OS 對話或讀取使用者資料；真實檔案保存與不同手機匯入由使用者後續手動驗證。 | `NOT_RUN_USER_FOCUS_INCIDENT` |

## 完成判準

M1 自動測試/Node 工具鏈全部通過、每個 oracle 都有固定 expected、候選所有頁 noindex、實際 diff 僅落在本產品 TASKS 授權的實作路徑，且未完成的 browser gate 明確保持 NOT_RUN。M1 不能標成正式發布或完整瀏覽器驗收。


---

## 原文件 TASKS.md

# 實作任務：報價單快速製作

狀態：規格，尚未實作。依序一次完成一項，失敗不可跳到後續任務。所有實作只限本工具 `AGENTS.md` 所允許的 `package.json`、`.gitignore`、`public/**`、`scripts/**`、`test/**`、`dist/**`、`HANDOFF.md`、`TASK-ENTRY.md` 及指定 `evidence/m1/**`；六份規格和共通契約在 M1 僅供閱讀。不得改兄弟工具、共用首頁、發布或系統設定。

## T00 — 建立 Node 24 scaffold

- 前置：讀完 `AGENTS.md`、六份規格及 `docs/` 共通契約；確認沒有使用者檔案作測資。
- Allowed paths：`package.json`, `.gitignore`, `public/**`, `scripts/**`, `test/**`, `TASK-ENTRY.md`。
- 建立 ESM/private package、Node `>=24` engines、四個 scripts，最小繁中/英文靜態頁、核心空模組、離線 node:test 起點、閉合 public allowlist build/check 及 loopback-only server skeleton；server 固定 `127.0.0.1:4237`。
- 驗收：`node --version` 顯示 24+；`npm test`、`npm run check`、`npm run build` 可執行；dev 僅監聽規定 loopback；此步只建立命令，不能假定預先存在。
- 完成：基底可重複建置，`TASK-ENTRY.md` 與 `HANDOFF.md` 記錄實際工具鏈及結果。

## T01 — 嚴格小數字串解析

- 前置：T00。
- Allowed paths：`public/js/core/decimal.mjs`, `test/decimal.test.mjs`。
- 實作 quantity/price/discount/tax rate 各自 scale 的純 parser；範圍先驗、拒負號/指數/逗號/空白/超精度，不經 Number。
- 驗收：固定 A07–A09、A11 及合法上下界 oracle；每個拒絕有穩定 code。
- 完成：所有 parse expected 以明確 BigInt 常數寫入測試並回寫 HANDOFF。

## T02 — 報價固定點核心

- 前置：T01。
- Allowed paths：`public/js/core/quote.mjs`, `test/quote.test.mjs`。
- 實作 schema 欄位驗證、逐項 BigInt half-up、固定折扣與一次稅額 rounding；不可混入 UI/DOM。
- 驗收：固定 A01–A06、A10、A12；另外測零列、滿列、總和超 `Number.MAX_SAFE_INTEGER` 仍精確。
- 完成：結果沒有浮點中間值，與手算 expected 完全一致；回寫 HANDOFF。

## T03 — 靜態 HTML/JSON 與嚴格匯入

- 前置：T02。
- Allowed paths：`public/js/core/safe-output.mjs`, `public/js/core/import.mjs`, `test/safe-output.test.mjs`, `test/import.test.mjs`。
- 固定模板、逐值 escape、JSON schema 1、bounded parser 與重複鍵偵測；一次序列化後實算 HTML+JSON bytes，上限 512 KiB 全有或全無。
- 驗收：固定 A13–A16；對 HTML 查無執行元素/外部資源；惡意值只當資料。
- 完成：import 不信任 computed totals，所有輸入重驗並由核心重算；回寫 HANDOFF。

## T04 — 雙語編輯與真預覽

- 前置：T03。
- Allowed paths：`public/index.html`, `public/en/index.html`, `public/styles/app.css`, `public/js/app.js`。
- 建立雙方、幣別、可新增/刪除的 1–50 品項、折扣、稅率、備註及 DOM 文字節點預覽；呈現所有指定狀態。預覽是實際報價，不以假示例替代。
- 驗收：鍵盤操作欄位、新列後焦點、錯誤欄位訊息、編輯後即時過期；雙語切換保留安全路由但不寫入輸入 URL。
- 完成：兩語可走完編輯與產生預覽；回寫 HANDOFF。

## T05 — 匯入、下載及清理生命週期

- 前置：T04。
- Allowed paths：`public/js/app.js`, `public/js/core/import.mjs`, `test/import.test.mjs`, `test/safe-output.test.mjs`。
- FileReader 讀取前檢查 512 KiB、可 abort/可取消匯入、整份確認取代；手動點下載才建立固定檔名 Blob URL，來源改動/清除/pagehide 立即撤銷。匯出 pair 為同版原子結果。
- 驗收：固定 A17–A20；取消及過期 generation 不改草稿/不復活舊輸出。
- 完成：無自動下載、無原生另存 API、清理流程和失敗復原已涵蓋；回寫 HANDOFF。

## T06 — 雙語內容與版面

- 前置：T04。
- Allowed paths：`public/index.html`, `public/en/index.html`, `public/styles/app.css`, `public/js/app.js`。
- 落實 `UX-SEO.md` 的實際雙語 title/description/H1/FAQ、產品 App 工作畫布、桌面兩欄和手機單欄頁籤；候選頁與 dist 加 `noindex,nofollow`，不自行設正式 canonical。
- 驗收：文件中的繁中/英文 copy 完整存在；320px、200% zoom、對比、focus、44px controls 由 browser gate 與可做的靜態檢查分開記錄。
- 完成：不虛構支援/合規聲明；回寫 HANDOFF。

## T07 — 安全 check/build/dev 收尾

- 前置：T00–T06。
- Allowed paths：`scripts/check.mjs`, `scripts/build.mjs`, `scripts/serve.mjs`, `test/**`, `package.json`, `.gitignore`。
- `check` 真正解析必要 ESM、資源和危險 DOM；build allowlist 拒 traversal/symlink/未知輸入，不清除不明輸出；dev 僅 loopback 並限制 method/Host/path，no SPA fallback。
- 驗收：`npm test`、`npm run check`、`npm run build`；offline HTTP 驗 GET/HEAD、404、405、Host/path traversal；先後按 repository Windows environment rules 記錄環境 fingerprint。不得開 browser 或殺非本工具程序。
- 完成：所有命令退出碼、Node 版本和偏差回寫 HANDOFF。

## T08 — M1 固定驗收與交接

- 前置：T00–T07。
- Allowed paths：`HANDOFF.md`, `TASK-ENTRY.md`, `evidence/m1/**`。
- 對照 `ACCEPTANCE.md` 每個 oracle 記 PASS/FAIL/NOT_RUN 和精確證據；browser、下載、Network/Storage、視覺 gate 按當前 focus incident 標 `NOT_RUN_USER_FOCUS_INCIDENT`，不得猜 PASS。
- 驗收：重跑最終 `npm test`、`npm run check`、`npm run build` 各一次；確認 diff 只含允許路徑；不 commit/push/deploy，不建立 production dist。
- 完成：交接實際檔案、命令/退出碼、NOT_RUN 項目、已知風險；等待主代理獨立檢查及 M2 指示。


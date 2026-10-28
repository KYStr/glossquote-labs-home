# 批次文字套版 — 既有規格保存

Task ID: `labs-43-template-merge` · Spec ID: `spec-43-template-merge`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求：批次文字套版

狀態：規格，尚未實作。目標使用者是活動主辦或小型團隊，手上有名單和固定通知文字，需逐人建立訊息但仍由人決定是否、何時送出。

## MVP 決策

- 輸入一個有唯一非空標題列的 UTF-8 CSV、文字模板和模板欄位值。CSV 上限 1 MiB、資料列 1,000、欄 30；模板最多 32,768 UTF-16 code units；最終 TXT+JSON 產物（含所有 envelope/metadata）UTF-8 bytes 合計 ≤8 MiB。來源 CSV byte cap 獨立計算，不與成品大小混用。
- 第一個 UTF-8 BOM 可剝除。CSV 按 RFC 4180 常見引用規則，接受一致的 CRLF、LF 或 CR 分隔符，欄值不得隱式 trim；malformed CSV 拒絕。
- Placeholder 僅限 `{{完整欄名}}`；欄名 case-sensitive 且逐字匹配，包含欄名內的空格，不 trim。`{{ Name }}` 只在 CSV 標題恰為 ` Name ` 時匹配；如果標題是 `Name`，它是未知欄位。支援字面單次替換，不展開插入資料中的 `{{...}}`。
- 模板中未閉合 `{{`、孤立 `}}`、空佔位符、未知欄名都拒絕整批。模板只有 literal、沒有 placeholder 時允許生成同文多筆，但 UI 先明確顯示「每列會得到相同文字」。
- 空值定義為 CSV 解碼後嚴格等於 `""`；空白字元不是空值並保留。預設缺值阻止整批。使用者可在生成前勾選「允許空白代入」，每個空欄以空字串代換且顯示缺值總數和列/欄明細。
- 使用者可逐筆預覽、單筆複製（只在明確按下時調用 clipboard；拒絕時提供選取文字 fallback）及下載固定名 `personalized-text.txt` / `personalized-text.json`。無寄送、自動傳訊或個人姓名檔名。
- 全程目前頁面記憶體；reset/離頁清除資料、輸出與 Blob URL；無 localStorage。

## 功能需求

### FR-01：載入與 CSV dialect

超過 1,048,576 bytes、超過 1,000 data rows、超過 30 columns 拒絕。CSV 必須有標題列；標題非空且唯一，資料每列與標題欄數一致。僅接受 UTF-8；允許開頭單一 BOM。CSV parser 的 quote/逗號/double-quote/quoted multiline 為 RFC 4180 常見語法；line break 可一致使用 CRLF、LF 或 CR。未閉合 quote、quote 違規、mixed record separators 或行寬不一顯示 row/record 位置並拒絕。最後一個 record separator 不創造空白列。

### FR-02：模板解析

模板字數以 JS UTF-16 code units 計算，最多 32,768。掃描遇 `{{` 必須找到下一個 `}}`；內容不得空、不得含 `{`／`}`，但可以含任意一般空格，並精確等於一個 header，不 trim。`{{ Name }}` 的 token 是 ` Name `：只在 header 完全相同時匹配；若 header 為 `Name` 則報未知欄位。遇未配對 `}}` 拒絕。`{name}`、`${name}`、HTML、Markdown 皆為普通文字。使用 segments `[{type:'literal',value}, {type:'field',name}]` 編譯一次。

### FR-03：先檢查再產生

載入後解析全部模板佔位符，未知欄位以一次清單呈現，禁止按生成。逐列只檢查模板實際使用的欄。預設若任何待用欄位為空字串，阻止整批生成，顯示每欄缺值筆數及最多 20 個 row index（其餘顯示剩餘筆數），不修來源。允許空白選項預設 off；切換會使舊結果 stale，明示 `N 個空值將代入空字串`。

### FR-04：字面單次套入

對每一 row 遍歷預編譯 segments；field segment 從原 row 取值並直接附加，不再 parse 或 evaluate 值。特殊字串、`<script>`、引號、`{{OTHER}}` 都原樣保留。生成最多 1,000 筆；若單純 record text UTF-8 bytes（不含 export envelope）已大於 8 MiB，可作安全下界提早拒絕。最終是否超限以 FR-05 serializer 實測 TXT+JSON bytes 合計（包含所有 envelope/metadata）為準；超限整批輸出失敗，不提供其中一個檔、截斷結果或上一代輸出 Blob。

### FR-05：預覽、複製與下載

預覽以 row index 定位，預設顯示第 1 筆，可上一筆／下一筆；內容保留換行且使用 `<pre>` 或等效 text-only 元件。單筆複製按鈕只複製目前筆，成功才顯示「已複製第 N 筆」，失敗提供可鍵盤選取的 textarea。下載 TXT 為可讀形式：每筆先印固定 `--- 第 1 筆 ---` / `--- Row 1 ---` 分隔行，之後原文；JSON schemaVersion=1、tool=`template-merge`、template、headers、options、records `{row,text,blankFields}`、counts。輸出不以姓名命名。

### FR-06：資料生命週期和狀態

狀態 `idle → source-loaded → template-ready → validating → needs-input/ready → generating → preview → stale`。來源、模板或空值選項更改時 generation++、取消正在執行工作、清除結果和下載。執行每 100 rows yield，可取消；取消不保留 partial output。`reset` 解除 input File、parsed rows、segments、records 和 output Blob refs；`pagehide` 取消並 revoke 所有 URL。不得保存歷史。

## 輸出限制和錯誤碼

TXT+JSON 最終 UTF-8 bytes 合計上限 8 MiB，含每個檔案的所有 JSON/TXT envelope、欄位標籤和 metadata。來源 CSV 的 1 MiB 上限另算。輸入檔名只顯示文字，不用於路徑。固定錯碼：`FILE_TOO_LARGE`、`INVALID_UTF8`、`CSV_SYNTAX`、`ROW_WIDTH`、`HEADER_INVALID`、`ROW_LIMIT`、`COLUMN_LIMIT`、`TEMPLATE_TOO_LARGE`、`TEMPLATE_SYNTAX`、`UNKNOWN_FIELD`、`MISSING_VALUES`、`OUTPUT_TOO_LARGE`、`COPY_UNAVAILABLE`、`CANCELLED`。錯誤不在畫面／下載加入原始名單內容。

## 非目標

不支援 liquid/Handlebars/Mustache 控制語法、條件、HTML rendering、批次檔名、複製整批 clipboard、外送、追蹤、變數自動猜測、匯入舊成果或保存設定。只提供靜態文字產物。


---

## 原文件 TECHNICAL.md

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


---

## 原文件 UX-SEO.md

# 介面與搜尋資料：批次文字套版

狀態：規格，尚未實作。Surface mode：Product App。M1 頁面使用 `noindex,nofollow`，沒有正式 canonical/sitemap；`templates.glossquote.com` 只作候選 slug，不代表已部署。

## 搜尋文案

**繁中 title：** 批次文字套版｜依名單產生個人化通知  
**繁中 description：** 貼上 CSV 名單和通知範本，逐筆預覽個人化文字，找出缺值後下載 TXT 或 JSON；不會寄送訊息。  
**繁中 H1：** 一份通知，逐人套入名單

**English title:** Personalize Text from a CSV List | Preview Every Message  
**English description:** Add a CSV list and a `{{column}}` template, review each generated message, and download text or JSON. Nothing is sent.  
**English H1:** Turn one template into reviewed messages

## 桌面與手機工作區

桌面 Wide：

```text
┌──────────── 批次文字套版 ───── zh-TW | 名單未載入 ──────────────┐
│步驟：名單 / 範本 / 預覽│               編輯與預覽工作區       │ 欄位用法│
│ 1 名單                │ 名單 CSV [選擇檔案]                     │ {{姓名}}│
│ 2 範本                │ 範本編輯器                              │ 只支援  │
│ 3 檢查與產生          │ 您好{{姓名}}，編號{{ID}}                 │字面代入 │
│                       │ 欄位：姓名 · ID                         │         │
│                       │ 缺值 0；未知欄位 0                      │         │
│                       │ [產生 120 筆預覽]                       │         │
├───────────────────────┼─────────────────────────────────────────┤
│ 篩選/筆序 1–120       │ 第 1 筆 / 120 · 預覽文字                 │
│                       │ [複製這筆] [下載 TXT] [下載 JSON]        │
└───────────────────────┴─────────────────────────────────────────┘
```

手機 Compact：

```text
┌ 批次文字套版 ─ 狀態 ┐
│名單 → 範本 → 預覽   │
│ [選 CSV 名單]       │
│ 範本 textarea       │
│ 偵測欄位 / 缺值     │
│ □ 允許空白代入      │
│ [產生預覽]          │
├────────────────────┤
│ 第 1 / 120 筆       │
│ 內容（可換行）      │
│ [複製這筆]          │
│ [TXT] [JSON]        │
└────────────────────┘
```

手機使用可見步驟切換，但名單與模板的改動狀態常駐，核心功能不藏在手勢。預覽是畫布最大區；欄位清單為可收合 inspector，資訊與 textarea 間距充足。

## 狀態文案

Idle：「選一份 CSV 名單，或先輸入範本。」；loaded：「已讀取 120 筆、4 欄。」；validating：「正在檢查模板欄位和空值…」；needs-input：「3 筆缺少 Email。修正 CSV，或明確允許空白代入。」；running：「正在產生第 200 / 800 筆…［取消］」；success：「已產生 120 筆；尚未傳送任何訊息。」；empty：「CSV 只有標題列，沒有可產生的資料。」；blocked：「模板用了未知欄位「地址」，請改成現有欄名。」；stale：「範本或名單已改，舊預覽已作廢。」；copy fail：「無法直接複製；請選取下方文字後複製。」

## 無障礙與使用方式

所有欄位有可見 label；模板編輯器有固定說明、字數及錯誤關聯。模板可能很長，以 `textarea` 直接編輯，Tab 不被自製快捷鍵攔截。用按鈕上一筆／下一筆替代拖動；生成狀態只做摘要 live region，避免逐筆播報。UI 不自動寫 clipboard、不自動下載或傳訊。

目標 320px 無頁面水平捲動，200% zoom 保留欄位和預覽；主要觸控區 44×44px，focus ring 可見、正文對比 ≥4.5:1，尊重 reduced motion。預覽遇 `<script>`、`<img>` 類字串只顯示原文，不建立 DOM 元素。

## FAQ

### 繁體中文

**範本支援條件句或自動判斷嗎？** 不支援；只做 `{{欄名}}` 的一次字面代入。  
**資料會自動寄出嗎？** 不會。工具只建立可檢查、可下載或單筆複製的文字。  
**有空白欄位會怎樣？** 預設整批暫停並列出缺值；你可以先修正名單，或明確選擇讓空值代入空字串。

### English

**Does the template support conditions?** No. It performs one literal substitution for each `{{column}}` field.  
**Will messages be sent automatically?** No. You review, copy, or download the text yourself.  
**What happens to blank cells?** Generation is blocked by default and the missing rows are listed. You may explicitly allow blanks to become empty text.

## Browser gate

Node can verify CSV parsing, template compilation, exact single-pass substitution and limits. Real checks for keyboard editing, clipboard permission fallback, reflow, zoom, copy buttons and download remain **NOT_RUN_USER_FOCUS_INCIDENT** pending primary confirmation of an isolated browser mechanism. Never mark these PASS from Node tests.


---

## 原文件 ACCEPTANCE.md

# 驗收 oracle：批次文字套版

狀態：規格，尚未實作。所有輸入均為合成資料；下列預期是 oracle，並非已跑過的測試。

## 自動案例

1. **A01 FR-01 CSV baseline** — `姓名,ID\r\n小王,001`；headers `['姓名','ID']`、rows `[['小王','001']]`。
2. **A02 FR-01 quoted commas** — `name,note\nA,"hi, there"`；note 精確 `hi, there`。
3. **A03 FR-01 escaped quote/newline** — `n,m\r\nA,"x""y\r\nz"`；第二欄是 `x"y\r\nz`。
4. **A04 FR-01 malformed** — `n,m\nA,"unfinished`；`CSV_SYNTAX`，不生 records。
5. **A05 FR-01 row width** — header `n,m`，row `A`；`ROW_WIDTH`，不補空格。
6. **A06 FR-01 cap** — 1,048,576-byte legal input、1,000 rows、30 cols 可進下一步；各自多 1 byte／1 row／1 col 分別 `FILE_TOO_LARGE` / `ROW_LIMIT` / `COLUMN_LIMIT`。
7. **A07 FR-01 invalid header** — headers `['name','name']` 或 `['','ID']`；`HEADER_INVALID`。
8. **A08 FR-02 ordinary substitution** — template `您好{{姓名}}，編號{{ID}}`、row `{姓名:'小王',ID:'001'}`；輸出精確 `您好小王，編號001`。
9. **A09 FR-02 unknown field** — template `{{地址}}`、headers `姓名`；`UNKNOWN_FIELD`，列 `地址`，按產生 disabled。
10. **A10 FR-02 malformed markers** — 分別用 `{{姓名`、`姓名}}`、`{{}}`；三者皆 `TEMPLATE_SYNTAX`。
11. **A11 FR-02 header exactness** — header `Name`、template `{{ Name }}`（token value=` Name `）；未知欄位；header ` Name ` with the same template substitutes successfully. No trim/casefold.
12. **A12 FR-03 empty default** — rows `[['A',''],['B','2']]`、使用 `{{ID}}`；阻止全批，`ID` 缺值 1 筆，preview count 0。
13. **A13 FR-03 allow blank** — 同 A12、allowBlank true；生成 `['','2']`，第一筆 `blankFields:['ID']`、總空值 1。
14. **A14 FR-04 single pass** — 欄 A 值 `{{B}}`、B 值 `EXPANDED`，template `{{A}}`；結果嚴格 `{{B}}`。
15. **A15 FR-04 replacement token** — 值 `$& $1 $$`、template `{{x}}`；三個字面片段完全保留，不按 String.replace 特殊解釋。
16. **A16 FR-04 malicious text** — 值 `<script>alert(1)</script><img src=x onerror=alert(1)>`；輸出是完全相同文字；無 HTML execution、網路請求或 DOM event。
17. **A17 FR-05 names not paths** — header `姓名`, value `../../evil.html`；下載 filename 仍 `personalized-text.txt`，value 僅在文字 body。
18. **A18 FR-05 exact JSON** — one row 1 => JSON has `schemaVersion:1`, `tool:'template-merge'`, `records:[{row:1,text:'...',blankFields:[]}]`；JSON parse/re-serialize preserves Unicode and newline.
19. **A19 FR-04/05 output boundary** — 合成資料建立最終 TXT+JSON combined UTF-8 bytes (including both envelopes) exactly 8,388,608 accepts both files; 8,388,609 blocks both with `OUTPUT_TOO_LARGE`, with no partial or previous-generation Blob. Source CSV 1 MiB is a separate input cap.
20. **A20 FR-06 stale race** — generation 1 產生期間將 template 改版為 generation 2；generation 1 回結果不得顯示或下載，generation 2 才可成為 ready。

## 手動／browser 驗收

清單：tab/Shift+tab 編輯和預覽；320 CSS px；200% zoom；複製成功與拒絕 clipboard 的選取 fallback；一筆與大量預覽換行；下載對話框不讀取或自動保存位置；reset/pagehide 清理；offline 無外部網路。按目前 focus incident，真 browser gate 標 **NOT_RUN_USER_FOCUS_INCIDENT**；不得開原有使用者分頁、native app、OS dialog 或操作鍵盤焦點。Node tests 不涵蓋clipboard/下載實際行為。


---

## 原文件 TASKS.md

# 實作任務：批次文字套版

狀態：規格，尚未實作。Node 24+ ESM、runtime 零 dependency。遵守共用 docs。執行任何 server/browser/npm install 之前須有後續任務授權；本規格階段不做這些動作。瀏覽器無法在隔離焦點條件下驗收要明標 `NOT_RUN_USER_FOCUS_INCIDENT`。

1. **T00 — Scaffold。** 前置：六份產品規格與主編共用文件可用。Allowed paths：本產品 `package.json`, `.gitignore`, `scripts/**`, `public/**`, `test/**`, `dist/**`, `HANDOFF.md`, `TASK-ENTRY.md`, `evidence/m1/**`。建 ESM/private package、Node 24 guard、check/build/dev/test scripts；dev 固定 loopback `127.0.0.1:4223`。驗收 `node scripts/check.mjs`；完成：必要檔案、無依賴、build 對 public allowlist 工作；回寫 HANDOFF。
2. **T10 — Strict CSV parser。** 前置 T00 PASS。Allowed paths 同上；新增 `public/js/core/csv.mjs`、`test/csv.test.mjs`。按 parser contract 做 byte-first cap、UTF-8、header、quote、行寬與 row/col limits。驗收 `node --test test/csv.test.mjs`；對照 A01–A07。完成：任何 malformed input 都不產 partial dataset；回寫 HANDOFF。
3. **T20 — Template scanner/render/export。** 前置 T10 PASS。新增 template/render/export core 與測試，實作 segments + single pass、missing analysis、8 MiB cap、schema。驗收 `npm test`；對照 A08–A19。完成：未知欄和缺值先阻止，不把使用者字串插成 HTML；回寫 HANDOFF。
4. **T30 — 雙語任務介面。** 前置 T20 PASS。建立 public HTML/CSS/app，串起 CSV→template→inspect→generate→preview→copy/download。狀態/文案符合 UX；使用按鈕換列而非拖曳依賴。驗收 `npm run check` + `npm run build`；真 browser 未隔離則 NOT_RUN。完成：可操作 candidate 的 source 收斂且 task canvas 主導；回寫 HANDOFF。
5. **T40 — stale/cancel/privacy。** 前置 T30 PASS。加入 generation、abort、每 100 rows yield、URL cleanup、pagehide/reset；檢查 no storage/remote resources。驗收 `npm test`, `npm run check`, `npm run build`；對照 A20 和純函式 cleanup seam。完成：來源或模板改動後舊輸出不可下載；回寫 HANDOFF。
6. **T50 — 收尾與 M1 gates。** 前置 T40 PASS。補中英 SEO、FAQ、noindex、320px/zoom/keyboard/ARIA copy。驗收 final `npm test`, `npm run check`, `npm run build` 一次；只可把執行過的 gates 記 PASS，browser 記 NOT_RUN_USER_FOCUS_INCIDENT。Allowed paths 同 T00；回寫 HANDOFF、列明下一個需主驗項。完成：差異路徑均在 allowlist，沒有 publication/deploy。

任務失敗須修復當前 task 並重跑受影響命令，再進下一項。不可在沒有主驗及新指令時進入 M2 發布。


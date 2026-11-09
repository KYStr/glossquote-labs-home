# 產品規格：GlossQuote 活動流程時間表

> 規格狀態：M0 文件已撰寫，尚未實作。下列例子是預期行為與 oracle，不是執行結果。

## 使用者目標

主持人、老師或會議召集人先輸入開始時間，再按實際順序填寫各段活動名稱、整分鐘時長和可選備註，按一次「排出時間表」即可看見全程的起訖時間。使用者可選擇提供目標結束時間，並明確說明目標在開始當日或次日。

## 固定產品決策

- 產品：活動流程時間表（Event Timeline）。
- 靜態網頁，沒有後端或執行期依賴。
- 正式網域：`agenda.glossquote.com`；不使用 `time.glossquote.com`。
- Worker：`glossquote-event-timeline`。`npm run dev` 預設只綁定 `127.0.0.1:4205`。
- 獨立來源 repo：`KYStr/glossquote-labs-event-timeline`。主代理獨立驗收並明確放行 M2 後，原功能對話建正式工具鏈並以固定 ZIP 流程發布 public GitHub；M3 工具和首頁部署由主代理負責。
- 繁中頁 `/index.html` 使用 `lang="zh-Hant"`，英文頁 `/en/index.html` 使用 `lang="en"`；兩頁各自具完整 UI、SEO 標題、描述、H1、說明和至少四個 FAQ，不設語言選擇頁。
- 活動資料只存在本頁 DOM 和 JavaScript 記憶體；不持久化，不包含使用者日期或時區。

## 功能需求

### FR-01 開始時間

- 初始值：空字串。
- 必填字串 `startTimeRaw`。唯一有效格式為 ASCII `HH:MM`，24 小時制；小時 `00–23`，分鐘 `00–59`。不得修剪空白或接受替代格式。
- 結果以 0–1439 的整數分鐘表示：`hour × 60 + minute`。
- 空白、9:00、24:00、全形數字、全形冒號、前後空白及任何其他格式都回報 `TIME_FORMAT`。

### FR-02 目標結束時間

- `targetTimeRaw` 初始為空字串；空字串表示沒有目標。
- 非空時使用與 FR-01 相同的 ASCII 時間格式。
- `targetNextDay` 初始為 `false`，型別必須是 boolean。它只表示目標比開始時間多一天，不是「如果需要就跨日」。
- 同日目標必須嚴格晚於開始時間。若 `targetNextDay=false` 且目標分鐘小於或等於開始分鐘，回報 `TARGET_NOT_AFTER_START`。不猜測使用者想跨日，也不因活動預計超過目標而拒絕：後者是合法的超時結果。
- 次日目標絕對分鐘是 `1440 + targetMinuteOfDay`。因此開始 `09:00`、目標次日 `09:00` 是有效的 24 小時目標。
- UI 在目標欄為空時停用「目標在次日」核取方塊；若以程式形成 `targetNextDay=true` 和空目標，驗證仍必須 fail closed 並回報 `TARGET_NEXT_DAY_WITHOUT_TARGET`。

### FR-03 活動列

- 初始草稿有一列空白活動，使用者必須填妥後才能產生時間表。
- 活動列數量只能是 1–60。刪除最後一列的按鈕停用；第 60 列後「新增活動」停用並明確顯示上限。
- 每列資料正好是 `{ id, nameRaw, durationMinutesRaw, noteRaw }`：
  - `id`：穩定、唯一的 ASCII 字串，長 1–64 個 ASCII 碼元，符合 `^[A-Za-z0-9_-]{1,64}$`。UI 使用遞增 `row-1`、`row-2`…識別列，不把 ID 顯示於報告，也不重用已刪除 ID。
  - `nameRaw`：字串，原始長度最多 256 個 UTF-16 code units。用 ECMAScript `String.prototype.trim()` 修剪後必須有 1–80 個 UTF-16 code units；空白名稱回報 `NAME_REQUIRED`，超過 80 回報 `NAME_TOO_LONG`。
  - `durationMinutesRaw`：字串，原始長度最多 256 個 UTF-16 code units，只接受一個或多個 ASCII 數字 `0–9`。先移除前導零（全零字串保留為 `0`），再以十進位整數範圍驗證 1–720。非 ASCII 數字、空字串、正負號、小數、指數、空白和其他字元回報 `DURATION_FORMAT`；整數小於 1 或大於 720 回報 `DURATION_RANGE`。前導零可接受，例如 `0005` 正規化為 5 分鐘。
  - `noteRaw`：字串，原始長度最多 256 個 UTF-16 code units；修剪後可以為空，最多 160 個 UTF-16 code units，超過回報 `NOTE_TOO_LONG`。
- 所有文字欄位的原始長度上限為 256 個 UTF-16 code units；不得用 Unicode code point 或 UTF-8 byte 數替代此上限。輸入字串若含 Unicode Cc 控制字元或不成對 UTF-16 surrogate，整份草稿拒絕。名稱及備註只是文字，永遠不解讀為 HTML 或 Markdown。
- 每列的名稱和備註保留修剪後的原文；不做 NFC/NFKC 轉換。備註可以是空字串。

### FR-04 排序、增刪與休息

- 順序就是計算順序。每列有「上移」和「下移」具文字標籤的原生按鈕；首列上移與末列下移依位置停用。
- 每次新增、移除或改變順序都立即撤銷已提交結果，並停用複製和下載。
- 新增列放在列表尾端，建立空名稱、空時長、空備註及新的唯一 ID。
- 移除一列不會重用其 ID。保留至少一列。
- 不實作拖曳排序。休息、用餐、轉場與正式活動使用相同欄位及運算規則。

### FR-05 產生時間表

- 只有使用者啟動「排出時間表」後才驗證並提交結果；編輯時不即時重算。
- 任何欄位變更即刻清除過期結果、純文字報告、成功訊息，停用複製和下載。畫面不得讓舊結果看起來仍有效。
- 有效草稿依列順序逐一加上整數分鐘。總時長為所有列的總和，最多 1440 分鐘；大於 1440 回報 `TOTAL_DURATION_EXCEEDED`。
- 每列結果包含：`id`、修剪後名稱和備註、分鐘數、`startAbsoluteMinute`、`endAbsoluteMinute`、開始與結束的 `minuteOfDay` 和 `dayOffset`。
- `dayOffset` 為 `floor(absoluteMinute / 1440)`，分鐘為 `absoluteMinute mod 1440`。活動總長最多一天，故所有開始與結束的 day offset 為 0 或 1。絕對分鐘恰為 1440 時顯示 `00:00（次日）`，不能顯示 24:00。
- 結果也包含總分鐘、最後絕對結束分鐘、24 小時制結束時間和結束 day offset。
- 提供目標時，結果比較 `targetAbsoluteMinute - endAbsoluteMinute`。正數為提早該分鐘數，零為準時，負數為超時其絕對值分鐘。沒有目標時比較欄為 `null`，不顯示提早／超時。
- 若任一活動跨午夜，該列跨到的時刻以及後續次日列都明確附「次日」／“next day”字樣；不只靠顏色、日期省略或負數表示。

### FR-06 錯誤與復原

- `validateDraft` 一次只回報固定優先序中的第一個錯誤；錯誤不包含輸入原文、stack、例外或自由文字。
- 錯誤旁顯示繁中或英文的具體原因和可行修正，並以 `aria-describedby` 關聯欄位。提交失敗時將焦點移至第一個錯誤欄位；一般編輯不強行搬動焦點。
- 若嘗試在 IME 組字中提交，阻止排程並顯示「請完成輸入後再排出時間表。」／“Finish composing the text before building the timeline.”。
- 排程為同步、有限工作，沒有載入 spinner；若排程失敗，保留草稿，清掉舊結果，允許修正後重試。

### FR-07 報告、複製和下載

- 成功排程後提供目前語言的唯讀純文字報告，以及明確的「複製報告」和「下載 TXT」控制。
- 不在排程時自動複製或下載。複製需由使用者啟動原生 Clipboard API；不支援或被拒絕時保留可手動選取的報告並顯示說明。
- 下載位元組使用 UTF-8、不含 BOM、不加末尾換行；固定檔名 `glossquote-event-timeline.txt`；不列印、不自動開啟檔案。
- 報告固定以 LF 分行，不以使用者輸入中的換行控制符拼接（那些字元會先被拒絕）。不含日期、時區、內部 ID、原始錯誤或隱藏 metadata。

### FR-08 全清除、離頁及語言切換

- 「清除全部」在有任何欄位值或已提交結果時呼叫原生 `window.confirm`。取消保留草稿、列順序、結果、報告和目前語言狀態；確認後重設為一列空白活動的初始狀態。
- 在空白初始狀態清除不必彈確認。
- 使用者切換到另一個本地語言頁面時，如果頁面有內容或結果，使用原生確認，明確告知離開會清除本頁時間表；取消保留目前頁面。確認後導覽至 `/index.html` 或 `/en/index.html`，新頁是空白初始狀態；不承諾語言切換保留草稿。
- `pagehide` 一律清除 DOM 欄位、結果、報告、所有活動資料、待顯示訊息及目前 object URL，令複製／下載失效。`pageshow` 的 `event.persisted` 為 true 時再以空白初始狀態初始化。
- 不依賴卸載確認事件保護資料；離頁一律清除，語言連結在可攔截時預先確認。瀏覽器直接關閉可能不顯示通知是可接受的，因資料本來不會保存。

### FR-09 隱私與網路

- 不保存到 local/session storage、IndexedDB、Cache API、Cookie、URL query/hash、History state、檔案系統或後端。
- 應用程式不呼叫 Fetch、XHR、Beacon、WebSocket、EventSource、Service Worker、第三方 API、遙測或分析。瀏覽器載入部署頁面及其同源靜態檔案是交付頁面的必要網路行為，報告或草稿不會由程式送往網路。
- 不輸出到 console，不記錄使用者名稱、備註或完整時間表。只允許使用原生頁面 UI 顯示內容。

### FR-10 雙語 SEO 和首頁導覽

- 繁中 `/index.html` 和英文 `/en/index.html` 各有 `<html lang>`, 頁面標題、描述、H1、使用說明與至少四個 FAQ；繁中語意為台灣繁體中文（`zh-Hant`），英文以一般英文撰寫（`en`）。沒有獨立語言選擇頁。
- 本機／preview 使用 `noindex,nofollow`；不得生成正式 canonical、hreflang、可索引 robots 或 production sitemap。
- M1 preview 一律 noindex。只有主代理放行後的 M2 production build 才輸出正式 SEO：繁中 canonical `https://agenda.glossquote.com/index.html`、英文 canonical `https://agenda.glossquote.com/en/index.html`；兩頁互相列出 `hreflang="zh-Hant"`、`hreflang="en"`，並以 `hreflang="x-default"` 指向繁中 `/index.html`。沒有語言選擇頁。
- 繁中頁返回首頁連結固定為 `https://glossquote.com/index.html`，英文頁為 `https://glossquote.com/en/index.html`，與 `docs/BRAND.md` 一致。
- production robots.txt 僅允許已發布頁並列出 sitemap；sitemap 只列兩個 canonical URL；未知路徑是 HTTP 404，不回 200 假裝成功。
- 每頁 production Open Graph title/description/locale 對應該語言，og:url 等於該頁 canonical，og:type=website；不提供虛構預覽圖。
- CSP 禁止外部連線、外部字型、物件或框架；只允許同源資產及 production 每個語言頁對應的精確 JSON-LD SHA-256 hash，不使用 `unsafe-inline` 或 `unsafe-eval`。具體 header 見 `UX-SEO.md` 與 `TECHNICAL.md`。
- M1 不建置正式 SEO 或 production artifact。M2 僅在主代理明確放行後由原功能對話建立 production 工具鏈、獨立輸出 `dist-production/` 並用固定 ZIP 流程發布 public GitHub；M2 不登入 Cloudflare、不部署。M3 工具及首頁部署由主代理執行。

## 驗證失敗優先序

對 `validateDraft`，在第一個可觀察錯誤停止。遇到同一輸入有多個錯誤時，以下順序是 API 契約，測試必須鎖定：

1. Root 結構：不是普通 plain record、不是確切四欄、含 symbol、含 unknown own field、缺欄位、非 enumerable/data descriptor，依序分別為 `INVALID_SCHEMA`、`UNKNOWN_FIELD`、`MISSING_FIELD` 或 `INVALID_SCHEMA`；root key 次序固定為 `startTimeRaw`、`targetTimeRaw`、`targetNextDay`、`rows`。
2. Root 型別：時間欄位不是 string、`targetNextDay` 不是 boolean、`rows` 不是 array，按上述 root key 次序回 `INVALID_FIELD_TYPE`。
3. `rows` 必須是標準、dense array，僅有 `length` 和連續索引，沒有 symbol/custom property；不符回 `INVALID_SCHEMA`。長度不在 1–60 回 `ROW_COUNT`。
4. 依 array index 次序檢查每一列的 plain record 和 exact keys `id`、`nameRaw`、`durationMinutesRaw`、`noteRaw`：unknown `UNKNOWN_FIELD`、missing `MISSING_FIELD`、其他 schema/descriptor 問題 `INVALID_SCHEMA`，型別錯誤 `INVALID_FIELD_TYPE`。
   在所有列的 schema、descriptor 和型別檢查完成之前，任何列錯誤的 `rowId` 都是 `null`；這個階段不得讀取或回傳尚未驗證的 ID。
5. 依列次序驗證 ID 格式及唯一性：`INVALID_ROW_ID`、`DUPLICATE_ROW_ID`。
6. 依固定欄位次序檢查每個輸入字串長度：`startTimeRaw`、`targetTimeRaw`，再依列索引各自檢查 `nameRaw`、`durationMinutesRaw`、`noteRaw`；超過 256 回 `RAW_TEXT_TOO_LONG`。隨後以相同欄位順序掃描 Unicode Cc 及 surrogate；先出現的 Cc 回 `CONTROL_CHARACTER`，不成對 surrogate 回 `UNPAIRED_SURROGATE`。
7. 解析開始時間；錯誤為 `TIME_FORMAT`。然後檢查 `targetNextDay=true` 且目標空白，錯誤為 `TARGET_NEXT_DAY_WITHOUT_TARGET`；若目標非空再解析目標，錯誤為 `TIME_FORMAT`。同日有效格式目標小於或等於開始時間，錯誤為 `TARGET_NOT_AFTER_START`。
8. 依列索引逐列驗證修剪後名稱（`NAME_REQUIRED`，再 `NAME_TOO_LONG`）、分鐘原文（`DURATION_FORMAT`，再 `DURATION_RANGE`）和修剪後備註（`NOTE_TOO_LONG`）。
9. 所有列都有效後，總時長大於 1440 回 `TOTAL_DURATION_EXCEEDED`。

`error` 精確只有 `{ code, field, rowId }`。`field` 是固定欄位路徑或 `null`；`rowId` 是已檢查且有效的列 ID 或 `null`。不得帶入使用者原文。因結構錯誤而尚不能安全讀取的列，`rowId` 必須為 `null`。

## MVP 之外

不把草稿存在瀏覽器、不加入匯入/匯出 JSON、拖曳、多人同步、帳戶、日曆整合、通知、排班、時區或日期、秒數、循環活動、列印版型或付款。未來任何改變都要另立任務與安全／隱私審查。

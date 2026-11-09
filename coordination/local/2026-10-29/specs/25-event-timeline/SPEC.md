# 活動流程時間表 — 既有規格保存

Task ID: `labs-25-event-timeline` · Spec ID: `spec-25-event-timeline`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

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


---

## 原文件 TECHNICAL.md

# 技術規格：資料、純函式與本機交付

> 規格狀態：M0 文件已撰寫，尚未實作或執行下列命令。API 和實際瀏覽器能力須在 M1/M2 按驗收項目實測，不可由本文宣稱通過。

## 執行環境與依賴

- 產品使用原生 HTML、CSS 和瀏覽器 ESM。Node.js 24+ 僅供本機靜態伺服器、檢查、建置和內建 node:test。
- 不加入 runtime 或 dev 套件、framework、bundler、外部圖示、遠端字型或 CDN。
- package.json 固定 type=module、private=true、engines.node >=24，並提供：
  - npm run dev 執行 node scripts/serve.mjs，只綁 127.0.0.1，預設連接埠 4205，只提供 public/ 內的 M1 noindex preview source。
  - npm test 執行 node --test，測試放在 test/*.test.mjs。
  - npm run check 執行 node scripts/check.mjs。
  - npm run build 執行 node scripts/build.mjs，只產生 noindex preview 到本專案 dist/。
- M1 僅建立 dev/test/check/build 工具鏈。主代理明確放行後，M2 原功能對話再增加 build:production、check:production、preview:production 與獨立 dist-production/ 輸出；production candidate 不覆寫 dist/。
- scripts/check.mjs 必須檢查必要檔案、ESM 語法、允許的本機資源和危險 DOM／網路 API；掃描不是安全證明。M1 scripts/build.mjs 只複製 public/ 到本專案 dist/，不複製規格、測試或 fixtures。
- 本機伺服器只綁 loopback。只接受 1–65535 的整數連接埠參數，拒絕其他 method、無效路徑和 public 根目錄外路徑；不列目錄。

## 專案樹

此樹是預期的 M1 交付結構；M0 不表示任何產品檔案已存在。入口和共用規則由主代理提供。

    .
    ├── START-HERE.md / AGENTS.md / HANDOFF.md / TASK-ENTRY.md / project.json
    ├── README.md / PRODUCT.md / TECHNICAL.md / UX-SEO.md
    ├── ACCEPTANCE.md / TASKS.md
    ├── docs/BRAND.md / ENGINEERING.md / PRIVACY-SECURITY.md
    │   └── DESIGN-SYSTEM.md / RELEASE.md
    ├── package.json / .gitignore / wrangler.jsonc
    ├── scripts/serve.mjs / check.mjs / build.mjs
    ├── public/
    │   ├── index.html                 # zh-Hant
    │   ├── 404.html / _headers
    │   ├── styles/app.css
    │   ├── js/app.js
    │   ├── js/core/validation.js / schedule.js / report.js
    │   └── en/index.html              # en
    └── test/validation.test.mjs / schedule.test.mjs / report.test.mjs

public/ 是唯一應用 source tree；M1 local server 只提供此目錄，M1 build 輸出 noindex `dist/` preview。正式候選 `dist-production/` 在 M2 才建立，並與 `dist/` 分離。test/、scripts/、根目錄和 docs/ 永遠不可由靜態伺服器提供。任何輸出目錄都不含草稿或測試 fixtures。

## 精確資料型別

以下 TypeScript 註記只描述精確 schema；產品仍是原生 ESM，不加 TypeScript 編譯器。

    type EventDraftRow = {
      id: string;
      nameRaw: string;
      durationMinutesRaw: string;
      noteRaw: string;
    };

    type Draft = {
      startTimeRaw: string;
      targetTimeRaw: string;   // "" 表示沒有目標
      targetNextDay: boolean;  // true 表示目標比開始多一天
      rows: EventDraftRow[];   // dense，長度 1..60
    };

每個 root/row 必須是 prototype 為 Object.prototype 或 null 的普通 record。所有預期欄位必須是 own、enumerable、data descriptor；getter/setter、未知 own key、symbol key、缺欄位或不合規 prototype 一律拒絕。只有完整檢查 descriptors 後才讀取 descriptor 的 value，不得先讀取 draft.foo 或 object spread 不可信輸入。

rows 必須是標準 Array，長度 1–60，own key 正好是標準非 enumerable length 和連續的 0..length-1 enumerable data descriptor；不得有 hole、額外欄位或 symbol。先以 Array.isArray 及 descriptors 檢查，不讀取可疑索引 getter。反射檢查例外映射為 INVALID_SCHEMA。對 JavaScript Proxy，無法在不觸發 reflection trap 下可靠辨認代理身分；core 接受的輸入介面是上列普通 record/Array，M1 至少要證明普通 getter 不會被呼叫。

輸入欄位字串上限以 JavaScript .length 計算 UTF-16 code units。startTimeRaw、targetTimeRaw、durationMinutesRaw、nameRaw、noteRaw 都最多 256；時間 grammar 本身把時間限制為 5 個 ASCII 字元。名稱和備註再依 PRODUCT.md trim 和驗證。拒絕 Unicode Cc（U+0000–U+001F、U+007F–U+009F）及不成對 surrogate；合法 surrogate pair 可接受。時間與時長只接受 ASCII。ID 不使用使用者名稱或備註。

### 驗證回傳型別

    type FieldPath =
      | "startTimeRaw" | "targetTimeRaw" | "targetNextDay" | "rows"
      | "rows[].id" | "rows[].nameRaw"
      | "rows[].durationMinutesRaw" | "rows[].noteRaw";

    type ErrorCode =
      | "INVALID_SCHEMA" | "UNKNOWN_FIELD" | "MISSING_FIELD"
      | "INVALID_FIELD_TYPE" | "ROW_COUNT" | "INVALID_ROW_ID"
      | "DUPLICATE_ROW_ID" | "RAW_TEXT_TOO_LONG" | "CONTROL_CHARACTER"
      | "UNPAIRED_SURROGATE" | "TIME_FORMAT"
      | "TARGET_NEXT_DAY_WITHOUT_TARGET" | "TARGET_NOT_AFTER_START"
      | "NAME_REQUIRED" | "NAME_TOO_LONG" | "DURATION_FORMAT"
      | "DURATION_RANGE" | "NOTE_TOO_LONG" | "TOTAL_DURATION_EXCEEDED";

    type ValidationError = {
      code: ErrorCode;
      field: FieldPath | null;
      rowId: string | null;
    };

    type NormalizedRow = {
      id: string;
      name: string;                // trim 後，1..80 UTF-16 code units
      durationMinutes: number;     // integer 1..720
      note: string;                // trim 後，0..160 UTF-16 code units
    };

    type NormalizedTarget = {
      minuteOfDay: number;         // integer 0..1439
      dayOffset: 0 | 1;
      absoluteMinute: number;      // minuteOfDay + 1440 * dayOffset
    };

    type ValidatedDraft = {
      startMinuteOfDay: number;    // integer 0..1439
      target: NormalizedTarget | null;
      rows: NormalizedRow[];       // 1..60
      totalMinutes: number;        // integer 1..1440
    };

    type ValidationResult =
      | { ok: true; value: ValidatedDraft }
      | { ok: false; error: ValidationError };

ValidationError 永遠只有 code、field、rowId 三欄，不帶原始值、stack、exception message 或其他欄位。row schema、descriptor 或 type validation 完成且第 5 階段 ID 格式/唯一性檢查通過前，rowId 一律為 null；結構或型別錯誤不可先讀取或回傳未驗證 ID。未知 key 不回傳其名稱，避免任意輸入流進 UI；unknown 欄位的 field 是 null。

### 排程結果型別

    type ScheduledRow = {
      id: string;
      name: string;
      durationMinutes: number;
      note: string;
      startAbsoluteMinute: number;
      endAbsoluteMinute: number;
      startMinuteOfDay: number;    // absolute % 1440
      endMinuteOfDay: number;
      startDayOffset: 0 | 1;        // floor(absolute / 1440)
      endDayOffset: 0 | 1;
    };

    type TargetComparison = {
      targetAbsoluteMinute: number;
      targetMinuteOfDay: number;
      targetDayOffset: 0 | 1;
      differenceMinutes: number;   // targetAbsoluteMinute - endAbsoluteMinute
      relation: "early" | "on-time" | "late";
    };

    type Schedule = {
      startMinuteOfDay: number;
      totalMinutes: number;
      endAbsoluteMinute: number;
      endMinuteOfDay: number;
      endDayOffset: 0 | 1;
      rows: ScheduledRow[];
      targetComparison: TargetComparison | null;
    };

上述 key 精確如列；不把原始輸入、語系、build 資訊或日期混入 schedule。day offset 1 必須顯示「次日／next day」標記。絕對分鐘不能超過 2879（開始 23:59 加 1440 分鐘），不會產生 day offset 2。

## 純函式契約

以下函式放在 public/js/core/，只接受純值，不讀寫 DOM、時間、runtime locale、network、storage 或全域可變狀態。函式名、輸入輸出形狀和錯誤碼不可自行替換：

    parseClock(raw: unknown):
      { ok: true; minuteOfDay: number }
      | { ok: false; code: "TIME_FORMAT" };

    parseDuration(raw: unknown):
      { ok: true; minutes: number }
      | { ok: false; code: "DURATION_FORMAT" | "DURATION_RANGE" };

    createInitialDraft(): Draft;
    // 空時間、無目標、targetNextDay=false、一列 row-1 空白列

    validateDraft(input: unknown): ValidationResult;
    // 固定第一錯誤優先序見 PRODUCT.md

    calculateSchedule(input: ValidatedDraft): Schedule;
    // 僅接收 validateDraft 成功值；純整數運算

    formatClock(minuteOfDay: number): string;
    // precondition: safe integer 0..1439；輸出 ASCII HH:MM

    formatScheduleClock(absoluteMinute: number, locale: "zh-Hant" | "en"): string;
    // precondition: safe integer 0..2879；day 1 加本地化次日標記

    formatTargetClock(target: NormalizedTarget, locale: "zh-Hant" | "en"): string;
    // 明確顯示「當日／次日」或「same day／next day」

    formatPlainTextReport(schedule: Schedule, locale: "zh-Hant" | "en"): string;
    // 固定 LF，無末尾 LF，無 BOM

    encodeUtf8Report(report: string): Uint8Array;
    // TextEncoder UTF-8，不增加 BOM 或 LF

時間字串解析不得依賴 Date、Intl、系統時區或寬鬆 parser。parseClock 僅對下列 ASCII grammar 成功，分鐘值為 hour*60+minute：

    ^(?:[01][0-9]|2[0-3]):[0-5][0-9]$

parseDuration 先要求全為 ASCII [0-9]，移除前導零後以十進位字串比較 1–720，不可先把任意長度輸入轉為浮點數；"0005" 得 5，"0" 得 DURATION_RANGE，空字串或非 ASCII 數字得 DURATION_FORMAT。原始字串大於 256 由 validateDraft 先回報 RAW_TEXT_TOO_LONG。

calculateSchedule 從開始分鐘起依列順序累加。每列先保存 absolute 起訖分鐘，再分別取 modulo 1440 和 floor 除 1440。目標差異為 targetAbsoluteMinute - endAbsoluteMinute，正、零、負分別映射 early、on-time、late。所有分鐘運算都是整數。

純文字報告欄位順序固定：標題、開始時間、逐列一行、該列非空備註的下一行、總分鐘、結束時間，有目標時才輸出目標和差異。每個 dayOffset 1 的列時刻加次日標記；目標永遠標明當日或次日。繁中和英文標籤不得混用。精確文字 oracle 見 ACCEPTANCE.md。encodeUtf8Report 只編碼傳入報告，不加 BOM 或自動換行。

## 計算 oracle

- 09:00 → 540。
- 開場 10、討論 35、休息 10 分鐘：最後 absolute end 595，結束 09:55，總長 55；同日目標 10:00 是 absolute 600、difference +5、relation early。
- 23:40 → 1420；30+20 分鐘後 absolute end 1470，時刻 00:30、endDayOffset 1。
- 開始 09:00、同日目標 09:00 無效；選次日後 absolute target 是 1980。
- 開始 00:00，兩列各 720 分鐘，總長 1440，最後 absolute end 1440，顯示 00:00（次日）。
- 全程 1441 分鐘拒絕，不裁切列、不回繞、不顯示第三日。完全不使用 Date。

## 介面 state 與非同步邊界

public/js/app.js 的記憶體 state 精確含目前 draft、已提交 schedule/report、遞增 revision、pageGeneration、遞增 clipboardRequestId、目前待處理 clipboard request id、首個 ValidationError、固定 notice code，以及最多八筆帶延遲撤銷時間的 download URL。這些欄位只存在 module memory 及目前 DOM，不序列化、不掛在 window 全域。

| 事件 | 同步 state 轉換 |
|---|---|
| 初始載入 | createInitialDraft()；無 schedule/report/error；copy/download disabled |
| 修改欄位 | revision +1；使 clipboard pending request 失效；清除 schedule/report/error/success；copy/download disabled；更新 draft。舊 callback 之後一律 no-op |
| 新增、移除、上移、下移 | 同欄位修改；保留唯一 ID；不計算 |
| 提交有效草稿 | 驗證後同步計算，只提交該 revision 的 schedule/report |
| 提交無效草稿 | 先清舊結果；保留 draft；顯示首個固定錯誤並聚焦對應控制 |
| IME composing 時提交 | 阻止計算；顯示固定 composing notice；不提交結果 |
| 複製 | click activation 內立即呼叫 navigator.clipboard.writeText(report)；建立單調遞增 requestId，記下 revision 和 pageGeneration；標記 pending，停用重複複製 |
| Clipboard resolve/reject/finally | 每一種 promise callback 都必須同時比對啟動時的 revision、requestId、pageGeneration 與目前 pending request；只有全相同才可更新 notice 或 pending。任何過期 callback 都不得改變任何 state 或 DOM，包括 pending、notice、result、按鈕狀態或 focus |
| 下載 | 僅當前有效 schedule 存在時建立獨立 Blob URL 並以固定檔名觸發下載；每個 URL 建立後 60 秒延遲撤銷，不因新結果或後續下載立刻撤銷舊 URL；同時最多保留八個尚未撤銷 URL |
| 下載 URL 達上限 | 暫時停用下載並顯示固定等待提示；最早的 URL 到期撤銷後重新啟用。不得為了建立新 URL 提前撤銷既有下載 URL |
| 清除取消 | state 完全不變 |
| 清除確認 | revision +1，使 clipboard pending request 失效，清除可見結果並回到 createInitialDraft()；已觸發下載的 URL 保留到各自 60 秒期限，不能因清除而提前 revoke |
| pagehide | revision +1 且 pageGeneration +1；同步清空每個表單控制及結果文字、schedule/report/rows/error/notices，disable copy/download，取消 URL timers 並立即撤銷所有仍保留的 URL |
| pageshow 且 event.persisted | 再次 idempotent reset 成一列空白初始草稿 |
| 語言連結 | 有內容先 window.confirm；取消不導航，確認後導向另一個本機語言頁 `/index.html` 或 `/en/index.html`；pagehide 清空 |

Clipboard 寫入開始後，瀏覽器不提供撤回已完成剪貼簿副作用的方法。使用者在 promise 完成前編輯、建立新結果、啟動另一筆複製或離頁時，舊 request 的 resolve、reject 和 finally 都只能檢查 token 後 no-op，不能清除新 request 的 pending 或更動任何新 state；程式不重試、不再次寫入。pagehide 改變 pageGeneration，令所有舊 callback 失效。M1 記錄這項限制，不聲稱可中止瀏覽器已接受的 clipboard action。

計算核心不含 await、timer、worker 或 network。最多 60 列的計算同步完成。原生 confirm() 是同步確認；不替換成自製對話框。

## DOM、下載和資源安全

- 使用者字串只能透過 textContent、value 或 textarea.value 顯示。禁止 innerHTML、insertAdjacentHTML、eval、Function、動態 module import 或 HTML parser。
- 列 DOM 透過 createElement 與固定屬性建立；控制 ID 是固定程式碼前綴加經驗證 ASCII row id。輸入文字不得進入 selector、URL、attribute name 或 element name。
- 唯讀 report 是可鍵盤選取文字區，有可辨識標籤。下載用 Blob 的 text/plain;charset=utf-8 及固定 download="glossquote-event-timeline.txt"。每個使用者明確觸發的下載 URL 在建立後延遲 60 秒撤銷，最多八筆同時存活；新結果、編輯和重複下載都不會立刻撤銷先前 URL。到達八筆上限時暫時停用下載，待最早 URL 正常到期後恢復。pagehide 取消 timers 並立即撤銷所有 URL。不上傳、不預覽遠端、不自動保存下載。
- Clipboard 只在明確 click event 讀取目前 report；不呼叫 document.execCommand("copy")。API 不存在、權限拒絕或非 secure context 時保留手動選取路徑。
- 不需要圖片、外部字型或圖示資產。初始頁無外部 script/style/img/iframe/font/preconnect/DNS-prefetch。

## 網路、資料生命週期與 preview

- app 不以 Fetch/XHR/Beacon/WebSocket/EventSource、表單提交、Service Worker、Web Worker、Cache/Storage API 或 URL/history state 傳送或保存輸入。
- 頁面載入需要從靜態伺服器取得 HTML/CSS/JS；互動時不產生網路呼叫。已載入頁面在 DevTools 切 offline 後可繼續計算；不保證首次離線載入或重新整理，因為本版沒有 Service Worker。
- pagehide 只清 DOM、JS state 和 object URL；不阻止離頁、不寫 beforeunload 訊息，也不保存復原資料。
- M1 preview 一律 noindex，沒有 production canonical、hreflang、JSON-LD、sitemap 或可索引 robots。M2 production candidate 才以核對過的正式 URL 輸出 production SEO/header。

## 本機伺服器與 Cloudflare 靜態輸出

- scripts/serve.mjs 使用 Node built-in node:http；root 限定 public/，host 固定 127.0.0.1，預設 port 4205。不能改為 wildcard host，不列目錄。
- M1 scripts/build.mjs 不用依賴，只重建 preview `dist/`；本機兩頁仍有對應語言的 title/description，但內含 noindex，且不含 production canonical/hreflang、Open Graph 或 JSON-LD。主代理明確放行 M2 後，原功能對話再加 production commands，以固定 origin `https://agenda.glossquote.com` 產生獨立 `dist-production/`；正式 URL 僅為 `/index.html` 和 `/en/index.html`，hreflang `zh-Hant`、`en`、`x-default`（指向繁中頁）。M2 對應頁保留正確 title/description，並產生 Open Graph tags、WebApplication JSON-LD、robots、sitemap 和 `_headers`。
- M2 原功能對話建立正式 local preview command 綁定 `127.0.0.1:5205`，且只提供 `dist-production/`。wrangler.jsonc 的正式 Worker 名稱是 glossquote-event-timeline，static assets directory 是 `./dist-production`，未知路徑必須使用真正 404-page 行為。M1 只檢查本機 preview，不建立 production config、登入或部署；M2 原功能對話發布固定 ZIP，M3 主代理部署。

production build 的建置程序、精確 SEO URL、preview 規則和 HTTP header 見 UX-SEO.md。production 404 必須 HTTP 404，不可把未知路徑回 200；頁面含兩種語言的簡短說明和安全導覽。

## production header policy

M1 不實作 production build template。主代理明確放行 M2 後，原功能對話建立正式候選並產生 public source ZIP；M3 部署由主代理執行。下列 Cloudflare static _headers 是 production candidate 的閉合 allowlist；每個語言頁的 script-src 只額外含該頁固定 JSON-LD bytes 的精確 SHA-256 hash；新增其他來源先由主代理審查：

    /*
      X-Content-Type-Options: nosniff
      Referrer-Policy: no-referrer
      Permissions-Policy: camera=(), microphone=(), geolocation=(), clipboard-write=(self)
      X-Frame-Options: DENY
      X-Robots-Tag: index, follow
      Content-Security-Policy: default-src 'none'; script-src 'self' 'sha256-EXACT_PAGE_JSON_LD_HASH'; style-src 'self'; img-src 'self'; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; media-src 'none'; worker-src 'none'; manifest-src 'none'

`EXACT_PAGE_JSON_LD_HASH` 是佔位說明，不可原樣送出；M2 build 必須針對每個固定 JSON-LD script text 精確計算 SHA-256 Base64 並置於對應頁的 CSP。JSON-LD 不含使用者輸入；不得出現其他 inline script/style。Preview response 用 X-Robots-Tag: noindex, nofollow 並覆蓋 production directive，且不放 JSON-LD hash。404 response 用 X-Robots-Tag: noindex, nofollow。不加 unsafe-inline、unsafe-eval、data: 或 wildcard source。若 Workers _headers 不套用到 Worker 產生的 response，M3 主代理需實測並設定 404 headers；不能只檢查 source 就宣稱線上通過。

## 官方參考

連結用於確認 API 契約，不代表所有瀏覽器都有相同支援；實作任務依需要重看並測試實際能力。

- [WHATWG HTML Living Standard：pagehide/pageshow 與 PageTransitionEvent](https://html.spec.whatwg.org/multipage/nav-history-apis.html)
- [W3C Clipboard API：Clipboard.writeText](https://w3c.github.io/clipboard-apis/#dom-clipboard-writetext)
- [W3C UI Events：composition events](https://w3c.github.io/uievents/#events-compositionevents)
- [W3C Content Security Policy Level 3](https://www.w3.org/TR/CSP3/)
- [Node.js 24 Test Runner](https://nodejs.org/docs/latest-v24.x/api/test.html)
- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare Workers static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Google Search Central：localized versions 和 x-default](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [RFC 9309：Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309.html)
- 主代理提供的 [BRAND](docs/BRAND.md)、[ENGINEERING](docs/ENGINEERING.md)、[PRIVACY-SECURITY](docs/PRIVACY-SECURITY.md)、[DESIGN-SYSTEM](docs/DESIGN-SYSTEM.md)、[RELEASE](docs/RELEASE.md) 規則。


---

## 原文件 UX-SEO.md

# UX 與雙語 SEO 規格

> 規格狀態：M0 設計與文案規格，尚未建置、渲染或測試。介面語意、對比、鍵盤和實際裝置支援均待 M1/M2 驗收。

## 模式與設計方向

採 Gloss Tools 的 Product App 模式。主體是使用者正在排的活動順序和結果；不放通用 SaaS 導覽、登入列、dashboard 卡片、AI 對話或裝飾型 hero。

唯一醒目的產品手勢是沿活動順序延伸的細時間軸線。起訖時間貼近所屬活動列，次日標記直接貼在跨日時刻旁。這條線表示真實先後關係，不用假資料或抽象插圖。文字左對齊；時間使用等寬字，名稱和說明使用 UI 字體。

保留家族色彩語意，避免把所有特色同時堆在畫面上：

| 名稱 | 色碼 | 用途 |
|---|---|---|
| Paper | #F3F0E8 | 工作頁背景 |
| Ink | #111410 | 主要文字和標題 |
| Surface | #FFFFFF | 表單和報告可讀區 |
| Acid | #C8F56A | 唯一主要行動及安全的完成狀態；文字用 Ink |
| Muted text | #55594F | 次要說明，仍須通過對比 |
| Control border | #60645C | 輸入和必要控制邊界 |

以上是共用語意 token，不是新定義的家族色彩。提醒和錯誤使用共用語意色、圖示及文字；珊瑚不作小字。Product App 用平面表面、精準分隔和有限圓角，不用 marketing offset shadow、漸層、外部字型或無關插圖。字體採系統 fallback：UI 為 Geist、Segoe UI、system-ui、sans-serif；時間為 Geist Mono、Cascadia Mono、ui-monospace、monospace。不得下載或遠端載入字體。

## 桌面與手機線框

寬螢幕讓流程和結果共用主欄；不設空側欄。結果尚未產生時只顯示真實空狀態和下一步。

    ┌──────────────────── Gloss Tools / 活動時間表 ─────────── 語言 ┐
    │ 把活動順序排成時間表                                         │
    │ 開始時間 [09:00]   目標結束時間 [10:00] [ ] 目標在次日       │
    │ 活動流程                                                      │
    │ 09:00  ─ [活動名稱____________] [分鐘] [備註__________]       │
    │        ─ [上移] [下移] [移除此活動]                           │
    │ 09:10  ─ [活動名稱____________] [分鐘] [備註__________]       │
    │        ─ [上移] [下移] [移除此活動]                           │
    │ [新增活動]                                                    │
    │ [清除全部]                               [排出時間表]         │
    │                                                              │
    │ 結果（提交後出現）：逐列起訖 / 合計 / 結束 / 目標差異         │
    │ 唯讀文字報告                 [複製報告] [下載 TXT]             │
    │ 說明與 FAQ                                                      │
    └──────────────────────────────────────────────────────────────┘

320 CSS px 手機先顯示開始時間和活動列；每列欄位可換行，排序和刪除按鈕仍有文字與觸控目標。主要按鈕在欄位之後，結果跟在按鈕之後。

    ┌ 活動時間表                         語言 ┐
    │ 開始時間                              │
    │ [09:00___________________________]     │
    │ 目標結束時間                          │
    │ [10:00___________________________]     │
    │ [ ] 目標在次日                       │
    │ 活動 1                                 │
    │ 名稱 [___________________________]     │
    │ 分鐘 [__]   備註 [________________]   │
    │ [上移] [下移] [移除此活動]             │
    │ [+ 新增活動]                           │
    │ [清除全部]                             │
    │ [排出時間表]                           │
    │ 結果、報告、複製／下載                 │
    └───────────────────────────────────────┘

## 控制與鍵盤行為

- 每個 input 有常駐可見 label；placeholder 只能舉例，不能取代 label。時間範例為 09:00，使用 24 小時 ASCII 數字。時間欄位使用文字輸入，不使用可能因 locale 改寫格式的原生 time control；core 嚴格驗證實際內容。時長欄位用 numeric inputmode，解析仍只接受 ASCII。
- IME 組字期間不宣告每個中間拼字錯誤；所有輸入仍立即撤銷舊結果。組字尚未結束時點主要按鈕，阻止提交並說明完成輸入後再排程。
- 鍵盤次序依畫面：開始、目標、次日、每列名稱／分鐘／備註／上移／下移／刪除、新增、清除、排程、結果和報告動作。停用控制保留可見的 disabled 樣式與原因。
- 上移／下移用原生按鈕，至少 44×44 CSS px 觸控區，名稱含目標列序。操作後焦點仍在同一活動列的排序按鈕，並以一次 aria-live 訊息告知新位置。首列上移、末列下移和最後一列刪除會停用。
- 列表不依賴拖曳。即使未來增添拖曳，也不能取代鍵盤和單指按鈕。
- 每次欄位變更、增刪或排序都同步清空舊結果並停用複製／下載。結果區只在成功提交後顯示。
- 首個欄位錯誤以 aria-describedby 關聯欄位，不只靠顏色。提交失敗時只在有助修正時把焦點移到第一個錯誤欄位。
- 動態結果使用適當 status/aria-live；成功只公告一次，不逐列中斷螢幕閱讀器。計算同步完成，沒有 spinner。
- 60 列時所有列可順序操作；頁面可垂直捲動，不能在窄手機製造水平頁面捲動。
- 按鈕有 default、hover、pressed、visible focus、disabled 狀態；focus indicator 在 paper、white、acid 和 ink 背景均清楚可見。普通文字對比至少 4.5:1，控制邊界和非文字狀態至少 3:1。資訊不靠顏色單獨傳達。
- 200% 縮放、320 CSS px、長 40% 翻譯、手機安全區和虛擬鍵盤下仍能看到焦點和主要動作。保留自然重排與垂直捲動，不把核心控制藏進 icon 或橫向捲動區。
- 尊重 prefers-reduced-motion。本工具不需要非使用者觸發動畫；按下回饋遵守共用 120–180ms 範圍且位移不超過 4px。

## 狀態與固定介面文案

繁中和英文頁面都要逐項對照實作，狀態文案不得露出錯誤原文或堆疊。每種錯誤都要有同等意思的完整雙語文案。

| 狀態 | 繁體中文 | English |
|---|---|---|
| 頁面標題 | 把活動流程排成看得懂的時間表 | Turn an event plan into a clear timeline |
| 空白初始 | 輸入開始時間，再填寫至少一段活動。 | Add a start time and at least one activity. |
| 主要行動 | 排出時間表 | Build timeline |
| 排程成功 | 時間表已排出。編輯任何欄位會清除此結果。 | Timeline built. Editing any field clears this result. |
| 名稱空白 | 請輸入這段活動的名稱。 | Enter a name for this activity. |
| 名稱過長 | 名稱修剪後最多 80 個 UTF-16 code units。 | The trimmed name can contain up to 80 UTF-16 code units. |
| 時長格式 | 請輸入 ASCII 整數分鐘，例如 35。 | Enter whole minutes using ASCII digits, such as 35. |
| 時長範圍 | 每段時長必須是 1 到 720 分鐘。 | Each activity must be 1 to 720 minutes. |
| 同日目標錯誤 | 同日目標必須晚於開始時間；若要排到次日，請勾選「目標在次日」。 | A same-day target must be later than the start. Select “Target is the next day” if needed. |
| 次日無目標 | 請先輸入目標結束時間。 | Enter a target end time first. |
| 總長超限 | 全程最多 1440 分鐘；請縮短或移除活動。 | The timeline can be at most 1440 minutes. Shorten or remove an activity. |
| composing | 請完成輸入法組字後再排出時間表。 | Finish composing the text before building the timeline. |
| 成功複製 | 已複製文字報告。 | Report copied. |
| 複製不可用 | 無法一鍵複製；請選取下方報告再複製。 | One-click copy is unavailable. Select the report below to copy it. |
| 取消清除 | 已保留目前草稿。 | Your current draft is unchanged. |

目標比較需用完整文字呈現，例如「提早 5 分鐘」、「準時」或「超時 5 分鐘」／“5 minutes early”, “On time”, “5 minutes late”。次日時刻明寫「次日」／“next day”。按鈕說明動作結果，不使用「OK」、「提交」或只有 icon。

## 清除確認與錯誤文案

有欄位內容或已排結果時，使用原生確認：

- 繁中：清除目前時間表？所有欄位和結果都會清空。
- English: Clear this timeline? All fields and results will be cleared.

取消會完整保留。語言切換有資料時使用同一確認，並說明將前往另一語言且清除目前時間表；取消留在原頁。確認和取消只用原生 dialog，不另建自製對話框。

錯誤說明問題、修正路徑和目前安全狀態。剪貼簿失敗時 report 保持可選取；不支援的瀏覽器功能不會觸發上傳或自動重試。頁面初次載入、離線重載或原生 API 無法使用時，使用明確文字提供安全出口，不宣稱支援所有瀏覽器。

## SEO 欄位與頁面文案

繁中頁位於 `/index.html`，`<html lang="zh-Hant">`；英文頁位於 `/en/index.html`，`<html lang="en">`。沒有語言選擇頁。兩頁以可見文字連結互相切換；若目前頁有草稿或結果，先用原生確認說明離頁會清除資料，取消則保留本頁。切換後目標頁從空白初始狀態開始，不保證草稿保留。路徑不帶任何排程輸入。繁中 Gloss Tools 首頁連結固定為 `https://glossquote.com/index.html`，英文為 `https://glossquote.com/en/index.html`，符合 `docs/BRAND.md`。

### 繁體中文頁面

- Title：GlossQuote 活動時間表｜安排活動流程與結束時間
- Description：輸入開始時間與每段活動分鐘數，排出逐段起訖、跨午夜標記和目標結束時間差。活動資料只留在目前頁面記憶體。
- H1：把每一段流程排成看得懂的時間表
- 說明：填入開始時間、活動名稱和分鐘數，然後排出時間表。需要和目標結束時間比較時，輸入目標並說明它是否在次日。
- 首屏主要工作區先呈現開始時間、可選目標和活動列，不另造 hero 或虛構範例紀錄。
- FAQ：
  1. 問：這裡會保存我的時間表嗎？答：不會。欄位和結果只留在目前頁面記憶體；離開頁面會清除。
  2. 問：流程跨過午夜會怎麼顯示？答：跨日後的時刻會標示「次日」。工具不需要日期、時區或夏令時間。
  3. 問：沒有目標結束時間也能排程嗎？答：可以；留白並取消「目標在次日」，結果不會顯示提早或超時比較。
  4. 問：每段活動可以多長？答：每段 1 到 720 分鐘，全流程最多 1440 分鐘，最多 60 段。

### English page

- Title: GlossQuote Event Timeline | Plan an Event Schedule
- Description: Add a start time and activity durations to see each start and end, next-day markers, and the difference from an optional target. Data stays in this page’s memory.
- H1: Turn an event plan into a clear timeline
- Intro: Enter the start time, activity names, and whole-minute durations, then build the timeline. For a target end time, state whether it falls on the next day.
- Keep the start, optional target, and activity rows in the first view. Do not replace them with a generic hero or sample records.
- FAQ:
  1. Q: Is my timeline saved? A: No. Inputs and results stay in this page’s memory and are cleared when you leave.
  2. Q: What happens when the schedule passes midnight? A: Times after midnight are marked “next day.” No calendar date, time zone, or daylight-saving rules are used.
  3. Q: Can I build a timeline without a target end time? A: Yes. Leave it blank and keep “Target is the next day” unchecked; no early/late comparison is shown.
  4. Q: How long can each activity be? A: Each activity can be 1 to 720 minutes. The full timeline is limited to 1440 minutes and 60 activities.

兩個語言頁都提供明確的語言切換連結及返回同語言 Gloss Tools 首頁的連結；不另設語言選擇頁。不得虛構使用者、節省時間、排名、評價、瀏覽器相容性、100% 安全或永久免費等宣稱。不放未經需求支持的 tracking 或遠端影像；FAQ 不加結構化資料。

## Preview 與 production SEO 閘門

### M1 preview

- `/index.html`、`/en/index.html` 及 preview 404 都有 noindex,nofollow；preview robots 禁止索引，沒有 production canonical/hreflang、production sitemap 或可索引 robots。
- 本機命令只產生 preview。preview 手動驗收不能宣稱 production SEO 已發布。

### M2 production candidate

- 只有主代理明確通過 M1 後，原功能對話才建立 production 工具鏈和 production candidate。固定 origin 為 `https://agenda.glossquote.com`；M1 `dist/` preview 與 M2 `dist-production/` 完全分開，production build 不覆寫 preview。
- `/index.html` canonical 指向 `https://agenda.glossquote.com/index.html`；`/en/index.html` canonical 指向 `https://agenda.glossquote.com/en/index.html`。
- Production Open Graph title/description/locale 對應該語言，og:url 等於該頁 canonical，og:type=website；不提供虛構預覽圖。
- 兩個語言頁互相列出 `hreflang="zh-Hant"` 和 `hreflang="en"`，並共同列出 `hreflang="x-default"` 指向繁中 `https://agenda.glossquote.com/index.html`。不存在獨立語言選擇頁。
- robots.txt 只允許 production 頁並列 production sitemap URL。sitemap 只包含兩個 canonical 絕對網址，不含 localhost、query、hash、fixtures 或其他產品。
- 404 回 HTTP 404 且 noindex；未知路徑不可 fallback 成 200 app。
- 對兩頁實際檢查 title、description、H1、lang、canonical、互相一致 hreflang、繁中 x-default、robots、sitemap、404 status 及品牌首頁語言連結。

## Production HTTP security headers

M2 確認 Cloudflare Static Assets 的實際行為後再部署閉合政策。預設建議：

    /*
      X-Content-Type-Options: nosniff
      Referrer-Policy: no-referrer
      Permissions-Policy: camera=(), microphone=(), geolocation=(), clipboard-write=(self)
      X-Frame-Options: DENY
      X-Robots-Tag: index, follow
      Content-Security-Policy: default-src 'none'; script-src 'self' 'sha256-EXACT_PAGE_JSON_LD_HASH'; style-src 'self'; img-src 'self'; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; media-src 'none'; worker-src 'none'; manifest-src 'none'

production 只有固定 WebApplication JSON-LD 區塊可用其逐頁精確 SHA-256 hash 通過 script-src；hash 必須由該頁實際 JSON-LD bytes 計算。其他 inline script/style、data URI、外部 font、connect-src 或 wildcard 均禁止。preview 以 noindex header 覆蓋 production 指令且不輸出 JSON-LD hash；404 使用 noindex。若需要新增來源，主代理先做範圍審查，原功能對話不可自行放寬 CSP。

## M2 與 M3 責任

M1 原功能對話只做本機實作和本機驗收，不登入或呼叫 GitHub/Cloudflare，不發布或部署。主代理完成獨立 M1 驗收並明確放行後，M2 原功能對話建立 production 工具鏈及 `dist-production/` candidate、跑 production gates，並用固定 ZIP 流程發布 public repo；M2 停在來源發布與可核對 candidate，不呼叫 Cloudflare、不部署、不更新首頁。M3 工具和共用首頁部署、線上雙語確認由主代理負責。


---

## 原文件 ACCEPTANCE.md

# 驗收規格：核心 oracle 與瀏覽器案例

> 狀態：M0 預期值，尚未執行。每項狀態目前均為 NOT_RUN；此文件不代表產品、瀏覽器或裝置已通過驗收。

## 範圍與記錄方式

核心測試針對 TECHNICAL.md 所列純函式，以 Node.js 24 內建 node:test 離線執行。測試預期值必須由此文件固定，不可呼叫被測函式生成 expected。每個無效 validateDraft 輸出必須精確等於 E(code, field, rowId)，物件不可有其他鍵：

    E(code, field, rowId) = { code, field, rowId }

欄位路徑原樣使用 startTimeRaw、targetTimeRaw、targetNextDay、rows、rows[].id、rows[].nameRaw、rows[].durationMinutesRaw、rows[].noteRaw；未知欄位使用 field=null。對尚未安全驗證的 ID 使用 rowId=null。

測試簡寫只用於本文件，展開後仍是精確 schema：
- D(start, target, next, rows) = 普通物件 { startTimeRaw:start, targetTimeRaw:target, targetNextDay:next, rows:rows }，恰有這四個 own enumerable data properties。
- R(id, name, duration, note) = 普通物件 { id:id, nameRaw:name, durationMinutesRaw:duration, noteRaw:note }，恰有這四個 own enumerable data properties。
- validRows(n) = 長度 n 的 dense array；第 i 列為 R("r"+i,"A","1","")，i 從 1 開始。
- x.repeat(n) 表示含 n 個 UTF-16 code unit 的 ASCII x 字串；emoji.repeat(n) 表示含 n 個合法 emoji surrogate pair 的字串，UTF-16 長度為 2n。
- 除非案例另有說明，所有 D 都用 start="09:00"、target=""、next=false、rows=[R("r1","A","1","")]。

任何修正都需重跑受影響的核心案例和必要最終 gates；不可把 mock、靜態掃描、期望文字或模擬器說成真機／原生瀏覽器驗收。沒有可用能力的案例記 NOT_RUN，說明限制和影響，不可省略或冒稱通過。

## 核心精確案例

### 時間與分鐘解析

| ID | 純函式與輸入 | 精確預期 |
|---|---|---|
| C01 | parseClock("00:00") | { ok:true, minuteOfDay:0 } |
| C02 | parseClock("23:59") | { ok:true, minuteOfDay:1439 } |
| C03 | parseClock("09:00") | { ok:true, minuteOfDay:540 } |
| C04 | parseClock("9:00") | { ok:false, code:"TIME_FORMAT" } |
| C05 | parseClock("24:00") | { ok:false, code:"TIME_FORMAT" } |
| C06 | parseClock("０９:００") | { ok:false, code:"TIME_FORMAT" } |
| C07 | parseClock("09：00") | { ok:false, code:"TIME_FORMAT" } |
| C08 | parseClock("09:00 ") | { ok:false, code:"TIME_FORMAT" } |
| C09 | parseDuration("0005") | { ok:true, minutes:5 } |
| C10 | parseDuration("720") | { ok:true, minutes:720 } |
| C11 | parseDuration("") | { ok:false, code:"DURATION_FORMAT" } |
| C12 | parseDuration("+5") | { ok:false, code:"DURATION_FORMAT" } |
| C13 | parseDuration("3.5") | { ok:false, code:"DURATION_FORMAT" } |
| C14 | parseDuration("５") | { ok:false, code:"DURATION_FORMAT" } |
| C15 | parseDuration("0") | { ok:false, code:"DURATION_RANGE" } |
| C16 | parseDuration("721") | { ok:false, code:"DURATION_RANGE" } |

### Draft 驗證與時間計算

| ID | 輸入 | 精確預期 |
|---|---|---|
| C17 | createInitialDraft() | 精確為 D("","",false,[R("row-1","","","")])；各列 key 和 root key 不多不少。 |
| C18 | D("09:00","10:00",false,[R("r1"," 開場 ","10",""),R("r2","討論","35",""),R("r3","休息","10","")]) | validateDraft 成功；startMinuteOfDay=540，target={minuteOfDay:600,dayOffset:0,absoluteMinute:600}，三個 name 分別為「開場」「討論」「休息」，durationMinutes 為 10、35、10，note 均為空，totalMinutes=55。 |
| C19 | 將 C18 成功值送入 calculateSchedule | 精確 rows：r1 start/end absolute 540/550、minuteOfDay 540/550、dayOffset 0/0；r2 550/585、minuteOfDay 550/585、dayOffset 0/0；r3 585/595、minuteOfDay 585/595、dayOffset 0/0。totalMinutes=55、endAbsoluteMinute=595、endMinuteOfDay=595、endDayOffset=0；targetComparison={targetAbsoluteMinute:600,targetMinuteOfDay:600,targetDayOffset:0,differenceMinutes:5,relation:"early"}。 |
| C20 | D("23:40","",false,[R("r1","A","30",""),R("r2","B","20","")]) | 成功；totalMinutes=50，rows absolute 為 1420→1450、1450→1470；第一列結束為 minuteOfDay=10/dayOffset=1，第二列開始為 10/1、結束為 30/1；schedule endAbsoluteMinute=1470、endMinuteOfDay=30、endDayOffset=1，targetComparison=null。 |
| C21 | D("00:00","",false,[R("r1","A","720",""),R("r2","B","720","")]) | 成功；totalMinutes=1440，endAbsoluteMinute=1440、endMinuteOfDay=0、endDayOffset=1；結束顯示 00:00（次日）。 |
| C22 | D("00:00","",false,[R("r1","A","720",""),R("r2","B","720",""),R("r3","C","1","")]) | E("TOTAL_DURATION_EXCEEDED",null,null)。 |
| C23 | D("09:00","",false,[R("r1","A","1","")]) | 成功且 target=null、targetComparison=null；不得顯示提早或超時。 |
| C24 | D("09:00","09:00",false,[R("r1","A","1","")]) | E("TARGET_NOT_AFTER_START","targetTimeRaw",null)。 |
| C25 | D("09:00","08:59",false,[R("r1","A","1","")]) | E("TARGET_NOT_AFTER_START","targetTimeRaw",null)。 |
| C26 | D("09:00","",true,[R("r1","A","1","")]) | E("TARGET_NEXT_DAY_WITHOUT_TARGET","targetNextDay",null)。 |
| C27 | D("09:00","09:00",true,[R("r1","A","1","")]) | 成功；target={minuteOfDay:540,dayOffset:1,absoluteMinute:1980}；同一 clock 次日合法。 |
| C28 | D("09:00","10:00",false,[]) | E("ROW_COUNT","rows",null)。 |
| C29 | D("09:00","",false,validRows(61)) | E("ROW_COUNT","rows",null)。 |
| C30 | D("9:00","24:00",false,[R("r1","","0","")]) | E("TIME_FORMAT","startTimeRaw",null)。同時存在多個錯誤時先回開始時間格式錯誤。 |
| C31 | D("09:00","24:00",false,[R("r1","A","0","")]) | E("TIME_FORMAT","targetTimeRaw",null)。目標格式錯誤先於列內容錯誤。 |
| C32 | D("09:00","",false,[R("r1","A","x",""),R("r2","","1","")]) | E("DURATION_FORMAT","rows[].durationMinutesRaw","r1")。依列索引先完成第一列欄位驗證。 |
| C33 | D("09:00","",false,[R("r1","A","0005","")]) | 成功，正規化時長為 5。 |
| C34 | D("09:00","",false,[R("r1","   ","1","")]) | E("NAME_REQUIRED","rows[].nameRaw","r1")。 |
| C35 | D("09:00","",false,[R("r1","x".repeat(80),"1","")]) | 成功；修剪後名稱 UTF-16 長度為 80。 |
| C36 | D("09:00","",false,[R("r1","x".repeat(81),"1","")]) | E("NAME_TOO_LONG","rows[].nameRaw","r1")。 |
| C37 | D("09:00","",false,[R("r1","x".repeat(257),"1","")]) | E("RAW_TEXT_TOO_LONG","rows[].nameRaw","r1")。raw limit 優先於 trimmed limit。 |
| C38 | D("09:00","",false,[R("r1","A","1","x".repeat(160))]) | 成功；修剪後 note UTF-16 長度為 160。 |
| C39 | D("09:00","",false,[R("r1","A","1","x".repeat(161))]) | E("NOTE_TOO_LONG","rows[].noteRaw","r1")。 |
| C40 | D("09:00","",false,[R("r1","A","1","x".repeat(257))]) | E("RAW_TEXT_TOO_LONG","rows[].noteRaw","r1")。 |
| C41 | D("09:00","",false,[R("r1","A","1","x\n")]) | E("CONTROL_CHARACTER","rows[].noteRaw","r1")。LF 不得進入報告。 |
| C42 | D("09:00","",false,[R("r1","A","1","x\u0085")]) | E("CONTROL_CHARACTER","rows[].noteRaw","r1")。U+0085 屬 Unicode Cc。 |
| C43 | D("09:00","",false,[R("r1","A","1","\uD800")]) | E("UNPAIRED_SURROGATE","rows[].noteRaw","r1")。 |
| C44 | D("09:00","",false,[R("r1","A","1","\uDC00")]) | E("UNPAIRED_SURROGATE","rows[].noteRaw","r1")。 |
| C45 | D("09:00","",false,[R("r1","A","1","😀")]) | 成功；合法 surrogate pair 可留在修剪後 note。 |
| C46 | D("09:00","",false,[R("r1","😀".repeat(40),"1","")]) | 成功；名稱長度精確為 80 UTF-16 code units。 |
| C47 | D("09:00","",false,[R("r1","😀".repeat(41),"1","")]) | E("NAME_TOO_LONG","rows[].nameRaw","r1")；名稱長度是 82 UTF-16 code units。 |

### Exact schema、安全與非突變

| ID | 輸入建構方式 | 精確預期 |
|---|---|---|
| C48 | 只在 root 多加 own enumerable data 欄位 debug=true | E("UNKNOWN_FIELD",null,null)。不得把未知 key 名稱帶入 error。 |
| C49 | 從 default D 刪除 targetNextDay own property | E("MISSING_FIELD","targetNextDay",null)。 |
| C50 | root 的 targetNextDay 由 own enumerable getter 提供；getter 只把外部 counter 加一 | E("INVALID_SCHEMA","targetNextDay",null)，counter 精確仍為 0。 |
| C51 | root 加一個 symbol own key | E("INVALID_SCHEMA",null,null)。 |
| C52 | root 的 startTimeRaw 改成 non-enumerable data property | E("INVALID_SCHEMA","startTimeRaw",null)。 |
| C53 | rows 是長度 1、索引 0 缺口的 sparse array | E("INVALID_SCHEMA","rows",null)。 |
| C54 | 第一列只多一個 own enumerable data 欄位 extra=true | E("UNKNOWN_FIELD",null,null)。row schema 尚未通過，ID 尚未驗證。 |
| C55 | 第一列 nameRaw 是 own enumerable getter，getter 有外部 counter | E("INVALID_SCHEMA","rows[].nameRaw",null)，counter 精確仍為 0。row ID 尚未驗證。 |
| C56 | 第一列 id="r/1" | E("INVALID_ROW_ID","rows[].id",null)。錯誤不得 echo 不合法 ID。 |
| C57 | 兩列都使用有效 id "r1" | E("DUPLICATE_ROW_ID","rows[].id","r1")。 |
| C58 | targetNextDay="false" | E("INVALID_FIELD_TYPE","targetNextDay",null)。 |
| C59 | durationMinutesRaw 數值 5 而非 string | E("INVALID_FIELD_TYPE","rows[].durationMinutesRaw",null)。row ID 尚未驗證。 |
| C60 | Object.create(null) 建立 root 和 row，並加入完全符合 schema 的資料 descriptors | 驗證成功；普通 null-prototype record 合法。 |
| C61 | 用 Object.freeze 凍結有效 root、rows、row 後呼叫 validateDraft | 驗證成功且所有輸入值、key、descriptor、rows 順序均不變；驗證不得 mutate 或 spread/重寫輸入。 |
| C62 | 初始 D("09:00","10:00",false,[R("r1","A","0","")])；再把 durationMinutesRaw 從 "0" 修正成 "60" | 初始驗證精確為 E("DURATION_RANGE","rows[].durationMinutesRaw","r1")；修正後成功，totalMinutes=60、endAbsoluteMinute=600、differenceMinutes=0、relation="on-time"。 |

### 純文字報告與下載 bytes

下列報告案例的 schedule 由 C18/C19 固定資料產生；呼叫 formatPlainTextReport 時 locale 分別傳 zh-Hant 和 en。每一列以 LF 分隔，不含末尾 LF，不含內部 row ID：

C63 繁中報告精確字串：

~~~text
GlossQuote 活動時間表
開始	09:00
01	09:00–09:10	開場	10 分鐘
02	09:10–09:45	討論	35 分鐘
03	09:45–09:55	休息	10 分鐘
總長	55 分鐘
結束	09:55
目標	10:00（當日）
差異	提早 5 分鐘
~~~

C64 使用另一個輸入 fixture：D("09:00","10:00",false,[R("r1","Opening","10",""),R("r2","Discussion","35",""),R("r3","Break","10","")])。以此英文名稱 fixture 產生 schedule，英文報告精確字串：

~~~text
GlossQuote Event Timeline
Start	09:00
01	09:00–09:10	Opening	10 min
02	09:10–09:45	Discussion	35 min
03	09:45–09:55	Break	10 min
Total	55 min
End	09:55
Target	10:00 (same day)
Difference	5 min early
~~~

C65 對 C63 的字串呼叫 encodeUtf8Report：bytes 精確等於 UTF-8 編碼後的 C63 字元序列；開頭不是 EF BB BF，最後一個 byte 不是 0A，byte length 等於該 UTF-8 字串長度。函式不可自行增加 CR、LF、BOM 或 metadata。

C66 Midnight report：輸入 D("23:40","",false,[R("r1","Talk","30",""),R("r2","Wrap","20","")])。繁中精確報告：

~~~text
GlossQuote 活動時間表
開始	23:40
01	23:40–00:10（次日）	Talk	30 分鐘
02	00:10（次日）–00:30（次日）	Wrap	20 分鐘
總長	50 分鐘
結束	00:30（次日）
~~~

英文精確報告：

~~~text
GlossQuote Event Timeline
Start	23:40
01	23:40–00:10 (next day)	Talk	30 min
02	00:10 (next day)–00:30 (next day)	Wrap	20 min
Total	50 min
End	00:30 (next day)
~~~

兩份字串都沒有目標行、日期、24:30 或末尾 LF。

## 瀏覽器驗收案例

以下均需分別記錄狀態、瀏覽器/版本、輸入法或裝置（適用時）、實際觀察和問題。Native API 只能在明確使用者手勢下實測。可用 test-only stub 驗證競態邏輯，但 stub 結果不得冒稱原生 Clipboard、下載、真機或完整 Network 測試。

| ID | 操作與可觀察通過條件 |
|---|---|
| B01 | 開啟 127.0.0.1:4205/index.html：繁中完整載入、lang=zh-Hant、主表單與 FAQ 可見；英文切換連結導向 /en/index.html。M1 頁面有 noindex，不含 production canonical/hreflang/JSON-LD。 |
| B02 | 開啟 /en/index.html：lang=en，所有操作、錯誤、報告、FAQ、回首頁連結均為英文；語言切換導回 /index.html。 |
| B03 | 按 Acceptance 範例輸入 09:00、開場 10、討論 35、休息 10、目標 10:00；提交後每列起訖為 09:00–09:10、09:10–09:45、09:45–09:55，合計 55、結束 09:55、提早 5 分鐘。兩種語言各做一次。 |
| B04 | 23:40 加 30 和 20 分鐘；輸出 00:10、00:30，所有跨日後時刻清楚顯示「次日」或 “next day”，合計 50。 |
| B05 | 同日目標等於或早於開始時拒絕提交並對欄位顯示精確修正提示；勾次日後同 clock 目標可提交。 |
| B06 | 目標空白時次日 checkbox disabled 且為 false；先選次日再清空目標時 UI 自動取消 checkbox。對不可信程式輸入 targetNextDay=true、targetTimeRaw="" 的 core error 仍為 TARGET_NEXT_DAY_WITHOUT_TARGET。 |
| B07 | 有效提交後修改任一欄、增列、刪列或重排；舊結果、成功提示與報告立即消失，複製／下載同一同步事件後 disabled。 |
| B08 | 只用鍵盤新增、移除、上移、下移；順序和時間一致，焦點留在操作後同一活動列，位置 aria-live 只公告一次；首列/末列/最後一列邊界 disabled。 |
| B09 | 建立 60 列時新增 disabled 且可理解原因；刪除回到 59 後恢復。最後一列不能移除；列數不造成水平溢位。 |
| B10 | 點「清除全部」且已有值或結果時選 Cancel，欄位、列序、結果、報告和語言狀態完全保留；再選 OK，回到一列空白初始狀態。空白初始時不彈確認。 |
| B11 | 有草稿時切換語言選 Cancel，仍在原頁且資料保留；再確認，另一頁完全空白。確認文字先明示離頁會清除，不得宣稱自動保存或切換保留。 |
| B12 | 用中文 IME 組字時不對中間拼字產生逐字錯誤；compositionend 前按 Build 被阻止並出現固定提示；完成組字後可依實際內容正常驗證。 |
| B13 | 完整鍵盤路徑可填時間、名稱、時長、備註、排序、新增、清除、Build、讀取結果、選取 report、複製和下載；所有焦點可見，無鍵盤陷阱。 |
| B14 | 螢幕閱讀器檢查所有 label、排序按鈕的列名與方向、欄位錯誤關聯、disabled 原因、成功狀態及結果順序；不得依賴顏色或 icon 單獨傳意。無真實 assistive technology 時標 NOT_RUN。 |
| B15 | 320 CSS px viewport 下檢查繁中和英文、60 列、錯誤、報告：document scrollWidth 不大於 viewport clientWidth，所有功能可垂直到達，沒有水平頁面捲動或裁切。 |
| B16 | 200% 瀏覽器縮放下完成一個行程並鍵盤移動；主要動作、焦點、錯誤和結果仍可看到並操作，不出現雙向捲動。 |
| B17 | 對兩語文案容器套用至少 40% 字元增長測試內容；label、錯誤、按鈕、次日標記和報告自然換行，不覆蓋、不裁切。此項是佈局壓力測試，不改正式文案。 |
| B18 | 真實手機檢查安全區、虛擬鍵盤遮擋、滾動、44×44 CSS px 控制、IME composition 和 320px 窄寬；只有模擬器時分開記錄，不宣稱真機通過。 |
| B19 | 明確點「複製報告」測試原生 Clipboard API：成功時剪貼簿內容精確等於目前報告並顯示成功；拒絕或不支援時保留可選取 report 並顯示 fallback。不得讀取原有剪貼簿。API/權限不可用時原生成功案例記 NOT_RUN，另記 fallback 實測。 |
| B20 | 用 test-only delayed promise 先發 request A，編輯並成功建立新結果，再發 request B；分別令 A resolve、reject、finally 在 B pending 期間到達。每個舊 callback 都不得更動任何 state/DOM、notice、result、focus 或 B pending。再 pagehide 後完成 callback，仍完全 no-op。此案驗證競態邏輯，不作原生 Clipboard 成功證明。 |
| B21 | 真實點下載繁中和英文報告：檔名精確為 glossquote-event-timeline.txt；bytes 為該語言精確 report 的 UTF-8、無 BOM、無末尾 LF、無額外資料；不得自動下載或在提交時複製。若 browser 下載能力不能檢視 bytes，記明檢查途徑和缺項，不猜測通過。 |
| B22 | 用 test-only controllable timers/Object URL instrumentation 建立 8 個有效下載 URL；第 9 次下載暫停並公告等待。新結果、重複下載及確認清除都不得立即 revoke 尚未到期舊 URL；每一筆在建立後 60 秒到期撤銷，最早到期後下載恢復。此 harness 不算真實檔案下載通過。 |
| B23 | 在有 URL timers 時觸發 pagehide：立即清空輸入與結果、disable copy/download、取消 timers 並 revoke 所有 URL；晚到 Clipboard callback 不改 state。pageshow.persisted=true 後是一列空白初始頁。實際 BFCache 不可用時記 NOT_RUN，另報 pagehide 測試。 |
| B24 | 把名稱或備註填成類似 HTML 的文字（例如 <img src=x onerror=alert(1)>），提交後只當文字呈現，沒有新增 element、執行 handler 或破版；本例不得放入含控制字元的字串。 |
| B25 | 頁面完全載入後在 DevTools 設 offline，互動、排序、計算、文字報告仍可用；重新載入或首次離線載入可失敗，因不提供 Service Worker。互動不得發 request。 |
| B26 | 分別驗證完整 Network 與 Storage 面板：只出現本機必要靜態資產；計算/編輯不產生 fetch/XHR/beacon/WebSocket/EventSource；沒有 storage/cookie/indexedDB/cache、history state 或輸入 query/hash。若工具不可用記 NOT_RUN。 |
| B27 | 隨機不存在路徑取得真正 404 和安全文字導覽，不能回成功 app、HTTP 200 或 SPA fallback。M1 preview 404 必須 noindex；未能取得 HTTP status 時記 NOT_RUN。 |
| B28 | prefers-reduced-motion 開啟時沒有非必要動作動畫；在 Paper、Surface、Acid、Ink 與錯誤狀態逐一檢查文字/控制對比、focus ring 和不靠顏色的狀態線索。記錄實際量測，不以色票推測通過。 |
| B29 | 在可代表低階效能的真實裝置逐步輸入和操作 60 列，記 device/browser、操作延遲與是否能完成；只用桌機或模擬 CPU throttling 時標記為 emulated，不宣稱低階真機已驗。無真設備記 NOT_RUN。 |
| B30 | 連續編輯、提交、清除、語言切換和 pagehide/pageshow 多輪；不殘留舊 result、report、成功通知、輸入欄位或可再次下載的舊 URL。 |

## M1/M2/M3 門檻與可宣稱範圍

- M0：只有規格文件。核心和瀏覽器案例全部 NOT_RUN；不可寫「已測」。
- M1 必要瀏覽器驗收：B01–B11、B13、B15、B24、B27。B20、B22、B23 的 controlled harness 邏輯必須測；真實 BFCache 能力另記，不可由 harness 冒稱。IME/鍵盤、清除取消與確認、語言切換、320 CSS px、文字呈現安全和真 404 都不能以 NOT_RUN 代替。
- M1：原功能對話在本機完成純函式、UI 和工具鏈；完成核心自動案例與以上必要的兩語瀏覽器案例。preview 位於 dist/、noindex,nofollow、不得有 production canonical/hreflang/JSON-LD/sitemap。200% zoom、低階真機、原生 API 權限、完整 Network/Storage 或真 BFCache 能力缺失時逐項記 NOT_RUN 及影響。
- M2：僅在主代理明確放行 M1 後，原功能對話產 production candidate 到 dist-production/，執行 canonical/hreflang、Open Graph、WebApplication JSON-LD/CSP hash、robots、sitemap、header、404 和 ZIP/public GitHub gates；它不部署。production local preview 綁 127.0.0.1:5205。
- M3：工具及首頁 live deploy、線上 headers/SEO/404/核心流程由主代理執行；本文件的本機案例不能代替線上測試。
- 外部 review 完成前標記 awaiting external review；只有外部確認或必要修正後重驗並取得確認才可標為該版本完成。


---

## 原文件 TASKS.md

# 實作任務：逐 milestone 本機交付與 release gates

> 狀態：M0 任務分解，尚未實作。此文件定義未來原功能對話工作順序；建立所列 package.json、腳本或測試檔後才能執行相應命令。所有未執行任務現在都是 NOT_RUN。

## 固定執行規則

1. 依序完成 T00–T05，一次只交一個 milestone 給主代理審查。不要跳過 M1 主代理獨立驗收與明確放行。
2. 只用 Node.js 24 或更新版本、Node 內建模組和瀏覽器原生能力；禁止 npm install、外部套件和 runtime/dev dependency。
3. 每個任務只可寫其 Allowed paths。既有規格、入口和共用 docs 是唯讀；若遇矛盾向主代理回報，不降級規格。
4. 先依 START-HERE.md 和 AGENTS.md 閱讀順序；遵守 docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md、docs/DESIGN-SYSTEM.md、docs/RELEASE.md。只使用本工具資料夾。
5. 每條命令只可在該 task 建立了它依賴的 package/script/file 後執行。未建立或未列入該 milestone 的命令，不可先跑空測試或臨時安裝工具。
6. 任務回報列明實際命令、exit code、核心/瀏覽器案例狀態和 NOT_RUN 原因；不可把預期 oracle、mock、lint/static scan、桌面模擬器或本地 HTTP 視為未做的真機、原生 API、完整 Network、production/live evidence。
7. 不改 persistent Windows 環境、PATH、TEMP/TMP、Git 全域/系統設定；不讀取憑證，不登入 GitHub/Cloudflare，不部署、不花費、不碰 GlossGate 或其他產品。
8. 命令預期成功也必須實際執行並記錄結果；失敗後依 ENGINEERING 的停止/重試規則處理。只重跑因相關變更或失敗受影響的 gates。
9. M1 所有 app 資料只在 DOM/module memory。不得加 storage、URL/history state、console user data、隱藏網路、分析、遠端字體或 Service Worker。
10. 不改本列表以外的工作路徑。HANDOFF.md 和 docs/RELEASE-CANDIDATE.md 是各 milestone 記錄真實進度的唯一產品狀態文件；其他 shared files 不可自行改寫。

## T00 — M1 靜態骨架與本機工具鏈

**目的：** 建立可供後續工作修改、檢查和預覽的無依賴原生頁面骨架。T00 尚無 core test，因此不執行 npm test。

**Prerequisite:** 主代理建立 START-HERE.md、AGENTS.md、HANDOFF.md、TASK-ENTRY.md、project.json 及指定共用 docs；本任務六份規格已凍結可讀。

**Allowed paths:**
- package.json
- .gitignore
- scripts/serve.mjs
- scripts/check.mjs
- scripts/build.mjs
- public/index.html
- public/en/index.html
- public/styles/app.css

**Work:**
- package.json 使用 ESM/private、Node >=24；提供 dev/test/check/build scripts。dev 預設只綁 127.0.0.1:4205 並提供 public/，不需傳入 override；此時 test script 存在但不可在沒有 test files 時宣稱測試通過。
- serve script 僅提供 public/，僅 GET/HEAD，精確 MIME，正確 404/405，不列目錄、不做 SPA fallback；處理非法路徑，不能讀取 public 根目錄之外內容。port 參數只可在明確要求時接受合法整數；不得改變預設或監聽到 wildcard。
- 兩個 HTML 只有同源本機資產，不含正式 canonical、hreflang、JSON-LD、外網請求或嵌入式 script/style。繁中 /index.html lang=zh-Hant；英文 /en/index.html lang=en。
- 每頁 source 都有 noindex,nofollow；preview build 也有 noindex,nofollow，不能只依賴 robots.txt 或 response header。
- build script只把固定 allowlist 的 public source 建到 dist/；preview noindex,nofollow，不包含 production metadata、production sitemap、JSON-LD 或 index directive。
- check script本身無外部依賴、離線，只檢查本工具允許檔案及語法，不讀帳戶、兄弟目錄或其他 repo。檢查結果不宣稱是完整安全證明。
- 不加入 wrangler config 或 production build template。

**Commands allowed after the above files exist:**
- npm run check
- npm run build
- npm run dev

**Acceptance:**
- npm run check 和 npm run build 各自 exit 0；dist/ 只有 allowlist 應用資產，metadata 符合 noindex preview。
- npm run dev 實際綁 127.0.0.1:4205；手動開 /index.html、/en/index.html；外部位址不可連入。
- 不跑 npm install，不跑空的 npm test，不建立 production candidate。

## T01 — 純函式、exact schema 與 66 個固定 core oracles

**Prerequisite:** T00 完成；server/check/build 可用。

**Allowed paths:**
- public/js/core/parse-clock.js
- public/js/core/parse-duration.js
- public/js/core/validation.js
- public/js/core/schedule.js
- public/js/core/report.js
- test/helpers.mjs
- test/validation.test.mjs
- test/schedule.test.mjs
- test/report.test.mjs

**Work:**
- 按 TECHNICAL.md 實作純函式 parseClock、parseDuration、createInitialDraft、validateDraft、calculateSchedule、formatClock、formatScheduleClock、formatTargetClock、formatPlainTextReport、encodeUtf8Report。
- 嚴格檢查 root/row own enumerable data descriptors、exact keys、symbol、prototype、dense array；絕不先讀取可疑 getter。錯誤優先序和 error shape 完全依 PRODUCT.md。
- 整數計算全程不用 Date/Intl；文字長度以 UTF-16 code units，拒絕 Unicode Cc 和不成對 surrogate。
- 以 ACCEPTANCE.md C01–C66 手寫獨立期望值；禁止從被測函式產生 expected 或用抽樣替代整張案例表。測非突變和 getter counter。
- 測試全部離線、假資料；不記錄原始錯誤輸入。

**Commands allowed after all core modules and test files exist:**
- npm test
- npm run check

**Acceptance:**
- 66 個核心案例全部對應；任何差異都回到實作修正後重跑受影響測試。
- npm test 和 npm run check exit 0；記錄 Node 版本與命令結果。
- 若實作發現 schema 或 oracle 矛盾，停在此 task 並交主代理裁定，不可自行另造 API。

## T02 — 兩語活動表單、結果與可鍵盤排序

**Prerequisite:** T01 完成且全部 core cases passed。

**Allowed paths:**
- public/index.html
- public/en/index.html
- public/js/app.js
- public/styles/app.css
- public/js/ui/（only files needed for fixed bilingual DOM helpers, if created）
- test/（only UI helper tests added for this milestone）

**Work:**
- 完成繁中和英文完整工作流程、可見 label、時間/目標/次日、1–60 活動列、備註、Build、結果和唯讀 report。
- 使用 design-system 的 Gloss Tools 家族 token、Product App 層級和精確時間軸線；保留文件的平面與安靜方向，不採外部 frontend skill 的預設主題。
- 使用純函式驗證/計算；顯示每列 start/end、day offset、總分鐘、實際結束、有效 target 比較。
- 每列移上/移下是具列名的原生按鈕；鍵盤焦點保留，位置用單次 aria-live 通知。不得只靠拖曳排序。
- 所有名稱/備註用 textContent 或 value，不得用 innerHTML/eval/Function。
- 輸入、增刪、排序即時撤銷舊結果並禁用 copy/download；只有 Build 才提交結果。結果錯誤依固定優先序聚焦第一個錯誤。
- 時間和時長欄保持 ASCII 嚴格輸入，中文 IME 組字時不報中間拼寫錯誤；Build 在 compositionend 前阻止。

**Commands/manual cases allowed after app modules exist:**
- npm test
- npm run check
- npm run dev
- Browser cases B01–B09、B12、B15；有裝置能力時另測 B16–B18，否則按 NOT_RUN 規則記錄。

**Acceptance:**
- 兩語的基本例、午夜、目標、排序和失效案例符合 ACCEPTANCE.md。
- 320 CSS px、200% zoom、40% translated text layout、keyboard path、長列表與 IME 都記錄實際狀態。
- 未真機、未 assistive technology、未提供原生 API 權限或完整 Network/Storage 的項目明確 NOT_RUN。

## T03 — 清除/語言切換、clipboard、download 與 lifecycle

**Prerequisite:** T02 完成；核心報告文字固定。

**Allowed paths:**
- public/index.html
- public/en/index.html
- public/js/app.js
- public/js/ui/（only files needed for fixed bilingual DOM helpers, if created）
- public/styles/app.css
- test/（only lifecycle/async helper tests needed for this milestone）

**Work:**
- 有資料的清除和語言切換用原生 confirm；取消完整保留，確認後新頁空白。頁面離開不保存任何內容。
- Clipboard writeText 只在使用者明確按鈕手勢中以目前 report 呼叫；不讀取既有 clipboard，禁止 execCommand。
- 每筆 clipboard request 保存 revision、requestId、pageGeneration。所有 resolve/reject/finally callback 先同時比對三者與目前 pending request；只要任何一項不符就完全 no-op，不能清/改 pending、notice、result、focus 或 DOM。pagehide 增加 generation 使全部舊回呼失效。
- Clipboard API 失敗或不可用時報告仍可手動選取，不重試、不偽稱成功。
- 每次真實下載建立自己的 Blob URL，固定檔名；每個 URL 建立後 60 秒延遲 revoke，至多同時 8 個。新結果、編輯和重複下載不會提前撤銷前一筆 URL。滿 8 個停用下載並說明等待，最早 URL 到期後恢復。pagehide 取消 timers 並立即 revoke 全部 URL。
- 確認清除也不提前 revoke 已啟動下載的 URL；可見欄位/結果立即清空，舊 URL 仍只按自己的 60 秒期限或 pagehide 撤銷。
- pagehide 清 DOM/module state、所有輸入和結果、pending notice、clipboard generation 和 download URLs；pageshow.persisted 重新初始化空白。
- 語言路徑嚴格為 /index.html 和 /en/index.html；有資料時提示離開會清空，不保證切換保留。

**Commands/manual cases allowed after handlers and tests exist:**
- npm test
- npm run check
- npm run dev
- Browser cases B10–B13、B19–B23、B30；B20/B22/B23 必須跑 controlled harness，B23 的真實 BFCache 能力另行記錄。

**Acceptance:**
- 受控延遲 promise 測試證明舊 clipboard callback 對新 copy pending 完全無影響；另分開記錄原生 clipboard 可用性。
- 8 URL 上限、60 秒延後、new-result/repeated-download 不即時 revoke、pagehide immediate revoke 全部通過 harness；真實下載另外按 B21 驗。
- Clear/switch cancel preservation 與 confirm wipe 在兩語各自驗收。若瀏覽器不支援或權限被拒，僅原生 clipboard success 可 NOT_RUN，fallback 仍須實測。

## T04 — M1 隱私、安全 header、preview build 與響應式驗收

**Prerequisite:** T00–T03 完成。

**Allowed paths:**
- public/index.html
- public/en/index.html
- public/404.html
- public/_headers
- public/styles/app.css
- public/js/app.js
- scripts/check.mjs
- scripts/build.mjs
- test/（only static build/header checks and browser fixtures required for M1）

**Work:**
- 完成 M1 preview 404、安全 header、noindex,nofollow；未經 release gate 不建立 canonical/hreflang/JSON-LD/sitemap/robots index。
- CSP 保持預覽閉合，沒有 production JSON-LD hash placeholder；不允許外連、inline script/style、unsafe-inline/eval、data、wildcard、connect。
- build 和 check 全離線，只接觸本工具 allowlist；對未知檔案、symlink/junction/hardlink、path traversal、stale output fail closed，不複製規格、測試、HANDOFF 或輸入資料。
- 通過 B24–B29 的適用項目，完整 Network/Storage 面板按能力執行；記錄所有 NOT_RUN 原因。
- 結果、錯誤、報告與元件保持雙語；不得把本機結果寫進 URL/storage/console。

**Commands/manual cases allowed after fixes exist:**
- npm test
- npm run check
- npm run build
- npm run dev
- Browser cases B14–B18、B24–B30；不具螢幕閱讀器、200% zoom、真手機或完整 Network/Storage 能力時，相關項目逐一標 NOT_RUN 並說明影響。

**Acceptance:**
- 404 為真正 HTTP 404，preview metadata noindex。
- 320、200%、40% translation、IME、low-end-device limitation、offline-after-load 皆有結果；能力不足逐項 NOT_RUN。
- M1 沒有 wrangler.jsonc、production headers/build toolchain、GitHub publication 或 Cloudflare action。

## T05 — 凍結與 M1 最終本機交付

**Prerequisite:** T00–T04 修正完成；主代理尚未放行 M2。

**Allowed paths:**
- HANDOFF.md
- docs/RELEASE-CANDIDATE.md

**Work:**
- 凍結 app commit/tree 作為主代理獨立驗收輸入，保留所有既有其他修改。
- 實跑 final gates：npm test、npm run check、npm run build，各一次；任一相關輸入修正後只重跑受影響 gate。
- 必須驗收 B01–B11、B13、B15、B24、B27，並執行 B20/B22/B23 controlled harness；其他原生 API、螢幕閱讀器、200% zoom、真機、完整 Network/Storage 或真 BFCache 能力缺失時逐項標 NOT_RUN 並記錄影響。
- 記 Node/browser/device 版本、每個命令 exit code 和 preview dist/ noindex 結果。不得寫未跑的 production/live evidence。
- 向主代理交付 M1 後停止。沒有主代理明確放行，不得開始 M2。

**Commands/manual cases:** only commands listed as available in T00–T04; no new package/tool installation.

**Acceptance:**
- final npm test/check/build 都 exit 0；browser test status 有對應證據；git diff 只在本工具允許路徑。
- HANDOFF 的 M1 status、未驗項和 actual completion 一致；產品不能標 released 或 complete。

## T06 — M2 production candidate 與固定 ZIP 公開來源（主代理明確放行後才存在）

**Prerequisite:** T05 M1 gates pass，主代理完成獨立驗收並明確提供 M2 GO。沒有 GO 時本 task 是 NOT_STARTED，禁止執行。

**Allowed paths:**
- package.json
- .gitignore
- scripts/build-production.mjs
- scripts/check-production.mjs
- scripts/preview-production.mjs
- wrangler.jsonc
- HANDOFF.md
- docs/RELEASE-CANDIDATE.md

production files are generated only under dist-production/ and not committed as source. If a necessary source change is outside this allowlist, stop and ask the primary owner to return it to the feature chat and revise the task paths before editing.

**Work:**
- 保留 M1 dist/；新增 build:production/check:production/preview:production，所有 production outputs 獨立寫 dist-production/。
- 正式 origin 固定 https://agenda.glossquote.com；canonical /index.html 及 /en/index.html；hreflang zh-Hant/en/x-default，x-default 指向繁中 /index.html。回首頁用 docs/BRAND.md 的語言對應 URL。
- title/description、Open Graph title/description/locale/url/type 需符合各頁實際語言與 canonical；不使用虛構預覽圖。
- JSON-LD 只使用固定、準確的 WebApplication metadata，不含使用者輸入；對每一頁實際 script text 計算精確 SHA-256 Base64 hash，只把對應 hash 加入該頁 CSP script-src。禁止 unsafe-inline/eval 和其他來源放寬。
- 生產 robots、兩個 URL 的 sitemap、preview 仍 noindex、真正 HTTP 404、所有 header 和 MIME 均能本機測試；不做 deploy、不登入 Cloudflare、不讀 token、不安裝 CLI。
- production preview 固定 127.0.0.1:5205。執行 production gates 後，按 docs/RELEASE.md 和 docs/GIT-PUBLICATION-SAFETY.md 使用 reviewed publishing copy、Git settings guard 和固定來源 ZIP 流程；public repo 為 KYStr/glossquote-labs-event-timeline。只在主代理核准範圍發布。
- 驗證 ZIP 由固定 commit archive 產生、每個檔案 bytes 和 git blob 一致，記 ZIP bytes/SHA256、remote commit、公開 visibility 和乾淨副本 gates。source ZIP 與未追蹤產物要符合 release contract，不能包入 .runs、node_modules、秘密、帳戶資料或使用者輸入。

**Commands allowed after production scripts exist:**
- npm test
- npm run check
- npm run build
- npm run build:production
- npm run check:production
- npm run preview:production

**Acceptance:**
- dist/ preview 仍 noindex 且內容不被 production build 覆寫；dist-production/ SEO/header/404 全部符合 PRODUCT.md、UX-SEO.md 和 docs/RELEASE.md。
- Production local candidate 在 127.0.0.1:5205 通過對應檢查；production artifact 與固定 commit/ZIP source 可核對。
- GitHub publication 完成後向主代理回報 public URL、commit、visibility、ZIP size/SHA256、命令 exit 與 NOT_RUN；不做 M3。

## M3 — 主代理專屬 live deployment

M3 不屬於原功能對話任務。主代理驗收 M2 後部署 Worker 和共用首頁，確認 live 雙語頁、headers、SEO、404、核心流程及 homepage links。功能對話不得建立部署命令、呼叫 Cloudflare、修改 live DNS 或更新首頁。


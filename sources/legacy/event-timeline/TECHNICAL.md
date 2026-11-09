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

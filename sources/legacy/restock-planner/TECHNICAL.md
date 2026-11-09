# 補貨數量試算技術規格

狀態：M0 規格草稿，尚未實作。需求由 PRODUCT.md 定義；本文件固定核心型別、錯誤順序、數學和本機工程邊界。

## 執行環境與目錄

- 瀏覽器產品採原生 HTML/CSS/JavaScript ESM；Node.js 24+ 只做開發伺服器、檢查、建置和 `node:test`。不加 runtime 或 dev 外部依賴。
- 建議目錄：

```text
package.json
.gitignore
public/
  index.html                  # 繁中
  en/index.html               # English
  styles/tokens.css
  styles/app.css
  js/app.js
  js/core/schema.mjs
  js/core/calculate.mjs
  js/core/report.mjs
scripts/serve.mjs
scripts/check.mjs
scripts/build.mjs
scripts/http-check.mjs
test/core.test.mjs
test/report.test.mjs
test/http.test.mjs
dist/                          # M1 preview build output only
dist-production/               # M2 candidate only; not created in M1
```

- `package.json` 使用 `private:true`、`type:"module"`、內建工具，且沒有 `dependencies` 或 `devDependencies`。共用命令：`npm test` → `node --test`、`npm run check` → `node scripts/check.mjs`、`npm run build` → `node scripts/build.mjs`、`npm run dev` → `node scripts/serve.mjs`。
- M1 `build` 只把審核過的靜態 `public/` 白名單檔案複製到 `dist/`；拒絕未知檔案、symlink/junction 越界及 stale 輸出。`serve.mjs` 只提供 `dist/`、只綁 `127.0.0.1:4217`，使用精確路由/MIME/status；執行前需先 build。僅接受 Host `127.0.0.1:4217` 與 `localhost:4217`（hostname 比對不區分 ASCII 大小寫）；缺失/未知 Host 回 `421`，不可提供 workspace、測試、來源或證據資料夾。
- M2 工具只有主代理書面 GO 後才建立。`build:production` 產生獨立 `dist-production/`；`check:production`、`preview:production`（`127.0.0.1:5217`）和 `release:check` 驗證該候選。不能改寫 `dist/` 或變更 M1 source bytes。M2 不部署 Wrangler；M3 由主代理負責。
- 唯一頁面路由為精確 request-target `/index.html` 和 `/en/index.html`。`/`、任何 query-bearing 路徑、未知路徑回 404，不能 SPA fallback 或 directory index。HTML MIME 固定 `text/html; charset=utf-8`，CSS 為 `text/css; charset=utf-8`，`.js`/`.mjs` 為 `text/javascript; charset=utf-8`；錯誤回應固定 UTF-8 `text/plain` MIME。

## 精確輸入 schema

`calculateRestockPlan(input)` 接受同 realm plain object，prototype 必須是 `Object.prototype`，且只含以下 own enumerable data properties；不接受缺少、額外、symbol、non-enumerable、accessor 或 inherited properties：

```ts
type RestockInput = {
  observationDaysRaw: string;
  leadDaysRaw: string;
  coverageDaysRaw: string;
  items: RestockRowInput[];
};

type RestockRowInput = {
  id: string;
  nameRaw: string;
  unitRaw: string;
  usedRaw: string;
  stockRaw: string;
  reserveRaw: string;
  packSizeRaw: string;
};
```

`items` 必須是同 realm 普通 Array，prototype 為 `Array.prototype`，索引 `0..length-1` 都是 dense own properties，且除 `length` 與上述索引外不得有其他 own keys。長度範圍為 1–30。讀取原生 own `length` 並同時檢查上下限，必須早於 `Reflect.ownKeys`、descriptor 掃描任何 row、迭代、spread、map 或複製。31 列以上回 `ITEM_LIMIT`，不碰 row 或 index getter；空陣列先回 `ITEM_COUNT`。一般 Proxy object/array 不屬於支援資料契約；本產品 UI 不建立或接收 Proxy。

每個 plain object 先檢查 prototype、key set 與 property descriptor，再讀欄位值。預期欄位須是 own、enumerable data property（只有 `value` descriptor）。通過 descriptor 檢查前不得用一般屬性讀取；任何 getter 都不得執行。拒絕 symbol keys 及其他未知 own keys。錯誤欄位路徑是穩定字串，例如 `observationDaysRaw`、`items`、`items[0]`、`items[0].usedRaw`。

### 原文字串規則

- 天數與數量欄位必須為非空、1–16 UTF-16 code units 的字串，符合 `^[0-9]{1,16}$`。允許 ASCII 前置零。使用 `BigInt` 解析；不 trim。拒絕空白、正負號、小數點、指數記號、locale digits、千分位和空值。範圍檢查通過前不可轉成 Number。
- 範圍：`observationDaysRaw` 1–365；`leadDaysRaw` 0–365；`coverageDaysRaw` 1–365；`usedRaw`、`stockRaw`、`reserveRaw` 0–1,000,000；`packSizeRaw` 1–10,000。
- `nameRaw` trim 前最多 512 UTF-16 code units；`unitRaw` trim 前最多 128 UTF-16 code units。trim 前先拒絕不成對 UTF-16 surrogate、C0/C1 控制字（`U+0000–001F`、`U+007F–009F`）、Unicode line separator `U+2028` 和 paragraph separator `U+2029`，因名稱/單位是單行標籤。使用 ECMAScript `String.prototype.trim`；trim 後名稱 1–80、單位 1–16 Unicode code points。一般 Unicode 和 emoji 保留，不正規化、不改內部空白、大小寫或標點。名稱與單位只作純文字。
- `id` 必須符合 `^[A-Za-z0-9_-]{1,40}$`，同一輸入內不得重複。UI 用單調遞增 ID，例如 `item-1`；新增/刪除其他列時不更改現存列 ID。

## 確定錯誤優先序

只回以下第一個錯誤；每個清單都按書寫順序檢查。核心錯誤 outcome 精確為 `{ ok:false, error:{ code, field } }`，兩值皆穩定字串。不得回顯非法原文、名稱、單位或完整輸入。

1. root 不是支援 plain object → `INPUT_OBJECT`，field `input`。
2. root 有未知 own key（含 symbol）→ `INPUT_UNKNOWN_FIELD`，field `input`。
3. root 缺 own key → `INPUT_MISSING_FIELD`；按 `observationDaysRaw`、`leadDaysRaw`、`coverageDaysRaw`、`items` 次序回第一個欄位。
4. root 預期 property 是 accessor 或 non-enumerable → `INPUT_PROPERTY`，field 為欄位路徑。此步只檢 descriptor；不讀欄位值，也不執行 getter。
5. 依序驗證 `observationDaysRaw`、`leadDaysRaw`、`coverageDaysRaw`：非 string → `DAY_TYPE`；原文長度大於 16 → `DAY_RAW_LIMIT`；不是 ASCII 整數 → `DAY_FORMAT`；超範圍 → `DAY_RANGE`。
6. `items` 不是 Array → `ITEMS_TYPE`；是 Array 但 prototype 不符 → `ITEMS_SHAPE`。
7. 在掃描陣列鍵/內容前讀 native `length`：大於 30 → `ITEM_LIMIT`；小於 1 → `ITEM_COUNT`。
8. 長度合法後才以 `Reflect.ownKeys` 檢查陣列：除索引和 `length` 外有 own key → `ITEMS_SHAPE`；再按索引升冪檢查 missing own index → `ITEM_HOLE`；索引不是 enumerable data property → `ITEMS_PROPERTY`，field `items[i]`。
9. 按索引升冪驗 row：非支援 plain object → `ROW_OBJECT`；未知 own key → `ROW_UNKNOWN_FIELD`；按 `id`、`nameRaw`、`unitRaw`、`usedRaw`、`stockRaw`、`reserveRaw`、`packSizeRaw` 順序第一個缺欄 → `ROW_MISSING_FIELD`；預期 property accessor/non-enumerable → `ROW_PROPERTY`，field 為完整 row 欄位路徑。先檢查該 row 全部 descriptor，再讀任何 row 值。Primitive type 留待下面固定欄位驗證，不併入 descriptor 錯誤。
10. 驗 `id` primitive 是 string，否則 `ROW_ID_TYPE`；格式錯 → `ROW_ID_FORMAT`；再與之前列比較，重複 → `ROW_ID_DUPLICATE`。
11. 驗 `nameRaw`：非 string → `NAME_TYPE`；原文超過上限 → `NAME_RAW_LIMIT`；surrogate 錯 → `NAME_SURROGATE`；C0/C1 control → `NAME_CONTROL`；含 `U+2028`/`U+2029` → `NAME_LINE_SEPARATOR`；trim 後空白 → `NAME_EMPTY`；碼點超限 → `NAME_CODEPOINT_LIMIT`。
12. 同樣次序驗 `unitRaw`，錯誤碼依序為 `UNIT_TYPE`、`UNIT_RAW_LIMIT`、`UNIT_SURROGATE`、`UNIT_CONTROL`、`UNIT_LINE_SEPARATOR`、`UNIT_EMPTY`、`UNIT_CODEPOINT_LIMIT`。
13. 按 `usedRaw`、`stockRaw`、`reserveRaw`、`packSizeRaw` 驗列數值：非 string → `QUANTITY_TYPE`；原文超過 16 → `QUANTITY_RAW_LIMIT`；非 ASCII 整數 → `QUANTITY_FORMAT`；超該欄範圍 → `QUANTITY_RANGE`。
14. 全列合法後才計算。若任何 derived value 超過 `Number.MAX_SAFE_INTEGER` 才能回 `CALCULATION_RANGE`、field `items[i]`；在目前上限下不可發生，保留作未來變更保護。

input/array/object 層級錯誤的 `field` 是容器路徑（`input`、`items`、`items[i]`）。未知 symbol 一律回容器 field，不把 symbol 轉字串。錯誤 UI 依 `{code,field}` 映射為繁中/英文欄位提示；不顯示原始 code 或 parser 詳細文字。

## 精確計算與輸出型別

函式簽名與 outcome：

```ts
function calculateRestockPlan(input: RestockInput):
  | { ok: true; result: RestockPlanResult }
  | { ok: false; error: { code: string; field: string } };
```

函式確定、同步、純，不修改參數，並配置新的結果；名稱/單位是 trim 後字串。每次乘、加、減、比較、除法與 round 顯示都用 BigInt。完成範圍檢查後才轉成 JSON-safe Number；輸出不能包含 BigInt，不以 floating point 做決策。

```ts
type RestockPlanResult = {
  schemaVersion: 1;
  assumptions: {
    observationDays: number;
    leadDays: number;
    coverageDays: number;
    arrivalTiming: "end-of-lead-period";
    usageModel: "fixed-average";
  };
  items: Array<{
    id: string;
    name: string;                   // trimmed, otherwise unchanged
    unit: string;                   // trimmed, otherwise unchanged
    observedUseUnits: number;
    currentStockUnits: number;
    safetyReserveUnits: number;
    packSizeUnits: number;
    averageDailyUse: {
      numeratorUnits: number;       // U
      denominatorDays: number;      // D
      roundedTo3: string;           // ASCII decimal, e.g. "1.000"
    };
    targetNumeratorUnitDays: number;
    stockNumeratorUnitDays: number;
    needNumeratorUnitDays: number;
    packDenominatorUnitDays: number;
    packsToOrder: number;
    orderUnits: number;
    shortageNumeratorUnitDays: number;
    shortageBeforeArrivalUnits: number;
    runwayWholeDays: number | null;
  }>;
};
```

Result 整數皆為非負 safe integer，日均顯示為字串。合法上限下：`targetNumeratorUnitDays ≤ 1,095,000,000`、`stockNumeratorUnitDays ≤ 365,000,000`、`needNumeratorUnitDays ≤ 1,095,000,000`、`packDenominatorUnitDays ≤ 3,650,000`、`packsToOrder ≤ 731,000,000`、`orderUnits ≤ 731,010,000`、`shortageNumeratorUnitDays ≤ 365,000,000`、`shortageBeforeArrivalUnits ≤ 365,000,000`、`runwayWholeDays ≤ 365,000,000`、平均日用量 milliunits ≤ 1,000,000,000。全部 JSON 整數都精確。

對每列合法整數 `D,U,L,C,S,R,P` 計算：

```text
targetN       = U × (L + C) + R × D
stockN        = S × D
needN         = max(0, targetN − stockN)
packDenom     = D × P
packs         = ceilDiv(needN, packDenom)
orderUnits    = packs × P
shortageN     = max(0, U × L − S × D)
shortageUnits = ceilDiv(shortageN, D)
runway        = U > 0 ? floor((S × D) ÷ U) : null
milli         = floor((2 × U × 1000 + D) ÷ (2 × D))
```

`ceilDiv(n,d)` 的前置條件為 `n ≥ 0, d > 0`，BigInt 實作 `(n + d − 1) / d`；`n=0` 回 `0`。`roundedTo3` 將 `milli` 格式化為 `floor(milli/1000) + "." + (milli mod 1000)`，小數補零至三位。這是精確 `U/D` 的正數 half-up；不可使用 locale grouping 或逗號小數。`shortageBeforeArrivalUnits` 假設以固定耗用率消耗現貨至 `L` 天結束，訂單在該時點之後才可用；`L=0` 時結果為 0。

## 文字報告 formatter

`formatRestockReport(result, language)` 只接受 exact、支援版本的 `RestockPlanResult`，且 `language` 只能是 `"zh-Hant"` 或 `"en"`。結果精確為 `{ok:true,text:string}`，或 `{ok:false,error:{code:"REPORT_INPUT",field:"result"|"language"}}`；先驗 language，再驗 result。函式為 pure，不呼叫 browser API。

Result 必須是 same-realm plain objects 和 ordinary dense arrays，遞迴 exact schema、無未知/symbol keys、accessor 或 non-enumerable 欄位。檢 `result.items` 的 Array 型別/prototype 後，必須先讀長度並確認 1–30，才可 own-key 掃描、枚舉或讀 row；超界、空陣列、洞、額外欄位及 getter 都回 `REPORT_INPUT`/field `result`，且 getter 呼叫數必須是 0。檢查 `schemaVersion`、assumptions 範圍/enum、每列輸入量的 safe-integer 範圍；ID 符合 pattern 且不重複；`name`/`unit` 已 trim、碼點數符合 1–80/1–16，且不含 unpaired surrogate、C0/C1、`U+2028`、`U+2029`。再用 BigInt 依本文件公式從結果中的輸入量和 assumptions 重新計算每個 derived 欄位，逐一比對 `averageDailyUse`、target/stock/need/pack denominator、packs、order units、shortage numerator/units、runway。任何欄位互相矛盾，即回 `REPORT_INPUT`/`result`；例如把成功 result 的 `packsToOrder` 改成 1、但 `orderUnits` 保持原值，必須拒絕。只有一致且完整的結果才格式化。

報告用 LF、沒有 final LF、依輸入順序列出所有 rows（含 0 包），不截斷。名稱/單位只能作純文字；拒絕換行控制字和 `U+2028`/`U+2029`，永不當 markup。

繁中與英文都包含標題、固定平均耗用估算及到貨時點假設、三個共用天數、每列名稱/單位/觀測總量/現貨/安全備量/每包數、三位小數日均、到貨前短缺、整天現貨可用日數或零用量說明、建議包數與總單位。`runwayWholeDays=null` 用固定句「無法估算（觀測用量為 0）」／“Not estimated (zero observed use)”。

## 畫面狀態與資料生命週期

`app.js` 維護一份記憶體 draft、結果或 null、報告字串或空字串、頁內確認狀態。啟動時只從明確預設建立 draft，不讀 URL、儲存空間、DOM 序列化備份或伺服器資料。不能用表單 GET 提交；所有按鈕明確 `type="button"`；如保留 form，submit handler 必須 `preventDefault()`，且不可有會外送的 `action`。HTML 初始時所有可修改資料的 controls 和試算按鈕都 `disabled`；JS 初始化成功才啟用，初始化失敗則保持停用並顯示本地錯誤。

「目前是初始狀態」以使用者可見值比較：三個天數等於 30/7/30，一列的名稱/單位/數量欄全空，沒有 result/report；內部 `id` counter 不影響此比較。

- 每次 `input`、組字期間文字值改變、`change`、新增或刪除列，立即把結果設 null、清空報告並清除舊成功狀態。不得在 IME composition 中改寫目前輸入、提交、驗證或搶焦點；組字輸入已先使舊結果失效，待 `compositionend` 後由使用者再按試算。
- 按「試算補貨」時同步防止重複提交，使用當前 draft 快照呼叫核心。沒有 background job 或非同步 clipboard。錯誤只呈現第一個欄位問題、沒有部分結果；修正任何欄位會立即失效。
- 範例、清除及非初始狀態的語言切換使用頁內可及確認區；不得呼叫 `window.confirm`、`prompt` 或 OS 對話框。切語言時，初始預設 draft 且無結果可以直接導航；其他狀態先顯示將離開並清除草稿的確認。確認面板打開前保留狀態；取消/關閉不改變欄位或結果；確認清除後，語言連結才導航到另一個固定語言頁。
- `pagehide` 清空每個欄位 value、draft/result/report/確認狀態及持有輸入的暫存引用。若 BFCache 返回，`pageshow.persisted` 再建立新預設，不從舊 DOM 還原。
- 不支援或初始化出錯時就在本機停止；不得轉用遠端運算或其他服務。

## 安全、檢查與發布邊界

- 所有字串以 `textContent`、`value` 或純文字 textarea 顯示；不用 `innerHTML`、`eval`、`Function`、外部資產或 HTML template 拼接使用者內容。使用者輸入永不進 query/hash、console、網路請求或下載。
- M1 預覽不設 canonical、sitemap 或 JSON-LD，不發布。HTML 設 `noindex,nofollow`。M1 靜態伺服器只提供建置過的 `dist/` 白名單；未知路徑 404、非 GET/HEAD 405。所有 M1 HTTP 頁/資產回 `Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`、`X-Content-Type-Options: nosniff` 和 `Referrer-Policy: no-referrer`。M1 不用任何 inline CSS/JS，M2 不用 inline CSS 或 executable inline JS；僅允許對精確 JSON-LD payload 的 CSP hash。兩階段都不載遠端資產；不使用 `unsafe-inline`、`unsafe-eval` 或其他來源。
- M2 正式候選才在獨立 `dist-production/` 設 production canonical、雙語 reciprocal `hreflang`（`zh-Hant`、`en`，`x-default` 指繁中頁）、robots、只含兩頁的 sitemap、可見 FAQ 和 WebApplication JSON-LD；JSON-LD CSP 僅允許精確 hash，不用 `unsafe-inline`/`unsafe-eval`。依 `docs/RELEASE.md` 驗證安全標頭、404 noindex、robots 對必要 HTML/JS/CSS 的最長前綴規則、檔案閉合及兩輸出隔離。
- M2 公開來源候選 `KYStr/glossquote-labs-restock-planner`。M2 需主代理 GO；M3 免費 hosting 與首頁整合只由主代理執行。都未發生前不得寫成已發布或已部署。
- M1 HTTP gate 驗證 `GET`/`HEAD`、其他方法 `405` 並回 `Allow: GET, HEAD`、上述精確 MIME、`/index.html` 和 `/en/index.html`、根 `/` 無 alias且404、query-bearing/未知 path 404、允許的兩種 Host 及未知/缺失 Host `421`。Host 驗證先於 method/path；`HEAD` 不送 response body，保留相同 GET status/headers。
- 因使用者焦點保護，本機互動 UI 驗收目前一律 `NOT_RUN_USER_FOCUS_INCIDENT`。Node tests、靜態檢查或 HTTP 只能證明其實際涵蓋範圍，不得稱為瀏覽器、AT、真機或完整離線通過。

## 核心測試規格

用 `node:test`、內建 assert 和手寫 expected 測試 `calculateRestockPlan` 與 `formatRestockReport`。不可從被測函式推導 expected；不得讀網路/帳戶/真實資料。測試包含 ACCEPTANCE.md 全部 C 案例、純輸入不變、輸出可 `JSON.stringify`、沒有 BigInt、公式精確不變式、錯誤順序、超限陣列先驗長度及 getter 呼叫次數保持 0。check 不能是永遠成功的 stub；HTTP harness 只綁 loopback，且只啟停它本次建立的 server。

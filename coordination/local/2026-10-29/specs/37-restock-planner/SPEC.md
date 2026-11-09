# 補貨數量試算 — 既有規格保存

Task ID: `labs-37-restock-planner` · Spec ID: `spec-37-restock-planner`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 補貨數量試算產品規格

狀態：M0 規格草稿，尚未實作。主代理核准前不得開始 M1。

## 使用者與問題

家庭採買者、工作室管理者或其他小型補貨負責人，已知道某段期間的實際耗用量、目前現貨、到貨天數、安全備量與每包數量，希望快速算出本次應補幾包，並看見按固定平均耗用估算的到貨前短缺量與現貨可用整天數。工具幫忙把數量與假設算清楚，不替使用者決定供應商、價格或採購責任。

這是「補貨數量試算」，不提供單價比較、購物折扣、行李清單或一般庫存管理。

## MVP 決定

- 每個語言是獨立靜態頁：繁中 `/index.html`、英文 `/en/index.html`；頁面分開載入，不保留或自動搬移草稿。非初始草稿或已有結果時，切語言會先有頁內離開確認；取消保留原狀，確認才離開。說明不會自動保存。
- 全部輸入只存在目前頁面的記憶體。沒有帳號、匯入、匯出、歷史紀錄、同步或儲存功能。
- 最多 30 個品項；所有數量都是同一品項單位下的整數，並用 ASCII 數字字串輸入。
- 初始共用天數為觀測 30 天、到貨 7 天、到貨後目標涵蓋 30 天；初始只有一列空白品項，必須按「試算補貨」後才出結果。
- 一列中的用量、現貨、安全備量、包裝數量都使用該列唯一的單位標籤。不同品項可以用不同單位；不做單位換算。
- 計算以觀測期間總用量換算固定平均耗用率；明示這是估算，不是需求預測。訂單假定在到貨天數結束時可用。
- 成功結果逐品項顯示建議包數與總單位、到貨前估計短缺、現貨可用整天數。若觀測用量為 0，合法顯示「無法估算」的可用天數，但仍按安全備量計算補貨量。
- 成功後提供完整唯讀採購文字報告，使用者可用鍵盤手動選取。沒有 Clipboard API、複製按鈕、檔案下載或系統剪貼簿驗收。
- 任何輸入、增列或刪列都立即清除上一份結果與報告。編輯後必須重新按試算。
- 載入任一範例一律先顯示頁內覆寫確認；取消保留原草稿和結果，確認後只載入草稿、不自動計算。
- 有兩個固定單品範例，期間均為 `D=30,L=7,C=30`，品名「耗材」、單位「個」、`U=30,R=3,P=12`：一般補貨範例現貨 `S=10`，短缺範例現貨 `S=2`。預期分別是 3 包/36 單位/到貨前短缺 0/現貨 10 整天，及 4 包/48 單位/到貨前短缺 5/現貨 2 整天。兩者都先確認，載入後都需再按試算。
- M1 只做本機 noindex 候選；建議正式網址 `https://restock.glossquote.com/index.html` 與 `/en/index.html`，尚未部署或發布。

## 功能需求

### FR-01 — 初始表單與預設值

繁中與英文各有獨立完整頁面。共用欄位初始為 `observationDaysRaw="30"`、`leadDaysRaw="7"`、`coverageDaysRaw="30"`。初始 `items` 有一列，`id` 由本頁產生且其 `nameRaw`、`unitRaw`、`usedRaw`、`stockRaw`、`reserveRaw`、`packSizeRaw` 全空；不得預先產生或暗示有效結果。使用者必須填完至少一列並明確按「試算補貨」。

### FR-02 — 共用期間欄位

- 觀測天數：ASCII 整數 1–365，預設 30。
- 到貨天數：ASCII 整數 0–365，預設 7。
- 到貨後目標涵蓋天數：ASCII 整數 1–365，預設 30。這段期間從到貨時起算，不含到貨前天數。
- 數值不得有符號、小數點、指數記號、空白或非 ASCII 數字；前置零可接受。

### FR-03 — 品項輸入與列管理

- 每列有穩定 `id`、必填名稱、必填單位標籤、觀測期間總用量、現貨、安全備量、每包單位數。
- 名稱 trim 後 1–80 Unicode 碼點；單位標籤 trim 後 1–16 Unicode 碼點。原文長度上限、控制字、換行分隔符及 surrogate 規則見 TECHNICAL。
- 觀測總用量、現貨、安全備量各為 0–1,000,000；每包單位數為 1–10,000。都必須輸入 ASCII 整數字串；0 是合法值，空欄不等於 0。
- 任何一欄無效就拒絕整份試算，不跳過該品項。品項 1–30 列；移除最後一列的按鈕停用，新增到 30 列後新增按鈕停用。
- 新增列使用新的穩定 ASCII ID；刪除不重用仍存在的列 ID。列刪除後不保留草稿或計算結果。

### FR-04 — 補貨計算

令 `D` 為觀測天數、`U` 為觀測總用量、`L` 為到貨天數、`C` 為到貨後目標涵蓋天數、`S` 為現貨、`R` 為安全備量、`P` 為每包單位數。對每列使用整數精確運算：

```text
targetN = U × (L + C) + R × D
stockN = S × D
needN = max(0, targetN − stockN)
packDenominator = D × P
packsToOrder = ceil(needN ÷ packDenominator)
orderUnits = packsToOrder × P
shortageN = max(0, U × L − S × D)
shortageBeforeArrivalUnits = ceil(shortageN ÷ D)
runwayWholeDays = U > 0 ? floor(S × D ÷ U) : null
averageDailyUse = U ÷ D
```

`targetN`、`stockN`、`needN`、`packDenominator`、`shortageN` 是供精確核對的「單位×天」分子／分母欄位，不把它們誤標成已除以 `D` 的單位數。所有除法均使用 BigInt 整數商／餘數規則，不以浮點數決定包數或短缺。

日均用量只供顯示，固定顯示三位小數、正數 half-up；內部精確值保留為 `U/D`，試算決策不得使用四捨五入顯示值。`U=0` 時顯示 `0.000`，現貨可用整天數為「無法估算（觀測用量為 0）」，而 `R>0` 時仍可有正的建議補貨量。

### FR-05 — 結果與假設

所有品項成功後才一起顯示結果。每列含名稱、單位、觀測用量、現貨、安全備量、包裝規格、三位小數日均、建議包數、建議總單位、到貨前估計短缺、現貨可用整天數。結果同時說明固定平均耗用假設與「訂單在到貨天數結束時可用」假設。短缺為 0 也明列 0，不代表供貨或實際消耗保證。

結果中的「現貨可用整天數」只由現貨除以固定平均耗用估算，不扣安全備量、不含在途貨、不代表精確耗盡時間。到貨前短缺只估算到貨時點之前的需求與目前現貨，不把本次新訂單提前計入。

### FR-06 — 文字報告

試算成功後產生完整、未截斷的唯讀多行文字，逐列列出所有品項及假設，格式固定為 LF、無最末 LF。報告是為方便手動選取的畫面文字，不使用剪貼簿 API，不提供下載。品名、單位標籤依純文字保留，不作 HTML 解讀或動態標記。

### FR-07 — 錯誤與失效

拒絕未知欄位、缺欄、型別錯誤、存取器、稀疏或超限陣列、重複/格式錯誤 ID、超長或空白名稱/單位、控制字、不成對 surrogate、非 ASCII 整數或越界數值。核心回傳固定錯誤碼與欄位路徑；畫面只顯示等義繁中/英文提示，不顯示原始錯誤碼，也不回顯整段原始輸入。

只要草稿改變，就先清掉舊結果、報告與任何成功狀態；重新試算成功才可產生新結果。錯誤時不顯示部分品項結果。載入範例和清除草稿的確認取消時保持原狀。

### FR-08 — 清除、語言與頁面生命週期

- 清除全部輸入會恢復三個預設天數和一列空白品項。若目前欄位值不同於初始預設或已有結果，先顯示頁內確認；取消不改變任何欄位/結果。
- 語言切換連到另一個固定語言頁。若目前草稿不同於初始值或已有結果，先顯示頁內離開確認；取消保留欄位/結果，確認後才導航。確認文字說明切換會離開此頁並清除此頁草稿；不承諾保留。若頁面正處初始空白狀態，直接導航即可。
- `pagehide` 清空 JavaScript 草稿、DOM 欄位、結果、報告與 pending UI 狀態。若 `pageshow.persisted` 為真，仍呈現全新初始狀態。
- 僅記憶體處理。不使用 localStorage、sessionStorage、IndexedDB、cookie、Cache API、service worker、URL query/hash、遙測、外部 API、遠端字型或 CDN；不把使用者資料寫入 console。

### FR-09 — 本機預覽與正式資訊狀態

M1 雙語本機預覽只綁定 `127.0.0.1:4217`，內容 noindex，不含正式 canonical、sitemap 或可索引承諾。M2 才建立正式候選輸出與 SEO 檔；M3 才由主代理部署及更新首頁。推薦正式網域為 `restock.glossquote.com`，未部署前都須標示為預定網址。

## 公式例子

單品：`D=30, U=30, L=7, C=30, R=3, P=12`。

- `S=10`：`targetN=1200`、`needN=900`、`ceil(900/(30×12))=3` 包、共 36 單位、到貨前短缺 0、現貨可用 10 整天。
- `S=2`：`targetN=1200`、`needN=1140`、4 包、共 48 單位、到貨前估計短缺 5、現貨可用 2 整天。

## 明確非目標

不處理在途訂單、多倉庫、單位換算、單價、折扣、供應商或購物 API、需求/季節預測、保存期限、保質期、批次、採購批准或付款。數學只依使用者提供的期間總用量作固定平均耗用估算，不能反映可變耗用、季節性或在途貨物，也不保證實際短缺或補貨結果。


---

## 原文件 TECHNICAL.md

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


---

## 原文件 UX-SEO.md

# 補貨數量試算介面與 SEO 規格

狀態：M0 規格，尚無實際畫面。此工具是 Product App，不是行銷 landing page。工作區沿用 Gloss Tools 語意 tokens 和安全/可及性底線，版面為本工具的補貨工作表，不複製其他工具或通用 SaaS 儀表板。

## 工作與視覺層級

使用者先知道要填期間用量、現貨、到貨時間和包裝規格，再清楚按一次試算。工作表本身是最大區域；不要用裝飾性 hero、等尺寸卡片、假圖表或高亮數字取代真實輸入。

- 一個主要動作：`試算補貨` / `Calculate restock`。
- 主要輸入附近就地說明觀測期間、到貨天數和到貨後涵蓋期的關係；固定平均耗用及到貨假設可在明確命名的「計算方式」說明區展開。
- 最多 30 列，以表格式工作表表達；新增/刪除操作和受影響列相鄰。不要以拖曳作唯一操作。
- 試算結果直接放在輸入工作表下方；文字報告是完整唯讀 textarea，可鍵盤聚焦和選取。沒有複製或下載按鈕。
- 成功、警告與錯誤同時使用文字、圖示及顏色，不以顏色單獨表意。補貨量 0 仍顯示，不隱藏該列。
- 使用 family tokens：暖紙色工作面、墨色正文、酸綠僅用於主要完成/安全選擇，珊瑚作有限強調，不以珊瑚小字呈現風險。操作數值可用 monospace；表單標籤用 UI 字型與系統 fallback，不下載字型。

## Desktop 工作表草圖

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Gloss Tools / 補貨數量試算              Home     English              │
├──────────────────────────────────────────────────────────────────────┤
│ 補貨數量試算                                                        │
│ 依已知用量與現貨，估算要補幾包及到貨前是否可能短缺。                 │
│ 觀測天數 [30]   到貨天數 [7]   到貨後涵蓋天數 [30]                   │
│ 固定平均估算 · 訂單假設在到貨天數結束時可用 [計算方式 ▾]             │
│                                                                      │
│ 品項       單位  期間用量  現貨  安全備量  每包單位數                 │
│ [名稱]     [ml]  [整數]   [整數] [整數]   [整數]       [移除]         │
│ [＋ 新增品項]       [範例：一般補貨] [範例：到貨前短缺]                │
│ [清除全部]                                      [試算補貨]            │
│                                                                      │
│ 結果（按下試算後出現）                                               │
│ 每列：建議包數 / 總單位 / 到貨前估計短缺 / 現貨可用整天數             │
│ 完整採購文字（readonly，可鍵盤選取）                                 │
└──────────────────────────────────────────────────────────────────────┘
```

寬版只用一個工作區，不加無關側欄。結果和警告就在對應品項旁/下方；總假設留在結果標題附近。長清單在頁面內自然捲動，不截斷結果或報告。

## Mobile 320 CSS px 草圖

```text
┌──────────────────────────────┐
│ 補貨數量試算     English     │
│ 依已知用量估算補貨量。       │
│ 觀測天數 [30]                │
│ 到貨天數 [7]                 │
│ 到貨後涵蓋 [30]              │
│                              │
│ 品項 1                       │
│ 名稱 [________________]      │
│ 單位 [___]                   │
│ 期間總用量 [___]             │
│ 現貨 [___]                   │
│ 安全備量 [___]               │
│ 每包單位數 [___]             │
│ [移除品項]                   │
│ [新增品項]                   │
│ [範例] [清除全部]            │
│ [試算補貨]                   │
│ 結果與完整文字報告           │
└──────────────────────────────┘
```

320 CSS px 下欄位單欄堆疊，不出現整頁水平捲動；操作按鈕達 44×44 CSS px 目標，動態列和警告不遮住焦點或主動作。200% 縮放仍保留欄位、錯誤、按鈕與整份報告。

## 狀態文案

| 狀態 | 繁中 | English |
|---|---|---|
| 初始 | 填好每個品項，再按「試算補貨」。目前尚未計算。 | Fill in each item, then select “Calculate restock.” Nothing has been calculated yet. |
| 草稿已變更 | 輸入已變更；舊結果已清除。請重新試算。 | Inputs changed. The previous result was cleared. Calculate again. |
| 計算中 | 正在試算補貨… | Calculating restock… |
| 成功 | 已完成試算。結果依目前輸入與固定平均耗用假設計算。 | Plan calculated from the current inputs using the fixed-average-use assumption. |
| 空結果 | 目前估算不需要補貨；仍列出到貨前短缺與現貨可用天數。 | The estimate calls for no new packs. Shortage and stock runway are still shown. |
| 零用量 | 觀測用量為 0；現貨可用天數無法估算。安全備量仍會計入補貨量。 | Observed use is zero, so stock runway is not estimated. Safety reserve still affects the order. |
| 欄位錯誤 | 請檢查標示的欄位。其他品項不會先產生部分結果。 | Check the marked field. No partial item results were produced. |
| 系統限制 | 此頁無法安全完成試算。請重新載入後再試；資料不會送到其他服務。 | This page cannot safely complete the calculation. Reload and try again; data is not sent to another service. |
| 無結果報告 | 試算成功後會在此顯示完整可選取的文字。 | The complete selectable report appears here after a successful calculation. |

輸入錯誤需在欄位旁以語意提示修正方式，不顯示技術代碼、不把原始內容回顯到警示、不只用紅色框表示。聚焦只在使用者提交錯誤後移到第一個錯誤欄位；輸入中不搶焦點。

## 確認與語言切換文案

所有確認都在頁內呈現，不呼叫瀏覽器原生確認/提示或 OS 對話框。取消始終保留畫面現狀。

| 用途 | 繁中 | English |
|---|---|---|
| 切換語言（有非初始草稿或結果） | 切換語言會離開此頁並清除此頁輸入與結果。此工具不會自動保存。要切換嗎？ | Changing language leaves this page and clears its inputs and result. This tool does not save automatically. Continue? |
| 載入範例 | 載入範例會取代目前輸入並清除結果；載入後不會自動試算。要繼續嗎？ | Loading this example replaces the current inputs and clears the result. It will not calculate automatically. Continue? |
| 清除全部 | 清除會恢復預設天數和一列空白品項，並清除結果。要清除嗎？ | Clear resets the day values and leaves one blank item. The result will be cleared. Continue? |
| 確認按鈕 | 切換語言 / 載入範例 / 清除全部（依情境） | Change language / Load example / Clear all (by context) |
| 取消按鈕 | 取消 | Cancel |

語言控制是正常連結，href 指向另一固定路由；若草稿等於初始預設且無結果，可直接導航。若有任何非初始草稿或結果，先開可及頁內確認區。確認後才導航；取消回原連結焦點，不清除欄位。新語言頁是新草稿，不承諾跨語保留。

## 可及性與互動

- 所有欄位有持續可見的 label、就近 help/error 和明確單位。數字用文字 input 加 `inputmode="numeric"`，避免 number input 自動接受小數/指數字串；欄位以核心嚴格驗證為準。
- 所有工作可用鍵盤完成；DOM 順序與視覺順序一致；focus ring 清楚且不被 sticky 區遮住。新增/刪除、範例、清除、確認、提交和報告文字都可鍵盤操作。
- 每次輸入改變立刻清結果；IME composition 的輸入也先清舊結果，但組字中不重寫欄位、不觸發驗證/計算/焦點移動，`compositionend` 後使用者才可提交。
- 初始載入無 JavaScript 時，資料欄位和試算按鈕維持 disabled；沒有可 GET 提交的 form。noscript 提示啟用本頁程式，不能宣稱資料可以保存或離線使用。
- 結果狀態以簡短 `role="status"` 通知；錯誤以欄位關聯和合適 live region 宣告，不一次朗讀 30 列報告。文字報告是 readonly textarea，保留完整內容和可選取性。
- 尊重 `prefers-reduced-motion`。不使用自動動畫；不支援彩色獨立狀態。
- 驗收目標 WCAG 2.2 AA。對比、200% 縮放、320 CSS px、IME、純鍵盤和輔助科技須依 ACCEPTANCE 分層記錄；焦點事件未解除前所有本機互動 UI 均為 `NOT_RUN_USER_FOCUS_INCIDENT`。

## SEO 文案

這些是預定可索引正式頁的文案，不代表目前已有網域或排名。M1 預覽對兩頁都設 noindex/nofollow，不提交 sitemap，不提供 production canonical。

| 欄位 | 繁中頁 `/index.html` | 英文頁 `/en/index.html` |
|---|---|---|
| `lang` | `zh-Hant` | `en` |
| title | `補貨數量試算｜Gloss Tools` | `Restock Quantity Planner \| Gloss Tools` |
| description | `用觀測用量、現貨、到貨天數、安全備量與每包數量，估算補貨包數、到貨前短缺與現貨可用整天數。` | `Estimate restock packs, possible shortage before arrival, and whole days of stock from observed use, current stock, lead time, reserve, and pack size.` |
| H1 | `算出這次要補幾包` | `Plan how many packs to restock` |
| 導言 | `填入已知期間用量和現貨，檢視固定平均耗用假設下的補貨估算。` | `Enter observed use and current stock to review a restock estimate under a fixed-average-use assumption.` |

正式候選預定為 `https://restock.glossquote.com/index.html` 與 `https://restock.glossquote.com/en/index.html`。只有 M2 才能在 production 檔加入兩頁 self-canonical、reciprocal `hreflang="zh-Hant"` / `hreflang="en"` 和 `x-default` 指向中文頁。robots/sitemap 只列實際預定兩頁並允許必要頁面資產；404 設 noindex。兩頁有繁中/英文互連、visible FAQ 與對應 WebApplication JSON-LD；CSP 僅對 JSON-LD 加精確 hash，無 `unsafe-inline`、`unsafe-eval`、外部資產或第三方連線。具體 M2 gate 依 `docs/RELEASE.md`。

### 繁中 FAQ（須在頁面可見）

1. **這個工具怎麼算出建議補幾包？** 先用觀測期間總用量估固定平均耗用，再計入到貨前天數、到貨後希望涵蓋的天數與安全備量，扣掉現貨，最後依每包單位數向上取整。它是依輸入假設的估算，不是需求預測。
2. **如果觀測用量是 0，還會計算嗎？** 會。用量為 0 時不估算現貨可用整天數；安全備量仍會納入目標，所以仍可能需要補貨。
3. **在途訂單會扣進現貨嗎？** 不會。此版只看目前現貨，不處理在途訂單或多倉庫；耗用改變時，固定平均估算也可能不符合實際情況。

### English FAQ (visible on page)

1. **How does the planner estimate the number of packs?** It estimates a fixed average from observed use, includes lead time, desired coverage after arrival and safety reserve, subtracts current stock, then rounds up to whole packs. It is an estimate from your inputs, not a demand forecast.
2. **Can it calculate when observed use is zero?** Yes. Stock runway is not estimated at zero use. Safety reserve still counts toward the target, so an order may still be suggested.
3. **Are incoming orders included in current stock?** No. This version uses current stock only and does not handle incoming orders or multiple warehouses. A changing usage rate may make the fixed-average estimate inaccurate.

## M2 搜尋與發布限制

不宣稱搜尋量、排名、需求或節省金額。M2 必須從實際候選檔重驗 canonical、雙語互連、x-default、可見且匹配的 FAQ/WebApplication JSON-LD、CSP hash、robots、兩頁 sitemap、404 noindex、安全標頭和 `dist-production/` allowlist。M3 才由主代理部署並更新雙語首頁。來源發布不等於 live site；外部驗收狀態依實際證據填寫。


---

## 原文件 ACCEPTANCE.md

# 補貨數量試算驗收規格

狀態：M0 驗收計畫，尚未執行。所有案例是實作後的獨立 oracle，不能把規格案例、測試數或 Node 通過率描述成產品驗收率。

## 執行分層

| 層級 | 能證明什麼 | 狀態/邊界 |
|---|---|---|
| Core | 純函式 schema、BigInt 算式、錯誤優先、報告文字和輸入不變 | M1 由 `node:test` 離線跑；M0 尚無實作，未跑。 |
| Build/check | 語法、危險 DOM/API 掃描、無 inline CSS/JS/遠端資產、輸出 allowlist、M1 `dist/` bytes | M1 建置後跑；不是 UI 或資料不外傳的證明。 |
| Loopback HTTP | 本機兩頁、精確 MIME、GET/HEAD、405、404、Host 421、安全標頭、只提供 `dist/` | M1 用隔離 Node harness；不開瀏覽器。 |
| Browser UI | 真實欄位互動、焦點、頁面生命週期、渲染、IME、響應式 | 所有本機互動 browser/native/CUA 暫停；`NOT_RUN_USER_FOCUS_INCIDENT`，須 primary 先證明真隔離並明確放行。 |
| 真機/輔助科技 | 手機、低階裝置、螢幕閱讀器、鍵盤/縮放的實際體驗 | 不以 Node、DOM harness 或 HTTP 代替；未有真實設備證據即 `NOT_RUN`。 |
| Production/live | 公開檔、SEO/headers、部署、首頁連結與外部使用 | M2 主代理 GO 後建立 candidate；M3 主代理執行。M0 尚未建立或部署，不能標 live pass。 |

Core 測試使用內建 `node:test`、手寫 expected 和 fake input，不讀網路、帳戶、憑證或真實庫存。至少檢查純函式不變輸入、deep equality、JSON.stringify 成功、輸出無 BigInt，以及公式對每個 item 同時成立：`needN=max(0,targetN-stockN)`、`packs×D×P >= needN`、若 packs>0 則 `(packs−1)×D×P < needN`、短缺是 `ceil(shortageN/D)`、runway 是 `floor(SD/U)` 或 null。

下表的成功向量欄位依序為：`targetNumeratorUnitDays / stockNumeratorUnitDays / needNumeratorUnitDays / packDenominatorUnitDays / packsToOrder / orderUnits / shortageNumeratorUnitDays / shortageBeforeArrivalUnits / runwayWholeDays / averageDailyUse.roundedTo3`。向量內數值是精確 JSON 數字，日均欄位是有三位小數的字串。除明列外，輸入都以 `BASE` 為底並只改指定欄位。

```text
BASE = {
  observationDaysRaw: "30", leadDaysRaw: "7", coverageDaysRaw: "30",
  items: [{ id: "item-1", nameRaw: "藍色塗料", unitRaw: "ml",
    usedRaw: "30", stockRaw: "10", reserveRaw: "3", packSizeRaw: "12" }]
}
```

## Core 可重現案例

| ID | 輸入/步驟 | 精確預期 |
|---|---|---|
| C01 | `BASE` | `{ok:true,result:{schemaVersion:1,assumptions:{observationDays:30,leadDays:7,coverageDays:30,arrivalTiming:"end-of-lead-period",usageModel:"fixed-average"},items:[{id:"item-1",name:"藍色塗料",unit:"ml",observedUseUnits:30,currentStockUnits:10,safetyReserveUnits:3,packSizeUnits:12,averageDailyUse:{numeratorUnits:30,denominatorDays:30,roundedTo3:"1.000"},targetNumeratorUnitDays:1200,stockNumeratorUnitDays:300,needNumeratorUnitDays:900,packDenominatorUnitDays:360,packsToOrder:3,orderUnits:36,shortageNumeratorUnitDays:0,shortageBeforeArrivalUnits:0,runwayWholeDays:10}]}}`。 |
| C02 | `BASE`，`stockRaw="2"`（缺貨範例） | `[1200,60,1140,360,4,48,150,5,2,"1.000"]` |
| C03 | `stockRaw="40"`，目標恰好滿足 | `[1200,1200,0,360,0,0,0,0,40,"1.000"]` |
| C04 | `stockRaw="39"`，低於目標 1 單位 | `[1200,1170,30,360,1,12,0,0,39,"1.000"]` |
| C05 | `stockRaw="7"`，到貨前需求剛好等於現貨 | `[1200,210,990,360,3,36,0,0,7,"1.000"]` |
| C06 | `stockRaw="6"`，到貨前差 1 單位 | `[1200,180,1020,360,3,36,30,1,6,"1.000"]` |
| C07 | `stockRaw="0"` | `[1200,0,1200,360,4,48,210,7,0,"1.000"]` |
| C08 | `leadDaysRaw="0"` | `[990,300,690,360,2,24,0,0,10,"1.000"]` |
| C09 | `coverageDaysRaw="1"` | `[330,300,30,360,1,12,0,0,10,"1.000"]` |
| C10 | `coverageDaysRaw="365"` | `[11250,300,10950,360,31,372,0,0,10,"1.000"]` |
| C11 | `reserveRaw="0"` | `[1110,300,810,360,3,36,0,0,10,"1.000"]` |
| C12 | `packSizeRaw="10"` | `[1200,300,900,300,3,30,0,0,10,"1.000"]` |
| C13 | `packSizeRaw="1"` | `[1200,300,900,30,30,30,0,0,10,"1.000"]` |
| C14 | `usedRaw="0"`,`stockRaw="0"`,`reserveRaw="3"` | `[90,0,90,360,1,12,0,0,null,"0.000"]`；安全備量仍會使訂單為 1 包，runway 為 null。 |
| C15 | `usedRaw="0"`,`stockRaw="0"`,`reserveRaw="0"` | `[0,0,0,360,0,0,0,0,null,"0.000"]` |
| C16 | `usedRaw="0"`,`stockRaw="3"`,`reserveRaw="3"` | `[90,90,0,360,0,0,0,0,null,"0.000"]` |
| C17 | `usedRaw="0"`,`stockRaw="2"`,`reserveRaw="10"`,`packSizeRaw="4"` | `[300,60,240,120,2,8,0,0,null,"0.000"]` |
| C18 | 共用 `D=2,L=1,C=1`；列 `U=1,S=0,R=0,P=1` | `[2,0,2,2,1,1,1,1,0,"0.500"]` |
| C19 | 共用 `D=80,L=0,C=1`；列 `U=1,S=0,R=0,P=1`，half-up 正好落在 0.0125 | `[1,0,1,80,1,1,0,0,0,"0.013"]` |
| C20 | 共用 `D=365,L=0,C=1`；列 `U=1,S=0,R=0,P=1` | `[1,0,1,365,1,1,0,0,0,"0.003"]` |
| C21 | `leadDaysRaw="365"`,`stockRaw="0"` | `[11940,0,11940,360,34,408,10950,365,0,"1.000"]` |
| C22 | 共用 `D=365,L=0,C=1`；列 `U=1,S=0,R=0,P=10000` | `[1,0,1,3650000,1,10000,0,0,0,"0.003"]` |
| C23 | 共用 `D=365,L=365,C=365`；列 `U=1000000,S=0,R=1000000,P=1` | `[1095000000,0,1095000000,365,3000000,3000000,365000000,1000000,0,"2739.726"]` |
| C24 | 共用 `D=1,L=365,C=365`；列 `U=1000000,S=0,R=1000000,P=1`，最大 packs 邊界 | `[731000000,0,731000000,1,731000000,731000000,365000000,365000000,0,"1000000.000"]` |
| C25 | 30 列、ID `item-1..item-30`、唯一名稱，所有數值採 BASE row | `ok:true`；剛好 30 個結果，依順序各自向量為 `[1200,300,900,360,3,36,0,0,10,"1.000"]`，沒有截斷或合併。 |
| C26 | common 欄位合法；`items` 長度 31，index 0 定義會增加計數的 getter | `{ok:false,error:{code:"ITEM_LIMIT",field:"items"}}` 且 getter 呼叫數為 0；長度上限先於陣列枚舉。 |
| C27 | common 欄位合法；`items=[]` | `{ok:false,error:{code:"ITEM_COUNT",field:"items"}}` |
| C28 | common 欄位合法；`items.length=1` 但 index 0 是洞 | `{ok:false,error:{code:"ITEM_HOLE",field:"items[0]"}}` |
| C29 | BASE root 的 `observationDaysRaw` 改為計數器 getter | `{ok:false,error:{code:"INPUT_PROPERTY",field:"observationDaysRaw"}}` 且 getter 呼叫數為 0。 |
| C30 | BASE row 的 `usedRaw` 改為計數器 getter | `{ok:false,error:{code:"ROW_PROPERTY",field:"items[0].usedRaw"}}` 且 getter 呼叫數為 0。 |
| C31 | BASE root 再加未知 symbol own key | `{ok:false,error:{code:"INPUT_UNKNOWN_FIELD",field:"input"}}`。 |
| C32 | 兩列皆合法但第 2 列 `id` 與第 1 列相同 | `{ok:false,error:{code:"ROW_ID_DUPLICATE",field:"items[1].id"}}`，不回第一列部分結果。 |
| C33 | BASE 的 `usedRaw="1e2"` | `{ok:false,error:{code:"QUANTITY_FORMAT",field:"items[0].usedRaw"}}`。 |
| C34 | BASE 的 `usedRaw="+1"` | `{ok:false,error:{code:"QUANTITY_FORMAT",field:"items[0].usedRaw"}}`。 |
| C35 | BASE 的 `usedRaw="1000001"` | `{ok:false,error:{code:"QUANTITY_RANGE",field:"items[0].usedRaw"}}`。 |
| C36 | BASE 的 `observationDaysRaw=" 30"` | `{ok:false,error:{code:"DAY_FORMAT",field:"observationDaysRaw"}}`；不 trim 數值字串。 |
| C37 | `nameRaw` 為 81 個 emoji 碼點（162 code units） | `{ok:false,error:{code:"NAME_CODEPOINT_LIMIT",field:"items[0].nameRaw"}}`。 |
| C38 | BASE 的 `unitRaw` 含 `U+2028` | `{ok:false,error:{code:"UNIT_LINE_SEPARATOR",field:"items[0].unitRaw"}}`；一般 emoji/Unicode 仍保留。 |
| C39 | BASE 的 `nameRaw` 含單獨 high surrogate | `{ok:false,error:{code:"NAME_SURROGATE",field:"items[0].nameRaw"}}`。 |
| C40 | BASE row 加未知 own string 欄位 `extra` | `{ok:false,error:{code:"ROW_UNKNOWN_FIELD",field:"items[0]"}}`。 |
| C41 | BASE row 移除 `stockRaw` | `{ok:false,error:{code:"ROW_MISSING_FIELD",field:"items[0].stockRaw"}}`。 |
| C42a | 用 BASE 呼叫 `formatRestockReport(result,"zh-Hant")` | 回 `{ok:true,text:...}`，全文精確為下方「報告 oracle 繁中」。 |
| C42b | 另以英文 row fixture `nameRaw="Blue paint"` 計算，再呼叫 `formatRestockReport(result,"en")` | 回 `{ok:true,text:...}`，全文精確為下方「報告 oracle English」。使用者名稱不自動翻譯。 |
| C43 | 複製 C01 結果，只把 `items[0].packsToOrder=1`，保留 `orderUnits=36` 後格式化 | `{ok:false,error:{code:"REPORT_INPUT",field:"result"}}`；formatter 重新驗算，拒絕自相矛盾採購文字。 |
| C44a | formatter 的 `result.items` 為 31 列且 index 0 getter 計數 | `{ok:false,error:{code:"REPORT_INPUT",field:"result"}}` 且 getter 呼叫數為 0；長度 gate 先於枚舉。 |
| C44b | formatter 的 `result.items` 長度 1 但 index 0 是洞 | `{ok:false,error:{code:"REPORT_INPUT",field:"result"}}`；不格式化部分結果。 |
| C44c | formatter 的一列 `packsToOrder` 為 accessor 計數 getter | `{ok:false,error:{code:"REPORT_INPUT",field:"result"}}` 且 getter 呼叫數為 0。 |
| C44d | formatter 的一列增加未知 own key `extra` | `{ok:false,error:{code:"REPORT_INPUT",field:"result"}}`。 |

### 報告 oracle 繁中

以下是 C42a 的完整字串；最後一行後沒有 LF：

```text
補貨數量試算
估算假設：以觀測期間平均用量固定計算；訂單在到貨天數結束時可用。
觀測期間：30 天；到貨天數：7 天；到貨後目標涵蓋：30 天。

1. 藍色塗料
單位：ml；觀測用量：30 ml；現貨：10 ml；安全備量：3 ml；每包含：12 ml
平均每日用量：1.000 ml/日；現貨可用：10 整天
到貨前估計短缺：0 ml
建議補貨：3 包（共 36 ml）
```

### 報告 oracle English

以下是 C42b 的完整字串；最後一行後沒有 LF：

```text
Restock quantity plan
Estimate: usage stays at the observed average; the order is available at the end of the lead period.
Observation: 30 days; lead time: 7 days; desired coverage after arrival: 30 days.

1. Blue paint
Unit: ml; observed use: 30 ml; current stock: 10 ml; safety reserve: 3 ml; units per pack: 12 ml
Average daily use: 1.000 ml/day; current stock runway: 10 whole days
Estimated shortage before arrival: 0 ml
Order: 3 packs (36 ml)
```

## Browser UI 驗收步驟（待執行）

以下每項目前均為 `NOT_RUN_USER_FOCUS_INCIDENT`；M0 尚未實作，且在主代理證實隔離環境並明確放行前不可操作本機 UI。步驟中的錯誤碼只用於純核心對照；UI 不要求顯示代碼，只需有等義兩語提示、拒絕或失效行為。

| ID | 步驟 | 預期 | 目前狀態 |
|---|---|---|---|
| B01 | 開繁中 `/index.html` 和英文 `/en/index.html` | 預設天數 30/7/30、一列空白，結果區空、試算未發生；`lang` 和所有標籤語言正確。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B02 | 不填品項按試算 | 將第一個缺欄貼近欄位提示；不出部分結果或報告，不顯示內部錯誤碼。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B03 | 分別選「一般補貨」和「到貨前短缺」兩個固定範例，各自測試確認取消、確認載入及手動按試算 | 取消時原草稿/結果不變；確認載入只改草稿，需再按試算；兩例結果分別為 3 包/36 單位/短缺 0/10 天，及 4 包/48 單位/短缺 5/2 天。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B04 | 先成功試算，再改任一 shared day/item 欄 | 輸入改變當下清空舊結果/報告/成功狀態；無舊結果可再被選取；需重算。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B05 | 清除已填草稿並在確認面板選取消，再重新開啟選確認 | 取消保留所有原欄位與結果；確認後恢復預設天數、一個空列、空結果。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B06 | 初始狀態按切換語言；再填草稿後按切換，先取消再確認 | 初始狀態可直接導航；非初始時取消留在本頁且原稿/結果不變，確認才到固定另一語言頁；新頁是空白初始狀態，返回 BFCache 後也不還原舊草稿。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B07 | 填 30 列，再嘗試新增第 31 列 | 30 列合法可完成；第 31 次新增不可生效且按鈕 disabled/明示上限，無截斷。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B08 | 以合法測值把用量設 0、現貨 0、安全備量 3、包裝 12，完成試算 | 估算補 1 包/12 單位；日均 0.000；現貨可用日數顯示無法估算，不拒絕整列。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B09 | 將名稱填成 `<img src=x onerror=alert(1)>`，其他數字合法並試算 | 名稱/報告逐字顯示，不建立 img、不執行腳本、不新增網路請求；頁面只把輸入當文字。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B10 | 完全不用滑鼠，以 Tab/Shift+Tab、Enter/Space 完成新增、刪除、試算、確認、取消、報告選取 | 順序符合閱讀與視覺；focus 可見不遮蔽；沒有鍵盤陷阱；確認取消回到啟動控制。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B11 | 320 CSS px viewport 逐欄填寫並檢結果，另以 200% zoom 檢視 | 無整頁水平捲動或遮住焦點的 sticky 區；欄位、錯誤、按鈕、結果、報告仍可讀與操作。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B12 | 在名稱欄輸入法組字時改變內容 | `compositionstart`/組字 input 時舊結果已失效；工具不重寫輸入、不搶焦點或提交；組字結束後可手動重新試算。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B13 | 使用螢幕閱讀器檢查初始、錯誤、成功及 30 列 | label/help/error 關聯正確；狀態不靠顏色；live region 不朗讀整份 30 列報告。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B14 | 成功試算後導航離開，若瀏覽器保留 BFCache，再返回 | `pagehide` 清空欄位/JS draft/result/report；`pageshow.persisted` 重新顯示初始空白狀態。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B15 | 觀察初次載入、試算、編輯、隱藏頁面與 `pagehide` 的完整 Network/Storage | 不得有含輸入的 URL、fetch/XHR、telemetry/beacon、cdn-cgi/rum、第三方連線或 storage/cookie/IndexedDB/service-worker 寫入；同源靜態資產可依頁面載入。此項需要真瀏覽器工具，純 Node/grep 不算。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B16 | 以 DevTools 離線模式測已載入頁並重新載入 | 可記錄設備實際行為，但不得把結果描述成永久離線保證；初始載入需要取得靜態檔案，產品沒有 service worker。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B17 | 在低階手機/裝置以 30 列完成試算、編輯和結果閱讀 | 不因窄螢幕或一般長清單失去功能；記錄設備/瀏覽器，未在真實低階裝置測試前保持 NOT_RUN。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B18 | 關閉 JavaScript 後載入頁面並按 Enter | 編輯欄與試算按鈕保持 disabled；沒有未阻止的表單 GET、query-string 或外送請求；有 noscript 說明。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B19 | 成功後聚焦 readonly 報告並用鍵盤選取全文 | 全部列都可選，不截斷；不存在複製按鈕、Clipboard API 或下載動作。此步不操作 OS clipboard。 | `NOT_RUN_USER_FOCUS_INCIDENT` |

## Build、HTTP、隱私與 production 交接

M1 必跑離線命令由 TASKS.md 定序：`npm test`、`npm run check`、`npm run build`、`npm run check:http`。server 只能 loopback，遇 port 衝突回報，不得終止未知程序。這些命令不會解鎖 Browser UI gate。

M1 核對 `GET`/`HEAD`、其他 method 405 且 `Allow: GET, HEAD`、hostname 大小寫正規化後僅允許 `127.0.0.1:4217`/`localhost:4217`、缺少或未知 Host 為 421；`/index.html` 和 `/en/index.html` 回 200、`/` 和其他未知 path 回 404。核對 exact MIME（HTML/CSS/ESM）、`HEAD` 無 body 且 headers 等同 GET、`noindex,nofollow`、`Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`、`X-Content-Type-Options: nosniff`、`Referrer-Policy: no-referrer`，無 inline CSS/JS/遠端資產，且只提供 `dist/`。確認 preview build 不含 docs/tests/evidence。對無資料儲存、完整 Network、BFCache、手機與 AT 的聲明必須有適合層級的證據；不可用 source grep、check、Node DOM 假環境或 HTTP 冒稱真瀏覽器證明。

M1 檔案明確 noindex；M2 需要 primary GO，重新建 `dist-production/` 並實際核對雙語 canonical/hreflang/x-default、FAQ/JSON-LD/CSP hash、robots 長前綴 allowlist、兩頁 sitemap、404 noindex、安全標頭、closed static 資產範圍和正式 HTTP 回應。M2 GitHub source 與 M3 Cloudflare/首頁是不同證據；M0 不存在任一結果。


---

## 原文件 TASKS.md

# 補貨數量試算任務順序

本文件依序列出 M0 規格、M1 本機候選、M2 source/production 候選與 M3 主代理發布。一次只進行當前核准任務；失敗先修該任務並重跑受影響 gate，不往後勾選。正式產品仍未實作，M0 完成不等於 M1 或發布完成。

## T00 — M0 完整規格

- **前置：** 已有本工具 `AGENTS.md`、共用 `docs/` 和 M0 任務指示。
- **Allowed paths：** `README.md`、`PRODUCT.md`、`TECHNICAL.md`、`UX-SEO.md`、`ACCEPTANCE.md`、`TASKS.md`。
- **步驟：** 寫成可由一般實作者直接遵循的繁中規格；固定 schema、錯誤順序、BigInt 計算、SEO、生命週期、M1/M2/M3 邊界和精確測例；不建立產品程式或功能對話。
- **驗收：** 六檔齊全；交叉比對樣例、錯誤向量、文件連結、路徑、UI NOT_RUN 和 release 狀態。沒有宣稱實作/測試通過。
- **命令：** 不執行 runtime/build/UI 命令；由規格作者做唯讀文件檢查。
- **完成條件：** 六份文件交主代理審查並取得 M1 書面放行。

## M1 — 本機雙語候選

### T01 — 靜態骨架、Node scripts 與建置輸出

- **前置：** 主代理已核准 M0；原功能對話已建立；遵守本工具 `AGENTS.md`。
- **Allowed paths：** `package.json`、`.gitignore`、`public/index.html`、`public/en/index.html`、`public/styles/tokens.css`、`public/styles/app.css`、`scripts/serve.mjs`、`scripts/check.mjs`、`scripts/build.mjs`、`test/project.test.mjs`、`dist/**`。
- **步驟：** 建 `private:true`、`type:module`、無依賴的 package；建立雙語 noindex 初始頁與必要本地 stylesheet/module 外殼；所有輸入/試算 controls 在 JS 前 disabled，無 GET form；建置只把 public allowlist 複製到 `dist/`；loopback server 只綁 `127.0.0.1:4217` 並只提供 dist。
- **驗收命令：** 建好 scripts/test 後才跑 `npm test`、`npm run check`、`npm run build`。確認無外部資源、M1 有 noindex、沒有 `dist-production/`、server 只 loopback。此任務未建 `check:http` 前不要執行該命令。
- **完成條件：** 三命令成功；輸出只有明確允許的兩個語言頁、必要同源 JS/CSS；記錄實際 bytes/hash 和錯誤。

### T02 — 嚴格 schema、BigInt 核心與報告

- **前置：** T01 完成；骨架 `npm test`、check、preview build 通過。
- **Allowed paths：** `public/js/core/schema.mjs`、`public/js/core/calculate.mjs`、`public/js/core/report.mjs`、`test/core.test.mjs`、`test/report.test.mjs`。
- **步驟：** 精確實作 `calculateRestockPlan(input)`、結果 schema、第一錯誤優先序、長度先驗、getter 不執行、BigInt 計算、safe JSON 整數與一致性驗證 formatter。每個案例用手寫 expected；不得依被測函式產生 oracle。
- **驗收命令：** `npm test`、`npm run check`。
- **完成條件：** ACCEPTANCE.md 所有 C 案例通過；getter counter 為 0；所有原始輸入不變；output 可 JSON stringify 且不含 BigInt；沒有部分計算或跳過非法品項。

### T03 — 雙語工作表與本機狀態

- **前置：** T02 完成；核心與報告測試通過。
- **Allowed paths：** `public/index.html`、`public/en/index.html`、`public/js/app.js`、`public/styles/app.css`、`public/styles/tokens.css`、`public/js/core/**`（只限修正本階段發現的介面契約問題）、`test/app-state.test.mjs`。
- **步驟：** 建繁中/英文獨立工作表、共用天數欄、可增刪 1–30 品項、明示假設、頁內範例/清除/離開確認、成功結果與完整 readonly 報告。輸入變更立即失效；IME composition 時也立即失效舊結果但不重寫欄位/驗證/搶焦點。使用安全文字 API、無 storage/URL/network/console。
- **驗收命令：** `npm test`、`npm run check`、`npm run build`。
- **完成條件：** app state 測試涵蓋輸入失效、刪改、確認取消、pagehide 清除、BFCache 初始狀態與無 JS disabled contract。不得用 Node/DOM harness 宣稱 UI 通過。

### T04 — M1 輸出、安全標頭與 HTTP gate

- **前置：** T03 完成；所有離線 core/app-state 測試通過。
- **Allowed paths：** `package.json`、`scripts/serve.mjs`、`scripts/check.mjs`、`scripts/http-check.mjs`、`test/http.test.mjs`、`public/**`、`dist/**`、`HANDOFF.md`、`TASK-ENTRY.md`、`project.json`。
- **步驟：** HTTP 實際檢查 GET/HEAD、405+Allow、Host、精確 MIME/路由、根與未知路徑 404、noindex、CSP/安全標頭、只提供 dist。確認 M1 沒 inline JS/CSS、遠端資產、production 候選或 secret。server 測試程序只能由本次 harness 啟動/結束；port 衝突就停止並回報，不碰未知程序。
- **驗收命令：** 先增加 `check:http` script 和 harness，再跑 `npm test`、`npm run check`、`npm run build`、`npm run check:http`。`npm run dev` 只在需要明確檢查 loopback server 時執行；不得開 browser/UI。
- **完成條件：** 所有 HTTP oracle 與安全標頭通過，環境 guard 前後相同，source/diff 範圍合規。UI/IME/mobile/AT/network/storage/BFCache 依真實證據標 `NOT_RUN_USER_FOCUS_INCIDENT` 或其他精確 NOT_RUN；不自行填 PASS。更新 `HANDOFF.md`、`TASK-ENTRY.md`、`project.json` 寫實際 M1 狀態。

## M2 — 主代理 GO 後的 source 與 production 候選

### T05 — 獨立 production 輸出與公開 source

- **前置：** M1 原功能對話完整交接；主代理書面 GO；Git guard、Windows 安全規則與 `docs/GIT-PUBLICATION-SAFETY.md` 全部可遵守。必要認證缺失就停止回報，不修改 auth/config。
- **Allowed paths：** `package.json`、`.gitignore`、`public/**`、`scripts/**`、`test/**`、`dist-production/**`、`HANDOFF.md`、`TASK-ENTRY.md`、`project.json`；另僅允許本工具在 `.runs/restock-planner/` 下新建的一個 M2 證據子目錄。不可改六份核准規格、共用首頁或兄弟專案。
- **步驟：** 增加獨立 `dist-production/`、production build/check/preview/release-check；實際核對正式雙語 URL/canonical/hreflang/x-default、visible FAQ/JSON-LD 精確 CSP hash、robots/sitemap、404 noindex、安全 headers、Host/route、closed file allowlist 與 M1 bytes 不變。通過後以審核 copy 發布到獨立 public repo `KYStr/glossquote-labs-restock-planner`，驗證 remote commit/visibility 並記錄證據；遵守 Git guard 和 per-command `git -c` 限制。
- **驗收命令：** `npm test`、`npm run check`、`npm run build`、`npm run check:http`、`npm run build:production`、`npm run check:production`、`npm run release:check`；以 `npm run preview:production` 驗 loopback `127.0.0.1:5217`。只在所有本機檢查通過及 GO 已有後發布 source；不得 Cloudflare deploy。
- **完成條件：** production candidate 和 public source 的 commit、visibility、hash、HTTP/SEO/check 證據寫入本工具 HANDOFF/evidence；source publication 不標 live hosting；UI gate 保留實際 NOT_RUN。

## M3 — 主代理 hosting 與首頁

### T06 — 部署與雙語首頁整合（主代理專責）

- **前置：** T05 source/production 候選經主代理驗收；主代理明確執行發布步驟。
- **Allowed paths：** 僅主代理在其發布/首頁任務中指定的部署與共用首頁路徑；原功能對話不得執行、不得先行改首頁或呼叫部署工具。
- **步驟：** 主代理確認免費部署/網域、M3 設定與正式 assets，部署 `restock.glossquote.com`，更新兩語首頁並驗 live HTTP、導航、SEO/headers/core。
- **驗收：** 由主代理記錄實際 live URL、提交/部署版本、雙語首頁及 NOT_RUN UI 項目；external review 只有外部驗證後才可更新。
- **完成條件：** live 狀態有可重現證據；M3 完成也不等於外部驗收通過。


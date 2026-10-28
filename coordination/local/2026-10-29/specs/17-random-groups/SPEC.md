# 名單隨機分組 — 既有規格保存

Task ID: `labs-17-random-groups` · Spec ID: `spec-17-random-groups`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求：名單隨機分組

狀態：**SPEC_ONLY**，需求與驗收預期尚未實作或驗證。使用情境是假設：活動主持人、教師、帶團者或朋友想把現有名單快速分成指定組數，並確認每個人都被分到一次且各組人數相近。沒有搜尋量、訪談、排名或使用者數據。

## 使用者工作

使用者貼入一人一行的名單，選擇組數，按「產生分組」，檢查所有組別及人數，必要時明確按「重新分組」，再選取結果或按「複製分組」。成功條件是所有有效名單成員恰好出現一次，沒有因重名而合併，組別人數差不超過一人。

## 功能需求

### FR-01：雙語頁與本機工作

- 提供繁體中文 `/index.html` 與英文 `/en/index.html` 兩個完整靜態頁。各頁有正確 `lang`、可達的同語首頁連結與對應語言切換。
- JavaScript 是工具運算必要條件。若未啟用，顯示明確的提示及語言連結，不顯示假結果，並說明名單不會送出。
- 頁面可在本機預覽；正式頁預定在 `groups.glossquote.com`。工具不依賴帳號、外部名單、server-side 運算或網路 API。

### FR-02：名單輸入與正規化

- 文字欄每行代表一位參與者；不要求姓名唯一。原始名單字串最多 **60,000 UTF-16 code units**（JavaScript `String.length`）。上限以正規化前原始字串計；恰為 60,000 接受，多一碼拒絕，不截短。
- 將 `CRLF` 和單獨 `CR` 正規化為 `LF`，再逐行處理。除完全空字串代表沒有提供任何列（忽略數 0）外，將行拆開後逐行呼叫 JavaScript `String.prototype.trim()`。trim 後空白的行忽略，成功解析時顯示忽略行數。名稱保留 trim 後內容，不做 Unicode 正規化、排序或去重。
- 每個非空名稱 trim 後長 1–100 UTF-16 code units，含端點。長度依 JavaScript `.length`，例如一個一般補充平面 emoji 算 2 code units。
- trim 後名稱若含 C0 或 C1 控制碼 `U+0000–U+001F` 或 `U+007F–U+009F`，拒絕整份名單；不刪除或修補控制碼。行尾/行首空白已由 `trim()` 移除，因此邊界 TAB 可移除，中間 TAB 會被拒絕。CR/LF 已先作列分隔符，不會被當成同一名字內的控制碼。
- 有效人數必須是 2–500。錯誤保留原輸入，指出第一個有問題的實體行號或人數範圍，不把姓名回顯到錯誤文字。不得部分接受或略過不合法姓名。
- 成功後按非空有效列的來源順序建立 ID `1..N`。例如輸入 `甲、空行、甲、乙` 得到 `(甲,#1)、(甲,#2)、(乙,#3)`。重名是不同參與者，明確提示「同名會視為不同的人」，結果顯示為 `名字（#序號）`。

### FR-03：組數欄

- 初始組數為字串 `2`。欄位原始值最多 **32 UTF-16 code units**；先檢查此上限，再只去除前後 ASCII whitespace U+0009–U+000D、U+0020。
- trim 後只接受 ASCII `0`–`9` 的一位以上數字；前導零合法。拒絕空值、正負號、逗號、小數、指數、全形數字、內部空白與其他 Unicode 空白。
- 以不失真的整數解析。有效範圍為 `2..min(50,N)`，含端點。少於 2 或大於上限時不產生結果、不消耗隨機值，保留欄值並說明可用範圍。
- 名單更動時重新驗證目前組數；名單縮短後若組數超出新上限，要求修正組數，不自動降低。

### FR-04：隨機來源與分組規則

- 開始前驗證整份名單和組數。正式介面只使用瀏覽器 `crypto.getRandomValues(new Uint32Array(1))` 提供的 32-bit unsigned integer；不可退回 `Math.random`、日期、環境資訊或固定種子。
- 對 Fisher–Yates 每一個整數範圍 `n=i+1`（2 ≤ n ≤ N），計算 `limit=floor(4294967296/n)*n`。讀取 `sample`；只有 `sample < limit` 可接受，回傳 `sample % n`。`sample >= limit` 必須重新取值，以 rejection sampling 消除取模偏差。
- 每個 `uniformBelow(n)` 最多讀取 128 個 uint32 值；若都被拒絕、來源不存在、拋例外或回傳值不在整數 `[0,4294967295]`，停止並回報固定錯誤 `RANDOM_SOURCE_FAILED`。不回傳部分結果，也不使用 fallback。
- 以有效輸入 ID 陣列複製一份，按 Fisher–Yates 的 `i=N−1` 到 `1` 順序，令 `j=uniformBelow(i+1)` 並交換 `ids[i]`、`ids[j]`。不得突變原始名單、以姓名排序或去重。
- 洗牌後維持此順序連續切成 K 組。令 `q=floor(N/K)`、`r=N mod K`，前 r 組各 q+1 人，其餘組各 q 人。所有 ID 恰好出現一次，組數恰為 K，各組大小差 ≤1。
- 這個程式採用瀏覽器密碼學亂數 API 和無偏取樣演算法；不提供公開種子、可重現證明、第三方見證、公開審計或公證抽籤，不保證相鄰兩次結果不同。

### FR-05：產生與重新分組

- 初始主按鈕為「產生分組」。第一次成功後按鈕文字改成「重新分組」，說明再次操作會取代目前結果。
- 成功後原名單和組數保留供檢查；重新分組先清除舊結果與複製狀態，再產生新結果。新名單、新組數、範例載入、清除、`pagehide` 立即清掉結果和舊複製備援，並停用複製。
- 任一輸入無效時主按鈕不可執行；若在輸入有效時來源失敗，也必須保持無結果，不能留著上一版分組。
- 整個核心工作最多 500 人，為同步且有界的操作；不需要 Web Worker、載入動畫或取消按鈕。不得把操作稱為正在雲端計算。

### FR-06：假名單範例

- 「載入範例」主動填入六個明確標示為假資料的本地化名字，組數重設為 `2`，清除舊結果並將主按鈕恢復成「產生分組」。
- 載入範例不呼叫隨機來源、不自動分組。使用者必須再按主按鈕。
- 繁中範例固定為 `阿澄、柏宇、怡君、昱安、書妍、子睿`；英文範例固定為 `Alex、Blair、Casey、Devon、Elliot、Finley`。文字清楚說明名字僅為示範。

### FR-07：結果與複製

- 成功時顯示全部 K 組；每組顯示組號、人數及逐人名單。每個姓名附來源序號，因此重名仍能分辨。結果不只顯示摘要或人數。
- 另顯示總參與人數和忽略空行數。不得用顏色作為唯一的組別區分方法。
- 可選取畫面中的純文字結果；「複製分組」僅在有有效結果時啟用，經使用者明確操作才呼叫 `navigator.clipboard.writeText`。不讀取剪貼簿、不下載 TXT，不自動選取或複製。
- 剪貼簿 API 缺少或拒絕時，保留相同結果於唯讀、可選取的文字區，附人工複製說明；不使用 `document.execCommand`。複製文字按目前語言格式化組號和人數，逐列輸出原名及 ID，不含 HTML。
- 每次名單／組數編輯、範例、清除、重新分組與結果替換遞增內容 revision。每次複製另遞增 request sequence。非同步 resolve/reject 只有在 revision 和 sequence 皆仍是最新值時才能改變目前提示或 fallback。已送出的 OS 剪貼簿寫入不可由頁面取消；舊 promise 不可把舊提示或文字框帶回新內容。

### FR-08：清除與頁面離開

- 「清除」移除名單、解析列、忽略數、結果、錯誤、複製文字和狀態；組數回 `2`，主操作回到「產生分組」。不提示是否清除。
- `pagehide` 清除 DOM 與 JavaScript 對名單、結果、fallback 的引用；BFCache 恢復時呈現空白初始狀態。`visibilitychange` 本身不是清除條件。
- 只用記憶體和目前頁面的 DOM。沒有本機／雲端歷史或 URL 分享。

### FR-09：錯誤和資料安全

- 固定可見錯誤至少包含：`SOURCE_TOO_LONG`、`ROSTER_TOO_FEW`、`ROSTER_TOO_MANY`、`NAME_TOO_LONG`、`NAME_CONTROL`、`GROUP_COUNT_TOO_LONG`、`GROUP_COUNT_FORMAT`、`GROUP_COUNT_RANGE`、`INPUT_SCHEMA_INVALID`、`RANDOM_SOURCE_FAILED`、`COPY_FAILED`。
- 使用固定雙語文案；允許在錯誤關聯的 UI 另顯示 1-based 行號。不得顯示 stack、原始例外、完整名單或錯誤行的內容。
- 姓名一律以表單 value／文字節點顯示，不能將名單拼進 HTML、URL、log 或遙測。頁面禁止任何名單網路請求或持久化。

### FR-10：鍵盤與行動版

- 所有主要操作有可見文字標籤、可由鍵盤操作且有清楚焦點；錯誤與隨機失敗以文字及語意狀態回報，不只改顏色。
- 工作區先呈現名單輸入和組數欄，其次是主要按鈕，結果在其後。手機直向時依此順序單欄排列，結果每組一段；不能藏起必要操作。
- 在 320 CSS px 無外頁水平溢位；200% 文字縮放保持輸入、錯誤、結果和按鈕可達；觸控主要按鈕目標至少 44×44 CSS px。一般文字對比至少 4.5:1，必要控制邊界和大字至少 3:1，符合減少動態效果設定。

### FR-11：搜尋內容與語言切換

- 頁面用語精確說明一行一人、組數上限、空行忽略、重名是不同人、結果均衡規則與本機處理限制。繁中與英文有等量的操作說明及 FAQ。
- M1 preview 保持 `noindex,nofollow`。M2 的正式 SEO 使用固定 origin `https://groups.glossquote.com`；各語言 self canonical、互返 `hreflang` 和 `x-default`，正式 sitemap 僅列正式中英文頁，robots 指向該 sitemap。
- 正式結構化資料只描述頁面可見的 WebApplication 資訊，不增加評分、評論或未證明的效能／隨機性聲明。發布與 SEO 必須在固定正式 URL 用真實 HTTP 回應驗證。

## 明確非目標

不做每組人數上限、限制指定成員、成員排斥、固定種子、重新現場重播、抽獎、點名、投票、帳號、儲存、資料匯出／匯入、分享網址、後端／AI、統計頻率測試、真偽隨機證明、可驗證公平審計、付費功能、外部字型、分析或廣告。擴充需求須另開里程碑並更新驗收，不得自行增加。


---

## 原文件 TECHNICAL.md

# 技術規格：名單隨機分組

狀態：**SPEC_ONLY**。這份契約由 [PRODUCT.md](PRODUCT.md) 與 [ACCEPTANCE.md](ACCEPTANCE.md) 定義；所有程式介面是預期行為，不表示已有實作。

## 架構與允許的 runtime

正式產品是原生 HTML、CSS、瀏覽器 ESM 靜態頁。Node.js 24+ 只用於離線測試、受限的本機預覽與 build。MVP 不需 Worker：名單最多 500 人，Fisher–Yates 只執行 499 個索引；沒有上傳或 server-side 計算。不得加入 runtime 或開發依賴、framework、bundler、CDN、遠端字型或第三方圖示。

## M1 檔案樹

```text
package.json
.gitignore
public/
  index.html                     # 繁體中文
  en/index.html                  # English
  styles/app.css
  js/app.mjs
  js/i18n.mjs
  js/core/random-groups.mjs
scripts/
  serve.mjs
  check.mjs
  build.mjs
test/
  random-groups.test.mjs
  scaffold.test.mjs
HANDOFF.md
dist/                            # 只由 build 生成，gitignore
```

正式語言網址預定為 `/index.html` 和 `/en/index.html`，符合工具家族目前首頁路徑。M1 不建立 Cloudflare 設定，也不冒稱已有 production canonical、robots、sitemap、正式 headers 或首頁 catalog 項目。

## 核心介面

核心模組 `public/js/core/random-groups.mjs` 提供純邏輯介面：

```js
parseRoster(source)
parseGroupCount(source, participantCount)
generateGroups(participants, groupCount)
generateGroupsWithUint32Source(participants, groupCount, nextUint32)
createCopyText(groups, locale)
```

- `parseRoster(source)` 回 `{ ok:true, participants, ignoredLineCount }` 或 `{ ok:false, code, lineNumber, ignoredLineCount }`。空字串是 0 個輸入列、ignored 0；非空輸入的正規化與掃描遵守 FR-02。錯誤只回固定 code 與必要行號，不回原文。按順序遇到第一個錯誤即停止，不回傳部分名單；`ROSTER_TOO_FEW`、`ROSTER_TOO_MANY` 是整體人數錯誤。
- 成功的 `participants` 是依非空列順序編號的陣列：`{ id: 1..N, name: trimmedString }`。ID 連續、不重複，同名不合併。不得以輸入來源行號取代連續 ID。
- `parseGroupCount(source, participantCount)` 先驗證字串及原始 UTF-16 長度，依 FR-03 做 ASCII trim、digits grammar 和範圍判斷。回 `{ok:true,value:number}` 或固定錯誤物件；不得先用 Number 寬鬆解析、捨棄前導內容或默默修正輸入。
- `generateGroups(participants, groupCount)` 是產品唯一正式入口。它從目前瀏覽器 `globalThis.crypto.getRandomValues` 建立 source，缺少或失敗時回 `RANDOM_SOURCE_FAILED`，絕不 fallback。它不接受 caller 提供的 RNG、seed 或 `Math.random`。
- `generateGroupsWithUint32Source(...)` 是明確的 deterministic test seam；產品 `app.mjs` 不可匯入或呼叫它。測試可用固定 callback 檢查取樣、拒絕重抽及分組邊界。它接受 callback 回傳的 unsigned integer，任何 callback 例外或非法值都映成 `RANDOM_SOURCE_FAILED`。
- 兩個 generate 入口都重新驗證 participants 結構、ID 唯一及連續性、每個 name 的 trim/長度/control 條件、groupCount 範圍。輸入不得被排序或突變。非法結構回 `INPUT_SCHEMA_INVALID`；不呼叫 RNG。
- 成功輸出 `{ok:true, groups:[{groupNumber, participants:[{id,name}], count}], participantCount}`。`groups` 順序、參與者順序和每組人數遵守 FR-04。錯誤時不回傳部分 groups。
- `createCopyText(groups, locale)` 只接受已驗證結果和 `zh-Hant`／`en`；產生逐組標題、人數、原名及 `#id` 的LF純文字，最後一個LF。姓名含尖括號的字面內容也保留；禁止HTML格式剪貼簿或用姓名建立DOM標籤，不是刪除姓名看似HTML的文字。不得混入未驗證自由欄位或機器stack。

## uint32 來源與無偏取樣

正式 adapter 每次取一個整數：

```js
const slot = new Uint32Array(1);
crypto.getRandomValues(slot);
const sample = slot[0];
```

不要先解構/綁定成會失去 `Crypto` receiver 的方法；呼叫擲例外就映為 `RANDOM_SOURCE_FAILED`。`getRandomValues` 本身可在不安全 context 使用；工具 production 使用 HTTPS 是站點政策，不是宣稱此 API 強制 HTTPS。若 `globalThis.crypto.getRandomValues` 不可用，關閉產生功能並顯示可重試說明，不降級成其他隨機源。[MDN Crypto.getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues) 是此 API 契約的官方參考。

對每個 `n=i+1`（2..N），`2^32=4294967296` 是可精確表示的 Number 整數。計算 `limit=Math.floor(4294967296/n)*n`。每個呼叫最多嘗試 128 次：每次讀一個 `sample` 並先確認其為整數且在 `[0,4294967295]`；`sample < limit` 才回 `sample % n`，否則拒絕並重抽。第 128 次仍被拒絕就立刻錯誤，不作第 129 次。`%` 只有在 rejection test 通過後使用。對一般 `n` 會接受恰好可整除範圍，其餘值重新取樣，因此不偏向較小 index。

`N=2` 時 Fisher–Yates 仍會處理 `i=1`、抽取 `n=2` 的 index，再將兩人分到兩組；不得把這個最小案例當成不用隨機來源。正式入口在驗證通過後才啟動洗牌，API 缺少、無法呼叫或拋例外一律回 `RANDOM_SOURCE_FAILED`。

## Fisher–Yates 與均衡切分

1. 從通過 parser 的 participants 複製 ID 順序，不改原陣列。
2. 對 `i=N−1,...,1` 依序取得 `j=uniformBelow(i+1)`，交換 `ids[i]` 和 `ids[j]`。
3. 令 `q=floor(N/K)`、`r=N mod K`。按洗牌後順序，前 r 組各取 q+1 個，其餘組各取 q 個。
4. 依 ID 映回未改寫的原名，產生完整結果；ID 只作同名區分，不透露額外個資。

手算 fixture：`[甲,乙,丙,丁,戊]`、K=2、每次 uint32 sample 為 0。洗牌逐步為 `[戊,乙,丙,丁,甲]`、`[丁,乙,丙,戊,甲]`、`[丙,乙,丁,戊,甲]`、`[乙,丙,丁,戊,甲]`。切分為第 1 組 `[乙（#2）,丙（#3）,丁（#4）]`，第 2 組 `[戊（#5）,甲（#1）]`。這是測試 oracle，不能當產品中固定結果。

取樣案例：`n=3` 時 `limit=4294967295`。sample `4294967295` 必須拒絕；下一個 sample `5` 接受並得到 index 2。禁止只做 `sample % n`，也禁止用 0..2 的範圍直接捨棄不足以檢查抽樣流程。

## 頁面狀態與 copy 競態

App state 至少持有名單原稿、組數原稿、目前解析錯誤/ignored count、已驗證 participants、結果、copy status、`contentRevision` 和 `copyRequestId`。不保存 RNG state、seed 或歷史結果。

- 每次輸入變更即遞增內容 revision、重算驗證、清除結果和 copy fallback；即使文字最後回到原值，也不能復活舊結果。
- 產生／重新分組操作一開始即清除舊結果與 copy 提示。驗證失敗或 `RANDOM_SOURCE_FAILED` 都沒有舊結果。成功後只展示新完整結果。
- 「載入範例」/「清除」依 FR-06/08 同步重設。`pagehide` 清輸入、結果、copy fallback 和 JS 引用；不得用 `visibilitychange` 偷取使用者資料或清空臨時遮罩狀態。
- 每次 Copy 先增加 `copyRequestId` 並捕捉兩個 revision，再呼叫 `navigator.clipboard.writeText`。只有 sequence 和 content revision 仍相同的 promise completion 才能寫入 UI state；新輸入/新結果使舊 completion inert。clipboard 的 native write 無法撤回，介面不保證取消已送出的舊寫入。
- 不用 async progress UI 包裝同步運算，不建立 fake timer、Worker 或取消功能。

## HTML、網路、錯誤和 browser boundary

所有姓名是 untrusted plain text。使用 `value`、`textContent`、靜態語意標籤；不准 `innerHTML`、`eval`、`new Function`、動態 script URL、fetch/XHR/WebSocket/beacon、storage、service worker 或網路隨機 API。開發 server 僅供 `public/`，`127.0.0.1:4197`，只 `GET`/`HEAD`。沒有 `/api`、表單提交或 server-side 名單副本。

每個可見錯誤只由固定 code 對應本地雙語文案；lineNumber 顯示整數，不將輸入行轉成 HTML。`RANDOM_SOURCE_FAILED` 不得附 `error.message`。密碼學 API 是 browser CSPRNG，不等同公開可稽核抽籤或法院級公平證明。

## Node 自動測試與人工界線

純解析、grammar、無偏取樣、固定 shuffle、切分、copy formatting 可用 Node 24 `node:test` 與假名單測試；期望順序必須寫 literal，不能由被測函式或同演算法重新計算成 expected。可以注入 uint32 callback 的測試不等同真瀏覽器 Crypto 測試。真 Chrome/Edge 表單操作、瀏覽器 clipboard、focus、響應式、Network/Storage 與正式 HTTP 必須在 acceptance 明記人工證據或 NOT_RUN。


---

## 原文件 UX-SEO.md

# 使用流程與 SEO 規格：名單隨機分組

狀態：**SPEC_ONLY**。介面模式是 **Product App**：首屏直接完成貼名單與分組，不用 SaaS hero 或假資料取代空狀態。沿用 `docs/DESIGN-SYSTEM.md`；主要工作物是使用者貼入的名單及產生的完整分組。

## 工作層級

- **一直可見：**名單欄位、人數／忽略空行提示、組數欄、同名提示、本機處理提示、主按鈕。
- **貼近結果：**每組標題、人數、每位參與者和「複製分組」；複製失敗時就在結果旁提供可選取文字。
- **次要操作：**「載入範例」、「清除」、語言切換、返回 GlossQuote 首頁。不要把進階選項藏起來，因首版沒有進階選項。

## 線框

桌面首屏（空狀態）：

```text
┌────────────────────────────── 名單隨機分組 ─────────────────────────────┐
│ GlossQuote                                        繁中 / English       │
├────────────────────────────────────────────────────────────────────────┤
│ 把名單分成幾組                                      工具在瀏覽器本機處理 │
│ 每行一人；2–500 人；空白行忽略；同名視為不同人。                         │
│ ┌──────────────────────────────┐   ┌──────────┐                         │
│ │ 貼上或輸入名單               │   │ 組數     │                         │
│ │                              │   │ 2        │                         │
│ │                              │   └──────────┘                         │
│ └──────────────────────────────┘   共 0 人 · 忽略 0 行                 │
│ [產生分組]    [載入假名單]    [清除]                                    │
├──────────────────────────────── 結果 ──────────────────────────────────┤
│ 還沒有分組。貼上至少兩位參與者的名單，再選擇組數。                        │
└────────────────────────────────────────────────────────────────────────┘
```

成功後，結果區取代空狀態，完整列出組別、人數和名字序號；桌面可兩欄排組，但不能改變組別順序。最多 50 組時，所有組仍可順序閱讀。

手機直向：

```text
┌───────────────────────────┐
│ 名單隨機分組   繁中 / EN  │
├───────────────────────────┤
│ 貼上名單                   │
│ ┌───────────────────────┐ │
│ │ 一行一人               │ │
│ └───────────────────────┘ │
│ 共 N 人 · 忽略 M 行         │
│ 組數 [ 2 ]                  │
│ 同名會視為不同人            │
│ [ 產生分組 ]                │
│ 載入假名單       清除       │
├───────────────────────────┤
│ 第 1 組（3 人）             │
│ 姓名（#1）                  │
│ ...                        │
│ 第 2 組（2 人）             │
│ ...                        │
│ [ 複製分組 ]                │
└───────────────────────────┘
```

## 雙語可見文案

| 狀態／控制 | 繁體中文 | English |
|---|---|---|
| 瀏覽器標題 | 名單隨機分組｜GlossQuote | Random Group Generator \| GlossQuote |
| H1 | 名單隨機分組 | Random group generator |
| 說明 | 貼上每行一人的名單，選擇組數，讓每位參與者剛好分到一組。 | Paste one person per line, choose a number of groups, and assign each participant exactly once. |
| 名單標籤 | 參與者名單（一行一人） | Participant list (one person per line) |
| 組數標籤 | 組數 | Number of groups |
| 空行提示 | 空白行會忽略。 | Blank lines are ignored. |
| 重名提示 | 同名會視為不同的人，結果會附上序號。 | Duplicate names stay separate and include an ID. |
| 本機提示 | 名單只在此頁面記憶體處理；不會保存或送出。 | The list is processed in this page; it is not saved or sent. |
| 初始 CTA | 產生分組 | Generate groups |
| 成功後 CTA | 重新分組 | Regroup |
| 範例 | 載入假名單 | Load sample names |
| 清除 | 清除 | Clear |
| 結果空狀態 | 還沒有分組。貼上至少兩位參與者的名單，再選擇組數。 | No groups yet. Paste at least two participants and choose a group count. |
| ignored | 共 {N} 人 · 忽略 {M} 行 | {N} people · {M} blank lines ignored |
| copy | 複製分組 | Copy groups |
| copy fallback | 複製功能不可用。請選取下方文字後手動複製。 | Clipboard access is unavailable. Select the text below and copy it manually. |
| random failure | 無法取得隨機值，因此沒有產生或保留分組。請再試一次；若持續發生，請改用支援瀏覽器密碼學 API 的瀏覽器。 | Random values are unavailable, so no groups were produced or kept. Try again, or use a browser with the Web Crypto API. |
| 範例標示 | 下列姓名是示範用假資料，尚未分組。 | These names are sample data and have not been grouped. |

名稱驗證錯誤只包含固定解釋和行號，例如「第 4 行有控制字元，請移除後再試。」／“Line 4 contains a control character. Remove it and try again.” 不回顯該行姓名。

## SEO 文案

繁中頁：

- `title`：名單隨機分組｜GlossQuote
- `meta description`：貼上名單並指定組數，在瀏覽器本機隨機分組。忽略空白行、保留同名成員，讓各組人數最多差一人。
- 可見介紹：將活動或課程名單分成指定組數，檢查每組完整成員與人數；重新分組前保留原名單，任何輸入改動都會清除舊結果。

英文頁：

- `title`：Random Group Generator | GlossQuote
- `meta description`：Paste a roster and choose a group count to split it locally in your browser. Blank lines are ignored, duplicate names stay distinct, and group sizes differ by at most one.
- Visible introduction: Split an event or class roster into the group count you choose. Review every member and group size; editing the inputs clears the previous result.

以上 title、description 與可見文案必須互相一致。不得堆疊不自然關鍵字、聲稱熱門、保證公平或編造使用數據。

## FAQ（兩語都必須完整呈現）

1. **我可以貼上多少人？** 2 至 500 人；每人一行。最多 60,000 UTF-16 code units 的原始名單；姓名 trim 後最多 100 code units。
2. **同名的人會合併嗎？** 不會。每個非空輸入列都有獨立序號，例如「小明（#2）」和「小明（#5）」。請確認這些列確實代表不同參與者。
3. **每組人數會完全相同嗎？** 盡可能平均；不能整除時，前幾組各多一人，所以最多相差一人。
4. **結果是可以公證或稽核的抽籤嗎？** 不是。工具使用瀏覽器密碼學亂數 API 和無偏取樣程式，但不提供 seed、外部見證或可重現稽核證明，也不保證連續結果不同。
5. **名單會上傳或保存嗎？** 工具程式不傳送也不保存名單，關閉或離開頁面會清除目前工作。載入網站本身仍會連到託管主機，主機會收到一般頁面請求資訊；正式 Network/Storage 行為需在上線版本實測。
6. **複製按鈕不能用怎麼辦？** 結果仍可在頁面選取；瀏覽器拒絕剪貼簿寫入時，工具提供唯讀文字供你手動複製。

英文 FAQ 必須逐題翻譯並保留相同範圍，不能只有英文摘要。FAQ 不含未證明的公平、流量或支援承諾。

## 正式 SEO 與預覽

- M1 每個預覽頁 `robots=noindex,nofollow`，本機 HTTP 可另外回 `X-Robots-Tag: noindex, nofollow`。預覽不得混入索引 sitemap。
- M2 固定正式 URL：`https://groups.glossquote.com/index.html` 和 `https://groups.glossquote.com/en/index.html`。各自 self canonical；兩頁都提供互返 `zh-Hant`、`en` 與 `x-default`，x-default 指繁中正式頁。
- Production robots 允許正式頁並指向 `https://groups.glossquote.com/sitemap.xml`；sitemap 僅含兩個 canonical URL。
- 靜態 JSON-LD `WebApplication` 只用可見名稱、描述、正式 URL、語言及工具類別；不加入 aggregateRating、review、虛構評論或未驗證 claims。CSP 必須對靜態 JSON-LD 採精確內容 hash 或等效安全設定，不開 `unsafe-inline`/`unsafe-eval`。
- production canonical/robots/sitemap/structured data/headers 只有以正式來源真實部署後才可標 PASS。M3 的主代理需驗正式 HTTP、雙語頁和首頁往返連結；目前都 NOT_RUN。


---

## 原文件 ACCEPTANCE.md

# 名單隨機分組驗收

狀態：**SPEC_ONLY**；以下是驗收案例和預期值，尚未執行。純函式測試用 Node 24、假姓名與 deterministic uint32 callback；不得讀私人名單。瀏覽器 API、剪貼簿、鍵盤、Network/Storage 和正式 HTTP 必須分開記錄，不用 Node 或 source inspection 冒充真瀏覽器 PASS。

## 自動案例

| ID | 需求 | 輸入／步驟 | 精確預期 |
|---|---|---|---|
| A01 | FR-02 | `parseRoster('')` | `ROSTER_TOO_FEW`，lineNumber=null，ignoredLineCount=0；不回傳半成品 participants。 |
| A02 | FR-02 | `甲\n乙` | 成功；people=`[{id:1,name:'甲'},{id:2,name:'乙'}]`，忽略 0 行。 |
| A03 | FR-02 | `甲\r\n\r\n 乙 \r丙` | CRLF/CR 都當 LF；成功名單依序為 `(甲,#1),(乙,#2),(丙,#3)`，ignoredLineCount=1。 |
| A04 | FR-02 | `\n \t\n甲\n乙\n` | 以 JS trim 忽略首行、空白行及尾行；兩位名單成功，ignoredLineCount=3。 |
| A05 | FR-02 | `甲\n甲\n乙` | 3 位而非 2 位；ID 為 1/2/3，同名保留。 |
| A06 | FR-02 | 恰 60,000 UTF-16 units：`'甲\n乙\n' + '\n'.repeat(59996)` | 不回 `SOURCE_TOO_LONG`；解析出甲乙兩人，ignoredLineCount=59997。 |
| A07 | FR-02 | A06 再多一個 LF，原始長 60,001 | `SOURCE_TOO_LONG`，lineNumber=null；拒絕前不截短或回傳部分名單。 |
| A08 | FR-02 | 建立 500 個有效短名，以 LF 分隔 | 成功恰 500 人，ID 1..500。 |
| A09 | FR-02 | 501 個有效短名 | `ROSTER_TOO_MANY`，lineNumber=501；不可只接受前 500 人。 |
| A10 | FR-02 | 一個 100 ASCII code-unit 名稱加另一個有效名稱 | 成功；第一名稱原樣保留。 |
| A11 | FR-02 | 一個 trim 後 101 code-unit 名稱 | `NAME_TOO_LONG`，該實體行 1；不回顯名稱。 |
| A12 | FR-02 | trim 後 50 個 `😀`（100 UTF-16 units）及第二位短名 | 成功；emoji 名稱保留，確認以 `.length` 而非 Unicode code point 計數。 |
| A13 | FR-02 | trim 後 51 個 `😀`（102 units） | `NAME_TOO_LONG`，不以視覺 grapheme 數通過。 |
| A14 | FR-02 | `　甲　\n乙`（U+3000 邊界空白） | JS `trim()` 後名稱為 `甲`,`乙`。 |
| A15 | FR-02 | ` \t甲\t \n乙` | 首尾 TAB 隨 trim 移除，成功；名稱 `甲`,`乙`。 |
| A16 | FR-02 | `甲\t乙\n丙` | `NAME_CONTROL`，line 1；內部 TAB 不移除、不偷偷修正。 |
| A17 | FR-02 | 第二行含 NUL `乙\u0000丙` | `NAME_CONTROL`、line 2；不回傳可部分使用的 roster。 |
| A18 | FR-02 | 第二行含 DEL `乙\u007f丙`；另測 C1 `乙\u0085丙` | 兩者皆 `NAME_CONTROL`、line 2。 |
| A19 | FR-03 | `parseGroupCount(' 0002\t',2)` | 有效值 2；前導零和 ASCII 邊界空白接受。 |
| A20 | FR-03 | 原始 32 units：`' '.repeat(15)+'2'+' '.repeat(16)`、N=2 | 原始長度檢查通過，trim 後值 2。 |
| A21 | FR-03 | 原始 33 units：`' '.repeat(16)+'2'+' '.repeat(16)` | `GROUP_COUNT_TOO_LONG`，即使 trim 後只有 `2` 也拒絕。 |
| A22 | FR-03 | 逐項 `''`,`0`,`1`,`+2`,`-2`,`2.0`,`2e0`,`1,000`,`２`,` 2 `,`2 0`（N=10） | 全部回固定格式或範圍錯誤；不可由 Number 寬鬆解析成合法組數。 |
| A23 | FR-03 | N=50 時 K=2 與 K=50 | 兩個端點接受；K=51 回 `GROUP_COUNT_RANGE`。 |
| A24 | FR-03 | N=2 時 K=3；N=51 時 K=0 | 都回 `GROUP_COUNT_RANGE`，不觸發 RNG。 |
| A25 | FR-04 | 5 人 `[甲,乙,丙,丁,戊]`、K=2、每次 callback 回 0 | 洗牌順序恰為 `[乙,丙,丁,戊,甲]`；第 1 組 `[乙（#2）,丙（#3）,丁（#4）]`，第 2 組 `[戊（#5）,甲（#1）]`。 |
| A26 | FR-04 | 5 人、K=2；callback 依序給 `[4294967295,5,1,2,1]` | n=5 的 limit=4294967295，第一個 max 值拒絕、5→j0；其後 n=4 sample1→j1、n=3 sample2→j2、n=2 sample1→j1。最終洗牌 `[戊,丁,丙,乙,甲]`，callback 恰呼叫 5 次。 |
| A27 | FR-04 | 3 人、K=2、callback 依序 `[4294967295,5,0]` | 第一次 n=3 拒絕 max uint32，5→j=2；接著 n=2 的 0→j=0；洗牌 `[乙,甲,丙]`；切組第1組`[乙（#2）,甲（#1）]`、第2組`[丙（#3）]`。 |
| A28 | FR-04 | n=3 的第一個 uniformBelow 收到 128 個 `4294967295` | 第 128 次拒絕後 `RANDOM_SOURCE_FAILED`，callback 恰呼叫 128 次；不做第129次，不回傳部分結果。 |
| A29 | FR-04 | test callback 回 `-1`、`1.5`、`4294967296`、`NaN` 或字串 | 每種在首次讀取後固定 `RANDOM_SOURCE_FAILED`，不映成隨機 index。 |
| A30 | FR-04 | test callback 拋出 `Error('FAKE_PRIVATE_ERROR')`；production 環境不提供 `getRandomValues` | 只回 `RANDOM_SOURCE_FAILED`；不含原始訊息，不讀 `Math.random`，不產生結果。 |
| A31 | FR-04 | 4 人 K=3，固定值產生任一合法排列 | 組大小按切片順序必為 `[2,1,1]`；N=8,K=3 必為 `[3,3,2]`；N=500,K=2 為 `[250,250]`；N=500,K=50 為 50 組各10人。 |
| A32 | FR-04 | 多組固定序列逐一生成 | 每次結果組數正好 K；flatten 後每個原始 ID 1..N 恰出現一次，沒有重複或遺漏；任兩組人數差≤1。 |
| A33 | FR-04 | N=2,K=2 | 一組抽樣必須使用 n=2；兩人各分一組，亂數 API 缺失時仍回 `RANDOM_SOURCE_FAILED`，不因 Fisher–Yates 不用 sample 而靜默降級。 |
| A34 | FR-04 | 非陣列、重複／不連續 ID、額外 participant 欄位、未 trim 名稱或非法 groupCount | `INPUT_SCHEMA_INVALID`；RNG callback 呼叫 0 次，沒有部分 groups。 |
| A35 | FR-04 | 合法 5 人 input 再呼叫生成 | 原始 people 陣列及每個物件的順序/值完全不變；結果另用複製 ID 陣列。 |
| A36 | FR-05 | 先成功生成，再用應用層變更名單或組數 | UI state 結果為 null、copy disabled、內容 revision 遞增；改回舊值仍須重新產生。見 B03/B04。 |
| A37 | FR-05 | 先成功，再按重新分組，隨機 adapter 失敗 | 舊結果先消失；錯誤只 `RANDOM_SOURCE_FAILED`；不可保留舊 groups 或 copy text。 |
| A38 | FR-06 | 使用繁中／英文載入範例 | 分別填入文件指定的六個名字、組數重設2、清結果；callback 呼叫0次，按鈕是「產生分組」。 |
| A39 | FR-07 | 固定結果呼叫 `createCopyText(groups,'zh-Hant')` | 每組標題含序號/人數；每列保留原名和 `（#id）`；只有純文字行與 LF，無 HTML。English 使用對應文案和 `(#id)`。 |
| A40 | FR-07 | 名稱字面值為 `<img src=x onerror=alert(1)>` | core 保留有效名字為普通字串；UI 驗收另證實不建立 img、不執行事件。 |
| A41 | FR-07 | Clipboard API 缺少／拒絕 | UI 保留可選取 readonly copy text 和操作說明；不讀剪貼簿、不呼叫 `execCommand`、不自動下載。 |
| A42 | FR-07 | 延遲 clipboard promise；之後改輸入、開始重新分組或再按 copy，再讓舊 promise resolve/reject | 舊 request sequence/revision 不能改新頁面的 copy status 或 fallback。OS 已收到的舊 write 無法取消，不把它寫成已取消。 |
| A43 | FR-08 | clear／pagehide | 名單、組數/結果、錯誤、copy fallback 清空；組數2；頁面初始按鈕可見。BFCache 恢復亦空白。 |
| A44 | FR-09 | 在所有固定錯誤上輸入 `FAKE_PRIVATE_NAME` 或讓 API 拋帶該訊息的 error | 可見 error code/翻譯文案不含該 sentinel、姓名或 stack；測試 fixture 是假的。 |

## 真瀏覽器手動案例

每項記錄瀏覽器名稱/版本、作業系統、頁面語言、實際輸入、觀察、PASS/FAIL/NOT_RUN 和證據。人工作業無法完成就列 NOT_RUN，不從 Node mock 推論。

| ID | 需求 | 操作 | 預期／證據 |
|---|---|---|---|
| B01 | FR-01/11 | 在 Chrome 和 Edge 開繁中與英文頁，使用語言切換及同語首頁入口 | 標籤、內容、`lang` 與路徑一致；沒把英文連回中文工具頁或相反。 |
| B02 | FR-02/03/04/07 | 以假名單 5 人 K=2 產生一次 | 所有姓名各出現一次，3/2人；結果含每人序號、完整組名單和人數。實際 browser 隨機結果不預設順序。 |
| B03 | FR-05 | 成功後改一個姓名 | 舊結果即清空，copy disabled，需重新按鈕；不殘留舊名單結果。 |
| B04 | FR-03/05 | 成功後改 K，再把人數減到讓 K 超上限 | 舊結果清除；不自動改 K；欄位錯誤可見且有關聯。 |
| B05 | FR-05 | 成功後明確按「重新分組」 | 舊結果先被取代；新結果成為唯一可複製結果；說明同次結果不保證不同。 |
| B06 | FR-02 | 在兩個瀏覽器分別測空行、CRLF 貼上、首尾空白、重複名、內部 TAB、控制碼、超長姓名 | 空列計數與行號正確；重名分成獨立 ID；錯誤不回顯敏感行。 |
| B07 | FR-02 | 使用 2、500 人邊界假資料，再測 1 和 501 人 | 2 和 500 可提交；超界顯示固定錯誤，不產生部分結果。 |
| B08 | FR-03 | 測 K=2、min(50,N)、少於2及高於上限 | 可用範圍、前導零/ASCII trim 和拒絕文案符合規格。 |
| B09 | FR-04 | 使用正常 browser API 分組兩次不同假名單 | 每位恰出現一次、組別差≤1；記錄觀察但不以少數操作作統計公平證明。 |
| B10 | FR-04 | 在可控的本機測試 harness 讓 `getRandomValues` 缺失或拋例外 | UI 明確回報 random source failure、沒有 fallback、沒有舊結果。若 browser 手動環境不能安全替換 API，標 NOT_RUN。 |
| B11 | FR-06 | 按載入假名單 | 六個相應語言假名出現，明確示範標示；沒自動分組；K=2。 |
| B12 | FR-07 | 成功後複製，再貼到本機純文字編輯器 | 完整所有組、人數、姓名與序號；不含 HTML；貼上的資料只由此明確操作觸發。 |
| B13 | FR-07 | 模擬 clipboard API 拒絕或在不允許時測試 | 顯示 readonly 手動備援；頁面不讀系統 clipboard、不用隱藏 execCommand。不能模擬則 NOT_RUN。 |
| B14 | FR-07 | 可控制 clipboard promise 時延遲並改動輸入，再 resolve/reject | 舊通知/fallback 不回到新畫面；注意 OS 寫入無法撤銷。不可控制就 NOT_RUN。 |
| B15 | FR-08 | 輸入樣本/生成結果，再 Clear、刷新、返回使頁面 BFCache 恢復 | 兩次都回名單空、K=2、無結果/錯誤/fallback。 |
| B16 | FR-09 | Chrome/Edge DevTools Network 與 Storage，載入、貼假唯一姓名、分組、複製 | 沒有名單傳輸、storage、cookie、第三方呼叫或動態請求；只有明確的剪貼簿寫入。查同源及 `/cdn-cgi/rum`，不只過濾外站。若無完整觀察能力列 NOT_RUN。 |
| B17 | FR-10 | 全程只用 Tab/Shift+Tab/Enter/Space 操作兩語流程及錯誤恢復 | 控件順序合理、每個焦點有可見標示、狀態和錯誤能被辨認；不需滑鼠拖曳。 |
| B18 | FR-10 | 實際 viewport 320 CSS px 手機直向，使用 500 假名單結果 | 整頁不水平溢位；輸入、K、清除、結果與 copy 可達；50組不被裁掉。 |
| B19 | FR-10 | 真瀏覽器 200% zoom | 操作、錯誤、名單和結果保持可讀可用，不遮住主要操作。 |
| B20 | FR-10 | 比對文字/控制邊界/焦點及錯誤；切換 reduce motion | 對比和雙層焦點符合設計契約；狀態不只依顏色；無必要動畫依賴。 |
| B21 | FR-01 | 停用 JavaScript 開啟兩頁 | 明確說明需啟用 JavaScript、名單不送出；沒有可誤認成功的假表單。 |
| B22 | FR-11 | 對固定正式 URL 執行 HTTP/SEO 驗證 | 雙語 canonical/互返 hreflang/x-default、正式 sitemap/robots/404、CSP/headers 和 JSON-LD 與畫面一致。只限 M3；M1/M2 先列 NOT_RUN。 |
| B23 | FR-11 | 從正式中英文頁往返 GlossQuote 首頁再回工具 | 同語連結正確；需實際公開站才能 PASS。 |

## 任務 gate

- M1/T00 必跑 Node 24+：`npm test`、`npm run check`、`npm run build`；並執行 B01–B21 中所有可用且主要的本機流程。不得把 B10/B13/B14 不可操作時改記 PASS。
- M2/T01 才建立正式建置與 SEO gate：`npm run build:production`、`npm run check:production` 以及對固定 URL/產物的實際比對。
- M3/T02 由主代理負責真實正式發布、首頁、HTTPS/HTTP/SEO 驗證和候選包；公開 repo、部署 commit、外驗狀態逐項分開記錄。
- 外部驗收者回報的新問題只按可重現案例進入返工；修正後跑受影響 case，再更新 GitHub commit 和正式版本證據。外部確認前不是完成。


---

## 原文件 TASKS.md

# 實作任務與里程碑：名單隨機分組

狀態：**SPEC_ONLY**。本任務只定義工作，沒有任務已通過。任務以 [PRODUCT.md](PRODUCT.md)、[TECHNICAL.md](TECHNICAL.md)、[UX-SEO.md](UX-SEO.md) 和 [ACCEPTANCE.md](ACCEPTANCE.md) 為準；一個 gate 未通過，不勾選後續里程碑。

## M1 / T00：完整可用的本機雙語 MVP

**任務 ID：** `RANDOM-GROUPS-M1-LOCAL-MVP`。

**目標：**可操作的中英文靜態頁，包含固定輸入邊界、真實 crypto Fisher–Yates、均衡分組、結果、copy 和清除。隨附獨立核心測試，以及真正的本機 `dev`、`check`、`build`。完成後凍結並交主代理獨立驗收；不自行開始 M2。

**允許修改路徑（只限本專案）：**

- `package.json`、`.gitignore`（只新增 `node_modules/`、`dist/` 和必要 temp 排除）
- `public/index.html`、`public/en/index.html`、`public/styles/**`
- `public/js/app.mjs`、`public/js/i18n.mjs`、`public/js/core/random-groups.mjs`
- `scripts/serve.mjs`、`scripts/check.mjs`、`scripts/build.mjs`
- `test/random-groups.test.mjs`、`test/scaffold.test.mjs`
- `HANDOFF.md`（只記錄真實狀態和證據）
- `dist/**` 僅可由 build 產生，保持 gitignore，不人工編輯或發布。

主代理在派工前補齊M1允許範圍：本工具public/**（含preview robots）、test/**假資料與UI/tooling安全回歸、scripts/validation.mjs與必要自包含開發工具helper；project.json/START-HERE/docs/RELEASE-CANDIDATE及HANDOFF真實狀態可更新；孵化器根 .runs/random-groups/ 專用append-only證據可寫。不能建立M2正式發布工具或改變產品/精度/隱私門檻。非此列表的路徑先回報；規格實質變更仍由主代理裁定。

**不可破壞行為：**

- 原始名單≤60,000 UTF-16 units；2–500 名；正規化/trim/空行/控制碼/同名 ID 規則完全一致。
- K grammar 和範圍精確；無效輸入不消耗 RNG、不產生局部結果。
- 正式入口只有 browser `crypto.getRandomValues`；rejection-sampled Fisher–Yates，128 失敗上限，絕不 `Math.random` fallback。
- 每組切分最多相差一人，全 ID 恰出現一次；測試 expected 為獨立 literals。
- 新編輯/重洗/失敗即清結果；clear/pagehide 清所有使用者資料；copy 只有明確使用者操作並以兩層 revision guard 舊 promise。
- 雙語對等；不儲存、不讀剪貼簿、不上傳、不依賴第三方；符合鍵盤、focus、320px、200% 縮放。
- 本機伺服器只綁 loopback、只供 `public/`，拒絕路徑穿越和非 GET/HEAD；build 僅複製 allowlist，拒絕 hardlink/junction/未知 stale 資產，不動其他工具。

**實作步驟：**

1. 確認此資料夾仍是 SPEC_ONLY、Node 24+、工作樹狀態及 allowed paths；不讀 credential，不安裝套件，不更動 persistent Windows 狀態。
2. 先完成純 parser、組數 grammar、schema 驗證、uniformBelow/Fisher–Yates、切組和純文字 copy formatter，建立 A01–A44 核心可測的自動案例。
3. 再完成語意雙語 Product App、真實空/錯誤/成功狀態、範例、清除、clip promise revision guard、pagehide。
4. 完成狹義 static preview server、完整 check 和 build；保留 preview noindex，不添加 production routing/header 假設。
5. 執行 acceptance M1 gate 和可操作的 B01–B21；每個沒跑的瀏覽器項逐條 NOT_RUN。
6. 更新 HANDOFF，列實際檔案、命令/exit、測試輸出、人工觀察、known risks、commit/owner 狀態；停止等主代理驗收。

**命令與完成條件：**

Node 必須為 24+。執行 `npm test`、`npm run check`、`npm run build` 和 `npm run dev`；至少一個真瀏覽器兩語完成B02/B03/B04/B05/B06主流程、錯誤與過期結果清除，再做可用的B01–B21。其他browser、完整Network/Storage、原生clipboard/真機/zoom/讀屏無法觀察時可按既有授權逐項NOT_RUN，不能冒稱全通過。Node固定演算法和輸入拒絕以及本機工具鏈FAIL不能略過。命令須由實作者和主代理各自有證據地記錄，不把owner自述當主驗。

**停止條件：**

- Node 不是 24+、路徑不在允許範圍、有他人新修改將被覆蓋、埠衝突需要停止既有程序。
- 規格與 browser API 行為矛盾；依賴缺失/錯誤 fallback 使分組可退回非密碼學 RNG；任一邊界只能靠截斷或捨入放行。
- 需要安裝依賴、外部 API、帳號、憑證、新權限、額外付費服務，或碰其他工具／首頁／正式主機。
- 同一必要 gate 失敗兩次且沒有新證據；停止盲目重試，提交具體 command、input、expected/actual 和 code location。
- 發現 persistent Windows environment fingerprint 在此任務前已異常，或本任務造成任何不明漂移；依全域 AGENTS 安全規則處理，不猜測覆寫。

## M2 / T01：正式產物、SEO 與公開來源

**前置：**主代理已明確核准 M1/T00，且必要本機 gate 通過。沒有核准就保持 `BLOCKED_PENDING_PRIMARY_M1_ACCEPTANCE`。

**目標：**設定固定 origin `https://groups.glossquote.com` 的 production build/check、正式靜態 SEO/404/security headers，建立可重現並通過檢查的 reviewed public source copy；依固定目標 `KYStr/glossquote-labs-random-groups` 發布/更新公開來源並核對 visibility、remote commit、來源 ZIP。使用既有授權時不讀取或輸出憑證、不擴大權限、不碰 root repository。

**M2主驗放行後允許路徑：**本工具public/**固定SEO/404/_headers、scripts/check.mjs/build.mjs及release/manifest helper、test/release.test.mjs、package.json、wrangler.jsonc、docs/RELEASE.md/RELEASE-CANDIDATE.md、HANDOFF.md/README.md/project.json。公開副本僅孵化器 .runs/github-publish/glossquote-labs-random-groups/，證據 .runs/random-groups/；先核對現存副本並保留，不force/刪除重建。原功能對話依既有授權完成reviewed copy的來源公開，主代理親驗remote與部署；只有M1主驗放行才進入這些路徑，不需另找發布授權。

**必要驗收：**既有 test/check/build 和 `npm run build:production`、`npm run check:production`；固定雙語 URL/canonical/hreflang/x-default/robots/sitemap/JSON-LD；preview noindex；public source allowlist 無 `.runs`、dist、node_modules、secrets、個人名單或兄弟工具。公開 repo 的 remote visibility、commit/HEAD 與 source ZIP blob bytes 必須實際驗證。正式部署仍不在本任務內。

**停止條件：**正式來源 URL 不一致；需付費或新權限；GitHub 目標不是授權 repo；發布內容含個人資料/憑證；驗收 gate 失敗；要求修改首頁或部署 Cloudflare。把原因與解鎖條件記錄並交主代理，不 force push、不自改首頁。

## M3 / T02：正式部署、首頁與外部驗收（主代理負責）

主代理在 M2 source 固定後，依已授權免費 Cloudflare 流程部署 `groups.glossquote.com`，實測雙語頁、headers、canonical、robots/sitemap、network/storage、頁面互返和 GlossQuote 雙語首頁 catalog/backlinks。來源正式 commit、部署版本與 homepage commit 分開記錄。主代理把可重現驗收包交使用者，狀態標「已上線，待外部複驗」。功能對話不可自行改共用首頁、讀 token 或把 preview 當正式站。

收到外部回報後，由主代理確認證據並透過原功能對話交 T03 具體修正；原對話先重現問題，更新測試與 source commit，主代理重新部署與驗收。只有使用者／驗收者確認該固定版本通過後，才標記完成。

## T03：外部回報修正（只有收到具體報告後）

**allowed paths：**主代理在原對話任務中明列受影響檔案；不憑空重寫整款。先按報告重現，修正產品/規格對應測試；重新跑受影響的 M1/M2 gates，更新 source commit 與 HANDOFF，再等主代理整合。部署權仍屬主代理。沒有外部回報時此任務保持未開始。


# JSON 檢查與格式化 — 既有規格保存

Task ID: `labs-02-json-workbench` · Spec ID: `spec-02-json-workbench`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格

這是規格，尚未實作。

## 固定 MVP

| ID | 行為 |
|---|---|
| FR-01 | 一個純文字 textarea；使用者貼入 JSON，選「兩空格排版」（預設）或「壓成一行」，點「檢查並整理」。不自動讀 clipboard、file、URL。空字串或僅 JSON whitespace 是 EMPTY_INPUT。 |
| FR-02 | 原始 UTF-8 最多 262,144 bytes；先拒絕 UTF-16 length >262,144。最多 50,000 tokens（含標點、不含 whitespace），容器巢狀深度最多64，單一字串 raw token 最多65,536 code units、數字 token 最多4,096 code units。超限不產生部分結果。 |
| FR-03 | 嚴格 JSON 語法，一個完整 root value，包含 scalar root；不接受註解、尾逗號、NaN、Infinity、前導零、多 root、開頭 BOM 或 JSON 以外空白。這是受限的 JSON 工具，另拒絕任何 raw 或解碼後未配對 surrogate。 |
| FR-04 | 同一 object 的 key 按解碼後 UTF-16 字串精確判斷重複；重複即 DUPLICATE_KEY，整份結果停止。不同 object 可有相同鍵。不得 trim、改大小寫或 Unicode normalize 後比較。 |
| FR-05 | 格式化只改 string token 外的無意義 whitespace。數字 token、string token、鍵順序與 array 順序完全保留。數字永不轉 Number/BigInt；1e400、-0、1.2300 和超長整數只檢查詞法，不宣稱可被下游數值系統精確使用。 |
| FR-06 | pretty 為兩空格、LF、colon 後一空格；非空容器每個 member/element 一行；空 object/array 各是 {} / []；compact 移除 token 間全部 whitespace。兩模式都無 BOM、無末尾換行。UTF-8 輸出最多4,194,304 bytes，超限 OUTPUT_TOO_LARGE。 |
| FR-07 | 錯誤顯示固定中文說明、第一個錯誤的 1-based 行／欄及0-based UTF-16 offset。欄以 code units 算；CRLF 算一次換行，孤立 CR/LF 也換行。不要在錯誤中複製 key、value 或 raw exception。輸入保留，舊結果清除。 |
| FR-08 | Worker 做 parser/排版，5 秒 watchdog；可取消。任何來源或模式變更即取消且使結果失效。jobId 防遲到回覆。缺 worker 能力直接不支援，不改走遠端服務。 |
| FR-09 | 成功可按「複製結果」或下載 formatted.json（UTF-8 無 BOM）。Clipboard 不可用時提供 readonly 結果供手動複製。無有效結果時兩動作停用。 |
| FR-10 | 「全部清除」停止工作、清空原文／結果／錯誤、模式恢復 pretty、撤銷 Blob URL。資料僅當次記憶體，不寫 storage、URL、console；來源以 textContent/value 呈現，任何 __proto__、constructor 或 HTML 字樣都僅是資料。 |
| FR-11（U02候選） | 當前來源的已知錯誤具有有效UTF-16整數offset時，提供「前往錯誤位置」。明確啟用才focus原文並setSelectionRange(offset,offset)，含EOF；不改字、不auto修復／重檢，不在worker回覆時搶焦點。編輯／模式／清除／取消／重跑／遲到回覆使舊位置失效。詳見OUTCOME-UPGRADE-2026-10-12.md。 |

## 可接受的限制

本產品不把 JSON 轉為一般 JS 資料物件，不執行輸入中的函式，也不提供程式碼 runner。長數字原文保留不等於下游應用也能保留精度。將不成對 surrogate 與重複 key 當錯誤是明示的互通性限制，不應宣稱接受所有形式的 JSON。

每次操作只保留一份目前原文與結果；重新運算丟棄舊結果。清除不能撤銷使用者已下載檔案或外部剪貼簿，也不承諾記憶體物理抹除。

延後任何樹編輯、schema、修復非法 JSON、檔案讀取、批次、遠端載入或巨型資料；沒有自動修復按鈕。


---

## 原文件 TECHNICAL.md

# 技術規格

這是規格，尚未實作。原生 HTML/CSS/ESM，Node 24+ node:test；零 runtime 套件。

## 檔案樹

    package.json
    scripts/serve.mjs
    scripts/check.mjs
    scripts/build.mjs
    public/index.html
    public/styles/tokens.css
    public/styles/app.css
    public/js/app.mjs
    public/js/worker.mjs
    public/js/core/lexer.mjs
    public/js/core/parser.mjs
    public/js/core/formatter.mjs
    public/js/core/session.mjs
    public/js/core/export.mjs
    test/scaffold.test.mjs
    test/lexer.test.mjs
    test/parser.test.mjs
    test/formatter.test.mjs
    test/session.test.mjs
    test/export.test.mjs

serve 僅提供 public/，綁127.0.0.1:4173；build 只複製經審核靜態檔至 dist/。package 設 private:true/type:module；dev/test/check/build 分別映射 node scripts/serve.mjs、node --test、node scripts/check.mjs、node scripts/build.mjs。細則見 [工程](docs/ENGINEERING.md)。

## 不丟資料的表示法

禁止 JSON.parse(source) 再 JSON.stringify 作格式化；禁止 eval、Function、合併使用者 object、把使用者 key 當作 JS 物件屬性。AST object 只存成有序 entries 陣列。

    Token = {kind,raw,start,end}  // offset 為 UTF-16、end exclusive
    Scalar = {kind:"string"|"number"|"true"|"false"|"null",raw}
    ArrayNode = {kind:"array",items:Node[]}
    ObjectNode = {kind:"object",entries:{keyRaw:string,keyValue:string,value:Node}[]}
    tokenize(source) -> Result<Token[]>
    parseTokens(tokens,sourceLength) -> Result<Node>
    formatNode(node,mode:"pretty"|"compact") -> Result<string>
    createOutputWriter() -> {append(chunk:string):Result<void>,finish():Result<string>}
    processJson(source,mode) -> Result<{text:string}>
    locate(source,offset) -> {line:number,column:number}
    encodeOutput(text) -> Result<Uint8Array>
    transition(session,event) -> session

成功 {ok:true,value}，失敗 {ok:false,error:{code,offset}}。對超限/能力/逾時等非語法錯誤 offset:null，UI 不顯示行欄。錯誤碼固定：EMPTY_INPUT、INPUT_TOO_LARGE、TOKEN_LIMIT、TOKEN_TOO_LONG、DEPTH_LIMIT、INVALID_UNICODE、INVALID_JSON、DUPLICATE_KEY、OUTPUT_TOO_LARGE、INVALID_MODE、TIMEOUT、UNSUPPORTED、WORKER_FAILED。

## Lexer 的逐步規則

1. 僅接收 string，先檢 UTF-16 / UTF-8 大小及 raw surrogate 成對；大小超限優先。JSON whitespace 僅 U+0020、0009、000A、000D。
2. 從左到右掃描：{}[]:, 為單字元 token；true/false/null 必須完整；未知字元報第一個位置。
3. 數字以狀態逐段辨識：可選負號；0 或 [1-9] 後續 digits；可選小數點但後必有 digit；可選 e/E、可選正負號但後必有 digit。後面的非分隔符由 parser 拒絕。保留 raw，不使用 parseFloat、Number 或運算。
4. string 由雙引號開始；掃到未被 escape 的雙引號結束；拒絕未 escape 的 U+0000..001F。escape 只接受 quote、backslash、slash、b/f/n/r/t 或 u 加四個 hex；逐字掃描，不以一條寬鬆 regex 吃整個 JSON。
5. 通過 string 詞法後，允許僅對這個 string token 使用 JSON.parse(token.raw) 取得 decoded string，檢查 decoded surrogate 成對。不得對整份 JSON 或 object token 呼叫 JSON.parse。decoded 只為 key 去重與 Unicode 檢查，不拿它重寫 raw。
6. 每推一 token 檢 50,000 上限；token 長度在掃描時檢查。EOF error offset 使用 source.length；不得把失敗來源加入 Error.message。

## Parser 與 formatter

以有界 recursive descent 實作 value/object/array。root scalar depth=0；進入 root container depth=1，每層先確認 <=64 才遞迴。object 必須 key:string → colon → value，之後只能 comma+下一 key 或 close；array 同理。禁止尾逗號。最後必須完全耗盡 tokens。

每個 object 建立新的 Set<string>，用 decoded key 判等。發現重複時 offset 指向第二個 key 的開頭引號。允許 "__proto__"、"constructor"、"prototype"，但只是 entries 中字串；never Object.assign/Object.fromEntries/spread 到任何一般物件。AST 固定欄位由程式建立，DOM 不動態建立使用者命名屬性。

pretty：遞迴組成 token 與固定 whitespace chunks；非空容器開括號後 LF、每項前兩空格乘深度；項間 comma+LF，結束前 LF+父層縮排；key與value間輸出單一": "（一個冒號、一個空格）。compact 只輸出語法 token。空容器不換行；無尾端 LF。逐 chunk 累計 UTF-8 bytes，超過4MiB立即中止，再 join，避免先建無界巨字串。

createOutputWriter 由 formatter.mjs 匯出供純函式測試，固定上限4,194,304 bytes，不接受使用者改寫。append 在加入 chunk 前計量，超限設永久失敗狀態；失敗後 finish 只回 OUTPUT_TOO_LARGE，不 join 或回傳部分結果。這也是 JS-19 直接測試的介面。

locate 從來源開頭走到 offset：CRLF 消耗兩 units，line++/column=1；CR 或 LF 同樣重設；其餘每 code unit column++。錯誤位置是 UI 輔助，不把原文寫 log。

## Worker 與資料生命週期

worker 接收 {type:"process",jobId,source,mode}，回 {type:"result",jobId,result}；只在 running 且 jobId 相符時採用。狀態 idle/dirty/running/success/error；取消返回 dirty，clear 到 idle。修改來源或模式，先 jobId++、terminate、清 watchdog，再清結果。5 秒逾時 terminate；停止後不自動重跑。每次工作使用新 worker，完成也終止。

下載 application/json，檔名 formatted.json；不再 parse 結果，直接驗證大小及 UTF-8 encode。Blob URL 在 click 後1秒、新下載、clear、pagehide 撤銷。Clipboard 明確 click 後寫入；失敗留可手動選取結果。沒有帳號、storage、service worker、telemetry 或處理請求。

## 官方依據與驗證限制

2026-09-23 查閱：

- [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259.html)：JSON grammar、數字互通性、同名鍵與 Unicode 注意事項。本工具的深度／大小／重複鍵拒絕是自訂產品限制。
- [ECMAScript JSON.parse](https://tc39.es/ecma262/multipage/structured-data.html#sec-json.parse)：僅以原生解析器解碼已驗證 string token；不依賴新提案的 reviver source 支援。
- [WHATWG Encoding](https://encoding.spec.whatwg.org/) 與 [Worker](https://html.spec.whatwg.org/multipage/workers.html#dom-worker-terminate)：位元組編碼與取消生命週期。

尚未驗證任何浏覽器版本、效能或剪貼簿權限情境。先按 ACCEPTANCE 驗證；能力不足顯示不支援，不能偷偷上傳。


---

## 原文件 UX-SEO.md

# UX 與 SEO

這是規格，尚未實作。Product App 模式；遵守 [共用設計](docs/DESIGN-SYSTEM.md)。

## 畫面結構

    GlossQuote-Labs / JSON                         全部清除
    JSON 檢查與排版
    原始數字寫法保留；重複鍵會停止處理。
    (o)兩空格排版 ( )壓成一行          [檢查並整理]
    JSON 原文                       整理結果
    [可編輯 textarea             ]  [唯讀 textarea       ]
    錯誤位置 / 狀態                 [複製結果] [下載 JSON]
    限制說明 / 方法 / FAQ

    手機
    H1 / 原文 label
    [來源]
    排版模式（兩選一）
    [檢查並整理] [全部清除]
    狀態 / 錯誤位置
    [唯讀結果]
    [複製結果] [下載 JSON]
    限制與 FAQ

不做 tree viewer、token 彩色 HTML 或可拖曳物件；JSON 本文是最大畫布。來源與結果有等寬字型但標籤使用 UI 字型。行欄位置跟錯誤一起顯示，不把實作 token 數放在主要流程。

U02（2026-10-13候選）：錯誤摘要下方相鄰放「前往錯誤位置 / Go to error」，只在當前有效offset時顯示／啟用。說明「只移動插入點，原文不改動。/ Moves the caret. Your source stays unchanged.」。按鈕aria-controls=source、aria-describedby連摘要與說明；不放進live status使screen reader朗讀控制內容。沿用44px／focus／字型與間距，320px重排；非錯誤狀態沒有假定位功能。兩語靜態操作教學說明手動修正後再檢查，SEO頁面及首頁連結維持。

## 狀態文案

- idle：「貼上 JSON，檢查後再複製整理結果。」
- empty：「請先貼上 JSON。」沒有結果區假資料。
- dirty：「內容或排版模式已變更，請重新檢查。」
- running：「正在檢查與整理 JSON…」顯示取消，不顯示猜測百分比。
- success：「語法檢查完成，數字與字串原文寫法已保留。」
- INVALID_JSON：「JSON 語法不完整或含不支援內容。請檢查第 {line} 行、第 {column} 欄。」
- DUPLICATE_KEY：「同一物件出現重複鍵，已停止整理。請檢查標示位置。」不回顯鍵。
- INVALID_UNICODE：「字串含不完整的 Unicode 字元，請修正來源。」
- 各 limit：「資料超過本工具的大小或結構上限，請分段處理。」在相鄰 details 列完整上限。
- 取消：「已取消，原文保留。」逾時：「處理超過時間上限，請縮小內容再試。」
- 不支援：「此瀏覽器缺少本機處理能力，無法開始。」無雲端 fallback。
- clipboard error：「無法寫入剪貼簿，請選取整理結果後手動複製。」

錯誤以 aria-describedby 連來源，role=status 只宣布摘要；不自動朗讀大段 JSON。不因錯誤把來源清空。Tab 順序由來源→模式→處理→清除→結果操作；不攔截 textarea 的原生編輯快捷鍵。44px 控制目標、雙層焦點、正文4.5:1、控制3:1。320px／200% 縮放時垂直堆疊；僅 textarea 可局部水平捲動；reduced-motion 無非必要運動。

## 可索引內容

- slug：/tools/json-formatter/
- title：JSON 檢查與排版・保留數字原文｜GlossQuote-Labs
- description：在瀏覽器檢查 JSON、找出重複鍵，選擇兩空格排版或壓成一行。保留原始數字和字串寫法，工作內容不送往處理伺服器。
- H1：JSON 檢查與排版
- 說明：貼入 JSON，確認語法與重複鍵檢查後，複製更容易閱讀的排版。大型整數和小數的原始文字寫法會保留，但不代表所有下游軟體都支援相同精度。

FAQ：

1. 「會改變很長的數字嗎？」只調整 token 之間的空白，不先轉為 JavaScript Number，所以數字原始字面會保留。
2. 「為什麼重複鍵不能格式化？」不同軟體可能只保留一筆或採不同結果；此工具停止處理，請先明確選定來源。
3. 「支援註解或尾逗號嗎？」不支援。MVP 只接受限制範圍內的嚴格 JSON，不會自動猜修復方式。
4. 「我的 JSON 會被保存嗎？」工具只在本次頁面記憶體處理；重新載入不主動恢復內容。自行下載或複製的內容由裝置管理。

以上 title/H1/說明/FAQ 皆做成靜態 HTML。預覽保留 noindex,nofollow；正式 canonical、sitemap、網域必須等發布授權及真實網址。不用假星等、使用者數、搜尋量或全瀏覽器支援宣稱。


---

## 原文件 ACCEPTANCE.md

# 驗收案例

這是規格，尚未實作；全部案例待執行。表內 JSON 文本原樣輸入，預期字串中 \n 表示 LF；特殊產生式按 JavaScript 建立假資料。

| ID／類型 | 需求 | 輸入／步驟 | 預期 |
|---|---|---|---|
| JS-01 自動 | FR-01 | ""、" \t\r\n" | EMPTY_INPUT，無結果 |
| JS-02 自動 | FR-03,06 | {"a":[1,true,null]}；pretty | "{\n  \"a\": [\n    1,\n    true,\n    null\n  ]\n}"，無末尾 LF |
| JS-03 自動 | FR-05,06 | { "x" : 9007199254740993, "y":1.2300, "z":-0, "e":1e400 }；compact | {"x":9007199254740993,"y":1.2300,"z":-0,"e":1e400} |
| JS-04 自動 | FR-04 | {"a":1,"a":2} | DUPLICATE_KEY、offset:7、line:1,column:8 |
| JS-05 自動 | FR-04 | {"a":1,"\u0061":2} | 同 JS-04；不能只比較 raw key |
| JS-06 自動 | FR-04 | {"a":1,"b":{"a":2}} | 成功，compact 原樣 |
| JS-07 自動 | FR-10 | {"__proto__":{"polluted":true},"constructor":1} | 成功且 compact 原樣；({}).polluted 仍 undefined；未建立使用者命名 prototype 屬性 |
| JS-08 自動 | FR-03,07 | [1,] | INVALID_JSON、offset:3、line:1,column:4 |
| JS-09 自動 | FR-03 | 01、+1、NaN、Infinity、1.、1e、{}{}，各別測 | 各 INVALID_JSON，不輸出修復結果 |
| JS-10 自動 | FR-05 | {"x":"\u0061","y":"a\\/b"}；compact | 字串 token 的反斜線與 escapes 完全保留 |
| JS-11 自動 | FR-03 | "\uD800"；另測 "\uD83D\uDE00" | 前者 INVALID_UNICODE，後者成功且保留 escape 原文 |
| JS-12 自動 | FR-02 | "[".repeat(64)+"0"+"]".repeat(64)；再用65 | 深度64成功，65為 DEPTH_LIMIT |
| JS-13 自動 | FR-02 | " ".repeat(262143)+"0"；再多一空白 | 262144 bytes 成功，262145為 INPUT_TOO_LARGE |
| JS-14 自動 | FR-02 | 含24999個0的陣列，再換成25000個0 | tokens 分別49999成功、50001為 TOKEN_LIMIT |
| JS-15 自動 | FR-02 | 雙引號包住 "a".repeat(65534)；再多一個a | raw token長65536成功，65537為 TOKEN_TOO_LONG |
| JS-16 自動 | FR-02 | "1".repeat(4096)；再以4097 | 前者原文保留成功，後者 TOKEN_TOO_LONG |
| JS-17 自動 | FR-03,06 | {}、[]、true、"x" 各 pretty；另測 BOM+"{}" | 前四各原樣無換行；BOM 為 INVALID_JSON |
| JS-18 自動 | FR-07 | locate("{\r\nx}",3) | line:2,column:1，欄位只計 code units |
| JS-19 自動 | FR-06 | createOutputWriter() 的 append 依序追加共4,194,304 ASCII bytes，再追加1 byte，最後 finish | 邊界允許；多1 byte回 OUTPUT_TOO_LARGE；finish 同錯誤且不 join/回傳部分結果 |
| JS-20 自動 | FR-08 | running job2 接收 job1 成功；clear 後回覆 job2 | 兩回覆皆忽略 |
| JS-21 瀏覽器 | FR-10 | {"x":"<img src=x onerror=alert(1)>"} | 只有文字，無 image/script DOM、網路請求或彈窗 |
| JS-22 瀏覽器 | FR-08,10 | 開始後取消、清除、改模式；用延遲 worker harness | 輸入按各操作保留或清空，舊結果不回來；清除重設 pretty |
| JS-23 瀏覽器 | FR-09 | 複製拒絕、下載 JS-03 | 提供手動複製；formatted.json 精確保留數字原文、UTF-8無BOM |
| JS-24 瀏覽器 | FR-10 | 初次載入後設離線再運算；查 Network/Storage | 沒有運算請求、cookie/storage/IDB 寫入；clear撤銷Blob URL |
| JS-25 瀏覽器 | FR-08 | 禁用Worker；另令worker不回覆 | UNSUPPORTED／TIMEOUT；沒有遠端替代 |
| JS-26 瀏覽器 | FR-01,07,09 | 僅鍵盤完成流程，320px及200%縮放 | 焦點可見無陷阱、label與錯誤關聯、全部按鈕可達、頁面不雙向捲動 |

T00 完成後執行 npm test、npm run check、npm run build；瀏覽器以 npm run dev 啟動後人工驗收並停止。Git 工作目錄另跑 git diff --check。不能以原生 JSON.parse round-trip 驗證長數字；比較輸出 token 原文。來源規格示例不等於產品測試通過。

## U02-ERROR-LOCATION-20261013 候選版

新增FR-11驗收依OUTCOME-UPGRADE-2026-10-12.md與docs/U02-ERROR-LOCATION.md：offset5／EOF6／emoji6／第二鍵7、textarea實際CRLF/LF座標、來源不改、無自動檢查／搶焦點、全部失效／late worker、長行caret可見、Chrome兩語keyboard修正成功。focused `node --test test/error-location.test.mjs`，完整 npm.cmd test/check/build/build:release必跑；舊JSON／匯出／隱私門檻不變。新版source-only不算live，不繼承舊外驗。


---

## 原文件 TASKS.md

# 有順序的實作任務

流程以 AGENTS.md 的「閱讀與執行」「交付與收斂」為準：沿用本 session 已讀文件，只補讀變動／相關段落；同一授權工作依序推進，不因任務切換重問。各任務 allowed paths、前置條件與必要驗收保持有效，缺陷回到其擁有任務修正；來源發布依適用的既有明確授權，不包含網站部署。

本文件定義任務；實際進度以 HANDOFF.md 與最新驗收紀錄為準。每次只執行第一個未完成任務。依 AGENTS.md 的 session 閱讀規則讀取所需規範與目前 HANDOFF。allowed paths 全相對本工具根目錄，不能修改父／兄弟資料夾；每一步完成或失敗都回寫 HANDOFF.md，沒有擴權。

## T00 — 骨架與 parser 設計閘門

- 前置：Node 24+ 已存在；沒有就記錄阻塞。不安裝套件、不改環境。閱讀 TECHNICAL 的官方來源，確認不使用整份 JSON.parse/JSON.stringify。
- Allowed paths：package.json、scripts/serve.mjs、scripts/check.mjs、scripts/build.mjs、public/index.html、public/styles/tokens.css、public/styles/app.css、public/js/app.mjs、test/scaffold.test.mjs、HANDOFF.md。
- 工作：建立四 scripts、private/type、loopback public-only serve；拒絕 traversal/dotfiles/symlink 逃逸。check 真正做 node --check、必要檔案與外部資源/危險DOM掃描；build allowlist 到 dist，不帶 docs/test。建立 scaffold test、noindex 空頁。
- 驗收：腳本建立後 npm test、npm run check、npm run build；人工審查輸出及安全路徑。
- 完成：寫明 parser 的 token/AST 方法和尚未驗證的瀏覽器能力，回寫 HANDOFF。若無法實作 parser，停止而非降級為有損 round-trip。

## T01 — Tokenizer

- 前置：T00。
- Allowed paths：public/js/core/lexer.mjs、test/lexer.test.mjs、HANDOFF.md。
- 工作：逐字掃描、whitespace allowlist、string escapes、原文保留、surrogate、token數與長度、UTF8大小、locate；先測合法與非法 token。
- 驗收：node --test test/lexer.test.mjs；npm run check；覆蓋 JS-09/10/11/13/15/16/18 對應 lexer 部分。
- 完成：沒有 Number 轉換、沒有來源記錄，回寫 HANDOFF。

## T02 — Parser 與無損排版

- 前置：T01。
- Allowed paths：public/js/core/parser.mjs、public/js/core/formatter.mjs、test/parser.test.mjs、test/formatter.test.mjs、HANDOFF.md。
- 工作：有界 recursive descent、各 object 的 Set、完整耗盡、AST entries、pretty/compact、輸出byte計量寫入器；processJson 串接。
- 驗收：node --test test/parser.test.mjs test/formatter.test.mjs；npm test；npm run check；JS-01至JS-19全部有自動證據。
- 完成：duplicate/prototype/長數字/Unicode回歸通過，回寫 HANDOFF。

## T03 — Worker 與可操作介面

- 前置：T02。
- Allowed paths：public/js/worker.mjs、public/js/core/session.mjs、test/session.test.mjs、public/js/app.mjs、public/index.html、public/styles/tokens.css、public/styles/app.css、docs/UI-BRIEF.md、HANDOFF.md；專用 .runs/json-workbench 瀏覽器 harness／證據。
- 工作：固定協議、jobId、取消、5秒watchdog、全部清除；來源與readonly結果；模式變更失效；固定行欄錯誤。複製下載先停用。
- 驗收：node --test test/session.test.mjs；npm run check；npm run dev 後 JS-20/21/22/25/26，停止服務。
- 完成：真瀏覽器與Node證據分列，回寫HANDOFF。

### T03 經 JS-24 實測發現的離線修正

- 新增相關 allowed paths：scripts/build-worker.mjs、public/js/worker-source.mjs、test/worker.test.mjs、public/favicon.svg；scripts/check.mjs／build.mjs／serve.mjs 的 bundle 驗證與必要 CSP／SVG MIME；package.json 的 build:worker。
- 原生 module Worker 在離線時重新請求程式失敗。建置時用固定來源合併單一 Worker，生成受驗證的常數模組，頁面初始載入後以 Blob 啟動；不插入使用者內容、不 eval、不新增依賴。worker object URL 在停止時撤銷。check 驗證生成內容與原始碼逐位元一致。

## T04 — 匯出與隱私邊界

- 前置：T03。
- Allowed paths：public/js/core/export.mjs、test/export.test.mjs、public/js/app.mjs、HANDOFF.md。
- 工作：不重新parse輸出、UTF8 bytes、固定下載檔名、URL撤銷、剪貼簿拒絕回復、離頁清理。
- 驗收：node --test test/export.test.mjs；npm run check；npm run dev後 JS-23/24。
- 完成：無外部請求、無持久資料、下載原文保留，回寫HANDOFF。

## T05 — 靜態說明與 SEO

- 前置：T04。
- Allowed paths：public/index.html、public/styles/app.css、HANDOFF.md。
- 工作：實作UX-SEO真實title/description/H1/FAQ與限制；保留noindex，不建立正式canonical/sitemap。
- 驗收：npm run check；關閉JS後仍可讀說明；320px與200%縮放。
- 完成：沒有虛構支援或安全保證，回寫HANDOFF。

## T06 — 完整驗收

- 前置：T05。
- Allowed paths：HANDOFF.md、TASKS.md。
- 驗收：npm test、npm run check、npm run build；Git環境另git diff --check；依ACCEPTANCE跑全部瀏覽器案例。
- 完成：所有結果逐一記錄才標本機MVP完成；未跑項目不可標通過。bug回對應任務修正，此步不越權改原始碼；來源發布依 AGENTS.md 的適用既有授權；本步不授權網站部署。

## T07 — 完整雙語（TASK-ENTRY 2026-10-10 授權）

- 前置：T06；範圍 public/en/index.html、public/js/locales.mjs、public/js/app.mjs、public/index.html、test/locales.test.mjs、docs/UI-BRIEF.md、HANDOFF.md。
- 工作：繁中＋英文靜態內容、所有狀態／錯誤、語言切換、同語系 glossquote.com 首頁連結；無持久語系設定。
- 驗收：語系 key 對等、兩語完整流程、靜態內容與相對資產路徑；npm.cmd test/check/build。

## T08 — 可審查 SEO 與發布工具鏈（TASK-ENTRY 授權）

- 前置：T07；範圍 scripts/**、test/release.test.mjs、public/404.html、public/_headers、package.json、.gitignore、wrangler.jsonc、docs/RELEASE-CANDIDATE.md、docs/VALIDATION.md、docs/SOURCE-MANIFEST.json、README.md、HANDOFF.md。
- 工作：預設 preview noindex；顯式 release origin 只接受 https://json.glossquote.com；canonical、雙向 hreflang／x-default、sitemap、robots、404、MIME/security headers；獨立公開發布清單與 SHA256。只準備，不讀憑證或部署。
- 驗收：預覽及 release build 隔離、索引／資產檢查、安全 allowlist、必要 gate；正式網站 NOT_DEPLOYED。

## T09 — 公開來源與整合交接（TASK-ENTRY 授權）

- 前置：T08；範圍 scripts/publish-source.mjs、scripts/review-source.mjs、test/publication.test.mjs、README.md、docs/SOURCE-MANIFEST.json、docs/RELEASE-CANDIDATE.md、docs/VALIDATION.md、HANDOFF.md、TASKS.md、project.json；專用 .runs/json-workbench/** 和 .runs/github-publish/glossquote-labs-json-workbench/**。
- 工作：先審查發布清單與內容，保留發布副本歷史；僅本工具 public/scripts/test/必要文件。用既有 gh 身份發布 KYStr/glossquote-labs-json-workbench，驗證 PUBLIC＋遠端 HEAD；不操作孵化器 Git index，不讀任何憑證。
- 驗收：公開 URL、verified commit、清單 hash、所有必要本機結果、人工 NOT_RUN／hosting 分列；READY_FOR_INTEGRATION 供原主對話審查，無正式部署。

## 本次已完成狀態（2026-10-10）

T00–T09 全部完成，必要gate PASS；T06的人工NOT_RUN與T08的主對話部署整合驗收分列HANDOFF。來源PUBLIC、remote HEAD已驗證；READY_FOR_INTEGRATION，網站NOT_DEPLOYED。沒有額外scope、子代理或等待新使用者批准。

## U02-ERROR-LOCATION-20261013 — 當前錯誤插入點定位

- 前置：主代理已於2026-10-13實際派發；精確需求見OUTCOME-UPGRADE-2026-10-12.md。
- Allowed paths：本工具public/**、test/**、必要scripts、PRODUCT/UX-SEO/ACCEPTANCE/TASKS/HANDOFF/docs及自己的reviewed公開發布副本；專用.runs/json-outcome-2026-10-13/**。不修改其他工具／首頁／共享狀態，不讀憑證或部署、不再委派。
- 實作：目前來源有效error offset才可跳转；明確按鈕focus/setSelectionRange(offset,offset)，支持EOF與UTF-16；不修改或auto修復原文；每次動作核對source與session，來源／模式／清除／取消／重跑／遲到reply失效。
- 驗收：focused tests、既有test/check/build/build:release、真Chrome兩語offset5／EOF6／emoji6／第二鍵／textarea CRLF正規化／長內容可見／keyboard修正成功／race；reviewed PUBLIC更新與remoteSHA、固定source ZIP/hash manifest、前後環境guard一致。
- 新版狀態：候選／待主代理獨立驗收與發布；不繼承舊外驗通過，版本完成仍需使用者外部確認。

- 2026-10-13結果：實作／focused／Chrome／完整必要gate PASS；PUBLIC候選89b9b91746f244af2c99c5ce8711e2c9bcaaf73d與固定ZIP／manifest驗證PASS。**SOURCE_CANDIDATE_READY_FOR_PRIMARY_REVIEW／WRITE_OWNERSHIP_RELEASED**，新版尚未部署、主驗與外部複驗尚待，不標整體版本完成。詳見HANDOFF本任務receipt。


# 文字分段與字數限制 — 既有規格保存

Task ID: `labs-23-text-chunker` · Spec ID: `spec-23-text-chunker`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格：文字分段與字數限制

狀態：SPEC_ONLY。需求價值是待驗證假設，不代表平台相容性或市場需求已驗證。

## 使用者與工作

使用者在手機或桌面貼入長草稿，想按一個自己可設定的長度切成數個可複製片段。工具讓使用者知道長度如何計算，並確保片段依原順序串接後等於原文。

## 功能需求

- **FR-01 輸入：** 單一多行來源最多 100000 UTF-16 code units。空字串拒絕；只有空白的非空來源仍可分段。超限時不截斷，不保留舊結果冒充最新。
- **FR-02 上限：** 每段上限為正整數 1–10000。數值欄位原始字串最多 32 code units；trim ASCII whitespace 後僅接受 ASCII digits。拒絕符號、逗號、小數、指數、全形數字及超長值；前導零可接受。UI 在上限旁始終明示 Unicode code points，不引用平台限制。
- **FR-03 計數定義：** 長度按 JavaScript Unicode code points（code point iteration）計數；不是 UTF-16 code units、使用者看到的 grapheme cluster、emoji 字形或任何平台計數。合成的 surrogate pair 算 1；不成對 surrogate 拒絕為 INVALID_UNICODE。來源其它 Unicode 原樣保留。
- **FR-04 嚴格模式：** mode strict 按 code point 由前往後切，每片最多上限個 code points。不可為了單字/行或 emoji 叢集偷偷偏移。
- **FR-05 優先換行：** mode prefer-lf 先看目前段起點起算的最多 L 個 code points；若其中至少有一個 LF（U+000A），在最後一個 LF 後切，LF 留在當段。找不到 LF 就在上限處切。即使候選範圍全是 LF 也照此切。
- **FR-06 換行保留：** Core 對收到的 JavaScript source 字串不 normalize CRLF/CR/LF、不 trim、不插入空格/分隔線；CR 是一個 code point，CRLF 是兩個，只有 LF 是 preferred boundary。介面以 textarea.value 為當下 source 且不再改寫它；瀏覽器本身可能在貼上/編輯時把外部 CRLF 或 CR 正規化成 LF，工具不宣稱可還原貼入前位元組。當下 chunks 串接必須等於 textarea.value。
- **FR-07 上限段數：** 最多 1000 段。若演算法會產生第 1001 段，整次拒絕並清空輸出，顯示來源太長或上限太小，要求調高段長或縮短來源；禁止回傳部分結果或靜默截斷。preferred mode 實際切點可能令段數與 strict 不同，以最後產物計數為準。
- **FR-08 顯示：** 顯示來源 code point 數、段數與各片序號、code point 數、完整預覽。任何實際片段不自動加段號或分隔字串。提供「複製第 N 段」；不提供全段合併 TXT 下載。
- **FR-09 重算：** 使用者按「分段」才運算，不在每次 keystroke 執行，避免 IME 組字干擾。來源、上限或模式任何變化立即增加 revision、清空全部舊片段、清除複製狀態和下載/複製可用性。欄位無效時不隱藏該錯誤或沿用舊結果。
- **FR-10 複製：** 每段按鈕只要求複製對應片段，clipboard.writeText 使用點擊時固定 snapshot。一次只允許一筆 copy promise；忙碌時禁用全部編輯及其他複製按鈕直到 resolve/reject，避免使用者修改後舊文字晚到污染剪貼簿。請求帶 revision 及遞增 requestId；過期 promise 不可寫新版狀態/提示。API 不存在或 reject 時顯示手動選取對應只讀 textarea 的可操作 fallback；不得宣稱已複製。
- **FR-11 清除：** 清除按鈕把 source、結果及錯誤一併清除並回到初始狀態，不需確認（可恢復方式是使用者重新貼入）。pagehide 清除程式持有的 source/result/copy snapshot；不寫任何 browser storage。
- **FR-12 雙語/文案：** /index.html 繁中、/en/index.html 英文。兩頁明示 code point 計數與可能拆分 grapheme/emoji；不得說「適用所有平台」或舉平台字數上限。
- **FR-13 貼上安全：** 輸入視為純文字；不得使用 innerHTML、執行輸入中的 markup 或將內容寫入 URL、console、Network、storage。錯誤以固定 code 翻譯，不包含來源摘錄。
- **FR-14 裝置使用：** 100000 UTF-16 cap、每次明確 click 計算、1000 片 cap，界定同步記憶體。提供 viewport 320、200% zoom 與手機鍵盤測試；不承諾所有瀏覽器效能。
- **FR-15 文本與片數生命週期：** 分段結果只活在目前頁面。重新載入/離開會消失；不自動保存或恢復。

## 不做的事

不算 grapheme，不守平台特定限制，不智慧斷詞，不去掉空白、不重新格式化換行、不添加段號、不合併 TXT 下載、不自動把輸出送往平台。



---

## 原文件 TECHNICAL.md

# 技術規格：文字分段與字數限制

狀態：SPEC_ONLY；API 與測試尚未實作，所有驗證 NOT_RUN。

## 邊界與檔案

靜態雙語頁面在瀏覽器本機執行；Node 24+ 僅供 ESM、Node built-in node:test、loopback preview 和 allowlist build。runtime 無第三方套件、無 Worker、無 server endpoint、無 CDN/字型。

目標檔案：package.json；.gitignore；public/index.html、public/en/index.html；public/styles/app.css；public/js/app.mjs、i18n.mjs、state.mjs；public/js/core/text-chunker.mjs；scripts/serve.mjs、check.mjs、build.mjs、validation.mjs；test/text-chunker.test.mjs、test/ui-contract.test.mjs、test/toolchain.test.mjs。

dev 固定 127.0.0.1:4203，spikePort 5203 僅隔離使用。npm scripts：dev、test、check、build；Node >=24。

## Core API 與錯誤

唯一公開函式 splitText(request) 接受 plain object（prototype 僅 Object.prototype 或 null），exact own keys 僅 source、limit、mode；三欄都是 own enumerable data properties。使用 Reflect.ownKeys 與 property descriptors，不讀 getter；拒絕缺/額外/symbol/non-enumerable/accessor keys 和其它 prototype，回 INVALID_REQUEST。

- parseLimit(raw) 僅接收 UI 原始 string：先 UTF-16 長度 <=32，再 trim ASCII whitespace U+0009–000D/U+0020，接受 ASCII digits+，最後範圍 1..10000。成功 exact result {ok:true,value:number}；失敗 exact result {ok:false,code}；codes 為 INPUT_TOO_LONG、INTEGER_REQUIRED、OUT_OF_RANGE。前導零接受但不改回 raw field。
- validateSource(source) → {ok:true,utf16Length,codePointLength} 或 {ok:false,code}；必須是 string、UTF-16 <=100000、well-formed Unicode 且非空。sourceCodePointLength 僅在整個 source 驗證成功後才計為 Array.from(source).length。
- splitText(request) 中 limit 必須是 parseLimit 已驗證的 Number，不接受 raw string；limit 必須 Number.isSafeInteger 且 1..10000，mode 僅 strict / prefer-lf。
- 成功 exact result {ok:true,chunks:[{index,startCodePoint,endCodePoint,codePointCount,text}],sourceCodePointCount}。index 1-based；offset 是 0-based code point index，start inclusive/end exclusive。
- 失敗 exact result {ok:false,code,chunks:[],sourceCodePointCount:number|null}；任何錯誤都不回 partial chunks。request/source 驗證成功前 count=null；source 有效後才發生的 limit/mode/chunk-limit error 回已驗證的完整 code point count。
- 錯誤優先序固定：request shape/prototype/keys/descriptors/type → source type → source UTF-16 size → unpaired surrogate → empty source → limit type/range → mode → chunk count。source 非字串回 INVALID_SOURCE；來源過長 SOURCE_TOO_LONG、非成對 surrogate INVALID_UNICODE、空字串 SOURCE_EMPTY；limit 非整數或越界 OUT_OF_RANGE；模式錯 INVALID_MODE；超過 1000 段 CHUNK_LIMIT_EXCEEDED。
- 固定錯誤碼：INVALID_REQUEST、INVALID_SOURCE、SOURCE_EMPTY、SOURCE_TOO_LONG、INVALID_UNICODE、INPUT_TOO_LONG、INTEGER_REQUIRED、OUT_OF_RANGE、INVALID_MODE、CHUNK_LIMIT_EXCEEDED。UI 只翻譯固定 code，不包含來源片段。
- 對有效 core source，chunks.map(chunk => chunk.text).join("") 必須逐 UTF-16 code unit 等於 source。core 不 trim/normalize；UI textarea 以瀏覽器當下讀得的 textarea.value 為 source，瀏覽器可能在貼上時先正規化換行，規格不要求還原貼上前的 bytes。

## 演算法

驗證 source 再轉成 Array.from(source) 得 Unicode scalar token array；此前拒絕 unpaired surrogate，故每 token 是有效 scalar value。時間與暫存皆 O(n)，n<=100000，輸出字串總量不超 source UTF-16 長度。每回從 cursor 開始，cap=min(cursor+limit,n)。strict end=cap。prefer-lf 從 cap-1 向 cursor 倒找最後 LF；找到時 end=index+1，否則 end=cap。把 token slice join 為 chunk，記 offsets/count；移至 end。若加入第 1000 段後尚有 token，回 CHUNK_LIMIT_EXCEEDED 並回傳 chunks=[]，不得洩漏局部輸出。由於 limit>=1，每回至少前進一 token，迴圈至多 min(n,1001) 回。沒有自動 trim/normalize/增加分隔符。

## UI state 與 async copy

State exact conceptual fields: source:string、limitRaw:string、mode、revision:number、result:null|chunks、fieldErrors、copy:{busy,requestId,revision,index,status}、disposed:boolean。輸入欄始終保留原始 source/limitRaw；修改 source/limit/mode 時 revision++，同步 result=null 並清除舊 copy status。只按「分段」才呼叫 core；錯誤結果為 null 並顯示固定 code 翻譯。IME composing 時不觸發運算。

複製 click 僅用 user gesture。若 busy/disposed 或 chunk 已失效，拒絕新請求；busy 時立即鎖定所有 copy 按鈕、source/limit/mode、清除、重新分段。開始時 requestId++ 並記為 latestRequestId，捕捉 current revision、chunk index 和 immutable text snapshot，再呼叫 navigator.clipboard.writeText(snapshot)。Promise resolve/reject 只可在 requestId 仍為 latest、revision 相同且未 disposed 時更新提示；finally 也只在同一條件下解除 busy。API 缺少或 reject 時把仍有效的 chunk 放入 readonly textarea、focus/select，提示使用者手動複製；只確認選取，不報 clipboard success。revision/requestId 防晚到 promise 污染新 UI。若 browser promise 一直 pending，明示 busy，不暗示完成、不取消底層 API。

每個 chunk 依 index 對應；結果清除後 copy 失效。pagehide 標 disposed，revision/requestId 遞增並清除 source/result/snapshot 引用。剪貼簿只由使用者明確啟動，不在 input event 寫入。

## Toolchain

Node server 預設 bind 127.0.0.1:4203，靜態 GET/HEAD，安全 containment 和 public-only allowlist。若 4203 已占用，不連線或停止既有服務，使用 OS 分配的 loopback 暫用 port，印出並記錄實際 URL。check 驗 module syntax、雙語結構、HTML active asset refs、loopback config；build 只把核可 public 複製到本工具 dist。測試離線且 fake source，不把 clipboard mock 成原生 browser acceptance。source 不進 log。




---

## 原文件 UX-SEO.md

# 介面與 SEO 規格：文字分段與字數限制

狀態：SPEC_ONLY。任何預覽/正式 SEO 與實際瀏覽器畫面皆 NOT_RUN。

## 產品畫布

Product App 模式，第一屏就是來源文字欄、每段上限、切法選擇與「分段」主按鈕；結果緊接在輸入下方，顯示總 code point 數和每段完整文字。說明直接靠近上限欄位，不藏在 tooltip。範例只由使用者主動載入，並標示「範例文字」。

桌面：窄產品列；左側/上方來源多行文字和設定，主按鈕與狀態靠近表單；下方完整的分段輸出列表。手機 320 CSS px：單欄、來源 textarea 全寬、數字與模式控件可折行、每段 copy 按鈕靠近該段；不在整頁水平捲動。1000 段可採分頁或虛擬化，但必須清楚顯示總段數、可遍歷所有段，任何頁切換不得改變 core output 或 copy payload。

## 固定文案 / 狀態

- 輸入 placeholder 不是標籤；可見標籤「要分段的文字」/ “Text to split”.
- 上限標籤「每段上限（Unicode code points）」/ “Maximum per chunk (Unicode code points)”.
- 旁註：「這不是 emoji 圖形數，也不代表任何平台的字數限制。」英文：“This counts code points, not visible emoji or a platform-specific limit.”
- 嚴格模式：依上限直接切 / Strict limit.
- 優先換行：優先在換行處切 / Prefer line breaks.
- Emoji 注意：「一個畫面上的 emoji 可能由多個 code points 組成；分段可能切開它或其他組合字元。」英文 copy must communicate identical limitation.
- 初始空狀態：「貼上文字並選擇上限，再按分段。」沒有結果時不顯示虛構片段。
- 正在運算：同步計算快速完成前以 aria-busy，不用假進度條。
- 成功：「已分成 N 段。逐段核對後複製。」每段標出 code point count。
- 空來源錯誤：「請先貼入文字。」
- 超長來源錯誤：「文字超過 100,000 UTF-16 code units；未產生部分結果。」
- 超過 1000 段：「會超過 1,000 段，沒有輸出部分結果。請提高每段上限或縮短文字。」
- 複製成功只在原生 Promise resolve 且 revision/requestId 仍新時顯示「第 N 段已複製。」
- 剪貼簿拒絕：「瀏覽器未允許自動複製；第 N 段文字已選取，請使用複製指令。」不作成功 toast。
- 刷新提示：「重新載入會清除文字和分段結果。」

狀態/錯誤具文字及圖示，不只顏色。tab order 先 source、上限、模式、分段、結果片段依序 copy。各 textarea 有可見 label，200% zoom 不裁切。IME composition 結束後仍由使用者按分段；不在 composition 中重繪/改 value。textarea 聚焦時不因分段操作被不必要地跳走。copy fallback 要可用 keyboard 操作。

## SEO 草案

Slug text-chunker；預定 host chunks.glossquote.com，尚未部署。預覽 noindex/nofollow、Disallow:/；M1 無 production canonical/sitemap。正式資訊 M2 才固定，M3 live 後驗真實 URL。

繁中 title：文字分段與字數限制工具｜GlossQuote Tools
description：依 Unicode code points 上限把長文字切成可複製片段，並可選擇優先在換行處切。保留原始內容，不套用平台字數規則。
H1：文字分段與字數限制
頁面說明：指定每段最多 code points，檢視完整分段；切出的片段串接後與輸入相同。
FAQ：「它會依照某個社群平台的限制嗎？」不會。上限由你設定，數的是 Unicode code points。「emoji 算幾個字？」本工具不是按畫面上的 emoji 圖形計數，一個字形可能由多個 code points 組成。「切段會保留換行嗎？」會保留文字欄目前顯示的來源；瀏覽器可能在貼上時先將換行標準化為 LF，優先換行模式只在 LF 處尋找切點。

English title: Text Chunker with a Unicode Code Point Limit | GlossQuote Tools
description: Split long text into copyable chunks by a chosen Unicode code point limit, with an optional preference for line breaks. No platform rules are assumed.
H1: Split text by a code point limit
English FAQ: “Does this follow a social platform’s character limit?” No; you set the limit and this tool counts Unicode code points. “Are emoji one character?” A visible emoji can contain several code points and may be split. “Will line breaks stay the same?” Chunks preserve the source currently shown in the text field; a browser may normalize pasted line endings to LF before the tool reads them.

M2 production: canonical self links, reciprocal zh-Hant/en plus x-default to Chinese, matching visible content, OG metadata, static WebApplication schema only if it describes visible function. No invented usage statistics, platform integrations, search claims or guaranteed performance.


---

## 原文件 ACCEPTANCE.md

# 驗收規格：文字分段與字數限制

狀態：SPEC_ONLY，全部案例 NOT_RUN。自動測試與真瀏覽器證據分開；clipboard mocks 不代表原生 clipboard 通過。

## 自動核心案例

| ID | 輸入/操作 | 預期 |
|---|---|---|
| A01 | limit 1、source A | 一段 A，count 1 |
| A02 | limit 4、source ABCDE | ABCD / E，counts 4 / 1 |
| A03 | source A😀BC、limit 2 strict | A😀 / BC；source count 4 code points，5 UTF-16 units |
| A04 | source "ab\ncdEF"、limit 4 prefer-lf | "ab\n" / "cdEF"，counts 3 / 4 |
| A05 | source "abcdEF"、limit 4 prefer-lf | "abcd" / "EF"，無 LF 時 hard split |
| A06 | source "\n\n\n"、limit 2 prefer-lf | "\n\n" / "\n"；LF 留在前段 |
| A07 | source "A\r\nB"、limit 2 strict | "A\r" / "\nB"，CRLF 不 normalize |
| A08 | 上述 A07 用 prefer-lf、limit 3 | "A\r\n" / "B"，preferred boundary 僅看 LF |
| A09 | source 含尾端 LF、limit 大於長度 | 尾端 LF 在最後段保留 |
| A10 | source "  A  "、limit 2 | 空格不 trim，輸出逐碼點重建原文 |
| A11 | 空 source | SOURCE_EMPTY，chunks=[] |
| A12 | 100000 UTF-16 ASCII units、limit10000 | 可得 10 段，重建 source 完全相同 |
| A13 | 100001 UTF-16 units | SOURCE_TOO_LONG，不回傳部分結果 |
| A14 | limit 1、1001 code points | CHUNK_LIMIT_EXCEEDED，chunks=[] |
| A15 | limit 1、1000 code points | 1000 chunks 正常，不遺漏最後一碼 |
| A16 | limit 0 或 10001 | OUT_OF_RANGE |
| A17 | limit "1e2"、"+2"、"1,000"、全形 ２ | INTEGER_REQUIRED |
| A18 | limit 含 33 code units | INPUT_TOO_LONG |
| A19 | mode other | INVALID_MODE |
| A20 | source 含 unpaired high surrogate | INVALID_UNICODE，無半片結果 |
| A21 | emoji ZWJ family string，限制 1 code point | 可在 grapheme 中切段；所有 scalar 保持且說明非字形計數 |
| A22 | 每片串接所有 A01–A21 有效輸出 | 嚴格等於 source 的 UTF-16 code units |
| A23 | 每片 count 加總 | 等於 Array.from(source).length |
| A24 | 拒絕片數超限後再次用足夠大的 limit | 新操作完整成功，不沿用舊錯誤/殘片 |
| A25 | 不同 LF/CRLF/CR 來源 | 僅 LF 作 preferred candidate，source 未被重寫 |
| A26 | 來源含 HTML/script 樣式字串 | output 只作文字，不執行、不建立元素 |
| A27 | limit 前導零 "0002" | 接受為 2 |
| A28 | limit ASCII 空白包 2 | trim 後接受；非 ASCII 全形空白不另行 normalize |

## 真實瀏覽器 M1

- B01 繁中貼入 A😀BC，選 strict/2，確認頁面標 code points、結果 A😀 / BC 和 count 正確。
- B02 英文頁操作相同流程，字數定義和 grapheme 限制均完整英文化。
- B03 在 textarea 中輸入或貼上多行文字，讀取 textarea.value 作為當下 source；兩種 mode 切換，chunks 串接必須與這個 value 完全相同。另以純 core fixtures 驗 CRLF/CR 保持。瀏覽器貼上本身可能把換行正規化成 LF，不要求恢復貼上前位元組。
- B04 在手機寬 320 使用多行文字與 IME，composition 時不改值，手動按分段後結果可讀。
- B05 copy 某片成功時只複製該片；拒絕/不支援時選取同片並顯示手動操作說明。測試若沒有真實 clipboard 不可 PASS。
- B06 copy busy 時嘗試改來源/模式，controls 保持鎖定；promise 結束後可再編輯，舊 request 不改新狀態。
- B07 使用鍵盤完成設定、切換模式、分段、選段與 fallback，focus 可見。
- B08 320px viewport 必須實測：主流程無整頁水平溢出，大量段可到最後一段並看見總片數。
- B09 200% browser zoom 若現有工具無法調整，記 NOT_RUN；不能和 B08 合併標 PASS。
- B10 DevTools Network/Storage 確認無來源上傳或持久儲存；無完整工具能力逐項 NOT_RUN。
- B11 refresh notice 可見；刷新後沒有被暗中恢復的資料。

## 判定規則

全部 A cases 自動 gate 必須 PASS；B01–B04、B07、B08 是 M1 真瀏覽器必驗；320px 必須檢查。B09 zoom 與 B10 Network/Storage 在工具能力不足時可各自標 NOT_RUN。Clipboard 為真原生能力，人工可標明設備不足並列 NOT_RUN，但不可將 mock 結果標為成功。



---

## 原文件 TASKS.md

# 任務與里程碑：文字分段與字數限制

狀態：SPEC_ONLY。任務順序不可跳過；每個階段只改當期允許路徑，驗收未通過先修本任務。

## M1 / T00：完整本機雙語 MVP

前置：讀完本資料夾六份產品規格與 docs；確認 Node >=24；長測試/建置前後使用 docs/ENGINEERING 所述 Windows guard；記錄當前狀態及文件 hash。若同檔有人編輯、遇不明環境 drift 或需求矛盾，停止報告，不覆寫。

allowed paths：public/**；scripts/serve.mjs, check.mjs, build.mjs, validation.mjs 及必要的本專案 scripts/*.mjs helper；test/** 僅假資料；package.json、.gitignore、本專案 dist/**。交付狀態可更新 HANDOFF.md、project.json、START-HERE.md、docs/RELEASE-CANDIDATE.md，TASK-ENTRY.md 僅 append-only。不得修改父索引、首頁、其它 tool、根 repo git state、憑證或外部服務。

步驟：
1. 建 private ESM Node24 scaffold、loopback server 127.0.0.1:4203、真 check/build/test。
2. 實作 parseLimit/validateSource/splitText 和 A01–A28；expected 值由 ACCEPTANCE 的固定輸入獨立確認；加入無部分輸出的 >1000 邊界。
3. 完成繁中與英文 Product App：編輯來源/上限/mode 不自動重算而是立即失效，明確按鍵分段；顯示每片完整文字和 code point 數。
4. 實作單片 native copy，busy lock、revision/requestId、clipboard failure selection fallback；只在真 browser 操作確認 native 能力。
5. 完成 responsive、keyboard、IME、text-only 安全、工具鏈 negative fixtures；建立 build 僅公開 source allowlist。
6. 建立後執行 npm test、npm run check、npm run build；啟動本機服務完成 B01–B04、B07、B08、B11。B08 的 320px 必須實測；B09 的 200% zoom、B10 Network/Storage 可依能力分開記 NOT_RUN。B05 native clipboard 若無真實設備能力須明確 NOT_RUN，不用 mock PASS。
7. 固定 source manifest/hash，回寫 HANDOFF/TASK-ENTRY/project.json。M1 凍結交主代理驗收，不能自行進入 M2。

M1 gate：A01–A28 與 npm test/check/build 全 PASS；B01–B04、B07、B08、B11 有真 browser evidence，涵蓋雙語主流程、textarea.value lossless rejoin、修改失效、手機/IME、keyboard、必驗 320px 及刷新提示。B09 zoom、B10 Network/Storage 與 B05 native clipboard 可在工具/設備不足時分項 NOT_RUN，不用靜態掃描或 mock 冒充。主代理明確放行才可 M2。

## M2 / T01：production 與公開 source

前置：主代理已驗收/放行 M1。allowed：本工具 public/**、release/check/build scripts、test/** release tests、package.json、wrangler.jsonc、.gitignore、docs/RELEASE.md、docs/RELEASE-CANDIDATE.md、固定 publishing copy 證據。新增正式 metadata、404、headers、sitemap、production check/build；用正式 origin allowlist。

必要 tests 完成、diff 窄化後，用 reviewed copy 發布 KYStr/glossquote-labs-text-chunker public GitHub repo，不 force；核驗 public visibility、remote SHA 與固定 Git blob ZIP，解壓逐檔比對並從解壓副本重新 build/check。不得部署或改 homepage。記錄命令、SHA、manifest、NOT_RUN；遇 token 權限、source 不一致或意外路徑停止。

## M3 / T02：主代理 live 整合與外驗

主代理負責免費 Cloudflare 部署、正式 HTTP/SEO/首頁兩語驗證和 catalog 更新。此 feature chat 不可部署或自行改首頁。交付後標「已上線，待外部複驗」。外部指出需要修正時回原 feature chat，用具體證據修 own paths、重新檢查及公開 source 更新；仍待主代理重新驗收和發布，使用者/驗收者確認前不標完成。


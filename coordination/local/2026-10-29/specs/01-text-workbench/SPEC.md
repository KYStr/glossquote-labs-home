# 文字整理與統計 — 既有規格保存

Task ID: `labs-01-text-workbench` · Spec ID: `spec-01-text-workbench`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格

現行產品需求；2026-10-13 U01 新版候選需主代理驗收／正式發布與新的外部複驗，不沿用舊版完成判定。

## 工作與成功條件

使用者把一份文字名單整理成可複製的結果。來源永遠可見且不被清理結果覆寫；結果僅由明確的「整理文字」操作產生。

## MVP 需求

| ID | 可觀察行為與預設 |
|---|---|
| FR-01 | 只有一個多行純文字輸入；不自動讀剪貼簿、不接受檔案或 URL。空輸入有效，統計為零。 |
| FR-02 | 原始輸入最多 200,000 個 UTF-16 code units 且 UTF-8 最多 262,144 bytes；任一超限即拒絕運算，保留輸入但清除舊結果。拒絕未配對 surrogate，避免編碼時靜默替換。不得使用 maxlength 把貼入文字悄悄截短。 |
| FR-03 | 固定先把 CRLF 和孤立 CR 換為 LF，其他字元原樣保留；介面一直顯示「輸出換行統一為 LF」。不做 NFC/NFKC 或大小寫處理。 |
| FR-04 | 三個預設皆關閉的核取方塊：「移除每行前後空格與 Tab」、「移除空行」、「移除重複行」。執行次序固定為 trim → 去空行 → 去重，不能拖曳改序。trim 僅 U+0020、U+0009；空行僅長度零；去重採完全相同的 UTF-16 字串，保留第一次出現次序。 |
| FR-05 | 原文與結果各顯示碼點數、行數、UTF-8 bytes。原文統計以 FR-03 的 LF 版本計算並標記此事。碼點數含空白與 LF；不宣稱人眼字數。空字串 0 行；非空為 LF 分割段數，尾端 LF 算最後一個空行。 |
| FR-06 | 整理在 dedicated worker 內進行；一次一份工作。按下後立即標示處理中，可取消。5 秒未回覆則終止 worker 並顯示逾時；這是保護上限，不是效能承諾。 |
| FR-07 | 修改輸入或任何選項即使舊結果失效、停用複製／下載；如正在處理則取消。新運算以新的 jobId 執行。遲到回覆不得復活舊結果。 |
| FR-08 | 成功後可明確點擊「複製結果」或下載固定檔名 cleaned-text.txt；UTF-8 無 BOM、LF，結果最後是否有 LF 完全由處理後行陣列決定，不另加換行。剪貼簿拒絕時保留可選取結果並提示手動複製。空結果可複製，下載停用以避免無意空檔。 |
| FR-09 | 「全部清除」終止工作、遞增 jobId、清空輸入／結果／統計／錯誤並把選項重設為關閉、焦點回輸入。不得保存於 URL、storage、IndexedDB、service worker、console 或任何記錄。 |
| FR-10 | 使用 textContent 與 textarea.value 呈現所有文字；HTML/腳本字樣只是文字。缺少 Worker、TextEncoder 或 Blob 則停止處理，顯示不支援，不改走雲端。 |

## 錯誤與資料生命週期

固定錯誤碼：INPUT_TOO_LARGE、INVALID_UNICODE、INVALID_OPTIONS、UNSUPPORTED、TIMEOUT、WORKER_FAILED、CLIPBOARD_FAILED。錯誤訊息不帶輸入片段或 raw exception。非空全為空行且被移除時是成功的空結果，不是錯誤。

每次成功只保留目前原文及結果，不留歷史。下載 Blob URL 在下載點擊後以短暫排程撤銷，且清除／替換／離頁時再次清理；不承諾 OS 或瀏覽器記憶體的安全抹除。網站不控制使用者自行保存的下載檔或剪貼簿內容。

## U01 名單移除核對（2026-10-13）

- FR-11：成功／empty 結果附同 job 的來源行 provenance：保留、空行移除、重複移除／首次保留、ASCII trim 變動。行號為 LF 正規化後的 1-based 段落，尾 LF 包含尾空段落；空來源沒有段落。
- FR-12：結果旁顯示實際原因數与 trim 變動數；只有移除時顯示預設收合的原生 details。逐筆保留完整原行純文字、單一原因及重複首次位置。每頁最多 100 筆，首／前／後／末頁只改顯示，不重算或建立 Worker；新成功首頁／收合。
- FR-13：start、來源／選項變更、cancel、clear、timeout、失敗、pagehide、destroy 清掉摘要、頁碼和來源段落引用。copy／download 保留摘要；匯出只含 cleaned text。保留空段落仍可能形成 empty output，不用 before.lines − after.lines 算移除數。

上限保持原始 200,000 UTF-16 units／262,144 UTF-8 bytes、最多 200,001 來源段落及 5 秒 watchdog；不新增依賴、網路處理、持久保存或摘要匯出。核定精確案例見 OUTCOME-UPGRADE-2026-10-13.md。

## 延後

任何檔案讀取、排序、批次處理、語言分詞、正規表示式、OCR、AI 功能、同步與分析都需要新任務；不能借用此 MVP 加入。


---

## 原文件 TECHNICAL.md

# 技術規格

## U01 最新成功契約（2026-10-13）

本段取代下方舊 success value 範例：envelope exact `{type,jobId,result}`，成功 exact `{ok:true,value:{text,before,after,provenance}}`，錯誤只回固定碼。provenance exact 五個數字陣列：keptSourceLines／emptyRemovedSourceLines／duplicateRemovedSourceLines／duplicateFirstSourceLines／trimmedSourceLines，不含原文。

每列表最多 200,001 筆，所有項目 safe integer／域 1..来源段落數；前三列表嚴格遞增、互斥且完整分割來源。duplicate／first 等長，first 指向較早、相同 processed string 的首個 kept；trimmed 嚴格遞增並精確涵蓋 ASCII trim 改變的行。停用選項對應列表空；空來源所有列表空。保留空段落不必等於輸出字串的行數。

cleanText 單次依來源順序做原有 trim → empty → Map 去重，累積五列表與保留文字；原結果和 metrics 定義不變。app inspectReply 捕獲同 job 的原文／options／before，用 own data descriptors 驗 exact shape／dense arrays／domain，不執行 getter；逐行核對分割、原因、trim 與首次字串，再以 output cursor 比對完整整理文字。原 Unicode／bytes／metrics 檢查保留；metadata 驗證後再查同一 5 秒期限。

UI 私有記憶體持有當前五列表和正規化原行。removalPage(provenance,page) 用两份 sorted removal 列表 binary partition 找 page×100 位，只建立當頁最多 100 個 row／DOM。首／末頁屬同一有界分頁，使 2,001 頁可直接核對邊界。原行以 pre.textContent 呈現，不放 reducer／logs。

clearOutput 共用清除 reviewData、來源段落、page、details open；新成功首頁／收合，copy／download 不重建列表或失效摘要。下載仍只由 encodeOutput(outputText) 產生；session／export／tokens 不改。

以下工程規格沿用；U01 成功契約以上段為準，實際驗收見 docs/VERIFICATION.md。遵守 [工程規範](docs/ENGINEERING.md) 與 [隱私安全](docs/PRIVACY-SECURITY.md)。

## 檔案與職責

    package.json
    scripts/serve.mjs        # 127.0.0.1:4173，只提供 public/
    scripts/check.mjs        # 真正檢查語法、必要檔案與禁止的資源／API
    scripts/build.mjs        # public/ 的受審核檔案複製至 dist/
    public/index.html
    public/styles/tokens.css
    public/styles/app.css
    public/js/app.mjs
    public/js/worker.mjs
    public/js/core/text.mjs
    public/js/core/session.mjs
    public/js/core/export.mjs
    test/scaffold.test.mjs
    test/text.test.mjs
    test/session.test.mjs
    test/export.test.mjs

使用原生 DOM、ESM 與 Node 24+ node:test；沒有 React、套件、外部字型、CDN。T00 設定 private:true、type:module 及四個 npm scripts；正式執行只有靜態檔案，Node 不是上線伺服器。

## 純函式契約

所有失敗回傳固定的 {ok:false,error:{code}}，不把來源放進 Error。成功回傳 {ok:true,value}。函式只接受 primitive string 與自有固定選項，不接受使用者 JSON 物件作為程式設定。

    validateText(text) -> Result<{utf8Bytes:number}>
    normalizeNewlines(text) -> string
    measureText(lfText) -> {codePoints:number,lines:number,utf8Bytes:number}
    cleanText(text,{trimAscii:boolean,dropEmpty:boolean,deduplicate:boolean})
      -> Result<{text:string,before:Metrics,after:Metrics}>
    encodeOutput(text) -> Result<Uint8Array>
    newSession() -> {jobId:0,status:"idle"}
    transition(session,event) -> newSession

選項只能有這三個 own fields 且都為 boolean；未知欄位、遺漏、null 均 INVALID_OPTIONS。app 在固定程式碼建立選項，測試仍驗證無效情況。

1. 先確認 string 與 UTF-16 length 上限，再逐 code unit 驗證 surrogate 成對：高 surrogate 後必為低 surrogate；孤立低 surrogate 拒絕。再以 TextEncoder 測原始 UTF-8 bytes。
2. 用固定 /\r\n|\r/g 正規式換為 LF；不把 CRLF 計兩次。
3. 空字串使用 []，其他以 split("\n") 切行。
4. trim 選項只用 /^[ \t]+|[ \t]+$/g；去空行以 line.length === 0 判斷；去重以 Set<string> 判斷，逐行 push 第一次出現值。
5. join("\n") 產生結果。統計先後文字都以 for...of 計 Unicode 碼點，行數按 PRODUCT 定義；TextEncoder 計 bytes。不可用 Intl.Segmenter 的語言詞數冒充本規格。
6. 除換行轉換外清理只會刪除字元，結果 bytes 不得超過輸入上限；仍在 encodeOutput 驗證，不信任 worker 回覆。

## Worker、狀態、清理

worker 接收 {type:"clean",jobId,text,options}；只回 {type:"result",jobId,result}。UI 只接受與當前 jobId 相同且仍為 running 的回覆。單一 worker 不重用跨工作；完成也 terminate。

狀態為 idle → dirty → running → success/empty/error；輸入或選項變更從任意狀態到 dirty，取消從 running 到 dirty，全部清除到 idle。run 時同步清舊輸出並設 busy，再建立 worker 與 5 秒 watchdog。取消先 jobId++、清 timer、terminate，之後才重繪。worker error、逾時、清除都走同一 dispose。

transition 的事件只包含狀態元資料，不放使用者文字；app 另外持有 input/output。Node 可測 session 的 stale-result 規則，不能宣稱 Node 測過真 worker、瀏覽器 Blob 或 clipboard。

Blob 型別 text/plain;charset=utf-8；檔名固定 cleaned-text.txt。URL 只為自建 Blob 建立，於點擊後 1 秒撤銷，且每次新下載／clear/pagehide 撤銷所有尚存 URL。寫剪貼簿只在使用者 click 內 await navigator.clipboard.writeText；失敗固定提示並保留 readonly textarea。

## 網路與能力

首次頁面載入允許同源靜態資源；運算不得 fetch、XHR、WebSocket、sendBeacon、讀 cookies/storage。無外部資源；不註冊 service worker。本機預覽 noindex。以 feature detection 決定可否開始，不以 user agent 猜支援。clipboard 非核心必要能力，可降為選取後手動複製。

## 已查閱的官方參考

查閱日 2026-09-23；這些來源說明平台規則，不是本產品測試結果。

- [ECMAScript 字串迭代器](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype-@@iterator)：迭代與 UTF-16 length 的單位不同，故明確標示碼點。
- [WHATWG Encoding](https://encoding.spec.whatwg.org/)：TextEncoder 的 UTF-8 輸出；本工具先拒絕孤立 surrogate 是額外產品限制。
- [WHATWG Worker 終止](https://html.spec.whatwg.org/multipage/workers.html#dom-worker-terminate)：取消採終止 worker；支援程度仍須未來在實際瀏覽器驗證。


---

## 原文件 UX-SEO.md

# 介面與搜尋內容

## U01 增補與正式 SEO（2026-10-13）

沿既有 Product App 版型／tokens，在結果動作旁增來源移除核對。有移除才顯示原生 details，預設收合；逐筆完整原文 pre、來源位置、單一原因及首次保留行，空原值保留空 pre 並補 0 字元標記，空格／Tab 不替換。長行只在 pre 局部捲動，不截斷。每頁 100 筆，首／前／後／末頁純顯示導航，首末頁方便大清單核對，不增加清理選項。

兩語同數量／座標。summary／pre 沿原有雙層 focus；成功一次 polite 宣告摘要，分頁僅宣告短頁位，copy／download 保留開啟狀態與頁碼。無移除時隱藏空明細；保留空段落但 empty output 時補說明。

本批核定 production 各頁 self canonical、雙向 zh-Hant/en、唯一 x-default，兩個 fallback 都指 https://text.glossquote.com/index.html。這是新增 gate，取代 2026-10-11 尚未要求 x-default 的歷史決策；非舊版退化。preview source 仍 noindex、相對 alternates、沒有正式 text origin。production site-url 必須帶尾斜線。CSP、MIME／headers、robots／sitemap、redirect／404 與同語言首頁連結規則不放寬。

模式：Product App。沿用 [設計系統](docs/DESIGN-SYSTEM.md) 的語意 tokens、系統字型與 48rem／75rem breakpoint；不建卡片式儀表板。實際 U01 候選驗收見 docs/VERIFICATION.md。

## 畫面

桌面讓來源／結果各占工作區一半，選項是一條窄工具列；沒有永久側邊導覽。

    GlossQuote-Labs / 文字整理                    全部清除
    文字整理與行數統計
    貼入文字，先確認清理選項；輸出換行統一為 LF。
    [ ] 行首尾空格/Tab  [ ] 空行  [ ] 重複行    [整理文字]
    原始文字                         整理結果
    [多行文字輸入                 ]  [唯讀結果           ]
    碼點 / 行 / bytes（以 LF 計算）    碼點 / 行 / bytes
                                     [複製結果] [下載文字]
    狀態與錯誤
    資料處理說明 / 操作方法 / FAQ

    手機（<48rem）
    品牌 / 文字整理
    H1 + 短說明
    [原始文字]
    原文統計
    三個具文字的核取方塊
    [整理文字] [全部清除]
    狀態
    [整理結果]
    結果統計
    [複製結果] [下載文字]
    方法 / FAQ

欄位 label 永遠可見；placeholder 只示範「貼上要整理的文字」。不預填假資料，不新增載入範例按鈕。

## 狀態文案

| 狀態 | 文案與操作 |
|---|---|
| 初始 | 「貼上文字，再選擇需要的整理方式。」整理可用，結果動作停用。 |
| 待更新 | 「文字或選項已變更，請重新整理。」舊結果不顯示。 |
| 處理 | 「正在整理文字…」顯示取消，不顯示虛假百分比。 |
| 成功 | 「整理完成。請確認結果後複製或下載。」 |
| 空結果 | 「整理後沒有文字。可關閉移除空行，或修改原文。」 |
| 過大 | 「文字超過 200,000 個 UTF-16 單位或 256 KiB，請分成較小段落。」 |
| 編碼 | 「文字含不完整的 Unicode 字元，請重新貼上原始文字。」 |
| 取消 | 「已取消，原文保留。」 |
| 不支援 | 「此瀏覽器缺少本機處理能力，請換用支援的瀏覽器。」 |
| 逾時 | 「處理時間已超過上限。請縮小文字後再試。」 |
| 複製失敗 | 「無法寫入剪貼簿，請選取結果後手動複製。」 |

## 可及性

Tab 順序依文件流；Space 切核取、Enter/Space 按鈕可用。不要攔截 textarea 的 Enter、Tab、Ctrl/Cmd+C。結果 readonly 可選取。統計不是每鍵 aria-live；只在運算完成以 role=status 宣告一次。錯誤連至 aria-describedby，不自動讀整段來源。

正文至少 16px、對比至少 4.5:1；控制邊框與焦點至少 3:1，44px 主要觸控目標，雙層焦點可見。320px、200% 頁面縮放時按鈕換行且全部可達；只有長文字區可局部橫向捲動，頁面不可雙向捲動。尊重 reduced-motion，不以動畫傳達唯一狀態。

## SEO

- 建議 slug：/tools/text-cleaner/
- title：文字整理與重複行清除｜GlossQuote-Labs
- description：在瀏覽器整理文字、移除空行與重複行，查看 Unicode 碼點、行數和 UTF-8 大小。可預覽結果後複製，工作資料不送往處理伺服器。
- H1：文字整理與行數統計
- 說明：貼上文字，按需要清除每行前後的空格或 Tab、空行和重複行。原文會保留在畫面上，方便核對結果。

FAQ 使用可索引的靜態 HTML：

1. 「會改寫我的內容嗎？」只做勾選的逐行操作，並把換行統一為 LF。不改寫內容、大小寫或繁簡體。
2. 「為什麼字數和文書軟體不同？」這裡統計 Unicode 碼點，包含空白和換行；emoji 或組合字可能包含多個碼點，不是語言學詞數。
3. 「重複行如何判斷？」按清理後字串精確比對，保留第一筆；Apple 和 apple 不同，除非勾選空白清理，前後空格也會造成不同。
4. 「關閉頁面會保留文字嗎？」工具不主動保存文字；自行下載的檔案與剪貼簿由裝置管理。

本地預覽 robots meta 為 noindex,nofollow。未確認公開網址及取得發布授權之前，不產生 canonical、sitemap 或假網域。不保證排名、永久免費、絕對安全或所有瀏覽器可用。隱私文案須等網路驗收通過才可作為已實現宣稱。


---

## 原文件 ACCEPTANCE.md

# 驗收案例

這是需求與預期，實際結果看 HANDOFF／docs/VERIFICATION.md；U01 新版不沿用舊版外部通過。

測試只用下列合成字串；反斜線表示 JS escape，不是字面反斜線。預設選項三項均 false。Node 只測純函式；真實瀏覽器項目另記版本、作業系統、結果於 HANDOFF。

| ID／類型 | 需求 | 輸入或步驟 | 精確預期 |
|---|---|---|---|
| TX-01 自動 | FR-01,05 | "" | text:""；before/after 皆 codePoints:0,lines:0,utf8Bytes:0 |
| TX-02 自動 | FR-03,05 | "A\r\nB\rC" | text:"A\nB\nC"；before 與 after 均 5 碼點、3 行、5 bytes |
| TX-03 自動 | FR-05 | "甲😀\n" | 3 碼點、2 行、8 bytes；文字不變 |
| TX-04 自動 | FR-05 | "e\u0301" | 2 碼點、1 行、3 bytes；不得正規化為 é |
| TX-05 自動 | FR-04 | "  A\t\n\tB  "；trimAscii:true | "A\nB" |
| TX-06 自動 | FR-04 | "\u3000A\u3000"；trimAscii:true | 全形空白原樣保留，3 碼點、7 bytes |
| TX-07 自動 | FR-04 | "A\n\n \nB\n"；dropEmpty:true | "A\n \nB"；空格那行保留 |
| TX-08 自動 | FR-04 | " A \nA\n\nB\nB"；全部 true | "A\nB" |
| TX-09 自動 | FR-04 | "A\na\nA\n"；deduplicate:true | "A\na\n"；尾端空行保留一次 |
| TX-10 自動 | FR-02 | "a".repeat(200000)；再以 200001 重試 | 前者成功，後者 INPUT_TOO_LARGE |
| TX-11 自動 | FR-02 | "甲".repeat(87381)+"a"；再增加 "a" | 前者 262144 bytes 成功；後者 INPUT_TOO_LARGE |
| TX-12 自動 | FR-02 | "\uD800" 與 "\uDC00" | 各 INVALID_UNICODE；不得變 U+FFFD |
| TX-13 自動 | FR-04 | options 多出 sort:true | INVALID_OPTIONS；不執行額外功能 |
| TX-14 自動 | FR-07 | session running jobId:2，收到 jobId:1 | session 不變且不可採用舊輸出 |
| TX-15 自動 | FR-08 | encodeOutput("甲\nA") | bytes [231,148,178,10,65]；無 BOM、無尾端額外 LF |
| TX-16 瀏覽器 | FR-10 | "<img src=x onerror=alert(1)>" | 原文／結果顯示同一文字；無 img 節點、彈窗或請求 |
| TX-17 瀏覽器 | FR-06,07,09 | 啟動後立刻取消；再啟動後清除；測試 harness 延遲 worker 回覆 | 狀態依序 dirty、idle；清除後原文/結果為空、選項皆 false；延遲回覆不復活結果 |
| TX-18 瀏覽器 | FR-09,10 | 載入完成後開 DevTools Network，離線，再處理；檢查 storage | 運算成功且處理無請求；沒有工具寫入的 cookie/storage/IDB；clear 撤銷 Blob URL |
| TX-19 瀏覽器 | FR-08 | 拒絕 clipboard；下載非空範例 | 顯示固定複製失敗提示；仍可選取結果；下載名 cleaned-text.txt，內容與 TX-15 相同 |
| TX-20 瀏覽器 | FR-10 | 測試頁禁用 Worker；另使 worker 超時 | 分別 UNSUPPORTED、TIMEOUT；不提交網路請求 |
| TX-21 瀏覽器 | FR-01,04,08 | 僅鍵盤完成貼上、選選項、整理、選取結果 | 無鍵盤陷阱、焦點可見、label 完整，readonly 結果可複製 |
| TX-22 瀏覽器 | FR-01,04,08 | 320 CSS px 與 200% 縮放，使用長行 | 頁面無橫向溢位，所有控制可達；文字區可局部捲動 |

最終命令只在 T00 建立腳本後執行：npm test、npm run check、npm run build；若工作目錄是 Git repository 另跑 git diff --check。瀏覽器流程需 npm run dev；人工停掉預覽服務。安全與存取檢查不能以正則掃描成功替代。

## U01 新版 gates（2026-10-13）

精確 U01-01–12 以 OUTCOME-UPGRADE-2026-10-13.md 為準。focused：node --test test/text.test.mjs test/session.test.mjs test/provenance.test.mjs；settled：npm.cmd test／check／build，另 build／check --production --cloudflare --site-url https://text.glossquote.com/。兩 production 頁唯一 x-default 指繁中 index；preview noindex、沒有正式 text origin／x-default。

純函式／DOM mock、實際瀏覽器假 Worker harness、原生 Worker／下載、真正裝置證據分別標示。最大 200,001 段落不得用模擬或人工例外跳過；OS clipboard、完整原生競態、Network／Storage、真 200% zoom／跨裝置缺能力時保持 NOT_RUN，不當 PASS 或 bug。source-only 候選不是新版本已上線；主代理發布／外部複驗仍獨立。


---

## 原文件 TASKS.md

# 逐步實作任務

流程以 AGENTS.md 的「閱讀與執行」「交付與收斂」為準：沿用本 session 已讀文件，只補讀變動／相關段落；同一授權工作依序推進，不因任務切換重問。各任務 allowed paths、前置條件與必要驗收保持有效，缺陷回到其擁有任務修正；來源發布依適用的既有明確授權，不包含網站部署。

本文件定義任務；實際進度以 HANDOFF.md 與最新驗收紀錄為準。一次只做第一個未完成任務；不預先修改後續檔案。每步失敗即停留，記錄失敗於 HANDOFF.md；需要擴大 allowed paths 或產品功能時先取得新任務。

依 AGENTS.md 的 session 閱讀規則讀取當前任務所需內容。禁止安裝 runtime 套件。以下路徑均相對本工具根目錄，無父目錄操作。

## T00 — 建立最小離線開發骨架

- 前置：確認 Node 24+ 已存在；無工具時記錄阻塞，不自行改 PATH 或安裝。查閱 TECHNICAL 的官方參考；確認碼點與行數定義。
- Allowed paths：package.json、scripts/serve.mjs、scripts/check.mjs、scripts/build.mjs、public/index.html、public/styles/tokens.css、public/styles/app.css、public/js/app.mjs、test/scaffold.test.mjs、HANDOFF.md。
- 實作：建立 type:module/private:true；四命令依 TECHNICAL。serve 只允許 GET/HEAD、限制至 public 的絕對解析路徑、loopback 預設4173，拒絕 traversal/dotfiles/symlink 逃逸且不記 URL query。check 枚舉受管檔案、node --check、禁止外部資源及危險 DOM API，未知檔案明確處理；build 只輸出靜態 allowlist，不複製 docs/test。建立真 scaffold 測試與空頁 noindex。
- 驗收：上述腳本全建立後才跑 npm test、npm run check、npm run build；人工查 dist 無文件與測試。
- 完成：命令通過，記錄版本、檔案及未驗證項目至 HANDOFF；不聲稱產品可用。

## T01 — 文字純函式

- 前置：T00 完成。
- Allowed paths：public/js/core/text.mjs、test/text.test.mjs、HANDOFF.md。
- 實作：依固定次序完成 validateText、normalizeNewlines、measureText、cleanText；先寫 TX-01 至 TX-13，再寫邊界與 options schema。
- 驗收：node --test test/text.test.mjs；npm run check。
- 完成：精確值通過、輸入不可被截短、所有錯誤不回原文；回寫 HANDOFF。

## T02 — 工作生命週期

- 前置：T01 完成。
- Allowed paths：public/js/worker.mjs、public/js/core/session.mjs、test/session.test.mjs、HANDOFF.md。
- 實作：worker 固定協議；session transition 測取消、清除、error 與舊 jobId；不在 worker 寫 log。
- 驗收：node --test test/session.test.mjs；npm run check。此步只測純狀態，worker 瀏覽器確認延至 T03。
- 完成：TX-14 通過、取消先更新 generation 的規則可追蹤；回寫 HANDOFF。

## T03 — 操作畫面與狀態

- 前置：T02 完成。
- Allowed paths：public/index.html、public/styles/tokens.css、public/styles/app.css、public/js/app.mjs、HANDOFF.md。
- 實作：按 UX 線框建立雙區、三選項、統計；整合 worker、5 秒 watchdog、取消與全部清除；編輯即使結果失效。只用 textContent/value。此時複製下載可見但停用。
- 驗收：npm run check；npm run dev 後人工 TX-16/17/20/21/22；確認後停止服務。
- 完成：真狀態與鍵盤／小螢幕可用，記錄人工結果；回寫 HANDOFF。

## T04 — 複製、下載與清理

- 前置：T03 完成。
- Allowed paths：public/js/core/export.mjs、public/js/app.mjs、test/export.test.mjs、HANDOFF.md。
- 實作：UTF-8 無 BOM 匯出、固定檔名、Blob URL 註銷、clipboard click-only、空下載停用；clear/pagehide 共用 dispose。
- 驗收：node --test test/export.test.mjs；npm run check；npm run dev 後人工 TX-18/19。
- 完成：TX-15/18/19 通過、網路與 storage 檢查有紀錄；回寫 HANDOFF。

## T05 — 可索引說明內容

- 前置：T04 完成。
- Allowed paths：public/index.html、public/styles/app.css、HANDOFF.md。
- 實作：加入 UX-SEO 指定 title/description/H1、操作方法、至少四 FAQ；內容靜態 HTML，保留 noindex。不要新增 canonical/sitemap/公開 URL。
- 驗收：npm run check；人工關閉 JS 後仍可讀方法與 FAQ，320px 無溢位。
- 完成：全部宣稱與已驗證功能一致；回寫 HANDOFF。

## T06 — 完整驗收與交接

- 前置：T05 完成。
- Allowed paths：HANDOFF.md、TASKS.md。
- 工作：依 ACCEPTANCE 逐案例記錄；npm test、npm run check、npm run build；Git 環境再跑 git diff --check。用 npm run dev 完成全部瀏覽器案例並停止服務。
- 完成：每項有真實結果，缺瀏覽器證據就記待驗收；發現 bug 回到其擁有任務，不在本步越權改原始碼。所有通過才可寫本機 MVP 完成，來源發布依 AGENTS.md 的適用既有授權；本步不授權網站部署。

## T07 — 雙語與已授權正式發布（2026-10-09）
- 前置：T06必要自動驗收通過，使用者允許保留人工NOT_RUN。
- Scope/allowed paths：public/index.html、public/en/index.html、public/js/app.mjs、public/js/i18n.mjs、public/styles/app.css；scripts/check/build/serve/release/cloudflare.mjs；test/scaffold/release/i18n.test.mjs；wrangler.jsonc、.gitignore、README.md、docs/VERIFICATION.md、HANDOFF.md、project.json。根工作區.runs/text-workbench限測試/受審發布輔助與證據。
- 不修改已驗收文字核心算法，不新增套件、儲存、API或自動剪貼簿讀取。英文獨立頁與所有狀態文案，兩語首頁回鏈及語言切換；預覽noindex，production精確canonical/hreflang、robots/sitemap、安全headers與redirects。
- 目標：public KYStr/glossquote-labs-text-workbench；free Cloudflare text.glossquote.com，既有固定授權token檔僅隔離CLI使用。禁止其他域名或權限擴張。
- 驗收：primary actualdiff review/fulltests/check/preview+productionbuild；IAB雙語Worker/輸出/links/320；source PUBLIC+remoteHEAD；live精確assets與SEO/security/redirect/404，homepage只有在toollive驗證後才切published。保留人工NOT_RUN。
- 同一發布任務附屬首頁allowed：00-home/catalog.json、HANDOFF.md及generated public/dist outputs；test/check/build後公開首頁source，部署並驗證兩語livecatalog。

## AUDIT-TEXT-01 — 外部稽核限定補驗（2026-10-11）

- 授權：主對話依使用者明確授權派回本功能對話。本次範圍取代 TASK-ENTRY 首個接手 milestone 僅寫 THREAD-STATUS 的限制，其餘共享／憑證／發布邊界不變；一次完成本 milestone，不再委派。
- Allowed paths：TASK-ENTRY.md 的通用 SEO 驗收文字、TASKS.md、docs/AUDIT-2026-10-11.md、docs/THREAD-STATUS.md、HANDOFF.md；專用證據限根工作區 `.runs/text-workbench/audit-2026-10-11/**`，既有證據不覆寫。
- 範圍：判讀使用者提供的四份外部稽核資料，沿用 review-packages/2026-10-10-followup 已完成繁中補驗及未變來源。以英文正式 UI 精確填入並讀回 `甲😀\n` 與 `<b>audit-20261010</b>`，核對統計及文字安全呈現；補 clear 的 source／result／options／metrics／focus，分別列明 cancel 與 stale race 的真瀏覽器／受控 harness／Node 既有覆蓋。原生 clipboard／download、完整 Network／Storage 與真設備能力缺口可保持 NOT_RUN。
- SEO：按核定發布規格修正文件矛盾，保留 canonical／zh-Hant/en 雙向 hreflang／robots／sitemap／MIME／security 等 gate。x-default 是非阻塞一致化待辦，本輪不改 releasePolicy、HTML 或 dist。
- 缺陷處理：只有實際重現直接相關的產品 bug，才先記錄具體失敗證據、預期行為及對應 public/scripts/test allowed paths，再修正及補必要回歸；高風險跨模組問題停受影響部分交主代理。本輪預設只有文件與證據變更。
- 驗收：英文兩案例有精確輸入／輸出觀察或具體 NOT_RUN；clear／cancel／stale 證據種類明確；SEO 文件矛盾消除；文件與寫入範圍核對；必要時才跑 Node 24 test/check/build 與受審獨立來源發布。不得部署、讀憑證、改首頁／其他工具／根規範或根 Git index／分支／提交。
- 停止條件：同一 UI 操作兩次無進展即停止該項並記 NOT_RUN；不以補齊全部人工項作完成條件。長測前後比對持久環境，遇漂移或他人正在改本工具即停受影響部分並保留證據。
- 狀態：PASS（限定範圍，完整原生競態與人工 NOT_RUN 保留）；英文五個 UI 子項與 SEO 文件修正完成，最終證據／結案檢查見 docs/AUDIT-2026-10-11.md 與 HANDOFF 的同任務紀錄。


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

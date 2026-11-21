# HTTP 狀態碼查詢 / HTTP Status Lookup

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-http-status-lookup-20261121` · 2026-11-21 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/6920196a/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

開發者或學生在瀏覽器開發者工具、伺服器日誌或 API 回應中看到一個三位數 HTTP 狀態碼（例如 `404`、`502`），想立刻知道它屬於哪一類、官方名稱是什麼、中文意思是什麼、常見成因與該怎麼處理，而不需要連上網路查文件。

- 桌面。桌面輸入一個狀態碼，立即看到分類、官方名稱、中文說明、常見成因與處理建議，並可瀏覽完整的狀態碼對照表。
- 行動。手機在除錯現場查一個狀態碼，單欄顯示同樣完整的說明。

使用情境為設計假設。資料只保留在目前頁面草稿；本工具不發出任何網路請求、不查詢任何即時服務。

## scope

輸入一個 100–599 的 HTTP 狀態碼，輸出分類、官方名稱、中文說明、常見成因與處理建議；另附完整的狀態碼對照表瀏覽。非目標為實際發送 HTTP 請求、檢查某個網址的即時狀態、重試排程、解釋請求／回應標頭、或把結果當成任何伺服器的即時健康狀態。

已與 registry r807 的 130 份預案及本 checkout 的既有規格比對，最相近者的實質差異如下。

- 拆解完整 URL 並整理 query。此處輸入的是一個三位數狀態碼，不處理 URL、不解析任何網址成分。 [spec-13-url-inspector](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/13-url-inspector/SPEC.md)
- IPv4 子網路計算（網段、廣播位址、可用主機）。此處是 HTTP 語義查詢，不做任何位址或前綴運算。 [spec-subnet-calculator](https://github.com/KYStr/glossquote-labs-home/blob/6920196a/docs/specs/subnet-calculator/SPEC.md)
- 固定 timeout、有限整數毫秒、序列重試的上界模型，並明列 HTTP Retry-After 為非目標。此處不計算任何時間表或重試策略，只解釋單一狀態碼的意義；`429`、`503` 的處理建議雖提及 Retry-After 標頭，但不計算等待時間。 [spec-retry-budget-20261109](https://github.com/KYStr/glossquote-labs-home/blob/6920196a/docs/specs/retry-budget/SPEC.md)
- 解碼 JWT 標頭與 payload。此處不解碼任何 token、不處理憑證。 [spec-jwt-decoder](https://github.com/KYStr/glossquote-labs-home/blob/6920196a/docs/specs/jwt-decoder/SPEC.md)

判定規則由本文定義，狀態碼表以 IANA HTTP Status Code Registry 為準（見 §5），無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「狀態碼 / Status code」
- 「查詢 / Look up」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個核心案例（`200`），明示範例並等待手動執行。
- 「查詢結果 / Lookup result」先顯示分類徽章與官方名稱，再列中文說明、常見成因、處理建議與出處。未指派的代碼顯示固定的未指派說明，不偽裝成已定義的語義。
- 「完整狀態碼表 / Full status code table」列出 §5 全部 64 列已指派代碼，附分類篩選（全部／1xx／2xx／3xx／4xx／5xx）。點選任一列將該代碼填入輸入欄並標示 dirty，等待手動執行查詢。未指派的區間不在表中逐列列出，表末以一行註明各分類的未指派區間。
- 成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"code":"404"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線查詢，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `lookup(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- `code` 為 ASCII 十進整數字串，恰好 3 位，首位 1–5，值 100–599。raw 最多 8 單元。
- 預設 code `404`。不做 trim、不接受前後空白、不接受正負號、小數、指數或任何非 ASCII 數字。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 `code` 驗證。raw 超限 INPUT_LIMIT、缺內容 EMPTY、文法 INTEGER_FORMAT、範圍 RANGE，field 皆為 `code`。文法為恰好 3 個 ASCII 數字 `^[0-9]{3}$`；通過文法但值小於 100 或大於 599 為 RANGE（例如 `099`、`600`、`999`）。
2. 分類由首位數字決定：`class = floor(code / 100)`，1–5 對應 §5 分類表。分類摘要文字逐字取自 IANA registry 註記（見 §5）。
3. 在 §5 狀態碼表中查 `code`。查到已指派列，回傳該列的 `reason`（IANA 登記的官方英文名稱，逐字）、`reasonZh`、`meaningZh`、`meaningEn`、`causeZh`、`causeEn`、`adviceZh`、`adviceEn`、`reference`；`assigned=true`。未查到（在 100–599 內但登記為 Unassigned 的區間），回傳 `assigned=false`，`reason`、`reasonZh`、`reference` 為 null，`meaningZh`、`meaningEn`、`causeZh`、`causeEn`、`adviceZh`、`adviceEn` 為 §5 固定的未指派字串。
4. `306` 與 `418` 在登記中的描述為 `(Unused)`：`assigned=true`，`reason="(Unused)"`，`reasonZh="（未使用）"`，其餘欄位依 §5 該列。`510` 另有 `obsolete=true`；`104` 另有 `temporary=true`；其餘已指派列兩者皆為 false。未指派代碼兩者皆為 false。
5. 結果為 `{code,category,assigned,reason,reasonZh,meaningZh,meaningEn,causeZh,causeEn,adviceZh,adviceEn,reference,temporary,obsolete}`，其中 `code` 為整數，`category` 為 `{class,key,labelZh,labelEn,range,summaryZh,summaryEn}`。欄位順序即此順序。機器值不隨 locale 改。

固定下載 `http-status-lookup-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/http-status-lookup/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

### 分類表（逐字取自 IANA HTTP Status Code Registry 註記，2026-11-21 讀取）

| class | key | 中文 | English | 範圍 | 摘要 zh | 摘要 en |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | informational | 資訊 | Informational | 100–199 | 請求已收到，繼續處理。 | Request received, continuing process. |
| 2 | success | 成功 | Success | 200–299 | 請求已成功接收、理解並接受。 | The action was successfully received, understood, and accepted. |
| 3 | redirection | 重導向 | Redirection | 300–399 | 需要進一步動作才能完成請求。 | Further action must be taken in order to complete the request. |
| 4 | client-error | 客戶端錯誤 | Client Error | 400–499 | 請求語法錯誤或無法完成。 | The request contains bad syntax or cannot be fulfilled. |
| 5 | server-error | 伺服器錯誤 | Server Error | 500–599 | 伺服器無法完成看似有效的請求。 | The server failed to fulfill an apparently valid request. |

### 未指派代碼的固定字串

- `meaningZh`：「此代碼在 IANA HTTP 狀態碼登記中為 Unassigned，尚未指派官方語義。」
- `meaningEn`："This code is Unassigned in the IANA HTTP Status Code Registry; no official semantics are assigned."
- `causeZh`：「尚未有標準或實務用途指派此代碼。」
- `causeEn`："No standard or practice has assigned a use to this code."
- `adviceZh`：「不要依賴此代碼的語義；收到時請以其分類（第 1 個數字）概略理解。」
- `adviceEn`："Do not rely on any semantics for this code; interpret it only by its class (first digit)."

未指派區間（依 IANA registry，2026-11-21）：105–199、209–225、227–299、309–399、419–420、427、430、432–450、452–499、509、512–599。

### 狀態碼表（64 列已指派代碼；官方英文名稱與出處逐字取自 IANA HTTP Status Code Registry，2026-11-21 讀取；中文名稱、意義、成因、建議為作者依各出處語義撰寫的固定文字）

| 代碼 | 官方名稱 (EN) | 中文名稱 | 意義 (zh / en) | 常見成因 (zh / en) | 處理建議 (zh / en) | 出處 |
| --- | --- | --- | --- | --- | --- | --- |
| 100 | Continue | 繼續 | 伺服器已收到請求標頭，客戶端應繼續傳送主體。<br>The server has received the request headers; the client should continue sending the body. | 客戶端送出 Expect: 100-continue 後的正常回應。<br>Normal response after a client sends Expect: 100-continue. | 繼續傳送請求主體；若逾時未收到 100，可直接傳送主體或中止。<br>Continue sending the body; if no 100 arrives in time, send the body anyway or abort. | RFC 9110 §15.2.1 |
| 101 | Switching Protocols | 切換通訊協定 | 伺服器接受 Upgrade 要求，將切換為新協定。<br>The server accepts the Upgrade request and will switch protocols. | 客戶端要求升級，例如由 HTTP 升級為 WebSocket。<br>The client asked to upgrade, e.g. HTTP to WebSocket. | 依新協定繼續交握；升級失敗時退回原協定重試。<br>Continue the handshake under the new protocol; fall back to the original protocol if the upgrade fails. | RFC 9110 §15.2.2 |
| 102 | Processing | 處理中 | 伺服器已收到完整請求，正在處理，請客戶端繼續等候。<br>The server received the full request and is still processing it. | 伺服器端長耗時操作，例如 WebDAV 大量處理。<br>A long server-side operation, e.g. a WebDAV batch. | 繼續等候，不要重送請求。<br>Keep waiting; do not resend the request. | RFC 2518 |
| 103 | Early Hints | 早期提示 | 伺服器在送出最終回應前，先提示客戶端可預載的資源。<br>The server hints at resources the client can preload before the final response. | 伺服器想讓瀏覽器提早載入 CSS/JS 以加速頁面。<br>The server wants the browser to preload CSS/JS early. | 依提示預載資源；忽略提示也不影響最終回應。<br>Preload as hinted; ignoring the hints does not affect the final response. | RFC 8297 |
| 104 | Upload Resumption Supported | 支援續傳上傳 | 伺服器支援續傳上傳（暫時性登記）。<br>The server supports resumable uploads (temporary registration). | 伺服器宣告支援可續傳的上傳協定。<br>The server advertises support for the resumable-upload protocol. | 依續傳協定上傳；注意此為暫時性登記，登記已於 2026-11-13 到期。<br>Upload per the resumable protocol; note this temporary registration expired 2026-11-13. | draft-ietf-httpbis-resumable-upload-05 |
| 200 | OK | 成功 | 請求成功，伺服器已回傳請求的內容。<br>The request succeeded and the server returned the requested content. | 正常的成功回應。<br>A normal successful response. | 無需處理。<br>No action needed. | RFC 9110 §15.3.1 |
| 201 | Created | 已建立 | 請求成功，並已建立新的資源。<br>The request succeeded and a new resource was created. | 成功建立資源，例如 POST 新增一筆資料。<br>A resource was created, e.g. POST adding a record. | 以回應中的 Location 標頭取得新資源位置。<br>Use the Location header to find the new resource. | RFC 9110 §15.3.2 |
| 202 | Accepted | 已接受 | 請求已接受處理，但尚未完成。<br>The request was accepted for processing, but processing is not complete. | 非同步處理，例如排入佇列的工作。<br>Asynchronous processing, e.g. a queued job. | 依回應指示查詢處理進度，不要假設已完成。<br>Check progress as instructed; do not assume completion. | RFC 9110 §15.3.3 |
| 203 | Non-Authoritative Information | 非權威資訊 | 請求成功，但回應內容來自第三方副本，可能與來源不同。<br>The request succeeded, but the content came from a third-party copy and may differ from the origin. | 代理伺服器回傳快取或轉換過的內容。<br>A proxy returned cached or transformed content. | 需權威內容時直接向來源伺服器請求。<br>Request the origin server directly for authoritative content. | RFC 9110 §15.3.4 |
| 204 | No Content | 無內容 | 請求成功，但沒有要回傳的內容。<br>The request succeeded, but there is no content to return. | 成功執行不需回傳的動作，例如刪除或表單送出。<br>An action that needs no body, e.g. a delete or form submit. | 無需處理；不要期待回應主體。<br>No action needed; do not expect a body. | RFC 9110 §15.3.5 |
| 205 | Reset Content | 重設內容 | 請求成功，客戶端應重設送出請求的表單或畫面。<br>The request succeeded; the client should reset the form or view that sent it. | 表單送出後應清空輸入。<br>A form submission after which inputs should be cleared. | 清空表單輸入。<br>Clear the form inputs. | RFC 9110 §15.3.6 |
| 206 | Partial Content | 部分內容 | 伺服器依 Range 要求，只回傳資源的一部分。<br>The server returned only part of the resource, as requested with Range. | 續傳下載或串流分段請求。<br>A resumed download or streamed segment. | 依 Content-Range 組合各段；缺段時重新請求。<br>Reassemble parts per Content-Range; re-request missing parts. | RFC 9110 §15.3.7 |
| 207 | Multi-Status | 多重狀態 | 回應主體列出多個子請求各自的狀態。<br>The body lists the status of multiple sub-requests. | WebDAV 一次操作多個資源。<br>A WebDAV operation over several resources. | 逐項檢查主體內的各子狀態。<br>Check each sub-status inside the body. | RFC 4918 |
| 208 | Already Reported | 已回報 | 此成員已在本次回應前面列出，不重複列。<br>This member was already listed earlier in this response. | WebDAV PROPFIND 回應去重。<br>Deduplication in a WebDAV PROPFIND response. | 以前面列出的項目為準。<br>Use the earlier listing. | RFC 5842 |
| 226 | IM Used | 已使用 IM | 伺服器對 GET 套用了 instance manipulation，回傳處理後的結果。<br>The server applied an instance manipulation to the GET and returned the result. | 客戶端送出帶 IM 標頭的請求。<br>The client sent a request with an IM header. | 依回應內容使用；不支援 IM 的客戶端不要送出 IM 標頭。<br>Use the returned content; clients without IM support should not send the IM header. | RFC 3229 |
| 300 | Multiple Choices | 多重選擇 | 資源有多種表示形式，客戶端應選擇其一。<br>The resource has several representations; the client should choose one. | 同一 URI 提供多種格式或語言版本。<br>One URI offers several formats or languages. | 依 Location 或主體清單選擇適合的表示形式。<br>Pick a representation from the Location header or body list. | RFC 9110 §15.4.1 |
| 301 | Moved Permanently | 永久移動 | 資源已永久移到新的 URI。<br>The resource has permanently moved to a new URI. | 網站改版、網址結構變更或整站搬遷。<br>A site redesign, URL change, or migration. | 更新書籤與連結，改用 Location 標頭的新位址。<br>Update bookmarks and links to the new address in Location. | RFC 9110 §15.4.2 |
| 302 | Found | 已找到 | 資源暫時位於另一 URI。<br>The resource is temporarily at a different URI. | 暫時導向，例如維護期間或 A/B 測試。<br>A temporary redirect, e.g. during maintenance or A/B testing. | 本次改用新位址，但保留原連結，不要更新書籤。<br>Use the new address this time, but keep the original link. | RFC 9110 §15.4.3 |
| 303 | See Other | 參見其他 | 回應可在另一 URI 以 GET 取得。<br>The response can be retrieved with GET at another URI. | 表單 POST 成功後導向結果頁，避免重複送出。<br>Redirect after a form POST to a result page. | 以 GET 請求 Location 標頭的位址。<br>GET the address in the Location header. | RFC 9110 §15.4.4 |
| 304 | Not Modified | 未修改 | 資源自條件請求指定的時間後未曾修改，可使用快取。<br>The resource has not changed since the conditional request; use the cache. | 客戶端送出 If-Modified-Since 或 If-None-Match 且內容未變。<br>A conditional request with If-Modified-Since or If-None-Match and unchanged content. | 使用本地快取；這不是錯誤。<br>Use the local cache; this is not an error. | RFC 9110 §15.4.5 |
| 305 | Use Proxy | 使用 Proxy | 必須經由指定的 Proxy 存取資源。<br>The resource must be accessed through the specified proxy. | 舊式代理設定要求。<br>A legacy proxy configuration requirement. | 依 Location 標頭改走指定的 Proxy；多數現代客戶端不支援此碼。<br>Route via the proxy in Location; most modern clients do not support this code. | RFC 9110 §15.4.6 |
| 306 | (Unused) | （未使用） | 此代碼目前未使用，沒有定義的語義。<br>This code is currently unused and has no defined semantics. | 保留代碼，RFC 9110 明定為未使用。<br>A reserved code, defined as unused by RFC 9110. | 不應出現在實際回應中；收到時視為未定義代碼處理。<br>It should not appear in real responses; treat it as an undefined code. | RFC 9110 §15.4.7 |
| 307 | Temporary Redirect | 暫時重導向 | 資源暫時位於另一 URI，且重送時必須保持原請求方法。<br>The resource is temporarily elsewhere; the method must stay the same on redirect. | 暫時導向且不得把 POST 改成 GET。<br>A temporary redirect that must not change POST into GET. | 以相同方法請求 Location 的位址。<br>Request the Location address with the same method. | RFC 9110 §15.4.8 |
| 308 | Permanent Redirect | 永久重導向 | 資源已永久移到另一 URI，且重送時必須保持原請求方法。<br>The resource has permanently moved; the method must stay the same on redirect. | 永久搬遷且不得把 POST 改成 GET。<br>A permanent move that must not change POST into GET. | 更新連結，改用新位址並保持原方法。<br>Update links to the new address, keeping the original method. | RFC 9110 §15.4.9 |
| 400 | Bad Request | 錯誤請求 | 伺服器無法理解請求，多半是語法錯誤。<br>The server cannot understand the request, usually a syntax error. | 參數缺漏、格式錯誤或 JSON 無法解析。<br>Missing parameters, malformed syntax, or unparsable JSON. | 檢查請求語法與參數後重送。<br>Check the request syntax and parameters, then resend. | RFC 9110 §15.5.1 |
| 401 | Unauthorized | 未授權 | 請求需要驗證身分。<br>The request requires authentication. | 缺少憑證、憑證過期或無效。<br>Missing, expired, or invalid credentials. | 重新登入或更新憑證後重試。<br>Sign in again or refresh the credentials, then retry. | RFC 9110 §15.5.2 |
| 402 | Payment Required | 需要付款 | 保留給未來付款機制使用，尚未定義標準語義。<br>Reserved for future payment mechanisms; no standard semantics defined. | 保留代碼，實務上少見。<br>A reserved code, rarely seen in practice. | 依服務商說明處理；無通用做法。<br>Follow the service provider's instructions; there is no generic handling. | RFC 9110 §15.5.3 |
| 403 | Forbidden | 禁止存取 | 伺服器理解請求，但拒絕授權。<br>The server understood the request but refuses to authorize it. | 權限不足、IP 被封鎖或目錄禁止列出。<br>Insufficient permission, a blocked IP, or forbidden directory listing. | 確認帳號權限；重新驗證通常無效。<br>Check account permissions; re-authenticating usually does not help. | RFC 9110 §15.5.4 |
| 404 | Not Found | 找不到 | 伺服器找不到請求的資源。<br>The server cannot find the requested resource. | 網址打錯、資源已刪除或移動且未設導向。<br>A mistyped URL, or a deleted or moved resource without a redirect. | 檢查網址拼字；站方應確認連結與導向。<br>Check the URL spelling; site owners should fix links and redirects. | RFC 9110 §15.5.5 |
| 405 | Method Not Allowed | 不允許的方法 | 資源存在，但不支援此請求方法。<br>The resource exists, but the method is not supported for it. | 對唯讀資源送出 POST/DELETE 等。<br>Sending POST/DELETE to a read-only resource. | 改用 Allow 標頭列出的方法。<br>Use a method listed in the Allow header. | RFC 9110 §15.5.6 |
| 406 | Not Acceptable | 不可接受 | 伺服器無法提供符合 Accept 標頭的表示形式。<br>The server cannot provide a representation matching the Accept headers. | 客戶端要求的格式或語言伺服器沒有。<br>The client asked for a format or language the server lacks. | 放寬 Accept 條件後重試。<br>Relax the Accept conditions and retry. | RFC 9110 §15.5.7 |
| 407 | Proxy Authentication Required | 需要 Proxy 驗證 | 需先向 Proxy 驗證身分。<br>The client must authenticate with the proxy first. | 經由需驗證的 Proxy 上網。<br>Going through a proxy that requires authentication. | 提供 Proxy 憑證後重試。<br>Supply the proxy credentials, then retry. | RFC 9110 §15.5.8 |
| 408 | Request Timeout | 請求逾時 | 伺服器等候請求逾時。<br>The server timed out waiting for the request. | 網路緩慢或客戶端送出請求太慢。<br>A slow network or a client sending too slowly. | 檢查網路後重送請求。<br>Check the connection, then resend. | RFC 9110 §15.5.9 |
| 409 | Conflict | 衝突 | 請求與資源目前狀態衝突。<br>The request conflicts with the current state of the resource. | 版本衝突、重複建立已存在的資源。<br>A version conflict or creating a resource that already exists. | 取得最新狀態，解決衝突後重試。<br>Fetch the latest state, resolve the conflict, then retry. | RFC 9110 §15.5.10 |
| 410 | Gone | 已刪除 | 資源已永久刪除，且無轉址位址。<br>The resource is permanently gone, with no forwarding address. | 資源刻意永久下架。<br>A resource deliberately and permanently removed. | 移除連結與書籤；不要重試。<br>Remove links and bookmarks; do not retry. | RFC 9110 §15.5.11 |
| 411 | Length Required | 需要長度 | 請求缺少必要的 Content-Length。<br>The request lacks a required Content-Length. | 送出主體卻未附 Content-Length。<br>Sending a body without Content-Length. | 補上 Content-Length 後重送。<br>Add Content-Length and resend. | RFC 9110 §15.5.12 |
| 412 | Precondition Failed | 前置條件失敗 | 請求中的前置條件未成立。<br>A precondition in the request was not met. | If-Match/If-Unmodified-Since 與目前狀態不符。<br>If-Match or If-Unmodified-Since does not match the current state. | 重新取得最新狀態與 ETag 後重試。<br>Re-fetch the latest state and ETag, then retry. | RFC 9110 §15.5.13 |
| 413 | Content Too Large | 內容過大 | 請求主體超過伺服器願意處理的大小。<br>The request body exceeds the size the server will process. | 上傳檔案過大。<br>An uploaded file is too large. | 縮小內容或改分段上傳。<br>Reduce the size or upload in parts. | RFC 9110 §15.5.14 |
| 414 | URI Too Long | URI 過長 | URI 超過伺服器願意處理的長度。<br>The URI exceeds the length the server will process. | 查詢字串過長，例如 GET 帶大量參數。<br>An overlong query string, e.g. GET with many parameters. | 改用 POST 傳送參數，縮短 URI。<br>Send parameters via POST and shorten the URI. | RFC 9110 §15.5.15 |
| 415 | Unsupported Media Type | 不支援的媒體類型 | 請求主體的媒體類型伺服器不支援。<br>The server does not support the media type of the request body. | Content-Type 不符，例如送出 XML 而伺服器只接受 JSON。<br>A mismatched Content-Type, e.g. XML sent where only JSON is accepted. | 改用伺服器支援的 Content-Type。<br>Use a Content-Type the server supports. | RFC 9110 §15.5.16 |
| 416 | Range Not Satisfiable | 無法滿足範圍 | 請求的範圍超出資源實際大小。<br>The requested range is outside the resource's actual size. | 續傳位置超過檔案結尾。<br>A resume offset beyond the end of the file. | 重新取得完整檔案，或以正確範圍重試。<br>Download the full file again, or retry with a valid range. | RFC 9110 §15.5.17 |
| 417 | Expectation Failed | 預期失敗 | 伺服器無法滿足 Expect 標頭的要求。<br>The server cannot meet the Expect header's requirement. | 送出伺服器不支援的 Expect，例如 100-continue 以外的期望。<br>An Expect the server does not support. | 移除或更換 Expect 後重試。<br>Remove or change the Expect header, then retry. | RFC 9110 §15.5.18 |
| 418 | (Unused) | （未使用） | 此代碼目前未使用，沒有定義的語義。<br>This code is currently unused and has no defined semantics. | 保留代碼，RFC 9110 明定為未使用；舊稱「I'm a teapot」出自 RFC 2324 愚人節玩笑，不在現行登記中。<br>A reserved code, defined as unused by RFC 9110; the old "I'm a teapot" name came from the RFC 2324 April Fools' joke and is not in the current registry. | 不應出現在實際回應中；收到時視為未定義代碼處理。<br>It should not appear in real responses; treat it as an undefined code. | RFC 9110 §15.5.19 |
| 421 | Misdirected Request | 錯誤導向的請求 | 請求被導向無法回應的伺服器。<br>The request was directed at a server that cannot respond to it. | HTTP/2 連線重用時請求送到錯誤的伺服器。<br>Connection reuse sending a request to the wrong server in HTTP/2. | 客戶端應重新建立連線後重試。<br>The client should open a fresh connection and retry. | RFC 9110 §15.5.20 |
| 422 | Unprocessable Content | 無法處理的內容 | 請求語法正確，但內容語義有誤無法處理。<br>The request syntax is valid, but the content has semantic errors. | 表單驗證失敗，例如欄位格式正確但邏輯不合。<br>Validation failed, e.g. fields well-formed but logically wrong. | 依回應的錯誤說明修正內容後重送。<br>Fix the content per the response's error details, then resend. | RFC 9110 §15.5.21 |
| 423 | Locked | 已鎖定 | 資源已被鎖定。<br>The resource is locked. | WebDAV 資源被其他使用者鎖定。<br>Another user locked the WebDAV resource. | 等候解鎖或聯絡鎖定者。<br>Wait for the lock to release or contact the locker. | RFC 4918 |
| 424 | Failed Dependency | 相依性失敗 | 請求因另一請求失敗而無法執行。<br>The request failed because another request it depends on failed. | WebDAV 批次操作中前置操作失敗。<br>An earlier operation in a WebDAV batch failed. | 先修正相依操作失敗的原因。<br>Fix the failed dependency first. | RFC 4918 |
| 425 | Too Early | 太早 | 伺服器不願處理可能被重送的早期請求。<br>The server refuses to process an early request that might be replayed. | 客戶端在 TLS 交握完成前送出 Early-Data。<br>The client sent Early-Data before the TLS handshake finished. | 等交握完成後以一般請求重送。<br>Resend as a normal request after the handshake completes. | RFC 8470 |
| 426 | Upgrade Required | 需要升級 | 客戶端應升級為其他協定才能繼續。<br>The client must switch to another protocol. | 伺服器要求改用新版協定，例如 TLS 或 HTTP/2。<br>The server requires a newer protocol, e.g. TLS or HTTP/2. | 依 Upgrade 標頭升級後重試。<br>Upgrade as indicated in the Upgrade header, then retry. | RFC 9110 §15.5.22 |
| 428 | Precondition Required | 需要前置條件 | 伺服器要求請求必須附帶條件式標頭。<br>The server requires the request to carry a conditional header. | 為避免 lost update，伺服器強制要求 If-Match。<br>The server enforces If-Match to prevent lost updates. | 附上 If-Match 等條件式標頭後重試。<br>Add a conditional header such as If-Match, then retry. | RFC 6585 |
| 429 | Too Many Requests | 請求過多 | 客戶端在短時間內送出太多請求。<br>The client sent too many requests in a short time. | 超過速率限制。<br>The rate limit was exceeded. | 依 Retry-After 標頭等候後再試，並降低請求頻率。<br>Wait per the Retry-After header, then retry at a lower rate. | RFC 6585 |
| 431 | Request Header Fields Too Large | 請求標頭欄位過大 | 請求標頭總量過大，伺服器拒絕處理。<br>The request header fields are too large for the server to process. | 標頭過多或 Cookie 過大。<br>Too many headers or oversized cookies. | 清除不必要的 Cookie 或精簡標頭後重試。<br>Clear unneeded cookies or trim headers, then retry. | RFC 6585 |
| 451 | Unavailable For Legal Reasons | 因法律原因無法提供 | 因法律要求，資源無法提供。<br>The resource is unavailable due to legal demands. | 法院命令、版權下架或地區法規封鎖。<br>A court order, copyright takedown, or regional regulation. | 依回應說明的法律依據處理；一般使用者無法繞過。<br>Follow the legal basis stated in the response; end users generally cannot bypass it. | RFC 7725 |
| 500 | Internal Server Error | 內部伺服器錯誤 | 伺服器發生未預期的錯誤。<br>The server hit an unexpected error. | 程式錯誤、設定錯誤或相依服務故障。<br>An application bug, misconfiguration, or a failed dependency. | 稍後重試；站方應檢查伺服器日誌。<br>Retry later; site owners should check server logs. | RFC 9110 §15.6.1 |
| 501 | Not Implemented | 未實作 | 伺服器不支援請求所需的功能。<br>The server does not support the functionality required. | 客戶端用了伺服器未實作的方法或功能。<br>The client used a method or feature the server has not implemented. | 改用伺服器支援的方法；站方需實作該功能。<br>Use a supported method; site owners need to implement the feature. | RFC 9110 §15.6.2 |
| 502 | Bad Gateway | 錯誤的閘道 | 閘道或代理收到上游伺服器的無效回應。<br>A gateway or proxy received an invalid response from the upstream server. | 上游服務當機、逾時或回應格式錯誤。<br>The upstream service crashed, timed out, or returned a malformed response. | 稍後重試；站方應檢查上游服務狀態。<br>Retry later; site owners should check the upstream service. | RFC 9110 §15.6.3 |
| 503 | Service Unavailable | 服務無法使用 | 伺服器暫時無法處理請求。<br>The server is temporarily unable to handle the request. | 伺服器過載或維護中。<br>The server is overloaded or under maintenance. | 依 Retry-After 標頭等候後重試。<br>Wait per the Retry-After header, then retry. | RFC 9110 §15.6.4 |
| 504 | Gateway Timeout | 閘道逾時 | 閘道等候上游伺服器逾時。<br>The gateway timed out waiting for the upstream server. | 上游服務回應過慢或無回應。<br>The upstream service responded too slowly or not at all. | 稍後重試；站方應檢查上游效能。<br>Retry later; site owners should check upstream performance. | RFC 9110 §15.6.5 |
| 505 | HTTP Version Not Supported | 不支援的 HTTP 版本 | 伺服器不支援請求使用的 HTTP 版本。<br>The server does not support the HTTP version used in the request. | 客戶端使用過新或過舊的 HTTP 版本。<br>The client used an HTTP version that is too new or too old. | 改用伺服器支援的 HTTP 版本。<br>Use an HTTP version the server supports. | RFC 9110 §15.6.6 |
| 506 | Variant Also Negotiates | 變體亦協商 | 內容協商設定錯誤，選出的變體本身又是協商資源。<br>A configuration error: the chosen variant is itself a negotiable resource. | 伺服器內容協商設定錯誤。<br>A server content-negotiation misconfiguration. | 站方應修正協商設定；使用者無法自行解決。<br>Site owners must fix the negotiation setup; end users cannot resolve it. | RFC 2295 |
| 507 | Insufficient Storage | 儲存空間不足 | 伺服器儲存空間不足，無法完成請求。<br>The server lacks storage space to complete the request. | 磁碟已滿或配額用盡。<br>A full disk or an exhausted quota. | 站方應釋放空間或擴充容量後重試。<br>Site owners should free space or add capacity, then retry. | RFC 4918 |
| 508 | Loop Detected | 偵測到迴圈 | 伺服器在處理請求時偵測到無限迴圈。<br>The server detected an infinite loop while processing the request. | WebDAV 深度複製遇到循環參照。<br>A cyclic reference in a WebDAV deep operation. | 修正造成循環的資源結構。<br>Fix the resource structure causing the cycle. | RFC 5842 |
| 510 | Not Extended | 未擴充（已廢止） | 請求需要進一步擴充才能完成；此碼已廢止。<br>The request needs further extensions; this code is obsolete. | 舊式 HTTP 擴充框架，RFC 2774 實驗，已改為 Historic。<br>The old RFC 2774 extension framework, now Historic. | 不應在新系統使用；收到時視為伺服器錯誤處理。<br>Do not use in new systems; treat it as a server error. | RFC 2774 (OBSOLETED) |
| 511 | Network Authentication Required | 需要網路驗證 | 客戶端需先通過網路存取驗證，例如 captive portal。<br>The client must authenticate for network access, e.g. a captive portal. | 公共 Wi-Fi 登入頁尚未完成驗證。<br>A public Wi-Fi login page not yet completed. | 完成 captive portal 驗證後重試。<br>Complete the captive-portal sign-in, then retry. | RFC 6585 |

特別註記（依 IANA registry，2026-11-21）：

- `104` 為暫時性登記（temporary，registered 2024-11-13，extension registered 2025-09-15，expires 2026-11-13）：登記已於 2026-11-13 到期，但登記列仍在；本工具仍回傳該列，並以 `temporary=true` 及表內文字標示。
- `306`、`418` 登記描述為 `(Unused)`；`418` 的舊稱 "I'm a teapot" 出自 RFC 2324 愚人節玩笑，不在現行 IANA 登記中，不得作為官方名稱使用。
- `413`、`422` 等名稱採用 RFC 9110 現行名稱（舊 RFC 7231 的 "Payload Too Large"、舊 RFC 4918 的 "Unprocessable Entity" 已更名）。
- `510` 登記標示 OBSOLETED；`402` 保留給未來付款機制，尚無標準語義。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「查詢」，畫面和完整報告符合核心 fixtures，使用者取得對應產物；完整狀態碼表 64 列與分類篩選可操作。 |
| boundaries | 合法端點（100、599）、剛好越界（099、600）、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。17 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `code-100-continue` | 1xx 分類與 100 的完整說明 |
| `code-200-ok` | 2xx 分類與 200 的完整說明 |
| `code-204-no-content` | 204 無內容回應 |
| `code-301-moved-permanently` | 3xx 分類與永久重導向 |
| `code-304-not-modified` | 304 快取命中說明 |
| `code-404-not-found` | 4xx 分類與 404 的完整說明 |
| `code-418-unused` | 418 依 RFC 9110 為 (Unused)，非 "I'm a teapot" |
| `code-429-too-many-requests` | 429 速率限制與 Retry-After 建議 |
| `code-500-internal-server-error` | 5xx 分類與 500 的完整說明 |
| `code-502-bad-gateway` | 502 上游無效回應 |
| `code-209-unassigned` | 區間內未指派代碼的固定說明 |
| `code-599-unassigned` | 599 未指派，5xx 上界 |
| `code-099-below-range` | 099 通過文法但低於 100，RANGE |
| `code-600-above-range` | 600 高於 599，RANGE |
| `code-letters` | 非數字輸入，INTEGER_FORMAT |
| `code-empty` | 空輸入，EMPTY |
| `code-too-long` | 9 位 raw 輸入，INPUT_LIMIT |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 code==100、code==599、code==099、code==600、`099` 與 `99` 的不同錯誤、9 位以上 raw 輸入、空白輸入。完整狀態碼表須逐列核對 64 列的官方名稱與出處與 IANA registry 一致，未指派區間不逐列出現。

候選 gate（均 NOT_RUN）

- 於 `tools/http-status-lookup/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線查詢。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「HTTP 狀態碼查詢」，title「HTTP 狀態碼查詢｜Gloss Tools」，description「輸入一個 HTTP 狀態碼，立即知道它的分類、官方名稱、中文說明、常見成因與處理建議。」。英文 lang=en，H1 “HTTP Status Lookup”，title “HTTP Status Lookup | Gloss Tools”，description “Enter an HTTP status code and see its class, official name, meaning in Chinese, common causes, and what to do about it.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。查不到的代碼怎麼辦？在 100–599 內但尚未指派的代碼會顯示未指派說明，只以分類概略理解。 / What if a code is not assigned? A code inside 100–599 with no assignment shows the unassigned note; interpret it only by its class.
- FAQ。會真的去請求某個網址嗎？不會。本工具只查內建的狀態碼表，不發出任何網路請求。 / Does it request a URL? No. This tool only looks up the built-in status code table and makes no network requests.
- FAQ。418 是 "I'm a teapot" 嗎？不是。現行 IANA 登記與 RFC 9110 將 418 列為 (Unused)；"I'm a teapot" 出自 RFC 2324 愚人節玩笑。 / Is 418 "I'm a teapot"? No. The current IANA registry and RFC 9110 list 418 as (Unused); "I'm a teapot" came from the RFC 2324 April Fools' joke.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://http-status-lookup.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/http-status-lookup/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

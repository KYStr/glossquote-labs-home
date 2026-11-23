// Pure core for the HTTP Status Lookup
// (spec-http-status-lookup-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind.
// The 64-row status table below is the SPEC's literal §5 table,
// pinned to the IANA HTTP Status Code Registry as read on
// 2026-11-21: official English names and references are verbatim
// from the registry; Chinese names, meanings, causes, and advice
// are the SPEC's fixed texts. 418 is (Unused) per RFC 9110
// §15.5.19 — "I'm a teapot" (RFC 2324 April Fools' joke) is not
// in the current registry. 413/422 use the RFC 9110 current names
// "Content Too Large" / "Unprocessable Content". 104 is a
// temporary registration (expired 2026-11-13, still listed);
// 510 is OBSOLETED. 306 and 418 are (Unused). 402 is reserved
// with no standard semantics. The result shape follows
// fixtures.json exactly; field order is the SPEC's §4 order.

export const FIELDS = ["code"];

// SPEC default; reset restores this draft.
export const DEFAULTS = { code: "404" };

// The worked example is fixtures.json case 1 (code-200-ok) input,
// vendored verbatim in test/fixtures.json.
export const EXAMPLE = { code: "200" };

export const MAX_RAW_UNITS = 8;

// Pinned §5 category table (summaries verbatim from the IANA
// registry notes, read 2026-11-21).
export const CATEGORIES = {
  1: {
    key: "informational",
    labelZh: "資訊",
    labelEn: "Informational",
    range: "100–199",
    summaryZh: "請求已收到，繼續處理。",
    summaryEn: "Request received, continuing process.",
  },
  2: {
    key: "success",
    labelZh: "成功",
    labelEn: "Success",
    range: "200–299",
    summaryZh: "請求已成功接收、理解並接受。",
    summaryEn: "The action was successfully received, understood, and accepted.",
  },
  3: {
    key: "redirection",
    labelZh: "重導向",
    labelEn: "Redirection",
    range: "300–399",
    summaryZh: "需要進一步動作才能完成請求。",
    summaryEn: "Further action must be taken in order to complete the request.",
  },
  4: {
    key: "client-error",
    labelZh: "客戶端錯誤",
    labelEn: "Client Error",
    range: "400–499",
    summaryZh: "請求語法錯誤或無法完成。",
    summaryEn: "The request contains bad syntax or cannot be fulfilled.",
  },
  5: {
    key: "server-error",
    labelZh: "伺服器錯誤",
    labelEn: "Server Error",
    range: "500–599",
    summaryZh: "伺服器無法完成看似有效的請求。",
    summaryEn: "The server failed to fulfill an apparently valid request.",
  }
};

// Fixed strings for codes inside 100–599 with no assignment
// (SPEC §5, verbatim).
export const UNASSIGNED = {
  meaningZh: "此代碼在 IANA HTTP 狀態碼登記中為 Unassigned，尚未指派官方語義。",
  meaningEn: "This code is Unassigned in the IANA HTTP Status Code Registry; no official semantics are assigned.",
  causeZh: "尚未有標準或實務用途指派此代碼。",
  causeEn: "No standard or practice has assigned a use to this code.",
  adviceZh: "不要依賴此代碼的語義；收到時請以其分類（第 1 個數字）概略理解。",
  adviceEn: "Do not rely on any semantics for this code; interpret it only by its class (first digit).",
};

// Unassigned intervals inside 100–599 (IANA registry, 2026-11-21).
export const UNASSIGNED_RANGES = "105–199、209–225、227–299、309–399、419–420、427、430、432–450、452–499、509、512–599";

// The 64 assigned codes (SPEC §5). temporary is true only for 104;
// obsolete is true only for 510.
export const STATUS_TABLE = [
  {
    code: 100,
    reason: "Continue",
    reasonZh: "繼續",
    meaningZh: "伺服器已收到請求標頭，客戶端應繼續傳送主體。",
    meaningEn: "The server has received the request headers; the client should continue sending the body.",
    causeZh: "客戶端送出 Expect: 100-continue 後的正常回應。",
    causeEn: "Normal response after a client sends Expect: 100-continue.",
    adviceZh: "繼續傳送請求主體；若逾時未收到 100，可直接傳送主體或中止。",
    adviceEn: "Continue sending the body; if no 100 arrives in time, send the body anyway or abort.",
    reference: "RFC 9110 §15.2.1",
    temporary: false,
    obsolete: false,
  },
  {
    code: 101,
    reason: "Switching Protocols",
    reasonZh: "切換通訊協定",
    meaningZh: "伺服器接受 Upgrade 要求，將切換為新協定。",
    meaningEn: "The server accepts the Upgrade request and will switch protocols.",
    causeZh: "客戶端要求升級，例如由 HTTP 升級為 WebSocket。",
    causeEn: "The client asked to upgrade, e.g. HTTP to WebSocket.",
    adviceZh: "依新協定繼續交握；升級失敗時退回原協定重試。",
    adviceEn: "Continue the handshake under the new protocol; fall back to the original protocol if the upgrade fails.",
    reference: "RFC 9110 §15.2.2",
    temporary: false,
    obsolete: false,
  },
  {
    code: 102,
    reason: "Processing",
    reasonZh: "處理中",
    meaningZh: "伺服器已收到完整請求，正在處理，請客戶端繼續等候。",
    meaningEn: "The server received the full request and is still processing it.",
    causeZh: "伺服器端長耗時操作，例如 WebDAV 大量處理。",
    causeEn: "A long server-side operation, e.g. a WebDAV batch.",
    adviceZh: "繼續等候，不要重送請求。",
    adviceEn: "Keep waiting; do not resend the request.",
    reference: "RFC 2518",
    temporary: false,
    obsolete: false,
  },
  {
    code: 103,
    reason: "Early Hints",
    reasonZh: "早期提示",
    meaningZh: "伺服器在送出最終回應前，先提示客戶端可預載的資源。",
    meaningEn: "The server hints at resources the client can preload before the final response.",
    causeZh: "伺服器想讓瀏覽器提早載入 CSS/JS 以加速頁面。",
    causeEn: "The server wants the browser to preload CSS/JS early.",
    adviceZh: "依提示預載資源；忽略提示也不影響最終回應。",
    adviceEn: "Preload as hinted; ignoring the hints does not affect the final response.",
    reference: "RFC 8297",
    temporary: false,
    obsolete: false,
  },
  {
    code: 104,
    reason: "Upload Resumption Supported",
    reasonZh: "支援續傳上傳",
    meaningZh: "伺服器支援續傳上傳（暫時性登記）。",
    meaningEn: "The server supports resumable uploads (temporary registration).",
    causeZh: "伺服器宣告支援可續傳的上傳協定。",
    causeEn: "The server advertises support for the resumable-upload protocol.",
    adviceZh: "依續傳協定上傳；注意此為暫時性登記，登記已於 2026-11-13 到期。",
    adviceEn: "Upload per the resumable protocol; note this temporary registration expired 2026-11-13.",
    reference: "draft-ietf-httpbis-resumable-upload-05",
    temporary: true,
    obsolete: false,
  },
  {
    code: 200,
    reason: "OK",
    reasonZh: "成功",
    meaningZh: "請求成功，伺服器已回傳請求的內容。",
    meaningEn: "The request succeeded and the server returned the requested content.",
    causeZh: "正常的成功回應。",
    causeEn: "A normal successful response.",
    adviceZh: "無需處理。",
    adviceEn: "No action needed.",
    reference: "RFC 9110 §15.3.1",
    temporary: false,
    obsolete: false,
  },
  {
    code: 201,
    reason: "Created",
    reasonZh: "已建立",
    meaningZh: "請求成功，並已建立新的資源。",
    meaningEn: "The request succeeded and a new resource was created.",
    causeZh: "成功建立資源，例如 POST 新增一筆資料。",
    causeEn: "A resource was created, e.g. POST adding a record.",
    adviceZh: "以回應中的 Location 標頭取得新資源位置。",
    adviceEn: "Use the Location header to find the new resource.",
    reference: "RFC 9110 §15.3.2",
    temporary: false,
    obsolete: false,
  },
  {
    code: 202,
    reason: "Accepted",
    reasonZh: "已接受",
    meaningZh: "請求已接受處理，但尚未完成。",
    meaningEn: "The request was accepted for processing, but processing is not complete.",
    causeZh: "非同步處理，例如排入佇列的工作。",
    causeEn: "Asynchronous processing, e.g. a queued job.",
    adviceZh: "依回應指示查詢處理進度，不要假設已完成。",
    adviceEn: "Check progress as instructed; do not assume completion.",
    reference: "RFC 9110 §15.3.3",
    temporary: false,
    obsolete: false,
  },
  {
    code: 203,
    reason: "Non-Authoritative Information",
    reasonZh: "非權威資訊",
    meaningZh: "請求成功，但回應內容來自第三方副本，可能與來源不同。",
    meaningEn: "The request succeeded, but the content came from a third-party copy and may differ from the origin.",
    causeZh: "代理伺服器回傳快取或轉換過的內容。",
    causeEn: "A proxy returned cached or transformed content.",
    adviceZh: "需權威內容時直接向來源伺服器請求。",
    adviceEn: "Request the origin server directly for authoritative content.",
    reference: "RFC 9110 §15.3.4",
    temporary: false,
    obsolete: false,
  },
  {
    code: 204,
    reason: "No Content",
    reasonZh: "無內容",
    meaningZh: "請求成功，但沒有要回傳的內容。",
    meaningEn: "The request succeeded, but there is no content to return.",
    causeZh: "成功執行不需回傳的動作，例如刪除或表單送出。",
    causeEn: "An action that needs no body, e.g. a delete or form submit.",
    adviceZh: "無需處理；不要期待回應主體。",
    adviceEn: "No action needed; do not expect a body.",
    reference: "RFC 9110 §15.3.5",
    temporary: false,
    obsolete: false,
  },
  {
    code: 205,
    reason: "Reset Content",
    reasonZh: "重設內容",
    meaningZh: "請求成功，客戶端應重設送出請求的表單或畫面。",
    meaningEn: "The request succeeded; the client should reset the form or view that sent it.",
    causeZh: "表單送出後應清空輸入。",
    causeEn: "A form submission after which inputs should be cleared.",
    adviceZh: "清空表單輸入。",
    adviceEn: "Clear the form inputs.",
    reference: "RFC 9110 §15.3.6",
    temporary: false,
    obsolete: false,
  },
  {
    code: 206,
    reason: "Partial Content",
    reasonZh: "部分內容",
    meaningZh: "伺服器依 Range 要求，只回傳資源的一部分。",
    meaningEn: "The server returned only part of the resource, as requested with Range.",
    causeZh: "續傳下載或串流分段請求。",
    causeEn: "A resumed download or streamed segment.",
    adviceZh: "依 Content-Range 組合各段；缺段時重新請求。",
    adviceEn: "Reassemble parts per Content-Range; re-request missing parts.",
    reference: "RFC 9110 §15.3.7",
    temporary: false,
    obsolete: false,
  },
  {
    code: 207,
    reason: "Multi-Status",
    reasonZh: "多重狀態",
    meaningZh: "回應主體列出多個子請求各自的狀態。",
    meaningEn: "The body lists the status of multiple sub-requests.",
    causeZh: "WebDAV 一次操作多個資源。",
    causeEn: "A WebDAV operation over several resources.",
    adviceZh: "逐項檢查主體內的各子狀態。",
    adviceEn: "Check each sub-status inside the body.",
    reference: "RFC 4918",
    temporary: false,
    obsolete: false,
  },
  {
    code: 208,
    reason: "Already Reported",
    reasonZh: "已回報",
    meaningZh: "此成員已在本次回應前面列出，不重複列。",
    meaningEn: "This member was already listed earlier in this response.",
    causeZh: "WebDAV PROPFIND 回應去重。",
    causeEn: "Deduplication in a WebDAV PROPFIND response.",
    adviceZh: "以前面列出的項目為準。",
    adviceEn: "Use the earlier listing.",
    reference: "RFC 5842",
    temporary: false,
    obsolete: false,
  },
  {
    code: 226,
    reason: "IM Used",
    reasonZh: "已使用 IM",
    meaningZh: "伺服器對 GET 套用了 instance manipulation，回傳處理後的結果。",
    meaningEn: "The server applied an instance manipulation to the GET and returned the result.",
    causeZh: "客戶端送出帶 IM 標頭的請求。",
    causeEn: "The client sent a request with an IM header.",
    adviceZh: "依回應內容使用；不支援 IM 的客戶端不要送出 IM 標頭。",
    adviceEn: "Use the returned content; clients without IM support should not send the IM header.",
    reference: "RFC 3229",
    temporary: false,
    obsolete: false,
  },
  {
    code: 300,
    reason: "Multiple Choices",
    reasonZh: "多重選擇",
    meaningZh: "資源有多種表示形式，客戶端應選擇其一。",
    meaningEn: "The resource has several representations; the client should choose one.",
    causeZh: "同一 URI 提供多種格式或語言版本。",
    causeEn: "One URI offers several formats or languages.",
    adviceZh: "依 Location 或主體清單選擇適合的表示形式。",
    adviceEn: "Pick a representation from the Location header or body list.",
    reference: "RFC 9110 §15.4.1",
    temporary: false,
    obsolete: false,
  },
  {
    code: 301,
    reason: "Moved Permanently",
    reasonZh: "永久移動",
    meaningZh: "資源已永久移到新的 URI。",
    meaningEn: "The resource has permanently moved to a new URI.",
    causeZh: "網站改版、網址結構變更或整站搬遷。",
    causeEn: "A site redesign, URL change, or migration.",
    adviceZh: "更新書籤與連結，改用 Location 標頭的新位址。",
    adviceEn: "Update bookmarks and links to the new address in Location.",
    reference: "RFC 9110 §15.4.2",
    temporary: false,
    obsolete: false,
  },
  {
    code: 302,
    reason: "Found",
    reasonZh: "已找到",
    meaningZh: "資源暫時位於另一 URI。",
    meaningEn: "The resource is temporarily at a different URI.",
    causeZh: "暫時導向，例如維護期間或 A/B 測試。",
    causeEn: "A temporary redirect, e.g. during maintenance or A/B testing.",
    adviceZh: "本次改用新位址，但保留原連結，不要更新書籤。",
    adviceEn: "Use the new address this time, but keep the original link.",
    reference: "RFC 9110 §15.4.3",
    temporary: false,
    obsolete: false,
  },
  {
    code: 303,
    reason: "See Other",
    reasonZh: "參見其他",
    meaningZh: "回應可在另一 URI 以 GET 取得。",
    meaningEn: "The response can be retrieved with GET at another URI.",
    causeZh: "表單 POST 成功後導向結果頁，避免重複送出。",
    causeEn: "Redirect after a form POST to a result page.",
    adviceZh: "以 GET 請求 Location 標頭的位址。",
    adviceEn: "GET the address in the Location header.",
    reference: "RFC 9110 §15.4.4",
    temporary: false,
    obsolete: false,
  },
  {
    code: 304,
    reason: "Not Modified",
    reasonZh: "未修改",
    meaningZh: "資源自條件請求指定的時間後未曾修改，可使用快取。",
    meaningEn: "The resource has not changed since the conditional request; use the cache.",
    causeZh: "客戶端送出 If-Modified-Since 或 If-None-Match 且內容未變。",
    causeEn: "A conditional request with If-Modified-Since or If-None-Match and unchanged content.",
    adviceZh: "使用本地快取；這不是錯誤。",
    adviceEn: "Use the local cache; this is not an error.",
    reference: "RFC 9110 §15.4.5",
    temporary: false,
    obsolete: false,
  },
  {
    code: 305,
    reason: "Use Proxy",
    reasonZh: "使用 Proxy",
    meaningZh: "必須經由指定的 Proxy 存取資源。",
    meaningEn: "The resource must be accessed through the specified proxy.",
    causeZh: "舊式代理設定要求。",
    causeEn: "A legacy proxy configuration requirement.",
    adviceZh: "依 Location 標頭改走指定的 Proxy；多數現代客戶端不支援此碼。",
    adviceEn: "Route via the proxy in Location; most modern clients do not support this code.",
    reference: "RFC 9110 §15.4.6",
    temporary: false,
    obsolete: false,
  },
  {
    code: 306,
    reason: "(Unused)",
    reasonZh: "（未使用）",
    meaningZh: "此代碼目前未使用，沒有定義的語義。",
    meaningEn: "This code is currently unused and has no defined semantics.",
    causeZh: "保留代碼，RFC 9110 明定為未使用。",
    causeEn: "A reserved code, defined as unused by RFC 9110.",
    adviceZh: "不應出現在實際回應中；收到時視為未定義代碼處理。",
    adviceEn: "It should not appear in real responses; treat it as an undefined code.",
    reference: "RFC 9110 §15.4.7",
    temporary: false,
    obsolete: false,
  },
  {
    code: 307,
    reason: "Temporary Redirect",
    reasonZh: "暫時重導向",
    meaningZh: "資源暫時位於另一 URI，且重送時必須保持原請求方法。",
    meaningEn: "The resource is temporarily elsewhere; the method must stay the same on redirect.",
    causeZh: "暫時導向且不得把 POST 改成 GET。",
    causeEn: "A temporary redirect that must not change POST into GET.",
    adviceZh: "以相同方法請求 Location 的位址。",
    adviceEn: "Request the Location address with the same method.",
    reference: "RFC 9110 §15.4.8",
    temporary: false,
    obsolete: false,
  },
  {
    code: 308,
    reason: "Permanent Redirect",
    reasonZh: "永久重導向",
    meaningZh: "資源已永久移到另一 URI，且重送時必須保持原請求方法。",
    meaningEn: "The resource has permanently moved; the method must stay the same on redirect.",
    causeZh: "永久搬遷且不得把 POST 改成 GET。",
    causeEn: "A permanent move that must not change POST into GET.",
    adviceZh: "更新連結，改用新位址並保持原方法。",
    adviceEn: "Update links to the new address, keeping the original method.",
    reference: "RFC 9110 §15.4.9",
    temporary: false,
    obsolete: false,
  },
  {
    code: 400,
    reason: "Bad Request",
    reasonZh: "錯誤請求",
    meaningZh: "伺服器無法理解請求，多半是語法錯誤。",
    meaningEn: "The server cannot understand the request, usually a syntax error.",
    causeZh: "參數缺漏、格式錯誤或 JSON 無法解析。",
    causeEn: "Missing parameters, malformed syntax, or unparsable JSON.",
    adviceZh: "檢查請求語法與參數後重送。",
    adviceEn: "Check the request syntax and parameters, then resend.",
    reference: "RFC 9110 §15.5.1",
    temporary: false,
    obsolete: false,
  },
  {
    code: 401,
    reason: "Unauthorized",
    reasonZh: "未授權",
    meaningZh: "請求需要驗證身分。",
    meaningEn: "The request requires authentication.",
    causeZh: "缺少憑證、憑證過期或無效。",
    causeEn: "Missing, expired, or invalid credentials.",
    adviceZh: "重新登入或更新憑證後重試。",
    adviceEn: "Sign in again or refresh the credentials, then retry.",
    reference: "RFC 9110 §15.5.2",
    temporary: false,
    obsolete: false,
  },
  {
    code: 402,
    reason: "Payment Required",
    reasonZh: "需要付款",
    meaningZh: "保留給未來付款機制使用，尚未定義標準語義。",
    meaningEn: "Reserved for future payment mechanisms; no standard semantics defined.",
    causeZh: "保留代碼，實務上少見。",
    causeEn: "A reserved code, rarely seen in practice.",
    adviceZh: "依服務商說明處理；無通用做法。",
    adviceEn: "Follow the service provider's instructions; there is no generic handling.",
    reference: "RFC 9110 §15.5.3",
    temporary: false,
    obsolete: false,
  },
  {
    code: 403,
    reason: "Forbidden",
    reasonZh: "禁止存取",
    meaningZh: "伺服器理解請求，但拒絕授權。",
    meaningEn: "The server understood the request but refuses to authorize it.",
    causeZh: "權限不足、IP 被封鎖或目錄禁止列出。",
    causeEn: "Insufficient permission, a blocked IP, or forbidden directory listing.",
    adviceZh: "確認帳號權限；重新驗證通常無效。",
    adviceEn: "Check account permissions; re-authenticating usually does not help.",
    reference: "RFC 9110 §15.5.4",
    temporary: false,
    obsolete: false,
  },
  {
    code: 404,
    reason: "Not Found",
    reasonZh: "找不到",
    meaningZh: "伺服器找不到請求的資源。",
    meaningEn: "The server cannot find the requested resource.",
    causeZh: "網址打錯、資源已刪除或移動且未設導向。",
    causeEn: "A mistyped URL, or a deleted or moved resource without a redirect.",
    adviceZh: "檢查網址拼字；站方應確認連結與導向。",
    adviceEn: "Check the URL spelling; site owners should fix links and redirects.",
    reference: "RFC 9110 §15.5.5",
    temporary: false,
    obsolete: false,
  },
  {
    code: 405,
    reason: "Method Not Allowed",
    reasonZh: "不允許的方法",
    meaningZh: "資源存在，但不支援此請求方法。",
    meaningEn: "The resource exists, but the method is not supported for it.",
    causeZh: "對唯讀資源送出 POST/DELETE 等。",
    causeEn: "Sending POST/DELETE to a read-only resource.",
    adviceZh: "改用 Allow 標頭列出的方法。",
    adviceEn: "Use a method listed in the Allow header.",
    reference: "RFC 9110 §15.5.6",
    temporary: false,
    obsolete: false,
  },
  {
    code: 406,
    reason: "Not Acceptable",
    reasonZh: "不可接受",
    meaningZh: "伺服器無法提供符合 Accept 標頭的表示形式。",
    meaningEn: "The server cannot provide a representation matching the Accept headers.",
    causeZh: "客戶端要求的格式或語言伺服器沒有。",
    causeEn: "The client asked for a format or language the server lacks.",
    adviceZh: "放寬 Accept 條件後重試。",
    adviceEn: "Relax the Accept conditions and retry.",
    reference: "RFC 9110 §15.5.7",
    temporary: false,
    obsolete: false,
  },
  {
    code: 407,
    reason: "Proxy Authentication Required",
    reasonZh: "需要 Proxy 驗證",
    meaningZh: "需先向 Proxy 驗證身分。",
    meaningEn: "The client must authenticate with the proxy first.",
    causeZh: "經由需驗證的 Proxy 上網。",
    causeEn: "Going through a proxy that requires authentication.",
    adviceZh: "提供 Proxy 憑證後重試。",
    adviceEn: "Supply the proxy credentials, then retry.",
    reference: "RFC 9110 §15.5.8",
    temporary: false,
    obsolete: false,
  },
  {
    code: 408,
    reason: "Request Timeout",
    reasonZh: "請求逾時",
    meaningZh: "伺服器等候請求逾時。",
    meaningEn: "The server timed out waiting for the request.",
    causeZh: "網路緩慢或客戶端送出請求太慢。",
    causeEn: "A slow network or a client sending too slowly.",
    adviceZh: "檢查網路後重送請求。",
    adviceEn: "Check the connection, then resend.",
    reference: "RFC 9110 §15.5.9",
    temporary: false,
    obsolete: false,
  },
  {
    code: 409,
    reason: "Conflict",
    reasonZh: "衝突",
    meaningZh: "請求與資源目前狀態衝突。",
    meaningEn: "The request conflicts with the current state of the resource.",
    causeZh: "版本衝突、重複建立已存在的資源。",
    causeEn: "A version conflict or creating a resource that already exists.",
    adviceZh: "取得最新狀態，解決衝突後重試。",
    adviceEn: "Fetch the latest state, resolve the conflict, then retry.",
    reference: "RFC 9110 §15.5.10",
    temporary: false,
    obsolete: false,
  },
  {
    code: 410,
    reason: "Gone",
    reasonZh: "已刪除",
    meaningZh: "資源已永久刪除，且無轉址位址。",
    meaningEn: "The resource is permanently gone, with no forwarding address.",
    causeZh: "資源刻意永久下架。",
    causeEn: "A resource deliberately and permanently removed.",
    adviceZh: "移除連結與書籤；不要重試。",
    adviceEn: "Remove links and bookmarks; do not retry.",
    reference: "RFC 9110 §15.5.11",
    temporary: false,
    obsolete: false,
  },
  {
    code: 411,
    reason: "Length Required",
    reasonZh: "需要長度",
    meaningZh: "請求缺少必要的 Content-Length。",
    meaningEn: "The request lacks a required Content-Length.",
    causeZh: "送出主體卻未附 Content-Length。",
    causeEn: "Sending a body without Content-Length.",
    adviceZh: "補上 Content-Length 後重送。",
    adviceEn: "Add Content-Length and resend.",
    reference: "RFC 9110 §15.5.12",
    temporary: false,
    obsolete: false,
  },
  {
    code: 412,
    reason: "Precondition Failed",
    reasonZh: "前置條件失敗",
    meaningZh: "請求中的前置條件未成立。",
    meaningEn: "A precondition in the request was not met.",
    causeZh: "If-Match/If-Unmodified-Since 與目前狀態不符。",
    causeEn: "If-Match or If-Unmodified-Since does not match the current state.",
    adviceZh: "重新取得最新狀態與 ETag 後重試。",
    adviceEn: "Re-fetch the latest state and ETag, then retry.",
    reference: "RFC 9110 §15.5.13",
    temporary: false,
    obsolete: false,
  },
  {
    code: 413,
    reason: "Content Too Large",
    reasonZh: "內容過大",
    meaningZh: "請求主體超過伺服器願意處理的大小。",
    meaningEn: "The request body exceeds the size the server will process.",
    causeZh: "上傳檔案過大。",
    causeEn: "An uploaded file is too large.",
    adviceZh: "縮小內容或改分段上傳。",
    adviceEn: "Reduce the size or upload in parts.",
    reference: "RFC 9110 §15.5.14",
    temporary: false,
    obsolete: false,
  },
  {
    code: 414,
    reason: "URI Too Long",
    reasonZh: "URI 過長",
    meaningZh: "URI 超過伺服器願意處理的長度。",
    meaningEn: "The URI exceeds the length the server will process.",
    causeZh: "查詢字串過長，例如 GET 帶大量參數。",
    causeEn: "An overlong query string, e.g. GET with many parameters.",
    adviceZh: "改用 POST 傳送參數，縮短 URI。",
    adviceEn: "Send parameters via POST and shorten the URI.",
    reference: "RFC 9110 §15.5.15",
    temporary: false,
    obsolete: false,
  },
  {
    code: 415,
    reason: "Unsupported Media Type",
    reasonZh: "不支援的媒體類型",
    meaningZh: "請求主體的媒體類型伺服器不支援。",
    meaningEn: "The server does not support the media type of the request body.",
    causeZh: "Content-Type 不符，例如送出 XML 而伺服器只接受 JSON。",
    causeEn: "A mismatched Content-Type, e.g. XML sent where only JSON is accepted.",
    adviceZh: "改用伺服器支援的 Content-Type。",
    adviceEn: "Use a Content-Type the server supports.",
    reference: "RFC 9110 §15.5.16",
    temporary: false,
    obsolete: false,
  },
  {
    code: 416,
    reason: "Range Not Satisfiable",
    reasonZh: "無法滿足範圍",
    meaningZh: "請求的範圍超出資源實際大小。",
    meaningEn: "The requested range is outside the resource's actual size.",
    causeZh: "續傳位置超過檔案結尾。",
    causeEn: "A resume offset beyond the end of the file.",
    adviceZh: "重新取得完整檔案，或以正確範圍重試。",
    adviceEn: "Download the full file again, or retry with a valid range.",
    reference: "RFC 9110 §15.5.17",
    temporary: false,
    obsolete: false,
  },
  {
    code: 417,
    reason: "Expectation Failed",
    reasonZh: "預期失敗",
    meaningZh: "伺服器無法滿足 Expect 標頭的要求。",
    meaningEn: "The server cannot meet the Expect header's requirement.",
    causeZh: "送出伺服器不支援的 Expect，例如 100-continue 以外的期望。",
    causeEn: "An Expect the server does not support.",
    adviceZh: "移除或更換 Expect 後重試。",
    adviceEn: "Remove or change the Expect header, then retry.",
    reference: "RFC 9110 §15.5.18",
    temporary: false,
    obsolete: false,
  },
  {
    code: 418,
    reason: "(Unused)",
    reasonZh: "（未使用）",
    meaningZh: "此代碼目前未使用，沒有定義的語義。",
    meaningEn: "This code is currently unused and has no defined semantics.",
    causeZh: "保留代碼，RFC 9110 明定為未使用；舊稱「I'm a teapot」出自 RFC 2324 愚人節玩笑，不在現行登記中。",
    causeEn: "A reserved code, defined as unused by RFC 9110; the old \"I'm a teapot\" name came from the RFC 2324 April Fools' joke and is not in the current registry.",
    adviceZh: "不應出現在實際回應中；收到時視為未定義代碼處理。",
    adviceEn: "It should not appear in real responses; treat it as an undefined code.",
    reference: "RFC 9110 §15.5.19",
    temporary: false,
    obsolete: false,
  },
  {
    code: 421,
    reason: "Misdirected Request",
    reasonZh: "錯誤導向的請求",
    meaningZh: "請求被導向無法回應的伺服器。",
    meaningEn: "The request was directed at a server that cannot respond to it.",
    causeZh: "HTTP/2 連線重用時請求送到錯誤的伺服器。",
    causeEn: "Connection reuse sending a request to the wrong server in HTTP/2.",
    adviceZh: "客戶端應重新建立連線後重試。",
    adviceEn: "The client should open a fresh connection and retry.",
    reference: "RFC 9110 §15.5.20",
    temporary: false,
    obsolete: false,
  },
  {
    code: 422,
    reason: "Unprocessable Content",
    reasonZh: "無法處理的內容",
    meaningZh: "請求語法正確，但內容語義有誤無法處理。",
    meaningEn: "The request syntax is valid, but the content has semantic errors.",
    causeZh: "表單驗證失敗，例如欄位格式正確但邏輯不合。",
    causeEn: "Validation failed, e.g. fields well-formed but logically wrong.",
    adviceZh: "依回應的錯誤說明修正內容後重送。",
    adviceEn: "Fix the content per the response's error details, then resend.",
    reference: "RFC 9110 §15.5.21",
    temporary: false,
    obsolete: false,
  },
  {
    code: 423,
    reason: "Locked",
    reasonZh: "已鎖定",
    meaningZh: "資源已被鎖定。",
    meaningEn: "The resource is locked.",
    causeZh: "WebDAV 資源被其他使用者鎖定。",
    causeEn: "Another user locked the WebDAV resource.",
    adviceZh: "等候解鎖或聯絡鎖定者。",
    adviceEn: "Wait for the lock to release or contact the locker.",
    reference: "RFC 4918",
    temporary: false,
    obsolete: false,
  },
  {
    code: 424,
    reason: "Failed Dependency",
    reasonZh: "相依性失敗",
    meaningZh: "請求因另一請求失敗而無法執行。",
    meaningEn: "The request failed because another request it depends on failed.",
    causeZh: "WebDAV 批次操作中前置操作失敗。",
    causeEn: "An earlier operation in a WebDAV batch failed.",
    adviceZh: "先修正相依操作失敗的原因。",
    adviceEn: "Fix the failed dependency first.",
    reference: "RFC 4918",
    temporary: false,
    obsolete: false,
  },
  {
    code: 425,
    reason: "Too Early",
    reasonZh: "太早",
    meaningZh: "伺服器不願處理可能被重送的早期請求。",
    meaningEn: "The server refuses to process an early request that might be replayed.",
    causeZh: "客戶端在 TLS 交握完成前送出 Early-Data。",
    causeEn: "The client sent Early-Data before the TLS handshake finished.",
    adviceZh: "等交握完成後以一般請求重送。",
    adviceEn: "Resend as a normal request after the handshake completes.",
    reference: "RFC 8470",
    temporary: false,
    obsolete: false,
  },
  {
    code: 426,
    reason: "Upgrade Required",
    reasonZh: "需要升級",
    meaningZh: "客戶端應升級為其他協定才能繼續。",
    meaningEn: "The client must switch to another protocol.",
    causeZh: "伺服器要求改用新版協定，例如 TLS 或 HTTP/2。",
    causeEn: "The server requires a newer protocol, e.g. TLS or HTTP/2.",
    adviceZh: "依 Upgrade 標頭升級後重試。",
    adviceEn: "Upgrade as indicated in the Upgrade header, then retry.",
    reference: "RFC 9110 §15.5.22",
    temporary: false,
    obsolete: false,
  },
  {
    code: 428,
    reason: "Precondition Required",
    reasonZh: "需要前置條件",
    meaningZh: "伺服器要求請求必須附帶條件式標頭。",
    meaningEn: "The server requires the request to carry a conditional header.",
    causeZh: "為避免 lost update，伺服器強制要求 If-Match。",
    causeEn: "The server enforces If-Match to prevent lost updates.",
    adviceZh: "附上 If-Match 等條件式標頭後重試。",
    adviceEn: "Add a conditional header such as If-Match, then retry.",
    reference: "RFC 6585",
    temporary: false,
    obsolete: false,
  },
  {
    code: 429,
    reason: "Too Many Requests",
    reasonZh: "請求過多",
    meaningZh: "客戶端在短時間內送出太多請求。",
    meaningEn: "The client sent too many requests in a short time.",
    causeZh: "超過速率限制。",
    causeEn: "The rate limit was exceeded.",
    adviceZh: "依 Retry-After 標頭等候後再試，並降低請求頻率。",
    adviceEn: "Wait per the Retry-After header, then retry at a lower rate.",
    reference: "RFC 6585",
    temporary: false,
    obsolete: false,
  },
  {
    code: 431,
    reason: "Request Header Fields Too Large",
    reasonZh: "請求標頭欄位過大",
    meaningZh: "請求標頭總量過大，伺服器拒絕處理。",
    meaningEn: "The request header fields are too large for the server to process.",
    causeZh: "標頭過多或 Cookie 過大。",
    causeEn: "Too many headers or oversized cookies.",
    adviceZh: "清除不必要的 Cookie 或精簡標頭後重試。",
    adviceEn: "Clear unneeded cookies or trim headers, then retry.",
    reference: "RFC 6585",
    temporary: false,
    obsolete: false,
  },
  {
    code: 451,
    reason: "Unavailable For Legal Reasons",
    reasonZh: "因法律原因無法提供",
    meaningZh: "因法律要求，資源無法提供。",
    meaningEn: "The resource is unavailable due to legal demands.",
    causeZh: "法院命令、版權下架或地區法規封鎖。",
    causeEn: "A court order, copyright takedown, or regional regulation.",
    adviceZh: "依回應說明的法律依據處理；一般使用者無法繞過。",
    adviceEn: "Follow the legal basis stated in the response; end users generally cannot bypass it.",
    reference: "RFC 7725",
    temporary: false,
    obsolete: false,
  },
  {
    code: 500,
    reason: "Internal Server Error",
    reasonZh: "內部伺服器錯誤",
    meaningZh: "伺服器發生未預期的錯誤。",
    meaningEn: "The server hit an unexpected error.",
    causeZh: "程式錯誤、設定錯誤或相依服務故障。",
    causeEn: "An application bug, misconfiguration, or a failed dependency.",
    adviceZh: "稍後重試；站方應檢查伺服器日誌。",
    adviceEn: "Retry later; site owners should check server logs.",
    reference: "RFC 9110 §15.6.1",
    temporary: false,
    obsolete: false,
  },
  {
    code: 501,
    reason: "Not Implemented",
    reasonZh: "未實作",
    meaningZh: "伺服器不支援請求所需的功能。",
    meaningEn: "The server does not support the functionality required.",
    causeZh: "客戶端用了伺服器未實作的方法或功能。",
    causeEn: "The client used a method or feature the server has not implemented.",
    adviceZh: "改用伺服器支援的方法；站方需實作該功能。",
    adviceEn: "Use a supported method; site owners need to implement the feature.",
    reference: "RFC 9110 §15.6.2",
    temporary: false,
    obsolete: false,
  },
  {
    code: 502,
    reason: "Bad Gateway",
    reasonZh: "錯誤的閘道",
    meaningZh: "閘道或代理收到上游伺服器的無效回應。",
    meaningEn: "A gateway or proxy received an invalid response from the upstream server.",
    causeZh: "上游服務當機、逾時或回應格式錯誤。",
    causeEn: "The upstream service crashed, timed out, or returned a malformed response.",
    adviceZh: "稍後重試；站方應檢查上游服務狀態。",
    adviceEn: "Retry later; site owners should check the upstream service.",
    reference: "RFC 9110 §15.6.3",
    temporary: false,
    obsolete: false,
  },
  {
    code: 503,
    reason: "Service Unavailable",
    reasonZh: "服務無法使用",
    meaningZh: "伺服器暫時無法處理請求。",
    meaningEn: "The server is temporarily unable to handle the request.",
    causeZh: "伺服器過載或維護中。",
    causeEn: "The server is overloaded or under maintenance.",
    adviceZh: "依 Retry-After 標頭等候後重試。",
    adviceEn: "Wait per the Retry-After header, then retry.",
    reference: "RFC 9110 §15.6.4",
    temporary: false,
    obsolete: false,
  },
  {
    code: 504,
    reason: "Gateway Timeout",
    reasonZh: "閘道逾時",
    meaningZh: "閘道等候上游伺服器逾時。",
    meaningEn: "The gateway timed out waiting for the upstream server.",
    causeZh: "上游服務回應過慢或無回應。",
    causeEn: "The upstream service responded too slowly or not at all.",
    adviceZh: "稍後重試；站方應檢查上游效能。",
    adviceEn: "Retry later; site owners should check upstream performance.",
    reference: "RFC 9110 §15.6.5",
    temporary: false,
    obsolete: false,
  },
  {
    code: 505,
    reason: "HTTP Version Not Supported",
    reasonZh: "不支援的 HTTP 版本",
    meaningZh: "伺服器不支援請求使用的 HTTP 版本。",
    meaningEn: "The server does not support the HTTP version used in the request.",
    causeZh: "客戶端使用過新或過舊的 HTTP 版本。",
    causeEn: "The client used an HTTP version that is too new or too old.",
    adviceZh: "改用伺服器支援的 HTTP 版本。",
    adviceEn: "Use an HTTP version the server supports.",
    reference: "RFC 9110 §15.6.6",
    temporary: false,
    obsolete: false,
  },
  {
    code: 506,
    reason: "Variant Also Negotiates",
    reasonZh: "變體亦協商",
    meaningZh: "內容協商設定錯誤，選出的變體本身又是協商資源。",
    meaningEn: "A configuration error: the chosen variant is itself a negotiable resource.",
    causeZh: "伺服器內容協商設定錯誤。",
    causeEn: "A server content-negotiation misconfiguration.",
    adviceZh: "站方應修正協商設定；使用者無法自行解決。",
    adviceEn: "Site owners must fix the negotiation setup; end users cannot resolve it.",
    reference: "RFC 2295",
    temporary: false,
    obsolete: false,
  },
  {
    code: 507,
    reason: "Insufficient Storage",
    reasonZh: "儲存空間不足",
    meaningZh: "伺服器儲存空間不足，無法完成請求。",
    meaningEn: "The server lacks storage space to complete the request.",
    causeZh: "磁碟已滿或配額用盡。",
    causeEn: "A full disk or an exhausted quota.",
    adviceZh: "站方應釋放空間或擴充容量後重試。",
    adviceEn: "Site owners should free space or add capacity, then retry.",
    reference: "RFC 4918",
    temporary: false,
    obsolete: false,
  },
  {
    code: 508,
    reason: "Loop Detected",
    reasonZh: "偵測到迴圈",
    meaningZh: "伺服器在處理請求時偵測到無限迴圈。",
    meaningEn: "The server detected an infinite loop while processing the request.",
    causeZh: "WebDAV 深度複製遇到循環參照。",
    causeEn: "A cyclic reference in a WebDAV deep operation.",
    adviceZh: "修正造成循環的資源結構。",
    adviceEn: "Fix the resource structure causing the cycle.",
    reference: "RFC 5842",
    temporary: false,
    obsolete: false,
  },
  {
    code: 510,
    reason: "Not Extended",
    reasonZh: "未擴充（已廢止）",
    meaningZh: "請求需要進一步擴充才能完成；此碼已廢止。",
    meaningEn: "The request needs further extensions; this code is obsolete.",
    causeZh: "舊式 HTTP 擴充框架，RFC 2774 實驗，已改為 Historic。",
    causeEn: "The old RFC 2774 extension framework, now Historic.",
    adviceZh: "不應在新系統使用；收到時視為伺服器錯誤處理。",
    adviceEn: "Do not use in new systems; treat it as a server error.",
    reference: "RFC 2774 (OBSOLETED)",
    temporary: false,
    obsolete: true,
  },
  {
    code: 511,
    reason: "Network Authentication Required",
    reasonZh: "需要網路驗證",
    meaningZh: "客戶端需先通過網路存取驗證，例如 captive portal。",
    meaningEn: "The client must authenticate for network access, e.g. a captive portal.",
    causeZh: "公共 Wi-Fi 登入頁尚未完成驗證。",
    causeEn: "A public Wi-Fi login page not yet completed.",
    adviceZh: "完成 captive portal 驗證後重試。",
    adviceEn: "Complete the captive-portal sign-in, then retry.",
    reference: "RFC 6585",
    temporary: false,
    obsolete: false,
  }
];

const STATUS_BY_CODE = new Map(STATUS_TABLE.map((row) => [row.code, row]));

export function categoryFor(code) {
  const cls = Math.floor(code / 100);
  const pinned = CATEGORIES[cls];
  return {
    class: cls,
    key: pinned.key,
    labelZh: pinned.labelZh,
    labelEn: pinned.labelEn,
    range: pinned.range,
    summaryZh: pinned.summaryZh,
    summaryEn: pinned.summaryEn,
  };
}

const CODE_PATTERN = /^[0-9]{3}$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the one
// `code` field.
function readRawInput(input) {
  if (!isPlainObject(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== FIELDS.length) return null;
  const raw = {};
  for (const field of FIELDS) {
    if (!keys.includes(field)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    raw[field] = descriptor.value;
  }
  return raw;
}

function hasLoneSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Validation in the SPEC's order: capacity, unpaired surrogate, empty,
// grammar, range. `099` passes the grammar but is below 100, so it is
// RANGE; `99` (two digits) is INTEGER_FORMAT.
export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  const value = raw.code;
  if (value.length > MAX_RAW_UNITS) return failure("INPUT_LIMIT", "code");
  if (hasLoneSurrogate(value)) return failure("UNICODE", "code");
  if (value.length === 0) return failure("EMPTY", "code");
  if (!CODE_PATTERN.test(value)) return failure("INTEGER_FORMAT", "code");
  const code = Number(value);
  if (!Number.isSafeInteger(code) || code < 100 || code > 599) {
    return failure("RANGE", "code");
  }

  const category = categoryFor(code);
  const row = STATUS_BY_CODE.get(code);
  if (row === undefined) {
    return {
      ok: true,
      result: {
        code,
        category,
        assigned: false,
        reason: null,
        reasonZh: null,
        meaningZh: UNASSIGNED.meaningZh,
        meaningEn: UNASSIGNED.meaningEn,
        causeZh: UNASSIGNED.causeZh,
        causeEn: UNASSIGNED.causeEn,
        adviceZh: UNASSIGNED.adviceZh,
        adviceEn: UNASSIGNED.adviceEn,
        reference: null,
        temporary: false,
        obsolete: false,
      },
    };
  }
  return {
    ok: true,
    result: {
      code,
      category,
      assigned: true,
      reason: row.reason,
      reasonZh: row.reasonZh,
      meaningZh: row.meaningZh,
      meaningEn: row.meaningEn,
      causeZh: row.causeZh,
      causeEn: row.causeEn,
      adviceZh: row.adviceZh,
      adviceEn: row.adviceEn,
      reference: row.reference,
      temporary: row.temporary,
      obsolete: row.obsolete,
    },
  };
}

// Fixed report download: http-status-lookup-report.json. The content is
// the result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. The serializer is hand-written: it never calls
// a value's toJSON and accepts only the plain data shapes a result
// can hold (null, booleans, safe integers, strings, arrays, plain
// objects).
export const REPORT_FILENAME = "http-status-lookup-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("report values must be safe integers");
    }
    return String(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => serializeValue(entry)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    // Default string sort compares UTF-16 code units, as the SPEC pins.
    const keys = Object.keys(value).sort();
    const parts = keys.map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new Error("report objects must hold plain data only");
      }
      return `${JSON.stringify(key)}:${serializeValue(descriptor.value)}`;
    });
    return `{${parts.join(",")}}`;
  }
  throw new Error("unsupported report value");
}

export function buildReport(result) {
  if (!isPlainObject(result)) {
    return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  let text;
  try {
    text = `${serializeValue(result)}\n`;
  } catch {
    return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  const byteLength = new TextEncoder().encode(text).byteLength;
  if (byteLength > REPORT_LIMIT_BYTES) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, filename: REPORT_FILENAME, text, byteLength };
}

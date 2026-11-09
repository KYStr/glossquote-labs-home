# 技術契約：書籤匯出整理

## 執行環境與檔案樹

Node.js 24、原生 ESM、零 dependencies；不 npm install。Candidate pages 為 /index.html 和 /en/index.html。Node dev server 綁 127.0.0.1:4229（4180+49），只 serve public/；M1 noindex,nofollow,noarchive。禁止 remote resources、URL fetch/open、analytics、storage、upload、browser DOMParser/innerHTML parse。測試資料必須合成。

    package.json
    .gitignore
    public/index.html
    public/en/index.html
    public/css/app.css
    public/js/app.js
    public/js/ui.js
    public/js/core/utf8.js
    public/js/core/entities.js
    public/js/core/tokenizer.js
    public/js/core/parser.js
    public/js/core/urls.js
    public/js/core/organizer.js
    public/js/core/export-html.js
    public/js/core/export-json.js
    scripts/serve.mjs
    scripts/check.mjs
    scripts/build.mjs
    test/tokenizer.test.mjs
    test/parser.test.mjs
    test/urls.test.mjs
    test/organizer.test.mjs
    test/export.test.mjs

使用 bounded tokenizer，不建 HTML DOM，不使用 browser parser。輸出用 TextEncoder 和明確 escape function 串接固定 allowlisted tags。參考 Firefox 官方匯出說明：[Export bookmarks to another browser](https://support.mozilla.org/en-US/kb/export-firefox-bookmarks-to-backup-or-transfer)。該頁說明 HTML export 是瀏覽器轉移方式；本工具只承諾本文 parser profile，不宣稱全部匯出變體支援。

## Input decoding 和 document tokens

先檢查 byteLength<=2,097,152；只移除一個開頭 UTF-8 BOM EF BB BF。用 TextDecoder("utf-8",{fatal:true})；非法 sequence -> INVALID_ENCODING，UTF-16 拒絕。檔案 read reject -> INVALID_STRUCTURE。Offset 在 decoded string 中以 UTF-16 code-unit index 計。

Tokenizer 不呼叫 innerHTML、DOMParser、document.write 或 network。Whitespace 只允許 TAB/LF/CR/SPACE。允許 inert comment <!-- ... -->；未關閉 comment 或 comment body 含雙連字元 hyphen -> UNSUPPORTED_MARKUP。允許前置區一次可選、case-insensitive 的精確 doctype <!DOCTYPE NETSCAPE-Bookmark-file-1>，不接受 public/system identifiers。前置區可有 comments/whitespace、單一 META、TITLE、H1；DL 後只接受 comments/whitespace。

META 的 attribute 名只允許 HTTP-EQUIV、CONTENT，各一次且值必須加引號；HTTP-EQUIV case-insensitive value 為 Content-Type；CONTENT 值為 text/html; charset=UTF-8（charset 字母大小寫不敏感）。不接受其它 encoding 宣告。TITLE/H1 最多各一個，內容只允許文字和 entity；只作 envelope，不進 tree，也不顯示。wrapper token 不交給瀏覽器解析，不會執行。

在根 DL 內允許 DL、DT、H3、A，以及無 attribute 的 opening P separator。P 只能緊鄰 DL 開始或結束處，不能有文字、attributes、nested tags；不接受 P close tag。其它 tag 包括 SCRIPT、STYLE、IMG、IFRAME 全部拒絕。HTML tag/attribute 名按 ASCII case-insensitive；attribute 只可一份、值必須 quoted。未解析 token、unquoted/duplicate attribute -> UNSUPPORTED_MARKUP 或 UNSUPPORTED_ATTRIBUTE。

Entity allowlist: amp、lt、gt、quot、apos、nbsp 和十進/十六進 numeric scalar。Unknown entity、缺分號、surrogate、超 U+10FFFF 或 illegal numeric -> INVALID_ENTITY。H3/A 文字中不接受 nested tag；text runs decode entity exactly once，不能二次 HTML parse。A title 原始 bytes 文字 &lt;img src=x onerror=alert(1)&gt; 解碼為純字串 <img src=x onerror=alert(1)>，preview 僅經 textContent 呈現；Bookmark title 保存解碼後純文字。

## Attributes 和結構文法

H3 允許 ADD_DATE、LAST_MODIFIED、PERSONAL_TOOLBAR_FOLDER。A 必需 HREF，可加 ADD_DATE、LAST_MODIFIED、ICON_URI、ICON、SHORTCUTURL、LAST_CHARSET。Names case-insensitive，各 attr 只能一次且值需 quoted；未知 attr、重複 attr、缺值 -> UNSUPPORTED_ATTRIBUTE。已知 metadata attrs 忽略且不輸出；ICON/ICON_URI 原始 bounded string 略過，不 base64 decode、不顯示、不作 URL、不請求。HREF 才讀取/檢驗。

Profile 結構：
- 文件可有零或一個 doctype、META、TITLE、H1；唯一 root DL 包含 items。
- DL 直接子項是 DT bookmark/folder；whitespace、comments、允許的 P 不產生 item。
- DT 內恰有一個 H3 或 A。H3 關閉後可跟一個子 DL，內容是 folder children；A 關閉後不可有子 DL。每個 DT 可省略 closing DT，但不可巢狀 DT。
- H3/A 都必須有 matching close tag；title text 只允許純文字/entities。Folder DL 可空。
- folder depth 最深12層；root DL 不算 folder level。最多3000個 A bookmarks。
- 限值採全檔拒絕。parser 不補 tag，不作 browser-style error recovery。

Token parser 使用 index+stack。任何結構歧義或 unsupported token 都回一個 error offset、bookmarks=[]、沒有 partial preview/export。

## 安全 URL 和 grouping

HREF entity decode 一次後必須非空、無首尾 ASCII whitespace、無 C0/C1 controls。用 new URL(decoded) 無 base 解析；只接受 protocol http: 或 https: 且 username/password 都空。拒絕其它 schemes、relative URL、malformed percent sequence 和 credentials。URL parse 僅用於驗證；不可用 URL.href 當 grouping key或輸出。Duplicate key 是 decoded HREF 原字串 exact match；不做 URL canonicalization、大小寫折疊、percent decoding 或尾斜線正規化。Query、fragment、host casing、slash 任一字串不同皆是獨立 group。絕不 linkify/open/fetch HREF；不由 ICON_URI 載 favicon。

## Tree、手動編輯與輸出

Bookmark v1 欄位：sourceIndex,title,href,originalFolderPath,folderPath,included,duplicateGroupId,suggestedKeeper。originalFolderPath immutable；folderPath initially copied。Exact-HREF groups 按第一個 sourceIndex 排列，members 按 sourceIndex，groupId 為 url-group-001 起。suggestedKeeper 初始最小 sourceIndex；其它仍 included=true。明確確認的 group action 可排除其它副本；JSON 保留全部 records 和 included=false。

Move folder 依 PRODUCT.md 限制。新/更名 folder path 用 segments 更新 tree，保留 bookmark source order；同一路徑合併。HTML writer 按 folderPath 建樹，title 和 HREF 使用分開 escape functions；輸出固定 Netscape wrapper、UTF-8，只有固定 META/TITLE/H1/DL/DT/H3/A/P tags，不輸出輸入 metadata、ICON、ICON_URI 或其他外部資源。Generated attrs 都 double-quoted。HTML 只輸出 included=true。JSON schema 如 PRODUCT.md，sourceIndex 排序並包括 excluded items、modified path、duplicate hints。

HTML text escape: &, <, >；attribute 另 escape double quote。序列化只對已 decode 一次的 bookmark title 套用一次 escape：上述純字串 <img src=x onerror=alert(1)> 輸出回 &lt;img src=x onerror=alert(1)&gt;，不得保留為 active markup，也不得輸出 &amp;lt;。輸入文字不經 HTML serialization library。JSON 由 JSON.stringify 實作。不包含原始 HTML bytes。

## 狀態、錯誤與清理

狀態：empty -> selected -> decoding -> tokenizing -> preview -> editing -> ready-to-export。任何 parse error -> error 且零 preview；cancel/reset/source replacement/pagehide 清除 source string/tree/URLs；新檔重設 edit。解析以 <=2 MiB bounded text 執行；取消則停止、discard partial state。UI 更新只用 textContent 和固定安全 elements。舊 job event 依 jobId epoch 忽略。

HTML/JSON Blob URL 在明確下載操作時建立；source replacement/reset/cancel/pagehide revoke。不設結果自動期限。兩語言普通 anchor 導頁，離頁不攜帶 state。

## Node scripts

package scripts 固定 dev=node scripts/serve.mjs、test=node --test、check=node scripts/check.mjs、build=node scripts/build.mjs。build 只複製 public/ 到 dist/。check 驗 noindex、無 remote resource、storage、HTML parser sink，執行 syntax/structural checks；靜態掃描不是安全證明。測試使用合成 export shapes，不執行外部資料。

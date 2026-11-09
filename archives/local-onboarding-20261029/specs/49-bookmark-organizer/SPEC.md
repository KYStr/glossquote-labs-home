# 書籤匯出整理 — 既有規格保存

Task ID: `labs-49-bookmark-organizer` · Spec ID: `spec-49-bookmark-organizer`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求：書籤匯出整理

M1 完成的工作結果是經使用者檢閱、仍可匯入的書籤 HTML 加一份可攜 JSON 備份。分析/修改只作用於目前分頁內的資料副本。任何不支援或歧義都阻止整份輸出，不可只匯出成功解析的部分。

## Job、result、contract、oracle

Job v1：

    {
      schemaVersion: 1,
      jobId: "job-1",
      sourceName: "bookmarks.html",
      sourceBytes: 1024,
      parserProfile: "netscape-bookmark-html-profile-v1",
      bookmarks: [{
        sourceIndex: 0,
        title: "Example",
        href: "https://example.com/a?x=1",
        originalFolderPath: ["Research"],
        folderPath: ["Research"],
        included: true
      }]
    }

sourceIndex 是檔案順序中 anchor 的零起始序號，即使標題/URL 重複仍唯一。每筆預設 included=true、folderPath=originalFolderPath。相同 href 的 duplicate group 預設標示最早 sourceIndex 為 suggestedKeeper；不得因此自動排除任何書籤。

成功 Result v1 有 status=ready、parserProfile、bookmarks、duplicateGroups、exportHtml:Blob、backupJson:Blob。Bookmark 物件包含 sourceIndex,title,href,originalFolderPath,folderPath,included,duplicateGroupId,suggestedKeeper。Duplicate group 欄位是 groupId,exactHref,memberSourceIndexes,suggestedKeeperSourceIndex。只將解析與 URL 安全檢查全數完成的 Job 轉為 ready。

錯誤 Result 為 {schemaVersion:1,jobId,status:"error",error:{code,offset,messageKey},bookmarks:[],duplicateGroups:[],exportHtml:null,backupJson:null}。固定 errors: INPUT_TOO_LARGE、INVALID_ENCODING、UNSUPPORTED_MARKUP、UNSUPPORTED_ATTRIBUTE、INVALID_ENTITY、INVALID_STRUCTURE、DEPTH_LIMIT、TOO_MANY_BOOKMARKS、INVALID_URL、UNSAFE_URL、CANCELED。offset 是 UTF-16 code-unit index；不帶原文 snippet 或 partial result。

JSON 下載檔名 duplicate-report.json，exact keys 為 schemaVersion=1、kind="glossquote-bookmark-organizer-backup"、parserProfile、bookmarks、duplicateGroups。JSON 按 sourceIndex 排序，包含所有 bookmark 及 include/modified path 欄位，不含來源 HTML 或檔案 metadata bytes。HTML 下載檔名 bookmarks-organized.html，只含 included=true bookmarks，按使用者排序後 folderPath 建樹，使用固定 Netscape profile wrapper、UTF-8、HTML MIME；標題和屬性使用正確 escaping。不輸出 ICON/ICON_URI 或外部資源。只有使用者明確點下載按鈕才產生輸出。

## 功能需求

**FR-01 選取輸入。** 提供單檔 input，建議 .html/.htm。空檔回 INVALID_STRUCTURE。不得自動讀其他檔或資料夾。

**FR-02 限制與編碼。** 最多 2,097,152 input bytes；只接受 UTF-8，可移除一個開頭 BOM；非法 UTF-8 以 fatal decoder 拒絕，UTF-16 拒絕。最多 3000 個 A bookmark、folder nesting 最多 12 層。精確上限接受，超出整份拒絕，沒有 parsed preview。

**FR-03 安全 tokenizer。** 不使用 DOMParser、innerHTML 或把輸入節點插入文件。使用 bounded tokenizer，只接受 TECHNICAL.md 定義的 Netscape document wrapper tokens、DL/DT/H3/A 和空 P separator。comments 視為 inert；allowlist 外 tag、attribute、entity 或結構全檔拒絕，不可靜默略過 bookmark。

**FR-04 文件外殼與安全屬性。** 允許 doctype、comment、單一 META Content-Type UTF-8、TITLE、H1 作文件外殼 token；識別後忽略，不執行、不進 tree。常見 H3/A metadata attrs 依 TECHNICAL.md allowlist 接受並忽略；ICON/ICON_URI 不解碼、不顯示、不請求。其餘 attributes 拒絕。

**FR-05 URL 與精確分組。** A 必須有 HREF；entity decode 後是絕對 URL，WHATWG URL parse scheme 僅 http/https，username/password 必須空。拒絕 javascript、data、file、相對 URL、credentials、控制字元和首尾 whitespace。duplicate key 是 decoded HREF exact Unicode string；不使用 URL.href canonical form、不做大小寫、尾斜線、fragment、query 變換。query 不同即不同 group。絕不打開/fetch HREF。

**FR-06 樹和預覽。** 按原 nesting 建 folderPath；顯示標題、URL、路徑和 exact-URL duplicate groups。標題和 href 都是文字，不形成 anchor。相同 URL 顯示各 sourceIndex；不因 title 相同推定 duplicate。

**FR-07 手動保留。** 全部 bookmarks 預設 included=true，即使 group 有 suggestedKeeper。可明確取消個別 include checkbox；可按「只保留所選項」，顯示將排除數量並再次確認。每個 group 可手動指定 suggestedKeeper，限制為該 group member；改 keeper 不自動排除其他項。

**FR-08 移動資料夾。** 每 bookmark 可留原資料夾或改到現有/新路徑。路徑最多 12 層，每 segment 1–255 UTF-8 bytes，不可空、.、.. 或含 C0/C1 controls；合法標點/Unicode 以文字保存。originalFolderPath 不變，folderPath 更新。改名資料夾同步更新 descendants。

**FR-09 產物。** 手動操作後更新 HTML/JSON preview 摘要。HTML 只輸出 included=true；JSON 保留所有項及 included flag。reset、source replacement、cancel、pagehide 清除 parsed data 和下載暫存；Ready 無自動時間期限。

**FR-10 全檔錯誤。** Unsupported token、malformed nesting/entity、超限制或不安全 URL 均拒絕整檔：不顯示 partial tree、不提供 export；顯示錯誤碼和 offset，保留重選動作。絕不執行原始 HTML。

**FR-11 雙語導覽。** 繁中 /index.html 和英文 /en/index.html 是獨立頁面。普通語言連結會導頁；未下載的輸入/樹/修改會遺失，連結旁須明示。無 storage/query/hash 或跨頁 state。

## 固定 duplicate oracle

href https://example.com/a 出現兩次建立一組；同一 base 的 ?x=1 與 ?x=2 不合併。javascript:alert(1) 拒絕全檔。A bookmark title 原始內容 &lt;img src=x onerror=alert(1)&gt; 解碼一次後於 preview 以純文字 <img src=x onerror=alert(1)> 顯示，HTML export escape 一次輸出為 &lt;img src=x onerror=alert(1)&gt;，不可二次 escape。TITLE envelope 仍忽略且不顯示。完整情境見 ACCEPTANCE.md。


---

## 原文件 TECHNICAL.md

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


---

## 原文件 UX-SEO.md

# UX 與 SEO：書籤匯出整理

候選 slug bookmark-organizer；候選 domain bookmarks 由主代理評估。M1 noindex,nofollow,noarchive，沒有未驗證 canonical。

| 欄位 | 繁體中文 | English |
|---|---|---|
| Title | 書籤匯出整理｜本機重複連結整理工具 | Bookmark Export Organizer — Local Bookmark Cleanup |
| Description | 在瀏覽器本機整理書籤 HTML，檢視完全相同的連結、調整資料夾並下載可匯入檔案。 | Organize bookmark HTML locally, review exact URL matches, move folders, and download importable files. |
| H1 | 整理書籤匯出檔 | Organize a bookmark export |
| 短說明 | 先檢閱重複連結與資料夾，再決定輸出內容。來源檔不會改動。 | Review duplicate URLs and folders before exporting. Your source file is not changed. |
| Primary action | 選擇書籤 HTML | Choose bookmark HTML |
| Candidate status | 本機候選版；尚未部署 | Local candidate; not deployed |

繁中頁 /index.html，英文頁 /en/index.html。頁首用普通 anchor 導頁。切換將失去尚未下載的來源、樹和編輯；旁邊顯示「切換語言會離開此頁；未下載的書籤整理結果會遺失。」英文：「Changing language leaves this page. Unexported bookmark changes will be lost.」不保存或攜帶資料。

桌面工作區（>=75rem）：

    ┌ 品牌 | 書籤匯出整理 | 語言連結 ────────────────┐
    │ H1 / 選檔後先預覽；不會開啟連結或修改來源       │
    ├────────────────────────────┬──────────────────────┤
    │ [選擇書籤 HTML]             │ 2 MiB / 3000 links   │
    │ 來源檔名與 byte 數           │ 匯出 Profile 說明   │
    ├────────────────────────────┴──────────────────────┤
    │ 資料夾樹 / 搜尋標題或 URL                          │
    │ Duplicate URL group: [建議保留] [包含] [資料夾]   │
    │ 每筆標題、URL文字、原資料夾、目前資料夾           │
    │ [下載匯入 HTML] [下載 JSON 備份] [重新開始]        │
    └───────────────────────────────────────────────────┘

中版（48–74.999rem）單欄；樹與書籤列表依序排列。窄版（<48rem）每個 duplicate group 可摺疊，但 inclusion checkbox、keeper radio、folder move 操作需可直接找到；不以水平表格要求橫向捲動。

    ┌ 品牌 | 工具 | EN ┐
    │ H1 / 短說明      │
    │ 離頁資料遺失警語  │
    │ [選擇書籤 HTML]  │
    │ 145 links / 12 folders │
    │ 資料夾 Research   │
    │ ☐ Example title  │
    │ URL (文字，不連結) │
    │ [保留] [資料夾]  │
    │ [HTML] [JSON]    │
    └──────────────────┘

empty 提供選檔動作和支援 profile 說明。decoding/tokenizing 顯示階段和取消。preview 顯示完整筆數和樹；錯誤時不顯示部分結果，只顯示 error code/offset 和重選。editing 標出原路徑與新路徑；included default true、排除要明確操作；group 建議保留不代表自動刪除。ready 顯示兩個下載動作。取消/重設/重選清除狀態；輸出不因時間自動過期。

安全/可及性：原生 input、button、checkbox、radio、select；label 包含標題和 sourceIndex；URL 以 plain text，不 clickable。已 decode 一次的 A title 以純文字顯示，例如來源 &lt;img src=x onerror=alert(1)&gt; 在 preview 顯示字串 <img src=x onerror=alert(1)>；匯出只 escape 一次回 &lt;img src=x onerror=alert(1)&gt;，不可二次 escape。TITLE envelope 不顯示。Tab順序按選檔、錯誤/preview、編輯、輸出。focus ring 清楚、target >=44px、320px 無水平捲動、200% zoom 可以完整操作、reduced motion、live error 不只用顏色。對比/token 依 docs/DESIGN-SYSTEM.md。

FAQ：
繁體中文：
1. **工具會開啟書籤網站嗎？** 不會。URL 只作文字檢查和完全相同字串分組，沒有網路請求。
2. **網址只有 query 不同會合併嗎？** 不會。query 不同是不同字串，也會保留為不同群組。
3. **工具會自動刪除重複書籤嗎？** 不會。預設全部納入，需由你明確排除後才會從 HTML 輸出移除；JSON 備份仍保留所有項目。
4. **ICON 或 favicon 會載入嗎？** 不會。匯出中的 ICON metadata 會忽略，不解碼、不顯示、不請求。
5. **所有瀏覽器書籤檔都支援嗎？** 本候選只接受列明的 Netscape profile。未支援的標記會拒絕整份，避免悄悄漏掉項目。

English:
1. **Will the tool open bookmark websites?** No. URLs are plain text for exact matching; no network request is made.
2. **Are URLs merged when only the query differs?** No. Different query strings remain separate exact URL groups.
3. **Does it automatically remove duplicate bookmarks?** No. All entries start included. You must explicitly exclude entries for HTML output; JSON keeps every entry.
4. **Are icons or favicons loaded?** No. ICON metadata is ignored, never decoded, displayed, or requested.
5. **Does it support every browser export?** This candidate accepts only the documented Netscape profile. Unsupported markup rejects the whole file rather than silently dropping items.

M1 使用 noindex，沒有已部署或全面相容性聲明。


---

## 原文件 ACCEPTANCE.md

# 驗收 oracle：書籤匯出整理

## 狀態

這些是 M1 的必需 oracle；規格階段產品、Node checks/build 和 browser 都未執行，標記 **NOT_RUN_SPEC_ONLY**。browser file picker、下載、鍵盤、320px/200% 及跨頁導覽均 **NOT_RUN_USER_FOCUS_INCIDENT**。Node tests 使用三種典型合成 Netscape export shape，不代表實際瀏覽器完整相容性。絕不開啟外部 URL。

| ID | FR | 合成輸入/操作 | 精確預期 |
|---|---|---|---|
| K49-01 | FR-02,03,04 | Firefox-like wrapper：doctype、comment、META UTF-8、TITLE、H1、DL/P、H3 ADD_DATE/LAST_MODIFIED、A HREF/ADD_DATE/ICON_URI | 解析成功；只得到結構 bookmark/folder；wrapper 和 metadata 不進結果；ICON_URI 不 fetch。 |
| K49-02 | FR-02,03,04 | Chrome-like folder H3 含 ADD_DATE、LAST_MODIFIED、PERSONAL_TOOLBAR_FOLDER；A 含 HREF、ADD_DATE、ICON、ICON_URI、SHORTCUTURL、LAST_CHARSET | 解析成功；href/title/tree 正確；metadata/icon 被忽略、不解碼、不輸出。 |
| K49-03 | FR-02,03 | Safari-like minimal Netscape profile：root DL、DT/A HREF、DT/H3、child DL | 解析成功；兩個 bookmarks 的 folderPath 正確；不推論 Safari 全部輸出格式。 |
| K49-04 | FR-02 | UTF-8 byteLength=2,097,152 的合法合成 input | limit 通過；parser 可完成。 |
| K49-05 | FR-02 | 同 input 加 1 byte | INPUT_TOO_LARGE；bookmarks=[]、HTML/JSON null。 |
| K49-06 | FR-02 | 非法 UTF-8、UTF-16 BOM | INVALID_ENCODING；零 partial preview。 |
| K49-07 | FR-02 | 正好3000個有效 A bookmark | 通過，sourceIndex 0..2999。 |
| K49-08 | FR-02 | 第3001個有效 A | TOO_MANY_BOOKMARKS；整份拒絕，零 partial preview。 |
| K49-09 | FR-02 | nesting 12 folder levels | 通過；最深 bookmark path 長度=12。 |
| K49-10 | FR-02 | nesting 13 folder levels | DEPTH_LIMIT；整份拒絕，零 outputs。 |
| K49-11 | FR-05 | href https://example.com/a 兩次 | 一 group，member indexes [0,1]，suggestedKeeper=0；兩個 included default=true。 |
| K49-12 | FR-05 | href /a?x=1 和 /a?x=2 | 兩個 singleton groups；query 不被忽略。 |
| K49-13 | FR-05 | href javascript:alert(1)、data:text/html,x、file:///x | 各自單獨測試均 UNSAFE_URL；不提供部分 preview/export。 |
| K49-14 | FR-05 | https://user:pass@example.com/ | UNSAFE_URL；credential 不接受。 |
| K49-15 | FR-05 | relative path /docs、首尾 whitespace、無效 URL | 各自 INVALID_URL；整個來源零 export。 |
| K49-16 | FR-03, FR-06, FR-09 | A bookmark title 原始內容 &lt;img src=x onerror=alert(1)&gt; | entity 解碼一次後 preview 顯示純字串 <img src=x onerror=alert(1)>，不產生 img；HTML export escape 一次回 &lt;img src=x onerror=alert(1)&gt;，不輸出 &amp;lt;。TITLE envelope 忽略且不顯示。 |
| K49-17 | FR-03 | A title 文字 Example &amp; Tools | decoded title 是 Example & Tools；匯出再 escape 為 Example &amp; Tools，不能二次解析。 |
| K49-18 | FR-03,04 | body 裡含 SCRIPT、STYLE、IFRAME 或未知 tag | UNSUPPORTED_MARKUP；全檔拒絕、沒有執行/網路/partial tree。 |
| K49-19 | FR-04 | A 有未知 attribute ONCLICK 或重複 HREF | UNSUPPORTED_ATTRIBUTE；無 export。 |
| K49-20 | FR-03 | 不完整 comment、unknown entity、未結束 A、錯誤 DL nesting | 對應 UNSUPPORTED_MARKUP/INVALID_ENTITY/INVALID_STRUCTURE；整份拒絕。 |
| K49-21 | FR-04 | 空 P separator 緊接 DL 開始/結束 | 接受且不建立 bookmark；P 帶文字、屬性或在其它位置均拒絕。 |
| K49-22 | FR-07,09 | 兩個 exact duplicate links，未操作直接匯出 | HTML 保留兩個；JSON 兩個 included=true；建議 keeper 不觸發排除。 |
| K49-23 | FR-07,09 | 手動排除 source 1 並確認 | HTML 只含 source0；JSON 保留 source1 並 included=false。 |
| K49-24 | FR-08,09 | 將 source0 從 A 移到 path [Work, 2026] | HTML folder path 為兩層 Work/2026；JSON 原路徑不變且 folderPath 更新。 |
| K49-25 | FR-09 | 無任何 user download click | 不自動建立/觸發下載、不打開 HTML；只顯示 preview。 |
| K49-26 | FR-10 | 解析完整合法 prefix 後最後一個 URL 不安全 | UNSAFE_URL；不顯示前段 parsed bookmarks、不輸出 partial artifact。 |
| K49-27 | FR-11 | /index.html 點 English link | 到 /en/index.html；離頁前警語可見；新頁沒有舊 file/tree/edit；無 query/hash/storage。 |
| K49-28 | FR-10 | Ready 後 fake clock 前進20分鐘，無操作 | 不設自動 expiry；編輯狀態維持、可下載。 |
| K49-29 | FR-10 | parse 中 cancel，worker 完成訊息延遲到達 | stale job 忽略；沒有 preview/Blob/object URL。 |
| K49-30 | FR-03,05 | parser 對任何 HREF 呼叫 fetch/open | 測試 spy 呼叫次數必須是0。 |

自動 Node 24 tests 覆蓋 K49-01–26、28–30；K49-27 和實際互動 file picker/下載/keyboard/reflow 須 browser test，維持 NOT_RUN_USER_FOCUS_INCIDENT。至少對三種合成形狀另做 parser table test；這些只驗本文 profile，不可在 HANDOFF 宣稱完整 Chrome/Firefox/Safari compatibility。HTML export test 需以 parser fixture重新解析輸出，且檢查輸出無 ICON/ICON_URI、script、remote resource 或 HREF entity injection。


---

## 原文件 TASKS.md

# 實作任務：書籤匯出整理

M1 只改 package.json、.gitignore、public/**、scripts/**、test/**、dist/**、HANDOFF.md、TASK-ENTRY.md、本工具 evidence/m1/**。六份規格和共同 docs 唯讀。不開 chat、不遞迴委派、不 npm install、不執行 browser/native UI、不部署/公開 GitHub。Node24原生ESM；offline合成exports。dev只綁127.0.0.1:4229（4180+49）；port conflict 回報 parent，不殺程序。

## T00 — Scaffold

Prerequisite：讀本工具 AGENTS.md、START-HERE.md、HANDOFF.md、docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md、docs/DESIGN-SYSTEM.md 和六份規格。

Allowed：package.json、.gitignore、public/index.html、public/en/index.html、public/css/**、public/js/**、scripts/**、test/**。

建立 private ESM、兩個獨立語言頁、普通語言 anchor 和未匯出狀態遺失警語、title/description、noindex、loopback static server、Node24 test/check/build scripts。Server 僅 serve public/，拒絕 traversal、非 GET/HEAD、未知 MIME；禁止 remote resources、storage、service worker。建立後執行 node --version、npm test、npm run check、npm run build；不 npm install，scripts 不存在時先建好再執行。

完成條件：Node major 24、四個 scripts、server 127.0.0.1:4229、兩頁 noindex、clean dist 只含 public；記錄命令/exit。Browser 尚未執行。

## T10 — Bounded tokenizer、parser 與 safety oracle

Prerequisite：T00 gates 通過。

Allowed：public/js/core/**、public/js/parse-worker.js、test/**，必要時 scripts/check.mjs。

實作 fatal UTF-8 decoder、2 MiB byte cap、wrapper token allowlist、DL/DT/H3/A/P tokenizer/parser、attribute/entity allowlists、tree/path builder、URL safety parser 和 exact href groups。Parser worker 接 jobId/cancel; parse error all-or-nothing。增加 K49-01–21、K49-26、K49-29、K49-30。使用合成 Firefox-like、Chrome-like、Safari-like fixtures。

執行 npm test、npm run check、npm run build。完成條件：三種 profile fixture 驗明確 allowlist；unknown tag/entity/attr/structure 全拒，零 partial output；URL tests證明不 fetch；Node tests offline。

## T20 — 手動整理與輸出

Prerequisite：T10 oracle 全過。

Allowed：public/index.html、public/en/index.html、public/css/**、public/js/**、test/**。

實作完整 tree preview、精確 duplicate group、included defaults、suggested keeper、group keeper、經確認排除、手動 move/new folder、HTML export、JSON backup、重選/reset/cancel/error states。所有 folder/title/href 作文字；HTML escape 分 context，A title &lt;img...&gt; 解碼一次、preview plain text、輸出 escape 一次回 &lt;img...&gt;；測試不得看到 &amp;lt; 或建立 img。JSON 包含排除列。HTML只輸出included列。中英文獨立 pages，不跨頁保存。

執行 npm test、npm run check、npm run build。完成條件：K49-22–25通過；輸出 HTML 可由本工具 parser 重新解析為等價 included tree；生成檔只由下載按鈕。

## T30 — 惡意邊界、SEO 和 M1 收尾

Prerequisite：T20 checks 通過。

Allowed：public/**、scripts/**、test/**、dist/**、HANDOFF.md、TASK-ENTRY.md、evidence/m1/**。

補足 2MiB、3000 links、12 levels、UTF8 errors、unknown token/attr/entity、credential/unsafe URLs、amp/markup escaping、folder move/include confirm、partial failure、pagehide cleanup tests。確認 noindex、兩語 Title/Description/H1/FAQ、跨頁 warning、browser NOT_RUN。build candidate並記錄 SHA-256、每條CLI命令/exit、未驗 gates/限制。

執行 node --version、npm test、npm run check、npm run build；只依實際結果標 CLI gate PASS。browser 維持 NOT_RUN_USER_FOCUS_INCIDENT。M1完成條件：可操作本機 bilingual candidate、exactURL groups、手動 tree/include editor、有效 HTML/JSON outputs、CLI checks 通過；回報 parent。M2 需 parent 另行放行。


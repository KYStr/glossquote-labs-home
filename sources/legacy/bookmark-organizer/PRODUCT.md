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

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

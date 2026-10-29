# 書籤匯出整理 / Bookmark export organizer

候選 slug：bookmark-organizer。候選 domain：bookmarks，由主代理另行驗證。規格狀態：尚未實作，非 browser 相容性或 M1 完成證明。

這是給剛從瀏覽器匯出書籤、想檢查重複連結、整理資料夾並產生可匯入檔案的人使用的本機工具。選擇 Netscape bookmark HTML 後，工具解析標題、資料夾路徑和安全的 HTTP/HTTPS URL，按完全相同的 URL 字串分組。使用者手動選擇保留項目、排除項目或移動資料夾，再下載可匯入 HTML 和 JSON 備份。

檔案上限 2 MiB、3000 個連結、12 層資料夾。輸入不會當成 HTML 執行；工具不載入網站、favicon 或其他資源。A bookmark 標題的 &lt;img...&gt; 只解碼一次後作純文字預覽，HTML 匯出再 escape 一次回 &lt;img...&gt;，不能二次 escape。所有內容在目前分頁記憶體處理，不上傳、不改原檔。難度中高，核心風險是 tokenizer、entity 解碼、HTML escaping、URL credential 檢查與全檔拒絕。

M1 必須交付可操作的雙語 candidate、離線 Node tests/check/build。此規格工作尚未實作產品或跑 browser；瀏覽器驗收為 NOT_RUN_USER_FOCUS_INCIDENT。僅承諾本文列出的 Netscape profile，不宣稱完整支援所有瀏覽器匯出變體。

非目標：開啟書籤 URL、網路檢查、favicon、匯入瀏覽器、同步、登入、雲端、推測式 URL 正規化、靜默略過損壞書籤。閱讀 PRODUCT.md、TECHNICAL.md、UX-SEO.md、ACCEPTANCE.md、TASKS.md。共同契約見本目錄 AGENTS.md、START-HERE.md、HANDOFF.md 和 docs/。

# 介面、雙語文案與 SEO：名單比對與合併

狀態：SPEC_ONLY。實際 metadata/HTTP/搜尋收錄均 NOT_RUN。

## 產品介面

採 Product App / Operate 模式。任務畫布以兩份名單和可讀結果為主，暖紙底色與墨色文字遵循 docs/DESIGN-SYSTEM.md。不要做 SaaS hero、假統計、遠端字型或裝飾卡片牆。

桌面順序：產品標題與語言連結；一句用途/本機隱私說明；A、B 輸入區並列；trim 與大小寫選項；比對/載入範例/清除；摘要；四個結果區。手機使用單欄，先 A 再 B，再選項/動作，摘要和結果依 A-only、B-only、共同、合併排列。每個結果區有標題、項目數、只屬於該區的複製鈕與完整可選文字。320px 無整頁橫向捲動。

每個文字區有可見標籤、上限提示和目前字元/行數狀態。錯誤文字同時指出 A/B 和列號，不回顯過長個資。提交後 focus 第一個有錯誤的欄位；成功時用一次 polite 狀態播報摘要，不逐列播報。鍵盤順序與視覺順序一致。

### 繁體中文搜尋文案

Title：名單比對與合併：找出新增、移除與共同項目 | GlossQuote
Description：貼上兩份一行一筆的名單，在瀏覽器本機找出 A 獨有、B 獨有、共同項目與去重合併結果。可選前後空白與大小寫規則，不需上傳或建立帳號。
H1：名單比對與合併
Intro：貼上兩份清單，快速知道哪些新增、哪些移除、哪些兩邊都有。

### English search copy

Title: Compare and Merge Lists: Find Added and Shared Items | GlossQuote
Description: Paste two line-separated lists to find items unique to each side, shared items, and a stable merged list locally in your browser. Choose trimming and case rules; no upload or account is needed.
H1: Compare and merge lists
Intro: Paste two lists to see what is new, what is missing, what they share, and a de-duplicated merge.

## 可見 FAQ

繁中至少呈現以下四題與完整答案；英文頁提供同義、完整翻譯的四題：
1. 是否逐行比較？不是；按每列項目是否在另一份名單中比較，順序不要求相同。
2. 什麼情況算相同？預設先去掉每列前後空白，再以大小寫敏感方式比對；關閉 trim 會保留外側空白。開啟忽略大小寫後使用小寫鍵，不做拼字或 Unicode 正規化。
3. 同一側重複會怎樣？結果只保留首次項目，統計重複列，顯示首次行號。
4. 名單會上傳或保存嗎？設計為只在此頁記憶體計算；離頁/重載即清除，不會保存草稿。
5. 空結果代表失敗嗎？不是；兩側都合法而某類結果為零時，會顯示「沒有符合項目」。

## 發布 SEO 契約

預覽每個 HTML 使用 noindex,nofollow，preview robots.txt 禁止索引。只在 M2 production build 才固定 canonical：
繁中 https://lists.glossquote.com/index.html；英文 https://lists.glossquote.com/en/index.html。兩頁互設 zh-Hant/en hreflang 並以中文頁作 x-default；html lang 正確，title/description/OG URL 相符。每頁可有準確的 WebApplication JSON-LD，名稱、語言、固定網址、UtilitiesApplication 和 Web 作業系統必須與可見頁面一致，不加入評分、價格、評價或虛構使用數。FAQ 結構化資料不得承諾搜尋結果會顯示 rich result。robots、sitemap、headers、404 由 docs/RELEASE.md 限定。

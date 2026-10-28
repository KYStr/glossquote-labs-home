# 兩份表格對帳

**English:** Reconcile two tables  
**狀態：** 產品規格，尚未實作。

## 你要完成的工作

會計助理或營運同時拿到兩份系統匯出 CSV，需要知道哪些列一致、只出現在一邊，或同一編號的資料已不同。這個工具讓你指定唯一鍵和要比較的欄位，最後得到可閱讀報告及完整差異 JSON。

MVP 一句話：在本機把兩份有標題列的 CSV 以最多三欄唯一鍵逐列對齊，明確呈現四種結果，不替你猜數字或日期的等價寫法。

## 為什麼有用

它解決的是「兩份清單如何逐列核對」這整段工作：欄位配對、複合鍵、重複鍵拒絕、四類差異和可交接的結果。它不只是排序或算總數，也不把 `001` 和 `1` 擅自當成同一個值。

## 環境與難度

一般桌面瀏覽器、Node.js 24+ 作為開發／測試工具；正式候選版是靜態 HTML/CSS/瀏覽器 ESM，無 runtime 套件、帳戶、API 或上傳。預估中高難度：嚴格 CSV quoting、雙邊欄位映射和可稽核差異是核心。

## 不包含

- 不讀 Excel 工作簿、TSV、資料庫或雲端試算表。
- 不推斷日期、貨幣、數字、大小寫或 Unicode 正規化等價。
- 不猜重複鍵如何配對、不修正來源、不儲存歷史、不輸出會執行的 HTML。
- 不取代會計、稅務或帳務判斷。

## 閱讀順序

先看 [產品需求](PRODUCT.md)，再看 [技術契約](TECHNICAL.md)、[介面與搜尋資料](UX-SEO.md)、[驗收 oracle](ACCEPTANCE.md) 及 [實作順序](TASKS.md)。共用規則見 `docs/BRAND.md`、`docs/ENGINEERING.md`、`docs/PRIVACY-SECURITY.md`、`docs/DESIGN-SYSTEM.md`。

English summary: Compare two local CSV exports by an explicitly selected unique key. Review matching, left-only, right-only, and changed rows; export a readable report and JSON. Values remain strings, and ambiguous keys stop the run.

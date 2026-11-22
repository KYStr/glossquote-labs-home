# HTTP 狀態碼查詢 / HTTP Status Lookup — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-http-status-lookup-20261121`

開發者在瀏覽器開發者工具、伺服器日誌或 API 回應中看到一個三位數 HTTP 狀態碼（例如 `404`、`502`），想立刻知道它屬於哪一類、官方名稱是什麼、中文意思是什麼、常見成因與該怎麼處理，而不需要連上網路查文件。

MVP 範圍。輸入一個 100–599 的狀態碼，輸出分類、官方名稱、中文說明、常見成因與處理建議；另附完整的 64 列狀態碼對照表瀏覽。非目標為實際發送 HTTP 請求、檢查某個網址的即時狀態、重試排程、解釋請求／回應標頭、或把結果當成任何伺服器的即時健康狀態。

首個可觀察案例。`404` 的完整說明（`code-404-not-found`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/http-status-lookup/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/6920196a/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

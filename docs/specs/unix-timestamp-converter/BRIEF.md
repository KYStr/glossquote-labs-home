# Unix 時間戳轉換 / Unix Timestamp Converter — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-unix-timestamp-converter-20261121`

開發者在日誌或 API 回應裡拿到 `1700000000` 這樣的數字，想知道它是哪一天幾點；反過來，手上有日期時間，想得到對應的時間戳拿去查 API。

MVP 範圍。時間戳（秒／毫秒）↔ 日期時間雙向轉換，固定顯示 UTC 與 Asia/Taipei，另加一個自選時區；ISO 8601、RFC 2822、自訂格式三種輸出；秒／毫秒自動判別、負時間戳、閏秒拒絕、DST 缺失／重疊處理。非目標為日期差計算、倒數日數、時區對時區換算、cron 排程、相對時間、曆法換算。

首個可觀察案例。時間戳 0 → 1970-01-01 UTC 與台北 08:00（`epoch-zero`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/unix-timestamp-converter/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/6263e103/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

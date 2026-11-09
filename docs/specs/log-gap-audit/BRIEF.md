# 記錄序號與時間缺口檢查 / Log Sequence and Time Gap Audit — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-log-gap-audit-20261109`

維運人員從測試資料匯出一段序號和相對毫秒，要分清哪兩行間缺序號、時間倒退、或間隔超過檢查門檻。

MVP 範圍。同一資料流、原始順序的相鄰記錄比較，使用者自備序號與同原點 elapsed ms。不合併來源、不判斷事件是否真的遺失、不自動排序、不解析 ISO 日期、時區、遠端 log 或監控警報。

首個可觀察案例。同一對同時有序號與時間缺口（`both-gaps`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/log-gap-audit/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

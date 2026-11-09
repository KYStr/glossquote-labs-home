# 重試時間預算試算 / Retry Time Budget Planner — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-retry-budget-20261109`

工程師調整批次任務的 retry timeout 時，先在假設每次都耗完整 timeout 的條件下，確認可在時間預算內完成幾次、何時第一次超界。

MVP 範圍。固定 timeout、有限整數毫秒、序列重試的上界模型。非目標為啟動重試、排程、並行、隨機 jitter、HTTP Retry-After、觀察真實延遲、把結果當 SDK 認證。

首個可觀察案例。延遲上限與第一次超界（`bounded-exponential`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/retry-budget/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

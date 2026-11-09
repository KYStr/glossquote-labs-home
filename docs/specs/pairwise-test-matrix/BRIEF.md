# 兩兩覆蓋測試矩陣 / Pairwise Test Matrix — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-pairwise-test-matrix-20261109`

測試工程師有幾個有限選項，需先挑一份能覆蓋任兩維選項配對的測試清單。成功是每個配對都有一個具體案例，且知道這份清單不證明更高階組合已測。

MVP 範圍。2–5 個維度的完整無約束組合，使用確定性 greedy 取兩兩覆蓋。匯出真實案例與覆蓋數。不做約束滿足、3-way、最少案例數證明、測試執行、自動建立帳戶或壓力測試。

首個可觀察案例。三個二值維度有 12 個配對，四例全覆蓋（`binary-triple`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/pairwise-test-matrix/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

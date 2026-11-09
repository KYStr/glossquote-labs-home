# 數值區間覆蓋檢查 / Numeric Range Coverage Audit — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-range-coverage-audit-20261109`

資料工程師在切分資料處理責任、掃描門檻或連續索引區段前，想核對整個定義域內有沒有漏段或重複工作，並指回原列。

MVP 範圍。同一單位的有限十進數半開 [lo,hi) 區段。輸出域內的整段覆蓋、缺口、交疊及來源，不做離散含端點計數、PDF 頁面、時間日曆轉換、估計曲線或擅自裁切越界段。

首個可觀察案例。同時有一個重疊及一個空段（`gap-and-overlap`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/range-coverage-audit/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

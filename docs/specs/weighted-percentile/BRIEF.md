# 頻次加權百分位查詢 / Frequency-weighted Percentile — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-weighted-percentile-20261109`

營運或品質工程師已有「觀測值和出現次數」彙總，不想展開上百萬筆來核對分位數。成功是讀出所查百分位、權重秩及決定結果的來源列。

MVP 範圍。使用者提供離散觀測值、正整數頻次和一個百分位。採明示的 nearest-rank 產品規則，不支援插值、連續加權、觀測資料查詢、統計顯著性、原資料展開或自動報告推論。

首個可觀察案例。邊界上選到累計剛好達秩的值（`weighted-tie`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/weighted-percentile/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

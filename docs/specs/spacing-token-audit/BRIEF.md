# 設計間距 Token 對照 / Design Spacing Token Audit — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-spacing-token-audit-20261109`

設計或前端同事拿到版面標註值，想知道每筆量測最接近哪個設計間距 token，並交付超出可接受偏差的列。

MVP 範圍。兩份使用者提供的名稱與 px 表，數值近鄰與偏差分級。排除擷取設計工具資料、讀 CSS、套用樣式、換 rem 或百分比、猜規格或建構設計系統。

首個可觀察案例。等距取小，剛好等門檻仍 within（`tie-and-threshold`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/spacing-token-audit/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

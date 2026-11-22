# 50/30/20 預算分配 / 50-30-20 Budget Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-50-30-20-budget-calculator-20261121`

領薪水的人在發薪日對著稅後月收入，想知道房租、伙食、交通這些必要開銷、吃喝玩樂的想要開銷、存錢與多還的債，各該留多少，才不會月底透支、年底也沒存到錢。

MVP 範圍。輸入稅後月收入，按需求 50%、想要 30%、儲蓄／還債 20% 分配（比例可自訂，合計須為 100），輸出每類每月與每年金額；可填實際支出，對照目標顯示差異。比例來源為 Elizabeth Warren 與 Amelia Warren Tyagi《All Your Worth: The Ultimate Lifetime Money Plan》（2005）。非目標為記帳、銀行同步、報稅或稅額計算、投資建議、逐筆債務清償排程、退休提領試算。

首個可觀察案例。預設 50/30/20 分配（`default-split`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/50-30-20-budget-calculator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/90a4e0cb5be8d0f18358e33e013c04428bbd0bad/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

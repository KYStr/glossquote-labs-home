# 退休提領試算 / Retirement Withdrawal Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-retirement-withdrawal-calculator-20261121`

準備退休的人輸入投資組合價值與每年提領額，加上報酬率與通膨率假設，先算出這筆錢能撐幾年；再用 4% 法則模式，以年支出 ×25 算出目標組合，對照現有組合看短少多少、隱含提領率是否超過 4%。

MVP 範圍。耗盡模式：固定年報酬率與年通膨率下的逐年提領模擬，提領在年初、餘額再計報酬，提領額自第 2 年起隨通膨成長，上限 100 年。4% 法則模式：年支出 ×25 為目標組合，另可填現有組合算隱含提領率與短少額。非目標為實際市場報酬預測、稅費、手續費、提領策略建議（例如動態提領、桶子策略）、年金或勞保勞退給付試算、把結果當投資或退休建議。

首個可觀察案例。無報酬無通膨的線性耗盡（`linear-no-growth`：組合 1,000,000、年提領 50,000 → 整整 20.00 年）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/retirement-withdrawal-calculator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

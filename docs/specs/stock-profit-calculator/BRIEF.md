# 股票損益計算 / Stock Profit Calculator — BRIEF

**文件維護候選，待獨立審查，產品檢查 NOT_RUN** · `spec-stock-profit-calculator-20261109`

台股投資人可在估算交易成本或對帳時，把一筆買進、賣出的手續費（費率 × 折讓、每筆最低費）、賣出證交稅逐項算清，得到淨損益、報酬率與按分搜尋的理論保本賣出價。理論價不可直接作為委託報價。

MVP 範圍為單一買進與單一（可部分）賣出的現股模型。價格、股／張數量、手續費率、折讓、最低費與標準模式稅率均可編輯。手續費 0.1425% 與最低費 NT$20 是示例預設，標準股票證交稅預設 0.3%。當沖模式要求買賣均為整批 1000 股且由使用者明確確認適格，才以 0.15% 試算匹配的賣出量，現行期限至 2027-12-31。金額以兩位小數字串保留精度。非目標為多筆平均成本、融資融券、股利除權息、即時行情、帳戶連結、委託報價與投資建議。

首個可觀察案例。整股獲利與手續費 .5 元尾數的四捨五入（`round-lot-profit`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/stock-profit-calculator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

# 股票損益計算 / Stock Profit Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-stock-profit-calculator-20261109`

台股投資人想在下單前或對帳時，把一筆買進、賣出的手續費（費率 × 折讓、每筆最低費）、賣出證交稅逐項算清，得到淨損益、報酬率與損益兩平賣出價，而不是只看券商 App 的單一數字。

MVP 範圍。單一買進與單一（可部分）賣出的現股模型；價格、股／張數量、手續費率、折讓、最低費、證交稅率皆為可改輸入，預設為查證的現行台股參數（手續費 0.1425%、最低費 NT$20 為券商慣例、股票證交稅 0.3%、現股當沖 0.15% 至 2027-12-31）。非目標為多筆平均成本、融資融券、股利除權息、即時行情、帳戶連結與投資建議。

首個可觀察案例。整股獲利與手續費 .5 元尾數的四捨五入（`round-lot-profit`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/stock-profit-calculator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

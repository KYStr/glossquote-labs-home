# 接案費率試算 / Freelance Rate Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-freelance-rate-calculator-20261121`

自由工作者從目標年收入出發，計入可計費使用率與間接成本，算出應報的時薪與日薪，不再憑感覺開價。

MVP 範圍。目標年收入、年工作天數、每日工時、可計費使用率、間接成本五個輸入 → 時薪、日薪、月均目標、計費天數／時數的確定性試算。非目標為報稅、勞健保、發票開立、合約議價、客戶管理、匯率換算、把結果當報價承諾。

首個可觀察案例。標準試算（`standard-rate`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/freelance-rate-calculator/`，固定分支與 PR 交驗。

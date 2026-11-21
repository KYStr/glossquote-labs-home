# 採買預算試算 / Grocery Budget Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-grocery-budget-calculator-20261121`

一家人在每月採買前，先按家裡實際人口組成（成人／各年齡層孩童），對照美國農業部（USDA）公布的食物計畫表，算出這一戶每週與每月在家做飯的食物預算。

MVP 範圍。固定一期 USDA 食物計畫表（2026 年 10 月版）、Thrifty／Low-cost 兩種計畫、15 組年齡／性別、USDA 戶人數調整因子；輸出每週與每月總額、每人平均與分攤明細。非目標為即時物價查詢、外食／外送、個人飲食偏好或營養建議、阿拉斯加／夏威夷價格、Moderate-cost／Liberal 計畫、記帳、把結果當 SNAP 補助核定金額。

首個可觀察案例。USDA 參照四口之家，Thrifty 計畫（`reference-family-thrifty`）：每週 236.50 美元與 USDA 公布值逐字相符。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/grocery-budget-calculator/`，固定分支與 PR 交驗。

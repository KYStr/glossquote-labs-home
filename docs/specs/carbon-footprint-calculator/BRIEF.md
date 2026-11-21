# 碳足跡計算 / Carbon Footprint Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-carbon-footprint-calculator-20261121`

家戶使用者輸入每月用電、開車里程與油耗、大眾運輸里程、飛行里程與每週飲食量，以釘版的官方排放係數估算一年碳足跡（公斤 CO2e），並看到六大類別的拆解與占比。

MVP 範圍。年度估算：用電、開車／騎車（汽油／柴油）、公車、捷運／鐵路、短程與長程飛行、六項飲食。非目標為正式碳盤查或查證、即時電價或票價查詢、減碳建議的個人化追蹤、帳號或資料儲存、即時排放監測。

首個可觀察案例。典型家戶全年估算（`typical-household`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/carbon-footprint-calculator/`，固定分支與 PR 交驗。

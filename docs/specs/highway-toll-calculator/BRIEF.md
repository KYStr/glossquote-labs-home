# 國道通行費試算 / Highway Toll Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-highway-toll-calculator-20261121`

駕駛人出發前想知道這趟國道要繳多少通行費：輸入里程（或選上下交流道），依台灣 ETC 計程收費規則試算應繳金額，含每日 20 公里優惠、超過 200 公里長途 75 折、車種費率與 eTag 9 折。

MVP 範圍。直接輸入里程、國道 1 號上下交流道查表里程、三種車種費率、每日 20 公里優惠、200 公里以上長途折扣、eTag 9 折切換、今日已行駛里程（每日歸戶）、四捨五入到元、明細與報告下載。非目標為連續假期單一費率、實際門架牌價逐段加總、繳費或帳單查詢、行車時間。

首個可觀察案例。上下交流道查表里程、標準費率（`pair-taipei-taichung`：台北至台中 153.5 公里，小型車 160 元）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/highway-toll-calculator/`，固定分支與 PR 交驗。

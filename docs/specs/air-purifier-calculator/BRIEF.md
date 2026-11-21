# 空氣清淨機選型試算 / Air Purifier Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-air-purifier-calculator-20261121`

要買（或已經買了）空氣清淨機的人，先量好房間面積與天花板高度，依 AHAM 規則算出該房間需要的煙霧 CADR 下限、換算成立方公尺／小時，並對照 AHAM 建議適用面積，確認手邊那台夠不夠用，而不是只看盒子上誇大的「適用坪數」。

MVP 範圍。房間面積（m²／坪）→ 所需煙霧 CADR（CFM 與 m³/h）＋ AHAM 建議適用面積；選填目標換氣率（ACH，預設 5.0）與自有清淨機煙霧 CADR 的夠用檢查。非目標為即時空氣品質量測、污染物建議、噪音／耗電／濾網成本、即時商品資料庫或比價、醫療建議。

首個可觀察案例。標準臥室 15 m²、預設 ACH 5.0（`standard-bedroom`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/air-purifier-calculator/`，固定分支與 PR 交驗。

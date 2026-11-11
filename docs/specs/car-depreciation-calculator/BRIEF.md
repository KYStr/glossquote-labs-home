# 車輛折舊計算 / Car Depreciation Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-car-depreciation-calculator-20261109`

想買二手車或賣車的人，手上只有新車購入價和車齡，想先粗估這台車現在大概還值多少、每年掉了多少錢，再去對照行情。輸入購入價、年數與殘值下限，選三種常見折舊模型之一（定率遞減、直線、逐年費率表），得到目前估值、累計折舊與逐年明細表。結果是規劃用估算，不是鑑價；實際市值受車況、里程、事故紀錄與市場供需影響（介面常駐揭露）。

MVP 範圍。三種折舊模型、整數新臺幣、逐年表的長度由年數欄決定、殘值下限在三種模型都生效。非目標為即時行情查詢、二手車資料庫、依品牌／車型／里程／車況調整、貸款或稅務計算、把估值當正式鑑價或成交保證。

首個可觀察案例。定率遞減 15%、五年逐年鏈結捨入（`declining-basic`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/car-depreciation-calculator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

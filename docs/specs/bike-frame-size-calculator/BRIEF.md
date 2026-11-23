# 單車車架尺寸計算 / Bike Frame Size Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-bike-frame-size-calculator-20261121`

買車前只有身高與跨高（inseam）兩個數字時，先算出公路車／登山車／混合車的建議車架尺寸起點：中心值、建議範圍（公分與英吋對照）、對應尺碼字母與起始座墊高度，拿去對品牌尺寸表與實車試騎，而不是只給一個數字就叫人下單。

MVP 範圍。身高＋跨高 → 三種車型的 Guimard 系公式尺寸、±1 公分建議範圍、公分／英吋換算對照、身高對照尺碼字母、LeMond 起始座墊高度、跨高／身高比例異常提醒。非目標為專業 bike fitting、stack／reach 幾何、座墊／龍頭微調、童車輪徑選型、品牌即時庫存或售價查詢。

首個可觀察案例。典型公路車（`road-typical`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/bike-frame-size-calculator/`，固定分支與 PR 交驗。

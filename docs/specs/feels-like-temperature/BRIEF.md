# 體感溫度計算 / Feels-Like Temperature Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-feels-like-temperature-20261109`

出門或安排戶外活動前，手邊只有氣象預報的氣溫、風速與濕度，想知道身體實際感受到的溫度：冷天用風寒、熱天用熱指數，兩個模型各有官方定義域，定義域外就誠實回報實際氣溫。

MVP 範圍。兩個北美官方模型依定義域自動選用：風寒效應（Environment Canada／NWS 公式，T ≤ 10 °C 且風速 > 4.8 km/h）與熱指數（Rothfusz 迴歸＋兩項 NWS 調整，T ≥ 27 °C 且 RH ≥ 40%）；兩者皆不適用時回報實際氣溫並標示超出定義域。非目標為澳洲 apparent temperature、WBGT、即時天氣資料、醫療或安全建議。

首個可觀察案例。攝氏 −15 度、風速 20 km/h 的風寒（`wc-classic`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/feels-like-temperature/`，固定分支與 PR 交驗。

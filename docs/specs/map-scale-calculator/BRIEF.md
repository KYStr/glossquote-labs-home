# 地圖比例尺換算 / Map Scale Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-map-scale-calculator-20261121`

登山客拿著 1:25000 的等高線地圖，量到兩個山頭在圖上相距 4 公分，想知道實際要走多遠；反過來，知道營地離登山口實際 3.5 公里，也想知道在圖上是幾公分，好先用尺在圖上標出來。

MVP 範圍。比例尺分母 N（1:N）＋圖上距離（公分）→ 實際距離（公尺／公里）；反向：實際距離（公尺／公里）＋比例尺 → 圖上距離（公分）。常用比例尺對照表（1:1000、1:5000、1:10000、1:25000、1:50000、1:100000、1:200000）與單位換算規則釘版。非目標為路線規劃、海拔／坡度換算、經緯度或座標換算、實地測量、列印比例校正。

首個可觀察案例。正向 1:25000 圖上 4 公分（`forward-25000-basic`）與反向 1:25000 實際 3.5 公里（`inverse-25000-km`）：前者實際距離恰為 1000 公尺＝1 公里，後者圖上距離恰為 14 公分。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/map-scale-calculator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/90a4e0cb/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

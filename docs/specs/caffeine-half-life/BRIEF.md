# 咖啡因代謝計算機 / Caffeine Half-Life Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-caffeine-half-life-20261109`

上班族下午三點想再喝一杯手沖，手邊有今天每一杯的飲用時間與種類（早上 07:30 一杯濃縮、10:10 一杯手沖），卡在不知道晚上 23:30 上床時體內還剩多少咖啡因、這杯下午茶會不會害他睡不著。最後要拿到的是：某個查詢時間的總殘留毫克、逐筆明細、之後每小時的衰減數列，以及就寢時的殘留量。

MVP 範圍。1–8 筆攝取紀錄（時間＋飲品預設或自訂毫克）、半衰期 3–8 小時（預設 5）、單日時間模型下的指數衰減加總；輸出查詢時間殘留、逐筆殘留、+1h…+6h 數列與就寢讀數，毫克一律一位小數。非目標為吸收延遲模型、多日追蹤、睡眠品質預測、醫療建議、紀錄保存或分享。

首個可觀察案例。恰好一個半衰期後剩一半（`exact-half-life`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、build/check、同一候選的九面向證據。目標 `tools/caffeine-half-life/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

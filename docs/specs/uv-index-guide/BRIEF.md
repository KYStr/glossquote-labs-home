# 紫外線指數指南 / UV Index Guide — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-uv-index-guide-20261121`

出門前查到今天紫外線指數，馬上知道是哪一級、要不要防曬、擦多少係數的防曬乳、自己的膚質大概多久會曬紅。

MVP 範圍。輸入紫外線指數（0–20，至多一位小數）與 Fitzpatrick 膚質（I–VI，預設 III），對照 WHO／中央氣象署五級分級表輸出等級、顏色與防曬建議；曬紅時間為 MED 公式估計值，明確標示不是安全曝曬時間。非目標為即時預報查詢、定位、天氣資料、醫療診斷、個人化醫療建議。

首個可觀察案例。極高量級、II 型膚質（`very-high-type-II`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/uv-index-guide/`，固定分支與 PR 交驗。

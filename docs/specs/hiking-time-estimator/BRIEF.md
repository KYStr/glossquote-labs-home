# 登山時間預估 / Hiking Time Estimator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-hiking-time-estimator-20261121`

登山者出發前對著路線圖，只知道距離與爬升，想知道這趟路大概要走多久、會不會摸黑下山。

MVP 範圍。距離 km ＋ 爬升 m（＋選填下降 m 與下降類型），用 Naismith's rule（5 km/h ＋ 每爬升 600 m 加 1 小時）估算移動時間；下降調整採 Langmuir 修正（緩降每 300 m 減 10 分鐘、陡降每 300 m 加 10 分鐘），由使用者選下降類型，預設不調整。非目標為休息時間、體能／天氣／路況調整、即時定位、路線規劃、把預估當作保證。

首個可觀察案例。經典 Naismith 算例（`classic-naismith`）：12 km、爬升 600 m → 3 小時 24 分鐘。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/hiking-time-estimator/`，固定分支與 PR 交驗。run 6 規格作者簡報見本輪 `SPEC-AUTHOR-BRIEF.md` 概念第 5 條。

# 高鐵票價試算 / HSR Fare Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-hsr-fare-calculator-20261121`

旅客出發前想知道這趟高鐵要花多少：選出發站與到達站、車廂與票種，依台灣高鐵官方公告票價表試算單張與總票價，不用進訂票系統逐班查詢。

MVP 範圍。12 個車站兩兩配對（66 組區間）的標準車廂對號座、商務車廂、自由座全票查表票價；敬老／愛心／兒童優待票 5 折、早鳥 65／8／9 折、大學生 5／75／88 折，皆以「向下取至 5 元」規則由全票算出；張數 1–10 張的總價；顯示區間里程與南下／北上方向。非目標為即時查詢、訂位、早鳥／大學生指定車次與剩餘名額、回數票／定期票／團體票／周遊券、退票與改票手續費、行車時間。

首個可觀察案例。台北至左營標準車廂對號座全票（`taipei-zuoying-standard-full`：1,490 元）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/hsr-fare-calculator/`，固定分支與 PR 交驗。 [本輪規格作者簡報](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/docs/SPECIFICATION-STOCK.md)

# 搬家紙箱估算 / Moving Box Estimator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-moving-box-estimator-20261109`

月底要搬家的租屋族坐在沙發上用手機逛網購平台，準備一次下單紙箱和耗材。手上只有自己住的戶型（套房到四房）和幾個生活習慣的印象（書很多、廚房大、住了五年以上……），卡在不知道總共要買幾箱、小／中／大各幾箱、膠帶和包裝紙要幾捲：買多浪費、買少搬到一半還要再跑一趟。本工具用戶型基準表加至多五個加量開關，給出可直接照著下單的尺寸別箱數與耗材捲數，並明示這是依一般家庭物品量推估的參考值。

MVP 範圍。五種戶型的固定基準箱數、三種尺寸的固定比例拆分、五個布林加量開關（含一個 +20% 住久上調）、膠帶與包裝紙的每 10 箱啟發式。非目標為記錄每箱裝了什麼或箱子位置（那是既有 `spec-55-moving-boxes` 搬家裝箱與物品定位的範圍）、估搬家車趟數或搬家費用、家具拆裝與特殊物品（鋼琴、魚缸）估算、提供購買連結或比價、儲存或上傳任何輸入。

首個可觀察案例。套房、所有開關關閉的基準拆分（`studio-plain`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/moving-box-estimator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

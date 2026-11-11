# 步數換算 / Steps Converter — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-steps-converter-20261109`

手上有手機或計步器步數的人，想把步數換成大概走了多遠：步幅可由身高推估（×0.414），也可輸入自己量過的步幅；可選擇加開體重，估算這段步行的總熱量（0.75 kcal/kg/km，標明為估算）。

MVP 範圍。一筆步數換算、兩種步幅來源、可選熱量，精確有理數計算，每個輸出只捨入一次。非目標為偵測步數、GPS、跑步、坡度修正、歷史紀錄與醫療建議。

係數已查證：0.414 為 ACSM 迴歸的通用步幅係數（性別值 0.413–0.415 一併揭露）；0.75 為總消耗，Compendium MET 推得的一般步速範圍約 0.73–0.77，淨消耗約 0.5 亦揭露。查證與取捨見 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)。

首個可觀察案例。身高推估基本換算（`height-basic`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/steps-converter/`，固定分支與 PR 交驗。

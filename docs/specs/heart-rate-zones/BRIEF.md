# 心率區間計算機 / Heart Rate Zones Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-heart-rate-zones-20261109`

跑者在健身房用手機打開手錶的訓練設定，手邊有自己的年齡和手錶量到的晨間靜止心率，想把五個心率區間的 bpm 上下限填進手錶；但手錶只給百分比、各家網站的最大心率公式又不一致（Fox 與 Tanaka 算出不同數字），不知道該用哪個最大心率、每區到底是幾到幾 bpm。輸入年齡（或實測最大心率）與靜止心率後，拿到以 Tanaka 公式為準的五個 %HRmax 區間表，外加用靜止心率算的 Karvonen 儲備心率區間表，兩張表都給整數 bpm 上下限，可直接照填。

MVP 範圍。單人、單次計算：年齡 → Fox 與 Tanaka 兩種最大心率估算（Tanaka 為區間計算基準），可填實測最大心率覆蓋估算；五區 %HRmax 表（50–60／60–70／70–80／80–90／90–100%）；有靜止心率時加 Karvonen %HRR 表。非目標為連接手錶或心率帶、記錄或追蹤訓練、即時心率顯示、訓練課表建議、醫療診斷或用藥建議。

首個可觀察案例。年齡 35 歲、Tanaka 結果帶小數（`tanaka-fractional`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、build/check、同一候選的九面向證據。目標 `tools/heart-rate-zones/`，固定分支與 PR 交驗。

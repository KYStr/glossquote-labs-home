# 電池續航計算 / Battery Runtime Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-battery-runtime-calculator-20261109`

使用者手上只有電池的額定規格（容量 mAh 或 Wh、電壓）和裝置瓦數，想在購買或出門前先算清能撐多久，或反過來算出需要多大的電池。

MVP 範圍。四種模式：以 mAh＋電壓算續航、以 Wh 直接算續航、由目標續航＋負載反推所需容量、串／並聯電池組組合後算續航；放電深度單一係數（預設 100%）；精確有理數運算、只在輸出捨入一次；負載 0 W 為 infinite 狀態而非錯誤。非目標為 Peukert 效應、以電流（A）輸入負載、轉換損耗獨立參數、充電與電池健康估算、即時監測或裝置控制、把結果當選購或安全認證。

首個可觀察案例。手機電池 10000 mAh / 3.7 V 供 10 W 負載，總電量 37 Wh、續航 3.7 小時（3 小時 42 分）（`phone-basic`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/battery-runtime-calculator/`，固定分支與 PR 交驗。

# 壽險保額試算 / Life Insurance Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-life-insurance-calculator-20261121`

有扶養責任的家庭成員想知道：萬一自己收入中斷，家人需要多少壽險保額才夠。以需求法（needs approach）加總收入替代、房貸、其他負債、喪葬費用與扶養人教育費用，再扣掉現有保障與可動用資產，得到建議保額；同時以 LIMRA 10 倍年收入法則作為對照值。結果明示為教育試算，不構成保險建議。

MVP 範圍。以需求法為主算法，10 倍年收入法則只作對照、不參與建議保額。非目標為保費報價、商品比較或推薦、核保、通膨或投資報酬折現、稅務計算、把結果當保險建議或招攬。

首個可觀察案例。典型雙扶養家庭（`typical-family`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/life-insurance-calculator/`，固定分支與 PR 交驗。

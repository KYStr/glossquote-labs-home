# 腰高比計算機 / Waist-to-Height Ratio Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-waist-height-ratio-calculator-20261121`

使用者量了腰圍與身高，想知道腰圍是不是不到身高的一半：腰圍除以身高得到腰高比（WHtR），對照 NICE 2022 分級（0.4 / 0.5 / 0.6）判斷屬於健康、增加或高中心肥胖，並算出維持腰圍不到身高一半還差幾公分。

MVP 範圍。兩個公分輸入、一個比值、四級分級、健康腰圍區間與達標差值。非目標為體重指標（BMI）、體脂率估算、追蹤紀錄、飲食或運動建議、醫療診斷。

首個可觀察案例。恰好等於一半（`exactly-half`）與差一點不到一半（`just-below-half`）：顯示值同為 0.50，分級卻不同。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/waist-height-ratio-calculator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/c8ca5fd3/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

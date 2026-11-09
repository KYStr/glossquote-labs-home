# 三大營養素分配計算機 / Macro Split Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-macro-split-calculator-20261109`

開始記錄飲食的上班族，教練給了他每日 2,000 kcal 的熱量目標，他想照均衡比例吃，卻卡在把百分比換成蛋白質、碳水、脂肪的克數，還有取整數克之後熱量對不回目標、三餐各分多少也沒概念。他在手機或桌機上輸入熱量目標與想用的飲食比例（均衡、高蛋白、低碳、生酮或自訂），得到每種營養素的克數、由克數回算的熱量與目標差，以及可選的每餐分配。

MVP 範圍。熱量目標由使用者給定（800–10,000 kcal），四種固定預設比例與總和須恰為 100 的自訂比例，以 4/4/9 kcal/g 換算克數，捨入漂移由最大營養素按固定規則吸收，殘差明示；可選 1–6 餐分配。非目標為計算熱量目標本身、依體重以 g/kg 推蛋白質、食物資料庫、餐點建議、醫療或營養處方、飲食記錄與追蹤。

首個可觀察案例。均衡預設的漂移吸收（`balanced-2000`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/macro-split-calculator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

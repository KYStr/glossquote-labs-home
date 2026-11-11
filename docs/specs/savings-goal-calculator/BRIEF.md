# 儲蓄尾款與達標月份 / Savings goal plan upgrade — BRIEF

**既有工具升級提案（existing-tool-upgrade），產品檢查 NOT_RUN** · `spec-savings-goal-calculator-20261109`

已定每月存款金額的人，要知道最早幾個月達標、最後一個月需要存多少，以及存完後的期末餘額。本提案為既有複利工具補上尾款計畫與 1,200 個月的達標搜尋上限。

既有 compound-interest-calculator 已有「每月需存」與「幾個月達標」兩種反算，採每月將利息捨入到分的入帳模型。升級提案採精確有理數，月間保留未捨入利息，月底存款，只有付款指示和輸出餘額按分處理。初始 0.01、目標 0.02、年率 12%、月存 0 時，提案第 70 月達標，逐月捨入模型則無法成長。 [既有規格 #44](https://github.com/KYStr/glossquote-labs-home/blob/5a9acc11b5b23200c3d4cda32adaafbbd389532e/docs/specs/compound-interest-calculator/SPEC.md) · [既有候選 #80](https://github.com/KYStr/glossquote-labs-home/blob/e42ebf56853ad8e46964ea8fc1ebf9623c6c2bb1/tools/compound-interest-calculator/public/en/index.html#L33-L34)

提案的模式 B 由目標、目前存款、年率與固定月存金額得到首次達標月、最少的整分尾款、實際照計畫存款的期末餘額，以及存全額時的期末餘額。輸入目標單獨列示。無法成長與 1,200 個月內未達標各有一種狀態。原模式 A 公式及 fixtures 作為模型回歸參考。

例如初始 5000、目標 20000、年率 6%、月存 300，提案第 42 月首次達標，最後一月存 152.88，期末餘額 20000.01。 [字面案例](fixtures.json) · [精確規則](SPEC.md)

本輪交付文件與 fixtures。既有產品如何呈現兩種計息模型，由後續產品整合任務決定。 [固定維護裁決](https://github.com/KYStr/glossquote-labs-home/blob/418aee70f60a04cbe19e339597c91a056bcad0c4/docs/reviews/five-hour-2026-11-11/dispatch/repair-savings/TASK.md)

# 血壓分級 / Blood Pressure Checker — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-blood-pressure-checker-20261121`

使用者量完血壓後，輸入收縮壓與舒張壓，對照 AHA/ACC 2017 分級表，立即知道這次量測落在哪一級，並看到對應的一般性提醒與免責聲明。

MVP 範圍。兩個整數輸入（mmHg）、五級分級（正常／偏高／第一期／第二期／高血壓危象）、每級一般性提醒、釘版免責聲明、報告下載。非目標為醫療診斷、治療建議、用藥指導、長期追蹤記錄、與穿戴裝置或血壓計連線、以及把結果當作就醫依據。

首個可觀察案例。典型正常血壓（`normal-typical`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/blood-pressure-checker/`，固定分支與 PR 交驗。本批原始說明為 run 6 規格作者簡報（`SPEC-AUTHOR-BRIEF.md`，概念第 2 條）。

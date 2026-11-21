# 膽固醇分級 / Cholesterol Checker — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-cholesterol-checker-20261121`

使用者拿到健檢報告上的血脂四項數值（總膽固醇、LDL、HDL、三酸甘油脂，mg/dL），想立刻知道每一項落在 NCEP ATP III 的哪一個分級，以及整體是否需要注意——不做診斷、不給治療建議，只做分級對照。

MVP 範圍。四個整數欄位（mg/dL），依釘版 NCEP ATP III 分級表逐項分級，附非 HDL 膽固醇（總膽固醇 − HDL，僅供參考，不分級）與整體摘要，聲明「僅供參考、非醫療建議」以釘版原文顯示。非目標為 mmol/L 換算、性別區分、風險評分（如 Framingham／ASCVD）、用藥或飲食建議、診斷。

首個可觀察案例。全部理想（`all-desirable`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/cholesterol-checker/`，固定分支與 PR 交驗。

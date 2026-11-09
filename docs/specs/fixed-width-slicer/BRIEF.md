# 固定位元組欄位拆解 / Fixed-width Record Slicer — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-fixed-width-slicer-20261109`

資料移轉人員手上有以 UTF-8 byte 長度定義的固定寬文字記錄，要在轉入表格前確認欄界有沒有截斷中文字，以及哪些列長度不同。

MVP 範圍。一份 LF 分行的 Unicode 文字與一份以 UTF-8 bytes 定義的欄寬，逐列切出原字並定位不合法切點。不做 CSV、顯示寬度估算、UTF-16 欄寬、Big5、補空白、改寫檔案或猜測欄寬。

首個可觀察案例。位元組切界保留空格和多位元字（`mixed-script`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/fixed-width-slicer/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

# SemVer 版本順位比較 / SemVer Precedence Comparison — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-semver-precedence-20261109`

工程師面對兩個發布版本及 prerelease 標籤時，需要核對哪個順位在先、差異出在哪一個識別符。

MVP 範圍。SemVer 2.0.0 單一版本對的文法及順位解釋。排除 v 前綴、範圍語法、npm 依賴解析、實際相容性推定、發行時間查詢、套件安裝、版本遞增和依賴更新。

首個可觀察案例。數字 token 比數值（`numeric-prerelease`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/semver-precedence/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

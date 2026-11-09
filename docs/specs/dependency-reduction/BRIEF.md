# 模組依賴冗餘檢查 / Module Dependency Reduction — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-dependency-reduction-20261109`

工程師維護少量 build modules 時，要看哪一條直接依賴已有間接路徑可覆蓋，並找到阻止任何排序的循環。

MVP 範圍。有限有向圖，檢查循環、產生依賴層與冗餘邊 witness。非目標為執行建置、修改配置、掃描 repo、解套件版本、日期排程、估時或宣稱可安全刪掉有其他業務含義的邊。

首個可觀察案例。兩條同長替代路，依 ASCII 排序取 B（`alternate-witness`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/dependency-reduction/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

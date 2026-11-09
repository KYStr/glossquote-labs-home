# 封存成員路徑預檢 / Archive Member Path Preflight — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-archive-path-preflight-20261109`

發布工程師準備把一組相對檔名交給打包流程，先找路徑逃逸、保守跨平台命名衝突，以及檔案占用了其他成員的祖先目錄。

MVP 範圍。只檢查使用者貼入的 manifest、ASCII 保守可攜政策及字串樹。排除讀取壓縮檔、解壓／打包、掃本機、改名、處理 symlink、讀 permission、驗內容或宣稱可在任意 OS 安全解壓。

首個可觀察案例。明示目錄和自己的後代可共存（`normal-tree`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/archive-path-preflight/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

# 單檔文字補丁預檢 / Single-file Unified Patch Check — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-unified-patch-check-20261109`

維護者拿到一段 unified diff，手上的原始文字可能已更新。先核對補丁是否能在明示行位精確套用，取用結果或定位第一處不一致。

MVP 範圍。一份來源與一段單檔文字 unified diff 的保守子集。只比對指定位置，不搜尋其他位置、不以空白近似、不改原檔、不執行 Git 或 shell、不讀 Git metadata、多檔、binary、rename、/dev/null 或 no-newline marker。

首個可觀察案例。逐行 context 和替換（`context-replace`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/unified-patch-check/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

# Markdown 章節連結檢查 / Markdown Section Link Audit — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-markdown-anchor-audit-20261109`

README 維護者調整章節名後，核對文件開頭的手寫目錄是否還指到同一文件的章節，以及哪幾個標題會衝突。

MVP 範圍。明示的窄格式，只檢查 ASCII ATX 標題、獨立同頁連結或目錄清單項及 top-level 三反引號 code fence。排除渲染 HTML、跨檔／外部 URL、任意 Markdown 方言、Unicode heading 推測、custom anchors、重名自動編號和抓取網站。

首個可觀察案例。先見目錄再見標題（`forward-reference`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/markdown-anchor-audit/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

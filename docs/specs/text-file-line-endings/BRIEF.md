# 文字檔換行與 BOM 檢查 / Text File Line Ending Audit — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-text-file-line-endings-20261109`

文件維護者碰到混合 LF／CRLF 或 UTF-8 BOM 時，需要知道原檔有哪些位元組、哪些行終止符會被轉換。成功是原檔不變，能下載按明示規則轉換的副本及核對報告。

MVP 範圍。單一明確選取的 UTF-8 檔，依 raw bytes 盤點 CRLF、LF、CR 與首 BOM，選擇一致換行並保留或移除首 BOM。不接受貼上、非 UTF-8、目錄、上傳、替換原檔、偵測任意編碼。

首個可觀察案例。檔頭保留，混合 CRLF/CR/LF 轉 LF（`mixed-bom`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/text-file-line-endings/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

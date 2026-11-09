# 二進位記錄欄位檢視 / Binary Record Inspector — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-binary-record-inspector-20261109`

工程師拿到測試 fixture 的十六進位 dump 和欄位位置，需在寫解析器前驗證多個欄的 endian 和 signed 讀值。

MVP 範圍。一段 hex bytes 及固定偏移的多欄整數描述，可重疊檢查同一片段。非目標為任意檔案或網路封包擷取、浮點、varint、位元欄、浮點 endian、自動推測格式、解密或修改 bytes。

首個可觀察案例。共用前兩 bytes，比較不同 endian（`endian-and-sign`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/binary-record-inspector/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

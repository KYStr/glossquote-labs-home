# Unicode 鍵值碰撞檢查 / Unicode Key Collision Audit — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-unicode-key-collisions-20261109`

資料整理人員在匯入分類代碼前，要找出拼法不同、正規化後卻占用同一鍵值的列。成功是交給同事一份有原字、原列、碼點及規則的修正清單。

MVP 範圍。單欄資料的 NFC／NFKC 等價群、原字完全重複群及來源列。非目標為重寫來源、大小寫折疊、近似同形字辨識、通用清理、比對兩份翻譯、辨識真正的資料庫 collation。

首個可觀察案例。組合與預組碼點合併，重複列保留（`nfc-alias`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/unicode-key-collisions/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

# 表格候選鍵健檢 / Table Candidate Key Audit — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-candidate-key-audit-20261109`

資料工程或維運人員準備匯入一份表，先對照多種候選欄組，找出哪些有空值、重複鍵，以及哪些是測過的最小唯一欄組。

MVP 範圍。僅單表、使用者列出的候選欄組及目前資料的唯一／空值觀察。不做兩表 join／對帳、不掃描所有欄位子集、不改資料、不承諾新資料也唯一或產生 SQL。

首個可觀察案例。單欄重複，複合鍵有效且最小（`compare-keys`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/candidate-key-audit/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

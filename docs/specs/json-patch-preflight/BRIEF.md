# JSON Patch 離線預檢 / JSON Patch Preflight — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-json-patch-preflight-20261109`

工程師收到建議的 JSON 結構變更，先把測試用設定和 patch 放進預檢，確認每一步可套用並看最終內容，之後自行把結果帶回工作流程。

MVP 範圍。RFC 6901 字串 Pointer 與 RFC 6902 add／remove／replace／test 的受限子集。排除 move/copy、空字串根操作、片段 URI Pointer、浮點／指數、猜測修復、HTTP PATCH、檔案覆寫、呼叫 API、生成 patch 或使用真正的機密設定。

首個可觀察案例。陣列插入後再依新索引移除（`insert-and-remove`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/json-patch-preflight/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)

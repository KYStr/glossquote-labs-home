# PWP-03 Worker 建構失敗清理

[獨立審查 PR #328](https://github.com/KYStr/glossquote-labs-home/pull/328) 與主代理的離線重現指出，兩款工具的 Worker 建構同步拋錯時都會留下已建立的 Blob URL。正常單次終止原本有清理。前一個固定候選為 `6282481d8e1fccab72c0d38f1fc741d156d2944b`，其 [PWP-01／02 證據](REPAIR-02.md) 保留。

- 兩款的 `createWorker` 在建構失敗時撤銷該 URL，重新拋出原例外。既有控制器保留草稿及 `WORKER_ERROR` 狀態，下一次執行可用同一份草稿重試。
- 終止只呼叫平台一次，並在 `finally` 撤銷 URL。即使平台終止拋錯，重複呼叫仍不再終止或撤銷。
- 每款新增四項 Node 測試，涵蓋建構例外與 URL、正常重複終止、終止例外，以及接上實際控制器後的失敗和重試。舊程式兩款各重現四筆失敗。修正後壁紙 66 項、坪數 67 項全數通過。兩款 `check`、兩次 preview 建置逐檔比對、`check-generated`、生成 Worker 及 loopback HTTP 驗證均通過。
- 數學核心、fixtures 與前兩項修正維持原位元組。命令、退出碼及建置雜湊見 [repair-03-results.json](repair-03-results.json)。

真瀏覽器、真機、輔具、Network／Storage 及原生下載仍為 `NOT_RUN_USER_FOCUS_INCIDENT`，`requiredChecksComplete=false`。正式 SEO 與部署為 `NOT_RUN`，待主代理與原獨立 reviewer 複驗。

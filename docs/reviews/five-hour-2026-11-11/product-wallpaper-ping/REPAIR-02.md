# FH-PWP-REPAIR-02

修正 [PR #325](https://github.com/KYStr/glossquote-labs-home/pull/325) 的前一個固定候選 `8fbd9ac4d98865480444ce11c4b772389a54ea3c`。原來源遷入、規格及既有測試證據保留。前一版離線通過紀錄與這輪新重現的失敗屬不同證據。

- **PWP-01** 兩款的 Worker 回覆都要同時符合目前的工作世代、該次發送的世代，以及 busy 狀態。舊工作被替換或取消後，舊回覆先到時不會顯示結果、開放報告或終止新 Worker。只有正確的新回覆可結束本次工作。
- **PWP-02** 壁紙先驗完整鍵集合，再驗枚舉。已知模式必須符合自己的確切鍵集合。當模式字串未知，該組欄位仍必須構成一個完整且不混用的合法形狀，才由 ENUM 回報該模式。缺欄、多欄、錯型別、壞列仍在 SCHEMA 處理，保留壞列的列號。原數學規格與 fixtures 維持原位元組。
- 新增回歸在前一版程式重現五筆失敗，壁紙 3、坪數 2。修正後 Node v24.14.0 的壁紙 62 項、坪數 63 項測試全部通過。兩款靜態檢查、兩次 preview 建置逐檔比對、生成檔檢查，以及生成 Worker 和 loopback HTTP 驗證均通過。

從各產品根目錄執行 `node --test`、`node scripts/check.mjs`、`node scripts/build.mjs --mode preview` 兩次、`node scripts/check-generated.mjs --mode preview`。從 repository 根目錄執行 [Worker／預覽檢查](verify-worker-preview.mjs)。命令結果和輸出雜湊見 [repair-02-results.json](repair-02-results.json)。

真瀏覽器、真機、輔具、Network／Storage 與原生下載仍為 `NOT_RUN_USER_FOCUS_INCIDENT`，`requiredChecksComplete=false`。正式 SEO、部署均為 `NOT_RUN`。修正候選待主代理和原獨立 reviewer 複驗。

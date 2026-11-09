# FUNC-R3-01：百分比計算機 Worker 完成通知

候選維護工作 `labs-remaining-audit-repair-20261110`，基線來源 `328dee40ef0de631d7d50a443e5d5eb2e7668164`，規格 `8dcea8e38aa4647e617db6c10a2d3d7ec7db247d`。複製前後核對 22 份來源與 4 份規格的 SHA-256，均符合基線。結果與可重現輸出見 [source-scope.json](source-scope.json)、[source.diff](source.diff)。

成功、欄位驗證失敗、Worker `onerror` 和建構／傳送失敗皆經 `completeJob`。Controller 只接收忙碌中且 generation 符合的回傳，並以布林值回報是否接受；只有接受後才重繪一次。各 Worker 回呼另外核對該工作建立的 Worker 身分；正常訊息也核對當初送出的 generation。建構與傳送的同步例外延至微任務送出，保留提交處理器先顯示忙碌的順序；若已重設或開始新工作，原 generation 的失敗會被丟棄。純計算、報告、頁面與規格未變更。

在候選工具目錄、Windows Node v24.14.0 執行：

| 命令 | 退出碼／結果 | 記錄 |
| --- | --- | --- |
| `node --test test/app.test.mjs`，原產品程式、同一組新增整合測試 | 1，3 PASS／9 FAIL；重現卡在 Working、舊 Worker error 終止新 Worker | [baseline-app-tests.log](baseline-app-tests.log) |
| `npm.cmd run test` | 0，56 PASS（含 12 新增整合案例），0 FAIL／SKIP | [test.log](test.log) |
| `npm.cmd run check` | 0，靜態檢查通過 | [check.log](check.log) |
| `npm.cmd run build:preview` | 0，建置候選 | [build-preview.log](build-preview.log) |
| `npm.cmd run check:generated:preview` | 0，7 檔與重新建置逐位元相同 | [check-generated-preview.log](check-generated-preview.log) |

整合測試匯入 fresh build 的實際 `app.js`、Controller 與 core；控制 DOM 和 Worker 交付時機，檢查中英 30、欄位錯誤文字和 ARIA 關聯及焦點、錯誤復原、只通知一次、取消／重設／編輯／新工作後的舊回傳，以及新工作不會被舊錯誤終止。另沿用套件既有測試核對實際 Worker 內嵌程式在 Node `self` shim 的運算，以及預覽站 loopback HTTP。此次分工未執行實際瀏覽器、CSP 強制執行、Network／Storage 觀察、原生下載或遠端部署驗證；控制式 DOM 並不能證明這些項目。

[環境前快照](environment-before.json)與[後快照](environment-after.json)皆 PASS，SHA-256 相同：`ea0bbfd445a4f59d1e16fe8649003024a46c63c8d04802063a0c0777a9ce68ba`。User／Machine PATH 保持原有 registry type、長度與雜湊，暫存項目均為 0；完整 Environment key 指紋相同。沒有修改共用來源、Git 或部署。

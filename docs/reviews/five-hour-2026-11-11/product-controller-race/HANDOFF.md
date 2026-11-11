# Worker 回覆與 Blob URL 生命週期修正交接

八款既有計算工具各有一個 controller。舊 worker 在新工作忙碌時送達原世代的成功或驗證錯誤，曾能結束新工作。修正後，回覆須符合目前 worker、目前世代及忙碌狀態，訊息還須帶正確的 payload 世代。符合條件的成功或錯誤照常結束當前工作。

八款的 Worker 建立函式也會在建立 Blob URL 後遇到同步建構錯誤。現在會立即釋放該 URL 並將原錯誤交給 controller，下一次執行可建立新的 Worker。正常終止時只呼叫一次原生終止並釋放 URL。原生終止拋出時同樣會執行釋放。 [固定追加裁定](https://github.com/KYStr/glossquote-labs-home/blob/3ffe6eb207e86c08691a7b45bd4459a740beff29/docs/reviews/five-hour-2026-11-11/dispatch/product-controller-race/AMENDMENT-URL-LIFECYCLE.md)

維護任務 `labs-five-hour-product-controller-race-20261111`，claim `fh-controller-race-01a1c8a9-claim-20261111`。認領與開工固定於 registry revision 1655、commit `51e53d8c1933725ca27802969740c8d7dc49cec2`。遷移 commit `9834f940d7e5fcb4a0b7e381607e56b2ef2e6f46` 的八個工具目錄 tree SHA 與固定來源逐一相符。兩份修正各自保存 commit。每款最終有五個變更檔案，分別為 `public/js/controller.mjs`、`public/js/app.js`、各自的 preview 生成檔及建置 manifest。 [原始產品集合 PR #283](https://github.com/KYStr/glossquote-labs-home/pull/283) · [固定任務](https://github.com/KYStr/glossquote-labs-home/blob/989119cb9530dd9d0fcb98c2953415b6c0baf9de/docs/reviews/five-hour-2026-11-11/dispatch/product-controller-race/TASK.md)

以 repo 根目錄執行 `node --test docs/reviews/five-hour-2026-11-11/product-controller-race/controller-race.test.mjs`。測試保留已終止 worker 的回呼，在再執行、取消後執行、編輯後執行、重設後執行各送舊成功與舊驗證錯誤。另覆蓋目前成功、錯誤世代及舊 onerror，並確認目前驗證錯誤仍可結束工作。原 controller 對照 64 失敗、24 通過，exit 1。修正後 88/88，exit 0。維護作者重跑 Astra 的獨立探針，針對八款載入修正後固定檔案，64 個舊回覆均拒絕，24 個對照均通過。瀏覽器如何排程或派送終止前後的事件仍待實測。 [回歸測試](controller-race.test.mjs) · [Astra 原始證據](https://github.com/KYStr/glossquote-labs-home/pull/329)

另以 `node --test docs/reviews/five-hour-2026-11-11/product-controller-race/worker-url-lifecycle.test.mjs` 執行八款各五種情境。覆蓋同步建構失敗與原錯誤、正常終止、重複終止、原生終止拋出及 controller 成功重試。修正前 8 通過、32 失敗，exit 1。修正後 40/40，exit 0。維護作者另重跑 Astra 的 URL 探針，八個建構失敗與八個正常終止均釋放 URL，exit 0。離線測試使用注入的 Worker、Blob URL 和計數器。 [URL 生命週期測試](worker-url-lifecycle.test.mjs)

| 工具 | 既有離線測試 | 靜態／生成檔 | 兩次 preview |
| --- | ---: | --- | --- |
| age-calculator | 54 | PASS | 同 bytes |
| bill-split-calculator | 49 | PASS | 同 bytes |
| clothing-size-converter | 53 | PASS | 同 bytes |
| dew-point-calculator | 46 | PASS | 同 bytes |
| feels-like-temperature | 45 | PASS | 同 bytes |
| period-cycle-calculator | 48 | PASS | 同 bytes |
| race-time-predictor | 44 | PASS | 同 bytes |
| salary-converter | 43 | PASS | 同 bytes |

每款用 Node v24.14.0 執行 `node --test`、`node scripts/check.mjs`、`node scripts/build.mjs --mode preview` 兩次及 `node scripts/check-generated.mjs --mode preview`，exit 均為 0。摘要記錄相對路徑、命令、退出碼與 SHA-256。 [執行與來源摘要](verification.json)

九項產品面向的本輪證據範圍如下。獨立 reviewer 仍須對固定 PR head 審查。

| 面向 | 證據與待驗 |
| --- | --- |
| functionality | 控制器與既有核心、報告離線測試通過。Worker 建構失敗後可重試。真瀏覽器流程待驗。 |
| boundaries | 四種工作替換路徑、回覆世代、過期 onerror、Blob URL 釋放與重複終止均已離線驗證。 |
| privacy | 變更限 controller 歸屬判斷與 Worker Blob URL。實際 Network／Storage 為 NOT_RUN_USER_FOCUS_INCIDENT。 |
| security | 靜態檢查通過。真瀏覽器控制與資源生命週期待驗。 |
| usability | controller 狀態與下載可用性旗標通過。真桌面與行動流程為 NOT_RUN_USER_FOCUS_INCIDENT。 |
| accessibility | 真鍵盤、焦點、狀態朗讀與裝置驗證為 NOT_RUN_USER_FOCUS_INCIDENT。 |
| localization-seo | 雙語 preview 生成檔檢查通過。正式頁面、部署及索引驗證未執行。 |
| toolchain-provenance | 八目錄固定 tree、差異範圍、離線測試、靜態檢查、兩次 build bytes 與生成檔均已核對。 |
| compatibility | Chrome、Edge、實際裝置與原生下載為 NOT_RUN_USER_FOCUS_INCIDENT。 |

各款舊規格及原產品 PR 仍供追溯，服飾標籤規格維護另有排隊工作。

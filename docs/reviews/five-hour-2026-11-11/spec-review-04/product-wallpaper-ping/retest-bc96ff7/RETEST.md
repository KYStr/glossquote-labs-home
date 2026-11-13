# FH-PRODUCT-WALL-PING-INDEPENDENT｜PWP-03 複驗

固定 [PR #325](https://github.com/KYStr/glossquote-labs-home/pull/325) 候選 `bc96ff770b8efdf57a6051a57b97b1106a482bc5`，parent `6282481d8e1fccab72c0d38f1fc741d156d2944b`。**PWP-03 兩款的受控離線複驗通過。PWP-01／02 沿用前一固定版本的通過證據**。產品 `requiredChecksComplete=false`。 [PWP-01／02 複驗](../retest-6282481/RETEST.md) · [首次退修 #328](https://github.com/KYStr/glossquote-labs-home/pull/328)

## Worker URL 生命週期

| 獨立探針 | 壁紙 | 坪數 |
| --- | --- | --- |
| 正常建構後終止 | 建立 1、撤銷 1 | 建立 1、撤銷 1 |
| 對同一 Worker 呼叫三次終止 | 底層終止 1 次、撤銷 1 次 | 底層終止 1 次、撤銷 1 次 |
| 連續兩次建構同步拋錯 | 建立 2、撤銷 2，保留原例外 | 建立 2、撤銷 2，保留原例外 |
| 終止同步拋錯後再呼叫 | 底層終止 1 次、撤銷 1 次 | 底層終止 1 次、撤銷 1 次 |
| 透過實際 controller 從失敗重試 | 保留草稿與 WORKER_ERROR，第二次成功，建立 2、撤銷 2 | 保留草稿與 WORKER_ERROR，第二次成功，建立 2、撤銷 2 |

以 Node 內的合成 Blob URL 和 Worker 觀察候選的 `createWorker`。建構失敗先撤銷 URL，再拋回原例外。終止走 `finally`，重複呼叫也只處理一次。重試過程確認失敗時沒有結果或下載，成功後顯示這次輸入的正確結果。 [壁紙固定 app](https://github.com/KYStr/glossquote-labs-home/blob/bc96ff770b8efdf57a6051a57b97b1106a482bc5/tools/wallpaper-calculator/public/js/app.js#L161-L184) · [坪數固定 app](https://github.com/KYStr/glossquote-labs-home/blob/bc96ff770b8efdf57a6051a57b97b1106a482bc5/tools/ping-area-converter/public/js/app.js#L114-L137) · [結構化結果](retest.json)

## 回歸與沿用

- 實跑 Node 24.14.0，壁紙 **66/66**、坪數 **67/67**。各自 `check`、兩次 preview build、`check-generated` 均 exit 0。兩次重建及固定預覽逐檔相符。
- 兩款 app 在 `createWorker` 之外的 bytes 相同。兩款 controller、純核心、嵌入 Worker、fixtures、兩語 HTML 和 preview server 的依賴雜湊與 `6282481` 相符。沿用前輪 PWP-01 各 4/4、PWP-02 11/11、壁紙驗證回歸 36/36，以及原有算式、報告與預覽證據。 [依賴與命令紀錄](retest.json)
- GitHub 固定候選 **70** 檔與實際 PR diff 一致。**12** 個變動檔匿名讀回，**58** 個檔案依相同 Git blob 及 SHA-256 沿用。已按前後檔案 bytes 重建 12 檔 head diff 及 70 檔 PR diff。 [來源](source-check.json) · [diff 重建](diff-audit.json)

Registry r1661 的維護任務為 `working`，submission 為 null，原 owner 與 claim 相符。隔離 Chrome／Edge、真機、讀屏、Network／Storage 和原生下載為 `NOT_RUN_USER_FOCUS_INCIDENT`。正式 HTTPS／SEO、registry 寫入、合併及部署為 `NOT_RUN`。 [登記讀回](registry-readback.json)

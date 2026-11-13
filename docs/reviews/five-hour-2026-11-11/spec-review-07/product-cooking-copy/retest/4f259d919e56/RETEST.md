# 料理度量換算退修複驗

候選 PR #323，固定 head `4f259d919e56c2f098035d2ae9d4431dc7b50af6`，直接承接 `3fd8379427b1318ba65c1169f0256befc47ca93a`。**引用檢查與舊 Worker 回覆修正通過離線複驗。** 同一候選仍重現 Worker 建構失敗後的 Blob URL 未撤銷。真瀏覽器與真機維持 `NOT_RUN_USER_FOCUS_INCIDENT`，產品未接受。[候選固定 commit](https://github.com/KYStr/glossquote-labs-home/commit/4f259d919e56c2f098035d2ae9d4431dc7b50af6) · [上一輪固定審查](https://github.com/KYStr/glossquote-labs-home/blob/612c313ecf7d4df83a244c6758422abbd85a4e84/docs/reviews/five-hour-2026-11-11/spec-review-07/product-cooking-copy/REVIEW.md)

## 固定來源與必要差異

本次獨立讀回 Git tree 的 36 個檔案。八個變動檔的公開 raw bytes 均符合 Git blob 與重算 SHA-256。產品變動是 checker、controller、兩組測試、生成 controller 與預覽 manifest。另兩個變動檔是作者證據。其餘 28 檔重用上次已核的相同 blob，包含雙語頁、來源引用、核心、常數、fixtures、報告與 Worker 來源。先前各版 33 個 Worker 回覆及 14 份字面報告的證據可沿用原範圍。[檔案與雜湊](retest-provenance.json) · [controller 修正範圍](https://github.com/KYStr/glossquote-labs-home/blob/989119cb9530dd9d0fcb98c2953415b6c0baf9de/docs/reviews/five-hour-2026-11-11/dispatch/product-cooking-copy/AMENDMENT-CONTROLLER.md)

## 引用 checker

固定候選的雙語頁沿用兩個實際來源錨點。checker 只在食材說明段落的指定 HTML 結構放行兩個完整錨點。確認有效錨點及唯一原始字串後才從全量掃描扣除。其餘原始內容維持既有禁用 token 檢查。

獨立 checker 探針中，良性註解正例 exit 0，14 個負例 exit 1。涵蓋兩語來源註解、原連結仍存在的註解重複、查詢與教材頁碼變動、純文字 URL、樣式檔、重複錨點、template、textarea、屬性值、hidden 容器、移出來源段落及註解中的既有禁用 token。將繁中重量表或英文教材錨點註解後，HTML 測試也各回傳 exit 1。探針副本逐檔還原並核對。CMC-CHECK-01 在此固定候選的離線檢查已修正。[checker 複驗](checker-retest.json)

## Controller 世代隔離

兩種回覆各經直接重跑、取消後重跑、編輯後重跑、重設後重跑，共八個案例。以精確 posted snapshot 形成真實協定形狀的回覆，保留舊回呼，等新工作 busy 時送達。原候選八次錯收並終止新 Worker。修正候選八次都維持 busy、無結果／錯誤／報告、無額外通知，新 Worker 以自己的回覆正常結束。正常成功、訊息世代錯誤及舊 onerror 三個對照通過。修正會檢查當前世代、Worker 身分及 busy，onmessage 同時檢查回覆世代。[受控競態程式](../verify-controller.mjs) · [原候選新重現](../original-controller-race.json) · [修正候選結果](controller-race.json) · [Astra 固定重現](https://github.com/KYStr/glossquote-labs-home/blob/2d23970faed09a1d065d666408adbd90f67319d4/docs/reviews/five-hour-2026-11-11/astra/cross-controller-race/REPORT.md)

## Blob URL 缺口

用固定 app.js 的 createWorker 和注入的 Blob、URL、Worker 離線執行。正常終止建立及撤銷各 1 次。Worker 建構拋錯仍傳出原錯誤，建立 1 個 URL 而撤銷 0 個。Controller 保留 draft 並能重試出結果，重試結束後只有第二個 URL 被撤銷。重複終止與終止拋錯也各觀察到不完整的清理。這些是受控平台行為，實際瀏覽器資源生命週期待驗。[URL 修正範圍](https://github.com/KYStr/glossquote-labs-home/blob/3ffe6eb207e86c08691a7b45bd4459a740beff29/docs/reviews/five-hour-2026-11-11/dispatch/product-cooking-copy/AMENDMENT-URL-LIFECYCLE.md) · [本次重現](url-original.json) · [注入式程式](../verify-worker-url.mjs)

## 執行與驗收狀態

完整 Node 測試重跑 70/70，含兩次可重現預覽重建與 loopback。第一次執行有兩個依賴子行程的建置案例遇到 Node 路徑 ENOENT，修正本次程序的 Path 後重跑通過。公開及重建版的生成檢查各 exit 0，9 個生成檔與 manifest 對應固定公開版本。Windows 持久環境在執行前後指紋一致。[實際命令與退出碼](retest-commands.json)

九個面向沿用原審查所列的真瀏覽器、真機及原生下載門檻。引用檢查與 controller 子項有本次 PASS，URL 清理在此版本 FAIL。產品維持未接受，registry、合併與部署均為 `NOT_RUN`。

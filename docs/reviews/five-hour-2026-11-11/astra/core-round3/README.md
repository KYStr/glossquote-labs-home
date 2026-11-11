# 重現 PR295 第二候選複驗

先讀 [報告](INDEPENDENT-REVIEW.md)、[A02](FINDINGS.md)及[恢復語義](RECOVERY-SEMANTICS.md)。候選固定為 `110e809c15b10004c2aadca6a6649b9324be1419`，仍需修正。

使用 Node 24，無新依賴；取得此完整證據目錄，在任意工作目錄執行，最後參數為尚不存在的輸出目錄：

```sh
node /path/to/core-round3/reproduce-review.mjs ./core-round3-output
```

父目錄須已存在。入口把本次必要 scripts 與 manifest 複製到輸出位置，僅以公開固定 commit HTTP GET 下載 11 個輸入並核 Git blob。兩個既有 reviewer oracle 模組來自上輪固定 `ca1e84f4d729f87f5d29c967dc813e55809dae7c`，已列 manifest；不需要私人路徑或作者 work。

下載後實際測試全部離線：候選 55 項、A01 定向 12 項、A02 初始反例、四種晚到來源順序及既有合法恢復。GitHubClient 使用 injected fake transport，PUT 僅修改記憶體；假 token 為明示假字串，不讀任何憑證。Windows 子行程設 `windowsHide:true`。

預期 `portable-result.json` 為 `REPRODUCTION_COMPLETE_CANDIDATE_BLOCKED`；A01 12/12，A02 四案均 `BLOCKING_DEFECT_REPRODUCED`，恢復 PASS。exit 0 是「以上證據成功重現」，不能當 candidate accepted。環境 guard 由需要此規則的執行環境在外層前後執行，本入口不變更持久設定。

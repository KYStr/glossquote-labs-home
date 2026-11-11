# 重現固定 core 候選審查

先讀 [獨立報告](INDEPENDENT-REVIEW.md)與[阻擋項](FINDINGS.md)。受審 `e1c4d5d50b23cd8e9449632d3eb697f217dea305` 仍需修正。

使用 Node 24，不安裝依賴。取得本目錄完整檔案後，在任意工作目錄執行，最後參數須是尚不存在、父目錄已存在的輸出目錄：

```sh
node /path/to/core/reproduce-review.mjs ./core-review-output
```

[入口](reproduce-review.mjs)把必要 reviewer scripts 與固定輸入清單複製到指定輸出目錄；不改此來源目錄，不依賴私人舊 oracle 或作者 work。下載階段只對 raw.githubusercontent.com 作公開固定 commit GET，核對六候選、六 parent、兩份完整公開 registry 的 Git blob。brief 與 40 ID 附本地固定 snapshot，亦核對原 Git blob。

下載後的實際測試都離線：完整候選 49 項、reviewer 16 項矩陣、純核心及 adapter 缺陷重現。adapter 採 [fake-github.mjs](fake-github.mjs) 記憶體 transport，測試 token 為明示假字串，所有 PUT 僅改假 registry。唯一執行的 CLI 是 `validate`，在任何 token lookup 前返回；不呼叫正式 apply/read CLI。

預期整體 `portable-result.json` 為 `REPRODUCTION_COMPLETE_CANDIDATE_BLOCKED`，49/49、16/16、兩快照、40 ID，且 `FH-CORE-A-01` 兩入口均為 `BLOCKING_DEFECT_REPRODUCED`。入口 exit 0 只表示證據完整重現，**不是候選驗收通過**。缺陷修正後應另固定新 commit、變更對應斷言；不得改此舊 head 的證據。

Windows 子行程使用 `windowsHide:true`。在要求永久環境守護的工作環境，執行前後另依該環境現有 guard 留私人記錄；此可攜工具不安裝或改環境設定。公開 [環境摘要](environment-summary.json)只記這次實際 PASS。

# 收銀盤留款清點 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `cash-float-tray.exact` | 6+4 用兩件即可足額。總值 6+8+9=23。 |
| `cash-float-tray.non-greedy` | 單留 8 不足，5+4 恰達 9。結果依面額排序。 |
| `cash-float-tray.tie` | 5+3 與 4+4 都兩件，留 5 的向量先勝。 |
| `cash-float-tray.zero-target` | 只保留金額 0 的狀態，所有 3 件移出。 |
| `cash-float-tray.inexact` | 總盤 11，但不高於 5 的可達額只有 0、3、4。 |
| `cash-float-tray.duplicate` | 相同面額須先合成同一實點列，第二列被拒絕。 |
| `cash-float-tray.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `cash-float-tray.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

容量反例。目標 10,000、面額 100 與 1 各 99 件。只處理 100 時有 100 個可達狀態，加入面額 1 後有 10,000 個可達狀態，兩代並存 10,100 個。每代以 0 至目標作索引，因而兩代合計最多 20,002 個。

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

# 活動票本連號盤點 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `event-ticket-ranges.mixed` | 1–6、8–10 共 9 號，4 重疊，7 缺，11 超段。 |
| `event-ticket-ranges.two-edges` | 11 和 12 相接全覆蓋，兩邊各超出 2 張。 |
| `event-ticket-ranges.upper-edge` | 最後的加一端點仍在安全整數內，結果保留九位。 |
| `event-ticket-ranges.empty-bundles` | 一個完整 100 張號段都缺失，無需列個別號碼。 |
| `event-ticket-ranges.wrong-width` | 輸入第一票少一位，需照印刷補為 00。 |
| `event-ticket-ranges.backwards` | 同一疊的末號小於起號。 |
| `event-ticket-ranges.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `event-ticket-ranges.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

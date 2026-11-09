# 多站取件時窗路線 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `pickup-window-route.only-order` | A 先時 B 到 525 超窗。B 先依序 490、505 到達，515+15 回站。 |
| `pickup-window-route.wait-and-tie` | A→B 返回 33+5=38。B→A 返回 30+8=38，平手保留 A 先。 |
| `pickup-window-route.exact-return` | 服務完恰在關閉時間，返回恰在期限，均含等號。 |
| `pickup-window-route.missing-return` | 出發處到 A 可走，但 A 回程缺邊。 |
| `pickup-window-route.zero-leg` | 非對角的 0 分表示同處可直達，與 null 不同。 |
| `pickup-window-route.diagonal` | 站到自己固定零，非零對角是欄位設定錯誤。 |
| `pickup-window-route.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `pickup-window-route.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

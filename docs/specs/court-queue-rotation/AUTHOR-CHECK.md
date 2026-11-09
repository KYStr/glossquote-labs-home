# 單場散打輪轉板 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `court-queue-rotation.cap` | A 第一場留場，第二場達上限後與 C 依上場順序排尾。 |
| `court-queue-rotation.late-arrival` | A、C 正在場，晚到 B 排尾，當下無下一對預覽。 |
| `court-queue-rotation.limit-one` | 上限 1，勝者 B 也須回尾，順序按場上 A、B。 |
| `court-queue-rotation.holder-leaves` | B 可在場間離開。剩 A，湊不出兩隊。 |
| `court-queue-rotation.one-waiting` | 開打需要兩隊，候場一隊不足。 |
| `court-queue-rotation.unplayed-winner` | C 雖是已知隊，未出現在 A、B 這場。 |
| `court-queue-rotation.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `court-queue-rotation.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

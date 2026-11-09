# 底片張數配置 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `film-roll-budget.priority-rounds` | 最低合計 9。剩 11 張，同級 A 多 6、B 多 5，C 留在最低。 |
| `film-roll-budget.reserve-and-spare` | 理想總數 6 可全滿，17−6=11，另外保留 3。 |
| `film-roll-budget.exact-min` | 兩張全給 A 最低，B 的高優先只有在最低皆滿後才適用。 |
| `film-roll-budget.min-short` | 保留後剩 2、最低為 3，不提供部分場景分配。 |
| `film-roll-budget.empty-roll` | 零剩餘合法，最低也是零，期待的 1 張未達。 |
| `film-roll-budget.inverted-target` | 理想張數須至少等於最低張數。 |
| `film-roll-budget.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `film-roll-budget.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

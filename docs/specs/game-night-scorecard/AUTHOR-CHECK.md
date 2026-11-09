# 聚會回合計分表 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `game-night-scorecard.high-tiebreak` | A、B 各保留 16，A 的最佳 10 勝過 B 的 8。 |
| `game-night-scorecard.low-tiebreak` | 低分勝，兩人棄最高局，總分同 4，B 的最佳 1 較小。 |
| `game-night-scorecard.tied-ranks` | 前兩人完全同分，各排 1，C 前有兩人排 3。 |
| `game-night-scorecard.drop-earlier` | 兩人的最差都同分，均棄原序最早的 R1。 |
| `game-night-scorecard.too-many-drops` | 只有一局時棄一局將使最佳分未定義。 |
| `game-night-scorecard.score-shape` | 兩位玩家需要兩個明確分數。 |
| `game-night-scorecard.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `game-night-scorecard.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

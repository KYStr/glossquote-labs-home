# 同行群分桌 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `table-seating.backtrack` | A 在 T1 會使 B 沒空位。回退 A 到 T2，B 用 T1，C 鎖在 T2。 |
| `table-seating.pinned` | A 固定第二桌。B 按桌輸入序使用 T1。 |
| `table-seating.one-table` | 一桌 20 座恰好容納整群 20。 |
| `table-seating.fragmented` | 合計有四座，但任一桌皆不足三座。 |
| `table-seating.locked-conflict` | T1 有空位但無階條件未滿。T2 被指定限制排除。 |
| `table-seating.unknown-table` | T0 不在桌清單內，先修正參照。 |
| `table-seating.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `table-seating.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

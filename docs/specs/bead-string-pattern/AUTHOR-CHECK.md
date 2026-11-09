# 串珠花樣用量與順序 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `bead-string-pattern.mirrored` | 第二組完整倒序 B/G/R，G 第一次用在 3、第二次在 6 缺料。 |
| `bead-string-pattern.straight` | 直複 ABAB，C 完全未用仍列餘二。 |
| `bead-string-pattern.single-bead` | 單珠倒序仍是一珠，三組共有三顆。 |
| `bead-string-pattern.empty-stock` | 兩端加花樣合 3，原庫存 0。 |
| `bead-string-pattern.unknown-end` | 後端珠 B 需先列在顏色庫存。 |
| `bead-string-pattern.zero-groups` | 規格要求至少一組花樣。 |
| `bead-string-pattern.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `bead-string-pattern.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

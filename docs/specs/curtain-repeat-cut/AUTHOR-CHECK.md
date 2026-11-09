# 窗簾同花位落剪 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `curtain-repeat-cut.matched` | 成品頂線相位各為 320、2240 的整週。片長各 1620，跳花為 190+300。 |
| `curtain-repeat-cut.plain` | 素布跳花為零，兩片總長 900+750。 |
| `curtain-repeat-cut.exact-stock` | 第二片未裁前的摺後頂線相位為 1500 mod 500=0，無額外跳花。 |
| `curtain-repeat-cut.short` | 一片總長 900，布卷少 1 mm。 |
| `curtain-repeat-cut.phase-edge` | 合法相位的上限為 299 mm，300 是下一週的零點。 |
| `curtain-repeat-cut.zero-repeat-phase` | 素布無花距，兩相位固定零。 |
| `curtain-repeat-cut.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `curtain-repeat-cut.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

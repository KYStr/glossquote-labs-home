# 試織花樣針數表 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `knit-gauge-planner.repeats` | 兩軸每單位 5 mm。寬 80/110 選 110，高 40/60 選 60。 |
| `knit-gauge-planner.exact` | 20=2+3×6，8=2×4，兩軸都恰達。 |
| `knit-gauge-planner.tie-up` | 寬差各 15 mm、高差各 10 mm，皆取較大整數。 |
| `knit-gauge-planner.fraction-and-min` | 100/30 與 200/30 的精確中點為 5。一行 10/3 mm，已高於 1 mm。 |
| `knit-gauge-planner.count-cap` | 上限 10000×1/1000 為 10 mm，兩軸都只有較小可行數。 |
| `knit-gauge-planner.zero-swatch` | 試片至少有一針才能形成有意義的寬度比例。 |
| `knit-gauge-planner.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `knit-gauge-planner.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

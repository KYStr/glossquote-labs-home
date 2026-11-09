# 工作室次數費用交會表 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `service-block-breakpoints.multiple-crossings` | A 1–2 次一包、3–4 次兩包。B 每次 350，跨越不只一次。 |
| `service-block-breakpoints.allowance` | A 一次內含，再兩次各 40。第四次總計 100+80+75。 |
| `service-block-breakpoints.zero-visits` | 0 次仍計固定額 5 與 2。 |
| `service-block-breakpoints.tie-range` | A 未超包含量，B 單價 0。三個值合成一段。 |
| `service-block-breakpoints.ascending` | 兩個相等上界會造成零長級距，拒第二列。 |
| `service-block-breakpoints.closed-tail` | 末級距必為開放上界，避免最大次數變更後沒有對應費率。 |
| `service-block-breakpoints.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `service-block-breakpoints.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

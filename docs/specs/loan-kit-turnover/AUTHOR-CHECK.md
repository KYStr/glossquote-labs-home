# 活動借用周轉檢查 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `loan-kit-turnover.turnover-overlap` | A 直到 40 才釋出，所以 30–40 需求 2+3。 |
| `loan-kit-turnover.touching` | A 與 B 在 30 相接，L 無借用。 |
| `loan-kit-turnover.after-midnight` | 整理延伸到隔日 02:00，整段需求 1。 |
| `loan-kit-turnover.split-shortage` | 10 和 20 活動借用集合改變，保留三段。 |
| `loan-kit-turnover.unknown-kit` | 借用引用了尚未存在的道具類型。 |
| `loan-kit-turnover.zero-length` | 歸還必須嚴格晚於領取。 |
| `loan-kit-turnover.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `loan-kit-turnover.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

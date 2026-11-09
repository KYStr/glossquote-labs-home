# 包裹計費重核對 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `parcel-billable-weight.two-services` | P 在 A 按 1200 進位，Q 按實重 750。B 最長邊 299 拒 P，Q 進位到 800。 |
| `parcel-billable-weight.minimum` | 實重及材積重都是 200 g，最低 250 g 按 100 級距進位為 300 g。 |
| `parcel-billable-weight.exact-limits` | 等於全部上限合法，200 恰為兩個 100 的級距。 |
| `parcel-billable-weight.fractional-gram` | 精確材積 3/2 g 高於實重 1，進位至 2。 |
| `parcel-billable-weight.all-reasons` | 三個量各比限制多一個單位，輸出固定順序的三原因。 |
| `parcel-billable-weight.zero-divisor` | 材積除數必須為正整數。 |
| `parcel-billable-weight.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `parcel-billable-weight.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

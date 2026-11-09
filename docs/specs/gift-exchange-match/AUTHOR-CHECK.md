# 交換禮物配對 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `gift-exchange-match.three` | A 先配 B。若 B 配 A，最後 C 只能自送，所以 B 配 C。 |
| `gift-exchange-match.directed` | A 禁 B 後只有 C。剩下 B→A、C→B 可完整配對。 |
| `gift-exchange-match.reciprocal` | 兩組互送符合規則，依輸入序先選 B 與 A。 |
| `gift-exchange-match.no-matching` | A 和 B 都只能送 C，兩人不能同時使用 C。 |
| `gift-exchange-match.nfc-duplicate` | 正規化後前兩個短名相同。 |
| `gift-exchange-match.self-rule` | 自送已隱含禁止，拒絕重複類型的顯式自送條件。 |
| `gift-exchange-match.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `gift-exchange-match.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

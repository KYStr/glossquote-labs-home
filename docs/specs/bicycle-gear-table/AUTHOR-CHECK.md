# 單車齒比與展開表 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `bicycle-gear-table.group-ratios` | 輪周乘 1/2/4 倍的速度各為 10.08、20.16、40.32 km/h，按組合輸入序列同組。 |
| `bicycle-gear-table.two-cogs` | 後齒較大之比在前，1.5 倍每圈 3000 mm。 |
| `bicycle-gear-table.zero-rpm` | 每圈量與踏頻無關，零 rpm 的速度為零。 |
| `bicycle-gear-table.half-up` | 1250×10×60/1000000=0.75，顯示 0.8 km/h。 |
| `bicycle-gear-table.sub-unity` | 每圈 1000/3 mm，50 rpm 時精確 1 km/h。 |
| `bicycle-gear-table.duplicate-tooth` | 同側重複齒數會重複產生同一物理組合。 |
| `bicycle-gear-table.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `bicycle-gear-table.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

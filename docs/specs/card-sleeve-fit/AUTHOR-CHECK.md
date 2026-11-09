# 桌遊牌套庫存分配 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `card-sleeve-fit.reassign` | A 可用兩套而 B 只能 S1，增廣路重分 A 取得兩張覆蓋。 |
| `card-sleeve-fit.short-stock` | S1 剛好命中 5、25 兩界。S2 內寬太小，餘十張。 |
| `card-sleeve-fit.exact-fit` | 兩軸皆零餘隙，閉區間包含 0。 |
| `card-sleeve-fit.empty-stock` | 尺寸相容但終點容量零，沒有正流量。 |
| `card-sleeve-fit.gap-order` | 最大餘隙不能小於最小。 |
| `card-sleeve-fit.duplicate-sleeve` | 結果按唯一套名辨識實體牌套。 |
| `card-sleeve-fit.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `card-sleeve-fit.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

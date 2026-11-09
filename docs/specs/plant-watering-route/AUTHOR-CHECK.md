# 澆水補壺路線 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `plant-watering-route.farthest` | 最遠可達 tap 為 C，A+B 用 650。滿壺繼續用 800。 |
| `plant-watering-route.exact-refill` | 走到 B 前恰空壺，仍能原地補滿。A 前出發已滿。 |
| `plant-watering-route.no-refill` | 全程合計等於壺量，沿途水龍頭不用停。 |
| `plant-watering-route.no-tap` | 第二盆需 300，壺剩 200 且無可達補水點。 |
| `plant-watering-route.one-too-large` | 滿壺仍少 1 ml，第一盆不能拆次。 |
| `plant-watering-route.zero-amount` | 只有正用量盆栽列加入路線。 |
| `plant-watering-route.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `plant-watering-route.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

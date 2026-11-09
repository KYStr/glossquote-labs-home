# 相框掛點定位 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `frame-row-marking.center` | 剩 500 mm 分三段。B 左緣 200+1000/3，頂緣較高框下移 50 mm。 |
| `frame-row-marking.top` | 剩 300 mm，三段各 100。兩框頂為 0，掛點各自加框內偏移。 |
| `frame-row-marking.exact-gap` | 300+3×20 正好 360。左右端點掛位合法。 |
| `frame-row-marking.short` | 至少 360 mm，差 1 mm，無放置座標。 |
| `frame-row-marking.hook-out` | A 掛點水平偏移 101 mm 超出寬 100 mm。 |
| `frame-row-marking.fractional-wall` | 牆寬核心只接受整數毫米。 |
| `frame-row-marking.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `frame-row-marking.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

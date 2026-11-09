# 洗烘兩機接續表 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `laundry-machine-handoff.delayed-wash` | A 在 500 開始會等 20 分。510 開始正好等 10。B 必須等到洗完即接 590 烘程。 |
| `laundry-machine-handoff.parallel` | B 洗與 A 烘並行。B 洗畢等 10 分，符合上限。 |
| `laundry-machine-handoff.day-edge` | 兩程合 40 分，恰於 24:00 完成。 |
| `laundry-machine-handoff.prefix` | B 最早烘完 80，窗口只到 79，所以保留 A。 |
| `laundry-machine-handoff.touching-blocks` | 兩段保留相接成 0–20。烘程在 40–60，等 10。 |
| `laundry-machine-handoff.bad-reservation` | 開始與終點相同的保留列無長度。 |
| `laundry-machine-handoff.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `laundry-machine-handoff.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

# 活動備用電池替換表 作者檢查

檔案範圍 [規格](SPEC.md) · [製作簡報](BRIEF.md) · [字面案例](fixtures.json)。

作者以 130 筆既有規格名稱與相近範圍核對差異。此處記錄字面案例的推導，交非作者在固定 GitHub 候選獨立重算。文件結構與資料檢查由 B 組檢查腳本另留實際結果。

| 案例 ID | 核對方法 |
| --- | --- |
| `battery-swap-plan.gaps-and-shortage` | A 關閉時留 10 分，第二段至 50 用完。B 在 30 換一次，50 正好完工。 |
| `battery-swap-plan.simultaneous` | 同分鐘依設備輸入序，Z 優先於 A。 |
| `battery-swap-plan.exact-end` | 24:00 剛用完且活動也結束，沒有新組事件。 |
| `battery-swap-plan.swap-after-gap` | 原輸入未排序，先用 0–10。下一次運轉在 20 才換。 |
| `battery-swap-plan.zero-stock` | 起始就需 1 組，庫存 0，首缺第 1 個事件。 |
| `battery-swap-plan.overlap` | 同設備 10–20 被重複計入，第二段起點被拒。 |
| `battery-swap-plan.dirty-after-edit` | 第一次結算可顯示，替換草稿後立刻失效。新草稿要重新執行才產生自己的結果。 |
| `battery-swap-plan.cancel-then-late` | 取消令第一個 runId 失效。第二次完成後抵達的第一次回覆丟棄，保留第二個字面結果。 |

| 驗證層 | 狀態 |
| --- | --- |
| 非作者完整度審查與 ready 登記 | NOT_RUN |
| 實際純核心、產品狀態測試及建置 | NOT_RUN |
| 實際隔離 Chrome／Edge、Keyboard、Network／Storage、縮放與觸控 | NOT_RUN |
| 正式 HTTPS、SEO 與雙語首頁互連 | NOT_RUN |
| 產品九面向獨立評分與 accepted | NOT_RUN |

交驗時以規格中的固定九面向與同一 GitHub commit 判定。

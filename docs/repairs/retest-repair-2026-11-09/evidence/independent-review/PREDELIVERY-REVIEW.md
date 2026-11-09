# 兩項維護修復的獨立複核

Reviewer `local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/retest_independent_review`。獨立核對候選 `e9eb54813a55bd9f0a04b703ecbccee8c2510f4d`、來源 `aa906abec8500d8160d0732c38d5cfc1885f6fd8`。複核時 PR #246 為 open，head 與候選相符。此記錄先於 ZIP 複核與登記寫入。

| 面向 | 預交付評分 | 實際觀測 |
| --- | ---: | --- |
| source-provenance | 99 | 外部重測 ZIP SHA-256 為 `9d4a96c782b9bbb5bce7b367bf15a3b4acbc83274a4e1c6fcc53448c80a9b0ef`。413 檔逐位元組對到解封內容，412 筆 manifest 雜湊、CRC 與路徑安全通過。舊 M2 PR #219 與其來源及候選定位相符。以 SHA-256 逐檔比對舊 101 站與新 140 站基線，四款 M2 工具 51 檔相同。 |
| defect-resolution | 98 | 15 組獨立分句案例比對舊與修正輸出。回報的 U+3000 與 NBSP 原本一段、修復後兩段。ASCII、Tab、CRLF、大小寫、數字、引號、縮寫、小數、CJK 與 20,000/200 碼點邊界覆核通過。36 個工具測試重跑通過，含 TTS 本機語音控制。Fluid 雙語 HTML 精確比對只刪除通知列的語言連結與分隔符，原語言控制、首頁／目錄連結及 state/app 邏輯保持原始 bytes。 |
| release-security | 99 | 固定 GitHub manifest 的 1,634 筆檔案與凍結產物完全相符。保留原 141 條精確路由、140 工具站、其他 138 工具站及全部 1,627 個未修改檔案；七項檔案變動限兩工具修復、版本資料及雙語目錄來源定位。Worker、CSP 路徑規則與部署設定逐位元組相同，七個路由測試重跑通過。 |
| bilingual-release | 95 | 獨立 HTTPS GET 驗證兩工具與目錄雙語頁、核心 JS、控制器及兩個 release.json，共 11 個實站資產逐位元組等同凍結版。另查 9 個語言轉址及 404，確認 HSTS、noindex、CSP 與 DENY。Cloudflare 隔離 Chromium 中，Fluid 雙語 app 均啟動，舊版各頁含兩個通知語言連結，現版各頁通知語言連結為零且各保留唯一 `#language`。 |
| delivery-integrity | 待 ZIP | 等待本輪交付 ZIP 的 SHA-256、manifest、實體檔案與可攜式入口連結核對。 |

實站互動腳本在原頁等待完成標記逾時，記為 NOT_RUN。原始外部測試已通過 `#language` 狀態保留，該 app bytes 經獨立核對相同。本輪裝置語音、物理裝置、讀屏及完整外部驗收維持待驗，兩項搜尋／分享最佳化留在原範圍。

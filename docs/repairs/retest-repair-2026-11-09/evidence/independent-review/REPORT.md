# GlossQuote 維護候選獨立驗收

Reviewer `local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/retest_independent_review`，GitHub ACK 精確讀回 revision 1447。審查對象為 PR #246 候選 `e9eb54813a55bd9f0a04b703ecbccee8c2510f4d`，修復來源 `aa906abec8500d8160d0732c38d5cfc1885f6fd8`，實站 Worker `d3437642-7870-4122-9aef-c4c40b22ab5e`。獨評驗證範圍為固定維護任務的兩項修復。

| 必要面向 | 分數 | 獨立複核證據 |
| --- | ---: | --- |
| source-provenance | 99 | 原始重測 ZIP SHA-256 `9d4a96c782b9bbb5bce7b367bf15a3b4acbc83274a4e1c6fcc53448c80a9b0ef`，CRC、路徑及 412 筆 manifest 核對通過，413 檔與解封內容逐位元組相同。舊 M2 PR #219、來源及候選定位相符。原 101 站到現行 140 站的四項 M2 工具 51 檔逐一比對一致。 |
| defect-resolution | 98 | 15 組獨立分句案例比對舊版與修正版。回報的 U+3000 及 NBSP 原本一段、修復後兩段。ASCII、Tab、CRLF、大小寫、數字、引號、縮寫、小數、CJK、20,000 文字及 200 分塊碼點邊界符合預期。36 個工具測試重跑通過，含 TTS 僅本機語音控制。Fluid 雙語 HTML 精確差異限通知的語言連結與分隔符，原語言控制及 app/state bytes 相同。 |
| release-security | 99 | 候選 GitHub manifest blob `fe602cb0e56a25d9edd377666ae91324e4db6b76` 的 1,634 筆檔案與凍結產物相符。原 141 條精確路由、140 工具站、其他 138 站及 1,627 個未修改檔案保持一致。七個變更檔限兩工具修復、版本資訊及雙語目錄的 TTS 來源定位。Worker、CSP 路徑規則與部署設定逐位元組相同，七個路由測試重跑通過。 |
| bilingual-release | 95 | 11 個新實站資產逐位元組等同凍結版，包括兩工具和目錄雙語頁、核心 JS、控制器及兩個 release.json。九個轉址與 404 的 HSTS、noindex、CSP、DENY 通過。隔離 Chromium 渲染 Fluid 雙語頁各保留一個 `#language`，通知語言連結各為零。TTS 雙語頁啟動，無本機語音環境的停用狀態及兩語提示正確。 |
| delivery-integrity | 99 | 單一 ZIP 長度 4,519,529，SHA-256 `75ac894ee3a36e182be17bf3a6acfab0d68c8c38ea40869e9ae1dea091b3e8c7`。1,745 檔 CRC、安全路徑與大小寫唯一性通過，1,744 筆 manifest 與解封 bytes 核對通過。唯一入口的五條相對連結可開啟，內含原始重測 ZIP 與 1,634 個凍結發布檔。190 列狀態的 CSV／JSON 對應，本輪新上線 0、既有站更新 2、前批新上線 39，兩項修復標為部署後待外部複驗。 |

五項維護要求已達標。真站互動探針在等待完成標記時逾時，維持 NOT_RUN 與既有 CSP。Fluid 原外部 `#language` 保留狀態案例與未改 app/state bytes 是互動行為的既有佐證。真實裝置語音、讀屏、完整 Network／Storage 及兩工具完整外部驗收維持待驗。SEO-01 分享預覽圖與 SEO-03 媒體入口 307 保留原外部報告的狀態。

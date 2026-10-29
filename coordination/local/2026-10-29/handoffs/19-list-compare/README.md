# 名單比對與合併

目前狀態：M1 本機 MVP 已實作與凍結，等待主代理獨立驗收。尚未放行 M2；公開來源、正式部署、首頁與外部驗收均未執行。

名單比對與合併讓人把兩份一行一筆的名單貼入本機頁面，快速找出只在 A、只在 B、兩邊都有，以及合併後的去重清單。它處理集合差異，不是逐行文字 diff。

請由 [START-HERE.md](START-HERE.md) 開始；產品邊界在 [PRODUCT.md](PRODUCT.md)，精確資料規則在 [TECHNICAL.md](TECHNICAL.md)，逐項驗收在 [ACCEPTANCE.md](ACCEPTANCE.md)，里程碑及檔案權限在 [TASKS.md](TASKS.md)。共通設計契約已完整複製到 [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)。

本機預覽：[繁體中文](http://127.0.0.1:4199/index.html) / [English](http://127.0.0.1:4199/en/index.html)。Node.js 24.x，無 runtime/build 依賴；使用 `npm test`、`npm run check`、`npm run build`、`npm run dev`。`dev` 只綁定 loopback，4199 被占用時用 OS 指派的 ephemeral port，不停止舊服務。

每侧完整原稿上限 100,000 UTF-16 單位、5,000 筆非空項目，每筆 200 個 Unicode 字碼。預設 trim 開啟、大小寫敏感；輸入或選項變更即清空結果。空集合合法，結果文字使用 LF 且无尾端 LF。資料只在目前頁面記憶體，離頁/重載清除；複製失敗可手動選取唯讀文字。

自動 A1–A43、check/build 已通過；繁中/英文真實 Edge 主流程、320 CSS px、原生鍵盤與複製後貼回欄位已有證據。真正 200% zoom、讀屏、真手機、完整 Network/Storage 面板、原生 clipboard 拒絕/缺失與 OS IME 等仍是 NOT_RUN。詳見 [HANDOFF.md](HANDOFF.md) 與 [發布候選](docs/RELEASE-CANDIDATE.md)。

預定正式網址為 https://lists.glossquote.com/index.html 與 https://lists.glossquote.com/en/index.html；目前僅是候選，尚無已核實的 GitHub 來源或上線網站。

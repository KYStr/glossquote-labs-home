# 訂閱費用盤點

狀態：M1 已通過主代理獨立驗收；M2 提供可重現的正式候選。正式網站尚未部署，外部驗收尚未完成。公開來源與 live hosting 分開記錄於 [HANDOFF](HANDOFF.md)。

有人月繳影音、季繳課程、年繳軟體，只看每次扣款不易知道全年負擔。本工具把自行輸入的同幣別訂閱換成全年金額和平均每月金額，勾選「計畫停用」後顯示預計少付與仍保留的金額。它不登入、不讀帳單、不聯絡服務商，也不實際取消訂閱。

需求價值目前是假設，沒有搜尋量或使用者研究證據。相較一般計算機，本工具一次保留多筆繳費週期與停用情境；相較分帳或單價工具，目的是盤點同一人的持續支出，沒有分攤或商品容量比較。無執行期依賴；純瀏覽器、低資料量、手機可用。

閱讀順序：[入口](START-HERE.md) → [需求](PRODUCT.md) → [技術](TECHNICAL.md) → [介面／SEO](UX-SEO.md) → [驗收](ACCEPTANCE.md) → [任務](TASKS.md)。[交接](HANDOFF.md)只記實際執行結果。

首版只處理每月、每季、每年週期及單一自填幣別標籤。沒有匯率、稅額、試用期、實際帳期、退款或違約金推算，沒有自動扣款日期、通知、存檔／匯入或雲端同步。後續功能須另外規劃，不能用例外分支擴大這版。

## 本機操作

使用 Node.js >=24（本次 v24.14.0）。純 ESM 與 Node built-ins，沒有安裝依賴；不需 npm install。

```text
npm test
npm run check
npm run build
npm run dev
```

預覽為 http://127.0.0.1:4207/index.html 與 /en/index.html，保持 noindex/nofollow。若 npm 不在 PATH，Windows 可使用 C:/Program Files/nodejs/npm.cmd，不需要修改 PATH。

正式候選使用另一個產物目錄：

```text
npm run build:production
npm run check:production
npm run release:check
npm run preview:production
```

正式模型為 http://127.0.0.1:5207/index.html 與 /en/index.html。它服務 dist-production 的實際 bytes；不是 Cloudflare live 驗證。正式索引網址固定為 https://subscriptions.glossquote.com/index.html 與 /en/index.html，但本次沒有呼叫部署。Wrangler 設定只有靜態資產、固定單一 custom domain，沒有 Worker 程式、bindings、日誌、追蹤或 metrics。

M2 最終自動驗證：50/50 tests（31 core、11 app、3 preview/toolchain、5 production），check/build/build:production/check:production/release:check 全部 exit 0。release:check 限定 44 個 source 檔案，並固定驗證 M1 八個 public 資產的 SHA-256；核心與 app 未在 M2 改寫。正式 HTML/robots/sitemap/_headers 在建置時生成，沒有改掉預覽原文。

真停用 JavaScript、真 200% 縮放、真機/IME/AT、高對比、真 BFCache、完整 Network/Storage、真離線與原生拒絕等人工項目依使用者授權保留 NOT_RUN；詳見 HANDOFF。不要用 mock、靜態掃描或本機 HTTP 模型代替這些環境。

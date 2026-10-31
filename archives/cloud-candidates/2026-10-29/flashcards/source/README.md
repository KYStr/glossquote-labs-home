# 問答卡 r3 — 私人離線候選

來源候選：`glossquote-flashcards-candidate-r3-20261028-1941`。已完成限定離線獨審；不是完整產品驗收、獨立 GUI PASS 或已發布版本。

貼上 question,answer CSV，翻面自評，可洗牌並下載 JSON 進度或可列印 TXT。

1–200 卡，每面 1–2000 碼點；CSV ≤200000 UTF-16 units 且 ≤262144 UTF-8 bytes。JSON 僅匯出，不匯入；無間隔重複排程。

## 使用與檔案

- Node.js 24+、ESM、僅內建模組，無須安裝依賴；請勿執行 npm install。
- `public/` 是原始前端資產；`scripts/` 與 `test/` 保留原始碼；`package.json` 保留原件。
- 可用 `node scripts/check.mjs` 檢查、`node scripts/build.mjs` 建置 noindex `dist/`；`node --test test/*.test.mjs` 是既有作者測試，不是本交付輪新執行結果。部分既有測試會使用暫存副本或 loopback fixture。
- 同層 `../preview/` 是既有 dist 的逐 byte 複本；繁中入口 `/index.html`、英文入口 `/en/index.html`。每個產品必須以自己的 preview 根目錄獨立呈現；不要把六個產品直接混放在同一 web root。
- 此包沒有啟動 server、瀏覽器、上傳、部署或發布。未授權的環境不應自行啟動預覽。不要把 file:// 當成已驗的瀏覽器流程。
- noindex/robots 不是存取控制；只有另行授權且有實際私人存取邊界的主機才可私人預覽。`_headers` 的文字不保證任何任意主機會套用；Project Backplan 的安全 HTTP 設定在既有 `scripts/serve.mjs`，不能只靠複製靜態檔取得。

## 驗證與限制

詳細結果見 `../docs/VERIFICATION.md` 與 `../MANIFEST.json`。原生 GUI／Crypto 實作／下載／列印／IME／BFCache 及實際 hosting 均 NOT_RUN。

本交付只重整文件，不更改任何 package/public/scripts/test bytes。完整產品測試沒有重跑；包結構改動由 fresh-copy check/build 及與既有 preview 的逐 byte 比對覆核。

沒有加入或替使用者選定軟體授權。這份私人交付不授予新的使用、散布或再授權權利。

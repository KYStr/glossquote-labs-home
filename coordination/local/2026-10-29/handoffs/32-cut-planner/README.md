# Cut Planner

長料裁切規劃（Cut Planner）讓使用者把一種固定長度的原料、每端預留修邊長度、鋸縫寬度，以及各種待切長度和數量整理成可檢查的裁切清單。演算法固定採 First Fit Decreasing（FFD）啟發式；結果是可重現的排料建議，不保證使用最少原料，也不是最佳化證明。

M1 已於 2026-10-19 獲主代理 scoped GO：原 HTTP 隔離瀏覽器與 focused 重驗合計 69 PASS、0 FAIL、3 PARTIAL、7 NOT_RUN。英文真 BFCache 與兩語 no-JavaScript 通過；繁中真歷史返回會清空，但沒有 persisted restore 事件，仍為 PARTIAL；兩語 Network/Storage 也保留部分／人工範圍。離線 adapter 不取代原生剪貼簿或下載驗收。完整限制見 [公開版本摘要](docs/PUBLIC-RELEASE.md)。

M2 [公開來源](https://github.com/KYStr/glossquote-labs-cut-planner) 已驗證為 PUBLIC。前版 `123dc556b5c584e467c3ac2ff4a80de0f2fdced4` 已由主代理部署；live console 發現隱含 favicon.ico 404 後，已發布只修正式 favicon 的 successor `27e8bc45f1ac2536039cb14f365da5d5b7866293`，等待主代理重新部署及 native console 重驗。這不代表首頁或外部驗收通過。正式網址為 https://cuts.glossquote.com；本機 preview 使用 4212，production HTTP model 使用 5212。所有 M1 public 原始資產 bytes 固定不變；正式 SEO／favicon 只由 build 產生到獨立 dist-production/。本機發布後進度註記不重寫已固定的來源 commit／ZIP。

使用 Node.js >=24，零外部套件，不需 npm install。在本資料夾執行 `npm test`、`npm run check`、`npm run build`、`npm run build:production`、`npm run check:production`、`npm run release:check`。`npm run dev -- --port 4212` 及 `npm run preview:production -- --port 5212` 僅啟動 loopback 模型。埠被占用時使用系統分配的 loopback 埠並列出實際網址，不停止既有服務。瀏覽器驗收只由主代理在已驗證的隔離 station 內執行，原功能對話不自行操作 UI。精確證據與限制見 [HANDOFF](HANDOFF.md)。

## 文件

- [產品需求與範圍](PRODUCT.md)
- [計算、資料與報告合約](TECHNICAL.md)
- [雙語 UX、SEO 與使用環境](UX-SEO.md)
- [精確驗收案例](ACCEPTANCE.md)
- [里程碑與派工清單](TASKS.md)
- [工程共通契約](docs/ENGINEERING.md)
- [隱私與安全邊界](docs/PRIVACY-SECURITY.md)
- [品牌原則](docs/BRAND.md)
- [設計原則](docs/DESIGN-SYSTEM.md)
- [發布契約](docs/RELEASE.md)
- [任務入口](TASK-ENTRY.md)
- [規格建立時的任務紀錄](HANDOFF.md)

## 重要限制

此工具只處理同一種固定長度原料、固定兩端修邊，以及相鄰成品之間的鋸縫。它不判斷材料缺陷、夾持長度、鋸片實際走向、斜切損耗、混合庫存或商用預裁貼紙。使用者應先核對量測單位與鋸切條件，並自行確認現場可行性。規格與介面不得把 FFD 說成最少料或最佳方案。

頁面預設空白，不自動填入示範。本機候選不代表完整發布；M1 主驗、M2 公開來源發布及 M3 正式網站／首頁整合仍須依 TASKS.md 和共通發布契約逐關審核。

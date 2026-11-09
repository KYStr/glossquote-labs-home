# 補貨數量試算任務順序

本文件依序列出 M0 規格、M1 本機候選、M2 source/production 候選與 M3 主代理發布。一次只進行當前核准任務；失敗先修該任務並重跑受影響 gate，不往後勾選。正式產品仍未實作，M0 完成不等於 M1 或發布完成。

## T00 — M0 完整規格

- **前置：** 已有本工具 `AGENTS.md`、共用 `docs/` 和 M0 任務指示。
- **Allowed paths：** `README.md`、`PRODUCT.md`、`TECHNICAL.md`、`UX-SEO.md`、`ACCEPTANCE.md`、`TASKS.md`。
- **步驟：** 寫成可由一般實作者直接遵循的繁中規格；固定 schema、錯誤順序、BigInt 計算、SEO、生命週期、M1/M2/M3 邊界和精確測例；不建立產品程式或功能對話。
- **驗收：** 六檔齊全；交叉比對樣例、錯誤向量、文件連結、路徑、UI NOT_RUN 和 release 狀態。沒有宣稱實作/測試通過。
- **命令：** 不執行 runtime/build/UI 命令；由規格作者做唯讀文件檢查。
- **完成條件：** 六份文件交主代理審查並取得 M1 書面放行。

## M1 — 本機雙語候選

### T01 — 靜態骨架、Node scripts 與建置輸出

- **前置：** 主代理已核准 M0；原功能對話已建立；遵守本工具 `AGENTS.md`。
- **Allowed paths：** `package.json`、`.gitignore`、`public/index.html`、`public/en/index.html`、`public/styles/tokens.css`、`public/styles/app.css`、`scripts/serve.mjs`、`scripts/check.mjs`、`scripts/build.mjs`、`test/project.test.mjs`、`dist/**`。
- **步驟：** 建 `private:true`、`type:module`、無依賴的 package；建立雙語 noindex 初始頁與必要本地 stylesheet/module 外殼；所有輸入/試算 controls 在 JS 前 disabled，無 GET form；建置只把 public allowlist 複製到 `dist/`；loopback server 只綁 `127.0.0.1:4217` 並只提供 dist。
- **驗收命令：** 建好 scripts/test 後才跑 `npm test`、`npm run check`、`npm run build`。確認無外部資源、M1 有 noindex、沒有 `dist-production/`、server 只 loopback。此任務未建 `check:http` 前不要執行該命令。
- **完成條件：** 三命令成功；輸出只有明確允許的兩個語言頁、必要同源 JS/CSS；記錄實際 bytes/hash 和錯誤。

### T02 — 嚴格 schema、BigInt 核心與報告

- **前置：** T01 完成；骨架 `npm test`、check、preview build 通過。
- **Allowed paths：** `public/js/core/schema.mjs`、`public/js/core/calculate.mjs`、`public/js/core/report.mjs`、`test/core.test.mjs`、`test/report.test.mjs`。
- **步驟：** 精確實作 `calculateRestockPlan(input)`、結果 schema、第一錯誤優先序、長度先驗、getter 不執行、BigInt 計算、safe JSON 整數與一致性驗證 formatter。每個案例用手寫 expected；不得依被測函式產生 oracle。
- **驗收命令：** `npm test`、`npm run check`。
- **完成條件：** ACCEPTANCE.md 所有 C 案例通過；getter counter 為 0；所有原始輸入不變；output 可 JSON stringify 且不含 BigInt；沒有部分計算或跳過非法品項。

### T03 — 雙語工作表與本機狀態

- **前置：** T02 完成；核心與報告測試通過。
- **Allowed paths：** `public/index.html`、`public/en/index.html`、`public/js/app.js`、`public/styles/app.css`、`public/styles/tokens.css`、`public/js/core/**`（只限修正本階段發現的介面契約問題）、`test/app-state.test.mjs`。
- **步驟：** 建繁中/英文獨立工作表、共用天數欄、可增刪 1–30 品項、明示假設、頁內範例/清除/離開確認、成功結果與完整 readonly 報告。輸入變更立即失效；IME composition 時也立即失效舊結果但不重寫欄位/驗證/搶焦點。使用安全文字 API、無 storage/URL/network/console。
- **驗收命令：** `npm test`、`npm run check`、`npm run build`。
- **完成條件：** app state 測試涵蓋輸入失效、刪改、確認取消、pagehide 清除、BFCache 初始狀態與無 JS disabled contract。不得用 Node/DOM harness 宣稱 UI 通過。

### T04 — M1 輸出、安全標頭與 HTTP gate

- **前置：** T03 完成；所有離線 core/app-state 測試通過。
- **Allowed paths：** `package.json`、`scripts/serve.mjs`、`scripts/check.mjs`、`scripts/http-check.mjs`、`test/http.test.mjs`、`public/**`、`dist/**`、`HANDOFF.md`、`TASK-ENTRY.md`、`project.json`。
- **步驟：** HTTP 實際檢查 GET/HEAD、405+Allow、Host、精確 MIME/路由、根與未知路徑 404、noindex、CSP/安全標頭、只提供 dist。確認 M1 沒 inline JS/CSS、遠端資產、production 候選或 secret。server 測試程序只能由本次 harness 啟動/結束；port 衝突就停止並回報，不碰未知程序。
- **驗收命令：** 先增加 `check:http` script 和 harness，再跑 `npm test`、`npm run check`、`npm run build`、`npm run check:http`。`npm run dev` 只在需要明確檢查 loopback server 時執行；不得開 browser/UI。
- **完成條件：** 所有 HTTP oracle 與安全標頭通過，環境 guard 前後相同，source/diff 範圍合規。UI/IME/mobile/AT/network/storage/BFCache 依真實證據標 `NOT_RUN_USER_FOCUS_INCIDENT` 或其他精確 NOT_RUN；不自行填 PASS。更新 `HANDOFF.md`、`TASK-ENTRY.md`、`project.json` 寫實際 M1 狀態。

## M2 — 主代理 GO 後的 source 與 production 候選

### T05 — 獨立 production 輸出與公開 source

- **前置：** M1 原功能對話完整交接；主代理書面 GO；Git guard、Windows 安全規則與 `docs/GIT-PUBLICATION-SAFETY.md` 全部可遵守。必要認證缺失就停止回報，不修改 auth/config。
- **Allowed paths：** `package.json`、`.gitignore`、`public/**`、`scripts/**`、`test/**`、`dist-production/**`、`HANDOFF.md`、`TASK-ENTRY.md`、`project.json`；另僅允許本工具在 `.runs/restock-planner/` 下新建的一個 M2 證據子目錄。不可改六份核准規格、共用首頁或兄弟專案。
- **步驟：** 增加獨立 `dist-production/`、production build/check/preview/release-check；實際核對正式雙語 URL/canonical/hreflang/x-default、visible FAQ/JSON-LD 精確 CSP hash、robots/sitemap、404 noindex、安全 headers、Host/route、closed file allowlist 與 M1 bytes 不變。通過後以審核 copy 發布到獨立 public repo `KYStr/glossquote-labs-restock-planner`，驗證 remote commit/visibility 並記錄證據；遵守 Git guard 和 per-command `git -c` 限制。
- **驗收命令：** `npm test`、`npm run check`、`npm run build`、`npm run check:http`、`npm run build:production`、`npm run check:production`、`npm run release:check`；以 `npm run preview:production` 驗 loopback `127.0.0.1:5217`。只在所有本機檢查通過及 GO 已有後發布 source；不得 Cloudflare deploy。
- **完成條件：** production candidate 和 public source 的 commit、visibility、hash、HTTP/SEO/check 證據寫入本工具 HANDOFF/evidence；source publication 不標 live hosting；UI gate 保留實際 NOT_RUN。

## M3 — 主代理 hosting 與首頁

### T06 — 部署與雙語首頁整合（主代理專責）

- **前置：** T05 source/production 候選經主代理驗收；主代理明確執行發布步驟。
- **Allowed paths：** 僅主代理在其發布/首頁任務中指定的部署與共用首頁路徑；原功能對話不得執行、不得先行改首頁或呼叫部署工具。
- **步驟：** 主代理確認免費部署/網域、M3 設定與正式 assets，部署 `restock.glossquote.com`，更新兩語首頁並驗 live HTTP、導航、SEO/headers/core。
- **驗收：** 由主代理記錄實際 live URL、提交/部署版本、雙語首頁及 NOT_RUN UI 項目；external review 只有外部驗證後才可更新。
- **完成條件：** live 狀態有可重現證據；M3 完成也不等於外部驗收通過。

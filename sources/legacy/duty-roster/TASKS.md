# 任務閘門：輪值排班表

> 這份清單是未來實作順序，不代表任務已執行。每次只做一個 milestone；失敗後修正原 gate，再由主代理放行下一個 milestone。

## 通用規則

- 原功能對話 requested model 設定為 gpt-6.1-sol / max；設定值不等於已驗證的 backend identity。遵守 AGENTS.md，不遞迴委派、不另開功能對話、不要求使用者轉貼提示。
- 每個 T 任務完成時回寫 HANDOFF.md：實際修改路徑、精確命令/exit、Node 版本、manifest bytes/SHA-256、瀏覽器實際觀測、NOT_RUN 與風險。證據僅寫 AGENTS.md 允許的唯一根目錄 .runs/duty-roster/<本次唯一 task id>/。
- 各任務僅在列出的專案路徑修改；共用首頁、根專案、兄弟工具及本文件列出的共用固定文件不在功能對話允許路徑。需要 shared integration 時交主代理。
- M1 只本機；主代理明確放行 M1 後才開始 M2；M2 source 通過後才由主代理執行 M3。每一 gate 的失敗項不得勾選後續項目。

主代理M0補充允許範圍：各T任務都可更新本工具HANDOFF.md、START-HERE.md、project.json、docs/RELEASE-CANDIDATE.md及只追加TASK-ENTRY.md的真實狀態；dist/**及dist-production/**僅由已審核建置腳本生成。必要的本工具純函式helper與test fixture可新增在public/js/core/**、scripts/*.mjs、test/**，保持產品schema/API與所有已規定行為不變，回報精確新增路徑。不得藉此改PRODUCT/TECHNICAL/ACCEPTANCE門檻或共用規範。

M2不得把正式SEO寫回preview public/；production-only標頭、robots、sitemap、404與HTML轉換均由離線build:production在dist-production產生。M1 public運算與介面凍結；必要更動先回主代理確認受影響的M1重驗。M2必須提供release:check或check:release（離線驗source allowlist/config/固定產物）。主代理對M1放行時可一併授權整個M2的必要公開來源流程，T07不另外創造使用者批准關卡；原對話仍須自行完成具體來源副本審查與全部安全gates。

## M1：本機完整產品

### T00 — Scaffold、環境與研究閘門

- 前置：主代理接受本規格；工作樹無同路徑衝突。只讀確認 Node executable 版本，不改 persistent environment 或 PATH。
- allowed paths：package.json、.gitignore、scripts/serve.mjs、scripts/check.mjs、scripts/build.mjs、public/index.html、public/en/index.html、public/styles/app.css、public/js/app.js、public/js/core/roster.js、public/js/core/report.js、test/roster.test.mjs、test/report.test.mjs、test/ui-state.test.mjs、test/security-contract.test.mjs、test/browser-checklist.md、HANDOFF.md。
- 實作：建立 ESM/private package，四個共用 npm 命令、127.0.0.1:4209 loopback server、只提供 public/ 的 MVP scaffold、真正檢查必要檔案/ESM/危險或外部資源/allowlist 的 check、離線 build 複製到 dist。不得先做不安全的簡化驗證或假測試。
- 驗收：記錄 Node >=24 的完整路徑與 node --version；執行 npm run check、npm test、npm run build；啟動 npm run dev 並只用明確任務程序驗 127.0.0.1:4209，port 衝突不得終止既有程序。
- 完成條件：命令不是空殼；server 僅 loopback、GET/HEAD、有明確 MIME/404/405、無 SPA fallback，只提供 public；dist preview noindex,nofollow；Node 沒有新增依賴。回寫 HANDOFF，狀態仍為 M1 in progress。

### T01 — 日期純函式、schema 與輪替核心

- 前置：T00 通過。
- allowed paths：public/js/core/roster.js、test/roster.test.mjs、test/security-contract.test.mjs、HANDOFF.md。
- 實作：依 TECHNICAL.md 精確 schema/error 優先順序實作 calculateRoster；用整數 Gregorian ordinal、ISO weekday、有限範圍及固定游標演算法。補 C01–C27、C32 的獨立手寫 expected 值與非突變/security cases；測試不得讀網路或真實個人資料。
- 驗收：node --test test/roster.test.mjs test/security-contract.test.mjs；npm run check。
- 完成條件：所有 error code/path、稀疏/accessor/symbol/custom properties、閏日/366/367、無輪值日期、無候選、重名/序號和三個手算例符合規格。修正若影響核心需重跑本 gate。回寫 HANDOFF。

### T02 — Product App 與雙語主要流程

- 前置：T01 通過。
- allowed paths：public/index.html、public/en/index.html、public/js/app.js、public/styles/app.css、public/js/core/roster.js、public/js/core/report.js、test/ui-state.test.mjs、test/browser-checklist.md、HANDOFF.md。
- 實作：建立繁中/英文表單、text + numeric-mode 日期欄、初始預設、載入範例確認、1..30 名單、新增/刪除/上移/下移、局部 weekday disclosure/摘要/全選/全清、逐欄錯誤與結果表。初始 controls disabled、input 無 name；先同步註冊事件再啟用；所有表單 submit handler 的首個動作 preventDefault。只用 value/textContent 顯示姓名。
- 驗收：npm run check、npm test；用實際本機 4209 瀏覽器執行 B01–B08、B19 的雙語假資料主流程，記錄 browser/版本/尺寸和結果。
- 完成條件：桌面/手機 wireframe 順序一致，序號區分同名，動態結果、空/錯誤/部分狀態文字完整；不把首頁、裝飾或 model 替代主要任務。回寫 HANDOFF。

### T03 — 報告、複製/下載競態與清理

- 前置：T02 通過。
- allowed paths：public/js/core/report.js、public/js/app.js、public/index.html、public/en/index.html、public/styles/app.css、test/report.test.mjs、test/ui-state.test.mjs、test/security-contract.test.mjs、test/browser-checklist.md、HANDOFF.md。
- 實作：依 TECHNICAL.md 建立中英文 buildReport 固定格式；報告每個未排日期及每個成員序號均完整；手動 copy、固定 .txt download、8 個 URL/30 秒 timeout/回收上限、revision/request ID/copy epoch/page generation 競態、clear 確認與 pagehide/pageshow 清除。清除不宣稱刪掉已下載檔案或取消已提交的瀏覽器操作。
- 驗收：node --test test/report.test.mjs test/ui-state.test.mjs test/security-contract.test.mjs；npm run check；人工跑 B11–B17、B20，原生 API 與真正 BFCache 依實際能力分開記錄。
- 完成條件：copy/report 完全一致，zh-TW/en、UTF-8 no BOM/LF/no final LF/fixed filename 已精確測試；編輯或離頁後舊 promise 不更新 UI；URL/timer 無未清理分支。mock 只驗可注入競態，不冒充原生功能。回寫 HANDOFF。

### T04 — 安全、SEO、響應式與完整 M1 驗收

- 前置：T01–T03 通過。
- allowed paths：package.json、.gitignore、scripts/serve.mjs、scripts/check.mjs、scripts/build.mjs、public/index.html、public/en/index.html、public/styles/app.css、public/js/app.js、public/js/core/roster.js、public/js/core/report.js、test/roster.test.mjs、test/report.test.mjs、test/ui-state.test.mjs、test/security-contract.test.mjs、test/browser-checklist.md、HANDOFF.md。
- 實作：完善靜態危險 API/外部資源/allowlist檢查、preview noindex,nofollow、明確語言 metadata、錯誤關聯、keyboard/focus/status semantics、320px局部捲動、200% zoom、30人成員密集情境。重查所有輸入呈現、資料生命週期、非同步 invalidation；不放寬 CSP/security 基線來讓功能通過。
- 驗收：在候選輸入定稿後各執行 npm test、npm run check、npm run build 一次；再人工完成 ACCEPTANCE.md 必要 M1 cases，對全程觀察有實際證據才記通過。
- 完成條件：固定 manifest、測試命令及 exit code、兩語實際流程和必要邊界證據完整；無法執行的真機/完整 Network-Storage/BFCache項目依明文政策 NOT_RUN 並寫影響。原對話回報候選，M1 只有主代理獨立驗收放行後才算通過；不得自行進入 M2。回寫 HANDOFF。

## M2：Production candidate 與公開來源

### T05 — 主代理 M1 review gate（不改碼）

- 前置：T04 已完整提交證據。由主代理獨立驗收。
- allowed paths：HANDOFF.md（只追加 gate 結果）；測試證據僅限 AGENTS.md 許可的本次唯一 .runs 子目錄。
- 驗收：主代理檢查差異範圍、固定 schema/錯誤順序、手算測例、真實瀏覽器證據和所有 NOT_RUN。未明確放行不得開始 M2。
- 完成條件：主代理明確寫 M1 PASS/放行；若退回，返回 T01–T04 的原 owning task 修正並只重跑受影響 gate。

### T06 — Production 靜態候選與本機 HTTP 模型

- 前置：T05 主代理明確 M1 PASS。
- allowed paths：package.json、scripts/model.mjs、scripts/build-production.mjs、scripts/check-production.mjs、scripts/preview-production.mjs、public/index.html、public/en/index.html、public/_headers、public/robots.txt、public/sitemap.xml、wrangler.jsonc、test/production.test.mjs、test/seo.test.mjs、HANDOFF.md。
- 實作：production build 獨立產生 dist-production，不覆蓋 M1 dist；只加入固定 origin https://rota.glossquote.com、/index.html 與 /en/index.html self-canonical、雙向 zh-Hant/en/x-default 中文、精確 robots/sitemap/headers/CSP、靜態 assets-only Wrangler 設定。建本機模型於 127.0.0.1:5209，只模擬回應路由/headers；不呼叫 Cloudflare、不裝 CLI、不讀 token、不加 runtime/worker/API 或遙測。
- 驗收：npm run build:production、npm run check:production、npm run preview:production；用真實 browser/HTTP 檢查模型輸出與 404、headers、robots allow/disallow 最長匹配、canonical/sitemap。記錄此為 local candidate/model，不是正式站。
- 完成條件：M1 dist 保持固定、production 路徑/headers可重現，preview noindex,nofollow；主代理可檢閱來源副本、production manifest、全部測試和 NOT_RUN。回寫 HANDOFF。

### T07 — M2 source review 和公開 GitHub

- 前置：T06 全部本機 gate 通過且主代理明確 review M2 發布副本。Standing user instruction 已授權公開 source；不需再次詢問使用者。
- allowed paths：審核過的獨立本工具 publishing copy；HANDOFF.md；AGENTS.md 指定唯一 .runs/duty-roster/<task id>/ 證據資料夾。不可在根工作樹/兄弟工具執行 push。
- 實作：依 docs/GIT-PUBLICATION-SAFETY.md 使用 per-command git -c 和已存在官方 CLI 認證，發布 public KYStr/glossquote-labs-duty-roster。發布前 capture、發布後 verify Git settings guard；保留 Windows environment guard；不讀/輸出 credential，不做 global/system Git/gh 寫入。來源 ZIP 從固定 commit git archive 產生。
- 驗收：確認 repository public visibility、remote commit、clean source ZIP 根目錄、每檔與 git blob bytes/hash 一致；乾淨 copy 跑固定 test/check/build/production gates；各設定 guard before/after 結果與 manifest 寫入 HANDOFF。
- 完成條件：remote commit/visibility/ZIP證據匹配 M2 candidate，無設定漂移。任何認證缺失或 guard 漂移立即停並交主代理；不得嘗試設定認證或猜測還原。這只是 source publication，不是網站已部署。

## M3：主代理免費 Cloudflare 與雙語首頁

### T08 — 主代理 live release（功能對話不部署）

- 前置：T07 公開來源通過，主代理完成 M2 acceptance；主代理運用已授權 Cloudflare exact-file loader。
- allowed paths：無；功能對話不修改共享首頁、Cloudflare、憑證、DNS、其他 repo 或根目錄。主代理可依發布契約修改允許的 release/config/catalog 位置。
- 驗收：主代理部署至 rota.glossquote.com，驗正式雙語內容、headers/SEO/404/流程，再把首頁 catalog 草稿轉已發布、重建/驗證/發布首頁 source、部署首頁並驗兩語入口。
- 完成條件：HANDOFF 記錄 source commit、live hosting 狀態、首頁狀態及各 NOT_RUN。標記 awaiting external review；外部尚未確認前不得標版本 complete。後續外部修正返回原功能對話與對應 owning task。

## 相關固定文件

全程遵守[開始說明](START-HERE.md)、[功能對話契約](AGENTS.md)、[工程契約](docs/ENGINEERING.md)、[隱私與安全](docs/PRIVACY-SECURITY.md)、[設計系統](docs/DESIGN-SYSTEM.md)、[發布契約](docs/RELEASE.md)、[Git 發布安全](docs/GIT-PUBLICATION-SAFETY.md)和[交接紀錄](HANDOFF.md)。task 入口與目前 gate 另見 TASK-ENTRY.md、docs/RELEASE-CANDIDATE.md、project.json。

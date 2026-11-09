# 開始：訂閱費用盤點

2026-10-16：主代理已獨立通過 M1（45/45、check/build、250 獨立案例及真瀏覽器）並明確放行 W16-27-M2。M2 正式候選最終 50/50 tests、check/build/build:production/check:production/release:check 全 exit 0；正在執行已授權的獨立 public GitHub 發布。正式部署、首頁整合與外部驗收尚未執行。B13 真停用 JS 等工具能力不足人工項目，依使用者授權保留 NOT_RUN，不冒稱通過，亦不需重新申請。

閱讀順序：AGENTS.md → PRODUCT.md → TECHNICAL.md → UX-SEO.md → ACCEPTANCE.md → TASKS.md → docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md、docs/DESIGN-SYSTEM.md、docs/RELEASE.md。HANDOFF.md 與 TASK-ENTRY.md 記錄實際進度，project.json 記錄固定版本。

本原功能對話負責 M2 公開來源與正式候選，M3 部署及共用首頁仍由主代理處理。只在本工具資料夾工作。已有 npm test、npm run check、npm run build、npm run dev、npm run build:production、npm run check:production、npm run preview:production、npm run release:check；Node >=24 ESM/built-ins，零安裝依賴，不需 npm install。先 build 再 dev；正式模型先 build:production。若 PATH 沒有 npm，使用 C:/Program Files/nodejs/npm.cmd，不更動 PATH。

預覽：127.0.0.1:4207/index.html 及 /en/index.html。未發布網址：https://subscriptions.glossquote.com/index.html。新功能只在確認正式部署後才可進首頁 published 清單。

固定候選：[HANDOFF.md](HANDOFF.md)、[docs/RELEASE-CANDIDATE.md](docs/RELEASE-CANDIDATE.md)。M1 證據在根 .runs/subscription-budget/w16-27-m1-20261016-01a141f4/，M2 在 .runs/subscription-budget/w16-27-m2-20261016-01a141f4/；不得將本機證據目錄發佈。正式模型 127.0.0.1:5207 仍僅本機。

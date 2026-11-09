# 開始：活動流程時間表

2026-10-16：M1 已獲主代理獨立驗收及 M2 GO。M2 production candidate 已建立，發布案例包含robots渲染資產允許與Cloudflare實際_headers合併/移除語意。release:check 首次發現正式M0的DISPATCH.md不在白名單，經主代理明確授權逐名補入後PASS（51 sources），未廣泛忽略未知檔。公開來源與最終命令結果見HANDOFF；尚未部署。人工未驗項目維持。

閱讀順序：AGENTS.md → PRODUCT.md → TECHNICAL.md → UX-SEO.md → ACCEPTANCE.md → TASKS.md → docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md、docs/DESIGN-SYSTEM.md、docs/RELEASE.md。HANDOFF.md 與 TASK-ENTRY.md 記錄實際進度，project.json 記錄固定版本。

使用 Node >=24 ESM/built-ins，零安裝依賴，不需 npm install。npm test、npm run check、npm run build、npm run build:production、npm run check:production、npm run release:check 是本機 gates。npm run dev 提供 public/；npm run preview:production 提供已檢查的 dist-production/。build 只重建 noindex 的 dist/，build:production 只重建獨立正式候選，不覆寫 preview。wrangler.jsonc 只是閉合的部署設定，M2不執行部署。完整證據與限制見 HANDOFF.md 和 docs/RELEASE-CANDIDATE.md。

預覽：http://127.0.0.1:4205/index.html 及 http://127.0.0.1:4205/en/index.html。dev 只綁 loopback，提供 public/，未知路徑為真正 404。未發布網址：https://agenda.glossquote.com/index.html。新功能只在確認正式部署後才可進首頁 published 清單。

正式候選 HTTP model：http://127.0.0.1:5205/index.html、/en/index.html，current exec session26152；M1 dev session25202仍保留。M3與首頁由主代理處理；來源發布不等於網站已上線。

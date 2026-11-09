# GlossQuote Labs

一個共用 repo，讓本地與雲端接續免費、以使用者電腦處理資料的工具家族。

**先讀 [START-HERE.md](START-HERE.md)**，再讀[接續說明書](docs/AGENT-HANDBOOK.md)。這裡保存首頁、工具固定來源、完整預案、唯一承接登記與驗收證據；新工具在 `tools/<slug>/` 製作，不再新開一個 repo。

- [工作總表與狀態](docs/WORK-STATUS.md)
- [可以承接的預案](docs/READY-STOCK.md)
- [來源索引](coordination/source-index.json)與[目錄/遷移方式](docs/SOURCE-LAYOUT.md)
- [GitHub協作規則](docs/CLOUD-LOCAL-WORKFLOW.md)、[唯一registry](coordination/work-registry.json)、[命令格式](docs/COORDINATION-COMMANDS.md)
- [製作清單](docs/IMPLEMENTATION-CHECKLIST.md)、[獨評/退修/發布](docs/REVIEW-AND-RELEASE.md)
- [本輪整合報告](docs/consolidation/2026-11-09/REPORT.md)、[歷史首頁紀錄](HISTORICAL-HOME-README.md)

Node.js >=24；首頁零runtime dependency。根目錄測試只涵蓋首頁及coordination，不會遞迴執行保存的工具快照。

```sh
node scripts/workspace.mjs list
node scripts/workspace.mjs ready cloud-dot
node scripts/workspace.mjs show text-workbench
npm test
npm run check
npm run build:preview
npm run check:generated:preview
```

ready未消耗預案目標40；不足補規格P1，工具製作P3。每actor預領5件、同時1件working。讀最新registry並完成claim/readback才開工。來源副本/作者回報/目錄published不等於這輪獨立accepted。accepted、正式部署與使用者外部驗收分開記錄。

[正式繁中首頁](https://glossquote.com/index.html) · [English homepage](https://glossquote.com/en/index.html)。目前的展示入口以catalog為準；這次來源整理沒有改部署或宣告所有工具重新驗收。

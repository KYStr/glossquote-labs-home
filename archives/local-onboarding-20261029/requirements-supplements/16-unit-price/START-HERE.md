# 購物單價比較開工入口

2026-10-13：主對話已親驗 M1 PASS 並明確放行 UP-M2-T01；M2 正式候選／PUBLIC來源／固定 ZIP 已凍結為 READY_FOR_INTEGRATION，待主對話 M2 驗收與 M3 部署整合。實際證據、逐項 NOT_RUN 和服務資訊見 HANDOFF 與 project.json。

先讀 [AGENTS](AGENTS.md)、[TASK-ENTRY](TASK-ENTRY.md)、[PRODUCT](PRODUCT.md)、[TECHNICAL](TECHNICAL.md)、[UX-SEO](UX-SEO.md)、[ACCEPTANCE](ACCEPTANCE.md) 與 [TASKS](TASKS.md)。依 [隱私](docs/PRIVACY-SECURITY.md)、[工程](docs/ENGINEERING.md) 和 [設計](docs/DESIGN-SYSTEM.md) 實作。

已完成本輪授權 M2：正式 build/check/regressions、純靜態 Workers 配置與 offline dry-run、同語言首頁 backlink、獨立 PUBLIC GitHub 來源及固定 commit ZIP。保持檔案凍結，不自行部署、讀 Cloudflare token 或改首頁。M3 由主對話序列部署及首頁整合；外部確認前仍不結案此版本。

命令在本工具目錄執行：`npm test`、`npm run check`、`npm run build`（noindex preview）；`npm run build:production`、`npm run check:production`、`npm run test:production`。`npm run dry-run:production -- --cli /absolute/path/to/wrangler/bin/wrangler.js` 僅用既有 Wrangler4.147.0、隔離環境且不部署；不自動安裝套件。原 `npm run dev` 服務仍保留（http://127.0.0.1:4196/）。

實測 Node v24.14.0／npm11.9.0：本機、reviewed publishing copy、固定 ZIP 解壓副本均68 tests PASS；production regressions11 PASS，全部必要 check/build/dry-run exit0。PUBLIC repo https://github.com/KYStr/glossquote-labs-unit-price，固定commit49e38e4b3cf9626bde184eae279ec76973a9a033；28個source blob逐檔bytes核對通過，13個production assets在三處建置一致。最新manifest `.runs/unit-price/m2-20261013-01/source-manifest.json`；M1證據保留。原預覽PID38864／兩語URL保留，不停止他人服務。Cloudflare正式站、雙語首頁catalog/live整合與外部驗收仍 NOT_RUN。

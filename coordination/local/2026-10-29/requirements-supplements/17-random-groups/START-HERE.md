# 名單隨機分組開工入口

2026-10-13：**READY_FOR_INTEGRATION / OWNER_RELEASED**。M1_PRIMARY_PASS；M2 的 57/57、check、兩種 build、production check、source check、Wrangler4.147.0隔離dry-run，以及固定ZIP逐38個Git blobs與完整解壓重驗均PASS。公開來源 [KYStr/glossquote-labs-random-groups](https://github.com/KYStr/glossquote-labs-random-groups) 已核實PUBLIC及HEAD `a8711a7cb8dc477dfee18c5667935c5be44602e1`。部署、首頁與外部複驗尚未開始，由主代理M3整合。以 [HANDOFF.md](HANDOFF.md) 和 [project.json](project.json) 的目前狀態為準。

開始前依序讀 [AGENTS.md](AGENTS.md)、[TASK-ENTRY.md](TASK-ENTRY.md)、[PRODUCT.md](PRODUCT.md)、[TECHNICAL.md](TECHNICAL.md)、[UX-SEO.md](UX-SEO.md)、[ACCEPTANCE.md](ACCEPTANCE.md)、[TASKS.md](TASKS.md)，以及 [隱私安全](docs/PRIVACY-SECURITY.md)、[工程](docs/ENGINEERING.md)、[品牌](docs/BRAND.md)、[設計系統](docs/DESIGN-SYSTEM.md) 和 [發布契約](docs/RELEASE.md)。此資料夾自包含，不依賴其他工具的原始碼。

第一階段只做 M1/T00：完成繁中／英文可用本機工具、核心純函式與獨立預期測試、嚴格的開發預覽／檢查／build。M1 完成後凍結並交主代理實際檢查；沒有主代理明確放行，不開始 M2。

M1 命令在本專案目錄執行：`node --version`、`npm test`、`npm run check`、`npm run build`、`npm run dev`。目前 Node 24.14.0，預覽已保留在 `http://127.0.0.1:4197/index.html` 和 `/en/index.html`，PID 34032。預設開發埠為 `4197`，臨時瀏覽器測試埠為 `5197`；埠被占用時保留原程序，改用 OS 分配埠並回報實際 URL。

原功能 chat 已建立：`01a13361-86f1-7e13-a1ef-573ec200bc4f`，host `local`。create_thread 接受請求 `gpt-6.1-sol` / `max`；backend 身份**未獨立確認**。固定 code manifest 在孵化器 `.runs/random-groups/m1-20261013-01a13361/code-manifest.json`，不是產品 runtime 依賴。

M2 已固定，owner釋放：孵化器 `.runs/random-groups/m2-20261013-01a13361/code-manifest-m2.json` 記錄21個code、38個公開source和11個production檔。production 命令為 `npm run build:production`、`npm run check:production`、`npm run release:check`。原始 public 頁與預設 build 保持 noindex，production build 才加入固定正式 metadata 與 11 項静態產物。每次要發布 hosting 前必須重建並驗 production，不能上傳 preview。

瀏覽器剪貼簿注入／原生貼上、完整 Network/Storage、實際 BFCache、200% zoom、停用 JS、讀屏／真機與 production HTTP 未完整執行；逐項狀態見 HANDOFF。不得以 Node harness 或 source scan 取代這些人工證據。PRODUCT/TECHNICAL/UX-SEO/ACCEPTANCE/TASKS 的 SPEC_ONLY 開頭保留作需求基線，本頁和 HANDOFF 是目前工作狀態。

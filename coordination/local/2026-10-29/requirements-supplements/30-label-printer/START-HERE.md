# 開始：物品標籤列印

**目前唯一部署候選為 M2-R1**：PUBLIC commit `3cc239b1476baa18adb62d649f49588432608c6b`，等待主代理獨立驗收。先前 `55f8387a…` 被主代理阻止整合，原因是 production source manifest 落在部署 assets 內；以下 M2／M1 紀錄為歷史，舊版不可部署。

R1 已把 production manifest 移至工具根 `dist-production-manifest.json` 並 gitignore；實際 dist-production/ 嚴格只有 12 個 PRODUCTION_FILES，沒有 inventory/source metadata。新增兩個回歸，最終 workspace／clean copy **133/133**，六命令全 exit 0，manifest byte-identical。新 ZIP 95413 bytes、41 files，SHA-256 `95fe375cd33c24409492b5cb280a9696bb3597d8789ba15e15dec873ed514348`。完整證據在原唯一 evidence 下 m2/r1/，參閱 HANDOFF 的 R1 區段。

R1 只用背景 CLI／檔案／HTTP；沒有任何 UI 重驗、Cloudflare 呼叫、部署或首頁修改。全部互動 UI 仍 NOT_RUN_USER_FOCUS_INCIDENT。新 commit／ZIP 已凍結，不再為狀態新增 commit。以下為 pre-R1 M2 與 M1 歷史。

目前狀態（2026-10-18）：主代理已放行 M1／M2；M2 production 工具鏈及 PUBLIC GitHub 來源已完成，等待主代理獨立驗收。這裡沒有部署或首頁修改。公開來源 https://github.com/KYStr/glossquote-labs-label-printer ，固定 commit `55f8387a1eb1d335a57ec9cd4fa1864ba34fbf48`，branch `codex/m2-label-printer`。固定 ZIP／41 檔逐 Git blob 核對與全部交接見 HANDOFF.md 的 M2 區段。

最終工作區與審核公開副本均為 131/131 tests，check／build／build:production／check:production／release:check 全 exit 0；public/ 十檔及六規格保持 M1 bytes。preview 4210 與 production HTTP model 5210 僅 loopback，後者 session 28881，非 live 部署。根唯一證據目錄下 m2/ 保存公開來源與來源 ZIP／guard／clean-copy／HTTP 證據。

**目前禁止全部本機互動 UI automation**，含 hidden IAB 的讀取／導航／截圖／輸入／viewport；僅背景 CLI、HTTP 與檔案工作。使用者「可以操作，但不能影響到我」未恢復 IAB 輸入權限；主代理證實真正隔離前不重試、不換技術、不輪詢。後續 UI 項為 NOT_RUN_USER_FOCUS_INCIDENT，原生／真機等既有 NOT_RUN 照留。

以下為原 M1 歷史交接，不能當成目前 M2 未放行的狀態；M1 固定證據不改寫。

2026-10-18：M1 本機候選已固定，等待主代理獨立驗收與明確 M2 GO。先讀 AGENTS.md（包含最新「只用隔離隱藏瀏覽器分頁」測試限制），再讀 HANDOFF.md 與 docs/RELEASE-CANDIDATE.md。六份規格保留 M0 原文及 hash，不以其舊狀態文案判斷目前里程碑。

Node v24.14.0、npm 11.9.0、ESM built-ins、零套件。必要命令：npm test（116/116）、npm run check、npm run build，最終各 exit 0。npm run dev 只綁 127.0.0.1:4210；本輪保留執行中的候選預覽（session 9848）。M1 全部 noindex/nofollow。

固定 dist/manifest.json SHA-256：ac8bd6d532e1d8cd4fe8d80836945ba6d24ecf82bb70c2ff3cb8974a0f72746a。完整證據在根 .runs/label-printer/W18-30-M1-01a14c6b-20261018/，含固定全檔清單、命令、UI 截圖、NOT_RUN、Windows guard 前後完整比對。不得把原生列印／真機／完整 Network-Storage 等未驗項寫成 PASS。

M2 尚未放行，不能發布。主代理 GO 後才由本原 chat 建 production 工具鏈及 model 127.0.0.1:5210、審核隔離副本、執行 Git settings guard，再公開 KYStr/glossquote-labs-label-printer。M3 免費部署 labels.glossquote.com 與首頁僅主代理負責。來源、hosting、首頁、外部驗收都仍未開始。

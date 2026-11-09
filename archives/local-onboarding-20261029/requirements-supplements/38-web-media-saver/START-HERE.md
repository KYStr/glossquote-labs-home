> 最新狀態（主代理，2026-10-22）：已公開 GitHub、部署並更新雙語首頁與看板；限定範圍主驗通過，等待外部驗收。詳見 [正式發布驗收](RELEASE-ACCEPTANCE.md)。下方保留各階段歷史狀態，不代表目前仍未部署。

# 開始閱讀

本專案已由手動便攜助手改為**完全網頁、全部本地、僅支援瀏覽器可讀來源**。

2026-10-22：[WEB-M1候選主驗通過](PRIMARY-ACCEPTANCE.md)；任務 A 已取得固定 GO，任務 B 的[公開來源](https://github.com/KYStr/glossquote-labs-web-media-saver)已驗證，commit `8716a264c6d6866d2343a0b7ec7b2a163dc797c7`。Hosting／正式站驗證及外部驗收尚待主代理流程。

1. 本輪先讀 [WEB-RELEASE](docs/WEB-RELEASE.md)：A 固定正式候選，B 在主代理 GO 後由原對話公開 source，部署與首頁由主代理完成。不要越過當前任務。
2. [現行 WEB-M1](docs/WEB-M1.md) 保留產品與已驗能力邊界；各平台作品頁下載與更多格式尚未實作，不因發布而改標支援。
3. 查看 [TASK-ENTRY](TASK-ENTRY.md) 與 [原對話規範](AGENTS.md)。原對話不操作任何 browser/native UI、不委派、不自行部署。
4. [HANDOFF](HANDOFF.md) 記錄固定 hash、命令與真實 PASS／NOT_RUN；[README](README.md) 列 preview 與固定 release 重現命令。既有 M0 核心與全部 public UI／處理核心保持不變。
5. 使用者需要一個驗收 ZIP，由主代理整合；這是開發交接包，產品不要求下載助手 ZIP。

不得用 M0 測試代表實際下載、瀏覽器相容或部署完成。不得影響使用者電腦；功能對話不啟動瀏覽器。正式發布需要主代理固定候選驗收與原對話 source push，再由主代理部署和更新首頁。

目前原對話已完成 source push 並停止編輯；公開 repo 的預設分支為 `codex/web-media-saver-release`。公開副本移除內部操作文件、私有證據連結與機器路徑，保留核准35個程式／config的exact bytes及尚未實作的PRODUCT-NEXT路線；原工作區與歷史證據均保留。

快速核對：`npm run build` 仍 preview/noindex；`node scripts/release.mjs` 才固定正式 origin 並驗證 `dist`。正式候選有可索引 metadata 不等於已上線。發布工具鏈固定 Wrangler 4.147.0，沒有本輪安裝／升級；不要為部署改全域 Git／gh 認證、持久環境或讀出 Token。

# GlossQuote Labs 接續入口

這個 repo 同時保存首頁、工具原始碼快照、完整預案、唯一承接登記與驗收紀錄。先讀此頁，不必逐一尋找各工具 repo。

1. 讀最新 [AGENTS.md](AGENTS.md) 與 [接續說明書](docs/AGENT-HANDBOOK.md)。
2. 查看 [工作總表](docs/WORK-STATUS.md)，但承接前必須重讀遠端 [work-registry.json](coordination/work-registry.json)。總表是某個時間的快照，不是鎖。
3. 選擇 [可用預案](docs/READY-STOCK.md)。只有 `ready`、未消耗且有獲准環境的未承接 production task 才能領取；其他文件再完整也不能跳過承接。
4. 查 [來源索引](coordination/source-index.json) 或執行 `node scripts/workspace.mjs show <slug>`。保留原作者及候選，不另外重做。
5. 自己 ACK、claim、讀回後，才在 `tools/<slug>/` 與自己的 `codex/` 分支實作；已有 owner 的任務交回原 owner。
6. 固定 GitHub PR/commit 交驗；獨立審查通過後才 accepted。部署、雙語首頁及使用者外部驗收是後續不同步驟。

| 我要做什麼 | 看哪裡 |
| --- | --- |
| 第一次加入／中斷後恢復 | [完整接續說明書](docs/AGENT-HANDBOOK.md) |
| 找已有功能與正式網址 | [工作總表](docs/WORK-STATUS.md)、[公開目錄](catalog.json) |
| 找程式／候選／版本差異 | [來源配置與遷移規則](docs/SOURCE-LAYOUT.md) |
| 承接與衝突處理 | [協作規則](docs/CLOUD-LOCAL-WORKFLOW.md)、[精確命令格式](docs/COORDINATION-COMMANDS.md) |
| 製作下一個工具 | [製作與交驗清單](docs/IMPLEMENTATION-CHECKLIST.md)、對應 SPEC.md |
| 當 reviewer 或發布整合者 | [審查與發布說明](docs/REVIEW-AND-RELEASE.md) |
| 補預案／判斷庫存 | [預案品質與補庫](docs/SPECIFICATION-STOCK.md) |
| 本輪做了哪些整理 | [來源整合報告](docs/consolidation/2026-11-09/REPORT.md) |

`sources/`、`archives/` 是保留證據，不代表已驗收。複製了程式碼也不等於正式站已更新。不要遞迴執行所有快照的測試或安裝相依套件。

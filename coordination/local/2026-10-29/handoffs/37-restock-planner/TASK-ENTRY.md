# W19B-37-M1

目前 M2-R1 source commit `081933a80455eaedd61b8453c0bf1103c14f79d7` 已 PUBLIC：根 wrangler.jsonc 與固定 Git blob 一同封裝；另依補充授權加入 production-only 本地 SVG favicon。新 ZIP 60 檔，受影響 7 項 focused tests、check/config/production/release gates 均通過；M1/core 舊證據重用。原 commit/ZIP 保留，沒有 CF/UI/Browser，仍保留 49 scoped PASS、3 observation NOT_RUN、8 manual NOT_RUN。詳 [HANDOFF](HANDOFF.md) R1 現況。

M2 source 已 PUBLIC：`https://github.com/KYStr/glossquote-labs-restock-planner`，commit `7fb1a338185394c5e7eea7be47f37e426d8b866b`。七個必要 gates 在 workspace／乾淨審核 copy 均通過，固定 Git archive ZIP 與 manifest 已驗 bytes/SHA。Production 14 檔獨立產生、M1 bytes 不變。M2 待主代理獨立驗收，沒有部署／首頁／全 Browser 通過；49 PASS、3 observation NOT_RUN 與 8 manual NOT_RUN 保留。完整實際交付與 hash 見 [HANDOFF](HANDOFF.md)。

目前任務已由主代理書面 scoped GO 推進 **M2 / T05**：M1 隔離實測合計 49 PASS；B14-zh-Hant、B15 兩語共 3 項原生觀測 NOT_RUN，加 8 項人工 NOT_RUN 原樣保留。停止觀測重試，不改產品邏輯／M1 UI bytes，不自行 Browser／OS、Cloudflare 或首頁。本輪只準備獨立 production 和審核 copy，必要背景 gates 通過後公開 source 並固定 commit/ZIP；發布後真實結果寫入 [HANDOFF](HANDOFF.md)。下方 M1 歷史紀錄保留。

2026-10-19：M0 已獲主代理核准。T01–T04 背景候選已實作並執行最終 `npm test`（89 PASS）、`npm run check`、`npm run build`、`npm run check:http`（94 requests），均 exit 0。環境 guard 前後 snapshots 一致。

**完整 M1 未通過。** 所有 B01–B19 均 `NOT_RUN_USER_FOCUS_INCIDENT`，沒有 browser/CUA/native 操作；Node 狀態或事件接線測試不能替代 UI。待主代理獨立驗收與真正隔離機制，未進 M2/GitHub/hosting/首頁或外驗。

原功能對話 `01a15270-775b-7d73-9cf6-9a1eccce7b35`；requested gpt-6.1-sol/max，backend identity 未獨立確認。唯一證據目錄 `.runs/restock-planner/m1-20261019-implementation-a/`。固定檔案、命令、限制與後續責任見 [HANDOFF](HANDOFF.md)。

只修改核准產品實作路徑及 HANDOFF/TASK-ENTRY/project.json，六份規格、docs、AGENTS、共享檔與兄弟工具保持原樣。未安裝依賴、未讀憑證、未改持久環境或 Git auth/config。主代理負責單一整合 ZIP；後續獲書面 GO 才在原對話開始 M2，M3 部署由主代理執行。


## 2026-10-19 外部整合包回收（主代理追加）

外部報告沒有新增確認的產品缺陷。其所測 49 份補貨來源與回收時工作區逐檔 bytes/SHA-256 相同。主代理在 Node 24.14.0 審查並重跑 reviewer 的 3,000 組固定對照、6,000 份雙語全文報告及 275 項邊界測試，均通過；測試前後 49 檔相同。這是外部背景測試 scoped pass，275 項中的 32 項為 pure-state，不能冒充 UI。

完整 M1 仍未放行，B01–B19 的瀏覽器證據未由這份報告補足；外部驗收機被 URLBlocklist 阻擋屬環境限制。沒有產品修補、GitHub 發布或部署；仍由主代理補必要隔離瀏覽器驗收後，才交原對話進 M2。真機、真實 IME、讀屏與原生縮放維持人工待驗。完整判讀與新證據見 `tool-projects/BUNDLE-ACCEPTANCE-2026-10-19.md`、`.runs/bundle-acceptance-2026-10-19/`。前述 M1 實作報告保留為當時紀錄。

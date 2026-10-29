# 開始：圖片列印尺寸試算

**目前：2026-10-18 W18-31-M2 已固定並公開 source，等待主代理 M2 主驗。** Repo `https://github.com/KYStr/glossquote-labs-print-size`，固定 commit `647b254ce566a519d31fa6c4261d8024009f66de`。詳讀 HANDOFF 最後的 M2 節與 docs/RELEASE-CANDIDATE。以下 M1 入口保留為歷史；M1 GO 已收到。

最新 AGENTS Focus incident override 優先：**禁止所有本機互動 UI automation，包括 hidden IAB**，直到主代理證實真正隔離機制。M2 UI=`NOT_RUN_USER_FOCUS_INCIDENT`。僅背景 CLI/檔案/HTTP 可用，不關閉既有分頁／視窗／程序、不更換技術繞過或安裝。完成後交回，不等待／輪詢。

M2 gates 為 `node --test`（61/61）、`node scripts/check.mjs`、`node scripts/build.mjs`、`node scripts/build-production.mjs`、`node scripts/check-production.mjs`、`node scripts/release-check.mjs`，工作區／reviewed copy／ZIP clean extraction 均通過。Production model 保留 127.0.0.1:5211、PID 77612、session 1131，命令 `node scripts/serve-production.mjs`。Preview session 90877 保留，不重複啟動。

固定 ZIP 在根自己的 evidence `/m2/print-size-source-647b254ce566a519d31fa6c4261d8024009f66de.zip`，44179 bytes、27 files，root package.json。固定 source/ZIP 後只更新工作區狀態；不得為狀態再 commit。M3 部署與首頁僅主代理；現在沒有 hosting／首頁／外驗完成。

## 歷史 M1 入口

2026-10-18：W18-31-M1 本機候選已建立，等待主代理獨立驗收／M2 GO。先讀 AGENTS、六份固定規格與 HANDOFF。Node 24.14.0、ESM built-ins、零套件；47/47 tests、check、build 均 exit 0。六規格 hash 未變，完整 Windows guard Snapshots 前後一致。

目前 loopback 預覽：`http://127.0.0.1:4211/index.html`、`/en/index.html`。必要時用 `node --test`、`node scripts/check.mjs`、`node scripts/build.mjs`；`node scripts/serve.mjs` 只綁 127.0.0.1:4211，現有服務保留，不重複啟動或按 port 殺程序。伺服器在啟動時固定已驗證的 dist bytes，改 build 後只重啟自己擁有的預覽程序。

瀏覽器測試只用自己隔離／隱藏分頁與 DOM／頁內鍵盤；不控制桌面、OS 視窗或既有分頁。逐項實際結果和 NOT_RUN 見 `test/browser-checklist.md`。固定 manifest、截圖與 logs 在根 `.runs/print-size/w18-31-m1-20261018-01a14c6b/`，不是公開來源。

M2 必須主代理明確 GO 後由原 chat 建立 production 工具鏈並發布 PUBLIC `KYStr/glossquote-labs-print-size`，model 候選 127.0.0.1:5211。M3 只由主代理免費部署候選 `https://printsize.glossquote.com` 並整合雙語首頁。source／hosting／external review 目前均未執行，不越級、不將未驗項冒稱通過。

# 發布候選：名單比對與合併

狀態：主代理回報使用者授權的 helper 撤銷處理完成，發布暫停解除；已補 incident disposition 與新增安全規則確認。既有 LIST-M2-T01 技術gates與PUBLIC固定來源保留，等待主代理 M2 獨立驗收。此次只補文件与唯讀核對，未再推送、部署或改首頁。

|檢查|狀態|證據|
|---|---|---|
|M1 A1–A43、check、build|PASS（實作者）|根 .runs/list-compare/m1-2026-10-13-01a133a5/commands.json|
|M1 中英文本機瀏覽器與320px|PASS（實作者）|browser-observations.json、browser-final-zh/en-320.txt、.jpg|
|原生 app copy → Ctrl+V 貼回欄位|PASS|兩語均實見 Ada / Bo / Cy；不代表其他OS app|
|完整Network/Storage / clipboard拒絕缺失 / 真200% / 讀屏 / IME / 真手機|NOT_RUN|能力缺口見 HANDOFF.md|
|Windows前後環境|PASS|完整Snapshots相同，environment-before/after/comparison.json|
|M1主代理獨立驗收|PASS|根 .runs/handoff-release-2026-10-13/19-primary-m1/ACCEPTANCE.md；41檔固定來源與52entries/真Edge|
|固定 source commit / PUBLIC repo|PASS|3956762b0c9c2ff5ec0933e78b4253d40a0f2f0e，gh view PUBLIC+ls-remote HEAD|
|固定commit ZIP / blob bytes / clean rebuild|PASS|51source檔；ZIP SHA fb6bd7523363288f1854f2d16d1eeac9608ed69cbf7feefef975b06024abf674|
|Production SEO、headers、404（本地candidate）|PASS|owner/ZIP check:production、HTTP、12檔manifest；live NOT_RUN|
|Wrangler4.147.0隔離dry-run|PASS|owner/ZIP各exit0，無upload|
|原M2全域Git事件（歷史）|INCIDENT_RETAINED|scope-incident-detail.json；原pre-task快照缺失，不能宣稱完整復原|
|使用者授權撤銷 / 發布暫停|PRIMARY_RECOVERY_REPORTED / RELEASED|主代理備份後移除四個已確認assignment；本對話未操作恢復|
|新Git發布安全規則 / 恢復後本次區塊guard|ACKNOWLEDGED / PASS|m2-incident-disposition-2026-10-13-01a133a5-01；不是原push前後證據|
|Cloudflare live 部署 / 首頁|NOT_RUN|無|
|外部驗收|NOT_RUN|無|

M1 source/code/runtime/dist manifest、scope diff 與精確固定 bytes 保留。M2 新證據位於 .runs/github-publish/glossquote-labs-list-compare/m2-2026-10-13-01a133a5/。配置要求 gpt-6.1-sol/max 由建立工具接受；backend identity 未確認。完整功能目標尚未完成。

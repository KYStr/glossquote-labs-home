# 發布候選：名單比對與合併

狀態：主代理已通過 M1 並正式放行 LIST-M2-T01。M2 production/source candidate 正在驗證；GitHub 完成須以真實 PUBLIC/remote HEAD/ZIP blob audit 證據更新。Cloudflare/首頁/外部驗收均未執行。

|檢查|狀態|證據|
|---|---|---|
|M1 A1–A43、check、build|PASS（實作者）|根 .runs/list-compare/m1-2026-10-13-01a133a5/commands.json|
|M1 中英文本機瀏覽器與320px|PASS（實作者）|browser-observations.json、browser-final-zh/en-320.txt、.jpg|
|原生 app copy → Ctrl+V 貼回欄位|PASS|兩語均實見 Ada / Bo / Cy；不代表其他OS app|
|完整Network/Storage / clipboard拒絕缺失 / 真200% / 讀屏 / IME / 真手機|NOT_RUN|能力缺口見 HANDOFF.md|
|Windows前後環境|PASS|完整Snapshots相同，environment-before/after/comparison.json|
|M1主代理獨立驗收|PASS|根 .runs/handoff-release-2026-10-13/19-primary-m1/ACCEPTANCE.md；41檔固定來源與52entries/真Edge|
|固定 source commit / public repo|NOT_RUN|無|
|Production SEO、headers、404|NOT_RUN|無|
|Cloudflare live 部署 / 首頁|NOT_RUN|無|
|外部驗收|NOT_RUN|無|

M1 source/code/runtime/dist manifest、scope diff 與精確固定 bytes 保留。M2 新證據位於 .runs/github-publish/glossquote-labs-list-compare/m2-2026-10-13-01a133a5/。配置要求 gpt-6.1-sol/max 由建立工具接受；backend identity 未確認。完整功能目標尚未完成。

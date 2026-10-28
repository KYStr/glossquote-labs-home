# B20-58-M2A：assets-only Cloudflare 發布準備

2026-10-27（Asia/Taipei）。本輪完成離線準備，**未 push、未部署、未修改首頁**。產品核心版本仍為 0.1.0-m1，runtime、public、dist 與既有證據保留。

Root 的 `b20-58-r1` 基線真瀏覽器結果為 **28 PASS / 6 NOT_RUN / 0 FAIL**，Chrome 145.0.7632.6，failures/prohibited 均空。Root 通報 v7 隔離及 parent cleanup PASS；本對話只重讀基線結果，沒有啟動 browser/server 或再執行 UI。28 PASS 不含本輪新增 hosting 配置的真實部署驗證。

## 固定設定與產物

[wrangler.jsonc](wrangler.jsonc) 是固定、canonical JSON（JSONC 子集），658 bytes，SHA-256 `bc303d29e8a5776439a3810279ae5181a29da640c0ba7c52473b7a4bd70a8f4e`。日期、關閉觀測／metrics 依本輪明確契約，不採一般 Worker logging 預設。

- name `glossquote-tournament-scheduler`；compatibility_date `2026-10-24`。
- workers_dev、preview_urls、send_metrics 全 false。
- routes 只有 `round-robin.glossquote.com`，custom_domain=true。
- observability.enabled、logs.enabled、logs.invocation_logs、traces.enabled 全 false。
- assets.directory=`./release-artifacts/site`，run_worker_first=false、html_handling=none、not_found_handling=none。
- build.command=`node scripts/release.mjs build`。沒有 main、Worker handler、bindings、vars、account_id 或 env override。

`scripts/deployment-config.mjs` 與 check/release 分離，核對實體檔案及精確 bytes。新增／重複 keys、擴張 route、觀測、入口、bindings 或不同資產目錄都拒絕。canonical 檔案的空白與 LF 也是固定輸入；要改格式也須重新審核，不會靜默接受不同 JSON/JSONC parser 解讀。

正式候選產物仍在 `release-artifacts/site/`，共 **12 檔、63,311 bytes**。嚴格 [release manifest](release-artifacts/manifest.json) 位於 sibling，schemaVersion=1/mode=release-candidate 代表離線未上線狀態，不是部署證明；sourceFiles 仍完整列 public 的8檔。Wrangler 另外通過獨立 byte 契約並列入本輪完整來源 hashes。

新增 `_redirects` 精確為65個 UTF-8 bytes：

```text
/ /index.html 301
/en /en/index.html 301
/en/ /en/index.html 301
```

只有這三條 aliases，沒有 wildcard、外部網址、SPA fallback 或循環；兩語 canonical 仍為 `/index.html`、`/en/index.html`，zh-Hant/en/x-default 互返、x-default 繁中，兩語回首頁連結保留。

兩語正式 HTML 的 body 僅移除已授權的精確 footer marker：`Gloss Tools by GlossQuote · 預覽候選`／`Gloss Tools by GlossQuote · Preview candidate` 的完整 span 改為同品牌無候選後綴 span。其餘 body、所有表單與狀態、title/H1/description、JS/CSS、CSP 均不變。public/dist 預覽保留原 noindex 和候選文字。`_headers` 仍486 bytes、SHA `0b18b61ec6ddda85f60e5a82f46505675bd08e82eb390ba1fbdd2e7aeaef78b4`。

建置拒絕被修改／未知／缺漏／linked 輸出，checker 重新建立 expected bytes，不能靠同改 asset+manifest 繞過。未加入部署命令、憑證讀取或網路 runtime。

## 命令結果

既有 Node v24.14.0、零依賴、離線 fake-data。最終結果：

|命令|Exit|結果|
|---|---:|---|
|`npm test`|0|60 tests / 60 pass，0 fail/cancel/skip/todo；7469.9734 ms|
|`npm run check`|0|原8檔 preview、ESM及固定 assets-only 設定|
|`npm run build`|0|既有 dist byte-identical；未改 preview|
|`npm run build:release`|0|12 檔正式候選|
|`npm run check:release`|0|完整 source/asset/manifest/config 檢查|
|persistent environment guard 前／後|0／0|全部 Snapshots 相同|

新增 Wrangler 精確結構、24種不允許設定及重複 keys、redirect table／聯合竄改、config hardlink/directory 與真 check CLI 回歸測試。原有完整 pair／輸出／生命週期測試保留；scratch 改到 evidence/m2a，沒有覆寫 M1/M1B。

第一次完整命令嘗試：59 tests exit0，check exit13，因 check top-level await 與 release 循環 import 未能 settle；未進行後續 builds。失敗輸出保留。修正為獨立 deployment-config 模組並加 CLI 回歸後，最終60項與五條命令全過，沒有把失敗改寫成功。

原M1B 11檔 site／manifest 已先全量驗 hash，再完整封存在 root 指定 owner 目錄的 `before/release-artifacts/`。沒有遞迴刪除舊產物或在 build 中覆蓋未知輸出。本輪原始 stdout/stderr、before/after environment、實際 diff、完整 source/artifact hashes 由 root 指定目錄 `.runs/batch20-completion-2026-10-27/owner-58-release/` 保存。

## 仍未驗證

保留基線的6個 NOT_RUN：兩語各一個同步計算無取消／Worker（不適用）、一個真200% zoom 未驗，以及一個 native clipboard/print/save、真機／AT 未驗。沒有造取消或把 viewport 320px 當真 zoom／真機。

本輪未執行 Wrangler CLI schema/dry-run、Cloudflare API、真部署、公開 HTTPS redirect/headers、GitHub、首頁或外部驗收；Node 固定配置檢查不能代替 hosting 證明。Root 後續應以本輪新 manifest 與 Wrangler bytes 審核 publishing copy，並驗證三條301、canonical目標200、未知路徑404及實際CSP/隱私 headers。此文件不額外授權本對話推送／部署，也不改任何既有 NOT_RUN 或外驗狀態。

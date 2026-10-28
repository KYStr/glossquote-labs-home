# M2A 正式發布準備

2026-10-27；本輪只準備來源與靜態產物，待root驗收後另進M2B。未push、未部署、未改首頁，外部覆核仍待驗，不宣稱工具已上線或全部人工gate通過。

根據root的b20-60-r1及H2 focused b20-60-r2真browser證據，按language+caseID替換原8個假失敗，產品邏輯為34 PASS／10 NOT_RUN／0 FAIL；privacy補測兩筆只驗不重複加總。禁止事件空、cleanup PASS。此為root已執行的歷史證據，本輪沒有啟動browser/server。

## 固定靜態設定

[wrangler.jsonc](wrangler.jsonc) 採固定、可逐byte核對的JSON subset。name `glossquote-contact-cards`，custom domain `contacts.glossquote.com`，compatibility_date `2026-10-24`。workers_dev、preview_urls、send_metrics、observability enabled、logs enabled/invocation_logs、traces enabled全部false。無main、vars、bindings或env override。build command只執行 `node scripts/release.mjs build`。

Assets為 `./release-artifacts/site`，run_worker_first=false，html_handling=none，not_found_handling=none。不新增Worker程式、API、儲存或telemetry。這些是準備中的設定，實際hosting/header/redirect仍由root之後部署與實測確認。

Site的 `_redirects` 固定三列並以LF結尾：

```text
/ /index.html 301
/en /en/index.html 301
/en/ /en/index.html 301
```

正式HTML只從preview-label精確移除中文「本地候選版本 · 」與英文「Local candidate · 」；其餘文字（含真機匯入未驗）、head SEO、UI結構與CSP保留。public及dist原預覽完全不改，JS/CSS/核心/VCF輸出bytes不改。

## 建置與驗證

既有Node24、零依賴，依序：

```text
npm test
npm run check
npm run build
npm run build:release
npm run check:release
```

不npm install，不啟動dev，不需憑證。Release檢查器先以固定canonical bytes驗證wrangler，再驗M1 public source lock與完整site/manifest。Manifest保留schemaVersion1及既有fields/sourceFiles，新增configFiles固定root wrangler.jsonc的bytes/SHA；site新增_redirects。設定+manifest或redirect+manifest一起竄改仍拒絕。

沒有force、沒有原地更新既有release的例外。合法同版本輸出重建為no-op；未知/缺少/污染輸出拒絕，不刪除或覆蓋。舊M1B release及所有104份舊來源/證據已完整封存在本輪owner archive，原release經核對後作一次精確rename，才建立新M2A。不得重跑舊freeze/verify寫入歷史evidence。

本輪owner evidence位置：`.runs/batch20-completion-2026-10-27/owner-60-release/`。內含archive-manifest、commands、實際diff、source/artifact SHA、環境before/after與freeze-result。產品內舊evidence不重寫。後續審核應使用 [release manifest](release-artifacts/manifest.json) 與對應site，不沿用M1B候選hash。

Cloudflare欄位已對照既有Wrangler4.147.0 config-schema及官方docs；沒有執行Wrangler dry-run/部署。使用workers-best-practices技能時，以本次明確指定的日期及停用觀察/metrics為準，未採技能的一般啟用logging建議。

## 尚未執行項

原10項NOT_RUN仍保留取消/競態窗口、真200% zoom、直接Blob revoke、原生chooser/save、真機contacts app與AT等原scope，不轉成PASS。本輪新入口301的真HTTP/hosting驗收未執行；設定檔與離線bytes測試不等於部署成功。root的M2A獨立驗收、M2B公開source及後續部署/首頁/外驗仍需依階段辦理。

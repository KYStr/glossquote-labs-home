# B20-55-M2A：正式發布準備

2026-10-27（Asia/Taipei）。狀態 **READY_FOR_ROOT_M2A_REVIEW**。這輪固定配置與候選產物，GitHub **NOT_PUBLISHED**、Cloudflare **NOT_DEPLOYED**；不等於 M2B 或完整外部驗收通過。

## 實際差異

新增 `wrangler.jsonc` 與 `scripts/deploy-config.mjs`，更新 check、release generator/checker 及兩份測試。配置固定 `glossquote-moving-boxes`／`moving-boxes.glossquote.com`／`2026-10-24`，只有 assets，無 main、vars、bindings。workers_dev、preview_urls、send_metrics 與 observability enabled／logs enabled／invocation_logs／traces enabled 全為 false。assets 固定 `./release-artifacts/site`、run_worker_first=false、html_handling=none、not_found_handling=none。

正式候選新增 `_redirects`，內容必須逐 byte 等於下列三行，最後保留 LF：

```text
/ /index.html 301
/en /en/index.html 301
/en/ /en/index.html 301
```

65 bytes；SHA-256 `9e47a2579b08f461b1124de1e42a1bde7a79ca29d77401104f6f432d8be90e1e`。它只屬於 release allowlist，不進 public／preview。manifest 新增此 asset 及獨立 `configFiles`；config 位於 site 外，只有 manifest 記錄其相對路徑、bytes、SHA。

兩語 title 原本沒有候選前綴，故沒有刪改文字。原 release 的15份 site 檔案全部逐 byte 相同；public14檔、JS/CSS/core、匯出、CSP、headers、SEO與可見待驗說明維持原樣。沒有新增 runtime 或修改資料格式。

配置也以固定 canonical UTF-8／LF bytes 驗證。更改遙測、日期、網域、路由、build command、assets 或加入未知欄位均先拒絕；同改 manifest 仍不能授權新設定。既有 exclusive `wx`、未知輸出拒絕及相同候選 no-op 契約保留，無 force／覆寫／遞迴刪除新選項。

## 封存與離線檢查

完整舊工具143檔／614381 bytes（含67份 evidence、16份舊 release 檔）已封存在 owner 的 `archive/tool-before/`，逐檔 SHA 核對。舊 release 先通過舊 checker、固定 manifest SHA `97fda44631ffa957b09811dd4823c5281d34665ae348d18ba2dab39b41378b86`，才在確認兩端絕對路徑後移入封存；其餘原檔使用 exclusive copy，未刪除或覆寫未知輸出。

指定五命令各執行一次，Node v24.14.0，以完整 Node 路徑執行 npm-cli.js、shell=false／windowsHide=true：

| 命令 | exit | 結果 |
|---|---|---|
| `npm test` | 0 | **81/81 PASS，0 FAIL／cancelled／skipped／todo**；其中10個新增 M2A 測試 |
| `npm run check` | 0 | closed public、雙語、安全、ESM與固定配置 |
| `npm run build` | 0 | preview14檔重建後 bytes 不變 |
| `npm run build:release` | 0 | site16檔與 sibling manifest |
| `npm run check:release` | 0 | 從固定來源與配置重建 expected，逐檔／manifest 精確核對 |

配置／redirect 反例涵蓋 missing、unknown、junction／hard link、非 canonical config、各遙測／部署覆寫、asset+manifest／config+manifest 一起污染。所有反例僅用 task-owned 假資料暫存，測完清理；fixture 移至新 evidence/m2a，不觸碰舊 evidence。

120份受保護原檔逐 byte 相同，包括 public、dist、全部歷史 evidence與規格。既有 Environment guard 前後整個 JSON 物件相同：HKCU/HKLM PATH hash／type／length／ephemeral entries、完整 Environment fingerprint 與 TEMP/TMP 均維持不變。沒有 Git/auth／持久系統變更、安裝、憑證讀取、server、browser 或 native 操作。

## 固定身分

- 實作來源32檔／186581 bytes；source-files.json SHA-256：`14368c1f46f5161934aa5ee1378be8302b1018636a8b7f7dd10e53971c622459`。範圍 `.gitignore`、package、wrangler、public、scripts、test；不是 Git commit。
- site16檔／86669 bytes；manifest4812 bytes，SHA-256：`528ba45322b792b2275d98100ef5ae413a14eecbd02be6a1fc256eb20448336e`。
- wrangler.jsonc 651 bytes，SHA-256：`d28fa1519317acafd9c0d30fa3bfc940117e9ead7737030fce20b3ea8b06a38f`。

完整[owner 證據與差異](../../.runs/batch20-completion-2026-10-27/owner-55-release/README.md)，包含 final-gates、source/artifact identity、artifact delta、原檔保護、環境與完整舊版本封存。

## 主控 browser 證據與剩餘項目

本對話只讀主控既有 R3/R4 JSON，沒有再啟動 browser。R3原60案為44 PASS／4 FAIL／12 NOT_RUN。R4 focused12案全 PASS，只用兩語 BR55-02、BR55-19 四案替換原四個 FAIL，其餘8案為支持證據，不重複增加總數。合併後 **48 PASS／0 FAIL／12 NOT_RUN（60案）**；R4 prohibited=[]，最終 parent-cleanup PASS。中途 cleanup-job 檢查曾仍見2個 conhost，最終僅查原記錄 generation，確認皆不存在，未執行廣泛掃描或終止程序。

12項 NOT_RUN 原樣保留：兩語 BR55-16／17／18 讀取取消／重選／清除的實際重疊時序，BR55-23-UNKNOWN-404 正式未知路由，BR55-26 真200%文字放大，BR55-27 原生／真機／AT。詳細原觀察保留在主控 R3 result，未以離線測試抵充。

本輪新增設定與 redirect 尚無 live HTTP 證據；301／Location、未知路由404、實際 headers／CSP／canonical 與免費 hosting／雙語首頁，仍待主控後續 gate。主控審核 M2A 後另行 M2B；不自動 push／deploy，不另建 ZIP。

配置依主控固定契約，官方參考：[Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)、[Static Assets redirects](https://developers.cloudflare.com/workers/static-assets/redirects/)。這些文件不是已部署成功的證明。

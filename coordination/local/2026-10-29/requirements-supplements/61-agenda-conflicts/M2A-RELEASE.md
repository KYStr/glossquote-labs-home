# 多軌議程衝突檢查 — B20-61-M2A

2026-10-27，Asia/Taipei。本輪是正式發布準備，**未push、未部署、未外驗完成**。原功能對話維持requested gpt-6.1-sol/max，backend未獨立確認，沒有切模型或委派。

## 瀏覽器證據來源

root已親自執行 `b20-61-r1`，結果36 PASS／6 NOT_RUN／0 FAIL、prohibited空陣列，Chromium `145.0.7632.6`；exact parent cleanup為PASS。原始結果及cleanup不改，參照 [本輪證據索引](../../.runs/batch20-completion-2026-10-27/owner-61-release/browser-evidence-reference.json)。

六個未跑項是兩語各自的200% zoom、刻意送達私有舊generation訊息、原生／真機／AT，均照原狀保留。本owner本輪沒有啟動瀏覽器、server或native工具，也未把root的結果寫成自己重新執行的驗收。

## 固定發布設定

`wrangler.jsonc` 固定 `glossquote-agenda-conflicts`、compatibility_date `2026-10-24`（M2A-F1依本批root精確契約修正），custom domain `agenda-check.glossquote.com`。assets只指向 `./release-artifacts/site`，`html_handling`與`not_found_handling`為none、run_worker_first false。沒有main、Worker script、vars、bindings、環境override或第二個domain。

workers_dev、preview_urls、send_metrics、observability.enabled、logs.enabled、invocation_logs、traces.enabled全false。這是使用者明示的隱私界線，優先於通用skill開啟observability的預設。build.command只允許 `node scripts/release.mjs build`；未執行Wrangler或部署命令。

設定以canonical JSON（JSONC的嚴格子集）保存。`scripts/deployment.mjs` 精確比對整個物件與完整檔案bytes，拒絕unknown keys、Worker/vars/bindings、額外domain、開啟記錄、改資產目錄／HTML handling、duplicate keys、註解與格式改動。這是刻意固定的發布輸入，不是通用Wrangler設定編輯器。

已讀既有審核工具鏈的Wrangler schema作欄位參考，沒有安裝或執行該CLI；參照 [schema證據](../../.runs/batch20-completion-2026-10-27/owner-61-release/wrangler-schema-reference.json)。不能把這項離線自訂policy檢查稱為Cloudflare dry-run或實際hosting驗證。

## 正式產物的精確變更

site只新增 `_redirects`，內容為下列三列，LF且最後也有LF：

```text
/ /index.html 301
/en /en/index.html 301
/en/ /en/index.html 301
```

產生器只從兩語正式HTML各移除一個完整頁尾標記：

- `<span>Gloss Tools by GlossQuote · 本地候選預覽</span>` → `<span>Gloss Tools by GlossQuote</span>`。
- `<span>Gloss Tools by GlossQuote · Local candidate preview</span>` → `<span>Gloss Tools by GlossQuote</span>`。

其他body、title、description、H1、canonical/hreflang/robots/sitemap、CSP與安全headers、6個runtime JS/CSS全部不變。public與原dist仍保留原預覽文字／noindex。release manifest維持schemaVersion1/mode release-candidate，新增必要 `configFiles` 一列固定wrangler.jsonc的bytes/SHA；root keys仍採封閉比對，不允許任意擴充。

## 舊產物與fail-closed

修改前先以原M1B檢查器核實原11檔站點與manifest：SHA-256 `fc9514610fbe86a8480c846eb76d3949dc9b11532dbf3bd0e77329c91b328d16`。確認來源／目的絕對路徑都在指定scope、目的不存在後，將完整release-artifacts移存至 [previous-release-artifacts](../../.runs/batch20-completion-2026-10-27/owner-61-release/previous-release-artifacts/)，原manifest與檔案bytes保持不變。

產生器沒有增加自動清理、覆蓋、migration或repair路徑。現存不完整／未知／被修改產物仍直接拒絕；不存在時才exclusive建立，相同合法重建不重寫。所有負例都在 `evidence/m2a/` 的task-owned copy完成並清理，不寫歷史m1/m1b證據。partial寫入或外部並行改動仍會保留並阻擋，下次須root處理，沒有跨程序鎖。

## 重現與交接

在本工具用現有Node24與npm，零安裝：

```text
npm test
npm run check
npm run build
npm run build:release
npm run check:release
```

正式site根為 `release-artifacts/site/`；config及manifest不進site。不要使用dev或擅自啟動browser。仍需root對本輪產物作獨立驗收後才可另行放行GitHub與部署；實際Cloudflare 301、headers、domain、配額／hosting均未驗。

最終命令／差異／逐檔source與artifact SHA及完整Windows前後快照保留在 [owner證據目錄](../../.runs/batch20-completion-2026-10-27/owner-61-release/)，見 [candidate-manifest.json](../../.runs/batch20-completion-2026-10-27/owner-61-release/candidate-manifest.json)、[actual-source.diff](../../.runs/batch20-completion-2026-10-27/owner-61-release/actual-source.diff)、[actual-artifacts.diff](../../.runs/batch20-completion-2026-10-27/owner-61-release/actual-artifacts.diff)。歷史規格／M1/M1B證據不重寫，最新狀態以本文件與HANDOFF追加為準。

## M2A-F1：固定日期修正（2026-10-27）

root指出本批validator精確要求compatibility_date `2026-10-24`；先前使用當日日期 `2026-10-27` 不符合本批契約。本輪只改config／policy中的該日期、正向測試值與拒絕舊值的回歸輸入，以及必要交接文件。其他config、runtime/public、SEO/CSP／轉址與全部12個site檔案都保持原bytes。

舊M2A 44份來源與13份artifacts已核原hash並另存 [owner-61-release-r1](../../.runs/batch20-completion-2026-10-27/owner-61-release-r1/) 的before-source／previous-release-artifacts；原owner-61-release證據未覆寫。新r1受影響release/deployment測試32/32通過，check/build/build:release/check:release皆exit0；沿用未變核心的先前115項證據，沒有重跑或冒稱新full-suite/browser驗收。

新release manifest SHA為 `7ff51e456bfcd3a86a02eae2a791341752c6524690d8621b1344d89566d80118`；config 655 bytes、SHA `f8f9a190f306f97e35b0b8e3286fbe5ca2b810de254527e536d37ac3c994f202`。新固定來源／artifact逐檔清單及實際diff見 [r1 candidate manifest](../../.runs/batch20-completion-2026-10-27/owner-61-release-r1/candidate-manifest.json) 與 [r1 source diff](../../.runs/batch20-completion-2026-10-27/owner-61-release-r1/actual-source.diff)。完整Windows snapshots前後一致。待root用primary-fixes/61-r1獨立驗證後再決定M2B；本輪仍未push、部署或操作UI。

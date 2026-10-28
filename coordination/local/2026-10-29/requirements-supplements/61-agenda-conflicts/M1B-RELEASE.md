# 多軌議程衝突檢查 — M1B 離線發布準備

本輪契約為 `B20-RP-61`（2026-10-23，Asia/Taipei）。此目錄保存可重現的正式 SEO 靜態候選，**尚未發布、尚未部署，也未取得 M2 放行**。預定 origin 是 `https://agenda-check.glossquote.com`，toolSlug 是 `agenda-conflicts`；本文件不表示該網址已上線。

## 重現與核對

使用既有 Node.js 24+，不安裝套件、不輸入環境設定或任意origin：

```text
npm test
npm run check
npm run build:release
npm run check:release
```

兩個發布命令各只接受內建的單一mode，等價於 `node scripts/release.mjs build` 與 `node scripts/release.mjs check`。沒有mode、未知mode、多參數或傳入origin的參數都拒絕；沒有部署／上傳／憑證命令。原test/check/build/dev維持原用途；本輪不要執行dev。預覽未變，不必重建dist。

候選檔案固定為 [release-artifacts/site](release-artifacts/site/)，供主代理後續在審核通過的隔離機制中驗真實browser。站點根為此 `site/`，繁中頁 `index.html`，英文頁 `en/index.html`；不要把整個專案或 sibling manifest 當網站根，也不要把原 `public/`／`dist/` 混進正式候選。

審核清單位於 [release-artifacts/manifest.json](release-artifacts/manifest.json)，不在site內。凍結來源與產物逐檔bytes/SHA-256見 [evidence/m1b/candidate-manifest.json](evidence/m1b/candidate-manifest.json)。原M1證據及manifest保留不動；新M1B清單才描述本輪scripts、tests及交接文件變更。

## 候選內容與隔離

- 8個M1公開來源加上 `robots.txt`、`_headers`、`sitemap.xml`，site合計11檔。
- JS、CSS等6個非HTML資產逐byte相同。兩語HTML只改head內robots並新增canonical和zh-Hant/en/x-default三條互返alternates；完整title、description、H1、html lang、body、FAQ及可見候選文案保留。
- Canonical固定為 `https://agenda-check.glossquote.com/index.html`、`https://agenda-check.glossquote.com/en/index.html`；x-default指向中文。robots為index,follow；robots.txt指向只列這兩個URL的sitemap，沒有lastmod或新structured data。
- M1原本沒有public `_headers`。發布設定直接依 `scripts/serve.mjs` 的 `SECURITY_HEADERS` 產生，以原M1該檔bytes/SHA-256固定；只把X-Robots-Tag改成 `index, follow`。CSP的connect-src仍是none，script/worker/style仍限self；其他安全／隱私headers完整保留。沒有啟動serve。
- 原 `public/`、`dist/`、舊 `evidence/m1/` 不變；preview保持noindex/nofollow，沒有正式canonical或sitemap。

`_headers` 是靜態設定檔，不能當實際Cloudflare或HTTP header生效的證據。indexable候選也不表示已通過產品/browser驗收。

## 驗證與拒絕策略

`release.mjs` 固定M1八檔公開來源的完整bytes/SHA-256，來源先以封閉allowlist拒絕多檔、缺檔、symlink/junction，再比對固定快照。origin只在程式常數定義，不讀環境或CLI覆寫。

check每次從這些來源重建完整expected位元組與manifest，另外讀取實際HTML的完整title/description/H1、語言、唯一canonical、雙語alternates和robots，再核對整頁與所有資產。它不只相信manifest：即使同時改掉資產及其manifest hash，仍會因與來源重建內容不同而拒絕。源碼一起被改也會被M1來源pins拒絕。

輸出目錄也採封閉清單，拒絕連結、未知檔／目錄、污染、缺檔及不一致manifest。沒有遞迴刪除或自動修復。首次建置在完整preflight後使用exclusive writes；相同合法候選重建只驗證並沿用，連mtime也不重寫。未管理、被修改或部分輸出一律保留並拒絕，應交主代理判斷，不能用刪目錄／覆寫來湊PASS。

若首次寫入遭磁碟錯誤或外部併發寫入中斷，可能留下部分輸出；下一次仍會拒絕並保留，不會自動清理。此工具不提供與外部寫入者之間的跨程序鎖。後續若產品來源真的需要修改，須另設有界產品任務和新審查快照，不可只改pins繞過。

針對性測試全部在 `evidence/m1b/` 內的任務copy做反例。既有工具鏈測試的暫存根也移到此處，避免完整npm test寫進歷史M1證據。測試清理僅限已驗絕對路徑的task-owned暫存目錄。

## 尚缺gate

真實browser、Worker、下載、layout、320px／200%、鍵盤、Network／Storage、native／真機維持 `NOT_RUN_USER_FOCUS_INCIDENT`。本輪沒有啟動server，沒有實際hosting headers或URL/SEO可索引性驗證。GitHub、Cloudflare、共用首頁及外部覆核均未執行。

接收者應先核對本輪來源diff、完整manifest與命令證據，再由主代理決定隔離browser驗收及是否放行下一里程碑。此M1B任務本身不要求新權限，也不構成任何上線授權。

實際命令／數量／環境快照與10項契約對照追加於 [HANDOFF.md](HANDOFF.md)。

本輪實際結果：針對性25/25、最終完整108/108，check/build:release/check:release皆exit0；site共11檔、81,255 bytes。release manifest SHA-256為 `fc9514610fbe86a8480c846eb76d3949dc9b11532dbf3bd0e77329c91b328d16`。public/dist/舊M1 evidence共40檔與完整持久環境Snapshots前後一致。以上都是離線證據。

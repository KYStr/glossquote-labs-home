# 批次文字套版 — M1 交接

2026-10-23（Asia/Taipei），B20-43-M1 / **B20-43-R01 修正版**，版本 `0.1.0-preview.1`。狀態：**R01 本地候選已固定，Node／靜態 gates PASS，待主代理獨立覆驗**。這不是完整產品驗收、公開來源或正式網站。要求對話配置 gpt-6.1-sol/max；未獨立核實 backend 身分。

|範圍|結果|
|---|---|
|T00–T50 實作|已交付核心、雙語頁面、匯出與生命週期控制|
|最終 Node 測試|PASS，74/74，fail 0 / skipped 0，exit 0；初版 52/52 證據另存|
|最終 check / build|PASS，均 exit 0；13 public assets / 8 browser modules / 6 scripts；13 個 dist 檔逐 bytes 相同|
|Windows 持久環境|PASS，User/Machine 完整 Environment fingerprint、PATH type/length/hash 前後不變|
|原 13 份唯讀規格／契約|SHA-256 前後相同；只有允許的 HANDOFF 改寫|
|真 browser、真 Network／Storage、clipboard、下載、版面／鍵盤、原生／真機|**NOT_RUN_USER_FOCUS_INCIDENT**|
|source commit / reviewed commit / released commit|均無；本輪未 Git commit／push|
|GitHub / 正式網址 / hosting / 共用首頁|NOT_PUBLISHED / NOT_DEPLOYED；未修改首頁／看板|
|主代理驗收 / 外部覆核|NOT_RUN / NOT_RUN|

## 實際行為

- CSV 可貼上或由使用者選檔，byte cap 在解碼前檢查，嚴格 UTF-8、唯一非空標題、逐字欄值、quoted comma／quote／multiline、單一外部 record separator dialect。1 MiB／1,000 rows／30 columns 的上限與錯誤位置已測。
- **R01：選檔後原貼文保持原樣，僅目前 generation 的檔案成功解碼並通過 CSV 驗證後才清除貼文。** 過大、讀取失敗、CSV／UTF-8 錯誤、取消或過期讀取都保留貼文；模板與選項不因選檔改寫。舊解析來源與下載仍立即失效，畫面明示新檔未套用；檔案錯誤關聯選檔欄而非保留的貼文。可按「載入保留的貼文」重新啟用原貼文，不需假修改內容。
- `{{完整欄名}}` 逐字且區分大小寫；一次列出未知欄，不 trim 或展開插入值。單括號、HTML、Markdown、`$&` 等保留字面文字。預覽只寫文字節點。
- 僅分析待用欄；空字串預設阻止整批。每欄缺值總數、前 20 個資料列序及剩餘筆數可見。明確勾選允許空白後顯示總數，JSON 保留 `blankFields`。無佔位符時先顯示每列同文提示。
- 逐筆預覽、上一筆／下一筆及依列序跳轉。複製只在按下單筆按鈕時呼叫；成功／拒絕文案不同，拒絕時提供 readonly textarea 與明確「選取」按鈕。這部分只有 Node wiring fake 證據，真 clipboard 仍未驗。
- 固定名 `personalized-text.txt`／`personalized-text.json`；TXT 有本語系資料列分隔，JSON 含 schemaVersion、tool、template、headers、options、records、counts。最終 **TXT bytes + JSON bytes ≤8,388,608**，包含全部 envelope；來源 CSV cap 獨立。超限沒有部分或上代下載。
- 先計算分段 bytes，避免重複大型欄值在 cap 前組成巨量字串；包含跨片段 Unicode surrogate 的精確計數。每 100 rows yield，可取消。generation／AbortSignal 防止舊工作晚回。
- 更改來源／範本／空白選項會同步清除結果並 revoke 舊 Blob URL；reset／pagehide 清 input、資料、成果、URL 引用，BFCache 返回也保持空白。原生 `File.arrayBuffer()` 未完成時，以 token 丟棄晚回內容；不宣稱安全抹除或刪除已下載檔案。
- 完整靜態繁中及英文入口，各自的 title／description／H1、FAQ、同語系首頁連結、跨語言清除提醒、no-script 文案、noindex/nofollow。未放 canonical／sitemap，沒有正式網址宣告。
- 無 runtime/dev dependency、外部字型／腳本／服務、上傳、儲存歷史或自動傳送。未安裝套件，未讀憑證或 token，未開 devserver、瀏覽器或原生 UI，也未建立子代理／chat。

## 實際修改檔案與差異

原資料夾只有 14 份規格 Markdown。原 13 份唯讀文件保持 bytes；以下為新增產品檔案，HANDOFF 為允許改寫，TASK-ENTRY 與 evidence 為新增紀錄。詳細逐檔 bytes／SHA-256 見 [source-manifest.json](evidence/m1/source-manifest.json)。

|檔案|用途|
|---|---|
|[package.json](package.json)、[.gitignore](.gitignore)|Node 24 ESM/private，零依賴，test/check/build/dev|
|[public/index.html](public/index.html)、[public/en/index.html](public/en/index.html)|完整雙語靜態工作頁|
|[public/styles/app.css](public/styles/app.css)|家族 tokens、工作畫布、48rem／75rem breakpoints、focus／reduced motion|
|[public/js/app.js](public/js/app.js)|真實 DOM 接線、檔案／貼上、檢查、預覽、copy／download、頁面清理|
|[public/js/session.mjs](public/js/session.mjs)|記憶體 session、狀態、generation、取消、Blob ownership|
|[public/js/strings.mjs](public/js/strings.mjs)|雙語完整操作／狀態／錯誤文案|
|[csv.mjs](public/js/core/csv.mjs)、[template.mjs](public/js/core/template.mjs)、[render.mjs](public/js/core/render.mjs)、[export.mjs](public/js/core/export.mjs)、[errors.mjs](public/js/core/errors.mjs)|純核心、硬上限、穩定錯碼、序列化|
|[public/_headers](public/_headers)、[public/robots.txt](public/robots.txt)|預覽安全標頭與禁止索引；實際 HTTP/browser 行為尚未驗|
|[scripts/assets.mjs](scripts/assets.mjs)、[scripts/check.mjs](scripts/check.mjs)|封閉 allowlist、拒絕 symlink/junction／未知檔與目錄、語法／SEO／資源／關聯掃描|
|[scripts/build.mjs](scripts/build.mjs)|僅複製 public allowlist；拒絕並保留未知輸出，不清除它來湊 PASS|
|[scripts/pages.mjs](scripts/pages.mjs)|確定性產生兩份靜態頁，check 驗證同步；不含使用者資料|
|[scripts/serve.mjs](scripts/serve.mjs)|未啟動的 loopback-only 127.0.0.1:4223 dev handler；精確路由、Host／method／MIME／headers|
|[scripts/verify.mjs](scripts/verify.mjs)|依序執行最終 gates、記錄 log、合成匯出、來源與 dist hashes；child 均 shell:false/windowsHide:true|
|[test/csv.test.mjs](test/csv.test.mjs)、[test/template.test.mjs](test/template.test.mjs)、[test/export.test.mjs](test/export.test.mjs)|手寫 oracle、malformed／邊界、不變式與產物格式|
|[test/session.test.mjs](test/session.test.mjs)、[test/app.test.mjs](test/app.test.mjs)|競態／取消／清理／雙語介面 wiring fakes；非真 browser|
|[test/toolchain.test.mjs](test/toolchain.test.mjs)|SEO／安全反例、closed build、junction、HTTP handler fake、色彩對比數值|
|dist/**|13 個預覽產物；與 public bytes 完全一致，未部署|
|[TASK-ENTRY.md](TASK-ENTRY.md)、HANDOFF.md、evidence/m1/**|範圍、階段紀錄、固定證據與後續驗收項|

## 已執行命令與證據

Node 可執行檔 `C:/Program Files/nodejs/node.exe`，版本 **24.14.0**。T20、T30 的 npm 命令實際用 Node 執行既有 npm-cli.js，未 install。最終使用相同 package scripts 的直接 Node 命令，避免另開 npm lifecycle shell；verify 子程序均 shell:false/windowsHide:true。

|階段|命令|exit / 數量|
|---|---|---|
|T00|node scripts/check.mjs|0，初始 6 assets / 1 browser module / 4 scripts|
|T10|node --test test/csv.test.mjs|0，10/10，另含 120 組合成 roundtrip|
|T20|npm test|0，28/28|
|T30|node scripts/pages.mjs --write；npm run check；npm run build|均 0，13 assets / 8 browser modules / 5 scripts|
|T40|node --test test/*.test.mjs；node scripts/check.mjs；node scripts/build.mjs|均 0，45/45|
|T50 工具鏈補驗|node --test test/toolchain.test.mjs|0，6/6|
|初版 M1 歷史候選|node scripts/verify.mjs|0，52/52；保留於 evidence/m1/r01/before，不代表 R01 缺陷已被當時測試涵蓋|
|R01 受影響測試|node --test test/app.test.mjs test/session.test.mjs|0，39/39；含 20 個新增雙語 app 事件案例及 2 個來源提交案例|
|最終固定候選|node scripts/verify.mjs|0，包含下列三個 gates|
|最終測試|node --test --test-reporter=tap test/app.test.mjs test/csv.test.mjs test/export.test.mjs test/session.test.mjs test/template.test.mjs test/toolchain.test.mjs|0，**74/74**|
|最終靜態／語法|node scripts/check.mjs|0，13 assets / 8 browser modules / 6 scripts|
|最終建置|node scripts/build.mjs|0，13 assets，preview-noindex|

完整原始輸出：[final-tests.log](evidence/m1/final-tests.log)、[final-check.log](evidence/m1/final-check.log)、[final-build.log](evidence/m1/final-build.log)。機讀總表：[final-gates.json](evidence/m1/final-gates.json)。

合成資料產物：[TXT](evidence/m1/synthetic-exports/personalized-text.txt)、[JSON](evidence/m1/synthetic-exports/personalized-text.json)，合計 **608 bytes**，來自真核心；這不是瀏覽器下載證據。

歷史命令包裝／patch 失敗留在 [TASK-ENTRY](TASK-ENTRY.md)。主代理後續讀碼發現 R01 資料遺失，初版 52 個 passing 案例未涵蓋這個事件序列；本輪已修正並擴充回歸。沒有把未執行 browser gates 改成 PASS。

## R01 資料保護修正

原因：舊選檔 handler 在檔案大小／CSV 驗證前就 `ui.csv.value=''`；`acceptSource()` 在解析失敗後也回傳 true。主代理指出貼上後修過的唯一名單會被無效檔案或取消讀取清掉。

處理：保留貼文編輯區，`beginSource()` 仍同步撤銷舊解析來源／成果／Blob，避免把舊資料誤當新檔可用。`acceptSource()` 現在只在 CSV 真正通過驗證時回傳 true；模板或缺值待修是另一個狀態。選檔 handler 只在成功且 token／attempt 都仍屬目前工作時清除貼文。失敗或取消清掉選檔欄的失效 selection，顯示保留提示與明確重新載入按鈕。

模板或選項在讀取期間改動，沿用 generation++ 使舊讀取失效，不自動套入；新貼文／新檔案／reset／pagehide 亦不能被晚回工作清空或覆寫。原生 `File.arrayBuffer()` 本身不支援這裡的 AbortSignal，晚回內容會丟棄；未宣稱原生讀取已中止。

實際改動 8 個來源檔：`public/js/app.js`、`public/js/session.mjs`、`public/js/strings.mjs`、`public/index.html`、`public/en/index.html`、`scripts/pages.mjs`、`test/app.test.mjs`、`test/session.test.mjs`；5 個對應 dist 檔更新。其他 19 個可執行來源及 13 份保護規格未變。[逐檔前後 hash 與快照對應](evidence/m1/r01/change-summary.json)。

新增回歸各在繁中／英文實際 app event handlers 執行：過大（不讀取）、讀取拒絕、malformed CSV、INVALID_UTF8、取消後晚回、驗證成功替換、模板改動中讀取、選項改動中讀取、貼文再編輯中讀取、舊檔晚回於新檔失敗之後。均核對貼文／模板／選項、目前來源、失效成果與下載；失敗流程也實際按回復按鈕重新載入並產生原名單。這是 Node 假 DOM，真 browser gate 仍 NOT_RUN。

歷史來源 tree SHA-256 `62dbeac59f5a7b728c70fad603532681d67b99e5da25410e293db5e52d40cc97` 的 [manifest](evidence/m1/r01/before/source-manifest.json)、[52/52 結果](evidence/m1/r01/before/final-gates.json)、舊 delivery manifest、原始 logs、受影響檔案與文件快照完整保留。舊 pages generator 快照從只移除新增按鈕行重建，bytes/hash 與舊 manifest 逐字核實才保存，沒有猜測覆寫任何來源。舊候選仍有 R01 缺陷，不應作為目前可交付候選。

本輪完整 [74/74 命令總表](evidence/m1/r01/final-gates.json) 與 [環境比對](evidence/m1/r01/environment-comparison.json) 均 PASS。未開 server／browser／native，未讀取或寫入真 clipboard，未 push 或 deploy。

## 固定來源與環境

可執行來源 27 個檔案的 tree SHA-256：

`cd159a2f17a6281eca9f4cdeb102110a39f5e7c3774659b3bc676b28d3427f32`

演算法：依相對路徑排序，串接 `path + NUL + decimal bytes + NUL + file SHA-256 + LF` 後作 SHA-256。清單同時列出 13 個 dist 檔的 bytes/hash；原 13 份保護規格另外見 [spec-comparison.json](evidence/m1/spec-comparison.json)。本 tree hash 不含可變 HANDOFF／TASK-ENTRY／evidence，避免自我引用；交付檔案總清單另見 [delivery-manifest.json](evidence/m1/delivery-manifest.json)。

|持久狀態|前後值|
|---|---|
|User PATH|ExpandString，834 chars，16 entries，ephemeral 0，SHA-256 `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb`|
|Machine PATH|String，1227 chars，30 entries，ephemeral 0，SHA-256 `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8`|
|User Environment key|18 values，fingerprint `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a`|
|Machine Environment key|26 values，fingerprint `a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82`|

前置、最終前置與後置快照，以及 TEMP/TMP hashes 均保留於 evidence/m1/environment-*.json。[比對結果](evidence/m1/environment-comparison.json) PASS。R01 另存前後完整快照於 evidence/m1/r01/environment-*.json，[R01 比對](evidence/m1/r01/environment-comparison.json) PASS，亦與初版 M1 後置狀態相同。既有重複 PATH 項未動。沒有持久設定修改，沒有憑證／Git auth 操作。

## 主代理下一步與未驗風險

1. 先按固定清單獨立讀實作與 diff，重驗核心與產物；原規格文件的「尚未實作」文字為唯讀原始規格，本 HANDOFF 才是本輪狀態。
2. 真正隔離機制確認前，保持所有 browser／native gates **NOT_RUN_USER_FOCUS_INCIDENT**，不得用 Node／DOM fakes 或本地 hidden tab 替代。待驗項完整見 [REVIEW.md](evidence/m1/REVIEW.md)：320 CSS px、200% zoom、Tab／Shift+Tab、screen reader、長文／密集清單、clipboard 成功與拒絕、真下載與檔案 bytes、reset／pagehide／BFCache／晚回競態、Network／Storage／實際 HTTP headers。未建立 screenshot 證據。
3. 必要驗收完成後，由主代理另發具體 M2 放行給本原功能對話，才可建立審核 publishing copy 與公開 GitHub。M3 hosting 與雙語首頁整合仍由主代理執行。候選 `templates.glossquote.com` 未部署、未當正式網址使用。
4. 本輪不建獨立交付 ZIP；由主代理把此固定候選、版本及 PASS／NOT_RUN 範圍納入單一整合 ZIP。產品要在 release 與主驗後才交外部覆核，仍不得標成完成。

## 2026-10-23 — B20-RP-43 / M1B 離線發布準備（最新追加）

本輪按 `.runs/batch20-release-prep-2026-10-23/TASK.md` 完成有界發布工具鏈；**待主代理獨立驗證，不是 M2 放行、公開來源或上線。** 前面的 M1/R01 記錄與原 evidence 保留為歷史。產品 public/runtime/dist 仍是同一份 M1/R01 bytes；新增工具鏈後，整體來源 hash 另列於本節，不覆寫 M1 manifest。

實際 source diff：package.json 新增 build:release/check:release；.gitignore 忽略 release-artifacts 與本輪 scratch；新增 [scripts/release.mjs](scripts/release.mjs)、[test/release.test.mjs](test/release.test.mjs)；既有 test/toolchain.test.mjs 僅把 scratch 從舊 evidence/m1 移到 evidence/m1b。另新增 [M1B-RELEASE.md](M1B-RELEASE.md)、evidence/m1b/**、release-artifacts/**，追加 HANDOFF/TASK-ENTRY。未改 public、dist、舊 evidence、規格／AGENTS／docs、其他工具／root／首頁／看板。

正式候選根目錄為 **release-artifacts/site/**（14 檔），manifest 在 sibling release-artifacts/manifest.json；預定 origin 固定 `https://templates.glossquote.com`，toolSlug=`template-merge`。兩語 HTML 只改 head SEO；runtime 與 body 保留，原「候選」文案保留。manifest 與整個輸出都由固定 M1 public 來源重建核對，來源 pin、未知／缺失／竄改／symlink/junction／不完整輸出均 fail closed。完整合法重建唯讀 no-op，不刪除或覆寫既有輸出。細節、復現命令、I/O 中斷限制與未驗項見 [M1B-RELEASE](M1B-RELEASE.md)。

原 public/_headers 已存在，直接保留完整原安全設定，僅改 X-Robots-Tag 為 index, follow；沒有使用 fallback／啟動 serve。robots Allow + sitemap 指預定 origin，sitemap 僅兩個 canonical、無 lastmod。這些是離線配置，未當作實際 hosting 或 Network 證據。

實際驗證：`node --test test/release.test.mjs` exit 0，19/19；最終一次完整 **npm test 93/93**、**npm run check**、**npm run build:release**、**npm run check:release** 均 exit 0。執行使用本輪 process-local npm wrapper，直接載入既有官方 CLI，子程序 shell:false/windowsHide:true、cache/config/暫存在本輪 evidence、offline=true；未修改安裝、帳戶 npm config 或持久 environment。沒有重跑原 preview build；完整產品測試依契約跑一次，不冒充真 browser。

證據：[final-gates.json](evidence/m1b/final-gates.json)、[source-manifest.json](evidence/m1b/source-manifest.json)、[protected-inputs.json](evidence/m1b/protected-inputs.json)、[環境比對](evidence/m1b/environment-comparison.json)、[release manifest](release-artifacts/manifest.json)。完整 User/Machine Environment fingerprint、PATH type/length/hash、TEMP/TMP 前後相同；原 public/dist/舊 evidence 及保護規格逐檔比對不變。

|內容|固定 SHA-256|
|---|---|
|M1B 來源 29 檔|`52b2b7335e52ff6c1ce2e7baf5407762d1135591eae6f9f7bd3064344596f4ca`|
|原 public 13 檔|`faa77fd2ec6893118a60b4ea23ae0ed34e0971776081b94c72f56aafdede74ee`|
|release site 14 檔|`51c54ae8f632976bd26d95e170effeb9a524f84d772f736ecb2cbaa8a9b36fa8`|
|release manifest 本身|`347cc3fc0e83f40a761b250dc12e6aa954d288981b440c92f28af4ce59059711`|

真 UI/browser/native/Network/Storage/實際 HTTP headers 仍 **NOT_RUN_USER_FOCUS_INCIDENT**。未發布、未部署、未改共用首頁。沒有缺少依賴／憑證／權限而需現在詢問的決策；下一步由主代理獨立驗證與完成必要 gates，再另行放行。沒有委派、新 chat 或新 ZIP。

## 2026-10-27 — B20-43-M2A / 發布候選（待主代理審核）

依本輪 M2A 與後續規格澄清完成候選；**未 push、未部署，等待主代理審核與 M2B。** 原 M1/R01、M1B 規格與 evidence 完整保留。本輪沒有委派、新 chat、server、browser/native、桌面、clipboard、OS dialog、憑證或 Git/auth 操作，也沒有建立另份交付 ZIP。

發布設定採用 42 現行 assets-only 約定，僅替換 Worker 與主機名稱：Worker `glossquote-template-merge`，日期固定 `2026-10-24`；唯一 custom_domain route 為 `templates.glossquote.com`；build command 為 `node scripts/release.mjs build`。assets.directory=`./release-artifacts/site`、run_worker_first=false、html_handling=none、not_found_handling=none；workers_dev、preview_urls、send_metrics、observability/logs/invocation_logs/traces 全為 false。沒有 main、binding、vars 或環境覆寫。此為準備好的設定，不代表網域或 Worker 已配置。最新澄清取代較早的 404-page／禁止 routes/build 文字。

[wrangler.jsonc](wrangler.jsonc) 採 strict JSON（不含註解），build/check 同時驗證每層完整鍵集合、型別及固定值，並要求 JSON 兩空格與 LF 序列化，拒絕 duplicate keys／不明欄位／缺鍵／額外 route／改名／改日期／開啟日誌與 telemetry／改資產或 build 路徑。設定變更會在輸出寫入前拒絕，已建置後變更亦拒絕；正式建置末端再次確認設定 hash。

Cloudflare 官方文件確認 [assets-only 不需 main 與 assets 欄位](https://developers.cloudflare.com/workers/wrangler/configuration/)、[html_handling=none 保留明確 HTML 路徑](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/) 與 [_redirects 行格式及優先序](https://developers.cloudflare.com/workers/static-assets/redirects/)。日期、隱私及 strict keys 依本輪明確契約；未採用 skill 的一般新案日期／logs 建議，沒有新增 runtime、相依或 binding。

正式站點為 `release-artifacts/site/` **15 檔**，manifest 為 sibling。兩頁 canonical／hreflang 仍指 `/index.html`、`/en/index.html`；SEO/robots/sitemap 延續 M1B。相較 M1B，只移除正式 HTML 的兩語候選頁尾，加上固定三行 redirects 及對應 manifest。public/dist 的 13 檔逐 byte 不變，8 個 browser JS 模組與 CSS 亦不變；預覽仍保留候選文案及 noindex。CSP 與所有既有 release _headers bytes 不變。

release _redirects 精確為下列 65 bytes（LF，最後一行也有 LF），納入封閉 allowlist、manifest 與獨立預期 bytes 驗證：

```text
/ /index.html 301
/en /en/index.html 301
/en/ /en/index.html 301
```

來源實際變更：scripts/release.mjs、test/release.test.mjs、test/toolchain.test.mjs（只移測試 scratch）、.gitignore（忽略本輪 scratch/cache）；新增 wrangler.jsonc。其他新增項限本輪 evidence 與發布產物，HANDOFF 為追加。舊 builder 的拒絕覆寫／不接管不完整輸出／未知檔及 junction 拒絕機制仍在。為建立新候選，先逐檔驗證原 site14 + manifest 固定 hash，再對已檢查的絕對工作區路徑作一次 rename 至 [M1B 完整封存](evidence/m2a/m1b-release-artifacts/manifest.json)，未刪除或覆寫舊產物。[封存收據](evidence/m2a/m1b-archive-receipt.json) 記錄原 manifest `347cc3fc0e83f40a761b250dc12e6aa954d288981b440c92f28af4ce59059711`，舊 evidence/m1、evidence/m1b 均保留原 bytes。

驗證（Node 24.14.0、零 install、offline 假資料）：

|命令|實際結果|
|---|---|
|node --test test/release.test.mjs|exit 0，55/55|
|npm test|exit 0，129/129，0 fail／skip|
|npm run check|exit 0，13 assets／8 browser modules／7 scripts|
|npm run build:release|exit 0，15 site files；新建候選|
|npm run check:release|exit 0|

新增 36 個測試涵蓋固定 redirects、多餘行／改目的地／缺規則／改狀態／CRLF／偽造 manifest、完整 strict config 與錯誤鍵／值／型別／重複鍵／缺檔／link。既有 19 個發布回歸與 74 個產品／工具鏈測試保留。npm 使用獨立 process-local wrapper，shell:false/windowsHide:true，空白本輪 npm config 與 task-owned cache/TEMP；既有 npm、帳戶設定及持久環境未修改。沒有再跑真 preview build，測試只在本輪 scratch 建置。

主代理既有隔離 browser r2 的 result.json 已實讀：**37 PASS／5 NOT_RUN／0 FAIL**，failures/prohibited 空集合；parent-cleanup PASS，launcherExit=0、runnerPidAbsent=true。結果與隔離邊界檔的 SHA、42 個狀態計數及 5 個 NOT_RUN 原因見 [browser-reference.json](evidence/m2a/browser-reference.json)。此為沿用原 runtime 的主代理證據，本輪沒有重新執行瀏覽器，亦不把它視為新 redirects／部署／正式 HTML 的 live 驗收。未跑項為兩語 200% 真 zoom、兩語 native/physical/assistive checks、英文 arrayBuffer 讀取完成過快而未捕捉到的取消視窗；不得當作 PASS。guard PASS 依主代理本輪放行訊息，parent cleanup 另有實讀證據。

|本輪固定內容|SHA-256|
|---|---|
|可執行來源 30 檔（含部署設定）|`6d849192668ecd94e06df5259e74d79ab0d65b9b6fdaf2ffbd3336246a966f88`|
|原 public 13 檔|`faa77fd2ec6893118a60b4ea23ae0ed34e0971776081b94c72f56aafdede74ee`|
|release site 15 檔|`ebf9af6a161e142c71e34fac3feeb6dce47321bdfc8b9110db41827b632f1e71`|
|release manifest 本身|`1c1235605d57fd66985ff564941cdbff2e67f5a0cb7f1780eb1c831a998e1fb2`|
|wrangler.jsonc|`24999b44236f1df0c3952e8025fd9c40464a7fd1318e293901472752dd30e6bc`|
|固定 _redirects|`9e47a2579b08f461b1124de1e42a1bde7a79ca29d77401104f6f432d8be90e1e`|

全部來源逐檔 bytes/SHA：[source-manifest.json](evidence/m2a/source-manifest.json)。全部 15 個站點檔加 manifest 的 bytes/SHA：[release-files.json](evidence/m2a/release-files.json)；可復核的精確文字 diff：[changes.diff](evidence/m2a/changes.diff)，逐檔前後 hash／保護範圍：[change-summary.json](evidence/m2a/change-summary.json)。完整命令與 raw logs：[final-gates.json](evidence/m2a/final-gates.json)、[targeted](evidence/m2a/targeted-release.log)、[tests](evidence/m2a/final-tests.log)、[check](evidence/m2a/final-check.log)、[build](evidence/m2a/final-build-release.log)、[release check](evidence/m2a/final-check-release.log)。

User/Machine PATH 的 registry type、長度、entries、ephemeral 0、SHA，以及完整 Environment key fingerprint 與 TEMP/TMP 均前後相同；數值與快照見 [environment-comparison.json](evidence/m2a/environment-comparison.json)。[integrity.json](evidence/m2a/integrity.json) 核對來源、每個 release file、既有 evidence／規格／public／dist，以及 HANDOFF 原有前綴不變。

目前狀態：**M2A 候選已就緒，待主代理審核與 M2B；來源未發布、hosting 未部署、live redirects／404／canonical／HTTP headers 未驗，外部覆核未進行。** M2B 才處理審核 publishing copy、Git guard 與公開 GitHub；後續 hosting／雙語首頁整合由主代理控管。不得把本輪 PASS 說成已上線或整個產品完成。

## 2026-10-27 — B20-43-M2B / 公開來源已驗證

主代理已獨立通過 M2A release tests/check/build/check、產物逐 byte 一致及實際 diff 審查後放行本輪；本輪只處理公開 GitHub 來源，**未部署、未改首頁；hosting／live HTTP 與外部覆核仍待後續。** 要求的模型配置為 gpt-6.1-sol/max，未以自述聲稱獨立證實 backend。

公開 repository：[KYStr/glossquote-labs-template-merge](https://github.com/KYStr/glossquote-labs-template-merge)；固定 main／remote HEAD／匿名 API commit：

`837048c6d60ba79b5e2216937f7f993e36d36681`

實際 publishing copy：`<LOCAL_WORKSPACE>/.runs/batch20-completion-2026-10-27/owner-43-publish/publishing-copy`。來源來自本工具的 30 個 M2A 執行輸入，SHA tree 仍為 `6d849192668ecd94e06df5259e74d79ab0d65b9b6fdaf2ffbd3336246a966f88`；runtime、public、dist、wrangler、測試與 release 行為皆未變。公開 tracked payload 為 **45 個 regular files**；包含所有執行來源、四份原需求、docs、精簡 README/HANDOFF 與可攜驗收紀錄。沒有 secrets、帳戶設定、node_modules、scratch/cache、generated output 或機器專用歷史封存。公開文件改寫只存在於審核 copy，原工作區文件保留並追加本節。

測試 fixture 審查發現 release tests 讀取 dist；dist 可由 13 個已追蹤 public 輸入確定性生成，因此公開 README 明列 fresh clone 先 `node scripts/build.mjs`，再測試。乾淨 clone `<LOCAL_WORKSPACE>/.runs/batch20-completion-2026-10-27/owner-43-publish/clean-clone-prepublish` 的該固定 commit 已實跑 preview build、完整 **129/129**（0 fail／skip）、check、release build、release check，全部 exit 0，無 install／server／browser／native 操作。每個 tracked file 測前後 hash 一致；所有 release bytes 及 manifest 與既有 M2A 相同。

推送後另外匿名 HTTPS clone 至 `<LOCAL_WORKSPACE>/.runs/batch20-completion-2026-10-27/owner-43-publish/clean-clone-remote`；45 檔 inventory／bytes／SHA 與測過的固定 commit 全部相同，working tree clean；release build/check 再確認 15 檔與 manifest 一致。相同輸入的完整 129 測試沿用推送前乾淨 clone 結果，未聲稱在遠端 clone 重跑完整 suite。匿名 GitHub REST API 確認 visibility=public、private=false、default_branch=main、main commit 相同；匿名 git ls-remote 確認 symbolic HEAD 為 main，HEAD/main SHA 相同。沒有 force、global/system Git/auth 設定、憑證讀取或權限擴張。

release manifest SHA-256：`1c1235605d57fd66985ff564941cdbff2e67f5a0cb7f1780eb1c831a998e1fb2`；tracked 45-file tree SHA-256：`67f7705dd0f49f727e31618683c53b56747cc530f10e7fc2a70b2f48f63f8111`。完整 commit／repo／各 clone 實際路徑、必要命令／exit、fixture 範圍、逐檔 bytes/SHA 與 guards 見 [publication-receipt.json](evidence/m2b/publication-receipt.json)、[tracked-inventory.json](evidence/m2b/tracked-inventory.json)、[clean-clone-results.json](evidence/m2b/clean-clone-results.json)、[remote-verification.json](evidence/m2b/remote-verification.json)、[匿名 GitHub API](evidence/m2b/github-public-api.json)。原始命令 logs 留在本工作區 `.runs/batch20-completion-2026-10-27/owner-43-publish/logs/`，主代理可直接讀取。

Git settings guard 前後三份檔案存在性／bytes／SHA 完全相同；User/Machine PATH type／長度／hash／ephemeral 0 及完整 Environment fingerprint／TEMP／TMP 亦相同。證據：[Git before](evidence/m2b/git-settings-before.json)、[Git after](evidence/m2b/git-settings-after.json)、[Environment comparison](evidence/m2b/environment-comparison.json)。既有 162 份 M1/M1B evidence 與全部 M2A 保護檔案未變；舊 M1B 產物仍封存於原 M2A evidence。

browser r2 繼承 **37 PASS／5 NOT_RUN／0 FAIL**，必要隔離與 cleanup 依主代理已通過。人工 NOT_RUN（兩語真 200% zoom、兩語 native/physical/assistive、英文讀取取消視窗未捕捉）完整保留；本輪沒有 UI 檢查或重新標 PASS。**來源公開發布通過；hosting 未部署、live redirects／404／正式頁 headers 未驗，外部覆核待後續，不標整個產品完成。** 本輪未另建 ZIP，由主代理納入單一整合交付。

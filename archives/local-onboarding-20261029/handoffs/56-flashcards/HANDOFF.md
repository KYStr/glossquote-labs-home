# 問答卡製作與練習 交接

2026-10-23（Asia/Taipei）。版本 `0.1.0-m1`，目前候選 **M1-r3（B20-56-R01）**。已修正主代理指出的 JSON 草稿遺失，完成本地 Node／靜態工具鏈驗證，交主代理獨立重驗。這不是 release，也不是完整產品驗收通過。M1-r2 已被本次候選取代，舊證據保留。

|範圍|實際狀態|
|---|---|
|雙語候選、A01–A12、Node/mock/check/build|PASS_M1_NODE_STATIC_ONLY；71 tests、0 fail，包含 R01 18 項兩語 app 事件回歸|
|完整 ESM 語法|PASS；21 檔 `node --check`|
|public → dist|PASS；14 檔封閉清單與逐檔 bytes/SHA 相同|
|固定來源前後比對|PASS；42 檔、215196 bytes，見下方 scope|
|真瀏覽器／原生／真機 B01–B05|NOT_RUN_USER_FOCUS_INCIDENT；逐項見[R01 驗收狀態](evidence/m1/r01/ACCEPTANCE-STATUS.md)|
|User/Machine Environment guard|PASS_UNCHANGED；初始至最終完整指紋相同|
|GitHub source / reviewed / released commit|NOT_CREATED / NOT_REVIEWED / NOT_RELEASED|
|GitHub 可見性／Cloudflare／雙語首頁|NOT_PUBLISHED / NOT_DEPLOYED / NOT_INTEGRATED|
|外部驗收|NOT_RUN；尚未進入 awaiting external review|

requested `gpt-6.1-sol/max`；沒有以自述證明 backend。未開 server、browser、CUA、原生對話框、截圖、新 chat、子代理或跨里程碑 Goal。未讀取真實使用者資料或憑證，未安裝套件、配置服務、推送 Git、修改共享路徑或持久設定。

## 實際變更

- 新增 [package.json](package.json)、[.gitignore](.gitignore)、[TASK-ENTRY](TASK-ENTRY.md)。Node 24 ESM、零 runtime/dev 依賴。
- `public/` 14 個檔案：繁中／英文靜態頁、404、noindex robots 與安全 headers、家族 tokens 的響應式 CSS、app/controller、兩語文案及四個純核心模組。
- 核心實作 RFC4180 逗號／引號／LF／CRLF、UTF-8 fatal、來源／張數／欄數／每面 UTF-16 上限、原字串保留、整份拒絕壞列、exact schema1、固定 ID、自評、固定待複習批次、Fisher-Yates／xorshift32。
- UI 實作空頁起始、明確載入假例、欄位序號選擇、揭答案後自評、上一題／略過、明確本輪結束、全部／待複習、可重現洗牌、重設與編輯的頁內確認、JSON 預覽確認／取消、JSON／列印 HTML 真內容與本地下載。
- controller 同步失效輸出，FileReader generation／取消／晚到丟棄；Blob URL 單一擁有，30 秒計時回收，替換／清除／pagehide 回收；下載拒絕保留可選文字。pagehide 清狀態，bfcache 返回初始化空頁。
- `scripts/` 7 個腳本：check、封閉 allowlist build、只在明確執行時啟動的 loopback serve、固定頁面產生器、順序 gates 與來源／產物證據腳本。所有自行啟動的 child 都以 `shell:false, windowsHide:true` 呼叫；M1 沒有啟動 serve。
- `test/` 6 個檔案：核心、controller、工具鏈、兩語假 DOM、R01 JSON 草稿 app 事件回歸與輔助假 DOM。假 DOM 不是 browser、沒有 layout／Network／Storage 證據。
- `dist/` 僅 build 生成；`evidence/m1/` 保留每次命令、歷史失敗、最終固定來源、真實假資料輸出及環境比較。原規格／AGENTS／docs 未編輯，兄弟／共享／根目錄未寫入。

## 實際執行與歷史

使用 `C:/Program Files/nodejs/node.exe`（`v24.14.0`）及明確的 `C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js` 執行 npm。不是安裝，也沒有依賴下載。

|階段|npm test|npm run check|npm run build|證據|
|---|---|---|---|---|
|T00|exit 0；6/6|exit 0|exit 0|[t00](evidence/m1/t00-commands.json)|
|T01 初輪|exit 1；27/28|NOT_RUN（test 失敗停止）|NOT_RUN|[保留失敗](evidence/m1/t01-commands.json)|
|T01 修正後|exit 0；28/28|exit 0|exit 0|[t01-2](evidence/m1/t01-commands-attempt-2.json)|
|T02 初輪|exit 1；23/28|NOT_RUN（test 失敗停止）|NOT_RUN|[保留失敗](evidence/m1/t02-commands.json)|
|T02 修正後|exit 0；49/49|exit 0|exit 0|[t02-2](evidence/m1/t02-commands-attempt-2.json)|
|T03|exit 0；50/50|exit 0|exit 0|[t03](evidence/m1/t03-commands.json)|
|T04 初版|exit 0；50/50|exit 0|exit 0|[保留初版](evidence/m1/final-commands.json)|
|T04 M1-r2（歷史）|exit 0；53/53|exit 0|exit 0|[r2 命令](evidence/m1/final-commands-attempt-2.json)|
|**R01／M1-r3 最終**|**exit 0；71/71**|**exit 0**|**exit 0**|[R01 最終命令](evidence/m1/final-commands-attempt-3.json)|

T01 失敗是測試正則把已跳脫的 `onerror=` 文字誤當屬性；改為只匹配標籤內屬性。T02 失敗是 import 掃描誤判英文文案；改為宣告行掃描。紀錄均未刪除。

T04 初版後覆讀發現 CSV 選檔讀取失敗會先清掉舊編輯來源；M1-r2 改為成功讀取／UTF-8 解碼後才替換。另修正切換 header 後的舊欄標籤，補 CSV 失敗保留來源、欄索引保留、離頁後晚到結果三項回歸。初版固定來源 `a9effead28c7ef2f472d553f6403c78f0eb83e080ce250db1ab83e657698b297` 已被 M1-r2 取代，保留歷史但不作交付候選。

最終執行：

```text
node scripts/finalize.mjs C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js r01
```

上列實際以分離 argv 傳參，整體 exit 0。內部完整跑 npm test／check／build、21 檔語法、產物寫入與逐 byte 比對；沒有 shell 指令拼接。正常重驗可執行 npm test／npm run check／npm run build；finalize 的證據採 exclusive create，新的重驗須用新的 run name，不能覆寫歷史。

## R01 修正差異與回歸

- `public/js/app.mjs`：移除 JSON 選檔 change 與 cancelImport 的清空草稿。匯入流程只有 `confirmImport()` 回傳成功才清除貼文；既有「清除整個頁面」及 pagehide 的明確資料清理仍保留。
- `public/js/controller.mjs`：預覽狀態增加固定 enum `pendingImportSource`（paste／file），失效／取消時清除。沒有把檔名或使用者 JSON 加入 URL、log、storage 或輸出 schema。
- 兩語 locales、`scripts/pages.mjs` 及生成的兩份 index：預覽可見標示來源是「剛選取的 JSON 檔案」或「貼上區 JSON」，檔案預覽也明說貼上草稿未被使用且尚保留。
- 新增 [json-draft.test.mjs](test/json-draft.test.mjs)：兩語各 9 項，使用實際 mount 的 app change／click 事件，覆蓋過大、讀取失敗、非法 UTF-8／schema／JSON、讀取中取消與晚到結果、檔案預覽取消、貼文預覽取消，以及檔案／貼文成功確認才清空。每個失敗／取消均核對逐字相同的草稿（含前後空白）、原 3 張 deck、已會 ID 1、舊下載失效；預覽核對實際 file／paste 題目。
- [修改前副本](evidence/m1/r01/before/HANDOFF.md)、[差異與 byte/SHA 索引](evidence/m1/r01/change-summary.json) 留在本工具 evidence。僅本工具產品檔、測試、交接及 build/evidence 改動；無 shared／發布／部署／委派。

M1-r2 的完整候選 manifest（43 檔、218899 bytes、SHA `83768869c4ad8da32fe3404efd3ebe22b5251fd75f8acf87fc853a7ec395aaed`）仍在[原 manifest](evidence/m1/candidate-manifest.json)，不再作為目前交付候選。

## 固定來源與可取用輸出

[最終摘要](evidence/m1/r01/final-summary.json) 與 [source-before](evidence/m1/r01/source-before.json)／[source-after](evidence/m1/r01/source-after.json) 完全相同：**42 files、215196 bytes**；聚合 SHA-256：

`ebbe7f3c469ca1da60e84ab6cc594d13abf5e31b03c7c85a91a2de5a615c59ce`

聚合算法是對依路徑排序的 `{path,bytes,sha256}` 陣列以 `JSON.stringify(files) + LF` 再做 SHA-256；每檔原始 bytes/SHA 在 manifest。這個前後驗證包含 runtime、scripts、tests、13 份鎖定契約，排除只作文字記錄的 HANDOFF／TASK-ENTRY、dist 與 evidence。最後另列[完整候選清單](evidence/m1/r01/candidate-manifest.json)，包含兩份交接記錄，供主代理單一整合 ZIP 使用。

[dist 清單](evidence/m1/r01/dist-files.json) 逐檔與 public 同 bytes。實際輸出由同一 controller 從自建 3 張假題資料產生，包含 Unicode、引號、換行與惡意標籤文字；已會 ID 為 `[1]`，非 browser 下載證據：

|輸出|bytes|SHA-256|
|---|---:|---|
|[input.fake.csv](evidence/m1/r01/outputs/input.fake.csv)|208|2071c81fd318c1e2e7b0d50eea7f07432afb8de53f2edeb3de7cc8b9d26259eb|
|[JSON 題庫與進度](evidence/m1/r01/outputs/flashcards-deck.json)|449|fe246b362ceb9d518915ccc82b681b07884eacecac664c43975cc60cdf3493d1|
|[繁中列印 HTML](evidence/m1/r01/outputs/flashcards-study-zh-Hant.html)|2105|c1c10e34402324e5b41b72b78b910ef180f0bd87d53937113395c7ea8074d971|
|[英文列印 HTML](evidence/m1/r01/outputs/flashcards-study-en.html)|2100|a47bbd4abfa4a9875dd8e635c242a1f24b39249dbf78316acd7d7274ae219b2b|

實際 UI 下載名固定 `flashcards-deck.json`／`flashcards-study.html`；表中 HTML 加語言尾碼只是證據區分。JSON UTF-8 無 BOM、兩空格格式與 LF 結尾，已做 schema1 round trip；HTML 無 script／外部資源／handler，只含固定 CSS 與跳脫文字，題目與答案各有同一 1–3 編號。

## 環境與限制

[R01 Environment 比對](evidence/m1/r01/environment-comparison.json) exit 0：HKCU PATH `ExpandString`、834 chars、SHA `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb`；HKLM PATH `String`、1227 chars、SHA `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8`；兩者 ephemeral entries 皆 0。全 Environment fingerprint、值數、TEMP/TMP hash/type/length 亦完全相同，完整資料見 [before](evidence/m1/r01/environment-before.json)／[after](evidence/m1/r01/environment-after.json)。既有 duplicate PATH entries 保留原狀。

來源 CSV 1 MiB、JSON 2 MiB、500 張、每面 2000 UTF-16 單位依契約執行。大量 Tab／引號可能使合法 CSV 在 JSON 跳脫與兩空格格式化後超過 2 MiB；會以雙語 `EXPORT_TOO_LARGE` 拒絕準備 JSON，保留題庫，建議先存 HTML、拆小來源，不會產生不能還原的 JSON 或默默丟列。HTML 不承諾雙面印表機對位。

真實 browser 的下載落盤／權限拒絕、Network／Storage、鍵盤讀屏／320px／200%／真機／焦點、HTTP headers／真 404／production SEO 均尚未驗。靜態正則掃描是初步檢查，不是安全證明；路由測試只呼叫純 response 函式，沒有開 server 或進行 HTTP 驗收。

待主代理對 M1-r3（R01）實際來源獨立驗收，以確認過的真正隔離機制補 B01–B05 必要項，再決定 M2 放行。預定 repo `KYStr/glossquote-labs-flashcards` 尚未建立／驗證；候選 domain `flashcards.glossquote.com` 尚未部署。未收到 M2 不發布，M3 部署／雙語首頁／單一整合 ZIP 由主代理負責，不另交散落 ZIP。

## B20-RP-56：M1B 離線發布準備（2026-10-23）

本段是本輪最新工具鏈與發布準備現況；前文 M1-r3／R01 的來源、命令與 hashes 保留為歷史。產品 public/runtime 與原 dist、全部舊 M1 證據不變。本輪 **M1B_OFFLINE_READY_FOR_PRIMARY_REVIEW**，不是 M2 或上線放行。完整重現、目錄與限制見 [M1B-RELEASE](M1B-RELEASE.md)。requested gpt-6.1-sol/max；backend 未獨立確認。

實際變更僅 package.json、.gitignore、scripts/release.mjs、scripts/release-source.mjs、scripts/verify-release-prep.mjs、test/release.test.mjs、test/toolchain.test.mjs 與本工具交接／M1B 證據及 release-artifacts。新增 build:release/check:release，原四個命令保留；舊工具鏈測試的暫存 copy 改放 evidence/m1b/fixtures，避免寫入舊 evidence/m1。沒有改 public、dist、規格／AGENTS／docs、兄弟工具或 shared。

release origin 固定 `https://flashcards.glossquote.com`，slug flashcards。build 只建立獨立 release-artifacts/site/，manifest 在 sibling；兩語僅 head SEO／robots 變更，JS/CSS／404 等非 SEO 資產逐 byte 保留。robots/sitemap 只有預定正式兩頁，無 lastmod；原 _headers 除 X-Robots-Tag 外逐 byte 相同，沒有放寬 CSP 或新增資源。來源採 M1-r3 全 public 14 檔 pins，checker 獨立重算預期內容；不信任 manifest 自述。既有修改／缺少／污染／symlink/junction 輸出不刪、不覆寫；合法重建只驗證，無時間／隨機值／本機路徑進 manifest。

先執行 `node --test test/release.test.mjs`，26/26、exit 0。最終對固定來源只跑一次完整 suite 與指定命令，實際以分離 argv 啟動 `node scripts/verify-release-prep.mjs <已確認 npm-cli.js 絕對路徑>`，整體 exit 0；[命令 stdout/stderr/exit](evidence/m1b/commands.json)：

|命令|實際結果|
|---|---|
|npm test|exit 0；97 tests／97 pass／0 fail/skip/todo（含新增 release 26 項）|
|npm run check|exit 0；原 preview 雙語結構／安全初掃|
|npm run build:release|exit 0；15 site 檔＋獨立 manifest|
|npm run check:release|exit 0；重推 expected bytes、SEO、manifest／來源／封閉清單|
|新增／修改 ESM 語法|5 檔 node --check、全部 exit 0|
|原 npm run build|NOT_RERUN_UNCHANGED_INPUTS；public/dist 不變|

[M1B 最終摘要](evidence/m1b/final-summary.json)：完整執行來源 **46 檔／248455 bytes**，前後 hash `331068c4f83660d61f959c7ae3641e6fb9256f622ff750475f1c93a8a5b69e0c` 相同；固定 public **14 檔／88761 bytes**，hash `316ad7abd6453a50151fbddfc027640a7cd22485981d25e1da4a709988af9542`。site **15 檔／89771 bytes**，hash `d46fb5bcf93651637e62151ed15f9079c3103a171fd613e6094a5624e0772f70`；完整 release-artifacts **16 檔／94263 bytes**，hash `146d1e29d2bbba060bc9239a0f3349a697a89ffc947ed165e1741aef09ab1e0d`；manifest 本身 SHA `e7c188b032d2cd61ab3f0b0d00c7ab874d119f17a622b760053487e4f8031d19`。逐檔與集合算法見新指南；[完整交接來源清單](evidence/m1b/candidate-manifest.json) 另含三份文字交接。

[受保護檔案比對](evidence/m1b/protected-after.json) 107 檔與 baseline 完全相同，含 public／dist／所有舊 M1 證據／鎖定契約。[M1B Environment guard](evidence/m1b/environment-comparison.json) 前後 PASS_UNCHANGED：HKCU PATH ExpandString／834 chars、HKLM PATH String／1227 chars，ephemeral entries 均 0；完整 Environment 指紋與 TEMP/TMP hash/type/length 一致。沒有持久修改、安裝或修復既有 duplicate PATH。

所有新反例在 m1b 自有暫存 copy：雙語 canonical/hreflang、runtime/preview 不變、重建確定、缺檔／多檔／未知目錄／來源變動、asset＋manifest 同改、錯 domain/schema、path traversal、symlink/junction、CLI 無／錯／多參數均有實際測試。這些只證明 Node／離線靜態發布準備。browser、視覺、真機、原生、Network/Storage、hosting HTTP headers/404 繼續 NOT_RUN_USER_FOCUS_INCIDENT／NOT_RUN；GitHub、部署、首頁未執行。

待主代理親讀 [10 項驗收](evidence/m1b/ACCEPTANCE.md)、[實際 diff](evidence/m1b/changes.patch)、固定候選與隔離 browser 所需 site 目錄，再決定後續 gate。沒有需要新權限／依賴的阻塞。本輪不另製 ZIP；由主代理納入單一整合交付，保留 M1 版本與歷史 SHA。

## B20-56-H2：browser runner r2 準備（2026-10-27）

只修正測試 runner，不改產品或執行 browser。新模組在 [owner-56-browser-r2](../../.runs/batch20-browser-release-2026-10-25/owner-56-browser-r2/README.md)，原 owner-56-browser 與原 manifest 原樣保留。已讀根 AGENTS 與本 run HARNESS-56-SECONDARY.md，修正的是覆蓋／runner 準備缺口，不宣稱發現產品 handler bug。

- LANGUAGE-SEO-HTTP 改以同一 root guarded context 的獨立 probe page 只讀 frozen robots/sitemap 真 response bytes/headers，單獨記錄 XML viewer inline-style CSP 訊息；probe finally 關閉，不放寬 CSP、不繞過 root guard、不在產品頁 render XML。產品 console.error 零容忍；其他 probe error 仍失敗。未知404不再請求，明確 NOT_RUN_ROOT_FINAL_HTTP_GATE，交 root final HTTP gate。
- 新增兩語 FORMAT-PRACTICE-STALE：在 prepared 狀態改 outputType、mode、practiceSeed，真 DOM 立即核對 prepared 隱藏／download disabled／outputText與filename清空、deck/known保留；三次重新準備後的真下載仍核原獨立 golden 完整 bytes。
- 兩個 keyboard workflow 都在 download 真有焦點時以 browser protocol Enter 啟動 download，核真事件、固定檔名、saveAs完成與完整 JSON golden bytes；保留原 reset/error/clear/focus/320px斷言。

14 個合成 data/oracle 與 builder bytes 完全沿用原版。r2 每語系23個案例／待驗項，共46；本輪實際執行只含 Node 語法與41項 fixture／靜態準備 assertions，並非browser測試。命令與 exit 見新模組 validation.json，差異見 changes.patch，所有 r2 輸出 bytes/SHA 在 manifest.json（自身hash另報）。原版19筆manifest檔案會再核對未變，舊browser／M1／M1B證據不覆寫。

r2 browser 執行數為0：NOT_RUN_PREPARATION_ONLY。原生／真機／AT、200%與hidden能力、root final HTTP404及公開hosting仍未驗；無 push／部署／服務／本機互動UI／桌面鍵盤或clipboard／持久環境或Git設定變更，也未委派。Root 須親讀實際diff，確認新probe繼承相同guard與console分頁分類後，才統一執行隔離 browser。產品 public/dist/release-artifacts 與程式未更動；本輪僅允許的新r2目錄與此HANDOFF追加。

## B20-56-M2A：assets-only 正式發布準備（2026-10-27）

**M2A 準備可交 root 驗證，尚未 M2B／push／部署／首頁更新；AWAITING_EXTERNAL_REVIEW。** 完整設定與證據見 [M2A-RELEASE.md](M2A-RELEASE.md) 及 [owner 入口](../../.runs/batch20-completion-2026-10-27/owner-56-release/00-START-HERE.md)。本節為最新狀態；前述 M1／M1B／H2 執行數與 hash 留作歷史，不覆寫。

- wrangler.jsonc 精確固定 glossquote-flashcards、2026-10-24、唯一 flashcards.glossquote.com custom domain；workers_dev／preview_urls／send_metrics／觀測 logs／invocation logs／traces 全 false。assets 指向 ./release-artifacts/site、run_worker_first false、html_handling／not_found_handling none，build 為 node scripts/release.mjs build；無 executable Worker／binding／新增權限。
- 正式產物僅精確移除兩語候選段落，新增三條指定 301 的 _redirects；manifest 封閉 16 個 site 檔，另以 deploymentFiles 綁定設定 bytes/hash。canonical／三組 hreflang／x-default／匹配語系 home links 實際驗證。public／runtime／CSS／CSP／locales／原 fixtures/goldens 完全保留。
- Node fake 測試 **133 PASS／0 FAIL**；npm test、check、build、build:release、check:release 五命令皆 exit 0。同份執行來源 52 檔／289791 bytes，hash `0c047974bfd8fa4ceb2a2f2d80e69d58a2ab17ecadf006119aed6f3f0861a3a8` 前後相同。首次新測試空目錄 rmSync 失敗已僅修為 rmdirSync，失敗紀錄保留；最終驗證不含稍後說明文件。
- public **14 檔／88761 bytes**，hash `316ad7abd6453a50151fbddfc027640a7cd22485981d25e1da4a709988af9542` 未變。新 site **16 檔／89732 bytes**，hash `278944b715f4d4a8c508ba17a7ae4ef8287737e70b9fe8e4ff2aa1b7df0dfbbc`；manifest SHA `e3b8f00c541288ff711746148f0d78bc48728e5aa4f3b68feea211b8d6a7d594`；wrangler SHA `e082711dacfc384b0b81f95896233b36dc83f486f3f92f4fea33a5a89b9ad410`。完整 source／artifact 逐檔身份見 owner final inventories。
- 舊 release 先原 check exit 0，安全搬至 owner baseline/release-artifacts，原 16 檔 bytes/hash 逐檔保留；未放寬既存污染輸出拒絕或覆寫保護。
- root b20-56-r2 實際 **34 PASS／12 NOT_RUN／0 FAIL**、prohibited []／cleanup PASS；owner 僅讀回條，沒有執行 browser。此回條對應原 M1B frozen site；本輪正式資產仍由 root 下一步獨立驗收。兩語各六項 zoom／hidden／native／device-AT／live-host／HTTP404 的原 reason/status 保留，外部審查仍待驗。
- Environment guard 前後完全相同：User PATH ExpandString／834、Machine PATH String／1227，ephemeral 各 0；PATH SHA／type／length、完整 Environment-key 指紋與 TEMP/TMP 都一致。無憑證／browser/UI／服務／push／部署／首頁／Git auth或持久設定變更，沒有再委派。Root 親讀完整 diff/hash 後再進 M2B；本輪交回 root 單一整合 archive 流程。

## B20-56-M2B：公開來源發布受阻（2026-10-27）

**BLOCKED_GITHUB_REPOSITORY_CREATION_RATE_LIMIT；M2B 未完成，未 push，公開可見性與遠端 commit 未驗。** 目標 `KYStr/glossquote-labs-flashcards` 建立前後 GitHub API 均回 HTTP 404。`gh repo create --public` exit 1，服務端原文：`GraphQL: You have created too many repositories, too quickly. Please try again later. (createRepository)`。這是 GitHub 建庫頻率限制；沒有登入、修改認證或改走其他方式反覆建庫。

root 已放行 M2B 且獨立五命令 exit 0。已在 [owner-56-publish](../../.runs/batch20-completion-2026-10-27/owner-56-publish/00-START-HERE.md) 保留完整乾淨副本、審查／命令回條及 [publication-receipt.json](../../.runs/batch20-completion-2026-10-27/owner-56-publish/publication-receipt.json)。本機 commit **`223654d0096064ee0c7bb3e96966becbd1296c87`**、branch **`codex/flashcards-m2b`**，僅本機，不能當遠端發布成功。

乾淨副本 51 個來源檔／264603 bytes，集合 SHA `e55b32ce9faab1a8727306b7ba6097416c27042a3f5c14437313e13b4c178911`；完整 public／scripts／test／package／wrangler／.gitignore 共 36 檔與 root primary-fixes/56 逐 byte 相同，SHA `2d06c580f77e8012ea4d1392dd9f12da727b72d3a2bbacd501030d0a3bd8e478`。原必要規格／docs 完整保留，以可攜 HANDOFF、RELEASE 摘要取代本機歷史稽核敘述；沒有 `.runs`、node_modules、憑證、機器路徑或無關檔案入列。原始本地文件與歷史證據未覆寫。

乾淨副本 npm test **133 PASS／0 FAIL**，npm test／check／build／build:release／check:release 五命令全部 exit 0；前後來源 hash 一致，17 個 release 檔與 root 逐 byte 相同。release manifest SHA `e3b8f00c541288ff711746148f0d78bc48728e5aa4f3b68feea211b8d6a7d594`。51 個檔案的 Git staging 及本機 commit blob 已逐 byte/SHA 核對；[tracked-inventory.json](../../.runs/batch20-completion-2026-10-27/owner-56-publish/tracked-inventory.json) 明確只屬 LOCAL_COMMIT_BLOBS_ONLY_NOT_REMOTE，遠端逐檔驗證 NOT_RUN。

Environment guard 前後完全相同：HKCU PATH ExpandString／834、HKLM PATH String／1227、ephemeral entries 各 0，PATH SHA/type/length、完整 Environment-key 指紋及 TEMP/TMP 均一致。Git guard 三份 user/system 設定檔存在／bytes／SHA 前後相同；建立失敗後 verify 亦 PASS。所有 Git 設定僅 per-command，無 gh auth setup-git/login/refresh、global/system writes、憑證讀取或認證 debug。

沒有 browser/native/桌面操作、付費、再委派、部署或首頁更新。root r2 **34 PASS／12 NOT_RUN／0 FAIL** 及外部待驗原狀保留；沒有標外驗通過。下一步是 GitHub 允許建立 repository 後，從現有固定副本續辦建庫／push，再核公開 API、branch、remote HEAD 與完整遠端 bytes/SHA；未變動的來源不需為此重跑已通過檢查。單一整合交付仍由 root 負責。

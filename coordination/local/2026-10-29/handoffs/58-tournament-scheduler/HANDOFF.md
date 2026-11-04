# 循環賽賽程表 交接
狀態：**M1 雙語候選已實作、離線驗證通過，凍結交主代理獨立複核；必要 browser gates 待驗。** 未公開、未部署、未做外部驗收，不代表完整產品完成。

版本 `0.1.0-m1`，2026-10-23（Asia/Taipei），任務 B20-58-M1。準備規格仍標「尚未實作」是因本次禁止改那 13 份契約/規格，實際狀態以此交接及固定證據為準。

2026-10-23 T00：已建 Node ESM/private scaffold、四個 scripts 入口及純核心/test placeholders；Node v24.14.0（exit 0）。尚未執行核心/check/build 驗收；placeholder 不視為通過。

T01：完成 NFC+trim、區分大小寫、1–80 scalar、2–32 隊、控制字元/分隔符/非 scalar 拒絕，以及唯一尾換行規則。raw 上限 16,384 UTF-16 units 在正規化前執行；錯誤保留原輸入、回傳 teams=[]。已加入手寫邊界測試，結果待最終驗證紀錄。

T02：完成固定 circle、odd bye、雙循環反向、每輪 slot/court 與完整對手索引。加入 4/5/6 隊手寫 oracle、992 參數組合獨立 pair/direction/bye/slot 計數，以及破壞資料反例；未用被測 generator 產生 expected。結果待最終驗證。

T03：完成完整 timing group、Gregorian 整數民用日期、跨日 +N day、實際 slot 間一次換場與最後場終點；JSON schema 1、雙語完整 TXT（含全部對手表）。共享編碼閘對兩份 UTF-8 bytes 合計 2 MiB 做原子限制，實際超限不回傳任一檔 bytes；已加入精確 2 MiB/+1 byte 與 serializer 邊界測試。結果待最終驗證。

T04–T06：雙語真實生成 UI、完整逐輪場次/輪空、選隊伍對手表、選配時間、錯誤摘要與欄位關聯、手機文字頁籤、頁內清除確認已實作。所有輸入事件先同步失效舊產物；TXT/JSON 只在明確按下載時建 Blob/URL，edit/clear/pagehide 撤銷與清引用。同步短作業無假取消/假進度；generation token 拒絕過期提交。預覽 noindex、固定兩語 SEO/FAQ、同語系首頁連結。此段為原始碼實作狀態，尚無真 browser PASS。

T07：check 實際以 Node parser 驗 ESM，檢查閉合 8 檔、HTML 靜態結構/兩語 copy/label/ARIA/noindex/資源規則，regex 僅補充靜態檢查；build 對閉合來源/輸出與 bytes 重驗，拒絕 unknown/junction/stale、不刪未知輸出。serve 固定 127.0.0.1:4238、精確 allowlist/MIME/Host/traversal/GET/HEAD/404/405，測試只直接呼叫 handler，不啟動 listener。已加入離線 structural DOM event harness 與 Blob/URL lifecycle 反例；不視為真 HTTP/browser。命令結果待記錄。

T08：最終 42/42 離線測試通過；check/build exit 0；5 份合成賽程的 10 個實際 UTF-8 輸出均以獨立固定 oracle、完整 pair counter 和 bytes/SHA-256 重讀驗證。環境 guard 前後完整 Snapshots 完全相同；凍結清單見下。T00–T08 在 M1 授權範圍內已完成，下一步為主代理獨立複核與安全隔離 browser gate，未自行進 M2。

|範圍|狀態|
|---|---|
|實作/Node/check/build|PASS_M1_OFFLINE（42 tests；三條 npm 命令各 exit 0）|
|真瀏覽器/原生/真機|NOT_RUN_USER_FOCUS_INCIDENT|
|真實 listener/loopback HTTP|NOT_RUN（本次明確禁止啟動 server；offline handler cases PASS）|
|Windows Environment 前後完整快照|PASS_UNCHANGED|
|來源與 preview bytes/SHA-256|固定於 evidence/m1/candidate-manifest.json|
|GitHub/正式網址/首頁|NOT_PUBLISHED|
|外部驗收|NOT_RUN|

每輪記錄需求、實際檔案、差異、命令與 exit、固定檔案 bytes/SHA-256、未驗與已知限制；產品 source commit、reviewed commit、released commit 分開。不得刪歷史失敗或把缺口改 PASS。使用者接受保留手動待驗不等於豁免必要 gate。

## 已交付行為與實際差異

- `public/js/core/{teams,circle,timing,output}.mjs`：NFC+trim、嚴格邊界、circle 單/雙循環、byes、每輪 slot/court、不含尾端換場的民用分鐘/日期、schema 1 JSON 和完整雙語 TXT。
- `public/{index.html,en/index.html,styles/app.css,js/app.js}`：雙語可操作表單與錯誤、全部輪次/場次預覽、每隊對手表、手動完整下載、手機文字頁籤、清除確認；編輯/清除/pagehide 同步失效與 URL 清理。
- `package.json`、`.gitignore`、`scripts/**`：零依賴 Node24 ESM、真正 syntax check、閉合 preview build、受限 loopback handler/dev 入口、隔離 npm config/env 的驗證紀錄與候選雜湊。
- `test/**`：42 個測試，其中完整 Cartesian oracle 對 992 組條件逐組獨立驗所有 pair、方向、bye、slot/court；另有 hand-written TXT/JSON、日期/byte 邊界、失效/cleanup/拒絕反例及離線 UI event logic。
- 新增 TASK-ENTRY/evidence/m1、生成 dist 8 檔；只修改本工具 HANDOFF，其餘初始 13 份規格/契約保留。沒有共享首頁、看板、兄弟工具、GlossGate 或憑證操作。

初始 `git status` 為整個工具資料夾 untracked，因此沒有可用的已追蹤基線 diff；新增實作可依 [固定完整來源清單](evidence/m1/candidate-manifest.json) 逐檔審閱。未 stage/commit/push，不用空白 git diff 冒充已審變更。source/reviewed/released commit 目前均為 null；repo URL/live URL 未建立。

## 最終命令與證據

工作目錄為本工具根目錄；Node `v24.14.0`，既有 `C:/Program Files/nodejs/node.exe`，無 npm install。`scripts/verify.mjs` 以現有 npm-cli.js 執行三條 npm 命令，直接 child `shell:false/windowsHide:true`，離線模式、只傳非憑證環境 allowlist、空 task-owned user/global npm config；不讀帳戶 npm 設定、不修改持久環境。

|實際命令|Exit|結果|
|---|---:|---|
|`node --version`|0|v24.14.0|
|`node --test test/*.test.mjs`（初輪）|0|41 PASS，0 fail/skip/todo；保留 [初輪紀錄](evidence/m1/preliminary-tests.json)|
|`node scripts/capture-evidence.mjs`（第一輪）|1|Buffer/Uint8Array 型別比較斷言錯誤，未做完內容驗證；失敗與部分 TXT 保留，見下|
|`node scripts/capture-evidence.mjs`（修正後）|0|5 份賽程/10 實檔；獨立重讀 oracle/bytes/hash 通過|
|`node scripts/verify.mjs`|0|依序執行下列三條命令|
|`npm test`|0|42 tests / 42 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo；2322.191 ms|
|`npm run check`|0|8 檔 public、ESM parser、雙語靜態契約；非 browser/security acceptance|
|`npm run build`|0|8 檔 preview dist，noindex,nofollow，與 public bytes 一致|
|既有 `check-persistent-environment.ps1` 前/後|0 / 0|完整 Snapshots 相同，未改持久狀態|

原始 stdout/stderr 與退出碼在 [final-commands](evidence/m1/final-commands/results.json)；完整 A/B gate 對照在 [驗收紀錄](evidence/m1/ACCEPTANCE-RESULTS.md)。失敗比對曾對 Buffer 和 Uint8Array 使用 deepStrictEqual，修正為比較 bytes，保留 [失敗紀錄](evidence/m1/artifact-attempt-1-failure.json) 與 `evidence/m1/output-fixtures/`，只有 `output-fixtures-verified/` 是完成驗證的產物集。

## 實際產物與凍結

[產物 manifest](evidence/m1/output-fixtures-verified/manifest.json) 列每檔完整 bytes/SHA-256。資料全部是假隊名，不是使用者資料。

|合成賽程|輪/場|TXT bytes|JSON bytes|
|---|---:|---:|---:|
|5 隊單循環・繁中|5 / 10|2352|6133|
|5 隊單循環・English|5 / 10|2230|6133|
|4 隊 09:00、60+10 分・English|3 / 6|2158|3568|
|2 隊 23:30 跨日・繁中|1 / 1|722|977|
|32 隊雙循環、1 場地、最長時間・English|62 / 992|379032|487948|

最長時間輸出最後一場起點 offset 1545960、終點 1547400；民用顯示 `2102-12-11 13:59 (+1075 day)`，沒有末尾換場。4 隊 oracle 為 09:00、10:10、11:20、12:30、13:40、14:50，最後結束 15:50。

[候選 manifest](evidence/m1/candidate-manifest.json) 列 39 份來源（含不變契約、實作、測試及本交接）和 8 份 dist 的固定 bytes/SHA-256。`node scripts/freeze.mjs --verify` 可重讀檢查。freeze/capture/verify 初次寫證據使用不覆蓋策略；重驗既有候選可直接用 `node --test test/*.test.mjs`、`node scripts/check.mjs`、`node scripts/build.mjs`，不要盲目覆寫歷史證據目錄。build 對不一致的既有輸出拒絕且保留，來源變更後由主代理審核 task-owned 舊 dist，再選乾淨輸出目錄。

## 未驗與限制

B01–B04 一律 **NOT_RUN_USER_FOCUS_INCIDENT**：真瀏覽器操作/下載與預覽一致性、320px/200%/鍵盤/焦點/實際視覺、Network/Storage，以及跨日畫面與下載。未啟動 browser/native/CUA/IAB/CDP/server，不開 OS dialog、不操作剪貼簿；離線 structural harness 和直接 handler 呼叫不能取代這些 gates。沒有 screenshot、真下載或 live HTTP PASS。

同步短工作不提供取消；此為規格允許的 N/A，不是假取消。generation 失效與 URL cleanup 有離線反例測試。大量長隊名可能使完整 TXT/JSON 合計超過 2 MiB，會整批拒絕並清掉預覽/下載，必須縮短隊名或改單循環。資料只在當頁記憶體；不保證抹除 OS/瀏覽器內存或已下載檔案。不最佳化休息、裁判、真主場，也不處理時區/DST。

仍需主代理獨立閱讀來源與接受隔離 browser gates 後才可 M2；本次不 GitHub、Cloudflare、首頁整合或建立另一份使用者 ZIP。單一整合交付由主代理處理。

## B20-RP-58：M1B 離線發布準備（2026-10-23）

本輪依 `.runs/batch20-release-prep-2026-10-23/TASK.md` 十項契約完成獨立發布候選；**不是 M2 公開發布放行**。完整重現與驗收者目錄見 [M1B-RELEASE.md](M1B-RELEASE.md)。requested gpt-6.1-sol/max，實際 backend 不以自述證實。

實際變更：`package.json` 只新增 build:release/check:release；`scripts/check.mjs` 核對兩個新命令與新腳本語法；新增 `scripts/release.mjs`、`scripts/verify-release.mjs`、`test/release.test.mjs`、M1B-RELEASE.md。`test/toolchain.test.mjs` 只把 scratch 路徑從 m1 改到 m1b，避免改舊證據。HANDOFF/TASK-ENTRY 追加本輪紀錄。`.gitignore`、public、dist、其餘規格／契約／兄弟工具完全未改。

固定候選 origin `https://round-robin.glossquote.com`、slug `tournament-scheduler`。來源 8 檔以 M1 bytes/SHA 固定，6 個 JS/CSS 原樣；兩語 HTML 只改 head robots／canonical／zh-Hant/en/x-default，保留 body 與候選提示。新增 robots／sitemap／`_headers`，site 共 11 檔、63,283 bytes；manifest 在 sibling，不含 site manifest、自身時間／隨機值／本機路徑。

原 public 沒有 `_headers`，採原 serve 的 `SECURITY_HEADERS`（固定 serve SHA `e0247af5969edc1c9d9397c3d2b051b1b7e8ffc3da4c7fe7ed843de34fefceac`），僅改 X-Robots-Tag；未啟動 serve。這是靜態配置，未驗真實 hosting headers。checker 由固定來源獨立重建所有 expected bytes，拒絕資產+manifest 同改、錯 SEO/origin、來源變動、未知／缺漏／link 輸出；既有合法重建只讀，異常輸出不覆寫、不刪。

|本輪實際命令|Exit|結果|
|---|---:|---|
|`node --test test/release.test.mjs`|0|13 tests／13 pass，0 fail/skip/todo|
|`node scripts/verify-release.mjs`|0|依序執行以下四條命令，直接 child shell:false/windowsHide:true，隔離 npm config/env，offline|
|`npm test`|0|55 tests／55 pass／0 fail/cancel/skip/todo；3232.7964 ms|
|`npm run check`|0|8 public preview 檔與新 release 入口語法／契約|
|`npm run build:release`|0|11 檔正式 SEO 的離線候選|
|`npm run check:release`|0|完整 source/site bytes 與固定 manifest 通過|
|Windows environment guard 前／後|0／0|完整 Snapshots 相同|

本輪只執行一次完整 suite；原 preview build 未重跑，未改 public/dist。證據在 [m1b final commands](evidence/m1b/final-commands/results.json)、[環境比對](evidence/m1b/environment-comparison.json)、[實際 diff](evidence/m1b/changes.patch)、[範圍稽核](evidence/m1b/scope-audit.json)、[來源與產物 hashes](evidence/m1b/candidate-manifest.json)；每個 site 檔及 public source 的 bytes/hash 見 [release manifest](release-artifacts/manifest.json)。所有負例在本工具 m1b 合成 copy 執行，舊 M1 失敗/成功證據未覆寫。

舊 M1 manifest 仍是歷史來源快照；本輪獲准改 package／檢查工具鏈／交接，因此舊完整來源 freeze 不再代表當前 M1B 來源。保留 M1 證據、public、dist 的不變核對另存本輪 baseline/scope audit。沒有把來源推送或候選 origin 當上線證明。

證據稽核首輪 exit 1：文件連結檢查早於自身 scope-audit.json 的寫入。失敗、當時 patch/diff/manifest 全部保存在 [audit-attempt-1-failure.json](evidence/m1b/audit-attempt-1-failure.json) 與其列出的副本。修正為先寫 PENDING，再核對連結並定稿；未改產品或 release bytes，未重跑已過的 suite。

狀態：PASS_M1B_OFFLINE_RELEASE_PREP；主代理獨立複核 PENDING。B01–B04 與真瀏覽器／原生／真機／真 Network/Storage/下載一律 NOT_RUN_USER_FOCUS_INCIDENT。沒有啟動 browser/server、操作桌面／剪貼簿、安裝依賴、讀憑證、改持久 Windows/Git/auth；沒有 GitHub／部署／首頁／另一個交付 ZIP。無新增產品決策需確認；仍需主代理決定安全 browser 隔離機制並完成後續必要 gates。

## B20-58-M2A：assets-only 發布準備（2026-10-27）

最新狀態：**PASS_M2A_OFFLINE_PREPARATION；未 push/deploy，待 root 獨立審核與後續發布。** 原歷史狀態保留，最新以本節及 [M2A-RELEASE.md](M2A-RELEASE.md) 為準。

已重讀 root `b20-58-r1/result.json`：28 PASS、6 NOT_RUN、0 failures/prohibited，browser 145.0.7632.6。Root 本輪派送通報 v7 隔離與 parent cleanup PASS；本對話沒有執行 browser。6 NR 逐項保留：每語系 CANCEL-RACE 不適用（同步無取消/Worker）、ZOOM200 未驗、NATIVE-AT 未驗；原生、真機、AT 不升級。

變更只有發布工具鏈／設定／測試／交接：新增 wrangler.jsonc、scripts/deployment-config.mjs、M2A-RELEASE.md；scripts/release.mjs 生成固定 `_redirects`、檢固定 config、只移除兩語精確 footer候選 span；scripts/check.mjs 驗設定與新模組語法。test/release.test.mjs 增加5組M2A檢查並延伸原13組，test/toolchain.test.mjs 只將 scratch 移至m2a；TASK-ENTRY/HANDOFF追加。沒有改 package、.gitignore、public、dist、runtime/CSP 或已驗收核心功能。

固定 Cloudflare name `glossquote-tournament-scheduler`，date 2026-10-24，唯一 custom domain `round-robin.glossquote.com`；workers_dev/preview_urls/send_metrics 全 false，observability/logs/invocation_logs/traces 全 false。assets 指定 ./release-artifacts/site、run_worker_first=false、html_handling=none、not_found_handling=none；build=node scripts/release.mjs build。沒有 Worker入口、bindings 或憑證。日期／觀測明確依使用者契約，優先於通用 Workers skill 預設。

site 現為12檔/63,311 bytes；兩語 SEO/x-default/回首頁不變，public/dist 原樣。新增65-byte `_redirects` 精確為 `/ /index.html 301`、`/en /en/index.html 301`、`/en/ /en/index.html 301`（LF結尾）。manifest嚴格allowlist，連同asset竄改也拒絕；`_worker.js`、`_routes.json`、未知／缺漏輸出均拒絕。Wrangler658 bytes/SHA `bc303d29e8a5776439a3810279ae5181a29da640c0ba7c52473b7a4bd70a8f4e`；release manifest3153 bytes/SHA `f1ea6cb6383dfbd77e356c8c3198501549e93f7445e7b9781f66a28209d12829`。

|本輪命令|Exit|結果|
|---|---:|---|
|針對性 `node --test test/release.test.mjs`（初版）|0|17/17；之後增加CLI回歸測試|
|完整命令第一輪 `npm test` / `npm run check`|0 / 13|59/59通過，但CLI module cycle停住；後續build未跑，失敗保留|
|最終 `npm test`|0|60/60，0 fail/cancel/skip/todo，7469.9734 ms|
|最終 `npm run check`|0|ESM/preview/固定設定|
|最終 `npm run build`|0|8檔既有preview bytes未改|
|最終 `npm run build:release` / `npm run check:release`|0 / 0|12檔候選及完整expected bytes/config通過|
|persistent environment guard前／後|0 / 0|完整Snapshots完全相同|

第一輪CLI循環TLA失敗已移至獨立deployment-config模組並新增真CLI回歸；原始輸出與原因在 root 指定 `.runs/batch20-completion-2026-10-27/owner-58-release/command-attempt-1*`，沒有刪除或掩蓋。npm使用空task-owned user/global configs、非憑證env allowlist與offline，直接child shell:false/windowsHide:true。原M1B release-artifacts於完整byte/hash核對後移至該owner目錄 `before/release-artifacts/` 封存；build不覆蓋舊/未知輸出。

本輪完整diff、命令原始輸出、前後環境、root browser引用與來源／產物 hashes 均在該 owner-58-release 目錄。未執行 Wrangler CLI/schema/dry-run、GitHub、Cloudflare API、deploy、真HTTPS/redirect/header或首頁更新；既有source/reviewed/released commit仍未在本對話建立。配置與Node PASS不是hosting證明。無新增產品／權限決策待詢問，root仍須獨立檢查本輪差異並進行已授權後續里程碑。


## B20-58-M2B：公開來源發布暫停收據（2026-10-27）

最新狀態：**READY_LOCAL_GITHUB_CREATION_THROTTLED**。本輪已完成乾淨審核副本及固定本機 commit，尚未建立／push repository，未部署、未改首頁、未通過外部驗收。

目標為 `KYStr/glossquote-labs-tournament-scheduler`；本機 branch `codex/release`、commit `8d00b7f02674e19741d1e37316d488cc1288f160`，52 份 tracked 檔案逐一核對 Git blob bytes/SHA-256。29 份 public/scripts/test/package/config 與 root primary-fixes/58 完全相同；13 份 release-artifacts 也逐 byte 相同，release manifest SHA-256 `f1ea6cb6383dfbd77e356c8c3198501549e93f7445e7b9781f66a28209d12829`。公開副本只產生可攜 README/HANDOFF，保留必要規格／fixtures，不含操作契約、私密資料、.runs、憑證、node_modules 或歷史本機 evidence；實際產品程式與設定未改。

乾淨副本依序執行 npm run build、npm test、npm run check、npm run build:release、npm run check:release，全數 exit 0；60 tests／60 pass／0 fail/cancel/skip/todo。preview build 必須在 tests 前產生 dist fixture，無安裝依賴。完整 Windows environment Snapshots 前後相同；Git settings guard 前後相同。最終 guard capture wrapper 曾誤用 .ps1 成功時不設定的 LASTEXITCODE 而 exit 1；改以 PowerShell invocation success 與 JSON Status 後重取，前後完整比較 PASS，未變更／復原任何持久設定；失敗與修正另存 audit-attempt-1-failure.json。

root 於建立前通知工具56遇到 GitHub「You have created too many repositories, too quickly. Please try again later.」，要求停止新建與自動重試。本58僅先前讀取目標得到 HTTP404，建立／push 嘗試均0；限流是 root 對56的通報，沒有偽稱58也收到相同API失敗。未切換API／帳號或配置認證來繞過。待 root 另行序列恢復；來源已就緒不等於已公開。

完整收據與原始命令位於 root 指定 `.runs/batch20-completion-2026-10-27/owner-58-publish/`：publication-receipt.json、tracked-inventory.json（含固定commit與52檔 path/bytes/SHA-256）、publication-stop.json、clean-copy-checks/results.json、final-source-verification.json、environment-comparison.json、closure-git-settings.json。remote API public／branch／commit、remote HEAD、遠端逐檔 bytes 一律 NOT_RUN_ROOT_GITHUB_CREATION_THROTTLED，public 欄位 null，無虛構遠端成功。

root browser基線仍28 PASS／6 NOT_RUN；兩語各自同步取消／Worker不適用、真200%zoom未驗、native／真機／AT未驗全部保留。未啟動 browser/native/CUA/CDP/server、未操作桌面或剪貼簿、未部署／首頁／另一份ZIP。請 root 使用此固定候選銜接後續來源發布及部署，不將本節標為外驗通過。

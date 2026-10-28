# 成績目標試算交接

最新：W17-28-M2 工具鏈及 PUBLIC GitHub 來源已完成，待主代理獨立驗收。固定 commit 66c574d718c1cf17b79f5510975ba46615296789、44檔flat ZIP與manifest見下方M2紀錄。M1 public/dist保持凍結；尚未 Cloudflare 部署/首頁/外部驗收，M3只主代理。以下M0/M1歷史完整保留，不以其舊狀態覆蓋最新M2結果。

2026-10-17 SPEC_ONLY。原功能對話尚未建立。M1本機、M2公開GitHub、M3Cloudflare與首頁、外部驗收均NOT_RUN。

每次回報實際修改範圍、精確命令/exit、版本/manifest、瀏覽器假資料/觀測、環境guard、已知限制及需要主代理決定事項。保留原始失敗與修正，不把mock當原生。

## W17-28-M1 — 2026-10-17 本機候選交接

**M1 本機實作與已執行 gates 通過，待主代理最終獨立驗收；沒有 M2 GO。** 候選 M1-b1607c5df51aa350。不是 release、尚未來源公開、未部署、未首頁整合、未外部審查。requested gpt-6.1-sol/max，backend identity 未獨立確認。原功能對話 01a147c9-8942-78b1-9301-58ceb1b6b55b；未委派子代理。

### 實際變更

- `public/index.html`、`public/en/index.html`、`public/styles/app.css`：兩語空白初態、可存取評分表、320px 重排、可見 ASCII 句點輔助、結果/報告/FAQ、對應語言首頁回鏈。Product App 沿用家族 paper/ink/acid/surface/control-border，系統 UI 字體，單一主試算操作，無外部視覺資產或字型。
- `public/js/app.js`、`public/js/lifecycle.js`：同步 submit capture 先 preventDefault、fail closed 初始化、編輯 revision、清除/切語確認與取消、Clipboard resolve/reject/finally epoch、8 個各自 30 秒 URL、pagehide/persisted pageshow 清理。例子需明按且不自動計算。所有動態輸入用 value/textContent。
- `public/js/core/{calculate-target,build-report,exact}.js`：精確 schema、固定錯誤順序及路徑、BigInt 計算與未四捨五入比較、報告精確一致性檢查及五狀態雙語固定全文。
- `scripts/{assets,generate-pages,serve,check,build}.mjs`、`package.json`、`.gitignore`：Node 24+ built-ins、零依賴、固定 allowlist、拒絕 links/未知檔案/空目錄、嚴格 preview routes/headers/MIME、獨立 dist manifest。
- `test/{calculate-target,build-report,lifecycle,static-contract}.test.mjs`：核心與 hostile schema、報告快照、假的 clipboard/timers/URL 競態、VM 初始化失敗 fixture、真實 Node HTTP 預覽模型。主審要求上界 100.01 已覆蓋；移除 B14 取消 snapshot 自比斷言。
- `dist/`：11 份 preview 檔案及 manifest.json。允許狀態文件 START-HERE、TASK-ENTRY、project.json、docs/RELEASE-CANDIDATE 同步更新；六產品規格沒有修改。沒有兄弟工具、首頁 catalog、GlossGate、Git/Cloudflare/credential 操作。

### 固定候選與命令

工作目錄 `<LOCAL_WORKSPACE>\tool-projects\28-grade-target`。Node v24.14.0，npm 11.9.0。未 npm install、未 dotnet、未改 PATH。

| 實際命令 | 最後結果 |
|---|---|
| `& 'C:/Program Files/nodejs/node.exe' --version` | v24.14.0，exit 0 |
| `& 'C:/Program Files/nodejs/npm.cmd' --version` | 11.9.0，exit 0 |
| `& 'C:/Program Files/nodejs/npm.cmd' test` | 57 tests / 57 pass / 0 fail，exit 0 |
| `& 'C:/Program Files/nodejs/npm.cmd' run check` | source allowlist、syntax、privacy scan，exit 0 |
| `& 'C:/Program Files/nodejs/npm.cmd' run build` | 11 檔 preview、noindex,nofollow、fresh manifest 自驗，exit 0 |
| `& 'C:/Program Files/nodejs/npm.cmd' run dev -- --port 4208` | 啟動 127.0.0.1:4208；長駐 session 25263（非已退出命令） |
| manifest 固定時 `verifyBuild()` | 11 份 bytes/SHA 與 source 相符，exit 0 |

根證據絕對目錄：**<LOCAL_WORKSPACE>\.runs\grade-target\m1-20261017-implementation**。

- `candidate-manifest.json`：19 份來源各檔 bytes/SHA-256 及 11 檔 build manifest，candidate source SHA-256 `b1607c5df51aa350e34c5a9af0d18f69668bf441943e9281a5599f0c4e5aacae`。
- `test-final.log`、`check-final.log`、`build-final.log`、`gate-results.json`：實際最後命令結果。首次 55 tests pass，之後補 VM fixture 至 56，主審補上界至 57；不是失敗重試。check/build 的 inputs 在主審最後兩個 test 變更後未變，沿用 passing 結果。
- `browser-checks.json`：IAB 37 個條件/觀察；`edge-checks.json`：一般 Edge 雙語空白/C01；`zh-final.png`、`zh-c01.png`、`en-320.png`、`en-320-40rows-focus.png`。
- `en-downloaded.txt`（498 bytes）、`zh-downloaded.txt`（422 bytes）：IAB 真實下載 bytes，逐位元符合相應假資料報告；無 CR、BOM、尾端 LF。Edge download-event 等待 8000ms 逾時，未擷取 bytes，該項仍 NOT_RUN，未再盲試。
- `environment-before.json`、`environment-after.json`、`environment-comparison.json`：guard PASS、完整 Snapshots 不變。`environment-comparison-orchestration-error.json` 留存第一次 wrapper 把正常 script 未設定的 LASTEXITCODE=null 當失敗；以 invocation success/guard Status 重比已更正，沒有環境漂移。

### 實際瀏覽器與主代理獨立證據

IAB 與 Edge 都走兩語空白、必填錯誤、明按範例不自動試算、C01 32.00/60.00%/63.34。IAB 另驗 0 與空白、權重 59.99→60 修正、目標/名稱/權重/成績各自編輯失效、新增/移除失效、清除取消/確認、語言取消/確認、各結果狀態、C07 顯示 70.00 仍未達標、非法標點、句點輔助。320px 有 40 列且無整頁橫向溢出（document clientWidth/scrollWidth 皆 305，scrollbar 佔其餘寬度）；第40列 Tab 到權重欄，focus rectangle 438.125–482.125 位於740px viewport，可見可達。viewport 已 reset。回首頁 href 在兩語 DOM 及靜態測試核對，沒有為此額外離開預覽。

Clipboard 成功提示後只讀回本測試剛寫入的假報告並相符，沒有讀取原本 clipboard。兩語 IAB 原生下載成功；瀏覽器之外的權限拒絕與完整 URL 生命週期沒有冒稱。B15 使用會拋錯的假 DOM/VM 初始化 fixture 執行實際 app source 並呼叫 submit callback，確認同步取消、控制 disabled、固定錯誤不含 CANARY；不是實際瀏覽器載入失敗測試。

主代理提供獨立核心 250 隨機 oracle + 7 明確案例 PASS，根證據 `.runs/new-tools-2026-10-17/28-independent-result.json`；另有 `28-browser-observations.json`、`28-native-download.json`、`28-toolchain-review.md`。**這段主驗後 public 只有 calculate-target.js 新增 `raw.length > 320` 名稱長度預檢**，避免超長名稱展開陣列；沒有改數學、schema 輸出或報告。其最後為3866 bytes / SHA-256 `fd5cedc00279c58f17cb368c6eb49125c2221eb3eb9efb88d2924a7ebb49595f`。原 independent result 的舊 module hash 不能當成最終候選固定證據，請主代理重跑受影響 gate；其餘 app/HTML/CSS/lifecycle/report 於主驗之後未改。4208 preview 已以新核心重啟並 reload；只停止本任務建立的 session 47502，其他服務/對話/程序均保留。

### 環境不變

| Scope | PATH type / length / ephemeral | PATH SHA-256 | 完整 Environment fingerprint |
|---|---|---|---|
| HKCU | ExpandString / 834 / 0 | 3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb | 3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a |
| HKLM | String / 1227 / 0 | 52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8 | a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82 |

完整 Snapshots（含 TEMP/TMP hashes、types、lengths）與本次 pre snapshot 完全相同；未持久修改環境或 Git 設定。既有 PATH duplicates 保留。

### NOT_RUN 與限制

- 真機手機/觸控、原生 IME 組字、虛擬鍵盤與安全區、真正 200% browser zoom、低階裝置效能、螢幕閱讀器：未具備/未執行該實測；320px 重排與鍵盤實測不代替。
- 真正斷網後操作、冷啟動離線：沒有切換網路環境；產品不承諾冷啟動離線。靜態/HTTP 測試不代替 B19 的真實 offline 操作。
- 完整 Network/Storage/Cache/Service Worker/隱藏恢復觀察：現有 API 沒有完整面板觀測，NOT_RUN。程式掃描與 CSP 不冒稱完整零流量證據。
- 原生 Clipboard 權限拒絕/不可用、OS 寫入取消、8 個原生 URL 各自到期/pagehide 全生命週期、BFCache persisted restore：NOT_RUN；fake clipboard/timers/URL tests 只證明 epoch、期限與 reset 邏輯。
- 真實瀏覽器初始化失敗 fixture/requestSubmit、真實 pagehide 清空狀態的直接觀察：NOT_RUN；VM fixture及清除/切換導航不當作這些原生觀測。
- Edge 原生下載事件擷取逾時；IAB 兩語 bytes 已驗，不推論所有瀏覽器下載支援。

無已知數學/隱私實作缺陷。主代理須依最後 manifest 重驗、決定 M1 GO；未收到書面 M2 GO 前不建立 production 工具鏈、不公開 GitHub、不呼叫 Cloudflare、不讀 token。GitHub 預定 KYStr/glossquote-labs-grade-target、hosting 候選 grades.glossquote.com 均尚未發布，5208 尚未啟動。M3/首頁屬主代理。

## W17-28-M2 — 2026-10-17 固定來源交接

**原對話已完成 production 工具鏈與公開來源，待主代理 M2 驗收；未部署。** M1 主代理 PASS_WITH_DOCUMENTED_NOT_RUN/M2 GO 見根 `.runs/new-tools-2026-10-17/28-m1-primary-review.md`，其最後 core257/257 與57測試證據已接受。M2沒有修改 public/，也沒有重寫根工具 dist/。M1八個public檔和十二個preview檔（含manifest）共20檔 bytes/SHA與本次pre snapshot完全相同。

### 修改範圍與產物

- 新增 `scripts/production.mjs`、`build-production.mjs`、`check-production.mjs`、`serve-production.mjs`、`release-check.mjs`、`test/production.test.mjs`、`wrangler.jsonc`；只更新package scripts及check的scripts allowlist。沒有改數學、UI、報告或lifecycle。
- 正式產物只生成 `dist-production/`：兩語HTML、CSS、5個ESM、404、robots、sitemap、_headers共12檔，另有排除自身的manifest.json。非HTML public assets逐位元不變；兩頁body與M1相同，僅head加入正式metadata並更改robots meta。
- Config固定grades.glossquote.com / glossquote-grade-target / compatibility_date2026-10-17；static-assets-only、html_handling=none、not_found_handling=404-page，workers_dev/preview_urls/send_metrics/dependencies_instrumentation.enabled/observability/logs/traces均false。沒有main、bindings、secret或runtime package。
- Canonical只有/index.html與/en/index.html，reciprocal zh-Hant/en/x-default，OG/WebApplication/FAQPage與可見內容一致；各頁CSP只允許其固定JSON-LD精確SHA-256。_headers先detach繼承X-Robots-Tag與CSP，再套canonical值；404及非canonical維持noindex，沒有SPA fallback。robots最長匹配回歸測試涵蓋全部CSS與ESM。
- 修改狀態文件project/START-HERE/HANDOFF/TASK-ENTRY/docs/RELEASE-CANDIDATE，未更改六產品規格、兄弟工具、首頁catalog或其他專案。

設定參照：[Cloudflare Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)、[static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/)、[HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)。未安裝或執行Wrangler/Cloudflare CLI；config由精確離線契約和官方文件核對，實際Cloudflare部署行為仍由M3驗收。

### 固定 GitHub、ZIP 與 manifest

| 項目 | 已驗證識別 |
|---|---|
| Repository | [KYStr/glossquote-labs-grade-target](https://github.com/KYStr/glossquote-labs-grade-target)，visibility PUBLIC、isPrivate=false |
| Default branch / remote ref | codex/grade-target-m2 |
| 固定 commit | **66c574d718c1cf17b79f5510975ba46615296789**（gh metadata與git ls-remote核對） |
| Flat git archive | glossquote-grade-target-source.zip；**109838 bytes**；44 files；package.json在根 |
| ZIP SHA-256 | **a8d8c7fe7af36a84a7b7c917d4d07efc89077abf668145c0265e0f511fb2cda0** |
| Source manifest JSON | 9397 bytes；檔案SHA-256 **2e24b08ebd257dcc97672fe2903e58872802dc4193680e3a017d62560e765212** |
| Source entries fingerprint | **f278b90dda58c87132835a91d63ab20c189d39983b0eb114ed79190c55874dc6**（只對44個manifest records的canonical JSON計算，與manifest檔案SHA不同） |
| production manifest JSON | 1894 bytes；SHA-256 **b4dc09c2bd20967cde76d11635cbf58260c59f6f60fce06c0e7385838e7cde75** |
| wrangler.jsonc | 551 bytes；SHA-256 **c5ecbfde7edc4c8bd8a35b6d3d382bd212db1385f5cbf7a43ad363f286a7883f** |

證據絕對目錄：**<LOCAL_WORKSPACE>\.runs\grade-target\m2-20261017-source**。

- reviewed publishing copy：該目錄 `publishing-copy/`。44份逐一allowlist，沒有.runs、node_modules、dist、dist-production、秘密、帳戶設定或使用者輸入進Git。
- `source-manifest.json`：44檔bytes/SHA及6份公開說明版本的local/public hashes與原因。這6檔是README、HANDOFF、START-HERE、TASK-ENTRY、project.json、docs/RELEASE-CANDIDATE，公開版本排除本機絕對路徑、chat IDs與環境指紋；本機完整進度保留。其餘38份來源（包含全部程式/測試/config和產品契約）與本機一致。
- `publication-review.json`：逐檔allowlist與排除範圍；`archive-verification.json`：ZIP每個檔案都與固定commit Git blob、工作副本bytes及source manifest相符，沒有頂層包裝資料夾，Git status clean。
- `production-manifest.json`：根工具dist-production/manifest.json的副本；`clean-copy-verification.json`：乾淨副本建置產物與根工具preview/production所有bytes完全相同；`m1-frozen-before.json`/`m1-frozen-comparison.json`：20檔凍結證據。
- `publication-commands.jsonl`：每個Git/gh命令的完整結構化參數、cwd、stdout/stderr及exit；不含憑證、trace或profile資料，未打包公開。`github-public-verification.json`、`remote-ref.txt`、`commit.txt`保存核對來源。
- `m2-results.json`：所有gate/命令exit、版本、manifest/config識別摘要。`browser-production.json`、`en-production.png`：5208模型兩語空白/C01、canonical/robots/JSON-LD DOM實測，warn/error空列表。

### 實際命令與結果

Node v24.14.0 / npm11.9.0，未npm install。根工具cwd為本工具，乾淨副本cwd為上面的publishing-copy。命令一律使用完整`C:/Program Files/nodejs/npm.cmd`；JSON/logs內保留原實際命令與exit。

| npm命令 | 根工具 | 乾淨發布副本 |
|---|---|---|
| test | exit0，63/63 | exit0，63/63 |
| run check | exit0 | exit0 |
| run build | 沿用M1已通過結果：inputs完全未變，為保留根dist凍結沒有重寫 | exit0，11preview檔+manifest |
| run build:production | exit0，12檔+manifest | exit0，12檔+manifest |
| run check:production | exit0 | exit0 |
| run release:check | exit0，44source/12production | exit0，44source/12production |

`npm run preview:production -- --port 5208`啟動task-owned session81842，PID11468，僅127.0.0.1。HTTP測試實際啟動另個OS分配loopback port、驗兩canonical/所有重要MIME與headers/HEAD/404/405/惡意路徑；5208瀏覽器實際雙語空白與C01成功。模型嚴格exact-file routing，/與/en/以noindex404處理；這是已描述的本機模型，不推斷Cloudflare實際alias行為。原4208 session25263/PID18088保留，其他服務未停。

發布命令使用已審核evidence helper（不屬public source）：Git完整路徑`C:/Program Files/Git/cmd/git.exe`、gh完整路徑`C:/Program Files/GitHub CLI/gh.exe`；git init/add逐一allowlist/commit/archive/push/ls-remote均exit0。gh repo preflight exit1是預期repo尚不存在；create --public、view驗visibility均exit0。Commit作者使用per-command Codex本機自動化email，沒有讀使用者Git身份。hooks/attributes/line-ending/signing/credential helper僅per-command -c；沒有global/system Git或gh auth設定寫入。子process移除GIT_TRACE*/GIT_CURL_VERBOSE/GH_DEBUG並停用互動提示，未讀出credential。44檔Git archive與Git blobs比對exit0。

三個evidence helper初始錯誤已各自保存：`prepare-first-error.json`（import父層數）、`verify-copy-first-error.json`（inline額外括號）、`publication-helper-first-error.json`（PowerShell額外括號）。都在解析/正式動作前失敗，依具體錯誤修正且無產品變更；未隱藏失敗或降低gate。公開前已有真實clean copy及archive PASS。

### Guards、NOT_RUN 與下一步

Environment guard M2 before/after均PASS，與**本次M2 pre**完整Snapshots相同；詳`environment-{before,after,comparison}.json`。HKCU PATH ExpandString/834、HKLM String/1227、ephemeral均0，兩個PATH與完整Environment/TEMP/TMP fingerprints同M1表列。Git known user/system config指紋capture/多次verify/after snapshot全同，詳`git-settings-{before,after}.json`及命令記錄。沒有persistent環境/Git設定漂移。

保留M1全部NOT_RUN；M2本機HTTP/靜態headers/CSP/robots測試不代替Cloudflarelive、DNS、索引、完整Network/Storage或真機/原生生命週期。Wrangler CLI/dry-run與Cloudflare API、部署、正式網站、首頁、外部審查均NOT_RUN/未開始（本階段沒有此權限，未讀token）。沒有新增已知產品缺陷。

固定commit/ZIP與publishing copy不因這份本機發布後紀錄再改寫。本工具local狀態已更新，公開副本6份說明是commit之前固定的review snapshot；兩者差異已明列。**等待主代理獨立M2驗收；M3由主代理部署grades.glossquote.com並整合首頁，本對話不先行操作。**


<!-- primary-release-2026-10-17 -->
## 2026-10-17 主代理 M3 完成

固定公開來源 66c574d718c1cf17b79f5510975ba46615296789 已獨立核對；主代理固定來源測試 63/63 與必要建置通過。正式入口 https://grades.glossquote.com/index.html 與 /en/index.html 已部署並驗證，worker version 0544a90e-f5d3-49d2-b928-1eccd01be14d；本站 36 份HTTP回應 PASS_HTTP。首頁 source 088392e4de087eaa13253c0b683ebea48b817022 / worker 996c7832-c541-4bc5-abd6-b6ef535ff19b，兩語已包含26正式入口。

本地追加發布後狀態，不改固定公開來源快照。兩工具等待外部驗收；真機、完整Network/Storage、原生拒權/完整URL生命週期、讀屏、真BFCache與200%縮放等NOT_RUN維持。主代理證據 .runs/new-tools-2026-10-17/；總表 tool-projects/RELEASE-2026-10-17.md。驗收包 glossquote-new-tools-2026-10-17.zip，839981 bytes，SHA-256 7663e8c0bd17c80bdb40499fc2bf2c36ffeea61d325fb101a1b54d5ff0682ec2，85筆manifest及19相對文件連結核對通過。
<!-- primary-release-2026-10-17-end -->

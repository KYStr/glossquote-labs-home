# 專案期限倒排 — B20-59-M1 交接

2026-10-23：M1 雙語本地候選已實作並凍結，核心／Node 工具鏈通過；交主代理獨立驗收。不是整體 browser PASS、已發布或外部驗收完成。requested gpt-6.1-sol/max；實際 backend 未獨立確認，沒有模型切換。

| 範圍 | 實際狀態 |
| --- | --- |
| T00–T08 M1 實作、純核心、Node protocol/ownership 測試 | PASS，47 tests / 47 pass / 0 fail / 0 skip（最終輸入） |
| 靜態 check / preview build | PASS；10 public files、21 JS syntax files；dist 10 files / 70,540 bytes |
| 真瀏覽器 Worker、取消、DOM/layout、Network/Storage、下載 | NOT_RUN_USER_FOCUS_INCIDENT |
| 真 loopback server / socket HTTP / npm run dev | NOT_RUN_TASK_NO_SERVER，派送明令不得啟動 server |
| 無 socket 的 GET/HEAD/404/405/Host/traversal 路由契約 | PASS，Node 直接呼叫 routeRequest；不是實際 HTTP 驗收 |
| GitHub / source commit / reviewed commit / released commit | NOT_PUBLISHED / N/A / N/A / N/A；尚未 M2 放行 |
| Cloudflare / 正式網址 / 共用首頁 | NOT_DEPLOYED / 未定 / 未修改；未進入 M3 |
| 外部驗收 | NOT_RUN |

## 可操作候選與真實產物

- [繁中候選來源](public/index.html)、[英文候選來源](public/en/index.html)；兩語 noindex,nofollow，無 canonical、production bundle 或 sitemap。初始為一列空白任務與空白交件日，沒有假日程。
- 多前置任務多選，ID/工期/Unicode 名稱與日曆嚴格驗證；自訂非空工作週、最多 366 個唯一休假、100 tasks / 500 edges / 260 workdays per task。
- Civil Gregorian 日曆與穩定 Kahn/DFS，先求 D 再 inclusive 倒數；完整 ES/EF/LS/LF、工作日餘裕、零餘裕關鍵任務集合。循環只列實際閉環並可定位修正，不把下游受阻節點冒稱環路。
- 模組 Worker 執行驗證、圖、日曆、forward/backward 與序列化；progress 是實際完成量。輸入改動／重算／取消／清除／pagehide 同步使 generation 失效、terminate owner、清結果並 revoke URL。error/messageerror、無進度 30 秒 watchdog 以固定錯誤回復。這些是實作與 Node ownership/protocol 證據，真 browser 能力仍未驗。
- TXT/JSON 完整表格與設定、原/有效交件日及調整曆日數；UTF-8 合計最多 2 MiB、兩份原子建立、固定檔名。無 JSON 匯入、storage、網路計算、帳號、外部假日或 telemetry。
- [A01 繁中 TXT](evidence/m1/outputs/A01-zh/project-backplan.txt)、[JSON](evidence/m1/outputs/A01-zh/project-backplan.json)；[A19 多前置英文 TXT](evidence/m1/outputs/A19-en/project-backplan.txt)、[JSON](evidence/m1/outputs/A19-en/project-backplan.json)；[跨年截止調整 TXT](evidence/m1/outputs/A17-adjusted-en/project-backplan.txt)。共 6 份核心生成檔已寫出、重讀並核對 bytes、JSON 內容及 TXT 每列欄位；不是 browser 下載證據。見 [output manifest](evidence/m1/output-manifest.json)。

## 實際修改與差異

只在本工具授權範圍：新增 package.json、.gitignore、TASK-ENTRY.md、public/**（10）、scripts/**（5）、test/**（9），更新本 HANDOFF；產生 preview dist/**（10）與 evidence/m1/**。未改六份規格、AGENTS、docs、共享首頁、看板、兄弟工具或 GlossGate。工具資料夾在根 Git 原本整體 untracked，因此 git diff 不是完整新增檔證據；以固定檔案清單及 SHA-256 為準。未 commit/push。

T00 scaffold → T01 validation/calendar → T02 graph → T03 schedule → T04 Worker/UI → T05 atomic exports → T06 bilingual/responsive/noindex → T07 check/build/dev route source → T08 evidence 均已有實際程式與相應離線檢查。dev script 已建立並通過語法檢查，未啟動。主代理保留必要 browser／HTTP 的補驗責任。

## 實際命令與出口碼

工作目錄為本工具。既有 Node **v24.14.0**、npm **11.9.0**，版本命令 exit 0；零外部 runtime/dev dependencies，沒有 npm install。工具鏈中自建 child 使用 shell:false / windowsHide:true；沒有 server、browser、CUA、native 操作、憑證或持久設定變更。

| 最終命令 | exit | 結果／證據 |
| --- | --- | --- |
| npm test | 0 | 47 tests，47 pass，0 fail/cancelled/skipped；[test-final-pass.log](evidence/m1/test-final-pass.log) |
| npm run check | 0 | 10 public files、21 syntax files；[check-final.log](evidence/m1/check-final.log) |
| npm run build | 0 | noindex preview，10 files / 70,540 bytes；[build-final.log](evidence/m1/build-final.log) |
| node scripts/evidence.mjs outputs | 0 | 6 actual UTF-8 files，固定 oracle 與重讀比對 PASS；[outputs.log](evidence/m1/outputs.log) |
| check-persistent-environment.ps1，完整 Snapshots 比較 | 0 | PASS，HKCU/HKLM 完整 Snapshots unchanged；[comparison](evidence/m1/environment-comparison.json) |
| node scripts/evidence.mjs freeze | 0 | 全部候選來源與 dist bytes/SHA-256，重新讀取核對；[candidate-manifest.json](evidence/m1/candidate-manifest.json)、[manifest SHA](evidence/m1/candidate-manifest.sha256) |

歷史保留：首輪 [test-attempt-1.log](evidence/m1/test-attempt-1.log) 47/47、check/build exit 0。補強 sparse-array/Symbol malformed case 時，[test-final.log](evidence/m1/test-final.log) 是一次失敗嘗試（46 pass / 1 fail、exit 1）：測試 helper 建構預設名稱時插值 Symbol，尚未進入 validator。已改為明確合成名稱並重跑，最後 47/47；沒有刪除或覆蓋失敗紀錄。重跑皆因實際來源或測試輸入變更。

環境證據：[before](evidence/m1/environment-before.json)、[before-final](evidence/m1/environment-before-final-checks.json)、[after](evidence/m1/environment-after.json)。User PATH ExpandString / 834 字元、Machine PATH String / 1,227 字元；ephemeral entries 各 0。PATH SHA、type、length、完整 Environment-key fingerprint 和 TEMP/TMP protected snapshots 全部相同；既有 duplicate PATH entries 未動。

## 契約決策、待驗與風險

- [PROTOCOL-DECISION.md](evidence/m1/PROTOCOL-DECISION.md)：主代理已允許 locale 為 Worker request 必填；app 和測試一致使用 type/generation/input/locale。沒有猜測缺失語言；主代理將同步唯讀 TECHNICAL 範例。
- [逐項驗收矩陣](evidence/m1/ACCEPTANCE-RESULTS.md) 分開 A01–A20 純核心、Node ownership/protocol、靜態 gate 與 B01–B04 真 browser NOT_RUN。原生 save/file/print dialog、真機、320px、200% zoom、鍵盤/焦點、下載、browser CSP/Network/Storage、Worker 實際啟動與 terminate 都不能由 Node 證據推定 PASS。
- 不做人力／資源／風險最佳化或外部假日查詢；關鍵集合可能含多條路徑，清單相鄰不代表互有依賴。沒有開始日期輸入；anchor 是由 deadline 倒數最長工期所得的最晚開工日。
- build 閉合 allowlist，拒 symlink/junction、未知 source/directory/stale output；只覆寫已知 preview files，不清理未知檔。靜態掃描為有限檢查，不能充當完整安全證明。
- 未開聊天、未委派子代理、未啟動或終止既有分頁/程序。沒有 production bundle、GitHub、部署或使用者交付 ZIP；主代理整合唯一外層 ZIP。必要 gates 補完後才進 M2。

## 2026-10-23 追加：B20-RP-59 / M1B 離線發布準備

本輪完成發布工具鏈與獨立 **release-candidate**，不是 M2 公開放行。上方 M1 紀錄與其固定 manifest 均保留作歷史；本輪新增 package/scripts/test/交接文件屬 M1B 版本，不應要求它們仍等於歷史 M1 source hashes。產品 public、preview dist 和舊 evidence/m1 保持完整原 bytes。requested gpt-6.1-sol/max；backend 未獨立確認，未切換模型。

### 實際差異

| 路徑 | 本輪更動 |
| --- | --- |
| package.json | 保留既有四個命令，新增 build:release / check:release |
| scripts/release.mjs | 新增固定 origin/slug、M1 source pins、雙語 head-only SEO、robots/sitemap/headers、完整 manifest、preflight、只建立新產物／合法重建無寫入、獨立 expected bytes 檢查與 strict CLI |
| scripts/check.mjs | 原 script policy 精確允許新增兩個命令；其餘 preview check 保留 |
| test/release.test.mjs | 新增 17 個離線 release 測試及 copy-only 負例 |
| test/toolchain.test.mjs | scratch 由 evidence/m1 移至 evidence/m1b；不觸及歷史證據 |
| TASK-ENTRY.md / 本 HANDOFF | 追加本輪範圍、實際結果與待驗，不抹除 M1 歷史 |
| M1B-RELEASE.md | 新增重現方法、候選 site 根目錄、信任基準、gate/風險說明 |
| release-artifacts/** | 新增 site（13 檔）及 sibling manifest；與 public/dist 分離 |
| evidence/m1b/** | 本輪命令、10項驗收矩陣、保護檔案與 envguard 前後快照、source/artifact hashes |

未修改 .gitignore、public、dist、舊 evidence、六份規格/AGENTS/docs、共享或兄弟工具；未啟動 server/browser、未安裝依賴、未讀憑證、未更動持久 Windows/Git/auth 設定。未 GitHub／部署／正式首頁更新，沒有子代理或新聊天。

### 固定命令與實際產物

既有 Node v24.14.0、npm 11.9.0；所有自建 child shell:false/windowsHide:true。針對性命令先通過 17/17；之後對固定程式各執行一次完整 final commands，無 M1B 失敗或跳過。原 npm run build 因 public 不變而未重跑，亦未執行 dev。

| 命令 | exit / 數量 | 證據 |
| --- | --- | --- |
| node --test test/release.test.mjs | 0；17 tests / 17 pass / 0 fail / 0 skipped | [targeted log](evidence/m1b/release-targeted-attempt-1.log) |
| npm test | 0；64 tests / 64 pass / 0 fail / 0 cancelled / 0 skipped | [final test log](evidence/m1b/test-final.log) |
| npm run check | 0；10 public files / 23 syntax files | [check log](evidence/m1b/check-final.log) |
| npm run build:release | 0；13 site files / 72,036 bytes / 10 source files | [build log](evidence/m1b/build-release-final.log) |
| npm run check:release | 0；13 site files、相同 manifest SHA、verified | [release check log](evidence/m1b/check-release-final.log) |
| check-persistent-environment.ps1 + full Snapshots comparison | 0；PASS / unchanged | [env comparison](evidence/m1b/environment-comparison.json) |

實際 [site 中文](release-artifacts/site/index.html)、[英文](release-artifacts/site/en/index.html) 及 [release manifest](release-artifacts/manifest.json)。預定 origin 固定 `https://backplan.glossquote.com`，toolSlug `project-backplan`；未上線。Manifest SHA-256：`98382808e41ec28e52d5dfb1b898bc1189e93489f7e765f3965d755fe6b1575a`。完整本輪來源與產物 bytes/SHA 見 [candidate hashes](evidence/m1b/candidate-hashes.json) 及 [清單自身 SHA](evidence/m1b/candidate-hashes.sha256)。詳細 [10項驗收矩陣](evidence/m1b/ACCEPTANCE-M1B.md)、[機器可讀結果](evidence/m1b/CHECKS.json)、[重現說明](M1B-RELEASE.md)。

### 保留與下一階段

[preservation-before](evidence/m1b/preservation-before.json) / [after](evidence/m1b/preservation-after.json) 比對 **50 檔全部 bytes/SHA 不變**：public 10、dist 10、舊 evidence/m1 30；[comparison](evidence/m1b/preservation-comparison.json)。User PATH ExpandString / 834 字元、Machine PATH String / 1,227 字元，ephemeral 各 0；PATH SHA、registry type/length、全 Environment fingerprint 及 TEMP/TMP protected snapshots 全部 unchanged，詳 [env-before](evidence/m1b/environment-before.json) / [after](evidence/m1b/environment-after.json)。

必要 browser/視覺/原生/真機/真 Network-Storage/CSP/Worker/下載 gates 仍 **NOT_RUN_USER_FOCUS_INCIDENT**；真 server/socket HTTP 仍 **NOT_RUN_TASK_NO_SERVER**。新的 17 tests 與完整64 tests 都是 Node，不代表任何 browser gate 通過。`_headers` 僅配置，未驗 hosting 實際套用。

Release checker 固定舊 M1 source 與 serve header 基準；產品版本改動需另行有界審核。既有不完整或被改 output 保留並拒絕，不自動刪除修復。首次建立若遇 IO 中斷也保留新 partial 目錄並停止，由主代理判斷。本輪無未解的產品／權限選擇；主代理需獨立回收本候選、完成必要 gate 後另行決定 M2/M3，不應直接發布此未驗候選。

## 2026-10-27 追加：B20-59-F1 timer receiver 修正候選

root 的隔離 Chromium 145.0.7632.6／b20-59-r1 實際結果為 4 PASS、6 NOT_RUN、20 FAIL。已讀兩語 context、observed 和全部四張可用截圖；計算後呈現固定 WORKER_FAILURE，沒有留下內部例外。不能把這些資料說成已捕捉本工具的 native Illegal invocation stack。

已獨立驗證原始碼的預設 setTimeout/clearTimeout 被保存為 instance property，再以 this.setTimer/this.clearTimer 呼叫，receiver 會是 PlanSession。新增真需求回歸載入實際 class body，在獨立 Node VM 用 receiver-sensitive 合成 host timer 驗證：修正前3項中2失敗、Worker.postMessage未送出；保留unbound control可重現固定WORKER_FAILURE。這證實呼叫方式缺陷及一條符合r1觀察的失敗路徑；特定Chromium內部例外及修復後真行為仍待root回驗。

產品最小差異只有 `public/js/app.js` constructor 的兩個 timer defaults 改為呼叫 globalThis.setTimeout/globalThis.clearTimeout 的 arrow wrappers；不改計算、Worker、CSP、頁面、UI copy、日期oracle。`scripts/release.mjs` 只更新 app.js 的一列 source pin，新增 `test/session-host-timers.test.mjs` 3項回歸。本HANDOFF僅追加。

app.js 新固定 bytes/SHA：26,481 / `89cf2ef0fb5d39a4ad9fe02b68d979f2098c1cfd89327a2ebf235d8a789ccda3`。先前版本26,397 / be00189b… 已保存於F1 baseline。來源／release／舊證據沒有被刪除或覆蓋。

**請 root 使用新的獨立候選**：`.runs/batch20-completion-2026-10-27/owner-59-f1/candidate-source/release-artifacts/site/`。主產品目錄的 dist 及 release-artifacts 仍保留舊版本作歷史，刻意沒有重建；其舊manifest `98382808…` 不能當成已修正候選。不要將新public與舊release混測。

最終命令全部在 F1/candidate-source 執行，沒有對舊root輸出做重建：npm test 67/67、0 fail/skip，npm run check（10public/24syntax）、npm run build（10檔/70,624bytes）、npm run build:release及check:release（13檔/72,120bytes）均exit0。新release manifest SHA：`3e01c3fdec7b28e6bf9435620225ae1b5448f537a46b1cac893e27f63cdcdb2e`。前後完整Environment Snapshots相同，guard exit0。命令及紅/綠回歸log、baseline、來源差異與固定manifest見 [F1交接](../../.runs/batch20-completion-2026-10-27/owner-59-f1/README.md)。

F1內 `browser-r2/harness.mjs` 保留全部原fixtures與oracle，失敗時在原observed之外新增完整failure-dom.html、failure-state.json（現值/selected/aria、status/error完整文字/HTML、result/download state）、failure-events.json及failure-viewport.png；擷取失敗另列diagnosticErrors，不掩蓋原失敗。原owner-59-browser與r1證據未改。新harness語法與16golden自驗通過，但沒有執行browser或rootrunner。

本輪未啟動browser/server/UI、未push/deploy/改首頁/憑證/Git或持久環境，也未委派。新候選仍未通過真browser；取消/進度競速、雙語實際成功、下載、keyboard/320px，以及既有zoom/native待驗狀態都由root依新證據判定。不得把Node receiver模型當成native Window或Chromium PASS。requested Sol/max，backend未獨立確認。

## 2026-10-27 追加：B20-59-M2A 正式發布準備

root回驗F1的b20-59-r2為 **24 PASS / 6 NOT_RUN / 0 FAIL**、prohibited空、parent cleanup PASS，並確認F1的14個artifact exact。保留該實際結果範圍：zh進度採樣、en取消競速，以及兩語200%/native-AT仍NOT_RUN；這不是外驗完成。root據此另行授權本輪準備正式資產，未授權本輪push/deploy。

public 10檔逐byte保持已驗F1（含app.js 89cf2ef0…），preview仍noindex與候選提示。新增固定wrangler.jsonc：glossquote-project-backplan / backplan.glossquote.com / compatibility_date 2026-10-24；workers_dev、preview_urls、send_metrics全部false；observability.enabled/logs.enabled/logs.invocation_logs/traces.enabled全部false。無Cloudflare Worker main、vars、bindings；assets.directory固定 ./release-artifacts/site，run_worker_first false、html_handling none、not_found_handling none。瀏覽器planner-worker.js屬已驗runtime，未移除或修改。

release.mjs新增精確三條301 `_redirects`（末LF）：`/ /index.html 301`、`/en /en/index.html 301`、`/en/ /en/index.html 301`。Production HTML只額外將各語唯一完整候選footer span精確換成原品牌span；其餘HTML與F1相同，JS/CSS/Worker/CSP/核心/輸出不變。正式manifest把root wrangler.jsonc列入configFiles，site封閉14檔；缺/多/改檔與config/asset+manifest同時竄改均從固定expected bytes拒絕。check.mjs亦驗config。

本輪更動：wrangler.jsonc、scripts/release.mjs、scripts/check.mjs、test/release.test.mjs、test/toolchain.test.mjs、HANDOFF.md。Tests新增5項M2A回歸（固定config/redirect、config+manifest竄改、redirect+manifest竄改、site不得含_worker/config、缺/錯型config），更新舊release預期為正式footer/14檔；scratch改到本輪m2a目錄，不改舊evidence檔。

正式候選只在 **`.runs/batch20-completion-2026-10-27/owner-59-release/candidate-source/`** 重建，從該source root使用wrangler.jsonc與release-artifacts/site成套審查。原主工具dist/release-artifacts及F1完整資料保留，不能拿舊main輸出部署；新版build/check會拒絕舊manifest，不自動覆寫。

在新copy final各跑一次：npm test **72/72**，check **10public/24syntax**，build **10檔/70,624bytes**，build:release與check:release **14site檔/72,136bytes**，全部exit0；另22項release針對性測試exit0。Release manifest SHA：`5b1cff20db990fe172a534912903cef3a03cb51b77db2e517fad9e16ac459d84`。環境完整Snapshots unchanged、guard exit0。來源、config/產物hash、舊資料保留與命令見 [M2A交接](../../.runs/batch20-completion-2026-10-27/owner-59-release/README.md)。

未啟動browser/server/CLI部署，未讀credential、未改全域Git/auth/持久環境/首頁、未付費或委派。新redirect/config/header實際hosting套用及正式網址尚未驗；此階段是待root審查的發布準備，非已發布/已部署/外驗完成。requested Sol/max，backend未獨立確認。

## 2026-10-27 追加：B20-59-M2B 本機發布副本就緒／共用GitHub限流

狀態 **READY_LOCAL_GITHUB_CREATION_THROTTLED**。本輪原獲授權公開KYStr/glossquote-labs-project-backplan；但root隨後報告56建立repo遭GitHub拒絕「You have created too many repositories, too quickly. Please try again later.」，要求停止新的repository建立與重試。本工具當時尚未建立repo，因此沒有建立、push、換API/帳號或安排自動重試；這是root回報的共享限流，不是假稱本對話已實際收到該CLI錯誤。

來源只取已驗的owner-59-release/candidate-source，沒有用主工具舊產物。乾淨副本位於 `.runs/batch20-completion-2026-10-27/owner-59-publish/publishing-copy/`。public/scripts/test/package/config/.gitignore共30檔逐bytes與root primary-fixes/59及M2A來源相同，重新產生的15個release檔亦逐bytes相同。沒有改程式來源。發布用README/AGENTS/START/HANDOFF/TASK-ENTRY/release說明/Git安全文件改為可攜的產品文件；不包含工作站路徑、raw evidence、.runs、帳戶資料、node_modules或憑證。保留全部tests/helpers/必要文件，18個本地文件連結可解析。

Clean copy final命令：npm test **72/72**、check **10public/24syntax**、build **10檔/70,624bytes**、build:release與check:release **14site檔/72,136bytes**，五項exit0。Release manifest SHA仍為`5b1cff20db990fe172a534912903cef3a03cb51b77db2e517fad9e16ac459d84`。

已建立固定**本機**commit `85af67b734c969af02c88468e68c9e127e5643b5`、branch `main`；61個tracked檔案逐一由Git blob重讀並核對filesystem bytes/SHA，working tree clean。無remote configured，未做遠端API公開性、branch、HEAD或逐檔驗證；public/remote commit欄為unknown/NOT_RUN，不能說已公開。

Git guard前後相同；完整Windows Environment Snapshots（PATH hash/type/length/ephemeral、全Environment與TEMP/TMP）前後相同，全部exit0。Git只在隔離copy init/add/commit，以per-command identity、無GPG、空hooks/template/attributes與autocrlf=false；沒有全域/system/local auth設定或認證命令。原程式/已驗M2A/F1產物未改，僅本HANDOFF追加。

詳 [本機發布交接](../../.runs/batch20-completion-2026-10-27/owner-59-publish/README.md)、[publication receipt](../../.runs/batch20-completion-2026-10-27/owner-59-publish/publication-receipt.json)、[tracked inventory](../../.runs/batch20-completion-2026-10-27/owner-59-publish/tracked-inventory.json)。等待root另行序列恢復；不自行重試、不browser/部署/改首頁，不標外驗完成。

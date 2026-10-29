# 交接：食譜份量換算

最新狀態：2026-10-13 M1/M2已主驗PASS，固定來源已PUBLIC；主代理已完成recipe部署與live HTTP/browser驗證。首頁批次整合與外驗仍待主代理，完整功能goal尚未完成。下面為歷史紀錄，最新凍結與整合紀錄附於文末。

|項目|狀態|
|---|---|
|要求配置|gpt-6.1-sol / max|
|實際配置接受/ backend identity|未建立對話，未確認|
|threadId / hostId|null / null|
|M1 自動/瀏覽器驗收|NOT_RUN|
|M2 GitHub/source ZIP|NOT_RUN|
|M3 Cloudflare/首頁|NOT_RUN|
|外部驗收|NOT_RUN|

主代理審查規格後才建立名為「食譜份量換算」的 feature chat。對話先實作 M1/T00，不能直接部署。要求模型和可驗證 runtime identity 分欄記錄；不得靠代理自述判定 backend。

候選 repo KYStr/glossquote-labs-recipe-scaler 與網站 recipe.glossquote.com 不代表存在。無任何測試執行或固定 manifest。

每個後續進度須 append：task/milestone、實際改檔、命令/exit、runtime 版本、環境 guards、測試數據、browser 觀察與未暴露版本、NOT_RUN、hash、發布狀態與風險。不要把食譜輸入或錯誤文字留在證據。

## 2026-10-13：RECIPE-SCALER-M1-T00 固定實作交接

本輪交付是雙語本機 MVP；狀態為 IMPLEMENTATION_FROZEN_PRIMARY_PENDING。實作所有權已釋出供原主對話 01a0c75e-24c2-76e1-8c70-536ae1ad1fbf 獨立驗收，尚未放行 M2。GitHub、正式 SEO/headers/404、Cloudflare、首頁、外部驗收均 NOT_RUN；沒有 Git commit、public repo 或 live URL。

對話 threadId=01a133a5-9894-7d41-9759-53e8a218b4be，hostId=local。DISPATCH.json 保留未改，證明 create_thread 接受要求配置 gpt-6.1-sol / max；backend identity 未確認。此區分也記錄於 project.json。

### 實作與允許路徑

- public/index.html、public/en/index.html、public/robots.txt、public/styles/app.css。
- public/js/app.mjs、i18n.mjs、view.mjs、core/recipe.mjs、core/report.mjs、core/session.mjs、core/editor.mjs。
- scripts/files.mjs、server.mjs、dev.mjs、build.mjs、check.mjs、manifest.mjs。
- test/core.test.mjs、session.test.mjs、server.test.mjs、fixtures/oracles.json；package.json、.gitignore。
- M1 進度記錄：README.md、START-HERE.md、TASK-ENTRY.md、project.json、HANDOFF.md、docs/RELEASE-CANDIDATE.md。
- 唯一外部寫入範圍是 .runs/recipe-scaler/m1-2026-10-13-01a133a5/。未改父級 STATUS/THREADS/首頁、其他工具、根 Git、Cloudflare、DNS、憑證或持久環境。

核心使用 strict descriptor schema 和 dense arrays，依指定顺序验证，BigInt 比例與 half-up，不換算單位、不推測時間/溫度。每次成功計算取得獨立 frozen snapshot。任一輸入、份數、適量與列增刪同步失效；copy callbacks 同時檢查 revision 與 request ID。missing/rejected clipboard 回 readonly 可選文字，不下載。清除/pagehide/pageshow/reload 不恢復資料。

採 frontend-design 一個設計流程與既有 Product App 工作表，使用原 family tokens／本機 system fonts，沒有外部套件、字型、圖像或流量。原生貼上測試發現 text input 會把 `1↵2` 靜默變成 `12`；已在唯一一批 QA 修正中改為 44px 初始高度的單列 textarea，保留非法 raw draft 給既定驗證。語言連結觸控寬度也已補足 44px。未放寬任何數量、schema 或捨入語義。

### 真實命令與結果

工作目錄：<LOCAL_WORKSPACE>/tool-projects/20-recipe-scaler。Node v24.14.0；npm 11.9.0；零 dependencies/devDependencies，未執行 install。

|Literal command|Exit/結果|證據|
|---|---|---|
|`& 'C:/Program Files/nodejs/npm.cmd' test`|0；49/49 PASS，0 failed/skip|npm-test-final.txt|
|`& 'C:/Program Files/nodejs/npm.cmd' run check`|0；syntax/closed assets/no network-storage HTML sinks/雙語 noindex|npm-check-final.txt|
|`& 'C:/Program Files/nodejs/npm.cmd' run build`|0；11 檔 offline、public/dist bytes 一致|npm-build-final.txt|
|`& 'C:/Program Files/nodejs/node.exe' scripts/manifest.mjs --out '../../.runs/recipe-scaler/m1-2026-10-13-01a133a5'`|0；固定 manifests|manifest-command.txt|
|`& 'C:/Program Files/nodejs/node.exe' '../../.runs/recipe-scaler/m1-2026-10-13-01a133a5/verify-browser-evidence.mjs'`|0；65 項真瀏覽器觀察的固定 expected 核對|browser-assertions-command.txt / browser-assertions.json|
|`& 'C:/Program Files/nodejs/node.exe' '../../.runs/recipe-scaler/m1-2026-10-13-01a133a5/freeze.mjs'`|最後 0；每個快照 bytes/hash 相同|freeze-command-final.txt / freeze-verification.json|
|`& 'C:/Program Files/nodejs/npm.cmd' run dev`|RUNNING_READY，未退出|preview-server.txt；Node PID 81368 / exec session 87019|

初始 48/48 tests/check/build PASS 也保留。原生 UI 修正後才重跑上述 final gates。快照 helper 首次 import 的相對路徑多一層，exit 1（freeze-command.txt）；只修正該 evidence helper 後成功，未改實作或重跑已通過的功能 gate。

A1–A30、A36–A38 的固定 expected 位於 core.test.mjs 與手寫 fake fixtures；A17 的適量清空和 A31–A35 位於 session.test.mjs。Node 層的 DOM sink stub、缺失/拒絕 clipboard 與 deferred promise 是單元測試，未當作原生證據。另測 loopback GET/HEAD/MIME、405/真404、未知/encoded/traversal route、實際 hardlink/junction、未知 stale asset 及 OS 分配埠 fallback，0 skip；沒有停止既有服務。

### 真瀏覽器觀察與未測項

Codex In-app Browser（browser 2/tab 1），browser engine version 未暴露。主要紀錄 browser-observations.json；固定版標籤皆以 final- 開頭；初始失敗與修正後紀錄並存。測試 recipe/Unicode/HTML 字串均是自寫 fake fixtures；沒有使用者食譜或秘密。證據保留假資料的實際輸入/輸出，是本任務明確要求的測量。

- 繁中、英文各於桌面 1280×720 與原生 viewport capability 的 320×800 實算 4→6：米/Rice 300→450 g、水/Water 1.2→1.8 L、鹽/Salt 適量/To taste 保持。其後兩語各改 400，舊結果立即清空/copy disabled，重新計算為600。
- 兩語空白第4列、1.2345 非法數量、1001 份數：沒有部分結果，定位第4名稱/第1數量/目標份數並 focus。原生貼上的完整 `1↵2` 保留並拒絕；17字元數量原稿保留並拒絕；Unicode 原生貼上「測試香菇」保留。
- 原生 keyboard Enter/Space 新增、刪除、計算、切換適量與複製；完整 final Tab walk 共20個焦點到copy，兩層focus可見且未遮蔽。適量清空後取消不恢復數量；clear/reload/pagehide-back 皆回1→1空白一列與無結果。
- 瀏覽器原生 clipboard write API 顯示成功提示；未讀取OS剪貼簿 bytes。readonly fallback／逆序resolve/reject 只有 Node PASS，原生拒絕/缺失路徑 NOT_RUN。
- 兩語 320px 真 browser clientWidth/scrollWidth 都305（viewport320/垂直捲軸），沒有頁面橫向捲動；測量的操作、欄位、checkbox label、語言連結與FAQ target皆≥44×44px。console warning/error=0；viewport override已 reset，tab與preview保留。
- NOT_RUN：實體手機、原生 OS IME composition、實際200% browser zoom、完整手動 Network/Storage/beacon 檢查、OS clipboard bytes與原生拒絕/缺失、讀屏語音、其他browser engines。工具未暴露對應能力，沒有用 CSS zoom、mock clipboard 或 DOM injection 代替。無 network/storage 的 source check、CSP與loopback HTTP檢查是有限自動證據，不能改寫這些 NOT_RUN。

截圖：final-zh/en-example-desktop.jpg、final-zh/en-example-320.jpg、final-zh/en-result-320-viewport.jpg、final-zh-result-desktop-viewport.jpg。desktop/mobile QA 修正一批後確認一次；沒有進一步擴充功能或裝飾。

### Windows environment guards

長測前後 literal `& "$env:USERPROFILE/.codex/check-persistent-environment.ps1"` 均 PASS。environment-before.json、environment-after.json 保留完整 Snapshots；environment-comparison.json 確認 serialized Snapshots 完全一致（含 TEMP/TMP hashes/type）。

|Scope|PATH registry type / length / ephemeral count|PATH SHA-256|整個 Environment key fingerprint|
|---|---|---|---|
|User|ExpandString / 834 / 0|3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb|3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a|
|Machine|String / 1227 / 0|52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8|a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82|

既有重複 PATH entries 保留原樣，未做任何持久修改。

### 固定 bytes 與 hashes

證據根：<LOCAL_WORKSPACE>/.runs/recipe-scaler/m1-2026-10-13-01a133a5/。每檔 path/byteLength/SHA-256 及 aggregate digest 定義均在各 manifest 中。

|Manifest|Files / bytes|Aggregate SHA-256|
|---|---|---|
|implementation source|23 / 95120|6e658305d0f1148ab113f24d5fae4cfb10b81ddb062274ca5b1e902f720e820d|
|browser code|8 / 37197|5b35accf6aa41a60ca6e37523bd654bd50093358f67e96d82fc972d4e195d66c|
|runtime|11 / 49931|1dbb28c5db03ddfcf68e6266ae8375cb0ff3848a8cd4c033c653dba2830b8812|
|dist|11 / 49931|1dbb28c5db03ddfcf68e6266ae8375cb0ff3848a8cd4c033c653dba2830b8812|
|unchanged contracts|11 / 53202|cf5330d9a6e521b73c80bbd6cfa33e3cdb4ccb9cf40d1d74d56fab8d40667d40|

frozen/source、frozen/contracts、frozen/runtime、frozen/dist 各保留固定 bytes；code 是 frozen/runtime 中的8個manifest指定檔。implementation source manifest 包含 public/scripts/test/config，進度文件另記，不使 digest 自引用。preview服務仍讀同一版本 public；dist與runtime相同，不宣稱 production release。

### 風險、ownership 與下一步

M1 需要主代理獨立驗收固定版和上述 NOT_RUN 邊界。browser engine、OS/mobile/zoom差異未測；本地MVP不能當作上線或外審通過。沒有剩餘已知 in-scope 功能缺陷。主代理正式放行前不做 M2，不讀任何憑證或進入 Cloudflare。主代理放行後仍在本功能原對話做 M2；M3與雙語首頁由主代理序列管理，外審確認前完整 goal 不標complete。

## 2026-10-13：RECIPE-M2-T01 PUBLIC source／production candidate 交接

M1 已由主代理正式 PASS：.runs/handoff-release-2026-10-13/20-primary-m1/ACCEPTANCE.md。主代理親跑固定23檔source digest、49 tests/check/build與雙語4→6、適量、原生換行拒絕/focus、英文320、正常原生clipboard readback、半千分位tie與小於0.001。這份主驗解除先前M1等待關卡並正式放行本原對話M2；backend identity仍未確認，要求配置仍為gpt-6.1-sol/max。

M2 owner gates全部通過，已完成獨立PUBLIC來源發布，固定commit／ZIP／production candidate凍結並釋出ownership給主代理獨立驗收。尚未部署Cloudflare、改DNS或首頁，也未做使用者外驗；完整功能goal仍未完成。

### 實際差異與 scope

M1原source23檔中只改8檔：package.json；scripts/files.mjs、server.mjs、build.mjs、check.mjs、manifest.mjs；public/index.html、public/en/index.html（只新增matching-language family home nav link）。新增10檔：wrangler.jsonc；public/404.html、_headers、sitemap.xml；scripts/release-contract.mjs、m1-frozen.json、check-frozen.mjs、production.mjs、check-production.mjs、serve-production.mjs。本工具進度metadata另改project.json、HANDOFF.md、docs/RELEASE.md、docs/RELEASE-CANDIDATE.md。

所有public/js、public/styles和test語義fixtures共12個受保護檔案仍與已主驗M1 bytes/hash完全相同。public/robots仍禁止索引；release-only三個source檔不由M1preview服務。production生成器在dist-production加入固定SEO與JSON-LD，並僅移除preview footer caption；現有操作工作表及所有互動沒有變更。未加runtime/dev dependency、功能或其他產品修改。唯一其他寫入是本次 .runs/github-publish/glossquote-labs-recipe-scaler/m2-2026-10-13-t01/，根Git未修改。

Production static-assets-only，14檔54668bytes：兩語HTML、七個原ESM、原CSS、robots、sitemap、404與_headers。canonical固定https://recipe.glossquote.com/index.html與/en/index.html；兩語reciprocal zh-Hant/en/x-default、title/description/OG/JSON-LD一致；sitemap只列兩URL；Host/query不能改canonical。CSP的精確inline JSON-LD hashes為sha256-cDPN+jFSZjDbVMcXrS64xXM0zKuz6or3paZET/KaxzE=和sha256-FLJjF0uhTSYIYft1uhu61bXXM12nW77R5MIMf7p1fUA=，沒有unsafe-inline/eval。

候選wrangler配置名glossquote-labs-recipe-scaler，compatibility_date=2026-10-13；asset directory=./dist-production、html_handling=none、not_found_handling=404-page、固定recipe.glossquote.com custom domain。workers_dev/preview_urls/send_metrics/observability/logs/traces都false。沒有Worker script/secret/binding，未執行任何Wrangler、Cloudflare或credential loader命令。Workers skill為配置參考，使用者與本專案的observability off規則優先；平台依據見docs/RELEASE.md。

### 命令與結果

Node v24.14.0、npm11.9.0；Git2.40.0.windows.1、gh2.96.0。所有命令均在實際工具目錄、reviewed source或clean-extraction執行；首次初步通過後為home link的44px nav wrapper修正重跑受影響final gates，歷史logs亦保留。

|Literal command|最終結果|Evidence|
|---|---|---|
|`& 'C:/Program Files/nodejs/npm.cmd' test`|exit0；49/49，0 fail/skip|npm-test-final.txt|
|`& 'C:/Program Files/nodejs/npm.cmd' run check`|exit0；syntax/zero deps/closed assets/no storage-network sinks/12 frozen files|npm-check-final.txt|
|`& 'C:/Program Files/nodejs/npm.cmd' run build`|exit0；preview11檔，public/dist bytes相同，noindex|npm-build-final.txt|
|`& 'C:/Program Files/nodejs/npm.cmd' run build:production`|exit0；14檔固定candidate|npm-build-production-final.txt|
|`& 'C:/Program Files/nodejs/npm.cmd' run check:production`|exit0；SEO/CSP/配置/bytes和真loopback GET/HEAD/MIME/405/404/host/query|npm-check-production-final.txt|
|`& 'C:/Program Files/nodejs/node.exe' scripts/manifest.mjs --out '../../.runs/github-publish/glossquote-labs-recipe-scaler/m2-2026-10-13-t01/manifests'`|exit0；逐檔bytes/hashes|manifest-final.txt / manifests/|
|`& 'C:/Program Files/nodejs/node.exe' '.runs/github-publish/glossquote-labs-recipe-scaler/m2-2026-10-13-t01/verify-archive.mjs'`（根cwd）|exit0；39 ZIP/working/Git blob bytes全相符|archive-verification-command.txt / archive-verification.json|
|clean-extraction：`npm test/check/build/build:production/check:production`與`node scripts/manifest.mjs --out ../extracted-manifests`|各exit0；49tests，產物逐檔相符|extracted-*.txt / rebuild-verification.json|
|`git -C <reviewed-source> -c core.autocrlf=false archive --format=zip --output <fixed.zip> af2e7145606bf45fbf02ccd8d304e9301570c136`|exit0；ZIP59037bytes|fixed-commit.txt / archive-verification.json|
|`gh repo create KYStr/glossquote-labs-recipe-scaler --public --source <reviewed-source> --remote origin --description <fixed description>`|exit0；repo PUBLIC|github-create.txt / github-repository.json|
|`git -C <reviewed-source> -c core.autocrlf=false -c core.hooksPath=<owned-empty-hooks> -c credential.helper= -c 'credential.https://github.com.helper=!"C:/Program Files/GitHub CLI/gh.exe" auth git-credential' push --set-upstream origin codex/m2-production-candidate`|exit0；只推送一次固定commit|publication-trace-audit.json；raw log排除驗收包|
|匿名`git -c credential.helper= -c credential.https://github.com.helper= ls-remote --exit-code https://github.com/KYStr/glossquote-labs-recipe-scaler.git HEAD`|exit0；HEAD等於固定commit|remote-head.txt|

用新的reviewed-source publishing copy git init；per-command core.autocrlf=false、owned empty hooks/template、user.name=Codex、user.email=codex@users.noreply.github.com及commit.gpgsign=false只作用該命令。branch=codex/m2-production-candidate。没有root commit/push、force、reset、auth setup/login/refresh、global/system config writes。Source39檔白名單與credential/private-context-shaped文字檢查通過；不含project/HANDOFF/DISPATCH/AGENTS/.runs/dist/node_modules/secret/他人文件。公開README/RELEASE為reviewed copy專用文案，不覆寫M1 root README。

### Public固定版本與位元組

Repository：https://github.com/KYStr/glossquote-labs-recipe-scaler；實查visibility=public、private=false，default branch codex/m2-production-candidate。固定local commit與匿名remote HEAD皆af2e7145606bf45fbf02ccd8d304e9301570c136。不是live website URL。

Source ZIP：recipe-scaler-af2e7145606bf45fbf02ccd8d304e9301570c136.zip，59037bytes，SHA-256 c1a83a5800f79842151df5f97490f9823f6bf4a372a1bfb7d2a09653a30b3caa。Git tree39 ordinary blobs；每檔ZIP原bytes、Git blob與reviewed-working bytes三方完全相同。乾淨解壓的所有gates通過，沒有依賴安裝。

|Scope|Files / bytes|Aggregate SHA-256|
|---|---|---|
|M2 implementation source|33 / 118988|aa5542ba593ae033abc243f023c8c4ef3d9e76f19f495770e53b609b826e55b9|
|reviewed PUBLIC source|39 / 138829|631255bbdf1515402ee073deea67b416e94854c934cb3b5ea9b4bcbc1de2ec58|
|browser JS/CSS（M1相同）|8 / 37197|5b35accf6aa41a60ca6e37523bd654bd50093358f67e96d82fc972d4e195d66c|
|preview runtime/dist|11 / 50076|0ec08edaa86f56a127014b1a0206f46bbcb21f6714cf1f67ac4a297d04321330|
|production root／clean ZIP build|14 / 54668|27943936bf5c05cc83efd24cbe509989c780a1c1c67e88129bc6d6a5f7612bed|

Evidence根：<LOCAL_WORKSPACE>/.runs/github-publish/glossquote-labs-recipe-scaler/m2-2026-10-13-t01/。m1-verification.json證明M2開始前23/23與主驗digest相同；reviewed-source-manifest.json、archive-verification.json、rebuild-verification.json和root/extracted manifests給出精確bytes。reviewed-source與clean-extraction為確切固定source copies；clean-extraction/dist-production保留可供主驗的固定產物；沒有在狀態文件更新後再commit/push。

### 真瀏覽器、HTTP與未測邊界

M2 production是在clean ZIP重建產物的task-owned Node loopback server上檢查：原生IAB真瀏覽器兩語4→6產生300→450g、1.2→1.8L、適量不变。實際DOM的canonical、robots index/follow、JSON-LD與matching-language home URLs正確；home anchor高度44px。英文原生keyboard calculate/copy API成功提示可見；console warning/error=0。production-browser.json、production-browser-console.json、production-zh/en-example.jpg保存實際觀察（fake fixtures only）。CSP下真module成功運作，不把單元stub當原生。

HTTP gate親跑14閉包中13個可服務資產的GET/HEAD、MIME、security headers與bytes；_headers不服務。未知、en未知、stale、encoded traversal和metadata paths回真正404與404 page，無SPA fallback；POST405。惡意Host/query仍回完全相同HTMLbytes。這是實際loopback Node HTTP，不是原生Cloudflare測試。

NOT_RUN保留：Cloudflare原生HTTP/部署、正式HTTPS/首頁、外部驗收；Wrangler dry-run（非必要，沒有安裝或呼叫）；實體手機、實際200% zoom、AT語音、OS IME composition、完整手動Network/Storage/beacon、genuine clipboard denial及其他browser engines。M1主代理的正常原生clipboard readback已有PASS，owner M2僅記錄write API成功；不宣稱原生denial測完。

保留服務：原M1 preview http://127.0.0.1:4200/index.html（/en/index.html），PID81368/session87019；production候選 http://127.0.0.1:58088/index.html（/en/index.html），PID10124/session77784，模式local-production-candidate-not-Cloudflare。兩者皆task-owned且保留供主驗，沒有啟停其他服務。

### 新Git安全規則、事件處置與Environment

收到主代理temporary publication hold後，只做候選、ZIP與本機驗證，沒有create/push；收到明確解除並讀新增根AGENTS、tool-projects/GIT-PUBLICATION-SAFETY.md、guard源碼後才發布。主代理已備份並移除四個已確認gh helper assignments、其他bytes不變且驗到既有system manager；沒有未知pre-state快照，因此不宣稱逐字恢復原先設定。本工具未執行任何該回復或global settings修改。

在根cwd literal `node tool-projects/scripts/git-settings-guard.mjs capture .runs/github-publish/glossquote-labs-recipe-scaler/m2-2026-10-13-t01/git-settings-before.json`取得新baseline；發布前再verify、create/push後同baseline verify均PASS。git-settings-before.json只存三個known user/system config檔existence/bytes/SHA；git-settings-pre-publish.txt與git-settings-after.txt保留結果。此guard是三個已知檔的前後偵測，不宣稱OS層阻擋所有工具或credential檢查。推送認證僅用單次git-c helper，不另行執行helper取得token、不读credential store。

發布子程序設GIT_CURL_VERBOSE=0仍因presence產生多餘HTTP trace，屬可避免的噪音；該子程序已結束，不再沿用。GIT_TRACE_REDACT=1保持4個Auth headers皆<redacted>，cookie headers=0、token-shaped matches=0，publication-trace-audit.json已核。没有憑證在code、ZIP或輸出中，raw trace只在私有evidence、不進public copy；沒有將這點誤寫成Git setting drift。

長測前後Windows guard完整environment-before/after/comparison.json皆PASS，User/Machine PATH raw hash/type/length/ephemeral count、TEMP/TMP及full Environment-key fingerprints完全一致。User ExpandString/834/0，PATH3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb／Environment3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a；Machine String/1227/0，PATH52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8／Environmenta0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82。trace/prompt環境僅子程序，不改User/Machine變數。

### 交回界線

M2 owner無已知in-scope defect，來源PUBLIC與固定ZIP/production候選已核。主代理需獨立驗收本固定版本，再接M3免費Cloudflare及兩語首頁；本功能原對話在此釋出ownership並停止，不自行部署、讀token、改首頁或宣稱外審完成。M3實際HTTP／hostname／SEO／headers仍需新證據；來源公開不能取代正式網站發布。

## 2026-10-13：主驗接續／最終scope凍結補記

主代理已獨立驗收PUBLIC固定commit af2e7145606bf45fbf02ccd8d304e9301570c136與所有39 Git blobs，親跑49tests及test/check/build/build:production/check:production各exit0，evidence .runs/handoff-release-2026-10-13/20-primary/result.json 的status=PASS_PRIMARY_SOURCE_TESTS_BUILD。這是對前述M2 pending歷史狀態的正式更新。

主代理已部署recipe.glossquote.com，deployment exit0、version499da687-502c-45e0-959c-67830684e6b6，記錄 .runs/handoff-release-2026-10-13/20-deployment.json。20-live.json 的status=PASS_HTTP、origin=https://recipe.glossquote.com、commit=af2e7145606bf45fbf02ccd8d304e9301570c136，38個正式HTTP records通過exact asset bytes、GET/HEAD、HTTPS、CSP/MIME、canonical/alternates、robots/sitemap、真404、configured redirects及browser UA；主代理亦回報live雙語比例/適量/nativeclipboard/stale操作PASS。此部署與live驗證由主代理完成，本owner没有執行部署或token讀取。

homepageIntegrationStatus=pending-primary-final-batch；整批雙語首頁由主代理處理。本工具尚未進入外審確認，不標complete。Source commit／source ZIP保持原值；本次補充只更新本工具private metadata／evidence，不改public commit、不再push、不改首頁。

已讀新增trace禁令：後續任何發布child process須清除GIT_TRACE_CURL、GIT_CURL_VERBOSE、GH_DEBUG=api及其他認證request debug開關，只改當次child環境，不改persistent variables；不得設定=0企圖停用presence觸發型開關。前次GIT_CURL_VERBOSE=0造成trace的原因、僅已結束process暫時變更、Auth4行全部遮罩/cookie0/token-shaped0，以及Git settings／完整Environment guards PASS均保留於安全處置摘要。原始trace不再轉傳，`github-push.txt`明確排除acceptance evidence／發布來源ZIP；沒有刪除或覆寫歷史原件。

最終scope：M1原23 source中的8個修改與10個新增都在M2允許路徑；12個public JS/CSS與semantic test/fixture受保護檔仍完全相同。進度metadata只限project.json、HANDOFF.md、docs/RELEASE.md、docs/RELEASE-CANDIDATE.md。閉包／差異摘要與private metadata最後hash在owner的scope-final.json及m2-closeout.json；sourceZip仍39 blobs/59037bytes/SHA c1a83a5800f79842151df5f97490f9823f6bf4a372a1bfb7d2a09653a30b3caa，production14檔54668bytes/digest27943936bf5c05cc83efd24cbe509989c780a1c1c67e88129bc6d6a5f7612bed。

ownership已凍結釋出，preview原M1 PID81368與candidate PID10124保留。除主代理後續指示外，此原功能對話在本里程碑停止；必要修正仍回此對話。未測實體手機、實際200%zoom、IME、AT、完整Network/Storage/beacon及genuine clipboard denial不改成PASS。

<!-- primary-handoff-release-2026-10-13 -->
## 2026-10-13 主代理正式發布與驗收

最新固定來源：https://github.com/KYStr/glossquote-labs-recipe-scaler/commit/af2e7145606bf45fbf02ccd8d304e9301570c136（PUBLIC獨立核實）。主代理由固定ZIP逐Git blob核对，再跑49測試及test / check / build / build:production / check:production全通過。38項正式HTTP回應及13資產核對通過；Cloudflare version 499da687-502c-45e0-959c-67830684e6b6。

正式站：[繁中](https://recipe.glossquote.com/index.html) / [English](https://recipe.glossquote.com/en/index.html)；雙語首頁已實際列出本工具。4→6份的300g→450g、1.2L→1.8L與適量不縮放；M2僅補同語首頁導覽及發布。

狀態：**主驗通過，等待外部驗收**。保留原紀錄中的人工NOT_RUN；本輪更精確的瀏覽器範圍見批次驗收包，24正式英文頁Edge封鎖未繞過。沒有把發布前固定文件的NOT_RUN視為最新狀態，也沒有將自動或HTTP測試冒稱真裝置/AT/完整Network與Storage測試。

主證據：`.runs/handoff-release-2026-10-13/`；工作區狀態註記不是固定公開commit內的檔案。
<!-- primary-handoff-release-2026-10-13-end -->

<!-- external-followup-accepted-2026-10-16 -->
## 2026-10-16 主代理採納外部複驗

固定版本 `af2e7145606bf45fbf02ccd8d304e9301570c136` 標記 **外部測試通過（本輪核心與雙語離線受測範圍）**：49項原測試、1,000組對照、6項雙語離線核心操作。這些是外部實跑結果；主代理已核對版本、回報及封裝完整性，未在本輪重跑整套。

完整正式站Network／Storage、原生操作與真機等仍待驗；NEL停用的提供者紀錄比對一致，不代表既有瀏覽器policy／queue全部清除。沒有新增確認產品缺陷，無需產品返工或重發。詳[最新外驗總表](../EXTERNAL-FOLLOWUP-2026-10-16.md)。本註記不改公開固定commit；下方／上方較早等待外驗狀態保留為歷史。
<!-- external-followup-accepted-2026-10-16-end -->

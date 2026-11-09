# 交接：折扣與免運試算

截至 2026-10-13：最新版本 0.1.0-m2-route-r1，M1主驗PASS、M2公開來源與正式候選已凍結待主代理，M3／外驗未完成。下文保留M1和初次M2歷史，最新route-r1交接位於最後一節；完整功能不標complete。

|追蹤欄位|目前值|
|---|---|
|要求模型/推理|gpt-6.1-sol / max|
|configuration/backend identity|create_thread accepted explicit model and thinking（DISPATCH.json） / not-confirmed|
|threadId / hostId|01a133a5-aba2-7112-9171-92dc008f4ce0 / local|
|M1|local gates PASS with documented manual NOT_RUN; frozen for primary review|
|M2 source repo/public visibility|NOT_RUN|
|M3 free hosting/homepage|NOT_RUN|
|external review|NOT_RUN|

要求配置與可驗證 backend identity 分開記錄。本原功能對話負責後續修正；沒有委派子代理或建立其他對話。

repo KYStr/glossquote-labs-cart-check、網址 cart.glossquote.com 是候選值，尚不存在證據。之後每個版本追加 task ID、實際 diff、命令/exit、環境守護、固定 manifest、瀏覽器/HTTP觀察、未驗項與 release status；不可保留使用者購物資料。

## CART-CHECK-M1-T00 固定本機版

驗收目標：BigInt cents 精確計算完整原籃／加購構成；所有 A 自動案例；check/build；兩語實際主要 B 及 320px／鍵盤；完整 environment guard 不變。只實作本工具與專用 .runs 證據，不修改父級 STATUS/THREADS/THREAD-DISPATCH、首頁、兄弟工具、根 git、DISPATCH.json 或 credentials。

實際程式變更：package.json、.gitignore；public/index.html、public/en/index.html、public/robots.txt、public/styles/app.css；public/js/core/cart.mjs、format.mjs；public/js/app.mjs、messages.mjs、report.mjs、state.mjs；scripts/pages.mjs、files.mjs、build.mjs、check.mjs、server.mjs、dev.mjs、manifest.mjs；test/core.test.mjs、state.test.mjs、server.test.mjs、fixtures.mjs。dist/ 是 allowlist 的 10 個靜態檔，逐 bytes 複製。進度更新本工具 README、START-HERE、TASK-ENTRY、HANDOFF、project.json、docs/RELEASE-CANDIDATE；另依主代理明確釐清只修 ACCEPTANCE A7/A22 的 raw 無逗號字串文案。

計算：百分比折扣金額先 half-up 捨入到分，固定券再扣且不負值，依所選折前／折後免運 basis 決定未折扣運費。基準與加購用同一 pure scenario 函式；完整 request、item、add-on schema 與 descriptor gate 不執行 getter。輸入任何修改／增刪／開關都立即清結果與報告、disable copy；clipboard async callbacks 受 revision、latest request id 及 copy id 保護。加購 value 錯誤以 INVALID_ADD_ON/field addOn 回報，request schema 仍先檢查。clear/reload/pagehide 移除使用者 draft，百分比／券／運費回到零與數量1安全預設，threshold 留空。

### 本機預覽與命令

task-owned PID 54448，`C:/Program Files/nodejs/node.exe scripts/dev.mjs`，本工具工作目錄；保持可用供主代理驗收。優先埠 4201 成功，fallback=false；`http://127.0.0.1:4201/index.html`、`http://127.0.0.1:4201/en/index.html`。server 僅 loopback、GET/HEAD allowlist，未知路徑真404、POST405，安全 CSP/no-store/noindex 與正確 MIME；拒絕 traversal、hardlink、junction/symlink 和 stale 未知資產。埠占用 fallback 已用 task-owned 測試 server 證明 OS 指派 loopback，不停止未知程序。

Node v24.14.0，npm 11.9.0，沒有 install／新依賴。以下字面命令在本工具工作目錄執行，全部 exit 0，完整 logs/exits 在 evidence commands.json：

- `& 'C:/Program Files/nodejs/npm.cmd' test`：44/44，fail0、skip0，固定 oracle cents 與離線 fictional fixtures。
- `& 'C:/Program Files/nodejs/npm.cmd' run check`：雙語靜態頁一致、preview noindex、無 maxlength 截斷、無 active HTML、無網路／storage／HTML sinks、10-file allowlist、17 module syntax。
- `& 'C:/Program Files/nodejs/npm.cmd' run build`：dist 10 files / 55146 bytes。
- `& 'C:/Program Files/nodejs/node.exe' scripts/manifest.mjs ../../.runs/cart-check/m1-2026-10-13-t00/manifest.json`：source/code/runtime/dist 逐檔 bytes+SHA256。

初期 test harness 兩項 transport 問題（fetch URL 正規化 raw backslash、fetch 不轉送 custom Host）已改為 native HTTP request，沒有弱化 gate；保留 initial-check-notes 與 failed log。最後視覺一批修正只縮短英文選項並保留 adjacent 完整 net-basis 說明、分離 select label、精確錯誤方向文案；影響的 test/check/build 已重跑。所有貨幣算法未因此改變。

### 真瀏覽器證據

Codex In-app Browser（工具 browser id 2，tab 1）；不是 mock。functional input/click、Tab、Space、Enter、native browser paste，以及實際 renderer viewport override 320×780。`browser-observations.json` 存完整假資料 inputs、DOM 可見構成、error focus、copy disabled、home link 與 viewport；桌面／手機 PNG、AX text 保存於專用證據。Windows scrollbar 可能讓 document clientWidth 為305，320 viewport override 下 document scrollWidth=clientWidth，沒有 page 水平溢出。不是 CSS 模擬寬度，也不是實體手機。

- 繁中／英文：900.00、運費80、門檻1000、percent/coupon0，加購100 →980.00／1000.00、文字多付20.00、加購成本100.00；加購50 →1030.00、仍收80.00、多付50.00。
- 同一900、percent10%、coupon10、threshold850、shipping80、addon100：中文 pre-discount 基準800.00（measure900.00），加購890.00、差+90.00；英文 post-discount 基準880.00（measure800.00，收80.00），加購890.00、差+10.00。兩語都顯示百分比先／固定券後；空threshold 中文仍收未折扣運費80.00。
- 兩語 invalid price1.001、quantity1001、第二空列均聚焦第一錯誤欄、無部分或舊結果，修正可重算。原生 paste 的 raw17 位價格完整保留並拒絕；中文+emoji 字串原生 paste 完整保留，這不是 IME 證據。
- HTML 品名 `<img ...>` 在實際 result DOM 是 escaped 純文字、results img count0；刪除商品／更改加購／basis 都清空結果及 copy。
- 固定版額外實測950+50、門檻1000、運費80 →1030.00／1000.00、少付30.00且列加購50.00；0.05×10% →折扣0.01、商品淨額／實付0.04。
- 兩語320主要互動與鍵盤 calculate、checkbox、Tab order；頁面 copy 回成功狀態。兩語 clear/reload，中文實際 navigation/back pagehide，所有原稿／結果清空。同語首頁 URLs 正確；未執行 shared homepage 發布。

### 固定檔案與環境

證據根：`<LOCAL_WORKSPACE>/.runs/cart-check/m1-2026-10-13-t00/`。`manifest.json` 是最後 source、code（public/scripts/test/package）、runtime（public）和 dist 逐檔 bytes/hash；固定 bytes 副本在 frozen-source/、frozen-dist/。source digest 以此 final manifest 為準，避免把自我參照 source hash 寫入 source。code digest=`0f54a2830316cb6a49e95069f1df693532df63e084c3633aa3d41f42fcbc3755`；runtime/dist digest=`a4b0a21d12463d195273542dbe77dc855736f2094eaff3e6f88db7294da9fd9c`，兩者逐檔相同。frozen proof 與 live HTTP bytes verification 另存 JSON。

guard 前後 Status PASS，完整 Snapshots（含 TEMP/TMP hashes）byte-equivalent。User PATH ExpandString / raw length834 / ephemeral0 / hash3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb，Environment-key fingerprint3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a、18 values；Machine PATH String / length1227 / ephemeral0 / hash52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8，Environment fingerprinta0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82、26 values。完整 environment-before/after/comparison JSON 均保存，沒有永久 PATH、TEMP/TMP 或系統設定修改。

### NOT_RUN、風險及下一里程碑

NOT_RUN：實體手機／軟鍵盤、實際200% browser zoom、OS中文IME composition、完整 DevTools Network/Storage（含 browser-extension／cache 面向）、screen reader、跨瀏覽器。原生 OS clipboard 內容／permission-reject／missing 的整合回退與外部 app paste 未驗；兩語頁面 write 成功回呼實測，missing/reject/stale/逆序 copy 只用明確標示的離線 handler fake 測試，不把它當 native。沒有 download 功能。

本頁沒有 storage/network APIs、第三方 runtime/font/service worker 的靜態證據已 PASS，但不替代完整原生 DevTools 観察。人工項依任務允許如實 NOT_RUN。主代理獨立 acceptance NOT_RUN；M2 SEO/canonical/hreflang/sitemap/production404headers、PUBLIC GitHub/remote commit/ZIP、M3 Cloudflare／雙語首頁、外部審查全部 NOT_RUN。

已凍結並釋放 owner；原 preview 仍活著。下一步僅主代理獨立驗收本固定版並正式放行 M2；本對話不得擅自跨 gate，完整 goal 不標 complete。

## 2026-10-13 CART-M2-T01 — 最新交接

主代理已實際驗收 M1，41檔固定source b28a994acece546096446e8fe277d64e17c5e571960744feb13851287413d9d4，親跑44tests/check/build與雙語真Edge主要流程，主報告位於 `.runs/handoff-release-2026-10-13/21-primary-m1/ACCEPTANCE.md`。正式原chat派工後執行M2；上方M1「awaiting primary」和goal active文字為歷史。當前 M2 source/candidate owner gates PASS，凍結待主代理獨立驗收；M3/外驗尚未完成，完整goal不標complete。

### 變更與範圍

只改本工具 package.json、scripts/build.mjs/check.mjs/manifest.mjs、docs/RELEASE.md，新增 scripts/release.mjs、build-production.mjs、check-production.mjs、server-production.mjs、dry-run.mjs、source-files.mjs、source-archive.mjs、release.test.mjs 與 wrangler.jsonc；進度更新本工具 project.json、HANDOFF、docs/RELEASE-CANDIDATE。所有 public source HTML/robots/JS/core/CSS、原test/**與全部semantic oracle維持M1 hash。正式head與404/_headers/robots/sitemap由reviewed generator生成至獨立dist-production，沒有改M1操作流程。沒有新增npm dependency或安裝、沒有再委派、没有 root Git、Cloudflare/DNS、首頁或兄弟工具的修改。

公開copy採42檔明列source清單與generated public README；內部AGENTS/START/TASK/DISPATCH/project/HANDOFF/RELEASE-CANDIDATE及local evidence／dist／node_modules都不進repo。來源runtime/toolchain/spec/privacy/design文件可在乾淨copy離線重建；sourceREADME精確分開candidate/public source/live。没有自動添加license，也不記用戶購物輸入。完整reviewed source manifest與code/diff scope proof保存在專用M2證據。

### 固定PUBLIC來源與ZIP

實際repository：[KYStr/glossquote-labs-cart-check](https://github.com/KYStr/glossquote-labs-cart-check)，visibility **PUBLIC**、isPrivate=false，defaultbranch main。實際git ls-remote --symref HEAD=**73d9767bb1d02f4c1c0c48d9ecf7c8625fd29829**，與固定local commit一致，沒有force-push。

Public source42 files，digest=`5513c0e693160da7a8725f49b3ca24e9ceb3fcff2e7d06740aac82f4c0bf600f`。固定commit ZIP：`.runs/github-publish/glossquote-labs-cart-check/m2-2026-10-13-t01/cart-check-73d9767bb1d02f4c1c0c48d9ecf7c8625fd29829.zip`，**84929bytes**，SHA256=`b15b63a6e3be72250e58daef8c4c3b01464c7d8d33fb234549062fc9903f5890`。使用git -C reviewed-repo -c core.autocrlf=false archive --format=zip --output <ZIP> <commit>，公開copy獨立Git，Windows newline沒有轉換Git blobs。安全parser查central/local headers、UTF8 filenames、path/duplicate/link/cap及CRC；42entries逐Git cat-file blob bytes與SHA256相等。clean-extraction為新目錄，重跑54/54＋check/build/build:production/check:production全部exit0，source bytes未變且重建13個production assets逐檔相符。

後續private狀態更新不重推新commit，固定ZIP與remote73d9767保留。source publication、candidate和host/homepage各自記錄；尚未達awaiting external review的live release條件。

### 本機候選／命令／產物

Node **v24.14.0**、npm **11.9.0**、Git **2.40.0.windows.1**、既有Wrangler **4.147.0**。在本工具CWD的字面命令如下；每個exit0，原54個測試含M1原44與M2新增10，不刪弱化gate：

- `& 'C:/Program Files/nodejs/npm.cmd' test` — 54/54，fail0/skip0；固定型別/金額tests與M2SEO、CSP hash、preview/prod隔離、HTTP404/MIME/HEAD/405、source drift/meta refresh拒絕、hardlink/junction/stale output、static config及ZIP CRC/path負例。
- `& 'C:/Program Files/nodejs/npm.cmd' run check` — PASS，25modules syntax、10-file source exact hash、noindex、無runtime依賴/Storage/network/activeHTML／截斷。
- `& 'C:/Program Files/nodejs/npm.cmd' run build` — preview10 files / 55146bytes / digest=`a4b0a21d12463d195273542dbe77dc855736f2094eaff3e6f88db7294da9fd9c`，與M1完全相同。
- `& 'C:/Program Files/nodejs/npm.cmd' run build:production`、`run check:production` — 13files / **60734bytes** / digest=`9deac92186b8ed8edeb9b393771a3be9145d45db34c4c88e3373be97754532e8`。
- `& 'C:/Program Files/nodejs/node.exe' scripts/manifest.mjs ../../.runs/github-publish/glossquote-labs-cart-check/m2-2026-10-13-t01/final-manifest.json` — 完整incubator source/code/runtime/preview/production逐檔bytes/hash；code digest=`1e7e3bbda2eb19986b7fa19f57bb04527a2b7fb56c824ff9bec4b2df718342c0`。Public42檔來源manifest另外記，README生成和excluded private records使它不等於incubator50檔來源。
- 乾淨ZIP CWD也實際執行相同五條npm命令，全部exit0，54/54；先production build後驗輸出，未由checker自動修復或隱藏差异。`clean-rebuild-and-scope-proof.json`記每個Git blob、重建及凍結M1路徑對照。

Wrangler help/schema先核對既有reviewed entry。隔離新child state，USERPROFILE<LOCAL_USER>/cache/temp/log/project均只在本專用evidence；只繼承明列OS/tool discovery，不讀／傳credentials。實際`node <existing wrangler.js> deploy --dry-run --autoconfig=false --config <isolated project/wrangler.jsonc> --outdir <owned bundle>` exit0，No bindings，沒有upload/自動config/install。vendor報告Read17，實際manifest明列13files；artifact計數以逐檔manifest為準。所有隔離環境更動僅child，不改User/Machine。

正式固定origin `https://cart.glossquote.com`，兩語canonical /index.html和/en/index.html、互返zh-Hant/en/x-default、title/description/OG、準確WebApplication JSON-LD及sitemap/robots一致。CSP允許兩個精確JSON-LD hash與self，不含unsafe-inline/eval；connect/font none、nosniff/Referrer/X-Frame/Permissions/HSTS/no-store。assets-only config html_handling none、not_found_handling404-page、workers_dev/previewURLs/metrics/logs/traces全部off，沒有account/binding/vars/routes或resource provisioning。

本機production候選PID **68628**：`http://127.0.0.1:5201/index.html`與`/en/index.html`，fallback=false；原M1 preview PID54448仍保留，未停止任何其他程序。真IAB browser2/tab2核對两語SEO DOM，中文900+100→980/1000多20；英文0.05×10%留下0.04；輸入修改清result/copy；error/warn logs=[]。本機unknownroute真404有雙語回鏈，不fallback calculator200，英文返回200。這是localcandidate，沒有Cloudflare live證據。M1全部未受影響的native主驗與manualNOT_RUN沿用，不另開視覺polish輪次。

### Git／Windows防護與事件限制

依主代理臨時暫停先完成localcandidate/ZIP，收到解除後才create/push。已讀新增根AGENTS與`tool-projects/GIT-PUBLICATION-SAFETY.md`。新guard `node tool-projects/scripts/git-settings-guard.mjs capture|verify .runs/github-publish/glossquote-labs-cart-check/m2-2026-10-13-t01/git-settings-before.json`：發布前後三個已知user/system Git config existence/bytes/SHA256 **完全相同**，沒有輸出原值或讀credential store。這是fingerprint偵測，不能聲稱封鎖所有任意操作。

本工具未執行gh auth setup-git/login/refresh、global/system Git writes或直接改config。Local reviewed Git以task-owned空config和process-only忽略system config隔離；push只用命令陣列的`-c credential.helper=`與`-c credential.https://github.com.helper=!"C:/Program Files/GitHub CLI/gh.exe" auth git-credential`，使用既有官方CLI認證，沒有另行取token或擴權。create/push/guard/visibility/remote-HEAD全有literal args、exit0及stdout證據。

其他owner的helper事件由主代理備份後僅移除四個已確認assignment、其餘bytes保持不變並驗到system manager；不能稱逐字恢復未知pre-state。本工具沒有變更此恢復狀態，disposition在git-safety-disposition.md。M2 Windows guard前後完整Snapshots也PASS且一致，包含User PATH ExpandString834、Machine String1227、ephemeral0，PATH hash／Environment-key fingerprint及TEMP/TMP hashes與M1一致。

### 證據、未驗与下一步

M2證據根：`<LOCAL_WORKSPACE>/.runs/github-publish/glossquote-labs-cart-check/m2-2026-10-13-t01/`。包含authorization、git安全disposition／guard／publication commands、所有npm和Wrangler logs、candidate／final manifests、42source reviewed manifest、固定commit ZIP／逐blob proof／clean-extraction rebuild proof、M1 scope proof、真browser DOM／PNG、HTTP逐bytes/hash、environment before/after/comparison及frozen-production副本。無真實購物或付款資料。

保留NOT_RUN：實體設備／IME/真200%zoom、完整Network/Storage／AT／cross-browser／genuine clipboard denial；M2本機copy/CSP不取代所有native環境驗證。Cloudflare部署／DNS／雙語首頁／liveHTTP與外部驗收均NOT_RUN，沒有費用/新permissions/credential變更。下一步只由主代理獨立驗收本M2固定source与candidate，依M3既有免費授權部署并驗首頁；owner在本輪釋放，原chat保留供修正，完整功能不標complete。

## CART-M2-T01 route-r1 — 最新固定版

主代理獨立檢查初次73d9767的wrangler發現沒有正式域名route。原文件沒有明確的M3 route注入設計，不能把沒有route的config稱為可直接完成cart.glossquote.com release；依主代理在原M2限定範圍的明確修正授權，補唯一`routes:[{pattern:'cart.glossquote.com',custom_domain:true}]`。M3主代理按這份配置部署；本工具沒有執行deploy或DNS。

相對73d9767，只有**wrangler.jsonc、scripts/release.mjs、scripts/release.test.mjs、docs/RELEASE.md**四個public檔改動。新增literal正例及缺route、錯host、custom_domain=false、額外route的拒絕測試；拒絕不改舊production bytes。M1 public HTML、JS/core/state/app/messages/report、CSS及原semantic test/**仍完全相同；13個production asset也全數相同，故沿用初次M2真browser/CSP/404證據，沒有重跑無關UI或再polish。

主工具與新乾淨ZIP副本：`npm test` **55/55 PASS**，`npm run check`、`npm run build`、`npm run build:production`、`npm run check:production`全exit0。既有Wrangler4.147.0的CustomDomainRoute schema已核對，新的隔離credential-free `deploy --dry-run --autoconfig=false` exit0，No bindings，沒有upload/安裝/自動config。

新固定source commit **bca9623c8085d3406e0f914fd58039545bc7bbc7**，保留73d9767 ancestry並fast-forward push；PUBLIC與真git ls-remote HEAD核對。42source digest **12f838647432fea7700348d624b6c8c944340a50dbde9c74e4dc78895299a446**；code digest **665b9880e0a26277b5498152e8af59a6d8abaf1fa0b36360bc7818732383df96**。新固定ZIP `.runs/github-publish/glossquote-labs-cart-check/m2-2026-10-13-t01-route-r1/cart-check-bca9623c8085d3406e0f914fd58039545bc7bbc7.zip`，**85323bytes**，SHA256 **584b917c2a740665f7eb5e83fbff239daa050f7efc5e2ad81b5b7fa261b90c6b**；42檔逐Git blob、CRC/path/caps、安全解壓、source hash和乾淨重建全PASS。

preview/runtime仍a4b0a21d12463d195273542dbe77dc855736f2094eaff3e6f88db7294da9fd9c；production仍9deac92186b8ed8edeb9b393771a3be9145d45db34c4c88e3373be97754532e8、60734bytes/13files。原M2固定ZIP b15b...和初次證據保留不覆寫；新commit是網域綁定必要修正，沒有因status-only更新再推。PID54448／68628繼續保留。

新publication block在 `.runs/github-publish/glossquote-labs-cart-check/m2-2026-10-13-t01-route-r1/` 重新capture/verify三個User/System Git config指紋；前後完全一致。Push仍僅單次git -c官方ghhelper，不讀token/store、不改global/system設定；localclone --no-hardlinks在本工具publishing evidence中保留歷史。新的Windows guard完整Snapshots也一致，既有環境保護維持。新manifest、logs／literal commands／exit、reviewed-source、commit-zip-proof、clean-rebuild-proof、guard／environment與route修正disposition均在新證據根。

本輪M2 owner再次釋放，主代理需驗收**bca9623**及exact custom-domain config後才做M3；Cloudflare／首頁／外驗均NOT_RUN，原manual缺口與model backend未確認保持不變。完整功能未完成，原chat保留供修正。

### R1發布文件一致性修正 — 最終來源

主代理引用`.runs/handoff-release-2026-10-13/21-m2-readonly-review.md`要求發布文件同步歷史和目前PUBLIC狀態。已將docs/RELEASE.md的「publication paused／initial no evidence」表述明確改為歷史事件及已驗PUBLIC證據，hosting／首頁／外驗維持NOT_RUN。只修這一份public文檔；相對bca9623的code/config及全部runtime／preview／13production bytes完全不變。源文件不嵌入會自我改變的最新commit hash，改以Git metadata和外部固定ZIP證據識別版本；歷史73d9767／bca9623仍明確標示歷史。

最終PUBLIC remote HEAD **a6b6ad2c5fc5dda2430a3055c161a6bf031460bd**，是bca9623的fast-forward；42source digest **527178acacff95dd0c820ab4a1f51b1f016552594da5cec68b6a79c5394c1251**。固定ZIP `.runs/github-publish/glossquote-labs-cart-check/m2-2026-10-13-t01-route-r1-doc-r2/cart-check-a6b6ad2c5fc5dda2430a3055c161a6bf031460bd.zip`，**86085bytes**，SHA256 **419b8675c6652e352cdcfffe0e0b68d7ccc1aac01d8e45ffee15fdaaceeeb664**。42Git blob／ZIP CRC與path／安全解壓sourceHash／乾淨55/55及check/build/build:production/check:production全exit0，重建production每檔與R1相符。

新publication block重新capture/verifyGit三檔與完整Windows Snapshots，皆相同；只用單次git -c官方ghhelper。CODE665b9880、runtimea4b0a21d、production9deac921和exactcart custom-domain config不變，沿用R1 dry-run／初M2真browser及manualNOT_RUN。不為此文檔修正重跑未改動的UI／CLI packaging；只依每個新固定ZIP的必要gate重新驗來源與重建。原73d/bca ZIP與所有舊證據保留，沒有force-push、M3或新權限。

最新證據根是 `.runs/github-publish/glossquote-labs-cart-check/m2-2026-10-13-t01-route-r1-doc-r2/`；owner釋放，請主代理以**a6b6ad2**驗收M2及開始M3，完整功能仍未complete。

<!-- primary-handoff-release-2026-10-13 -->
## 2026-10-13 主代理正式發布與驗收

最新固定來源：https://github.com/KYStr/glossquote-labs-cart-check/commit/a6b6ad2c5fc5dda2430a3055c161a6bf031460bd（PUBLIC獨立核實）。主代理由固定ZIP逐Git blob核对，再跑55測試及test / check / build / build:production / check:production全通過。36項正式HTTP回應及12資產核對通過；Cloudflare version ac0472f2-471f-45cd-9350-82e570695776。

正式站：[繁中](https://cart.glossquote.com/index.html) / [English](https://cart.glossquote.com/en/index.html)；雙語首頁已實際列出本工具。原對話補正式網域route與負例、釐清發布文件；900＋80和加購100達免運後1000，仍多付20。

狀態：**主驗通過，等待外部驗收**。保留原紀錄中的人工NOT_RUN；本輪更精確的瀏覽器範圍見批次驗收包，24正式英文頁Edge封鎖未繞過。沒有把發布前固定文件的NOT_RUN視為最新狀態，也沒有將自動或HTTP測試冒稱真裝置/AT/完整Network與Storage測試。

主證據：`.runs/handoff-release-2026-10-13/`；工作區狀態註記不是固定公開commit內的檔案。
<!-- primary-handoff-release-2026-10-13-end -->

<!-- external-followup-accepted-2026-10-16 -->
## 2026-10-16 主代理採納外部複驗

固定版本 `a6b6ad2c5fc5dda2430a3055c161a6bf031460bd` 標記 **外部測試通過（本輪核心與雙語離線受測範圍）**：55項原測試、1,000組對照、6項雙語離線核心操作。這些是外部實跑結果；主代理已核對版本、回報及封裝完整性，未在本輪重跑整套。

完整正式站Network／Storage、原生操作與真機等仍待驗；NEL停用的提供者紀錄比對一致，不代表既有瀏覽器policy／queue全部清除。沒有新增確認產品缺陷，無需產品返工或重發。詳[最新外驗總表](../EXTERNAL-FOLLOWUP-2026-10-16.md)。本註記不改公開固定commit；下方／上方較早等待外驗狀態保留為歷史。
<!-- external-followup-accepted-2026-10-16-end -->

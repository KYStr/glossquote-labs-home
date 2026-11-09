# 分帳與墊款結算交接

最新狀態（2026-10-13）：**U14 v2 READY_FOR_INTEGRATION：文件／新版公開來源與固定ZIP已交付，待primary正式整合及新版外驗**。PUBLIC main為 `c82e8a182b36cf9568e28d9179a923e0fdaf7a4b`；本對話未部署新版，既有正式站source仍為 `88f2036a619a98398cd2f72ccd7adebe49dda18a`。舊版外部通過只對該舊commit成立。新版兩種模式均paid自動加總，不手填total／啟用paid。current需求及分層證據見PRODUCT、docs/TEST-RESULTS與PRIMARY-REVIEW-2026-10-12-U14.md；固定來源／ZIP與命令見 [發布候選](docs/RELEASE-CANDIDATE.md)。

## 初始規格紀錄（以下保留當時狀態）

目前：SPEC_READY。產品程式尚未實作；主代理已完成產品/技術/UX/驗收/任務及安全/發布契約，待文件驗證和實際對話派工。新對話模型請求為gpt-6.1-sol/max，尚無已確認backend身份。

本機測試、真瀏覽器、來源公開、正式部署、主代理產品驗收、外部複驗：全部NOT_RUN。規格案例不是產品通過數。下一步T00，並依TASKS持續推進。

每次追加：task ID、需求/allowed scope、實際修改檔、命令/exit與版本、PASS/FAIL/NOT_RUN及證據、未驗/風險/根因、GitHub可見性+HEAD、部署commit/URL、下步、owner是否停止修改。保留歷史，不把上次未驗事後改成已驗。主對話補正式驗收及外部修正紀錄。

## 2026-10-12 T00 PASS

新增 package.json/.gitignore、雙語 public 骨架、tokens/app CSS、app.mjs、serve/check/build scripts、scaffold.test。Node v24.14.0。npm test：2/2；npm run check：5 assets；npm run build：5 public-only preview assets；各 exit 0。真 loopback server 已驗 GET/HEAD、MIME、405、根/深層404、路徑/hidden/junction 拒絕、隔離copy。未計核心功能/瀏覽器/正式站 PASS。

Guard 基準 `.runs/bill-splitter/environment-before-20261012.json`：User ExpandString/834/PATH SHA 3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb；Machine String/1227/52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8；ephemeral 皆0。full Environment fingerprint User 3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a / Machine a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82。

本對話 Goal 已建立 active；請求 gpt-6.1-sol/max，無後端身份驗證工具可用，backend 未獨立確認。owner 持續 T01，不修改共享工具或正式部署。

## 2026-10-12 T01 PASS

新增 core money/split/report 與對應測試；check 審查新模組。npm test 14/14、npm run check 8 assets，各 exit 0。400 組獨立配額/守恆/零權重/不mutation不變量；S01–S17、S18 hidden getter、不換行姓名、S27 平均報告有效份數已自動驗證。T02 真瀏覽器仍待驗；owner 繼續 T02。

## 2026-10-12 AUDIT-14-T00-BOUNDARIES 修正

主對話 fake-copy 重現的 root junction、HTML 單引號遠端 script、CSS import、commented robots 已修復，保留 T02 UI。scripts/validate.mjs 現在在遍歷前檢查每個祖先及根的 lstat/realpath；check/build/serve 共用邊界。HTML 使用保守 tag/attribute tokenizer，支援單/雙/無引號及大小寫、移除註解後要求 active robots，首頁 https 只可用於 anchor。CSS 不支援任何 import/url/escape；產品不需要這些語法。

新增 fake-copy regression，check/build 負例均拒絕且原 dist sentinel/外部假 source 不變，合法 copy 仍 PASS。npm test 16/16、npm run check 9 assets、npm run build 9 preview assets，exit 0。未將此 gate 證據稱為真 Network/正式站 PASS。原主對話快照未修改；本工具後續證據在專用 .runs。owner 恢復 T02。

## 2026-10-12 T02/T03 本機可用候選

完整 public 雙語工作表、i18n/errors/report/FAQ、memory-only 草稿、穩定人員序號、明確計算、來源變更失效、copy拒絕fallback與revision守衛、TXT與30秒Blob回收、清除/pagehide。T02 test 15/15/check9/build9原已 exit0；T00 audit後16/16。新增 ui-contract 與 controller adapter；adapter 2/2 exit0，涵蓋clipboard晚到success/error、原生Blob UTF8/LF/BOM、timeout/change/clear/pagehide回收，並修download exception時殘留anchor（T03 owning修正）。adapter不是browser PASS。

Chrome繁中、Edge英文實際主要/錯誤/任意來源失效/clear/copy驗收結果與精確人工缺口見 docs/TEST-RESULTS.md。下載事件工具timeout、內部管理頁被protocol policy拒絕，未嘗試绕過；viewport320指令未改實際1665寬，已reset，320/200%不能宣稱PASS。真Network/Storage工具沒有觀測能力，仍NOT_RUN。沒有未處理已知必要產品FAIL；候選可交主對話補人工驗收，不能稱完整MVP或正式交付。

主對話已獨立關閉AUDIT-14-T00（固定snapshot、scaffold3/3與core12/12及獨立配額）；不因此重跑未變core。owner 繼續T04，正式Cloudflare/Home仍由主對話。

## 2026-10-12 T04 PASS

新增release.mjs、雙語404、_headers、wrangler.jsonc、release.test；改check/build/package scripts與scaffold產物預期。production固定split.glossquote.com，兩語self canonical/hreflang/x-default/OG/WebApplication；preview noindex/禁止robots/empty sitemap。check精確驗dist14資產及bytes，build前檢查source/祖先/headers並驗生成HTML，受控重建不留stale檔。不加runtime/npm套件、未讀token、未deploy/dry-run。

npm test 20/20 exit0；check/build/build:production/check:production原執行各exit0，新增release/headers gate後由完整測試實跑再驗。為獨立clone自包含，audit假copy fixtures改本工具.test-tmp（append-only），下一步再跑受影響scaffold並固定兩模式manifest。T04採官方Cloudflare文件，project no telemetry覆蓋通用observability技能建議，實際platform/header/404由主對話live gate補驗。owner進T05公開完整候選。

## 2026-10-12 AUDIT-14-HARNESS-TAGS PASS／本輪交回

依主對話最新有界恢复任務，本輪只改 test/controller.test.mjs 的靜態 DOM tag 對照，並追加此交接及測試紀錄；未改 public/產品。report 現為 textarea，total/paid-toggle 為 input、precision/mode 為 select，操作為 button，bill-form 為 form，其他節點對應實際 div/span/p。保留只對真正可聚焦控制生效的 focus guard，也保留原 denied clipboard fallback 的 activeElement/report select 斷言。

Node v24.14.0，在本工具 cwd：`node --test test/controller.test.mjs` 3/3 PASS、exit0；`node --test test/ui-contract.test.mjs` 1/1 PASS、exit0，合計4項。兩語全零份數與已付不足/超額的群組錯誤、aria關聯恢復仍通過 adapter；真瀏覽器焦點驗收由主對話接手，本輪未開browser。未重跑T00/T01、全套build、發布或hosting。

固定證據 `.runs/bill-splitter/harness-tags-20261012-9e4ad281f48446ac91e8685a272b3ad1/`：controller.log、ui-contract.log、results.json、前後檔案hash及Environment snapshots。controller SHA256：760619a2fd0ca9e29e82c4aaea12d0d40fddb2b0220c241c8461ff48d5031ce4；public/js/app.mjs 前後hash相同。Windows guard兩次PASS，User/Machine PATH type/length/SHA/ephemeral及full Environment fingerprint不變。

原 GROUP-ERROR 產品修正已保留；它先前造成adapter report假div不能focus，這次只修替身，沒有用產品迎合mock。既有server保留，不重啟/終止。owner 已釋放，等待主對話獨立焦點驗收與T05續工指令。GitHub仍未公開、正式hosting/Home仍未整合、外驗未完成；不把這次小修稱為功能完成。請求Sol/max不變，backend仍未獨立確認。

## 2026-10-12 T05 PASS／READY_FOR_INTEGRATION

收到primary續工及獨立有界關閉：harness controller3+ui1=4/4、public所有bytes不變；兩語GROUP-ERROR真focus/aria已親驗，T04 release2/2＋production check親驗PASS。保留完整Network/Storage/320/200/AT等人工缺口，不重新跑未變核心/UI。

本輪改README、PRODUCT/TECHNICAL/ACCEPTANCE/UX-SEO過期狀態文案、docs/TEST-RESULTS追加primary證據、project.json及本交接/RELEASE-CANDIDATE，新增scripts/publish-manifest.mjs和source-manifest.json；public runtime/core完全未改。39個審查source檔（掃描拒絕真secret模式）＋manifest在獨立copy共40Git blobs，無dist/node_modules/.runs/其他工具/內部派工或秘密。未指定開源license。根Git/index/branch未操作，不force。

Review copy `.runs/github-publish/glossquote-labs-bill-splitter/`：check/build/build:production/check:production各exit0；manifest39source/14production；index原始bytes40/40。使用單次Git core.autocrlf=false/core.attributesfile=NUL，commit/create-public/push/fetch/API核實均exit0。已公開 https://github.com/KYStr/glossquote-labs-bill-splitter ，**PUBLIC** / **main** / verified remote HEAD `88f2036a619a98398cd2f72ccd7adebe49dda18a`；fixed tree `9f4d4b39ba3afe12477b9943939fb6a7258681ef`。

固定source ZIP：`.runs/bill-splitter/t05-20261012-ea30a90bdb184f7793ce5d3a48db591a/glossquote-labs-bill-splitter-88f2036a619a98398cd2f72ccd7adebe49dda18a.zip`；SHA256 `d99215462bf9981439edd73f410f2381eaedc25bf05c4164de3273cb81bb134f`。實際解壓40檔逐byte等於固定remote Gitblob、source manifest及review copy；不能只驗ZIP hash。首輪validator因tree查詢識別錯誤exit1，保留log；取得固定commit的actual tree後v2逐檔核對exit0，未改ZIP或門檻。

ZIP解壓副本實跑check/build/build:production/check:production各exit0；14正式資產hash等於公開manifest。Production manifest JSON SHA256 `1beabad7c0f82df21fcd436258614d1c0bf2a922498dc163d8840e4b9334b523`。copy/source/archive/remote/兩模式manifest及guard證據都在上述專用T05資料夾；workspace39source最後仍一致。Windows完整前後snapshots相同：User ExpandString/834、Machine String/1227、ephemeral0，PATH SHA與full Environment fingerprint不變。未讀credential/token、未變持久系統/Git設定。

Source已公開不等於live網站。hosting **NOT_DEPLOYED**、homepage **NOT_INTEGRATED**、最後release主驗與外驗待完成；正式候選split.glossquote.com雙語URL。所有人工缺口與主對話補驗／免費部署整合步驟見docs/RELEASE-CANDIDATE。本輪owner已釋放，不操作Cloudflare/Home、不關原server；收到返工再回原owning task。請求Sol/max維持，backend未獨立確認；沒有自行呼叫update_goal pause/complete，既有Goal未完成。

## 2026-10-12 BILL-T05-RELEASE-HANDOFF／已上線，待外部複驗

這是primary完成正式整合後的文件交接，不是原功能owner新跑產品測試。PUBLIC main固定產品／部署source仍為 `88f2036a619a98398cd2f72ccd7adebe49dda18a`，40 Git blobs／39 manifest及原ZIP逐byte、SHA256、Git SHA1相符；ZIP SHA256仍為 `d99215462bf9981439edd73f410f2381eaedc25bf05c4164de3273cb81bb134f`。primary固定來源check/build/checkDist production/dry-run PASS，14正式資產與manifest一致，26項既有親驗runtime/test/config bytes未變；既有必要測試及Chrome/Edge原生下載證據沿用，沒有冒稱本轮重跑。

正式免費部署：https://split.glossquote.com/index.html 及 https://split.glossquote.com/en/index.html；Cloudflare version `5bc6e600-59b4-4f71-884c-fe95e27025da`。primary本輪38項HTTP與兩語主要真Chrome流程PASS：100/3分帳、來源修改清舊結果、已付合計差1拒絕及焦點、切語清空。HTTP與DOM流程不等於完整Network/Storage驗收。

雙語首頁已包含分帳：12 published，checksum draft不渲染，11個舊entry逐一保持不變。首頁PUBLIC source `ea515ef03fc4bf5679505ecb910ee7cd0a02dcd7`（codex/initial-publication），Cloudflare version `a3a5886b-331f-4071-8aef-b8e1820328d4`。primary首頁12 tests、7 production assets、dry-run/check及25項live HTTP PASS，中英文首頁／分帳實際往返PASS。

本輪已讀核對的primary證據：[來源](../../.runs/bill-release-2026-10-12/bill-source-integrity.json)、[ZIP](../../.runs/bill-release-2026-10-12/bill-zip-integrity.json)、[正式產物](../../.runs/bill-release-2026-10-12/bill-production-integrity.json)、[38項HTTP](../../.runs/bill-release-2026-10-12/bill-live.json)、[附加headers](../../.runs/bill-release-2026-10-12/bill-additional-headers.json)、[真Chrome](../../.runs/bill-release-2026-10-12/browser-observations.json)、[bill部署](../../.runs/bill-release-2026-10-12/bill-deployment.json)、[首頁publication](../../.runs/bill-release-2026-10-12/home-publication.json)、[25項首頁HTTP](../../.runs/bill-release-2026-10-12/home-live.json)、[首頁部署](../../.runs/bill-release-2026-10-12/home-deployment.json)。外驗包由primary建立於 [2026-10-12-bill](../review-packages/2026-10-12-bill)。

仍NOT_RUN：完整Network request/payload／Storage及hidden-return、320px／200%、完整鍵盤／AT、真clipboard denial／late promise、完整live 2/50人邊界矩陣及其他僅N案例的B缺口。外部驗收尚未確認，本版本不是完成。Goal工具的既有pause狀態不代表本對話收到使用者暫停指示，本輪不呼叫pause/complete。

此小任務只更新HANDOFF、START-HERE與RELEASE-CANDIDATE的內部交接。README、TEST-RESULTS及固定公開來源／manifest不改，不再push docs commit；未跑未變產品tests、未讀憑證、未部署／改首頁或持久環境。檢查相對連結、commit/version/hash對證據及39個固定source檔bytes；owner釋放，等待具體外驗回報，不忙等或重做已過gate。

本小任務驗證：在本工具cwd執行Node只讀文件檢查，exit0。3份文件開頭均為已上線待外部複驗，31個相對連結可讀；bill/home commit、兩個CF version、固定ZIP SHA及38/25 HTTP紀錄數與primary JSON一致；39個source manifest檔的bytes/SHA256全部未變。這是文件／固定來源核對，product tests rerun=false。

## 2026-10-13 U14-DOCS-SOURCE 文件同步

實際更新PRODUCT、TECHNICAL、UX-SEO、ACCEPTANCE、README、TASKS、HANDOFF及docs/TEST-RESULTS；程式／tests／scripts未改。current契約改為快速與進階均由已付sum，always settlement，只有進階可調有效權重。全paid0有效、全weights0拒絕、0份保留代墊、清除focus name-1；無total／paid-toggle／使用者paid mismatch流程。calculateBill與舊案例標內部相容／歷史，沒有刪舊驗收紀錄。

製作focused14/14、初始full30/31 rename EPERM、修fixture後scaffold3/3另記；primary固定來源31/31及check/preview/production、10000獨立性質／比較＋邊界、兩語真Chrome／320px／clipboard／512byteTXT證據分開記。200%／AT／完整Network/Storage/hidden-return／真clipboard denial/late promise／完整瀏覽器矩陣NOT_RUN保留。

本輪先核對code-candidate-sources.json固定程式hash再沿用primary驗收，不重跑未變昂貴測試；接續僅自己的reviewed copy PUBLIC來源、固定Git bytes ZIP/manifest及解壓核對。部署／首頁／token由primary持有，本對話不操作。請求Sol/max維持，backend未確認；不把服務中斷或Goal狀態當成使用者取消／暫停或产品完成。

## 2026-10-13 U14-DOCS-SOURCE PASS／owner釋放

已實際更新八份current文件，並更新START-HERE、TASKS與RELEASE-CANDIDATE交接狀態；只修改本工具Markdown及生成source-manifest，未修改程式／tests／scripts。公開來源：[KYStr/glossquote-labs-bill-splitter](https://github.com/KYStr/glossquote-labs-bill-splitter)，visibility PUBLIC、default branch main；local HEAD、origin/main、ls-remote及GitHub commit/tree API一致為 `c82e8a182b36cf9568e28d9179a923e0fdaf7a4b`，tree `65d6824f726203f821641ec224fa8ec39313b1af`。40個allowlist source加manifest共41個Git blobs，不含其他工具、內部派工／交接、dist、node_modules、證據或憑證。既有main正常快進，未force或更動根repo/index/branch。

固定ZIP：`<LOCAL_WORKSPACE>/.runs/bill-outcome-2026-10-12/docs-source-20261013-1adeaf0dc60d4890949b7e3133ba0a85/glossquote-labs-bill-splitter-c82e8a182b36cf9568e28d9179a923e0fdaf7a4b.zip`；89,613bytes；SHA256 `64b1153ce82544a517db16eb0fa7d17b10962dc5b7aec8de0af05e3ce3a77543`。使用單次 `git -c core.autocrlf=false -c core.attributesfile=NUL archive` 固定Git bytes；先核對entry allowlist／重複／有界目標再真解壓。41/41逐byte等於固定遠端Git blobs與reviewed copy，40 source另對SHA256/bytes及工作區source-manifest。ZIP SHA與source-manifest本身SHA分開記錄，詳見發布候選。

reviewed copy及ZIP解壓副本各自check、preview build、production build、production check全部exit0（12 source assets／14 preview／14 production）；解壓14個正式資產精確等於公開manifest。Node v24.14.0，零npm dependencies；使用完整node路徑執行package scripts對應命令。未重跑未變product tests；29/29程式／tests／scripts／設定bytes及SHA256匹配primary固定code-candidate，沿用其31/31與獨立驗證。製作focused14、初始full30+1及scaffold3與primary31/31維持分層紀錄，沒有合併或隱藏初始FAIL。

本輪證據根為 `.runs/bill-outcome-2026-10-12/docs-source-20261013-1adeaf0dc60d4890949b7e3133ba0a85/`：fixed-code-match、source-before、copy/index-integrity、remote repository/head/commit/tree、ZIP entry/hash/archive-integrity、extracted-build-integrity、workspace-final-integrity及各命令logs。HKCU/HKLM完整Environment snapshots、PATH hash/type/length與TEMP/TMP指紋前後一致，ephemeral皆0；environment-before/after/comparison已保存。未讀token／stored secrets，未改持久環境／Git設定，未關既有server或其他process。

新版hosting／homepage整合／新版外部驗收 **NOT_RUN**；既有正式版88f2036不算新版已部署。人工缺口：真200%／AT讀屏／真機／完整Network及Storage／hidden-return／真clipboard denial及late promise／完整browser matrix，保持NOT_RUN；已列Chrome320px、英文進階clipboard及512byte TXT只按primary有界證據PASS。owner本輪工作完成並釋放，由primary讀固定來源／ZIP，完成正式部署、雙語首頁及新版外驗包。沒有缺重複授權；没有自行pause/complete Goal或標新版產品完成。

## 主代理本批來源／發布對齊 — 2026-10-13

原對話U14文件收斂與首頁回報均已收回。PUBLIC c82e8a182b36cf9568e28d9179a923e0fdaf7a4b，固定41檔ZIP逐Git blob符合；此commit相對上一輪只補8份文件，已驗產品hash不變，沿用31tests/10000獨立案例/原生clipboard与TXT/窄版證據，未冒稱本輪全重跑。主代理production/dryrun/ValidateOnly後部署658f7744-b6e4-4d1f-8a5a-fa34b3e22df9；38筆HTTP/13精確資產通過。本輪真Chrome複驗900/300/0→乙給甲100/丙給甲400，進階2/1/1→丙給甲300，自動總額1200、改901失效結果及雙語。新版為AWAITING_EXTERNAL_REVIEW。證據 .runs/outcome-batch-2026-10-13/bill-{live-browser,zip-integrity}.json 與 .runs/outcome-upgrade-2026-10-12/bill-live.json。實際裝置/AT/完整NetworkStorage等人工未驗延續。

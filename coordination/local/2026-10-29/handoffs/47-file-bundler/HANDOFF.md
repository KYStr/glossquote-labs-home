# 附件大小分包 M1 交接

2026-10-23（Asia/Taipei）｜候選版本 `0.1.0-m1`｜**M1_IMPLEMENTED_AWAITING_PRIMARY_REVIEW**。

已實作真 ZIP STORE 分包、原始位元組保留、精確大小／CRC32、總索引、繁中／英文靜態工作區、取消及同步失效清理。這是供主代理獨立驗收的本機候選；尚未通過完整產品驗收、尚未公開來源或部署。README、ACCEPTANCE 等唯讀規格中「規格交付／尚未執行」是入場歷史狀態，本交接與 evidence 記載本輪實況。

| 範圍 | 本輪結果 |
| --- | --- |
| M1 程式實作 | IMPLEMENTED：Node 24 原生、零外部依賴 |
| 離線 Node tests | PASS：42 tests，42 pass，0 fail／skip／todo |
| check / preview build | PASS：11 個 public 資產，dist 逐 byte 相同 |
| 主代理獨立驗收 | PENDING_PRIMARY_REVIEW |
| 真瀏覽器／Worker realm／實際下載／可及性／版面 | NOT_RUN_USER_FOCUS_INCIDENT |
| 真實 HTTP／Network／Storage／原生／真機 | NOT_RUN_USER_FOCUS_INCIDENT |
| GitHub／source commit／reviewed commit／released commit | NOT_PUBLISHED：均無；本輪未 commit 或 push |
| hosting／正式網址／首頁 | NOT_DEPLOYED：候選 domain 並非已發布網址 |
| 外部驗收 | NOT_RUN |

requested 設定為 gpt-6.1-sol/max；實際 backend 未獨立核實。本輪沒有瀏覽器、CUA、native UI、隔離實驗、devserver、子代理、新 chat 或自動目標。

## 變更檔案與行為

只修改本工具核准路徑。新增 30 個來源／工具鏈／測試檔、11 個 dist 鏡像、TASK-ENTRY 和 evidence；更新此 HANDOFF。13 份唯讀規格／docs 未修改。其他既有 root／GlossGate 修改未處理。

- 設定：[package.json](package.json)、[.gitignore](.gitignore)。private ESM、Node 24，只有 dev/test/check/build 四個 npm scripts；不 npm install。
- 介面：[public/index.html](public/index.html)、[public/en/index.html](public/en/index.html)、[public/css/app.css](public/css/app.css)、[public/js/app.js](public/js/app.js)、[public/js/ui.js](public/js/ui.js)。一般語言 anchor 和可見遺失警語、同語首頁連結、noindex/nofollow/noarchive、兩語 FAQ。檔名以文字節點呈現；每個 ZIP 和索引分別使用原生 download anchor，沒有自動 click／連續下載。
- 工作生命週期：[public/js/state.js](public/js/state.js)、[public/js/bundle-worker.js](public/js/bundle-worker.js)。epoch 隔離、progress、terminate、完整批次才發布結果；改上限、重選、移除、取消、新工作、清空、pagehide 都先同步撤下下載並 revoke。Ready 沒有自動過期 timer。
- 核心：[validation.js](public/js/core/validation.js)、[planner.js](public/js/core/planner.js)、[zip-store.js](public/js/core/zip-store.js)、[index-schema.js](public/js/core/index-schema.js)。精確 ASCII parser、NFC／JavaScript lowercase collision、硬上限、stable FFD、STORE／CRC／offset、exact schema 和 UTF-8 newline 索引；錯誤零部分輸出。
- 工具鏈：[assets.mjs](scripts/assets.mjs)、[serve.mjs](scripts/serve.mjs)、[check.mjs](scripts/check.mjs)、[build.mjs](scripts/build.mjs)、[run-stage.mjs](scripts/run-stage.mjs)、[capture-evidence.mjs](scripts/capture-evidence.mjs)。固定 public allowlist、拒絕 link/junction／未知或 stale 資產；build 不刪未知輸出，只複製 public。serve 僅 127.0.0.1:4227、GET/HEAD、Host/route/MIME allowlist；本輪未啟動。
- 測試：[validation](test/validation.test.mjs)、[planner](test/planner.test.mjs)、[zip-store](test/zip-store.test.mjs)、[index-schema](test/index-schema.test.mjs)、[worker](test/worker.test.mjs)、[state-cleanup](test/state-cleanup.test.mjs)、[boundary](test/boundary.test.mjs)、[ui-contract](test/ui-contract.test.mjs)、[style-contract](test/style-contract.test.mjs)、[toolchain](test/toolchain.test.mjs)、[independent STORE reader](test/helpers.mjs)。全部合成資料、離線，不開 port。
- 候選輸出：`dist/index.html`、`dist/en/index.html`、`dist/css/app.css` 及對應 8 個 JS。確切檔案 bytes／SHA-256 見 manifest。

## 實際執行與證據

| Gate | Node | npm test | npm run check | npm run build |
| --- | --- | --- | --- | --- |
| T00 | v24.14.0，exit 0 | 2/2，exit 0 | exit 0，5 assets | exit 0，5 assets |
| T10 | v24.14.0，exit 0 | 22/22，exit 0 | exit 0，10 assets | exit 0，10 assets |
| T20 | v24.14.0，exit 0 | 34/34，exit 0 | exit 0，11 assets | exit 0，11 assets |
| 最終 T30 | v24.14.0，exit 0 | **42/42，exit 0** | **exit 0，11 assets** | **exit 0，11 assets** |

以 Node 啟動已安裝 npm CLI 執行上述命令；本輪自行啟動的子程序明設 shell:false、windowsHide:true。完整 stdout/stderr／exit 分別在 [T00](evidence/m1/t00-commands.json)、[T10](evidence/m1/t10-commands.json)、[T20](evidence/m1/t20-commands.json)、[T30](evidence/m1/t30-commands.json)。最終 tests 562.4757 ms；不是 browser 測試時間。

四組長測試前後皆執行既有環境 guard，並與 [入場快照](evidence/m1/environment-before.json) 嚴格比對；全部 PASS／無 drift。User PATH：ExpandString、834 chars、0 ephemeral，SHA `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb`；Machine PATH：String、1227 chars、0 ephemeral，SHA `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8`。全 Environment-key 指紋分別為 `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a`、`a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82`；TEMP/TMP 的型別／長度／hash 也相同。詳 [最終 before](evidence/m1/t30-environment-before.json)／[after](evidence/m1/t30-environment-after.json)。沒有寫 persistent state、Git config、auth 或憑證。

`node scripts/capture-evidence.mjs`：exit 0；固定 43 個 source/spec 檔及 11 個 dist 檔，並輸出 3 組純假資料 ZIP＋索引（6 個證據檔）。ZIP 例證為 empty-a=100 bytes、single-x=109 bytes／CRC 8cdc1683、pair=180 bytes。這些是內部 review fixtures，沒有另建使用者交付壓縮包。

固定證據檢查第一次 exit 1：文件連結驗證早於其自己要產生的兩份報告，遇到 ENOENT，記錄於 [freeze-attempt-1](evidence/m1/freeze-attempt-1.json)。已修正產出順序為明確 PENDING 的報告目標，再驗連結和寫入最終結果；不修改 runtime/source 或既有 PASS 的測試輸入。最後狀態以 freeze-verification.json 為準。

**固定來源 SHA-256：`d5c4a4a622a05040c0ec228323b4c7bb609d7c8aaf46cf61841b780a4284d79f`**。算法為 `sha256-lines-v1`：依相對路徑排序，串接 `path<TAB>bytes<TAB>sha256<LF>` 再 SHA-256。範圍包含 package/.gitignore/public/scripts/test 與 13 份唯讀規格／docs，排除可變 HANDOFF/TASK-ENTRY/evidence 及 dist。詳 [逐檔 source/dist manifest](evidence/m1/source-manifest.json)、[fixture manifest](evidence/m1/fixture-manifest.json)、[交接檔案清單](evidence/m1/delivery-file-manifest.json)、[最終固定驗證](evidence/m1/freeze-verification.json)、[oracle 對照](evidence/m1/REVIEW.md)。

## 未驗項與限制

所有真 browser gates 保留 **NOT_RUN_USER_FOCUS_INCIDENT**：檔案選擇器／拖放、兩語導頁與輸入不跨頁、module Worker 載入與真 transfer、CSP 下 Blob 下載、實際 ZIP／JSON 下載、Tab／focus／live region、320px reflow、200% zoom、mobile／真機、Network／Storage、pagehide／BFCache。原生 file/save/print dialogs 也未驗。Node 的 DOM mock、Worker protocol、in-memory HTTP handler、CSS contrast 計算僅驗程式契約，沒有替代上述 gates。

來源總量最多 64 MiB／100 檔，單包上限最多 64 MiB 且包含 ZIP overhead；單一 64 MiB 原檔無法裝進 64 MiB ZIP，會全批拒絕。STORE 不壓縮、不切開單一檔、不支援 Zip64／目錄／密碼／上傳；FFD 不保證最少包數。郵件 MIME 編碼不在 ZIP cap 之內。Worker／Blob／transfer 仍可能需要數倍來源記憶體，未做真瀏覽器記憶體量測；取消和清空釋放本頁引用不等於安全抹除。索引包含檔名，分享時需自行留意。

例行選擇：重新選檔或拖放會取代整份目前清單，介面已明示；移除保留剩餘 sourceIndex，沒有重排。使用既有 Product App tokens，無外部字型／icon／runtime 資源。

下一步：主代理讀本固定來源、獨立重驗並處理必要 browser gates；之後再給本原功能對話具體 M2 放行。此輪不建立 GitHub、不部署、不動共用首頁；M3 由主代理處理。外部驗收尚未開始。

## 初始規格紀錄（保留）

入場時狀態：規格已準備，尚未實作／驗收／公開／部署；實作/Node/check/build=NOT_RUN、真瀏覽器/原生/真機=NOT_RUN_USER_FOCUS_INCIDENT、GitHub/正式網址/首頁=NOT_PUBLISHED、外部驗收=NOT_RUN。

原交接要求繼續適用：逐輪記錄需求、實際檔案、差異、命令與 exit、固定 bytes/SHA-256、未驗及限制；source/reviewed/released commit 分開，不刪歷史失敗、不把缺口改 PASS。使用者接受手動待驗不等於豁免必要 gate。

## 2026-10-23 追加：B20-RP-47 / M1B 離線發布準備

**M1B_OFFLINE_PREP_AWAITING_PRIMARY_REVIEW**。依本輪派送，M1 核心／CLI 已由主代理驗收；以上 M1 紀錄按歷史保留。本輪完成正式 SEO 的離線 release candidate，並不代表 browser gate 或公開上線通過。[M1B-RELEASE](M1B-RELEASE.md) 是最新完整重現／驗收入口。

實際 diff：package.json 新增 build:release/check:release，保留原四 scripts；新增 [release.mjs](scripts/release.mjs)、[release-policy.mjs](scripts/release-policy.mjs)、[release-html.mjs](scripts/release-html.mjs)、[run-m1b.mjs](scripts/run-m1b.mjs)、[capture-m1b.mjs](scripts/capture-m1b.mjs)、[release.test.mjs](test/release.test.mjs)、M1B-RELEASE.md、本輪 evidence/m1b，以及 release-artifacts 的 15 檔。test/style-contract.test.mjs 只把合成 fixture 移到 m1b 目錄；本 HANDOFF/TASK-ENTRY 只追加。`.gitignore`、既有其他 scripts/tests、13 份唯讀規格／docs 沒有改。public/dist/原 M1 evidence 合計 48 檔內容與成員不變。

候選 site root 是 `release-artifacts/site/`，包含原 11 資產＋_headers/robots.txt/sitemap.xml；[manifest](release-artifacts/manifest.json) 不在 site 內。預定 origin `https://file-bundles.glossquote.com`、toolSlug `file-bundler` 固定於程式，不接受 env／CLI override。HTML 僅 head 的 robots/canonical/hreflang 改動，body 與未部署文案維持 M1；其餘 Runtime 逐 byte 不變。原 public 無 headers，因此依 assets.mjs 的 CSP 及 pinned serve.mjs handler 六個安全 header 值生成，僅改 X-Robots-Tag，未 import/啟動 serve。此配置不是真實 hosting header 證據。

命令實績：targeted `node --test test/release.test.mjs` exit 0，39/39；最終 `node --version` v24.14.0 exit 0、`npm test` **81/81** exit 0、`npm run check` exit 0、`npm run build:release` exit 0、`npm run check:release` exit 0。完整 suite/check/build:release/check:release 只對固定實作跑一次，沒有重跑 preview build。`node scripts/capture-m1b.mjs` exit 0，49 source/spec、14 site／15 artifact 檔案。詳 [targeted](evidence/m1b/targeted-commands.json)／[final](evidence/m1b/final-commands.json)。負例都在 task-owned copy，涵蓋 wrong SEO/domain、source 改動、manifest＋asset 同改、missing/extra/tampered outputs、未知參數、Windows junction，無失敗／skip。

長測試前後 envguard 全 PASS／無 drift；[入場](evidence/m1b/entry-environment.json)、[final before](evidence/m1b/final-environment-before.json)／[after](evidence/m1b/final-environment-after.json)。User PATH=ExpandString/834 chars、Machine PATH=String/1227 chars，兩者 ephemeral entries=0；PATH hashes 與完整 Environment-key fingerprints、TEMP/TMP 與本文件 M1 記錄的值一致。本輪 [protected invariants](evidence/m1b/final-invariants.json) 確認 48 個 protected files 未改。

固定 M1B source hash：`e202bda39f4618bcba3ca5fc1d7932c746daa3862101b8944380e94948173d9f`；完整 artifact hash：`422ac6779ef7208e57888530b413726d987b7db3f9f5b21104d3d4afcd3182cf`；site hash：`71fb0dbdf3378a3f1e422604b81d6371d69c500ea84b61d47e6bd6b2abcb472c`；manifest hash：`3165fc51e9121414ded9d99fa97822b0ec37c6b4e354552acc282dd6f694453d`。範圍與逐檔 bytes/SHA 見 [source-artifact-manifest](evidence/m1b/source-artifact-manifest.json)。舊 M1 全體 source hash 僅作歷史基準，不改寫成新 source 的 hash。

真 browser／視覺／下載／module Worker／Network/Storage／原生／真機／實際 hosting headers 仍 NOT_RUN_USER_FOCUS_INCIDENT。未使用 browser/CUA/IAB/CDP/native，未啟動 server、未安裝、未讀 secret、未改 Windows/Git/auth 持久設定；requested gpt-6.1-sol/max，backend 未獨立核實。沒有需要新增依賴或擴權的阻塞。下一步由主代理獨立驗證及安排必要 browser gates；M2 仍需具體放行，本輪不 GitHub、不部署、不加正式首頁、不另開對話／子代理。

## 2026-10-27 追加：M2A 發布準備完成／復工核對

**M2A_PREPARED_AWAITING_PRIMARY_REVIEW**。本節與 [M2A-RELEASE](M2A-RELEASE.md) 是最新狀態；以上M1/M1B表格按歷史保留，不回寫舊證據。

root提供並已核對的browser紀錄：isolated/b20-47-r1為44 PASS／16 NOT_RUN／2原harness FAIL；isolated/b20-47-cancel-r1為6 PASS／0 failures，Chromium145.0.7632.6。root已看320px成功圖；原兩FAIL是產品清空input FileList後的transport後置誤斷，v5與B完整ZIP/index bytes已排除。root授權繼續發布準備；沒有把原FAIL刪除、原r1重標全PASS或宣稱整批外驗完成。

實際source diff：新增 wrangler.jsonc、scripts/deployment-config.mjs、scripts/m2a.mjs、test/deployment-config.test.mjs；修改 scripts/check.mjs、release-html.mjs、release-policy.mjs、release.mjs、test/release.test.mjs；文件只新增M2A-RELEASE並追加本HANDOFF/TASK-ENTRY。package/.gitignore、Runtime JS/CSS、public/dist功能HTML與noindex/候選標語及舊M1/M1B evidence均保持不變，61個protected files逐byte核對。

配置嚴格綁定 glossquote-file-bundler、2026-10-24、唯一 file-bundles.glossquote.com Custom Domain、./release-artifacts/site、assets-only；workers_dev/preview_urls/send_metrics/observability/logs/invocation_logs/traces皆停用。build.command匹配既有 `node scripts/release.mjs build`。validator採canonical JSON subset，拒絕unknown/env/main/duplicate keys及不安全設定，不新增runtime Worker、依賴或權限。

改動前已完整保存15個舊release artifacts到evidence/m2a/previous-release-artifacts，舊聚合hash仍422ac6779ef7208e57888530b413726d987b7db3f9f5b21104d3d4afcd3182cf。新正式HTML只各移除指定候選span（中文61／英文60 bytes）；12個非HTML site檔全相同，另更新manifest。public/dist標語與preview noindex保留。

中斷前已完成的 [commands](evidence/m2a/commands.json)：Node v24.14.0 exit0；相關release/config tests **67/67** exit0、0 fail/skip；npm run check/build:release/check:release各exit0，後置envguard／protected-after皆留存。復工沿用這些未變輸入的結果，沒有重跑無關大型核心套件、preview build或browser。外層工具回覆未回收，沒有捏造wrapper exit；完整五個子命令exit收據可核對。

復工 `m2a seal` 與 `verify-resume.mjs` 各exit0，驗53個source/spec、目前15／舊15個artifact、61個protected files；沒有source/config在commands log後改寫，環境前後fingerprints相同。詳 [source-set](evidence/m2a/source-set.json)、[resume-integrity](evidence/m2a/resume-integrity.json) 及 [環境入口](evidence/m2a/environment-entry.json)／[復工前](evidence/m2a/environment-resume-before.json)／[復工後](evidence/m2a/environment-resume-after.json)。

固定source-set SHA-256：`09a6767793ade734e5adf6f02595a354bab25a2f6993209dd0241777d8a1ac0c`；artifact SHA-256：`6f9175c3e5a83dac4944b842ee0de5a1cebe85e1586fa81548b2b410b14a014e`；正式manifest SHA-256：`ec2021a4b64b38044f2684135dcf40b47c07517838ba12c74abf5940bfcaa91a`。

AT／原生／真200%／20分鐘Ready／製造private晚訊息等保留NOT_RUN；新配置未做Wrangler CLI/schema、API／正式hosting實驗。owner本輪未開browser/native/server、未委派、未讀憑證或改Windows/Git/auth。GitHub/deploy<LOCAL_USER> M2A審查後再具體放行M2B；沒有核心修改或新增權限的阻塞。

## 2026-10-27 追加：M2A 正式入口 `_redirects`

**M2A_ENTRY_REDIRECTS_READY_FOR_PRIMARY_REVIEW**。root指出html_handling:none的根入口行為後，已按共享首頁既有格式只為正式產物新增三條301（`/`、`/en`、`/en/`）至各自canonical index.html，真LF共65 bytes。只改scripts/release.mjs及test/release.test.mjs；preview/public/dist、Runtime、wrangler配置、CSP與原14個site檔逐byte不變。新正式manifest覆蓋_redirects，site15檔／artifact16檔。

上一個M2A十五檔完整hash副本已在evidence/m2a-entry-redirects/previous-release-artifacts保存，聚合hash仍6f9175c3e5a83dac4944b842ee0de5a1cebe85e1586fa81548b2b410b14a014e；原M1/M1B/M2A證據沒有覆寫。新release55/55 tests、npm run check/build:release/check:release全部exit0，未重跑已過browser／核心大型或未變config suite。前後envguard一致，90個protected files未改。

固定source-set：`8e7c7ea1bc55d62ad7afe198359347aacb727694df1d04a76590b43cc99229bb`；artifact：`14d3158a6702d677574299480ef972bbfeb82067262dcce989680b285c97b4b2`；manifest：`7bfaadd07f9e7d3ca9bab9006495b60b1c77049e3c03e81624f4a1a52c69dc99`。詳 [入口補充](evidence/m2a-entry-redirects/README.md) 與 [source-set](evidence/m2a-entry-redirects/source-set.json)。

真實hosting轉址尚未驗，人工/AT/原生/真200%/20分鐘/private晚訊息NOT_RUN維持。無browser/桌面/native/server、無新依賴、無憑證／持久Windows/Git設定變更或委派；未GitHub/push/deploy<LOCAL_USER>


## 2026-10-27 追加：B20-47-M2B 公開來源發布

**SOURCE_PUBLISHED_VERIFIED**。本節是最新來源狀態；歷史 M1/M1B/M2A 的未發布紀錄按當時狀態保留。[公開 repository](https://github.com/KYStr/glossquote-labs-file-bundler) 已驗 PUBLIC；source/remote commit `5443cb3443118f195ba19083872999b199a01402`，default branch `codex/source-publication`。hosting/首頁仍未於此階段部署／修改，released hosting commit 尚無；外部驗收待後續完整 release，不能視為整款完成。

使用已審查 independent publishing copy，共53個tracked檔：原始 public、8個必要build/check/serve/release腳本、13個test/helper、package/wrangler、必要規格/設計/隱私文件、6個純合成ZIP/index與公開說明。原本runtime/tests/specs逐byte未改；排除內部操作指令／driver、raw evidence、.runs/scratch/node_modules、生成dist/release與任何帳戶機密資料。詳 [發布計畫](evidence/m2b/publication-plan.json)、[逐檔 bytes/SHA/commit 清單](evidence/m2b/tracked-inventory.json) 和 [publication receipt](evidence/m2b/publication-receipt.json)。publishing-copy及clean-clone絕對位置已記在receipt。

publishing copy及GitHub全新clone均用Node v24.14.0執行check、build、build:release、check:release，全exit0；無npm install。遠端commit與clone HEAD一致，11 preview／16 release產物正確。manifest SHA-256仍 `7bfaadd07f9e7d3ca9bab9006495b60b1c77049e3c03e81624f4a1a52c69dc99`，artifact聚合仍 `14d3158a6702d677574299480ef972bbfeb82067262dcce989680b285c97b4b2`。保留既有55/55及root browser證據，沒有為出版重跑未變大型產品suite／browser；所有test及必要imports完整納入。

發布前後既有Git settings guard及Windows environment guard相同；HKCU/HKLM PATH registry type/length/hash、ephemeral count0、完整Environment-key及TEMP/TMP指紋無漂移。既有CLI auth僅內部使用，無讀取credential值、auth設定或持久Windows/Git設定變更。全部子程序shell:false/windowsHide:true；沒有browser/desktop/native/dialog/clipboard、部署／首頁／委派／另ZIP。原53 frozen source/spec及90 protected歷史檔案保持。

一次publication-only掃描把原test中合成的C:/outside拒絕；已保留失敗記錄，僅允許該exact負例後續行，未修改產品、刪測試或覆寫舊證據。AT／真機／OS chooser-save-print-clipboard／真200%／20分鐘Ready／private晚訊息NOT_RUN維持；actual hosting headers/redirects未驗。完整 [M2B交接](evidence/m2b/README.md)。下一步由root整合既有證據及後續live release；本輪來源發布範圍已完成。

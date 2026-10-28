# 箱內排列容量試算交接

## 目前：M2-R2 favicon 修正已驗收並公開來源（2026-10-19）

主代理已審核 favicon/CSP/build/baseline 差異，並於真正隔離的 station-v3 執行 focused R2：**2/2 PASS、0 FAIL、禁止事件 0**；亦回報 final candidate `node --test --test-isolation=none test/*.test.mjs` **61/61 PASS**，再明確 GO 公開來源。原功能對話未執行 Browser／OS UI。本節為最新狀態，下方 2026-10-18 內容保留為歷史。

公開 repository：[KYStr/glossquote-labs-box-fit](https://github.com/KYStr/glossquote-labs-box-fit)，**PUBLIC**，default branch `codex/m2-release`。最新固定 commit **656c203db0430daadc46d28581c5de8dce1ea06d**，parent **cc9e23ddcaae09d5a4d5423c305458c86cafb5e2**；ls-remote 與 GitHub commit API／tree 均已核對一致。只提交已驗收的 **34 個來源檔**；這次發布沒有改 runtime/build，也沒有重新解釋 oracle。

新 [source ZIP](../../.runs/box-fit/20261019-m2-r2-publication/glossquote-labs-box-fit-source.zip) **48463 bytes**，根目錄為 package.json，無包裝層；SHA-256 **bd0dda9c05ce4fccabe37d2a297b7c607c1caa9b50c90dfef1b4918e27630bab**。ZIP 路徑／檔案型別／CRC32／bytes/SHA、全部 34 Git blobs 與 reviewed candidate 一致。[精確來源清單](../../.runs/box-fit/20261019-m2-r2-publication/committed-source-manifest.json) SHA-256 **57cf8034e958e375d4140bd41c78e46284f03dd88e8364e073896227251d8d3c**。

由固定 ZIP 解出的乾淨副本完成全部六個 gates，exit 0：test **61/61**、check、build、build:production、check:production、release:check（**35** 筆 offline loopback HTTP probes）。12 個 production assets 與 root 已驗收 R2 bytes 完全相同；production manifest SHA-256 **5da301f4338e75ca661a12704b81c6f8e1a79f5e18d617a196bd9c8f21bee284**。核心、app/bootstrap、CSS、兩語 body、原 M1 hash 基線未變；原 21 個本地 dist/production files、cc9e 固定 ZIP／manifests 和服務皆保留。

瀏覽器範圍：R1 歷史結果維持 **100 PASS／2 FAIL／6 PARTIAL／9 NOT_RUN**，兩個 B16 FAIL 不回寫或刪除。主代理只讀重算既有 R1 audit：每語 **280 requests、68 Storage checkpoints** 的非 Console 條件通過；共 **114 個 Console errors（每語 57）** 全是原 data:, favicon CSP 錯誤。這是既有證據重審，不是新瀏覽器執行。

Focused R2 僅 **2 PASS（每語 1 case、7 requests）**，支持本次狹窄 favicon/CSP 修正及來源發布；**完整 B16 R2 沒有重跑，不能標 PASS**。保留原 6 PARTIAL／9 NOT_RUN，原生縮放／真機／AT／初始化時序等未驗項不升級。已封存交接中 browserScope.priorB16FailuresReplacedByPrimaryFocusedPass 的用語以 [browser scope addendum](../../.runs/box-fit/20261019-m2-r2-publication/BROWSER-SCOPE-ADDENDUM.md) 為準；原 manifest／JSON／R1 結果保持不變。

Git 設定 guard 於 local-commit 與 push blocks 前後均 PASS，四份 known-config snapshots 一致；Windows 完整 Environment guard 前後一致。沒有 global/system Git 或 gh auth setup/login/refresh、憑證讀取、persistent environment／PATH 變更。完整 [發布交接](../../.runs/box-fit/20261019-m2-r2-publication/HANDOFF.md) 與 source-publication.json 留存確切命令和 hash。

**M3 hosting／homepage／live acceptance 由 root 後續執行，本對話未部署。尚未進入 awaiting external review，未標 complete。** 本地 HANDOFF 狀態更新不回寫固定公開 commit／ZIP；新的交付外層 ZIP 由 root 統一整合。



## 2026-10-18 歷史：M2 來源／工具鏈已通過主代理驗收

候選 **BOXFIT-M2-20261018-R1** 的 **M2 來源／工具鏈已通過主代理獨立驗收**。本對話僅收尾 HANDOFF，不進入新 milestone；UI 維持 `NOT_RUN_USER_FOCUS_INCIDENT`。未做 Cloudflare、hosting 或首頁，未標 awaiting external review／complete。下方 M1 內容為原始歷史交接，現況以本 M2 區段為準。

### 主代理驗收確認（2026-10-18）

主代理親讀 production／build／server／headers／robots／tests，從固定 commit **cc9e23ddcaae09d5a4d5423c305458c86cafb5e2** 的 ZIP 獨立解出 31 檔，核對 Git blobs、GitHub PUBLIC／default branch／完整 commit；六項命令 exit 0、59/59 tests 通過，11 個 production assets 不含 manifest，Windows guards 一致。本地已讀結果狀態 **PASS_PRIMARY_SOURCE_TESTS_BUILD**，時間 **2026-10-18 09:16:31 +08:00**。

驗收證據：`.runs/new-tools-2026-10-18/33-primary/result.json` 與 `.runs/new-tools-2026-10-18/33-fixed-gate-run/`。這是主代理獨立證據，本對話未重跑或冒稱新的 UI 驗證。**M3 必要的正式核心流程仍待真正隔離環境**，不是本次 M2 通過所涵蓋的驗收。

此次只更新本地 HANDOFF；公開 commit、source ZIP、production assets 及原有固定 manifests 均保持不變。M2 完整本機 source manifest 保留為先前封存時的快照，不追寫或新增自我引用 commit。

### M2 修改與 M1 不變性

新增 `wrangler.jsonc`、`release/m1-public-hashes.json`、`release/PUBLIC-README.md`、`scripts/build-production.mjs`、`scripts/check-production.mjs`、`scripts/preview-production.mjs`、`scripts/release-check.mjs`、`scripts/lib/production.mjs`、`scripts/lib/headers.mjs`、`scripts/lib/robots.mjs`、`scripts/lib/production-server.mjs`、`scripts/lib/release-http.mjs`、`test/production.test.mjs`。更新 `.gitignore`、`package.json`、`scripts/check.mjs`、`scripts/lib/files.mjs`（加入 XML MIME），以及本地狀態文件 README／TASKS／TASK-ENTRY／project／HANDOFF／RELEASE-CANDIDATE。未改 PRODUCT／TECHNICAL／ACCEPTANCE oracle 或根／其他工具／共用設定。

**M1 八個 public 檔案 SHA／bytes 全部不變**，由 `release/m1-public-hashes.json` 在正式工具鏈強制核對；production 只變更兩頁 head，body 逐 byte 相同，CSS、app、bootstrap、core、404 完全相同。`dist/manifest.json` 仍為 SHA **2da136470d386ed824bb8b381b5f13d4c7409fd06cb77ae2257870c8298f8ab1**。證據：M2 evidence 的 `m1-bytes-comparison.json`。

production 只在 `dist-production/` 生成 11 個 asset/control 檔；manifest 為旁邊的 **`dist-production.manifest.json`**，不放進部署 asset directory。兩個 canonical 都 index,follow、自身 canonical、互返 zh-Hant/en/x-default；OG 與可見文案一致。各 JSON-LD script body 的精確 SHA-256 加進對應 CSP。`_headers` 真正合併的測試包含全域 noindex／局部 index 衝突，正式頁先 `! X-Robots-Tag`，CSP 亦先移除繼承值，正式 response 不累積 noindex 或多份 CSP。

robots 使用全域 deny 及明確的 canonical／redirect／CSS／JS／robots／sitemap allow，實際套用 longest-match、allow tie、$ anchor、大小寫及所需 core import asset；非公開來源被拒。sitemap 僅兩個正式 canonical。`_redirects` 將 /、/en、/en/ 導到固定正式 canonical。404 不回成功畫布，控制檔與 manifest 不當成網站內容。HTTP 模型採精確路徑，包含 query 的本機路徑回 404；CDN 真正 query／平台行為須主代理 live 驗收，沒有把本機模型冒稱 Cloudflare。

wrangler.jsonc 為純 JSON、精確 worker `glossquote-box-fit`、date 2026-10-18、assets ./dist-production、html_handling none、not_found_handling 404-page、custom domain boxfit.glossquote.com；workers_dev／preview_urls／send_metrics／observability.enabled／logs／traces 全 false。無 main、binding、secret、runtime package。沒有呼叫 Cloudflare／Wrangler、讀 token 或安裝工具。

### M2 實際 gates

Node **v24.14.0**，執行檔與 npm 路徑沿用 M1 已安裝版本，零外部套件。工作目錄是本工具；乾淨副本另位於本次 evidence 的 `clean-source/`。

| 命令 | 本機 exit | 從固定 ZIP 解出乾淨副本 exit |
|---|---:|---:|
| `& 'C:/Program Files/nodejs/npm.cmd' test` | 0，**59 pass／0 fail／0 skip** | 0，**59 pass／0 fail／0 skip** |
| `& 'C:/Program Files/nodejs/npm.cmd' run check` | 0 | 0 |
| `& 'C:/Program Files/nodejs/npm.cmd' run build` | 0 | 0 |
| `& 'C:/Program Files/nodejs/npm.cmd' run build:production` | 0 | 0 |
| `& 'C:/Program Files/nodejs/npm.cmd' run check:production` | 0 | 0 |
| `& 'C:/Program Files/nodejs/npm.cmd' run release:check` | 0，34 筆實際 loopback HTTP | 0，34 筆實際 loopback HTTP |

M2 evidence 的 `npm-*-final.txt`、`clean-npm-*.txt`、`clean-gates.json` 留命令輸出；`commands.json` 留精確 cwd／exit。新增 11 個測試覆蓋 production metadata、M1 body 不變、header merge/removal、robots 真正 longest-match、redirect、安全 manifest／未知檔／stale build 拒絕及實際 HTTP。manifest 位於 assets 外，讀寫前拒絕 link/hardlink，並有硬連結拒絕測試。

固定 production manifest SHA-256：**2995c5e2d5707f701e0fc5d6a412a387ba5d60736c86317c7f4689d93e6fb636**。M2 evidence 的 `production-manifest.json` 為固定複本，`preview-manifest.json` 為 M1 preview 複本。乾淨 ZIP build 與兩份候選 manifest 均逐 byte／SHA 相符。

### PUBLIC 來源、commit 與封存

- Repository：**https://github.com/KYStr/glossquote-labs-box-fit**，GitHub metadata 驗證 visibility **PUBLIC**、isPrivate **false**。
- 固定 local／remote full commit：**cc9e23ddcaae09d5a4d5423c305458c86cafb5e2**。branch 與 default branch 均 **codex/m2-release**；git ls-remote 核對完整 SHA 相同。
- 獨立 local repository：`<LOCAL_WORKSPACE>/.runs/box-fit/20261018-m2-01a14c77/publishing-copy`。沒有從根 repository 推送，也未追寫 self-reference commit。
- Source ZIP：`<LOCAL_WORKSPACE>/.runs/box-fit/20261018-m2-01a14c77/glossquote-labs-box-fit-source.zip`，由固定 commit **直接 git archive**，**45,196 bytes**，**31 files**，SHA-256 **360575ae86b04404866c226f2e564efa2facfd6e75c1aadd8abd4e935320dce8**。根直接有 package.json／README，沒有包裝層目錄。
- 每檔 ZIP bytes 與 `git cat-file blob <commit>:<path>`、reviewed copy、publication manifest 全部相同；保留 git blob object IDs，ZIP comment 亦確認是該 commit。證據 `source-zip-verification.json`。ZIP 解出 `clean-source/` 後執行上表全部 gates。
- 31 個供公開檔案只含必要 source／test／config／公開 README／M1 runtime hashes，排除內部 AGENTS、HANDOFF、task/spec 作業文件、絕對工作路徑、.runs、證據、node_modules、generated dist。公開 README 從 `release/PUBLIC-README.md` 映射到根 README。逐檔清單及掃描結論見 `publication-manifest.json`，供公開檔案無內部絕對路徑或 credential-shaped material。
- 完整 GitHub、branch、commit／ZIP 結果見 `source-publication.json`；本地文件後續註記不改公開 fixed commit 和 ZIP。

### Guards、HTTP 模型、限制

publication 各 block 使用根既有 `git-settings-guard.mjs` capture／verify；local prepare、resume、publication 最後 block 的 known user/system Git config fingerprints 都不變。沒有 gh auth setup-git/login/refresh、Git global/system writes 或 persistent environment 變更。source Git 僅在獨立 copy 執行，hook/template 指到自建空目錄，fsmonitor／signing／interactive prompts 只以 process-local 或每次 git -c 關閉。既有官方 gh CLI auth 只用於正常 API／Git transport，未讀出或列印 credential。trace/debug 亦只在 child process 清除。

準備時保留了兩個已解決的 CLI 錯誤：第一個是 PowerShell culture 排序與 Git Ordinal 順序不一致，31 個檔案內容／集合相同，改為 Ordinal 核對；第二個是 script 切 cwd 後相對 Tee 日誌路徑失效，當時 repository 尚未建立，guard 重新 verify 後改用絕對日誌路徑及新 capture。沒有放寬 acceptance、重設 Git 狀態或修 authentication；最終 publication exit 0，完整失敗／成功記錄保留。

M2 environment guard 前後 **PASS，全部 Snapshots 完全相同**：HKCU ExpandString／834、HKLM String／1227，ephemeral 皆 0，PATH raw hashes、Environment-key fingerprints、TEMP／TMP 都與 M1 相同。完整 `environment-before.txt`、`environment-after.txt`、`environment-comparison.json`；Git guard baseline 與 verify log 同留 M2 evidence。

production HTTP 模型：**PID 82312**，`C:/Program Files/nodejs/node.exe scripts/preview-production.mjs`，cwd 本工具，WindowStyle Hidden，只綁 **127.0.0.1:5213**，不啟動任何 UI。M1 preview **PID 70996**／4213 保留。`production-model-process.json`、stdout／stderr、`production-http-5213.json` 有固定 5213 的 34 筆 GET/HEAD、MIME、security、SEO、CSP、redirect、真 404、405、host 核對；這是本機模型，**不是 Cloudflare release 證據**。

M2 全程沒有任何 UI 呼叫或 automation 子程序，也未恢復／關閉／調查 IAB 分頁。既有未變 M1 UI 證據依主代理 GO 保留；全部後續 UI、原生 zoom、真機、AT、完整 Network/Storage、真 BFCache、離線冷啟動仍為 **NOT_RUN_USER_FOCUS_INCIDENT**。hosting／homepage 未開始，來源公開與 live release 分開。主代理已通過固定 M2 source／production 工具鏈驗收；M3 正式核心流程仍待真正隔離環境，本對話只收尾、不進新 milestone、不部署。

M2 完整本機 source manifest 為 `.runs/box-fit/20261018-m2-01a14c77/source-manifest.json`，摘要 `source-manifest.sha256`；內含本地交接文件，**不屬公開 source ZIP**。本次變更比較 `changes-from-baseline.json`，最終 closure／commands／guards 摘要在同目錄。

## M1 歷史交接（由上方 M2 現況取代）

候選：**BOXFIT-M1-20261018-R1**。本機實作與 CLI gates 已完成，**待主代理獨立驗收；所有 UI 操作因使用者焦點事件暫停**。未收到 M2 GO。來源未公開、無 production 產物、未部署、未整合首頁、未交付外部驗收。本紀錄不代表整個公開交付完成。

## 範圍與實作

M1 只修改本工具資料夾和 `.runs/box-fit/20261018-m1-01a14c77/`。根專案原有修改、其他工具、共用設定／規格／deployment scripts 均未編輯。沒有再委派、套件安裝、憑證讀取、Git 設定寫入或來源發布。

完成繁中 `/index.html` 與英文 `/en/index.html` 靜態 Product App 工作畫布。箱內尺寸、單件尺寸、相鄰間隙和六種固定軸向比較依已審規格實作。七個 raw 字串維持 ASCII、長度上限 12；純核心用 BigInt 的 0.01 mm 整數運算。輸出 count 在已證明的安全整數界內轉 Number，total 保持完整十進位字串，occupied 固定兩位小數。並列採最早朝向，六列不去重；無解為 total 0、winner null、每層及層數 0、occupied null。

所有 input 無 name，HTML controls 初始 disabled；同步 head bootstrap 的第一個 submit capture 動作是 preventDefault。初始化完成才啟用，故障時保留固定雙語提示。每次輸入／旋轉變更同步移除舊結果。自訂 HTML dialog 處理清除及語言切換；取消保留原值和結果，確認清空。pagehide 與 persisted pageshow 清理全部輸入和結果。沒有 copy、download、report、clipboard、storage、URL／history 寫入、遙測或外部資源。

介面沿用 family ink/paper/acid/surface tokens、系統字型及平面 worksheet；尺寸群組、主操作與比較表構成工作區。320 CSS px 下只有有名稱的表格容器局部水平捲動，大數字換行，並列與無解有文字標示。原有 PRODUCT／TECHNICAL／UX-SEO／ACCEPTANCE oracle 保持原樣；其 M0 表頭是規格制定時的歷史狀態，實際進度以本交接為準。

## 實際修改檔案

新增：`.gitignore`、`package.json`、`public/index.html`、`public/en/index.html`、`public/404.html`、`public/robots.txt`、`public/css/app.css`、`public/js/bootstrap.js`、`public/js/app.js`、`public/js/core/calculate-box-fit.js`、`scripts/check.mjs`、`scripts/build.mjs`、`scripts/dev.mjs`、`scripts/lib/check-source.mjs`、`scripts/lib/files.mjs`、`scripts/lib/server.mjs`、`test/core.test.mjs`、`test/safety.test.mjs`。

既有文件更新：`README.md`、`TASKS.md`（只進度／放行狀態）、`TASK-ENTRY.md`（保留 M0 並追加 M1）、`project.json`、`HANDOFF.md`、`docs/RELEASE-CANDIDATE.md`。生成預覽為 `dist/` 八個靜態檔加 `manifest.json`，由 `.gitignore` 排除。逐檔 bytes／SHA 與基線差異另見固定 source manifest 及 `changes-from-baseline.json`。

## CLI 驗證

工作目錄：`<LOCAL_WORKSPACE>/tool-projects/33-box-fit`。Node 為已安裝的 `C:/Program Files/nodejs/node.exe`，版本 **v24.14.0**；npm 使用已安裝的 `C:/Program Files/nodejs/npm.cmd`。沒有 npm install。

| 最後候選命令 | 結果 | 證據檔（evidence directory 下） |
|---|---|---|
| `& 'C:/Program Files/nodejs/node.exe' --version` | exit 0，v24.14.0 | `commands.json` |
| `& 'C:/Program Files/nodejs/npm.cmd' test` | exit 0，48 tests，48 pass，0 fail／skip | `npm-test-final.txt` |
| `& 'C:/Program Files/nodejs/npm.cmd' run check` | exit 0，8 public files、allowlist、noindex、disabled、safe API、syntax | `npm-check-final.txt` |
| `& 'C:/Program Files/nodejs/npm.cmd' run build` | exit 0，deterministic dist 預覽 | `npm-build-final.txt` |
| 根目錄執行 `& 'C:/Program Files/nodejs/node.exe' '.runs/box-fit/20261018-m1-01a14c77/verify-final-preview.mjs'` | exit 0，13 筆最終 HTTP／bytes／headers 核對通過 | `final-preview-http.json` |

C01–C30 以獨立手寫常數比對完整 schema；另涵蓋 raw 型別／格式、終端換行、getter 不執行、unknown/symbol/non-enumerable、descriptor precedence、反射 trap、輸入不突變、JSON-safe、最大 10^21 及有界性證明。工具鏈測試實際建立並拒絕 junction／hardlink／未知檔案，使用一次性 loopback port 測 MIME、HEAD、405、404、host 限制和精確路徑，無 SPA fallback。

初次 47-test 版本通過後，最後 code review 補上「prototype trap 自行 revoke Proxy，隨後 Array.isArray 也必須落在固定錯誤 catch 內」的邊界保護與獨立測試；最後 48 tests／check／build 重跑皆過。此修正只影響 hostile root reflection，不改 UI 或合法輸入結果。

## 雙語瀏覽器證據與限制

`browser-evidence.json` 保留 33 筆實際觀察／未驗紀錄，screenshots 在同一 evidence directory。使用 task-owned IAB tabs 1、2、3，建立時均 visible:false；未使用 native app、桌面或 OS 輸入 API。**事後已證實此測試路徑仍有使用者焦點／輸入法干擾風險，不以 hidden 作安全保證。**

| 案例 | 已有證據 | 仍未驗／後續狀態 |
|---|---|---|
| B01 | 兩語初始六欄空白、gap 0、rotation true、無結果；source 初始 disabled／無 name | 最終獨立重播為 NOT_RUN_USER_FOCUS_INCIDENT |
| B02 | 兩語故障 fixture 令必要 DOM id 缺失；實際 app catch 保持 controls disabled，雙語固定提示；QA requestSubmit 由原 bootstrap 同步阻擋、網址不變 | 完全停用 JS 的獨立操作未做；已驗規格允許的初始化失敗替代路徑 |
| B03–B05 | 兩語 C01=36、每層 12／3 層；C02 六列、40、WHL 首列／HWL 並列；C04 六列無解及 occupied 不適用 | 最終獨立重播為 NOT_RUN_USER_FOCUS_INCIDENT |
| B06 | 英文 C12 完整 1000000000000000000000，320 CSS px 不水平溢位 | 其他 UI 重播為 NOT_RUN_USER_FOCUS_INCIDENT |
| B07 | 繁中 gap 0.5 得 18、3×3×2、occupied 10×7×4.50；文案無箱壁 padding | 英文額外 gap 操作為 NOT_RUN_USER_FOCUS_INCIDENT |
| B08–B09 | 兩語逐七欄錯誤定位／修正；繁中七欄及 rotation 修改後結果同步清空，英文 rotation 同樣清空 | 後續 UI 為 NOT_RUN_USER_FOCUS_INCIDENT |
| B10–B12 | 兩語清除及語言切換取消完整保留、確認回初始；初始清除／切語言不詢問。另驗 gap raw 0.0 與 rotation false 需確認 | 後續 UI 為 NOT_RUN_USER_FOCUS_INCIDENT |
| B13 | 實際 viewport 320×740 CSS px；兩語整頁 scrollWidth 305（含 15px 垂直 scrollbar），表格 clientWidth 237／scrollWidth 912；ArrowRight 局部 scrollLeft 40、焦點在具名稱 region | 原生 200% zoom 為 NOT_RUN_USER_FOCUS_INCIDENT；沒有適用隔離 API |
| B14 | DOM 小數點輔助將 105 變成 10.5，selectionStart/End=3，焦點還給原欄 | 真機 decimal keyboard 為 NOT_RUN_USER_FOCUS_INCIDENT，無真機 |
| B15 | 一次性 fixture origin 已停止，CLI 確認 ECONNREFUSED | 接下來的 UI 輸入出現非測試字元即停止；已載入離線、browser offline mode、離線冷啟動均 NOT_RUN_USER_FOCUS_INCIDENT，不宣稱通過 |
| B16 | 靜態 API 掃描與本機 HTTP gates 通過 | 完整 Network/Storage 為 NOT_RUN_USER_FOCUS_INCIDENT；現有介面亦無完整紀錄能力，靜態掃描不等同 runtime 證明 |
| B17 | 兩語 meta noindex,nofollow、無 production canonical／alternate／JSON-LD／sitemap，同語正式首頁 href 保留；最終 HTTP headers 核對通過 | 無正式站驗收 |
| B18 | 明確標示的 synthetic persisted pagehide／pageshow 在實際瀏覽器觸發原 app handler，輸入／結果／rows 清空 | 真 BFCache 為 NOT_RUN_USER_FOCUS_INCIDENT；合成事件不是 BFCache 證據 |
| B19 | 鍵盤 Enter 提交、錯誤 focus／aria-describedby、caption／scope、有名稱可聚焦局部表格、文字並列與無解 | AT／螢幕閱讀器為 NOT_RUN_USER_FOCUS_INCIDENT，未使用原生 AT |
| B20 | source 無 input name／URL／storage／export；兩語確認導航實際回空白 | 獨立 reload／完整 runtime persistence 重驗為 NOT_RUN_USER_FOCUS_INCIDENT |

常用影像：`zh-desktop-c02.png`（fullPage 工具輸出下段有空白，只作已繪製區證據）、`zh-320-c02-table.png`、`en-320-initial.png`、`en-320-c02-table.png`、`en-320-c12.png`、`en-init-failure.png`。沒有事件後的新截圖。

故障 fixture 只在 `.runs/.../browser-fixture-server.mjs`，原始八個 public 檔不含 QA 按鈕或測試入口。故障頁只改測試副本 DOM id，synthetic lifecycle fixture 額外觸發標示清楚的事件。兩個 fixture 的原 public compact manifest SHA 是 `a4b399f059b61296aae2368ed6d8fc4c15bdd6ddb04e0eba3f8f760eb079e63f`。最後 hostile-Proxy 修正後 public compact SHA 為 `2d5c7543591eadd202270056add4d2b951c30fb6431c343bb158ad5afd7a8eb1`。UI 檔案未變、全部合法核心 oracle 在最後版本重驗通過；**事件限制下未對最後核心 bytes 再做瀏覽器重播**，由主代理決定後續安全驗收。

## UI 焦點事件：立即停止紀錄

先前部分 locator 操作曾出現命中位置／原字串未完整替換的異常；改用逐欄唯讀核對後，已完成上表可確認案例。最後一次已載入頁面的離線試驗，在 `boxLifeTab.playwright.locator(...).fill()` 後出現非 fixture 字元，原對話停止所有瀏覽器輸入，沒有把這段非測試文字寫進證據。最後實際 UI 讀取為 `boxLifeTab.getAXState()` 與唯讀 `playwright.evaluate()`；其後一次 cua_repl 只以 Node fs 保存已收集紀錄，沒有 UI 呼叫。

工具沒有直接 UI call 時間戳；可確認最後實際 UI **早於 2026-10-18 08:59:07.3106771 +08:00**，這是 browser-evidence.json 原始寫入時間上界，不能當作精確操作時間。詳見 `ui-focus-incident.json`。收到主代理緊急協調後，無任何 browser/native/computer 操作，包括讀取、fill/click/press/resize/screenshot/導航；未為調查重新呼叫 UI，未關閉任何分頁／視窗或使用者程序。沒有 pending UI call，也未啟動 UI automation 子程序；目前只有以下靜態 Node 預覽服務。所有後續 UI gates 均 NOT_RUN_USER_FOCUS_INCIDENT，等待主代理重新通知。

## 服務與固定候選

- 保留服務：**PID 70996**，executable `C:/Program Files/nodejs/node.exe`，arguments `scripts/dev.mjs`，cwd 為本工具資料夾，WindowStyle Hidden，僅 **127.0.0.1:4213**。它只服務固定靜態資產，不自動啟動 UI。啟動紀錄 `preview-final-process.json`、stdout／stderr。
- 第一個 task-owned preview PID 42128 在最後核心修正後，以 PID／executable／commandLine／loopback listener 核對身分後換成最終產物服務；未停止其他服務。一次性 fault-init PID 53124（61789）、lifecycle PID 76352（61790）亦核對身分後已停止，見 `fixture-cleanup.json`。
- `dist/manifest.json` SHA-256：**2da136470d386ed824bb8b381b5f13d4c7409fd06cb77ae2257870c8298f8ab1**。最後 HTTP 回應的八檔 bytes／SHA 與 build、source 一致。
- 完整固定來源：`.runs/box-fit/20261018-m1-01a14c77/source-manifest.json`，自身摘要見 `source-manifest.sha256`；不含 dist、evidence 或自身，避免循環。凍結副本見 `candidate-source/`，依固定清單逐檔核對。完整 build manifest 的複本為 `preview-build-manifest.json`。

## 環境、發布與待決

工作前後已執行使用者既有 environment guard，兩次 PASS，**完整 Snapshots 完全一致**，包括 PATH raw hash／type／length／ephemeral entries 及整個 Environment-key fingerprint／TEMP／TMP。

| Scope | PATH type | 長度 | PATH SHA-256 | ephemeral | Environment-key SHA-256 |
|---|---|---:|---|---:|---|
| HKCU | ExpandString | 834 | 3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb | 0 | 3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a |
| HKLM | String | 1227 | 52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8 | 0 | a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82 |

`environment-before.txt`、`environment-after.txt`、`environment-comparison.json` 留完整證據。既有重複 PATH entry 未改動。M1 沒有 publication block，因此 Git settings guard 不適用且未做任何 Git／gh 認證設定或公開來源操作。

待主代理：處理使用者焦點事件及安全 UI 路徑，再決定必要 UI 重驗／M1 獨立驗收和明確 M2 GO。沒有產品算例矛盾、缺少依賴、費用、憑證或未知持久環境漂移。真機、原生縮放、AT、完整 Network/Storage、真 BFCache、實物裝箱沒有通過證據；模型估算不保證實物可放。M2／M3／外部確認均尚未開始。

## 原始 M0 交接（歷史保留）

SPEC_ONLY，沒有實作/測試/公開/部署。回報修改檔案、命令與exit、固定manifest、瀏覽器證據、guards、NOT_RUN/風險。原chat尚未建立。

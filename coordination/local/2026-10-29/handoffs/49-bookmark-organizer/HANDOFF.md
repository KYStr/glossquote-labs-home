# 書籤匯出整理 — B20-49-M1 交接

2026-10-23（Asia/Taipei）。候選 ID：**B20-49-M1-2026-10-23-r1**。M1 實作及離線 CLI gates 已通過，交主代理獨立審核。這是本機雙語候選，不是完整 browser 驗收、已公開網站或已部署產品。

| 範圍 | 實際狀態 |
| --- | --- |
| 兩語實作／Node 核心與控制器呼叫探針 | PASS_NODE_ONLY，30 tests / 30 pass / 0 fail / 0 skipped |
| check / build | PASS，17 public 檔案語法／靜態檢查，17 dist 檔案與 public bytes 相同 |
| 合成 HTML／JSON 實體產物內容 | PASS_NODE_ARTIFACT_CONTENT，來源 5 筆、HTML 4 筆、JSON 5 筆 |
| Windows Environment 前後完整 Snapshots | PASS_UNCHANGED；所有 guard JSON Status=PASS |
| 真 browser／native／真機／渲染可及性 | NOT_RUN_USER_FOCUS_INCIDENT |
| 真 HTTP server smoke | NOT_RUN_TASK_CONSTRAINT_NO_SERVER；只做離線 handler unit calls |
| GitHub／hosting／首頁／正式 SEO | NOT_RUN_M1_ONLY，未進 M2/M3 |
| 外部驗收 | NOT_RUN |

## 實際結果與差異

支援受限 Netscape UTF-8 匯出：bounded tokenizer、wrapper／attributes／entities allowlist、全檔拒絕、來源序號、原／目前路徑、exact HREF 分組、最早 keeper 提示。沒有 DOMParser 或輸入 HTML 插入。

兩語獨立頁接上 worker 與完整清單／資料夾樹、搜尋／檢視篩選、手動 keeper、逐筆與群組排除確認、移動現有／新路徑、原子資料夾更名。確認區顯示數量及來源序號／網址。所有輸入以文字／表單值呈現，書籤不是連結。

真正的 HTML writer、JSON 備份及 Blob 下載 handler 均已實作。未操作時全部納入；排除項仍留在 JSON。title decode 一次、HTML escape 一次，惡意標題仍是字串。編輯清掉舊 Blob／URL；取消／重設／重選／pagehide 清來源、樹、編輯表單及 URL；過期 worker／read 無法復活結果。Ready 沒有自動期限。

本次僅新增或更新以下檔案群組：

| 檔案 | 數量／內容 |
| --- | --- |
| package.json、.gitignore | 2：private ESM、Node>=24、四個固定 scripts、無 dependencies |
| public/index.html、public/en/index.html、public/css/app.css | 3：完整雙語、noindex、兩語 FAQ、家族 tokens 與響應式來源 |
| public/js/app.js、ui.js、copy.js、parse-worker.js | 4：控制器、純文字 renderer、完整兩語錯誤、worker protocol |
| public/js/core/ | 10：errors、utf8、entities、tokenizer、parser、urls、organizer、export-html、export-json、session |
| scripts/ | 7：files、serve、check、build、verify、evidence、freeze（均 .mjs） |
| test/ | 10：8 份 .test.mjs，加 fixtures.mjs、ui-probe.mjs；全為離線合成資料 |
| dist/ | 17：public byte-equal 生成複本 |
| TASK-ENTRY.md、HANDOFF.md、evidence/m1/** | 決策、實際命令／輸出、oracle／產物、完整環境快照、固定 bytes/SHA 清單 |

共 36 個 package／public／scripts／test 來源檔；六份規格、AGENTS、docs 及其他工具／共享路徑沒有由本任務修改。工具資料夾在開始時為根 repo 的 untracked 準備資料，沒有把它當作已提交差異。

## 實際命令與 exit

所有 npm 命令以現有 `C:/Program Files/nodejs/node.exe` 執行同安裝的 npm-cli.js；runner 所有 child 都是 shell:false、windowsHide:true。沒有 npm install。dev 腳本存在但沒有執行。

| 階段／命令 | exit | 結果 |
| --- | --- | --- |
| T00 node --version / npm test / npm run check / npm run build | 各 0 | Node v24.14.0；1 test；4 public/dist 檔 |
| T10 同上四個命令 | 各 0 | 11 tests；12 public/dist 檔 |
| T20 同上四個命令 | 各 0 | 23 tests；17 public/dist 檔 |
| T30 首輪同上四個命令 | 各 0 | 30 tests；17 public/dist 檔 |
| 最終 T30 同上四個命令 | 各 0 | 30 pass / 0 fail / 0 skipped；17 public/dist 檔 |
| node scripts/evidence.mjs | 0 | 寫出合成產物、讀回並以手寫預期驗內容與 SHA-256 |

最終碼的命令參數、exit、elapsed 與完整 stdout/stderr：[commands.json](evidence/m1/t30-rerun-1792741190919/commands.json)、[test](evidence/m1/t30-rerun-1792741190919/npm-test.txt)、[check](evidence/m1/t30-rerun-1792741190919/npm-run-check.txt)、[build](evidence/m1/t30-rerun-1792741190919/npm-run-build.txt)。再次執行 T30 是因確認區、資料夾索引及證據腳本新增，先前 passing logs 全部保留。

`check-persistent-environment.ps1` 在 T00/T10/T20/T30 與最終較長 CLI 區塊前後執行。實際比較完整 Snapshots，涵蓋 PATH hash/type/length/ephemeral entries、整個 Environment-key fingerprint、TEMP/TMP fingerprint：[environment-comparison.json](evidence/m1/environment-comparison.json)。HKCU PATH ExpandString / 834 字元 / ephemeral 0；HKLM PATH String / 1227 字元 / ephemeral 0；前後完全相同。

保留的外層失敗：T00 兩次 guard wrapper exit 1，原因是 `$LASTEXITCODE` 為空時的比較，guard JSON 本身 PASS；改成讀 JSON Status／完整 Snapshots 後比較 exit 0。沒有還原或寫入任何系統值，詳細見 [guard-wrapper-history.json](evidence/m1/guard-wrapper-history.json)。產品必要 gates 沒有未解決 FAIL。

## 實體產物與固定來源

以下都是合成資料，並非真 browser 下載證據：

| 檔案 | bytes | SHA-256 |
| --- | ---: | --- |
| [synthetic-input.html](evidence/m1/outputs/synthetic-input.html) | 434 | 80af3e22bc73f51f6359cb9f8d7d7f58c5027031e1ec7c36285069176c5e6b6f |
| [bookmarks-organized.html](evidence/m1/outputs/bookmarks-organized.html) | 623 | 2ade528d9d9d229371a151a487221ad3f68ac6b0d6dc9b2bc2336b3e00a472ef |
| [duplicate-report.json](evidence/m1/outputs/duplicate-report.json) | 2504 | 845a399abc65a614a140dd0e1fcfdd334dc7d76764c28939f416895e3d3da400 |

來源 5 筆，其中重複項 source 1 明確排除；source 0 移到 Work / 2026；Imported 更名為 Saved，原路徑保持 Imported。HTML 實際 4 筆、JSON 5 筆，包含 included=false。以明確手寫預期驗重新解析的 title/href/path 與 JSON 全部記錄；不是只驗 hash。[驗證內容](evidence/m1/outputs/verification.json)。

固定檔案逐一列 bytes／SHA-256：[CANDIDATE-MANIFEST.json](evidence/m1/CANDIDATE-MANIFEST.json)，其自身 hash 見 [CANDIDATE-MANIFEST.sha256](evidence/m1/CANDIDATE-MANIFEST.sha256)。用 `node scripts/freeze.mjs --verify` 驗固定路徑、bytes/hash 及 dist/public 相等。沒有另建 ZIP；由主代理整合單一外層 archive。

Source commit：NONE（M1 未提交）。Reviewed commit：NONE（主代理獨立審核尚未執行）。Released commit：NONE。GitHub URL：NOT_PUBLISHED。正式網址：NOT_DEPLOYED。沒有授權憑證存取、Git 認證變更或 hosting 操作。

## 未驗範圍與限制

所有真 browser gates 均 **NOT_RUN_USER_FOCUS_INCIDENT**，包括 file picker、真 worker／取消、真下載／重新匯入、實際跨語言導覽、bfcache、鍵盤／focus／螢幕閱讀器、320px、200% zoom、觸控、reduced-motion／密集長內容 render、截圖、Network／Storage。靜態 CSS／Node 呼叫探針沒有被標為這些項目的 PASS。[逐項 oracle 與限制](evidence/m1/M1-ACCEPTANCE.md)。

只承諾規格內 Netscape profile；合成 Firefox-like／Chrome-like／Safari-like fixtures 不證明全面相容。空資料夾可檢閱，但 HTML 由納入書籤建立非空路徑。JSON 備份保留所有書籤／修改資訊，本版本不實作 JSON 還原匯入。大量空資料夾／3000 筆真頁面效能仍須 browser 驗證。沒有安全抹除、100% 安全或正式可及性合規宣稱。

主代理下一步：固定候選獨立 review／補完獲准隔離的必要 browser gates，通過後才放行 M2；本對話不自動輪詢、不發布、不部署。Requested model 為 gpt-6.1-sol/max；實際 backend 身分未獨立確認。

## 規格準備歷史

最初交接狀態為「規格已準備，尚未實作／驗收／公開／部署」；實作/Node/check/build=NOT_RUN，browser=NOT_RUN_USER_FOCUS_INCIDENT，GitHub/正式網址/首頁=NOT_PUBLISHED，外部驗收=NOT_RUN。上方僅把本次有實際證據的 M1 項目推進，其他 gates 保留未驗。歷史 archives 與其他交付包未變更。

## 2026-10-23 追加：B20-RP-49 / M1B 離線發布準備

本段為新 milestone；不改寫以上 M1 歷史數據、原 manifest 或 ZIP。新固定候選 **B20-RP-49-M1B-2026-10-23-r1** 只完成 browser gate 前的發布工具鏈，未進 M2。原 M1 核心／CLI 的主代理驗收不代表 browser 通過。

### 實際變更與產物

| 檔案 | 差異 |
| --- | --- |
| package.json | 保留既有 dev/test/check/build；新增 build:release、check:release，精確指向 release.mjs build/check；無依賴變更 |
| .gitignore | 新增 release-artifacts/ 與本輪負例 test-workspaces/，避免生成物／污染測試副本混入來源 |
| scripts/release.mjs | 固定 origin／slug；閉合來源／輸出掃描、唯一雙語 SEO、robots／sitemap／安全 headers、確定重建、拒絕污染且不覆寫／刪除、manifest 與獨立 expected bytes 雙重檢查 |
| scripts/release-baseline.mjs | 17 個 M1 public 檔案的 bytes／SHA-256 pin；來源變更必須另審，不能只改 manifest |
| scripts/release-evidence.mjs | 固定本輪 source/docs、21 個 artifact、頂層證據；比對 78 個 M1 保護檔，不遍歷／收錄負例副本 |
| test/release.test.mjs | 新增 15 項工具鏈測試及任務副本負例，保留原 30 項產品測試不改 |
| M1B-RELEASE.md、TASK-ENTRY.md、HANDOFF.md | 重現方式、最新契約、實際結果、未驗範圍與來源／產物清單 |
| evidence/m1b/**、release-artifacts/** | 新證據與正式候選；public/dist/evidence/m1 不改 |

共 9 個修改／新增 source/docs 檔案（4 個既有檔改動、5 個新增檔）；另有本輪證據與生成候選。預定 origin 是 `https://bookmarks.glossquote.com`，toolSlug 是 `bookmark-organizer`，都在程式固定，不讀環境或接受 CLI 代入。

site 為 `release-artifacts/site/`，精確 20 檔、**72,396 bytes**；審核 manifest 在 sibling `release-artifacts/manifest.json`，**5720 bytes**，SHA-256 **94ee4bd3206130a3977c5b42f3e3704e4e4f25370c0a153fa500f22c11aab52d**。manifest 固定 schemaVersion/mode/origin/toolSlug/files/sourceFiles，20 個 artifact records、17 個 public source records，排序／無重複，沒有時間、隨機值或本機絕對路徑。

兩語 HTML 僅更改 head 的 meta robots 與 canonical／zh-Hant／en／x-default links；中文 canonical `/index.html`、英文 `/en/index.html`，x-default 中文。原 lang、title、description、H1、head 其他內容、內文與候選未部署文案保留。15 個 JS／CSS 非 HTML 資產逐 byte 相等；不更動產品 Runtime、JSON／HTML 使用者產物邏輯。

原 public 無 `_headers`／robots，故由既有 `serve.mjs` 的 makeHandler 以記憶體 callback 擷取 M1 安全常數。完整比對後保留 CSP、nosniff、no-store、no-referrer，只改 X-Robots-Tag。Content-Type 是逐資產 MIME，不把 HTML MIME 強制套全站。未呼叫 server/listen，未開 port。配置檔不證明實際 hosting headers。

### 實際命令與證據

| 命令 | exit | 結果 |
| --- | ---: | --- |
| node --test test/release.test.mjs（針對性） | 0 | 15/15 pass，0 fail／skip |
| node --version（最終） | 0 | v24.14.0 |
| npm test（最終完整，一次） | 0 | **45/45 pass**，0 fail／cancelled／skip：原 30 + 新 15；不是 browser 測試 |
| npm run check | 0 | 17 public 靜態／語法契約及 scripts/test ESM 語法通過 |
| npm run build:release | 0 | 建立 20 檔正式候選與獨立 manifest |
| npm run check:release | 0 | 重建 expected bytes、重算實體清單／雜湊與 SEO 通過 |

最終參數／exit：[final-commands.json](evidence/m1b/final-commands.json)；完整 [test](evidence/m1b/npm-test.txt)、[check](evidence/m1b/npm-run-check.txt)、[build:release](evidence/m1b/npm-run-build-release.txt)、[check:release](evidence/m1b/npm-run-check-release.txt)。針對性紀錄：[targeted-command.json](evidence/m1b/targeted-command.json)、[targeted-release-tests.txt](evidence/m1b/targeted-release-tests.txt)。child 均 shell:false/windowsHide:true。沒有跑未變 preview build。

負例包含兩語互返／正確 origin／preview 與 runtime bytes、合法重建不寫入、無參數／錯 mode／多參數、資產竄改、未知檔／空目錄、缺檔、asset+manifest 共同竄改、canonical／alternate／robots／內文／CSP／sitemap 共同竄改、來源及兩份 inventory 一起更動仍拒絕、無主／不完整輸出，以及真實任務目錄 junction。所有負例只在 evidence/m1b/test-workspaces 副本；主站點未作破壞試驗。

針對性測試留下的 2 個已識別 disposable links 只 unlink 連結、目標保留；最終測試內即做相同有界處理。沒有遞迴刪除。[test-link-cleanup.json](evidence/m1b/test-link-cleanup.json)。負例副本是刻意錯誤資料，排除於 M1B 候選／發布清單，不部署。

實體候選另以獨立欄位預期核對兩語 title/description/H1/canonical/alternate、head 外 bytes、15 個 runtime bytes 及實際 site hashes：[artifact-review.json](evidence/m1b/artifact-review.json)。這是離線檔案驗證，沒有 HTTP／browser 證據。

public 17、dist 17、舊 M1 evidence 44，共 **78 檔**完整 paths/bytes/SHA-256 前後相同：[protected-before.json](evidence/m1b/protected-before.json)、[protected-comparison.json](evidence/m1b/protected-comparison.json)。原 M1 manifest SHA 仍為 0964cc92266f8171a70879fdab953ce02d1850d3ebea914a8e7b1d7bae38e522；本輪允許的 package/scripts/docs 增加後，不把舊整樹 freeze 指令當作新版本 current manifest，也不覆寫它。

環境 guard 在本輪起點、針對性後、最終 automation 前後執行，完整 Snapshots 一致：[environment-comparison.json](evidence/m1b/environment-comparison.json)。HKCU PATH ExpandString / 834 字元 / ephemeral 0，HKLM PATH String / 1227 字元 / ephemeral 0；完整 PATH hashes、Environment-key fingerprints、TEMP/TMP fingerprints 都保留在前後 JSON，沒有 drift 或持久改動。

固定 source/docs 9 檔、artifact 21 檔的逐檔 bytes/SHA-256：[M1B-CANDIDATE.json](evidence/m1b/M1B-CANDIDATE.json)，[checksum](evidence/m1b/M1B-CANDIDATE.sha256)。以 `node scripts/release-evidence.mjs verify` 驗本輪固定資料與 M1 保護檔；不另做使用者 ZIP，主代理整合單一交付包。

### 未驗、風險與下一步

真 browser／native／真機／Network／Storage／下載／焦點／鍵盤／可及性／320px／200% 仍 **NOT_RUN_USER_FOCUS_INCIDENT**；M1B 新增測試不能改寫 M1 未驗 gates。GitHub、hosting、實際 HTTP header、正式網址可用性、共享首頁與外部審核為 **NOT_RUN_M1B_ONLY**。未 GitHub、部署、開 server/browser、讀憑證、安裝、付費或改持久 Windows/Git/auth。

既有輸出受損／不完整時，build 只拒絕，需主代理判斷處置。第一次 exclusive 建立若遇 I/O 中斷，可能留下新的不完整目錄；不自動刪除／修復。未遇到此阻礙。本輪沒有需新增依賴／權限或未解的規格矛盾。

主代理應獨立核對實際差異、固定清單與 release-artifacts/site，之後才處理受批准的 browser gates；M1B 不是 M2 放行。Requested gpt-6.1-sol/max，backend 身分不以自述確認。

## 2026-10-27 追加：B20-49-M2A 離線部署前準備

候選 **B20-49-M2A-2026-10-27-r1** 已完成本輪授權的離線準備與驗證，供主代理審核 M2B。尚未公開 GitHub、部署、驗證正式 HTTP 行為或整合首頁；本工具仍未交付外部驗收。本段更新目前狀態，以上 M1／M1B 證據與敘述保留為歷史。

### 變更與保護範圍

| 路徑 | 本輪差異 |
| --- | --- |
| wrangler.jsonc（新增） | 固定 name、bookmarks.glossquote.com custom_domain、2026-10-24；workers_dev／preview_urls／send_metrics／所有 observability enabled、logs、invocation_logs、traces 均 false；assets=./release-artifacts/site、run_worker_first=false、html_handling=none、not_found_handling=none；build=node scripts/release.mjs build；無 main／runtime／bindings／permissions |
| scripts/release-config.mjs（新增）、scripts/check.mjs | canonical strict-JSON subset 與完整固定物件比較；所有未知欄位、型別／值變更、重複 key、BOM、comments、格式差異均拒絕；check 與 release CLI 皆先檢查設定 |
| scripts/release.mjs | 只對 hash 固定且完整核對的 M1B 候選執行一次有界升級；完整舊版備份先核對；兩語生成 HTML 各刪除唯一完整候選 span；加入精確 _redirects；重建 manifest。其餘輸出仍閉合且 byte-equal，不接受資產與 manifest 共同竄改 |
| test/release.test.mjs | 原 15 release tests 保留，新增 9 項設定／banner／full-body／轉址／歷史升級與污染備份拒絕測試；負例移到本輪 evidence/m2a/test-workspaces |
| scripts/m2a-evidence.mjs（新增） | 固定目前完整 source-set、22 個 artifacts、本輪證據；核對 3385 個保護檔與完整舊 release；record／verify 明確分開，不覆寫歷史固定器 |
| TASK-ENTRY.md、HANDOFF.md | 本輪範圍、實際結果、固定版本與未驗限制 |
| evidence/m2a/**、release-artifacts/** | 本輪證據、完整歷史備份與受控生成物 |

共 **8 個 source/config/doc 路徑**新增或修改；逐檔 before/after bytes 與 SHA-256 見 [CHANGE-SET.json](evidence/m2a/CHANGE-SET.json)，目前完整來源見 [SOURCE-SET.json](evidence/m2a/SOURCE-SET.json)。只在本工具獲准路徑工作；未改產品 runtime、public、dist、readonly specs/docs、共享首頁或其他工具。

原 release 的全部 **21 檔**（site 20＋manifest）完整保存於 [pre-m2a-release](evidence/m2a/pre-m2a-release/inventory.json)，舊 manifest 5720 bytes，SHA-256 `94ee4bd3206130a3977c5b42f3e3704e4e4f25370c0a153fa500f22c11aab52d`。public 17、dist 17、M1／M1B evidence 3351，合計 **3385 檔** paths／bytes／SHA-256 前後完全相同；未刪除歷史負例副本或改寫舊 manifest。

獨立實體差異核對：[artifact-review.json](evidence/m2a/artifact-review.json)。舊兩語 HTML head 完全不變；中文只刪 `<span class="candidate">本機候選版；尚未部署</span>`，英文只刪 `<span class="candidate">Local candidate; not deployed</span>`，其餘 bytes 全相等。既有另 **18 個 site assets** 全相等，包括 15 個 JS／CSS、robots、sitemap、_headers。

新增 `_redirects` 為 **65 bytes**，SHA-256 `9e47a2579b08f461b1124de1e42a1bde7a79ca29d77401104f6f432d8be90e1e`，以下每行結尾及檔尾皆是真 LF：

```text
/ /index.html 301
/en /en/index.html 301
/en/ /en/index.html 301
```

canonical 仍是 `/index.html` 與 `/en/index.html`。新 site **21 檔／72,340 bytes**；sibling manifest **5863 bytes**，SHA-256 **`587ea75bc8ef605a31e538d18d4adc78165775a88caa2d99a5ea64c18ab0c9b6`**。連同 manifest 共 22 個 artifacts。轉址內容與 LF、manifest 收錄已離線驗證；實際 Cloudflare HTTP 301、headers／MIME／404／custom domain 尚未執行。

### 實際驗證

| 命令 | exit | 結果 |
| --- | ---: | --- |
| node --test test/release.test.mjs（針對性） | 0 | **24/24 PASS**，0 fail／cancel／skip |
| node --version（最終） | 0 | v24.14.0 |
| npm test（最終一次） | 0 | **54/54 PASS**：原產品 30＋release 24；0 fail／cancel／skip |
| npm run check | 0 | 17 public 靜態／語法檢查、全部 scripts/test ESM 語法與嚴格部署設定通過 |
| npm run build:release | 0 | 實際從固定舊候選升級；build=upgraded-reviewed-banner-and-entrypoints |
| npm run check:release | 0 | 完整來源 pin、輸出閉合集、full-body／SEO、轉址及 manifest expected bytes 通過 |

完整參數、exit、elapsed、shell=false／windowsHide=true：[final-commands.json](evidence/m2a/final-commands.json)。完整 [test](evidence/m2a/npm-test.txt)、[check](evidence/m2a/npm-run-check.txt)、[build](evidence/m2a/npm-run-build-release.txt)、[release check](evidence/m2a/npm-run-check-release.txt)；[針對性紀錄](evidence/m2a/targeted-command.json)。無 install，未跑未變 preview build；全部產品 fixtures 為合成資料。

負例覆蓋固定設定每個 primitive 的型別、所有未知／runtime overrides、domain／route／port／date／assets／build／logging 改變、重複 key／BOM／comments、真實 CLI 拒絕且不碰輸出、banner 重複／重插／其他內文變更、_redirects 改值／缺漏／新增規則／CRLF／字面反斜線 n，以及協調修改 manifest 仍拒絕。另驗證固定完整歷史升級、備份逐檔一致、正確重建不寫檔與污染備份 fail closed。所有破壞試驗只在 task-owned 副本；不對真 public/dist 作負例。

環境 guard 在起點、針對性前後、最終 automation 前後執行；**五份完整 Snapshots 相等**：[environment-comparison.json](evidence/m2a/environment-comparison.json)。HKCU PATH ExpandString／834 字元／ephemeral 0；HKLM PATH String／1227 字元／ephemeral 0。完整 PATH hashes、registry types、Environment-key 與 TEMP/TMP fingerprints 均保留，沒有持久 drift／修改。

固定檔：[M2A-CANDIDATE.json](evidence/m2a/M2A-CANDIDATE.json)、[checksum](evidence/m2a/M2A-CANDIDATE.sha256)。重現驗證 `node scripts/m2a-evidence.mjs verify`；舊 M1 freeze／M1B release-evidence 對應歷史候選，不要求其舊 source pin 通過新 M2A 整樹，也不重凍結舊證據。test-workspaces 是污染測試副本，明確排除於 M2A source-set／artifact／證據固定清單，不能用於發布。

### Browser 證據、限制與下一步

主代理提供的 r3 `result.json` 為 **103512 bytes**，SHA-256 `bfa1c0466863f750f94dcdd9945d84088d178aa4aa29b88d6bb9c1cd4ef89f21`，Chromium **145.0.7632.6**；實際 **44 PASS／10 NOT_RUN／0 FAIL**，prohibited=[]，parent cleanup=PASS。[來源路徑、hash 與完整 NOT_RUN](evidence/m2a/browser-gate-summary.json)。此為未變 M1 runtime 的既有主代理 browser 結果，沒有推廣成新 HTML／轉址／hosting 驗證。本 chat 未啟動 browser/server/UI。

雙語各五項共 10 個 NOT_RUN 保留：heap／BFCache retained internals、手動晚到 worker completion、真正 200% text/page zoom、真實 20 分鐘 ready 壽命、native dialogs／clipboard／print／真機／螢幕閱讀器。Node／靜態 checks 不補成 PASS；原代表性三種 browser-export fixtures 不表示全面瀏覽器匯出相容。

wrangler.jsonc 僅以本機嚴格任務契約驗證；未執行 Wrangler／provider schema／帳號權限或 network 驗證。使用 Cloudflare workers-best-practices 方法，明確授權的 2026-10-24 與 observability 全 false 優先；無新增套件、runtime 或服務。舊版升級先完整備份並核對，兩頁與 manifest 的替換不是跨檔案原子交易；若遇 I/O 中斷，保留完整舊備份且後續 strict check 停止，不自動刪除或修復，交由主代理決定。本輪未遇到中斷。

GitHub URL：**NOT_PUBLISHED**。Source／reviewed／released commit：**NONE**。正式網址：**NOT_DEPLOYED**。首頁／外部驗收：**NOT_RUN_M2A_ONLY**。本 chat 未讀 token／憑證、未 Git/auth 設定、未安裝或更改 Windows 持久狀態。M2B 發布／部署／首頁整合由主代理另行放行；不建立額外 chat、子代理、server 或使用者 ZIP，由主代理整合單一外層交付。

## 2026-10-27 追加：B20-49-M2B 公開來源發布

主代理親審 M2A release/config、banner／轉址差異、22 個 artifacts 與 browser 證據後放行 M2B。指定獨立公開倉庫已建立並推送：[KYStr/glossquote-labs-bookmark-organizer](https://github.com/KYStr/glossquote-labs-bookmark-organizer)。**visibility=PUBLIC、private=false、branch=main**，遠端 commit **`34b554b4316de106576c3868f0748427c259a66b`**，已由 GitHub API、git ls-remote 與實際 GitHub clean clone 三方確認。這是公開來源發布，hosting／首頁／外部驗收仍未執行；主代理發布後獨立驗證待做。

### 發布副本與固定清單

副本：`.runs/b20-49-m2b-2026-10-27/publishing-copy`；本機 clean clone：同任務目錄 `clean-clone`；實際 GitHub clean clone：`remote-clean-clone`。全部在根 repo 的任務目錄，沒有從根 repo 推送，沒有 force／reset／clean 或刪除既有內容。

公開集合只有本工具 **69 個 tracked files／322,947 bytes**：M2A 固定來源、完整 test fixtures/helpers、測試必要的原 `evidence/m1/CANDIDATE-MANIFEST.json` 與 checksum、四個小型合成 input/output/verification、review/release-manifest 與保留 NOT_RUN 的精選 acceptance summary。每檔 bytes／SHA-256／commit 見 [tracked-inventory.json](evidence/m2b/tracked-inventory.json)，其 SHA-256 為 `e30684c16aecc7e0067405be4cac4199454c7664c01e1430430b90eae2cc788a`。

Runtime、release/config 程式與所有測試保持受審 M2A bytes。僅在發布副本覆蓋兩個文件：README 改為目前操作與狀態說明，原文保留 review/original-README.md；.gitignore 增加 evidence/m2a/test-workspaces/。新增 PUBLICATION.md 明示來源、精選證據、未部署與歷史固定器需完整本機 archives。這些變更的來源及 before/after bytes/hash 見 [prepared-inventory.json](evidence/m2b/prepared-inventory.json)。未複製 scratch、node_modules、環境／Git logs、browser／程序 artifacts、憑證／秘密／私人資料或其他工作區工具。

Release manifest SHA-256 仍為 **`587ea75bc8ef605a31e538d18d4adc78165775a88caa2d99a5ea64c18ab0c9b6`**。發布副本不追蹤生成站點；使用 release build 可重建原 21 site 檔＋sibling manifest，22 個實體檔與原 M2A 全部逐 byte 相同。

### 實際驗證與保護

先核對全部 prepared 檔與 staged blobs，再以每次 Git -c 設定建立本機獨立 commit（publication-local KYStr noreply identity、空 hooks/template、關閉 signing／CRLF 轉換）。從該 commit 建立不使用 hardlink 的乾淨 clone，實際執行下列命令，**每項 exit 0**：

| 命令 | 實際結果 |
| --- | --- |
| npm test | **54 PASS／0 FAIL／0 skipped**，含需要原 M1 manifest 的 release source-pin case |
| npm run check | 靜態／語法與嚴格設定通過 |
| npm run build | 17 個 preview 檔生成通過 |
| npm run build:release | 21 個 site assets 與 manifest 生成通過 |
| npm run check:release | 全部固定來源／輸出／SEO／banner／轉址與 manifest 通過 |

完整 [local-validation.json](evidence/m2b/local-validation.json)、[local-commands.json](evidence/m2b/local-commands.json)、[test log](evidence/m2b/clone-npm-test.txt)。兩個本機工作樹保持乾淨；推送後實際 GitHub clone 的 commit、完整 tracked names 與每檔 bytes／SHA-256 全相同，因此重用已通過的同一來源測試，不為相同輸入再重跑。

只用既有 gh CLI account KYStr；repo 建立及推送均用 shell=false／windowsHide=true，禁止互動 prompts，child 不繼承 Git/GH 認證請求 debug flags。認證透過每次 git -c 的官方 gh credential helper 使用；未直接呼叫 helper 取得值，未讀取／列印 credential、未 auth setup-git／login／refresh、未 global/system config 寫入。初始 repo lookup 的 exit 1／HTTP 404 是建立前的預期不存在；建立、推送、其餘驗證命令均 exit 0。[publication-commands.json](evidence/m2b/publication-commands.json)。

Git guard 前後 fingerprints 完全相同：[before](evidence/m2b/git-settings-before.json)、[after](evidence/m2b/git-settings-after.json)。Windows guard 在 automation 前、本機驗證後／推送前、全部發布後執行，**三份完整 Snapshots 相等**：[environment-comparison.json](evidence/m2b/environment-comparison.json)。HKCU PATH ExpandString／834／ephemeral 0，HKLM PATH String／1227／ephemeral 0；PATH hashes／types、Environment-key／TEMP／TMP fingerprints 全相等，沒有漂移或持久變更。

正式收據：[publication-receipt.json](evidence/m2b/publication-receipt.json)，**6301 bytes**，SHA-256 **`83745752d668ce202e24891680f7f57afc26ac2aeb2f9f2b764e172c925db462`**；[checksum](evidence/m2b/publication-receipt.sha256)。遠端核對原始證據：[remote-verification.json](evidence/m2b/remote-verification.json)。收據包含 repo／PUBLIC／commit／releaseManifestSha256、兩個 clone 與 publishing-copy 絕對路徑、tracked inventory 及 guard 證據。

本次發布後只在本機 HANDOFF／TASK-ENTRY 追加結果；公開 commit 保留發布前受審 snapshot。歷史 M1／M1B／M2A manifest 與證據不覆寫；m2a-evidence 是舊整樹 snapshot 驗證器，這兩份文件追加後不當成目前 M2B 的整樹 gate，M2B 以 tracked-inventory／receipt 核對。

### 當前狀態與限制

Source commit／verified remote commit：**34b554b4316de106576c3868f0748427c259a66b**。主代理發布後獨立驗證：**PENDING_ROOT**。Hosting／實際 HTTPS、redirects／headers／MIME／404／首頁：**NOT_DEPLOYED_M2B_SOURCE_ONLY**。外部驗收：**NOT_RUN**。

Browser 沿用主代理的 **44 PASS／10 NOT_RUN／0 FAIL**、prohibited=[]、cleanup PASS；全部 10 個手動／native／內部狀態限制保留。本輪未 browser／desktop／clipboard／native dialogs／server／安裝／憑證設定／部署／委派。未另製作使用者 ZIP；由主代理依單一外層 archive 規則整合。主代理可用上述 commit／receipt／inventory 與 remote-clean-clone 獨立驗證後處理部署。

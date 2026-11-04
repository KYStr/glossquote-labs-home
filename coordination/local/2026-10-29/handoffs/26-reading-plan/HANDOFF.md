# 閱讀進度規劃交接

最新狀態見文末 **W16-26-M2 固定交接**。M0/M1 保留為歷史紀錄。

2026-10-16：SPEC_ONLY，尚未實作。原功能對話尚待建立。

| 項目 | 狀態 |
|---|---|
| M0 規格 | 主代理檢查中 |
| M1 本機 / 主驗 | NOT_RUN |
| M2 公開 GitHub | NOT_RUN |
| M3 正式部署與雙語首頁 | NOT_RUN |
| 外部驗收 | NOT_RUN |

後續追加：修改檔案及內容、固定版本/manifest、實際命令和 exit code、測試輸入與結果、真瀏覽器證據、NOT_RUN、已知風險、需主代理決定事項、環境及 Git guard。來源 URL/visibility/commit 與 hosting status 分開記。不得以預計結果寫成完成。

預定 repo KYStr/glossquote-labs-reading-plan；網域 reading.glossquote.com；worker glossquote-reading-plan；dev 4206，production-model 5206。目前全部未建立/未發布。

## W16-26-M1 固定交接 — 2026-10-16

**M1 本機候選 0.1.0-m1-rc1 已凍結，等待主代理最後獨立驗收與 M2 GO。** T00–T07 本機工作完成；來源未發布、production 未建立、hosting/首頁未部署、外部驗收未開始，產品未標 complete。原功能 thread 01a141fc-daf1-7980-aa82-93eb337a17b8；requested gpt-6.1-sol/max 已由 create-thread 接受，backend identity 沒有獨立證據。沒有子代理或其他新對話。

### 實際檔案與行為

| 路徑（相對本工具） | 實作 |
|---|---|
| package.json、.gitignore | Node >=24 ESM，真正 dev/test/check/build，零 dependencies/devDependencies；忽略建置及 task test temp。 |
| public/index.html、public/en/index.html | 各自靜態雙語頁、空日期/0 已讀/週一至五預設、四則可見 FAQ、同語首頁與明示清稿的語言連結、preview noindex/nofollow。 |
| public/styles/app.css | Gloss family tokens；真實頁碼清單、桌面左右工作區、空結果在表單下方、320px 單欄、雙層 focus、44px actions、reduced motion。 |
| public/js/core/civil-date.mjs | 純 Gregorian parser/ordinal/ISO weekday/枚舉，不依 Date、時鐘或時區。 |
| public/js/core/reading-plan.mjs | exact own data schema、getter 不執行、throwing/revoked Proxy 拒絕、有序錯誤、R/D 均分、flex null 頁碼、零剩餘與容量不足 tagged union。 |
| public/js/core/report.mjs | 成功 plan 的 zh-Hant/en 精確 LF 純文字；trim title、零頁與 flex、無 BOM/尾端 LF；拒絕 invalid/infeasible。 |
| public/js/i18n.mjs | 全部 45 個穩定錯誤碼與主要狀態的兩語訊息；使用者用語簡化，核心格式不變。 |
| public/js/app.mjs | 任意輸入變更同步淘汰結果、error association、原文保留的日期模式、取消/確認清除、single-flight clipboard 三元 token、TXT Blob/延遲 URL 清理、pagehide/persisted pageshow reset。 |
| public/robots.txt | preview 全站 Disallow。 |
| scripts/pages.mjs | 由明確 authored 詞表產生兩語靜態 HTML；build 不執行生成器。 |
| scripts/files.mjs、scripts/check.mjs | 固定 9 資產 allowlist、拒絕 unknown/symlink/junction/hardlink、syntax/metadata/禁止 API/預覽邊界、過期 dist SHA 檢查。 |
| scripts/build.mjs | 只複製 allowlisted public，無遞迴刪除；unknown/link output 先拒絕；驗每檔 bytes/SHA 與來源相同。 |
| scripts/serve.mjs | 127.0.0.1:4206，GET/HEAD、MIME、404/405、no SPA fallback、port 衝突保留原服務並可 OS 配發備用 port。 |
| test/civil-date.test.mjs、test/reading-plan.test.mjs、test/report.test.mjs | C01–C49、手寫 golden、邊界/非突變與獨立 allocation invariants。 |
| test/ui-contract.test.mjs、test/helpers/dom-harness.mjs、test/helpers/fixtures.mjs | 真 app handlers 的離線 DOM/service double；callback 的 resolve/reject/finally 隔離、single-flight、clear、composition input、Blob bytes、URL timer 與 lifecycle；不是原生 API 證據。 |
| test/site-build.test.mjs | 真 check/build/stale/unknown/link、loopback server routes/MIME/HEAD/port fallback；只使用自己建立、範圍檢查過的 test/.tmp fixture。 |
| dist/** | 9 個預覽資產，60267 bytes。無 docs/test/production metadata 或資料。 |
| HANDOFF.md、START-HERE.md、project.json、TASK-ENTRY.md（只追加）、docs/RELEASE-CANDIDATE.md | 本輪狀態與證據，未更改產品/技術/驗收門檻。 |

主審指出的初始化前原生 GET 隱私缺口已修正：所有書籍欄位和操作都在 markup 的 disabled fieldset，submit 另有 disabled，raw book fields 移除 name。app 先安裝 submit preventDefault 和全部 handlers，reset 成功後才啟用。未 mount 或中途拋錯都停用。兩語 noscript 提示保留。實際 candidate HTML/CSS 配合 app module 404 的 loopback browser 測試確認鎖定，鍵盤跳過控制，沒有 query/輸入傳送；沒有改瀏覽器 JavaScript 設定或使用 inline handler。

### 最終必要命令

cwd：<LOCAL_WORKSPACE>/tool-projects/26-reading-plan；官方 C:/Program Files/nodejs/node.exe、npm.cmd。無 npm install。

| 命令 | 真實結果 | Exit |
|---|---|---|
| node --version | v24.14.0 | 0 |
| npm test | 83 tests / 83 PASS / 0 FAIL / 0 skipped | 0 |
| npm run check | PASS；9 allowlisted assets、preview/no data APIs、空依賴 | 0 |
| npm run build | PASS；9 files / 60267 bytes，public/dist hash 相同 | 0 |

最終程式穩定後上述各一次；其後只有交接/狀態文件修改。開發初輪 focused 全部 82 PASS，主審隱私修正後 affected UI/site 27 PASS。完整 log/exit 在根 `.runs/reading-plan/W16-26-M1-01a141fc/commands.json` 與 `node-version.log`、`npm-test.log`、`npm-check.log`、`npm-build.log`。

### 瀏覽器與案例

Codex In-app Browser，實際 task-only loopback HTTP User-Agent：Chrome/155.0.0.0，Windows NT 10.0 Win64 x64（不是從模型自述推斷）。證據 `browser-user-agent.json`。使用 CUA 操作真頁面。預覽 task-owned exec session **8347** 保留；http://127.0.0.1:4206/index.html、http://127.0.0.1:4206/en/index.html。IAB tab 1 保留給主審；viewport override 已 reset。沒有結束其他程序或分頁。

| 案例 | 狀態與證據 |
|---|---|
| C01–C49 | PASS；全數有具 ID 的核心/報告測試，非把規格預期當實測。 |
| B01 | PASS；兩語空書名/總頁/日期/cap、已讀 0、週一至五，無初始排程。 |
| B02 | PASS；兩語所有 6 個 raw 欄位與 7 個 weekdays 實際改動立即清結果、列、報告與 exports；harness 亦逐項驗證。 |
| B03 | PASS；兩語 P5 5 日各 12 頁，41–52 至 89–100；提交後焦點在 create。 |
| B04 | PASS；兩語零剩餘無 schedule、無完成紀錄、可報告。 |
| B05 | PASS；兩語 cap10 顯示 60/5/10/50/10/6，沒有 schedule/report/copy/download。 |
| B06 | PASS；取消按鈕與 Escape 保留原始資料/報告、focus 回 clear，兩語。 |
| B07 | PASS；確認清回規格預設，保留 locale，兩語。 |
| B08 | PASS；帶 5 列成功 plan 的 en→zh、返回 en、再切 zh 均清空；不是實測 persisted BFCache。 |
| B09 | PASS；兩語有效 ISO 值切換保留；2024-2-29 禁止轉 native 且 raw 保留，有明確提示。 |
| B10 | PASS；兩語使用真 Tab/Shift+Tab/Space/Return，checkbox 可操作，focus ring 可見。 |
| B11 | NOT_RUN 真 IME；CUA 未提供可驗證的繁中 IME 組字控制。isComposing input 失效邏輯由 harness PASS，不宣稱真 IME。 |
| B12 | PASS controlled success/reject/unavailable handlers（兩語 app harness）；PASS 原生 writeText fulfilled UI（兩語），未讀系統 clipboard 或宣稱 readback。 |
| B13 | PASS 兩語 Blob/report UTF-8 bytes 與 fixed download attribute（harness）；PASS 實際繁中下載 586 bytes、無 BOM/尾 LF、與當前報告相等。瀏覽器遇已有檔名加 (1)，未讀取或刪除既有檔。 |
| B14 | PASS app harness；同結果 single-flight；修改後 B 可開始，A 的 resolve/reject/finally 不變更 B busy/message/focus；clear/pagehide 亦失效。不宣稱撤回原生已開始寫入。 |
| B15 | PASS 真 app pagehide/persisted pageshow handler 邏輯（harness）；真 persisted BFCache 恢復 NOT_RUN，CUA 沒有 persisted 事件證據。 |
| B16 | PASS；兩語 title/description/H1/4 FAQ<LOCAL_USER> links/noindex；無 production canonical/hreflang link/sitemap。 |
| B17 | PASS；fallback 非補零日期拒絕且保留、有效 leap ISO 可切 native；Gregorian leap 核心 C15 PASS。 |
| B18 | PASS；兩語純鍵盤從初始輸入至計畫及唯讀報告 Ctrl+A；cancel/confirm/Escape clear 同樣可用。 |
| B19 | PASS 320x720 emulation 的兩語主要動作/錯誤/報告/clear；無頁面水平捲動，控制在 content bounds。Windows scrollbar 扣 15px 時 clientWidth=305。200% zoom NOT_RUN（未改瀏覽器縮放）。 |
| B20 | NOT_RUN；沒有連接的實體 iOS/Android/虛擬鍵盤環境；320 emulation 不冒充真機。 |
| B21 | NOT_RUN；沒有實際低階/CPU throttling 環境；366 日核心測試通過不等於低階 500ms 實測。 |
| B22 | NOT_RUN 完整 DevTools Network/Storage；工具沒有完整觀察能力。source/build forbidden APIs/外部資產檢查 PASS，不能代稱完整 Network/Storage。 |
| B23 | PASS；invalid/infeasible 沒有可用 copy/download 或舊報告，兩語實測加 harness。 |
| B24 | PASS；全形、空白、符號、錯誤/不存在/空白日期保留原文並給固定可關聯錯誤；兩語主要錯誤及英文追加邊界實測，核心全變化自動測試。 |
| B25 | PASS 真 app URL/timer harness；click 同步不 revoke，10000ms fallback、pagehide 即 revoke；原生下載檔另見 B13，不宣稱瀏覽器 timer hook 注入。 |

`browser-results.json` 記 55 個操作紀錄（含一筆錯誤分頁的 EMULATION_NOT_APPLIED，明確保留且由後續真 320px 紀錄取代）；有兩語 desktop/320px、keyboard focus、初始化失敗 JPEG。CUA 窄畫面 locator pointer 的座標/快照時序造成的操作未到位，改用有可見焦點的 native AX/鍵盤後核實；沒有為工具限制改產品或放寬 gate。完整原生分頁 persisted/IME/DevTools 仍不虛報。

視覺工作採一條 Gloss family Product App 路線，沿用 UX-SEO 草圖；第一輪發現空白結果面板過大後一批修正為表單下方提示，最終確認兩語 desktop/320。`contrast.json` 記錄實際 token 組合的計算比例；不宣稱完整 WCAG 認證。

### 固定候選、guards 與未完成里程碑

- Manifest：`.runs/reading-plan/W16-26-M1-01a141fc/candidate-manifest.json`，**5382 bytes**；SHA-256 **aae665490bc38b94217332c2864a306e841e77d8c4f1a5d09796da56490d64f2**。
- Source digest：**08b3e29b134d45644827162c9423d99725eecff6cd05f0bf4257b649f12084fa**；23 source files / 126717 bytes。Preview 9 files / 60267 bytes。每檔 bytes/SHA 已列 manifest。Manifest 不含自身/證據/可變交接及 M0 文件，避免循環；這是工作樹凍結，**沒有 Git commit**。
- Environment before/after：PASS，完整 JSON snapshots 相同；HKCU PATH ExpandString、834 chars、ephemeral 0、SHA `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb`；HKLM PATH String、1227 chars、ephemeral 0、SHA `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8`。
- HKCU Environment key SHA `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a`；HKLM SHA `a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82`，前後不變。TEMP/TMP/type/hash 亦不變。既有重複 PATH 項保留，沒有嘗試修正。
- Git settings guard：M1 無 publication block，N/A；沒有 Git/gh auth/global/system writes、憑證讀取、push 或 Cloudflare 操作。根既有 AGENTS/GlossGate 修改與 untracked .codex/tool-projects 保留；只編輯本工具與唯一 evidence dir。
- 主審已回傳其 250 組獨立核心與若干瀏覽器/原生 API PASS，證據由主審擁有；本交接不把它冒稱本對話執行。主審的最終 npm gates 尚待執行。
- 下一步只需主代理核對本固定 manifest、獨立最後 gates、決定 M2 GO。GO 前保持凍結。M2 仍由本原功能對話建立 production/public KYStr/glossquote-labs-reading-plan/固定 commit ZIP；M3 reading.glossquote.com 與首頁由主代理。沒有需新增權限/成本的事項或未修正已知 M1 缺陷。

本輪參考官方 [HTML date state](https://html.spec.whatwg.org/multipage/input.html#date-state-(type=date))、[Clipboard API](https://www.w3.org/TR/clipboard-apis/)、[page history events](https://html.spec.whatwg.org/multipage/nav-history-apis.html#the-pageshow-event)。參考不替代本機/原生驗收。

## W16-26-M2 固定交接 — 2026-10-16

**M1 HANDOFF 已完成，主代理已獨立驗收並明確 M2 GO；M2 正式候選、公開來源及固定 ZIP 現已凍結，等待主代理獨立驗收。** 沒有部署 Cloudflare、修改共用首頁或標產品完成。原 thread/model-request/backend-identity 狀態不變；無子代理或新對話。

### 修改範圍與驗收

Published-source 變更只有 package.json（rc1 與四個 production/release 命令）、wrangler.jsonc（GO 的 exact config）、scripts/m1-oracle.mjs、production.mjs、build-production.mjs、check-production.mjs、preview-production.mjs、source-policy.mjs、release-check.mjs、test/production.test.mjs、README.md、docs/RELEASE.md。M1 public 九檔/60267 bytes 完全保留，舊 scripts/tests 未修改，PRODUCT/TECHNICAL/UX-SEO/ACCEPTANCE/TASKS 不降門檻。新增 dist-production 為獨立 12 檔，未覆寫 noindex preview。

production 只轉換 head metadata，body/表單/核心和 M1 相同；正式兩語各有 index,follow、精確 canonical、互返 zh-Hant/en/x-default、對應 OG 和 WebApplication JSON-LD。robots 開放兩個 canonical 與 /js/、/styles/ 渲染，其他 Disallow；sitemap 僅兩頁。404 有兩語說明/正確 noindex，無工具成功表單或 JSON-LD。closed config 沒有 handler/build command/binding/dependency/其他 target，logs/traces/metrics 全 false，compatibility_date 2026-10-16。

全站 CSP 使用兩頁各自確切 JSON-LD script-text SHA-256（主審指定允許兩個 hash 同時用於全站）：

- zh-Hant：`sha256-s0hdXHva5KM+gOmK5HM5NuPdRCjG2flTRx1sud3p+mE=`。
- en：`sha256-UoQMgb0Qqx7nyIBIdc+3CBS7PDNJ6A9lCe0hG1SJ6o0=`。

default-src/connect-src/form-action/object-src/base-uri/frame-ancestors deny；script/style/image/font self，script 僅另許上述兩個 hash；沒有 unsafe-inline/eval/外部來源或新增連線。clipboard-write 未禁用。_headers 全域 X-Robots-Tag noindex,nofollow，兩個明確 canonical 路徑以 detach 移除該 header，讓 HTML index,follow 生效，不產生同名 header 合併衝突。其餘未知路徑保留 noindex，真正 404。local model 按 html_handling=none 對 /、/en/、extensionless/未知路徑回 404；直接 404.html 是存在的 noindex 靜態頁。這是本機模型，M3 仍須核對實際 edge 的路由/headers/MIME。

| 最終命令 | 根工作副本 | clean publishing copy |
|---|---|---|
| npm test | 87/87 PASS，0 FAIL/skip，exit 0 | 87/87 PASS，exit 0 |
| npm run check | PASS，exit 0 | PASS，exit 0 |
| npm run build | 9 files / 60267 bytes，exit 0 | 同 hash，exit 0 |
| npm run build:production | 12 files / 65324 bytes，exit 0 | 同 hash，exit 0 |
| npm run check:production | PASS，closed config/全部固定產物，exit 0 | PASS，exit 0 |
| npm run release:check | 44 regular source files，exit 0 | PASS，exit 0 |

新增四個 production tests 使用獨立固定 metadata/config/HTTP oracle，不以被測生成器輸出作 expected。測試涵蓋 JSON-LD 精確 bytes/CSP hash、完整 canonical/hreflang/OG、body/code 保持 M1、robots/sitemap/404、配置增加欄位拒絕、M1 修改拒絕、stale/unknown/hardlink 拒絕、source exclusion、loopback headers/MIME/GET/HEAD/404/405/路徑/來源不外露。故意壞輸入的拒絕是測試預期通過；本輪沒有 gate failure。source 已穩定才執行上述 root gates 各一次；clean copy 是發布所需的獨立重現，非無故重跑。

HTTP model 實際執行在 127.0.0.1:5206，exec session **22836**；M1 dev **8347** 同時保留，沒有動其他程序。CUA IAB Chrome/155.0.0.0 實測 model：兩語 P5 每日12頁；zh cap10容量50/缺10/至少6日且無 exports；en P3三個一頁日及兩個flex；metadata/CSP下 app 成功初始化，error/warning logs 空。actual 5206 HTTP 9 個路徑的 status/security headers/MIME/body hashes/404 noindex 已記錄。沒有重跑不受影響的全套 M1 browser；以 M1 九檔逐一 bytes/SHA 未變重用已接受的證據。

### 公開來源、固定 commit 與 ZIP

- Repository：**https://github.com/KYStr/glossquote-labs-reading-plan**。
- Visibility：**PUBLIC**（GitHub API private=false）。
- Default branch：**codex/reading-plan-release**。
- Local commit、GitHub default-branch API commit、`git ls-remote --symref origin HEAD`：**c529476f034b2b115968edc0ec14cbccbbc53bd5**，三者相同。
- Reviewed publishing copy：**<LOCAL_WORKSPACE>/.runs/github-publish/glossquote-labs-reading-plan/W16-26-M2-01a141fc/source**。
- 固定 ZIP：**<LOCAL_WORKSPACE>/.runs/reading-plan-m2/W16-26-M2-01a141fc/glossquote-labs-reading-plan-source.zip**。
- ZIP **123838 bytes**；SHA-256 **49a93dd78581837881a9586c623ddd1b7912c6c55b3a86edb9191fbe3002eec6**；同名 `.sha256` sidecar，UTF-8/LF。44 source files（279218 uncompressed bytes）、10 directory entries；固定 commit 的 git archive，ZIP commit comment、路徑/重複/大小/壓縮/CRC 與每檔 Git blob bytes 均驗證。

公開來源固定 44 檔：原生 public/code/scripts/tests、README、必要 M0/工程/安全/發布參考。排除 AGENTS/DISPATCH/project.json/TASK-ENTRY/HANDOFF/START-HERE/RELEASE-CANDIDATE（含聊天/本機狀態）、.runs、dist/dist-production、cache、帳戶資料和使用者輸入。沒有從根 repository push，沒有 root Git commit 或 unrelated source。內部發布後 attestation（自己的 commit/ZIP hash）在本機 HANDOFF/根證據，避免自我循環，不另改固定 source commit。

### 固定 manifest 與安全 guards

根 evidence：**<LOCAL_WORKSPACE>/.runs/reading-plan-m2/W16-26-M2-01a141fc/**。

- `release-manifest.json`：**11315 bytes**；SHA-256 **1e4284f60df775049886ef3e777ee980b1f2cbfd17769e498d84fe0bf78e8905**。含 source44、M1public9、production12 的逐檔 bytes/SHA、commit/visibility/CSP/ZIP。self/evidence/local mutable records 排除。
- M2 source digest：**990bd092aa0262c6b13cbff190844e5a8a14a9383cff12ce3feab000b5026c3c**；44 files/279218 bytes。注意 M2 package/scripts/tests 合法新增，不聲稱整份舊 M1 source manifest 仍相同；不變的是 M1 public 九檔/核心/UI。
- `source-allowlist-manifest.json`、`production-manifest.json`、`candidate-summary.json`、`publication.json`、`publishing-copy.json`：固定來源/產物/遠端/副本證據。
- `commands.json` / `npm-*.log` 與 `clean-commands.json` / `clean-*.log`：真實六命令/exit/test counts。`http-results.json`、`browser-results.json`、`production-en-flex.jpg`：實際 loopback HTTP 與 CUA 證據。
- `git-settings-before.json`：發布 block 開始前 capture；push 前、發布後 verify 及 `git-settings-after.log` 均 PASS。Git/gh 只在 reviewed copy；使用既有官方 gh CLI 認證與每命令 helper/identity/config、process-only 空 config/debug-free 非秘密環境白名單。沒有 gh auth setup-git/login/refresh、global/system 寫入、token/environment secret 讀取或權限擴張。建立 repo 前的 HTTP404 預查是預期「尚不存在」，不是失敗後繞過 gate。
- Windows `environment-before.json` / `environment-after.json` 的完整 User/Machine snapshots 完全相同。HKCU PATH：ExpandString /834 chars/0 ephemeral/SHA 3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb；HKLM：String /1227 chars/0 ephemeral/SHA 52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8。
- Full Environment key fingerprints：HKCU **3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a**；HKLM **a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82**，前後不變，含 TEMP/TMP。

NOT_RUN 沿用主審已接受的真 IME/真 persisted BFCache/200% zoom/真機/低階降速/完整 DevTools Network-Storage，以及未驗的 assistive-tech/high-contrast/真正關 JS/offline/native rejection。M2 本機模型不宣稱 Cloudflare runtime/live 驗證；Wrangler/Cloudflare CLI 沒有安裝或呼叫、token 未讀取，hosting、雙語首頁、外部複驗都未做。沒有發現需改 M1 public 的產品缺陷；如有後續發現，仍先回報主代理，不在 M2 私改。

**M2 凍結。** 主代理下一步：從固定 commit/ZIP 獨立核對來源與 production，確認後接手 M3 免費 Cloudflare 及雙語首頁。只有 M3 與主驗通過後才交付為 awaiting external review；外部未確認不得產品 complete。

Cloudflare 語意核對參考官方 [static headers](https://developers.cloudflare.com/workers/static-assets/headers/) 與 [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)，不是 edge 實測。

## 主代理 M2 獨立驗收與 M3 工具部署回報 — 2026-10-16

以下事實由主代理提供，本原功能對話本輪只追加工作區 HANDOFF，沒有自行重跑驗收或操作部署。

- M2 獨立驗收 PASS：固定 commit `c529476f034b2b115968edc0ec14cbccbbc53bd5` 的來源 ZIP 共 44 檔，主代理逐檔核對與 Git blob 相同；主代理另行執行 87/87 tests 與全部六項 gates，皆 PASS。Windows 持久環境前後不變。
- 主代理已接手 M3，將工具部署至 `reading.glossquote.com`；實際 deployment version：`ef476d93-d9df-46b1-b0b2-4ecbd2a4f115`。
- 主代理最後一輪正式 HTTP 驗證：34 responses／11 assets，完整檢查 PASS。兩語實際核心操作及繁中原生 clipboard／TXT 驗證通過。
- 工具版本狀態：**awaiting external review（待外部複驗）**，未標產品 complete。**雙語共用首頁整合仍 pending**，由主代理稍後完成；本紀錄不把首頁整合描述成已完成。

主代理證據（根專案相對路徑）：

- `.runs/new-tools-2026-10-16/26-release-review.md`
- `.runs/new-tools-2026-10-16/26-live.json`
- `.runs/new-tools-2026-10-16/26-live-browser.json`

異常紀錄保留：早期 `/404.html` 曾有一次 HTTP 500；另一次瀏覽器英文導覽遇到 connection closed。根因尚未確認。後續同源 probe、完整 HTTP 檢查及新分頁英文操作正常；這些後續結果不代表已確認根因或已修復上述異常。

既有人工 NOT_RUN 全部保留，包括真 IME、真 persisted BFCache、200% zoom、真機／虛擬鍵盤、低階／CPU 降速、完整 DevTools Network/Storage、assistive technology／high contrast、真正關閉 JavaScript／offline 及原生 clipboard rejection 等未驗項，不因主代理的通過項目而推定通過。

本輪沒有修改產品、GitHub 固定 commit、發布副本、任何其他狀態檔或共用首頁；沒有重跑 gates 或部署。後續首頁整合與外部複驗由主代理續接。

2026-10-16 W16 最後收尾：首頁已由主代理驗證整合（公開固定 commit `8b0b109d3ca2db6ccb7e52395afbc7d69f65e0f2`、Worker 版本 `e1ca6502-dd51-469f-859a-c40696a003d2`；主代理回報 12 項首頁測試及七命令 PASS、正式 HTTP 25 responses PASS、兩語 DOM 各 24 入口且英文全為 `/en/index.html`，證據為根 `.runs/new-tools-2026-10-16/home-final-live.json` 與 `home-browser.json`），上述測試並非本對話重跑，閱讀進度規劃維持 **awaiting external review**。

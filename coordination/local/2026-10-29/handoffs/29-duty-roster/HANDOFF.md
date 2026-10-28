# 輪值排班表 M1 交接

2026-10-17 W17-29-M1：本機完整候選已凍結，等待主代理正式 M1 GO。這不是公開來源、部署或外部驗收完成。requested gpt-6.1-sol/max；dispatch 由建立指示指定，backend identity 未獨立確認。本對話未委派、未另開功能 chat、未發訊給主代理。

工作目錄：tool-projects/29-duty-roster。證據唯一根目錄：.runs/duty-roster/W17-29-M1-20261017-01a147c2/。

## 本次實作與檔案

- public/index.html、public/en/index.html：完整繁中/英文表單、SEO 搜尋文案與 FAQ、同語首頁連結、語言離頁提示、preview noindex,nofollow、初始 disabled 且無 input name/action。
- public/styles/app.css：Product App 單欄工作表、家族 tokens、48rem/75rem 斷點、44px 控制、雙層鍵盤 focus、局部結果表捲動與長姓名折行。
- public/js/app.js：日期與星期、0..30 列編輯（計算須 1..30）、序號、ID 保留/重用、可用星期摘要與局部展開、範例取代確認、逐欄錯誤、完整/部分結果、同步失效、確認清除、pagehide/pageshow、使用者手勢複製與下載。
- public/js/core/roster.js、schema.js：descriptor-only exact plain/dense schema、固定 code/path/錯誤次序、Gregorian 整數日期及 ISO weekday、固定游標、同名序號、30 人/366 日界線、無突變。
- public/js/core/report.js：雙語固定 TAB/LF 報告、結果精確 schema 與統計一致性、每個未排日/成員（含零次）、固定檔名與 MIME。
- public/js/core/ui-state.js：revision/request ID/page generation/copy epoch/唯一 pending promise、過期 resolve/reject/finally 抑制；每下載獨立 URL/timer、最多 8 個、30000ms 回收及 reset 清理。
- package.json、.gitignore、scripts/serve.mjs、scripts/check.mjs、scripts/build.mjs：Node24 ESM/built-ins 零依賴；127.0.0.1:4209 GET/HEAD/404/405/CSP；固定 source/public allowlist、symlink/junction/hardlink/未知檔拒絕、ESM syntax/import target、安全 API/資源檢查；check 拒絕 stale/incomplete dist，build 先驗來源並重建固定 dist，再逐位元比對。
- test/roster.test.mjs、report.test.mjs、ui-state.test.mjs、security-contract.test.mjs：56 個離線 fake-data tests，包含 C01–C32。test/browser-checklist.md 為 T00 佔位文件；主代理凍結 test/ 後未再改寫，實際 B01–B20 紀錄以本交接及 browser-observations.json 為準。
- START-HERE.md、project.json、docs/RELEASE-CANDIDATE.md、HANDOFF.md 及只追加 TASK-ENTRY.md：真實候選狀態。dist/ 8 檔由 build 生成；規格門檻、父專案、兄弟工具、首頁、原驗收包均未修改。

## T00–T04 命令與結果

官方執行檔 C:/Program Files/nodejs/node.exe v24.14.0；C:/Program Files/nodejs/npm.cmd 11.9.0。下列 npm 命令均以完整 npm.cmd 路徑，在上述工作目錄執行。沒有 npm install、dotnet 或依賴安裝。

| gate | 精確命令（執行檔見上） | exit / 結果 | 證據 |
|---|---|---|---|
| T00 | npm.cmd run check；npm.cmd test；npm.cmd run build | 各 0；1 test PASS；6 public scaffold files | T00-*.txt、T00-exits.json |
| T01 | node.exe --test test/roster.test.mjs test/security-contract.test.mjs；npm.cmd run check | 各 0；37/37 PASS | T01-test.txt、T01-check.txt |
| T02 | npm.cmd run check；npm.cmd test | 各 0；39/39 PASS；雙語實際主流程 | T02-*.txt、T02-browser.json、T02-*.jpg |
| T03 | node.exe --test test/report.test.mjs test/ui-state.test.mjs test/security-contract.test.mjs；npm.cmd run check | 各 0；25/25 PASS | T03-test.txt、T03-check.txt |
| T04 ID 修正 | node.exe --test test/roster.test.mjs test/report.test.mjs test/security-contract.test.mjs | 0；48/48 PASS | T04-id-regression.txt |
| 最後固定候選 | npm.cmd run build → npm.cmd test → npm.cmd run check | 各 0；8 build files；56/56 PASS、0 skipped | M1-final-build.txt、M1-final-test.txt、M1-final-check.txt、M1-final-exits.json |
| HTTP | node.exe <LOCAL_WORKSPACE>/.runs/duty-roster/W17-29-M1-20261017-01a147c2/http-boundary-probe.mjs | 0；15/15 PASS | http-boundary-probe.mjs、http-boundaries.json |

build 在最後 test/check 前執行，因 check 有意拒絕不完整或過期 dist。主代理第一次 test 在此 build 前發生唯一 stale-dist 失敗；主代理已告知保留第一次失敗，並在 .runs/new-tools-2026-10-17/29-m1-primary-retry1/ 重驗 test56/56、check/build 全 exit0、環境不變。本交接不把該首輪失敗改為 PASS。主代理另外回報最終核心 250 組獨立 oracle + 7 邊界共257 PASS；未在本對話重複該250組。

## 主代理先前讀碼後的精確變更

1. schema.js 的 validId：原 /^[A-Za-z0-9_-]{1,40}$/ 有 JS $ 可在最後 LF 前匹配的風險。改為字串長度1..40且不含白名單外字元，確實拒絕末尾換行。
2. roster.test.mjs C20 新增 a+LF、a+CRLF、a+U+2028；report.test.mjs 亦新增 count ID 的末尾 LF 回歸。日期/輪替核心 roster.js 未因此更改。主代理後續已告知重讀並重跑最終257例。
3. scripts/check.mjs 最後補齊 source 必要檔、初始 controls disabled、固定 link 資源、ESM import target 與 dist 內容一致檢查；build.mjs 以 verifyDist=false 僅驗來源後重建，再驗固定產物。此變更在主代理要求凍結前；沒有放寬產品 gate。
4. 主代理要求凍結後，public/scripts/test/package 未再修改，只執行最後必要 build/test/check 及整理狀態文件/證據。frozen-inputs.json 包含各檔 UTC mtime、bytes、SHA256，供對照主驗時間。

## 真瀏覽器證據與 B01–B20

OS：Windows。工具：CUA 的 ChatGPT in-app browser（實際頁面1265 CSS px寬）與獨立 Edge 驗證分頁。瀏覽器精確版本未由該 API 暴露，未猜測。Edge 尺寸覆寫415×925，實際 DOM clientWidth/scrollWidth 均320；記錄實際 CSS 尺寸，不把覆寫參數當成 CSS 寬度。初次 IAB viewport 覆寫仍1265，該嘗試不計320 PASS；相應原始觀測保留。

| case | 實際結果 |
|---|---|
| B01 | 原始 HTML 全 controls disabled、無 input name/form action；源碼 submit 首動作 preventDefault；實際初始化後啟用，Enter 驗錯不導覽。JS-off/初始化故障的原生瀏覽器注入未跑。 |
| B02 | 兩語空白、短年、無效日期均有關聯欄位錯誤，aria-invalid=true，URL未帶資料；root weekdays 空白也明確拒絕。日期欄 text + numeric mode。 |
| B03–B05 | 範例先顯示取代/取消對話框；確認仍須產生。繁中 C01=A/B/A/B/A、counts3/2；英文 C03 保留10-21/22/23三個 Unassigned、counts1/1。兩語原生鍵盤同名 Kai 結果均以1/2區分。 |
| B06 | 兩語各11種：start/end/root weekday/name/person weekday/add/remove/up/down/all/none，共22種，全部同步 rows=0、報告空、copy/download disabled，顯示重新產生。 |
| B07–B09 | 展開/收合、全清顯示全週不可用、全選/全清/逐星期可操作；30人新增停用、重排刪除正確；兩語320 CSS px、30人、80字姓名下頁面 scrollWidth=clientWidth=320；結果區 clientWidth253、scrollWidth512，30個 details 預設全收合。 |
| B10 | 桌面1265px完成流程。原生 Ctrl+plus 嘗試前後皆1265，未取得zoom值；按對應 Ctrl+minus 回復操作。真正200% zoom NOT_RUN，不把窄 viewport 充當縮放驗證。 |
| B11 | 兩語清除取消保留輸入/結果；確認回空白日期、一名空姓名、0結果、空報告；焦點回clear-all。 |
| B12 | 兩語原生 writeText 顯示已複製，等待成功狀態後，只讀本工具剛寫入的 fake 報告並與預覽逐字一致。繁中首次較早讀回不相等；等待成功後重讀一致，原始觀測保留。貼入純文字編輯器 NOT_RUN（下述政策拒絕）。 |
| B13 | 原生 clipboard permission deny NOT_RUN；Promise reject/同步throw與手動替代訊息路徑已由單元/讀碼檢查，不冒充原生拒絕權限。 |
| B14 | 注入 deferred write Promise 的 edit/reset/new-request × resolve/reject：成功/失敗/finally皆不能更新過期UI；舊finally不能釋放新pending。這是 harness PASS。 |
| B15 | 兩語明確原生下載，實際檔名 glossquote-duty-roster.txt；UTF8 no BOM、LF、無尾LF，逐位元同報告。英文269 bytes / SHA256 89896befd5f0213a290a52be85801ed7c108ac38f90536421277b0cef70edc65；繁中286 bytes / 198440e5c32b69e20d7ed07c8f1ca39a86b7d9e7ecb526fbc9d508172b0a49ad。固定副本 native-en-report.txt/native-zh-report.txt。英文任務下載已在hash匹配後移除（副本保留），讓繁中固定名重驗；Downloads 現在的同名檔是繁中。 |
| B16 | harness：8 URL/8 timer、第9次在建立前拒絕、30000ms參數、timer及reset回收、makeURL/trigger/setTimer失敗清理 PASS。沒有把mock當成瀏覽器下載證據。 |
| B17 | 真實切語言再back，日期/姓名/結果/報告皆空；未觀測 persisted event，因此真BFCache NOT_RUN。未派送合成pagehide聲稱真BFCache通過。 |
| B18 | 完整 Network/Storage NOT_RUN；只有實際HTTP/CSP及靜態禁止API檢查，無完整DevTools網路/儲存紀錄。不以源碼掃描聲稱全程網路驗收。 |
| B19 | 原生 tab.pressKey 的Tab/Shift+Tab/Return/Space完成兩語日期、星期、同名成員、新增/上移、計算、複製、展開報告與Ctrl+A選取，焦點到report-text；取消確認可用Enter。locator :focus/body 的驗證器先失敗，改為已記錄的原生按鍵後成功；產品無因此更改。未做實體讀屏/真機驗證。 |
| B20 | 兩語固定路由、頁面語言、標題/description/FAQ、語言離頁提醒與同語homepage href正確；preview實際meta及X-Robots-Tag noindex,nofollow，無canonical/sitemap。正式canonical屬M2未跑。 |

主要圖：T02-zh-result.jpg、T02-en-partial.jpg、M1-zh-320-30-viewport.jpg、M1-en-320-30-viewport.jpg、M1-zh-keyboard.jpg、M1-en-keyboard.jpg、M1-zh-report.jpg。原始細項在 browser-observations.json；早期誤標320但實際1265/332的觀測不計通過，以名稱包含320-30且DOM width320的Edge紀錄為準。視覺已檢視桌面與兩語320 viewport，工作表/控制/結果可讀，無頁面水平溢出；未為美化擴充範圍。

## NOT_RUN、政策拒絕與限制

- 實體手機、完整Network/Storage、原生拒絕剪貼簿權限、真BFCache persisted、真正200% zoom值、JS-off/故障注入、實體讀屏，以及瀏覽器精確版本確認未完成。依既有授權如實保留，不要求重複授權，不拿mock替代。
- 瀏覽器安全政策拒絕 data: 純文字編輯頁（只允許HTTP/HTTPS，未授權該protocol）。沒有改用其他surface/間接執行繞過；故B12編輯器貼上未跑。原生寫入/讀回及原生下載證據仍成立。
- 一次HTTP驗證器誤將HEAD的空body套用HTML meta斷言，修正為只在GET檢查body後，固定http-boundary-probe.mjs 15/15、exit0；產品未因此改動。
- JS記憶體清理與Object URL revoke不能撤回已交給瀏覽器的操作、剪貼簿或已下載檔；介面已明示。這不是公平最佳化或多班/法規工具。

## 環境、安全與預覽

環境 guard 的 before/after/comparison 全保存在證據根。完整 Snapshots 前後相同，兩次Status=PASS，沒有持久環境變更。

| scope | PATH registry type | length | PATH SHA256 | ephemeral entries | Environment values | full Environment-key SHA256 |
|---|---|---:|---|---:|---:|---|
| HKCU | ExpandString | 834 | 3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb | 0 | 18 | 3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a |
| HKLM | String | 1227 | 52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8 | 0 | 26 | a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82 |

預覽：npm.cmd run dev，session45449、PID31088，僅127.0.0.1:4209（preview-process.json）。保留服務供主驗；僅在新增核心helper後替換自己的最初session5312，未關閉其他程序。HTTP實測GET/HEAD、405/Allow、404/無SPA fallback、來源目錄隔離、encoded traversal、query拒絕、CSP/nosniff/noindex均PASS。無憑證讀取、Git/gh寫入、Cloudflare操作、部署或費用。

## 固定 manifest 與下一個 gate

.runs/duty-roster/W17-29-M1-20261017-01a147c2/manifest-source.json：本工具全部來源（含規格/狀態）逐檔bytes/SHA256；manifest-public.json：8個public檔；manifest-dist.json：8個preview產物；frozen-inputs.json：public/scripts/test/package/.gitignore的mtime與hash。manifest位於工具外，避免自我雜湊循環。產物與public逐檔一致。

等待主代理按固定manifest正式放行M1／M2。M2公開KYStr/glossquote-labs-duty-roster、production候選、M3免費rota.glossquote.com及首頁整合均NOT_RUN；外部驗收NOT_RUN。本對話到此停止產品修改。

## 保留的 M0 原始紀錄

# 輪值排班表交接

2026-10-17 SPEC_ONLY。原功能對話尚未建立。M1本機、M2公開GitHub、M3Cloudflare與首頁、外部驗收均NOT_RUN。

每次回報實際修改範圍、精確命令/exit、版本/manifest、瀏覽器假資料/觀測、環境guard、已知限制及需要主代理決定事項。保留原始失敗與修正，不把mock當原生。


## 2026-10-17 主代理正式 M1 PASS / M2 GO

主代理已正式通過 M1：.runs/new-tools-2026-10-17/29-m1-primary-review.md，56/56、check/build、最終schema修正後257獨立例、實際雙語及原生英文下載。授權本原對話繼續M2。M1 public/和preview dist/固定，基準見上列M1 public manifest；正式產物只寫dist-production，M3仍主代理。

## W17-29-M2 正式候選／來源發布前紀錄 — 2026-10-17

主代理已明確M2 GO，M1 public/及原preview dist/逐位元凍結。M1有界本機目標耗時約28分鐘；M2是後續獨立發布工作。

新增scripts/model.mjs、m1-frozen.mjs、build-production.mjs、check-production.mjs、preview-production.mjs、check-release.mjs、wrangler.jsonc、test/production.test.mjs、test/seo.test.mjs。更新package.json、scripts/check.mjs及狀態文件/README/test瀏覽器紀錄。沒有改動public/、核心或UI，也沒有新增依賴。check辨識獨立checkout的.git metadata但不讀其內容；其餘source/public/build仍為固定allowlist且拒絕link/hardlink/未知檔。

正式產物獨立dist-production/12檔；canonical https://rota.glossquote.com/index.html、/en/index.html，互返zh-Hant/en/x-default中文，OG與WebApplication JSON-LD，逐頁精確sha256 CSP；兩個正式路徑先detach X-Robots-Tag與CSP再設正式值。非canonical/404/資產維持noindex，robots只允許canonical與必要JS/CSS及sitemap/robots，已對所有資產驗最長匹配，sitemap僅兩個canonical；html_handling=none、沒有SPA fallback。public/與preview dist/仍noindex且無正式canonical/sitemap。5209是模擬正式標頭的loopback HTTP模型，並非對外preview或Cloudflare live。

Wrangler配置：worker glossquote-duty-roster、custom domain rota.glossquote.com、compatibility_date=2026-10-17、assets.directory=./dist-production、html_handling=none、not_found_handling=404-page；workers_dev、preview_urls、send_metrics、dependencies_instrumentation.enabled、observability.enabled/logs.enabled/traces.enabled全部false。沒有main/Worker script、binding、secret或runtime package。僅依官方文件檢視設定；按限制沒有安裝/執行Wrangler、schema/dry-run或呼叫Cloudflare。官方參考：https://developers.cloudflare.com/workers/static-assets/headers/ 、https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/ 、https://developers.cloudflare.com/workers/wrangler/configuration/ 。workers-best-practices技能的預設開啟觀測建議由本工具明確隱私契約取代。

實測命令（官方node.exe v24.14.0 / npm.cmd 11.9.0完整路徑同M1）：
- 原工具 node.exe --test test/production.test.mjs test/seo.test.mjs：13/13、exit0；npm.cmd run build:production、check:production 各exit0。
- 隔離publishing-copy依序 npm.cmd run build → npm.cmd run build:production → npm.cmd test → npm.cmd run check → npm.cmd run check:production：全部exit0，69/69、0 skipped；詳見 .runs/duty-roster/W17-29-M2-20261017-01a147c2/clean-*.txt及clean-exits.json。
- npm.cmd run preview:production：session77262，僅127.0.0.1:5209；model HTTP30/30 exit0，含11資產GET/HEAD、404/405、nosniff/robots/CSP、實際body bytes；http-model-probe.mjs/results.json。M1 session45449/4209保留。
- CUA實際5209兩語均完成A/B範例5列，robots=index,follow、正確正式canonical及3個alternate，JSON-LD可解析；error logs=0。browser-model.json與production-zh/en.jpg。沒有把localhost模型當成正式站。
- 最後release:check、Git settings guard、publication receipt及ZIP/remote驗證將由發布程序另錄；本段是預發布候選，不虛構尚未發生的remote commit。

Publishing copy：.runs/duty-roster/W17-29-M2-20261017-01a147c2/publishing-copy，僅45個審核source檔，排除.runs、dist、dist-production、node_modules、帳戶/憑證/其他工具與原始trace。來源目標 public KYStr/glossquote-labs-duty-roster；branch codex/m2-release。提交與公開前以git-settings-guard capture，之後verify；Git/gh只用已存在官方CLI、per-command -c，不變更global/system/auth設定。來源ZIP從固定git commit直接archive，根含package.json，逐檔比Git blob及copy。

M1 NOT_RUN全保留：真機、完整Network/Storage、原生權限拒絕、真BFCache、真200%縮放/JS-off/實體讀屏/精確browser版本等。Cloudflare/首頁/外部複驗均NOT_RUN，M3交主代理。M1早期stale-dist、clipboard驗證器時序等原始失敗均保留；M2 Node REPL不能import含process的CLI模組，改用正式Node CLI與來源檔清單後完成copy，沒有修改產品繞過該限制。

### M2 主審修正：乾淨來源單元測試不依賴dist

主代理在隔離29-clean-test-probe直接執行production.test，5/6 PASS、1 FAIL ENOENT dist/en/index.html（.runs/new-tools-2026-10-17/29-clean-test-probe.log/json）。此前副本69/69是在build後執行，沒有掩蓋這個乾淨來源缺陷。尚未Git提交或公開。

最小修正：production.test只核對8個M1 public固定bytes/hash；check-release.mjs必要產物gate強制dist/精確8檔及同一固定bytes/hash，與原checkProduction的正式12檔驗證一起執行。沒有降低M1固定hash、沒有把dist加入來源ZIP，也沒有改public/或核心。README明示npm test可在未建置來源直接跑；release:check則需要實際build產物。修正後結果另錄clean-source-*證據。

修正後已在全新unit-source-probe（45個source檔，初始沒有dist及dist-production）直接npm.cmd test：69/69、exit0。接著npm.cmd run build、build:production、release:check全部exit0；clean-source-exits.json明列test-before-build=0。public及preview固定hash未降低，必要release gate仍驗實際8個preview與12個production產物。只重跑受影響的乾淨來源/產物gates，未重複核心oracle或M1瀏覽器。

## W17-29-M2 公開來源已驗證 — 2026-10-17

Repository：https://github.com/KYStr/glossquote-labs-duty-roster；GitHub visibility=public / private=false；default branch=codex/m2-release。固定commit、git ls-remote及GitHub commits API三者均為 08589bc3a9a5ccbc9f80eeffe8968f7767ccafc8。發布使用已審核publishing-copy，沒有在父專案push。M2來源發布完成，等待主代理M2接受與M3；未部署rota.glossquote.com、未動首頁、未外部複驗。

Flat source ZIP：<LOCAL_WORKSPACE>\.runs\duty-roster\W17-29-M2-20261017-01a147c2\glossquote-duty-roster-source-08589bc3a9a5.zip，114924 bytes，SHA256 90c4dd98e577dd5f7ce2a918fb7e8fe35f8f9e9ea6c9d208a18be7e33021688e。由git archive固定commit直接產生，根即package.json，45個source檔，無頂層包裝；逐檔與copy、staged blob、固定commit blob、ZIP解壓位元一致，manifest-source.json完整記bytes/SHA256及gitBlobMatches。沒有把dist/dist-production/.runs/credential/其他工具打包。manifest-production.json記正式12檔；m1-freeze-verification.json再確認M1 public/preview8檔與原hash一致。

精確發布命令與exit在prepare-commands.json（首次）、prepare-retry1-commands.json、publish-commands.json：
- 官方node.exe .../publish-source.mjs prepare：exit1，Git拒絕NUL排除檔；此時尚未commit/公開，初次失敗及guard PASS保留。改用本任務空白attributes/excludes檔及每次git -c，沒有改使用者設定。
- 同腳本prepare retry1：exit0，保留並驗證自己已建立且未有commit的repo，未reset。staged45檔bytes比對、commit、git archive、ZIP/git blob核對PASS。
- 同腳本publish：exit0；gh api先讀目標，404後gh repo create --public（沒有--source/--push/auth setup）；git push origin HEAD:refs/heads/codex/m2-release，遠端及API驗證PASS。既有CLI認證由官方gh helper正常使用，agent未讀/列印token。
- 每次git均per-command -c：safe.directory、core.autocrlf=false、safecrlf、任務空白attributes/excludes/hooks、commit.gpgsign=false、暫時author/noreply、清空helper後僅官方gh auth git-credential。沒有global/system Git設定寫入，沒有gh auth setup-git/login/refresh。子process移除GIT_TRACE*、GIT_CURL_VERBOSE、GH_DEBUG，停用互動提示，全部只在process暫存。

Git settings guard：capture原baseline；首次失敗後、retry後、publish後及最終verify均PASS，三個known user/system Git config fingerprints無變化。Windows environment before/after Status=PASS、FullSnapshotsUnchanged=true；完整HKCU/HKLM PATH type/length/hash/ephemeral/full Environment-key fingerprints與M2起點一致（environment-before/after/comparison.json/txt）。沒有Windows持久設定變更或帳戶認證設定變更。

修正後新unit-source-probe從無dist來源直接npm test69/69、exit0，再build/build:production/release:check全exit0；正式publishing-copy最後release:check也exit0。原69/69 build-first成功證據、主代理5/6 ENOENT缺陷證據及修正後直接69/69均保留，未冒充首輪已通過。全部必要來源/產物gate完成後才commit/push。

HTTP model：127.0.0.1:5209，PID71276，session77262；M1 preview：127.0.0.1:4209，PID31088，session45449。兩個任務服務保留。5209模型30案例及兩語瀏覽器已驗；不是Cloudflare live，Wrangler schema/dry-run/CLI、Cloudflare headers/SEO/404/完整NetworkStorage及雙語首頁仍由M3實測。所有M1 manual NOT_RUN與data:編輯器政策拒絕照舊保留。

固定publishing-copy、commit及ZIP不因本發布後註記而改寫。此段及project/START/候選清單只追加/更新原工作區真實狀態；manifest-source.json代表固定commit，manifest-workspace-after-publication.json另識別含新狀態註記的本地來源。沒有新產品/測試/設定修改或額外push。


<!-- primary-release-2026-10-17 -->
## 2026-10-17 主代理 M3 完成

固定公開來源 08589bc3a9a5ccbc9f80eeffe8968f7767ccafc8 已獨立核對；主代理固定來源測試 69/69 與必要建置通過。正式入口 https://rota.glossquote.com/index.html 與 /en/index.html 已部署並驗證，worker version e062aae5-7aa4-4573-aa0e-50b50780cceb；本站 34 份HTTP回應 PASS_HTTP。首頁 source 088392e4de087eaa13253c0b683ebea48b817022 / worker 996c7832-c541-4bc5-abd6-b6ef535ff19b，兩語已包含26正式入口。

本地追加發布後狀態，不改固定公開來源快照。兩工具等待外部驗收；真機、完整Network/Storage、原生拒權/完整URL生命週期、讀屏、真BFCache與200%縮放等NOT_RUN維持。主代理證據 .runs/new-tools-2026-10-17/；總表 tool-projects/RELEASE-2026-10-17.md。驗收包 glossquote-new-tools-2026-10-17.zip，839981 bytes，SHA-256 7663e8c0bd17c80bdb40499fc2bf2c36ffeea61d325fb101a1b54d5ff0682ec2，85筆manifest及19相對文件連結核對通過。
<!-- primary-release-2026-10-17-end -->

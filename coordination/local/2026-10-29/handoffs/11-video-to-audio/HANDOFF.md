# 影片取出 MP3 音訊：實作交接

- 藍圖版本：1.0
- 初始日期：2026-09-23
- 產品狀態：BLOCKED_EDGE_ISOLATION_GATE（2026-10-19：Chrome剩餘G1/G6已通過；Edge產品操作前隔離guard拒絕，T02仍未完成）。
- 目前任務：T00/T01、MEDIA-11-UNBLOCK及2026-10-11的G2–G5證據保留；主代理Chrome155.0.8059.84於station-v3原HTTP頁取得完整Network及真正context Offline PASS。
- 下一步：先只讀釐清Edge155.0.4283.45的identity_helper程序世代與啟動歸屬，再由主代理確認安全隔離方案；不重跑同一失敗設定，不以Chrome替代Edge，不進T03–T07。
- 程式碼：已建立 T00 原生 ESM 靜態骨架。
- 自動測試：2026-10-11最終14/14 PASS（native狀態／隔離Worker＋既有骨架/manifest）；完整產品邏輯未實作。
- 瀏覽器驗收：最新Chrome R3的G1/G6 PASS；Edge G1/G6為NOT_RUN／BLOCKED_EDGE_ISOLATION_GATE。此前Chrome/Edge154的有界修正與四gate證據沿用，各版本與驗收範圍分開，產品驗收仍NOT_RUN。
- build：2026-10-11最終PASS，21個靜態檔；不含test/spike或測試媒體；這不是正式MVP網站。
- 發布：來源公開已有 standing authorization；完成必要 gates 前未發布。正式 hosting 由原主對話整合，本對話不部署。

## 已固定的產品決定

以 PRODUCT.md 與 TECHNICAL.md 為準。不要重新詢問已有預設，也不要把未來功能加入 MVP。
初始藍圖没有套件鎖定或量測紀錄；本次T01/T02已追加真實版本、資產和失敗證據，原始規格文字保留作歷史背景。

## 進度表

實作開始後逐項追加 TASKS.md 的任務 ID、狀態、日期、證據連結。只記真正做過的事，不預先勾選。

| 任務 | 狀態 | 證據 |
|---|---|---|
| T00 | PASS | 2026-10-10；下方 T00 記錄 |
| T01 | PASS（本機 spike 候選） | docs/DEPENDENCIES.md、package-lock.json |
| T02 | PARTIAL / BLOCKED_EDGE_ISOLATION_GATE | 2026-10-19 Chrome G1/G6 PASS；Edge操作前guard拒絕，兩項未驗。G2–G5沿用2026-10-11實機證據 |
| MEDIA-11-UNBLOCK | PASS | 2026-10-11；下方新紀錄與Chrome/Edge原始證據 |
| T03–T07 | NOT_STARTED | 必要T02前置未過，不可略過 |

## 2026-10-10／T00：安全骨架

- 任務 ID：THREAD-11-video-to-audio / T00；需求：原生 ESM、限定 public、loopback、穿越拒絕、預覽 noindex。
- 模型配置：建立對話工具接受 `model=gpt-6.1-sol`、`thinking=max`；後端實際路由未確認。未建立子代理／新對話或傳訊其他任務。
- 開工 Git：本工具整目錄為既有 untracked 藍圖；沒有 package/public/scripts/test；未操作根 Git index、commit 或分支。
- 實際改檔：package.json、scripts/{serve,check,build}.mjs、public/index.html、public/styles/{tokens,app}.css、public/js/app.mjs、test/scaffold.test.mjs、project.json implementationStatus、HANDOFF.md；dist 由 build 生成。
- 環境：Windows 11 Home 10.0.26200、Node 24.14.0、npm 11.9.0、PowerShell 7.6.5；RAM 34,163,732,480 bytes（約31.82 GiB），CPU 回報 Genuine Intel(R) 0000。最低8 GB相容性未驗證。
- 命令：`npm.cmd test` exit 0，3/3；`npm.cmd run check` exit 0；`npm.cmd run build` exit 0。修正一個繁體字後，只重跑受影響的 check/build，兩者 exit 0。
- `npm.cmd run dev` 實際綁定 `127.0.0.1:4191`（本任務指定取代舊4173）；HTTP 200、text/html、nosniff、CSP、X-Robots-Tag noindex。測後 Ctrl+C＋確認，只停止本次 session。
- Node 回歸涵蓋 GET/HEAD、POST 405、非 public 404、編碼／雙重編碼／反斜線／NUL、父目錄穿越403、相鄰目錄包含性。無上傳 endpoint。
- 瀏覽器：本次建立的 Chrome 專用分頁；桌面與320px實際截圖確認任務區與「技術驗證中」可讀、選檔／轉換不可用；未載入 runtime，未冒充成功結果。完整200%／鍵盤／產品流程留至 T04/T05。
- 設計：Product App；沿用相同hash的家族與本工具設計系統。暖紙 #f3f0e8、墨 #111410、白 #fff、酸綠 #c8f56a、注意 #fff0d5；系統字型。桌面與手機皆為「標題 → 主要選檔工作區 → 限制說明」，無側欄／裝飾。
- 證據：`.runs/video-to-audio/20261010-thread-11/t00-{test,check,build}.txt`、t00-exits.json、t00-preview.json；專用證據不進發布副本。
- 環境 guard 前值 PASS 已記 environment-before.txt；User PATH ExpandString 長834／暫存0，Machine PATH String 長1227／暫存0，完整hash與Environment fingerprint保留於證據，結尾再比對。
- 判定：T00 PASS，不代表媒體可行或MVP完成。下一項 T01。

## 2026-10-10／T01：固定依賴與來源

- 任務／需求：T01、FR-03/04/09/10；只使用核定 @ffmpeg/ffmpeg＋單執行緒 @ffmpeg/core。
- 改檔：package.json、package-lock.json、public/runtime-manifest.json、docs/DEPENDENCIES.md、TASKS.md（入口已授權的雙語／SEO與來源交接補充，保留硬前置）、HANDOFF.md。
- 官方 release v12.15 對應 wrapper 0.12.15／core 0.12.10，固定 package registry metadata、SHA512 integrity；transitive 僅 @ffmpeg/types 0.12.4、MIT、registry.npmjs.org；無 scripts、core-mt、util、付費或遠端服務。
- 官方固定 source 核實 ffprobe API／JSON輸出、module worker 同源 coreURL、單執行緒 memory growth、GPL/libx264/libmp3lame build 配置。AAC/H.264/lavfi／codec能力仍須 T02 實跑。
- 授權：wrapper MIT、core GPL-2.0-or-later；不是全MIT。正式 binary 分發須保留授權與對應來源，詳見 DEPENDENCIES；可移動 codec branch 不假裝 immutable。本機 spike 不發布二進位或網站。
- 命令：精確版本 `npm.cmd view` exit 0；`npm.cmd install --package-lock-only --ignore-scripts --no-audit --no-fund --cache <專用 .runs>` exit 0；`npm.cmd run check` exit 0。lockfile 已逐項核對只有三包、官方 registry、版本與integrity。
- manifest files 暫空，尚未載入資產；無假hash。此為不可載入占位，T02 stage 後必須變完整有效清單，80MiB 硬預算不變。
- 瀏覽器：T01 不需要產品／效能測試，NOT_RUN；下載容量／資產bytes／效能未驗。下一項 T02。

## 2026-10-10／T02：真實媒體gate失敗與收斂

- 任務ID：THREAD-11-video-to-audio / T02。需求：FR-02/03/04/06/07/09/10/11、VA-07與T02六gate。
- 實際改檔：scripts/{stage-vendor,serve-spike,check,build}.mjs（build本輪無內容變更，實際執行），public/vendor/ffmpeg/**、runtime-manifest.json、js/ffmpeg-adapter.mjs、js/core/manifest.mjs、test/manifest.test.mjs、test/spike/{index.html,spike.mjs,fixtures.mjs,audio-metrics.mjs}、docs/{DEPENDENCIES,SPIKE-RESULTS,RELEASE-CANDIDATE}.md、HANDOFF.md、README.md、本工具.gitignore。依入口已授權新增.gitignore，node_modules僅npm生成。
- T00擁有範圍內的相依修正：serve.mjs新增精確manifest檔案mount／精確license MIME／固定版本vendor一般HTTPcache；package.json的test限定全部test/*.test.mjs，避免Node把interactive spike頁當Node測試；最終index/app/scaffold.test將預覽改為明示「技術驗證未通過」。沒有假產品流程。
- 安裝：`npm.cmd ci --ignore-scripts --no-audit --no-fund --cache <專用.runs>` exit0；stage最終exit0。只三包精確版本，9原文執行資產32,360,894bytes，加兩份官方授權文本。各bytes/hash／80MiB檢查真實。
- 已修正並保留失敗證據：license檔名白名單點號問題；index.js對types.js的必要export原始清單漏檔。check正確拒絕，補齊後通過，不手改上游或削弱引用要求。
- 本機：Windows11Home10.0.26200、31.82GiB RAM、WMI CPU GenuineIntel0000/24cores/32threads。最低8GB未驗。Chrome154.0.8037.98/Edge154.0.4258.62皆由真實分頁fullVersionList確認。
- 真Browser：引擎本機cold下載/初始化Chrome161.60/125.40ms、Edge217.70/149.50ms；不代表網際網路hosting速度。`-version` exit0回FFmpeg5.1.4、GPL/libx264/libmp3lame/singleThread。
- 真Fixture：10秒H.264/AAC蓝底/440Hz生成exit0；兩瀏覽器168,826bytes、SHA256 `5fb17a48ce4967422017c555c6fdbc9870292f4935f9695fef99626cc408ce12`。Chrome/Edge probeExit均**-1**（47/36.5ms）。核心權威退出碼gate **FAIL**；沒有讀非零結果作成功或把-1映射0。
- 上游官方issue817相符。沒有更換未鎖候選、手改vendor、使用core-mt、雲端API、CDN或放寬產品限制。可用registry正式core最高0.12.10；有修正commit不代表既有binary修好。
- NOT_RUN：180秒fixture和兩瀏覽器各3warm、renderer+worker每秒記憶體、完整3×3取消與worker消失、音質數字與試聽、真離線/完整Network、productiontimeouts。短片診斷心跳Chrome71.6ms/Edge6.8ms只作局部證據，不推廣成完整gate PASS。
- 最終命令：`npm.cmd test` exit0、6/6；`npm.cmd run check` exit0；`npm.cmd run build` exit0、18靜態檔。最終source不變後不再全面重跑。dist不含測試媒體/.runs/node_modules/docs/秘密。
- 專用證據verify-build helper首次相對import多一層而exit1；修正為本工具check的正確路徑後exit0，逐檔path/bytes/SHA256證明18個public與dist完全相同，無mediafixture。證據build-integrity.json／build-integrity-check.txt；這不是媒體gate PASS。
- Server：preview127.0.0.1:4191、spike127.0.0.1:5191；測後Ctrl+C自己的sessions，中斷型退出碼1如實記錄。未佔用其他埠／殺其他server；量測鎖原子取得與核對owner後釋放自己的鎖。
- Guard：安裝與長自動化前後User/Machine PATH hash/type/length/ephemeral0與整個Environment-key fingerprint全部 unchanged；完整表在RELEASE-CANDIDATE。沒有持久環境／憑證／Cloudflare操作。
- 瀏覽器最後preview桌面/320px：明示gate未通過、選檔/轉換disabled；截圖final-blocked-preview.jpg/final-blocked-mobile.jpg，專用證據`.runs/video-to-audio/20261010-thread-11/`。
- 判定：**T02 FAIL / BLOCKED**，不是本機MVP完成。T03–T07與雙語/SEO後續未開始；本對話未GitHub發布，repo PUBLIC/remote HEAD NOT_RUN；hosting未部署，候選audio.glossquote.com未驗live。
- 交接：docs/RELEASE-CANDIDATE.md已完成BLOCKED版本，供原主對話獨立查看。下一步是T01核實正式修正版，或原主對話新增固定source-build的明確範圍，再完整重測T02；不需要重複已有來源/free-hosting授權。

## 2026-10-11／MEDIA-11-UNBLOCK：真實退出碼與隔離探測

- 需求／範圍：解除FR-02/07的既有ffprobe綁定阻塞，保留exit0才讀JSON的規則。主代理已核准第一方入口＋每次新探測Worker；本次不擴大輸入codec、依賴或完整MVP範圍，先在TASKS列明allowed paths。
- 根因：官方v12.15 bind.js丟棄native `_ffprobe`正常回傳，C ffprobe直接回傳狀態而不走ffmpeg的ret寫回；worker讀取未更新的-1。official npm latest仍0.12.10/0.12.15；issue817修正commit不是已發行binary。
- 改檔：public/js/core/{ffprobe-return,ffprobe-core,isolated-probe}.mjs（新）、public/js/ffmpeg-adapter.mjs、test/ffprobe.test.mjs（新）、test/spike/unblock.mjs（新）、test/spike/{index.html,spike.mjs}、scripts/serve-spike.mjs、TASKS.md、HANDOFF.md、docs/{DEPENDENCIES,SPIKE-RESULTS,RELEASE-CANDIDATE}.md。dist由既有build生成；package、lock、manifest、vendor未變。
- 實作：攔截原binding的native呼叫並保留signed-i32正常退出碼；非整数、undefined、trap都拒絕。原上游binding仍擁有argv分配；一個探測只使用一個新worker，finally／dispose終止並整體釋放它持有的C狀態與記憶體；沒有新增手工argv配置、手改vendor或把-1映射0。
- Chrome154.0.8037.98與Edge154.0.4258.62：真正瀏覽器各重現原始-1；修正入口五次有效H.264/AAC exit0，夾在損壞／空白／截斷／缺失檔案exit1之間，每次正確拒絕且後續有效探測成功。兩者實際合成片168826bytes，hash沿用`5fb17a48ce4967422017c555c6fdbc9870292f4935f9695fef99626cc408ce12`。
- 真MP3兩瀏覽器均convertExit0、161376bytes、mp3/44100Hz/2ch/128000bps、duration10.057143秒，與10秒差0.057143；每瀏覽器10次探測Worker終止API呼叫。這不是OS程序消失或音質SNR/試聽的證據。
- 主代理獨立IAB Chrome155.0.8059.27再次點擊同一harness：相同original-1／5次0／4次1／MP3與10次termination，無error；證據由主代理保管 `.runs/media-unblock-20261011/primary-video-browser.json`。
- 命令：`node --test test/ffprobe.test.mjs`初次exit1、7/8（test fake的default將undefined變0；已修fake保留undefined，沒有放寬產品gate），修後exit0、8/8；最終`npm.cmd test` exit0、14/14；`npm.cmd run check` exit0；`npm.cmd run build` exit0、21files。官方九檔與installednpm原檔、manifest逐項hash完全相同；21個source/dist檔bytes/hash核對相同。
- 專用證據：`.runs/video-to-audio/20261011-unblock/`的registry-metadata.json、ffprobe-unit.txt、final-{test,check,build}.txt、final-exits.json、{chrome,edge}-browser-proof.json/.png、vendor-byte-proof.json、build-byte-proof.json、measurement-lock-{acquired,released}.json、environment-*.txt。只用固定合成媒體，不存私人檔案或原始stderr。
- 環境：長測量與最終checks前後guardPASS且unchanged；HKCU ExpandString長834／暫存0／PATHsha256 `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb`、Environment `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a`；HKLM String長1227／暫存0／PATH `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8`、Environment `a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82`。未改持久環境、讀憑證、發布或部署。
- 清理：原子取得量測鎖後只核對／釋放自己的鎖；測後只關自己Chrome/Edge兩分頁。主代理獨立驗證完成後Ctrl+C自己的server session82759，exit1為中斷型退出；沒有殺其他process或server。
- 判定：**MEDIA-11-UNBLOCK PASS；T02完整gate與產品/release仍BLOCKED**。每次探測worker的載入／媒體拷貝成本必須納入後續速度、峰值記憶體與取消量測；180秒各3warm、每秒renderer+worker、SNR與人工試聽、下載/probe/轉換3×3取消、完整Network／真離線／productiontimeouts仍NOT_RUN。下一步繼續T02，未進T03。

## 每次交接追加格式


~~~text
日期／模型：
任務 ID：
需求 ID：
變更檔案：
命令與退出碼：
瀏覽器／作業系統：
人工案例與 PASS / FAIL / NOT_RUN：
剩餘問題：
下一步：
~~~

## 發現規格矛盾時

記錄兩份文件的位置、具體矛盾、保守處理方式與需要的決定。未解決前不放寬資料、安全或發布邊界。

## 主代理整合驗收（2026-10-11，MEDIA-11-UNBLOCK）

- 親自讀過 native-return bridge、一次性 Worker、adapter 整合與實際測試 harness；沒有以子代理的 PASS 自述代替審查。
- 主代理在自己的 Codex 瀏覽器分頁（Chrome 155.0.8059.27）實際操作：保留原始 -1；5 次有效探測回 0；壞檔／空檔／截斷／缺檔回 1；成功產生 161,376 bytes MP3，時長 10.057143 秒；10 個探測 Worker 終止，errors 為空。這是有界修正驗證，完整 T02 仍未完成。
- 獨立 `npm test` 14/14、`npm run check`、`npm run build` exit0；21 個 source/dist 檔案逐一 bytes/SHA256 相同。證據 `.runs/media-unblock-20261011/11-video-to-audio/2026-10-11T07-10-45.559Z/` 與 `primary-video-browser.json`。
- 收尾發現預覽仍顯示過期的「音軌檢查元件未通過」，僅更新 public/index.html 為修正通過但完整效能／記憶體／音質待驗；保持 disabled/noindex。重跑受影響 scaffold 3/3 與包含 check 的 build 通過，HTML source/dist 再核對一致；見 `video-preview-correction.json`。媒體程式未再修改，重用上述瀏覽器證據。
- 解除舊 ffprobe 阻塞通過；完整 T02／MVP／GitHub 與正式部署未完成。原子量測鎖已釋放，自有驗收分頁關閉，子代理建立的伺服器已停止。

## 2026-10-11／RESUME-11-T02-20261011：四gate通過，保留Network／Offline缺口

- 交付與觀察條件：補齊真正Chrome/Edge的T02速度、每秒renderer＋Worker程序記憶體、PCM音質與試聽、下載/probe/convert各3取消、完整production timers、缺失／完整性及離線Network；全部六gate有證據才可T03。沿用已驗binding，不重做根因研究，不將Node或mock冒稱真媒體。
- 實際改檔：`test/spike/{index.html,spike.mjs,observed-worker.mjs,worker-observer.mjs}`、`scripts/serve-spike.mjs`、`test/manifest.test.mjs`、`public/js/ffmpeg-adapter.mjs`、`TASKS.md`、`docs/{SPIKE-RESULTS,RELEASE-CANDIDATE}.md`、本HANDOFF。專用新證據只在`.runs/video-to-audio/20261011-resume-t02-0918/`；沒有改vendor/package/lock/manifest、其他工具／首頁／根Git index。
- 實作：test-only Worker observer import原官方Worker，記真native start、reply與ResourceTiming；取消等待原生開始後終止。下載case以spike-only uncached load取得真HTTP流，保留正常load force-cache。test server可回真404、傳输WASM一byte篡改、1MiB/100ms慢流、125秒停滯；磁碟官方檔不改。新增30秒觀察窗、實際音檔導出與own-origin storage計數，不讀cookie或私人內容。
- 速度PASS：Chrome／Edge各10秒與180秒3輪。最終180秒轉換Chrome2115.3／2213.3／2158.8ms，Edge2342.2／2111.1／2111.8ms；含write、兩次一次性probe、read的完整工作Chrome2329.3／2400.3／2379.7ms、Edge2718.1／2311.9／2285.7ms。Fresh九檔HTTP下載／初始化Chrome212.6／177.7ms，Edge245.4／171.0ms；總32,360,894bytes。本機loopback／既有WASM編譯cache条件，不是hosting性能。
- 程序記憶體PASS：使用者Task Manager回覆Chrome74216／Edge66864；原生DedicatedWorker threads確認同PID，去重總計。初始private基線87.2305／103.5703MiB，觀測peak339.3906／522.0547MiB，增量252.1602／418.4844MiB≤1GiB；WorkingSet另記374.1641／497.0430MiB，增量也通過。三輪末10秒private基線增量Chrome−5.6563／20.0820／7.6602MiB、Edge18.2930／−13.4336／9.4766MiB≤100MiB。每次取消30秒皆有30或31筆counter。Chrome初始1筆、Edge295筆；必要warm/cancel窗口每秒資料完整，collector接續之間的約29.83秒idle空檔已標明。
- 音質PASS：四種合成聲音逐聲道SNR26.02197–26.06368dB、正弦頻差最大約0.000329Hz，duration差0.057143秒（10秒）／0.035918秒（180秒）；±4096脈衝相關offset0、不調gain、無全零／削頂／交換聲道。使用者聽四檔並回覆「未聽到異常」。Chrome/Edge各四個真正MP3已保存；相同hash僅確認人工聽到的內容相同，不作lossy品質快照。
- 取消PASS：每瀏覽器9次實際取消與成功10秒重試，UI約0.1–0.3ms，沒有半成品／舊結果復活。下載於324,482–1,177,051bytes且Worker建立前中斷；probe原生OS退出52–66ms，convert約1.86–2.03秒；一秒門檻是UI，沒有隱藏OS退出延遲。30秒末已無取消Worker。100ms heartbeat最大延誤Chrome34.1ms／Edge41.5ms。
- 真故障與完整timeout PASS：兩瀏覽器缺失WASM RUNTIME_LOAD_FAILED、篡改RUNTIME_INTEGRITY_FAILED，皆無Worker；125秒實際HTTP延遲觸發120秒JOB_TIMEOUT（Chrome120013.1／Edge120009.4ms）。Worker真native操作完成後由test observer抑制一個response，原60／15／180秒outertimer完整跑完、JOB_TIMEOUT及dispose；OS thread於terminate後13.3–47.6ms退出。這是無回覆transport注入，沒有聲稱native CPU deadlock；未用縮短timer或mock fetch。
- 已載入runtime、server真正停止後轉換PASS：Chrome與Edge原生fetch確實失敗，僅HTTP-cached同源Worker imports與驗hashWASM Blob仍產生有效MP3。資料在`{chrome,edge}-unreachable-origin.json`；這個結果與真正DevTools Offline分開。
- **必要未驗：G1完整Network、G6真正DevTools Offline。** 主頁舊ResourceTiming達250筆cap，所見主頁／Worker／server請求同源但不能稱完整trace。已把測試頁buffer改10000，需新錄製；瀏覽器工具缺少Network／Offline API，已請使用者在Chrome5191與Edge60206開Network錄製，之後先重載記錄再切Offline。不以已載入server斷線或使用者人工NOT_RUN授權替代這兩個gate。
- 命令：最終`npm.cmd test`exit0，15/15；`npm.cmd run check`exit0，包括最後spike buffer／證據文案修改後受影響check；`npm.cmd run build`exit0、21files（其後public未改，重用結果）。`verify-static-evidence.mjs`exit0核對21個public/dist與9個official npm/manifest bytes/hash完全一致，無測試媒體；`analyze-process-evidence.mjs`、`verify-timeout-worker-exit.mjs`、`summarize-evidence.mjs`各exit0。真媒體與外部counter／試聽由`t02-results.json`整合，raw頁面NOT_RUN欄位沒有假改成頁面已自行量測。
- helper故障如實保留：首次server helper相對import多一層exit1，改正後正常；程序差分無法歸屬的初批資料排除；HRESULT正數成功判讀已更正；清理最初因PowerShell JSON日期自動轉型而fail closed、沒有停任何process，改保留日期string後核對exact owner/Node command/creation才停止五個自己的helper。舊helper listener已SIGINT关闭但stdin仍存活，核對後停止，session exit1記為清理結果。
- 環境PASS／unchanged：`environment-before.txt`與`environment-after.txt`完整Snapshots逐項相同，見`environment-comparison.json`；HKCU ExpandString長834、16entries、ephemeral0、Environment18項；HKLM String長1227、30entries、ephemeral0、Environment26項。PATH及Environment key四個SHA256與上節完全相同，TEMP/TMP的型別／長度／hash亦相同。沒有修改持久環境或讀憑證。
- 清理／續接：所有程序counter與高頻thread collectors已停止，只釋放ownerId `a5f66477-d7ef-4956-9db4-0b66cc5084bd`自己的lock。保留兩個自有loaded測試分頁與Network準備用loopback helper：main-v3 PID52892／5191（exec session55353），edge-v3 PID74868／60206（session11491）；固定stdin `stop`可關閉。分頁已markHandoff，截圖`{chrome,edge}-t02-awaiting-network.png`。不關使用者DevTools／Task Manager，不保留故障server或重型sampler。
- 判定：**T02 PARTIAL / BLOCKED，G2–G5 PASS；T03–T07仍NOT_STARTED，MVP未完成。** 下一步只補新完整Network及真正Offline，若任一缺失／失敗仍停T02。原始binding FAIL與有界修正證據全部保留，沒有把四gate通過稱六gate通過。
- Source／hosting分開：本對話未發布；目標KYStr/glossquote-labs-video-to-audio，存在性／PUBLIC／remote HEAD／commit皆NOT_RUN；未建立發布副本、未根Git提交。hosting NOT_DEPLOYED_BY_THIS_TASK、live NOT_RUN，沒有憑證／DNS／Cloudflare／00-home操作。正式資產分發與GPL對應來源準備仍待release整合，不能把本機preview直接當可部署MVP；已有来源/free-hosting授權不需重問。

## 2026-10-19／U19-11：Chrome原生G1/G6通過，Edge隔離前置受阻

- 主代理實測，不是owner自行啟動：`.runs/browser-acceptance-2026-10-19/station-v3/u19-11-chrome-r3/result.json`兩案`U19-11-NETWORK|en`、`U19-11-OFFLINE|en`均PASS，failures與prohibitedEvents皆空；官方Chrome155.0.8059.84，native Chromium sandbox、非互動station-v3／獨立desktop及job guard。runner exit0；lock-released收據確認記錄的程序世代已退出、量測鎖已退還。
- G1：原HTTP spike載入前已記BrowserContext request/response/Worker/console/error與補充CDP favicon稽核；九個runtime原瀏覽器response bytes／SHA-256全符固定manifest。WASM32232419bytes，SHA256 `9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7`。使用同一CDP session、原fetch requestId讀body，導航前maxResourceBufferSize67108864／maxTotalBufferSize134217728；沒有另作Node請求替代browser body。完整同源native Worker graph已觀察；不以ResourceTiming容量列表作完整Network證據。
- G6：server持續運作，真正`context.setOffline(true)`後`navigator.onLine=false`，manifest原HTTP請求實際失敗，已載runtime仍完成原offline控制與fresh10秒重試；新建四個native probe Worker均有FFPROBE開始與終止。輸出exit0、161376bytes、MP3／44100Hz／2ch／128000bps、10.057143秒。沒有把server停止或Node模擬當Offline。
- R1／R2失敗原件保留。R1是inspector cache淘汰32MiB body的capture錯誤，非產品runtime hash損壞；R2已驗原WASM body，後因favicon404在context stream外而受阻。R3只補同一CDP session的唯一同源無query/body GET→404→loadingFinished及精確console文字／位置稽核；缺少完整CDP證據仍拒絕，其他錯誤不豁免。harness SHA256 `7b09a4b898a6f8b33f21c72321e918c14ffa4f9e6f1f959205ba838ba0eee60a`。
- Edge R3/R4在原產品頁導航／操作前guard拒絕，不能填G1/G6 PASS。R4的`tree-1.json.rejected.json`記`REJECTED_JOB_MEMBERSHIP`、browser PID48156、identity_helper PID89564、hasExited=false；收據中已驗證的msedge列均在task job且有desktop／Win32k證據，但helper不在job。不能由程序名稱推定安全、強行收編／終止它或改身份／profile。這是隔離前置未通過，不是媒體轉換測試失敗。
- 只讀原因：目前guard以CDP PID清單再`Get-Process`查當時程序，沒有保留該PID的原始process generation、完整image path或CDP role；所以僅憑收據不能區分共享／broker路徑與PID世代錯配。現有Boundary.cs已使用kill-on-close且無breakaway，不能以重跑或加猜測feature旗標當解鎖。已安裝155.0.4283.45的固定`identity_helper.exe`版本描述為PWA Identity Proxy Host；此靜態file metadata不等於已驗證PID89564的實體path／啟動原因。
- 具體下一步：主代理先只讀核對既有同期CDP role／process handle generation與精確PID的建立時間、image、parent、job／desktop metadata；不得讀profile/token/credentials或取得輸入焦點。若無同期世代證據，不回填歷史身份；若確為外部helper路徑，維持現有guard與BLOCKED，改由主代理評估既有、可證明包含所有helper的獨立Windows11驗收環境。沒有此環境證據時需先解決測試基礎設施，不能在使用者目前輸入session反覆啟Edge。詳見owner-11的`edge-isolation-analysis.json`；owner只讀檔案證據，未改wrapper或啟動Edge／即時程序診斷。
- 本輪只更新本HANDOFF、docs/SPIKE-RESULTS與owner-11分析／收據；確認兩份docs不在40檔candidate pin內，產品、runtime、harness及candidate未改。此前速度／記憶體／SNR／取消不重測，也不新增Chrome155或最低8GB普遍性能聲明。
- 判定仍`BLOCKED_EDGE_ISOLATION_GATE`，未進T03、來源未由本task發布、hosting未由本task部署。舊證據、使用者程序、帳號、profile、系統設定與共享路徑保持原狀。

## 2026-10-20／MS20-11：保留 Chrome＋Edge，等待安全隔離驗證

- 使用者明確決定：「保留 Chrome＋Edge，等安全隔離驗證完成再發布」。原支援範圍與 Chrome／Edge 必要驗收要求維持不變；Chrome-only 方案未採用，不再列為等待使用者選擇。
- 狀態仍為 `BLOCKED_EDGE_ISOLATION_GATE`；Edge G1／G6 維持 NOT_RUN，不能以既有 Chrome 證據替代，也不因此進入 T03 或後續發布里程碑。
- 已核對結論與證據沿用 `.runs/media-unblock-followup-2026-10-19/owner-11/REPORT.md` 及既有 Edge R3／R4 收據；原始失敗、Chrome 版本限定的 PASS 與所有未驗範圍保留，不重新分析、讀取全部證據或重跑測試。
- 本任務只追加本 HANDOFF，並建立 `.runs/media-support-decision-2026-10-20/owner-11-ack.json`；以檔案雜湊與追加內容核對確認舊記錄完整保留。純文件變更，browser／test／release 均未執行；未修改 candidate、runtime、既有 ZIP、shared station、安全 guard 或主代理看板。
- 下一步仍由主代理在安全隔離能力獲得驗證後補齊原 Edge 必要 gate；在此之前維持阻塞，不沿用失敗設定反覆啟動瀏覽器、不建立新隔離環境。必要驗收通過後才依原里程碑與既有授權推進發布，本次不開始新 milestone。

## 2026-10-20／MU20-11-M1：連續handle採集候選v2，原生與Edge仍未驗

- 保留使用者已決定的Chrome＋Edge支援與全部原驗收要求，狀態仍`BLOCKED_EDGE_ISOLATION_GATE`。本輪只完成主代理可審查的採集候選，不進T03、不發布；沒有啟動瀏覽器／原生collector／Node校準fixture、即時查詢未知程序或修改shared station。
- 新交付位於`.runs/media-continue-2026-10-20/owner-11/`：`NativeContinuationCollector.cs`為query-only x64 library，僅從自有job清單開process handle，保存FILETIME／QPC／job／image／desktop object或實際Win32k denial；跨capture使用同一SafeHandle，flush後才關自有handles。未知raw PID不觸發額外程序查詢，live outside-job／缺失世代／邊界不足仍拒絕。詳見README／CALIBRATION。
- 依主代理review補固定官方SDK ABI：Microsoft win32metadata提交`c16762d41f1bd641ff8c4389ebf16ee50747129f`的ProcessSnapshot.h，19欄位、120bytes、Pack8／FILETIME Pack4與四常數均有header-derived及Marshal反射證據；DLL只為type metadata載入，未建構collector或呼叫其P/Invoke。無本機SDK安裝／原生C++ sizeof／PSS校準；CreateTime是否實際非零仍須原生驗證，零值拒絕。詳見ABI.md與abi-metadata.json。
- Node原語校準使用獨立factory／StartCalibration／FinishCalibration及receipt kind，rawCdpJson=null，不偽造browser processInfo；browser判定器拒絕Node kind。fixture只有明確EXIT_ACK＋原始handle觀察exit0才算受控退出；timeout／stdin關閉分別exit3／4。job B負例由主代理native host使用其原始自有handles做單次membership probe，本collector不新增任意PID查詢。
- 實際檢查：compile-2 x64 library exit0、warn-as-error零警告；7個ESM語法檢查exit0；原26＋新51項離線synthetic測試77/77 PASS。compile-1／offline-1及原source／DLL保留，返工只重跑受影響項。原生Node校準、Edge G1／G6及安全隔離均NOT_RUN／BLOCKED，純資料／managed layout PASS不替代native驗收。
- 安全Edge方案提出使用已存在、獨立的Windows11實體驗收機與既有非互動執行器，涵蓋job外helper的整個OS／輸入面；環境能力目前NOT_ESTABLISHED，未建立或配置。它只隔開使用者輸入，不能替代helper的job歸屬；未知live outside-job仍在產品操作前拒絕，不同設定也不自動放行，詳見EDGE-ISOLATION.md。
- 本輪只改本HANDOFF及新owner目錄；固定40檔媒體candidate／source、vendor／runtime與舊證據不改。來源／部署／首頁／帳號／VM／服務／registry／持久環境／憑證未操作。最終owned diff、candidate inventory SHA與前後環境核對收於owner的owned-change-set.json／candidate-inventory.json／final-validation.json，由主代理收取、親驗與整合單一ZIP。
- 下一步：主代理維持原始job／desktop lease與正確跨程序handle傳遞，先親驗自有Node原語與負例，再確認真正涵蓋Edge助手的安全執行能力。採集器本身未排除助手問題；未取得安全能力前不重啟同一Edge設定，T02必要前置通過後才依原milestone推進。

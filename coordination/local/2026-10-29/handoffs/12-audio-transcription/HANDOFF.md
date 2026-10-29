# 短音檔本機逐字稿：實作交接

- 藍圖版本：1.0
- 初始日期：2026-09-23
- 產品狀態：T01 PASS；R11 Chrome155完整正常記憶體／合成品質子項PASS（234筆、Private增量1.2228889465332031GiB）；完整T02仍BLOCKED_REMAINING_GATES。歷史1.681110GiB FAIL保留。
- 目前任務：MU20-12-M1（2026-10-20）準備AT15真缺檔／改一byte／redirect故障驗收；不改生產loader、模型或門檻，尚未執行本輪browser。
- 下一步：主代理綁定本輪候選並隔離Chrome執行AT15；之後才AT12／14。R9原生Network 32筆EOF／hash完整但10個ERR_ABORTED仍未解，不改為全Network PASS，不推T03／GitHub／部署。
- 程式碼：固定19項資產已stage，最小Worker harness已有中英推論；產品頁仍noindex／不接受音檔。
- 自動測試：最近完整產品54/54、舊normal-entry7/7已由主代理獨立重跑正常exit0；本輪focused結果另記本頁末與新owner清單，未變產品tests重用。
- 瀏覽器驗收：目前可採認R11 Chrome155三輪品質／時間／UI／全零／OS記憶體子項；Edge、完整Network與取消／offline／fault必要項未齊。舊Chrome1.931442與1.681110GiB失敗及R10 exit1不覆寫。
- build：最近29publicfiles PASS；本輪public未變，重用原結果；不含test/spike或假語音，不是可發布產品。
- 來源發布：已有根 AGENTS 的狹義授權；尚未達產品必要 gate，NOT_RUN。
- 正式 hosting：本對話不得部署，待主對話統一整合；NOT_RUN。

## 已固定的產品決定

以 PRODUCT.md 與 TECHNICAL.md 為準。不要重新詢問已有預設，也不要把未來功能加入 MVP。
2026-10-11主代理核准固定`Xenova/whisper-base@64da57285918e20ea79ea5c88eed7197933abaa8`替代；仍為多語base、encoder／merged decoder q8，Transformers3.8.1、78項package-lock不變。轉換模型自己的固定card明示Apache-2.0；原onnx-community候選缺少直接授權聲明的歷史保留，沒有宣稱原候選法律禁止使用。最小stage／推論不能替代完整T02。

## 進度表

實作開始後逐項追加 TASKS.md 的任務 ID、狀態、日期、證據連結。只記真正做過的事，不預先勾選。

| 任務 | 狀態 | 證據 |
|---|---|---|
| T00 | PASS | 下方2026-10-10命令與HTTP記錄 |
| T01 | PASS | 固定19項真manifest／stage／授權，45項移交snapshot一致；原chat已驗test/check/build |
| T02 | PARTIAL_PASS_CURRENT_CHROME；BLOCKED_REMAINING_GATES | R11 Chrome155：234筆／37項、Private增量1.2228889465332031GiB、三輪品質與靜音PASS；舊1.931442／1.681110GiB FAIL保留；Edge／Network／取消／offline／fault未齊 |
| T03–T09 | NOT_STARTED | 未越過必要前置gate |
| T10 | 阻塞交接已記錄 | docs/RELEASE-CANDIDATE.md，非READY_FOR_INTEGRATION |

## 2026-10-10 T00 開工範圍

- 交付：Node 24+ 原生 ESM 靜態骨架，有效 test/check/build、僅 public 的 loopback 預覽、穿越拒絕與 noindex。驗收条件是實際命令退出0及HTTP回應符合契約；這不是模型或本機 MVP 通過。
- Node v24.14.0、npm 11.9.0；指定 model=gpt-6.1-sol / thinking=max 有建立工具紀錄，後端路由未確認。無子代理、無其他對話傳訊。
- 界面採既有 Product App 工作流程。主要物件是待產生逐字稿的工作區；目前禁止選檔以如實反映 T02 未驗。桌面／手機皆為頂部品牌、標題、全寬預覽狀態、限制說明；不新增設計系統。
- 路徑例外依 TASK-ENTRY：預览4192、spike5192；占用時選空閒 loopback 埠並記錄。未修改其他工具、首頁或根Git index。
- 持久環境前值：`.runs/audio-transcription/2026-10-10-environment-before.json`。HKCU/HKLM均無 ephemeral entry，完整指紋已保存。

### T00 驗收（2026-10-10）

- 變更：package.json；scripts/serve.mjs、check.mjs、build.mjs；public/index.html、styles/tokens.css、styles/app.css、js/app.mjs；test/scaffold.test.mjs；project.json；本交接。
- `npm.cmd test`：退出0，3/3 PASS。涵蓋靜態根、noindex/security headers、GET/HEAD、POST405、穿越／隱藏路徑拒絕、目錄及非public404。
- `npm.cmd run check`：退出0，8個來源檔。`npm.cmd run build`：退出0，4個public檔生成dist；沒有音訊／研究內容。
- `npm.cmd run dev`：成功常駐127.0.0.1:4192，PID50884。HTTP `/`=200、text/html、X-Robots-Tag=noindex,nofollow、1669 bytes。觀察後以該次session的Ctrl-C停止（退出1，正常中斷）；未終止其他進程。
- 真正瀏覽器與320px/200%：NOT_RUN，T00只要求骨架HTTP；正式工作流程屬T05/T06。音訊辨識與模型仍未驗。
- 判定：T00 PASS，開始T01。來源公開NOT_RUN、網站未部署。

## 2026-10-10 T01 結果及阻塞交接

- 需求：FR-03/04/05/10/12供應鏈研究；尚未聲稱功能或AT-09–15媒體能力PASS。
- 變更：package.json、package-lock.json、public/model-manifest.json、docs/DEPENDENCIES.md；TASKS新增T07雙語／T08 SEO／T09來源公開／T10成功或阻塞交接範圍，再回寫README及docs/RELEASE-CANDIDATE.md。
- 固定候選：Transformers3.8.1；ORT1.22.0-dev.20250409-89f8206ba4；多語Whisper base revision1846881b6b3a3024392c1eea3ad983695bc23925；encoder及merged decoder都是q8。manifest為null bytes/hash研究草稿，沒有假hash。
- 官方Hub及npm研究腳本退出0，來源標示候選101,774,625 bytes／97.05985 MiB；這不是模型下載／初始化／推論量測。官方Transformers／ORT tarball僅在記憶體驗SHA512並讀檔案目錄，沒有解包或執行runtime。
- 以完整Node/npm CLI、空白隔離npmrc及專用cache執行等價`npm install --package-lock-only --ignore-scripts --no-audit --no-fund`退出0；78項lock來源／精確版本／SHA512欄位檢查退出0。沒有node_modules或install scripts。
- 固定模型cardData無license，整個固定檔案樹無LICENSE／NOTICE；查全部5個歷史commit，4個可讀README均無授權，初始README404。上游原始Whisper MIT、HF上游模型卡Apache、Transformers Apache及ORT MIT各有官方依據，但候選轉換權重分發條件未確認；按TECHNICAL和T01完成條件停止。沒有聯絡作者或擴大候選。
- 一次查HF上游`LICENSE`路径404、研究腳本退出1；之後以官方固定README/LICENSE及模型卡取得實際證據，沒有盲重試或捏造license檔。
- 回T00 owning paths補強static root遭junction置換時拒絕，build先驗整份允許清單再清dist；新增junction regression。最後`npm.cmd test`退出0 **4/4 PASS**、`npm.cmd run check`退出0 **9檔**、`npm.cmd run build`退出0 **5 public檔**。這輪重跑是相關安全程式變更所需；後續文件回寫沿用證據。
- dev PID50884已不存在；未動其他進程、未讀憑證、未改根Git index／分支／commit或其他工具。未進T02，沒有申請或刪除共享量測鎖。
- 環境guard前後退出0/PASS，HKCU PATH ExpandString長834、SHA3efe0b0e…、Environment-key3a36b632…；HKLM PATH String長1227、SHA52d7cb0c…、Environment-keya0f49688…；ephemeral數均0、TEMP/TMP全部不變，snapshot逐欄相同。完整值在專用before/after JSON及RELEASE-CANDIDATE。
- 真正瀏覽器、Chrome/Edge版本、voice、CER/WER、速度、renderer+worker記憶體、取消及離線／網路均**NOT_RUN**，不能由人工例外略過T02。繁中＋英文完整介面和SEO尚未實作，只建立了未來任務範圍。
- 判定：**BLOCKED_T01_MODEL_DISTRIBUTION**。來源GitHub：NOT_RUN／未驗URL、PUBLIC、remote HEAD；hosting：NOT_RUN／未部署，候選域名不是網站上線。不是READY_FOR_INTEGRATION。
- 下一步：官方可追溯候選授權或完整適用分發依據補齊後恢復T01；若採原始MIT模型自行轉換，需另批准轉換工具／依賴／資產來源任務。既有來源公開／免費hosting授權不需重問，正式部署仍由原主對話整合。

## 2026-10-11 MEDIA-12-UNBLOCK移交原功能chat（非完成交付）

使用者明確要求由原功能chat自行修正。child收到停止指示時Edge中文推論已在進行，僅讀取並保存該現成結果、dispose／關閉自建tabs、釋放自有量測鎖、停止自有server及執行post-run guard；沒有再開新實作或最終gate。原功能chat為`01a12398-f45b-72d1-8690-66d3b6b7e93e`。本記錄優先於2026-10-10的歷史阻塞敘述；README／RELEASE-CANDIDATE尚未更新，DEPENDENCIES指向的SPIKE-RESULTS尚未建立，須由接手chat完成一致交接。

### 已完成內容與真實數據

- 固定候選研究18sources成功；主代理核准Xenova轉換repo自己的Apache-2.0聲明，OpenAI上游MIT、HF上游card、Transformers Apache、Jinja MIT、ORT MIT及完整ThirdPartyNotices分層保留。沒有從wrapper/base_model推定轉換權重授權，沒有法律保證。
- exact runtime以`npm ci --ignore-scripts --no-audit --no-fund --update-notifier=false`安裝53套件，空白task-owned npmrc／專用cache／子程序限定env，退出0；package-lock SHA256仍`b5cee76fc4eb6d936b3227ca8ab4eea142f45e571968e68c5fdab100d63cc91d`。不執行install scripts，不使用gated模型或凭證。
- `node scripts/stage-model.mjs --reuse-stage=<已核實的task-ownedstage>`最終退出0，19項真bytes/SHA256。成功證據`.runs/audio-transcription/20261011-unblock/stage-2026-10-11T07-11-03-239Z/`，來源與每項hash固定。logical總102,581,371 bytes：model79,677,901、runtime22,528,676、card/license/notice374,794；最大的decoder53,707,539。
- 固定selectedModel＋完整19檔closure在任何fetch前驗證；缺少runtime/model拒絕。下載只同源GET、omit credentials、error redirects、no-store，超量／short／錯SHA／abort fail closed。runtime模型讀取只verified Map；remote及browser/FS/custom cache停用，單thread WASM/proxy=false，verified wasmBinary避免ORT另fetch WASM。native ESM依固定URL／build hash／CSP，沒有宣稱原生SRI。
- 已安裝本機System.Speech離線voices生成兩個PCM16/16k/mono假句，沒有聲音播放或voice安裝。英文Zira 3.15s、100,846 bytes、SHA`cfee85e4f261be895a14a0014e5de9a962eae6b7872ce9a1ea8b5dec5a7d7cb5`；中文Huihui 4.867s、155,790 bytes、SHA`7f6becb5f8d3f27796e61e5969a0b0a24cb2a494f86ac451167c6e3d0a686d50`。使用reviewed inline PS5.1 -Command及乾淨child PSModulePath；沒有改ExecutionPolicy。
- Chrome154.0.8037.98最終smoke：download490.2ms／SHA97.4ms／init2102.2ms；英文4788.9ms、中文4431.0ms；max全頁100ms心跳延誤15.4ms。Edge154.0.4258.62：download544.1ms／SHA134.8ms／init3091.8ms；英文7013.6ms、中文7127.7ms；max全頁心跳延誤515.2ms。不是分階段或30秒三輪量測，不把這些當完整速度gate。
- 兩瀏覽器英文實際輸出`The blue cup is on the wooden table.`；中文參考`今天下雨了，我在家中休息。`，實際`今天下雨了,我再加中休息。`，保留在→再與家→加錯字，沒有人工修正或aggregate品質PASS。
- Worker resource timing均21項：19個manifest GET＋standalone Transformers／ORT glue兩個native ESM imports。native import額外重傳932,657 bytes，觀察Worker body總103,514,028；inference沒有新增resource，adapter blockedReads0，所觀察page／worker origin只有loopback。這不是封包capture或完整斷網／無upload驗收。

### 已跑檢查與未跑項目

- `node --test test/manifest.test.mjs test/staging.test.mjs test/asset-loader.test.mjs`：退出0，11/11 PASS；在新增resource timing evidence欄位之前。涵蓋缺完整closure前fetch拒絕、固定candidate、unknown/schema/path／caps、SHA／redirect／short／超量／abort／symlink／unlisted file等。
- `node scripts/check.mjs`：退出0，45files；在新增resource欄位與最後preview meta文案之前。初次empty test/.tmp誤判hidden source已修正並重跑，不放寬其他hidden/symlink限制。
- 兩次stage失敗各有新證據：HF固定LFS redirect hostname不在allowlist，查證後加入觀察到的精確hostname；compressed license的Content-Length與解壓實際bytes不同，改identity request且仍比對實際bytes/SHA後重跑成功。fixture runner最初inline無PSScriptRoot失敗，改已知childcwd後成功。先前研究cap不足tokenizer也改有界4MiB後成功。沒有盲重試同一404。
- **最終新快照`npm test`、`npm run check`、`npm run build`：NOT_RUN（使用者要求移交，未在停止後新開gate）。** T00既有4/4 scaffold結果可供接手檢視；本次沒有聲稱完整15tests或build通過。
- 完整T02的各語言5句CER/WER、30秒warm三輪、renderer＋worker總記憶體／清除後30秒、下載／init／inference各3次取消、全零聲音、瀏覽器缺檔／篡改／redirect／離線：NOT_RUN。T03–T09／MVP／來源公開／部署／首頁：未啟動。
- decoder超過主代理已查證的Cloudflare25MiB單資產限制；production wire chunk loader未實作。主代理有20MiB wire chunk同SHA前置證據，不能當成已發布／已解hosting。不得新增server compute／R2／付費或權限。

### 清理、環境與擁有範圍

- 自有spike server原`http://127.0.0.1:5192/spike/index.html`，PID77404/session66309；核實CommandLine為此tool的serve-spike後以該session Ctrl-C停止，退出1（正常中斷），PID已不存在。下次以完整Node路徑啟動`node scripts/serve-spike.mjs`；控制#load、#english、#chinese、#dispose；證據#report。沒有其他server／user tab被關閉。
- sharedlock僅自有MEDIA-12-UNBLOCK，07:22:13Z取得，07:32:43Z核對toolId/owner/taskId後釋放；保存measurement-lock-released.json。第一次清理命令的Set-Content -NoClobber參數錯誤，未刪lock；改FileMode.CreateNew保存紀錄後成功釋放。沒有刪除其他agent鎖。
- guard前後PASS、完整Snapshots逐欄相同：HKCU PATH ExpandString長834/SHA`3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb`，Environment-key`3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a`；HKLM String長1227/SHA`52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8`，Environment-key`a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82`；ephemeral均0，TEMP/TMP hash/type/length不變。後證據environment-after-transfer.json，退出0。沒有PATH／registry／ExecutionPolicy／pagefile／BCD變更或凭證讀取。
- 實際改檔：TASKS、TECHNICAL、HANDOFF、docs/DEPENDENCIES、.gitignore；scripts研究／stage／verify／serve-spike／make-speech-fixtures／run-speech-fixtures，加check/build；public/index既有meta狀態文字、model-manifest、core/manifest、asset-loader、transcribe.worker；test/manifest、staging、asset-loader tests與spike index/mjs、generated兩WAV及metadata；public/models及vendor19固定資產。node_modules為npm自動生成，未進public。未改package-lock、rootGit index／branch、其他tool、00-home、任何凭證／publication／hosting。
- append-only證據根`.runs/audio-transcription/20261011-unblock/`；chrome-minimum-proof.json、chrome-initial-minimum-proof.json、edge-minimum-proof.json都是觀察DOM及resource timing的明示摘要。接手應重新讀實際source；最終已改檔byte/hash snapshot另附ownership-transfer-files.json，不能冒充git基線diff。

## 2026-10-11 RESUME-12-T02-20261011 原chat接續（重型量測前準備記錄）

交付與驗收範圍是固定候選的完整T02，不是產品MVP。驗收要求兩瀏覽器的cold load、中英各五句與30秒三輪、100ms心跳、每秒OS renderer／Worker總記憶體與clear+30秒、九個取消案例、全零、完整性拒絕及已載離線／Network／Storage全部符合TECHNICAL七gate。尚未通過的必要項仍阻止T03。

- 已保存45項移交bytes/hash核對，全數相符後才接續編輯；沒有改舊`.runs/audio-transcription/20261011-unblock/`證據。新證據根為`.runs/audio-transcription/20261011-resume-t02/`。
- 本次改檔：`scripts/make-speech-fixtures.ps1`、`run-speech-fixtures.mjs`、`serve-spike.mjs`；新增`measurement-lock.mjs`、`sample-process-memory.ps1`、`run-memory-sampler.mjs`；`public/js/transcribe.worker.mjs`只補boot及全零audit證據；`test/fixtures/wav-builder.mjs`、`test/spike/index.html`、`spike.mjs`、`scoring.mjs`、`test/scoring.test.mjs`、`speech-fixtures.test.mjs`、`spike.test.mjs`及`t02-v1`假語音／metadata；`TASKS.md`、`README.md`、本交接、`docs/SPIKE-RESULTS.md`、`RELEASE-CANDIDATE.md`。模型／vendor／manifest／package-lock沿用移交版本，沒有新依賴。
- `node scripts/run-speech-fixtures.mjs --suite=quality`退出0：Huihui／Zira、System.Speech 4.0.0.0、rate=-2，10個5–10秒短句、兩個30秒組合、一個30秒全零，共13個有真bytes/SHA的固定fixture。不安裝voice，不接受任意使用者WAV；正式parser仍屬T03。
- 最終隔離離線npm命令採`--offline --update-notifier=false --no-audit --no-fund`與空白task-owned npmrc：`npm.cmd test`退出0，21/21、零fail/skip；`npm.cmd run check`退出0，77files；`npm.cmd run build`退出0，27publicfiles。原始stdout/stderr／exit在`offline-final-{test,check,build}.json`，stderr均空。測試頁之後補每輪rest-end、loaded-baseline-end及audit計數，受影響語法check77仍退出0；未反覆執行不受影響的全面gate。
- 真瀏覽器拒絕案例兩者PASS：config HTTP404、XOR一byte、HTTP302、真正移走本機config、未載模型時origin server停止。真正config已恢復2248bytes及原SHA；fault control已回normal。`browser-faults-observed.json`與`actual-missing-asset-{start,restored}.json`、`cold-offline-server-stop.json`保存實測觀察；拒絕發生在initializing／inference前。冷origin不可用不冒充DevTools Offline或NIC斷網。
- Chrome／Edge完整版本154.0.8037.98／154.0.4258.62；Windows11Home10.0.26200，CPU系統名稱Genuine Intel(R) 0000（24cores／32logical），RAM34,163,732,480bytes。最低8GB相容性未驗證，不捏造商用CPU型號。
- 使用者提供Chrome68728／Edge75232；OS核實browser名稱、renderer flag及startTime，保存`user-process-mapping-verified.json`。每browser給一個PID，renderer／dedicated Worker共用程序只计一次；sampler以startTime防PID重用，每秒PrivateMemorySize64及WorkingSet64，含native/WASM，不用JS heap。sampler語法已驗，未取得自有鎖所以尚未啟動；實際推論CPU／記憶體對應仍須正式量測佐證。
- Chrome storage均空；Edge只有session key `__imt_handshake_page_id`，只記key及synthetic-text／audio-marker檢查false，不記值，也不推定其來源。其餘local／Cache／IDB／SW空。console捕獲既有extension警告，未見假語音內容；完成實際推論後仍須檢查輸出canary，完整privacy gate尚未通過。
- 共用鎖仍由`11-video-to-audio / RESUME-11-T02-20261011`持有（07:49:30.340Z，ownerId a5f66477-d7ef-4956-9db4-0b66cc5084bd）。原子acquire回OCCUPIED，未刪除、取代或釋放他人鎖，未開始重型模型載入／推論。只讀查看「影片取出 MP3 音訊」的進度確認其仍在驗收；沒有傳訊、建立chat／子代理或控制其分頁。
- 自有loopback server目前PID17848／session23284，5192；Chrome分頁1636110776、Edge1991445932已準備13個fixture，modelReady=false。準備DOM與畫面保存為`chrome-prepared-dom.json`／`chrome-prepared.jpg`及`edge-prepared-dom.json`／`edge-prepared.jpg`，沒有推論結果。保留這個未完成workflow以維持使用者已提供的PID對應，後續須再次核實PID及startTime。
- 等待期間環境guard退出0/PASS，與本次before完整Snapshots逐欄相同，見`environment-wait-check.json`；未改持久環境或讀憑證。結束時另記post guard，不能用先前其他task的guard替代。

判定：**WAITING_FOR_MEASUREMENT；T02未完成，非READY_FOR_INTEGRATION。** cold時間、品質、三輪速度／心跳、OS總記憶體、取消／全零、已載離線及完整Network／Storage仍NOT_RUN。來源GitHub／URL／PUBLIC／commit：NOT_RUN；hosting：NOT_RUN；沒有發布副本、部署或首頁操作。decoder53,707,539bytes的production同源分塊與live驗收仍為後續發布項。

恢復條件是其他owner自行釋放共用鎖。先原子取得自己的鎖，再依序啟動Chrome68728、Edge75232 sampler及瀏覽器量測；任一必要gateFAIL／NOT_RUN就停止後續MVP，完整PASS才進T03。測完終止自有Worker／server、核對並只釋放自有鎖，不需重問既有實作或來源發布授權。


## 2026-10-11 T02 記憶體硬門檻失敗（最新判定）

**BLOCKED_T02_MEMORY_PEAK；不進T03，非READY_FOR_INTEGRATION。** 原量測等待已解除，09:04:23.805Z取得自有共享鎖後正式測Chrome；兩種OS原生計法都超標，依TASK-ENTRY／TECHNICAL停止剩餘重型驗收與MVP，沒有改門檻、換模型或雲端備援。

- Chrome68728 sampler PID40600／session46553正常退出0：240筆，index連續，間隔982–1024ms（平均1000.029ms），保存PrivateMemorySize64／WorkingSet64／PeakWorkingSet64／CPU及startTime。nativeCPU增加119.359375秒，確認提供PID反映真正推論；renderer／Worker同PID只計一次，不用JS heap。
- 初始Private74,780,672bytes，載入前21筆穩定中位91,938,816bytes；推論峰值2,148,651,008bytes。初始→峰值增量2,073,870,336bytes＝**1.931442GiB > 1.5GiB**；載入前中位→峰值也達1.915462GiB。WorkingSet實測峰值增量1.820904GiB，同樣FAIL。
- model-ready後Private中位618.520MiB；兩輪末尾最後5秒中位1135.523／1587.563MiB（第二輪增加452.039MiB）。第三輪未完成，三輪持續趨勢不下PASS判斷。09:07:46.257Z終止Worker，30–35秒Private中位113.578MiB；modelReady=false／phase=idle／acceptedLateResults=0。不宣稱OS抹除。
- cold下載373.9ms／SHA86.3ms／init1586.6ms，102,581,371 verifiedbytes；Worker21個resource的body合計103,514,028bytes（含兩個固定native ESM額外932,657bytes）。無新增candidate／runtime／package-lock修改。
- Chrome完整前兩輪：各語五短句及兩個30秒檔；每輪中文CER2/60＝3.33%、英文WER0/38＝0%，各段均≤40%；30秒最大6435.9／6111.7ms。全頁心跳最大25.5ms、active12.0ms。25個推論完成（24個兩輪＋第三輪zh-01），第三輪zh-02因memoryFAIL終止；不能把兩輪子項當完整雙browser三輪gate PASS。
- 已完成原文及分數在`chrome-memory-failure-report.json`／`chrome-clear-plus-30-report.json`；OS raw及分析在`chrome-process-memory.jsonl`／`chrome-memory-analysis.json`；畫面`chrome-clear-plus-30.jpg`。早期`chrome-preload-report.json`只是preflight尚未完成的空物件，實際載入前證據為`chrome-preload-ready-report.json`，不得使用空快照冒充測量。
- Chrome完成推論後storage均空；捕獲30條console warn，假逐字稿及audio marker均false，只保存count／canary布林，不保存extension訊息。Worker已完成推論resourceCount均21、assetReadCount10、blockedReadCount0。完整Network／已載offline gate仍未完成。
- Edge75232本次重型cold／三輪／OS採樣：NOT_RUN；兩browser九次取消／全零／已載離線：NOT_RUN。較早两browser缺檔、篡改、redirect、真本機config缺失及冷origin停止拒絕案例PASS保持有效；不把人工NOT_RUN例外用來略過必要gate。
- 09:11:07.887Z核對自有owner／task／startTime receipt後釋放共用鎖；沒有動其他owner鎖。自有Chrome／Edge tabs已關閉、Worker終止，sampler已退出0。核實server17848的node／script／08:01:42.8203025Z startTime後停止；session23284退出1（人工中止）。第一次identity檢查因PS DateTime解析時區不一致拒絕，未停止程序；改DateTimeOffset.UtcDateTime後確認相同PID才停止。見`measurement-lock-release.json`／`memory-failure-server-stop.json`。
- post guard退出0/PASS，和before完整Snapshots逐欄相同：HKCU PATH ExpandString長834、16entries、ephemeral0；HKLM String長1227、30entries、ephemeral0。PATH hash、Environment-key fingerprint及TEMP／TMP型別／長度／hash均不變；完整值見`environment-{before,after}.json`。未讀憑證、未改持久環境或其他工具。
- 本次最終static：offline21/21 test、check77、build27皆退出0；harness證據欄位最後修改後`node scripts/check.mjs`77退出0，記`harness-final-check.json`。重型期間及失敗後只寫證據／文件，沿用未變輸入的有效test／build。
- GitHub source URL／PUBLIC／commit：NOT_RUN；hosting：NOT_RUN；首頁未改，發布副本未建立。模型decoder超過Cloudflare25MiB，production chunk／live仍為後續整合，沒有把source-only或Node preflight冒充上線。

下一步針對既定候選的Worker／ORT原生記憶體峰值做可審查修正，原因尚未確定。保留本次失敗資料；若在既有範圍內有修正，再以新的append-only證據及排他鎖重跑受影響完整T02，全部必要gatePASS後才進T03。不得放寬門檻、偷偷換模型、增權限／付費／遠端API或用高RAM掩蓋結果。既有實作與完成工具來源發布授權不需重問。

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

## 2026-10-12 T02-MEMORY-ROOTCAUSE（最新阻塞）

固定源碼與實機trace確認encoder每次回傳435,072,000 bytes，其中432,000,000 bytes的六份attention未用。新增public/js/core/plain-whisper.mjs，正式Worker只取last_hidden_state及decoder logits／所有KV，明示plain mode；原model／vendor／manifest／package-lock不改、同model／兩sessions沿用。未采用CPU dispose或arena候選；詳細研究與原生对照见docs/MEMORY-ROOTCAUSE.md。

- focused必需輸出回歸4/4；同30秒真warm三次WER0、原文一致，Private增量從1.758GiB降1.164GiB。正式最終npm離線test35/35、check90、build28退出0，stderr空。
- 完整Chrome三輪各12檔及全零完成：CER3.33%／WER0%，30秒最多17.8943s、active心跳41.5ms、全零modelCalls0／text空。
- 1055筆每秒OS采樣仍FAIL：Private初始92,766,208，peak1,897,844,736，增量1,805,078,528 bytes=1.681110GiB；WorkingSet增量1.076485GiB。不能以WorkingSet或短探針PASS略過Private超標。peak在首輪zh-01；round末尾Private中位1224.223／1221.230／1173.156MiB，clear+30秒119.152MiB。
- OS对應先作废建立時間猜測的75872／29筆stream（退出1），再用main／worker各四次300ms波形唯一核實45980同PID、计一次；映射與全部raw/analysis在新append-only`.runs/audio-transcription/20261012-memory-rootcause/`。
- 改檔：正式transcribe.worker＋core/plain-whisper；scripts measurement-context／lock／sampler／PS sampler／serve-spike／check（只補齊現有served vendor/model引用校驗）；test plain-whisper／measurement-context、四項cache及五項CPU候選回归、rootcause頁／worker／factory／兩候選helper與identity PS；TASKS、HANDOFF、README、SPIKE／MEMORY-ROOTCAUSE／RELEASE-CANDIDATE。檢查器初次未認test vendor絕對路由失败，改成與现有server精确前綴相符，未放寬realpath／symlink／external／hash gate，复核PASS。
- Edge重型、各階段九次取消、已載offline、完整Network：NOT_RUN；Chromestorage空，旧两browser拒绝案例有效但不是新完整gate。T03–T09未啟動，source URL／PUBLIC／commit及hosting：NOT_RUN。
- ownWorker/tab、samplers已停止；server71220核實node／本次evidence參數后停止（session1），leaseowner original-audio-chat/b1e5d865-2a86-4421-86eb-a4fcc9d9d555核對receipt后釋放。未碰影片保留tab/server。guard前後PASS/Snapshots相同，HKCU834 ExpandString／HKLM1227 String、ephemeral0、PATH／Env-key／TEMP/TMP fingerprints不變。

判定**BLOCKED_T02_MEMORY_PEAK**：已修掉不必要輸出與三輪累積增長，初次短中文Private峰值仍超標。下步以新診斷區分production bootstrap和第一次encoder暫態配置，保留本次修改與失敗資料，再收斂修法；不改門檻／模型／輸入／vendor或虛構PASS。

## 2026-10-12 T02-MEMORY-BOOTSTRAP-PEAK（兩假設已診斷）

先以舊1055筆定位首zh-01 full peak；本輪Chrome每條件fresh Worker／one pipeline／two sessions、同5秒zh-01三次warm，ready後23秒自动开始，510筆新每秒OS資料。main與三個新Worker唯一CPU波形核实82252同PID计一次。提供的歷史Edge75232／Chrome68728均已退出，未用作當前映射。

- baseline Private增量1.099228GiB；H1 chunked Response1.152649GiB；H2 no-prepacking1.089233GiB。absolute peaks1192.488／1265.523／1206.227MiB、不同初始baselines一并保存。九次文字僅內部比較，全部相同、CER2/11=18.18%、sessions沿用。
- model staging兩份全部释放、bridge live0；首次encoder讓WASM283.25→846.9375MiB，decoder未扩大容量。H1消除body建構整份副本但OS峰值没有下降；H2原生两sessions接受flag，只让ready WASM少4.25MiB，encoder後容量相同。兩候選**不採用**，正式Worker及必要輸出修正不改。
- 這一短句不复现舊完整1.681110GiB FAIL，不解除gate。下一里程碑需原production Worker／原preflight同短句的數值对齊，父主对话審查后決定；本輪不再旗標組合、不重跑完整T02、不開T03。原Edge／取消／offline／完整Network NOT_RUN；來源公開／hosting NOT_RUN。
- 檔案：public/js/asset-loader.mjs仅Response方法抽取（預設不變）；test/spike/bootstrap{.html,.mjs,.worker.mjs,.factory.mjs,-observer.mjs}、chunked-response.mjs、兩項bootstrap test檔；TASKS／HANDOFF／docs/BOOTSTRAP-PEAK.md。39tests、check98、build28PASS，模型19项及fixtures按原sha核对。Root Git index／分支／commit未操作，歷史證據未覆寫。
- 新append-only原始資料、mapping／invalidated记录／Windows fingerprints與final-numeric-windows.json，均在.runs/audio-transcription/20261012-bootstrap-peak。詳見docs/BOOTSTRAP-PEAK.md；清理与guard結果另記closure.json。
- 設定要求gpt-6.1-sol/max；實際backend identity未由可用host資訊驗證，未聲稱切換模型。

BOOTSTRAP收尾：19assets／13fixtures与固定SHA一致；ownWorkers／tab1636110847、samplers、核实server80892均结束，ownlease已核對释放。server signal SIGTERM／code null如實記錄。Windows before/after PASS且Snapshots相同，HKCU834 ExpandString／HKLM1227 String、ephemeral0、Environment-key與TEMP/TMP hashes不變。closure.json已保存，未操作其他保留media/user程序。


## 2026-10-19 MF19-12-M1：第一階段診斷收據

本機交付 opt-in 數值讀取收據、獨立 server received／finish／close、原 wrapper 保留且新增 serve-mf19-memory，以及新 owner 的單 trace browser-cases。正常模式不新增記錄／網路／儲存；未改 releaseLock、no-store、reader API、模型／vendor／manifest／13fixtures／品質／輸入／warm／門檻。細節見 [MF19-12-M1](docs/MF19-12-M1.md)。

初次 focused 19/19 PASS；補 timeout／HTTP 拒絕後僅重驗相關檔 7/7 PASS，最終21個不同案例。原始離線結果、final build/check、候選inventory、diff及環境guard保存於 .runs/media-unblock-followup-2026-10-19/owner-12。沒有啟動 server、browser、OS sampler 或推論；native CDP及完整T02仍NOT_RUN，舊1.681110GiB FAIL不解除。主代理接手候選後才執行一次隔離診斷，任何requestfailed仍記FAIL。source／hosting／homepage／T03均未執行；本 owner 不另製ZIP，由主代理合併單一外層交付。


## 2026-10-20 MU20-12-M1：R11已採認；AT15故障準備

已讀根AGENTS／SECURITY-BASELINE及本輪TASK，並讀R11完整分析、r11-acceptance-completion與primary-closure-review。R11是已通過的目前Chrome155.0.8059.84正常記憶體／合成品質子項：234筆原每秒OS樣本、三輪36次模型推論加唯一靜音共37項，Private增量1.2228889465332031GiB≤1.5GiB，末輪rest最後5秒算法／100MiB門檻不變，品質與全零PASS。config ff1eab47e8bb1c006767dccbc44ca02faa4953cc89db218f41056c778e14a5dc與143個boundFile已核對，exit／sampler／正常stdin-stop／PID generation退休／exact lease收尾通過。about:blank依封存runner先樣本落盤再唯一navigate的受控順序證據，不冒稱另有location時間戳。

歷史1.681110GiB FAIL及R10 exit1／235筆保持原樣；R11不是全T02通過。R9的32筆模型／fixture EOF與hash完整，但仍10筆原生ERR_ABORTED，另有transformers.min.js與ORT .mjs兩筆server匹配不唯一，不能改成全Network PASS。完整T02仍缺Edge及Network／取消／offline／故障等必要項；T03、GitHub、hosting不啟動。

本輪只在 .runs/media-continue-2026-10-20/owner-12 準備AT15：重用未修改的scripts/serve-spike.mjs:createSpikeServer及原CSP／路由，新增薄CLI fault-server（stdin固定fault enum＋ACK／stop）、無launch/connect的純DOM注入browser-cases及focused tests；生產loader／Worker／model／vendor／manifest／fixtures均不改。故障只於指定config.json的HTTP回應：404缺檔、200回應首byte XOR1、302到既有spike頁，磁碟資產不動。

最終owner prep regression 14/14 PASS（含真HTTP單byte、真child與production AssetLoader三種拒絕、ACK／flush／自然exit0、純注入流程與拒絕錯誤證據）；原spike server regression1/1通過後重用。完整產品54/54與舊normal-entry7/7因來源不變重用，沒有重跑整包。所有命令／diff／候選SHA／Windows guard／接口與停止條件在本輪owner README及candidate-inventory；這是離線準備，不是原生browser AT15 PASS。

UI期待error之外，必須沒有loads／ready／initializing／inference正面事件、modelCalls或inference結果，並以原生Worker request namespace及指定faultPath的唯一server fault收據證明。post-join只可標PASS_AT15_ONLY；任何正常preflight串流native failure完整另列FAIL_RETAINED，fullNetworkAccepted及fullT02Accepted固定false，不按ERR_ABORTED字串白名單。未知請求、fallback／跟隨redirect、capture缺口、boundary拒絕、server錯誤碼不符或推論跡象一律停。

下一步由主代理獨立focused tests、綁定候選並以已驗私有非互動Chrome執行三例AT15；通過後才依原序列AT12／14。本owner未啟動任何browser／UI／native sampler、未改共享runner/config或發布，也不另產ZIP。

MU20 response採認補強：missing／corrupt必須觀察到唯一、同namespace且faultPath／404或200一致的原生response；矛盾／缺失／重複即拒絕。redirect缺原生response時只明列server302＋native terminal／no-follow佐證、observedNativeHttpStatus=null；若有response也必須URL／302符合，不虛構。14項最終focused結果包含真反例，原正常Network FAIL仍另列。


## 2026-10-23 B20-12-F01：Windows Node診斷close-race修補候選

本輪只修MA22 A/B transport診斷器F01，完整來源與證據在 [owner-12-f01](../../.runs/batch20-2026-10-23/owner-12-f01/README.md)。舊FROZEN原版SHA 55aa501801443a194d2001924f51484571a5451cdaccff8db6d1bd6cde48c0fb保持原位；新v2 SHA e2b1d95080e96d2f8ee7615b307e4647c490f1c456ae7da8a6e9a93b2faa5d2e，審查外驗cf4796…7d28e後自行整合終止後writeHead/write/end保護及原pipe stream清理，未改產品reader／fixture／vendor／model manifest。

在Windows既有Node24.14.0背景loopback實際重現原A/B client-abort的ERR_CRYPTO_HASH_FINALIZED，兩個已知自有child均exit1；新v2 A/B都自然exit0、stderr空，abort保留CLOSE／writableFinished=false，stream destroyed且close已觀察，隨後正常A+B皆200／160044bytes／固定SHA與相同headers（Date除外）。同22傳輸邊界22/22、double-close／finalized-hash反例4/4，Node test runner 5/5／exit0。全部子程序shell:false/windowsHide，deadline未觸發，沒有掃描或停止未知process。

這是診斷harness修補，非產品缺陷或歷史Chromium ERR_ABORTED根因。歷史69 FAIL、18 worker-bootstrap namespace缺terminal與3一般資產缺terminal保留；完整Network／T02、Edge、browser/CDP、native隔離、ASR／模型／FFmpeg、UI／memory／發布部署均未放行。本輪不啟動browser/native、不改舊CDP pins或shared station；主代理獨立審查及明確版本綁定後才可續作。Windows長run前後guard與固定輸入後驗不變，原HANDOFF bytes僅append。外層ZIP實測SHA為d770910e8f18dffa5cfaae3816ffb4df7e683bfff1a70195ead48872b1b3df21；原intake誤記65字元的metadata錯誤另記，舊intake未改。


## NC23-12-F01｜收據一致性離線修補候選（2026-10-23）

版本 NC23-12-F01-2026-10-23-v1；新副本與完整可重跑證據：[owner README](../../.runs/new-candidates-acceptance-2026-10-23/owner-12-cdp-f01/README.md)、[source binding](../../.runs/new-candidates-acceptance-2026-10-23/owner-12-cdp-f01/source-binding.json)、[FROZEN inventory](../../.runs/new-candidates-acceptance-2026-10-23/owner-12-cdp-f01/candidate-inventory.json)。原候選、外部輸入及 B20-12-F01 transport 均唯讀保留，未改產品來源。

修補 native/full header 一致性、server 固定九欄存在及值比對、固定成功 reader 五階段完整狀態；FakeCdp 的 Content-Length 改 string，observer 與原 17 項 assertion 不變。新版 evidence SHA 4612b4039f5cf967f0bfb01751d311a14ce6bb94ebadb8ff1284a5f3b654d7a2；fixture SHA c0ace2bde65eb6cd3eb661963d64e226e0580ae41b99359d1254d78fe3fef33b。兩檔 bytes 與審查後的外部候選相同，未執行附件 RERUN。

Node 24.14.0：原 17/17 offline 通過；90 外部反例均重現原版誤 PASS 並被新版拒絕，6 正例與 6 native FAIL_RETAINED 保留；單一矛盾使整組 INVALID_OR_INCOMPLETE_COMPARISON；固定原 reader/helper 的 Node 本機 Web Stream 五階段檢查及 import-only smoke 通過。新增回歸執行器第一次混用單例/整組狀態名稱的 exit 1 留存，修正期待後僅重跑該回歸 exit 0，未再改兩檔 runtime。主代理另已通過原 17 項、90 外部反例、288 欄位變異與 4 種固定 reader 分塊，證據在本 run/primary/。

93 個來源綁定（85 固定/歷史檔＋8 外部輸入）前後 bytes/SHA 不變；User/Machine PATH hash、型別、長度、ephemeral count 與完整 Environment-key fingerprint 均不變。HANDOFF 只追加，實際差異與命令/exit 見新副本。

fullNetworkAccepted/fullT02Accepted 始終 false，歷史 69 FAIL/3 missing terminal 原樣保留。真 browser/native/CDP、輸入隔離、PID 記憶體量測與完整媒體驗收仍 NOT_RUN_USER_FOCUS_INCIDENT；未操作使用者程序、憑證、持久環境、Git/gh 設定、發布或部署。

本副本仍沿用原 adapter/bindings 的舊 MA22 transport 55aa501801443a194d2001924f51484571a5451cdaccff8db6d1bd6cde48c0fb；B20-12-F01 新 transport e2b1d95080e96d2f8ee7615b307e4647c490f1c456ae7da8a6e9a93b2faa5d2e 未自動 rebind。後續真執行須由主代理在新整合版本明確選用及重新綁定，本輪不進下一 milestone。候選凍結後待主代理最終來源核對與單一總 ZIP 整合，不標成媒體產品完成或發布放行。


## NC25-12-F02｜嚴格收據 schema 與 transport 整合（2026-10-25）

版本 NC25-12-INTEGRATED-2026-10-25-v1；新候選與完整證據：[README](../../.runs/batch20-browser-release-2026-10-25/owner-12-integrated/README.md)、[source binding](../../.runs/batch20-browser-release-2026-10-25/owner-12-integrated/source-binding.json)、[inventory](../../.runs/batch20-browser-release-2026-10-25/owner-12-integrated/candidate-inventory.json)、[實際差異](../../.runs/batch20-browser-release-2026-10-25/owner-12-integrated/implementation.diff)。狀態 FROZEN／待主代理獨立驗收；本 owner 未發布、部署或另開 ZIP。

在全新副本保留已外驗結案的 NC23 F01 固定 header／五階段檢查，F02 先檢查 write counts 為非負 safe integer、三個操作 order 為正 safe integer、navigationSentAtMs 為有限非負 number，再做原策略及順序比對；無 coercion／四捨五入／預設值。classifier SHA 2e31d604997e73212c059a8720cbc62272240f20f31336f5e3978cdf1c883f90，bytes 與審過的外部候選相同。

本輪已真正接入 B20 中斷／hash 修正版 transport SHA e2b1d95080e96d2f8ee7615b307e4647c490f1c456ae7da8a6e9a93b2faa5d2e。新 bindings pin 本副本 transport/source-identity/reader；adapter 與 HTTP 測試均使用同一 bindings.transportUrl，舊 55aa5018... 僅保留歷史唯讀。原17 test、fixtures、protocol、first-party、observer、reader、B20 transport／測試 assertions 未改或逐 byte 複製；未刪 verifier。

Windows Node v24.14.0 本輪結果：原17/17；舊90反例、288欄位變異、4固定reader Node Web Stream；1296/1296補充矩陣；3項接線/schema tests（含48非JSON邊界）；A與B真Node client abort及各自A/B恢復；22邊界與4 lifecycle（5項Node tests）；import-only smoke，全部 exit0、stderr空、無逾時。案例組有重疊，不能相加成獨立功能總數。所有測試都在新整合候選執行，loopback server僅127.0.0.1:0，擁有的client/stream/server自行清理，子程序自然結束。

145歷史固定檔、8審查輸入前後bytes/SHA不變；153來源與20候選程式/版本檔重新綁定。完整Windows guard Snapshots前後一致，PATH hash/type/length/ephemeral count與Environment-key fingerprint均不變。HANDOFF原前綴完整保留，只追加本節；共享看板與其餘產品/歷史FROZEN/外包/model/vendor未改。

fullNetworkAccepted/fullT02Accepted維持false，歷史69 FAIL/3 missing native terminal不改寫。F01結案只適用4612b403...固定離線診斷版本，不代表媒體可發布。真browser/CDP/adapter、launcher/native、輸入隔離、PID記憶體、ASR/模型與完整媒體gate仍NOT_RUN_USER_FOCUS_INCIDENT。沒有GUI/CUA/IAB、focus/IME/clipboard/原生dialogs、既有程序操作、憑證、安裝、持久Windows/Git/gh/auth修改或外網。凍結後停在本里程碑，等主代理獨立驗收。

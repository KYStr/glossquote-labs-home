# T02 媒體可行性：PARTIAL / BLOCKED_EDGE_ISOLATION_GATE

日期：2026-10-10（Asia/Taipei）。任務 THREAD-11-video-to-audio。模型建立工具接受 gpt-6.1-sol／max；後端實際路由未確認。

最新（2026-10-19，U19-11）：**主代理Chrome155的完整Network與真正context Offline均PASS；Edge155在產品操作前被job／desktop隔離guard拒絕，所以T02仍BLOCKED_EDGE_ISOLATION_GATE。** 2026-10-11速度、程序記憶體、音質與取消的原始版本／裝置證據保留，不重測或擴張宣稱。本文件末節是目前判定；下方歷史FAIL不代表修正後仍有binding故障。

**固定 core0.12.10 在 Chrome與Edge 對實際合成MP4的 ffprobe 回傳-1。** 技術契約要求 exit0；此必要能力gate未通過，故停止 T02，不開始 T03以後。Node測試、官方demo、存在JSON檔或可生成影片都不能代替此gate。

## 裝置、版本與來源

| 欄位 | 實際記錄 |
|---|---|
| OS | Windows11 家用版，10.0.26200 |
| CPU | WMI `Genuine Intel(R) 0000`／GenuineIntel／24cores／32logical processors；不猜測具體商品型號 |
| RAM | 34,163,732,480 bytes，約31.82GiB；最低8GB相容性未驗證 |
| Chrome | 154.0.8037.98；專用分頁的 userAgentData fullVersionList 與安裝binary version相符 |
| Edge | 154.0.4258.62；專用分頁的 userAgentData fullVersionList 與安裝binary version相符 |
| Node／npm | 24.14.0／11.9.0 |
| Wrapper／core | @ffmpeg/ffmpeg0.12.15／@ffmpeg/core0.12.10；transitive @ffmpeg/types0.12.4；精確lock＋SHA512 |
| 實際build | FFmpeg5.1.4，GPL、libx264、libmp3lame、disable-pthreads，`-version` exit0 |
| Runtime | 9檔／32,360,894bytes（30.86175MiB），manifest有全部bytes＋SHA256；上游JS/WASM未修改 |
| wasm SHA256 | `9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7` |
| Scope | 僅本工具、本工具專用.runs、短期媒體量測鎖；未建立子代理或新對話；未修改其他工具與首頁 |

## 真正瀏覽器結果

合成片：320×240藍底、10fps、10秒、libx264/yuv420p視訊、AAC/44100Hz雙聲道、440Hz sine 預設來源振幅0.125。固定參數在 test/spike/fixtures.mjs；沒有下載真實媒體。

| 項目 | Chrome | Edge |
|---|---:|---:|
| 首次本機資產下載＋完整性檢查 | 161.60ms | 217.70ms |
| 下載後引擎初始化 | 125.40ms | 149.50ms |
| 10秒合成片生成exit | 0 | 0 |
| 診斷輪生成耗時 | 622.50ms | 652.50ms |
| 合成片bytes | 168,826 | 168,826 |
| 合成片SHA256 | `5fb17a48ce4967422017c555c6fdbc9870292f4935f9695fef99626cc408ce12` | 同左 |
| ffprobe退出碼 | **-1** | **-1** |
| probe耗時 | 47.00ms | 36.50ms |
| UI100ms心跳已觀察最大延遲（僅此短片診斷） | 71.60ms | 6.80ms |

Chrome首次測試因非零probe失敗，未保存fixture細節；增加穩定數值診斷後，第二輪實測捕捉上表hash/exit。Chrome第二輪使用一般HTTP快取，不將第二輪載入數值冒充cold；表中Chrome下載/初始化来自第一次chrome-cold.json。這些cold數字只代表loopback本機傳輸與當時瀏覽器快取條件，沒有清除瀏覽器整體WASM編譯快取，**不是正式主機下載性能**。

第二輪Chrome沒有更換套件、修改vendor、放寬exit規則；Edge一次確認同一缺陷。沒有在缺乏新證據時重跑180秒工作。原始ffmpeg stderr不進console或證據；診斷只保存已限定的版本／布林build旗標／整數exit與假片hash。

## 六個硬gate的判定

| Gate | 判定 | 證據與未完成項 |
|---|---|---|
| 1 實機／版本／完整Network | PARTIAL / NOT_RUN | Windows11、RAM與兩瀏覽器完整版本已記；主頁ResourceTiming與自有server固定路由記錄皆為同源。完整Network/HAR及worker所有請求獨立追蹤未取得，不能宣稱已完成零第三方networkgate。 |
| 2 cold＋10秒/180秒各3 warm | PARTIAL / NOT_RUN | cold本機下載≤120s與初始化≤60s通過；必要probe先失敗，**沒有跑warm轉換**，180秒fixture也未生成，不能填轉換速度PASS。 |
| 3 renderer＋related worker程序記憶體 | NOT_RUN | probe硬gate先失敗，未做每秒程序取樣；idle/peak/取消30s均無資料。未用JS heap或全部Chrome程序合計冒充指定標籤記憶體；可用browserAPI也不提供task PID／程序記憶體。 |
| 4 音質 | NOT_RUN | 尚無經有效probe的MP3輸出。440/1kHz/脈衝/左右聲道的SNR、頻差、時長、削頂與人工試聽均未驗。未將合成影片或未執行的metrics模組當作音質成功。 |
| 5 取消3×3／worker觀察／心跳 | PARTIAL / NOT_RUN | 短片生成+失敗probe期間心跳未超1s；完整下載/probe/轉換取消、OS worker終止、晚回覆競態、成功重試皆未驗。 |
| 6 離線／全部必要能力 | **FAIL** | 核定lavfi color/sine、H.264/AAC fixture生成成功；ffprobe權威成功退出碼不可用。真正瀏覽器offline及冷啟缺資產未測，未走任何fallback。 |

VA-07 Node manifest案例PASS。VA-09/10/11/20的真正媒體驗收NOT_RUN（被必要probe能力阻塞）。測試頁上的短timer、mocked缺資產、app-level fetch disabled controls均未執行；即使執行也不能代替production timeout／browser network offline gate。

## 根因線索與下一個必要動作

本機值與官方 [issue817](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/817) 的 core0.12.10 ffprobe -1問題相符。API文件要求0才算成功，技術契約也如此；不將-1轉0、不靠讀到JSON就忽略退出碼、不改成影片元素的canPlayType、不解析stderr成功、不改用core-mt或遠端API。

要解除阻塞：在T01核實包含exit修正的**正式單執行緒core發行**，固定新的版本／完整來源與授權／manifest，然後重新測T02全部必要gate。若仍無正式資產而希望自己build patched core，先由原主對話明確新增並審核固定commit的source-build範圍、工具依賴與完整可分發來源；這超出本次「不手改vendor／只固定正式候選」工作，沒有執行。正式registry於本次查詢最高仍0.12.10；不把issue上的後續修正commit当成已發行npm。

## 證據、命令與環境

專用 evidence根：`.runs/video-to-audio/20261010-thread-11/`；不得放入獨立發布副本。

- chrome-cold.json：首次真正Chrome引擎load、實際resource記錄。
- chrome-fixtures.json：第一輪probe拒絕。
- chrome-diagnostic.json／edge-diagnostic.json：逐項版本、fixturebytes/hash、生成exit、probeExit、心跳與ResourceTiming。
- chrome-ffprobe-fail.jpg／edge-ffprobe-fail.jpg：測試頁可讀拒絕狀態，沒有播放器產物。
- t02-spike-server.txt：loopback固定路由GET狀態與bytes，不含query、真實檔名、影片內容或stderr。
- measurement-lock-acquired.json／measurement-lock-released.json：本工具原子取得，核對完整owner記錄後只釋放自己的lock；沒有碰他人的lock。
- environment-before.txt、environment-before-ci.txt、environment-after-ci.txt、environment-before-spike.txt、environment-after-spike.txt：User/Machine PATH与完整Environmentkey指紋全部相同。測試無持續環境異動。
- `npm.cmd install --package-lock-only --ignore-scripts --no-audit --no-fund --cache <專用目錄>` exit0；`npm.cmd ci --ignore-scripts --no-audit --no-fund --cache <專用目錄>` exit0。
- `node scripts/stage-vendor.mjs` exit0。最初8檔清單在check被types.js缺失拒絕；補完整9檔後stage/check通过。最初license檔名白名單不接受GPL檔名的點號，已改為精確兩個授權檔白名單。保留失敗log，未削弱resource檢查。
- `npm.cmd test` 最终6/6 PASS、exit0；`npm.cmd run check` PASS、exit0。最終build結果與source清單見 HANDOFF／RELEASE-CANDIDATE。
- `node scripts/serve-spike.mjs` 實際 `127.0.0.1:5191`；測完只Ctrl+C此task-ownedsession，退出碼1是使用者中斷型退出，不算media gate成功。preview4191同理；未終止不明程序。

結論：**T02 FAIL，產品BLOCKED；來源未發布、hosting未部署、未宣稱本機MVP完成。**

## 2026-10-11／MEDIA-11-UNBLOCK 實測

候選仍為精確wrapper0.12.15/core0.12.10、未修改的官方JS/WASM；增加第一方 native-return入口與每次獨立probeWorker，詳細根因／source links與決策見DEPENDENCIES。沒有已發行新core的主張，也沒有忽略退出碼。

| 實際案例 | Chrome154.0.8037.98 | Edge154.0.4258.62 |
|---|---|---|
| 原始未修binding／同一有效合成片 | -1（失敗重現） | -1（失敗重現） |
| 修正有效probe1／後續good/bad交替再4次 | 0×5，H.264/AAC、44100Hz、2ch、10秒 | 同左 |
| malformed bytes | exit1，MEDIA_UNSUPPORTED | exit1，MEDIA_UNSUPPORTED |
| empty bytes | exit1，MEDIA_UNSUPPORTED | exit1，MEDIA_UNSUPPORTED |
| truncated64byte MP4 | exit1，MEDIA_UNSUPPORTED | exit1，MEDIA_UNSUPPORTED |
| 不寫檔的全新probeWorker／missing input.mp4 | native exit1，MEDIA_UNSUPPORTED | 同左 |
| 真MP3轉換 | exit0、161376bytes | exit0、161376bytes |
| MP3輸出probe | exit0、mp3/44100Hz/2ch/128000bps、10.057143秒 | 同左 |
| probe worker termination API calls | 10（含失敗case與輸出probe） | 10 |
| 有界milestone | PASS | PASS |

合成片生成exit0、168826bytes，SHA256 `5fb17a48ce4967422017c555c6fdbc9870292f4935f9695fef99626cc408ce12`；沒有用真影片。各有效結果只在真正exit0後讀JSON；四種invalid各1，不顯示或讀取失敗JSON作成功。

主代理另在自己的IAB Chrome155.0.8059.27完成相同sequence，original-1、valid0×5、invalid1×4、真MP3與10次workertermination一致；這是獨立第三組真瀏覽器證據，仍不取代完整T02 gate。

證據 `.runs/video-to-audio/20261011-unblock/{chrome,edge}-browser-proof.json/.png`。JSON含browser fullVersionList、同源ResourceTiming、各case退出碼、合成hash、MP3欄位；loopback server記固定routes。沒有完整HAR／worker network獨立追蹤，故完整Network gate仍NOT_RUN；本機HTTPcache沿用、WASM编譯快取未清，沒有重新宣稱cold主機下載性能。原始stderr沒有接console。

Node離線 native-return、undefined／noninteger／swallowedtrap、非零不讀JSON、cancel晚回覆與one-shottermination測試8/8；整體final npm test14/14、check/build exit0，21靜態檔。這些fake/status與lifecycle測試不冒稱 native codec browser測試。

**完整T02還未通過。** 原六gate表未改成PASS：warm10/180秒各3輪、renderer+worker每秒idle/peak/cancel30秒、完整品質SNR/聲道/試聽、3×3取消與OSworker觀察、真正離線與完整Network、productiontimeout皆NOT_RUN。新Worker初始化與拷貝成本／最壞50MiB記憶體仍待測。本次只解除必先通過的ffprobe能力阻塞，產品與release保持BLOCKED。

## 2026-10-11／RESUME-11-T02-20261011：目前實測與剩餘gate

專用證據：`.runs/video-to-audio/20261011-resume-t02-0918/`。沿用已審查的第一方native-return與一次性probe Worker；沒有重新調查binding、修改vendor、套件、lock或manifest。所有媒體仍為同源固定參數生成的合成片。T03與產品MVP未開始。

| 必要gate | 目前判定 | 證據 |
|---|---|---|
| 1 實機、版本、完整Network | PARTIAL / NOT_RUN | Windows11 Home10.0.26200、31.82GiB、WMI Genuine Intel(R)0000/24core/32thread；Chrome154.0.8037.98、Edge154.0.4258.62。已記主頁與Worker ResourceTiming、自有server固定請求，所見皆同源；舊頁面主ResourceTiming達250筆上限，不能稱完整Network。測試頁已改10000筆容量，尚待新錄製與DevTools核對。 |
| 2 cold與10秒/180秒各3warm | PASS | 兩瀏覽器各6個真轉換，原生exit0與輸出probe有效；下表分開下載、初始化、轉換及含兩次probe的完整工作成本。 |
| 3 renderer＋相關Worker程序記憶體 | PASS | 使用者Task Manager確認Chrome74216／Edge66864；原生DedicatedWorker執行緒在同一PID，程序只算一次。每秒PrivateBytes與WorkingSet，三輪idle及9次取消後30秒均有實際資料。 |
| 4 音質與人工試聽 | PASS | 四fixture、逐聲道PCM SNR／頻率／時長／零訊號／削頂／左右聲道皆通過；使用者四檔試聽「未聽到異常」。 |
| 5 下載/probe/convert取消各3、Worker、心跳 | PASS | 每瀏覽器9次真取消、沒有舊輸出、每次成功10秒重試；OS執行緒死亡與UI延遲各自記錄。最大100ms心跳延誤Chrome34.1ms／Edge41.5ms。 |
| 6 必要能力與離線 | PARTIAL / NOT_RUN | lavfi/H.264/AAC/ffprobe/libmp3lame、真缺檔404、篡改WASM拒絕與production timers皆PASS。同源server真的停止後兩瀏覽器仍成功轉換；這不冒稱DevTools Offline，瀏覽器網路Offline尚待使用者切換後實測。 |

### 速度與完整工作成本

| 欄位 | Chrome | Edge |
|---|---:|---:|
| 真正9檔HTTP下載／驗hash的fresh load | 212.6ms | 245.4ms |
| fresh下載後初始化 | 177.7ms | 171.0ms |
| Runtime總bytes | 32,360,894 | 32,360,894 |
| 10秒warm三輪轉換 | 183.6／167.8／164.1ms | 214.5／157.5／152.8ms |
| 180秒warm三輪轉換 | 2115.3／2213.3／2158.8ms | 2342.2／2111.1／2111.8ms |
| 180秒完整工作（write＋input probe＋convert＋read＋output probe） | 2329.3／2400.3／2379.7ms | 2718.1／2311.9／2285.7ms |

採最終程序取樣覆蓋的三輪warm，見`{chrome,edge}-memory-warm.json`。較早warm也通過並保留；重測理由是補齊PID可歸屬的程序量測，不將快取reload冒稱fresh load。fresh Chrome使用60206、Edge使用自己的profile60206，九檔完整傳輸證據在`chrome-fresh-cold.json`與`edge-warm.json`及對應server紀錄。沒有清除全瀏覽器WASM編譯cache；這是本機loopback傳輸，不是正式hosting速度。最低8GB相容性未驗證。

### 程序記憶體與原生Worker

`.NET Process.PrivateMemorySize64`記private committed bytes，`WorkingSet64`另記實體working set；沒有用JS heap或所有Chrome/Edge合計。每1000ms排程，warm最大實際間隔Chrome1024ms／Edge1030ms。Chrome初始load前1筆、Edge295筆idle；初始基線分別87.2305／103.5703MiB。觀察到的指定測量範圍Private peak為339.3906／522.0547MiB，相對初始增量252.1602／418.4844MiB，皆≤1GiB；WorkingSet peak374.1641／497.0430MiB，增量也≤1GiB。這些是每秒取樣的觀測峰值，不聲稱捕捉每個瞬間。

每轮工作後30秒idle最後10秒private中位數相對前一基線增量：Chrome−5.6563／20.0820／7.6602MiB；Edge18.2930／−13.4336／9.4766MiB，皆≤100MiB。9次取消各有30或31筆取樣，取消30秒末private中位數Chrome約81.0–89.0MiB、Edge121.4–125.5MiB。40分鐘有界sampler結束與continuation啟動之間，Edge有約29.83秒空檔；沒有落在必要warm或取消30秒窗口，不宣稱整段任務無間斷取樣。

使用者給出的PID再由`GetThreadDescription`獨立驗證DedicatedWorker thread生死。最終observer目標10ms、實際最大間隔Chrome88ms／Edge89ms。早期程序差分無法確認歸屬，相關資料排除；早期HRESULT判讀錯把正數成功碼当失敗，已改為非負成功，不拿那批空Worker清單作證據。數值程序counter本身仍保留。

probe取消OS退出延遲Chrome52／66／53ms，Edge61／61／62ms；convert取消Chrome1996／2026／1950ms，Edge1863／1979／2026ms。技術gate的一秒上限作用於UI，沒有將API terminate時間冒稱OS立即退出；每次Worker都在30秒觀察期退出，之後才載入新引擎成功重試。下載取消在已收到324,482–1,177,051bytes的真HTTP流、hash完成／Worker建立前發生，Worker建立數0。UI各次0.1–0.3ms（完整個別值見raw）。`process-memory-analysis.json`逐案列thread ID、birth/death、30秒counter與判定。

warm兩個瀏覽器依序量測。後續Chrome取消與Edge逾時、再交換，部分等待窗口重疊；各自PID counter分開，另無法排除OS排程與其他應用干擾，數值僅對此機有效。沒有8GB普遍性能保證。

### 音質

`{chrome,edge}-quality.json`的440Hz、1kHz、pulse、左右440/1000Hz四種輸出各PASS。逐聲道SNR範圍26.02197–26.06368dB；正弦頻差最大約0.000329Hz；10秒輸出probe為10.057143秒、180秒為180.035918秒。PCM從同一AAC輸入及MP3解碼到44.1kHz/2ch，脈衝±4096相關對齊偏移0，去頭尾各0.5秒，不調gain。脈衝不拿其數值當正弦頻率驗收。所有聲道非全零、無削頂／左右交换。

實際保存四個Chrome與四個Edge MP3（每檔161376bytes），SHA256證明兩瀏覽器供試聽音檔是同一內容；**bytes相同只用於對照人工聽到的檔案，不作lossy音質驗收**。使用者聽四個合成MP3並直接回覆「未聽到異常」，`manual-listening.json`記PASS；此人工結果適用於相同Edge音檔。Native輸出44100Hz/2ch/128kbps；瀏覽器AudioContext以裝置48000Hz解碼是額外可播放證據。

### 真實故障、完整production timers與剩餘缺口

| 項目 | Chrome | Edge |
|---|---|---|
| 缺失WASM（server真404） | RUNTIME_LOAD_FAILED、disposed、無Worker | 同左 |
| 傳輸WASM最後一byte被篡改 | RUNTIME_INTEGRITY_FAILED、disposed、無Worker | 同左 |
| 正式下載120秒／server延遲125秒 | JOB_TIMEOUT，120013.1ms | JOB_TIMEOUT，120009.4ms |
| 正式初始化60秒 | JOB_TIMEOUT，60287.0ms | JOB_TIMEOUT，60269.4ms |
| 正式probe15秒 | JOB_TIMEOUT，15016.6ms | JOB_TIMEOUT，15009.8ms |
| 正式convert180秒 | JOB_TIMEOUT，180002.3ms | JOB_TIMEOUT，180011.9ms |
| 上述三個Worker timeout的OS退出 | terminate後13.3／47.6／34.7ms | 16.7／27.2／26.7ms |
| server真停止，已載runtime轉換 | PASS，原生fetch失敗後仍真轉換 | 同左 |
| DevTools Network Offline | NOT_RUN | NOT_RUN |

缺失／篡改／慢流／125秒停滯由test server控制HTTP真response；官方磁碟檔不改。Worker timer使用test-only observer跑真native LOAD／FFPROBE／EXEC，再抑制一個response以注入無回覆transport；native completion分別true／0／0已保存。外層60／15／180秒production timer未縮短，timeout後真OS Worker退出。這是無回覆transport故障，不冒稱native CPU deadlock。`timeout-os-worker-proof.json`列獨立OS退出證據。已移除旧mock fetch與短timer測法。

故障raw `cold.pass=false`表示預期load被拒絕，不等於故障驗收失敗；判定依精確error、disposed與零Worker。已停止server的證據為`{chrome,edge}-unreachable-origin.json`，沒有覆写fetch或改斷線flag。真正DevTools Offline與新完整Network尚未取得，所以G1/G6保持NOT_RUN部分，**不進T03**。

### 本輪改檔、檢查與交接

- `test/spike/{index.html,spike.mjs,observed-worker.mjs,worker-observer.mjs}`：真native觀測、重試、30秒窗口、音檔證據、10000筆Network容量。官方Worker仍原文import；instrumentation不進public/build。
- `scripts/serve-spike.mjs`與`test/manifest.test.mjs`：真HTTP故障與上游byte不變回歸；快取自己的probe入口／observer以測已載入離線能力。這是spike cache政策，不代表正式網站offline/header已驗。
- `public/js/ffmpeg-adapter.mjs`：spike-only uncached load使用真fetch、hash與原timer；正常load仍force-cache。無T03控制器或新產品能力。
- 最終`npm.cmd test`15/15、exit0（本輪實際執行）；`npm.cmd run check`exit0，包括最後Network容量／證據文案修改後受影響check；`npm.cmd run build`exit0、21files。public未再改後重用build；`static-byte-proof.json`逐檔核對21個public/dist與九個official npm/manifest相同，無測試媒體。
- 不覆寫任何舊實測；專用新RUN內raw JSON、MP3、server/request、每秒counter與高頻thread紀錄不進發布。raw頁面外部memory/listen仍NOT_RUN欄位由外部證據整合，不能當頁面自己已讀Task Manager或人的耳朵。
- 長量測已停止。初版server helper在SIGINT關閉listener後仍持有stdin，之後核對精確PID、Node command與creation time才停止自己的五個helper；退出1是清理，不是驗收PASS。首次清理驗證因PowerShell JSON日期自動轉換而fail closed，未停任何程序；保留string日期後核對通過。
- 為待完成的Network/Offline保留自己的兩個loaded分頁與輕量loopback server：Chrome5191、Edge60206。新helper固定`stop`可正常退出，不接HTTP控制；不關使用者的DevTools或Task Manager。
- 下一步：使用者開啟两頁Network錄製後，重新載入已增大記錄容量的頁面；保留完整冷載入請求，完成fixture與轉換後切真正Offline並驗一次已載入轉換。任一必要結果缺失或失敗仍停T02，沒有續做MVP或發布。

## 2026-10-19／U19-11主代理station-v3驗收：Chrome PASS，Edge隔離BLOCKED

| 剩餘必要項目 | 官方Chrome155.0.8059.84 | 官方Edge155.0.4283.45 |
|---|---|---|
| G1 完整Network／原response hashes／native Worker graph | PASS | NOT_RUN：產品操作前REJECTED_JOB_MEMBERSHIP |
| G6 真正載入後browser Offline | PASS：context.setOffline(true) | NOT_RUN：同上，不能以Chrome替代 |
| T02總判定 | 本輪Chrome兩項已驗 | **BLOCKED_EDGE_ISOLATION_GATE**；T03不開始 |

主代理的`.runs/browser-acceptance-2026-10-19/station-v3/u19-11-chrome-r3/result.json`兩案PASS、failures/prohibitedEvents空、exit0；各native程序經station／desktop／job guard，後續記錄的owned process generations已退出且lease退還。owner沒有自行啟動Browser／Playwright／CUA或OS輸入。

九個runtime原瀏覽器fetch response的bytes／SHA-256符合固定manifest（總32360894bytes）；WASM32232419bytes與hash `9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7`。導航前在CDP Network設定單資源67108864bytes／總134217728bytes，由同session、同原始requestId讀取loadingFinished後的body；每項記browserVersion、requestId、loaderId、原URL與hash，未另作Node fetch。主頁／Worker完整事件及獨立CDP favicon鏈皆記錄，同源且無內容上傳。Chrome R1的inspector cache eviction與R2的favicon capture不足保留，沒有改寫成原runtime損壞或刪除失敗證據。

真正Offline時server沒有停止。`navigator.onLine=false`，manifest原HTTP請求失敗後仍以已載runtime完成原offline控制與fresh10秒重試；四個新native probe Worker的FFPROBE start／termination可見。輸出exit0、161376bytes、MP3／44100Hz／2ch／128000bps、10.057143秒。這只補G1/G6，不重做或擴大此前G2–G5／SNR／人工聽的設備與版本宣稱。

Edge R3/R4均未進產品操作。R4拒絕收據`.runs/browser-acceptance-2026-10-19/station-v3/u19-11-edge-r4/tree-1.json.rejected.json`：browser PID48156、identity_helper PID89564、hasExited=false、outside task job；已核對的msedge列具job與desktop／Win32k證據。名稱與存活布林不足以驗證helper的image path、原process generation或啟動來源，不能加白名單、終止未知程序或修改系統／身份／profile繞過。此處FAIL是隔離前置；Edge G1/G6仍NOT_RUN，不宣稱媒體不支援。

只讀分析與安全解鎖條件在`.runs/unblock-2026-10-19/owner-11/edge-isolation-analysis.json`：先由主代理核對同期PID世代與啟動歸屬，現有launcher已無breakaway；缺少足夠證據時保持拒絕。如果helper確走外部共享／broker路徑，需已有且可驗明完整包含helper的Windows11隔離環境，由主代理另行審核，不在使用者當前session再試相同啟動或猜測旗標。沒有採用未核實的identity-helper禁用參數，也沒有讀credentials/profile或修改OS／服務／wrapper。

本輪兩份docs不在40檔固定candidate inventory內，故只更新進度與owner分析，不改候選或harness（SHA256仍`7b09a4b898a6f8b33f21c72321e918c14ffa4f9e6f1f959205ba838ba0eee60a`）。T02整體仍BLOCKED、MVP未完成、未發布來源／hosting。

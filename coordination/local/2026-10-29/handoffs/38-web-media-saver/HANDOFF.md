> 最新狀態（主代理，2026-10-22）：已公開 GitHub、部署並更新雙語首頁與看板；限定範圍主驗通過，等待外部驗收。詳見 [正式發布驗收](RELEASE-ACCEPTANCE.md)。下方保留各階段歷史狀態，不代表目前仍未部署。

# 實際交接

最新狀態（2026-10-22）：**WEB-RELEASE 任務 B 的公開來源已驗證，FROZEN；hosting 由主代理待部署／待驗**。WEB-M1 R03/R04 與任務 A 已取得固定 GO。下列歷史保留，最新完整交接在本文末尾 RELEASE-B 段落。

2026-10-22：主代理建立規格，等待M0原功能對話交付。尚未實作可用下載助手、無公開來源、無live website、無平台相容實測。這不是完成聲明。

原對話請於此記錄實際修改、命令與結果、固定hash、未驗與known risks。每個里程碑保留歷史，不覆寫失敗證據為PASS。公開來源／部署及外驗版本分開。

## 2026-10-22 — MD22-38-M0 / FROZEN

狀態：**M0 核心背景候選已凍結，主代理獨立驗收通過**。本輪實作可測的 URL／plan／單工作 controller；尚未有可用下載助手、UI、真平台下載、公開 GitHub、hosting 或完整產品驗收。只會識別網址，不代表平台下載相容性 PASS。不開始 M1、不另外打 ZIP；由主代理整合單一交付包。

原功能對話：`01a16218-cb6e-7721-b83f-f34241b8c08c`。create_thread 接受 requested `gpt-6.1-sol` / `max`；沒有獨立 backend identity 欄位，因此仍為 `not-independently-confirmed`。已建立本次有限範圍 Goal，並未覆蓋舊 Goal。

### 實際修改

- 新增 [URL 核心](src/core/url.mjs)、[固定輸出計畫](src/core/plan.mjs)、[controller](src/core/controller.mjs)、[固定錯誤／資料讀取](src/core/errors.mjs)。
- 新增 [URL／plan 測試](test/url-plan.test.mjs)、[controller 與 R01 回歸測試](test/controller.test.mjs)、[build 邊界測試](test/build-contract.test.mjs)、[fake adapter／手動 scheduler](test/fake-adapter.mjs)。
- 新增 [check](scripts/check.mjs)、[build](scripts/build.mjs)、[檔案 allowlist 與 hash helper](scripts/project-files.mjs)、[package](package.json)、[gitignore](.gitignore)。零 runtime／dev 套件依賴，沒有安裝套件。
- 新增 `dist-core/core/{controller,errors,plan,url}.mjs` 與 [manifest](dist-core/manifest.json)：只有四個核心檔案，標記 `offline-core-only`。
- 更新本 HANDOFF、[TASK-ENTRY](TASK-ENTRY.md)、[project.json](project.json)。證據只寫入指定 owner 目錄。13 個既有非 owner 規格／docs 檔案的 bytes／SHA 全部維持原值，見 [scope check](../../.runs/media-downloader-2026-10-22/owner/scope-check.json)。未修改兄弟產品、共享首頁、看板、舊收據或主代理證據。

### 公開 API 與例行實作選擇

`classifyUrl(raw)` 遵循 TECHNICAL 的成功／失敗 discriminated record。原長度先限制為 2048 UTF-16 units。首尾只移除普通 U+0020 空格；其餘控制、格式、空白、反斜線均拒絕。hostname 僅允許明列 ASCII 名稱及大小寫正規化，避免 Unicode／percent decoding 生成新平台身份。SoundCloud `contentId` 使用 `作者/曲目`；TikTok 短連保持原 vm/vt host、不展開 redirect。這些都只是本機字串處理。

`makePlan(options)` 成功直接回 plan；失敗 throw `CoreError`，`code` 與 `message` 都只有 `OPTIONS_INVALID`。只接受 exact plain／null-prototype data record 的 `video/source`、`audio/mp3`；未提供值不猜預設，無自訂 args／path。回傳計畫是獨立物件；傳給 adapter 前另凍結，固定 720p 上限（audio 為 null）、1 GiB、3600 秒。

`createController` 配置為 exact `{adapter,onState?,cancelTimeoutMs?,scheduler?}`。adapter 是 exact plain／null-prototype data record，四個欄位皆為函式；函式不依賴 `this`。`onState` 預設無操作。`cancelTimeoutMs` 預設 1000，接受 1–2147483647 的 safe integer。測試注入 `scheduler:{setTimeout(fn,ms),clearTimeout(handle)}`；scheduler 受信任，應符合原生 timer 的非同步／handle 契約。所有時間推進及 transport 都以 fake 控制，測試不等待真實秒數。

三個修改命令均回傳 Promise：

| 命令／結果 | 語義 |
|---|---|
| `start({url,options}) → {ok:true,jobId}` | 只確認接受工作，**不是完成**；立即可觀察 resolving。完成與失敗由 `getState`／`onState` 觀察。遞增 jobId 從 1 開始。 |
| `start` 拒絕 → `{ok:false,code,jobId:null}` | BUSY 不變更當前工作；無效輸入清結果並回 failed，不呼叫 adapter、不分配新 jobId。 |
| `cancel`／忙碌 `clear` → `{ok:true,jobId}` | 只在該 job 的 `stop` resolve `undefined` 後確認成功。Promise 直接綁定 stop，不等待舊 inspect／download／verify settle。clear 的目標是 idle，cancel 的目標是 cancelled。 |
| 停止拒絕／逾時 → `{ok:false,code:'CANCEL_UNCONFIRMED',jobId}` | Promise settle，狀態 blocked 且新工作仍 BUSY；晚到同 job ACK 可解除，不會自動重啟。重新 cancel／clear 會重試同 job 的 stop；在途重複呼叫共用一次停止嘗試。 |
| idle／cancelled／complete／failed 的 cancel | `{ok:true,jobId:null}`，無新 stop；complete 的結果保留到 clear 或下次 start。無工作 clear 清參照回 idle，不刪檔案。 |
| onState 同步回呼內、或 start 驗證重入的修改命令 | `{ok:false,code:'BUSY',jobId:null}`。`getState` 仍可讀。同步 throw／非同步 reject 的 observer 都被隔離。 |

`getState()` 為 detached snapshot，固定欄位 `status,jobId,progress,result,error`。progress 為 null 或 `{downloadedBytes,totalBytes,percent}`；result 為 null 或 `{artifactId}`；error 為 null 或 `{code}`。不包含 URL／title／path／stderr。相同 job 的下載量須不遞減；無效數字、額外欄位、getter 等一律忽略。未知總量為 null／percent null；verify 前最高 99%，只有正確 verify 才 complete／100%。此處 fake artifact bytes 並非實際檔案量測證據。

### 最小 exact adapter schema

欄位列表在 [ADAPTER_SCHEMAS](src/core/controller.mjs) 中凍結，供主代理另寫 expected／fake：

| 階段 | exact 回傳欄位／範圍 |
|---|---|
| inspect | `{durationSeconds,totalBytes}`；duration 為 null 或 `(0,3600]` 有限 number；total 為 null 或 `[0,1073741824]` safe integer。未知值必須 null。 |
| download | `{artifactId,bytes,durationSeconds}`；bytes 為 `[1,1073741824]` safe integer；duration 為 `(0,3600]` 有限 number。 |
| verify | `{ok:true,artifactId}`；任何 false／缺值／額外欄位都不能 complete。最終 result 的 id 只採 verify 的值。 |
| onProgress | `{downloadedBytes,totalBytes}`；downloaded 為非負 safe integer；total 是 null 或大於 0 且不小於 downloaded 的 safe integer；都不超過固定 bytes 上限。 |
| stop | `Promise<void>`；只有 resolve `undefined` 才視為 ACK，`{stopped:true}` 等未知回傳仍 blocked。 |

兩種 artifactId 都必須是 `[A-Za-z0-9_-]{1,128}` 的 opaque ID，不接受 URL／任意檔案路徑。上述 records 僅 plain／null prototype、exact own data properties；symbols／accessors 拒絕，getter 不執行。畸形 adapter 回傳映射固定 `OPERATION_FAILED`。已知錯誤 code 可保留，其餘錯誤內容不讀、不 log。

### R01 缺陷與修正

主代理在早期核心的 48 項獨立檢查通過後，額外重現 Proxy `getPrototypeOf` 在 options 驗證內呼叫 start，導致 job1 被 job2 覆蓋、僅 job2 取得 stop 管理。早期 48 PASS 不代表覆蓋此缺口；原始重現與主代理證據保持原位，未改寫。

R01 修復只改 `src/core/controller.mjs`：在反射 request／options 前鎖定 start；metadata、artifact、verify、progress 資料反射後重新查核 live generation；錯誤 code 正規化也在釋放 active 前執行，之後再次確認 job 身份。如此取消／clear 發生於外來 Proxy trap 後，不可再 publish 舊階段或呼叫下一個 adapter。URL 另有 raw authority ASCII／等值檢查的 host 正規化收緊；errors／plan 未變，最終各檔 hash 如下表。新增 **31 個 R01 回歸測試**，涵蓋三種 reflection trap、request/options 重入、四類 adapter 資料的 cancel/clear，以及錯誤 descriptor 重入；全部通過。

### 命令與實際結果

工作目錄為此工具目錄，使用現有 `C:/Program Files/nodejs/node.exe`／`npm.cmd`（Node **v24.14.0**）。沒有瀏覽器、網路／真平台請求、引擎或新依賴執行。

| 命令 | 實際結果／exit | owner 證據 |
|---|---|---|
| `node --version` | v24.14.0 / 0 | [commands](../../.runs/media-downloader-2026-10-22/owner/commands.json) |
| `npm test` | **139 passed、0 failed、0 skipped** / 0 | [完整輸出](../../.runs/media-downloader-2026-10-22/owner/npm-test-01.txt) |
| `npm run check` | **PASS**，11 ESM、4 core、0 external dependencies / 0 | [完整輸出](../../.runs/media-downloader-2026-10-22/owner/npm-check-01.txt) |
| `npm run build` | **PASS**，4 core＋manifest / 0 | [完整輸出](../../.runs/media-downloader-2026-10-22/owner/npm-build-01.txt) |
| 既有環境 guard 前／後 | 實際 guard 均 **PASS**；完整 Snapshots 完全相同 / 最終包裝命令 0 | [before](../../.runs/media-downloader-2026-10-22/owner/environment-before.json)、[after](../../.runs/media-downloader-2026-10-22/owner/environment-after.json)、[comparison](../../.runs/media-downloader-2026-10-22/owner/environment-comparison.json) |

AC01–13 為手寫 expected URL／plan 正負及邊界案例；AC14–23 為確定性工作狀態、取消／晚回／timeout／重試、redaction、observer 及輸入隔離；AC24 包含 ESM import／語法／公開 API、真 build bytes/SHA、可重現 manifest、未知來源／輸出拒絕、junction 不跟隨。check/build 的額外 args 負面案例均實際 exit 1，是測試中的預期拒絕，不是略過失敗。

主代理隨後回覆：139 項 owner 測試及 **55 項獨立測試**、check/build 全 PASS，R01 只讀補核已解除。此為主代理的獨立驗收回報，未混入 owner 的 139 項數字；主代理證據由其持有。M0 只限背景核心驗收通過。

環境比較包裝第一輪 exit 2 原因是 PowerShell script 成功執行時 `$LASTEXITCODE` 為 null；該輪實際 guard 都 PASS 且 Snapshots 相同。保留 [第一輪比較](../../.runs/media-downloader-2026-10-22/owner/environment-comparison-attempt-01.json)，改以 invocation success 與 guard Status 明確判定後重新確認 exit 0。沒有發生或復原持久環境變更。

Windows guard 前後：HKCU PATH `ExpandString`／834 字元／ephemeral 0，SHA `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb`；HKLM PATH `String`／1227 字元／ephemeral 0，SHA `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8`。完整 Environment-key fingerprints 分別為 `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a`、`a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82`；TEMP/TMP hashes 也相同。既有 duplicate PATH entries 只記錄、不更動。

### 凍結 hash

| 範圍 | SHA-256 |
|---|---|
| [13 個 executable source／tests／scripts 的來源 manifest](../../.runs/media-downloader-2026-10-22/owner/source-manifest.json) 檔案 bytes | `f9aee68710d31a199f4b721b78b0dca54f9c7088cff857e35969d0e2c866c044` |
| [dist-core/manifest.json](dist-core/manifest.json) 檔案 bytes | `126eda2fdfbb4cd29dec873c2d17d5777abe8a642062299e39239bf1c933435c` |
| manifest 的四個 core records fingerprint | `3b9fa33f6a247ad68759da29992b245d328f487588c52beaf14abc2a5ac87db8` |
| controller source（與 dist bytes 相同） | `23a7f98147afde2c0f4962725e151991110927e9625f845120ebe7c8585a6d68` |
| errors source | `62532056ea28a7d13d575147c4d66f45cd5f641e32a5dae8471c51711edc7aaa` |
| plan source | `0e37a72a103c8a966335236a58280227d3375d33644298f40a9cce0fc54153be` |
| URL source | `84350650d4201ef0a091b964a1d12121e694ea2551456d6fcaa596088569fbcb` |

交接 metadata 不納入 executable source fingerprint，避免本文引用自身 hash 的循環；最終全部 owner 交付檔案 bytes／SHA 另見 [delivery-files](../../.runs/media-downloader-2026-10-22/owner/delivery-files.json)。

### 未驗項／限制／後續

- 所有 8 平台的**實際下載相容性仍 NOT_RUN**。沒有 yt-dlp／FFmpeg／ffprobe／EJS binary、實際媒體量測、授權作品測試或串流上限證據。M0 fake 只能驗控制流程，不能證明下載、檔案正確、網路 egress 或取消程序樹。
- UI／Chrome／Edge／native／IME／clipboard／dialogs：**NOT_RUN_USER_FOCUS_INCIDENT**；未開任何測試分頁、未操作使用者桌面。完整 M1/M2 gates 仍保留。
- 沒有 portable ZIP/runtime binary、live website、public repo、release 或首頁 inclusion；沒有 Git publication／deployment。`dist-core` 只是核心 bytes 封存。使用者的便攜助手、手動啟動／關閉／刪除方向保留至後續里程碑。
- 主代理已回覆獨立驗收通過，仍待其另給 M1 scope／依賴固定版本、供應鏈／license／隔離／network 與檔案邊界 gate。本輪沒有等待使用者回答的規格決策，也未要求新權限或成本。

**FROZEN：停止編輯，交回主代理親驗與整合。這不是完整產品完成或平台相容聲明。**

## 2026-10-22 — MD22-38-WEB-M1 / FROZEN

依 [WEB-M1 現行規格](docs/WEB-M1.md) 完成實際雙語靜態網頁。支援瀏覽器可讀的公開 HTTPS 影音直鏈或使用者選取的本機 File；預設保存原始 bytes，另可取出瀏覽器能解碼的短 WAV 音訊。沒有助手、引擎、第三方套件、MP3 編碼或平台作品頁擷取。本輪不 push、不部署、不另打 ZIP。原功能對話仍為 `01a16218-cb6e-7721-b83f-f34241b8c08c`，requested gpt-6.1-sol/max；backend identity 未獨立確認。

### 實際交付與操作入口

- [繁中模板](public/index.html)、[英文模板](public/en/index.html)，共用 [CSS](public/assets/style.css)、[app](public/assets/app.mjs)、favicon。工作區為 Product App：來源與輸出選項、主要開始按鈕、實際階段、取消／清除、可再次下載結果；使用系統字型及家族紙色／墨色／酸綠。320px／200% 的實際渲染由主代理驗。
- [source](public/assets/source.mjs)：公開 URL 驗證、固定 GET/CORS 選項、每塊累計上限、真正讀取收尾、timeout、File／獨立固定 demo 入口。
- [media](public/assets/media.mjs)：有限容器及 MIME 基本檢查；[audio](public/assets/audio.mjs)：Blob metadata 與 OfflineAudioContext 解碼；[wav](public/assets/wav.mjs)：解碼後限制及可取消的分塊 PCM16 WAV 編碼；[job](public/assets/job.mjs)：單工作、晚回失效與 object URL 所有權；[common](public/assets/common.mjs)：固定錯誤及 limits。
- [web-project](scripts/web-project.mjs)、[build-web](scripts/build-web.mjs)、[serve](scripts/serve.mjs)；更新 package/check，保留既有 core build 與原 139 項測試。新增 4 個 `test/web-*.test.mjs` 與 `test/web-fixtures.mjs`。所有產品改檔及 bytes／SHA 見 [delivery-files](../../.runs/media-web-m1-2026-10-22/owner/delivery-files.json)。
- `npm run build` **直接產生網站 `dist`**，不是只更新歷史 dist-core；本次為 preview/noindex。共 15 個網站 payload 檔案及一個 [manifest](dist/manifest.json)。同站示範音檔由 build 產生：單聲道、16 kHz、0.25 秒合成低振幅音，8044 bytes，無人聲或外部素材，僅按示範按鈕後取得、不自動播放。

主代理預覽命令：`npm run build` → `npm run serve -- --port=4218`，以 `http://127.0.0.1:4218/`、`/en/` 檢查。serve 只綁 loopback、不自動開分頁；本功能對話沒有啟動持續預覽 server。測試用 port 0 的自有 server 已精確 close，未碰其他程序。

### 可檢查的行為與邊界

URL 模式只在明確開始後 fetch，原 query 保留；拒 userinfo、非預設 port、控制／格式字元、空白／反斜線、IP literal、localhost／local／internal／test 等保留名稱。已知作品頁路由早期提示改用直鏈或 File。沒有 DNS 解析／重綁防護的前端能力宣稱。demo 為固定 `/assets/demo.wav` 的獨立入口，不放寬使用者 HTTPS 規則。

fetch 僅 GET、`mode:cors`、`credentials:omit`、`referrerPolicy:no-referrer`、`cache:no-store`、`redirect:error`；無 HEAD、Range、任意 header、no-cors 或代理／localhost 回退。只收 HTTP 200，206／其他狀態、opaque／redirected 拒絕。Content-Length 只作提前拒絕及提示，實際 chunks 總量超過 32 MiB 原檔／16 MiB WAV 輸入就 abort 並等待 reader cancel 收尾。總 120 秒／無非空資料 20 秒 timeout；錯誤只有固定 code，不輸出原 URL／query／exception。

原檔依 bytes 基本辨識 WAV、MP3、MP4/M4A、WebM、Ogg，MIME 缺少或 octet-stream 才由簽章判斷；宣告不符則拒絕。WAV 需 RIFF/WAVE、有效界內 fmt/data chunks；WebM 需 EBML 及 WebM DocType；MP4 使用有限品牌且排除 AVIF/HEIC、QuickTime。只做基本容器檢查，不是完整播放／解碼驗證或安全掃描，不保證 MP4 含影像／任一容器可解音軌。

WAV 模式先以本機 Blob metadata 確認有限正時長 ≤120 秒，10 秒無法量測即拒絕，並撤銷量測 object URL；之後才用 OfflineAudioContext 固定 48 kHz 解碼。解碼後檢查 frames／duration／sampleRate、≤2 聲道及 64 MiB Float32 PCM；超限不偷偷降聲道。每 4096 frames 編碼讓出事件迴圈、檢查取消；寫入正確 little-endian PCM16 WAV header、聲道交錯及裁切，非有限 sample 拒絕。native decoder 內部配置沒有硬記憶體隔離，不能把輸入／解碼後限制當作 native peak memory 保證。

`createMediaJob` 注入 readers/audio/encode/urlApi 供離線測試；API 為 `start({source,mode})`、`cancel()`、`clear()`、`getState()`。source 是 exact `{kind:'url',url}`／`{kind:'file',file}`／`{kind:'demo'}`，mode 為 original/wav。start 的 Promise 確認接受；實際狀態依序 fetching/checking（WAV 另有 metadata/decoding/encoding）到 ready/error。取消使舊結果立即失效並顯示 cancelling，等待該工作全部 Promise settle 後才 cancelled／clear 的 idle，再開放新工作。**decodeAudioData 沒有可靠 abort，沒有用 timeout／新代次假裝它停止**。若原生操作不 settle，維持等待，不開第二份工作。

來源、File、輸出模式修改、clear、pagehide 走失效／取消流程。結果只包含受管 blob URL、固定安全檔名、實際 bytes／容器格式、WAV 時長；不採來源檔名／標題／Content-Disposition。下載後不立刻 revoke，直到結果失效才撤銷，支援再次下載；取消／失敗不保留舊下載連結。量測成功／錯誤／取消／timeout 都清 timer、media src 與自己的 URL；pagehide 釋放工作參照，不宣稱立刻回收 RAM 或抹除 browser/OS cache，也不刪使用者已保存成果。

### WEB-M1 R01／R02 修正

主代理早期重現由其持有，未改寫：R01 為四個 sync bytes／Layer II 被誤收 MP3；R02 為 QuickTime `qt  ` 被標 MP4。已收緊 MP3：只收 MPEG1/2/2.5 **Layer III**、合法 bitrate／sample rate index 與完整 frame 長度，第一 frame 必須直接接在有效 ID3 tag 後或檔案開頭；不掃描 HTML／雜訊中的 sync。有後續 frame 時檢查相鄰完整 frame 的版次及 sample rate，允許 VBR bitrate；完整單 frame 及 ID3v1 尾標的有限情形可接受。這仍是基本 frame 檢查，未宣稱解碼所有內容。QuickTime 與圖像品牌不進 MP4 allowlist，沒有新增 MOV 支援。新增各自真假 fixture 回歸，全部通過。

### check／build／安全 headers

check 維持 M0 ESM／exact scripts／零依賴／API gate，新增 public 閉合檔案、import、兩語 ids、無 inline handlers／遠端資產／storage API 檢查。Node 語法檢查共 26 個 ESM，4 core／11 public source；靜態檢查不是瀏覽器 Network gate。

build 只寫 `dist` allowlist，拒 symlink/junction、未知目錄／來源／輸出與 path escape；生成每檔 bytes／SHA manifest。default preview 為 noindex,nofollow、robots 全拒絕、空 sitemap；canonical／hreflang 使用相對自身路徑，沒有捏造已發布 origin。release 需 `npm run build -- --mode=release --origin=https://media.glossquote.com` 的精確公開 HTTPS origin，才產絕對 canonical／互返 hreflang／x-default、index,follow、robots allow 及兩語 sitemap。**此命令是未執行的日後 release 用法**；release gate 只在測試 fixture 內驗過，交付 dist 仍 preview。

`_headers` 與 loopback 預覽回應一致：CSP default-src none、script/style self、connect-src self https:、media-src blob:、img self/data、font self、base/form/object/frame-ancestors none；no-referrer、nosniff、X-Frame-Options DENY、限制 camera/microphone/geolocation、no-store。HTTPS connect 只供明確媒體請求；沒有外部預載、遠端縮圖、SDK、telemetry、beacon、Service Worker 或 browser storage。公開部署是否真正送出 headers，仍需主代理之後驗。

### 實際命令、PASS 與環境證據

| 命令／檢查 | 實際結果／exit | owner 證據 |
|---|---|---|
| `npm test` 第一輪 | 221 PASS／0 fail／0 skipped / 0 | [npm-test-01](../../.runs/media-web-m1-2026-10-22/owner/npm-test-01.txt) |
| `npm test` 最終 | **221 PASS：原 139＋新增 82**／0 fail／0 skipped / 0 | [npm-test-final](../../.runs/media-web-m1-2026-10-22/owner/npm-test-final.txt) |
| `npm run check` | PASS：26 ESM、4 core、11 public source、0 external dependencies / 0 | [npm-check-01](../../.runs/media-web-m1-2026-10-22/owner/npm-check-01.txt) |
| `npm run build` | PASS：preview、15 payload＋manifest / 0 | [npm-build-01](../../.runs/media-web-m1-2026-10-22/owner/npm-build-01.txt) |
| 既有 persistent environment guard 前／後＋完整 Snapshots 比較 | PASS，全部相同 / 0 | [before](../../.runs/media-web-m1-2026-10-22/owner/environment-before.json)、[after](../../.runs/media-web-m1-2026-10-22/owner/environment-after.json)、[comparison](../../.runs/media-web-m1-2026-10-22/owner/environment-comparison.json) |

第二次 npm test 的原因：source/audio 的錯誤正規化改用 data descriptor，補足 getter 不執行的 redaction；沒有為計數重跑無變更 gate。原 139 測試及其測試檔保持不變；歷史 src/core 四檔＋dist-core 五檔共 **9 檔 bytes/SHA 完全不變**。長測試使用 Node v24.14.0、現有 npm，沒有 install；process-local npm offline/update-notifier 設定沒有持久化。原 Windows PATH registry type／length／hash／ephemeral count、完整 Environment-key fingerprints、TEMP/TMP snapshots 全部不變。

主代理回報另有 **42 個獨立測試 PASS**，包括 R01/R02、實際串流上限、PCM16 獨立解析、decode 取消等待。此數字與 owner 221 分開；不是隔離瀏覽器 PASS。本輪沒有背景 server 留待清理，也沒有停止其他程序。

### 凍結 hash 與未驗項

| 範圍 | SHA-256 |
|---|---|
| [source-manifest.json](../../.runs/media-web-m1-2026-10-22/owner/source-manifest.json)，32 個 executable source/test/script/package/gitignore 記錄的 manifest 檔案 bytes | `505f1acb8df48cbd5b55d498aa5d1284f66b8f8492db280d95990faaddde4c79` |
| 初版 [dist manifest 保留副本](../../.runs/media-web-m1-2026-10-22/owner/dist-manifest-before-r03.json) 檔案 bytes | `ecf7a2dc5983380e1123570cc1c05ebf5dcb6684336007717c59ca5d67cc2dc9` |
| dist 15 個 payload records fingerprint | `ccd76727cbab6d85ecab55c3e134a6f3556b27e6a8eea7c8389e344e52941d43` |
| demo.wav | `faa5d5d0760bea6b5860a1fbbd3e655b6ef4d192b2ba26c9003dcee7e85c46c6` |

owner 沒有執行瀏覽器／CUA／IAB／Playwright／native UI／鍵鼠／IME／clipboard／原生選檔保存。雙語真實 demo、File→WAV、控制來源 CORS、網路／storage／console、320px／200%／鍵盤／截圖、Chrome／Edge 與真裝置，都不能以離線 PASS 取代；由主代理既有核准隔離機制驗。真原生選檔／保存／OS 下載仍 **NOT_RUN_MANUAL**，不能以 protocol 檔案下載宣稱通過。

未做真平台下載（作品頁不是本版功能）、未公開 source／hosting／首頁、沒有正式 origin 的 live 證據。使用者來源的實際 codecs／CORS、native decoder peak memory 與異常關頁回收仍有瀏覽器／來源限制，介面已說明。沒有待使用者重選架構的阻塞；後續只等主代理驗收固定候選及回傳必要修正／release GO。

**FROZEN：以上 source 與 preview dist 停止編輯，交主代理獨立瀏覽器驗收。**

## 2026-10-22 — MD22-38-WEB-M1-R03 / R04 / FROZEN

本輪只修兩個由主代理實際重現的基本格式誤收。主代理回報修正前 221 owner＋42 獨立測試，以及 Chrome 155 隔離雙語 30 案例／10 次實際 protocol downloads 均通過；這些是**修正前候選**的證據，未冒稱涵蓋本次新來源。root 的 R03/R04 重現與其他 primary 證據未修改。原生選檔／保存／OS 下載仍不是 protocol download 可替代的人工 PASS。

R03：舊判定在前 4096 bytes 搜尋 `4282 84 webm`，忽略 EBML Header 宣告長度與元素邊界，會將真正 DocType 為 Matroska、假 WebM 字串在標頭外的資料誤標 WebM。已改成有界結構讀取：確認 EBML ID，解析最多 8-byte DataSize VINT、最多 4-byte Element ID VINT，拒絕截斷／零開頭／未知長度／非 safe integer／payload 越界；整個 Header 上限 4096 bytes。逐個頂層 Header 元素依自己的長度前進，只允許一個 ID `0x4282`，其長度必須 4、值精確為 ASCII `webm`。其他元素的內容及 Header 後的 Segment 不搜尋；重複、Matroska、大小寫／補零錯誤、缺少或越界的 DocType 一律拒絕。這是有限 Header 類型檢查，不是完整 EBML／WebM demux 或 codec decoder。

原正面 fixture 原本宣告 11-byte Header payload、實際只有 7 bytes，已修正為 7；另加包含標準 Header 欄位的有效 31-byte payload、不同 VINT 寬度、Void 前後、4096-byte 邊界正例。加入精確 Matroska／標頭外 WebM 重現、截斷與畸形 VINT、未知長度、其他元素內藏 DocType、重複／衝突 DocType 等回歸。沒有引入套件或新增格式支援。

R04：`ftyp` box size 現在另要求 `size % 4 === 0`，保留原 min16／不超出來源 bytes 檢查，避免半個 compatible-brand 項目被收為 MP4。精確 17-byte 重現及 18／19-byte 不完整表均拒絕；16-byte 零 compatible-brand 項與 20-byte 完整項的有效基本形狀仍通過。沒有擴充 MP4 demux 或 MOV 支援。

### 本輪改檔與驗證

實作只改 [media.mjs](public/assets/media.mjs)，對應只改 [web-media.test.mjs](test/web-media.test.mjs)；`web-fixtures.mjs`、其餘 public、scripts/package/CSS/HTML、原139測試、M0 src/core 與 dist-core 皆未改。以既有 `npm run build` 重建 preview dist，只有 `dist/assets/media.mjs` 與 `dist/manifest.json` 的 bytes 改變。另更新本 HANDOFF、TASK-ENTRY、project metadata。精確範圍與每檔 SHA 見 [delivery-files-r03](../../.runs/media-web-m1-2026-10-22/owner/delivery-files-r03.json)。

| 命令 | 結果／exit | 新增證據（未覆寫舊 log） |
|---|---|---|
| `node --test test/web-media.test.mjs` | **45 PASS**／0 failed／0 skipped / 0 | [node-test-media-r03](../../.runs/media-web-m1-2026-10-22/owner/node-test-media-r03.txt) |
| `npm test` | **249 PASS**（原139＋先前82＋本輪28）／0 failed／0 skipped / 0 | [npm-test-r03](../../.runs/media-web-m1-2026-10-22/owner/npm-test-r03.txt) |
| `npm run check` | PASS，26 ESM、4 core、11 public source、0 依賴 / 0 | [npm-check-r03](../../.runs/media-web-m1-2026-10-22/owner/npm-check-r03.txt) |
| `npm run build` | PASS，preview、15 payload＋manifest / 0 | [npm-build-r03](../../.runs/media-web-m1-2026-10-22/owner/npm-build-r03.txt) |
| 既有環境 guard 前／後與完整 Snapshots 比較 | PASS，全部相同 / 0 | [before-r03](../../.runs/media-web-m1-2026-10-22/owner/environment-before-r03.json)、[after-r03](../../.runs/media-web-m1-2026-10-22/owner/environment-after-r03.json)、[comparison-r03](../../.runs/media-web-m1-2026-10-22/owner/environment-comparison-r03.json) |

28 個新增測試為 R03 的 27 個與 R04 的 1 個測試；參數表中的多個 fixture 不額外膨脹 PASS 數。只在本輪變動後跑受影響檔及必要完整 gates，各命令一次，無測試失敗轉標 PASS。HKCU/HKLM PATH hash、registry type／length、ephemeral entry count、完整 Environment-key fingerprints 及 TEMP/TMP snapshots 均不變。沒有安裝、依賴下載、外網／真平台請求、browser/native UI、鍵鼠／IME／clipboard、Git 或部署操作。

### 保留舊證據與本輪 hash

既有 owner 13 份證據（含舊 source manifest／delivery manifest／logs／環境快照）全部保持原 bytes／SHA。原 `dist/manifest.json` 在重建前另存 [dist-manifest-before-r03](../../.runs/media-web-m1-2026-10-22/owner/dist-manifest-before-r03.json)；原 media 與測試 bytes 也另存 [media-before-r03](../../.runs/media-web-m1-2026-10-22/owner/media-before-r03.mjs)／[web-media-test-before-r03](../../.runs/media-web-m1-2026-10-22/owner/web-media-test-before-r03.mjs)，僅供歷史查閱，不是目前實作。當前 dist manifest 另固定為 [dist-manifest-r03](../../.runs/media-web-m1-2026-10-22/owner/dist-manifest-r03.json)。

| 範圍 | SHA-256 |
|---|---|
| 新 [source-manifest-r03.json](../../.runs/media-web-m1-2026-10-22/owner/source-manifest-r03.json) 檔案 bytes，32 個 executable records | `2fd1b7dfe8a4e5a3df2c8d2c4f13c73fec825c23f0d519ea2fc1aa89c1e0bbd5` |
| 新 dist/manifest.json 檔案 bytes | `b9b649c74a9c329080193d5241cd9e667e533f45af5831c1c584e8823f699509` |
| 新 dist payload records fingerprint | `27c390b42cadf4b05f87aa741d59b5d9da97c2a627035825e35051cd6e3a9596` |
| 新 media.mjs source／dist 同 bytes | `c2959c0a9d0a8936401f2839fbe15c90557ee55f7ccfd7f8cddc64909dbebbe7` |
| 新 web-media.test.mjs | `a55a58474727ef706e29303dc8d4e34fcb48f6c4ed14d7fb181ba7e92675ba54` |

package 版本仍 `0.1.0-web-m1`，本次候選以 R03/R04 及固定 hash 區分；沒有未授權修改 package。舊 hash 與本輪 hash 分開記錄，不能把舊 Chrome／獨立證據當新來源已通過。主代理需獨立複核本修正後決定必要重驗與封裝。原生人工保存、Edge／真裝置與發布狀態仍保持如實 NOT_RUN／未發布。

**FROZEN：R03/R04 實作、測試與 preview dist 已凍結；等待主代理複核，不再編輯。**

## 2026-10-22 — MD22-38-RELEASE / 任務 A / FROZEN

依 [WEB-RELEASE](docs/WEB-RELEASE.md) 準備已驗證純網頁能力的正式候選。本輪不是平台作品頁下載／多格式功能升級，也沒有公開、部署或改共享首頁／看板。主代理提供的既有主驗範圍為產品249、獨立57及50個瀏覽器案例，對完全未變的 public／核心沿用；這不是本輪重新執行的 PASS 數。原生選檔／保存／OS 下載與真機／未測瀏覽器維持 NOT_RUN。

### 交付與固定目標

新增 [wrangler.jsonc](wrangler.jsonc)、[scripts/release.mjs](scripts/release.mjs)、[test/release.test.mjs](test/release.test.mjs)。更新 README／START-HERE、本文、TASK-ENTRY、project metadata；以既有 build helper 生成正式 `dist`。精確改檔與候選差異見 [delivery-files](../../.runs/media-web-release-2026-10-22/owner/delivery-files.json) 及 [candidate.diff](../../.runs/media-web-release-2026-10-22/owner/candidate.diff)。沒有修改 public/、src/、dist-core/、既有 scripts／tests、package 或 gitignore；37 個既有實作／測試／package／歷史 core 產物檔案維持原 bytes/SHA。

Worker 固定 `glossquote-web-media-saver`，唯一 custom domain `media.glossquote.com`，compatibility_date `2026-10-22`；assets-only `./dist`，`run_worker_first:false`、`html_handling:auto-trailing-slash`、`not_found_handling:none`。workers_dev／preview_urls／send_metrics／observability／logs／invocation_logs／traces 全 false；沒有 main、KV、R2、service、vars 或其他資源綁定。設定驗證採 exact 物件，未知欄位／第二個 route／異動 target 或自動下載 hook 都拒絕。

build hook 只執行 `node scripts/release.mjs`。該命令不接受 argv、origin 或部署參數，只在既有 allowlist 下重建固定 `https://media.glossquote.com` 的 release dist，驗證整個 manifest、每檔 bytes/SHA、正式雙語 SEO／robots／sitemap、安全 headers、原 UI body 及應用資產一致。沒有 shell／網路／Token／Git／Wrangler 呼叫。原 `npm run build` 維持 preview/noindex；本輪不增加 npm script，避免改動已固定的 exact package/check gate。這是刻意使用獨立 release 入口，不是遺漏發布命令。

正式 metadata 為 index,follow，canonical／zh-Hant/en/x-default 精確指向正式兩頁，robots allow 及 sitemap 恰為兩個正式 URL。preview 在測試 fixture 仍 noindex／robots deny，會被正式驗證拒絕。只產生正式候選，**沒有 live 網站驗證聲明**。dist 只有兩份 HTML 的 SEO、robots、sitemap 及 manifest bytes 改變；應用 CSS/JS/SVG、合成 demo 與 `_headers` 不變。

### 實際驗證與未執行項

| 命令／檢查 | 實際結果／exit | owner 證據 |
|---|---|---|
| `node --test test/release.test.mjs` | **14 PASS、0 fail、0 skipped** / 0 | [node-test-release-01](../../.runs/media-web-release-2026-10-22/owner/node-test-release-01.txt) |
| `npm run check` | PASS，28 ESM、4 core、11 public source、零依賴 / 0 | [npm-check-01](../../.runs/media-web-release-2026-10-22/owner/npm-check-01.txt) |
| `node scripts/release.mjs` | PASS，release、固定 origin、15 payload＋manifest / 0 | [node-release-01](../../.runs/media-web-release-2026-10-22/owner/node-release-01.txt) |
| 既有環境 guard 前／後完整 Snapshots 比較 | PASS，全部相同 / 0 | [before](../../.runs/media-web-release-2026-10-22/owner/environment-before.json)、[after](../../.runs/media-web-release-2026-10-22/owner/environment-after.json)、[comparison](../../.runs/media-web-release-2026-10-22/owner/environment-comparison.json) |

新增14項包含：精確部署目標／禁用觀測、異動 Worker/domain／資源／hook 的拒絕、正式 SEO／closed hash、preview 隔離、即使重算 manifest 仍拒放寬 CSP／wrong origin／noindex／錯語言首頁／改寫 body／改寫資產／robots／sitemap、未知產物及額外 manifest 欄位、CLI 不接受 override。原249＋57＋50只沿用未變程式的主驗證據，沒有把它們加進本輪14項或冒稱本輪重新跑完整套件。所有子程序 windowsHide，沒有 install 或新依賴。

配置參考既有家族已審閱設定與 [Wrangler 官方設定](https://developers.cloudflare.com/workers/wrangler/configuration/)、[HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)。工具鏈要求沿用 **Wrangler 4.147.0**，本專案未加 Wrangler 套件，release script 的輸出欄位是 `wranglerVersionRequired`，不是已啟動 CLI 的版本證據。本輪沒有執行 Wrangler／dry-run、讀 Token、接觸認證、修改全域 Git／gh 或持久環境；固定 CLI 的實際版本／schema／dry-run 和雲端路由／404／redirect／HTTP headers／Insights/NEL 由主代理後續驗。曾嘗試讀取第一方 tag schema URL 而得404，沒有將失敗當 PASS 或下載替代工具；官方文件查閱不屬離線測試流量。

### 固定 hash 與交接順序

| 範圍 | SHA-256 |
|---|---|
| [executable-manifest.json](../../.runs/media-web-release-2026-10-22/owner/executable-manifest.json)，35 個 executable/config source records | `1d1d9d3f83c0c1522047071577f014adea74a0073a6d0a64b4de889e5d622e2c` |
| [release dist manifest](../../.runs/media-web-release-2026-10-22/owner/release-dist-manifest.json) 檔案 bytes | `667c4f23fd7ffe9857742bd1c2223eabf762e723f9acf92d36ff869e6b73be04` |
| release payload records fingerprint | `e112bd1b0c85d596998c3e2eebe7d0a6158c9b01a8ec7998bca69ced719a5972` |

完整非產物來源（含本輪文檔／metadata，排除 dist 與歷史 dist-core）另固定在 [full-source-manifest](../../.runs/media-web-release-2026-10-22/owner/full-source-manifest.json)，檔案 SHA 記錄於 owner 最終驗證及回報，避免文件引用自己的 hash 形成循環。變更前 preview manifest 保留於 [preview-manifest-before](../../.runs/media-web-release-2026-10-22/owner/preview-manifest-before.json)，全部舊 M0／WEB-M1／R03/R04 證據與歷史 ZIP 未動。

下一步只等主代理親閱固定來源／產物並給 GO；收到後原功能對話才做任務 B 的 reviewed publishing copy、前後 Git settings guard、公開 `KYStr/glossquote-labs-web-media-saver` 及遠端 commit／visibility 驗證。這不是新的使用者授權問題，也不是現在就公開所有工作目錄檔案；B 的來源清單仍須審閱、排除 .runs／私密資料／其他產品。部署、首頁、看板及單一交付 ZIP 全由主代理整合。

主代理另新增 [PRODUCT-NEXT](docs/PRODUCT-NEXT.md)，是其自有的後續具體用戶任務／平台與格式路線，列入完整 source manifest，任務 B 的公開文檔也須攜帶並清楚標為未實作。本功能對話沒有修改它，沒有開始 P1／P2／P3。

**FROZEN：任務 A 完成，停止編輯；未執行任務 B、GitHub 推送或部署。**

## 2026-10-22 — MD22-38-RELEASE / 任務 B / SOURCE PUBLIC / FROZEN

收到主代理對35檔 executable/config manifest `1d1d9d3f83c0c1522047071577f014adea74a0073a6d0a64b4de889e5d622e2c` 與 release manifest `667c4f23fd7ffe9857742bd1c2223eabf762e723f9acf92d36ff869e6b73be04` 的明確 GO 後，已由原功能對話親自完成來源公開。主代理另回報發布切片12個雙語案例通過：合成H264/AAC影片原檔bytes相同、1秒48kHz WAV非靜音且主要頻率439.5Hz；此為主代理安全隔離結果，非本對話執行UI。

### 遠端固定版本

| 項目 | 已驗證結果 |
|---|---|
| Public repository | [KYStr/glossquote-labs-web-media-saver](https://github.com/KYStr/glossquote-labs-web-media-saver) |
| 完整 commit | [`8716a264c6d6866d2343a0b7ec7b2a163dc797c7`](https://github.com/KYStr/glossquote-labs-web-media-saver/commit/8716a264c6d6866d2343a0b7ec7b2a163dc797c7) |
| branch／default branch | `codex/web-media-saver-release` |
| Git tree | `ae870d3a8612bf38fed1e5f6f24fc910b64f57da` |
| visibility | `PUBLIC`，`isPrivate:false` |
| tree/source | 43個tracked blob，GitHub tree未截斷，逐檔blob SHA／mode／bytes與本地HEAD及reviewed SHA-256清單一致。 |
| reviewed publishing copy | `.runs/github-publish/glossquote-labs-web-media-saver`，位於此工作區根；Git status空、實際非Git檔案也恰為43個。 |
| 公開來源清單 SHA-256 | [publishing-source-manifest-b.json](../../.runs/media-web-release-2026-10-22/owner/publishing-source-manifest-b.json)：`a2e34884f0bf495f438798044bb9653df7ee69f8c6a5fac6dca48177cbd6afc9` |

完整結果見 [publication-result-b](../../.runs/media-web-release-2026-10-22/owner/publication-result-b.json)，Git物件清單見 [git-head-reviewed-b](../../.runs/media-web-release-2026-10-22/owner/git-head-reviewed-b.json) 與 [github-tree-b](../../.runs/media-web-release-2026-10-22/owner/github-tree-b.json)。未另外製作source ZIP；完整乾淨copy與tree已交主代理納入單一交付包。

### 發布副本與重現

核准35個程式／public／tests／scripts／package／gitignore／wrangler檔的bytes完全不變。公開副本另有自包含README、HANDOFF、PRIMARY接受摘要、PRODUCT、技術／隱私說明、原樣PRODUCT-NEXT與SOURCE-MANIFEST；合計43檔。沒有AGENTS、TASK-ENTRY、TASKS、私有執行目錄、憑證、profiles、node_modules、原生媒體引擎或其他產品。公開文件不含失效的私有證據連結／機器路徑，source標公開、hosting標主代理待驗；後續平台與編碼路線清楚標為未實作。

在獨立copy重跑發布14測試及check均exit0，目的為確認移除內部文件後仍可獨立重現，不是新增14個unique案例。另建保留產物的驗證副本 `.runs/media-web-release-2026-10-22/owner/build-verification-copy-b` 執行 `node scripts/release.mjs`，exit0、產出manifest仍為核准 `667c4f23…`。發布copy不放generated dist，驗證副本保留全部產物，原工作區dist也保留；沒有刪除待發布dist或既有工作檔，測試僅依既有路徑檢查清理自己建立的fixture。

本地Git index與HEAD的43個blob逐bytes檢查後才推送。GitHub的repo／branch／commit／tree API再次確認同一commit、PUBLIC與全部43檔相符；沒有force push、改原工作區Git、建立PR或自動部署。提交作者使用現有KYStr公共identity的noreply地址，只用per-command設定，不讀或改全域作者／認證設定。

### 實際命令與保護證據

| 動作 | 實際結果 |
|---|---|
| 既有CLI identity／repo狀態 | KYStr公共login/id可用；目標repo原先不存在，repo view的exit1為建立前狀態，不是認證修復。 |
| publishing copy `node --test test/release.test.mjs` | 14 PASS／0 failed／0 skipped、exit0；[log](../../.runs/media-web-release-2026-10-22/owner/publishing-copy-tests-b.txt) |
| publishing copy `npm run check` | PASS，28 ESM、exit0；[log](../../.runs/media-web-release-2026-10-22/owner/publishing-copy-check-b.txt) |
| retained verification copy `node scripts/release.mjs` | PASS／核准release manifest相同、exit0；[log](../../.runs/media-web-release-2026-10-22/owner/publishing-copy-release-b.txt) |
| `gh repo create … --public` | exit0；[log](../../.runs/media-web-release-2026-10-22/owner/gh-repo-create-b.txt) |
| `git push --set-upstream origin codex/web-media-saver-release` | exit0；僅該新公開repo，per-command gh credential helper；[log](../../.runs/media-web-release-2026-10-22/owner/git-push-b.txt) |
| GitHub repo／branch／commit／tree讀回 | 全exit0、PUBLIC、完整commit及tree一致；[receipt](../../.runs/media-web-release-2026-10-22/owner/publication-result-b.json) |
| Git settings guard | [before](../../.runs/media-web-release-2026-10-22/owner/git-before-b.json)／[after](../../.runs/media-web-release-2026-10-22/owner/git-after-b.json) file fingerprints完全相同，reviewed guard verify exit0；[result](../../.runs/media-web-release-2026-10-22/owner/git-settings-comparison-b.txt) |
| persistent environment guard | [before-b](../../.runs/media-web-release-2026-10-22/owner/environment-before-b.json)／[after-b](../../.runs/media-web-release-2026-10-22/owner/environment-after-b.json)完整Snapshots相同、exit0；[comparison](../../.runs/media-web-release-2026-10-22/owner/environment-comparison-b.json) |

只用既有CLI認證，沒有auth login/refresh/setup-git、global/system Git寫入、Token檔案／憑證值讀取、權限擴大、套件安裝、browser/native UI／鍵鼠／IME／clipboard、首頁／看板修改或Cloudflare部署。所有子程序採非互動與windowsHide，Git hooks／signing／credential helper／作者僅以本次命令參數控制；沒有持久PATH/TEMP/registry/services變更。

### 過程中保留的未通過嘗試

一次含「刪除新產生dist」的組合命令被自動審查以 `blocked by policy` 拒絕，整條命令未執行；改用獨立、保留全部產物的驗證副本完成，未再次嘗試刪除。文件掃描第一輪exit1是regex將HTTPS的 `s:/` 誤當磁碟路徑；修正邊界後review通過，公開source/document bytes未為此變更。其後一次不存在驗證目錄的命令也未啟動；真正建立後的release才計為exit0。這些均記錄在 [attempt-01](../../.runs/media-web-release-2026-10-22/owner/publishing-copy-review-attempt-01.json)，沒有將未執行或失敗嘗試改標PASS。

Git 2.40將process-local `GIT_CURL_VERBOSE=0` 視為啟用而輸出傳輸紀錄；其4行authorization相關值全部已遮蔽，local scanner只回報計數，**未遮蔽欄位0**，見 [redaction check](../../.runs/media-web-release-2026-10-22/owner/transport-redaction-b.json)。後續清除該process debug值；沒有將憑證帶入來源、公開文檔、命令參數或全域設定。

**SOURCE PUBLIC / FROZEN：原對話已完成A與B，停止編輯。Hosting、正式站HTTPS／headers／routing驗證、首頁、看板與單一ZIP由主代理接續；外部驗收尚未完成。**

## 主代理驗收 2026-10-22

已獨立核對最終來源與實際修改，重跑249產品測試、57獨立測試、check/build，並完成30項既有＋20項最終delta的隔離Chrome案例。限定範圍通過；人工、Edge、真來源與完整生命周期待驗。GitHub／hosting未發布，未標外驗完成。詳細固定hash與重驗範圍見[主代理驗收](PRIMARY-ACCEPTANCE.md)。


## 主代理正式發布驗收 2026-10-22

已驗證來源與正式站，雙語首頁及看板完成整合。本版等待外部驗收，能力與未驗範圍見[RELEASE-ACCEPTANCE](RELEASE-ACCEPTANCE.md)。


## 2026-10-22 — WMA22 任務 A / F01 / FROZEN

已完整審閱本輪 TASK、外驗 00–03 與 patch-candidate 差異，對照主代理 before-source 及固定公開 commit `8716a264c6d6866d2343a0b7ec7b2a163dc797c7` 的35份程式／設定。只修 `scripts/release.mjs` 與 `test/release.test.mjs`，並以 append 保留本交接及 TASK-ENTRY 原有 bytes。外驗候選未當作指令執行，沒有覆蓋整份來源。

F01 是發布驗收器未封閉核對 head 的缺口；沒有證據表示正式站已被修改或停止收錄。現在以固定 public HTML 加上僅兩項核准替換（index,follow、正式 canonical/hreflang）重建預期 HTML，對整份輸出作 Buffer bytes 相等檢查。head 或 body 的未核准變更，即使重算輸出 manifest 仍會拒絕；既有 config、資產、demo、manifest、CSP、SEO 及 body 檢查保留。

正式回歸新增兩語各8例：額外 robots NOINDEX／none、googlebot NOINDEX、單引號第二 canonical、移除 viewport、改 charset、改 title、移除 description。每例先確認變異真正發生與 body 不變，再逐檔重驗重算 manifest 的 bytes/SHA/content fingerprint 自洽，最後要求因 `RELEASE_HTML_CHANGED` 拒絕；原封產物正例仍通過。

| 實際 Node 24.14.0 命令（使用完整 node.exe 路徑） | 結果 | 證據 |
|---|---|---|
| node --test --test-concurrency=1 test/*.test.mjs（等價 npm test） | 279 PASS、0 fail、0 skipped，exit 0 | [stdout](../../.runs/web-media-external-2026-10-22/owner/full-test-a.stdout.txt)、[argv/exit/runtime](../../.runs/web-media-external-2026-10-22/owner/full-test-a.command.json) |
| node scripts/check.mjs（等價 npm run check） | PASS，28 ESM、4 core、11 public、零外部依賴，exit 0 | [stdout](../../.runs/web-media-external-2026-10-22/owner/check-a.stdout.txt)、[argv/exit/runtime](../../.runs/web-media-external-2026-10-22/owner/check-a.command.json) |
| node scripts/release.mjs | PASS，固定正式 origin、15 payload＋manifest，exit 0 | [stdout](../../.runs/web-media-external-2026-10-22/owner/release-a.stdout.txt)、[argv/exit/runtime](../../.runs/web-media-external-2026-10-22/owner/release-a.command.json) |
| 持久環境 guard 前後完整 Snapshots 比對 | PASS，HKCU/HKLM PATH hash/type/length、ephemeral count 與完整 Environment-key fingerprint 全相同 | [comparison](../../.runs/web-media-external-2026-10-22/owner/environment-comparison-a.json)、[before](../../.runs/web-media-external-2026-10-22/owner/environment-before-a.json)、[after](../../.runs/web-media-external-2026-10-22/owner/environment-after-a.json) |

279項包含既有263項與本輪16項，未把其他元件複核或歷史瀏覽器案例相加。三條命令的完整 stdout/stderr、實際 argv、runtime、exit 與時間均已保存；所有自有子程序 shell=false、windowsHide=true。Node 24 版本門檻保留，並未沿用外驗 Node 22 的版本受阻結果作 PASS。

| 固定範圍 | SHA-256 |
|---|---|
| scripts/release.mjs（6,613 bytes） | `ec7124f04a632f45e6cd220c448a7c127464c901ea932bf652dc22aac13b22ab` |
| test/release.test.mjs（12,841 bytes） | `7e5fb43909b622c52444508a3ce1a180cebfc51ba3cfcfe9e3fe2b2c723468f9` |
| [35份 executable/config manifest](../../.runs/web-media-external-2026-10-22/owner/executable-manifest-a.json) | `2674d19a66249996a3d05a6a8edb53df80b30aa5f1df1eb4b05d7055844d24fa` |
| 正式 dist/manifest.json（保持原版） | `667c4f23fd7ffe9857742bd1c2223eabf762e723f9acf92d36ff869e6b73be04` |
| 正式 payload fingerprint（保持原版） | `e112bd1b0c85d596998c3e2eebe7d0a6158c9b01a8ec7998bca69ced719a5972` |

修改前完整80檔 snapshot 與原 bytes 副本位於 [source-before](../../.runs/web-media-external-2026-10-22/owner/source-before-a.json)／owner/before-source-a。正式16檔全部逐 bytes 及 SHA 不變；11份 public、M0 src/core 與 dist-core、build/package/wrangler、其他非許可來源也未改。僅兩份程式與兩份追加文檔有變動。最終受限差異、全來源清單、逐檔保護比對與 freeze hash 見 [result-a](../../.runs/web-media-external-2026-10-22/owner/result-a.json)、[diff](../../.runs/web-media-external-2026-10-22/owner/restricted-diff-a.patch)、[frozen manifest](../../.runs/web-media-external-2026-10-22/owner/frozen-source-manifest-a.json)。

本輪只有本機來源驗收器修正；正式網站 assets 未改版，沒有 push、deploy、首頁／看板變更，未開始任務 B。沒有安裝套件、browser/native／桌面／鍵鼠／IME／clipboard 操作、憑證讀取、Git／持久環境設定變更或再次委派。

交接文件追加 helper 曾因 Markdown backtick 的 template literal 語法錯誤在任何產品寫入前 exit 1；保留 [attempt-01](../../.runs/web-media-external-2026-10-22/owner/append-handoff-a-attempt-01.json) 及當時程式，修正後才執行 append。這不是產品測試失敗，沒有把該嘗試改標 PASS。

外驗維持 PARTIAL／EXTERNAL_SCOPED_COMPONENTS_AND_EVIDENCE_REVIEWED。外部報告的97元件已包含48組PCM，18份交付成品複核也不是新 browser 執行，本輪不重算為新增驗收。完整 Network/Storage lifecycle、獨立 browser E2E、Edge、真機、原生選檔／另存、讀屏仍 NOT_RUN；沒有把它們改成 PASS，也沒有宣告整體外驗 complete。

**FROZEN：WMA22 任務 A 完成，停止修改，交主代理親讀差異及獨立複驗。僅於其固定 manifest／GO 後，由原對話另行進行任務 B 公開來源更新；本輪不部署。**

# 影片取出 MP3 音訊 — 既有規格保存

Task ID: `labs-11-video-to-audio` · Spec ID: `spec-11-video-to-audio`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# MP4 轉 MP3 產品規格

這是規格，尚未實作。正式支援範圍必須由 T02 spike 證據決定，不能僅靠 API 存在。

| 編號 | 可觀察行為與限制 |
|---|---|
| FR-01 | 一次一個本機 MP4，非空且最多 50 MiB（52,428,800 bytes）；先查大小與 MP4 ftyp，再讀進轉檔器。不接受 URL、拖入文字、多檔或其他容器。 |
| FR-02 | ffprobe 結果須有且僅有 1 個 h264 視訊與 1 個 aac 音訊，音訊 1 或 2 聲道、採樣率 8,000–48,000 整數 Hz；format.duration 與音訊 duration 均有限正數且 ≤180 秒。拒絕加密 tag enca/encv、缺時長、附帶額外 streams、未知 codec。不以副檔名或 video.canPlayType 當驗證。 |
| FR-03 | 產出固定 MP3、128 kbps、44,100 Hz、2 聲道，整段音訊。不提供品質／音軌選單，不自動 normalize 音量，不輸出 WAV 或其他格式。 |
| FR-04 | 初次執行前顯示轉檔元件的實際下載總量與「下載元件並開始轉換」。明確區分程式資源下載與影片內容上傳。元件只能由同源靜態網址取得，不在選檔前預載大型 wasm。 |
| FR-05 | 分別顯示下載元件、檢查音軌、轉換、完成。下載有 Content-Length 或 manifest 總數才顯示 bytes；轉換進度不可靠時只顯示階段與經過時間，不能虛構百分比。 |
| FR-06 | 音軌檢查 timeout 15 秒；轉換 timeout 180 秒；元件下載 timeout 120 秒，下載完成後引擎初始化另限 60 秒。取消立即失效 jobId，terminate 底層 Worker，丟棄部分輸出與虛擬檔案系統，下次新建實例。UI 在 1 秒內顯示已取消；不承諾 OS 記憶體即刻歸還。 |
| FR-07 | 完成須 exit=0、產物非空、≤4 MiB 且通過 MP3 輸出探測／本機 audio 載入測試，才顯示播放器與下載。固定檔名 audio.mp3；MIME audio/mpeg；保留音質是盡量忠實重編碼，不保證無損。 |
| FR-08 | 有效來源與設定只留目前頁面。取消轉換保留來源 File 可重試，銷毀 Worker／輸出；清除／換檔則連來源與 input 值、audio.src、所有 URL／buffer 引用一起釋放。元件一般 HTTP 快取可能保留，不存影片內容。 |
| FR-09 | 原影片檔名只以文字顯示，寫到虛擬檔案系統一律 input.mp4／output.mp3／probe.json。參數用固定陣列傳 exec，不接使用者 ffmpeg 參數。不把檔名或 ffmpeg 原始 log 放 console、儲存、錯誤或 telemetry。 |
| FR-10 | 不讀攝影機／麥克風，不連第三方轉檔服務；無雲端備援。尚未測的瀏覽器寫「未驗證」，缺 WASM／Worker 或自測失敗顯示不支援；功能頁仍保留說明與可讀錯誤。 |
| FR-11 | 所有媒體處理與大型拷貝透過 Worker／ffmpeg 封裝處理，畫面保持可操作。一次最多一個工作。新工作不能被舊 progress／error／success 回覆覆蓋。 |
| FR-12 | 固定錯誤：EMPTY_FILE、MULTIPLE_FILES、FILE_TOO_LARGE、FORMAT_UNSUPPORTED、MEDIA_UNSUPPORTED、DURATION_TOO_LONG、RUNTIME_LOAD_FAILED、RUNTIME_INTEGRITY_FAILED、JOB_TIMEOUT、CONVERT_FAILED、OUTPUT_INVALID、BROWSER_UNSUPPORTED。顯示可改選短片或重試，不顯示原始 stderr。 |

如果 spike 無法在明定資源預算達標，保持「技術驗證未通過」，不得暗中提高上限、換成多執行緒或加入雲端。調整產品限制是下一個有紀錄的決策，不是把失敗測試刪掉。

未來候選：保留 AAC 不重新編碼、更多輸入格式、聲道選擇、裁切、批次。皆不屬 MVP。


---

## 原文件 TECHNICAL.md

# MP4 轉 MP3 技術規格

這是規格，尚未實作。原生 HTML/CSS/瀏覽器 ESM；Node.js 24+ 僅開發／測試／靜態建置。正式頁沒有 Node 轉檔後端。

## 候選依賴與可證偽的技術閘門

候選 `@ffmpeg/ffmpeg`＋單執行緒 `@ffmpeg/core`。不用 core-mt，不借 SharedArrayBuffer 把跨來源隔離成本藏起來；不用 React、CDN、@ffmpeg/util（File.arrayBuffer 足夠）。T01 核實正式套件版本與相容 API，固定精確版本、lockfile、包完整性、所有執行期檔案、授權文件與 ffmpeg build configuration。wrapper 的授權不代表 core 及其 codec 全相同；無法確認可分發的固定組合即停，不能自行推斷商業授權結論。

T01 在 `docs/DEPENDENCIES.md` 記 package/version/source/license/decision，並將實際需要資產列 `public/runtime-manifest.json`：schemaVersion=1、runtimeId、files:[{path,bytes,sha256,mime}]。所有 path 為同源 `/vendor/ffmpeg/` 下固定相對路徑，禁止 URL／query／..／重複路径；bytes 為正整數、sha256 為 64 位 hex。runtime 資產合計硬預算 80 MiB；這是產品下載預算，不是聲稱套件大小。T02 複製後由 build/check 重算雜湊，執行時可下載前驗 manifest，wasm bytes 用 crypto.subtle.digest 驗證後才供固定 adapter 載入；JS 在建置端驗證並透過固定同源路徑載入，不假稱動態 import 自帶完整性檢查。

**T02 通過條件**（全部是待測門檻）：

1. 使用可取得的 Windows 11、至少8 GB RAM實機，記錄實際CPU/RAM及當期Chrome與Edge完整版本。較高RAM裝置可通過本機MVP驗證；未實測8 GB時只標「最低8 GB相容性未驗證」，不阻止該裝置的本機開發。瀏覽器錄下完整Network、runtime清單，零第三方請求；產品只宣稱已測環境。
2. 10 秒與 180 秒合成 MP4 各三次 warm run；180 秒轉換每次 ≤180 秒。另一次 cold load 不計入轉檔速度，分開報下載（≤120秒）／下載後初始化（≤60秒）耗時與總資產 bytes；ffmpeg.load 永久等待須被外層計時器終止。數據只代表實測設備，不能推廣成所有8 GB電腦都達標。
3. 任務管理器／瀏覽器 Task Manager 每秒取樣，記「該標籤 renderer＋相關 worker process 總記憶體」的 idle／peak／取消後30秒。峰值相對初始增加 ≤1 GiB，三輪工作結束後的基線不可每次增加超過 100 MiB；JS heap 不能冒充整個 WASM 記憶體。量測工具／粒度與共享 process 干擾要記錄；不可測即該項 not-run。
4. 440 Hz、1 kHz、短脈衝＋聲道標記的合成音：輸出時長差 ≤0.10 秒、頻率誤差 ≤1 Hz、去除 MP3 起始 delay 後中段訊號 SNR ≥20 dB；無全零、削頂或左右聲道被交換。由測試頁解碼輸出計算數值，人工試聽查斷裂爆音。不對 lossy bytes 做相等快照。
5. 下載中／probe／轉換中取消各 3 次，UI ≤1 秒回應、worker termination 已觀察、舊結果不復活；下一個10秒檔可成功。頁面主執行緒任務期間每 100ms 心跳，最大延誤 <1 秒。
6. 所有離線測試只使用已取得的同源 runtime 與假媒體；冷啟缺資產要明確錯誤，不走遠端 fallback。若 codec、lavfi 測試輸入或 ffprobe API 缺失，停止本案並記缺項，不能拿官方 demo 成功代替。

## 預計檔案

```text
package.json / package-lock.json
scripts/serve.mjs / check.mjs / build.mjs
scripts/stage-vendor.mjs
scripts/serve-spike.mjs         # 127.0.0.1:4174，只供明確 spike 與 vendor 白名單
public/index.html
public/styles/tokens.css / app.css
public/js/app.mjs
public/js/core/input.mjs / probe.mjs / command.mjs / manifest.mjs
public/js/ffmpeg-adapter.mjs
public/js/job-controller.mjs
public/runtime-manifest.json
public/vendor/ffmpeg/**         # 僅固定manifest列明檔案，不手改上游程式
test/input.test.mjs / probe.test.mjs / command.test.mjs / job-controller.test.mjs
test/spike/index.html / spike.mjs / fixtures.mjs / audio-metrics.mjs
docs/DEPENDENCIES.md / SPIKE-RESULTS.md / TEST-RESULTS.md
```

serve-spike 路由只允許 `/spike/*`→test/spike、`/vendor/ffmpeg/*`→public/vendor/ffmpeg、`/runtime-manifest.json` 與必要 `/js/*`→public/js。每項正規化後確認在指定根，拒絕 traversal、目錄列出與其他檔；它不進 build。dev 永遠只供 public。

## 模組與函式

- `inspectMp4Header(bytes)`：最多讀首 64 KiB，只接受第一個 box 為完整 ftyp，長度至少16、至多64KiB且不超過檔案；minor_version後compatible brand每4bytes一組，接受major/compatible brand isom、iso2、mp41、mp42、avc1。驗完ftyp即停止，不讀後續moov/mdat，不把其長度和64KiB切片比較。第一版保守拒絕前置其他box的檔案；真正codec由ffprobe驗證，不以副檔名取代。
- `validateFileMeta({size,fileCount})`：1 檔、1–52,428,800 bytes；先 gate 再 arrayBuffer。原始檔名不進此函式。
- `validateProbe(json)`：輸入最多 64 KiB JSON，只提取有文件的 format/streams 欄，檢查型別、stream count≤8 再篩為剛好2、codec/channel/rate/duration 值域；JSON 可包含 ffprobe 本身額外已知欄但不回傳 UI。`parsePositiveDecimal` 不允許 NaN／Infinity／尾隨字元。若音訊與容器時長差 >1 秒則 MEDIA_UNSUPPORTED，避免虛報完成。
- `buildMp3Args()`：固定陣列，無使用者參數。等價於 `-i input.mp4 -map 0:a:0 -vn -c:a libmp3lame -b:a 128k -ar 44100 -ac 2 -map_metadata -1 -map_chapters -1 output.mp3`。不呼叫 shell。
- `validateManifest(value)`：exact schema、資產路徑白名單、正數 bytes 與 80MiB 總預算、唯一 path；不接受 runtimeId 作 URL。
- `FFmpegAdapter.load(manifest,{signal})`：下載固定資產、檢查 bytes/hash；已驗wasm bytes建立application/wasm Blob URL作wasmURL，coreURL使用build驗hash的同源固定JS，避免驗完bytes又重新下載未驗版本。內部Blob不是外部下載來源。初始化外層60秒timer超時terminate；在dispose時撤銷wasm Blob URL，不能初始化完成前撤銷。不將上游log接console；progress只取已驗證數值。
- `FFmpegAdapter.probe()/convert()/readOutput()/dispose()`：writeFile 固定名稱、ffprobe JSON 至 probe.json、exec 固定 args/timeout、readFile Uint8Array。每次結束 finally deleteFile；取消 terminate 後不再呼叫失效實例，dispose idempotent。
- `JobController.start(file)/cancel()/clear()`：jobId 與 generation；所有 await 後比對 id，過期輸出釋放；相同按鈕雙擊只能一工作。可注入 fake adapter 以測 race。

probe 範例參數使用 `-v error -show_entries stream=index,codec_type,codec_name,codec_tag_string,channels,sample_rate,duration:format=duration -of json input.mp4 -o probe.json`；API 的參數／輸出檔能力須在固定版本驗證。exit 不等於 0 即拒絕，永不解析 stderr 當作成功輸出。輸出再 probe MP3 codec／sample_rate／channels／duration，確認上限與時長差後建立 audio/mpeg Blob。audio 元件 loadedmetadata 只是額外可播放檢查，不代替前述驗證。

狀態：idle → selected → loading-runtime → probing → converting → validating-output → success；各工作中可取消／error。取消保留來源 File，終止 worker，重試從 runtime 初始化開始；clear 任意狀態 → idle 並丟來源。成功保留輸出 Blob/URL 供試聽與下載；清除先 pause、移除 src、load，再 revoke URL。

預設 CSP 至少限制 default-src/script-src/style-src 為同源、connect-src只允許self與上述內部blob、object-src 'none'、base-uri 'none'、media-src blob:，WASM 必要時僅加 `'wasm-unsafe-eval'`，不允許一般 unsafe-eval。由固定版本測試確定 worker-src self 能否使用；任何需要外部資源的組合都不過閘門。WASM 解碼不是惡意媒體安全沙箱的保證；限制大小、時間、隔離工作與持續依賴更新仍必要。

## 官方參考（2026-09-23 查閱，實作時核對固定版本）

- [FFmpeg 類別 API](https://ffmpegwasm.netlify.app/docs/api/ffmpeg/classes/ffmpeg/)：load、writeFile、ffprobe、exec、readFile、terminate；終止後必須重新 load。
- [ffmpeg.wasm 使用方式](https://ffmpegwasm.netlify.app/docs/getting-started/usage/)：官方範例可作 API 參考，但其中 CDN、真實檔案、console log、innerHTML 不可照搬。
- [ffmpeg.wasm FAQ](https://ffmpegwasm.netlify.app/docs/faq/)：wrapper/core 授權與效能限制須分開考量。
- [MDN Worker.terminate](https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate)：終止 worker 的語義；本案另測 UI 回應和資源生命週期。
- [FFmpeg sine source](https://ffmpeg.org/ffmpeg-filters.html#sine)：預設來源振幅1/8；本案不假定0.2。SNR比較實際輸入AAC與輸出MP3解碼後的相同聲道PCM，細節依ACCEPTANCE，避免混音係數造成錯誤參考。


---

## 原文件 UX-SEO.md

# MP4 轉 MP3 介面與 SEO

這是規格，尚未實作。Product App 模式，不播放背景影片或偽造上傳進度。

```text
桌面
GlossQuote-Labs / MP4 影片轉 MP3                         清除
MP4（H.264 + AAC），最多 50 MiB、3 分鐘，單檔
┌──────────────────────────────────────────────────────┐
│ 選擇 MP4 影片                                         │
│ 已選檔名（純文字）／實際大小                            │
│ 首次需下載轉檔元件：{manifest實際容量}                   │
│ 影片在本機處理，輸出 MP3 128 kbps                       │
│ [下載元件並開始轉換]                                   │
│ 正在檢查音軌／轉換中 00:12                  取消        │
│ 完成後：音訊播放器／時長／容量              下載 MP3     │
└──────────────────────────────────────────────────────┘
格式限制・如何操作・資料處理・FAQ

手機
工具名／清除
限制＋選檔
檔案與下載元件資訊
開始轉換
階段與取消
播放器
結果資訊／下載 MP3
說明
```

初始「選擇一段短 MP4，將聲音儲存為 MP3。」；載入「正在下載轉檔元件，影片內容不會因此上傳。」；probe「正在檢查影片中的音訊。」；轉換「正在轉成 MP3，可隨時取消。」；成功「MP3 已準備好，可試聽後下載。」；取消「已取消轉換，選取的影片可重新處理。」；清除「已清除本頁的影片與結果。」；無音軌或其他編碼「這個 MP4 不符合目前支援的音軌格式，請選擇 H.264＋AAC 的短片。」；逾時「這段影片未能在時間限制內完成，請改用較短的影片。」；資產失敗「轉檔元件未能載入，請重新載入元件後再試。」不把網路失敗說成影片上傳失敗。

沒有 runtime/未驗證瀏覽器時，顯示「目前無法確認此瀏覽器能完成轉換」與已實測矩陣連結或內文，不以裝置品牌猜可用。手機畫面必須可讀與可操作，但未經效能量測不能宣稱手機轉檔支援。檔名長度可換行，超長視覺截短保留可讀完整 tooltip 不作唯一辨識。

選檔有 label；拖曳是附加操作，鍵盤選檔一直可用。處理開始同步改 busy；取消保持可達。進度以 aria-live polite 只播階段變化，秒數不逐秒打斷。audio 原生 controls 提供鍵盤試聽；無自動播放。320px、200% 頁面縮放、reduced motion 全部保留流程。隱私說明在開始按鈕旁；技術細節與授權清單放可讀說明，不強迫一般使用者理解 worker。

title：`MP4 影片轉 MP3 音訊｜GlossQuote-Labs`

description：`將符合限制的短 MP4 在瀏覽器內轉成 MP3，完成後試聽與下載。影片由裝置處理；首次使用需下載轉檔元件。`

H1：`MP4 影片轉 MP3`

slug 建議 `/tools/video-to-audio/`。本機 `noindex,nofollow`；靜態說明與 FAQ 可先建，但技術閘門未過時不可寫「已支援」。未來發布需獨立授權與正式網址才產 canonical/sitemap；不做假五星、用戶數或「全格式／無損／完全離線」文案。

FAQ：

1. **這是無損提取嗎？** 不是。第一版將 AAC 聲音重新編碼成 MP3，音質可能略有變化。
2. **為什麼第一次要下載元件？** 轉檔程式需要在瀏覽器執行；下載的是程式資源，不是把影片送往轉檔服務。
3. **所有 MP4 都能轉嗎？** 不能。第一版限定 H.264＋AAC、一條音軌與大小／時長限制；MP4 容器裡可能放不同編碼。
4. **關掉頁面還會處理嗎？** 本工具不提供背景續跑；關頁會失去目前工作，完成後請自行下載。
5. **轉換失敗會上傳雲端嗎？** 不會。工具會停止並說明限制，没有雲端備援。


---

## 原文件 ACCEPTANCE.md

# MP4 轉 MP3 驗收

這是規格，尚未實作。A=離線 Node 邏輯測試；S=瀏覽器 spike；B=完整產品瀏覽器驗收。S 成功不自動代表 B 成功。

T02 合成 fixture：在同源 spike 頁使用已核實 runtime 的 lavfi 產生藍底 320×240、10秒／180秒 MP4；視訊 libx264、yuv420p，音訊 AAC 440Hz 正弦、sine預設來源振幅0.125、44.1kHz，另加1kHz、短脈衝及左右聲道不同頻率版本。固定參數陣列等價 `-f lavfi -i color=c=blue:s=320x240:r=10 -f lavfi -i sine=frequency=440:sample_rate=44100 -t 10 -c:v libx264 -pix_fmt yuv420p -c:a aac -ac 2 input.mp4`；先確定 build 支援 lavfi/codec，否則記 gate 失敗，不下載陌生 fixture。大檔界線以 MP4 尾端合法 free box 填充到指定 bytes；不把亂碼假裝為成功影片。無音訊版省略 audio input，超時長版做181秒。媒體全是幾何／合成音，沒有真實影片。

SNR參考取同一假input.mp4中的AAC，由固定引擎以`-i input.mp4 -map 0:a:0 -vn -ar 44100 -ac 2 -f f32le reference.f32`解碼；output.mp3也以相同採樣率／聲道解碼成actual.f32。0.125是sine產生器原始幅度，不能忽略mono→stereo混音係數而當作最終每聲道PCM。用短脈衝標記在±4096 sample偏移內找最大相關值對齊，取去頭尾各0.5秒的共同區間，SNR=10*log10(sum(reference²)/sum((actual-reference)²))；不得任意調gain以讓分數通過。每聲道都須≥20dB，分母0記正無限；參考全零屬無效音質fixture。這些PCM僅spike用，不能增加產品輸出格式。

| ID | 類型／需求 | 輸入／步驟 | 預期 |
|---|---|---|---|
| VA-01 | A FR-01 | 空檔、兩檔、50MiB+1 | EMPTY_FILE、MULTIPLE_FILES、FILE_TOO_LARGE；未讀全檔／未啟動 runtime |
| VA-02 | A FR-01 | 合法首ftyp接大於64KiB的mdat；PNG偽裝；ftyp截斷；前置free box | 第一例通過初篩進probe，不因mdat大於slice誤拒；其餘FORMAT_UNSUPPORTED |
| VA-03 | A FR-02 | 合成 probe h264+aac、1/2ch、180秒 | 接受；180.001秒 DURATION_TOO_LONG |
| VA-04 | A FR-02 | NaN／Infinity／無 duration／未知 codec／enca | MEDIA_UNSUPPORTED；不能轉換 |
| VA-05 | A FR-02 | 無音軌、兩音軌、8ch、96000Hz、多字幕stream | MEDIA_UNSUPPORTED |
| VA-06 | A FR-09 | buildMp3Args，檔名為 `x;rm -rf.mp4` | args 完全等於固定陣列，原字串不進參數或路徑 |
| VA-07 | A FR-04 | manifest含未知欄／重複path／../／外部URL／>80MiB | 全部拒絕，無 fetch |
| VA-08 | A+B FR-06、FR-11 | fake adapter 延迟 A，取消後 B 成功，再回 A | B 保持成功，A 進度與輸出均丟棄；dispose 不重拋例外 |
| VA-09 | S FR-03、FR-07 | 10秒 440Hz 假片 | MP3 128kbps／44100Hz／2ch，時長差≤0.10秒，頻率差≤1Hz，SNR≥20dB |
| VA-10 | S FR-06、FR-11 | 180秒 fixture 每瀏覽器3輪 | 每輪≤180秒；記憶體與UI心跳全部符合 TECHNICAL gate |
| VA-11 | S+B FR-06 | 下載／probe／轉換各取消3次 | ≤1秒顯示取消、worker 終止、無可下載半成品；新工作成功 |
| VA-12 | B FR-07 | 人工注入 exit非0、空output、>4MiB、錯codec | CONVERT_FAILED／OUTPUT_INVALID，無播放器或下載 |
| VA-13 | B FR-04、FR-10 | 冷啟檢查 Network，載入後切離線再轉 | 冷啟僅同源manifest資產，無外部請求／內容上傳；已載runtime可處理，缺runtime時明確失敗 |
| VA-14 | B FR-08 | 完成後清除，反覆10次 | audio停止、src清空、URL撤銷、input清空、worker無殘留引用；無儲存寫入 |
| VA-15 | B FR-09 | 名稱 `<img src=x onerror=alert(1)>.mp4` | 純文字，無HTML／請求／執行；下載名 audio.mp3 |
| VA-16 | B FR-12 | 中斷下載或篡改wasm一byte | RUNTIME_LOAD_FAILED／RUNTIME_INTEGRITY_FAILED；未執行不合格wasm，不自動重試無限次 |
| VA-17 | B FR-10 | 將 Worker／WASM 能力判斷mock為不可用 | 不支援狀態，可讀說明，沒有上傳替代 |
| VA-18 | B 全介面 | 鍵盤選檔→轉換→取消→重試→試聽→下載 | 流程完整、焦點可見；不自動播放 |
| VA-19 | B 全介面 | 320px、200%、長檔名、reduced motion | 所有按钮與錯誤可達，無頁面水平捲動 |
| VA-20 | S+B FR-06 | probe15秒／convert180秒／下載120秒／下載後初始化60秒無回覆 | 全部JOB_TIMEOUT、終止工作、保留可重試來源、不供部分結果；階段文案分開 |
| VA-21 | B FR-05 | 下載有manifest總數、無可靠轉檔progress事件、最後成功 | 下載顯示真實received/total；轉檔只顯示階段與經過時間，無虛構百分比；成功驗證後才切完成 |

`docs/SPIKE-RESULTS.md` 需逐欄記固定套件版本／資產hash／假片hash／裝置CPU RAM OS／瀏覽器版本／cold與warm時間／記憶體取樣方式與數值／音質數值／取消延遲／Network證據／結論。使用可取得的至少8 GB RAM實機；若實測裝置RAM較大，仍可驗證本機MVP，但不得宣稱最低8 GB相容性已通過。沒測寫not-run，數值無資料不可填0。`docs/TEST-RESULTS.md` 再記所有產品案例。測試與記錄不得包含私人內容或真實影片檔名。


---

## 原文件 TASKS.md

# MP4 轉 MP3 實作任務

流程以 AGENTS.md 的「閱讀與執行」「交付與收斂」為準：沿用本 session 已讀文件，只補讀變動／相關段落；同一授權工作依序推進，不因任務切換重問。各任務 allowed paths、前置條件與必要驗收保持有效，缺陷回到其擁有任務修正；來源發布依適用的既有明確授權，不包含網站部署。

本文件定義任務；實際進度以 HANDOFF.md 與最新驗收紀錄為準。依序一次一項，失敗停在本工具。每項開工讀 [HANDOFF](HANDOFF.md)，完成寫入檔案／命令／真實結果／未測／下一項。所有 allowed paths 均僅在本專案；生成物只由指定腳本建立。

## T00 — 空骨架與安全預覽

- 前置：依 AGENTS.md 完成本任務所需文件閱讀，Node 24+ 可用。
- allowed paths：`package.json`、`scripts/serve.mjs`、`scripts/check.mjs`、`scripts/build.mjs`、`public/index.html`、`public/styles/tokens.css`、`public/styles/app.css`、`public/js/app.mjs`、`test/scaffold.test.mjs`、`HANDOFF.md`。
- 建 private ESM、dev=`node scripts/serve.mjs`（127.0.0.1:4173、僅public）、test=`node --test`、check=`node scripts/check.mjs`、build=`node scripts/build.mjs`（public→dist）。check 真實驗語法/外部URL/危險DOM/檔案，不做假成功；尚未有 runtime 時畫面明示未可轉換。noindex。
- 驗收：本項建好後跑 `npm test`、`npm run check`、`npm run build`、`npm run dev`，確認綁定／範圍後停止 dev。
- 完成：骨架通過、尚未安裝 runtime，回寫 HANDOFF。

## T01 — 固定依賴、授權與資產清單

- 前置：T00 完成。
- allowed paths：`package.json`、`package-lock.json`、`public/runtime-manifest.json`、`docs/DEPENDENCIES.md`、`HANDOFF.md`。
- 查官方發行和固定版本文件，選精確 @ffmpeg/ffmpeg＋@ffmpeg/core 組合；確認 ffprobe、libmp3lame、AAC、H.264、lavfi 能力與 ESM 同源載入方式。記授權／build配置／資產預算與清單來源。正式manifest hash/bytes 若尚未取得，標記尚未完成，不寫假hash。
- 驗收：先在 package.json 填精確版本，再執行 `npm install --package-lock-only --ignore-scripts`；檢查 lockfile 完整性與 transitive 來源。`npm run check`。此項允許查公開套件資料，不下載私人內容，不加其他runtime候選。
- 完成：依賴評估可進 spike、無未決授權／付費／範圍問題；版本／資產來源記錄明確，回寫 HANDOFF。無法符合條件則停並記具體原因，不能籠統要求使用者代替技術研究。

## T02 — 有界技術 spike，先證明可以做

- 前置：T01 有可行固定候選，尚未宣称正式支援。
- allowed paths：`scripts/stage-vendor.mjs`、`scripts/serve-spike.mjs`、`scripts/check.mjs`、`scripts/build.mjs`、`public/vendor/ffmpeg/**`、`public/runtime-manifest.json`、`public/js/ffmpeg-adapter.mjs`、`public/js/core/manifest.mjs`、`test/manifest.test.mjs`、`test/spike/index.html`、`test/spike/spike.mjs`、`test/spike/fixtures.mjs`、`test/spike/audio-metrics.mjs`、`docs/DEPENDENCIES.md`、`docs/SPIKE-RESULTS.md`、`HANDOFF.md`。`node_modules/**` 僅 npm 生成。
- 執行 `npm ci --ignore-scripts` 取得固定依賴；建立 stage-vendor 後執行 `node scripts/stage-vendor.mjs`，填真 bytes/hash，保留上游授權。建立 serve-spike 與量測頁，路由依 TECHNICAL 白名單，初次尚未存在前不得執行。讀來源但不手改vendor。
- 驗收：`npm test`、`npm run check`、`node scripts/serve-spike.mjs`，在本機4174依 TECHNICAL 六 gate／VA-09–11/20 實測，測後停止伺服器。記失敗與未測；合成假片與量測不發布。
- 完成：所有必要gate在可取得的至少8 GB RAM測試機有證據通過才可T03；任一fail/not-run停在T02。若RAM高於8 GB，記實際設備通過與最低8 GB相容性未驗證即可，不要求額外找8 GB機器；記憶體與速度不可推測填pass。回寫HANDOFF。

## T03 — 嚴格輸入、命令與取消控制器

- 前置：T02 完成。
- allowed paths：`public/js/core/input.mjs`、`public/js/core/probe.mjs`、`public/js/core/command.mjs`、`public/js/job-controller.mjs`、`public/js/ffmpeg-adapter.mjs`、`test/input.test.mjs`、`test/probe.test.mjs`、`test/command.test.mjs`、`test/job-controller.test.mjs`、`HANDOFF.md`。
- 實作所有模組契約，精確probe值域、固定參數、fake adapter晚回覆、timeouts和idempotent dispose。錯誤不帶原始log。
- 驗收：`npm test`、`npm run check`；VA-01–08自動部分與timeout/race案例離線通過。
- 完成：輸入尚未驗證前不轉檔；回寫 HANDOFF。

## T04 — 產品流程與介面

- 前置：T03 完成。
- allowed paths：`public/index.html`、`public/styles/app.css`、`public/js/app.mjs`、`public/js/job-controller.mjs`、`test/job-controller.test.mjs`、`docs/TEST-RESULTS.md`、`HANDOFF.md`。
- 接選檔、元件下载告知、階段、取消、播放器、真實結果與下載；依 UX 做錯誤與不支援。不得新增格式／品質選單。
- 驗收：`npm test`、`npm run check`、`npm run dev`，產品測 VA-08/11–20，停止 dev。
- 完成：所有核心狀態與鍵盤流程可操作；回寫 HANDOFF。

## T05 — 靜態說明與完整驗收

- 前置：T04 完成。
- allowed paths：`public/index.html`、`public/styles/app.css`、`public/js/app.mjs`、`docs/TEST-RESULTS.md`、`docs/SPIKE-RESULTS.md`、`HANDOFF.md`。
- 加真實支援矩陣／SEO/FAQ；noindex保留，無正式域名或部署。檢查download bytes沒有過時、runtimemanifest與build一致。模組bug回對應task。
- 驗收：`npm test`、`npm run check`、`npm run build`、`npm run dev`，ACCEPTANCE全部實測，記錄後停止dev；確認只產靜態資源與授權檔，不含測試媒體。
- 完成：所有必要案例pass，HANDOFF標「本機驗收完成；未發布」，或如實保留未完成，絕不因依賴官方示範可跑而宣告完成。

## 本次 TASK-ENTRY 明確授權的補充任務（2026-10-10）

這些任務不解除 T01/T02 硬前置；T02 FAIL/NOT_RUN 不得開始產品或 SEO milestone。埠統一用 preview 4191／spike 5191；被占用時綁系統分配的 loopback 埠並記錄。node_modules、dist、test/.tmp 與 task 專用證據依工程／入口共同例外生成。

- T02 所需 `.gitignore`：忽略 node_modules、dist、test/.tmp，僅本工具；依入口必要鎖定檔／.gitignore 範圍執行。
- T06 — 完整繁中＋英文與 SEO 工具鏈：前置 T05 PASS。allowed paths：public/**（語系／en/index.html／404／robots／sitemap／headers）、scripts/**、test/**、docs/**、README.md、package.json、TASKS.md、HANDOFF.md、project.json、必要 wrangler.jsonc。支援預覽 noindex 與正式候選建置；canonical、雙向 hreflang、x-default、同語言家族首頁、sitemap、MIME／security headers 必須驗收。不得宣稱候選網址已部署。
- T07 — 獨立來源與交接：前置所有必要本機 gates PASS（允許使用者授權的人工例外，不能略過媒體可行性）。allowed paths：本工具 docs/RELEASE-CANDIDATE.md、docs/**、README.md、HANDOFF.md，專用 `.runs/github-publish/glossquote-labs-video-to-audio`。審查該工具來源／依賴授權後公開到 KYStr，驗證 PUBLIC、remote HEAD；不得操作根 Git index。正式部署與00-home由原主對話負責。
- 若 T01/T02 實際阻塞，仍於 docs/RELEASE-CANDIDATE.md 記 BLOCKED、證據、未驗與下一步；不發布未完成網站，不進 T03–T07。

## MEDIA-11-UNBLOCK — ffprobe 綁定修正與隔離探測（2026-10-11）

- 前置：保留 T02 的原始 Chrome/Edge probeExit=-1 失敗證據。主代理核准在既有固定候選上修正第一方綁定，不增加依賴、不改上游 vendor 或 WASM。
- 交付：第一方 core 入口從實際 native `_ffprobe` 呼叫保留整數退出碼；每次探測使用全新 Worker，避免 C option/section/log 全域狀態與 argv 分配留到下一次。非零、無效回傳、trap、超時均拒絕；finally 與取消均終止探測 Worker。
- allowed paths：`public/js/core/{ffprobe-return,ffprobe-core,isolated-probe}.mjs`、`public/js/ffmpeg-adapter.mjs`、`test/ffprobe.test.mjs`、`test/spike/index.html`、`test/spike/{spike,unblock}.mjs`、`scripts/serve-spike.mjs`、`TASKS.md`、`HANDOFF.md`、`docs/{DEPENDENCIES,SPIKE-RESULTS,RELEASE-CANDIDATE}.md`；專用 append-only 證據 `.runs/video-to-audio/20261011-unblock/**`。dist 僅既有 build 生成。
- 驗收：離線 native-return/trap/noninteger 與 Worker lifecycle 測試，`npm.cmd test`、`npm.cmd run check`、`npm.cmd run build`；真正 Chrome/Edge 中保留原始 -1，再測 good/bad/good、缺檔、有效探測至少三次、損壞／空檔／截斷檔拒絕，以及一個 MP3 輸出探測。只用既有合成 H.264/AAC 假片。重型工作先取得量測鎖，長操作前後核對持久環境。
- 收斂：這是解除 ffprobe 阻塞的有界 milestone，不能代替完整 T02 六 gate；原 T02 量測、產品與 release 仍 BLOCKED / NOT_RUN，禁止前移 T03。
- 實際狀態：2026-10-11 PASS；Chrome/Edge各原始-1、修正有效0×5、invalid1×4、MP3輸出0；最終Node14/14與check/build exit0。完整T02仍BLOCKED，見HANDOFF與SPIKE-RESULTS。
- 主代理收尾範圍：`public/index.html` 的既有預覽提示須同步真實進度，移除「音軌檢查元件未通過」的過期原因；保持 noindex、停用選檔／轉換與完整技術驗證未完成狀態，不擴充產品介面。

## RESUME-11-T02-20261011 — 補齊實機可行性證據

- 前置：沿用 MEDIA-11-UNBLOCK 已通過的探測修正，不重新調查 binding 根因；完整 T02 尚未通過。
- allowed paths：本工具 `test/spike/**`、必要的 `scripts/serve-spike.mjs`、`test/manifest.test.mjs`、`docs/{SPIKE-RESULTS,RELEASE-CANDIDATE}.md`、`TASKS.md`、`HANDOFF.md`；若真實測試揭露 adapter 的範圍內缺陷，修 `public/js/ffmpeg-adapter.mjs` 與相應 test。新證據只寫 `.runs/video-to-audio/20261011-resume-t02-0918/**`；共享量測鎖依 TASK-ENTRY 例外使用。
- 交付：Chrome 與 Edge 的實際 warm/cold、音質、取消、離線／缺檔／完整性與 production timeout 證據；每秒程序記憶體必須可歸屬到測試分頁，不使用 JS heap 代替。所有六 gate PASS 才可進 T03；不可取得的必要證據保持 NOT_RUN / BLOCKED。
- 測試 instrumentation 只在 spike 生效，不改官方 vendor bytes，不加入產品能力或 T03 控制器，不執行來源／網站發布。
- 目前實際狀態（2026-10-11）：G2速度、G3程序記憶體、G4音質／人工聽、G5真取消PASS；正式120/60/15/180秒timer、缺失／篡改與server停止後轉換PASS。G1完整Network與G6真正DevTools Offline仍待新錄製，T02 PARTIAL / BLOCKED，T03未開始。原250筆ResourceTiming容量已增為10000，但不能把未重新取得的完整trace填PASS。詳見SPIKE-RESULTS末節與本輪HANDOFF。


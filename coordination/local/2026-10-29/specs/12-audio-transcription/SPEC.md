# 短音檔本機逐字稿 — 既有規格保存

Task ID: `labs-12-audio-transcription` · Spec ID: `spec-12-audio-transcription`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 短音檔轉文字產品規格

這是規格，尚未實作。格式與時間上限刻意保守；不能先放寬再補測試。

| 編號 | 行為與限制 |
|---|---|
| FR-01 | 一次一個本機 WAV，1–10,485,760 bytes。先驗 RIFF/WAVE、chunk邊界與PCM資料大小，再分配音訊陣列；不使用無邊界 decodeAudioData 猜格式。只收 formatTag=1 的 signed PCM16 little-endian，1或2聲道，採樣率16,000／44,100／48,000 Hz。不收float WAV、RF64、壓縮WAV、MP3、影片或URL。 |
| FR-02 | data長度須可整除 blockAlign，byteRate與blockAlign須符合聲道／位深／採樣率，資料不能越過檔尾；從frameCount/sampleRate計算時長，必須 >0 且 ≤30秒。最多1,440,000 frames、2聲道。未知合法 ancillary chunk可跳過，最多128個；重複fmt/data或缺fmt/data拒絕。 |
| FR-03 | 語言只有「中文（普通話）」和「英文」，預設中文。傳給模型task=transcribe，不翻譯、不自動語言判斷。不保證輸出繁簡體或標點樣式。 |
| FR-04 | 初次開始前顯示固定模型名稱、用途、模型／元件實際總bytes、只下載模型、不上傳音檔、可能等待及準確度限制。使用者按「下載模型並辨識」後才載大資產；manifest≤64KiB可先載。總模型＋runtime資產產品預算≤300MiB，單資產≤160MiB，超過即技術閘門失敗。 |
| FR-05 | 本版採單執行緒 WASM 基線與一個固定量化配置；不加入WebGPU分支或自動切換模型。特定瀏覽器只有通過實測才標支援。沒有可用本機runtime則不支援，不把音訊送遠端。 |
| FR-06 | stereo先逐frame左右平均成mono，再以瀏覽器離線音訊處理重採樣為16kHz。若輸入本來16kHz则直接使用。辨識前mono RMS≤0.0001的全段回「沒有可辨識的聲音」，不呼叫模型。此門檻不是完整語音偵測。 |
| FR-07 | 分開顯示下載、初始化、準備音訊、辨識、完成。下載總timeout180秒；下載完成後初始化timeout120秒；每次推論timeout180秒。UI顯示實際bytes與經過時間，不把模型內部步數假裝為音訊完成百分比。 |
| FR-08 | 取消立即失效jobId，AbortController停下載並terminate辨識Worker，丟棄部分文字；取消保留來源File及語言選擇可重試，但模型實例會卸載。離線重採樣無可靠即刻取消時，晚回覆只能丟棄。UI≤1秒回已取消，不承諾原生工作立刻釋放OS記憶體。 |
| FR-09 | 成功只顯示模型回傳的純文字，最多20,000 Unicode code points，提供複製與UTF-8無BOM的transcript.txt。第一版不编輯／自動改寫／自動送出文字；醒目提示「辨識結果可能有誤，請核對後使用」。空白結果是empty，不是成功文章。 |
| FR-10 | 音檔、PCM、逐字稿只存在當頁記憶體，不寫storage、Cache API、IndexedDB、URL、日誌或telemetry。模型也不設程式持久快取，僅當頁重用；重新載入可能要重下載。一般瀏覽器／OS內部快取无法保證清除，不宣稱安全抹除。 |
| FR-11 | 「清除全部」終止Worker並卸載模型，清空來源／PCM／結果／input／Blob URL，回初始狀態。換檔先清空旧來源與結果，保留已成功初始化的同一模型可重用；工作中換檔禁用，需先取消。選語言在推論中禁用，完成後變更語言使舊結果失效。 |
| FR-12 | 檔名和模型文字都當不可信純文字，不放innerHTML、Markdown renderer、程式碼執行器；模型不能提供任何工具調用、指令或網路授權。不要將音檔或逐字稿寫到錯誤／support日誌。 |
| FR-13 | 固定錯誤：EMPTY_FILE、MULTIPLE_FILES、FILE_TOO_LARGE、WAV_INVALID、WAV_UNSUPPORTED、DURATION_TOO_LONG、MODEL_LOAD_FAILED、ASSET_INTEGRITY_FAILED、MODEL_INIT_TIMEOUT、TRANSCRIBE_TIMEOUT、TRANSCRIBE_FAILED、OUTPUT_TOO_LARGE、BROWSER_UNSUPPORTED、COPY_DENIED。資產下載逾時歸MODEL_LOAD_FAILED並顯示「下載逾時」；使用者可重試，不自動無限重試。 |

資料流程：檔案大小與RIFF結構 gate → 有界PCM → mono/16k → Worker推論 → 純文字 → 手動複製／下載。模型資產為公開靜態程式資料，跟使用者音訊分開；不能用「模型本地」隱藏預設下載Hub/CDN的設定。

未來候選：其他音訊格式、長音檔切段、SRT、說話者標籤、裝置加速、可選模型快取。任何一項都需新規格，不能為了完成度順便塞進本版。


---

## 原文件 TECHNICAL.md

# 短音檔轉文字技術規格

這是完整產品規格；2026-10-11只完成固定資產stage及最小雙瀏覽器Worker相容性，完整T02及產品尚未通過。原生HTML/CSS/瀏覽器ESM；Node.js 24+用於開發與node:test；沒有音訊伺服器或推論後端。

## 固定供應鏈與下載契約

固定 `@huggingface/transformers@3.8.1`，模型 `Xenova/whisper-base@64da57285918e20ea79ea5c88eed7197933abaa8` 多語版本（不是 .en），encoder_model及decoder_model_merged皆q8。2026-10-11主代理核准同base替代；轉換模型自己的固定card明示Apache-2.0，原候選onnx-community的證據不足歷史保留於DEPENDENCIES。單執行緒WASM只已完成最小相容性，仍須完整T02；不是保證每個encoder/decoder都能用單一dtype字串。T01查官方release、套件lock、模型不可變commit revision、上游權重/轉換權重/tokenizer/ORT授權與分發條件。不能只把套件授權抄給模型。無法確認則停在研究gate。

`public/model-manifest.json` exact schema：`{schemaVersion:1,modelId,revision,runtimeVersion,dtype,files:[{path,bytes,sha256,mime}]}`。modelId/revision僅顯示和追蹤，不接受使用者修改或拼成URL。files列齊ONNX encoder/decoder及external-data、tokenizer/config/generation/preprocessor檔、ORT WASM/JS與必要worker資產；使用固定同源 `/models/whisper-base/{revision}/`、`/vendor/transformers/`、`/vendor/onnx/` 前綴。禁止..、query、fragment、絕對外部URL、重複path、未知欄。總≤300MiB，單项≤160MiB，manifest≤64KiB、files≤64。SHA-256必須是實際64hex，byte數不得估算；T02取得資產後才完成可執行manifest。

程式／模型全部由已固定來源在開發階段取得，保留授權與雜湊。MEDIA-12-UNBLOCK已stage19項實際資產；瀏覽器入口先固定modelId/revision及完整已知檔案closure，缺少runtime／model檔在任何fetch前拒絕。stage腳本與build逐一驗bytes/hash；部署前不得省略或臨時改成latest/main。

## 所有下載只在同源且先驗證

在辨識Worker啟動時設定：`env.allowRemoteModels=false`、`env.allowLocalModels=true`、`env.localModelPath='/models/'`、`env.useBrowserCache=false`、`env.useFSCache=false`，pipeline的本地識別固定為`whisper-base/{已核實revision}`，兩者組成manifest宣告目錄，不直接用上游Hub的modelId拼路徑。ORT `wasmPaths`指固定同源vendor、`numThreads=1`。固定版本如另有WASM cache開關亦關閉。這些env是套件的JS設定物件，不是Windows環境變數。

採可測的 `AssetLoader`：保存Worker內原生fetch參照；對manifest每個資產作固定同源GET、credentials=omit、redirect=error、cache=no-store，串流累計超過manifest bytes立即取消，讀完比對bytes與SHA-256，再放當頁已驗證的記憶體Map。下載整體受180秒timeout與使用者AbortSignal約束。先載完與驗完模型／WASM，才建立pipeline，避免部分內容開始推論。

Worker的模型／ORT資料fetch入口只能由已驗證Map回傳Response；不在allowlist就拒絕。固定版本有env.fetch時可配置，但不可假設main文檔API已存在於stable；T02可使用Worker內受限global fetch adapter並驗證ORT確實經過它。模型customCache若使用，只能是符合match/put介面的記憶體adapter，不可落Cache API。動態ESM import無法靠fetch hook驗hash，因此vendor JS／worker在build時校驗固定hash、同源固定URL载入，並用CSP限制；不要聲稱逐個dynamic import有原生SRI。若某內部loader繞過已驗證bytes發出新資產請求，T02失敗，不能以「大概同源」通過。

AssetLoader不是瀏覽器Service Worker，不需要其跨頁持久化。runtime初始化完成後仍保留需要的verified資产Map至卸載；納入記憶體峰值預算。清除全部／取消銷毀Worker與Map。模型缺檔、hash錯、offline冷啟缺資產均明確失敗，無Hub/CDN備援。CSP限制同源script/connect/worker，WASM只在必要時允許wasm-unsafe-eval，不允許一般unsafe-eval；不需要COOP/COEP去開多執行緒。

## 可證偽的 T02 gate

全部門檻是產品目標、目前未量測：

1. 使用可取得的Windows11、至少8 GB RAM實機，記實際CPU/RAM及當期Chrome與Edge完整版本，兩者都測。更高RAM的實測可通過本機MVP；未測8 GB時標「最低8 GB相容性未驗證」即可，不阻止該裝置上的後續開發，不能擴大成全部8 GB裝置保證。
2. 清空頁面狀態做一次cold load，分開記下載bytes/時間、完整性驗證時間、初始化時間；模型總資產≤300MiB、單檔≤160MiB、下載≤180秒、下載後初始化≤120秒。這些不是公開網速保證，產品timeout仍按FR-07顯示實際錯誤。
3. 每語言5段5–10秒合成語音、另各一段30秒組合，warm推論三輪；每個30秒檔≤180秒，UI100ms心跳最大延誤<1秒。
4. 中文普通話5段合計CER≤20%，英文5段合計WER≤20%；任一單段不得>40%。文字先NFKC、英文lowercase、刪Unicode標點、中文去空白／英文空白分詞；不刪模型新增的實質字詞，不用人工修改結果後打分。此為小型乾淨合成資料技術底線，不是對真實錄音的準確率保證。
5. 每秒量測相關renderer＋worker process總記憶體，從初始到peak增加≤1.5GiB；記模型載入前、載入後、推論peak、清除後30秒。不得用JS heap替代WASM總量。三輪後基線持續每輪增加>100MiB則fail；無可靠量測即not-run。
6. 網路只有manifest資產；斷網後已載模型可推論。刪除一個本機模型檔、篡改一byte、返回redirect都必須在推論前失敗；文字／音訊不得出現在request body、URL、console、storage。
7. 下載、初始化、推論各取消3次，UI≤1秒、worker終止、無晚到結果，重新載入後可成功。全零音訊不執行模型且無幻覺文字；一般非語音可能仍辨識出錯，不宣稱完整幻覺防護。

任何必要項fail/not-run保持T02未通過。不得改雲推論、忽略中文結果、偷偷改更大的模型或刪掉慢速測試。若候選無法符合，記具體數值與待決問題，再停止本工具。

## 預計檔案

```text
package.json / package-lock.json
scripts/serve.mjs / check.mjs / build.mjs
scripts/stage-model.mjs / serve-spike.mjs
scripts/make-speech-fixtures.ps1 / run-speech-fixtures.mjs
public/index.html
public/styles/tokens.css / app.css
public/js/app.mjs / job-controller.mjs / audio-preparer.mjs
public/js/core/wav.mjs / audio.mjs / transcript.mjs / manifest.mjs
public/js/asset-loader.mjs / transcribe.worker.mjs
public/model-manifest.json
public/models/whisper-base/**
public/vendor/transformers/** / vendor/onnx/**
test/wav.test.mjs / audio.test.mjs / transcript.test.mjs
test/manifest.test.mjs / job-controller.test.mjs
test/spike/index.html / spike.mjs / scoring.mjs
test/fixtures/generated/**
docs/DEPENDENCIES.md / SPIKE-RESULTS.md / TEST-RESULTS.md
```

dev只供public；serve-spike只綁127.0.0.1:4174，固定映射 `/spike/*`→test/spike、`/fixtures/*`→test/fixtures、`/js/*`→public/js、`/models/*`、`/vendor/*`、`/model-manifest.json`→public同名路徑；canonicalize後檢查各根、拒絕traversal／目錄list／其他路由。不把fixture或測試入口進build。

## 函式與演算法

- `parseWav(bytes)`：檔案先size gate。DataView little-endian讀RIFF，驗總長與宣告chunk範圍，逐chunk以size加偶數padding前進、最多128次；只接受一個fmt與data，fmt最少16bytes、formatTag1、bits16、1/2ch、指定sampleRate、blockAlign=channels*2、byteRate=sampleRate*blockAlign。dataFrames先計算且≤30*sampleRate，再建陣列。回傳{sampleRate,channels,frames,dataOffset,dataLength,duration}，不把檔名放結果。
- `pcm16ToMono(bytes,info)`：signed int16/32768，各frame兩channel平均；輸出Float32Array長frames，範圍[-1,1]。先驗info由parser產生，不信外部物件；資料工作總預算64MiB，包含輸入、mono、重採樣與轉移，模型不算在此小預算內。
- `resampleTo16k(mono,rate,jobId)`：16k原樣；其餘用OfflineAudioContext(1,ceil(frames*16000/rate),16000)，建單聲道AudioBuffer(sourceRate=rate)並startRendering；不以取每第三樣本代替抗混疊重採樣。結果長≤480,000 floats；native rendering取消只能丟棄晚結果。測試440Hz與高頻alias，不宣稱Node驗過此API。
- `rms(samples)`：sqrt(sum(x*x)/n)，n=0拒絕。≤0.0001回empty。不在這一步猜口音／語言。
- `validateTranscript(value)`：模型結果必須是{text:string}的已知形狀，讀取text而不渲染其他欄；CRLF/CR正規為LF、trim，不改寫詞句；拒絕除TAB/LF外C0控制字元與>20,000 code points。空字串→empty。`toTextBlob(text)`固定text/plain;charset=utf-8、UTF-8無BOM、最後補一個LF。
- `createTranscriber(assets,language)`：Worker內pipeline('automatic-speech-recognition',固定本地模型識別,{device:'wasm',dtype:固定核實設定})；語言中文映射chinese、英文english，task=transcribe、return_timestamps=false、do_sample=false。固定版本參數必須在spike證明；不要把未支援選項默默忽略。
- `JobController.start/cancel/clear/selectFile/setLanguage`：exact Worker message schema `{type,jobId,...}`，資料只准transfer最後mono Float32Array.buffer；狀態回覆只stage、受限數值或text，不帶原檔名；jobId晚到一律丟棄。fake Worker測timeout與cancel竞态。

狀態：idle → selected → downloading → initializing → preparing-audio → transcribing → success/empty；錯誤及取消有固定回復路径。已載模型可 selected→preparing-audio；取消把modelLoaded=false，clear再清來源。結果不跟著部分token滾動，MVP只在完成後顯示完整文字，避免把未完成猜測當可靠逐字稿。

## 官方參考（2026-09-23查閱，實作時核對固定版本）

- [Transformers.js 自訂本地模型](https://huggingface.co/docs/transformers.js/custom_usage)：預設可能讀Hub/CDN，因此本案明確改同源與關閉remote。
- [Transformers.js env API](https://huggingface.co/docs/transformers.js/api/env)：local/remote/cache設定；main與stable可能不同，記實際使用版本文件。
- [ASR pipeline](https://huggingface.co/docs/transformers.js/api/pipelines)：辨識任務、語言與text輸出；不要直接照用其遠端音訊URL。
- [固定ONNX whisper-base模型](https://huggingface.co/Xenova/whisper-base/tree/64da57285918e20ea79ea5c88eed7197933abaa8)：已核准同base多語替代；完整效能／品質gate仍須實測。
- [MDN OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext)：有界本機重採樣；[Worker.terminate](https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate)用於停止推論工作。


---

## 原文件 UX-SEO.md

# 短音檔轉文字介面與 SEO

這是規格，尚未實作。Product App；結果文字是主要畫布，沒有AI聊天視窗。

```text
桌面
GlossQuote-Labs / 短音檔轉文字                      清除全部
WAV PCM16、單檔最多30秒／10MiB
選擇音檔   語言 [中文（普通話） v]
┌──────────────────────────────────────────────────────┐
│ 檔名／時長／聲道                                       │
│ 首次需下載模型與元件 {真實bytes}，音檔留在裝置處理        │
│ [下載模型並辨識]                                      │
│ 正在下載／初始化／辨識 00:20                取消         │
│                                                      │
│ 完成後的純文字結果（主要區域）                          │
│ 辨識結果可能有誤，請核對後使用                          │
│                             複製文字 / 下載 TXT        │
└──────────────────────────────────────────────────────┘
格式限制・模型與資料處理・FAQ

手機
工具名／清除全部
格式與時間限制
選檔與語言
模型下載告知＋開始
階段／取消
文字結果（全寬）
核對提醒＋複製／下載
說明
```

初始「選擇一段中文或英文短語音，轉成可複製文字。」；下載「正在下載辨識模型：{received}/{total}，尚未辨識音檔。」；初始化「正在準備辨識模型。」；準備音訊「正在整理音訊格式。」；辨識「正在本機辨識，可取消並稍後重試。」；成功「文字已產生，請核對後使用。」；全零empty「這段音檔沒有可辨識的聲音。」；模型empty「未產生文字，請檢查錄音內容與語言選擇。」；取消「已取消，模型已卸載；再次開始需重新載入模型。」；逾時「本次辨識未能在時間限制內完成，請改用較短的音檔。」；不支援「此裝置／瀏覽器尚未通過本機辨識所需能力檢查。」；檔案拒絕「請選擇30秒內的PCM16 WAV，第一版尚不支援這種音檔。」

每個開始步驟顯示真實模型總量，不寫模糊「只要幾秒」。取消與清除不藏在選單。介面依當頁modelLoaded狀態顯示「開始辨識」或「下載模型並辨識」。下載失敗不說成音檔上傳失敗。語言下拉有label。結果用可選文字區/readonly textarea、有名稱與rows，不用contenteditable或Markdown；複製拒絕時允許手動選取。結果中的標籤字串仍是文字。

stage用aria-live polite，只播狀態不逐token或每秒播。成功不搶焦點，完成訊息與結果可用tab到達；按清除後焦點回選檔。所有可觸控按钮至少44px，正常字至少4.5:1。320px重排、200%頁面縮放、長字串、reduced motion皆測。輸入支援不等於裝置速度支援；手機可讀／可操作，但沒實測前不宣稱手機辨識完成能力。

title：`短音檔轉文字：中文與英文語音｜GlossQuote-Labs`

description：`在瀏覽器內將限定格式的短WAV語音轉成文字，支援中文普通話與英文。音檔由裝置處理，首次需下載模型，結果請自行核對。`

H1：`短音檔轉文字`

slug建議 `/tools/audio-transcription/`。首版靜態HTML列操作、格式、模型下載、速度與準確度限制；noindex,nofollow，待技術驗收與未來發布授權、正式URL確認後才canonical/sitemap。不得稱「全語言／完全準確／會議紀錄／即時逐字稿」或編造測試成績。

FAQ：

1. **音檔會被送到AI服務嗎？** 本工具規格只允許裝置端辨識；會下載模型與程式，但沒有音檔上傳或雲端備援。
2. **為什麼只收WAV、只有30秒？** 第一版用明確格式與有界記憶體控制裝置負擔；更多格式與長音檔需要另行驗證。
3. **辨識一定正確嗎？** 不保證。背景噪音、口音、語速、專有名詞與模型限制都可能造成錯誤；請核對後使用。
4. **會自動分辨講者或產生字幕嗎？** 不會。第一版只產生純文字，没有說話者分離、時間軸或摘要。
5. **中文會是繁體嗎？** 模型可能輸出繁體或簡體，本工具第一版不自動改寫字體。
6. **下次使用還要下載嗎？** 本版只在當頁保留模型，重整或清除全部後可能需要重新下載；不能保證完全離線冷啟動。


---

## 原文件 ACCEPTANCE.md

# 短音檔轉文字驗收

這是規格，尚未實作。A=Node自動，S=瀏覽器spike，B=正式介面驗收；初始全部not-run。

## 假資料如何建立

T02在`test/fixtures/wav-builder.mjs`建立Node Buffer WAV產生器：寫RIFF/fmt/data、16kHz/PCM16/mono，正弦值round(0.2*32767*sin(2π*440*i/16000))；T03延伸破損chunk、兩聲道、44.1/48k與超時長資料。音訊只含合成訊號，無私人錄音。

辨識需要真實語音聲學，正弦波不能用來證明準確度。T02的 `scripts/make-speech-fixtures.ps1` 只用已安裝的Windows離線System.Speech voice，把下列自寫假句各合成一個PCM16、16kHz、mono WAV至test/fixtures/generated；選可用zh-CN/zh-TW普通話與en-US/en-GB voice並記voice名稱/版本。`run-speech-fixtures.mjs` 使用完整Windows PowerShell路徑建立子程序，子程序移除繼承的PSModulePath覆蓋，不改User/Machine環境，不安裝voice，不呼叫網路語音API。沒有離線中文或英文voice則該spike not-run並停下；不得下載真實人的錄音或偷偷用雲TTS補證據。

中文五句（用常見繁簡相同字減少字體差異）：

1. 今天下雨了，我在家中休息。
2. 桌上有三本中文故事。
3. 星期天上午，我和朋友一起散步。
4. 如果明天下雨，就在家中吃午餐。
5. 今天的工作完成了，大家可以休息。

英文五句：

1. The blue cup is on the wooden table.
2. We will meet at the park on Sunday.
3. Please open the window before lunch.
4. This is a short test of local speech recognition.
5. The next task is ready for review.

調整離線voice rate讓每句5–10秒，必要時前後補靜音，不修改識別文字；另將句子按固定順序及0.5秒間隔合成30秒檔，超過就減少句數／補靜音，不截掉單字。記真實wave時長與reference。文本評分按TECHNICAL規則與Levenshtein距離，CER=(S+D+I)/reference字數、WER=(S+D+I)/reference詞數。不得把合成語音結果當真實多人錄音準確率。

## 案例

| ID | 類型／需求 | 輸入／步驟 | 預期 |
|---|---|---|---|
| AT-01 | A FR-01 | 空、兩檔、10MiB+1 | EMPTY_FILE、MULTIPLE_FILES、FILE_TOO_LARGE；無大陣列配置 |
| AT-02 | A FR-01、FR-02 | PCM16/16k/mono/480000frames | 30秒，data=960000bytes，接受 |
| AT-03 | A FR-02 | 同格式480001frames | DURATION_TOO_LONG，尚未建Float32Array |
| AT-04 | A FR-01 | MP3改名.wav、floatWAV、24bit、3ch、22050Hz | 第一例WAV_INVALID；其餘全部WAV_UNSUPPORTED，不以副檔名放行 |
| AT-05 | A FR-02 | chunk長度越界、重複data、錯blockAlign、129chunks | WAV_INVALID；無越界讀取／配置 |
| AT-06 | A FR-06 | PCM frame L=32767,R=-32768 | mono=-1/65536；另int16 -32768→-1 |
| AT-07 | A FR-06 | 全零30秒；RMS正好0.0001 | empty，模型呼叫次數0 |
| AT-08 | S FR-06 | 48kHz 440Hz正弦30秒重採樣 | 480000floats，頻率440±1Hz；24k以上不存在可保留頻率，不以簡單抽樣造成高頻alias；另12kHz源重採樣後RMS≤原RMS的0.1 |
| AT-09 | A FR-04 | manifest未知欄、外部path、..、重複path、>300MiB | 全部拒絕，無fetch |
| AT-10 | S FR-04、FR-05 | cold模型載入與初始化 | 固定版本/revision與manifest全match；時間／資產／記憶體符合TECHNICAL gate |
| AT-11 | S FR-03、FR-09 | 中英各5句與30秒組合 | CER/WER與速度符合TECHNICAL gate，原始結果／正規化分數分開記錄 |
| AT-12 | S+B FR-07、FR-08 | 下載、初始化、推論各取消3次 | ≤1秒UI取消、Worker終止、晚到結果不出現；重試可成功 |
| AT-13 | A+B FR-08、FR-11 | fakeWorker A晚回，取消後B完成，最後A回 | 只顯示B；模型已卸載狀態準確；清除後都不能復活 |
| AT-14 | B FR-10 | 模型已載後離線辨識；冷啟缺模型 | 已載可辨識；缺模型明確失敗，無Hub/CDN fallback |
| AT-15 | S+B FR-04、FR-12 | 刪資產、改一byte、伺服器redirect | MODEL_LOAD_FAILED／ASSET_INTEGRITY_FAILED，在推論前阻擋，無降級遠端 |
| AT-16 | A+B FR-09、FR-12 | 模型文字`<img src=x onerror=alert(1)>` | 文字原樣顯示和匯出，不建元素／不請求x |
| AT-17 | A FR-09 | 空白text、20,000字、20,001字、C0控制字元 | empty；接受；OUTPUT_TOO_LARGE；TRANSCRIBE_FAILED |
| AT-18 | A+B FR-09 | ` hello\r\nworld `複製／下载 | 顯示hello LF world，TXT最後1個LF、UTF-8無BOM；copy拒絕有手動選取 |
| AT-19 | B FR-10、FR-11 | 清除全部，Network/storage/console觀察 | 音檔／PCM／文字／模型reference清空，無工作資料寫入／內容請求；不假稱OS抹除 |
| AT-20 | B 全介面 | 鍵盤全流程、320px、200%頁面縮放 | 功能全可達，焦點可見，長逐字稿不撐寬頁面 |
| AT-21 | A+B FR-07、FR-13 | fake timer下載180秒、初始化120秒、推論180秒 | 對應固定錯誤，终止Worker並可重試，不自動無限重啟 |
| AT-22 | B FR-03、FR-11 | 成功後改語言；推論時嘗試改語言 | 前者結果失效，後者選擇禁用，不混用舊設定 |

T02只要求AT-09–11、AT-12/15的S部分，以及AT-14的模型離線／冷啟缺檔能力，不要求T04才建立的AT-13正式JobController或T05正式UI。T03後用正式WAV parser與重採樣再跑對應資料測試，T05/T06完成全部B案例。

spike證據寫 `docs/SPIKE-RESULTS.md`，產品逐案寫 `docs/TEST-RESULTS.md`。記瀏覽器完整版本、實際CPU/RAM/OS、模型revision、package版本、bytes/hash、量測方法、數值、pass/fail/not-run。至少8 GB RAM的可取得機器即可驗證本機MVP；若較高RAM，只保留「最低8 GB相容性未驗證」限制，不因此否定本機實測。正常測試必須離線且用假資料；下載固定公開資產屬於前置建立，不把它叫離線測試。


---

## 原文件 TASKS.md

# 短音檔轉文字實作任務

流程以 AGENTS.md 的「閱讀與執行」「交付與收斂」為準：沿用本 session 已讀文件，只補讀變動／相關段落；同一授權工作依序推進，不因任務切換重問。各任務 allowed paths、前置條件與必要驗收保持有效，缺陷回到其擁有任務修正；來源發布依適用的既有明確授權，不包含網站部署。

本文件定義任務；實際進度以 HANDOFF.md 與最新驗收紀錄為準。一次一項按序進行；fail/not-run不能標完成。每項先讀 [HANDOFF](HANDOFF.md)，完成寫檔案／命令／數據／未測／下一項。所有allowed paths僅限本專案；套件／模型取得是未來T01–T02工作，本次文件不下載。

2026-10-10 TASK-ENTRY 的較新授權生效：預覽4192、spike5192（占用改空閒loopback）；繁中＋英文；通過必要gate後獨立公開GitHub來源。正式部署及首頁由原主對話整合。2026-10-11 T01已依核准的Xenova固定候選解除舊阻塞，移交後15/15 test、45files check、27public-files build退出0；完整T02仍未通過，T03–T09不得跳過前置。

## T00 — 空骨架與檢查命令

- 前置：依 AGENTS.md 完成本任務所需文件閱讀，Node24+。
- allowed paths：`package.json`、`scripts/serve.mjs`、`scripts/check.mjs`、`scripts/build.mjs`、`public/index.html`、`public/styles/tokens.css`、`public/styles/app.css`、`public/js/app.mjs`、`test/scaffold.test.mjs`、`HANDOFF.md`。
- 建private ESM；dev=`node scripts/serve.mjs`只綁127.0.0.1:4173且只供public；test=`node --test`；check=`node scripts/check.mjs`真檢查語法/必要檔/危險DOM/外部資源；build=`node scripts/build.mjs`僅public→dist。頁面noindex且不假裝模型已可用。
- 驗收：建完腳本後 `npm test`、`npm run check`、`npm run build`、`npm run dev`，確認loopback和靜態根，停止dev。
- 完成：骨架真可檢查，无runtime安裝，回寫HANDOFF。

## T01 — 固定模型、runtime與分發條件

- 前置：T00完成。
- allowed paths：`package.json`、`package-lock.json`、`public/model-manifest.json`、`docs/DEPENDENCIES.md`、`HANDOFF.md`。
- 查官方固定套件版本／模型immutable revision、量化檔／ONNX外部資料／tokenizer／ORT／worker與授權。選WASM單執行緒可用dtype，列精確files、資產來源與產品預算。記錄尚未取得的實際hash為待T02確認，不能放假的可執行hash。
- 驗收：package填精確版本後 `npm install --package-lock-only --ignore-scripts`，檢查lock與所有transitive來源；`npm run check`。不可自動換成英文專用模型來躲中文驗收。
- 完成：候選完整可研究、無授權／成本／範圍未決，記清尚待T02量測。技術查證自行完成；只有實質產品選擇無法符合既定規格時停並問，回寫HANDOFF。

## T02 — 模型技術spike與假語音驗證

- 前置：T01完成。
- allowed paths：`scripts/stage-model.mjs`、`scripts/serve-spike.mjs`、`scripts/make-speech-fixtures.ps1`、`scripts/run-speech-fixtures.mjs`、`scripts/check.mjs`、`scripts/build.mjs`、`public/model-manifest.json`、`public/models/whisper-base/**`、`public/vendor/transformers/**`、`public/vendor/onnx/**`、`public/js/core/manifest.mjs`、`public/js/asset-loader.mjs`、`public/js/transcribe.worker.mjs`、`test/manifest.test.mjs`、`test/spike/index.html`、`test/spike/spike.mjs`、`test/spike/scoring.mjs`、`test/fixtures/wav-builder.mjs`、`test/fixtures/generated/**`、`docs/DEPENDENCIES.md`、`docs/SPIKE-RESULTS.md`、`HANDOFF.md`。node_modules僅npm生成。
- `npm ci --ignore-scripts`取得精確runtime。建立stage-model後才 `node scripts/stage-model.mjs`，只下載已列公開immutable資產，填真bytes/hash且附授權；不讀帳號、token或gated模型。建立Windows離線假語音腳本後才 `node scripts/run-speech-fixtures.mjs`，沒有所需voice即not-run，不安裝系統voice、不動persistent環境。
- 建serve-spike與量測頁，路由白名單依TECHNICAL；AssetLoader先驗完整性、清掉remote/default cache設定，固定模型API在Worker證明可跑。先建wav-builder供合成PCM。此階段spike只載自己生成、固定路徑且有hash/bytes的假PCM16/16k/mono檔，測試頁可用有界fixture reader取得樣本；尚未接受任意使用者WAV，也不假稱已完成T03正式parser。
- 驗收：`npm test`、`npm run check`、`node scripts/serve-spike.mjs`；完成TECHNICAL七gate中可由spike量測的模型／Worker／資產能力，以及AT-09、AT-10、AT-11、AT-12的spike部分、AT-14的已載模型離線／冷啟失敗能力、AT-15的spike部分。記中文CER／英文WER、時間／記憶體／取消／網路；測後停止server。AT-13的正式JobController競態留T04；AT-12/14/15的正式UI驗收留T05，不要求本階段不存在的產品模組。
- 完成：上述spike必要項在至少8 GB RAM可取得實機實測pass才T03；若RAM較高，記實際環境通過和最低8 GB相容性未驗證，不阻止後續。缺假中文語音則spike未完成，不把demo成功替代；回寫HANDOFF。

### RESUME-12-T02-20261011 — 原功能chat接續完整gate

- 本工具檔案所有權已正式移回原chat；不建立子代理、不傳訊其他chat、不覆寫20261011-unblock證據。新證據只追加`.runs/audio-transcription/20261011-resume-t02/**`。
- 沿用核准候選、19項資產、官方standalone vendor原檔。先跑最終移交test/check/build，再完成各語言5句＋30秒三輪、完整程序記憶體／清除後30秒、每階段3次取消、全零、缺檔／篡改／redirect／離線及Network/Storage。
- 本次相關allowed paths補列：T02原有範圍、`scripts/sample-process-memory.ps1`、`scripts/run-memory-sampler.mjs`、`scripts/measurement-lock.mjs`、`test/scoring.test.mjs`、`test/spike.test.mjs`、`test/speech-fixtures.test.mjs`、`README.md`、`docs/RELEASE-CANDIDATE.md`、`TASKS.md`。不進T03的任意使用者WAV parser或正式產品狀態／介面。
- 重量級測試必須原子取得既有共享量測鎖，未取得僅進行不競爭靜態工作；只釋放自己的鎖。OS程序量測必須可靠對應測試renderer與Worker，不以JS heap冒充。
- 本機T02和source/hosting分開；decoder53,707,539bytes仍超過Cloudflare單資產25MiB，production同源分塊與live驗證保留為後續發布gate，本次不部署。
- 本次結果：**BLOCKED_T02_MEMORY_PEAK**。09:04:23.805Z取得自有鎖後，Chrome68728的240筆每秒OS採樣證實Private增量1.931442GiB／WorkingSet增量1.820904GiB，均>1.5GiB。Chrome兩輪品質／时间子項符合；第三輪中止，Edge重型、取消、全零、已載離線NOT_RUN。已清理自有Worker／sampler／server／tabs、釋放自有鎖，環境前後一致；不進T03。詳見docs/SPIKE-RESULTS.md及HANDOFF最新段落。

### T02-MEMORY-ROOTCAUSE — 原chat修正（2026-10-12，仍屬T02前置）

- 交付：固定3.8.1／ORT源碼支持的根因分析、可審查的原生記憶體修正、focused regression，然後排他鎖下重測受影響完整T02。原1.5GiB、三輪、品質、cold／warm／取消／離線契約不變。
- 允許：本工具相關public/js、scripts、test、docs及進度文件；新append-only `.runs/audio-transcription/20261012-memory-rootcause/**`。保留舊失敗資料，不改model／vendor原始bytes、模型、輸入長度或依賴，不發布未完成工具、不委派。
- 先區分CPU tensor／KV引用、WASM heap保留及allocator；診斷可用固定fake fixture及數字計數，不能把heap診斷取代OSrenderer＋Worker驗收。每个诊断variant保持同一模型／sessions的多次真正warm推論，不能每次重建冒充通過。
- 診斷只在自有鎖下；不動影片對話保留的browser/server。相同修法兩輪無新證據即改研究方式；必要項仍FAIL／NOT_RUN時不進T03。Windows guard前後與scope核對必須記錄。

## T03 — WAV與音訊資料邊界

- 前置：T02完成。
- allowed paths：`public/js/core/wav.mjs`、`public/js/core/audio.mjs`、`public/js/core/transcript.mjs`、`public/js/audio-preparer.mjs`、`test/wav.test.mjs`、`test/audio.test.mjs`、`test/transcript.test.mjs`、`test/fixtures/wav-builder.mjs`、`test/spike/spike.mjs`、`docs/SPIKE-RESULTS.md`、`HANDOFF.md`。
- 先RIFF/chunk/frames gate再配置；實作PCM→mono、RMS、OfflineAudioContext重採樣、20k字上限與TXT輸出。用合成WAV驗證，所有錯誤分类固定，不用瀏覽器宽松解碼绕过限制。
- 驗收：`npm test`、`npm run check`、`node scripts/serve-spike.mjs`測AT-08後停止；AT-01–08/17/18自動部分過。Node測試不能假稱已驗OfflineAudioContext。
- 完成：有界音訊與純文字輸出契約通過，回寫HANDOFF。

## T04 — 工作狀態與取消

- 前置：T03完成。
- allowed paths：`public/js/job-controller.mjs`、`public/js/transcribe.worker.mjs`、`public/js/asset-loader.mjs`、`test/job-controller.test.mjs`、`test/asset-loader.test.mjs`、`HANDOFF.md`。
- 接jobId、exact worker message、可注入fake worker與clock，分download/init/inference timeout；取消保持來源但卸模型；clear全部；選語言使結果失效。URL與音訊不可進log。
- 驗收：`npm test`、`npm run check`；AT-12/13/15/19/21/22自動race部分通過。
- 完成：晚到輸出與未知消息无法改变新工作，回寫HANDOFF。

## T05 — 完整介面與靜態說明

- 前置：T04完成。
- allowed paths：`public/index.html`、`public/styles/app.css`、`public/js/app.mjs`、`docs/TEST-RESULTS.md`、`HANDOFF.md`。
- 接選檔／語言／模型下载告知／進度階段／取消／readonly結果／複製與下載。加UX-SEO內容和真實支援範圍；保留noindex，無正式網域／發布操作。
- 驗收：`npm test`、`npm run check`、`npm run dev`，人工AT-12–22，鍵盤/320px/200%頁面縮放與Network；測後停止。
- 完成：狀態與錯誤真實，輸出需核對提示可見；回寫HANDOFF。

## T06 — 全量驗收與交接

- 前置：T05完成。
- allowed paths：`docs/TEST-RESULTS.md`、`docs/SPIKE-RESULTS.md`、`HANDOFF.md`。
- 逐項覆核ACCEPTANCE，檢查固定manifest、下載量、無runtime外部路徑與沒有私密測試資料。需要改程式則回前一對應任務，不用本項越權修。
- 驗收：`npm test`、`npm run check`、`npm run build`、`npm run dev`，跑完整流程與所有必要案例後停止dev；build不得含test音訊／逐字稿。
- 完成：全部必要pass才標「本機驗收完成；未發布」。失敗或未測保留現況與具體下一步，不能因花很多時間就把本案標完成。

## T07 — 繁中／英文完整介面

- 前置：T06必要媒體及本機gate通過；使用者明確允許的人工NOT_RUN须列明，不可包含T02能力gate。
- allowed paths：`public/index.html`、`public/en/index.html`、`public/js/app.mjs`、`public/js/locales/**`、`public/styles/app.css`、`test/locale.test.mjs`、`docs/TEST-RESULTS.md`、`HANDOFF.md`。
- 每語言包含完整狀態、錯誤、模型告知、操作說明、格式限制與FAQ；當頁辨識語言選擇仍按FR-03，不跟介面語言混用。雙向語言切換及同語言家族首頁連結。
- 驗收：語系完整性／無未翻譯key測試、npm.cmd test、npm.cmd run check、真正瀏覽器雙語流程、320px／200%。人工NOT_RUN如實記錄。

## T08 — 可驗證靜態SEO與發布建置

- 前置：T07通過；沒有正式hosting證據前維持預覽noindex，不宣稱候選網址已上線。
- allowed paths：`scripts/build.mjs`、`scripts/check.mjs`、`public/index.html`、`public/en/index.html`、`public/404.html`、`public/robots.txt`、`public/sitemap.xml`、`public/_headers`、`test/release.test.mjs`、`package.json`、`.gitignore`、`wrangler.jsonc`、`docs/TEST-RESULTS.md`、`HANDOFF.md`。
- 可準備候選域名正式建置參數：canonical、双向hreflang、x-default、sitemap、robots、404、MIME／security headers。預覽與正式產物索引規則各可自動驗證；來源和模型manifest逐項比對真bytes/hash。不得部署。
- 驗收：npm.cmd test、npm.cmd run check、npm.cmd run build，檢查兩語dist及模型／vendor完整性，不包含fixture、私人資料或帳號內容。

## T09 — 獨立公開來源

- 前置：T08及必要本機gate通過；模型和runtime分發授權完整。不是為骨架或失敗spike發布完成工具。
- allowed paths：本工具`docs/RELEASE-CANDIDATE.md`、`HANDOFF.md`、`README.md`；專用`.runs/github-publish/glossquote-labs-audio-transcription/**`發布副本及`.runs/audio-transcription/**`證據。
- 審查發布清單後，沿用已授權的KYStr/glossquote-labs-audio-transcription公開來源流程；不讀憑證，只用既有gh登入，不操作孵化器根Git index／分支／commit。保留發布副本既有歷史。
- 驗收：公開可見性、遠端HEAD與本地發布commit一致；記URL、commit及包含資產清單。來源公開不等於網站部署。

## T10 — 整合或阻塞交接

- 前置：成功分支T09通過；阻塞分支可在任一必要gate不能通過時只記錄現況，不開後续產品任務。
- allowed paths：`docs/DEPENDENCIES.md`、`docs/RELEASE-CANDIDATE.md`、`HANDOFF.md`、`README.md`、`TASKS.md`；專用`.runs/audio-transcription/**`。
- 交付實際命令／退出碼、PASS/FAIL/NOT_RUN、改檔、風險及恢復條件，來源、本機完成、hosting分開。成功為READY_FOR_INTEGRATION；任何必要gate未通過為BLOCKED。
- 阻塞交接不得轉移為READY、更新首頁、正式部署或發佈未完成工具；環境guard前後不變並確認只改指定範圍。

## MEDIA-12-UNBLOCK — 固定替代候選與可重現stage（2026-10-11）

- 前置：T00既有PASS；T01的轉換權重分發證據不足。使用者已要求主動調整受阻媒體工具；先提出固定多語Whisper base候選及直接授權證據，主代理整合決定後才替換原候選。
- 交付／可觀察驗收：候選有immutable revision、轉換模型自己的授權聲明、完整適用公告及Transformers3.8.1檔名對照；核准後只從列明固定公開來源stage，manifest填實際bytes/SHA256，離線完整性與拒絕案例通過，最小本機Worker初始化／推論結果獨立記錄。
- allowed paths：T01既有allowed paths，加`TECHNICAL.md`、`TASKS.md`、`scripts/research-model.mjs`、`scripts/stage-model.mjs`、`scripts/verify-assets.mjs`、`scripts/serve-spike.mjs`、`scripts/make-speech-fixtures.ps1`、`scripts/run-speech-fixtures.mjs`、`scripts/check.mjs`、`scripts/build.mjs`、`public/index.html`（只更新既有預覽真實狀態文案，維持noindex／無音檔輸入）、`public/models/whisper-base/**`、`public/vendor/transformers/**`、`public/vendor/onnx/**`、`public/js/core/manifest.mjs`、`public/js/asset-loader.mjs`、`public/js/transcribe.worker.mjs`、`test/manifest.test.mjs`、`test/staging.test.mjs`、`test/asset-loader.test.mjs`、`test/spike/index.html`、`test/spike/spike.mjs`、`test/fixtures/wav-builder.mjs`、`test/fixtures/generated/**`、`docs/SPIKE-RESULTS.md`、`docs/RELEASE-CANDIDATE.md`、`.gitignore`；證據只能追加至`.runs/audio-transcription/20261011-unblock/**`。
- 驗收：固定候選研究證據；核准替換後`npm ci --ignore-scripts`、stage腳本、實際資產完整性檢查、`npm test`、`npm run check`、`npm run build`；有可靠瀏覽器能力時只跑最小相容性smoke，重型量測先與主代理協調排他鎖。
- 停止條件：新增權限／付費／持久環境異動／越界或衝突擁有者；同一問題兩次無新證據；必要技術gate失敗或不能可靠量測。沒有模型CDN／remote cache／雲端API備援。不得從stage或smoke把T02品質、時間、總記憶體、取消、離線／網路或完整MVP標PASS。
- 本任務不包含來源公開、部署、首頁、凭證、其他工具或自行轉換工具链；後續T02產品gate與既定中文＋英文短WAV範圍全部保留。

T02-MEMORY-ROOTCAUSE最新：必要輸出修正＋focused／native證據已落地；完整Chrome三輪／全零完成，Private增量1.681110GiB仍FAIL，T03之後／source／hosting未解鎖。詳見MEMORY-ROOTCAUSE與最新HANDOFF。

## T02-MEMORY-BOOTSTRAP-PEAK — 有界診斷（2026-10-12）

- 交付：由舊1055筆OS資料定位初次zh-01峰值，再以同一固定5秒zh-01、原19項資產、原模型／runtime及必要輸出修正，比較最多兩個有源碼證據的假設。每種條件新Worker、一個pipeline、兩個session；三次推論沿用session。新報告僅固定標籤、時間、位元組數、計数及布林結果，不保存音訊或逐字稿。
- H1：verified Map之外的Response／消費端副本；只將整份Response建構副本改成有界隔離chunk stream。H2：原生預先封裝權重與第一次workspace並存；只比較官方固定版本的session.disable_prepacking=1。
- allowed paths：本工具public/js/asset-loader.mjs（只抽出Response建構接點，預設不改）、test/spike/bootstrap*、test/spike/chunked-response.mjs、test/bootstrap-response.test.mjs、test/bootstrap-instrumentation.test.mjs、TASKS.md、HANDOFF.md、docs/BOOTSTRAP-PEAK.md；新append-only證據僅.runs/audio-transcription/20261012-bootstrap-peak/**。沿用現有measurement／server／identity脚本，不改模型、vendor、manifest、package-lock、fixture或其他工具。
- 驗收：focused離線測試及check；可靠main／每個新Worker PID對應、每秒OS Private／WorkingSet原始記錄，載入／首次encoder與decoder／warm／clear+30秒窗口；19項資產及固定來源hash不變，前後Windows環境fingerprints一致、自有lease／程序清理。
- 停止：兩個假設無新證據即報具體阻塞；本輪不自行重跑完整T02或T03、不降低門檻／縮輸入／force GC、不發布／部署。短診斷結果不能解除先前完整T02 FAIL；交主對話審查候選後決定完整gate。

T02-MEMORY-BOOTSTRAP-PEAK結果：兩假設診斷已交付，不採用candidate；510筆等時序OS資料，首次encoder WASM擴张已核实，短句未复现full1.681110GiB FAIL。39tests/check98/build28 PASS；保留T02阻塞。详见docs/BOOTSTRAP-PEAK.md與新evidence closure。


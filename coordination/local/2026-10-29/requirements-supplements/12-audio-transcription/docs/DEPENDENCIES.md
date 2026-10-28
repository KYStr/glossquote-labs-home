# 固定候選與分發研究

## 2026-10-11目前固定選擇：T01缺口已解除

MEDIA-12-UNBLOCK沿用使用者「主動調整受阻媒體工具」授權；主代理審閱固定模型卡、來源與generation_config後核准同base多語q8替代。現在模型為`Xenova/whisper-base@64da57285918e20ea79ea5c88eed7197933abaa8`，Transformers仍3.8.1、ORT仍1.22.0-dev.20250409-89f8206ba4；package-lock未改，SHA256仍`b5cee76fc4eb6d936b3227ca8ab4eea142f45e571968e68c5fdab100d63cc91d`。沒有換成英文專用模型或自行轉換。

直接依據是[Xenova這個固定轉換模型自己的README](https://huggingface.co/Xenova/whisper-base/blob/64da57285918e20ea79ea5c88eed7197933abaa8/README.md)中的`license: apache-2.0`及ONNX權重說明，不是從wrapper或base_model連結推定。固定generation_config明示is_multilingual=true並包含zh/en語言token。原onnx-community候選的授權證據不足記錄保留於下方；沒有宣稱原候選法律禁止使用，也没有作全面法律保證。

授權層分開保留：Xenova轉換repo聲明Apache-2.0、完整Apache文字及原始card；OpenAI原始Whisper程式／權重的MIT文字；HF上游固定模型card的Apache metadata；Transformers Apache；其standalone bundle中的Jinja MIT；ORT MIT及完整ThirdPartyNotices。卡片／公告byte-identical staging，公告不當可執行HTML/Markdown。觀察固定bundle sourcemap的嵌入套件closure是Jinja、onnxruntime-common及onnxruntime-web；沒有將Node原生sharp／libvips或整個node_modules複製至public。

### 實際stage與瀏覽器import

`npm ci --ignore-scripts --no-audit --no-fund`以完整Node/npm CLI、空白task-owned npmrc及專用cache完成，53個安裝套件，install scripts全部停用。`scripts/stage-model.mjs`固定所有公開來源及每個預期bytes/SHA256，逐項驗證後才寫public；已存在不同檔案fail closed，不覆寫。HF LFS只允許觀察到的固定CDN hostname，重導不印簽名query；開發取得可用官方公開網路，執行期只允許同源。

實際19檔**102,581,371 bytes**：7項model資料79,677,901、3項runtime執行資產22,528,676、9項卡片／完整授權／公告374,794。`public/model-manifest.json`現在全部為真bytes及64hex SHA256；每項hash以該檔實際bytes重新核實，詳細完整清單見manifest。最大decoder53,707,539 bytes；此本機closure低於300MiB總預算與160MiB單檔預算，尚不代表Cloudflare能直接發布。

模型檔固定為config.json、generation_config.json、preprocessor_config.json、tokenizer.json、tokenizer_config.json、onnx/encoder_model_quantized.onnx及onnx/decoder_model_merged_quantized.onnx。runtime使用同一固定npm package的**transformers.min.js**，888,173 bytes；原研究的transformers.web.min.js含裸ORT imports，不能直接供無bundler的原生瀏覽器ESM，故沒有將不完整import closure當成可用資產。standalone檔較大但仍在相同固定runtime版本。ORT glue44,484 bytes、WASM21,596,019 bytes；WASM由已驗證Map的wasmBinary供給，numThreads=1、proxy=false。模型fetch改為已驗證Map，remote及所有持久cache關閉。

最小Chrome/Edge實測已成功初始化與兩個短synthetic中英推論。Worker resource timing觀察19項原生asset GET及兩個固定同源native ESM imports，沒有額外模型／WASM請求或外源；native imports額外重傳888,173+44,484 bytes，Worker觀察body總量**103,514,028 bytes**，與logical manifest102,581,371分開記錄。native import依既有build hash＋固定同源URL＋CSP保護，不宣稱有原生SRI；resource timing也不冒充完整封包／離線驗收。

### 尚未完成的gate與hosting條件

完整T02仍未通過：各語言5段CER/WER、三輪30秒推論速度與UI心跳、renderer＋worker總記憶體／清除後30秒、分階段各3次取消、完整瀏覽器斷網／缺檔／篡改／redirect與全零音訊仍須既有gate。兩短句smoke不能解鎖T03。正式產品及双語UI、來源公開、hosting均NOT_RUN。

主代理已確認Cloudflare單資產25MiB上限；decoder53,707,539 bytes不能直接作單檔發布。主代理另有20MiB wire chunk重組同SHA前置證據，但本工具尚未實作production chunk loader。後續須保留logical file manifest、每chunk＋整檔SHA、固定同源path與總下載量只計原邏輯檔一次，再重新通過相關gate；本任務沒有新增R2、服務、帳戶／權限或部署。

固定研究原始18sources、每次stage、最小Browser DOM摘要與環境guard均追加在`.runs/audio-transcription/20261011-unblock/`。完整實測結果見[SPIKE-RESULTS](SPIKE-RESULTS.md)。下方為2026-10-10未替換前的歷史證據，狀態及null manifest敘述只適用當日。

## 2026-10-10原候選研究（歷史保留）

研究日期：2026-10-10（Asia/Taipei）。任務：T01。**判定：BLOCKED；沒有進入T02。**

## 固定版本

- `@huggingface/transformers` **3.8.1**。選用已發布v3版本，以本版原始碼核實現有env及Whisper API；未以main文件代替stable，也未自行更換4.x。直屬依賴精確鎖定，全部轉依賴版本在package-lock.json。
- 多語模型 `onnx-community/whisper-base` **1846881b6b3a3024392c1eea3ad983695bc23925**；不是英文專用`.en`。
- ORT：`onnxruntime-web` **1.22.0-dev.20250409-89f8206ba4**，由Transformers 3.8.1明確依賴；不用浮動版本。這是已發布的dev build，仍需要T02證明單執行緒WASM可用。
- dtype：`{encoder_model:'q8',decoder_model_merged:'q8'}`。本版getSession以ONNX檔案base name取dtype物件欄，q8對應`_quantized`；Seq2Seq實际載入encoder_model及decoder_model_merged。不是decoder_model／decoder_with_past的其他組合。

官方來源：[固定release](https://github.com/huggingface/transformers.js/releases/tag/3.8.1)、[npm固定包](https://registry.npmjs.org/@huggingface%2ftransformers/3.8.1)、[固定dtype原始碼](https://github.com/huggingface/transformers.js/blob/3.8.1/src/utils/dtypes.js)、[固定model loader](https://github.com/huggingface/transformers.js/blob/3.8.1/src/models.js)、[模型固定檔案樹](https://huggingface.co/onnx-community/whisper-base/tree/1846881b6b3a3024392c1eea3ad983695bc23925)。

## 檔案清單與預算

以下位元組來自固定Hub API blob/LFS中繼資料或經npm SHA512驗證的官方tarball檔案header，**不是已stage的模型hash／瀏覽器下載量**。`public/model-manifest.json`僅是研究草稿，bytes及sha256均為null，不能交給AssetLoader或當成可執行manifest。沒有填假hash；T02取得實際完整檔案後才可以填入實測bytes/SHA256。

模型同源根：`/models/whisper-base/1846881b6b3a3024392c1eea3ad983695bc23925/`。每個模型公開取得URL為`https://huggingface.co/onnx-community/whisper-base/resolve/1846881b6b3a3024392c1eea3ad983695bc23925/{檔名}`；不得使用main、token、gated來源或執行期Hub下載。

| 檔名／同源path | 來源標示bytes | MIME |
|---|---:|---|
| config.json | 2,243 | application/json |
| generation_config.json | 3,832 | application/json |
| preprocessor_config.json | 339 | application/json |
| tokenizer.json | 2,480,466 | application/json |
| tokenizer_config.json | 282,682 | application/json |
| onnx/encoder_model_quantized.onnx | 23,201,314 | application/octet-stream |
| onnx/decoder_model_merged_quantized.onnx | 53,693,315 | application/octet-stream |
| /vendor/transformers/transformers.web.min.js | 469,931 | text/javascript |
| /vendor/onnx/ort-wasm-simd-threaded.jsep.mjs | 44,484 | text/javascript |
| /vendor/onnx/ort-wasm-simd-threaded.jsep.wasm | 21,596,019 | application/wasm |

- 上列來源標示總量 **101,774,625 bytes / 97.05985 MiB**，最大檔53,693,315 bytes；低於300 MiB總預算／160 MiB單檔預算。僅候選資產研究，不代表T02量測PASS。授權公告在完整候選獲准分發後另納入實際資產清單與大小。
- vendor來源是官方固定Transformers npm tarball的dist檔；同版ORT tarball亦核實相同glue/WASM名稱及size，未執行包內程式。
- 模型固定檔案樹未列`.onnx_data`／`.bin`／外部資料檔，config未指定external-data配置；實際ONNX是否內嵌所有權重及所有fetch路徑仍要由T02證明，不能只憑檔名通過。
- 若T02發現額外必需檔案，只能先更新固定來源研究與manifest、核實授權／hash／預算再量測，不能臨時從CDN備援。

## 授權判定與具體阻塞

| 層 | 證據 | 判定／應保留公告 |
|---|---|---|
| Transformers.js 3.8.1 | 固定npm metadata及[LICENSE](https://github.com/huggingface/transformers.js/blob/3.8.1/LICENSE) | Apache-2.0，需帶完整LICENSE及適用copyright／NOTICE |
| ORT固定commit | npm metadata及[89f8206ba4 LICENSE](https://github.com/microsoft/onnxruntime/blob/89f8206ba4/LICENSE) | MIT，需保留Microsoft copyright及許可文字；編譯內第三方公告亦須stage時完整保留 |
| OpenAI原始Whisper程式／權重 | [v20250625 README的License段](https://github.com/openai/whisper/blob/v20250625/README.md#license)及[LICENSE](https://github.com/openai/whisper/blob/v20250625/LICENSE) | 官方明示原始程式及權重MIT；這個事實不等於候選轉換檔具有已確認的完整分發聲明 |
| HF上游openai/whisper-base／tokenizer | [固定模型卡e37978b90ca9030d5170a5c07aadb050351a65bb](https://huggingface.co/openai/whisper-base/blob/e37978b90ca9030d5170a5c07aadb050351a65bb/README.md) license metadata | Apache-2.0。上游固定樹沒有單独LICENSE檔；對`LICENSE`請求404，不能冒充已取得檔案。與OpenAI原始庫MIT的不同來源聲明各自保留 |
| **onnx-community轉換權重及複製的tokenizer/config** | [固定README](https://huggingface.co/onnx-community/whisper-base/blob/1846881b6b3a3024392c1eea3ad983695bc23925/README.md)、固定Hub API及全部5個歷史commit模型卡 | **未確認**。固定cardData無license，整個樹無LICENSE/NOTICE；4個可讀歷史模型卡亦無授權文字，初始commit README404。只有base_model連結及ONNX相容描述，無轉換權重的明示分發條件 |

**停在T01的原因**：TECHNICAL「固定供應鏈與下載契約」要求核實轉換權重/tokenizer分發條件，無法確認即停止研究gate；T01完成條件是沒有授權未決。不能把Transformers的Apache授權、OpenAI原始MIT或HF上游Apache標籤自行填到ONNX轉換模型的缺失欄，亦未得到新候選／自行轉換的範圍授權。這是證據不足，沒有宣稱該模型禁止使用。

恢復條件：取得可追溯到這個固定revision／所選量化檔的官方授權或完整權重與tokenizer分發依據，再關閉T01；若改為自行轉換可明確授權的原始Whisper，需另行明確批准轉換工具、依賴與新資產來源，重新固定和量測。沒有聯絡模型作者、沒有新增雲端API或換英文專用模型。

## npm鎖及來源檢查

- 執行等價`npm install --package-lock-only --ignore-scripts --no-audit --no-fund`，以完整Node/npm CLI路徑及task-owned空白user/global npmrc；registry只用`https://registry.npmjs.org`，cache只在`.runs/audio-transcription/npm-cache`，子程序PATH僅在該子程序。未讀帳號設定或憑證，未執行install scripts，未安裝node_modules。
- 退出0；lockfileVersion3，78個套件項全部有精確version、registry.npmjs.org tarball、SHA512 integrity及宣告license。鎖定來源檢查PASS，不代表78個套件已執行或每個二進位已完整審計。
- package-lock.json SHA256：`b5cee76fc4eb6d936b3227ca8ab4eea142f45e571968e68c5fdab100d63cc91d`。
- `onnxruntime-node`、`protobufjs`、`sharp`宣告install script；本次全部禁用，T02仍必須`npm ci --ignore-scripts`。sharp／libvips原生平台依賴包含LGPL，不進瀏覽器public發布副本；禁止把整個node_modules複製到public。
- 官方Transformers及ORT tarball已在記憶體驗證metadata SHA512後只解析檔案目錄；未解包／執行runtime。證據在`.runs/audio-transcription/*-package-file-list.json`。
- `npm.cmd run check`：退出0，9個受管檔。這是來源檢查PASS，**T01整体仍BLOCKED**。

## T02尚待證明的配置

本版固定env原始碼確認allowRemoteModels/allowLocalModels/localModelPath/useBrowserCache/useFSCache/useCustomCache存在；未提供env.fetch API。T02需實作Worker受限global fetch adapter及記憶體Map，不能假設main API。

應禁remote、browser/FS/custom持久cache；本地id固定`whisper-base/{revision}`、localModelPath=`/models/`。ORT wasmPaths固定`/vendor/onnx/`、numThreads=1、proxy=false；單執行緒的實際能力不能從threaded檔名推論。dynamic ESM JS須以build hash及CSP保護，不能聲稱每個dynamic import有原生SRI。

generation_config來源明示is_multilingual=true；固定pipeline原始碼處理language／task／return_timestamps，後續傳chinese/english、transcribe、false及do_sample=false，仍須Worker實測證明沒有默默忽略選項。180s下載／120s初始化／180s推論與完整性adapter、renderer+worker memory、CER/WER、取消、離線及網路全部NOT_RUN。沒有模型速度／裝置支援／正式hosting承諾。

## 原始證據

專用目錄：`C:/Users/<LOCAL_USER>/Documents/Codex/GlossQuote-Labs/.runs/audio-transcription`。

Hub API、固定版本原始碼／授權、官方tarball目錄、歷史模型卡、lock-source-review-verified.json、candidate-asset-inventory.json及環境guard都保留。證據只能追加；不會帶到獨立來源發布副本。

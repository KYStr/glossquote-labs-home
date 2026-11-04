# T02-MEMORY-ROOTCAUSE

2026-10-12：原對話修正進行中。必要的原1.5 GiB門檻與歷史失敗資料保留，完整T02尚待雙瀏覽器重測。

固定Xenova/whisper-base revision64da57285918e20ea79ea5c88eed7197933abaa8、Transformers3.8.1與ORT1.22.0-dev.20250409-89f8206ba4原始資產未改。新證據在`.runs/audio-transcription/20261012-memory-rootcause/`，不改舊資料。

## 源碼與實機定位

固定npm源碼models.js的_prepare_encoder_decoder_kwargs_for_generation只讀encoderForward結果的last_hidden_state；backends/onnx.js呼叫session.run(ortFeed)而未選輸出。實際encoder的outputNames除了last_hidden_state，還有六份encoder_attentions；每次run回傳435,072,000 bytes，必要hidden state僅3,072,000 bytes，差額432,000,000 bytes（約412 MiB）沒有被本案純文字ASR使用。decoder也輸出不需要的decoder／cross attentions。這些是圖輸出CPU材料化成本，不是已證明的跨工作KV leak。

固定版本getPastKeyValues重用encoder KV，native WASM CPU output tensor在run後被釋放，CPU array由JS管理；WASM heap會保留容量。先測CPU tensor顯式dispose和arena／memory pattern都未改善，沒有把單元測試或heap數字当OS memory PASS。

主要源碼：[Transformers3.8.1 models](https://github.com/huggingface/transformers.js/blob/3.8.1/src/models.js)、[ORT固定WASM API](https://github.com/microsoft/onnxruntime/blob/89f8206ba4/onnxruntime/wasm/api.cc)、[ORT Session API](https://onnxruntime.ai/docs/api/js/interfaces/InferenceSession.html)。已讀安裝版本源檔的SHA在fixed-source-research.json；公開tag與安裝源碼行號不混用。

## 同一30秒fixture的有界診斷

| variant | OS Private增量 | WER | 說明 |
|---|---:|---:|---|
| 原設定，三次相同輸入 | 1.494 GiB | 全部0% | 非原混合三輪完整gate |
| CPU顯式釋放 | 1.848 GiB | 全部0% | 4884次dispose、tracked0，未改善，未上production |
| arena／memory pattern | 1.871 GiB | 全部0% | 未改善，未上production |
| 原設定＋每圖輸出追蹤 | 1.758 GiB | 全部0% | encoder output435,072,000 bytes |
| 只取必要輸出 | 1.164 GiB | 全部0% | encoder output3,072,000 bytes |

每個variant是一次load後在同一pipeline／兩個sessions進行三次真正warm推論。不同variant之間才卸載，沒有每次推論重建。三次修正輸出和原設定保持一致；WASM heap約847 MiB並未下降，改善來自避免未用attention輸出的材料化。峰值以每秒OS Private／WorkingSet分析，不能以heap代替。

最初由建立時間推測的renderer75872其實換出，29筆舊stream已明確INVALIDATED。之後以主執行緒和Worker各四次300ms CPU波形與原生CPU計數／空閒區段比對，兩者皆唯一對應Chrome45980，共用PID計一次。證據chrome-process-mapping-verified.json；沒有再要求使用者提供PID，也不讀瀏覽器profile或打印CommandLine。

## production修正與契約

public/js/core/plain-whisper.mjs先驗兩session輸出schema，再把encoder fetch限制為last_hidden_state、decoder限制為logits和全部present KV。logits／KV／hidden state值不改、不複製或提早釋放。public/js/transcribe.worker.mjs只在初始化後設定原sessions的run輸出選擇，明示plain mode output_attentions／return_dict_in_generate／return_token_timestamps=false。模型及sessions會沿用，不換模型、不縮音訊、不動vendor、不加依賴、不force GC。

cold仍先驗全部19資產再建原pipeline；warm仍用原model／sessions，載入後離線所需Map保留；取消／clear仍Worker.terminate。輸出選擇和timer／timeout／RMS零模型call契約保持，未知輸出schema或意外fetch／result fail closed。此adapter限定目前純文字Whisper契約，未來新增timestamps或升級runtime需重新覆核。

focused四項回歸驗證不材料化attention、值／sessions身份保持、整體schema先驗與錯誤保留。最終正式Worker離線test35/35、check90、build28退出0，stderr空；production-{test,check,build}.json。舊篡改／缺檔／redirect拒絕邏輯及model/runtime bytes未改。

## 尚待結果

Chrome修正後完整中英三輪／每秒OS／clear+30秒已啟動；Edge、九次取消、全零、已載offline與完整Network／Storage尚待真測。不進T03、不發布未完成工具；GitHub／hosting仍NOT_RUN。

## 完整Chrome驗收結果（最新）

35/35 test、check90、build28退出0。Chrome三輪中英共36個真推論及一個全零已完成；各輪CER2/60=3.33%、WER0/38=0%，30秒最大17,894.3ms，active心跳最大41.5ms。全零modelCalls0、text空。

OS1055筆每秒資料：初始Private92,766,208 bytes，peak1,897,844,736 bytes，增量1,805,078,528 bytes=1.681110 GiB，仍>1.5 GiB，所以T02 **FAIL_PRIVATE_MEMORY_PEAK**。WorkingSet增量1.076485 GiB；不能用它取代仍超標的Private判定。峰值發生首輪第一個zh-01推論期間（03:58:46.767Z），不是第三輪累積後才發生。每輪末尾Private中位1224.223／1221.230／1173.156 MiB，沒有先前每輪+452 MiB的增長；clear+30秒119.152 MiB。

注意：同一renderer前面做過診斷，PeakWorkingSet64是整個程序生命週期舊值，未用來冒充這一phase的峰值；本次peak均直接由每秒Private／WorkingSet窗口取得。Source原435MBattention輸出確已避免，但完整混合workload的初次峰值仍需進一步降低。較短同輸入探針的1.164 GiB不代表完整T02 PASS。

Edge重型、九次取消、已載offline：NOT_RUN，因必要memory gate仍FAIL停止。Chromestorage已測全空；完整Network仍未驗。舊拒絕案例證據保留，但不能代替新完整gate。

自有Worker／tab已結束、三組有效memory sampler正常退出0（最早錯PIDstream退出1並INVALIDATED），server71220已驗node／task evidence参数後停止（session退出1）、自有lease已核对receipt释放；未關其他user／影片tab或server。環境guard前後Snapshots逐欄相同。新原始資料與分析在chrome-t02-{final-report,memory-analysis}.json及chrome-t02-fixed-process-memory.jsonl。

剩餘阻塞是初次zh-01的Private commitment峰值約1.68 GiB；需要區分完整production bootstrap與短句初次encoder工作區的暫態配置，才能再提出有證據的修正。不提高門檻、不改候選、不縮輸入、不force GC、不反覆重測相同修法。T03之後、來源公開及hosting均未開始。

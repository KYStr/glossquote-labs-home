# T02-MEMORY-BOOTSTRAP-PEAK（2026-10-12）

本輪只做最多兩個源碼支持的短句假設對照；完整T02必要gate仍保留前輪Private增量1.681110GiB FAIL。未重跑完整T02、未啟動T03、未公開來源或部署。

固定Xenova/whisper-base@64da57285918e20ea79ea5c88eed7197933abaa8、Transformers3.8.1／ORT1.22.0-dev.20250409-89f8206ba4、原19項資產102,581,371bytes及同一5秒zh-01 SHA 3e732970610e8ba0a09741d437d7dc25b35817e5e0d1b421030c86bd8dfc5610。每種條件全新Worker，初始化一個pipeline／兩session，三次同句推論保持sessions。原必要輸出修正保留；無force GC、較小模型／輸入、vendor修改或新增依賴。

已先分析舊1055筆OS資料：full peak在首輪zh-01推論期間，後面三輪末尾没有持續增長。這輪用同句定位encoder／decoder與buffer生命週期。

## 已證實的來源生命週期

AssetLoader的verified Map持有102,581,371bytes。兩個ONNX檔共76,908,389bytes；[WHATWG Fetch](https://fetch.spec.whatwg.org/#concept-bodyinit-extract)規定BufferSource body建構會複製。固定HF hub消費每個ONNX Response.arrayBuffer得到獨立buffer，ORT malloc並將模型複製到WASM；固定wasm-core-impl.ts的createSession finally會free這份staging。這些已釋放的allocation與WASM保留容量、session weights或工作區不同。回報的累計交付／副本bytes不是同時存活的實測值。

H1僅將整份body建構副本改成<=1MiB、highWaterMark0的隔離chunk stream；每個chunk複製，讀取方不能修改verified Map。繼承原完整性、exact請求與offline memory-map讀取规则。H2僅加[固定ORT官方session.disable_prepacking=1](https://raw.githubusercontent.com/microsoft/onnxruntime/89f8206ba4/include/onnxruntime/core/session/onnxruntime_session_options_config_keys.h)；用同步bridge確認兩session都接受該設定，不改權重或量化。兩候選目前只在test/spike；production預設仍原Response方式與原session options。

## 量測可信度與限制

使用者回覆的Edge75232／Chrome68728在本輪已不存在，沒有使用。四次300ms main與Worker CPU波形，空閒2500ms，與OS CPU計數唯一匹配後採樣；同PID計一次，不靠建立時間猜測。原生sampler每秒記Private／WorkingSet、process startTime／CPU；不使用繼承前輪的lifetimePeakWorkingSet。每種條件觀察clear+30秒。

初期-File受既有ExecutionPolicy拒绝，未修改原則，改用已审查腳本內容-Command；首組短空閒CPU波形缺idle样本不採用。第一次初始化診斷掛鉤遭官方lazy export自替換，該筆作廢；修正同步bridge計數，Asyncify session／run exports保持原函式。另早期長等待baseline缺encoder alias標籤，原OS／輸出資料保留作phase参考，排除候選效果比較。最終三組自動在model-ready+23秒開始，避免手動等待造成暫存自然釋放時間不同。

報告僅固定標籤、數值、時間與布林相同結果；音訊／參考句／逐字稿均不寫入新原始報告或console。

## 最終等時序數值（Chrome診斷，非完整gate）

| 條件 | OS筆數 | 初始Private MiB | 載入後Private MiB | 絕對Private峰值 MiB | Private增量 GiB | init WASM MiB | encoder後WASM MiB | clear+30 Private MiB |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | 166 | 66.879 | 613.488 | 1192.488 | 1.099228 | 283.250 | 846.938 | 77.418 |
| chunked-stream | 129 | 85.211 | 627.629 | 1265.523 | 1.152649 | 283.250 | 846.938 | 85.625 |
| no-prepacking | 215 | 90.852 | 636.789 | 1206.227 | 1.089233 | 279.000 | 846.938 | 96.813 |

三組model-ready→首次infer分別23,023／23,016／23,026ms。OS依序166／129／215筆，共510筆；每組index連續，間隔範圍945–1077ms。main與每個新Worker都唯一匹配PID82252、同startTime，共用PID只計一次。各自采样器退出0。首baseline peak在encoder-1；H1 peak在第三次decoder series；H2 peak在第一次推論之後、第二次encoder之前的rest。只用現採樣Private／WorkingSet，未用lifetimePeakWorkingSet。

baseline首次encoder將WASM297,009,152→888,078,336bytes（+591,069,184／563.6875MiB）；第一次decoder沒有再擴張capacity。其encoder只返回3,072,000bytes，必要輸出修正仍有效。model staging共76,908,389bytes已在初始化完成前释放；ready及每次完成後bridgeLiveBytes=0。這证明初次encoder引起主要WASM保留容量增長，並不能證明所有原生分配的用途或解释舊完整gate的全部Private。

H1 Response建構模型副本累計76,908,389→0bytes，消費端獨立模型buffer仍76,908,389bytes，WASM不变；Private增量比baseline高54.703MiB、绝对peak高73.035MiB，無節省證據，**不採用**。H2兩session原生config entry均接受1，ready capacity只少4.25MiB，first encoder後仍846.9375MiB；其增量少10.234MiB，但initial baseline更高、绝对peak比baseline高13.738MiB，無足夠减幅，**不採用**。單次各條件對照不當作統計顯著因果。

九次輸出全部與baseline逐字相同（僅回報布林，不保存內容）；同句CER2/11=18.18%，各組warm sessions相同、pipeline constructions1、兩sessions、encoder calls3／decoder calls39。infer三次baseline5013.5／4452.3／4689.0ms，H15301.2／4420.8／5101.1ms，H24673.9／4218.0／4290.6ms。這是一個固定5秒句子的診斷，不是五句加30秒三輪的品質或效能驗收。

## 交付判定與下一個必要動作

兩個假設均没有足夠改善；沒有新的production memory candidate。所有候選、bridge與phase instrumentation只在test/spike；public/js/asset-loader.mjs只把原有Response建構抽成方法，預設行为保持一致。正式必要輸出修正、模型／runtime／manifest／lock及全部fixture保留。

受控短句沒有重現舊production完整gate的1.681110GiB增量；不能用這輪1.10GiB baseline解除原FAIL，也不能把未觀測的差額歸因於已釋放staging或prepacking。下一個有界里程碑需在原production Worker與原T02 preflight路径上取得同一短句的phase／ownership數值，對齊本輪控制条件，再決定是否值得完整gate；本輪到兩假設即停止。未自行跑完整T02／T03。Edge重型、取消、已載offline与完整Network仍沿前輪NOT_RUN；source／hosting仍NOT_RUN。

focused12/12；最終離線npm test39/39、check98files、build28publicfiles退出0／stderr空。後續只改本輪diagnostic role/timing標籤與文件，相关check与九次native均完成；public及單元測試輸入未再改，复用相同test/build證據。

原始OS、browser數值、源碼SHA、舊1055筆定位與可重跑analyze-final-diagnostics.mjs位於append-only .runs/audio-transcription/20261012-bootstrap-peak；final-numeric-windows.json是完整窗口，所有舊失敗與不採用／無效測量保留。


## 收尾核對

19項資產、13個原fixture的實際bytes／SHA與原manifest全部一致；production Worker、plain-whisper、manifest、package-lock及原spike頁未改；三組timed測量所用source SHA與交付source一致。三份等時序數值報告無音訊／參考句／逐字稿欄位或fixture參考canary。這項saved-report檢查不等於完整Network gate。

自有Workers已在各組測後終止；tab1636110847已關閉，所有samplers已結束；server80892再次核實node／script／task／evidence／creationTime後停止（signal SIGTERM，code null），receipt匹配後释放own lease。未結束renderer PID82252或其他使用者／媒體tab與server。Windows guard前後PASS，HKCU834 ExpandString、HKLM1227 String、ephemeral0，PATH／完整Environment-key／TEMP/TMP fingerprints逐欄相同。完整closure與raw資料保留。

> 最新2026-10-12：T02-MEMORY-ROOTCAUSE已修正未用attention輸出；完整Chrome三輪／全零通過子項，但Private增量1.681110GiB仍>1.5GiB，T02保持FAIL。35tests／check90／build28退出0。詳見[MEMORY-ROOTCAUSE](MEMORY-ROOTCAUSE.md)與HANDOFF最新段落。下方為2026-10-11原失敗歷史，保留原文。

# T02 實測記錄

2026-10-11，任務 RESUME-12-T02-20261011。**BLOCKED_T02_MEMORY_PEAK；T02 未通過，不得進 T03。** 使用者提供 Chrome 68728、Edge 75232 後已核實 OS PID；原本的量測鎖等待已解除。Chrome 真正推論的原生記憶體峰值超過必要門檻，因此依 TASK-ENTRY／TECHNICAL 停止後續重型測試與 MVP。

新證據僅在 `.runs/audio-transcription/20261011-resume-t02/`；未改寫 unblock 證據。來源發布與 hosting 均 NOT_RUN，非 READY_FOR_INTEGRATION。

## 固定候選與實機

Windows 11 Home 10.0.26200 / build 26200；CPU 系統回報 Genuine Intel(R) 0000，24 cores / 32 logical processors，不推測商用型號。RAM 34,163,732,480 bytes（約31.8 GiB）；最低8 GB裝置相容性未驗證。Chrome 154.0.8037.98、Edge 154.0.4258.62，各用專用分頁。

固定 Xenova/whisper-base@64da57285918e20ea79ea5c88eed7197933abaa8，多語 base、encoder／merged decoder q8、Transformers 3.8.1、ORT 1.22.0-dev.20250409-89f8206ba4。19項實際資產102,581,371 bytes，最大53,707,539 bytes；真 SHA256、公告與分層授權完整。模型／vendor／manifest／package-lock保持移交版本，沒有新依賴。45項移交快照初始全部相符；最終快照只出現本次允許的T02修改，不能冒充根Git diff。

## 假資料與靜態驗收

`node scripts/run-speech-fixtures.mjs --suite=quality`退出0。Windows離線 System.Speech 4.0.0.0、Huihui zh-CN／Zira en-US、rate=-2；不安裝voice。各語言五段5–5.383秒PCM16／16k／mono短句，只補零、不截斷語音；兩個30秒檔各串接同語言五段原始語音、0.5秒間隔後補零；另有30秒全零。13個fixture的來源、實際bytes／SHA在 `test/fixtures/generated/t02-v1/quality-speech.json`。此有界reader僅讀固定fixture，不是T03正式WAV parser。

評分先NFKC、刪Unicode標點，中文去空白／英文lowercase後空白分詞；Levenshtein總錯誤除參考單位數。五句以總錯誤／總參考長度合計，不修改原文或刪新增實質字詞；合計≤20%、各句≤40%。

| 命令 | 結果 |
|---|---|
| npm.cmd test | 0，21/21 PASS，零fail／skip |
| npm.cmd run check | 0，77 files |
| npm.cmd run build | 0，27 public files；不含fixture／spike頁 |
| node scripts/check.mjs（最終harness證據欄位修改後） | 0，77 files，stderr空 |

npm最終以固定Node/npm CLI、空白隔離npmrc、`--offline --update-notifier=false --no-audit --no-fund`執行，stderr空；原始命令／stdout／exit在 `offline-final-{test,check,build}.json`。最終harness語法在 `harness-final-check.json`。之後只有文件與證據回寫，沿用未變輸入的test／build結果。

## Chrome 真正辨識的已測部分

09:04:23.805Z原子取得自有共享鎖；09:04:31Z開始OS採樣，09:05:12.857Z開始cold load。測試頁狀態先清空，13個fixture已預取。冷載入的19項驗證資產102,581,371 bytes：下載373.9ms、完整性86.3ms、初始化1586.6ms。固定native ESM又讀standalone Transformers／ORT glue兩檔932,657 bytes；Worker實際21項resource body合計103,514,028 bytes，均為manifest固定URL。沒有宣稱dynamic import有原生SRI。

| 完成輪次 | 中文五句 | 英文五句 | 30秒檔最大推論 |
|---|---|---|---|
| 1 | CER 2/60 = 3.33%，每句≤40% | WER 0/38 = 0%，每句≤40% | 6435.9ms |
| 2 | CER 2/60 = 3.33%，每句≤40% | WER 0/38 = 0%，每句≤40% | 6111.7ms |

25個推論已完成：前兩輪各12個，第三輪只有zh-01完成；第三輪zh-02執行時因已確立的記憶體FAIL終止Worker。第三輪、全零、九次取消與已載離線均未完成；Edge重型測試未開始。全頁100ms心跳最大延誤25.5ms，active階段12.0ms；此為Chrome已測部分，不能當完整三輪／雙瀏覽器gate PASS。

中文zh-01參考「今天下雨了，我在家中休息。」，實際「今天下雨了,我再加中休息。」；保留在→再、家→加兩個錯字。原始輸出及正規化分數分開存於 `chrome-memory-failure-report.json`、`chrome-clear-plus-30-report.json`。此乾淨合成樣本結果不是真實錄音準確率保證。

## OS 總程序記憶體：FAIL

使用者提供Chrome68728、Edge75232。OS核實browser名称、renderer flag與startTime，未印完整CommandLine，見 `user-process-mapping-verified.json`。兩者startTime為07:55:37.6775067Z／07:57:21.2166655Z。每browser提供一個PID，renderer／dedicated Worker共用程序計一次；ORT numThreads=1、proxy=false。Chrome推論期间该PID的原生CPU累積增加119.359375秒，對應實際Worker負載；沒有用JS heap或整個瀏覽器近似值代替。

sampler PID40600／session46553採240筆，index連續、無漏列；間隔982–1024ms，平均1000.029ms。每筆保存PrivateMemorySize64、WorkingSet64、PeakWorkingSet64、TotalProcessorTime與startTime。raw `chrome-process-memory.jsonl`，分析 `chrome-memory-analysis.json`。sampler以自有stop file正常退出0，不終止browser程序。

| 時點／計法 | Private bytes／MiB |
|---|---:|
| 初始第一筆 | 74,780,672／71.316 |
| fixture完成後、模型載入前21筆中位數 | 91,938,816／87.680 |
| model-ready後最後5秒中位數 | 618.520 MiB |
| 推論峰值（09:06:52.888Z） | 2,148,651,008／2049.113 |
| 第1輪末尾最後5秒中位數 | 1135.523 MiB |
| 第2輪末尾最後5秒中位數 | 1587.563 MiB |
| Worker終止後30–35秒中位數 | 113.578 MiB |

- 初始→Private峰值增加2,073,870,336 bytes = **1.931442 GiB > 1.5 GiB**（上限1,610,612,736 bytes）。
- 載入前穩定中位數→Private峰值仍增加2,056,712,192 bytes = **1.915462 GiB**。
- 每秒實測WorkingSet峰值2,093,801,472 bytes，初始→峰值增加1,955,180,544 bytes = **1.820904 GiB > 1.5 GiB**。OS原生PeakWorkingSet達2,111,242,240 bytes，並非僅JS配置量。
- 第二輪尾端中位數比第一輪增加452.039 MiB；三輪持續趨勢未完成，不能宣稱三輪無累積或以它替代已證實的峰值FAIL。
- 09:07:46.257Z明確終止Worker，modelReady=false、phase=idle、acceptedLateResults=0，30秒後回落至約114 MiB。保留raw觀察，不宣稱OS安全抹除。

Private與WorkingSet兩種原生計法都超標。已測裝置RAM較高並不能放寬門檻；此結果只證明目前固定候選／runtime配置未達產品記憶體目標，不推定所有8 GB裝置無法執行或已查明配置峰值的根因。

## 完整性／離線／Network／Storage

loopback `http://127.0.0.1:5192`，只用固定假fixture。Chrome／Edge均在initializing／inference前拒絕：

| 案例 | Chrome | Edge |
|---|---|---|
| 固定config HTTP404 | PASS，MODEL_LOAD_FAILED | PASS |
| config一byte XOR（原檔未改） | PASS，ASSET_INTEGRITY_FAILED | PASS |
| config HTTP302 | PASS，MODEL_LOAD_FAILED，redirect:error | PASS |
| 真本機config移走後缺失 | PASS | PASS |
| 模型未載、預boot Worker後停止來源server | PASS | PASS |

config已恢復原2248bytes及SHA；control回normal。證據 `browser-faults-observed.json`、`actual-missing-asset-{start,restored}.json`、`cold-offline-server-stop.json`及metadata-only server requests／control JSONL。冷離線實際條件是自有origin server停止／TCP拒絕，不冒充DevTools Offline或NIC斷網。**已載離線推論NOT_RUN。**

Chrome25個已完成推論Worker resourceCount均21、assetReadCount10、blockedReadCount0，沒有新增資產請求；page／Worker皆為固定loopback路徑。完成推論並清除後Chrome local／sessionStorage、Cache、IndexedDB、Service Worker均空。console捕獲30條warn，實際／參考假逐字稿及audio marker均未見；只保存count／canary布林，不保存extension訊息，見 `chrome-console-after-inference.json`，不宣稱console完全空或已取得全瀏覽器封包證據。

準備期Edge只有sessionStorage key `__imt_handshake_page_id`，不記值、不推定來源，假語音canary／audio marker均false，其餘storage空。Edge尚無本次實際推論輸出可驗。完整Network／Storage／已載離線gate仍NOT_RUN。

## 七個必要gate與停止判定

| gate | 狀態 | 限制／證據 |
|---|---|---|
| 1 實機與兩browser環境 | PASS（此31.8 GiB裝置） | 最低8 GB未驗證 |
| 2 cold下載／init／bytes | 資產與Chrome PASS；Edge本次時間NOT_RUN | 不以舊smoke替代完整雙browser |
| 3 每語五句＋30秒三輪／heartbeat | 未完成／NOT_RUN | Chrome兩輪子項符合；第三輪中止、Edge未跑 |
| 4 CER／WER | Chrome兩輪子項PASS；完整gate NOT_RUN | CER3.33%、WER0%；不改原文 |
| 5 renderer＋Worker OS總記憶體 | **FAIL** | 初始Private峰值增量1.931442 GiB，WorkingSet1.820904 GiB，均>1.5 GiB |
| 6 Network／Storage／離線 | 拒絕案例PASS；完整gate NOT_RUN | 缺已載離線與完整雙browser輸出檢查 |
| 7 各階段取消3次／全零 | NOT_RUN | 因必要gateFAIL停止，未啟動 |

原atomic acquire在另一owner持鎖時回OCCUPIED，未刪除或取代他人鎖；直到另一owner自行釋放才開始重型測試。自有鎖owner為original-audio-chat/01535110-1df5-4766-a410-f61b9cb8b719；09:11:07.887Z核對receipt／owner／taskId／startTime後釋放，見 `measurement-lock-{acquisition,release}.json`。沒有子代理、新chat或其他chat傳訊。

自有Worker及兩個測試tabs已關閉；sampler正常退出0；server17848／session23284在核實node／script／08:01:42.8203025Z startTime後停止，session退出1（人工中止），見 `memory-failure-server-stop.json`。初次identity檢查因PowerShell DateTime時區解析不一致拒絕，未停止任何程序；改用DateTimeOffset.UtcDateTime後才停止已核實的同一PID。未影響其他server、tabs或jobs。

guard前後均退出0/PASS，全部Snapshots逐欄一致，見 `environment-before.json`／`environment-after.json`。HKCU PATH ExpandString、長834／16 entries／ephemeral0；HKLM String、長1227／30 entries／ephemeral0；PATH hash、完整Environment-key fingerprint及TEMP／TMP型別／長度／hash均不變。未改persistent環境、PATH、registry、pagefile、BCD、服務或讀憑證。

## 交接與發布邊界

T03–T09未啟動；沒有正式WAV parser／JobController／產品完整雙語MVP。GitHub URL／PUBLIC／commit、hosting均NOT_RUN，首頁未改。decoder53,707,539 bytes超過Cloudflare單資產25MiB；production同源分塊loader／build／live仍待後續整合，20MiB wire chunk Node preflight不能當hosting完成。

下一步先在既定候選／依賴範圍處理原生記憶體峰值，保留本次失敗證據。若有可審查修正，再建立新的append-only驗收記錄並排他重跑受影響完整T02；不得放寬1.5 GiB門檻、用較大RAM掩蓋、默換模型／遠端API或略過Edge／三輪／取消／全零／離線。必要gate全部PASS才可推進後續MVP。既有合法範圍內實作與來源發布授權不需重問。

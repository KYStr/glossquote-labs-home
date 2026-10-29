# U09 容量核心與原生可行性 gate

日期：2026-10-13。任務：U09-TARGET-SIZE-GATE-20261013。狀態：**READY_FOR_PRIMARY_GATE**；本 gate 寫入權及媒體量測名額交回主代理。新版容量產品 UI 尚未放行，沒有 source publication／部署／外部驗收。本輪 Sol/max 為請求配置，後端身份 **UNCONFIRMED**；未委派。

## 實作與固定界線

- `public/js/core/target-size.mjs`：`normalizeTargetSize(raw,unit)` 回 `{ok:true,value:bytes}` 或 TARGET_SIZE_INVALID；unit 必須明確為 kB=1000、KiB=1024、bytes=1。raw ≤16，僅去除 ASCII 首尾空白後的1–8位ASCII正整數；乘積exact 1..10485760。缺失／未知unit拒絕。`normalizeTargetBytes(raw)` 是明示bytes wrapper。
- `qualityCandidates(Q)` 回 Result(array)：Q須number整數1–100；[Q]接固定列表中嚴格較小者；Q85九次、Q99/100十二次、Q1一次，不clamp、不二分、不假設容量單調。
- `image-session.mjs` 唯一 owner 加 `settings.targetEnabled`（false）、`targetRaw`（空）、`targetUnit`（kB）；預設選單狀態由session設定，parser不猜缺失單位。切unit不修改raw；target关闭忽略草稿；clear／select重置此三項。update成功即失效URL/metrics，不自動編碼。
- `snapshot.target` 是啟用時的bytes Result，關閉為ok/value:null。`snapshot.metrics` 僅數字／null：attempts/minBytes/minQuality/lastBytes/lastQuality/elapsedMs/targetBytes；取消／clear／改設定清空。不保存候選Blob陣列。
- 目標JPEG/WebP由同一bitmap和凍結dims/settings串行編碼；第一個Blob.size≤exact target才建一個URL。失敗候選丟棄，不改尺寸/MIME；PNG一次；WebP→PNG停止品質搜尋，保留FORMAT_FALLBACK，按PNG真bytes判成功／TARGET_NOT_MET。
- 每job最多一個30秒timer；`clock/setTimer/clearTimer`可注入，production使用performance.now/setTimeout/clearTimeout。到期即ENCODE_TIMEOUT、无結果、保留source/settings。取消即ready，clear即idle；generate promise可由interrupt立即結束，不等待原生toBlob停止。
- export canvas帶jobId所有權；只有仍current的job才清理。遲到A不能清B、建URL、覆蓋B或排下一候選。每candidate出口縮1×1後才排下一個。
- 原GQ-01 integer half-up、header/8192/12MP/10MiB、4000/8MP、不放大/1px、EXIF1–8、alpha／JPEG白底、WebP能力gate及actual MIME命名均保留。產品app/HTML/CSS/locales、dimensions/header/output、package/依賴/發布副本沒有手改。

## 實際命令與結果

Node **v24.14.0**，Windows 11 Home **10.0.26200 / 26200 / 64-bit**；瀏覽器為本對話專用Codex IAB，actual Google Chrome／Chromium **155.0.8059.40**，UAData Windows/x86/platformVersion19.0.0。是原生Canvas/createImageBitmap/toBlob，不是Node fake Blob。

| 命令／操作 | 結果／退出碼 | 證據檔 |
|---|---|---|
| node --test test/target-size.test.mjs test/session.test.mjs test/output.test.mjs | 初次20/20 PASS，exit0 | focused-first.txt |
| 補缺失unit與timer競態回歸，同聚焦命令 | 19/20，exit1；唯一FAIL為缺失unit被預設kB，timer競態PASS | focused-boundaries-before.txt |
| 主代理補充：Blob已ready，再讓timer在continuation前執行 | 19/20，exit1；generate=CANCELLED而snapshot=ENCODE_TIMEOUT，確實復現 | focused-timer-race-before.txt |
| npm.cmd test（兩項修正後最終） | **36/36 PASS**，exit0，無skip/cancel；原22＋新14 | test-final-3.txt |
| npm.cmd run check（最終） | PASS，exit0 | check-final-3.txt |
| node scripts/verify-small-image-domain.mjs | **443040/443040 PASS**，exit0；dimensions未變，重用結果 | domain-final.json |
| npm.cmd run build（最終） | preview noindex，14 public source，exit0 | build-final-3.txt |
| npm.cmd run fixtures | prepare14 source後127.0.0.1:5189持續服務 | task-owned exec session6504 |
| node scripts/prepare-browser-tests.mjs（最終） | 14 source，exit0 | prepare-final-3.txt |
| 專用test UI操作 | **15/15 gate cases＋兩個原生下載重讀PASS** | native-gate.json |

原生重量輸入均明確指定unit=bytes。收尾兩項修正：parser拒絕缺失unit（session.update unit=undefined亦零encode）；job記錄終止reason，Blob已settle但timer早於continuation的排程亦返回ENCODE_TIMEOUT，與snapshot一致。原生encoder／尺寸／品質／明確單位／所有權清理輸入未變；依主代理指示重用15-case舊hash量測，**最終整個harness沒有重跑**。native-tested-inputs.json保留當時module/fixture hash，gate-manifest.json列最終hash及差異；兩個新增邊界由最終36測試驗證。主代理另回報Edge重選受fileURLs extension權限限制為NOT_RUN、其harness final FAILED（個案PASS／cleanup0另存）；沒有擴權或改稱全PASS。本對話IAB兩檔真重選PASS是分開的既有證據。此處未跑正式release build／deploy；preview與既有live GQ-01版本分開。

## 真實codec與受控callback分層

800×600確定假噪聲PNG：seed19c0ffee，**1,652,484 bytes**，小於10MiB。每格式先獨立量全部9候選準備target，這9次不算session的attempts。完整q/bytes/dims/preparation時間與session每candidate編碼時間保存在native-gate.json。

| 格式 | q85 bytes | q80 bytes＝target | 本次session | decode／native file | 耗時 |
|---|---:|---:|---|---|---:|
| JPEG | 343827 | 306167 | q85、q80，2attempt | 800×600、306167 bytes | 45.0ms |
| WebP | 362618 | 326866 | q85、q80，2attempt | 800×600、326866 bytes | 191.1ms |

兩個結果以真正download按鈕原生落盤，再经原生filechooser選回同一測試頁；File bytes/SHA-256對原結果相同且createImageBitmap解碼800×600。JPEG SHA-256 `bb36885484c58b6a3a665f71f61299d2ebb23e7d99270624de21181388b38358`；WebP `86bfb46823232988ea01979e4aaf806cda8c7a5f1c50c2d6ccbd7ee40d258a36`。專用證據存native-800x600.jpg/.webp，不讀其他Downloads檔。

- 4000×2000合成幾何PNG **158774 bytes**；q99/target1：JPEG12attempt、**TARGET_NOT_MET**、1024.3ms；WebP12attempt、TARGET_NOT_MET、6330.5ms。均無URL、來源/dims保留，清除後全0。實測JPEG最小48628/q1，WebP最小16472/q99而q1為16724，確有非單調容量；沒有因此跳過候選。
- PNG實際S=**2653 bytes**：S成功，S−1失敗；每個target只1attempt、品質不傳。PNG alpha=0／128；WebP alpha=0／128；JPEG透明中心RGBA=[255,255,255,255]。各ordinary關閉target路徑仍一次編碼。
- WebP→PNG是**明示toBlob MIME替換**，實際仍用原生PNG encoder；S成功.png／fallback，S−1 TARGET_NOT_MET／fallback／无URL，每target1attempt；不是原生WebP不支援的實測。
- EXIF1–8在新target PNG路徑全數真解碼／真編碼，5–8由640×480換為480×640，角落順序全PASS。舊完整fixture程式保留；新target22×11→15×8由Node每候選＋unchanged443040 oracle覆蓋，既有GQ-01正式原生證據保留為歷史。
- 30秒：真單一timer，原生JPEG在14ms完成但**明示延遲callback**；observed **30013.7ms**回ENCODE_TIMEOUT，零URL/timer/出口，來源保留；晚callback不得成功。30秒是deadline比較值，13.7ms是實際事件迴圈投遞延遲，沒有宣稱OS硬即時終止toBlob。
- A候選2完成原生編碼但callback受控延遲；**實際CUA點擊**cancel，到handler同步ready0.6ms、下個畫面ready **3.6ms**。B出口仍800×600時交付晚A與重放A timer，Bcanvas未釋放、A無候選3/URL、B後續真成功。clear實際點擊handler到idle0.6ms、下畫面 **1.7ms**。這些量測是test控制項事件到下一requestAnimationFrame，非尚未放行產品UI的測量。
- 真JPEG重試10次source/generate/clear生命週期全部PASS。所有session最终activeURL/bitmap/export/timer=0，max來源bitmap1、maxjob timer1，所有出口1×1。pagehide用實際dispatch的test-page事件驗clear（非物理navigation/BFCache矩陣）。下載proof另有明示fixture暫存，finalize后proof URL/timer/Blob也全0。引用計數不代稱原生GC／heap plateau。

## 可直接重用的入口與固定交接

- **http://127.0.0.1:5189/product-tests.html**：本任務fixture server6504保留供主代理重用；無當前編碼／timer或待辦。需要全run時先reload讀最終source，點「Run native capacity gate」；自動部分含真30秒等待。
- 自動完成後點「Stage candidate-two cancellation」→看到候選2waiting后立即「Cancel target A」→「Measure clear feedback」。再「Download gate JPEG／WebP」，各自用「Verify downloaded JPEG／WebP」選本次原生檔，最後「Clear proof artifacts and finalize gate」。所有是test-only入口；主代理可重用已通過同輸入證據，不必再run重量部分。
- /browser-fixtures.html仍是原合成器；原「Run product browser cases」與兩語選項保留，無新target產品欄位。
- 本機固定source ZIP／SHA、source/test各檔hash與7-file runtime/test diff由專用gate-manifest.json、gate-source.zip、gate-runtime.patch記錄；它們是私人gate快照，沒有Git commit／PUBLIC新來源或hosting更新。現有正式GQ-01版本170d77b不被改寫。
- 實際手改10檔：target-size core、image-session、target-size.test、session.test、product-tests.mjs/html、browser-fixtures.mjs、TASKS、HANDOFF、本報告。test/product-fixture与dist僅既有script生成。原protected app/HTML/CSS/dimensions/header/output及scripts/依賴的hash比對見manifest。

## 未驗／風險／待決

沒有新增權限、成本、依賴或產品選擇待決；主代理需要决定此gate是否放行下一UI milestone。未放行前不續做UI／來源公開／部署。36 Node／15 native是此gate的PASS，不是完整新產品PASS或外部驗收。

NOT_RUN：target產品雙語UI／全鍵盤／320px／200%／正式下載流程；真機mobile/touch／screen reader／其他引擎；原生memory/GC／完整Network/Storage/物理離線／完整OS picker/save键盘；完整新版正式站EXIF/codec矩陣。既有人工例外維持，原有舊版UI/封包/外部通過不當作新版新測。原生toBlob可能在取消後繼續底層運算；本頁只失效job與釋放可控資源。候選清單首個合格結果不等於最佳或最高可能畫質，達不到容量不偷偷降尺寸或轉JPEG。

長工作前後persistent environment完整fingerprint、PATH hash/type/length/ephemeral與TEMP/TMP均比對；最終證據environment-after.json/environment-comparison.json。未更動任何持久環境或他人程序。固定快照完成後釋放所有產品寫入權與媒體量測名額；fixture server保留僅供主代理讀取／重用。

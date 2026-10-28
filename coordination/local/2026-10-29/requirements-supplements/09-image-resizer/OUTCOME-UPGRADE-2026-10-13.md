# U09-TARGET-SIZE-GATE-20261013

2026-10-13主代理核定。使用者授權本批改善；收到實際開工訊息後由原對話01a12398-d626-7a91-b45d-8ca8881d9c29執行，請求gpt-6.1-sol/max，不再委派。沿Product App、既有設計及安全契約。以下草案中產品決策/案例採用為要求；函數命名可等價且需交接。測試案例是預期，不是新版已通過。

## 主代理的最終產品決策（覆蓋下方bytes-only UI草案）

容量輸入不能要求一般人自行換算：增加單位選單，預設kB（1 kB=1000 bytes），另可選KiB（1024）與bytes（1）。數字欄保持空白初值，只接受去除首尾ASCII空白後的1–8位ASCII正整數、raw長度≤16。乘上明確單位倍率後須在1..10485760 bytes內；以安全整數計算。不接受未知單位/小數/exponent/符號，不猜『KB』含义，不悄悄四捨五入。以實際bytes核對，UI同時顯示所選上限與exact bytes。選單/數字改變立即失效結果；關閉時忽略草稿，換檔/清除回關閉、空數字、kB。可新增normalizeTargetSize(raw,unit)→Result(bytes)；既有下方純bytes解析案例以unit=bytes執行。新增驗收：200 kB→200000；200 KiB→204800；1 byte→1；10240 KiB→10485760；10241 KiB/10486 kB拒絕；未知unit拒絕；切unit不暗改raw數值但必須重驗。

採用最多12次、總期限30秒及500ms取消回饋作本階段可行性門檻，必須量測；超時/未達標是明確失敗，不是成功。先做核心/原生gate、交回主代理驗收後才放行UI；本次派發gate不授權自行跨到UI或公開spike。當前其他媒體不啟動新量測，本工具gate擁有單一媒體量測名額。

## U09-TARGET-SIZE-20261013：有界嘗試符合圖片容量上限

### 使用者工作與交付

使用者已有表單要求的尺寸與容量，想交出符合要求的图片。現有介面有實際結果 bytes，但只能手調品質後反覆產生。新功能讓使用者明確輸入容量上限，對 JPEG／可用 WebP 做有限品質候選嘗試，保持設定好的輸出寬高；每一個候選用實際 Blob bytes 判斷。成功只表示此產物符合這個 bytes 上限，不表示畫質最佳或所有表單限制都通過。

PNG 保留透明與無損路徑：只編碼一次并核對容量，明示品質設定不能把 PNG 壓到任意大小。尺寸、格式、透明處理都由使用者選擇；容量達不到不偷偷縮小、不自動轉 JPEG、不上傳或安裝壓縮庫。

### 現況與具體接點

| 現有檔案／函式 | 實際支援與本次接點 |
|---|---|
| `public/js/image-session.mjs`：`createImageSession`、`select`、`update`、`generate`、`cancel`、`clear`、`snapshot` | 唯一 session owner 目前每次 generate 只 encode 一次。activeId 在改設定／取消／清除失效；迟到 bitmap.close、Blob 不建 URL。目標模式可在這個 owner 加串行有界候選與 metrics，不另開第二來源 session。 |
| `public/js/image-session.mjs`：`createBrowserAdapters.encode/releaseExport` | 依一次請求新建出口 canvas，JPEG 填 #FFFFFF，PNG/WebP clearRect，再從來源 bitmap.drawImage，native toBlob。Canvas 必須每個候選後释放，不能保留候選陣列或把上一張有損結果再編碼。 |
| `public/js/image-session.mjs`：`probeBrowserCapabilities` | 實際啟動 gate 不只 WebP：八方向 EXIF、PNG/JPEG、WebP MIME 探測。保留這個 gate，不能略過以開啟容量功能。 |
| `public/js/core/dimensions.mjs`：`validateSource`、`deriveDimensions` | 已修為精確整數 half-up：`floor((2*size*edge+basis)/(2*basis))`。保持此次 GQ-01 修正，不回到比例浮點 round，不在容量搜尋中更動它的值。 |
| `public/js/core/output.mjs`：`normalizeQuality`、`resolveOutput` | 品質1–100；實際MIME決定副檔名，WebP→PNG 有 FORMAT_FALLBACK，其餘錯誤组合拒絕。新增目標 parser／候選 planner 可用独立 core 模組，保留現有 resolveOutput 作每次候選 MIME gate。 |
| `public/js/app.mjs`：`render`、`drawPreview`、submit/settings handlers | busy 時 file/fields 禁用而 cancel/clear 可用。完成才顯示實際 result img、bytes、下載；任何 update 使舊 URL 失效。目標欄、真實候選計數及未達上限說明從 session snapshot render。 |
| `test/session.test.mjs`、`test/product-tests.mjs` | 已有假 adapter A/B 晚回覆、null、fallback、clear/cancel；瀏覽器 fixture 真 codec/EXIF/alpha、URL/bitmap所有權計數與 mock 明示。新增容量案例沿這兩套，不用 Node Blob 假裝真 codec。 |

HANDOFF 最新固定 GQ-01 版本已外部結案，既有 PUBLIC/正式部署/兩語PNG/JPEG/WebP 15×8原生下載证据不改寫。該來源 `dimensions.mjs` 已是修正版；新容量版另驗，不繼承舊版結果。

### 產品設定與 UI

- 初始容量功能關閉，既有 PNG／品質85／預設最長邊1920流程保留。設定區加入可見的「設定容量上限 / Set a file size limit」checkbox；開啟後顯示「容量上限（bytes） / File size limit (bytes)」，初值空白，不猜表單要求。
- 原字串長度上限16，在去除首尾 ASCII 空白後只接受1–8位ASCII數字，數值範圍 **1..10,485,760 bytes**；空白、0、+1、-1、小數、1e5、Infinity、全形數字、超長、超上限都回 `TARGET_SIZE_INVALID`。不接受自動四捨五入或默默 clamp。此是新增產品設定上限，不等於瀏覽器能力或所有格式輸出上限。
- 原 bytes 仍為準，KiB 只輔助顯示。提示可列「200 kB＝200000 bytes；200 KiB＝204800 bytes」，不把未知 KB 當作固定單位推定。目標模式關閉時容量欄不影響原操作；重新開啟可保留本頁欄位文字，清除／換檔／語言切換則回關閉及空白。
- JPEG/WebP 的品質欄在目標模式名為「起始品質 / Starting quality」，仍1–100、預設85；會從該值向下試固定候選。低品質可能降低細節，不能稱「最佳品質」或「找到最高可能品質」。圖片实际结果可供檢查，合格才提供普通下載。
- PNG：品質欄仍隱藏且不生效；提示「PNG 不透過品質調整容量，只會產生一次並核對上限；超出時可自行縮小尺寸或選其他格式」。目標PNG按鈕「產生並核對容量 / Generate and check size」；JPEG/WebP目標按鈕「嘗試壓到容量上限 / Try to meet size limit」。未開啟仍為「產生圖片」。
- 成功顯示实际格式、寬高、exact bytes、上限bytes、嘗試次數、实际候選品質（JPEG/WebP時），並以文字標「符合容量上限」。大致KiB與省下比例不能代替exact bytes；不新增預估KB或畫質比較分數。
- 未達上限顯示「已嘗試 N 次，最小實際结果 X bytes，仍超出 Y bytes。可自行降低尺寸或選其他格式後再試」。沒有success、沒有可下載URL、沒有來源圖冒充結果。只保留最小bytes/品質等數字供說明，不保存失敗候選 Blob。這輪不增加未達標下載的旁路。

桌面只在原設定欄增加這一組，來源／實際結果 canvas 仍主導。手機依既有單欄工作順序，bytes欄、格式透明說明及未達標結果不能折疊到看不見。

### 可執行演算法、上限與取消

擬新增 `public/js/core/target-size.mjs`：`normalizeTargetBytes(raw)` 回 Result；`qualityCandidates(Q)` 接受已驗證整數1–100，產生下列确定降序、去重列表：

```text
BASE = [100, 95, 90, 85, 80, 70, 60, 50, 40, 25, 10, 1]
candidates(Q) = [Q] + BASE 中嚴格小於 Q 的值（原降序）
Q=85 -> [85,80,70,60,50,40,25,10,1]（9次）
Q=99 -> [99,95,90,85,80,70,60,50,40,25,10,1]（12次）
Q=1  -> [1]（1次）
```

一次目標工作 **最多12次編碼，串行且同一job不重疊；總期限30秒**。30秒是本輪提議的可測產品上限，未宣稱目前測過或所有裝置達得到。PNG只有1次。普通容量模式關閉的generate不改成品質搜尋。

1. 先對當前來源、輸出尺寸、格式、品質、容量欄做原/新 gate。驗證失敗不 encode。啟動時同步失效所有舊輸出，固定本次不可變設定快照、dims、bitmap owner、target、候選；遞增 activeId，進 encoding。只保存數字metrics，不保存候選Blob陣列。
2. JPEG/WebP 每個候選都從同一來源 bitmap、同一寬高、同一選定 MIME 編碼，品質 `q/100`；JPEG白底與PNG/WebP alpha規則不變。不能累積再壓上一個結果。
3. 每個 await 前後與建URL前都檢查 activeId/current job 及30秒期限。先確認仍為當前job，才调用当前出口canvas释放，避免迟到A释放B的canvas。每個完成候選的export canvas縮為1×1，然後才開始下一候選。每一候選 `Blob.size` 必須為正的安全整數、MIME經`resolveOutput`通過；null/空Blob/非法MIME立即 `ENCODE_FAILED`，不繼續盲重試。
4. 用实际 `blob.size <= targetBytes` 精確比較，不比較顯示後的KB，不要求size隨品質單調。**第一個合格的候選**成為結果，清timer、释放canvas、仅為此Blob建一個URL，status success；說明它是這個候選列表中的第一個合格結果，不宣稱其他未測品質不可能更好。
5. 候選不合格時記錄attempt count及目前最小bytes/對應q，丟掉該Blob，不建URL。不使用二分搜尋，也不根據預估容量跳過候選。跑完列表仍超限回 `TARGET_NOT_MET`，output=null，保留來源／設定可編輯；會產生圖片但不符合容量不能假成功。
6. PNG編碼一次後走同一MIME/bytes gate：若符合可下載PNG，超限TARGET_NOT_MET並顯示PNG限制。WebP若實際回PNG，立即停止品質候選（PNG沒有可搜尋的品質）。按實際PNG bytes判斷；合格才以.png顯示fallback與符合上限；不合格則同時提示fallback及未達上限，无URL。不重試同一PNG12次，不自动改JPEG。
7. 目標模式一個job只有一個30秒timer（測試注入單調clock/timer）。期限到回 `ENCODE_TIMEOUT`，失效该job、释放本頁出口canvas與結果、保留來源／設定、恢復可編輯；迟到Blob丢掉。结束／取消／清除／換檔／pagehide取消timer，过期timer不得影響B。即使Blob合格，超時或過期也不得发布。
8. 沿原取消：checking/decoding取消回idle、迟到bitmap.close；encoding取消回ready並保留來源與所有當前設定，清结果、metrics及出口canvas，迟到Blob丢棄。不能說原生toBlob已立即终止。取消后B可依既有行为開始；A的迟到回覆不启动下一候選、不建URL、不改B、不释放B资源。
9. 既有控制門檻：encoding/checking/decoding時設定/選檔禁用，取消與清除可用；不建立自動重試或待辦queue。改尺寸/格式/品質/目標/checkbox均失效旧下载、旧metrics与timer。新來源前close舊bitmap，不並存兩個12MP來源。
10. 原上限全保留：一檔、非空、10MiB、static PNG/JPEG、header尺寸每邊8192且≤12MP；先header gate後decode；EXIF鏡像八方向；輸出每邊1–4000、≤8MP、不放大、等比例精確half-up；預覽最長邊≤1000、不按DPR放大；WebP能力gate、實際MIME副檔名及原固定檔名。无裁切/批次/WebP輸入/HEIC/SVG/印刷DPI/metadata保證。

### 第一里程碑：容量可行性 gate，通過後再接產品UI

原圖片對話首先擁有 `U09-TARGET-SIZE-GATE-20261013`。先在 core/session 與明示test入口實作以上有界策略和測試，不公開容量UI、不推送/部署此spike。此不是只加數字比較：gate必須在真encoder證明至少一個JPEG、可用WebP合成案例由較低候選取得符合target的產物。

gate交付：純測試結果、實際瀏覽器完整版本/OS、每個候選q/bytes/寬高/格式、總耗時、取消後状态與URL/bitmap/canvas/timer計數、失敗／未驗項；不記私人檔名或圖片。原`test/browser-fixtures`只能合成幾何/确定假噪聲與alpha图。

精確gate：

- 800×600合成PNG（確保≤10MiB），測JPEG及可用WebP。先测q85与候選列表的實際bytes，選一個 **小於q85产物但至少一个较低候选能符合** 的整数target。從产品session以同設定生成；必須真正嘗試至少2个q、尺寸800×600不变、輸出bytes≤target、实际decode成功。測資準備的编码與工作attempt分開記錄，不把模拟Blob當原生結果。
- 4000×2000、≤10MiB的合成幾何圖，以q99/target1驗最多12次及30秒期限。允许明确的TARGET_NOT_MET或ENCODE_TIMEOUT；不得成功、無URL、保留尺寸/來源可改。時間上限是失敗邊界，不是減低8MP输入支持；不能将timeout改假成功。
- 在已開始候選2的待回覆狀態取消A、再啟動B；以明示延遲callback測A晚到。使用者取消／清除的事件在原對話實測窗口内500ms内呈現ready/idle（量測提案，沒有現有PASS）；A不再encode候選3、不建URL、不影響B。原生處理是否立即結束不在可保證範圍。
- 成功、失败、超時、取消、clear及pagehide的本頁计数：完成只一个结果URL，设置更新/clear后0；失败/取消/超时0结果URL；clear后0來源bitmap及所有canvas1×1；当前job最多一个timer且结束后0。原有10次资源生命周期与native memory/GC人工gate保留；计数证据不等於原生内存测量。
- PNG透明/半透明、JPEG白底、WebPalpha与FORMAT_FALLBACK，至少用真实codec复驗本轮會受影响的输出路径；EXIF原完整test矩阵与尺寸精確回歸保留，不绕过能力探测。

通过后主代理依据证据放行 `U09-TARGET-SIZE-UI-20261013`，原图片对话沿完整規格接雙語UI、更新教學/限制/FAQ，再做完整候选gate。若不能在原资源／响应界線内提供有用重試，停止该gate并交测量、具体原因与下一决策；不能把「只比较容量」改叫自动压缩已完成，也不能自行加依賴/Worker框架/云端或改上限。主代理安排此媒體gate序列，不与既有视频/逐字稿重测并行。

### 精確驗收案例

| ID | 種類／輸入 | 精確預期 |
|---|---|---|
| U09-01 | A，目标`1`、`200000`、` 204800 `、`10485760` | 成功整数1/200000/204800/10485760；不得以KiB取整回推判斷。 |
| U09-02 | A+B，空/0/10485761/+1/-1/1.5/1e5/NaN/全形200/17字元 | TARGET_SIZE_INVALID；目标启用时无旧结果、generate不可用且0 encode；关掉目标时原普通输出仍可用。 |
| U09-03 | A，Q85、99、100、1及外部非法Q | 列表完全等於上述定义；100与99最多12、85为9、1为1；範圍外/浮點/字符串拒絕、不clamp。 |
| U09-04 | A，JPEG Q85/target200000；fake sizes q85=300000、q80=250000、q70=199999 | 调用q=.85/.80/.70，exact相同dims；第3次success，output bytes199999/quality70、只建1URL、不试q60。假Blob明确只验session。 |
| U09-05 | A，首候选bytes=target；另例bytes=target+1 | 相等即success；+1不能success，继续下个候选，显示四舍五入KiB相同也不得通过。 |
| U09-06 | A，85列表所有结果>target，含size不随q单调 | 正好9次，TARGET_NOT_MET/无URL；min metrics為实测最小值，不靠单调假設提前停止、不称最佳品质。 |
| U09-07 | A+B，PNG在目标模式，各实际blob size S，目标S和S-1 | 两种仅1encode、PNG不传quality；S成功、S-1失败，透明仍保留，不改变尺寸、不改JPEG。 |
| U09-08 | A+B，WebP请求实际PNG，目标分别满足/不满足 | 每job只有1次；符合为.png/fallback/实际bytes；不符TARGET_NOT_MET/fallback/无URL。不能叫.WebP或继续品質循环。 |
| U09-09 | A+B，第二候选null、0bytes、requested PNG→actual JPEG／requested JPEG→actual PNG／requested WebP→actual JPEG、encoder抛錯 | ENCODE_FAILED/无URL/停止后续候选，安全中性文案，不曝底层例外；WebP→PNG的合法fallback另按U09-08。 |
| U09-10 | A+B，候选2取消A，B先成功，A最晚回覆；decode时cancel | A不再排下一候选、不建URL、不释放B出口、不覆盖B；encode cancel保留来源/设置回ready；迟到decode bitmap关闭、idle。 |
| U09-11 | A+B，注入deadline，29.999秒有效回覆／30秒timer先到后再回覆 | 前者可在<=target且job当前时成功；timer先到后ENCODE_TIMEOUT/无结果/0timer，晚回覆不得恢复成功。迟到A timer不影响B。 |
| U09-12 | B，真实800×600 JPEG/WebP重试gate | 至少2次品质，输出exact bytes≤target，MIME及decoded800×600正確；native下载文件length等于UI exact bytes，实际文件decode成功，不固定跨浏览器文件bytes。 |
| U09-13 | A+B，22×11來源Width15，新模式每个候选；原其他邊界 | 始終15×8，保留GQ-01精确公式与回归；容量搜索不更改尺寸、放大/超像素都拒绝。 |
| U09-14 | B，transparent源PNG/WebP/JPEG，EXIF八方向fixture | PNG/WebP中心透明alpha=0、半透明原容许范围；JPEG白底通道≥250且alpha255；EXIF5–8宽高交换、角落顺序正确且不双旋转。 |
| U09-15 | A+B，success后改target/checkbox/Q/format/size，clear/新檔/pagehide；10次生命周期 | 旧下载、URL、metrics立即失效；不会自动encode；最终所有本页源/出口/URL/timer引用清理。native GC/內存结果如实保留，不由JS计数代称。 |
| U09-16 | B，双语全键盘与320px/200%，运行中cancel/clear，Network/storage | 新目标欄/错误/未達標說明可達，无遮住取消；没有新上传/存储/外部资源。native picker/save、读屏、实机未测项逐项记录。 |
| U09-17 | A+B，关闭目标、原普通PNG/JPEG/WebP生成 | 原1次编码流程、初始设置、真实MIME／命名／下载与旧错误行为保留，不把普通模式也改成品质搜索。 |

### 建議允許檔案與實際命令

gate的原對話手動路徑限 `tool-projects/09-image-resizer/` 下：`public/js/core/target-size.mjs`（新增）、`public/js/image-session.mjs`、`test/target-size.test.mjs`（新增）、`test/session.test.mjs`、`test/product-tests.mjs`、`test/product-tests.html`、`test/browser-fixtures.mjs`、`test/fixtures/image-builders.mjs`、`docs/TARGET-SIZE-FEASIBILITY-2026-10-13.md`（新增）、`docs/TEST-RESULTS.md`、`docs/COMPATIBILITY.md`、`HANDOFF.md`、`TASKS.md`。`test/product-fixture/**` 是已存在prepare腳本的生成副本，不手改。

gate通過後的UI里程碑才加：`public/js/app.mjs`、`public/js/locales/zh-Hant.mjs`、`public/js/locales/en.mjs`、`public/index.html`、`public/en/index.html`、`public/styles/app.css`、`test/output.test.mjs`、`test/scaffold.test.mjs`（仅相关DOM契约）、`PRODUCT.md`、`TECHNICAL.md`、`ACCEPTANCE.md`、`UX-SEO.md`、`README.md`、`docs/RELEASE-CANDIDATE.md`、`docs/PUBLISH-MANIFEST.json`。`dist/**` 只能既有build生成。源dimensions/header不属手改范围，原有其测试/oracle照跑。

實際 `package.json`：dev=`node scripts/serve.mjs`、test=`node --test test/*.test.mjs`、check=`node scripts/check.mjs`、build=`node scripts/build.mjs`、verify:release=`node scripts/verify-release.mjs`、fixtures=`node scripts/prepare-browser-tests.mjs && node scripts/serve-fixtures.mjs`。依赖为0，Node≥24，无npm install。

该工具CWD逐條命令；新增target test存在後才可執行其聚焦命令：

```powershell
node --test test/target-size.test.mjs test/session.test.mjs test/output.test.mjs
npm.cmd test
npm.cmd run check
node scripts/verify-small-image-domain.mjs
npm.cmd run build
npm.cmd run fixtures
npm.cmd run dev
```

实际dev预设 **4189**，fixture预设 **5189**，均127.0.0.1；不可依旧TECHNICAL的4173/4174字样猜。serve支持`--port=0`与占用默认port时退到随机loopback，需读真实stdout URL。fixture `/product-tests.html`（实际产品同源生成副本）、`/browser-fixtures.html`（合成器），双语选择后以真浏览器运行。所有test入口不入build，不延伸到仓库父目录；停止仅本任务新起的已识别disposable server。

候选生成与既有release verifier在主代理排程下执行：

```powershell
npm.cmd run build -- --release --site=https://images.glossquote.com
npm.cmd run verify:release
```

check掃描允許目錄現有mjs及引用，新增core會被納入，不需改package或放寬危險API檢查。`verify:release`有实际loopback GET/MIME/404与inventory，不能拿它代称公网已部署。

風險／停止：原生toBlob不能立刻中止、编码尺寸/品质/alpha/耗時依實測browser而異；候选列表不是最優品質搜尋。遇响应/所有权/late callback/清理gate失败，停于U09 gate，交真实证据给主代理，不扩大任务。需要新压缩依赖、改变上限、自动缩图/转JPEG、移除透明/EXIF资源gate均要另作范围决定；本規格不授权这些改变。


## 原owner交付與停止契約

先讀根/工具AGENTS、current HANDOFF與實際code/修改。只改本文列明本工具public/test/spec/docs及任務紀錄，相關新增focused tests可新增；check精確資產清單若確有必要只做最小更新與回歸，不降低安全限制。可寫本工具.runs/09-image-resizer-outcome-2026-10-13/與既有獨立reviewed發布副本；不得動他工具/首頁/共享狀態、讀憑證/deploy/改持久Windows環境。所有build/test前後執行check-persistent-environment.ps1並核完整Environment不變；只假資料，無新runtime依賴。

先只交gate程式、Node測試、原生codec/取消/資源證據，不push未放行spike；主代理通過後另發UI里程碑。

完成回覆原對話供主代理實際收取：任務ID、改檔/行為、命令exit與結果、未驗項/風險、候選來源與ZIP（gate沒有就明示）、真實本機URL、是否釋放寫入權。新版待主驗/發布/外验，不繼承舊通過；新權限/成本/依賴/範圍衝突或兩輪同因無進展就保存重現並具體停止回報。不得自動下一milestone、改模型或重開對話。

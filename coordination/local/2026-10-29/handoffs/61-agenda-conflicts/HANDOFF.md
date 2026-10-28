# 多軌議程衝突檢查 — B20-61-M1 交接

2026-10-23（Asia/Taipei），版本 `0.1.0-m1`。M1 實作與 Node 工具鏈已通過，交主代理獨立複驗；不是正式產品驗收完成，也尚未進入外部覆核。原初始紀錄為「規格已準備，尚未實作／驗收／公開／部署」，本次新增實作與以下證據。

## 結果與實際範圍

完成空白起始的繁中與英文候選：建立／編輯／移除房間、講者及場次，嚴格同日 HH:mm、index 資源選取、0–120 分鐘設定、完整配對、合併重疊原因、方向明確的轉場不足、未指派覆蓋、房間／講者／完整場次時間表，以及固定名稱 UTF-8 TXT／JSON。來源不會自動改排。200 場逐對比對，共 19,900 pairs。

本地 module Worker 每批最多512 pairs並 yield；主執行緒綁 generation，取消／修改／清除／pagehide 會 terminate、遞增 generation、撤銷 Blob URL 及清掉結果引用。Blob 只由明確下載按鈕建立；超過兩檔合計 2 MiB 整批拒絕。清除採頁內確認。沒有帳號、套件依賴、外部資產、資料儲存、資料上傳、URL 資料或原生對話框。

變更僅本工具：新增 `.gitignore`、`package.json`、`TASK-ENTRY.md`、8個 `public/**`、6個 `scripts/**`、6個 `test/**`；更新本 HANDOFF；生成8個 `dist/**` 與 `evidence/m1/**`。初始工具資料夾尚未追蹤；以封閉來源清單和13份不變規格的 hashes 驗證範圍，不用空白 Git diff 冒充審核。未改兄弟工具、共享首頁／看板、GlossGate 或其他既有變更。

來源位置：

- `public/index.html`、`public/en/index.html`、`public/styles/app.css`：完整 SEO/FAQ、雙語表單與狀態、noindex預覽、同語系首頁連結、Compact顯式頁籤。
- `public/js/core/{validate,analyse,output}.mjs`：有界驗證、完整 i<j 演算法、穩定議程、schema1與原子大小限制。
- `public/js/{app,conflict-worker}.js`：真實 Worker 接線、編輯與結果畫布、generation/取消/下載/清理。
- `scripts/{files,check,build,serve,write-evidence,freeze-candidate}.mjs`：封閉allowlist、靜態及語法檢查、preview建置、loopback dev、獨立輸出與固定來源證據。
- `test/{fixtures,validate.test,analyse.test,output.test,lifecycle.test,toolchain.test}.mjs`：離線合成資料、明列oracle、大小與失效產物、工具鏈負例。

## 實際命令

所有 npm 命令以既有 `C:/Program Files/nodejs/node.exe` 執行既有 `C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js`；未 npm install、未改 PATH。check 的 Node child 明定 `shell:false`、`windowsHide:true`。

|命令|exit|實際結果／證據|
|---|---:|---|
|`node --version`|0|`v24.14.0`|
|第一次 `npm test`|0|83 tests / 83 pass / 0 fail / 0 skipped；[完整初測](evidence/m1/test-attempt-1.log)|
|最終 `npm test`|0|83 tests / 83 pass / 0 fail / 0 skipped；[完整最終測試](evidence/m1/final-test.log)|
|最終 `npm run check`|0|8個公開資產、2個完整雙語noindex頁、ESM/安全靜態檢查；[log](evidence/m1/final-check.log)|
|最終 `npm run build`|0|8個資產、79,829 bytes，`dist/`與`public/`逐位元組相同；[log](evidence/m1/final-build.log)|
|`node scripts/write-evidence.mjs`|0|2語4份真實報告，全JSON與手寫expected深度相等、TXT的pair/方向/bytes驗證；[log](evidence/m1/final-artifacts.log)|
|`node scripts/freeze-candidate.mjs capture-contracts`|0|13份唯讀規格／docs基準清單；[基準](evidence/m1/contracts-before.json)|
|Windows environment guard（正確wrapper前／後）|0 / 0|PASS；完整Snapshots完全一致；見下表|

凍結命令 `node scripts/freeze-candidate.mjs freeze` 會再次確認13份契約與完整環境快照、所有來源 bytes/SHA-256、8個 dist/source位元組；成功結果與來源digest見 [candidate-manifest.json](evidence/m1/candidate-manifest.json) 及 [final-freeze.log](evidence/m1/final-freeze.log)。本文件先寫定再凍結，manifest包含本文件，避免自我hash循環。

歷史保留：[attempts.md](evidence/m1/attempts.md) 記錄最初 guard wrapper 因未初始化 LASTEXITCODE 而 exit 1；當次 guard JSON 本身 PASS，修正 shell 結果變數後 exit0。沒有隱藏測試失敗或以跳過冒充通過。

## ACCEPTANCE 逐項對照

|ID|結果與範圍|對應證據|
|---|---|---|
|A01|PASS_NODE：唯一 `[A,B]` room_overlap、無speaker/transition|analyse.test；輸出手寫oracle|
|A02|PASS_NODE：相接不重疊；不同房同講者 gap0/required10 一筆warning|analyse.test；實際兩語報告|
|A03|PASS_NODE：同房相接 conflicts/warnings空|analyse.test|
|A04|PASS_NODE：gap9提醒，gap10不提醒|analyse.test|
|A05|PASS_NODE：speaker_overlap一筆，不重複transition|analyse.test|
|A06|PASS_NODE：房間＋講者理由合併一筆|analyse.test|
|A07|PASS_NODE：完整 A-B/A-C/B-C，只報巢狀A-C|analyse.test|
|A08|PASS_NODE：兩位共同講者只一筆warning、registry排序|analyse.test|
|A09|PASS_NODE：兩維unassigned精確；TXT有不能判定文案，完整場次保留|analyse/output.test|
|A10|PASS_NODE：缺房不推算轉場，仍保留coverage；已知speaker重疊可檢|analyse.test|
|A11|PASS_NODE：00:00–23:59 → [0,1439)|validate.test|
|A12|PASS_NODE：非法時刻、最後換行、零長度／跨午夜皆整份拒絕|validate.test|
|A13|PASS_NODE：200/20/100/5邊界接受；各自超限拒絕、不遍歷超限members|validate.test|
|A14|PASS_NODE：ID／NFC+trim名稱／同場speaker重複與未知ref皆拒絕|validate.test|
|A15|PASS_NODE：0/120接受，121/非整數拒絕；0門檻無轉場warning|validate/analyse.test|
|A16|PASS_NODE_OUTPUT_STATIC_DOM；JSON/TXT保留script-like文字；程式使用textContent且靜態檢查禁止unsafe DOM。真實DOM執行未驗|output/toolchain.test；browser NOT_RUN|
|A17|PASS_NODE：200個相接一分鐘場，19,900個唯一pairs，無overlap|analyse/lifecycle.test|
|A18|PASS_NODE：共享原子byte gate於2,097,152 bytes接受、2,097,153拒絕；serializer整合與合法超限200場另驗；舊artifact不可保留|output/lifecycle.test|
|A19|PASS_NODE：A-B雙理由一筆，A-C僅T的speaker_overlap，B-C無issue|analyse.test|
|A20|PASS_NODE_CONTROLLER_SCHEDULER：512 pairs取消、同步terminate呼叫、晚到message/error/messageerror不更新或建Blob、來源保留。真Worker仍未驗|lifecycle.test；browser NOT_RUN|

額外有獨立 minute occupancy oracle、反向時間排序、unused registry／schedule穩定排序、完整JSON roundtrip、兩語全部驗證錯誤碼、download-only URL建立與revoke、未知／過期dist保留拒絕、junction／traversal、完整title/description/H1/robots/語言/資產/ARIA反例。顏色tokens的數值對比通過不等於渲染後無障礙驗收。

## 實際產物與固定來源

全為合成資料；[輸入](evidence/m1/outputs/synthetic-input.json) 及 [手寫expected](evidence/m1/outputs/independent-expected.json) 可對照：3 pairs，A-B場地重疊、A→C轉場0/10，無其他issue。

- 繁中：[修正清單 TXT](evidence/m1/outputs/zh-Hant/agenda-conflicts.txt)、[完整 JSON](evidence/m1/outputs/zh-Hant/agenda-conflicts.json)。
- 英文：[correction TXT](evidence/m1/outputs/en/agenda-conflicts.txt)、[full JSON](evidence/m1/outputs/en/agenda-conflicts.json)。
- [candidate-manifest.json](evidence/m1/candidate-manifest.json)：24個來源檔案逐檔 bytes/SHA-256、13個不變契約、8個 dist 檔案與實際報告的 bytes/SHA-256；來源綜合digest依排序清單計算，不是Git commit。

沒有另建交付ZIP；此固定候選交主代理合入唯一外層整合包。

## Windows持久環境

[before](evidence/m1/environment-before.json)／[after](evidence/m1/environment-after.json) 的完整Snapshots深度比較相等，包括PATH type/length/hash、全部Environment-key fingerprint及TEMP/TMP hashes。

|範圍|PATH type / 長度 / ephemeral count|PATH SHA-256|Environment-key SHA-256|
|---|---|---|---|
|HKCU|ExpandString / 834 / 0|`3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb`|`3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a`|
|HKLM|String / 1227 / 0|`52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8`|`a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82`|

guard原先已記錄的duplicate PATH entries前後相同；本次未改。未讀任何憑證，未改Git設定，未作來源發布，所以不需要／沒有執行發布Git guard。

## 未跑gate與剩餘限制

|範圍|狀態|待核實|
|---|---|---|
|B01 真browser建A01/A07、實際pair與取消|NOT_RUN_USER_FOCUS_INCIDENT|真DOM呈現、module Worker可用性|
|B02 320px／200%／鍵盤／真下載|NOT_RUN_USER_FOCUS_INCIDENT|渲染、focus、reflow、OS保存行為|
|B03 Network／Storage前後|NOT_RUN_USER_FOCUS_INCIDENT|真browser請求／儲存與清理|
|B04 真Worker取消／re-run／stale|NOT_RUN_USER_FOCUS_INCIDENT|瀏覽器事件與terminate實際效果|
|dev `listen`、實際HTTP/GET/HEAD|NOT_RUN_SCOPE_NO_SERVER|本次明確禁止server；pure routing/MIME/header/404/405/Host/traversal均PASS_NODE，未當HTTP PASS|
|原生dialog、實機、螢幕閱讀器|NOT_RUN_USER_FOCUS_INCIDENT|未操作使用者桌面／輸入／剪貼簿|
|公開GitHub／正式hosting／首頁|NOT_PUBLISHED / NOT_DEPLOYED|M2/M3 gate未放行，沒有production canonical／sitemap|
|外部覆核|NOT_RUN|需主代理完成必要gate後再交使用者|

本次未啟動server、browser或背景程序；沒有可移交或需要終止的本任務server，也未關閉任何既有tabs／程序。Node scheduler/controller及靜態掃描不能替代上述真實能力。未跑必要gate前不得推GitHub或部署。下一階段由主代理驗固定候選及核准M2，原功能對話再依指示處理。

## 2026-10-23 追加：B20-RP-61 / M1B 離線發布準備

最新狀態：M1B工具鏈及正式SEO靜態候選已建立，離線驗證通過，交主代理獨立核對；**不是M2放行、未公開GitHub、未部署、未加入首頁、未外驗**。預定origin `https://agenda-check.glossquote.com`、toolSlug `agenda-conflicts`，不表示網址已上線。M1歷史證據與上方命令結果保持原樣。

已完整讀取本輪精確契約 `.runs/batch20-release-prep-2026-10-23/TASK.md`，對照原check/build/serve/allowlist與測試後實作。requested仍為 `gpt-6.1-sol/max`；backend未獨立確認，本輪未切模型、未委派、未另開對話。

### 實際diff與產物

本輪來源變更9檔：

|檔案|變更|
|---|---|
|`package.json`|只新增精確的build:release/check:release；保留原test/check/build/dev、Node24 ESM、零依賴|
|`.gitignore`|新增release-artifacts忽略規則|
|`scripts/release.mjs`（新增）|固定origin與M1來源pins；正式SEO產生／獨立核對；封閉輸出、exclusive初建與只驗證重用；拒絕污染／被修改候選|
|`scripts/freeze-release.mjs`（新增）|核對本輪命令、40個保留檔、13份不變契約及完整env snapshots，產生本輪source/artifact逐檔bytes/SHA-256|
|`test/release.test.mjs`（新增）|25項發布準備測試，全部在任務copy做負例|
|`test/toolchain.test.mjs`|只把原fixture暫存根從evidence/m1移到evidence/m1b，避免本輪完整測試寫歷史證據|
|`M1B-RELEASE.md`（新增）|重現命令、站點根、候選狀態、header來源、拒絕策略與尚缺gate|
|`TASK-ENTRY.md`|追加本輪精確範圍與結果|
|`HANDOFF.md`|本追加紀錄|

另生成 `release-artifacts/site/` 11檔、81,255 bytes，與sibling `release-artifacts/manifest.json`；新證據只寫 `evidence/m1b/`。沒有修改任何public/dist/舊evidence、共用首頁、兄弟工具、原規格或產品核心。原preview來源未變，本輪沒有重跑實際preview build。

### 實際命令與數量

全部使用既有Node `v24.14.0`／既有npm CLI，沒有npm install；child使用shell:false/windowsHide:true。反例CLI只在任務copy執行，不啟動server/browser。

|命令|exit|實際結果|
|---|---:|---|
|`node --test test/release.test.mjs`（針對性初驗）|0|25 tests / 25 pass / 0 fail / 0 skipped；[log](evidence/m1b/targeted-release-test-attempt-1.log)|
|最終 `npm test`|0|108 tests / 108 pass / 0 fail / 0 skipped；原83＋新增25；[log](evidence/m1b/final-test.log)|
|最終 `npm run check`|0|8資產、2個完整noindex頁，所有scripts語法與靜態政策；[log](evidence/m1b/final-check.log)|
|最終 `npm run build:release`|0|11 site檔、81,255 bytes；[log](evidence/m1b/final-build-release.log)|
|最終 `npm run check:release`|0|重新讀來源／產物、重算bytes/metadata與SEO核對；[log](evidence/m1b/final-check-release.log)|
|環境guard前／後|0 / 0|PASS，完整Snapshots相同；[before](evidence/m1b/environment-before.json)／[after](evidence/m1b/environment-after.json)|
|保留檔前／後核對|0|public/dist/舊M1 evidence共40檔bytes/SHA-256完全相同；[before](evidence/m1b/protected-before.json)／[after](evidence/m1b/protected-after.json)|

最終固定實作的完整suite/check/build:release/check:release各執行一次；沒有把Node結果稱為browser PASS，也沒有重跑舊產物腳本改寫M1 evidence。初驗及最終命令本輪皆無失敗／跳過。

### 10項發布準備契約對照

|契約|離線結果與證據|
|---|---|
|1 命令與參數|PASS：兩個精確npm scripts；無mode／未知mode／多參數／origin flags一律exit1，無產物|
|2 固定origin|PASS：https固定常數、無port/userinfo/query/hash/path覆寫；兩語URL獨立明列比對|
|3 輸出隔離與確定性|PASS：只在release-artifacts；site 11檔、manifest sibling；unknown/missing/junction/unmanaged拒絕；合法重建byte與mtime相同，無recursive delete|
|4 M1/runtime及HTML變更界線|PASS：6個非HTML資產逐byte不變；兩語只改robots及4條SEO links，反向還原完全等於原HTML，body/候選文案原樣|
|5 robots/sitemap|PASS：精確Allow/Sitemap policy；XML僅兩個canonical、沒有lastmod；preview仍noindex且無canonical/sitemap|
|6 headers|PASS_CONFIG_ONLY：直接由原serve SECURITY_HEADERS產出、只改X-Robots-Tag。serve.mjs原M1 SHA為 `8146d25031de53e5f2d0565c2c49b8faf805da4d3ee2e2bc199b63b30d340585`；未啟動serve，實際hosting headers NOT_RUN|
|7 manifest與獨立重建|PASS：schemaVersion1/mode/origin/toolSlug/files/sourceFiles精確；來源8、site11 sorted unique；manifest＋asset一起改／source一起改／錯origin／錯SEO均拒絕|
|8 新增測試與完整suite|PASS：25項針對性、完整108項；test copy限evidence/m1b，未知檔／目錄、缺檔、CSP、canonical、robots、sitemap、manifest、來源與CLI反例均涵蓋|
|9 交接／env／hash|PASS：本追加、M1B-RELEASE、TASK-ENTRY、本輪完整envguard與source/artifact凍結清單；舊M1紀錄不覆寫|
|10 回報與階段界線|交主代理獨立驗證。未推送、未部署、未開chat/子代理；沒有本輪需新權限的實作問題|

### 來源與產物hash

[release manifest](release-artifacts/manifest.json) 自身SHA-256：`fc9514610fbe86a8480c846eb76d3949dc9b11532dbf3bd0e77329c91b328d16`。site逐檔path/bytes/SHA-256與完整public sourceFiles都在此清單；它不在site內。

[M1B candidate manifest](evidence/m1b/candidate-manifest.json) 記錄本輪28個完整來源檔、相對M1的9檔diff、12個artifact檔（含manifest）、來源綜合digest及保留範圍。最後執行 `node scripts/freeze-release.mjs`，其實際結果保留 [final-freeze.log](evidence/m1b/final-freeze.log) 與 [exit](evidence/m1b/final-freeze-exit.json)。文件先定稿後凍結，不把其自身hash寫回文件。舊M1 manifest描述原M1快照，不以更新它來掩蓋本輪允許的scripts/docs變更。

### NOT_RUN、風險與下一步

真實browser、Worker、下載、layout、鍵盤、320px/200%、Network/Storage、native/真機仍為 `NOT_RUN_USER_FOCUS_INCIDENT`；本輪實際HTTP listener未啟動。`_headers`只證明設定內容，實際hosting response與正式網址為 `NOT_RUN_NOT_DEPLOYED`。GitHub／Cloudflare／首頁未執行；外部覆核未跑。沒有credentials、環境secret、Windows/Git/auth持久修改、服務安裝或費用。

尚缺主代理判定：經審核的真正隔離browser機制、必要產品/browser gate及是否另行放行M2；不是請使用者重複授權既有發布。驗收者應使用 `release-artifacts/site/` 作為未上線的候選站點根。此目錄含index,follow，所以只可在後續明確放行時交正式hosting。

首次寫入若受外部併發／磁碟錯誤中斷，可留下partial輸出；產生器會保留並拒絕，不自動清除／修復。沒有跨程序寫入鎖。新產品修改需要另設有界任務與審查後的新來源快照，不能只調整M1 pins。本輪沒有實作阻擋事項；以上瀏覽器／發布風險均保留，未冒充PASS。

## 2026-10-27 追加 — B20-61-M2A 正式發布準備

最新狀態：M2A設定、精確入口轉址及正式產物已準備，交root獨立驗收；**本輪沒有push、部署或標記外驗完成**。此追加不重寫M1/M1B或原browser證據。

root執行 `b20-61-r1` 的原始結果已讀取並核對：36 PASS／6 NOT_RUN／0 FAIL、failures[]、prohibited[]，browser `145.0.7632.6`，exact parent cleanup PASS。結果與cleanup的原始路徑／SHA及六個NOT_RUN理由保存在 [browser-evidence-reference.json](../../.runs/batch20-completion-2026-10-27/owner-61-release/browser-evidence-reference.json)。本owner沒有自己啟動瀏覽器。兩語200% zoom、刻意送達私有舊generation訊息、原生／真機／AT仍照原六列NOT_RUN，沒有擴大root的PASS範圍。

### 本輪實際差異

|檔案|變更|
|---|---|
|`wrangler.jsonc`（新增）|固定assets-only、custom domain agenda-check.glossquote.com、2026-10-27；所有指定telemetry／observability flags false，無Worker/main/vars/bindings|
|`scripts/deployment.mjs`（新增）|精確設定物件＋canonical bytes檢查；三列_redirects的唯一固定內容|
|`scripts/check.mjs`|加入發布設定gate；原public安全／SEO／語法檢查保留|
|`scripts/release.mjs`|site加入_redirects；只剝兩語各一個完整候選頁尾標記；manifest必要configFiles固定wrangler；既有fail-closed保留|
|`test/release.test.mjs`|新增7項M2A測試與相應12檔／configFiles／精確footer oracle更新；全部在task-owned copy做負例|
|`test/toolchain.test.mjs`|fixture暫存根改為evidence/m2a，並複製固定config；不寫歷史evidence|
|`M2A-RELEASE.md`（新增）|本輪設定、精確文字／轉址差異、舊產物位置、重現與未驗限制|
|`TASK-ENTRY.md`|追加M2A範圍及結果|
|`HANDOFF.md`|本追加|

其他public/runtime/核心、SEO、CSP、robots/sitemap、安全headers、原規格與browser證據未改。preview實際重建後仍是8檔／79,829 bytes，逐byte與原public相同。正式HTML只把完整 `<span>Gloss Tools by GlossQuote · 本地候選預覽</span>` 或英文 `Local candidate preview` 對應完整span改成純品牌span；不是任意刪除文字或放寬body比較。

三列_redirects精確為 `/ /index.html 301`、`/en /en/index.html 301`、`/en/ /en/index.html 301`，LF且最後LF。正式site為12檔／81,271 bytes，根manifest不在site內。設定檔沒有進site，manifest以新增configFiles必要欄位記錄它，closed-key及expected-bytes核對仍完整。

### 舊版本保留與實際diff

原M1B release先以原檢查器實際核實（exit0，11檔／81,255 bytes，manifest `fc9514610fbe86a8480c846eb76d3949dc9b11532dbf3bd0e77329c91b328d16`）。確認兩個resolved絕對路徑均在明示scope且目的不存在後，完整移存 [previous-release-artifacts](../../.runs/batch20-completion-2026-10-27/owner-61-release/previous-release-artifacts/)。沒有刪除舊產物，也沒有讓新版builder自動覆寫舊schema。

修改前已保存本工具102檔的bytes/SHA baseline。41個修改前來源從目前仍相同的檔案及root原M1B copy中逐檔核hash後保存，任何不匹配版本都不用。最終記錄 [before-source](../../.runs/batch20-completion-2026-10-27/owner-61-release/before-source/)／[after-source](../../.runs/batch20-completion-2026-10-27/owner-61-release/after-source/)、[actual-source.diff](../../.runs/batch20-completion-2026-10-27/owner-61-release/actual-source.diff) 與 [actual-artifacts.diff](../../.runs/batch20-completion-2026-10-27/owner-61-release/actual-artifacts.diff)，不以空白Git diff或僅自述當實際差異。

新builder沒有增加清理／修復路徑：未知檔、缺檔、被改動manifest/config/redirects、junction或額外domain皆拒絕並保留；初建exclusive writes，合法重建只核對。尚未放寬來源M1 pins或任何runtime規則。

### 實際命令與驗證

現有Node `v24.14.0`／既有npm CLI；未npm install。記錄皆在 [owner-61-release](../../.runs/batch20-completion-2026-10-27/owner-61-release/)。

|命令|exit|結果|
|---|---:|---|
|原M1B `node scripts/release.mjs check`|0|舊產物通過後才移存；[log](../../.runs/batch20-completion-2026-10-27/owner-61-release/previous-release-check.log)|
|`node --test test/release.test.mjs`（針對性）|0|32/32，0 fail/skip；[log](../../.runs/batch20-completion-2026-10-27/owner-61-release/targeted-release-tests.log)|
|最終 `npm test`|0|115/115，0 fail/skip；[log](../../.runs/batch20-completion-2026-10-27/owner-61-release/final-test.log)|
|最終 `npm run check`|0|8個public資產、2個noindex頁與固定config／全部scripts語法；[log](../../.runs/batch20-completion-2026-10-27/owner-61-release/final-check.log)|
|最終 `npm run build`|0|8檔／79,829 bytes原preview；[log](../../.runs/batch20-completion-2026-10-27/owner-61-release/final-build.log)|
|最終 `npm run build:release`|0|12檔／81,271 bytes；[log](../../.runs/batch20-completion-2026-10-27/owner-61-release/final-build-release.log)|
|最終 `npm run check:release`|0|完整來源／設定／SEO／header／redirect／manifest重新核對；[log](../../.runs/batch20-completion-2026-10-27/owner-61-release/final-check-release.log)|
|Windows environment guard前／後|0 / 0|PASS；完整Snapshots（含兩個Environment-key指紋及TEMP/TMP）完全相同|

針對性測試後將build hook固定為root既有發布模式 `node scripts/release.mjs build`，最終完整suite驗該固定版本。沒有執行此hook以外的CLI／部署／auth，沒有失敗測試被抹去。新增7項涵蓋設定擴權／duplicate key／格式／link拒絕、三列redirect完整bytes與共同竄改、closed configFiles manifest及精確footer刪除。

使用者明示logs/traces/metrics全false優先於通用Cloudflare skill的開啟observability預設；沒有增加nodejs_compat、main或binding。欄位參考既有審核Wrangler schema（SHA `07a867ae03d86102eba23fee15136cc4fadbf2fd708d619223c3976ec6047301`）；只讀schema，沒有安裝或執行Wrangler、沒有dry-run或hosting PASS。

前後環境見 [before](../../.runs/batch20-completion-2026-10-27/owner-61-release/environment-before.json)／[after](../../.runs/batch20-completion-2026-10-27/owner-61-release/environment-after.json)。HKCU PATH ExpandString/834/ephemeral0、HKLM String/1227/ephemeral0，PATH與完整Environment指紋均不變；既有duplicate entries未改。

### 固定hash與尚缺範圍

正式release manifest SHA-256：`3a4692cdc687935e7f6cefd59be7c3485abfa6667e9032c43cb015609da07a58`。
wrangler.jsonc：655 bytes，SHA-256 `ccd239a1fee3c13cd0a04ef5e2e4aa77ce4ac0667d393b36275fdfcad8c2f018`。

最終 [candidate-manifest.json](../../.runs/batch20-completion-2026-10-27/owner-61-release/candidate-manifest.json) 記錄44個完整source（含不變契約）、9個新增／修改來源、13個新artifact與12個保留舊artifact的逐檔bytes/SHA。最後owner `finalize.mjs` 會核實70個public/dist/歷史evidence/契約檔與完整環境不變，保留實際 [finalize.log](../../.runs/batch20-completion-2026-10-27/owner-61-release/finalize.log) 與exit。

NOT_RUN仍有上述六個browser人工／不可觀察子項。本輪新301、Cloudflare domain/headers、Wrangler dry-run、GitHub、正式hosting、首頁與外部覆核都未執行；它們需root獨立驗收／另行放行。原root browser證據綁定原M1B UI，沒有宣稱它已驗證本輪301或正式hosting。沒有讀憑證、Windows/Git/auth持久修改、原生操作、服務、費用、subagent或另ZIP。保留partial-write／無跨程序鎖風險，遇未知產物仍停止而非清理。

## 2026-10-27 追加 — B20-61-M2A-F1

root已完成前一版primary-fixes/61五命令與115項測試，指出本批發布validator的固定日期為 `2026-10-24`；前版config採 `2026-10-27` 會遭拒絕。本輪已更正該差異，不改其他config、runtime、public、CSP、轉址或產品功能；本輪不是M2B，也未push／部署。

來源只改6檔：wrangler.jsonc的compatibility_date、scripts/deployment.mjs的同一policy值、test/release.test.mjs的正向值及舊日期拒絕反例，以及M2A-RELEASE.md／HANDOFF.md／TASK-ENTRY.md必要文件。所有工作日期仍為2026-10-27，沒有將歷史紀錄中的舊配置日期或舊hash全域替換。

先用原M2A checker驗完整舊產物通過（exit0、manifest `3a4692cdc687935e7f6cefd59be7c3485abfa6667e9032c43cb015609da07a58`），44份來源逐檔核舊M2A manifest後保存，再驗source/target絕對路徑在明示scope、目的不存在，移存13份舊artifacts至新 [previous-release-artifacts](../../.runs/batch20-completion-2026-10-27/owner-61-release-r1/previous-release-artifacts/)。原owner-61-release及更早M1/M1B、browser證據不覆寫。

|本輪實際命令|exit|結果|
|---|---:|---|
|原M2A `node scripts/release.mjs check`|0|舊候選核實後才保留／移存|
|`node --test test/release.test.mjs`|0|受影響release/deployment 32/32，0 fail/skip；含明確拒絕2026-10-27|
|`npm run check`|0|public/SEO/語法與修正後固定config通過|
|`npm run build`|0|原preview8檔／79,829 bytes|
|`npm run build:release`|0|site12檔／81,271 bytes|
|`npm run check:release`|0|完整closed source/config/manifest核對通過|
|Windows environment guard前／後|0 / 0|完整Snapshots完全一致、PASS|

本輪沒有重跑未受影響的完整115項；該範圍沿用前版M2A及root primary-fixes/61已通過證據，不標成自己本次再跑。實際logs與exit各自保留 [owner-61-release-r1](../../.runs/batch20-completion-2026-10-27/owner-61-release-r1/)。

新release manifest SHA：`7ff51e456bfcd3a86a02eae2a791341752c6524690d8621b1344d89566d80118`。
wrangler.jsonc：655 bytes，SHA：`f8f9a190f306f97e35b0b8e3286fbe5ca2b810de254527e536d37ac3c994f202`。

[r1 candidate manifest](../../.runs/batch20-completion-2026-10-27/owner-61-release-r1/candidate-manifest.json) 記錄44個source／6檔差異、13個新與13個舊artifact逐檔hash；finalize另驗config其他欄位deep-equal、deployment policy只有日期字串差異、全部12個site檔案／public/dist／歷史evidence／契約與Windows環境不變。實際diff為 [actual-source.diff](../../.runs/batch20-completion-2026-10-27/owner-61-release-r1/actual-source.diff)。

root原36 PASS／6 NOT_RUN範圍不變；本輪無browser/UI、Wrangler dry-run、實際hosting/301驗證、憑證、系統/Git/auth修改、子代理或發布。未變runtime不需要新產品修正。待root primary-fixes/61-r1獨立驗證後再M2B，外驗仍未完成。


## 2026-10-27 追加 — B20-61-M2B

狀態：**READY_LOCAL_GITHUB_CREATION_THROTTLED**。依主審最後修正，本輪只準備乾淨審查副本、五項驗證、本機固定 commit、inventory 與 guards；沒有建立 GitHub repository、設定 remote、push、認證操作或 hosting。GitHub 節流是主審回報的 scope 邊界，本 owner 未重試探測。

本機 commit：`d28a67ba0a0accce41ee0a20c4a5cd221bc3ba06`；branch：`codex/agenda-conflicts-m2b`。審查副本位於 [repository](../../.runs/batch20-completion-2026-10-27/owner-61-publish/repository/)。共38個追蹤檔；27個 public/scripts/test/package/config/ignore 輸入逐byte等於主審 primary-fixes/61-r1，所有假資料fixtures保留。8份公開規格照原bytes，README／AGENTS／HANDOFF只在副本衍生可攜版本；內部歷史文件、evidence、dist與release-artifacts未進commit。主審copy未含docs目錄的4份規格依owner-61-release-r1固定manifest逐hash確認。

|本輪乾淨副本命令|exit|結果|
|---|---:|---|
|npm run build|0|preview8檔／79,829 bytes|
|npm test|0|115/115，0 fail/cancel/skip|
|npm run check|0|public／SEO／語法／固定config通過|
|npm run build:release|0|site12檔／81,271 bytes|
|npm run check:release|0|closed來源／設定／manifest核對通過|

13個完整release-artifacts檔案含manifest與主審r1 raw bytes完全一致；release manifest SHA-256：`7ff51e456bfcd3a86a02eae2a791341752c6524690d8621b1344d89566d80118`。先build再test是release fixtures比較preview的必要順序。Node spec reporter只修正owner計數解析，原115測試log保留，未因解析器重跑已通過測試。

[publication-receipt.json](../../.runs/batch20-completion-2026-10-27/owner-61-publish/publication-receipt.json) 明列commit、branch、public=null、repoCreated=false、pushed=false、remoteHead=null；[tracked-inventory.json](../../.runs/batch20-completion-2026-10-27/owner-61-publish/tracked-inventory.json) 把38個檔案逐筆bytes/SHA綁定本機commit，並核實Git blob bytes等於working copy。[command-results.json](../../.runs/batch20-completion-2026-10-27/owner-61-publish/command-results.json) 保留五命令與logs；[準備說明](../../.runs/batch20-completion-2026-10-27/owner-61-publish/PREPARATION-NOTES.md) 記錄文件來源及owner helper修正。

Windows完整Snapshots前後相同：HKCU PATH ExpandString/834、HKLM String/1227，兩者ephemeral entries=0，PATH hash、全Environment-key指紋與TEMP/TMP均不變。Git guard三個既有user/system設定檔存在狀態、bytes、SHA亦完全一致；[before](../../.runs/batch20-completion-2026-10-27/owner-61-publish/git-settings-before.json)／[after](../../.runs/batch20-completion-2026-10-27/owner-61-publish/git-settings-after.json)／[verify](../../.runs/batch20-completion-2026-10-27/owner-61-publish/git-settings-verify.log)。未安裝套件、未讀憑證或繼承Git認證設定，無系統／持久環境／auth修改，未開server、UI或subagent，未另建ZIP。

GitHub建立／push／public visibility／remote HEAD為NOT_RUN_GITHUB_CREATION_THROTTLED。Cloudflare／實際301與headers／雙語首頁由主審後續發布；先前browser36 PASS／6 NOT_RUN／0 FAIL僅沿用既有範圍，兩語200% zoom、私有stale-message、native/device/AT仍NOT_RUN；本輪無新browser。外部覆核未完成，不標公開發布、live或產品complete。

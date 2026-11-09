# 搬家裝箱與物品定位 M1 交接

2026-10-23（Asia/Taipei）。**M1 本地候選已固定，待主代理親自獨立驗收；未發布、未部署、未完成外部驗收。**
配置請求 gpt-6.1-sol / max，實際 backend 未獨立確認。

|範圍|實際狀態|
|---|---|
|純核心、controller、雙語表單假 DOM|PASS，52 tests；不是瀏覽器證據|
|npm run check / build|PASS，exit 0；14 份 preview dist|
|來源與 dist byte 比對、產物 SHA|PASS；27 份實作來源固定、6 份實際假資料輸出|
|持久 Windows Environment|PASS；User/Machine PATH 與完整 Environment 前後相同|
|真瀏覽器 B01–B05／原生／真機|NOT_RUN_USER_FOCUS_INCIDENT|
|GitHub source / reviewed / released commit|皆未建立；NOT_PUBLISHED|
|正式網站／雙語首頁整合|NOT_DEPLOYED；未修改共享頁面或看板|
|外部驗收|NOT_RUN|

## 實作結果與檔案

- `public/js/core/{schema,boxes,report,session}.mjs`：嚴格 schema 1、NFC 與控制字元驗證、箱／物品上限、嚴格數量、唯一且大小寫敏感箱號、自動 BX 編號、物品 ID、不可變新增／編輯／刪除／單次搬移、全域搜尋、房間清單與逐箱 TXT、JSON 保存與恢復。
- `public/js/{app,controller}.mjs`、`public/js/locales/{zh-Hant,en}.mjs`：真實表單接核心；箱索引與手機選擇器、優先開箱、欄位錯誤、保留草稿、搜尋／物品每頁最多 50 項、頁內刪除確認、完整匯入預覽與取消、8 MiB byte gate、fatal UTF-8 解碼、generation／晚到事件拒絕、單一 Blob URL 所有者與清理。
- `public/index.html`、`public/en/index.html`、`public/404.html`、`public/styles/app.css`、`public/_headers`、`public/robots.txt`：完整雙語文案與 FAQ、初始空白且未初始化時停用、明確假例子、同語首頁與切換語言資料遺失提示、預覽 noindex、固定 CSP／無連線及追蹤設定。
- `package.json`、`.gitignore`、`scripts/{contract,check,build,serve,run-gates,generate-evidence}.mjs`：Node 24 原生零依賴；封閉 allowlist、語法與結構檢查、拒絕未知檔／symlink／junction／hard link、保留未知輸出、固定回報與雜湊。
- `test/{core,controller,app,toolchain}.test.mjs`、`test/fake-dom.mjs`：離線假資料、手寫精確期望及反例；app 假 DOM 僅測接線，沒有啟動瀏覽器或 server。
- `TECHNICAL.md`、`ACCEPTANCE.md`：只依主代理 **B20-55-D01** 修訂匯入容量及 A13–A15；`TASK-ENTRY.md`、本交接及 `evidence/m1/**` 記錄實際進度。

全部寫入限本工具與 D01 額外授權兩份規格。其他 11 份起始不可變契約 hash 未變，見[規格比對](evidence/m1/specifications-verified.json)。未引用兄弟工具 runtime，未安裝套件、啟動服務、讀憑證、操作桌面或變更 Git 設定。

## B20-55-D01 容量修訂（已解決）

原2MiB規格讓合法100箱／1000項中文專案產生 **2179142 bytes** 備份後無法恢復。保留[原始失敗證據](evidence/m1/capacity-conflict-original.json)。主代理明確授權提高為 **8 MiB（8388608 bytes）**，其餘逐欄上限、100箱／1000項與strict schema不變，待問已結案。

A13 最大中文 backup→parse 等值；A14 supplementary Unicode 備份 **2860942 bytes**、同資料 JSON Unicode 跳脫形式 **8315342 bytes** 皆等值；A15 **8388608 bytes** 有效 JSON 允許、**8388609 bytes** 在讀取／解析前拒絕並保留既有資料。見[現行容量證據](evidence/m1/capacity-review.json)及最終 test log。

## 實際命令與結果

Node：`C:/Program Files/nodejs/node.exe --version` → **v24.14.0**。
為確保自建程序 `shell:false`／`windowsHide:true`，runner 以同一 Node 執行 `C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js`，依序執行下表 npm 子命令。完整 argv、exit、log、前後來源 manifest 留[最終 gate](evidence/m1/final-gates.json)。

|命令|exit|最終結果|
|---|---|---|
|`npm test`|0|52 tests / 52 pass / 0 fail / 0 skipped|
|`npm run check`|0|ESM、封閉 public allowlist、雙語結構與實際 metadata、標籤、資源／本地 import、安全禁止項與 headers 檢查|
|`npm run build`|0|14 份 preview dist，拒未知輸出，未任意刪除|
|`node scripts/generate-evidence.mjs`|0|6 份實際 UTF-8 假資料輸出、14 份 source/dist byte 相同、規格比對與 SHA|
|既有 `check-persistent-environment.ps1` 前後比對|0|PASS，PATH hash/type/length/ephemeral entries 與完整 Environment fingerprint 均未變|

執行入口：`node scripts/run-gates.mjs final` → exit 0。所有測試離線，只有假資料。語法與靜態檢查並不證明真實 Network／Storage 或可及性通過。

歷史依序保留 T00（6 tests）、T01（24）、T02（34）、T03（40）；原始 log 留本地 evidence。第一次最終檢查有 4 項靜態 import 掃描誤判，及過早產生證據被 dist byte 比對拒絕，完整[失敗紀錄](evidence/m1/attempt-1/FAILURE.md)保留。修正後 D01 前的 48 tests／check／build 及 manifest 留 `evidence/m1/pre-D01/`；D01 最終為52項。早期 runner 的 -1 為 spec reporter 計數解析問題，非測試執行數；原 log 未刪。

## 固定候選與可取用產物

- 實作來源：**27 files / 145828 bytes**；每檔 byte／SHA-256 見[source-files.json](evidence/m1/source-files.json)。最終 test/check/build 前後來源相同。
- 上述 manifest 本身 SHA-256：**`c53792bc53710a8d6c0a7d458e1918404c9fa4c6fd217b1445cfd459474d29a1`**，見[identity](evidence/m1/source-identity.json)。此為來源清單身分，不是 Git commit 或 ZIP hash。
- dist：**14 files / 85558 bytes**，每檔 hash 與 public 完全相同，見[dist-files.json](evidence/m1/dist-files.json)。
- 假資料輸出：**6 files / 1656 bytes**，由實際 controller／原生 Node Blob 取得，UTF-8 無 BOM／LF 尾換行，見[output-files.json](evidence/m1/output-files.json)。這些不是瀏覽器下載 PASS。
- [繁中房間搬運清單](evidence/m1/outputs/zh-Hant/moving-boxes-rooms.txt)、[繁中逐箱明細](evidence/m1/outputs/zh-Hant/moving-boxes-contents.txt)、[繁中專案 JSON](evidence/m1/outputs/zh-Hant/moving-boxes-project.json)。
- [English room list](evidence/m1/outputs/en/moving-boxes-rooms.txt)、[English box contents](evidence/m1/outputs/en/moving-boxes-contents.txt)、[English project JSON](evidence/m1/outputs/en/moving-boxes-project.json)。
- Environment：[before](evidence/m1/environment-before.json)、[after](evidence/m1/environment-after.json)、[comparison](evidence/m1/environment-comparison.json)。User PATH 834 chars／ExpandString，Machine 1227 chars／String；ephemeral entries 皆0，全 Environment hash 前後相同。

## 未驗、限制與主代理下一步

詳[驗收狀態](evidence/m1/ACCEPTANCE-STATUS.md)。B01–B05全部 **NOT_RUN_USER_FOCUS_INCIDENT**，含雙語真實操作／下載、快速更改及取消、實際惡意文字 DOM、Network／Storage、keyboard／focus／讀屏／320px／200%／真機、原生下載、正式 HTTP／404／SEO。沒有截圖、伺服器、CUA、hidden IAB 或桌面測試；假 DOM 不替代以上 gate。

本地只處理記憶體，不自動保存；切換語言／重新整理／關閉會丟未匯出資料。使用單行文字、Unicode code point 字數與保守 C0/C1/DEL 拒絕；未儲存編輯先保存或取消才能匯出／刪除。無列印、clipboard、雲端或標籤印表機整合。下載按下後 URL 保留10秒，變更／清除／pagehide時撤銷；只顯示「已要求下載」，不宣稱作業系統保存成功。

主代理需先讀實際來源／diff及證據、獨立重驗並用已審核的真正隔離機制完成必要 browser gate。之後另行 M2 放行本原對話公開 `KYStr/glossquote-labs-moving-boxes`；M3由主代理免費部署與雙語首頁整合。此候選不自動續行、不輪詢、不另建交付 ZIP；由主代理放入單一整合包。

## B20-RP-55：M1B 離線發布準備（2026-10-23，追加）

**M1B release-candidate 已固定，待主代理獨立驗證；不是 M2／部署放行。** 前述 M1 runtime、preview dist 及原 evidence 均保留，沒有將本輪證據覆蓋到 M1。

實際差異：package.json只新增 `build:release`／`check:release`；新增 `scripts/release.mjs`、`scripts/m1b-gates.mjs`、`test/release.test.mjs`。既有 `test/toolchain.test.mjs` 僅把暫存與安全清理界線由 evidence/m1 移至 evidence/m1b，避免寫入舊證據。另新增[操作與狀態說明](M1B-RELEASE.md)、本節／TASK-ENTRY追加、新 evidence/m1b 與 release-artifacts。未修改 .gitignore、public、dist、規格／AGENTS/docs、其他工具或共享頁面。

發布預定origin固定 **https://moving-boxes.glossquote.com**（尚未上線）。使用[候選 site](release-artifacts/site/index.html)的目錄為靜態根；[manifest](release-artifacts/manifest.json)在sibling，不進site。
兩語HTML只改head的robots/canonical/互返hreflang；robots/sitemap使用固定origin，x-default中文。JS/CSS/404逐byte不變；原_headers只改X-Robots-Tag，其他CSP與隱私規則完整保留。可見預覽／待驗文案保留，沒有structured-data或外部資源擴充。

來源以14份M1 public bytes/SHA固定；checker會從固定來源重建expected bytes，不能以修改manifest繞過。未知／缺少／污染／被修改／linked輸出均拒絕並保留；不遞迴刪除、不覆寫既有檔，相同合法候選重建為不變操作。測試負例都在本工具m1b臨時copy，已完成清理。

|最終命令|exit|實際結果|
|---|---|---|
|`npm test`|0|**71 tests / 71 pass / 0 fail / 0 skipped**；包含19項release專項，非browser證據|
|`npm run check`|0|既有public／雙語／ESM／安全靜態檢查通過|
|`npm run build:release`|0|15份site候選＋sibling manifest|
|`npm run check:release`|0|獨立重算來源／預期bytes與manifest，SEO、runtime及輸出隔離通過|
|既有Environment guard前後|0|HKCU/HKLM PATH hash/type/length/ephemeral entries及全Environment fingerprint完全相同|

入口為 `node scripts/m1b-gates.mjs`，實際 Node **v24.14.0**。每個npm子命令均以Node執行npm-cli.js，shell:false/windowsHide:true；完整argv與log在[final-gates](evidence/m1b/final-gates.json)。本輪只有一次固定版本完整suite/check/build:release/check:release；較早17項針對性測試也全過，見[targeted-initial](evidence/m1b/targeted-initial.json)。未重跑preview build，沒有啟動serve或browser。

固定來源：**30 files / 176557 bytes**，每檔見[source-files](evidence/m1b/source-files.json)；該manifest SHA-256為 **`a354e5176082fe4735a0b78abd3055951a0ec51bdbe1ecf10902225eaa28dc9b`**。最終命令前後來源完全相同。這是M1B實作來源身分，不是Git commit。

固定產物：site **15 files / 86604 bytes**；sibling manifest **4498 bytes**，SHA-256 **`97fda44631ffa957b09811dd4823c5281d34665ae348d18ba2dab39b41378b86`**，每檔bytes/SHA與來源public14份資料見[artifact-identity](evidence/m1b/artifact-identity.json)。manifest不含時間、亂數或本機絕對路徑；runtime bytes與M1相同。

受保護內容 **89檔**（public／dist／原M1 evidence／原契約與docs）前後完全相同，見[protected-comparison](evidence/m1b/protected-comparison.json)。持久環境[before](evidence/m1b/environment-before.json)、[after](evidence/m1b/environment-after.json)、[comparison](evidence/m1b/environment-comparison.json)保留；沒有Windows/Git/auth設定改動、套件安裝或憑證讀取。

未驗及下一步：真browser／視覺／keyboard／讀屏／原生／真機／實際Network-Storage／hosting HTTP headers與404仍 **NOT_RUN_USER_FOCUS_INCIDENT**。靜態_headers不是實際HTTP證明；GitHub **NOT_PUBLISHED**，hosting **NOT_DEPLOYED**，外部驗收 **NOT_RUN**。M1B無新的產品決策待問；主代理需讀實際diff與候選、獨立驗證並完成必要browser gate後另行M2放行。未另建ZIP，供主代理納入單一整合交付。

## B20-55-ORACLE-R2（2026-10-27，測試oracle更正）

依主代理 HARNESS-55-SECONDARY.md 決策，原browser矩陣及BR55-19要求第二次modal是oracle mismatch；PRODUCT已允許明確不可復原的整頁清除按鈕。**只修測試，不新增產品modal。**

新增完整[owner-55-browser-r2模組](../../.runs/batch20-browser-release-2026-10-25/owner-55-browser-r2/README.md)，舊owner-55-browser與舊矩陣保留。BR55-19先證明兩箱資料、搜尋及完整JSON預覽／下載存在；核對兩語「不可復原」按鈕，按下後檢查資料、搜尋、來源與舊預覽／下載失效；再實際重建REBUILT55／客房／BR55-AFTER-CLEAR×3並核對完整新JSON。案例ID保留以供追溯，其餘harness bytes與12份fixtures均未改。

實際CLI：4份 `node --check` 均exit0；`node fixtures/selftest.mjs` 12/12、`node validate-r2.mjs` 3/3均exit0。helper驗證只有BR55-19程式區塊變動、12份fixture byte相同，以及舊owner/public/dist/release-artifacts共59檔前後hash未變。未跑產品suite/build、server或browser，未改runtime、Git/憑證或持久系統，沒有push/deploy/另ZIP。

R2固定18檔／97493 bytes（manifest自身另5250 bytes），[manifest](../../.runs/batch20-browser-release-2026-10-25/owner-55-browser-r2/manifest.json) SHA-256：`c697b81a716c9831b78d9c53bd9e1740c8b7f697250ed9e2144ff84397c9352f`。harness SHA-256：`1cee6bc526879e50c1ddf572bac8556565c52e5d833351f850a39a892b826903`。完整[change.diff](../../.runs/batch20-browser-release-2026-10-25/owner-55-browser-r2/change.diff)與validation留R2目錄。

外部2026-10-27 release-prep證據O01僅記「完全空release-artifacts可供build使用，check拒絕空輸出」是55現行允許行為，**非bug**；不為矩陣新增產品修補或重跑build。補充見[本輪說明](evidence/oracle-r2-2026-10-27/README.md)。

R2狀態 **READY_FOR_ROOT_REVIEW_NOT_EXECUTED**。瀏覽器、200%文字放大、直接重選／clear競態的時序見證、原生／真機／AT仍未驗；保留原NOT_RUN政策，等主代理隔離執行。這一輪沒有新增產品語意決策待問。

## B20-55-H3（2026-10-27，R3資產頁隔離）

新增完整[owner-55-browser-r3](../../.runs/batch20-browser-release-2026-10-25/owner-55-browser-r3/README.md)，保留R1/R2及root已接受的BR55-19原樣。實際[change.diff](../../.runs/batch20-browser-release-2026-10-25/owner-55-browser-r3/change.diff)記錄harness／README修改及新增的asset-policy、policy tests、validate-r3；未改產品或CSP。

BR55-23在產品頁驗SEO及HTTP headers後，以同context的**獨立guarded asset page**讀取固定同origin robots.txt／sitemap.xml，保存完整原始bytes、status及headers，再驗80／255 bytes的獨立oracle。輔助頁console、pageerror、requests、worker與dialog另存完整viewer audit，finally關閉後再檢查network guard；XML viewer診斷不混入產品console，也不藉此放寬產品CSP。產品console所有error仍嚴格算錯，沒有CSP／404文字豁免。

新增 `BR55-23-UNKNOWN-404`，status明列 **NOT_RUN_ROOT_LIVE_HTTP_CHECK**、不發送未知路徑請求；由root在正式HTTP發布檢查補真404。案例24僅使用已凍結的`/404.html`靜態檔離頁，預期HTTP200，不把它當成未知路由404證明。

實際CLI：4份 `node --check` 均exit0；`node --test asset-policy.test.mjs` **8/8**、`node validate-r3.mjs` **4/4**通過。後者證明含BR55-19在內的27個其他case body保留、12份fixtures byte相同，以及R1/R2和public/dist/release-artifacts共78檔hash未變。未重跑未變fixture／產品suite／build，未啟動browser或server。曾依主代理名額協調安全暫停，明確恢復後只完成交接與固定檔案核對。

R3固定20檔／205948 bytes（manifest另5614 bytes），[manifest](../../.runs/batch20-browser-release-2026-10-25/owner-55-browser-r3/manifest.json) SHA-256：`b485755c211c6049aa8ec5058d2dc98b811fa70b9293de1aa8b50f81bb3ce82d`；harness SHA-256：`3ba7c1b914238978c0abe3c09c51de6015950759a42e1f0881102587cd0ce016`。完整[CLI驗證](../../.runs/batch20-browser-release-2026-10-25/owner-55-browser-r3/validation.json)與受保護檔案hash留新目錄。

狀態 **READY_FOR_ROOT_REVIEW_NOT_EXECUTED**：本輪沒有實際browser結果，root仍須執行；未知路由HTTP404、200%文字放大、未證實重疊時序、原生／真機／AT保留待驗。未讀憑證、改持久設定、push、deploy、另開chat或委派；O01仍只是允許的空release輸出目錄觀察，不改產品。

## B20-55-M2A（2026-10-27，固定發布設定與入口 redirect）

**READY_FOR_ROOT_M2A_REVIEW**。新增固定 assets-only `wrangler.jsonc`／獨立 config validator；更新 check、release 與兩份測試。site 新增65 bytes 的三條301 `_redirects`，manifest 增加 redirect 與 configFiles。兩語 title 無候選前綴，沒有移除其他預覽／待驗文案；舊15份 site、public／runtime／core／匯出／CSP均逐 byte 相同。完整[本輪契約、驗證與未驗項](M2A-RELEASE.md)及[owner 證據／diff](../../.runs/batch20-completion-2026-10-27/owner-55-release/README.md)。

舊工具143檔／614381 bytes完整封存到 owner `archive/tool-before`，含全部67份歷史 evidence及16份舊 release；SHA核對後才安全移入舊 release。無 force／覆寫未知輸出。舊 manifest SHA `97fda44631ffa957b09811dd4823c5281d34665ae348d18ba2dab39b41378b86`保留。

五個指定命令 **npm test（81/81）、check、build、build:release、check:release 均exit0**，各跑一次；完整 argv／原始 log在 owner final-gates。120份受保護原檔相同，Environment guard前後整個物件相同。測試fixture改存新evidence/m2a，沒有改寫舊證據。

來源32檔／186581 bytes，source-files SHA `14368c1f46f5161934aa5ee1378be8302b1018636a8b7f7dd10e53971c622459`。site16檔／86669 bytes，manifest4812 bytes／SHA `528ba45322b792b2275d98100ef5ae413a14eecbd02be6a1fc256eb20448336e`；固定wrangler651 bytes／SHA `d28fa1519317acafd9c0d30fa3bfc940117e9ead7737030fce20b3ea8b06a38f`。均為檔案身分，無新Git commit。

主控R4實跑12 PASS／0 FAIL，prohibited=[]，最終parent-cleanup PASS。只用兩語02／19四案取代R3四FAIL，支持案不另加：邏輯合計 **48 PASS／0 FAIL／12 NOT_RUN**。本對話沒有操作browser；16／17／18時序、23未知404、26真200%、27原生／真機／AT的兩語NOT_RUN保留。設定與redirect尚未live驗證；GitHub **NOT_PUBLISHED**、Cloudflare **NOT_DEPLOYED**、外部驗收 **NOT_RUN**。等主控M2A審核及另外M2B放行；不自動續行，不push/deploy/讀憑證/另ZIP。

## B20-55-M2B（2026-10-27，本機候選固定；GitHub建立暫停）

**READY_LOCAL_GITHUB_CREATION_THROTTLED**。主控已獨立驗證M2A後放行來源公開；本工具的既有CLI認證與repo 404唯讀預檢通過，但隨後主控通知56建立repo遭GitHub「You have created too many repositories, too quickly. Please try again later.」限制，要求所有尚未建立者停止建立及重試。本工具建立請求 **0次**、未建立repo、未push，沒有換API或帳號繞過。

已完成乾淨 publishing-copy：public／scripts／test／package／wrangler及.gitignore共32份固定來源與root primary-fixes/55逐byte相同，全部必要假資料fixtures保留；公開文件整理為可攜相對連結，不帶原工作區證據／.runs／其他工具／node_modules／憑證。五命令test、check、build、build:release、check:release各一次全exit0，81/81測試、0fail／cancelled／skipped／todo，17份重建release文件與主控逐byte及SHA相同。

固定本機branch **main**，commit **`ab78b67b3f769f971d91f4efc2e8c0ceffc13ddd`**；47份committed files已逐檔核對blob bytes／SHA。這是本機commit，**不是公開或遠端commit**。Git只使用per-command設定，generated outputs透過per-command excludesFile排除；沒有改.gitignore、全域／系統Git、auth或Windows持久環境。完整Environment及3份已知Git設定fingerprint前後相同。

release manifest仍4812 bytes／SHA **`528ba45322b792b2275d98100ef5ae413a14eecbd02be6a1fc256eb20448336e`**，site16檔／86669 bytes。主控browser合計48PASS／12NOT_RUN原樣保留，這輪沒有browser／server／native／桌面操作。遠端公開狀態、branch／HEAD及遠端逐檔核對 **NOT_RUN_GITHUB_CREATION_THROTTLED**；Cloudflare **NOT_DEPLOYED**、首頁未更新、外部驗收 **NOT_RUN**。

完整[publication-receipt](../../.runs/batch20-completion-2026-10-27/owner-55-publish/publication-receipt.json)、[tracked-inventory](../../.runs/batch20-completion-2026-10-27/owner-55-publish/tracked-inventory.json)及[owner交接](../../.runs/batch20-completion-2026-10-27/owner-55-publish/README.md)。待主控另外序列恢復公開流程，完成遠端核對後才可進部署；不自動重試、部署、委派或另建ZIP。

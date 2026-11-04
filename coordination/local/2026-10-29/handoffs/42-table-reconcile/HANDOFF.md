# 兩份表格對帳 · M1 交接

2026-10-23（Asia/Taipei），`0.1.0-m1-candidate`。狀態：**M1_CANDIDATE_READY_FOR_PRIMARY_REVIEW**。本輪完成 T00→T50 的實作與可安全執行的離線閘門；真瀏覽器未驗，尚未主代理接受、公開、部署或外部驗收。派送要求 gpt-6.1-sol/max；沒有獨立核實 backend 身分。

## 使用結果

左右 CSV 先顯示檔名、大小、解析列／欄數及錯誤位置。使用者明選 1–3 組唯一鍵與至少一組比較欄、確認配對後，使用真分批 generator 對帳。結果有一致／僅左／僅右／欄位不同四分類及來源 data-row index，50 筆分頁，長值可展開，完整來源列可查看。左右異名欄可配對；compare 與 key 可跨組共用，組內一對一。

確認結果後同時準備固定 `table-reconcile.json`／`table-reconcile.txt`。JSON schemaVersion=1、完整 changed/only 原列、全部差異欄，TXT 為固定英文標題／設定／四區報告，以 JSON quoting 保留換行與控制字元。兩份合計先檢查 ≤16 MiB 才建 Blob；超限兩份皆不可下載，結果仍可讀。預設字串 exact；trim 只作用於 key，空鍵／重複鍵整次拒絕。每側 1 MiB／5,000 筆／30 欄。

來源、配對與 keyMode 改動同步移除舊結果／下載 href、revoke 舊 URL；generation／AbortSignal 防晚回復活。取消不保留部分分類。reset/pagehide 清 File、table、output、URL 與樣本 DOM 引用。釋放引用不等於安全抹除或刪除已下載檔案。

## 實際修改檔案

以下均在本工具 allowed paths。13 份不變規格／契約未修改，hash 見 [specification-manifest.json](evidence/m1/specification-manifest.json)；第 14 份既有文件為本 HANDOFF，按任務更新。

- `.gitignore`、`package.json`：private ESM、Node >=24、四命令，零 runtime/dev 依賴。
- `public/index.html`、`public/en/index.html`：完整 zh-TW/en 靜態 SEO／FAQ／Product App、同語首頁與語言切換。
- `public/styles/app.css`：家族語意 tokens、工作畫布、48rem/75rem、區域表格捲動、雙層 focus／44px／reduced-motion 的樣式實作，實際渲染仍未驗。
- `public/js/app.js`、`public/js/i18n.mjs`：雙語操作、文字 DOM、明確映射與樣本、四類／分頁／報告、狀態／錯誤／清除。
- `public/js/core/errors.mjs`、`csv.mjs`、`reconcile.mjs`、`export.mjs`、`session.mjs`：固定錯碼、byte-first 嚴格 parser、JSON tuple、真 task yield、schema/bytes、生命週期。
- `public/_headers`、`public/robots.txt`：preview noindex/nofollow、安全 header/CSP 配置，未宣稱實際 hosting 已套用。
- `scripts/files.mjs`、`check.mjs`、`build.mjs`、`serve.mjs`、`pages.mjs`、`evidence.mjs`：封閉 allowlist、語法／來源／SEO、本地雙語頁生成、可稽核 build、純路由、固定來源 evidence。
- `test/csv.test.mjs`、`reconcile.test.mjs`、`export.test.mjs`、`session.test.mjs`、`app.test.mjs`、`toolchain.test.mjs`、`scaffold.test.mjs`：58 項離線測試；`test/boundary-fixture.mjs`、`dom-fake.mjs` 為合成替身／精確邊界輔助。
- `dist/**`：12 份逐 byte 相同 preview 資產及 `build-manifest.json`；沒有文件、測試、證據或真實資料。
- `TASK-ENTRY.md`、本檔、`evidence/m1/**`：範圍／決策、歷史、命令、環境與 hash 證據。未另建使用者交付 ZIP，由主代理整合單一外層 ZIP。

精確 29 個來源檔、各檔 bytes/SHA-256 見 [source-manifest.json](evidence/m1/source-manifest.json)；交接與產物完整固定清單見 [delivery-manifest.json](evidence/m1/delivery-manifest.json)。

## 最終固定輸入的命令

Node：`v24.14.0`。固定來源先 capture，最終命令後 verify 同一 hash；之後只更新 HANDOFF／evidence。

|命令|Exit|觀測結果／證據|
|---|---:|---|
|`npm test`|0|58 tests / 58 pass / 0 fail / 0 skipped；[stdout](evidence/m1/final-test.txt)|
|`npm run check`|0|12 public、22 語法檔；含完整雙語 SEO／generated-page drift／header 配置／相對 import 邊界；[stdout](evidence/m1/final-check.txt)|
|`npm run build`|0|12 preview assets，77,450 bytes；[stdout](evidence/m1/final-build.txt)|
|`node scripts/evidence.mjs --verify`|0|29 來源，固定 hash 未變|
|獨立 Node 逐檔比對 dist/source/manifest|0|12 資產 bytes／SHA-256 全相符、輸出封閉；[證據](evidence/m1/dist-verification.json)|

命令結束碼另見 [final-commands.json](evidence/m1/final-commands.json)。A01–A21 與 FR-07 對照、可驗與未驗界線見 [acceptance-matrix.md](evidence/m1/acceptance-matrix.md)。

16 MiB 邊界不是以小上限代替：恰 16,777,216 bytes 產出兩個 Blob；16,777,217 bytes 拒絕、不建新 Blob、回收舊 URL 且保留可讀結果。壓力 fixture 只隔離 serializer 界線，並非可接受的超大來源 CSV。201 rows 的首批真 timer yield 為 `left-index/100/201`，取消後無部分結果；全部進度批次 100/200/201 已驗。

## 固定雜湊

- 來源：29 檔合計 148,049 bytes；source-set SHA-256 `41a74f8b6f5a26a03e62b41d08e7fcceb301fc762aea8a4d5cceeb804e22ef82`。算法為排序後每檔 `path + NUL + bytes + NUL + sha256 + LF` 的 SHA-256，腳本可重算。
- `source-manifest.json` 本身 SHA-256：`f41ea967ce2d10d7f292e21f2a3c302fc55395ab609937b5f57f48f640352b5d`。
- `dist/build-manifest.json` SHA-256：`5623a17406b36f9bdb8fd8dc4fb9ea8caabeedcfa9a5ff17e4647c73f4939303`。
- source commit：**NOT_CREATED_M1**；reviewed commit：**NOT_REVIEWED**；released commit：**NOT_RELEASED**。上述來源 hash 不是 Git commit，也不是部署證明。

## 持久環境保護

原 guard 在起點、最終測試前、最終測試後皆 PASS；完整 User/Machine Environment snapshots（含 PATH／TEMP／TMP 的 hash、type、length、值數量和全 key fingerprint）逐項一致。User PATH ExpandString／834 chars；Machine PATH String／1,227 chars；兩者 ephemeral entries 都為 0。既有重複項保留，無永久變更。見 [environment-comparison.json](evidence/m1/environment-comparison.json)、[before](evidence/m1/environment-before.json)、[final-before](evidence/m1/environment-final-before.json)、[after](evidence/m1/environment-after.json)。

沒有讀取 token／憑證環境、Git auth 或 browser profile；沒有 npm install、外部服務、持久環境／系統／Git 設定寫入。程式自行建立的語法 child 均 `shell:false`／`windowsHide:true`。本地 server 未啟動，沒有背景程序需停止。

## 保留的歷史與風險

T00 scaffold check 12/12；T10 26 tests；T20 31；T30 check/build 76,623 bytes；T40 43 tests、check/build 77,088 bytes。T50 擴充初輪 57 tests PASS，但新增純函式掃描把序列化本地變數 `document` 誤判，check exit 1，當輪 build 未執行。已更名 `report`、保留掃描並修正診斷，最終 58/check/build 全通過。完整歷史保留於 [validation-history.md](evidence/m1/validation-history.md)，不把失敗抹成 PASS。

|範圍|狀態|
|---|---|
|T00–T50 實作／離線 Node／inert DOM／check／preview build|PASS_AUTOMATED_M1_CANDIDATE|
|主代理獨立 M1 審查|PENDING_PRIMARY_REVIEW|
|真 browser／檔案選擇／下載／鍵盤／讀屏／320px／zoom／長內容|NOT_RUN_USER_FOCUS_INCIDENT|
|實際 browser headers／CSP／Network／Storage／pagehide／原生／真機|NOT_RUN_USER_FOCUS_INCIDENT|
|GitHub／正式 hosting／首頁|NOT_PUBLISHED_M1_ONLY|
|外部驗收|NOT_RUN|

Node／inert DOM 可證明邏輯與文字 API 路徑，不能證明真引擎沒有外連／儲存、實際視覺、無障礙、下載或焦點安全。`_headers` 僅為候選配置，未做實際 HTTP／hosting 驗證；preview robots 也不是存取控制。

下一步由主代理審查此固定候選與實際 diff，提供核准隔離機制後完成真 browser gates。M2 GitHub 必須下一個具體放行；M3 hosting／首頁由主代理。此原功能對話不跨階段、不自行輪詢、不新增 chat／子代理，不對使用者電腦做隔離實驗。


## M1B 追加 · 2026-10-23 離線發布準備（最新）

本輪依 B20-RP-42 與 batch20-release-prep TASK 完成 **M1B_RELEASE_CANDIDATE_READY_FOR_PRIMARY_REVIEW**。前述 M1 歷史、source-set、命令與未驗保留；主代理本輪通知 M1 核心／CLI 已驗，不能延伸為 browser 通過。M1B 不是 M2 公開放行。

實際差異：

- 更新 `package.json`：保留原四命令，新增 `build:release`／`check:release`；`.gitignore` 排除生成的 release-artifacts。
- 新增 `scripts/release.mjs`：固定 origin `https://reconcile.glossquote.com`／slug `table-reconcile`、M1 public 12 檔 pin、head-only SEO、完整 source/output bytes 重建與共同竄改拒絕、exclusive creation／既有產物不覆寫。
- `scripts/check.mjs` 只把 package 命令契約從四個擴為六個；原 preview 安全／SEO 檢查保留。
- 新增 `test/release.test.mjs` 16 項針對性案例；`test/toolchain.test.mjs` 只將暫存根從 M1 移到 M1B，不改產品 oracle。
- 新增 [M1B-RELEASE.md](M1B-RELEASE.md)，本 HANDOFF／TASK-ENTRY 僅追加。新證據在 `evidence/m1b/`；實際 source/doc [changes.patch](evidence/m1b/changes.patch) 附可逐 byte 還原的 before-text。
- 生成 [release-artifacts/site/](release-artifacts/site/) 13 檔與 sibling [manifest.json](release-artifacts/manifest.json)。沒有動 public、dist、舊 M1 evidence、13 份規格／契約或其他工具／共享檔。

最終固定來源完整驗證一次：

|命令|Exit|結果|
|---|---:|---|
|`npm test`|0|74/74，0 fail、0 skipped；含新增 16 項，未當作 browser；[stdout](evidence/m1b/final-test.txt)|
|`npm run check`|0|12 public／24 語法檔；[stdout](evidence/m1b/final-check.txt)|
|`npm run build:release`|0|13 site assets／78,463 bytes；BUILT_OFFLINE；[stdout](evidence/m1b/final-build-release.txt)|
|`npm run check:release`|0|CHECKED_OFFLINE；[stdout](evidence/m1b/final-check-release.txt)|

前置針對性測試 `node --test test/release.test.mjs` exit 0、16/16，見 [targeted-release-test-1.txt](evidence/m1b/targeted-release-test-1.txt)。沒有本輪失敗／跳過被改成 PASS；原 M1 歷史失敗保留。原 preview 來源未變，沒有重跑 `npm run build`。沒有 server／browser／CDP／原生程序被啟動。

固定值：

- M1B 完整程式來源 31 檔／176,808 bytes，source-set SHA-256 `56f799e67ebf163b7fb50adfa0676168f325b78b0a5209b406bc228e5cda26e2`；[source-manifest.json](evidence/m1b/source-manifest.json) 本身 SHA-256 `d7e400dfc1a92ae8e5e82bbb83380f0d1c8425f2ddfe07effb15394cb30c6dd8`。
- 不變 public source-set SHA-256 `ff3b110fe2bb224e85d8125dd5ab3c4098f674a7bb65232e41c57e09a69d98da`。
- release site-set SHA-256 `12bbe904cefe5d3a410282deaaadeb1630b5eae1746a60d2c34ed4c5f89d218a`。
- release manifest 3,892 bytes，SHA-256 `d018c185ebd4b716881518eb15007462a7cea1793bca09b8ca97e42d28410408`。set 算法仍是排序後 `path + NUL + bytes + NUL + sha256 + LF` 的 SHA-256；manifest 逐檔 bytes/hash 可重算。
- `public/`、`dist/`、舊 M1 evidence 及規格對 M1B 起點逐檔比對，來源／產物與範圍檢查見 [verification.json](evidence/m1b/verification.json)。

M1B 起點、最終前、最終後環境 guard 均 PASS，User/Machine 全 Environment fingerprint、PATH hash/type/length、TEMP/TMP metadata 一致，ephemeral entries=0。見 [environment-before.json](evidence/m1b/environment-before.json)、[environment-final-before.json](evidence/m1b/environment-final-before.json)、[environment-after.json](evidence/m1b/environment-after.json)。沒有持久 Windows／Git／gh auth 設定寫入，沒有讀取憑證、安裝、付費或上傳。

後續 browser 驗收者應使用 `release-artifacts/site/`，不使用原 noindex public/dist。保留可見候選警語；canonical／robots 為預定 origin 的離線配置，不是已上線或實際 headers 證據。真 browser／Network／Storage／native／真機／視覺／無障礙仍 **NOT_RUN_USER_FOCUS_INCIDENT**。

本輪 source commit / reviewed commit / released commit 均 **NOT_CREATED_M1B**。未 GitHub、未 hosting、未首頁整合、未另建 chat／子代理／ZIP。無新增依賴或權限需求；下一步由主代理獨立回收 diff 與候選、決定核准的隔離 browser gate，之後再另行決定 M2/M3 放行。


## M2A 追加 · 2026-10-25（目前狀態）

**browser 主代理核心驗收通過／12 個人工或條件項保留；正式站尚未部署、GitHub 尚未推送、外部待驗。** 本輪是 M2A 正式發布來源準備，待主代理審查後另發 M2B。先前 M1/M1B 的歷史狀態與 hash 保留，不覆寫成新版結果。

主代理 B20-BR42 r1 實際 28 PASS、0 FAIL、0 禁止事件，parent-cleanup PASS；兩語 5,000 列真取消、全 bytes 下載、2,001 列分頁、320px、protocol keyboard、真 pagehide 可見清理與 Network/Storage 已驗。12 NOT_RUN 包含兩語 201 列競速（5,000 列已覆蓋）、真 200% zoom、native／實體 IME／AT／真機／heap/BFCache 內部。見 [主代理證據摘要](evidence/m2a/browser-primary-provenance.json)，沒有把保留項改為 PASS。本對話未執行 browser。

實際修改：

- `scripts/release.mjs` 只從 release body 精確移除各 introduction 中唯一的候選提示 p 節點。其餘 head/body 與 M1B 完全相同，preview/public/dist 不變。expected bytes 比對與共同竄改拒絕保留；另外讀取／封閉驗證部署設定。
- `wrangler.jsonc` 新增指定靜態 assets、唯一 custom domain、2026-10-25 date；workers_dev/preview_urls/send_metrics/observability/logs/invocation_logs/traces 全 false。沒有 runtime Worker、bindings、依賴或憑證。
- `scripts/check.mjs` 增加同一部署設定驗證；`test/release.test.mjs` 調整精確 banner oracle、增加 body／manifest 及 config 反例；新增 `test/deployment-config.test.mjs`。release／preview 工具鏈測試暫存根移至 M2A，避免碰凍結 evidence。
- 新增 [M2A-RELEASE.md](M2A-RELEASE.md)，TASK-ENTRY／本 HANDOFF 僅追加；新證據全在 `evidence/m2a/`。
- 舊 14 檔 M1B release-artifacts 完整驗 hash 後移至 [before-release-artifacts](evidence/m2a/before-release-artifacts/)，原 manifest SHA 仍 `d018c185ebd4b716881518eb15007462a7cea1793bca09b8ca97e42d28410408`。當前 active site 重建為 M2A；沒有刪除／覆寫舊證據。

|命令|Exit|結果|
|---|---:|---|
|`node --test test/release.test.mjs test/deployment-config.test.mjs`|0|22/22，0 fail／skip；[stdout](evidence/m2a/release-tests.txt)|
|`npm run check`|0|12 public／25 語法檔；[stdout](evidence/m2a/check.txt)|
|`npm run build:release`|0|13 assets／78,326 bytes；[stdout](evidence/m2a/build-release.txt)|
|`npm run check:release`|0|CHECKED_OFFLINE；[stdout](evidence/m2a/check-release.txt)|

受影響的工具鏈已驗；未重跑未變的核心／UI 套件或 preview build。既有 M1/M1B 測試與 .runs owner/browser evidence 保持原 bytes。逐檔保護／scope／舊新 HTML 精確差異見 [verification.json](evidence/m2a/verification.json)，可審查 [changes.patch](evidence/m2a/changes.patch)。M1B 其餘 11 個 release 資產（含全部 JS/CSS）逐 byte 不變。

固定來源（33 檔／185,414 bytes）source-set SHA-256：`9a5d367350f5bcc755fe05f5ef102b78306dd9edbef2408beaa6c97f5bf9ec47`。新 site-set：`3e5d00db4a6093640cb10af547f7f8f27e8fb3584c526019ff6839a21cea640d`。新 [release manifest](release-artifacts/manifest.json) SHA-256：`fa158ccabe8346e1df911d731d1d163a09d035766ad19f6cac3654107befdd1c`。wrangler.jsonc SHA-256：`fbdf13b1327bac38bd7d8823253c61787c1dc6c2ee1515620cb829285bd04f16`。完整 [source manifest](evidence/m2a/source-manifest.json) 本身 SHA-256：`73e5986c4461502b40debdb9174578d73ba2849c08a7cd50ffba855ec0f698d9`。

環境 guard 前後完整 User/Machine Snapshots 一致，PATH／TEMP／TMP hash/type/length 及全 Environment fingerprint 保留，見 [before](evidence/m2a/environment-before.json)、[after](evidence/m2a/environment-after.json)、[final](evidence/m2a/environment-final.json)。未修改持久設定、Git/auth、既有程序；未讀憑證、未安裝、未呼叫 Cloudflare CLI/API、未推送／部署或另開 chat／子代理。

新 HTML 不再含候選提示，但這不是新版 browser 重跑或實站驗收；舊 frozen harness 的 source-binding 仍指向 M1B HTML，不修改它。由主代理審查這份兩節點 delta 與靜態配置後決定 M2B。Wrangler schema CLI／正式 routing／headers／站點可用性留待主代理部署階段；source/reviewed/released commit 本輪均 NOT_CREATED_M2A，外部驗收未完成。

## M2B 公開來源與復工收尾 · 2026-10-27（最新狀態）

**PUBLIC_SOURCE_VERIFIED；正式 hosting／首頁未執行，外部待驗。** 2026-10-25 公開發布已成功，10/27 依 RESUME-42-M2B-CLOSE 補齊中斷後紀錄，沒有重建 repo、新 commit 或重推。公開 [KYStr/glossquote-labs-table-reconcile](https://github.com/KYStr/glossquote-labs-table-reconcile) 的 main／已審查發布副本 HEAD 均為 [`35d4dc295459824dd27c924b13d941a606625170`](https://github.com/KYStr/glossquote-labs-table-reconcile/commit/35d4dc295459824dd27c924b13d941a606625170)。無認證公開 API 復核 public、main 與全部 59 個檔案 blob 相符，未發現中斷影響本工具既有來源發行。

發布前依追加授權將 compatibility_date 與對應 validator／test 固定為 UTC-safe `2026-10-24`，僅三檔修正。當前 33 檔 source-set `c49494930c7fe8e5df00384a53dfe031b40e71faded1de7f5a171a884650c8b3`；release manifest 仍為 `fa158ccabe8346e1df911d731d1d163a09d035766ad19f6cac3654107befdd1c`，13 資產／78,326 bytes；runtime／public／dist 不變。舊 M2A manifest 及封存 M1B 產物維持原 bytes。

發布副本 22/22 受影響測試、check、release build／check 皆 exit 0；10/27 核對來源、59 檔 allowlist、生成 release 及遠端 bytes 後沿用。發行當時結束 Git guard 已 PASS；完整 Windows 結束 snapshot 於 10/27 補做，原始／復工前／後完整 Snapshots 一致，沒有將它回填為 10/25 即時量測。User／Machine PATH hash、type、length、TEMP／TMP 及全 Environment-key fingerprint 均一致，ephemeral entries=0。

完整副本路徑、逐檔清單、34 個實際命令、歷史包裝器失敗、環境與發布收據見 [M2B-PUBLICATION](M2B-PUBLICATION.md)、[復核證據](evidence/m2b/resume-verification.json)、[命令總表](evidence/m2b/execution-ledger.json)、[環境比較](evidence/m2b/environment-comparison.json)。原 browser 28 PASS／12 NOT_RUN 範圍保留；本輪沒有新增 UI 驗收或 hosting 成功宣稱。沒有讀取憑證值、修改持久設定、browser／native／server／部署／首頁操作、另委派或新增 ZIP。下一階段由主代理整合與決定 M3，不能標成產品外部驗收完成。

## M2C 固定入口修正 · 2026-10-27（最新狀態）

**OFFLINE_FIX_READY_FOR_PRIMARY_REVIEW；本輪未 push／部署，live gate 尚未通過、首頁未上架、外部待驗。** 主代理回報原公開 commit `35d4dc295459824dd27c924b13d941a606625170` 已部署為 version `df67676d-ed8e-430b-9557-9405c840f271`，canonical HTML 與資產 bytes／headers 已核對，但 `html_handling:none` 下 `/` 與 `/en/` 回 404。這項回歸不計作 live PASS。

依 B20-42-M2C，release generator 只新增固定 `_redirects`：`/ /index.html 301`、`/en /en/index.html 301`、`/en/ /en/index.html 301`，共 65 bytes，納入封閉 allowlist 與精確 output／manifest 驗證。`html_handling:none`、wrangler config、canonical HTML、runtime、CSP 和原 13 個 release 資產逐 byte 不變；測試拒絕篡改／缺漏／未知／重複／外部規則及 manifest 共同篡改，並驗證完整 deterministic rebuild。

24/24 相關 tests、check、release build／check 全 exit 0。新 source-set `2227cedcc178331732f49827ca8c8d2e3fb32bb54d431e1717d21f22d789a932`；新 release manifest `12271529426c0330d063d0fb93cbc66575bc9ec8bdfe0185c9fe051f2051f2c8`，14 assets／78,391 bytes。原 active release 完整 14 檔已驗 hash 後封存於 [before-release-artifacts](evidence/m2c/before-release-artifacts/)，原 manifest 仍為 `fa158ccabe8346e1df911d731d1d163a09d035766ad19f6cac3654107befdd1c`。

精確 diff、命令／stdout、官方語法依據、scope／環境比較及尚未驗證項見 [M2C 報告](evidence/m2c/REPORT.md)。來源只改 release generator 與其測試，HANDOFF／TASK-ENTRY 僅追加，舊 evidence 保留。沒有 push／部署／browser／native／OS 輸入／server／首頁／另委派／新增 ZIP，無新增依賴、憑證或持久設定變更；由主代理審查後另行 M2B 補丁 push，再部署並驗三個入口 301／Location 與 canonical 200／bytes／headers／無迴圈。既有 browser 28 PASS／12 NOT_RUN 不變，不能把本機修正當作實站修復完成。

## M2B 補丁公開來源 · 2026-10-27（最新狀態）

**PUBLIC_SOURCE_PATCH_VERIFIED；本修正尚未部署，實站入口 gate／首頁整合／外部驗收待主代理後續處理。** 主代理獨立通過 M2C 固定副本驗收後，已正常推送公開 [KYStr/glossquote-labs-table-reconcile](https://github.com/KYStr/glossquote-labs-table-reconcile) main。新 source／reviewed／remote commit：[`ce9a9260bac2d8ffd31fb5710de946b4996d1ef7`](https://github.com/KYStr/glossquote-labs-table-reconcile/commit/ce9a9260bac2d8ffd31fb5710de946b4996d1ef7)，直接父提交 `35d4dc295459824dd27c924b13d941a606625170`；沒有 force 或根 repo push，既有歷史／發布副本／M2C evidence 保留。

來源仍為 M2C 的 33 檔 source-set `2227cedcc178331732f49827ca8c8d2e3fb32bb54d431e1717d21f22d789a932`；release manifest `12271529426c0330d063d0fb93cbc66575bc9ec8bdfe0185c9fe051f2051f2c8`，14 個生成 site 檔／78,391 bytes。59 檔封閉發布清單保留實際 test tree 全部 11 檔與 synthetic helpers、完整 dist regression fixture 及必要 M1 fingerprint。相對舊公開 commit 只修改 release generator／其測試、兩個 manifest 與公開安全版 README／HANDOFF。

發布副本及新固定提交的潔淨 clone 各自 82/82 tests、check、preview build、release build／check 全 exit 0，生成 bytes 相同。GitHub API、remote ref、public visibility、parent／59 個 blob 清單與無認證公開 API 均核對相符。Git 設定 fingerprints、完整 Windows Environment Snapshots 前後一致；未安裝、讀取憑證值、改持久設定、browser／native／OS 輸入／server／部署／首頁／另委派或新增 ZIP。

發布副本確切路徑、固定 commit 每個 path／bytes／SHA-256、publication receipt、42 個命令與環境 guard 見 [補丁發布報告](evidence/m2b-patch-2026-10-27/REPORT.md)、[收據](evidence/m2b-patch-2026-10-27/publication-receipt.json)、[追蹤清單](evidence/m2b-patch-2026-10-27/tracked-inventory.json)。原 browser 28 PASS／12 NOT_RUN 保留；舊實站入口 404 不因 source push 改為 PASS，由主代理部署後另驗，外部仍待驗。

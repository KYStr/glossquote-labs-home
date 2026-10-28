# 兩張圖片疊合校稿 — B20-53-M1 交接

2026-10-23（Asia/Taipei）。**M1 本地候選已固定，待主代理獨立驗收；不是已發布產品。** 配置請求為 gpt-6.1-sol/max，實際 backend 未獨立確認。

## 結果與檔案

已實作繁中與英文完整靜態介面：初始空頁、明確載入假例子、兩個真實檔案輸入、視覺尺寸／上限驗證、EXIF from-image 一次解碼、白底像素比較、疊合與差異高亮、閾值／占比、fit／100% 畫布局部捲動、取消、清除、PNG／JSON 下載，以及語言切換／範例替換的頁內資料遺失提醒。未支援的裝置安全退出，處理上限 20 秒；沒有雲端 fallback。

來源／設定同步失效；generation 淘汰晚到讀取、bitmap 與 PNG。每批最多 100,000 pixels 後讓出事件循環。bitmap 在讀像素後 close；FileReader 可 abort；只保留兩個來源與像素 buffer，單畫布供 decode／結果使用。下載 URL 只在明確點按時建立，1.5 秒撤銷以留出瀏覽器接管時間。URL 重用以目前結果 revision 歸屬；來源／設定變更同步清除重用映射，舊 timer 僅可清除自己的 lease。pagehide 撤銷所有尚存 URL 並釋放本頁引用。

本工具起始只有規格，根工作區將整個工具資料夾列為 untracked，故沒有既有 tracked 實作 diff。實際變更清單：

- 新增 `package.json`、`.gitignore`；Node24+ ESM、零 runtime/dev dependencies。
- 新增 `public/index.html`、`public/en/index.html`、`public/404.html`、`public/_headers`、`public/styles/app.css`。
- 新增 `public/js/app.mjs`、`controller.mjs`、`locales/{zh-Hant,en}.mjs`、`core/{image-header,pixels,geometry,session}.mjs`。
- 新增 `scripts/{files,check,build,serve,pages,output-evidence,freeze}.mjs`。
- 新增 `test/{core,header,controller,races,browser-bridge,pages,toolchain}.test.mjs`、`test/{fixtures,fakes}.mjs`。
- 新增 [TASK-ENTRY](TASK-ENTRY.md)，更新本 HANDOFF；證據均在 [evidence/m1](evidence/m1/00-REVIEW-M1.md)。`dist/` 的 13 份檔案全由 build 生成。

原規格／AGENTS／docs、兄弟工具、根／共享首頁／看板不在本輪修改範圍。所有來源均自包含，沒有 runtime 跨工具 import。PNG/JPEG parser 以本地 39-image-redactor 模組作唯讀參考，複製後加入本工具的限制、PNG EXIF、完整 JPEG 結尾與 bounded TIFF traversal。

## 固定候選

[固定候選紀錄](evidence/m1/fixed-candidate.json)、[來源前](evidence/m1/source-before.json)與[來源後](evidence/m1/source-after.json)完全相同：

- 固定來源 **44 files / 209,285 bytes**；含實作、測試、腳本與不可變規格。HANDOFF／TASK-ENTRY 是可更新交接紀錄，dist／evidence 另列，不納入此 aggregate。
- SHA-256：`813428cbaead26585edf6d257b4ece8fcec5becfb397f5c53638b7c781eeb245`。
- Aggregate 算法為排序後每檔 `path + NUL + bytes + NUL + sha256 + LF` 的 SHA-256；逐檔 bytes/SHA 可直接核對。
- [dist manifest](evidence/m1/dist-manifest.json)：13 files / 92,534 bytes，每檔 bytes 與 public 相同，preview `noindex,nofollow`。
- Source commit：`NOT_CREATED`；reviewed commit：`NOT_RUN`；released commit：`NOT_CREATED`。

## 實際命令與範圍

Node `v24.14.0`。最後由 `node scripts/freeze.mjs` 透過該 Node 的 npm-cli，以 `shell:false`／`windowsHide:true` 順序執行以下命令；實際 argv 與 exit 見 [commands.json](evidence/m1/commands.json)。

|命令|Exit|實際結果|
|---|---|---|
|`npm test`|0|41 tests，41 pass，0 fail，0 skip|
|`npm run check`|0|13 個 public 檔案；ESM 語法、封閉清單、雙語靜態頁／labels、local import、禁止 API／外部資源、preview 與 headers 靜態檢查|
|`npm run build`|0|13 個 preview 產物；拒絕 symlink／junction、未知來源與 stale 未知輸出；不刪未知檔案|
|`node scripts/freeze.mjs`|0|前後來源一致、public/dist bytes 相同、6 個真實 PNG／JSON 假資料產物核對通過|
|既有 persistent environment guard（前／後）|0 / 0|PASS；兩個完整 Environment fingerprints 與 PATH／TEMP／TMP 前後一致|

T00（3 tests）、T01（19）、T02（27）、T03（35，再補 bridge／工具鏈反例至 40）的歷史 log 保留；最終通過結果為 `t04-final-{test,check,build}.log`。早期 T04 以 exact binary float 比 `0.875` 產生過嚴斷言失敗，歷史來源、40 個 passing tests、check/build logs、部分輸出與原因保留在 [attempt-1-float-assertion](evidence/m1/attempt-1-float-assertion/failure-record.json)。已將證據腳本改為 1e-12 容差；實作仍遵循 `changed / total * 100`，完整 JSON 可能含正常浮點尾數，counts 均為精確整數。

### 主代理審碼修正：下載 lease 競態

主代理發現第一候選會在 A 下載後 1,500ms 內完成 B，再下載同格式時沿用 A 的 URL。已先以固定 fake timer 重現（`node --test --test-name-pattern 'A download' test/races.test.mjs`：修正前 exit 1，修正後 exit 0），保留 `lease-regression-{before,after}-fix.log`。

本次實作只修改 `public/js/controller.mjs` 與 `test/races.test.mjs`。所有已交付 URL 由獨立 Set 管理，當前結果的可重用 lease 另以 Map 與 revision 綁定；invalidate 只清當前映射，A 的 1.5 秒 timer 仍可完成接管，且用物件 identity 檢查，不能移除 B 的映射。回歸同時覆蓋 PNG／JSON：不推進時間，A→B 需新 URL／不同 Blob bytes，執行 A timer 後 B URL 仍可重用，dispose 全部撤銷。

第一候選 40/40 的測試結果未涵蓋此漏洞，**已被取代，不能作為目前候選或主代理驗收 PASS**。[歷史候選入口](evidence/m1/superseded-1-before-lease-fix/ARCHIVE-INDEX.md)保留原 SHA、來源／dist／輸出 manifests、logs、舊 controller／races bytes 與交接原文，未覆寫歷史證據。最新候選為上列 41/41 與新 SHA。

對照 TECHNICAL 第 10 行的 8MiB／16MiB 是來源限制，第 12 行輸出契約沒有 PNG 產物 bytes cap；依主代理要求，本次不新增輸出上限。現有像素／尺寸界線與編碼失敗安全退出維持原規格。

A01–A12 均有純核心／controller 假平台對應。涵蓋閾值嚴格大於、50%／兩端疊合、透明白底、尺寸／EXIF、上限、SVG 偽裝、壞 EXIF／PNG CRC／JPEG 截斷、設定失效、晚到 read／bitmap／PNG、取消／重試／逾時、錯誤碼去除 raw exception、固定檔名與 URL 生命週期。A12 的 DOM 部分仍只有靜態 textContent 規則，真正 DOM／Network 另待 B03。

## 真實輸出證據

[output manifest](evidence/m1/output-manifest.json)列全部 6 檔的 bytes／SHA。假資料畫面為 480×320，標誌水平移動 8 px、底線延長 40 px。精確差異 **1,344 / 153,600 pixels = 0.875%**（頁面顯示最多兩位）。

- [改稿前](evidence/m1/outputs/synthetic-before.png)、[改稿後](evidence/m1/outputs/synthetic-after.png)。
- [50% 疊合 PNG](evidence/m1/outputs/blend-comparison.png)（1,866 bytes）與 [JSON](evidence/m1/outputs/blend-stats.json)。
- [差異高亮 PNG](evidence/m1/outputs/difference-comparison.png)（1,859 bytes）與 [JSON](evidence/m1/outputs/difference-stats.json)。

這些檔案由真實 controller／核心運算，注入 Node 假 decoder／Canvas bridge 與 built-in zlib codec 生成；另 inflate PNG 核對結構、指定像素與 1,344 個高亮像素。**它們不是原生 browser Canvas 或實際下載測試，也不是 UI 截圖。**

## 環境與待驗項

[原始前](evidence/m1/environment-before.json)／[原始後](evidence/m1/environment-after.json)／[原始比對](evidence/m1/environment-comparison.json)及 [lease 修正前](evidence/m1/environment-lease-fix-before.json)／[修正後](evidence/m1/environment-lease-fix-after.json)／[修正比對](evidence/m1/environment-lease-fix-comparison.json)：User PATH 為 ExpandString、834 字元；Machine PATH 為 String、1,227 字元；兩者 ephemeral entries 均 0。PATH SHA 與完整 Environment-key SHA、TEMP／TMP type／length／SHA 均保持一致，亦等於本任務原始 baseline；既有 duplicate entries 只記錄，不改動。

|Gate|狀態與缺口|
|---|---|
|B01 兩語輸入→預覽→下載|NOT_RUN_USER_FOCUS_INCIDENT；native PNG/JPEG 解碼、透明白底／EXIF1–8實際視覺、Canvas 像素、下載檔案與拿走使用仍待真 browser|
|B02 修改／競態／取消|NOT_RUN_USER_FOCUS_INCIDENT；Node 競態已驗，真 browser UI 與下載狀態未驗|
|B03 惡意文字／Network／Storage|NOT_RUN_USER_FOCUS_INCIDENT；未採集真 browser 初載、操作、hidden、離頁 Network／storage／cdn-cgi/rum|
|B04 鍵盤／讀屏／320px／200%／真機／原生|NOT_RUN_USER_FOCUS_INCIDENT；靜態 labels／CSS 不當作視覺、對比、鍵盤、縮放或真機 PASS；原生 picker／下載／列印行為未測|
|B05 語言／首頁／SEO／HTTP／404|NOT_RUN_USER_FOCUS_INCIDENT；僅 preview 靜態與 pure route 單元檢查，未啟動 server 或驗 live headers；正式 canonical／hreflang／robots／sitemap 留 M2/M3|
|GitHub|NOT_PUBLISHED；候選 `KYStr/glossquote-labs-image-overlay`，未獲 M2 放行|
|免費 hosting／雙語首頁|NOT_DEPLOYED；`image-proof.glossquote.com` 只是規格候選|
|主代理獨立驗收／外部驗收|NOT_RUN / NOT_RUN|

必要限制：採 8-bit RGB／灰階 JPEG SOF0/SOF2 與非動畫 PNG；native decode 可因格式、方向、色彩管理或低性能失敗，必須安全停止。Header 檢查不是完整壓縮資料解碼或圖片鑑識。真實瀏覽器色彩處理與 Canvas rounding 需主代理獨立核對。

下一步由主代理讀固定來源與證據，使用已確認不影響使用者輸入的隔離機制完成必要 browser gates，再決定 M2 是否放行。此處不自動跨里程碑續行；單一整合 ZIP 由主代理製作，保留本候選與歷史失敗的各自範圍。

## 2026-10-23 追加：B20-RP-53 M1B 離線發布準備

依最新 `.runs/batch20-release-prep-2026-10-23/TASK.md` 完成有界 M1B。主代理本輪指令確認 M1 核心／CLI 已核對；本輪結果為 **PASS_M1B_OFFLINE_ONLY**，不是 browser、公開或上線驗收。配置請求仍為 gpt-6.1-sol/max，實際 backend 未獨立確認。

實際 diff：新增 `scripts/release.mjs`、`scripts/release-source.mjs`、`scripts/freeze-release.mjs`、`test/release.test.mjs`、[M1B-RELEASE](M1B-RELEASE.md)；package.json 只加 `build:release`／`check:release`，保留既有四個 scripts；.gitignore 加 M1B fixture 規則；`test/toolchain.test.mjs` 只將三處 fixture 根移到 `evidence/m1b/`。本 HANDOFF／TASK-ENTRY 只追加本輪紀錄。新增證據限 `evidence/m1b/`，產物限 `release-artifacts/`。

預定 origin 固定 `https://image-proof.glossquote.com`，toolSlug `image-overlay`；來源 pin 為 M1 lease 修正版的 13 個 public 檔。獨立候選的兩語 head 有自指 canonical 與 zh-Hant／en／x-default 互返，robots 為 index,follow；JS／CSS／404／HTML body 逐 byte 保持原樣。原 `_headers` 只改 X-Robots-Tag，其餘 CSP／隱私／安全 headers 完全保留；robots／sitemap 只列固定網址，沒有 lastmod 或新增 structured data。

`check` 不信任 manifest 提供的 hash：每次先依獨立 M1 pin 驗來源，再重建預期產物 bytes 與 canonical manifest。相同合法輸入重建為驗證後 no-op；來源或輸出有變、manifest 一起被改、缺檔／多檔、未知目錄、symlink／junction、錯參數都拒絕，保留原物且不覆寫／遞迴刪除。

### 本輪實際驗證

[commands](evidence/m1b/commands.json)與完整 `final-*.log` 保存實際結果。先跑新增 release 針對性 11/11，再對最終固定來源順序跑一次完整 suite 與三個 gates：

|命令|Exit|結果／範圍|
|---|---|---|
|`node --test test/release.test.mjs`|0|11 pass，0 fail／skip；全數為離線假資料 copy|
|`npm test`|0|52 tests，52 pass，0 fail，0 skip（原 41＋新增 11）|
|`npm run check`|0|原 M1 public 結構與安全靜態檢查|
|`npm run build:release`|0|15 個 site 資產＋sibling manifest；未重建原 preview|
|`npm run check:release`|0|來源 pin、完整封閉清單、預期 bytes／manifest／SEO 配置一致|
|`node scripts/freeze-release.mjs`|0|上述四命令、固定來源前後、產物 SHA、public／dist／舊 M1 evidence 前後比對|
|既有 environment guard（前／後）|0 / 0|完整輸出 PASS；User/Machine PATH、TEMP/TMP 與全部 Environment fingerprints 一致|

新測試涵蓋兩語 SEO／正確 domain、head 以外原 bytes、跨兩個 fixture 決定性、重建不改 mtime、竄改 SEO／CSS／CSP／robots／sitemap、asset＋manifest 聯合偽造、manifest schema／origin／slug／重複 paths、來源變動連同假 sourceFiles、缺／多／未知檔案或空目錄、source/site/container junction，以及無參數／錯 mode／多參數失敗。沒有對真 public、dist 或使用者資料做負例。

### 固定 bytes 與證據

- 固定來源 **49 files／244,972 bytes**；[source-before](evidence/m1b/source-before.json)與[source-after](evidence/m1b/source-after.json)完全相同。含原不可變規格、實作、scripts／tests 與 M1B-RELEASE；不含可追加的 HANDOFF／TASK-ENTRY、evidence、dist 或 release-artifacts。
- 來源 SHA-256：`f69789f42579396da942fb12f377fb0b861ecffa85b90210406857f5785ff3b8`。
- `release-artifacts/site/`：**15 files／93,595 bytes**。加 sibling manifest 共 **16 files／97,973 bytes**；[artifact manifest](evidence/m1b/artifact-manifest.json)逐檔 bytes／SHA 及 aggregate SHA-256 為 `6b6ba77aa0f4c5dbdd7736c4b1eee6d70cbcbeca4c6f2858e844f8fbd7dc794c`。
- [release manifest](release-artifacts/manifest.json)本身 SHA-256：`166eeb51aee5b522433041911bb3e5de9214d4d345e5dc523c4128aa4e5df50e`；不列入其自己的 files。
- Aggregate 同樣按排序後 `path + NUL + bytes + NUL + sha256 + LF` 計算。artifact manifest 的 path 從本工具根起算。
- [protected comparison](evidence/m1b/protected-comparison.json)：public／dist／全部舊 evidence/m1 **94 files／334,005 bytes** 逐檔完全一致；原捕捉為 depth-first、後記錄全域排序，排序後 entries 一致，非檔案內容漂移。原始 scope aggregate 為 `89ce1cc6f0d7701c4d39345542db362f8512b3723004f3456cb05d747cc9298d`。
- [environment comparison](evidence/m1b/environment-comparison.json)與前／後 JSON：HKCU PATH ExpandString／834、HKLM PATH String／1,227、ephemeral entries 都 0，PATH 與完整 Environment-key fingerprints、TEMP/TMP 全數不變。

### 未驗與交主代理決定

Browser 驗收者應使用 `release-artifacts/site/`；既有 dev 仍服務 preview，不能當作正式候選 SEO 或 HTTP 驗證。兩語真實工作流程、Canvas／EXIF、視覺／鍵盤／縮放、原生／真機、Network／Storage、實際 headers／404 均仍 `NOT_RUN_USER_FOCUS_INCIDENT`。_headers 只是待使用的配置，不是已部署 HTTP 證據。

GitHub `NOT_PUBLISHED`、hosting `NOT_DEPLOYED`、正式首頁 `NOT_INTEGRATED`、外部驗收 `NOT_RUN`；沒有啟動 server／browser 或讀取憑證。來源 pin 的合法更新須另行審核；檔案系統中斷留下的 partial 新候選不會自動清除。主代理接續做獨立審碼／產物核對與必要 browser gates，再另決定 M2；本階段不自行推進發布，也不另建 ZIP。


## 2026-10-27 — B20-53-M2A 正式發布準備

本輪放行只到 M2A，狀態 PREPARED_AWAITING_ROOT_M2A_REVIEW；未 push／deploy／首頁整合／外驗，M2B 由 root 驗收後在原對話另發。完整當前說明見 [M2A-RELEASE](M2A-RELEASE.md)。

新增固定 assets-only wrangler.jsonc／release-config validator，compatibility_date 2026-10-24，domain image-proof.glossquote.com；Worker／vars／bindings 無，workers_dev／preview_urls／send_metrics／observability logs／invocation_logs／traces 均關閉。assets 指向 ./release-artifacts/site，run_worker_first false、html_handling none、not_found_handling none。只新增精確三列 301 _redirects（最後 LF）；manifest schema 2 固定 config bytes/SHA。沒有候選 title 前綴可移除；public、runtime、CSP、既有 15 site 檔及所有舊 evidence bytes 均不變。

先驗原 manifest 166eeb51aee5b522433041911bb3e5de9214d4d345e5dc523c4128aa4e5df50e，完整封存原工具 166 檔至 .runs/batch20-completion-2026-10-27/owner-53-release/baseline/tool-projects/53-image-overlay/，SHA 1482815b85e86143ec7a76dcbd293d12a1c376d8c12c96af1a5375796de96b71。只移動核對過的原 release 容器，未放寬 builder 或覆蓋未知產物。

實際 npm test 57 pass／0 fail／0 skip；check、build、build:release、check:release 均 exit 0。User／Machine PATH type／length／SHA／ephemeral count 與全部 Environment fingerprints 前後完全一致，完整紀錄在 owner-53-release 的 checks-attempt-1、environment comparison、source/artifact manifests、scope-diff 與 summary。

固定來源 52 files／259057 bytes，aggregate SHA-256 6ca6f23f62cc6b37724674a7cc06213a9654b3d0aae6af06a960ade15b780049。產物 17 files／98339 bytes，aggregate SHA-256 91a6d1325e54a0b68b833b334204371bd13edf3b21b4ab99dd1a45c11dcb1d02；site 16 files／93660 bytes。release manifest SHA-256 9dff81068b000859a01f65ad29960ad00de520b48a7f8c4cbd71b9de99c92423；config SHA-256 07e88b12d55444806459f72e9b78f1958e9548c74edd144c7b9c1828a807e466。Aggregate 採排序 path + NUL + bytes + NUL + sha256 + LF；固定 source 排除可追加 HANDOFF／TASK-ENTRY、evidence、dist、release-artifacts。

root r3 真 browser 8 PASS／0 FAIL／prohibited 空，加上 root 親看 7 張截圖，只替換原兩個 keyboard FAIL，合併 40 PASS／12 NOT_RUN。owner 未跑 browser；root 審查 record 及 r1/r3 result hashes 見 browser-acceptance-reference.json。原 12 NOT_RUN 維持；Wrangler dry-run、正式 301／headers／404 transport、publication、hosting、首頁與外驗仍 NOT_RUN。配置請求 gpt-6.1-sol/max，backend 未獨立確認。


## 2026-10-27 — B20-53-M2A-F1 固定 build hook

root 指出 M2A 缺 build，不能通過共同部署 gate。已補精確 build:{command:'node scripts/release.mjs build'} 到 wrangler.jsonc／expected config，新增六種 build 缺少／改動／擴權與偽造 manifest 的拒絕測試；沒有改 public／runtime／CSP、16 site assets 或 release builder。manifest 僅更新 config bytes／SHA；舊 M2A 完整 170 檔已驗證封存到 .runs/batch20-completion-2026-10-27/owner-53-release-r1/baseline/tool-projects/53-image-overlay，原 owner-53-release 證據保持。

受影響 release tests 17 pass／0 fail／0 skip；check、build、build:release、check:release exit 0。原未變 41 項沿用既有證據，不宣稱本輪全套 58 PASS；環境前後一致。新來源 52 files／261961 bytes，aggregate SHA-256 2b1229a213b58dc3f576aad1c09993f9556e64c8e8949a2131b26407834878ac；產物 17 files／98339 bytes，aggregate SHA-256 65b76387835f097f0c6e6b918b4cfe1d4f9e58440991ba0cb70cf529bcb58019；release manifest SHA-256 eb1846452f7d7987c45f6342f3df20d224581a1f33c2646a5d46b12ceecbd43b，config SHA-256 81b027a0932da571072d1dbb32ba0c5520a0c665e140c2b8212bfc5272addff6。固定 source scope 與 aggregate 格式同原 M2A；完整 evidence 在 owner-53-release-r1。

狀態 FIXED_BUILD_HOOK_AWAITING_ROOT_REVIEW；本輪未 UI／Wrangler dry-run／repo create／push／deploy／首頁／外驗。root 表示 GitHub repo create 有頻率限制，後續 M2B 僅可依新指示準備 local copy，不 create。root 邏輯40 PASS／12 NOT_RUN 沿用，未變能力缺口不轉 PASS。


## 2026-10-27 — B20-53-M2B 本機發布副本

依 root 更正後範圍，本輪只準備乾淨副本、本機 commit／inventory；狀態 READY_LOCAL_GITHUB_CREATION_THROTTLED。GitHub repo create／push 未執行，public visibility／remote HEAD／remote bytes 均 NOT_RUN；部署、首頁及外驗仍待 root 後續處理。預定 repo KYStr/glossquote-labs-image-overlay，目前不宣稱存在或已公開。

審核副本 .runs/batch20-completion-2026-10-27/owner-53-publish/publishing-copy；37 個 public／scripts／test／package／config／.gitignore 檔逐 byte 對 root primary-fixes/53-r1 相同。保留必要原規格及 docs，副本 HANDOFF 為允許的新可攜發布說明，原進度與本機環境歷史不進副本；沒有改程式來源。原固定52檔 source 亦逐 byte 維持 F1 版本。

副本使用未變 package scripts 的直接 Node 等價命令，完整58 tests PASS／0 fail／0 skip，check／build／release build／check 全exit0；17 release artifacts 與 root 相同，manifest SHA-256 eb1846452f7d7987c45f6342f3df20d224581a1f33c2646a5d46b12ceecbd43b。本機 branch codex/image-overlay-publication，commit 1c667cb1f2a1bafd3b46eb768836c80bad9ce6a0，69 tracked files／359170 bytes，aggregate SHA-256 d35b315ed5f42d96ebab9fea23cc481e8690fe14d0ea1b33de3b4f0cc2f26b1d；所有 commit blob bytes 逐檔等於副本。

完整 publication-receipt.json、tracked-inventory.json、copy-review、command logs 與guards在 owner-53-publish。Windows Environment 完整 fingerprints 及已知 User/System Git settings 前後相同；沒有 global/system Git 寫入、讀憑證、GitHub動作、UI、Wrangler或部署。Git commit 使用僅該命令的 Codex／codex@local.invalid 身分，停用 system/global Git config、hooks/template與signing，未使用帳戶私密 email。

# 食材差額採買單 — M1 交接

2026-10-23（Asia/Taipei）。**M1 本地候選已實作並通過離線 gate，待主代理獨立驗收。** 尚未完成瀏覽器或產品發布驗收。配置請求為 gpt-6.1-sol/max；實際 backend 未獨立確認。

## 實際成果與修改

新增 28 份執行來源、工具鏈、測試及任務紀錄檔，更新本 HANDOFF；詳細清單見 [changed-paths.json](evidence/m1/changed-paths.json)。13 份唯讀規格／契約與 T00 快照逐檔比對保持不變，未改兄弟工具、共享首頁、看板或根檔案。

- `public/index.html`、`public/en/index.html`、`404.html`、`styles/app.css`：繁中／英文空白工作區、料理需求及可摺庫存、欄位錯誤、來源明細、已買勾選、頁內確認、FAQ、語言／同語首頁連結。單一主動作隨編輯／下載／確認／讀取狀態改變。初始化 disabled；模組未能啟動時仍保留可見能力提示。全部為 noindex 預覽。
- `public/js/core/{quantities,shopping,schema,session}.mjs`：BigInt 千分之一計量、NFC/trim 精確名稱匹配、質量／體積／計數／自訂標籤分鍵、重複需求與庫存先加總再扣抵、採買／足夠／未匹配庫存及原量來源、精確 schema1 與所有上限。
- `public/js/{app,controller}.mjs` 與兩語 locales：真實輸入接核心、TXT／完整報告 JSON／可重新載入的專案 JSON、2 MiB 匯入前檢查與頁內預覽確認、FileReader generation／取消／晚到丟棄、同步失效、固定 ASCII 檔名、單一 Blob URL 所有權、最遲 30 秒或 edit/clear/pagehide 撤銷、明確點按複製及拒絕後可選文字。
- `scripts/{files,check,build,serve,verify,outputs}.mjs`、`package.json`、`.gitignore`：零依賴、封閉 14 檔 allowlist、拒絕未知／junction／symlink、拒絕未知舊輸出而不刪除、語法與靜態安全檢查、僅 127.0.0.1:4234 的精確 GET/HEAD/Host/MIME/404/405 handler。**未啟動 server**。
- `test/{core,controller,app,toolchain}.test.mjs`、`fake-dom.mjs`：手寫期望、邊界／反例／資源競態與兩語事件接線測試。Fake DOM 只驗證接線與狀態，不提供排版、瀏覽器或讀屏證明。
- `dist/**` 為 build 生成，14 份與 public 逐檔 bytes/SHA 相同；[dist-manifest.json](evidence/m1/dist-manifest.json) 記錄產物。無 npm install，無新服務、憑證或持久設定操作。

## 固定候選與實際驗證

最終 run 為 **t04-02**。41 份來源（含 13 份不變契約）共 **185,019 bytes**；前後完整清單位元組一致，records SHA-256：

`23f3db09d25784da3cab2261215b57f9e80ed2c1d50465a1f51a1b16fde1bf0e`

固定清單：[before](evidence/m1/t04-02-source-before.json)、[after](evidence/m1/t04-02-source-after.json)。records SHA 定義為依清單次序的 records 陣列以無縮排 JSON 編碼後雜湊；清單檔本身的 bytes/SHA 與其他彙總見 [candidate.json](evidence/m1/candidate.json)。HANDOFF、evidence、生成 dist 不進來源清單，避免狀態與證據循環雜湊；最終整合 ZIP 仍應由主代理另驗全部封裝位元組。

Node **v24.14.0**；執行 `node scripts/verify.mjs t04`，實際 child 用既有 Node 執行安裝的 npm-cli.js，`shell:false`、`windowsHide:true`。下表三命令皆加暫時的 `--offline --no-update-notifier --no-audit --no-fund`；完整可執行路徑與 argv 見 [commands](evidence/m1/t04-02-commands.json)。

|實際 gate|exit|結果與證據|
|---|---:|---|
|npm test|0|45 tests / 45 PASS / 0 FAIL / 0 skipped；[完整 log](evidence/m1/t04-02-test.log)|
|npm run check|0|14 public 檔、19 ESM 語法檔；[log](evidence/m1/t04-02-run-check.log)|
|npm run build|0|14 份真實 noindex dist；[log](evidence/m1/t04-02-run-build.log)|
|node scripts/outputs.mjs|0|6 份 UTF-8 無 BOM 實檔，共 11,227 bytes；[輸出清單與 SHA](evidence/m1/output-manifest.json)|
|既有 persistent environment guard 前後與比較|0|User/Machine PATH hash、type、length、ephemeral count、全 Environment fingerprint 及 TEMP/TMP fingerprint 不變；[比較](evidence/m1/environment-compare-final.json)|

前後環境快照：[before](evidence/m1/environment-before.json)、[final after](evidence/m1/environment-after-final.json)。A01–A12 全部有實際精確 Node 期望，包括 500g+0.75kg−300g=950g、0.5L+250ml−0.25L=500ml、奶 500g/500ml 分列、零與小數、重複庫存、匯入取消與惡意字串。另有 30/300/300、2 MiB 含 UTF-8 位元組邊界、總量、exactkeys／prototype、非法 Unicode／數字、複製拒絕、失效讀取、清除／pagehide、URL 失敗 cleanup 與 build 負例。

曾有靜態檢查器誤判造成 3 個工具鏈測試失敗；已修正並通過回歸。失敗 log 與早期 verify 同名覆寫限制保留於 [HISTORY](evidence/m1/HISTORY.md)，不將歷史失敗改寫為 PASS。

## 可直接核對的假資料實檔

以下來自實際核心序列化與讀回核對；**不是瀏覽器下載驗收**。

- 繁中：[採買 TXT](evidence/m1/outputs/zh-Hant/pantry-shopping-list.txt)、[完整報告](evidence/m1/outputs/zh-Hant/pantry-shopping-report.json)、[可匯入專案](evidence/m1/outputs/zh-Hant/pantry-project.json)。
- English：[shopping TXT](evidence/m1/outputs/en/pantry-shopping-list.txt)、[full report](evidence/m1/outputs/en/pantry-shopping-report.json)、[importable project](evidence/m1/outputs/en/pantry-project.json)。

## 未驗範圍、風險及主代理下一步

|必要項|狀態|缺少的實際證據|
|---|---|---|
|B01 兩語真實輸入／預覽／本地下載|NOT_RUN_USER_FOCUS_INCIDENT|隔離真瀏覽器端到端、下載接管與使用者可取走的 byte 核對|
|B02 改值／錯值／快速重選／清除／取消|NOT_RUN_USER_FOCUS_INCIDENT|真 DOM 與實際 reader／下載生命週期；Node race 不代替此項|
|B03 注入、全週期 Network／Storage|NOT_RUN_USER_FOCUS_INCIDENT|實際初載、操作、隱藏、離頁及同源/cdn-cgi/rum 檢視|
|B04 鍵盤／焦點／讀屏／320px／200%／真機／權限與原生行為|NOT_RUN_USER_FOCUS_INCIDENT|實際渲染、互動、可及性、瀏覽器下載及剪貼簿權限行為|
|B05 語言／首頁互連、正式 SEO／安全 HTTP／真 404|NOT_RUN_USER_FOCUS_INCIDENT|目前僅靜態預覽與記憶體 handler 測試；正式 HTTP／canonical／hreflang／robots／sitemap 尚未建立或驗收|
|主代理獨立架構／diff／固定候選驗收|PENDING_PRIMARY_REVIEW|主代理自行查實來源與 gate|
|GitHub source/reviewed/released commit|NOT_PUBLISHED|M2 尚未放行，三者均無 commit，不把 source SHA 冒充 Git commit|
|正式 hosting／雙語首頁／外部複驗|NOT_DEPLOYED / NOT_UPDATED / NOT_RUN|M3 主代理範圍及其後外部驗收|

未操作 CUA、IAB、browser、桌面焦點、鍵盤/IME、剪貼簿或 OS dialog；沒有截圖，沒有測試隔離機制。未以 Node 或靜態 CSS 宣稱 WCAG／版面通過。無已知未解決的 M1 Node 失敗；剩餘風險是上表尚未取得的瀏覽器、真機、權限與正式 HTTP 證據。

主代理須先以確認過的真正隔離機制完成必要 browser gate，再決定 M2 放行；原功能對話不得自行前進。預定 GitHub 只限 KYStr/glossquote-labs-pantry-plan，候選子網域 shopping-list.glossquote.com 均不是已發布成果。主代理後續統一加入單一外層 ZIP，本輪不另建使用者交付 ZIP。

## M1B 追加 — 離線發布準備（2026-10-23）

**M1B 已實作並通過離線驗證，待主代理回收獨立驗收。** 本輪派送已確認主代理驗收 M1 核心／CLI；上方 M1 紀錄與舊證據保留原樣。M1B 不等於 M2 放行、正式發布或 browser PASS。明確配置請求仍為 gpt-6.1-sol/max，backend 身分未獨立證實。

實際 diff：新增 `scripts/release.mjs`、`test/release.test.mjs`、[M1B-RELEASE.md](M1B-RELEASE.md)；`package.json` 新增 build:release/check:release、`.gitignore` 加入 release-artifacts、`test/toolchain.test.mjs` 僅將暫存由 evidence/m1 改為 evidence/m1b；TASK-ENTRY 與本 HANDOFF 追加新任務範圍及證據。新增 evidence/m1b 及 release-artifacts 產物。未改 public、dist、原 evidence/m1、唯讀契約、兄弟、根或共享檔案。

release 固定預定 origin `https://shopping-list.glossquote.com` 與 toolSlug `pantry-plan`。14 檔 M1 public 來源 pin、封閉 allowlist、獨立 site/sibling manifest、雙語各一個 canonical 與三個互返 hreflang、精確 robots/sitemap、完整既有安全 headers 僅更改 X-Robots-Tag。JS/CSS/404 等非 SEO 檔 byte 不變，兩語可見 body 不變，preview 仍 noindex。check 依固定來源重建 expected bytes；paired asset+manifest、甚至 source+asset+manifest 一起改仍會拒絕。合法重建僅驗證既有產物，不覆寫；未知、缺檔、junction/symlink、竄改、不完整輸出拒絕並保留原物，不遞迴刪除或自動修復。

|最終實際命令（Node v24.14.0）|exit|結果與證據|
|---|---:|---|
|npm test|0|**69 tests / 69 PASS / 0 FAIL / 0 skipped**，含新增 24 個 release 測試；[log](evidence/m1b/run-01-test.log)|
|npm run check|0|14 public 檔、21 份 ESM 語法；[log](evidence/m1b/run-01-run-check.log)|
|npm run build:release|0|建立 15 份真實 site 資產，74,500 bytes；[log](evidence/m1b/run-01-run-build-release.log)|
|npm run check:release|0|逐檔 bytes／SHA、來源 pin、SEO／安全配置、manifest 重建核對通過；[log](evidence/m1b/run-01-run-check-release.log)|
|持久環境 guard 前後比較|0|User/Machine PATH hash/type/length/ephemeral count、全 Environment fingerprint 及 TEMP/TMP fingerprint 不變；[比較](evidence/m1b/environment-compare.json)|

四命令對同一最終來源執行一次，實際用既有 Node 執行 npm-cli.js，`shell:false`、`windowsHide:true`，暫時 npm `--offline --no-update-notifier --no-audit --no-fund`；完整 argv/exit 見 [run-01-commands.json](evidence/m1b/run-01-commands.json)。另有先行的 24/24 針對性測試，[development-checks.json](evidence/m1b/development-checks.json) 分開記錄，未冒充 browser。未重跑未變的根目錄 preview build；既有 test 中的 build 負例只在新任務臨時 copy 執行。

固定來源 **44 檔／218,280 bytes**（不含 HANDOFF、evidence、生成產物，避免循環雜湊），前後清單一致：[before](evidence/m1b/run-01-source-before.json)、[after](evidence/m1b/run-01-source-after.json)。source records SHA-256：

`66550eb85e078c360ca6c84345705ccb38b820d660e8c34080bd2ef89c853d49`

14 檔 public 共 73,443 bytes，records pin SHA-256 `bd7f4bed29d52631cc9f24b3b93bcb226e441b3a7657eeb4c274f21dc7db4a56`。release **15 檔／74,500 bytes**；外部 [歷史 M1B manifest.json](../../.runs/batch20-completion-2026-10-27/owner-54-release/baseline/release-artifacts/manifest.json) 為 **4,512 bytes**，自身 SHA-256：

`1cc78c1c89b7acca1d1f6ed9a836e3971f0df2c9564ef2f9e4cdcebb09060e0b`

records SHA 定義為排序 path/bytes/sha256 陣列以無縮排 JSON 編碼後雜湊；manifest 自身不列入 site files。完整來源／產物／受保護檔案核對見 [summary.json](evidence/m1b/summary.json)。101 份 protected files 含全部 public/dist/原 M1 證據及唯讀契約，與 [baseline](evidence/m1b/baseline.json) 一致；原 M1 hash 與歷史紀錄未覆寫。環境 [before](evidence/m1b/environment-before.json)、[after](evidence/m1b/environment-after.json) 亦保留。

主代理後續 browser 驗收應使用 **`release-artifacts/site/`**，不是 public/dist；manifest 在 sibling，不是網站資產。詳細重現與失敗處置見 [M1B-RELEASE.md](M1B-RELEASE.md)。`_headers` 是靜態候選配置，不是已部署 HTTP header 證據。若來源或既有 output 不符，工具會停止；不擅自修復或刪除審核材料。

**剩餘 gate／風險：** B01–B05、視覺、鍵盤／讀屏／320px／200%、真機、原生下載／剪貼簿權限、正式 Network/Storage／HTTP／真 404 均仍 `NOT_RUN_USER_FOCUS_INCIDENT`。SEO byte/結構通過不等於實際搜尋收錄或已上線。未啟動 server/browser/CUA/IAB/CDP/native；未讀憑證、未安裝／付費、未改持久 Windows/Git/auth。GitHub source/reviewed/released commit 均無；未部署、未改正式首頁、未外部複驗。本輪無須新增產品決策或依賴；須由主代理獨立驗收候選、補齊隔離 browser gate 並另行決定 M2，後續納入單一整合 ZIP，本對話不自行前進。

## B20-54-H2 追加 — Browser harness r2（2026-10-27）

依 root 指派新增 `.runs/batch20-browser-release-2026-10-25/owner-54-browser-r2/` 完整副本。原 owner-54-browser、產品 public/dist/release-artifacts、既有 M1/M1B 證據不變；前次誤送的 55 任務已取消，55 未修改。requested gpt-6.1-sol/max，backend 身分未獨立確認。

修正限 SEO 資產探測：robots.txt/sitemap.xml 改由同隔離 context 的獨立 page 經 rootguard.goto 讀取並 finally 關閉，沒有 context.request、新 HTTP 通道或 CSP/runtime 改動。原始 response bytes、status、URL、完整 browser header dictionary 與 M1B pin 核對並保留。產品 console 與資產 viewer console 分錄；全部真產品操作／完整下載 oracle／錯誤斷言保留。

只有 root 的 52 r2 證據中兩條精確 Chromium XML viewer inline-style CSP 訊息，在專用資產 page 身分、sitemap phase/target/location、原始 XML bytes/SHA/status/MIME 與未放寬的 CSP/安全 headers 全部核對後，才分類為 viewer 診斷；不刪原訊息。相同文字在產品頁、未知錯誤、來源或政策變動及其他 asset error 仍 FAIL。產品 HTML 頁不再導航到 XML/TXT，SEO 後與 NETWORK 最後 Storage 均檢查 index/en URL、text/html、workspace。

實際差異與說明在新副本 `change.diff`、CHANGES.md、README.md；原開發 diff 保留為 change.initial.diff。舊最終 manifest 原樣保存為 manifest.parent.json。靜態 scope-validation 驗證原 owner 31 份檔案記錄、28 份非變更父檔、26 份 fixture、26 個 case ID、核心產品 case action 區段與產品 console 斷言均保持；產品 public 14／dist 14／release site 15 檔仍符合凍結 M1B bytes/hash。

本輪實際 Node v24.14.0：6 項 `node --check` exit 0；`fixtures/generate.mjs check` 26 份資料自驗 exit 0；`node --test fixtures/asset-audit.test.mjs` **8/8 PASS、0 FAIL、0 skipped、exit 0**；`fixtures/verify-scope.mjs` 靜態核對 exit 0；seal write/check 均 exit 0。Git 只用本地 --no-index/--no-ext-diff/--no-textconv 產生 actual diff，exit 1 為存在差異的正常結果；CRLF 設定只用該次 -c，沒有持久 Git/auth 修改。未重跑未變產品 suite。

新模組封存 **39 檔／4,493,430 bytes（不含 manifest）**；manifest 9,914 bytes，合計 40 檔／4,503,344 bytes。新 manifest SHA-256：

`b6bb187c25ca44b2959bc2baecd81e9f7565b33c9568b305cba89f50c6c4458c`

harness SHA-256：`6e5c0e39f4c862bea32dd48dcea7563c81ba01a4986a1ee08556c388936a34fa`；原版 manifest 仍為 `64601e9e62e931d44eb1a548be98aa2c1eca3cc5fe95b48fcdcde9fc04ba6ccf`。本工具新增摘要見 [H2 summary](evidence/br54-h2/summary.json)，新副本 manifest 逐檔列 hash。

**尚未執行 54 r2 browser**。52 的實際 viewer 錯誤只作本修正依據，不是 54 PASS。26 案例×兩語仍待 root 審查與隔離執行；zoom、hidden、嚴格 read race/late completion、Blob registry、404、原生／真機／AT 的原限制不變。本輪沒有 server/browser/desktop/CDP/native、憑證、安裝、持久系統改動、GitHub、部署或新 ZIP。

## B20-54-M2A 追加 — 發布來源準備（2026-10-27）

**M2A 離線驗證通過，交 root 獨立驗收；待另行派送 M2B。** root 已在本輪前執行 b20-54-r2：**36 PASS／16 NOT_RUN／0 FAIL**、prohibited=[]，parent cleanup PASS；v7 isolation 為 root 派送確認。原 H2 與 M1/M1B 紀錄保留，以上最新結果只更新其後的狀態，不把 NOT_RUN 改為 PASS。requested gpt-6.1-sol/max；backend 身分未獨立驗證。

本輪新增 [wrangler.jsonc](wrangler.jsonc)、`scripts/deployment.mjs`、[M2A-RELEASE.md](M2A-RELEASE.md)，修改 release/check 驗證器與 release 測試、工具鏈測試暫存位置，追加 TASK-ENTRY/HANDOFF。來源與完整 diff 見 [summary](../../.runs/batch20-completion-2026-10-27/owner-54-release/summary.json)。歷史 M1B manifest 連結僅改指向保存副本，原 SHA 與數值不變。

assets-only 設定固定 name=glossquote-pantry-plan、compatibility_date=2026-10-24、custom domain=shopping-list.glossquote.com，關閉 workers_dev/preview_urls/send_metrics 與全部指定 observability 欄位。沒有 main/bindings/env/account_id；assets 指向 ./release-artifacts/site，run_worker_first=false、html_handling=none、not_found_handling=none。build 命令只執行 release builder；check/build:release/check:release 都核對固定設定 bytes。

release 新增三條精確 LF 301 redirects：`/ → /index.html`、`/en → /en/index.html`、`/en/ → /en/index.html`。只有正式 HTML 移除四段候選 suffix，其餘 body、Runtime、CSS、404 與完整 CSP 不變。preview public/dist 仍保持原 M1 noindex bytes/pin；canonical/hreflang/x-default、語言互連與 matching-language 首頁連結保持正確。manifest 的 mode=release-candidate 表示尚未上線的本機候選。

原 M1B 產物先由舊 verifier 通過，完整 16 檔（15 site＋manifest）再安全保存於 [baseline](../../.runs/batch20-completion-2026-10-27/owner-54-release/baseline/release-artifacts/manifest.json)。舊 manifest SHA 仍為 `1cc78c1c89b7acca1d1f6ed9a836e3971f0df2c9564ef2f9e4cdcebb09060e0b`；各檔 bytes/hash 均核對。新 builder 未放寬未知、缺檔、空目錄、不完整、junction/symlink 或竄改產物的拒絕／不覆寫規則。

|最終實際 gate（Node v24.14.0）|exit|結果|
|---|---:|---|
|npm test|0|**76/76 PASS、0 FAIL、0 skipped**，含 31 個 release/config 測試|
|npm run check|0|14 public／22 ESM syntax／固定 assets-only 設定|
|npm run build|0|14 檔 noindex preview；bytes 與歷史相同|
|npm run build:release|0|16 site 檔／74,451 bytes；首次建立新產物|
|npm run check:release|0|來源 pin、設定、allowlist、SEO、完整 bytes/SHA、manifest 核對通過|
|持久環境前後 guard|0|HKCU/HKLM PATH SHA/type/length/ephemeral entries、完整 Environment-key fingerprint、TEMP/TMP 均不變|

完整 argv/exit 與 logs 見 [final commands](../../.runs/batch20-completion-2026-10-27/owner-54-release/final-commands.json)。先行針對性 release 測試 31/31 PASS 另列 targeted log；未以其替代完整 gate。npm 只用 process-local `--offline --no-update-notifier --no-audit --no-fund`，全部 child shell:false/windowsHide:true，沒有新增依賴或安裝。測試暫存改到 evidence/m2a，原 evidence/m1、m1b、br54-h2 不變。

最終測試前後固定來源 **47 檔** records SHA-256：`1690a9c2e87492e812a3b194dd24a77bf227866be7087fecb2ade201040899d5`。此清單排除 HANDOFF、evidence、dist、release-artifacts、node_modules；包含 M2A 文件與全部原始程式。包含本 HANDOFF 的完整來源另列 [source-manifest.json](../../.runs/batch20-completion-2026-10-27/owner-54-release/source-manifest.json)，防止交接文字未列入而不宣稱它參與循環雜湊。

新 [release manifest](release-artifacts/manifest.json) 為 **4,655 bytes**，自身 SHA-256：

`75e907ec5f8851a069c39f06d838387f373ea44cdd10f10ca1a61fe36007072c`

完整來源與 site／manifest／舊產物保存／保護檔案／環境核對，均記於 [summary](../../.runs/batch20-completion-2026-10-27/owner-54-release/summary.json) 與其相對連結。diff 分開列來源與 release 產物，原 archive/hash 不覆寫。本輪沒有另建 ZIP，後續由 root 整合單一外層交付包。

**限制與下一步：** [root 原始 NOT_RUN 理由](../../.runs/batch20-completion-2026-10-27/owner-54-release/root-browser-r2.json) 保留 16 項（8 類×兩語）：真實取消窗口、嚴格 read overlap、真 200% zoom、刻意 late completion、hidden lifecycle、Blob registry revoke、受控 HTTP 404、原生／真機／AT。本輪未執行 browser/server/CUA/IAB/CDP/native，也未將離線測試補作 PASS；未執行 Wrangler CLI/schema/dry-run、憑證讀取、GitHub push、deploy、首頁修改、外部複驗或持久 Windows/Git/auth 變更。GitHub source/reviewed/released commit 與 visibility 尚無新驗證、hosting 未部署、首頁未更新；M2A 完成不表示產品版本完成或可交外部驗收。root 應核對本輪固定來源／diff／產物與未驗範圍，再另派 M2B。

## B20-54-M2B 追加 — 獨立公開 GitHub 來源（2026-10-27）

**來源已公開並完成遠端逐檔核對，未部署或更新首頁。** root 已驗收 M2A actual diff/tests，並在 primary-fixes/54 完成五命令 exit 0、確認來源與 release bytes 相同後，派送此輪。只改本 HANDOFF 與 `.runs/batch20-completion-2026-10-27/owner-54-publish/`；public/scripts/test/package/config 未修改。requested gpt-6.1-sol/max；backend 身分未獨立驗證。

- Repository：[KYStr/glossquote-labs-pantry-plan](https://github.com/KYStr/glossquote-labs-pantry-plan)，API 與 GitHub 連接器均確認 public，default branch 為 `main`。
- Source/reviewed/published commit：[`04ae8647d08c99747d8c7f00f822ce107b242576`](https://github.com/KYStr/glossquote-labs-pantry-plan/commit/04ae8647d08c99747d8c7f00f822ce107b242576)。branch API、remote HEAD、fresh-fetch FETCH_HEAD 均相同。
- Hosting released commit：尚無；此來源 commit 不代表已上線。
- Reviewed publishing copy：`.runs/batch20-completion-2026-10-27/owner-54-publish/publishing-copy/`，獨立 Git repository，沒有從 workspace 根 repo 推送。
- [publication-receipt.json](../../.runs/batch20-completion-2026-10-27/owner-54-publish/publication-receipt.json) 與 [tracked-inventory.json](../../.runs/batch20-completion-2026-10-27/owner-54-publish/tracked-inventory.json) 列固定 commit、branch、public、publishingCopy、完整 files path/bytes/SHA-256 與 releaseManifestSha256。

發布副本 **46 tracked files**；30 份 public/scripts/test/package/wrangler 設定先與 root primary-inputs 及實檔逐 byte 核對。全部必要測試模組及 inline/fake-dom fixtures 保留，不依賴其他 repository 或外部 fixture。只在發布副本整理 README/START-HERE/TASK-ENTRY/HANDOFF 為可獨立閱讀的公開文件；本機 M1/M1B/M2A/H2 證據、環境 fingerprints、`.runs`、其他工具、帳戶資料、憑證、node_modules、dist、release-artifacts 不在 Git tracked tree。根與工具原契約／歷史檔案不改。

|乾淨副本實際命令（既有 Node v24.14.0）|exit|結果|
|---|---:|---|
|npm test|0|76/76 PASS、0 FAIL、0 skipped|
|npm run check|0|14 public、22 ESM syntax、固定 assets-only 設定|
|npm run build|0|14 preview files|
|npm run build:release|0|16 site files、74,451 bytes|
|npm run check:release|0|完整來源 pin／設定／SEO／bytes／SHA／manifest PASS|

實際 executable/argv/logs 見 [clean-commands.json](../../.runs/batch20-completion-2026-10-27/owner-54-publish/clean-commands.json)；全部 shell:false/windowsHide:true，npm process-local offline/no-update-notifier/no-audit/no-fund，沒有 install 或新依賴。乾淨副本測試前後來源一致；測試後只將其公開 HANDOFF 改成記錄實際完成的驗證，不改程式／設定／測試。完整新產物 17 檔（16 site＋sibling manifest）與 root primary-artifacts 逐 byte/hash 相同。release manifest 4,655 bytes，SHA-256 仍為 `75e907ec5f8851a069c39f06d838387f373ea44cdd10f10ca1a61fe36007072c`。

GitHub 連接器缺少建立 repository 的能力，因此以既有官方 gh CLI 建立 public repo；preflight 確認現有 CLI 帳號 KYStr 與目標不存在。推送只用發布副本及 per-command git -c helper 指向已確認的官方 gh executable，沒有讀 token、重新登入、auth setup-git/login/refresh、global/system 寫入、force 或其他權限變更。Git commit 作者用帳號公開 numeric id 的 GitHub noreply email；禁止 debug trace，停用互動提示與 hooks，沒有原生 dialog。

遠端核對先確認 API public/default branch/branch commit，再以 commit API 取得明確 tree SHA，與本機 tree/46 個 blob OID 對齊。`ls-remote --symref` 核對 remote HEAD；另建空 Git object database，真正 fresh-fetch 指定 branch，不 checkout 或啟動產品；從遠端取得的固定 commit 逐檔重新計算 bytes/SHA-256，全部與 reviewed inventory 相同。

**保留驗證器歷史失敗：** 首次遠端 tree API 以 commitish 查詢，回傳 sha 是 commit OID，驗證器卻預期 underlying tree OID，造成一個 assertion exit 1。原 script/logs 與 [verification-history](../../.runs/batch20-completion-2026-10-27/owner-54-publish/verification-history.json) 保留。後續只改用 commit API → 明確 tree OID 的唯讀核對，全部既有嚴格 tree/blob/bytes 斷言保留並通過；來源 commit 不變，沒有第二次 push，不將歷史失敗改寫為 PASS。

完整 [Windows environment compare](../../.runs/batch20-completion-2026-10-27/owner-54-publish/environment-compare.json) 與 [Git settings compare](../../.runs/batch20-completion-2026-10-27/owner-54-publish/git-settings-compare.json) 均 PASS：HKCU/HKLM PATH SHA/type/length/ephemeral entries、完整 Environment-key SHA、TEMP/TMP 前後相同；三個已知 user/system Git config 的 existence/bytes/SHA 前後相同。發布中間 guard 也通過，沒有持久系統或 Git/auth 漂移。

**保留限制：** root r2 的 36 PASS／16 NOT_RUN／0 FAIL 不變；所有 16 項原理由保留，不補作 PASS。本輪沒有 browser/server/CUA/IAB/CDP/native、部署、首頁修改、付費、新服務、遞迴委派或新 ZIP。Wrangler/schema/dry-run、live HTTP/redirect/404/Network/Storage、hosting release、首頁整合與外部驗收仍待 root 後續處理；不標產品完成或外部驗收通過。root 負責下一階段部署及單一外層 ZIP 整合。

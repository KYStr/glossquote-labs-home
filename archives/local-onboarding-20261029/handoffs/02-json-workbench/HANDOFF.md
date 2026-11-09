## 主代理發布收尾 — 2026-10-11

最新公開來源HEAD [b5f03cf59fdd0e99013ab3f3f4a79b9fe5941859](https://github.com/KYStr/glossquote-labs-json-workbench/commit/b5f03cf59fdd0e99013ab3f3f4a79b9fe5941859) 已確認PUBLIC/remote一致；最後README/manifest-only提交未改部署產物。部署來源為 44ce2844ffcab4ed5c90ef066dcfc5dfdf233520，Cloudflare version 0ed10b51-ad10-4b28-b5f3-8c4b91488b3e。首頁兩語均已納入全部10工具並通過HTTP與實際導航。詳見[本輪總表](../review-packages/2026-10-11-release/00-STATUS.md)。必要發布驗收PASS；人工NOT_RUN保留。

> **2026-10-11 最新發布狀態：PUBLIC_SOURCE_VERIFIED / LIVE_HTTP_VERIFIED / PASS_SCOPED_BROWSER。** 正式網站已上線；以下舊的 NOT_DEPLOYED、來源 commit 與整合待辦保留為歷史，現況以文末[本輪發布更新](#release-20261011)為準。人工 NOT_RUN 依該更新保留。

# JSON 檢查與格式化：實作交接

## 2026-10-13 U02 候選（最新工作）

U02-ERROR-LOCATION-20261013：**SOURCE_CANDIDATE_READY_FOR_PRIMARY_REVIEW / WRITE_OWNERSHIP_RELEASED**。已實作「前往錯誤位置」，focused、Chrome兩語與完整gate通過；PUBLIC固定commit **89b9b91746f244af2c99c5ce8711e2c9bcaaf73d**、ZIP／manifest已驗證。新版待主代理獨立驗收及正式部署／外部複驗，不繼承下方舊版本通過。原owner停止本milestone寫入；只保留task-owned loopback給主代理讀取，不再委派、不讀憑證或部署。

## 目前狀態（2026-10-10，THREAD-02-json-workbench）

- **READY_FOR_INTEGRATION**：T00–T09 已完成；本機雙語 MVP 與必要邏輯／可行性gate通過，保留已授權人工NOT_RUN。
- 公開來源：[KYStr/glossquote-labs-json-workbench](https://github.com/KYStr/glossquote-labs-json-workbench)，**PUBLIC**；verified remote HEAD **6e77ac90db5ad07ca0b83ccfac9d1e0ce08be745**。
- 本機最終：npm.cmd test 33/33、npm.cmd run check、npm.cmd run build、npm.cmd run build:release 全 exit0；public始終noindex，dist為候選release（不是部署）。
- Hosting **NOT_DEPLOYED**；00-home／DNS／Cloudflare未改。無新決策或權限需求；主對話依原授權獨立驗收及統一正式部署。
- 交接入口：[docs/RELEASE-CANDIDATE.md](docs/RELEASE-CANDIDATE.md)；[docs/VALIDATION.md](docs/VALIDATION.md)。所有實際改檔與分項命令結果在下方追加紀錄。下方最初藍圖摘要保留為歷史，不代表目前狀態。
- 模型：建立工具接受gpt-6.1-sol／max；後端路由未確認，未自行改模型。無子代理／新chat／跨任務傳訊。

- 藍圖版本：1.0
- 初始日期：2026-09-23
- 產品狀態：NOT_STARTED
- 目前任務：TASKS.md 的 T00（尚未開始）
- 下一步：讀完 START-HERE.md 與 AGENTS.md 後，依 T00 建立規定的基礎。
- 程式碼：尚未建立
- 自動測試：NOT_RUN
- 瀏覽器驗收：NOT_RUN
- build：NOT_RUN
- 發布：NOT_AUTHORIZED

## 已固定的產品決定

以 PRODUCT.md 與 TECHNICAL.md 為準。不要重新詢問已有預設，也不要把未來功能加入 MVP。
目前没有套件鎖定、模型下載或速度量測紀錄；需要者在所屬研究任務建立。

## 進度表

實作開始後逐項追加 TASKS.md 的任務 ID、狀態、日期、證據連結。只記真正做過的事，不預先勾選。

| 任務 | 狀態 | 證據 |
|---|---|---|
| T00 | NOT_STARTED | 尚未執行 |

## 每次交接追加格式

~~~text
日期／模型：
任務 ID：
需求 ID：
變更檔案：
命令與退出碼：
瀏覽器／作業系統：
人工案例與 PASS / FAIL / NOT_RUN：
剩餘問題：
下一步：
~~~

## 發現規格矛盾時

記錄兩份文件的位置、具體矛盾、保守處理方式與需要的決定。未解決前不放寬資料、安全或發布邊界。

## 2026-10-10 — THREAD-02 開始／T00 PASS

- 配置：建立工具已接受 gpt-6.1-sol / max；後端模型路由未確認。未建立子代理、其他對話或跨任務訊息。
- 實際 Node v24.14.0、npm 11.9.0；工作僅本工具與專用 .runs。root Git 既有修改保持原狀，未操作 index／分支。
- 變更：package.json、scripts/{serve,check,build}.mjs、public/index.html、public/styles/{tokens,app}.css、public/js/app.mjs、test/scaffold.test.mjs；project implementationStatus=in-progress；TASKS 新增已授權 T07–T09。
- 驗收：npm.cmd test exit 0（2/2）；check 初次 exit 1（空 test/.tmp 被掃描拒絕），只排除工程規範的 test/.tmp 後 check exit 0；build exit 0。junction 逃逸、raw／encoded traversal、dotfile、NUL、decode error、GET/HEAD/405、MIME、headers 實測通過。
- 證據：.runs/json-workbench/2026-10-10-initial/t00-*.txt（孵化器本機證據，不公開）；環境 before.json PASS，兩 scope ephemeral=0，精確指紋保留供終了比較。
- Parser 方法：逐字 tokenizer 保留 raw；僅 JSON.parse 單一已驗證 string token 做 key 解碼與 Unicode 檢查；有界 recursive descent、有序 entries、新 Set 比對各 object 鍵；排版只寫固定 whitespace＋raw，不轉數字。
- 官方 API 核實：RFC8259、TC39 JSON.parse、WHATWG Encoding/Workers、Node v24 test runner（2026-10-10）；不採用可變外部規則或新套件。
- 瀏覽器 NOT_RUN（骨架尚無互動），不宣稱效能或跨瀏覽器支援。來源尚未發布；網站 NOT_DEPLOYED。下一項 T01。

## 2026-10-10 — T01 PASS

- 變更：public/js/core/lexer.mjs、test/lexer.test.mjs；FR-02/03/05/07，JS-09/10/11/13/14/15/16/18 的 lexer 部分。
- node --test test/lexer.test.mjs 首次 exit 1（自訂定位測試把 d 的起點誤寫成 EOF）；改正測試 offset 7 後 exit 0，6/6。npm.cmd run check exit 0。證據 t01-test[-fixed].txt／t01-check.txt。
- 逐字掃描、size-first、raw／decoded surrogate 成對檢查、固定 offset、無 Number/BigInt 轉換或原文記錄；只有單一 string token 原生解碼。
- 瀏覽器仍 NOT_RUN；下一項 T02 grammar／formatter 全部回歸。

## 2026-10-10 — T02 PASS

- 變更：core/parser.mjs、formatter.mjs；test/parser.test.mjs、formatter.test.mjs。FR-01–07／10；JS-01–19 自動證據完整。
- node --test test/parser.test.mjs test/formatter.test.mjs exit 0（11/11）；npm.cmd test exit 0（19/19）；npm.cmd run check exit 0。證據 t02-focused/test/check.txt。
- 完整 root 耗盡、有序 entries、各 object 精確 decoded Set、深度64／65邊界、prototype 名称保持資料；長數字／escape token逐字比較。writer 4MiB 與多位元組邊界、溢出永久失敗且不回部分結果。
- 無 runtime 依賴。下一項 T03 Worker／可取消 UI；實際瀏覽器尚未驗證。

## 2026-10-10 — T03 PASS（明列人工例外）

- 變更：worker.mjs、session.mjs／test、app.mjs、index.html、app.css、docs/UI-BRIEF.md。固定 schema／jobId、取消／clear／變更失效、每工作新 Worker、完成終止、5秒 watchdog。
- node --test test/session.test.mjs exit 0（3/3）；npm.cmd run check exit 0。
- npm.cmd run dev：127.0.0.1:4182，task-owned session 87482；未觸碰其他 server。測試用 Edge 154.0.4258.62／Windows／獨立 headless context，現有 runtime Playwright，未安裝依賴。預設 Playwright browser binary 不存在，改用既有 msedge 成功。
- JS-21/22/25 PASS：真正 Worker（延遲／無回覆 fixture）、安全文字、取消／clear／mode／source、UNSUPPORTED、實際5秒 TIMEOUT。JS-20 Node PASS。t03-browser.json 保存案例；首個 harness exit 1 因在 disabled→enabled 後讀非 focus 的 outline，既通過案例保留，聚焦鍵盤 harness exit 0。
- JS-26：鍵盤模式與處理／clear、focus雙層、320px、CSS 200%縮放 PASS（t03-keyboard.json、desktop／mobile PNG）。native browser 200% zoom、實體觸控、Firefox NOT_RUN，使用者已准人工例外。桌面與手機渲染檢視：畫布主導、無頁面溢出、標籤／錯誤可讀。
- 匯出仍停用，下一項 T04。

## 2026-10-10 — T03 修正／T04 PASS

- T04 原生 module Worker 的 JS-24 離線測試發現重新取得 worker 模組失敗（瀏覽器原生網路錯誤；初次 harness exit 1）；此必要 gate 未以人工例外略過。
- 回 T03 加 scripts/build-worker.mjs、public/js/worker-source.mjs、test/worker.test.mjs；固定本地模組以獨立 scope 合併，生成內容 check 精確比對；app 以已載入的常數建立 Blob Worker，停止時撤銷 URL；CSP 僅新增 worker-src blob:。另補本地 favicon.svg／MIME，消除浏览器自動 favicon 404。第二 harness 的 console 初載计數纠正為完整載入後的操作區段，不忽略處理請求或來源 log。
- bundle Node protocol／lossless test exit 0（1/1）；build:worker／check exit 0。T04 變更 export.mjs、test/export.test.mjs、app.mjs；encodeOutput 不重新 parse，固定 formatted.json／application/json、UTF-8無BOM、1秒撤銷／重新下載／清除／離頁撤銷，Clipboard 拒絕可手選。
- node --test test/export.test.mjs exit 0（3/3）；check exit 0。worker-browser-final.mjs exit 0，Edge 154 真正 Blob Worker 下 JS-21/22/23/24/25 全 PASS：初次載入後離線直接處理、零新增HTTP、HTML文字安全、下載長數字原文／Unicode、剪貼簿拒絕、空 cookies/storage/IDB、無運算console、URL全部撤銷、延遲取消與真5秒 watchdog。
- 證據 worker-browser-final.json；保留較早 failure 及 scaffold 證據，不覆寫。下一項 T05。

## 2026-10-10 — T05／T06 PASS_WITH_MANUAL_NOT_RUN

- T05：index.html 的獨有 title/description/H1、操作步驟、完整限制、4題FAQ均初始HTML；保留noindex、無canonical或sitemap；app.css FAQ間距。
- T06：npm.cmd test exit 0（26/26）、check exit 0、build exit 0。t06-test/check/build.txt；既通過的 lexer/parser/session/export/Worker inputs 未改不額外反覆跑。
- t06-static-keyboard.mjs exit 0：No-JS静態說明／限制／FAQ、從來源以鍵盤完成 mode/run/結果選取/copy/download/clear、320px、CSS zoom 200% PASS。JS-01–20 Node＋JS-21–25 worker-browser-final，JS-26 專用 keyboard/static 記錄，與真正 browser證據分列。
- native browser zoom200%、Firefox、實體手機／觸控、螢幕閱讀器 NOT_RUN（使用者允許人工例外）。Git diff --check exit 0，但根 tool-projects 未追蹤，發布副本仍需 staged whitespace／內容審查。
- 中文本機 MVP 完成（上述例外），正式 hosting NOT_DEPLOYED，來源待雙語與release工具鏈必要check後發布。下一项 T07。

## 2026-10-10 — T07 PASS

- 變更：public/en/index.html、public/js/locales.mjs、app.mjs、index.html、test/locales.test.mjs。繁中＋英文完整初始 HTML、兩語所有 error/state/export notice、雙向語言連結及同語言首頁。
- npm.cmd test exit 0（28/28）、check exit 0、build exit 0；t07-*命令證據。locale keys對等、全部固定error覆蓋、位置Intl NumberFormat。
- t07-browser 初次 exit 1：EMPTY_INPUT 等待前讀取 running 狀態，harness 加等候 error 後 exit 0。t07-browser-verified.json：兩語真Worker首次離線、零操作HTTP、下載byte比對、copy拒絕、empty/duplicate/dirty結果失效、320px、CSS200%、reducedmotion、No-JS說明全PASS。
- final-ui-zh-Hant/en desktop/mobile PNG；完成第二批一次視覺審查，英文長標籤可重排、操作與錯誤可讀、画布最大、無模板裝飾或頁面水平溢出。不再展開美學修改。
- 人工例外沿用T06；下一項T08。

## 2026-10-10 — T08 PASS

- 變更：scripts/release.mjs、verify-build.mjs、review-source.mjs、build/check/serve；public/404.html、_headers；wrangler.jsonc、.gitignore、package、test/release.test.mjs；README及docs/VALIDATION、RELEASE-CANDIDATE。
- npm.cmd test exit 0（32/32）、check exit 0；preview build exit 0（17 exact assets，robots拒絕抓取、noindex、無sitemap）；release build exit 0（18 exact assets，兩語canonical/hreflang/xdefault、2頁sitemap、robots、404 noindex、CSP與MIME規則）。t08-*.txt。
- 404 actual status/MIME Node test PASS；安全serve、escape拒絕仍PASS。build只操作已驗證本工具dist、拒絕symlink，public未改索引狀態。Source review用明確清單與byte hash，沒有公開根規範／私人TASK-ENTRY／本機證據。
- Wrangler技能目錄1.0.1 stale，找到並讀1.0.2。依使用者零development套件／不部署範圍，未依技能一般安裝建議增加Wrangler；只按官方static-assets/headers、binding、HTML handling、custom404文件準備配置。Wrangler schema/dry-run/live NOT_RUN，主對話部署runtime驗收；沒有paid resource、credential或account/DNS操作。
- Guard environment-after-t08.json PASS／與before完全一致（PATH hash/type/length、full Environment-key fingerprint、ephemeral=0）。現有gh api user顯示KYStr；repo view exit1表示目標repo不存在，不是既有歷史回退。下一項T09 reviewed copy／PUBLIC驗證。

## 2026-10-10 — T09 PASS／READY_FOR_INTEGRATION

- 本工具最終變更：public/{index.html,en/index.html,404.html,_headers,favicon.svg,styles/{tokens,app}.css,js/{app,locales,worker,worker-source}.mjs,js/core/{lexer,parser,formatter,session,export}.mjs}；scripts/{serve,check,build,build-worker,release,verify-build,review-source,publish-source}.mjs；test/{scaffold,lexer,parser,formatter,session,export,worker,locales,release,publication}.test.mjs；package.json、project.json（status欄）、.gitignore、wrangler.jsonc、README、TASKS、HANDOFF、docs/{UI-BRIEF,VALIDATION,RELEASE-CANDIDATE}.md／SOURCE-MANIFEST.json。其他根／工具未由本任務修改。
- 最終命令：npm.cmd test exit0（33/33）；npm.cmd run check exit0（16 static／27 syntax）；npm.cmd run build exit0（preview17 files）；npm.cmd run build:release exit0（release18 files）；stage diff --check exit0；根 git diff --check -- tool-projects/02-json-workbench exit0。根未追蹤程式由publishing copy staged review與SHA256補驗，不假稱根diff覆蓋未追蹤檔。
- node scripts/publish-source.mjs --prepare-reviewed-copy exit0；42來源檔＋自我hash排除的manifest＝43公開檔。manifest SHA256 **8e0c3a8289fb2b1dd6925d6305eb551bba96129e59f351b5195125c0b8bbdc42**。審查過無本機個人路徑／秘密／.runs／dist／其他工具，Git staged bytes逐檔與42 SHA256相符。
- 獨立copy：.runs/github-publish/glossquote-labs-json-workbench（先確認空目錄／不存在repo，保留以後歷史）。git init main、process-only core.autocrlf=false add、staged --check、署名50160413+KYStr@users.noreply.github.com之commit皆exit0；未改全域Git設定、根branch/index或任何持久系統環境。
- gh repo create KYStr/glossquote-labs-json-workbench --public --source . --remote origin --push exit0。gh repo view／gh API main／未用credential helper的git ls-remote HEAD與main皆核對 **6e77ac90db5ad07ca0b83ccfac9d1e0ce08be745**，PUBLIC／main，GitHub recursive tree＝43允許檔案，copy working tree乾淨。證據 publication-copy.txt／publication-verified.json，僅在本機專用證據路徑。
- 上傳公開原始碼與本機完成**不等於網站上線**：json.glossquote.com、兩語homepage catalog、live HTTPS／headers／DNS／Wrangler dry-run皆待原主對話整合；本對話未讀任何token或憑證，也未正式部署。
- 瀏覽器證據沿用已通過且未改的worker-browser-final／t06-static-keyboard／t07-browser-verified。人工NOT_RUN：Firefox、實體手機touch、native zoom200%、screen reader／獨立AA、OS clipboard成功寫入（成功與拒絕fixture已测）、live網站／主機。完整限制與下游數字精度注意均明示。
- Guard **environment-final.json PASS**，與environment-before.json及after-t08完全一致：HKCU ExpandString length834 PATH SHA256 3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb；Environment count18 fingerprint 3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a。HKLM String length1227 PATH SHA256 52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8；Environment count26 fingerprint a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82。兩scope ephemeral=0、TEMP/TMP hash未變。
- Task-owned preview session22009已停止；此前session87482／4888只為自己的CSP/MIME修正重啟。所有測試browser已關閉；沒有終止其他任務或使用者進程。
- 本機release candidate本次追加remote驗證／guard metadata；public source manifest是上述commit的固定快照，後加的workspace交接metadata不冒充該快照。下一步由原主對話讀candidate獨立審查、在其scope依序部署工具與更新兩語首頁。無新增使用者決策。

| Milestone | 判定 |
|---|---|
| T00 | PASS |
| T01 | PASS |
| T02 | PASS |
| T03 | PASS，JS-24缺陷已回擁有任務修正 |
| T04 | PASS |
| T05 | PASS，native zoom200%人工NOT_RUN |
| T06 | PASS_WITH_AUTHORIZED_MANUAL_NOT_RUN |
| T07 | PASS |
| T08 | PASS，部署runtime/live檢查留主對話整合 |
| T09 | PASS；PUBLIC來源verified；READY_FOR_INTEGRATION |


<a id="release-20261011"></a>

## 2026-10-11 正式發布更新

- 狀態：**PUBLIC_SOURCE_VERIFIED / LIVE_HTTP_VERIFIED / PASS_SCOPED_BROWSER**。下列證據取自已保存的主代理發布紀錄；本次文件更新未重跑 Git、部署、HTTP 或瀏覽器測試。家族首頁整合結果由主對話發布報告另行記錄。
- 正式網址：[繁體中文](https://json.glossquote.com/index.html)、[English](https://json.glossquote.com/en/index.html)。
- 公開來源：[KYStr/glossquote-labs-json-workbench](https://github.com/KYStr/glossquote-labs-json-workbench)，**PUBLIC**；verified source commit／remote HEAD 均為 [44ce2844ffcab4ed5c90ef066dcfc5dfdf233520](https://github.com/KYStr/glossquote-labs-json-workbench/commit/44ce2844ffcab4ed5c90ef066dcfc5dfdf233520)（2026-10-11T06:17:26.077Z）；[來源發布 JSON](../../.runs/release-2026-10-11/json-source-publication.json)。
- Cloudflare：正式 host json.glossquote.com，部署 exit code **0**；version **0ed10b51-ad10-4b28-b5f3-8c4b91488b3e**（2026-10-11T06:17:33.939302Z）；[部署 JSON](../../.runs/release-2026-10-11/json-deployment.json)。
- HTTP：**PASS_HTTP**（2026-10-11T06:18:32.431Z）。17 個發布資產的 GET／HEAD 均為 200，GET 精確位元組／SHA256 與發布 dist 對應；HTTPS、CSP/MIME、canonical/alternates、robots/sitemap 檢查通過。兩個不存在路徑為真 404；兩語 browser User-Agent 頁面均為 200 且 SHA256 對應。共 38 筆 HTTP 紀錄；[正式 HTTP JSON](../../.runs/release-2026-10-11/json-live.json)。
- 瀏覽器：**PASS_SCOPED_BROWSER**（2026-10-11T06:13:56.547Z）。英文保留 9007199254740993、-0、1e+9 的原始數字 token；decoded 重複鍵 a／\u0061 拒絕格式化並清空輸出；繁中 {"a":1} 格式化成功。 [本輪瀏覽器 JSON](../../.runs/release-2026-10-11/json-browser.json)。
- 部署後補驗：**PASS_SCOPED_BROWSER**（2026-10-11T06:36:22.773Z），0ed10b51-ad10-4b28-b5f3-8c4b91488b3e 版本英文頁再次保留 9007199254740993、-0、1e+9；[部署後瀏覽器 JSON](../../.runs/release-2026-10-11/json-postdeploy-browser.json)。先前雙語紀錄保留原時間。
- 剩餘人工 **NOT_RUN**：完整 Network/Storage、真 OS clipboard 成功寫入、跨裝置矩陣；原有 Firefox、實體手機／觸控、原生 browser zoom 200%、screen reader／獨立 AA 稽核例外仍保留。 本輪 scoped browser 與靜態 HTTP 驗收不構成完整封包／Storage 稽核。
- 原有本機 MVP gate、產品限制與歷史命令結果維持上方歷史紀錄；本輪新證據取代其舊正式 hosting／live HTTP 待驗狀態，沒有把人工未跑項目改標 PASS。所有時間為 UTC。

## U02-ERROR-LOCATION-20261013 — 實作與本機驗收

- 需求FR-11；精確派發依OUTCOME-UPGRADE-2026-10-12及OUTCOME-BATCH-2026-10-13。只一個milestone，沒有子代理、新chat、跨工具／首頁／共享status修改。
- 實改：public/js/core/error-location.mjs（新）；app.mjs（当下資格核對、原生caret、可見區捲動）；locales.mjs、兩語index.html、styles/app.css（相鄰按鈕／說明／aria）；test/error-location.test.mjs（新）、test/publication.test.mjs；scripts/review-source.mjs只新增本工具U02必要說明allowlist；PRODUCT、UX-SEO、ACCEPTANCE、TASKS、OUTCOME spec、docs/U02-ERROR-LOCATION.md、VALIDATION／RELEASE-CANDIDATE／SOURCE-MANIFEST與HANDOFF。parser／formatter／worker／原匯出／SEO算法不改。
- offset資格：status=error、knowncode、整數0..source.length含EOF、DOM值與產生error的source逐字相等；render/click均重新核對，沒有獨立保存舊offset；遲到仍依jobId/狀態拒絕。
- 初始Chrome長行探測caret offset15400/focustrue但scrollTop0／lineVisiblefalse，保存native-caret-probe.json。加捲動後兩語長行scrollTop35754／lineVisibletrue；寬行offset20017／水平scroll可見，320px也核實scrollLeft到右端且focusoutline2px＋ring。
- Windows／Node24.14.0、npm11.9.0、Chrome154.0.8037.98。既有工具runtime Playwright，無安裝套件／現有user profile。focused3/3 exit0；真Chrome兩語22例exit0＋mobile-current2例exit0；pointer／keyboard／修字後明確重檢／無搶焦點／current+invalid/null/unknown+late race／長文本／CRLF實際DOM／source不變／no auto-work全PASS。
- npm.cmd test **36/36 exit0**；check **17static／29syntax exit0**；build **preview18 files exit0**；build:release **release19 files exit0**。只跑最终程式必要gate一次，未改的已通過證據直接沿用；完整literal數字／Unicode／duplicate／prototype／大小／深度／Worker／匯出gate保留。
- Chrome兩語初次完整載入後offline、精確9007199254740993／-0／1.2300／1e400、formatted.json byte比對PASS；操作HTTP0、console0、無cookies/local/session storage/IDB。Canvas只本機measureText估算当前行，不畫圖或加DOM，字型平台差異的捲動仍屬best effort；插入點座標保持精確。
- 證據全部限.runs/json-outcome-2026-10-13：focused-tests.txt、browser-command.txt、u02-chrome.json、u02-mobile-current.json、各語desktop/mobile-current PNG、npm-test/check.txt、preview/release-build.txt與guard JSON，保留初始探測，未覆蓋其他任務證據。
- environment-before／after-tests PASS且完整Snapshots精確一致（PATH SHA/type/length/ephemeral0、Environment fingerprint、TEMP/TMP）。PUBLIC repo與remote main／HEAD基底b5f03cf59fdd0e99013ab3f3f4a79b9fe5941859對齊、副本clean；沒有root index或persistentGit/env修改。source發布receipt於下節記錄。
- 待主驗候選；人工NOT_RUN=Firefox、實體手機/touch、native200%zoom、screenreader／獨立AA、OS clipboard成功、新版本主代理验收／Cloudflare部署／外部複驗。原live版本不更新、不冒稱新版live。無新決策需求。
- 可用task-owned preview：127.0.0.1:4182/index.html與/en/index.html（exec session10173）。保留給主代理獨立驗收，不殺其他server／進程；所有測試Chrome contexts已關閉。寫入權在source／ZIP交接後釋放。

- 最終review補強：定位只接受INVALID_JSON／INVALID_UNICODE／DUPLICATE_KEY，非位置code即使不一致reply夾帶數值offset也不顯示；aria-invalid跟目前位置資格一致。新增Node同case斷言及Chrome兩語nonpositional補驗，均PASS。因這項實際code變更重跑受影響的必要完整gate，npm-test/check／preview/release-build-final.txt全部exit0（36／17+29／18／19）；原22＋mobile2例正常位置輸入語意未改沿用，不無條件重跑。nonpositional-browser.json兩語null-locationcode拒絕＋正常offset5補驗PASS。

## U02-ERROR-LOCATION-20261013 — PUBLIC固定來源／ZIP與釋放

- [PUBLIC repo](https://github.com/KYStr/glossquote-labs-json-workbench)，main及GitHub API／unauthenticated git ls-remote HEAD與main都核對 [`89b9b91746f244af2c99c5ce8711e2c9bcaaf73d`](https://github.com/KYStr/glossquote-labs-json-workbench/commit/89b9b91746f244af2c99c5ce8711e2c9bcaaf73d)，承接b5f03cf59fdd0e99013ab3f3f4a79b9fe5941859，保留全部既有歷史。GitHub recursive tree=46檔，45來源＋manifest；沒有其他工具／.runs／根規範／dist／node_modules／憑證。
- reviewed副本的13項實際diff已讀，git staged --check exit0，45來源staged bytes與manifest逐份SHA256一致；git commit／push exit0，working tree clean。只有獨立副本index／branch有操作，root repo未commit／branch/index操作；core.autocrlf與empty hooks／signature開關均為命令內設定，未改全域Git或User/Machine環境。
- 固定來源ZIP：[source-89b9b91746f244af2c99c5ce8711e2c9bcaaf73d.zip](../../.runs/json-outcome-2026-10-13/source-89b9b91746f244af2c99c5ce8711e2c9bcaaf73d.zip)，**68,716 bytes**；SHA256 **98660cd0d45ed154b550270b146c2e981ac2316357a79ce0ca46709430a517a4**。ZIP comment含同一commit；46檔名稱與清單一致，45來源bytes／hash逐份相符，自身SOURCE-MANIFEST SHA256 **e94c76e4ba96b28f633a2ce8eb5bda06eb2c503707af6b8044556ec2b3caab78**。manifest自我hash排除，沒有無界抽取或未核對zip。
- [source-zip-manifest.json](../../.runs/json-outcome-2026-10-13/source-zip-manifest.json)、[source-publication.json](../../.runs/json-outcome-2026-10-13/source-publication.json)保存固定artifact及PUBLIC/remote證據。初次git archive繼承既有core.autocrlf=true，45來源出現CRLF轉換、驗證exit1；失敗ZIP以-initial-eol-mismatch.zip保留且不可作候選。改用process-only core.autocrlf=false重新封存，verify-source-zip.py **exit0 PASS_FIXED_SOURCE_ZIP**；沒有改機器設定或重寫公開source。
- 終了environment-final.json **PASS**，與environment-before及after-tests完整Snapshots精確一致。HKCU ExpandString length834，PATH hash3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb，Environment-key hash3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a。HKLM String length1227，PATH hash52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8，Environment-key hasha0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82；兩者ephemeral0／TEMP/TMP type及hash未變。
- Loopback可用：[zh-Hant](http://127.0.0.1:4182/index.html)、[English](http://127.0.0.1:4182/en/index.html)。task-owned exec session10173／PID47704只綁127.0.0.1，保留供主代理驗收；其他進程不動。根read-only diff --check exit0（原root未追蹤工具由獨立stage／hash補驗）。
- **寫入權已釋放**，source snapshot固定，原owner不再改產品或發布副本，等待原主對話收取／獨立diff與功能驗收／正式部署／新版外部複驗；不開新工具、沒有需要新權限／依賴／決策的阻塞。候選未部署，舊live站不當作此版本通過。
- 本節與RELEASE-CANDIDATE發布後receipt是本機交接metadata，不在89b9b91的固定source snapshot內；固定ZIP／source manifest保持原值，主代理須以該commit程式驗收。人工NOT_RUN及Canvas字型量測best-effort風險沿上節明示；requested Sol/max與未確認的backend routing分開。

## 2026-10-13 主代理本批發布驗收

狀態：AWAITING_EXTERNAL_REVIEW；本版外驗 NOT_RUN。PUBLIC來源 `89b9b91746f244af2c99c5ce8711e2c9bcaaf73d`，免費Cloudflare版本 `c971ede6-ec60-450a-b989-119eaac4c5e9`。正式網址 https://json.glossquote.com/index.html 與 /en/index.html。主代理親自閱讀固定diff、執行必要自動gate、固定source ZIP逐檔核對與有限真瀏覽器主要流程；HTTP 48筆回應、18個資產與已測產物逐byte一致，安全標頭及雙語canonical/alternates/x-default/robots/sitemap、404通過。JSON的36項／diff的30項完整測試均exit0；各自詳細數量見本工具對應紀錄。完整Network/Storage、AT/真手機/200%zoom等未驗項保持NOT_RUN；既有structured-data缺漏另列後續共通SEO規格，未宣稱全面SEO通過。主證據位於 `.runs/outcome-batch-2026-10-13/02-checks-89b9b91746f2/results.json`、`02-browser.json`、`02-live-browser.json`、`02-live.json`及`02-zip.json`。首頁原有兩語連結及描述仍符合本次功能；沒有把外部舊版通過套用到新版。


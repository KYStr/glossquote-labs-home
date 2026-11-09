# 活動流程時間表交接

2026-10-16：M1已獲主代理獨立驗收；M2正式候選／公開來源／固定commit ZIP已完成並凍結，等待主代理獨立M2驗收。尚未正式部署／外部驗收。下方保留M1及M2修正過程，最新公開收據見末段。

| 項目 | 狀態 |
|---|---|
| M0 規格 | 已依凍結規格實作，未修改 PRODUCT/TECHNICAL/ACCEPTANCE/TASKS |
| M1 本機 | 最終 88 tests、check、build PASS；人工限制如下 |
| M1 主代理驗收 | PASS：獨立88/88、check/build、250個算術oracle與實際瀏覽器；見根.runs/new-tools-2026-10-16/25-m1-review.md |
| M2 正式候選 / 公開 GitHub | PASS：PUBLIC、verified default commit、固定ZIP與乾淨副本gates；待主代理獨立M2驗收 |
| M3 正式部署與雙語首頁 | NOT_STARTED；主代理專屬 |
| 外部驗收 | NOT_RUN |

原功能對話：01a141fe-9022-7040-9359-bb4c36e0083e，host local。requested gpt-6.1-sol/max，create_thread 已接受指定設定；backend identity 沒有獨立確認，不以自述代替證據。沒有另開對話或委派。

預定 repo KYStr/glossquote-labs-event-timeline、origin agenda.glossquote.com、worker glossquote-event-timeline 均未建立／發布。M1 沒有 commit、push、ZIP、Cloudflare、production toolchain 或首頁變更。

## 固定候選與實際檔案

證據根目錄（根專案相對路徑）：`.runs/event-timeline/W16-25-M1-20261016-01a141fe/`。

- `M1-app-manifest.json`：6097 bytes，SHA-256 `56cd7a398f46b0fa3fdac418dabf81f28764992ddfad37d525f01644c51e3bce`。列出 25 個 app/toolchain/test source files（99952 bytes）及 12 個 preview assets（53799 bytes），每檔均有 bytes/SHA-256。manifest 位於證據目錄，排除自身及可更新交接文件，避免循環。
- Source 沒有 Git commit；本次以固定 manifest 凍結，不觸碰根 repo 的其他變更。dist/ 是 public/ 的固定 allowlist 複本，只有 noindex preview，沒有 production artifact。
- 新增 `package.json`、`.gitignore`。
- 新增 `scripts/files.mjs`、`scripts/serve.mjs`、`scripts/check.mjs`、`scripts/build.mjs`。
- 新增 `public/index.html`、`public/en/index.html`、`public/404.html`、`public/_headers`、`public/robots.txt`、`public/styles/app.css`、`public/js/app.js`。
- 新增 `public/js/core/parse-clock.js`、`parse-duration.js`、`validation.js`、`schedule.js`、`report.js`。
- 新增 `test/helpers.mjs`、`validation.test.mjs`、`schedule.test.mjs`、`report.test.mjs`、`app-harness.mjs`、`app.test.mjs`、`toolchain.test.mjs`。
- 產生 `dist/` 中對應的 12 個 allowlisted preview files；逐檔 bytes 與 public/ 相同。
- 狀態文件：本 HANDOFF、START-HERE、project.json、docs/RELEASE-CANDIDATE；TASK-ENTRY 僅追加。既有 13 份唯讀規格／契約不改門檻。

## 行為與工具鏈

兩語完整原生工作表，以活動列與時間軸為主；初始空白一列。ASCII 時間、整分鐘、1–60 列、720/1440 邊界、次日目標及固定首個錯誤依規格。排序用原生上移／下移按鈕，保留同列焦點，邊界改用該列仍可用的方向鍵。所有名稱／備註只用 textContent/value，英文介面不翻譯使用者內容。

編輯、增刪與排序同步清除結果／report／成功訊息並停用 copy/download。清除與語言切換使用原生 confirm。Clipboard 每次回呼比對 revision/requestId/pageGeneration/pending，過期回呼完全 no-op。每筆下載 URL 獨立保留 60 秒，上限 8；新結果與確認清除不提早 revoke，pagehide 則全數取消 timer/revoke。pagehide 也清空欄位、結果、列數與 module state，persisted pageshow 重新空白。

dev 只提供 public/、綁 127.0.0.1:4205、GET/HEAD、正確 MIME/405/404；不提供規格／測試／scripts、不做 SPA fallback。check/build 離線固定 allowlist，拒絕未知檔案、未知空目錄、symlink/junction/hardlink 及 traversal。build 先驗來源和舊輸出，再重建並比對全部 bytes；不接受殘留未知輸出。靜態掃描是有界檢查，不是完整安全證明。

## 實際命令與結果

實際 cwd 均為本工具資料夾，Node **v24.14.0**，使用 `C:/Program Files/nodejs/npm.cmd`／node.exe。無 npm install、外部依賴或持久 PATH 修改。

| 最終命令 | Exit | 實際結果 / 證據 |
|---|---:|---|
| npm test | 0 | 88/88 PASS，0 fail/skip；final-test.log |
| npm run check | 0 | 12 preview assets、metadata/header、同源資源、ESM 語法 PASS；final-check.log |
| npm run build | 0 | 12 noindex preview assets，逐檔與來源相同；final-build.log |
| npm run dev | running | http://127.0.0.1:4205/index.html；exec session **25202**，請保留 |

88 tests 包含完整 C01–C66、3 個額外 core 邊界／非突變測試、16 個兩語實際 app 模組 controlled tests、3 個工具鏈／loopback HTTP tests。C65 以獨立 Buffer UTF-8 編碼固定 fixture 驗 bytes，沒有改 Acceptance oracle。C64 使用獨立英文名稱 fixture。getter counter 維持 0；row schema/type 失敗的 rowId=null。

最後三命令在候選穩定後各一次，均成功；之後只寫證據與狀態文件，未修改 app。完整摘要為 final-commands.json。

## 真瀏覽器觀察

實際使用 CUA 的 **Codex In-app Browser**，Windows host。工具未提供可獨立確認的 embedded engine 版本。Edge 的 CDP confirm 路徑曾 timeout，不把該路徑當 pass；必要確認改用 IAB 原生 click/key activation 與同次操作內的 getJsDialog.accept/dismiss，沒有修改應用來繞過 confirm。

`browser-evidence.json` 記錄 48 筆觀察；無失敗的 equality/bytes assertions。截圖包括 zh-basic.jpg、en-basic.jpg、兩語 320px error/sixty、zh-320-report.jpg、404-320.jpg、m1-preview.jpg。

| 案例 | 狀態與實際觀察 |
|---|---|
| B01/B02 | 兩語真實頁面、正確 lang/title、4 FAQ、對應語言首頁；noindex/nofollow，無 canonical/hreflang/JSON-LD |
| B03 | 兩語 09:00 +10/35/10 → 09:55，共55；10:00 目標早5，UI 與精確報告相符 |
| B04 | 兩語 23:40 +30/20 → 00:10、00:30，所有次日時刻有標記，共50 |
| B05/B06 | 兩語同 clock／較早同日目標拒絕並聚焦目標；次日合法；清空目標自動 unchecked+disabled |
| B07 | 兩語編輯、增列、刪列及鍵盤排序均同步撤銷舊結果與報告，copy/download disabled |
| B08 | Enter 增／刪／上移／下移；上移至首列後焦點留在該列可用的下移，位置單一 status；首末及唯一列邊界 disabled |
| B09 | 兩語60列新增 disabled，刪回59恢復；確認清除後一列且移除 disabled |
| B10 | 兩語原生取消後欄位／次序／結果／report／notice 完全相同；確認後一列空白；空白清除無 confirm |
| B11 | 兩語原生取消留在原頁保留資料；確認後對應語言頁空白 |
| B13 | 兩語完整 Tab 順序包含欄位、排序、增刪、Clear/Build、report/copy/download；report 可全選、無陷阱。繁中另跑完整鍵盤填寫／增刪／雙向排序／清除取消／Build／全選／原生 copy |
| B15 | 兩語 viewport 320×900，60列、錯誤及report；clientWidth=scrollWidth=305（含瀏覽器 scrollbar），無頁面水平溢位；長80名稱／160備註可換行，report寬273 |
| B19 | 兩語原生寫入後只讀取本次假資料，與目前report完全相等，成功文字正確。API不存在／throw／reject fallback 由實際app controlled tests驗證，未強制改瀏覽器權限 |
| B20 | 兩語 controlled delayed A resolve/reject/finally 在 B pending 時零 DOM/focus writes；B仍busy，B完成才更新。非原生競態證明 |
| B21 | 真實點擊／Enter下載，固定 download attribute；繁中219 bytes、英文204 bytes，與當時report的UTF-8逐byte相同，無BOM/LF。英文實際存檔被瀏覽器加上(2)以避免重名；未改名／刪除既有下載 |
| B22 | 兩語 controlled URLs/timers：8筆上限、各自60000ms、new-result/clear不早撤銷、最早到期恢復；非真實檔案下載證明 |
| B23 | 兩語 controlled pagehide 清 DOM/state/count、取消全部timer/revoke、晚到callback no-op；persisted pageshow空白。真 BFCache persisted 狀態另列未驗 |
| B24 | 兩語名稱 `<img src=x onerror=alert(1)>`、備註類HTML呈現原文，result img count=0，未執行handler |
| B27 | 真瀏覽器未知路徑顯示雙語安全404及noindex；loopback HTTP test獨立驗實際404、headers、非app fallback |
| B30 | native未知頁→Back回來一列空白、無notice/report；語言／清除多輪無舊結果；兩語controlled另各4輪 |

## 人工限制 / NOT_RUN

依主代理 2026-10-16 最後指示凍結最小範圍，不再擴增人工測試。下列不能用 static scan、mock 或窄 viewport 冒稱通過：

- B12 真實中文 IME 組字：NOT_RUN（無可控制 OS IME 的能力）；中文內容真實輸入可用，compositionstart/end 與中途 Build 阻止由兩語 actual-app controlled tests PASS，不能代替實際輸入法相容性。
- B14 真實螢幕閱讀器：NOT_RUN；AX label、錯誤關聯、鍵盤觀察不等於 assistive technology 驗收。
- B16 200% 瀏覽器 zoom：NOT_RUN；未有可驗證的 zoom 控制測試流程，320px 不當作 zoom 證據。
- B17 固定 UI 文案增長40%：NOT_RUN；現有 browser evaluate 限唯讀，未另改正式文案／擴建 stress fixture。B15 長名稱／備註不是本項的替代。
- B18 真手機安全區、虛擬鍵盤及實際 IME：NOT_RUN，只有桌面 viewport 測試。
- B23 真 BFCache event.persisted：NOT_RUN；真實Back只證明回頁空白，controlled lifecycle 不冒充 BFCache。
- B25 DevTools offline-after-load：NOT_RUN，未有完整 DevTools network emulation；不承諾初次離線或重新載入可用。
- B26 完整 Network/Storage 面板：NOT_RUN；未觀察完整網路／storage／cookie／Cache面板。程式掃描與閉合CSP不是完整零遙測證明。
- B28 全面對比與開啟 reduced-motion：PARTIAL/NOT_RUN；已讀實際computed顏色、273px報告寬、44px最小button高度、2px ink outline+6px acid shadow並截圖；未完成所有狀態逐項對比量測或切換偏好。
- B29 真低階裝置：NOT_RUN，無代表性實機；未以桌機效能冒充低階已驗。
- 瀏覽器 embedded engine 版本：available tool 未暴露，未猜測；Node版本已實測。

已開始的原生 clipboard write 無法撤回；只能使過期callback no-op。下載交給瀏覽器後，不宣稱刪除檔案或剪貼簿。離頁不保存是產品設計，不能復原草稿。CSP與static check只是分層控制，不代表完整安全審計。

## Guards、範圍與下一步

environment-before.json、environment-after.json 與 environment-comparison.json：**PASS，兩個完整 Snapshots 精確相同**，含 TEMP/TMP fingerprints。

| 範圍 | PATH registry type / length / ephemeral | PATH SHA-256 | 完整 Environment-key SHA-256 |
|---|---|---|---|
| HKCU | ExpandString / 834 / 0 | 3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb | 3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a |
| HKLM | String / 1227 / 0 | 52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8 | a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82 |

沒有持久環境、registry、PATH、Git/gh auth 寫入或憑證讀取。M1無來源發布區段，Git settings publication guard 為 NOT_APPLICABLE，不把未跑的Git guard說成PASS。只用 Ctrl+C 停止本任務舊 dev session 15542 以載入最後lifecycle修正，新session25202保留；不停止其他服務。

主代理只需以本固定 manifest 做獨立 M1 驗收並決定是否發 M2 GO；沒有未解 oracle 矛盾、路徑衝突或 in-scope 程式 blocker。M2 GO 前停止實作；M2 仍需 reviewed publishing copy、Git/environment guards、production gates、public repo及固定commit ZIP。M3仍是主代理權責，外部review尚未開始。

## W16-25-M2 — 正式候選及來源發布準備

主代理已在本對話明確發 M2 GO，且確認M1人工NOT_RUN依既有授權保留。M2證據根目錄：`.runs/event-timeline/W16-25-M2-20261016-01a141fe/`。沒有重做全部M1瀏覽器；全部12個public檔案的bytes/SHA-256與M1固定manifest完全相同，主代理250個核心oracle可重用。

M2新增 `scripts/production.mjs`、`build-production.mjs`、`check-production.mjs`、`preview-production.mjs`、`release-check.mjs`、`test/production.test.mjs`、`wrangler.jsonc`；修改package scripts、files/check的明確白名單及發布狀態文件。主審SEO修正後正式輸出獨立13檔共56970 bytes，M1 preview仍12檔noindex。正式兩語只改head metadata，body、CSS、執行期JS與M1相同。

origin固定 https://agenda.glossquote.com；canonical /index.html、/en/index.html；互返zh-Hant/en，x-default指繁中；OG語言正確。JSON-LD固定WebApplication，沒有使用者內容或虛構評價。主代理明確允許全站CSP含兩頁各自的精確hash：

- zh-Hant：`sha256-FQOUyZos1xCHMxNd7w9LYVdxf+fDW3qrfo6IgeyrteA=`
- en：`sha256-insoc95oPv7vs7jlyiSXVaMcxVgFE9RRP88Yk82UOQE=`

`_headers`採全站安全header與noindex預設；兩個canonical路徑明確 `! X-Robots-Tag` 移除繼承值，HTML meta仍index,follow；未知404保留noindex。同名headers在Cloudflare是合併而非物件覆寫，故HTTP model現在直接解析候選實際_headers的merge/detach規則。獨立P06同樣讀取原始_headers驗證兩canonical沒有殘留noindex、404/其他路徑仍noindex且安全header完整。依[Cloudflare官方headers規則](https://developers.cloudflare.com/workers/static-assets/headers/)修正，不把local物件覆寫當線上證明。

robots除兩個精確HTML路徑外，允許/js/與/styles/供渲染，其他來源路徑仍Disallow:/；P03以獨立最長匹配oracle驗證兩頁/真實JS/CSS可爬、README/scripts/test/未知頁不放行，資產response仍noindex。依[Google官方robots規則](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)處理。兩個精確JSON-LD hash同時列入script-src，未加unsafe-inline/eval、外部來源或連線許可。Wrangler僅static-assets，設定逐鍵符合主代理exact config；沒有Worker handler、binding、build command、runtime dependency或部署操作。

第一輪workspace npm test93/93、check/build/build:production/check:production各exit0；release:check首次exit1，唯一actual/expected差異是正式M0 DISPATCH.md；主代理確認非憑證且授權明列此檔，僅補精確檔名後check及release:check均exit0，51個source allowlist、其他未知檔仍拒絕。failed/fixed logs均保留，不將第一次失敗寫成成功。

後續主審指出robots渲染資產與Cloudflare header合併兩項缺陷，在同一M2範圍修正，沒有改M1 public。新增／更新6個獨立release oracles全部PASS；含JSON-LD精確文字、OG/SEO、robots/sitemap、exact config、HTTP以及實際_headers合併/移除。預期值獨立手寫，沒有由builder產生expected。最終完整npm test應為94個案例，正式發布副本會重新跑全部必要gates並另記實際exit/count。

production HTTP model：127.0.0.1:5205，current exec session**26152**（保留）；舊task-owned session44210以Ctrl+C停止以載入header/robots修正。5個實際bound HTTP response的status/MIME/robots/安全headers見production-http.json，最終會重新捕捉修正後值。真瀏覽器繁中23:40+30/20→次日00:30、英文09:00+10/35/10→09:55/55/早5，以及metadata/404，見production-browser.json與production-browser.jpg。HTML body、metadata與runtime未受兩項政策修正影響，重用其觀察。這些是本機model，尚非Cloudflare實際線上證據。

M2早期停止點的manifest保留作歷史（M2-candidate-manifest.json，含當時未知DISPATCH判斷）；最終公開來源／候選 manifest 與固定commit ZIP將另列，不覆寫舊證據。M1手動NOT_RUN繼續適用，包括原生clipboard拒絕、JS-disabled／首次離線、完整NetworkStorage、真BFCache、200%／OS高對比、實機IME／手機／低階機與AT；未用mock冒充。

來源發布尚未執行；沒有GitHub repo/remote commit/visibility或ZIP通過宣稱。M2不部署、不改首頁、不再委派。接下來只用reviewed獨立副本與Git/Windows guards完成固定來源發布；所有原M1程序與其他工作保留。

## M2 最終公開收據（2026-10-16）

本節於發布完成後追加至工作區；commit與ZIP保存發布前的同一來源快照，32個程式／測試／工具鏈檔案與工作區完全相同。本收據不改已凍結程式。source publication與hosting分開，M3尚未開始。

| 項目 | 實際結果 |
|---|---|
| Public repo | https://github.com/KYStr/glossquote-labs-event-timeline |
| Visibility | **PUBLIC**，gh repo view實際驗證 |
| Default branch | **codex/m2-source** |
| Verified default commit | **975659c80946c6b4dd806069cef5bc04a4832de2** |
| Remote verification | GitHub commits API SHA及git ls-remote --symref origin HEAD均等於本地commit |
| Publishing copy | 根專案 `.runs/github-publish/glossquote-labs-event-timeline/W16-25-M2-20261016-01a141fe/source-final/`；Git status乾淨 |
| Fixed source ZIP | 本M2證據目錄 `glossquote-event-timeline-975659c80946c6b4dd806069cef5bc04a4832de2.zip` |
| ZIP bytes / files | **134995 bytes / 51 files** |
| ZIP SHA-256 | **102d5d63ab8f6861dbe3232497345b5ac57a3e08f4f1a9e849541fe5226e4cda** |
| ZIP provenance | git archive由固定commit產生，全部entry paths/length/SHA-256與git cat-file讀取的Git blobs精確相同；沒有多檔、缺檔、重複或出界路徑 |
| Clean ZIP source | 本M2證據目錄 `zip-source/`，無依賴安裝 |
| Final candidate manifest | `M2-published-candidate-manifest.json`，**15785 bytes** |
| Manifest SHA-256 | **553259d1b8f0219e88a73a82e710ae5507adc8d31a754a28ecd765b2ae3717dc** |
| Manifest coverage | 51 committed sources共295439 bytes；12 preview檔53799 bytes；13 production檔56970 bytes，逐檔bytes/SHA-256；M1 public12檔hash不變 |
| Artifact comparison | ZIP乾淨build、publishing copy與原工作區的preview/production全檔bytes相同；32個程式檔與commit相符 |

**最後必要gates：** reviewed publishing copy及固定ZIP乾淨解壓副本都實跑 npm test **94/94**、npm run check、npm run build、npm run build:production、npm run check:production、npm run release:check，六個命令全部exit0，無skip。logs為publishing-final-*及zip-final-*，摘要publishing-final-commands.json、zip-final-commands.json。ZIPsource經獨立產物比對後才凍結；此後只更新工作區發布收據與狀態文件，程式碼不變。

source allowlist完整51檔（包含主代理明確核准的DISPATCH.md），Git tree、reviewed copy、ZIP三方一致。未包含dist、dist-production、.git、.runs、node_modules、帳戶憑證或其他工具。publishing-source-manifest.json與fixed-source-archive.json記錄逐檔資料；zip-verification.json記錄archive/file equality。早期缺列DISPATCH的failed gate及兩項SEO修正證據均保留，最終版本不沿用失敗結果。

**Guards：** 官方Git settings guard於init/commit/gh/public push前capture，push後及ZIPgates後verify均PASS，三個known user/system Git config指紋完全不變。只使用既有CLI identity KYStr，所有必要Git設定用每命令-c、空hooks/template/attributes；沒有gh auth setup-git/login/refresh、global/system config寫入或讀出credential。Git guard只涵蓋其三個已知設定檔，不當作所有OS狀態封鎖。

M2 Windows environment-before.json與environment-after-final.json的完整Snapshots精確相同，environment-final-comparison.json PASS；PATH與完整Environment-key hashes均等於本文件M1表中基線：HKCU ExpandString/834/ephemeral0、HKLM String/1227/ephemeral0，含TEMP/TMP指紋未變。沒有新增persistent PATH或其他系統設定。

**保留預覽與限制：** M1 http://127.0.0.1:4205/index.html（session25202），production model http://127.0.0.1:5205/index.html與/en/index.html（session26152）。CUA IAB tab1與tab2均保留deliverable；最終示例截圖production-preview-final.jpg。兩語真瀏覽器主流程/metadata與實際bound HTTP5筆policy結果仍適用；Cloudflare真正live headers/SEO/404、共享首頁與部署由主代理M3驗證。全部既有人工NOT_RUN維持，沒有以source公開或local model宣稱hosting/外部驗收完成。

**主代理下一步：** 獨立核對commit、固定ZIP與M2 manifest後接手M3。無未解程式／來源發布blocker；此對話停止在M2，不部署或修改共用首頁。

## 主代理後續驗收／部署回報（2026-10-16，工作區追加）

目前狀態：**awaiting external review**。以下是主代理在本對話提供的後續事實；原功能對話未重跑live gates，未更動已凍結產品、commit或ZIP。先前M2-only的hosting未部署紀錄是此回報前的快照。

- 主代理已獨立核對公開commit **975659c80946c6b4dd806069cef5bc04a4832de2**、固定ZIP51檔、94 tests與全部六個gates PASS，另250個獨立核心案例PASS。robots資產允許與Cloudflare實際header merge/detach修正均已主審。
- 主代理已部署 https://agenda.glossquote.com，Worker version **afa8367d-ff01-4f4c-9487-4b22e8265923**；最終live HTTP gate **36 responses / 12 assets PASS**。
- 首次`404.html` HEAD曾回500；之後probe與完整gate正常，**根因未確認**。保留此觀察，不將第一次異常省略。
- 正式繁中跨午夜、清空目標、原生clipboard及實際TXT **224 bytes**與當時report相符，主代理回報PASS。此224B屬其live假資料fixture，與本功能M1/M2其他fixture的219B/204B紀錄分開。
- 正式英文頁可讀；本輪主代理瀏覽器控制逾時，checkbox未可靠操作，故**正式英文互動與語言往返維持NOT_RUN**。本機雙語通過不代稱正式英文互動通過。
- 主代理已部署包含24款工具的首頁：source commit **8b0b109d3ca2db6ccb7e52395afbc7d69f65e0f2**，Worker version **e1ca6502-dd51-469f-859a-c40696a003d2**，HTTP **25 responses PASS**。browser catalog與封包工作由主代理接續處理，本對話不宣稱該工作已全部完成。
- 主代理證據（根專案相對路徑）：`.runs/new-tools-2026-10-16/25-release-review.md`、`25-live.json`、`25-live-browser.json`。

所有原有人工NOT_RUN仍保留；取得使用者／外部review確認前，版本不標complete。此後功能修正仍回本原功能對話，主代理負責整合後續發布與首頁；本輪原功能對話已停止在完成M2交接及本段後續事實紀錄。

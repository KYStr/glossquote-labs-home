# 購物單價比較交接

2026-10-13：SPEC_ONLY，主對話正建立完整規格。尚未建立原功能對話，尚無 runtime、測試結果、GitHub 或正式站。下一步：完成規格審查後實際開 chat，請求 gpt-6.1-sol/max，執行 M1/T00。

預定固定 origin https://price.glossquote.com；公開 repo KYStr/glossquote-labs-unit-price。狀態全部 NOT_RUN，非存在聲明。

每次 append 任務 ID、範圍/非目標、改檔、命令/exit、環境 fingerprints、瀏覽器版本/觀察、PASS/FAIL/NOT_RUN、固定 source manifest、發布狀態、風險與下步。歷史不可改寫為新的 PASS。

## 2026-10-13 / M1-T00 凍結交接

狀態：**M1_LOCAL_GATES_PASS_PENDING_PRIMARY_ACCEPTANCE**。本機雙語 MVP 可用，原 owner 凍結實作並釋放給主對話独立驗收；M2/M3 與總目標未完成。依當輪授權沒有 Git commit/push、正式 SEO／部署設定、Cloudflare/DNS、首頁、套件安裝或 credential 讀取。

原功能對話 `01a13362-3924-7c63-9ce4-254ef9985715`，host `local`；主對話提供的 create_thread 返回證據確認已接受請求 `gpt-6.1-sol / max`。**backend 身份未由 host 獨立確認**，不以自述宣稱後端模型或 runtime 切換。Goal 是完整工具交付及 M1→M2→M3→外驗的有界目標，目前維持 active；M1 凍結不是總目標 complete。

### 實際新增／狀態修改

新增 17 個 source 檔案：

- `package.json`、`.gitignore`。
- `public/index.html`、`public/en/index.html`、`public/robots.txt`、`public/styles/app.css`。
- `public/js/app.mjs`、`public/js/i18n.mjs`、`public/js/state.mjs`、`public/js/core/unit-price.mjs`。
- `scripts/assets.mjs`、`scripts/check.mjs`、`scripts/build.mjs`、`scripts/serve.mjs`。
- `test/unit-price.test.mjs`、`test/state.test.mjs`、`test/toolchain.test.mjs`。

只對 4 個准許狀態檔更新：本 HANDOFF、START-HERE、project.json、docs/RELEASE-CANDIDATE。其餘 13 個原規格／政策／README 檔與初始 spec-16 manifest 相符；未改 PRODUCT、TECHNICAL、UX-SEO、ACCEPTANCE、TASKS、AGENTS 或其他工具／根 repo。build 生成忽略的 `dist/`（8 個檔）；測試只在自己 `test/.tmp/` 產生合成 fixtures 並清理自己已驗 containment 的目錄。證據新增於根 `.runs/unit-price/m1-20261013-01/`，保留歷史失敗。

### 行為與檢查

2–12 列、同幣別整組實付價格、每包容量及包數。重量 g/kg、容量 mL/L、整數件數。固定 grammar／raw UTF-16 上限／exact schemas／全列驗證，所有數值解析與排序/half-up 都用 BigInt；只有列號與界面控制用 Number。真實並列保留來源次序，dense rank；顯示碰撞不誤判並列，非零低價不顯示免費。

單一 Product App 精準工作表方向（沿 family tokens / Impeccable bounded Operate），原生 HTML/CSS/ESM，零依賴。範例只填表；類別變更清容量／單位並保留名稱、價格和包數；所有來源變更清結果、copy fallback、busy 並使 request/revision 失效。輸入／名稱只經 value/textContent；合法 HTML 樣名稱在真瀏覽器仍為文字，結果 DOM 沒有 img。pagehide/pageshow 重設空白。人工複製路徑及 revision/request 競爭的邏輯由離線測試覆蓋，原生剪貼簿驗證仍 NOT_RUN。

工具鏈是真實的 loopback/public-only server、syntax/resource/schema/privacy check 及 preview build。拒絕 raw/encoded traversal、hidden、非 GET/HEAD、未知資產、public 和 dist links、任何 junction 祖先、hardlink/stale output；build 不 recursively delete dist，先審核完整既有輸出才寫入，使用獨立 temporary leaf + rename。靜態 HTML 引用檢查涵蓋 case／quote／comments／entities，導航不能成為 script URL 白名單漏洞。文字掃描是輔助證據，不宣稱完整安全證明。

| 命令／gate | 實際結果 | 證據 |
|---|---|---|
| `node --version` / `npm --version` | v24.14.0 / 11.9.0，exit 0 | 本輪命令輸出；source manifest environment 欄 |
| 最終 `npm test` | **56/56 PASS**、0 FAIL/SKIP、exit 0（約 15.7 秒） | `tests-final.txt`；A01–A34、state、工具鏈及 UP-M1-R1 |
| 最終 `npm run check` | PASS、8 public assets、兩語、exit 0 | `check-final.txt` |
| 最終 `npm run build` | PASS、`preview-noindex`、8 assets、exit 0 | `build-final.txt`；逐檔 bytes/hash |
| 真 `npm run dev` | **READY**（仍運行；非已退出 gate） | unified exec session 27389；PID 38864；啟動 2026-10-13T04:13:54.745Z |
| Windows environment guard／比較 | PASS，完整 snapshots 完全相同 | environment-before.txt、environment-after-tests.txt、environment-before-final.txt、environment-after-final.txt、environment-comparison.json |

實際預覽：[繁中](http://127.0.0.1:4196/index.html)、[English](http://127.0.0.1:4196/en/index.html)。port 未占用，沒有更動任何既有服務；預览 Node PID 38864，保留給主驗。server fallback 到 OS port 的情況已用獨立測試占用者驗證。source commit：**NOT_CREATED（M1 未授權 commit/publish）**；正式 repo 和 origin 仍只有目標，沒有存在／可達聲明。

初次 `npm test` 有 **3 個 FAIL（after-hook 清理次序）**：fixture root 先被清理，後續 junction unlink 得到 ENOENT，造成其 server close hook 未完成而測試掛住。確認完整父子 PID/command/startTime 鏈屬於本輪後，只終止自己的 disposable test child PID 67544；紀錄 `owned-test-chain.json`。改為各 junction 個案 try/finally 先关闭自己 server／unlink link，再由 fixture hook 清理。後續 `tests-r1.txt` 與最終 `tests-final.txt` 都 56/56 PASS；歷史 `tests-first.txt` exit 1 保留。沒有批殺、停止占用者或弱化安全斷言。

UP-M1-R1：主對話初審的 `new Array(2)` 與 `[validRow, ,]` 之前被 forEach 跳过；已改有界 index loop + Object.hasOwn，缺列回所在 rowIndex 的 `invalid-row-schema`。新增兩種 sparse 與 inherited entry 回歸，拒絕空／部分結果。最終 core SHA256：`4d0dbceab301fc97410bd79ac458fc866897a68f5ebf040e4e4c5a211041b7de`。

### Windows 指紋

每次 guard 都 PASS；HKCU/HKLM PATH ephemeral-entry count 各為 **0**。以下原值／registry type 全程未改：

| Scope | PATH type／length | PATH SHA256 | full Environment-key SHA256 |
|---|---|---|---|
| HKCU | ExpandString / 834 | `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb` | `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a` |
| HKLM | String / 1227 | `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8` | `a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82` |

full snapshot 比較也包含所有 Environment-key value count、TEMP/TMP 的原型別／長度/hash、entry count、既有 duplicate entries；不是只比 PATH。

### 真瀏覽器逐項

瀏覽器：**Codex In-app Browser**（browser ID 2、自己新建 tab ID 1）。版本 API **NOT_EXPOSED**；read-only evaluator 不提供 navigator/userAgent，不能自造 Chromium 版本。觀察由實際 UI click/fill/select/鍵盤、AX／DOM 和 screenshots 取得，無 Node DOM mock。完整步驟/值/結果在 `browser-verification.json`；代表截圖 `final-zh-desktop.jpg`、`en-desktop-success.jpg`、`en-320-12-products.jpg`、`en-320-table-right.jpg`。只有一次合併桌面／窄版視覺檢查與一次英文錯誤／copy basis 文案修正後的受影響確認；沒有改 CSS 或再探索設計。

| ID | 狀態 | 語言／操作／實際觀察或缺口 |
|---|---|---|
| B01 | **PASS** | zh-Hant→English 可見連結及 English→繁中連結均操作；lang/title/所有 labels、說明、錯誤與結果翻譯完整，切換回空白 2 列。 |
| B02 | **PASS** | 兩語各 Load example，確認 result hidden／Copy disabled；再比較 B rank1 10.0000、1500 g，A rank2 12.0000、1000 g。最終 source 重新載入後兩語再確認數字。 |
| B03 | **PASS** | 兩語成功後首列價格 120→121；result hidden、結果列清空、Copy disabled、各語 status 要求重比，最低價標籤不殘留。 |
| B04 | **PASS** | 兩語先清首列價格比較：required；再跨列輸入容量1e2、價格+1、包數1.5：4 錯誤全列出、值保留、aria-invalid／describedby 關聯，AX focus 是首列價格，沒有結果；最終英文單一 error 文法確認。 |
| B05 | **PASS** | 英文 Add 10 次至12，Add disabled＋上限說明；移除10列回2，所有 Remove disabled＋最少說明，來源動作清結果。 |
| B06 | **PASS** | 英文 weight→volume→count：容量空、mL／piece 重設；價格120/150、名稱A/B、包數2/1保留，Copy disabled／結果清除。 |
| B07 | **NOT_RUN** | 未做原生剪貼簿貼入本機文字編輯器；純文字內容只由 A31/offline驗證。 |
| B08 | **NOT_RUN** | 沒有可用的真瀏覽器 clipboard 權限拒絕／缺失控制；state fallback 測試不是 browser PASS。 |
| B09 | **NOT_RUN** | CUA evaluator 限 read-only，無 clipboard promise 注入／延遲控制；request/revision／晚到成功及拒絕只由 offline tests 覆蓋。 |
| B10 | **NOT_RUN** | 沒有完成 DevTools Network 的載入／輸入／Copy 全程觀察；不能以 static scan 或 console 無錯誤冒充。 |
| B11 | **NOT_RUN（部分觀察）** | 英文輸入後 reload 為空白；載入範例→繁中→back 也空白；未觀察 pageshow.persisted／實際 BFCache entry，所以完整案例仍未驗。 |
| B12 | **NOT_RUN（部分觀察）** | 第一個錯誤焦點、表格 ArrowRight 可達且焦點圈清楚；尚未做全程 Tab/Shift+Tab/Enter/Space/方向鍵及輔助技術檢查。 |
| B13 | **PASS（桌面窄版）** | 英文真 viewport override 320×800、12 個有效商品比較。最初 client/page width305（scrollbar），表區 focus後兩者320，沒有水平頁面溢出；表區 width286/fullWidth832、ArrowRight scrollLeft546，末欄1.0000–12.0000可讀；所有字段／主要按鈕未遮擋。不是實機手機證據。override 已 reset。 |
| B14 | **NOT_RUN** | 未做桌面及手機實際 200% zoom；窄版與 CSS 不代替這項。 |
| B15 | **NOT_RUN** | 可見文字／符號雙重最低標示與 errors 已見；沒有完整對比量測／輔助技術證據，family tokens 靜態採用不冒充 PASS。 |
| B16 | **PASS** | 英文重量例、容量同規格得10.0000/12.0000 per100mL、總量1500/1000mL；件數3×2／6×1，120/150得20.0000／25.0000 per piece，皆6 pieces。 |
| B17 | **NOT_RUN** | 未完整觀察 DevTools network/local/session storage/cookies/IndexedDB；static API scan PASS 另列。 |
| B18 | **NOT_RUN** | 沒有瀏覽器 raw traversal／POST 操作；A34 真 node:http loopback boundary PASS 單獨記錄，沒有當 browser PASS。 |
| B19 | **NOT_RUN** | 沒有可用 JavaScript disabled 的 browser 設定操作；active noscript/app-hidden 靜態檢查 PASS 另列。 |
| B20 | **NOT_RUN** | 未改 OS reduce motion 設定／觀察此狀態；CSS 有 reduced-motion 規則但不是 OS browser驗證。 |

其他瀏覽器、手機實機、原生 clipboard 和完整人工可及性皆 NOT_RUN。所檢查的本工具 tab 最終 console warnings/errors 是空陣列；不是完整 Network 證明。原 preview tab 已 markDeliverable，服務和他人的進程／分頁均保留。

### 固定 manifest／下步

固定 **34 source files**（不含 dist、test/.tmp、.runs）及 8 public/build assets 的逐檔 path/bytes/SHA256：`.runs/unit-price/m1-20261013-01/source-manifest.json`。基準 17 份原規格記錄為 `.runs/new-tools-2026-10-13/spec-16.json`；`spec-pre-status-comparison.json` 證實本 owner 寫狀態前原檔全數一致，最終 immutable-spec-comparison.json 只對13份非狀態文件比較。正式 commit ZIP 未建立，manifest snapshot 不等同 GitHub archive。

沒有已知未解決的必要 M1 functional/toolchain FAIL。限制是上表明列的人工 NOT_RUN、browser version未曝露及尚待主驗。請主對話親讀实际 source/manifest，獨立驗必要 gates/流程，確認 UP-M1-R1，再以原功能對話的實際訊息放行 M2。收到放行前保持檔案凍結；不自行 publish/deploy、改首頁或把版本寫 complete。M2 reviewed source publication 與 M3 免費主機／首頁／外驗各自另立實際證據。

## 2026-10-13 / UP-M1-R2 修正交接（最新凍結）

主對話又以新 synthetic copy 發現 **active meta refresh 被 check/build ACCEPTED**，證據 `.runs/new-tools-2026-10-13/primary-m1/price-refresh-probe.json`；實際 public HTML 沒有該元素，probe 沒有導航或外部網路。已依原 M1 授權修正，沒有改規格／產品演算法／全站 UX。

本次只改 `scripts/check.mjs`、`test/toolchain.test.mjs` 及4個允許狀態檔。HTML attribute parser 完成 entity 解碼後，meta 的 `http-equiv` 經 trim／lowercase 為 refresh 就拒絕；數字實體含有／無分號都解碼。新增6種 refresh（大小寫、單／雙／無引號、十進位／hex entity、缺分號 numeric entity、外側 whitespace）的 check/build 拒絕回歸；每次拒絕後對既有8個 dist asset manifest 比較完全不变。meta 僅在 comment 內的非 active 正例仍允許。沒有對產品頁面植入假 refresh、沒有觸發對外請求、沒有擴成通用 JavaScript 安全分析器。

| 最後 settled gates | 實際結果 | 新證據目錄 `.runs/unit-price/m1-r2-20261013-01/` |
|---|---|---|
| `npm test` | **57/57 PASS**、0 FAIL/SKIP、exit 0，約13.4秒 | `tests-settled.txt` |
| `npm run check` | PASS，exit 0 | `check-settled.txt` |
| `npm run build` | preview-noindex PASS，exit 0，8 files | `build-settled.txt` |
| Windows guard 前後／比較 | PASS；完整 snapshots 與原 M1 初始完全一致 | environment-before.txt、environment-after.txt、environment-comparison.json |

最初 R2 5種 refresh 回歸也57/57 PASS，原 `tests-final.txt` 留存；在同一 entity gate 補充缺分號 numeric 解析與第6變體後，以 `tests-settled.txt` 作最後 accepted evidence，不把早期輸出說成新 source 的證據。

**8個 public/build asset bytes/hash 與先前凍結全數相同**，包括 UP-M1-R1 的 core SHA `4d0dbceab301fc97410bd79ac458fc866897a68f5ebf040e4e4c5a211041b7de`。依主對話明確訊息沿用 `.runs/unit-price/m1-20261013-01/browser-verification.json` 和上表 B01–B20，沒有重跑不受影響的瀏覽器 gate 或新增視覺 QA round。Browser version NOT_EXPOSED，原生 clipboard／Network/Storage／BFCache確認／完整keyboard/contrast/zoom／其他瀏覽器／手機實機／JS-disabled／OS reduced motion 的 NOT_RUN 狀態均未變。

新 **34 source / 8 preview** 固定 manifest：`.runs/unit-price/m1-r2-20261013-01/source-manifest.json`；`freeze-comparison.json` 記錄對前一 manifest 僅6個准許 source paths 變更，13份 immutable 原規格仍相符。前一 manifest／失敗歷史不覆寫。沒有新的 source commit、正式 SEO、source ZIP、GitHub publication、Cloudflare deployment 或首頁修改。

目前狀態 **M1_LOCAL_GATES_PASS_PENDING_PRIMARY_ACCEPTANCE**，修正 R1/R2 後再次凍結並釋放 owner 给主驗；预覽 http://127.0.0.1:4196/index.html 與 /en/index.html，PID38864、session27389繼續保留。沒有已知必要 gate FAIL。下一步仍為主對話獨立接受此固定版本後明確放行 M2；本對話不得自行跳階，總 Goal 未 complete。

## 2026-10-13 / UP-M2-T01 正式候選與公開來源交接（最新）

**READY_FOR_INTEGRATION**。主對話明確M1 PASS／M2放行訊息及親驗報告 `.runs/new-tools-2026-10-13/primary-m1/price-primary-acceptance.md` 已讀；先前待M1接受的authority blocker解除。本輪完成M2，保持凍結並釋放owner給主對話M2驗收／M3整合。完整總目標尚未完成；Cloudflare正式部署、雙語首頁catalog、正式回應／外部複驗仍未執行。

### 實際改檔／範圍

M2新增10個source：public/404.html、public/en/404.html、wrangler.jsonc、scripts/release.mjs、scripts/check-production.mjs、scripts/serve-production.mjs、scripts/cloudflare-dry-run.mjs、scripts/source-files.mjs、scripts/verify-source.mjs、test/release.test.mjs。

M2修改9個可公開source：README.md、package.json、.gitignore、public/index.html、public/en/index.html、public/styles/app.css、scripts/assets.mjs、scripts/check.mjs、scripts/build.mjs；另外只更新4個允許的私有狀態文件（本HANDOFF、START-HERE、project.json、docs/RELEASE-CANDIDATE）。Runtime app/core/i18n/state、原3份tests、serve.mjs全數保持M1 bytes；core仍 `4d0dbceab301fc97410bd79ac458fc866897a68f5ebf040e4e4c5a211041b7de`。原規格除本輪明確准許README／4個狀態檔，其餘12份政策／產品規格無改動，算法／上限／門檻未改。沒有修改兄弟、首頁、根repo／AGENTS／.codex、GlossGate或040141.xyz。

公開來源只用 scripts/source-files.mjs 的28檔allowlist，獨立副本 `.runs/github-publish/glossquote-labs-unit-price/`。不公開private coordination docs、project/chat identifiers、.runs證據、dist、node_modules、.wrangler、env/credential或他人工具；這些從source set排除，不是刪掉孵化器檔案。公開README獨立解說雙語功能、指令、候選／live分別及manual缺口。沒有添加license、runtime/dev dependency或新package installation。

### 正式產物與平台配置

- `build`仍是noindex/nofollow preview10檔、robots Disallow:/；`build:production`由同一受限來源重現生成production13檔（新增_headers/_redirects/sitemap.xml及替換兩語head、robots），不手改dist。不同mode互換只移除已知的generated metadata；unknown stale／hardlink／junction ancestor仍先拒絕。
- 固定origin `https://price.glossquote.com`、中文 `/index.html`、英文 `/en/index.html`；self-canonical、兩語與x-default互返、只有兩URL的XML sitemap／alternate links、robots Allow與固定sitemap。OG title/description/url/locale及JSON-LD WebApplication name/url/description/inLanguage/category和可見內容一致，無ratings/reviews/offers或搜尋保證，不由訪客Host/query生成SEO。
- CSP是default-src none，script-src self及兩段生成JSON-LD原始UTF8 bytes精確SHA256 hash，style/img/font self、connect/worker/object/base/form/frame限制。另nosniff、DENY、no-referrer、camera/microphone/geolocation/payment禁止、COOP、HSTS與no-store。沒有unsafe-inline/eval/report-endpoint。
- Wrangler純assets配置：worker name glossquote-labs-unit-price、compatibility_date2026-10-13、assets ./dist、html_handling none、not_found_handling404-page、固定price.glossquote.com custom domain候選；workers_dev/preview_urls/logs/traces false，無application Worker/bindings。家族零遙測契約优先於Workers skill的通用observability預設，沒有新增logs/traces。
- 根／en入口301到明確canonical filename，unknown path nearest404.html、en/404.html。Node production preview在OS分配loopback port做local HTTP status/MIME/headers/404與拒絕POST/traversal的offline regression；**這是local simulation，不是live Cloudflare runtime證明**。Cloudflare redirect優先於_headers，其實際redirect與canonical／404回應在M3需主對話檢查。
- 同語言首頁backlink：繁中 `https://glossquote.com/index.html`、英文 `/en/index.html`；兩個home HTTP200、lang zh-Hant/en已實測。實際IAB補觀察兩語可見footer link及href，`browser-backlinks.json`。現有M1完整兩語B01–B04證據不以新Node test取代。

官方平台依據：[HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)、[nearest404配置](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)、[_headers](https://developers.cloudflare.com/workers/static-assets/headers/)、[_redirects優先順序](https://developers.cloudflare.com/workers/static-assets/redirects/)。也親讀已安裝Wrangler4.147.0 config-schema及deploy --help，未靠記憶猜旗標。

### 命令與實際結果

全部命令在對應實際目錄執行；Node v24.14.0／npm11.9.0，gh2.96.0、既有Wrangler4.147.0。新證據均 `.runs/unit-price/m2-20261013-01/`。

| Gate／位置 | 結果 | 原始證據 |
|---|---|---|
| Tool `npm test` | 68/68 PASS、0 FAIL/SKIP、exit0 | tests-final.txt |
| Tool `npm run check` | PASS10 public assets、exit0 | check-final.txt |
| Tool `npm run build` | preview-noindex10 assets、exit0 | build-preview-final.txt |
| Tool `npm run build:production`／`check:production` | production13 assets、exit0／0 | build-production-final.txt、check-production-final.txt |
| Tool `npm run test:production` | 11/11 PASS、exit0 | test-production-final.txt |
| Existing Wrangler deploy --dry-run | exit0、No bindings、未upload | wrangler-dry-run-final.txt、wrangler-deploy-help.txt |
| Reviewed publishing copy tests/check/production build-check | 68/68、全部exit0 | publishing-copy-tests/check/build/check-production.txt |
| ZIP解壓副本 tests/check/production build-check | 68/68、全部exit0 | archive-tests/check/build-production/check-production.txt |
| 28檔固定ZIP逐Git blob bytes | PASS，所有100644、未知/linked entry拒絕 | fixed-source-blob-verification.json |
| Root／publishing copy／ZIP production bytes | 13/13全數一致 | source-manifest.json / production comparison |
| Windows guard前後全Snapshots | PASS、PATH/registry type/length/hash/0ephemeral、full Environment keys/TEMP/TMP一致 | environment-before.txt、environment-after.txt、environment-comparison.json |

Production11回歸涵蓋獨立期待的canonical/alternates/OG/JSON-LD/robots/sitemap/CSP hashes、mode transitions、runtime字節不變、SEO/headers/output/config corruption拒絕、stale/linked output不改sentinel、實際localHTTP status/MIME/404/redirects/POST/traversal、homepage navigation不能成script/form漏洞、CLI環境隔離／拒絕.env、固定Git blob與disk差異/未知檔拒絕。原R1/R2、34個core/security案例完整保留；static scanner仍只是輔助，沒有擴成任意JS安全證明。

Dry-run使用已存在的官方CLI（位於先前date-calculator的deploy-tools/node_modules/wrangler，僅讀vendor工具與schema，不引用兄弟產品source）。child home／USERPROFILE／XDG_CONFIG_HOME／WRANGLER_HOME／TEMP/TMP皆自己fresh test/.tmp，固定env白名單無Cloudflare/GitHub credential variables，metrics=false，autoconfig/install-skills=false；拒絕root的.env/.dev.vars名稱而不讀內容。沒有讀授權給主對話的Cloudflare token。CLI訊息Read17包含readdir recursive的13檔＋4dirs；正式manifest檔數13，沒有額外runtime資產。

### PUBLIC來源與固定ZIP

Repo：[KYStr/glossquote-labs-unit-price](https://github.com/KYStr/glossquote-labs-unit-price)；visibility **PUBLIC** 已由gh實測。只在reviewed copy建立独立Git，不操作孵化器根Git、不force、不讀raw credentials；使用已存在gh登入，公開metadata確認login KYStr／public ID50160413，commit author使用對應noreply地址。branch遵codex/前綴：`codex/unit-price-release`。

Git remote HEAD、default branch commit及GitHub API full SHA皆：`49e38e4b3cf9626bde184eae279ec76973a9a033`；github-publication.json。public工作樹clean，28 source blobs和tool source allowlist byte manifests一致。

固定commit source ZIP：`unit-price-source-49e38e4b3cf9626bde184eae279ec76973a9a033.zip`，SHA256 `3caf972c61500715a3014fb558ed8ba386128fe5992de4662ec964eda2eeaaf0`，都在上述專用M2 evidence。以git -c core.autocrlf=false archive生成，明確關閉global attributes/hooks／簽名對本輪操作的影響（command-local，沒有改global/system Git設定）。先核ZIP entry allowlist再Expand-Archive fresh directory；用Git ls-tree/cat-file raw Buffers對每個解壓檔比較，不只驗ZIP hash。從解壓副本完整重test/build/check並與原production13檔比較；沒有拿孵化器build冒充ZIP rebuild。

### 保留歷史／NOT_RUN／下步

M2第一轮67 tests全部PASS；補CLI環境檔拒絕回歸和fixture Git hook/簽名隔離後，final68 tests及production11 PASS。一次準備publish的one-off script因Windows ESM絕對路徑需要file URL而exit1，import在任何copy前失敗；保留prepare-publish.mjs，另建prepare-publish-fixed.mjs並成功copy28檔。create/push實際成功後，一次verification guard誤以為gh repo view的defaultBranchRef包含target.oid而exit1；未重create/push，用default branch name＋GitHub commit API正確核對成功。兩件都不是已隱藏的產品gate FAIL；publish／archive工具原始輸出保留，新manifest是真實最終證據。

人工完整Network／Storage（含/cdn-cgi/rum）、原生clipboard／拒絕／pending promise、真BFCache persisted、完整鍵盤/讀屏/contrast、手機實機/200%zoom、JS-disabled/OS reduced-motion、其他瀏覽器仍按前表逐項 **NOT_RUN**／有限觀察，沒有升成PASS。M2沒有擴瀏覽器能力或改OS設定。M1兩語required主流程owner及主代理實測仍有效；browser engine version未曝露。

**M3 NOT_RUN**：Cloudflare部署/DNS/正式HTTPS/status/MIME/404/security/SEO、live兩語catalog/homepage雙向整合、外部確認。原dev PID38864／session27389及本工具IAB預覽分頁保留，沒有停任何他人程序。source publication和live release分開；請主對話親讀本固定28檔Git tree／ZIP／13產物，獨立接受M2後從固定來源序列部署與更新首頁，保留live/privacy缺口的如實紀錄。owner此刻釋放，保持代碼凍結；源碼已公開但版本尚未完成／尚未awaiting external review。

<!-- primary-handoff-release-2026-10-13 -->
## 2026-10-13 主代理正式發布與驗收

最新固定來源：https://github.com/KYStr/glossquote-labs-unit-price/commit/49e38e4b3cf9626bde184eae279ec76973a9a033（PUBLIC獨立核實）。主代理由固定ZIP逐Git blob核对，再跑68測試及test / check / build / build:production / check:production全通過。37項正式HTTP回應及11資產核對通過；Cloudflare version ffd9aaa0-26fb-4afd-b62a-19b7380699a9。

正式站：[繁中](https://price.glossquote.com/index.html) / [English](https://price.glossquote.com/en/index.html)；雙語首頁已實際列出本工具。已複驗核心與輸入邊界；較低單價比較、修改後失效；M2安全缺頁與導覽。

狀態：**主驗通過，等待外部驗收**。保留原紀錄中的人工NOT_RUN；本輪更精確的瀏覽器範圍見批次驗收包，24正式英文頁Edge封鎖未繞過。沒有把發布前固定文件的NOT_RUN視為最新狀態，也沒有將自動或HTTP測試冒稱真裝置/AT/完整Network與Storage測試。

主證據：`.runs/handoff-release-2026-10-13/`；工作區狀態註記不是固定公開commit內的檔案。
<!-- primary-handoff-release-2026-10-13-end -->

<!-- external-followup-accepted-2026-10-16 -->
## 2026-10-16 主代理採納外部複驗

固定版本 `49e38e4b3cf9626bde184eae279ec76973a9a033` 標記 **外部測試通過（本輪核心與雙語離線受測範圍）**：68項原測試、1,000組對照、6項雙語離線核心操作。這些是外部實跑結果；主代理已核對版本、回報及封裝完整性，未在本輪重跑整套。

完整正式站Network／Storage、原生操作與真機等仍待驗；NEL停用的提供者紀錄比對一致，不代表既有瀏覽器policy／queue全部清除。沒有新增確認產品缺陷，無需產品返工或重發。詳[最新外驗總表](../EXTERNAL-FOLLOWUP-2026-10-16.md)。本註記不改公開固定commit；下方／上方較早等待外驗狀態保留為歷史。
<!-- external-followup-accepted-2026-10-16-end -->

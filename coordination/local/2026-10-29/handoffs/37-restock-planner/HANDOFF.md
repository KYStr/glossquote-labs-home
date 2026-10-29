# 補貨數量試算交接

## 目前交付：M2-R1 config + production favicon 已 PUBLIC

2026-10-19，依主代理窄 scope 修正，新增根 `wrangler.jsonc`，精確固定 worker `glossquote-restock-planner`、compatibility_date `2026-10-19`、`./dist-production`、html_handling none／not_found_handling 404-page、restock.glossquote.com custom_domain，且 workers_dev／preview_urls／send_metrics／observability 及 logs/traces 全 false；沒有 main、build、binding 或付費資源。

新 PUBLIC commit **`081933a80455eaedd61b8453c0bf1103c14f79d7`**，branch 仍 `codex/m2-production`，remote 與 GitHub API 同值。新 source ZIP `config-r1/restock-planner-source-081933a80455.zip`，60 檔、116,183 bytes，SHA-256 **`d2bb942e4cacbc99e8453d5e933af838f2da123844b2daf57c5e60a025545b94`**；每檔比對 Git blob／bytes／SHA，root package.json 與安全 ZIP 路徑、相對文件連結均驗證。原 `7fb1a338…` commit／57 檔 ZIP／`afdcdda5…` hash 和舊證據保留。

另依主代理補充授權，修正 production 原先沒有 icon 的體驗／觀測缺口：新增 `scripts/assets/favicon.svg`，builder 放入 production 並在兩語 head 明列 `/favicon.svg`；SVG 無 script／外連／foreignObject，CSP 保持 img-src 'self'，robots 放行該檔，HTTP 驗證 SVG 200/MIME/bytes/HEAD。沒有泛略 console。Owner 未執行 browser，是否仍有瀏覽器自行要求 `/favicon.ico` 由主代理真實 release 檢查，不虛報已觀察；explicit SVG 與同源 HTTP 已驗。

Production 因這項授權由 14→15 檔（14 條 served route），inventory SHA-256 **`4e0813a88d456c4c3608c1524c0809e149bebc3d4ad8f6eed317064272298d71`**。原 14 檔只有兩語 HTML head 和 robots 三檔改動，其餘 11 檔 bytes 不變；原 M1 public/dist 10+10 與六份規格及契約不變，production footer 仍是中性 Gloss Tools 品牌。

本輪只重跑受影響 gates：workspace 及乾淨 copy 各 **7 項 focused config/production tests PASS**、check 32 syntax、build:production、check:production、release:check **97 requests**，均 exit 0。重用未變的 M1／核心／HTTP 舊證據，不聲稱新跑全套 96 tests。新公開來源相對前 commit 只改 9 個 paths（config、SVG、必要 MIME/builder/HTTP/fixture 支援、聚焦測試與公開 HANDOFF）；沒有改演算法、runtime JS、其他可視 UI 或 M1 文案。

證據 `.runs/restock-planner/m2-20261019-source-a/config-r1/` 含 publication、source-archive-manifest、production-inventory、focused logs、Git/env guard 與 R1-final-verification。未呼叫 Cloudflare、未部署、未碰首頁／兄弟工具。49 scoped PASS、3 observation NOT_RUN、8 manual NOT_RUN 原樣保留；仍待主代理獨立驗收／M3。下方 M2 原交付是保留的歷史版本。

## M2 實際交付：PUBLIC source，待主代理驗收／M3

2026-10-19：已公開 [KYStr/glossquote-labs-restock-planner](https://github.com/KYStr/glossquote-labs-restock-planner)。branch `codex/m2-production`；固定 commit **`7fb1a338185394c5e7eea7be47f37e426d8b866b`**。Git ls-remote 與 GitHub API SHA 相同，CLI metadata 確認 PUBLIC、default branch 相同。沒有 GitHub Pages／Cloudflare 部署或首頁修改；hosting 仍 NOT_DEPLOYED，外部產品驗收仍未完成。

固定 source ZIP：`.runs/restock-planner/m2-20261019-source-a/restock-planner-source-7fb1a3381853.zip`，113,814 bytes，SHA-256 **`afdcdda53c8f366d27936ea7b542179a2a6d6755b3ed2c2500223d53673ac3e5`**。ZIP 直接由該 commit 的 Git archive 產生；57 檔全部比對 Git blob／bytes／SHA-256，安全相對路徑、無重複／symlink／traversal、根目錄 package.json、ZIP comment commit、22 個相對文件連結均確認。`source-archive-manifest.json` 記錄逐檔資訊，位於 assets 外。

`dist-production/` 為 14 檔，inventory SHA-256 **`3f632cffe63de3866ae3cd224e545eb0fd6a97d4c4b45540866a2422baddfbd0`**；workspace 與公開 copy 建置逐檔相同。原始 M1 public 10 檔／dist 10 檔及 15 份核准規格／契約與 frozen M1 完全相同。Production 兩語 footer 均為 **Gloss Tools by GlossQuote**，原「本機候選，尚未發布」及英文句只從 production 定點移除；M1 保留原文。`footer-verification.json` 直接比對實際兩語產物，沒有改動其他文案、算法或互動。

workspace 與乾淨審核 copy 的七個必要 gates 都 exit 0：94 tests PASS、31 syntax checks、M1 HTTP 94 requests、production 14 assets／13 served routes／95 requests。乾淨 copy 通過後沒有改 tracked bytes，固定 commit/blob/ZIP 再驗同一組來源。此範圍不包含新 production browser/live 驗收。

公開 copy 有四個明列的 operational metadata 清理：AGENTS.md 改為無機器資料的 contributor safety；HANDOFF.md、TASK-ENTRY.md 與 project.json 改為公開技術狀態，不含內部 chat ID、帳戶路徑及私有證據定位。**其餘 53 檔含全部 runtime、toolchain、測試、六份核准規格逐 byte 相同**。原 workspace 的 AGENTS／規格未改。差異與來源 hash 在 `reviewed-source-manifest.json`，不把私有作業文件推到 GitHub。

Git publication 全程在獨立 copy，per-command `git -c`、windowsHide、非互動 credential helper；未執行 auth setup/login/refresh 或 global/system 設定寫入。只有 disposable child 的 debug flags／Git config overlay 與 prompts 被暫時隔離，未改持久環境。Git settings guard 前後通過；Environment guard 最終比較見證據。source publication 不是 live release。

**仍保留 49 scoped PASS、3 observation NOT_RUN、8 manual NOT_RUN**，詳見下方目前狀態與公開 HANDOFF。主代理須獨立驗收這個固定 source/production，再序列處理 M3；本對話不重試已停止的原生觀察，不把 scoped GO 當成完整 Browser／外驗通過。Source ZIP 是主代理單一外層交付包的組件，沒有新增多個使用者交付包。

## 目前狀態：2026-10-19 M2 scoped GO

主代理已書面給予 M1 scoped GO → M2，允許保留精確 NOT_RUN；這不是全部 Browser gate 通過。隔離實測合計 **49 PASS**（full R2 的 48，加 focused R2 的 B14-en 真 BFCache PASS）。focused R3 仍有 **B14-zh-Hant、B15-zh-Hant、B15-en 三項原生觀測 NOT_RUN**，沒有產品 FAIL，已停止相同觀測重試。另有 **8 項 manual NOT_RUN**：兩語各一項原生 200% zoom、真 IME、AT、低階真機。歷史驗收計畫與當時 HANDOFF 保留下方，不能用舊「全部 UI 未跑」覆蓋這批新證據，也不能把 scoped GO 寫成全 UI 通過。

M2 已準備獨立 `dist-production/`：兩頁正式 canonical/reciprocal hreflang/x-default、visible FAQ 對應 FAQPage/WebApplication JSON-LD、僅兩個精確 JSON-LD CSP hash、robots 最長前綴決策、恰兩頁 sitemap、noindex 404、可合併/移除的 `_headers`，不改 M1 public/dist 的 10 檔 bytes。正式頁僅改 head SEO/data-script 與移除 M1 候選 footer；JS/CSS 原封不動。新產物 14 檔、實際可提供 13 條資產路由，`_headers` 不直接提供。

本輪最終本機命令均 exit 0：`npm test` 94 PASS（2 份 JSON fixture 不計測試）、`npm run check` 31 syntax checks、`npm run build`、`npm run check:http` 94 requests、`npm run build:production`、`npm run check:production`、`npm run release:check` 95 requests。Production HTTP harness 啟停的是 `preview:production` 同一 Node entry，僅綁 127.0.0.1:5217。這是 localhost 發布模型，不是 Cloudflare live／瀏覽器發布驗收；Cloudflare/首頁仍由主代理 M3 驗證。

唯一新證據目錄 `.runs/restock-planner/m2-20261019-source-a/`，含最終 logs、M1/protected-spec 比對、production inventory 和審核 copy。來源發布狀態以下次實際 commit/PUBLIC 驗證紀錄為準，現在不宣稱已發布或部署。

Headers 的合併與 detach 設計依 [Cloudflare 靜態資產官方文件](https://developers.cloudflare.com/workers/static-assets/headers/)：全域 security policy 與 noindex，兩個正式頁僅 detach X-Robots-Tag，再由 HTML 的 index,follow 宣告；避免 index/noindex 疊加。沒有 Worker runtime、部署、telemetry、observability 或新增套件。本輪僅 source/production 準備；使用的 Cloudflare skill 只協助核對靜態標頭，不改使用者既有禁止 telemetry 的要求。

2026-10-19，任務 W19B-37-M1，本機候選版本 0.1.0。M0 已由主代理核准後才開始本輪。**T01–T04 的背景候選已驗證；完整 M1 尚未通過，等待主代理獨立驗收與必要真實 UI gate。** 未建立 M2、未公開來源、未部署、未整合首頁、未外部驗收。

原功能對話 `01a15270-775b-7d73-9cf6-9a1eccce7b35`；requested `gpt-6.1-sol/max`，backend identity 未獨立確認。無再委派或另開對話。

## 實際範圍

- `package.json` / `.gitignore`：Node 24+ ESM、零 runtime/dev 外部依賴與本機命令；未 npm install。
- `public/index.html`、`public/en/index.html`、`public/styles/**`：完整雙語工作表、初始 disabled/noindex、共用期間與 1–30 列、頁內確認、純文字結果及 readonly 完整報告，採既有 Product App tokens。
- `public/js/core/**`：exact descriptor schema、getter 零執行、長度優先、BigInt 算式、JSON-safe 結果、重驗全部 derived 欄位的報告 formatter。
- `public/js/state.mjs` / `copy.mjs` / `app.js`：編輯即失效、組字期間不改寫輸入或驗證、同步提交、取消保留、清除/語言離開確認、pagehide 清欄位與引用、persisted pageshow 重設。
- `scripts/**`：封閉 allowlist、拒絕未知檔/目錄、hardlink、symlink/junction、traversal 和 stale 輸出；只提供 dist 的 127.0.0.1:4217 HTTP server；獨立 HTTP oracle、固定 inventory，以及 Node 測試 doubles/臨時 fixture 支援。
- `test/**`：手寫預期及 C01–C44d 覆蓋、錯誤優先、輸入不變、JSON roundtrip、報告、狀態、事件接線、工具鏈反向與實際 loopback HTTP 測試。
- `dist/**`：只有 10 個 allowlist 靜態資產，逐檔 bytes/SHA-256 與 public 相同。
- 狀態文件只更新本檔、[TASK-ENTRY](TASK-ENTRY.md) 和 `project.json`。六份核准規格、AGENTS、docs、兄弟工具及共用檔未編輯。

主審 R1 已修正：英文內建範例使用 `Supplies / units`，繁中保留「耗材／個」。兩種範例 × 兩語的狀態測試驗證數字不變；使用者名稱及單位不自動翻譯。所有自行建立的 spawn/spawnSync 均 `windowsHide:true`，不依賴父視窗狀態。

## 可攜命令與最終結果

在本產品目錄使用既有 Node 24.14.0 / npm 11.9.0；標準命令如下。本機使用完整 executable 路徑，未改 PATH 或系統設定。

| 命令 | exit | 本輪最終結果 |
|---|---:|---|
| `npm test` | 0 | 89 tests，89 PASS，0 FAIL/SKIP；不含 fixture 載入項目 |
| `npm run check` | 0 | 10 個封閉資產、23 個 JS/ESM 語法檢查、兩語 noindex/disabled/資產/標籤檢查 |
| `npm run build` | 0 | 10 個 M1 dist 檔，逐檔 bytes/hash 等同 public |
| `npm run check:http` | 0 | 94 次實際 loopback HTTP requests、10 條精確資產路由；自身子程序已停止 |

測試檔分布：core 47、report 13、app-state 19、project 2、toolchain 7、HTTP integration 1，合計 89。另有 **2 份 JSON fixtures**（base 完整預期、23 個數值向量），只載入資料，不算成通過的測試。app-state 中 6 項標示 Node harness only，僅覆蓋事件接線；沒有任何真瀏覽器證據。

HTTP 實驗涵蓋 GET/HEAD bytes/MIME/header 一致、HEAD 無 body、根/未知/query/來源/證據相關路徑 404、禁止 method 405+Allow、大小寫 Host/缺失/未知/重複 Host 421、Host 優先於 method/path、CONNECT 獨立事件，以及精確 CSP/nosniff/no-referrer/noindex/no-store。整合測試另驗 port 衝突不終止原 server；只啟停自身測試子程序，沒有留下預覽常駐程序。

## 固定來源與證據

唯一 evidence 目錄（從工作區根目錄起算）：`.runs/restock-planner/m1-20261019-implementation-a/`。

- `final-test.log`、`final-check.log`、`final-build.log`、`final-check-http.log`：上述最後相關 bytes 的完整輸出。
- `inventories.json`：固定 source/public/dist 三組逐檔路徑、bytes、SHA-256，及排序後 JSON records 的 inventory hash。SHA 清單不放入 dist。
- `verification.json`、`scope-review.json`：命令、分層結果、未驗項和修改路徑。
- `environment-before.json`、`environment-after.json`、`environment-comparison.json`：前後完整 snapshots 相同，HKCU/HKLM PATH hash/type/length、ephemeral count（皆 0）與完整 Environment-key fingerprints 一致；TEMP/TMP 的型別與 hash 也相同。
- `design-notes.md`：沿用核准工作表結構、語意 tokens 與未進行渲染 QA 的設計紀錄。
- T01/T02/T03 與 focused logs 保留歷次範圍及修正；不是最終版本通過率。

首個 guard wrapper 因讀取舊 `$LASTEXITCODE` 而自行 exit 1；它寫出的 guard JSON 實際為 PASS。後續以 JSON Status/Snapshots 判斷，沒有環境漂移或還原。測試曾修正 symbol 快照輔助程式、原生 confirm 掃描誤報與 CONNECT socket 關閉；最終結果見 final logs。

## 未驗項與發布限制

[ACCEPTANCE](ACCEPTANCE.md) 的 **B01–B19 全部 `NOT_RUN_USER_FOCUS_INCIDENT`**。包括真實欄位/確認/焦點/IME、鍵盤、320 CSS px、200% zoom、AT、真 BFCache、完整 Network/Storage、離線 reload、低階真機、無 JS 及報告選取。未做瀏覽器導航、點擊、填寫、截圖、CUA 或 native automation；沒有用 Node/假 DOM/HTTP 改標 UI PASS。

實際視覺、瀏覽器生命週期與資料不外傳仍須適當層級實測。靜態掃描不是任意程式的安全證明；memory 清除是清欄位與釋放引用，不宣稱可清除瀏覽器歷史或底層記憶體。

`dist-production/` 不存在。預定公開 repository `KYStr/glossquote-labs-restock-planner` 與預定網域 `restock.glossquote.com` 都尚未發布；本輪未執行 Git 發布、gh auth、Wrangler、憑證讀取或服務安裝。主代理須先獨立驗收固定來源、保留必要 UI gate，取得真正隔離的驗收機制後再處理 M1/M2 邊界。沒有新增規格選擇待決。

由主代理整合為一個外層交付 ZIP；本對話不另造多包，不改歷史封存。


## 2026-10-19 外部整合包回收（主代理追加）

外部報告沒有新增確認的產品缺陷。其所測 49 份補貨來源與回收時工作區逐檔 bytes/SHA-256 相同。主代理在 Node 24.14.0 審查並重跑 reviewer 的 3,000 組固定對照、6,000 份雙語全文報告及 275 項邊界測試，均通過；測試前後 49 檔相同。這是外部背景測試 scoped pass，275 項中的 32 項為 pure-state，不能冒充 UI。

完整 M1 仍未放行，B01–B19 的瀏覽器證據未由這份報告補足；外部驗收機被 URLBlocklist 阻擋屬環境限制。沒有產品修補、GitHub 發布或部署；仍由主代理補必要隔離瀏覽器驗收後，才交原對話進 M2。真機、真實 IME、讀屏與原生縮放維持人工待驗。完整判讀與新證據見 `tool-projects/BUNDLE-ACCEPTANCE-2026-10-19.md`、`.runs/bundle-acceptance-2026-10-19/`。前述 M1 實作報告保留為當時紀錄。

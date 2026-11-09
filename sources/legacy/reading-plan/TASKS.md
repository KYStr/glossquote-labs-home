# 閱讀進度規劃：任務拆解

狀態：SPEC_ONLY；每項任務都是未來功能對話工作，不代表已開始或完成。

## 責任與先讀文件

主代理完成本規格、選擇原功能對話並傳遞完整上下文。功能對話請求設定為 gpt-6.1-sol、max；設定請求與可驗證的實際模型身分分開記錄，不宣稱文字提示切換了執行模型。原功能對話負責 M1 本機完整候選；M1 經主代理獨立驗收及明確放行後，同一原功能對話負責 M2 production 工具鏈/候選、公開來源與固定 ZIP。主代理負責 M3 工具及共用首頁部署與驗證。

每項開始前，功能對話先讀 START-HERE.md、AGENTS.md、TASK-ENTRY.md、project.json、HANDOFF.md、六份產品規格，以及 docs/BRAND.md、docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md、docs/DESIGN-SYSTEM.md、docs/RELEASE.md。需要更改的每一項只可修改自己列出的專案內 allowed paths；不能修改根、共用首頁、兄弟產品或全域設定。

部署與發布依賴主代理放行。既有 Git/gh 權限若不可用就是停點；不得執行 gh auth login/refresh/setup-git、全域/系統 git config、環境變數或持久 Windows 設定變更。不得讀取或列印 credential。此規格不准新增依賴、權限或成本。

## T00：建立本機骨架與研究閘門

- 前置：M0 六份規格與主代理提供的共同交接文件都存在。
- Allowed paths：package.json、wrangler.jsonc、scripts/serve.mjs、scripts/check.mjs、scripts/build.mjs、public/index.html、public/en/index.html、public/styles/app.css、public/js/app.mjs、public/js/i18n.mjs、public/js/core/civil-date.mjs、public/js/core/reading-plan.mjs、public/js/core/report.mjs、public/robots.txt。
- 步驟：確認 Node 24+ 可用且無需安裝套件；確認本機伺服器只綁定 127.0.0.1:4206；建立 bilingual static shell、預覽 noindex、標籤與空初始狀態。記錄 HTML date、clipboard 與 pagehide 官方規格參考。沒有資料流出或第三方網路呼叫。
- 驗收：node --version；npm run check；npm run build。每個命令必須已由本任務建立為真實腳本。
- 完成條件：本機路徑能以 HTTP 預覽；初始日期空白、星期一至五、書名與總頁數空白、已讀 0、cap 空白；雙語靜態入口存在；依賴清單為空。
- 回寫 HANDOFF.md：建立的路徑、Node 版本、命令真實結果及未驗項。不得聲稱日期或瀏覽器行為已通過。

## T01：純 Gregorian 日期核心

- 前置：T00。
- Allowed paths：public/js/core/civil-date.mjs、test/civil-date.test.mjs。
- 步驟：實作嚴格日期 parser、Gregorian 月日/閏年、ordinal、ISO weekday、手動格式化、閉區間最多 366 日的純函式。只做 bounded civil arithmetic；不使用本機時區、Intl 或 Date parser。
- 驗收：node --test test/civil-date.test.mjs；npm run check。
- 完成條件：ACCEPTANCE.md C15–C24 及對應邊界測例全有自動測試，無不穩定系統日期輸入。
- 回寫 HANDOFF.md：實際測試結果與程式路徑。

## T02：嚴格 schema、分配與可行性核心

- 前置：T01。
- Allowed paths：public/js/core/reading-plan.mjs、test/reading-plan.test.mjs。
- 步驟：實作 exact own-key/data-property schema、getter/proxy fail-closed、field error code 與優先序、整數 ASCII 驗證、weekdays 正規排序、R/D 及逐日分配、R=0 和 cap infeasible tagged union。不得產生部分 infeasible 排程。
- 驗收：node --test test/reading-plan.test.mjs test/civil-date.test.mjs；npm run check。
- 完成條件：ACCEPTANCE.md C01–C44、C47–C48 對應測例通過；完成、彈性日和不可行結果三種狀態不混淆。
- 回寫 HANDOFF.md：測試總數、命令退出碼、未測環境。

## T03：雙語純文字報告

- 前置：T02。
- Allowed paths：public/js/core/report.mjs、test/report.test.mjs。
- 步驟：只接受 plan result；以固定詞表和序列生成 zh-Hant/en 報告。處理無書名、scheduled、零頁彈性日及 no-remaining-pages；不序列化 invalid/infeasible。
- 驗收：node --test test/report.test.mjs test/reading-plan.test.mjs；npm run check。
- 完成條件：C45–C46、C49 與 C01–C03/C12 的報告輸出逐字、bytes、LF、BOM、末尾字元都符合 TECHNICAL.md；報告書名只由成功 plan.title 提供。
- 回寫 HANDOFF.md：報告測例與實際 bytes 檢查證據。

## T04：兩語表單與排程介面

- 前置：T00–T03。
- Allowed paths：public/index.html、public/en/index.html、public/styles/app.css、public/js/app.mjs、public/js/i18n.mjs。
- 步驟：完成可切換語言的表單、日期模式切換、weekday checkbox、明確產生/重算、欄位錯誤、summary、schedule、invalid/infeasible/no-remaining/empty states。透過文字節點呈現書名；不依賴 framework 或 remote asset。
- 驗收：npm run check；人工執行 B01、B03–B10、B16–B18、B23–B24 與 B19 的 320 CSS px 子測試。B11 在環境有繁中 IME 時執行，沒有時記 NOT_RUN 與原因；B19 的 200% 部分及 B20–B22 可 NOT_RUN。
- 完成條件：修改任何值立即清舊結果與操作權限；錯誤、不可行和可行狀態各自明確；320 CSS px 響應式版面與鍵盤皆可達，真機另依 B20 記錄或 NOT_RUN。
- 回寫 HANDOFF.md：各瀏覽器、視窗寬度、語言與人工案例實際 PASS/FAIL/NOT_RUN。

## T05：複製、TXT、清除與頁面生命週期

- 前置：T04。
- Allowed paths：public/js/app.mjs、public/js/core/report.mjs、test/report.test.mjs、test/ui-contract.test.mjs、public/styles/app.css、public/index.html、public/en/index.html。
- 步驟：成功 plan 才能複製/下載；Clipboard writeText 只在按鈕點擊後呼叫；single-flight 鎖阻止重複未完成寫入，callback 以 revision、requestId、pageGeneration 三元 token 保護當前狀態；拒絕時選取文字並提示手動複製。建立精確檔名/編碼下載；Object URL 延後且有界清理；建立可取消的清除確認；pagehide 清除內容與 Blob URL，bfcache 返回重置。
- 驗收：npm test；npm run check；執行 B06–B07、B12–B15、B23、B25 的必要 UI/fallback/handler 邏輯。原生 Clipboard 證據、原生下載檔案 bytes、真正 BFCache 恢復證據若現有工具無法提供，可各自標 NOT_RUN；writeText stub 行為、Blob/report 契約、pagehide/pageshow handler 與 URL/timer 邏輯仍必驗。B22 完整 DevTools Network/Storage 檢查也可 NOT_RUN，但 source/build 檢查仍須確認沒有 storage API、遙測或第三方請求。
- 完成條件：無讀取剪貼簿、無持久保存、失效 callback 不復活結果；不會讓 infeasible result 可複製。
- 回寫 HANDOFF.md：copy 權限兩種結果、實際下載 bytes、清除及生命週期證據。

## T06：內容、可及性與本機建置檢查

- 前置：T04–T05。
- Allowed paths：public/index.html、public/en/index.html、public/styles/app.css、public/js/app.mjs、public/js/i18n.mjs、scripts/check.mjs、scripts/build.mjs、test/site-build.test.mjs、public/robots.txt。
- 步驟：完成兩語 SEO 文案與可見 FAQ；確保 preview noindex；完成必要鍵盤、focus、對比與 320px reflow；build 只複製審核的 public。200% zoom、真機、低階裝置與完整 Network/Storage 可記 NOT_RUN。production canonical/hreflang/sitemap/404/CSP 等候 M2 主代理放行。
- 驗收：npm test；npm run check；npm run build；人工執行 B08–B10、B16–B19 的 320 CSS px 子測試、B23–B24。B11 若無 IME、B19 的 200% 部分、B20–B22 可記 NOT_RUN 並說明原因。
- 完成條件：ACCEPTANCE.md 所列 M1 必要 browser subset 有真實結果，外部環境案例可記 NOT_RUN 並說明原因；不得用靜態檢查替代必要瀏覽器案例。檢查與建置腳本不是永遠成功的空命令。
- 回寫 HANDOFF.md：完整結果及明確 NOT_RUN 清單。

## T07：M1 本機完整候選與交接

- 前置：T00–T06。
- Allowed paths：本專案中本任務之前各項列出的程式、測試、public、scripts、package.json、wrangler.jsonc，以及功能對話負責的 HANDOFF.md、project.json、START-HERE.md、TASK-ENTRY.md、docs/RELEASE-CANDIDATE.md；限更新本工具的狀態、版本、驗收與候選證據，不得改寫共用政策、其他工具或首頁內容。
- 步驟：凍結候選內容，確認差異僅在本專案允許路徑；對最終輸入各執行一次 M1 必要命令；逐案記錄 ACCEPTANCE.md PASS/FAIL/NOT_RUN；記錄正式網址、repo/Worker 預定名但狀態仍未發布。
- 驗收：node --version、npm test、npm run check、npm run build；執行 ACCEPTANCE.md 所列 M1 必要 browser subset（桌面 Chromium：B01–B10、B12–B18、B23–B25 與 B19 的 320 CSS px 子測試）。B12 native clipboard、B13 native downloaded file bytes、B15 真 BFCache 可在工具無法提供原生證據時分別 NOT_RUN；對應的 stub UI/fallback、Blob、pagehide/pageshow handler 必須驗證。B11 僅在可用 IME 環境必要；B19 的 200%、B20–B22 可 NOT_RUN 並註明原因。若最後程式變更影響某 gate，重跑受影響 gate。
- 完成條件：本機候選可以重現；所有已知缺陷有修正或標明阻塞；交付主代理獨立驗收，不發布、不部署、不改首頁。
- 回寫 HANDOFF.md：固定候選 commit/工作狀態、每項命令與真實結果、裝置/版本、已知限制、NOT_RUN 與主代理下一步。M1 不得標成網站已上線或產品完成。

## T08：M2 production 候選、公開來源與固定 ZIP（原功能對話）

- 前置：T07 已交付，主代理已獨立驗收且明確放行。
- Allowed paths：只限本專案的 `package.json`、`wrangler.jsonc`、M2 production scripts (`scripts/build-production.mjs`、`scripts/check-production.mjs`、`scripts/preview-production.mjs`)、production metadata/header/page templates (`production/**`)、生成的 `dist-production/**`、功能對話擁有的 `HANDOFF.md`、`project.json`、`START-HERE.md`、`TASK-ENTRY.md`、`docs/RELEASE-CANDIDATE.md`，以及 repository-root `.runs/reading-plan-m2/` 任務證據目錄中的固定來源 ZIP 與 `.sha256` sidecar。M1 paths 只在 production command wiring 必需且不改變 M1 行為時可編輯。禁止改根、共用首頁或其他工具。
- 步驟：主代理放行後，原功能對話依既有授權用 reviewed publishing copy 建 production 工具鏈與獨立候選 `dist-production/`，實作 canonical、zh-Hant/en/x-default、production robots.txt、sitemap、404、靜態 CSP/security headers；執行 production check 與本機 preview，核對確切 URL/headers/bytes/404 與候選內容。其後照 docs/RELEASE.md 在發布前後驗證 Git settings guard 快照，發布至 public repo KYStr/glossquote-labs-reading-plan，核實 visibility 與 remote commit。從該固定 commit 產生固定檔名 `glossquote-labs-reading-plan-source.zip` 與 SHA-256 sidecar，驗 ZIP bytes、SHA-256 和每個檔案與 Git blob 一致。不得更動 global/system Git、gh auth 或 persistent environment。M2 不呼叫 Cloudflare、不部署、不宣稱網站 live。
- 停止條件：認證能力缺失、Git 設定快照異常、需要新權限/付費、正式網址或部署組態衝突。不得為了完成而變更 global/system Git/auth 或 persistent Windows 設定。
- 完成條件：原功能對話記錄 production candidate/version、必要命令真實結果、來源公開 repo/visibility/remote commit、固定 ZIP/bytes/SHA 與任何 NOT_RUN；完整證據交主代理獨立驗收。M2 不代表已部署或 live。
- 回寫 HANDOFF.md 與 docs/RELEASE-CANDIDATE.md：原功能對話填寫 M2 production manifest、source commit、visibility、ZIP hash、候選檢查證據與 NOT_RUN；主代理記錄 M2 獨立驗收結果。

## T09：M3 工具及共用首頁部署（主代理）

- 前置：T08 production candidate、來源 commit、固定 ZIP 已由主代理獨立驗收。
- Allowed paths：僅主代理部署閱讀工具及操作 tool-projects/00-home/catalog.json、共用首頁來源與其 HANDOFF；原功能對話只提供已驗證 M2 證據與雙語文案。
- 步驟：主代理依已核准的免費 Cloudflare 流程部署工具至 https://reading.glossquote.com/index.html 與 /en/index.html（Worker glossquote-reading-plan），驗 HTTPS/內容/headers/SEO/404 與必要核心流程；再先以 draft 更新目錄，live 工具核實後才切成 published。更新繁中/英文說明、範例和精確 URL，連結回相同語言首頁；重建、驗收、發布首頁 source，部署後逐一驗證兩語首頁的分類與連結。
- 完成條件：兩語目錄、首頁 source commit、正式首頁 deployment 與工具正式站都可核實。交付標示「已上線，待使用者外部複驗」；未收到外部確認不能標「完成」。
- 回寫 HANDOFF.md：主代理填寫實際首頁 commit/version、兩語 live URL 與外部複驗狀態。

## 停止與回報條件

發現需要新套件、權限、成本、憑證、公共 API、雲端資料或改動核心規則才可繼續時停止相關任務並向主代理報告具體差異。核心規則有不可調和矛盾時，先指出原文與受影響案例；不可私自刪掉錯誤碼、簡化安全 schema、放寬上限或降低驗收。其他獨立任務仍依賴與 allowed paths 繼續。

兩次相同失敗且沒有新證據後，停止盲目重試，改查根因或記錄阻塞與下一個必要行動。保留使用者資料、其他對話、服務、進程和未提交修改；不得用 destructive Git 命令。

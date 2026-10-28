# 物品標籤列印任務紀錄

## W19-30-F01-DOC — 外驗文件回收（2026-10-19）

依主代理本次指令，僅改本工具 HANDOFF.md 與 TASK-ENTRY.md，不改 project.json、共用資料、封存包、產品／工具鏈或固定公開 `3cc239b1476baa18adb62d649f49588432608c6b`。已讀安全解出 intake 的 00-START-HERE／02-REPAIR-TASKS／04-NOT-RUN，並核對 01-ACCEPTANCE-REPORT、REVIEW-RESULTS.csv、findings.json 的工具 30 範圍；附件只作證據，沒有執行附件腳本。

外驗回報固定來源／CLI／核心通過：本工具 41 來源檔、133/133 原有 tests、250 既有固定核心對照、1,000 新增 Python 獨立期望均通過；類別可能重疊，不加總為全產品獨立通過率。50 個離線 DOM 案例（兩語各 25）只記 `PARTIAL_OFFLINE_DOM_PASS`：使用 set_content、inline CSS／data ESM 並移除 fixture meta CSP，不能當原路徑 E2E／真實導航／CSP 或正式發布驗收。9 個本機 production HTTP 群組僅 `PASS_LOCAL_MODEL_ONLY`，未部署。

F01 是 LOW 文件問題：上次包內 specifications/30/HANDOFF.md 第 231–233 行三個 `.runs` 歷史連結未隨包，並非產品核心 bug。本工作區將三個可點連結改為保留原路徑的「未隨包的工作區歷史參照」純文字，新增外驗範圍與可攜交接規則。外驗提供的 docs-fixed ZIP／patch 由主代理核對採用，本原 chat 不改封存包／manifest。包內相關 evidence/30 資料未證實與舊 `.runs` bytes 相同，不得冒充原舊檔；外驗回報的 333 manifest／132 相對連結／142 sources／5 ZIP 校驗亦不冒稱本次另做重驗。

完整原 HTML＋HTTP E2E、完整 Network／Storage、真實導航與模組失敗、原生列印及四版型紙張量測、真機／zoom／AT／IME／生命週期、正式 Cloudflare／CDN／SEO／M3 均保留未驗，產品未完整完成。本機全部 browser／CUA／native（含 hidden／截圖／導航）仍禁止，後續 UI 為 NOT_RUN_USER_FOCUS_INCIDENT；本次無 UI、測試／build、GitHub／Cloudflare、credential／持久設定操作、服務停止或再委派。只核對兩檔實際 diff 後交接；封裝採用由主代理處理，不輪詢、不請使用者轉貼。以下歷史紀錄保留原驗收時點。

## W18-30-M2-R1 — 目前候選（2026-10-18）

主代理指出真實 static assets 目錄含 manifest，HTTP 模型卻排除，因此 pre-R1 source `55f8387a…` 被阻止發布整合。已將 production manifest 改存根 dist-production-manifest.json 並 gitignore，build/check/release 對 dist-production 嚴格只接受 12 個 PRODUCTION_FILES，不是放寬 HTTP allowlist。新增 exact deployed directory／誤放 inventory 必須拒絕兩個回歸，workspace 與 clean copy 都 133/133，六命令 exit 0，public 十檔及六規格仍不變。

新 PUBLIC commit／remote／API 都為 `3cc239b1476baa18adb62d649f49588432608c6b`，parent 為 `55f8387a1eb1d335a57ec9cd4fa1864ba34fbf48`；同一 codex/m2-label-printer 分支正常 fast-forward，無 force。新 archive ZIP 95413 bytes／41 files／無 prefix，SHA-256 `95fe375cd33c24409492b5cb280a9696bb3597d8789ba15e15dec873ed514348`，全部與 fixed git blob／reviewed source 相同。前版 commit／ZIP／logs／guard 證據完整保留。

R1 Git settings capture/verify PASS，Windows 前後完整 Snapshots 完全一致。CLI 驗實際部署目錄 12 檔、19 asset responses＋10 routes＋HEAD；沒有 UI 重驗（全部暫停）、憑證直接讀取／輸出、Cloudflare、部署或首頁修改。所有 R1 evidence 只在原目錄 m2/r1/。目前等待主代理 R1 主驗，不輪詢，不自行 M3，不標整體 goal complete。以下為 pre-R1 歷史。

## W18-30-M2 — 目前 production 與 PUBLIC source（2026-10-18）

主代理明確 M1 GO／M2 GO，並回報自己重跑 116/116 與 250 個獨立 cases、隱藏 browser 雙語主要操作。這是主代理回報，沒有冒稱本原 chat 另跑 250 cases。public/ 核心與 UI 沒改，六規格未改。

M2 新增 production metadata／WebApplication+FAQPage／精確 CSP hash、header 合併與 robots 最長匹配模型、sitemap／404、固定 JSON Wrangler、model 5210、23-source allowlist、15 個 production 測試及 .gitattributes。最終 workspace 與 sanitized publishing copy 均 131/131；test/check/build/build:production/check:production/release:check 全 exit 0，兩份 manifests byte-identical。實際 loopback 19 asset responses＋8 routes＋HEAD 通過。

PUBLIC repository https://github.com/KYStr/glossquote-labs-label-printer ，branch codex/m2-label-printer，固定 local/remote/API commit `55f8387a1eb1d335a57ec9cd4fa1864ba34fbf48`。直接 git archive ZIP 96260 bytes、41 檔、無 prefix／package.json 位於根，SHA-256 `9044f5d96b55a14f191bdda02b33352928b5018134992084be4d863bad6eb616`；逐檔與審核副本及固定 commit git blobs 一致。五份內部狀態文件在公開副本省略本機帳戶路徑、chat 識別與內部 evidence；沒有 .runs／node_modules／builds 或使用者資料。

Git settings capture/verify PASS；Windows before/after 完整 Snapshots 相等。僅既有官方 CLI、per-command git -c、process-local debug／互動提示關閉；沒有 auth setup/login/refresh、global/system Git／persistent environment 寫入、Cloudflare 呼叫、token 讀取、部署或首頁修改。凍結 commit／ZIP 後僅寫本工作區狀態，沒有新 commit。

收到焦點事件指示後，沒有再做任何 UI 呼叫，沒有關閉視窗／分頁／程序。最近 UI 工具的截圖／report 落盤為台北 08:57:53（非 API 精確起訖），用 goto、AX、唯讀 evaluate、screenshot、logs、markHandoff、visibility.get，該次沒有 fill/click/press/viewport；無 pending UI call、UI child、subagent。不能以 hidden 推定無干擾。最新澄清仍只允許不干擾的背景 CLI／檔案，後續 UI 項 NOT_RUN_USER_FOCUS_INCIDENT，待主代理驗證真正隔離後明確放行。

M2 evidence 只在原唯一目錄的 m2/。目前停在 M2 等主驗，不輪詢主代理，不自行 M3，不標版本 complete。以下為 M0／M1 歷史，不改寫。

## W18-30-M0
2026-10-18 主代理產品決策，Luna協作規格。功能chat requested gpt-6.1-sol/max，尚未dispatch；backend identity未確認。M1/M2/M3/外部驗收未開始。

## W18-30-M1 — 本機候選交接（2026-10-18）

主代理 dispatch 明確說明 M0 已審查放行，本輪僅 M1；六份規格未修改。本原 chat 為 01a14c6b-2862-74f0-8569-642e3a450917，requested gpt-6.1-sol/max；實際設定和 backend identity 尚無獨立證據，不能以代理自述當確認。

已實作 calculateLabels、雙語空白表單、共同份數、四固定普通紙網格、分頁／末頁空格、同步預覽失效、明確列印 handler、清除與語言確認、生命週期清空，以及零套件離線工具鏈。最終 Node v24.14.0；npm test 116/116、npm run check、npm run build 全 exit 0；真實 loopback HTTP 比對可公開資產全部 hash、headers、兩語與 404 通過。Windows guard 前後完整 Snapshots 一致。

瀏覽器實測繁中／英文主要流程、錯誤修復、範例、重複順序、三類輸入變更失效、清除與語言取消／確認、跨頁、四版型長文字、320px、鍵盤焦點、純文字標記、實際返回空白。原生列印、實體尺寸、真正 200% 縮放、完整 Network/Storage、離線切換、停用 JS、persisted BFCache 模式、低階真機等分項 NOT_RUN，詳 HANDOFF 與 browser-results.json。

途中收到使用者新限制：只用本工具隔離隱藏瀏覽器分頁；不得操作桌面/native/OS/剪貼簿或系統對話框，不得再觸發列印。已寫入本工具 AGENTS.md；保留限制前一次列印 click 逾時的歷史紀錄，沒有重試或以桌面關閉視窗。之後只用隱藏分頁與 DOM 操作。

候選 dist/manifest.json SHA-256 ac8bd6d532e1d8cd4fe8d80836945ba6d24ecf82bb70c2ff3cb8974a0f72746a。證據根 .runs/label-printer/W18-30-M1-01a14c6b-20261018/。目前等待主代理 M1 驗收及 M2 GO；沒有 GitHub 發布、production 工具鏈、部署、首頁修改或外部驗收。

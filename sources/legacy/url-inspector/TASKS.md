# 網址參數檢視與整理任務佇列

目前全部未開始。每項先聲明範圍/非目標/驗收，通過後才進下一項；同一turn可持續完成就緒項。所有任務共通允許本工具HANDOFF.md、project.json狀態、docs/RELEASE-CANDIDATE.md與dist生成物；證據/發布副本以TASK-ENTRY為界。失敗在原owning task修正，不能更動別人的工具。

## T00 靜態骨架與開發工具

- 前置：讀入口/契約，檢查現狀與Node24，持久環境guard。
- allowed：package.json、必要package-lock.json（零deps可不建）、.gitignore、public/index.html、public/en/index.html、public/styles/**、public/js/app.mjs、scripts/serve.mjs/check.mjs/build.mjs、test/scaffold.test.mjs。
- 實作：原生ESM兩語停用預覽骨架、public-only loopback server、真check/build/test；noindex/no remote assets。安全server拒絕穿越/hidden/symlink、只GET/HEAD、404正確，build先驗內容再只更新本工具dist，不能清root。
- 驗收：npm test覆蓋server allow/deny、404/MIME/HEAD/405及copy隔離，npm run check，npm run build；記錄命令/exit。非目標：此步不是核心產品與正式SEO。

## T01 純邏輯與精確案例

- 前置：T00 PASS。
- allowed：public/js/core/url.mjs、test/url.test.mjs，必要test假fixture與PRODUCT/TECHNICAL/ACCEPTANCE中的明確勘誤（不改需求）；scripts/check.mjs只加入新模組實際檢查。
- 實作：TECHNICAL API及固定error codes，對照U01–U18、U22與identity不變量，無DOM/network，輸入不mutation。
- 驗收：npm test、npm run check；每個error/邊界/不變量有獨立expected，不用被測函式計算expected。失敗先修T01，不進UI假成功。

## T02 雙語互動工作區

- 前置：T01 PASS。
- allowed：public/**、test/ui-contract.test.mjs（如必要）、本工具UX-SEO及相關core/test缺陷。
- 實作：按UX設計兩語完整UI、真實成功/錯誤/空狀態、所有草稿變更使舊結果失效、keyboard/focus、copy拒絕fallback、native TXT下載及ObjectURL清理、清除。使用textContent/value，不用innerHTML；不加入無需求的功能。
- 驗收：npm test/check/build；真Chrome及Edge執行主要/錯誤/舊結果/清除/複製/實際下載；320px/200%實測。Node UI靜態檢查不可代替瀏覽器；不能跑的項目標NOT_RUN給主對話補，不虛報。

## T03 邊界與隱私驗收

- 前置：T02功能可測。
- allowed：本工具public/**、test/**、scripts/**與docs/TEST-RESULTS.md；只修ACCEPTANCE範圍相關缺陷。
- 實作：對照全部案例、最大輸入、惡意字串、真Network/Storage/頁面hidden與回復、輸出race。若工具缺少完整Network觀測，記錄精確缺口，不以CSP/ResourceTiming冒充。
- 驗收：受影響自動gate，真瀏覽器案例逐條PASS/FAIL/NOT_RUN附版本/輸入/觀察/證據。必要gate缺口交主對話補完，不靜默跳過；明確允許人工待驗者可列在候選包，但未達完整驗收不叫MVP全過。

## T04 正式發布工具鏈與SEO

- 前置：T03無未處理必要FAIL；待補人工觀察保持可見。
- allowed：scripts/build.mjs/check.mjs、test/release.test.mjs、public/**的staticSEO/404/headers、wrangler.jsonc、package.json scripts、docs/RELEASE.md。
- 實作：按RELEASE固定origin的production/preview build、self canonical/zh-Hant/en/x-default、sitemap/robots、靜態安全headers、雙語首頁互連、strict404、可重現資產清單。首次做Workers配置讀適用官方/skill，保持免費靜態託管，不server運算。
- 驗收：npm test/check、npm run build、npm run build:production、npm run check:production；preview仍noindex，prod URL/meta/header/content精確匹配，絕不出包personal/docs/tests/node_modules；本步不執行正式deploy。

## T05 公開GitHub與候選交接

- 前置：必要自動gate及可執行瀏覽器gate通過，人工缺口明列且不假稱全通過。發布完整可用候選，不公開空骨架當成完成品。
- allowed：本工具README/HANDOFF/project.json/docs/**、必要發布manifest產生腳本，專用發布副本及證據；不修改根repo或其他工具。
- 實作：reviewed source copy、明確allowlist/secret檢查、只包含本工具source及必要文件；使用既有gh授權建立/更新指定PUBLIC repo，不force。核對remote commit/publicity與fixed source ZIP hash；必要node_modules/dist私人證據都不公開。
- 驗收：讀remote visibility/HEAD，發布copy與對應source檔hash一致；記docs/RELEASE-CANDIDATE含命令/版本/所有未驗/正式候選網址。記READY_FOR_INTEGRATION（有必要blocker則BLOCKED），主對話read actual files再部署；不得自己修改首頁/讀token。

## T06 原對話修正與發布配合

- 前置：主對話/使用者提供具體驗收回報。
- allowed：回到缺陷的T00–T05 owning paths，只處理原需求修正；相關文件、測試與source publication一併更新。
- 驗收：重現原失敗→修正→受影響regression→GitHub固定新commit→主對話部署/正式複驗→外部確認。未獲使用者/驗收者確認前不是產品「完成」，也不把主對話等待誤寫成缺使用者發布授權。

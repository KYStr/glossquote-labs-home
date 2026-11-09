# 檔案 SHA-256 校驗任務佇列

2026-10-13 現況：T00／T01 已正式主驗 PASS；T02 互動 UI 已實作，最終自動 gate 130/130、check/build exit0，已凍結供主驗。Edge 瀏覽器 API 23 項 PASS，Chrome／原生選檔／實體下載／200% zoom／舊頁 pagehide 資源觀測有明確 NOT_RUN，T02 尚未完整主驗接受。T03–T06 未放行。規格建立時「全部未開始」為歷史。每項先聲明範圍/非目標/驗收，通過後依主對話實際里程碑指示前進。所有任務共通允許本工具HANDOFF.md、project.json狀態、docs/RELEASE-CANDIDATE.md與dist生成物；證據/發布副本以TASK-ENTRY為界。失敗在原owning task修正，不能更動別人的工具。

## T00 靜態骨架與開發工具

- 前置：讀入口/契約，檢查現狀與Node24，持久環境guard。
- allowed：package.json、必要package-lock.json（零deps可不建）、.gitignore、public/index.html、public/en/index.html、public/styles/**、public/js/app.mjs、scripts/serve.mjs/check.mjs/build.mjs/validation.mjs、test/scaffold.test.mjs。
- 實作：原生ESM兩語停用預覽骨架、public-only loopback server、真check/build/test；noindex/no remote assets。安全server拒絕穿越/hidden/symlink、只GET/HEAD、404正確，build先驗內容再只更新本工具dist，不能清root。
- 驗收：npm test覆蓋server allow/deny、404/MIME/HEAD/405及copy隔離，npm run check，npm run build；記錄命令/exit。非目標：此步不是核心產品與正式SEO。
- 納入已發現的共通回歸：build目的hardlink不能覆寫外部sentinel，stale dist拒絕且不刪，來源/目的任一ancestor junction拒絕；HTML檢查不能被單引號/大小寫/註解中的meta或remote script蒙混。可自包含validation helper，不引用兄弟工具source。失敗不能以放寬check修正。

## T01 純邏輯與精確案例

- 2026-10-12 正式派工 CHECKSUM-T01-CORE-WORKER：T00 主驗 69/69、check/build、active robots repro 4/4 及最終 10 檔匹配後放行。T00 證據保留。此輪停在 T01，T02 尚未批准。
- 本輪交付：純 API、session/協定與自足 Worker／byte-preserving 生成檔完成；npm test 112/112（保留 T00 69 項）、check/build exit 0，guard 完整指紋未變。owner 釋放供主驗，固定 manifest／未驗項見 HANDOFF；不直接進 T02。
- 主代理補足 allowed：本節任務紀錄、test/scaffold.test.mjs 的核准資產／fixture／數量更新，以及 scripts/build.mjs 為 Worker 生成檔一致性必要的接線。既有安全／HTML／filesystem 負例不能刪除或弱化。
- 前置：T00 PASS。
- allowed：public/js/core/checksum.mjs、session.mjs、public/js/hash.worker.mjs、worker-source.mjs、scripts/build-worker.mjs、test/checksum.test.mjs、session.test.mjs、worker.test.mjs，必要test假fixture與PRODUCT/TECHNICAL/ACCEPTANCE中的明確勘誤（不改需求）；scripts/check.mjs只加入新模組實際檢查。
- 實作：TECHNICAL API、Worker協定與固定error codes，對照H01–H20、H29–H30的自動部分，無DOM/network，輸入不mutation；NodeWebCrypto與合成blob只作自動證據，真Worker在T02測。build-worker產物一致性納入check/build。
- 驗收：npm test、npm run check；每個error/邊界/不變量有獨立expected，不用被測函式計算expected。失敗先修T01，不進UI假成功。

### T01 session 接口（T02 沿用）

`createSession()`／`reduceSession(state, action)` 回傳不可變的新 state，未改變或舊回呼可回傳原 state。state 不含 File／Worker／URL：`phase` 為 idle/ready/reading/hashing/done/cancelled/error；`fileSize` 為 null 或已驗 size；`fileRevision`、`jobId`、`outputRevision` 為非負 safe integer；`activeJobId`／`deadline` 為 null 或当前工作 ID／performance.now()+60000；`hash`、`error`、`expectedSource`、已解析 `expected` 與 `comparison` 為其餘欄位。expected 原稿保留，未合法時不截短；expected 更新不使同檔 hash/outputRevision 失效。

Exact actions：`{type:'select',size}`（controller 有真 File 才 dispatch，取消 dialog 不 dispatch）；`{type:'expected',source}`；`{type:'start',now}`；`{type:'reply',jobId,fileRevision,message,now}`；`{type:'fail',jobId,fileRevision,code,now}`；`{type:'check-deadline',now}`；`{type:'cancel'}`、`{type:'clear'}`、`{type:'pagehide'}`。select 先作廢舊結果再驗 size；busy 重複 start 不建新 job。reply/fail 的兩個 ID 是 controller 回呼捕獲值，舊值先忽略；目前 callback 的 payload jobId 不符或 schema 非法則 WORKER_PROTOCOL。done 必須在 hashing 階段、bytes 等於 fileSize、hex 合法。reading 不可從 hashing 倒退。deadline 在回呼／check-deadline 核對，>=60000ms 即 TIMEOUT，不接受過期 success。未知 action/schema／counter overflow 以固定 ProductError('WORKER_PROTOCOL') 防守拒絕，不回繞 ID。

完成／失敗／取消使 activeJobId/deadline 清空並遞增 job/output revision；取消保留已選 size/expected，清除/pagehide 另遞增 fileRevision 並清空全部內容。controller 負責真正 File 引用、Worker 實例身份、terminate/listener/timer/ObjectURL／focus／copy request 序號；reducer 不執行副作用。controller 只在新 start 產生 activeJobId 時建 Worker，dispatch 前核對捕獲 Worker 仍當前。visibility hidden 不作清除；返回 visible 及 pageshow 使用 check-deadline；pagehide 使用其全部清除 action，BFCache idle。

`validateWorkerReply(message,{jobId,fileSize})` 是純 exact-schema validator；目前不提供成功結果 fallback。Worker 自足模組另 export `createWorkerHandler(scope)` 與 `validateWorkerRequest` 供 Node 自動層注入合成 File/API 失敗；真 Worker global 會安裝 message listener。scope 測試是自動證據，不能稱真瀏覽器驗收。一個 handler lifetime 只接受一個 job；忙碌時第二請求令原工作失效、protocol error 後 close；所有 await 之後核對內部 generation，close 後遲到 read/digest 結果不再發出。Worker 回覆完全不含檔名、raw error 或 stack。

生成流程：`node scripts/build-worker.mjs` 用完整 UTF-8 原 bytes 生成唯一 WORKER_SOURCE 字串 export（不正規化 CRLF/BOM）。check 與 build 驗原檔／生成內容逐 bytes 一致；stale/tampered 產物必拒絕，build 不靜默修復。T01 128MiB/+1 僅驗 size，不配置大型 buffer 或執行瀏覽器 benchmark。驗收仍跑所有保留的 T00 regression。

## T02 雙語互動工作區

- 2026-10-13 本輪交接：真 Blob Worker controller、完整兩語互動、expected 比對／取消／換檔／清除／copy fallback／65-byte TXT serializer／資源清理完成。最終 npm test 130/130（保留原112，新增18個 UI contract）、check/build exit0；原 HTML 34 個集中回歸保留，guard 全部 snapshots 相等。Edge 真 Worker 小bytes及控制流程、原生64字元copy、兩語實際CSS320px／英文鍵盤共23項PASS；原生選檔不擴權、Chrome API不可用、download事件未回傳、200% zoom未曝露、舊頁pagehide觀測未保留均NOT_RUN，不拿Node替代。詳見 HANDOFF／T02專用證據。Owner已釋放、runtime/tests凍結，等待主代理親驗及補驗；不自行進T03。
- 2026-10-13 主代理正式放行：T01 親驗112/112、check/build、27檔固定manifest一致、環境完整指紋不變；證據孵化器 .runs/new-tools-2026-10-13/checksum-t01-primary.md。只推進T02，T03/正式發布未放行。本次額外允許 scripts/check.mjs、scripts/validation.mjs、test/scaffold.test.mjs 與 test/worker.test.mjs 中使已啟用雙語UI/新核准資產可驗的必要接線；不能刪除或弱化原HTML/路徑/硬連結/stale/原bytes負例。所有者須凍結後回報，主代理再驗收。
- 前置：T01 PASS。
- allowed：public/**、test/ui-contract.test.mjs（如必要）、本工具UX-SEO及相關core/test缺陷。
- 實作：按UX設計兩語完整UI、真實成功/錯誤/空狀態、新File/清除/重算使舊hash失效，expected草稿只重算comparison；一次一Worker、取消與60秒deadline、keyboard/focus、copy拒絕fallback、65byte原生校驗碼TXT下載及ObjectURL清理、清除。使用textContent/value，不用innerHTML；不加入無需求的功能。
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

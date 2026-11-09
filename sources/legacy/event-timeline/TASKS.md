# 實作任務：逐 milestone 本機交付與 release gates

> 狀態：M0 任務分解，尚未實作。此文件定義未來原功能對話工作順序；建立所列 package.json、腳本或測試檔後才能執行相應命令。所有未執行任務現在都是 NOT_RUN。

## 固定執行規則

1. 依序完成 T00–T05，一次只交一個 milestone 給主代理審查。不要跳過 M1 主代理獨立驗收與明確放行。
2. 只用 Node.js 24 或更新版本、Node 內建模組和瀏覽器原生能力；禁止 npm install、外部套件和 runtime/dev dependency。
3. 每個任務只可寫其 Allowed paths。既有規格、入口和共用 docs 是唯讀；若遇矛盾向主代理回報，不降級規格。
4. 先依 START-HERE.md 和 AGENTS.md 閱讀順序；遵守 docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md、docs/DESIGN-SYSTEM.md、docs/RELEASE.md。只使用本工具資料夾。
5. 每條命令只可在該 task 建立了它依賴的 package/script/file 後執行。未建立或未列入該 milestone 的命令，不可先跑空測試或臨時安裝工具。
6. 任務回報列明實際命令、exit code、核心/瀏覽器案例狀態和 NOT_RUN 原因；不可把預期 oracle、mock、lint/static scan、桌面模擬器或本地 HTTP 視為未做的真機、原生 API、完整 Network、production/live evidence。
7. 不改 persistent Windows 環境、PATH、TEMP/TMP、Git 全域/系統設定；不讀取憑證，不登入 GitHub/Cloudflare，不部署、不花費、不碰 GlossGate 或其他產品。
8. 命令預期成功也必須實際執行並記錄結果；失敗後依 ENGINEERING 的停止/重試規則處理。只重跑因相關變更或失敗受影響的 gates。
9. M1 所有 app 資料只在 DOM/module memory。不得加 storage、URL/history state、console user data、隱藏網路、分析、遠端字體或 Service Worker。
10. 不改本列表以外的工作路徑。HANDOFF.md 和 docs/RELEASE-CANDIDATE.md 是各 milestone 記錄真實進度的唯一產品狀態文件；其他 shared files 不可自行改寫。

## T00 — M1 靜態骨架與本機工具鏈

**目的：** 建立可供後續工作修改、檢查和預覽的無依賴原生頁面骨架。T00 尚無 core test，因此不執行 npm test。

**Prerequisite:** 主代理建立 START-HERE.md、AGENTS.md、HANDOFF.md、TASK-ENTRY.md、project.json 及指定共用 docs；本任務六份規格已凍結可讀。

**Allowed paths:**
- package.json
- .gitignore
- scripts/serve.mjs
- scripts/check.mjs
- scripts/build.mjs
- public/index.html
- public/en/index.html
- public/styles/app.css

**Work:**
- package.json 使用 ESM/private、Node >=24；提供 dev/test/check/build scripts。dev 預設只綁 127.0.0.1:4205 並提供 public/，不需傳入 override；此時 test script 存在但不可在沒有 test files 時宣稱測試通過。
- serve script 僅提供 public/，僅 GET/HEAD，精確 MIME，正確 404/405，不列目錄、不做 SPA fallback；處理非法路徑，不能讀取 public 根目錄之外內容。port 參數只可在明確要求時接受合法整數；不得改變預設或監聽到 wildcard。
- 兩個 HTML 只有同源本機資產，不含正式 canonical、hreflang、JSON-LD、外網請求或嵌入式 script/style。繁中 /index.html lang=zh-Hant；英文 /en/index.html lang=en。
- 每頁 source 都有 noindex,nofollow；preview build 也有 noindex,nofollow，不能只依賴 robots.txt 或 response header。
- build script只把固定 allowlist 的 public source 建到 dist/；preview noindex,nofollow，不包含 production metadata、production sitemap、JSON-LD 或 index directive。
- check script本身無外部依賴、離線，只檢查本工具允許檔案及語法，不讀帳戶、兄弟目錄或其他 repo。檢查結果不宣稱是完整安全證明。
- 不加入 wrangler config 或 production build template。

**Commands allowed after the above files exist:**
- npm run check
- npm run build
- npm run dev

**Acceptance:**
- npm run check 和 npm run build 各自 exit 0；dist/ 只有 allowlist 應用資產，metadata 符合 noindex preview。
- npm run dev 實際綁 127.0.0.1:4205；手動開 /index.html、/en/index.html；外部位址不可連入。
- 不跑 npm install，不跑空的 npm test，不建立 production candidate。

## T01 — 純函式、exact schema 與 66 個固定 core oracles

**Prerequisite:** T00 完成；server/check/build 可用。

**Allowed paths:**
- public/js/core/parse-clock.js
- public/js/core/parse-duration.js
- public/js/core/validation.js
- public/js/core/schedule.js
- public/js/core/report.js
- test/helpers.mjs
- test/validation.test.mjs
- test/schedule.test.mjs
- test/report.test.mjs

**Work:**
- 按 TECHNICAL.md 實作純函式 parseClock、parseDuration、createInitialDraft、validateDraft、calculateSchedule、formatClock、formatScheduleClock、formatTargetClock、formatPlainTextReport、encodeUtf8Report。
- 嚴格檢查 root/row own enumerable data descriptors、exact keys、symbol、prototype、dense array；絕不先讀取可疑 getter。錯誤優先序和 error shape 完全依 PRODUCT.md。
- 整數計算全程不用 Date/Intl；文字長度以 UTF-16 code units，拒絕 Unicode Cc 和不成對 surrogate。
- 以 ACCEPTANCE.md C01–C66 手寫獨立期望值；禁止從被測函式產生 expected 或用抽樣替代整張案例表。測非突變和 getter counter。
- 測試全部離線、假資料；不記錄原始錯誤輸入。

**Commands allowed after all core modules and test files exist:**
- npm test
- npm run check

**Acceptance:**
- 66 個核心案例全部對應；任何差異都回到實作修正後重跑受影響測試。
- npm test 和 npm run check exit 0；記錄 Node 版本與命令結果。
- 若實作發現 schema 或 oracle 矛盾，停在此 task 並交主代理裁定，不可自行另造 API。

## T02 — 兩語活動表單、結果與可鍵盤排序

**Prerequisite:** T01 完成且全部 core cases passed。

**Allowed paths:**
- public/index.html
- public/en/index.html
- public/js/app.js
- public/styles/app.css
- public/js/ui/（only files needed for fixed bilingual DOM helpers, if created）
- test/（only UI helper tests added for this milestone）

**Work:**
- 完成繁中和英文完整工作流程、可見 label、時間/目標/次日、1–60 活動列、備註、Build、結果和唯讀 report。
- 使用 design-system 的 Gloss Tools 家族 token、Product App 層級和精確時間軸線；保留文件的平面與安靜方向，不採外部 frontend skill 的預設主題。
- 使用純函式驗證/計算；顯示每列 start/end、day offset、總分鐘、實際結束、有效 target 比較。
- 每列移上/移下是具列名的原生按鈕；鍵盤焦點保留，位置用單次 aria-live 通知。不得只靠拖曳排序。
- 所有名稱/備註用 textContent 或 value，不得用 innerHTML/eval/Function。
- 輸入、增刪、排序即時撤銷舊結果並禁用 copy/download；只有 Build 才提交結果。結果錯誤依固定優先序聚焦第一個錯誤。
- 時間和時長欄保持 ASCII 嚴格輸入，中文 IME 組字時不報中間拼寫錯誤；Build 在 compositionend 前阻止。

**Commands/manual cases allowed after app modules exist:**
- npm test
- npm run check
- npm run dev
- Browser cases B01–B09、B12、B15；有裝置能力時另測 B16–B18，否則按 NOT_RUN 規則記錄。

**Acceptance:**
- 兩語的基本例、午夜、目標、排序和失效案例符合 ACCEPTANCE.md。
- 320 CSS px、200% zoom、40% translated text layout、keyboard path、長列表與 IME 都記錄實際狀態。
- 未真機、未 assistive technology、未提供原生 API 權限或完整 Network/Storage 的項目明確 NOT_RUN。

## T03 — 清除/語言切換、clipboard、download 與 lifecycle

**Prerequisite:** T02 完成；核心報告文字固定。

**Allowed paths:**
- public/index.html
- public/en/index.html
- public/js/app.js
- public/js/ui/（only files needed for fixed bilingual DOM helpers, if created）
- public/styles/app.css
- test/（only lifecycle/async helper tests needed for this milestone）

**Work:**
- 有資料的清除和語言切換用原生 confirm；取消完整保留，確認後新頁空白。頁面離開不保存任何內容。
- Clipboard writeText 只在使用者明確按鈕手勢中以目前 report 呼叫；不讀取既有 clipboard，禁止 execCommand。
- 每筆 clipboard request 保存 revision、requestId、pageGeneration。所有 resolve/reject/finally callback 先同時比對三者與目前 pending request；只要任何一項不符就完全 no-op，不能清/改 pending、notice、result、focus 或 DOM。pagehide 增加 generation 使全部舊回呼失效。
- Clipboard API 失敗或不可用時報告仍可手動選取，不重試、不偽稱成功。
- 每次真實下載建立自己的 Blob URL，固定檔名；每個 URL 建立後 60 秒延遲 revoke，至多同時 8 個。新結果、編輯和重複下載不會提前撤銷前一筆 URL。滿 8 個停用下載並說明等待，最早 URL 到期後恢復。pagehide 取消 timers 並立即 revoke 全部 URL。
- 確認清除也不提前 revoke 已啟動下載的 URL；可見欄位/結果立即清空，舊 URL 仍只按自己的 60 秒期限或 pagehide 撤銷。
- pagehide 清 DOM/module state、所有輸入和結果、pending notice、clipboard generation 和 download URLs；pageshow.persisted 重新初始化空白。
- 語言路徑嚴格為 /index.html 和 /en/index.html；有資料時提示離開會清空，不保證切換保留。

**Commands/manual cases allowed after handlers and tests exist:**
- npm test
- npm run check
- npm run dev
- Browser cases B10–B13、B19–B23、B30；B20/B22/B23 必須跑 controlled harness，B23 的真實 BFCache 能力另行記錄。

**Acceptance:**
- 受控延遲 promise 測試證明舊 clipboard callback 對新 copy pending 完全無影響；另分開記錄原生 clipboard 可用性。
- 8 URL 上限、60 秒延後、new-result/repeated-download 不即時 revoke、pagehide immediate revoke 全部通過 harness；真實下載另外按 B21 驗。
- Clear/switch cancel preservation 與 confirm wipe 在兩語各自驗收。若瀏覽器不支援或權限被拒，僅原生 clipboard success 可 NOT_RUN，fallback 仍須實測。

## T04 — M1 隱私、安全 header、preview build 與響應式驗收

**Prerequisite:** T00–T03 完成。

**Allowed paths:**
- public/index.html
- public/en/index.html
- public/404.html
- public/_headers
- public/styles/app.css
- public/js/app.js
- scripts/check.mjs
- scripts/build.mjs
- test/（only static build/header checks and browser fixtures required for M1）

**Work:**
- 完成 M1 preview 404、安全 header、noindex,nofollow；未經 release gate 不建立 canonical/hreflang/JSON-LD/sitemap/robots index。
- CSP 保持預覽閉合，沒有 production JSON-LD hash placeholder；不允許外連、inline script/style、unsafe-inline/eval、data、wildcard、connect。
- build 和 check 全離線，只接觸本工具 allowlist；對未知檔案、symlink/junction/hardlink、path traversal、stale output fail closed，不複製規格、測試、HANDOFF 或輸入資料。
- 通過 B24–B29 的適用項目，完整 Network/Storage 面板按能力執行；記錄所有 NOT_RUN 原因。
- 結果、錯誤、報告與元件保持雙語；不得把本機結果寫進 URL/storage/console。

**Commands/manual cases allowed after fixes exist:**
- npm test
- npm run check
- npm run build
- npm run dev
- Browser cases B14–B18、B24–B30；不具螢幕閱讀器、200% zoom、真手機或完整 Network/Storage 能力時，相關項目逐一標 NOT_RUN 並說明影響。

**Acceptance:**
- 404 為真正 HTTP 404，preview metadata noindex。
- 320、200%、40% translation、IME、low-end-device limitation、offline-after-load 皆有結果；能力不足逐項 NOT_RUN。
- M1 沒有 wrangler.jsonc、production headers/build toolchain、GitHub publication 或 Cloudflare action。

## T05 — 凍結與 M1 最終本機交付

**Prerequisite:** T00–T04 修正完成；主代理尚未放行 M2。

**Allowed paths:**
- HANDOFF.md
- docs/RELEASE-CANDIDATE.md

**Work:**
- 凍結 app commit/tree 作為主代理獨立驗收輸入，保留所有既有其他修改。
- 實跑 final gates：npm test、npm run check、npm run build，各一次；任一相關輸入修正後只重跑受影響 gate。
- 必須驗收 B01–B11、B13、B15、B24、B27，並執行 B20/B22/B23 controlled harness；其他原生 API、螢幕閱讀器、200% zoom、真機、完整 Network/Storage 或真 BFCache 能力缺失時逐項標 NOT_RUN 並記錄影響。
- 記 Node/browser/device 版本、每個命令 exit code 和 preview dist/ noindex 結果。不得寫未跑的 production/live evidence。
- 向主代理交付 M1 後停止。沒有主代理明確放行，不得開始 M2。

**Commands/manual cases:** only commands listed as available in T00–T04; no new package/tool installation.

**Acceptance:**
- final npm test/check/build 都 exit 0；browser test status 有對應證據；git diff 只在本工具允許路徑。
- HANDOFF 的 M1 status、未驗項和 actual completion 一致；產品不能標 released 或 complete。

## T06 — M2 production candidate 與固定 ZIP 公開來源（主代理明確放行後才存在）

**Prerequisite:** T05 M1 gates pass，主代理完成獨立驗收並明確提供 M2 GO。沒有 GO 時本 task 是 NOT_STARTED，禁止執行。

**Allowed paths:**
- package.json
- .gitignore
- scripts/build-production.mjs
- scripts/check-production.mjs
- scripts/preview-production.mjs
- wrangler.jsonc
- HANDOFF.md
- docs/RELEASE-CANDIDATE.md

production files are generated only under dist-production/ and not committed as source. If a necessary source change is outside this allowlist, stop and ask the primary owner to return it to the feature chat and revise the task paths before editing.

**Work:**
- 保留 M1 dist/；新增 build:production/check:production/preview:production，所有 production outputs 獨立寫 dist-production/。
- 正式 origin 固定 https://agenda.glossquote.com；canonical /index.html 及 /en/index.html；hreflang zh-Hant/en/x-default，x-default 指向繁中 /index.html。回首頁用 docs/BRAND.md 的語言對應 URL。
- title/description、Open Graph title/description/locale/url/type 需符合各頁實際語言與 canonical；不使用虛構預覽圖。
- JSON-LD 只使用固定、準確的 WebApplication metadata，不含使用者輸入；對每一頁實際 script text 計算精確 SHA-256 Base64 hash，只把對應 hash 加入該頁 CSP script-src。禁止 unsafe-inline/eval 和其他來源放寬。
- 生產 robots、兩個 URL 的 sitemap、preview 仍 noindex、真正 HTTP 404、所有 header 和 MIME 均能本機測試；不做 deploy、不登入 Cloudflare、不讀 token、不安裝 CLI。
- production preview 固定 127.0.0.1:5205。執行 production gates 後，按 docs/RELEASE.md 和 docs/GIT-PUBLICATION-SAFETY.md 使用 reviewed publishing copy、Git settings guard 和固定來源 ZIP 流程；public repo 為 KYStr/glossquote-labs-event-timeline。只在主代理核准範圍發布。
- 驗證 ZIP 由固定 commit archive 產生、每個檔案 bytes 和 git blob 一致，記 ZIP bytes/SHA256、remote commit、公開 visibility 和乾淨副本 gates。source ZIP 與未追蹤產物要符合 release contract，不能包入 .runs、node_modules、秘密、帳戶資料或使用者輸入。

**Commands allowed after production scripts exist:**
- npm test
- npm run check
- npm run build
- npm run build:production
- npm run check:production
- npm run preview:production

**Acceptance:**
- dist/ preview 仍 noindex 且內容不被 production build 覆寫；dist-production/ SEO/header/404 全部符合 PRODUCT.md、UX-SEO.md 和 docs/RELEASE.md。
- Production local candidate 在 127.0.0.1:5205 通過對應檢查；production artifact 與固定 commit/ZIP source 可核對。
- GitHub publication 完成後向主代理回報 public URL、commit、visibility、ZIP size/SHA256、命令 exit 與 NOT_RUN；不做 M3。

## M3 — 主代理專屬 live deployment

M3 不屬於原功能對話任務。主代理驗收 M2 後部署 Worker 和共用首頁，確認 live 雙語頁、headers、SEO、404、核心流程及 homepage links。功能對話不得建立部署命令、呼叫 Cloudflare、修改 live DNS 或更新首頁。

# 物品標籤列印交接

## U19-30：原 HTTP scoped 主驗放行（2026-10-19）

**最新狀態：固定 M2-R1 來源沿用，原 HTTP 瀏覽器 scoped 結果為 100 PASS／8 NOT_RUN；M3 部署與雙語首頁由主代理續辦，整體版本未標 complete。** 固定公開 commit 仍為 `3cc239b1476baa18adb62d649f49588432608c6b`，沿用既有 [獨立公開來源倉庫](https://github.com/KYStr/glossquote-labs-label-printer) 收據，本次沒有重新 push 或另行查詢遠端。以下 F01、M1、M2 與舊「待主驗／BLOCKED_ENVIRONMENT」敘述均保留為當時歷史；目前原 HTTP 主驗範圍以本節及 release-scope 收據為準，不能把 scoped PASS 擴充為原生列印、正式 live 或完整版本完成。

### 主代理 station-v3 原 HTTP 證據與合併方式

主代理在已驗證的非互動 station-v3 執行原 HTTP 頁 `http://127.0.0.1:5210/index.html` 與 `/en/index.html`；原產品、CSS、CSP 與 HTTP assets 未為驗收替換。下列均為**未隨本文件附帶的工作區歷史參照**，沒有建立不可攜的相對文件連結：

- R1：`.runs/browser-acceptance-2026-10-19/station-v3/u19-30-r1/result.json`，4,050,630 bytes，SHA-256 `fc8a45e47661e8097034590f525a67a845176226346b8d93882dfc81f5d23ec9`。
- Focused R2：`.runs/browser-acceptance-2026-10-19/station-v3/u19-30-focused-r2/result.json`，456,739 bytes，SHA-256 `d47c541971d9f45cf87c10d851bb705905c86b6136fd8a601b341af88066a48b`。
- 本次範圍收據：`.runs/unblock-2026-10-19/owner-30/release-scope/receipt.json`，逐 case ID 指向採用的 R1 或 R2 結果，保留八項 NOT_RUN、原八項 FAIL 及文件／frozen bytes 核對資訊；單一外層交付包仍由主代理整合。

| 證據 | 原始／採用結果 | 範圍 |
|---|---|---|
| R1 原始結果 | 92 PASS、8 FAIL、8 NOT_RUN，原檔不改 | 八個 FAIL 全是四版型×兩語的紙張案例，停在按鈕自身 computed display 的錯誤驗收判準。 |
| Focused R2 原始結果 | 8 PASS、0 FAIL | 只重測上述八個相同 case ID；沒有重跑或改寫 R1 的其餘 92 PASS 與八項 NOT_RUN。 |
| 目前合併 scoped 結果 | 100 PASS、0 未解決 FAIL、8 NOT_RUN | 92 個未變 R1 PASS＋八個 R2 PASS；歷史 R1 八個 FAIL 仍保留，註明 harness 判讀已更正，不回填成原 R1 PASS。 |

原錯誤判準要求 `#print` 自身 computed display 為 none，但產品在 print media 隱藏其 `.preview-heading` ancestor；子元素仍可回報 inline-block。R2 改驗 ancestor display:none、按鈕 getClientRects 空與 checkVisibility=false，並同時驗標籤紙有可見的正尺寸；本次沒有產品 CSS 修補。四版型的長名稱／格位／screen 幾何及原後續 print padding、content box、named page、2mm gap、named @page 10mm margin 都已實際執行；八案共 40 個原後續斷言，沒有被可見性檢查短路。八個 context 共 48 個原 HTTP 請求均 finished，零 console、零 capture error，沒有 rendered-print-button 缺陷紀錄。

這 100 個 PASS 是本次原 HTTP 的 case scope，沒有加總先前的 CLI、核心 oracle 或離線 fixture 結果。R1 已驗證的導航／真 BFCache、loaded-tab offline、JS-disabled、Network／Storage 等只在原記錄的條件內沿用。initial 案例是 post-init ready；初始化瞬間 disabled timing 仍為該記錄內的 NOT_RUN，不能因 case PASS 宣稱已測到瞬間時序。owner 本地 browser／CUA／native 禁令未解除，本次原對話沒有自行操作瀏覽器。

### 保留八項 NOT_RUN 與發布界線

| 原 case 範圍 | 保留限制 |
|---|---|
| B14-native-print | 原生 print preview／print API／PDF／OS dialog 未執行；print-media DOM 不是原生列印或 PDF 通過。 |
| B14-paper-four-presets | 未用 A4／Letter 實體紙、印表機／driver 量測四版型的 10mm 邊界、2mm 格距或縮放。 |
| B08-native-zoom-AT-IME | 320 CSS px 與頁內鍵盤不證明原生 200% zoom、touch、AT 或 OS IME。 |
| B15-low-end | 未做低階真機效能量測；300-label 功能通過不代表所有裝置效能。 |
| C16／C18／C19／C20 core-only | schema／getter／未知 preset 不是支援表單入口；malformed surrogate 傳輸可能正規化。沿用既有離線核心證據，不假造 browser oracle。 |
| B01-module-failure | 未注入資產刪除、CSP 變更或 route 替換來製造模組失敗；瞬間初始化 timing 也未提升為 PASS。 |
| M3-live-release | 本次原 HTTP scoped 證據不包含 Cloudflare／CDN／HTTPS、正式首頁、索引或外部 release 驗收；由主代理續辦 M3。 |
| B10-cold-offline | 冷啟動離線不承諾、不模擬；已載入頁面的真正 offline 計算另有 R1 證據。 |

本輪只更新工作區 HANDOFF 與 owner-30 的新增 release-scope 收據；產品 runtime、固定 publishing-copy、來源 ZIP、R1／R2 結果及已凍結 harness 證據均不改。M2-R1 已公開來源不需重推，部署、正式站／雙語首頁驗證及單一外層 ZIP 由主代理整合。本交接不宣稱原生列印／PDF、M3 或使用者完整外部驗收完成。


## W19-30-F01-DOC：外驗文件回收（2026-10-19）

本次只回收外驗範圍與 F01 文件問題，允許改動僅本工作區 HANDOFF.md、TASK-ENTRY.md。固定來源仍為 `3cc239b1476baa18adb62d649f49588432608c6b`；沒有產品核心缺陷修復、GitHub 重發、部署或封裝採用。本節是最新外驗回收紀錄；以下 2026-10-18「外部驗收未開始／待主驗」等敘述保留為當時歷史，不改寫成這次外驗結果，整體版本仍未完整完成。

### 本工具外驗結論與證據邊界

已讀取安全解出位置 `.runs/external-new-tools-2026-10-19/intake/` 的 00-START-HERE.md、02-REPAIR-TASKS.md、04-NOT-RUN.md，並核對 01-ACCEPTANCE-REPORT.md、REVIEW-RESULTS.csv 與 findings.json 的本工具項目。這是本次工作區讀取位置，不承諾隨可攜交接包提供；附件只作證據，未執行任何附件腳本。以下為外部覆核者回報的實測，非本原 chat 本次重跑：

| 本工具 30 的外驗範圍 | 回報結果／限制 |
|---|---|
| 固定來源／原有 CLI | `3cc239b…`、41 來源檔；原有 133/133 tests 與 CLI gates 通過。外驗使用真正 Node v24.11.1，與提供者 v24.14.0 分開記錄。 |
| 既有固定核心對照 | 250/250；是外部重新執行既有期望，不稱為本輪新發明的 oracle。 |
| 新增核心對照 | 1,000/1,000 Python 獨立生成期望，主要覆蓋合法輸入；可能與既有案例重疊，不加總為全產品獨立通過率或非法輸入窮舉。 |
| 離線 DOM | 50/50（繁中／英文各 25），狀態僅 `PARTIAL_OFFLINE_DOM_PASS`。 |
| 原程式本機 production HTTP | 9 群組，僅 `PASS_LOCAL_MODEL_ONLY`；不是正式 Cloudflare／CDN／瀏覽器 CSP 執行驗收。 |

50 個 DOM 案例使用 Debian headless Chromium 的 `about:blank`＋`set_content` fixture：CSS 改 inline、ESM 改 data URL，並只在 fixture 移除 meta CSP；原產品來源 bytes 未改。這可作離線事件／DOM 證據，不能提升為原 HTML＋HTTP 模組載入、完整原路徑 E2E、真實導航、CSP 執行、原生能力或正式發布通過。外驗未發現已確認的產品計算缺陷，不需要修改核心來迎合歷史驗收框架誤報。

### F01 與後續可攜交接規則

F01 為 `LOW_DOCUMENTATION`：原驗收包 `specifications/30/HANDOFF.md:231–233` 的三個歷史 `.runs` 相對連結沒有隨包提供，影響找證據，不是計算、CSP、HTTP 404 或部署漏洞。文件 bytes／manifest 正確與相對引用不可達可同時成立。本工作區已將原三個連結改為明示「未隨包的工作區歷史參照」純文字，保留原路徑及主驗敘述；不再製造可點但在封裝內不存在的目標。

外驗已附 `repairs/F01-HANDOFF.patch` 與文件修正版 ZIP；其採用、封裝與核對由主代理處理，本原 chat 未執行 repair_docs.py、未改封存包或 PACKAGE-MANIFEST.json。外驗回報修正版只變更封裝內 HANDOFF 與 manifest，333 項校驗及 132 個相對文件連結通過，142 個來源檔／5 個來源 ZIP bytes 未變；這些是外驗的封裝結果，不冒稱本次另做全包重驗或已由主代理採用。

依外驗修法，原交接包內的 `evidence/30/m2-primary-review.json`、`evidence/30/fixed-source/source.json`、`evidence/30/fixed-source/commands.json` 可作「相關交接證據」另列，**未證實它們與上述舊 `.runs` 檔案 bytes 相同**。不得把新／相關證據改掛舊檔案名稱、冒充原始內容，或在尚未核對目的地的工作區文件加入包內限定連結。未來可攜交接若不攜帶歷史工作區檔，須保留「未隨包」標示及純文字路徑；若另附相關資料，須分別說明來源、用途與 byte 等價性是否已驗證。

### 未驗項與本次收尾

原 HTML＋HTTP 完整 E2E 仍為 `BLOCKED_ENVIRONMENT`；完整語言確認後導航／真實模組失敗 HTTP 情境、完整 Network／Storage、原生列印預覽、A4／Letter 四版型實體量測、native zoom／其他瀏覽器／手機、AT／IME、真實 BFCache／頁面丟棄／離線首次載入均依 04-NOT-RUN 保留未驗。正式 Cloudflare／HTTPS／CDN／索引／效能與 M3 仍未驗、未部署；來源／CLI／核心外驗通過不等於 live、首頁或完整產品驗收完成，其餘 29 工具也未在本輪重驗。

本機 browser／CUA／native 仍全部禁止（含 hidden、截圖、導航）；後續本機 UI 維持 `NOT_RUN_USER_FOCUS_INCIDENT`，不以外部離線 fixture 結果解除限制。本次未做 UI、產品測試／build、附件腳本、GitHub／Cloudflare、credential 讀取、持久 Windows／Git 設定、服務操作或再委派；僅修改兩份允許文件並核對 diff。F01 封裝採用仍由主代理核對，文件回收不標整體產品完成，不輪詢、不要求使用者轉貼。

**最新驗收結果（2026-10-18）：主代理已放行 M2-R1 的來源與工具鏈。** 固定 commit 仍為 `3cc239b1476baa18adb62d649f49588432608c6b`；本次僅依指示補記工作區 HANDOFF，不修改公開來源、固定 ZIP、candidate/evidence manifests 或其他狀態檔。以下「待主驗」文字均為交接當時歷史，最新結果以本段及檔末「主代理驗收收尾」為準。M3 未執行／正式核心操作待驗／外部驗收未開始，整體版本未完成。

**目前只有 M2-R1 commit `3cc239b1476baa18adb62d649f49588432608c6b` 可供主代理候選驗收**；完整 R1 交接在本檔末尾。pre-R1 `55f8387a…` 已被主代理阻止整合，以下 M2／M1 資料均保留為歷史，不可用舊 assets 目錄部署。R1 已將 production manifest 移出部署目錄，133/133 tests／六命令／PUBLIC source／新 ZIP／guards 通過，仍待主代理獨立驗收，沒有部署或 UI 重驗。

目前里程碑：**M2_PUBLIC_SOURCE_VERIFIED，等待主代理 M2 主驗**。固定 public commit `55f8387a1eb1d335a57ec9cd4fa1864ba34fbf48`；完整 M2 區段在本檔末尾。M1 已由主代理放行。以下 M1 文字為歷史紀錄，不代表目前尚未公開；沒有修改當時證據。M3 部署／首頁仍未執行，全部互動 UI automation 因焦點事件暫停，後續 UI 為 NOT_RUN_USER_FOCUS_INCIDENT。

2026-10-18，W18-30-M1 本機候選已固定，等待主代理獨立驗收及明確 M2 GO。此輪只有 M1，沒有公開來源、production 工具鏈、hosting、首頁整合或外部驗收；版本未標 complete。

## 候選與範圍

- 原功能 chat：01a14c6b-2862-74f0-8569-642e3a450917；主代理：01a0c75e-24c2-76e1-8c70-536ae1ad1fbf。dispatch 已明確放行 M0／M1。
- requested gpt-6.1-sol/max；工具設定與實際 backend identity 無獨立確認證據，沒有宣稱切換／自證模型。
- Node v24.14.0、npm 11.9.0，ESM、built-ins、零套件、沒有 npm install；沒有 dotnet、憑證、token、Git 設定或 persistent environment 操作。
- 核心固定 public/js/core/label-printer.mjs calculateLabels(request)。精確 descriptors schema、固定錯誤／順序、Unicode、10 KiB／80 code points／20 copies／300 labels、原順序／重複、相鄰副本、四版型、分頁和 null 尾格完整實作。
- UI 為家族 Product App 工作表：雙語空白初始、預設 1／A4 2×7、明確範例、建立預覽、欄位錯誤、修改同步淘汰、確認清除／切語言、pagehide／pageshow reset；只用 textContent/value，沒有儲存、下載、clipboard、QR、遠端字型或服務。
- 預覽和列印皆使用四個固定 class／命名 @page、10 mm 頁邊／2 mm 格距；不是預裁貼紙套版。9 pt 標籤資料字級讓 80 字元可置於最小格；UI body 16 px。最後補了 print media 相鄰頁 margin 的明確重設，避免高 specificity 螢幕規則殘留。
- 普通 own-data 物件接受 Object.prototype 或 null prototype；其餘 prototype、accessor、symbol／non-enumerable／extra／missing own key 均拒絕，反射例外固定 schema error，getter 不執行。此為 plain record 的保守解析，沒有改六規格。

## 改檔與固定清單

新增 18 個來源檔：

- package.json、.gitignore。
- public/index.html、public/en/index.html、public/404.html、public/robots.txt、public/_headers、public/assets/app.css。
- public/js/app.mjs、public/js/messages.mjs、public/js/render.mjs、public/js/core/label-printer.mjs。
- scripts/contract.mjs、scripts/check.mjs、scripts/build.mjs、scripts/preview.mjs。
- test/label-printer.test.mjs、test/engineering.test.mjs。

更新本工具 HANDOFF.md、START-HERE.md、project.json、TASK-ENTRY.md、docs/RELEASE-CANDIDATE.md 狀態。依本輪新增使用者指令，另在 AGENTS.md 記錄「只用隔離隱藏瀏覽器分頁」限制。build 產生 dist/ 內 10 靜態檔及 manifest.json。README／PRODUCT／TECHNICAL／UX-SEO／ACCEPTANCE／TASKS 六規格未改；其原始 M0 狀態文案保留，當前狀態以本交接及 project.json 為準。

dist/manifest.json SHA-256：`ac8bd6d532e1d8cd4fe8d80836945ba6d24ecf82bb70c2ff3cb8974a0f72746a`。其中 18 個 source 和 10 個 output 逐檔列 bytes／SHA-256，排除 manifest 自身。根唯一證據目錄 `.runs/label-printer/W18-30-M1-01a14c6b-20261018/` 的 fixed-candidate.json 另固定全工具清單（含狀態文件、六規格、dist），spec-comparison.json 比對開始時六規格 hash。證據未放入 public／dist。

## 精確命令與結果

工作目錄固定 `<LOCAL_WORKSPACE>/tool-projects/30-label-printer`。以下為 PowerShell 命令，最後候選各跑一次，結果在 commands-final.json 與同名 log：

| 命令 | exit | 結果 |
|---|---:|---|
| `& 'C:/Program Files/nodejs/node.exe' --version` | 0 | v24.14.0 |
| `& 'C:/Program Files/nodejs/npm.cmd' test` | 0 | 116 tests、116 passed、0 failed／skipped／cancelled |
| `& 'C:/Program Files/nodejs/npm.cmd' run check` | 0 | 18 source allowlist、雙語 noindex、CSP／隱私／初始 disabled／語法通過 |
| `& 'C:/Program Files/nodejs/npm.cmd' run build` | 0 | 10 靜態檔＋deterministic manifest，逐檔再驗 |
| `& 'C:/Program Files/nodejs/node.exe' scripts/preview.mjs` | running | 僅 127.0.0.1:4210，保留 session 9848 |
| `& 'C:/Program Files/nodejs/node.exe' '<LOCAL_WORKSPACE>/.runs/label-printer/W18-30-M1-01a14c6b-20261018/verify-running.mjs'` | 0 | 執行中的 dist 9 個可公開資產 hash、兩語、HEAD、headers 與 4 個真實 404 路徑通過 |
| `& "$env:USERPROFILE/.codex/check-persistent-environment.ps1"` 前／後 | 0／0 | PASS，完整 Snapshots 一致 |

116 tests 包含 104 個核心／schema／邊界／不可突變／順序測試，和 12 個工程／C24 geometry／headers／HTTP／link／stale-build 測試。C01–C24 全有獨立手寫 expected 或獨立固定幾何值；300 張 C07 比較全部 22 頁，沒有用核心產生 expected。測試無外部網路，HTTP 僅 task-owned loopback。檢查拒絕未知檔案、symlink／Windows junction／hardlink、path traversal、stale source/output；HTTP 為 GET/HEAD、正確 MIME、405/404，無 SPA fallback。

歷史首輪 npm test exit 1（114/116）：C24 測試 selector parser 未處理逗號群組，以及 HTTP 拒絕帶 body 的 GET 後連線未關造成下一個請求誤讀。前者修正獨立 CSS 解析，後者在 400 body／405 時關閉連線；focused 12/12 通過，最終全 116/116。沒有降低 gate。print-only margin 修正後才跑上述 final commands。為載入最後固定資產，只識別並停止本輪 session 42993 的 server PID 57512，證據 server-restart.json；未終止其他服務。

## 真實瀏覽器證據

使用 CUA in-app browser 的 DOM-backed reads／locators；browser-results.json 記逐項觀察，沒有 mock print。已實測：

- 繁中與英文初始空白、預設值、範例不自動預覽、空清單／份數格式錯誤與修復、欄位 aria-describedby／invalid／焦點。
- 兩語 X,Y／copies=2 → X,X,Y,Y；重複列保留；名稱／份數／preset 三類變更立即移除頁面並停用 print。
- 清除初始不確認；只改份數、只改版型、已有工作時取消保留／確認歸預設；雙語清除和語言切換取消／確認。
- 15 個名稱 → 第 2 頁 N15＋13 空格；四 preset 的 80 emoji／混合中英／無空白長字串皆在格內，實際 DOM 幾何符合固定網格。
- 英文 320px 純頁內鍵盤輸入、arrow 選版型、Enter 建預覽、Tab 到 print；print focus outline 2 px 可見、控制寬 273 px。繁中 320px 初始重排；兩語 documentWidth 305 ≤ innerWidth 320。
- 標記字串 `<img src=x onerror=alert(1)>` 顯示文字，application DOM img=0、inline style=0，URL 未含輸入。曾有 global [style] 探針發現 Codex comments overlay；此不是產品 CSS，不以其代替產品判斷。
- 實際返回前語言頁後輸入空白、copies=1、A4 2×7、無預覽；最後 build 後重載亦為空白狀態。是否使用 persisted BFCache 不可觀察，另列未驗。

截圖（根唯一 evidence 目錄）：zh-initial.jpg、zh-preview.jpg、zh-language-confirm.jpg、en-initial.jpg、en-long-labels.jpg、en-320-form.jpg、en-320-preview.jpg、zh-320-initial.jpg、en-final-initial.jpg。桌機／手機畫面已一起檢視，任務內容主導、單欄重排、預覽內部捲動、焦點可見；最後改動只在 print media，不改螢幕版面，沿用未變 UI 證據。

歷史自動化輸入曾有置換值不符 fixture；先校正及讀值確認後才接受結果。後續另一個 hidden-tab draft mismatch 沒有被列為通過的指定輸入測試，也沒有以其聲稱 300 張真機量測。所有測試只用假資料；browser 結構化記錄不收集使用者原始資料。

## Windows 與 Git guards

environment-before.json／environment-after.json／environment-comparison.json：Status PASS 且完整 Snapshots canonical JSON 前後完全相等，包含 PATH hash／registry type／length／ephemeral count、full Environment-key fingerprint、TEMP/TMP hashes、entry／duplicate counts：

| scope | PATH type／length／ephemeral | PATH SHA-256 | Environment-key SHA-256 |
|---|---|---|---|
| HKCU | ExpandString／834／0 | 3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb | 3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a |
| HKLM | String／1227／0 | 52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8 | a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82 |

未更動任何 persistent state。既存 duplicate PATH entries 原樣保留。M1 未做 source publication，因此 Git settings guard N/A；M2 前後必須依既有契約 capture/verify，不能沿用環境 guard 代替。

## NOT_RUN 與實際限制

| 項目 | 原因／界線 |
|---|---|
| 原生 print preview、四 preset 原生紙張、真印表機、10mm／2mm 實體量測 | 限制前一次真實 print click 使 CDP Input.dispatchMouseEvent timeout，後續只能觀察工作頁；未觀察原生預覽。使用者後來明確禁止觸發 OS 對話框，沒有再試、沒有桌面關閉、沒有 mock。 |
| 真正 200% browser zoom | IAB 只有 viewport／visibility capability；限制前 Control+Equal 沒改變 ratio=1／innerWidth=1280，Control+0 後仍相同。未用 CSS zoom 假裝原生縮放通過。 |
| 完整 Network/Storage（含隱藏／恢復） | 沒有完整觀測能力；只通過 HTTP／CSP、靜態 API、DOM／URL 與生命週期檢查，不聲稱完整零網路證明。 |
| 資源載入後斷線計算、冷啟動離線 | 沒有 offline transport 切換；在線載入分頁的本機計算已走過，不能充當斷線驗收。 |
| 真正 JS-disabled 瀏覽器 | 沒有停用 JS capability；原始 HTML disabled／unnamed controls、submit capture、CSP／noscript 以離線檢查證明，非真實停用 JS 測試。 |
| persisted BFCache 模式 | 真實 back 返回空白通過，但不能觀察是否用 persisted BFCache。 |
| 低階／慢速真機、實體手機、mobile OS printing | 沒有裝置。核心 300 張已逐格測試，不聲稱所有設備效能或手機列印。 |
| 真實 screen reader、系統 reduced-motion preference | 無設備／OS 設定操作；DOM/AX、focus、CSS reduced-motion 分別有證據。 |

這些 NOT_RUN 與對應風險保留給主代理／外部 reviewer，不因核心、HTTP 或靜態檢查通過而改 PASS。

## 後續測試限制與里程碑

使用者 2026-10-18 即時要求功能測試不控制電腦，避免干擾其工作。後續 UI 僅本工具專用隔離／隱藏瀏覽器分頁，不用 desktop/native app/OS 滑鼠鍵盤、不開或搶焦點、不動既有分頁／桌面／剪貼簿；只可用瀏覽器 DOM、頁內鍵盤與工具直接支援且不開 OS 視窗的操作。不得為測試開原生列印、檔案選擇、下載儲存或其他系統對話框；若已有視窗不得以桌面關閉，換新專用隱藏分頁繼續。此限制前的可見 IAB／一次列印嘗試已保留歷史，限制後只用新 hidden tab 與 DOM，未重試列印。背景 CLI 驗收可繼續。

下一步由主代理獨立驗收 M1。只有明確 M2 GO 後，本原 chat 才能製作 production 工具鏈、發布審核過的 public KYStr/glossquote-labs-label-printer、驗證 remote commit／visibility／固定 ZIP。M3 labels.glossquote.com 與雙語首頁只由主代理。外部驗收前不得標版本 complete；當前 sourceStatus=not-published、hostingStatus=not-deployed、externalReviewStatus=not-run。

## W18-30-M2：Production 工具鏈與公開來源（2026-10-18）

主代理已明確 M1 GO／M2 GO，回報其親讀核心/UI/工具鏈、重跑 116/116 與獨立 250 cases、雙語主要及 stale/error/clear/language 瀏覽器實測。這是主代理回報，沒有冒稱本原 chat 又跑 250 cases。本輪只 production／PUBLIC source，現在停在 M2 等主驗，不輪詢主對話。沒有 Cloudflare 呼叫、CLI 安裝、token loader、部署或首頁修改，不標整體版本 complete。

### 公開識別與固定 ZIP

| 欄位 | 已驗證值 |
|---|---|
| repository | https://github.com/KYStr/glossquote-labs-label-printer |
| visibility | public，GitHub API 實際回應 |
| local／remote／API full commit | 55f8387a1eb1d335a57ec9cd4fa1864ba34fbf48（三者相同） |
| branch／default branch | codex/m2-label-printer |
| local publishing repository | <LOCAL_WORKSPACE>/.runs/label-printer/W18-30-M1-01a14c6b-20261018/m2/publishing-copy |
| source ZIP | <LOCAL_WORKSPACE>/.runs/label-printer/W18-30-M1-01a14c6b-20261018/m2/glossquote-labs-label-printer-55f8387a1eb1d335a57ec9cd4fa1864ba34fbf48.zip |
| ZIP bytes／files | 96260 bytes／41 files |
| ZIP SHA-256 | 9044f5d96b55a14f191bdda02b33352928b5018134992084be4d863bad6eb616 |
| ZIP root | 無 prefix；package.json 直接位於根 |
| ZIP 核對 | git archive 固定 commit；ZIP commit comment 相同，41 檔逐一與 reviewed source bytes／fixed git blobs 完全相同，無 symlink／重複或 traversal path |

公開副本只包含固定 41 檔：23 source／config／test files 加 18 文件；沒有 .runs、node_modules、build 產物、帳戶路徑、chat 識別或使用者資料。五個內部狀態文件（HANDOFF／START-HERE／TASK-ENTRY／project.json／RELEASE-CANDIDATE）在副本改為公開安全摘要；其餘來源與六規格保持 bytes，文件也帶有目前 UI suspension。workspace／public status 差異已明列，不冒稱兩者整份文件相同。公開 commit／ZIP 已凍結後沒有再寫新 commit；本段及其他最新狀態只寫工作區。

### 本輪改檔與產品邊界

- 新增 .gitattributes（`* -text`），避免 Git 換行轉換使 archive／checkout bytes 改變；不改任何 global Git 選項。
- 新增 wrangler.jsonc：純 JSON，worker glossquote-label-printer、compatibility_date 2026-10-18、domain labels.glossquote.com、assets.directory ./dist-production、html_handling none、not_found_handling 404-page。workers_dev／preview_urls／send_metrics／observability.enabled/logs.enabled/invocation_logs/traces.enabled 全 false，無 Worker script、bindings 或 secrets。這是本機契約驗證，沒有呼叫 Cloudflare 驗部署。
- 新增 scripts/production.mjs、scripts/production-preview.mjs、test/production.test.mjs。修改 package.json、scripts/contract.mjs、scripts/check.mjs、scripts/preview.mjs 及 engineering.test.mjs 的 source count assertion。23-source allowlist；test 增加 concurrency=1，避免不同 test worker 的安全 fixture 互相造成未知檔案錯誤。
- public/ 十檔全部保持已驗 M1 SHA-256，六規格也未改。production 僅在 dist-production/ 轉換 head metadata；body、核心、CSS 和 runtime bytes 不變，preview dist/ 不被 production build 改寫。
- production 固定 https://labels.glossquote.com；兩語 self-canonical／zh-Hant/en/x-default reciprocal links／OG／index meta。WebApplication 與四個可見 FAQ 的 FAQPage 共用一個 JSON-LD block；逐頁 HTTP 與 meta CSP 含其精確 bytes 的 SHA-256 hash，無 unsafe-inline/eval。
- `_headers` 全域 noindex；canonical 先 `! X-Robots-Tag`，再 index, follow，CSP 也先移除繼承再設精確值。模型真的合併重複 header，缺刪除會變成 noindex, index 並由 gate 拒絕。robots 用最長 prefix／同長 Allow 優先，所有必要 JS/CSS 與兩個 canonical 實際允許；sitemap 只列兩頁。
- 404 無工具表單或 SPA fallback；`/`、`/en/` 以固定 `_redirects` 308 到 canonical，這些 noncanonical response 保留 noindex。`_headers`／`_redirects`／manifest 與 source 不對 HTTP 公開。
- 工作區狀態更新 HANDOFF／START-HERE／TASK-ENTRY／project.json／RELEASE-CANDIDATE；本工具 AGENTS 記錄最新焦點事件及澄清。只寫本工具與原唯一 root evidence 下 m2/。

### 精確 gate、count 和 asset manifests

最終 Node v24.14.0／npm 11.9.0。下面每一命令在 workspace 和 reviewed publishing copy 都 exit 0；固定程式後各驗一次，加入 bytes 保留屬性後只對必要 inputs 重跑。131 tests = 原 116＋15 production；0 failed／skipped／cancelled。

| 精確 PowerShell 命令 | workspace／copy exit |
|---|---:|
| `& 'C:/Program Files/nodejs/npm.cmd' test` | 0／0 |
| `& 'C:/Program Files/nodejs/npm.cmd' run check` | 0／0 |
| `& 'C:/Program Files/nodejs/npm.cmd' run build` | 0／0 |
| `& 'C:/Program Files/nodejs/npm.cmd' run build:production` | 0／0 |
| `& 'C:/Program Files/nodejs/npm.cmd' run check:production` | 0／0 |
| `& 'C:/Program Files/nodejs/npm.cmd' run release:check` | 0／0 |

各 log 與 exact command/exit 為 m2/commands-final.json、commands-clean.json。原碼出版的所有 git/gh/guard argv、cwd、exit 與有界 stdout／stderr 在 publication-commands.json；初始 repository discovery 的 HTTP 404／exit 1 是預期「尚無 repo」，後續 create／commit／push／remote/API verify／archive／blobs／guard 均 exit 0。無登入、權限或 guard 失敗。

| manifest | records／SHA-256 |
|---|---|
| dist/manifest.json（evidence 同副本 preview-manifest.json） | 23 source＋10 assets；1c920b5073bead10a763c5810242c1c640ca5f825dc484b3b80b55355cd2a2a6 |
| dist-production/manifest.json（evidence 同副本 production-manifest.json） | 23 source＋12 assets；b37174a8bc93ac1b1972a3e65c65d70d1cae517f4bd462140174b48eb321db2e |

兩份 manifest 排除自身，逐檔 bytes/SHA-256；workspace 與 clean copy manifest byte-identical。m2/frozen-comparison.json 另證明 M1 public 十檔及六規格不變。新增 .gitattributes 及 M2 工具鏈會改變 manifest 的 source fingerprints，因此沒有冒稱 M2 manifest 等於舊 M1 hash；真正 preview 靜態資產 bytes 相同。

production model 僅 127.0.0.1:5210（session 28881），preview 4210（保留 session 9848）。`verify-model.mjs` exit 0，在執行中的兩模型核對 19 個 asset response hashes、8 個 production redirect／404 route responses＋HEAD；effective headers、CSP、XML/ESM/CSS/TXT MIME 正確，證據 http-model-final.json。不是正式站或 Cloudflare response 驗證。

### Guards、UI 事件及 NOT_RUN

M2 前後執行既有 Windows guard，environment-before/after/comparison.json 為 PASS，完整 Snapshots canonical JSON 相等（不只 PATH）；HKCU ExpandString／834／0 ephemeral、HKLM String／1227／0 ephemeral，以及 PATH／完整 Environment／TEMP/TMP hash、registry type／length／duplicate count 均原樣。與上方 M1 hash 相同，沒有猜測還原或 persistent Windows 變更。

publication block 前 `git-settings-guard.mjs capture`、finally 中 verify 皆 PASS，known 三個 user/system Git settings fingerprint 未變。只用既有官方 git/gh，task-owned publishing copy、per-command identity／autocrlf／hooks／signature／helper 選項。GitHub helper 只由 Git 使用既有 gh 認證，沒有獨立擷取／列印 token，沒有 auth setup-git/login/refresh、global/system Git 寫入或帳戶憑證手動讀取。process-local 清除 GIT_TRACE*／GIT_CURL_VERBOSE／GH_DEBUG，關閉 Git／GCM／gh 互動提示，退出即失效，未改任何 User/Machine 設定。

M2 UI 歷史：暫停指令前在專用 hidden IAB 讀取兩語 production metadata／空白初始化（兩語 build enabled、無 CSP warnings/errors），截圖 production-zh.jpg／production-en.jpg、browser-model.json。最後 UI 工具檔案落盤為台北 2026-10-18 08:57:53.520–.687；這是 artifact mtime，不是精確 API 起訖。該次 API 為 goto、AX、唯讀 evaluate、screenshot、dev.logs、markHandoff、visibility.get，無 fill/click/press/viewport；呼叫已完成，無 pending UI call、無 UI child process 或 subagent。這些事實**不能推定沒有焦點干擾**，hidden 不是輸入隔離證據。

收到焦點／IME 干擾的緊急指令後沒有再做任何 browser/native/computer UI 呼叫，沒有調查性 UI 呼叫、關閉視窗／分頁／程序、換控制技術、安裝或付費。使用者後續「可以操作，但不能影響到我」不恢復 hidden IAB 輸入；主代理證實真正隔離前，只繼續背景 CLI／HTTP／檔案與已授權來源工作。**全部後續 UI 項為 NOT_RUN_USER_FOCUS_INCIDENT**，等待主代理主動重新放行；不等待／輪詢。

原生 print preview、四 preset 實體紙張／毫米精度、完整 Network/Storage、真機／低階設備、native 200% zoom、offline／JS-disabled、persisted BFCache mode、screen reader／系統 reduced-motion 等 M1 NOT_RUN 原樣保留。主代理未觸發列印，本原 chat 也未在 M2 觸發列印；沒有以模型／HTTP／靜態檢查或 mock 冒充人工通過。

M2 固定來源已公開，等待主代理 M2 驗收；M3 免費部署 labels.glossquote.com 及首頁僅主代理。hosting=not-deployed、homepage=not-modified、externalReview=not-run。requested gpt-6.1-sol/max 與實際 backend identity 未獨立確認仍分開記錄。外部確認前整體 goal／版本均不標 complete。

## W18-30-M2-R1：Production inventory 移出部署資產（目前版本）

主代理的具體發現成立：前版 build 將含 sources 的 manifest.json 寫在 Wrangler assets.directory 中，但 model 的 Map 沒載入它，造成真正部署與 HTTP 模型不一致。前版 `55f8387a…` 因此停止整合；保留其 public Git parent、原 ZIP／publication.json／zip-verification／logs／guards，不改寫歷史證據。R1 已直接修正檔案拓樸，沒有放寬 HTTP allowlist。

### 固定來源

| 欄位 | R1 已驗證值 |
|---|---|
| repo／visibility | https://github.com/KYStr/glossquote-labs-label-printer ／public |
| local／remote／API commit | 3cc239b1476baa18adb62d649f49588432608c6b（三者相同） |
| parent commit | 55f8387a1eb1d335a57ec9cd4fa1864ba34fbf48 |
| branch／default | codex/m2-label-printer（正常 fast-forward，無 force） |
| local publishing repository | <LOCAL_WORKSPACE>/.runs/label-printer/W18-30-M1-01a14c6b-20261018/m2/publishing-copy |
| ZIP | <LOCAL_WORKSPACE>/.runs/label-printer/W18-30-M1-01a14c6b-20261018/m2/r1/glossquote-labs-label-printer-3cc239b1476baa18adb62d649f49588432608c6b.zip |
| ZIP bytes／files／prefix | 95413／41／無 prefix，根直接含 package.json |
| ZIP SHA-256 | 95fe375cd33c24409492b5cb280a9696bb3597d8789ba15e15dec873ed514348 |
| ZIP verification | git archive fixed commit，ZIP commit comment 相同，41 檔逐一與 reviewed source bytes／git blob 完全相等；無重複／traversal／symlink |

所有 R1 證據只放原唯一 root evidence 下 `m2/r1/`。repo 仍只含 41 個 allowlisted source/doc files，沒有 builds、外置 inventory、.runs、node_modules、帳戶路徑／chat ID 或使用者輸入。五份公開狀態文件為安全 R1 摘要，完整內部交接只在工作區；凍結 R1 commit／ZIP 後沒有新增狀態 commit。

### R1 改動與驗收

- 只修改 .gitignore、scripts/contract.mjs、scripts/production.mjs、test/production.test.mjs，以及允許的工作區狀態紀錄；public/ 核心／UI／CSS 完全不改，六規格完全不改。
- 新的 production manifest 位於工具根 `dist-production-manifest.json`，由 build/check/release 使用並加入 .gitignore。metadata 檔另做 regular-file／symlink／hardlink 安全檢查。preview `dist/manifest.json` 位置維持。
- Wrangler assets.directory=./dist-production 不改；build/check 對該實際目錄只允許精確的 PRODUCTION_FILES，沒有 manifest.json 或 dist-production-manifest.json。兩個新增回歸讀取真正 config 資產路徑，確認恰 12 檔且外置 manifest 不在其下；誤把 inventory 放回 assets 時，check 和 build 都必須拒絕，沒有靜默刪除或假 HTTP 404 通過。
- 原工作區與 publishing copy 中的舊生成 manifest 經 absolute path 及原 SHA-256 確認後，逐一以檔案 Move-Item 移出 assets；沒有遞迴刪除或移動未知資料，沒有終止任何既有 server／UI process。
- 最終 Node v24.14.0、npm 11.9.0，workspace 與 publishing copy 各 **133/133 tests**，0 failed／skipped／cancelled。原 116＋15 production＋2 R1。六命令在最終程式後各跑一次，全部 exit 0：

| 精確命令 | workspace／copy exit |
|---|---:|
| `& 'C:/Program Files/nodejs/npm.cmd' test` | 0／0 |
| `& 'C:/Program Files/nodejs/npm.cmd' run check` | 0／0 |
| `& 'C:/Program Files/nodejs/npm.cmd' run build` | 0／0 |
| `& 'C:/Program Files/nodejs/npm.cmd' run build:production` | 0／0 |
| `& 'C:/Program Files/nodejs/npm.cmd' run check:production` | 0／0 |
| `& 'C:/Program Files/nodejs/npm.cmd' run release:check` | 0／0 |

logs／exact argv/cwd/exit 在 r1/commands-final.json、commands-clean.json、publication-commands.json；Git/gh/guard 全部 exit 0。只用既有官方 CLI 與 per-command git -c，未做 auth setup/login/refresh、global/system 設定寫入或 credential/token 直接擷取。GIT_TRACE*／GIT_CURL_VERBOSE／GH_DEBUG 與互動提示只在子 process 清除／關閉。

| R1 manifest | SHA-256 |
|---|---|
| dist/manifest.json（r1/preview-manifest.json） | dca8cd417e52872177154ecb32055488e024901d1f22d6e88aa845d69b0d8c4a |
| **dist-production-manifest.json**（r1/production-manifest.json） | 3d897b543938e1a69b4fcb17a678cfc9ef7825fdef8967df5aceffcb42539437 |

兩份含 23 source fingerprints、preview 10／production 12 asset records，排除自身；workspace／copy byte-identical。r1/deployed-assets.json 記真正 assets.directory 的精確 12 個檔案：404.html、_headers、_redirects、assets/app.css、index.html、en/index.html、js/app.mjs、js/core/label-printer.mjs、js/messages.mjs、js/render.mjs、robots.txt、sitemap.xml。其中沒有 inventory／manifest／source metadata。r1/frozen-comparison.json 驗 M1 public 十檔與六規格 unchanged。

背景 CLI `verify-final.mjs` exit 0：在既有 loopback 4210／5210 上比對 19 個 asset response hashes、10 個 production routes＋HEAD，包含兩種 manifest URL 的 404；同時直接檢查真正部署目錄，沒有只以 HTTP model 推論。HTTP head/body／effective CSP 與 robots／MIME／404 不變；不是正式 Cloudflare 或 live release 驗證。

### R1 Guards 與剩餘邊界

R1 publication block 另有新 Git settings capture／finally verify，皆 PASS，與前版分開保存；Windows R1 before／after guard PASS 且完整 Snapshots 相等。環境／Git evidence 均在 r1/，沒有 persistent state 漂移或未授權復原。兩份來源 ZIP、兩個 public commits 與各自 guard/logs 保留，R1 不改前版識別。

**R1 完全沒有 UI 重驗或任何 UI 呼叫**。全部本機互動 UI automation 仍暫停，後續皆 NOT_RUN_USER_FOCUS_INCIDENT；不因「可以操作，但不能影響」推定 hidden 可安全輸入。先前原生 print／四版型紙張量測／完整 NetworkStorage／真機／native zoom／offline／JS-disabled／BFCache mode 等 NOT_RUN 原樣保留，沒有 mock 或靜態檢查冒充。

R1 公開來源已核對，停在 M2-R1 待主代理獨立主驗；不輪詢、不自行部署／首頁或花費。M3 labels.glossquote.com 與雙語首頁僅主代理；hosting not-deployed、homepage not-modified、externalReview not-run。requested gpt-6.1-sol/max；backend identity 仍未獨立確認。整體 goal／產品版本尚未 complete。

## 主代理驗收收尾（M2-R1 已放行，2026-10-18）

主代理已明確回覆 R1 主驗通過，並放行 M2 來源／工具鏈；舊 `55f8387a…` 不部署。本原 chat 已讀取其獨立結果與固定 ZIP 解出／gate 紀錄，沒有重跑未變產品檢查，也沒有將主代理測試冒稱為本原 chat 新增執行：

- 主驗結果（未隨包的工作區歷史參照：`../../.runs/new-tools-2026-10-18/30-primary/result.json`）：status `PASS_PRIMARY_SOURCE_TESTS_BUILD`，commit `3cc239b1476baa18adb62d649f49588432608c6b`，來源 41 檔，test 133/133，其餘 check/build/build:production/check:production/release:check 均 exit 0；實際 assets 恰 12 檔、無 manifest／source inventory，hosting `NOT_DEPLOYED`。結果檔時間 2026-10-18T01:16:07.638Z（台北 09:16:07.638）。
- 獨立解出紀錄（未隨包的工作區歷史參照：`../../.runs/new-tools-2026-10-18/30-fixed-gate-run/extraction.json`）：固定 R1 ZIP 的 SHA-256 為 `95fe375cd33c24409492b5cb280a9696bb3597d8789ba15e15dec873ed514348`，`PASS_SAFE_EXTRACT`。主代理另回報已逐檔比對 Git blobs，以及 GitHub public/default branch 的完整 commit。
- 六命令 gate 紀錄（未隨包的工作區歷史參照：`../../.runs/new-tools-2026-10-18/30-fixed-gate-run/gates.log`）：六項 exit 0，記錄 `PASS fixed source/checks/build 41 12`。主代理亦親讀 55f8387→3cc239b diff、外置 manifest 與實際 assets 拒絕回歸。

本次驗收只涵蓋固定來源與工具鏈，**不等於 live／首頁整合／外部驗收通過**。M3 必要正式核心操作仍因真正 focus 隔離未確認而待驗；全部本機互動 UI automation 暫停及 NOT_RUN_USER_FOCUS_INCIDENT 不變。原生 print／四版型實體紙張精度／完整 NetworkStorage／真機等既有 NOT_RUN 原樣保留。

依主代理本次指示，本原 chat 收尾僅改 HANDOFF，未做 UI、Cloudflare、部署、首頁、新 milestone、commit/push 或輪詢。固定 commit／ZIP／舊歷史證據均保留。整體 goal 尚缺主代理 M3／正式操作 gate 與外部確認，目前仍 blocked，沒有標 complete；收到原 chat 後續返修任務時再在授權範圍處理。

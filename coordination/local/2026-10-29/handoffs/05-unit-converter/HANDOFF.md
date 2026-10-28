# 常用單位換算：實作交接

## 最終 M11 — 正式發布 PASS（2026-10-07）

正式網站：[繁中](https://units.glossquote.com/index.html)、[English](https://units.glossquote.com/en/index.html)。有效Token交接後CLI deploy exit0，版本 `1ed0601d-75ed-46da-95d9-f6c2ce5c61af`。主代理獨立32項live GET/HEAD/301/404/MIME/securityheaders/SEO驗證PASS，11份公開檔案與production build位元組一致；兩語1m→100cm及首頁→單位→日期→首頁實際瀏覽器流程PASS。首頁已顯示兩語工具條目及實際首發日2026-10-07。

公開來源 https://github.com/KYStr/glossquote-labs-unit-converter 最新commit `aaea80ab9c02a713b3b58cefdfee101c37814f08`（最後只更新上線README），PUBLIC、remote HEAD、乾淨發布副本與26份實作檔一致。產品程式未再變更，沿用65/65離線測試、source/build/dry-run及320px驗證。Cloudflare UI確認免費純Static Assets、0 bindings、workers.dev/previews/logs/traces disabled；DNSSEC Active。Windows全環境指紋不變。真機/AT/真200%及既有人工項、搜尋收錄仍未驗證。**M11正式發布必要驗收PASS**；未配置Git自動部署，後續必須同步首頁公開來源及真部署。詳見 `../DEPLOYMENT-MILESTONE.md`，以下保留歷史。

## 2026-10-07 部署交接更新 — 尚未上線

首次正式 deploy exit 1，Cloudflare 驗證回報 6111（Authorization header 格式無效），在任何上傳前停止。不能據此認定 Token 權限不足。主代理已保存 `.runs/site-launch/attempt-1/` 證據、修正遮蔽輸入格式檢查並重新請使用者輸入 Token 原始值；9 組假資料檢查 PASS，沒有擴權或讀取秘密。來源未變，PUBLIC 與遠端 commit `d2650ddff0d32a053ad33ab0b7d8f779e69e347b` 再次確認；沿用下方 65/65 測試結果。首頁批次記錄預計首次發布日 2026-10-07，尚非上線證據；M11 正式驗收仍待部署及 live checks。

## 最新 M11 主代理整合（2026-10-06）— 本機與公開來源 PASS；正式主機待交接

主代理讀取實際diff、release/build/check、三份新增測試、metadata與same-language home/date連結，獨立執行65/65測試、check24、preview9、Cloudflare production13／check13及Wrangler4.147.0 dry-run，全部exit0。未改計算核心、app或依賴。IAB驗證1m→100cm、切換中文清空、320px無橫向溢出、三個家族連結各44px及正確同語言URL。正式互連、TLS/HTTP與真機/AT/真200%等仍待驗。

公開倉庫 https://github.com/KYStr/glossquote-labs-unit-converter ，commit `d2650ddff0d32a053ad33ab0b7d8f779e69e347b`；GitHub PUBLIC、遠端HEAD相同、發布副本乾淨、26份實作檔bytes與已驗證來源相同。正式目標為https://units.glossquote.com/index.html與/en/index.html，但**尚未部署**。已備妥遮蔽Token輸入及三站發布腳本，等待使用者提供先前Token後才進行真主機驗收。Windows完整Environment Snapshots與本輪開始相同。

實際委派`<REMOTE_WORKSPACE>/m11_units_luna`，工具接受gpt-6-luna/max/fork_turns=none，底層路由未確認；不再委派。主代理驗收紀錄與發布證據在`.runs/site-launch/`，子代理交接在本檔M11-UNIT節。首頁目錄為`../00-home/catalog.json`；以後每個已上線新工具都須同步兩語目錄與首頁發布，不只push程式。**M11正式發布milestone仍未通過**。以下保留較早階段歷史。

- 藍圖版本：1.0
- 初始日期：2026-09-23
- 產品狀態：IN_PROGRESS
- 目前任務：T08 稽核 F-01 修正及 GitHub 同步 PASS；人工待驗保留，不宣稱完整 MVP 驗收
- 下一步：使用者本次稽核修正已完成；本工具正式上線仍待真實 origin／主機、SEO check/build 聯動修改與人工補驗；本輪未開始其他工具
- 程式碼：繁中／英文靜態頁、五類別／20 單位換算、完整公式／錯誤／教學／FAQ／SEO內容完成
- 自動測試：2026-09-29 T08 主代理原專案及公開副本各 58/58 PASS、check 19 檔 PASS、build 9檔 PASS；另4543筆 Fraction oracle 無差異
- 瀏覽器驗收：兩語換算／互換／清除／類別／導航／鍵盤／320px PASS；真200%／AT／完整Network/storage等 NOT_RUN；引擎版本未確認
- build：dist 已更新為9個雙語靜態檔，與public逐檔SHA256完全一致
- 發布：2026-09-29 T07 GitHub 原始碼公開完成；網站託管未執行，[公開儲存庫](https://github.com/KYStr/glossquote-labs-unit-converter)
- 最新修正：T08 commit `29e3d31d47a2c02e7f8189f7f04d1f8279932ddc`；GitHub 22個blob核對一致、public、無 Pages

## 已固定的產品決定

以 PRODUCT.md 與 TECHNICAL.md 為準。不要重新詢問已有預設，也不要把未來功能加入 MVP。
目前没有套件鎖定、模型下載或速度量測紀錄；需要者在所屬研究任務建立。

## 進度表

實作開始後逐項追加 TASKS.md 的任務 ID、狀態、日期、證據連結。只記真正做過的事，不預先勾選。

| 任務 | 狀態 | 證據 |
|---|---|---|
| T00 | PASS | 主代理讀完 9 個新增來源檔並獨立驗收；最終 scaffold 10 項測試，實際頁面及 11 個 HTTP 案例通過 |
| T01 | PASS | [研究紀錄](docs/RESEARCH.md) 逐項核對完畢；npm.cmd run check 退出 0，無來源衝突；瀏覽器版本限制已列明 |
| T02 | PASS | UC-T02 五檔交付；主代理讀實際新增 diff 與測試、重跑核心26／整套36／check／build；獨立79斷言通過 |
| T03 | IMPLEMENTED_WITH_MANUAL_PENDING | 2026-09-29 使用者允許保留人工待驗繼續；200% 仍 NOT_RUN，沒有改為 PASS |
| T04 | IMPLEMENTED_WITH_MANUAL_PENDING | 主代理完整審查新增測試，獨立 42/42 與 check PASS；U20/U21 可用子項及 U24 模組失敗 PASS；Network/storage 待驗 |
| T05 | IMPLEMENTED_WITH_MANUAL_PENDING | M04：主代理實際diff／新增檔審查、53/53測試、check/build及兩語瀏覽器流程通過 |
| T06 | HANDOFF_COMPLETE_WITH_MANUAL_PENDING | 全驗收表按子項記錄，人工待驗未改為PASS；可繼續下一工具，尚未發布 |
| T07 | PASS | 使用者新增GitHub公開授權；21檔公開、遠端SHA核對一致、發布副本53測試/check/build通過，見docs/GITHUB-PUBLISH.md |
| T08 | PASS | F-01 四組下限修正，58測試＋4543筆獨立數值對照＋兩語8組真實HTTP回歸；公開22檔核對一致。E-01/E-02/S-01正式發布項目與人工待驗仍未完成 |

## 2026-09-24 開工

本次使用者已要求實作，範圍為 [M01](docs/MILESTONE-01.md)。UC-T00 的實際工具呼叫明定 model=gpt-6-luna、reasoning_effort=max、fork_turns=none，回覆任務名稱 <REMOTE_WORKSPACE>/uc_t00_luna；工具未回傳實際底層 model/effort metadata，故這兩項只確認已要求並接受，實際值未確認。主代理本輪實際配置也未確認；不採子代理自述。

根目錄 .codex/config.toml 已寫入 Astra/max、Luna/max、兩個子代理上限。官方欄位已核實；TOML 與六項設定值的 Python 內建 tomllib 驗證通過。本機 codex --strict-config features list 回傳不支援此組合（退出碼 1），未將該次嘗試當作配置通過證據。設定檔預設值不代表本輪主代理已切換。

後續主代理執行 `codex --strict-config doctor --summary`，退出碼 0，診斷為 config loaded。此診斷包含一次 Codex 自身端點連線檢查，沒有執行產品網路流量；環境/MCP 等非本任務提示沒有修改。它未列出本輪有效 model/effort，因此仍不宣稱實際路由已驗證。

## 每次交接追加格式

### T00 主代理驗收：2026-09-24

UC-T00 子代理交付 TASKS.md 列出的 9 個來源檔，沒有寫其他產品或文件。主代理將新增檔視為相對空檔的完整 diff 審閱；檢查器初版漏掉未加引號資源、緊湊 ESM import，並把授權的 test/.tmp 當來源掃描，已給具體案例讓 Luna 修正；對應回歸測試已存在。沒有因風格偏好重寫。

主代理實際命令：`node --version` → v24.14.0；`npm.cmd test` → 9 PASS、0 FAIL；`npm.cmd run check` → 8 個受管來源通過；`npm.cmd run build` → 4 個靜態檔；皆退出碼 0。`npm.cmd run dev` 實際啟動、頁面 ESM 生效，完成後 Ctrl-C 停止（正常的人為中止退出碼 1，不計成測試失敗）。

主代理另以 Node 原生 HTTP 客戶端送 11 個請求：正常 GET/HEAD、POST 405、missing 404、raw/encoded traversal 403、backslash/NUL/無效 percent 400、dotfile 403，全部符合預期；HEAD 無 body，nosniff 存在，拒絕回應不含專案外資料。scaffold 另外在真實 Windows junction 上驗證 public 逃逸與 dist junction 拒絕且目標 sentinel 不變。這是有限範圍開發驗收，不宣稱獨立安全認證。

T00 瀏覽器只驗證可載入的佔位頁；沒有可操作換算表單，因此尚不是產品 MVP。其他瀏覽器、鍵盤完整流程、320px／200% 及 Network/storage 驗收保留未測。

### T00 後續契約修正與整合：2026-09-24

主代理發現 scaffold 把暫時「尚未開放」、module-status 與 app 內變數名寫法固定在測試，會阻止原計畫 T03/T05。UC-T00-FIX 第一輪移除暫時頁面斷言，第二輪放寬完整 title，使 UX-SEO 指定的描述可加入；保留產品／品牌與全部安全、import、build 回歸。第二輪已解決同一問題，沒有無限返工。

主代理另直接修正 test/scaffold.test.mjs 的 Windows 路徑清理邊界：relative 返回另一磁碟的絕對路徑時必須拒絕，test/.tmp 也不允許 junction。新增跨磁碟／父層拒絕測試，最終 scaffold 共 10 項。此屬清理安全責任，未改 Luna 負責的核心檔案。

中途一次 scaffold 整合執行為 8 PASS、2 FAIL；兩個失敗來自當時新寫入的核心測試標題在去空白後碰到 check 的 eval 字串掃描。已由 UC-T02 改測試名稱，沒有放寬檢查器或刪案例；整合後 36/36 PASS。

### T02 主代理驗收：2026-09-24

UC-T02 以 spawn_agent 實际呼叫明定 gpt-6-luna / max / fork_turns=none，回覆 <REMOTE_WORKSPACE>/uc_t02_luna。工具沒有回傳實際 model/effort metadata，仍標未確認。另以 followup_task 請 <REMOTE_WORKSPACE>/uc_t00_luna 唯讀檢查邊界，不再委派。主代理保留全部審查与接受責任。

新增五檔：public/js/core/units.mjs、numbers.mjs、convert.mjs，以及 test/numbers.test.mjs、convert.test.mjs。主代理逐份讀實際內容與新增 diff，核對封閉表、深層凍結、完整數字文法、驗證先後、getter 不執行、錯誤碼、溫度操作順序、精確顯示與每對單位往返。初版非 number 驗證排在單位驗證後，已回報具體多重無效案例，由 Luna 修正並測試；另補足 U02 格式 `2.54` 與 U14 小值的明定案例。

主代理親自執行的最終結果：

| 命令／檢查 | 真實結果 |
|---|---|
| node --test test/numbers.test.mjs test/convert.test.mjs | 退出 0，26 PASS、0 FAIL |
| npm.cmd test | 退出 0，36 PASS、0 FAIL、0 SKIP |
| npm.cmd run check | 退出 0，13 個受管來源檔 |
| npm.cmd run build | 退出 0，7 個靜態檔 |
| [主代理独立反例程式](docs/MILESTONE-01.md) | stdin 實際執行，退出 0，79 斷言 PASS |
| dist 清單／逐檔 hash | 只有 index.html、app.mjs、三核心模組、兩份 CSS；全數與 public 一致 |
| 暫存／server 清理 | test/.tmp 不存在；主代理重新綁定並釋放 loopback 4173，確認埠已釋放；臨時瀏覽器分頁已關閉 |
| 工作區／環境 | 原有 GlossGate 五檔 SHA256 不變；Windows User/Machine PATH、TEMP/TMP 與 Environment-key 指紋前後相同 |

U01–U17 已覆核並實測；包含數值容差與精確字串不同斷言，不能把反向輸入被拒絕的案例計成往返成功。79 個主代理斷言另含 65 個零、symbol／non-enumerable 額外欄位、getter 零呼叫、原型名稱單位、捨入後跨顯示閾值與溫度嚴格下限。完整證據與環境雜湊在 M01 文件。

下一位實作者可使用：numbers.mjs 的 parseNumber、formatNumber；convert.mjs 的 convert、getFormula；units.mjs 的 CATEGORIES、CATEGORIES_BY_ID、UNITS_BY_ID、DEFAULT_UNIT_PAIRS。先讀 docs/RESEARCH.md 的補充契約。不要重新設計封閉單位表；app.mjs 目前只做 ESM 載入狀態，尚未 import 核心。

### T03 主代理驗收：2026-09-25

本輪只推進 M02/T03。以 spawn_agent 實際指定 gpt-6-luna / max / fork_turns=none，建立 <REMOTE_WORKSPACE>/uc_t03_luna 實作三個 UI 檔；以 followup_task 請 <REMOTE_WORKSPACE>/uc_t02_luna 唯讀檢查案例與交付程式，沿用先前已要求的 Luna/max。最多兩個子代理，未再委派。工具未回傳底層實際模型／推理強度，主／子代理皆不以設定檔或自述當作路由證明。

主代理讀完交付程式與相對開工快照的 unified diff，確認安全文字渲染、解析／換算順序、舊結果清除與事件管理。真實 320px 操作發現 min-width:320px 在有捲軸時造成 305→320px 水平溢出，提出 UC-T03-FIX-01，Luna 僅移除 app.css 的兩個頁寬限制。一輪修正後親自重測 305/305、44px 控制項與互換／清除通過；不是依子代理宣稱核准。

最終主代理 npm.cmd test：退出 0、36/36 PASS；npm.cmd run check：退出 0、13 個來源檔。實際桌面與 320px 流程、鍵盤焦點、錯誤關聯、類別重設、加長標籤、離開返回可用。狀態節奏只驗 DOM，沒有宣稱真實螢幕閱讀器已測；返回流程未確認 BFCache 命中。詳見 [完整 M02 證據與待驗清單](docs/VERIFICATION.md)。

修改僅 index.html、app.css、app.mjs、HANDOFF.md；新增 docs/VERIFICATION.md。257 個其他既有檔案 SHA256 不變，包含原有 GlossGate 修改、設定與 dist。server 已停止、4173 可重綁釋放、test/.tmp 不存在；驗收分頁關閉、viewport reset。持續環境前後 PATH／TEMP／TMP／Environment-key 指紋、登錄型別與長度一致。

### 持續目標與佇列核對：2026-09-26

使用者要求繼續完成其餘工具並設定持續目標；主代理已實際呼叫 create_goal，目標狀態 active。範圍為現有十二個工具的本機實作、文件與必要驗收，維持最多兩個 Luna/max 子代理、主代理親自驗收、不發布。ROADMAP 順序為 05→06→07→10→01→08→09→03→02→04→11→12；11/12 仍需通過各自真實技術研究閘門。

目前 T03 的 U23 200% 縮放尚無新增證據，沒有把本次「繼續」解讀為默認豁免既有驗收。已向使用者提出單一流程選擇：允許先繼續可驗證實作、將工具無法執行的人工項目保留待驗，或維持原門檻並先補實測。回覆前不開始 T04／其他工具實作，僅核對文件與佇列；即使允許續作，也不能把未測項標為 PASS。

實際唯讀委派 CATALOG-STATUS-01：spawn_agent(model=gpt-6-luna, reasoning_effort=max, fork_turns=none) 回覆 <REMOTE_WORKSPACE>/catalog_status_luna。工具沒有提供底層 model/effort metadata，實際路由未確認。

主代理執行藍圖檢查 node scripts/validate-blueprints.mjs：退出 1，核對 12 工具、162 Markdown、466 本地連結、293 驗收案例、80 任務；唯一失敗為 05-unit-converter 的 metadata 不再符合 initial blueprint status。根因是檢查器硬性要求 not-started，與 AGENTS 第 8 條允許 in-progress 的狀態回寫衝突；本工具 in-progress 符合實況。沒有為了讓檢查器通過而倒退狀態，沒有越過 T03 allowed paths 修改總檢查器。這是文件集合的初始狀態檢查過時，不是 36 項產品測試失敗。

後續兩次自動續行重新核對交接、驗收文件與目前瀏覽器能力；能力清單仍只有 visibility／viewport，沒有真正頁面縮放。使用者未提供 U23 補驗證據，也尚未回覆流程調整選擇。同一阻塞累計連續三個 goal turns 後，主代理實際呼叫 update_goal(status=blocked)，工具確認目標為 blocked；完整十二工具目標保留，未標完成。恢復所需條件是取得 U23 真實驗收結果，或使用者明確允許保留人工待驗項後繼續實作。沒有新增產品修改或開始 T04。

### 使用者授權更新：2026-09-29

使用者明確允許「保留人工待驗項，繼續實作」，並要求每個功能網站逐一完成多語言與 SEO。已選定首版語言為繁體中文＋英文。這項新授權取代先前人工 NOT_RUN 阻擋所有後續工作的門檻；可執行的必要檢查仍須通過，已知缺陷必須修復。人工未驗項仍保留 NOT_RUN，不能改成 PASS 或宣稱完整驗收完成。媒體套件／模型的授權與核心能力研究仍不可跳過。

当前僅啟動 M03/T04：新增有界且離線的 malformed／非 number／數值邊界回歸、檢查安全 DOM 和清除行為；主代理執行可用的 U20/U21/U24，工具不支援的 Network/storage/禁用 JS 等項逐一保留人工清單。不新增依賴、不改其他工具、不更新 dist。驗收為新增邊界測試、整套 npm.cmd test 與 npm.cmd run check 成功，主代理審查實際 diff 並如實記錄瀏覽器證據。

M03 之後才依新增語言需求擴充 T05：每種語言獨立靜態 HTML、完整介面／錯誤／公式／教學／FAQ／title／description；明示語言連結，不依地區自動跳轉、不儲存輸入或語言偏好。尚無正式網址或發布授權，保留 noindex、不產生假 canonical／sitemap；正式網址相关 SEO 輸出保留於發布前清單。完整實作範圍與驗收將在 T05 開始前写入 TASKS.md。

get_goal 目前仍回傳 blocked；使用者已以本輪訊息授權繼續工作，但工具不提供把狀態設為 active 的介面。繼續執行明確授權的開發，不以完成／重建目標偽造恢復狀態。

### 尚未完成與限制（历史阻塞原因；以 2026-09-29 授權更新為準）

此段以下描述2026-09-26歷史狀態；現況以本文件開頭進度表與末段2026-09-29交接為準。

- M02 尚未全部通過：內建瀏覽器無可用的真正頁面縮放控制，200% 為 NOT_RUN；已請使用者補驗，尚未收到結果。不能以 viewport=640 模擬代替。
- 使用者可在本工具目錄執行 npm.cmd run dev，開啟 http://127.0.0.1:4173/index.html，以瀏覽器选單设 200%，確認無整頁橫向捲動及所有欄位／結果可讀可操作，回報瀏覽器名稱、版本與結果後停止 server。
- 實際螢幕閱讀器、BFCache 命中、其他瀏覽器／真實行動裝置未驗。引擎版本未確認；不宣稱全面無障礙或跨平台通過。
- T04–T06 尚未開始：完整 Network/storage／禁用 JS／邊界稽核、SEO、dist 更新與 MVP 驗收。本輪 public 已有介面，舊 dist 尚無此介面。
- 產品尚未發布；strict Number 邊界與 check 字串掃描限制見研究和工程文件，不宣稱獨立安全認證。

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

## 2026-09-29 雙語網站交接

M03的UC-T04-BOUNDARIES交付6項邊界測試；主代理42/42與check通過後才啟動M04。M04實際委派UC-T05-PAGES與UC-T05-I18N，各以gpt-6-luna/max/fork_turns=none啟動，最多兩個同時執行、禁止再委派。配置為工具呼叫已指定；底層實際模型／推理強度未確認。

主代理已閱讀實際逐行diff與所有新來源，要求修正繼承key查表及英文舊結果清空說明，再獨立執行53/53測試、check（18檔）、build（9檔），全部退出0。新增SEO5項與i18n6項測試，未改core或既有測試。兩語真實瀏覽器操作、鍵盤、320px、語言切換清空、模組失敗fallback有實測證據，詳見[VERIFICATION](docs/VERIFICATION.md)。建置檔和來源逐檔一致；Windows持續環境完整快照前後相同；修改範圍核對沒有其他工具或GlossGate變更。

本機入口：[繁體中文](http://127.0.0.1:4173/index.html)、[English](http://127.0.0.1:4173/en/index.html)。在本工具目錄執行npm.cmd run dev；目前沿用使用者原有127.0.0.1:4173預覽server，沒有另開公網listener。結束可Ctrl+C停止。無需npm install，沒有Git提交／推送／部署。

尚待：真200%縮放、輔助技術、完整Network/storage／斷網、實際BFCache命中、其他平台及英文額外加長標籤。允許保留這些待驗後继续，不能把它們稱為PASS。正式發布另需網域與明確授權，依[SEO-RELEASE](docs/SEO-RELEASE.md)補canonical、雙向語言標記與sitemap；目前noindex保留。

本工具功能網站已實作，T06交接完成但完整MVP驗收未完成，project.json保持in-progress。下一工具依ROADMAP為06-date-calculator，先讀其完整規範與實際檔案，再設計首個milestone；沿用已選繁中＋英文、每個網站一次完成、最多兩個Luna/max且主代理親驗的規則。不要因本工具人工NOT_RUN重複要求已給的續作授權。

## 2026-09-29 GitHub 公開交付更新

使用者已新增「上傳我的GitHub並設定公開」授權。主代理以獨立發布副本完成提交與推送，沒有提交原孵化器其他產品或歷史。[公開儲存庫](https://github.com/KYStr/glossquote-labs-unit-converter)為Public，提交`1b188ad4f7b8e60e21d49cf2a5eb02e86de44df1`，預設分支`codex/initial-publication`；21個遠端檔案blob與本機提交一致。發布副本53/53測試、check/build均通過；Windows持續環境不變。

實際委派UC-GH-DOCS，指定Luna/max，只產出公開README與.gitignore；主代理審查兩檔並執行全部GitHub操作。實際底層路由未確認。發布內容與後續更新方式見[GitHub交付紀錄](docs/GITHUB-PUBLISH.md)。既有人工待驗仍保留，GitHub Pages未啟用，noindex與正式網站SEO設定尚未變更。上方較早的「尚未授權發布」敘述僅代表當時狀態，此節為最新原始碼交付結果。

### M11-UNIT 實作交接：2026-10-06

依正式網址 `https://units.glossquote.com/` 完成 preview／production SEO 與 Cloudflare Pages 靜態發布設定。Preview 預設 noindex 並使用相對 hreflang；明確 production build 產生 canonical、繁中／英文／x-default hreflang、robots.txt、sitemap.xml 與精確 Cloudflare headers／redirects。`wrangler.jsonc` 固定站名、相容日期 `2026-10-06`、`html_handling: none`，停用 Workers、preview、logs、traces、metrics，無 runtime main／binding。繁中與英文頁面加入同語系 GlossQuote 首頁及日期工具連結，並保留離站會清除輸入的提示。

M11 變更檔案：`scripts/build.mjs`、`scripts/check.mjs`、`scripts/release.mjs`、`scripts/cloudflare.mjs`、`test/release.test.mjs`、`test/cloudflare.test.mjs`、`test/site-links.test.mjs`、`test/seo.test.mjs`、`test/scaffold.test.mjs`、`public/index.html`、`public/en/index.html`、`public/styles/app.css`、`wrangler.jsonc`、本 HANDOFF。產生的 production `dist/` 有 13 個靜態檔。證據與環境前後快照見 [M11 implementation evidence](../../.runs/site-launch/unit/implementation.md)。

最終本機驗收：`npm.cmd test` 65 PASS／0 FAIL／0 skipped；`npm.cmd run check` 24 個受管來源通過；`npm.cmd run build` preview 9 個靜態檔；production build 與同旗標 release check 各 13 個檔案通過。檢查器只容許精確六個家族 URL 出現在 `<a href>`，並拒絕 `ping`、任意 host/path/query、協定相對連結以及外部資源／表單 URL。沒有改換算 app 邏輯、核心單位或數值行為，也沒有新增依賴。

Release HTML offset 修正位於 `scripts/release.mjs:141-144`：以 `matchAll` 每筆結果的 `entry.index` 和完整匹配長度 `entry[0].length` 建立替換區間；之前錯把捕獲群組當成索引，導致 offset 未定義及重複 head 改寫。最終測試已覆蓋並通過。

本子任務未執行 Wrangler dry-run、正式部署、DNS／TLS／HTTP 線上驗證、瀏覽器人工項目或 GitHub 發布；這些由主代理在獨立驗收及核准發布副本流程處理。既有 200% 縮放、輔助技術、完整 Network/storage、斷網、BFCache、其他平台仍維持 NOT_RUN，不因本次程式檢查而改標 PASS。Windows 持續環境 guard 的 HKCU/HKLM PATH 型別、長度、雜湊、ephemeral 計數及完整 Environment-key fingerprint 前後一致；詳細值見上述證據紀錄。

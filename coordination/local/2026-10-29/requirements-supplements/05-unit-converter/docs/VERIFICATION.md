# 常用單位換算：實際驗收紀錄

## T08 稽核 F-01 修正：2026-09-29，PASS

來源：使用者提供 `glossquote-unit-converter-audit-2026-09-29.md` 並要求修正。只收到 Markdown 報告；沒有宣稱取得其中提到的其他 evidence 或 regression 附件。主代理先在 Node v24.14.0 重現四組 RESULT_RANGE 錯誤及 formatter 對偏低浮點值的 RangeError，再定義 TASKS T08 與分工。

### 實際變更與審查

- convert.mjs：保持輸入與溫度驗證，對非溫度換算以標準十進位值及固定係數建立有界 BigInt 分數，精確交叉比較結果界線。只對已證實範圍合法的浮點結果處理邊界偏移，讓嚴格 formatter 可安全格式化；沒有添加 epsilon、套件或外部資源。
- convert.test.mjs：修正先前錯把下限拒絕視為正常的斷言，並為全配對 oracle 的四個等值邊界提供獨立數學預期。新增 audit-boundary.test.mjs 五項測試，涵蓋四組缺陷、精確上下界、緊鄰內外浮點值、真正下溢、0及 formatter 嚴格拒絕。未刪除既有防禦測試。
- 主代理閱讀 core 實際 diff、既有測試 diff 與新增測試全文，再親自執行下表。測試沒有使用產品的 BigInt helper 生成答案；額外 Python Fraction 使用獨立十進位係數表，避免錯誤實作與測試互相認證。
- TECHNICAL／RESEARCH 更正數值契約及舊有錯誤決策；SEO-RELEASE 與公開 README 明列 E-01/E-02/S-01 尚待正式網址及主機的工作，不以原始碼公開冒充網站上線。

### 實際委派與可確認配置

| 任務 | 工具回傳子代理 | 限定修改 | 子代理回報驗證 |
|---|---|---|---|
| UC-AUDIT-CORE | /home/<LOCAL_USER>/uc_audit_core_luna | public/js/core/convert.mjs | node --check；numbers/boundaries 13/13；四組缺陷與邊界直接斷言 |
| UC-AUDIT-TEST | /home/<LOCAL_USER>/uc_audit_test_luna | test/convert.test.mjs、test/audit-boundary.test.mjs | 四個核心測試檔37/37 |

兩次 spawn_agent 均實際指定 model=gpt-6-luna、reasoning_effort=max、fork_turns=none，工具接受並回傳上述任務名；最多兩位並行、路徑不重疊、未允許再委派。工具沒有回傳底層有效 model/effort metadata，因此實際路由仍未確認，未以子代理自述判定。主代理預設設定仍為 .codex/config.toml 的 Astra/max，本輪有效路由同樣未確認。

### 主代理独立執行結果

| 驗證 | 實測結果 |
|---|---|
| 原產品 npm.cmd test | 58/58 PASS，0 skip，退出0 |
| 原產品 npm.cmd run check | 19個來源檔 PASS，退出0 |
| 原產品 npm.cmd run build | 9個靜態檔，退出0；public/dist 檔案數與SHA256一致 |
| 發布副本 test/check/build | 獨立再跑58/58、19來源、9靜態檔，全部退出0；public/dist hash一致 |
| 來源與發布副本 | package＋public＋scripts＋test共20檔逐檔SHA256一致 |
| Python Fraction oracle | 固定seed20260929，77個非溫度有向配對、4543筆向量；預期3854合法／689拒絕。舊公開版本8筆失敗（四種缺陷各在固定值與邊界組重現），修正版本0差異，退出0 |
| 真實HTTP兩語缺陷回歸 | 原始ESM/CSP，未重組DOMfixture；四組×zh-Hant/en共8組皆顯示1e-18，aria-invalid=false、錯誤空白 |
| 英文HTTP邊界與清除 | cm2→km2在1e-8接受、9.999999999999999e-9拒絕；km2→cm2在1e8接受、100000000.00000001拒絕；拒絕時舊output清為—，清除後欄位空白並回焦點；捕獲warn/error紀錄為空 |
| 發布 | commit 29e3d31d47a2c02e7f8189f7f04d1f8279932ddc，遠端ref與本機HEAD一致，22個blob path/SHA全相同；public、has_pages=false、發布副本clean |

獨立 oracle 存放於工作區 `.runs/unit-audit-fix/fraction-oracle.py` 與 `evaluate-cases.mjs`；可從根目錄執行 `python .runs/unit-audit-fix/fraction-oracle.py`。前／後摘要為 oracle-before.json／oracle-after.json；發布證據為 publication-after.json。這些本機驗證資料不公開推送。最初 oracle bridge 誤用 fs/promises.readFile(0) 退出1，主代理改為支援fd的同步讀取後才執行以上基準／修正版對照，未把工具錯誤計入產品缺陷。

IAB內部引擎版本未確認；本輪沒有重做版面設計或宣稱跨瀏覽器認證。200%真縮放、手機負號／e鍵盤、AT、完整Network/storage、斷網與真BFCache仍NOT_RUN。E-01（noindex）、E-02（正式SEO與check/build聯動）、S-01（正式主機安全標頭）仍屬未完成的發布任務；沒有猜正式網域、改索引或啟用網站託管。必要功能修正驗收已通過，未宣稱整份部署稽核全部結案。

### 範圍及永久環境

原先 GlossGate 五個 dirty 檔的完整diff在本輪前後hash一致；根目錄沒有git add、commit或push。發布僅4個變更檔（core、兩個test、公開README），staged範圍核對及diff --check通過，機密格式／本機使用者路徑掃描無命中。

長測試／Git操作前後 check-persistent-environment.ps1 均PASS，完整Snapshots完全相同：HKCU PATH ExpandString、834字、16項、ephemeral0，SHA256 `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb`；HKLM PATH String、1227字、30項、ephemeral0，SHA256 `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8`。Environment-key指紋User=`3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a`、Machine=`a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82`；TEMP/TMP型別、長度與hash亦未變。沒有永久環境修改。

## M02／T03：可操作介面

日期：2026-09-25。狀態：NEEDS_MANUAL_VERIFICATION（程式已交付，M02 尚未全部通過）。前置 M01 已通過；本輪只推進 TASKS.md 的 T03。

範圍：接上既有三個純函式模組，完成類別／數值／來源／目標、即時 output、公式、錯誤、互換與清除。非目標：T04 全面隱私與邊界稽核、T05 完整 SEO／建置、T06 產品最終驗收、其他工具與發布。

### 實作前設計

模式 Product App。使用者要快速換算已知數值，任務畫布是主體。欄位與結果一直可見；互換緊鄰兩端單位，清除在結果旁。無需側欄、開始按鈕、帳號、動畫或示範數字。保留紙色／墨色／適度酸綠與系統字型。

桌面：頂列 → 標題 → 類別 → 數值 → 來源／互換／目標 → 結果／清除 → 公式與精度。
窄螢幕：同樣順序全部單欄；欄位／按鈕可換行，最小 44px 觸控目標，雙層焦點輪廓。

事件一律同步。每次 render 先清舊結果與錯誤；完整 parse/convert 成功才填 output。切類別清空數值／結果／錯誤並用既有 DEFAULT_UNIT_PAIRS；互換保留原始數值文字；清除保留單位、焦點回數值。失敗只呈現固定錯誤，不回顯輸入／exception。

input 保留文字，不以截短貼上來把超長資料變成合法輸入。output 的自動朗讀關閉，另用節制的 polite 狀態區：有效性變化或 change 才提示，連續有效逐字輸入不重複朗讀。可見錯誤以 aria-describedby／aria-invalid 關聯。Enter 阻止表單送出。

未初始化時控制項不可操作、無結果，靜態不支援文案與操作說明保留；初始化成功才啟用。頁面離開清理工作資料／訂閱；若使用 BFCache 返回，需恢复有效操作與空白預設，不能留下失效事件。

### 任務與檔案責任

- UC-T03：Luna 實作，只改 public/index.html、public/styles/app.css、public/js/app.mjs。tokens.css 已足夠，維持原值。不得更改核心、測試、scripts、設定或其他產品。
- 主代理：本文件與 HANDOFF.md；保留現況基線、閱讀實際 diff、跑測試與瀏覽器操作。子代理停筆後才可修同一檔或建立暫時長標籤測試版本，完成須精確還原。
- 可另委派同一 T03 的唯讀審查；同時最多兩個子代理，禁止子代理再委派。每項委派附目標、背景、檔案範圍、不可破壞行為、驗收與停止條件。

### 必要驗收

1. npm.cmd test（既有 36 項）及 npm.cmd run check 成功；不降低既有核心契約。
2. 真實瀏覽器 U18：2 m→cm 得 200，互換後輸入仍為 2、得 0.02；清除保留 cm→m 並聚焦數值。
3. U19：切換溫度後 input/output/error 清空，C→F；數值錯誤不能殘留舊結果。
4. U22：僅鍵盤完整操作，順序與畫面一致、焦點可見、錯誤可讀，Enter 不導覽。
5. U23：桌面、320 CSS px、200% 真正頁面縮放、40% 加長標籤能操作且不橫向捲整頁；實測與工具限制分開記錄，不能用改小 viewport 代替縮放。
6. 驗收完成停止自己啟動的 server，核對非授權檔案 hash 不變，以及 Windows 持續環境前後一致。

### 配置與來源紀錄

既有 .codex/config.toml 仍為 Astra/max 主代理、Luna/max 子代理、上限 2。collaboration.spawn_agent 可明確傳 model 與 reasoning_effort；本輪已實際指定。寫設定或代理自述不作實際底層模型證明；目前主代理實際 model/effort 未確認。

實際委派：spawn_agent 指定 model=gpt-6-luna、reasoning_effort=max、fork_turns=none，工具回覆 /home/<LOCAL_USER>/uc_t03_luna。另用 followup_task 交 /home/<LOCAL_USER>/uc_t02_luna 作同一 T03 的唯讀案例審查，沿用其建立時已要求的 Luna/max。工具皆未提供實際底層 model/effort metadata，因此這兩項仍未確認；不採自述。

UI/UX Pro Max 只作靜態無障礙／觸控／層级審查參考，依 docs/BRAND.md 與設計契約不執行外部生成器，不覆寫既有品牌。

API 核對（2026-09-25）：[MDN output](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/output) 記錄 output 的 implicit status 與即時朗讀行為；因此本介面分開顯示 output 與節制的狀態提示。[MDN pageshow](https://developer.mozilla.org/en-US/docs/Web/API/Window/pageshow_event) 是 BFCache 返回生命週期的參考。這些參考不等於真實螢幕閱讀器或 BFCache 測試已通過。

### 執行結果

已確認工具限制：Codex In-app Browser 的能力清單只有 visibility 與 viewport；Control_L+plus 未改變 1280×720 的實際 client 尺寸。它不提供正式 zoom setter，因此 200% 真正頁面縮放目前 NOT_RUN。沒有用 viewport=640 冒充 200%，沒有使用原始 CDP／其他工具绕過瀏覽器介面。

主代理於最終修正後獨立執行：

| 驗收項 | 結果與實際證據 |
|---|---|
| npm.cmd test | PASS，退出 0，36 tests、36 pass、0 fail、0 skipped；含 26 核心及 10 scaffold 測試 |
| npm.cmd run check | PASS，退出 0，13 個受管來源檔；此掃描不等於安全認證 |
| npm.cmd run dev | 實際在 127.0.0.1:4173 啟動，由主代理操作頁面；完成後 Ctrl-C 停止 |
| U18 互換與清除 | PASS：2 m→cm 顯示 200；互換仍輸入 2，cm→m 顯示 0.02；清除保留 cm→m、output 為 —、焦點 number-input |
| U19 切類別 | PASS：有結果及無效數字兩種起始狀態切到溫度，數值／舊結果／錯誤清空、aria-invalid=false、C→F；−40°C→−40°F 正常 |
| U22 鍵盤流程 | PASS：Tab 順序 brand→category-select→number-input→source-unit→swap-units→target-unit→clear-input；鍵盤輸入、方向鍵改類別、Space 互換、Enter 清除可用，清除後焦點回數值；輸入欄 Enter 保留結果且無導覽 |
| U22 可見焦點與錯誤 | PASS：實際畫面可見墨色／酸綠焦點輪廓；1,000 顯示固定錯誤、aria-describedby=number-help number-error、aria-invalid=true、舊結果清為 — |
| U23 桌面 | PASS：1280×720 viewport；含捲軸可用寬 1265，scrollWidth=1265；來源／互換／目標同列，结果可讀 |
| U23 320px | 修正後 PASS：320×800 viewport；含捲軸可用寬 305，scrollWidth=305；單欄、六個控制項高度皆 44px，互換／清除可用；科學記號長結果不造成整頁水平捲動 |
| U23 加長標籤 | PASS：在同一 index.html 暫時加長四個 label 及兩個按鈕文字至少 50%；320px 下互換／清除可用，clientWidth=scrollWidth=305；完成後按 SHA256 精確還原原始位元組 |
| U23 真正 200% 頁面縮放 | NOT_RUN：工具無此能力；已請使用者補驗，尚未收到結果。這是 M02 未通過的必要項 |
| 狀態提示節奏 | DOM 行為 PASS：输入 2 再逐字加 3，output 更新為 2300、status 保持前次提示；Tab 觸發 change 後 status 更新為 2300；output aria-live=off。未以此宣稱實際螢幕閱讀器朗讀通過 |
| 離開／返回 | PASS（有限證據）：導覽 about:blank 後返回，恢復空白 length/m/cm 且欄位可用，輸入 2 再單次互換得到 0.02。未觀測 pageshow.persisted，不宣稱已確認 BFCache 命中 |

瀏覽器為 Codex In-app Browser，測試由 Windows 工作區發起。引擎名稱／版本未確認；沒有跨瀏覽器、真實手機、實際螢幕閱讀器或真實 BFCache 命中之通過宣稱。既有 36 項自動測試不涵蓋完整瀏覽器 UI，本輪 U18/U19/U22/U23 證據來自上述真實互動。

### 審查與一次返工

主代理讀完三個最終 UI 檔案，並用開工前的記憶體基線產生 unified diff，確認 tokens/core/tests/scripts/設定均未更改。審查涵蓋先清舊值再計算、固定錯誤訊息、完整 parse/convert 成功才呈現、閉合單位表、安全文字 DOM、input/change 區分與具名事件清理。唯讀 UC-T03-FINAL-REVIEW 未發現其他程式阻塞；其 CSS 評語使用修正前快照，不作最終尺寸通過證據。

UC-T03-FIX-01 的失敗證據是 320px 實測 clientWidth=305 而 scrollWidth=320，截圖可見水平捲軸。根因為 html/body 的 min-width:320px。主代理要求 Luna 僅修改 app.css，移除這兩項限制，不以 overflow-x:hidden 隱藏內容。修正後主代理重新載入，得到 305/305 並完成操作；一輪修正即解決。

長標籤測试使用「選擇換算類別」「輸入換算數值」「目前來源單位」「換算目標單位」「互換兩端單位」「清除輸入內容」。正式 index.html 還原 SHA256：9099110e3be1f89dc96652851f86a232861af671fd14ad5080ef50fd7d44b3a3。沒有遺留測試標籤或額外 fixture。

第一次產生唯讀 diff 時，PowerShell→Python 的 Unicode 管線解碼失敗（退出 1）；改用 ASCII JSON 傳輸並以 Python UTF-8 模式重跑成功（退出 0）。此為審查指令問題，沒有修改產品或降低測試。

### 清理、範圍與持續環境

- server 的 Ctrl-C 退出碼 1 為主動停止；隨後 Node 成功重新綁定並釋放 127.0.0.1:4173，確認埠已釋放。test/.tmp 不存在，驗收分頁已關閉、viewport override 已 reset。
- 開工前 261 個工作區檔案逐檔 SHA256 基線核對：257 個不變，4 個修改，1 個新增，無刪除。修改為本工具 index.html、app.mjs、app.css、HANDOFF.md；新增本文件。均在 T03 allowed paths。
- 原有 GlossGate 五個修改檔、其他工具、.codex/config.toml、tokens.css、三個 core、所有 tests/scripts 及 dist 均與開工前相同。
- 本輪未執行 npm run build，dist 仍是 M01 的七個舊產物；npm test 的 build 測試只在隔離 fixture 中執行。預覽請用 npm.cmd run dev 的 public，不能把現有 dist 當成本輪 UI。
- 開始與结束皆執行既有 check-persistent-environment.ps1，退出 0、Status=PASS。下列值前後相同，既有重複 PATH 項未整理。

| 範圍 | PATH 類型／長度／項目／暫存項 | PATH SHA256 | Environment-key SHA256 |
|---|---|---|---|
| HKCU | ExpandString／834／16／0 | 3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb | 3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a |
| HKLM | String／1227／30／0 | 52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8 | a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82 |

Environment value count：User=18、Machine=26，前後不變。User TEMP/TMP：ExpandString、32、SHA256=6419b675e0a677e2fa237deacbf7fd1b6af9f3685b28897b4349704d91d821c7；Machine TEMP/TMP：ExpandString、17、SHA256=99e709292d85386d0db9b41c1c3c80033d9a3ed03264a5b0a5fb69e87e1d9fdf；全部前後相同。

### 尚待處理與判定

M02 尚未全部通過；阻止驗收的是 U23 真正 200% 頁面縮放尚未測試，不是已知未修的程式缺陷。沒有啟動 T04–T06、更新 dist 或發布。

人工補驗方式：在本工具目錄執行 npm.cmd run dev，以一般瀏覽器開啟 http://127.0.0.1:4173/index.html，用瀏覽器選單設定縮放為 200%（不可用縮小視窗代替），確認欄位、按鈕、公式、錯誤、結果與焦點可讀且整頁不需水平捲動；實作一次 2 m→cm、互換、清除。記錄瀏覽器名稱／版本、viewport／縮放及結果後停止 server。

下一輪先補 U23 縮放证據與版本紀錄；通過並更新 HANDOFF 後，才依佇列開始 T04。Network/storage/禁用 JavaScript 的完整人工稽核、其他邊界、SEO、產物與 MVP 驗收仍屬後續任務。

## 2026-09-29 授權變更與 M03／T04

使用者明確允許保留人工待驗項後繼續實作，並指定繁體中文＋英文、每個工具網站逐一完成與 SEO。本節優先於上方歷史阻塞規則。可執行的必要檢查仍須通過；人工 NOT_RUN 不改寫成 PASS。M03 只完成 T04 邊界／隱私檢查，不開始其他工具。

實際委派 UC-T04-BOUNDARIES：spawn_agent 指定 gpt-6-luna、max、fork_turns=none，回覆 /home/<LOCAL_USER>/uc_t04_luna；只允許 test/boundaries.test.mjs。主代理處理瀏覽器與文件，彼此不寫同一檔。底層實際模型／推理強度仍未由工具回傳。

主代理在獨立 IAB 分頁實際操作，保留使用者原預覽：

| 項目 | 結果與界線 |
|---|---|
| U21 安全呈現 | 輸入 2 後貼入 `<img src=x onerror=alert(1)>`：固定格式錯誤，output 清為 —，aria-invalid=true；DOM img 數=0，getJsDialog 無對話框。DOM/執行子項 PASS；完整 Network 子項 NOT_RUN |
| 快速替換／清除 | 有效 123.456→bad→清除，數值／錯誤均空、結果 —、焦點 number-input；同步核心无延遲回寫，PASS |
| U20 重整 | 實際 reload 恢復 length、m→cm、空輸入／空結果，PASS；不由此推論 storage 或完整網路已驗 |
| U24 模組失敗 | 暫時把唯一 module src 改為不存在的同源 module-failure-check.mjs；實際 reload 後不支援說明可讀、fieldset disabled=true、結果 —、靜態使用方式可讀。此為真實模組載入失敗，非宣稱瀏覽器已禁用全部 JS，PASS |
| U24 fixture 清理 | 只暫改 allowed index.html，完成後精確恢復原位元組，SHA256=9099110e3be1f89dc96652851f86a232861af671fd14ad5080ef50fd7d44b3a3；測試結束未留下缺檔引用 |
| U20 Network/storage、斷網 | NOT_RUN：現有 CUA 介面沒有相關觀察／切換 API；未繞過介面讀取瀏覽器 profile、CDP 或不可見 storage。保留發布前人工檢查 |

主代理已逐行審查 app 與 core：工作數值只在 DOM/記憶體，使用 textContent 和已驗證的固定單位資料；未見網路、持久化、計時器或延遲工作。CSP/check/原始碼審查僅屬輔助證據，不能取代上述 NOT_RUN 的真實觀察。

主代理逐行閱讀新增 boundaries.test.mjs：170 個有界 malformed 輸入、拒絕物件強制轉型、UTF-16 64/65 長度與相鄰浮點數等六項測試，預期值未複製解析 regex。主代理獨立執行 npm.cmd test：42/42 PASS、0 skip、退出 0；npm.cmd run check：14 個受管來源、退出 0。未發現需修正的核心缺陷。

M03/T04 判定：可執行驗收通過，IMPLEMENTED_WITH_MANUAL_PENDING；完整 Network/storage、200% 與輔助技術等保留 NOT_RUN。依使用者授權可進入 M04/T05，不能宣稱完整隱私或跨平台人工驗收已通過。

## 2026-09-29 M04／T05：雙語靜態網站

M03 可執行驗收通過後才開始。範圍、非目標與驗收已先寫入 TASKS.md T05；首版繁中＋英文為使用者明確選擇，不擴充其他工具。主代理保留整合／驗收與正式 URL 決策責任。

| 任務 ID | 實際工具回覆 | 允許修改 |
|---|---|---|
| UC-T05-PAGES | /home/<LOCAL_USER>/uc_t05_pages_luna | public/index.html、public/en/index.html、public/styles/app.css |
| UC-T05-I18N | /home/<LOCAL_USER>/uc_t05_i18n_luna | public/js/app.mjs、public/js/i18n.mjs、test/i18n.test.mjs |

兩次 spawn_agent 都明確指定 model=gpt-6-luna、reasoning_effort=max、fork_turns=none。當時只有這兩個實作子代理執行；禁止自行委派，彼此寫入範圍互斥。每次交付完整背景、規範、介面、禁止破壞的行為、測試及停止條件。工具只确认啟動名稱，未回傳底層 model/effort；不能以設定或子代理自述宣稱路由已驗證。主代理目前實際模型／推理強度同樣未確認；.codex/config.toml 的 Astra/max 與 Luna/max 預設值及最多 2 個子代理設定原樣保留。

主代理另負責 test/seo.test.mjs、文件與真實瀏覽器；程式碼交付後才整合並執行最終檢查。

### 親自審查與返工

主代理保存開工前 index.html、app.css、app.mjs 的完整來源，交付後產生逐行新增／刪除 diff，並閱讀完整新增英文頁、i18n 模組與測試。確認既有核心、事件綁定／清理、先清舊結果、焦點與輸入限制未變；兩語都保留原 23 個 id。新增模組只提供固定顯示字串，不執行公式。

阻止驗收的兩項問題已具體交回原負責子代理修正：翻譯查表會讀到 constructor/toString 等繼承屬性，現以型別及 own-key 檢查拒絕並補反例；英文超範圍說明原句可能被理解為保留舊結果，现明確說明舊結果會清空。另將 UTF-16／截斷細節從一般介面改成可理解的字元上限說明，精確契約仍保留技術文件。

頁面子代理兩次 check 曾因並行 i18n 英文文案命中既有廣泛字串掃描而退出 1。來源是移除空白後的英文文字出現禁用子字串；i18n 子代理只調整自己檔案的用語，沒有改 checker、加入規避執行程式或刪除測試。主代理最終 check 已通過。SEO 測試在执行前接受合理的 dt/dd FAQ 結構，不強迫頁面為測試改標記；另核對四個有序步驟及全部 20 個單位符號。

### 主代理獨立命令結果

| 命令／檢查 | 實際結果 |
|---|---|
| node --test test/seo.test.mjs | 5/5 PASS，退出 0 |
| npm.cmd test | 53/53 PASS、0 skip，退出 0；核心26、邊界6、i18n6、scaffold10、SEO5 |
| npm.cmd run check | 18 個受管來源 PASS，退出 0；這是靜態檢查，不是安全認證 |
| npm.cmd run build | 9 個靜態檔案，退出 0；先核對 dist 絕對路徑及非 reparse point，既有建置腳本再次驗證範圍 |
| public／dist SHA256 對照 | 9/9 路徑與位元組一致，無额外文件／測試／工作數值；test/.tmp 不存在 |

產物：index.html、en/index.html、styles/tokens.css、styles/app.css、js/app.mjs、js/i18n.mjs、js/core/units.mjs、js/core/numbers.mjs、js/core/convert.mjs。建置產物已更新至本輪介面，不再是 M01 佔位版本。

### 主代理真實瀏覽器結果

2026-09-29，Windows，Codex IAB；引擎版本未由工具提供，未確認。使用獨立驗收分頁，保留使用者原頁面。未把 DOM／靜態檢查冒充螢幕閱讀器、Network 或 storage 檢查。

| 案例 | 結果 |
|---|---|
| 雙語初始載入 | 繁中 reload 與英文直接 reload 均可啟用，預設 length、m→cm、空輸入／結果；英文 body 除語言名稱外無 CJK，PASS |
| U18 兩語操作 | 2 m→cm=200；互換保留2，結果0.02 m；清除保留cm→m，數值空、結果—、焦點number-input；PASS |
| U19 兩語切類別 | 有錯誤後切溫度，清空數值／錯誤／結果，恢復C→F；PASS |
| 英文數值／公式 | -40 °C→°F=-40；1 lb→kg=0.45359237；1 m²→cm²=10000；1 L→mL=1000；公式、各類單位名稱為英文，PASS |
| 錯誤 | 中文1,000為固定格式錯誤；英文65個0未被截斷且報上限，結果—；PASS |
| U21 英文安全呈現 | `<img src=x onerror=alert(1)>` 報英文格式錯誤，DOM img=0、无對話框、aria-invalid=true、舊結果清空；DOM/執行子項 PASS，完整 Network 仍 NOT_RUN |
| 雙向語言導航 | 中文已有-40後點English，英文初始空；英文長數值後點繁體中文，中文初始空；正常相對路徑導航、無query/hash，PASS |
| U22 兩語鍵盤 | English語言連結後Tab到category，依序到number→source→swap→target→clear；鍵盤輸入2、Enter互換、Enter清除，焦點回number。英文desktop與繁中320px均PASS，英文截圖確認雙層焦點可見 |
| U23 320px | viewport=320×800，兩語document.clientWidth=scrollWidth=305（扣除15px捲軸）；英文所有主要控制項與語言連結高44px。長結果123456789012 cm→m及互換後科學記號正常換行，截图可讀；PASS |
| U24 英文模組失敗 | 暫改英文module src為不存在的同源路徑，真實導覽後fallback可見、fieldset disabled=true、結果—、六FAQ仍在HTML；PASS。未宣稱禁用全部JS |
| U24 精確恢復 | 以開測前原位元組恢復英文頁，SHA256=72d9c40cee051ae6abba37ef38c69bf542401cbd533b004f08f1f9499983db30；reload工具重新啟用，之後質量／面積／容量實測成功。最終dist與public仍一致 |

viewport override 已 reset。無法操作的真200%縮放、AT、完整Network/storage、斷網、真BFCache命中及跨瀏覽器／真行動裝置仍 NOT_RUN。新英文40%額外加長標籤未另注入測試，窄版已以自然長英文與長數值驗證；M02繁中加長案例的歷史證據保持原範圍。

### 範圍與 Windows 環境

工作區含 ignored 檔的開工基線262檔，核對後270檔：250不變、12修改、8新增、0刪除。全部修改／新增均限本工具本輪T04/T05允許路徑及使用者新增雙語要求對應的TASKS契約；dist僅由build產生。原 GlossGate 五個 dirty 檔、.codex/config.toml、其他工具、tokens、core、既有tests/scripts均與基線相同。首次檔案清單因rg沿用ignore規則漏列dist與既有cache；改以含ignored的相同基準核對，並非刪檔。

長測試／建置前後主代理執行 check-persistent-environment.ps1：退出0、Status=PASS，完整Snapshots逐欄相同。HKCU PATH ExpandString／834字／16項／暫存0，SHA256=3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb；HKLM PATH String／1227字／30項／暫存0，SHA256=52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8。Environment-key指紋分別3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a及a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82，TEMP/TMP型別／長度／hash也完全不變。未整理既有重複PATH。

M04/T05判定：本輪可執行驗收PASS，雙語網站實作完成、IMPLEMENTED_WITH_MANUAL_PENDING。沒有已知未修功能阻塞，不宣稱完整MVP人工驗收或已公開收錄。正式網域、發布授權、canonical／head hreflang／sitemap及公開noindex移除，依SEO-RELEASE另行完成。

## M05／T06 最終交接（人工待驗保留）

在T05可執行驗收通過後核對ACCEPTANCE全表：U01–U17由本輪完整自動測試覆蓋，U18/U19/U22與U23窄版已回歸，U20/U21/U23/U24的子項及限制如上逐項列明。本節只交接，不新增產品實作；同一最終程式已通過的test/check/build沿用上述證據，不重跑無變更測試。

T06狀態為HANDOFF_COMPLETE_WITH_MANUAL_PENDING，不能寫「本機MVP驗收完成」。補驗步驟見SEO-RELEASE；project.json仍為in-progress。網站可在本機使用；可依最新授權接續06-date-calculator，不須為相同人工待驗再詢問。持續目標get_goal仍為blocked，工具沒有恢復active的介面；沒有把整批12工具標成完成。

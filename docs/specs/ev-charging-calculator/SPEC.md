# 電動車充電試算 / EV Charging Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-ev-charging-calculator-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

電動車主在插上充電槍前，先估算一次充電要補多少電、要充多久、要花多少電費。

- 家用情境。晚上回家、明早出遠門，車主看著車上電量百分比與家用充電器功率，先算一夜能不能充到目標電量、電費約多少，再決定插槍或改去快充站。
- 出行情境。手機在快充站旁核對 50／120／180 kW 不同功率下的停留時間，決定充到幾成先走。

使用情境為行前估算。資料只保留在目前頁面草稿；本工具不連接車輛或充電樁，不啟動任何充電。

## scope

單次充電、固定功率模型的電量／時間／費用估算。非目標為實際充電曲線（taper：高電量自動降功率）、時間電價或任何分段費率、即時電價查詢、讀取車輛或充電樁即時狀態、電池健康度估計、行程與充電站規劃、控制充電開始或停止。

已與本 repo 既有規格比對，最相近者的實質差異如下。

- 汽油行程的油費試算。此處是電動車以電量百分比差距換算 kWh、再經效率換牆端電量與充電時間，主題、輸入與時間模型皆不同，僅同為交通能源試算。 [spec-fuel-cost-calculator](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/docs/specs/fuel-cost-calculator/SPEC.md)
- 由用電度數與費率級距計算一張家庭電費帳單。此處是單次充電工作階段的電量與時間估算，不算任何費率級距。 [spec-electricity-cost-calculator](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/docs/specs/electricity-cost-calculator/SPEC.md)
- 換電站電池交換的排程規劃。此處不換電，是插槍充電的能量與時間模型。 [spec-battery-swap-plan](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/docs/specs/battery-swap-plan/SPEC.md)

判定規則由本文定義，無線上資料或外部服務依賴。效率、時間與費用的模型皆為本文固定之簡化模型，畫面必須依本文固定文案揭露為估算。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「電池容量、目前電量、目標電量 / Battery capacity, current and target charge」
- 欄位或說明「充電功率、充電效率、每度電價（選填） / Charger power, charging efficiency and price per kWh (optional)」
- 充電功率欄下方有五個預設鈕「7 kW／11 kW／50 kW／120 kW／180 kW」；按下把對應字串 `7`／`11`／`50`／`120`／`180` 寫入充電功率欄並視為一次編輯（回 dirty）。自訂功率直接在欄位輸入。預設鈕不是核心的額外輸入。
- 「計算充電時間 / Calculate charging estimate」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「需補充電量、牆端用電量、預估時間、預估電費 / Energy to add, wall energy, estimated time and estimated cost」先摘要再列細節。結果區固定附估算聲明（見 inputsOutputs）。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、預設鈕或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。目標等於目前電量為零充電成功，一併說明不需充電。若有電價才顯示電費列。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"capacityKwh":"60","currentSoc":"20","targetSoc":"80","chargerPowerKw":"7","efficiencyPct":"90","pricePerKwh":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，執行失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。欄位值以 DOM 的 LF 字串為準。沒有檔案欄。

- `capacityKwh`：電池容量 kWh。ASCII 十進字串，文法 `^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$`（無正負號、空白、指數、前置零、全形數字；小數至多 2 位）。範圍 >0 且 ≤500，`0` 為 RANGE。
- `currentSoc`：目前電量 %。ASCII 整數字串 `^(0|[1-9][0-9]*)$`，範圍 0–100。
- `targetSoc`：目標電量 %。同整數文法，範圍 0–100。
- `chargerPowerKw`：充電功率 kW。同小數文法（至多 2 位），範圍 >0 且 ≤1000。
- `efficiencyPct`：充電效率 %，整數字串，範圍 50–100，預設 `90`。效率定義為電池端電量 ÷ 牆端電量；100 表示無損失模型，低於 50 不接受。
- `pricePerKwh`：每度電價，選填。空字串表示未提供（合法，費用輸出 null）。非空時同小數文法（至多 2 位），範圍 0–100，`0` 合法（免費充電）。
- 每欄 raw 最多 12 code units。預設 `{"capacityKwh":"60","currentSoc":"20","targetSoc":"80","chargerPowerKw":"7","efficiencyPct":"90","pricePerKwh":""}`。

驗證順序固定。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆為 null（本工具無列）。成功僅為 `{ok:true,result}`。資源失敗用固定 INTERNAL，不回傳堆疊。

1. 先驗物件形狀（SCHEMA）。再依 capacityKwh、currentSoc、targetSoc、chargerPowerKw、efficiencyPct、pricePerKwh 的欄位順序逐欄驗證。每欄依序：raw 超過 12 code units → INPUT_LIMIT；含不成對 surrogate → UNICODE；空字串 → EMPTY（pricePerKwh 除外，空字串即未提供，跳過其餘檢查）；文法不符 → DECIMAL_FORMAT（小數欄）或 INTEGER_FORMAT（整數欄）；數值超出範圍 → RANGE。field 即該欄名。
2. 跨欄檢查在全部欄位通過後才做：targetSoc < currentSoc → `{code:"SOC_ORDER",field:"targetSoc"}`。targetSoc == currentSoc 不是錯誤，見步驟 4 的零充電成功。
3. 計算管線全部以精確有理數運算（BigInt 或等價精確十進），禁止以二進浮點累積誤差產生輸出；每個輸出只在最後由精確值四捨五入（round half-up）一次，不得用已捨入的中間值算下一個輸出。令 Δ = targetSoc − currentSoc（整數，≥0）。
   - 電池端需補電量 batteryExact = capacityKwh × Δ ÷ 100（kWh）。
   - 牆端用電量 wallExact = batteryExact × 100 ÷ efficiencyPct（kWh），即牆端 ＝ 電池端 ÷（效率 ÷ 100）。
   - 預估時間 timeMinutesExact = wallExact ÷ chargerPowerKw × 60（分鐘）。固定模型：充電器全程以額定功率自牆端取電，無 taper 曲線。
   - 預估電費 costExact = wallExact × pricePerKwh（pricePerKwh 未提供時不算）。
4. 零充電（Δ=0）回成功且 `needsCharge:false`，電池端與牆端皆 `0.00`、timeMinutes 0、cost 為有電價時 0、未提供電價時 null。不得回負值或錯誤。
5. 結果 `{needsCharge,energyBatteryKwh,energyWallKwh,timeMinutes,cost}`。needsCharge 為 Δ>0 時 true、Δ=0 時 false。energyBatteryKwh 與 energyWallKwh 為恰好 2 位小數的十進字串（如 `"36.00"`）。timeMinutes 為 timeMinutesExact 四捨五入後的整數。cost 為 costExact 四捨五入後的整數；pricePerKwh 未提供時為 null。
6. 時間顯示由 timeMinutes 換算：h = ⌊timeMinutes ÷ 60⌋，r = timeMinutes − 60h。繁中：h>0 顯示「h 小時 rr 分」（rr 補零 2 位），h=0 顯示「r 分」。英文：h>0 顯示「h h rr min」，h=0 顯示「r min」。0 分鐘顯示「0 分」／「0 min」。
7. 結果區固定顯示估算聲明，兩語皆同義：「時間為估算：本工具假設充電功率全程維持不變；實際充電在電量較高時通常會變慢，實際時間可能較長。」／“Time is an estimate: this tool assumes constant charging power for the whole session. Real charging usually slows at higher charge levels, so actual time may be longer.”費用單位隨電價輸入的幣別；繁中畫面以「元」標示、英文畫面不加幣別符號。

固定下載 `ev-charging-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/ev-charging-calculator/`。`public/js/core/` 放純驗證、推導、格式化（不接觸 DOM／網路／storage，測試可直接 import）；`public/js/app.js` 用安全 DOM API 管草稿、工作世代及表單綁定。`public/index.html` 和 `public/en/index.html` 為兩個靜態入口。`scripts/` 只建置工具 allowlist、做靜態檢查與 loopback 預覽，不取線上檔、不發布。`package.json` 明確 test/check/build:preview/check:generated:preview。`test/` 依本文字面案例。根附 `HANDOFF.md`、`VERIFICATION.md`。

- 計算為同步短工作，不使用 Worker，不假造進度。工作開始先使舊結果失效並遞增世代號；執行收目前快照，於下一個事件循環工作項結算。取消、換來源、重設、替換或 pagehide 時丟棄未結算工作；只收目前世代且 busy 的結算，晚到結算（含晚到錯誤）一律丟棄。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 精確運算：核心以 BigInt 有理數或等價精確十進表示 capacityKwh、chargerPowerKw、pricePerKwh（至多 2 位小數）與整數百分比，依 inputsOutputs 管線推導，輸出端才四捨五入。禁止把 `0.825` 之類十進值交給二進浮點直接取捨（案例 `small-topup` 即為此設）。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算充電時間」，畫面和完整報告符合核心 fixtures（含零充電成功與直流快充案例），使用者取得對應產物。 |
| boundaries | 合法端點（容量 500、功率 1000、效率 50 與 100、電量 0 與 100、電價 0）、剛好越界、第一個錯誤、欄位順序和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、結算與 Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。8 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。全部 expected 由作者依本文管線以精確十進手算（見 AUTHOR-CHECK.md 的重算紀錄）。

| 案例 ID | 驗證行為 |
| --- | --- |
| `home-ac` | 家用 7 kW 慢充，牆端電量與時間換算 |
| `dc-fast-charge` | 120 kW 直流快充，含電費四捨五入 |
| `zero-charge` | 目標等於目前電量，零充電成功而非錯誤 |
| `full-charge` | 0% 充到 100%，效率 100 邊界 |
| `small-topup` | 補 1%，十進精確捨入（0.825 → 0.83） |
| `soc-order` | 目標低於目前電量回 SOC_ORDER |
| `efficiency-range` | 效率 101 回 RANGE |
| `decimal-format` | 容量 3 位小數回 DECIMAL_FORMAT |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲結算後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制結算時間的假執行器。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在結算前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 Δ=0 與 Δ=1、效率 50／100／101、電價空字串與 `0`、目標 100 與目前 0 的組合，以及所有成功結果的牆端電量不小於電池端電量、四捨五入只發生在輸出端。

候選 gate（均 NOT_RUN）

- 於 `tools/ev-charging-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「電動車充電試算」，title「電動車充電試算｜Gloss Tools」，description「輸入電池容量、目前與目標電量、充電功率與效率，估算需補電量、充電時間與電費。時間採固定功率模型，僅為估算。」。英文 lang=en，H1 “EV Charging Calculator”，title “EV Charging Calculator | Gloss Tools”，description “Estimate the energy, charging time and cost to charge an EV battery from one charge level to another, using a constant-power model.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。為什麼實際充電比估算久？本工具假設全程固定功率；實際充電在高電量時通常會降低功率，所以實際時間多半較長。 / Why does real charging take longer? This tool assumes constant power for the whole session; real charging usually tapers at higher charge levels, so actual time is often longer.
- FAQ。牆端電量是什麼？從電網取用的電量。充電有效率損失，所以牆端電量＝電池端電量 ÷ 效率。 / What is wall energy? The energy drawn from the grid. Charging is not lossless, so wall energy = battery energy ÷ efficiency.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://ev-charging-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。規格任務 `labs-ev-charging-calculator-spec-20261109` 由主代理登記（作者不執行 registry 指令）。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/ev-charging-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

# 下載時間計算機 / Download Time Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-download-time-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者要下載一個大檔案，手上有檔案大小與連線標稱速度，但兩者單位不同（檔案以 byte 計、速度以 bit 計），心算容易差八倍。本工具把換算、效率折減與完成時刻一次算清。

- 桌面。睡前在電腦前輸入 50 GB 與 100 Mbps，確認需要約 8000 秒、隔天 01:43 完成，決定現在就開始下載。
- 行動。手機上核對一顆 25 MB 的附件以 10 Mbps 約 20 秒可下完，不必切到電腦。

使用情境為估算。資料只保留在目前頁面草稿；速度以固定值計算，不量測真實網路。

## scope

單一檔案、單一固定速度的傳輸時間估算。檔案大小單位採十進位 SI（B、KB、MB、GB、TB）與二進位 IEC（KiB、MiB、GiB、TiB）分開列舉，兩套都精確，不設「十進位／二進位」切換開關。速度單位為 Mbps 或 MB/s。效率 % 為整體折減係數（預設 100，不折減）。完成時刻由開始時間（留空＝現在，本機時間 HH:MM）加未捨入的精確時長推得。

非目標為實際測速或 ping、多檔案與排程、速度隨時間變化或尖峰模型、中斷續傳、從 URL 或檔案讀取大小、把估算當成下載保證。

已與 base commit 的 101 份 `docs/specs/` 預案及 `sources/legacy/` 比對，最相近者的實質差異如下。

- 分析 URL 的組成與參數。此處不碰 URL，只以檔案大小與速度算傳輸時間。`url-inspector`（legacy 來源）。
- 計算 IP 子網路範圍。此處不做網路定址，只做 bit／byte 傳輸量換算。 [spec-subnet-calculator](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/docs/specs/subnet-calculator/SPEC.md)

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「檔案大小、大小單位 / File size and size unit」
- 欄位或說明「連線速度、速度單位 / Connection speed and speed unit」
- 常用速度 chips「10 / 50 / 100 / 300 / 500 / 1000 Mbps」只是填值捷徑：點選把 `speedValue` 填為該數字、`speedUnit` 設為 Mbps，仍是一般草稿編輯（進 dirty），不改變核心語義，也不是第二套輸入。
- 欄位或說明「效率 % / Efficiency %」「開始時間（留空＝現在） / Start time (blank = now)」
- 「計算下載時間 / Calculate download time」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。開始時間留空時，controller 在執行當下以本機時間 HH:MM 補入快照再送核心；核心只收具體 HH:MM，快照一經送出不因時鐘走動而改變。
- 「所需時間與完成時刻 / Time needed and finish time」先摘要（時長文字、完成時刻），再列細節（總秒數、時／分／秒拆解、檔案位元組數、跨日標記）。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。時長為 0 秒是合法結果並照樣顯示，不當成錯誤或空結果。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"sizeValue":"1","sizeUnit":"GB","speedValue":"100","speedUnit":"Mbps","efficiency":"100","startTime":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。本工具六個欄位全為字串。

- `sizeValue`：十進位數字串，文法 `^(0|[1-9][0-9]*)(\.[0-9]{1,3})?$`（ASCII 數字與單一小數點，最多 3 位小數；無正負號、空白、指數、全形數字）。raw 最多 10 單元。範圍 0 < 值 ≤ 9999.999。
- `sizeUnit`：列舉字串，恰為 `B`、`KB`、`MB`、`GB`、`TB`、`KiB`、`MiB`、`GiB`、`TiB` 之一。raw 最多 4 單元。
- `speedValue`：同 `sizeValue` 文法。raw 最多 10 單元。範圍 0.01 ≤ 值 ≤ 999999.999。
- `speedUnit`：列舉字串，恰為 `Mbps` 或 `MB/s` 之一。raw 最多 4 單元。
- `efficiency`：整數字串，文法 `^(0|[1-9][0-9]*)$`。raw 最多 3 單元。範圍 1–100（單位 %）。
- `startTime`：時刻字串，文法 `^[0-9]{2}:[0-9]{2}$`。raw 最多 5 單元。通過文法後 HH 須 00–23、MM 須 00–59。草稿層的空字串代表「現在」，由 controller 在執行前補成本機 HH:MM；核心收到空字串視為 EMPTY。

單位換算固定如下，1 byte = 8 bits。

| sizeUnit | 每單位 byte 數 | sizeUnit | 每單位 byte 數 |
| --- | --- | --- | --- |
| B | 1 | KiB | 1024（2^10） |
| KB | 1,000（10^3） | MiB | 1,048,576（2^20） |
| MB | 1,000,000（10^6） | GiB | 1,073,741,824（2^30） |
| GB | 1,000,000,000（10^9） | TiB | 1,099,511,627,776（2^40） |
| TB | 1,000,000,000,000（10^12） | | |

| speedUnit | 每單位 bit/s |
| --- | --- |
| Mbps | 1,000,000（10^6） |
| MB/s | 8,000,000（8×10^6） |

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆為 null（本工具無列）。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 sizeValue、sizeUnit、speedValue、speedUnit、efficiency、startTime 的順序逐欄驗證，第一個錯誤即整份失敗。每欄依序檢查：raw 超過上限 INPUT_LIMIT；含不成對 surrogate UNICODE；空字串 EMPTY；文法不合（sizeValue／speedValue 為 DECIMAL_FORMAT、sizeUnit／speedUnit 為 ENUM、efficiency 為 INTEGER_FORMAT、startTime 為 TIME_FORMAT）；範圍不合 RANGE。
2. 以千分整數讀值：sizeMilli 為 sizeValue 的千倍整數（文法保證最多 3 位小數），speedMilli 同理。檔案 byte 數為有理數 sizeMilli × 單位 byte 數 / 1000；`sizeBytes` 輸出其精確十進位字串：整數部分照常，小數部分最多 3 位、去掉尾隨 0，無小數時不帶小數點，不用指數記法（例如 4.7 GB → `"4700000000"`，2 GiB → `"2147483648"`，0.001 KB → `"1"`）。
3. 精確時長（秒）為有理數 D = num / den，其中 num = sizeMilli × 單位 byte 數 × 800、den = speedMilli × 速度單位 bit/s × efficiency（即 byte 數 × 8 ÷ （標稱速度 × efficiency/100），全程 BigInt 整數運算，不經浮點）。依上列欄位上限，D 的顯示秒數恆小於 2^53，結果數字均為安全整數。
4. `durationSeconds` 為 D 四捨五入（round half-up，正數）到整數：⌊(2·num + den) / (2·den)⌋。由 durationSeconds 拆 `durationParts`：hours = ⌊s / 3600⌋（可超過 24，不做日進位）、minutes = ⌊(s mod 3600) / 60⌋、seconds = s mod 60。
5. `durationText` 由 durationSeconds 固定格式：s ≥ 3600 時 `H:MM:SS`（H 不補零，MM、SS 補零至 2 位）；60 ≤ s < 3600 時 `M:SS`（M 不補零，SS 補零）；s < 60 時 `0:SS`。例如 8000 → `2:13:20`、376 → `6:16`、20 → `0:20`、96000 → `26:40:00`。
6. 完成時刻只用未捨入的 D（不用 durationSeconds）：起點秒數 startSec = (HH×60 + MM) × 60；總秒數無條件捨去小數 totalFloor = startSec + ⌊num / den⌋；`finishDayOffset` = ⌊totalFloor / 86400⌋（≥ 0 的整數）；日內秒數 clockSec = totalFloor mod 86400；`finishTime` 為 clockSec 的 `HH:MM`（兩位補零，小時 = ⌊clockSec / 3600⌋，分 = ⌊(clockSec mod 3600) / 60⌋，秒不顯示）。`finishText`：offset 為 0 時同 finishTime；offset ≥ 1 時為 `HH:MM +Nd`（字面 `+`、整數 N、字面 `d`，例如 `01:43 +1d`），兩語共用同一格式。
7. 結果物件恰含 `durationSeconds`、`durationText`、`durationParts`、`finishTime`、`finishDayOffset`、`finishText`、`sizeBytes` 七鍵。機器值不隨 locale 改。

固定下載 `download-time-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/download-time-calculator/`。`public/js/core/` 放純驗證、推導、格式化（只用 BigInt 與字串，不碰 DOM／網路／storage，測試能直接 import）。`public/js/app.js` 管草稿、工作世代及資源，並用安全 DOM API 綁表單。`public/index.html` 和 `public/en/index.html` 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。快照中的 startTime 由 controller 在送出前解析：草稿為空字串時填入當下本機 HH:MM，否則用草稿值；解析後快照不再變更。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算下載時間」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。12 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `basic-gb` | 基本換算：4.7 GB、100 Mbps、376 秒 |
| `efficiency-90` | 效率 90 折減改變結果（8000/27 秒） |
| `cross-midnight` | 完成時刻跨午夜，+1d 標記 |
| `sub-minute` | 一分鐘內，`0:SS` 格式 |
| `binary-mb-per-s` | GiB 二進位單位與 MB/s 速度 |
| `half-up-tie` | 精確 1.5 秒，half-up 進位為 2 |
| `finish-unrounded` | 完成時刻用未捨入時長（59.6 秒仍顯示 10:00） |
| `over-24h` | 時長超過 24 小時，H 不進位為日 |
| `tiny-rounds-zero` | 極小時長捨入為 0 秒仍是成功結果 |
| `err-efficiency-zero` | 效率 0 → RANGE |
| `err-size-decimals` | 小數第 4 位 → DECIMAL_FORMAT |
| `err-unit-enum` | 未知單位 PB → ENUM |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。state-cancel-late 與 state-replace-late 的草稿 startTime 均為具體時刻字串，不經過「留空＝現在」解析。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 sizeValue 9999.999／10000、speedValue 0.01／0.009（文法外）與 0（RANGE）、efficiency 1／100／101、startTime 23:59／24:00（RANGE）／7:30（TIME_FORMAT）、durationSeconds 恰 60 與 3600 的格式切換、finishTime 恰在午夜 00:00 的 offset 進位。

候選 gate（均 NOT_RUN）

- 於 `tools/download-time-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「下載時間計算機」，title「下載時間計算機｜Gloss Tools」，description「輸入檔案大小與連線速度，算出下載需要多久與預計完成時間；位元與位元組換算、效率折減都寫清楚。」。英文 lang=en，H1 “Download Time Calculator”，title “Download Time Calculator | Gloss Tools”，description “Estimate how long a download takes and when it will finish, with explicit bit/byte conversion and an efficiency factor.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。為什麼 100 Mbps 下載 100 MB 不是 1 秒？速度以位元（bit）計、檔案以位元組（byte）計，1 byte = 8 bits，所以約需 8 秒多。 / Why isn't a 100 MB file done in 1 second at 100 Mbps? Speed is measured in bits and file size in bytes; 1 byte = 8 bits, so it takes about 8 seconds.
- FAQ。效率是什麼？協定額外負擔與實際環境會讓有效速度低於標稱值；效率 90 表示以標稱速度的九成計算。預設 100，不折減。 / What is efficiency? Protocol overhead and real-world conditions make the effective speed lower than the rated one; 90 uses 90% of the rated speed. The default is 100, no reduction.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://download-time-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。規格 task id 為 `labs-download-time-calculator-spec-20261109`，由主代理登記，本人不登記。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/download-time-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

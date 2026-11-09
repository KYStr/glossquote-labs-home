# 影片檔案大小估算 / Video File Size Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-video-file-size-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

錄影前先知道「這樣錄，一段片多大、一張卡錄多久」，不必錄完才發現爆卡，也不必上傳到一半才發現檔案比預期大。

- 桌面。剪輯者或創作者在電腦前核對：10 分鐘 4K30 成品用 H.265 匯出大概幾 GB，備份碟還夠不夠。
- 行動。拍攝者在出門前用手機確認：64 GiB 記憶卡用 1080p30 大概可錄幾小時，要不要改設定或多帶一張卡。

使用情境為設計假設。資料只保留在目前頁面草稿。

## scope

MVP 必做：兩種模式共用同一組位元率設定。檔案大小模式由片長與位元率算檔案大小；可錄時長模式由目標容量與位元率反推最長整秒數。位元率來源二選一：寫死的解析度預設表或自訂 Mbps。編碼係數套在視訊位元率上（預設表是 H.264 基準值，自訂值同樣視為 H.264 基準），音訊位元率獨立選取、不套係數。大小同時顯示十進位與二進位單位。

非目標：讀取或分析真實媒體檔、量測實際位元率、轉碼、VBR 內容相依建模、容器（MP4/MOV）封裝額外開銷建模、串流/直播碼率規劃、任何相機品牌選單的精確對應。預設位元率與編碼係數皆為經驗值（heuristic），固定文案明示實際大小會依畫面內容、編碼器設定與容器而不同；本工具不承諾與任何單一裝置或平台的實際成品一致。

已與本 repo 既有 spec/legacy 清單比對，最相近者的實質差異如下。

- 下載時間計算機（同批概念 #33，`download-time-calculator`，製作前規格）：給「已知檔案大小」與網路速度算傳輸時間。此處是給「位元率 × 片長」先導出檔案大小，再反推固定容量可錄多久；未知量與輸入都不同（錄影位元率對網路速度、容量對時間）。
- web-media-saver（legacy）：在瀏覽器實際保存/取出媒體檔 bytes，是動作工具，不做任何位元率或容量估算。
- frame-timecode（既有 spec）：換算影片 timecode 格式與影格，不涉位元率、檔案大小或容量。

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「模式 / Mode」：兩個 radio，「檔案大小 / File size」與「可錄時長 / Recordable duration」。切換模式只改變哪一組欄位生效，不清除任何已輸入值。
- 欄位或說明「片長（時：分：秒）/ Duration (H:MM:SS)」：僅檔案大小模式生效。
- 欄位或說明「位元率來源 / Bitrate source」：radio「預設 / Preset」與「自訂 / Custom」；其下「解析度預設 / Resolution preset」select（預設模式生效）與「自訂視訊位元率（Mbps）/ Custom video bitrate (Mbps)」（自訂模式生效）。不生效的欄位以 disabled 呈現但保留值。
- 欄位或說明「編碼 / Codec」與「音訊位元率 / Audio bitrate」：兩模式共用。編碼選項旁固定顯示係數（如「H.265（約 ×0.55）」）。
- 欄位或說明「目標大小 / Target size」與「單位 / Unit」：僅可錄時長模式生效；單位為 MB / GB / MiB / GiB。
- 「計算 / Calculate」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 結果區：檔案大小模式先摘要「檔案大小 / File size」——GB 為主顯示、GiB 為副顯示（皆固定兩位小數），其下明細列 MB、MiB、總位元組與生效位元率（視訊/音訊/合計 bps）。可錄時長模式先摘要「最長時長 / Maximum duration」（H:MM:SS），其下明細列實際占用位元組、剩餘位元組與目標位元組。結果旁常駐經驗值揭露句（見 inputsOutputs 固定字串），不可摺疊隱藏。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。可錄時長為 0 秒是合法結果，摘要旁明示「不到 1 秒 / Less than 1 second」。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"mode":"size","duration":"0:10:00","bitrateSource":"preset","preset":"1080p30","customBitrateMbps":"10","codec":"h264","audioKbps":"192","targetSize":"64","targetUnit":"GiB"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數是含下列確切 9 個欄位的普通物件，只讀 own data；欄位不多不少，未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。所有欄位值皆為字串。textarea 以 DOM 的 LF 值為準。本工具無檔案欄。

固定資料表（寫死於核心，UI 文案與計算共用同一份）：

| preset 值 | 標籤 zh / en | 基準視訊位元率 |
| --- | --- | --- |
| `2160p60` | 4K 60fps | 45 Mbps |
| `2160p30` | 4K 30fps | 35 Mbps |
| `1080p60` | 1080p 60fps | 12 Mbps |
| `1080p30` | 1080p 30fps | 8 Mbps |
| `720p30` | 720p 30fps | 5 Mbps |
| `480p30` | 480p 30fps | 2.5 Mbps |

預設表標明為「H.264 常見經驗值 / typical H.264 values」，不是任何裝置的規格值。

| codec 值 | 標籤 | 係數（精確分數） |
| --- | --- | --- |
| `h264` | H.264 | 1/1 |
| `h265` | H.265 / HEVC | 11/20（0.55） |
| `av1` | AV1 | 9/20（0.45） |
| `prores422` | ProRes 422 | 15/1 |

係數只套視訊位元率，預設與自訂兩種來源都套；係數是經驗值，其中 ProRes 422 的實際位元率由解析度與幀率決定、與內容無關，此處 ×15 是對 H.264 經驗基準的粗略換算，落差最大，文案須明示。

| audioKbps 值 | 意義 |
| --- | --- |
| `0` | 無音訊 / No audio |
| `128` / `192` / `256` / `320` | 音訊位元率 kbps |

欄位規則：

- `mode`：enum `size` / `duration`。
- `duration`：片長，文法 `^\d{1,3}:[0-5]\d:[0-5]\d$`（時 1–3 位、可前導零；分、秒恰兩位 00–59），違者 DURATION_FORMAT。總秒數 = 時×3600+分×60+秒，須 ≥ 1，0 秒為 RANGE。文法本身已把上限封在 999:59:59（3,599,999 秒），無獨立上限錯誤。
- `bitrateSource`：enum `preset` / `custom`。
- `preset`：enum 為上表 6 值。
- `customBitrateMbps`：十進位字串文法 `^(0|[1-9]\d*)(\.\d{1,2})?$`（無正負號、無指數、無多餘前導零、小數至多兩位），違者 DECIMAL_FORMAT。數值範圍 0.1–1000 Mbps（含端點），外者 RANGE。
- `codec`：enum 為上表 4 值。
- `audioKbps`：enum `"0"` / `"128"` / `"192"` / `"256"` / `"320"`。
- `targetSize`：十進位字串文法同 customBitrateMbps，違者 DECIMAL_FORMAT。換算為精確位元組後須滿足 1 ≤ bytes ≤ 2^53−1（9,007,199,254,740,991），外者 RANGE。
- `targetUnit`：enum `MB`（10^6 bytes）/ `GB`（10^9）/ `MiB`（2^20）/ `GiB`（2^30）。

生效關係（inactive 欄位只做 SCHEMA 型別、INPUT_LIMIT 與 UNICODE 檢查，不做 EMPTY/文法/範圍/enum）：`duration` 僅 mode=`size` 生效；`targetSize`、`targetUnit` 僅 mode=`duration` 生效；`preset` 僅 bitrateSource=`preset` 生效；`customBitrateMbps` 僅 bitrateSource=`custom` 生效；`mode`、`bitrateSource`、`codec`、`audioKbps` 永遠生效。

驗證順序固定：先 SCHEMA（物件形狀與全欄位型別）。再依欄位順序 `mode`、`duration`、`bitrateSource`、`preset`、`customBitrateMbps`、`codec`、`audioKbps`、`targetSize`、`targetUnit` 逐欄檢查，每欄依序：raw 長度（UTF-16 code units）上限——mode 8、duration 9、bitrateSource 6、preset 8、customBitrateMbps 8、codec 10、audioKbps 3、targetSize 12、targetUnit 3——超限 INPUT_LIMIT；孤立 surrogate 為 UNICODE；生效欄位空字串為 EMPTY；再文法（DURATION_FORMAT / DECIMAL_FORMAT）、enum（ENUM）、範圍（RANGE）。第一個錯誤即整份失敗，回 `{ok:false,error:{code,field,row}}`，row 恆 null（本工具無列）。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

精確算術（全程 BigInt 分數，無浮點、無中途捨入）：

1. 基準視訊位元率以「百分之一 Mbps」整數 `rateH` 表示：預設表 45→4500、35→3500、12→1200、8→800、5→500、2.5→250；自訂字串依文法解析為百分之一 Mbps 整數（例 `"12.34"`→1234）。
2. 生效視訊位元率 `videoBps = rateH × 10,000 × 係數分子 ÷ 係數分母`。因 10,000 可被分母 20 整除，四種係數下 videoBps 恆為整數（此為不變量，實作可斷言）。`audioBps = audioKbps × 1000`。`totalBps = videoBps + audioBps`。
3. 檔案大小模式：`exactBytes = totalBps × durationSec / 8`（分數）。輸出 `bytes` = exactBytes 四捨五入（round half-up）至整數。
4. 四個顯示值一律由 exactBytes（未捨入分數）各自換算、各自 round half-up 至兩位小數、固定格式 `整數.兩位`（不去尾零、不加千分位）：`sizeMB` = /10^6、`sizeGB` = /10^9、`sizeMiB` = /2^20、`sizeGiB` = /2^30。主顯示 GB、副顯示 GiB 是 UI 排序，不改 result 欄位。
5. 可錄時長模式：`targetBytesExact = targetSize 數值 × targetUnit 位元組數`（分數；targetBytes 輸出為其 round half-up 整數）。`maxDurationSec = floor(targetBytesExact × 8 / totalBps)`（向下取整至整秒，保證該秒數的檔案不超過目標）。`usedBytes` = `totalBps × maxDurationSec / 8` 的 round half-up 整數；`headroomBytes = targetBytes − usedBytes`（皆以輸出整數相減，恆 ≥ 0）。maxDurationSec 為 0 是合法結果。
6. 時間格式 `durationText` / `maxDurationText`：`H:MM:SS`——時為無前導零的十進位（可超過 999，僅出現在 maxDurationText），分、秒恰兩位補零。

檔案大小模式 result：`{mode, durationSec, durationText, videoBps, audioBps, totalBps, bytes, sizeMB, sizeGB, sizeMiB, sizeGiB}`。可錄時長模式 result：`{mode, targetBytes, videoBps, audioBps, totalBps, maxDurationSec, maxDurationText, usedBytes, headroomBytes}`。數值皆為安全整數（最大值域：videoBps ≤ 1000 Mbps×15 = 1.5×10^10；bytes ≤ 15,000,320,000 bps × 3,599,999 s ÷ 8 < 2^53；targetBytes ≤ 2^53−1），字串欄位格式如上。機器值不隨 locale 改。

固定揭露字串（結果旁常駐、雙語、不可摺疊）：「預設位元率與編碼係數是常見經驗值；實際檔案大小會依畫面內容、編碼器設定與容器而不同。 / Preset bitrates and codec factors are common rules of thumb; actual file size varies with picture content, encoder settings and container.」公式說明：「檔案大小 =（視訊位元率 × 編碼係數 + 音訊位元率）× 片長秒數 ÷ 8；位元率的單位是每秒位元數（bps）。 / File size = (video bitrate × codec factor + audio bitrate) × duration in seconds ÷ 8; bitrates are in bits per second (bps).」

固定下載 `video-file-size-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/video-file-size-calculator/`。src/core.mjs 放純驗證、推導、格式化（內含上列三張固定資料表與 BigInt 分數運算）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算」，兩種模式的畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、生效/不生效欄位差異和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。10 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `preset-1080p30-basic` | 預設 1080p30 + H.264 + 192 kbps 音訊錄 10 分鐘的基本大小與四單位顯示 |
| `codec-h265-factor` | H.265 係數 11/20 套在 4K30 預設位元率（僅視訊、音訊不套） |
| `custom-av1-long` | 自訂 100 Mbps + AV1 係數 + 無音訊的 10 小時長時間案例 |
| `prores-480p` | ProRes 422 係數 ×15 與 bytes/顯示值的 half-up 邊界（705.525 → 705.53） |
| `inverse-card-64gib` | 64 GiB 反推最長整秒（floor）、實際占用與剩餘 |
| `inverse-tiny-target` | 目標小於 1 秒資料量時合法回 0 秒 |
| `duration-zero` | 片長 0 秒為 RANGE |
| `duration-format` | 分欄位 99 違反 H:MM:SS 文法為 DURATION_FORMAT |
| `decimal-format` | 自訂位元率三位小數為 DECIMAL_FORMAT |
| `preset-enum` | 未列入固定表的預設值為 ENUM |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 duration 999:59:59 合法、1000 小時違反文法、customBitrateMbps 0.1/1000 端點與 0.05/1000.01 越界、targetSize 換算恰 2^53−1 與 2^53、mode=duration 時 duration 欄位不生效（垃圾字串但型別正確不報錯）、bitrateSource=custom 時 preset 不生效、maxDurationSec 的 floor 性質（maxSec 可行、maxSec+1 超出目標）。

候選 gate（均 NOT_RUN）

- 於 `tools/video-file-size-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「影片檔案大小估算」，title「影片檔案大小估算｜Gloss Tools」，description「依片長、解析度預設位元率或自訂位元率、編碼係數與音訊位元率估算影片檔案大小，GB 與 GiB 並列顯示，也可反推指定容量最長可錄多久。」。英文 lang=en，H1 “Video File Size Calculator”，title “Video File Size Calculator | Gloss Tools”，description “Estimate a video file size from duration, a resolution preset or custom bitrate, a codec factor and audio bitrate — GB and GiB side by side — or invert it: the longest recording that fits a target size.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。估出來為什麼和實際檔案不一樣？預設位元率與係數是經驗值，實際大小會依畫面內容、編碼器與容器而不同，本工具不讀取你的檔案。 / Why does the estimate differ from my real file? Presets and factors are rules of thumb; real sizes vary with picture content, encoder and container, and this tool never reads your files.
- FAQ。GB 和 GiB 差在哪？GB 是 10^9 位元組（儲存裝置廠商標示），GiB 是 2^30 位元組（作業系統常見顯示），同一個檔案用 GiB 看數字會比較小。 / What is the difference between GB and GiB? A GB is 10^9 bytes (how storage is marketed); a GiB is 2^30 bytes (how operating systems often display it), so the same file shows a smaller number in GiB.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://video-file-size-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

規格 task id `labs-video-file-size-calculator-spec-20261109`（由主代理登記，作者不執行 registry 指令）。非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/video-file-size-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

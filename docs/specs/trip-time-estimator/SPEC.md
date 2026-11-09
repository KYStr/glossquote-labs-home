# 旅程時間估算 / Trip Time Estimator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-trip-time-estimator-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

旅客核對跨時區行程時，先用固定 UTC 偏移把出發、旅程時間與抵達三者換算清楚：抵達當地是哪一天幾點、比出發地日期早一天還是晚一天、整段旅程實際多久。

- 桌面。訂位完成後把出發日期時間、兩地偏移與艙等表上的飛行時間逐項填入，核對抵達日與跨日位移，再下載報告與行程紀錄對照。
- 行動。手機在機場或聊天中只看到抵達當地時間，切模式 B 反推實際飛行時間，判斷要不要先調手錶與睡眠。

使用情境為行程核對。資料只保留在目前頁面草稿。

## scope

固定範圍：出發地日期時間（分鐘精度）＋出發地／抵達地固定 UTC 偏移（15 分鐘步進、−12:00 至 +14:00）→ 模式 A 以旅程時間推抵達地日期時間與跨日位移；模式 B 以抵達地讀數反推旅程時間。輸出同時給出出發時刻在抵達地時區的讀數、抵達時刻在出發地時區的讀數。非目標為 IANA 時區資料庫與日光節約時間（偏移一律由使用者以固定值給定，頁面明示此限制）、航班搜尋／訂位／即時狀態、多段轉機逐段輸入、秒以下精度、歷史或未來時區規則查詢。

已與 registry 及既有 specs／legacy 比對，最相近者的實質差異如下。

- 時區換算（`time-zone-converter`）。該工具把一個鐘面讀數經裝置時區資料庫換算到多個 IANA 時區，核心問題是 DST 缺口與重疊，且明文排除飛行時間。此處不查任何時區資料庫，只以使用者給定的固定偏移做旅程加減：輸入多了一個旅程時間（或反推它），輸出的是抵達日與跨日位移，問題本質是行程運算而非鐘面換算。
- 日出日落計算（`sunrise-sunset-calculator`）。同樣接受日期與 UTC 偏移，但輸出是太陽事件時刻，模型是天文近似，與出發／抵達的人為行程無關。
- 共用簡報中同號的另一概念（行車時間估算：距離、平均速度、休息規則）與本案輸入輸出完全不同；本案依指派版本撰寫，差異記錄於 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)。

判定規則由本文定義，無線上資料或外部服務依賴。城市預設的偏移為標準時間代表值，僅供帶入欄位，不構成時區資料。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 模式切換「計算方式 / Mode」：`duration`「以飛行時間推抵達 / From travel duration」或 `arrival`「以抵達時間反推 / From arrival time」。切換模式時立即清空另一模式的專屬欄位（模式 A 的 `duration`；模式 B 的 `arrivalTime`、`arrivalNextDay`），其餘欄位保留。
- 欄位或說明「出發日期、出發時間 / Departure date and time」
- 欄位或說明「出發地 UTC 偏移、抵達地 UTC 偏移 / Departure and arrival UTC offsets」，偏移以 select 提供 −12:00 至 +14:00 每 15 分鐘一格的固定清單，零偏移只列 `+00:00`。
- 城市預設「常用航線（標準時間）/ Common routes (standard time)」六組，點選只帶入兩地偏移，不改日期、時間或模式：臺北 +08:00 ↔ 東京 +09:00、臺北 +08:00 ↔ 洛杉磯 −08:00、臺北 +08:00 ↔ 倫敦 +00:00、臺北 +08:00 ↔ 紐約 −05:00、臺北 +08:00 ↔ 雪梨 +10:00、臺北 +08:00 ↔ 巴黎 +01:00。每組旁固定標示「標準時間，夏令時間請自行調整偏移 / Standard time; adjust the offset yourself during daylight saving time」。
- 模式 A 欄位「飛行（旅程）時間 / Travel duration」，格式 `H:MM`。模式 B 欄位「抵達時間 / Arrival time」與切換「抵達日期為出發日期的次日 / Arrival is on the day after the departure date」。
- 固定說明（結果區與輸入區各一份，不可收合移除）：「本工具使用固定 UTC 偏移，不含日光節約時間與時區資料庫；實際航班與行程時間請以航空公司或營運單位公布為準。 / This tool uses fixed UTC offsets with no daylight-saving or time-zone database; check your flight's actual times with the carrier.」
- 「計算旅程時間 / Calculate trip time」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「抵達時間與旅程長度 / Arrival and duration」先摘要（抵達地日期時間、跨日標籤、旅程時間）再列四個讀數細節。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、模式、預設帶入或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"mode":"duration","departureDate":"","departureTime":"","departureOffset":"+08:00","arrivalOffset":"+09:00","duration":"","arrivalTime":"","arrivalNextDay":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

欄位共八個，全為字串：`mode`、`departureDate`、`departureTime`、`departureOffset`、`arrivalOffset`、`duration`、`arrivalTime`、`arrivalNextDay`。raw 上限（UTF-16 code units）：mode 16、departureDate 16、departureTime 8、departureOffset 8、arrivalOffset 8、duration 8、arrivalTime 8、arrivalNextDay 8。

- `mode`：`duration`（模式 A）或 `arrival`（模式 B）。
- `departureDate`：`YYYY-MM-DD`，西曆，2000-01-01 至 2099-12-31。
- `departureTime`、`arrivalTime`：`HH:MM`，兩位時、兩位分，00:00 至 23:59。
- `departureOffset`、`arrivalOffset`：固定文法 `+HH:MM`／`-HH:MM`（兩位時、兩位分），分鐘只許 00、15、30、45；值域 −720 至 +840 分鐘（即 −12:00 至 +14:00）；零偏移只許 `+00:00`，`-00:00` 為 OFFSET_FORMAT。
- `duration`（模式 A）：`H:MM`，H 為 `0` 或非零開頭的 1–3 位數，分為兩位 00–59；總分鐘 1 至 2880（即最長 48:00）。
- `arrivalNextDay`（模式 B）：`true` 或 `false`。語義固定：抵達地日期 = 出發地日期（同一曆日）加 1 日（`true`）或加 0 日（`false`）。此切換是模式 B 唯一允許的 +24 小時解讀；核心不自動加日、不猜測。
- 模式專屬欄位：模式 A 時 `arrivalTime`、`arrivalNextDay` 必須為空字串；模式 B 時 `duration` 必須為空字串。非空即 SCHEMA（field,row=null），在欄位驗證之前判定。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆為 null（本工具無列）。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 mode、departureDate、departureTime、departureOffset、arrivalOffset 驗證共同欄位，再依模式驗證專屬欄位。mode：EMPTY、ENUM。departureDate：DATE_FORMAT（`^\d{4}-\d{2}-\d{2}$`）、DATE_INVALID（文法合但曆日不存在，如 2026-02-29、2026-13-01）、RANGE（2000-01-01 至 2099-12-31 之外）。departureTime／arrivalTime：TIME_FORMAT（`^\d{2}:\d{2}$`）、RANGE（時 0–23、分 0–59）。departureOffset／arrivalOffset：OFFSET_FORMAT（文法、15 分鐘步進、`-00:00` 皆在此判定）、RANGE（−720 至 +840 分鐘）。duration：DURATION_FORMAT（`^(0|[1-9]\d{0,2}):[0-5]\d$`）、RANGE（總分鐘 1–2880）。arrivalNextDay：EMPTY、ENUM。
2. 日數換算固定採 proleptic Gregorian 的 Hinnant 公式，全程整數。`daysFromCivil(y,m,d)`：先 `y -= (m <= 2)`；`era = floorDiv(y, 400)`（對負數向下取整）；`yoe = y - era*400`；`doy = floor((153*(m > 2 ? m-3 : m+9) + 2)/5) + d - 1`；`doe = yoe*365 + floor(yoe/4) - floor(yoe/100) + doy`；回 `era*146097 + doe - 719468`。`civilFromDays(z)`：先 `z += 719468`；`era = floorDiv(z, 146097)`；`doe = z - era*146097`；`yoe = floor((doe - floor(doe/1460) + floor(doe/36524) - floor(doe/146096))/365)`；`yy = yoe + era*400`；`doy = doe - (365*yoe + floor(yoe/4) - floor(yoe/100))`；`mp = floor((5*doy + 2)/153)`；`d = doy - floor((153*mp + 2)/5) + 1`；`m = mp < 10 ? mp + 3 : mp - 9`；回 `(m <= 2 ? yy + 1 : yy, m, d)`。era 正規化後所有除法的被除數皆非負，以截斷除法計。偏移字串轉分鐘：`sign * (HH*60 + MM)`，sign 為 `+` 取 +1、`-` 取 −1。
3. 絕對分鐘模型（全程整數，無浮點、無捨入）：`depDay = daysFromCivil(departureDate)`；`depLocalAbs = depDay*1440 + HH(departureTime)*60 + MM(departureTime)`；`depInstant = depLocalAbs - departureOffsetMinutes`。
4. 模式 A：`durationMinutes = H(duration)*60 + MM(duration)`；`arrInstant = depInstant + durationMinutes`。
5. 模式 B：`arrLocalAbs = (depDay + (arrivalNextDay == "true" ? 1 : 0))*1440 + HH(arrivalTime)*60 + MM(arrivalTime)`；`arrInstant = arrLocalAbs - arrivalOffsetMinutes`；`durationMinutes = arrInstant - depInstant`。若 `durationMinutes <= 0` 回 DURATION_NOT_POSITIVE（field=`arrivalTime`）；若 `durationMinutes > 2880` 回 RANGE（field=`arrivalTime`）。不自動加 24 小時、不換用其他解讀。
6. 讀數換算：任一絕對分鐘 `t` 與偏移 `o` 的當地讀數為 `local = t + o`；`day = floorDiv(local, 1440)`（負值向下取整，即借位方向固定向過去跨日）；`rem = local - day*1440`（恆 0–1439）；日期為 `civilFromDays(day)` 格式化 `YYYY-MM-DD`（年 4 位補零）；時間為 `floor(rem/60)` 與 `rem mod 60` 各兩位補零。`dayShift = day - depDay`（相對於出發地日期的日差，可為負）。由欄位界線可證 dayShift 恆在 −2 至 +4，標籤規則對任意整數成立（見下）。
7. 結果 `{mode, durationMinutes, duration, departureLocal, departureInArrivalZone, arrivalLocal, arrivalInDepartureZone}`。`duration` 文字為 `floor(durationMinutes/60)` 不補零 + `:` + `durationMinutes mod 60` 兩位補零（如 `3:05`、`30:00`）。`departureLocal` 為 `{date, time, offset}`（回顯驗過的出發輸入，offset 為出發偏移字串）。其餘三個讀數各為 `{date, time, offset, dayShift}`：`departureInArrivalZone` 是 depInstant 以抵達偏移表示；`arrivalLocal` 是 arrInstant 以抵達偏移表示；`arrivalInDepartureZone` 是 arrInstant 以出發偏移表示；三者的 offset 分別回顯對應偏移字串。
8. 跨日標籤（僅顯示，不入核心結果）：dayShift −1 →「前一天 / the day before」；0 →「當天 / the same day」；+1 →「隔天 / the next day」；其餘 n →「+n 天 / +n days」（n ≥ 2）或「-n 天 / -n days」（n ≤ −2，n 為負值本身，字面即含負號）；數字與正負號中英皆用 ASCII。顯示時 dayShift 以帶正負號十進位附註，如「隔天（+1）」。

固定下載 `trip-time-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/trip-time-estimator/`。src/core.mjs 放純驗證、推導、格式化（含 daysFromCivil／civilFromDays 與絕對分鐘模型）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。核心不讀裝置時鐘、時區或 Intl 時區資料；「現在」不作為任何預設值，日期時間一律使用者輸入。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算旅程時間」，兩模式畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、模式 B 非正旅程時間與三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。11 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `example-tokyo-hop` | 模式 A 基本案，同日抵達，四讀數齊備 |
| `dateline-day-before` | 西向跨日期線，抵達為出發地日期的前一天（dayShift −1） |
| `eastbound-next-day` | 深夜出發長程，抵達隔天（dayShift +1） |
| `plus-two-days-year-cross` | 30 小時旅程加 +14:00 偏移，跨年且 dayShift +2 |
| `quarter-hour-offset` | +05:45 四分一時區偏移，整數分鐘模型不變 |
| `mode-b-same-day` | 模式 B 同日反推旅程時間 |
| `mode-b-next-day-toggle` | 模式 B 切換次日時反推成立 |
| `mode-b-not-positive` | 同輸入關閉切換，旅程時間 ≤ 0 回 DURATION_NOT_POSITIVE |
| `offset-step-format` | 偏移分鐘非 15 分鐘步進回 OFFSET_FORMAT |
| `date-invalid` | 2026-02-29 不存在回 DATE_INVALID |
| `duration-too-long` | 49:00 超過 2880 分鐘回 RANGE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 duration 2880／2881 分鐘、偏移 −720／+840 與各超出一格、日期 2000-01-01／2099-12-31、模式 B 旅程時間恰為 0 與 1 分鐘、arrivalNextDay 切換前後、civilFromDays 與 daysFromCivil 在 1999-12-01 至 2101-02-01 全域互逆、dayShift −2 與 +4 的極端組合。所有結果時間恆在 00:00–23:59、dayShift 與日期差一致。

候選 gate（均 NOT_RUN）

- 於 `tools/trip-time-estimator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「旅程時間估算」，title「旅程時間估算｜Gloss Tools」，description「輸入出發地日期時間、兩地 UTC 偏移與飛行時間（或抵達時間），換算抵達地日期時間與跨日變化；固定偏移，不含日光節約時間。」。英文 lang=en，H1 “Trip Time Estimator”，title “Trip Time Estimator | Gloss Tools”，description “Convert a departure date and time across fixed UTC offsets with a travel duration or an arrival time, and see the arrival date, day shift and duration. Fixed offsets; no daylight-saving database.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。為什麼抵達時間看起來比出發還早？因為抵達地時區可能在出發地之後，鐘面讀數會倒退，甚至回到前一天；請看跨日標籤與抵達日期。 / Why can the arrival clock time look earlier than the departure time? The destination may be in a later-offset zone, so the clock reading moves backwards, even to the day before; check the day-shift label and the arrival date.
- FAQ。有考慮日光節約時間嗎？沒有。本工具只用你輸入的固定 UTC 偏移；夏令時間期間請把偏移改成當地當時實際的偏移，實際航班時間以航空公司公布為準。 / Does it handle daylight saving time? No. It uses only the fixed UTC offsets you enter; during daylight saving time, enter the offset actually in effect, and always confirm real flight times with the carrier.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://trip-time-estimator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。規格任務 id 為 `labs-trip-time-estimator-spec-20261109`，由主代理登記，作者不自行執行 registry 指令。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/trip-time-estimator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

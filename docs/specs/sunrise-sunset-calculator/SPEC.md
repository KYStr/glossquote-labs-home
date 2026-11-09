# 日出日落時間計算 / Sunrise & Sunset Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-sunrise-sunset-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者為了拍照、登山、農作或單純安排作息，需要某個日期、某個地點的日出與日落時間。他手上通常只有日期和大略座標，天氣 App 只給預設城市；出國或到高緯度地區時，夏令時間偏移與極晝／極夜更讓通用工具失準或直接給不出答案。

- 桌面。規劃行程時在電腦前逐一核對不同城市、不同日期的日出日落與日長。
- 行動。在出發地用手機輸入座標，確認隔天幾點天亮、幾點天黑。

使用情境為近似試算。資料只保留在目前頁面草稿。

## scope

單一日期、單一地點的日出、太陽正午、日落與日長。算法固定為 NOAA 公布的近似公式（見 implementation），天頂角 90.833°，γ 以當地正午取值。輸入為日期、緯度、經度與固定 UTC 偏移；含 8 個城市預設。非目標為時區資料庫、日光節約時間自動判斷、IP 定位或地理編碼、海拔與大氣折射的額外修正、晨昏蒙影（民用／航海／天文黎明黃昏）、月相、多日或全年表格、把結果用於導航、航行、航空或其他安全用途。

已比對本 repo `docs/specs/` 既有預案、`tools/` 與 `sources/`，最相近者的實質差異如下。

- 月相計算機（同批預案）算的是月齡、照亮比例與月相名稱，輸入為日期時間與月球朔望週期。此處算太陽的出沒時刻，用的是 NOAA 太陽近似公式，輸入多了緯度、經度與時角定義域判定。`docs/specs/moon-phase-calculator/`
- 時區換算工具把已知時刻在時區之間換算，不做任何天文計算。此處的偏移只是固定輸入，輸出的是由太陽位置推導的時刻。`docs/specs/time-zone-converter/`
- 睡眠週期計算機由起床時間反推就寢時間，沒有天文成分。此處不處理睡眠。`docs/specs/sleep-cycle-calculator/`

判定規則由本文定義，公式來源為 NOAA Global Monitoring Laboratory 公布的 Solar Calculator 近似算法（fractional year 工作表版本）。無線上資料或外部服務依賴；城市預設座標寫死於本文。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「日期 / Date」
- 欄位或說明「城市預設 / City preset」（八個預設城市；選取後把該市緯度、經度、UTC 偏移填入下列欄位，三欄可再手動改，改後預設顯示為自訂）
- 欄位或說明「緯度、經度（東經為正）/ Latitude and longitude (east is positive)」
- 欄位或說明「UTC 偏移 / UTC offset」
- 「計算日出日落 / Calculate sunrise & sunset」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個案例，明示範例並等待手動執行。
- 「日出、太陽正午、日落與日長 / Sunrise, solar noon, sunset and day length」先摘要再列細節。正常狀態列三個時刻與日長；時刻落在輸入日期的前一日或次一日時，時刻旁標示「（前一日）/ (previous day)」或「（次一日）/ (next day)」。極晝／極夜狀態只顯示狀態說明，不顯示時刻。成功才顯示「下載報告 / Download report」。文字可手動選取。結果區下方常駐精度說明（見 tests 兩語內容）。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、預設或選項改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。極晝／極夜也是 success 的一種結果，以狀態文字呈現。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"date":"","latitude":"25.0330","longitude":"121.5654","utcOffset":"+08:00"}` 並聚焦日期欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

- `date`：字串。raw 最多 10 單元。文法固定 `^\d{4}-\d{2}-\d{2}$` 且須為格里曆（proleptic Gregorian）真實日期，否則 DATE_FORMAT。範圍 1900-01-01 至 2100-12-31，否則 RANGE。
- `latitude`：字串，緯度（度，北緯為正）。raw 最多 12 單元。文法固定：可選 `-`、整數部 `0` 或非零開頭至多 3 位、可選小數部 `.` 加 1–4 位數字；不接受 `+`、空白、指數，否則 DECIMAL_FORMAT。範圍 −89.9 至 89.9（含），否則 RANGE。邊界取 ±89.9 而非 ±90，因 cos φ、tan φ 在極點退化；極晝／極夜由時角定義域判定，不依賴緯度邊界。
- `longitude`：字串，經度（度，東經為正）。raw 與文法同 latitude。範圍 −180 至 180（含），否則 RANGE。
- `utcOffset`：字串。raw 最多 6 單元。文法固定 `^[+-]\d{2}:\d{2}$` 且分鐘部只接受 00、15、30、45，否則 OFFSET_FORMAT。換算為帶號分鐘後須在 −720（−12:00）至 840（+14:00）之間，否則 RANGE（例：`+14:15` 文法合法但 RANGE，`+08:10` 為 OFFSET_FORMAT）。
- 預設 `{"date":"","latitude":"25.0330","longitude":"121.5654","utcOffset":"+08:00"}`。

城市預設為 app 層固定資料，選取時把三欄寫入草稿（核心不接收 preset 欄位）。偏移是該地的標準時間，僅供起點；夏令時間請使用者自行改偏移（見 FAQ）。

| 預設 | 緯度 | 經度 | UTC 偏移 |
| --- | --- | --- | --- |
| 台北 / Taipei | 25.0330 | 121.5654 | +08:00 |
| 台中 / Taichung | 24.1477 | 120.6736 | +08:00 |
| 高雄 / Kaohsiung | 22.6273 | 120.3014 | +08:00 |
| 東京 / Tokyo | 35.6762 | 139.6503 | +09:00 |
| 雪梨 / Sydney | -33.8688 | 151.2093 | +10:00 |
| 倫敦 / London | 51.5074 | -0.1278 | +00:00 |
| 紐約 / New York | 40.7128 | -74.0060 | -05:00 |
| 雷克雅維克 / Reykjavík | 64.1466 | -21.9426 | +00:00 |

驗證順序固定：先 SCHEMA，再依 date、latitude、longitude、utcOffset 逐欄；每欄先容量 INPUT_LIMIT、再不成對 surrogate UNICODE、再缺內容 EMPTY、再文法（DATE_FORMAT／DECIMAL_FORMAT／OFFSET_FORMAT）、最後 RANGE。只回第一個錯誤。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆為 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算步驟（全部 IEEE-754 雙精度，中間不捨入；常數與步驟即 NOAA 公布式）：

1. 由 date 算當年日序 doy（1–366，格里曆閏年規則）。
2. γ = (2π/365) × (doy − 1)。固定在當地正午取值：NOAA 工作表的 γ 本含 (hour−12)/24 項，本工具只有日期輸入，固定 hour=12，該項為 0；同一 γ 用於均時差、赤緯與日出日落。分母恆為 365，閏年亦然（依公布式）。
3. 均時差 eqtime（分鐘）= 229.18 × (0.000075 + 0.001868·cosγ − 0.032077·sinγ − 0.014615·cos2γ − 0.040849·sin2γ)。
4. 赤緯 decl（徑度）= 0.006918 − 0.399912·cosγ + 0.070257·sinγ − 0.006758·cos2γ + 0.000907·sin2γ − 0.002697·cos3γ + 0.00148·sin3γ。
5. φ = 緯度徑度。cosHa = cos(90.833°) / (cosφ × cos decl) − tanφ × tan decl。天頂角常數固定 90.833°（已含大氣折射與太陽視半徑，依 NOAA）。
6. cosHa > 1 → 狀態 POLAR_NIGHT；cosHa < −1 → 狀態 POLAR_DAY。此二狀態下 sunrise、solarNoon、sunset、三個 dayOffset、dayLengthMinutes、dayLength 皆為 null，只回 status 與 utcOffsetMinutes。
7. 否則 haDeg = arccos(cosHa) 換為度（0–180）。UTC 分鐘：sunrise = 720 − 4 × (longitude + haDeg) − eqtime；solarNoon = 720 − 4 × longitude − eqtime；sunset = 720 − 4 × (longitude − haDeg) − eqtime。經度東正西負。
8. 當地未捨入分鐘 = UTC 分鐘 + utcOffset 分鐘。每個時刻：rounded = floor(raw + 0.5)；dayOffset = floor(rounded / 1440)（數學 floor，恆為 −1、0、1 之一）；顯示分鐘 = rounded − 1440 × dayOffset（0–1439），格式 HH:MM 兩位補零。
9. dayLengthMinutes = floor((sunset 當地未捨入分鐘 − sunrise 當地未捨入分鐘) + 0.5)，即由未捨入值算，不由已顯示時刻相減。dayLength 字串為「H:MM」：小時不補零、分鐘兩位。

結果物件固定欄位：`{status, sunrise, sunriseDayOffset, solarNoon, solarNoonDayOffset, sunset, sunsetDayOffset, dayLengthMinutes, dayLength, utcOffsetMinutes}`。status 為 `NORMAL`、`POLAR_DAY`、`POLAR_NIGHT` 之一。機器值不隨 locale 改；dayOffset 是相對於輸入 date 的日曆日位移，UI 據此標示前一日／次一日。

固定下載 `sunrise-sunset-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/sunrise-sunset-calculator/`。src/core.mjs 放純驗證、推導、格式化（含上列 NOAA 步驟、預設城市表以外的全部判定）。城市預設表是 app 層固定資料，同樣寫死於原始碼常數，不得由使用者輸入或遠端取得。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算日出日落」，畫面和完整報告符合核心 fixtures（含極晝／極夜與跨日案例），使用者取得對應產物。 |
| boundaries | 合法端點（緯度 ±89.9、經度 ±180、偏移 −12:00／+14:00、日期 1900／2100 年界）、剛好越界、第一個錯誤和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。11 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected；fixtures 的時刻值由本文作者依 NOAA 公布式以兩份獨立 scratch 實作推導（見 AUTHOR-CHECK.md）。

| 案例 ID | 驗證行為 |
| --- | --- |
| `taipei-summer-solstice` | 台北夏至：日出 05:04、日落 18:46、日長 13:42 |
| `taipei-autumn-day` | 台北 2026-11-09：日出 06:06、日落 17:09 |
| `equator-greenwich-equinox` | 赤道與格林威治春分：日長 12:07（天頂角使日長略大於 12 小時） |
| `polar-night-tromso` | 特羅姆瑟冬至：cosHa > 1，POLAR_NIGHT，時刻皆 null |
| `polar-day-tromso` | 特羅姆瑟夏至：cosHa < −1，POLAR_DAY，時刻皆 null |
| `sydney-summer-solstice` | 南半球夏至、使用者自選 +11:00 偏移：日落 20:05 |
| `reykjavik-offset-wrap` | +14:00 偏移使正午與日落位移至次一日（dayOffset 1） |
| `empty-date` | 日期空白，EMPTY |
| `invalid-calendar-date` | 2026-02-30 不存在，DATE_FORMAT |
| `latitude-out-of-range` | 緯度 89.95 文法合法但超出 ±89.9，RANGE |
| `offset-not-quarter-hour` | 偏移 +08:10 非 15 分鐘步階，OFFSET_FORMAT |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限與剛好超限：緯度 `89.9`／`-89.9` 合法、`89.91` RANGE、`90` RANGE；經度 `180`／`-180` 合法、`180.0001` RANGE；偏移 `+14:00`／`-12:00` 合法、`+14:15` RANGE、`-12:45` RANGE、`+8:00` OFFSET_FORMAT；日期 `1900-01-01`／`2100-12-31` 合法、`1899-12-31` RANGE、`2026-13-01` DATE_FORMAT、閏年 `2028-02-29` 合法而 `2026-02-29` DATE_FORMAT。另測錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。性質檢查：NORMAL 時未捨入 sunrise ≤ solarNoon ≤ sunset；dayLengthMinutes 與 8 × haDeg 的差在捨入容差內；緯度取負、日期取對稱日（相隔半年）時極晝與極夜互換。

候選 gate（均 NOT_RUN）

- 於 `tools/sunrise-sunset-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「日出日落時間計算」，title「日出日落時間計算｜Gloss Tools」，description「輸入日期與地點的緯度、經度、UTC 偏移，以 NOAA 近似公式計算日出、太陽正午、日落與日長，並辨識極晝與極夜。」。英文 lang=en，H1 “Sunrise & Sunset Calculator”，title “Sunrise & Sunset Calculator | Gloss Tools”，description “Compute sunrise, solar noon, sunset and day length for a date, latitude, longitude and UTC offset with the NOAA approximation, including polar day and polar night detection.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- 精度說明（結果區常駐）。本工具採 NOAA 近似公式，結果可能與實際觀測或官方曆象相差數分鐘。無時區資料庫、不處理日光節約時間；偏移請依當地當日實際時制自行確認。 / This tool uses the NOAA approximation; results may differ from observed or official times by a few minutes. There is no time-zone database and no daylight-saving handling; confirm the offset in force for your place and date.
- 極晝。極晝：這一天太陽整日不落下。 / Polar day: the sun does not set on this date.
- 極夜。極夜：這一天太陽整日不升起。 / Polar night: the sun does not rise on this date.
- FAQ。為什麼和氣象局公布的時間差一兩分鐘？本工具是 NOAA 近似公式，γ 只以當地正午取值，且只用固定偏移，不含當地時區規則與更精確的曆算，差數分鐘屬預期。 / Why is this a minute or two off the official time? This tool uses the NOAA approximation with γ evaluated at local noon and a single fixed offset; official almanacs use more precise ephemerides and local time-zone rules, so a difference of a few minutes is expected.
- FAQ。為什麼沒有日光節約時間選項？偏移是固定輸入；夏令時間請自行把偏移加一小時，例如雪梨夏季改填 +11:00。 / Why is there no daylight-saving option? The offset is a fixed input; for daylight-saving time add an hour yourself, e.g. use +11:00 for Sydney in summer.
- FAQ。什麼是太陽正午？太陽通過當地子午線的時刻，在固定偏移下通常不是 12:00。 / What is solar noon? The moment the sun crosses the local meridian; under a fixed offset it is usually not 12:00.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://sunrise-sunset-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。規格任務 id `labs-sunrise-sunset-calculator-spec-20261109`（由主代理登記，本文作者不執行登記）。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/sunrise-sunset-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

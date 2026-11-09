# 驗收規格：核心 oracle 與瀏覽器案例

> 狀態：M0 預期值，尚未執行。每項狀態目前均為 NOT_RUN；此文件不代表產品、瀏覽器或裝置已通過驗收。

## 範圍與記錄方式

核心測試針對 TECHNICAL.md 所列純函式，以 Node.js 24 內建 node:test 離線執行。測試預期值必須由此文件固定，不可呼叫被測函式生成 expected。每個無效 validateDraft 輸出必須精確等於 E(code, field, rowId)，物件不可有其他鍵：

    E(code, field, rowId) = { code, field, rowId }

欄位路徑原樣使用 startTimeRaw、targetTimeRaw、targetNextDay、rows、rows[].id、rows[].nameRaw、rows[].durationMinutesRaw、rows[].noteRaw；未知欄位使用 field=null。對尚未安全驗證的 ID 使用 rowId=null。

測試簡寫只用於本文件，展開後仍是精確 schema：
- D(start, target, next, rows) = 普通物件 { startTimeRaw:start, targetTimeRaw:target, targetNextDay:next, rows:rows }，恰有這四個 own enumerable data properties。
- R(id, name, duration, note) = 普通物件 { id:id, nameRaw:name, durationMinutesRaw:duration, noteRaw:note }，恰有這四個 own enumerable data properties。
- validRows(n) = 長度 n 的 dense array；第 i 列為 R("r"+i,"A","1","")，i 從 1 開始。
- x.repeat(n) 表示含 n 個 UTF-16 code unit 的 ASCII x 字串；emoji.repeat(n) 表示含 n 個合法 emoji surrogate pair 的字串，UTF-16 長度為 2n。
- 除非案例另有說明，所有 D 都用 start="09:00"、target=""、next=false、rows=[R("r1","A","1","")]。

任何修正都需重跑受影響的核心案例和必要最終 gates；不可把 mock、靜態掃描、期望文字或模擬器說成真機／原生瀏覽器驗收。沒有可用能力的案例記 NOT_RUN，說明限制和影響，不可省略或冒稱通過。

## 核心精確案例

### 時間與分鐘解析

| ID | 純函式與輸入 | 精確預期 |
|---|---|---|
| C01 | parseClock("00:00") | { ok:true, minuteOfDay:0 } |
| C02 | parseClock("23:59") | { ok:true, minuteOfDay:1439 } |
| C03 | parseClock("09:00") | { ok:true, minuteOfDay:540 } |
| C04 | parseClock("9:00") | { ok:false, code:"TIME_FORMAT" } |
| C05 | parseClock("24:00") | { ok:false, code:"TIME_FORMAT" } |
| C06 | parseClock("０９:００") | { ok:false, code:"TIME_FORMAT" } |
| C07 | parseClock("09：00") | { ok:false, code:"TIME_FORMAT" } |
| C08 | parseClock("09:00 ") | { ok:false, code:"TIME_FORMAT" } |
| C09 | parseDuration("0005") | { ok:true, minutes:5 } |
| C10 | parseDuration("720") | { ok:true, minutes:720 } |
| C11 | parseDuration("") | { ok:false, code:"DURATION_FORMAT" } |
| C12 | parseDuration("+5") | { ok:false, code:"DURATION_FORMAT" } |
| C13 | parseDuration("3.5") | { ok:false, code:"DURATION_FORMAT" } |
| C14 | parseDuration("５") | { ok:false, code:"DURATION_FORMAT" } |
| C15 | parseDuration("0") | { ok:false, code:"DURATION_RANGE" } |
| C16 | parseDuration("721") | { ok:false, code:"DURATION_RANGE" } |

### Draft 驗證與時間計算

| ID | 輸入 | 精確預期 |
|---|---|---|
| C17 | createInitialDraft() | 精確為 D("","",false,[R("row-1","","","")])；各列 key 和 root key 不多不少。 |
| C18 | D("09:00","10:00",false,[R("r1"," 開場 ","10",""),R("r2","討論","35",""),R("r3","休息","10","")]) | validateDraft 成功；startMinuteOfDay=540，target={minuteOfDay:600,dayOffset:0,absoluteMinute:600}，三個 name 分別為「開場」「討論」「休息」，durationMinutes 為 10、35、10，note 均為空，totalMinutes=55。 |
| C19 | 將 C18 成功值送入 calculateSchedule | 精確 rows：r1 start/end absolute 540/550、minuteOfDay 540/550、dayOffset 0/0；r2 550/585、minuteOfDay 550/585、dayOffset 0/0；r3 585/595、minuteOfDay 585/595、dayOffset 0/0。totalMinutes=55、endAbsoluteMinute=595、endMinuteOfDay=595、endDayOffset=0；targetComparison={targetAbsoluteMinute:600,targetMinuteOfDay:600,targetDayOffset:0,differenceMinutes:5,relation:"early"}。 |
| C20 | D("23:40","",false,[R("r1","A","30",""),R("r2","B","20","")]) | 成功；totalMinutes=50，rows absolute 為 1420→1450、1450→1470；第一列結束為 minuteOfDay=10/dayOffset=1，第二列開始為 10/1、結束為 30/1；schedule endAbsoluteMinute=1470、endMinuteOfDay=30、endDayOffset=1，targetComparison=null。 |
| C21 | D("00:00","",false,[R("r1","A","720",""),R("r2","B","720","")]) | 成功；totalMinutes=1440，endAbsoluteMinute=1440、endMinuteOfDay=0、endDayOffset=1；結束顯示 00:00（次日）。 |
| C22 | D("00:00","",false,[R("r1","A","720",""),R("r2","B","720",""),R("r3","C","1","")]) | E("TOTAL_DURATION_EXCEEDED",null,null)。 |
| C23 | D("09:00","",false,[R("r1","A","1","")]) | 成功且 target=null、targetComparison=null；不得顯示提早或超時。 |
| C24 | D("09:00","09:00",false,[R("r1","A","1","")]) | E("TARGET_NOT_AFTER_START","targetTimeRaw",null)。 |
| C25 | D("09:00","08:59",false,[R("r1","A","1","")]) | E("TARGET_NOT_AFTER_START","targetTimeRaw",null)。 |
| C26 | D("09:00","",true,[R("r1","A","1","")]) | E("TARGET_NEXT_DAY_WITHOUT_TARGET","targetNextDay",null)。 |
| C27 | D("09:00","09:00",true,[R("r1","A","1","")]) | 成功；target={minuteOfDay:540,dayOffset:1,absoluteMinute:1980}；同一 clock 次日合法。 |
| C28 | D("09:00","10:00",false,[]) | E("ROW_COUNT","rows",null)。 |
| C29 | D("09:00","",false,validRows(61)) | E("ROW_COUNT","rows",null)。 |
| C30 | D("9:00","24:00",false,[R("r1","","0","")]) | E("TIME_FORMAT","startTimeRaw",null)。同時存在多個錯誤時先回開始時間格式錯誤。 |
| C31 | D("09:00","24:00",false,[R("r1","A","0","")]) | E("TIME_FORMAT","targetTimeRaw",null)。目標格式錯誤先於列內容錯誤。 |
| C32 | D("09:00","",false,[R("r1","A","x",""),R("r2","","1","")]) | E("DURATION_FORMAT","rows[].durationMinutesRaw","r1")。依列索引先完成第一列欄位驗證。 |
| C33 | D("09:00","",false,[R("r1","A","0005","")]) | 成功，正規化時長為 5。 |
| C34 | D("09:00","",false,[R("r1","   ","1","")]) | E("NAME_REQUIRED","rows[].nameRaw","r1")。 |
| C35 | D("09:00","",false,[R("r1","x".repeat(80),"1","")]) | 成功；修剪後名稱 UTF-16 長度為 80。 |
| C36 | D("09:00","",false,[R("r1","x".repeat(81),"1","")]) | E("NAME_TOO_LONG","rows[].nameRaw","r1")。 |
| C37 | D("09:00","",false,[R("r1","x".repeat(257),"1","")]) | E("RAW_TEXT_TOO_LONG","rows[].nameRaw","r1")。raw limit 優先於 trimmed limit。 |
| C38 | D("09:00","",false,[R("r1","A","1","x".repeat(160))]) | 成功；修剪後 note UTF-16 長度為 160。 |
| C39 | D("09:00","",false,[R("r1","A","1","x".repeat(161))]) | E("NOTE_TOO_LONG","rows[].noteRaw","r1")。 |
| C40 | D("09:00","",false,[R("r1","A","1","x".repeat(257))]) | E("RAW_TEXT_TOO_LONG","rows[].noteRaw","r1")。 |
| C41 | D("09:00","",false,[R("r1","A","1","x\n")]) | E("CONTROL_CHARACTER","rows[].noteRaw","r1")。LF 不得進入報告。 |
| C42 | D("09:00","",false,[R("r1","A","1","x\u0085")]) | E("CONTROL_CHARACTER","rows[].noteRaw","r1")。U+0085 屬 Unicode Cc。 |
| C43 | D("09:00","",false,[R("r1","A","1","\uD800")]) | E("UNPAIRED_SURROGATE","rows[].noteRaw","r1")。 |
| C44 | D("09:00","",false,[R("r1","A","1","\uDC00")]) | E("UNPAIRED_SURROGATE","rows[].noteRaw","r1")。 |
| C45 | D("09:00","",false,[R("r1","A","1","😀")]) | 成功；合法 surrogate pair 可留在修剪後 note。 |
| C46 | D("09:00","",false,[R("r1","😀".repeat(40),"1","")]) | 成功；名稱長度精確為 80 UTF-16 code units。 |
| C47 | D("09:00","",false,[R("r1","😀".repeat(41),"1","")]) | E("NAME_TOO_LONG","rows[].nameRaw","r1")；名稱長度是 82 UTF-16 code units。 |

### Exact schema、安全與非突變

| ID | 輸入建構方式 | 精確預期 |
|---|---|---|
| C48 | 只在 root 多加 own enumerable data 欄位 debug=true | E("UNKNOWN_FIELD",null,null)。不得把未知 key 名稱帶入 error。 |
| C49 | 從 default D 刪除 targetNextDay own property | E("MISSING_FIELD","targetNextDay",null)。 |
| C50 | root 的 targetNextDay 由 own enumerable getter 提供；getter 只把外部 counter 加一 | E("INVALID_SCHEMA","targetNextDay",null)，counter 精確仍為 0。 |
| C51 | root 加一個 symbol own key | E("INVALID_SCHEMA",null,null)。 |
| C52 | root 的 startTimeRaw 改成 non-enumerable data property | E("INVALID_SCHEMA","startTimeRaw",null)。 |
| C53 | rows 是長度 1、索引 0 缺口的 sparse array | E("INVALID_SCHEMA","rows",null)。 |
| C54 | 第一列只多一個 own enumerable data 欄位 extra=true | E("UNKNOWN_FIELD",null,null)。row schema 尚未通過，ID 尚未驗證。 |
| C55 | 第一列 nameRaw 是 own enumerable getter，getter 有外部 counter | E("INVALID_SCHEMA","rows[].nameRaw",null)，counter 精確仍為 0。row ID 尚未驗證。 |
| C56 | 第一列 id="r/1" | E("INVALID_ROW_ID","rows[].id",null)。錯誤不得 echo 不合法 ID。 |
| C57 | 兩列都使用有效 id "r1" | E("DUPLICATE_ROW_ID","rows[].id","r1")。 |
| C58 | targetNextDay="false" | E("INVALID_FIELD_TYPE","targetNextDay",null)。 |
| C59 | durationMinutesRaw 數值 5 而非 string | E("INVALID_FIELD_TYPE","rows[].durationMinutesRaw",null)。row ID 尚未驗證。 |
| C60 | Object.create(null) 建立 root 和 row，並加入完全符合 schema 的資料 descriptors | 驗證成功；普通 null-prototype record 合法。 |
| C61 | 用 Object.freeze 凍結有效 root、rows、row 後呼叫 validateDraft | 驗證成功且所有輸入值、key、descriptor、rows 順序均不變；驗證不得 mutate 或 spread/重寫輸入。 |
| C62 | 初始 D("09:00","10:00",false,[R("r1","A","0","")])；再把 durationMinutesRaw 從 "0" 修正成 "60" | 初始驗證精確為 E("DURATION_RANGE","rows[].durationMinutesRaw","r1")；修正後成功，totalMinutes=60、endAbsoluteMinute=600、differenceMinutes=0、relation="on-time"。 |

### 純文字報告與下載 bytes

下列報告案例的 schedule 由 C18/C19 固定資料產生；呼叫 formatPlainTextReport 時 locale 分別傳 zh-Hant 和 en。每一列以 LF 分隔，不含末尾 LF，不含內部 row ID：

C63 繁中報告精確字串：

~~~text
GlossQuote 活動時間表
開始	09:00
01	09:00–09:10	開場	10 分鐘
02	09:10–09:45	討論	35 分鐘
03	09:45–09:55	休息	10 分鐘
總長	55 分鐘
結束	09:55
目標	10:00（當日）
差異	提早 5 分鐘
~~~

C64 使用另一個輸入 fixture：D("09:00","10:00",false,[R("r1","Opening","10",""),R("r2","Discussion","35",""),R("r3","Break","10","")])。以此英文名稱 fixture 產生 schedule，英文報告精確字串：

~~~text
GlossQuote Event Timeline
Start	09:00
01	09:00–09:10	Opening	10 min
02	09:10–09:45	Discussion	35 min
03	09:45–09:55	Break	10 min
Total	55 min
End	09:55
Target	10:00 (same day)
Difference	5 min early
~~~

C65 對 C63 的字串呼叫 encodeUtf8Report：bytes 精確等於 UTF-8 編碼後的 C63 字元序列；開頭不是 EF BB BF，最後一個 byte 不是 0A，byte length 等於該 UTF-8 字串長度。函式不可自行增加 CR、LF、BOM 或 metadata。

C66 Midnight report：輸入 D("23:40","",false,[R("r1","Talk","30",""),R("r2","Wrap","20","")])。繁中精確報告：

~~~text
GlossQuote 活動時間表
開始	23:40
01	23:40–00:10（次日）	Talk	30 分鐘
02	00:10（次日）–00:30（次日）	Wrap	20 分鐘
總長	50 分鐘
結束	00:30（次日）
~~~

英文精確報告：

~~~text
GlossQuote Event Timeline
Start	23:40
01	23:40–00:10 (next day)	Talk	30 min
02	00:10 (next day)–00:30 (next day)	Wrap	20 min
Total	50 min
End	00:30 (next day)
~~~

兩份字串都沒有目標行、日期、24:30 或末尾 LF。

## 瀏覽器驗收案例

以下均需分別記錄狀態、瀏覽器/版本、輸入法或裝置（適用時）、實際觀察和問題。Native API 只能在明確使用者手勢下實測。可用 test-only stub 驗證競態邏輯，但 stub 結果不得冒稱原生 Clipboard、下載、真機或完整 Network 測試。

| ID | 操作與可觀察通過條件 |
|---|---|
| B01 | 開啟 127.0.0.1:4205/index.html：繁中完整載入、lang=zh-Hant、主表單與 FAQ 可見；英文切換連結導向 /en/index.html。M1 頁面有 noindex，不含 production canonical/hreflang/JSON-LD。 |
| B02 | 開啟 /en/index.html：lang=en，所有操作、錯誤、報告、FAQ、回首頁連結均為英文；語言切換導回 /index.html。 |
| B03 | 按 Acceptance 範例輸入 09:00、開場 10、討論 35、休息 10、目標 10:00；提交後每列起訖為 09:00–09:10、09:10–09:45、09:45–09:55，合計 55、結束 09:55、提早 5 分鐘。兩種語言各做一次。 |
| B04 | 23:40 加 30 和 20 分鐘；輸出 00:10、00:30，所有跨日後時刻清楚顯示「次日」或 “next day”，合計 50。 |
| B05 | 同日目標等於或早於開始時拒絕提交並對欄位顯示精確修正提示；勾次日後同 clock 目標可提交。 |
| B06 | 目標空白時次日 checkbox disabled 且為 false；先選次日再清空目標時 UI 自動取消 checkbox。對不可信程式輸入 targetNextDay=true、targetTimeRaw="" 的 core error 仍為 TARGET_NEXT_DAY_WITHOUT_TARGET。 |
| B07 | 有效提交後修改任一欄、增列、刪列或重排；舊結果、成功提示與報告立即消失，複製／下載同一同步事件後 disabled。 |
| B08 | 只用鍵盤新增、移除、上移、下移；順序和時間一致，焦點留在操作後同一活動列，位置 aria-live 只公告一次；首列/末列/最後一列邊界 disabled。 |
| B09 | 建立 60 列時新增 disabled 且可理解原因；刪除回到 59 後恢復。最後一列不能移除；列數不造成水平溢位。 |
| B10 | 點「清除全部」且已有值或結果時選 Cancel，欄位、列序、結果、報告和語言狀態完全保留；再選 OK，回到一列空白初始狀態。空白初始時不彈確認。 |
| B11 | 有草稿時切換語言選 Cancel，仍在原頁且資料保留；再確認，另一頁完全空白。確認文字先明示離頁會清除，不得宣稱自動保存或切換保留。 |
| B12 | 用中文 IME 組字時不對中間拼字產生逐字錯誤；compositionend 前按 Build 被阻止並出現固定提示；完成組字後可依實際內容正常驗證。 |
| B13 | 完整鍵盤路徑可填時間、名稱、時長、備註、排序、新增、清除、Build、讀取結果、選取 report、複製和下載；所有焦點可見，無鍵盤陷阱。 |
| B14 | 螢幕閱讀器檢查所有 label、排序按鈕的列名與方向、欄位錯誤關聯、disabled 原因、成功狀態及結果順序；不得依賴顏色或 icon 單獨傳意。無真實 assistive technology 時標 NOT_RUN。 |
| B15 | 320 CSS px viewport 下檢查繁中和英文、60 列、錯誤、報告：document scrollWidth 不大於 viewport clientWidth，所有功能可垂直到達，沒有水平頁面捲動或裁切。 |
| B16 | 200% 瀏覽器縮放下完成一個行程並鍵盤移動；主要動作、焦點、錯誤和結果仍可看到並操作，不出現雙向捲動。 |
| B17 | 對兩語文案容器套用至少 40% 字元增長測試內容；label、錯誤、按鈕、次日標記和報告自然換行，不覆蓋、不裁切。此項是佈局壓力測試，不改正式文案。 |
| B18 | 真實手機檢查安全區、虛擬鍵盤遮擋、滾動、44×44 CSS px 控制、IME composition 和 320px 窄寬；只有模擬器時分開記錄，不宣稱真機通過。 |
| B19 | 明確點「複製報告」測試原生 Clipboard API：成功時剪貼簿內容精確等於目前報告並顯示成功；拒絕或不支援時保留可選取 report 並顯示 fallback。不得讀取原有剪貼簿。API/權限不可用時原生成功案例記 NOT_RUN，另記 fallback 實測。 |
| B20 | 用 test-only delayed promise 先發 request A，編輯並成功建立新結果，再發 request B；分別令 A resolve、reject、finally 在 B pending 期間到達。每個舊 callback 都不得更動任何 state/DOM、notice、result、focus 或 B pending。再 pagehide 後完成 callback，仍完全 no-op。此案驗證競態邏輯，不作原生 Clipboard 成功證明。 |
| B21 | 真實點下載繁中和英文報告：檔名精確為 glossquote-event-timeline.txt；bytes 為該語言精確 report 的 UTF-8、無 BOM、無末尾 LF、無額外資料；不得自動下載或在提交時複製。若 browser 下載能力不能檢視 bytes，記明檢查途徑和缺項，不猜測通過。 |
| B22 | 用 test-only controllable timers/Object URL instrumentation 建立 8 個有效下載 URL；第 9 次下載暫停並公告等待。新結果、重複下載及確認清除都不得立即 revoke 尚未到期舊 URL；每一筆在建立後 60 秒到期撤銷，最早到期後下載恢復。此 harness 不算真實檔案下載通過。 |
| B23 | 在有 URL timers 時觸發 pagehide：立即清空輸入與結果、disable copy/download、取消 timers 並 revoke 所有 URL；晚到 Clipboard callback 不改 state。pageshow.persisted=true 後是一列空白初始頁。實際 BFCache 不可用時記 NOT_RUN，另報 pagehide 測試。 |
| B24 | 把名稱或備註填成類似 HTML 的文字（例如 <img src=x onerror=alert(1)>），提交後只當文字呈現，沒有新增 element、執行 handler 或破版；本例不得放入含控制字元的字串。 |
| B25 | 頁面完全載入後在 DevTools 設 offline，互動、排序、計算、文字報告仍可用；重新載入或首次離線載入可失敗，因不提供 Service Worker。互動不得發 request。 |
| B26 | 分別驗證完整 Network 與 Storage 面板：只出現本機必要靜態資產；計算/編輯不產生 fetch/XHR/beacon/WebSocket/EventSource；沒有 storage/cookie/indexedDB/cache、history state 或輸入 query/hash。若工具不可用記 NOT_RUN。 |
| B27 | 隨機不存在路徑取得真正 404 和安全文字導覽，不能回成功 app、HTTP 200 或 SPA fallback。M1 preview 404 必須 noindex；未能取得 HTTP status 時記 NOT_RUN。 |
| B28 | prefers-reduced-motion 開啟時沒有非必要動作動畫；在 Paper、Surface、Acid、Ink 與錯誤狀態逐一檢查文字/控制對比、focus ring 和不靠顏色的狀態線索。記錄實際量測，不以色票推測通過。 |
| B29 | 在可代表低階效能的真實裝置逐步輸入和操作 60 列，記 device/browser、操作延遲與是否能完成；只用桌機或模擬 CPU throttling 時標記為 emulated，不宣稱低階真機已驗。無真設備記 NOT_RUN。 |
| B30 | 連續編輯、提交、清除、語言切換和 pagehide/pageshow 多輪；不殘留舊 result、report、成功通知、輸入欄位或可再次下載的舊 URL。 |

## M1/M2/M3 門檻與可宣稱範圍

- M0：只有規格文件。核心和瀏覽器案例全部 NOT_RUN；不可寫「已測」。
- M1 必要瀏覽器驗收：B01–B11、B13、B15、B24、B27。B20、B22、B23 的 controlled harness 邏輯必須測；真實 BFCache 能力另記，不可由 harness 冒稱。IME/鍵盤、清除取消與確認、語言切換、320 CSS px、文字呈現安全和真 404 都不能以 NOT_RUN 代替。
- M1：原功能對話在本機完成純函式、UI 和工具鏈；完成核心自動案例與以上必要的兩語瀏覽器案例。preview 位於 dist/、noindex,nofollow、不得有 production canonical/hreflang/JSON-LD/sitemap。200% zoom、低階真機、原生 API 權限、完整 Network/Storage 或真 BFCache 能力缺失時逐項記 NOT_RUN 及影響。
- M2：僅在主代理明確放行 M1 後，原功能對話產 production candidate 到 dist-production/，執行 canonical/hreflang、Open Graph、WebApplication JSON-LD/CSP hash、robots、sitemap、header、404 和 ZIP/public GitHub gates；它不部署。production local preview 綁 127.0.0.1:5205。
- M3：工具及首頁 live deploy、線上 headers/SEO/404/核心流程由主代理執行；本文件的本機案例不能代替線上測試。
- 外部 review 完成前標記 awaiting external review；只有外部確認或必要修正後重驗並取得確認才可標為該版本完成。

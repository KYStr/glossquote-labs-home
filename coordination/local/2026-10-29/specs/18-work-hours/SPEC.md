# 工時加總 — 既有規格保存

Task ID: `labs-18-work-hours` · Spec ID: `spec-18-work-hours`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 工時加總產品契約

SPEC_ONLY。本工具計算使用者輸入的鐘面分鐘，不推測工資、出勤規則、所在地時間變更或真實經過秒數。核心成功案例：同一天 09:00–12:00 與 13:00–17:30、休息均0，顯示 7小時30分及7.50小時。

## FR-01 輸入表

繁中 /index.html、英文 /en/index.html。初始1列、日期預設裝置本地今日（超出2000–2099則空白）、開始/結束空白、次日未勾、休息0。每列都有可見標籤：開始日期、開始時間、結束時間、結束在次日、休息分鐘。新增行日期沿用上一列合法日期，否則本地今日；其餘為預設。最多62列，至少1列；新增/刪除限制明示，不默默丟棄空列。

## FR-02 嚴格日期與時間

日期是ASCII `YYYY-MM-DD`，有效Gregorian日期，2000-01-01..2099-12-31。禁止自動把2月30日轉3月。時間為ASCII `HH:MM`，00:00..23:59，零補齊、無秒、無24:00/AM/PM。欄位以 type=text 與 inputmode 提示、相鄰格式示例，避免原生date工具不能精確填值或自動矯正；不使用 Date.parse/valueAsNumber 決定產品分鐘。

日期原稿最多32、時間最多16UTF16碼元，先上限再只trim U+0009/U+000A/U+000D/U+0020。不能truncate修正，前導零是規定格式的一部分。空白拒絕。次日只能布林值。

## FR-03 跨日與休息

未勾次日，end必須>start；相同或较早拒絕并提示若跨日請勾選。勾次日則gross=end+1440-start，須1..1440分鐘：22:00→02:00是240；09:00→09:00是1440；09:00→10:00次日1500拒絕。2099-12-31可結束於2100-01-01，但開始日仍限2099。

休息原稿最多16碼元，trim規則同上，digits+，0..1440整數、前導零合法；不接受空白、符號、逗點、科學記號或小數。休息<=gross；等於gross合法，net=0。只填休息總分钟，不紀錄休息落在時段的哪一段。

## FR-04 避免重複計入

驗證所有列再以絕對民用日序和分鐘檢查重疊，區間為[start,end)。任兩段有實際交集就拒絕整次計算，標示兩個原始列號。相接如09–12、12–13允許。跨日22–02與隔天01–03也拒絕。休息未指定起迄，不能用扣了休息當成區間不重疊。不同日沒有交集可接受。

## FR-05 結果

明確按『加總工時 / Calculate hours』才計算。任何無效列都保留原稿、清空舊輸出、聚焦第一個錯誤並提供可定位訊息。成功結果有：每列gross/rest/net分鐘及時分、依開始日期升冪的每日net、整批net總量。每列仍依輸入順序，不重排輸入。

每個跨日班次全部歸開始日期，不切到第二天，頁面常駐說明這個歸屬規則。主結果以總小時與分鐘（小時可以>24），另顯示兩位十進位小時；先加整數分鐘再轉小時half-up，不能先捨入各行再相加。0分鐘顯示0小時0分、0.00小時。60分顯示1小時0分、1.00小時。

## FR-06 範例與編輯

『載入範例』手動填兩列2026-10-01 09:00–12:00及13:00–17:30、rest0、nextDay false，明示假資料且需再按計算。任一輸入、勾選、新增、移除、範例操作立即作廢並清空結果/copy狀態，提示重新計算。清除回FR01；pagehide清空個人內容，pageshow回初始空時段，本地今日不是恢復使用者資料。

## FR-07 複製

成功才啟用複製完整純文字報告：欄位說明、每列日期/開始/結束/次日/休息/net、每日及總計、鐘面與開始日歸屬說明。顯示同一份可選取唯讀文字作fallback。呼叫clipboard.writeText只在直接點擊，支援失敗說明/手動選取，不讀clipboard、不自動下載、不execCommand。revision及copy request ID雙重核對，過期成功/失敗不回寫新畫面；clear/pagehide使等待失效。

## FR-08 隱私與界限

只有第一方静態載入；不儲存、上传、analytics、URL內容、帳號、通知、API或權限要求。工作資料只在此頁，清除不刪系統剪貼簿。普通鐘面時間計算沒有時區或夏令時間調整；不是出勤或法規/薪資認證。不推測休息、不提供自動加班規則。

## FR-09 操作與無障礙

主要工作表佔最大區域，新增列/計算/錯誤可直接找；鍵盤全流程、44px主要target、清楚focus、錯誤關聯欄位、aria-live節制。320px與真200%縮放可操作；表格可局部有標籤橫捲但整頁不得雙向溢出。兩語功能一致，同語首頁與互換語言。

## FR-10 上限與非目標

62列×最多1440分鐘，所有核心數字安全整數；同步有界運算，無Worker、假loading或取消按鈕。只保留copy非同步競態。不做匯入、CSV/TXT下載、儲存、行事曆整合、薪資、法規、時區、DST、重複排程或工時證明。新想法另排scope，不混入M1。


---

## 原文件 TECHNICAL.md

# 工時技術與介面

SPEC_ONLY。原生HTML/CSS/ESM、Node24、零dependencies。公開source自包含，不在runtime或test import兄弟專案。純核心 public/js/core/work-hours.mjs；DOM controller public/js/app.mjs；雙語copy可public/js/i18n.mjs；樣式public/styles/app.css；public/index.html與en/index.html；test/work-hours.test.mjs、ui-contract.test.mjs、tooling.test.mjs。scripts serve/check/build及自包含validation helper；package.json type=module/private=true/engines>=24。

## 固定API

- `parseDate(raw)` → `{text, ordinal}` 或拋 `ProductError(code)`。依序檢查字串type（DATE_FORMAT）、raw長度（DATE_LENGTH）、trim後空（DATE_REQUIRED）、固定ASCII語法（DATE_FORMAT）、年/月/日有效範圍（DATE_RANGE）。日期以2000-01-01為ordinal0，Gregorian有效年月日：leap=(y%4===0 && (y%100!==0 || y%400===0))，從2000累加已完全年及月天數再加day-1。無 Date.parse，ordinal只計民用日。
- `parseTime(raw)` → 0..1439。trim/maxlength後 `/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/`，hour*60+minute。
- `parseBreak(raw)` → 0..1440整數，先字串/長度/grammar，再數值與safeinteger；空值拒絕，不把NaN當0。
- `calculateHours(rows)` → `{ok:true, rows, days, totalMinutes, totalDecimalHours}` 或 `{ok:false,errors}`。input array1..62，各row exact keys `date,start,end,nextDay,breakMinutes`（四字串一布林），禁止unknown key/array/null。field error含原列index、field和固定code，重疊error含rowIndexes；不回rawstack。若schema破損不能繼續猜預設。函式不mutate input。
- 每列output有sourceIndex/date/start/end/nextDay/grossMinutes/breakMinutes/netMinutes、absoluteStart/End。days按日期排序，每項date/netMinutes；total先整數sum。公開UI只顯示工作資料，不把内部ordinal當產品功能。
- `formatDuration(minutes,locale)` → zh如`7 小時 30 分`，en如`7 h 30 min`。非負safeinteger；最多89280。
- `formatDecimalHours(minutes)` → 固定2小數純字串。`hundredths=Math.floor((minutes*100+30)/60)`，再整數商/餘數拼接；分鐘上限下乘積安全，不用toFixed與逐列捨入再加。
- `buildReport(result,locale)` → 全部行與days/total的LF純文字（最後一個LF），接收成功結果；locale只zh-Hant/en。

固定錯誤codes：ROWS_COUNT、ROW_SCHEMA、DATE_REQUIRED/DATE_LENGTH/DATE_FORMAT/DATE_RANGE、TIME_REQUIRED/TIME_LENGTH/TIME_FORMAT、BREAK_REQUIRED/BREAK_LENGTH/BREAK_FORMAT/BREAK_RANGE、END_ORDER、SPAN_LIMIT、BREAK_EXCEEDS_SPAN、ROW_OVERLAP、INVALID_RESULT。錯誤說明在雙語字典，不能顯示raw exception。所有必填、合法row的格式錯誤一次蒐集；日期/時段尚無效不做該row interval運算。格式錯誤存在則不做全表重疊或計算。

## 時段與重疊

absoluteStart = ordinal*1440 + start，absoluteEnd = ordinal*1440 + end + (nextDay?1440:0)。gross=endAbs-startAbs，驗1..1440；net=gross-break。先按start再end再sourceIndex做穩定的副本排序，使用目前最大的end及其owner index檢查：若 next.start < maxEnd 則產生重疊錯誤（至少第一對即可）；等於可。不能只比前一列end忽略包覆長區間。以所有gross範圍檢查，不用net製造不存在的休息間隙。每天按開始日期累積完整net；跨日未分攤。

固定expected：2026-10-01 09:00–12:00=180、13:00–17:30=270，total450=7.50；22:00–02:00次日rest30=210=3.50；3段互不重疊每1分鐘，total3=0.05，不能0.02×3=0.06。

## Controller與資料生命週期

state={draftRows,revision,result,errors,example,copyRequestId,copyStatus}，DOM textContent/value，無innerHTML/eval。單一invalidate先增加revision/copyID、丟result/errors/copy fallback，再套用新draft；不在使用者還在打字時強行校正或截斷。input/change/rows/example/clear/locale離頁都失效。只有calculate按鈕建立immutable快照與成功結果。同步62列無Worker、取消不適用。

copy捕捉目前result/report/revision及新的requestID，呼叫writeText；結果只有仍同revision且同ID才寫status/fallback。可disablecopy忙碌直至結果，但revision保護仍要。API缺失或reject保留可選報告。pagehide clear引用及draft（可把date設空）；pageshow初始化一空時段/今日/0break，BFCache不復活資料。無storage、history、URL含資料、print或下載。只有初始載入time依裝置取today供預設，核心不讀時鐘。

## 工具鏈與驗證

M1建立 `npm test=node --test`、`npm run check=node scripts/check.mjs`、`npm run build=node scripts/build.mjs`、`npm run dev=node scripts/serve.mjs`。server只127.0.0.1:4198/public、GET/HEAD/MIME/真404，佔用可port0 fallback記錄，不殺他人。check語法/locale/static local refs/安全API/allowlist；build先驗再寫本工具dist，遇stale未知檔/links拒絕、不刪其他root。祖先junction、hardlink外部sentinel、HTMLquote/case/comments規避等遵循ENGINEERING且有真負例；source不含out/log/private資料。

M2才正式release scripts，沿docs/RELEASE。Node純函式/協定測試與真browser操作證據分層。reference：本工具產品規則是明示的民用鐘面分鐘，非特定地區法規，不為說明一般加總引入法律/金融判斷。HTML文字欄value以原字串验证；[WHATWG text input](https://html.spec.whatwg.org/multipage/input.html#text-(type=text)-state-and-search-state-(type=search))僅為API參考，不取得執行權限。


---

## 原文件 UX-SEO.md

# 工時加總介面與SEO

SPEC_ONLY，Product App / Operate。人正在把零散出勤時段整理成可抄用總時数；主要物件是時段工作表及總計。沿docs/DESIGN-SYSTEM，暖紙/墨字/少量acid主按鈕，系統字型，無SaaS hero。頻繁欄位全部可見，跨日checkbox貼結束時間，休息明確寫分鐘；進階規則只放說明，不藏必需流程。

桌面：
```text
GlossQuote / 工時加總                          English
填入時段，算出總工時。 [載入範例]
日期         開始    結束    次日    休息(分)   移除
[YYYY-MM-DD] [HH:MM] [HH:MM] [ ]      [0]       [...]
[新增時段]                 [清除] [加總工時]
總共 7 小時 30 分（7.50 小時）           [複製報告]
每日小計 / 每段明細 / 可選文字報告
跨日歸開始日；鐘面時間，未做夏令時間調整
用法、隱私、FAQ
```
手機：
```text
工時加總        English
時段1：日期
開始     結束 [次日]
休息分鐘      移除
[新增] [計算]
總時分 / 每日小計
每段明細（必要時區域捲動）
[複製] 可選文字
```

空態「填入開始與結束時間，再加總。」；更改「資料已變更，請重新加總。」；格式「使用 HH:MM，例如09:30。」；順序「結束時間較早；若跨日，勾選『次日』。」；重疊「時段1與時段2重疊，請修正，避免重複計入。」；copy拒絕「無法直接複製，請選取下方文字。」不rawstack、不把部分結果當完整。English equivalents必須完整：Enter start and end times / Recalculate after changes / Use HH:MM / Select next day for overnight work / These entries overlap / Select the report to copy manually。

日期/開始/結束/休息皆明確label，空白不default0；錯誤aria-describedby，提交後focus第一錯誤；刪除後focus相鄰列可用控制。結果一次polite通知總計，不每鍵吵讀屏。普通文字4.5:1，控件3:1，44px主要target，320px與200%實測；無謎樣圖示，reduced-motion無裝飾動畫。

## 雙語內容

中文title：工時加總：扣除休息、跨日與每日小計 | GlossQuote
中文description：填入工作日期、開始與結束時間及休息分鐘，在瀏覽器本機加總每段、每天與整批工時。支援跨日並提醒重疊時段，無需帳號。
中文H1：工時加總。說明：不用把分鐘換成小數；填入各段時間、扣除休息，就能取得時分與十進位小時計。

English title: Work Hours Calculator: Breaks & Overnight Shifts | GlossQuote
Description: Add work intervals and deduct breaks locally in your browser. See entry, daily and total hours, handle overnight shifts and catch overlapping entries without an account.
H1: Work Hours Calculator. Intro: Enter your work intervals and breaks. Get hours and minutes plus decimal hours without converting each entry yourself.

兩語至少四個可見FAQ：
1. 如何計算跨日？勾次日，單段最多24小時，全部歸開始日。/ Select next day; a single interval is at most 24 hours and belongs to its start date.
2. 為何重疊不給總計？避免同一分鐘算兩次；休息未含起迄不能用來移除重疊。/ Overlaps are rejected to avoid counting time twice; break totals do not specify a break interval.
3. 7.50代表7小時50分嗎？不是，是7小時30分；時分另列。/ No. 7.50 decimal hours equals 7 hours 30 minutes.
4. 工資或夏令時間有算嗎？沒有；只算輸入的鐘面時間，不決定薪資/法律出勤。/ It totals entered clock times, without pay rules, time-zone or daylight-saving adjustments.
5. 資料有保存嗎？只在頁面記憶體，離頁清空，copy由使用者發起。/ Entries stay in this page; leaving clears them, and copying requires your action.

## 發布SEO

預覽兩頁noindex,nofollow、robots Disallow:/；M2 production固定 https://hours.glossquote.com/index.html 與 /en/index.html，self canonical + zh-Hant/en/x-default互返（default中文），lang/og/兩語首頁一致。visibleFAQ不承諾搜尋rich result；可見WebApplication JSON-LD、applicationCategory=UtilitiesApplication、operatingSystem=Web，不偽造評分。robots/sitemap/404/CSP與實際HTTP由docs/RELEASE約束。首頁draft直到主驗正式發布確認後改published，不能將候選當可用網站。


---

## 原文件 ACCEPTANCE.md

# 工時加總驗收

SPEC_ONLY，以下全部產品NOT_RUN。A=Node核心/工具鏈、B=真瀏覽器，不互相替代。測試只假資料。所有時間未註明均2026-10-01，同日、rest0。

|ID|需求|層|輸入或動作|精確預期|
|---|---|---|---|---|
|W01|FR01,05|A+B|09:00–12:00；13:00–17:30|180+270=450，7小時30分/7.50，每日450|
|W02|FR03|A+B|09:00–18:00 rest60|gross540，net480，8.00|
|W03|FR03,05|A+B|22:00–02:00 次日 rest30|gross240，net210，3.50，全歸10/01|
|W04|FR03|A+B|22:00–02:00未勾次日|END_ORDER，無結果|
|W05|FR03|A+B|09:00–09:00同日/次日|同日拒絕；次日1440/24.00|
|W06|FR03|A|09:00–10:00 次日|SPAN_LIMIT1500>1440|
|W07|FR02|A+B|2024-02-29、2023-02-29|前者有效，後者DATE_RANGE|
|W08|FR02|A|2000-02-29、2100-02-29、2026-04-31|僅第一有效；2100超輸入年範圍；4/31無效|
|W09|FR02,03|A|2099-12-31 23:00–01:00次日|120分鐘，仍歸2099-12-31|
|W10|FR02|A+B|9:00/24:00/12:60/12:00:00/空白|拒絕，原稿保留，不默改時間|
|W11|FR03|A+B|rest空白/-1/1.5/1e2/+1/1,000|均拒絕，不當0|
|W12|FR03|A|10:00–11:00 rest60/61|60合法net0；61 BREAK_EXCEEDS_SPAN|
|W13|FR04|A+B|09–12和11–13|ROW_OVERLAP，兩列識別，不給部分總計|
|W14|FR04|A+B|09–12和12–13|相接合法240分鐘|
|W15|FR04|A+B|10/01 22–02次日與10/02 01–03|跨日重疊拒絕|
|W16|FR04|A|09–17 rest420與12–13|即使扣休息仍重疊拒絕|
|W17|FR04|A|09–17包住10–11和12–13|檢查maxEnd，拒絕，不只檢查相鄰短段|
|W18|FR05|A|10/02 1小時；10/01 2小時|days排序10/01 120、10/02 60；rows原順序；total180|
|W19|FR05|A+B|3個互不重疊1分鐘段|total3分鐘/0.05，不能0.06|
|W20|FR05|A|1/2/59/60/90分鐘格式|0.02/0.03/0.98/1.00/1.50；時分正確|
|W21|FR01,10|A+B|1列、62列、63列；連續62天各24h|前兩可；63拒絕；62天89280分鐘/1488.00h|
|W22|FR02,03|A|date32/33、time16/17、break16/17原碼元且外側ASCII空白|邊界內trim判格式，+1先LENGTH，不truncate|
|W23|FR01,06|B|增刪列、範例、清除|最少1最多62；範例需再計算；clear一空時段|
|W24|FR06|A+B|成功後改一欄/次日/新增/刪除|結果立刻空、copy停用，重算才更新|
|W25|FR07|A+B|copy成功/拒絕/clear後晚到promise|完整LF報告，失敗可手選；晚回不能復活舊報告|
|W26|FR07|A|同revision两次copy先後逆序resolve/reject|只有最新request可改status（或busy拒絕第二次）|
|W27|FR06,08|B|輸入/計算後離頁返回BFCache|舊時段/結果已空，日期可初始化今日|
|W28|FR08|B|Network/Storage载入、編輯、算、copy、hidden|只第一方static，無內容傳輸/storage；含/cdn-cgi/rum；觀察不足NOT_RUN|
|W29|FR09|B|兩語鍵盤、320px、真200%zoom|同功能可達，focus/error正確，無整頁水平overflow|
|W30|FR02,08|A+B|欄位<img onerror...>、unknown schema key、null/array|固定拒絕不執行、不rawstack、不異常上傳|
|W31|FR10|A|dev /../、encoded traversal、hidden/junction，build hardlink/stale|拒絕並保留outside sentinel，dist僅allowlist|
|W32|FR09|A+B|preview/meta及後續production两語HTTP|previewnoindex；production canonical/alternates/xdefault/robots/sitemap/JSONLD/404/headers正確，各自記錄|

M1必要 gate：核心日期/整數/重疊/輸出/失效/邊界自測、真工具鏈npm test/check/build、至少一個真瀏覽器雙語主要流程W01/W03/W13/W24與可操作錯誤。瀏覽器真正觀察與Node UI harness分開；不能以Node假DOM代替B。完整Network/Storage、原生clipboard權限、讀屏、手機真機和其他瀏覽器/zoom依工具能力可逐項NOT_RUN，但必要核心或工具鏈FAIL不能跳過。正式SEO/hosting是M2/M3，不用預覽noindex判bug。

不要求實體打卡/工資法規驗收，因產品明確不處理。每次固定code hash與實際命令exit/瀏覽器版本/輸入觀察，沒有搜尋收錄保證；外部確認才完成版本。


---

## 原文件 TASKS.md

# 工時加總任務

SPEC_ONLY。一次一個里程碑，完成凍結回報主對話；必要失敗不前進。不遞迴委派。共通允許本工具HANDOFF/project.json/START-HERE/docs/RELEASE-CANDIDATE狀態更新，以及TASK-ENTRY專用append-only證據；不改兄弟/首頁/根repo。

## M1 / T00：完整本機可操作MVP

前置：讀入口、產品/核心/UX/驗收/工程隱私；Node24與持久環境guard；記錄初始狀態。allowed本工具public/**、scripts/serve.mjs/check.mjs/build.mjs/validation.mjs等必要自包含工具helper、test/**合成資料、package.json/.gitignore、dist生成物。不改規格數值/功能門檻，不加依賴。

步驟：1 純日期/時間/休息/重疊/分鐘API及独立expected測試；2 雙語工作表、範例、錯誤/舊結果失效、copy fallback与競態；3 真安全server/check/previewbuild与負例；4 真browser指定主要流程、320px/zoom能力分層；5最終必要checks與固定manifest，Handoff、owner釋放。必要命令由此前建立後執行 `npm test`、`npm run check`、`npm run build`；不可用空script假通過。

驗收以ACCEPTANCE M1 gate、可操作產物和前後guard不變。非目標：正式SEO、GitHub、部署/首頁、工資或其他需求。停止：未知系統漂移、同檔別人寫、需要額外權限/成本/依賴、規格矛盾、兩輪同失敗無新線索；scope內缺陷要修且測不需重問。完成停在M1供主驗，主驗通過才M2。

## M2 / T01：發布準備與獨立PUBLIC來源

前置主代理實際放行M1。allowed本工具public固定SEO/404/_headers，scripts release/build/check/manifest helper、test/release.test.mjs、wrangler.jsonc、package scripts、docs/RELEASE*及TASK-ENTRY reviewed source copy。固定origin，preview/prod隔離、release/404/MIME/security驗證、Git blob bytes ZIP與解壓重build。

依docs/RELEASE，建 `npm run build:production`、`npm run check:production`；test/check/preview/prod與dryrun必要checks通過後沿既有gh權限公開KYStr/glossquote-labs-work-hours（無force），驗證PUBLIC/remoteSHA與固定sourceZIP，交READY_FOR_INTEGRATION或具體BLOCKED。不要读token/自行deploy。根repo/首頁不能改。

## M3 / T02：主代理整合與外部複驗

原chat不得自行執行：主對話讀實際diff/固定source，獨立驗收、免費Cloudflare發布https://hours.glossquote.com、兩語live/HTTP/SEO/主要流程，verified才更新/發布兩語首頁。原chat僅按主對話具體問題在本工具owning paths修正與重publish。

上線標AWAITING_EXTERNAL_REVIEW。使用者/驗收者必要回報修正後重新主驗/publish/deploy並外部確認才完成。未收到回報先保留，不創造推測返工或假PASS。


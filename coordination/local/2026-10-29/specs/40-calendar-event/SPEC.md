# 行事曆檔產生器 — 既有規格保存

Task ID: `labs-40-calendar-event` · Spec ID: `spec-40-calendar-event`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求
這是規格，尚未實作。

- FR-01 單次事件：標題必填 trim 後1–120 Unicode碼點；地點選填0–200、說明0–4000碼點。拒絕unpaired surrogate及控制字元；說明允許 LF，CRLF/CR正規化LF；標題/地點拒絕換行。文字只text呈現；不得解析HTML、URL或邀請對象。日期精確YYYY-MM-DD，2000-01-01至2099-12-31，嚴格公曆驗證。時間HH:mm、00:00–23:59，無秒。
- FR-02 預設定時活動。開始/結束完整日期時間必填，不自動猜跨日或增減日期。開始時區預設Asia/Taipei，開始與結束共用一個時區，下拉只列 UTC、Asia/Taipei、Asia/Tokyo、Asia/Hong_Kong、Asia/Singapore、America/New_York、America/Los_Angeles、Europe/London、Europe/Berlin、Australia/Sydney。清單外拒絕，Intl不能解析則「此裝置無法解析此時區」。開始結束初始空白；填開始後不得自動覆寫使用者結束欄位。UTC結束須嚴格晚於開始，最長366*24小時。
- FR-03 夏令時間：不存在的本地時刻拒絕並指出欄位；重複時刻不自動採某個，為每個歧義欄位提供「第一次／較早」「第二次／較晚」選項並顯示UTC offset。欄位或時區改動即清除之前歧義選擇，重新解析。只有0/1/2個候選被接受，多於2個視不支援。無歧義時不顯示多餘選項。
- FR-04 全天活動：僅開始日期、最後一天（包含），初始空白，最後一天>=開始日期，含首尾最多366天，最大最後一天2099-12-30（ICS exclusive end可到2099-12-31）。全天不套時區、不帶時間。畫面明說「最後一天包含在活動內」。跨模式切換保留輸入草稿但同步清除結果/Blob和舊歧義選擇，隱藏欄位不影響目前模式驗證。
- FR-05 明確按「預覽行事曆檔」才驗證產生。結果以標題、所在地日期時間、時區/UTC offset、UTC實際時間或全天包含範圍摘要，另顯示ICS文字可檢視；不以工程文字取代摘要。有效產物才啟用「下載 ICS」。任一相關輸入改動立即清空結果、取消下載，狀態提示重新預覽。
- FR-06 `.ics` UTF8無BOM、CRLF，單一VCALENDAR/VEVENT，VERSION2.0、PRODID固定、CALSCALE:GREGORIAN；無METHOD/VALARM/ATTENDEE/ORGANIZER/URL/RRULE/TZID/VTIMEZONE。定時輸出UTC Z，全天VALUE=DATE且DTEND exclusive。UID首次生成有效結果時由crypto.randomUUID產生，結尾@glossquote.com；每次輸入revision的新成功結果用新UID，同一結果重複下載穩定。DTSTAMP取生成時間UTC秒，不從使用者輸入讀；純核心接受顯式uid/stamp做確定測試。名稱固定glossquote-event.ics。檔案<=64KiB。
- FR-07 清除按鈕清所有內容、還原預設、失效結果和Blob。pagehide亦清草稿/結果、移除下載連結；BFCache pageshow恢復空白初始狀態。無本地儲存/網路/分享URL/雲端。產生是同步有界運算，不設假進度或無用取消；若分段async則仍需generation防舊結果復活。
- FR-08 真正可用雙語靜態頁。桌面Chrome/Edge為首版驗收目標；現代行動瀏覽器如Intl/下載不支援則保留預覽並清楚提示，不能假裝下載成功。鍵盤全功能、320px重排、200%縮放、錯誤焦點/aria-live不搶焦點。Native日曆匯入是手動驗收，不以ICS文字正確冒稱Apple/Google/Outlook均通過。

下一版可考慮多事件檔，但本版不加入；沒有帳戶、後端、費用、追蹤與外部依賴。


---

## 原文件 TECHNICAL.md

# 技術契約
這是規格，尚未實作。先看 [PRODUCT](PRODUCT.md)、[docs/ENGINEERING](docs/ENGINEERING.md)。

目錄：public/index.html、en/index.html、styles/app.css、js/app.mjs、js/i18n.mjs、js/core/date.mjs、zone.mjs、ics.mjs；test/*.test.mjs；scripts/{check,build,serve}.mjs。核心只資料/Intl/TextEncoder，不DOM/storage/network；外部無依賴。

純API建議：parseCivilDate(text)->{year,month,day}|error；parseClock(text)->{hour,minute}|error；resolveLocal({date,time,zone})->{candidates:[{epochMs,offsetMinutes}]}|error；validateEvent(draft)->{ok,event,errors,ambiguities}；serializeIcs(event,{uid,dtstamp})->string；foldLine(text)->string[]。錯誤用固定code/field，雙語UI映射，不能丟含私人輸入的錯誤log。精確schema reject unknown keys，非字串不coerce。

日期用UTC date arithmetic與回讀year/month/day驗證；不得new Date(userString)解析。所有本地時刻轉換使用指定zone、Gregorian、latn，Intl.DateTimeFormat('en-GB',{timeZone,calendar:'gregory',numberingSystem:'latn',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'})與formatToParts。檢查resolvedOptions/h23及有效各part，任何異常明確unsupported，不借本機zone猜。

限定現代2000–2099及列出的10區域：把wall clock欄位暫作UTC基準T，枚舉[-16h,+16h]內每15分鐘一個UTC候選（129次），formatToParts回到指定zone後，年/月/日/時/分/秒0全部吻合才收錄。排序去重。offsetMinutes=(T-candidate)/60000，可負，非15分鐘倍數/超16h不得猜。這是針對本清單年份的明確限制，不聲稱任意歷史IANA支援。每個zone建立一次formatter、每次事件最多258次format，輸入限制避免主執行緒無界工作；錯誤Intl要捕捉成不支援。將candidate數量0→不存在、1→唯一、2→要求顯式early/late，>2→不支援。沒有歧義時忽略舊選項或更嚴格拒絕不一致，UI先清空。兩個端點分別解析後才比較UTC長度。

ICS：文字先換行正規化，再反斜線→雙反斜線、LF→字面\\n、分號/逗號前加反斜線；不要跳脫colon，不允許使用者提供key或raw property。固定欄位順序 BEGIN:VCALENDAR,VERSION,PRODID,CALSCALE,BEGIN:VEVENT,UID,DTSTAMP,DTSTART,DTEND,SUMMARY,可選LOCATION,可選DESCRIPTION,END:VEVENT,END:VCALENDAR；最後亦CRLF。UID僅接受測試固定UUID格式加@glossquote.com；DTSTAMP嚴格UTC YYYYMMDDTHHmmssZ與有效日曆。

每個content line以Unicode碼點加入，UTF8計數首行<=75octets，後續實體行首一個ASCII空格也計在75內，故payload<=74。不切UTF8碼點或CRLF，不先把字串按JS長度slice。unfold時移除CRLF+單一空白後得到原邏輯行。輸出沒有BOM、NUL、HTML或多VEVENT；最終UTF8大小<=65536。全天開始YYYYMMDD，DTEND=包含最後日加1，不能偷用23:59。

狀態：empty/editing→validating→ready|invalid|unsupported；任一input先revoke舊BlobURL，version++，清結果，再改draft。同一ready snapshot反覆下載uid/stamp固定；點預覽而draft沒變可重用結果。下載鏈結只blob: URL，MIME text/calendar;charset=utf-8，不網路fetch。不呼叫clipboard/原生檔案選擇器/日曆app。

官方依據：[RFC5545](https://www.rfc-editor.org/rfc/rfc5545.html) 的3.1折行、3.3.11文字、3.6.1事件及DTEND非包含；[Intl formatToParts](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/formatToParts)。採UTC避免分發VTIMEZONE；語法正確不等於所有匯入器體驗通過。


---

## 原文件 UX-SEO.md

# 介面與搜尋內容
這是規格，尚未實作。採 Product App；完整 [DESIGN-SYSTEM](docs/DESIGN-SYSTEM.md)。主畫面一張事件表單與可見摘要，少量日期時間controls，不做企業排程儀錶板。

桌面：品牌/同語系首頁/語言 → H1與短說明 → 左側「活動內容、定時/全天、日期時間、時區」；右側「尚未預覽/結果時間摘要、下載ICS」→ 簡短使用步驟和FAQ。手機：同順序單欄、開始/結束分組、結果在生成按鈕後；不能讓表格/長標題撐寬。時區以城市+識別字顯示，不能只縮寫CST/EST。歧義選擇緊貼該欄位，顯示兩個實際offset與較早/較晚。

zh title：行事曆檔產生器：活動時間轉 ICS｜GlossQuote Labs
zh description：輸入單次活動、日期與時區，在瀏覽器產生 ICS 行事曆檔。支援全天活動與夏令時間檢查，不需登入。
zh H1：把活動時間做成行事曆檔
en title：Calendar Event to ICS File | GlossQuote Labs
en description：Create an ICS file for one event with dates and a time zone. Preview timed or all-day events locally, with daylight-saving checks and no sign-in.
en H1：Turn event details into a calendar file

主要文案對照：活動標題/Event title；地點/Location；說明/Notes；定時/Timed；全天/All day；開始/Start；結束/End；最後一天（包含）/Last day (included)；時區/Time zone；預覽行事曆檔/Preview calendar file；下載ICS/Download ICS；清除/Clear。
狀態：尚未預覽/No preview yet；內容已變更，請重新預覽/Details changed. Preview again.；此時區沒有這個本地時間/This local time does not exist in this time zone.；此時間出現兩次，請選擇/The clock shows this time twice. Choose one occurrence.；結束必須晚於開始/End must be after start.；無法在此裝置解析時區/This device cannot resolve this time zone.；檔案已準備好，下載後到日曆匯入/File ready. Download it, then import it into your calendar. 不可用「已加入日曆」。

雙語FAQ（頁面完整顯示）：
1. 會自動加入我的日曆嗎？不會，工具產生ICS檔，你自行在日曆匯入。/ Does this add the event to my calendar? No. It creates an ICS file for you to import.
2. 跨時區會怎麼處理？定時活動先以所選時區確認，再存成UTC；日曆可能以你的當地時區顯示。重複時間需選擇，跳過的時間不能使用。/ How do time zones work? Timed events are resolved in your selected zone and saved in UTC. Your calendar may display its own local time. Repeated times require a choice; skipped times are rejected.
3. 全天活動的最後一天算在內嗎？畫面輸入包含最後一天，ICS按標準使用隔天作為結束，事件不會多一天。/ Is the last all-day date included? Yes. The file uses the following date as its exclusive end, as required by ICS.
4. 資料會上傳嗎？表單與檔案在頁面記憶體處理，沒有帳戶或同步。離開頁面不保留草稿。/ Are my details uploaded? Form data and the file stay in page memory. There is no account or sync; drafts are not retained after leaving.

全部label/error/status雙語，不只換title。語言切換不攜輸入。canonical/兩語hreflang/x-default正式階段才用確認網址；候選calendar.glossquote.com僅規劃，M1 preview noindex。靜態內文可索引後才加入首頁；不得假用戶或臆造支持日曆標誌。

鍵盤tab順序跟視覺一致、fieldset/legend明確，錯誤摘要連結欄位；aria-live polite只報狀態不每按鍵播整份結果。320px與200%不橫向捲動主介面，ICS原始檢視可內部水平scroll；焦點清晰、AA色對比、不依顏色區別有效/錯誤。


---

## 原文件 ACCEPTANCE.md

# 驗收案例
這是規格，尚未實作。N=Node純邏輯/CLI；B=實際瀏覽器；M=真實匯入器人工。B/M未執行必須NOT_RUN，不得以N替代。

|ID/FR|類別|輸入/操作|精確期望|
|---|---|---|---|
|C01/01,02|N|台北2026-10-22 09:00–10:00|DTSTART:20261022T010000Z、DTEND:20261022T020000Z|
|C02/02|N|UTC相同時刻或結束早於開始|END_NOT_AFTER_START，不產物|
|C03/01|N|2024-02-29 / 2025-02-29|前者有效，後者INVALID_DATE|
|C04/01|N|1999-12-31、2100-01-01、2026-2-03、24:00|拒絕，不寬鬆解析|
|C05/03|N|NY2026-03-08 02:30|0候選，不存在時間拒絕|
|C06/03|N|NY2026-11-01 01:30|兩候選05:30Z、06:30Z；未選不能生成；early/late精確各選一|
|C07/03|N|London2026-03-29 01:30|不存在拒絕|
|C08/03|N|Sydney2026-04-05 02:30|2026-04-04 15:30Z、16:30Z兩候選|
|C09/02|N|Tokyo2026-01-01 00:15|2025-12-31T15:15Z，日期跨年正確|
|C10/04|N|全天2026-10-22至10-22|DTSTART;VALUE=DATE:20261022、DTEND;VALUE=DATE:20261023，無TZID/時間|
|C11/04|N|全天2024-02-28至02-29|exclusive end20240301|
|C12/04|N|最後日早於首日、含首尾367天、最後2099-12-31|拒絕；366天邊界可用|
|C13/06|N|SUMMARY含逗號、分號、反斜線|解跳脫後保留原字元，不能新增property|
|C14/01,06|N|notes='A\r\nATTENDEE:evil'|輸出DESCRIPTION邏輯行含字面\\nATTENDEE:evil，沒有獨立ATTENDEE欄位|
|C15/06|N|長中文/emoji文字|每個實體行UTF8<=75bytes，continuation含前導空格；unfold精確原邏輯行，UTF8不被切斷|
|C16/01,06|N|surrogate孤字、NUL、title換行、extra schema key|明確拒絕|
|C17/01|N|title120與121碼點、notes4000與4001|邊界前者通過後者拒絕，不按UTF16誤算emoji|
|C18/06|N|顯式uid=00000000-0000-4000-8000-000000000001@glossquote.com，stamp20261022T000000Z|exact snapshot含單VEVENT、CRLF最後結尾、無BOM、固定順序、UTF8<=64KiB|
|C19/02|N|不在清單Pacific/Chatham或Intl拋錯|不支援，不能回退本機timezone|
|C20/05,06|B|生成→下載兩次→改標題|前兩次UID/stamp固定；改動同步清舊結果/下載，重生成新UID|
|C21/03|B|選歧義late→改時間/zone|舊選擇失效，不把late偷套新候選|
|C22/04,07|B|定時/全天切換、清除、pagehide/BFCache|隱藏欄位不污染驗證；清除/離開不恢復私人草稿或Blob|
|C23/08|B|兩語、鍵盤、320px、200%|完整功能，清楚focus/error，各語回同語首頁|
|C24/07|B|輸入/生成/下載同時監察完整Network與Storage|沒有輸入傳輸/追蹤/持久資料；原生下載內容另驗，不拿click替代|
|C25/08|M|實際Google/Apple/Outlook匯入C01/C10|逐個記時區後顯示、全天日數、UTF8內容；未跑者各自NOT_RUN，不總稱支援通過|

獨立驗證：測試不可用serializeIcs生成expected；至少以固定手寫ICS snapshot及獨立 unfold/欄位reader比對。主代理以自己案例檢查DST與75bytes邊界。正常工具check/build/http的精確預期依ENGINEERING，同時保留Windows guard前後無drift證據。


---

## 原文件 TASKS.md

# 任務順序
這是規格，尚未實作。M1僅本地候選，必要B/M門檻由主代理另驗；不自行推GitHub/部署。

T00 — 前置讀完START-HERE與規格。allowed package.json/.gitignore、scripts/{check,build,serve}.mjs、public/**、test/**。建立Node24 zero dependency骨架與有實際檢查的命令，雙語初始HTML controls在初始化前disabled。dev只127.0.0.1:4220。完成後npm run check/build的初始實查有效，不可假成功。記HANDOFF。

T01 — T00後，allowed public/js/core/**及test/**。嚴格日期/時刻/文字schema、限定zone候選解析、DST顯式選擇、全天/定時範圍；寫C01–C12/C16/C17/C19。npm test，對精確結果與拒絕輸入驗證，不引用被測結果當expected；失敗先修本任務。

T02 — T01後，allowed core/ics.mjs、test/**。文字escaping、octet折行、UID/stamp確定契約、CRLF完整ICS、64KiB guard；C13–C18手寫fixture+獨立reader，npm test。不得加日曆登入或第三方lib。

T03 — T02後，allowed public HTML/CSS/js（除已凍結核心可因整合bug修正並重驗）。完整雙語form+摘要、兩模式、DST兩選項、結果失效、Blob生命周期/clear/pagehide，320px/200%/keyboard結構。只能靜態/CLI檢查，禁止自行本機browser；B案例交NOT_RUN_USER_FOCUS_INCIDENT。

T04 — T03後，allowed scripts/test/public/.gitignore。落實安全閉合build/loopbackroutes、預覽noindex與靜態SEO內容；npm test、npm run check、npm run build各固定版本跑一次；離線HTTP測GET/HEAD/404/405/Host/path，不開browser。environment guard前後一致。UI沒有執行不能標PASS。

T05 — T04後，allowed HANDOFF.md、TASK-ENTRY.md、evidence/m1/**。凍結來源清單(bytes/SHA256，排除自身manifest/證據/產物重覆)，記精確命令exit、需求對照/未驗/風險；主代理親自讀diff、重驗。你的final回報主代理；不自行多建ZIP。

M2原對話公開GitHub：只在主代理明確放行後進行，Git settings guards、reviewed publication copy、公開KYStr/glossquote-labs-calendar-event，remote commit/visibility核對。M3主代理hosting+雙語首頁+看板；M4外驗修正才可最終完成。未通過前階段必要gate不可跳。


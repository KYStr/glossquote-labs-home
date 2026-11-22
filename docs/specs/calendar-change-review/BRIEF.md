# 行事曆改版的活動變更清單

預案 spec-calendar-change-review-20261111；工作 labs-calendar-change-review-spec-20261111。研究簡報，尚未ready。

## 使用者與結果

活動行政已取得舊版及新版ICS議程，要在寄通知前找出哪場移時、改地點或取消。選兩份匯出檔，按UID比對，逐活動預覽新增、消失、明示取消、時間/標題/地點改動，下載calendar-changes.json供人工通知。工具不寄信、不連行事曆、不改帳號。新版沒有某UID標removed，STATUS:CANCELLED標explicitly-cancelled，不能混成同一意思。

## 來源與差異

主統籌2026-11-11已開讀 [RFC5545](https://www.rfc-editor.org/rfc/rfc5545.html)。作者以3.1行格式、3.3值型別、UID/DTSTART/DTEND/STATUS及VEVENT規則核對子集，不宣稱全iCalendar支援。既有calendar-event從表單生一筆ICS；event-timeline從時長排流程；agenda-conflicts檢同版衝突；本案比較兩個實際文件的相同UID。最新registry/catalog/source-index/PR仍需再次查重。

## 首版支援界線

每份1MiB、最多2,000 VEVENT，UTF-8 fatal。支援有明確DTSTART/DTEND的單次UTC日期時間或全天DATE，全天結束日為exclusive；兩者型別不可混。嚴格unfold規則與反斜線文字解碼，LF/CRLF接受方式、BOM、raw byte容量、行列位置需明文。重複UID不能任意取最後；重複必要property、DTEND先於start、非法日期/時分秒、component結構歧義全有首錯規則。UID精確比對，不把不同UID因同標題併成同一活動。

RECURRENCE-ID/RRULE/RDATE/EXDATE、TZID/浮動時間、DURATION-only或其他未支援時間語意不做推定。含未支援事件的UID，兩邊關聯需整組標未判定，不能其中一邊被忽略而誤報新增/刪除。未知非比較欄位可保留未檢統計但不影響已支援四欄，作者需完整定義判定覆蓋。純DTSTAMP或SEQUENCE變動不構成時間/標題/地點變更，不推斷哪個檔案時間上較新，左右由使用者明確標記。

固定例：同UID meeting@example.test，舊20261112T100000Z–103000Z、新110000Z–113000Z，時間變更+60分鐘、長度仍30分鐘；相同title/location，只有timeChanged=true。全天20261112到20261113是1天；改DTEND到20261114是2天。另一UID在新版缺少→removed；仍存在但STATUS:CANCELLED→explicitly-cancelled。另驗同UID重複、相同title不同UID、folded長行、escaped逗號/分號/換行、不支援TZID一側造成整UID未知、非法閏日、跨UTC日期、相同檔零差異但有未檢欄位。每例要完整字面JSON與獨立UTC整數算式，不使用當地時區Date parse猜測。

## 工作流程與實作要求

先左舊右新選檔，明確換邊可重新比對；錯誤留草稿，改任一來源即清舊報告/下載。busy/取消/晚到/重設/離頁世代完整。雙語列出變更前後，缺值null與空字串含義固定，篩選只改畫面、完整JSON不減列。結果包含比較覆蓋與未判定UID，不用『完全一致』掩蓋未支援活動。全本地/零網路/零持久化，手機小型檢視可用，桌面Chrome/Edge主驗。

交BRIEF/SPEC/fixtures/AUTHOR-CHECK四檔八節，九產品面向與兩語SEO，schema/排序/時間範圍/容量/錯誤順序/演算法上界/生命週期、Node24內建離線測試、雙次buildhash及清楚的browser/manual NOT_RUN。不製作產品、不操作本地UI或發送通知。

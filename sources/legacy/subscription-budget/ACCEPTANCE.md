# 驗收：訂閱費用盤點

SPEC_ONLY。以下都是未執行案例，不是PASS。核心合法base為currencyRaw:TWD，rows:[{id:a,nameRaw:影音,amountRaw:100,period:monthly,plannedStop:false}]；表中的字串須以JSON字串送入，金額均兩位顯示，BigInt oracle用十進制分比對。

|ID|輸入／步驟|精確預期／需求|
|---|---|---|
|A01|base|年1200.00/月100.00，approx=false；FR01–05|
|A02|600 quarterly|年2400.00/月200.00|
|A03|1200 yearly|年1200.00/月100.00|
|A04|base+600季停用+1200年保留|現在年4800.00/月400.00；停用年2400.00/月200.00；保留年2400.00/月200.00|
|A05|全部plannedStop=true|保留rowCount0，年/月0.00；現在=停用|
|A06|全部plannedStop=false|停用rowCount0/0.00；現在=保留|
|A07|0 monthly|合法年/月0.00，不當缺欄|
|A08|yearly0.01|年0.01/月0.00，approx=true|
|A09|yearly0.06|月0.01，half-up，approx=true|
|A10|12筆yearly0.01|總年0.12/月0.01；不能加總逐列0.00為總月0.00|
|A11|60筆1000000 monthly|年720000000.00/月60000000.00|
|A12|61列 / 0列|TOO_MANY_ROWS / TOO_FEW_ROWS|
|A13|1000000.01|AMOUNT_OUT_OF_RANGE|
|A14|001.20 monthly|每次1.20、年14.40/月1.20|
|A15|1e2、-1、+1、1,000、１２、1.234、.5、1.、空字串、空白包住100，各別|INVALID_AMOUNT，不部分計算|
|A16|17字元amount（即使全0）|AMOUNT_RAW_TOO_LONG|
|A17|currency TWD合法；twd/空/含空白/13字元各別|INVALID_CURRENCY|
|A18|period weekly、MONTHLY、空|INVALID_PERIOD|
|A19|plannedStop字串true或0、amount數值100|INVALID_REQUEST|
|A20|兩列同名不同id|都保留、各算一筆，不去重|
|A21|兩列同id|DUPLICATE_ID，row2，field id|
|A22|name raw257字元 / trim後81 / 全空白|NAME_RAW_TOO_LONG / NAME_TOO_LONG / NAME_REQUIRED|
|A23|name控制字（包含頭尾TAB/LF）或unpaired surrogate|INVALID_NAME；emoji配對合法；不得先trim移除控制字|
|A24|name含<img src=x onerror=…>|純文字保留，DOM不產生img/執行|
|A25|根/row多餘、symbol、nonenumerable、getter、缺欄各別|INVALID_REQUEST；getter執行0次，無結果|
|A26|rows hole/subclass/custom prototype/額外鍵/getter索引|INVALID_REQUEST，getter0次|
|A27|null prototype合法根/列，dense正常Array|相同數值結果|
|A28|同時未知鍵與負amount|INVALID_REQUEST優先；合法schema時首列欄位錯誤依技術順序|
|A29|report zh/en|包含幣別、所有行與三組summary、假設；UTF8/noBOM/不額外LF；以固定完整expected確認|
|A30|輸入物件計算前後深比對|未修改；同輸入同結果、沒有時間依賴|
|A31|合成人造60列、各period與stop混合|精確年current=stop+retained；所有月總結由年額獨立half-up，不用浮點|

|ID|真瀏覽器行為|驗收與限制|
|---|---|---|
|B01|兩語初始與A04|完整工作表，summary和逐列符合oracle；未輸入無舊結果|
|B02|成功後依次改每種欄位/加刪列/週期/checkbox|每次即清舊結果/report並停用copy/download；重算才可用|
|B03|錯誤金額/空列/超界|整體失敗，first field焦點與可見錯誤；不默默跳過|
|B04|複製完整report，原生clipboard讀回|UTF8內容一致；有權限問題記原生NOT_RUN，mock不能代替|
|B05|下載TXT|原生download事件/檔案名稱與bytes；OS選單沒測另記，不把Blob stub當原生|
|B06|copy待完成時編輯/清除/pagehide後舊resolve或reject|實際app callback測試可自動；不能冒稱原生拒絕或BFCache|
|B07|clear取消/Escape/確定；範例取代取消/確認|取消保留，確定重建初始；focus有去向|
|B08|全鍵盤輸入計算/新增/刪除/複製|按鈕有標籤、focus可見、無trap、移除非最後列焦點合理|
|B09|320px兩語長名稱60列|頁面不橫溢、所有操作可達，最低44px觸控；記實測viewport|
|B10|實際200%zoom、真iOS/Android鍵盤/中文IME、AT|分項記錄；若缺設備可NOT_RUN，不以viewport或合成event代替|
|B11|刷新/正常離開/pagehide/pageshow persisted|應用清空，無storage；真BFCache另驗，合成只算事件邏輯|
|B12|從初載、假資料操作到自然hidden/pagehide完整Network/Storage|無輸入外傳/analytics/telemetry/NEL/同源rum；無完整能力則NOT_RUN，不以regexscan代替|
|B13|兩語標題/FAQ/home/language與JS disabled|文本完整，preview noindex；noscript可見且結果操作禁用|
|B14|載入後離線運算、Clipboard不可用|本機計算正常；copy truthful fallback。首次離線載入不在MVP|

M1必要：所有A、B01–03/B07–09/B13、本機copy/download盡力實測並精確記限制。B04–06/B10–12/B14需區分真正環境與mock結果，使用者已允許無設備／工具能力的人工NOT_RUN保留。M2必要：test/check/build/production兩命令、same-language backlinks、reciprocalSEO/robots/sitemap/CSP/MIME/404、來源白名單與Git環境guard、PUBLIC remote commit。M3主代理正式HTTP/固定bytes/主要流程與首頁雙語驗證；完整設備項仍單列。任何必要自動gate FAIL都不得放行。

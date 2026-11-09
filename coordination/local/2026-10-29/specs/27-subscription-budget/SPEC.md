# 訂閱費用盤點 — 既有規格保存

Task ID: `labs-27-subscription-budget` · Spec ID: `spec-27-subscription-budget`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求：訂閱費用盤點

SPEC_ONLY；M1 尚未執行。主要使用者以手機或桌面瀏覽器手動盤點，不需帳號。初始幣別 TWD，兩個空白列、monthly、plannedStop=false；不能把空白行當零自動略過。範例需按「載入範例」才填入，既有資料須先確認取代。

|ID|需求與可觀察行為|
|---|---|
|FR-01|1–60 列，每列名稱、每次金額、週期、計畫停用。名稱可重複，列 ID 必須唯一；名稱不作 dedup。空白／不完整列阻止整份結果。|
|FR-02|幣別只是 1–12 個 ASCII 大寫英文字母的標籤，raw 上限 12，預設 TWD，嚴格不 trim／改大小寫；使用者自行確認每列同幣別。不能轉換或暗套任何匯率。|
|FR-03|每次金額必填，ASCII 格式 0 或正數、最多二位小數，0–1000000.00；允許前導零。負號、空白、千分位、科學記號、全形數字、只有小數點及 >2 小數皆拒絕。|
|FR-04|period 僅 monthly/quarterly/yearly，分別乘 12/4/1 得全年名目金額；季度固定三個月，年為十二個月。這是全年化試算，不是今年實際帳單。|
|FR-05|逐列與總結顯示全年金額及平均每月（全年/12），先精確加總全年再將總額/12四捨五入到分，不把各列已捨入月均相加。逐列捨入後再相加可能與總結相差數分；停用與保留兩組月均相加則可能與目前月均相差0.01，說明緊貼數字。|
|FR-06|plannedStop 只代表一個假設：全部列為目前基準、勾選列為預計停用、未勾選為保留。總結列出目前／計畫停用／保留的年額及月均。預計全年差額 = 勾選列全年合計；不能宣稱服務已取消或一定會省到該數字。|
|FR-07|按「計算支出」才產生一致快照；新增/刪除/編輯/切換週期或停用選項立即清空舊結果及複製/下載能力。沒有局部成功或混合新舊數字。|
|FR-08|完整只讀文字報告列出幣別、每列原金額/週期/年額/月均/計畫狀態、總結及計算假設。顯示讀取預覽；按鈕可原生複製或下載 TXT。只在明確手勢後執行。|
|FR-09|TXT 固定 glossquote-subscription-budget.txt，UTF-8、無 BOM、不額外加 LF。剪貼簿失敗顯示可選報告，不假稱成功；舊 Promise 回呼不能污染編輯後／清除後狀態。|
|FR-10|頁面記憶體限定；不存 storage、URL、cookies、console、network。pagehide清空輸入及輸出、撤銷blob URL、遞增revision；BFCache回來空初始。刷新/離開資料不保存，提醒不代表系統記憶體被安全抹除。|
|FR-11|清除有內容時確認；取消與Escape保留全部資料/結果，確定後重建初始空列及TWD。按鈕/錯誤需鍵盤可達，錯誤對應欄位。|
|FR-12|繁中/英文完整獨立頁，切換語言會離開並清資料，切換前有可見提示。手機320px/200%zoom/高對比/focus與觸控目標依共用規範。主工作表優先於說明。|

名稱先限制 raw<=256 UTF-16，trim後1–80；拒絕 C0/C1 控制字與未配對 surrogate。金額 raw<=16 UTF-16（長度先拒絕，不能先對無界輸入做解析）。總額上限由60列×1000000×12自然界定，不自行降低或溢位。所有自動／人工驗證只用假資料，不要求真實帳單、帳號或密碼。

範例：影音100/月、課程600/季（勾停用）、軟體1200/年。現在4800/年=400/月；預計停用2400/年=200/月；保留2400/年=200/月。畫面說「依固定費率全年化；不含退款、稅、調價或取消費用」，不作理財、法律或取消資格判斷。


---

## 原文件 TECHNICAL.md

# 技術規格：訂閱費用盤點

SPEC_ONLY。原生靜態 HTML/CSS/ESM；Node >=24 開發測試，無 runtime/npm 套件。core public/js/core/subscription-budget.mjs；app public/js/app.mjs；語言 public/js/i18n.mjs；test/*.test.mjs；工具鏈 scripts/{serve,check,build}.mjs。兩頁 public/index.html、public/en/index.html，共用本機資產，相對引用不能跑到父產品。

## Exact schema 與驗證順序

calculateBudget(request): request 精確 {currencyRaw,rows}；row 精確 {id,nameRaw,amountRaw,period,plannedStop}。根及row prototype只能Object.prototype或null；所有鍵必須own enumerable data properties；拒絕 getter/setter/symbol/非列舉/多餘/缺欄，不呼叫getter。rows prototype恰Array.prototype、dense、只有length和連續索引，每個索引為own enumerable data property；不能接受洞/subclass/custom prototype/額外屬性。id為ASCII ^[A-Za-z0-9_-]{1,40}$ 且唯一；UI自增ID，不能用名稱作ID。字串型別為id/nameRaw/amountRaw/period；plannedStop僅boolean。

順序：根結構與currencyRaw字串型別 → rows結構及全部row結構/欄位型別（不得先讀accessor）→ currencyRaw格式 → 列數1..60 → 逐列id格式/重複、raw名稱與金額長度、名稱原文控制字/未配對surrogate、名稱trim/必填/長度、period enum、amount grammar/range。首個錯誤回 {ok:false,error:{code,row,field}}；row為1-based或null，field固定欄位名/null，不echo輸入；沒有value或部分結果。名稱原文含TAB/LF等控制字即INVALID_NAME，即使位於trim會移除的頭尾也不能接受；一般空白名稱仍NAME_REQUIRED。

穩定code：INVALID_REQUEST（結構/型別）、INVALID_CURRENCY、TOO_FEW_ROWS、TOO_MANY_ROWS、INVALID_ID、DUPLICATE_ID、NAME_RAW_TOO_LONG、AMOUNT_RAW_TOO_LONG、NAME_REQUIRED、INVALID_NAME、NAME_TOO_LONG、INVALID_PERIOD、INVALID_AMOUNT、AMOUNT_OUT_OF_RANGE。INVALID_NAME含control/不成對surrogate。plain Object包括null-prototype；拒絕未知鍵優先於值錯誤，且不能從schema validator執行任何getter。停止讀取的固定邊界要測。

成功 {ok:true,value:{currency,rows,current,plannedStop,retained}}。rows順序與輸入一致；每列為 {id,name,amountText,period,plannedStop,annualMinor,monthlyMinor,monthlyApproximate}；amountText固定二位小數ASCII。minor皆非負BigInt，annualMinor是精確整數分；monthlyMinor是捨入後分；monthlyApproximate僅annualMinor%12n!==0n。current/plannedStop/retained精確 {rowCount,annualMinor,monthlyMinor,monthlyApproximate}；rowCount Number。不可直接JSON.stringify含BigInt的結果；文字報告格式化函式顯式輸出十進制，測試序列化fixture需明確轉字串。

## 金額演算法

amountRaw符合 ^[0-9]+(?:\.[0-9]{1,2})?$ 且raw<=16。先按字串拆整數與小數，右補至二位轉BigInt分；range<=100000000n。乘數 monthly12n/quarterly4n/yearly1n。年額相加全程BigInt；月均分 = (annualMinor+6n)/12n（非負half-up）。總結用精確年額求月均，絕不加總已捨入各列月均；年額current=plannedStop+retained必須精確。月均各組獨立捨入，可能差0.01，畫面和報告註明。

formatMinor(BigInt)固定二位ASCII小數，不引入浮點；介面可對整數部分插入千分位但核心報告採無千分位便於比對。原每次金額也固定二位。最大60列1000000/月 ->年720000000.00、月60000000.00，不溢位。yearly0.01 →年0.01/月0.00 approximate=true；yearly0.06→月0.01為half-up邊界。12列yearly0.01：各列月0.00，總年0.12/月0.01。

reportBudget(value,lang)以固定zh-Hant/en字典、LF分行，包含說明假設；不讀時間、不產生隨機識別或使用者環境資訊。只使用textContent/value呈現文字，不能innerHTML/eval/Function/document.write。

## UI/非同步

state draft/revision/result/copyRequestId/copyBusy/待清下載URL集合。任意input/change立即revision++、result=null、清report和狀態，停用copy/download。copy單次進行，擷取immutable結果文字與revision/id；resolve/reject/finally都核對兩者及目前頁面世代，舊回呼無效果。不存在Clipboard API或拒絕時聚焦只讀報告供手動複製，不使用已棄用隱藏上傳fallback。下載只由button建立Blob並點anchor，每筆URL各延後30秒釋放；編輯/重算/下一筆下載不能提前撤銷已觸發但瀏覽器可能尚未接收的URL。最多8筆待清URL，滿額暫停下載並雙語提示，timer釋放後只按當前有效結果更新下載能力；pagehide取消timer並立即全revoke。clear/cancel不混淆；刪列後焦點移相鄰列或新增按鈕。

原生功能未驗證與mock測試分開。Clipboard只HTTPS/localhost可用且可能拒絕，見 [MDN writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)（主代理2026-10-16查閱）；不要聲稱所有瀏覽器支援。離線指已載入頁面後的運算，沒有Service Worker/PWA或離線首次開啟承諾。

M1 dev 127.0.0.1:4207；預覽輸出dist/，production在M2建立dist-production/，詳 [發布](docs/RELEASE.md)。任何未知依賴、服務或權限先停並回報主代理。


---

## 原文件 UX-SEO.md

# 介面與SEO：訂閱費用盤點

SPEC_ONLY，未做真機可用性測試。Product App模式；依 [設計系統](docs/DESIGN-SYSTEM.md)。使用系統字型，不下載Geist。標準暖紙/深墨/綠色主操作，只有全年合計有一個明顯數字；不用六張同大數字卡搶工作表。

Desktop：
```text
Gloss Tools / 訂閱費用盤點                 English / 工具首頁
幣別[TWD]　所有金額須同幣別
名稱           每次金額     週期       計畫停用       刪除
[影音]         [100.00]    [每月]       [ ]          [移除]
[新增訂閱]                                  [計算支出]
目前全年… / 平均每月…
計畫停用：…　保留：…          計算假設（緊貼結果）
逐列明細 / 完整文字報告                   [複製][下載TXT]
方法 / FAQ / 限制與隱私
```
Mobile：每列縱向label+input，period與stop相鄰，結果年度/每月成兩列；操作不靠橫向拖曳。計算按鈕在工作表後，不用固定footer遮擋虛擬鍵盤。最多60列可捲動整頁；不在巢狀scrollpane放必要操作。

可見：幣別、訂閱列、週期、停用checkbox、增刪、計算。相鄰：每列錯誤與刪除。結果後：copy/download與報告。說明折疊可用，但「不會真的取消服務」「全年化不是實際帳單」「月均捨入」必須結果旁可見。

狀態文案：初始「加入你目前付費的訂閱，再比較計畫停用後的費用」；未計算「資料已變更，請重新計算」；empty不可算；error「請填入最多二位小數的金額，例如100或99.90」並聚焦對應欄位；zero所有零時正確顯示0.00不是空；all stop時保留0項/0.00；clipboardbusy「正在複製」並立即pressed；拒絕「未複製，請選取下方報告手動複製」；clear「清除目前盤點？離開後不會保留」確定/取消。

英文對應：Add your current subscriptions to compare a planned reduction; Inputs changed. Calculate again.; Enter an amount with up to two decimal places, such as 100 or 99.90.; Copying…; Not copied. Select the report and copy it manually.; Clear this budget? Your entries are not saved after leaving.

名稱欄支援中文IME，不在composition中改字串；變更可先invalidate但不要重渲染輸入造成游標跳走。Tab順序依DOM，Enter在input不意外刪行；form提交只計算，其他buttons type=button。錯誤aria-describedby，完成status不連續播報逐鍵資料。觸控44px、焦點可見、320px無整頁橫溢，200%縮放功能完整。低階機最壞60列一次有界處理，不需worker；真iOS Safari、Android鍵盤、AT與實際200%沒測就記NOT_RUN。JS不可用時有兩語noscript，未有結果不啟用導出。

繁中 title：訂閱費用盤點：比較月繳、季繳與年繳支出｜GlossQuote
description：在瀏覽器整理同幣別訂閱，計算全年費用與平均每月金額，試算計畫停用後的差額。資料留在目前頁面，不連接帳戶或取消服務。
H1：訂閱費用盤點
英文 title：Subscription Budget: Compare Monthly and Annual Costs | GlossQuote
description：Compare monthly, quarterly and annual subscriptions in one currency. Estimate annual totals and a planned reduction locally in your browser, without connecting accounts.
H1：Subscription budget

FAQ雙語：
1. 會幫我取消嗎？不會，只計算你勾選的假設。 / Does this cancel a subscription? No. It only calculates your selected scenario.
2. 月均就是每月帳單嗎？不是，是全年化金額除12，未考慮實際扣款日、退款或稅費。 / Is the monthly average my bill? No. It divides the annualized amount by 12 and excludes billing dates, refunds and taxes.
3. 可以混幣別嗎？不行，標籤不會換匯；請先自行以同幣別輸入。 / Can I mix currencies? No. The label does not convert currencies. Enter all amounts in one currency.
4. 為何逐列月均加起來有差？各列顯示到分，總結先精確加年額再除12，可能有捨入差。 / Why can row averages differ from the total? Rows are rounded for display; totals are calculated from exact annual amounts first.
5. 關閉頁面會保存嗎？不會，需自己複製或下載報告；不是帳務紀錄。 / Are entries saved after leaving? No. Copy or download the report yourself. This is not an accounting record.

頁面語言zh-Hant/en、lang正確；雙語有完整同內容方法/FAQ/隱私與對應首頁link（https://glossquote.com/index.html、/en/index.html）。語言切換旁提醒清空，不把輸入塞URL。預覽noindex/nofollow且無production canonical/sitemap誤指；M2網址 subscriptions.glossquote.com 的 /index.html、/en/index.html，self canonical、雙向hreflang zh-Hant/en及x-default指繁中、OG/JSON-LD WebApplication符合可見內容；不虛構review/rating/download人數。robots/sitemap列兩頁，真正404、CSP closed static依發布契約。FAQ可以無結構化資料，不承諾搜尋rich result。


---

## 原文件 ACCEPTANCE.md

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
|B13|兩語標題/FAQ<LOCAL_USER> disabled|文本完整，preview noindex；noscript可見且結果操作禁用|
|B14|載入後離線運算、Clipboard不可用|本機計算正常；copy truthful fallback。首次離線載入不在MVP|

M1必要：所有A、B01–03/B07–09/B13、本機copy/download盡力實測並精確記限制。B04–06/B10–12/B14需區分真正環境與mock結果，使用者已允許無設備／工具能力的人工NOT_RUN保留。M2必要：test/check/build/production兩命令、same-language backlinks、reciprocalSEO/robots/sitemap/CSP/MIME/404、來源白名單與Git環境guard、PUBLIC remote commit。M3主代理正式HTTP/固定bytes/主要流程與首頁雙語驗證；完整設備項仍單列。任何必要自動gate FAIL都不得放行。


---

## 原文件 TASKS.md

# 任務：訂閱費用盤點

SPEC_ONLY。只在本工具內改動；禁止遞迴委派。一次一里程碑，M1交主代理前不得自行公開或部署。所有命令都在本工具目錄；若npm不在PATH用正式安裝路徑，不改PATH/registry。

## M1-T00：本機骨架

前置讀完整規格及docs。allowed paths：package.json、.gitignore、public/**、scripts/{serve,check,build,validation}.mjs、test/**；狀態HANDOFF.md/TASK-ENTRY.md/project.json/START-HERE.md/docs/RELEASE-CANDIDATE.md可更新。不改PRODUCT/TECHNICAL/ACCEPTANCE門檻，不改兄弟、首頁或根repo。
建立Node ESM、private package、dev/test/check/build命令；serve只127.0.0.1:4207、GET/HEAD allowlist/MIME、不接受路徑逃逸、不向外網。preview兩語頁noindex；初始化env guard證據。建立check/build後才跑npm test、npm run check、npm run build。此時僅骨架gate，不標產品完成。

## M1-T01：核心與固定測試

相同allowed paths；依TECHNICAL exact schema、BigInt年額、half-up月均、計畫停用對比與文字報告。加完整A01–A31，尤其12×0.01年繳的總月均oracle不靠實作重算expected。執行npm test；檢查getter不執行及非原地修改。FAIL修正同範圍，不改成寬鬆schema。

## M1-T02：雙語完整操作

allowed public/**/test/**/必要scripts改動與上述狀態。建欄位/錯誤/增刪/範例確認/clear dialog/結果/copy/download，revision+requestId防舊回呼。執行有意義的UI狀態測試與真browser必要B案例；保留NOT_RUN。缺能力只讓相應輸出fallback，不改上傳或使用外部服務。

## M1-T03：凍結交接

allowed同M1與docs/RELEASE-CANDIDATE.md。最後implementation穩定後只跑一次必要npm test/check/build；修正後只重跑受影響gate。記錄實際檔案、精確命令/exit、源檔manifest(bytes/hash不含自身)、browser evidence、env前後、未驗風險。完成後final回報主代理並等待M1主驗，不讓使用者轉貼，不開新chat。

## M2：主代理明確放行後的公開來源與正式候選

allowed scripts/**、test/**、public中必要同語family SEO而非功能重寫、wrangler.jsonc、package.json/.gitignore、docs/RELEASE*/HANDOFF/TASK-ENTRY/project/START-HERE；dist-production/**與隔離publishing副本。增加build:production/check:production/preview:production，產出已審核靜態HTML/JS/CSS/robots/sitemap/_headers/404；canonical兩語與x-default。依docs/RELEASE.md先測，再由原chat推public KYStr/glossquote-labs-subscription-budget，驗remote commit/visibility/乾淨來源ZIP。禁止gh auth setup-git/login/refresh、global/system Git設定、讀token或authdebug；guard前後一致。超出必要SEO/發布改動需回主代理審核，不能悄悄改核心。不執行Cloudflare或首頁。

## M3／M4：主代理與外部驗收

M2交回後由主代理驗固定source、正式部署至subscriptions.glossquote.com、驗證live，最後更新雙語首頁。功能chat只修主代理退回的具體問題並重驗、補來源，不越權動共享資源。M3交使用者外部驗收標awaiting-external-review；收到外審才回同chat更正，經確認才完成版本。

停止並回報：需要新權限/套件/費用/憑證、同路徑其他owner在寫、範圍或oracle矛盾、Windows/Git持久設定漂移、兩次同一故障無新證據。保留所有既有資料/服務；只可結束自己明確建立且可丟棄的測試程序，不kill by name/port。


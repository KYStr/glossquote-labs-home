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

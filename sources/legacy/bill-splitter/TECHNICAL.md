# 分帳工具技術契約

本機候選使用原生ESM與Node24+，無runtime依賴。檔案：public/{index.html,en/index.html,styles/tokens.css,styles/app.css,js/app.mjs,js/i18n.mjs,js/core/money.mjs,js/core/split.mjs,js/core/report.mjs}；test/{money,split,report,scaffold,release,controller,ui-contract}.test.mjs；scripts/{serve,check,build,validate,release,publish-manifest}.mjs、wrangler.jsonc及public/_headers。驗收證據與未驗項見 docs/TEST-RESULTS.md。

## U14 v2 頁面入口與純函式

- calculateQuickSettlement({precision, people:[{id,name,paid}]})：exact schema；快速固定有效權重1，完全不讀隱藏份數。
- calculatePaidSettlement({precision,mode,people:[{id,name,paid,weight}]})：exact schema；mode僅equal/shares。equal使用有效权重1；shares驗0–1000整數且總份數>0，包括total0時。
- 兩入口共用金額／姓名／id驗證，BigInt加總paid，單人及合計採相同上限。PAID_TOTAL_MAX.fieldId=people，控制器導向第一個可見paid；WEIGHTS_ZERO導向第一個可見weight，aria訊息在變更／清除時恢復。
- result含workflow、total、precision、mode、settlement=true、people的有效weight/paid/share及balances/transfers。total0時share全0、balance全0、transfers空；份數全0仍先拒絕。
- UI只有共用付款、精度、原生radio快速／進階，進階另選平均／份數。没有total或paid-toggle DOM。原生radio提供鍵盤方向鍵，不假裝ARIA tabs。兩种UI／報告都結算優先；英文進階Share不使用Equal share。

以下低階函式與舊calculateBill保留相容／回歸，不把舊手填總額介面當成目前產品入口。

- parseAmount(raw,precision,{allowZero=false,emptyAsZero=false}) -> BigInt minorUnits。precision只0/2；先trim，再嚴格regex，split('.')，尾部padEnd(precision,'0')後BigInt；在轉換前限制raw≤32 UTF-16 units，超限錯誤，與FR01上限一致。總額/已付共用函式不同flags，不用parseFloat/Number轉換金額。
- formatAmount(minor,precision,locale) -> string。先BigInt整除/餘數，整數部分可交Intl.NumberFormat(zh-Hant/en,{maximumFractionDigits:0})格式化BigInt，二位fraction左補0後'.'相接。畫面用千分位，輸入框不用千分位。不做locale-aware輸入猜測。
- splitAmount(total,weights) -> BigInt[]；total>0，weights是2–50個0..1000安全整數；Number只表示有界權重與index。
- settle(shares,paid) -> {balances:BigInt[],transfers:Array<{fromIndex,toIndex,amount:BigInt}>}。驗精確長度、非負BigInt、合計同額，輸入不mutation。off模式不呼叫settle。
- calculateBill(draft) -> result；僅舊內部相容，不由v2 app呼叫。其手填total>0／可選paid／mismatch gate僅保留舊core測試。錯誤不含使用者原始姓名。
- buildReport(result,locale) -> string；固定格式和LF；各控制消費同一result/同一函式，不用DOM innerText組報告。報告份數使用本次有效權重：平均模式一律1，不顯示隱藏的份數草稿；份數模式才用使用者份數。

## 分配的獨立可驗證算法

weights總和W>0；對每人算product=total*BigInt(weight)，base=product/W，remainder=product%W。remaining=total−sum(base)，由remainder降序、index升序排序，前remaining人各加1。remaining小於人數，零權重餘數0且不會在合法remaining範圍內額外分得錢。勿每人各自round而破壞總和。

例total=10000（100.00）、weights=[1,1,1]：base[3333,3333,3333]、remaining1，結果[3334,3333,3333]。total=1、weights=[1,1,1]結果[1,0,0]。total=10001、weights=[1,2,0]：base[3333,6667,0]，remainders[2,1,0]，結果[3334,6667,0]。

settle按人員建立順序將負balance絕對值列入debtors，正balance列creditors；取兩端min，保存正amount，扣完一端移指標。迴圈最多n−1個transfer，守恆驗證每人 paid−share + outgoing − incoming = 0。不使用未獲證明的最小筆數宣稱。

## 控制器

清楚區分原字串draft与驗證後result；先使resultRevision失效，再處理任何input/change/add/remove事件。copy/download handler重驗revision；clipboard await完成時若來源改變，舊成功與失敗通知都忽略，不更動新結果。報告view以readonly textarea或pre.textContent，可手動複製。人名不是property key；不能把__proto__等名稱放一般object key作資料分桶。

最多50人，排序可在主執行緒同步執行；不得採Worker只是為了假進度。無資產下載、匯入、持久化或網路取消情境；取消N/A需寫理由，真Blob與clipboard仍按使用者動作及資源生命週期測試。

清除保留workflow，reset三人paid0、weight1、equal、precision2，focus name-1。模式共用姓名／付款／精度；進階mode/weight保留且快速不覆寫，任何修改立即使舊輸出失效。test/quick.test.mjs覆蓋固定例、300快速＋300份數不變量、兩語報告標籤與順序；controller adapter驗證revision、拒絕fallback、Blob及欄位關聯，不當作真browser。

## 證據與參考

- [Splitwise費用分配說明](https://kb.splitwise.com/balances-and-expenses/what-are-different-ways-i-can-split-an-expense)：證明相似工作已有替代方案，不是本產品演算法或需求量的證據。
- [ECMAScript BigInt](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-bigint-objects)：整數運算；必須實測目標瀏覽器BigInt/Intl行為。
- [ECMA-402 NumberFormat](https://tc39.es/ecma402/#numberformat-objects)：顯示格式，不拿格式化字串回做算術。

最大餘數和平手規則是本產品明確決策。以固定案例及守恆不變量驗收，不用同一函式算expected。

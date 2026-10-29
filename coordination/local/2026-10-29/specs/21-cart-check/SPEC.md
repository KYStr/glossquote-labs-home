# 折扣與免運試算 — 既有規格保存

Task ID: `labs-21-cart-check` · Spec ID: `spec-21-cart-check`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求：折扣與免運試算

狀態 SPEC_ONLY；尚無可操作網站。

## 使用者問題

線上購物顯示「再買滿多少免運」，容易只看見省下的運費，忽略加購本身的價格。使用者想比較目前購物籃和加一件/一組商品後的最終付款金額，並看清額外花費或實付差額。

## MVP 成果

使用者能手動建立最多30列購物項目，輸入單價和數量；看自動小計、百分比折扣、固定券、免運門檻和運費如何組成實付。可以輸入一個加購商品/組的金額，依完全相同規則重算並比較差額。門檻按折前或折後判斷由使用者選擇，預設折後，說明不同商家規則可能不同。

以固定例子檢查誤導風險（數值皆為同一未指定幣別）：900.00 購物籃、1,000.00 折後免運門檻、80.00 運費；100.00 加購令實付980.00變1,000.00，淨多花20.00；50.00加購仍未免運，實付1,030.00，淨多花50.00。畫面不可只報「省下80.00運費」。

## 內容

- 商品名稱、單價、數量、行小計；名稱僅本機文字。
- 全籃百分比折扣與固定折價券，可分別為零。
- 可選免運門檻、折前/折後 basis、運費。
- 基準與加購情境分欄展示商品淨額、是否免運、運費、實付、加購成本與實付差額。
- 百分比折扣先以整數分計算「折扣金額」，再四捨五入到分（0.5 分一律進位）；接著扣固定折價券，最後判斷免運與加上未折抵運費。例：0.05 × 10% 的折扣是 0.5 分，先進位為 0.01，因此商品折後為 0.04。
- 價格採自行輸入、無預設貨幣符號；FAQ 需說明此為單一貨幣的數學試算，所有輸入必須使用同一貨幣與同一店家假設。
- 全表複製、清除、錯誤定位；任何編輯即過期結果。

## 不包含

讀購物車/網站、掃描收據、商家/API串接、銀行/信用卡、稅金、會員折扣、跨店組合、匯率、優惠券搜尋、法規承諾、帳戶、付款或真的下單。


---

## 原文件 TECHNICAL.md

# 技術規格：折扣與免運試算

狀態：SPEC_ONLY。此文件定義所有計算、上限和錯誤。

## 精確金額表示及限制

所有金額皆以非負整數 BigInt cents。沒有幣別選擇器；同一購物籃各數值必須由使用者以同一幣別輸入，畫面輸出固定兩位小數且不暗示特定幣別。單價原始字串最多 16 UTF-16 code units；trim 外側 whitespace 後最多16字元且必須符合 ^[0-9]+(?:\.[0-9]{1,2})?$，解析後範圍 0..999999999 cents（即 9,999,999.99 個貨幣單位）。前導零可；正負號、逗號、科學記號、非 ASCII 數字拒絕。原始字串在上限內但 trim 後為空，回 ROW_INCOMPLETE；超出原始長度、trimmed grammar 不符時回 INVALID_PRICE。

每列 quantity 是 1..1000 正整數字串，原始長度最多4 UTF-16 code units且只含 ASCII 數字，允許前導零，不 trim 空格；空字串回 ROW_INCOMPLETE，超過4或非整數格式回 INVALID_QUANTITY。購物列數 1..30，任何空列不跳過。商品名稱原始最多256 UTF-16 code units，必須先檢查 raw length，超出回 NAME_RAW_TOO_LONG；再 trim 後若為空回 ROW_INCOMPLETE，非空時最多80 UTF-16 code units，拒絕 C0/C1 controls。price 欄原始長度在上限內但 trim 後為空，回 ROW_INCOMPLETE；非空而不符合數字語法才回 INVALID_PRICE。欄位缺 key、錯型別或未知 key 屬於 schema 錯誤，回 INVALID_REQUEST。最大商品小計為 30 × 999999999 × 1000 = 29,999,999,970,000 cents（299,999,999,700.00 個貨幣單位）；所有 additions 使用 BigInt。

所有金額/百分比文字先檢查未 trim 的 raw code-unit 上限，再 trim 外側 whitespace，再驗 trimmed grammar/value；不可先 trim 無界字串。百分比 raw 最多8 code units，trim 後須符合 ^[0-9]+(?:\.[0-9]{1,2})?$，數值0..100。轉為 basis points：整數百分數乘100，小數右補至2位。固定券使用與價格相同的 ASCII decimal grammar、最多18個 raw code units 和最多18個 trimmed code units、最多2位小數；其值範圍 0..29,999,999,970,000 cents，即不得超過最大合法購物籃總額。這是固定券的數值上限，原始字串長度上限則是18，兩者不是同一限制；超字串長度或格式回 INVALID_FIXED_COUPON，超值回 FIXED_COUPON_TOO_LARGE。固定券大於當時折後商品小計可接受，最終商品淨額 floor at zero。

運費原始最多16 code units，trim 後使用相同 ASCII decimal grammar，值 0..9999999 cents（99,999.99 個貨幣單位）。門檻可空；非空時 raw/trim 後最多18 code units，值 0..最大購物籃小計。空門檻表示沒有免運方案，即使購物籃為零仍照常使用運費輸入。超出各自 raw/trim 字串上限或格式回對應 INVALID_SHIPPING/INVALID_THRESHOLD。

可選加購只有一件或一組的單一金額，沿用單價原始/trim 字串限制、精度與數值範圍；名稱原始最多256 UTF-16 code units，trim 後必填、最多80並拒絕 C0/C1 controls。加購價格零合法。加購加入後的總量可比最大基準小計多最多一個單價，不溢位，全部 BigInt。

## Exact request / errors

calculateCart(request) 只接受 prototype 恰為 Object.prototype 或 null 的 plain object。Reflect.ownKeys 必須精確為 items,percentOff,fixedCoupon,freeShippingThreshold,thresholdBasis,shipping,addOn；各欄必須 own enumerable data property，不接受 symbol/non-enumerable unknown key 或 getter/setter。items 必須是 dense Array，prototype 恰為 Array.prototype，Reflect.ownKeys 除 length 外只有連續的0..length-1 enumerable data indices；hole/custom property/symbol/subclass 都回 INVALID_REQUEST。每列為 prototype Object.prototype 或 null 的 plain object，Reflect.ownKeys 精確為 name,price,quantity，值皆為 string，欄位是 enumerable data property。其他金額欄位用 string，空門檻用空字串，thresholdBasis 僅 pre-discount 或 post-discount，addOn 為 null 或精確 plain object {name,price}（prototype Object.prototype 或 null，Reflect.ownKeys/descriptor 同樣精確；兩欄為 own enumerable data property）。拒絕未知欄位、缺欄位、錯型別及非 plain object。

成功為 {ok:true,value:{items,discount,baseline,addOnScenario,summary}}，ok 為 boolean。基準 items 每列精確為 {name,unitPriceCents,quantity,lineCents}；name 是 trim 後字串，quantity 是 1..1000 的整數 Number，所有 cents 為 BigInt。discount 是 {percentOffBasisPoints,fixedCouponRequestedCents}，兩欄都是 BigInt（basis points 0n..10000n，另一欄是 cents）。baseline 精確為 {items,subtotalCents,percentOffBasisPoints,percentageDiscountCents,afterPercentCents,fixedCouponRequestedCents,fixedCouponAppliedCents,merchNetCents,thresholdCents,thresholdBasis,thresholdMeasureCents,qualifiesFreeShipping,shippingInputCents,shippingChargedCents,finalTotalCents}；items 是上述 dense row array，basis points 為 BigInt，cents 欄位為非負 BigInt，thresholdCents/thresholdMeasureCents 為 BigInt 或 null，thresholdBasis 為 pre-discount/post-discount 字串，qualifiesFreeShipping 為 boolean。fixedCouponAppliedCents=min(fixedCouponRequestedCents,afterPercentCents)。無門檻時 thresholdCents 與 thresholdMeasureCents 為 null，qualifiesFreeShipping=false。addOnScenario 是 null 或同樣使用上述型別的精確物件 {items,subtotalCents,percentOffBasisPoints,percentageDiscountCents,afterPercentCents,fixedCouponRequestedCents,fixedCouponAppliedCents,merchNetCents,thresholdCents,thresholdBasis,thresholdMeasureCents,qualifiesFreeShipping,shippingInputCents,shippingChargedCents,finalTotalCents,addOn:{name,priceCents,quantity}}；其中 items 是基準列後追加加購列，addOn.name 為字串、priceCents 為 BigInt、quantity 恰為整數 Number 1。summary 精確為 {baselineFinalTotalCents,addOnFinalTotalCents,addOnPriceCents,differenceCents}；baselineFinalTotalCents 為 BigInt，未啟用 addOn 時後三欄皆 null，啟用時三欄皆 BigInt 且 differenceCents=addOnFinalTotalCents-baselineFinalTotalCents，可負可零可正。失敗為 {ok:false,error:{code,row,field}}，ok 為 boolean false；error.code 為固定錯誤碼字串、row 為購物列 1-based 正整數 Number/null、field 為 items/name/price/quantity/percentOff/fixedCoupon/freeShippingThreshold/thresholdBasis/shipping/addOn 或 null。不得回傳輸入值。固定錯誤碼：INVALID_REQUEST、TOO_FEW_ITEMS、TOO_MANY_ITEMS、ROW_INCOMPLETE、NAME_RAW_TOO_LONG、NAME_TOO_LONG、CONTROL_CHARACTER、INVALID_PRICE、PRICE_TOO_LARGE、INVALID_QUANTITY、INVALID_PERCENT、INVALID_FIXED_COUPON、FIXED_COUPON_TOO_LARGE、INVALID_THRESHOLD、INVALID_SHIPPING、INVALID_ADD_ON。

錯誤次序：request schema、列數、購物列逐列從上到下、percentOff、fixedCoupon、threshold、thresholdBasis、shipping、addOn。購物列每欄依 name、price、quantity。只回報首個錯誤，不能產生部分結果。field/row 非相關錯誤取 null。

## 金額算法

對每列先求 lineCents=unitPriceCents×quantity；subtotalS 是所有 lineCents 的 BigInt 加總。percent basis points b 先表示為 BigInt，範圍 0n..10000n。先計 percentageDiscountP= floor((2×S×b + 10000)/(2×10000))，其中常數亦以 BigInt 表示；即折扣金額以 cents 計算並四捨五入至最近一分、half-up；再令 afterPercent=max(0n,S-P)。不得先算 S×(1−p) 再把折後剩餘金額 round 到分，兩者半分時會不同。fixed coupon requested C 隨後扣除，fixedCouponApplied=min(C,afterPercent)，merchNet=afterPercent-fixedCouponApplied；不會形成負餘額、不退現金。百分比折扣只算商品小計，運費不參與任何折扣。

freeShippingThreshold 空時 qualifies=false。若 thresholdBasis=pre-discount，measure=S；若 post-discount，measure=merchNet（百分比與固定券都扣完）。非空且 measure >= threshold 時有效運費為0，否則為輸入 shipping。finalTotal=merchNet+effectiveShipping。

基準與加購情境獨立呼叫同一 pure calculation。加購情境把一行名稱/價格/數量1附加到 items，重新計算 subtotal、百分比券、固定券和免運。差額為 addOnFinalTotal−baselineFinalTotal。正數顯示「加購後多付」該金額；負數顯示「加購後少付」其絕對值；零顯示實付相同。另始終顯示加購價格。此差額包含加購本身，不得把免運差額單獨稱為節省。

固定例（數值皆為同一未指定幣別）：無折扣 S=900.00、threshold=1,000.00(post)、shipping=80.00，baseline=980.00。addOn=100.00 使 merch=1,000.00、ship=0、final=1,000.00、difference=+20.00；addOn=50.00 使 merch=950.00、ship=80.00、final=1,030.00、difference=+50.00。折前 threshold=1,000.00 時也要按 900.00/1,000.00 分別判斷門檻；不得默認商家必採某一方式。半分例：subtotal=0.05（5 cents）、percent=10.00%，百分比折扣金額為0.5 cent，half-up到1 cent，因此 afterPercent=0.04（4 cents）。不能先 round 0.05×90%=0.045 得0.05。

## 前端狀態、顯示與複製

計算成功後顯示逐列小計、subtotal、percentage discount、fixed coupon、商品淨額、門檻採用金額/是否達標/運費和實付。百分比折扣是先算折扣金額並以 half-up 四捨五入到整分，再扣固定券；例如小計 5 cents × 10% 得到半分折扣，先四捨五入成1 cent，折後剩4 cents。不得把折後餘額 4.5 cents 先四捨五入。加購啟用時顯示上述第二套數字及淨差。金額格式化僅在輸出轉成字串，例如固定兩位分，不使用浮點參與比較。

任何編輯、增加/刪除項目、門檻 basis 或加購開關改變都 revision++，立即清空兩方案及報告並 disable copy。主操作驗證全表；copy callback 需檢查 revision 和 latest request id。剪貼簿缺失/拒絕時提供 readonly text fallback，不自動下載。clear/pagehide/reload 清除所有輸入、輸出和 request；沒有 browser storage。


---

## 原文件 UX-SEO.md

# 介面、雙語文案與 SEO：折扣與免運試算

狀態：SPEC_ONLY；實際頁面與 SEO 尚未建立。

## Product App 介面

主視圖首先展示問題本身：目前購物籃要付多少？若加一件又要付多少？先輸入購物明細，折扣/運費就在其下，計算後兩情境並排（手機則上下），不要把加購結果只藏在「省了多少」卡片。

桌面：名稱和語言；項目表；百分比/固定券；免運門檻金額 + 達標依據選擇 + 運費；現有實付區；明確可選的加購情境與單件/一組價格；差額。手機單欄排列，輸入在上、基準結果與加購結果相鄰，差額完整可見。320px 無整頁橫向捲動。

明確標示「這是手動試算，商家折扣/免運規則請自行確認」和「未計稅金」。門檻選項旁寫明折前/折後都可能依商家設定而異；預設折後但使用者可改。差額標籤明確寫「已包含加購價格」。不要只用顏色標出省/多付；同時用正負文字和金額。

## 中文搜尋內容

Title：折扣與免運試算：加購後實際多付或少付多少 | GlossQuote
Description：輸入商品、折扣、折價券和運費，再試算加購門檻商品後的最終實付。把商品成本一起算進差額，不只看免運金額；在瀏覽器本機計算。
H1：折扣與免運試算
Intro：先算現在要付多少，再加入一件商品重新計算，確認免運後是否真的划算。

## English search content

Title: Free Shipping Calculator: Check the True Cost of Adding an Item | GlossQuote
Description: Compare your current cart with an add-on after discounts and shipping. See the actual out-of-pocket difference, including the extra item price, using a local browser calculation.
H1: Discount and free-shipping calculator
Intro: Compare the current total with an added item and see whether reaching free shipping changes what you actually pay.

## 可見 FAQ

雙語頁至少回答：門檻折前或折後？視商家規則而定，本工具明確選擇；折價券如何套用？先全籃百分比、再固定券、商品淨額最低零；有包括稅/匯率嗎？沒有；加購後的差額算了商品錢嗎？是，淨差包含加購價格；會連線讀購物車嗎？不會，只算手動輸入且本頁不保存。

## SEO 發布界線

preview noindex,nofollow。production 僅 M2 後使用 https://cart.glossquote.com/index.html 與 /en/index.html，互返 zh-Hant/en hreflang、x-default 繁中、正確 lang、canonical、title、description、OG。可用準確 WebApplication JSON-LD，不杜撰價格、評論、節省或結果排名。實際 robots/sitemap/404/headers 由 docs/RELEASE.md 及 live 驗證決定。


---

## 原文件 ACCEPTANCE.md

# 驗收規格：折扣與免運試算

狀態 SPEC_ONLY；所有案例 NOT_RUN。核心 A 用固定 expected 整數 cents，不能引用被測試函式來算 expected。

## A：核心/金額/狀態案例

1. 一列 10.00×2（同一未指定幣別）→ subtotal 2000 cents。
2. 30列每列合法最高單價與數量1000 → subtotal精確為29,999,999,970,000 cents，不溢位。
3. 第31列 → TOO_MANY_ITEMS；0列 TOO_FEW_ITEMS。
4. 欄位 key 缺漏或型別錯誤 → INVALID_REQUEST；raw 長度在上限內且欄位存在時，name trim 後為空、price trim 後為空、quantity 為空字串 → ROW_INCOMPLETE；raw 長度超限依 TECHNICAL.md 的長度錯誤優先；不跳過空白列。
5. 單價整數、1位及2位小數都依分解析；1.2=1.20。
6. 非空的 1.001、逗號、正負號、科學記號、Unicode數字 → INVALID_PRICE；空 price 由 A4 判為 ROW_INCOMPLETE。
7. 原始輸入字串 `9999999.99` 接受；`10000000.00` → PRICE_TOO_LARGE。帶逗號的原始字串始終 INVALID_PRICE。
8. quantity 1/1000 接受；0、1001、2.0、負數、5位字串拒絕。
9. 商品名稱 80 UTF-16 units接受、81拒絕；control字元拒絕。
10. percent 0.00/100.00接受，100.01/負值/1.001/空值拒絕。
11. 1000 cents×0.05% = 0.5 cent，half-up折扣為1 cent。
12. S=10001 cents，10.00%=1000.1 cents，折扣=1000 cents。
13. S=10005 cents，10.00%=1000.5 cents，折扣=1001 cents；另測 S=5 cents（0.05 個貨幣單位）×10.00%=0.5 cent，折扣 half-up 為1 cent，afterPercent=4 cents（0.04）。
14. 固定券大於 afterPercent → merchNet=0，不成負數；shipping照門檻規則決定。
15. 最大固定券範圍接受；超過最大購物籃上限 → FIXED_COUPON_TOO_LARGE。
16. 全籃折扣順序百分比先、固定券後；結果符合公式，稅與運費未折。
17. threshold空 → 不免運；shipping仍照輸入收取。
18. 明確 threshold=0 合法並按 measure>=0 達標；不能把空白轉成0。
19. 折前threshold：S=90000 cents、afterDiscount=80000、threshold=85000 → 達到，運費=0。
20. 折後threshold：同樣金額與門檻 → 未達，收取輸入運費。
21. 門檻相等時達標（>=），差一分未達。
22. shipping 原始輸入字串 `99999.99` 接受；`100000.00` 拒絕。帶逗號的原始字串始終 INVALID_SHIPPING。
23. shipping不折扣；percent及fixed券只算商品 subtotal。
24. 用固定案例900/1000/80，加購100 → baseline980、after1000、差+20，不得聲稱省80。
25. 同上加購50 → after1030、差+50，門檻仍未達。
26. baseline950、threshold1000、shipping80、addon50 → baseline1030、scenario1000、差-30；差額顯示少付30且仍列加購價格50。
27. addOn加入後重新計算 percentage discount 和固定券，不把基準券額凍結。
28. thresholdBasis enum 只接受 pre-discount/post-discount；未知字串拒絕。
29. request/item/addOn exact schema：缺鍵、多鍵、錯型別、symbol/non-enumerable key、accessor、非 plain prototype → INVALID_REQUEST；輸出成功物件也須符合 TECHNICAL.md 列出的完整 exact schema。
30. sparse items array、非 Array.prototype、額外自訂屬性或 symbol → INVALID_REQUEST，不得跳過 hole。
31. 合法項目後接第2列錯誤 → 首錯指向第2列，不顯示部分計算。
32. baseline 與啟用加購時的 scenario 分別驗算：afterPercentCents − fixedCouponAppliedCents + shippingChargedCents = 該方案 finalTotalCents；不以只含差額的 summary 代替構成金額。
33. 金額輸出固定兩位小數、使用同一幣別假設且不附帶特定符號；例如 1005 cents → 10.05，沒有浮點尾數。
34. 惡意HTML品名以純文字顯示，不執行。
35. 任一輸入、門檻basis、加購資料變化即清空結果/報告並停 copy。
36. copy stale promise 與逆序 request 不得更新新的 revision。
37. clipboard missing/reject 提供可選文字，不觸發下載。
38. clear/pagehide/reload 清除資料，沒有 storage restore。
39. 成功結果精確區分 fixedCouponRequestedCents 與 fixedCouponAppliedCents；baseline/addOnScenario 各自有完整 subtotal、折扣、門檻、運費、finalTotal 欄位；summary 的 baseline/add-on total、add-on price 與 signed difference 皆依 schema 保留，addOn=null 時僅 add-on 相關 summary 欄位為 null。

## B：雙語真瀏覽器流程

- 中文與英文各輸入一個900.00購物籃、運費80、門檻1000、折扣0，加購100；核對實付980→1000及多付20。
- 兩語各用加購50，核對仍收80運費、實付1030、多付50。
- 至少一語選折前threshold，另一語選折後threshold，以同一數據看差異；預設顯示折後。
- 兩語加入百分比券和固定券，檢查折扣順序與商品淨額；shipping不打折。
- 輸入錯誤價格/空行/超量後確認錯誤欄 focus、無舊結果；修正後可重新計算。
- 320px、200% 縮放、鍵盤、中文 IME/貼上、copy success/fallback 都需人工觀察。
- Network 與 Storage 檢查本頁不發網路資料、不保存購物輸入；無法觀察的原生/讀屏/設備項目列 NOT_RUN。
- reload/pagehide後輸入與結果清空；兩語首頁導航 link 的 URL 正確。

## M1 門檻

所有 A、npm test、npm run check、npm run build 通過，且兩語主要 B 流程/320px必要互動通過。正式站、Cloudflare、首頁與外部審查不是 M1，保留 NOT_RUN。主代理獨立驗收後才放行來源發布。


---

## 原文件 TASKS.md

# 任務與里程碑：折扣與免運試算

本輪只實作 M1/T00。M2/M3 未放行。

## M1/T00：雙語本機 MVP

交付：TECHNICAL.md 核心運算、雙語靜態 UI、ACCEPTANCE 全 A、自動 check/build、必要真瀏覽器 B。主要用例須精確呈現額外購物成本與最終差額。

允許路徑：本產品 public/index.html、public/en/index.html、public/robots.txt、public/styles/**、public/js/**、scripts/**、test/**、package.json、.gitignore 與本產品必要設定；進度/交接可更新本資料夾 README.md、START-HERE.md、TASK-ENTRY.md、HANDOFF.md、project.json 與 docs/RELEASE-CANDIDATE.md。證據僅孵化器根 .runs/cart-check/m1-<date>-<id>/**；不可留購物內容。根 git 和其他工具資料夾不允許修改。

命令：Node.js 24.x；npm test、npm run check、npm run build；dev 優先綁 127.0.0.1:4201。若該埠被佔用，不得停止或重用未知程序；用 `server.listen({host:'127.0.0.1',port:0})` 讓作業系統指派可用 ephemeral port，並記錄實際埠及 URL。Spike 優先用 127.0.0.1:5201，佔用時同樣使用該 listen 方式取得 OS 指派的 loopback ephemeral port。長檢查前後跑根 AGENTS environment guard。

停止條件：公式、coupon cap、門檻基準或 oracle 不一致；需新增網路/持久化/依賴/付費服務；要改根/兄弟路徑；OS 指派的 loopback port 仍無法啟動；環境 guard drift；憑證或真實購物個資意外出現。不得為埠衝突停止既有程序。先停並告知主代理。

非目標：GitHub、SEO production、Cloudflare、DNS、首頁、其他工具。

## M1 凍結與主代理獨立驗收

回報 actual files, commands/exits, Node/npm, environment fingerprints, case evidence, browser steps, known risks, NOT_RUN。凍結後 owner 釋放。主代理檢查公式與獨立 B 用例；未放行前不開始 M2。

## M2：公開來源和 production candidate（需主代理放行）

只有主代理明確放行後開始。M2 固定 production candidate 並發布 reviewed source 到獨立公開 repo，不部署 live host。

Allowed paths：凍結 M1 核心演算法與功能行為，不得修改 public/js/core/** 或其語義測試；只可新增/修改 package.json、scripts/** production helpers、project.json、HANDOFF.md、docs/RELEASE.md、docs/RELEASE-CANDIDATE.md、wrangler.jsonc。允許為正式發布修改 public/index.html 與 public/en/index.html 的 SEO head、同語首頁連結，新增/修改 public/404.html、public/_headers、public/robots.txt、public/sitemap.xml 或其生成器；不得藉此改核心計算、輸入語義或 UI 流程。production output 在本工具 dist-production/**；source copy、manifest、ZIP/evidence 僅孵化器根 .runs/github-publish/glossquote-labs-cart-check/**。不操作根 git、共用首頁或兄弟工具。

Commands：npm test、npm run check、npm run build、npm run build:production、npm run check:production、node scripts/manifest.mjs；source ZIP解壓至乾淨副本後 npm test、npm run check:production、npm run build:production。固定 commit ZIP用 git -C <reviewed-repo-copy> -c core.autocrlf=false archive --format=zip --output <archive.zip> <commit> 或等效方法，禁止改全域/系統 Git設定。解壓後逐檔比對固定 commit Git blob bytes/hash，再從解壓副本重建並比 production manifest。

Exact acceptance：preview noindex/nofollow，固定 production origin https://cart.glossquote.com；雙語內容/title/description/canonical/zh-Hant/en/x-default/hreflang/JSON-LD/sitemap/robots一致；production 404真404、無SPA fallback，MIME與安全headers符合隱私契約。所有命令exit0；https://github.com/KYStr/glossquote-labs-cart-check 實查PUBLIC、remote HEAD等於固定commit；ZIP逐Git blob相符且乾淨解壓副本重測/重build通過。

Non-goals：Cloudflare、DNS、首頁。Stop：任何必要命令失敗、visibility/HEAD不符、ZIP與commit bytes不符、輸出含secret/購物資料/.runs/dist/node_modules/兄弟產品、要新增credential/permission或host不是固定origin。保存證據並回報主代理，不force-push。

## M3：免費 Cloudflare/首頁（主代理負責）

只有主代理序列操作，候選 host cart.glossquote.com，使用既有免費 Cloudflare 授權；產品對話不可讀取/擴大憑證。

Allowed paths：本工具 project.json、HANDOFF.md、docs/RELEASE-CANDIDATE.md 和已核准部署設定；首頁僅主代理改 tool-projects/00-home/catalog.json 及首頁必要 generated/release 檔案，不更動其他工具。

Commands/checks：本工具 npm run check:production；Cloudflare實際部署必須用root approved workflow，記錄字面 command/tool version/exit且不輸出token。live兩語HTTPS /index.html均200；未知路徑404且無SPA fallback；核對MIME、CSP/security headers、固定SEO/canonical/hreflang/robots/sitemap與production bytes。主代理真瀏覽器跑折扣順序、免運折前/後門檻、900/1000/80加購100與50，確認淨差+20/+50，檢查輸入變更失效和copy。工具live通過後才新增首頁published entry；首頁依現行流程執行 npm.cmd run build:production、npm.cmd run check:generated:production、npm.cmd run prepare:production，再走既有部署workflow，實測中英首頁入口及工具同語言回鏈。

Exact acceptance：source commit/deploy version/正式URL/Homepage source和deploy version各自記錄；首頁兩語顯示工具及正確語言 URL，工具回首頁同語言。交付外審包狀態 awaiting external review；收到外部確認或修正復驗後才可標 complete。

Non-goals：付費服務、改DNS/040141.xyz、讀取或新增credentials/permissions、改其他首頁內容。Stop：需新權限/token/費用、live計算/SEO/HTTP不符、homepage部署bytes不符；留下具體證據並報主代理。


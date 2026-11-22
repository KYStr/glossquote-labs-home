# 股票損益計算 / Stock Profit Calculator

**MAINTENANCE_DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-stock-profit-calculator-20261109` · 2026-11-11 · v2

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

台股投資人賣出一檔股票後，常發現券商 App 顯示的損益和自己用買賣價差估的金額對不起來，差額就藏在買賣兩次手續費、最低手續費、折讓與賣出證交稅裡。此工具讓使用者在估算交易成本或對帳時，輸入買入價、賣出價、股數（股或張）與自己券商的費率參數，得到逐項列出的淨損益、報酬率與理論保本賣出價，每一筆費用都可手算核對。保本價是按分計算的模型門檻，不可直接用於委託。

- 桌面。投資人對照券商對帳單，逐項核對買入手續費、賣出手續費、證交稅與淨損益。
- 行動。盤中快速估一筆零股或當沖交易的來回成本與兩平點，不連線、不登入。

使用情境為參數化試算。手續費與標準模式稅率可改，資料只保留在目前頁面草稿。當沖稅率採下述適格條件及有效期。非目標包括投資建議與股價預測。

## scope

MVP 為單一買進、單一賣出（可部分賣出）的台股現股損益模型。買進與賣出各收一次手續費（費率 × 折讓，最低費下限），賣出另課證券交易稅。現股當沖模式限使用者確認適格的普通現股沖銷，買賣均須符合本規格 1000 股標準交易單位。輸出毛額、兩次手續費、證交稅、賣出淨額、賣出部分成本、淨損益、報酬率與理論保本賣出價。

參數依據於 2026-11-11 重讀，來源見下文。

- 手續費率預設 0.1425%，每筆最低手續費預設 NT$20，皆為可編輯的示例值。券商可自訂費率、折讓和每筆最低費用並申報備查。第 94 條以費率逾 0.1425% 為通知門檻，一般應於委託前通知並留存紀錄。使用者依券商的實際約定填寫。 [證交所營業細則第 94 條](https://twse-regulation.twse.com.tw/TW/law/DOC01.aspx?FLCODE=fl007304&FLNO=94)
- 普通股票證券交易稅預設 0.3%，以賣出成交價格課徵，由賣方負擔。standard 模式允許自訂稅率。 [證券交易稅條例第 2 條](https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=G0340078)
- 現行規定至 2027-12-31，適格上市或上櫃普通股票在同券商、同帳戶、同營業日以現款買進與現券賣出，對同一標的的相同成交數量沖銷時，賣出匹配部分可適用 0.15%。使用者須依券商及交易所規定確認帳戶、標的、交易方式和時段適格。零股交易排除於適用範圍。買進 2000 股、賣出 1000 股時，符合條件的匹配量為 1000 股。工具只依使用者確認與數量試算，無法判定實際交易資格。 [證券交易稅條例第 2 條之 2](https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=G0340078) · [證交所當日沖銷交易專區](https://www.twse.com.tw/zh/products/system/day-trading.html)

非目標包括多筆買入的平均成本與分批賣出、融資融券與資券當沖、股利與除權息、證所稅申報、ETF／權證／期貨的專屬費率表、即時行情、券商帳戶連結、委託報價和券商正式對帳單。費用尾數處理各券商實務可能不同，本工具採下文的試算規則，實際收費以券商對帳單為準。

已與 registry 的既有預案比對，本案與最相近者的實質差異如下。

- 股票平均成本計算機接受按成交順序輸入的多筆交易，以 FIFO 核算剩餘成本及逐筆已實現損益。股票損益計算以單次買賣估算兩邊手續費、最低費、證交稅及理論保本門檻。 [股票平均成本計算機固定規格](https://github.com/KYStr/glossquote-labs-home/blob/879cad568897c5413f8e556311d5314c7b7e8a1b/docs/specs/stock-average-cost/SPEC.md)
- compound-interest-calculator 是本金、利率、期間的複利成長模型；本案是單次台股交易的手續費、稅與已實現損益，沒有期間複利。
- 同批 tax-included-converter 是統一發票營業稅的含稅／未稅換算；本案的稅是賣出證交稅，費率、課徵時點與法源都不同。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「買進：價格、數量、單位 / Buy: price, quantity, unit」
- 欄位或說明「賣出：價格、數量、單位 / Sell: price, quantity, unit」
- 欄位或說明「費用參數：手續費率、手續費折讓、每筆最低手續費、證交稅模式、證交稅率 / Cost parameters: fee rate, fee discount, minimum fee, transaction tax mode, transaction tax rate」
- 「計算損益 / Calculate profit & loss」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 選擇「現股當沖 / Cash day trade」時，在模式旁顯示未預勾的「我確認這筆交易符合現股當沖資格 / I confirm this trade qualifies for cash day trading」。鄰接說明為「同券商、同帳戶、同營業日、同一合格普通股票，並以合格帳戶、交易方式及時段沖銷相同股數。買賣均須為 1000 股的整批，現行優惠至 2027-12-31。」／“Confirm the same broker, account, trading day and eligible common stock, matching cash buy and sell quantities under eligible account, trade and session rules. Both legs must be in multiples of 1,000 shares. The current reduced rate applies through 31 Dec 2027.”
- 數量不符時顯示「現股當沖的買賣數量均須為 1000 股的整批。請調整數量，或切回標準模式填寫適用稅率。」／“Cash day trading here requires both quantities to be multiples of 1,000 shares. Adjust the quantities or switch to standard mode and enter the applicable tax rate.”。未勾選時顯示「請確認當沖資格，或切回標準模式填寫適用稅率。」／“Confirm eligibility or switch to standard mode and enter the applicable tax rate.”。錯誤與相關數量欄或確認欄關聯。
- 「損益明細 / Profit & loss breakdown」先摘要淨損益與報酬率，再列逐項金額及「理論保本賣出價（不可作為委託報價）」／“Theoretical breakeven sell price (not an order quote)”。成功才顯示「下載報告 / Download report」。文字可手動選取。常駐揭露「本工具供試算。費率、稅率與最低費可能調整，實際收費以券商對帳單為準。」／“Use this tool to estimate costs. Rates and minimum fees may change. Refer to your broker’s statement for actual charges.”

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"buyPrice":"100","buyQty":"1000","buyUnit":"share","sellPrice":"110","sellQty":"1000","sellUnit":"share","feeRatePct":"0.1425","feeDiscount":"1","minFeeTwd":"20","taxMode":"standard","taxRatePct":"0.3","dayTradeConfirmed":false}` 並聚焦首來源欄。切出 day、載入範例或編輯任一交易腿價格、數量、單位時，清除資格確認。確認狀態變更使舊結果與下載失效，依 dirty 流程重新執行。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。欄位順序固定如下，驗證、錯誤回報與結果都依此序。

| 欄位 | 文法 | 範圍 | 預設 |
| --- | --- | --- | --- |
| buyPrice | ASCII 十進數，最多小數 2 位 | 0.01–999,999.99（元／股） | "100" |
| buyQty | ASCII 十進整數 | 1–999,999 | "1000" |
| buyUnit | 枚舉 "share"（股）／"lot"（張，1 張 = 1000 股） | — | "share" |
| sellPrice | 同 buyPrice | 0.01–999,999.99 | "110" |
| sellQty | ASCII 十進整數 | 1–999,999 | "1000" |
| sellUnit | 同 buyUnit | — | "share" |
| feeRatePct | ASCII 十進數，最多小數 4 位（單位 %） | 0–1 | "0.1425" |
| feeDiscount | ASCII 十進數，最多小數 3 位 | >0 且 ≤1（1 = 無折讓，0.6 = 6 折） | "1" |
| minFeeTwd | ASCII 十進整數（元） | 0–99,999 | "20" |
| taxMode | 枚舉 "standard"／"day"（現股當沖） | — | "standard" |
| taxRatePct | ASCII 十進數，最多小數 4 位（單位 %） | 0–1 | "0.3" |
| dayTradeConfirmed | boolean | true／false，僅 day 讀取確認值 | false |

十進數文法：`^\d+(\.\d+)?$`，無正負號、空白、指數、前置小數點或尾隨小數點；整數文法 `^\d+$`。前置零不禁止（值相同）。raw 容量上限（UTF-16 code units）：價格欄 9、數量欄 6、feeRatePct 8、feeDiscount 5、minFeeTwd 5、taxRatePct 8、枚舉欄 8。

驗證順序。先以 SCHEMA 檢查整體形狀和型別。除 `dayTradeConfirmed` 為 boolean 外，其餘欄位均為字串。依上表逐一檢查字串容量 INPUT_LIMIT → 未成對 surrogate UNICODE → 空字串 EMPTY → 文法（十進數 DECIMAL_FORMAT、整數 INTEGER_FORMAT、枚舉 ENUM）→ 範圍 RANGE。布林欄位通過型別檢查即可進入跨欄驗證。

跨欄驗證依下列順序取首錯。整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆為 null。成功回 `{ok:true,result}`。資源或 Worker 失敗回固定 INTERNAL／WORKER_ERROR。

1. 正規化後的賣出股數若大於買入股數，回 SELL_EXCEEDS_BUY，field="sellQty"。
2. day 模式中，正規化後的買入與賣出股數各自須為 1000 的正整數倍。按買、賣順序檢查並回 DAY_TRADE_ROUND_LOT_REQUIRED，field 為第一個不符的 `buyQty` 或 `sellQty`。`share` 與 `lot` 只是數量表示法。
3. day 模式中，若 `dayTradeConfirmed` 為 false，回 DAY_TRADE_CONFIRMATION_REQUIRED，field="dayTradeConfirmed"。standard 模式略過第 2、3 步。

計算（全部以精確有理數運算，價格先轉為整數分、費率與折讓轉為精確十進分數；不使用浮點累加）。有效股數 = qty ×（unit 為 lot 時 1000，否則 1）。`rhu(x)` 表示對精確有理數 x 做四捨五入至整數，定義為 floor(x + 1/2)，負數亦同（即 −6.5 → −6）。

1. buyGross = buyPrice × buyShares；buyFee = max(rhu(buyGross × feeRatePct/100 × feeDiscount), minFeeTwd)。**最低費在折讓計算與四捨五入之後適用**：先算折讓後金額、進位到整數元，再與最低費取大。buyTotal = buyGross + buyFee（買入總成本）。
2. 通過驗證後，day 模式以 0.15% 作用於匹配的賣出量，`taxRatePct` 輸入仍照常驗證。standard 模式採 `taxRatePct`。結果以 `effectiveTaxRatePct` 回報模型採用的稅率（數值，單位 %）。
3. sellGross = sellPrice × sellShares；sellFee 與 buyFee 同式（以 sellGross 計）；sellTax = rhu(sellGross × 有效稅率/100)，無最低額、不打折。sellNet = sellGross − sellFee − sellTax。
4. costBasisSold = buyTotal × sellShares / buyShares（精確分數，不先進位）。netProfitLossExact = sellNet − costBasisSold；netProfitLoss = rhu(netProfitLossExact)（整數元）。returnPct = netProfitLossExact / costBasisSold × 100，取小數 2 位，進位方式同 rhu（floor(x×100 + 1/2)/100）。
5. `breakevenPrice` 定義為使 `net(P) ≥ costBasisSold` 的全域最小正整數分 P，輸出為 P/100 元。`net(P)` 依第 3 步代入 P/100 元與 `sellShares`，保留最低費與獨立進位。用下述有界精確搜尋求值，允許理論價高於輸入價格上限 999,999.99 元。
6. remainingShares = buyShares − sellShares。

結果物件採固定欄位與型別。

| 欄位 | 型別及契約 |
| --- | --- |
| buyShares、sellShares、remainingShares | 整數股數 |
| buyGross、buyTotal、sellGross、sellNet、costBasisSold | 兩位小數的金額字串。costBasisSold 以 rhu 取至分後輸出，其他計算使用未捨入的精確成本。 |
| buyFee、sellFee、sellTax、netProfitLoss | 兩位小數的金額字串。原整元 rhu 規則適用，輸出尾數 `.00`。 |
| breakevenPrice | 兩位小數的理論每股金額字串 |
| breakevenPriceIsOrderQuote | boolean，固定 false |
| effectiveTaxRatePct、returnPct | 數值百分比。returnPct 依公式取至兩位小數，畫面顯示兩位。 |

金額字串符合 `^-?(0|[1-9][0-9]*)\.[0-9]{2}$`，零值規範為 `"0.00"`，不使用負零、加號、指數或群組分隔符。畫面一律標示新台幣元，維持兩位小數及完整字串精度。整元淨損益非零時用文字標明獲利或虧損。整元淨損益可能捨入至零而報酬率仍非零，兩值皆照規格顯示。

一般股票在 100 元至未滿 500 元，TWSE 委託價升降單位為 0.50 元。範例的理論價 `"100.59"` 不在該價格級距的委託格點。模型淨額於 100.50 元為 `"100055.00"`，於 101.00 元為 `"100553.00"`，成本為 `"100143.00"`。這兩個格點僅供核對模型與市場報價的差異。 [證交所營業細則第 62 條](https://twse-regulation.twse.com.tw/TW/law/DOC01_print.aspx?FLCODE=FL007304&FLNO=62)

固定下載 `stock-profit-report.json`。內容為 result 的 compact JSON，object own keys 按 UTF-16 code units 升序遞迴排列，array 保留原順序。金額以 JSON 字串逐字保留，股數和百分比用 ECMAScript JSON number 序列化，委託價標記以 JSON false 序列化。UTF-8 無 BOM，末尾單一 LF。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。機器值與檔案 bytes 不因語言切換而改變。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/stock-profit-calculator/`。src/core.mjs 負責驗證、推導和格式化。價格與整分金額用 BigInt，費率、折讓和分攤用 BigInt 分子／分母成對保存，僅在規定的進位點才捨入。金額在核心出口轉成固定兩位字串。Worker 傳回字串原值，UI 直接呈現或對字串作本地化分組與符號處理，禁止將金額轉成 Number 或經 parseFloat。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist。核心結果只依輸入，2027-12-31 的現行優惠期限由介面揭露並列入資格確認。

### 理論保本的有界搜尋

令 q 為賣出股數，a 為折讓後手續費率，b 為有效證交稅率（兩者均以比例計，介於 0 和 0.01），m 為每筆最低費用（整元），C 為未捨入的精確分攤成本（元）。分位 P 的賣出毛額 G=qP/100。未捨入淨額為

```text
L(G) = G − max(m, aG) − bG
     = min((1−a−b)G, (1−b)G−m)
```

對任意 x，`|rhu(x)−x|≤0.5` 元。`max(m, ·)` 的變動不超過輸入變動，所以取最低費後手續費的進位誤差仍至多 0.5 元。加計獨立捨入的稅，實際淨額滿足 `L(G)−1 ≤ net(P) ≤ L(G)+1`。

兩條線的斜率均至少 0.98。令 `I(x)=max(x/(1−a−b), (x+m)/(1−b))`。由於兩條線都須達到 x 才能讓其 min 達到 x，故 `L(G)≥x` 等價於 `G≥I(x)`。使用精確有理數計算：

```text
lo = max(1, ceil(100 × I(C−1) / q))
hi = max(lo, ceil(100 × I(C+1) / q))
```

任一正分位 P<lo 均有 L(G)<C−1，因此 net(P)<C。hi 使 L(G)≥C+1，故 net(hi)≥C。兩個逆向線性項的斜率至多 1/0.98，它們的 max 在相隔 2 元的 C−1 與 C+1 間增量至多 2/0.98。對 u≥v，`ceil(u)−ceil(v)≤ceil(u−v)`，把端點向上截在 1 也不會增大間距。因 q≥1，閉區間分位數 `hi−lo+1 ≤ 1+ceil(200/(0.98q)) ≤ 206`。

從 lo 到 hi 依整數分升序代回第 3 步，第一個使 net(P)≥C 的分位為全域最小。實際淨額可能因兩項費用同時進位而下跌。測例中 49.00 元與 51.00 元都達標，且各自低一分都不達標。50.00 元的淨額降到 48.00 元，所求分位是 49.00 元。二分搜尋和只核對相鄰分位均不足以證明結果。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算損益」，畫面與完整報告符合核心 fixtures，包括當沖資格、部分賣出、最低費、理論保本標籤與精確分值。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、跨欄錯誤順序、全域最小保本（含非單調與至多 206 個分位）和 controller 狀態案例。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。schemaVersion 2 含 29 個字面核心案例、4 個 controller 案例、2 組價位反證及 2 份匯出樣本。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。expected 由規格算式獨立推導。

| 案例 ID | 驗證行為 |
| --- | --- |
| `round-lot-profit` | 整股獲利；手續費 142.5 四捨五入為 143（half-up 對比向下捨） |
| `odd-lot-loss-min-fee` | 零股小額：折讓後低於最低費兩側皆收 20；證交稅 16.5 進位 17 |
| `day-trade` | 已確認且數量 2000 股為整批，採當沖稅率 0.15% |
| `partial-sell` | 部分賣出成本按比例分攤；賣費 370.5 進位 371 |
| `lot-units` | 張＝1000 股換算；同價買賣虧損等於全部成本 |
| `min-fee-applies` | 費用進位後（14）仍低於最低費，最低費在折讓與進位之後適用 |
| `zero-tax-rate` | 稅率 0 模型；買費 28.5 進位 29（half-up 對比銀行家捨入） |
| `custom-tax-rate` | 自訂稅率 0.1% 輸入路徑與虧損結果 |
| `prorata-basis` | 成本分攤為循環分數（10019/3），顯示與精確計算分離 |
| `sell-exceeds-buy` | 跨欄錯誤 SELL_EXCEEDS_BUY |
| `price-too-precise` | 價格小數 3 位 DECIMAL_FORMAT |
| `zero-discount` | 折讓 0 為 RANGE |
| `empty-sell-price` | 賣出價空白 EMPTY |
| `day-trade-share-1000`、`day-trade-lot-1000` | 1000 股與 1 張正規化結果相同 |
| `day-trade-partial` | 買 2 張、賣 1000 股，僅匹配的賣出量適用當沖稅率 |
| `odd-lot-standard` | 100 股在 standard 模式以 0.3% 試算，稅為 `"33.00"` |
| `day-trade-odd-lot-buy`、`day-trade-odd-lot-sell` | 錯誤欄位、兩腿優先序、勾選不能豁免數量要求 |
| `day-trade-unconfirmed`、`day-trade-confirmation-missing`、`day-trade-confirmation-type` | 未確認、缺欄與字串偽裝布林各自拒絕 |
| `day-trade-exceeds-buy`、`day-trade-tax-rate-invalid` | 股數超量先於適格錯誤，標準稅率欄在 day 仍驗證 |
| `nonmonotonic-breakeven` | 49.00、50.00、51.00 的非單調反例。206 個候選中第一次達標是 49.00。 |
| `large-precision` | 合法大額的成本分攤精確至 `"1001422987135770.01"`，核對匯出字面 bytes |
| `high-price-minimum-fee` | 費稅、最高輸入價格及最低費上限。保本值 `"1212118.99"`，搜尋區間 203 個分位。 |
| `unrounded-basis` | 精確成本 103/300 元。1.34 元的淨額 0.34 元，與成本顯示值相同但仍未達標。 |
| `positive-price-floor` | 正分位下界為 0.01 元。無費稅且等價買賣時淨損益為 `"0.00"`。 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |
| `state-day-confirmation-invalidated` | 當沖試算成功後變更賣出價，舊結果失效、勾選清除，再送出回未確認錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。state-day-confirmation-invalidated 先完成已確認的當沖試算，套用 edits 後確認草稿布林為 false，再次送出應得到未確認錯誤。每個 expected checkpoint 分別檢查狀態與下載權限。

另測剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。確認折讓後恰等於最低費、day 的資格勾選及撤銷會使結果失效、切換模式保留既有費率欄、部分賣出剩餘股數、保本淨額代回達標且所有更低正分位不達標。小額用從第 1 分起的離線窮舉交叉驗算，大額核對邊界證明及候選掃描。核對 100.50／101.00 模型淨額、兩語理論價標示，以及匯出欄位 `breakevenPriceIsOrderQuote:false`。

候選 gate（均 NOT_RUN）

- 於 `tools/stock-profit-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「股票損益計算」，title「股票損益計算｜Gloss Tools」，description「輸入台股買入價、賣出價與股數，逐項試算買賣手續費、證交稅、淨損益、報酬率與理論保本賣出價。」。英文 lang=en，H1 “Stock Profit Calculator”，title “Stock Profit Calculator | Gloss Tools”，description “Estimate brokerage fees, securities transaction tax, net profit or loss, return and the theoretical breakeven price for a Taiwan stock trade.”。兩頁靜態呈現操作、限制、FAQ，並常駐揭露試算用途與實際收費依券商對帳單。
- FAQ「如何設定最低手續費？」券商自訂每筆最低費並申報證交所備查。NT$20 是示例預設，請依券商約定修改。／“How do I set the minimum fee?” Brokers set and file their own per-order minimums with the TWSE. NT$20 is an example. Enter the minimum that applies to your broker and trade.
- FAQ。手續費折讓怎麼填？填你實際支付的比例：無折讓填 1、6 折填 0.6、2.8 折填 0.28。折讓只套用在手續費，證交稅不打折。 / How do I enter my fee discount? Enter the fraction you actually pay: 1 for none, 0.6 for 40% off. The discount applies to brokerage fees only, never to the transaction tax.
- FAQ「何時可用 0.15% 當沖試算？」現行優惠適用至 2027-12-31。限使用者已確認符合現股當沖條件，且本工具兩邊數量均為 1000 股的整批。零股請用標準模式。／“When can I estimate tax at 0.15%?” The current reduced rate applies through 31 Dec 2027. Confirm the cash day trade is eligible and enter multiples of 1,000 shares for both legs. Use standard mode for odd lots.
- FAQ「理論保本賣出價可直接用來委託嗎？」請查閱券商和交易所適用的委託規則。工具依每分試算的模型門檻可能不符合該股票的報價級距。／“Can I place an order at the theoretical breakeven price?” Check your broker’s and exchange’s order rules. This calculator searches in NT$0.01 steps, so its result may fall between valid order prices.
- FAQ。為什麼和券商 App 的損益不一樣？常見原因是折讓的結算方式（逐筆或按月退還）、費用尾數處理或最低費不同。請把參數改成你的券商條件再比對，實際收費以對帳單為準。 / Why does my broker app show a different figure? Usual causes are how discounts settle (per trade or monthly rebate), fee rounding, or a different minimum fee. Match the parameters to your broker; the statement governs.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://stock-profit-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

本次文件維護依 ST-01～04 修正。原始 [PR #244](https://github.com/KYStr/glossquote-labs-home/pull/244)、原 owner、原 claim 與原登記保留。另案修復 REG-01 後，正式 readiness 仍須由非作者核對固定文件的八節及字面案例。維護候選先依 `spec-corrections`、`exact-fixtures`、`provenance-and-scope` 交驗。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/stock-profit-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

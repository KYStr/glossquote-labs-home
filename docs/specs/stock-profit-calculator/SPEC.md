# 股票損益計算 / Stock Profit Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-stock-profit-calculator-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

台股投資人賣出一檔股票後，常發現券商 App 顯示的損益和自己用買賣價差估的金額對不起來，差額就藏在買賣兩次手續費、最低手續費、折讓與賣出證交稅裡。此工具讓使用者在下單前或對帳時，輸入買入價、賣出價、股數（股或張）與自己券商的費率參數，得到逐項列出的淨損益、報酬率與損益兩平賣出價，每一筆費用都可手算核對。

- 桌面。投資人對照券商對帳單，逐項核對買入手續費、賣出手續費、證交稅與淨損益。
- 行動。盤中快速估一筆零股或當沖交易的來回成本與兩平點，不連線、不登入。

使用情境為參數化試算。費率與稅率皆為可改輸入，預設值為下文查證的現行參數；資料只保留在目前頁面草稿。本工具不是投資建議，不預測股價。

## scope

MVP：單一買進、單一賣出（可部分賣出）的台股現股損益模型。買進與賣出各收一次手續費（費率 × 折讓，最低費下限），賣出另課證券交易稅；現股當沖模式把賣出稅率切為法定減半稅率。輸出毛額、兩次手續費、證交稅、賣出淨額、賣出部分成本、淨損益（元與 %）與損益兩平賣出價。

參數依據（2026-11-09 查證，來源見文末與 AUTHOR-CHECK.md）：

- 手續費費率預設 0.1425%。臺灣證券交易所營業細則第 94 條規定證券商得自訂費率標準、折讓及每筆最低費用並申報證交所備查；所訂費率逾成交金額 0.1425% 者，應於受託前通知客戶。此 0.1425% 是該條文的基準費率（費率標準依證券交易法第 85 條由證交所申報主管機關核定），實務上為各券商牌告原價，折讓由此往下打。故本工具將它定為可改輸入的預設，而非不可變常數。
- 每筆最低手續費預設 NT$20。**查證結論：最低費金額不是法定金額**，是券商依營業細則第 94 條自訂並申報備查的項目；NT$20 是整股交易的市場普遍約定（例如元大證券牌告「每筆手續費若不足 20 元，最低以 20 元計收」），零股各家常為 NT$1，部分券商另有 1 元優惠。因此本工具將它定為可改輸入，預設 20，SPEC 與頁面文字都標明「券商慣例、非法定」。
- 證券交易稅預設 0.3%，僅賣出課徵、賣方負擔：證券交易稅條例第 2 條第 1 款，公司發行股票稅率為千分之 3。稅率為可改輸入（例如股票型 ETF 為千分之 1，同條第 2 款的其他有價證券）。
- 現股當沖稅率 0.15%：證券交易稅條例第 2 條之 2，同一證券商受託買賣、同一帳戶、同一交易日、同種同量現股沖銷者，賣出稅率千分之 1.5，施行期間至民國 116 年 12 月 31 日（2027-12-31；2025-01-02 總統令公布修正延長）。資券當沖不適用，仍為千分之 3；本工具的當沖開關只模型化現股當沖。

非目標：多筆買入的平均成本與分批賣出、融資融券與資券當沖、股利與除權息、證所稅申報（現行停徵）、ETF/權證/期貨的專屬費率表（只能用自訂稅率近似）、即時行情、券商帳戶連結、把結果當券商正式對帳單。費用尾數處理各券商實務可能不同，本工具釘定下文單一規則並揭露，實際收費以券商對帳單為準。

已與 registry 的既有預案比對，本案與最相近者的實質差異如下。

- compound-interest-calculator 是本金、利率、期間的複利成長模型；本案是單次台股交易的手續費、稅與已實現損益，沒有期間複利。
- 同批 tax-included-converter 是統一發票營業稅的含稅／未稅換算；本案的稅是賣出證交稅，費率、課徵時點與法源都不同。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「買進：價格、數量、單位 / Buy: price, quantity, unit」
- 欄位或說明「賣出：價格、數量、單位 / Sell: price, quantity, unit」
- 欄位或說明「費用參數：手續費率、手續費折讓、每筆最低手續費、證交稅模式、證交稅率 / Cost parameters: fee rate, fee discount, minimum fee, transaction tax mode, transaction tax rate」
- 「計算損益 / Calculate profit & loss」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「損益明細 / Profit & loss breakdown」先摘要（淨損益與報酬率）再列逐項金額與損益兩平賣出價。成功才顯示「下載報告 / Download report」。文字可手動選取。頁面常駐揭露「試算結果不構成投資建議；費率、稅率與最低費可能調整，實際收費以券商對帳單為準 / Results are estimates, not investment advice. Rates and minimum fees may change; your broker's statement governs.」

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"buyPrice":"100","buyQty":"1000","buyUnit":"share","sellPrice":"110","sellQty":"1000","sellUnit":"share","feeRatePct":"0.1425","feeDiscount":"1","minFeeTwd":"20","taxMode":"standard","taxRatePct":"0.3"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

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

十進數文法：`^\d+(\.\d+)?$`，無正負號、空白、指數、前置小數點或尾隨小數點；整數文法 `^\d+$`。前置零不禁止（值相同）。raw 容量上限（UTF-16 code units）：價格欄 9、數量欄 6、feeRatePct 8、feeDiscount 5、minFeeTwd 5、taxRatePct 8、枚舉欄 8。

驗證順序。先 SCHEMA（整體形狀）。再依上表欄位序逐欄：容量 INPUT_LIMIT → 未成對 surrogate UNICODE → 空字串 EMPTY → 文法（十進數 DECIMAL_FORMAT、整數 INTEGER_FORMAT、枚舉 ENUM）→ 範圍 RANGE。全部欄位通過後才做跨欄檢查：有效賣出股數 > 有效買入股數時回 SELL_EXCEEDS_BUY，field="sellQty"。整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆為 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算（全部以精確有理數運算，價格先轉為整數分、費率與折讓轉為精確十進分數；不使用浮點累加）。有效股數 = qty ×（unit 為 lot 時 1000，否則 1）。`rhu(x)` 表示對精確有理數 x 做四捨五入至整數，定義為 floor(x + 1/2)，負數亦同（即 −6.5 → −6）。

1. buyGross = buyPrice × buyShares；buyFee = max(rhu(buyGross × feeRatePct/100 × feeDiscount), minFeeTwd)。**最低費在折讓計算與四捨五入之後適用**：先算折讓後金額、進位到整數元，再與最低費取大。buyTotal = buyGross + buyFee（買入總成本）。
2. 有效稅率：taxMode 為 "day" 時為 0.15%，taxRatePct 輸入仍照常驗證但不採用；為 "standard" 時用 taxRatePct。結果以 effectiveTaxRatePct 回報實際採用的稅率（%，數值）。
3. sellGross = sellPrice × sellShares；sellFee 與 buyFee 同式（以 sellGross 計）；sellTax = rhu(sellGross × 有效稅率/100)，無最低額、不打折。sellNet = sellGross − sellFee − sellTax。
4. costBasisSold = buyTotal × sellShares / buyShares（精確分數，不先進位）。netProfitLossExact = sellNet − costBasisSold；netProfitLoss = rhu(netProfitLossExact)（整數元）。returnPct = netProfitLossExact / costBasisSold × 100，取小數 2 位，進位方式同 rhu（floor(x×100 + 1/2)/100）。
5. breakevenPrice：使賣出淨額恰達 costBasisSold 的最小賣出價（元，2 位小數，即以「分」為步進）。定義為最小的正整數分 P，使 net(P) ≥ costBasisSold，其中 net(P) 以第 3 步同一費用模型代入賣出價 = P/100 元、股數 = sellShares 計算（含最低費與各步進位）。以此定義為準，不用近似公式回推；近似解只可作搜尋起點，最終值必須滿足定義且比它小 1 分的價格不滿足。恆存在（費率與稅率上限合計 < 100%）。
6. remainingShares = buyShares − sellShares。

結果物件欄位與型別固定：buyShares、sellShares、remainingShares（整數股數）；buyGross、buyTotal、sellGross、sellNet、costBasisSold（金額，2 位小數；costBasisSold 為精確分數以 rhu 取至分顯示，計算用精確值）；buyFee、sellFee、sellTax、netProfitLoss（整數元）；effectiveTaxRatePct（數值 %）；returnPct（數值，2 位小數）；breakevenPrice（金額，2 位小數）。金額在畫面上一律標示新台幣元；2 位小數金額以固定 2 位顯示（含尾隨零），整數元金額不帶小數。報酬率正負號如實呈現，不以顏色單獨表達賺賠（另加「獲利／虧損」文字）。

固定下載 `stock-profit-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，金額數值以其釘定小數位數序列化（2 位小數字段恰寫 2 位，整數欄位寫整數），末尾一個 LF、UTF-8 無 BOM。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/stock-profit-calculator/`。src/core.mjs 放純驗證、推導、格式化（金額與費率一律以 BigInt 有理數運算：分子／分母成對保存，或等價的整數分＋費率百萬分率表示；禁止以 IEEE-754 浮點直接累乘金額）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。核心不讀系統日期或時區：本工具無日期輸入，當沖施行期限（2027-12-31）只作頁面揭露文字，不參與計算分支，避免結果隨日期漂移。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算損益」，畫面和完整報告符合核心 fixtures（含當沖、部分賣出、最低費、兩平點），使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、跨欄 SELL_EXCEEDS_BUY 和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。13 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `round-lot-profit` | 整股獲利；手續費 142.5 四捨五入為 143（half-up 對比向下捨） |
| `odd-lot-loss-min-fee` | 零股小額：折讓後低於最低費兩側皆收 20；證交稅 16.5 進位 17 |
| `day-trade` | 當沖模式稅率 0.15%，輸入稅率被取代但仍驗證 |
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
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限（價格 999,999.99、數量 999,999、費率 1）、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證：折讓後恰等於最低費、稅率模式切換不改其他欄、部分賣出剩餘股數、兩平點代回費用模型恰達成本且低 1 分不達、損益為零（gross 相同且費用參數全 0 且最低費 0）時報酬率 0 且兩平點等於按比例成本價。

候選 gate（均 NOT_RUN）

- 於 `tools/stock-profit-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「股票損益計算」，title「股票損益計算｜Gloss Tools」，description「輸入台股買入價、賣出價與股數，逐項算出買賣手續費、最低手續費、證交稅、淨損益、報酬率與損益兩平賣出價；費率與稅率可依自己的券商調整。」。英文 lang=en，H1 “Stock Profit Calculator”，title “Stock Profit Calculator | Gloss Tools”，description “Work out a Taiwan stock trade line by line: buy and sell brokerage fees with the per-order minimum, securities transaction tax, net profit or loss, return %, and the breakeven sell price, with rates you can adjust to your broker.”。兩頁靜態呈現操作、限制、FAQ，並常駐揭露非投資建議與參數可能變動、以券商對帳單為準。
- FAQ。最低手續費 20 元是法律規定的嗎？不是。它是券商自訂並申報證交所備查的每筆最低費用，20 元是整股交易的普遍約定，零股常為 1 元；請依你的券商修改。 / Is the NT$20 minimum fee set by law? No. Each broker sets its own per-order minimum, filed with the TWSE; NT$20 is the common round-lot convention and odd lots are often NT$1. Adjust it to your broker.
- FAQ。手續費折讓怎麼填？填你實際支付的比例：無折讓填 1、6 折填 0.6、2.8 折填 0.28。折讓只套用在手續費，證交稅不打折。 / How do I enter my fee discount? Enter the fraction you actually pay: 1 for none, 0.6 for 40% off. The discount applies to brokerage fees only, never to the transaction tax.
- FAQ。當沖稅率 0.15% 一直都有嗎？只適用現股當沖（同券商、同帳戶、同日、同種同量），依證券交易稅條例第 2 條之 2 施行至 2027 年 12 月 31 日；資券當沖仍為 0.3%。 / Is the 0.15% day-trading rate permanent? It covers cash day trades only (same broker, account, day, stock and quantity) under Article 2-2 of the Securities Transaction Tax Act, in force through 31 Dec 2027; margin day trades stay at 0.3%.
- FAQ。為什麼和券商 App 的損益不一樣？常見原因是折讓的結算方式（逐筆或按月退還）、費用尾數處理或最低費不同。請把參數改成你的券商條件再比對，實際收費以對帳單為準。 / Why does my broker app show a different figure? Usual causes are how discounts settle (per trade or monthly rebate), fee rounding, or a different minimum fee. Match the parameters to your broker; the statement governs.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://stock-profit-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

參數來源（2026-11-09 查證）：臺灣證券交易所法規分享知識庫「臺灣證券交易所股份有限公司營業細則」第 94 條（費率自訂、折讓、每筆最低費用、申報備查與逾 0.1425% 之通知）；財政部法規共用系統「證券交易稅條例」第 2 條（股票千分之 3）與第 2 條之 2（當沖千分之 1.5 至 116 年 12 月 31 日，2025-01-02 修正公布）；財政部賦稅署「證券交易稅稅率表」（資料更新至 2026-05-31）同值；券商牌告最低費慣例（元大證券：不足 20 元以 20 元計）。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/stock-profit-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

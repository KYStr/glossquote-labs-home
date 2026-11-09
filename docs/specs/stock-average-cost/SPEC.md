# 股票平均成本計算機 / Stock Average Cost Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-stock-average-cost-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

分批買進同一檔股票、其間又賣掉一部分的投資人，手上有券商成交紀錄，要核對攤提後的剩餘成本與每筆賣出的實際賺賠，而不是接受券商 App 不透明的均價。

- 桌面。桌邊對著券商成交明細，依發生順序輸入最多 20 筆買賣，逐筆核對 FIFO 攤提與已實現損益。
- 行動。手機在下單前先試算某一費率下買進後的平均成本，不連任何券商帳號。

使用情境為試算與核對。資料只保留在目前頁面草稿，幣別不預設，金額一律以使用者輸入的計價單位計算。

## scope

單一檔股票、一份依時間排序的買賣清單、FIFO 成本攤提、可選統一手續費率的精確試算模型。非目標為串接券商或即時股價、計算證交稅／健保補充保費／股利所得、多檔股票或投資組合管理、融資融券與借券、除權息調整、技術分析或投資建議、把結果當券商對帳單或報稅文件。

已比對本 repo `docs/specs/` 全部預案與 `tools/` 既有工具，沒有股票、持股或平均成本類工具。最相近者的實質差異如下。

- 複利成長試算（`compound-interest-calculator`）：由本金與利率推未來值。此處是由實際成交序列攤提成本與已實現損益，不做任何成長假設。
- 房貸攤還試算（`mortgage-amortization`）：負債的分期攤還表。此處是資產批次的 FIFO 成本佇列，賣出才產生損益，兩者資料模型不相通。

判定規則由本文定義，無線上資料或外部服務依賴；沒有引用任何即時費率表，手續費率由使用者輸入，預設 0。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「手續費率（基點） / Fee rate (basis points)」：全清單共用一個費率，0 表示不計手續費。旁註明 100 基點 = 1%，以及買進計入成本、賣出自所得扣除的規則。
- 交易清單表格：一列一筆，欄位為「買／賣 / Side」、「股數 / Shares」、「每股價格 / Price per share」，可新增、刪除、調整順序（上移／下移按鈕，不用拖放）。列順序就是處理順序，介面不得自動排序。最多 20 列；達上限時新增按鈕停用並顯示上限說明。
- 「計算平均成本 / Calculate average cost」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 的 `fifo-sell-two-lots` 案例，明示範例並等待手動執行。
- 「持股摘要與賣出損益 / Holdings summary and sell results」先摘要（持股數、剩餘總成本、平均成本、已實現損益合計、手續費合計）再列細節：每一筆賣出一列（列號、股數、所得、攤提成本、已實現損益），以及剩餘批次表（股數、成本）。長表在有 label 的區域捲動。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、費率、列的新增／刪除／移動改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。持股為零時平均成本顯示「—」並附說明。損益為負以負號與文字標示，不只靠顏色。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄（賣超錯誤聚焦該賣出列的股數欄）。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"feeRateBps":"0","trades":[{"side":"buy","shares":"","price":""}]}` 並聚焦費率欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

**金額的精確表示（固定）**。所有金額在核心內一律以整數 µ 運算，1 µ = 0.0001 計價單位（萬分之一）。價格字串解析為 µ 整數（小數點後最多 4 位，右側補零至 4 位）。任何步驟都不得使用浮點數處理金額；股數與金額乘積、費率乘除一律用 BigInt 或等價的精確整數運算。四捨五入一律 round-half-up（恰好 .5 進位），且只在本文明示的三處發生：每筆手續費、部分攤提一批次時攤出的成本、平均成本。`roundHalfUpDiv(n,d) = floor((2n + d) / (2d))`，n、d 為非負整數。

**輸入欄位**（皆為字串，與表單原始值一致）。

- `feeRateBps`：手續費率，單位基點。raw 最多 4 字元。文法為 ASCII 十進整數字串，「0」或非零開頭，無空白／符號／小數／指數。範圍 0–1000（即 0%–10%）。預設 `"0"`。
- `trades`：陣列，1–20 筆，順序即處理順序，不得重排。每筆為恰含下列三欄的普通物件。
  - `side`：恰為 `"buy"` 或 `"sell"`，其他值 ENUM。
  - `shares`：股數。raw 最多 9 字元。文法同上 ASCII 整數字串。範圍 1–999,999,999。
  - `price`：每股價格。raw 最多 12 字元。文法為 ASCII 十進數：整數部 1–7 位數（「0」或非零開頭），可帶小數部「.」加 1–4 位數；無空白／符號／指數／千分位逗號。解析為 µ 後範圍 1–10,000,000,000（即 0.0001–1,000,000.0000）。

**驗證順序（固定，第一個錯誤即整份失敗，不回部分結果）**。

0. 整體形狀：input 非普通物件、含未知欄、trades 非陣列、任一 trade 非普通物件或欄位缺漏／多餘 → SCHEMA，field,row=null（trade 形狀錯誤時 field=null、row=該列 1-based 列號）。
1. `feeRateBps`：raw 超過 4 字元 INPUT_LIMIT；含不成對 surrogate UNICODE；空字串 EMPTY；文法不符 INTEGER_FORMAT；超出範圍 RANGE。field=`"feeRateBps"`，row=null。
2. `trades` 筆數：0 筆 EMPTY（field=`"trades"`，row=null）；超過 20 筆 ROW_LIMIT（field=`"trades"`，row=21）。
3. 逐列（列號 1 起，依輸入順序）：先 `side`（ENUM，field=`"side"`），再 `shares`（INPUT_LIMIT→UNICODE→EMPTY→INTEGER_FORMAT→RANGE，field=`"shares"`），再 `price`（INPUT_LIMIT→UNICODE→EMPTY→DECIMAL_FORMAT→RANGE，field=`"price"`）。錯誤的 row 為該列列號。
4. 全部欄位合法後，依序模擬（見下）；賣出股數大於當下持股 → OVERSOLD，field=`"trades"`，row=該賣出列列號。

整份失敗回 `{ok:false,error:{code,field,row}}`。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

**模擬與輸出語義（固定）**。

- 買進：成交金額 `amount = shares × priceµ`（µ 整數，精確）。手續費 `fee = roundHalfUpDiv(amount × feeRateBps, 10000)`。批次成本 `lotCost = amount + fee`。把 `{shares, costµ: lotCost}` 推入 FIFO 佇列尾端。
- 賣出：成交金額與手續費同上公式。所得 `proceeds = amount − fee`。成本攤提自佇列最前端（最早買進）起逐批扣減股數：自一批次攤出 q 股（該批次剩餘 s 股、剩餘成本 c µ）時，若 q = s，攤出成本恰為 c（整批結清，不許捨入誤差殘留）；若 q < s，攤出成本 = `roundHalfUpDiv(c × q, s)`，該批次剩餘成本為 c 減攤出成本、剩餘股數為 s − q。攤提跨越多批時逐批重複，直到賣出股數扣完。`costRelieved` 為各批攤出成本的精確整數和。已實現損益 `realizedPnl = proceeds − costRelieved`（µ 整數，可為負）。
- 每筆交易的手續費都計入 `totalFees`（µ 整數和）。
- 結果 `{sells, totalRealizedPnl, totalFees, totalSharesHeld, totalCostBasis, averageCostPerShare, remainingLots}`：
  - `sells`：依賣出發生順序，每筆 `{row, shares, proceeds, costRelieved, realizedPnl}`，row 為該賣出在 trades 中的 1-based 列號，shares 為整數，其餘為金額字串。
  - `totalRealizedPnl`：各筆 realizedPnl 的精確整數和，金額字串。
  - `totalFees`：全部交易手續費的精確整數和，金額字串。
  - `totalSharesHeld`：佇列剩餘股數總和（整數）。
  - `totalCostBasis`：佇列剩餘成本總和，金額字串。
  - `averageCostPerShare`：持股 > 0 時為 `roundHalfUpDiv(totalCostBasisµ, totalSharesHeld)` 以金額字串表示（即每股平均成本，4 位小數）；持股 = 0 時為 `null`。
  - `remainingLots`：佇列由舊到新，每批 `{shares, costBasis}`，shares 為整數，costBasis 為金額字串。空佇列為 `[]`。
- **金額字串格式（固定）**：µ 整數轉為十進字串，恰 4 位小數：整數部為 µ 除以 10000 的商（無千分位逗號），小數部為餘數左側補零至 4 位；負數加前置 `-`；零一律 `"0.0000"`，不得出現 `"-0.0000"`。機器值不隨 locale 改。

固定下載 `stock-average-cost-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/stock-average-cost/`。src/core.mjs 放純驗證、模擬、格式化，金額路徑只用 BigInt 整數運算，禁止 `Number` 浮點參與金額（股數計數與列號等非金額整數不在此限，但 shares × priceµ 的乘積必須走 BigInt）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果（尤其浮點誤差造成的金額錯誤）、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算平均成本」，畫面和完整報告符合核心 fixtures（含跨批次 FIFO 賣出與含費率案例），使用者取得對應產物。 |
| boundaries | 合法端點（20 筆、最小價格 0.0001、費率 0 與 1000）、剛好越界（21 筆、賣超 1 股）、第一個錯誤、列號和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；列的新增／刪除／移動在窄版可用。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion；損益正負不只靠顏色區分。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。10 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `single-buy` | 單筆買進、無費率，平均成本等於買價 |
| `fifo-sell-two-lots` | 賣出跨越兩個買進批次，FIFO 先攤完早批次 |
| `fee-on-buy` | 費率 143 基點，手續費四捨五入後計入批次成本 |
| `fee-buy-sell-flat` | 買賣同費率，全數賣出後持股零、平均成本 null |
| `relief-rounding-half-up` | 含費批次部分攤提的 .5 邊界四捨五入與平均成本進位 |
| `sell-all-loss-rebuy` | 虧損賣光後再買進，已實現損益為負且不影響新批次 |
| `oversell` | 賣出超過持股，OVERSOLD 指出賣出列 |
| `shares-fraction` | 股數帶小數，INTEGER_FORMAT 指出欄位與列 |
| `max-trades` | 恰好 20 筆合法輸入 |
| `too-many-rows` | 第 21 筆觸發 ROW_LIMIT |
| `state-dirty-error` | 先產出真結果，再改為賣超輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證價格 0.0001／0、股數 0、費率 1000／1001、價格小數第 5 位、整批結清時攤出成本恰等於批次剩餘成本（無殘差）、多次部分攤提後整批賣光時總攤提恰等於原始批次成本、負損益字串格式、零損益不帶負號。所有金額結果與 µ 整數模型逐位一致，不得出現浮點尾數。

候選 gate（均 NOT_RUN）

- 於 `tools/stock-average-cost/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「股票平均成本計算機」，title「股票平均成本計算機｜Gloss Tools」，description「依成交順序輸入買賣股數與價格，用 FIFO 攤提成本，算出持股平均成本與每筆賣出的已實現損益，可含手續費率。」。英文 lang=en，H1 “Stock Average Cost Calculator”，title “Stock Average Cost Calculator | Gloss Tools”，description “Enter buys and sells in order to track FIFO cost basis, average cost per share and realized profit or loss per sell, with an optional fee rate.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。賣出時成本怎麼攤？採 FIFO，先攤最早買進的批次；整批攤完時以該批剩餘成本全數結清。 / How is sell cost relieved? FIFO: the earliest buy lots are relieved first, and a lot that is fully relieved settles at exactly its remaining cost.
- FAQ。手續費怎麼算？每筆手續費 = 成交金額 × 費率，四捨五入到 0.0001；買進加進成本，賣出從所得扣除。費率以基點輸入，100 基點 = 1%。不含證交稅。 / How are fees calculated? Each trade's fee is its amount times the rate, rounded half-up to 0.0001; buy fees add to cost, sell fees reduce proceeds. The rate is entered in basis points (100 bps = 1%). Securities transaction tax is not included.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://stock-average-cost.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。規格任務 id 為 `labs-stock-average-cost-spec-20261109`，由主代理 register-spec（作者不自行執行 registry 指令）。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/stock-average-cost/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

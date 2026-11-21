# 租屋 vs 買房試算 / Rent vs Buy Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-rent-vs-buy-calculator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

準備買房的人，先輸入租金、房價、頭期款、房貸利率與三個年增率假設，看到第幾年買房開始比租屋划算，以及逐年的總成本比較表，再決定要不要繼續租。

- 桌面。桌面填上租金、房價、頭期款、房貸利率、比較年數、租金漲幅、房價漲幅與頭期款機會成本利率，逐步確認買房在哪一年追上租屋、以及每年的成本差。
- 行動。手機在看房現場核對一組假設下的損益平衡年數，不查詢任何即時資料。

使用情境為設計假設。資料只保留在目前頁面草稿。本工具是依使用者輸入假設的試算，不是財務建議或銀行報價。

## scope

固定年利率、固定年增率的年度模型：等額本息月付（內部逐月分攤）、租金按年複利成長、房價按年漲跌、頭期款機會成本按年複利。比較期即貸款期（年數同時是房貸年期與比較年數）。非目標為稅費／仲介費／裝修／維修／管理費、負擔能力審核（DTI）、逐月還款表顯示、即時利率查詢、多物件比較、賣房成本、把結果當財務建議或銀行報價、儲存設定檔。

已與本 checkout 的 `docs/specs/` 比對（2026-11-21），最相近者的實質差異如下。

- rent-budget（租金負擔能力）：給定收入，算每月負擔得起多少租金，是一次性的負擔能力上限。此處假設租金已知，比較租與買在多年內的總成本，產出損益平衡年數與逐年比較表。本 checkout 的 `docs/specs/` 內無 rent-budget 規格，僅在舊稽核清單見已部署站台路徑；生產承接前須對新鮮 registry 重查。
- mortgage-amortization（房貸還款表）：給定一筆貸款，產出逐月還款分攤表（本金／利息／餘額）與提前還款比較。此處房貸月付只在內部計算，不顯示逐月表；交付物是租買兩方案的損益平衡年數與年度總成本比較表。 [spec-mortgage-amortization](https://github.com/KYStr/glossquote-labs-home/blob/20455951df44c8465062cd64fb26363b02b6fd6d/docs/specs/mortgage-amortization/SPEC.md)（本 checkout 的基線 commit；連結僅供對照，生產前重查）
- breakeven-calculator（通用單位損益平衡）：固定成本與單位變動成本的單一損益平衡點。此處是雙方案、多年度的住宅成本比較，含租金成長、房價漲跌與頭期款機會成本三個年增率，不以單位成本計。本 checkout 的 `docs/specs/` 內無 breakeven-calculator 規格；生產承接前須對新鮮 registry 重查。

判定規則由本文定義，無線上資料或外部服務依賴。金額以新台幣標示，但算術與幣別無關。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「每月租金、房價 / Monthly rent and home price」
- 欄位或說明「頭期款、房貸年利率 / Down payment and annual mortgage rate」
- 欄位或說明「比較年數、租金年漲幅、房價年漲幅、頭期款機會成本年利率 / Horizon years, rent growth, home appreciation and opportunity cost rate」
- 「計算租買比較 / Calculate rent vs buy」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「損益平衡年數與總成本比較 / Breakeven year and total-cost comparison」先摘要再列細節：月付、損益平衡年數（或年限內未損益平衡）、比較期滿的租屋總成本、買房淨總成本與相差金額；再列逐年比較表，損益平衡那一年以文字及符號標示，不只用顏色。長表在有 label 的區域捲動。超過 25 列採 25 列分頁、上下頁可鍵盤操作，完整匯出不截斷。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"monthlyRent":"20000","homePrice":"10000000","downPayment":"2000000","mortgageRate":"2","years":"30","rentGrowthPct":"2","homeAppreciationPct":"2","opportunityCostPct":"3"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 欄位順序即驗證順序：monthlyRent、homePrice、downPayment、mortgageRate、years、rentGrowthPct、homeAppreciationPct、opportunityCostPct。每欄 raw 最多 12 字元，超限 INPUT_LIMIT；空字串 EMPTY；文法錯 INTEGER_FORMAT（整數欄）或 DECIMAL_FORMAT（比率欄）；範圍錯 RANGE；最後跨欄檢查頭期款，超額 DOWN_PAYMENT_EXCEEDS_PRICE，field 為 downPayment。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆為 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。
- 整數欄（monthlyRent、homePrice、downPayment、years）：ASCII 十進整數字串，「0」或非零開頭，無空白／符號／小數／指數。monthlyRent 1–1,000,000 元／月；homePrice 1–1,000,000,000 元；downPayment 0–1,000,000,000 元；years 1–40 年。
- 比率欄（mortgageRate、rentGrowthPct、homeAppreciationPct、opportunityCostPct）：ASCII 十進小數字串，整數部分「0」或非零開頭，可選小數點後 1 至若干位；rentGrowthPct 與 homeAppreciationPct 可選前置負號 `-`（其餘兩欄有負號即 DECIMAL_FORMAT）；「-0」視為 0。mortgageRate 0–30%，小數至多 4 位；rentGrowthPct −10–30%，小數至多 2 位；homeAppreciationPct −10–30%，小數至多 2 位；opportunityCostPct 0–30%，小數至多 2 位。
- 預設 monthlyRent 20000、homePrice 10000000、downPayment 2000000、mortgageRate 2、years 30、rentGrowthPct 2、homeAppreciationPct 2、opportunityCostPct 3。

模型（全部金額為整數元；比率為精確有理數；四捨五入皆為 half-up，.5 進位）：

1. 貸款本金 L = homePrice − downPayment（整數元）。期數 n = years × 12 個月。月利率 i = mortgageRate / 1200（精確有理數；mortgageRate 以百分比計）。
2. 月付 M：L = 0 時 M = 0；否則 M = round-half-up(L × i / (1 − (1+i)^(−n)))，i = 0 時 M = round-half-up(L / n)；再取 M = max(1, M)（L > 0 時月付至少 1 元）。
3. 內部逐月分攤（不顯示逐月表，只用於年度餘額與年度房貸支出）：第 m 個月利息 interest_m = round-half-up(B_{m−1} × i)（整數元，B 為期初餘額）；月付 payment_m = M，但最後一個月（第 n 個月）payment_n = B_{n−1} + interest_n（精確結清，可與 M 差數元）；若餘額提前歸零，之後月付為 0。本金部分 = payment_m − interest_m；B_m = B_{m−1} − 本金部分。最後餘額恆為 0。
4. 第 t 年（t = 1..years）：rentYear(t) = round-half-up(12 × monthlyRent × (1+g_r)^(t−1))，g_r = rentGrowthPct / 100；rentCumulative(t) = rentYear(1..t) 之和。mortgageYear(t) = 該年 12 個月 payment_m 之和。homeValue(t) = round-half-up(homePrice × (1+g_h)^t)，g_h = homeAppreciationPct / 100。balance(t) = B_{12t}（逐月分攤的整數餘額）。equity(t) = homeValue(t) − balance(t)（房價跌破餘額時可為負）。opportunityCost(t) = round-half-up(downPayment × ((1+r)^t − 1))，r = opportunityCostPct / 100；頭期款為 0 時恆為 0。buyCumulative(t) = downPayment + mortgageYear(1..t) 之和 + opportunityCost(t) − equity(t)。difference(t) = rentCumulative(t) − buyCumulative(t)，正值表示到第 t 年為止買房較便宜。
5. 損益平衡年數 breakevenYear = 使 difference(t) ≥ 0 的最小 t；若比較期內皆無，breakevenYear = null。verdict = breakevenYear 存在時 "buy"，否則 "rent"。totalRentCost = rentCumulative(years)；totalBuyNetCost = buyCumulative(years)；savingsAtHorizon = totalRentCost − totalBuyNetCost（正值表示期滿時買房較便宜，可為負）。
6. 機會成本只計在買房一側：買房把頭期款鎖進房子，租屋則假設頭期款以 opportunityCostPct 複利增值；模型以「買房淨成本加機會成本」呈現，不另在租屋側扣減，兩種寫法比較結果相同。損益平衡定義為首次交叉；difference 之後是否回落以表格逐年呈現，不另行斷言。

結果 `{monthlyPayment,breakevenYear,verdict,totalRentCost,totalBuyNetCost,savingsAtHorizon,yearly}`，yearly 每列 `{year,rentYear,rentCumulative,mortgageYear,homeValue,balance,equity,opportunityCost,buyCumulative,difference}`，皆為整數元（year 與 breakevenYear 為整數年；verdict 為 "buy" 或 "rent"；breakevenYear 可為 null）。按年順序。用一條比較表呈現，不用綠色暗示買房一定划算。

固定下載 `rent-vs-buy-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

錯誤訊息（雙語，{label} 為欄位雙語標籤，{raw} 為原輸入）：INPUT_LIMIT「{label}輸入過長。 / {label} input is too long.」；EMPTY「請輸入{label}。 / Enter {label}.」；INTEGER_FORMAT「{label}須為整數，你輸入的是「{raw}」。 / {label} must be an integer; you entered “{raw}”.」；DECIMAL_FORMAT「{label}格式不正確，你輸入的是「{raw}」。 / {label} has an invalid format; you entered “{raw}”.」；RANGE「{label}須介於 {min} 至 {max} 之間，你輸入的是「{raw}」。 / {label} must be between {min} and {max}; you entered “{raw}”.」；DOWN_PAYMENT_EXCEEDS_PRICE「頭期款不可超過房價，你輸入的頭期款是 {raw} 元。 / The down payment must not exceed the home price; you entered {raw}.」。

試算聲明（雙語，結果區上方固定顯示，不得刪改）：「本工具僅依你輸入的假設試算，不含稅費、仲介費、裝修、維修、管理費與房貸成數限制，不是財務建議或銀行報價。」/ "This tool estimates only from the assumptions you enter. It excludes taxes, agent fees, renovation, maintenance, management fees and loan-to-value limits, and is not financial advice or a bank quotation."

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/rent-vs-buy-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- 核心算術必須與整數元規則逐位一致：利息與年度金額用精確有理數或整數先乘後除再四捨五入，不得以二進位浮點數的近似月利率直接相乘後取整（浮點近似在恰為 .5 的利息上會取錯邊，見 AUTHOR-CHECK.md 的 taipei-typical 第 195 個月案例：餘額 4,432,080 元、精確利息 9,233.5 元，浮點近似會算成 9,233 元，正確為 9,234 元）。月付的年金因子可用高精度十進位，但結果必須與 fixtures 的整數月付一致。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算租買比較」，畫面和完整報告符合核心 fixtures，使用者取得對應產物；損益平衡年數、verdict 與逐年表一致。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據；零利率、零頭期款、全現金、一年期、房價下跌、無損益平衡的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；損益平衡年以文字及符號標示。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。13 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `taipei-typical` | 典型情境，第 6 年損益平衡 |
| `late-crossover` | 較晚交叉，第 12 年損益平衡 |
| `rent-wins-high-rate` | 高利率，30 年內無損益平衡，verdict rent |
| `zero-rate-zero-growth` | 零利率零漲幅，買房淨成本恆為 0（全手算） |
| `zero-down-payment` | 零頭期款，機會成本為 0，第 11 年損益平衡 |
| `full-cash-purchase` | 全現金購屋，月付 0 |
| `one-year-horizon` | 一年期，最後一月精確結清 |
| `falling-home-value` | 房價年跌 2%，15 年內無損益平衡 |
| `breakeven-year-one` | 第 1 年即損益平衡的邊界 |
| `down-payment-exceeds-price` | 頭期款超過房價，DOWN_PAYMENT_EXCEEDS_PRICE |
| `rate-out-of-range` | 房貸利率 31%，RANGE |
| `too-many-decimals` | 租金漲幅 3 位小數，DECIMAL_FORMAT |
| `rent-zero` | 月租金 0，RANGE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 years=1/40/41、mortgageRate=30/30.0001、rentGrowthPct=−10/30、downPayment 等於房價、downPayment 比房價多 1 元、月付四捨五入 .5 邊界、最後一月結清差額。所有已接受的餘額在期滿歸零；移除房價漲幅後買房淨成本不會變低。

候選 gate（均 NOT_RUN）

- 於 `tools/rent-vs-buy-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「租屋 vs 買房試算」，title「租屋 vs 買房試算｜Gloss Tools」，description「輸入租金、房價、頭期款、房貸利率與年增率假設，看到第幾年買房開始比租屋划算，以及逐年的總成本比較表。」。英文 lang=en，H1 “Rent vs Buy Calculator”，title “Rent vs Buy Calculator | Gloss Tools”，description “Enter rent, home price, down payment, mortgage rate and growth assumptions to see the breakeven year and the year-by-year total-cost comparison.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。機會成本是什麼意思？買房把頭期款鎖進房子，租屋則假設這筆錢以你填的年利率複利增值；比較時這筆放棄的增值算在買房的成本裡。 / What is opportunity cost? Buying locks the down payment into the house, while renting assumes that money grows at the rate you enter; the forgone growth counts as part of buying's cost.
- FAQ。過了損益平衡年就一定一直划算嗎？不一定。損益平衡年是買房第一次追上租屋的那一年；之後是否回落，請看逐年比較表的差額欄。 / Once past the breakeven year, is buying always cheaper? Not necessarily. The breakeven year is the first year buying catches up with renting; check the difference column of the yearly table for later years.
- FAQ。這是買房建議嗎？不是。這只是依你輸入的假設試算，不含稅費、仲介費、裝修、維修、管理費與房貸成數限制，也不是銀行報價。 / Is this buying advice? No. It only estimates from the assumptions you enter, excludes taxes, agent fees, renovation, maintenance, management fees and loan-to-value limits, and is not a bank quotation.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://rent-vs-buy-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/rent-vs-buy-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

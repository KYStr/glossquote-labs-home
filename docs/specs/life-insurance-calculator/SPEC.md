# 壽險保額試算 / Life Insurance Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-life-insurance-calculator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md) · [預案品質與補庫說明](../../SPECIFICATION-STOCK.md)

## goal

一名有扶養責任的家庭成員（例如兩個年幼孩子的家長），想知道萬一自己收入中斷，家人需要多少壽險保額才夠。他手上有年收入、房貸餘額、其他負債、現有保單與存款數字，但不知道怎麼把這些數字合成一個保額，也分不清網路上「10 倍年收入」與「需求法」兩種算法的差別。

- 桌面。桌面填上年收入、扶養年數與人數、房貸與其他負債、喪葬費用、現有保障與可動用資產，確認需求法各項加總與扣抵後，得到建議保額，並看到 10 倍年收入對照值與兩者差距。
- 行動。手機在與家人討論保障缺口時核對一份短的試算表，不啟動任何投保流程。

使用情境為教育試算。資料只保留在目前頁面草稿；結果不是保險建議、招攬或商品推薦。

## scope

需求法（needs approach）試算：以整數新台幣加總收入替代、房貸餘額、其他負債、喪葬與處理費用、扶養人教育費用，再扣抵現有壽險保障與可動用資產；10 倍年收入法則只作對照值顯示，不參與建議保額。非目標為保費報價、保單商品比較或推薦、核保與健康告知、通膨或投資報酬折現、稅務與遺產計算、即時匯率或外部費率查詢、把結果當保險建議或招攬。

判定規則由本文定義，無線上資料或外部服務依賴。方法與數字的出處釘版如下，皆已查核：

- 需求法公式：收入替代（年收入 × 扶養年數）＋ 房貸餘額 ＋ 其他負債 ＋ 喪葬與處理費用 ＋ 教育費用（每位扶養人費用 × 扶養人數），再減現有壽險保障與可動用資產。此即 DIME 法（Debts 債務、Income 收入、Mortgage 房貸、Education 教育）的加總結構，加上喪葬費用、再扣抵既有保障與資產；DIME 經典公式為 Debts + Income + Mortgage + Education，扣抵既有保障與儲蓄是理財規劃的標準調整。來源：Sophia Learning〈Determine Your Life Insurance Needs〉（https://app.sophia.org/tutorials/determine-your-life-insurance-needs）與 4LifeInsurance〈The DIME method for sizing life insurance〉（https://www.4lifeinsurance.com/guides/dime-method/）。
- 10 倍年收入對照值：年收入 × 10。LIMRA 與 Life Happens 2021 年 Insurance Barometer Study 的法則：「A good rule of thumb is consumers should have 10 times their salary」。來源：LIMRA 新聞稿（https://www.limra.com/en/newsroom/news-releases/2021/2021-insurance-barometer-study-reveals-common-misconceptions-that-prevent-americans-from-getting-life-insurance-they-know-they-need/?ref=goodcover.ghost.io）。
- 喪葬與處理費用預設值 NT$350,000：內政部《臺閩地區殯葬消費行為調查研究》國人平均治喪費用約 35 萬元（引述見 https://www.sunshines.com.tw/funeral-expense-details）。此為可改寫的預設值，不是法定金額。
- 本工具不做折現：需求法各項以名目金額直接相加，不扣通膨、不計投資報酬。此為刻意簡化，FAQ 明示。

已與 run-6 去重紀錄比對，最相近者的實質差異如下。

- nhi-premium-calculator（依 run-6 去重紀錄的既有工具）：算的是應繳的國民健康保險費（保費金額），此處算的是身故後家人需要的壽險保額（保障金額），一為繳費、一為保障需求。
- compound-interest-calculator：算資金隨時間複利成長。此處不做時間複利、不做折現，只做需求加總與扣抵。 [compound-interest-calculator](../compound-interest-calculator/SPEC.md)
- savings-goal-calculator：為存錢目標解每月應存金額（累積求解）。此處為既有保障缺口試算，不解每月儲蓄。
- retirement-withdrawal-calculator（同輪 run-6）：算退休後提領多久耗盡（消耗求解）。此處算身故保障需求，不算提領年限。
- 50-30-20-budget-calculator（同輪 run-6）：把月收入按比例分配到需求／想要／儲蓄。此處不分配收入，只算保額。
- rent-budget-planner：算租金可負擔上限。此處不算可負擔租金。
- mortgage-amortization：算房貸每期還款與攤還表。此處只把房貸「餘額」當作需求法的一項加總，不算還款計畫。 [mortgage-amortization](../mortgage-amortization/SPEC.md)
- debt-payoff-planner（同輪 run-6）：排多筆債務的清償順序與利息。此處只把負債餘額加總，不排清償順序、不算利息。
- salary-converter：做薪資單位換算。此處不換算薪資，只用年收入當輸入。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「年收入、扶養年數與人數 / Annual income, support years and dependents」
- 欄位或說明「房貸餘額、其他負債、喪葬與處理費用 / Mortgage balance, other debts and final expenses」
- 欄位或說明「每位扶養人教育費用、現有保障、可動用資產 / Education cost per dependent, existing coverage and liquid assets」
- 「計算建議保額 / Calculate recommended coverage」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「建議保額與需求明細 / Recommended coverage and needs breakdown」先摘要再列細節：建議保額、需求總額與五項明細、扣抵總額、10 倍年收入對照值、與對照值的差距、狀態（保障缺口／已足夠）。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 結果區上方固定顯示免責聲明（見 inputsOutputs 末段），兩語皆有；下載的報告內亦含同一聲明文字。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"annualIncome":"1200000","supportYears":"10","dependents":"2","educationPerChild":"500000","mortgageBalance":"3000000","otherDebts":"200000","finalExpenses":"350000","existingCoverage":"1000000","liquidAssets":"500000"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 全為 ASCII 十進整數字串，0 或非零開頭，無空白／符號／小數／指數，raw 每欄最多 8 單元。貨幣欄位單位皆為新台幣（NT$）整元，無小數。
- 欄位順序即驗證順序：annualIncome、supportYears、dependents、educationPerChild、mortgageBalance、otherDebts、finalExpenses、existingCoverage、liquidAssets。
- 範圍：annualIncome 0–99,999,999（年收入，NT$/年）；supportYears 0–40（扶養年數，年）；dependents 0–10（扶養人數，人）；educationPerChild 0–9,999,999（每位扶養人教育費用總額，非每年費用，NT$）；mortgageBalance 0–99,999,999（房貸餘額，NT$）；otherDebts 0–99,999,999（房貸以外的負債餘額，NT$）；finalExpenses 0–9,999,999（喪葬與處理費用，NT$）；existingCoverage 0–99,999,999（現有壽險保障，NT$）；liquidAssets 0–99,999,999（可動用資產，NT$）。
- 預設即重設值（見 userFlow）：annualIncome 1200000、supportYears 10、dependents 2、educationPerChild 500000、mortgageBalance 3000000、otherDebts 200000、finalExpenses 350000、existingCoverage 1000000、liquidAssets 500000。finalExpenses 預設 350000 的出處見 scope（內政部調查平均治喪費用約 35 萬元）；其餘預設為合成範例值，可改寫。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依上述欄位順序逐欄驗證。raw 超限 INPUT_LIMIT、文法 INTEGER_FORMAT、範圍 RANGE，field 即上述欄名。文法為 `^[0-9]+$`（ASCII 數字，至少一位；不接受負號、小數點、空白、千分位逗號）。
2. 主算法（需求法），全程整數精確運算（BigInt），無浮點、無捨入：
   - `incomeReplacement = annualIncome × supportYears`
   - `educationTotal = educationPerChild × dependents`
   - `needsTotal = incomeReplacement + mortgageBalance + otherDebts + finalExpenses + educationTotal`
   - `totalOffsets = existingCoverage + liquidAssets`
   - `recommendedCoverage = max(0, needsTotal − totalOffsets)`
3. 對照值（不參與建議保額）：`multipleBenchmark = annualIncome × 10`（LIMRA 10 倍年收入法則，見 scope）；`differenceVsBenchmark = recommendedCoverage − multipleBenchmark`（可為負數）。
4. 狀態：`recommendedCoverage == 0` 時 `status = "covered"`（已足夠），否則 `status = "shortfall"`（保障缺口）。
5. 結果 `{breakdown:{incomeReplacement,mortgageBalance,otherDebts,finalExpenses,educationTotal},needsTotal,offsets:{existingCoverage,liquidAssets,totalOffsets},recommendedCoverage,multipleBenchmark,differenceVsBenchmark,status}`。金額皆為整元新台幣；畫面顯示以每三位一組逗號分位、不帶小數，機器值不隨 locale 改。

免責聲明（逐字釘版，頁面結果區與報告內皆須出現）：

- 繁中：「本工具僅供教育試算參考，不構成保險建議、招攬或商品推薦。實際保額請諮詢合格保險業務員或理財顧問，並以保單條款為準。」
- 英文："This tool is an educational estimate only. It is not insurance advice, a solicitation, or a product recommendation. Consult a licensed insurance professional for advice on your own situation."

固定下載 `life-insurance-calculator-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/life-insurance-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算建議保額」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。15 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `typical-family` | 典型雙扶養家庭：需求法總額高於 10 倍對照值 |
| `single-no-dependents` | 無扶養、無房貸：需求法總額低於 10 倍對照值 |
| `already-covered` | 現有保障加資產超過需求總額：建議保額歸零 |
| `zero-income` | 年收入為零：收入替代為零，對照值為零 |
| `max-years-many-dependents` | 扶養年數與人數皆取上限 |
| `exact-offset-match` | 現有保障恰好等於需求總額：歸零邊界 |
| `all-zero` | 全部輸入為零 |
| `max-income-one-year` | 年收入取上限、扶養一年：對照值遠高於需求 |
| `zero-years-with-debts` | 扶養年數為零：需求只剩負債、喪葬與教育 |
| `decimal-income` | 不接受小數年收入 |
| `negative-debt` | 不接受負數負債 |
| `years-out-of-range` | 扶養年數 41 超出上限 |
| `dependents-out-of-range` | 扶養人數 11 超出上限 |
| `empty-mortgage` | 房貸餘額空白 |
| `income-too-long` | 年收入 9 位數：先判容量 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 needsTotal 恰好等於 totalOffsets、等於 totalOffsets+1、recommendedCoverage 為零時狀態為 covered、supportYears=0、dependents=0 時 educationTotal 為零（不論 educationPerChild）、全部欄位取上限。所有已接受的 recommendedCoverage 不為負數；移除任一扣抵後 recommendedCoverage 不會變小。

候選 gate（均 NOT_RUN）

- 於 `tools/life-insurance-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「壽險保額試算」，title「壽險保額試算｜Gloss Tools」，description「以需求法試算家人需要的壽險保額：加總收入替代、房貸、負債、喪葬與教育費用，再扣掉現有保障與資產，並以 10 倍年收入法則對照。僅供教育參考，不構成保險建議。」。英文 lang=en，H1 “Life Insurance Calculator”，title “Life Insurance Calculator | Gloss Tools”，description “Estimate the life insurance coverage your family needs with the needs approach: add income replacement, mortgage, debts, final expenses and education costs, then subtract existing coverage and assets, with a 10× income benchmark for comparison. Educational estimate only, not insurance advice.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。10 倍年收入法則和需求法有什麼不同？10 倍法則只用年收入乘 10，是快速對照；需求法按你家的負債、房貸、教育與既有保障逐項加總扣抵，建議保額以需求法為準。 / How do the 10× income rule and the needs approach differ? The 10× rule multiplies annual income by 10 as a quick benchmark; the needs approach adds up your debts, mortgage, education and final expenses, then subtracts existing coverage and assets. The recommended coverage follows the needs approach.
- FAQ。為什麼建議保額可能是 0？現有保障加可動用資產已大於或等於需求總額時，缺口為零，狀態顯示已足夠。 / Why can the recommended coverage be zero? When existing coverage plus liquid assets already meet or exceed the total need, there is no shortfall and the status shows covered.
- FAQ。扶養年數怎麼選？通常是收入需要被替代的年數，例如到最年幼的扶養人成年或完成學業為止；常見參考為 10 年，本工具允許 0–40 年。 / How do I choose the support years? Usually the number of years the income would need replacing, for example until the youngest dependent reaches adulthood or finishes education; 10 years is a common reference and this tool allows 0–40 years.
- FAQ。試算有考慮通膨或投資報酬嗎？沒有。各項以名目金額直接相加，不做折現或複利，這是刻意的簡化；實際規劃請諮詢專業人士。 / Does the estimate account for inflation or investment returns? No. Items are added at face value with no discounting or compounding, as a deliberate simplification; consult a professional for actual planning.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://life-insurance-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/life-insurance-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

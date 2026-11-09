# 信用卡還款試算 / Credit Card Payoff Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-credit-card-payoff-calculator-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

手上有卡債的人在繳款前，先用帳單上的餘額與 APR 確認：照每月固定金額要幾個月還清、總利息多少；或要在目標月數內還清，每月該繳多少；以及目前的繳法是不是連利息都還不到、永遠還不完。

- 桌面。桌面把餘額、APR 與兩種模式並排核對，比較固定月付與目標月數的結果與逐月明細。
- 行動。手機在看帳單時輸入餘額與 APR，得到還清月數與總利息，不連銀行、不登入。

使用情境為試算假設。資料只保留在目前頁面草稿。金額欄以「元」標示，實際運算一律整數分、幣別中立。

## scope

單張卡、單一固定 APR、月結循環利息的上界試算模型：利息每月按月初餘額計算，付款先沖利息再沖本金。兩種模式：固定每月還款金額推還清月數；目標月數以年金閉式公式推每月應繳，再以同一月結模擬驗證。非目標為連接銀行或匯入帳單、最低應繳金額規則、年費／違約金／滯納金、預借現金手續費、分段或變動利率、遲繳與寬限期、多張卡整合、債務協商或理財建議、把結果當銀行正式試算或核准。

已與本 repo `docs/specs/` 101 份預案比對，最相近者的實質差異如下。

- 有擔保房貸的本息攤還表（含寬限期、雙段利率、提前還款事件），且其 goal 明列非目標含信用卡與循環信用。此處是無擔保循環信用的還清試算，核心差異在永遠還不完偵測與目標月數反推月付。 [spec-mortgage-amortization](https://github.com/KYStr/glossquote-labs-home/blob/992da13d76a0c3c8b18ca1c07d54f2d23b2a51e3/docs/specs/mortgage-amortization/SPEC.md)
- 定存與儲蓄目標的複利成長（每月投入、利息滾入本金），方向是資產累積。此處是負債遞減，且利息是成本不是收益。 [spec-compound-interest-calculator](https://github.com/KYStr/glossquote-labs-home/blob/992da13d76a0c3c8b18ca1c07d54f2d23b2a51e3/docs/specs/compound-interest-calculator/SPEC.md)

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「欠款餘額、年利率 APR / Balance and APR」
- 欄位或說明「還款方式 / Payoff mode」：二選一「每月固定還款 / Fixed monthly payment」或「目標月數 / Target months」，依模式只顯示對應欄位。
- 欄位或說明「每月還款金額 / Monthly payment」（固定月付模式）、「目標月數（個月） / Target months」（目標月數模式）
- 「計算還款計畫 / Calculate payoff plan」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「還清月數與總利息 / Months to payoff and total interest」先摘要再列細節：摘要含還清月數、總利息、總付款、最後一期金額；目標月數模式另含「每月應繳 / Required monthly payment」。「每月還款明細 / Monthly schedule」長表在有 label 的區域捲動。超過 25 列採 25 列分頁、上下頁可鍵盤操作，完整匯出不截斷。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 永遠還不完時顯示錯誤訊息「每月還款不超過每月利息，餘額永遠不會減少 / The payment does not exceed the monthly interest, so the balance never goes down.」，不顯示任何排程。
- 頁面固定揭露「這是依上述模型的試算，實際帳單金額以發卡銀行結算為準；未含年費、違約金、預借現金與最低應繳規則。 / This is an estimate under the stated model. Your issuer's statement governs; fees, penalties, cash advances and minimum-payment rules are not modeled.」

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"balance":"50000.00","aprPercent":"15","mode":"payment","monthlyPayment":"3000.00","targetMonths":"24"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field 為出問題的欄位名、row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- `balance`、`monthlyPayment` 為金額字串：ASCII 十進位，文法 `^(0|[1-9][0-9]{0,8})(\.[0-9]{1,2})?$`，無空白／符號／指數，raw 每欄最多 12 單元。換算為整數分：整數部 ×100 ＋ 小數部補齊兩位。範圍 1–99,999,999,999 分（即 0.01–999,999,999.99 元）。
- `aprPercent` 為年利率百分比字串：文法 `^(0|[1-9][0-9]{0,2})(\.[0-9]{1,2})?$`，raw 最多 6 單元。換算為整數基點 aprBp＝整數部 ×100 ＋ 小數部補齊兩位（如 "22.8"→2280、"24"→2400）。範圍 0–9,999 bp（0.00%–99.99%）。
- `mode` 為字串，僅 `"payment"` 或 `"months"`，raw 最多 16 單元。
- `targetMonths` 為整數字串：文法 `^(0|[1-9][0-9]{0,2})$`，raw 最多 3 單元。範圍 1–600。
- 條件欄位：mode 為 `"payment"` 時 `monthlyPayment` 必須是字串且 `targetMonths` 必須是 null；mode 為 `"months"` 時相反。違反任一（含非啟用欄位非 null）皆 SCHEMA，field 為該條件欄位名。
- 預設草稿 balance 50000.00、aprPercent 15、mode payment、monthlyPayment 3000.00、targetMonths 24（草稿五欄皆字串；送入核心時依 mode 把非啟用欄位轉 null）。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 結構檢查（SCHEMA）：input 必須是普通物件且恰有 balance、aprPercent、mode、monthlyPayment、targetMonths 五個 own 欄位；balance、aprPercent、mode 必須是字串；monthlyPayment、targetMonths 各須為字串或 null。
2. 依 balance、aprPercent、mode 順序逐欄驗證。raw 超限 INPUT_LIMIT、文法依欄位為 MONEY_FORMAT／PERCENT_FORMAT、不合 ENUM（mode 非兩值之一），範圍 RANGE，field 即該欄名。
3. 條件一致性（SCHEMA）：依 mode 檢查非啟用欄位必須為 null（field 為非啟用欄位名），啟用欄位必須為字串（field 為啟用欄位名）。再驗證啟用欄位：monthlyPayment 用金額文法（MONEY_FORMAT）與金額範圍；targetMonths 用整數文法（INTEGER_FORMAT）與 1–600 範圍。
4. 月利率與利息（整數精確，無浮點）：月利息 I＝roundHalfUp（月初餘額 B × aprBp / 120000），以 BigInt 計算 I＝（B × aprBp ＋ 60000） div 120000。aprBp＝0 時 I＝0。
5. 固定月付模式：先算第一個月利息 I₁（以原始餘額計）。若 monthlyPayment ≤ I₁，回 NEVER_PAYOFF，field＝monthlyPayment（餘額永遠不減；利息隨餘額遞減而不增，故第一個月即定）。否則進第 7 步模擬，月付 P＝monthlyPayment。
6. 目標月數模式：以閉式年金公式精確求 P（BigInt 有理數，最後無條件進位到分）。令 a＝aprBp、d＝120000、n＝targetMonths：a＝0 時 P＝ceil（B / n）＝（B ＋ n − 1） div n；a＞0 時 P＝ceil（ B × a × (d＋a)^n / （d × （(d＋a)^n − d^n）) )。再套下限：若 P ≤ I₁，P＝I₁ ＋ 1（僅當精確年金值超過精確第一個月利息不到 1 分、又被進位與利息 half-up 夾住時才可能發生；保證模擬必有進展）。
7. 月結模擬（兩模式共用，最多 600 個月）：每月 interest＝I（按當月初餘額）；due＝餘額＋interest；pay＝min（P, due）；principal＝pay − interest；餘額＝due − pay。逐列記錄 {month, paymentCents, interestCents, principalCents, balanceCents}，balanceCents 為該月付款後餘額。餘額歸零即停：months＝該月序、finalPaymentCents＝該月 pay、totalInterestCents＝利息總和、totalPaidCents＝付款總和。600 個月後餘額仍 >0 回 PAYOFF_TOO_LONG，field 為啟用欄位名（monthlyPayment 或 targetMonths）。
8. 結果：固定月付模式 {mode, months, totalInterestCents, totalPaidCents, finalPaymentCents, rows}；目標月數模式另在 mode 後含 targetMonths 與 requiredPaymentCents，months 為模擬實際月數。rows 含全部月數（≤600），不截斷。所有金額輸出為整數分的安全整數。恆等式必成立：各列 principal 總和＝原始餘額、totalPaidCents＝原始餘額＋totalInterestCents、末列 balanceCents＝0。

固定下載 `credit-card-payoff-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改：畫面金額以千分位逗號＋固定兩位小數呈現，兩語相同，不附幣別符號。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/credit-card-payoff-calculator/`。src/core.mjs 放純驗證、推導、格式化（利息、年金與模擬全用 BigInt 整數運算，禁止浮點參與金額路徑）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算還款計畫」，兩種模式的畫面和完整報告符合核心 fixtures（含 NEVER_PAYOFF 與目標月數反推），使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據；含利息恰 0.5 分 half-up、月付恰等於利息、600 個月上限。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。10 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `fixed-payment-basic` | 固定月付逐月利息／本金與最後一期小額付款 |
| `target-months-annuity` | 年金公式進位到分，同模擬驗證 12 個月還清 |
| `zero-apr-payment` | 零利率固定月付，利息全零 |
| `zero-apr-months` | 零利率目標月數，月付為餘額除以月數進位到分 |
| `never-payoff-equal` | 月付恰等於第一個月利息，NEVER_PAYOFF |
| `one-month-payoff` | 月付大於首月到期總額，一個月還清 |
| `half-up-interest` | 利息恰 0.5 分 half-up 進位 |
| `payoff-too-long` | 月付僅多利息 1 分且餘額極大，600 個月還不完 |
| `payment-format-error` | 金額小數三位，MONEY_FORMAT |
| `apr-range-error` | 年利率 100 超限，RANGE |
| `state-dirty-error` | 先產出真結果，再改為永遠還不完的輸入，舊結果及所有下載立即失效，重跑得 NEVER_PAYOFF。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、非啟用欄位非 null、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證餘額 0 與 999,999,999.99、APR 0 與 99.99、targetMonths 1 與 600/601、月付恰等於利息與多 1 分、年金下限規則、恆等式（本金總和＝餘額、totalPaid＝餘額＋總利息）。利息隨餘額遞減不增，首月通過 NEVER_PAYOFF 檢查後本金每月至少 1 分。

候選 gate（均 NOT_RUN）

- 於 `tools/credit-card-payoff-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「信用卡還款試算」，title「信用卡還款試算｜Gloss Tools」，description「輸入信用卡欠款餘額與年利率，試算每月固定還款要多久還清、總利息多少，或在目標月數內還清每月要繳多少；含永遠還不完的偵測。」。英文 lang=en，H1 “Credit Card Payoff Calculator”，title “Credit Card Payoff Calculator | Gloss Tools”，description “Enter a card balance and APR to see how long a fixed monthly payment takes to clear it, the total interest, or the payment needed to finish within a target number of months — including never-payoff detection.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。為什麼顯示永遠還不完？每月還款不超過第一個月利息時，餘額永遠不會減少。 / Why does it say the balance never pays off? When the payment is no more than the first month's interest, the balance never shrinks.
- FAQ。目標月數的每月金額怎麼算？以年金公式精確計算、無條件進位到分，再以同一月結模擬驗證。 / How is the target-months payment derived? From the exact annuity formula, rounded up to the cent, then verified by the same monthly simulation.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://credit-card-payoff.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

規格任務 id `labs-credit-card-payoff-calculator-spec-20261109`，由主代理（父層）負責 register-spec；作者未執行任何 registry/coordination 指令。非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/credit-card-payoff-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

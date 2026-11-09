# 綜合所得稅試算 / Taiwan Income Tax Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-taiwan-income-tax-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

只有薪資所得的上班族在五月申報前，先用固定一個稅年度的官方金額，試算應納稅額並看到完整推導，知道自己落在哪個級距、每一項扣除是多少。

- 桌面。桌邊對著扣繳憑單輸入全年薪資總額，切換單身／有配偶、扶養人數，逐項核對推導表。
- 行動。手機在報稅季快速估一個數字，判斷要預留多少現金，不做正式申報。

使用情境為試算估計。資料只保留在目前頁面草稿，結果不是申報文件，也不構成稅務建議（固定聲明見 tests 節）。

## scope

稅年度固定為民國113年度：2024 年（民國113年）所得，2025 年（民國114年）5 月申報。金額表依財政部公告之 113 年度綜合所得稅免稅額、扣除額及課稅級距（新臺幣元）：

| 項目 | 金額 |
| --- | --- |
| 免稅額（每人） | 97,000 |
| 免稅額（年滿 70 歲之本人、配偶及受扶養直系尊親屬） | 145,500 |
| 標準扣除額（單身） | 131,000 |
| 標準扣除額（有配偶） | 262,000 |
| 薪資所得特別扣除額（每人上限） | 218,000 |
| 薪資未達上限時 | 以實際薪資所得總額全數扣除 |

| 綜合所得淨額 | 稅率 | 累進差額 |
| --- | --- | --- |
| 0 – 590,000 | 5% | 0 |
| 590,001 – 1,330,000 | 12% | 41,300 |
| 1,330,001 – 2,660,000 | 20% | 147,700 |
| 2,660,001 – 4,980,000 | 30% | 413,700 |
| 4,980,001 以上 | 40% | 911,700 |

MVP 必做：只計納稅義務人本人薪資所得一種來源；申報身分單身／有配偶（合併申報，標準扣除額以有配偶計）；本人年滿 70 歲切換；有配偶時配偶年滿 70 歲切換；扶養親屬未滿 70 歲人數、年滿 70 歲直系尊親屬人數；輸出完整推導與應納稅額試算。

非目標：配偶或扶養親屬的薪資及其他所得；營利、執行業務、利息、租賃、財產交易、退撫金等其他類別所得；列舉扣除額；基本生活費差額比較；儲蓄投資、身心障礙、教育學費、幼兒學前、長期照顧、財產交易損失等其他特別扣除額；扶養親屬資格判定（年齡、在學、無謀生能力等法定條件由使用者自行確認，本工具只計人數）；已扣繳稅額、自繳稅額、退稅與補稅差額；夫妻所得分開計稅；所得基本稅額（最低稅負制）；113 年度以外的稅年度；正式申報、上傳或列印申報文件。

年滿 70 歲以所得年度終了日（2024-12-31）是否年滿判定，由使用者切換，本工具不收出生日期。年滿 70 歲免稅額 145,500 元依法僅適用本人、配偶及受扶養直系尊親屬；`dependents70Plus` 欄位即限定直系尊親屬，其他扶養親屬一律計入 `dependentsUnder70` 的 97,000 元。

已比對現有工具與預案，最接近者為 `taiwan-invoice-prize-check`（統一發票對獎）：同屬台灣稅務周邊，但只核對發票獎號，不做任何所得或稅額計算，功能不重疊。本工具是本站第一個所得稅試算。

判定規則與金額表由本文固定，無線上資料或外部服務依賴；金額日後公告調整不自動更新本工具，改版須修訂本規格並重審。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，級距表與聲明用一層 disclosure。

- 欄位或說明「申報身分與年齡 / Filing status and ages」
- 欄位或說明「全年薪資所得總額與扶養人數 / Gross salary and dependents」
- 「試算應納稅額 / Estimate my tax」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「推導過程與應納稅額 / Derivation and estimated tax」先摘要（應納稅額、綜合所得淨額、適用稅率）再列每一步金額，順序固定如下一節。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 結果區下方固定顯示完整級距表與聲明（文字見 tests 節），不因狀態改變而消失。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。應納稅額為 0 時明示「試算應納稅額為 0 元 / Estimated tax payable is NT$0.」，不留白。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"grossSalary":"","filingStatus":"single","selfAge70Plus":false,"spouseAge70Plus":null,"dependentsUnder70":"0","dependents70Plus":"0"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field 為出問題的欄位名（整體形狀問題 field=null），row 一律 null。JSON fixture 即介面。明示檔案欄才處理原始 bytes，本工具無檔案欄。

欄位（驗證與計算的固定順序）：

| 欄位 | 型別 | 規則 |
| --- | --- | --- |
| `grossSalary` | 字串 | 本人全年薪資所得總額（新臺幣元）。ASCII 十進整數字串，`0` 或非零開頭，無空白／符號／小數／指數，raw 最多 8 字元，值 0–99,999,999。 |
| `filingStatus` | 字串 | `"single"` 或 `"married"`，其他字串 ENUM_VALUE。 |
| `selfAge70Plus` | 布林 | 本人於 2024-12-31 年滿 70 歲。非布林 SCHEMA。 |
| `spouseAge70Plus` | 布林或 null | `filingStatus="married"` 時必填布林；`"single"` 時必須為 null。違反 SCHEMA，field=`spouseAge70Plus`。 |
| `dependentsUnder70` | 字串 | 扶養親屬人數（未滿 70 歲，含非直系尊親屬）。整數字串同 `grossSalary` 文法，值 0–20。 |
| `dependents70Plus` | 字串 | 受扶養直系尊親屬人數（年滿 70 歲）。整數字串同上，值 0–20。 |

每欄先後：先 INPUT_LIMIT（raw 超過 8 字元）、再 EMPTY（空字串）、再 INTEGER_FORMAT（文法不合）、再 RANGE（值超範圍）；`filingStatus` 先 SCHEMA（非字串）再 ENUM_VALUE；布林欄只 SCHEMA。整份失敗回 `{ok:false,error:{code,field,row}}`，只回第一個錯誤。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算（全部整數新臺幣元，依序執行，步驟編號即推導顯示順序）：

1. `salarySpecialDeduction = min(grossSalary, 218000)`。
2. `salaryNet = grossSalary − salarySpecialDeduction`。
3. `exemptionTotal = selfExemption + spouseExemption + dependentsUnder70 × 97000 + dependents70Plus × 145500`，其中 `selfExemption = selfAge70Plus ? 145500 : 97000`；`spouseExemption` 在 `"married"` 時同式以 `spouseAge70Plus` 計，`"single"` 時為 0。
4. `standardDeduction = filingStatus = "single" ? 131000 : 262000`。
5. `taxableNet = max(0, salaryNet − exemptionTotal − standardDeduction)`。
6. 級距：取上限不小於 `taxableNet` 的第一個級距，得 `ratePercent` 與 `progressiveDifference`；`taxableNet = 0` 時屬 5% 級距。
7. `taxExact = taxableNet × ratePercent / 100 − progressiveDifference`，以精確十進位計算（最多兩位小數），不先捨入。
8. `taxPayable = max(0, roundHalfUp(taxExact))`，四捨五入至整數元；這是唯一捨入點。

結果 `{taxYear:"113",grossSalary,salarySpecialDeduction,salaryNet,exemptionTotal,standardDeduction,taxableNet,ratePercent,progressiveDifference,taxPayable}`，全為經驗證的非負安全整數（`taxYear` 為固定字串）。金額顯示加千分位逗號僅為呈現，機器值不隨 locale 改。畫面推導表依步驟 1–8 順序列出：全年薪資所得總額、薪資所得特別扣除額、薪資淨額、免稅額合計、標準扣除額、綜合所得淨額、適用稅率與累進差額、應納稅額（試算）。

固定下載 `taiwan-income-tax-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/taiwan-income-tax-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 金額運算全程整數或精確十進位（步驟 7 以整數百分之一元計算：`taxableNet × ratePercent − progressiveDifference × 100`，再除以 100 四捨五入），禁止浮點累加。級距表、免稅額與扣除額為核心內固定常數，附來源年度註記，不從網路或設定檔載入。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「試算應納稅額」，畫面推導與完整報告符合核心 fixtures（含 0 元、12%、30% 級距與 70 歲扶養案例），使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、級距邊界 590,000／590,001 與三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。12 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `single-salary-five-percent` | 單身薪資 720,000，5% 級距基本推導 |
| `zero-tax` | 薪資 300,000，扣完免稅額與標準扣除額後淨額 0 |
| `salary-below-special-cap` | 薪資 150,000 低於特別扣除額上限，以實際薪資全數扣除 |
| `twelve-percent-with-dependent` | 單身扶養 1 人，12% 級距與累進差額 41,300 |
| `married-thirty-percent` | 有配偶標準扣除額 262,000，扶養 2 人，30% 級距 |
| `dependent-age-70-plus` | 扶養 70 歲直系尊親屬，免稅額 145,500 |
| `self-age-70-forty-percent` | 本人 70 歲，40% 級距與累進差額 911,700 |
| `bracket-top-590000` | 淨額恰 590,000，仍屬 5% 級距 |
| `bracket-first-590001` | 淨額 590,001 進入 12%，精確稅額 29,500.12 四捨五入為 29,500 |
| `dependents-range` | 扶養人數 21 超上限，RANGE |
| `salary-decimal-format` | 薪資含小數點，INTEGER_FORMAT |
| `spouse-flag-schema` | 單身卻帶配偶年齡旗標，SCHEMA |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限（薪資 99,999,999、人數各 20）、剛好超限（薪資 9 位數、人數 21）、錯型別、額外欄、缺欄、`"married"` 缺配偶旗標、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證淨額 0 時稅額 0 且級距顯示 5%、步驟 5 負值歸零、級距連續性（590,000 用 5% 與 590,001 用 12% 的精確稅額差在 1 元內）。

候選 gate（均 NOT_RUN）

- 於 `tools/taiwan-income-tax-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「綜合所得稅試算」，title「綜合所得稅試算｜Gloss Tools」，description「以民國113年度（2024年所得、2025年申報）的免稅額、標準扣除額、薪資所得特別扣除額與稅率級距，試算只有薪資所得時的綜合所得稅應納稅額與完整推導過程。」。英文 lang=en，H1 “Taiwan Income Tax Calculator”，title “Taiwan Income Tax Calculator | Gloss Tools”，description “Estimate Taiwan individual income tax on salary income only, using the income-year 2024 (ROC 113) exemptions, standard deduction, salary special deduction and tax brackets, with a full step-by-step derivation.”。兩頁靜態呈現操作、限制、級距表、聲明與 FAQ。全部狀態及錯誤使用對等本地化訊息。
- 固定聲明。繁中：「本工具僅就薪資所得一種來源試算，非完整申報計算。金額依財政部公告之民國113年度（2024年所得、2025年5月申報）免稅額、扣除額與課稅級距；試算結果僅供參考，不構成稅務建議，實際應納稅額以稅捐稽徵機關核定及最新公告為準。」英文：“This tool estimates tax on salary income only and is not a full tax return. Amounts follow the Ministry of Finance table for income year 2024 (ROC 113, filed in May 2025). Results are estimates for reference only and are not tax advice; your actual tax is determined by the tax authority and the latest official announcements.”
- FAQ。單身薪資多少以下不用繳稅？218,000 + 97,000 + 131,000 = 446,000 元以下試算稅額為 0。 / Below what salary does a single filer owe nothing? Below NT$446,000 — the salary special deduction (218,000), one exemption (97,000) and the single standard deduction (131,000) total 446,000.
- FAQ。配偶的薪資有一起算嗎？沒有，本版只計納稅義務人本人薪資，配偶只影響標準扣除額與免稅額。 / Is a spouse's salary included? No. This version counts only the filer's salary; a spouse affects the standard deduction and exemptions only.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://taiwan-income-tax-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。規格 task id `labs-taiwan-income-tax-calculator-spec-20261109`，由主代理登記，作者未自行註冊。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/taiwan-income-tax-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

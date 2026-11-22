# 50/30/20 預算分配 / 50-30-20 Budget Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-50-30-20-budget-calculator-20261121` · 2026-11-21 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/90a4e0cb5be8d0f18358e33e013c04428bbd0bad/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

領薪水的人在發薪日對著稅後月收入，想知道房租、伙食、交通這些必要開銷、吃喝玩樂的想要開銷、存錢與多還的債，各該留多少，才不會月底透支、年底也沒存到錢。

- 桌面。桌面填上稅後月收入與三類比例，逐步確認每類每月與每年該留多少；填入實際支出後，對照目標看差異。
- 行動。手機在發薪日核對一份短的分配表，不連銀行、不記帳。

使用情境為設計假設。資料只保留在目前頁面草稿。

比例來源：Elizabeth Warren 與 Amelia Warren Tyagi《All Your Worth: The Ultimate Lifetime Money Plan》（2005）提出的 50/30/20 法則（Balanced Money Formula）：稅後收入的 50% 留給需求（must-haves）、30% 留給想要（wants）、20% 留給儲蓄與還債（savings）。本工具不是理財建議、不提供投資建議，僅做算術分配與差異對照。

## scope

輸入稅後月收入，按需求 50%、想要 30%、儲蓄／還債 20% 分配，比例可自訂但合計須為 100；輸出每類每月與每年金額；可填三類實際支出，對照目標顯示差異（金額差、占收入百分比、under / on-target / over 狀態）與合計結餘或超支。非目標為記帳與支出歷史、銀行同步、報稅或稅額計算（輸入已是稅後收入）、投資建議、逐筆債務清償排程、退休提領試算、食物預算表。

已與 registry 及本 checkout 的既有預案比對，最相近者的實質差異如下。

- grocery-budget-calculator（本輪概念第 12 條）：依家庭成員組成對照 USDA 食物計畫表（Thrifty / Low-cost）算出每週與每月「食物」預算。此處是整份稅後收入的三類分配，不含任何食物單價表，也不按人頭計價。
- retirement-withdrawal-calculator（本輪概念第 11 條）：以投資組合餘額、年提領額、報酬率與通膨假設算提領年限與 4% 法則目標。此處只做當月收入分配，不做跨年提領、不估投資報酬。
- rent-budget：只算單一支出（房租）占收入是否可負擔。此處是整份收入的三類分配，房租只是需求類裡的一項。
- subscription-budget：盤點訂閱清單並年化其費用。此處不列訂閱、不年化單項支出，訂閱只是想要類裡的一項。
- debt-payoff-planner（本輪概念第 9 條）：逐筆債務算雪球／雪崩順序、還清月數與總利息。此處只把「超額還款」放進 20% 那格，不排還款順序、不算利息。
- 複利計算。只算金額隨時間成長，不做收入分配。 [spec-compound-interest-calculator](https://github.com/KYStr/glossquote-labs-home/blob/55b53a53e00ddea4c037d516d6b403124a7aefc9/docs/specs/compound-interest-calculator/SPEC.md)

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「稅後月收入 / Monthly after-tax income」
- 欄位或說明「需求比例、想要比例、儲蓄／還債比例 / Needs %, wants %, savings %」
- 欄位或說明「實際支出（選填）：需求、想要、儲蓄／還債 / Actual spending (optional): needs, wants, savings」
- 「計算預算分配 / Calculate budget split」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「每類分配金額 / Allocation per category」先摘要再列細節：每類每月金額、每年金額、占收入百分比；填了實際支出時另列差異表：實際金額、目標金額、差異（實際 − 目標，帶正負號）、實際占收入百分比、狀態（低於目標 / 符合目標 / 超出目標）。合計列顯示實際總支出、收入、未分配餘額（收入 − 實際總額，可為負）與狀態（未用完 / 恰好 / 超支）。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"income":"","needsPct":"50","wantsPct":"30","savingsPct":"20","actualNeeds":"","actualWants":"","actualSavings":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 全為 ASCII 十進整數字串，0 或非零開頭，無空白／符號／小數／指數，raw 每欄最多 16 單元。income 1–100,000,000（整數新臺幣元，稅後月收入）；needsPct、wantsPct、savingsPct 各 0–100 整數，合計須為 100；actualNeeds、actualWants、actualSavings 各 0–100,000,000 整數新臺幣元，空字串表示未填。
- 預設 needsPct 50、wantsPct 30、savingsPct 20；income 無預設（必填）；實際支出三欄預設皆空（未填）。
- 類別定義（依 Warren & Tyagi《All Your Worth》，2005，原文 must-haves / wants / savings；中文譯名以本文為準）：需求（needs）為維持生活與工作必須支付者——房租或房貸、基本水電瓦斯與電話網路、伙食（不含外食）、通勤交通費、保險、必要托育、債務「最低應繳金額」；想要（wants）為可有可無但提升生活品質者——外食、串流訂閱、娛樂、嗜好、購物、旅遊、超出基本款的升級；儲蓄／還債（savings）為緊急預備金、退休儲蓄、其他儲蓄目標，以及「高於最低應繳金額」的額外還款。分類有疑義時以「失去收入後是否仍須支付」判斷：仍須支付者為需求，否則為想要。

先容量、再該欄文法，跨欄合計最後。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、文法 INTEGER_FORMAT、範圍 RANGE，合計不等於 100 為 PERCENT_SUM。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 income、needsPct、wantsPct、savingsPct、actualNeeds、actualWants、actualSavings 順序驗證。raw 超限 INPUT_LIMIT、必填欄空值 EMPTY、文法 INTEGER_FORMAT、範圍 RANGE，field 即上述欄名。實際支出三欄空字串視為未填，不報錯。
2. 三類比例合計須為 100，否則回 `{ok:false,error:{code:"PERCENT_SUM",field:null,row:null}}`。
3. 精確金額以分數運算：exact[類別] = income × pct[類別] / 100，不用浮點。每月金額 = exact 四捨五入至整數元（half-up：小數部分 ≥ 0.5 進位；金額皆非負，故 half-up 即 half away from zero）。三類四捨五入後合計與 income 的餘差 residual 必為 −1、0 或 +1；residual ≠ 0 時，將 residual 加到 exact 最大的類別；exact 並列最大時依需求、想要、儲蓄／還債順序取先者。調整後三類每月金額合計恆等於 income。每年金額 = 每月金額 × 12。
4. 實際支出差異（只對已填的類別計算）：difference = actual − target（帶正負號的整數元）；actualPercent = actual / income × 100，四捨五入至小數 1 位（half-up）；targetPercent 即該類比例整數；status 為 difference = 0 時 `on-target`、> 0 時 `over`、< 0 時 `under`。未填的類別 variance 為 null。
5. 合計（只在三類實際支出皆填時計算）：actual = 三類 actual 之和；unallocated = income − actual（可為負）；status 為 unallocated = 0 時 `balanced`、> 0 時 `under`、< 0 時 `over`。任一類未填時 totals 為 null。actuals 全未填時 actuals、variance、totals 皆為 null。
6. 結果形狀固定為 `{income,percentages:{needs,wants,savings},targets:{monthly:{needs,wants,savings},yearly:{needs,wants,savings}},actuals:{needs,wants,savings}|null,variance:{needs,wants,savings}|null,totals:{actual,income,unallocated,status}|null}`。金額皆為整數元（新臺幣元為顯示標籤，不做匯率換算）；actualPercent 為小數 1 位的數字。機器值不隨 locale 改。

固定下載 `50-30-20-budget-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

差異建議為畫面文字，依狀態套用固定模板，不進 result JSON：需求 `over` 時顯示「需求超出目標：檢視固定支出，是否能調降或改列想要。 / Needs are over target: review fixed costs and check whether any item belongs in wants.」；想要 `over` 時顯示「想要超出目標：先列出可延後的想要支出。 / Wants are over target: list wants spending that can wait.」；儲蓄／還債 `under` 時顯示「儲蓄低於目標：先補緊急預備金，再提高儲蓄。 / Savings are under target: build the emergency fund first, then raise savings.」；合計 `over` 時顯示「本月支出超過收入：超支金額須由儲蓄或下月收入補回。 / Spending exceeds income this month: the shortfall must come from savings or next month's income.」。以上皆為一般性教育文字，不是個人化理財建議；頁面須同時顯示「本工具僅做算術分配與差異對照，不是理財、投資或稅務建議。 / This tool only calculates allocations and variances. It is not financial, investment, or tax advice.」。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/50-30-20-budget-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。
- 金額運算須用整數或分數精確算術（例如 BigInt 分子／分母），禁止以二進位浮點計算 exact、每月金額或 actualPercent；half-up 捨入在精確值上執行。無時區、無日期、無隨機性，結果與主機時區無關。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算預算分配」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
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
| `default-split` | 預設 50/30/20 分配 |
| `odd-income-rounding` | 奇數收入四捨五入後餘差 −1 調整至最大類別 |
| `custom-split-rounding-up` | 自訂 33/33/34 比例餘差 +1 調整至最大類別 |
| `custom-split` | 自訂 60/25/15 比例整除分配 |
| `custom-split-tie-break` | 自訂 40/40/20 比例餘差 +1，需求與想要精確值並列最大時調整需求 |
| `actuals-on-track` | 實際支出三類全填，需求與想要低於目標、儲蓄高於目標，合計未用完 |
| `actuals-over-needs` | 需求超出目標，合計恰好等於收入 |
| `actuals-overspend` | 實際支出合計超過收入，儲蓄恰好等於目標 |
| `small-income` | 小額收入整除分配 |
| `actuals-partial` | 只填實際需求支出，其餘兩類不顯示差異、合計不計算 |
| `max-income` | 收入上限整除分配 |
| `income-decimal-rejected` | 收入不接受小數 |
| `percent-sum-mismatch` | 自訂比例合計 105，不等於 100 |
| `zero-income` | 收入為零超出範圍 |
| `percent-out-of-range` | 需求比例 101 超出 0–100 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 income=1、income=100,000,000/100,000,001、比例合計 99/100/101、比例 0/100 邊界、實際支出單類超過收入、餘差 −1/0/+1 三種、並列最大 tie-break。所有已接受的每月金額合計恆等於 income，每年金額恆為每月 × 12。

候選 gate（均 NOT_RUN）

- 於 `tools/50-30-20-budget-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「50/30/20 預算分配」，title「50/30/20 預算分配｜Gloss Tools」，description「輸入稅後月收入，按需求 50%、想要 30%、儲蓄／還債 20% 分配，填入實際支出對照目標看差異。」。英文 lang=en，H1 “50-30-20 Budget Calculator”，title “50-30-20 Budget Calculator | Gloss Tools”，description “Split monthly after-tax income into 50% needs, 30% wants and 20% savings, then compare actual spending with the targets.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。收入要用稅前還是稅後？用稅後實領金額，比例是對稅後收入算的。 / Should I use gross or take-home pay? Use take-home pay after tax; the percentages apply to after-tax income.
- FAQ。債務最低應繳金額算哪一類？算需求；高於最低應繳的額外還款算儲蓄／還債。 / Where do minimum debt payments go? Minimum payments count as needs; anything above the minimum counts as savings and debt repayment.
- FAQ。比例一定要 50/30/20 嗎？不用，可以自訂，但三類合計必須是 100。 / Must the split be exactly 50/30/20? No, you can customize it, but the three percentages must add up to 100.
- FAQ。需求超過 50% 怎麼辦？先檢視固定支出，比例是起點不是鐵律；長期超過 50% 代表財務緩衝較薄。 / What if needs exceed 50%? Review fixed costs first; the split is a starting point, not a hard rule, and staying above 50% for long leaves less buffer.
- FAQ。這個工具會給我理財建議嗎？不會，只做算術分配與差異對照。 / Does this tool give financial advice? No, it only calculates allocations and variances.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://50-30-20-budget.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/90a4e0cb5be8d0f18358e33e013c04428bbd0bad/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/50-30-20-budget-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

# 退休提領試算 / Retirement Withdrawal Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-retirement-withdrawal-calculator-20261121` · 2026-11-21 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

準備退休的人手上有一個數字（投資組合現在值多少）與一個問題（每年要從裡面拿多少出來過活），想知道這筆錢能撐幾年，以及按 4% 法則自己離「夠退休」還差多少。

- 桌面。桌面填上組合價值、年提領額、報酬率與通膨率假設，逐年核對餘額怎麼被提領與報酬推著走，看到資金耗盡年數與完整年度表；切到 4% 法則模式，填年支出就看到目標組合，填現有組合就看到隱含提領率與短少額。
- 行動。手機在與家人或理財顧問討論時，改一個假設就重算一次，不留任何資料在裝置上。

使用情境為設計假設。資料只保留在目前頁面草稿。

## scope

耗盡模式：固定年報酬率與年通膨率下的逐年提領模擬（提領在年初、餘額再計報酬、提領額自第 2 年起隨通膨成長），模擬上限 100 年；4% 法則模式：目標組合 = 年支出 ×25，另可填現有組合算隱含提領率與短少額。非目標為實際市場報酬預測、稅費、手續費、提領策略建議（動態提領、桶子策略等）、年金或勞保勞退給付試算、把結果當投資或退休建議。

與既有工具的實質差異如下（已比對本 repo `docs/specs/` 既有規格；registry 的新鮮比對由家長在製作登記前重跑，若撞件則停下等協調決定，不改名硬上）。

- 複利與儲蓄目標試算（compound-interest-calculator，累積求解）。該工具把錢「存進去」長大，求幾個月達標或每月該存多少；此處把錢「領出來」花掉，求幾年耗盡，方向相反、輸出不同（耗盡年數與提領年度表，而非達標月數與每月存款）。 [spec-compound-interest-calculator](https://github.com/KYStr/glossquote-labs-home/blob/4e358ce6fdc3ae2bbf4755570096d90f5a8dc734/docs/specs/compound-interest-calculator/SPEC.md)
- 房貸攤還試算（mortgage-amortization）。該工具按合約把債務攤還到零（年金與等額本金、提前還款事件）；此處是自願提領、提領額隨通膨成長、報酬率為假設而非合約利率，兩者沒有共用的時程語義，只有「餘額歸零」這個表面相似。
- 4% 法則本身是固定倍率（25×），不是模擬：4% 法則模式不跑逐年表、不吃報酬率與通膨率假設；耗盡模式不給「夠不夠退休」的判斷，只給年數。兩個模式共用同一個頁面，不共用計算。

4% 法則出處（已核實）：William P. Bengen, "Determining Withdrawal Rates Using Historical Data", *Journal of Financial Planning*, 1994 年 10 月——以 1926 年起的美國股債歷史資料模擬 30 年退休期，首年提領 4%、其後每年隨通膨調整，在其資料中未曾提前耗盡；Cooley, Hubbard & Walz, "Retirement Savings: Choosing a Withdrawal Rate That Is Sustainable", *AAII Journal*, 1998 年（Trinity study）進一步支持。本工具取其簡化版固定值 4%（目標組合 = 年支出 ÷ 0.04 = 年支出 ×25），並在頁面明示：這是 30 年期歷史經驗法則，不是保證；Bengen 原文的 SAFEMAX 為 4.15%，4% 是簡化取整。

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 模式切換「耗盡試算 / Depletion」與「4% 法則 / 4% rule」。切換模式保留各模式的輸入，結果隨模式重算，不混用欄位。
- 耗盡模式欄位或說明「投資組合價值 / Portfolio value」「每年提領額（第 1 年） / Annual withdrawal (year 1)」「年報酬率 / Annual return %」「年通膨率 / Annual inflation %」
- 4% 法則模式欄位或說明「每年支出 / Annual spending」「現有組合價值（選填） / Current portfolio (optional)」
- 幣別標示「幣別 / Currency」為僅顯示的標籤選擇（NT$ / $ / ¥，預設 NT$），不換算、不影響計算。
- 「計算提領年限 / Calculate withdrawal years」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個核心案例（`linear-no-growth`），明示例並等待手動執行。
- 「資金耗盡年數 / Years until depletion」先摘要再列年度表，長表在有 label 的區域捲動。超過 25 列採 25 列分頁、上下頁可鍵盤操作，完整匯出不截斷。4% 法則模式顯示「目標組合 / Target portfolio」「隱含提領率 / Implied withdrawal rate」「短少額 / Shortfall」，無年度表。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 免責聲明固定顯示於結果區上方，逐字為：「本工具僅為固定假設下的試算，不構成投資或退休建議。實際報酬與通膨每年變動，結果僅供參考。」 / "This tool is an estimate under fixed assumptions, not investment or retirement advice. Actual returns and inflation vary year to year; use the result for reference only."

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"mode":"depletion","portfolioValue":"","annualWithdrawal":"","returnRatePct":"5","inflationRatePct":"2"}`（4% 法則模式預設 `{"mode":"four-percent","annualSpending":"","currentPortfolio":""}`，重設回到耗盡模式預設）並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 金額欄（portfolioValue、annualWithdrawal、annualSpending、currentPortfolio）：十進位字串，可帶小數點後 1–2 位；不接受空白、千分位逗號、貨幣符號、指數、算式；raw 每欄最多 16 單元。portfolioValue 與 annualWithdrawal 為 0–999,999,999.99；annualSpending 為 >0–999,999,999.99（0 為 RANGE）；currentPortfolio 選填，空字串表示未提供，非空時為 >0–999,999,999.99（0 為 RANGE，隱含提領率無定義）。
- 比率欄（returnRatePct、inflationRatePct）：十進位字串，小數點後最多 2 位；returnRatePct 為 −50.00–100.00（負值表示虧損情境）；inflationRatePct 為 0–100.00（不接受通縮，超出範圍為 RANGE）。
- 模式欄（mode）：字串，僅接受 `"depletion"` 或 `"four-percent"`，其他值為 SCHEMA。耗盡模式輸入只含 mode、portfolioValue、annualWithdrawal、returnRatePct、inflationRatePct 五欄；4% 法則模式輸入只含 mode、annualSpending、currentPortfolio 三欄；多出或缺少欄位皆 SCHEMA。
- 預設：耗盡模式 portfolioValue ""、annualWithdrawal ""、returnRatePct "5"、inflationRatePct "2"；4% 法則模式 annualSpending ""、currentPortfolio ""。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 先驗 mode（SCHEMA），再依模式順序驗欄：耗盡模式為 portfolioValue、annualWithdrawal、returnRatePct、inflationRatePct；4% 法則模式為 annualSpending、currentPortfolio。每欄依序：raw 長度 >16 為 INPUT_LIMIT；空字串為 EMPTY（currentPortfolio 例外：空字串表示未提供，跳過其餘檢查）；不成對 surrogate 為 UNICODE；文法不符（空白、逗號、貨幣符號、指數、多個小數點、前導加號、"-0" 以外的負號位置錯誤）為 DECIMAL_FORMAT；小數超過 2 位為 DECIMAL_PLACES；超出範圍為 RANGE。field 即上述欄名。
2. 耗盡模式模擬（整數分計價，逐年四捨五入到分，ROUND_HALF_UP；不得用二進位浮點算錢，見 implementation）。設第 1 年提領額 W₁ = annualWithdrawal；第 n 年提領額 Wₙ = ROUND_HALF_UP(W₁ × (1 + i)^(n−1))，其中 i = inflationRatePct / 100，以十進位精確冪計算後再一次四捨五入到分。第 n 年（n 從 1 起）：若期初餘額 B < Wₙ，為部分年——提領 min(B, Wₙ) 即 B 本身，該年報酬為 0.00、期末餘額 0.00，列標 `partial:true`，停止；否則報酬 Rₙ = ROUND_HALF_UP((B − Wₙ) × r)，r = returnRatePct / 100（r 為負時 Rₙ 為負），期末餘額 B′ = B − Wₙ + Rₙ，列標 `partial:false`，續算下一年。若完整一年結束後 B′ 恰為 0.00，視為整年耗盡、停止，不產生零元部分年列。模擬上限 100 年；100 年完整提領後餘額仍 >0，停止並標 `beyond-horizon`。
3. 耗盡模式特例：annualWithdrawal 為 0 時永不耗盡，不跑模擬、不生年度表。portfolioValue 為 0 且 annualWithdrawal >0 時，第 1 年即為零元部分年（partialYearFraction "0.00"、yearsUntilDepletion "0.00"）。
4. 耗盡年數 yearsUntilDepletion = fullYears + partialYearFraction，其中 partialYearFraction = ROUND_HALF_UP(部分年期初餘額 ÷ 該年提領額，2 位小數）；整年耗盡時 partialYearFraction 為 "0.00"。yearsUntilDepletion 格式為 2 位小數字串；永不耗盡（`never`）或 100 年內未耗盡（`beyond-horizon`）時為 null。
5. 4% 法則模式：targetPortfolio = annualSpending × 25（精確到分）；未提供 currentPortfolio 時 impliedWithdrawalRatePct、shortfall、meetsRule 皆為 null；提供時 impliedWithdrawalRatePct = ROUND_HALF_UP(annualSpending ÷ currentPortfolio × 100，2 位小數），shortfall = targetPortfolio − currentPortfolio（帶符號 2 位小數字串，負值表示超出目標），meetsRule = impliedWithdrawalRatePct ≤ "4.00"。currentPortfolio 為 0 屬 RANGE（第 1 步範圍），故此處除數恆 >0。
6. 結果形狀（依模式，鍵集合精確如下，不含另一模式的鍵）：
   - 耗盡模式 `{mode:"depletion", depletionStatus, yearsUntilDepletion, fullYears, partialYearFraction, finalPartialWithdrawal, yearlyTable}`。depletionStatus 為 `"depleted"`、`"never"`（年提領為 0）或 `"beyond-horizon"`（100 年內未耗盡）。fullYears 為整數。partialYearFraction、finalPartialWithdrawal、yearsUntilDepletion（非 null 時）皆為 2 位小數字串；finalPartialWithdrawal 為部分年的提領金額，整年耗盡或未耗盡時為 "0.00"。yearlyTable 每列 `{year, startBalance, withdrawal, returnAmount, endBalance, partial}`，金額皆為 2 位小數字串（returnAmount 可為負，如 "-22500.00"）；year 為 1-based 整數；年度表按 year 升序。
   - 4% 法則模式 `{mode:"four-percent", annualSpending, targetPortfolio, currentPortfolio, impliedWithdrawalRatePct, shortfall, meetsRule}`。金額為 2 位小數字串；currentPortfolio 未提供時為 null；impliedWithdrawalRatePct 為 2 位小數字串或 null；shortfall 為帶符號 2 位小數字串或 null；meetsRule 為布林或 null。
7. 機器值不隨 locale 改；顯示用的千分位分隔僅為呈現，不進結果或報告。

固定下載 `retirement-withdrawal-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/retirement-withdrawal-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 金額一律以整數分運算：解析十進位字串為精確分（BigInt 或等價精確十進位），(1+i)^(n−1) 以十進位精確冪計算後再一次 ROUND_HALF_UP 到分；禁止用二進位浮點（Number）做金額乘除或累加。比率以字串轉精確十進位處理。測試 import 同一份核心。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算提領年限」與「4% 法則」兩模式，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
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
| `linear-no-growth` | 無報酬無通膨：線性耗盡，整整 20 年 |
| `exact-depletion` | 最後一年結束時餘額恰好為零，不生零元部分年 |
| `partial-final-year` | 首年提領超過組合：0 整年＋0.83 部分年 |
| `zero-withdrawal` | 年提領為 0：永不耗盡，無年度表 |
| `zero-portfolio` | 組合為 0 且有提領：0.00 年，一列零元部分年 |
| `growth-extends` | 5% 報酬延長壽命：62 整年＋0.41 部分年 |
| `inflation-erodes` | 3% 通膨侵蝕：24 整年＋0.94 部分年 |
| `negative-return` | −5% 報酬：8 整年＋0.24 部分年，報酬欄為負 |
| `beyond-horizon` | 提領遠低於報酬：100 年內不耗盡，表列滿 100 列 |
| `four-percent-rule` | 4% 法則：年支出 60 萬→目標 1,500 萬，現有組合恰達標 |
| `four-percent-shortfall` | 4% 法則：組合 1,000 萬，短少 500 萬，隱含提領率 6.00% |
| `four-percent-no-current` | 4% 法則：未填現有組合，只給目標，隱含值皆為 null |
| `rate-too-high` | 報酬率 101 超出 −50～100 上限 |
| `bad-decimal-places` | 年提領小數超過 2 位 |
| `zero-spending` | 4% 法則年支出為 0：無意義，RANGE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 portfolioValue=999,999,999.99、returnRatePct=−50/100/100.01、inflationRatePct=0/100、annualWithdrawal=0、部分年分數剛好 .005 的四捨五入、100 年上限（第 100 年完整提領後餘額 >0 為 beyond-horizon；第 101 年不算）、模式切換不混用欄位、currentPortfolio=0 為 RANGE。所有已接受的期末餘額不為負；提領額逐年不遞減（inflationRatePct ≥0）；移除通膨後耗盡年數不會變短。

候選 gate（均 NOT_RUN）

- 於 `tools/retirement-withdrawal-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「退休提領試算」，title「退休提領試算｜Gloss Tools」，description「輸入投資組合價值與每年提領額，算出這筆錢能撐幾年；再用 4% 法則看離目標組合還差多少。」。英文 lang=en，H1 “Retirement Withdrawal Calculator”，title “Retirement Withdrawal Calculator | Gloss Tools”，description “See how many years a retirement portfolio lasts at a given annual withdrawal, return and inflation — and check the 4% rule target.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。提領是在年初還是年底拿？每年提領在年初、餘額再計當年報酬；最後不足一年的部分年只領剩餘金額、不計報酬。 / Is the withdrawal taken at the start or the end of the year? Each year's withdrawal is taken at the start of the year and the remaining balance then earns that year's return; a final partial year withdraws only the remaining balance, with no return.
- FAQ。4% 法則保證錢不會花完嗎？不保證。它是 Bengen 1994 與 Trinity study 1998 從美國 30 年歷史資料得出的經驗法則，未來市場、稅費與個人壽命都可能不同。 / Does the 4% rule guarantee the money lasts? No. It is a rule of thumb from 30 years of US historical data in Bengen (1994) and the Trinity study (1998); future markets, taxes and lifespans can differ.
- FAQ。為什麼最多只算 100 年？100 年是模擬上限，避免無限表；提領遠低於報酬時，100 年後仍有餘額即標示為 100 年內未耗盡。 / Why stop at 100 years? 100 years is the simulation cap to avoid an endless table; if a balance remains after 100 fully funded years it is reported as not depleted within the horizon.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://retirement-withdrawal.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/4e358ce6fdc3ae2bbf4755570096d90f5a8dc734/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/retirement-withdrawal-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

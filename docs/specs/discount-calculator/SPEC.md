# 折扣計算機 / Discount Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-discount-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

台灣消費者在賣場或電商頁面看到「會員八折再九折、滿額折價券、價格含稅」時，常把疊加折扣誤當相加（20%＋10%≠30%），也分不清稅是折扣前還是折扣後計。需要一個逐步列出價格變化的工具：每打一次折、抵一次券、加一次稅都留一列，最後給出真正要付的單價與總價、實際省下多少、有效折扣率與約幾折。

- 桌面。結帳前在電腦前核對促銷傳單與吊牌價，逐步檢查每一列金額。
- 行動。賣場裡用手機輸入吊牌價與會員折扣，當場決定要不要買。

使用情境為試算假設。資料只保留在目前頁面草稿。

## scope

單一商品的疊加折扣鏈：原價、最多兩重百分比折扣、定額折價券、折扣後計稅、數量。非目標為多商品購物車、跨商品比價、單位價格比較、運費／分期／紅利點數／回饋金、讀取電商頁面或條碼、判斷促銷是否划算或真實、儲存歷史價格。

已比對本 repo `docs/specs/` 既有預案與 `sources/candidates/`，最相近者的實質差異如下。

- 比較不同包裝的單位價格（每 100 g／每 ml 多少錢），用來挑包裝。此處不比價，只追蹤同一商品的一條折扣鏈。`sources/candidates/unit-price`
- 核對購物車逐列小計與總額是否相符。此處是單一商品、含折扣後計稅與幾折換算的推導。`sources/candidates/cart-check`

判定規則由本文定義：金額一律整數分、百分比一律 basis points、每步 round half-up。稅率由使用者輸入，本工具不提供、不驗證任何法定稅率表，也不斷言輸入的稅率正確。無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「原價（單件）/ List price (per item)」，附固定說明「20% off＝八折、10% off＝九折 / 20% off = pay 80% （八折）, 10% off = pay 90% （九折）」
- 欄位或說明「第一重折扣 % / First discount, % off」
- 欄位或說明「第二重折扣 %、折價券 / Second discount, % off, and coupon」
- 欄位或說明「稅率 %（折扣後加計）、數量 / Tax rate % (applied after discounts) and quantity」
- 「計算折扣 / Calculate discount」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「每步價格明細 / Step-by-step price trace」先摘要（最終單價、總價、共省金額、有效折扣 %、約幾折）再列五步明細。成功才顯示「下載明細 / Download breakdown」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 結果對應目前快照，五步明細與摘要齊全。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤與欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"price":"1000","discount1":"20","discount2":"10","coupon":"0","taxRate":"5","quantity":"1"}` 並聚焦原價欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

- `price` 金額字串。ASCII 文法：整數部 1–7 位、無前導零（`0` 本身除外），可帶 `.` 與 1–2 位小數。raw 最多 12 個 UTF-16 單元。轉整數分：整數部×100＋小數部（不足兩位補 0）。範圍 1–999,999,999 分（0.01–9,999,999.99）。
- `discount1`、`discount2` 百分比字串（折扣 %，如八折填 20）。同一文法但整數部 1–3 位，raw 最多 8 單元。轉 basis points：整數部×100＋小數部兩位。範圍 0–10,000 bp（0–100.00%）。0 表示沒有這重折扣。
- `coupon` 金額字串，同 `price` 文法，raw 最多 12 單元，範圍 0–999,999,999 分。0 表示不用券。券在兩重折扣之後、計稅之前抵扣。
- `taxRate` 百分比字串，同百分比文法，raw 最多 8 單元，範圍 0–10,000 bp。對折扣與券之後的價格計稅。
- `quantity` 整數字串。ASCII 十進位、無前導零（`0` 本身除外，但 0 不在範圍內），raw 最多 4 單元，範圍 1–999。
- 預設 price 1000、discount1 20、discount2 10、coupon 0、taxRate 5、quantity 1。

先 schema，再依 price、discount1、discount2、coupon、taxRate、quantity 逐欄驗證；每欄依序容量（INPUT_LIMIT）、不成對 surrogate（UNICODE）、缺內容（EMPTY）、文法（金額 MONEY_FORMAT、百分比 PERCENT_FORMAT、整數 INTEGER_FORMAT）、範圍（RANGE）。逗號、空白、正負號、指數、全形數字皆文法錯誤，不替使用者猜。沒有跨欄錯誤：券大於折後價不算錯誤（見步驟 3）。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算全程以 BigInt 整數運算，無浮點。`roundHalfUp(a/b)` 指 ⌊(2a＋b)/(2b)⌋（a、b 非負）。

1. p0＝price 的分。keep1＝10000−bp(discount1)；p1＝⌊(p0×keep1＋5000)/10000⌋，即 p0×keep1/10000 的 half-up。saved1＝p0−p1。
2. keep2＝10000−bp(discount2)；p2＝⌊(p1×keep2＋5000)/10000⌋；saved2＝p1−p2。兩重折扣是連乘，不是相加。
3. appliedCoupon＝min(coupon 的分, p2)；p3＝p2−appliedCoupon。券超過折後價時只實際抵扣 p2，價格不為負，appliedCoupon 如實回報實際抵扣額。
4. tax＝⌊(p3×bp(taxRate)＋5000)/10000⌋；p4＝p3＋tax。稅只對 p3 計，不對原價或折扣前金額計。
5. totalCents＝p4×quantity；listTotalCents＝p0×quantity；totalSavedCents＝(p0−p3)×quantity。省下金額以稅前折後價計：稅不是折扣，不列入省下或有效折扣。
6. effectiveOffPercent：hundredths＝roundHalfUp((p0−p3)×10000/p0)，格式化為固定兩位小數字串（如 `"28.00"`）。zhe（幾折）：zheTenths＝roundHalfUp(p3×100/p0)，結果 `zhe` 為一位小數字串（如 `"7.2"`；p3＝p0 時 `"10.0"`，p3＝0 時 `"0.0"`）。p0≥1，無除零。

結果 `{steps, unitFinalCents, totalCents, listTotalCents, totalSavedCents, effectiveOffPercent, zhe}`。steps 固定五列依序出現，折扣為 0 或不用券時該列仍在、金額為 0：

- `{kind:"list", priceCents:p0}`
- `{kind:"discount1", offBp, savedCents:saved1, priceCents:p1}`
- `{kind:"discount2", offBp, savedCents:saved2, priceCents:p2}`
- `{kind:"coupon", appliedCents, priceCents:p3}`
- `{kind:"tax", rateBp, taxCents:tax, priceCents:p4}`

步驟標籤固定：list「原價 / List price」、discount1「第一重折扣 / First discount」、discount2「第二重折扣 / Second discount」、coupon「折價券 / Coupon」、tax「稅金 / Tax」。輸出金額均為驗過的安全整數（分）。UI 顯示金額用固定格式：整數部每三位以 `,` 分組、小數固定兩位（如 `1,137.49`）；幾折顯示時 `zhe` 小數為 0 去尾（`"8.0"` 顯示「8 折」），其餘一位小數（「7.2 折」）。顯示格式不影響機器值，機器值不隨 locale 改。

錯誤訊息固定對照（code：繁中／English）。SCHEMA：輸入格式不正確／The input is malformed.。INPUT_LIMIT：輸入太長／Input is too long.。UNICODE：輸入含有不完整的字元／Input contains an incomplete character.。EMPTY：必填／This field is required.。MONEY_FORMAT：金額請用數字，最多兩位小數／Enter an amount with at most two decimal places.。PERCENT_FORMAT：百分比請用數字，最多兩位小數／Enter a percentage with at most two decimal places.。INTEGER_FORMAT：請輸入整數／Enter a whole number.。RANGE：超出允許範圍／Out of range.。OUTPUT_LIMIT：明細太大，無法下載／The breakdown is too large to download.。INTERNAL／WORKER_ERROR：計算失敗，請重試／Something went wrong. Try again.。

固定下載 `discount-calculator-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/discount-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 金額與百分比一律先轉整數分／basis points 再以 BigInt 運算；禁止 parseFloat 後乘除，浮點誤差會改動 half-up 的 .5 邊界（fixtures `half-up-step-rounding` 專門守這條）。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算折扣」，五步明細、摘要（單價／總價／共省／有效折扣／幾折）和完整明細下載符合核心 fixtures。 |
| boundaries | 合法端點、剛好越界、half-up 恰 .5、券大於折後價、第一個錯誤和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯（含八折／九折說明）、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。7 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `stacked-discounts-with-tax` | 八折再九折連乘、稅在折扣後，有效折扣 28.00% 不是 30% |
| `coupon-clamps-at-zero` | 券大於折後價只抵到 0，價格不為負，有效折扣 100.00% |
| `half-up-step-rounding` | 每步 half-up：502.5 分進位為 503 |
| `no-discount-tax-only` | 無折扣：幾折 10.0、共省 0、只加稅 |
| `fractional-percent-full-chain` | 小數百分比 12.5%、券、數量 2 的完整鏈 |
| `percent-over-range` | 100.01% 文法合法但 RANGE（bp 上限） |
| `money-with-comma` | 原價含千分位逗號，MONEY_FORMAT |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限與剛好超限：price `"0"` 與 `"0.00"` RANGE、最小 `"0.01"` 合法、金額整數部 8 位 MONEY_FORMAT；discount `"100"` 全額折抵後稅為 0、百分比 `"100.00"` 合法而 `"100.01"` RANGE；quantity `"1000"` RANGE、`"10000"` INPUT_LIMIT；券恰等於折後價。另測錯型別、額外欄、缺欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。性質檢查：稅列之前每步 priceCents 不增；拿掉稅（taxRate 改 0）不改變 totalSavedCents 與 effectiveOffPercent；任一折扣調高，unitFinalCents 不增。

候選 gate（均 NOT_RUN）

- 於 `tools/discount-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「折扣計算機」，title「折扣計算機｜Gloss Tools」，description「逐步算出兩重折扣、折價券與折扣後稅金的每步價格，看最終單價、總價、實際省下多少與約幾折。」。英文 lang=en，H1 “Discount Calculator”，title “Discount Calculator | Gloss Tools”，description “Trace two stacked discounts, a coupon and after-discount tax step by step to the final unit price, total, amount saved and effective percent off.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。八折是什麼意思？付原價的 80%，也就是折扣 20%。 / What does 八折 mean? You pay 80% of the list price, i.e. 20% off.
- FAQ。20% 再 10% 是 30% 嗎？不是。先付 80% 再付 90%，實付 72%，有效折扣 28%。 / Is 20% off plus another 10% off the same as 30% off? No. Paying 80% then 90% leaves 72% of the price, an effective 28% off.
- FAQ。稅在折扣前還是折扣後算？本工具固定在兩重折扣與折價券之後，對折後價計稅。 / Is tax applied before or after discounts? This tool always applies tax to the price after both discounts and the coupon.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://discount-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。規格任務 id `labs-discount-calculator-spec-20261109`（由主代理登記，本文作者不執行登記）。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/discount-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

# 餐費均分（含稅與小費） / Restaurant Bill Split with Tax and Tip

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-bill-split-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

聚餐或出遊結帳時，要把一張含稅與小費的帳單平均分給在場每個人：稅額與小費的計算順序、小費以稅前或稅後金額為基數，都要先講清楚，最後每人金額加總必須與總額分毫不差，不能因為四捨五入少掉幾分錢。

- 餐桌邊。手機輸入帳單金額、稅率、小費比例與人數，當場唸出每人應付；小費要以稅前還是稅後金額計算，可依當地習慣現場切換。
- 事後對帳。桌面重算同一張帳單，核對稅額、小費與每人金額，下載報告留存。

使用情境為一般聚餐與旅遊分帳。資料只保留在目前頁面草稿。

## scope

單一帳單等額分攤：稅額＝帳單金額×稅率；小費＝選定基數×小費比例，基數為稅前或稅後由使用者選擇；總額等分，餘分由排序在前的人依序多付一分。非目標為依品項或比例的不等額分攤、多幣別與匯率、未稅價反推、依用量加權分攤、付款、帳目儲存或多人同步編輯。

與既有預案比對，最相近者的實質差異如下。

- 既有 Bill Splitter 由每人實際已付金額推算誰付誰。本工具處理結帳前的單張餐費，依輸入的稅率與小費比例計算總額和各人應付，不記錄已付金額或產生轉帳清單。 [既有固定產品規格 FR-03–05](https://github.com/KYStr/glossquote-labs-bill-splitter/blob/c82e8a182b36cf9568e28d9179a923e0fdaf7a4b/PRODUCT.md#L5-L9)
- 依各戶用電量加權分攤電費，產出各戶應繳。此處是等額分攤，且核心在稅／小費的計算順序與小費基數選擇。（shared-electricity-split，本批 run 4 規格）
- 單一金額的折扣或百分比運算。此處輸出逐人金額且要求總和精確相等，含餘數分配規則。（discount-calculator、percentage-calculator，本批 run 4 規格）
- 稅金內含與未稅價互換。此處稅額永遠以輸入的稅前帳單金額乘上稅率，不做含稅價反推。（tax-included-converter，本批 run 5 規格）

判定規則由本文定義，金額不綁幣別；無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「帳單金額、稅率與小費比例 / Bill amount, tax rate and tip percent」
- 欄位或說明「小費計算基數與人數 / Tip base and people」；小費基數是二選一的選項組：「稅前金額 / Pre-tax amount」與「稅後金額 / Post-tax amount」。
- 「計算每人應付 / Calculate per-person amounts」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「帳單明細與每人應付 / Bill breakdown and per-person amounts」先摘要（稅額、小費、總計）再列逐人金額，逐人列標示「第 N 人 / Person N」；最多 100 列，長表在有 label 的區域捲動。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。逐人列與摘要同列呈現，總和核對以文字標示「每人金額加總與總計相同 / The per-person amounts add up to the total.」。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"bill":"100.00","taxPercent":"10","tipPercent":"15","tipBase":"pre-tax","people":"3"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

- `bill`：金額字串，全 ASCII，文法 `^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$`，raw 最多 9 單元，值 0–999999.99（即分 ≤ 99,999,999），單位為帳單原幣別。
- `taxPercent`、`tipPercent`：百分比字串，全 ASCII，文法 `^(0|[1-9][0-9]*)(\.[0-9]{1,3})?$`，raw 最多 7 單元，值 0–100（含端點）。
- `tipBase`：列舉字串，恰為 `pre-tax` 或 `post-tax`，raw 最多 8 單元。
- `people`：整數字串，全 ASCII，文法 `^(0|[1-9][0-9]*)$`，raw 最多 3 單元，值 1–100（含端點）。
- 預設 bill 100.00、taxPercent 10、tipPercent 15、tipBase pre-tax、people 3。範例與預設相同（fixtures 第一個案例）。

驗證與計算順序如下，整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆為 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 先驗整體形狀（SCHEMA）。再依 bill、taxPercent、tipPercent、tipBase、people 的欄位順序逐欄驗證；每欄依序為容量 INPUT_LIMIT、不成對 surrogate UNICODE、缺內容 EMPTY、文法或列舉、範圍 RANGE，第一個失敗即整份失敗。文法失敗代碼：bill、taxPercent、tipPercent 為 DECIMAL_FORMAT，people 為 INTEGER_FORMAT；tipBase 非列舉值為 ENUM；值超出範圍為 RANGE，field 即該欄名。
2. 精確解析，不經浮點：billCents ＝ bill 整數部×100 ＋ 小數部（不足兩位右補 0）；percentMilli ＝ 百分比整數部×1000 ＋ 小數部（不足三位右補 0），taxPercent 與 tipPercent 各自解析。percentMilli 是百分比×1000 的整數（15% → 15000，8.875% → 8875）。
3. 稅額先算且只捨入一次：taxCents ＝ roundHalfUp(billCents × taxMilli ÷ 100000)。roundHalfUp(n/d)（n,d 皆非負整數）定義為：以整數除法取商 q 與餘數 r，2r ≥ d 時取 q+1，否則取 q（四捨五入，恰為一半時進位）。全程用 BigInt。
4. 小費基數只由 tipBase 決定：`pre-tax` 時 tipBaseCents ＝ billCents；`post-tax` 時 tipBaseCents ＝ billCents ＋ taxCents（用已捨入的稅額）。tipCents ＝ roundHalfUp(tipBaseCents × tipPercentMilli ÷ 100000)，與稅額同法、各自只捨入一次。totalCents ＝ billCents ＋ taxCents ＋ tipCents，不再捨入。
5. 等分總額：q ＝ floor(totalCents ÷ people)，r ＝ totalCents − q×people（0 ≤ r ＜ people）。sharesCents 第 1..r 人各為 q+1，第 r+1..people 人各為 q；即排序在前的人依序吸收每一分餘數。不變量：sum(sharesCents) ＝ totalCents、max − min ≤ 1、序列非遞增。分攤不再捨入。
6. 結果 {billCents, taxCents, tipBaseCents, tipCents, totalCents, sharesCents}，全為已驗證的安全整數，金額單位皆為分。畫面金額以「整數部.兩位小數」呈現，不加千分位、不加幣別符號（單位即帳單原幣別）；機器值不隨 locale 改。

固定下載 `bill-split-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/bill-split-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 金額與百分比在核心內只以 BigInt 整數（分與千分之一百分比）運算；禁止浮點參與稅額、小費或分攤。核心不讀 Date、locale 或主機時區，同一輸入在任何環境得同一結果。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算每人應付」，畫面和完整報告符合核心 fixtures，且逐人金額總和等於總計。 |
| boundaries | 合法端點、剛好越界、第一個錯誤和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。18 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `basic-pre-tax` | 稅前小費基數與餘數分配 |
| `post-tax-tip` | 稅後小費基數 |
| `tax-half-up-tie` | 稅額恰為半分時四捨五入進位 |
| `tip-rounds-down` | 小費小數低於半分時捨去 |
| `fractional-tax-rate` | 三位小數稅率與四人餘數 |
| `zero-bill` | 零帳單全部為零 |
| `single-person` | 一人全額，稅與小費各自捨入一次 |
| `even-split-no-extras` | 無稅無小費且整除 |
| `large-party-post-tax` | 七人稅後小費，稅額與小費皆捨去小數 |
| `tiny-bill-many-people` | 總額小於人數，後段的人分到零 |
| `people-zero` | 人數零低於範圍 |
| `people-over-max` | 人數超過上限 |
| `bill-format` | 金額小數超過兩位 |
| `percent-format` | 稅率小數超過三位 |
| `tip-base-enum` | 小費基數不是列舉值 |
| `bill-empty` | 金額缺內容 |
| `bill-input-limit` | 金額原始長度超過容量，先於文法失敗 |
| `tip-percent-range` | 小費比例超過百分之百 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限（bill 999999.99、百分比 0 與 100、people 1 與 100）、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證所有成功案例的 sum(sharesCents)＝totalCents、max−min≤1、sharesCents 非遞增；驗證稅額恰為半分與剛好低於半分的相鄰案例；驗證同一輸入改 tipBase 只改變小費與其後總額，不改變稅額。

候選 gate（均 NOT_RUN）

- 於 `tools/bill-split-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「餐費均分（含稅與小費）」，title「餐費均分（含稅與小費）｜Gloss Tools」，description「把帳單加上稅額與小費後精確分攤到每個人：小費可選以稅前或稅後金額為基數，餘數由排前面的人逐分吸收，每人金額加總與總額分毫不差。」。英文 lang=en，H1 “Restaurant Bill Split with Tax and Tip”，title “Restaurant Bill Split with Tax and Tip | Gloss Tools”，description “Add tax and tip to a bill and split the total exactly: choose a pre-tax or post-tax tip base, and the earliest payers absorb the remainder cents so the shares always sum to the total.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。小費要用稅前還是稅後金額算？各地習慣不同，美國多以稅前金額為準；本工具把基數做成選項，稅額本身永遠以帳單金額計算。 / Pre-tax or post-tax tip? Customs differ — in the US the pre-tax amount is customary; this tool makes the base a choice, and the tax itself is always calculated on the bill amount.
- FAQ。為什麼前面的人多付一分錢？總額除以人數常除不盡，餘下的每一分依序分給排前面的人，確保每人金額加總與總額完全相等，差距最多一分。 / Why do the first payers pay one cent more? The total rarely divides evenly; each leftover cent goes to the next person in order, so the shares always add up to the exact total and differ by at most one cent.
- FAQ。金額是什麼幣別？不限幣別，輸入與輸出使用同一金額單位，小數固定兩位。 / What currency is this in? The tool is currency-neutral: inputs and results use the same money unit, always with two decimal places.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://bill-split.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/bill-split-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

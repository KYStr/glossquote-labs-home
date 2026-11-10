# 薪資換算 / Salary Converter

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-salary-converter-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md) · [預案品質與補庫說明](../../SPECIFICATION-STOCK.md)

## goal

求職者、上班族或接案者在比較或核對薪資時，手上通常只有一種計薪基準的金額（月薪、日薪、時薪或含年終的年薪），卻需要其他基準的數字才能比較 offer、核對薪資單或估算年收入。本工具讓使用者選一種基準輸入一次，立即得到全部六個金額，且換算慣例與捨入方式都明寫在頁面上，不必猜每個數字是怎麼來的。

- 桌面。求職者在電腦前把月薪制 offer 與時薪制兼職放進同一把尺比較，含年終獎金月數一起算年薪。
- 行動。上班族在手機上核對薪資單上的時薪是否與約定月薪對得起來，或面試空檔快速反推年薪對應的月薪。

使用情境為一般薪資溝通與核對。資料只保留在目前頁面草稿，不判斷任何法定義務。

## scope

MVP：單次換算。四種基準（月薪／日薪／時薪／年薪）擇一輸入、年終獎金月數（0–24，可一位小數）、六個輸出（月薪、日薪、時薪、年薪（不含獎金）、年終獎金、年薪（含獎金）），全為新台幣整數元。慣例固定：日薪＝月薪÷30、時薪＝月薪÷240（每月 30 天 × 每日 8 小時）、年薪＝月薪×（12＋獎金月數），頁面靜態揭露此慣例與捨入說明。

非目標：加班費倍率與勞基法平日每小時工資額的法定計算、勞保／健保／勞退扣繳、所得稅扣繳與淨領金額、資遣費與退休金、薪資單或證明文件產製、多份工作合計、外幣換算、基本工資（最低工資）查詢與歷史費率。金額上限為防呆護欄，不是薪資水準建議。

已比對本 repo `docs/specs/` 既有 101 份預案，最相近者的實質差異如下。

- 以出席者時薪估一場會議的人事成本。此處是個人薪資金額在四種計薪基準間的換算，不涉多人、不涉會議時間。[meeting-cost-calculator](../meeting-cost-calculator/SPEC.md)
- 一般分數與有理數運算練習。此處是固定薪資慣例與整數元捨入的成品工具，不開放任意運算式。[rational-arithmetic](../rational-arithmetic/SPEC.md)

判定規則由本文定義，無線上資料或外部服務依賴。240 與 30 為揭露的慣例常數，不是法規引用。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位「計算基準 / Salary basis」：四段選項「月薪 / Monthly」「日薪 / Daily」「時薪 / Hourly」「年薪 / Annual」，決定金額欄的基準。
- 欄位「金額（新台幣）/ Amount (NT$)」：所選基準下的金額。
- 欄位「年終獎金（月數）/ Year-end bonus (months)」：以月薪為單位的年終獎金月數，可一位小數。
- 「換算薪資 / Convert salary」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例（月薪 40,000、年終 2 個月），明示範例並等待手動執行。
- 「換算結果 / Conversion result」先摘要再列細節：固定六列「月薪 / Monthly salary」「日薪 / Daily pay」「時薪 / Hourly pay」「年薪（不含獎金）/ Annual salary (excl. bonus)」「年終獎金 / Year-end bonus」「年薪（含獎金）/ Annual salary (incl. bonus)」，金額以千分位逗號分組的整數顯示，不以顏色區分高低。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 表單下方靜態顯示換算慣例與捨入說明（見 inputsOutputs 的固定揭露文），兩語頁面各顯示對應語言版本，不需執行即可見。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。揭露文維持可見。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"sourceBasis":"monthly","amount":"40000","bonusMonths":"1"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

欄位順序固定為 sourceBasis、amount、bonusMonths，驗證與錯誤回報都依此順序。raw 容量以 UTF-16 code units 計。

| 欄位 | 型別與文法 | 容量 | 範圍與預設 |
| --- | --- | --- | --- |
| sourceBasis | 列舉字串，僅 `monthly`、`daily`、`hourly`、`annual`，其他值 ENUM | 7 | 預設 `monthly` |
| amount | ASCII 十進字串：整數部 `0` 或非零開頭、無空白／符號／指數／千分位，可帶 `.` 加 1–2 位小數；不符合為 DECIMAL_FORMAT | 12 | 必須 > 0，且依基準上限：monthly ≤ 99,999,999、daily ≤ 9,999,999、hourly ≤ 999,999、annual ≤ 999,999,999，超出 RANGE |
| bonusMonths | ASCII 十進字串：整數部 `0` 或非零開頭，可帶 `.` 加恰一位小數；不符合為 DECIMAL_FORMAT | 4 | 0–24（含端點），超出 RANGE。預設草稿帶 `1` |

每欄依序檢查：容量 INPUT_LIMIT、不成對 surrogate UNICODE、缺內容 EMPTY、文法（sourceBasis 為 ENUM，amount／bonusMonths 為 DECIMAL_FORMAT）、範圍 RANGE。amount 的範圍檢查使用已驗證的 sourceBasis 選上限；sourceBasis 本人出錯時先回它的錯誤。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 恆為 null（本工具無列輸入）。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

換算（全程精確有理數，不經浮點）：

1. 設 A 為 amount 的精確值、B 為 bonusMonths 的精確值。正規月薪 M：basis 為 monthly 時 M＝A；daily 時 M＝A×30；hourly 時 M＝A×240；annual 時 M＝A÷（12＋B）。
2. 六個輸出全部由未捨入的 M 一次換算：monthly＝M、daily＝M÷30、hourly＝M÷240、annualBase＝M×12、bonusAmount＝M×B、annualTotal＝M×（12＋B）。
3. 每個輸出各自四捨五入（round half up，恰 .5 進位）至整數元，只捨入一次。annualTotal 由未捨入 M 直接乘回，不由已捨入的 annualBase＋bonusAmount 相加，因此顯示值之間可能差 1 元（揭露文已註明）。
4. result 為 `{monthly,daily,hourly,annualBase,bonusAmount,annualTotal}`，皆為整數。合法輸入下最大值 annualTotal＝10,799,998,920（日薪基準上限 ×36），遠小於 2^53，JSON 數字精確。

固定揭露文（兩語頁面靜態顯示，逐字）：

- 「換算慣例：日薪 = 月薪 ÷ 30、時薪 = 月薪 ÷ 240（每月 30 天 × 每日 8 小時）、年薪 = 月薪 ×（12 ＋ 年終獎金月數）。這些是台灣常見的薪資換算慣例，不是勞動基準法的定義；實際金額以勞動契約與公司規定為準。」
- "Conventions: daily pay = monthly ÷ 30; hourly pay = monthly ÷ 240 (30 days × 8 hours a day); annual pay = monthly × (12 + year-end bonus months). These are common Taiwan payroll conventions, not definitions under the Labor Standards Act; your employment contract and company rules govern the actual amounts."
- 「每個金額都由未捨入的月薪一次換算，再四捨五入到整數元；因此時薪 × 240 不一定等於顯示的月薪，年薪（含獎金）與年薪（不含獎金）＋獎金之間也可能差 1 元。」
- "Each amount is converted in one step from the unrounded monthly figure and rounded half-up to whole NT$. Hourly × 240 may therefore differ from the displayed monthly amount, and the displayed annual total may differ by NT$1 from the displayed base annual plus bonus."

固定錯誤訊息（逐字，依 code）：SCHEMA「輸入格式不正確。/ The input shape is invalid.」；INPUT_LIMIT「輸入太長。/ The input is too long.」；UNICODE「輸入含有不完整的字元。/ The input contains an unpaired surrogate.」；EMPTY「此欄必填。/ This field is required.」；ENUM「請選擇有效的計算基準。/ Choose a valid salary basis.」；DECIMAL_FORMAT「數字格式不正確。/ Invalid number format.」；RANGE「數值超出允許範圍。/ The value is outside the allowed range.」；INTERNAL／WORKER_ERROR「處理失敗，請重試。/ Processing failed. Try again.」；OUTPUT_LIMIT「報告太大，無法下載。/ The report is too large to download.」

固定下載 `salary-converter-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。案例 1 的正規內容為 `{"annualBase":480000,"annualTotal":560000,"bonusAmount":80000,"daily":1333,"hourly":167,"monthly":40000}` 加一個 LF。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/salary-converter/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 金額以 BigInt 精確有理數運算：amount 解析為百分之一單位的整數、bonusMonths 解析為十分之一單位的整數，M 以 BigInt 分子／分母表示；四捨五入以（2p＋q）÷（2q）整數除法（p、q 為非負）完成，不經浮點。測試 import 同一份核心。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入以四種基準各執行「換算薪資」，畫面六列和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 四基準各自的合法上限與剛好越界、金額 0、小數位數上限、獎金 24／24.1、第一個錯誤與三種 controller case 的證據。 |
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
| `monthly-basic` | 月薪基準，年終 2 個月，一次換算全部金額 |
| `hourly-basis` | 時薪基準反推月薪（×240） |
| `annual-basis-with-bonus` | 年薪基準先除以（12＋獎金月數）得月薪 |
| `daily-basis-half-up-tie` | 日薪基準；時薪恰好 .5，四捨五入進位 |
| `fractional-bonus` | 獎金月數可為一位小數（1.5 個月） |
| `annual-fractional-monthly` | 年薪反推月薪非整數，各輸出由未捨入月薪分別換算 |
| `max-monthly-max-bonus` | 月薪與獎金月數同時取合法上限 |
| `decimal-hourly-amount` | 時薪可帶兩位小數；時薪輸出 .5 進位 |
| `tiny-monthly` | 最小月薪；日薪與時薪捨入為 0 仍是成功結果 |
| `amount-zero` | 金額必須大於 0 |
| `hourly-over-cap` | 時薪基準的金額上限為 999,999 |
| `amount-too-many-decimals` | 金額最多兩位小數，三位小數為文法錯誤 |
| `bonus-over-range` | 獎金月數上限 24 |
| `bonus-empty` | 獎金月數留空為必填錯誤（無隱含預設） |
| `bad-basis` | 未知基準為 ENUM 錯誤，先於金額檢查 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測四基準上限恰好值與 +1（或 +0.01）越界、獎金 24 合法、24.1 回 RANGE、24.55 因長度超限先回 INPUT_LIMIT、0.55 在容量內但小數位過多回 DECIMAL_FORMAT、金額 `0.01`（時薪基準，M＝2.4，monthly 捨入 2、hourly 捨入 0）、前導零 `040000` DECIMAL_FORMAT、千分位 `40,000` DECIMAL_FORMAT、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證不變量：annualTotal 與 round(M×(12+B)) 恆等、monthly 基準時 annualBase＝roundHalfUp(A×12)（整元輸出）、所有輸出為非負整數。

候選 gate（均 NOT_RUN）

- 於 `tools/salary-converter/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「薪資換算」，title「薪資換算｜Gloss Tools」，description「輸入月薪、日薪、時薪或年薪任一種金額，依台灣常見慣例一次換算全部：日薪為月薪 ÷ 30、時薪為月薪 ÷ 240，年薪含年終獎金月數。」。英文 lang=en，H1 “Salary Converter”，title “Salary Converter | Gloss Tools”，description “Enter pay as a monthly, daily, hourly or annual amount and convert to all four at once under common Taiwan conventions: daily is monthly ÷ 30, hourly is monthly ÷ 240, and annual includes year-end bonus months.”。兩頁靜態呈現操作、限制、揭露文與 FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。為什麼時薪是月薪除以 240？慣例以每月 30 天、每日 8 小時計算，30 × 8 = 240。勞基法實務計算平日每小時工資額時也常用同一基礎，但本工具只做金額換算，不判斷加班費或法定義務。 / Why is hourly pay the monthly salary divided by 240? The convention assumes 30 days a month at 8 hours a day, and 30 × 8 = 240. The same basis is commonly used in practice for the regular hourly wage rate under the Labor Standards Act, but this tool only converts amounts; it does not determine overtime pay or legal obligations.
- FAQ。年終獎金月數可以輸入小數嗎？可以，最多一位小數，例如 1.5 個月，範圍 0 到 24 個月。獎金金額 = 月薪 × 月數，年薪（含獎金）= 月薪 ×（12 ＋ 月數）。 / Can the bonus be a fraction of a month? Yes, up to one decimal place, for example 1.5 months, within 0 to 24 months. The bonus amount is monthly × months, and the annual total is monthly × (12 + months).
- FAQ。用年薪反推時，為什麼各金額兜不回年薪？月薪 = 年薪 ÷（12 ＋ 獎金月數）通常不是整數。每個顯示金額都由未捨入的月薪分別換算並四捨五入，所以彼此可能差 1 元；年薪（含獎金）本身由未捨入月薪直接乘回，與輸入年薪在捨入後一致。 / Why don't the amounts reconcile exactly when converting from an annual salary? Monthly = annual ÷ (12 + bonus months) is usually not a whole number. Each displayed amount is converted separately from that unrounded monthly figure and rounded, so figures may differ by NT$1; the annual total itself is multiplied back from the unrounded monthly figure and matches the entered annual amount after rounding.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://salary-converter.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/salary-converter/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

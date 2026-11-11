# 年齡計算機 / Age Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-age-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

想確認自己或家人「現在到底幾歲幾個月又幾天」、出生那天是星期幾、下一個生日還剩幾天的人，常只拿到足歲年數，或在 2 月 29 日出生、月底生日等邊界遇到不同工具各算各的。本工具以出生日期與一個參考日期（預設今天）一次給出足歲的年／月／日、總天數、出生星期、下一個生日日期與倒數天數，借位規則與觀察生日定義全部釘死。

- 桌面。家長替孩子報名前核對足歲年月日，下載報告留存。
- 行動。手機在聊天中被問到年齡或生日倒數，輸入生日立刻回答。

使用情境為依固定日曆規則的推算。資料只保留在目前頁面草稿。

## scope

固定範圍：西元出生日期與參考日期 → 足歲年／月／日（借位運算）、總天數、出生星期、本年觀察生日判定、下一個生日日期、距下一個生日天數與屆時滿歲數。非目標為出生時刻與時分秒倒數、時區換算、民國／農曆日期輸入、星座或生肖推導、法律上的足歲資格判定（如入學、投票、兵役）、1900 年以前或 2100 年以後的輸入日期、以出生時刻微調足歲。

日期規則由本文定義：Gregorian 曆、Fliegel & Van Flandern 整數 Julian 日序數（JDN）公式、借位慣例（日數不足時向參考月的前一個月借其完整月長）、2 月 29 日出生者於非閏年以 3 月 1 日為觀察生日。此觀察生日慣例與 `school-entry-year` 規格的足歲慣例一致（同為 2 月 29 日以次一可達日期認定）。不引用線上查詢、不依賴外部服務、不讀主機時鐘或時區。

已與本 repo 既有 specs 與 legacy 比對，最相近者的實質差異如下。

- 入學年度與年級推算（`school-entry-year`）。同樣以出生日期為輸入並採 2 月 29 日觀察慣例，但其固定輸出是學年度、入學年與年級對照，沒有年齡的年／月／日拆解、總天數、出生星期與生日倒數。此處只做年齡本身。
- 通用日期差與日期加減（legacy `date-calculator`）。只算兩日期相差天數或加減天數，沒有足歲借位拆解、星期與生日語義。此處的年／月／日採釘死的借位慣例，下一個生日為獨立推導輸出。
- 預產期推算（`pregnancy-due-date-calculator`）。同為日期推導，但對象是孕期週數與預產期，與年齡無關。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「出生日期與參考日期 / Birth date and reference date」
- 「計算年齡 / Calculate age」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。「使用今天 / Use today」只把參考日期填為裝置當地今天（YYYY-MM-DD），屬一般草稿編輯，立即使舊結果失效，不自動執行；核心不讀時鐘，此填入只發生在 app 層。
- 結果順序固定：先「年齡 / Age」摘要（足歲年、月、日與總天數），再「出生星期 / Weekday of birth」，再「下一個生日 / Next birthday」（日期、倒數天數、屆時滿歲數；參考日即觀察生日時以文字及符號標示「今天生日 / Birthday today」）。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。參考日期欄由 app 層以裝置當地今天預填，出生日期為空。 |
| dirty | 任一輸入、選項、來源或範例改變（含「使用今天」填入），立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。參考日為觀察生日時顯示生日標示，否則不顯示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"birthDate":"","referenceDate":""}`（app 層隨即以裝置當地今天重新預填參考日期）並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。核心不讀時鐘、時區或 `Date`；所有運算為整數 JDN 運算。

- 兩欄皆日期字串。文法恰為 `YYYY-MM-DD`：四位 ASCII 數字、連字號、兩位數字、連字號、兩位數字，無空白或其他字元。raw 每欄最多 10 個 UTF-16 code units。預設 birthDate 為空字串、referenceDate 為空字串（app 層以裝置當地今天預填參考日期；到達核心的空字串一律 EMPTY）。兩欄的合法日期範圍均為 1900-01-01 至 2100-12-31（含端點）。
- 先容量、再 surrogate、再該欄文法與曆法，跨欄檢查在兩欄皆合法後依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 一律 null（本工具無列）。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

逐欄驗證順序（欄位順序固定 birthDate 先、referenceDate 後；任一欄失敗即停止，不驗下一欄）：

1. raw 長度 > 10 → INPUT_LIMIT。
2. 含不成對 surrogate → UNICODE。
3. 空字串 → EMPTY。
4. 不符 `^[0-9]{4}-[0-9]{2}-[0-9]{2}$` → DATE_FORMAT。
5. 不是真實 Gregorian 日期（月 1–12、日超出該月天數，2 月天數依閏年規則：年被 4 整除且（不被 100 整除或被 400 整除））→ INVALID_DATE。
6. 日期早於 1900-01-01 或晚於 2100-12-31 → RANGE。

跨欄檢查：兩欄皆合法後，若 referenceDate 早於 birthDate（以 JDN 比較）→ DATE_ORDER，field 為 `referenceDate`。相等合法（年齡 0）。

推導（全部整數運算，無浮點、無捨入）：

1. JDN 採 Fliegel & Van Flandern 公式：a=⌊(14−month)/12⌋，y=year+4800−a，m=month+12a−3，JDN=day+⌊(153m+2)/5⌋+365y+⌊y/4⌋−⌊y/100⌋+⌊y/400⌋−32045。totalDays = JDN(referenceDate) − JDN(birthDate)，必 ≥ 0。
2. 足歲借位：Y=refYear−birthYear、M=refMonth−birthMonth、D=refDay−birthDay。若 D<0：M 減 1，D 加上「參考月的前一個月」的完整天數（參考月為 1 月時取前一年 12 月，31 天）。若再 M<0：Y 減 1，M 加 12。結果不變量：ageYears ≥ 0、0 ≤ ageMonths ≤ 11、0 ≤ ageDays，且 ageDays 小於所借月份天數。此借位慣例是本規格釘死的定義；與「逐月步進、月底夾日」的另一種慣例在月底案例上結果不同（見 fixtures `borrow-february-length` 與 `month-end-leap`），實作不得改採他種慣例。
3. 出生星期：birthWeekdayIndex = (JDN(birthDate)+1) mod 7，0=星期日、1=星期一、…、6=星期六。名稱表釘死：index 0–6 的 zh 依序為 星期日、星期一、星期二、星期三、星期四、星期五、星期六；en 依序為 Sunday、Monday、Tuesday、Wednesday、Thursday、Friday、Saturday。核心回傳 index 與兩語名稱。
4. 觀察生日：某年 Y 的觀察生日為該年的出生月／日；出生為 2 月 29 日且 Y 非閏年時為 Y 年 3 月 1 日。isBirthdayToday = 參考日期等於參考年分的觀察生日。nextBirthday = 第一個大於或等於參考日期的觀察生日（先取參考年分者，早於參考日期才取次年分者；次年分仍以其自身閏年狀態決定 2 月 29 日或 3 月 1 日）。daysUntilNextBirthday = JDN(nextBirthday) − JDN(referenceDate)；參考日即觀察生日時為 0。turningAge = nextBirthday 的年分 − 出生年分（出生日當天為 0）。nextBirthday 的年分可達 2101，不受輸入 RANGE 限制。
5. 結果 `{ageYears,ageMonths,ageDays,totalDays,birthWeekdayIndex,birthWeekdayZh,birthWeekdayEn,isBirthdayToday,nextBirthday,daysUntilNextBirthday,turningAge}`。nextBirthday 為 `YYYY-MM-DD` 字串，其餘計數為非負整數，isBirthdayToday 為布林。畫面主顯示年齡三段與總天數，其次星期與下一個生日；機器值不隨 locale 改。

固定下載 `age-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/age-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單，並負責「參考日期預填今天」與「使用今天」（僅 app 層讀裝置當地日期，核心永遠只收明確字串）。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 核心不得使用 `Date`、`Intl` 或任何主機時鐘／時區來源；同一輸入在任何時區、任何主機時間下輸出逐字相同，此性質由測試在多個 TZ 下重跑核心案例驗證。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算年齡」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點（1900-01-01、2100-12-31、出生日等於參考日）、剛好越界、第一個錯誤、2 月 29 日三態（閏年當日／非閏年 3 月 1 日／前一天）和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。14 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `borrow-days-months` | 一般借位：向參考月前一個月（10 月，31 天）借天數 |
| `exact-birthday` | 參考日正好生日：整年、倒數 0 |
| `feb29-leap-ref` | 2 月 29 日出生、閏年當日：整 4 歲 |
| `feb29-observed-mar1` | 2 月 29 日出生、非閏年 3 月 1 日：觀察生日整 3 歲 |
| `feb29-day-before` | 觀察生日前一天：2 歲 11 個月 30 天、倒數 1 |
| `born-today` | 出生日等於參考日：全 0、第 0 個觀察生日 |
| `borrow-across-year` | 跨年雙重借位：年退、月補、日借前一年 12 月 |
| `borrow-february-length` | 借位月長以 2 月 28 天為準（釘死慣例對月底案的結果） |
| `month-end-leap` | 1 月 31 日到 2 月 29 日：0 個月 29 天，與總天數一致 |
| `next-birthday-next-year` | 今年生日已過：下一個生日在次年 |
| `date-order` | 參考日期早於出生日期 → DATE_ORDER（referenceDate） |
| `invalid-date` | 非閏年 2 月 29 日 → INVALID_DATE（birthDate） |
| `format-slashes` | 斜線分隔 → DATE_FORMAT（birthDate） |
| `range-low` | 1899-12-31 → RANGE（birthDate） |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法端點 1900-01-01／2100-12-31、2100-12-31 參考時下一個生日落入 2101、錯型別、額外欄、單獨 surrogate、超長輸入（INPUT_LIMIT 先於 DATE_FORMAT）、2023-02-29 與 1900-02-29（世紀年非閏年）皆 INVALID_DATE、2000-02-29 合法、借位不變量（0 ≤ ageMonths ≤ 11、ageDays 小於所借月長）、同一輸入在 TZ=UTC／Asia/Taipei／America/New_York／Pacific/Kiritimati 下核心輸出逐字相同。所有成功案例另以重構驗證：觀察生日序列與 totalDays 一致。

候選 gate（均 NOT_RUN）

- 於 `tools/age-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「年齡計算機」，title「年齡計算機｜Gloss Tools」，description「輸入出生日期與參考日期（預設今天），得到足歲的年、月、日、總天數、出生星期與下一個生日倒數。」。英文 lang=en，H1 “Age Calculator”，title “Age Calculator | Gloss Tools”，description “Enter a birth date and a reference date (today by default) to get the exact age in years, months and days, total days lived, the weekday of birth, and a countdown to the next birthday.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。2 月 29 日出生的人，非閏年幾號生日？本工具以 3 月 1 日為非閏年的觀察生日；閏年則為 2 月 29 日。 / Born on February 29 — when is the birthday in a non-leap year? This tool observes it on March 1 in non-leap years, and on February 29 in leap years.
- FAQ。年齡的「日」怎麼算？日數不足時，向參考月份的前一個月借那個月的完整天數；這是本工具固定的借位慣例，不同工具可能不同。 / How are the days counted? When the days fall short, they borrow the full length of the month before the reference month — the fixed convention of this tool; other tools may differ.
- FAQ。參考日期可以是未來嗎？可以。例如先算孩子在入學日或某個紀念日的年齡；出生日期之後的任何合法日期都可以。 / Can the reference date be in the future? Yes — for example, to find the age on a school-entry date or an anniversary; any valid date after the birth date works.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://age-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/age-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

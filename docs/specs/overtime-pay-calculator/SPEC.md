# 加班費計算機 / Overtime Pay Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-overtime-pay-calculator-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/992da13a7182a172af08f1c755543d373bc01bf7/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

月薪制勞工核對薪資單上的加班費：輸入月薪與單月彙總的平日延時、休息日出勤、國定假日出勤時數，按勞動基準法現行費率逐段算出應領金額，與薪資單逐段對照。

- 桌面。月底在電腦前對著薪資單 PDF，逐欄輸入三種時數，看分段明細找差異。
- 行動。手機在人資辦公室外先試算一次，帶著分段結果進去詢問。

使用情境為核對假設：輸入的月薪視為勞動基準法第 2 條「工資」全額、時數為單月彙總。資料只保留在目前頁面草稿，結果僅供參考，不取代主管機關或法院認定。

## scope

月薪制、單月彙總時數、三類出勤的法定加給試算。非目標為時薪制／日薪制／計件、例假日出勤（第 36 條例假原則不得出勤，僅第 40 條天災、事變或突發事件例外，其加倍工資與補假不在本工具）、特別休假出勤的獨立欄位、加班補休換算（第 32 條之 1）、變形工時（第 30 條第 2、3 項、第 30 條之 1）排班、逐日出勤輸入、延時費以外的扣繳與申報、法律諮詢。

已與既有工具比對，最相近者的實質差異如下。

- work-hours（工時紀錄類）：記錄與彙總出勤時數，不做任何法定費率換算。此處不記錄時數，直接以彙總時數按第 24、39 條分段計費。
- electricity-cost-calculator：依用電級距算電費，級距是費率表而非法律。此處的「級距」是勞基法分段倍率，且含休息日核實計算與休假日加倍發給的法定結構。

判定規則由本文釘定的法規表定義（見 inputsOutputs），無線上資料或外部服務依賴。法規版本：勞動基準法第 24、32、36、37、39 條現行條文（民國 105 年 12 月 21 日修正公布休息日費率，民國 107 年 1 月 31 日修正公布、同年 3 月 1 日施行改為核實計算；本文以 2026-11-09 全國法規資料庫現行條文為準）。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，法規說明用一層 disclosure。

- 欄位或說明「月薪（新台幣）/ Monthly salary (NT$)」
- 欄位或說明「平日延時時數、休息日時數、休假日時數 / Weekday overtime, rest-day and holiday hours」
- 「計算加班費 / Calculate overtime pay」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「加班費明細 / Overtime pay breakdown」先摘要（合計）再列三類的分段明細：每段的時數、乘數與小計，另列平日每小時工資額、一日工資與計入每月延長工時上限的時數。合計超過每月 46 小時的法定基準時，明細附固定提醒文字（見 inputsOutputs 的 capNote）。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。全部時數為 0 時結果為 0 元並附說明，不作錯誤。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"monthlySalary":"","weekdayOtHours":"0","restDayHours":"0","holidayHours":"0"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field 為欄位名或 null、row 恆為 null。JSON fixture 即介面。輸入以 DOM 的 LF 值為準；本工具無檔案欄與逐列輸入。

欄位（皆為字串，與 retry-budget 等同批規格一致的字串介面）：

- `monthlySalary`：月薪，新台幣元。ASCII 十進整數字串，0 或非零開頭，無空白／符號／小數／指數／千分位逗號，raw 最多 8 單元。範圍 1–99,999,999。
- `weekdayOtHours`、`restDayHours`、`holidayHours`：單月彙總時數。ASCII 十進字串，整數部分 0 或非零開頭，可帶一位小數（`.0`–`.9`），無空白／符號／指數，raw 最多 4 單元。小數位只允許 0 或 5（0.5 小時粒度）。範圍：weekdayOtHours 0–4（第 32 條每日正常加延長工時上限 12 小時），restDayHours 0–12，holidayHours 0–12。
- 預設：monthlySalary 空字串（無預設月薪），三個時數欄皆 `"0"`。三個時數同時為 0 是合法輸入，結果全為 0 元。

驗證順序（整份失敗回 `{ok:false,error:{code,field,row}}`，成功僅為 `{ok:true,result}`；資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊）：

1. 物件形狀：非普通物件、未知欄、缺欄、非字串值、accessor → SCHEMA（field 為涉入欄位名，無法指明時 null）。
2. 依 monthlySalary、weekdayOtHours、restDayHours、holidayHours 的固定順序逐欄驗證，第一個錯誤即停：raw 超過單元上限 → INPUT_LIMIT；空字串 → EMPTY；月薪文法不合 → INTEGER_FORMAT；時數文法不合（非數字、二位以上小數、小數點缺位數、符號、全形字元）→ DECIMAL_FORMAT；時數小數位非 0／5 → HOURS_STEP；數值超出範圍 → RANGE。field 即該欄位名，row 恆 null。

法定計算表（釘定，乘數為精確分數，嚴禁用 1.33／1.34／1.67／2.67 等小數近似）：

- 平日每小時工資額 H ＝ 月薪 ÷ 30 ÷ 8（勞動部月薪制換算：月薪 ÷ 每月 30 日 ÷ 每日 8 小時）。一日工資 D ＝ 月薪 ÷ 30 ＝ H × 8。
- 平日延時（第 24 條第 1 項）：第 1–2 小時 ×4/3，第 3–4 小時 ×5/3。
- 休息日出勤（第 24 條第 2 項，107 年施行後依**實際出勤時數**核實計算，無擬制工時）：第 1–2 小時 ×4/3，第 3–8 小時 ×5/3，第 9–12 小時 ×8/3（逾 8 小時部分按勞動部加給標準另再加給 2 又 2/3）。
- 休假日出勤（第 37 條國定假日，第 39 條）：出勤時數 > 0 且 ≤ 8 小時，再加發一日工資 D（未滿 8 小時亦同，行政院勞工委員會 87 年 9 月 14 日台 87 勞動 2 字第 039675 號函）；逾 8 小時部分依第 24 條第 1 項：第 9–10 小時 ×4/3、第 11–12 小時 ×5/3。出勤 0 小時不加發。
- 計入每月延長工時時數 countedOtHours ＝ 平日延時時數 ＋ 休息日實際時數 ＋ 休假日逾 8 小時部分（第 32 條第 2 項、第 36 條第 3 項；休假日 8 小時內不計入）。countedOtHours > 46 時 capNote 為 true（僅資訊提醒：46 小時為第 32 條基準上限，經工會／勞資會議同意單月得至 54 小時，不作錯誤）。

金額與捨入（釘定步驟，無浮點）：全部以精確有理數計算（實作可用 BigInt 分數或等價整數算術）。每類小計（平日、休息日、休假日）各自以 round-half-up（x ≥ 0 時 floor(x + 1/2)）捨入為新台幣整數元；totalPayTwd ＝ 三個已捨入小計之和，不得對未捨入總額再捨入。hourlyRateTwd 與 dailyWageTwd 僅供顯示：H、D 各自以 round-half-up 捨入至小數 2 位、固定 2 位小數字串（如 `"150.00"`、`"181.25"`），不參與金額計算。

結果 `{hourlyRateTwd, dailyWageTwd, weekday, restDay, holiday, totalPayTwd, countedOtHours, capNote}`：

- weekday／restDay：`{hours, bands, payTwd}`。bands 為非零時數段陣列，依時數先後：`{hours, multiplier}`，multiplier 為固定字串 `"4/3"`、`"5/3"`、`"8/3"`；hours 為 0.5 倍數的 JSON 數值（0.5 的倍數在二進位浮點下精確）。時數為 0 時 bands 為 `[]`、payTwd 為 0。
- holiday：`{hours, dayPayApplied, extraHours, bands, payTwd}`。dayPayApplied 為 hours > 0；extraHours ＝ max(0, hours − 8)；bands 只列逾 8 小時部分的分段（乘數 `"4/3"`、`"5/3"`）；payTwd 含一日工資（未捨入）與逾時部分合計後一次捨入。
- countedOtHours 為 0.5 倍數的 JSON 數值。機器值不隨 locale 改；乘數與金額格式不隨語言切換改變。

固定下載 `overtime-pay-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/overtime-pay-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 核心金額一律以 BigInt 有理數或等價精確整數算術實作：時數先換算為半小時單位整數，乘數以分子 4／5／8、分母 3 表示，每類小計分子分母固定後一次 round-half-up。禁止以 Number 浮點乘 4/3、5/3、8/3 或 1.34 等近似值計算金額；fixtures 的 `rounding-half-up` 與 `rest-half-hour-rounding` 即為此設。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算加班費」，畫面和完整報告符合核心 fixtures（含三類分段與合計），使用者取得對應產物。 |
| boundaries | 合法端點（平日 4 小時、休息日／休假日 12 小時）、剛好越界、0.5 粒度違反、第一個錯誤與三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log（月薪與時數不出頁面）。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯（含法規說明與 cap 提醒）、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。13 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected；金額 expected 皆由本文釘定法規表以分數手算。

| 案例 ID | 驗證行為 |
| --- | --- |
| `weekday-basic` | 平日延時基本分段（2 小時 ×4/3 ＋ 1 小時 ×5/3） |
| `weekday-max` | 平日延時上限 4 小時 |
| `rest-day-mid` | 休息日 5 小時核實計算（×4/3、×5/3） |
| `rest-day-long` | 休息日 10 小時含第 9–10 小時 ×8/3 |
| `holiday-full-day` | 休假日 8 小時：再加發一日工資、不計入延時 |
| `holiday-overtime` | 休假日 11 小時：一日工資 ＋ 逾 8 小時 ×4/3、×5/3 |
| `rounding-half-up` | 時薪 181.25 × 4/3 ＝ 241.66… 捨入為 242 |
| `combined-month` | 三類併計，合計為三個已捨入小計之和 |
| `rest-half-hour-rounding` | 0.5 小時粒度與 437.5 捨入為 438 |
| `weekday-over-cap` | 平日延時 4.5 小時 → RANGE |
| `salary-zero` | 月薪 0 → RANGE |
| `step-violation` | 時數 2.3（非 0.5 粒度）→ HOURS_STEP |
| `salary-format` | 月薪含千分位逗號 → INTEGER_FORMAT |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證平日 4／4.5 小時、休息日 12／12.5 小時、月薪 1／0、時數 `"2.25"`（DECIMAL_FORMAT）與 `"2.3"`（HOURS_STEP）的區別、countedOtHours 恰 46（capNote false）與 46.5（capNote true）、三類小計先捨入再相加與總額直接捨入在 `combined-month` 類案例下的一致性。所有 payTwd 皆為非負整數且 totalPayTwd 恆等於三小計之和。

候選 gate（均 NOT_RUN）

- 於 `tools/overtime-pay-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「加班費計算機」，title「加班費計算機｜Gloss Tools」，description「輸入月薪與平日延時、休息日、國定假日出勤時數，依勞動基準法第24、39條現行費率逐段試算加班費。」。英文 lang=en，H1 “Overtime Pay Calculator”，title “Overtime Pay Calculator | Gloss Tools”，description “Estimate Taiwan overtime pay from a monthly salary: weekday overtime, rest-day and national-holiday work at the Labor Standards Act rates, broken down by band.”。兩頁靜態呈現操作、限制、FAQ 與固定免責文字「試算結果僅供參考，實際金額以勞雇約定及主管機關認定為準。／ This estimate is for reference only; actual pay follows the employment agreement and the competent authority's determination.」。
- FAQ。休息日出勤 1 小時算幾小時？自民國 107 年 3 月 1 日起已刪除擬制工時，休息日工資與工時都依實際出勤時數計算。 / How are rest-day hours counted? Since 1 March 2018 the deemed-hours rule was abolished; rest-day pay and hours use actual hours worked.
- FAQ。平日每小時工資額怎麼算？月薪制為月薪 ÷ 30 日 ÷ 8 小時。 / How is the hourly rate derived? For monthly-paid workers, monthly salary ÷ 30 days ÷ 8 hours.
- FAQ。國定假日出勤未滿 8 小時怎麼算？只要出勤，8 小時以內一律再加發一日工資。 / What if holiday work is under 8 hours? Any holiday work up to 8 hours earns one extra day's pay.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://overtime-pay-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。規格登記 task 為 `labs-overtime-pay-calculator-spec-20261109`，由主代理註冊；本文件作者不執行 registry 操作。

非作者 reviewer 核對同一固定文件候選的八節及字面案例（金額案例須以分數重算，不得只核對數字外觀），保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/overtime-pay-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

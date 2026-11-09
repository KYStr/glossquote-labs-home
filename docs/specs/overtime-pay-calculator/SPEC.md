# 加班費計算機規格

識別碼 `spec-overtime-pay-calculator-20261109-r3`。適用於 2026-11-10 R3 維護候選。

## 修正附記與來源

FUNC-R3-02 指出原規格的三個月總時數欄遺失每日分布，造成每日級距與假日加發工資錯估。FUNC-R3-03 指出原實作在拒絕 accessor 前就讀取屬性。此版以月份和逐日紀錄取代三個月總時數欄，並在讀取資料前驗證 own data descriptors。原規格、原字面案例與作者檢查保留在 [原規格 commit](https://github.com/KYStr/glossquote-labs-home/tree/eb7950f87f826a1758d430e7ba7c822d44dc64f8/docs/specs/overtime-pay-calculator)。同目錄 BRIEF.md 與 AUTHOR-CHECK.md 是原規格的歷史資料。修正前實作固定於 [來源基線](https://github.com/KYStr/glossquote-labs-home/tree/328dee40ef0de631d7d50a443e5d5eb2e7668164/tools/overtime-pay-calculator)。[R3 維護里程碑](https://github.com/KYStr/glossquote-labs-home/commit/87d22b52f54bb2c9e92deaf195e9e257d8bf41a2) 定義本次修正與維護驗收。

## problem

讓台灣一般月薪制勞工按實際出勤日別試算單月加班費，能用每日級距、各日別小計和全月總額核對薪資單。日別由使用者依實際排班選擇。

採每日正常工時 8 小時、月薪對應 240 小時的模型。國定假日限符合適用條件且未調移者。例假出勤、休假調移、補休、彈性工時、工資構成與個案適用需另行確認。試算捨入規則用於一致呈現估計值。依據為勞動部月薪試算、法令說明與休假日工資問答，於 2026-11-10 核對。[勞動部月薪制試算](https://calcr2.mol.gov.tw/Monthly) [勞動部法令依據](https://calcr2.mol.gov.tw/Index) [勞動部休假日工資問答](https://www.mol.gov.tw/1607/28690/2282/2284/2290/7154/post)

## userFlow

採 Gloss Tools Product App。寬版呈現相鄰的表單和結果，窄版依序呈現。填月薪、月份及每日日期、日別、時數，新增與移除以逐筆控制完成。初始與重設的月薪、月份、日期皆空白，只有一列，日別為平日延時且時數為 0。月份提示 YYYY-MM 和允許年份。月份及日期使用文字輸入。最後一列必須保留，最多 31 列。新增後聚焦新列日期，移除後聚焦鄰列日期。成功結果依輸入順序呈現逐日日期、日別、時數、級距、額外日薪與加班費，並顯示日別小計、月總額、計入的延長工時及適用提醒。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，提示填月薪、月份、每日工時或載入範例。 |
| dirty | 編輯、增減列或載入範例即撤銷舊結果與下載。 |
| busy | 明確計算後，背景處理快照，顯示狀態和取消。編輯會終止舊工作。 |
| success | 顯示現有快照的月總額與逐日明細。每日時數皆 0 時另顯示說明。提供 JSON 報告下載。 |
| error | 保留草稿，顯示本地化錯誤及對應欄位或列。提交後的欄位錯誤會聚焦該欄。 |
| cancelled | 終止工作，保留草稿供重新計算。 |

兩語提供可見標籤、日期格式、上限、日別及時數說明，並以 polite live status、aria-busy、aria-invalid 和 aria-errormessage 回報。載入範例只填表，等待明確計算。重設終止背景工作並聚焦月薪。換語言或離頁丟棄草稿。無帳號，載入資產後可離線使用。

## inputsOutputs

`run(input)` 為純資料轉換。輸入必須正好是 `{monthlySalary,month,entries}`。

| 欄位 | 契約 |
| --- | --- |
| monthlySalary | ASCII 十進整數字串，最多 8 單元，1 至 99,999,999。無前導零、空白、符號、逗號、小數或指數。 |
| month | YYYY-MM，年份 1900 至 2100，月份 01 至 12。 |
| entries | 1 至 31 筆密集陣列。每筆正好是 `{date,kind,hours}`。 |
| date | YYYY-MM-DD，必須是該月份的有效公曆日期。每日期僅能出現一次。 |
| kind | `weekday`、`restDay` 或 `holiday`，按實際排班選擇。 |
| hours | ASCII 十進字串，最多 4 單元，整數或一位小數（.0 或 .5），以 0.5 小時為單位。平日 0–4 小時，休息日與未調移國定假日 0–12 小時。 |

先驗證外層、陣列與所有列的結構及 own data descriptors。外層與列使用一般物件原型，陣列使用標準陣列原型。拒絕 legacy 欄位、未知或 symbol 欄位、陣列額外鍵、稀疏項目、getter、setter 與其他不符形狀的資料。讀取的是 descriptor 的 value。一般 accessor 呼叫次數為 0。反射本身可能觸發 Proxy trap。

內容驗證依月薪、月份、輸入列順序；列內先驗字串型別與必填，再驗日期、日別及時數。失敗為 `{ok:false,error:{code,field,row}}`。適用於單列時 row 為從 0 開始的索引。錯誤代碼包含 SCHEMA、EMPTY、INPUT_LIMIT、INTEGER_FORMAT、MONTH_FORMAT、DATE_FORMAT、DATE_MONTH、DUPLICATE_DATE、ENTRY_COUNT、KIND、DECIMAL_FORMAT、HOURS_STEP、RANGE。Worker／資源錯誤用固定代碼，無原始例外或堆疊。

每日獨立計算。時薪為月薪 ÷ 240，日薪為月薪 ÷ 30。倍率使用精確分數。

| 日別 | 每日計費 |
| --- | --- |
| 平日 | 前 2 小時 ×4/3，接著 2 小時 ×5/3。 |
| 休息日 | 前 2 小時 ×4/3，接著 6 小時 ×5/3，再接著 4 小時 ×8/3。 |
| 未調移國定假日 | 有出勤即加發一日工資。超過 8 小時部分的前 2 小時 ×4/3，接著 2 小時 ×5/3。 |

每日金額以 BigInt 有理數計算，合併該日級距及適用日薪後，以 round-half-up 四捨五入至新台幣整元。各日別小計和月總額都是已捨入日金額的和。時薪和日薪顯示用固定兩位小數，計費使用原分數。計入延長工時為平日延時、休息日出勤、國定假日超過 8 小時的部分。月合計 >46 小時顯示資訊提醒，包含例外上限單月 54 小時、每 3 個月 138 小時與同意條件。試算只提供金額與工時，其他適用條件依第 32 條核對。[勞動基準法第 32 條](https://law.moj.gov.tw/LawClass/LawSingle.aspx?flno=32&pcode=N0030001)

成功為 `{ok:true,result}`。result 包含 `month,hourlyRateTwd,dailyWageTwd,days,categories,totalPayTwd,countedOtHours,capNote`。days 按輸入順序，每筆包含 `date,kind,hours,bands,dayPayApplied,countedOtHours,payTwd`。bands 只列非零時數段，每段為 `{hours,multiplier}`。categories 以三個日別為鍵，各包含 `{hours,payTwd}`。所有時數以 0.5 的倍數表示，payTwd 為整數。

固定下載 `overtime-pay-report.json`。內容為 result 的 compact JSON，物件鍵按 UTF-16 code unit 遞迴排序，陣列順序保留。UTF-8 無 BOM，末尾一個 LF，最多 2,097,152 位元組。

## implementation

原生 HTML/CSS/ESM 與 Node 24 built-ins，無 runtime／建置依賴。純核心在 `public/js/core/overtime.mjs`，`public/js/controller.mjs` 管草稿、深拷貝和世代。每次執行把凍結的草稿快照送進新 Worker。只採用當前 Worker、目前世代且仍忙碌的回應。成功、錯誤、取消、編輯、重設、換工作及離頁會終止相關 Worker。下載由明確操作建立 Blob URL，30 秒內或失效時撤銷。

`public/js/app.js` 使用安全 DOM API 呈現。使用者輸入不參與建置 Worker 程式。無上傳、工作請求、遙測、遠端字型、storage、service worker、剪貼簿或原生對話。維持原本同源資產、固定語言連結與首頁回鏈、noindex 和 CSP；預覽靜態建置維持 robots 禁止索引。正式 HTTPS、索引及發布由另行驗證。

## tests

[字面案例](fixtures.json) 包含 19 項核心案例和 3 項控制器案例。原 13 項核心案例以新 schema 保留手算金額。新增以 NT$36,000 測三天各 1 小時平日延時為 NT$600、一天 3 小時為 NT$650；兩天符合條件的國定假日各 1 小時為 NT$2,400、一天 2 小時為 NT$1,200；休息日兩天各 1 小時與一天 2 小時皆為 NT$400。以 NT$43,500 測兩天各 1 小時先各捨入 NT$242，再合計 NT$484。

另驗月份、閏年、重複日期、1／31／32 列、0／最大時數、46／46.5／48 小時提醒、惡意字串、accessor 零呼叫、舊格式拒絕、深拷貝、編輯／刪列／重設／取消後的舊 Worker、固定報告 bytes、報告上限與輸入順序。執行 `npm test`、`npm run check`、`npm run build:preview` 和 `npm run check:generated:preview`，兩次預覽建置比對清單與 SHA-256。

## acceptance

產品原有九面向仍以同一候選的實測證據判定。範圍包括功能、邊界、隱私、安全、易用性、可近用性、在地化與 SEO、工具鏈來源、相容性。R3 維護由里程碑的來源追溯、缺陷修正、發布安全、雙語發布、交付完整性五面向判定。必要面向須由非作者針對同一候選驗收並各達 90。瀏覽器操作須有隔離證據。原生介面、實體裝置、實際縮放、完整網路與網域驗收各自留證。

## handoff

來源與固定規格見本文修正附記。產品交付附同一版本的修正 SPEC、fixtures、測試、雙語預覽、建置清單及當前驗證紀錄。維護候選送審、獨立評分、檢視發布和外部重驗分開記錄。

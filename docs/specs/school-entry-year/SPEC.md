# 入學年度與年級推算 / School Entry Year Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-school-entry-year-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

家長或本人想知道一個出生日期在臺灣學制下屬於哪一「屆」：哪一年 9 月上小一、幼兒園各班是哪一年入學、目前這個學年度在讀哪個班級或年級、日後十二年逐年對照。

- 桌面。家長在報名或轉學前，逐項核對入學年、目前年級與十二年對照表，並下載報告留存。
- 行動。手機在聊天或看學校公告時，輸入孩子生日立刻確認今年入學還是明年入學。

使用情境為依固定法規劃分規則的推算。資料只保留在目前頁面草稿。

## scope

固定範圍：西元出生日期與查詢日期 → 小一入學年月／學年度／入學時年齡、幼兒園四班別入學年、查詢日所屬學年度的目前狀態、十二年就學對照表。非目標為提早入學或緩讀的資格判定與申請、私立幼兒園各自的收托月齡、學區劃分與學校查詢、國中高中入學管道與考試、民國日期輸入、以出生時刻或時區微調足歲、1912 年以前或 2199 年以後的日期。

劃分規則來源與版本：臺灣國民教育入學慣例「學年度 9 月 1 日（含）前足六歲者，當年 9 月入國小一年級」，學年度以 9 月 1 日起、次年 8 月 31 日止，並以起始年命名（民國年 = 西元年 − 1911）。本文將此規則逐條固定為可重算的日期比較；不引用線上查詢、不依賴外部服務。

已與 registry 及既有 specs／legacy 比對，最相近者的實質差異如下。

- 通用日期差與日期加減（legacy `date-calculator`）。該工具只算兩個日期相差幾天或加減天數，不具備學年度、足歲劃分與年級對照的法規語義。此處以出生日期推導整組入學與年級資料。
- 預產期推算（`pregnancy-due-date-calculator`）。同為日期推導，但對象是孕期週數與預產期，與入學 cohort 無關。此處的固定輸出是學年度、班別與十二年表。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「出生日期與查詢日期 / Birth date and as-of date」
- 「計算入學與年級 / Calculate entry & grade」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。「使用今天 / Use today」只把查詢日期填為 Asia/Taipei 當日日期，屬一般草稿編輯，立即使舊結果失效，不自動執行。
- 結果順序固定：先「小一入學 / Elementary entry」摘要（入學年月、學年度、入學時年齡），再「目前狀態 / Current status」（查詢日所屬學年度與班級／年級），再「幼兒園入學年 / Kindergarten entry years」四列，再「十二年就學對照表 / 12-year school projection」十二列表；長表在有 label 的區域捲動。成功才顯示「下載報告 / Download report」。文字可手動選取。結果區下方固定顯示注意事項原文（見 tests 節），不可摺疊隱藏。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變（含「使用今天」填入），立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果表完整十二列。若目前狀態為已畢業或未入學，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"birthDate":"","asOfDate":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。明示檔案欄才處理原始 bytes，本工具無檔案欄。

- 欄位只有 `birthDate` 與 `asOfDate`，均為字串，格式固定 `YYYY-MM-DD`（西元，proleptic Gregorian）。raw 每欄最多 10 個 UTF-16 code units（合法值恰好 10）。預設兩欄皆空字串。語法固定為正規表示式 `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`，只接受 ASCII 數字與連字號，不接受空白、斜線、民國年、時間或時區後綴。
- 日期必須是真實曆日：月 01–12，日依該年該月日數；閏年判定固定為「西元年可被 4 整除且不被 100 整除，或可被 400 整除」。範圍固定為 1912-01-01 至 2199-12-31（含端點），兩欄相同。

驗證順序固定，整份失敗只回第一個錯誤 `{ok:false,error:{code,field,row}}`，row 恆為 null；field 為欄位名或 null，其 JSON Pointer 等價路徑為 field=null 時 `""`、否則 `"/"+field`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. SCHEMA：input 非普通物件、缺欄、多出 own 欄位、值非字串或含 accessor → SCHEMA，field=null。
2. 依 `birthDate`、`asOfDate` 順序逐欄驗證，每欄依序：raw 長度 >10 → INPUT_LIMIT；含不成對 surrogate → UNICODE；raw 為空字串 → EMPTY；不符合上述語法 → DATE_FORMAT；語法合但非真實曆日（如 2021-02-29、2020-04-31、月份 00）→ DATE_INVALID；真實曆日但超出範圍 → RANGE。
3. 跨欄：`birthDate` 晚於 `asOfDate` → DATE_ORDER，field=`birthDate`。兩日期相等合法（出生當日查詢）。

### 固定推導規則

以下全部以 (年, 月, 日) 整數與日期先後比較運算，無浮點、無時區、無目前時刻參與；核心只用 input 的兩個日期。

1. 足歲與生日屆滿日。日期 B 出生者在西元年 Y 的生日屆滿日 observedBirthday(B, Y) = (Y, B.月, B.日)；唯 B 為 2 月 29 日且 Y 非閏年時，固定為 (Y, 3, 1)（非閏年以 3 月 1 日為生日屆滿日）。某日在日期 D 的足歲 = 自出生日起算、已屆滿的生日次數；本工具只在下文以等價整數式使用，不另輸出。
2. 入學年 E（小一入學的 9 月所在西元年）。若 (B.月, B.日) 以 (月, 日) 字典序 ≤ (9, 1)，E = B.年 + 6；否則 E = B.年 + 7。等價定義：E 是「其 9 月 1 日 ≥ 滿六歲屆滿日 A6」的最小西元年，其中 A6 = observedBirthday(B, B.年 + 6)。兩定義必須一致：9 月 1 日（含）前出生者 A6 落在 B.年+6 年的 9 月 1 日或之前（含 2 月 29 日出生者，A6 為該年 2 月 29 日或 3 月 1 日，均在 9 月 1 日之前）；9 月 2 日（含）後出生者 A6 晚於該年 9 月 1 日，故延至次年。出生恰為 9 月 1 日者，當年 9 月 1 日已足六歲，E = B.年 + 6；出生 9 月 2 日者差一天即延後一整屆，E = B.年 + 7。
3. 入學時年齡。恆為 6 歲又 M 個月，M = fullMonths(A6, (E, 9, 1))，fullMonths(X, Y) = (Y.年 − X.年)×12 + (Y.月 − X.月) − (Y.日 < X.日 ? 1 : 0)，M 介於 0 至 11（含）。輸出 `ageYears` 恆為 6，此為構造上的不變量，不得由其他路徑改寫。
4. 民國年 roc(Y) = Y − 1911。學年度以其 9 月 1 日所在西元年命名：學年度 roc(Y) 指 Y 年 9 月 1 日至 Y+1 年 8 月 31 日。
5. 幼兒園入學年（各班別入學的 9 月所在西元年）：幼幼班 E−4、小班 E−3、中班 E−2、大班 E−1，各附 roc。依據為學年度 9 月 1 日足歲分班：足 2 歲入幼幼班、足 3 歲入小班、足 4 歲入中班、足 5 歲入大班、足 6 歲入小一，四班別入學年與 E 的差固定為 −4/−3/−2/−1。
6. 查詢日所屬學年度起始年 Y：`asOfDate` 的月份 ≥ 9 時 Y = asOf.年，否則 Y = asOf.年 − 1（即 asOf 落入的「9 月 1 日至次年 8 月 31 日」區間的起始年；asOf 恰為 9 月 1 日屬新學年度）。年級序 g = Y − E + 1；學年度起始足歲 a = g + 5（當 (Y, 9, 1) ≥ 出生日期時，a 等於該日足歲；a < 0 只出現在出生晚於該學年度 9 月 1 日的新生兒情形）。
7. 目前狀態依 g 分類固定如下，`stageGrade` 為階段內年級（幼兒園與未入學／已畢業為 null），`band` 僅幼兒園四班別有值（依序 `toddler`/`junior`/`middle`/`senior`），其餘 null：
   - g ≤ −4（a ≤ 1）：stage=`notEnrolled`，未滿 2 歲（尚未入學）。
   - g = −3（a = 2）：stage=`toddler`，幼幼班。
   - g = −2（a = 3）：stage=`kindergartenJunior`，小班。
   - g = −1（a = 4）：stage=`kindergartenMiddle`，中班。
   - g = 0（a = 5）：stage=`kindergartenSenior`，大班。
   - 1 ≤ g ≤ 6：stage=`elementary`，國小 g 年級。
   - 7 ≤ g ≤ 9：stage=`juniorHigh`，國中第 g−6 年級。
   - 10 ≤ g ≤ 12：stage=`seniorHigh`，高中第 g−9 年級。
   - g ≥ 13：stage=`graduated`，已畢業（高中）。
   `ageAtStartYears` = a（a ≥ 0 時）；a < 0 時固定為 null（該學年度 9 月 1 日尚未出生，不輸出負年齡）。
8. 十二年對照表固定 12 列，k = 1..12 依序：septemberYear = E + k − 1，rocYear = roc(septemberYear)，spanStart = 該年 `09-01`，spanEnd = 次年 `08-31`（ISO 日期字串），stage／stageGrade／名稱依下表。不因 asOf 增刪列。

年級名稱表（固定，`nameZh`/`nameEn`/`aliasZh`）：

| g | stage | stageGrade | nameZh | nameEn | aliasZh |
| --- | --- | --- | --- | --- | --- |
| 1 | elementary | 1 | 國小一年級 | Elementary School Grade 1 | null |
| 2 | elementary | 2 | 國小二年級 | Elementary School Grade 2 | null |
| 3 | elementary | 3 | 國小三年級 | Elementary School Grade 3 | null |
| 4 | elementary | 4 | 國小四年級 | Elementary School Grade 4 | null |
| 5 | elementary | 5 | 國小五年級 | Elementary School Grade 5 | null |
| 6 | elementary | 6 | 國小六年級 | Elementary School Grade 6 | null |
| 7 | juniorHigh | 1 | 國中一年級 | Junior High School Grade 1 | 國一 |
| 8 | juniorHigh | 2 | 國中二年級 | Junior High School Grade 2 | 國二 |
| 9 | juniorHigh | 3 | 國中三年級 | Junior High School Grade 3 | 國三 |
| 10 | seniorHigh | 1 | 高中一年級 | Senior High School Grade 1 | 高一 |
| 11 | seniorHigh | 2 | 高中二年級 | Senior High School Grade 2 | 高二 |
| 12 | seniorHigh | 3 | 高中三年級 | Senior High School Grade 3 | 高三 |

幼兒園與其他狀態名稱（固定）：幼幼班 / Toddler Class、小班 / Kindergarten Junior Class、中班 / Kindergarten Middle Class、大班 / Kindergarten Senior Class、未滿 2 歲（尚未入學）/ Under 2 (Not Yet Enrolled)、已畢業（高中）/ Graduated (Senior High School Completed)；aliasZh 皆為 null。

### 輸出形狀

成功僅為 `{ok:true,result}`，result 欄位與順序語義固定如下（機器值不隨 locale 改）：

- `birthDate`、`asOfDate`：驗證通過的原字串。
- `entry`：`{septemberYear:E, rocYear:roc(E), month:9, ageYears:6, ageMonths:M}`。
- `kindergarten`：固定 4 列陣列，依幼幼班、小班、中班、大班順序，每列 `{band, nameZh, nameEn, septemberYear, rocYear}`。
- `current`：`{schoolYearStartYear:Y, schoolYearRoc:roc(Y), gradeIndex:g, ageAtStartYears, stage, stageGrade, band, nameZh, nameEn, aliasZh}`。
- `projection`：固定 12 列陣列，每列 `{gradeIndex, septemberYear, rocYear, spanStart, spanEnd, stage, stageGrade, nameZh, nameEn, aliasZh}`。

固定下載 `school-entry-year-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/school-entry-year/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。「使用今天」只把瀏覽器本地日期（Asia/Taipei 顯示）寫入草稿欄位，不觸發計算、不發送任何請求。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算入學與年級」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點（1912-01-01／2199-12-31、9 月 1 日與 9 月 2 日出生、2 月 29 日出生、出生當日查詢）、剛好越界、第一個錯誤與三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。13 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `sep1-exact` | 9 月 1 日出生當年入學，目前國小二年級（首個可觀察案例） |
| `sep2-next-cohort` | 9 月 2 日出生延後一整屆，入學時 6 歲 11 個月 |
| `mid-year-kindergarten-current` | 年中出生，查詢日落入幼兒園中班學年度 |
| `feb29-leap` | 2 月 29 日出生，非閏年 3 月 1 日屆滿，入學與目前年級 |
| `junior-high` | 目前國中二年級與完整十二年表 |
| `graduated` | 目前已畢業（高中） |
| `toddler-current` | 目前幼幼班，幼兒園入學年與今年對齊 |
| `newborn-before-first-september` | 出生晚於所屬學年度 9 月 1 日，ageAtStartYears 為 null |
| `invalid-date` | 2021-02-29 非真實曆日，第一個錯誤 DATE_INVALID |
| `birth-after-asof` | 出生晚於查詢日，DATE_ORDER |
| `empty-asof` | 查詢日期空白，EMPTY |
| `bad-format` | 斜線日期不符合固定語法，DATE_FORMAT |
| `out-of-range` | 1912 年以前日期，RANGE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上下限端點（1912-01-01 與 2199-12-31 均可計算）、範圍外一天、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 (月,日)=(9,1)/(9,2) 邊界、2 月 29 日在閏年與非閏年的屆滿日、asOf 恰為 9 月 1 日屬新學年度、asOf 為 8 月 31 日屬舊學年度、entry.ageYears 恆為 6、projection 恆為 12 列且 septemberYear 連續。

候選 gate（均 NOT_RUN）

- 於 `tools/school-entry-year/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「入學年度與年級推算」，title「入學年度與年級推算｜Gloss Tools」，description「輸入孩子出生日期，依 9 月 1 日前足六歲的規則推算小一入學年月、學年度、入學時年齡、幼兒園入學年與十二年就學對照表。」。英文 lang=en，H1 “School Entry Year Calculator”，title “School Entry Year Calculator | Gloss Tools”，description “Enter a child's birth date to derive the Taiwan elementary entry September, school year, age at entry, kindergarten entry years and a 12-year grade projection from the September 1 age-six rule.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- 結果注意事項（固定原文，兩語皆顯示於結果區下方）。公立幼兒園與國小依 9 月 1 日足歲劃分班級與入學年度；私立幼兒園收托月齡、提早入學與緩讀規定可能不同，實際請以各校及地方政府公告為準。 / Public kindergarten classes and elementary entry years are divided by age reached on September 1. Private kindergarten admission ages, early entry and delayed entry rules may differ; check the school and local government announcements.
- FAQ。差一天為什麼差一屆？9 月 1 日（含）前出生、當年 9 月 1 日已足六歲者當年入學；9 月 2 日出生者要等下一個 9 月。 / Why does one day change the cohort? Children who have turned six on or before September 1 enter that September; a September 2 birthday waits until the next September.
- FAQ。2 月 29 日出生怎麼算？非閏年以 3 月 1 日為生日屆滿日；入學仍以入學年 9 月 1 日前是否足六歲判定。 / Born on February 29? In non-leap years the birthday is observed on March 1; entry still turns on being six by September 1 of the entry year.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://school-entry-year.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。規格任務 id 為 `labs-school-entry-year-spec-20261109`，由主代理登記，作者不自行 mark-spec-ready。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/school-entry-year/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

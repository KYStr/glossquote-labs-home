# 體脂率計算機 / Body Fat Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-body-fat-calculator-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

用皮尺追蹤體脂的人，在沒有體組成儀時，先用美國海軍圍度法從身高、頸圍、腰圍（女性再加臀圍）與體重估算體脂率、類別、脂肪重量與淨體重，用來看趨勢，不把估計當醫療量測。

- 桌面。重訓者在書桌前量完圍度，逐欄填入，核對體脂率、類別與淨體重後抄進訓練紀錄。
- 行動。手機在健身房量完直接輸入，立即得到可記錄的估計值，不啟動任何量測或連線。

使用情境為估計與追蹤。資料只保留在目前頁面草稿，結果旁固定顯示估計值聲明。

## scope

MVP 為單次估算：性別二選一公式、公分輸入、ACE 類別、脂肪／淨體重。非目標為醫療診斷或建議、其他體脂方法（皮脂夾、生物電阻抗、DEXA、BMI 反推）、歷史紀錄或趨勢圖、帳號、資料儲存或同步、年齡或活動量輸入、兒童公式。

單位管線固定一條：輸入一律公分，先在公分下算圍度組合，再除以 2.54 換算英吋，套用原始英吋公式與原始常數；不使用公分常數變體版。公式來源為美國海軍圍度法（Hodgdon & Beckett 1984，美國海軍 OPNAVINST 6110.1 系列採用），常數照本文固定。類別表為 American Council on Exercise (ACE) 發表的體脂率類別表，區間解讀照本文固定。

已比對既有目錄與規格庫存，最相近者的實質差異如下。

- 以身高、體重算 BMI 與 TDEE 熱量需求。此處以圍度量測與 log10 公式算體脂率、脂肪重量與淨體重，不輸出熱量。`docs/specs/bmi-tdee-calculator/`（spec-bmi-tdee-calculator）。

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，量測位置說明用一層 disclosure 或欄位 hint 呈現。

- 欄位「性別 / Sex」為二選一（男性／女性）。切換到男性時自動把臀圍草稿清為 `""` 並停用臀圍欄；切換到女性時啟用臀圍欄。
- 欄位或說明「身高、頸圍、腰圍 / Height, neck and waist」，每欄附固定量測位置說明（見下）。
- 欄位「臀圍（女性）/ Hip (women)」，女性必填，男性不適用。
- 欄位「體重 / Weight」。
- 「計算體脂率 / Calculate body fat」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「體脂率與類別 / Body fat percentage and category」先摘要（體脂率大字與類別）再列脂肪重量、淨體重與固定聲明，百分比與重量畫面一律顯示一位小數。成功才顯示「下載報告 / Download report」。文字可手動選取。

量測位置說明（固定文案，兩語對等）。

- 身高：「脫鞋站立量測。」/ “Measure standing, without shoes.”
- 頸圍：「在喉結下方量測，皮尺與脖子長軸垂直。」/ “Measure just below the Adam's apple, with the tape perpendicular to the neck.”
- 腰圍：「男性量肚臍水平位置；女性量腰部最細處。皮尺保持水平，正常吐氣結束時量測，貼合但不壓迫皮膚。」/ “Men: at navel level. Women: at the narrowest point of the waist. Keep the tape horizontal, measure at the end of a normal exhale, snug but not compressing the skin.”
- 臀圍：「量臀部最寬處，皮尺保持水平。」/ “Measure at the widest point of the hips, with the tape horizontal.”

固定聲明（結果區與靜態內容皆顯示）：「本工具以美國海軍圍度法估算體脂率，結果是估計值，不是醫療量測，不能取代專業體組成檢測或醫療建議。」/ “This tool estimates body fat percentage using the US Navy circumference method. Results are estimates, not medical measurements, and do not replace professional body-composition assessment or medical advice.”

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果含體脂率、類別、脂肪重量、淨體重與固定聲明。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"sex":"male","heightCm":"","neckCm":"","waistCm":"","hipCm":"","weightKg":""}` 並聚焦性別欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

欄位與檢查順序固定為 sex、heightCm、neckCm、waistCm、hipCm、weightKg，逐欄檢查，第一個失敗即整份失敗 `{ok:false,error:{code,field,row}}`，row 一律 null（本工具無列）。field 為欄位名，其 JSON Pointer 形式為 `/` 加欄位名。每欄檢查順序固定：先容量（raw 超過 8 個 UTF-16 code units 為 INPUT_LIMIT）、再未成對 surrogate（UNICODE）、再該欄文法與範圍。

- sex：字串，僅 `"male"` 或 `"female"`（大小寫敏感）。非字串為 SCHEMA；其他字串為 ENUM，field 為 `sex`。
- 其餘五欄為十進位字串。文法 `^(0|[1-9][0-9]{0,2})(\.[0-9])?$`：ASCII 數字、整數部最多 3 位、小數最多 1 位、無正負號／空白／指數／前導零（`0` 本身與 `0.x` 除外）。不做 trim、不猜單位。空字串為 EMPTY；文法不符為 DECIMAL_FORMAT；範圍外為 RANGE。
- 範圍（含端點）：heightCm 100–250、neckCm 20–80、waistCm 40–300、hipCm 40–300、weightKg 25–500，單位分別為公分與公斤。
- hipCm 於 sex 為 `"male"` 時：容量與 surrogate 檢查後，值必須恰為 `""`，任何非空值為 NOT_APPLICABLE，field 為 `hipCm`，且不做文法與範圍檢查。sex 為 `"female"` 時照一般欄位檢查（必填）。

跨欄檢查在全部欄位通過後依序進行。

1. 對數定義域。男性 waistCm ≤ neckCm 為 LOG_DOMAIN，field 為 `waistCm`（`/waistCm`）。女性 waistCm + hipCm ≤ neckCm 為 LOG_DOMAIN，field 為 `waistCm`。比較在公分下以輸入的確切十進位值進行（等號成立也失敗）。
2. 計算。先在公分下算圍度組合（男性 waistCm − neckCm；女性 waistCm + hipCm − neckCm），再除以 2.54 得英吋；身高 heightCm 除以 2.54 得英吋。以 IEEE-754 double 計算，log10 用 `Math.log10`，常數照原式：
   - 男性 BF% = 86.010 × log10((waistCm − neckCm) / 2.54) − 70.041 × log10(heightCm / 2.54) + 36.76
   - 女性 BF% = 163.205 × log10((waistCm + hipCm − neckCm) / 2.54) − 97.684 × log10(heightCm / 2.54) − 78.387
3. 合理性。未捨入 BF% 必須滿足 0 < BF% < 75，否則 IMPLAUSIBLE_RESULT，field 為 null。

捨入固定在下列步驟各做一次，皆為四捨五入（half-up）至小數一位，記為 r1(x) = floor(x×10 + 0.5) / 10，套在計算出的 double 上。

- bodyFatPct = r1(BF%)。
- fatMassKg = r1(weightKg × BF% / 100)，用未捨入 BF%。
- leanMassKg = r1(weightKg − fatMassKg)，使顯示的脂肪重量加淨體重恰等於體重（一位小數下）。

類別由 bodyFatPct（已捨入值）決定。ACE 發表的是整數區間（男性必需 2–5、運動員 6–13、健身 14–17、一般 18–24、肥胖 25 以上；女性必需 10–13、運動員 14–20、健身 21–24、一般 25–31、肥胖 32 以上）；本文固定解讀為連續區間 [下限, 下一級下限)，套用到一位小數的值：

| id | 繁中 | English | 男性 bodyFatPct | 女性 bodyFatPct |
| --- | --- | --- | --- | --- |
| below-essential | 低於必需脂肪 | Below essential fat | < 2 | < 10 |
| essential | 必需脂肪 | Essential fat | 2 – <6 | 10 – <14 |
| athletes | 運動員 | Athletes | 6 – <14 | 14 – <21 |
| fitness | 健身 | Fitness | 14 – <18 | 21 – <25 |
| average | 一般 | Average | 18 – <25 | 25 – <32 |
| obese | 肥胖 | Obese | ≥ 25 | ≥ 32 |

結果 `{bodyFatPct,category,fatMassKg,leanMassKg}`，category 為上表 id。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。JSON 數字攜帶捨入後的數值（17.0 序列化為 17）；畫面顯示一律一位小數（如 `17.0%`）。機器值不隨 locale 改。

固定下載 `body-fat-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/body-fat-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 核心數值路徑固定：文法驗證後的字串以 Number 轉 double；圍度組合先在公分下以 double 算，再除以 2.54；log10 用 Math.log10；捨入與類別／重量推導順序照 inputsOutputs，不在其他層重算或改值。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算體脂率」，畫面和完整報告符合核心 fixtures（含男、女與類別邊界案例），使用者取得對應產物。 |
| boundaries | 合法端點（身高 100/250、腰圍 300、體重 25/500）、剛好越界、LOG_DOMAIN 兩種（男性腰 ≤ 頸、女性腰+臀 = 頸）、NOT_APPLICABLE、EMPTY、第一個錯誤與欄位順序、三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log；圍度與體重不出目前頁面。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改、性別切換清除臀圍和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯（含量測說明與固定聲明）、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。12 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `man-normal` | 男性一般案例，體脂率 17.0、健身類別 |
| `woman-normal` | 女性一般案例，體脂率 26.9、一般類別 |
| `woman-athletes` | 女性運動員類別 |
| `man-category-boundary` | 未捨入 24.9845… 捨入恰 25.0，歸肥胖而非一般（邊界屬上一級） |
| `woman-category-boundary` | 未捨入 31.9869… 捨入恰 32.0，歸肥胖而非一般 |
| `man-log-domain` | 腰圍小於頸圍，LOG_DOMAIN |
| `woman-log-domain-zero` | 腰圍 + 臀圍 − 頸圍恰為 0，LOG_DOMAIN |
| `hip-not-applicable` | 男性填了臀圍，NOT_APPLICABLE |
| `hip-empty` | 女性未填臀圍，EMPTY |
| `decimal-format` | 腰圍兩位小數，DECIMAL_FORMAT |
| `range-height` | 身高 260，RANGE |
| `implausible-result` | 算出 100.69… ≥ 75，IMPLAUSIBLE_RESULT |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證身高 100/250、頸圍 20/80、腰圍 40/300、體重 25/500 的端點，腰圍恰等於頸圍、女性腰+臀恰等於頸圍（皆 LOG_DOMAIN），性別切換清除臀圍草稿，男性臀圍欄停用。所有成功結果滿足 0 < bodyFatPct < 75、fatMassKg + leanMassKg 在一位小數下恰等於 weightKg、類別與已捨入體脂率一致。

候選 gate（均 NOT_RUN）

- 於 `tools/body-fat-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

固定訊息（兩語對等，欄位錯誤顯示於對應欄位，全域錯誤顯示於狀態區）。

- SCHEMA：「輸入格式不正確。」/ “The input format is invalid.”
- INPUT_LIMIT：「輸入太長。」/ “The input is too long.”
- UNICODE：「輸入含有不完整的字元。」/ “The input contains an incomplete character.”
- EMPTY：「這個欄位必填。」/ “This field is required.”
- DECIMAL_FORMAT：「請輸入數字，最多一位小數。」/ “Enter a number with at most one decimal place.”
- RANGE：「數值超出允許範圍。」/ “The value is outside the allowed range.”
- ENUM：「請選擇性別。」/ “Select a sex.”
- NOT_APPLICABLE：「男性不需填臀圍。」/ “Hip is not used for men.”
- LOG_DOMAIN：「圍度組合無法計算：腰圍必須大於頸圍（女性為腰圍加臀圍大於頸圍）。」/ “These circumferences cannot be computed: the waist must exceed the neck (for women, waist plus hip must exceed the neck).”
- IMPLAUSIBLE_RESULT：「依這組圍度算出的體脂率超出合理範圍，請重新量測後再試。」/ “The body fat percentage from these measurements is outside the plausible range. Please re-measure and try again.”
- INTERNAL／WORKER_ERROR：「計算失敗，請重試。」/ “The calculation failed. Please try again.”
- OUTPUT_LIMIT：「報告太大，無法下載。」/ “The report is too large to download.”

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「體脂率計算機」，title「體脂率計算機｜Gloss Tools」，description「用身高、頸圍、腰圍（女性再加臀圍）與體重，以美國海軍圍度法估算體脂率、脂肪重量與淨體重。」。英文 lang=en，H1 “Body Fat Calculator”，title “Body Fat Calculator | Gloss Tools”，description “Estimate body fat percentage, fat mass and lean mass from height, neck, waist (plus hip for women) and weight with the US Navy circumference method.”。兩頁靜態呈現操作、限制、量測位置說明、固定聲明、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。這個方法準嗎？圍度法是估算，和 DEXA 等專業檢測會有誤差，適合看趨勢。 / How accurate is this method? The circumference method is an estimate and differs from professional scans such as DEXA; it is best used to track trends.
- FAQ。為什麼男性不用臀圍？美國海軍公式男性只用腰圍與頸圍，女性才加入臀圍。 / Why do men not enter hip? The US Navy formula uses waist and neck for men; hip is only part of the women's formula.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://body-fat-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。規格 task id 為 `labs-body-fat-calculator-spec-20261109`（由主代理登記）。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/body-fat-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

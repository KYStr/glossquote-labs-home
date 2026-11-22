# 空氣品質解讀 / AQI Interpreter

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-aqi-interpreter-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者手上已有一個 AQI 數字，或一組污染物濃度，想知道它代表什麼等級、該用什麼顏色理解、今天能不能出門運動、小孩與氣喘家人該注意什麼。

- 桌面。桌面前貼一張測站公布的 AQI 或手邊感測器的濃度讀數，輸入後一次看到等級、顏色、健康影響與兩組活動建議（一般民眾、敏感族群），並可切換台灣／美國 EPA 兩種制度對照同一濃度算出的差異。
- 行動。手機在戶外先查到 AQI，輸入後立即看到該等級的活動建議，不再回頭查表。

使用情境為設計假設。資料只保留在目前頁面草稿。本工具不量測空氣、不提供即時監測值、不做預報；它只解讀使用者輸入的數字。

## scope

MVP 必做：

- 直接 AQI 模式：輸入整數 0–500，輸出等級、顏色（名稱＋ hex）、健康影響、一般民眾活動建議、敏感族群活動建議。
- 濃度模式：輸入 1–7 種污染物濃度（PM2.5、PM10、O3 8 小時、O3 1 小時、CO 8 小時、SO2 1 小時、NO2 1 小時），每種以釘版分段線性插值表換算副指標，取最大值為 AQI，並指明指標污染物（dominant pollutant）；同分時按 §5 的固定污染物順序取先者。
- 制度切換：台灣（環境部，預設）與美國 EPA（2024 年 5 月修訂版）兩種分級，同一輸入可切換對照；兩制差異見 §5 的對照表。
- 釘版資料：六等級分級表、台灣與美國 EPA 斷點表（七污染物欄位，見 §5）、健康影響與活動建議全文（台灣環境部空氣品質監測網，見 §5）。

非目標：

- 即時監測、預報、推估未來 AQI、計算移動平均或 NowCast（PM2.5／PM10 的 0.5×前 12 小時＋0.5×前 4 小時加權、O3／CO 的 8 小時移動平均皆不計算；使用者輸入的濃度必須已是表定統計基礎）。
- 量測空氣（不接感測器、不讀定位、不查測站）。
- 醫療診斷或個人化醫療建議；§5 的免責聲明全文釘版顯示。
- CO／SO2／NO2 以外的污染物；AQI 500 以上的外推（超過對照表上限一律以 500 計，見 §5）。

與既有／同輪工具的差異（本地 `docs/specs/` 逐目比對，2026-11-21；本輪 weather 相關工具尚無既有規格，差異以性質界定）：

- 天氣預報類工具（溫度、降雨、風速、體感溫度、露點等）：預報未來天氣狀態或由溫濕度推導舒適度。此處不預報、不碰溫度／濕度／風／降雨，只解讀已經給定的空氣品質數值對健康的意義。輸入是 AQI 或污染物濃度，不是天氣條件；輸出是健康等級與活動建議，不是天氣現象。
- feels-like-temperature / dew-point（同輪概念）：由溫度與濕度推導人體感受或露點溫度。此處的輸入與公式完全不同（污染物濃度→分段線性插值），且分級表來自環保署／EPA 的健康分級，不是熱力學公式。
- uv-index-guide（同輪概念第 28 條）：紫外線指數分級與防曬建議。此處是指數不同（AQI vs UV Index）、污染物不同、健康建議不同；兩者皆為「指數解讀」，但分級表與建議全文各自釘版、互不共用。
- 本工具不與任何既有規格重疊；本地 `docs/specs/` 無 aqi、air、weather、uv、feels-like、dew-point 相關規格。

判定規則由本文定義，無線上資料或外部服務依賴。所有分級與斷點數據以 §5 釘版為準，不以連線查詢的官方頁面為準（官方頁面若日後修訂，須由新規格修訂本文）。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。等級色塊必須同時以文字（等級名稱）與顏色呈現，不可只用顏色傳達等級。

- 模式選擇「直接輸入 AQI / Enter AQI directly」與「輸入污染物濃度 / Enter pollutant concentrations」（radio，預設直接輸入 AQI）。
- 制度選擇「台灣（環境部） / Taiwan (MOENV)」與「美國 EPA / US EPA」（radio，預設台灣）。切換制度時若已有結果，立即撤銷舊結果（dirty），須重新執行。
- 欄位或說明「AQI 數值 0–500 / AQI value 0–500」（直接模式）。
- 欄位或說明「污染物濃度 / Pollutant concentrations」（濃度模式）：1–7 列，每列為污染物下拉（PM2.5 24 小時平均 µg/m³、PM10 24 小時平均 µg/m³、O3 8 小時平均 ppm、O3 1 小時平均 ppm、CO 8 小時平均 ppm、SO2 1 小時平均 ppb、NO2 1 小時平均 ppb）＋濃度輸入框；「新增污染物 / Add pollutant」加列，「移除 / Remove」刪列；同一污染物不可重複選取。
- 「解讀空氣品質 / Interpret air quality」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個核心案例（AQI 35，台灣制），明示範例並等待手動執行。
- 結果區先顯示大字等級（中文名＋英文名）與色塊（含 hex），再列 AQI 數字、健康影響、一般民眾活動建議、敏感族群活動建議；濃度模式另列每種污染物的副指標表（污染物、輸入濃度（正規化後）、副指標、等級）與指標污染物；有通知（notices）時以文字列出。免責聲明全文常駐結果區下方。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"mode":"aqi","system":"TW","aqi":"","rows":[]}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- `mode`：`"aqi"` 或 `"concentration"`，必填。
- `system`：`"TW"` 或 `"US"`，必填，預設 `"TW"`（UI 預設；`run` 的 input 若缺 `system` 視為 SCHEMA，不補預設——預設只存在於 UI 草稿層）。
- 直接模式：`aqi` 為 ASCII 十進整數字串，無空白／符號／小數／指數／正負號，raw 最多 3 單元，範圍 0–500（含）。
- 濃度模式：`rows` 為陣列，1–7 列；每列為普通物件，僅含 `pollutant` 與 `value` 兩個 own key。`pollutant` 為下列七者之一：`"PM2.5"`、`"PM10"`、`"O3-8h"`、`"O3-1h"`、`"CO"`、`"SO2"`、`"NO2"`。`value` 為十進小數字串：ASCII 數字、可選一個小數點、小數位數至多 6 位，無空白／符號／指數／正負號，raw 最多 10 單元（含小數點）。
- 濃度絕對範圍（超過為 RANGE）：PM2.5 0–999.9 µg/m³；PM10 0–999 µg/m³；O3 8h／1h 0–1.000 ppm；CO 0–99.9 ppm；SO2 0–9999 ppb；NO2 0–9999 ppb。0 含在內。
- 預設草稿：`{"mode":"aqi","system":"TW","aqi":"","rows":[]}`。直接模式忽略 `rows`（須為空陣列，否則 SCHEMA）；濃度模式忽略 `aqi`（須為空字串，否則 SCHEMA）。

驗證順序（先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文；未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE）。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 `mode`、`system`、`aqi`（直接模式）、`rows`（濃度模式）順序驗證。raw 超限 INPUT_LIMIT、文法 INTEGER_FORMAT（直接 AQI）／DECIMAL_FORMAT（濃度）／ENUM（mode／system／pollutant 不在允許值內）、範圍 RANGE，field 即上述欄名；列內錯誤時 field 為 `"rows"`，row 為 1-based 列號。
2. 濃度模式：重複污染物為 DUPLICATE，field `"rows"`，row 為重複出現的後一列 1-based 列號。
3. 濃度正規化（§5）：台灣制以十進位四捨五入（half-up，0.5 進位）修約至釘版精度；美國制以截斷（truncate toward zero）修約至同一精度。精度：PM2.5 小數 1 位、PM10 整數、O3 8h／1h 小數 3 位、CO 小數 1 位、SO2 整數、NO2 整數。修約以十進位字串運算進行，不以二進位浮點運算。
4. 查表與插值（§5）：正規化濃度落在哪個斷點區間，即用該區間的分段線性插值公式計算副指標；濃度恰等於斷點時，副指標等於對應的指標值。區間為閉區間；相鄰區間無間隙（修約後不可能落在 12.4 與 12.5 之間這類縫隙）。空白格（無定義區間）的污染物列跳過並記入 notices（SKIPPED_UNDEFINED）；若全部列皆被跳過，回錯誤 UNDEFINED_BAND，field `"rows"`，row 為第一列。
5. 超過對照表上限的處理（§5）：PM2.5、PM10、O3 1h、CO、NO2 的濃度超過該制最高斷點時，副指標記為 500 並記入 notices（ABOVE_TABLE_TOP）；O3 8h 超過 0.200 ppm、SO2 1h 超過 304 ppb 時，該列無定義、按第 4 點跳過（O3 8h 須改用 1 小時值，見環境部註 2；SO2 200 以上須用 24 小時值，見環境部註 3）。
6. 整體 AQI 為各副指標的最大值；指標污染物（dominantPollutant）為副指標最大者，同分時按固定順序 PM2.5、PM10、O3-8h、O3-1h、CO、SO2、NO2 取先者。直接模式的 dominantPollutant 為 null。
7. 等級查表（§5）：AQI 0–50 良好、51–100 普通、101–150 對敏感族群不健康、151–200 對所有族群不健康、201–300 非常不健康、301–500 危害；兩制等級範圍、中文名、英文名、顏色名稱皆相同，差異只在濃度斷點。
8. 結果為 `{system,mode,aqi,level,levelZh,levelEn,color,colorZh,hex,healthImpact,adviceGeneral,adviceSensitive,dominantPollutant,subIndices,notices}`。`aqi` 為整數；`level` 為 `good`／`moderate`／`usg`／`unhealthy`／`very-unhealthy`／`hazardous`；`color` 為 `green`／`yellow`／`orange`／`red`／`purple`／`maroon`，`colorZh` 為綠／黃／橘／紅／紫／褐紅；`hex` 見 §5；`healthImpact`、`adviceGeneral`、`adviceSensitive` 為 §5 釘版全文（顯示語言隨頁面語言切換，中英全文皆釘版）；直接模式 `subIndices` 為 `[]`、`notices` 為 `[]`、`dominantPollutant` 為 null；濃度模式 `subIndices` 為每列 `{pollutant,concentration,subIndex,level}`（`concentration` 為正規化後的十進位數；`pollutant` 用 `PM2.5`／`PM10`／`O3-8h`／`O3-1h`／`CO`／`SO2`／`NO2`；`subIndex` 為整數；`level` 為等級 id），按輸入列順序；`notices` 為 `{code,pollutant}` 陣列，code 為 `ABOVE_TABLE_TOP` 或 `SKIPPED_UNDEFINED`，按輸入列順序。

固定下載 `aqi-interpreter-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/aqi-interpreter/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

### 釘版資料（§5，規範性）

來源（查核日 2026-11-21）：

- 台灣制：環境部空氣品質監測網「空氣品質指標 (AQI)」，https://airtw.moenv.gov.tw/cht/Information/Standard/AirQualityIndicatorNew.aspx（中文）與 https://airtw.moenv.gov.tw/ENG/Information/Standard/AirQualityIndicator.aspx（英文），兩頁斷點表一致。分級自 2016 年 12 月 1 日實施（環境部新聞，https://enews.moenv.gov.tw/moenv-news/zh-tw/News/5594）。
- 美國制：美國 EPA《Technical Assistance Document for the Reporting of Daily Air Quality — the Air Quality Index (AQI)》，EPA-454/B-24-002，2024 年 5 月，表 6（斷點表，含 2024 年 PM2.5 修訂）；法源為 40 CFR Part 58 Appendix G（https://www.ecfr.gov/api/renderer/v1/content/enhanced/2024-07-05/title-40?chapter=I&subchapter=C&part=58&appendix=Appendix+G+to+Part+58）。
- 顏色 hex：EPA Technical Assistance Document 的顏色定義（經 AirNow 採用；六色為 綠 #00E400、黃 #FFFF00、橘 #FF7E00、紅 #FF0000、紫 #99004C、褐紅 #7E0023）。台灣官方頁面只給顏色名稱，hex 以 EPA／AirNow 定義釘版，兩制共用。

六等級（兩制共用）：

| AQI | 中文等級 | 英文等級 | 顏色 | hex |
| --- | --- | --- | --- | --- |
| 0–50 | 良好 | Good | 綠 Green | #00E400 |
| 51–100 | 普通 | Moderate | 黃 Yellow | #FFFF00 |
| 101–150 | 對敏感族群不健康 | Unhealthy for Sensitive Groups | 橘 Orange | #FF7E00 |
| 151–200 | 對所有族群不健康 | Unhealthy | 紅 Red | #FF0000 |
| 201–300 | 非常不健康 | Very Unhealthy | 紫 Purple | #99004C |
| 301–500 | 危害 | Hazardous | 褐紅 Maroon | #7E0023 |

分段線性插值公式（兩制共用，EPA Appendix G Equation 1）：

`Ip = ((Ihi − Ilo) / (BPhi − BPLo)) × (Cp − BPLo) + Ilo`

其中 Cp 為正規化後濃度，BPLo／BPHi 為該濃度所在區間的斷點，Ilo／Ihi 為對應的指標值。副指標四捨五入（half-up，0.5 進位）取整數。

台灣制斷點表（環境部空氣品質監測網，2026-11-21 查核；「—」為空白格、無定義）：

| AQI | O3 8h (ppm) | O3 1h (ppm) | PM2.5 24h (µg/m³) | PM10 24h (µg/m³) | CO 8h (ppm) | SO2 1h (ppb) | NO2 1h (ppb) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0–50 | 0.000–0.054 | — | 0.0–12.4 | 0–30 | 0–4.4 | 0–8 | 0–21 |
| 51–100 | 0.055–0.070 | — | 12.5–30.4 | 31–75 | 4.5–9.4 | 9–65 | 22–100 |
| 101–150 | 0.071–0.085 | 0.101–0.134 | 30.5–50.4 | 76–190 | 9.5–12.4 | 66–160 | 101–360 |
| 151–200 | 0.086–0.105 | 0.135–0.204 | 50.5–125.4 | 191–354 | 12.5–15.4 | 161–304 | 361–649 |
| 201–300 | 0.106–0.200 | 0.205–0.404 | 125.5–225.4 | 355–424 | 15.5–30.4 | 305–604 (註3) | 650–1249 |
| 301–400 | — (註2) | 0.405–0.504 | 225.5–325.4 | 425–504 | 30.5–40.4 | 605–804 (註3) | 1250–1649 |
| 401–500 | — (註2) | 0.505–0.604 | 325.5–500.4 | 505–604 | 40.5–50.4 | 805–1004 (註3) | 1650–2049 |

美國 EPA 制斷點表（EPA-454/B-24-002 表 6，2024 年 5 月修訂版；「—」為空白格）：

| AQI | O3 8h (ppm) | O3 1h (ppm) | PM2.5 24h (µg/m³) | PM10 24h (µg/m³) | CO 8h (ppm) | SO2 1h (ppb) | NO2 1h (ppb) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0–50 | 0.000–0.054 | — | 0.0–9.0 | 0–54 | 0–4.4 | 0–35 | 0–53 |
| 51–100 | 0.055–0.070 | — | 9.1–35.4 | 55–154 | 4.5–9.4 | 36–75 | 54–100 |
| 101–150 | 0.071–0.085 | 0.125–0.164 | 35.5–55.4 | 155–254 | 9.5–12.4 | 76–185 | 101–360 |
| 151–200 | 0.086–0.105 | 0.165–0.204 | 55.5–125.4 | 255–354 | 12.5–15.4 | 186–304 | 361–649 |
| 201–300 | 0.106–0.200 | 0.205–0.404 | 125.5–225.4 | 355–424 | 15.5–30.4 | 305–604 (註3) | 650–1249 |
| 301–500 | — (註2) | 0.405–0.604 | 225.5–325.4 | 425–604 | 30.5–50.4 | 605–1004 (註3) | 1250–2049 |

註 2（兩制皆有，環境部原文）：AQI 301 以上之指標值，是以臭氧 (O3) 小時值計算之，不以臭氧 (O3) 8 小時值計算之。註 3（兩制皆有，環境部原文）：AQI 200 以上之指標值，是以二氧化硫 (SO2) 24 小時值計算之，不以二氧化硫 (SO2) 小時值計算之。本工具只接受 SO2 1 小時值，故 SO2 1 小時濃度超過 304 ppb 時該列無定義（按 §inputsOutputs 第 5 點跳過）。

兩制差異對照（同一濃度可能算出不同 AQI 的原因）：

| 項目 | 台灣（環境部） | 美國 EPA（2024 年 5 月修訂） |
| --- | --- | --- |
| 等級範圍／名稱／顏色 | 0–50／51–100／101–150／151–200／201–300／301–500，六色 | 與台灣完全相同 |
| PM2.5 斷點 | 良好上限 12.4；普通 12.5–30.4；敏感 30.5–50.4；危害分 301–400（225.5–325.4）與 401–500（325.5–500.4）兩段 | 良好上限 9.0（2024 年修訂，由 12.0 下調）；普通 9.1–35.4；敏感 35.5–55.4；危害為 301–500 單段（225.5–325.4），500 封頂於 325.4 |
| PM10 斷點 | 良好上限 30；普通 31–75；敏感 76–190 | 良好上限 54；普通 55–154；敏感 155–254 |
| O3 1h 敏感段 | 0.101–0.134 | 0.125–0.164 |
| SO2 1h 斷點 | 良好上限 8；普通 9–65；敏感 66–160 | 良好上限 35；普通 36–75；敏感 76–185 |
| NO2 1h 斷點 | 良好上限 21；普通 22–100 | 良好上限 53；普通 54–100 |
| O3 8h、CO 斷點 | 與美國制完全相同 | 與台灣制完全相同 |
| 濃度修約 | 四捨五入（half-up），PM2.5 取 1 位小數、PM10 取整數、O3 取 3 位小數（環境部即時 AQI 備註） | 截斷（truncate）：O3 截至 3 位小數、PM2.5 截至 1 位小數、PM10 取整數、CO 截至 1 位小數、SO2 取整數、NO2 取整數（40 CFR Part 58 Appendix G §12） |
| 指標修約 | 四捨五入（half-up）取整數 | 四捨五入（half-up）取整數（Appendix G：「round the index to the nearest integer」；0.5 進位為本工具釘版，未見 EPA 明文） |

健康影響與活動建議（台灣環境部空氣品質監測網「空氣品質指標 (AQI) 與健康影響及活動建議」表，全文釘版；英文為本工具對中文原文的翻譯，非官方英文，兩制共用同一組建議文）：

| AQI | 健康影響 zh | 健康影響 en |
| --- | --- | --- |
| 0–50 | 空氣品質為良好，污染程度低或無污染。 | Air quality is good, with little or no pollution. |
| 51–100 | 空氣品質普通；但對非常少數之極敏感族群產生輕微影響。 | Air quality is moderate; a very small number of unusually sensitive people may feel slight effects. |
| 101–150 | 空氣污染物可能會對敏感族群的健康造成影響，但是對一般大眾的影響不明顯。 | Air pollutants may affect the health of sensitive groups, but effects on the general public are not obvious. |
| 151–200 | 對所有人的健康開始產生影響，對於敏感族群可能產生較嚴重的健康影響。 | Health effects begin for everyone, and may be more serious for sensitive groups. |
| 201–300 | 健康警報：所有人都可能產生較嚴重的健康影響。 | Health alert: everyone may experience more serious health effects. |
| 301–500 | 健康威脅達到緊急，所有人都可能受到影響。 | Health threat is at emergency level; everyone may be affected. |

| AQI | 一般民眾活動建議 zh | 一般民眾活動建議 en |
| --- | --- | --- |
| 0–50 | 正常戶外活動。 | Normal outdoor activities. |
| 51–100 | 正常戶外活動。 | Normal outdoor activities. |
| 101–150 | 1.一般民眾如果有不適，如眼痛，咳嗽或喉嚨痛等，應該考慮減少戶外活動。2.學生仍可進行戶外活動，但建議減少長時間劇烈運動。 | 1. If you feel discomfort such as eye pain, coughing or a sore throat, consider reducing outdoor activities. 2. Students may still do outdoor activities, but should reduce prolonged strenuous exercise. |
| 151–200 | 1.一般民眾如果有不適，如眼痛，咳嗽或喉嚨痛等，應減少體力消耗，特別是減少戶外活動。2.學生應避免長時間劇烈運動，進行其他戶外活動時應增加休息時間。 | 1. If you feel discomfort such as eye pain, coughing or a sore throat, reduce physical exertion, especially outdoor activities. 2. Students should avoid prolonged strenuous exercise and take more breaks during other outdoor activities. |
| 201–300 | 1.一般民眾應減少戶外活動。2.學生應立即停止戶外活動，並將課程調整於室內進行。 | 1. The general public should reduce outdoor activities. 2. Students should stop outdoor activities immediately and move classes indoors. |
| 301–500 | 1.一般民眾應避免戶外活動，室內應緊閉門窗，必要外出應配戴口罩等防護用具。2.學生應立即停止戶外活動，並將課程調整於室內進行。 | 1. The general public should avoid outdoor activities, keep windows and doors closed indoors, and wear a mask and other protection if going out is necessary. 2. Students should stop outdoor activities immediately and move classes indoors. |

| AQI | 敏感族群活動建議 zh | 敏感族群活動建議 en |
| --- | --- | --- |
| 0–50 | 正常戶外活動。 | Normal outdoor activities. |
| 51–100 | 極特殊敏感族群建議注意可能產生的咳嗽或呼吸急促症狀，但仍可正常戶外活動。 | Extremely sensitive people should watch for possible coughing or shortness of breath, but may still do normal outdoor activities. |
| 101–150 | 1.有心臟、呼吸道及心血管疾病患者、孩童及老年人，建議減少體力消耗活動及戶外活動，必要外出應配戴口罩。2.具有氣喘的人可能需增加使用吸入劑的頻率。 | 1. People with heart, respiratory or cardiovascular disease, children and older adults should reduce physical exertion and outdoor activities, and wear a mask if going out is necessary. 2. People with asthma may need to use their inhaler more often. |
| 151–200 | 1.有心臟、呼吸道及心血管疾病患者、孩童及老年人，建議留在室內並減少體力消耗活動，必要外出應配戴口罩。2.具有氣喘的人可能需增加使用吸入劑的頻率。 | 1. People with heart, respiratory or cardiovascular disease, children and older adults should stay indoors and reduce physical exertion, and wear a mask if going out is necessary. 2. People with asthma may need to use their inhaler more often. |
| 201–300 | 1.有心臟、呼吸道及心血管疾病患者、孩童及老年人應留在室內並減少體力消耗活動，必要外出應配戴口罩。2.具有氣喘的人應增加使用吸入劑的頻率。 | 1. People with heart, respiratory or cardiovascular disease, children and older adults should stay indoors and reduce physical exertion, and wear a mask if going out is necessary. 2. People with asthma should use their inhaler more often. |
| 301–500 | 1.有心臟、呼吸道及心血管疾病患者、孩童及老年人應留在室內並避免體力消耗活動，必要外出應配戴口罩。2.具有氣喘的人應增加使用吸入劑的頻率。 | 1. People with heart, respiratory or cardiovascular disease, children and older adults should stay indoors and avoid physical exertion, and wear a mask if going out is necessary. 2. People with asthma should use their inhaler more often. |

敏感族群定義（釘版）：敏感族群指有心臟、呼吸道及心血管疾病患者、孩童及老年人；氣喘患者請特別留意。／ Sensitive groups are people with heart, respiratory or cardiovascular disease, children and older adults; people with asthma should take extra care.

免責聲明（釘版，全文常駐結果區下方）：本工具僅提供空氣品質資訊解讀與一般性活動建議，不構成醫療建議；如有呼吸道或心血管症狀，請諮詢醫師。／ This tool provides air-quality information and general activity guidance only. It is not medical advice; consult a physician if you have respiratory or cardiovascular symptoms.

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「解讀空氣品質」（直接 AQI 與濃度兩種模式、台灣／美國兩制），畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點（AQI 0／50／51／500、斷點恰等值、濃度超表上限）、剛好越界（AQI 501、濃度超絕對範圍）、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。等級不可只用顏色傳達，色塊須伴隨等級文字。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。18 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `aqi-direct-good` | 直接 AQI 35（台灣制）→ 良好／綠 |
| `aqi-boundary-50` | AQI 50 仍為良好（區間上緣含在內） |
| `aqi-boundary-51` | AQI 51 進入普通（區間下緣） |
| `aqi-direct-sensitive` | AQI 120 → 對敏感族群不健康／橘 |
| `aqi-boundary-500` | AQI 500 → 危害／褐紅 |
| `pm25-tw-20` | PM2.5 20.0 台灣制插值 → 72 |
| `pm25-us-20` | 同一濃度美國制插值 → 71（兩制差異對照） |
| `pm25-tw-edge-12-4` | PM2.5 12.4 恰為斷點 → 50 |
| `pm10-tw-100` | PM10 100 台灣制插值 → 111 |
| `o3-8h-0-078` | O3 8h 0.078 插值 → 126（125.5 半數進位） |
| `multi-max` | 兩種污染物取最大副指標，指標污染物為 PM10 |
| `multi-tie-break` | 兩副指標同分時按固定污染物順序取 PM2.5 |
| `pm25-above-top` | PM2.5 超過表頂 → 500 並記 ABOVE_TABLE_TOP |
| `o3-8h-undefined` | O3 8h 超過 0.200 無定義 → UNDEFINED_BAND |
| `o3-1h-below-band` | O3 1h 低於最低有定義區間 → UNDEFINED_BAND |
| `aqi-out-of-range-501` | AQI 501 → RANGE |
| `aqi-decimal` | AQI 小數 → INTEGER_FORMAT |
| `pm25-negative` | 濃度負號 → DECIMAL_FORMAT |
| `pm25-over-cap` | PM2.5 超過絕對範圍 → RANGE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 AQI 0／500／501、斷點恰等值（PM2.5 12.4→50、12.5→51）、重複污染物、0 列、8 列、O3 8h 0.200／0.201、SO2 304／305、PM2.5 500.4／500.5（台灣制）、PM2.5 325.4／325.5（美國制）。所有已接受的副指標不超出 0–500，移除上限後插值單調不減。

候選 gate（均 NOT_RUN）

- 於 `tools/aqi-interpreter/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「空氣品質解讀」，title「空氣品質解讀｜Gloss Tools」，description「輸入 AQI 或污染物濃度，對照台灣與美國 EPA 分級表，解讀空氣品質等級、顏色與健康活動建議。」。英文 lang=en，H1 “AQI Interpreter”，title “AQI Interpreter | Gloss Tools”，description “Enter an AQI value or pollutant concentrations and read the air-quality level, colour and health activity guidance under the Taiwan or US EPA scales.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。同一個濃度在台灣和美國算出來的 AQI 為什麼不同？因為兩制的濃度斷點不同（例如 PM2.5 良好上限台灣為 12.4 µg/m³、美國為 9.0 µg/m³），詳見規格 §5 對照表。 / Why does the same concentration give a different AQI in Taiwan vs the US? Because the breakpoint tables differ (for example, the Good limit for PM2.5 is 12.4 µg/m³ in Taiwan and 9.0 µg/m³ in the US); see the comparison table in SPEC §5.
- FAQ。這個工具會預報明天的空氣嗎？不會。它只解讀你輸入的數字，不做預報、不查即時監測值。 / Does this tool forecast tomorrow's air quality? No. It only interprets the numbers you enter; it does not forecast or fetch live monitoring values.
- FAQ。可以直接把即時濃度當成 24 小時平均輸入嗎？不行。PM2.5／PM10 的斷點以 24 小時平均定義，O3／CO 以 8 小時或 1 小時平均定義；即時讀數只能作為指示性參考，本工具不計算移動平均。 / Can I enter a real-time reading as a 24-hour average? No. PM2.5/PM10 breakpoints are defined on 24-hour averages and O3/CO on 8-hour or 1-hour averages; a real-time reading is indicative only, and this tool does not compute moving averages.
- FAQ。為什麼 O3 8 小時濃度超過 0.200 ppm 沒有結果？依官方規定，AQI 301 以上改以 O3 1 小時值計算，請改輸入 O3 1 小時濃度。 / Why is there no result when 8-hour O3 exceeds 0.200 ppm? By the official rule, AQI values above 300 are computed from 1-hour O3; enter the 1-hour O3 concentration instead.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://aqi-interpreter.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/6263e103dd25ff93611d976c9be8a2a47eb3754b/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/aqi-interpreter/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

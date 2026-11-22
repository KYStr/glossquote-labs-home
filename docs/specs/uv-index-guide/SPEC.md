# 紫外線指數指南 / UV Index Guide

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-uv-index-guide-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

出門前查到今天紫外線指數，馬上知道是哪一級、要不要防曬、擦多少係數的防曬乳、自己的膚質大概多久會曬紅。

- 桌面。桌面填上紫外線指數與膚質，對照分級表確認等級、顏色、防曬建議與曬紅時間估計。
- 行動。手機在出門前核對當天指數與防曬做法，不查詢即時預報、不定位。

使用情境為設計假設。資料只保留在目前頁面草稿。本工具僅供一般參考，不構成醫療建議。

## scope

輸入紫外線指數（0–20，至多一位小數）與 Fitzpatrick 膚質（I–VI，預設 III），對照 WHO／中央氣象署五級分級表輸出等級、顏色與防曬建議；曬紅時間為 MED 公式估計值，明確標示不是安全曝曬時間。非目標為即時預報查詢、定位、天氣資料、醫療診斷、個人化醫療建議、維生素 D 建議。

已與本 checkout 的既有預案比對，最相近者的實質差異如下。

- aqi-interpreter（空氣品質解讀，另案進行中，概念 27：AQI 0–50 良好、51–100 普通、101–150 對敏感族群不健康、151–200 不健康、201–300 非常不健康、301+ 危害，依臺灣環保署分級給健康建議）。此處輸入是太陽紫外線指數而非空氣品質指數，分級表、顏色與建議全部不同：紫外線給的是皮膚與眼睛的防曬建議（遮蔭、衣物、防曬乳 SPF、帽子、太陽眼鏡），空氣品質給的是呼吸健康建議（減少戶外活動、戴口罩、敏感族群注意事項）。兩者量測對象、數值來源、等級門檻與建議內容沒有任何共用部分。
- feels-like-temperature / dew-point（體感溫度／露點，不同量測對象：氣溫與濕度感受，此處是紫外線輻射強度）。

判定規則由本文定義，無線上資料或外部服務依賴。分級表與防曬建議的來源見 inputsOutputs 第 2 段。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「紫外線指數 / UV index」
- 欄位或說明「膚質（Fitzpatrick I–VI） / Skin type (Fitzpatrick I–VI)」
- 「查詢防曬建議 / Check sun protection」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「等級、防曬建議與曬紅時間估計 / Category, protection advice and estimated time to redness」先摘要（等級色塊＋等級名稱）再列細節。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 曬紅時間一律附免責聲明原文（見 inputsOutputs 第 5 段），並標示「估計值，不是安全曝曬時間 / Estimate, not a safe exposure time」。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"uvIndex":"5","skinType":"III"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- `uvIndex`：ASCII 十進數字串，無空白／符號／指數；整數部分為 `0` 或非零開頭，至多一位小數（`8`、`8.5` 合法；`08`、`8.55`、`1e1` 不合法）；raw 最多 8 單元；範圍 0–20（含）。
- `skinType`：可省略，省略時預設 `"III"`；若提供，必須是 `"I"`、`"II"`、`"III"`、`"IV"`、`"V"`、`"VI"` 其中之一。
- 預設 `{"uvIndex":"5","skinType":"III"}`。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 uvIndex、skinType 驗證。raw 超限 INPUT_LIMIT、文法 FORMAT、範圍 RANGE、型別或未知欄 SCHEMA，field 即上述欄名。驗證順序：uvIndex 容量 → uvIndex surrogate → uvIndex 文法 → uvIndex 範圍 → skinType。`uvIndex` 缺欄或空字串為 EMPTY；`skinType` 為空字串或不在六值內為 SCHEMA。
2. 分級：`uvIndexRounded = floor(uvIndex + 0.5)`（半進位，half-up；uvIndex ≥ 0 故與 half-away-from-zero 相同）。依下表整數分級（來源：WHO《Global Solar UV Index: A Practical Guide》（2002）表 1、表 4；中央氣象署《紫外線指數預報服務》說明文件，依 WHO 規範分級；兩者門檻一致，中文級名取氣象署，英文級名與顏色取 WHO）：

    | uvIndexRounded | code | zh | en | color | pms |
    | --- | --- | --- | --- | --- | --- |
    | 0–2 | low | 低量級 | Low | green | PMS 375 |
    | 3–5 | moderate | 中量級 | Moderate | yellow | PMS 102 |
    | 6–7 | high | 高量級 | High | orange | PMS 151 |
    | 8–10 | very-high | 過量級 | Very high | red | PMS 032 |
    | 11–20 | extreme | 危險級 | Extreme | purple | PMS 265 |

3. 防曬建議（逐級固定字串，來源見第 4 段；`spfMinimum` 為建議防曬係數下限，`reapplyMinutes` 為補擦間隔分鐘，null 表示無補擦排程）：

    | code | protectionRequired | avoidMidday | spfMinimum | reapplyMinutes | cwaBurnTimeMinutes | adviceZh | adviceEn |
    | --- | --- | --- | --- | --- | --- | --- | --- |
    | low | false | false | 15 | null | null | 可安心待在戶外；晴天戴太陽眼鏡，容易曬傷者可擦廣效性 SPF 15+ 防曬乳。 | You can safely stay outside; wear sunglasses on bright days. If you burn easily, use broad-spectrum SPF 15+ sunscreen. |
    | moderate | true | false | 30 | 120 | null | 中午時段找遮蔭；穿衣、擦防曬乳、戴帽子。 | Seek shade during midday hours; cover up and wear sunscreen and a hat. |
    | high | true | false | 30 | 120 | 30 | 中午時段找遮蔭；穿衣、擦防曬乳、戴帽子，減少 10–16 時戶外時間。 | Seek shade during midday hours; cover up and wear sunscreen and a hat, and reduce time outdoors between 10:00 and 16:00. |
    | very-high | true | true | 50 | 120 | 20 | 中午避免待在戶外；遮蔭、衣物、防曬乳、帽子缺一不可。 | Avoid being outside during midday hours; shade, clothing, sunscreen and a hat are a must. |
    | extreme | true | true | 50 | 120 | 15 | 盡量避免中午待在戶外；遮蔭、衣物、防曬乳、帽子缺一不可。 | Try to avoid the sun during midday hours; shade, clothing, sunscreen and a hat are a must. |

    `cwaBurnTimeMinutes` 為中央氣象署分級表所列「N 分鐘內可能曬傷」（高量級 30、過量級 20、危險級 15；低量級與中量級該欄空白，故為 null），指一般人未防護下的參考值，不是安全時間。`avoidMidday` 為 `uvIndexRounded ≥ 8`（WHO 簡明建議：8 以上中午避免待在戶外；氣象署：過量級以上 10–14 時最好不在烈日下活動）。
4. SPF 與補擦的來源與分工：SPF 30 下限（UVI ≥ 3）、外出前 15–20 分鐘塗抹、每 2 小時補擦，取自 WHO 防曬建議（經同行文獻引述 WHO 指南：UVI > 3 時使用 SPF 至少 30 的防曬乳，約於外出前 15–20 分鐘塗抹、每 2 小時補擦一次）與衛生福利部國民健康署防曬 5 裝備（戶外活動外出前 30 分鐘使用防水且 SPF 30 以上防曬乳，每 2 小時補充一次）；兩者一致，取交集：本工具採「SPF 30+、每 2 小時補擦」。SPF 50+（UVI ≥ 8）是本工具的固定升級規則，非 WHO 原文，不可歸於 WHO。SPF 15（低量級）取自美國 EPA 指引（低量級：容易曬傷者使用廣效性 SPF 15+ 防曬乳）。
5. 曬紅時間估計：以未防護、未四捨五入的 `uvIndex` 原值計算。1 UVI = 25 mW/m² 紅斑加權輻照度，即每分鐘 1.5 J/m²（WHO《Global Solar UV Index: A Practical Guide》定義，`ker = 40 m²/W`）。`minutesToRedness = round-half-up(MED / (1.5 × uvIndex))`，MED（最小紅斑劑量，J/m²）依膚質固定如下表；`uvIndex = 0` 時為 null；算出值 > 180 時取 180 且 `capped = true`（顯示為「180 分鐘以上」，不顯示 667 分鐘這類無意義長值）；其餘 `capped = false`。

    | skinType | MED (J/m²) | skinNoteZh | skinNoteEn |
    | --- | --- | --- | --- |
    | I | 200 | 總是曬傷、從不曬黑。 | Always burns, never tans. |
    | II | 250 | 容易曬傷、很少曬黑。 | Burns easily, tans minimally. |
    | III | 300 | 有時曬傷、逐漸曬黑。 | Sometimes burns, tans gradually. |
    | IV | 450 | 很少曬傷、容易曬黑。 | Rarely burns, tans easily. |
    | V | 600 | 極少曬傷、很容易曬黑。 | Very rarely burns, tans very easily. |
    | VI | 1000 | 幾乎不曬傷。 | Almost never burns. |

    MED 採各皮膚科參考值通用的圓整典型值（I 200、II 250、III 300、IV 450、V 600、VI 1000 J/m²），為群體規劃估計值，非個人閾值；同一 Fitzpatrick 型內個人 MED 差異可達 ±40%。不同膚質的差異只體現在本估計值與膚質說明，不改變等級、顏色與 SPF 下限（SPF 下限只依等級決定）。曬紅時間是「未防護皮膚出現可見紅斑的估計劑量時間」，不是安全曝曬時間：WHO 指南原文指出不建議報告曬傷時間（REPORTING BURN TIMES IS NOT RECOMMENDED），本工具因此一律標示估計性質並附免責聲明，絕不稱之為「安全時間」。免責聲明原文（逐字固定）：zh「本工具僅供一般參考，不構成醫療建議。曬紅時間為估計值，個人差異很大；防曬請以官方建議為準。」／en「This tool is for general reference only and is not medical advice. Time-to-redness is an estimate; individual variation is large. Follow official sun-protection guidance.」
6. 結果為 `{uvIndex, uvIndexRounded, category:{code,zh,en,color,pms}, protectionRequired, avoidMidday, spfMinimum, reapplyMinutes, cwaBurnTimeMinutes, burnEstimate:{skinType,medJPerM2,minutesToRedness,capped}, adviceZh, adviceEn, skinNoteZh, skinNoteEn, disclaimerZh, disclaimerEn}`。`uvIndex` 為輸入的數值（一位小數以內）；`minutesToRedness` 為整數分鐘或 null；其餘字串逐字取自上表。機器值不隨 locale 改。

固定下載 `uv-index-guide-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/uv-index-guide/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。
- 等級色塊只用 `color` 名稱（green / yellow / orange / red / purple）對應設計系統色板，另以文字標示等級名稱，不只靠顏色傳達等級（色覺辨識無障礙）。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「查詢防曬建議」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。16 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `low-typical` | 低量級、綠色、SPF 15、曬紅 100 分鐘 |
| `moderate-boundary` | 邊界 3 為中量級、SPF 30、曬紅 67 分鐘 |
| `high-type-I-decimal` | 小數 6.5 進位為 7（高量級）、I 型曬紅 21 分鐘 |
| `very-high-type-II` | 過量級、紅色、SPF 50、II 型曬紅 21 分鐘 |
| `extreme-type-VI` | 危險級、紫色、SPF 50、VI 型曬紅 61 分鐘 |
| `extreme-rounding-half-up` | 10.5 半進位為 11（危險級）、曬紅 19 分鐘 |
| `night-zero` | 指數 0 為低量級、曬紅時間 null |
| `cap-long` | 長估計值截斷為 180 分鐘且 capped |
| `moderate-type-V` | 中量級、V 型曬紅 80 分鐘 |
| `high-boundary-7-4` | 7.4 進位為 7（高量級）、IV 型曬紅 41 分鐘 |
| `default-skin-type` | 省略膚質預設 III 型、曬紅 50 分鐘 |
| `too-many-decimals` | 兩位小數不接受 |
| `out-of-range` | 20.5 超出範圍 |
| `negative` | 負數不接受 |
| `empty` | 空輸入 |
| `bad-skin-type` | 膚質不在 I–VI 內 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 uvIndexRounded==2/3、7.4→7 與 7.5→8、20/20.5、0/0.1、skinType 省略與非法值。所有已接受的 minutesToRedness 皆為整數或 null，capped 時必為 180。

候選 gate（均 NOT_RUN）

- 於 `tools/uv-index-guide/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「紫外線指數指南」，title「紫外線指數指南｜Gloss Tools」，description「輸入紫外線指數與膚質，對照 WHO／中央氣象署分級，取得等級、顏色與防曬建議。」。英文 lang=en，H1 “UV Index Guide”，title “UV Index Guide | Gloss Tools”，description “Enter the UV index and your skin type to get the WHO / CWA category, colour and sun-protection advice.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。指數 3 以上就要防曬嗎？是，WHO 簡明建議 UVI 3 以上開始防護。 / Do I need protection at UV index 3 and above? Yes — WHO advises sun protection from UV index 3.
- FAQ。曬紅時間是安全時間嗎？不是，是未防護下出現紅斑的估計值，個人差異很大，不可當作可以曬多久的保證。 / Is the time to redness a safe time? No — it is an estimate of when redness appears without protection; individual variation is large and it is not a guarantee of how long you can stay in the sun.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://uv-index-guide.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線以開工時 FETCH_HEAD 為準，開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/uv-index-guide/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

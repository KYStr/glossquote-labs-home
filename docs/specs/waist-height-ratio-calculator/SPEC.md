# 腰高比計算機 / Waist-to-Height Ratio Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-waist-height-ratio-calculator-20261121` · 2026-11-21 · v1

[本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/c8ca5fd3/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者量了腰圍與身高，想知道腰圍是不是不到身高的一半：腰圍除以身高得到腰高比（WHtR），對照分級判斷屬於健康、增加或高中心肥胖，並算出維持腰圍不到身高一半還差幾公分。

- 桌面。桌面填上腰圍與身高，確認比值、分級、健康腰圍區間與達標差值。
- 行動。手機在健檢後或買褲子量尺寸時核對一次比值，不留紀錄。

使用情境為設計假設。資料只保留在目前頁面草稿。

## scope

兩個公分輸入、一個比值、四級分級、健康腰圍區間與達標差值。非目標為體重指標、體脂率估算、追蹤紀錄、飲食或運動建議、醫療診斷、英吋輸入換算。

分級表以第一手來源釘版：英國 NICE 肥胖指引（2022 年更新，2022 年 4 月草案、9 月正式採納）定義中心肥胖程度為健康 0.4–0.49、增加 0.5–0.59、高 0.6 或以上，適用於 BMI 未滿 35 kg/m² 的成年人，男女與各族裔同一組界線，並提出「腰圍維持不到身高一半」的公共衛生訊息；0.4 / 0.5 / 0.6 三條界線源自 Ashwell 等人（BMC Medicine 2014，doi:10.1186/s12916-014-0207-1）的 Ashwell Shape Chart，其 <0.4 區域標示為「Take Care」。NICE 表格本身未替 <0.4 命名，本規格依 Ashwell 稱之為「低於健康範圍」，不是第四個健康帶（見 AUTHOR-CHECK）。

與既有工具的實質差異如下。

- BMI 與 TDEE 計算機。此處不量體重、不算 BMI、不估每日熱量消耗，只用腰圍與身高算中心肥胖比值。 [bmi-tdee-calculator](https://github.com/KYStr/glossquote-labs-home/blob/c8ca5fd3/docs/specs/bmi-tdee-calculator/SPEC.md)
- 體脂率工具（body-fat）。該類工具估算全身脂肪百分比，需要體重與多處圍度或皮褶等輸入；此處只用一處圍度（腰圍）對身高，不估體脂率。本 checkout 內無 body-fat 規格，差異以概念界定。

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「腰圍（公分） / Waist (cm)」
- 欄位或說明「身高（公分） / Height (cm)」
- 「計算腰高比 / Calculate waist-to-height ratio」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「腰高比、分級與達標差值 / Ratio, category and distance to target」先摘要再列細節。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"waistCm":"","heightCm":""}`（兩欄皆空，無預填數值）並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

量測說明（固定文案，非驗證規則）：「站立放鬆，自然呼氣末量測；捲尺水平置於最低肋骨下緣與髖骨（髂骨）上緣的中點，貼合皮膚但不勒緊（WHO STEPS 量測法）。」 / "Stand relaxed and measure at the end of a normal breath out, with the tape horizontal at the midpoint between the lower edge of the lowest rib and the top of the hip bone (iliac crest), snug but not compressing the skin (WHO STEPS method)."

免責聲明（固定文案，結果區上方常駐顯示）：「本工具僅供一般健康資訊參考，不是醫療診斷或建議；如有疑慮請諮詢醫事人員。」 / "This tool provides general health information only. It is not a medical diagnosis or advice; consult a healthcare professional if you have concerns."

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 兩欄皆為十進小數字串，可含一位小數點，最多 2 位小數，無空白／符號／指數／千分位逗號，raw 每欄最多 16 單元。waistCm 20–300（含），heightCm 50–300（含），單位皆為公分（cm）。不接受英吋輸入，不做單位換算。
- 預設兩欄皆空。無預填數值。

先容量、再 surrogate、再該欄文法，跨欄順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 waistCm、heightCm 順序驗證。raw 超限 INPUT_LIMIT、空字串 EMPTY、文法 DECIMAL_FORMAT、範圍 RANGE，field 即上述欄名。文法：可選整數部（至少一位數字）加可選小數部（小數點後 1–2 位數字）；前導零允許；`.` 開頭、尾隨小數點、空整數部皆 DECIMAL_FORMAT。
2. 將兩欄精確解析為百分之一公分的整數（waistHundredths、heightHundredths），全程整數運算，禁用浮點。
3. 比值顯示值：WHtR × 100 四捨五入（half-up，見 implementation）取 2 位小數，以字串輸出（例如 `"0.50"`，尾零保留）。
4. 分級以**未四捨五入的精確比值**判定，整數比較，界線含下限：
   - `below-healthy`：WHtR < 0.40（即 5 × waistHundredths < 2 × heightHundredths），低於健康範圍。
   - `healthy`：0.40 ≤ WHtR < 0.50（即 2 × waistHundredths < heightHundredths），健康。
   - `increased`：0.50 ≤ WHtR < 0.60（即 5 × waistHundredths < 3 × heightHundredths），中心肥胖增加。
   - `high`：WHtR ≥ 0.60，高中心肥胖。
   - 因此顯示值 0.50 可能是 healthy（精確值 0.4994…）或 increased（精確值恰為 0.5），分級永遠以精確值為準，顯示值不決定分級。
5. 健康腰圍區間：`healthyWaistMinCm` = 0.40 × 身高，`healthyWaistMaxCm` = 0.50 × 身高，各以 half-up 取 1 位小數，字串輸出（尾零保留，例如 `"68.0"`）。
6. 達標差值 `waistToLoseCm`：僅當精確 WHtR ≥ 0.50 時輸出腰圍減去 0.50 × 身高，half-up 取 1 位小數，字串輸出（恰為 0 時輸出 `"0.0"`）；精確 WHtR < 0.50 時輸出 null。腰圍超過身高時比值可大於 1，仍按同一規則輸出 high 分級與差值，不另設錯誤。
7. 結果 `{whtr,category,healthyWaistMinCm,healthyWaistMaxCm,waistToLoseCm}`，其中 `whtr` 為 2 位小數字串，`category` 為上述四個 id 之一。機器值不隨 locale 改。

固定下載 `waist-height-ratio-calculator-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/waist-height-ratio-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 四捨五入一律 half-up（逢 5 進位，away from zero；輸入皆為正數，故等同 round-half-up），以整數運算實作，禁用浮點：比值 2 位小數取 `q = floor(waistHundredths × 100 / heightHundredths)`，餘數 `r`，若 `2r ≥ heightHundredths` 則 `q + 1`；腰圍界線 1 位小數同理以十分位整數運算。分級比較亦為整數比較（見 inputsOutputs 第 4 點），不經浮點比值。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

分級表（字面資料，來源 NICE 2022 與 Ashwell et al. BMC Medicine 2014）：

| 精確 WHtR | category | 中文 | 英文 | 健康風險 |
| --- | --- | --- | --- | --- |
| < 0.40 | below-healthy | 低於健康範圍 | Below healthy range | 未列入 NICE 健康帶；Ashwell 圖表標示 Take Care |
| 0.40–<0.50 | healthy | 健康 | Healthy | 無增加風險 |
| 0.50–<0.60 | increased | 中心肥胖增加 | Increased central adiposity | 風險增加，留意 |
| ≥ 0.60 | high | 高中心肥胖 | High central adiposity | 風險進一步增加，採取行動 |

適用範圍註記（固定文案）：分級適用於 BMI 未滿 35 kg/m² 的成年人，男女與各族裔同一組界線；BMI ≥ 35 時腰圍對風險的額外預測力很小，本工具不另作調整，結果仍僅供參考。5 歲以上兒童適用同一組界線（NICE），但本工具不問年齡、不設兒童模式，以成人使用為設計對象。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算腰高比」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
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
| `healthy-mid` | 典型健康比值 0.45 |
| `just-below-half` | 顯示 0.50 但精確值 < 0.5，仍為 healthy（顯示值不決定分級） |
| `exactly-half` | 精確值恰為 0.5，increased，差值 0.0 |
| `increased` | 增加帶 0.56，差值 10.0 |
| `high` | 高帶 0.62，差值 20.0 |
| `exactly-six-tenths` | 精確值恰為 0.6，high |
| `below-healthy` | 低於健康範圍 0.35 |
| `exactly-four-tenths` | 精確值恰為 0.4，healthy 下限含入 |
| `decimal-inputs` | 小數輸入與 1 位小數健康區間（67.4–84.2） |
| `whtr-above-one` | 腰圍大於身高，比值 1.08 仍為 high，不報錯 |
| `zero-height` | 身高 0，RANGE |
| `non-numeric-waist` | 腰圍非數字，DECIMAL_FORMAT |
| `waist-too-small` | 腰圍 10，RANGE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 waistCm=20/300、heightCm=50/300 端點、waistCm=19.99/300.01、heightCm=49.99/300.01、3 位小數輸入、腰圍恰為身高一半 ±0.01 的分級翻轉。所有已接受的結果皆滿足 healthyWaistMinCm ≤ healthyWaistMaxCm，且 waistToLoseCm 為 null 或 ≥ 0.0。

候選 gate（均 NOT_RUN）

- 於 `tools/waist-height-ratio-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「腰高比計算機」，title「腰高比計算機｜Gloss Tools」，description「輸入腰圍與身高，算出腰高比，對照 NICE 分級判斷中心肥胖程度，並算出腰圍維持不到身高一半還差幾公分。」。英文 lang=en，H1 “Waist-to-Height Ratio Calculator”，title “Waist-to-Height Ratio Calculator | Gloss Tools”，description “Enter your waist and height to get your waist-to-height ratio, its NICE category, and how far your waist is from staying under half your height.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。顯示 0.50 卻是健康，為什麼？分級用未四捨五入的精確比值判定，顯示值只取 2 位小數；例如 84.9 ÷ 170 = 0.4994…，顯示 0.50，仍屬健康。 / Why does it show 0.50 but say healthy? The category uses the exact unrounded ratio; the display is rounded to 2 decimals. For example, 84.9 ÷ 170 = 0.4994…, which displays as 0.50 but is still healthy.
- FAQ。腰圍要怎麼量？站立放鬆，自然呼氣末量測；捲尺水平置於最低肋骨下緣與髖骨上緣的中點，貼合皮膚但不勒緊。 / How do I measure my waist? Stand relaxed and measure at the end of a normal breath out, with the tape horizontal at the midpoint between the lower edge of the lowest rib and the top of the hip bone, snug but not compressing the skin.
- FAQ。腰高比跟 BMI 有什麼不同？BMI 用體重與身高，反映整體體重；腰高比用腰圍與身高，反映腹部脂肪分布，兩者互補，不能互相取代。 / How is WHtR different from BMI? BMI uses weight and height and reflects overall body weight; WHtR uses waist and height and reflects abdominal fat distribution. They complement each other and cannot replace one another.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://waist-height-ratio-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/waist-height-ratio-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

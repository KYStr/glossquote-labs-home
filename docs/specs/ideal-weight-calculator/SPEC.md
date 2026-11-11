# 理想體重計算 / Ideal Weight Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-ideal-weight-calculator-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者只有身高（和性別），想知道「這個身高對應的體重大概是多少」：體檢前先對照、健身或飲食調整時想有個參考區間、或單純好奇藥師算藥量用的「理想體重」是什麼。市面頁面通常只給單一公式的單一數字、不標常數出處，或把 kg 化的 Hamwi 用約略常數默默改掉。本工具回答的是反問題——給身高，輸出體重——並且一次並列四個已發表公式與 WHO 健康體重範圍，每個常數都標明原始出處。

- 桌面。桌前查表比較：輸入身高與性別，四個公式、WHO 範圍與 BMI 22 參考值並排，一眼看出各方法差距。
- 行動。就醫或量測前在手機上快速核對一個數字，單手完成，不上傳任何資料。

使用情境為設計假設。資料只保留在目前頁面草稿。

成功結果：使用者輸入身高（cm）與性別後，得到 (1) 標明 WHO 的健康體重範圍（kg)、(2) BMI = 22 的參考體重（台灣慣用參考點）、(3) Devine、Robinson、Miller、Hamwi 四公式各一個估算值，四者並列、不取平均、不選贏家；結果旁常駐健康聲明（見 inputsOutputs 固定文字）。本工具不收目前體重：給體重算 BMI 與分類是 bmi-tdee-calculator 的工作，本工具刻意只做反向問題，避免同一件事兩種判讀。

## scope

MVP：單一模式。欄位只有 `heightCm` 與 `sex`。輸出為 WHO 健康體重範圍（BMI 18.5 與 24.9 兩端點換算 kg)、BMI 22 參考體重、四公式估算（kg)、輸入身高的英吋換算顯示。全部常數釘版於 inputsOutputs，頁面本身即印出公式與出處，自我可稽核。

標示慣例（釘版）：顯示的健康範圍採 **WHO 全球成人界值 BMI 18.5–24.9**，標籤固定寫明「WHO」。台灣衛生福利部國民健康署的成人健康體位帶是 **18.5 ≤ BMI < 24**（過重自 24 起），與 WHO 只差上端（24.0 對 24.9）；本工具不以國健署帶作顯示範圍，兩者關係以 FAQ 固定文字揭露（見 tests)。BMI 22 參考體重是台灣臨床與衛教慣用的單點參考，一併標明慣例來源，不冒充任何官方界值。

非目標（釘版，不做）：
- 目前體重輸入與任何「距離目標還差幾公斤」、目前 BMI 或分類判讀——那是 bmi-tdee-calculator 的範圍；本工具不收體重欄位，送進體重鍵即 SCHEMA。
- 骨架／體型（frame size）調整：Hamwi 原始文獻附帶的大／小骨架 ±10% 建議不套用。四公式只有 Hamwi 有此附註、其餘三式沒有，把它只套一式或推廣到四式都沒有單一可引標準；FAQ 揭露此事，不提供調整欄位。
- 調整體重 AdjBW（IBW + 0.4 × 超額體重）——需要目前體重且屬臨床給藥範疇，不做。
- 年齡欄位（四公式與範圍都不用年齡）、兒童／青少年、孕婦調整、體脂估算、英制輸入（身高只收 cm；英吋僅作顯示與公式內部換算）、飲食或減重建議、登入、儲存、分享。

已與本 repo 既有預案比對，最相近者的實質差異如下。

- 給體重與身高算 BMI 值、WHO 分類、BMR 與 TDEE，並附該身高的健康體重範圍作輔助顯示；輸入含體重與年齡，問題是「我現在落在哪一帶」。本工具不收體重與年齡，只給身高反查體重，且主輸出是四個具名公式的估算並列與常數出處。範圍顯示慣例亦不同：該案範圍上端以 BMI 25 的排他界值顯示（stay below)，本工具以 WHO 公布的 24.9 為上端點。 [bmi-tdee-calculator](docs/specs/bmi-tdee-calculator/)
- 以 BMI 22 等慣例點估算每日熱量需求，與體重數字無涉。

判定規則由本文定義，無線上資料或外部服務依賴。公式常數出處見 inputsOutputs 表與 AUTHOR-CHECK.md 的來源核對表。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「身高（公分） / Height (cm)」
- 欄位或說明「性別（公式用） / Sex (used by the formulas)」
- 「計算理想體重 / Calculate ideal weight」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例（`{"heightCm":"170","sex":"male"}`），明示範例並等待手動執行。
- 結果區固定順序：(1)「健康體重範圍（WHO) / Healthy weight range (WHO)」——`lowKg – highKg kg`，標籤同時印出「BMI 18.5–24.9」; (2)「BMI 22 參考體重 / Reference weight at BMI 22」; (3) 四列公式結果，每列固定為「公式名（年份） / Formula (year)」＋ kg 值，順序 Devine、Robinson、Miller、Hamwi，不取平均、不標「最佳」; (4)「身高換算 / Height」顯示 `heightInches in`（僅顯示，公式用未捨入值）。健康聲明常駐結果區上方（文字見 inputsOutputs)，不因捲動或成功／錯誤狀態消失。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果與健康聲明同時可見。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"heightCm":"","sex":"female"}` 並聚焦身高欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含確切欄位 `heightCm`、`sex` 的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

欄位驗證順序固定：先全份 SCHEMA，再依欄位順序 heightCm → sex 逐欄驗證；每欄內順序固定為 INPUT_LIMIT（raw 超過 8 個 UTF-16 code units）→ UNICODE（不成對 surrogate、C0/C1 控制字元或 Cf 格式字元）→ EMPTY（長度 0）→ 文法／列舉 → RANGE。整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

- `heightCm`：ASCII 十進字串，文法 `^[0-9]+(\.[0-9])?$`（整數部分至少一位，小數至多一位；無正負號、空白、指數；前導零允許，數值照常解析；全形數字不合文法）。不合文法為 DECIMAL_FORMAT。數值範圍 130.0–230.0 cm（含端點），外為 RANGE。範圍依據：四公式為成人公式，130 cm 以下 Devine 女性線逼近不合理低值，故下限釘 130.0；上限 230.0 涵蓋成人實測極端。端點本身合法（fixtures 有 130 與 230 兩例）。
- `sex`：字串，恰為 `"male"` 或 `"female"`（ASCII 小寫，不做大小寫或空白寬容），否為 ENUM。四公式的性別常數是原始文獻的二元分組，頁面標籤註明「公式用 / used by the formulas」。

計算（精確有理數算術，中途不捨入；常數皆十進有限小數或下列分數）:

1. `h2 = (heightCm / 100)^2`。健康範圍 `lowKgExact = 18.5 × h2`、`highKgExact = 24.9 × h2`（WHO 成人正常帶 18.5–24.9，見 AUTHOR-CHECK 來源表）；`bmi22KgExact = 22 × h2`。
2. 英吋 `inchesExact = heightCm / 2.54`（1 in = 2.54 cm 為定義上的精確值，即 `heightCm × 50 / 127`）；`E = inchesExact − 60`，E 可為負：身高低於 5 英尺時四公式沿同一直線延伸（釘版選擇；原始文獻以 5 英尺前後成人為對象，FAQ 揭露此延伸與其粗略性）。
3. 四公式（base = 5 英尺處 kg，k = 每英吋 kg；出處見下表）:
   - Devine：男 base 50、k 2.3；女 base 45.5、k 2.3。
   - Robinson：男 base 52、k 1.9；女 base 49、k 1.7。
   - Miller：男 base 56.2、k 1.41；女 base 53.1、k 1.36。
   - Hamwi：原始文獻以磅發表——男 106 lb + 6 lb/英吋、女 100 lb + 5 lb/英吋——本工具釘版以磅原生式計算再精確換算：`hamwiKgExact = (baseLb + kLb × E) × 0.45359237`（1 lb = 0.45359237 kg 為國際定義精確值）。不採市面常見的 kg 約略常數（48 + 2.7 / 45.5 + 2.2），兩者在 E = 10 時差 0.3 kg，差異與取捨記錄於 AUTHOR-CHECK.md。
4. 捨入：每個輸出只在最後一步捨入一次，採 half-up（.5 進位；本範圍內輸出恆正）至小數 1 位：`r(x) = floor(10x + 0.5) / 10`，以精確值求值（不用已捨入的中間量反推任何輸出）。`heightInches` 同法由 `inchesExact` 捨入，僅供顯示。

結果物件（鍵集合固定）:`{heightCm, sex, heightInches, healthyRangeKg:{lowKg, highKg}, bmi22Kg, formulasKg:{devine, robinson, miller, hamwi}}`。`heightCm` 為解析後數值（`"170"` → 170，`"175.5"` → 175.5）；其餘體重與英吋皆為捨入後 1 位小數值。

公式出處（常數經作者對照已發表來源核對，明細見 AUTHOR-CHECK.md):

| 公式 | 原始發表 | 型式 |
| --- | --- | --- |
| Devine (1974) | Devine BJ. Gentamicin therapy. Drug Intell Clin Pharm. 1974;8:650–655 | kg 原生 |
| Robinson (1983) | Robinson JD, et al. Determination of ideal body weight for drug dosage calculations. Am J Hosp Pharm. 1983;40:1016–1019 | kg 原生 |
| Miller (1983) | Miller DR, et al. Determining ideal body weight (and mass). Am J Hosp Pharm. 1983;40:1622–1625 | kg 原生 |
| Hamwi (1964) | Hamwi GJ. Therapy: changing dietary concepts. In: Danowski TS, ed. Diabetes Mellitus: Diagnosis and Treatment. ADA; 1964:73–78 | lb 原生，本工具精確換算 |
| 四式綜述 | Pai MP, Paloucek FP. The origin of the "ideal" body weight equations. Ann Pharmacother. 2000;34:1066–1069 | — |

健康聲明（釘版原文，常駐結果區上方，兩語對等）:
- 中：這些數字是依身高與性別推算的族群統計參考值，不是個人醫療建議，也不是診斷或減重目標。公式未考慮年齡、肌肉量、體脂、骨架與懷孕等個人差異；如有健康疑問，請諮詢醫師或營養師。
- En: These figures are population-level statistical references estimated from height and sex only. They are not personal medical advice, a diagnosis, or a weight-loss target. The formulas do not account for age, muscle mass, body fat, frame size, pregnancy, or other individual differences. Consult a physician or registered dietitian with any health concerns.

固定下載 `ideal-weight-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/ideal-weight-calculator/`。src/core.mjs 放純驗證、推導、格式化（精確算術以整數／分數表示：身高以 0.1 cm 整數、h2 與各常數以有理數運算，避免浮點中間誤差；或等價的精確十進實作，輸出須與 fixtures 逐值相等）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換草稿、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算理想體重」，畫面（範圍、BMI 22、四公式、英吋顯示、健康聲明）和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點 130.0／230.0、剛好越界 129.9／230.1、5 英尺整（152.4)、低於 5 英尺延伸、第一個錯誤、欄位順序和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log；身高與性別不離開頁面。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯（含 WHO 標籤、聲明與 FAQ）、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴；四公式常數與出處表逐項可指認。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。16 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `male-170-standard` | 男性 170 cm 全輸出（Hamwi 磅原生換算 66.9) |
| `female-160-standard` | 女性 160 cm 全輸出 |
| `male-152-4-five-feet` | 恰好 5 英尺，E = 0，四式等於基準值 |
| `female-147-below-five-feet` | 低於 5 英尺，E 為負的直線延伸（Hamwi 40.5，區別於 kg 約略常數的 40.8) |
| `female-130-min-boundary` | 下限 130.0 合法端點 |
| `male-230-max-boundary` | 上限 230.0 合法端點 |
| `female-175-5-decimal` | 一位小數身高 175.5 |
| `height-empty` | 身高 EMPTY |
| `height-alpha` | 身高 DECIMAL_FORMAT |
| `height-two-decimals` | 兩位小數 DECIMAL_FORMAT |
| `height-below-range` | 129.9 RANGE（下限外一步） |
| `height-above-range` | 230.1 RANGE（上限外一步） |
| `height-over-limit` | 9 單元 INPUT_LIMIT（先於文法／範圍） |
| `sex-invalid` | 性別 ENUM |
| `sex-empty` | 性別 EMPTY |
| `schema-extra-key` | 未知欄位 age → SCHEMA（不收年齡／體重） |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法端點、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 E=0 時四式基準值、E<0 延伸、Hamwi 磅→kg 精確換算（106 lb = 48.1 kg 捨入後）、範圍兩端 18.5／24.9 乘 h² 的精確值捨入，以及所有輸出只捨入一次（不得以已捨入英吋反推公式）。

候選 gate（均 NOT_RUN）

- 於 `tools/ideal-weight-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「理想體重計算」，title「理想體重計算｜Gloss Tools」，description「輸入身高與性別，查 WHO 健康體重範圍、BMI 22 參考體重，以及 Devine、Robinson、Miller、Hamwi 四個已發表公式的理想體重估算，常數全數標明出處。」。英文 lang=en，H1 “Ideal Weight Calculator”，title “Ideal Weight Calculator | Gloss Tools”，description “From height and sex, see the WHO healthy weight range, the BMI-22 reference weight, and ideal weight estimates from the four published Devine, Robinson, Miller and Hamwi formulas, with every constant cited.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。為什麼四個公式的數字都不同？它們來自不同年代與樣本，最初多為藥物劑量設計，沒有哪一個是唯一正解；並列正是為了讓差距可見。 / Why do the four formulas give different numbers? They come from different decades and samples and were mostly designed for drug dosing; none is the single right answer, and showing them side by side makes the spread visible.
- FAQ。這裡的健康範圍和台灣國健署的標準一樣嗎？下限相同（BMI 18.5)，上限不同：本頁顯示 WHO 的 24.9，國健署成人健康體位是 18.5 ≤ BMI < 24，上限體重會比本頁低。 / Is this range the same as Taiwan's HPA standard? The lower bound matches (BMI 18.5), the upper differs: this page shows the WHO bound 24.9, while Taiwan's HPA healthy band is 18.5 ≤ BMI < 24, giving a lower upper weight.
- FAQ。身高不到 5 英尺時公式怎麼算？四式沿同一直線延伸（每英吋的增減不變）。公式原本以 5 英尺前後的成人為對象，矮個子的結果請當粗略參考。 / What if I am shorter than 5 feet? The formulas extend along the same straight line (the per-inch step is unchanged). They were published for adults around 5 feet and taller, so treat results at shorter heights as rough references.
- FAQ。為什麼沒有骨架大小的調整？只有 Hamwi 原文附帶 ±10% 的骨架建議，其餘三式沒有；沒有單一可引標準可套用到四式，本工具不調整，數字請連同聲明一起看。 / Why is there no frame-size adjustment? Only Hamwi's original note suggests ±10% for frame size; the other formulas have none, and no single citable rule applies it across all four, so this tool does not adjust.
- FAQ。可以把這些數字當減重目標嗎？不行。它們是族群統計參考，不是個人醫療建議；個人目標請諮詢醫師或營養師。 / Can I use these numbers as a weight-loss target? No. They are population-level statistical references, not personal medical advice; talk to a physician or registered dietitian about personal goals.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://ideal-weight.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/ideal-weight-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

# 膽固醇分級 / Cholesterol Checker

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-cholesterol-checker-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者拿到健檢報告上的血脂四項數值，想立刻知道每一項落在 NCEP ATP III 的哪一個分級，以及整體是否需要注意。

- 桌面。桌面填上總膽固醇、LDL、HDL、三酸甘油脂（mg/dL），逐項看到分級、非 HDL 膽固醇與整體摘要，附釘版聲明。
- 行動。手機在診間或家中對著健檢報告核對四項分級，不做診斷、不給治療建議。

使用情境為設計假設。資料只保留在目前頁面草稿。

## scope

四個整數欄位（mg/dL），依釘版 NCEP ATP III 分級表（見 inputsOutputs §4）逐項分級；附非 HDL 膽固醇（總膽固醇 − HDL，僅供參考，不分級）與整體摘要；聲明「僅供參考、非醫療建議」以釘版原文顯示。非目標為 mmol/L 換算、依性別區分 HDL 切點、風險評分（Framingham／ASCVD）、用藥或飲食建議、診斷或追蹤提醒。

已與 repo 內既有規格比對，最相近者的實質差異如下。

- 血壓分級（run 6 概念 2，同期另一作者）。此處是血脂四項的 NCEP ATP III 分級，不是血壓數值分級。
- BMI／TDEE 與體脂率。此處是血液檢驗數值分級，不是身高體重推導的身體組成指標。

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「總膽固醇 (mg/dL) / Total cholesterol (mg/dL)」
- 欄位或說明「低密度脂蛋白膽固醇 LDL (mg/dL) / LDL cholesterol (mg/dL)」
- 欄位或說明「高密度脂蛋白膽固醇 HDL (mg/dL) / HDL cholesterol (mg/dL)」
- 欄位或說明「三酸甘油脂 (mg/dL) / Triglycerides (mg/dL)」
- 「查詢分級 / Check categories」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個核心案例，明示範例並等待手動執行。
- 「分級結果 / Classification results」先顯示整體摘要，再逐項列出分級與非 HDL 膽固醇。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 釘版聲明全文常駐顯示於結果區上方與頁尾，見 inputsOutputs §6。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"total":"180","ldl":"90","hdl":"65","triglycerides":"120"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 全為 ASCII 十進整數字串，0 或非零開頭，無空白／符號／小數／指數，raw 每欄最多 5 單元。四欄皆必填，皆為 1–9999 mg/dL（含）。
- 預設 total 180、ldl 90、hdl 65、triglycerides 120（即 `all-desirable` 案例）。
- 欄位順序固定為 total、ldl、hdl、triglycerides；驗證亦依此順序，先驗完一欄再驗下一欄。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 total、ldl、hdl、triglycerides 驗證。raw 超限 INPUT_LIMIT、文法 INTEGER_FORMAT、範圍 RANGE，field 即上述欄名。空字串為 EMPTY（不是 INTEGER_FORMAT）。
2. 依下表逐項分級。區間為左閉右開：下界（含）起算，上界（不含）為下一級的下界；表中「<X」為嚴格小於，「≥X」為大於等於。

### 釘版分級表（NCEP ATP III）

來源：National Cholesterol Education Program, Adult Treatment Panel III, *ATP III Guidelines At-A-Glance Quick Desk Reference*, NIH Publication No. 01-3305（美國 National Heart, Lung, and Blood Institute）；McGraw-Hill NAPLEX Review Guide Table 5-1 轉載表核對一致。單位一律 mg/dL。

| 項目 | 數值範圍 | 分級 band | zh | en | severity |
| --- | --- | --- | --- | --- | --- |
| 總膽固醇 total | <200 | `desirable` | 理想 | Desirable | 0 |
| 總膽固醇 total | 200–239 | `borderline-high` | 邊緣偏高 | Borderline high | 1 |
| 總膽固醇 total | ≥240 | `high` | 偏高 | High | 2 |
| LDL | <100 | `optimal` | 最佳 | Optimal | 0 |
| LDL | 100–129 | `near-optimal` | 接近或略高於最佳 | Near or above optimal | 1 |
| LDL | 130–159 | `borderline-high` | 邊緣偏高 | Borderline high | 2 |
| LDL | 160–189 | `high` | 偏高 | High | 3 |
| LDL | ≥190 | `very-high` | 很高 | Very high | 4 |
| HDL | <40 | `low` | 偏低 | Low | 2 |
| HDL | 40–59 | `normal` | 正常 | Normal | 0 |
| HDL | ≥60 | `high` | 偏高 | High | 0 |
| 三酸甘油脂 triglycerides | <150 | `normal` | 正常 | Normal | 0 |
| 三酸甘油脂 triglycerides | 150–199 | `borderline-high` | 邊緣偏高 | Borderline high | 1 |
| 三酸甘油脂 triglycerides | 200–499 | `high` | 偏高 | High | 2 |
| 三酸甘油脂 triglycerides | ≥500 | `very-high` | 很高 | Very high | 3 |

註：ATP III 原表只命名 HDL 的 `<40 Low` 與 `≥60 High` 兩端，40–59 中段未命名；本規格將 40–59 釘版為 `normal`／正常（常見臨床用法，如 MedlinePlus 將 40–59 mg/dL 列為正常範圍），屬本規格的標籤決定，非 ATP III 原文，見 AUTHOR-CHECK.md。ATP III 代謝症候群判準另用男性 <40／女性 <50 的 HDL 切點；本工具不問性別，一律採用上表分類表的單一 <40 切點，見 AUTHOR-CHECK.md。HDL ≥60 在 ATP III 視為「負向危險因子」（具保護性），頁面須在 HDL 為 `high` 時附註此說明，不得把 HDL 偏高寫成需要擔心的異常。

3. 非 HDL 膽固醇 `nonHdl = total − hdl`（整數減法，無捨入，結果必為正整數，因 total ≥ 1 且 hdl ≤ 9999 時 total − hdl 可能 ≤ 0——若結果 ≤ 0，仍如實顯示該整數，不另報錯；分級表不對 nonHdl 分級）。nonHdl 只作參考顯示。
4. 整體摘要 `overallRank = max(四項 severity)`，對照下表：

| overallRank | overall label | zh | en |
| --- | --- | --- | --- |
| 0 | `all-desirable` | 四項數值皆在理想範圍 | All four values are in the desirable range |
| 1 | `borderline` | 部分數值為邊緣值，建議追蹤 | Some values are borderline — consider follow-up testing |
| ≥2 | `needs-attention` | 有一項以上數值需要注意，建議諮詢醫師 | One or more values need attention — consider consulting a physician |

5. 結果形狀（`values` 為解析後的整數；`classifications` 依 total、ldl、hdl、triglycerides 順序）：

```json
{
  "ok": true,
  "result": {
    "values": {"total": 180, "ldl": 90, "hdl": 65, "triglycerides": 120},
    "classifications": {
      "total": {"band": "desirable", "severity": 0},
      "ldl": {"band": "optimal", "severity": 0},
      "hdl": {"band": "high", "severity": 0},
      "triglycerides": {"band": "normal", "severity": 0}
    },
    "nonHdl": 115,
    "overall": {"rank": 0, "label": "all-desirable"}
  }
}
```

6. 釘版聲明（原文，頁面與報告皆須逐字呈現，不得改寫、縮寫或只顯示其中一種語言）：

- zh：「本工具僅供參考，不能取代專業醫療建議、診斷或治療。如有疑問，請諮詢醫師或合格醫療人員。」
- en："This tool is for reference only and is not a substitute for professional medical advice, diagnosis, or treatment. If you have questions, consult a physician or qualified healthcare professional."

另須在 FAQ 註明：ATP III 分級以空腹血脂檢查（9–12 小時空腹）為前提，三酸甘油脂最受進食影響；非空腹數值僅供參考。

固定下載 `cholesterol-checker-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/cholesterol-checker/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。
- 分級表以字面常數寫進核心，不得由外部載入；整數運算只用 Number 安全整數，無浮點、無捨入、無時區依賴。nonHdl 為整數減法。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「查詢分級」，畫面和完整報告符合核心 fixtures，使用者取得對應產物；四項分級、非 HDL、整體摘要與釘版聲明皆正確呈現。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據；每個分級切點的上下 1 mg/dL 皆有覆蓋。 |
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
| `all-desirable` | 四項皆理想，nonHdl 115，整體 all-desirable |
| `borderline-mixed` | 混合邊緣值，整體 needs-attention（LDL 邊緣偏高 severity 2） |
| `high-risk` | 四項皆差，LDL 很高，整體 rank 4 |
| `boundary-just-below` | 全部切點下 1：199/99/59/149，整體 rank 0 |
| `boundary-just-at` | 全部切點正好：200/100/40/150，整體 rank 1 |
| `boundary-top` | 全部切點上界：240/190/60/500，整體 rank 4 |
| `boundary-mid` | 239/129/39/199：HDL 偏低 severity 2 決定整體 |
| `ldl-high-only` | 僅 LDL 偏高（160），其餘理想 |
| `tg-high-only` | 僅三酸甘油脂偏高（499），其餘理想 |
| `decimal-total` | 小數總膽固醇不接受，INTEGER_FORMAT |
| `zero-total` | 總膽固醇 0，RANGE |
| `too-large-tg` | 三酸甘油脂 10000，RANGE |
| `empty-hdl` | HDL 空白，EMPTY |
| `input-limit-total` | 總膽固醇 6 位數，INPUT_LIMIT |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證每個分級切點的 ±1 mg/dL、nonHdl = total − hdl、整體 rank 取四項 severity 最大值、HDL ≥60 顯示保護性附註。所有已接受的值皆在 1–9999 內。

候選 gate（均 NOT_RUN）

- 於 `tools/cholesterol-checker/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「膽固醇分級」，title「膽固醇分級｜Gloss Tools」，description「輸入健檢報告上的總膽固醇、LDL、HDL 與三酸甘油脂，對照 NCEP ATP III 分級表，逐項查看分級與整體摘要。僅供參考，非醫療建議。」。英文 lang=en，H1 “Cholesterol Checker”，title “Cholesterol Checker | Gloss Tools”，description “Enter total cholesterol, LDL, HDL and triglycerides from a lab report and see each value classified against the NCEP ATP III table, with an overall summary. For reference only — not medical advice.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。分級表是哪一套標準？NCEP ATP III（美國 National Cholesterol Education Program），數值單位為 mg/dL。 / Which standard is used? NCEP ATP III (U.S. National Cholesterol Education Program); values are in mg/dL.
- FAQ。為什麼 HDL 偏高是好事？ATP III 將 HDL ≥60 mg/dL 視為「負向危險因子」，具保護性；偏低（<40）才需要注意。 / Why is high HDL good? ATP III treats HDL ≥60 mg/dL as a “negative” risk factor — protective; low HDL (<40) is the concern.
- FAQ。需要空腹抽血嗎？ATP III 分級以 9–12 小時空腹血脂檢查為前提，三酸甘油脂最受進食影響；非空腹數值僅供參考。 / Do I need to fast? The ATP III classification assumes a 9–12 hour fasting lipid profile; triglycerides are most affected by eating.
- FAQ。這是診斷嗎？不是。本工具僅供參考，不能取代專業醫療建議、診斷或治療。 / Is this a diagnosis? No. This tool is for reference only and is not a substitute for professional medical advice, diagnosis, or treatment.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://cholesterol-checker.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線以開工時遠端最新 `codex/initial-publication` 為準（本分支基於 `c8ca5fd3`）。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/cholesterol-checker/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

# 心率區間計算機 / Heart Rate Zones Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-heart-rate-zones-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

跑者或騎行者要把心率區間填進手錶或訓練 app 時，先確認該用哪個最大心率估算、五個區間各自的整數 bpm 上下限，以及用靜止心率校正後的儲備心率區間。

- 行動。手機在健身房或出門前，輸入年齡與手錶量到的靜止心率，讀取兩張區間表照填設定。
- 桌面。桌機比對 Fox 與 Tanaka 兩種估算差多少，並核對實測最大心率覆蓋後區間如何移動。

使用情境為運動訓練設定。資料只保留在目前頁面草稿。最大心率是公式估算，個人實際值可能不同；結果不是醫療建議（固定聲明文字見 inputsOutputs）。

## scope

MVP 必做：年齡 → Fox 與 Tanaka 兩種最大心率（同時顯示、Tanaka 為區間基準）；實測最大心率覆蓋估算；五區 %HRmax 表（帶別 50–60／60–70／70–80／80–90／90–100%）；有靜止心率時的 Karvonen %HRR 表（同帶別、同覆蓋後最大心率）。非目標為連接手錶／心率帶／健康平台、即時心率、訓練紀錄與課表、配速或功率換算、醫療診斷。

已比對本 repo 既有規格與來源快照，無既有工具計算心率區間。最相近者的實質差異如下。

- 以體重、身高與活動量算 BMI 與每日熱量需求。此處以年齡與靜止心率算最大心率與區間 bpm，不算熱量。`docs/specs/bmi-tdee-calculator/`
- 以距離與時間算跑步配速。此處不輸入距離或時間，輸出的是心率上下限。`docs/specs/running-pace-calculator/`
- 以睡眠週期算就寢／起床時間。此處與睡眠時間無關。`docs/specs/sleep-cycle-calculator/`

判定規則由本文定義（公式出處見 inputsOutputs），無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，固定聲明文字常駐結果區下方、不需展開。

- 欄位或說明「年齡 / Age」
- 欄位或說明「實測最大心率（選填） / Measured maximum heart rate (optional)」
- 欄位或說明「靜止心率（選填） / Resting heart rate (optional)」
- 「計算心率區間 / Calculate heart rate zones」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「最大心率摘要 / Maximum heart rate summary」先列 Fox、Tanaka 與實際採用值及來源，再列「心率區間（% 最大心率） / Heart rate zones (% of maximum)」五列表與「儲備心率區間（Karvonen） / Heart rate reserve zones (Karvonen)」五列表。未提供靜止心率時不顯示 Karvonen 表，改顯示固定說明「未提供靜止心率，無法計算儲備心率區間 / Resting heart rate not provided, so reserve zones cannot be calculated.」。結果不提供下載或複製按鈕。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。編輯終止舊工作並回 dirty。 |
| success | 兩張（或一張加說明）結果表對應目前快照，附固定聲明文字。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"age":"","measuredMaxHr":"","restingHr":""}` 並聚焦首來源欄（年齡）。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

- 三欄皆為表單原始字串，空字串代表未填：`age`、`measuredMaxHr`、`restingHr`。已填欄位須為 ASCII 十進整數字串，0 或非零開頭，無空白／符號／小數／指數；全形數字等非 ASCII 數字不做正規化、直接視為文法錯誤。raw 每欄最多 8 字元。
- 範圍：age 10–100（歲，整數）；measuredMaxHr 100–230（bpm，整數）；restingHr 30–120（bpm，整數）。
- 來源規則：measuredMaxHr 有填時優先採用（source="measured"），不論 age 是否有填；未填時以 Tanaka 估算（source="tanaka"），此時 age 必填。restingHr 未填時 Karvonen 表為 null，不做靜止心率相關的跨欄檢查。

驗證順序固定。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名（對應 JSON Pointer `/age`、`/measuredMaxHr`、`/restingHr`）或 null，row 恆為 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. SCHEMA：input 不是恰含三欄字串的普通物件（未知欄、缺欄、錯型別、accessor）→ SCHEMA，field=null。
2. 逐欄驗證，順序 age → measuredMaxHr → restingHr。每欄先容量：raw 長度 >8 → INPUT_LIMIT。再文法：非空字串不符合整數字串文法 → INTEGER_FORMAT。再範圍：數值超出該欄範圍 → RANGE。空字串欄位跳過文法與範圍（視為未填），但容量仍先檢查。已填但不合法的欄位即使最終不被採用（例如有 measuredMaxHr 時的 age）仍照此順序報錯。
3. 跨欄一：age 與 measuredMaxHr 皆未填 → EMPTY，field="age"。
4. 跨欄二：先依下文算出採用最大心率 used。若 restingHr 有填且 restingHr ≥ used → RESTING_NOT_BELOW_MAX，field="restingHr"。

計算全程用整數十分位（tenths）算術，不用浮點：百分比 p 的十分位記為 p10 ∈ {5,6,7,8,9,10}。捨入一律四捨五入（round half-up，正值即 floor(x+0.5)）。

1. Fox 最大心率：age 有填時 fox = 220 − age；未填時 fox = null。
2. Tanaka 最大心率：age 有填時，十分位 T10 = 2080 − 7×age（即 208 − 0.7×age 的十倍，恆為正），tanaka = floor((T10 + 5) / 10)；未填時 tanaka = null。例：age 35 → T10 = 1835 → tanaka = 184。
3. 採用值：used = measuredMaxHr 有填時其值，否則 tanaka。
4. %HRmax 區間邊界：對每個 p10，邊界 b(p10) = floor((p10×used + 5) / 10)。區間 k（1–5）的 pctLow = (k+4)×10、pctHigh = (k+5)×10；lowBpm：k=1 時為 b(5)，其餘為 b(k+4)+1；highBpm = b(k+5)。b(10) 恆等於 used。此「共享邊界 +1」規則保證五區連續、無縫隙、無重疊，完整覆蓋 [b(5), used]。
5. Karvonen（restingHr 有填時）：reserve = used − restingHr（由跨欄二保證 >0）。邊界 t(p10) = restingHr + floor((p10×reserve + 5) / 10)；區間上下限規則同上（k=1 下限為 t(5)，其餘為 t(k+4)+1；上限為 t(k+5)），t(10) 恆等於 used。restingHr 未填時 karvonen = null。

結果 `{maxHr:{fox,tanaka,used,source}, zones:[{zone,pctLow,pctHigh,lowBpm,highBpm} 共五筆，zone 1–5 固定順序], karvonen: null 或 {restingHr, reserve, zones:[同形五筆]}}`。機器值不隨 locale 改，不輸出任何浮點數。

區間名稱與用途為固定雙語文案（UI 與結果表逐字使用，不由核心輸出）：

| 區間 | 帶別 | 名稱（zh／en） | 用途（zh／en） |
| --- | --- | --- | --- |
| Z1 | 50–60% | 恢復區／Recovery | 非常輕鬆，可完整交談；暖身與主動恢復。／Very light; you can hold a full conversation; warm-up and active recovery. |
| Z2 | 60–70% | 脂肪燃燒區／Fat Burn | 輕鬆有氧；建立耐力基礎，可長時間維持。／Easy aerobic effort; builds the endurance base and can be held for a long time. |
| Z3 | 70–80% | 有氧區／Aerobic | 中等強度；提升心肺適能，呼吸加快但可說短句。／Moderate effort; improves cardiorespiratory fitness; breathing quickens but short phrases are possible. |
| Z4 | 80–90% | 閾值區／Threshold | 辛苦；接近乳酸閾值，提升速度耐力，只能說單字。／Hard effort near the lactate threshold; improves speed endurance; only single words are possible. |
| Z5 | 90–100% | 最大強度區／Maximum | 非常辛苦；短時間間歇與無氧能力，無法交談。／Very hard effort for short intervals and anaerobic capacity; conversation is impossible. |

固定聲明文字（結果區逐字顯示）：「本工具以公式估算最大心率，個人實際值可能不同；結果僅供運動參考，不是醫療建議。如有心血管疾病或身體不適，請先諮詢醫師。／Maximum heart rate here is a formula estimate; your actual value may differ. Results are for exercise reference only and are not medical advice. If you have a cardiovascular condition or feel unwell, consult a doctor first.」

公式出處：Fox 公式 220 − age 為傳統估算；Tanaka 公式 208 − 0.7 × age 出自 Tanaka, Monahan & Seals (2001), "Age-predicted maximal heart rate revisited", Journal of the American College of Cardiology 37(1)。Karvonen 法以心率儲備（最大心率 − 靜止心率）乘帶別百分比再加回靜止心率。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/heart-rate-zones/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確執行才計算，不假造進度條以外的非同步行為。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算心率區間」，兩張區間表與摘要符合核心 fixtures，使用者取得對應結果。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、resting ≥ used 錯誤和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤和修改可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker 和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。7 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `tanaka-fractional` | 年齡 35，Tanaka 原值 183.5 小數，四捨五入為 184 後算區間 |
| `karvonen-basic` | 年齡 40、靜止 60，Fox 與 Tanaka 同值 180，兩張表並列 |
| `measured-override` | 實測 172 覆蓋公式估算，兩張表改以 172 計算 |
| `override-only` | 無年齡僅實測 190，fox/tanaka 為 null，Karvonen 邊界含 .5 四捨五入 |
| `resting-not-below-max` | 靜止 115 ≥ 採用最大 110，回 RESTING_NOT_BELOW_MAX |
| `age-range` | 年齡 9 低於下限 10，回 RANGE |
| `missing-max-source` | 年齡與實測皆未填，回 EMPTY |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與結果可見性。

另測合法上限（age 100、measuredMaxHr 230、restingHr 120 與 30）、剛好超限（age 101、measuredMaxHr 99 與 231、restingHr 29 與 121）、錯型別、額外欄、全形數字字串、惡意字串、快速改值及晚到訊息。驗證 restingHr == used 與 used−1 兩側、Tanaka 十分位恰為 .5 的年齡（如 35、45）、五區在任一合法輸入下恆連續無縫（zone k 上限 +1 = zone k+1 下限，Z5 上限 = used）。

候選 gate（均 NOT_RUN）

- 於 `tools/heart-rate-zones/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「心率區間計算機」，title「心率區間計算機｜Gloss Tools」，description「輸入年齡與靜止心率，用 Tanaka 公式估算最大心率，算出五個心率區間與 Karvonen 儲備心率區間。估算值因人而異，非醫療建議。」。英文 lang=en，H1 “Heart Rate Zones Calculator”，title “Heart Rate Zones Calculator | Gloss Tools”，description “Estimate maximum heart rate with the Tanaka formula and get five heart-rate zones plus Karvonen reserve zones from your age and resting heart rate. Estimates vary by person; not medical advice.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。為什麼有兩個最大心率公式？Fox（220 − 年齡）較舊、誤差較大；Tanaka（208 − 0.7 × 年齡）來自較新的研究，本工具以 Tanaka 計算區間，Fox 僅供對照。 / Why two maximum heart-rate formulas? The Fox formula (220 − age) is older and less accurate; the Tanaka formula (208 − 0.7 × age) comes from newer research. This tool calculates zones with Tanaka and shows Fox for comparison only.
- FAQ。有實測最大心率時怎麼辦？填入「實測最大心率」後會優先於公式估算，兩張區間表都改以實測值計算，年齡可不填。 / What if I have a measured maximum heart rate? Enter it as the measured maximum heart rate; it takes precedence over the formula estimates, both zone tables are calculated from it, and age may be left blank.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://heart-rate-zones.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

規格 task id `labs-heart-rate-zones-spec-20261109`（由主代理登記，本文作者未執行 registry 操作）。非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/heart-rate-zones/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

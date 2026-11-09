# 冷氣噸數計算機 / AC Capacity Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-ac-capacity-calculator-20261109` · 2026-11-09 · v1

[本組固定任務說明](../../consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者在台灣買冷氣前，先依房間大小與條件估出真正該看的冷房能力（kW），而不是只聽通路的「幾噸」。

- 桌面。沙發上拿手機或筆電比電商頁，輸入建商資料的 m² 或自己量的坪數，勾西曬、頂樓等條件，取得建議機型級距再回去比價。
- 行動。賣場現場店員報「噸數」時，當場換算成 kW 對照機型標示的冷房能力，判斷建議是否合理。

使用情境為購買前估算。資料只保留在目前頁面草稿。成功結果是所需 kcal/h、BTU/h、kW 與建議機型級距；噸數僅為標明出處的通路慣例估算。

## scope

單一房間、固定基準與加成、固定換算與機型級距表的估算模型。非目標為實際安裝評估、多房間或整戶規劃、挑高／隔間／窗面積實測修正、品牌型號與價格比較、能效等級（CSPF）與電費試算、變頻負載曲線、把噸數當工程單位。

已比對本 repo 既有規格與工具，最相近者的實質差異如下，本案非重複。

- electricity-cost-calculator 由用電量與費率級距計算電費；此處由房間條件反推需要的冷房能力，不算電費。
- 本站無既有冷房能力或冷氣選型工具；與體感溫度、坪數換算等泛用換算也不同，此處是含加成規則與機型級距推薦的完整選型估算。

判定規則由本文定義，無線上資料或外部服務依賴。基準與慣例的出處逐項寫在 inputsOutputs，不留給製作者查證。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「面積單位與面積 / Size unit and area」：單位二選一（坪／m²），面積為小數輸入。
- 欄位或說明「人數 / Occupants」：整數，預設 2。
- 欄位或說明「西曬、頂樓、大面落地窗、廚房相鄰／熱源 / West-facing sun, top floor, large windows, kitchen / heat source」：四個獨立開關，預設全關。
- 「計算冷房能力 / Calculate required capacity」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「建議機型與所需能力 / Recommended model size and required capacity」先摘要再列細節：先顯示建議機型級距（kW）與次一級，其次所需 kcal/h、BTU/h、kW、噸數（附慣例註記，見 tests 固定字串），再列計算明細（換算後坪數、基準 kcal/h、加成總 % 與逐項加成）。精確 kW 超過最大級距時改顯示超界說明（固定字串），不顯示建議機型。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果區含慣例註記；超界時含超界說明。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"sizeUnit":"ping","area":"10","occupants":"2","westSun":"false","topFloor":"false","largeWindows":"false","kitchenHeat":"false"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field 即欄位名、row 恆 null（本工具無列）。JSON fixture 即介面。輸入全為表單 raw 字串，沒有自由文字欄位，使用者內容不被回顯為標記。

欄位與文法（raw 每欄最多 8 code units）：

| 欄位 | 型別與文法 | 範圍／列舉 | 預設 |
| --- | --- | --- | --- |
| `sizeUnit` | 字串列舉 `"ping"`／`"m2"` | — | `"ping"` |
| `area` | 十進小數字串 `^(0\|[1-9][0-9]*)(\.[0-9]{1,2})?$`，整數部份不帶前導零（除 `"0"` 本身），小數至多兩位，無空白／符號／指數 | 坪：0.5–300；m²：1–1000（以輸入單位檢查） | `"10"` |
| `occupants` | 整數字串 `^(0\|[1-9][0-9]*)$` | 1–30 | `"2"` |
| `westSun` | 字串列舉 `"true"`／`"false"` | — | `"false"` |
| `topFloor` | 字串列舉 `"true"`／`"false"` | — | `"false"` |
| `largeWindows` | 字串列舉 `"true"`／`"false"` | — | `"false"` |
| `kitchenHeat` | 字串列舉 `"true"`／`"false"` | — | `"false"` |

驗證順序固定。先物件形狀（SCHEMA），再依 sizeUnit、area、occupants、westSun、topFloor、largeWindows、kitchenHeat 逐欄驗證；每欄依序：容量 INPUT_LIMIT（raw 超過 8 單元）、不成對 surrogate UNICODE、缺內容 EMPTY（空字串）、文法（列舉欄 ENUM、area DECIMAL_FORMAT、occupants INTEGER_FORMAT）、範圍 RANGE。第一個失敗即整份失敗，回 `{ok:false,error:{code,field,row:null}}`。無跨欄檢查。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算管線（精確有理數運算，核心不得用浮點數；所有量非負，捨入皆四捨五入 half-up，每個輸出只在自己的步驟由精確值捨入一次，`round_d(x) = floor(x·10^d + 1/2) / 10^d` 以 BigInt 計）：

1. 面積轉整數百分位 A。坪數精確值 ping：單位坪時 A/100；單位 m² 時 A×50/16529（即 ÷3.3058，固定除數 **1 坪 = 3.3058 m²**）。
2. 基準負荷 baseKcal = ping × **500 kcal/h**（台灣住宅通路慣例基準，本文固定值）。
3. 加成總百分比 pct（整數）= 西曬 10 + 頂樓 15 + 大面落地窗 10 + 廚房相鄰／熱源 10 + 3×max(0, occupants−2)，只計開啟項。加成採**加法疊加於基準**，固定不用連乘（multiplicative）疊加。人數 ≤2 不加成，不倒扣。
4. 所需精確值 requiredKcal = baseKcal × (100+pct)/100。以下輸出全部由精確值出發，不用已捨入的中間值：
   - `ping`：ping 捨入至 2 位小數的字串。
   - `baseKcalH`：baseKcal 捨入至整數。
   - `adjustmentPct`：pct 本身（整數）。
   - `requiredKcalH`：requiredKcal 捨入至整數（kcal/h）。
   - `requiredBtuH`：requiredKcal × **3.968** 捨入至整數（BTU/h；固定係數 1 kcal = 3.968 BTU）。
   - `requiredKw`：requiredKcal ÷ **860** 捨入至 2 位小數的字串（kW；固定除數 1 kW = 860 kcal/h）。
   - `tonnageRuleOfThumb`：requiredKcal ÷ **2500** 捨入至 1 位小數的字串。慣例固定為「台灣家電通路慣例：1 噸 ≈ 2,500 kcal/h」，僅為概算標示（見下「噸的約定」）。
   - 機型推薦：級距表固定為 kW `[2.2, 2.8, 3.6, 4.5, 5.0, 6.3, 7.1, 8.0, 9.0, 10.0]`（台灣市場常見分離式機型冷房能力級距）。`recommendedModelKw` = 級距中 ≥ **精確未捨入 kW** 的最小一級（1 位小數字串；比較禁用 `requiredKw` 的已捨入顯示值）；`nextModelKw` = 其次一級，無次一級（建議為 10.0）時 null。精確 kW > 10.0 時兩者皆 null 且 `modelOverRange` = true；其餘情形 `modelOverRange` = false。
5. 結果物件欄位恰為 `{ping, baseKcalH, adjustmentPct, requiredKcalH, requiredBtuH, requiredKw, tonnageRuleOfThumb, recommendedModelKw, nextModelKw, modelOverRange}`，不增減。

噸的約定（固定，不留替代）。台灣冷氣「噸」無單一定義，本規格只採一種並明示：**通路慣例估算 1 噸 ≈ 2,500 kcal/h**，定位為參考標示，主要輸出永遠是 kW 與機型級距。明示不採用：冷凍噸 1 RT = 3,024 kcal/h = 12,000 BTU/h（冷凍工程單位，非家用冷氣通路慣例）；通路對照表「噸 ≈ kW × 0.355」一類混合約定的推導近似（來源不一，與本管線並存會自相矛盾）。結果區每次都附 tests 節固定的慣例註記字串，提醒以 kW 選型並與安裝廠商確認。

固定下載 `ac-capacity-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。機器值不隨 locale 改；小數字串恆用 `.` 與固定位數（ping 2 位、kW 2 位、噸 1 位、機型 1 位），不省略尾零。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/ac-capacity-calculator/`。src/core.mjs 放純驗證、推導、格式化（精確管線全程 BigInt 有理數：面積以百分位整數、3.3058 以 16529/50 的倒數關係、3.968 以 3968/1000、860 與 2500 為整數除數；最終整數輸出亦為小安全整數，小數字串由商與餘數拼出，不經浮點）。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算冷房能力」，畫面和完整報告符合核心 fixtures，建議機型、次一級與慣例註記齊備。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、精確 kW 恰等於級距、顯示捨入與精確值分歧（`exact-vs-rounded-model`）和超界（>10.0 kW）三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。9 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `plain-ping` | 坪直接輸入、無加成，500 kcal/h/坪 基準全管線 |
| `m2-conversion` | m² ÷3.3058 換算，中間值不先捨入（BTU 與坪直入案差 1） |
| `topfloor-westsun` | 頂樓 +15% 與西曬 +10% 與人數加成加法疊加 |
| `exact-vs-rounded-model` | 精確 kW 2.8023… 顯示 2.80，機型仍取 3.6（比較用精確值） |
| `all-adjustments-overrange` | 落地窗／廚房／人數疊加後精確 kW >10.0，建議為 null 並標超界 |
| `boundary-exact-model` | 精確 kW 恰 5.00，建議即 5.0 級距本身 |
| `area-below-min` | 坪 0.4 低於下限，RANGE／area |
| `area-three-decimals` | 面積三位小數，DECIMAL_FORMAT／area |
| `unit-not-listed` | 單位列舉外，ENUM／sizeUnit |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限（坪 300、m² 1000、人數 30）、剛好超限（坪 300.01、人數 31、面積 9 位 raw）、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證加成不連乘（全開 + 人數 30 時 pct = 45 + 84 = 129 上限）、人數 1–2 不倒扣、精確 kW 恰 10.0 時建議 10.0 且 next 為 null、精確 kW 略大於 10.0 時超界。所有已接受的結果中，建議級距恆 ≥ 精確 kW，移除任一加成後所需值不會變大。

候選 gate（均 NOT_RUN）

- 於 `tools/ac-capacity-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「冷氣噸數計算機」，title「冷氣噸數計算機｜Gloss Tools」，description「依坪數與西曬、頂樓、落地窗、廚房熱源、人數估算冷氣所需的冷房能力（kcal/h、BTU/h、kW），對照常見機型級距給建議；噸數為台灣通路慣例估算。」。英文 lang=en，H1 “AC Capacity Calculator”，title “AC Capacity Calculator | Gloss Tools”，description “Estimate the cooling capacity a room needs (kcal/h, BTU/h, kW) from its size in ping or square metres plus west sun, top floor, large windows, kitchen heat and occupants, and match it to common model sizes; tonnage is a Taiwan retail rule of thumb.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- 慣例註記（結果區固定顯示）。噸數依台灣家電通路慣例 1 噸 ≈ 2,500 kcal/h 估算，僅供參考；請以冷房能力 kW 選型，並與安裝廠商確認。 / Tonnage uses the Taiwan retail rule of thumb 1 ton ≈ 2,500 kcal/h and is indicative only. Choose by cooling capacity in kW and confirm with your installer.
- 超界說明（`modelOverRange` 時固定顯示）。所需能力超過常見單機最大級距（10.0 kW），請考慮分區多台或請安裝廠商評估。 / The required capacity exceeds the largest common single-unit size (10.0 kW); consider multiple units by zone or ask an installer to assess.
- FAQ。一定要買到建議級距嗎？建議級距是大於等於所需 kW 的最小常見機型；小一級在高溫日可能不夠冷。 / Do I have to buy the recommended size? It is the smallest common model size at or above the required kW; one size smaller may struggle on the hottest days.
- FAQ。為什麼不用冷凍噸換算？冷凍噸（1 RT = 3,024 kcal/h）是冷凍工程單位；台灣冷氣通路的「噸」是慣例估算，本頁噸數以 1 噸 ≈ 2,500 kcal/h 標示，選型請看 kW。 / Why not convert with the refrigeration ton? One refrigeration ton (3,024 kcal/h) is a refrigeration-engineering unit; the air-conditioner “ton” in Taiwan retail is a rule of thumb — here 1 ton ≈ 2,500 kcal/h — so size by kW instead.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://ac-capacity-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。規格任務 `labs-ac-capacity-calculator-spec-20261109`（由主代理登記，作者未執行 registry 指令）。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/ac-capacity-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

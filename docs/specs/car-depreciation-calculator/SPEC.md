# 車輛折舊計算 / Car Depreciation Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-car-depreciation-calculator-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

想買二手車或賣車的人，手上只有新車購入價和車齡，想先粗估這台車現在大概還值多少、每年掉了多少錢，再拿去對照行情與議價。

- 桌面。桌機上輸入購入價與年數，逐年核對估值曲線落在哪一年碰到殘值下限。
- 行動。手機在車行現場輸入業務報的車價與年式，當場換算三種模型的估值比較。

估值僅供規劃參考，不是正式鑑價；實際市場價值受車況、里程、事故紀錄、市場供需與地區影響（估值揭露原文常駐結果旁，見 userFlow）。資料只保留在目前頁面草稿。

## scope

MVP 必做：三種折舊模型（定率遞減 `declining`、直線法 `straight`、逐年費率表 `table`）、殘值下限（三種模型皆生效）、逐年明細表（長度＝年數欄）、目前估值與累計折舊、固定報告下載。金額一律整數新臺幣（NT$），不出現小數金額。

非目標：即時行情或二手車資料庫查詢、依品牌／車型／里程／車況／事故調整估值、貸款／牌照稅／燃料費計算、通貨膨脹調整、把估值當正式鑑價、買賣媒合或成交保證。

已與本 checkout 的 101 份預案比對，最相近者的實質差異如下。

- 燃料成本試算。此處算的是資產價值隨年遞減，不是持有期間的油錢支出。 [fuel-cost-calculator](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/docs/specs/fuel-cost-calculator/SPEC.md)
- 房貸攤還與複利試算。此處沒有借貸、利率或還款，逐年表是折舊不是攤還。 [mortgage-amortization](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/docs/specs/mortgage-amortization/SPEC.md)

概念備註（run 5 概念 #27）原文把費率表寫在定率遞減之內；本次任務書明定三種模型並列：定率遞減採單一固定年率，費率表是第三種獨立模型（逐年可編輯費率）。本文件依任務書釘版三模型，並在 [AUTHOR-CHECK.md](AUTHOR-CHECK.md) 記錄此對照。預設費率表（20/18/15/12/10/8/8/6/6/5%）是常見二手車經驗法則的示意值，不是官方或鑑價機構的估值標準（揭露原文見 userFlow）。判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「計算方式 / Method」：三選一（定率遞減／直線法／逐年費率表）。切換方式只顯示該方式的專屬欄位，其餘專屬欄位保留草稿值但不送入核心（核心輸入形狀見 inputsOutputs）。
- 欄位或說明「購入價（新臺幣）／ Purchase price (NT$)」「年數／ Years」「殘值下限（%）／ Salvage floor (%)」為三種方式共通。
- 方式專屬欄位：定率遞減顯示「年折舊率（%）／ Annual rate (%)」；直線法顯示「直線攤提年數／ Straight-line life (years)」；費率表顯示「逐年折舊率（%，每行一年）／ Yearly rates (%, one per line)」多行輸入，預填預設表。
- 「計算折舊／ Calculate depreciation」是主要操作。「載入範例／ Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例（`declining-basic`）對應欄位，其餘欄位維持預設，明示範例並等待手動執行。
- 「目前估值與累計折舊／ Current value and total depreciation」先摘要（含殘值下限金額與首次達下限年份），再列逐年表：年次、當年費率（直線法顯示 —）、當年折舊額、年末估值；碰到下限的列以文字及符號標示「已達殘值下限／ At salvage floor」，不用顏色單獨傳達。長表在有 label 的區域捲動（年數上限 30 列，不分頁，完整匯出不截斷）。
- 估值揭露常駐結果旁，原文釘版：「本工具的估算僅供規劃參考，不是正式鑑價；車輛實際市場價值受車況、里程、事故紀錄、市場供需與地區影響，請以專業鑑價或實際成交行情為準。」／ “Estimates from this tool are for planning only and are not a formal appraisal. A vehicle's actual market value depends on its condition, mileage, accident history, market supply and demand, and region; rely on a professional appraisal or actual transaction prices.”
- 費率表方式另常駐經驗法則揭露，原文釘版：「預設逐年折舊率表（第 1–10 年：20%、18%、15%、12%、10%、8%、8%、6%、6%、5%）是常見的二手車經驗法則示意值，不是官方或鑑價機構的估值標準。」／ “The default year-by-year rate table (years 1–10: 20%, 18%, 15%, 12%, 10%, 8%, 8%, 6%, 6%, 5%) is an illustrative common used-car rule of thumb, not an official or appraisal-industry valuation standard.”
- 成功才顯示「下載報告／ Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行／ Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中／ Working」及「取消／ Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。逐年表可為零列（年數 0），摘要有說明。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行／ Cancelled. You can run again.」。舊結果仍無效。 |

「重設／ Reset」停止工作，復原預設 `{"method":"declining","price":"880000","years":"5","salvagePercent":"10","rate":"15","usefulLife":"10","tableRates":"20\n18\n15\n12\n10\n8\n8\n6\n6\n5"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes（本工具無檔案欄）。

欄位形狀依 `method` 而定。共通欄位恆有：`method`、`price`、`years`、`salvagePercent`。方式專屬欄位恰一：`declining` 用 `rate`；`straight` 用 `usefulLife`；`table` 用 `tableRates`。出現其他方式的專屬欄位、或所選方式的專屬欄位缺漏，皆 SCHEMA（在 method 驗證通過後判定）。控制層草稿恆保留全部七欄（字串）；執行時依目前 method 組出恰含五欄的核心輸入。

- `method`：ASCII 字串，恰為 `declining`、`straight`、`table` 之一，否則 ENUM。raw 最多 9 單元。
- `price`：購入價，整數新臺幣。ASCII 十進整數字串，0 或非零開頭，無空白／符號／小數／指數，raw 最多 9 單元。範圍 1–999,999,999。
- `years`：逐年表年數（即車齡），整數字串同上文法，raw 最多 2 單元。範圍 0–30。0 合法：逐年表零列，目前估值＝購入價。
- `salvagePercent`：殘值下限占購入價百分比。小數字串：整數部 0 或非零開頭，可帶 `.` 加 1–2 位小數，無空白／符號／指數，raw 最多 5 單元。範圍 0–50。
- `rate`（declining）：年折舊率百分比，小數字串同上，raw 最多 5 單元。範圍 0–90。
- `usefulLife`（straight）：直線攤提年數，整數字串，raw 最多 2 單元。範圍 1–30。
- `tableRates`（table）：多行字串，以 LF 分行，一行一個年折舊率百分比（小數字串同上）。整體 raw 最多 256 單元。行數 1–30（超過 ROW_LIMIT）；單一行尾的 LF 不產生額外空行，其餘空行視為該行格式錯誤。逐行範圍 0–90。逐年表第 k 年用第 k 行費率；行數少於 `years` 時，最後一行的費率重複套用到其餘年份（釘版）。行數多於 `years` 時，超出部分不使用（仍逐行驗證）。

預設值即上文重設字串。驗證與計算順序（釘版）：

1. SCHEMA：input 須為普通物件、只讀 own data；鍵集合先對聯集 {method, price, years, salvagePercent, rate, usefulLife, tableRates} 檢查，多出聯集外的鍵即 SCHEMA；共通欄位缺漏或任一值非字串即 SCHEMA。
2. 依 method、price、years、salvagePercent、方式專屬欄位的順序逐欄驗證。每欄先容量 INPUT_LIMIT、再未成對 surrogate UNICODE、再 EMPTY、再文法（method 為 ENUM；整數欄 INTEGER_FORMAT；小數欄 DECIMAL_FORMAT；tableRates 先 ROW_LIMIT 再逐行 DECIMAL_FORMAT），最後範圍 RANGE。`tableRates` 的文法／範圍錯誤帶 row（1-based 行號）；其餘錯誤 row=null，field 為欄位名。method 驗證通過後才檢查方式專屬欄位的存在性（SCHEMA），再驗其文法。
3. 整份失敗回 `{ok:false,error:{code,field,row}}`。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算（全部 BigInt 整數運算，無浮點；釘版）：

4. 百分比一律先轉成萬分率整數：小數字串的百分數值 ×100（即 15 → 1500、15.25 → 1525），記為 ph（percent-hundredths）。殘值下限金額 `floorValue = roundHalfUp(price × salvagePh, 10000)`，只算一次。`roundHalfUp(a, b) = (2a + b) / (2b)` 整數除法（a ≥ 0、b > 0，四捨五入、.5 進位）。
5. 逐年迭代（捨入鏈釘版：每一年的年末估值都由「前一年已捨入的年末估值」計算，不用未捨入的閉合式鏈）。第 k 年（k = 1..years），年初值 v：
   - declining：`raw = roundHalfUp(v × (10000 − ratePh), 10000)`，當年費率＝ ratePh。
   - table：當年費率＝第 min(k, 行數）行費率 ph，同式計算 raw。
   - straight：年攤提額 `annualDep = roundHalfUp(price − floorValue, usefulLife)` 只算一次；`raw = v − annualDep`，當年費率記 null。
   - `floored = raw < floorValue`；年末估值 `endValue = max(raw, floorValue)`；當年折舊額 `depreciation = v − endValue`。下一年以 endValue 為年初值。
6. 結果 `{method, floorValue, currentValue, totalDepreciation, totalDepreciationPercent, floorReachedYear, schedule}`。`currentValue` 為最後一年年末估值（years=0 時為 price）；`totalDepreciation = price − currentValue`；`totalDepreciationPercent` 為字串恰兩位小數：`pctPh = roundHalfUp(totalDepreciation × 10000, price)`，格式為整數部＋`.`＋兩位（例 "55.64"、"0.00"、"90.00")；`floorReachedYear` 為第一個年末估值等於 floorValue 的年份，無則 null（floorValue=price 時 years ≥ 1 第一年即達；years=0 為 null)。`schedule` 每列 `{year, ratePercent, depreciation, endValue, floored}`，`ratePercent` 為字串恰兩位小數（例 "15.00")，straight 為 null。金額皆為已驗證的非負安全整數（Number），內部計算用 BigInt 後轉回。機器值不隨 locale 改；顯示層千分位僅為呈現，不進報告。

固定下載 `car-depreciation-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/car-depreciation-calculator/`。src/core.mjs 放純驗證、推導、格式化（百分比轉萬分率、BigInt 逐年迭代、canonical 序列化）。src/controller.mjs 管草稿（七欄）、方式切換、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄（本工具無檔案欄，此項不適用仍照模板保留）。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算折舊」，三種方式的畫面和完整報告皆符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、費率表列號和三種 controller case 的證據。 |
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
| `declining-basic` | 定率遞減 15%、五年捨入鏈與累計百分比 |
| `table-default` | 預設費率表前五年、逐年不同費率 |
| `straight-basic` | 直線法固定年攤提額、ratePercent=null |
| `floor-hit-declining` | 高費率中途碰到殘值下限、floored 標記與達下限後折舊歸零 |
| `rounding-chain-pinned` | 小額連續捨入：捨入鏈結果 12，閉合式會給 11，釘版取鏈 |
| `years-zero` | 年數 0：空逐年表、估值＝購入價 |
| `table-repeat-last` | 費率行數少於年數，最後一行費率重複套用 |
| `straight-floor-before-life` | 直線法在攤提期滿當年恰達下限、之後兩年停留下限 |
| `rate-zero` | 費率 0：估值不變、折舊 0 |
| `salvage-half-cap` | 殘值下限 50% 上限邊界、第一年即達下限 |
| `price-zero-range` | 購入價 0 → RANGE |
| `rate-format-error` | 費率三位小數 → DECIMAL_FORMAT |
| `table-row-range` | 費率表第二行 95 → RANGE 帶 row=2 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、他方式專屬欄混入、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 price=1/999999999、years=0/30/31、salvagePercent=50/50.01、rate=90/90.01、tableRates 30/31 行、費率行尾 LF 與中間空行。所有年末估值不低於 floorValue 且不增，totalDepreciation 恆等於逐年折舊額總和。

候選 gate（均 NOT_RUN）

- 於 `tools/car-depreciation-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「車輛折舊計算」，title「車輛折舊計算｜Gloss Tools」，description「輸入購入價、年數與殘值下限，用定率遞減、直線法或逐年費率表估算目前車價與逐年折舊；估算僅供規劃參考，不是正式鑑價。」。英文 lang=en，H1 “Car Depreciation Calculator”，title “Car Depreciation Calculator | Gloss Tools”，description “Estimate a car's current value and year-by-year depreciation from its purchase price, age and a salvage floor, using declining balance, straight line, or a year-by-year rate table. Estimates are for planning only, not a formal appraisal.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。估值等於行情嗎？不等於；估算只用購入價與年數，實際市值受車況、里程與市場供需影響，請以專業鑑價或實際成交行情為準。 / Is the estimate the market price? No. The estimate uses only purchase price and age; actual market value depends on condition, mileage and supply and demand — rely on a professional appraisal or actual transaction prices.
- FAQ。為什麼後幾年折舊變成 0？估值已達你設定的殘值下限，本工具不會讓估值低於下限。 / Why does depreciation become 0 in later years? The value has reached the salvage floor you set; this tool never values the car below that floor.
- FAQ。費率表的費率用完了怎麼辦？年數比費率行數多時，最後一年的費率會重複套用到其餘年份。 / What happens when the rate table runs out? When there are more years than rate rows, the last row's rate repeats for the remaining years.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://car-depreciation.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/car-depreciation-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

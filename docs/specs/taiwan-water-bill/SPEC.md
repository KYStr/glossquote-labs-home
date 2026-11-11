# 台灣水費試算 / Taiwan Water Bill Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-taiwan-water-bill-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

費率來源（釘版）：台灣自來水公司官網《本公司目前水費及各項服務費收費標準》及同站水費計算說明（FAQ），2026-11-09 查閱。水價自民國 86 年 5 月 1 日起實施（奉台灣省政府 86.4.25（86）府建六字第四二九八四號函核定），經濟部 96.7.12 經水字第 09600577790 號函核准修正各段水價內含 5% 營業稅；基本費亦內含 5% 營業稅。下文所有金額表值均為含稅值。

## goal

台水用戶（臺北市與新北市部分地區以外的大多數用戶）想在帳單寄達前，先用自家水表口徑與本期度數算出這一期大概要繳多少；或帳單金額異常時，逐項對照基本費、用水費與代徵費，判斷是度數、用錯週期，還是可能漏水。

- 桌面。住戶拿著上一期帳單（上面印有口徑與度數），逐項核對本期試算與帳單明細。
- 行動。租屋族在看屋或分攤水費時，用手機以一期度數快速估算每人負擔。

成功結果：使用者選抄表週期與水表口徑、輸入一期用水度數（選填自家帳單上的污水、清除處理每度費率），得到與台水官方算法逐項一致的費用明細與應繳總額，每個數字都能依頁面印出的公式與費率表手算重現。資料只保留在目前頁面草稿。

## scope

MVP 必做，僅台灣自來水公司一般用水。

- 抄表週期兩種：每月抄表、隔月抄表（台水一般住戶以隔月為主，預設隔月）。度數輸入是「該抄表週期一整期的總度數」，不做每月平均化：官方分段界線與基本費本就以抄表週期定義，平均化會算錯段別與基本費。
- 水表口徑 13 個官方列舉值：13、20、25、40、50、75、100、150、200、250、300、350 公厘及「400 以上」。基本費按週期取官方表對應欄。
- 四段累進用水費，以官方公式計算（見 inputsOutputs），並列出逐段明細。
- 水源保育與回饋費一律計入：以未稅用水費 × 5% 計，僅以用水費為基數，不含基本費（官方計算說明）。
- 清除處理費、污水下水道使用費：選填的每度費率輸入（元／度）。官方收費標準明定此二費「依實用度數及委託單位公告之費率計費」——費率因縣市而異（污水費官方說明為每度 5～10 元），且污水費僅向已接用污水下水道系統的用戶計收，非台水轄區全國一致值；故留空＝不計入總額且明細標示「未計入」，工具不得代填任何預設費率。

非目標。臺北自來水事業處轄區（臺北市及新北市部分地區）費率——北水為另一套五段價表與基本費表，不可混算，頁面須明示本工具僅適用台水；官方減增收類別：市政用水及原水減 50%、臨時用水增 50%、違章建築臨時用水增 20%、國中／國小基本費照表而用量按第一段單價；估表（推估度數）與事後更正；月中裝表、換表、結清的基本費按日折算；總表與分表分攤；滯納金；復水費、接水費等各項服務費；用水類別優惠（軍公教、社福等帳單上另列的減免）。

與既有功能的差異（已讀同批 electricity-cost-calculator 規格後刻意對齊與區隔）。

- electricity-cost-calculator 刻意不內建任何電價表：電費因用戶契約與方案而異且逐年調整，故由使用者自填費率。本工具相反，台水水價是全國單一官方價表、自民國 86 年未變動（僅 96 年改為內含營業稅的表示），工具的價值正在於釘版這張表；但比照其誠實慣例：公式全印在頁面、納入與排除的費用逐項宣告、內含營業稅只作資訊列、費率表以「資料常數＋來源＋查閱日」管理，日後公告調整時只改資料不改算法。兩者輸入模型不同（電：瓦數×時間×自填費率；水：口徑×一期度數×官方價表），不重複。
- water-intake-calculator 是飲水量健康建議，與帳單無關；taiwan-invoice-prize-check 是發票對獎，均不相干。

效能與資料界線：純整數／有理數運算，度數上限 999,999 度；不連線、不儲存、不上傳。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。費率表全文以一層 disclosure 呈現，兩語皆然。

- 欄位或說明「抄表週期、水表口徑 / Meter-reading cycle and meter diameter」：週期為二選一（每月抄表 Monthly / 隔月抄表 Every two months），口徑為 13 個官方值的選單，標示公厘。
- 欄位或說明「本期用水度數 / Usage this period」：整數度（立方公尺），並註明 1 度＝1 立方公尺＝1,000 公升。
- 欄位或說明「每度代徵費率（選填）/ Per-degree levy rates (optional)」：污水下水道使用費率、清除處理費率各一欄（元／度），欄旁註明「依自家帳單填寫，未被徵收請留空 / Copy the rate from your bill; leave blank if not levied」。
- 「計算水費 / Calculate water bill」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 的 `bimonthly-typical` 案例（隔月、20 公厘、30 度），明示範例並等待手動執行。
- 「費用明細 / Charge breakdown」先摘要（應繳總額）再列細節：逐段用水費表（段別、度數、單價、小計）、基本費、用水費、水源保育與回饋費、（有填才列）污水下水道使用費與清除處理費、內含營業稅（資訊列，標示「已內含，不另加收 / Included; not added」）。未填費率的代徵項以「未計入 / Not included」一行揭露，不可默默消失。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。零度數是合法結果（只收基本費與其取整），不得當成空結果。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"cycle":"bimonthly","diameterMm":"20","usageM3":"30","sewerRateNt":"","wasteRateNt":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

頁面常駐揭露（釘版原文，結果區旁）：「本工具僅適用台灣自來水公司用戶；臺北自來水事業處轄區費率不同。 / This calculator covers Taiwan Water Corporation customers only; Taipei Water Department rates differ.」及費率來源註（見 tests 節）。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列欄位的普通物件，只讀 own data。未知欄、錯型別、accessor 皆 SCHEMA，field,row=null（選填欄 sewerRateNt、wasteRateNt 可缺席，缺席與空字串同義）。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

欄位（皆為字串）與預設（預設僅屬 UI／重設，核心不補預設，必填欄缺席即 SCHEMA）。

| 欄位 | 文法與範圍 | 預設 |
| --- | --- | --- |
| cycle | 列舉 `"monthly"` 或 `"bimonthly"` | `"bimonthly"` |
| diameterMm | 列舉 `"13" "20" "25" "40" "50" "75" "100" "150" "200" "250" "300" "350" "400+"`（`"400+"` 代表官方表「400 以上」欄） | `"20"` |
| usageM3 | ASCII 整數字串，0 或非零開頭，無空白／符號／小數／指數；0–999,999 度 | `"30"` |
| sewerRateNt | 選填。小數字串：整數部 0 或非零開頭，可選小數點加 1–2 位數字；0–99.99 元／度 | `""`（未提供） |
| wasteRateNt | 選填。同 sewerRateNt 文法與範圍 | `""`（未提供） |

raw 每欄最多 8 單元。驗證順序：先整體 SCHEMA，再依 cycle、diameterMm、usageM3、sewerRateNt、wasteRateNt 逐欄驗；每欄先容量（超限 INPUT_LIMIT）、再未成對 surrogate（UNICODE）、再必填欄缺內容（EMPTY；選填費率空字串視為未提供，跳過其餘檢查）、再文法（列舉不合 ENUM、整數不合 INTEGER_FORMAT、費率不合 DECIMAL_FORMAT；`"5."`、`".5"`、`"05"` 皆 DECIMAL_FORMAT）、再範圍（RANGE）。整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆 null（本工具無列式輸入）。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算（規範性；全程以「毫元」＝0.001 元的整數精確運算，禁止浮點；roundHalfUp(x) 指非負有理數的四捨五入至整數，即 floor(x+1/2)，以整數式 (2n+d) div (2d) 實現）。

1. 基本費 basicFeeMilliNt：依 cycle 取下表欄位值（毫元）。隔月欄恆為每月欄兩倍，但核心必須查表取字面值，不以乘二代替，以便日後表值獨立調整。

   | 口徑（公厘） | 13 | 20 | 25 | 40 | 50 | 75 | 100 | 150 | 200 | 250 | 300 | 350 | 400 以上 |
   | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
   | 每月抄表基本費（元） | 17.85 | 35.7 | 66.15 | 196.35 | 357 | 963.9 | 1,909.95 | 5,301.45 | 10,531.5 | 18,599.7 | 29,184.75 | 41,626.2 | 58,119.6 |
   | 隔月抄表基本費（元） | 35.7 | 71.4 | 132.3 | 392.7 | 714 | 1,927.8 | 3,819.9 | 10,602.9 | 21,063 | 37,199.4 | 58,369.5 | 83,252.4 | 116,239.2 |

2. 用水費 usageChargeMilliNt：四段單價（元／度，兩種週期相同）與分段界線、累進差額如下。usageM3 為 0 時用水費為 0 且 tiers 為空陣列。否則取度數所在段 s，以官方公式 `單價_s × 度數 − 累進差額_s` 計算（毫元整數精確）。

   | 段 | 單價（元／度） | 每月抄表度數 | 每月累進差額（元） | 隔月抄表度數 | 隔月累進差額（元） |
   | --- | --- | --- | --- | --- | --- |
   | 一 | 7.35 | 1–10 | 0 | 1–20 | 0 |
   | 二 | 9.45 | 11–30 | 21 | 21–60 | 42 |
   | 三 | 11.55 | 31–50 | 84 | 61–100 | 168 |
   | 四 | 12.075 | 51 以上 | 110.25 | 101 以上 | 220.5 |

3. tiers：逐段列出有用到的段（degrees>0）：`{tier, degrees, unitPriceMilliNt, subtotalMilliNt}`，subtotal 為該段度數×單價（毫元精確）。定義性恆等：各段 subtotal 總和恆等於 usageChargeMilliNt（累進差額即由此定義），實作可任選公式或逐段法，結果必須同時滿足兩者。
4. 水費小計 waterSubtotalMilliNt ＝ basicFeeMilliNt + usageChargeMilliNt（毫元精確，不取整）。
5. 水源保育與回饋費 wrccMilliNt：官方公式為「未稅用水費 × 附徵百分比 5%」，未稅用水費＝用水費 ÷ 1.05，故 wrcc（元）＝ roundHalfUp(用水費（元） / 21)，毫元值為其 1,000 倍。此費只以用水費為基數，不含基本費；用水費為 0 時為 0。
6. 污水下水道使用費 sewerFeeMilliNt：有提供 sewerRateNt 時，費（元）＝ roundHalfUp(費率 × 度數)；未提供時為 null，result 的 sewerRateNt 亦為 null（有提供時兩者回顯使用者輸入的原字串）。清除處理費 wasteFeeMilliNt／wasteRateNt 同理。
7. 內含營業稅 businessTaxMilliNt（僅資訊列，絕不加進總額）：官方公式 (基本費＋用水費) ÷ (1+5%) × 5%，角以下四捨五入，即毫元值 ＝ roundHalfUp((basicFeeMilliNt + usageChargeMilliNt) / 2100) × 100。
8. 應繳總額 totalPayableMilliNt：官方規定總水費計收至元為止、角以下四捨五入。total（元）＝ roundHalfUp(waterSubtotal（元）) + wrcc（元）+ sewerFee（元）+ wasteFee（元），毫元值為其 1,000 倍。因三項代徵各自已取整為元，此式與「全部精確相加後一次四捨五入」恆等，兩種理解不產生差異。

result 欄位（精確形狀）：`{cycle, diameterMm, usageM3（數值）, tiers, basicFeeMilliNt, usageChargeMilliNt, waterSubtotalMilliNt, wrccMilliNt, sewerRateNt, sewerFeeMilliNt, wasteRateNt, wasteFeeMilliNt, businessTaxMilliNt, totalPayableMilliNt}`。金額一律毫元整數，機器值不隨 locale 改。顯示層金額以元呈現、小數至多兩位（角分），總額與各代徵費恆為整元；顯示取捨不影響 result 的精確值，公式註須說明「明細以精確值計算，總額依官方規定四捨五入至元」。

固定下載 `taiwan-water-bill-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/taiwan-water-bill/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 費率資料（基本費兩欄×13 口徑、四段單價、兩組界線與累進差額、保育費 5% 及其等價除數 21、營業稅公式）集中為一份可稽核的資料常數，註明來源文件與查閱日（2026-11-09）；函數本體不散落任何費率字面值。所有金額以毫元整數運算，唯一的除法是第 5–8 步的取整除法。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算水費」，畫面和完整報告符合核心 fixtures（含 110 度官方範例值），使用者取得對應產物。 |
| boundaries | 兩種週期的四段界線 ±1 度、零度數、最大口徑、費率文法邊界、第一個錯誤和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；只看明細能分辨哪些代徵未計入。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴；費率常數與來源註記逐值對回官方表。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。19 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `monthly-zero-usage` | 每月抄表零度數：用水費 0、tiers 空、總額為基本費 35.7 四捨五入的 36 元 |
| `monthly-first-tier-top` | 每月第一段上界 10 度；保育費 3.5 元四捨五入為 4 元 |
| `monthly-second-tier-top-sewer` | 每月第二段上界 30 度，加污水費率每度 5 元 |
| `monthly-fourth-tier-waste` | 每月 51 度跨入第四段，加清除處理費率每度 3.7 元（188.7→189 元） |
| `monthly-third-tier-top` | 每月第三段上界 50 度、40 公厘 |
| `bimonthly-typical` | 隔月 20 公厘 30 度，範例案例 |
| `bimonthly-full-levies` | 隔月 60 度：用水費 525 元、保育費 25 元（未稅 500×5%），污水 300 元、清除 222 元 |
| `bimonthly-first-tier-top` | 隔月第一段上界 20 度 |
| `bimonthly-official-example` | 隔月 110 度：用水費 1,107.75 元與台水官方範例同值 |
| `bimonthly-large-meter` | 隔月 100 公厘、101 度（第四段第一度，用水費 999.075 元） |
| `bimonthly-max-caliber` | 隔月「400 以上」口徑、1,000 度；保育費 564.5 元四捨五入為 565 元（非銀行家捨入） |
| `error-cycle-enum` | cycle 不在列舉 → ENUM |
| `error-diameter-enum` | 口徑 30 公厘不在官方表 → ENUM |
| `error-usage-empty` | 度數空字串 → EMPTY |
| `error-usage-decimal` | 度數含小數 → INTEGER_FORMAT |
| `error-usage-input-limit` | 度數 9 字元 → INPUT_LIMIT |
| `error-usage-range` | 度數 1,000,000 → RANGE |
| `error-sewer-rate-format` | 費率三位小數 → DECIMAL_FORMAT |
| `error-waste-rate-range` | 費率 100 → RANGE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測：合法上限（度數 999,999、費率 99.99、費率 "0" 表示有徵收但費率為零、六個口徑端點）、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。恆等式檢查（任一度數與週期）：tiers 小計總和＝用水費；隔月基本費＝每月基本費×2（僅作表值一致性檢查，核心不得以此代替查表）；totalPayableMilliNt 恆為 1,000 的倍數；wrccMilliNt、sewerFeeMilliNt、wasteFeeMilliNt（非 null 時）恆為 1,000 的倍數；businessTaxMilliNt 恆為 100 的倍數。驗證四段界線的 −1/界線/+1 度各一點（兩週期共 24 點可用迴圈產生輸入，但 expected 必須由獨立手算表或另一實作給出，不得由產品核心產生）。

候選 gate（均 NOT_RUN）

- 於 `tools/taiwan-water-bill/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「台灣水費試算」，title「台灣水費試算｜Gloss Tools」，description「依台灣自來水公司現行水價表，以水表口徑與一期用水度數試算基本費、四段累進用水費與水源保育與回饋費，並可加計自填的污水下水道使用費與清除處理費。」。英文 lang=en，H1 “Taiwan Water Bill Calculator”，title “Taiwan Water Bill Calculator | Gloss Tools”，description “Estimate a Taiwan Water Corporation bill from meter diameter and one period's usage: basic charge, four-tier usage charge and the conservation levy, with optional self-entered sewer and waste rates.”。兩頁靜態呈現操作、限制、FAQ 與完整費率表。
- 費率來源註（釘版，兩語）：「費率來源：台灣自來水公司《本公司目前水費及各項服務費收費標準》（水價自民國 86 年 5 月 1 日實施，含 5% 營業稅），2026-11-09 查閱。費率如經公告調整，本頁將隨之更新；實際金額以台水帳單為準。」 / “Rates: Taiwan Water Corporation, Current Water Rates and Service Charges (tariff in force since 1 May 1997, 5% business tax included), retrieved 9 Nov 2026. If the tariff is officially revised this page's table will be updated; your actual bill governs.”
- FAQ。這是台水的費率嗎？北水一樣嗎？僅台水；臺北自來水事業處是另一套價表。 / Is this the Taipei tariff too? No — Taipei Water Department uses its own rate table.
- FAQ。「度」是什麼？1 度＝1 立方公尺＝1,000 公升。 / What is a “degree”? One degree is 1 m³, i.e. 1,000 litres.
- FAQ。為什麼試算和帳單可能不同？污水與清除處理費率因縣市與是否接用下水道而異，未填寫者不在總額內；估表、特殊用水類別與月中異動未納入模型。 / Why can my bill differ? Sewer and waste rates vary by municipality and sewer connection and are excluded unless entered; estimated readings, special user classes and mid-period changes are not modelled.
- FAQ。水源保育與回饋費怎麼算？未稅用水費的 5%，只按用水費計算、不含基本費，四捨五入至元。 / How is the conservation levy computed? 5% of the tax-excluded usage charge (the usage charge only, never the basic fee), rounded to the nearest yuan.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://taiwan-water-bill.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。reviewer 另須抽核費率表：任選三個口徑基本費、一段界線與保育費公式，對回台水官網現行頁面（注意官網如改版，須以查閱當日的官方值為準並記錄差異）。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/taiwan-water-bill/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

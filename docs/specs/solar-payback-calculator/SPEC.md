# 太陽能回本試算 / Solar Payback Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-solar-payback-calculator-20261121` · 2026-11-21 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/docs/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

屋主在自家屋頂裝太陽能之前，先用裝置容量、屋頂面積、年日照時數、建置成本、台灣躉購費率與自用比例，算出一年發多少電、一年拿回多少錢、幾年回本。

- 桌面。桌面填上裝置容量、屋頂面積、年日照時數、建置成本、躉購費率與自用比例，逐步確認年發電量、售電收入、自用節省與回本年數。
- 行動。手機在屋頂現場核對一片屋頂裝得下幾 kWp、回本要幾年，不跑任何申辦流程。

使用情境為設計假設。資料只保留在目前頁面草稿。結果是靜態試算估計，不是發電保證、報價或投資建議；實際發電量受方位、傾角、遮蔭、氣候與設備影響，實際費率以完工併網當期經濟部公告與台電購售電契約為準。

## scope

靜態試算模型。MVP 必做：年發電量、售電收入、自用節省、年總收益、回本年數、20 年總收益與淨收益、屋頂面積是否足夠的提示。非目標為即時費率查詢、實際發電保證、補助申請、結構安全評估、併網申辦、折現／內部報酬率、逐月發電曲線、維運成本與模組衰減模型。

已與 registry 的既有工具比對，最相近者的實質差異如下。

- electricity-cost 明列排除太陽能自用／售電（其 SPEC 的非目標）。本案正是該缺口：以躉購費率計售電收入、以零售電價計自用節省，算回本年數。
- fuel-cost-calculator 算油錢出行成本。此處是屋頂光電的發電收益與回本，不算交通燃料。
- compound-interest 算複利成長。此處是建置成本除以年收益的靜態回本，不計複利或折現。

判定規則由本文定義。唯一外部表列資料是 2026 年（115 年度）屋頂型躉購費率（見 inputsOutputs），其餘皆為使用者輸入與本文公式，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「裝置容量、屋頂面積 / System capacity and roof area」
- 欄位或說明「年日照時數、建置成本 / Annual sun hours and installation cost」
- 欄位或說明「躉購費率、自用比例、零售電價 / Feed-in tariff, self-use ratio and retail electricity price」
- 「計算回本 / Calculate payback」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「年發電量、年收益與回本年數 / Annual generation, annual benefit and payback years」先摘要再列細節，長表在有 label 的區域捲動。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。屋頂不足或回本超過 20 年時，以文字及符號提示（非錯誤）。空結果有說明。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"systemKwp":"9","roofAreaM2":"80","sunHours":"1250","installCost":"540000","fitRate":"5.6279","selfUsePct":"30","retailPrice":"3.00"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- 全部欄位皆為十進位字串：可選整數部分加可選小數部分，無符號、無空白、無指數、無千分位逗號；整數部分為 `0` 或非零開頭；raw 每欄最多 16 個字元。
- 欄位順序與範圍（先依此順序驗證，首錯即停）：
  1. `systemKwp` 裝置容量 kWp，小數最多 2 位，0.1–500。預設 `9`。
  2. `roofAreaM2` 屋頂面積 m²，小數最多 2 位，1–100000。預設 `80`。
  3. `sunHours` 年等效日照時數 小時/年，小數最多 1 位，500–2000。預設 `1250`。
  4. `installCost` 建置成本 NT$，整數（小數 0 位），1–100000000。預設 `540000`。
  5. `fitRate` 躉購費率 NT$/度，小數最多 4 位，0.0001–20。預設為裝置容量對應的級距表值（見下表；預設 9 kWp 對應 `5.6279`）。
  6. `selfUsePct` 自用比例 %，小數最多 1 位，0–100。預設 `30`。
  7. `retailPrice` 零售電價 NT$/度，小數最多 2 位，0.01–20。預設 `3.00`（釘版假設，非電價表查詢，見下文）。
- 錯誤碼：raw 超限 INPUT_LIMIT、缺內容 EMPTY、文法／小數位數不符 DECIMAL_FORMAT、超出範圍 RANGE；field 即上述欄名，row=null。整份失敗回 `{ok:false,error:{code,field,row}}`。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

### 躉購費率表（釘版，屋頂型）

來源：經濟部 2026 年 1 月 2 日公告「115 年度再生能源電能躉購費率及其計算公式」（經能字第 11458005630 號），2026 年第一期與第二期費率相同，躉購期間 20 年。費率按裝置容量級距查表，級距下限含、上限不含（例如 10 kWp 適用 10–20 kW 級距）。

| 裝置容量 | 上限費率 NT$/度 |
| --- | --- |
| 1 kW 以上不及 10 kW | 5.6279 |
| 10 kW 以上不及 20 kW | 5.3819 |
| 20 kW 以上不及 50 kW | 4.2505 |
| 50 kW 以上不及 100 kW | 4.0459 |
| 100 kW 以上不及 500 kW | 3.7152 |
| 500 kW 以上 | 3.6236 |

參考（本工具不採用）：地面型 1 kW 以上 3.5037、水面型（浮動式）1 kW 以上 3.8948。下列加成一律不計入：北部地區（基隆、台北、新北、桃園、新竹縣市、苗栗、宜蘭、花蓮）加成 15%、台灣高效能太陽光電模組加成 6%、地方政府補助。使用者可自行改填 `fitRate` 覆寫；`fitSource` 為 `table`（填值等於級距表值）或 `override`（不等於級距表值）。

### 釘版假設

- `sunHours` 是「年等效滿發時數」（effective full-sun hours），不是日照總時數；台灣典型值 1,100–1,400 小時/年。對照：經濟部躉購費率計算採用的太陽光電每瓩年售電量參數為 1,250 度/瓩（即等效 1,250 小時/年）。
- `retailPrice` 預設 3.00 NT$/度，是釘版假設值，供自用節省折算；台電住宅用電採累進電價（2025-10-01 起實施的電價表：夏月 1.78–8.86 元/度、非夏月 1.78–7.03 元/度，依每月用電度數分段），本工具不做累進分段計算，使用者應按自家電費單的邊際單價改填。
- 屋頂面積規則：每 1 kWp 需 8 m²（含模組間距與維修通道的規劃值）。`requiredRoofAreaM2 = systemKwp × 8`。屋頂不足時不是錯誤，是警告 `ROOF_TIGHT`，並顯示 `maxFeasibleKwp = floor(roofAreaM2 / 8 × 10) / 10`。
- 坪換算只做顯示：1 坪 = 400/121 m²（= 3.305785… m²），顯示到小數 2 位。
- 靜態模型：不計模組逐年衰減、維運成本、折現、通膨、補助與費率未來變動；20 年總收益 = 年收益 × 20。

### 計算（皆以未捨入的中間值計算，只在輸出時捨入）

1. `annualGenerationKwh = systemKwp × sunHours`（度/年）。
2. `selfUsedKwh = annualGenerationKwh × selfUsePct / 100`；`exportedKwh = annualGenerationKwh − selfUsedKwh`。
3. `exportRevenueTwd = exportedKwh × fitRate`；`selfUseSavingTwd = selfUsedKwh × retailPrice`；`annualBenefitTwd = exportRevenueTwd + selfUseSavingTwd`。
4. `paybackYears = installCost / annualBenefitTwd`。
5. `total20BenefitTwd = annualBenefitTwd × 20`；`net20Twd = total20BenefitTwd − installCost`。
6. `beyondContract = paybackYears > 20`（回本超過躉購 20 年期間時為 true，提示用，非錯誤）。

捨入一律四捨五入（half away from zero），在輸出時套用：度數與 NT$ 金額到整數；`paybackYears` 到小數 1 位；`maxFeasibleKwp` 與 `requiredRoofAreaM2` 到小數 1 位；百分比顯示到小數 1 位。結果物件鍵如下（數字皆為 JSON number，金額單位 NT$，度數單位 kWh）：

`{annualGenerationKwh, selfUsedKwh, exportedKwh, fitRateApplied, fitSource, exportRevenueTwd, selfUseSavingTwd, annualBenefitTwd, paybackYears, total20BenefitTwd, net20Twd, requiredRoofAreaM2, roofWarning, maxFeasibleKwp, beyondContract}`。`roofWarning` 為 null 或 `"ROOF_TIGHT"`；`fitSource` 為 `"table"` 或 `"override"`。

固定下載 `solar-payback-calculator-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/solar-payback-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。
- 費率表以字面常數寫進核心，不得在執行時抓取或更新；費率年度與公告文號以字串寫進報告與頁面 disclosure。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算回本」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。12 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `typical-rooftop-9kw` | 典型 9 kWp 屋頂、自用 30%，費率級距 1–10 kW |
| `band-boundary-10kw` | 10 kWp 恰落在 10–20 kW 級距（5.3819），非 5.6279 |
| `full-self-use` | 自用 100%，售電收入為零 |
| `large-rooftop-50kw` | 50 kWp 落在 50–100 kW 級距（4.0459） |
| `roof-too-small` | 屋頂不足，警告 ROOF_TIGHT 與最大可裝容量 |
| `never-pays-back-in-20y` | 回本 37.0 年，超過躉購 20 年，20 年淨收益為負 |
| `band-boundary-20kw` | 20 kWp 恰落在 20–50 kW 級距（4.2505） |
| `custom-fit-override` | 自填躉購費率 4.50，fitSource 為 override |
| `minimum-system` | 最小系統 1 kWp |
| `kwp-too-large` | 裝置容量 501 kWp 超出範圍，首錯 RANGE |
| `sun-hours-too-many-decimals` | 年日照小數 2 位，DECIMAL_FORMAT |
| `self-use-over-100` | 自用比例 101%，RANGE |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 kWp=10 與 20 的級距邊界、selfUsePct=0 與 100、sunHours=500 與 2000、roofArea 恰等於需求面積、payback 恰為 20.0 年的邊界。所有已接受的結果皆滿足 exportedKwh + selfUsedKwh = annualGenerationKwh、exportRevenueTwd + selfUseSavingTwd = annualBenefitTwd（以未捨入值計）。

候選 gate（均 NOT_RUN）

- 於 `tools/solar-payback-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「太陽能回本試算」，title「太陽能回本試算｜Gloss Tools」，description「輸入裝置容量、屋頂面積、年日照時數與建置成本，按台灣躉購費率算一年發多少電、一年拿回多少錢、幾年回本。」。英文 lang=en，H1 “Solar Payback Calculator”，title “Solar Payback Calculator | Gloss Tools”，description “Enter system size, roof area, annual sun hours and installation cost to estimate annual generation, yearly benefit and payback years at Taiwan's feed-in tariff.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。躉購費率是哪一年的？2026 年（115 年度）經濟部公告的屋頂型費率，兩期相同；實際費率以完工併網當期的公告與台電契約為準。 / Which year's feed-in tariff is used? The 2026 (ROC 115) MOEA-announced rooftop rates, identical in both phases; the rate that applies is the one announced for the period when the system is completed and grid-connected, per the Taipower contract.
- FAQ。自用的電怎麼算錢？自用度數按你填的零售電價折算節省，預設每度 3.00 元是假設值，請按自家電費單的邊際單價改填；台電住宅用電是累進電價，本工具不做分段計算。 / How is self-consumed electricity valued? Self-used kWh are valued at the retail price you enter (default NT$3.00/kWh is an assumption — replace it with the marginal rate on your own bill; Taipower residential rates are inclining-block, which this tool does not compute).
- FAQ。屋頂不夠大怎麼辦？這是警告不是錯誤；頁面會顯示最大可裝容量，你可以改小裝置容量再算。 / What if my roof is too small? That is a warning, not an error; the page shows the largest capacity that fits, so you can lower the system size and recalculate.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://solar-payback-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線以固定 commit 為準（見 PR 說明）。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/solar-payback-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

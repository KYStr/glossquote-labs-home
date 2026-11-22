# 高鐵票價試算 / HSR Fare Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-hsr-fare-calculator-20261121` · 2026-11-21 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/docs/SPECIFICATION-STOCK.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

旅客在訂票前，先在一個靜態頁面算出這趟高鐵的票價：選出發站與到達站、車廂（標準對號座／商務／自由座）與票種（全票／優待／早鳥／大學生），得到單張票價、張數總價、區間里程與行車方向。

- 桌面。桌面選站與票種，核對單張與多張總價，再與同區間其他車廂比價。
- 行動。手機在車站或行程討論中快速查一組區間的票價，不進訂票流程。

使用情境為設計假設。資料只保留在目前頁面草稿；本工具不訂位、不查即時班次與剩餘座位。

## scope

MVP 必做：12 站 × 66 組區間的查表票價（標準對號座全票、商務全票、自由座全票三張字面表，來源見 implementation）；優待票（敬老／愛心／兒童）5 折、早鳥 65／8／9 折、大學生 5／75／88 折，皆以 pinned 折扣規則由全票算出；張數 1–10；區間里程與南下／北上方向顯示；雙語靜態頁與報告下載。

非目標：即時票價查詢、訂位／購票／取票、早鳥與大學生指定車次與剩餘名額（本工具只算「買得到該折數時」的價格，不保證某班車有該折數）、回數票（82–92 折）、定期票（49 折）、團體票（11 人以上，專案折扣另計）、外籍旅客周遊券、退票 20 元／改票／補票手續費、行車時間與時刻表、台鐵／捷運票價。

與既有／同輪工具的實質差異：

- `highway-toll-calculator`（國道通行費，run 6 同輪另案，`spec-highway-toll-calculator-20261121`）：公路通行費是**依里程套公式**（每日 20 公里優惠後 × 車種費率，200 公里以上長途折扣，eTag 9 折），按車計費；本工具是**鐵路票價查表**（政府備查的 66 組區間定價，無里程費率、無免費里程、無長途折扣），按人／按張計費。里程在本工具只作顯示，不參與計價。
- `fuel-cost-calculator`（油費）：算開車的油錢，不算過路費也不算車票；本工具不算油錢。
- `trip-time-estimator`（行車時間，run 6 概念）：算時間；本工具算票價，不算時間。

判定規則由本文定義，無線上資料或外部服務依賴。票價表以 2026-11-21 查核的台灣高鐵官方公告為準（見 implementation）；官方調價後以新版規格修訂為準，本工具不自動跟價。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「出發站 / Origin station」「到達站 / Destination station」（12 站下拉，站名雙語）
- 欄位或說明「車廂 / Cabin」（標準車廂對號座／商務車廂／自由座）
- 欄位或說明「票種 / Fare type」（全票／優待票／早鳥 65 折／早鳥 8 折／早鳥 9 折／大學生 5 折／大學生 75 折／大學生 88 折）
- 欄位或說明「張數 / Quantity」（1–10）
- 「計算票價 / Calculate fare」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「單張票價與總價 / Fare per ticket and total」先摘要再列細節：區間、方向、里程、車廂、票種、全票原價、單張票價、張數、總價；另列「同區間其他車廂全票」對照（標準／商務／自由座三價，其中不售商務的三組短區間標示不售）。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"origin":"TPE","destination":"TAC","cabin":"standard","fareKind":"full","quantity":"1"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

- `origin`、`destination`：車站代碼，取自下表 12 個代碼之一，大小寫敏感，不做大小寫折疊、不接受中文站名或英文站名全名。
- `cabin`：`standard`（標準車廂對號座）／`business`（商務車廂）／`nonreserved`（自由座）。
- `fareKind`：`full`（全票）／`concession`（優待票：敬老／愛心／兒童）／`earlyBird65`／`earlyBird80`／`earlyBird90`（早鳥）／`student50`／`student75`／`student88`（大學生）。
- `quantity`：ASCII 十進整數字串，0 或非零開頭，無空白／符號／小數／指數，raw 最多 8 單元，範圍 1–10。
- 預設 origin `TPE`、destination `TAC`、cabin `standard`、fareKind `full`、quantity `1`。

驗證順序（固定，先容量、再 surrogate、再該欄文法，跨欄依下文）：

1. 依 origin、destination、cabin、fareKind、quantity 順序逐欄驗證。raw 超限 INPUT_LIMIT、缺內容 EMPTY、代碼／枚舉不在表內 INVALID_VALUE、quantity 非整數字串 INTEGER_FORMAT、quantity 超出 1–10 RANGE。field 即欄名，row=null。
2. 跨欄：origin 與 destination 相同 → SAME_STATION，field=`destination`。cabin 為 `business` 且區間為南港─台北、南港─板橋、台北─板橋三組之一 → CABIN_NOT_SOLD，field=`cabin`。fareKind 為早鳥或大學生（`earlyBird65`／`earlyBird80`／`earlyBird90`／`student50`／`student75`／`student88`）且 cabin 不是 `standard` → FARE_CABIN_MISMATCH，field=`fareKind`。跨欄檢查順序為 SAME_STATION → CABIN_NOT_SOLD → FARE_CABIN_MISMATCH。
3. 整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆為 null（本工具無列資料）。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

計算（皆為整數新台幣元，無浮點）：

1. 依車站序號定方向：destination 序號大於 origin 為 `southbound`（南下），反之為 `northbound`（北上）。區間里程 `distanceKm = |km[destination] − km[origin]|`，取至小數 1 位（km 標記本身即為 1 位小數，相減無進位問題）。
2. `baseFare` 為該區間、該車廂的全票查表價：`standard` 查標準全票表，`business` 查商務全票表，`nonreserved` 查自由座全票表。
3. 折扣率：`full` 為 1（不折扣）；`concession` 0.50；`earlyBird65` 0.65、`earlyBird80` 0.80、`earlyBird90` 0.90；`student50` 0.50、`student75` 0.75、`student88` 0.88。`singleFare = 5 × floor(baseFare × rate / 5)`，即向下取至最接近的 5 元。此規則對優待票亦適用（自由座全票有 5 元尾數時，半價先出 .5 元再向下取至 5 元，例如自由座 35 元的優待票為 15 元，不是 17.5 元也不是 20 元）。
4. `totalFare = singleFare × quantity`（quantity 為已驗證的整數 1–10）。
5. 結果 `{origin,destination,direction,distanceKm,cabin,fareKind,baseFare,singleFare,quantity,totalFare}`，其中 quantity 為數字，distanceKm 為 1 位小數數字，其餘為字串或整數元。機器值不隨 locale 改。

固定下載 `hsr-fare-calculator-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

### 車站表（序號由北至南；km 為南港起算的路線里程標記，僅作顯示）

| 序號 | 代碼 | 中文站名 | English | km |
| --- | --- | --- | --- | --- |
| 0 | NAG | 南港 | Nangang | 0.0 |
| 1 | TPE | 台北 | Taipei | 5.9 |
| 2 | BAQ | 板橋 | Banqiao | 13.1 |
| 3 | TAY | 桃園 | Taoyuan | 42.3 |
| 4 | HSC | 新竹 | Hsinchu | 72.2 |
| 5 | MIL | 苗栗 | Miaoli | 104.9 |
| 6 | TAC | 台中 | Taichung | 165.7 |
| 7 | CHH | 彰化 | Changhua | 193.9 |
| 8 | YUL | 雲林 | Yunlin | 218.5 |
| 9 | CHY | 嘉義 | Chiayi | 251.6 |
| 10 | TAN | 台南 | Tainan | 313.9 |
| 11 | ZUY | 左營 | Zuoying | 345.2 |

站間距離為相鄰 km 標記之差：5.9、7.2、29.2、29.9、32.7、60.8、28.2、24.6、33.1、62.3、31.3（公里），合計 345.2 公里。

### 標準車廂對號座全票表（新台幣／元，對稱矩陣；來源：台灣高鐵官方「普通票／全票票價表」藍底區塊）

|  | NAG | TPE | BAQ | TAY | HSC | MIL | TAC | CHH | YUL | CHY | TAN | ZUY |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NAG | — | 40 | 70 | 200 | 330 | 480 | 750 | 870 | 970 | 1120 | 1390 | 1530 |
| TPE | 40 | — | 40 | 160 | 290 | 430 | 700 | 820 | 930 | 1080 | 1350 | 1490 |
| BAQ | 70 | 40 | — | 130 | 260 | 400 | 670 | 790 | 900 | 1050 | 1320 | 1460 |
| TAY | 200 | 160 | 130 | — | 130 | 280 | 540 | 670 | 780 | 920 | 1190 | 1330 |
| HSC | 330 | 290 | 260 | 130 | — | 140 | 410 | 540 | 640 | 790 | 1060 | 1200 |
| MIL | 480 | 430 | 400 | 280 | 140 | — | 270 | 390 | 500 | 640 | 920 | 1060 |
| TAC | 750 | 700 | 670 | 540 | 410 | 270 | — | 130 | 230 | 380 | 650 | 790 |
| CHH | 870 | 820 | 790 | 670 | 540 | 390 | 130 | — | 110 | 250 | 530 | 670 |
| YUL | 970 | 930 | 900 | 780 | 640 | 500 | 230 | 110 | — | 150 | 420 | 560 |
| CHY | 1120 | 1080 | 1050 | 920 | 790 | 640 | 380 | 250 | 150 | — | 280 | 410 |
| TAN | 1390 | 1350 | 1320 | 1190 | 1060 | 920 | 650 | 530 | 420 | 280 | — | 140 |
| ZUY | 1530 | 1490 | 1460 | 1330 | 1200 | 1060 | 790 | 670 | 560 | 410 | 140 | — |

### 商務車廂全票表（新台幣／元，對稱矩陣；來源：台灣高鐵官方「普通票／全票票價表」紅底區塊；✕ 為不發售商務車廂車票的三組短區間）

|  | NAG | TPE | BAQ | TAY | HSC | MIL | TAC | CHH | YUL | CHY | TAN | ZUY |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NAG | — | ✕ | ✕ | 500 | 700 | 920 | 1330 | 1510 | 1660 | 1880 | 2290 | 2500 |
| TPE | ✕ | — | ✕ | 440 | 640 | 850 | 1250 | 1430 | 1600 | 1820 | 2230 | 2440 |
| BAQ | ✕ | ✕ | — | 400 | 590 | 800 | 1210 | 1390 | 1550 | 1780 | 2180 | 2390 |
| TAY | 500 | 440 | 400 | — | 400 | 620 | 1010 | 1210 | 1370 | 1580 | 1990 | 2200 |
| HSC | 700 | 640 | 590 | 400 | — | 410 | 820 | 1010 | 1160 | 1390 | 1790 | 2000 |
| MIL | 920 | 850 | 800 | 620 | 410 | — | 610 | 790 | 950 | 1160 | 1580 | 1790 |
| TAC | 1330 | 1250 | 1210 | 1010 | 820 | 610 | — | 400 | 550 | 770 | 1180 | 1390 |
| CHH | 1510 | 1430 | 1390 | 1210 | 1010 | 790 | 400 | — | 370 | 580 | 1000 | 1210 |
| YUL | 1660 | 1600 | 1550 | 1370 | 1160 | 950 | 550 | 370 | — | 430 | 830 | 1040 |
| CHY | 1880 | 1820 | 1780 | 1580 | 1390 | 1160 | 770 | 580 | 430 | — | 620 | 820 |
| TAN | 2290 | 2230 | 2180 | 1990 | 1790 | 1580 | 1180 | 1000 | 830 | 620 | — | 410 |
| ZUY | 2500 | 2440 | 2390 | 2200 | 2000 | 1790 | 1390 | 1210 | 1040 | 820 | 410 | — |

### 自由座全票表（新台幣／元，對稱矩陣；來源：台灣高鐵官方「自由座全票票價表」）

|  | NAG | TPE | BAQ | TAY | HSC | MIL | TAC | CHH | YUL | CHY | TAN | ZUY |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NAG | — | 35 | 65 | 190 | 320 | 465 | 725 | 840 | 940 | 1085 | 1345 | 1480 |
| TPE | 35 | — | 35 | 155 | 280 | 415 | 675 | 795 | 900 | 1045 | 1305 | 1445 |
| BAQ | 65 | 35 | — | 125 | 250 | 385 | 645 | 765 | 870 | 1015 | 1280 | 1415 |
| TAY | 190 | 155 | 125 | — | 125 | 270 | 520 | 645 | 755 | 890 | 1150 | 1290 |
| HSC | 320 | 280 | 250 | 125 | — | 135 | 395 | 520 | 620 | 765 | 1025 | 1160 |
| MIL | 465 | 415 | 385 | 270 | 135 | — | 260 | 375 | 485 | 620 | 890 | 1025 |
| TAC | 725 | 675 | 645 | 520 | 395 | 260 | — | 125 | 220 | 365 | 630 | 765 |
| CHH | 840 | 795 | 765 | 645 | 520 | 375 | 125 | — | 105 | 240 | 510 | 645 |
| YUL | 940 | 900 | 870 | 755 | 620 | 485 | 220 | 105 | — | 145 | 405 | 540 |
| CHY | 1085 | 1045 | 1015 | 890 | 765 | 620 | 365 | 240 | 145 | — | 270 | 395 |
| TAN | 1345 | 1305 | 1280 | 1150 | 1025 | 890 | 630 | 510 | 405 | 270 | — | 135 |
| ZUY | 1480 | 1445 | 1415 | 1290 | 1160 | 1025 | 765 | 645 | 540 | 395 | 135 | — |

### 票種資格（摘要，購票前以官方公告為準）

- 優待票：敬老票為乘車當日年滿 65 歲以上之國民；愛心票為持有身心障礙證明（粉紅色）之國民，必要陪伴者 1 人須證明背面註記「國內大眾運輸工具」；兒童票為未滿 12 歲之兒童。優待票適用標準對號座、自由座與商務車廂，皆為全票 5 折（依上列向下取至 5 元規則）。多種優惠符合時擇一適用，不得併用。
- 免票兒童：身高未滿 115 公分且不需使用座位者得免票，每位購買全票或成年旅客最多攜帶 2 名；需佔位者應依規定購票。本工具不設免票票種，免票條件只在 FAQ 說明。
- 早鳥優惠：僅限標準車廂對號座單程全票，指定車次限量發售，65 折售完改售 8 折、8 折售完改售 9 折，最晚發售至乘車日（含）前 5 日截止，記名限本人搭乘。
- 大學生優惠：中華民國大專院校在學學生，僅限指定車次標準車廂對號座，5 折／75 折／88 折。
- 團體票、回數票、定期票、周遊券為非目標，不在本工具的票種選項內。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/hsr-fare-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 三張全票表（標準／商務／自由座）與車站 km 標記為字面常數，寫死在 src/core.mjs；折扣價一律以 `5 × floor(baseFare × rate / 5)` 由全票算出，不另存折扣表。工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

### 資料來源（2026-11-21 查核）

- 三張全票表與優待票規則：台灣高鐵「普通／優待／團體票種說明」，https://www.thsrc.com.tw/articlecontent/743c51ac-124d-4b1a-a57b-1fd820848032。標準與商務全票均為政府備查票價；優待票「依政府備查票價半價計算」。官方頁面以一張合併矩陣呈現：下三角為標準全票、上三角為商務全票；本 SPEC 將其展開為兩張對稱矩陣，數值逐格相同（作者已以程式逐格對照，見 AUTHOR-CHECK.md）。
- 折扣規則驗證：早鳥 65／8／9 折票價表（https://www.thsrc.com.tw/ArticleContent/7039d17d-1463-4c14-ad93-4d491dedcad5）與大學生 5／75／88 折票價表（https://www.thsrc.com.tw/articlecontent/530e869c-479d-441a-a4b4-61a8166827e9）逐格符合 `5 × floor(全票 × 折數 / 5)`；優待票三張表（標準／商務／自由座）共 198 格亦全數符合 `5 × floor(全票 / 10)`。驗證細節見 AUTHOR-CHECK.md。
- 車站 km 標記：Wikipedia「Taiwan High Speed Rail」路線圖 km 標記（南港 0.0、台北 5.9、板橋 13.1、桃園 42.3、新竹 72.2、苗栗 104.9、台中 165.7、彰化 193.9、雲林 218.5、嘉義 251.6、台南 313.9、左營 345.2），https://en.wikipedia.org/wiki/Taiwan_High_Speed_Rail。里程只作顯示，不參與計價。
- 與概念筆記的兩處修正（依本簡報「來源優先於概念」規則）：(1) 高鐵票價沒有公開的「里程費率／距離級距公式」，是政府備查的 66 組區間定價查表；本 SPEC 釘版查表，不捏造費率公式。(2) 自由座與商務艙沒有單一換算倍率（自由座／標準比值 0.8750–0.9698、商務／標準比值 1.6376–3.0769，見 AUTHOR-CHECK.md），故三張表皆釘版字面值，不以折數推導。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算票價」，畫面和完整報告符合核心 fixtures，使用者取得對應產物；同區間三車廂對照正確，三組短區間標示不售商務。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據；最短區間（南港─台北 40 元）、最長區間（南港─左營 1,530 元）、張數 1 與 10、張數 0 與 11。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。17 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `taipei-zuoying-standard-full` | 最長常用區間標準全票 1,490 元，南下 339.3 公里 |
| `taipei-taichung-business-full` | 商務全票 1,250 元 |
| `nangang-zuoying-nonreserved-full` | 全線自由座全票 1,480 元，345.2 公里 |
| `taipei-taichung-concession-x2` | 優待票 350 元 × 2 張＝700 元 |
| `taoyuan-hsinchu-nonreserved-concession` | 自由座優待票 125 元半價向下取至 5 元＝60 元（非 62.5 元） |
| `taipei-zuoying-earlybird65` | 早鳥 65 折 965 元（968.5 向下取至 5 元） |
| `taipei-taichung-student88` | 大學生 88 折 615 元（616 向下取至 5 元） |
| `nangang-taipei-shortest-x3` | 最短區間 40 元 × 3 張＝120 元 |
| `tainan-zuoying-business-concession` | 商務優待票 205 元 |
| `zuoying-taipei-standard-full` | 反向北上同價 1,490 元（對稱性） |
| `miaoli-taichung-student75` | 大學生 75 折 200 元（202.5 向下取至 5 元） |
| `changhua-yunlin-nonreserved-concession` | 自由座優待票 50 元（52.5 向下取至 5 元） |
| `same-station` | 出發與到達相同站 |
| `business-not-sold` | 台北─板橋不售商務 |
| `earlybird-business-mismatch` | 早鳥限標準車廂，商務不適用 |
| `invalid-station` | 不存在的車站代碼 |
| `quantity-range` | 張數 11 超出 1–10 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證南港─台北（40 元）與南港─左營（1,530 元）兩端、quantity 1/10/11、三組短區間商務、早鳥／大學生配自由座與商務、反向同價。所有單張票價皆為 5 的倍數；所有優待／折扣價皆不大於對應全票。

候選 gate（均 NOT_RUN）

- 於 `tools/hsr-fare-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「高鐵票價試算」，title「高鐵票價試算｜Gloss Tools」，description「選出發站與到達站、車廂與票種，依台灣高鐵官方公告票價表試算單張與多張總票價。」。英文 lang=en，H1 “HSR Fare Calculator”，title “HSR Fare Calculator | Gloss Tools”，description “Pick origin and destination stations, cabin and fare type to estimate per-ticket and total Taiwan High Speed Rail fares from the official fare tables.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。票價是即時查詢嗎？不是，本工具依官方公告票價表靜態試算，不查班次與剩餘座位。 / Is this a live fare lookup? No. It estimates from the published official fare tables and does not check trains or seat availability.
- FAQ。早鳥或大學生優惠一定買得到嗎？不一定，只限指定車次且限量，買得到該折數時才適用表列價格。 / Are Early Bird or student discounts always available? No. They apply only to designated trains with limited quotas; the listed price applies only when that discount is available.
- FAQ。身高未滿 115 公分的兒童要買票嗎？不需佔位時得免票，每位全票或成年旅客最多帶 2 名；需要座位時應依規定購票。 / Does a child under 115 cm need a ticket? No ticket is needed when no seat is used, up to 2 children per full-fare adult; a seat requires a ticket under the rules.
- FAQ。為什麼南港─台北沒有商務車廂票價？南港─台北、南港─板橋、台北─板橋三組短區間不發售商務車廂車票。 / Why is there no business fare for Nangang–Taipei? Business class is not sold on the Nangang–Taipei, Nangang–Banqiao and Taipei–Banqiao short segments.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://hsr-fare-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/hsr-fare-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

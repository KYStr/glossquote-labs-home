# 德州撲克勝率 / Poker Odds Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-poker-odds-calculator-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

玩家在德州撲克牌桌上拿到兩張手牌、看到公共牌後，想知道自己現在是什麼牌、還差幾張 outs 能成牌、下一張與接下來兩張的命中率、對上 N 位對手的勝率與權益，以及底池賠率下該跟注還是棄牌。

- 桌面。桌面輸入手牌、公共牌、對手人數與底池金額，逐步確認聽牌命中率與對戰權益，再對照底池賠率決定跟注或棄牌。
- 行動。手機在牌局間隙核對一手牌的 outs 與勝率，不啟動任何牌局、不連線、不存牌譜。

使用情境為設計假設。本工具只做機率計算與教學參考，不提供真錢投注建議，不保證任何結果。

免責聲明（頁面固定顯示，逐字採用）：「本工具僅供娛樂與機率教學參考，不構成任何投注建議。所有機率皆假設一副公平洗勻的 52 張牌，且對手手牌未知、均勻隨機；實際結果無法保證。」 / “This tool is for entertainment and probability education only, not betting advice. All probabilities assume a fair, randomly shuffled 52-card deck and that opponents' hole cards are unknown and uniformly random; actual outcomes are not guaranteed.”

## scope

輸入手牌 2 張、公共牌 0／3／4／5 張（翻牌前／翻牌／轉牌／河牌）、對手 1–9 人、底池與跟注額（選填）。輸出目前最佳成牌、outs（依 §5 成牌轉換規則由牌面算出，不由使用者自填）、下一張命中率、兩張命中率、2/4 法則近似值（僅供參考，明確標示為近似）、勝率／平手率／敗率／權益、最終成牌分布、底池賠率與跟注／棄牌提示。

非目標為對手手牌範圍建模（對手手牌一律假設為未見牌中的均勻隨機組合，不依對手行動推斷範圍）、下注額建議、資金管理、讀取即時牌局或牌譜、真錢投注、其他撲克玩法（奧馬哈、短牌等）。

已與既有機率類工具比對，最相近者的實質差異如下。

- 擲骰子（dice-roller）：單顆骰子的均勻結果，與牌面、手牌評估、對手人數無關。此處評估 5–7 張牌的最佳成牌，並對多位對手枚舉或模擬勝率。
- 樂透選號（lottery-number-picker）：產生隨機號碼組合，不評估既定手牌的成牌機率。此處輸入是已知的手牌與公共牌，輸出是該手牌的條件機率。
- 機率計算的其他工具（如有）：本工具的勝率以對手人數為條件，且區分精確枚舉與種子蒙地卡羅兩種方法並釘死誤差界線；單一 outs 的 2/4 法則只是附帶顯示的近似值，絕不用於權益或提示。

判定規則由本文定義，無線上資料或外部服務依賴。無日期、無時區。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「手牌（2 張） / Hole cards (2 cards)」
- 欄位或說明「公共牌（0／3／4／5 張） / Board cards (0 / 3 / 4 / 5 cards)」
- 欄位或說明「對手人數 / Number of opponents」
- 欄位或說明「底池（選填） / Pot (optional)」
- 欄位或說明「跟注額（選填） / Amount to call (optional)」
- 「計算勝率 / Calculate odds」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「目前成牌、outs 與命中率 / Current hand, outs and hit rates」先摘要再列細節；「勝率與權益 / Win rate and equity」列勝率、平手率、敗率、權益、方法（精確枚舉／蒙地卡羅）與情境數／試驗數；「最終成牌分布 / Final hand distribution」列九種成牌的機率；「底池賠率與提示 / Pot odds and hint」列底池賠率、損益平衡權益與跟注／棄牌提示。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"holeCards":["As","Ks"],"boardCards":["Qs","7s","2c"],"opponents":"1","pot":"","toCall":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。牌面欄位以空白或逗號分隔的牌碼文字輸入，解析時依空白／逗號切分、大小寫不敏感；核心輸入以牌碼字串陣列表示。明示檔案欄才處理原始 bytes。

- 牌碼語法：一位點數 `2–9`、`T`（=10）、`J`、`Q`、`K`、`A`，加一位花色 `s`（♠）、`h`（♥）、`d`（♦）、`c`（♣），例如 `As`、`Kh`、`Td`。大小寫不敏感，標準顯示為點數大寫＋花色小寫，頁面顯示時花色轉為 ♠♥♦♣。
- 牌組順序（枚舉與蒙地卡羅共用，決定性用）：點數由小到大 2、3、4、5、6、7、8、9、T、J、Q、K、A；花色順序 c、d、h、s（字母順序）。
- holeCards 恰 2 張；boardCards 0、3、4、5 張（分別為翻牌前、翻牌、轉牌、河牌）；opponents 為 ASCII 十進整數字串 1–9；pot、toCall 為 ASCII 十進整數字串 0–1,000,000,000（籌碼單位），空字串表示未填（兩者任一未填即不計算底池賠率與提示）。
- 預設 holeCards `["As","Ks"]`、boardCards `["Qs","7s","2c"]`、opponents `"1"`、pot `""`、toCall `""`。

先容量、再 surrogate、再該欄文法，跨欄和逐列順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 holeCards、boardCards、opponents、pot、toCall 順序驗證。raw 超限 INPUT_LIMIT（holeCards raw ≤ 15 字元、boardCards raw ≤ 29 字元、opponents／pot／toCall raw ≤ 10 字元）；holeCards 為空陣列或 opponents 為空字串為 EMPTY；牌碼不合語法為 CARD_FORMAT，整數欄非 ASCII 十進整數為 INTEGER_FORMAT，field 即上述欄名。
2. CARD_COUNT：holeCards 不是 2 張，或 boardCards 張數不在 {0,3,4,5} 之列，field 為該欄。
3. DUPLICATE_CARD：手牌與公共牌合計 7 張內任一牌重複，field 為重複牌首次出現的欄位（在手牌內重複為 holeCards，在公共牌出現為 boardCards）。
4. RANGE：opponents 不在 1–9，或 pot／toCall 不在 0–1,000,000,000，field 即該欄。
5. 成牌評估：由手牌＋公共牌取最佳 5 張，類別由低至高為 1 高牌（high card）、2 一對（pair）、3 兩對（two pair）、4 三條（three-of-a-kind）、5 順子（straight）、6 同花（flush）、7 葫蘆（full house）、8 四條（four-of-a-kind）、9 同花順（straight flush）；同花順頂牌為 A 時顯示名稱為皇家同花順（royal flush），類別仍為 9。順子含 A-2-3-4-5 輪子順（頂牌為 5）。比大小先比類別，再比類別內的比牌（kicker）由大到小：四條比四條點數再比踢腳；葫蘆比三條點數再比對子點數；三條比三條點數再比兩張踢腳；兩對比大對、再比小對、再比踢腳；一對比對子點數再比三張踢腳；同花／高牌比五張點數由大到小；順子／同花順比頂牌。
6. outs：只在公共牌少於 5 張時計算（翻牌前 boardCards 為空時 outs 為 null；河牌圈 outs 為 0）。outs 是未見牌中、作為下一張公共牌能完成 §5 所列任一聽牌的牌數（取聯集，重複只計一次）。§5 釘死：同花聽牌須目前類別 < 6 且該牌使成牌為同花以上；順子聽牌須目前類別 < 5 且該牌使成牌為順子以上；一對聽三條須目前類別為 2 且該牌使成牌為三條；兩對聽葫蘆須目前類別為 3 且該牌使成牌為葫蘆；三條聽葫蘆／四條須目前類別為 4 且該牌使成牌為葫蘆以上；目前類別 ≥ 6 時只計使成牌為同花順的牌。明確不計入：只配成一對的超牌（overcard pairing）、只使兩對變三對的公共牌配對。outs 不考慮對手手牌（對手未知，見 goal 免責聲明）。
7. 命中率：未見牌數 R = 52 − 2 − boardCards 張數。剩 2 張牌時（翻牌圈）：下一張命中率 = outs / R；兩張命中率 = 1 − C(R − outs, 2) / C(R, 2)。剩 1 張牌時（轉牌圈）：兩張命中率等於下一張命中率。剩 0 張牌時（河牌圈）與翻牌前：兩者皆為 null。2/4 法則近似值只作參考顯示：下一張約 outs × 2%，兩張約 outs × 4%（轉牌圈兩張同下一張，約 outs × 2%）；近似值以整數百分比顯示，絕不用於權益或提示，誤差見 §5。
8. 勝率／權益：對每位對手發 2 張未見牌、補足公共牌至 5 張，比較最佳 5 張成牌。win 為勝過全部對手，tie 為與至少一位對手同為最佳且無人勝過，loss 為其餘。winPct = wins / scenarios × 100，tiePct、lossPct 同理；equityPct = (wins + ties / 2) / scenarios × 100。方法見 §5（精確枚舉或種子蒙地卡羅），result 固定回報 method（"exact"／"monte-carlo"）與 scenarios（情境數或試驗數）。
9. 最終成牌分布： hero 在全部可能公共牌補足後的最佳成牌類別分布（與對手無關）。精確枚舉時分母為 C(R, cardsToCome)；蒙地卡羅時分母為試驗數。九種類別皆列出，以 2 位小數百分比字串表示；各值分別四捨五入後合計可能為 99.99–100.01，屬捨入所致，不另行調整。
10. 底池賠率：pot 與 toCall 皆填才計算。potOddsRatio 為 pot:toCall 以最大公因數約分（例如 300:100 → "3:1"）；breakEvenPct = toCall / (pot + toCall) × 100。hint 以未捨入的精確分數比較：equity > breakEven 為 "call"（跟注），equity < breakEven 為 "fold"（棄牌），精確相等為 "marginal"（邊際）。toCall 為 0 時 ratio 為 null、breakEvenPct 為 "0.00"、hint 為 "call"（免費跟注）。pot 與 toCall 任一未填時，potOddsRatio、breakEvenPct、hint 皆為 null。

百分比一律以半向上捨入（round half up）取 2 位小數，以恰 2 位小數的字串表示（例如 "19.15"、"0.00"、"100.00"）；2/4 法則近似值除外，以整數百分比表示。內部計數皆為精確整數／分數，捨入只在顯示時進行；hint 比較用未捨入的精確分數，不用顯示值。

固定下載 `poker-odds-calculator-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

錯誤訊息（雙語，逐字採用）：SCHEMA「輸入格式錯誤 / Invalid input format」；INPUT_LIMIT「輸入過長 / Input too long」；EMPTY「請填寫此欄 / This field is required」；CARD_FORMAT「牌碼格式錯誤，例如 As、Kh、Td / Invalid card code, e.g. As, Kh, Td」；CARD_COUNT「牌張數錯誤：手牌須為 2 張，公共牌須為 0、3、4 或 5 張 / Wrong card count: 2 hole cards and 0, 3, 4 or 5 board cards」；DUPLICATE_CARD「有重複的牌 / Duplicate card」；INTEGER_FORMAT「請輸入整數 / Enter a whole number」；RANGE「數值超出範圍 / Value out of range」。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/poker-odds-calculator/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 成牌評估：以點數計數與花色位元遮罩直接評估 5–7 張牌的最佳 5 張（不枚舉 C(n,5) 子集亦可，但結果須與枚舉一致；測試須含皇家同花順、輪子順、葫蘆、三對等邊界牌型）。花色位元遮罩以點數 2–A 對應位元 0–12。
- outs 計算：對每張未見牌，依 §5 第 6 步的六條轉換規則判定是否計入，取聯集。不得以查表代替計算；§5 的聽牌對照表（同花聽牌 9、兩頭順 8、卡順 4、雙卡順 8、一對聽三條 2、兩對聽葫蘆 4、三條聽葫蘆／四條翻牌 7／轉牌 10）只是上述規則的推論，供核對用。
- 勝率方法選擇（釘版）：情境數 = C(R, 2k) × C(R − 2k, c)，其中 R 為未見牌數、k 為對手人數、c 為待補公共牌數。情境數 ≤ 2,000,000 時精確枚舉全部情境；否則蒙地卡羅 100,000 次試驗。對照表：翻牌前任何人數皆蒙地卡羅（1 位對手即 C(50,2) × C(48,5) = 2,097,572,400）；翻牌圈 1 位對手精確枚舉（C(47,2) × C(45,2) = 1,070,190），≥ 2 位蒙地卡羅（2 位即 161,063,595）；轉牌圈 1 位對手精確枚舉（C(46,2) × 44 = 45,540），≥ 2 位蒙地卡羅（2 位即 6,853,770）；河牌圈 1 位對手精確枚舉（C(45,2) = 990），2 位精確枚舉（C(45,4) = 148,995），≥ 3 位蒙地卡羅（3 位即 8,145,060）。枚舉時對手組合與補牌皆按 §5 牌組順序的字典序產生。
- 蒙地卡羅（釘版）：PRNG 為 mulberry32，種子固定為 20261121，試驗數固定 100,000。mulberry32 遞迴為 state += 0x6D2B79F5（32 位元無號溢出）；t = imul(state ^ (state >>> 15), state | 1)；t = (t + imul(t ^ (t >>> 7), t | 61)) ^ t；回傳 (t ^ (t >>> 14)) / 4294967296。發牌為不放回順序抽取：剩餘牌按牌組順序排列，依序抽對手手牌（對手 1 兩張、對手 2 兩張……），再抽待補公共牌；每次抽牌序號為 floor(rand() × 剩餘張數)。相同輸入必得相同輸出。95% 信賴區間半寬為 1.96 × √(p(1−p)/100000)，最差情況（p = 0.5）為 0.31 個百分點；頁面在蒙地卡羅結果旁標示「蒙地卡羅估計，95% 信賴區間半寬至多 ±0.31 個百分點 / Monte Carlo estimate, 95% CI half-width at most ±0.31 pp」。精確枚舉結果不帶信賴區間。
- 2/4 法則（近似，釘版）：只作參考顯示。誤差實測（精確值對照近似值）：outs 9 單張 19.15% 對 18%（−1.15pp），兩張 34.97% 對 36%（+1.03pp）；outs 8 單張 17.02% 對 16%（−1.02pp），兩張 31.45% 對 32%（+0.55pp）；outs 4 單張 8.70% 對 8%（−0.70pp）；outs 2 單張 4.26% 對 4%（−0.26pp），兩張 8.42% 對 8%（−0.42pp）；outs 15 單張 31.91% 對 30%（−1.91pp），兩張 54.12% 對 60%（+5.88pp）——outs 越大，兩張近似的誤差越大。2/4 法則絕不參與權益或提示計算。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算勝率」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
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
| `flush-draw-flop` | 同花聽牌 9 outs、命中率與精確枚舉勝率 |
| `oesd-flop` | 兩頭順聽牌 8 outs、命中率與精確枚舉勝率 |
| `gutshot-turn` | 卡順聽牌轉牌圈 4 outs、只剩一張牌 |
| `set-draw-flop` | 一對聽三條 2 outs |
| `preflop-aces` | 翻牌前 AA 無 outs、種子蒙地卡羅勝率 |
| `river-equity-call` | 河牌圈勝率 89.34%、底池賠率 3:1、提示跟注 |
| `river-equity-fold` | 河牌圈勝率 89.34%、損益平衡 90.00%、提示棄牌 |
| `quads-turn` | 轉牌圈四條，僅 3 種對手組合能贏 |
| `two-pair-flop` | 兩對聽葫蘆 4 outs |
| `card-format` | 無效牌碼 Xh |
| `duplicate-card` | 公共牌與手牌重複 |
| `board-count` | 公共牌 2 張不在 0/3/4/5 之列 |
| `opponents-range` | 對手人數 10 超出 1–9 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 boardCards 0/3/4/5 張、boardCards 1/2/6 張、opponents 1/9/10、holeCards 1/3 張、重複牌、pot/toCall 邊界 0 與 1,000,000,000、toCall 為 0 的免費跟注、pot/toCall 任一未填時無提示。所有已接受的 outs 不超出未見牌數；翻牌前 outs 為 null、河牌圈 outs 為 0；最終成牌分布各值合計在 99.99–100.01 之間（捨入所致）。

候選 gate（均 NOT_RUN）

- 於 `tools/poker-odds-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「德州撲克勝率」，title「德州撲克勝率｜Gloss Tools」，description「輸入手牌與公共牌，算出 outs、命中率、對戰勝率與底池賠率提示。」。英文 lang=en，H1 “Poker Odds Calculator”，title “Poker Odds Calculator | Gloss Tools”，description “Enter hole and board cards to get outs, hit rates, win equity against N opponents, and a pot-odds call/fold hint.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。2/4 法則準嗎？只是近似值，outs 越大誤差越大，精確命中率請看超幾何公式的數字。 / Is the rule of 2/4 exact? No, it is only an approximation; the error grows with more outs. See the exact hypergeometric hit rate.
- FAQ。為什麼勝率假設對手是隨機手牌？因為對手的手牌未知，本工具不依行動推斷手牌範圍。 / Why does equity assume random opponent hands? Opponents' hole cards are unknown, and this tool does not infer hand ranges from actions.
- FAQ。河牌圈還能算 outs 嗎？沒有牌可發了，outs 為 0，勝率只由對手兩張牌的組合決定。 / Are there outs on the river? No cards are left to come, so outs are 0; equity comes only from opponents' hole-card combinations.
- FAQ。跟注提示是保證嗎？不是。提示只是把權益與底池賠率的損益平衡點比較，屬於期望值參考。 / Is the call/fold hint a guarantee? No. It only compares equity with the pot-odds break-even point, as an expected-value reference.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://poker-odds-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線以開工前重讀的遠端規則、registry、基線和既有 owner 為準，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/poker-odds-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

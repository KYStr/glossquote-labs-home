# 麻將台數計算機 / Mahjong Score Calculator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-mahjong-score-calculator-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

家庭麻將一局胡牌後，玩家要立刻知道這局幾台、每人付多少，但口頭計台常因「門清自摸算 2 台還是 3 台」「大三元能不能再疊三元刻」「莊家連莊多算幾台」而爭執。本工具把一份事先講明的固定規則——**台灣十六張麻將．一般家庭場慣例**（下稱「本規則」）——做成勾選清單：玩家逐項勾出胡牌的牌型與情境，工具依固定順序處理合併、取代與不重複計台，列出逐台明細與總台，再依「底＋台×每台金額」算出自摸三家各付、放槍一家付的金額。

- 桌面。牌桌旁的平板或筆電，勾選牌型、輸入底與每台金額，逐項核對台數明細再對帳。
- 行動。手機在牌局空檔輸入這一局的胡牌內容，截圖結果給其他三家看，不必口頭重算。

使用情境為家庭娛樂計台。資料只保留在目前頁面草稿，不涉及真實金錢交易。

## scope

本規則只認下列固定台數表與固定互動規則；表外牌型一律不計，不得由實作自行增補。規則來源與版本：本文即本規則的固定版本（v1, 2026-11-09），取台灣十六張麻將一般家庭場的通行計台慣例（門清自摸合併 3 台、三元刻每刻 1 台、大三元 8 台、清一色 8 台、字一色 16 台等），凡家庭場有分歧的項目，本文以「可自訂台數」欄位處理，並在表中標明預設值。非目標為：判斷實際牌張是否成胡或牌型是否成立（牌型成立由使用者勾選時自行確認）、三色同順、三色同刻（日式／中式變體，台灣十六張家庭場不採）、天胡、地胡、人和、十三么、七對子（十六張為五組牌型）、連莊差額分付（莊家台僅併入總台，不做三家差額）、多局記分、帳本、賽事規則、線上對戰、真實金錢交易。

已比對既有規格與工具，最相近者的實質差異如下。

- 通用遊戲之夜計分板：手動輸入與累計任意遊戲的分數。此處依一份固定麻將規則，由胡牌特徵推導台數與付款。game-night-scorecard（`tools/` 候選）。
- 擲骰／選號類遊戲工具（dice-sum-distribution、decision-wheel-picker）：處理機率或隨機選擇。此處是確定性的規則查表與金額計算，無隨機成分。

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「胡牌方式與莊家 / Win method and dealer」：胡牌方式（自摸／放槍）單選、胡牌者是否莊家、放槍者是否莊家（放槍時才啟用）、連莊次數。
- 欄位或說明「牌型 / Hand patterns」：字一色、大三元、小三元、清一色、混一色、碰碰胡、平胡、五門齊、全求人等勾選。
- 欄位或說明「情境 / Situational」：門清、天聽、地聽、槓上開花、海底撈月、河底撈魚、搶槓等勾選（自摸由胡牌方式帶入，不另設勾選）。
- 欄位或說明「風台與三元刻 / Winds and dragon pungs」：門風刻、圈風刻、紅中刻、發財刻、白板刻勾選。
- 欄位或說明「花台與槓台 / Flowers and kongs」：正花朵數、偏花朵數、花槓、七搶一、八仙過海勾選、槓數。
- 欄位或說明「金額與上限 / Stakes and cap」：底、每台金額、台數上限（無上限／8／12／16）。
- 可自訂台數的項目，在各項目旁以數字欄顯示目前台數（預設為表中值），改值即屬輸入變更。
- 「計算台數與金額 / Calculate tai & payout」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「台數明細與付款 / Tai breakdown and payout」先摘要（總台、封頂後計付台數、每人金額）再列明細：計台項目逐列（名稱、台數）、被排除項目逐列（名稱、排除原因），長表在有 label 的區域捲動。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、勾選、自訂台數或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。零計台項目時顯示「沒有計台項目 / No scoring items」並仍給出僅含底的付款。被排除項目以文字及符號提示原因，不用顏色單獨表達。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"winMethod":"discard","winnerIsDealer":false,"discarderIsDealer":false,"dealerStreak":"0","base":"100","perTai":"50","cap":"none","selected":{},"honorFlowers":"0","offFlowers":"0","kongCount":"0","overrides":{}}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知欄位、缺必要欄、錯型別、accessor 皆依下文驗證順序回報。JSON fixture 即介面。

### 固定台數表（本規則 v1）

「可勾選」項目由使用者在 `selected` 以項目代碼勾選；「衍生」項目由核心依其他輸入推導，不出現在 `selected`。「可自訂」項目的台數可由 `overrides` 改值，預設即表中值；未標可自訂者台數固定。

| 代碼 | 繁中名稱 | English | 台 | 類別 | 備註 |
| --- | --- | --- | ---: | --- | --- |
| ALL_HONORS | 字一色 | All Honors | 16 | 可勾選 | 全為風牌與三元牌 |
| BIG_DRAGONS | 大三元 | Big Three Dragons | 8 | 可勾選 | 三組三元刻齊全 |
| SMALL_DRAGONS | 小三元 | Small Three Dragons | 4 | 可勾選 | 兩組三元刻＋一對三元將 |
| FULL_FLUSH | 清一色 | Full Flush | 8 | 可勾選 | 全為同一門數字牌 |
| HALF_FLUSH | 混一色 | Half Flush | 4 | 可勾選 | 一門數字牌＋字牌 |
| ALL_PUNGS | 碰碰胡 | All Pungs | 4 | 可勾選 | 五組皆刻／槓 |
| PING_HU | 平胡 | All Sequences | 2 | 可勾選・可自訂 | 成立條件見下 |
| FIVE_SUITED | 五門齊 | All Five Categories | 1 | 可勾選・可自訂 | 萬、筒、條、風、三元皆有 |
| ALL_FROM_ONE | 全求人 | All Exposed | 2 | 可勾選 | 全副露且單吊聽牌、由他家放槍胡牌 |
| MENQING | 門清 | Concealed Hand | 1 | 可勾選 | 未副露（花牌不影響門清） |
| SELF_DRAW | 自摸 | Self Draw | 1 | 衍生 | `winMethod="self-draw"` 時成立 |
| MENQING_SELF_DRAW | 門清自摸 | Concealed Self Draw | 3 | 衍生 | 門清且自摸時，取代 MENQING 與 SELF_DRAW 兩列合併計 3 |
| HEAVENLY_LISTEN | 天聽 | Heavenly Ready | 8 | 可勾選・可自訂 | 莊家配牌即聽或閒家第一次摸牌前已聽，由使用者確認 |
| EARTHLY_LISTEN | 地聽 | Earthly Ready | 4 | 可勾選・可自訂 | 第一巡內宣告聽牌，由使用者確認 |
| KONG_WIN | 槓上開花 | Win on Kong Supplement | 1 | 可勾選 | 槓後補花／補牌自摸胡牌 |
| LAST_TILE_SELF | 海底撈月 | Last Tile Self Draw | 1 | 可勾選 | 摸最後一張牌自摸胡牌 |
| LAST_TILE_DISCARD | 河底撈魚 | Last Tile Discard | 1 | 可勾選 | 最後一張捨牌放槍胡牌 |
| ROB_KONG | 搶槓 | Robbing the Kong | 1 | 可勾選 | 他家槓牌時以該牌胡牌 |
| SEAT_WIND_PONG | 門風刻 | Seat Wind Pung | 1 | 可勾選 | 自家門風的刻／槓 |
| ROUND_WIND_PONG | 圈風刻 | Round Wind Pung | 1 | 可勾選 | 當圈圈風的刻／槓；與門風同刻時兩者可同時勾選（雙風刻共 2 台） |
| DRAGON_RED | 紅中刻 | Red Dragon Pung | 1 | 可勾選 | 紅中刻／槓 |
| DRAGON_GREEN | 發財刻 | Green Dragon Pung | 1 | 可勾選 | 發財刻／槓 |
| DRAGON_WHITE | 白板刻 | White Dragon Pung | 1 | 可勾選 | 白板刻／槓 |
| HONOR_FLOWERS | 正花 | Honor Flowers | 每朵 1 | 計數・每朵可自訂 | 與自家門風對應的花／季牌朵數；春夏秋冬對應東南西北、梅蘭竹菊對應東南西北 |
| FLOWER_KONG | 花槓 | Flower Set | 1 | 可勾選・可自訂 | 集滿一組四朵同類花（春夏秋冬或梅蘭竹菊），由使用者確認 |
| SEVEN_ROB_ONE | 七搶一 | Seven Flowers Rob One | 8 | 可勾選 | 自家已集七朵花，搶他家補花的第八朵成立 |
| ALL_FLOWERS | 八仙過海 | All Eight Flowers | 8 | 可勾選 | 自家集滿八朵花／季牌 |
| THREE_KONGS | 三槓子 | Three Kongs | 2 | 衍生・可自訂 | `kongCount=3` 時成立 |
| FOUR_KONGS | 四槓子 | Four Kongs | 5 | 衍生・可自訂 | `kongCount=4` 時成立，取代三槓子 |
| DEALER | 莊家 | Dealer | 1＋連莊數 | 衍生 | 計算條件見下 |

平胡成立條件（使用者勾選即表示確認三項皆成立）：(1) 五組全為順子、將為一對；(2) 將眼不是三元牌，也不是自家門風或當圈圈風；(3) 無任何花牌（正花、偏花皆無，且未勾花槓、七搶一、八仙過海）。本規則不另要求雙面聽。

偏花（`offFlowers`）每朵 0 台，只在結果中回顯朵數，不產生計台列。

### 輸入欄位

- `winMethod`：`"self-draw"`（自摸）或 `"discard"`（放槍），必填。
- `winnerIsDealer`、`discarderIsDealer`：布林，必填。`winMethod="self-draw"` 時 `discarderIsDealer` 仍須存在但完全忽略（不驗證其與結果的關係）。放槍且胡牌者與放槍者皆非莊家時，莊家台為 0。
- `dealerStreak`：連莊次數，整數字串 0–8。
- `base`（底）：整數字串 0–100000（元）。`perTai`（每台金額）：整數字串 0–10000（元）。
- `cap`：`"none"`（無上限）、`"8"`、`"12"`、`"16"`，必填，UI 預設 `"none"`。
- `selected`：普通物件，鍵必須屬於可勾選代碼集合（上表「可勾選」24 項：ALL_HONORS、BIG_DRAGONS、SMALL_DRAGONS、FULL_FLUSH、HALF_FLUSH、ALL_PUNGS、PING_HU、FIVE_SUITED、ALL_FROM_ONE、MENQING、HEAVENLY_LISTEN、EARTHLY_LISTEN、KONG_WIN、LAST_TILE_SELF、LAST_TILE_DISCARD、ROB_KONG、SEAT_WIND_PONG、ROUND_WIND_PONG、DRAGON_RED、DRAGON_GREEN、DRAGON_WHITE、FLOWER_KONG、SEVEN_ROB_ONE、ALL_FLOWERS），值必須為布林；缺鍵視為 false。未知鍵或非布林值為 SCHEMA。
- `honorFlowers`（正花朵數）：整數字串 0–8。`offFlowers`（偏花朵數）：整數字串 0–8。兩者合計不得超過 8。
- `kongCount`（槓數）：整數字串 0–4。
- `overrides`：可省略（視為 `{}`）。普通物件，鍵必須屬於可自訂代碼集合（PING_HU、FIVE_SUITED、HEAVENLY_LISTEN、EARTHLY_LISTEN、FLOWER_KONG、HONOR_FLOWER_EACH、THREE_KONGS、FOUR_KONGS），值為整數字串 0–99。HONOR_FLOWER_EACH 為正花每朵台數（預設 1）。未知鍵為 SCHEMA。

數值字串文法：全為 ASCII 十進位，0 或非零開頭，無空白／符號／小數／指數；非 ASCII 數字字元（如全形數字）不合文法。raw 每欄最多 8 字元。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名；`selected` 內問題 field 為 `selected/<CODE>`、`overrides` 內問題 field 為 `overrides/<CODE>`；row 一律 null（本工具無列輸入）。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。本工具無自由文字輸入，無 UNICODE 錯誤面；列舉值外的字串依 ENUM／SCHEMA 處理。

### 驗證順序（固定，第一個失敗即回報）

1. 容量：依 base、perTai、dealerStreak、honorFlowers、offFlowers、kongCount 的欄位順序，再依可自訂代碼順序（PING_HU、FIVE_SUITED、HEAVENLY_LISTEN、EARTHLY_LISTEN、FLOWER_KONG、HONOR_FLOWER_EACH、THREE_KONGS、FOUR_KONGS）檢查 `overrides` 值；任一為字串且長度逾 8 字元 → INPUT_LIMIT（field 為該欄；overrides 欄為 `overrides/<CODE>`）。非字串值不在此階段判定。
2. 結構（SCHEMA）：input 須為普通物件、只讀 own data；必要欄位齊全（winMethod、winnerIsDealer、discarderIsDealer、dealerStreak、base、perTai、cap、selected、honorFlowers、offFlowers、kongCount）；無未知頂層鍵；winnerIsDealer／discarderIsDealer 為布林；selected／overrides 為普通物件且鍵、值型別合上文。field 為出問題的路徑，整體形狀錯誤時 field=null。
3. 列舉（ENUM）：winMethod、cap 依序檢查，值不在允許集合 → ENUM，field 為欄位名。
4. 數值文法與範圍：依 base、perTai、dealerStreak、honorFlowers、offFlowers、kongCount 順序，再依可自訂代碼順序檢查 overrides 值。空字串 → EMPTY；文法不合 → INTEGER_FORMAT；超出各欄範圍 → RANGE。
5. 跨欄：honorFlowers＋offFlowers > 8 → FLOWER_LIMIT，field=`offFlowers`。
6. 邏輯衝突（CONFLICT），依下列順序檢查，第一個命中即回報：
   - C1 門清 × 全求人（全求人須全副露，與門清不能並存）→ field=`ALL_FROM_ONE`。
   - C2 平胡 × 碰碰胡（全順子與全刻不能並存）→ field=`ALL_PUNGS`。
   - C3 平胡 × 花（honorFlowers>0、offFlowers>0、FLOWER_KONG、SEVEN_ROB_ONE、ALL_FLOWERS 任一成立，違反平胡無花條件）→ field=`PING_HU`。
   - C4 平胡 × 刻類：依 SEAT_WIND_PONG、ROUND_WIND_PONG、DRAGON_RED、DRAGON_GREEN、DRAGON_WHITE 順序，第一個被勾選者 → field=該代碼。
   - C5 平胡 × 槓（kongCount ≥ 1）→ field=`kongCount`。
   - C6 五門齊 × 一色類：依 ALL_HONORS、FULL_FLUSH、HALF_FLUSH 順序，第一個被勾選者命中即報 → field=`FIVE_SUITED`（五門齊須三門數字牌皆備，與字一色／清一色／混一色不能並存）。
   - C7 天聽 × 地聽 → field=`EARTHLY_LISTEN`。

### 互動處理順序（驗證通過後，固定順序）

被排除項目不計台，並在結果 `excluded` 以 `{code, reason}` 依下列處理順序逐項列出；reason 為 SUPERSEDED（被更高位階同類項目取代）、SUBSUMED（已被大項內含）、METHOD_MISMATCH（與胡牌方式不符）、FLOWERS_SUBSUMED（花台已被大項內含）。

- E1 字一色成立 → 排除 HALF_FLUSH（SUPERSEDED）、FULL_FLUSH（SUPERSEDED）、ALL_PUNGS（SUBSUMED；字一色必然全刻，不另計碰碰胡）。清一色／混一色與字一色不同時計台。
- E2 否則清一色成立 → 排除 HALF_FLUSH（SUPERSEDED；混一色不與清一色重複計）。
- E3 大三元成立 → 排除 DRAGON_RED、DRAGON_GREEN、DRAGON_WHITE（皆 SUBSUMED，不重複計三元刻），並排除 SMALL_DRAGONS（SUPERSEDED）。
- E4 否則小三元成立 → 排除 DRAGON_RED、DRAGON_GREEN、DRAGON_WHITE（皆 SUBSUMED）。
- E5 八仙過海成立 → 排除正花逐朵計台（excluded 代碼 HONOR_FLOWERS，reason FLOWERS_SUBSUMED）、FLOWER_KONG（SUBSUMED）、SEVEN_ROB_ONE（SUPERSEDED）。
- E6 否則七搶一成立 → 排除正花逐朵計台（HONOR_FLOWERS／FLOWERS_SUBSUMED）、FLOWER_KONG（SUBSUMED）。
- E7 胡牌方式不符：`winMethod="discard"` → 排除 LAST_TILE_SELF、KONG_WIN（皆 METHOD_MISMATCH）；`winMethod="self-draw"` → 排除 LAST_TILE_DISCARD、ROB_KONG，以及未被 E5／E6 排除的 SEVEN_ROB_ONE（皆 METHOD_MISMATCH；七搶一的成立方式為搶他家花牌）。
- E8 門清自摸合併：MENQING 成立且 `winMethod="self-draw"` → 不列 MENQING 與 SELF_DRAW 兩列，改列 MENQING_SELF_DRAW 一列計 3 台（固定值，不受 overrides 影響）。僅門清 → MENQING 1 台；僅自摸 → SELF_DRAW 1 台。

槓台為衍生：kongCount=3 列 THREE_KONGS、=4 列 FOUR_KONGS（取代三槓子）、0–2 不列。莊家台為衍生：winnerIsDealer 為真 → DEALER 列計 1＋dealerStreak；否則 winMethod="discard" 且 discarderIsDealer 為真 → DEALER 列計 1＋dealerStreak（此台併入總台，由放槍的莊家在付款中承擔）；其餘情形不列、莊家台 0。花牌不影響門清判定。

### 計台列順序與結果

計台列 `lines` 依固定顯示順序輸出，只含實際成立且未被排除、台數大於 0 的項目（HONOR_FLOWERS 僅在 honorFlowers>0 且未被排除時列，含 `count`）：牌型（ALL_HONORS、BIG_DRAGONS、SMALL_DRAGONS、FULL_FLUSH、HALF_FLUSH、ALL_PUNGS、PING_HU、FIVE_SUITED、ALL_FROM_ONE）→ 情境（MENQING_SELF_DRAW、MENQING、SELF_DRAW、HEAVENLY_LISTEN、EARTHLY_LISTEN、KONG_WIN、LAST_TILE_SELF、LAST_TILE_DISCARD、ROB_KONG）→ 風台（SEAT_WIND_PONG、ROUND_WIND_PONG）→ 三元刻（DRAGON_RED、DRAGON_GREEN、DRAGON_WHITE）→ 花台（HONOR_FLOWERS、FLOWER_KONG、SEVEN_ROB_ONE、ALL_FLOWERS）→ 槓台（THREE_KONGS、FOUR_KONGS）→ 莊家（DEALER）。每列為 `{code, tai}`，HONOR_FLOWERS 列另含 `{count}`，其 tai＝count×每朵台數；DEALER 列 tai＝1＋連莊數。

- `handTai`＝lines 中扣除 DEALER 列的台數總和。`dealerTai`＝DEALER 列台數（無則 0）。`totalTai`＝handTai＋dealerTai。
- 封頂：cap 為 `"none"` 時 `paidTai=totalTai`、`capped=false`；否則 `paidTai=min(totalTai, cap 數值)`、`capped = paidTai < totalTai`。封頂作用於含莊家台的總台之後。
- 付款：`unit = base ＋ paidTai × perTai`（整數元，無捨入；所有值在輸入上限內為安全整數，不需浮點）。自摸：`payout={winMethod:"self-draw", unitAmount:unit, fromEachOpponent:unit, totalReceived:3×unit}`（三家各付 unit，含莊家，不另做差額）。放槍：`payout={winMethod:"discard", unitAmount:unit, fromDiscarder:unit, totalReceived:unit}`（僅放槍者付 unit）。
- 結果 `{lines, excluded, flowers:{honor, off}, kongs, handTai, dealerTai, totalTai, paidTai, capped, payout}`，其中 flowers 為正花／偏花朵數回顯，kongs 為 kongCount 數值。機器值不隨 locale 改。

固定下載 `mahjong-score-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/mahjong-score-calculator/`。src/core.mjs 放純驗證、固定台數表、互動處理、計台與付款推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 台數表以固定資料常數存在於 core，項目代碼、預設台數、顯示順序、互斥與合併規則皆由此表與本文順序推導；UI 不得另寫一份規則。所有金額與台數為整數運算，無浮點、無捨入。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算台數與金額」，畫面和完整報告符合核心 fixtures（含門清自摸合併、大三元不重複計、莊家付款、封頂），使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、花朵合計上限、第一個錯誤、衝突優先序與三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯（含每個計台項目與排除原因）、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。10 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `menqing-self-draw` | 門清＋自摸合併計 3 台，三家各付 |
| `big-dragons-exclusion` | 大三元排除三元刻不重複計 |
| `dealer-discard-payout` | 莊家放槍、連莊 1，莊家台併入由放槍者付 |
| `cap-applies` | 清一色＋門清自摸＋莊家共 12 台，封頂 8 台計付 |
| `flush-supersede` | 清一色取代混一色，碰碰胡照計 |
| `flowers-and-kongs` | 正花逐朵、花槓、三槓子與槓上開花 |
| `conflict-menqing-all-from-one` | 門清 × 全求人衝突錯誤 |
| `flower-total-limit` | 正花＋偏花逾 8 朵錯誤 |
| `method-mismatch-exclusion` | 放槍時海底撈月被排除、搶槓照計 |
| `small-dragons-override` | 小三元內含三元刻、地聽自訂 5 台 |
| `state-dirty-error` | 先產出真結果，再改為衝突輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、未知勾選代碼、未知自訂代碼、惡意字串、快速改值及晚到訊息。驗證 base／perTai 為 0 時 unit 為 0、cap 等於 totalTai 時 capped=false、字一色排除清／混一色與碰碰胡、八仙過海排除逐朵花台、雙風刻兩列並存、overrides 改值後重算。

候選 gate（均 NOT_RUN）

- 於 `tools/mahjong-score-calculator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「麻將台數計算機」，title「麻將台數計算機｜Gloss Tools」，description「依台灣十六張麻將一般家庭場慣例，勾選胡牌的牌型與情境，自動處理門清自摸合併與不重複計台，算出總台數與自摸、放槍的每人付款金額。」。英文 lang=en，H1 “Mahjong Score Calculator”，title “Mahjong Score Calculator | Gloss Tools”，description “Score a Taiwan 16-tile mahjong winning hand from a fixed family-game tai table, with combined and non-stacking rules applied, and get the per-player payout for self-draw and discard wins.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息；每個計台項目名稱與排除原因皆有雙語對譯（見固定台數表與互動處理順序）。
- FAQ。門清自摸為什麼是 3 台，不是 2 台？本工具採一般家庭場慣例，門清與自摸合併計 3 台，不拆成 1＋1。 / Why is a concealed self-draw 3 tai, not 2? Under the common family rules used here, concealed hand and self draw combine into a single 3-tai item instead of 1 + 1.
- FAQ。我家的台數算法不一樣怎麼辦？平胡、五門齊、天聽、地聽、花槓、正花每朵、三槓子與四槓子的台數可在項目旁改值；其餘項目依本文固定表。 / What if our house counts differently? The tai values for All Sequences, All Five Categories, Heavenly/Earthly Ready, Flower Set, each honor flower, and Three/Four Kongs can be edited next to each item; all other items follow the fixed table in this spec.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://mahjong-score-calculator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。規格任務 `labs-mahjong-score-calculator-spec-20261109`（由主代理登記）。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/mahjong-score-calculator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。

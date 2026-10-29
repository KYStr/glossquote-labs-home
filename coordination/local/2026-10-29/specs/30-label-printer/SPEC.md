# 物品標籤列印 — 既有規格保存

Task ID: `labs-30-label-printer` · Spec ID: `spec-30-label-printer`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格：物品標籤列印（Item Label Printer）

狀態：**規格，尚未實作。** 頻率與市場需求尚未驗證；本文件只定義一個窄而可核對的本機工具。

## 問題與成功結果

使用者手上有一份物品名稱清單，想把每個名稱印出指定份數，排在一般 A4 或 Letter 紙上，再手動裁切。成功時，使用者看得到按名稱順序展開的完整預覽、總份數和頁數，並可在明確操作後打開瀏覽器原生列印對話框。

所有清單列使用同一個 copies 數值。每個物品的 copies 份連續排列，再接下一個物品。名稱重複也保留；不合併、不排序、不猜測使用者想要的列印數。

## 範圍與非目標

初版包含兩語單頁工具、四種固定普通紙版型、輸入驗證、分頁預覽、清除、顯示列印提示和明確的原生列印操作。頁面尺寸及版型由固定 CSS class 決定，不接受使用者尺寸、不使用 inline style 或任意 CSS 值。

不提供商用預裁貼紙或品牌紙張的精準套版，不承諾任何印表機的紙張邊界精度，不提供 QR code、條碼、圖片或檔案匯入、下載、剪貼簿、草稿保存、帳號、批次雲端處理或外部服務。

## 可觀察需求

### FR-01 — 初始畫面與明確預覽

繁中和英文頁面初始都顯示空白名稱清單、每項份數 1 和 A4 2×7 固定版型，不預填物品或自動打開列印。使用者按「載入範例」才填入清楚標為假資料的範例；載入範例也不自動建立預覽。

使用者按「建立預覽 / Build preview」後，工具才驗證輸入並建立分頁。無效資料只顯示可修復的錯誤，不產生部分預覽。空白清單不可列印。

### FR-02 — 名稱清單解析

輸入是一個多行文字欄位，每個非空白行代表一個名稱。輸入 UTF-8 原始內容最多 10 KiB。解析前將 CRLF 和單獨 CR 都轉成 LF，再依 LF 分行；每行套用 ECMAScript String.prototype.trim。trim 後空行丟棄，名稱的原順序和重複內容保留。

每個保留名稱 trim 後需為 1–80 個 Unicode code points。拒絕孤立 UTF-16 surrogate、U+0000–U+001F、U+007F–U+009F，以及名稱中間的 U+2028/U+2029；輸入的 LF/CR 行分隔符已先處理，不視為名稱內控制字元。不得以 HTML、Markdown 或 CSS 解讀名稱。Unicode 不做 NFC/NFD 正規化。

### FR-03 — 每項份數與總量

「每項份數 / Copies per item」是所有非空名稱共用的一個值，必填。原始值是最多兩個字元的 ASCII 十進位整數；只接受 1–20 的標準寫法，不接受前導零、空白、符號、小數點、科學記號、逗號或全形數字。

展開後的標籤總數不得超過 300。超過時整次預覽失敗；不得截斷尾項或只建立部分頁面。原始名稱文字最多 10 KiB；此邊界不因空白列最後會移除而放寬。

### FR-04 — 固定版型和分頁

使用者只能從四項固定版型選一項：

| 代號 | 紙張方向 | 欄 × 列 | 每頁容量 |
|---|---|---:|---:|
| A4 2×7 | A4 直向 | 2 × 7 | 14 |
| A4 3×8 | A4 直向 | 3 × 8 | 24 |
| Letter 2×7 | Letter 直向 | 2 × 7 | 14 |
| Letter 3×8 | Letter 直向 | 3 × 8 | 24 |

所有版型固定頁邊 10 mm、標籤間隙 2 mm。頁數等於標籤總數除以容量後向上取整。名稱依清單順序展開，每個名稱連續放入指定份數。最後一頁剩餘格保持空白，只畫裁切邊界，不重複上一個名稱，也不複製整頁。

### FR-05 — 預覽失效和列印

預覽顯示紙張、選定版型、清單順序、每項副本、頁數及空白格。標籤內容只按純文字顯示；長文字在格內換行，不得覆蓋相鄰格或擴大紙張。

任何名稱、份數或版型變更都在同一事件循環清除舊預覽並停用列印；使用者必須重新建立預覽。只有目前輸入成功產生的預覽可以按「列印標籤 / Print labels」呼叫 window.print()，且必須由使用者明確點擊。頁面不得載入後自動列印。

列印說明要求選擇相同紙張、縮放 100%、關閉頁首頁尾，先印普通紙測量。工具不宣稱瀏覽器、驅動程式或印表機會保留精確毫米尺寸；原生預覽與實體尺寸未測時標 NOT_RUN。

### FR-06 — 清除與語言

「清除 / Clear」只在有工作時先確認；有工作定義為 itemsRaw 非空、存在預覽，或份數／版型不同於初始預設 1／A4 2×7。取消完整保留表單和預覽；確認清除清單及預覽，並將份數重設為 1、版型重設為 A4 2×7，回到目前語言的初始狀態。若只有預設值、空清單且沒有預覽，不要求確認。

切換語言前說明會清除目前頁面資料。取消留在原語言並保留工作；確認導向同源另一語言固定頁，顯示空白初始畫面。不得把輸入放進 URL 以跨頁保存。

### FR-07 — 資料、安全與錯誤

名稱和份數只在目前頁面記憶體處理。頁面初次載入需要取得靜態網站檔案；後續計算是同步本機運算，不呼叫服務。不得使用 localStorage、sessionStorage、IndexedDB、Cache、Service Worker、cookie、URL、console、遙測、外部字型或網路 API。

使用者名稱以 textContent 或 value 呈現，不當成 HTML。精確輸入結構及大小限制見 [TECHNICAL.md](TECHNICAL.md)。錯誤使用固定 code/field 對照繁中或英文文案，不顯示原始輸入、例外或部分結果。

無 JavaScript 時保留靜態用途說明；表單控制維持 disabled，不能 GET 提交或誤導為已完成預覽。pagehide 清除輸入、預覽和暫存狀態；BFCache 還原後以空白狀態開始。

### FR-08 — 使用限制揭露

頁面須清楚寫明這是普通紙裁切用版型，不能保證配合特定預裁貼紙。列印結果可能受縮放、瀏覽器、印表機不可列印邊界和驅動程式影響。列印頁不包含工具表單或操作列。

## 預期使用環境

- 桌面使用者貼上短清單、核對預覽和頁數，使用一般印表機列印普通紙。
- 手機使用者可輸入並逐頁查看縮小預覽；工具不保證手機系統列印分享流程可用。
- 320 CSS px 和 200% 縮放下，表單與預覽以單欄呈現；預覽可在自身明確標示的紙張區域縮放或捲動，頁面操作不能被遮住。
- 無 JavaScript 時只能閱讀說明，不能運算或列印。
- 離線僅在頁面靜態資源已載入的目前分頁內可運算；首次載入或冷啟動離線不保證可用。
- 最高 300 個標籤是同步工作上限。一般低階裝置若尚未實測，須記錄 NOT_RUN，不宣稱效能保證。

產品級操作文案與版面見 [UX-SEO.md](UX-SEO.md)，獨立驗收值見 [ACCEPTANCE.md](ACCEPTANCE.md)。


---

## 原文件 TECHNICAL.md

# 技術規格：物品標籤列印

狀態：**規格，尚未實作。** Node.js 24+ ESM、原生瀏覽器 API 和 Node built-ins；不引入任何 runtime/dev/test package。共同工具鏈及安全約束見 docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md。

## 模組責任

核心提供純函式 calculateLabels(request)。它只驗證輸入並回傳固定 JSON 資料；不讀 DOM、環境、檔案、網路、時鐘或儲存。瀏覽器層負責表單狀態、固定版型 class、預覽和使用者明確觸發的原生列印。

建議分層：

- public/js/core/label-printer.mjs：命名匯出 calculateLabels；可由 Node 測試和瀏覽器 ESM 同路徑載入。
- public/js/app.mjs：事件、revision、雙語固定錯誤文案、DOM 建立。
- public/js/render.mjs：以 element.textContent/value 建構預覽，不把名稱解讀成標記。
- public/index.html 與 public/en/index.html：繁中和英文入口。
- public/assets/app.css：所有四種版型 class 和列印樣式；不使用 inline style。
- test/label-printer.test.mjs：獨立手寫預期值與錯誤測試。

檔名是後續實作預期的工具專屬範圍；若主代理在 M1 指示調整，只能在同一 milestone 記錄，不得擴大到共用檔案。

## 純函式輸入

calculateLabels 接收一個精確根結構，僅含三個 own 欄位：

| 欄位 | 型別 | 規則 |
|---|---|---|
| itemsRaw | string | UTF-8 原始位元組最多 10240；可有 CRLF、CR、LF |
| copiesRaw | string | 最多 2 字元；標準 ASCII 整數 1–20，不接受前導零 |
| presetId | string | a4-2x7、a4-3x8、letter-2x7、letter-3x8 之一 |

拒絕 null、陣列、非普通物件、未知 own 欄位、symbol own key、non-enumerable own key、accessor 欄位及缺欄位。欄位必須是 own enumerable data property；檢查 descriptors 時不得呼叫 getter。反射檢查若拋例外，回固定 schema error。輸入物件不修改。不得遍歷或回傳非預期欄位。

### 字串處理順序

1. 確認 itemsRaw 是字串，並先拒絕孤立高／低 surrogate；避免 UTF-8 encoder 以替代字元掩蓋錯誤。
2. 以 UTF-8 原始位元組計算長度，超過 10240 回錯。此長度包含 CR、LF 和尾端空白，且在任何換行正規化前計算。
3. copiesRaw 和 presetId 按固定格式及 enum 驗證。
4. 把 CRLF、單獨 CR 轉成 LF；依 LF split。對每行套用 ECMAScript String.prototype.trim。用正規化後的原始行索引報告錯誤，索引從 0 開始；trim 後空行丟棄。
5. 對保留行按順序檢查 Unicode Cc 控制範圍 U+0000–001F、U+007F–009F；另拒絕 U+2028/U+2029 以確保一個清單行只成為一個標籤。名稱按 Unicode code points 計數，範圍 1–80。不得做 Unicode 正規化。
6. 若無保留名稱，回 no_items。
7. 計算 totalLabels = itemCount × copiesPerItem。大於 300 回 too_many_labels；不截斷、不產生部分頁面。
8. 根據固定版型展開和分頁，回傳成功結果。

copiesRaw 只接受正規式語義 ^(?:[1-9]|1[0-9]|20)$。因此 1 和 20 合法；0、21 是範圍錯誤；01、空字串、前後空白、+1、1.0、1e0、全形數字是格式錯誤。

## 固定版型幾何

方向皆為直向。紙張尺寸、頁邊和間隙皆以 mm 表示；columns × rows 的乘積是每頁容量。

| presetId | 紙張寬 × 高 | 欄 × 列 | 容量 | 格寬 × 高（內容區平均分格） |
|---|---:|---:|---:|---:|
| a4-2x7 | 210 × 297 | 2 × 7 | 14 | 94 × 265/7（約 37.857142857） |
| a4-3x8 | 210 × 297 | 3 × 8 | 24 | 62 × 32.875 |
| letter-2x7 | 215.9 × 279.4 | 2 × 7 | 14 | 96.95 × 247.4/7（約 35.342857143） |
| letter-3x8 | 215.9 × 279.4 | 3 × 8 | 24 | 191.9/3（約 63.966666667） × 30.675 |

計算式：內容寬 = 紙張寬 − 2×10 − (columns−1)×2；內容高 = 紙張高 − 2×10 − (rows−1)×2；格寬／高分別是內容寬／高除以欄／列。CSS grid 按固定 class 和這個可重現公式均分，不把浮點結果注入 style 屬性。每個版型使用預先宣告的命名 @page 規則、紙張 size 和 10mm margin；標籤間隔 2mm。列印引擎支援和實際縮放需真實瀏覽器／印表機確認，未測項標 NOT_RUN。

UI 只允許四個靜態 class 對應 preset：preset--a4-2x7、preset--a4-3x8、preset--letter-2x7、preset--letter-3x8。class selector 固定選取既有 @page 名稱與 grid 欄列；不得由輸入、DOM style 屬性或任意 CSS 值形成版型。

## 輸出與錯誤契約

成功物件頂層只有 ok、result，ok 為 true。result 僅有以下欄位，均可 JSON.stringify：

- presetId：輸入的四種固定 ID 之一。
- paperSize：A4 或 Letter。
- columns、rows、capacity：固定整數版型資料。
- itemCount、copiesPerItem、totalLabels、pageCount：已驗證的整數。
- pages：長度恰為 pageCount 的陣列。
- 每頁恰含 pageIndex 和 slots；pageIndex 從 0 開始，slots 長度恰等於 capacity。
- slots 由已 trim 的標籤文字或 null 組成；資料依名稱順序展開，每項副本相鄰。末頁未使用格為 null。

pageCount = ceil(totalLabels / capacity)。因空清單拒絕，成功頁數最少為 1。沒有 BigInt、undefined、Date、DOM 值、原始整份 itemsRaw 或額外欄位。標籤名稱本身會出現在成功預覽資料中，僅留在目前頁面 memory。

錯誤物件固定為 {ok:false,error:{code,field}}；不回 result、message、原始文字或例外。固定 code/field 如下：

| code | field | 條件 |
|---|---|---|
| invalid_schema | request | 根物件或 own 欄位結構不符 |
| invalid_items_type | itemsRaw | itemsRaw 不是字串 |
| invalid_unicode | itemsRaw | itemsRaw 含孤立 surrogate |
| items_too_large | itemsRaw | 原始 UTF-8 位元組 > 10240 |
| invalid_copies_format | copiesRaw | 非 canonical ASCII 整數字串或長度 > 2 |
| copies_out_of_range | copiesRaw | 合法整數語法但值不是 1–20 |
| invalid_preset | presetId | 非四種固定版型之一 |
| item_control_character | itemsRaw.lines[n] | 原始正規化行索引 n 有禁止字元 |
| item_too_long | itemsRaw.lines[n] | trim 後超過 80 code points |
| no_items | itemsRaw | 所有行 trim 後皆空 |
| too_many_labels | totalLabels | 展開總數大於 300 |

若同一輸入有多個錯誤，依以下順序只回第一個：root schema、itemsRaw 型別/Unicode/bytes、copiesRaw 格式/範圍、presetId、逐行內容、no_items、totalLabels。UI 對 totalLabels 錯誤顯示於表單摘要並關聯名稱和份數控制。固定本地化訊息不得拼入原始輸入。

## 展開演算法

依保留的名稱陣列逐項處理；每個名稱連續追加 copiesPerItem 次。再按 capacity 分組為 pages。每頁固定長度 capacity；最後一頁尾端補 null。相同名稱仍依原行數分別展開，不 deduplicate。整個計算同步、純函式且最多輸出 300 個文字格，不需 worker 或外部函式庫。

## 頁面生命週期

初始 UI 固定為 itemsRaw 空字串、copiesRaw 字串 1、presetId a4-2x7、result null。表單和所有工作按鈕初始 disabled，input 不設定 name。初始化先同步註冊 submit capture listener，listener 第一個動作是 preventDefault，再註冊其他事件。所有 listener 和初始狀態成功後才啟用控制；初始化失敗時維持 disabled。無 JavaScript 時沒有 GET 提交。

每次輸入或 preset 變更，同步增加 revision 並將 result 設為 null、隱藏預覽、停用列印。建立預覽只能在當下完整驗證成功後替換整體結果；失敗清空舊結果。列印按鈕讀取當前 revision 的成功結果，只能從明確 click handler 呼叫 window.print()。

有工作定義為 itemsRaw 非空、result 存在、copiesRaw 不等於字串「1」，或 presetId 不等於 a4-2x7；預設份數 1 本身不構成有工作。清除確認取消時保留原工作；確認時清空 textarea、預覽、錯誤和 revision 狀態，將 copiesRaw 重設為字串「1」、presetId 重設為 a4-2x7，回目前語言初始表單。若清單空、沒有結果且兩個設定都仍為預設值，不要求確認。語言切換依 UX-SEO.md 先確認清除，再導覽固定同源 URL。pagehide 清空原始欄位、結果與暫存引用；BFCache persisted pageshow 初始化為空白新 generation，不復原資料。頁面沒有 object URL、非同步 clipboard、下載連結或保存資料。

## 安全和離線界線

使用者文字一律透過 textContent/value 建立，不使用 innerHTML、eval、Function 或動態 style。沒有 fetch/XHR/beacon、storage、cookie、URL 資料、外部字型、service worker 或 telemetry。CSP、安全標頭、static server 和完整 Network/Storage gate 見 docs/PRIVACY-SECURITY.md、docs/ENGINEERING.md。

首次開頁仍要載入靜態資源。資源已載入的目前分頁可在記憶體運算；不承諾離線冷啟動或永久離線。HTTP preview 和正式 Hosting 的驗收依 docs/RELEASE.md；M0 不表示任何一項已執行。


---

## 原文件 UX-SEO.md

# 使用者介面與 SEO 規格：物品標籤列印

狀態：**規格，尚未實作。** Surface mode：Product App。頁面讓使用者貼上名稱、選擇份數和普通紙版型，再核對可列印結果；不做通用 SaaS hero。

## 使用者流程

1. 初始為空白表單；使用者逐行貼上名稱，設定每個名稱相同的份數，選一種 A4 或 Letter 版型。
2. 看見清楚的 10 KiB、每行 80 字、份數 1–20、總標籤不超過 300 限制。
3. 按「建立預覽 / Build preview」。格式或數量錯誤時只顯示可修復錯誤，不產生部分頁面。
4. 核對標籤順序、副本分組、紙張、欄列、頁數和最後一頁空格。
5. 按「列印標籤 / Print labels」才呼叫原生列印；列印視窗選同一紙張、100% 縮放並關閉頁首頁尾。先用普通紙核對後裁切。
6. 初始預設為空名稱清單、每項份數 1、A4 2×7；任何輸入或版型改動都淘汰預覽，需重新建立。清除或切換語言按確認後回初始狀態。

頁面明說「一般紙張裁切用版型，並非特定預裁貼紙套版；瀏覽器或印表機可能改變實際尺寸」。原生列印和紙張尺寸若未實測，文件和 UI 不得稱已驗證。

## 桌面工作區草圖

    ┌────────────────────────────────────────────────────────────────────┐
    │ Gloss Tools / 物品標籤列印              English　返回繁中首頁       │
    ├────────────────────────────────────────────────────────────────────┤
    │ 物品標籤列印                                                       │
    │ 逐行貼上名稱，設定每項份數，排成普通紙標籤頁後列印裁切。           │
    │ 一般 A4 / Letter 紙；非預裁貼紙套版；輸入不保存。                  │
    │                                                                    │
    │ 物品名稱（每行一項）                                               │
    │ ┌──────────────────────────┐  每項份數 [ 1 ]                       │
    │ │                          │  1–20；同一份數套用到所有名稱。       │
    │ │ 貼上清單                 │                                      │
    │ └──────────────────────────┘                                      │
    │ 版型  (●) A4 2×7  ( ) A4 3×8  ( ) Letter 2×7  ( ) Letter 3×8      │
    │ [載入範例] [清除]                         [建立預覽]                │
    │                                                                    │
    │ 預覽：A4 2×7　3 個標籤　1 頁　（目前沒有預覽時顯示空狀態）          │
    │ ┌────────────────────────標籤頁─────────────────────────────────┐ │
    │ │ 物品 A       物品 A                                             │ │
    │ │ 物品 B       物品 B                                             │ │
    │ │ …            …                                                  │ │
    │ └────────────────────────────────────────────────────────────────┘ │
    │ 一般紙張、縮放 100%、關閉頁首頁尾；先試印並核對實際尺寸。           │
    │ [列印標籤]                                                         │
    └────────────────────────────────────────────────────────────────────┘

## 手機草圖（320 CSS px 起）

    ┌───────────────────────────┐
    │ 物品標籤列印       English│
    │ 返回繁中首頁              │
    │ 逐行貼名稱，設定每項份數。│
    │ 一般紙裁切；不是預裁套版。│
    │ 物品名稱（每行一項）      │
    │ ┌───────────────────────┐ │
    │ │                       │ │
    │ │ 貼上清單              │ │
    │ └───────────────────────┘ │
    │ 每項份數 [ 1 ]             │
    │ 版型 [A4 2×7          ▾]   │
    │ [載入範例] [清除]          │
    │ [建立預覽]                 │
    │ 頁面預覽（縮小）           │
    │ [列印標籤]                 │
    └───────────────────────────┘

手機預覽在自己的標示區域縮小顯示或捲動，不能迫使整頁水平捲動。表單、錯誤和操作仍在單欄可用；虛擬鍵盤或安全區不能遮住目前欄位和主要操作。手機系統列印能力取決於裝置，不做保證。

## 控制與狀態

- Header 只放工具名稱、語言切換和目前語言首頁連結。工作區使用 family tokens、平面表面和清楚分隔；紙張標籤頁是主要視覺對象。
- 名稱欄為多行 textarea；份數使用文字欄和 numeric input mode，讓核心驗證接受原始字串，不依瀏覽器 number 解析或自動修正。版型用有標籤的單選群組。
- 表單和工作按鈕初始 disabled 且輸入沒有 name；完成初始化並掛妥事件後才啟用。初始化失敗不允許提交或列印。名稱清單初始空白、份數為 1、版型為 A4 2×7。
- 預覽初始空白。範例是假資料，只能由明確按鈕載入，並且還要再按建立預覽。
- 錯誤文字就近顯示並關聯欄位；名稱行錯誤列出一基底可見行號，技術 field 保持零基底。IME 組字中不逐字顯示錯誤；按建立預覽時一次驗證。
- 建立預覽成功後才顯示列印按鈕。修改任何輸入立即隱藏預覽、清除錯誤狀態、停用列印。
- 「清除 / Clear」只在 itemsRaw 非空、已有預覽，或份數／版型不等於預設 1／A4 2×7 時先確認；預設份數 1 不會單獨觸發確認。取消保持表單和預覽；確認清單、預覽、錯誤清空，份數回 1、版型回 A4 2×7。
- 語言切換先提示會清除清單、設定和預覽；取消保留本頁，確認導到另一個固定同源語言網址並顯示初始預設表單。
- 每個名稱以純文字呈現；格子內換行、不得溢位。空格仍保留裁切邊界但沒有文字。最後一頁不複製任何項目填空。
- 列印樣式只顯示標籤頁及固定紙張內容；隱藏表單、按鈕和說明。列印呼叫只來自使用者明確點擊。

## 雙語 SEO 與固定可見文案

### 繁體中文頁

- Title：**物品標籤列印｜Gloss Tools by GlossQuote**
- Description：**逐行輸入物品名稱，設定每項份數，排成 A4 或 Letter 普通紙標籤頁，列印後手動裁切。**
- H1：**物品標籤列印**
- Intro：**把物品名稱逐行貼上，設定每個名稱要印幾份，選擇 A4 或 Letter 普通紙版型，建立預覽後列印裁切。**
- Notice：**這是普通紙裁切用版型，不是特定品牌預裁貼紙套版。瀏覽器、列印縮放和印表機可能影響實際尺寸。**
- 輸入提示：**每行一個名稱；空白行會略過。每個名稱使用相同份數，請輸入 1–20。每行最多 80 個 Unicode code points，全部展開最多 300 張標籤。**
- 主要操作：**建立預覽**
- 其他操作：**載入範例**、**清除**、**列印標籤**
- 預覽提示：**先核對名稱順序、每項份數、版型和頁數。最後一頁未用格會保持空白。**
- 列印提示：**請選擇相同紙張、縮放 100%，並關閉頁首頁尾。先用普通紙試印，量測後再裁切。**
- 資料提示：**輸入只在目前頁面處理，不會保存。第一次載入仍需下載網站檔案。**
- 清除確認：**清除會移除目前清單、設定和預覽。要清除嗎？** 按鈕：**清除**、**取消**
- 語言確認：**切換語言會清除目前清單、設定和預覽。要繼續嗎？** 按鈕：**清除並切換**、**留在此頁**

### English page

- Title: **Item Label Printer | Gloss Tools by GlossQuote**
- Description: **Enter one item name per line, choose copies per item, then arrange labels on A4 or Letter paper to print and cut by hand.**
- H1: **Item Label Printer**
- Intro: **Paste one item name per line, choose how many copies to print for each name, then build an A4 or Letter paper preview. Print it and cut the labels by hand.**
- Notice: **This layout is for labels printed on plain paper and cut by hand. It is not a template for a specific brand of pre-cut labels. Browser and printer settings can change the physical size.**
- Input help: **Enter one name per line; blank lines are skipped. The same copy count applies to every name. Enter 1–20 copies. Each name may use up to 80 Unicode code points; the expanded job is limited to 300 labels.**
- Primary action: **Build preview**
- Other actions: **Load example**, **Clear**, **Print labels**
- Preview help: **Check the name order, copies, preset and page count. Unused cells on the last page stay blank.**
- Print help: **Choose the matching paper, set scale to 100%, and turn off headers and footers. Test on plain paper and measure before cutting.**
- Data note: **Your input stays in this page and is not saved. The first load still downloads the website files.**
- Clear confirmation: **Clearing removes the current list, settings, and preview. Clear them now?** Buttons: **Clear**, **Cancel**
- Language confirmation: **Changing language clears the current list, settings, and preview. Continue?** Buttons: **Clear and switch**, **Stay here**

固定錯誤文案依 TECHNICAL.md code/field 對照實作，至少包含輸入超過 10 KiB、行名超過 80 字、無名稱、份數格式/範圍錯誤、未知版型、超過 300 張及無效 Unicode。錯誤不得顯示使用者原文或原始例外。

### 固定狀態與錯誤字串

只有 item_control_character 和 item_too_long 使用技術層零基底行索引，顯示時換算成一基底行號；其餘錯誤不插入行號或原始名稱。invalid_unicode 對應整份 itemsRaw 欄位，因此訊息不含行號。

| 狀態或 code | 繁體中文 | English |
|---|---|---|
| 初始空白 | 尚未建立預覽。貼上名稱並建立預覽後，標籤頁會顯示在這裡。 | No preview yet. Paste item names and build a preview to see the label pages here. |
| 預覽成功 | 預覽已建立：{totalLabels} 張標籤，共 {pageCount} 頁。 | Preview ready: {totalLabels} labels across {pageCount} pages. |
| invalid_schema | 無法讀取這份清單。請重新載入頁面後再試。 | The list could not be read. Reload the page and try again. |
| invalid_items_type | 清單格式無效。請重新貼上物品名稱。 | The list format is invalid. Paste the item names again. |
| invalid_unicode | 名稱清單含無法處理的 Unicode 字元。請修正後再試。 | The item list contains invalid Unicode. Correct the text and try again. |
| items_too_large | 清單超過 10 KiB。請縮短後再試。 | The list is larger than 10 KiB. Shorten it and try again. |
| invalid_copies_format | 請輸入 1–20 的整數，不含空白、小數或前導零。 | Enter a whole number from 1–20, without spaces, decimals, or leading zeros. |
| copies_out_of_range | 每項份數必須介於 1 到 20。 | Copies per item must be from 1 to 20. |
| invalid_preset | 請選擇四種支援版型之一。 | Choose one of the four supported presets. |
| item_control_character | 第 {line} 行含不支援的控制或行分隔字元。 | Line {line} contains an unsupported control character or line separator. |
| item_too_long | 第 {line} 行超過 80 個 Unicode code points。 | Line {line} is longer than 80 Unicode code points. |
| no_items | 請至少輸入一個物品名稱。 | Enter at least one item name. |
| too_many_labels | 展開後超過 300 張標籤。請減少名稱數或每項份數。 | The expanded job exceeds 300 labels. Reduce the number of names or copies per item. |

欄位錯誤與摘要使用 role=status/alert 等合適語意，不只靠顏色；焦點只在按預覽後有助修正時移動，不逐字打斷 IME 組字。

## FAQ（頁面與 JSON-LD 一致）

### 繁體中文

1. **每個名稱會印幾份？** 所有非空白行共用同一個份數；每個名稱的副本會連在一起，再排下一個名稱。
2. **這可以套用到預裁貼紙嗎？** 這是 A4 或 Letter 普通紙裁切用版型，不保證符合任何品牌或型號的預裁貼紙。
3. **怎麼讓實際尺寸更接近版面？** 列印時選擇相同紙張、縮放 100%、關閉頁首頁尾；印表機不可列印邊界仍可能影響結果，請先用普通紙量測。
4. **輸入清單會保存或上傳嗎？** 本版只在目前頁面記憶體處理，不保存或上傳；第一次開頁仍需下載網站靜態檔案。

### English

1. **How many copies are printed for each name?** One copy count applies to every nonblank line. Copies of one name are grouped together before the next name.
2. **Can I use this with pre-cut label sheets?** The presets are for labels printed on plain A4 or Letter paper and cut by hand. They are not calibrated for a specific pre-cut label brand or model.
3. **How can I keep the printed size close to the layout?** Select the matching paper, use 100% scale, and turn off headers and footers. Printer margins can still affect the result, so measure a plain-paper test first.
4. **Is my list saved or uploaded?** This version processes the list in the current page and does not save or upload it. The first page load still downloads static website files.

## SEO 與正式網址

- 正式候選 origin 為 https://labels.glossquote.com；只有 M2/M3 確認實際內容與發布後才可稱為正式網址。
- 繁中固定頁 /index.html，英文固定頁 /en/index.html。M1 preview 127.0.0.1:4210 和 build 必須 noindex,nofollow，不輸出正式 canonical 或 sitemap。
- M2 才加入兩頁 self-canonical、zh-Hant/en reciprocal hreflang、x-default 指向繁中頁和只列兩頁的 sitemap；404 不呈現工具成功內容。
- 首頁連結須分別使用 https://glossquote.com/index.html 和 https://glossquote.com/en/index.html。頁面語言和首頁語言須對應。
- M2 的 FAQPage/WebApplication JSON-LD 只能反映頁面可見問答和功能；不得加入評分、評論、紙張相容性保證、索引或流量承諾。
- robots.txt 不得封鎖必要資產；檢查實際 canonical response headers、meta 和繼承的 X-Robots-Tag。排名、流量和使用者數不是驗收指標。

## 品牌、無障礙與使用限制

依 docs/DESIGN-SYSTEM.md 的 Product App 模式與共用 tokens。預覽是工作的核心畫布；避免巢狀卡片、假圖表、遠端字體或宣傳 hero。320 CSS px 下不出現整頁水平捲動，200% 縮放保留功能。欄位有可見標籤，鍵盤可完成全流程，焦點可見，狀態不只靠顏色，觸控目標約 44×44 px，一般文字對比至少 4.5:1；尊重 prefers-reduced-motion。

不得宣稱適用所有印表機、預裁貼紙精準、尺寸保證、永久免費、永遠離線、資料已被從瀏覽器或列印佇列刪除、搜尋排名或使用量。


---

## 原文件 ACCEPTANCE.md

# 驗收案例：物品標籤列印

狀態：**規格案例，尚未執行。** 下列預期是固定手算 oracle，不由被測函式推導。M0 寫下預期值不代表實作已通過。規則見 [PRODUCT.md](PRODUCT.md) 與 [TECHNICAL.md](TECHNICAL.md)，操作和文案見 [UX-SEO.md](UX-SEO.md)，工程證據依本工具 docs/ENGINEERING.md。

## 固定核心案例

成功結果比較完整 presetId、paperSize、columns、rows、capacity、計數、頁數及每頁 slots；null 表示空格。每頁 slots 必須剛好等於容量。錯誤比較完整 ok/code/field，確認無 result、message 或 raw echo。

| ID | 精確輸入 | 預期 |
|---|---|---|
| C01 | itemsRaw 為「箱子」，copiesRaw=1，presetId=a4-2x7 | 成功；itemCount=1、copiesPerItem=1、totalLabels=1、pageCount=1、capacity=14；page 0 slots 前一格為「箱子」，其後 13 格 null。 |
| C02 | itemsRaw 為「 A \r\nA\r B \n \t \n」，copiesRaw=2，presetId=letter-3x8 | 換行正規化、trim、空白行忽略；保留名稱依序 A、A、B；slots 前六格是 A,A,A,A,B,B，接著 18 格 null；itemCount=3、totalLabels=6、pageCount=1。 |
| C03 | itemsRaw 為「X\nY」，copiesRaw=3，presetId=a4-3x8 | 每名稱副本相鄰；slots 前六格為 X,X,X,Y,Y,Y，其後 18 格 null；itemCount=2、totalLabels=6、capacity=24。 |
| C04 | itemsRaw 為 N01 至 N14 共 14 行，copiesRaw=1，presetId=a4-2x7 | totalLabels=14、pageCount=1；slots 依序 N01…N14，無 null。 |
| C05 | itemsRaw 為 N01 至 N15 共 15 行，copiesRaw=1，presetId=a4-2x7 | totalLabels=15、pageCount=2；第一頁 14 項，第二頁第一格 N15、其後 13 格 null；不得在第一頁重複名稱。 |
| C06 | itemsRaw 為 N01 至 N25 共 25 行，copiesRaw=1，presetId=letter-3x8 | capacity=24、pageCount=2；第二頁第一格 N25，其後 23 格 null；paperSize=Letter、columns=3、rows=8。 |
| C07 | itemsRaw 有 15 個單字母名稱，copiesRaw=20，presetId=a4-2x7 | totalLabels=300、pageCount=22；每個字母連續 20 格。第 22 頁有 6 個標籤，後 8 格 null。 |
| C08 | itemsRaw 為 N001 至 N301 共 301 行，copiesRaw=1，presetId=letter-2x7 | 錯誤 too_many_labels、field=totalLabels；無 pages，不回傳前 300 項。 |
| C09 | itemsRaw=Z，copiesRaw=20 與 copiesRaw=1 分別呼叫，presetId=a4-2x7 | 兩次皆成功；copies=20 時 totalLabels=20、pageCount=2，第一頁 14 個 Z、第二頁 6 個 Z 加 8 個 null；copies=1 時 totalLabels=1。 |
| C10 | copiesRaw 依序為 0、21、空字串、01、1.0、+1、前後空白的 1、1e0、全形 １；其他欄合法 | 0、21 回 copies_out_of_range/copiesRaw；其餘回 invalid_copies_format/copiesRaw。 |
| C11 | 126 行，每行恰 80 個 ASCII x，行間各一個 LF，末尾再加 35 個 LF；copiesRaw=1、presetId=a4-2x7 | 原始 UTF-8 大小恰 10240 bytes；成功、itemCount=126、totalLabels=126、pageCount=9；尾端空行忽略。 |
| C12 | 與 C11 相同，但末尾改加 36 個 LF | 原始大小 10241 bytes；items_too_large/itemsRaw，沒有結果。 |
| C13 | itemsRaw 為 80 個 😀 code point，copies=1、a4-2x7 | 成功；名稱長度按 code point 算 80（雖然 UTF-16 code unit 數為 160），輸出文字逐字保留。 |
| C14 | itemsRaw 為 81 個 ASCII x，其餘合法 | item_too_long/itemsRaw.lines[0]；沒有部分結果。 |
| C15 | itemsRaw 依序測「貨」+ U+0009 TAB +「物」、含 U+0085 NEXT LINE、含 U+2028 LINE SEPARATOR；其餘合法 | 各自回 item_control_character/itemsRaw.lines[0]；不把控制或行分隔字元當成名稱排版。 |
| C16 | itemsRaw 為單一 U+D800 高 surrogate，其餘合法 | invalid_unicode/itemsRaw；不先用 UTF-8 替代字元編碼，不 echo 原始值。 |
| C17 | itemsRaw 只有空格、tab、CRLF，copiesRaw=1、presetId=a4-2x7 | no_items/itemsRaw；不能產生空白列印頁。 |
| C18 | itemsRaw=「箱」，copiesRaw=1，presetId=legal-4x4 | invalid_preset/presetId。 |
| C19 | 根物件加 enumerable own 欄位 debug，值為含敏感文字的假字串 | invalid_schema/request；沒有 result，也不回顯 debug。 |
| C20 | 根 itemsRaw 為 enumerable getter；getter 內將計數加一 | invalid_schema/request；getter 呼叫次數為 0。相同 schema gate 另測 symbol own key、non-enumerable extra、accessor 和缺欄位。 |
| C21 | 成功呼叫後 JSON.stringify/parse result，並深比對呼叫前後 request | 成功序列化，JSON 結構相同，request 未改變；沒有 BigInt、undefined 或不在固定 schema 內欄位。 |
| C22 | itemsRaw 為「`<img src=x onerror=alert(1)>`」，copies=1，preset=a4-2x7 | 成功；slot 文字與輸入相同。瀏覽器以純文字顯示，不建立 img 元素、不執行事件。 |
| C23 | 輸入分別使用 a4-2x7、a4-3x8、letter-2x7、letter-3x8，各一標籤 | preset 映射依序為 (A4,2,7,14)、(A4,3,8,24)、(Letter,2,7,14)、(Letter,3,8,24)；全部頁邊 10mm、間隙 2mm。 |
| C24 | 四版型按 TECHNICAL.md 尺寸公式計格 | A4 2×7 格 94×265/7 mm；A4 3×8 格 62×32.875 mm；Letter 2×7 格 96.95×247.4/7 mm；Letter 3×8 格 191.9/3×30.675 mm。 |

## 瀏覽器和使用環境案例

M1 使用 127.0.0.1:4210，只用假物品名稱。兩種語言各自實際走過主要流程；原生列印、完整 Network/Storage 和真機能力如未取得需逐項記 NOT_RUN。mock 對話框不能冒充原生列印或已列印紙張。

| ID | 可重現操作 | 預期 |
|---|---|---|
| B01 | 初次載入繁中，再載入 /en/index.html | 兩頁各自清單空白、份數為 1、預設版型 A4 2×7，不預填或自動列印；輸入和工作按鈕初始 disabled、input 沒有 name；初始化與事件註冊完成才啟用。 |
| B02 | 在兩語各輸入兩個名稱、copies=2、選 A4 2×7，按建立預覽 | 兩語結果同為四格名稱按 X,X,Y,Y 排列；正確顯示一頁和 A4 2×7；只有明確點擊列印按鈕才呼叫原生 print。 |
| B03 | 建立成功預覽後改名稱、份數或 preset 任一項 | 同一事件循環清除預覽並停用列印；不能列印舊版型或舊名稱。重新建立成功後才啟用列印。 |
| B04 | 初始預設清單空白、份數 1、A4 2×7 時按清除；再分別只改份數為 2、只改版型為 Letter 2×7，測清除確認的取消與確認；最後建立有資料的預覽再測一次取消/確認 | 初始預設不出現確認；份數或版型單獨非預設時會確認，取消保留設定、確認重設份數 1 和 A4 2×7；有清單/預覽時取消保留完整工作，確認後清單清空、預覽移除並回預設。 |
| B05 | 有清單時切換語言，先取消再確認 | 取消保留原頁資料；確認後導至固定同源另一語言頁，清單和預覽清空、份數為 1、版型回 A4 2×7。URL 不含使用者名稱。 |
| B06 | 15 個名稱選 A4 2×7，建立預覽 | 可見 2 頁；第 2 頁只一個名稱和 13 個空白格。空格只有裁切邊界，沒有重複文字。 |
| B07 | 輸入 80 個中英文混合字元或一段不含空格的長名稱 | 名稱在格內換行，不覆蓋相鄰格、不改變頁數或網格；若實際列印截斷，記阻止驗收並修正。 |
| B08 | 320 CSS px、200% 縮放、只用鍵盤操作完整輸入、選版型、預覽及列印 | 表單在單欄可完成；頁面操作不被遮住，紙張預覽在自己的區域縮放/捲動；沒有整頁水平捲動；focus 可見。 |
| B09 | 輸入與 C22 相同的惡意標記字串、建立預覽後查看頁面 | 僅顯示原始純文字，不建立 img node 或執行程式；不進 URL、console 或網路 payload。 |
| B10 | 先讓頁面完整載入，再在離線模式輸入並建立預覽；另測冷啟動離線 | 已載入分頁能本機運算；冷啟動離線能力不承諾。不得用 service worker 或隱藏快取改變規格。 |
| B11 | DevTools 觀察載入、輸入、預覽和清除的 Network/Storage | 只允許靜態同源初次載入；不傳物品名稱、不寫 storage/cookie/cache/service worker/URL。完整觀測能力不足時記 NOT_RUN。 |
| B12 | 關閉 JavaScript 後載入頁面，嘗試 submit | 只能閱讀用途說明；工作控制 disabled，沒有 GET、query string 或假的成功預覽。 |
| B13 | 按清除和語言切換各自取消/確認，檢查 pagehide/BFCache 返回 | 取消保持內容；確認清除後為空白。pagehide 清除目前記憶體工作，BFCache 返回空白；無 object URL、下載或剪貼簿狀態。 |
| B14 | 逐一查看四版型的實際瀏覽器 print preview，後用 A4/Letter 普通紙各試印 | 瀏覽器預覽需顯示正確頁數和所選紙張；量測 10mm 邊界、2mm 格距和列印縮放。若沒有可用印表機或瀏覽器列印環境，這一項及原生紙張精度標 NOT_RUN，不得用 mock 代替。 |
| B15 | 低階或慢速裝置以 300 個標籤建立預覽 | 上限內完成且互動可恢復；若無真機量測記 NOT_RUN，不能聲稱所有裝置效能。 |
| B16 | 本機 HTTP 檢查兩語 SEO 和 assets | M1 兩頁 noindex,nofollow；沒有 production canonical、sitemap 或遠端字型；頁面語言和 matching-language 首頁連結正確。 |

## M1 必要 gate 與未驗項目

- C01–C24 核心案例都轉成離線 Node 測試，預期值獨立手寫；產品改動後只重跑受影響 gate。
- B01–B10、B12–B13、B16 中可由現有瀏覽器環境完成的部分必須實測，且繁中和英文主要流程都要通過。
- 原生瀏覽器 print preview、實體紙張、真機/慢機、完整 Network/Storage 未實際觀察時逐項 NOT_RUN；mock 不可冒充原生結果。CSP、headers、HTTP 模型按 docs/ENGINEERING.md 和 docs/PRIVACY-SECURITY.md 驗收。
- M0 文件和 oracle 沒有執行實作、測試、真機列印、正式 SEO、公開來源或部署。


---

## 原文件 TASKS.md

# 里程碑任務：物品標籤列印

狀態：M0 六份產品規格已寫，待主代理審查；沒有產品實作、測試、公開來源或部署。每個 gate 要記實際命令、exit code、測試與 NOT_RUN 證據；本表不是通過紀錄。全域規則見 [AGENTS.md](AGENTS.md)、[TASK-ENTRY.md](TASK-ENTRY.md)、[docs/ENGINEERING.md](docs/ENGINEERING.md)、[docs/PRIVACY-SECURITY.md](docs/PRIVACY-SECURITY.md)、[docs/RELEASE.md](docs/RELEASE.md)、[docs/GIT-PUBLICATION-SAFETY.md](docs/GIT-PUBLICATION-SAFETY.md)。

## M0 — 自包含規格

- [x] 說清楚普通紙逐行標籤、每項共同份數、四個固定版型和非目標。
- [x] 寫明輸入上限、文字處理、展開、分頁、精確純函式 API、錯誤契約。
- [x] 記錄中英介面、桌機/手機草圖、SEO、離線與實際列印界線。
- [x] 定義至少 12 個可手算核心 oracle 和瀏覽器 gate。
- [ ] 主代理審查六份規格並放行原功能對話。
- [ ] 原功能對話按已審規格實作；requested model 為 gpt-6.1-sol/max，不能用自述代替 backend identity 證據。

M0 僅允許更新 README.md、PRODUCT.md、TECHNICAL.md、UX-SEO.md、ACCEPTANCE.md、TASKS.md 六檔。本階段不建產品程式、不跑產品測試、不開對話、不發布、不部署、不改共用文件。完成主審前各項保持未放行。

## M1 — 完整本機產品

本機預覽 127.0.0.1:4210，Node 24+ ESM/built-ins，無套件，noindex/nofollow；核心只作本機同步運算。

### T00 — 規格與安全起點

- 確認主代理 M1 放行，重讀本工具六份規格及適用 docs；查明允許路徑和無同路徑衝突。
- 在本工具允許 evidence 子目錄記錄唯一 task id、Node/npm 版本及 process-environment guard 前後指紋。此產品不呼叫 dotnet；不得為方便更動 persistent Windows/Git 設定。
- 沒有開始前證據前不得安裝套件、跑長時間測試或啟動 server。

### T01 — 純核心與輸入驗證

- 實作 TECHNICAL.md 的 calculateLabels(request)，含 exact schema、驗證順序、固定錯誤、頁數、slot 展開和輸入不突變。
- 將 C01–C24 轉成離線 node:test；所有成功 slots 和錯誤都是獨立手寫 expected，不可由被測函式生成。
- 特別驗 10240/10241 UTF-8 bytes、80/81 code points、20/21 copies、300/301 labels、CRLF/CR/LF、空行、重複名稱、surrogate 和控制字元。
- Gate：成功輸出 JSON 可序列化、錯誤無 partial result/raw echo、每頁容量正確、300 張上限不截斷。

### T02 — 繁中/英文本機工作流程

- 建立兩語空白 UI、textarea、份數、四個選項、欄位錯誤、範例和清除確認；遵守 UX-SEO 固定文案。
- 先註冊同步 submit capture preventDefault，再接妥其餘 listener；所有 fieldset 和工作按鈕初始 disabled、input 無 name；初始化全成功後才 enable。
- 實際走完兩語空白初始態、貼上、錯誤修復、範例、重複項目與每項副本、取消/確認清除、語言切換取消/確認、修改失效和新預覽。
- Gate：B01–B05、B08–B10、B12–B13、B16 中可在現有瀏覽器觀察的內容；缺一語主要流程即停止 M1。

### T03 — 固定網格、分頁和列印 CSS

- 用四個固定 preset class 與預先宣告 CSS 設定表現 A4/Letter 紙張，頁邊 10mm、格距 2mm，不產生 inline style。
- 驗證標籤依名稱順序各自連續 copies 份、固定容量 paginate、末頁空格不填入重複名稱；80 code point 名稱在格內換行。
- 建立預覽後才允許明確 click 呼叫原生 window.print；列印畫面只顯示標籤頁。
- Gate：C01–C09、C23–C24 和 B02–B07。原生 print preview 或實體紙張無可用設備時保留 NOT_RUN，不用測試 stub 冒充。

### T04 — 工具鏈、隱私與無障礙

- 依 docs/ENGINEERING.md 建立離線 test/check/build、固定 source allowlist、MIME/HTTP/404、loopback 預覽 4210 和 noindex/no-follow build。
- 依 docs/PRIVACY-SECURITY.md 和 PRODUCT.md 驗 CSP、安全標頭、純文字呈現、無 storage/網路資料提交/URL/console 使用者內容、pagehide 清除。
- 實測 320 CSS px、200% zoom、keyboard/focus、兩語長字串、錯誤關聯、手機單欄與減少動態效果；無真機能力則只把真機項目標 NOT_RUN。
- Gate：B08–B13、B16 以及全 offline checks；完整 Network/Storage 無觀測能力時明列限制。

### T05 — M1 整合候選

- 最後候選固定後跑 node --version、npm test、npm run check、npm run build 各一次；preview 只能 bind 127.0.0.1:4210。
- 執行 C01–C24、所有可用的 B01–B16，記下自動、實際 browser 和 NOT_RUN 狀態，不能把文件 oracle 當通過證據。
- 依工程契約產生 allowlist/manifest；保存有界 evidence，不收集完整 trace、使用者資料或憑證。
- 更新允許的本工具 HANDOFF.md、START-HERE.md、project.json、TASK-ENTRY.md、docs/RELEASE-CANDIDATE.md 狀態紀錄；可由 build 產生 dist。不得改共用或其他工具。
- M1 放行條件：核心和兩語主要流程通過，所有必要輸入/版型邊界正確，安全/隱私無未解問題；原生紙張/真機/完整網路儲存觀察依能力標 NOT_RUN；主代理明確書面放行才可開始 M2。

## M2 — 主代理 GO 後 production 工具鏈與來源發布

- 啟動條件：主代理明確放行固定 M1 候選；仍使用原功能對話。沒有放行不得推進或發布。
- 加入 production canonical、雙語 hreflang/x-default、正式 robots/sitemap、headers/404 和 127.0.0.1:5210 本機 production-like HTTP model。
- 新增 npm run release:check；release/check/build 離線。production build 只輸出 dist-production/，不得改寫 preview public/ 或 dist/。
- 僅在 reviewed publishing copy 發布 KYStr/glossquote-labs-label-printer；先後使用 docs/GIT-PUBLICATION-SAFETY.md 要求的 Git settings guard，逐項驗 remote visibility、commit、ZIP 根目錄及檔案 hash、乾淨副本 gates。
- 不讀憑證、不改 global/system Git 或 persistent environment、不呼叫 Cloudflare、不讀 token。缺認證或守衛失敗就停並留下實際錯誤。
- Gate：release:check、test/check/build、production HTTP/SEO/404、安全 headers、乾淨副本、public repo/commit/ZIP 全部有實際證據；等主代理驗收。來源公開不等於網站已部署。

## M3 — 主代理部署和首頁整合

- 只由主代理在 M2 獨立放行後處理。以已授權免費 Cloudflare 流程部署至 labels.glossquote.com，驗證兩語真實 HTTP body、headers、SEO、404 和核心操作。
- live release 驗證後，主代理將雙語首頁 catalog draft 改為 published、重建和發布共用首頁並驗兩語入口及 matching-language 回鏈。
- 記錄 source commit、實際 hosting、首頁狀態和 NOT_RUN；不可把本機模型、source push 或文件規格當 live 驗證。
- 交付為 awaiting external review；外部意見回原功能對話修正。外部未確認前不能標版本 complete。

## 每個 gate 的紀錄欄位

記錄候選識別、實際允許路徑、命令與 exit code、手寫 oracle 結果、雙語 browser 證據、print preview/實體列印是否 NOT_RUN 及原因、Network/Storage 能力、主代理放行、來源與 hosting 狀態。mock、靜態掃描、聊天摘要和本規格的預期值都不能代替實際測試。


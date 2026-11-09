# Cut Planner — UX、雙語文案與 SEO

## 頁面狀態

首頁和工具同頁，任務以「輸入原料條件 → 輸入需求列 → 試算 → 逐支檢查 → 複製／下載」完成。先給簡短模型說明，再讓表單成為主要工作區，最後呈現成功清單或具體錯誤。成功結果的逐支清單需比品牌介紹更醒目。

初始頁不自動塞入範例或試算。初始欄位為原料長度空白、每端修邊 0、鋸縫 0、一列空白名稱和長度、數量 1。繁中頁預設 zh-Hant，英文頁預設 en；語言選擇連到對應靜態頁，不用 storage 記住選擇。標示毫米，並在鋸縫欄旁說明它只扣除同一支原料內相鄰成品間的距離；第一件前不扣。需同時可見地說明：不計兩端修邊切鋸的鋸縫、不在最後成品和餘料間扣末端鋸縫，且餘料不保證可回用。

桌機配置草圖：

    ┌──────────────────────────────────────────────────────┐
    │ GlossQuote       長料裁切規劃             繁中 | EN │
    │ FFD 是啟發式，不保證支數最少。所有尺寸以 mm 輸入。 │
    ├──────────────────────┬───────────────────────────────┤
    │ 原料條件             │ 裁切清單 / 試算結果           │
    │ 長度 / 修邊 / 鋸縫   │ 成品列、每支配置、損耗與餘料 │
    │ 需求列（最多 40 列） │ 原料 1、原料 2……             │
    │ 新增列 / 試算 / 清除 │ 複製 cut list / 下載 .txt     │
    └──────────────────────┴───────────────────────────────┘

手機窄螢幕把原料條件、需求列和結果改為單欄；每列一張簡潔區塊，名稱、長度、數量容易掃讀，新增/移除動作貼近該列。結果按原料支數逐段堆疊；每支內列成品順序和各項長度，總覽在前，平衡式可見。不依賴橫向大表格、大型 SVG、縮放後才可操作的按鈕或動態 inline style。320 CSS px 下可完成所有主要操作且不需左右捲動。

## 表單與互動

長度欄使用文字輸入並設定 decimal input hint，數量欄使用文字輸入並設定 numeric hint，避免瀏覽器原生 number 欄位自動接受或重寫科學記號、逗號、全形數字和多餘小數。輸入說明要求 ASCII 數字、使用句點作小數點、最多兩位小數；貼上不會被暗中正規化，也不可用 maxlength 靜默截斷超長輸入。若輸入法提供全形字元，保留在欄位並由試算回報錯誤，不得把它靜默轉成另一個值。

需求列有可見列序、名稱、長度、數量與移除操作；原始列索引決定等長成品 tie-break。新增最多 40 列，數量合計最多 200 件。錯誤訊息使用欄位關聯、文字標籤和可讀中文／英文，不只靠顏色或 toast。提交後第一個錯誤聚焦到欄位或錯誤摘要；錯誤摘要不包含原始值。表單在 JavaScript 初始化和事件註冊完成前 disabled，並無 name 屬性；初始化成功後即可試算，讓空白或錯誤資料能顯示驗證訊息。同步 preventDefault 必須在任何初始化可能失敗前完成，停用 JavaScript 或初始化失敗都不可將原料/需求資料以 GET 提交。

任何原料條件、列、順序、名稱、尺寸或數量變更都立即使現有結果、報告、複製和下載控制失效，並顯示「輸入已變更，請重新試算」。不使用舊結果做複製或下載。重新試算依固定驗證順序回報第一個錯誤。每件成品依 FFD 真的放置順序列出，列上保留來源列名稱和件序，方便比對原需求。

清除操作在資料、成功結果、等待中的複製或有效下載存在時先詢問是否放棄；取消保留資料、報告及各下載期限，確認才回初始空白狀態。尚為初始空白時不彈確認。切換語言會導向同一工具的另一個語言頁並清除目前草稿和結果；若目前狀態有工作內容，先詢問是否放棄，取消必須阻止導覽並留在原頁保留內容，確認才導覽。pagehide 後不保留草稿或結果，BFCache 回頁面為初始空白狀態。

## 精確雙語字串

| 用途 | 繁體中文 | English |
| --- | --- | --- |
| 頁面標題 | 長料裁切規劃｜Cut Planner by GlossQuote | Cut Planner by GlossQuote |
| SEO title | 長料裁切規劃｜Cut Planner by GlossQuote | Cut Planner — Plan cuts from fixed-length stock |
| SEO description | 依固定長度長料、兩端修邊與鋸縫，使用可重現的 FFD 啟發式產生逐支裁切清單。這不是最少用料保證。 | Plan a cut list from fixed-length stock, end trim and kerf with a repeatable FFD heuristic. The result is not a minimum-stock guarantee. |
| H1 | 長料裁切規劃 | Cut Planner |
| 主說明 | 輸入原料長度、每端修邊、鋸縫與需求件數，查看每支原料的裁切順序和餘料。 | Enter stock length, trim per end, kerf and required pieces to see a cut order and remaining length for each stick. |
| 演算法提醒 | 本工具以 FFD 啟發式排料；結果不保證使用最少支原料或達到最佳化。 | This planner uses the FFD heuristic. It does not guarantee the fewest stock sticks or an optimal plan. |
| 單位 | 所有長度均以毫米（mm）計。 | All lengths are in millimetres (mm). |
| 鋸縫模型限制 | 本模型只在同一支原料的相鄰成品間計一次鋸縫；不計兩端修邊切鋸的鋸縫，也不在最後成品與餘料間另扣鋸縫。餘料不保證可回用，請現場檢查。 | This model counts kerf only between adjacent finished pieces on the same stick. It excludes the saw kerf from end-trim cuts and does not deduct a final kerf between the last piece and the remaining stock. Remaining length is not guaranteed reusable; verify it on site. |
| 原料長度 | 原料長度（mm） | Stock length (mm) |
| 每端修邊 | 每端修邊（mm） | End trim per end (mm) |
| 鋸縫 | 相鄰成品間鋸縫（mm） | Kerf between adjacent pieces (mm) |
| 需求列 | 成品需求 | Required pieces |
| 名稱 | 成品名稱 | Piece name |
| 長度 | 成品長度（mm） | Piece length (mm) |
| 數量 | 數量 | Quantity |
| 試算 | 產生裁切清單 | Build cut plan |
| 複製 | 複製純文字清單 | Copy plain-text cut list |
| 下載 | 下載 .txt 清單 | Download .txt cut list |
| 餘料 | 剩餘可用長度 | Remaining usable length |
| 初始狀態 | 輸入尺寸與需求後開始。 | Enter stock settings and required pieces to begin. |
| 失效狀態 | 輸入已變更，請重新試算。 | Inputs changed. Build the plan again. |
| 複製失敗 | 瀏覽器未允許複製；請選取下方文字並手動複製。 | Clipboard access was denied. Select the text below and copy it manually. |
| FFD 展開 | FFD = 由長到短排序，依序放入第一支可容納的原料。 | FFD = sort longest first, then place each piece in the first stick that fits. |

控制項標籤、錯誤、確認對話框、清單欄位及空狀態皆須有完整 zh-Hant/en 文案，不以切換頁面後殘留另一語言內容。語言切換連到相同語言的首頁和工具頁。

## 搜尋內容與 FAQ

正文自然說明「固定長度長料、每端修邊、鋸縫、逐支裁切清單、餘料」及 FFD；不暗示免費工具能省下特定成本，不聲稱最少原料，不虛構搜尋量、流量或排名。內容應說清楚數學模型，避免只放關鍵字。

繁體中文 FAQ：

1. **這個工具會保證使用最少支原料嗎？** 不會。工具使用固定 FFD 啟發式，方便產生可重現的估算清單，但不保證支數最少或最佳化。
2. **鋸縫會如何計算？** 只在同一支原料的相鄰成品間計一次；不在第一件前或最後成品與餘料間扣鋸縫，也不計兩端修邊下刀本身的鋸縫。
3. **清單中的餘料有包含兩端修邊嗎？** 沒有。餘料是可用長度中扣除成品與相鄰成品間鋸縫後的未分配長度；兩端修邊另列。這不保證餘料可回用，請現場檢查。
4. **工具會知道原料瑕疵、夾持或鋸切方式嗎？** 不會。這些現場條件不在計算模型內，請先自行評估並量測。

English FAQ:

1. **Does this planner guarantee the fewest stock sticks?** No. It uses a fixed FFD heuristic to produce a repeatable estimate; it does not guarantee a minimum or optimal plan.
2. **How is kerf counted?** Only once between adjacent pieces on the same stick. No kerf is deducted before the first piece, between the last piece and remaining stock, or for the saw cuts that remove end trim.
3. **Does remaining length include end trim, and can I reuse it?** No. It is the unallocated usable length after pieces and between-piece kerf; end trim is listed separately. Reuse is not guaranteed, so check the remainder on site.
4. **Does the planner account for defects, clamping or the real cutting method?** No. Those shop conditions are outside this model and need to be checked separately.

繁中頁路徑為 /index.html，html lang 為 zh-Hant；英文頁為 /en/index.html，html lang 為 en。正式候選 canonical 分別是 https://cuts.glossquote.com/index.html 和 https://cuts.glossquote.com/en/index.html，彼此提供 zh-Hant/en hreflang，x-default 回繁中首頁。M1 preview 的兩頁都加 noindex,nofollow，禁止預覽頁被搜尋索引。FAQ 結構化資料若加入，問題與答案必須和頁面可見文字逐字一致。M2 只由主代理檢查正式頁面 canonical、reciprocal hreflang、x-default、robots、sitemap、WebApplication JSON-LD 和 live headers；不捏造流量或搜尋排名。

## 使用環境與能力界線

- 桌機：主要撰寫工作區，輸入多列並逐支閱讀長清單；鍵盤可完成新增列、刪除、試算、複製與下載，焦點順序自然。
- 手機：支援窄螢幕輸入和清單查看，數量使用數字鍵盤提示、長度使用小數鍵盤提示；鍵盤可能遮住欄位，錯誤後需把焦點帶到仍可見的欄位。輸入方式不保證每個 OS/IME 都有句點鍵，使用者仍可貼上 ASCII 格式。
- 長表單：最多 40 列，展開最多 200 件；顯示總列數與件數，不讓手機使用者在多頁間失去列序。新增/移除不重排原始需求列；排序只在試算清單內明確說明。
- 低階裝置：同步計算上限 200 件，避免大型圖形、重動畫、外部字型及遠端資產；按下試算後 UI 應迅速顯示成功或第一個驗證錯誤。
- 首次載入與離線：網站初載需要載入 HTML/CSS/JS 等同源靜態資產。只有在必要頁面與資產已載入後，使用者才可離線完成本機計算；停用 service worker，因此離開後再離線重載不保證可用。
- 無 JavaScript：提供產品說明與語言導覽，但計算無法執行；submit 必須同步攔截，不能把尺寸以 GET query string 洩漏到網址或伺服器。
- 瀏覽器權限：剪貼簿可能被拒絕或只允許安全來源；下載可能被瀏覽器攔截。真實原生行為需另行驗證，不能用 mock 或成功的測試呼叫冒充。

## 跨連結

- [產品範圍](PRODUCT.md)
- [技術合約和文字報告](TECHNICAL.md)
- [驗收矩陣](ACCEPTANCE.md)
- [發布契約](docs/RELEASE.md)
- [設計系統](docs/DESIGN-SYSTEM.md)

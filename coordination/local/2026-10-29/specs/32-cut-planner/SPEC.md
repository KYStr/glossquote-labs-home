# 長料裁切規劃 — 既有規格保存

Task ID: `labs-32-cut-planner` · Spec ID: `spec-32-cut-planner`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# Cut Planner — 產品規格

## 狀態與目的

本文件定義 M0 產品範圍，沒有宣稱功能已實作。工具候選名稱是 Cut Planner，繁體中文名稱為「長料裁切規劃」，slug 為 cut-planner，正式候選子網域為 cuts.glossquote.com。初版提供繁體中文及英文。

使用者有多支相同長度的長料，需要切出多種指定長度和數量，想知道依這個工具的排料規則會使用幾支原料、每支如何切、各支剩多少。工具要直接呈現逐支裁切清單和餘料，不能只回總數。

## 使用者與任務

目標使用者是要先估算或整理直線定長材料裁切的人，例如在工作室、工坊或家庭專案中準備木條、型材或管材。使用者提供單一原料長度、每端修邊、鋸縫寬度和最多 40 種需求列；每列包括可辨識名稱、成品長度及數量。

典型任務是先閱讀尺寸和 FFD 模型說明，再輸入實際資料，試算後閱讀每支原料的切割次序、鋸縫扣除和餘料；最後複製或下載純文字 cut list，帶到工作現場再次核對。

## 輸入和規則

- 所有長度都以毫米輸入與顯示。原料長度必須在 0.01 至 100000 mm；每端修邊為 0 至 10000 mm；相鄰成品之間的鋸縫為 0 至 1000 mm。
- 每列成品長度為 0.01 至 100000 mm，數量為 1 至 200。列數為 1 至 40，展開後的成品總件數不得超過 200。
- 列名稱必填，修剪前 raw UTF-8 長度最多 240 bytes；ECMAScript trim 後必須有 1 至 60 個 Unicode code point。拒絕控制字元及孤立 surrogate；也拒絕會在純文字報告中成為換行的 U+2028 和 U+2029。
- 數值只接受最多 12 個 ASCII 字元的十進位字串：整數部分必填、可有小數點及 1 或 2 位小數；可接受前導零。拒絕空白、正負號、指數、逗號、全形數字、單獨小數點、超過兩位小數及非字串。數量是純 ASCII 整數字串，不接受小數。
- 每端修邊固定套用到每一支產出的原料。可用長度為原料長度減去兩端修邊，必須大於零。任何一件成品長於可用長度時，整份輸入錯誤，不產生部分清單。
- 鋸縫只扣在同一支原料內相鄰兩件成品之間；第一件成品前不扣鋸縫，也不從最後一件成品到餘料之間再扣一道。兩端修邊只按輸入的修邊長度扣除，不另外計算實際切掉修邊時的鋸片寬度。工具不考慮夾持、實際切法、材料瑕疵、端面狀況、混長原料或其他現場損耗。

## 結果與說法

排料採固定 FFD v1：按成品長度由大到小排序，同長度依原始需求列次序，再依該列展開件序；每件依序放入建立順序中第一支放得下的原料，否則新增一支。每支可放容量是原料長度扣除兩端修邊後的可用長度；若該支已放入一件以上，新增一件時才多扣一個鋸縫。

結果須逐支列出：原料序號、需求列名稱與件序、成品長度、成品長度小計、鋸縫損耗、可用長度已使用量及剩餘可用長度。總覽另列原料支數、成品件數、原料總長、成品總長、兩端修邊總損耗、鋸縫總損耗及餘料總長。顯示值固定到 0.01 mm；排料和總量檢查使用精確整數，不依顯示格式決策。

固定顯示平衡式：

成品總長 + 兩端修邊總損耗 + 鋸縫總損耗 + 餘料總長 = 原料總長。

每支原料也需滿足同一平衡式。使用者看到的「餘料」是可用區域中扣除成品和相鄰成品間鋸縫後的未分配長度；它不再扣除最後成品與餘料的末端切鋸，也不包含兩端修邊實際切鋸的額外損耗。兩端修邊另列，不能併入餘料。「餘料」不是可回用長度的保證，現場仍須檢查尺寸、切口及材料狀況。使用者看到的「已使用可用長度」為成品長度加相鄰成品間鋸縫，不含兩端修邊。

工具要明確提醒：FFD 是啟發式，固定排序和 first-fit 放置得到可重現方案，並不保證最少支數或最佳裁切結果。試算結果只依使用者輸入的數學模型，不能保證實際切割安全或材料可用。

## 複製、下載與資料生命週期

複製和純文字下載都由使用者明確操作，內容只能由目前已成功驗證的結果快照產生，檔名固定為 glossquote-cut-plan.txt。複製只寫入報告，不讀取使用者原剪貼簿；瀏覽器拒絕時，頁面提供可選取文字，不得宣稱複製成功。

所有輸入與結果只在頁面記憶體。每次編輯即清除舊結果及其報告。清除操作須在有草稿、結果、等待中的複製或仍有效下載連結時確認；取消保留原值、結果和各下載期限，確認後重設為初始空白狀態並清除頁面持有的非同步狀態和 Object URL。一般編輯或重新試算不可提早撤銷既有下載 URL。pagehide 時清除輸入、結果、非同步狀態及所有 URL；BFCache 返回時以初始空白狀態開始，不恢復草稿。

不得加入上傳、帳戶、儲存、匯入、外部字型、分析、追蹤、伺服器計算或網路分享。

## 非目標

- 不保證使用最少原料、不聲稱全域最佳化，也不比較其他排料算法。
- 不做商用預裁貼紙、標籤版型、條碼、QR code、CAD、鋸切路徑或機台控制。
- 不推斷切割方向、鋸片寬度、夾持限制、材料瑕疵、混合庫存或現場安全條件。
- 不自動保存、不同步、不建立使用者資料，也不讀剪貼簿。

## 使用情境與風險

桌機是長表格、逐支清單與現場列印前檢視的主要情境；手機需能輸入和檢查長清單，但不假設手機可精確操作實際切料。低階裝置仍須能同步計算最多 200 件，不載入大型圖形或依賴遠端資產。離線使用只在頁面及必要資產已載入後成立；重新載入需要本機伺服器或正式網站連線。停用 JavaScript 時，表單不提供試算功能，且不得以 GET 將輸入送出。

最容易造成損失的誤讀是把 FFD 結果當成最少支數、把餘料看成已扣掉鋸縫或修邊、把鋸縫視為在第一件前也扣除，或把某一需求列的所有件數誤看成必須連續放在同一支原料。介面需分開標示成品、修邊、鋸縫、可用長度與餘料，且清楚說明模型假設和單位。

## 相關文件

- [精確 API、演算法及錯誤順序](TECHNICAL.md)
- [介面文案、雙語 SEO 和瀏覽器行為](UX-SEO.md)
- [手算核心與瀏覽器驗收矩陣](ACCEPTANCE.md)
- [里程碑與任務門檻](TASKS.md)
- [隱私與安全共通規則](docs/PRIVACY-SECURITY.md)
- [工程與工具鏈共通規則](docs/ENGINEERING.md)
- [設計系統](docs/DESIGN-SYSTEM.md)


---

## 原文件 TECHNICAL.md

# Cut Planner — 技術與資料合約

## 執行邊界

M1 使用原生 HTML、CSS、JavaScript ESM，Node.js >=24 與內建模組；不得增加 runtime 或 dev 套件，不呼叫網路，不保存使用者資料。純計算核心可獨立 import，不讀 DOM、時鐘、亂數、全域 UI 狀態或瀏覽器 API。建議入口為 public/index.html、public/en/index.html、public/js/core/cut-planner.mjs、public/js/app.mjs、public/js/render.mjs、public/css/app.css；以固定 allowlist 維持與共通 build/release 檢查一致。

M1 preview 綁定 loopback port 4212，HTML 為 noindex,nofollow。M2 production model 使用 5212 和獨立 dist-production，不能把 production 輸出寫回 preview dist。伺服器及安全標頭遵循 [工程共通契約](docs/ENGINEERING.md)、[隱私與安全邊界](docs/PRIVACY-SECURITY.md)和[發布契約](docs/RELEASE.md)。

## 純計算 API

### calculateCutPlan(request)

成功回傳固定外層 {ok:true,result}。失敗回傳固定外層 {ok:false,error:{code,field}}，不得拋出輸入錯誤、回傳部分計畫或在錯誤中 echo 使用者文字。成功和失敗外層都不得有其他鍵。API 不修改 request、列陣列或其列物件。

精確 request schema：

    {
      stockLengthRaw: string,
      endTrimRaw: string,
      kerfRaw: string,
      rows: Array<{
        id: string,
        nameRaw: string,
        lengthRaw: string,
        quantityRaw: string
      }>
    }

根物件只能有四個列出的 own enumerable string data properties；每列物件只能有四個列出的 own enumerable string data properties。允許 Object.prototype 或 null prototype，拒絕其他 prototype。拒絕 symbol、未知、缺少、non-enumerable、accessor 欄位；不可執行 getter。rows 必須是一般 Array.prototype 的密集陣列，只允許標準不可列舉 length 和每個連續 enumerable data index，拒絕 hole、額外屬性、symbol、accessor 或 subclass。純函式契約供一般資料物件使用；它不宣稱能在 JavaScript 中辨識所有行為正常的 Proxy。欄位順序不影響結果。

ID 為 1 至 40 個 ASCII 字元，字元集 A-Z、a-z、0-9、底線及連字號；在 request 內唯一，大小寫有別。名稱必須是 string；先檢查整個 nameRaw 不含 U+0000–U+001F、U+007F–U+009F、孤立 UTF-16 surrogate、U+2028 或 U+2029，再檢查 raw UTF-8 不超過 240 bytes；以 ECMAScript trim 修剪後必須有 1 至 60 個 Unicode code point。名稱不做 NFC/NFD 正規化，成功結果保存 trim 後的原文字串。這些界線讓 cut list 保持單行、可辨識且有界。

原料長度、修邊、鋸縫及列長 raw 都必須是 1 至 12 個 ASCII 字元的字串，語法為一位以上 ASCII 整數，可選小數點加 1 或 2 位 ASCII 小數。允許前導零；拒絕正負號、空白、逗號、指數、全形數字、無整數部分、末尾小數點及 3 位以上小數。數量 raw 同樣最多 12 個 ASCII 字元，但只允許 ASCII 整數。所有長度使用 mm。

| 欄位 | 範圍 |
| --- | --- |
| stockLengthRaw | 0.01–100000 mm |
| endTrimRaw | 0–10000 mm，每端 |
| kerfRaw | 0–1000 mm，每一對相鄰件 |
| rows | 1–40 列 |
| rows[i].lengthRaw | 0.01–100000 mm |
| rows[i].quantityRaw | 1–200 件 |
| 展開件數 | 1–200 件 |

每列數量都先驗證為整數範圍 1–200，再依輸入列順序累加件數；累加首次超過 200 時回報該列 quantityRaw。可用長度 stockLength − 2 × endTrim 必須大於 0。完成其他列欄位的範圍檢查後，任何列長大於可用長度都使整份 request 失敗。

### 錯誤形狀與確定順序

error.code 為下列固定 snake_case 字串之一；error.field 只可使用固定、安全路徑，絕不包含使用者提供的 property name、文字或值。根物件未知 string/symbol 欄位一律指向 request；列物件未知 string/symbol 欄位一律指向 rows.i。根/列 prototype 或其他整體結構錯誤使用 request 或 rows.i；已知欄位 descriptor/值問題使用固定路徑 request.stockLengthRaw、request.endTrimRaw、request.kerfRaw、rows.i.id、rows.i.nameRaw、rows.i.lengthRaw、rows.i.quantityRaw。rows 陣列本身問題使用 rows，缺洞使用 rows.i；缺少已知必填欄位可指向該固定欄位路徑；無法計算可用長度使用 usableLength。未知欄位名稱即使極長、像憑證或包含敏感字串，也不得被 echo 到 error.code、error.field 或任何錯誤輸出。symbol 等不可命名欄位同樣指向其所在固定物件路徑。

固定代碼：invalid_request_schema、unknown_field、invalid_type、raw_too_long、invalid_format、out_of_range、invalid_name、duplicate_id、empty_rows、too_many_rows、total_pieces_exceeded、non_positive_usable、piece_exceeds_usable。先依以下順序回傳第一個錯誤：

1. 驗證根物件型別及 prototype。先檢查是否有未列出的 own string/symbol key；有則回 unknown_field/request，不讀取該 key 的 descriptor value 或 getter。若無未知 key，再檢查缺少的必填 key，接著依固定 schema 欄位順序驗 data descriptor 和 enumerable 狀態；accessor/non-enumerable 已知欄位回 invalid_request_schema 並指向該已知欄位路徑。所有值只從已確認為 enumerable data property 的 descriptor 取出，不執行 getter。
2. 依欄位次序 stockLengthRaw、endTrimRaw、kerfRaw、rows 檢查值型別與字串長度；數值再依 stock、trim、kerf 次序檢查語法及範圍。
3. 檢查 rows 一般密集陣列及 1–40 長度，然後驗證可用長度大於零。
4. 依列索引逐列驗證 object/prototype；列物件有任何未列出的 own string/symbol key 即回 unknown_field/rows.i，不讀其值；無未知 key 時檢查缺漏和固定欄位 descriptor，再依 id、nameRaw、lengthRaw、quantityRaw 次序檢查型別、界線和格式。完成 id 語法後立即查重；每次增加數量時檢查 200 件上限。
5. 最後依列索引檢查每列成品長度不大於可用長度，並於全部有效後才展開及排料。

缺少欄位回 invalid_request_schema 並指向缺少的固定路徑；未知欄位回 unknown_field 並只指向其固定 owner path（request 或 rows.i），不可附加未知鍵。raw 字串超過 12 字元回 raw_too_long；名稱超過 UTF-8 或 code point 界線回 invalid_name。一般型別錯誤回 invalid_type；格式錯誤回 invalid_format；數值越界回 out_of_range；非正可用長度回 non_positive_usable。拒絕輸入不能留下舊的或部分計畫。

## 精確數學與 FFD v1

所有長度先解析為以 0.01 mm 為單位的 BigInt。決策不使用浮點數；輸出前才以固定兩位小數格式化。上限下最多 10,000,000 個百分之一毫米；200 件與最多 200 支原料的加總都可精確表示。成功結果只輸出受限整數 index/count 和十進位字串，不輸出 BigInt，也能直接 JSON.stringify。

1. 計算 usable = stock − 2 × trim；已在正值守衛失敗時停止。
2. 每列按 quantity 展開成 piece，每件保留 rowIndex（原列 0-based）和 pieceIndex（該列 1-based）。
3. 排序長度由大到小；相同長度依 rowIndex，再依 pieceIndex 升序。
4. 逐件掃描已建立 stock sticks，依 stickIndex 升序。若 stick 尚無成品，新增用量為 pieceLength；否則新增用量為 kerf + pieceLength。第一支能放下的 stick 收納該件；都放不下時新增 stick。
5. 每支計算 pieceLength=sum(piece lengths)、kerfLoss=kerf × max(0,pieceCount−1)、usedLength=pieceLength+kerfLoss、remainingLength=usable−usedLength。新支的第一件沒有前置鋸縫。
6. 每支原料都計入兩端 trim loss=2 × trim，即使該支只有一件或有餘料。

在每個 stick 內，pieces 按實際放置次序保存。每支的 remainingLength 不得小於零。總量定義如下：

    totalStock = stock × stickCount
    totalTrimLoss = 2 × trim × stickCount
    totalPiece = 所有成品長度總和
    totalKerfLoss = kerf × 所有 sticks 的 max(0, pieceCount − 1) 總和
    totalUsed = totalPiece + totalKerfLoss
    totalRemaining = usable × stickCount − totalUsed
    totalStock = totalTrimLoss + totalPiece + totalKerfLoss + totalRemaining

不得用顯示後的四捨五入值排料、比較或驗算。固定 FFD 的建立順序、tie-break、第一個可容納 stick 和 kerf 規則都不能在不同環境改變。

## 成功結果 schema

result 只能有以下固定欄位，欄位值都必須為可 JSON 序列化的 plain data；禁止 BigInt、raw 欄位、額外屬性、symbol、getter、非預期陣列 hole 或不一致派生值。

    {
      schemaVersion: 1,
      algorithm: "ffd-v1",
      settings: {
        stockLengthMm: "100.00",
        endTrimMm: "0.00",
        kerfMm: "2.00",
        usableLengthMm: "100.00"
      },
      rows: [{
        rowIndex: 0,
        id: "r1",
        name: "Part A",
        lengthMm: "49.00",
        quantity: 1
      }],
      sticks: [{
        stickIndex: 1,
        stockLengthMm: "100.00",
        trimLossMm: "0.00",
        usableLengthMm: "100.00",
        pieces: [{
          rowIndex: 0,
          pieceIndex: 1,
          id: "r1",
          name: "Part A",
          lengthMm: "49.00"
        }],
        pieceLengthMm: "49.00",
        kerfLossMm: "0.00",
        usedLengthMm: "49.00",
        remainingLengthMm: "51.00"
      }],
      totals: {
        stockCount: 1,
        pieceCount: 1,
        totalStockMm: "100.00",
        totalTrimLossMm: "0.00",
        totalPieceMm: "49.00",
        totalKerfLossMm: "0.00",
        totalUsedMm: "49.00",
        totalRemainingMm: "51.00"
      }
    }

上例僅示意型別；實際 stick 會由整份 request 的 FFD 產生。所有毫米字串使用 canonical ASCII decimal 固定兩位且無前導零（零固定為 0.00）；quantity/index/count 是小於等於 200 的安全整數，rowIndex 範圍 0–39，pieceIndex/ stickIndex 由 1 開始。rows 保留輸入順序，sticks 保留建立順序，pieces 保留放入順序。輸出不得保留 raw 輸入或未 trim 的名稱。

Result 的所有巢狀物件和陣列也使用 exact schema：拒絕缺漏、額外、symbol、non-enumerable、accessor、hole 或非一般 prototype。rows 長度為 1–40；stick 數為 1–pieceCount；所有 pieces 恰好出現一次且每列件數等於 quantity。rowIndex 在 0–39，pieceIndex 在 1–該列 quantity，stickIndex 在 1–200；stockCount 和 pieceCount 各在 1–200。name 與 id 遵守 request 的同一限制。每個毫米字串都必須是 canonical 固定兩位 ASCII decimal，且符合來源設定的範圍及派生上界：單支 stock/usable/used/remaining 不大於 100000.00；單支 trimLoss 不大於 20000.00；totalStock 不大於 20000000.00；totalTrimLoss 不大於 4000000.00；totalPiece 不大於 20000000.00；totalKerfLoss 不大於 199000.00；totalUsed/totalRemaining 不大於 20000000.00。正值來源欄位至少 0.01；非負派生欄位至少 0.00。這些是 schema 的上限，最終每一個欄位仍須由 canonical 重算結果逐欄比對，不能僅靠範圍檢查。

## buildReport(result, language)

language 只接受 zh-Hant 或 en。函式只接收成功 result，不接受 request，不重算 UI 的原始輸入；失敗回固定 {ok:false,error:{code,field}}，成功回固定 {ok:true,text,filename,mimeType}，沒有額外鍵。成功值為：

    {
      ok: true,
      text: "...固定格式報告...",
      filename: "glossquote-cut-plan.txt",
      mimeType: "text/plain;charset=utf-8"
    }

錯誤碼 invalid_language、invalid_result_schema、inconsistent_result、report_too_large。語言錯誤 field 為 language。形狀、descriptor、型別、界線錯誤 field 為 result 或固定欄位的最深可定位路徑；未知 string/symbol key 一律只回其 owner path（result 或 result.settings 等固定 schema path），不得把 key 名、名稱或值帶入錯誤。合法 schema 中派生值、放置次序、排序、總數不符，field 指向第一個不一致的固定 result.settings...、result.rows...、result.sticks... 或 result.totals... 路徑。檢查 result 前先檢查 language；錯誤物件不可 echo 不可信資料。

Report builder 先以 exact schema/descriptor guard 驗證，再由結果內的 normalized rows/settings 重建 canonical request，呼叫同一個純計算內部流程產生 expected result，並逐欄比對；只有完全一致的結果可輸出文字。報告固定依序輸出標題、heuristic disclaimer、鋸縫／末端／修邊切鋸模型說明、單位、stock/trim/kerf/usable 設定、stick/piece 數、總長度/各損耗/總已用/餘料、總平衡式，再依 stickIndex 輸出 stock/trim/usable、pieces 放置順序、該支 piece subtotal/kerf/used/remaining。每一行標籤與空格以 [驗收 C20–C21 snapshots](ACCEPTANCE.md#report-snapshots) 為唯一基準。報告不含當前時間、輸入 raw、外部連結或非固定欄位。每次輸出 UTF-8、無 BOM、LF 換行、無尾端換行，最多 131072 bytes；超過上限回 report_too_large/result。此上限是防禦性輸出守衛；依本 schema/模板，驗收使用合法最大 fixture 確認可成功且不超限，不要求製造一個不存在的合法超限輸入。此分支不宣稱可由合法輸入觸發；超大或 tampered result 必須先以 invalid_result_schema/result 拒絕。

## UI revision、複製、下載與清除

試算是同步且有界的，最多展開 200 件。每次輸入變動先 revision++、清空目前 result/report/status snapshot，再讀取表單；invalid input 也不可留下舊結果。唯一可分享的報告由某次成功計算的 immutable snapshot 建立。DOM 內容一律用 textContent/value。

剪貼簿只在明確點擊時呼叫 navigator.clipboard.writeText(report.text)。每次嘗試綁定 revision、requestId 和 pageGeneration；resolve、reject、finally 更新 UI 前都比對三者。遲到的 promise 不可覆蓋新狀態。寫入一旦交給瀏覽器不能保證撤回；取消、編輯和 pagehide 只能讓遲到回應失效。拒絕時顯示手動選取報告。

純文字下載只在明確點擊時建立 Blob/Object URL。每一次 URL 有各自從建立時起算的 30 秒 deadline；最多 8 個 live URL，第 9 次下載明確拒絕且不撤銷既有 URL。普通編輯或重新試算不得提前 revoke。使用者確認清除時 revoke 全部並清除其 timer；pagehide 也全部清理。期限到只 revoke 該筆 URL，不影響其他下載。

初始 values：stock length 空白、end trim 0、kerf 0、一列空白 name/length、quantity 1；無 result，所有工作按鈕和 fieldset 在初始化、schema 載入及事件註冊完成前 disabled，輸入控件不帶 name 屬性。初始化成功後，試算按鈕啟用以允許使用者提交空白/錯誤資料並收到驗證訊息；copy/download 只在成功結果且相同 revision 有效時啟用。

清除按鈕只在使用者目前狀態偏離上述初始值、已有結果/待處理複製/有效下載 URL 時要求確認。取消不改 state、revision 或 URL deadlines。確認會先 revision++ 和使非同步 token 過期，接著回到上述初始狀態、清除結果/status/report、撤銷全部 URL。pagehide 清除所有欄位與結果並增加 pageGeneration；BFCache persisted pageshow 以初始空白值重新初始化，不恢復草稿。


---

## 原文件 UX-SEO.md

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


---

## 原文件 ACCEPTANCE.md

# Cut Planner — 驗收標準

本文件是 M1 驗收預期。M0 尚未執行任何產品測試。核心 expected 值必須獨立手寫；不可用被測函式生成測試預期。每個成功案例都以百分之一毫米整數檢查每支及全案平衡，不用浮點誤差容忍。失敗案例必須精確核對 code/field、沒有 result，並確認後續輸入可重新成功。

## 手算核心案例

所有長度皆為 mm。未列出的 endTrim 為 0。ID、列索引和件序依 TECHNICAL.md 約定。表格中的 stick 內容按實際放置次序；rem 為可用餘料。

| ID | 輸入 | 預期 |
| --- | --- | --- |
| C01 | stock 100, kerf 0；A=60×1、B=40×1 | 1 支；stick 1: A60、B40；piece=100, kerf=0, used=100, rem=0 |
| C02 | stock 100, kerf 2；r1 A=49×1、r2 B=49×1 | 1 支；兩件各 49；piece=98, kerf=2, used=100, rem=0 |
| C03 | stock 100, kerf 2；A=51×1、B=48×1 | 2 支；stick 1 A51 rem49，stick 2 B48 rem52；總 piece=99, kerf=0, rem=101, stock=200 |
| C04 | stock 100, kerf 5；A=99×1、B=1×1 | 2 支；stick 1 A99 rem1，stick 2 B1 rem99；新支第一件前不扣 kerf |
| C05 | stock 100, kerf 0；需求列依序 70、60、40、30，各 1 件 | FFD 順序照長度下降；stick 1 為 70+30，stick 2 為 60+40；2 支，兩支 rem=0 |
| C06 | stock 100, kerf 0；列序 r1 Alpha60、r2 Beta60、r3 Gamma40，各 1 件 | 等長 60 先按列序：stick 1 Alpha60+Gamma40；stick 2 Beta60 rem40 |
| C07 | stock 100, kerf 0；r1 A=30×3 | 1 支；pieceIndex 1、2、3，順序不變；piece=90, rem=10 |
| C08 | stock 4, kerf 0.01；r1 A=0.01×200 | 1 支；piece=2.00, kerf=1.99, used=3.99, rem=0.01, stock=4.00 |
| C09 | 任意有效 stock；單列 quantityRaw="201" | error {code:"out_of_range",field:"rows.0.quantityRaw"}；不產生 plan |
| C10 | stock 100, kerf 0；40 個有效需求列，各 0.01×1 | 1 支；40 件，piece=0.40, kerf=0, rem=99.60 |
| C11 | 41 個列物件，即使每列其他值有效 | error {code:"too_many_rows",field:"rows"}；不產生 plan |
| C12 | stockLengthRaw="000000100000", trim="0", kerf="0"；單件長 100000 | 合法前導零、12 字元上界；1 支 exact fit，總原料和成品各 100000.00 |
| C13 | 任一 raw 數值字串長 13 個 ASCII 字元 | error {code:"raw_too_long",field:該 raw 路徑}，即使數值本身可能在範圍內 |
| C14 | stockLengthRaw="1.001" | error {code:"invalid_format",field:"request.stockLengthRaw"} |
| C15 | stock=0.02、每端 trim=0.01，單件長 0.01 | usable=0；error {code:"non_positive_usable",field:"usableLength"} |
| C16 | stock=100、每端 trim=10、列長=80.01 | usable=80.00；error {code:"piece_exceeds_usable",field:"rows.0.lengthRaw"}，沒有 partial sticks |
| C17 | quantityRaw="0" | error {code:"out_of_range",field:"rows.0.quantityRaw"} |
| C18 | 名稱 60 個 U+1F9F0 工具箱 emoji（UTF-8 240 bytes） | 合法，結果保存 60 code points 的 trimmed 名稱 |
| C19 | 名稱 trim 後 61 個 ASCII 字元 | error {code:"invalid_name",field:"rows.0.nameRaw"} |
| C20 | 將 C02 成功 result 傳入 zh-Hant report builder | 完整文字必須逐字符合下方繁中 snapshot |
| C21 | 將同一個 C02 result 傳入 en report builder | 完整文字必須逐字符合下方英文 snapshot |
| C22 | 將 C02 result 的 totals.totalStockMm 改為 "99.00" | error {code:"inconsistent_result",field:"result.totals.totalStockMm"}；不生成報告 |
| C23 | 語言參數為 "zh" | error {code:"invalid_language",field:"language"} |
| C24 | r1、r2 使用完全相同 id | error {code:"duplicate_id",field:"rows.1.id"} |
| C25 | stockLengthRaw 使用全形數字 "１００" | error {code:"invalid_format",field:"request.stockLengthRaw"} |
| C26 | stock=0.05、kerf=0.01；一列 0.01×3 | 1 支 exact fit；piece=0.03, kerf=0.02, rem=0 |
| C27 | stock=100、trim=5/端、kerf=1；兩件長度 90 | 2 支，各 piece=90、trimLoss=10、kerfLoss=0、rem=0；總 stock=200、piece=180、trim=20 |
| C28 | stock=10、trim=0.5/端、kerf=0.2；兩件長 4 | 1 支；usable=9、piece=8、kerf=0.2、rem=0.8、trim=1；總和 10 |
| C29 | 使用稀疏 rows 陣列 Array(1) | error {code:"invalid_request_schema",field:"rows.0"}；沒有讀取任何洞值 |
| C30 | 根物件有未知欄位 debug:true | error {code:"unknown_field",field:"request"}；不回顯 debug |
| C31 | 用 accessor getter 提供 stockLengthRaw，getter 會增加計數 | error {code:"invalid_request_schema",field:"request.stockLengthRaw"}；getter 計數仍為 0 |
| C32 | 同一有效 request 連續計算兩次 | 結果深相等且 request、rows、row objects 未被修改 |
| C33 | row name 含 U+000A 或孤立 surrogate | error {code:"invalid_name",field:"rows.0.nameRaw"} |
| C34 | stock 100；r1 長度 1、quantity 150；r2 長度 1、quantity 51 | 每列數量各自合法但總件數 201；error {code:"total_pieces_exceeded",field:"rows.1.quantityRaw"}，不產生 plan |
| C35 | quantityRaw="000000000001"、其他欄位有效 | 12 字元前導零整數合法，按數量 1 件計算 |
| C36 | nameRaw 只有空白字元 | trim 後為空；error {code:"invalid_name",field:"rows.0.nameRaw"} |
| C37 | nameRaw="  Pipe  "，其他欄位有效 | 成功 rows[0].name 與唯一 piece.name 都是 "Pipe"；不保留 raw name |
| C38 | 根物件有未知 key，其名稱為 "authorization_" 加 4096 個 x；該 own key 的 value 是會遞增計數的 getter，若執行則回傳 "CREDENTIAL_SENTINEL" | error {code:"unknown_field",field:"request"}；getter 計數為 0；JSON.stringify(error) 不含 key 或 sentinel |
| C39 | rows[0] 有未知 key "token=DO_NOT_ECHO"，其 value 是會遞增計數的 getter，若執行則回傳 "SENSITIVE_SENTINEL" | error {code:"unknown_field",field:"rows.0"}；getter 計數為 0；JSON.stringify(error) 不含 key 或 sentinel |
| C40 | 兩個獨立 request：其一根物件有未知 Symbol("SENSITIVE_ROOT")，其二 rows[0] 有未知 Symbol("SENSITIVE_ROW") | error 都是 unknown_field；分別 field=request 和 rows.0；symbol 描述不出現在錯誤中 |

C01–C08、C10、C12、C18、C26–C28、C32 必須同時檢查每支和全案的精確平衡：

    stick.stockLength = stick.trimLoss + stick.pieceLength + stick.kerfLoss + stick.remainingLength
    total.stock = total.trimLoss + total.piece + total.kerfLoss + total.remaining

把固定兩位小數字串轉成 BigInt 百分之一毫米後再相加。對任何成功結果都應檢查總式，案例專屬預期仍必須獨立手算，平衡式不能取代固定 expected sticks。

## Report snapshots

C20/C21 都使用 C02 request，列序和名稱如下：r1 名稱 A、49.00×1；r2 名稱 B、49.00×1。C02 是一支原料，兩件相鄰，stock 100.00、trim 0.00/端、kerf 2.00、piece 98.00、總 trim 0.00、總 kerf 2.00、used 100.00、remaining 0.00。報告固定 LF、UTF-8 無 BOM、無尾端換行，檔名 glossquote-cut-plan.txt，MIME text/plain;charset=utf-8。每份報告在演算法提醒後固定加入切鋸模型與餘料限制行。以下 fenced text 內是完整 text 字串；最後一行後不得再附換行。

繁體中文：

~~~text
GlossQuote 長料裁切規劃
演算法：FFD v1（啟發式；不保證使用最少支原料）
模型：鋸縫只計相鄰成品；不計修邊切鋸與最後成品至餘料間鋸縫。餘料不保證可回用。
單位：mm
原料長度：100.00
每端修邊：0.00
相鄰件鋸縫：2.00
單支可用長度：100.00
原料支數：1
成品件數：2
原料總長：100.00
成品總長：98.00
兩端修邊總損耗：0.00
鋸縫總損耗：2.00
總已使用可用長度：100.00
餘料總長：0.00
平衡：100.00 = 98.00 + 0.00 + 2.00 + 0.00
原料 1（原料 100.00；修邊損耗 0.00；可用 100.00）
  1. A（需求列 r1，第 1 件）：49.00
  2. B（需求列 r2，第 1 件）：49.00
成品小計：98.00；鋸縫：2.00；已使用可用長度：100.00；餘料：0.00
~~~

English:

~~~text
GlossQuote Cut Planner
Algorithm: FFD v1 (heuristic; does not guarantee the fewest stock sticks)
Model: Kerf is counted only between adjacent pieces; end-trim cuts and a final cut before leftover are excluded. Remaining length is not guaranteed reusable.
Unit: mm
Stock length: 100.00
End trim per end: 0.00
Kerf between adjacent pieces: 2.00
Usable length per stick: 100.00
Stock sticks: 1
Pieces: 2
Total stock length: 100.00
Total piece length: 98.00
Total end-trim loss: 0.00
Total kerf loss: 2.00
Total used usable length: 100.00
Total remaining: 0.00
Balance: 100.00 = 98.00 + 0.00 + 2.00 + 0.00
Stock 1 (stock 100.00; trim loss 0.00; usable 100.00)
  1. A (row r1, piece 1): 49.00
  2. B (row r2, piece 1): 49.00
Piece subtotal: 98.00; kerf: 2.00; used usable length: 100.00; remaining: 0.00
~~~

測試需核對 builder 的完整 text 以及固定 success shape、檔名和 MIME；不能只比對包含幾個詞。另驗證輸出無 BOM、只用 LF、沒有尾端 LF、result JSON 可序列化且沒有 BigInt。

## Descriptor、資料與失敗案例

除 C29–C31、C36–C40 外，需測試 root/row null、array subclass、額外 own string key、symbol key、non-enumerable key、缺欄位、getter/setter、稀疏列、重複 ID、數字值非 string、前後空白數值、正負號、e/E、逗號、全形小數點、全形數字、.5、1.、三位小數、超長 raw、無效 ID、超長 UTF-8 名稱、Cc、U+2028/U+2029、孤立 surrogate、null rows、空列、零修邊的成功界線、兩端修邊總和等於或超過原料長度、單件恰好 usable、單件超過 usable、總件數剛好 200 和首次超過 200。

所有錯誤核對固定 error object 只有 code/field、不帶 raw input、不帶 result；成功物件只有 ok/result。未知輸入或錯誤不得留存舊版 UI 結果。大小寫不同的 ID 合法；同大小寫重複不合法。前導零在 12 字元上限內可接受，結果毫米字串採 canonical fixed-two 格式。輸入格式、schema descriptor 與範圍同時錯誤時，依 TECHNICAL.md 的驗證次序回報第一個錯誤。

Report builder 還需對 invalid result descriptor、未知結果欄位、改動每一種 derived value、錯誤 stick/piece 排序、名稱/列對應不一致、BigInt、hole、超過長度界線作失敗測試。未知 root key（包含超長/敏感 key）回 invalid_result_schema/result，未知 nested key 回固定 owner path；不得 echo key/value，getter 不得執行。

R03：Report result root 加入一個名為 "authorization_" 加 4096 個 x 的未知 own key，並把 value 設為回傳 "CREDENTIAL_SENTINEL" 且會遞增計數的 getter。預期 invalid_result_schema/result、getter 計數為 0，JSON.stringify(error) 不含 key 或 sentinel。result.settings 上的未知 key 則回 invalid_result_schema/result.settings，不回顯 key。

合法最大報告案例 R01：40 列、各 id 40 個唯一 ASCII 字元、各 name 為 60 個 U+1F9F0（raw UTF-8 240 bytes）、各 length 100000.00、各 quantity 5；stock=100000.00、trim=0、kerf=0。預期 200 件、200 支、totalStock=totalPiece=20000000.00、trim/kerf/remaining=0；buildReport 成功且 UTF-8 bytes <=131072，完整保留 200 支標頭和 200 件明細，不能截斷。這是驗證有效最大輸入仍符合 byte cap 的 fixture，不要求產生合法超限資料。

超大或 tampered result 案例 R02：把 result 名稱或陣列擴至 schema 上限之外，或加任意巨大 unknown key；預期先回 invalid_result_schema，field 為 result 或固定 nested owner path，不可回顯資料，也不得以 report_too_large 代替 schema 錯誤。依目前 schema 和固定模板，report_too_large 是防禦分支；若合法最大 fixture 在 131072 bytes 內，沒有可誠實宣稱通過的「合法超限」案例，也不要求觸發此分支。

## 瀏覽器驗收

每個語言實際各走一次從初始欄位到結果檢視的主要流程。瀏覽器 UI 驗收只用 browser 工具和此任務專屬隔離/隱藏分頁；不可控制桌面/native app/OS 滑鼠鍵盤、搶焦點、改動使用者既有分頁或剪貼簿，也不可觸發原生列印、檔案選擇或儲存視窗。允許無 OS 視窗的 browser 工具操作及背景 CLI。

預設空白、不自動填入範例；按試算能取得空白錯誤；語言切換會清掉工作，確認/取消行為明確。所有表單控制在初始化及 listener 綁定完成前 disabled，工作按鈕初始化後依規格啟用，輸入欄無 name，提交不導航且網址不含使用者輸入。

手動 browser cases 至少包含：

- 初始狀態、空白和格式錯誤訊息、欄位關聯、首錯焦點，以及 40 列/200 件上限。
- 桌機和 320 CSS px 手機的雙語主流程、鍵盤焦點、列序、顯示平衡和逐支 FFD 結果。
- 兩語頁面都可見地說明只計相鄰成品間鋸縫、不計修邊下刀鋸縫、不扣末件至餘料的末端鋸縫、餘料不保證可回用；報告固定模型說明行與該頁語言相同。
- 任一欄位修改立即使成功結果和舊報告失效；新試算才重新啟用 copy/download。
- 用被測試替身（stub/mock）的 Clipboard API adapter 核對明確按鈕、報告文字和遲到 resolve/reject/finally revision 行為；替身不得轉呼叫真實 clipboard API 或改動系統剪貼簿。真實瀏覽器 writeText、權限提示及剪貼簿內容實寫標記 NOT_RUN。
- 下載 adapter 和 Blob/Object URL lifecycle 以不觸發原生下載的 mock 驗證報告 bytes、每 URL 各自 30 秒期限、最多 8 個 live、第 9 次拒絕且保留舊 URL、普通編輯與重算不提早 revoke。不得觸發原生檔案下載、選擇或儲存視窗；真實瀏覽器下載標記 NOT_RUN。
- 清除確認取消後資料/結果/deadline 保留；確認後回初始空白、結果清除、URL 全 revoke；在無工作狀態不出現多餘確認。
- pagehide 清空頁面持有的資料和 URL；BFCache restore 不恢復草稿。Clipboard 已交給瀏覽器的寫入不能承諾撤回。
- JavaScript 關閉時表單不能 GET submit；已載入頁面且資產留在記憶體時離線試算可用，但離線重載不保證。
- 無未授權同源以外請求、storage、cookie、analytics 或 log。完整 Network/Storage 實測若沒有實際觀察證據，記為 NOT_RUN。

Clipboard 與下載 mock 只驗證本頁程式的狀態管理、報告文字/bytes 和 adapter 參數；不得寫系統剪貼簿，也不代表 OS/瀏覽器原生能力。真實瀏覽器 clipboard write、clipboard 權限提示、原生下載、原生列印、檔案選擇視窗、儲存視窗、真機、背景/恢復的完整 BFCache 行為、正式 HTTP headers/CDN 遙測逐項標 NOT_RUN；不可用 mock、DOM 模擬或本機 model 冒充。任何 UI 驗收都使用 browser 工具中的任務專屬隔離/隱藏頁，不碰使用者既有分頁或 OS 輸入裝置。

## 工具鏈與發布 gate

M1 運行 Node.js >=24 的離線 npm test、npm run check、npm run build；preview server 限 loopback 4212 並核實 HTML/CSS/ESM/TXT/XML MIME、GET/HEAD、錯誤路徑 404、preview noindex/nofollow 和資產 allowlist。只有最終候選輸入確認後各執行一次，若修正再重跑受影響 gate。

M2 需主代理先明確 GO；另行驗 production build/check、release:check、dist-production 獨立、5212 model、SEO/hreflang/robots/sitemap/CSP/headers/404 和公開來源 commit/visibility。M0/M1 不得宣稱 M2 或 M3。完整 Network/Storage、真機和原生操作等未執行項目仍以 NOT_RUN 記錄。

## 規格連結

- [API、錯誤順序與 FFD 演算法](TECHNICAL.md)
- [產品範圍與已知限制](PRODUCT.md)
- [雙語介面和 SEO 文案](UX-SEO.md)
- [里程碑](TASKS.md)


---

## 原文件 TASKS.md

# Cut Planner — 任務與里程碑

## 目前狀態

2026-10-19 主代理依既有 ACCEPTANCE 人工未驗界線授予 M1 scoped GO 並明確放行 M2。兩輪實際瀏覽器證據合併69 PASS、0 FAIL、3 PARTIAL、7 NOT_RUN；繁中BFCache未見persisted，兩語Network/Storage保留部分／人工範圍。原對話正處理 M2 production/source 候選，不部署／修改首頁或操作UI。本節只更新進度，不放寬下列門檻；精確範圍見 HANDOFF及docs/PUBLIC-RELEASE.md。requested model 為 gpt-6.1-sol/max；backend identity未獨立確認。

M2原對話交回結果：PUBLIC來源commit123dc556b5c584e467c3ac2ff4a80de0f2fdced4已核對，固定ZIP48files，workspace與clean-checkout各66/66及全部離線gates通過；主代理獨立M2驗收／M3仍待處理。此來源版本及人工未驗範圍不因發布後註記而改動。

## M1 — 本機完整產品

只有主代理確認本規格和共通文件可派工後，原功能對話一次完成本機 MVP。工作範圍含純函式核心、精確 descriptor 驗證、FFD v1、逐支結果、完整繁中/英文 UI、文字報告、copy/download lifecycle、SEO 預覽頁、CSP/headers、固定 allowlist 的 Node 24 工具鏈和假資料測試。

所有 feature UI 驗收只用 browser 工具及本任務專屬隔離/隱藏分頁。不可控制桌面/native app/OS 滑鼠鍵盤、搶焦點、操作使用者既有分頁或剪貼簿，也不可觸發原生列印、檔案選擇或儲存視窗。可使用無 OS 視窗的 browser 工具操作及背景 CLI。Clipboard 的 browser UI 行為只用不會轉呼叫 navigator.clipboard.writeText 的 stub/mock/API 程式測試；不改動使用者系統剪貼簿。真實 clipboard write/權限提示、原生下載、原生列印、檔案選擇與儲存視窗都逐項記為 NOT_RUN。

M1 必須完成：

1. 依 [TECHNICAL.md](TECHNICAL.md) 實作 calculateCutPlan 與 buildReport；不改演算法、驗證次序、schema、錯誤界線或 oracle 預期。
2. 依 [ACCEPTANCE.md](ACCEPTANCE.md) 提供 C01–C40 手算核心、R01–R03 報告上限與安全 schema 案例、descriptor/schema/非突變/錯誤全無 partial、report tampering，以及雙語瀏覽器 cases。預期值必須手寫或由獨立 oracle 計算，不能呼叫被測函式產生 expected。
3. 完成 zh-Hant 和 en 主流程，320px 鍵盤操作、列增刪、空白/非法錯誤、實時失效、清除取消/確認、語言切換清空；copy/download adapter 以不碰原生 OS 的 stub 驗證權限錯誤、遲到 Promise、最多 8 個獨立 URL，mock 只能標成模擬。瀏覽器真實剪貼簿寫入、原生下載、列印、檔案選擇及儲存視窗都必須 NOT_RUN。
4. 設置 Node.js >=24 ESM/built-ins，離線 node --test、check/build、固定 preview server 和 HTTP 模型；preview 預設 port 4212，loopback only，noindex/nofollow。不得安裝套件。
5. 完成安全/SEO靜態檢查：無 runtime dependency、網路呼叫、儲存、上傳、secret、動態 inline style 或不可信 HTML；所有 path/allowlist/symlink/hardlink/size/CSP/MIME/404 gates 通過。
6. 在 HANDOFF 中精確記錄指令、版本、exit、測試數、真實 UI/HTTP範圍與 NOT_RUN。真機、完整 Network/Storage、原生剪貼簿與下載等未測項明列 NOT_RUN，不用 mock 宣稱通過。

本地候選命令由共通工具鏈提供，至少記錄 node --version、npm test、npm run check、npm run build，並啟動 npm run dev -- --port 4212 完成 HTTP/UI 驗收。未經主代理 M1 GO，不得建立 M2 production toolchain、公開 repo 或部署。

## M2 — 公開來源候選

主代理明確回覆 M1 GO 後，原功能 chat 才可以建立獨立 production source release，並在使用者明確已授權的 GlossQuote 工具流程內發布 public repo KYStr/glossquote-labs-cut-planner。沿用 [發布契約](docs/RELEASE.md) 和 [任務入口](TASK-ENTRY.md) 的 source safety、固定 git guard、reviewed publishing copy、乾淨 checkout 驗證、commit/visibility/hash/ZIP 證據。

M2 必須維持 preview dist/ 與 production dist-production/ 分離，production build/check 不覆寫 preview；提供 5212 loopback local production model、release:check、正式 index/noindex/hreflang/x-default/JSON-LD/robots/sitemap/headers/404 檢查。source publication 完成不代表已部署正式站或主代理已驗收。不可讀取或回報 credentials。

## M3 — 主代理整合

M3 由主代理負責，在 M2 review 後處理免費正式部署、兩語 live、首頁 catalog、首頁 source/部署、HTTP/SEO/安全與正式 UX 驗收。原功能 chat 不修改共用首頁、家族 Wrangler、共用契約或其他工具。只有主代理明確交付的放行才能進入下一 gate；live 或 homepage 若未完成要如實保留。

## Release/外部驗收狀態

每個 milestone 一次推進；失敗停在原 gate 修正後重驗。沒有 M1 或 M2 證據時不宣稱 build/test/發布完成。真機、真實原生 clipboard/download、完整 Network/Storage 和其他實際尚未執行的項目保留 NOT_RUN。完成 live release 後版本標記 awaiting-external-review；只有外部 reviewer 給出結果並完成必要修正、重驗、重發且確認後才可標完成。

## 相關文件

- [產品規格](PRODUCT.md)
- [技術規格](TECHNICAL.md)
- [UX 與 SEO 規格](UX-SEO.md)
- [驗收案例](ACCEPTANCE.md)


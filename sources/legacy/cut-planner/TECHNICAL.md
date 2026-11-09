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

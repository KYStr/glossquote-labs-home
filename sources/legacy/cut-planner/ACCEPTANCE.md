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

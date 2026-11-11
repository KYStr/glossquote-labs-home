# 工作坊志願與座位分配 / Workshop Preference Allocation

規格 ID `spec-workshop-preference-allocation-20261111`，v1，2026-11-11。規格候選待非作者審查。產品證據為 `NOT_RUN`。[研究與使用情境](BRIEF.md) · [字面測例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

社區活動志工已收齊同一時段手作課的志願。每人最多三個志願，教室座位固定。志工在桌面來源表排定優先順序，準備只含報名代碼的志願 CSV 及教室 CSV。工具先顯示實際分配順序，再一次產出各班名單、剩餘座位及未分配原因。值班人員用手機查看所選班、核對人數與代碼或下載該班清單。

成功時每一個報名代碼在整批檔恰好出現一次。志工能把一個單班檔交給該班值班人員，並使用整批檔或畫面上的「未分配」清單聯絡未入班者。兩次使用相同表格內容和順序的輸出位元組一致。順序、座位數或志願變動後，需要重新分配才能匯出。

## scope

- 免安裝的雙語靜態 Product App。每來源接受貼上或選取一份 UTF-8 CSV，至多 131,072 bytes。工作坊 1–30 筆，報名 1–500 筆，每筆最多三個依序志願。支援固定名額、部分或全數未分配、空班名單、整批下載及單班下載。
- 先載入頁面與同源靜態資產，之後貼上、讀檔、預覽、分配及下載只需瀏覽器記憶體。以 Chrome、Edge 桌面及代表性 Android Chrome、iOS Safari 實體裝置驗證，交驗記錄實際版本、OS 與 viewport。桌面以備表和分班為主，手機保留全部流程。瀏覽器更新、離頁或切語需重新匯入，沒有草稿復原功能。
- 報名、寄信、抽籤、最佳化總錄取、跨時段、群組不拆、身分特權、自動遞補、同步帳號、外部表單／試算表整合均在本版範圍外。使用者在原來源表決定先後；頁面不排序或自動推論優先規則。
- 分桌候選依整群、桌容量和無階限制回溯；禮物候選求完整一對一配對；隨機分組以洗牌和平衡為目標；CSV 工作台是通用欄位預覽。各自的實際核心與固定來源見 [BRIEF](BRIEF.md)。本案輸出是既定順序下、有座位上限且允許未分配的分班交接。

## userFlow

使用 Product App 家族權杖，沿用 [工具設計基線](../../TOOL-DESIGN-BASELINE.md) 的 paper／ink、系統字型回退、控制邊線、焦點、間距和 48／75 rem 斷點。課名採自動方向的隔離文字，代碼以等寬字呈現。核心控制可見，結果表是主要工作區。

```text
桌面  [工具名 · 首頁 · English]
      [工作坊 CSV 貼上／選檔] [志願 CSV 貼上／選檔] [載入範例 · 重設]
      [座位預覽] [依表格順序預覽報名代碼和三欄志願] [依表格順序分配]
      [各班座位和合計] [選擇名單] [所選班或未分配表] [該班／整批下載]

手機  [工具名 · 首頁 · English]
      [工作坊 CSV] [志願 CSV] [預覽] [依表格順序分配]
      [結果合計與順序說明] [選擇名單] [可橫捲的具名表格] [相鄰下載]
```

兩張來源各用原生可見 `label`、textarea 和單選檔案控制，選檔由使用者觸發，accept 屬提示，格式依內容判定。每張旁有固定表頭提示。預覽顯示每班 ID、課名、座位，以及每個報名資料列的優先序、報名代碼和各志願欄。具名表格區可用鍵盤及觸控橫向捲動，控制留在區外。首次載入顯示空白，不自動填假資料。載入範例明示同時取代兩份草稿。錯誤後保留可編輯草稿，來源欄和固定位置訊息相連，避免重覆播報。下列中英文在相同操作位置使用。

| 狀態或位置 | 繁體中文 | English |
| --- | --- | --- |
| 工作坊來源 | 工作坊 CSV | Workshops CSV |
| 志願來源 | 志願 CSV | Preferences CSV |
| 貼上／選檔 | 貼上 CSV／選取 CSV 檔案 | Paste CSV / Choose CSV file |
| 來源種類 | 貼上內容／檔案來源 | Pasted text / File source |
| 範例與重設 | 載入範例（取代兩份草稿）／重設 | Load example (replace both drafts) / Reset |
| `empty` | 貼上或選取工作坊與志願 CSV。 | Paste or choose the workshops and preferences CSVs. |
| `partial` | 加入另一份 CSV 即可預覽分配順序。 | Add the other CSV to preview allocation order. |
| `loading` | 正在讀取所選 CSV。／取消讀取 | Reading the selected CSV. / Cancel read |
| `cancelled` | 已取消讀取。可重新選檔或使用保留草稿。 | Read cancelled. Choose a file again or use the retained draft. |
| 恢復動作 | 使用保留草稿 | Use retained draft |
| `ready` | 請核對志願表順序與各班名額。 | Check the preference row order and workshop capacity. |
| 預覽標籤 | 工作坊與名額／分配順序／工作坊代碼／課名／名額 | Workshops and capacity / Allocation order / Workshop ID / Workshop title / Capacity |
| 志願表欄 | 順序／報名代碼／第一志願／第二志願／第三志願 | Order / Registration ID / First choice / Second choice / Third choice |
| 分配 | 依表格順序分配 | Assign in row order |
| `dirty` | 來源已變更。請重新分配。 | A source changed. Assign again to update the results. |
| `complete` | 已完成分配。請選擇班級或查看未分配。 | Allocation complete. Choose a workshop or view unassigned entries. |
| 結果旁常駐說明 | 按志願表的資料列順序分配。每人取得當下仍有座位的最高志願。重排行可能改變入班名單與總錄取人數。 | Allocation follows the preference table's row order. Each person gets their highest choice with a seat still available. Reordering rows can change the rosters and total placements. |
| 結果統計 | 報名人數／已分配／志願已滿／未填志願／剩餘名額 | Registrations / Assigned / Choices full / No preference / Seats left |
| 名單選擇 | 選擇名單／未分配 | Choose a roster / Unassigned |
| 結果欄 | 報名代碼／分配志願序／未分配原因 | Registration ID / Assigned choice rank / Reason unassigned |
| 空班 | 這班目前無人分配。可下載只有表頭的名單。 | This workshop has no assigned participants. You can download a header-only roster. |
| 未分配清單空白 | 每位報名者都已分配。 | Every registration has been assigned. |
| 下載 | 下載整批分配／下載本班名單 | Download all assignments / Download this roster |
| 下載旁 | 單班檔只含本班已分配代碼；整批檔含全部報名代碼。請將試算表的 ID 欄當文字匯入。 | The workshop file contains only that workshop's assigned IDs. The batch includes all registration IDs. Import ID columns as text in spreadsheets. |
| 頁面資料提示 | 頁面載入後在此瀏覽器處理。離開或切換語言將清除草稿。 | After loading, processing stays in this browser. Leaving or changing language clears your drafts. |

分配按鈕旁在預覽時同樣顯示前兩句順序說明。成功後預設選第一個工作坊，按工作坊 CSV 順序列出選項，再列「未分配」。已分配表依報名順序含代碼及志願名次。未分配表依報名順序含代碼及原因，選到該視圖時仍可下載整批。空班、未分配為零及全部未分配皆有明確文字。重新選班不變更分配。支援狀態文字及計數，不單靠顏色或圓形圖示。分配同步完成，不顯示不可取消的忙碌進度。

選檔後清除原生 input 值以便重選同檔。取消系統選檔而未取得檔案時維持目前畫面。讀檔中的取消按鈕只中止該來源，保留前一份可見草稿，暫停分配直到該來源被編輯、重新選取或點選「使用保留草稿」。讀取錯誤同樣可恢復。合法 UTF-8 中的 CSV 錯誤仍保留當次輸入文字供修正。錯誤訊息加來源及數字位置，與問題欄透過 `aria-describedby`／`aria-invalid` 關聯。操作後以單一 `aria-live="polite"` 區域回報狀態；讀取按鈕與來源欄保持可聚焦，取消後焦點回到該來源選檔控制。重設焦點到工作坊貼上欄。成功由狀態播報並提供可循序聚焦的結果，不搶走輸入焦點。提供 44 CSS px 常用觸控控制、可見雙層 focus、對比、縮放、reduced motion、虛擬鍵盤及翻譯伸長驗證。

## inputsOutputs

**表示法。** 純核心的來源參數是 `{kind:"text",text:string}` 或 `{kind:"bytes",bytes:Uint8Array}`，來源順序為 `workshops`、`preferences`。每個包裝物件只允許這兩個 own data keys，拒絕額外欄、錯誤型別及 accessor。預覽解析以 `{ok:true,value:{workshops,participants}}` 或 `{ok:false,error:{source,code,record,column}}` 回傳。來源固定為 `workshops` 或 `preferences`。邏輯 record 和欄均 1-based，表頭是 record 1；來源級失敗兩位置為 null。欄序與資料列不排序。

**每表共用格式及錯誤先後。** 整批先完整驗工作坊，再驗志願；志願已可讀但尚無工作坊時，預覽暫做志願表本地檢查，待工作坊有效後重驗參照。單表使用以下順序。

1. 包裝 schema → 大小。檔案以 `File.size` 拒絕大於 131,072 bytes，讀回再驗 `byteLength`。貼上先以 UTF-16 長度拒絕超過 131,072，再以 UTF-8 TextEncoder 長度計量，包含 BOM；孤立 surrogate 的大小計量以 encoder 的替代值計量，但解析會拒絕該輸入。正好 131,072 bytes 進入後續檢查。
2. 只剝除流首一個 U+FEFF。後續 U+FEFF 拒絕。UTF-8 以 fatal 解碼，`ignoreBOM:true` 保留 BOM 供 parser。無效 UTF-8 的首個錯序列以合法前綴加故障 token 送入同一 CSV lexer 來決定 record／欄。首錯取無效序列起始 byte；若續接 byte 破壞原序列，定位仍在原起始處；合法多位元字元不作為 CSV 分隔。貼上遇孤立 UTF-16 surrogate 同理用故障 token。其前若已觸發不可恢復的結構錯誤，回較早的錯。讀檔後原始 CRLF／LF 和 BOM 保留於權威文字，textarea 呈現瀏覽器的 LF 值；第一次編輯轉為當次 textarea 值，不再混入原檔。
3. CSV 的分隔是 ASCII 逗號。欄首可加 ASCII 雙引號，欄內雙引號只允許成對跳脫。引號只能在欄首開始，結束引號之後只容許逗號、record 分隔或 EOF。接受 record 分隔 LF、CRLF，可混用。孤立 CR 是 `CSV_SYNTAX`。引號內 CR 或 LF 為 `CONTROL_CHARACTER`，本工具只收單行欄位。其他禁用控制為 C0、DEL、C1（U+0000–001F、007F–009F）、U+2028、U+2029，以及後續 U+FEFF。例外只有引號外用於 record 分隔的 LF 或 CRLF。行尾一個終端分隔不新增空列；顯式空 record 有一個空欄，不略過。沒有 Unicode 正規化、trim、轉型或靜默修補。
   U+FEFF 專用錯碼為 `UNEXPECTED_BOM`。其他禁用控制使用 `CONTROL_CHARACTER`。
4. 結構採資料流上第一個錯。新 record 有下一 token 且超過資料筆數時先回 `ROW_LIMIT`，位置為工作坊 32:1 或志願 502:1。每個 token 先處理 UTF-8／Unicode 故障或禁用控制，再依 CSV 狀態。引號未閉在 EOF 回目前 record／欄的 `CSV_SYNTAX`。分隔符開出多餘欄時立即回 `COLUMN_COUNT`，欄為期望欄數 +1。record 結束少欄時回第一個缺欄。表頭在該 record 完成且欄數正確時按解引號後的格值逐欄比對，第一處不符回 `HEADER_MISMATCH`。空或僅 BOM 回 1:1 的 `SOURCE_EMPTY`，只有正確表頭回 2:1 的 `DATA_ROWS_REQUIRED`。全表結構完整後才做該表語義，故同一來源後段結構錯誤早於前段欄值錯誤。
5. 語義依原 record 順序與欄順序遇錯即停。對於跨欄或跨表志願，檢查順序固定如下一段。前後空格只有課名可留，於 ID、名額或表頭按精確值驗證。

| 來源 | 精確表頭 | 欄位 |
| --- | --- | --- |
| 工作坊 | `workshop_id,title,capacity` | `workshop_id` 為 1–32 個 ASCII 字元，首字元為 A–Z、a–z 或 0–9，其餘可加 `_` 或 `-`，大小寫敏感。先檢格式，再檢本表重複。課名用解引號的原字串，1–80 Unicode 碼點，用 ECMAScript 空白測試判定非全空白而保留原值。先檢長度，再檢全空白。名額文法 `[1-9][0-9]*`，全值 ASCII、無前導零、正負號或空白，範圍 1–500。文法通過才判範圍；超過三位直接判超範圍，無精度截斷。 |
| 志願 | `participant_id,pref1,pref2,pref3` | `participant_id` 同工作坊 ID 文法，獨立的重複集合。每個志願從左至右，空字串記錄首空；後續非空先檢 `PREFERENCE_GAP`，再檢 ID 文法、與前欄重複、引用是否存在。前三欄可皆空。大小寫有別，保留前導零和原字串。同名課可用不同工作坊 ID。 |

| code | 位置 | 繁體中文 | English |
| --- | --- | --- | --- |
| `SOURCE_SCHEMA` | null/null | 無法讀取來源。請貼上或重選 CSV。 | Could not use this source. Paste or choose the CSV again. |
| `INPUT_TOO_LARGE` | null/null | 每份 CSV 上限 128 KiB。 | Each CSV can be up to 128 KiB. |
| `INVALID_UTF8` | 故障 record／欄 | 檔案不是有效 UTF-8。請轉存為 UTF-8 CSV。 | This file has invalid UTF-8. Save it as UTF-8 CSV and try again. |
| `INVALID_UNICODE` | 故障 record／欄 | 有不完整的 Unicode 字元。請修正該欄。 | This field contains an incomplete Unicode character. Correct the field. |
| `CONTROL_CHARACTER` | 違規 token 所在欄 | 此欄含控制字元或格內換行。請保留單行文字。 | This field contains a control character or line break. Use single-line text. |
| `UNEXPECTED_BOM` | 違規 token 所在欄 | BOM 只允許在 CSV 開頭出現一次。 | A BOM is allowed once at the start of the CSV. |
| `CSV_SYNTAX` | 當前 record／欄 | CSV 引號或換行格式不符。請修正該欄。 | Check the CSV quoting and line endings at this field. |
| `COLUMN_COUNT` | 第一個多／缺欄 | 欄數與固定表頭不同。請核對逗號與欄位。 | Column count differs from the required header. Check commas and fields. |
| `ROW_LIMIT` | 首筆超限 record、1 | 資料列超過上限。請核對這份表的列數。 | Too many data rows. Check this table's row limit. |
| `HEADER_MISMATCH` | 1／首差欄 | 欄名或順序不同。請使用欄位旁的固定表頭。 | The header or column order differs. Use the required header shown beside the input. |
| `SOURCE_EMPTY` | 1/1 | CSV 無內容。請加入表頭及資料列。 | The CSV is empty. Add the header and data rows. |
| `DATA_ROWS_REQUIRED` | 2/1 | 請加入至少一筆資料。 | Add at least one data row. |
| `ID_FORMAT` | 違規 ID 欄 | 請使用 1–32 個允許的 ASCII 代碼字元。 | Use 1–32 permitted ASCII ID characters. |
| `DUPLICATE_ID` | 重複 ID 第二次出現 | 此代碼已出現。每份表的 ID 必須唯一。 | This ID has already appeared. IDs must be unique within a table. |
| `TITLE_LENGTH` | record／2 | 課名須為 1–80 個 Unicode 碼點。 | The workshop title must contain 1–80 Unicode code points. |
| `TITLE_BLANK` | record／2 | 課名不可只有空白。 | The workshop title needs non-whitespace text. |
| `CAPACITY_FORMAT` | record／3 | 名額請填不含前導零的 ASCII 正整數。 | Enter a positive ASCII integer with no leading zero for capacity. |
| `CAPACITY_RANGE` | record／3 | 名額須介於 1 至 500。 | Capacity must be from 1 to 500. |
| `PREFERENCE_GAP` | 首個空格後的非空欄 | 請從第一志願開始連續填寫。 | Fill preferences consecutively starting at the first choice. |
| `DUPLICATE_PREFERENCE` | 重複志願第二次出現 | 同一人不可重複選同一班。 | A registration can choose a workshop only once. |
| `UNKNOWN_WORKSHOP` | 違規志願欄 | 志願代碼在工作坊 CSV 中找不到。請核對大小寫。 | This choice does not match a workshop ID. Check letter case. |
| `READ_FAILED` | null/null | 讀檔失敗。請重選檔案、貼上或使用保留草稿。 | Reading failed. Choose a file again, paste, or use the retained draft. |
| `READ_CANCELLED` | null/null | 已取消讀取，草稿仍保留。 | Read cancelled. The previous draft is still available. |

位置顯示固定使用「第 {record} 筆 CSV 記錄，第 {column} 欄」／“CSV record {record}, column {column}”。無位置不顯示位置片語。錯誤內容不含原始值、路徑、檔名、例外或堆疊。多讀取狀態的排序工作坊先、志願後。檔案 API 不支援時保留貼上路徑，顯示「此瀏覽器無法讀檔，請貼上 CSV。」／“This browser cannot read files here. Paste the CSV instead.”。下載 API 不可用或呼叫失敗時保留名單，提示「無法開始下載，請重試或換用支援的瀏覽器。」／“Could not start the download. Try again or use a supported browser.”。缺必要解碼或渲染基礎時明示無法處理，不使用外部服務。

**輸出形狀。** 內部已驗 `workshops` 為依原序的 `{workshopId,title,capacity}`，`participants` 為依原序的 `{participantId,preferences:string[]}`。分配結果為 `{totals,workshops,rows}`。其中 `totals` 固定 `participants,assigned,choicesFull,noPreference,capacity,remaining`，全為非負整數；`workshops` 原序，各筆 `workshopId,title,capacity,assigned,remaining`；`rows` 原序，各筆 `participantId,workshopId,status,preferenceRank`。已分配是 `assigned`、工作坊 ID、1–3；`choices_full` 和 `no_preference` 的工作坊與名次皆 null。

兩種下載均以 `text/csv;charset=utf-8` 組成 Blob，UTF-8 無 BOM、CRLF、無末尾 CRLF。表頭恆為 `participant_id,workshop_id,status,preference_rank`。整批名 `workshop-assignments.csv`。單班名 `workshop-NN-roster.csv`，NN 為工作坊原表 1–30 的二位十進位資料列序（不含表頭），以 0 補位。單班只匯出該班 `assigned` 列，保持報名順序，空班只有表頭。兩種語言匯出位元組完全相同。分隔格均為已驗 ASCII ID、固定 enum、ASCII 整數或空字串，沒有引號或前置轉義。可疑代碼如 `=1`、`-A`、`@A`、前導空白或全形符號以文法拒絕；課名可以是相同字面文字但永遠不進 CSV。下載按鈕只觸發當前核准內容，檔名不取自輸入。試算表仍可能轉換 `001`、`1E5` 等代碼，說明以文字匯入以保留其原值。

完整成功、兩組對照重排、錯誤位置和兩種下載字面值在 [fixtures.json](fixtures.json)。標準案例的整批檔 147 bytes，W2 單班檔 87 bytes，空班檔 49 bytes。

## implementation

- `public/js/core/csv.mjs` 負責包裝、大小、UTF-8／Unicode 和四狀態 CSV lexer（欄首、未引號、引號內、閉引號後），有界單次掃描。為壞 UTF-8 定位可在 fatal 解碼失敗後做線性 byte 前綴定位。允許 ASCII；多位元首 byte 為 C2–DF、E0–EF 或 F0–F4，續接在 80–BF，E0 第二 byte ≥A0、ED 第二 byte ≤9F、F0 第二 byte ≥90、F4 第二 byte ≤8F，缺續接或超範圍返回首 byte；有效前綴通過同一 fatal decoder。lexer 用 fault sentinel 知道目前 record／欄，讀到故障時不把未閉引號當 EOF。CR 待 LF，期間 fault 仍定位當前欄。
- `public/js/core/allocation.mjs` 負責 exact schema、參照、預覽、分配和產生 `{filename,mime,text}`。CSV 工作台四狀態可作內部參照，產品在自身目錄獨立建置，使用本案的精確 grammar 和限制。整體輸入 O(B) 時間及空間，B≤262,144 bytes；限制先行，單表超量時不建立超限資料列。UTF-8 錯誤定位最多再線性掃描一次。
- `allocate(validated)` 建立 `Map(workshopId → remaining)` 和原序工作坊清單。依原參加者序，在最多三個志願中找到第一個仍有位，扣 1，記原名次。無選擇為 `no_preference`，有選擇但都無位為 `choices_full`。座位永不負值，每班 assigned + remaining = capacity，總已分配 + choicesFull + noPreference = participants，總已分配 = 各班 assigned 加總，總 remaining = capacity − assigned。跨班最大容量和是 15,000；所有運算是精確整數。時間 O(W+P+3P)，至多 1,500 次志願查位；額外空間 O(W+P)。每檔最多 500 筆資料，整批最高 39,049 bytes；全部單班檔合計最多 40,470 bytes。匯出字串長度等於 bytes（ASCII）。相同兩表相同順序得到相同結果。先處理者可能拿走後一人的唯一志願，對照測例證明總錄取可因排序改變。
- `public/js/core/controller.mjs` 管草稿、來源世代、結果版本、選擇和下載依賴。初始全域 revision 0，兩個讀取 generation 各 0。事件和快照契約如下。瀏覽器渲染 adapter 在 `public/js/app.js`，寫 DOM 只使用 `textContent`／`value`／固定安全屬性；用 `Map` 以 ID 做 key，選單 DOM 選項的 label 為純文字。CSS、兩語文案及靜態入口留在本工具。零 runtime／build 相依，無 Worker（同步分配），沒有 Worker URL、訊息、fallback 或跨執行緒資料副本。

**Controller 快照及事件。** 快照物件的所有欄為 `revision,phase,sources,validation,preview,result,selected,downloads,activeExports,needsReallocation,exportError`。每個來源 `{generation,origin,text,reading,issue}`，origin 是 `empty|paste|file`。文本是權威草稿；issue 為同形 error 或 null。validation 為首個語義／結構 error 或 null。preview 為 null 或 `{workshopCount,participantCount}`，實際表格以同一已驗資料渲染。result 為 null 或 `totals`；selected 為 null、工作坊 ID 或 `@unassigned`。downloads 固定 `{batch:boolean,roster:boolean}`。activeExports 是已建立 URL 的檔名，照建立順序。needsReallocation 為布林；exportError 為 null 或 `DOWNLOAD_FAILED`。快照初始兩表 text 空、origin empty、reading false，issue/validation/preview/result/selected/exportError null、兩下載 false、activeExports 空、needsReallocation false。

| 事件 | 更新與效果 |
| --- | --- |
| `EDIT(source,text)` | 來源 generation＋1、revision＋1，先使結果與 URL 失效，取消該來源既有讀取。該表草稿換為 text，空字串 origin=empty，否則 paste。清該表 issue，重驗。 |
| `READ(source,size)` | 同步提高該來源 generation 及 revision，失效並停止舊讀取。清該表 issue，保留該表原草稿與 origin。size 超過上限時設 INPUT_TOO_LARGE；可讀時設 reading=true 並呼叫 `read(source,generation)`。同一來源每次最多一個 reader，兩來源可並行。 |
| `LOAD(source,generation,bytes)` | 只有目前 reading 且 generation 相同才處理。清 reading 並釋放 reader；無效 UTF-8 或讀回大小超限把首錯設該來源 issue，原草稿留存。合法 UTF-8 設 raw text 及 origin=file，CSV 可修的問題進 validation。當次 revision 沿用 READ 已提高的值。晚到或重覆 callback 完全無效。 |
| `READ_ERROR(source,generation)` | 同樣驗 token，接受時清 reading、保留草稿、設 READ_FAILED。 |
| `CANCEL(source)` | 只在該來源 reading 時有效。先提高該來源 generation 和 revision 並清結果，再呼叫 abort；保留草稿，issue=READ_CANCELLED。 |
| `RETAIN(source)` | 只在該表有 issue 且未讀取時有效。提高該來源 generation 與 revision，清該 issue，驗保留草稿。空草稿自然回到空白或部分狀態。 |
| `EXAMPLE` | 兩來源 generation 各＋1，revision＋1，清舊結果及 issue、停止兩 reader，載入標準固定樣本，origin=paste。 |
| `ALLOCATE` | 僅在 ready 或 dirty。同步以有效預覽的已驗資料計算，保存當前 revision；設 selected 為首班、清 needsReallocation 與 exportError。 |
| `SELECT(view)` | 只有當前結果存在且 view 合法才更新選擇，清 exportError。revision 不變。 |
| `EXPORT(kind)` | `batch` 或 `roster`，只在對應 downloads 可用且結果 revision 等於當前值。以當前結果生成 artifact；必要時 create，然後觸發使用者指定下載。每檔每 run 至多一個活 URL，重複同檔重用 URL。失敗移除及撤銷該檔已建立 URL，設 exportError，保留結果供重試。 |
| `RESET`、`LEAVE`、`RESTORE` | 各使 revision＋1、兩 generation＋1，清除資料及結果，停止兩個讀取並撤銷全部 URL。兩計數不回捲。普通同頁語言連結及 `pagehide` 發 LEAVE，`pageshow.persisted` 發 RESTORE。其他 `pageshow` 不改狀態，背景分頁本身不清除草稿。 |

純介面為 `validatePair({workshops,preferences})`、`allocate(validated)`、`serializeBatch(result)` 與 `serializeRoster(result,workshopId)`；後者的未知 ID 回 null 且無下載效果。Controller 介面 `createController(effects)` 取得 `dispatch(event)` 與 `snapshot()`。依賴 `read(source,generation)`、`abort(source,generation)`、`createURL(artifact)`、`download(url,filename)`、`revoke(url)`。DOM adapter 在 READ 發送前捕獲單檔及其整數 size，於 read 回呼取用同一檔案。讀取終止事件只提供位置所需來源與 generation，沒有檔名。

失效時先讓 snapshot 清 result、selected、preview、exportError、下載權限和 URL map，再依 URL 建立順序撤銷、依 workshops、preferences 順序停止受影響 reader，確保舊回呼無法復活。曾有結果即設 needsReallocation，普通來源變更後保留此旗標，RESET／LEAVE／RESTORE 清除。App 依 `FileReader.readAsArrayBuffer` 的 load／error／abort 綁已捕獲的 source＋generation；API 檔案只暫留到讀取終了，主動 abort 要先讓 token 失效，再清 handler 和 reader 參照。URL map 只保留當前版本，reset、改來源及離頁同步 revoke。錨點以使用者動作觸發，移除暫用節點；瀏覽器／檔案系統已取得的下載副本由使用者管理。無主動保存、無網路上傳、無 service worker、Storage、clipboard 或工作資料 log。

衍生相位順序為 reading → loading；有非取消 issue → error；只有取消 issue → cancelled；有 validation → error；皆空 → empty；缺一表 → partial；有現行結果 → complete；有效兩表且 needsReallocation → dirty；其餘有效兩表 → ready。pending 或 issue 存在時 validation、preview 為 null；其他時驗現有非空來源，第一個錯停止。有效兩表才有 preview。僅 complete 有下載權限，所選不是 `@unassigned` 時才開放 roster。忽略事件不變更 revision、快照及效果。結果一律由同一 snapshot 渲染，失效後沒有可用舊下載控制。

## acceptance

以下是未來產品九個必要面向，也是此預案的 `spec.acceptanceCriteria` IDs。每項綁固定產品候選、證據及環境；本規格候選各項產品證據均為 `NOT_RUN`。文件 task 本身用八節另行評分，每項 ≥90 且必要檢查完成。

| ID | 產品驗收操作及證據 |
| --- | --- |
| `functionality` | 兩語各走匯入→預覽→分配→選班／未分配；同測例逐列核對參加者及各班容量守恆、重排序反例、全部與單班 CSV 和空班 header。比對實際兩語下載 bytes。 |
| `boundaries` | 跑語法與錯誤優先序、1/30/31、1/500/501 列、大小上下限、0/500/501 名額、1/80/81 碼點、引用、大小寫、ID 重複、重排行、兩 reader、取消、dirty、同頁 reset 及晚到回呼。 |
| `privacy` | 隔離瀏覽器以虛構代碼和假課名走兩語載入、讀取、分配、兩種下載、hidden、pagehide/BFCache、重設、切語。保存 Network 和 Storage 實證，涵蓋 cookies、Web Storage、IndexedDB、Cache Storage、SW、beacon、同源 Cloudflare RUM；資料不可出現在 URL、記錄或請求。 |
| `security` | 以無害的標記和公式樣式文字驗證課名純文字、非法 ID 拒絕、輸出無課名或額外格。檢 CSP、固定檔名、配額前置、超量拒絕、過時回覆和 revocation。逐檔檢查工作資料未外流及靜態資產白名單。 |
| `usability` | 桌面志工能看出來源順序及空缺，於結果附近選班、看未分配原因並取得指定檔；手機核對一班代碼、人數、空班與整批下載。錯誤與取消的修正入口可直接找到。 |
| `accessibility` | 實際鍵盤操作、可視焦點、欄位關聯及 status 螢幕閱讀，兩語 320 CSS px、真 200% zoom、對比與 44 px 目標；表格可局部捲動而頁面不橫溢。觸控、虛擬鍵盤與長標籤不遮擋主要操作。 |
| `localization-seo` | 靜態雙入口的 lang、title、description、h1、雙語所有提示與同語首頁連結；preview 的 noindex／robots；正式候選核 canonical、互返 hreflang 與 x-default、sitemap、robots、HTTPS 和實際內容 MIME。 |
| `toolchain-provenance` | Node 24 built-ins、離線 fixture、獨立枚舉 oracle、兩次 build 的相對路徑與 SHA-256 相同、allowlist 無安裝、可攜命令和實際 exit、候選 commit／開啟 PR head 一致。 |
| `compatibility` | 核實隔離後在指定桌面與實際代表性 Android Chrome、iOS Safari 重跑貼上、檔案取得、讀取取消、Blob CSV 和空班下載。記錄實際 UA／OS、檔名及讀回 bytes；對原生選檔／保存對話僅安排獲准手動操作。 |

雙語入口 `/index.html`（`lang="zh-Hant"`）與 `/en/index.html`（`lang="en"`），h1/title 分別「工作坊志願與座位分配」及 “Workshop Preference Allocation”。description 分別「依報名優先順序、志願和座位數產生分班名單」及 “Assign workshop seats from ranked preferences and export class rosters”。同語首頁分別為 `https://glossquote.com/index.html` 與 `https://glossquote.com/en/index.html`。預覽 meta robots `noindex, nofollow`、`X-Robots-Tag` 同值與 `robots.txt` `Disallow: /`，不寫虛構正式網址。主統籌確認 HTTPS origin 後才產生正式頁各自絕對 canonical、兩語互返 hreflang、x-default 指繁中、sitemap 兩頁和可索引 robots。核心 CSP 為 `default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`，並核對 `nosniff`、`Referrer-Policy: no-referrer`、最小權限政策。資產是同源且固定的 HTML/CSS/ESM，無遠端字型及第三方請求。

## tests

在未來產品目錄 `tools/workshop-preference-allocation` 以 Node ≥24、ESM、built-ins 跑下列命令。所有測試使用虛構資料且離線。每項保存 exit、stdout／stderr、Node 版本及當前固定候選。測試從 [fixtures.json](fixtures.json) 逐字讀入，手算／枚舉規則見 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)。

```sh
node --version
node --test
npm run check
npm run build:preview
npm run check:generated:preview
node scripts/build.mjs --mode preview --out dist-repro-a
node scripts/build.mjs --mode preview --out dist-repro-b
node scripts/check-generated.mjs --mode preview --compare dist-repro-a dist-repro-b
node scripts/serve.mjs --dir dist --host 127.0.0.1 --port 4173
```

命令按未來 `package.json` 契約提供：`check` 靜態白名單與 HTML 安全檢查；`check:generated:preview` 核對 dist 與來源對應；`--compare` 對相對路徑及內容 SHA-256 逐檔比較，拒絕時間戳、主機路徑和舊產物。serve 只接 loopback，僅在需要產品 HTTP／隔離瀏覽器時啟動，不自動開視窗。正式驗證由主統籌在確認 origin 後執行 `npm run build:production -- --origin <approved-origin>` 與對應 generated check；預覽產物不得替代正式 SEO。

必要核心測例含標準、重排、兩人反例兩順序、空班、未填、雙語 bytes、第三志願、守恆、重覆 ID／志願、缺欄、引號、CRLF／LF、BOM、控制、非法 UTF-8 定位、容量與列數極限。縮小隨機輸入用獨立的全枚舉字典序 oracle，不能呼叫產品核心生成 expected。Controller 以 fake reader／export 記錄每步完整快照及效果，實際產品需補上附加 race／API 失敗矩陣。隔離瀏覽器未核可或未執行時記 `NOT_RUN_USER_FOCUS_INCIDENT`；實機或原生手動未執行記 `NOT_RUN` 並保留缺口。不用 mock、瀏覽器自動化的非原生檔案操作或 Node 測試換算成真機、原生或輔具證據。

## handoff

- 固定來源 [TASK](https://github.com/KYStr/glossquote-labs-home/blob/14d3dff09fe8f283726a7e8cb9eaadd905500516/docs/reviews/five-hour-2026-11-11/dispatch/new-spec-workshop-preference-allocation/TASK.md) 及 [研究 BRIEF](https://github.com/KYStr/glossquote-labs-home/blob/14d3dff09fe8f283726a7e8cb9eaadd905500516/docs/specs/workshop-preference-allocation/BRIEF.md)。實際規格工作 `labs-workshop-preference-allocation-spec-20261111`，actor `local-codex:01a1c8b8-1888-7b02-9539-c67eb1dd3b47`，claim `workshop-spec-claim-51844316-c259-4f0a-8206-b4adb00edfdf`，r1647 確切 working 讀回。
- 公開候選為中央 repo 獨立 codex 分支／PR 的四個文件，將實際 SHA、PR、blob 與讀回保存於交接收據。由 reviewer 以同一 head 檢查四檔及八節，重新計算字面預期與產品九項對應。需求或文件有缺口退回本作者，修正版固定新 SHA 再審。
- 未來產品獨立任務取用同一固定已通過的預案，遵照 [製作清單](../../IMPLEMENTATION-CHECKLIST.md)，實作只在 `tools/workshop-preference-allocation/`。正式程式需另核定產品 claim、適用執行者、支援矩陣與必要驗收。缺 API、無隔離、真機或原生項受限時記錄環境與缺項，不推測 PASS。
- 本次提交規格證據。後續 `register-spec` 使用本文件及固定 BRIEF，九項產品 rubric 如上；文件 submit、非作者 review、spec-ready、製作、合併、免費部署、雙語首頁及使用者外驗依各自授權和實證前進。沒有外部服務、程式碼套件或新素材授權。舊產品來源作比對參考，其公開可讀性不表示第三方授權。

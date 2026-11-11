# CSV 橫表轉明細 / CSV Unpivot

`spec-csv-unpivot-20261111` · `labs-csv-unpivot-spec-20261111` · 文件候選 v1 · 2026-11-11

[研究簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者核對](AUTHOR-CHECK.md) · [固定任務](https://github.com/KYStr/glossquote-labs-home/blob/14d3dff09fe8f283726a7e8cb9eaadd905500516/docs/reviews/five-hour-2026-11-11/dispatch/new-spec-csv-unpivot/TASK.md)

## goal

社團幹事手上是一份借用物品橫表。每列是小組，右側每週加一欄。共用盤點表需要「小組、日期、借用量」逐筆一列。幹事用公用 Windows 筆電、Chromebook 或平板，把既有 CSV 帶入頁面，指定小組欄、日期欄與略過欄，預覽並帶走可匯入的長表。每筆能回查原 CSV 的邏輯 record 與欄號。代碼 `001`、`0`、空字串、空格與文字備註都能保留及辨別。

成功條件是固定借用表例在預覽產生四筆，逐筆位置為 `(2,2),(2,3),(3,2),(3,3)`，輸出的每格仍為原字串。啟用略過空白後只去掉 `(2,3)`。操作者可在下游匯入時指定代碼等欄為文字，以保留前導零。 [借用表示例及完整 bytes](fixtures.json)

## scope

| 支援 | 邊界 |
| --- | --- |
| 單表 UTF-8 CSV | 手選一份檔案或貼一份帶表頭的逗號 CSV。以內容驗證。檔案選取的 `.csv,text/csv` 是提示。 |
| 欄角色與結果 | 每欄互斥選保留、展開或略過。按來源次序展開。後兩欄名可改，選擇性略過空字串。結果位置只用於預覽查證。 |
| 容量 | 來源最多 1 MiB、2–48 欄、0–2,000 資料列、100,000 格含表頭、每格 16,384 UTF-16 units。結果最多 20,000 資料列，每份下載最多 8 MiB。 |
| 使用設備 | Windows 鍵鼠及鍵盤、Chromebook、iPad 與 Android 平板。手機窄幅保留全部功能。桌面與行動驗證矩陣見下文。 |
| 本機工作區 | 初始靜態資產載入完成後可在斷網時解析、轉換、預覽及下載。頁面載入及明確導航按正常瀏覽器方式處理。 |

首版範圍排除 XLSX、TSV、非 UTF-8、其他分隔符、日期欄名拆解、資料型別推斷、樞紐彙總、重複列合併、多表整合、剪貼簿 API、上傳與排程。

Power Query 可把欄轉成屬性值對，適合已維護查詢的團隊。SQLite 可先匯入再編寫查詢。本案固定一次轉換的來源欄角色、資料保留及明細查證。 [Power Query](https://learn.microsoft.com/en-us/power-query/unpivot-column) · [SQLite CSV 匯入](https://sqlite.org/cli.html#importing_files_as_csv_or_other_formats)

Labs CSV Workbench 做欄選取並維持來源列形狀。兩份表格對帳依唯一鍵比較兩表。固定位元組欄位拆解做逐列的 UTF-8 位元組切欄。本案按一份 CSV 的每個展開格產生一列，保留重複識別值與來源座標。 [WorkBench 選欄](https://github.com/KYStr/glossquote-labs-csv-workbench/blob/fbd488d0622d81e175e1d367801e2959232af22e/public/js/core/selection.mjs) · [對帳核心](https://github.com/KYStr/glossquote-labs-table-reconcile/blob/ce9a9260bac2d8ffd31fb5710de946b4996d1ef7/public/js/core/reconcile.mjs) · [固定位元組規格](https://github.com/KYStr/glossquote-labs-home/blob/a5e7356dae36d2aac3db068352a916d76c7594c3/docs/specs/fixed-width-slicer/SPEC.md)

## userFlow

Product App 以明細預覽為最大區域。桌面保留欄角色在預覽旁，窄幅改成單欄順序。選檔、貼上、清空、設定、分頁、查看保護差異、下載及同語首頁都可由鍵盤或單指操作。

```text
桌面
[CSV 橫表轉明細                           語言／Gloss Tools]
[來源 · 選檔或貼上 · 讀取欄位                               ]
[欄角色 · 欄名 · 樣本        ][ 明細 · 筆數 · 來源位置        ]
[輸出欄名 · 略過空白        ][ 分頁 · 保護差異 · 下載        ]

窄幅
[標題 · 語言／Gloss Tools]
[來源 · 選檔或貼上 · 讀取欄位]
[欄角色 · 欄名 · 樣本 · 預覽明細]
[筆數 · 可局部捲動的表 · 分頁]
[保護差異 · 下載]
```

1. 空白畫面提示選檔或貼 CSV。示例按鈕填入 [借用表](BRIEF.md)，沿用同一讀取及角色流程。選檔替換來源草稿且清掉貼文。輸入貼文會釋放檔案參照及檔案欄值。選檔器關閉而未提供新檔時，保留畫面原狀。取消檔案讀取後仍可重新讀取目前來源。
2. 「讀取欄位 / Read columns」啟動後同步顯示忙碌與「取消 / Cancel」。成功後列出來源欄號、原欄名、依來源順序最多三個樣本及總資料列數。每欄角色初始是略過。表頭有效而無資料時樣本區顯示「沒有資料列 / No data rows」。
3. 指定至少一欄保留、一欄展開。後兩欄名稱初始 `attribute`、`value`。用「略過空白格 / Skip empty cells」設定只跳過 `""`。預估筆數用資料列數乘展開欄數。按「預覽明細 / Preview rows」後顯示預估、實際筆數、來源略過欄和空白格總數與略過數。輸出空字串可用旁註辨識，原值欄及下載始終保留實際字串。
4. 結果表每頁 25 筆，保留來源列／欄獨立欄標示，資料欄的順序與匯出一致。結果 0 筆時顯示「0 筆明細 / 0 detail rows」、一頁空表頭及可用下載。上一頁／下一頁僅依結果邊界切換，並以簡短狀態更新目前頁。
5. 結果有公式風險時顯示數量與「查看保護差異 / Review protected changes」。依結果位置列出原值及加單引號後的值，必要時可用標籤明確的按鈕展開完整長值。確認按鈕為「確認並下載保護 CSV / Confirm and download protected CSV」。提示「此副本在標記的儲存格前加了單引號。用試算表重新儲存並開啟時，這層保護可能被移除。」英文 “This copy adds an apostrophe before each flagged cell. Saving and reopening it in a spreadsheet may remove that protection.” JSON 按鈕在適用時直接下載原值。 [保護副本固定行為](https://github.com/KYStr/glossquote-labs-csv-workbench/blob/fbd488d0622d81e175e1d367801e2959232af22e/public/js/core/risk.mjs) · [重新儲存的限制](https://owasp.org/www-community/attacks/CSV_Injection)
6. 來源變動時立刻撤下舊欄位與所有下載。角色、輸出欄名、空白策略變動時保留欄位資料並立即撤下舊結果，提示可重新預覽。取消解析保留來源，取消轉換保留已讀資料及最新設定。重設清空欄名、來源、檔案欄、選擇、工作與輸出。換語及離頁同樣清理，BFCache 返回空工作區。兩語在語言連結旁說明草稿將清除。

| 畫面狀態 | 繁中 | English |
| --- | --- | --- |
| 尚未讀取／來源改動 | 選擇或貼上 CSV，再讀取欄位。 | Choose or paste a CSV, then read its columns. |
| 解析／轉換忙碌 | 正在讀取欄位… ／ 正在展開明細… | Reading columns… / Expanding rows… |
| 角色缺少 | 至少選一欄保留及一欄展開。 | Choose at least one column to keep and one to expand. |
| 設定變更 | 設定已變更，請重新預覽明細。 | Settings changed. Preview the rows again. |
| 解析錯誤 | 第 {record} 筆 CSV 記錄、第 {column} 欄有問題。{原因} | Check CSV record {record}, column {column}. {reason} |
| 取消解析／轉換 | 已取消。可再讀取來源。／已取消。可用目前設定重試。 | Canceled. Read the source again. / Canceled. Retry with the current settings. |
| 檔案超限 | {檔名} 超過 8 MiB。可縮小輸入或調整展開欄。 | {filename} exceeds 8 MiB. Reduce the input or adjust the expanded columns. |
| Worker／檔案失敗 | 工作未完成。請重試，或改用貼上 CSV。 | The job did not finish. Try again or paste the CSV. |
| 換語／離頁 | 換語或離頁會清除目前工作區。 | Changing language or leaving clears this workspace. |

畫面僅在 record 與 column 都有值時使用兩欄位置文案。僅有 record 時顯示「第 {record} 筆 CSV 記錄有問題。/ Check CSV record {record}.」。設定錯誤顯示在 `field` 對應的欄旁，其他錯誤顯示於目前來源或預覽動作。各代碼的原因如下。

| 代碼 | 繁中 | English |
| --- | --- | --- |
| `SOURCE_SCHEMA`、`EMPTY_SOURCE` | 請選取一份 CSV 或貼上有表頭的資料。 | Choose one CSV or paste data with headers. |
| `INPUT_BYTES` | 來源超過 1 MiB。請縮小來源再讀取。 | The source exceeds 1 MiB. Reduce it and try again. |
| `INVALID_UTF8`、`INVALID_UNICODE` | 來源包含無法讀取的文字。請另存為 UTF-8 或重新貼上。 | The source contains unreadable text. Save it as UTF-8 or paste it again. |
| `DUPLICATE_BOM` | 開頭含多個編碼標記。請重新匯出 UTF-8 CSV。 | The source starts with more than one encoding marker. Export the UTF-8 CSV again. |
| `CONTROL_CHAR` | 移除此格中的控制字元後再讀取。 | Remove the control character from this cell and try again. |
| `BARE_CR` | 記錄間請使用 LF 或 CRLF 換行。 | Use LF or CRLF between CSV records. |
| `QUOTE_IN_UNQUOTED`、`AFTER_QUOTE`、`UNCLOSED_QUOTE` | 檢查此欄的雙引號。欄內雙引號須成對。 | Check the double quotes in this field. Double each quote inside a quoted field. |
| `FIELD_LIMIT` | 此格超過 16,384 個 UTF-16 單位。請縮短內容。 | This cell exceeds 16,384 UTF-16 units. Shorten the cell. |
| `COLUMN_LIMIT`、`HEADER_WIDTH` | 來源需要 2 至 48 欄。 | Use a source with 2 to 48 columns. |
| `HEADER_NAME`、`OUTPUT_NAME` | 請填 1 至 120 個字元的欄名，至少一個字元須為 ASCII 空格以外的字元。欄名不能含 Tab 或換行。 | Enter a name of 1 to 120 characters with at least one character other than a regular space. Leave out tabs and line breaks. |
| `DUPLICATE_HEADER`、`OUTPUT_NAME_COLLISION` | 此欄名重複。請改成可區分的欄名。 | This name already appears in the table. Use a distinct column name. |
| `ROW_WIDTH` | 此筆的欄數須等於表頭欄數。 | This record must have the same number of fields as the header. |
| `ROW_LIMIT`、`CELL_LIMIT` | 來源表超出容量。請縮小後再讀取。 | This source table is too large. Reduce it and read it again. |
| `OPTIONS_SCHEMA`、`ROLE_LENGTH`、`ROLE_VALUE` | 重新確認每個來源欄的角色與輸出欄名。 | Check each column's role and the output column names. |
| `KEEP_REQUIRED`、`EXPAND_REQUIRED` | 至少選一欄保留及一欄展開。 | Choose at least one column to keep and one to expand. |
| `RESULT_ROWS` | 明細超過 20,000 筆。請減少來源列或展開欄。 | The result exceeds 20,000 rows. Use fewer source rows or expanded columns. |
| `FILE_READ`、`WORKER_ERROR` | 工作未完成。請重試，或改用貼上 CSV。 | The job did not finish. Try again or paste the CSV. |
| `formula-risk` | 這份結果含可能被試算表當成公式的格子。請查看保護差異或下載原值 JSON。 | Some cells may be read as formulas. Review the protected changes or download the original JSON. |

每個控制項有可見標籤，欄角色按來源順序 tab，忙碌區用 `aria-busy`。進度、完成、取消及分頁回報採單一 `role=status`。欄錯連到可修正的控制項，以 `aria-describedby`／`aria-invalid` 標示，重設後回到來源欄。桌面與窄幅使用同一 DOM 閱讀順序，表格的橫向捲動限於命名區域。文字對比 ≥4.5:1、必要非文字／大字 ≥3:1，主操作 44×44 CSS px，320 CSS px 與 200% zoom 可達全部操作，尊重減少動態設定。 [家族設計基線](https://github.com/KYStr/glossquote-labs-home/blob/3d47dd3a2f5e89761791378d01d87ba80c36a351/docs/TOOL-DESIGN-BASELINE.md) · [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## inputsOutputs

### 輸入介面與大小

`parseSource(source)` 收一個精確的自有資料物件，`{kind:"text",text:string}` 或 `{kind:"file",bytes:Uint8Array}`。後者使用自有、非共享的 bytes，檔名及 MIME 只在介面使用。函式結果為 `{ok:true,table:{headers:string[],rows:string[][]}}` 或 `{ok:false,error:{code,record,column,field}}`。物件的未知欄位、遺漏欄位、accessor、錯型別先報 `SOURCE_SCHEMA`。錯誤的四個欄位固定，無適用位置填 `null`。解析位置的 `record`、`column` 從 1 起算並含表頭。引號內的換行屬同一個邏輯 record。`field` 為表單設定鍵或 null。

檔案先依 `File.size` 及實際 byteLength 驗證 ≤1,048,576，再用 `TextDecoder("utf-8",{fatal:true,ignoreBOM:true})`。讀取失敗用 `FILE_READ`，解碼失敗用 `INVALID_UTF8`。貼文以 textarea 的 LF API 值送入，先拒絕長度已超過 1,048,576 個 UTF-16 units 的輸入，再驗單獨代理碼元及 UTF-8 實際 bytes，失敗分別為 `INPUT_BYTES`、`INVALID_UNICODE`、`INPUT_BYTES`。所有輸入 size 包括可選 BOM。合法解碼結果移除第一個檔首 U+FEFF。緊接著第二個 U+FEFF 報 `DUPLICATE_BOM` (1,1)，其餘位置的 U+FEFF 保留。空來源及僅一個 BOM 的來源報 `EMPTY_SOURCE` (1,1)。 [WHATWG Encoding](https://encoding.spec.whatwg.org/#interface-textdecoder) · [WHATWG textarea](https://html.spec.whatwg.org/multipage/form-elements.html#the-textarea-element)

### CSV 文法、狀態及錯誤優先

記錄分隔為 LF 或 CRLF。欄外 CR 後沒有 LF 報 `BARE_CR`。逗號分欄，雙引號只可從起欄開啟引號欄，`""` 在引號內表示字面引號。引號內保留任意 CR、LF、CRLF、Tab 和逗號。C0 控制碼中僅允許 U+0009、U+000A、U+000D，其餘，包括 NUL，一律 `CONTROL_CHAR`。欄內外空格皆保留。 [RFC 4180](https://www.rfc-editor.org/rfc/rfc4180)

| 狀態 | 逗號 | LF／CRLF | 引號 | 其餘允許字元 | EOF |
| --- | --- | --- | --- | --- | --- |
| 起欄 | 結束空欄，留在起欄 | 結束空欄及 record | 進入引號內 | 加入字元，進入未引號 | 剛讀到逗號時結束空欄及 record。剛結束 record 時結束輸入 |
| 未引號 | 結束欄 | 結束欄及 record | `QUOTE_IN_UNQUOTED` | 加入字元 | 結束欄及 record |
| 引號內 | 加入字元 | 逐字保留原 CR／LF | 進入閉引號後 | 加入字元 | `UNCLOSED_QUOTE` |
| 閉引號後 | 結束欄 | 結束欄及 record | 加入一個引號，回到引號內 | `AFTER_QUOTE` | 結束欄及 record |

欄結束後回到起欄。每次 record 結束後清掉該 record 是否已有欄的旗標。中間空白行仍是一個含單一空欄的 record。最後一個 LF／CRLF 只關閉前一 record，後面沒有虛擬空 record。

先完成來源型別／容量／Unicode／BOM 檢查，再由前往後掃描。對同一碼點先檢查 C0，再處理欄外裸 CR、引號語法與加入格值。加入後長度超 16,384 UTF-16 units 即 `FIELD_LIMIT`。欄結束前先檢查目前欄序，第一個超過 48 欄的欄報 `COLUMN_LIMIT`。EOF 在引號內先報 `UNCLOSED_QUOTE`。所有上述錯誤使用當前 record／column。

一個 record 關閉後依序檢查下列項目，只有完全有效的來源可返回資料：

1. 第一 record 至少 2 欄，否則 `HEADER_WIDTH` 指到第 2 欄。依欄號從左到右驗表頭。每欄 1–120 Unicode 碼點，禁止 Tab／CR／LF 及全為 ASCII 空格，失敗 `HEADER_NAME`。其餘字元依來源文法，字串無 trim、大小寫摺疊、Unicode 正規化。每欄通過文法後先查是否與較早表頭完全相等，第一個重複欄回 `DUPLICATE_HEADER`。
2. 資料 record 先驗欄數完全相同，否則 `ROW_WIDTH`。短列位置是第一個缺欄 `actual + 1`，長列是第一個多欄 `expected + 1`。再驗資料列數 ≤2,000，超限 `ROW_LIMIT`，record 為第一個超出的 record、column 為 null。
3. 提交 record 前驗含表頭格數 ≤100,000，超限 `CELL_LIMIT`，column 為 null。合法矩形最大 48 × 2,001 = 96,048，這個上限是防禦檢查。較早關閉的 record 的錯誤優先於後方 record。記錄終結後不另掃後方錯誤以替換原錯誤。

### 展開設定與順序

`unpivot(table,options)` 的 table 為目前 `parseSource` 成功後的受控快照。`options` 恰含 `{roles,attributeName,valueName,skipEmpty}`，兩個名稱為 primitive string、`skipEmpty` 為 boolean。`roles` 是密集陣列，長度等於表頭欄數，索引從 0 開始。每個值為 `keep`、`expand`、`omit`。角色陣列的額外屬性或 accessor 屬設定結構錯誤，缺少自有索引視為該欄角色無效。預設兩名為 `attribute`、`value`，略過空字串關閉。

| 優先 | 穩定錯誤 | 位置 |
| --- | --- | --- |
| 設定物件欄位／型別不符 | `OPTIONS_SCHEMA` | 全部 null |
| 角色長度不符／第一個無效角色 | `ROLE_LENGTH`／`ROLE_VALUE` | `field="roles"`，無效角色的 `column=index+1` |
| 沒有保留／沒有展開欄 | `KEEP_REQUIRED`／`EXPAND_REQUIRED` | `field="roles"`，先驗保留 |
| 名稱不符表頭文法／與保留表頭或前一新名稱精確重複 | `OUTPUT_NAME`／`OUTPUT_NAME_COLLISION` | 先驗 `field="attributeName"` 再 `"valueName"`，record/column 為 null |
| 結果資料列超過 20,000 | `RESULT_ROWS` | 全部 null，整次轉換失敗 |

自訂名同樣先驗 Unicode 合法、C0、1–120 碼點和 ASCII 空格條件。與被展開、略過的來源表頭同名時可用，因為這些表頭沒有成為輸出欄名。

結果欄為保留來源欄名（依索引遞增）加兩個名稱。每筆來源資料列依序檢查每個展開欄，輸出 `[...保留原字串,展開欄原表頭,展開格原字串]`，`origins[i]=[來源 record,來源 column]`。空白策略只在 `skipEmpty===true` 且展開值等於 `""` 時跳過。保留欄或略過欄的空白不影響資料列是否出現。整數只用於大小、計數、索引，皆為安全整數。內容無數字、日期、時區、精度或 locale 轉換。

`counts` 恰含 `{potential,actual,emptyCells,skippedEmpty,omittedColumns}`。`potential=資料列數×展開欄數`，`emptyCells` 是所有展開格中的空字串個數，`skippedEmpty` 是按開關實際略過筆數，`actual=potential-skippedEmpty`，`omittedColumns` 是依索引升序的 1-based 略過欄號。結果上限檢查 actual，因此 20,020 個可能位置略過 20 個空字串可產出 20,000 筆。

### 公式風險及下載

固定引用 Labs CSV Workbench `fbd488d0622d81e175e1d367801e2959232af22e` 的 `risk.mjs`（blob `b67d353ca9386748a18494c1c29a364dd96b5bd5`）。從首碼點起掃描。遇 Tab／LF／CR 即標記。若遇 U+0020、U+00A0、U+1680、U+2000–U+200A、U+2028、U+2029、U+202F、U+205F、U+3000、U+FEFF，繼續看下一碼點。遇其他碼點就以其是否屬 `=+-@＝＋－＠` 決定，掃完整個字串沒有命中時為否。即使 `-12` 可作數值，仍保守標記。以完整舊測例及本規格的結果位置做相容驗證。 [固定判定來源](https://github.com/KYStr/glossquote-labs-csv-workbench/blob/fbd488d0622d81e175e1d367801e2959232af22e/public/js/core/risk.mjs) · [固定測試](https://github.com/KYStr/glossquote-labs-csv-workbench/blob/fbd488d0622d81e175e1d367801e2959232af22e/test/risk.test.mjs)

依輸出 record、column 遞增檢查完整結果的每個表頭與資料格。每個標記位置在小案例為 `{record,column,sourceRecord,sourceColumn}`。保留表頭來源為 `(1,keepIndex+1)`，自訂表頭為兩個 null。資料列的保留值來源為該來源 record 和保留欄，展開表頭值來源為 `(1,展開欄)`，展開值來源為該列的 `origins`。沒有進入結果的值不計，重複呈現的保留值各計一格。保護副本每個標記格前置一個 U+0027，保留其餘每個字元和格子。原值 JSON 完全保留原欄名與原格。

| 下載與型別 | 內容 | 開放條件 |
| --- | --- | --- |
| `unpivot.csv` · `text/csv;charset=utf-8` | UTF-8 無 BOM，全部欄以雙引號包住，格內雙引號加倍，逗號分欄，CRLF 分 record，無尾端 CRLF | 零風險，最終 bytes ≤8,388,608 |
| `unpivot-protected.csv` · `text/csv;charset=utf-8` | 同一 CSV 格式，先對每個標記格加單引號再序列化 | 有風險，加入單引號後的 bytes ≤8,388,608，核對差異後明確按目前結果的確認下載 |
| `unpivot-original.json` · `application/json;charset=utf-8` | UTF-8 無 BOM，以 `JSON.stringify({schemaVersion:1,columns,rows})+"\n"` 順序及標準 JS 字串轉義，compact 加單一 LF。`columns`、`rows` 皆由原值組成 | 獨立檢查 JSON bytes ≤8,388,608 |

有風險時原值 CSV 完全沒有 bytes 或 URL。零風險時保護 CSV 不建立。兩種 CSV 各自的容量按適用性檢查，JSON 任何風險狀態都獨立計長。超限檔案不產生 bytes，其他合格產物及預覽保持可用。表頭而無資料時，仍照同一風險及容量規則處理表頭。若加單引號後的欄名與另一欄相同，保護檢視呈現精確差異，CSV 仍按規則保留兩欄。可改名後重新預覽或使用保留原欄名的 JSON。

轉換成功的檢查介面為 `{ok:true,result:{columns,rows,origins,counts,risk,files}}`，`risk` 為有序位置陣列。各 `files` 鍵固定為 `rawCsv,protectedCsv,originalJson`。測試將每份可用 `Uint8Array` 投影成 `{status:"ready",byteLength,utf8}`，`utf8` 為解碼後的精確字串。超限為 `{status:"too-large",byteLength:<實算>,utf8:null}`。有風險的原值 CSV 為 `{status:"formula-risk",byteLength:null,utf8:null}`，零風險時的保護 CSV 為 `{status:"unavailable",byteLength:null,utf8:null}`。此介面可由驗證 adapter 對內部索引視圖投影，小案例應能逐鍵比對全部結果。 [字面輸入、錯誤、輸出與控制器](fixtures.json)

## implementation

### 模組、容量與 Worker

| 模組 | 責任 |
| --- | --- |
| `src/csv.mjs` | 來源驗證與四態掃描，回傳整份成功或帶位置錯誤。 |
| `src/unpivot.mjs` | 驗設定、計數、產生來源位置、判定實際輸出風險、分別計算及編碼檔案。 |
| `src/controller.mjs` | 控制目前來源版本、工作世代、表單、結果、分頁、保護確認及釋放效果。 |
| `src/worker-entry.mjs`、`src/app.mjs` | Worker 訊息及靜態 DOM 事件轉接，UI 以詞典和安全文字節點渲染。 |
| `public/index.html`、`public/en/index.html`、`scripts/*.mjs` | 兩語結構、在地資產、建置、檢查及驗證。 |

解析單趟 O(U)，U 為 UTF-16 units。欄的片段累積後合併一次，輸入與解析資料空間 O(U+C)，C 為格數。轉換依來源列再展開欄產生索引，先算 actual 檢查 20,000。保留結果索引 `[record,column]` 和風險 bitset，計數後分頁投影。先快取各來源格的 UTF-8 編碼長度、引號個數、JSON 字串編碼長度和風險，輸出名稱也同樣計量。每欄 CSV 固定增加兩個引號，內部每個引號多一 byte，欄間逗號及 record 間 CRLF 各按實際加入，保護檔再逐標記格加一 byte。JSON 計入所有括號、逗號、序列化欄名、格值與尾 LF。加總使用安全整數。小於等於上限才按精確長度配置輸出，分段以 TextEncoder 編碼並核對最終 offset。結果有 risk 時最多保護 CSV 與 JSON，無 risk 時最多原值 CSV 與 JSON，兩種已編碼下載最多共 16 MiB。

轉換時間 O(U+N·E+M·(K+2)+D)，N 資料列、E 展開欄、M 實際結果列、K 保留欄，D 為實際生成的合格下載 bytes。保留空間 O(U+C+M+M·(K+2)/8+D)，另計同時一頁的 DOM 與轉移／Blob 副本。最寬輸出 49 欄，風險 bitset 上界 `ceil(20,001×49/8)=122,507` bytes。預覽每頁 25 列。長值顯示可截到 120 碼點且提供單格完整檢視，字串處理不得修改底層資料。風險清單按同樣頁長分頁。驗證以候選實測時間、取消回應、輸出緩衝區與行動裝置行為，記錄裝置及版本。

建置把經審查的本地核心及訊息入口嵌成固定 Worker 程式 bytes，啟動資產載入後從這些 bytes 建 Blob Worker。無 runtime package、遠端字型、動態程式注入、`eval`、`new Function` 或使用者資料拼程式。每次 read 或 preview 用一個 Worker，終態後 terminate，啟動用 URL 撤銷。檔案讀取使用 `File.arrayBuffer()` 並檢查當時版本，已取消的晚到 bytes 直接丟棄。傳入檔案或傳出下載的 ArrayBuffer 以 transferable 送交，主畫面保留目前解析快照，使取消轉換後可離線再做。

Worker 及控制器交換精確訊息，根為 `{kind,sourceVersion,run,payload}`。`read` request 的 payload 是來源，response 是 `parseSource` 結果。`preview` request 的 payload 恰含 `table,options`。成功 response 為 `{ok:true,result:{columns,origins,counts,riskCount,riskBits,files}}`。位元索引 `(record-1)*columns.length+(column-1)`，索引低三位決定該 byte 的位元位置，bit 0 為最低有效位。每個 `files` 值為 `{status,byteLength,bytes}`，只有 ready 的 bytes 為精確長度 ArrayBuffer，其餘為 null。主畫面從目前解析快照與 origins 投影當頁。失敗 response 只傳 `{ok:false,error:{code,record,column,field}}`。工作標籤、世代及版本比對後才可套用結果，缺 Worker、讀檔錯誤或反序列化錯誤以 `WORKER_ERROR`／`FILE_READ` 提示重試並保留適用的來源及欄位。

### 控制器可觀測契約

初始快照如下。`headers` 與 `dataRows` 反映最近成功解析，未載入時分別 `[]`、`null`。`options` 永遠包含四個鍵。`result` 只在成功預覽時存在，值恰含 `counts`、`riskCount`、`files`，其中每份檔案描述只含 `status,byteLength`。`downloads` 是此時使用者是否能觸發下載。下載按鈕只接受明確操作，`protectedCsv` 只在查看差異面板開啟且 bytes 合格時為 true。

```json
{"phase":"empty","source":"none","sourceVersion":0,"run":0,"headers":[],"dataRows":null,"options":{"roles":[],"attributeName":"attribute","valueName":"value","skipEmpty":false},"pending":null,"error":null,"page":null,"review":false,"result":null,"downloads":{"rawCsv":false,"protectedCsv":false,"originalJson":false}}
```

| 事件 | 可觀測結果 |
| --- | --- |
| `EDIT_SOURCE` | 更新來源種類 `none/text/file`。來源改變令 sourceVersion 和 run 各 +1，停止工作並清欄位、結果、錯誤和設定。空草稿為 `empty`，其他為 `source-dirty`。 |
| `READ` | 有草稿且無工作時，run +1，清已讀資料與設定，pending 設 `{kind:"read",sourceVersion,run}`，phase `reading`。 |
| `EDIT_OPTIONS` | 已載入且值確有變動時合併明示欄位，run +1，清結果、錯誤、分頁和確認，取消原工作，phase `loaded`。 |
| `PREVIEW` | 已載入且無工作時，run +1，撤下舊結果、分頁、確認及 URL。pending 設 `{kind:"preview",sourceVersion,run}`，phase `converting`。設定驗證由本次轉換流程返回。 |
| `DELIVER` | pending 三個值皆吻合才接受。read 成功設 headers、dataRows、全 `omit` roles，phase `loaded`。preview 成功設結果、page=1、phase `result`。失敗清 pending、結果、下載、確認並設 error 和 `error` phase，read 保留草稿，preview 保留資料與設定。 |
| `CANCEL` | 有工作時 run +1，停止並清 pending、結果、錯誤、分頁和確認，phase `canceled`。read 保留草稿，preview 保留資料與選擇。 |
| `PAGE`、`OPEN_PROTECTION`、`CLOSE_PROTECTION` | `PAGE` 只在結果存在且值在 1 至 `max(1,ceil(actual/25))` 時更新。合格保護檔才可開啟確認，關閉後下載停用。 |
| `DOWNLOAD` | 只接受此刻該檔案的 `downloads[file]` 為 true。效果為 `{kind:"download",filename,mime,utf8}` 的精確 bytes 投影。保護下載完成點擊後關閉確認，後續下載須再核對。 |
| `RESET`、`PAGEHIDE`、`PAGESHOW` | 前兩者停止工作，令 sourceVersion、run 各 +1，其他欄位回初始。實際離頁及切語走同一清除。persisted pageshow 見到空工作區直接維持，否則補一次清除。 |

控制器事件物件以 `type` 為判別鍵。`EDIT_SOURCE` 帶 `source`，其值為空草稿或有效來源物件。`EDIT_OPTIONS` 帶 `patch`，僅包含本次改動的設定鍵。`DELIVER` 帶 `kind,sourceVersion,run,payload`。`PAGE` 帶 `page`，`DOWNLOAD` 帶 `file`，`PAGESHOW` 帶 boolean `persisted`。其餘列出的事件沒有額外鍵。無效事件不更動狀態。`OBSERVE` 是測試工具讀取初始狀態的步驟，無需發產品事件。

無當前條件的事件忽略。`DELIVER` 先比三值，任何晚到成功或失敗都不得更動結果、錯誤、焦點或下載。畫面與測例不把 source 內容寫到 controller 摘要或錯誤。測例以 `caseId` 引用固定轉換案例來注入其結果，產品訊息仍使用完整 payload。每步的 `effects` 陣列只列實際下載效果。Worker 終止、URL 釋放、焦點及 UI 通告另用 fake adapter 事件記錄檢查。

下載手勢當下以已準備的 bytes 建立 Blob，固定檔名及類型。單產物可保留一個 URL，最遲 30 秒撤銷，結果撤下、取消、重設、離頁均立即撤銷及釋放引用。清理 worker、所有表單與畫面、檔案／來源參照、結果、確認及暫存。輸入只走 `textContent`／`value`，不進 HTML、樣式、選擇器、URL、檔名、console、telemetry 或 log。避免瀏覽器填回舊內容，表單 autocomplete off，pagehide 先清空實際控制項，pageshow 核對 BFCache。全程無 local/sessionStorage、IndexedDB、CacheStorage、cookies、service worker 或處理請求。瀏覽器明確下載後檔案由使用者管理。

## acceptance

下列九個 ID 逐項登記為產品 `spec.acceptanceCriteria`。文件交驗按本文件八節逐一獨審。

| ID | 產品必要檢查與固定證據 |
| --- | --- |
| `functionality` | 固定例逐欄驗列序、欄序、來源位置、空白、重複值。完成欄位改名、合法零列、三種下載精確 bytes 與下游文字欄匯入。 |
| `boundaries` | 全部解析錯誤優先與座標、1 MiB、48 欄、2,000 列、16,384 units、20,000 列及三種 8 MiB 上下邊界。測全流程取消、修改和晚到隔離。 |
| `privacy` | 在允許隔離環境記錄初始資產及實際操作 Network／Storage、離線後重新讀取及轉換、離頁/BFCache 與重設。工作內容不出分頁。 |
| `security` | 固定 predicate 全測例、只保護標記格、風險停用原 CSV、明示確認、inert 文字、固定檔名、生命週期及安全標頭。 |
| `usability` | Windows／Chromebook／平板用例由 CSV 到交付。清楚區分空、空格、0，錯誤可復原，預覽、角色與適用下載相鄰。 |
| `accessibility` | 鍵盤、焦點、狀態讀出、對比、觸控、320 CSS px、200% zoom、reduced motion 和兩語長標籤實測。 |
| `localization-seo` | 兩頁 lang、固定標題／說明、同語首頁回鏈、發布模式 canonical/hreflang/sitemap、preview noindex 及狀態字串對照。 |
| `toolchain-provenance` | 零 runtime dependency，固定規則來源與權利註記，Node 24 離線命令與兩次 bytes 相同，GitHub 同 PR head。 |
| `compatibility` | 實機／隔離的瀏覽器版本記錄。兩語貼上、選檔、Worker、Blob 檔名與 bytes、離線、行動觸控及文字欄匯入。 |

網站路由為 `/index.html`（`zh-Hant`）和 `/en/index.html`（`en`）。標題「CSV 橫表轉明細｜Gloss Tools」與 “CSV Unpivot | Gloss Tools”。繁中說明「把日期、月份或分類表頭展成明細列，保留代碼及前導零。」英文 “Unpivot columns to turn a wide CSV into long rows while keeping codes and leading zeros.” 兩頁的語言連結互相指向對應路由。首頁回鏈為 `https://glossquote.com/index.html` 和 `https://glossquote.com/en/index.html`。英文內文自然使用 “wide to long CSV” 及 “unpivot columns”。機器字串與固定下載名兩語相同。

預覽輸出用 HTML robots meta 與 HTTP `X-Robots-Tag: noindex, nofollow`。正式生成模式需要主統籌確認的 HTTPS origin，從 origin 產生兩個 self-canonical、互惠 `zh-Hant/en` hreflang、繁中 `x-default` 和 sitemap。規劃 origin `https://csv-unpivot.glossquote.com` 僅作部署規劃。預覽無實際核准的 origin 時省略 canonical、hreflang 和 sitemap。正式檢查 200、404、HTTPS、正確 MIME、相對資產及 HTTP 安全標頭。頁面 CSP 為 `default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'; frame-ancestors 'none'`。設 `nosniff`、`Referrer-Policy: no-referrer`，相機、麥克風、定位權限關閉。CSP 裡的 blob Worker 只用於固定程式，Blob 下載來自當前結果。

## tests

`fixtures.json` 包含 `schemaVersion,parse,conversions,predicate,bounds,controller`。parse 與 conversions 的來源 `kind:"file"` 以 `hex` 字串記錄原 bytes，測試轉成 Uint8Array。`kind:"text"` 使用字面 `text`。parse／conversions 按預期鍵逐項深比。controller 每個 step 的完整快照與下載 effect 深比，事件序與 sourceVersion、run 皆有字面預期。bounds 用命名 recipe、參數和精確計數／大小，避免把大量重複 bytes 裝入候選。驗證 recipe 不得呼叫正式產品生成預期。predicate 包括固定 Workbench 正負例、前導空格集合與雙引號／ASCII 單引號保留。 [fixtures](fixtures.json) · [離線作者驗算](AUTHOR-CHECK.md)

產品候選在 `tools/csv-unpivot/` 根目錄執行下列命令。要求 Node 24 ESM 與 built-ins，所有 fixtures 是假資料，無需安裝與網路。建置輸出位置使用兩個可獨立建立的相對目錄。

```text
node --version
node --test
node scripts/check.mjs
node scripts/build.mjs --mode preview --out dist-preview-a
node scripts/build.mjs --mode preview --out dist-preview-b
node scripts/check-generated.mjs --mode preview --dir dist-preview-a
node scripts/check-generated.mjs --mode preview --dir dist-preview-b
node scripts/compare-builds.mjs dist-preview-a dist-preview-b
```

比較腳本逐一對照排序後相對檔案路徑及 SHA-256，輸出兩次相同 manifest hash 並在任何不同時 exit 非 0。Loopback HTTP probe 使用 `node scripts/probe.mjs --dir dist-preview-a`，於 `127.0.0.1` 的臨時 port 測兩語、錯誤路徑、CSP、worker asset、404、robots 和 MIME，結束只關閉其自建伺服器。

至少在 Windows 的 Chrome 與 Edge、Chromebook Chrome、iPad Safari 及 Android 平板 Chrome，記錄實際版本、隔離方式與兩語結果。手機 320 CSS px、真實 200% zoom、觸控與鍵盤焦點、狀態讀出、含換行的輸入、同語回鏈、真檔讀取、斷網後取消重試、Blob bytes、清理、下游文字欄匯入皆須實測。使用受控假資料和獲准隔離環境，原生選檔／存檔待獲准驗證。缺隔離、實機或許可時保留 `NOT_RUN` 或 `NOT_RUN_USER_FOCUS_INCIDENT`，此文件階段的所有產品驗證均 `NOT_RUN`。

## handoff

- 固定來源為 `KYStr/glossquote-labs-home@14d3dff09fe8f283726a7e8cb9eaadd905500516` 的 TASK 及 BRIEF，BRIEF 在四檔中保留原 bytes。程式製作路徑 `tools/csv-unpivot/`，目前候選範圍為 `docs/specs/csv-unpivot/{BRIEF.md,SPEC.md,fixtures.json,AUTHOR-CHECK.md}`。
- 作者 `local-codex:01a1c8b8-14a2-78e0-894d-e59a735656b2`，claim `fh-reg-sched-17-csv-unpivot-claim-7d640077-e5d`。r1640–r1643 的 ACK、登記、承接及 start 由本對話讀回，r1643 時狀態 working。 [固定承接快照](https://github.com/KYStr/glossquote-labs-home/blob/54db5e26aa516858e098669afeffd2cdc40361e1/coordination/work-registry.json)
- CSV Workbench 固定樹未找到授權檔，package 未宣告 license。採公開行為契約和自製案例，新的解析與匯出各自實作。保留可追溯參照與測例。 [固定 package](https://github.com/KYStr/glossquote-labs-csv-workbench/blob/fbd488d0622d81e175e1d367801e2959232af22e/package.json)
- 候選分支 `codex/csv-unpivot-spec-20261111-01a1c8b8`。交接收據記錄固定 commit、公開 PR、四檔 blob 和命令，評審由 PR 實讀同一 head，核對本文八節每項至少 90 與所有必要文件查核。`register-spec` 的 source 為固定 BRIEF、document 為公開候選 `SPEC.md`、acceptanceCriteria 使用上表九項。
- 接續點為主統籌安排文件交驗與非作者 readiness。產品製作、產品驗收、來源合併、部署、雙語首頁與外驗各由後續責任處理。文件候選本身的產品和實機查核狀態為 `NOT_RUN`。遇到同範圍候選、授權缺口、輸入語義或錯誤優先無法一致時，保存精確來源與測例交主統籌。

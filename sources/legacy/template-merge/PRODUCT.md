# 產品需求：批次文字套版

狀態：規格，尚未實作。目標使用者是活動主辦或小型團隊，手上有名單和固定通知文字，需逐人建立訊息但仍由人決定是否、何時送出。

## MVP 決策

- 輸入一個有唯一非空標題列的 UTF-8 CSV、文字模板和模板欄位值。CSV 上限 1 MiB、資料列 1,000、欄 30；模板最多 32,768 UTF-16 code units；最終 TXT+JSON 產物（含所有 envelope/metadata）UTF-8 bytes 合計 ≤8 MiB。來源 CSV byte cap 獨立計算，不與成品大小混用。
- 第一個 UTF-8 BOM 可剝除。CSV 按 RFC 4180 常見引用規則，接受一致的 CRLF、LF 或 CR 分隔符，欄值不得隱式 trim；malformed CSV 拒絕。
- Placeholder 僅限 `{{完整欄名}}`；欄名 case-sensitive 且逐字匹配，包含欄名內的空格，不 trim。`{{ Name }}` 只在 CSV 標題恰為 ` Name ` 時匹配；如果標題是 `Name`，它是未知欄位。支援字面單次替換，不展開插入資料中的 `{{...}}`。
- 模板中未閉合 `{{`、孤立 `}}`、空佔位符、未知欄名都拒絕整批。模板只有 literal、沒有 placeholder 時允許生成同文多筆，但 UI 先明確顯示「每列會得到相同文字」。
- 空值定義為 CSV 解碼後嚴格等於 `""`；空白字元不是空值並保留。預設缺值阻止整批。使用者可在生成前勾選「允許空白代入」，每個空欄以空字串代換且顯示缺值總數和列/欄明細。
- 使用者可逐筆預覽、單筆複製（只在明確按下時調用 clipboard；拒絕時提供選取文字 fallback）及下載固定名 `personalized-text.txt` / `personalized-text.json`。無寄送、自動傳訊或個人姓名檔名。
- 全程目前頁面記憶體；reset/離頁清除資料、輸出與 Blob URL；無 localStorage。

## 功能需求

### FR-01：載入與 CSV dialect

超過 1,048,576 bytes、超過 1,000 data rows、超過 30 columns 拒絕。CSV 必須有標題列；標題非空且唯一，資料每列與標題欄數一致。僅接受 UTF-8；允許開頭單一 BOM。CSV parser 的 quote/逗號/double-quote/quoted multiline 為 RFC 4180 常見語法；line break 可一致使用 CRLF、LF 或 CR。未閉合 quote、quote 違規、mixed record separators 或行寬不一顯示 row/record 位置並拒絕。最後一個 record separator 不創造空白列。

### FR-02：模板解析

模板字數以 JS UTF-16 code units 計算，最多 32,768。掃描遇 `{{` 必須找到下一個 `}}`；內容不得空、不得含 `{`／`}`，但可以含任意一般空格，並精確等於一個 header，不 trim。`{{ Name }}` 的 token 是 ` Name `：只在 header 完全相同時匹配；若 header 為 `Name` 則報未知欄位。遇未配對 `}}` 拒絕。`{name}`、`${name}`、HTML、Markdown 皆為普通文字。使用 segments `[{type:'literal',value}, {type:'field',name}]` 編譯一次。

### FR-03：先檢查再產生

載入後解析全部模板佔位符，未知欄位以一次清單呈現，禁止按生成。逐列只檢查模板實際使用的欄。預設若任何待用欄位為空字串，阻止整批生成，顯示每欄缺值筆數及最多 20 個 row index（其餘顯示剩餘筆數），不修來源。允許空白選項預設 off；切換會使舊結果 stale，明示 `N 個空值將代入空字串`。

### FR-04：字面單次套入

對每一 row 遍歷預編譯 segments；field segment 從原 row 取值並直接附加，不再 parse 或 evaluate 值。特殊字串、`<script>`、引號、`{{OTHER}}` 都原樣保留。生成最多 1,000 筆；若單純 record text UTF-8 bytes（不含 export envelope）已大於 8 MiB，可作安全下界提早拒絕。最終是否超限以 FR-05 serializer 實測 TXT+JSON bytes 合計（包含所有 envelope/metadata）為準；超限整批輸出失敗，不提供其中一個檔、截斷結果或上一代輸出 Blob。

### FR-05：預覽、複製與下載

預覽以 row index 定位，預設顯示第 1 筆，可上一筆／下一筆；內容保留換行且使用 `<pre>` 或等效 text-only 元件。單筆複製按鈕只複製目前筆，成功才顯示「已複製第 N 筆」，失敗提供可鍵盤選取的 textarea。下載 TXT 為可讀形式：每筆先印固定 `--- 第 1 筆 ---` / `--- Row 1 ---` 分隔行，之後原文；JSON schemaVersion=1、tool=`template-merge`、template、headers、options、records `{row,text,blankFields}`、counts。輸出不以姓名命名。

### FR-06：資料生命週期和狀態

狀態 `idle → source-loaded → template-ready → validating → needs-input/ready → generating → preview → stale`。來源、模板或空值選項更改時 generation++、取消正在執行工作、清除結果和下載。執行每 100 rows yield，可取消；取消不保留 partial output。`reset` 解除 input File、parsed rows、segments、records 和 output Blob refs；`pagehide` 取消並 revoke 所有 URL。不得保存歷史。

## 輸出限制和錯誤碼

TXT+JSON 最終 UTF-8 bytes 合計上限 8 MiB，含每個檔案的所有 JSON/TXT envelope、欄位標籤和 metadata。來源 CSV 的 1 MiB 上限另算。輸入檔名只顯示文字，不用於路徑。固定錯碼：`FILE_TOO_LARGE`、`INVALID_UTF8`、`CSV_SYNTAX`、`ROW_WIDTH`、`HEADER_INVALID`、`ROW_LIMIT`、`COLUMN_LIMIT`、`TEMPLATE_TOO_LARGE`、`TEMPLATE_SYNTAX`、`UNKNOWN_FIELD`、`MISSING_VALUES`、`OUTPUT_TOO_LARGE`、`COPY_UNAVAILABLE`、`CANCELLED`。錯誤不在畫面／下載加入原始名單內容。

## 非目標

不支援 liquid/Handlebars/Mustache 控制語法、條件、HTML rendering、批次檔名、複製整批 clipboard、外送、追蹤、變數自動猜測、匯入舊成果或保存設定。只提供靜態文字產物。

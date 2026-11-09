# 名單轉通訊錄 — 既有規格保存

Task ID: `labs-60-contact-cards` · Spec ID: `spec-60-contact-cards`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格：名單轉通訊錄

狀態：規格，尚未實作。M1 候選頁 noindex；正式網域、canonical 和公開索引待主代理決定。

## 使用者與工作

活動主辦人、工作室或小型團隊手上有一份聯絡人 CSV，想把選定欄位一次整理成通訊錄格式。成功結果是可預覽、邊界清楚的單一 `.vcf` 檔案；工具不連手機、不上傳名單、不替使用者寄信。

## MVP 需求

### FR-01：選擇與解析 CSV

- 由使用者明確選一個 CSV 檔。檔案最多 1 MiB（1,048,576 bytes）；檔案大小超限在讀取/解碼前拒絕。用 fatal UTF-8 解碼，可移除開頭單一 UTF-8 BOM；不讀取路徑、metadata、外部連結或其他檔案。
- CSV 必須含一列 header，最多 30 欄，最多 1000 筆資料。接收 RFC 4180 雙引號規則，接受 CRLF 和 LF records；quoted cell 可含 comma/double quote/換行，`""` 代表一個雙引號。引號只可包住完整欄位；關閉引號後只接受 comma、行尾或 EOF。孤立 CR、錯誤引用、欄位數不一致、空白資料列拒絕整份檔案。
- 每個 cell 最多 4096 Unicode scalar；整體 byte/row/column caps 先驗。Header 以顯示欄名加 1-based 欄號呈現；重複或空 header 仍可用欄號區分，不靠 header 字串合併欄位。
- CSV 不會被當 HTML、formula、URL 或指令執行。只在 `textContent` 顯示 sample，不使用任意 HTML parser。

### FR-02：明確欄位映射

- 使用者必須把一個來源欄位映射為「姓名」。可選映射「電話」「Email」「組織」「備註」；未映射欄位留空。來源欄 index 每種目標最多使用一次；不得自動猜欄位或用範例值偷偷映射。
- Mapping picker 顯示 `欄 N · 原 header` 和第一筆非空樣本；使用者切換 mapping 後必須重新預覽。
- 欄位名稱、組織、Email 的外側空白 trim 並 NFC；電話外側空白 trim 並 NFC，內部字元和前導 `0`/`+` 原樣保留；備註 NFC 並將 CRLF/CR 正規化成 LF，其他空白保留。不得拆姓名、補國碼或重寫電話。
- 姓名 trim 後必填，1–120 Unicode scalar；電話 1–64 scalar，Email 1–254 ASCII bytes，組織 0–120 scalar，備註 0–500 scalar。拒未配對 surrogate、C0/C1 controls（備註允許 CR/LF，不允許 TAB/其他 controls）、U+2028/U+2029；非備註欄不得含換行。
- 每筆聯絡人至少要有非空電話或 Email。任何一列不合法就阻止整批輸出並列原始 CSV 行號、欄位與原因；不能略過問題列或輸出部分名單。

### FR-03：Email 與電話界線

- 電話只做長度、非空、控制字元和注入邊界驗證。視為原文字串，不驗證國碼、區碼、可撥性、國際格式，不補字元、不正規化標點。
- Email 做明示的「基本語法」檢查：ASCII subset、恰一個 `@`、兩側非空、無 whitespace/control、local part 不以/不以點結尾且無連續點、domain 至少含一個點、每個 domain label 只含英數或內部 hyphen、label 不以 hyphen 起訖。總長最多 254 bytes。拒絕不等於判定不可寄送；不做 DNS、存在性、deliverability 或網域安全查詢。國際化 Unicode email 不在 M1 支援。

### FR-04：預覽與重複標記

- 預覽列出全部聯絡人、映射欄位、原始列序、有效欄位和可能重複 group；必要資訊為完整顯示姓名、電話、Email、組織、備註。備註可展開，不裁掉換行。
- 只在姓名、電話、Email、組織四欄正規化後完全相同（忽略備註）時標記「欄位相同，請確認是否重複」。Email/電話比較大小寫及字串均 exact；電話 `001` 和 `1` 不相同。重複資訊只是提示，不合併、不刪除、不決定保留哪筆。
- 任何來源檔或欄位 mapping 更改立即清除 preview/VCF bytes/舊下載 URL。修正全部錯誤後需重新預覽。

### FR-05：vCard 3.0 輸出

每筆聯絡人輸出一個固定 vCard：

```text
BEGIN:VCARD
VERSION:3.0
N:;;;;
FN:完整顯示名稱
TEL;TYPE=VOICE:+886912345678
EMAIL;TYPE=INTERNET:name@example.com
ORG:組織
NOTE:第一行\n第二行
END:VCARD
```

省略空白 optional TEL/EMAIL/ORG/NOTE properties；保留必需 VERSION、N、FN。若沒有電話只省略 TEL，沒有 email 只省略 EMAIL。每張卡 CRLF 結尾；多張連續輸出，不插入空白 record。輸出固定檔名 `contacts.vcf`、MIME `text/vcard;charset=utf-8`，單檔 UTF-8 最多 4 MiB；超限整批拒絕，無部分檔。使用者必須按「下載 VCF」才開始下載；不呼叫通訊錄 API、不自動開啟/匯入。

### FR-06：duplicate-safe、異常與生命週期

- 姓名完整字串只寫入 `FN`；`N:;;;;` 表示五個空 structured name components（family/given/additional/prefix/suffix），明確不從中文或西式名字猜分段。
- vCard text values 將反斜線 `\` 編碼為 `\\`，CRLF/CR/LF 編碼為 `\n`，逗號 `,` 編碼為 `\,`、分號 `;` 編碼為 `\;`。CR/LF 不得以 raw line break 混進 property。Colon、quotes 不須為本產品另行跳脫；property name/parameter 完全固定，絕不取自 CSV。
- vCard 每條實體行最多 75 UTF-8 bytes（含 continuation leading space，不含 CRLF），以 CRLF+單一空白折行；不在 UTF-8 code point 內折斷。這是本工具相容性限制，短行按同規則輸出 CRLF。
- 匯入/映射狀態：idle → reading → mapping → preview → exported。錯誤/取消不修改來源 mapping；清除或換檔立即 `generation++`、abort reader、撤銷 URL、清空 parsed rows 和 VCF。晚到事件對不上 generation 必須忽略。清除也在 `pagehide` 執行。
- CSV、對應資料、重複索引、VCF bytes 只留當前頁記憶體；沒有 storage、network、API、analytics、console data logging。無法保證移除使用者已下載的 `.vcf`。

### FR-07：非目標

不提供姓名拆分推測、電話補國碼/清洗、email 寄送/驗證、裝置通訊錄寫入、QR、照片、雲端同步、密碼保護、地址或組織結構推論。RFC 語法輸出不保證每個手機/桌面通訊錄匯入程式都相同；真機匯入需人工確認。


---

## 原文件 TECHNICAL.md

# 技術規格：名單轉通訊錄

狀態：規格，尚未實作。Node.js 24+ ESM builtins、瀏覽器原生 HTML/CSS/ESM，零依賴；不安裝套件、不開 browser。依本工具 `docs/ENGINEERING.md`、`docs/PRIVACY-SECURITY.md`、`docs/DESIGN-SYSTEM.md`。

## 檔案樹與介面

```text
package.json
.gitignore
public/index.html
public/en/index.html
public/styles/app.css
public/js/app.js
public/js/core/csv.mjs
public/js/core/map-contacts.mjs
public/js/core/vcard.mjs
scripts/check.mjs
scripts/build.mjs
scripts/serve.mjs
test/csv.test.mjs
test/map-contacts.test.mjs
test/vcard.test.mjs
dist/                         # M1 preview noindex
```

```js
parseCsvUtf8(bytes, limits) -> { headers, rows } | CsvError
validateMappings(headerCount, mapping) -> Mapping | MappingError
mapContacts(rows, mapping) -> { contacts, duplicateGroups } | ContactErrors
escapeVcardText(value) -> string
foldVcardLine(logicalLine, { maxOctets: 75 }) -> physicalLines
serializeVcards(contacts, { maxBytes: 4194304 }) -> Uint8Array | OutputLimit
```

核心只接 byte/string/record 參數，不讀 DOM、網路、storage、檔案系統、時間或 locale。`.mjs` 純函式供 Node 測試和 browser app 共用。

## CSV tokenizer 與上限

1. File.size 在 FileReader 前檢查 `<=1,048,576`；核心再次以 `Uint8Array.byteLength` 檢查。`TextDecoder('utf-8',{fatal:true})` 解碼，僅剝除 byte stream 開頭單一 UTF-8 BOM。
2. Stateful parser 狀態為 field-start / unquoted / quoted / after-quote，分隔符固定 comma。雙引號欄位內 `""` 變成一個 `"`；quoted CRLF/CR/LF 統一為 LF 資料字元。未引用欄位中的 comma 結束欄位；未引用 CRLF/LF 結束 row。外部孤立 CR、欄位中途的 quote、閉 quote 後非 delimiter/record-end/EOF 拒絕。
3. Header 必須一列、1–30 cells；資料上限1000 rows。每 row cell count 必須與 header 相同。只容許最終 row terminator，不丟棄空白 data row。每 cell 4096 scalars。先按 bytes，再逐 token 限制 rows/columns/cells，避免無界 split。
4. Header 可重複/空白但 mapping selector 以 column index 1-based 唯一區分，UI label=`Column n · header or (blank)`。不把 CSV cell 當 HTML/公式/URL。

## Mapping、資料驗證和 duplicate groups

- `mapping={name:index,phone:index|null,email:index|null,organization:index|null,note:index|null}`；name 必須 map；每一個非 null source index 在範圍且唯一。Mapping 不作字串猜測。
- 每個 source cell 先 reject unpaired surrogate，然後按 FR-02 field-specific NFC/trim/newline rules。空白 row field 對 name 判 blank 時用 `trim()===''`；不能用 value fallback 覆寫另一欄。
- phone/email 至少一個 `trim()!==''`。Phone僅長度 1–64/control checks，escape specials，不正規化國碼。Email按產品定義的 ASCII subset parser；不得用 async DNS或 regex 聲稱 deliverable。
- Duplicate key 是 NFC/canonicalized `[name,phone,email,organization]` 的 JSON tuple（精確大小寫；notes omitted），不是 separator-joined string，避免欄位分隔碰撞。每組只標記 row indexes/CSV行號，絕不合併。Map 索引另保留 byte/cell 原值僅至成功 mapping 完成，不進輸出。
- 任一列錯誤產出明確 cell issue 集合並 block entire export；不剔除無效 rows 來產出「部分成功」。錯誤回傳 row/column index 和 code，不附 raw PII 字串到 log。

## vCard 3.0 encoding、properties、escaping

- RFC 2426 §§2.3/3.1.2/3.1.3 定義 vCard MIME Directory Profile 3.0：每個 card 要有 `BEGIN:VCARD`、`END:VCARD`，必須包含 `VERSION:3.0`、`N` 和 `FN`。N 的五個值為 Family; Given; Middle; Prefix; Suffix；語法允許空 `text-value`，故 `N:;;;;` 是五個空 component 的 structured N。完整輸入姓名只放在 `FN`；不拆分或猜語序。
- RFC2426 文本逃逸支援 `\\`, `\;`, `\,`, `\n`/`\N`。實作先把 literal backslash 變 `\\`，正規化 newline 後轉成 `\n`，再 escape comma/semicolon；所有 property names 和 `TYPE` parameters 為常數，任意 CSV 欄位不能增加 property。
- RFC2426 延續 RFC2425 的 CRLF line delimiter、CRLF+WSP unfolding，並以 75 **characters** 建議折行。產品選擇更保守地限制每個 physical line ≤75 **UTF-8 octets**（包括 continuation 空白，不含 CRLF），且不拆 UTF-8 multi-byte code point；75-octet 指引直接見後續 vCard 4 規格 RFC6350 §3.2，這只是本 vCard3 writer 的安全/相容性上限，沒有把輸出改標 vCard4。
- RFC2426 已移除 vCard 內部的 `CHARSET` parameter；charset 由外層 MIME Content-Type 的 `charset` 表示，並指出 UTF-8 preferred。M1 對 Blob 使用 `text/vcard;charset=utf-8`、輸出 UTF-8 no-BOM bytes；standalone file 本身沒有 MIME header，因此不承諾每個 legacy importer 對非 ASCII 字元行為一致。真機匯入是手動 NOT_RUN，不能以 Node 成功序列化宣稱可匯入所有手機。
- RFC2426 允許 TEL 的 `TYPE=VOICE`、EMAIL 的 `TYPE=INTERNET`，ORG/NOTE 是 text properties。空 optional values 不輸出。全部 logical lines 先固定 properties，再 escape text、UTF-8 token-aware fold，最後用 CRLF 組 bytes。

官方參考：

- [RFC 2426 — vCard MIME Directory Profile](https://www.rfc-editor.org/rfc/rfc2426.html)（vCard 3.0、必要 properties、N grammar、escaped chars、charset parameter）
- [RFC 2425 — MIME Content-Type for Directory Information](https://www.rfc-editor.org/rfc/rfc2425.html)（CRLF、fold/unfold、75-character generation guidance）
- [RFC 6350 §3.1–3.2 — vCard Format Specification](https://www.rfc-editor.org/rfc/rfc6350.html)（後續 vCard 4 的 UTF-8 與 75-octet/multibyte folding text；僅作較嚴格 octet limit 參考）
- [RFC 4180 — Common Format and MIME Type for CSV Files](https://www.rfc-editor.org/rfc/rfc4180.html)（CSV quoting syntax；本工具另接受 LF record ending）

## VCF folding / output cap oracle

- Logical card properties為 `BEGIN:VCARD`, `VERSION:3.0`, `N:;;;;`, `FN:{name}`, optional `TEL;TYPE=VOICE:{phone}`, optional `EMAIL;TYPE=INTERNET:{email}`, optional `ORG:{organization}`, optional `NOTE:{note}`, `END:VCARD`。
- Escaped logical line依 Unicode code point/token 分段，逐 token 計 UTF-8 bytes。首 physical line最多75 bytes；續行先寫 `CRLF + SP`，因此續行內容最多74 bytes。單一 UTF-8 codepoint或 escape token不分段；續行開頭空格是 unfolding delimiter，不是原值。
- 每筆卡片 CRLF 包含最後一行；相鄰卡直接接續。TextEncoder 序列化前統計最終 bytes。`<=4,194,304` 成功；多一 byte 整份拒絕，Blob 不建立。

## Reader/status/cancel/stale/cleanup

- UI 狀態 idle→reading→mapping→preview→download; validationError/blocked 可回 mapping。FileReader start 前檢 `File.size`; 匯入只接受一個來源檔。
- `generation++` on new source, new mapping, cancel, clear, pagehide. 在讀取前隱藏舊 VCF下載、revoke old URL、清 old preview。Reader `abort()` on cancel/change; `load` only accepts current generation and file-size-checked bytes.
- CSV parse/mapping 為 bounded local work。若 parse 採 worker/chunk，取消 must terminate/abort；不可同步跑完才 yield。VCard最多4MiB可短同步生成；不顯示虛假progress/cancel。任何錯誤清 VCF bytes/Blob。
- Clear/pagehide reader.abort(), `URL.revokeObjectURL`, clear CSV rows/maps/contacts/VCF references. 不能聲稱刪掉已下載檔或 browser/OS memory。
- no storage, network, API, auth, telemetry, remote resources, console PII, clipboard reads, phone contacts API, or background file scanning.

## Runtime

`package.json` private/type module/engines >=24；`npm test`=`node --test test/*.test.mjs`; check/build/dev 各 `scripts/*.mjs`。Loopback dev `127.0.0.1:4240`；靜態 allowlist 只 public，GET/HEAD，404/405/host/traversal controls；M1 build `noindex`。詳細路徑和 environment/Git rules 看本工具 AGENTS/common docs。


---

## 原文件 UX-SEO.md

# 介面與搜尋規格：名單轉通訊錄

狀態：規格，尚未實作。Product App 畫布以目前聯絡人名單和映射預覽為主；檔案選取/CSV 欄位 mapping 是受控工作流程，不顯示未經檢查的 HTML。M1 noindex，正式 URL 待發布流程確定。

## 雙語頁面文字

### 繁體中文

- `title`: `名單轉通訊錄｜Gloss Tools`
- `description`: `把 CSV 名單映射成 vCard 3.0 通訊錄檔。先檢查姓名、電話、email 與重複資料，再手動下載 VCF。`
- `H1`: `把 CSV 聯絡人整理成一個 VCF`
- 副標：`選擇欄位並逐筆檢查；姓名不拆分，電話前導 0 和 + 保留。`
- 主按鈕：`選擇 CSV` → `預覽聯絡人` → `下載 VCF`。
- 資料提示：`檔案只在此頁處理；工具不會自動寫入手機或上傳名單。`

FAQ：

1. **會自動把姓名拆成姓和名嗎？** 不會。完整姓名保留在 vCard 顯示名稱欄，結構化姓名欄留空。
2. **電話會補國碼或去掉前導 0 嗎？** 不會。工具保留輸入文字，只檢查長度和控制字元；不驗證可撥性。
3. **這保證能匯入每一種手機嗎？** 不保證。工具產生 vCard 3.0 UTF-8 檔；不同通訊錄 app 的匯入方式需自行確認。

### English

- `title`: `Contact List to vCard | Gloss Tools`
- `description`: `Map a CSV contact list to a vCard 3.0 file. Review names, phone numbers, email, and exact duplicate groups before downloading a VCF.`
- `H1`: `Turn a CSV contact list into one VCF`
- Supporting text: `Choose the columns and review each contact. Names stay intact; leading phone zeros and plus signs are preserved.`
- Primary actions: `Choose CSV` → `Preview contacts` → `Download VCF`.
- Data notice: `Your file is processed in this page. The tool does not write to a phone or upload the contact list.`

FAQ:

1. **Will it split names into first and last names?** No. The full name stays in the formatted name property; structured name parts remain empty.
2. **Will it add a country code or remove leading zeros?** No. It preserves the text and checks only length and control characters; it does not verify whether a number can be dialed.
3. **Will the file import into every phone?** That is not guaranteed. The tool creates a UTF-8 vCard 3.0 file; check the import steps in your contacts app.

## 工作區線框

Desktop：

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 名單轉通訊錄 / Contact list to vCard       狀態：未選檔    語言切換 │
├────────────────────────────┬─────────────────────────────────────────┤
│ 操作與欄位 mapping          │ 聯絡人預覽（主畫布）                    │
│ [選擇 CSV]                  │ 001  王小明      +886912345678          │
│ 檔案：contacts.csv 1.2 KiB  │      a@example.test   Gloss Lab         │
│ 姓名     [欄1 · Name ▾]     │ 002  ...                                   │
│ 電話     [欄2 · Phone ▾]    │ 欄位相同提示：第 5 / 7 列，未自動合併   │
│ Email    [欄3 · Email ▾]    │                                          │
│ 組織     [欄4 · Org ▾]      │ 1,000 筆 · 0 錯誤 · 2 組可能重複        │
│ 備註     [欄5 · Note ▾]     │                                          │
│ [預覽聯絡人]               │ [下載 VCF]                              │
│ [取消 / 清除]              │                                          │
└────────────────────────────┴─────────────────────────────────────────┘
```

Mobile（同頁單欄、有標籤的步驟 tabs，選檔 mapping 頁可返回預覽）：

```text
┌──────────────────────────────┐
│ 名單轉通訊錄        語言切換│
│ [CSV 與欄位] [聯絡人預覽]   │
├──────────────────────────────┤
│ [選擇 CSV]                  │
│ 檔名與大小                  │
│ 姓名     [欄位選擇 ▾]       │
│ 電話     [欄位選擇 ▾]       │
│ Email    [欄位選擇 ▾]       │
│ 組織     [欄位選擇 ▾]       │
│ 備註     [欄位選擇 ▾]       │
│ [預覽聯絡人]                │
│                              │
│ 預覽頁：每人一張直向資料列  │
│ 名稱 / 電話 / Email / 組織 │
│ 重複提示 / 備註展開         │
│ [下載 VCF]                  │
└──────────────────────────────┘
```

## 狀態、鍵盤與安全顯示

- Idle：清楚說明支援 CSV 和上限，不放假聯絡人記錄。
- Reading：顯示檔案名/bytes、本地解析中和「取消讀取」；檔案大小先檢再讀。
- Mapping：顯示每個目標的欄位 index/header 和 sample；姓名 mapping 必填。重新映射使舊預覽即刻過期。
- Preview ready：顯示總筆數、錯誤數、exact duplicate groups 和全部聯絡人。重複用「可能重複，未合併」文字/圖示，不只用色彩。
- Blocked：CSV 格式或列錯誤定位行/欄；姓名或 contact method 不合規不生成 partial VCF；原列表仍可修正 mapping。
- Download ready：`Download VCF` 就在完整預覽旁，顯示 vCard3/UTF-8/4MiB cap；不自動打開通訊錄。
- 鍵盤順序：選檔→姓名/電話/Email/組織/備註 mapping→預覽→結果表→下載→清除。表頭 sample 可讀；動態錯誤以 live region 低干擾公告。
- 320px 將預覽 row 改為直向；200% zoom、44×44 target、focus、對比、reduced-motion 符合共通設計規格。不要把所有聯絡人包成窄兩維表格。
- 該檔可能包含個人資料；UI 說清只在當頁處理/明確下載，錯誤不顯示完整 Email/備註，也不寫 console。

## SEO / 發布

- 建議候選路徑 `/contacts/`、`/contacts/en/`；production URL、canonical/hreflang/sitemap 只由主代理於 release 建立。
- M1 中英頁互鏈但 noindex/nofollow；不宣稱所有手機相容，不以「完全安全」或「已匯入」描述下載。
- 真實手機通訊錄匯入、瀏覽器檔案 chooser/下載、Network/Storage 和 320/200% 版面必須單獨記錄；目前 `NOT_RUN_USER_FOCUS_INCIDENT`。不得從生成 VCF bytes 推論真機已接收。


---

## 原文件 ACCEPTANCE.md

# 驗收規格：名單轉通訊錄

狀態：規格，尚未實作。純測試用手寫 synthetic bytes/聯絡人，不使用個人或真實名單。RFC 格式檢查僅驗序列化結構；手機 app 匯入是獨立 NOT_RUN gate。

## Pure-core oracle

| ID | 輸入 / 步驟 | 明確 expected | 關聯 |
|---|---|---|---|
| A01 | CSV header `姓名,電話`；row `王小明,+886912345678`；map col1→name,col2→phone | VCF card 必有 `BEGIN:VCARD\r\nVERSION:3.0\r\nN:;;;;\r\nFN:王小明\r\nTEL;TYPE=VOICE:+886912345678\r\nEND:VCARD\r\n`；完整姓名不拆，電話保留 `+`。 | FR-02/05/06 |
| A02 | 兩筆合法聯絡人 | bytes 中恰 2個 `BEGIN:VCARD\r\n` 和2個 `END:VCARD\r\n`；卡片間沒有空白 record；所有 property line以 CRLF結束。 | FR-05 |
| A03 | TEL input `001-02 +886` | 輸出 value 精確 `001-02 +886`；不補區碼、不刪0、不移除中間空格。 | FR-03/05 |
| A04 | Name `Mary Jane Watson` | `FN:Mary Jane Watson`，`N:;;;;`；不推導 `N:Watson;Mary;...`。Name `王小明` 亦保持單一FN。 | FR-05/06 |
| A05 | FN `A,B;C\D`；NOTE `line1\r\nline2,;\` | FN logical value=`A\,B\;C\\D`; NOTE=`line1\nline2\,\;\\`；property 行數仍固定，沒有 raw CR/LF 注入。 | FR-05/06 |
| A06 | FN 36個 `王`（每個UTF-8三bytes） | `FN:`+前24字共75 bytes；續行是 `CRLF SP`+餘下12字共37 bytes；每條physical line≤75 bytes且無UTF-8 code point被切。 | FR-05 |
| A07 | CSV header duplicate/blank heading，透過欄 index mapping | 欄位 selectors 顯示不同 1-based index；映射 col1 和 col2 可區分，不按 heading string 折疊。若同一 source index 指派給兩目標則拒絕。 | FR-01/02 |
| A08 | 有姓名但 phone/email 均空的 data row | 整批 block，指出該列至少需要一種聯絡方式；不輸出剩餘合法 rows。 | FR-02 |
| A09 | 電話字串只有控制字符或65 scalar；Email 多於254 ASCII bytes/兩個 `@`/空 domain | 各 reject 並顯示列欄位置；姓名/email 不寫入 error logs/console。 | FR-02/03 |
| A10 | `"王, 小明","001234","a@example.test","Org","第一行\r\n第二行"` | quoted comma 不裂欄；quoted note 的 CRLF 正規化為 LF，再輸出單一 `NOTE:第一行\\n第二行` property。 | FR-01/05 |
| A11 | 未關閉 quote、quote 後多餘字元、row 欄數較 header 少/多、內部 blank row、孤立 CR | 每種各自 reject malformed CSV；不得只省略錯列或猜 delimiter。 | FR-01 |
| A12 | byte input 恰 `1,048,576`; 再增加1 byte；另放 invalid UTF-8 sequence | 恰上限可進 parser；多1 byte在 decode 前拒絕；invalid UTF-8以固定 encoding error拒絕。 | FR-01 |
| A13 | 1000 個合法 rows，再加第1001個 | 1000接受完整預覽；1001拒絕整批，無部分 VCF。 | FR-01/05 |
| A14 | 兩 row 的 name/phone/email/org都相同，note不同；第三 row phone=`1` vs 原=`001` | 前二只標為一組 possible duplicate，不合併；第三不和前者重複。Phone比較 exact，忽略 note僅按固定核心 tuple。 | FR-04 |
| A15 | Name含`BEGIN:VCARD\r\nTEL:999`；Note含`x\r\nEND:VCARD\r\nBEGIN:VCARD` | Name因換行控制字元整批拒絕；合法 note換行輸出 literal `\\n`，最終card數仍等合法輸入筆數。 | FR-02/05 |
| A16 | Email `x@example.test\r\nTEL:999` | 因control/whitespace/格式拒絕，property/parameter始終固定，不能增添 TEL 行。 | FR-03/05 |
| A17 | 有合法 phone；Org=`Smith;Unit, East\Lab` | ORG text value semicolon/comma/backslash escaped，作一個 organization text property，不意外拆 organization-unit list。 | FR-05/06 |
| A18 | card UTF-8 bytes恰4,194,304，和再多一byte的 synthetic serializer buffer | 恰上限成功；多1 byte `OUTPUT_LIMIT`，不建Blob、不截短、不保留舊VCF。 | FR-05 |
| A19 | 成功預覽後改欄 mapping，並讓舊 FileReader 事件延遲到達 | 改 mapping 即撤下下載URL/清舊 contact rows；generation不符的 load 被忽略，舊 VCF不復活。 | FR-04/06 |
| A20 | 清除檔案/模擬 pagehide | Reader abort、Blob URL revoke、CSV rows/mapping/contacts/bytes references清空；不聲稱刪除已下載VCF。 | FR-06 |

## vCard 3.0 結構檢查

用 deterministic parser 先移除 `CRLF + SP` continuation，再以 CRLF 解析。對每個輸出 card 驗：BEGIN/END配對、VERSION=3.0、exact one N/FN、N具五個空 component、所有物理行≤75 UTF-8 octets（不含CRLF）、UTF-8解碼有效且不切 codepoint、escape sequence可正確還原。使用 RFC 2426 的格式要求；不把 RFC 6350 v4 當輸出版本。下載 MIME是 `text/vcard;charset=utf-8`，不在 file body 填 CHARSET property。

## M1 命令驗收

Node 24+ `npm test`, `npm run check`, `npm run build`; 所有固定 oracle用假 bytes。`npm run dev`只`127.0.0.1:4240`，offline HTTP查GET/HEAD、404/405、Host/traversal guard、noindex。命令/版本/exit碼要回寫HANDOFF。CSV parser Node成功不等於 browser FileReader/Blob/下載或手機匯入已驗。

## Browser/device gate

| ID | 檢查 | 預期 | 狀態 |
|---|---|---|---|
| B01 | 瀏覽器以假 CSV 選檔、mapping、預覽、下載，重新選檔/清除 | UI錯誤/重複群/VCF下載內容符合核心；舊檔立即失效。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B02 | 320px、200% zoom、Tab 完成 mapping/preview/download | mapping與結果不被裁切，focus可見，操作皆可鍵盤到達。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B03 | Network/Storage 檢查 | 無外部請求、持久storage、service worker，名單不進URL/query。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B04 | 真正手機/桌面通訊錄 app 匯入 vCard，檢查姓名/電話/多語字元 | Importer相容性只在真設備確認，不由Node結構測試推定。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B05 | OS file picker/download/save dialogs | 不由自動測試觸發；瀏覽器原生檔案操作屬人工 gate。 | `NOT_RUN_USER_FOCUS_INCIDENT` |

M1 全部純 oracle 和 Node 工具鏈通過才能交主代理。B01–B05由隔離 browser/device review另外決定，不可標PASS。


---

## 原文件 TASKS.md

# 實作任務：名單轉通訊錄

狀態：規格，尚未實作。依序實作；僅限本工具 `AGENTS.md` 的 package/public/scripts/test/dist/HANDOFF/TASK-ENTRY/evidence 路徑。六份規格、AGENTS/common docs不改；不安裝、不開browser、不接通訊錄API、不發布。

## T00 — Node24 scaffold

- 前置：讀 AGENTS、六份規格、共通 engineering/privacy/design。
- Allowed paths：`package.json`, `.gitignore`, `public/**`, `scripts/**`, `test/**`, `TASK-ENTRY.md`。
- 建 ESM/private/Node>=24 manifest、test/check/build/dev scripts、雙語 noindex skeleton、core/test modules；dev固定 `127.0.0.1:4240`。
- 驗收：24+ Node版本；scripts實際可執行；MIME/path allowlist先有 skeleton。
- 完成：版本/命令exit寫 HANDOFF。

## T01 — UTF-8 CSV tokenizer

- 前置：T00。
- Allowed paths：`public/js/core/csv.mjs`, `test/csv.test.mjs`。
- 實作byte cap、fatal UTF-8/BOM、state-machine quote parser、CRLF/LF、row/column/cell上限及嚴格ragged/malformed拒絕。
- 驗收：ACCEPTANCE A10–A13、A11惡意 malformed各案；手寫expected。
- 完成：不透過 `split(',')` 或對整檔無界 split；回寫 HANDOFF。

## T02 — mapping、validation、duplicate mark

- 前置：T01。
- Allowed paths：`public/js/core/map-contacts.mjs`, `test/map-contacts.test.mjs`。
- 實作column-index mapping、field NFC/trim/control/length、phone/email minimum validation、exact tuple duplicate group；任何 invalid row block all。
- 驗收：A07–A09、A14、A16；duplicate只提示不合併。
- 完成：errors僅輸出row/column/code不暴露完整PII；回寫 HANDOFF。

## T03 — RFC2426 writer與UTF-8 folding

- 前置：T02。實作者須再核技術文件列出的RFC官方段落，不能以搜尋摘錄為產品規格。
- Allowed paths：`public/js/core/vcard.mjs`, `test/vcard.test.mjs`。
- 固定VERSION/N/FN/BEGIN/END；以完整name只產FN、N五空值；escape text；CRLF+SP按75 octets折行且不切Unicode code point；VCF bytes cap。
- 驗收：A01–A06、A15、A17–A18；由unfolding parser手寫 expected card。
- 完成：MIME/charset限制和v4/手機相容性沒有過度宣稱；回寫 HANDOFF。

## T04 — 真實 CSV chooser/mapping UI

- 前置：T03。
- Allowed paths：`public/index.html`, `public/en/index.html`, `public/styles/app.css`, `public/js/app.js`。
- 建明確 file input、sample-driven欄 index mapping、整批錯誤列、聯絡人與重複預覽。input資料只留記憶體、不放URL。
- 驗收：欄位label可讀，重複完全說明不合併；source/mapping改動同步 stale。
- 完成：可到完整預覽且沒有 fake fixture rows；回寫 HANDOFF。

## T05 — 手動下載/取消/清理

- 前置：T04。
- Allowed paths：`public/js/app.js`, `public/js/core/vcard.mjs`, `test/vcard.test.mjs`。
- 使用者按下載才建 `contacts.vcf` Blob；reader可abort、generation guard；換檔/clear/pagehide清 rows/bytes/revoke URL。
- 驗收：A18–A20；沒有partial output/late event resurrection。
- 完成：不自動開通訊錄、不碰 clipboard；回寫 HANDOFF。

## T06 — 雙語產品介面/SEO

- 前置：T04。
- Allowed paths：`public/index.html`, `public/en/index.html`, `public/styles/app.css`, `public/js/app.js`。
- 落實UX-SEO雙語title/description/H1/FAQ、工作流程/桌面mobile樣式/無障礙；M1 noindex，不假設正式網址。
- 驗收：copy真實表達name/phone/VCF限制；320px/200%/keyboard由browser gate紀錄。
- 完成：沒有全手機支援聲稱；回寫 HANDOFF。

## T07 — runtime checks/build/dev

- 前置：T00–T06。
- Allowed paths：`scripts/check.mjs`, `scripts/build.mjs`, `scripts/serve.mjs`, `test/**`, `package.json`, `.gitignore`。
- check必要檔案/ESM/外部資源/unsafe DOM；build closed allowlist/no stale delete；dev固定 `127.0.0.1:4240`, GET/HEAD/404/405/Host/traversal。
- 驗收：`npm test/check/build`、offline HTTP；遵守Windows long-run environment fingerprint規則。
- 完成：記錄每個exit/version和未解缺口；回寫 HANDOFF。

## T08 — M1 evidence and handoff

- 前置：T00–T07。
- Allowed paths：`HANDOFF.md`, `TASK-ENTRY.md`, `evidence/m1/**`。
- 遞交ACCEPTANCE A/B分列證據；browser/device/file chooser/download/Network/Storage保留 `NOT_RUN_USER_FOCUS_INCIDENT`。
- 驗收：最終test/check/build各一次；diff限允許路徑；不commit/push/deploy。
- 完成：只報實際完成的M1、pass/fail/not-run與風險，等主代理M2核准。


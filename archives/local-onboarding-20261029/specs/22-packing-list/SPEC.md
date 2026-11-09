# 行李清單與重量試算 — 既有規格保存

Task ID: `labs-22-packing-list` · Spec ID: `spec-22-packing-list`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格：行李清單與重量試算

狀態：SPEC_ONLY；所有需求仍待實作和驗證。使用情境與價值是假設，沒有搜尋量證據。

## 使用者與工作

使用者正準備一次旅行，只整理一個行李清單。他要知道有哪些東西還沒放進去、已列物品中有多少件尚未量重，以及有完整重量時，清單是否超過自己輸入的重量上限。工具不引用航空公司規則，也不判斷可否登機。

## 功能需求

- **FR-01 初始與新增：** 初次載入為空清單，明確顯示「新增物品」。新增一列時欄位預設為空名稱、數量 1、單件重量未知、未打包。最多 100 列；滿 100 列時停用新增並說明上限。
- **FR-02 欄位：** 每列包含名稱（選填，最多 80 UTF-16 code units）、數量（整數 1–99）、單件重量（可空白；若有值為整數 0–99999 g）、是否已打包。空白重量是未知；0 g 是已知零，兩者不同。名稱經 String.trim 後空白時，顯示穩定 fallback「物品 N」/「Item N」，N 為畫面列序；匯出保留空名稱，不把 fallback 寫成使用者資料。
- **FR-03 名稱安全：** 拒絕名稱中的 C0/C1 控制碼（U+0000–001F、U+007F–009F），不限制一般 Unicode、ZWJ 或 emoji。長度先以 UTF-16 code units 計算。所有名稱用文字節點顯示，從不作 HTML。
- **FR-04 重量上限：** 可不填；有值時為 1–999999999 g 的正整數。空值代表不比較；0 不合法。欄位字串最多 32 code units，trim ASCII 空白後只接受 ASCII digits，拒絕正負號、逗號、小數、指數、全形數字及超長輸入。前導零可接受，解析後以整數比較。
- **FR-05 摘要：** 全清單計算列數、實際物品件數、已打包列數/列總數、已打包件數/件總數、已知重量小計（g）、未知重量列數與未知件數。打包進度的主百分比按列數計，一列勾選代表該列全部數量已打包；物品件數另外顯示，不把兩種分母混在一起。沒有任何列時不顯示「全部打包」。
- **FR-06 完整重量：** 只有未知重量列數為 0 時，摘要才可稱為「總重量」。否則只能稱為「已知重量小計」，並顯示未知列/件數。重量欄空白不可默認為 0。已知重量小計以 quantity × unitWeightGrams 加總，整數克不使用浮點。
- **FR-07 上限判斷：** 未設上限時顯示「未設定重量上限」。設了上限且所有重量都已知時，將總克數與上限比較；相等視為未超過，超過才顯示精確差額。若仍有未知重量，但已知重量小計已大於上限，顯示「至少超過 N g」並說明完整總重及實際差額未知；若已知小計不大於上限，顯示目前無法判定。不可把未知重量當作零，也不可在有未知重量時聲稱精確總重。工具不把此結果說成航空許可。
- **FR-08 篩選及編輯：** 可切換「全部／未打包」。篩選只改可見列；摘要始終使用完整清單。編輯任一來源欄位、勾選打包、刪列、改上限或匯入前，都即時使目前匯入預覽失效；計算摘要是同步且隨資料更新。
- **FR-09 範例：** 使用者可明確載入「週末旅行範例」。如目前有任何資料，先確認替換；取消時原清單完全保留。範例資料必標為示例。範例包含 2 列：衣物 2 件 × 300 g、充電器 1 件 × 200 g，全部已知合計 800 g。
- **FR-10 重置：** 「清空清單」先確認；取消不變更。確認後回到空清單、清除上限、篩選和匯入預覽。不得以瀏覽器儲存恢復已清除資料。
- **FR-11 JSON 匯出：** 使用者主動按「下載備份」才產生 UTF-8 JSON，格式見 TECHNICAL。使用固定檔名 glossquote-packing-list.json，不得附加日期、IP 或自動加入時間。資料只傳給瀏覽器原生下載，不發送網路。匯出含目前有效列及上限，空清單也可匯出。
- **FR-12 JSON 匯入：** 由使用者選本機檔案。最多 131072 bytes；以 fatal UTF-8 解碼；只接受 schema version 1 的精確欄位，不允許未知欄位、重複 ID、超過 100 列、非法值或超限。成功解析先顯示預覽摘要，不先覆蓋目前清單。使用者按「以此清單取代」後才替換；取消、選其他檔或解析失敗時保持舊清單。不得輸出原始檔內容到 console/網路。
- **FR-13 刷新與生命週期：** 資料只在 JS 記憶體；沒有 localStorage、IndexedDB、cookie、URL state 或自動儲存。頁面醒目說明重新整理、關閉或離開頁面會清除資料，並提供下載備份。pagehide 時清除應用程式持有的資料引用並撤銷 object URL；不宣稱能清除作業系統或瀏覽器剪貼簿。
- **FR-14 雙語與無障礙：** 繁中 /index.html、英文 /en/index.html，語言是獨立靜態文件。每欄有可見標籤、錯誤關聯、鍵盤順序合理；checkbox 名稱包含物品名稱，新增列後焦點移至新列名稱。
- **FR-15 輸入錯誤：** 空白數量、負數、小數、非 ASCII 數字、超界值與 >32 code units 均拒絕；空白重量只代表未知。欄位錯誤不以 0 代替，也不靜默忽略該列。錯誤顯示在對應欄位附近。
- **FR-16 資料邊界：** 最壞總重量 100 × 99 × 99999 = 989990100 g，可精確以安全整數表示；輸入和乘加都驗證整數邊界。匯入 schema 外資料採整份拒絕，不部分匯入。

## 不做的事

不推斷包裝重量、不用重量缺值做估算、不轉換盎司/磅、不套用航司政策、不同步不同裝置、不替使用者保存資料，也不聲稱已經在任何正式網址發布。



---

## 原文件 TECHNICAL.md

# 技術規格：行李清單與重量試算

狀態：SPEC_ONLY；下列模組與測試尚未存在，所有命令均 NOT_RUN。

## 技術邊界

正式工具是繁中與英文兩份原生 HTML/CSS/ESM 靜態頁。瀏覽器處理全部清單、摘要、JSON 解析與匯出；Node.js 24+ 僅負責 loopback 預覽、語法/資產檢查、測試及 dist build。不得加入 runtime 依賴、worker、伺服器 API 或外部服務。

## 目標檔案

package.json；.gitignore；public/index.html；public/en/index.html；public/styles/app.css；public/js/app.mjs；public/js/i18n.mjs；public/js/state.mjs；public/js/core/packing-list.mjs；scripts/serve.mjs；scripts/check.mjs；scripts/build.mjs；scripts/validation.mjs；test/packing-list.test.mjs；test/import-export.test.mjs；test/toolchain.test.mjs。

package.json 是 private ESM、Node >=24，M1 scripts 為 dev、test、check、build；npm run dev 固定綁定 127.0.0.1:4202 並只讀取 public。spikePort 5202 僅供隔離 spike，不可做成預設 port。

## Core API、資料模型與錯誤

草稿、驗證後的內部模型與下載備份是三種不同 schema。UI 只能保存 draft；只有整份驗證成功才可產生計算摘要或備份。

- RowDraft exact keys: id:string、nameRaw:string、quantityRaw:string、unitWeightGramsRaw:string、packed:boolean；ListDraft exact keys: rows:RowDraft[]、limitGramsRaw:string。原始文字欄位不 trim 後回寫。
- ValidatedRow exact keys: id:string、name:string、quantity:number、unitWeightGrams:number|null、packed:boolean；ValidatedList exact keys: rows:ValidatedRow[]、limitGrams:number|null。只有全列及上限都有效才可建立。
- BackupV1 exact root keys: schemaVersion:1、tool:"glossquote-packing-list"、limitGrams:number|null、rows:BackupRow[]；BackupRow exact keys: id、name、quantity、unitWeightGrams、packed。tool/schemaVersion 僅屬備份格式，不屬於內部 List。備份只從 ValidatedList 映射。
- createEmptyDraft() → {rows:[],limitGramsRaw:""}；首次載入及清空後均顯示空清單，而非預建空白列。createRowDraft(id) → 空名稱、quantityRaw:"1"、unitWeightGramsRaw:""、packed:false。UI 以記憶體序號 row-1、row-2…產生 ID；建立時略過目前清單內已使用的 ID，符合 1–80 個 ASCII 字母/數字/底線/連字號。
- validateDraft(draft) 只接受 exact plain record；plain object 的 prototype 必須是 Object.prototype 或 null。所有 record 用 Reflect.ownKeys 精確檢查；不讀取 getter。額外 own key（包含 symbol 與 non-enumerable）回 UNKNOWN_FIELD；getter/setter、缺欄、錯誤 primitive type 或其它 prototype 回 INVALID_SCHEMA。rows 必須是 dense Array，僅有 length 與 0..length-1 連續 index；hole 或額外 own key 回 ROW_LIMIT。每列也須是 exact RowDraft；列 shape 錯誤回 INVALID_ROW。
- validateDraft 成功精確回 {ok:true,list,summary}；欄位值錯誤精確回 {ok:false,code:null,fieldErrors:[{rowIndex,field,code}],summary:null}。結構錯誤精確回 {ok:false,code,fieldErrors:[],summary:null}。rowIndex 為 0-based；全域 limit 欄位 rowIndex:null。資料按 row index 升序、每列依 id/name/quantityRaw/unitWeightGramsRaw/packed 順序檢查；最後檢查 limitGramsRaw。遇第一個欄位錯誤即回傳，不產生摘要。重複 ID 在第二次出現的列回 DUPLICATE_ID。
- parseInteger(raw,{min,max,allowEmpty}) 只接收 string，先檢 UTF-16 長度 <=32，再 trim ASCII whitespace U+0009–000D/U+0020，接受 ASCII digits+，最後檢範圍；回 {ok:true,value:number|null} 或 {ok:false,code}。qty 1–99；weight 0–99999，空白為 null；limit 空白為 null，非空 1–999999999。非 string 結構型錯誤為 INVALID_SCHEMA；長度超限 INPUT_TOO_LONG；語法錯 INTEGER_REQUIRED；範圍錯 OUT_OF_RANGE。前導零接受、不裁切。
- 名稱長度以原始 UTF-16 units 計，最多 80；拒絕 C0/C1 control。空名稱合法，trim 後空只在 UI 顯示「物品 N」/「Item N」，備份仍保持空字串。quantity、weight、limit 必須是安全整數；ID 必須唯一且符合上述 pattern；packed 必須 boolean。
- calculateSummary 僅對 validateDraft 建立的 ValidatedList 呼叫，使用安全整數；空 rows 狀態為 empty，非空且無 limit 為 not-set。回傳列數、件數、已打包列數/件數、knownSubtotalGrams、unknownWeightRows/unknownWeightPieces、totalWeightGrams|null、limitGrams|null、limitStatus、overByGrams|null、minimumOverByGrams|null。沒有任何列時不得顯示全打包百分比。
- 有 limit 且所有重量已知時，總重 <= limit 為 within，> limit 為 over，只有完整重量時 overByGrams 才可為非 null。存在未知列且已知小計 > limit 時為 over-known-minimum，totalWeightGrams 與 overByGrams 必為 null，minimumOverByGrams=knownSubtotalGrams-limitGrams；否則為 unknown-weight，不能判 within 或 over。沒有 limit 時 status 為 not-set，不推測超限。
- mapListToBackup(validatedList) 為內部 helper，固定 key 順序與雙空格縮排，不含日期/IP；空名稱保持空字串，未知重量為 JSON null。匯出空清單合法。
- parseBackupBytes(bytes) 僅接受 Uint8Array，回 {ok:true,listDraft,preview} 或 {ok:false,code}；完全驗證後才回候選，絕不部分匯入。JSON 數字欄位轉成 draft 十進位字串；null 重量轉成空字串。
- parseBackupBytes 第一錯誤優先序固定：非 Uint8Array → INVALID_BYTES；bytes 長度 >131072 → FILE_TOO_LARGE；fatal UTF-8 解碼錯 → INVALID_UTF8；JSON 語法錯 → INVALID_JSON；root 非 plain record → INVALID_SCHEMA；root 額外 own key（含 symbol/non-enumerable/accessor）→ UNKNOWN_FIELD；root 缺欄或 schemaVersion/tool 不正確 → INVALID_SCHEMA；limit 非 null/安全整數/範圍錯 → INVALID_LIMIT；rows 非 Array、超過 100、稀疏或帶額外 own key → ROW_LIMIT。
- 接著按 rows index 升序檢查：非 plain row object → INVALID_ROW；row 額外 own key → UNKNOWN_FIELD；缺欄或錯誤型別/id pattern/packed 型別 → INVALID_ROW；name 超過 80 units → INVALID_NAME，name 含 C0/C1 → CONTROL_CHARACTER；quantity/weight 非安全整數或語法錯 → INTEGER_REQUIRED，超範圍 → OUT_OF_RANGE，weight 另可為 null；ID 重複於第二次出現時 → DUPLICATE_ID。每列欄位順序為 id、name、quantity、unitWeightGrams、packed；空值/錯誤不部分匯入。
- 所有接受的 record exact own keys；object-valued API 只接收 own data properties，不接受 getter/setter。Array 必須有標準 non-enumerable length data descriptor 與每個連續 enumerable data index；可凍結與否不影響唯讀檢查。JSON.parse 不會產生 sparse/hole、symbol 或 accessor，但 core 對直接 draft 輸入也必須拒絕這些形狀。

固定 error codes：INVALID_BYTES、INPUT_TOO_LONG、INTEGER_REQUIRED、OUT_OF_RANGE、INVALID_NAME、CONTROL_CHARACTER、ROW_LIMIT、DUPLICATE_ID、INVALID_SCHEMA、UNKNOWN_FIELD、INVALID_UTF8、FILE_TOO_LARGE、INVALID_JSON、INVALID_ROW、INVALID_LIMIT。UI 對應固定錯誤翻譯，不輸出原文或 exception。

## UI / 瀏覽器能力與非同步生命週期

內部 draft 是唯一編輯來源。每次欄位輸入先同步更新 RowDraft/ListDraft，再整份 validateDraft；valid 時可更新摘要，invalid 時將 summary 設 null 並顯示欄位 errors，不可留上次有效摘要。Summary 僅從 ValidatedList 計算。

JSON 匯入是 async File API。UI 將 File.arrayBuffer() 結果包成 Uint8Array 後呼叫 parser。每次選檔、取消匯入、來源修改或 pagehide 都遞增 importRequestId；開始讀取時保存 revision。arrayBuffer promise 完成後，僅當非 disposed、requestId 與 revision 都仍相同才可安裝候選 preview。無法終止底層 arrayBuffer 讀取時可忽略晚到結果；不得覆蓋新版 state。確認替換時再次比對 revision/requestId。使用者取消或讀取錯誤保留目前 draft。頁面卸載時標 disposed、使 request id/revision 失效並清掉 source/list/candidate 引用。

下載在使用者 click handler 建 Blob 並觸發 anchor。建立的 object URL 放入集合，click 後不得在同步 finally 立刻 revoke。於 60 秒後 revoke；pagehide 提前 revoke 全部。anchor DOM 在 click 後移除。真實瀏覽器下載仍需人工驗收。

## 本機 toolchain

M1 命令：npm test、npm run check、npm run build；先建立 scripts 才能呼叫。Build 僅將經 allowlist 驗證的 public/** 複製到此專案 dist/**，不納入 docs/test/.runs/package inputs。Check 包含 locale parity、HTML active attribute 本機引用、ESM 語法、只允許 public 本機引用；不能把字串掃描說成完整安全證明。正式部署 headers/404/production SEO 留 M2。

Server 預設 bind 127.0.0.1:4202。若該 port 已占用，不連線、不停止、不猜測或 kill 既有程序；改用 Node OS 分配的 loopback 空閒 port，啟動訊息列出實際 URL，HANDOFF/TASK-ENTRY 記錄 requested 與 assigned port。若 fallback 失敗就停止回報。




---

## 原文件 UX-SEO.md

# 介面與 SEO 規格：行李清單與重量試算

狀態：SPEC_ONLY。預覽索引設定、正式 SEO 與瀏覽器外觀均 NOT_RUN。介面採 Gloss Tools Product App；主畫面直接是一張可編輯清單，沒有抽象行銷 Hero。

## 工作畫布

桌面首屏：頂端小型產品列；主要區域依序顯示清單資料表、摘要（已打包列 / 件數、已知重量/未知項目）、新增物品與重量上限。匯入/匯出與範例是清單附近的次要動作；清空放在明確的次要區且需確認。若摘要空間不足，置於清單下方，不擠壓欄位。

桌面草圖：頂端產品列顯示「行李清單與重量試算」及資料只留在此分頁；主區每列依序是名稱、數量、單件重量 g、已打包 checkbox、刪除。下方是完整摘要與重量上限。新增、下載備份、匯入 JSON、載入範例置於清單邊緣。

手機寬 320 CSS px：每列轉成垂直排列的可編輯區塊，不讓整張表水平捲動；名稱、數量、重量、checkbox、刪除保持標籤與易達觸控尺寸。摘要換行；下載與新增操作不被虛擬鍵盤遮住。資料欄多時可在列內排布兩欄，但讀序仍是名稱、數量、重量、打包、刪除。

## 主要狀態與介面文字

- 空狀態：「還沒有物品。新增第一項，開始整理清單。」
- 新列成功：「已新增物品。重量留白代表尚未量重。」
- 重量未知：「尚有 1 列（2 件）未填重量；目前只顯示已知重量小計。」
- 完整但未設上限：「總重量 800 g。尚未設定重量上限。」
- 有未知且已知小計不大於上限：「有 1 列重量未知，因此目前無法判斷是否超過 5,000 g。」
- 有未知但已知小計已超上限：「已知重量小計已超過上限至少 200 g；尚有未知重量，完整總重及實際超出量未知。」
- 完整超限：「總重量比你設定的上限多 250 g。」不可寫「不能登機」。
- 篩選無結果：「目前沒有未打包的物品。」全表摘要維持不變。
- 匯入成功解析後：「備份包含 2 列、3 件；取代目前清單前請確認。」按鈕明示「以備份取代目前清單」與「取消匯入」。
- 匯入錯誤：「無法使用這份備份。請選擇 GlossQuote 行李清單匯出的有效 JSON 檔。」不回顯任何原始內容。
- 覆蓋範例/清空確認說明會清掉目前資料；取消維持原資料。
- 刷新提示固定可見：「重新載入或關閉分頁會清除清單。要保留，請下載 JSON 備份。」

所有錯誤靠欄位 label/help/error 關聯；status 用文字和 icon，不只用顏色。新增列將焦點移至新名稱欄位；刪除後將焦點移至下一列同動作或前一列。確認 dialog Escape 可取消並還原焦點。

## 本地化 SEO 草稿

Slug packing-list；預定 host packing.glossquote.com 是未來已授權免費部署的目標，尚未部署。正式 canonical、hreflang、sitemap 只在 M2 固定來源後、M3 實際發布時填入真實 HTTPS URL。預覽兩語都必須有 noindex,nofollow；不得在 M1 宣稱已可索引。

繁中：
- title：行李清單與重量試算｜GlossQuote Tools
- description：整理旅行物品、打包狀態與已知重量。留白重量會標成未知，不會當作零；支援本機 JSON 備份與預覽匯入。
- H1：行李清單與重量試算
- intro：列出要帶的物品與數量，勾選已打包項目；輸入實際量到的重量後查看小計。重量未知時不會猜數字。
- FAQ：「留白重量會當作 0 嗎？」不會，會顯示未知並阻止完整總重及上限判斷。「這會套用航空公司行李規則嗎？」不會，上限由你自行輸入，結果不代表可否登機。「重新整理會保留清單嗎？」不會；請先下載 JSON 備份，工具不會把清單傳到伺服器。

英文：
- title: Packing List & Weight Planner | GlossQuote Tools
- description: Organize travel items, packed status, and measured weights. Unknown weights stay unknown; preview a local JSON backup before replacing a list.
- H1: Packing list and weight planner
- intro: List what you plan to bring, mark packed items, and enter measured weights when you know them. The tool never treats a blank weight as zero.
- FAQs: “Does a blank weight count as zero?” No; it is unknown and prevents a complete total and limit comparison. “Does this apply airline baggage rules?” No; you set the optional limit and the result is not boarding advice. “Will a refresh keep my list?” No; download a JSON backup first. The tool does not upload the list.

M2 production pages must include self canonical, reciprocal zh-Hant/en hreflang plus x-default to Chinese, aligned title/description/H1, OG locale/url and a static WebApplication schema matching visible text. M1 preview must not contain a live canonical or production sitemap. Never claim weight accuracy beyond user-entered values, user counts, savings, or search ranking.



---

## 原文件 ACCEPTANCE.md

# 驗收規格：行李清單與重量試算

狀態：SPEC_ONLY；所有案例 NOT_RUN。輸入皆為人造資料。Automated cases 驗純函式/狀態，不代表原生 File API 或真瀏覽器通過。

## 自動可驗收案例

| ID | 輸入/操作 | 預期 |
|---|---|---|
| A01 | createEmptyDraft() | rows=[]、limitGramsRaw=""，沒有全部打包百分比 |
| A02 | createRowDraft("row-1") | 空名稱、quantityRaw="1"、unitWeightGramsRaw=""、packed=false |
| A03 | qty 99、weight 99999 | 兩值接受；型別皆整數 |
| A04 | qty 1、weight 0 | 接受已知 0 g；summary unknown rows=0 |
| A05 | 空白 weight | 保持 null；不得與 A04 混同 |
| A06 | qty 0、-1、1.5 | OUT_OF_RANGE / INTEGER_REQUIRED，列不靜默略過 |
| A07 | weight 100000 | OUT_OF_RANGE |
| A08 | limit 空白 | limitGrams=null |
| A09 | limit 0 | OUT_OF_RANGE |
| A10 | limit 999999999 | 接受 |
| A11 | limit 1000000000 | OUT_OF_RANGE |
| A12 | ASCII 空白包住 12 | trim 後接受 12 |
| A13 | 全形 １、+1、1e2、1,000 | 拒絕；不作寬鬆解析 |
| A14 | 33 code units 數值字串 | INPUT_TOO_LONG |
| A15 | 名稱 80 code units | 接受；81 拒絕 |
| A16 | 名稱含 <img src=x onerror=1> | 當純字串顯示，不生成元素/事件 |
| A17 | 名稱含 U+000A | CONTROL_CHARACTER |
| A18 | 空白名稱 | 顯示列序 fallback；匯出仍為空字串 |
| A19 | 100 列新增 | 接受；101 列 ROW_LIMIT |
| A20 | row IDs 重複 | DUPLICATE_ID，整個 list 驗證失敗 |
| A21 | qty2×350 g、qty1×200 g，limit 900 | 總件數 3、總重 900 g、within |
| A22 | A21 第一列 packed=true，第二列 false | row progress 1/2；packed pieces 2/3 |
| A23 | qty2×350 g、另一列 weight=null qty4 | known subtotal 700 g；unknown 1 row/4 pieces；total=null |
| A24 | 有 unknown row、known subtotal=700 g、limit=500 | limitStatus=over-known-minimum；minimumOverByGrams=200；totalWeightGrams=null、overByGrams=null；只能說至少超過 200 g |
| A25 | 全部已知總重 501 g、limit=500 | limitStatus=over，差額 1 g |
| A26 | 全部已知總重恰 500 g、limit=500 | within，不能算 over |
| A27 | 清單空、limit=100 | 不顯示重量或 0/0 全部打包 |
| A28 | makeExampleList() | 衣物 2×300 + 充電器 1×200，總重 800 g，全部已知 |
| A29 | exact schema v1 匯入 A28 | 預覽 rows=2,pieces=3,total=800 g；尚未替換 |
| A30 | schemaVersion 2 且帶多一個 root key | UNKNOWN_FIELD（額外 key 優先於 version）；舊清單不動 |
| A31 | 缺 row 欄位 | INVALID_ROW，整份拒絕；不部分匯入 |
| A32 | File 131072 bytes | 可進 UTF-8/JSON 驗證；131073 bytes FILE_TOO_LARGE |
| A33 | 非 UTF-8 bytes 或 JSON { | INVALID_UTF8 / INVALID_JSON，不顯示原文 |
| A34 | 匯入解析後改任一欄再按確認 | 預覽失效，不得覆蓋最新清單 |
| A35 | 匯入預覽取消 | 原 list 完全相同 |
| A36 | 匯出 fixture 後重匯 | schema 相同；0/null 差異保留；沒有 timestamp/IP |
| A37 | 名稱含 </textarea><script> | 僅作文字內容，不執行 |
| A38 | 清空確認取消 | 資料保留；pagehide 不寫 storage |
| A39 | unknown rows >0、known subtotal=500、limit=500 | unknown-weight；不可宣稱 within 或 over |
| A40 | validateDraft 直接收到 root/row 額外 symbol 或 non-enumerable key、required getter、或 sparse rows | 額外 own key UNKNOWN_FIELD；required getter INVALID_SCHEMA 且 getter call count=0；sparse rows ROW_LIMIT；全部 summary=null |

## 真實瀏覽器必要檢查（M1）

- B01 中文主流程：在 4202 中文頁新增兩項，填數量/重量，勾選一項；核對列數進度、件數及總重與 A21/A22。
- B02 英文主流程：/en/index.html 完成相同兩列，欄位標籤、狀態、空值未知重量均為英文，沒有漏翻。
- B03 未知重量阻止總判定：留一列重量空白並設定上限；若已知小計小於等於上限，只稱 known subtotal 並顯示無法判定；若已知小計已大於上限，顯示至少超出下限，不顯示精確總重或差額。
- B04 篩選：切到未打包後藏起打包列，summary 仍依全清單計算。
- B05 範例替換取消/確認：有資料時取消載入保持不變；再次確認顯示兩列 800 g 範例。
- B06 JSON 匯出/匯入：使用真實瀏覽器下載，再選該檔；預覽前舊清單不變，取消不變，重新匯入確認後完整替換。原生下載與 file picker 是人工必驗；若設備無法操作，逐項記 NOT_RUN，不以 mock PASS。
- B07 鍵盤：僅用鍵盤新增、編輯、勾選、刪除與取消 dialog，焦點可見且不遺失。
- B08 320px viewport 必須實測：不出現整頁水平溢出；標籤/錯誤/摘要/動作仍可達。
- B09 200% zoom 若現有工具無法調整，單獨標 NOT_RUN，不與 B08 合併標 PASS。
- B10 私隱：DevTools Network/Storage 檢查使用者資料不送出且沒有 storage 寫入；若無完整 network/storage 能力標 NOT_RUN，不以 source scan 當作通過。
- B11 刷新提示：可見資料消失警告；MVP 不宣稱 reload recover。

M1 必驗：B01–B08、B11；B08 的 320px 寬度必須實測。B09 的 200% 縮放與 B10 Network/Storage 若工具不支援可各自 NOT_RUN，不得合併成 PASS。




---

## 原文件 TASKS.md

# 任務與里程碑：行李清單與重量試算

狀態：SPEC_ONLY；目前未實作。每個任務依序執行，失敗先修此任務，不勾選後續。所有程式修改只在本專案資料夾。

## M1 / T00：本機可操作雙語 MVP

前置：讀完本資料夾 PRODUCT、TECHNICAL、UX-SEO、ACCEPTANCE、docs/ENGINEERING、docs/PRIVACY-SECURITY、docs/DESIGN-SYSTEM；先確認 Node >=24。長測試/建置前後遵循 docs/ENGINEERING Windows guard。記錄初始狀態；若有其他人正在改同路徑就停止。

允許路徑：public/**, scripts/serve.mjs, scripts/check.mjs, scripts/build.mjs, scripts/validation.mjs、本工具必要 scripts/*.mjs helper、test/**（僅假資料）、package.json、.gitignore、本工具產生的 dist/**。交付紀錄允許更新本工具 HANDOFF.md、project.json、START-HERE.md、docs/RELEASE-CANDIDATE.md，並在 TASK-ENTRY.md 追加專用證據。不可改其他工具、根首頁、父索引、Git root、發布來源、外部帳號或憑證。

1. 建 private ESM/Node24 scaffold、loopback-only safe server 127.0.0.1:4202、真 check/build/test；不得先執行不存在的 scripts。
2. 實作純 core API、schema v1、數字 grammar、100-row/quantity/weight summary，先完成 A01–A40 與負例測試。
3. 做雙語單頁清單、篩選、摘要、範例與確認、重置、JSON preview/import/export、取消/失效狀態；編輯欄位以 textContent 安全呈現。
4. 增加完整邊界、stale import/request id、pagehide/object URL cleanup、loopback/allowlist/toolchain 測試；M1 不作正式 SEO/headers。
5. 啟動本機服務，人工完成 B01–B08、B11；B09 的 200% zoom、B10 Network/Storage 可依工具能力分項 NOT_RUN。B08 的 320px 必須實測。B06 的原生下載與 file picker 若環境不能操作，逐項記 NOT_RUN；測試 API mocks 不可冒充 PASS。
6. 最終一次執行 npm test、npm run check、npm run build；記錄 exit code、Node版本、manifest/hash、真實 browser 案例及 NOT_RUN。凍結交主代理，不自動進 M2。

M1 gate：A01–A40、npm test/check/build 與 required toolchain gate PASS；B01–B08、B11 的真實瀏覽器證據完成，涵蓋雙語清單、未知重量下限、篩選/範例/匯入預覽取消與確認、鍵盤、320px 及刷新提示。B09 zoom、B10 Network/Storage 可在工具能力不足時分項 NOT_RUN；B06 原生 download/file picker 也可在設備不足時分項 NOT_RUN，不能以 mock 宣稱人工通過。Windows environment guard 前後相同。主代理未放行前不得做 M2。

## M2 / T01：正式 SEO、安全產物與公開來源

前置：主代理讀差異並明確 M1 放行。允許本工具 public/**, scripts/** 中 release/build/check/manifest helper, test/** release tests, package.json, wrangler.jsonc, .gitignore, docs/RELEASE.md, docs/RELEASE-CANDIDATE.md、專用 publishing copy evidence。必須與 M1 reviewed copy 分開、核對路徑。

補正式 canonical/hreflang/x-default/robots/sitemap/JSON-LD、404、headers、production origin allowlist，增加 production build/check/release 檢查；確認靜態輸出不含 tests/docs/inputs/secrets。先驗 fixed blob source ZIP 可重建，必要 check 通過後依發布契約建立或更新 KYStr/glossquote-labs-packing-list public repo，驗 remote visibility/commit/ZIP bytes；不 force，不 deploy、不碰首頁。無法驗證或權限異常停止回報。

## M3 / T02：主代理部署、首頁與外部驗收

只由主代理控制正式 Cloudflare 與首頁序列整合。功能對話不得改首頁、部署或把 draft 標為 published。主代理 live 驗證後才公開首頁項目；交付標示「已上線，待外部複驗」。收到外部報告後由本工具原對話按具體問題修改 own paths、重測與 republish；主代理重新部署驗證。未有外部確認不得標完成。


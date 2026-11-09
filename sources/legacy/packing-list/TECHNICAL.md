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



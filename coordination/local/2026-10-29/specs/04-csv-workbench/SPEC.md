# CSV 檢視與欄位整理 — 既有規格保存

Task ID: `labs-04-csv-workbench` · Spec ID: `spec-04-csv-workbench`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格

原始 MVP 契約與本輪增量規格；實際版本狀態與驗收見 HANDOFF。

## 需求

| ID | 固定行為與預設 |
|---|---|
| FR-01 | 一個CSV文字textarea，可手動貼上；另可明確選取一個副檔名.csv（大小寫不拘）的檔案。檔案解碼的rawSource獨立保存在記憶體作權威來源，textarea只是可編輯的顯示副本；未編輯前解析一律讀rawSource。MIME不當真實格式證據，不接受URL、拖入資料夾或多檔。選檔成功取代來源，失敗／取消保留原文字及來源種類但使舊預覽失效。按「預覽CSV」才解析。 |
| FR-02 | 檔案先以File.size限制1,048,576 bytes；貼上與解碼結果也以UTF-8 bytes限制1MiB，先拒絕UTF-16 length>1,048,576。UTF-8 fatal decoding，接受且移除開頭一個BOM；不猜Big5／UTF16、不替換壞bytes。拒未配對surrogate、U+0000..0008、000B、000C、000E..001F；允許Tab/CR/LF。 |
| FR-03 | 分隔固定逗號、引號固定雙引號；record換行接受CRLF或LF，quoted field內CR/LF按實際解析來源保留；quote外孤立CR拒絕。未編輯的檔案rawSource完整保留換行。textarea的API值會統一換行為LF，因此貼上路徑與檔案讀入後首次文字編輯都以LF正規化的textarea.value成為新來源，格內換行也成LF；介面明示此限制。不用split(",")／split("\n")代替parser，不trim、不轉數字／布林／日期。 |
| FR-04 | 最大5,000筆records（含可能表頭）、50欄、100,000 cells（含表頭）、每格解碼值16,384個UTF-16單位。所有records欄數必須等於第一筆；不補空、不截斷、不略過壞列。超限或語法錯就拒整份結果。 |
| FR-05 | 空來源為0筆、空狀態；終端一個record換行不額外產生空列；顯式空record仍是一格空字串。例"a,b\n"只有一筆，"\n"有一筆[""]，", "有兩欄""與" "。 |
| FR-06 | 「第一列是欄位名稱」預設true；表頭值本身仍保留。沒有表頭時label顯示第1欄等；空表頭顯示「未命名（第n欄）」；同名表頭顯示原文加欄位置，不改原值。切換表頭設定重設全選、頁碼與匯出確認。 |
| FR-07 | 欄位依來源index識別，預設全選，勾選只決定保留與否，不改順序、不排序。至少選1欄才可匯出。表格每頁100筆資料列，表頭不計資料列；總頁數與上一頁／下一頁可見；沒有資料列但有表頭時顯示「只有欄位名稱」。 |
| FR-08 | 每次選欄／表頭／來源變更都重算選取範圍風險並使已準備匯出失效。所有值仍是字串，包含"001"、長整數、"false"。HTML、公式、URL都只作文字顯示，不建立可點連結或運算。 |
| FR-09 | 預設匯出類型為「CSV保護副本」。有公式風險的格（含表頭）會加一個ASCII單引號U+0027，其他格不變；匯出前顯示確切修改格數與分頁原值／匯出值對照，使用者須勾選「我了解保護副本會改變這些值」才下載。無風險時不需要此核取。此措施不是跨所有試算表的安全保證。 |
| FR-10 | 「CSV原值」只在所選格全部無本規格風險時可用；有風險即停用且無繞過按鈕。「JSON原值」永遠保留所選原始字串，使用固定schemaVersion:1 schema，提供原值出口；不支援重新匯入。 |
| FR-11 | CSV全欄雙引號、內引號加倍，record分隔CRLF、無最後CRLF、UTF-8無BOM；格內原本CR/LF不改。固定名selected-protected.csv或selected-original.csv。JSON以兩空格、LF、無尾LF、UTF-8無BOM，固定selected-original.json。任何輸出最多4,194,304 bytes，超限全拒。 |
| FR-12 | 解析和匯出序列化使用worker，單工作、5秒watchdog。可取消；jobId防過期。選檔讀取用可abort的FileReader。clear終止worker、abort reader、撤銷Blob URL、清所有資料與勾選、回預設表頭true與CSV保護副本。 |
| FR-13 | 工作資料只在記憶體；不傳外部、無storage/URL/log、無telemetry/service worker。離頁不主動保存。缺必要API則明確不支援，無雲端fallback。 |

## 公式風險的產品定義

用TECHNICAL的明確predicate保守標示：跳過指定前導空白後以=、+、-、@或相應全形符號開始，或前導空白中含Tab/CR/LF。負數如"-12"也算風險；這是明示的保守限制，不猜是否真正公式。檢查選取的表頭和資料格，未選欄不影響該次匯出。

CSV匯出中的欄位引號僅為CSV結構escaping，不能當作公式防護。保護副本會在原字串最前面加單引號，不移除前導空白；原值JSON不加此字元。使用者另開／另存CSV的應用可能有不同處理，頁面應提示檢查結果。

錯誤碼固定：FILE_TYPE、INPUT_TOO_LARGE、INVALID_UTF8、INVALID_UNICODE、UNSUPPORTED_CONTROL、CSV_SYNTAX、COLUMN_MISMATCH、ROW_LIMIT、COLUMN_LIMIT、CELL_LIMIT、FIELD_TOO_LONG、NO_COLUMNS、FORMULA_RISK、OUTPUT_TOO_LARGE、UNSUPPORTED、TIMEOUT、READ_FAILED、WORKER_FAILED。錯誤可帶數字record/field/offset，不含來源值、檔名或raw exception。

CSV原始bytes的引號風格與record換行可能改變；「原值」只承諾格值字串與所選欄／record次序，不是byte-for-byte原檔複製。clear不刪除已下載檔案，也不承諾記憶體物理抹除。

若必須保留檔案內quoted CRLF或孤立CR，請選檔後直接預覽並匯出，不編輯文字副本。首次input事件清除file rawSource引用，改用textarea.value；所有後續操作都以新文字來源為準，不把舊file rawSource混回結果。

## U04-LITERAL-FIND-20261013：跨頁字面定位

FR-14：預覽後選擇一個目前保留的來源欄，顯式查找全部資料頁。以原字串 case-sensitive String.includes 比對，不 trim、normalize、轉型或使用 regex；每格最多計一次。空 query 為 idle，空格有效。最多 256 UTF-16 units，拒絕 CR/LF 或未配對 surrogate；就地錯誤不截短輸入，不使 CSV／匯出失效。

FR-15：符合格依原 record 次序，以來源欄 index 識別。排除啟用中的表頭；顯示資料第 n 筆、來源第 m 欄、邏輯 CSV 第 r 筆。首次查找跳首格，上／下一個不循環，DOM 仍為每頁最多 100 筆。文字標記和輪廓識別目前格；UI 位置欄不加入資料或匯出。

FR-16：查找只定位，不篩選。query／查找欄／清除只清匹配，保留 CSV 頁碼和全部原匯出狀態；match 導航只用既有 page 事件。來源／讀取／解析／clear 清全部查找；選欄／表頭按原失效契約，再清 match、將查找欄設為剩餘首欄，query 可保留並要求重新查找。格式變更和準備匯出保留查找；busy 禁用查找／導航，不取消 Worker。手動換頁保留 cursor，非所在頁不高亮其他格。

新增固定就地錯誤碼 SEARCH_TOO_LONG、INVALID_SEARCH_QUERY；只回限制，不回顯輸入。原 FR-01..13、風險／bytes／rawSource 契約仍全部有效。本輪不加入排序、編輯、資料篩選、匹配列匯出、多欄查找或新 CSV 方言。


---

## 原文件 TECHNICAL.md

# 技術規格

## U04-LITERAL-FIND-20261013 增量

新增 core/search.mjs：validateQuery 守 primitive string／256 UTF-16 units／CR-LF／surrogate；findCells(records,hasHeader,sourceColumnIndex,query) 沿既有 validateRecords 守全部 shape／row／column／cell／field／UTF-8 payload 上限，再以 includes 掃指定的一欄。回 Result 數字 metadata 列表，不複製 cell 或 projected records。

metadata：recordIndex/sourceColumnIndex 0-based；recordNumber=recordIndex+1，fieldNumber=sourceColumnIndex+1，dataRowNumber=recordIndex-(hasHeader?1:0)+1，pageIndex=floor((dataRowNumber-1)/100)，pageRowIndex=(dataRowNumber-1)%100。最多 5,000 個位置，空 query 回空列表；無效 Boolean／index／records fail closed。

app.mjs 匯出的 createSearchController 是實際 UI 使用的獨立 owner，只取得 getSession 和 goToPage。持有 query/sourceColumnIndex/matches/currentMatch/status/error，不取得 jobs、rawSource setter、output bytes 或 URL。observeSession 只採有效 session 事件；相同 session 的過期回覆忽略。query input 只清列表、不掃表；顯式 run 才搜尋。run/move 只以 page 事件換頁，comparePage 不重設。

DOM 的數字 data-record-index/data-source-column 對應來源，與 projected index 分開。值與 query 一律 textContent／textarea value；查找使用一列 textarea，以保留非法多行／超長輸入供就地拒絕，不讓 input[type=text] 默默移除換行。只有 query 內無修飾 Enter 觸發查找；不掛全域鍵盤 handler。導航保留控制焦點，局部 table region 捲動，reduced-motion 使用 instant。

parser、risk、serializer、encoding、session reducer、Worker／bundle 協議與資產全部沿用。check 只追加 search.mjs 必需資產，固定安全 API／雙語／bundle gate 不變。

這是規格，尚未實作。原生HTML/CSS/ESM、Node24+ node:test，零runtime套件；不呼叫其他專案。

## 檔案樹

    package.json
    scripts/serve.mjs
    scripts/check.mjs
    scripts/build.mjs
    public/index.html
    public/styles/tokens.css
    public/styles/app.css
    public/js/app.mjs
    public/js/worker.mjs
    public/js/core/input.mjs
    public/js/core/csv.mjs
    public/js/core/selection.mjs
    public/js/core/risk.mjs
    public/js/core/export.mjs
    public/js/core/session.mjs
    test/scaffold.test.mjs
    test/input.test.mjs
    test/csv.test.mjs
    test/selection.test.mjs
    test/risk.test.mjs
    test/export.test.mjs
    test/session.test.mjs

package private:true/type:module；dev/test/check/build分別為node scripts/serve.mjs、node --test、node scripts/check.mjs、node scripts/build.mjs。serve綁127.0.0.1:4173只給public；build只輸出受審靜態檔至dist，不帶來源資料、docs或tests。

## 函式與編碼

成功{ok:true,value}，失敗{ok:false,error:{code,record:null|number,field:null|number,offset:null|number}}。record/field是1-based邏輯CSV座標，不是引號內物理行號；offset為UTF-16，錯誤不回原值。

    decodeUtf8(bytes:Uint8Array) -> Result<string>
    validateSource(text:string) -> Result<string> // 最前一個BOM移除後回傳
    parseCsv(text:string) -> Result<string[][]>
    projectRecords(records,indices:number[]) -> Result<string[][]>
    makeLabels(records,hasHeader:boolean) -> string[]
    pageRows(records,hasHeader,pageIndex) -> Result<string[][]>
    hasFormulaRisk(value:string) -> boolean
    analyzeRisk(records) -> {count:number,cells:{record:number,field:number}[]}
    protectCell(value:string) -> string
    serializeCsv(records,mode:"protected"|"original") -> Result<Uint8Array>
    serializeOriginalJson(projectedRecords,sourceIndices,hasHeader) -> Result<Uint8Array>
    createOutputWriter() -> {append(chunk:string):Result<void>,finish():Result<Uint8Array>}
    transition(session,event) -> session

decodeUtf8先檢原始bytes<=1MiB，使用new TextDecoder("utf-8",{fatal:true,ignoreBOM:true})保留BOM，回傳含原BOM的raw字串；解碼失敗固定INVALID_UTF8。validateSource先驗primitive string、raw length上限、surrogate配對、原始UTF8bytes上限，再移除一個開頭BOM；其後BOM是普通格值字元。拒產品列出的控制字元；不能trim、Unicode normalize、轉義還原或編碼猜測。只有parser使用validateSource的去BOM回傳值：app另存rawSource，不先去BOM再送parser，以免把連續兩個BOM移除兩次。

檔案由FileReader.readAsArrayBuffer，先檢一檔/.csv/File.size；clear與cancel呼叫abort。讀取完成只有相同jobId可採用，bytes/reader引用立即釋放。input文字有任意編輯即使舊records失效；不設會靜默截短貼上的maxlength。

app必須獨立維護sourceKind:"file"|"text"和rawSource:string|null。檔案成功時sourceKind=file、rawSource=decodeUtf8結果、textarea.value=rawSource；最後一次賦值是顯示副本，不得再從textarea.value回讀成權威原文，因該API值將CRLF／CR正規化為LF。按預覽：file種類傳rawSource；text種類傳textarea.value。首次使用者input事件切text、rawSource=null、取消現有job並使records失效，顯示「文字已編輯，包含格內換行在內皆以LF處理」。程式填textarea不派input事件；貼上則按瀏覽器input流程採LF值。選檔失敗／取消不改前一個sourceKind/rawSource；clear一律清兩者。不得從input前後DOM值猜原始換行種類。

## 明確CSV狀態機

parseCsv自己先呼叫validateSource；不要假設UI已驗。狀態START_FIELD、UNQUOTED、QUOTED、AFTER_QUOTE。維護field片段、row陣列、records、當前offset與recordTouched。每一字元只走一次，field拼接採chunks或受限buffer，不能反覆切全字串。

| 狀態 | 字元 | 動作 |
|---|---|---|
| START_FIELD | 雙引號 | 進QUOTED；recordTouched=true，不加入引號 |
| START_FIELD | 逗號 | finishField("")；保持START_FIELD；recordTouched=true |
| START_FIELD | LF或CRLF | finishField("")，finishRecord，重設START_FIELD與touched=false |
| START_FIELD | 其他 | append字元，進UNQUOTED，touched=true；孤立CR拒絕 |
| UNQUOTED | 逗號 | finishField，進START_FIELD；touched=true |
| UNQUOTED | LF或CRLF | finishField、finishRecord、重設START_FIELD/touched=false |
| UNQUOTED | 雙引號或孤立CR | CSV_SYNTAX |
| UNQUOTED | 其他 | append原字元 |
| QUOTED | 雙引號 | 進AFTER_QUOTE |
| QUOTED | 其他 | append原字元；CR/LF在這裡只是格內容，逐字保留 |
| AFTER_QUOTE | 雙引號 | append一個雙引號，回QUOTED（代表CSV的雙引號escape） |
| AFTER_QUOTE | 逗號 | finishField，進START_FIELD；touched=true |
| AFTER_QUOTE | LF或CRLF | finishField、finishRecord、重設START_FIELD/touched=false |
| AFTER_QUOTE | 其他 | CSV_SYNTAX，包括空格、Tab與孤立CR，不默默忽略 |

EOF：QUOTED為CSV_SYNTAX；UNQUOTED/AFTER_QUOTE必須finishField和record；START_FIELD僅在recordTouched或row已有格時finishField("")和record。初始空來源或終端record換行後不新增record。因此空檔=[]，逗號=[["",""]]，單LF=[[""]]，a後逗號=[["a",""]]。

append前計decoded field長度，>16,384立即FIELD_TOO_LONG；finishField前檢<=50欄；finishRecord前檢<=5,000records及總cells<=100,000，再檢欄數等於首筆。不接受ragged rows，不丟棄空record；沒有regex整檔parser。

## 選欄、風險與匯出

indices只接受非空、嚴格遞增、互異、0<=index<columnCount的安全整數；不採用欄名當object key。無選欄NO_COLUMNS；其他不合法selection為INVALID_SELECTION。projectRecords維持所有record（含header）與原字串；makeLabels另生成視覺名稱不改records。pageRows僅對資料部分每100筆切片，空資料page0=[]，越界INVALID_PAGE。

hasFormulaRisk逐code point跳過開頭集合：U+0009、000A、000D、0020、00A0、1680、2000..200A、2028、2029、202F、205F、3000、FEFF。若跳過過程遇Tab/CR/LF即true；否則下一字元是=、+、-、@、＝、＋、－、＠即true；其餘false。完整空字串false，單Tab true，"a=1" false。這是保守predicate，不是所有試算表行為的完整模型。

protectCell(v)=hasFormulaRisk(v) ? "'" + v : v；不trim原字串，也不修改records。analyzeRisk回數字座標，UI用records按需取值textContent。selected範圍含header一起檢。

serializeCsv original在有任何風險時回FORMULA_RISK；protected逐格用protectCell。所有格均包雙引號，內雙引號改成兩個，record用CRLF join、不追加末尾CRLF；格內CR/LF原樣。先產chunks由createOutputWriter計UTF8bytes，超4MiB立即永久失敗，finish只回OUTPUT_TOO_LARGE而不回部分輸出。writer的上限不接受使用者設定。

原值JSON精確schema與鍵次序：

    {
      "schemaVersion": 1,
      "format": "csv-selection",
      "hasHeader": true,
      "sourceColumnIndices": [0, 2],
      "records": [["name", "value"], ["001", "=1+1"]]
    }

這是固定程式欄位加array<string[]>；所有values保留，包括header與公式字串。JSON.stringify此固定結構、indent2、無尾LF，完整bytes<=4MiB。這裡只有工具自有metadata與字串，沒有把未知JSON數字round-trip；不提供JSONimport。indices是原來源欄位座標，records已project，hasHeader明確保留表頭語義。不得把values轉成動態object properties。

兩個serializer都只接收已project的records。worker必須先在完整records上呼叫projectRecords驗證indices，再將其結果交serializer。serializeOriginalJson另驗sourceIndices為嚴格遞增、0..49的整數、長度等於projected欄數，hasHeader為boolean；不能用projected欄數當sourceIndex的最大值，來源第3欄可成為輸出第2欄。固定metadata schema若不符回INVALID_SELECTION。

## 非同步與資料生命週期

狀態idle/reading/dirty/parsing/ready/preparingExport/exportReady/error。來源變更取消worker、jobId++、清records/URL/ack；成功選檔填textarea後是dirty。解析worker接{type:"parse",jobId,source}回records。匯出worker接{type:"export",jobId,records,indices,hasHeader,format}回bytes與numeric riskCount；UI只接受當前jobId。出口再次在worker檢風險及selection，不只靠disabled按鈕。

流程是選格式→「準備匯出」→對照預覽→明確「下載」。預設protected。有修改時下載需要本次jobId且ack=true；ack不傳成繞過original風險的權限。對照每頁100筆修改格，不以截斷值代替原值；長格在局部區域可捲動。改選欄、header、格式或來源立即撤銷bytes、ack與舊URL。準備匯出過程不自動下載。

解析／匯出各5秒watchdog，取消/clear/timeout/error/完成均terminate worker、清timer。cancel reading abort reader；取消保留當前有效來源，匯出取消可回ready但無已準備bytes。clear回idle，header=true、format=protected。Blob URL點擊後1秒、新下載、修改設定、clear/pagehide撤銷。

必要能力TextEncoder/TextDecoder/Worker/Blob/URL.createObjectURL；選檔另需FileReader。不支援則停用對應能力且明示；核心Worker缺失不得主執行緒無界fallback。首屏只取同源靜態檔；無運算網路API、storage、cookies、telemetry、service worker。

## 官方依據

2026-09-23查閱：

- [RFC4180](https://www.rfc-editor.org/info/rfc4180/)：參考引號／逗號結構；本工具允許LF record並嚴格限制編碼與欄數，是明示產品profile，不宣稱所有CSV方言相容。
- [WHATWG Encoding](https://encoding.spec.whatwg.org/)：fatal UTF-8解碼與BOM選項。
- [WHATWG textarea](https://html.spec.whatwg.org/multipage/form-elements.html#the-textarea-element)：textarea API值的換行正規化；因此未編輯的檔案內容另保留權威rawSource。
- [OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection)：公式型字串與匯出風險。沒有通用保護策略適用所有試算表與後續匯入，故提供保護副本限制、原值CSV拒絕與原值JSON出口。
- [File API](https://w3c.github.io/FileAPI/) 與 [Worker](https://html.spec.whatwg.org/multipage/workers.html#dom-worker-terminate)：讀取取消、Blob URL與背景工作生命週期。

瀏覽器能力、實際匯出結果、效能都尚待本產品驗收；不得從來源文章推導已通過的安全認證。


---

## 原文件 UX-SEO.md

# UX與SEO

既有 MVP 與本輪增量的 UX 契約。Product App；沿用 [設計系統](docs/DESIGN-SYSTEM.md)。

## U04-LITERAL-FIND-20261013

Always visible：在「所選欄位原值」和表格間放次要查找列，欄位／字面內容／查找，結果後接上／下一個和清除。桌面橫排，320px 換行；表格仍是局部可捲動的主畫布。新增資料／CSV row header 只用於辨識位置，不輸出。

固定說明區分大小寫、全部資料頁、只定位不篩選、256 UTF-16 units、空格有效。數量／cursor／來源座標以 polite atomic status 宣告；目前格有可讀文字與輪廓。手動離開結果頁提示所在頁，沒有誤貼高亮。超長／多行輸入保留於一列 textarea，錯誤與其 aria-describedby 關聯；無全頁快捷鍵攔截，Next 焦點保留。

兩語靜態 HTML 教學均加入查找步驟；title／description／六 FAQ／同語系首頁／noindex 預覽與 release canonical、alternates、sitemap、robots、404、安全標頭契約維持。新版等待主代理與外部驗證，不能沿用舊版通過狀態。

## 桌面與手機

    GlossQuote-Labs / CSV                         全部清除
    CSV 預覽與欄位匯出
    [選擇UTF-8 CSV檔] 檔案讀取成功會取代文字
    CSV來源 [textarea                               ]
    檔案尚未編輯：保留原始格內換行。文字編輯／貼上會統一為LF。
    [預覽CSV]   [✓]第一列是欄位名稱
    欄位選擇（全選預設，原次序）
    [✓]第1欄 name [✓]第2欄 code [✓]第3欄 value
    表頭 / 表格主要畫布
    [上一頁] 1 / N [下一頁]   N筆資料、M欄已選
    匯出類型 [CSV保護副本 ▼]             [準備匯出]
    若有風險：修改格數 / 原值與匯出值對照 / 分頁
    [ ]我了解保護副本會改變這些值
    匯出格式、檔名、大小                          [下載]
    方法 / 限制 / FAQ

    手機
    H1 / 本機處理說明
    [選擇CSV] [來源textarea]
    [預覽CSV] / 表頭核取
    欄位核取清單（可換行，不能藏核心功能）
    有標題的表格局部捲動區
    分頁 / 選取摘要
    匯出選擇 / [準備匯出]
    對照（原值、匯出值各有label）
    變更確認 / [下載]
    FAQ

表格最大、控制沿資料流程排列，不做欄位卡片牆。原值與保護副本不可混在同一表格卻沒有label。欄名重複／空白都有來源位置；欄位選擇使用穩定index，讀屏名稱含「第n欄」。全部清除在頂部，取消在正在讀取／解析／匯出處。

## 狀態文案

- idle：「貼上逗號分隔文字，或選擇UTF-8 CSV檔。」
- reading：「正在讀取選定的CSV…」可取消。
- file來源未編輯：「使用檔案原文，保留格內原始換行。編輯文字後會改以LF處理。」
- text來源：「貼上或編輯的文字以LF換行處理，包括引號內的換行。」
- dirty：「來源已變更，請重新預覽CSV。」
- parsing：「正在檢查CSV結構…」無假百分比。
- ready：「已讀取 {n} 筆資料。選擇需要保留的欄位。」
- empty：「沒有CSV資料。請貼上內容或選擇檔案。」
- header-only：「只有欄位名稱，沒有資料列。仍可匯出欄位名稱。」
- encoding error：「檔案不是有效UTF-8。請在原應用另存UTF-8 CSV後重試。」
- structure error：「CSV結構不完整，請檢查第 {record} 筆、第 {field} 欄附近的引號或分隔符。」無座標時省略座標，不回原字串。
- column mismatch：「第 {record} 筆的欄數與第一筆不同。請修正來源；工具不會自動補欄。」
- size/limit：「資料超過本工具上限，請縮小檔案或分批處理。」旁列1MiB／5,000筆／50欄／100,000格／每格16,384單位。
- risk：「選取範圍有 {n} 格可能被試算表解讀為公式。CSV原值已停用；可檢查保護副本，或下載JSON原值。」
- protection：「保護副本會在這些值前加入單引號。不同試算表可能有不同處理，請確認下載後內容。」
- preparing：「正在準備匯出副本…」可取消。
- cancel：「已取消，來源文字保留。」clear後改idle文案。
- unsupported：「此瀏覽器缺少必要的本機處理能力，無法開始。」

必要變更確認不是永久記憶偏好；每次來源／選欄／表頭／格式變動必須失效。CSV original停用旁直接說原因與可用出口，不用恐嚇對話框或隱藏「仍然繼續」。

## 可及性

所有輸入有可見label、欄位核取群組fieldset/legend、表頭scope=col。textContent呈現值，不把URL自動變連結。每次操作只用role=status宣告摘要，錯誤與來源aria-describedby關聯。原生textarea快捷鍵保留；Tab/Space/Enter完成選欄、格式、確認、下載，無拖曳必需。

正文4.5:1、控制/焦點3:1、觸控主要目標44px；選取及風險同時有文字。320px與200%頁面縮放時表格及長格可在有名稱的區域橫向捲動，外層頁面不溢出；對照表在窄屏改每格上下對照。採共享breakpoint與reduced-motion，無裝飾性動態。

## SEO

- slug：/tools/csv-viewer/
- title：CSV 預覽與欄位選擇匯出｜GlossQuote-Labs
- description：在瀏覽器查看UTF-8 CSV，保留原始字串、選擇需要的欄位，匯出CSV副本或原值JSON。提供公式風險提示，工作資料不送往處理伺服器。
- H1：CSV 預覽與欄位匯出
- 說明：讀取小型逗號分隔CSV，確認欄位名稱與資料內容，再挑選要保留的欄位。工具不猜數字或日期，也不執行公式。

FAQ：

1. 「001會變成1嗎？」不會。格值全程保留字串；其他軟體開啟下載CSV後可能自行推斷型別，請檢查匯入設定。
2. 「為什麼我的CSV讀不到？」目前只接受UTF-8、逗號分隔、規則完整且欄數一致的CSV。Big5、分號或Tab分隔檔需要先在原應用轉存。
3. 「保護副本和原值有何不同？」保護副本在可能觸發公式的值前加單引號，會改變該格字串。JSON原值保留完整字串；有風險時CSV原值不能匯出。
4. 「保護副本保證試算表安全嗎？」不保證。不同應用與再次儲存可能有不同處理，請檢查內容；不要把未知CSV中的文字當成可信公式。
5. 「可以編輯、排序或上傳Excel嗎？」MVP只預覽和選欄，不編輯值、不排序、不接受xlsx，也不傳資料到雲端處理。
6. 「檔案內的換行會改變嗎？」選檔後未編輯文字時，格內換行依檔案原文保留。貼上或編輯來源會採用瀏覽器文字欄位的LF換行；需要保留原始格內CRLF時，請重新選檔後直接預覽。

title/description/H1/FAQ放靜態HTML。預覽noindex,nofollow；待真實網域與發布授權才新增canonical/sitemap。不提供假排名、認證、永久免費或全平台宣稱。


---

## 原文件 ACCEPTANCE.md

# 驗收案例

## U04-LITERAL-FIND-20261013

增量 U04-01..14 見下表，fixture 與精確數值斷言在 test/search.test.mjs、test/search-controller.test.mjs；既有 CV／FR 驗收保持。focused：node --test test/search.test.mjs test/search-controller.test.mjs test/session.test.mjs test/selection.test.mjs test/export.test.mjs；settled 全 gate：npm.cmd test、npm.cmd run check、npm.cmd run build、npm.cmd run build -- --release、git diff --check。查找不得改 output bytes／jobId／ack／risk／rawSource；任何來源座標或匯出回歸阻擋候選。

真正瀏覽器驗 F201 第 1/100/101/201 格及同名第 3 欄的 150，100/100/1 DOM、手動換頁、header-off、empty/header-only/no-columns、literal Unicode／HTML、256/257／多行 query。驗原生 file 的 quoted CRLF、兩語操作與下載實際 bytes；邊界檔為精確 1 MiB、5,000 records、100,000 cells。320px 與實際頁面 zoom／裝置／AT／完整 Network/Storage 的未跑項分別記錄，不以 Node mock／viewport／字體大小冒充。

| ID | 固定預期 |
| --- | --- |
| U04-01 | F201 header true 第2來源欄 needle：recordIndex/dataRow 1,100,101,201；CSV 2,101,102,202；pageIndex 0,0,1,2；DOM 100/100/1。 |
| U04-02 | F201 第3來源欄同名 note：唯一 dataRow150、CSV151、pageIndex1。 |
| U04-03 | .／[x]／.* 為字面，foo.foo 的兩次出現只算一格。 |
| U04-04 | Apple／apple、前後空格、空 query、é／e+combining 皆按原字串；空 query 無全表匹配。 |
| U04-05 | header true 不搜表頭；false 的 recordIndex0 是 dataRow1／CSV1／page0，切換清舊匹配。 |
| U04-06 | 檔案 id,note CRLF 與 quoted a CRLF b 保真，b 在 dataRow1／CSV2；首次 input 改 LF 並清匹配。 |
| U04-07 | 準備 original 後搜尋／導航／清除／非法 query，jobId／outputJobId／bytes／ack／records／indices／format 不變；F201 仍匯出202 records。 |
| U04-08 | =1+1 的風險仍1，protected ack=false 不得下載，original 停用；search 不確認、不撤回既有確認。 |
| U04-09 | 選欄／來源變更按原契約使 output 失效，清 match，查找欄為剩餘首欄；不得悄悄選回隱藏欄或採過期回覆。 |
| U04-10 | 上／下端不循環；no-match 保留頁；手動換頁保留 cursor、非所在頁無高亮，提示結果頁。 |
| U04-11 | 256合法；257 SEARCH_TOO_LONG 且保留輸入；surrogate／CR-LF INVALID_SEARCH_QUERY；非法 Boolean／index／資料形狀拒絕。 |
| U04-12 | HTML cell/query 純文字；empty、header-only、indices=[] 均有對應下一步。 |
| U04-13 | 1MiB／5,000 records／100,000 cells 完整搜索；metadata ≤5,000，DOM資料≤100／頁，不截前100格。 |
| U04-14 | 兩語鍵盤查找／Next 保留焦點、status可讀、320px／長欄名重排；實際zoom／AT等缺口獨立記錄。 |

這是規格，尚未實作。全部案例仍待執行；只用以下可本機生成的假字串／bytes。表內輸入字串採JS escape表示CR/LF；格值以array精確驗證。

| ID／類型 | 需求 | 輸入或步驟 | 精確預期 |
|---|---|---|---|
| CV-01 自動 | FR-05 | ""；"\n"；"\n\n" | 分別[]、[[""]]、[[""],[""]] |
| CV-02 自動 | FR-03,05 | "a,b\r\n1,2\r\n" | [["a","b"],["1","2"]]，無額外末列 |
| CV-03 自動 | FR-03 | '"a,b","c""d"' | [["a,b",'c"d']] |
| CV-04 自動 | FR-03 | '"a\r\nb",c\n"d\ne",f' | [["a\r\nb","c"],["d\ne","f"]]，格內換行原樣 |
| CV-05 自動 | FR-03,05 | "a,"；","；'""' | [["a",""]]；[["",""]]；[[""]] |
| CV-06 自動 | FR-03 | '"a" ,b'、'a"b,c'、'"a'、"a\rb"各別測 | 各CSV_SYNTAX，不trim／修復／部分輸出 |
| CV-07 自動 | FR-04 | "a,b\nc" | COLUMN_MISMATCH、record:2 |
| CV-08 自動 | FR-02 | bytes [0xC3,0x28] | INVALID_UTF8，不變成replacement字元 |
| CV-09 自動 | FR-02 | bytes [EF,BB,BF,61,2C,62]（hex）；另測兩組BOM接相同內容 | decodeUtf8後"\uFEFFa,b"；parse為[["a","b"]]。雙BOM解碼仍有兩個，parse只移除一個，首格為"\uFEFFa" |
| CV-10 自動 | FR-02 | "\uD800"；"a\u0000b" | 分別INVALID_UNICODE、UNSUPPORTED_CONTROL |
| CV-11 自動 | FR-04 | 一格"a".repeat(16384)，再以16385 | 前者成功，後者FIELD_TOO_LONG |
| CV-12 自動 | FR-04 | 50格"a"逗號join，再51格 | 前者成功，後者COLUMN_LIMIT |
| CV-13 自動 | FR-04 | 5000筆"a"用LFjoin，再5001筆 | 前者成功，後者ROW_LIMIT |
| CV-14 自動 | FR-04 | 每筆50格"a"，共2000筆；再加一筆 | 100000格成功；100050格CELL_LIMIT |
| CV-15 自動 | FR-02 | 用64筆各16383個"a"以LF連接，再第一格加1個a，再第二格加1個a | bytes依序1048575、1048576成功；1048577為INPUT_TOO_LARGE |
| CV-16 自動 | FR-06,07 | records=[["","x","x"],["001","02","03"]]；indices=[0,2] | project=[["","x"],["001","03"]]；labels能分辨第1/2/3欄，不改records |
| CV-17 自動 | FR-07 | indices=[]、[1,0]、[0,0]、[-1] | 依序NO_COLUMNS、INVALID_SELECTION、INVALID_SELECTION、INVALID_SELECTION |
| CV-18 自動 | FR-08 | "001,9007199254740993,false,2026-01-02" | 四格皆精確字串，不轉型 |
| CV-19 自動 | FR-09 | hasFormulaRisk各測"=1+1","+2","-12","@x","  =x","＝1","\ttext","\ntext" | 全true，包括保守負數與前導Tab/LF |
| CV-20 自動 | FR-09 | hasFormulaRisk各測"","001","a=1","'=-x","text\t" | 全false；非前導Tab不觸發本predicate |
| CV-21 自動 | FR-09,11 | records=[["=1+1","001"],["plain",'a"b']]；protected | UTF8解碼為 "\"'=1+1\",\"001\"\r\n\"plain\",\"a\"\"b\""，不加BOM/末CRLF；原records不變 |
| CV-22 自動 | FR-10 | 同CV-21；original | FORMULA_RISK，無bytes |
| CV-23 自動 | FR-10,11 | serializeOriginalJson([["001","=1+1"]],[0,2],false) | JSON.parse結果精確{schemaVersion:1,format:"csv-selection",hasHeader:false,sourceColumnIndices:[0,2],records:[["001","=1+1"]]}；字串未加前綴 |
| CV-24 自動 | FR-09 | records=[["=header","safe"],["value","text"]]；選[1]再選[0] | 前者風險0、原值CSV允許；後者風險1、原值CSV拒絕，表頭也檢查 |
| CV-25 自動 | FR-11 | createOutputWriter追加總4194304 ASCII bytes；再追加1 byte再finish | 邊界成功；超限append及finish皆OUTPUT_TOO_LARGE，無部分輸出 |
| CV-26 自動 | FR-07 | header+201筆data，page0/1/2；headerOnly | pages長100/100/1；headerOnly page0=[]但可匯出header |
| CV-27 瀏覽器 | FR-08 | 單格"<img src=x onerror=alert(1)>"；另一格"=1+1" | 都只顯示文字；無HTML執行、公式計算、image request |
| CV-28 瀏覽器 | FR-09,10 | 預覽CV-21、準備protected、未勾確認→勾確認→改選欄 | 起初下載停用，確認後可下載；改選欄立即使bytes/ack失效；original有風險始終不可用 |
| CV-29 瀏覽器 | FR-12 | 延遲FileReader/worker harness：讀取中取消、解析中clear、匯出中改來源 | reader abort或worker terminate；無遲到結果；clear全部空、header=true、format=protected |
| CV-30 瀏覽器 | FR-01,02 | 本機合成test.csv為TextEncoder("a,b\n001,02")；再選test.xlsx與1MiB+1的.csv | 首者可填來源再預覽；後兩者FILE_TYPE／INPUT_TOO_LARGE，在讀檔前拒絕 |
| CV-31 瀏覽器 | FR-11, FR-13 | 完成載入後離線，parse/export；檢Network/Storage；下載後clear | 無處理請求與storage/cookie/IDB；檔名符合格式。clear前來源只在頁面記憶體；clear後textarea/rawSource/records/輸出全部空且Blob URL撤銷 |
| CV-32 瀏覽器 | FR-12, FR-13 | 禁Worker；另使worker不回覆 | UNSUPPORTED／5秒後TIMEOUT；不走雲端 |
| CV-33 瀏覽器 | FR-06,07,09 | 僅鍵盤選檔、預覽、選欄、換頁、準備、確認、下載 | label/焦點完整、無陷阱；風險與狀態不只顏色 |
| CV-34 瀏覽器 | FR-07 | 320px及200%頁面縮放、50欄長值 | 所有控制可達；表格／值只局部捲動，頁面不雙向捲動；每頁<=100筆data DOM |
| CV-35 瀏覽器 | FR-01,03 | 用TextEncoder合成檔案source='"a\r\nb",c'，選檔後不編輯，預覽並匯出original；再在文字最後追加d並重新預覽 | 未編輯時rawSource仍含CRLF，首格值"a\r\nb"，匯出bytes含格內CRLF。首次input後sourceKind=text、rawSource=null，首格變"a\nb"、第二格"cd"，有LF提示；舊prepared bytes已失效 |
| CV-36 瀏覽器 | FR-03 | 貼上含quoted CRLF的文字'"a\r\nb",c' | textarea.value與解析首格採"a\nb"，以LF限制文案說明，不能宣稱保留剪貼簿原始CRLF |

T00建立後才執行npm test、npm run check、npm run build；Git環境另git diff --check。瀏覽器流程用npm run dev，驗完停止服務。記錄版本與逐案結果；可用TextEncoder在測試程式建立bytes，不讀私人檔案、不下載資料集。不要把CSV用Office打開的結果當作本工具內原值已變；試算表下游行為是已揭露限制。


---

## 原文件 TASKS.md

# 有順序的實作任務

流程以 AGENTS.md 的「閱讀與執行」「交付與收斂」為準：沿用本 session 已讀文件，只補讀變動／相關段落；同一授權工作依序推進，不因任務切換重問。各任務 allowed paths、前置條件與必要驗收保持有效，缺陷回到其擁有任務修正；來源發布依適用的既有明確授權，不包含網站部署。

本文件定義任務；實際進度以 HANDOFF.md 與最新驗收紀錄為準。一次只做第一個未完成任務，依 AGENTS.md 的 session 閱讀規則讀取所需文件與目前 HANDOFF。每步的命令結果、人工證據、失敗與下一步都回寫HANDOFF.md。失敗不得往後勾選，需擴範圍則停止取得新任務。

所有allowed paths均相對本工具根目錄，禁止父／兄弟專案操作；不安裝runtime依賴。

## T00 — 骨架與格式閘門

- 前置：Node24+已存在；缺少時記阻塞，不改PATH。閱讀TECHNICAL官方來源，確認CSV不是split可完成的格式，接受原值CSV風險時停用的產品限制。
- Allowed paths：package.json、scripts/serve.mjs、scripts/check.mjs、scripts/build.mjs、public/index.html、public/styles/tokens.css、public/styles/app.css、public/js/app.mjs、test/scaffold.test.mjs、HANDOFF.md。
- 實作：建立private/type和四scripts；loopback public-only serve拒traversal/dotfiles/symlink逃逸；check真正驗ESM、必需檔、外部資源和危險DOM；build allowlist至dist不含docs/tests；noindex空頁、scaffold測試。
- 驗收：腳本建好後npm test、npm run check、npm run build；人工檢dist範圍。
- 完成：記錄格式與支援待驗證，回寫HANDOFF。

## T01 — UTF-8與CSV狀態機

- 前置：T00。
- Allowed paths：public/js/core/input.mjs、public/js/core/csv.mjs、test/input.test.mjs、test/csv.test.mjs、HANDOFF.md。
- 實作：大小／surrogate／control／BOM／fatal decode，四狀態parser、EOF規則、欄數與上限；先寫CV-01至15與CV-18，再完成純函式。
- 驗收：node --test test/input.test.mjs test/csv.test.mjs；npm run check。
- 完成：引號內換行／終端換行／ragged rows／上限精確，回寫HANDOFF。不能改用split或寬鬆parser忽略壞列。

## T02 — 選欄、風險與兩種匯出

- 前置：T01。
- Allowed paths：public/js/core/selection.mjs、public/js/core/risk.mjs、public/js/core/export.mjs、test/selection.test.mjs、test/risk.test.mjs、test/export.test.mjs、HANDOFF.md。
- 實作：index-based projection、labels/pageRows、固定risk predicate、protectCell、原值CSV阻擋、保護CSV、固定schema JSON、byte writer。所有函式不修改records。
- 驗收：node --test test/selection.test.mjs test/risk.test.mjs test/export.test.mjs；npm run check；CV-16/17/19至26。
- 完成：原值與保護副本可清楚區分、未選欄不影響匯出，回寫HANDOFF。

## T03 — Worker、讀檔與競態

- 前置：T02。
- Allowed paths：public/js/worker.mjs、public/js/worker-source.mjs（生成且核對）、scripts/worker-bundle.mjs、scripts/check.mjs、scripts/serve.mjs、public/js/core/session.mjs、test/session.test.mjs、public/js/app.mjs、public/index.html、HANDOFF.md。本次既定離線 FR-13 需要初始載入後可終止／重建的記憶體 Blob Worker，這是零依賴的程式打包，不新增功能或資料快取。
- 實作：固定parse/export協議、FileReader abort、5秒watchdog、jobId、clear/pagehide共用dispose；file rawSource與textarea顯示副本分離、首次input切text、LF限制提示與來源改動失效。建立最小可操作輸入與狀態，匯出準備以按鈕明確觸發，不自動下載。
- 驗收：node --test test/session.test.mjs；npm run check；npm run dev後CV-29/30/32/36，以及CV-35的rawSource／首次編輯部分，停止服務；下載部分留T04。
- 完成：來源不會被遲到讀取或解析覆寫，回寫HANDOFF。

## T04 — 預覽、分頁與匯出確認

- 前置：T03。
- Allowed paths：public/index.html、public/styles/tokens.css、public/styles/app.css、public/js/app.mjs、HANDOFF.md。
- 實作：按照UX線框，header/欄位/100筆分頁、原值與保護值對照、風險格數、ack與format失效規則、固定檔名Blob下載及撤銷。只用textContent/value，不自動連結來源URL。
- 驗收：npm run check；npm run dev後CV-27/28/31/33/34及完整CV-35，停止服務。
- 完成：有風險不能繞過original阻擋，對照和確認在手機/鍵盤完整可用，回寫HANDOFF。

## T05 — 說明與SEO

- 前置：T04。
- Allowed paths：public/index.html、public/styles/app.css、HANDOFF.md。
- 實作：靜態title/description/H1、方法、6FAQ、限制與原值／LF語義；保留noindex，不產生canonical/sitemap或假網域。
- 驗收：npm run check；關JS仍能讀方法／FAQ；320px及200%頁面縮放可讀。
- 完成：不把保護副本寫成絕對安全或所有CSV相容，回寫HANDOFF。

## T06 — 完整驗收與交接

- 前置：T05。
- Allowed paths：HANDOFF.md、TASKS.md。
- 驗收：npm test、npm run check、npm run build；Git環境另git diff --check；npm run dev後執行ACCEPTANCE全部手動案例，停止服務。
- 完成：逐案例有真結果才可標本機MVP完成。未驗證的瀏覽器／下游試算表行為保留限制；bug回到所屬任務修正，不在本步越權改原始碼。來源發布依 AGENTS.md 的適用既有授權；本步不授權網站部署。

## 2026-10-10 TASK-ENTRY 授權擴充

實際順序：T00 → T01 → T02 → T03 → T04 → T05 → T05B → T06 → T07。預覽使用 4184；fixture 使用 5184 或已記錄的空閒 loopback 埠。

### T05B — 繁中／英文及正式 SEO 建置準備

- 前置：T05。依 TASK-ENTRY 的雙語／發布工具鏈授權。
- Allowed paths：public/**、scripts/check.mjs、scripts/build.mjs、scripts/serve.mjs、test/seo.test.mjs、docs/DESIGN-BRIEF.md、docs/VALIDATION.md、HANDOFF.md、README.md。
- 實作：完整兩語 UI／錯誤／方法／六 FAQ、同語系首頁連結；預設 noindex。明確 release 模式使用指定候選 csv.glossquote.com，建立 canonical／互向 hreflang／x-default、sitemap／robots／404／安全標頭，禁止宣稱已部署。
- 驗收：兩語結構一致、SEO 產物及預览隔離測試、check／build；完整瀏覽器與所有最終 gate 留 T06。

### T07 — 獨立來源公開及整合候選

- 前置：T06 必要本機 gate 通過；使用者允許的人工 NOT_RUN 必須明列。
- Allowed paths：scripts/publish-source.ps1、docs/RELEASE-CANDIDATE.md、docs/VALIDATION.md、HANDOFF.md、README.md、.gitignore；指定 .runs/csv-workbench/** 與 .runs/github-publish/glossquote-labs-csv-workbench/**。
- 實作：審查獨立發布 allowlist／秘密排除／manifest，僅在發布副本 Git 操作，用既有 gh 登入狀態公開 KYStr/glossquote-labs-csv-workbench。不讀 token，不改主 repo Git index，不部署。驗證 PUBLIC、remote HEAD、發布檔案及來源雜湊。
- 完成：記錄 source URL／commit／visibility、READY_FOR_INTEGRATION、人工未驗／hosting NOT_DEPLOYED；原主對話獨立審查並統一部署／首頁整合。

## 2026-10-10 執行結果

T00、T01、T02、T03、T04、T05、T05B、T06、T07：必要gate PASS。T06／VALIDATION明列使用者允许的人工NOT_RUN；不把adapter、字體放大、下載anchor當作OS落盤或實際page zoom。最新source PUBLIC／HEAD驗證與READY_FOR_INTEGRATION見HANDOFF及docs/RELEASE-CANDIDATE.md。正式hosting與00-home未在本對話操作。
# U04-LITERAL-FIND-20261013 — 2026-10-13

單一milestone：已解析CSV指定保留欄的全資料頁字面查找，精確來源座標／上下一格；匯出、risk、ack、rawSource、Worker取消與全資料範圍契約保持。新增search純函式及獨立app controller，UI／兩語／focused tests／既有規格一起交付；不再委派，不做新工具或共享路徑改動。

本機必要gate PASS：focused29/29、final61/61、check、preview19檔、release20檔、independent staged diff --check均exit0。native兩語／F201／source-index／CRLF／風險確認／實際下載bytes／精確1MiB邊界／320px已保存證據；人工NOT_RUN明列VALIDATION。PUBLIC source fbd488d0622d81e175e1d367801e2959232af22e已確認remote／visibility；固定ZIP/逐Git blob manifest見HANDOFF。版本狀態AWAITING_PRIMARY / EXTERNAL_REVIEW_PENDING；寫入權釋放，部署和首頁由主代理處理。

